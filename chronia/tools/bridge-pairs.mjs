// Writes medieval-bridge-units.json: for every unit the bridge carries (see BRIDGE_TO in medieval.mjs), its owner on 1 July 1444 in
// the medieval table and its owner on 1 July 1648 in the table of 1648 (napoleonic.mjs), grouped as "KEY|1648 name" → the unit
// selectors, so that medieval-bridge.mjs can date each pair's changes without typing the units in. Run it again whenever either
// table changes the land of 1444 or 1648 in the Empire:
//   node tools/bridge-pairs.mjs <node_modules> <Natural Earth admin-1 geojson> [UCHRONIA's provinces.json]
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
globalThis.CHRONIA_BRIDGE_PAIRS = true;
const { buildMedieval } = await import("./medieval.mjs");
const { buildNapoleonic } = await import("./napoleonic.mjs");
const req = createRequire(resolve(process.argv[2]) + "/");
const client = req("topojson-client"), clip = req("polygon-clipping");
const planar = (r) => { let s = 0; for (let i = 0; i + 1 < r.length; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return s / 2; };
const polysOf = (g) => (!g ? [] : g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);
const rewind = (polys) => polys.map((poly) => poly.map((ring, k) => ((planar(ring) > 0) === (k === 0) ? ring.slice().reverse() : ring)));
const provincesPath = resolve(process.argv[4] || resolve(here, "../../uchronia/data/provinces.json"));
const topo = JSON.parse(readFileSync(resolve(dirname(provincesPath), "units.json"), "utf8"));
const provinces = JSON.parse(readFileSync(provincesPath, "utf8")).objects.provinces.geometries.map((g) => g.properties);
const neAll = JSON.parse(readFileSync(process.argv[3], "utf8")).features;
const M = buildMedieval({ topo, provinces, client, clip, rewind, polysOf, bridgeUnits: {} });
const N = buildNapoleonic({ topo, provinces, client, clip, neAll, rewind, polysOf });
const at1444 = M.ownersOn("1444-07-01"), at1648 = N.ownersOn("1648-07-01"), geoms = topo.objects.units.geometries;
const out = {};
for (const [i, key] of M.bridgeKeys) {
  const pr = provinces[geoms[i].properties.p], b = at1648.get(i);
  const k = key + "|" + (b ? b.name : "-");
  (out[k] = out[k] || []).push(pr.c + ":" + pr.n + "/" + geoms[i].properties.n);
}
for (const k of Object.keys(out)) out[k] = [...new Set(out[k])].sort();
const sorted = Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]));
writeFileSync(resolve(here, "medieval-bridge-units.json"), JSON.stringify(sorted, null, 1) + "\n");
console.log("bridge: " + M.bridgeKeys.size + " units in " + Object.keys(sorted).length + " pairs (" + at1444.size + " units in the table on 1 July 1444)");

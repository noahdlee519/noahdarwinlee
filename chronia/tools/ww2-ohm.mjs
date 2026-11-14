// Writes ww2-ohm.json: the wartime units of OpenHistoricalMap (CC0) that tools/ww2-borders.mjs draws the occupation of
// Poland and the Soviet Union's west from, each relation as its rings, simplified together so neighbours keep one line:
//   NODE_USE_ENV_PROXY=1 node tools/ww2-ohm.mjs <node_modules> <cache directory>
// The relations are fetched once into the cache (one file each) from OpenHistoricalMap's Overpass API.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// [key, relation, what it is]. The dates are the relation's own (start_date, end_date).
export const OHM_UNITS = [
  ["gg39", 2693083, "Generalgouvernement, 26 October 1939 to 31 July 1941"],
  ["gg41", 2693084, "Generalgouvernement with the District of Galicia, 1 August 1941 to 19 January 1945"],
  ["reich39", 2704716, "Deutsches Reich, 26 October 1939 to 18 May 1940 (with the annexed west of Poland)"],
  ["lithuania39", 2848250, "Lietuva, 28 October 1939 to 3 August 1940 (with the Vilnius region)"],
  ["bialystok41", 2693091, "Bezirk Bialystok, 1941 to 1943"],
  ["ostland", 2692529, "Reichskommissariat Ostland, 1941 to 1945"],
  ["rkUkraine", 2693267, "Reichskommissariat Ukraine, 1 September 1941 to 9 November 1944"]
];

const here = dirname(fileURLToPath(import.meta.url));
const OHM_API = "https://overpass-api.openhistoricalmap.org/api/interpreter";

async function fetchRelation(dir, id) {
  const file = resolve(dir, "ohm-" + id + ".json");
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  for (let t = 0; t < 4; t++) {
    const r = await fetch(OHM_API, { method: "POST", body: new URLSearchParams({ data: "[out:json][timeout:600];rel(" + id + ");out geom;" }) });
    if (r.ok) { const body = await r.text(); writeFileSync(file, body); return JSON.parse(body); }
    await new Promise((ok) => setTimeout(ok, 15000 * (t + 1)));
  }
  throw new Error("OpenHistoricalMap would not answer for relation " + id);
}

// A relation's rings, joined from its ways end to end; inner rings go into the outer ring that holds them.
function rings(rel, d3) {
  const pts = (w) => w.geometry.filter(Boolean).map((p) => [Math.round(p.lon * 1e6) / 1e6, Math.round(p.lat * 1e6) / 1e6]);
  const join = (role) => {
    const open = rel.members.filter((m) => m.type === "way" && m.geometry && (role === "inner" ? m.role === "inner" : m.role !== "inner")).map(pts).filter((l) => l.length > 1);
    const out = [], key = (p) => p[0] + "," + p[1];
    let lost = 0;
    while (open.length) {
      let ring = open.pop();
      for (let grew = true; grew && key(ring[0]) !== key(ring[ring.length - 1]);) {
        grew = false;
        for (let i = 0; i < open.length; i++) {
          const w = open[i], end = key(ring[ring.length - 1]);
          if (key(w[0]) === end) ring = ring.concat(w.slice(1));
          else if (key(w[w.length - 1]) === end) ring = ring.concat(w.slice().reverse().slice(1));
          else if (key(w[w.length - 1]) === key(ring[0])) ring = w.concat(ring.slice(1));
          else if (key(w[0]) === key(ring[0])) ring = w.slice().reverse().concat(ring.slice(1));
          else continue;
          open.splice(i, 1); grew = true; break;
        }
      }
      if (ring.length > 3 && key(ring[0]) === key(ring[ring.length - 1])) out.push(ring); else lost++;
    }
    if (lost) throw new Error("relation " + rel.id + ": " + lost + " " + role + " rings don't close");
    return out;
  };
  const wind = (ring, outer) => { const a = d3.geoArea({ type: "Polygon", coordinates: [ring] }); return (a > 2 * Math.PI) === outer ? ring.slice().reverse() : ring; };
  const polys = join("outer").map((r) => [wind(r, true)]);
  for (const r of join("inner")) { const host = polys.find((p) => d3.geoContains({ type: "Polygon", coordinates: [p[0]] }, r[0])); if (host) host.push(wind(r, false)); }
  return polys;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [modules, cache] = process.argv.slice(2);
  if (!modules || !cache) { console.error("usage: NODE_USE_ENV_PROXY=1 node tools/ww2-ohm.mjs <node_modules> <cache directory>"); process.exit(1); }
  const req = createRequire(resolve(modules) + "/");
  const d3 = req("d3-geo"), server = req("topojson-server"), simp = req("topojson-simplify"), client = req("topojson-client");
  mkdirSync(cache, { recursive: true });
  const feats = [];
  for (const [key, id, what] of OHM_UNITS) {
    const rel = (await fetchRelation(cache, id)).elements.find((e) => e.type === "relation");
    const polys = rings(rel, d3);
    feats.push({ type: "Feature", id: key, properties: { id, name: rel.tags.name, start: rel.tags.start_date || null, end: rel.tags.end_date || null }, geometry: { type: "MultiPolygon", coordinates: polys } });
    console.log(key + ": " + rel.tags.name + " (" + rel.tags.start_date + " to " + rel.tags.end_date + "), " + polys.length + " polygons, " + Math.round(d3.geoArea({ type: "MultiPolygon", coordinates: polys }) * 6371 * 6371) + " km², " + what);
  }
  // Simplified together (to about 300 m), so that two units' shared border stays one line.
  let topo = server.topology({ u: { type: "FeatureCollection", features: feats } });
  topo = simp.presimplify(topo, simp.planarTriangleArea);
  topo = simp.simplify(topo, 1e-6);
  const out = { source: "OpenHistoricalMap (openhistoricalmap.org), CC0; relations " + OHM_UNITS.map((u) => u[1]).join(", ") + "; written by tools/ww2-ohm.mjs", units: {} };
  for (const f of client.feature(topo, topo.objects.u).features) {
    const g = f.geometry, polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    out.units[f.id] = { ...f.properties, polys: polys.map((p) => p.map((r) => r.map(([x, y]) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5]))) };
  }
  writeFileSync(resolve(here, "ww2-ohm.json"), JSON.stringify(out));
  console.log("ww2-ohm.json: " + (JSON.stringify(out).length / 1e6).toFixed(2) + " MB");
}

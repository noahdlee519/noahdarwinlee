// The borders between first-level subdivisions (states, provinces, regions)
// drawn on the globe when it is close: Natural Earth 1:10m admin-1 states
// and provinces, reduced to the lines between two units of the same
// country (coasts and the borders between countries are already drawn),
// simplified to about the detail of the 1:50m countries, and written as a
// quantised TopoJSON of one MultiLineString. Run from the greatercircle
// folder:
//
//   npm install topojson-server@3 topojson-client@3 topojson-simplify@3  (anywhere)
//   curl -LO https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces_lakes.geojson
//   node tools/build-admin1.mjs <node_modules> <that geojson>
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const modules = resolve(process.argv[2] || "node_modules");
const input = resolve(process.argv[3] || "ne_10m_admin_1_states_provinces_lakes.geojson");
const require = createRequire(resolve(modules, "x.js"));
const server = require("topojson-server");
const client = require("topojson-client");
const simplify = require("topojson-simplify");

const d3 = require("d3-geo");

const geo = JSON.parse(readFileSync(input, "utf8"));
const EARTH = 6371.0088;
const km2 = (f) => d3.geoArea(f) * EARTH * EARTH;
const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)] || 0; };

// Which lines to draw for each country. Units smaller than a town's
// hinterland (a median under FINE km²) are too fine to read at the zoom
// where these lines appear, and so are a hundred of middling ones; where
// Natural Earth groups such units into regions (Italy's regioni, England's
// regions, Uganda's four, Slovenia's statistical regions) the lines between
// regions are drawn instead; where it does not, the country has none.
const FINE = 2000, MANY = 60, MIDDLING = 5000, REGION_FINE = 1500;
const byCountry = new Map();
for (const f of geo.features) {
  if (!f.geometry || !f.properties.adm0_a3) continue;
  const c = f.properties.adm0_a3;
  if (!byCountry.has(c)) byCountry.set(c, { name: f.properties.admin, units: [] });
  byCountry.get(c).units.push({ f, area: km2(f), region: f.properties.region || "" });
}
const features = [];
const table = [];
for (const [c, info] of byCountry) {
  const n = info.units.length, med = median(info.units.map((u) => u.area));
  const regions = new Map();
  for (const u of info.units) if (u.region) regions.set(u.region, (regions.get(u.region) || 0) + u.area);
  const nRegions = regions.size, regionMed = median([...regions.values()]);
  const fine = med < FINE, many = n > MANY && med < MIDDLING;
  let how = "units";
  if ((fine || many) && nRegions >= 2 && nRegions < n && regionMed >= REGION_FINE && info.units.every((u) => u.region)) how = "regions";
  else if (fine) how = "none";
  table.push([c, info.name, n, Math.round(med), nRegions, Math.round(regionMed), how]);
  if (how === "none") continue;
  for (const u of info.units) features.push({ type: "Feature", properties: { c, g: how === "regions" ? u.region : u.f.properties.adm1_code }, geometry: u.f.geometry });
}
table.sort((a, b) => a[1].localeCompare(b[1]));
for (const r of table) console.log(r.join("\t"));
console.log(features.length, "units kept in", new Set(features.map((f) => f.properties.c)).size, "countries;",
  table.filter((r) => r[6] === "regions").length, "drawn by region,", table.filter((r) => r[6] === "none").length, "left blank");

// A shared topology, so that neighbours share their border once.
const topo = server.topology({ units: { type: "FeatureCollection", features } }, 1e5);
const pre = simplify.presimplify(topo, simplify.sphericalTriangleArea);
// Keep the fraction of vertices that puts the file near the size wanted;
// the countries file is 1:50m, and these lines should look no finer.
const weights = [];
pre.arcs.forEach((arc) => arc.forEach((pt) => { if (isFinite(pt[2])) weights.push(pt[2]); }));
weights.sort((a, b) => a - b);
const fraction = +(process.argv[4] || 0.08);
const threshold = weights[Math.floor((1 - fraction) * (weights.length - 1))];
const simple = simplify.simplify(pre, threshold);
// Only the lines between two units of the same country.
const mesh = client.mesh(simple, simple.objects.units, (a, b) => a !== b && a.properties.c === b.properties.c && a.properties.g !== b.properties.g);
let n = 0; mesh.coordinates.forEach((l) => { n += l.length; });
console.log("interior lines:", mesh.coordinates.length, "with", n, "vertices");
const out = server.topology({ admin1: mesh }, 1e4);
const json = JSON.stringify(out);
writeFileSync(resolve(here, "../data/admin1.json"), json);
console.log("data/admin1.json:", Math.round(json.length / 1024), "KB");

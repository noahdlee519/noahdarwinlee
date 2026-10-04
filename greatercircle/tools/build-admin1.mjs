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

const geo = JSON.parse(readFileSync(input, "utf8"));
const features = geo.features.filter((f) => f.geometry && f.properties.adm0_a3)
  .map((f) => ({ type: "Feature", properties: { c: f.properties.adm0_a3 }, geometry: f.geometry }));
console.log(features.length, "units in", new Set(features.map((f) => f.properties.c)).size, "countries");

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
const mesh = client.mesh(simple, simple.objects.units, (a, b) => a !== b && a.properties.c === b.properties.c);
let n = 0; mesh.coordinates.forEach((l) => { n += l.length; });
console.log("interior lines:", mesh.coordinates.length, "with", n, "vertices");
const out = server.topology({ admin1: mesh }, 1e4);
const json = JSON.stringify(out);
writeFileSync(resolve(here, "../data/admin1.json"), json);
console.log("data/admin1.json:", Math.round(json.length / 1024), "KB");

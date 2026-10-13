import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const modules = resolve(process.argv[2] || "node_modules");
const dir = resolve(process.argv[3] || ".");
const keep = +(process.argv[4] || 0.35);
const minKm2 = +(process.argv[5] || 4);
const require = createRequire(resolve(modules, "x.js"));
const server = require("topojson-server");
const client = require("topojson-client");
const simplify = require("topojson-simplify");
const d3 = require("d3-geo");
const R = 6371.0088;

const SETS = ["ne_10m_lakes", "ne_10m_lakes_europe", "ne_10m_lakes_north_america"];
const kept = [];
const bbox = (g) => {
  let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  polys.forEach((p) => p[0].forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }));
  return [x0, y0, x1, y1];
};
SETS.forEach((set, si) => {
  const fc = JSON.parse(readFileSync(resolve(dir, set + ".geojson"), "utf8"));
  fc.features.forEach((f) => {
    if (!f.geometry || f.properties.featurecla === "Reservoir" && !f.properties.name) return;
    let a = d3.geoArea(f);
    if (a > 2 * Math.PI) a = 4 * Math.PI - a;
    const km2 = a * R * R;
    if (km2 < minKm2) return;
    const c = d3.geoCentroid(f), bb = bbox(f.geometry);
    if (si > 0 && kept.some((k) => c[0] >= k.bb[0] && c[0] <= k.bb[2] && c[1] >= k.bb[1] && c[1] <= k.bb[3] && km2 / k.km2 > 0.4 && km2 / k.km2 < 2.5)) return;
    const name = f.properties.name || f.properties.name_en || "";
    kept.push({ name, km2, c, bb, geometry: f.geometry });
  });
});

const topo = server.topology({ lakes: { type: "FeatureCollection", features: kept.map((k) => ({ type: "Feature", properties: {}, geometry: k.geometry })) } }, 1e6);
const pre = simplify.presimplify(topo, simplify.sphericalTriangleArea);
const thin = simplify.simplify(pre, simplify.quantile(pre, keep));
const out = client.feature(thin, thin.objects.lakes).features;
const round = (v) => Math.round(v * 1000) / 1000;
const rows = [];
out.forEach((f, i) => {
  if (!f.geometry) return;
  const polys = (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates)
    .map((p) => p.map((ring) => ring.map(([x, y]) => [round(x), round(y)])).filter((ring) => ring.length >= 4))
    .filter((p) => p.length);
  if (!polys.length) return;
  const k = kept[i];
  rows.push([k.name, Math.round(k.km2), round(k.c[0]), round(k.c[1]), polys]);
});
rows.sort((a, b) => b[1] - a[1]);
writeFileSync(resolve(here, "../data/lakes.json"), "[" + rows.map((r) => JSON.stringify(r)).join(",\n") + "]\n");
console.log(rows.length + " lakes of " + minKm2 + " km2 or more");

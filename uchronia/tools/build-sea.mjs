import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const modules = resolve(process.argv[2] || "node_modules");
const input = resolve(process.argv[3] || "ne_10m_bathymetry_K_200.geojson");
const keep = +(process.argv[4] || 0.08);
const minKm2 = +(process.argv[5] || 400);
const keepLow = +(process.argv[6] || 0.02);
const require = createRequire(resolve(modules, "x.js"));
const server = require("topojson-server");
const client = require("topojson-client");
const simplify = require("topojson-simplify");
const d3 = require("d3-geo");
const clip = require("polygon-clipping");
const TILE = 30;

const EARTH = 6371.0088;
const planar = (ring) => {
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) s += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return s / 2;
};
const km2 = (ring) => Math.abs(planar(ring)) * Math.cos((ring.reduce((t, p) => t + p[1], 0) / ring.length) * Math.PI / 180) * (Math.PI / 180) ** 2 * EARTH * EARTH;
const wind = (ring, outer) => (planar(ring) > 0) === outer ? ring.slice().reverse() : ring;

const geo = JSON.parse(readFileSync(input, "utf8"));
const features = [];
let dropped = 0, holesDropped = 0;
for (const f of geo.features) {
  for (const poly of f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates) {
    if (km2(poly[0]) < minKm2) { dropped++; continue; }
    const rings = [wind(poly[0], true)];
    for (const hole of poly.slice(1)) { if (km2(hole) < minKm2) holesDropped++; else rings.push(wind(hole, false)); }
    features.push({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: rings } });
  }
}
const bounds = (ring) => ring.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]);
const tiles = [];
for (const f of features) {
  const poly = f.geometry.coordinates, b = bounds(poly[0]);
  for (let x = -180; x < 180; x += TILE) for (let y = -90; y < 90; y += TILE) {
    if (b[2] <= x || b[0] >= x + TILE || b[3] <= y || b[1] >= y + TILE) continue;
    const box = [[[x, y], [x + TILE, y], [x + TILE, y + TILE], [x, y + TILE], [x, y]]];
    for (const p of clip.intersection(poly, box)) {
      if (km2(p[0]) < minKm2) continue;
      tiles.push({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: p.map((ring, i) => wind(ring, i === 0)) } });
    }
  }
}
const whole = features.map((f) => d3.geoArea(f)).reduce((a, b) => a + b, 0);
features.length = 0;
tiles.forEach((t) => features.push(t));
const before = features.map((f) => d3.geoArea(f));
if (Math.abs(before.reduce((a, b) => a + b, 0) - whole) / whole > 0.002) throw new Error("tiling changed the deep-water area");

const pre = simplify.presimplify(server.topology({ deep: { type: "FeatureCollection", features } }, 1e6), simplify.sphericalTriangleArea);
const weights = [];
pre.arcs.forEach((arc) => arc.forEach((pt) => { if (Math.abs(pt[1]) > 89.99) pt[2] = Infinity; }));
pre.arcs.forEach((arc) => arc.forEach((pt) => { if (isFinite(pt[2])) weights.push(pt[2]); }));
weights.sort((a, b) => a - b);
const level = (share) => {
  const out = client.quantize(simplify.simplify(pre, weights[Math.max(0, Math.floor((1 - share) * (weights.length - 1)))]), 1e5);
  delete out.bbox;
  return out;
};
let worst = 0;
const check = (out) => {
  const after = client.feature(out, out.objects.deep).features;
  after.forEach((f, i) => {
    const a = d3.geoArea(f);
    if (before[i] < 2 * Math.PI && a > 2 * Math.PI) throw new Error("simplifying turned a deep-water area inside out");
    if (before[i] > 5e-4) worst = Math.max(worst, Math.abs(a - before[i]) / before[i]);
  });
  const land = [[20, 10], [100, 55], [-100, 45], [-60, -10], [135, -25], [0, -82]];
  const wet = land.filter((pt) => after.some((f) => d3.geoContains(f, pt)));
  if (wet.length) throw new Error("deep water over land at " + JSON.stringify(wet));
};
const out = level(keep), low = level(keepLow);
check(out);
if (worst > 0.1) throw new Error("simplifying changed a large deep-water area by " + Math.round(worst * 100) + "%");
check(low);
let vertices = 0, lowVertices = 0;
out.arcs.forEach((arc) => { vertices += arc.length; });
low.arcs.forEach((arc) => { lowVertices += arc.length; });
const json = JSON.stringify({ high: out, low });
writeFileSync(resolve(here, "../data/sea.json"), json);
console.log("sea.json:", features.length, "tiles of deep water (" + dropped, "smaller than", minKm2, "km² dropped, and", holesDropped, "shallows);", vertices, "vertices after simplifying to", keep, "and", lowVertices, "at", keepLow + "; areas within", (worst * 100).toFixed(1) + "%;", Math.round(json.length / 1024), "KB");

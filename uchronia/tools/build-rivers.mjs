import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const modules = resolve(process.argv[2] || "node_modules");
const input = resolve(process.argv[3] || "ne_10m_rivers_lake_centerlines.geojson");
const keep = +(process.argv[4] || 0.3);
const maxRank = +(process.argv[5] || 6);
const require = createRequire(resolve(modules, "x.js"));
const server = require("topojson-server");
const client = require("topojson-client");
const simplify = require("topojson-simplify");

const provinces = JSON.parse(readFileSync(resolve(here, "../data/provinces.json"), "utf8"));
const polys = [];
const grid = new Map();
for (const f of client.feature(provinces, provinces.objects.provinces).features) {
  if (!f.geometry) continue;
  for (const poly of f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of poly[0]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const id = polys.length;
    polys.push(poly);
    for (let gx = Math.floor(x0); gx <= Math.floor(x1); gx++) for (let gy = Math.floor(y0); gy <= Math.floor(y1); gy++) {
      const k = gx * 1000 + gy;
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(id);
    }
  }
}
const inside = (poly, x, y) => {
  let odd = false;
  for (const ring of poly) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) odd = !odd;
    }
  }
  return odd;
};
const onLand = ([x, y]) => (grid.get(Math.floor(x) * 1000 + Math.floor(y)) || []).some((id) => inside(polys[id], x, y));

const geo = JSON.parse(readFileSync(input, "utf8"));
const features = [];
let kept = 0, dropped = 0, before = 0;
for (const f of geo.features) {
  const p = f.properties;
  if (!f.geometry || !(p.scalerank >= 1 && p.scalerank <= maxRank)) continue;
  if (p.featurecla !== "River" && p.featurecla !== "Lake Centerline") continue;
  if (/canal/i.test(p.name || "")) continue;
  const lines = f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const line of lines) {
    let run = [];
    const flush = () => { if (run.length > 1) features.push({ type: "Feature", properties: { r: p.scalerank }, geometry: { type: "LineString", coordinates: run } }); run = []; };
    for (const pt of line) {
      before++;
      if (onLand(pt)) { run.push(pt); kept++; } else { dropped++; flush(); }
    }
    flush();
  }
}

const topo = server.topology({ rivers: { type: "FeatureCollection", features } }, 1e6);
const pre = simplify.presimplify(topo, simplify.sphericalTriangleArea);
const weights = [];
pre.arcs.forEach((arc) => arc.forEach((pt) => { if (isFinite(pt[2])) weights.push(pt[2]); }));
weights.sort((a, b) => a - b);
const out = client.quantize(simplify.simplify(pre, weights[Math.max(0, Math.floor((1 - keep) * (weights.length - 1)))]), 2e5);
delete out.bbox;
let vertices = 0;
out.arcs.forEach((arc) => { vertices += arc.length; });
const json = JSON.stringify(out);
writeFileSync(resolve(here, "../data/rivers.json"), json);
const ranks = {};
features.forEach((f) => { ranks[f.properties.r] = (ranks[f.properties.r] || 0) + 1; });
console.log("rivers.json:", features.length, "pieces by rank", JSON.stringify(ranks) + ";", kept, "of", before, "points on land,", dropped, "in lakes or the sea;", vertices, "vertices after simplifying to", keep + ";", Math.round(json.length / 1024), "KB");

import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ZONES } from "./italy-early.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const [modules, comuniPath, placesPath, awmcPath, nePath] = process.argv.slice(2);
if (!nePath) { console.log("usage: node tools/italy-zones.mjs <node_modules> <comuni.geojson> <pleiades places.csv> <AWMC regional_names_linework.geojson> <ne_10m_admin_1_states_provinces.geojson>"); process.exit(1); }
const require = createRequire(resolve(modules) + "/");
const clip = require("polygon-clipping"), server = require("topojson-server"), simplify = require("topojson-simplify"), client = require("topojson-client");
const { Delaunay } = require("d3-delaunay");

const FRAME = [6.5, 36.5, 18.8, 47.2], ISLANDS = new Set([19, 20]), MIN_WEIGHT = 2e-6;
const inFrame = ([x, y]) => x > FRAME[0] && x < FRAME[2] && y > FRAME[1] && y < FRAME[3];

const csvRows = (text) => {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
};
const places = new Map();
{
  const rows = csvRows(readFileSync(placesPath, "utf8").replace(/^﻿/, ""));
  const h = rows[0], id = h.indexOf("id"), lat = h.indexOf("representative_latitude"), lon = h.indexOf("representative_longitude");
  for (const r of rows.slice(1)) if (r[lat]) places.set(Number(r[id]), [Number(r[lon]), Number(r[lat])]);
}
const flat = (c, out = []) => { if (typeof c[0] === "number") out.push(c); else for (const x of c) flat(x, out); return out; };
const awmc = new Map();
for (const f of JSON.parse(readFileSync(awmcPath, "utf8")).features) {
  const pts = flat(f.geometry.coordinates), c = [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
  if (!inFrame(c)) continue;
  const t = f.properties.TITLE;
  if (!awmc.has(t)) awmc.set(t, []);
  awmc.get(t).push(c);
}

const comuni = JSON.parse(readFileSync(comuniPath, "utf8")).features.filter((f) => !ISLANDS.has(f.properties.reg_istat_code_num));
const extra = JSON.parse(readFileSync(nePath, "utf8")).features.filter((f) => ["San Marino", "Vatican"].includes(f.properties.admin));
const polysOf = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
const inRing = ([x, y], ring) => { let k = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) k = !k; } return k; };
const inPolys = (p, polys) => polys.some((poly) => inRing(p, poly[0]) && !poly.slice(1).some((h) => inRing(p, h)));

const seeds = ZONES.map(([k, seed]) => {
  let p;
  if (typeof seed === "number") p = places.get(seed);
  else { const cs = awmc.get(seed); if (cs) p = [cs.reduce((s, c) => s + c[0], 0) / cs.length, cs.reduce((s, c) => s + c[1], 0) / cs.length]; }
  if (!p) throw new Error("italy-zones: no place for " + k + " (" + seed + ")");
  return { k, p };
});
const units = comuni.map((f) => ({ name: f.properties.name, polys: polysOf(f.geometry) })).concat(extra.map((f) => ({ name: f.properties.admin, polys: polysOf(f.geometry) })));
for (const u of units) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of flat(u.polys)) { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); }
  u.box = b;
}
const sq = (a, b) => { const c = Math.cos(((a[1] + b[1]) / 2) * Math.PI / 180); return ((a[0] - b[0]) * c) ** 2 + (a[1] - b[1]) ** 2; };
const centre = (polys) => {
  let ax = 0, ay = 0, aa = 0;
  for (const poly of polys) { const r = poly[0]; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const f = r[j][0] * r[i][1] - r[i][0] * r[j][1]; aa += f; ax += (r[j][0] + r[i][0]) * f; ay += (r[j][1] + r[i][1]) * f; } }
  return aa ? [ax / (3 * aa), ay / (3 * aa)] : polys[0][0][0];
};
const signed = (r) => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1]; return a; };
const orient = (polys) => polys.map((poly) => poly.map((r, i) => ((i === 0) === (signed(r) > 0) ? r.slice().reverse() : r)));
const pieces = [];
let split = 0;
for (const u of units) {
  const inside = seeds.filter((s) => s.p[0] >= u.box[0] && s.p[0] <= u.box[2] && s.p[1] >= u.box[1] && s.p[1] <= u.box[3] && inPolys(s.p, u.polys));
  if (inside.length >= 2) {
    const v = Delaunay.from(inside.map((s) => s.p)).voronoi([u.box[0] - 0.1, u.box[1] - 0.1, u.box[2] + 0.1, u.box[3] + 0.1]);
    inside.forEach((s, i) => { const cell = v.cellPolygon(i); const part = clip.intersection(u.polys, [[cell]]); if (part.length) pieces.push({ k: s.k, polys: part }); });
    split++;
    continue;
  }
  if (inside.length === 1) { pieces.push({ k: inside[0].k, polys: u.polys }); continue; }
  const c = centre(u.polys);
  let best = null, d = Infinity;
  for (const s of seeds) { const e = sq(c, s.p); if (e < d) { d = e; best = s; } }
  pieces.push({ k: best.k, polys: u.polys });
}
const topo = server.topology({ c: { type: "FeatureCollection", features: pieces.map((p) => ({ type: "Feature", properties: { k: p.k }, geometry: { type: "MultiPolygon", coordinates: orient(p.polys) } })) } }, 1e6);
const simple = simplify.simplify(simplify.presimplify(topo), MIN_WEIGHT);
const zones = seeds.map((s) => {
  const g = client.mergeArcs(simple, simple.objects.c.geometries.filter((x) => x.properties.k === s.k));
  return { ...g, properties: { k: s.k, seed: s.p.map((v) => Math.round(v * 1e4) / 1e4) } };
});
const empty = zones.filter((z) => !z.arcs || !z.arcs.length).map((z) => z.properties.k);
if (empty.length) throw new Error("italy-zones: zones with no land: " + empty.join(", "));
simple.objects = { zones: { type: "GeometryCollection", geometries: zones } };
const used = new Set();
const walk = (a) => { if (typeof a === "number") used.add(a < 0 ? ~a : a); else a.forEach(walk); };
zones.forEach((z) => walk(z.arcs));
const remap = new Map(), arcs = [];
simple.arcs.forEach((a, i) => { if (used.has(i)) { remap.set(i, arcs.length); arcs.push(a); } });
const re = (a) => (typeof a === "number" ? (a < 0 ? ~remap.get(~a) : remap.get(a)) : a.map(re));
zones.forEach((z) => { z.arcs = re(z.arcs); });
simple.arcs = arcs;
const out = resolve(here, "italy-zones.json");
writeFileSync(out, JSON.stringify(simple));
console.log("italy-zones: " + units.length + " units (" + comuni.length + " comuni), " + split + " split among their seeds, " + zones.length + " zones, " + arcs.length + " arcs, " + Math.round(readFileSync(out).length / 1024) + " KB");

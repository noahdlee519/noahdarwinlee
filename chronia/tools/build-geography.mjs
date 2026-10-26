import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const modules = resolve(process.argv[2] || "node_modules");
const neDir = resolve(process.argv[3] || "natural-earth-vector/geojson");
const cbsDir = resolve(process.argv[4] || "cbs");
const oldLakesPath = resolve(process.argv[5] || resolve(neDir, "ne_10m_lakes_v4.1.0.geojson"));
const UC = resolve(here, "../../uchronia/data");
const require = createRequire(resolve(modules, "x.js"));
const client = require("topojson-client");
const d3 = require("d3-geo");
const clip = require("polygon-clipping");
const bufferMod = require("@turf/buffer");
const turfBuffer = bufferMod.default || bufferMod.buffer || bufferMod;

const R_KM = 6371.0088;
const readJSON = (p) => JSON.parse(readFileSync(p, "utf8"));
const at = (y, m = 1, d = 1) => {
  const start = Date.UTC(y, 0, 1), len = (Date.UTC(y + 1, 0, 1) - start) / 86400000;
  return Math.round((y + (Date.UTC(y, m - 1, d) - start) / 86400000 / len) * 1e4) / 1e4;
};
const r4 = (v) => Math.round(v * 1e4) / 1e4;
const r3 = (v) => Math.round(v * 1e3) / 1e3;
const km2Of = (g) => { let a = d3.geoArea(g); if (a > 2 * Math.PI) a = 4 * Math.PI - a; return a * R_KM * R_KM; };
const polysOf = (g) => !g ? [] : g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
const signed = (ring) => { let s = 0; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) s += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]); return s; };
const orient = (ring, sign) => (Math.sign(signed(ring)) === sign ? ring : ring.slice().reverse());
const planarKm2 = (poly) => {
  const lat = poly[0][0][1] * Math.PI / 180, kx = 111.32 * Math.cos(lat), ky = 110.57;
  return Math.abs(poly.reduce((s, ring, i) => s + (i ? -1 : 1) * Math.abs(signed(ring)) / 2, 0)) * kx * ky;
};
const bboxOf = (mp) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  mp.forEach((p) => p.forEach((r) => r.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); })));
  return [x0, y0, x1, y1];
};
const hits = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
const buffer = (mp, km) => {
  const f = turfBuffer({ type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: mp } }, km, { units: "kilometers", steps: 6 });
  return polysOf(f.geometry);
};
const simplifyLine = (pts, tol) => {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const kx = Math.cos(pts[0][1] * Math.PI / 180);
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let best = -1, bd = tol * tol;
    const ax = pts[a][0] * kx, ay = pts[a][1], bx = pts[b][0] * kx, by = pts[b][1], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      const px = pts[i][0] * kx, py = pts[i][1];
      let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
      const ex = ax + t * dx - px, ey = ay + t * dy - py, d = ex * ex + ey * ey;
      if (d > bd) { bd = d; best = i; }
    }
    if (best >= 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  return pts.filter((_, i) => keep[i]);
};
const simplifyRing = (ring, tol) => {
  const open = ring.slice(0, -1);
  if (open.length < 8) return ring;
  const half = Math.floor(open.length / 2);
  const a = simplifyLine(open.slice(0, half + 1), tol), b = simplifyLine(open.slice(half).concat([open[0]]), tol);
  const out = a.concat(b.slice(1));
  return out.length >= 4 ? out : ring;
};
const roundPolys = (mp, f) => mp.map((p) => p.map((r) => r.map(([x, y]) => [f(x), f(y)])));
const simplePolys = (mp, tol, f, minKm2) => roundPolys(mp.filter((p) => planarKm2(p) >= minKm2).map((p) => p.map((r) => simplifyRing(r, tol))), f);

const ne = (name) => readJSON(resolve(neDir, name));
const neLakes = ne("ne_10m_lakes.geojson");
const neHistoric = ne("ne_10m_lakes_historic.geojson");
const neOld = readJSON(oldLakesPath);
const neRivers = ne("ne_10m_rivers_lake_centerlines.geojson");
const cbsGem = readJSON(resolve(cbsDir, "gemeente_1995.geojson"));
const cbsBuurt = readJSON(resolve(cbsDir, "buurt_2011.geojson"));
const landTopo = readJSON(resolve(here, "../data/land.json"));
const ucLakes = readJSON(resolve(UC, "lakes.json"));
const ucRivers = readJSON(resolve(UC, "rivers.json"));

const lakeRow = (name, km2) => {
  const r = ucLakes.find((x) => x[0] === name && (km2 === undefined || x[1] === km2));
  if (!r) throw new Error("no lake " + name);
  return r;
};

const KEPT = [];
{
  const sets = ["ne_10m_lakes", "ne_10m_lakes_europe", "ne_10m_lakes_north_america"];
  const bb = (g) => bboxOf(polysOf(g).map((p) => [p[0]]));
  sets.forEach((set, si) => {
    const fc = si === 0 ? neLakes : ne(set + ".geojson");
    fc.features.forEach((f) => {
      if (!f.geometry || f.properties.featurecla === "Reservoir" && !f.properties.name) return;
      const km2 = km2Of(f);
      if (km2 < 4) return;
      const c = d3.geoCentroid(f), b = bb(f.geometry);
      if (si > 0 && KEPT.some((k) => c[0] >= k.b[0] && c[0] <= k.b[2] && c[1] >= k.b[1] && c[1] <= k.b[3] && km2 / k.km2 > 0.4 && km2 / k.km2 < 2.5)) return;
      KEPT.push({ km2, c, b, p: f.properties, set });
    });
  });
}
const neOf = (row) => KEPT.find((k) => Math.round(k.km2) === row[1] && r3(k.c[0]) === row[2] && r3(k.c[1]) === row[3]);

const RAISED = new Set([
  "Lake Zaysan", "Cedar Lake", "Southern Indian Lake", "Lac Seul", "Lake Kovdozero", "Oulujärvi", "Lac Saint-Jean", "Lake Abitibi",
  "Lake Imandra", "Lake Il'Men'", "Sipiwesk Lac", "Ozero Kubenskoye", "Mjøsa", "Lake Habbaniyah", "Rikkavesi", "Lake Te Anau",
  "Umbozero Lake", "Upper Arrow Lake", "Lower Arrow Lake", "Koitere", "Stora Lulevatten", "Akkajaure", "Kemijärvi", "Ossokmanuan Lake",
  "Ondozero", "Lake Chelan", "Umfreville Lake", "Lake Pukaki", "Lake Hawea", "Lake Manapouri", "Lac Bermen", "Lake Waikaremoana",
  "Lake Coleridge", "Lake Monowai", "Paduskoye More", "Lake Péribonca", "Lac Low", "Brantley Lake"
]);
const YEAR_FIX = {
  "Wheeler Lake": 1936, "Trinity Lake": 1962, "American Falls Reservoir": 1927, "Wyangala Reservoir": 1935, "Embalse de Orellana": 1961
};
const YEAR_ADD = {
  "Vilyuy Reservoir": 1967, "Réservoir de La Grande 2": 1979, "Repressa de Jupia": 1973, "Embalse de Guri": 1968,
  "Buhayrat ath Tharthar": 1956, "Represa Porto Primavera": 1998, "Presa del Infiernillo": 1964, "Embalse Ezequiel Ramos Mexia": 1972,
  "Danjiangkou Shuiku": 1968, "Represa Itarare": 1970, "Hinakud Dam": 1957, "Xinanjiang Shuiku": 1959, "Kostroma Reservoir": 1955,
  "Vaal Dam": 1938, "Nagarjuna Sagar Dam": 1967, "Xinfengjiang Shuiku": 1959, "Presa Vicente Guerrero": 1971, "Lake Marion": 1941,
  "Embalse de Guárico": 1957, "Vanderkloof Dam": 1977, "Khashm el Girba Dam": 1964, "Presa de la Boquilla": 1916,
  "Presa Manuel vila Camacho": 1946, "Embalse de Buendía": 1958, "Embalse de Entrepeas": 1956, "Red Bluff Lake": 1936,
  "Kauno marios": 1959, "Mitchell Lake": 1923, "Lake Benmore": 1965, "Presa Miguel Alemán": 1955, "Sheksinskoe Reservoir": 1964, "Krasnodarsk Reservoir": 1973,
  "Réservoir La Grande 4": 1984, "Sam Rayburn Reservoir": 1965, "Harry S. Truman Reservoir": 1979, "Lake Koocanusa": 1972,
  "Robert S. Kerr Reservoir": 1970, "Owyhee Reservoir": 1932, "Cedar Creek Reservoir": 1965, "Choke Canyon Reservoir": 1982,
  "Lake Fork Reservoir": 1980, "Ross R. Barnett Reservoir": 1965, "Quabbin Reservoir": 1939, "Cascade Reservoir": 1948,
  "Strawberry Reservoir": 1913, "Dworshak Reservoir": 1972, "Hungry Horse Reservoir": 1953, "Falls Lake Reservoir": 1981,
  "Pymatuning Reservoir": 1934, "Potholes Reservoir": 1949, "Navajo Reservoir": 1962, "Allegheny Reservoir": 1965,
  "San Luis Reservoir": 1967, "Tiber Reservoir": 1956, "Waconda Lake": 1968, "De Gray Reservoir": 1972, "Cheney Reservoir": 1965,
  "San Carlos Reservoir": 1930, "Fresno Reservoir": 1939, "Wickiup Reservoir": 1949, "Blue Mesa Reservoir": 1965, "Clinton Lake": 1977,
  "John Redmond Reservoir": 1964, "St. Mary Reservoir": 1951, "Nelson Reservoir": 1915, "Buffalo Bill Reservoir": 1910,
  "Kirwin Reservoir": 1955, "Clark Canyon Reservoir": 1964, "Thomas Hill Reservoir": 1966, "Warm Springs Reservoir": 1919,
  "Harlan County Reservoir": 1952, "B. A. Steinhagen Reservoir": 1951, "Dale Hollow Reservoir": 1943, "Qadisiyah": 1986,
  "Koka Reservoir": 1960, "Presa Luis L. León (El Granero)": 1968, "Presa Adolfo Lópes Mateos": 1964, "Presa Francisco Zarco": 1968,
  "Presa Miguel Hidalgo": 1956, "Presa Adolfo Ruiz Cortines (Mocuzari)": 1959
};
const DATED = [
  ["Sarygamysh Köli", 3810, at(1960), null, "filled with drainage water from the start of the 1960s"],
  ["Aydar Ko‘l", 2171, at(1969, 2, 1), null, "formed when Shardara's floodgates were opened in February 1969"],
  ["Salton Sea", 841, at(1905), null, "formed by the Colorado's flood of 1905"],
  ["Great Bitter Lake", 226, at(1869, 3, 18), null, "filled from the Suez Canal from 18 March 1869"],
  ["Kakhovka Reservoir", 2046, at(1956), at(2023, 6, 6), "drained after the dam was destroyed on 6 June 2023"],
  ["Lake Chad", 1293, at(1974), null, "the lake's smaller extent after the drought of 1972 and 1973"],
  ["North Aral Sea", 3410, at(2014, 8, 1), null, "after the eastern basin dried in August 2014"],
  ["South Aral Sea", 3392, at(2014, 8, 1), null, "after the eastern basin dried in August 2014"],
  ["Barsakelmes Lake", 376, at(2014, 8, 1), null, "after the eastern basin dried in August 2014"],
  ["Lago de Texcoco", 55, at(1900), null, "the remnant after the Gran Canal del Desagüe opened in 1900"],
  ["IJsselmeer", 1962, at(1968, 5, 29), null, "today's IJsselmeer and Markermeer, from the draining of Southern Flevoland"]
];

const lakeOnly = [];
const reservoirLog = [];
ucLakes.forEach((row) => {
  const k = neOf(row);
  if (!k || k.p.featurecla !== "Reservoir" && !(row[0] in YEAR_ADD)) return;
  if (RAISED.has(row[0])) { reservoirLog.push([row[0], row[1], "natural lake, kept"]); return; }
  let y = YEAR_FIX[row[0]] || (k.set === "ne_10m_lakes" && k.p.year > 0 ? k.p.year : 0) || YEAR_ADD[row[0]] || 0;
  if (!y) { reservoirLog.push([row[0], row[1], "no year, kept"]); return; }
  const src = YEAR_FIX[row[0]] ? "fixed" : k.set === "ne_10m_lakes" && k.p.year > 0 ? "ne" : "added";
  reservoirLog.push([row[0], row[1], y, src]);
  if (!DATED.some((d) => d[0] === row[0] && d[1] === row[1])) lakeOnly.push([row[0], row[1], at(y), null]);
});
DATED.forEach((d) => { lakeRow(d[0], d[1]); lakeOnly.push([d[0], d[1], d[2], d[3]]); });

const lakeAdd = [];
const addLake = (name, from, to, mp, tol, f) => {
  const polys = simplePolys(mp, tol, f || r3, 0.5);
  const km2 = Math.round(km2Of({ type: "MultiPolygon", coordinates: polys }));
  lakeAdd.push([name, km2, from, to, polys]);
  return km2;
};
const hist = (n) => neHistoric.features.find((f) => f.properties.name === n).geometry;
addLake("Aral Sea", null, at(1987), polysOf(hist("Aral Sea")), 0.004);
addLake("Aral Sea", at(1987), at(2014, 8, 1), polysOf(neOld.features.find((f) => f.properties.name === "Aral Sea").geometry), 0.004);
addLake("Lake Chad", null, at(1974), polysOf(hist("Lake Chad")), 0.004);
addLake("Lop Nur", at(1921), at(1964), polysOf(hist("Lop Nur")), 0.004);
addLake("Lake Texcoco", null, at(1900), polysOf(hist("Lake Texcoco")), 0.002);

const cbs = (n) => {
  const f = cbsGem.features.find((x) => x.properties.statnaam === n);
  if (!f) throw new Error("no municipality " + n);
  return polysOf(f.geometry);
};
const POLDER_GEM = ["Wieringermeer", "Noordoostpolder", "Dronten", "Lelystad", "Zeewolde", "Almere"];
const ovp = polysOf(cbsBuurt.features.find((x) => x.properties.statnaam === "Oostvaardersplassen" && /^BU0995/.test(x.properties.statcode)).geometry);
const P = {
  W: clip.union(cbs("Wieringermeer")),
  NOP: clip.union(cbs("Noordoostpolder")),
  EF: clip.union(cbs("Dronten"), clip.difference(cbs("Lelystad"), ovp)),
  SF: clip.union(cbs("Zeewolde"), cbs("Almere"), clip.intersection(cbs("Lelystad"), ovp))
};
const nlBox = [4.6, 52.2, 6.1, 53.15];
const oldLand = buffer(buffer(clip.union(...cbsGem.features.filter((f) => !POLDER_GEM.includes(f.properties.statnaam) && f.geometry && hits(bboxOf(polysOf(f.geometry)), nlBox)).map((f) => polysOf(f.geometry))), -0.4), 0.4);
const ijssel = lakeRow("IJsselmeer", 1962)[4];
const zzWin = [[[4.8, 52.2], [6.05, 52.2], [6.05, 53.15], [4.8, 53.15], [4.8, 52.2]]];
const zuiderzee = (polders, dry) => {
  const core = clip.union(ijssel, ...polders);
  const zone = clip.difference(clip.intersection(buffer(core, 6), zzWin), oldLand, ...dry);
  return zone.filter((z) => clip.intersection([z], core).length);
};
const lakeWith = (open, dry) => {
  const grown = clip.difference(buffer(clip.union(...open), 0.6), oldLand, ...(dry.length ? [clip.union(...dry)] : []));
  return clip.union(ijssel, grown);
};
addLake("IJsselmeer", at(1932, 5, 28), at(1942, 9, 9), lakeWith([P.NOP, P.EF, P.SF], [P.W]), 0.0008, r4);
addLake("IJsselmeer", at(1942, 9, 9), at(1957, 6, 29), lakeWith([P.EF, P.SF], [P.W, P.NOP]), 0.0008, r4);
addLake("IJsselmeer", at(1957, 6, 29), at(1968, 5, 29), lakeWith([P.SF], [P.W, P.NOP, P.EF]), 0.0008, r4);
addLake("Haarlemmermeer", at(1647), at(1852, 7, 1), cbs("Haarlemmermeer"), 0.0008, r4);

const landGroups = [
  { name: "Zuiderzee", win: [4.8, 52.2, 6.05, 53.15], states: [
    { from: null, to: at(1930, 8, 31), cut: zuiderzee([P.W, P.NOP, P.EF, P.SF], []) },
    { from: at(1930, 8, 31), to: at(1932, 5, 28), cut: zuiderzee([P.NOP, P.EF, P.SF], [P.W]) }
  ] },
  { name: "Caofeidian", states: [{ from: null, to: at(2003), dropAt: [118.55, 39.0] }] },
  { name: "Aral Sea", states: [{ from: null, to: at(2014, 8, 1), fillAt: [[60.7, 46.45], [58.55, 45.1]] }] }
];
const keyOf = (ring) => [ring.length, ring[0][0], ring[0][1]];
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const inBox = (v, w) => v[0] > w[0] && v[0] < w[2] && v[1] > w[1] && v[1] < w[3];
const boxHit = (a, b, w) => {
  let t0 = 0, t1 = 1;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const tests = [[-dx, a[0] - w[0]], [dx, w[2] - a[0]], [-dy, a[1] - w[1]], [dy, w[3] - a[1]]];
  for (const [pp, q] of tests) {
    if (pp === 0) continue;
    const r = q / pp;
    if (pp < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
  }
  return [t0, t1];
};
const windowSplice = (poly, cut, w, tol) => {
  const p = poly[0].slice(0, -1), n = p.length;
  const ins = p.map((v) => inBox(v, w));
  const runs = [];
  for (let i = 0; i < n; i++) if (ins[i] && !ins[(i + n - 1) % n]) { let j = i; while (ins[(j + 1) % n]) j = (j + 1) % n; runs.push([i, j]); }
  if (runs.length !== 1) throw new Error("ring enters the window " + runs.length + " times");
  const [i0, i1] = runs[0];
  if (i1 < i0) throw new Error("window run wraps the ring start");
  const prev = p[(i0 - 1 + n) % n], next = p[(i1 + 1) % n];
  const tA = boxHit(prev, p[i0], w)[0], tB = boxHit(p[i1], next, w)[1];
  const A = [prev[0] + tA * (p[i0][0] - prev[0]), prev[1] + tA * (p[i0][1] - prev[1])];
  const B = [p[i1][0] + tB * (next[0] - p[i1][0]), p[i1][1] + tB * (next[1] - p[i1][1])];
  const snap = (v) => { const d = [Math.abs(v[0] - w[0]), Math.abs(v[0] - w[2]), Math.abs(v[1] - w[1]), Math.abs(v[1] - w[3])], k = d.indexOf(Math.min(...d)); return k === 0 ? [w[0], v[1]] : k === 1 ? [w[2], v[1]] : k === 2 ? [v[0], w[1]] : [v[0], w[3]]; };
  A.splice(0, 2, ...snap(A)); B.splice(0, 2, ...snap(B));
  const corners = [[w[0], w[1]], [w[2], w[1]], [w[2], w[3]], [w[0], w[3]]];
  const side = (v) => (v[1] === w[1] ? v[0] - w[0] : v[0] === w[2] ? (w[2] - w[0]) + v[1] - w[1] : v[1] === w[3] ? (w[2] - w[0]) + (w[3] - w[1]) + w[2] - v[0] : 2 * (w[2] - w[0]) + (w[3] - w[1]) + w[3] - v[1]);
  const perim = 2 * (w[2] - w[0] + w[3] - w[1]);
  const walk = (from, to, dir) => {
    const out = [], s0 = side(from), s1 = side(to);
    const cs = corners.map((c) => [c, side(c)]);
    const dist = (s) => dir > 0 ? (s - s0 + perim) % perim : (s0 - s + perim) % perim;
    const d1 = dist(s1);
    cs.filter(([, s]) => dist(s) > 0 && dist(s) < d1).sort((x, y) => dist(x[1]) - dist(y[1])).forEach(([c]) => out.push(c));
    return out;
  };
  const coast = [A, ...p.slice(i0, i1 + 1), B];
  const ringIn = (ring, v) => { let odd = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > v[1]) !== (yj > v[1]) && v[0] < ((xj - xi) * (v[1] - yi)) / (yj - yi) + xi) odd = !odd; } return odd; };
  const inP = (v) => poly.reduce((o, ring) => o !== ringIn(ring, v), false);
  let local = null;
  for (const dir of [1, -1]) {
    const ring = [...coast, ...walk(B, A, dir)];
    const cs = walk(B, A, dir);
    if (cs.every(inP)) { local = ring; break; }
  }
  if (!local) throw new Error("no local polygon " + JSON.stringify([A, B, p.slice(i0, i1 + 1), walk(B, A, 1), walk(B, A, -1), bboxOf([poly])]));
  const cutW = clip.intersection(cut, [[[w[0], w[1]], [w[2], w[1]], [w[2], w[3]], [w[0], w[3]], [w[0], w[1]]]]);
  const cutKm2 = clip.intersection([local.concat([local[0]])], cutW).reduce((t, c) => t + planarKm2(c), 0);
  if (cutKm2 < 0.5) return null;
  const diff = clip.difference([[local.concat([local[0]])]], cutW).filter((d) => planarKm2(d) >= 0.5);
  const key = (v) => v[0] + "," + v[1];
  const main = diff.find((d) => d[0].some((v) => same(v, A)) && d[0].some((v) => same(v, B)));
  if (!main) throw new Error("the coast ends are cut");
  const q = main[0].slice(0, -1), m = q.length;
  const ia = q.findIndex((v) => same(v, A)), ib = q.findIndex((v) => same(v, B));
  const onW = (v) => v[0] === w[0] || v[0] === w[2] || v[1] === w[1] || v[1] === w[3];
  const path = (dir) => { const out = []; for (let k = ia; ; k = (k + dir + m) % m) { out.push(q[k]); if (k === ib) break; } return out; };
  const pf = path(1), pb = path(-1);
  const inner = (pth) => pth.slice(1, -1).filter((v) => !onW(v)).length;
  const repl = inner(pf) >= inner(pb) ? pf : pb;
  const holes = main.slice(1);
  const add = diff.filter((d) => d !== main);
  const thin = simplifyLine(repl, tol);
  return { splice: [i0, i1 - i0 + 1, thin.map(([x, y]) => [r4(x), r4(y)])], holes: holes.map((h) => simplifyRing(h, tol)), add: add.map((d) => d.map((r) => simplifyRing(r, tol))), cutKm2 };
};
const land = {};
for (const level of ["hi", "lo"]) {
  const fc = client.feature(landTopo[level], landTopo[level].objects.land);
  const mp = (fc.features || [fc]).flatMap((f) => polysOf(f.geometry));
  const boxes = mp.map((p) => bboxOf([p]));
  const patches = [];
  landGroups.forEach((g) => g.states.forEach((s) => {
    if (s.dropAt) {
      const i = mp.findIndex((p, k) => s.dropAt[0] >= boxes[k][0] && s.dropAt[0] <= boxes[k][2] && s.dropAt[1] >= boxes[k][1] && s.dropAt[1] <= boxes[k][3] && planarKm2(p) < 500);
      if (i < 0) { console.log(level, g.name, "not in this level"); return; }
      patches.push({ g: g.name, f: s.from, t: s.to, k: keyOf(mp[i][0]), d: 1, b: boxes[i].map(r3) });
      return;
    }
    if (s.fillAt) {
      const ringIn = (ring, v) => { let odd = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > v[1]) !== (yj > v[1]) && v[0] < ((xj - xi) * (v[1] - yi)) / (yj - yi) + xi) odd = !odd; } return odd; };
      mp.forEach((poly, i) => {
        const holes = poly.slice(1).filter((h) => s.fillAt.some((v) => ringIn(h, v)));
        if (!holes.length) return;
        patches.push({ g: g.name, f: s.from, t: s.to, k: keyOf(poly[0]), x: holes.map(keyOf), s: [], h: [], a: [], b: bboxOf([holes]).map(r3) });
        console.log(level, g.name, "fills", holes.length, "holes of parent", i);
      });
      return;
    }
    const w = g.win;
    mp.forEach((poly, i) => {
      if (!hits(boxes[i], w)) return;
      if (!poly[0].some((v) => inBox(v, w))) {
        if (clip.intersection([poly], s.cut).length) throw new Error(g.name + ": a polygon without vertices in the window meets the cut");
        return;
      }
      if (!clip.intersection([poly], s.cut).some((c) => planarKm2(c) >= 0.5)) return;
      const r = windowSplice(poly, s.cut, w, level === "hi" ? 0.002 : 0.006);
      if (!r) return;
      const sign = Math.sign(signed(poly[0]));
      const holes = r.holes.filter((h) => planarKm2([h]) >= 0.5).map((h) => orient(h, -sign).map(([x, y]) => [r4(x), r4(y)]));
      const add = r.add.map((d) => d.map((ring, ri) => orient(ring, ri ? -sign : sign).map(([x, y]) => [r4(x), r4(y)])));
      patches.push({ g: g.name, f: s.from, t: s.to, k: keyOf(poly[0]), s: [r.splice], h: holes, a: add, b: w });
      console.log(level, g.name, "to", s.to, "parent", i, "ring", poly[0].length, "replaces", r.splice[1], "with", r.splice[2].length, "adds", add.map((d) => planarKm2(d).toFixed(1)).join(" "), "holes", holes.map((h) => planarKm2([h]).toFixed(1)).join(" "), "cut km2", Math.round(r.cutKm2));
    });
  }));
  land[level] = patches;
}

const rtopo = client.feature(ucRivers, ucRivers.objects.rivers).features;
const riverDrop = [], riverAdd = [];
const yellowLower = rtopo.findIndex((f) => f.properties.n === "Yellow" && f.geometry.coordinates.length > 20 && f.geometry.coordinates[f.geometry.coordinates.length - 1][1] > 37.5);
const yellowUpper = rtopo.findIndex((f) => f.properties.n === "Yellow" && f.geometry.coordinates.length > 20 && Math.abs(f.geometry.coordinates[f.geometry.coordinates.length - 1][0] - 114.83) < 0.05);
if (yellowLower < 0 || yellowUpper < 0) throw new Error("Yellow River not found");
{
  const lower = rtopo[yellowLower].geometry.coordinates, upper = rtopo[yellowUpper].geometry.coordinates;
  riverDrop.push([yellowLower, lower.length, lower[0][0], lower[0][1]]);
  riverAdd.push(["Yellow River since 1855", 3, [[null, 1128], [at(1855, 8, 1), null]], lower.map(([x, y]) => [r3(x), r3(y)])]);
  const TOWNS = [[115.65, 34.45], [116.35, 34.42], [117.18, 34.26], [118.28, 33.96], [118.70, 33.71], [119.019, 33.589], [119.21, 33.78], [119.831, 34.0]];
  const start = upper[upper.length - 1];
  const fc = client.feature(landTopo.hi, landTopo.hi.objects.land);
  const coastPolys = (fc.features || [fc]).flatMap((f) => polysOf(f.geometry));
  const a = TOWNS[TOWNS.length - 2], b = TOWNS[TOWNS.length - 1];
  let best = null;
  for (const poly of coastPolys) for (const ring of poly) for (let i = 1; i < ring.length; i++) {
    const p = ring[i - 1], q = ring[i];
    const dx = b[0] - a[0], dy = b[1] - a[1], ex = q[0] - p[0], ey = q[1] - p[1], den = dx * ey - dy * ex;
    if (!den) continue;
    const t = ((p[0] - a[0]) * ey - (p[1] - a[1]) * ex) / den, u = ((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / den;
    if (t > 1 && u >= 0 && u <= 1 && (!best || t < best)) best = t;
  }
  const mouth = [a[0] + best * (b[0] - a[0]), a[1] + best * (b[1] - a[1])];
  riverAdd.push(["Yellow River, 1128 to 1855 (approximate)", 3, [[1128, at(1855, 8, 1)]], [start, ...TOWNS, mouth].map(([x, y]) => [r3(x), r3(y)])]);
}
const canal = (name) => neRivers.features.filter((f) => f.properties.name === name).flatMap((f) => f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates);
const joinLines = (lines) => {
  const out = lines.map((l) => l.slice());
  for (let merged = true; merged;) {
    merged = false;
    for (let i = 0; i < out.length && !merged; i++) for (let j = 0; j < out.length && !merged; j++) {
      if (i === j) continue;
      const A = out[i], Bl = out[j];
      if (same(A[A.length - 1], Bl[0])) { out[i] = A.concat(Bl.slice(1)); out.splice(j, 1); merged = true; }
      else if (same(A[A.length - 1], Bl[Bl.length - 1])) { out[i] = A.concat(Bl.slice().reverse().slice(1)); out.splice(j, 1); merged = true; }
    }
  }
  return out;
};
joinLines(canal("Suez Canal")).forEach((l) => riverAdd.push(["Suez Canal", 6, [[at(1869, 11, 17), null]], simplifyLine(l, 0.002).map(([x, y]) => [r3(x), r3(y)])]));
joinLines(canal("Panama Canal")).forEach((l) => riverAdd.push(["Panama Canal", 6, [[at(1914, 8, 15), null]], simplifyLine(l, 0.001).map(([x, y]) => [r3(x), r3(y)])]));

const inside = (polys, x, y) => polys.some((poly) => {
  let odd = false;
  for (const ring of poly) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) odd = !odd;
  }
  return odd;
});
let gapPts = 0;
lakeOnly.forEach(([name, km2, from]) => {
  if (from === null) return;
  const row = lakeRow(name, km2), polys = row[4], bb = bboxOf(polys);
  neRivers.features.forEach((f) => {
    const p = f.properties;
    if (!(p.scalerank >= 1 && p.scalerank <= 6) || /canal/i.test(p.name || "")) return;
    const lines = f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates;
    lines.forEach((line) => {
      if (!hits(bboxOf([[line]]), bb)) return;
      const inn = line.map(([x, y]) => x >= bb[0] && x <= bb[2] && y >= bb[1] && y <= bb[3] && inside(polys, x, y));
      for (let s = 0; s < line.length; s++) {
        if (!inn[s]) continue;
        let e = s; while (e + 1 < line.length && inn[e + 1]) e++;
        const run = line.slice(Math.max(0, s - 1), Math.min(line.length, e + 2));
        if (run.length >= 2) {
          const simple = simplifyLine(run, 0.004).map(([x, y]) => [r3(x), r3(y)]);
          riverAdd.push([name, p.scalerank, [[null, from]], simple]);
          gapPts += simple.length;
        }
        s = e;
      }
    });
  });
});

const out = {
  land,
  lakes: { only: lakeOnly, add: lakeAdd },
  rivers: { drop: riverDrop, add: riverAdd }
};
const json = JSON.stringify(out);
writeFileSync(resolve(here, "../data/geography.json"), json);
console.log("reservoirs:", reservoirLog.filter((r) => typeof r[2] === "number").length, "dated,", reservoirLog.filter((r) => typeof r[2] !== "number").length, "kept;", lakeOnly.length, "lakes dated;", lakeAdd.length, "past extents;", riverAdd.length, "river lines,", gapPts, "points under reservoirs;", Math.round(json.length / 1024), "KB");
if (process.env.GEO_LOG) writeFileSync(process.env.GEO_LOG, reservoirLog.map((r) => r.join(" | ")).join("\n") + "\n");

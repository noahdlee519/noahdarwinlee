import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildWW2 } from "./ww2-control.mjs";
import { buildSpain } from "./spain-control.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const modules = resolve(process.argv[2] || "node_modules");
const nePath = resolve(process.argv[3] || "ne_10m_admin_1_states_provinces.geojson");
const muniPath = resolve(process.argv[4] || "mexico.json");
const only = process.argv.slice(5);
const input = resolve(here, "control");
const out = resolve(here, "../data/control");
const require = createRequire(resolve(modules, "x.js"));
const server = require("topojson-server");
const client = require("topojson-client");
const simplify = require("topojson-simplify");
const clip = require("polygon-clipping");
const { Delaunay } = require("d3-delaunay");

const DAY0 = Date.UTC(1886, 0, 1);
const dayOf = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - DAY0) / 86400000);
const R_KM = 6371.0088;
const weightFor = (km) => (km / R_KM) ** 2;
const SIMPLIFY_KM = 0.3, Q = 1e5, MIN_PART_KM2 = 2;

const SIDES = {
  syGov: ["Syrian government (Assad)", "#a8322a"],
  syOpp: ["Syrian opposition and Turkish-backed forces", "#3d8a3a"],
  syKurd: ["Kurdish-led forces (SDF)", "#d1a917"],
  syHts: ["al-Nusra Front and Tahrir al-Sham (HTS)", "#5b6466"],
  syNew: ["Syrian transitional government", "#4d6f86"],
  isis: ["Islamic State (ISIS)", "#26221f"],
  usa: ["United States and allied forces", "#2a8a8a"],
  israel: ["Israel", "#3a64b0"],
  druze: ["Druze militias", "#8aa83a"],
  ukraine: ["Ukraine", "#2f62b0"],
  russia: ["Russia and its proxies", "#b23a30"],
  sinaloa: ["Sinaloa Cartel", "#2f7f9a"],
  zetas: ["Los Zetas", "#3b3b3b"],
  golfo: ["Gulf Cartel", "#b1462e"],
  familia: ["La Familia Michoacana", "#7c4f9e"],
  beltran: ["Beltrán Leyva Organization", "#c47a1b"],
  barbie: ["La Barbie's faction", "#c9a227"],
  cjng: ["Jalisco New Generation Cartel", "#9a2d55"],
  juarez: ["Juárez Cartel", "#4c7a2f"],
  tijuana: ["Tijuana Cartel", "#3a5fa8"],
  fuel: ["fuel-theft gangs (huachicoleros)", "#7d6a52"],
  pa: ["Palestinian Authority", "#2f8a4a"],
  hamas: ["Hamas", "#c0562a"],
  popular: ["Popular Forces", "#c9a227"]
};
const OCVED_GROUPS = {
  "Cartel de Sinaloa": "sinaloa", "Los Zetas": "zetas", "Cartel del Golfo": "golfo", "La Familia Michoacana": "familia", "Beltran Leyva": "beltran", "La Barbie": "barbie",
  "Cartel de Jalisco Nueva Generacion": "cjng", "Cartel de Juarez": "juarez", "Cartel de Tijuana": "tijuana", "Huachicoleros": "fuel"
};
const PRESENCE_MIN = 2, MUNI_KM = 0.5;

const WARS = [
  {
    key: "syria",
    name: "Syrian civil war",
    credit: "Wikipedia's town maps",
    region: (p) => p.adm0_a3 === "SYR",
    rules: [
      [/transitional government/i, "syNew"],
      [/Islamic State|ISIL|\(IS\)/i, "isis"],
      [/SDF|Kurd|Rojava|Autonomous Administration/i, "syKurd"],
      [/Nusra|JaN|JFS|Fateh al-Sham|Tahrir al-Sham|HTS/i, "syHts"],
      [/Druze/i, "druze"],
      [/Southern Operations|rebel|opposition|Interim Government|National Army|SNA/i, "syOpp"],
      [/Revolutionary Commando|United States/i, "usa"],
      [/Israel/i, "israel"],
      [/Russian|Ba'athist Loyalists|tribe|Military Council|Truce|Uncontrolled/i, null],
      [/Government|Syrian Arab Army|SAA/i, "syGov"]
    ],
    fallback: { red: "syGov", black: "isis", yellow: "syKurd", green: "syOpp", green0d0: "syOpp" },
    overrides: [["2016-05", "2024-11", "lime", "syHts"]]
  },
  {
    key: "ukraine",
    name: "Russian invasion of Ukraine",
    credit: "Wikipedia's town maps",
    region: (p) => p.adm0_a3 === "UKR" || ["Crimea", "Sevastopol", "Kursk", "Belgorod", "Bryansk"].includes(p.name),
    rules: [
      [/Russia/i, "russia"],
      [/Ukraine/i, "ukraine"],
      [/Uncontrolled|truce/i, null]
    ],
    fallback: { blue: "ukraine", red: "russia" },
    defaults: [[["Kursk", "Belgorod", "Bryansk"], "russia"]]
  },
  {
    key: "israel",
    name: "Israel, the West Bank, and Gaza",
    from: "2016-06",
    credit: "Wikipedia's town maps",
    region: (p) => p.adm0_a3 === "ISR" || p.adm0_a3 === "PSX",
    parts: [(p) => p.adm0_a3 === "ISR", (p) => p.name === "West Bank", (p) => p.name === "Gaza Strip"],
    rules: [
      [/Palestinian Authority|Ramallah/i, "pa"],
      [/Hamas/i, "hamas"],
      [/Popular Forces/i, "popular"],
      [/Hezbollah|Leban|Syria|Jordan|Egypt/i, null],
      [/Israel/i, "israel"]
    ],
    fallback: { blue: "israel", green0d0: "pa", lime: "hamas", yellow: "popular" }
  }
];

const ne = JSON.parse(readFileSync(nePath, "utf8"));
const polysOf = (g) => (g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);
const areaKm2 = (poly) => {
  let a = 0;
  for (let k = 0; k < poly.length; k++) {
    const r = poly[k];
    let s = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] - r[i][0]) * Math.PI / 180 * (2 + Math.sin(r[j][1] * Math.PI / 180) + Math.sin(r[i][1] * Math.PI / 180));
    a += (k ? -1 : 1) * Math.abs(s * R_KM * R_KM / 2);
  }
  return a;
};

const signed = (r) => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]); return s / 2; };
const clockwise = (polys) => polys.map((poly) => poly.map((r, k) => ((signed(r) < 0) === (k === 0) ? r : r.slice().reverse())));

const DEFAULT_STEP = 0.15, DEFAULT_GAP = 0.12;
const inRing = (r, x, y) => { let inside = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside; } return inside; };

function sideOf(war, month, colour, legends, memory) {
  for (const [from, to, c, side] of war.overrides || []) if (c === colour && month >= from && month <= to) return side;
  const label = legends[colour] ?? memory.get(colour);
  if (legends[colour] !== undefined) memory.set(colour, legends[colour]);
  if (label !== undefined) {
    for (const [re, side] of war.rules) if (re.test(label)) return side;
    return null;
  }
  return war.fallback[colour] ?? null;
}

function cellsOf(points, region, bbox) {
  const lat0 = (bbox[1] + bbox[3]) / 2, kx = Math.cos(lat0 * Math.PI / 180);
  const d = Delaunay.from(points, (p) => p[0] * kx, (p) => p[1]);
  const v = d.voronoi([(bbox[0] - 1) * kx, bbox[1] - 1, (bbox[2] + 1) * kx, bbox[3] + 1]);
  return points.map((p, i) => { const c = v.cellPolygon(i); return c ? [c.map((q) => [q[0] / kx, q[1]])] : null; });
}

mkdirSync(out, { recursive: true });
const index = existsSync(resolve(out, "../control.json")) ? JSON.parse(readFileSync(resolve(out, "../control.json"), "utf8")) : { wars: [] };
for (const war of WARS) {
  if (only.length && !only.includes(war.key)) continue;
  const file = resolve(input, war.key + "-towns.json");
  if (!existsSync(file)) { console.warn(war.key + ": no " + file + " (run fetch-control.mjs)"); continue; }
  const src = JSON.parse(readFileSync(file, "utf8"));
  const regionPolys = ne.features.filter((f) => war.region(f.properties)).flatMap((f) => polysOf(f.geometry));
  const region = clip.union(...regionPolys.map((p) => [p]));
  let bbox = [Infinity, Infinity, -Infinity, -Infinity];
  for (const poly of region) for (const [x, y] of poly[0]) { bbox = [Math.min(bbox[0], x), Math.min(bbox[1], y), Math.max(bbox[2], x), Math.max(bbox[3], y)]; }
  const fill = [];
  for (const [names, side] of war.defaults || []) {
    for (const f of ne.features.filter((g) => names.includes(g.properties.name))) {
      const polys = polysOf(f.geometry);
      let b = [Infinity, Infinity, -Infinity, -Infinity];
      for (const poly of polys) for (const [x, yy] of poly[0]) b = [Math.min(b[0], x), Math.min(b[1], yy), Math.max(b[2], x), Math.max(b[3], yy)];
      for (let x = Math.ceil(b[0] / DEFAULT_STEP) * DEFAULT_STEP; x <= b[2]; x += DEFAULT_STEP) for (let yy = Math.ceil(b[1] / DEFAULT_STEP) * DEFAULT_STEP; yy <= b[3]; yy += DEFAULT_STEP) {
        if (polys.some((poly) => inRing(poly[0], x, yy))) fill.push([+x.toFixed(3), +yy.toFixed(3), side]);
      }
    }
  }
  const pieces = war.parts ? war.parts.map((pred) => clip.union(...ne.features.filter((f) => pred(f.properties)).flatMap((f) => polysOf(f.geometry)).map((q) => [q]))) : [region];
  const inBox = (t) => t[1] >= bbox[0] - 0.2 && t[1] <= bbox[2] + 0.2 && t[0] >= bbox[1] - 0.2 && t[0] <= bbox[3] + 0.2;
  const state = new Map(), memory = new Map(), shapes = [], rows = [], open = new Map();
  let prevSig = "", prevShapes = null, monthsUsed = 0;
  const finish = (sideKey, last) => { const r = open.get(sideKey); if (r) { r[2] = last; open.delete(sideKey); } };
  for (let m = 0; m < src.deltas.length; m++) {
    const [month, delta] = src.deltas[m];
    if (delta) for (const item of delta.split(",")) { const [i, c] = item.split(":"); if (c === "-") state.delete(+i); else state.set(+i, c); }
    if (war.from && month < war.from) continue;
    const leg = src.legends[month] || {};
    const sides = new Map();
    for (const [i, c] of state) {
      const t = src.towns[i];
      if (!inBox(t)) continue;
      const s = sideOf(war, month, c, leg, memory);
      if (s) sides.set(i, s);
    }
    const [y, mo] = month.split("-").map(Number);
    const first = dayOf(y, mo, 1), last = dayOf(mo === 12 ? y + 1 : y, mo === 12 ? 1 : mo + 1, 1) - 1;
    const sig = [...sides].sort((a, b) => a[0] - b[0]).map((e) => e[0] + e[1]).join(",");
    let byside;
    if (sig === prevSig && prevShapes) byside = prevShapes;
    else {
      const ids = [...sides.keys()];
      const pts = ids.map((i) => [src.towns[i][1], src.towns[i][0]]);
      for (const [x, yy, s] of fill) {
        if (pts.some((q) => Math.abs(q[0] - x) < DEFAULT_GAP && Math.abs(q[1] - yy) < DEFAULT_GAP)) continue;
        const id = "f" + pts.length;
        ids.push(id); sides.set(id, s); pts.push([x, yy]);
      }
      byside = new Map();
      for (const piece of pieces) {
        const inside = ids.map((id, k) => !war.parts || piece.some((poly) => inRing(poly[0], pts[k][0], pts[k][1])));
        const pIds = ids.filter((id, k) => inside[k]), pPts = pts.filter((q, k) => inside[k]);
        if (!pPts.length) continue;
        const cells = cellsOf(pPts, piece, bbox);
        const geoms = [], groups = new Map();
        pIds.forEach((id, k) => { if (!cells[k]) return; const s = sides.get(id); if (!groups.has(s)) groups.set(s, []); groups.get(s).push(geoms.length); geoms.push({ type: "Polygon", arcs: null, coords: cells[k] }); });
        const topo = server.topology({ c: { type: "GeometryCollection", geometries: geoms.map((g) => ({ type: "Polygon", coordinates: g.coords })) } });
        for (const [s, list] of groups) {
          const merged = client.merge(topo, list.map((k) => topo.objects.c.geometries[k]));
          let polys = clip.intersection(merged.coordinates, piece);
          polys = polys.filter((p) => areaKm2(p) >= MIN_PART_KM2);
          if (!polys.length) continue;
          byside.set(s, byside.has(s) ? clip.union(byside.get(s), polys) : polys);
        }
      }
      prevSig = sig;
      prevShapes = byside;
      monthsUsed++;
    }
    for (const s of [...open.keys()]) if (!byside.has(s)) finish(s, first - 1);
    for (const [s, polys] of byside) {
      const r = open.get(s);
      if (r && r.polys === polys) { r[2] = last; continue; }
      if (r) finish(s, first - 1);
      const row = [s, first, last, shapes.length];
      row.polys = polys;
      shapes.push({ type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: clockwise(polys) } });
      rows.push(row);
      open.set(s, row);
    }
  }
  const sideKeys = [...new Set(rows.map((r) => r[0]))];
  const raw = server.topology({ c: { type: "FeatureCollection", features: shapes } }, Q);
  const topo = client.quantize(simplify.simplify(simplify.presimplify(raw, simplify.sphericalTriangleArea), weightFor(SIMPLIFY_KM)), Q);
  const lastDay = rows.reduce((a, r) => Math.max(a, r[2]), -Infinity), firstDay = rows.reduce((a, r) => Math.min(a, r[1]), Infinity);
  const data = {
    key: war.key,
    name: war.name,
    source: src.source,
    credit: war.credit,
    sides: sideKeys.map((k) => [k, SIDES[k][0], SIDES[k][1]]),
    rows: rows.map((r) => [sideKeys.indexOf(r[0]), r[1], r[2], r[3]]),
    topo
  };
  writeFileSync(resolve(out, war.key + ".json"), JSON.stringify(data));
  const entry = [war.key, war.name, firstDay, lastDay, bbox.map((v) => +v.toFixed(2)), "control/" + war.key + ".json"];
  index.wars = index.wars.filter((w) => w[0] !== war.key).concat([entry]).sort((a, b) => a[2] - b[2]);
  console.log(war.key + ": " + src.deltas.length + " months, " + monthsUsed + " distinct, " + rows.length + " shapes of " + sideKeys.length + " sides, " + Math.round(JSON.stringify(data).length / 1024) + " KB");
}
function buildMexico() {
  const csv = resolve(input, "mexico-ocved.csv");
  if (!existsSync(csv) || !existsSync(muniPath)) { console.warn("mexico: needs " + csv + " and " + muniPath); return; }
  const lines = readFileSync(csv, "utf8").trim().split("\n").slice(1).map((l) => l.split(","));
  const muni = JSON.parse(readFileSync(muniPath, "utf8"));
  const ids = muni.features.map((f) => f.properties.CVEGEO);
  const raw = server.topology({ m: { type: "FeatureCollection", features: muni.features.map((f) => ({ type: "Feature", properties: {}, geometry: f.geometry })) } }, Q);
  const topoM = simplify.simplify(simplify.presimplify(raw, simplify.sphericalTriangleArea), weightFor(MUNI_KM));
  const byYear = new Map();
  for (const [y, m, g, n] of lines) {
    const side = OCVED_GROUPS[g];
    if (!side || +n < PRESENCE_MIN) continue;
    if (!byYear.has(+y)) byYear.set(+y, new Map());
    const cur = byYear.get(+y).get(m);
    if (!cur || +n > cur[1] || (+n === cur[1] && side < cur[0])) byYear.get(+y).set(m, [side, +n]);
  }
  const shapes = [], rows = [], years = [...byYear.keys()].sort((a, b) => a - b);
  let bbox = [Infinity, Infinity, -Infinity, -Infinity], missing = new Set();
  for (const y of years) {
    const groups = new Map();
    for (const [m, [side]] of byYear.get(y)) {
      const k = ids.indexOf(m);
      if (k < 0) { missing.add(m); continue; }
      if (!groups.has(side)) groups.set(side, []);
      groups.get(side).push(topoM.objects.m.geometries[k]);
    }
    for (const [side, geoms] of groups) {
      const merged = client.merge(topoM, geoms);
      for (const poly of merged.coordinates) for (const [x, yy] of poly[0]) bbox = [Math.min(bbox[0], x), Math.min(bbox[1], yy), Math.max(bbox[2], x), Math.max(bbox[3], yy)];
      rows.push([side, dayOf(y, 1, 1), dayOf(y, 12, 31), shapes.length]);
      shapes.push({ type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: clockwise(merged.coordinates) } });
    }
  }
  const sideKeys = [...new Set(rows.map((r) => r[0]))];
  const topo = server.topology({ c: { type: "FeatureCollection", features: shapes } }, Q);
  const data = { key: "mexico", name: "Mexican cartels", kind: "presence", credit: "OCVED", source: "OCVED 2.0 (Osorio and Beltrán, 2020; MIT licence): the cartel named in most violent events in a municipality in a year, at least " + PRESENCE_MIN + "; municipalities from INEGI via CONABIO and PhantomInsights/mexico-geojson (2020)", sides: sideKeys.map((k) => [k, SIDES[k][0], SIDES[k][1]]), rows: rows.map((r) => [sideKeys.indexOf(r[0]), r[1], r[2], r[3]]), topo };
  writeFileSync(resolve(out, "mexico.json"), JSON.stringify(data));
  index.wars = index.wars.filter((w) => w[0] !== "mexico").concat([["mexico", "Mexican cartels", rows[0][1], rows[rows.length - 1][2], bbox.map((v) => +v.toFixed(2)), "control/mexico.json"]]).sort((a, b) => a[2] - b[2]);
  console.log("mexico: " + years.length + " years, " + rows.length + " shapes of " + sideKeys.length + " groups, " + missing.size + " municipalities not found, " + Math.round(JSON.stringify(data).length / 1024) + " KB");
}
function buildCivilWar() {
  const file = resolve(input, "civilwar.json");
  if (!existsSync(file)) { console.warn("civilwar: no " + file + " (run civilwar.py)"); return; }
  const src = JSON.parse(readFileSync(file, "utf8"));
  const day = (s) => { const [y, m, d] = s.split("-").map(Number); return dayOf(y, m, d); };
  const sideKeys = [...new Set(src.rows.map((r) => r[0]))];
  const shapes = src.rows.map((r) => ({ type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: clockwise(r[3].type === "Polygon" ? [r[3].coordinates] : r[3].coordinates) } }));
  let bbox = [Infinity, Infinity, -Infinity, -Infinity];
  for (const f of shapes) for (const poly of f.geometry.coordinates) for (const [x, y] of poly[0]) bbox = [Math.min(bbox[0], x), Math.min(bbox[1], y), Math.max(bbox[2], x), Math.max(bbox[3], y)];
  const raw = server.topology({ c: { type: "FeatureCollection", features: shapes } }, Q);
  const topo = client.quantize(simplify.simplify(simplify.presimplify(raw, simplify.sphericalTriangleArea), weightFor(SIMPLIFY_KM * 3)), Q);
  const rows = src.rows.map((r, i) => [sideKeys.indexOf(r[0]), day(r[1]), day(r[2]), i]);
  const data = { key: "civilwar", name: "American Civil War", credit: "the Coast Survey's war maps and the Army's map", source: src.source, sides: sideKeys.map((k) => [k, src.sides[k][0], src.sides[k][1]]), rows, topo };
  writeFileSync(resolve(out, "civilwar.json"), JSON.stringify(data));
  const first = rows.reduce((a, r) => Math.min(a, r[1]), Infinity), last = rows.reduce((a, r) => Math.max(a, r[2]), -Infinity);
  index.wars = index.wars.filter((w) => w[0] !== "civilwar").concat([["civilwar", data.name, first, last, bbox.map((v) => +v.toFixed(2)), "control/civilwar.json"]]).sort((a, b) => a[2] - b[2]);
  console.log("civilwar: " + rows.length + " shapes of " + sideKeys.length + " sides, " + Math.round(JSON.stringify(data).length / 1024) + " KB");
}
if (!only.length || only.includes("mexico")) buildMexico();
if (!only.length || only.includes("civilwar")) buildCivilWar();
const env = { ne, server, client, simplify, clip, Delaunay, input, out, index, dayOf, areaKm2, clockwise, weightFor, writeFileSync, readFileSync, existsSync, resolve, only };
buildWW2(env);
buildSpain(env);
writeFileSync(resolve(out, "../control.json"), JSON.stringify(index));

// Later first-level divisions, for the countries whose divisions in Natural Earth are the layout before a reform, so that
// divisions-ne.json ends them on the reform's day and nothing was drawn after (Kenya's provinces to 26 March 2013, with no
// counties after). For each country it fetches geoBoundaries' open first-level boundaries (gbOpen, Runfola et al. 2020; the
// licence of each country's own source is kept with it) into a cache folder, names, joins, and clips them as NOW says, and writes
// tools/divisions-now/<key>.json in the form of tools/divisions-hist: a TopoJSON whose object `d` holds one geometry per
// division, with `name`, `first`, and `last` (ISO days; null for one that still stands), and `source` and `licence` beside it.
// build-divisions.mjs puts these spans after the country's spans from Natural Earth.
//
//   node chronia/tools/divisions-now.mjs <node_modules> <cache folder> [UCHRONIA's provinces.json] [key ...]
//
// Where geoBoundaries has only the layout before the reform as well, the layout after is built from it: tools/divisions-now-specs/
// <key>.json lists layouts, each a base level of geoBoundaries (or Natural Earth's units) with units joined (merge) and new ones
// carved out of the rest from the units of a lower level (carve), as the law that made them lists them. A spec's layouts are
// added to the country's entry in NOW, if it has one.
//
// A country is listed in NOW only where geoBoundaries' layout is the one that followed the reform. `first` is the day it began (the day
// after Natural Earth's ends, or a later day where another layout stood between, which is then left undrawn), `last` the day
// before a later reform that geoBoundaries does not have.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const modules = resolve(process.argv[2] || "node_modules");
const cache = resolve(process.argv[3] || "divisions-now-cache");
const provincesPath = resolve(process.argv[4] || resolve(here, "../../uchronia/data/provinces.json"));
const only = process.argv.slice(5);
const require = createRequire(resolve(modules, "x.js"));
const server = require("topojson-server"), client = require("topojson-client"), simplify = require("topojson-simplify"), clip = require("polygon-clipping");
const R_KM = 6371.0088, KEEP_KM = 0.5, Q = 2e5;
const GB = "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/releaseData/gbOpen/";

const strip = (re) => (n) => n.replace(re, "").trim();
const NOW = [
  // Kenya's 47 counties, from the general election that set up their governments (the Constitution of 2010's devolution).
  { key: "ke", c: "KEN", first: "2013-03-27" },
  // Norway's 11 counties of the regional reform, until it was partly undone on 1 January 2024.
  { key: "no", c: "NOR", first: "2020-01-01", last: "2023-12-31" },
  { key: "fi", c: "FIN", first: "2016-01-01", rename: { "Keski-Pohjanmaa": "Central Ostrobothnia", "Åland Islands": "Åland" } },
  // The Democratic Republic of the Congo's 26 provinces (the découpage of 2015).
  { key: "cd", c: "COD", first: "2015-07-16", rename: { "Lower Uele": "Bas-Uélé", "Upper Uele": "Haut-Uélé", "Central Kasai": "Kasaï-Central", "Kasai": "Kasaï", "Kasai-Oriental": "Kasaï-Oriental" } },
  // Sudan's 18 states, from West Kordofan's return; Abyei is the map's own disputed land.
  { key: "sd", c: "SDN", first: "2013-07-13", drop: ["Abyei PCA"] },
  // South Sudan's states are built from its counties (divisions-now-specs/ss.json): the 28, the 32, and the ten with two administrative areas.
  { key: "td", c: "TCD", first: "2012-09-04", rename: { "N'Djamena Region": "N'Djamena" } },
  // Angola's 18 provinces, to the law of 2024 (the 21 after it are built in divisions-now-specs/ao.json).
  { key: "ao", c: "AGO", first: "2011-10-31", last: "2024-09-04" },
  // Egypt's 27 governorates, from the end of Helwan and 6th of October (14 April 2011); 2008 to 2011 is left undrawn.
  { key: "eg", c: "EGY", first: "2011-04-14", name: strip(/ Govern(or)?ate$/) },
  // Madagascar's 22 regions, to Vatovavy-Fitovinany's division (built in divisions-now-specs/mg.json).
  { key: "mg", c: "MDG", first: "2009-10-04", last: "2021-08-10" },
  { key: "bw", c: "BWA", first: "2006-01-01", name: strip(/ District$/) },
  // Morocco's 12 regions of 2015, cut to Morocco as the map draws it (the source runs them on into Western Sahara).
  { key: "ma", c: "MAR", first: "2015-09-04", clipTo: "MAR" },
  // Côte d'Ivoire's 14 districts of 2011.
  { key: "ci", c: "CIV", first: "2011-09-28", rename: { "Valle Du Bandama": "Vallée du Bandama", "Comoe": "Comoé", "Denguele": "Denguélé", "Goh-Djiboua": "Gôh-Djiboua", "Sassandra-Marahoue": "Sassandra-Marahoué", "District Autonome D'Abidjan": "Abidjan", "District Autonome De Yamoussoukro": "Yamoussoukro" } },
  // Indonesia's 34 provinces, from North Kalimantan to the day before the laws that made three more in Papua (25 July 2022).
  { key: "id", c: "IDN", first: "2012-11-16", last: "2022-07-24", rename: { "Jakarta Special Capital Region": "Jakarta", "Special Region of Yogyakarta": "Yogyakarta" } },
  // Papua New Guinea's 22 provinces, with Hela and Jiwaka.
  { key: "pg", c: "PNG", first: "2012-05-17", name: (n) => n.replace(/ Province$/, "").replace(/^Chimbu \(Simbu\)$/, "Chimbu").replace(/^Northern \(Oro\)$/, "Oro").replace(/^West Sepik \(Sandaun\)$/, "Sandaun").replace(/^Autonomous Region of Bougainville$/, "Bougainville") },
  // Greenland's five municipalities and the national park, from Qaasuitsup's division.
  { key: "gl", c: "GRL", first: "2018-01-01" },
  // Iran's 31 provinces.
  { key: "ir", c: "IRN", first: "2013-01-13" },
  // The Philippines' provinces (the source's second level; its first is the regions), from Davao Occidental's plebiscite
  // (28 October 2013) to the day before Maguindanao's division (17 September 2022); 2006 to 2013 is left undrawn. The capital
  // region's four districts are Metro Manila, and the two cities the source draws apart go to the provinces round them.
  { key: "ph", c: "PHL", level: "ADM2", first: "2013-10-28", last: "2022-09-16", name: (n) => (/^NCR/.test(n) ? "Metro Manila" : n === "City of Isabela" ? "Basilan" : n === "Cotabato City" ? "Maguindanao" : n) }
];

async function fetchTo(file, url) {
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  for (let t = 0; t < 4; t++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status + " " + url);
      const body = await r.text(), json = JSON.parse(body);
      writeFileSync(file, body);
      return json;
    } catch (e) { if (t === 3) throw e; await new Promise((ok) => setTimeout(ok, 2000 * (t + 1))); }
  }
}
const polysOf = (g) => (!g ? [] : g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);
let ne = null;
function countryShape(c) {
  if (!ne) ne = JSON.parse(readFileSync(provincesPath, "utf8"));
  const gs = ne.objects.provinces.geometries.filter((g) => g.properties.c === c);
  if (!gs.length) throw new Error("no " + c + " in " + provincesPath);
  return client.merge(ne, gs).coordinates;
}

mkdirSync(cache, { recursive: true });
mkdirSync(resolve(here, "divisions-now"), { recursive: true });
const SPEC_DIR = resolve(here, "divisions-now-specs");
const SPECS = existsSync(SPEC_DIR) ? readdirSync(SPEC_DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(resolve(SPEC_DIR, f), "utf8"))) : [];
const d3 = require("d3-geo");
// A sliver of no area can be taken for the whole globe (its winding is not to be told), so the smaller of the two sides counts.
const km2 = (polys) => { const a = d3.geoArea({ type: "MultiPolygon", coordinates: rewindAll(polys) }); return Math.min(a, 4 * Math.PI - a) * R_KM * R_KM; };
const planar = (r) => { let a = 0; for (let i = 0; i + 1 < r.length; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return a / 2; };
const rewindAll = (polys) => polys.map((poly) => poly.map((ring, k) => ((planar(ring) > 0) === (k === 0) ? ring.slice().reverse() : ring)));
const union = (list) => (list.length > 1 ? clip.union(...list.map((p) => [p])) : list);
const centre = (polys) => { let x0 = 180, y0 = 90, x1 = -180, y1 = -90; for (const p of polys) for (const c of p[0]) { if (c[0] < x0) x0 = c[0]; if (c[0] > x1) x1 = c[0]; if (c[1] < y0) y0 = c[1]; if (c[1] > y1) y1 = c[1]; } return [(x0 + x1) / 2, (y0 + y1) / 2]; };
const sources = new Map();
async function level(c, lv) {
  const stem = "geoBoundaries-" + c + "-" + lv;
  const meta = await fetchTo(resolve(cache, stem + "-metaData.json"), GB + c + "/" + lv + "/" + stem + "-metaData.json");
  const src = await fetchTo(resolve(cache, stem + "_simplified.geojson"), GB + c + "/" + lv + "/" + stem + "_simplified.geojson");
  sources.set(c + " " + lv, meta);
  return src.features.map((f) => ({ name: f.properties.shapeName, polys: polysOf(f.geometry) }));
}
function neUnits(c) {
  if (!ne) ne = JSON.parse(readFileSync(provincesPath, "utf8"));
  return ne.objects.provinces.geometries.filter((g) => g.properties.c === c).map((g) => ({ name: g.properties.n, polys: polysOf(client.feature(ne, g).geometry) }));
}
// One layout's divisions, as [name, polygons].
async function layoutOf(R, L) {
  const base = L.base === "NE" ? neUnits(R.c) : await level(R.c, L.base || R.level || "ADM1");
  const byName = new Map();
  for (const u of base) {
    let n = u.name;
    if ((L.drop || R.drop || []).includes(n)) continue;
    const rn = L.rename || R.rename;
    if (rn && rn[n]) n = rn[n];
    if (R.name) n = R.name(n);
    if (!byName.has(n)) byName.set(n, []);
    byName.get(n).push(...u.polys);
  }
  for (const [n, polys] of byName) byName.set(n, union(polys));
  for (const [to, from] of Object.entries(L.merge || {})) {
    const parts = [];
    for (const n of from) { if (!byName.has(n)) throw new Error(R.key + ": no " + n + " to merge into " + to + " (have " + [...byName.keys()].join(", ") + ")"); parts.push(...byName.get(n)); byName.delete(n); }
    byName.set(to, union(parts));
  }
  for (const cv of L.carve || []) {
    const units = await level(R.c, cv.level || "ADM2"), take = [];
    for (const want of cv.units) {
      const hits = units.filter((u) => u.name === want && (!cv.box || (() => { const m = centre(u.polys); return m[0] >= cv.box[0] && m[0] <= cv.box[2] && m[1] >= cv.box[1] && m[1] <= cv.box[3]; })()));
      if (!hits.length) throw new Error(R.key + ": no unit " + want + " at " + (cv.level || "ADM2") + (cv.box ? " in the box" : "") + " for " + cv.name);
      if (hits.length > 1 && !cv.all) throw new Error(R.key + ": " + hits.length + " units named " + want + " for " + cv.name + " (give a box, or all: true)");
      for (const h of hits) take.push(...h.polys);
    }
    const shape = union(take);
    for (const [n, polys] of byName) {
      if (cv.from && !cv.from.includes(n)) continue;
      const rest = clip.difference(polys, shape).filter((p) => km2([p]) >= (cv.sliver ?? 4));
      if (rest.length) byName.set(n, rest); else byName.delete(n);
    }
    // With `from`, the new unit takes only what it cuts out of those units, so its outer edge is theirs.
    let mine = shape;
    if (cv.from) { const parents = []; for (const n of cv.from) { if (!L._before.has(n)) throw new Error(R.key + ": no " + n + " to carve " + cv.name + " from"); parents.push(...L._before.get(n)); } mine = clip.intersection(shape, union(parents)); }
    mine = mine.filter((p) => km2([p]) >= (cv.sliver ?? 4) || mine.length === 1);
    if (!mine.length) throw new Error(R.key + ": " + cv.name + " comes out empty");
    byName.set(cv.name, byName.has(cv.name) ? union(byName.get(cv.name).concat(mine)) : mine);
  }
  if (L.clipTo || R.clipTo) { const land = countryShape(L.clipTo || R.clipTo); for (const [n, polys] of byName) { const g = clip.intersection(polys, land).filter((p) => p.length && p[0].length >= 4); if (g.length) byName.set(n, g); else { byName.delete(n); console.log(R.key + ": " + n + " lies outside " + (L.clipTo || R.clipTo) + ", left out"); } } }
  return byName;
}
const keys = [...new Set([...NOW.map((r) => r.key), ...SPECS.map((r) => r.key)])];
for (const key of keys) {
  if (only.length && !only.includes(key)) continue;
  const own = NOW.find((r) => r.key === key), spec = SPECS.find((r) => r.key === key);
  const R = { ...(spec || {}), ...(own || {}) };
  const layouts = (own ? [{ first: own.first, last: own.last, base: own.level }] : []).concat(spec ? spec.layouts : []).sort((a, b) => (a.first < b.first ? -1 : 1));
  const feats = [], used = new Set();
  for (const L of layouts) {
    // carve's `from` reads the base units as they stood before any carving in this layout
    const probe = { ...L, carve: [] };
    L._before = await layoutOf(R, probe);
    const byName = await layoutOf(R, L);
    for (const [name, polys] of byName) feats.push({ type: "Feature", properties: { name, first: L.first, last: L.last || null }, geometry: { type: "MultiPolygon", coordinates: polys } });
    used.add((L.base === "NE" ? "Natural Earth" : R.c + " " + (L.base || R.level || "ADM1")));
    for (const cv of L.carve || []) used.add(R.c + " " + (cv.level || "ADM2"));
    console.log(key + ": " + byName.size + " divisions from " + L.first + (L.last ? " to " + L.last : ""));
  }
  let t = server.topology({ d: { type: "FeatureCollection", features: feats } }, Q);
  t = simplify.presimplify(t, simplify.sphericalTriangleArea);
  t = simplify.simplify(t, (KEEP_KM / R_KM) ** 2);
  t.arcs = t.arcs.map((a) => a.map((p) => [p[0], p[1]]));
  t = client.quantize(t, Q);
  t.objects.d.geometries.forEach((g, i) => { g.properties = feats[i].properties; });
  const srcs = [...used].map((u) => (sources.has(u) ? "geoBoundaries gbOpen " + u + " (" + sources.get(u).boundaryYear + ", " + sources.get(u).boundarySource + ")" : u));
  const lics = [...new Set([...used].map((u) => (sources.has(u) ? sources.get(u).boundaryLicense : "public domain")))];
  const body = JSON.stringify({ names: [], source: srcs.join("; "), licence: lics.join("; "), topo: t });
  writeFileSync(resolve(here, "divisions-now", key + ".json"), body);
  console.log(key + ": " + feats.length + " spans, " + Math.round(body.length / 1024) + " KB | " + lics.join("; "));
}

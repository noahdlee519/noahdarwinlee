import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const modules = resolve(process.argv[2] || "node_modules");
const source = resolve(process.argv[3] || "historical-basemaps/geojson");
const provincesPath = resolve(process.argv[4] || resolve(here, "../../uchronia/data/provinces.json"));
const out = resolve(here, "../data");
const require = createRequire(resolve(modules, "x.js"));
const server = require("topojson-server");
const client = require("topojson-client");
const simplify = require("topojson-simplify");
const d3 = require("d3-geo");
const clip = require("polygon-clipping");

const FIRST = -3000;
const R_KM = 6371.0088;
const HI_KM = 1.6, LO_KM = 12;
const HI_Q = 2e5, LO_Q = 2e4;
const weightFor = (km) => (km / R_KM) ** 2;

const LINEAGE = [
  ["England", "Kingdom of England", "Great Britain", "Kingdom of Great Britain", "United Kingdom", "United Kingdom of Great Britain and Ireland", "United Kingdom of Great Britain and Northern Ireland", "British Empire"],
  ["Kingdom of France", "France", "French Empire", "French Republic"],
  ["Grand Duchy of Moscow", "Tsardom of Muscovy", "Russian Empire", "USSR", "Russia", "Russian Federation"],
  ["Han", "Han Empire", "Jin", "Sui Empire", "Tang Empire", "Song Empire", "Ming Empire", "Ming Chinese Empire", "Manchu Empire", "Qing Empire", "China"],
  ["United States of America", "United States"],
  ["Castile", "Spain", "Spanish Habsburg", "Habsburg Spain"],
  ["Portugal", "Kingdom of Portugal"],
  ["Dutch Republic", "United Provinces", "United Kingdom of Netherlands", "Netherlands"],
  ["Brandenburg", "Brandenburg-Prussia", "Prussia", "Kingdom of Prussia", "German Empire", "Germany"],
  ["Austrian Empire", "Austro-Hungarian Empire", "Austria", "Habsburg Monarchy"],
  ["Ottoman Empire", "Turkey"],
  ["Safavid Empire", "Persia", "Iran"],
  ["Imperial Japan (Fujiwara)", "Tokugawa shogunate", "Japan", "Empire of Japan"],
  ["Roman Republic", "Roman Empire", "Eastern Roman Empire", "Byzantine Empire"],
  ["Kingdom of Sardinia", "Kingdom of Italy", "Italy"],
  ["Viceroyalty of Brazil", "Kingdom of Brazil", "Empire of Brazil", "Brazil"],
  ["Ayutthaya", "Rattanakosin Kingdom", "Siam", "Thailand"],
  ["Abyssinia", "Ethiopia"],
  ["Poland-Lithuania", "Poland"],
  ["Denmark-Norway", "Denmark"],
  ["Sweden", "Sweden–Norway"],
  ["Mughal Empire", "India"],
  ["Viceroyalty of New Spain", "Mexico"]
];
const RULER_ALIAS = {
  "United Kingdom": "United Kingdom of Great Britain and Ireland",
  "Russia": "Russian Empire",
  "Italy": "Kingdom of Italy",
  "Netherlands": "Netherlands",
  "Spanish Habsburg": "Spain",
  "England": "England",
  "United Kingdom of Netherlands": "United Kingdom of Netherlands"
};
const RENAME = [
  [1801, 1922, "United Kingdom", "United Kingdom of Great Britain and Ireland"]
];
const RULER_FIX = [
  ["Philippines", 1565, 1898, "Spain"],
  ["Philippines", 1898, 1946, "United States"],
  ["Puerto Rico", 1508, 1898, "Spain"],
  ["Puerto Rico", 1898, 9999, "United States"],
  ["Ceylon", 1796, 1948, "United Kingdom"],
  ["Cape Colony", 1806, 1910, "United Kingdom"],
  ["Canada", 1763, 1867, "United Kingdom"],
  ["Goa", 1510, 1961, "Portugal"],
  ["Angola", 1575, 1975, "Portugal"],
  ["Portuguese East Africa", 1505, 1975, "Portugal"],
  ["Portuguese Guinea", 1630, 1974, "Portugal"],
  ["Mozambique", 1505, 1975, "Portugal"],
  ["Dutch East Indies", 1800, 1949, "Netherlands"],
  ["Netherlands Indies", 1800, 1949, "Netherlands"],
  ["Suriname", 1667, 1975, "Netherlands"],
  ["Guiana", 1667, 1975, "Netherlands"],
  ["Netherlands Antilles", 1634, 2010, "Netherlands"],
  ["Kamerun", 1884, 1916, "German Empire"],
  ["Togoland", 1884, 1916, "German Empire"],
  ["German South-West Africa", 1884, 1915, "German Empire"],
  ["Guadeloupe", 1635, 9999, "France"],
  ["Martinique", 1635, 9999, "France"],
  ["French Guiana", 1667, 9999, "France"],
  ["Saint Martin", 1648, 9999, "France"],
  ["Wallis and Futuna Islands", 1887, 9999, "France"],
  ["Tunisia", 1881, 1956, "France"],
  ["Morocco", 1912, 1956, "France"],
  ["Malaya", 1874, 1957, "United Kingdom"],
  ["Belize", 1862, 1981, "United Kingdom"],
  ["Guyana", 1814, 1966, "United Kingdom"],
  ["Gambia, The", 1821, 1965, "United Kingdom"],
  ["Sierra Leone", 1808, 1961, "United Kingdom"],
  ["Malta", 1814, 1964, "United Kingdom"],
  ["Fiji", 1874, 1970, "United Kingdom"],
  ["Uganda", 1894, 1962, "United Kingdom"],
  ["Swaziland", 1903, 1968, "United Kingdom"],
  ["Lesotho", 1868, 1966, "United Kingdom"],
  ["Anguilla", 1650, 9999, "United Kingdom"],
  ["Montserrat", 1632, 9999, "United Kingdom"],
  ["Antigua and Barbuda", 1632, 1981, "United Kingdom"],
  ["Barbados", 1627, 1966, "United Kingdom"],
  ["Dominica", 1763, 1978, "United Kingdom"],
  ["Grenada", 1763, 1974, "United Kingdom"],
  ["Saint Kitts and Nevis", 1713, 1983, "United Kingdom"],
  ["Saint Lucia", 1814, 1979, "United Kingdom"],
  ["Saint Vincent and the Grenadines", 1763, 1979, "United Kingdom"],
  ["Trinidad", 1797, 1962, "United Kingdom"],
  ["Hong Kong", 1841, 1997, "United Kingdom"],
  ["Equatorial Guinea", 1778, 1968, "Spain"],
  ["Rio De Oro", 1884, 1975, "Spain"],
  ["Spanish Morocco", 1912, 1956, "Spain"],
  ["Niue", 1901, 1974, "New Zealand"]
];
const PEOPLES = /hunter|gatherer|farmer|pastoral|nomad|forager|fisher|fichers|cultures?\b|peoples\b|tribes\b|^proto-|archaeolog|archeolog|neolithic|bronze age|^bantu|^khoisan|^berbers?$|^semites$|^dravidians$|^austronesians$|^papuans$|^saami$|^sámi$|^ainu$|^thule$|^dorset$|^arabs$|^thai$|^sinic$|^tungus$|^siberians$|^cree$|^athabas|^inupiaq$|^chukchi$|^touareg|^tuareg|^polynesians$|^aboriginal|^vedic aryans$|^cimerians$|^iranian pastoralists$|^tibetans$|^mongols$|^oromo$|^xhosa$|^zulu$/i;
const AUSTRALIA = [112, -45, 155, -9];
const WIKI = {
  "Han": "Han dynasty", "Han Empire": "Han dynasty", "Jin": "Jin dynasty (266–420)", "Sui Empire": "Sui dynasty",
  "Tang Empire": "Tang dynasty", "Song Empire": "Song dynasty", "Ming Empire": "Ming dynasty", "Ming Chinese Empire": "Ming dynasty",
  "Manchu Empire": "Qing dynasty", "Qing Empire": "Qing dynasty", "Great Khanate": "Yuan dynasty", "Zhou states": "Zhou dynasty",
  "Sicily": "Kingdom of Sicily", "Persia": "History of Iran", "Rattanakosin Kingdom": "Rattanakosin Kingdom (1782–1932)",
  "Empire of Alexander": "Macedonian Empire", "Eastern Roman Empire": "Byzantine Empire", "USSR": "Soviet Union",
  "Imperial Japan (Fujiwara)": "Heian period", "Austro-Hungarian Empire": "Austria-Hungary", "British Raj": "British Raj",
  "Mamluke Sultanate": "Mamluk Sultanate", "Sultanate of Delhi": "Delhi Sultanate", "Khanate of the Golden Horde": "Golden Horde",
  "Tsardom of Muscovy": "Tsardom of Russia", "Zaire": "Zaire", "Abyssinia": "Ethiopian Empire",
  "United Kingdom of Netherlands": "United Kingdom of the Netherlands", "Gambia, The": "The Gambia",
  "Sweden–Norway": "Union between Sweden and Norway", "Denmark-Norway": "Denmark–Norway", "Poland-Lithuania": "Polish–Lithuanian Commonwealth",
  "Manchuria": "Manchukuo", "Kingdom of Italy": "Kingdom of Italy", "Korea": "History of Korea", "Japan": "History of Japan",
  "Egypt": "History of Egypt", "Ethiopia": "History of Ethiopia", "Tibet": "History of Tibet"
};
const WIKI_BY_YEAR = [
  ["Egypt", -9999, -30, "Ancient Egypt"],
  ["France", 843, 1792, "Kingdom of France"],
  ["Japan", 1600, 1868, "Tokugawa shogunate"],
  ["Japan", 1868, 1947, "Empire of Japan"],
  ["Korea", 1392, 1897, "Joseon"],
  ["Persia", 1501, 1736, "Safavid Iran"],
  ["Persia", 1789, 1925, "Qajar Iran"],
  ["Ethiopia", 1270, 1974, "Ethiopian Empire"],
  ["Russia", 1990, 9999, "Russia"]
];

const yearOf = (file) => {
  const m = /^world_(bc)?(\d+)\.geojson$/.exec(file);
  return m ? (m[1] ? -+m[2] : +m[2]) : null;
};
const files = readdirSync(source).map((f) => ({ f, y: yearOf(f) })).filter((x) => x.y !== null && x.y >= FIRST).sort((a, b) => a.y - b.y);
if (!files.length) throw new Error("no world_*.geojson files in " + source);

const lineageOf = new Map();
LINEAGE.forEach((names, i) => names.forEach((n) => lineageOf.set(n, i)));
const renamed = (name, y) => {
  for (const [a, b, from, to] of RENAME) if (name === from && y >= a && y < b) return to;
  return name;
};
const rulerFix = (name, y) => {
  for (const [n, a, b, r] of RULER_FIX) if (n === name && y >= a && y < b) return r;
  return null;
};
const wikiFor = (name, y) => {
  for (const [n, a, b, t] of WIKI_BY_YEAR) if (n === name && y >= a && y < b) return t;
  return WIKI[name] || name;
};

const planar = (ring) => {
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) s += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return s / 2;
};
function polylabel(rings, precision) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of rings[0]) { if (p[0] < minX) minX = p[0]; if (p[1] < minY) minY = p[1]; if (p[0] > maxX) maxX = p[0]; if (p[1] > maxY) maxY = p[1]; }
  const w = maxX - minX, h = maxY - minY, size = Math.min(w, h);
  const dist = (x, y) => {
    let inside = false, d = Infinity;
    for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i], b = ring[j];
      if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
      let px = b[0], py = b[1], dx = a[0] - px, dy = a[1] - py;
      if (dx || dy) {
        const t = ((x - px) * dx + (y - py) * dy) / (dx * dx + dy * dy);
        if (t > 1) { px = a[0]; py = a[1]; } else if (t > 0) { px += dx * t; py += dy * t; }
      }
      dx = x - px; dy = y - py;
      d = Math.min(d, dx * dx + dy * dy);
    }
    return (inside ? 1 : -1) * Math.sqrt(d);
  };
  if (!(size > 0)) return [minX, minY, 0];
  const cell = (x, y, half) => { const d = dist(x, y); return { x, y, half, d, max: d + half * Math.SQRT2 }; };
  const queue = [];
  let h0 = size / 2;
  for (let x = minX; x < maxX; x += size) for (let y = minY; y < maxY; y += size) queue.push(cell(x + h0, y + h0, h0));
  let best = cell(minX + w / 2, minY + h / 2, 0);
  let n = 0;
  while (queue.length && n++ < 20000) {
    let bi = 0;
    for (let i = 1; i < queue.length; i++) if (queue[i].max > queue[bi].max) bi = i;
    const c = queue.splice(bi, 1)[0];
    if (c.d > best.d) best = c;
    if (c.max - best.d <= precision) continue;
    const hh = c.half / 2;
    queue.push(cell(c.x - hh, c.y - hh, hh), cell(c.x + hh, c.y - hh, hh), cell(c.x - hh, c.y + hh, hh), cell(c.x + hh, c.y + hh, hh));
  }
  return [best.x, best.y, best.d];
}
function labelOf(geometry, flatOnly) {
  const polys = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.type === "MultiPolygon" ? geometry.coordinates : [];
  let big = null, bigA = 0, total = 0;
  for (const poly of polys) {
    const lat0 = poly[0].reduce((t, p) => t + p[1], 0) / poly[0].length;
    const k = Math.cos((lat0 * Math.PI) / 180);
    const a = Math.abs(planar(poly[0])) * k * (111.195 ** 2);
    total += a;
    if (a > bigA) { bigA = a; big = poly; }
  }
  if (!big) return null;
  const lon0 = big[0][0][0];
  const lat0 = big[0].reduce((t, p) => t + p[1], 0) / big[0].length;
  const k = Math.cos((lat0 * Math.PI) / 180);
  const proj = big.map((ring) => ring.map((p) => [((((p[0] - lon0 + 540) % 360) - 180) * k) * 111.195, p[1] * 111.195]));
  const [x, y, r] = polylabel(proj, 2);
  let sxx = 0, syy = 0, sxy = 0, mx = 0, my = 0;
  const outer = proj[0];
  for (const p of outer) { mx += p[0]; my += p[1]; }
  mx /= outer.length; my /= outer.length;
  for (const p of outer) { const dx = p[0] - mx, dy = p[1] - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
  let ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
  const raw = Math.abs((ang * 180) / Math.PI);
  if (flatOnly || raw < 12 || raw > 40) ang = 0;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  let lo = Infinity, hi = -Infinity;
  for (const p of outer) {
    const dx = p[0] - x, dy = p[1] - y;
    if (Math.abs(-dx * sa + dy * ca) > r * 1.2) continue;
    const u = dx * ca + dy * sa;
    if (u < lo) lo = u; if (u > hi) hi = u;
  }
  const reach = Math.min(Math.abs(lo), Math.abs(hi)) * 2;
  const span = Math.max(2 * r, Number.isFinite(reach) ? reach : 0);
  const lon = ((x / 111.195 / k + lon0 + 540) % 360) - 180, lat = y / 111.195;
  const deg = (ang * 180) / Math.PI;
  return [+lon.toFixed(3), +lat.toFixed(3), Math.round(r), Math.round(span), Math.round(deg), Math.round(total)];
}

const BIG_KM2 = 1.5e6, SLICE = 30;
function reachAlong(geometry, lon, lat, r) {
  const feature = { type: "Feature", geometry };
  const k = Math.max(0.05, Math.cos((lat * Math.PI) / 180)) * 111.195;
  const side = (dir) => {
    let d = 0;
    while (d < 4000) {
      const x = lon + (dir * (d + 25)) / k;
      if (!d3.geoContains(feature, [x, lat]) || !d3.geoContains(feature, [x, lat + (r * 0.45) / 111.195]) || !d3.geoContains(feature, [x, lat - (r * 0.45) / 111.195])) break;
      d += 25;
    }
    return d;
  };
  return 2 * Math.min(side(-1), side(1));
}
function labelSpots(geometry, total) {
  const polys = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const out = [];
  for (let x = -180; x < 180; x += SLICE) {
    const box = [[[x, -90], [x + SLICE, -90], [x + SLICE, 90], [x, 90], [x, -90]]];
    let parts;
    try { parts = clip.intersection(polys, box); } catch (e) { continue; }
    for (const part of parts) {
      const l = labelOf({ type: "Polygon", coordinates: part }, true);
      if (l && l[5] > Math.max(250000, total * 0.12)) {
        l[3] = Math.max(l[3], reachAlong(geometry, l[0], l[1], l[2]));
        out.push(l.slice(0, 5));
      }
    }
  }
  return out;
}

const catalogue = [], idOf = new Map();
const catId = (name) => {
  let i = idOf.get(name);
  if (i === undefined) { i = catalogue.length; idOf.set(name, i); catalogue.push({ n: name, years: [], wiki: new Map(), kind: 0 }); }
  return i;
};
const snapshots = [];

for (const { f, y } of files) {
  const geo = JSON.parse(readFileSync(resolve(source, f), "utf8"));
  const groups = new Map();
  const unnamed = [];
  for (const feat of geo.features) {
    const p = feat.properties || {};
    if (!feat.geometry) continue;
    let name = (p.NAME || "").trim();
    if (!name) { unnamed.push(feat.geometry); continue; }
    name = renamed(name, y);
    let ruler = (p.SUBJECTO || "").trim();
    ruler = ruler ? renamed(ruler, y) : "";
    if (ruler === name) ruler = "";
    const fixed = rulerFix(name, y);
    if (fixed) ruler = renamed(RULER_ALIAS[fixed] && y >= 1801 && y < 1922 && fixed === "United Kingdom" ? RULER_ALIAS[fixed] : fixed, y);
    if (!groups.has(name)) groups.set(name, { name, ruler, part: (p.PARTOF || "").trim(), prec: [], geoms: [] });
    const g = groups.get(name);
    if (ruler && !g.ruler) g.ruler = ruler;
    g.prec.push(+p.BORDERPRECISION || 1);
    g.geoms.push(feat.geometry);
  }
  const names = new Set(groups.keys());
  const feats = [];
  for (const g of groups.values()) {
    const polys = [];
    for (const geom of g.geoms) {
      if (geom.type === "Polygon") polys.push(geom.coordinates);
      else if (geom.type === "MultiPolygon") polys.push(...geom.coordinates);
    }
    let ruler = g.ruler;
    if (ruler && !names.has(ruler) && RULER_ALIAS[ruler] && names.has(RULER_ALIAS[ruler])) ruler = RULER_ALIAS[ruler];
    if (ruler && !names.has(ruler) && lineageOf.has(ruler)) {
      const alt = LINEAGE[lineageOf.get(ruler)].find((n) => names.has(n));
      if (alt) ruler = alt;
    }
    if (ruler === g.name || ruler.startsWith("(")) ruler = "";
    feats.push({ type: "Feature", properties: { name: g.name, ruler, part: g.part && g.part !== g.name ? g.part : "", b: Math.min(...g.prec) }, geometry: { type: "MultiPolygon", coordinates: polys } });
  }
  for (const geom of unnamed) feats.push({ type: "Feature", properties: { name: "" }, geometry: geom });
  snapshots.push({ y, feats });
}

const isPeople = (name, ruler, y, label) => {
  if (PEOPLES.test(name)) return true;
  if (!ruler && label && y < 1900 && label[0] > AUSTRALIA[0] && label[0] < AUSTRALIA[2] && label[1] > AUSTRALIA[1] && label[1] < AUSTRALIA[3] && !/wales|australia|queensland|territory|victoria|tasmania/i.test(name)) return true;
  return false;
};

function topoFor(feats, km, q) {
  const topo = server.topology({ p: { type: "FeatureCollection", features: feats } }, q);
  const pre = simplify.presimplify(topo, simplify.sphericalTriangleArea);
  return client.quantize(stripZ(simplify.simplify(pre, weightFor(km))), q);
}
function stripZ(topo) {
  topo.arcs = topo.arcs.map((arc) => {
    const outArc = [];
    for (const p of arc) outArc.push([p[0], p[1]]);
    return outArc;
  });
  return topo;
}

mkdirSync(resolve(out, "eras"), { recursive: true });
const index = [];
for (const s of snapshots) {
  const props = [];
  const clean = s.feats.map((f, i) => {
    props.push(f.properties);
    return { type: "Feature", properties: { i }, geometry: f.geometry };
  });
  const hi = topoFor(clean, HI_KM, HI_Q);
  const lo = topoFor(clean, LO_KM, LO_Q);
  const hiFeats = hi.objects.p.geometries;
  const loFeats = lo.objects.p.geometries;
  const rows = props.map((p, i) => {
    if (!p.name) return [-1];
    const geom = client.feature(hi, hiFeats[i]).geometry;
    const label = geom ? labelOf(geom) : null;
    if (label && label[5] > BIG_KM2) {
      const spots = labelSpots(geom, label[5]);
      if (spots.length > 1) label.push(spots);
    }
    const id = catId(p.name);
    const entry = catalogue[id];
    if (!entry.years.includes(s.y)) entry.years.push(s.y);
    entry.wiki.set(s.y, wikiFor(p.name, s.y));
    const people = isPeople(p.name, p.ruler, s.y, label);
    if (people) entry.kind = 1;
    return [id, p.ruler && !people ? catId(p.ruler) : -1, p.part ? catId(p.part) : -1, p.b, people ? 1 : 0, label];
  });
  hiFeats.forEach((g) => { delete g.properties; });
  loFeats.forEach((g) => { delete g.properties; });
  const file = "eras/" + (s.y < 0 ? "bc" + -s.y : s.y) + ".json";
  writeFileSync(resolve(out, file), JSON.stringify({ year: s.y, rows, hi, lo }));
  index.push([s.y, file]);
}

const keyOf = (id) => {
  const n = catalogue[id].n;
  return lineageOf.has(n) ? "L" + lineageOf.get(n) : "N" + id;
};
const edges = new Map(), weight = new Map();
const addEdge = (a, b, w) => {
  if (a === b) return;
  const k = a < b ? a + "|" + b : b + "|" + a;
  edges.set(k, (edges.get(k) || 0) + w);
};
for (const [y, file] of index) {
  const data = JSON.parse(readFileSync(resolve(out, file), "utf8"));
  const geoms = data.lo.objects.p.geometries;
  const rows = data.rows;
  const hueOf = (i) => {
    const r = rows[i];
    if (!r || r[0] < 0 || r[4]) return null;
    let id = r[0];
    if (r[1] >= 0) id = r[1];
    return keyOf(id);
  };
  rows.forEach((r, i) => {
    const k = hueOf(i);
    if (!k) return;
    const a = r[5] ? r[5][5] : 0;
    weight.set(k, (weight.get(k) || 0) + a);
  });
  const nb = client.neighbors(geoms);
  nb.forEach((list, i) => {
    const a = hueOf(i);
    if (!a) return;
    list.forEach((j) => { const b = hueOf(j); if (b) addEdge(a, b, 1); });
  });
  const labs = rows.map((r, i) => (hueOf(i) && r[5] ? [hueOf(i), r[5][0], r[5][1], Math.sqrt(r[5][5])] : null)).filter(Boolean);
  for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) {
    const A = labs[i], B = labs[j];
    if (A[0] === B[0]) continue;
    const km = d3.geoDistance([A[1], A[2]], [B[1], B[2]]) * R_KM;
    if (km < (A[3] + B[3]) * 0.75 + 250) addEdge(A[0], B[0], 0.35);
  }
}
const PALETTE = 10;
const wheel = (a, b) => { const d = Math.abs(a - b) % PALETTE; return Math.min(d, PALETTE - d); };
const adj = new Map();
for (const [k, w] of edges) {
  const [a, b] = k.split("|");
  if (!adj.has(a)) adj.set(a, []);
  if (!adj.has(b)) adj.set(b, []);
  adj.get(a).push([b, w]); adj.get(b).push([a, w]);
}
const order = [...weight.keys()].sort((a, b) => weight.get(b) - weight.get(a));
const color = new Map();
const used = new Array(PALETTE).fill(0);
for (const k of order) {
  let best = 0, bestCost = Infinity;
  for (let c = 0; c < PALETTE; c++) {
    let cost = used[c] * 1e-4;
    for (const [n, w] of adj.get(k) || []) {
      if (!color.has(n)) continue;
      const g = wheel(c, color.get(n));
      cost += w * (g === 0 ? 100 : g === 1 ? 6 : g === 2 ? 1 : 0);
    }
    if (cost < bestCost) { bestCost = cost; best = c; }
  }
  color.set(k, best);
  used[best]++;
}
let clash = 0;
for (const [k, w] of edges) { const [a, b] = k.split("|"); if (w >= 1 && color.get(a) === color.get(b)) clash++; }

const entries = catalogue.map((e, id) => {
  const k = keyOf(id);
  const wikis = [...new Set(e.wiki.values())];
  const steps = [];
  [...e.wiki.entries()].sort((a, b) => a[0] - b[0]).forEach(([y, t]) => { if (!steps.length || steps[steps.length - 1][1] !== t) steps.push([y, t]); });
  const wiki = wikis.length <= 1 ? wikis[0] || e.n : steps;
  return [e.n, color.has(k) ? color.get(k) : -1, e.years.sort((a, b) => a - b), wiki, e.kind];
});
writeFileSync(resolve(out, "eras.json"), JSON.stringify({ first: FIRST, maps: index, polities: entries }));

const prov = JSON.parse(readFileSync(provincesPath, "utf8"));
const landGeom = client.merge(prov, prov.objects.provinces.geometries);
const polys = landGeom.coordinates.filter((poly) => d3.geoArea({ type: "Polygon", coordinates: poly }) * R_KM * R_KM > 4);
const land = { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: polys } }] };
const landTopo = (km, q) => {
  const t = server.topology({ land }, q);
  return client.quantize(stripZ(simplify.simplify(simplify.presimplify(t, simplify.sphericalTriangleArea), weightFor(km))), q);
};
writeFileSync(resolve(out, "land.json"), JSON.stringify({ hi: landTopo(0.6, 5e5), lo: landTopo(LO_KM, LO_Q) }));

const PLACE_DROP = new Set(["Calusa", "Levisa", "Cumbe Mayo", "Ōyu site"]);
const PLACE_EDIT = {
  "Göbekli Tepe": { until: -8000 },
  "Çatal Höyük": { until: -5950 },
  "Taljanky": { until: -3700 },
  "Sannai-Maruyama Site": { until: -2300, name: "Sannai-Maruyama" },
  "Harappa site": { until: -1300, name: "Harappa" },
  "Kaneš": { until: -1400 },
  "Ur": { until: -500 },
  "Uruk": { until: 700 },
  "Taxila": { until: 500 },
  "Siga": { until: 400 },
  "Lambaesa": { until: 700 },
  "Xanadu": { since: 1256, until: 1369 },
  "Great Zimbabwe": { until: 1450 },
  "Vijayanagara": { since: 1336, until: 1565 },
  "Ziz,  Palermo": { name: "Palermo", names: [[-734, "Ziz"], [-254, "Panormus"], [831, "Palermo"]] },
  "Constantinople": { names: [[324, "Constantinople"], [1930, "Istanbul"]] },
  "Kyiv": { names: [[840, "Kiev"], [1995, "Kyiv"]] }
};
let placesOut = [];
try {
  const places = JSON.parse(readFileSync(resolve(source, "places.geojson"), "utf8"));
  placesOut = places.features
    .filter((f) => f.geometry && f.geometry.type === "Point" && Number.isFinite(f.properties.inhabitedSince) && !PLACE_DROP.has(f.properties.name))
    .map((f) => {
      const e = PLACE_EDIT[f.properties.name] || {};
      const row = [e.name || f.properties.name, +f.geometry.coordinates[0].toFixed(3), +f.geometry.coordinates[1].toFixed(3), e.since ?? f.properties.inhabitedSince, e.until ?? (Number.isFinite(f.properties.inhabitedUntil) ? f.properties.inhabitedUntil : null)];
      if (e.names) row.push(e.names);
      return row;
    })
    .sort((a, b) => a[3] - b[3]);
} catch (e) {
  console.warn("places.geojson not read:", e.message);
}
writeFileSync(resolve(out, "places.json"), JSON.stringify(placesOut));
const licence = resolve(source, "../LICENSE");
if (existsSync(licence)) copyFileSync(licence, resolve(out, "COPYING-historical-basemaps.txt"));
else console.warn("historical-basemaps LICENSE not found beside " + source + "; data/COPYING-historical-basemaps.txt not written");

console.log(index.length + " maps, " + catalogue.length + " names, " + color.size + " colour keys, " + clash + " touching pairs share a colour, " + placesOut.length + " dated places");

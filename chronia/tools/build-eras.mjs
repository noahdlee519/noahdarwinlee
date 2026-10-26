import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const modules = resolve(process.argv[2] || "node_modules");
const source = resolve(process.argv[3] || "historical-basemaps/geojson");
const provincesPath = resolve(process.argv[4] || resolve(here, "../../uchronia/data/provinces.json"));
const cshapesPath = resolve(process.argv[5] || "cshapes_2_gw.topojson");
const citiesPath = resolve(process.argv[6] || resolve(here, "../../uchronia/data/cities.json"));
const out = resolve(here, "../data");
const require = createRequire(resolve(modules, "x.js"));
const server = require("topojson-server");
const client = require("topojson-client");
const simplify = require("topojson-simplify");
const d3 = require("d3-geo");
const clip = require("polygon-clipping");

const FIRST = -3000;
const CS_FROM = "1886-01-01", CS_TO = "2019-12-31", CITIES_FROM = "1900-01-01";
const DAY0 = Date.UTC(1886, 0, 1);
const dayOf = (iso) => { const [y, m, d] = iso.split("-").map(Number); return Math.round((Date.UTC(y, m - 1, d) - DAY0) / 86400000); };
const yearOfDay = (day) => new Date(DAY0 + day * 86400000).getUTCFullYear();
const R_KM = 6371.0088;
const HI_KM = 1.6, LO_KM = 12;
const HI_Q = 2e5, LO_Q = 2e4;
const weightFor = (km) => (km / R_KM) ** 2;

const LINEAGE = [
  ["England", "Kingdom of England", "Great Britain", "Kingdom of Great Britain", "United Kingdom", "United Kingdom of Great Britain and Ireland", "United Kingdom of Great Britain and Northern Ireland", "British Empire"],
  ["Kingdom of France", "France", "French Empire", "French Republic"],
  ["Grand Duchy of Moscow", "Tsardom of Muscovy", "Russian Empire", "Soviet Russia", "Soviet Union", "USSR", "Russia", "Russian Federation"],
  ["Han", "Han Empire", "Jin", "Sui Empire", "Tang Empire", "Song Empire", "Ming Empire", "Ming Chinese Empire", "Manchu Empire", "Qing Empire", "China"],
  ["United States of America", "United States"],
  ["Castile", "Spain", "Spanish Habsburg", "Habsburg Spain"],
  ["Portugal", "Kingdom of Portugal"],
  ["Dutch Republic", "United Provinces", "United Kingdom of Netherlands", "Netherlands"],
  ["Brandenburg", "Brandenburg-Prussia", "Prussia", "Kingdom of Prussia", "German Empire", "Germany", "West Germany"],
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
  ["Viceroyalty of New Spain", "Mexico"],
  ["Ceylon", "Sri Lanka"],
  ["Burma", "Myanmar"],
  ["Dahomey", "Benin"],
  ["Upper Volta", "Burkina Faso"],
  ["Gold Coast", "Ghana"],
  ["Nyasaland", "Malawi"],
  ["Northern Rhodesia", "Zambia"],
  ["Southern Rhodesia", "Rhodesia", "Zimbabwe"],
  ["Congo Free State", "Belgian Congo", "Congo-Léopoldville", "Zaire", "DR Congo"]
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
const files = readdirSync(source).map((f) => ({ f, y: yearOf(f) })).filter((x) => x.y !== null && x.y >= FIRST && x.y < +CS_FROM.slice(0, 4)).sort((a, b) => a.y - b.y);
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

const CS_STATUS = { independent: 0, colony: 1, protectorate: 2, mandate: 3, occupied: 4 };
const CS_NAMES = {
  "United States of America": [["1886-01-01", "United States"]],
  "Russia (Soviet Union)": [["1886-01-01", "Russian Empire"], ["1917-11-07", "Soviet Russia"], ["1922-12-30", "Soviet Union"], ["1991-12-26", "Russia"]],
  "Turkey (Ottoman Empire)": [["1886-01-01", "Ottoman Empire"], ["1923-10-29", "Turkey"]],
  "Iran (Persia)": [["1886-01-01", "Persia"], ["1935-03-21", "Iran"]],
  "Germany (Prussia)": [["1886-01-01", "German Empire"], ["1918-11-09", "Germany"]],
  "German Federal Republic": [["1886-01-01", "West Germany"], ["1990-10-03", "Germany"]],
  "German Democratic Republic": [["1886-01-01", "East Germany"]],
  "Italy/Sardinia": [["1886-01-01", "Italy"]],
  "Rumania": [["1886-01-01", "Romania"]],
  "Thailand": [["1886-01-01", "Siam"], ["1939-06-24", "Thailand"]],
  "Sri Lanka (Ceylon)": [["1886-01-01", "Ceylon"], ["1972-05-22", "Sri Lanka"]],
  "Myanmar (Burma)": [["1886-01-01", "Burma"], ["1989-06-18", "Myanmar"]],
  "Cambodia (Kampuchea)": [["1886-01-01", "Cambodia"], ["1975-04-17", "Kampuchea"], ["1989-04-30", "Cambodia"]],
  "Congo, Democratic Republic of (Zaire)": [["1886-01-01", "Congo Free State"], ["1908-11-15", "Belgian Congo"], ["1960-06-30", "Congo-Léopoldville"], ["1971-10-27", "Zaire"], ["1997-05-17", "DR Congo"]],
  "Zimbabwe (Rhodesia)": [["1886-01-01", "Southern Rhodesia"], ["1964-10-24", "Rhodesia"], ["1980-04-18", "Zimbabwe"]],
  "Burkina Faso (Upper Volta)": [["1886-01-01", "Upper Volta"], ["1984-08-04", "Burkina Faso"]],
  "Benin": [["1886-01-01", "Dahomey"], ["1975-11-30", "Benin"]],
  "Madagascar (Malagasy)": [["1886-01-01", "Madagascar"]],
  "Swaziland (Eswatini)": [["1886-01-01", "Swaziland"], ["2018-04-19", "Eswatini"]],
  "Macedonia (FYROM/North Macedonia)": [["1886-01-01", "Macedonia"], ["2019-02-12", "North Macedonia"]],
  "Belarus (Byelorussia)": [["1886-01-01", "Belarus"]],
  "Tanzania (Tanganyika)": [["1886-01-01", "Tanganyika"], ["1964-04-26", "Tanzania"]],
  "Yemen (Arab Republic of Yemen)": [["1886-01-01", "North Yemen"], ["1990-05-22", "Yemen"]],
  "Yemen, People's Republic of": [["1886-01-01", "South Yemen"]],
  "Korea, People's Republic of": [["1886-01-01", "North Korea"]],
  "Korea, Republic of": [["1886-01-01", "South Korea"]],
  "Vietnam, Democratic Republic of": [["1886-01-01", "North Vietnam"], ["1976-07-02", "Vietnam"]],
  "Vietnam, Republic of": [["1886-01-01", "South Vietnam"]],
  "Vietnam (Annam/Cochin China/Tonkin)": [["1886-01-01", "Vietnam"]],
  "Kyrgyz Republic": [["1886-01-01", "Kyrgyzstan"]],
  "Cote D'Ivoire": [["1886-01-01", "Côte d'Ivoire"]],
  "Surinam": [["1886-01-01", "Suriname"]],
  "French Guyana": [["1886-01-01", "French Guiana"]],
  "British Somaliland (Somaliland Republic)": [["1886-01-01", "British Somaliland"]],
  "Sabah (North Borneo)": [["1886-01-01", "North Borneo"], ["1963-09-16", "Sabah"]],
  "West Irian (Dutch New Guinea)": [["1886-01-01", "Dutch New Guinea"], ["1962-10-01", "West Irian"]],
  "New Guinea (German New Guinea) (Kaiser Wilhelmsland)": [["1886-01-01", "German New Guinea"], ["1914-11-11", "New Guinea"]],
  "Selangore": [["1886-01-01", "Selangor"]],
  "Ghana": [["1886-01-01", "Gold Coast"], ["1957-03-06", "Ghana"]],
  "Malawi": [["1886-01-01", "Nyasaland"], ["1964-07-06", "Malawi"]],
  "Zambia": [["1886-01-01", "Northern Rhodesia"], ["1964-10-24", "Zambia"]],
  "Namibia": [["1886-01-01", "South West Africa"], ["1990-03-21", "Namibia"]],
  "Botswana": [["1886-01-01", "Bechuanaland"], ["1966-09-30", "Botswana"]],
  "Lesotho": [["1886-01-01", "Basutoland"], ["1966-10-04", "Lesotho"]],
  "Djibouti": [["1886-01-01", "French Somaliland"], ["1967-07-05", "Afars and Issas"], ["1977-06-27", "Djibouti"]],
  "Belize": [["1886-01-01", "British Honduras"], ["1973-06-01", "Belize"]],
  "Guyana": [["1886-01-01", "British Guiana"], ["1966-05-26", "Guyana"]],
  "Jordan": [["1886-01-01", "Transjordan"], ["1949-04-26", "Jordan"]],
  "Sudan": [["1886-01-01", "Anglo-Egyptian Sudan"], ["1956-01-01", "Sudan"]],
  "Indonesia": [["1886-01-01", "Dutch East Indies"], ["1949-12-27", "Indonesia"]],
  "India": [["1886-01-01", "British India"], ["1947-08-15", "India"]],
  "Equatorial Guinea": [["1886-01-01", "Spanish Guinea"], ["1968-10-12", "Equatorial Guinea"]],
  "Guinea-Bissau": [["1886-01-01", "Portuguese Guinea"], ["1973-09-24", "Guinea-Bissau"]],
  "Central African Republic": [["1886-01-01", "Ubangi-Shari"], ["1958-12-01", "Central African Republic"]],
  "Kenya": [["1886-01-01", "British East Africa"], ["1920-07-23", "Kenya"]],
  "Reunion": [["1886-01-01", "Réunion"]],
  "Kashmir (North, Azad)": [["1886-01-01", "Azad Kashmir"]],
  "Bokhara": [["1886-01-01", "Bukhara"]],
  "Hawaii": [["1886-01-01", "Hawaii"]],
  "Congo": [["1886-01-01", "French Congo"], ["1960-08-15", "Congo"]],
  "Mali": [["1886-01-01", "French Sudan"], ["1960-06-20", "Mali"]],
  "Bangladesh": [["1886-01-01", "East Pakistan"], ["1971-12-16", "Bangladesh"]],
  "Taiwan": [["1886-01-01", "Taiwan"]],
  "Iraq": [["1886-01-01", "Mesopotamia"], ["1921-08-23", "Iraq"]],
  "Palestine": [["1886-01-01", "Mandatory Palestine"]],
  "Danzig": [["1886-01-01", "Free City of Danzig"]],
  "Newfoundland": [["1886-01-01", "Newfoundland"]],
  "Federation of Rhodesia and Nyasaland": [["1886-01-01", "Rhodesia and Nyasaland"]]
};
const CS_WIKI = {
  "Soviet Russia": "Russian Soviet Federative Socialist Republic", "Soviet Union": "Soviet Union", "Russia": "Russia",
  "West Germany": "West Germany", "East Germany": "East Germany", "Germany": "Germany",
  "Congo": "Republic of the Congo", "French Congo": "French Congo", "DR Congo": "Democratic Republic of the Congo", "Congo-Léopoldville": "Republic of the Congo (Léopoldville)",
  "Georgia": "Georgia (country)", "Gaza": "Gaza Strip", "Natal": "Colony of Natal", "Transvaal": "South African Republic",
  "Victoria": "Colony of Victoria", "Queensland": "Colony of Queensland", "New South Wales": "Colony of New South Wales",
  "Western Australia": "Western Australia", "South Australia": "South Australia", "Tasmania": "Tasmania",
  "Lagos": "Lagos Colony", "Aden": "Colony of Aden", "Bukhara": "Emirate of Bukhara", "Khiva": "Khanate of Khiva",
  "Jammu and Kashmir": "Jammu and Kashmir (princely state)", "Tibet": "Tibet (1912–1951)", "Newfoundland": "Newfoundland (island)",
  "Korea": "Korea under Japanese rule", "Taiwan": "Taiwan under Japanese rule", "British India": "British Raj",
  "Mesopotamia": "Mandatory Iraq", "Italy": "Italy", "Serbia": "Serbia", "Persia": "History of Iran", "Hawaii": "Hawaii",
  "Kampuchea": "Democratic Kampuchea", "Rhodesia": "Rhodesia", "Southern Rhodesia": "Southern Rhodesia", "Siam": "Rattanakosin Kingdom (1782–1932)",
  "Vietnam": "Vietnam", "Macedonia": "North Macedonia", "Afars and Issas": "French Territory of the Afars and the Issas"
};
const CS_WIKI_BY_YEAR = [
  ["Korea", 1886, 1910, "Joseon"], ["Taiwan", 1950, 9999, "Taiwan"], ["Hawaii", 1886, 1898, "Hawaiian Kingdom"],
  ["Vietnam", 1886, 1945, "French Indochina"], ["Serbia", 1886, 1918, "Kingdom of Serbia"], ["Italy", 1886, 1946, "Kingdom of Italy"],
  ["Persia", 1925, 1936, "Pahlavi Iran"], ["Persia", 1886, 1925, "Qajar Iran"], ["China", 1886, 1912, "Qing dynasty"], ["China", 1912, 1949, "Republic of China (1912–1949)"],
  ["Japan", 1886, 1947, "Empire of Japan"], ["Egypt", 1886, 1953, "History of Egypt"], ["Ethiopia", 1886, 1974, "Ethiopian Empire"]
];
const cleanCs = (n) => n.replace(/\s*\([^)]*\)/g, "").trim();
const csNameAt = (csName, day) => {
  const steps = CS_NAMES[csName];
  if (!steps) return cleanCs(csName);
  let name = steps[0][1];
  for (const [d, n] of steps) if (dayOf(d) <= day) name = n;
  return name;
};
const csWiki = (name, year) => {
  for (const [n, a, b, t] of CS_WIKI_BY_YEAR) if (n === name && year >= a && year < b) return t;
  return CS_WIKI[name] || wikiFor(name, year);
};

const CITY_SINCE = {
  "Brasília": "1960-04-21", "Canberra": "1913-03-12", "Islamabad": "1961-01-01", "Naypyidaw": "2005-11-06", "Abuja": "1976-02-03",
  "Chandigarh": "1952-01-01", "Belmopan": "1970-08-01", "Gaborone": "1964-01-01", "Nouakchott": "1958-01-01", "Tel Aviv": "1909-04-11",
  "Palmas": "1989-05-20", "Navi Mumbai": "1972-01-01", "Shenzhen": "1979-03-05", "Bhubaneswar": "1948-01-01", "Gandhinagar": "1965-01-01",
  "Ciudad Guayana": "1961-07-02", "Brazzaville": "1900-01-01", "Lilongwe": "1904-01-01", "Kampala": "1900-01-01", "Nairobi": "1899-05-30",
  "Johannesburg": "1886-09-08", "Las Vegas": "1905-05-15", "Miami": "1896-07-28", "Vancouver": "1886-04-06", "Anchorage": "1914-01-01",
  "Haifa": "1886-01-01", "Ashdod": "1956-01-01", "Eilat": "1951-01-01", "Beersheba": "1900-01-01", "Magnitogorsk": "1929-01-01",
  "Norilsk": "1935-01-01", "Tolyatti": "1737-01-01", "Novosibirsk": "1893-01-01", "Karaganda": "1934-01-01", "Kemerovo": "1918-01-01",
  "Komsomolsk-on-Amur": "1932-01-01", "Murmansk": "1916-10-04", "Dzerzhinsk": "1930-01-01", "Angarsk": "1948-01-01", "Bratsk": "1955-01-01",
  "Surgut": "1965-01-01", "Nizhnevartovsk": "1972-01-01", "Naberezhnye Chelny": "1930-01-01", "Ciudad Juárez": "1886-01-01"
};
const CITY_NAMES = {
  "St. Petersburg|30": [["1886-01-01", "Saint Petersburg"], ["1914-08-31", "Petrograd"], ["1924-01-26", "Leningrad"], ["1991-09-06", "Saint Petersburg"]],
  "Volgograd": [["1886-01-01", "Tsaritsyn"], ["1925-04-10", "Stalingrad"], ["1961-11-10", "Volgograd"]],
  "Yekaterinburg": [["1886-01-01", "Yekaterinburg"], ["1924-10-14", "Sverdlovsk"], ["1991-09-23", "Yekaterinburg"]],
  "Nizhny Novgorod": [["1886-01-01", "Nizhny Novgorod"], ["1932-10-07", "Gorky"], ["1990-10-22", "Nizhny Novgorod"]],
  "Samara": [["1886-01-01", "Samara"], ["1935-01-25", "Kuybyshev"], ["1991-01-25", "Samara"]],
  "Donetsk": [["1886-01-01", "Yuzovka"], ["1924-04-22", "Stalino"], ["1961-11-09", "Donetsk"]],
  "Dnipro": [["1886-01-01", "Yekaterinoslav"], ["1926-07-20", "Dnipropetrovsk"], ["2016-05-19", "Dnipro"]],
  "Kaliningrad": [["1886-01-01", "Königsberg"], ["1946-07-04", "Kaliningrad"]],
  "Gdańsk": [["1886-01-01", "Danzig"], ["1945-03-30", "Gdańsk"]],
  "Wrocław": [["1886-01-01", "Breslau"], ["1945-05-06", "Wrocław"]],
  "Szczecin": [["1886-01-01", "Stettin"], ["1945-07-05", "Szczecin"]],
  "Bratislava": [["1886-01-01", "Pressburg"], ["1919-03-06", "Bratislava"]],
  "Chemnitz": [["1886-01-01", "Chemnitz"], ["1953-05-10", "Karl-Marx-Stadt"], ["1990-06-01", "Chemnitz"]],
  "Ho Chi Minh City": [["1886-01-01", "Saigon"], ["1976-07-02", "Ho Chi Minh City"]],
  "Kinshasa": [["1886-01-01", "Léopoldville"], ["1966-05-02", "Kinshasa"]],
  "Lubumbashi": [["1886-01-01", "Élisabethville"], ["1966-05-02", "Lubumbashi"]],
  "Kisangani": [["1886-01-01", "Stanleyville"], ["1966-05-02", "Kisangani"]],
  "Harare": [["1886-01-01", "Salisbury"], ["1982-04-18", "Harare"]],
  "Maputo": [["1886-01-01", "Lourenço Marques"], ["1976-02-03", "Maputo"]],
  "Jakarta": [["1886-01-01", "Batavia"], ["1942-03-05", "Jakarta"]],
  "Mumbai": [["1886-01-01", "Bombay"], ["1995-11-01", "Mumbai"]],
  "Chennai": [["1886-01-01", "Madras"], ["1996-07-17", "Chennai"]],
  "Kolkata": [["1886-01-01", "Calcutta"], ["2001-01-01", "Kolkata"]],
  "Bengaluru": [["1886-01-01", "Bangalore"], ["2014-11-01", "Bengaluru"]],
  "Yangon": [["1886-01-01", "Rangoon"], ["1989-06-18", "Yangon"]],
  "Dhaka": [["1886-01-01", "Dacca"], ["1982-01-01", "Dhaka"]],
  "Beijing": [["1886-01-01", "Peking"], ["1928-06-28", "Peiping"], ["1949-09-27", "Beijing"]],
  "Istanbul": [["1886-01-01", "Constantinople"], ["1930-03-28", "Istanbul"]],
  "İzmir": [["1886-01-01", "Smyrna"], ["1930-03-28", "İzmir"]],
  "Ankara": [["1886-01-01", "Angora"], ["1930-03-28", "Ankara"]],
  "Tbilisi": [["1886-01-01", "Tiflis"], ["1936-08-08", "Tbilisi"]],
  "Almaty": [["1886-01-01", "Verny"], ["1921-02-05", "Alma-Ata"], ["1993-01-28", "Almaty"]],
  "Bishkek": [["1886-01-01", "Pishpek"], ["1926-05-05", "Frunze"], ["1991-02-05", "Bishkek"]],
  "Dushanbe": [["1886-01-01", "Dushanbe"], ["1929-10-16", "Stalinabad"], ["1961-11-10", "Dushanbe"]],
  "Astana": [["1886-01-01", "Akmolinsk"], ["1961-03-14", "Tselinograd"], ["1992-06-06", "Akmola"], ["1998-05-06", "Astana"], ["2019-03-23", "Nur-Sultan"], ["2022-09-17", "Astana"]],
  "Oslo": [["1886-01-01", "Kristiania"], ["1925-01-01", "Oslo"]],
  "Tallinn": [["1886-01-01", "Reval"], ["1918-02-24", "Tallinn"]],
  "Kyiv": [["1886-01-01", "Kiev"], ["1995-01-01", "Kyiv"]],
  "Lviv": [["1886-01-01", "Lemberg"], ["1918-11-01", "Lwów"], ["1945-01-01", "Lvov"], ["1991-08-24", "Lviv"]],
  "Seoul": [["1886-01-01", "Hanseong"], ["1910-10-01", "Keijō"], ["1945-08-15", "Seoul"]],
  "Taipei": [["1886-01-01", "Taipei"], ["1895-06-17", "Taihoku"], ["1945-10-25", "Taipei"]],
  "Ulaanbaatar": [["1886-01-01", "Urga"], ["1924-11-29", "Ulaanbaatar"]],
  "Nuuk": [["1886-01-01", "Godthåb"], ["1979-05-01", "Nuuk"]],
  "N'Djamena": [["1900-01-01", "Fort-Lamy"], ["1973-04-06", "N'Djamena"]],
  "Bujumbura": [["1886-01-01", "Usumbura"], ["1962-07-01", "Bujumbura"]],
  "Banjul": [["1886-01-01", "Bathurst"], ["1973-04-24", "Banjul"]],
  "Malabo": [["1886-01-01", "Santa Isabel"], ["1973-01-01", "Malabo"]],
  "Zaporizhia": [["1886-01-01", "Aleksandrovsk"], ["1921-01-01", "Zaporizhia"]],
  "Tolyatti": [["1886-01-01", "Stavropol-on-Volga"], ["1964-08-28", "Tolyatti"]],
  "Tver": [["1886-01-01", "Tver"], ["1931-11-20", "Kalinin"], ["1990-07-17", "Tver"]],
  "Vladikavkaz": [["1886-01-01", "Vladikavkaz"], ["1931-01-01", "Ordzhonikidze"], ["1990-01-01", "Vladikavkaz"]],
  "Chișinău": [["1886-01-01", "Kishinev"], ["1990-01-01", "Chișinău"]],
  "Vilnius": [["1886-01-01", "Vilna"], ["1920-10-09", "Wilno"], ["1939-10-10", "Vilnius"]],
  "Kaunas": [["1886-01-01", "Kovno"], ["1918-02-16", "Kaunas"]],
  "Podgorica": [["1886-01-01", "Podgorica"], ["1946-07-13", "Titograd"], ["1992-04-02", "Podgorica"]],
  "Guangzhou": [["1886-01-01", "Canton"], ["1949-10-14", "Guangzhou"]],
  "Zhangjiakou": [["1886-01-01", "Kalgan"], ["1949-01-01", "Zhangjiakou"]],
  "Hohhot": [["1886-01-01", "Guisui"], ["1954-01-01", "Hohhot"]],
  "Shenyang": [["1886-01-01", "Mukden"], ["1945-08-20", "Shenyang"]],
  "Dalian": [["1898-01-01", "Dalny"], ["1905-01-01", "Dairen"], ["1945-08-22", "Dalian"]],
  "Ashgabat": [["1886-01-01", "Ashkhabad"], ["1919-07-01", "Poltoratsk"], ["1927-01-01", "Ashkhabad"], ["1992-01-01", "Ashgabat"]],
  "Pune": [["1886-01-01", "Poona"], ["1978-01-01", "Pune"]],
  "Varanasi": [["1886-01-01", "Benares"], ["1956-05-24", "Varanasi"]],
  "Kanpur": [["1886-01-01", "Cawnpore"], ["1948-01-01", "Kanpur"]],
  "Vadodara": [["1886-01-01", "Baroda"], ["1974-01-01", "Vadodara"]],
  "Thiruvananthapuram": [["1886-01-01", "Trivandrum"], ["1991-01-01", "Thiruvananthapuram"]],
  "Kochi": [["1886-01-01", "Cochin"], ["1996-01-01", "Kochi"]],
  "Faisalabad": [["1886-01-01", "Lyallpur"], ["1977-09-01", "Faisalabad"]],
  "Sahiwal": [["1886-01-01", "Montgomery"], ["1966-11-01", "Sahiwal"]],
  "Chittagong": [["1886-01-01", "Chittagong"], ["2018-04-02", "Chattogram"]],
  "Lusaka": [["1905-01-01", "Lusaka"]],
  "Kirov": [["1886-01-01", "Vyatka"], ["1934-12-05", "Kirov"]],
  "Ulyanovsk": [["1886-01-01", "Simbirsk"], ["1924-05-09", "Ulyanovsk"]],
  "Makhachkala": [["1886-01-01", "Petrovsk-Port"], ["1921-05-14", "Makhachkala"]],
  "Luhansk": [["1886-01-01", "Lugansk"], ["1935-11-05", "Voroshilovgrad"], ["1958-03-05", "Lugansk"], ["1970-01-05", "Voroshilovgrad"], ["1990-05-04", "Luhansk"]],
  "Bandar Seri Begawan": [["1886-01-01", "Brunei Town"], ["1970-10-04", "Bandar Seri Begawan"]],
  "Kingston": [["1886-01-01", "Kingston"]],
  "Ivano-Frankivsk": [["1886-01-01", "Stanislau"], ["1919-01-01", "Stanisławów"], ["1962-11-09", "Ivano-Frankivsk"]],
  "Pyongyang": [["1886-01-01", "Pyongyang"], ["1910-10-01", "Heijō"], ["1945-08-15", "Pyongyang"]],
  "Busan": [["1886-01-01", "Busan"], ["1910-10-01", "Fusan"], ["1945-08-15", "Busan"]]
};
const CAP_FIX = {
  "Bukarest": "Bucharest", "Tirane": "Tirana", "Masqat": "Muscat", "T'bilisi": "Tbilisi", "Ulan Bator": "Ulaanbaatar",
  "Singapore City": "Singapore", "Asuncion": "Asunción", "Bogota": "Bogotá", "San Jose": "San José", "Reykjavik": "Reykjavík",
  "Brasilia": "Brasília", "Chisinau": "Chișinău", "Pietermatritzburg": "Pietermaritzburg", "Sana'a": "Sanaa", "Kuwait": "Kuwait City",
  "Durres": "Durrës", "Vlore": "Vlorë", "Iasi": "Iași", "Duala": "Douala", "El Aaiun": "Laayoune", "Hue": "Huế", "(East) Jerusalem": "East Jerusalem"
};
const CAP_ALIAS = { "Saint Petersburg": "St. Petersburg|30", "Kiev": "Kyiv", "Rangoon": "Yangon", "Saigon": "Ho Chi Minh City", "Calcutta": "Kolkata", "Usumbura": "Bujumbura" };
const CITY_NAMES_REF = CITY_NAMES;
const capitalOf = (raw, lon, lat) => {
  const name = CAP_FIX[cleanCs(raw)] || cleanCs(raw);
  const cap = [name, +lon.toFixed(3), +lat.toFixed(3)];
  const key = CAP_ALIAS[name] || name;
  const steps = CITY_NAMES_REF && CITY_NAMES_REF[key];
  if (steps && steps.length) cap.push(steps.map(([d, n]) => [dayOf(d), n]));
  return cap;
};
const csTopo = JSON.parse(readFileSync(cshapesPath, "utf8"));
const csObj = Object.values(csTopo.objects)[0];
const csRaw = csObj.geometries.map((g) => ({ p: g.properties, geometry: client.feature(csTopo, g).geometry }));
const csParts = [];
for (const r of csRaw) {
  const p = r.p, start = dayOf(p.start), end = p.end >= CS_TO ? -1 : dayOf(p.end);
  const cuts = (CS_NAMES[p.country_name] || []).map(([d]) => dayOf(d)).filter((d) => d > start && (end < 0 || d <= end));
  const bounds = [start, ...cuts];
  bounds.forEach((s0, k) => {
    const e0 = k + 1 < bounds.length ? bounds[k + 1] - 1 : end;
    csParts.push({ p, geometry: r.geometry, start: s0, end: e0, name: csNameAt(p.country_name, s0) });
  });
}
const byGw = new Map();
csParts.forEach((r) => { const k = String(r.p.gwcode); if (!byGw.has(k)) byGw.set(k, []); byGw.get(k).push(r); });
const activeOn = (r, day) => r.start <= day && (r.end < 0 || day <= r.end);
const ownerName = (r) => {
  const p = r.p;
  if (p.status === "independent" || p.status === "N/A" || String(p.owner) === String(p.gwcode)) return "";
  const list = byGw.get(String(p.owner)) || [];
  const hit = list.find((o) => activeOn(o, r.start)) || list.find((o) => activeOn(o, Math.max(r.start, o.start))) || list[0];
  return hit ? hit.name : "";
};
const csFeats = csParts.map((r, i) => ({ type: "Feature", properties: { i }, geometry: r.geometry }));
const csHi = topoFor(csFeats, HI_KM, HI_Q);
const csLo = topoFor(csFeats, LO_KM, LO_Q);
const labelMemo = new Map();
const csRows = csParts.map((r, i) => {
  const g = csHi.objects.p.geometries[i];
  const memoKey = JSON.stringify(g.arcs || g.coordinates || null);
  let label = labelMemo.get(memoKey);
  if (label === undefined) {
    const geom = client.feature(csHi, g).geometry;
    label = geom ? labelOf(geom) : null;
    if (label && label[5] > BIG_KM2) {
      const spots = labelSpots(geom, label[5]);
      if (spots.length > 1) label.push(spots);
    }
    labelMemo.set(memoKey, label);
  }
  const id = catId(r.name), owner = ownerName(r);
  const entry = catalogue[id];
  const y0 = yearOfDay(r.start), y1 = r.end < 0 ? 2019 : yearOfDay(r.end);
  entry.cs = entry.cs ? [Math.min(entry.cs[0], y0), Math.max(entry.cs[1], y1)] : [y0, y1];
  entry.wiki.set(y0, csWiki(r.name, y0));
  const cap = r.p.capname ? capitalOf(String(r.p.capname), +r.p.caplong, +r.p.caplat) : null;
  return [id, owner ? catId(owner) : -1, r.start, r.end, CS_STATUS[r.p.status] ?? 0, cap, label, String(r.p.gwcode)];
});
csHi.objects.p.geometries.forEach((g) => { delete g.properties; });
csLo.objects.p.geometries.forEach((g) => { delete g.properties; });
const csChanges = [...new Set(csRows.map((r) => r[2]).concat(csRows.filter((r) => r[3] >= 0).map((r) => r[3] + 1)))].sort((a, b) => a - b);

const nameKey = new Map();
const gwKey = new Map();
const baseKey = (id) => {
  const n = catalogue[id].n;
  return lineageOf.has(n) ? "L" + lineageOf.get(n) : "N" + id;
};
for (const [gw, list] of byGw) {
  const first = list.slice().sort((a, b) => a.start - b.start)[0];
  gwKey.set(gw, baseKey(catId(first.name)));
}
csRows.forEach((r) => { if (!nameKey.has(r[0]) || !lineageOf.has(catalogue[r[0]].n)) nameKey.set(r[0], gwKey.get(r[7])); });
const keyOf = (id) => nameKey.get(id) || baseKey(id);
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
{
  const geoms = csLo.objects.p.geometries;
  const hueOf = (i) => keyOf(csRows[i][1] >= 0 ? csRows[i][1] : csRows[i][0]);
  csRows.forEach((r, i) => {
    const days = (r[3] < 0 ? dayOf(CS_TO) : r[3]) - r[2] + 1;
    const k = hueOf(i);
    weight.set(k, (weight.get(k) || 0) + (r[6] ? r[6][5] : 0) * Math.min(1, days / 3650));
  });
  const overlap = (a, b) => a[2] <= (b[3] < 0 ? Infinity : b[3]) && b[2] <= (a[3] < 0 ? Infinity : a[3]);
  client.neighbors(geoms).forEach((list, i) => {
    list.forEach((j) => { if (j > i && overlap(csRows[i], csRows[j])) addEdge(hueOf(i), hueOf(j), 1); });
  });
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
  return [e.n, color.has(k) ? color.get(k) : -1, e.years.sort((a, b) => a - b), wiki, e.kind, e.cs || null];
});
writeFileSync(resolve(out, "modern.json"), JSON.stringify({ from: CS_FROM, to: CS_TO, rows: csRows.map((r) => r.slice(0, 7)), hi: csHi, lo: csLo }));
writeFileSync(resolve(out, "eras.json"), JSON.stringify({ first: FIRST, maps: index, modern: { file: "modern.json", from: CS_FROM, to: CS_TO, changes: csChanges }, polities: entries }));

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

let citiesOut = [], unmatched = [];
try {
  const raw = JSON.parse(readFileSync(citiesPath, "utf8"));
  const used = new Set();
  const keyFor = (name, lon) => {
    if (CITY_NAMES[name + "|" + Math.round(lon / 10) * 10]) return name + "|" + Math.round(lon / 10) * 10;
    return CITY_NAMES[name] ? name : null;
  };
  citiesOut = raw.map((r) => {
    const [name, lon, lat, tier] = r;
    const k = keyFor(name, lon);
    if (k) used.add(k);
    const since = CITY_SINCE[name] ? Math.max(dayOf(CITY_SINCE[name]), dayOf(CITIES_FROM)) : null;
    const names = k && CITY_NAMES[k].length ? CITY_NAMES[k].map(([d, n]) => [dayOf(d), n]) : null;
    const row = [name, +lon.toFixed(3), +lat.toFixed(3), tier, since];
    if (names) row.push(names);
    return row;
  });
  unmatched = Object.keys(CITY_NAMES).filter((k) => CITY_NAMES[k].length && !used.has(k));
} catch (e) {
  console.warn("cities not read:", e.message);
}
writeFileSync(resolve(out, "cities.json"), JSON.stringify({ from: dayOf(CITIES_FROM), rows: citiesOut }));
if (unmatched.length) console.warn("renamed cities not found in cities.json: " + unmatched.join(", "));

const licence = resolve(source, "../LICENSE");
if (existsSync(licence)) copyFileSync(licence, resolve(out, "COPYING-historical-basemaps.txt"));
else console.warn("historical-basemaps LICENSE not found beside " + source + "; data/COPYING-historical-basemaps.txt not written");

console.log(index.length + " maps to 1880, " + csRows.length + " CShapes records from 1886 with " + csChanges.length + " change dates, " + catalogue.length + " names, " + color.size + " colour keys, " + clash + " touching pairs share a colour, " + placesOut.length + " dated places, " + citiesOut.length + " cities");

import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
const modules = resolve(process.argv[2] || "node_modules");
const source = resolve(process.argv[3] || "historical-basemaps/geojson");
const provincesPath = resolve(process.argv[4] || resolve(here, "../../uchronia/data/provinces.json"));
const cshapesPath = resolve(process.argv[5] || "cshapes_2_gw.topojson");
const clioPath = resolve(process.argv[6] || "cliopatria.geojson");
const nePath = resolve(process.argv[7] || "ne_10m_admin_1_states_provinces.geojson");
const out = resolve(here, "../data");
const require = createRequire(resolve(modules, "x.js"));
const server = require("topojson-server");
const client = require("topojson-client");
const simplify = require("topojson-simplify");
const d3 = require("d3-geo");
const clip = require("polygon-clipping");

const FIRST = -3000;
const DATED_FROM = 1200, DATED_TO = 1885, CHUNK = 100;
const CS_FROM = "1886-01-01", CS_TO = "2019-12-31";
const DAY0 = Date.UTC(1886, 0, 1);
const dayOf = (iso) => { const [y, m, d] = iso.split("-").map(Number); return Math.round((Date.UTC(y, m - 1, d) - DAY0) / 86400000); };
const yearOfDay = (day) => new Date(DAY0 + day * 86400000).getUTCFullYear();
const R_KM = 6371.0088;
const HI_KM = 1.6, LO_KM = 12;
const HI_Q = 2e5, LO_Q = 2e4;
const CS_HI_KM = 0.5, CS_HI_Q = 5e5, FINE_KM = 0.15, FINE_Q = 1e6;
const weightFor = (km) => (km / R_KM) ** 2;

const LINEAGE = [
  ["England", "Kingdom of England", "Commonwealth of England", "Great Britain", "Kingdom of Great Britain", "United Kingdom", "United Kingdom of Great Britain and Ireland", "United Kingdom of Great Britain and Northern Ireland"],
  ["Kingdom of France", "France", "French Empire", "French Republic", "French First Republic", "French Directory", "French Consulate", "First French Empire", "Bourbon Kingdom of France", "French Second Republic", "Second French Empire", "French Third Republic"],
  ["Grand Duchy of Moscow", "Grand Principality of Moscow", "Tsardom of Muscovy", "Tsardom of Russia", "Russian Empire", "Soviet Russia", "Soviet Union", "USSR", "Russia", "Russian Federation"],
  ["Han", "Han Empire", "Jin", "Sui Empire", "Tang Empire", "Song Empire", "Ming Empire", "Ming Chinese Empire", "Ming dynasty", "Manchu Empire", "Qing Empire", "Qing dynasty", "China"],
  ["United States of America", "United States"],
  ["Castile", "Crown of Castile", "Spain", "Kingdom of Spain", "Spanish Habsburg", "Habsburg Spain", "First Spanish Republic"],
  ["Portugal", "Kingdom of Portugal"],
  ["Dutch Republic", "United Provinces", "Batavian Republic", "Kingdom of Holland", "Sovereign Principality of the United Netherlands", "United Kingdom of Netherlands", "Netherlands"],
  ["Brandenburg", "Margraviate of Brandenburg", "Electorate of Brandenburg", "Brandenburg-Prussia", "Prussia", "Kingdom of Prussia", "North German Confederation", "German Empire", "Germany", "West Germany"],
  ["Duchy of Austria", "Archduchy of Austria", "Habsburg Monarchy", "House of Habsburg", "Austrian Empire", "Austro-Hungarian Empire", "Austria-Hungary", "Austria"],
  ["Ottoman Empire", "Turkey"],
  ["Swiss Confederation", "Switzerland"],
  ["Asante", "Ashanti Empire"],
  ["Alwa", "Alodia"],
  ["Safavid Empire", "Safavid dynasty", "Safavid Iran", "Afsharid Iran", "Zand dynasty", "Qajar dynasty", "Qajar Iran", "Persia", "Iran"],
  ["Imperial Japan (Fujiwara)", "Ashikaga Shogunate", "Warring States Japan", "Tokugawa shogunate", "Tokugawa Shogunate", "Japan", "Empire of Japan"],
  ["Roman Republic", "Roman Empire", "Eastern Roman Empire", "Byzantine Empire"],
  ["County of Savoy", "House of Savoy", "Duchy of Savoy", "Kingdom of Sardinia", "Kingdom of Italy", "Italy"],
  ["Colonial Brazil", "Viceroyalty of Brazil", "Kingdom of Brazil", "Empire of Brazil", "Brazil"],
  ["Ayutthaya", "Ayutthaya Kingdom", "Thonburi Kingdom", "Rattanakosin Kingdom", "Siam", "Thailand"],
  ["Abyssinia", "Ethiopian Empire", "Ethiopia"],
  ["Kingdom of Poland", "Poland-Lithuania", "Polish-Lithuanian Commonwealth", "Poland"],
  ["Kingdom of Denmark", "Denmark-Norway", "Denmark"],
  ["Kingdom of Sweden", "Swedish Empire", "Sweden", "United Kingdoms of Sweden and Norway", "Sweden–Norway"],
  ["Mughal Empire", "India"],
  ["First Hellenic Republic", "Kingdom of Greece", "Greece"],
  ["Revolutionary Serbia", "Principality of Serbia", "Kingdom of Serbia", "Serbia"],
  ["United Principalities of Moldavia and Wallachia", "Principality of Romania", "Kingdom of Romania", "Romania"],
  ["Prince-Bishopric of Montenegro", "Principality of Montenegro", "Montenegro"],
  ["Egypt", "Khedivate of Egypt"],
  ["Durrani Empire", "Emirate of Afghanistan", "Afghanistan"],
  ["Khanate of Bukhara", "Emirate of Bukhara", "Bukhara"],
  ["Republic of Haiti", "Empire of Haiti", "Haiti"],
  ["Argentine Confederation", "Argentina"],
  ["Gorkha Kingdom", "Kingdom of Nepal", "Nepal"],
  ["Sikh Confederacy", "Sikh Empire"],
  ["Viceroyalty of New Spain", "First Mexican Empire", "Federated Republic of Mexico", "Centralist Mexico", "Second Mexican Empire", "Mexico"],
  ["Ceylon", "Sri Lanka"],
  ["First Toungoo Empire", "Konbaung dynasty", "Burma", "Myanmar"],
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
  [1801, 1922, "United Kingdom", "United Kingdom of Great Britain and Ireland"],
  [1878, 1879, "M?ori", "Maori"]
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
const BANDS = /hunter|gatherer|forager|fisher|fichers/i;
const APPROX = new Set(["Mongol Empire", "Golden Horde", "Blue Horde", "White Horde", "Great Horde", "Chagatai Khanate", "Moghulistan", "Western Moghulistan", "Northern Yuan", "Oirat Confederation", "Kazakh Khanate", "Small Horde", "Nogai Horde", "Tyumen Khanate", "Khanate of Sibir", "Kalmyk Khanate", "Dzungar Khanate", "Khoshut Khanate", "Qara Khitai", "Cumania", "Kimek-Kipchak confederation", "Yenisei Kyrgyz", "Mali", "Mali Empire", "Songhai Empire", "Empire of Kanem", "Bornu Empire", "Sosso Empire", "Ghana Empire", "Kingdom of Mutapa", "Kingdom of Zimbabwe", "Kingdom of Kongo", "Sultanate of Mogadishu", "Sultanate of Showa", "Ifat Sultanate", "Adal Sultanate", "Funj", "Funj Sultanate", "Aztec Triple Alliance", "Inca Empire", "Kingdom of Cusco", "Purépecha Empire", "Chimú Empire", "Mesoamerican city-states and chiefdoms", "Andean states and chiefdoms", "Aymara kingdoms", "Zapotec city-states", "Mixtec city-states", "Later Mayan City-States", "Tuʻi Tonga Empire", "Māori", "Haudenosaunee", "Comanche", "Iroquois", "Tibet", "Phagmodrupa dynasty", "Dharmasraya"]);
const kindOf = (name) => (BANDS.test(name) ? 2 : 1);
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

const readHb = (f, y) => {
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
  return { y, feats };
};
for (const { f, y } of files) snapshots.push(readHb(f, y));

const isPeople = (name, ruler, y, label) => {
  if (PEOPLES.test(name)) return true;
  if (!ruler && label && y < 1900 && label[0] > AUSTRALIA[0] && label[0] < AUSTRALIA[2] && label[1] > AUSTRALIA[1] && label[1] < AUSTRALIA[3] && !/wales|australia|queensland|territory|victoria|tasmania/i.test(name)) return true;
  return false;
};

const STAIR_SEG = 0.5, STAIR_SHARE = 0.3, STAIR_PASSES = 2;
let stairArcs = 0;
function smoothArc(arc) {
  const n = arc.length;
  if (n < 4) return arc;
  const len = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  let ax = 0, tot = 0;
  for (let i = 1; i < n; i++) {
    const dx = Math.abs(arc[i][0] - arc[i - 1][0]), dy = Math.abs(arc[i][1] - arc[i - 1][1]), L = Math.hypot(dx, dy);
    tot += L;
    if (L && Math.min(dx, dy) < 0.05 * L) ax += L;
  }
  if (!tot || ax < STAIR_SHARE * tot) return arc;
  stairArcs++;
  let P = [], F = [];
  const put = (p, f) => {
    const q = P[P.length - 1];
    if (q && q[0] === p[0] && q[1] === p[1]) { if (f) F[F.length - 1] = true; return; }
    P.push([p[0], p[1]]); F.push(f);
  };
  put(arc[0], true);
  for (let k = 0; k < n - 1; k++) {
    const a = arc[k], b = arc[k + 1];
    if (len(a, b) < STAIR_SEG) put([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], false);
    else { put(a, true); put(b, true); }
  }
  put(arc[n - 1], true);
  for (let it = 0; it < STAIR_PASSES; it++) {
    const Q = [P[0]], G = [true];
    for (let i = 0; i + 1 < P.length; i++) {
      const a = P[i], b = P[i + 1];
      if (!(F[i] && F[i + 1])) {
        Q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]); G.push(false);
        Q.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]); G.push(false);
      }
      if (F[i + 1]) { Q.push(b); G.push(true); }
    }
    P = Q; F = G;
  }
  return P;
}
function smoothTopo(topo) {
  if (topo.transform) {
    const t = client.transform(topo.transform);
    topo.arcs = topo.arcs.map((arc) => arc.map((p, i) => { const o = t(p, i); return [o[0], o[1]]; }));
    delete topo.transform;
  }
  topo.arcs = topo.arcs.map(smoothArc);
  return topo;
}
function topoFor(feats, km, q, smooth = true) {
  const raw = server.topology({ p: { type: "FeatureCollection", features: feats } }, q), topo = smooth ? smoothTopo(raw) : raw;
  const pre = simplify.presimplify(topo, simplify.sphericalTriangleArea);
  const kept = new Set();
  const walk = (a) => { if (typeof a === "number") kept.add(a < 0 ? ~a : a); else if (a) a.forEach(walk); };
  pre.objects.p.geometries.forEach((g) => { if (g.properties && g.properties.keep) walk(g.arcs); });
  kept.forEach((i) => pre.arcs[i].forEach((p) => { p[2] = Infinity; }));
  return outward(client.quantize(stripZ(simplify.simplify(pre, weightFor(km))), q));
}
function outward(topo) {
  const flip = (poly) => {
    if (d3.geoArea(client.feature(topo, { type: "Polygon", arcs: poly })) <= 2 * Math.PI) return poly;
    return poly.map((ring) => ring.slice().reverse().map((i) => ~i));
  };
  for (const g of topo.objects.p.geometries) {
    if (g.type === "Polygon") g.arcs = flip(g.arcs);
    else if (g.type === "MultiPolygon") g.arcs = g.arcs.map(flip);
  }
  return topo;
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
  if (s.y >= DATED_FROM) continue;
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
    if (people) entry.kind = kindOf(p.name);
    return [id, p.ruler && !people ? catId(p.ruler) : -1, p.part ? catId(p.part) : -1, p.b, people ? kindOf(p.name) : 0, label];
  });
  hiFeats.forEach((g) => { delete g.properties; });
  loFeats.forEach((g) => { delete g.properties; });
  const file = "eras/" + (s.y < 0 ? "bc" + -s.y : s.y) + ".json";
  writeFileSync(resolve(out, file), JSON.stringify({ year: s.y, rows, hi, lo }));
  index.push([s.y, file]);
}

const prov = JSON.parse(readFileSync(provincesPath, "utf8"));
const polysOf = (g) => (!g ? [] : g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);
const boxOf = (polys) => {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const poly of polys) for (const p of poly[0]) { if (p[0] < b[0]) b[0] = p[0]; if (p[1] < b[1]) b[1] = p[1]; if (p[0] > b[2]) b[2] = p[0]; if (p[1] > b[3]) b[3] = p[1]; }
  return b;
};
const boxHit = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
const ringKm2 = (ring) => {
  const lat0 = ring.reduce((t, p) => t + p[1], 0) / ring.length;
  return Math.abs(planar(ring)) * Math.cos((lat0 * Math.PI) / 180) * 111.195 ** 2;
};
const polyKm2 = (poly) => Math.max(0, ringKm2(poly[0]) - poly.slice(1).reduce((t, r) => t + ringKm2(r), 0));
const km2Of = (polys) => polys.reduce((t, p) => t + polyKm2(p), 0);
const ringKm = (ring) => {
  let s = 0;
  for (let i = 1; i < ring.length; i++) {
    const k = Math.cos((((ring[i][1] + ring[i - 1][1]) / 2) * Math.PI) / 180);
    s += Math.hypot((ring[i][0] - ring[i - 1][0]) * k, ring[i][1] - ring[i - 1][1]) * 111.195;
  }
  return s;
};
const rewind = (polys) => polys.map((poly) => poly.map((ring, k) => ((planar(ring) > 0) === (k === 0) ? ring.slice().reverse() : ring)));
const snapAt = (polys, k) => polys.map((poly) => poly.map((ring) => {
  const out = [];
  for (const pt of ring) { const q = [Math.round(pt[0] * k) / k, Math.round(pt[1] * k) / k], l = out[out.length - 1]; if (!l || l[0] !== q[0] || l[1] !== q[1]) out.push(q); }
  return out;
})).map((poly) => (poly[0].length >= 4 ? poly.filter((ring) => ring.length >= 4) : [])).filter((poly) => poly.length);
const tryClip = (op, a, ...bs) => {
  for (const k of [0, 1e6, 1e5, 1e4]) {
    try { return k ? op(snapAt(a, k), ...bs.map((b) => snapAt(b, k))) : op(a, ...bs); } catch (e) {}
  }
  return null;
};
const subtract = (polys, clips) => {
  if (!clips.length || !polys.length) return polys;
  try { return rewind(clip.difference(polys, ...clips)); } catch (e) {
    let rest = polys;
    for (const c of clips) { const d = tryClip(clip.difference, rest, c); if (d) rest = d; }
    return rewind(rest);
  }
};
const snapPolys = (polys) => polys.map((poly) => poly.map((ring) => ring.map((q) => [Math.round(q[0] * 1e6) / 1e6, Math.round(q[1] * 1e6) / 1e6])));
let unionDropped = 0, dissolved = 0;
const unionSafe = (polys, adds) => {
  try { return rewind(clip.union(polys, ...adds)); } catch (e) {}
  let acc = polys;
  for (const add of adds) for (const piece of add) {
    try { acc = rewind(clip.union(acc, [piece])); continue; } catch (e) {}
    try { acc = rewind(clip.union(snapPolys(acc), snapPolys([piece]))); continue; } catch (e) {}
    try { acc = acc.concat(rewind(clip.difference([piece], acc))); } catch (e) { unionDropped++; }
  }
  return acc;
};
const overlapsItself = (polys) => {
  if (polys.length < 2) return false;
  const boxes = polys.map((p) => boxOf([p]));
  for (let a = 0; a < polys.length; a++) for (let b = a + 1; b < polys.length; b++) {
    const A = boxes[a], B = boxes[b];
    if (A[2] <= B[0] || B[2] <= A[0] || A[3] <= B[1] || B[3] <= A[1]) continue;
    let inter;
    try { inter = clip.intersection([polys[a]], [polys[b]]); } catch (e) { return true; }
    if (inter.some((p) => polyKm2(p) > 1)) return true;
  }
  return false;
};
const dissolveMemo = new WeakMap();
const dissolveFeat = (ft) => {
  if (dissolveMemo.has(ft)) return dissolveMemo.get(ft);
  let out = ft;
  const g = ft.geometry;
  if (g && g.type === "MultiPolygon" && overlapsItself(g.coordinates)) {
    const polys = unionSafe([g.coordinates[0]], [g.coordinates.slice(1)]);
    out = { ...ft, geometry: { type: "MultiPolygon", coordinates: polys } };
    dissolved++;
  }
  dissolveMemo.set(ft, out);
  return out;
};
const DISPUTE_KM2 = 10000, DISPUTE_SHARE = 0.1, NEST_SHARE = 0.8, OVERLAP_KM2 = 50;
function resolveOverlaps(list, label) {
  const order = list.map((s, i) => i).sort((a, b) => list[a].box[0] - list[b].box[0]);
  const edits = [], disputes = [], count = { same: 0, people: 0, ruler: 0, nested: 0, vague: 0, sliver: 0, disputed: 0 };
  const area = new Map(), areaOf = (s) => { if (!area.has(s)) area.set(s, km2Of(s.polys)); return area.get(s); };
  for (let x = 0; x < order.length; x++) {
    const A = list[order[x]];
    if (A.claims) continue;
    for (let y = x + 1; y < order.length; y++) {
      const B = list[order[y]];
      if (B.box[0] > A.box[2]) break;
      if (B.claims || B.last < A.first || A.last < B.first || !boxHit(A.box, B.box)) continue;
      {
        if (!A.cells) A.cells = cellsOf(A.polys);
        if (!B.cells) B.cells = cellsOf(B.polys);
        const [sm, bg] = A.cells.size <= B.cells.size ? [A, B] : [B, A];
        let shared = false;
        for (const i of sm.cells) if (bg.cells.has(i)) { shared = true; break; }
        if (!shared) continue;
      }
      let inter = null;
      try { inter = clip.intersection(A.polys, B.polys); } catch (e) {}
      if (!inter) {
        const aA0 = areaOf(A), aB0 = areaOf(B), first = Math.max(A.first, B.first), last = Math.min(A.last, B.last);
        const lose = A.name === B.name ? (aA0 <= aB0 ? A : B) : A.people !== B.people ? (A.people ? A : B) : aA0 >= aB0 ? A : B;
        edits.push({ base: lose, first, last, polys: (lose === A ? B : A).polys, add: false });
        count.failed = (count.failed || 0) + 1;
        continue;
      }
      const ia = km2Of(inter);
      if (ia < OVERLAP_KM2) continue;
      const first = Math.max(A.first, B.first), last = Math.min(A.last, B.last), aA = areaOf(A), aB = areaOf(B);
      let lose = null, kind;
      if (A.name === B.name) { lose = aA <= aB ? A : B; kind = "same"; }
      else if (A.people || B.people) { lose = A.people && B.people ? (aA <= aB ? A : B) : A.people ? A : B; kind = "people"; }
      else if (A.ruler === B.name || B.ruler === A.name) { lose = A.ruler === B.name ? B : A; kind = "ruler"; }
      else if (A.ruler && A.ruler === B.ruler) { lose = aA >= aB ? A : B; kind = "ruler"; }
      else if (ia >= NEST_SHARE * Math.min(aA, aB)) { lose = aA >= aB ? A : B; kind = "nested"; }
      else if ((A.b ?? 3) <= 1 || (B.b ?? 3) <= 1) { lose = (A.b ?? 3) < (B.b ?? 3) ? A : (B.b ?? 3) < (A.b ?? 3) ? B : aA >= aB ? A : B; kind = "vague"; }
      else if (ia >= DISPUTE_KM2 && ia >= DISPUTE_SHARE * Math.min(aA, aB)) kind = "disputed";
      else { lose = aA >= aB ? A : B; kind = "sliver"; }
      count[kind]++;
      if (lose) { edits.push({ base: lose, first, last, polys: inter, add: false }); continue; }
      edits.push({ base: A, first, last, polys: inter, add: false }, { base: B, first, last, polys: inter, add: false });
      disputes.push(withBox({ name: "Disputed land", ruler: "", part: "", people: 0, b: 2, status: 6, claims: [A.name, B.name].sort(), first, last, polys: inter, wiki: "", src: "overlap", noLabel: true }));
    }
  }
  const out = reshape(list, edits, false).concat(disputes);
  console.log(label + ": overlaps between spans resolved, " + Object.entries(count).map(([k, v]) => v + " " + k).join(", ") + "; " + list.length + " spans to " + out.length);
  return out;
}
const RG = 1440, RGK = 4;
const pack = (set) => {
  const a = Int32Array.from(set).sort();
  const has = (i) => { let lo = 0, hi = a.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1; if (a[m] === i) return true; if (a[m] < i) lo = m + 1; else hi = m - 1; } return false; };
  return { a, size: a.length, has, [Symbol.iterator]: () => a[Symbol.iterator]() };
};
const cellsOf = (polys) => {
  const set = new Set();
  for (const poly of polys) {
    const b = boxOf([poly]);
    for (let r = Math.max(0, Math.floor((90 - b[3]) * RGK)); r <= Math.min(RG / 2 - 1, Math.ceil((90 - b[1]) * RGK)); r++) {
      const lat = 90 - (r + 0.5) / RGK, xs = [];
      for (const ring of poly) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const a = ring[i], c = ring[j];
        if ((a[1] > lat) !== (c[1] > lat)) xs.push(a[0] + ((lat - a[1]) * (c[0] - a[0])) / (c[1] - a[1]));
      }
      xs.sort((x, y) => x - y);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let q = Math.max(0, Math.ceil((xs[k] + 180) * RGK - 0.5)); q <= Math.min(RG - 1, Math.floor((xs[k + 1] + 180) * RGK - 0.5)); q++) set.add(r * RG + q);
      }
    }
  }
  return pack(set);
};
const cellW = (i) => Math.cos(((90 - (Math.floor(i / RG) + 0.5) / RGK) * Math.PI) / 180);
const cellSum = (s) => { let t = 0; for (const i of s) t += cellW(i); return t; };
const dilate = (set) => {
  const out = new Set(set);
  for (const i of set) { const r = Math.floor(i / RG), c = i % RG; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr; if (rr >= 0 && rr < RG / 2) out.add(rr * RG + ((c + dc + RG) % RG)); } }
  return pack(out);
};
const meets = (a, b) => { const [x, y] = a.size < b.size ? [a, b] : [b, a]; for (const i of x) if (y.has(i)) return true; return false; };
function cutOver(polys, box, first, last, cands, opt = {}) {
  const near = opt.cells && opt.cells.size ? dilate(opt.cells) : null;
  const rel = cands.filter((c) => c.last >= first && c.first <= last && boxHit(c.box, box) && (!near || !c.cells || !c.cells.size || meets(near, c.cells)));
  const cuts = new Set([first]);
  rel.forEach((c) => { if (c.first > first) cuts.add(c.first); if (c.last + 1 <= last) cuts.add(c.last + 1); });
  (opt.cuts || []).forEach((y) => { if (y > first && y <= last) cuts.add(y); });
  const bounds = [...cuts].sort((a, b) => a - b);
  const memo = new Map(), res = [];
  bounds.forEach((s, k) => {
    const e = k + 1 < bounds.length ? bounds[k + 1] - 1 : last;
    const act = rel.filter((c) => c.first <= s && s <= c.last);
    const key = act.map((c) => c.uid).join(",") + "|" + (opt.bucket ? opt.bucket(s) : "");
    let r = memo.get(key);
    if (r === undefined) {
      let covered = 0, owner = null, share = null;
      if (opt.cells && opt.cells.size && act.length) {
        share = new Map();
        for (const i of opt.cells) {
          let hit = false;
          for (const c of act) if (c.cells && c.cells.has(i)) { hit = true; share.set(c, (share.get(c) || 0) + cellW(i)); }
          if (hit) covered += cellW(i);
        }
        covered /= opt.cellsW;
        for (const [c, w] of share) if ((opt.anyOwner || w >= 0.5 * opt.cellsW) && (!owner || w > share.get(owner))) owner = c;
        if (opt.same) for (const c of act) if (opt.same(c.name) && (!owner || !opt.same(owner.name) || (share.get(c) || 0) > (share.get(owner) || 0))) owner = c;
      }
      let member = null;
      if (opt.member && act.length) {
        let top = null, best = 0;
        for (const c of act) { const w = share && share.get(c) || 0; if (w > best) { best = w; top = c; } }
        if (top && opt.member(top, best / opt.cellsW, s)) { member = top; owner = null; }
      }
      const d = member ? subtract(polys, act.filter((c) => c !== member).map((c) => c.polys)) : opt.drop && covered >= opt.drop ? (opt.whole && (1 - covered) * opt.whole >= BIG_REST_KM2 ? subtract(polys, act.map((c) => c.polys)).filter(bigPiece) : []) : subtract(polys, act.map((c) => c.polys));
      r = { polys: d, owner, member, text: JSON.stringify(d) + "|" + (owner ? owner.uid : "") + "|" + (member ? member.uid : "") };
      memo.set(key, r);
    }
    const prev = res[res.length - 1];
    if (prev && prev.text === r.text) prev.last = e; else res.push({ first: s, last: e, polys: r.polys, owner: r.owner, member: r.member, text: r.text });
  });
  res.forEach((r) => { delete r.text; });
  return res;
}
const MIN_KM2 = 1500, MIN_WIDTH_KM = 25, OWN_KM2 = 20, OWN_WIDTH_KM = 4, SLIVER_KM2 = 300, SLIVER_WIDTH_KM = 8;
const BIG_REST_KM2 = 20000, PIECE_KM2 = 5000, PIECE_WIDTH_KM = 40;
const bigPiece = (p) => { const a = polyKm2(p); return a >= PIECE_KM2 && (2 * a) / ringKm(p[0]) >= PIECE_WIDTH_KM; };
const ownPiece = (p) => { const a = polyKm2(p); return a >= OWN_KM2 && (2 * a) / ringKm(p[0]) >= OWN_WIDTH_KM; };
const keepRemnant = (polys, whole, maxCovered, wholeWidth = Infinity) => {
  const total = km2Of(polys);
  if (!(whole > 0) || total < whole * (1 - maxCovered)) return [];
  const minA = Math.min(MIN_KM2, 0.3 * whole), minW = Math.min(MIN_WIDTH_KM, 0.6 * wholeWidth);
  return polys.filter((p) => {
    const a = polyKm2(p);
    return a >= whole * 0.6 || (a >= minA && (2 * a) / ringKm(p[0]) >= minW);
  });
};
const widthOf = (polys) => { let a = 0, l = 0; for (const p of polys) { a += polyKm2(p); l += ringKm(p[0]); } return l > 0 ? (2 * a) / l : 0; };
function carve(list, sm) {
  const next = [];
  for (const r of list) {
    if (r.last < sm.first || r.first > sm.last || !boxHit(r.box, sm.box)) { next.push(r); continue; }
    let hit = [];
    try { hit = clip.intersection(r.polys, sm.polys); } catch (e) {}
    if (!hit.length) { next.push(r); continue; }
    const s = Math.max(r.first, sm.first), e = Math.min(r.last, sm.last);
    if (r.first < s) next.push({ ...r, last: s - 1 });
    const polys = subtract(r.polys, [sm.polys]);
    if (polys.length) next.push({ ...r, first: s, last: e, polys });
    if (r.last > e) next.push({ ...r, first: e + 1 });
  }
  return next;
}
let uidNext = 0;
const withBox = (s) => ({ ...s, uid: uidNext++, box: boxOf(s.polys), cells: cellsOf(s.polys) });
const cellOpt = (polys, drop) => { const cells = cellsOf(polys); return { cells, cellsW: cellSum(cells), drop }; };

const CLIO_NAME = {
  "Holy Roman Empire Minor States": "Holy Roman Empire",
  "Old Kingdom of Norway": "Kingdom of Norway",
  "Kingdom of Hawaï'i": "Kingdom of Hawaii",
  "Free Orange State": "Orange Free State",
  "Principality of Regensberg": "Principality of Regensburg",
  "People's Republic of Zanzibar": "Sultanate of Zanzibar",
  "Hashemite Arab Federation": "Arab Iraq",
  "Napoleonic Batavia Republic": "Dutch Cape Colony",
  "Livonian Conference": "Livonian Confederation",
  "Kingdom of Monaco": "Principality of Monaco",
  "United States of America": "United States"
};
const CLIO_RENAME = [[1801, 9999, "Kingdom of Great Britain", "United Kingdom"]];
const CLIO_WIKI = {
  "United Kingdom": "United Kingdom of Great Britain and Ireland", "Livonian Confederation": "Livonian Confederation",
  "Sultanate of Zanzibar": "Sultanate of Zanzibar", "Dutch Cape Colony": "Dutch Cape Colony", "Arab Iraq": "Arab Iraq",
  "Kingdom of Pajana": "", "Sultanate of Sambaliung": "", "Holy Roman Empire": "Holy Roman Empire", "Kingdom of Hawaii": "Hawaiian Kingdom"
};
const CLIO_DROP = new Set(["Principality of Monaco", "Kingdom of Monaco", "Principality of Liechtenstein", "Republic of San Marino", "Principality of Andorra", "Isle of Man"]);
const CLIO_HEAD = { "(Spanish Empire)": "Kingdom of Spain", "(Portuguese Empire)": "Kingdom of Portugal", "(British Empire)": "Kingdom of Great Britain" };
const CLIO_PART = new Set(["(Holy Roman Empire)", "(Kalmar Union)", "(Delhi Sultanate)", "(Polish-Lithuania Kingdom)"]);
const clioName = (raw, y) => {
  let n = (CLIO_NAME[raw] || raw).replace(/\s*\([^)]*\)/g, "").trim().replace(/ Dynasty$/, " dynasty");
  for (const [a, b, from, to] of CLIO_RENAME) if (n === from && y >= a && y < b) n = to;
  return n;
};
const clioWiki = (name, raw) => {
  if (name in CLIO_WIKI) return CLIO_WIKI[name] || name;
  return raw && !/^[a-z]+\.wikipedia/.test(raw) ? raw : name;
};

const clioRaw = existsSync(clioPath) ? JSON.parse(readFileSync(clioPath, "utf8")).features.filter((f) => f.geometry && f.properties.ToYear >= DATED_FROM) : null;
if (!clioRaw) throw new Error("Cliopatria not found: " + clioPath);
const clioRows = clioRaw.map((f) => ({ ...f.properties, geometry: f.geometry }));
clioRaw.length = 0;
const clioHeadAt = (group, y) => {
  if (CLIO_PART.has(group)) return null;
  if (CLIO_HEAD[group]) return CLIO_HEAD[group];
  const n = group.slice(1, -1);
  return clioRows.some((r) => r.Name === n && r.FromYear <= y && y <= r.ToYear) ? n : null;
};
const vassalOf = new Map();
for (const r of clioRows) {
  const m = /^\(Vassalage of (.+) to (.+)\)$/.exec(r.Name);
  if (m) { if (!vassalOf.has(m[1])) vassalOf.set(m[1], []); vassalOf.get(m[1]).push([r.FromYear, r.ToYear, m[2]]); }
}
const clioSpans = [];
{
  const byKey = new Map();
  for (const r of clioRows) {
    if (r.Name.startsWith("(") || CLIO_DROP.has(r.Name)) continue;
    const mid = Math.floor((Math.max(r.FromYear, DATED_FROM) + r.ToYear) / 2);
    let ruler = "", part = "";
    for (const g of String(r.MemberOf || "").split(/[;,]/).map((x) => x.trim()).filter(Boolean)) {
      const head = clioHeadAt(g, mid);
      if (head && head !== r.Name) { if (!ruler) ruler = head; }
      else if (CLIO_PART.has(g) && g.slice(1, -1) !== r.Name && !part) part = clioName(g.slice(1, -1), mid);
    }
    for (const [a, b, y] of vassalOf.get(r.Name) || []) if (a <= mid && mid <= b) ruler = y;
    const geoKey = JSON.stringify(r.geometry.coordinates);
    const bounds = [r.FromYear, ...CLIO_RENAME.filter(([a, , from]) => from === r.Name && a > r.FromYear && a <= r.ToYear).map(([a]) => a)];
    bounds.forEach((a, k) => {
      const b = k + 1 < bounds.length ? bounds[k + 1] - 1 : r.ToYear;
      const name = clioName(r.Name, a);
      const span = { name, ruler: ruler ? clioName(ruler, a) : "", part: part && part !== name ? part : "", people: 0, b: 2, status: ruler ? 5 : 0, first: a, last: b, polys: rewind(polysOf(r.geometry)), wiki: clioWiki(name, r.Wikipedia), src: "clio", geoKey };
      const key = name + "|" + span.ruler + "|" + span.part;
      const prev = byKey.get(key);
      if (prev && prev.last + 1 === a && prev.geoKey === geoKey) { prev.last = b; return; }
      byKey.set(key, span);
      clioSpans.push(span);
    });
  }
  clioSpans.forEach((s) => { delete s.geoKey; });
}
clioRows.length = 0;

const WELLINGTON = [174.78, -41.29], BUENOS_AIRES = [-58.38, -34.6], WASHINGTON = [-77.04, 38.9];
const LONDON = [-0.12, 51.5], LISBON = [-9.14, 38.72], COPENHAGEN = [12.57, 55.68], BERGEN = [5.32, 60.39], OSLO = [10.75, 59.91];
const TOKYO = [139.7, 35.7], BERLIN = [13.4, 52.52], TURIN = [7.68, 45.07], PARIS = [2.35, 48.86], ISTANBUL = [28.98, 41.01];
const UMBRELLA = /confederation|holy roman empire|\bunion\b|confederacy|\bleague\b|haudenosaunee/i, UMBRELLA_YEARS = 15, TWIN_YEARS = 60;
const HB_STALE = { "New Amsterdam": 1664, "Dutch Brazil": 1654, "Dutch Formosa": 1662, "Post-Ming Warlords": 1681, "Guanches": 1496, "Greece": 1831 };
const REGIMES = {
  france: { from: 1200, names: ["France", "Kingdom of France", "French First Republic", "French Directory", "French Consulate", "First French Empire", "Bourbon Kingdom of France", "French Second Republic", "Second French Empire", "French Third Republic", "French Republic", "French Empire"], rulers: ["New France", "First French colonial empire"], eras: [[1791, "Kingdom of France"], [1795, "French First Republic"], [1799, "French Directory"], [1804, "French Consulate"], [1814, "First French Empire"], [1847, "Bourbon Kingdom of France"], [1852, "French Second Republic"], [1870, "Second French Empire"], [9999, "French Third Republic"]] },
  britain: { from: 1200, names: ["England", "Kingdom of England", "Commonwealth of England", "Great Britain", "Kingdom of Great Britain", "United Kingdom", "United Kingdom of Great Britain and Ireland"], rulers: ["UK", "GB", "British Colonial Empire", "British Empire", "British Cape Colony", "English Colonial Empire"], eras: [[1648, "Kingdom of England"], [1659, "Commonwealth of England"], [1706, "Kingdom of England"], [1800, "Kingdom of Great Britain"], [9999, "United Kingdom"]] },
  netherlands: { from: 1581, names: ["Dutch Republic", "United Provinces", "Batavian Republic", "Kingdom of Holland", "Sovereign Principality of the United Netherlands", "United Kingdom of Netherlands", "United Kingdom of the Netherlands", "Netherlands"], rulers: ["Netherlands Antilles", "Dutch Cape Colony"], eras: [[1794, "Dutch Republic"], [1805, "Batavian Republic"], [1809, "Kingdom of Holland"], [1813, "First French Empire"], [1814, "Sovereign Principality of the United Netherlands"], [9999, "Netherlands"]] },
  spain: { from: 1516, names: ["Spain", "Kingdom of Spain", "First Spanish Republic"], rulers: ["Spanish Empire", "Spanish Habsburg", "Habsburg Spain"], eras: [[1872, "Kingdom of Spain"], [1874, "First Spanish Republic"], [9999, "Kingdom of Spain"]] },
  portugal: { from: 1200, names: ["Portugal", "Kingdom of Portugal"], rulers: [], eras: [[9999, "Kingdom of Portugal"]] },
  austria: { from: 1487, names: ["Habsburg Monarchy", "Austrian Empire", "Austria-Hungary", "Austro-Hungarian Empire"], rulers: [], eras: [[1803, "Habsburg Monarchy"], [1867, "Austrian Empire"], [9999, "Austria-Hungary"]] },
  denmark: { from: 1468, names: ["Denmark-Norway", "Kingdom of Denmark", "Denmark"], rulers: [], eras: [[1813, "Denmark-Norway"], [9999, "Kingdom of Denmark"]] },
  russia: { from: 1400, names: ["Grand Principality of Moscow", "Grand Duchy of Moscow", "Tsardom of Muscovy", "Tsardom of Russia", "Russian Empire"], rulers: ["Russia"], eras: [[1546, "Grand Principality of Moscow"], [1720, "Tsardom of Russia"], [9999, "Russian Empire"]] },
  sweden: { from: 1612, names: ["Swedish Empire", "Kingdom of Sweden"], rulers: [], eras: [[1720, "Swedish Empire"], [1814, "Kingdom of Sweden"], [9999, "United Kingdoms of Sweden and Norway"]] }
};
const REGIME_WIKI = { "United Kingdom": "United Kingdom of Great Britain and Ireland", "Kingdom of Denmark": "Denmark", "Netherlands": "Netherlands" };
const EUROPE = [-12, 35, 32, 72], AMERICAS = [-170, -60, -30, 75], NEW_ENGLAND = [-90, 24, -60, 50], INDIA = [60, 0, 100, 36], GUIANA = [-62, 0, -50, 10], CARIBBEAN = [-90, 9, -59, 24];
const NAME_FIX = [
  ["Mongol Empire", "Mongols", 1200, 1205, { people: 1, wiki: "Mongols" }],
  ["Tibetans", "Tibetans", 1200, 1249, { people: 1 }],
  ["Tibet", "Tibet", 1294, 1353, { ruler: "Yuan dynasty", wiki: "Tibet under Yuan rule" }],
  ["Tibet", "Phagmodrupa dynasty", 1354, 1401, { ruler: "" }],
  ["Great Seljuk Empire", "Khwarazmian Empire", 1200, 1201],
  ["Great Seljuk Empire", "Sultanate of Rum", 1202, 1399, { ruler: "" }],
  ["Seljuk Caliphate", "Sultanate of Rum", 1200, 1307, { ruler: "" }],
  ["Seljuk Caliphate", "Ilkhanate", 1308, 1334, { ruler: "" }],
  ["Seljuk Caliphate", "Eretnids", 1335, 1399, { ruler: "" }],
  ["Khwarezmid Empire", "Khwarazmian Empire", 1200, 1399],
  ["Khwarezmid dynasty", "Khwarazmian Empire", 1200, 1399],
  ["Khwarazmian dynasty", "Khwarazmian Empire", 1200, 1399],
  ["Hamdanid Emirates", "Saltukids", 1200, 1201],
  ["Hamdanid Emirates", "Eldiguzids", 1202, 1209],
  ["Hamdanid Emirates", "Khwarazmian Empire", 1210, 1215],
  ["Hamdanid Emirates", "Ayyubid Sultanate", 1216, 1219],
  ["Hamdanid Emirates", "Mongol Empire", 1220, 1249],
  ["Hamdanid Emirates", "Uyunid Emirate", 1250, 1259],
  ["Buwayhid Emirates", "Uyunid Emirate", 1200, 1399],
  ["Buyid dynasty", "", 1200, 1399, { drop: 1 }],
  ["Ghaznavid Empire", "", 1200, 1399, { drop: 1 }],
  ["Bhutan", "", 1200, 1399, { drop: 1 }],
  ["Kediri", "", 1240, 1499, { drop: 1 }],
  ["Mahdids", "Nabhani dynasty", 1200, 1499],
  ["Sind-Habbari dynasty", "Soomra dynasty", 1200, 1351],
  ["Ngô dynasty", "Lý dynasty", 1200, 1225],
  ["Ngô dynasty", "Trần dynasty", 1226, 1399],
  ["Đại Việt", "Trần dynasty", 1200, 1399],
  ["Halych-Volhynia occupation", "Cumania", 1200, 1240, { wiki: "Cumania" }],
  ["Cuman Khanates", "Cumania", 1200, 1240, { wiki: "Cumania" }],
  ["Kara-Khitans", "Qara Khitai", 1200, 1220, { wiki: "Qara Khitai" }],
  ["Kara Khitai Khaganate", "Qara Khitai", 1200, 1220, { wiki: "Qara Khitai" }],
  ["Volga Bulgars", "Volga Bulgaria", 1200, 1240],
  ["Great Khanate", "Jurchens", 1200, 1399, { box: [115, 38, 150, 62], people: 1, ruler: "", part: "", wiki: "Jurchen people" }],
  ["Great Khanate", "Northern Yuan", 1368, 1399],
  ["Novgorod", "Novgorod Republic", 1200, 1399, { ruler: "" }],
  ["Ryazan", "Principality of Ryazan", 1200, 1399],
  ["Teutonic Knights", "Teutonic Order", 1200, 1399],
  ["Castilla", "Kingdom of Castile", 1200, 1229],
  ["Castilla", "Crown of Castile", 1230, 1399],
  ["Aragón", "Crown of Aragon", 1200, 1399],
  ["Britany", "Duchy of Brittany", 1200, 1399],
  ["Burgandy", "Kingdom of Arles", 1200, 1399],
  ["Sicily", "Kingdom of Sicily", 1200, 1399],
  ["Duchy of Benevento", "Kingdom of Sicily", 1200, 1281],
  ["Moldova", "Principality of Moldavia", 1200, 1399],
  ["Kingdom of Alba", "Kingdom of Scotland", 1200, 1399],
  ["Brythons", "Lordship of Galloway", 1200, 1234],
  ["Brythons", "Kingdom of Scotland", 1235, 1399],
  ["Celtic kingdoms", "Gaelic Ireland", 1200, 1399],
  ["Viking settlements", "Lordship of Ireland", 1200, 1271, { box: [-11, 51, -5, 56], ruler: "Kingdom of England" }],
  ["Viking settlements", "Norse Greenland", 1200, 1399, { box: [-75, 58, -20, 84] }],
  ["Viking settlements", "Kingdom of Norway", 1200, 1399, { box: [4, 57, 32, 72] }],
  ["Viking settlements", "Kingdom of Norway", 1200, 1399],
  ["Kievan Rus'", "Principality of Kiev", 1200, 1240],
  ["Pagan", "Pagan Kingdom", 1200, 1297],
  ["Harapunchai", "Haripuñjaya", 1200, 1399],
  ["Ceylon", "Kingdom of Dambadeniya", 1200, 1292],
  ["Ceylon", "Kingdom of Kurunegala", 1293, 1340],
  ["Ceylon", "Kingdom of Gampola", 1341, 1411],
  ["Ceylon", "Kingdom of Kotte", 1412, 1506],
  ["East Java", "Kediri Kingdom", 1200, 1221],
  ["East Java", "Singhasari", 1222, 1292],
  ["Gahadavala dynasty", "Ghurid dynasty", 1200, 1205],
  ["Chauhan dynasty", "Ghurid dynasty", 1200, 1205],
  ["Puebloans - Aztec Regional System", "Ancestral Puebloans", 1200, 1399, { people: 1, wiki: "Ancestral Puebloans" }],
  ["Luxembourg", "Spanish Netherlands", 1556, 1713, { ruler: "Kingdom of Spain" }],
  ["Luxembourg", "Austrian Netherlands", 1714, 1794, { ruler: "Habsburg Monarchy" }],
  ["Croatia", "Kingdom of Croatia", 1200, 1399, { ruler: "Kingdom of Hungary", wiki: "Kingdom of Croatia (1102–1526)" }],
  ["Corsica", "Corsica", 1200, 1284, { ruler: "Republic of Pisa" }],
  ["Corsica", "Corsica", 1285, 1399, { ruler: "Republic of Genoa" }],
  ["Hainan", "Southern Song", 1200, 1278],
  ["Hainan", "Yuan dynasty", 1279, 1367],
  ["Hainan", "Ming dynasty", 1368, 1499],
  ["Yemen", "Ayyubid Sultanate", 1200, 1228],
  ["Yemen", "Rasulid dynasty", 1229, 1399],
  ["Ifat", "Sultanate of Showa", 1200, 1284],
  ["Shoa", "Sultanate of Showa", 1200, 1284],
  ["Ifat", "Ifat Sultanate", 1285, 1414],
  ["Shoa", "Ifat Sultanate", 1285, 1414],
  ["Ethiopia", "Zagwe dynasty", 1200, 1270],
  ["Ethiopia", "Ethiopian Empire", 1271, 1399],
  ["Kanem", "Empire of Kanem", 1200, 1399],
  ["Srivijaya", "Dharmasraya", 1286, 1399],
  ["Srivijaya Empire", "Dharmasraya", 1200, 1399],
  ["Pandya state", "Tughlaq dynasty", 1200, 1334],
  ["Pandya state", "Madurai Sultanate", 1335, 1378],
  ["Chola Empire", "Pandya Empire", 1280, 1310],
  ["Chola Empire", "Sambuvarayar", 1311, 1360],
  ["Chola Empire", "Vijayanagara Empire", 1361, 1499],
  ["Orissa", "Eastern Ganga Kingdom", 1200, 1434],
  ["Orissa", "Gajapati Kingdom", 1435, 1499],
  ["Sultanate of Delhi", "Ghurid dynasty", 1200, 1209],
  ["Sultanate of Delhi", "Mamluk dynasty", 1210, 1293, { wiki: "Mamluk dynasty (Delhi)" }],
  ["Sultanate of Delhi", "Khalji dynasty", 1294, 1325],
  ["Sultanate of Delhi", "Tughlaq dynasty", 1326, 1413],
  ["Toltec Empire", "Mesoamerican city-states and chiefdoms", 1200, 1399],
  ["Classic Veracruz Culture", "Mesoamerican city-states and chiefdoms", 1200, 1399],
  ["Huari Empire", "Andean states and chiefdoms", 1200, 1399],
  ["Tiahuanaco Empire", "Andean states and chiefdoms", 1200, 1399],
  ["Zapotec Empire", "Zapotec city-states", 1200, 1399, { wiki: "Zapotec civilization" }],
  ["Mixtec Empire", "Mixtec city-states", 1200, 1399, { wiki: "Mixtec" }],
  ["Cuzco", "Kingdom of Cusco", 1200, 1437],
  ["Islamic city-states", "Sultanate of Mogadishu", 1200, 1399, { box: [40, -2, 52, 12] }],
  ["Abdelouadides", "Zayyanid dynasty", 1200, 1399],
  ["Hafsid Caliphate", "Hafsid dynasty", 1200, 1399],
  ["Pyu state", "Pagan Kingdom", 1200, 1287],
  ["Mon state", "Pagan Kingdom", 1200, 1287],
  ["Bagan", "Pagan Kingdom", 1200, 1297],
  ["Pagan", "Myinsaing Kingdom", 1298, 1312],
  ["Pagan", "Kingdom of Pinya", 1313, 1364],
  ["Pagan", "Ava Kingdom", 1365, 1428],
  ["Luva", "Lavo Kingdom", 1200, 1399],
  ["Makkura", "Makuria", 1200, 1399],
  ["Great Zimbabwe", "Kingdom of Zimbabwe", 1200, 1399],
  ["Benin", "Kingdom of Benin", 1200, 1399],
  ["Chámpa", "Champa", 1200, 1399],
  ["Nepal", "Nepal Mandala", 1200, 1399, { wiki: "Malla dynasty (Nepal)" }],
  ["Chimu Empire", "Chimú Empire", 1200, 1399],
  ["Maori", "Māori", 1200, 1399],
  ["Merina Kingdom", "Malagasy", 1200, 1539, { people: 1, wiki: "Malagasy people" }],
  ["Madagascar", "Malagasy", 1200, 1539, { people: 1, wiki: "Malagasy people" }],
  ["Malays", "Malays", 1200, 1399, { people: 1, wiki: "Malays (ethnic group)" }],
  ["Ibadites", "Ibadites", 1200, 1399, { people: 1, wiki: "Mozabites" }],
  ["Boethuk", "Beothuk", 1200, 1399, { people: 1 }],
  ["Beothuk", "Beothuk", 1200, 1399, { people: 1 }],
  ["Samis", "Sámi", 1200, 1399, { people: 1 }],
  ["Ainus", "Ainu", 1200, 1399, { people: 1 }],
  ["Touareg", "Tuaregs", 1200, 1399, { people: 1 }],
  ["Tuareg Nomadic Tribes", "Tuaregs", 1200, 1399, { people: 1 }],
  ["Taino", "Taíno", 1200, 1399, { people: 1 }],
  ["Guanahatabeyes", "Guanahatabey", 1200, 1399, { people: 1 }],
  ["Kalinago", "Kalinago", 1200, 1399, { people: 1 }],
  ["Arawaks", "Arawaks", 1200, 1399, { people: 1 }],
  ["Innu", "Innu", 1200, 1399, { people: 1 }],
  ["Shuar", "Shuar", 1200, 1399, { people: 1 }],
  ["Guanches", "Guanches", 1200, 1399, { people: 1 }],
  ["Serbs", "Revolutionary Serbia", 1804, 1813],
  ["Serbs", "Principality of Serbia", 1815, 1881],
  ["Serbs", "Kingdom of Serbia", 1882, 1885],
  ["Kingdom of Serbia", "Principality of Serbia", 1815, 1881],
  ["First Hellenic Republic", "Kingdom of Greece", 1832, 1885],
  ["Greece", "First Hellenic Republic", 1822, 1831],
  ["Greece", "Kingdom of Greece", 1832, 1885],
  ["United Principalities of Moldavia and Wallachia", "Principality of Romania", 1866, 1880, { wiki: "United Principalities" }],
  ["United Principalities of Moldavia and Wallachia", "Kingdom of Romania", 1881, 1885],
  ["Montenegro", "Prince-Bishopric of Montenegro", 1516, 1851],
  ["Montenegro", "Principality of Montenegro", 1852, 1885],
  ["Bosnia-Herzegovina", "Bosnia Eyalet", 1400, 1866, { ruler: "Ottoman Empire" }],
  ["Bosnia-Herzegovina", "Bosnia Vilayet", 1867, 1877, { ruler: "Ottoman Empire" }],
  ["Bosnia-Herzegovina", "Bosnia and Herzegovina", 1878, 1885, { ruler: "Austria-Hungary", wiki: "Bosnia and Herzegovina under Austro-Hungarian rule" }],
  ["Moldova", "Principality of Moldavia", 1400, 1858],
  ["Serbian Empire", "Serbian Despotate", 1400, 1459],
  ["Serbian Despots", "Serbian Despotate", 1400, 1459],
  ["Hungarian Nationalists", "Hungarian State", 1848, 1849, { wiki: "Hungarian State (1849)" }],
  ["Hungarian Nationalists", "Austrian Empire", 1850, 1867],
  ["Poles", "Congress Poland", 1815, 1867, { ruler: "Russian Empire" }],
  ["Helvetic Republic", "Swiss Confederation", 1400, 1797],
  ["Helvetic Republic", "Swiss Confederation", 1803, 1885],
  ["Khedivate of Egypt", "Egypt", 1805, 1866, { wiki: "History of Egypt under the Muhammad Ali dynasty" }],
  ["Muhammad Ali dynasty", "Egypt", 1805, 1821, { wiki: "History of Egypt under the Muhammad Ali dynasty" }],
  ["Muhammad Ali dynasty", "Egyptian Sudan", 1822, 1866, { ruler: "Egypt", wiki: "Turkiyya" }],
  ["British Africa", "Khedivate of Egypt", 1882, 1885, { box: [20, 5, 40, 33], ruler: "United Kingdom" }],
  ["Harer (Egypt)", "Emirate of Harar", 1647, 1874, { ruler: "" }],
  ["Harer (Egypt)", "Emirate of Harar", 1875, 1885, { ruler: "Khedivate of Egypt" }],
  ["Algeria (FR)", "French Algeria", 1830, 1885],
  ["French Africa", "French Algeria", 1830, 1885, { box: [-2.5, 28, 9.5, 37.5] }],
  ["Senegal (FR)", "French Senegal", 1659, 1885, { ruler: "@france", wiki: "History of Senegal" }],
  ["Gold Coast (GB)", "British Gold Coast", 1400, 1885, { ruler: "@britain" }],
  ["Sultinate of Zanzibar", "Zanzibar", 1400, 1855, { ruler: "Sultanate of Oman" }],
  ["Sultinate of Zanzibar", "Sultanate of Zanzibar", 1856, 1885, { ruler: "" }],
  ["Omani Slave Coast", "Zanzibar", 1400, 1855, { ruler: "Sultanate of Oman" }],
  ["Omani Slave Coast", "Sultanate of Zanzibar", 1856, 1885, { ruler: "" }],
  ["Zanzibar", "Zanzibar", 1698, 1855, { ruler: "Sultanate of Oman", wiki: "Omani Empire" }],
  ["Zanzibar", "Sultanate of Zanzibar", 1856, 1885, { ruler: "" }],
  ["Tukular Caliphate", "Toucouleur Empire", 1400, 1885],
  ["Natalia Republic", "Colony of Natal", 1843, 1885, { ruler: "@britain" }],
  ["Papua New Guinea", "Papuans", 1400, 1885, { people: 1, ruler: "", wiki: "Papuan people" }],
  ["Benin", "Kingdom of Benin", 1400, 1885],
  ["Oyo", "Oyo Empire", 1400, 1835],
  ["Great Zimbabwe", "Kingdom of Zimbabwe", 1400, 1885],
  ["Mwenemutapa", "Kingdom of Mutapa", 1400, 1885],
  ["Makkura", "Makuria", 1400, 1885],
  ["Makuria Kingdom", "Makuria", 1400, 1885],
  ["Adal", "Adal Sultanate", 1400, 1577],
  ["Adal", "Imamate of Aussa", 1578, 1885],
  ["Awsa", "Imamate of Aussa", 1400, 1733],
  ["Awsa", "Sultanate of Aussa", 1734, 1885],
  ["Great Khanate", "Jurchens", 1400, 1462, { box: [115, 38, 150, 62], people: 1, ruler: "", part: "", wiki: "Jurchen people" }],
  ["Mongol Khanate", "Northern Yuan", 1400, 1635],
  ["Golden Horde", "Great Horde", 1466, 1502, { box: [30, 40, 85, 62] }],
  ["Golden Horde", "Astrakhan Khanate", 1503, 1556, { box: [30, 40, 85, 62] }],
  ["Golden Horde", "Mongols", 1503, 1691, { box: [85, 35, 130, 62], people: 1, ruler: "", wiki: "Mongols" }],
  ["Golden Horde", "Khalkha", 1692, 1885, { box: [85, 35, 130, 62], ruler: "Qing dynasty", wiki: "Khalkha Mongols" }],
  ["Astrakhan Khanate", "@russia", 1557, 1885],
  ["Khanate of Sibir", "Tyumen Khanate", 1400, 1489],
  ["Nogai Horde", "Nogais", 1635, 1885, { people: 1, ruler: "", wiki: "Nogais" }],
  ["Dzungar Khanate", "Oirat Confederation", 1400, 1633],
  ["Ming dynasty", "Southern Ming", 1645, 1662],
  ["Southern Ming", "Kingdom of Tungning", 1661, 1683, { box: [118.5, 21, 123, 26.5] }],
  ["Southern Ming", "Three Feudatories", 1673, 1681, { wiki: "Revolt of the Three Feudatories" }],
  ["Southern Ming", "Qing dynasty", 1663, 1885],
  ["Mughal Empire", "Timurid Empire", 1400, 1525],
  ["Mughal Empire", "British Raj", 1858, 1885, { ruler: "@britain" }],
  ["Lodi dynasty", "Mughal Empire", 1527, 1885],
  ["Sur Empire", "Mughal Empire", 1557, 1885],
  ["Sultanate of Bengal", "Bengal Subah", 1577, 1885, { ruler: "Mughal Empire" }],
  ["Ahmadnagar Sultanate", "Mughal Empire", 1637, 1885],
  ["Bidar Sultanate", "Bijapur Sultanate", 1620, 1885],
  ["Berar Sultanate", "Ahmadnagar Sultanate", 1575, 1885],
  ["Maratha Empire", "Maratha states", 1819, 1885, { ruler: "@britain", wiki: "Maratha Confederacy" }],
  ["Safavid dynasty", "Afsharid Iran", 1736, 1885],
  ["Afsharid Iran", "Safavid Iran", 1400, 1735],
  ["Aq Qoyunlu", "Safavid Iran", 1504, 1885],
  ["Rasulid dynasty", "Tahirid Sultanate", 1455, 1885],
  ["Kingdom of Georgia", "Kingdom of Kartli", 1491, 1761],
  ["Kingdom of Georgia", "Kingdom of Kartli-Kakheti", 1762, 1800],
  ["Kingdom of Georgia", "@russia", 1801, 1885],
  ["Byzantine Empire", "Principality of Theodoro", 1454, 1475, { box: [32, 43, 37, 46] }],
  ["Byzantine Empire", "Despotate of the Morea", 1454, 1460],
  ["Byzantine Empire", "Ottoman Empire", 1461, 1885],
  ["Hanthawaddy Kingdom", "First Toungoo Empire", 1540, 1885],
  ["Konbaung dynasty", "First Toungoo Empire", 1400, 1751],
  ["First Toungoo Empire", "Burma", 1752, 1885, { wiki: "Konbaung dynasty" }],
  ["Nguyễn dynasty", "Nguyễn lords", 1400, 1801],
  ["Warring States Japan", "Japan", 1590, 1602, { wiki: "Azuchi–Momoyama period" }],
  ["Tokugawa Shogunate", "Japan", 1400, 1602, { wiki: "Azuchi–Momoyama period" }],
  ["Tokugawa Shogunate", "Empire of Japan", 1868, 1885],
  ["Sultanate of Malacca", "Portuguese Malacca", 1511, 1640, { ruler: "@portugal" }],
  ["Sultanate of Malacca", "Dutch Malacca", 1641, 1824, { ruler: "@netherlands" }],
  ["Sultanate of Malacca", "Straits Settlements", 1825, 1885, { ruler: "@britain" }],
  ["Inca Empire", "Neo-Inca State", 1534, 1572],
  ["Inca Empire", "Spanish Empire", 1573, 1885, { ruler: "@spain" }],
  ["Songhai Empire", "Dendi Kingdom", 1592, 1885],
  ["Songhai", "Dendi Kingdom", 1592, 1885],
  ["Regency of Algiers", "Emirate of Abdelkader", 1831, 1847],
  ["Saadi Sultanate", "Morocco", 1660, 1885, { wiki: "Alaouite dynasty" }],
  ["Brandenburg-Prussia", "Kingdom of Prussia", 1701, 1885],
  ["Kingdom of Hanover", "Electorate of Hanover", 1400, 1813],
  ["United Kingdom", "Kingdom of Hanover", 1814, 1866, { box: [6.5, 51, 12, 54], ruler: "" }],
  ["Gran Colombia", "Republic of New Granada", 1831, 1885],
  ["Federated Republic of Mexico", "Centralist Mexico", 1835, 1846],
  ["Federated Republic of Mexico", "Second Mexican Empire", 1864, 1867],
  ["Federated Republic of Mexico", "Mexico", 1868, 1885],
  ["Orange Free State", "Orange River Sovereignty", 1848, 1853, { ruler: "@britain" }],
  ["Khanate of Bukhara", "Emirate of Bukhara", 1785, 1885],
  ["Gorkha Kingdom", "Kingdom of Nepal", 1768, 1885],
  ["Nepal", "Nepal Mandala", 1400, 1767, { wiki: "Malla dynasty (Nepal)" }],
  ["Nepal", "Kingdom of Nepal", 1768, 1885],
  ["Chagatai Khanate", "Moghulistan", 1400, 1515],
  ["Eastern Chagatai Khanate", "Moghulistan", 1400, 1515],
  ["Eastern Moghulistan", "Yarkent Khanate", 1514, 1705],
  ["Bukara Khanate", "Khanate of Bukhara", 1400, 1885],
  ["Bokhara Khanate", "Emirate of Bukhara", 1785, 1885],
  ["Emirate of the White Sheep Turks", "Aq Qoyunlu", 1400, 1885],
  ["Four Oirats", "Oirat Confederation", 1400, 1885],
  ["Laos", "Lan Xang", 1400, 1707],
  ["Chámpa", "Champa", 1400, 1885],
  ["Lan Na", "Lan Na Kingdom", 1400, 1885],
  ["Vijayanagara", "Vijayanagara Empire", 1400, 1646],
  ["Rajastan", "Rajputana", 1400, 1885],
  ["Rajputs", "Rajputana", 1400, 1885],
  ["Golkonda", "Golconda Sultanate", 1518, 1687],
  ["Ngô dynasty", "Hồ dynasty", 1400, 1407],
  ["Aceh", "Sultanate of Aceh", 1496, 1885],
  ["Khmer Empire", "Kingdom of Cambodia", 1432, 1862, { wiki: "Post-Angkor period" }],
  ["Khmer Empire", "Kingdom of Cambodia", 1863, 1885, { ruler: "@france", wiki: "French protectorate of Cambodia" }],
  ["Cambodia", "Kingdom of Cambodia", 1432, 1862, { wiki: "Post-Angkor period" }],
  ["Konbaung dynasty", "Burma", 1752, 1885, { wiki: "Konbaung dynasty" }],
  ["Burma", "Burma", 1752, 1885, { wiki: "Konbaung dynasty" }],
  ["Qajar dynasty", "Qajar Iran", 1400, 1885],
  ["Safavid dynasty", "Safavid Iran", 1400, 1885],
  ["Rattanakosin Kingdom", "Siam", 1400, 1885, { wiki: "Rattanakosin Kingdom (1782–1932)" }],
  ["Durrani Empire", "Emirate of Afghanistan", 1823, 1885],
  ["Durrani dynasty", "Durrani Empire", 1747, 1822],
  ["Durrani dynasty", "Emirate of Afghanistan", 1823, 1885],
  ["Afghanistan", "Durrani Empire", 1747, 1822],
  ["Afghanistan", "Emirate of Afghanistan", 1823, 1885],
  ["Emirate of Afghanistan", "Durrani Empire", 1747, 1822],
  ["Nejd", "Emirate of Diriyah", 1744, 1818],
  ["Nejd", "Emirate of Nejd", 1824, 1885],
  ["Netherlands Indies", "Dutch East Indies", 1400, 1885],
  ["Oudh", "Oudh State", 1400, 1885],
  ["Nawab of Awadh", "Oudh State", 1400, 1885],
  ["Nizam's Dominions", "Hyderabad State", 1400, 1885],
  ["Sikhs", "Sikh Confederacy", 1748, 1798],
  ["Sikhs", "Sikh Empire", 1799, 1849],
  ["Spanish Empire", "Philippines", 1565, 1885, { box: [115, 0, 130, 22], ruler: "@spain", wiki: "Captaincy General of the Philippines" }],
  ["Kingdom of Spain", "Philippines", 1565, 1885, { box: [115, 0, 130, 22], ruler: "@spain", wiki: "Captaincy General of the Philippines" }],
  ["Kingdom of Spain", "Spanish Empire", 1516, 1885, { box: AMERICAS, ruler: "@spain" }],
  ["Portuguese Empire", "Colonial Brazil", 1500, 1815, { box: [-75, -35, -30, 6], ruler: "@portugal" }],
  ["Portuguese Empire", "Kingdom of Brazil", 1816, 1821, { box: [-75, -35, -30, 6], ruler: "" }],
  ["Viceroyalty of Brazil", "Colonial Brazil", 1500, 1815, { ruler: "@portugal" }],
  ["United States of America", "British America", 1607, 1775, { ruler: "@britain" }],
  ["United States of America", "United States", 1776, 1885, { ruler: "" }],
  ["British Empire", "British America", 1607, 1775, { box: NEW_ENGLAND, ruler: "@britain" }],
  ["British Empire", "British India", 1757, 1858, { box: INDIA, ruler: "@britain", wiki: "Company rule in India" }],
  ["British Empire", "British Guiana", 1400, 1885, { box: GUIANA, ruler: "@britain" }],
  ["British Colonial Empire", "English Colonial Empire", 1400, 1706],
  ["English Colonial Empire", "British Colonial Empire", 1707, 1885],
  ["British Colonial Empire", "British America", 1607, 1783, { box: [-100, 24, -50, 75], ruler: "@britain" }],
  ["British Colonial Empire", "British North America", 1784, 1885, { box: [-140, 40, -50, 75], ruler: "@britain" }],
  ["British Colonial Empire", "Australian colonies", 1788, 1885, { box: [110, -45, 155, -9], ruler: "@britain" }],
  ["Louisiana", "Spanish Louisiana", 1763, 1800, { ruler: "@spain" }],
  ["Louisiana", "Louisiana", 1682, 1762, { ruler: "@france", wiki: "Louisiana (New France)" }],
  ["Sind", "Sindh", 1400, 1885],
  ["Acadian Peninsula (UK)", "Nova Scotia", 1713, 1885, { ruler: "@britain" }],
  ["Luisiana", "Louisiana", 1682, 1762, { ruler: "@france", wiki: "Louisiana (New France)" }],
  ["Luisiana", "Spanish Louisiana", 1763, 1800, { ruler: "@spain" }],
  ["Luisiana", "Louisiana", 1801, 1803, { ruler: "@france", wiki: "Louisiana (New France)" }],
  ["Luisiana", "Louisiana Territory", 1804, 1885, { ruler: "United States" }],
  ["Quebec", "New France", 1534, 1763, { ruler: "@france" }],
  ["Quebec", "Province of Quebec", 1764, 1790, { ruler: "@britain", wiki: "Province of Quebec (1763–1791)" }],
  ["Quebec", "Lower Canada", 1791, 1840, { ruler: "@britain" }],
  ["New France", "Province of Quebec", 1764, 1790, { ruler: "@britain", wiki: "Province of Quebec (1763–1791)" }],
  ["Florida (Spain)", "Spanish Florida", 1513, 1821, { ruler: "@spain" }],
  ["Florida", "Spanish Florida", 1513, 1762, { ruler: "@spain" }],
  ["Guyana (Netherlands)", "Dutch Guiana", 1400, 1885, { ruler: "@netherlands" }],
  ["Netherlands Antilles", "Surinam", 1667, 1885, { box: GUIANA, ruler: "@netherlands", wiki: "Surinam (Dutch colony)" }],
  ["Netherlands Antilles", "Curaçao and Dependencies", 1400, 1885, { box: CARIBBEAN, ruler: "@netherlands" }],
  ["Netherlands", "Dutch Gold Coast", 1400, 1885, { box: [-5, 0, 5, 12], ruler: "@netherlands" }],
  ["Dutch Republic", "Dutch East Indies", 1400, 1885, { box: [90, -15, 145, 10], ruler: "@netherlands" }],
  ["Batavian Republic", "Dutch East Indies", 1400, 1885, { box: [90, -15, 145, 10], ruler: "@netherlands" }],
  ["Dutch Republic", "Dutch Cape Colony", 1652, 1805, { box: [10, -40, 35, -20], ruler: "@netherlands" }],
  ["Dutch Republic", "British Cape Colony", 1806, 1885, { box: [10, -40, 35, -20], ruler: "@britain", wiki: "Cape Colony" }],
  ["Jamaica (UK)", "Jamaica", 1655, 1885, { ruler: "@britain", wiki: "Colony of Jamaica" }],
  ["Saint Kitts and Nevis (UK)", "Saint Kitts and Nevis", 1400, 1885, { ruler: "@britain" }],
  ["Virgin Islands (Danemark)", "Danish West Indies", 1400, 1885, { ruler: "@denmark" }],
  ["Cuba (Spain)", "Cuba", 1400, 1885, { ruler: "@spain", wiki: "Captaincy General of Cuba" }],
  ["Haiti", "Saint-Domingue", 1659, 1803, { ruler: "@france" }],
  ["Empire of Haiti", "Republic of Haiti", 1807, 1848, { wiki: "Republic of Haiti (1820–1849)" }],
  ["Empire of Haiti", "Republic of Haiti", 1859, 1885, { wiki: "History of Haiti" }],
  ["Argentina", "Argentine Confederation", 1831, 1861],
  ["Argentine Confederation", "Argentina", 1862, 1885],
  ["New South Wales (UK)", "New South Wales", 1788, 1885, { ruler: "@britain", wiki: "Colony of New South Wales" }],
  ["Victoria (UK)", "New South Wales", 1788, 1850, { ruler: "@britain", wiki: "Colony of New South Wales" }],
  ["Victoria (UK)", "Victoria", 1851, 1885, { ruler: "@britain", wiki: "Colony of Victoria" }],
  ["Queensland (UK)", "New South Wales", 1788, 1858, { ruler: "@britain", wiki: "Colony of New South Wales" }],
  ["Queensland (UK)", "Queensland", 1859, 1885, { ruler: "@britain", wiki: "Colony of Queensland" }],
  ["Northern Territory (UK)", "New South Wales", 1825, 1862, { ruler: "@britain", wiki: "Colony of New South Wales" }],
  ["Northern Territory (UK)", "Northern Territory", 1863, 1885, { ruler: "@britain", wiki: "History of the Northern Territory" }],
  ["South Australia (UK)", "South Australia", 1836, 1885, { ruler: "@britain", wiki: "Colony of South Australia" }],
  ["Western Australia (UK)", "Western Australia", 1829, 1885, { ruler: "@britain", wiki: "Swan River Colony" }],
  ["Britany", "Duchy of Brittany", 1400, 1491],
  ["Britany", "Duchy of Brittany", 1492, 1532, { ruler: "@france" }],
  ["Britany", "@france", 1533, 1885],
  ["Duchy of Brittany", "Duchy of Brittany", 1492, 1532, { ruler: "@france" }],
  ["Scotland", "Kingdom of Scotland", 1400, 1706],
  ["Scotland", "@britain", 1707, 1885],
  ["Kingdom of Scotland", "@britain", 1707, 1885],
  ["Sardinia", "Kingdom of Sardinia", 1400, 1707, { ruler: "@spain" }],
  ["Kingdom of Sardinia", "Kingdom of Sardinia", 1516, 1707, { ruler: "@spain" }],
  ["Kingdom of Sardinia", "Kingdom of Sardinia", 1708, 1716, { ruler: "Habsburg Monarchy" }],
  ["Kingdom of Sardinia", "Kingdom of Sardinia", 1717, 1719, { ruler: "@spain" }],
  ["Kingdom of Sardinia", "Kingdom of Sardinia", 1720, 1885, { ruler: "" }],
  ["Sicily", "Kingdom of Sicily", 1516, 1712, { ruler: "@spain" }],
  ["Sicily", "Kingdom of Sicily", 1713, 1719, { ruler: "Duchy of Savoy" }],
  ["Naples", "Kingdom of Naples", 1504, 1706, { ruler: "@spain" }],
  ["House of Savoy", "Duchy of Savoy", 1416, 1720],
  ["County of Savoy", "Duchy of Savoy", 1416, 1720],
  ["Milano (Austria)", "Duchy of Milan", 1714, 1796, { ruler: "Habsburg Monarchy" }],
  ["Lombardy", "Duchy of Milan", 1714, 1796, { ruler: "Habsburg Monarchy" }],
  ["Austrian Empire", "Austrian Netherlands", 1714, 1794, { box: [2, 49, 7, 52.5], ruler: "Habsburg Monarchy" }],
  ["Austrian Empire", "@france", 1795, 1814, { box: [2, 49, 7, 52.5], ruler: "" }],
  ["Habsburg Netherlands", "Spanish Netherlands", 1556, 1714, { ruler: "@spain" }],
  ["House of Habsburg", "Duchy of Austria", 1400, 1452],
  ["House of Habsburg", "Archduchy of Austria", 1453, 1515],
  ["House of Jagiellon", "Poland-Lithuania", 1400, 1568, { wiki: "Jagiellonian dynasty" }],
  ["House of Oldenburg", "Kingdom of Denmark", 1400, 1885],
  ["House of Valois-Anjou", "Duchy of Anjou", 1400, 1480, { box: [-5, 45, 2.5, 50] }],
  ["House of Valois-Anjou", "County of Provence", 1400, 1481, { box: [3, 42, 9, 46], ruler: "" }],
  ["House of Bourbon", "Duchy of Bourbon", 1400, 1527],
  ["Teutonic Knights", "Livonian Order", 1400, 1561, { box: [20, 55.5, 30, 60.5], part: "Livonian Confederation" }],
  ["Teutonic Knights", "Teutonic Order", 1400, 1524],
  ["Teutonic Knights", "Duchy of Prussia", 1525, 1618],
  ["Teutonic Order", "Duchy of Prussia", 1525, 1618],
  ["Kingdom of Cyprus", "Kingdom of Cyprus", 1489, 1570, { ruler: "Republic of Venice" }],
  ["Ryazan", "Grand Principality of Ryazan", 1400, 1521],
  ["Chimu Empire", "Chimú Empire", 1400, 1885],
  ["Mexihcah (Triple Alliance)", "Aztec Triple Alliance", 1400, 1885],
  ["P’urhépecha", "Purépecha Empire", 1400, 1530],
  ["Michoacán", "Purépecha Empire", 1400, 1530],
  ["Swedish Empire", "Kingdom of Sweden", 1721, 1885],
  ["Duchy of Bavaria", "Electorate of Bavaria", 1623, 1805],
  ["Electorate of Württemberg", "Duchy of Württemberg", 1400, 1802],
  ["Electorate of Baden", "Margraviate of Baden", 1400, 1802],
  ["Republic of Florence", "Duchy of Florence", 1532, 1568],
  ["Republic of Florence", "Grand Duchy of Tuscany", 1569, 1885],
  ["Maori", "Māori", 1400, 1885],
  ["Maoris", "Māori", 1400, 1885],
  ["M?ori", "Māori", 1400, 1885],
  ["minor Hindu and Buddhist kingdoms", "Minor Hindu and Buddhist kingdoms", 1400, 1885],
  ["central Asian khanates", "Central Asian khanates", 1400, 1885]
];
const RULER_DROP = { "Mongol Empire": 1368 };
const regimeName = new Map(), regimeRuler = new Map();
for (const [g, r] of Object.entries(REGIMES)) { r.names.forEach((n) => regimeName.set(n, g)); r.names.concat(r.rulers).forEach((n) => regimeRuler.set(n, g)); }
const regimeAt = (g, y) => { const r = REGIMES[g]; if (y < r.from) return null; for (const [to, n] of r.eras) if (y <= to) return n; return null; };
const renamedFrom = new Map();
const noteRename = (from, to) => { if (!renamedFrom.has(to)) renamedFrom.set(to, new Set()); renamedFrom.get(to).add(from); };
const SMR_CORE = ["San Marino", "Borgo Maggiore", "Acquaviva", "Chiesanuova", "Domagnano"];
const HK_ISLAND = ["Central and Western", "Wan Chai", "Eastern", "Southern"], HK_KOWLOON = ["Yau Tsim Mong", "Sham Shui Po", "Kowloon City", "Wong Tai Sin", "Kwun Tong"];
const SMALL = [
  { name: "Liechtenstein", shape: { c: "LIE" }, periods: [["1719-01-23", "2019-12-31", "state"]] },
  { name: "Monaco", shape: { c: "MCO" }, periods: [["1419-01-01", "1792-12-31", "state"], ["1814-05-30", "1860-12-31", "protectorate", TURIN], ["1861-01-01", "2019-12-31", "state"]] },
  { name: "San Marino", shape: { c: "SMR", n: SMR_CORE }, periods: [["1400-01-01", "1462-12-31", "state"]] },
  { name: "San Marino", shape: { c: "SMR", n: SMR_CORE.concat(["Fiorentino", "Montegiardino", "Serravalle"]) }, periods: [["1463-01-01", "1463-12-31", "state"]] },
  { name: "San Marino", shape: { c: "SMR" }, periods: [["1464-01-01", "2019-12-31", "state"]] },
  { name: "Andorra", shape: { c: "AND" }, periods: [["1400-01-01", "1811-12-31", "state"], ["1814-01-01", "2019-12-31", "state"]] },
  { name: "Vatican City", shape: { c: "VAT" }, periods: [["1929-06-07", "2019-12-31", "state"]] },
  { name: "Isle of Man", shape: { c: "IMN" }, periods: [["1400-01-01", "2019-12-31", "dependency", LONDON]] },
  { name: "Jersey", shape: { c: "JEY" }, periods: [["1400-01-01", "1460-12-31", "dependency", LONDON], ["1461-01-01", "1467-12-31", "occupied", PARIS], ["1468-01-01", "1940-06-30", "dependency", LONDON], ["1940-07-01", "1945-05-08", "occupied", BERLIN], ["1945-05-09", "2019-12-31", "dependency", LONDON]] },
  { name: "Guernsey", shape: { c: "GGY" }, wiki: "Bailiwick of Guernsey", periods: [["1400-01-01", "1940-06-29", "dependency", LONDON], ["1940-06-30", "1945-05-08", "occupied", BERLIN], ["1945-05-09", "2019-12-31", "dependency", LONDON]] },
  { name: "Gibraltar", shape: { c: "GIB" }, periods: [["1704-08-04", "2019-12-31", "colony", LONDON]] },
  { name: "Hong Kong", shape: { c: "HKG", n: HK_ISLAND }, wiki: "British Hong Kong", periods: [["1841-01-26", "1860-10-23", "colony", LONDON]] },
  { name: "Hong Kong", shape: { c: "HKG", n: HK_ISLAND.concat(HK_KOWLOON) }, wiki: "British Hong Kong", periods: [["1860-10-24", "1898-06-30", "colony", LONDON]] },
  { name: "Hong Kong", shape: { c: "HKG" }, wiki: "British Hong Kong", periods: [["1898-07-01", "1941-12-24", "colony", LONDON], ["1941-12-25", "1945-08-29", "occupied", TOKYO], ["1945-08-30", "1997-06-30", "colony", LONDON]] },
  { name: "Macau", shape: { c: "MAC" }, wiki: "Portuguese Macau", periods: [["1557-01-01", "1999-12-19", "colony", LISBON]] },
  { name: "Portuguese India", shape: { n: ["Goa"] }, periods: [["1510-11-25", "1961-12-18", "colony", LISBON]] },
  { name: "Faroe Islands", shape: { c: "FRO" }, periods: [["1400-01-01", "1814-01-13", "dependency", BERGEN], ["1814-01-14", "1940-04-11", "dependency", COPENHAGEN], ["1940-04-12", "1945-09-16", "occupied", LONDON], ["1945-09-17", "2019-12-31", "dependency", COPENHAGEN]] },
  { name: "Bahrain", shape: { c: "BHR" }, wiki: "History of Bahrain (1783–1971)", periods: [["1886-01-01", "1971-08-14", "protectorate", LONDON, "fill"]] },
  { name: "Kuwait", shape: { c: "KWT" }, wiki: "Sheikhdom of Kuwait", periods: [["1899-01-23", "1961-06-18", "protectorate", LONDON, "fill"]] },
  { name: "Qatar", shape: { c: "QAT" }, wiki: "Qatar under Ottoman rule", periods: [["1886-01-01", "1915-12-31", "dependency", ISTANBUL, "fill"]] },
  { name: "Greenland", shape: { c: "GRL" }, periods: [["1721-07-03", "1953-06-04", "colony", COPENHAGEN, "fill"], ["1953-06-05", "2019-12-31", "dependency", COPENHAGEN, "fill"]] },
  { name: "Svalbard", shape: { n: ["Svalbard"] }, periods: [["1925-08-14", "2019-12-31", "dependency", OSLO, "fill"]] },
  { name: "Bermuda", shape: { c: "BMU" }, periods: [["1612-07-11", "2019-12-31", "colony", LONDON, "fill"]] },
  { name: "Samoa", shape: { c: "WSM" }, periods: [["1886-01-01", "1900-02-28", "state", null, "fill"], ["1962-01-01", "2019-12-31", "state", null, "fill"]] },
  { name: "Samoa", shape: { c: "ASM" }, periods: [["1886-01-01", "1900-04-16", "state", null, "fill"]] },
  { name: "American Samoa", shape: { c: "ASM" }, periods: [["1900-04-17", "2019-12-31", "dependency", WASHINGTON, "fill"]] },
  { name: "Ottoman Empire", shape: { c: "SAU", n: ["Tabuk", "Al Madinah", "Makkah", "Al Bahah"] }, periods: [["1886-01-01", "1916-06-09", "state", null, "fill"]] },
  { name: "Kingdom of Hejaz", shape: { c: "SAU", n: ["Tabuk", "Al Madinah", "Makkah", "Al Bahah"] }, periods: [["1916-06-10", "1925-12-19", "state", null, "fill"]] },
  { name: "German Samoa", shape: { c: "WSM" }, periods: [["1900-03-01", "1914-08-29", "colony", BERLIN, "fill"]] },
  { name: "Western Samoa", shape: { c: "WSM" }, wiki: "Western Samoa Trust Territory", periods: [["1914-08-30", "1961-12-31", "mandate", WELLINGTON, "fill"]] },
  { name: "Tonga", shape: { c: "TON" }, periods: [["1886-01-01", "1900-05-17", "state", null, "fill"], ["1900-05-18", "1970-06-03", "protectorate", LONDON, "fill"], ["1970-06-04", "2019-12-31", "state", null, "fill"]] },
  { name: "New Hebrides", shape: { c: "VUT" }, periods: [["1906-10-20", "1980-07-29", "dependency", LONDON, "fill"]] },
  { name: "Vanuatu", shape: { c: "VUT" }, periods: [["1980-07-30", "2019-12-31", "state", null, "fill"]] },
  { name: "Kerguelen Islands", shape: { c: "ATF", n: ["Archipel des Kerguelen"] }, periods: [["1893-01-01", "2019-12-31", "colony", PARIS, "fill"]] },
  { name: "Falkland Islands", shape: { c: "FLK" }, periods: [["1886-01-01", "1982-04-01", "colony", LONDON, "fill"], ["1982-04-02", "1982-06-14", "occupied", BUENOS_AIRES, "fill"], ["1982-06-15", "2019-12-31", "colony", LONDON, "fill"]] },
  { name: "South Georgia", shape: { c: "SGS" }, wiki: "South Georgia and the South Sandwich Islands", periods: [["1886-01-01", "1982-04-02", "colony", LONDON, "fill"], ["1982-04-03", "1982-04-25", "occupied", BUENOS_AIRES, "fill"], ["1982-04-26", "2019-12-31", "colony", LONDON, "fill"]] },
  { name: "German New Guinea", shape: { c: "PNG", n: ["North Solomons"] }, periods: [["1886-01-01", "1914-11-10", "colony", BERLIN, "fill"]] },
  { name: "Soviet Union", shape: { c: "RUS", n: ["Arkhangel'sk", "Krasnoyarsk"], box: [[35, 79.4, 70, 82.5], [88, 77.8, 108, 81.5]] }, periods: [["1926-04-15", "1991-12-25", "state", null, "fill"]] },
  { name: "Russia", shape: { c: "RUS", n: ["Arkhangel'sk", "Krasnoyarsk"], box: [[35, 79.4, 70, 82.5], [88, 77.8, 108, 81.5]] }, periods: [["1991-12-26", "2019-12-31", "state", null, "fill"]] }
];
const SMALL_KEEP_KM2 = 3000;
const SMALL_STATUS = { state: 0, colony: 1, protectorate: 2, mandate: 3, occupied: 4, dependency: 5 };
const neAll = JSON.parse(readFileSync(nePath, "utf8")).features;
const neUnits = neAll.filter((f) => SMALL.some((s) => (!s.shape.c || s.shape.c === f.properties.adm0_a3) && (!s.shape.n || s.shape.n.includes(f.properties.name))));
const smallShape = (sh) => {
  const feats = neUnits.filter((f) => (!sh.c || f.properties.adm0_a3 === sh.c) && (!sh.n || sh.n.includes(f.properties.name)));
  if (!feats.length || (sh.n && feats.length !== sh.n.length)) throw new Error("SMALL: Natural Earth units missing for " + JSON.stringify(sh));
  const all = rewind(clip.union(...feats.map((f) => polysOf(f.geometry))));
  if (!sh.box) return all;
  const boxes = sh.box.map(([x0, y0, x1, y1]) => [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]);
  const cut = rewind(clip.intersection(all, clip.union(...boxes)));
  if (!cut.length) throw new Error("SMALL: nothing inside the boxes for " + JSON.stringify(sh));
  return cut;
};
const smallPolys = SMALL.map((s) => smallShape(s.shape));
const yearsOf = (from, to) => [+from.slice(0, 4), +to.slice(0, 4) - (to.slice(5) === "12-31" ? 0 : 1)];
function rulerSplit(ref, first, last, list, nameOf) {
  if (!ref) return [{ first, last, ruler: "" }];
  const hits = list.filter((s) => s.last >= first && s.first <= last && s.box[0] <= ref[0] && ref[0] <= s.box[2] && s.box[1] <= ref[1] && ref[1] <= s.box[3] && d3.geoContains({ type: "MultiPolygon", coordinates: s.polys }, ref));
  const cuts = new Set([first]);
  hits.forEach((s) => { if (s.first > first) cuts.add(s.first); if (s.last + 1 <= last) cuts.add(s.last + 1); });
  const bounds = [...cuts].sort((a, b) => a - b), res = [];
  bounds.forEach((s, k) => {
    const e = k + 1 < bounds.length ? bounds[k + 1] - 1 : last;
    const h = hits.find((x) => x.first <= s && s <= x.last && !x.small);
    const ruler = h ? nameOf(h) : "";
    const prev = res[res.length - 1];
    if (prev && prev.ruler === ruler) prev.last = e; else res.push({ first: s, last: e, ruler });
  });
  return res;
}
function addSmall(list, timeOf, nameOf) {
  const carves = [], fills = [];
  SMALL.forEach((s, i) => s.periods.forEach(([from, to, status, ref, mode]) => {
    const t = timeOf(from, to);
    if (!t) return;
    (mode === "fill" ? fills : carves).push({ s, polys: smallPolys[i], first: t[0], last: t[1], status, ref });
  }));
  const piece = (x, first, last, ruler, polys) => withBox({ name: x.s.name, ruler, part: "", people: 0, b: 3, status: ruler ? SMALL_STATUS[x.status] : 0, first, last, polys, wiki: x.s.wiki || x.s.name, src: "small", small: true, keep: km2Of(polys) < SMALL_KEEP_KM2 });
  for (const x of carves) {
    const parts = rulerSplit(x.ref, x.first, x.last, list, nameOf);
    for (const p of parts) {
      const sm = piece(x, p.first, p.last, p.ruler, x.polys);
      list = carve(list, sm);
      list.push(sm);
    }
  }
  for (const x of fills) {
    const parts = rulerSplit(x.ref, x.first, x.last, list, nameOf);
    for (const p of parts) {
      for (const r of cutOver(x.polys, boxOf(x.polys), p.first, p.last, list, cellOpt(x.polys, 0))) if (r.polys.length) list.push(piece(x, r.first, r.last, p.ruler, r.polys));
    }
  }
  return list;
}

const DISPUTES = [
  { name: "Jammu and Kashmir", units: ["Jammu and Kashmir"], periods: [["1947-10-27", "2019-12-31", "India", ["India", "Pakistan"]]] },
  { name: "Azad Kashmir", units: ["Azad Kashmir"], periods: [["1947-10-27", "2019-12-31", "Pakistan", ["Pakistan", "India"]]] },
  { name: "Gilgit-Baltistan", units: ["Gilgit-Baltistan"], periods: [["1947-11-16", "2019-12-31", "Pakistan", ["Pakistan", "India"]]] },
  { name: "Siachen Glacier", units: ["Siachen Glacier"], periods: [["1984-04-13", "2019-12-31", "India", ["India", "Pakistan"]]] },
  { name: "Aksai Chin", units: ["Aksai Chin"], periods: [["1959-01-23", "2019-12-31", "China", ["China", "India"]]] },
  { name: "Shaksam Valley", units: ["Shaksam Valley"], periods: [["1963-03-02", "2019-12-31", "China", ["China", "India"]]] },
  { name: "North-East Frontier Agency", units: ["Arunachal Pradesh"], wiki: "North-East Frontier Agency", periods: [["1959-01-23", "1972-01-20", "India", ["India", "China"]]] },
  { name: "Arunachal Pradesh", units: ["Arunachal Pradesh"], periods: [["1972-01-21", "2019-12-31", "India", ["India", "China"]]] },
  { name: "Western Sahara", units: ["W. Sahara"], periods: [["1976-02-27", "1979-08-04", "", ["Morocco", "Mauritania", "Sahrawi Republic"]], ["1979-08-05", "2019-12-31", "", ["Morocco", "Sahrawi Republic"]]] },
  { name: "Somaliland", units: ["Somaliland"], periods: [["1991-05-18", "2019-12-31", "", ["Somaliland", "Somalia"]]] },
  { name: "Guayana Esequiba", units: ["West of Essequibo River"], periods: [["1966-05-26", "2019-12-31", "Guyana", ["Guyana", "Venezuela"]]] },
  { name: "Crimea", units: ["Crimea"], wiki: "Annexation of Crimea by the Russian Federation", periods: [["2014-03-18", "2019-12-31", "Russia", ["Russia", "Ukraine"]]] },
  { name: "Donetsk People's Republic", units: ["Donetsk People's Republic"], periods: [["2014-05-11", "2019-12-31", "", ["Donetsk People's Republic", "Ukraine"]]] },
  { name: "Luhansk People's Republic", units: ["Luhansk People's Republic"], periods: [["2014-05-11", "2019-12-31", "", ["Luhansk People's Republic", "Ukraine"]]] },
  { name: "Golan Heights", units: ["Golan Heights"], periods: [["1967-06-10", "2019-12-31", "Israel", ["Israel", "Syria"]]] },
  { name: "West Bank", units: ["West Bank"], wiki: "Israeli-occupied territories", periods: [["1967-06-10", "1988-07-30", "Israel", ["Israel", "Jordan"]], ["1988-07-31", "2019-12-31", "Israel", ["Israel", "Palestine"]]] },
  { name: "Halaib Triangle", units: ["Halayib Triangle"], periods: [["1958-02-01", "2019-12-31", "", ["Egypt", "Sudan"]]] },
  { name: "Southern Kuril Islands", units: ["Kuril Is."], wiki: "Kuril Islands dispute", periods: [["1945-09-05", "1991-12-25", "Soviet Union", ["Soviet Union", "Japan"]], ["1991-12-26", "2019-12-31", "Russia", ["Russia", "Japan"]]] },
  { name: "Abyei", units: ["Abyei"], periods: [["2011-07-09", "2019-12-31", "", ["Sudan", "South Sudan"]]] },
  { name: "Ilemi Triangle", units: ["Ilemi Triangle"], periods: [["1963-12-12", "2011-07-08", "Kenya", ["Kenya", "Sudan"]], ["2011-07-09", "2019-12-31", "Kenya", ["Kenya", "South Sudan"]]] },
  { name: "Northern Cyprus", units: ["N. Cyprus"], periods: [["1974-08-16", "2019-12-31", "", ["Northern Cyprus", "Cyprus"]]] },
  { name: "Abkhazia", units: ["Abkhazia"], periods: [["1993-09-30", "2019-12-31", "", ["Abkhazia", "Georgia"]]] },
  { name: "South Ossetia", units: ["South Ossetia"], periods: [["1992-06-24", "2019-12-31", "", ["South Ossetia", "Georgia"]]] },
  { name: "Transnistria", units: ["Transnistria"], periods: [["1992-07-21", "2019-12-31", "", ["Transnistria", "Moldova"]]] },
  { name: "Kosovo", units: ["Kosovo"], periods: [["2008-02-17", "2019-12-31", "Kosovo", ["Kosovo", "Serbia"]]] }
];
const disputedPath = resolve(dirname(nePath), "ne_10m_admin_0_disputed_areas.geojson");
const disputedUnits = existsSync(disputedPath) ? JSON.parse(readFileSync(disputedPath, "utf8")).features : null;
if (!disputedUnits) console.warn("Natural Earth's disputed areas not found beside the states and provinces, so DISPUTES is not applied: " + disputedPath);
function addDisputes(list) {
  if (!disputedUnits) return list;
  for (const d of DISPUTES) {
    const feats = disputedUnits.filter((f) => d.units.includes(String(f.properties.BRK_NAME).replace(/^\uFEFF/, "")));
    if (!feats.length) throw new Error("DISPUTES: Natural Earth disputed area missing for " + d.name);
    const polys = rewind(clip.union(...feats.map((f) => polysOf(f.geometry))));
    for (const [from, to, admin, claims] of d.periods) {
      const a = Math.max(0, dayOf(from)), b = Math.min(dayOf(CS_TO), dayOf(to));
      if (b < a) continue;
      const sm = withBox({ name: d.name, ruler: admin, part: "", people: 0, b: 3, status: 6, claims, first: a, last: b, polys, wiki: d.wiki || d.name, src: "dispute", small: true, keep: km2Of(polys) < SMALL_KEEP_KM2 });
      list = carve(list, sm);
      list.push(sm);
    }
  }
  return list;
}
const lineageNames = (name) => (lineageOf.has(name) ? LINEAGE[lineageOf.get(name)] : [name]);
const NAME_FILLER = new Set(["of", "the", "and", "kingdom", "empire", "sultanate", "dynasty", "khanate", "republic", "principality", "duchy", "grand", "emirate", "regency", "county", "state", "states", "confederation", "caliphate", "union", "realm", "great", "united", "beylik", "imamate", "tsardom", "electorate", "margraviate", "lordship", "house"]);
const coreWords = (name) => new Set(name.toLowerCase().split(/[^a-zà-öø-ÿāēīōūăđơưạ-ỹ']+/).filter((w) => w && !NAME_FILLER.has(w)));
const sameAs = (name) => {
  const kin = new Set(lineageNames(name)), core = coreWords(name);
  const within = (a, b) => a.size > 0 && [...a].every((w) => b.has(w));
  return (other) => kin.has(other) || (core.size > 0 && (within(core, coreWords(other)) || within(coreWords(other), core)));
};
let dated = clioSpans.filter((s) => s.last >= DATED_FROM && s.first <= DATED_TO).map((s) => withBox({ ...s, first: Math.max(s.first, DATED_FROM), last: Math.min(s.last, DATED_TO) }));
function reshape(list, edits, dropSlivers) {
  const byBase = new Map(), extra = [];
  edits.forEach((e) => { if (!byBase.has(e.base)) byBase.set(e.base, []); byBase.get(e.base).push(e); });
  const out = list.filter((o) => !byBase.has(o));
  for (const [o, mine] of byBase) {
    const cuts = new Set([o.first]);
    mine.forEach((a) => { if (a.first > o.first) cuts.add(a.first); if (a.last + 1 <= o.last) cuts.add(a.last + 1); });
    const bounds = [...cuts].sort((a, b) => a - b);
    let prev = null;
    bounds.forEach((s0, k) => {
      const e0 = k + 1 < bounds.length ? bounds[k + 1] - 1 : o.last;
      const now = mine.filter((a) => a.first <= s0 && s0 <= a.last);
      const add = now.filter((a) => a.add).map((a) => a.polys), cut = now.filter((a) => !a.add).map((a) => a.polys);
      let polys = o.polys;
      if (add.length) polys = unionSafe(polys, add);
      if (cut.length) {
        polys = subtract(polys, cut);
        if (dropSlivers) {
          const all = km2Of(polys), near = now.filter((a) => !a.add && a.to).map((a) => ({ to: a.to, cells: a.near || (a.near = dilate(cellsOf(a.polys))) }));
          const moved = new Map();
          polys = polys.filter((q) => {
            const a = polyKm2(q);
            if (a < 0.25 * all) {
              const qc = cellsOf([q]);
              for (const n of near) {
                let inside = 0;
                for (const i of qc) if (n.cells.has(i)) inside++;
                if (qc.size ? inside >= 0.5 * qc.size : n.cells.has(cellAt(q[0][0]))) { if (!moved.has(n.to)) moved.set(n.to, []); moved.get(n.to).push(q); return false; }
              }
            }
            return a >= 0.1 * all || (a >= SLIVER_KM2 && (2 * a) / ringKm(q[0]) >= SLIVER_WIDTH_KM);
          });
          for (const [to, qs] of moved) extra.push(withBox({ ...to, first: Math.max(s0, to.first), last: Math.min(e0, to.last), polys: qs }));
        }
      }
      const key = now.map((a) => a.polys.length + (a.add ? "+" : "-")).join(",");
      if (prev && prev.key === key && !now.length) { prev.span.last = e0; return; }
      if (!polys.length) { prev = null; return; }
      const span = withBox({ ...o, first: s0, last: e0, polys });
      delete span.km2; delete span.pole;
      if (polys !== o.polys) delete span.geoHash;
      out.push(span);
      prev = { key, span };
    });
  }
  return out.concat(extra.filter((e) => e.first <= e.last));
}
const cellAt = (p) => Math.max(0, Math.min(RG / 2 - 1, Math.floor((90 - p[1]) * RGK))) * RG + Math.max(0, Math.min(RG - 1, Math.floor((p[0] + 180) * RGK)));
{
  const order = dated.map((s, i) => i).sort((a, b) => dated[a].box[0] - dated[b].box[0]);
  const edits = [];
  for (let x = 0; x < order.length; x++) {
    const A = dated[order[x]];
    for (let y = x + 1; y < order.length; y++) {
      const B = dated[order[y]];
      if (B.box[0] > A.box[2]) break;
      if (B.last < A.first || A.last < B.first || !boxHit(A.box, B.box) || A.name === B.name) continue;
      const [small, big] = A.cells.size <= B.cells.size ? [A, B] : [B, A];
      let shared = 0;
      for (const i of small.cells) if (big.cells.has(i)) { shared++; break; }
      if (!shared) continue;
      edits.push({ base: big, first: Math.max(A.first, B.first), last: Math.min(A.last, B.last), polys: small.polys, add: false });
    }
  }
  const before = dated.length;
  dated = reshape(dated, edits, false);
  console.log("overlaps in Cliopatria: " + edits.length + " pairs, the smaller shape kept, " + before + " spans to " + dated.length);
}
{
  const hbSnaps = snapshots.filter((s) => s.y >= DATED_FROM);
  const clioOnly = dated.slice();
  const fills = [], absorbed = [], members = [];
  const clioNamed = (same, y) => clioOnly.find((c) => c.first <= y && y <= c.last && same(c.name)) || null;
  const clioNear = (same, y) => {
    let best = null, gap = TWIN_YEARS + 1;
    for (const c of clioOnly) { if (!same(c.name)) continue; const g = y < c.first ? c.first - y : y > c.last ? y - c.last : 0; if (g < gap) { gap = g; best = c; } }
    return best;
  };
  const resolveName = (name, y) => { const c = clioNamed(sameAs(name), y); return c ? c.name : null; };
  hbSnaps.forEach((s, k) => {
    console.log("filling from the map of " + s.y + ", " + Math.round(process.uptime()) + " s");
    const first = k ? Math.ceil((hbSnaps[k - 1].y + s.y) / 2) : DATED_FROM, last = k + 1 < hbSnaps.length ? Math.ceil((s.y + hbSnaps[k + 1].y) / 2) - 1 : DATED_TO;
    const memberLast = k + 1 < hbSnaps.length ? hbSnaps[k + 1].y - 1 : DATED_TO;
    const thenSpans = clioOnly.filter((c) => c.first <= s.y && s.y <= c.last);
    for (const f of s.feats) {
      const p = f.properties;
      if (!p.name) continue;
      const polys = rewind(polysOf(f.geometry)), whole = km2Of(polys), box = boxOf(polys);
      if (!(whole > 0)) continue;
      const people = isPeople(p.name, p.ruler, s.y, [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2]) ? 1 : 0;
      const opt = cellOpt(polys, 0.97);
      opt.whole = whole;
      opt.same = sameAs(p.name);
      const until = HB_STALE[p.name] ?? Infinity;
      if (!people && whole >= MIN_KM2) {
        const multi = { type: "MultiPolygon", coordinates: polys };
        let home;
        opt.cuts = [last + 1, s.y - UMBRELLA_YEARS, s.y + UMBRELLA_YEARS + 1];
        opt.bucket = (y) => (y > last ? "L" : "F") + (Math.abs(y - s.y) > UMBRELLA_YEARS ? "o" : "");
        opt.member = (c, frac, y) => {
          if (frac < 0.5 || opt.same(c.name)) return false;
          if (home === undefined) {
            home = null;
            let best = 0;
            for (const t of thenSpans) {
              if (!boxHit(t.box, box)) continue;
              let w = 0;
              for (const i of opt.cells) if (t.cells && t.cells.has(i)) w += cellW(i);
              if (w > best) { best = w; home = t.name; }
            }
            if (best < 0.5 * opt.cellsW) home = null;
          }
          if (c.name !== home && !(UMBRELLA.test(c.name) && Math.abs(y - s.y) <= UMBRELLA_YEARS)) return false;
          if (c.km2 === undefined) { c.km2 = km2Of(c.polys); const l = labelOf({ type: "MultiPolygon", coordinates: c.polys }, true); c.pole = l ? [l[0], l[1]] : null; }
          if (UMBRELLA.test(c.name)) return frac * whole <= 0.95 * c.km2;
          return frac * whole <= 0.5 * c.km2 && (frac * whole < 0.25 * c.km2 || !(c.pole && d3.geoContains(multi, c.pole)));
        };
      }
      const upTo = Math.min(until, opt.member ? memberLast : last);
      for (const r of upTo >= first ? cutOver(polys, box, first, upTo, clioOnly, opt) : []) {
        if (r.first > last && !r.member) continue;
        if (r.member) {
          let inside = r.polys;
          if (r.first > last) { try { inside = rewind(clip.intersection(polys, r.member.polys)); } catch (e) { inside = []; } }
          const kept = inside.filter(ownPiece);
          if (!kept.length) continue;
          const c = r.member, umbrella = UMBRELLA.test(c.name), twin = clioNear(opt.same, r.first);
          const ruler = p.ruler ? resolveName(p.ruler, r.first) || (umbrella ? "" : c.name) : "";
          const span = withBox({ name: twin ? twin.name : p.name, ruler, part: umbrella ? c.name : "", people: 0, b: p.b, status: ruler ? 5 : 0, first: r.first, last: r.last, polys: kept, wiki: twin ? twin.wiki : wikiFor(p.name, s.y), src: "member" });
          members.push({ base: c, first: r.first, last: r.last, cut: polys, to: span });
          fills.push(span);
          continue;
        }
        const o = r.owner;
        const kept = o && !people ? r.polys.filter(ownPiece) : keepRemnant(r.polys, whole, 1, widthOf(polys));
        if (!kept.length) continue;
        if (o && !people) absorbed.push({ owner: o, first: r.first, last: r.last, polys: kept });
        else fills.push(withBox({ name: p.name, ruler: people ? "" : p.ruler, part: p.part, people, b: p.b, status: p.ruler && !people ? 5 : 0, first: r.first, last: r.last, polys: kept, wiki: wikiFor(p.name, s.y), src: "hb" }));
      }
      if (until < last && !people) {
        for (const r of cutOver(polys, box, Math.max(first, until + 1), last, clioOnly, { cells: opt.cells, cellsW: opt.cellsW, anyOwner: true })) {
          const kept = r.owner ? r.polys.filter(ownPiece) : [];
          if (kept.length) absorbed.push({ owner: r.owner, first: r.first, last: r.last, polys: kept });
        }
      }
    }
  });
  const edits = absorbed.map((a) => ({ base: a.owner, first: a.first, last: a.last, polys: a.polys, add: true })).concat(members.map((m) => ({ base: m.base, first: m.first, last: m.last, polys: m.cut, add: false, to: m.to })));
  dated = reshape(dated, edits, true).concat(fills);
  console.log("absorbed " + absorbed.length + " pieces of historical-basemaps into Cliopatria spans, and drew " + members.length + " spans of member states out of " + new Set(members.map((m) => m.base)).size + " Cliopatria spans");
  console.log("filled from historical-basemaps: " + fills.length + " spans");
  dated = addSmall(dated, (from, to) => {
    const [a, b] = yearsOf(from, to);
    return b < DATED_FROM || a > DATED_TO || b < a ? null : [Math.max(a, DATED_FROM), Math.min(b, DATED_TO)];
  }, (h) => h.name);
  {
    const centreOf = (polys) => { let best = null, area = -1; for (const poly of polys) { const a = Math.abs(planar(poly[0])); if (a > area) { area = a; best = poly[0]; } } if (!best) return null; const b = boxOf([[best]]); return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; };
    const inBox = (c, b) => !!c && c[0] >= b[0] && c[0] <= b[2] && c[1] >= b[1] && c[1] <= b[3];
    const fixesOf = new Map();
    NAME_FIX.forEach((r) => { if (!fixesOf.has(r[0])) fixesOf.set(r[0], []); fixesOf.get(r[0]).push(r); });
    const fixAt = (s, y, c) => {
      let name = s.name, ruler = s.ruler || "", part = s.part || "", people = s.people ? 1 : 0, wiki = s.wiki, status = s.status;
      for (const [, to, a, b, o = {}] of fixesOf.get(name) || []) {
        if (y < a || y > b || (o.box && !inBox(c, o.box))) continue;
        const n = to.startsWith("@") ? regimeAt(to.slice(1), y) || name : to;
        if (n !== name) { name = n; wiki = o.wiki || REGIME_WIKI[n] || n; } else if (o.wiki) wiki = o.wiki;
        if (o.ruler !== undefined) ruler = o.ruler.startsWith("@") ? regimeAt(o.ruler.slice(1), y) || "" : o.ruler;
        if (o.part !== undefined) part = o.part;
        if (o.people !== undefined) people = o.people;
        if (o.drop) return { drop: 1 };
        break;
      }
      const gn = regimeName.get(name);
      if (gn) { const n = regimeAt(gn, y); if (n && n !== name) { name = n; wiki = REGIME_WIKI[n] || n; } }
      const gr = regimeRuler.get(ruler);
      if (gr) ruler = regimeAt(gr, y) || ruler;
      const gp = regimeRuler.get(part);
      if (gp) part = regimeAt(gp, y) || part;
      if (y > (RULER_DROP[ruler] ?? Infinity)) ruler = "";
      if (y > (RULER_DROP[part] ?? Infinity)) part = "";
      if (ruler === name) ruler = "";
      if (part === name) part = "";
      if (people) ruler = "";
      if (people) status = 0;
      else if (ruler && !s.ruler) status = 5;
      else if (!ruler && s.ruler) status = 0;
      return { name, ruler, part, people, wiki, status };
    };
    const boxRules = new Map();
    NAME_FIX.forEach((r) => { if (r[4] && r[4].box) { if (!boxRules.has(r[0])) boxRules.set(r[0], []); boxRules.get(r[0]).push(r[4].box); } });
    let parted = 0;
    dated = dated.flatMap((s) => {
      const boxes = boxRules.get(s.name);
      if (!boxes || s.polys.length < 2) return [s];
      const groups = new Map();
      for (const p of s.polys) { const b = boxOf([p]), k = boxes.findIndex((x) => inBox([(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], x)); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); }
      if (groups.size < 2) return [s];
      parted++;
      return [...groups.values()].map((polys, i) => ({ ...s, polys, box: boxOf(polys), cells: undefined, geoHash: undefined, uid: i ? uidNext++ : s.uid }));
    });
    let split = 0, changed = 0;
    dated = dated.flatMap((s) => {
      const c = centreOf(s.polys), base = JSON.stringify({ name: s.name, ruler: s.ruler || "", part: s.part || "", people: s.people ? 1 : 0, wiki: s.wiki, status: s.status });
      const out = [];
      let cur = null, key = "";
      for (let y = s.first; y <= s.last; y++) {
        const f = fixAt(s, y, c), k = JSON.stringify(f);
        if (f.drop) { cur = null; key = ""; continue; }
        if (cur && k === key) { cur.last = y; continue; }
        cur = { ...s, ...f, first: y, last: y, uid: out.length ? uidNext++ : s.uid }; key = k; out.push(cur);
      }
      if (out.length === 1 && key === base && out[0].first === s.first && out[0].last === s.last) return [s];
      changed++;
      split += out.length - 1;
      out.forEach((o) => { if (o.name !== s.name) noteRename(s.name, o.name); });
      return out;
    });
    const CARVE = [
      ["Duchy of Austria", 1450, 1452, [["Duchy of Austria", 1449, null]], "Kingdom of Hungary"],
      ["Archduchy of Austria", 1453, 1458, [["Duchy of Austria", 1449, null], ["Kingdom of Bohemia", 1452, "Kingdom of Bohemia"]], "Kingdom of Hungary"],
    ];
    for (const [name, a, b, refs, restName] of CARVE) {
      const found = refs.map(([refName, refYear, as]) => ({ ref: dated.find((x) => x.name === refName && x.first <= refYear && refYear <= x.last), as, refName, refYear }));
      const miss = found.find((f) => !f.ref);
      if (miss) { console.log("carve: no " + miss.refName + " in " + miss.refYear); continue; }
      const next = [];
      for (const x of dated) {
        if (x.name !== name || x.last < a || x.first > b || found.some((f) => f.ref === x)) { next.push(x); continue; }
        const lo = Math.max(a, x.first), hi = Math.min(b, x.last), parts = [];
        let rest = x.polys;
        try {
          for (const f of found) { parts.push([f, rewind(clip.intersection(rest, f.ref.polys))]); rest = rewind(clip.difference(rest, f.ref.polys)); }
        } catch (e) { next.push(x); continue; }
        if (x.first < lo) next.push({ ...x, last: lo - 1 });
        let own = x.first < lo;
        for (const [f, polys] of parts) {
          if (km2Of(polys) <= 100) continue;
          if (!f.as) { next.push(withBox({ ...x, first: lo, last: hi, polys, cells: undefined, geoHash: undefined, uid: own ? uidNext++ : x.uid })); own = true; }
          else next.push(withBox({ ...x, name: f.as, wiki: f.ref.wiki, ruler: f.ref.ruler, part: f.ref.part, status: f.ref.status, first: lo, last: hi, polys, cells: undefined, geoHash: undefined, uid: uidNext++ }));
        }
        if (km2Of(rest) > 100) next.push(withBox({ ...x, name: restName, wiki: restName, ruler: "", status: 0, first: lo, last: hi, polys: rest, cells: undefined, geoHash: undefined, uid: uidNext++ }));
        if (x.last > hi) next.push({ ...x, first: hi + 1, uid: uidNext++ });
      }
      dated = next;
    }
    console.log("names: " + parted + " spans parted by region, " + changed + " spans renamed or given another ruler, in " + (changed + split) + " pieces");
    const dil = new Map(), dilOf = (s) => { let d = dil.get(s); if (!d) { if (!s.cells) s.cells = cellsOf(s.polys); d = dilate(s.cells); dil.set(s, d); } return d; };
    const groups = new Map();
    for (const s of dated) { if (s.small) continue; const k = s.name + "|" + (s.ruler || "") + "|" + (s.people ? 1 : 0); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(s); }
    const drop = new Set(), add = [];
    let joined = 0;
    for (const g of groups.values()) {
      if (g.length < 2) continue;
      const cuts = [...new Set(g.flatMap((s) => [s.first, s.last + 1]))].sort((a, b) => a - b);
      const segs = [], multi = new Set();
      for (let i = 0; i + 1 < cuts.length; i++) {
        const a = cuts[i], b = cuts[i + 1] - 1, act = g.filter((s) => s.first <= a && a <= s.last);
        if (act.length < 2) { segs.push({ a, b, comps: act.map((s) => [s]) }); continue; }
        const up = act.map((_, j) => j), find = (j) => (up[j] === j ? j : (up[j] = find(up[j])));
        for (let x = 0; x < act.length; x++) for (let z = x + 1; z < act.length; z++) {
          if (find(x) === find(z)) continue;
          const A = act[x], B = act[z];
          if (!A.box || !B.box || !boxHit([A.box[0] - 0.6, A.box[1] - 0.6, A.box[2] + 0.6, A.box[3] + 0.6], B.box)) continue;
          if (!B.cells) B.cells = cellsOf(B.polys);
          if (meets(dilOf(A), B.cells)) up[find(x)] = find(z);
        }
        const comps = new Map();
        act.forEach((s, j) => { const r = find(j); if (!comps.has(r)) comps.set(r, []); comps.get(r).push(s); });
        const list = [...comps.values()];
        list.forEach((m) => { if (m.length > 1) m.forEach((s) => multi.add(s)); });
        segs.push({ a, b, comps: list });
      }
      if (!multi.size) continue;
      const unions = new Map();
      let open = new Map();
      for (const { a, b, comps } of segs) {
        const next = new Map();
        for (const m of comps) {
          if (m.length === 1 && !multi.has(m[0])) continue;
          const key = m.map((s) => s.uid).sort((p, q) => p - q).join(",");
          const prev = open.get(key);
          if (prev && prev.last === a - 1) { prev.last = b; next.set(key, prev); continue; }
          let span;
          if (m.length === 1) span = { ...m[0], first: a, last: b, uid: uidNext++ };
          else {
            let u = unions.get(key);
            if (!u) {
              const top = m.reduce((p, q) => (cellSum(q.cells || (q.cells = cellsOf(q.polys))) > cellSum(p.cells || (p.cells = cellsOf(p.polys))) ? q : p));
              let polys;
              try { polys = rewind(clip.union(...m.map((s) => s.polys))); } catch (e) { polys = null; }
              u = polys ? { ...top, polys, keep: m.some((s) => s.keep), box: boxOf(polys), cells: null, geoHash: undefined } : null;
              unions.set(key, u);
            }
            if (!u) { m.forEach((s) => { const c = { ...s, first: a, last: b, uid: uidNext++ }; add.push(c); }); continue; }
            span = { ...u, first: a, last: b, uid: uidNext++ };
            joined++;
          }
          add.push(span); next.set(key, span);
        }
        open = next;
      }
      multi.forEach((s) => drop.add(s));
    }
    dated = dated.filter((s) => !drop.has(s)).concat(add);
    console.log("names: joined touching spans of one state with one name in " + joined + " stretches of years, " + drop.size + " spans to " + add.length);
  }
  dated.forEach((s) => { delete s.cells; });
  console.log("dated spans: " + clioOnly.length + " from Cliopatria, " + fills.length + " filled from historical-basemaps, " + dated.filter((s) => s.small).length + " small territories");
}

dated = resolveOverlaps(dated, "from 1200 to 1885");
mkdirSync(resolve(out, "dated"), { recursive: true });
const datedChunks = [];
const datedLabel = new Map();
for (let c = DATED_FROM; c <= DATED_TO; c += CHUNK) {
  const cEnd = Math.min(c + CHUNK - 1, DATED_TO);
  const spans = dated.filter((s) => s.last >= c && s.first <= cEnd).sort((a, b) => a.first - b.first || a.uid - b.uid);
  const feats = spans.map((s, i) => dissolveFeat({ type: "Feature", properties: { i, keep: !!s.keep }, geometry: { type: "MultiPolygon", coordinates: s.polys } }));
  const hi = topoFor(feats, HI_KM, HI_Q), lo = topoFor(feats, LO_KM, LO_Q);
  const rows = spans.map((s, i) => {
    if (!s.geoHash) s.geoHash = createHash("md5").update(JSON.stringify(s.polys)).digest("hex");
    let label = datedLabel.get(s.geoHash);
    if (label === undefined) {
      const geom = client.feature(hi, hi.objects.p.geometries[i]).geometry;
      label = geom ? labelOf(geom) : null;
      if (label && label[5] > BIG_KM2) {
        const spots = labelSpots(geom, label[5]);
        if (spots.length > 1) label.push(spots);
      }
      datedLabel.set(s.geoHash, label);
    }
    const id = catId(s.name), entry = catalogue[id];
    entry.dated = entry.dated ? [Math.min(entry.dated[0], s.first), Math.max(entry.dated[1], s.last)] : [s.first, s.last];
    if (!entry.wiki.has(s.first)) entry.wiki.set(s.first, s.wiki || s.name);
    if (s.people) entry.kind = kindOf(s.name);
    const row = [id, s.ruler ? catId(s.ruler) : -1, s.first, s.last, s.status, null, s.noLabel ? null : label, s.people ? kindOf(s.name) : 0, s.part ? catId(s.part) : -1, APPROX.has(s.name) ? Math.min(1, s.b ?? 2) : s.b];
    if (s.claims) row.push(s.claims.map(catId));
    return row;
  });
  hi.objects.p.geometries.forEach((g) => { delete g.properties; });
  lo.objects.p.geometries.forEach((g) => { delete g.properties; });
  const file = "dated/" + c + ".json";
  writeFileSync(resolve(out, file), JSON.stringify({ from: c, to: cEnd, rows, hi, lo }));
  datedChunks.push({ from: c, to: cEnd, file, rows, lo, spans });
}
const datedChanges = [...new Set(dated.map((s) => s.first).concat(dated.filter((s) => s.last < DATED_TO).map((s) => s.last + 1)))].filter((y) => y >= DATED_FROM && y <= DATED_TO).sort((a, b) => a - b);

const CS_STATUS = { independent: 0, colony: 1, protectorate: 2, mandate: 3, occupied: 4, dependency: 5, disputed: 6 };
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
  "Tanzania (Tanganyika)": [["1886-01-01", "German East Africa"], ["1920-07-22", "Tanganyika"], ["1964-04-26", "Tanzania"]],
  "United Arab Emirates": [["1886-01-01", "Trucial States"], ["1971-12-02", "United Arab Emirates"]],
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
const CAP_BEFORE = {
  "Abuja": [["1991-12-11", "Lagos", 3.39, 6.45]],
  "Dodoma": [["1996-01-31", "Dar es Salaam", 39.28, -6.82]],
  "Lilongwe": [["1974-12-31", "Zomba", 35.32, -15.39]],
  "Lusaka": [["1935-05-31", "Livingstone", 25.85, -17.85]],
  "Gaborone": [["1965-01-31", "Mafeking", 25.64, -25.86]],
  "Nouakchott": [["1957-12-31", "Saint-Louis", -16.49, 16.03]],
  "Kampala": [["1962-10-08", "Entebbe", 32.46, 0.06]],
  "Beijing": [["1928-06-14", "Peking", 116.4, 39.9], ["1937-11-19", "Nanjing", 118.8, 32.06], ["1946-05-04", "Chongqing", 106.55, 29.56], ["1949-09-30", "Nanjing", 118.8, 32.06]]
};
const capitalOf = (raw, lon, lat) => {
  const name = CAP_FIX[cleanCs(raw)] || cleanCs(raw);
  const cap = [name, +lon.toFixed(3), +lat.toFixed(3)];
  const key = CAP_ALIAS[name] || name;
  const steps = CITY_NAMES_REF && CITY_NAMES_REF[key];
  if (steps && steps.length) cap.push(steps.map(([d, n]) => [dayOf(d), n]));
  if (CAP_BEFORE[name]) { if (cap.length < 4) cap.push(null); cap.push(CAP_BEFORE[name].map(([d, n, x, y]) => [dayOf(d), n, x, y])); }
  return cap;
};
const csTopo = JSON.parse(readFileSync(cshapesPath, "utf8"));
const csObj = Object.values(csTopo.objects)[0];
const csRaw = csObj.geometries.map((g) => ({ p: g.properties, geometry: client.feature(csTopo, g).geometry }));
const CLIO_TWIN = { "First Hellenic Republic": "Greece" };
const CS_REDRAW = [
  { a: "265", b: "260", from: "1945-05-08", to: "1990-10-02", country: "DEU", reachKm: 25,
    aUnits: ["Mecklenburg-Vorpommern", "Brandenburg", "Berlin", "Sachsen-Anhalt", "Thüringen", "Sachsen"],
    bUnits: ["Schleswig-Holstein", "Hamburg", "Niedersachsen", "Bremen", "Nordrhein-Westfalen", "Hessen", "Rheinland-Pfalz", "Saarland", "Baden-Württemberg", "Bayern"] }
];
const CS_BACK = [
  { gw: "510", until: "1890-12-31", names: [["1886-01-01", "German East Africa", 1, "German Empire"]] },
  { gw: "625", until: "1899-01-18", names: [["1886-01-01", "Mahdist State", 0, ""], ["1898-09-02", "Anglo-Egyptian Sudan", 1, "United Kingdom"]] },
  { gw: "620", until: "1912-10-17", names: [["1886-01-01", "Ottoman Empire", 0, ""]] },
  { gw: "678", until: "1918-10-29", names: [["1886-01-01", "Ottoman Empire", 0, ""]] },
  { gw: "670", until: "1932-09-22", names: [["1886-01-01", "Emirate of Nejd", 0, "", "Emirate of Nejd"], ["1891-01-24", "Emirate of Jabal Shammar", 0, ""], ["1902-01-15", "Emirate of Nejd", 0, "", "Emirate of Riyadh"], ["1921-08-22", "Sultanate of Nejd", 0, ""], ["1926-01-08", "Kingdom of Hejaz and Nejd", 0, ""]] },
  { gw: "681", until: "1937-03-31", names: [["1886-01-01", "Aden Protectorate", 2, "United Kingdom"]] },
  { gw: "6812", until: "1937-03-31", names: [["1886-01-01", "Aden Protectorate", 2, "United Kingdom"]] },
  { gw: "696", until: "1892-03-07", names: [["1886-01-01", "Trucial States", 2, "United Kingdom"]] }
];
const HB_MODERN_FROM = 1880;
const HB_MODERN_DROP = [["Arabia"], ["Arabia (Nejd)"], ["Emirate of Bin Shal'an"], ["British Protectorate", [30, 5, 65, 38]], ["Mesopotamia (GB)"], ["American Samoa"], ["New Hebrides"], ["Antarctica"]];
const CLIO_MODERN_DROP = new Set(["British Africa", "New Hebrides"]);
const HB_MODERN_SKIP = [{ box: [5, 74, 35, 81.5], until: "1925-08-13" }];
const CS_FROM_COW = [["255", "1938-03-14", "1945-04-12"], ["305", "1938-03-14", "1945-04-12"]];
const CS_CARVE = [["291", "1939-08-31", "255"]];
const isoAdd = (iso, n) => new Date(Date.UTC(...iso.split("-").map((x, i) => (i === 1 ? x - 1 : +x))) + n * 86400000).toISOString().slice(0, 10);
const csWithExtras = (rows) => {
  const cowPath = cshapesPath.replace(/_gw\.topojson$/, "_cow.topojson");
  const hasCow = cowPath !== cshapesPath && existsSync(cowPath);
  if (!hasCow) console.warn("CShapes COW edition not found beside the GW one, so CS_FROM_COW is not applied: " + cowPath);
  const cowTopo = hasCow ? JSON.parse(readFileSync(cowPath, "utf8")) : null;
  const cow = hasCow ? Object.values(cowTopo.objects)[0].geometries.map((g) => ({ p: { ...g.properties, gwcode: g.properties.cowcode }, geometry: client.feature(cowTopo, g).geometry })) : [];
  let list = rows;
  for (const [code, a, b] of hasCow ? CS_FROM_COW : []) {
    const next = [];
    for (const r of list) {
      if (String(r.p.gwcode) !== code || r.p.end < a || r.p.start > b) { next.push(r); continue; }
      if (r.p.start < a) next.push({ p: { ...r.p, end: isoAdd(a, -1) }, geometry: r.geometry });
      if (r.p.end > b) next.push({ p: { ...r.p, start: isoAdd(b, 1) }, geometry: r.geometry });
    }
    for (const r of cow) {
      if (String(r.p.gwcode) !== code || r.p.end < a || r.p.start > b) continue;
      next.push({ p: { ...r.p, start: r.p.start < a ? a : r.p.start, end: r.p.end > b ? b : r.p.end }, geometry: r.geometry });
    }
    list = next;
  }
  for (const [code, end, from] of CS_CARVE) {
    const own = list.filter((r) => String(r.p.gwcode) === code);
    if (own.length !== 1) throw new Error("CS_CARVE expects one span for " + code);
    const me = own[0], a = isoAdd(me.p.end, 1);
    me.p = { ...me.p, end };
    const next = [];
    for (const r of list) {
      if (String(r.p.gwcode) !== from || r.p.end < a || r.p.start > end || !clip.intersection(polysOf(r.geometry), polysOf(me.geometry)).length) { next.push(r); continue; }
      const s = r.p.start < a ? a : r.p.start, e = r.p.end > end ? end : r.p.end;
      if (r.p.start < s) next.push({ p: { ...r.p, end: isoAdd(s, -1) }, geometry: r.geometry });
      next.push({ p: { ...r.p, start: s, end: e }, geometry: { type: "MultiPolygon", coordinates: clip.difference(polysOf(r.geometry), polysOf(me.geometry)) } });
      if (r.p.end > e) next.push({ p: { ...r.p, start: isoAdd(e, 1) }, geometry: r.geometry });
    }
    list = next;
  }
  return list;
};
const csParts = [];
const csRedraw = (rows) => {
  const bufferMod = require("@turf/buffer"), turfBuffer = bufferMod.default || bufferMod.buffer || bufferMod;
  for (const rd of CS_REDRAW) {
    const pick = (names) => {
      const feats = neAll.filter((f) => f.properties.adm0_a3 === rd.country && names.includes(f.properties.name));
      if (feats.length !== names.length) throw new Error("CS_REDRAW: Natural Earth units missing for " + names.join(", "));
      return clip.union(...feats.map((f) => polysOf(f.geometry)));
    };
    const inSpan = (r) => r.p.end >= rd.from && r.p.start <= rd.to;
    const a = rows.filter((r) => String(r.p.gwcode) === rd.a && inSpan(r)), b = rows.filter((r) => String(r.p.gwcode) === rd.b && inSpan(r));
    if (!a.length || !b.length) throw new Error("CS_REDRAW: no spans for " + rd.a + " and " + rd.b);
    const whole = clip.union(polysOf(a[0].geometry), polysOf(b[0].geometry));
    const land = pick(rd.aUnits), other = pick(rd.bUnits);
    const reach = turfBuffer({ type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: land } }, rd.reachKm, { units: "kilometers", steps: 6 }).geometry;
    const side = clip.union(land, clip.difference(polysOf(reach), other));
    const aPolys = rewind(clip.intersection(whole, side)).filter((q) => polyKm2(q) >= 1), bPolys = rewind(clip.difference(whole, side)).filter((q) => polyKm2(q) >= 1);
    console.log("CS_REDRAW " + rd.a + " and " + rd.b + ": " + Math.round(km2Of(rewind(polysOf(a[0].geometry)))) + " and " + Math.round(km2Of(rewind(polysOf(b[0].geometry)))) + " km² become " + Math.round(km2Of(aPolys)) + " and " + Math.round(km2Of(bPolys)));
    a.forEach((r) => { r.geometry = { type: "MultiPolygon", coordinates: aPolys }; });
    b.forEach((r) => { r.geometry = { type: "MultiPolygon", coordinates: bPolys }; });
  }
  return rows;
};
for (const r of csRedraw(csWithExtras(csRaw))) {
  const p = r.p, start = dayOf(p.start), end = p.end >= CS_TO ? -1 : dayOf(p.end);
  const cuts = (CS_NAMES[p.country_name] || []).map(([d]) => dayOf(d)).filter((d) => d > start && (end < 0 || d <= end));
  const bounds = [start, ...cuts];
  bounds.forEach((s0, k) => {
    const e0 = k + 1 < bounds.length ? bounds[k + 1] - 1 : end;
    csParts.push({ p, geometry: r.geometry, start: s0, end: e0, name: csNameAt(p.country_name, s0) });
  });
}
{
  const endDay = dayOf(CS_TO);
  let list = csParts.map((r) => withBox({ cs: r, name: r.name, first: r.start, last: r.end < 0 ? endDay : r.end, polys: rewind(polysOf(r.geometry)) }));
  const csOnly = list.slice();
  const fills = [], csNames = new Set(csOnly.map((x) => x.name));
  let twins = 0;
  for (const s of clioSpans) {
    const twin = CLIO_TWIN[s.name] || null;
    if (s.last < 1886 || CLIO_MODERN_DROP.has(s.name) || (!twin && lineageNames(s.name).some((n) => csNames.has(n)))) continue;
    const first = s.first >= 1886 ? dayOf(s.first + "-01-01") : 0, last = Math.min(endDay, dayOf(s.last + "-12-31"));
    if (last < first) continue;
    const whole = km2Of(s.polys), box = boxOf(s.polys);
    for (const r of cutOver(s.polys, box, first, last, csOnly, cellOpt(s.polys, 0.75))) {
      const kept = keepRemnant(r.polys, whole, 0.5);
      if (!kept.length) continue;
      if (twin) twins++;
      fills.push(withBox({ name: twin || s.name, ruler: twin ? "" : s.ruler, part: "", people: 0, b: 2, status: twin ? 0 : s.status, first: r.first, last: r.last, polys: kept, wiki: twin ? csWiki(twin, s.first) : s.wiki, src: "clio" }));
    }
  }
  list = list.concat(fills);
  list = addSmall(list, (from, to) => {
    const a = Math.max(0, dayOf(from)), b = Math.min(endDay, dayOf(to));
    return b < a ? null : [a, b];
  }, (h) => h.name);
  const backEdits = [];
  let backs = 0;
  for (const bk of CS_BACK) {
    const rows = csOnly.filter((x) => String(x.cs.p.gwcode) === bk.gw).sort((a, b) => a.first - b.first);
    if (!rows.length) throw new Error("CS_BACK: no CShapes span for " + bk.gw);
    const polys = rows[0].polys, whole = km2Of(polys), box = boxOf(polys), width = widthOf(polys);
    bk.names.forEach(([from, name, status, ruler, wiki], k) => {
      const a = dayOf(from), b = k + 1 < bk.names.length ? dayOf(bk.names[k + 1][0]) - 1 : dayOf(bk.until);
      for (const r of cutOver(polys, box, a, b, list, cellOpt(polys, 0))) {
        const kept = keepRemnant(r.polys, whole, 1, width);
        if (!kept.length) continue;
        const home = list.filter((x) => x.cs && x.name === name && x.first <= r.last && r.first <= x.last);
        if (home.length) { home.forEach((x) => backEdits.push({ base: x, first: Math.max(r.first, x.first), last: Math.min(r.last, x.last), polys: kept, add: true })); continue; }
        list.push(withBox({ name, ruler, part: "", people: 0, b: 2, status, first: r.first, last: r.last, polys: kept, wiki: wiki || name, src: "back" }));
        backs++;
      }
    });
  }
  list = reshape(list, backEdits, false);
  const hbFiles = readdirSync(source).map((f) => ({ f, y: yearOf(f) })).filter((x) => x.y !== null && x.y >= HB_MODERN_FROM).sort((a, b) => a.y - b.y);
  const hbEdits = [], hbFills = [], skipCuts = HB_MODERN_SKIP.map((s) => dayOf(s.until) + 1);
  const inBox = (poly, b) => poly[0].every((q) => q[0] >= b[0] && q[0] <= b[2] && q[1] >= b[1] && q[1] <= b[3]);
  hbFiles.forEach(({ f, y }, k) => {
    const y0 = k ? Math.ceil((hbFiles[k - 1].y + y) / 2) : 1886, y1 = k + 1 < hbFiles.length ? Math.ceil((y + hbFiles[k + 1].y) / 2) - 1 : 2019;
    const a = Math.max(0, dayOf(y0 + "-01-01")), b = Math.min(endDay, dayOf(y1 + "-12-31"));
    if (b < a) return;
    console.log("filling from the map of " + y + " (" + y0 + " to " + y1 + "), " + Math.round(process.uptime()) + " s");
    for (const ft of readHb(f, y).feats) {
      const p = ft.properties;
      if (!p.name) continue;
      const polys = rewind(polysOf(ft.geometry)), whole = km2Of(polys), box = boxOf(polys);
      if (!(whole > 0) || isPeople(p.name, p.ruler, y, [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2])) continue;
      const drop = HB_MODERN_DROP.filter(([n]) => n === p.name).map(([, bx]) => bx || [-180, -90, 180, 90]);
      const opt = cellOpt(polys, 0.97);
      opt.whole = whole;
      opt.cuts = skipCuts;
      for (const r of cutOver(polys, box, a, b, list, opt)) {
        const pieces = r.polys.filter((q) => !drop.some((bx) => inBox(q, bx)) && !HB_MODERN_SKIP.some((s) => r.last <= dayOf(s.until) && inBox(q, s.box)));
        if (!pieces.length) continue;
        if (r.owner) {
          const kept = pieces.filter(bigPiece);
          if (kept.length) hbEdits.push({ base: r.owner, first: r.first, last: r.last, polys: kept, add: true, from: p.name, y });
          continue;
        }
        const kept = keepRemnant(pieces, whole, 1, widthOf(polys));
        if (kept.length) hbFills.push(withBox({ name: p.name, ruler: p.ruler, part: p.part, people: 0, b: p.b, status: p.ruler ? 5 : 0, first: r.first, last: r.last, polys: kept, wiki: wikiFor(p.name, y), src: "hb" }));
      }
    }
  });
  const added = new Map();
  hbEdits.forEach((e) => { const k = e.base.name + " <- " + e.from + " " + e.y; added.set(k, Math.max(added.get(k) || 0, km2Of(e.polys))); });
  console.log("from 1886: " + backs + " spans backfilled from later CShapes shapes, " + backEdits.length + " pieces added to CShapes spans by them; " + hbFills.length + " spans filled from historical-basemaps, " + hbEdits.length + " pieces of it added to the states that hold most of their shape: " + [...added].sort((p, q) => q[1] - p[1]).slice(0, 25).map(([k, v]) => k + " " + Math.round(v / 1000) + "k km²").join("; "));
  list = reshape(list, hbEdits, false).concat(hbFills);
  const activeName = (name, day) => list.some((x) => x.name === name && x.first <= day && day <= x.last);
  const rulerFor = (name, day) => (!name || activeName(name, day) ? name : lineageNames(name).find((n) => activeName(n, day)) || name);
  list = addDisputes(resolveOverlaps(list, "from 1886"));
  const STATUS_NAME = ["independent", "colony", "protectorate", "mandate", "occupied", "dependency", "disputed"];
  csParts.length = 0;
  for (const x of list) {
    const geometry = { type: "MultiPolygon", coordinates: x.polys };
    if (x.cs) { csParts.push({ ...x.cs, start: x.first, end: x.last >= endDay ? -1 : x.last, geometry }); continue; }
    const owner = x.ruler ? rulerFor(x.ruler, x.first) : "";
    const claims = x.claims ? x.claims.map((n) => rulerFor(n, x.first)) : null;
    csParts.push({ p: { gwcode: "x:" + x.name, status: claims ? "disputed" : owner ? STATUS_NAME[x.status] : "independent" }, name: x.name, owner, claims, noLabel: !!x.noLabel, wiki: x.wiki, keep: !!x.keep, start: x.first, end: x.last >= endDay ? -1 : x.last, geometry });
  }
  console.log("from 1886: " + Math.round(process.memoryUsage().heapUsed / 1e6) + " MB heap, " + fills.length + " spans filled from Cliopatria (" + twins + " of them under the CShapes name of the same state, from CLIO_TWIN), " + list.filter((x) => x.small).length + " small territories");
}
const byGw = new Map();
csParts.forEach((r) => { const k = String(r.p.gwcode); if (!byGw.has(k)) byGw.set(k, []); byGw.get(k).push(r); });
const activeOn = (r, day) => r.start <= day && (r.end < 0 || day <= r.end);
const ownerName = (r) => {
  if (r.owner !== undefined) return r.owner;
  const p = r.p;
  if (p.status === "independent" || p.status === "N/A" || String(p.owner) === String(p.gwcode)) return "";
  const list = byGw.get(String(p.owner)) || [];
  const hit = list.find((o) => activeOn(o, r.start)) || list.find((o) => activeOn(o, Math.max(r.start, o.start))) || list[0];
  return hit ? hit.name : "";
};
const csFeats = csParts.map((r, i) => dissolveFeat({ type: "Feature", properties: { i, keep: !!r.keep }, geometry: r.geometry }));
const csHi = topoFor(csFeats, CS_HI_KM, CS_HI_Q, false);
const csLo = topoFor(csFeats, LO_KM, LO_Q, false);
const labelMemo = new Map();
const csRows = csParts.map((r, i) => {
  const g = csHi.objects.p.geometries[i];
  const memoKey = (r.noLabel ? "n" : "") + JSON.stringify(g.arcs || g.coordinates || null);
  let label = labelMemo.get(memoKey);
  if (label === undefined) {
    const geom = r.noLabel ? null : client.feature(csHi, g).geometry;
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
  entry.wiki.set(y0, r.wiki || csWiki(r.name, y0));
  const cap = r.p.capname ? capitalOf(String(r.p.capname), +r.p.caplong, +r.p.caplat) : null;
  return [id, owner ? catId(owner) : -1, r.start, r.end, CS_STATUS[r.p.status] ?? 0, cap, label, String(r.p.gwcode), r.claims ? r.claims.map(catId) : null];
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
const keyLink = new Map();
const findKey = (k) => { while (keyLink.has(k)) k = keyLink.get(k); return k; };
const rawKey = (id) => nameKey.get(id) || baseKey(id);
const keyOf = (id) => findKey(rawKey(id));
let links = 0;
const NO_LINK = new Set(["Czechoslovakia|Czech Republic"]);
const COLOUR_FROM = [["Czechoslovakia", "1945-05-08", "Czech Republic"]];
{
  const life = new Map();
  const note = (name, a, z, polys, dep) => {
    const e = life.get(name);
    if (!e) { life.set(name, { a, z, first: polys, last: polys, depA: dep, depZ: dep }); return; }
    if (a < e.a) { e.a = a; e.first = polys; e.depA = dep; }
    if (z > e.z) { e.z = z; e.last = polys; e.depZ = dep; }
  };
  for (const s of dated) if (!s.small && !s.people) note(s.name, s.first, s.last + 1, s.polys, !!s.ruler);
  csParts.forEach((r) => note(r.name, 1886 + r.start / 365.2425, 1886 + ((r.end < 0 ? dayOf(CS_TO) : r.end) + 1) / 365.2425, polysOf(r.geometry), !!(r.p && r.p.status && r.p.status !== "independent")));
  const all = [...life.entries()];
  const ends = all.filter(([, e]) => e.z < 2019.9), starts = all.filter(([, e]) => e.a > DATED_FROM);
  const cells = new Map();
  const cellsFor = (key, polys) => { if (!cells.has(key)) { const c = cellsOf(polys); cells.set(key, { c, w: cellSum(c) }); } return cells.get(key); };
  for (const [an, A] of ends) {
    if (A.depZ) continue;
    const cands = starts.filter(([bn, B]) => bn !== an && !B.depA && Math.abs(B.a - A.z) <= 1.01);
    if (!cands.length) continue;
    const ca = cellsFor("z" + an, A.last);
    if (!ca.w) continue;
    for (const [bn, B] of cands) {
      if (NO_LINK.has(an + "|" + bn)) continue;
      const cb = cellsFor("a" + bn, B.first);
      if (!cb.w) continue;
      let both = 0;
      for (const i of ca.c) if (cb.c.has(i)) both += cellW(i);
      if (both >= 0.6 * ca.w && both >= 0.6 * cb.w) {
        const x = findKey(rawKey(catId(an))), y = findKey(rawKey(catId(bn)));
        if (x !== y) { keyLink.set(y.startsWith("L") && !x.startsWith("L") ? x : y, y.startsWith("L") && !x.startsWith("L") ? y : x); links++; }
      }
    }
  }
}
const edges = new Map(), weight = new Map();
const touch = new Set();
const addTouch = (a, b) => { if (a !== b) touch.add(a < b ? a + "|" + b : b + "|" + a); };
const addEdge = (a, b, w) => {
  if (a === b) return;
  const k = a < b ? a + "|" + b : b + "|" + a;
  edges.set(k, (edges.get(k) || 0) + w);
};
const SPREAD = [[60, -15, 150, 52]], SPREAD_KM = 1500, SPREAD_W = 0.06, KEEP_COST = 30, TOUCH_YEARS = 30;
const inSpread = (lon, lat) => SPREAD.some((b) => lon >= b[0] && lon <= b[2] && lat >= b[1] && lat <= b[3]);
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
    list.forEach((j) => { const b = hueOf(j); if (b) { addEdge(a, b, 1); addTouch(a, b); } });
  });
  const labs = rows.map((r, i) => (hueOf(i) && r[5] ? [hueOf(i), r[5][0], r[5][1], Math.sqrt(r[5][5])] : null)).filter(Boolean);
  for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) {
    const A = labs[i], B = labs[j];
    if (A[0] === B[0]) continue;
    const km = d3.geoDistance([A[1], A[2]], [B[1], B[2]]) * R_KM;
    if (km < (A[3] + B[3]) * 0.75 + 250) addEdge(A[0], B[0], 0.35);
    else if (inSpread(A[1], A[2]) && inSpread(B[1], B[2]) && km < A[3] + B[3] + SPREAD_KM) addEdge(A[0], B[0], SPREAD_W);
  }
}
const touchYears = new Map();
for (const ch of datedChunks) {
  const rows = ch.rows;
  const hueOf = (i) => (rows[i][7] || rows[i][10] ? null : keyOf(rows[i][1] >= 0 ? rows[i][1] : rows[i][0]));
  const yearsIn = (r) => Math.min(r[3], ch.to) - Math.max(r[2], ch.from) + 1;
  rows.forEach((r, i) => {
    const k = hueOf(i);
    if (k) weight.set(k, (weight.get(k) || 0) + (r[6] ? r[6][5] : 0) * Math.min(1, yearsIn(r) / 30));
  });
  const overlap = (a, b) => a[2] <= b[3] && b[2] <= a[3];
  const together = (a, b) => Math.min(a[3], b[3], ch.to) - Math.max(a[2], b[2], ch.from) + 1;
  client.neighbors(ch.lo.objects.p.geometries).forEach((list, i) => {
    list.forEach((j) => {
      if (j <= i || together(rows[i], rows[j]) <= 0) return;
      const a = hueOf(i), b = hueOf(j);
      if (!a || !b || a === b) return;
      const k = a < b ? a + "|" + b : b + "|" + a;
      touchYears.set(k, (touchYears.get(k) || 0) + together(rows[i], rows[j]));
    });
  });
  const labs = rows.map((r, i) => (hueOf(i) && r[6] && inSpread(r[6][0], r[6][1]) ? [hueOf(i), r[6][0], r[6][1], Math.sqrt(r[6][5]), r] : null)).filter(Boolean);
  for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) {
    const A = labs[i], B = labs[j];
    if (A[0] === B[0] || !overlap(A[4], B[4])) continue;
    if (d3.geoDistance([A[1], A[2]], [B[1], B[2]]) * R_KM < A[3] + B[3] + SPREAD_KM) addEdge(A[0], B[0], SPREAD_W);
  }
}
for (const [k, y] of touchYears) { const [a, b] = k.split("|"); addEdge(a, b, Math.min(1, y / TOUCH_YEARS)); addTouch(a, b); }
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
    list.forEach((j) => { if (j > i && !csRows[i][8] && !csRows[j][8] && overlap(csRows[i], csRows[j])) { addEdge(hueOf(i), hueOf(j), 1); addTouch(hueOf(i), hueOf(j)); } });
  });
  const labs = csRows.map((r, i) => (r[6] && inSpread(r[6][0], r[6][1]) ? [hueOf(i), r[6][0], r[6][1], Math.sqrt(r[6][5]), r] : null)).filter(Boolean);
  for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) {
    const A = labs[i], B = labs[j];
    if (A[0] === B[0] || !overlap(A[4], B[4])) continue;
    if (d3.geoDistance([A[1], A[2]], [B[1], B[2]]) * R_KM < A[3] + B[3] + SPREAD_KM) addEdge(A[0], B[0], SPREAD_W);
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
const BASE_COLOURS = {
  "Afghanistan": 6, "Albania": 1, "Angola": 5, "Argentina": 6, "Australia": 0, "Austria": 2, "Azerbaijan": 6,
  "Bangladesh": 5, "Belarus": 5, "Belgium": 0, "Benin": 5, "Bolivia": 0, "Bosnia-Herzegovina": 9,
  "Botswana": 9, "Brazil": 8, "Bulgaria": 7, "Burkina Faso": 2, "Cambodia": 4, "Cameroon": 4, "Canada": 9,
  "Central African Republic": 8, "Chad": 3, "Chile": 3, "China": 3, "Colombia": 4, "Congo": 3, "Costa Rica": 5,
  "Croatia": 6, "Cuba": 2, "Czech Republic": 0, "Côte d'Ivoire": 7, "DR Congo": 2, "Denmark": 3, "Ecuador": 8,
  "Egypt": 9, "Eritrea": 8, "Estonia": 4, "Ethiopia": 5, "Finland": 2, "France": 7, "Gabon": 9, "Germany": 9,
  "Ghana": 8, "Greece": 6, "Greenland": 3, "Guatemala": 9, "Guinea": 0, "Guyana": 4, "Honduras": 7,
  "Hungary": 1, "Iceland": 2, "India": 9, "Indonesia": 5, "Iran": 2, "Iraq": 5, "Ireland": 9, "Italy": 8,
  "Japan": 5, "Jordan": 3, "Kazakhstan": 7, "Kenya": 9, "Kosovo": 8, "Kyrgyzstan": 2, "Laos": 7, "Latvia": 9,
  "Liberia": 3, "Libya": 5, "Lithuania": 3, "Luxembourg": 8, "Madagascar": 6, "Malawi": 7, "Malaysia": 2,
  "Mali": 6, "Mauritania": 8, "Mexico": 4, "Moldova": 1, "Mongolia": 0, "Montenegro": 4, "Morocco": 7,
  "Mozambique": 8, "Myanmar": 2, "Namibia": 2, "Netherlands": 1, "New Zealand": 4, "Nicaragua": 1, "Niger": 7,
  "North Korea": 7, "North Macedonia": 3, "Norway": 6, "Oman": 5, "Pakistan": 1, "Papua New Guinea": 1,
  "Paraguay": 5, "Peru": 2, "Philippines": 9, "Poland": 4, "Portugal": 6, "Romania": 0, "Russia": 8,
  "Saudi Arabia": 7, "Senegal": 3, "Serbia": 2, "Sierra Leone": 7, "Slovakia": 7, "Slovenia": 5, "Somalia": 4,
  "South Africa": 6, "South Sudan": 0, "Spain": 0, "Sri Lanka": 4, "Suriname": 0, "Sweden": 7,
  "Switzerland": 3, "Syria": 0, "Tajikistan": 8, "Tanzania": 5, "Thailand": 0, "Tunisia": 3, "Turkey": 1,
  "Turkmenistan": 3, "Uganda": 7, "Ukraine": 6, "United Arab Emirates": 3, "United Kingdom": 3,
  "United States": 6, "Uruguay": 0, "Uzbekistan": 0, "Venezuela": 9, "Vietnam": 1, "Yemen": 2, "Zambia": 0,
  "Zimbabwe": 4
};
const prevColor = new Map();
try {
  const prevByName = new Map(JSON.parse(readFileSync(resolve(out, "eras.json"), "utf8")).polities.filter((p) => p[1] >= 0).map((p) => [p[0], p[1]]));
  for (const [to, froms] of renamedFrom) if (!prevByName.has(to)) for (const f of froms) if (prevByName.has(f)) { prevByName.set(to, prevByName.get(f)); break; }
  [true, false].forEach((pass) => catalogue.forEach((e, id) => { const k = keyOf(id); if (!!e.cs === pass && !prevColor.has(k) && prevByName.has(e.n)) prevColor.set(k, prevByName.get(e.n)); }));
} catch (e) { console.warn("No earlier eras.json, so colours are chosen afresh"); }
const seeded = new Set();
catalogue.forEach((e, id) => { if (e.cs && Object.hasOwn(BASE_COLOURS, e.n)) { const k = keyOf(id); prevColor.set(k, BASE_COLOURS[e.n]); seeded.add(k); } });
const stable = (k) => prevColor.has(k);
const order = [...weight.keys()].sort((a, b) => seeded.has(b) - seeded.has(a) || stable(b) - stable(a) || weight.get(b) - weight.get(a));
const color = new Map();
const used = new Array(PALETTE).fill(0);
const costOf = (k, c) => {
  let cost = used[c] * 1e-4;
  if (prevColor.has(k) && prevColor.get(k) !== c) cost += KEEP_COST;
  for (const [n, w] of adj.get(k) || []) {
    if (!color.has(n)) continue;
    const g = wheel(c, color.get(n));
    cost += Math.min(w, 1) * (g === 0 ? 100 : g === 1 ? 6 : g === 2 ? 1 : 0);
  }
  return cost;
};
const touchAdj = new Map();
for (const p of touch) { const [a, b] = p.split("|"); if (!touchAdj.has(a)) touchAdj.set(a, []); if (!touchAdj.has(b)) touchAdj.set(b, []); touchAdj.get(a).push(b); touchAdj.get(b).push(a); }
for (const k of order) {
  const was = prevColor.get(k);
  if (was !== undefined && (seeded.has(k) || !(touchAdj.get(k) || []).some((n) => color.get(n) === was))) { color.set(k, was); used[was]++; continue; }
  let best = 0, bestCost = Infinity;
  for (let c = 0; c < PALETTE; c++) { const cost = costOf(k, c); if (cost < bestCost) { bestCost = cost; best = c; } }
  color.set(k, best);
  used[best]++;
}
const touchOf = new Map();
for (const p of touch) { const [a, b] = p.split("|"); if (!color.has(a) || !color.has(b)) continue; if (!touchOf.has(a)) touchOf.set(a, []); if (!touchOf.has(b)) touchOf.set(b, []); touchOf.get(a).push(b); touchOf.get(b).push(a); }
const namesIn = new Map();
catalogue.forEach((e, id) => { const k = keyOf(id); namesIn.set(k, (namesIn.get(k) || 0) + 1); });
const clashes = () => [...touch].filter((p) => { const [a, b] = p.split("|"); return color.has(a) && color.get(a) === color.get(b); });
const greedyList = clashes(), greedyClash = greedyList.length;
const freeFor = (k) => { const taken = new Set((touchOf.get(k) || []).map((n) => color.get(n))); return taken.size < PALETTE - (taken.has(color.get(k)) ? 0 : 1); };
const free = greedyList.filter((p) => p.split("|").some(freeFor)).length;
const keptAll = [...color].filter(([k, c]) => prevColor.get(k) === c).length, hadColour = [...color.keys()].filter((k) => prevColor.has(k)).length;
let repaired = 0;
for (let round = 0; round < 10; round++) {
  let moved = false;
  for (const p of clashes()) {
    const [a, b] = p.split("|");
    if (color.get(a) !== color.get(b)) continue;
    const sides = [a, b].filter((x) => !seeded.has(x)).sort((x, y) => (namesIn.get(x) || 0) - (namesIn.get(y) || 0) || (weight.get(x) || 0) - (weight.get(y) || 0));
    for (const k of sides) {
      const taken = new Set((touchOf.get(k) || []).map((n) => color.get(n)));
      let best = -1, bestCost = Infinity;
      for (let c = 0; c < PALETTE; c++) { if (taken.has(c)) continue; const cost = costOf(k, c); if (cost < bestCost) { bestCost = cost; best = c; } }
      if (best >= 0) { used[color.get(k)]--; color.set(k, best); used[best]++; repaired++; moved = true; break; }
    }
  }
  if (!moved) break;
}
const freeColour = (k, not) => { const taken = new Set((touchOf.get(k) || []).map((n) => color.get(n))); let best = -1, bestCost = Infinity; for (let c = 0; c < PALETTE; c++) { if (taken.has(c) || c === not) continue; const cost = costOf(k, c); if (cost < bestCost) { bestCost = cost; best = c; } } return best; };
for (const p of clashes()) {
  const [a, b] = p.split("|");
  if (color.get(a) !== color.get(b)) continue;
  let plan = null;
  for (const k of [a, b].filter((x) => !seeded.has(x))) for (let c = 0; c < PALETTE; c++) {
    if (c === color.get(k)) continue;
    const blockers = (touchOf.get(k) || []).filter((n) => color.get(n) === c);
    const moves = blockers.map((n) => [n, freeColour(n, c)]);
    if (moves.some(([, m]) => m < 0) || moves.some(([n]) => seeded.has(n) || (touchOf.get(n) || []).some((x) => blockers.includes(x)))) continue;
    const cost = moves.reduce((t, [n]) => t + (namesIn.get(n) || 0), namesIn.get(k) || 0);
    if (!plan || cost < plan.cost) plan = { k, c, moves, cost };
  }
  if (plan) { for (const [n, m] of plan.moves) { used[color.get(n)]--; color.set(n, m); used[m]++; repaired++; } used[color.get(plan.k)]--; color.set(plan.k, plan.c); used[plan.c]++; repaired++; }
}
const left = clashes();
const clash = left.length;
if (left.length) console.log("touching pairs left in one colour, with every colour taken round both, even after moving their neighbours: " + left.map((p) => p.split("|").map((k) => (catalogue[+k.slice(1)] && k[0] === "N" ? catalogue[+k.slice(1)].n : LINEAGE[+k.slice(1)] ? LINEAGE[+k.slice(1)][0] : k)).join(" and ")).join("; "));
console.log("colours: " + keptAll + " of " + hadColour + " keys with an earlier colour keep it after the greedy pass, " + greedyClash + " touching pairs in one colour (" + free + " where a free colour existed), " + repaired + " keys recoloured, " + clash + " left");

const baseColour = (id) => { const k = keyOf(id); return color.has(k) ? color.get(k) : -1; };
const colourFrom = new Map();
for (const [name, from, like] of COLOUR_FROM) colourFrom.set(catId(name), [[dayOf(from), baseColour(catId(like))]]);
const stepAt = (steps, t, base) => { let c = base; if (steps) for (const [a, k] of steps) if (t >= a) c = k; return c; };
const wheelCost = (a, b) => { const d = Math.min((a - b + PALETTE) % PALETTE, (b - a + PALETTE) % PALETTE); return d === 0 ? 100 : d === 1 ? 6 : d === 2 ? 1 : 0; };
const WINDOW_MAX_KM2 = 3e6;
function windowColours(units, pairs, fixed, gap) {
  const over = new Map(), size = new Map();
  units.forEach((u) => { if (u) size.set(u.hue, Math.max(size.get(u.hue) || 0, u.w)); });
  const colourAt = (hue, t) => { const l = over.get(hue); if (l) for (const [a, b, c] of l) if (t >= a && t <= b) return c; return fixed(hue, t); };
  const adj = new Map(), byHue = new Map();
  for (const [i, j] of pairs) {
    if (!units[i] || !units[j]) continue;
    if (!adj.has(i)) adj.set(i, []); if (!adj.has(j)) adj.set(j, []);
    adj.get(i).push(j); adj.get(j).push(i);
  }
  units.forEach((u, i) => { if (u) { if (!byHue.has(u.hue)) byHue.set(u.hue, []); byHue.get(u.hue).push(i); } });
  const clashes = [];
  for (const [i, j] of pairs) {
    const A = units[i], B = units[j];
    if (!A || !B || A.hue === B.hue) continue;
    const a = Math.max(A.first, B.first), b = Math.min(A.last, B.last);
    if (a <= b) clashes.push([i, j, a, b]);
  }
  clashes.sort((x, y) => x[2] - y[2]);
  let fixedCount = 0;
  const pick = (hue, a, b) => {
    const taken = new Map();
    for (const m of byHue.get(hue) || []) {
      const me = units[m];
      if (me.last < a || me.first > b) continue;
      for (const o of adj.get(m) || []) {
        const other = units[o];
        if (other.hue === hue) continue;
        const s0 = Math.max(me.first, other.first, a), e0 = Math.min(me.last, other.last, b);
        if (s0 > e0) continue;
        for (const t of [s0, Math.floor((s0 + e0) / 2), e0]) { const c = colourAt(other.hue, t); if (c >= 0) taken.set(c, (taken.get(c) || 0) + 1); }
      }
    }
    const base = fixed(hue, a);
    let best = -1, bestCost = Infinity;
    for (let c = 0; c < PALETTE; c++) {
      if (c === base) continue;
      let cost = 0;
      for (const [t, n] of taken) cost += wheelCost(c, t) * n;
      cost += Math.min((c - base + PALETTE) % PALETTE, (base - c + PALETTE) % PALETTE) * 0.01;
      if (cost < bestCost) { bestCost = cost; best = c; }
    }
    return best;
  };
  for (let pass = 0; pass < 2; pass++) for (const [i, j, a, b] of clashes) {
    const A = units[i], B = units[j];
    const sameAt = (t) => { const ca = colourAt(A.hue, t); return ca >= 0 && ca === colourAt(B.hue, t); };
    const at = [a, Math.floor((a + b) / 2), b].filter(sameAt);
    if (!at.length) continue;
    const can = [A, B].filter((u) => size.get(u.hue) <= WINDOW_MAX_KM2);
    if (!can.length) continue;
    const side = can.length === 1 ? can[0] : A.free && !B.free ? A : B.free && !A.free ? B : size.get(A.hue) <= size.get(B.hue) ? A : B;
    if (!over.has(side.hue)) over.set(side.hue, []);
    const mine = over.get(side.hue), near = mine.find((w) => w[0] - gap <= b && a <= w[1] + gap);
    if (near) {
      near[0] = Math.min(near[0], a); near[1] = Math.max(near[1], b);
      near[2] = -1; near[2] = pick(side.hue, near[0], near[1]);
    } else {
      const w = [a, b, -1];
      mine.push(w);
      w[2] = pick(side.hue, a, b);
    }
    fixedCount++;
  }
  return { over, count: fixedCount };
}
const toSteps = (wins, base, first) => {
  const steps = first ? first.slice() : [];
  for (const [a, b, c] of wins.slice().sort((x, y) => x[0] - y[0])) {
    const after = stepAt(steps, b + 1, base);
    steps.push([a, c], [b + 1, after]);
    steps.sort((x, y) => x[0] - y[0]);
  }
  return steps;
};
const modernWins = (() => {
  const units = csRows.map((r) => (r[8] ? null : { hue: r[1] >= 0 ? r[1] : r[0], first: r[2], last: r[3] < 0 ? dayOf(CS_TO) : r[3], free: r[1] < 0, w: r[6] ? r[6][5] : 0 }));
  const pairs = [];
  client.neighbors(csLo.objects.p.geometries).forEach((list, i) => list.forEach((j) => { if (j > i) pairs.push([i, j]); }));
  return windowColours(units, pairs, (hue, t) => stepAt(colourFrom.get(hue), t, baseColour(hue)), 3650);
})();
const datedWins = (() => {
  const units = [], pairs = [];
  for (const ch of datedChunks) {
    const off = units.length;
    ch.rows.forEach((r) => units.push(r[7] || r[10] ? null : { hue: r[1] >= 0 ? r[1] : r[0], first: Math.max(r[2], ch.from), last: Math.min(r[3], ch.to), free: r[1] < 0, w: r[6] ? r[6][5] : 0 }));
    client.neighbors(ch.lo.objects.p.geometries).forEach((list, i) => list.forEach((j) => { if (j > i) pairs.push([off + i, off + j]); }));
  }
  return windowColours(units, pairs, (hue) => baseColour(hue), 10);
})();
console.log("colours by date: " + modernWins.count + " stretches from 1886 and " + datedWins.count + " from 1400 to 1885 where a state takes another colour while it touches a neighbour of its own colour");
const entries = catalogue.map((e, id) => {
  const k = keyOf(id);
  const wikis = [...new Set(e.wiki.values())];
  const steps = [];
  [...e.wiki.entries()].sort((a, b) => a[0] - b[0]).forEach(([y, t]) => { if (!steps.length || steps[steps.length - 1][1] !== t) steps.push([y, t]); });
  const wiki = wikis.length <= 1 ? wikis[0] || e.n : steps;
  const row = [e.n, color.has(k) ? color.get(k) : -1, e.years.sort((a, b) => a - b), wiki, e.kind, e.cs || null, e.dated || null];
  const base = row[1], days = modernWins.over.has(id) ? toSteps(modernWins.over.get(id), base, colourFrom.get(id)) : colourFrom.get(id) || null;
  const years = datedWins.over.has(id) ? toSteps(datedWins.over.get(id), base, null) : null;
  if (days || years) row.push(days);
  if (years) row.push(years);
  return row;
});
writeFileSync(resolve(out, "modern.json"), JSON.stringify({ from: CS_FROM, to: CS_TO, rows: csRows.map((r) => (r[8] ? r.slice(0, 7).concat([r[8]]) : r.slice(0, 7))), hi: csHi, lo: csLo }));
writeFileSync(resolve(out, "eras.json"), JSON.stringify({ first: FIRST, maps: index, modern: { file: "modern.json", from: CS_FROM, to: CS_TO, changes: csChanges }, dated: { from: DATED_FROM, to: DATED_TO, chunks: datedChunks.map((c) => [c.from, c.file]), changes: datedChanges }, polities: entries }));

const landGeom = client.merge(prov, prov.objects.provinces.geometries);
const polys = landGeom.coordinates.filter((poly) => d3.geoArea({ type: "Polygon", coordinates: poly }) * R_KM * R_KM > 4);
const land = { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: polys } }] };
const landTopo = (km, q) => {
  const t = server.topology({ land }, q);
  return client.quantize(stripZ(simplify.simplify(simplify.presimplify(t, simplify.sphericalTriangleArea), weightFor(km))), q);
};
writeFileSync(resolve(out, "land.json"), JSON.stringify({ hi: landTopo(0.6, 5e5), lo: landTopo(LO_KM, LO_Q) }));
{
  const detailPath = provincesPath.replace(/provinces\.json$/, "provinces-detail.json");
  if (detailPath === provincesPath || !existsSync(detailPath)) console.warn("UCHRONIA's provinces-detail.json not found beside provinces.json, so data/land-detail.json is not written: " + detailPath);
  else {
    const detail = JSON.parse(readFileSync(detailPath, "utf8"));
    const fineGeom = client.merge({ ...prov, arcs: detail.arcs, transform: detail.transform }, prov.objects.provinces.geometries);
    const fine = { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: fineGeom.coordinates.filter((poly) => d3.geoArea({ type: "Polygon", coordinates: poly }) * R_KM * R_KM > 4) } }] };
    const t = server.topology({ land: fine }, FINE_Q);
    writeFileSync(resolve(out, "land-detail.json"), JSON.stringify(client.quantize(stripZ(simplify.simplify(simplify.presimplify(t, simplify.sphericalTriangleArea), weightFor(FINE_KM))), FINE_Q)));
  }
}

const licence = resolve(source, "../LICENSE");
if (existsSync(licence)) copyFileSync(licence, resolve(out, "COPYING-historical-basemaps.txt"));
else console.warn("historical-basemaps LICENSE not found beside " + source + "; data/COPYING-historical-basemaps.txt not written");

console.log(dissolved + " spans had pieces over each other and were dissolved, " + unionDropped + " pieces could not be joined and were left out");
console.log("smoothed " + stairArcs + " stair-stepped arcs");
console.log(index.length + " maps to " + index[index.length - 1][0] + ", " + dated.length + " dated spans from " + DATED_FROM + " to " + DATED_TO + " in " + datedChunks.length + " files with " + datedChanges.length + " change years, " + links + " colour links by succession, " + csRows.length + " CShapes records from 1886 with " + csChanges.length + " change dates, " + catalogue.length + " names, " + color.size + " colour keys, " + clash + " touching pairs share a colour");

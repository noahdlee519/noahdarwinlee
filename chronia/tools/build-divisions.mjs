import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const modules = resolve(process.argv[2] || "node_modules");
const ahcbPath = resolve(process.argv[3] || "histstates.geojson");
const provincesPath = resolve(process.argv[4] || resolve(here, "../../uchronia/data/provinces.json"));
const out = resolve(here, "../data");
const require = createRequire(resolve(modules, "x.js"));
const server = require("topojson-server");
const client = require("topojson-client");
const simplify = require("topojson-simplify");
const d3 = require("d3-geo");
const clip = require("polygon-clipping");

const DAY0 = Date.UTC(1886, 0, 1);
const dayOf = (iso) => { const [y, m, d] = iso.slice(0, 10).split("-").map(Number); return Math.round((Date.UTC(y, m - 1, d) - DAY0) / 86400000); };
const R_KM = 6371.0088, KM_DEG = 111.195;
const HI_KM = 0.5, LO_KM = 12, HI_Q = 2e5;
const weightFor = (km) => (km / R_KM) ** 2;
const AHCB_END = "2000-12-31";

const OPEN = null;
const span = (name, ne, first, last) => ({ name, ne: Array.isArray(ne) ? ne : [ne], first, last: last || OPEN });
const same = (first, list, last) => list.map((n) => span(Array.isArray(n) ? n[0] : n, Array.isArray(n) ? n[1] : n, first, last));

const FR_OLD = {
  "Alsace": ["Bas-Rhin", "Haut-Rhin"],
  "Lorraine": ["Meurthe-et-Moselle", "Meuse", "Moselle", "Vosges"],
  "Champagne-Ardenne": ["Ardennes", "Aube", "Marne", "Haute-Marne"],
  "Nord-Pas-de-Calais": ["Nord", "Pas-de-Calais"],
  "Picardy": ["Aisne", "Oise", "Somme"],
  "Lower Normandy": ["Calvados", "Manche", "Orne"],
  "Upper Normandy": ["Eure", "Seine-Maritime"],
  "Aquitaine": ["Dordogne", "Gironde", "Landes", "Lot-et-Garonne", "Pyrenees-Atlantics"],
  "Limousin": ["Corrèze", "Creuse", "Haute-Vienne"],
  "Poitou-Charentes": ["Charente", "Charente-Maritime", "Deux-Sèvres", "Vienne"],
  "Languedoc-Roussillon": ["Aude", "Gard", "Hérault", "Lozère", "Pyrénées-Orientales"],
  "Midi-Pyrénées": ["Ariège", "Aveyron", "Haute-Garonne", "Gers", "Lot", "Hautes-Pyrénées", "Tarn", "Tarn-et-Garonne"],
  "Auvergne": ["Allier", "Cantal", "Haute-Loire", "Puy-de-Dôme"],
  "Rhône-Alpes": ["Ain", "Ardèche", "Drôme", "Isère", "Loire", "Rhône", "Savoie", "Haute-Savoie"],
  "Burgundy": ["Côte-d’Or", "Nièvre", "Saône-et-Loire", "Yonne"],
  "Franche-Comté": ["Doubs", "Jura", "Haute-Saône", "Territoire de Belfort"],
  "Brittany": ["Côtes-d'Armor", "Finistère", "Ille-et-Vilaine", "Morbihan"],
  "Centre": ["Cher", "Eure-et-Loir", "Indre", "Indre-et-Loire", "Loir-et-Cher", "Loiret"],
  "Corsica": ["Corse-du-Sud", "Haute-Corse"],
  "Île-de-France": ["Paris", "Seine-et-Marne", "Yvelines", "Essonne", "Hauts-de-Seine", "Seine-Saint-Denis", "Val-de-Marne", "Val-d'Oise"],
  "Pays de la Loire": ["Loire-Atlantique", "Maine-et-Loire", "Mayenne", "Sarthe", "Vendée"],
  "Provence-Alpes-Côte d'Azur": ["Alpes-de-Haute-Provence", "Hautes-Alpes", "Alpes-Maritimes", "Bouches-du-Rhône", "Var", "Vaucluse"]
};
const frOld = (...names) => names.flatMap((n) => FR_OLD[n]);
const FR_MERGED = [
  ["Alsace-Champagne-Ardenne-Lorraine", "Grand Est", ["Alsace", "Champagne-Ardenne", "Lorraine"]],
  ["Nord-Pas-de-Calais-Picardie", "Hauts-de-France", ["Nord-Pas-de-Calais", "Picardy"]],
  ["Normandy", "Normandy", ["Lower Normandy", "Upper Normandy"]],
  ["Aquitaine-Limousin-Poitou-Charentes", "Nouvelle-Aquitaine", ["Aquitaine", "Limousin", "Poitou-Charentes"]],
  ["Languedoc-Roussillon-Midi-Pyrénées", "Occitania", ["Languedoc-Roussillon", "Midi-Pyrénées"]],
  ["Auvergne-Rhône-Alpes", "Auvergne-Rhône-Alpes", ["Auvergne", "Rhône-Alpes"]],
  ["Bourgogne-Franche-Comté", "Bourgogne-Franche-Comté", ["Burgundy", "Franche-Comté"]]
];
const ES_COMMUNITIES = [
  ["Andalusia", ["Almería", "Cádiz", "Córdoba", "Granada", "Huelva", "Jaén", "Málaga", "Seville"]],
  ["Aragon", ["Huesca", "Teruel", "Zaragoza"]],
  ["Asturias", ["Asturias"]],
  ["Balearic Islands", ["Balearic Islands"]],
  ["Basque Country", ["Araba / Álava", "Biscay", "Gipuzkoa"]],
  ["Canary Islands", ["Las Palmas", "Santa Cruz de Tenerife"]],
  ["Cantabria", ["Cantabria"]],
  ["Castile and León", ["Ávila", "Burgos", "León", "Palencia", "Salamanca", "Segovia", "Soria", "Valladolid", "Zamora"]],
  ["Castilla–La Mancha", ["Albacete", "Ciudad Real", "Cuenca", "Guadalajara", "Toledo"]],
  ["Catalonia", ["Barcelona", "Girona", "Lleida", "Tarragona"]],
  ["Extremadura", ["Badajoz", "Cáceres"]],
  ["Galicia", ["A Coruña", "Lugo", "Ourense", "Pontevedra"]],
  ["La Rioja", ["La Rioja"]],
  ["Community of Madrid", ["Community of Madrid"]],
  ["Region of Murcia", ["Murcia"]],
  ["Navarre", ["Navarre"]],
  ["Valencian Community", ["Alicante", "Castellón", "Valencia"]]
];

const NE_REGIONS = [
  {
    key: "ca", c: "CAN", names: ["Canada"],
    parts: [
      ...same("1912-05-15", ["British Columbia", "Alberta", "Saskatchewan", "Manitoba", "Ontario", "Quebec", "New Brunswick", "Nova Scotia", "Prince Edward Island"]),
      span("Yukon Territory", "Yukon", "1912-05-15", "2003-03-31"),
      span("Yukon", "Yukon", "2003-04-01"),
      span("Northwest Territories", ["Northwest Territories", "Nunavut"], "1912-05-15", "1999-03-31"),
      span("Northwest Territories", "Northwest Territories", "1999-04-01"),
      span("Nunavut", "Nunavut", "1999-04-01"),
      span("Newfoundland", "Newfoundland and Labrador", "1949-03-31", "2001-12-05"),
      span("Newfoundland and Labrador", "Newfoundland and Labrador", "2001-12-06")
    ]
  },
  {
    key: "au", c: "AUS", names: ["Australia"],
    parts: [
      span("New South Wales", ["New South Wales", "Australian Capital Territory", "Jervis Bay Territory", "Lord Howe Island"], "1901-01-01", "1910-12-31"),
      span("New South Wales", ["New South Wales", "Jervis Bay Territory", "Lord Howe Island"], "1911-01-01"),
      span("Federal Capital Territory", "Australian Capital Territory", "1911-01-01", "1938-07-28"),
      span("Australian Capital Territory", "Australian Capital Territory", "1938-07-29"),
      ...same("1901-01-01", ["Victoria", "Queensland", "Western Australia", ["Tasmania", ["Tasmania", "Macquarie Island"]]]),
      span("South Australia", ["South Australia", "Northern Territory"], "1901-01-01", "1910-12-31"),
      span("South Australia", "South Australia", "1911-01-01"),
      span("Northern Territory", "Northern Territory", "1911-01-01", "1927-02-28"),
      Object.assign(span("North Australia", "Northern Territory", "1927-03-01", "1931-06-11"), { cut: [[120, -20], [145, -5]] }),
      Object.assign(span("Central Australia", "Northern Territory", "1927-03-01", "1931-06-11"), { cut: [[120, -30], [145, -20]] }),
      span("Northern Territory", "Northern Territory", "1931-06-12")
    ]
  },
  {
    key: "mx", c: "MEX", names: ["Mexico"],
    parts: [
      ...same("1935-01-11", ["Sonora", "Chihuahua", "Coahuila", "Tamaulipas", "Nuevo León", "Campeche", "Tabasco", "Chiapas", "Colima", "Nayarit", "Sinaloa", "Yucatán", "Veracruz", "Jalisco", "Michoacán", "Guerrero", "Oaxaca", "State of Mexico", "Puebla", "Morelos", "Querétaro", "Hidalgo", "Guanajuato", "San Luis Potosí", "Zacatecas", "Aguascalientes", "Durango", "Tlaxcala"]),
      span("Territory of Baja California Norte", "Baja California", "1935-01-11", "1952-01-15"),
      span("Baja California", "Baja California", "1952-01-16"),
      span("Territory of Baja California Sur", "Baja California Sur", "1935-01-11", "1974-10-07"),
      span("Baja California Sur", "Baja California Sur", "1974-10-08"),
      span("Territory of Quintana Roo", "Quintana Roo", "1935-01-11", "1974-10-07"),
      span("Quintana Roo", "Quintana Roo", "1974-10-08"),
      span("Federal District", "Mexico City", "1935-01-11", "2016-01-28"),
      span("Mexico City", "Mexico City", "2016-01-29")
    ]
  },
  {
    key: "de", c: "DEU", names: ["West Germany", "Germany"],
    parts: [
      ...same("1952-04-25", ["Schleswig-Holstein", "Hamburg", "Lower Saxony", ["Bremen", "Free Hanseatic Bremen"], "North Rhine-Westphalia", "Hesse", "Rhineland-Palatinate", "Baden-Württemberg", "Bavaria"]),
      span("Saarland", "Saarland", "1957-01-01"),
      ...same("1990-10-03", ["Berlin", "Brandenburg", "Mecklenburg-Western Pomerania", "Saxony", "Saxony-Anhalt", "Thuringia"])
    ]
  },
  {
    key: "at", c: "AUT", names: ["Austria"],
    parts: same("1958-01-01", ["Lower Austria", "Upper Austria", "Burgenland", "Vorarlberg", "Tyrol", "Salzburg", "Carinthia", "Styria", "Vienna"])
  },
  {
    key: "cn", c: "CHN", names: ["China"],
    parts: [
      ...same("1988-04-26", ["Xinjiang", "Tibet", "Inner Mongolia", "Gansu", "Yunnan", "Heilongjiang", "Jilin", "Liaoning", "Guangxi", "Guangdong", ["Hainan", ["Hainan", "Paracel Islands"]], "Fujian", "Zhejiang", "Shanghai", "Jiangsu", "Shandong", "Hebei", "Tianjin", "Beijing", "Guizhou", "Hunan", "Ningxia", "Shaanxi", "Qinghai", "Shanxi", "Jiangxi", "Henan", "Hubei", "Anhui"]),
      span("Sichuan", ["Sichuan", "Chongqing"], "1988-04-26", "1997-03-13"),
      span("Sichuan", "Sichuan", "1997-03-14"),
      span("Chongqing", "Chongqing", "1997-03-14")
    ]
  },
  {
    key: "in", c: "IND", names: ["India"],
    parts: [
      ...same("1987-05-30", ["Arunachal Pradesh", "Sikkim", "West Bengal", "Assam", "Nagaland", "Manipur", "Mizoram", "Tripura", "Meghalaya", "Punjab", "Rajasthan", "Gujarat", "Himachal Pradesh", "Maharashtra", "Goa", "Karnataka", "Kerala", "Tamil Nadu", "Lakshadweep", "Andaman and Nicobar Islands", "Delhi", "Chandigarh", "Haryana"]),
      span("Jammu and Kashmir", ["Jammu and Kashmir", "Ladakh"], "1987-05-30", "2019-10-30"),
      span("Jammu and Kashmir", "Jammu and Kashmir", "2019-10-31"),
      span("Ladakh", "Ladakh", "2019-10-31"),
      span("Madhya Pradesh", ["Madhya Pradesh", "Chhattisgarh"], "1987-05-30", "2000-10-31"),
      span("Madhya Pradesh", "Madhya Pradesh", "2000-11-01"),
      span("Chhattisgarh", "Chhattisgarh", "2000-11-01"),
      span("Uttar Pradesh", ["Uttar Pradesh", "Uttarakhand"], "1987-05-30", "2000-11-08"),
      span("Uttar Pradesh", "Uttar Pradesh", "2000-11-09"),
      span("Uttaranchal", "Uttarakhand", "2000-11-09", "2006-12-31"),
      span("Uttarakhand", "Uttarakhand", "2007-01-01"),
      span("Bihar", ["Bihar", "Jharkhand"], "1987-05-30", "2000-11-14"),
      span("Bihar", "Bihar", "2000-11-15"),
      span("Jharkhand", "Jharkhand", "2000-11-15"),
      span("Andhra Pradesh", ["Andhra Pradesh", "Telangana"], "1987-05-30", "2014-06-01"),
      span("Andhra Pradesh", "Andhra Pradesh", "2014-06-02"),
      span("Telangana", "Telangana", "2014-06-02"),
      span("Orissa", "Odisha", "1987-05-30", "2011-10-31"),
      span("Odisha", "Odisha", "2011-11-01"),
      span("Pondicherry", "Puducherry", "1987-05-30", "2006-09-30"),
      span("Puducherry", "Puducherry", "2006-10-01"),
      Object.assign(span("Dadra and Nagar Haveli", "Dadra and Nagar Haveli and Daman and Diu", "1987-05-30", "2020-01-25"), { pick: (c) => c[0] > 72.9 && c[1] < 20.37 }),
      Object.assign(span("Daman and Diu", "Dadra and Nagar Haveli and Daman and Diu", "1987-05-30", "2020-01-25"), { pick: (c) => !(c[0] > 72.9 && c[1] < 20.37) }),
      span("Dadra and Nagar Haveli and Daman and Diu", "Dadra and Nagar Haveli and Daman and Diu", "2020-01-26")
    ]
  },
  {
    key: "br", c: "BRA", names: ["Brazil"],
    parts: [
      ...same("1975-03-15", ["Acre", "Alagoas", "Amazonas", "Bahia", "Ceará", "Espírito Santo", "Maranhão", "Minas Gerais", "Paraná", "Paraíba", "Pará", "Pernambuco", "Piauí", "Rio Grande do Norte", "Rio Grande do Sul", "Rio de Janeiro", "Santa Catarina", "Sergipe", "São Paulo", ["Federal District", "Federal"]]),
      span("Mato Grosso", ["Mato Grosso", "Mato Grosso do Sul"], "1975-03-15", "1978-12-31"),
      ...same("1979-01-01", ["Mato Grosso", "Mato Grosso do Sul"]),
      span("Goiás", ["Goiás", "Tocantins"], "1975-03-15", "1988-10-04"),
      ...same("1988-10-05", ["Goiás", "Tocantins"]),
      span("Territory of Rondônia", "Rondônia", "1975-03-15", "1982-01-03"),
      span("Rondônia", "Rondônia", "1982-01-04"),
      span("Territory of Roraima", "Roraima", "1975-03-15", "1988-10-04"),
      span("Roraima", "Roraima", "1988-10-05"),
      span("Territory of Amapá", "Amapá", "1975-03-15", "1988-10-04"),
      span("Amapá", "Amapá", "1988-10-05")
    ]
  },
  {
    key: "ar", c: "ARG", names: ["Argentina"],
    parts: [
      ...same("1956-01-01", ["Buenos Aires", "Catamarca", "Chaco", "Chubut", "Corrientes", "Córdoba", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tucumán"]),
      span("National Territory of Tierra del Fuego", "Tierra del Fuego", "1956-01-01", "1990-04-25"),
      span("Tierra del Fuego", "Tierra del Fuego", "1990-04-26"),
      span("Federal Capital", "Buenos Aires City", "1956-01-01", "1996-09-30"),
      span("Buenos Aires City", "Buenos Aires City", "1996-10-01")
    ]
  },
  {
    key: "es", c: "ESP", names: ["Spain"],
    parts: [
      ...ES_COMMUNITIES.map(([n, ps]) => span(n, ps, "1983-02-25")),
      ...same("1995-03-14", ["Ceuta", "Melilla"])
    ]
  },
  {
    key: "fr", c: "FRA", names: ["France"],
    parts: [
      ...Object.keys(FR_OLD).filter((n) => !FR_MERGED.some((m) => m[2].includes(n))).map((n) => span(n, FR_OLD[n], "1970-01-09", n === "Centre" ? "2015-01-16" : null)),
      span("Centre-Val de Loire", FR_OLD["Centre"], "2015-01-17"),
      ...FR_MERGED.flatMap(([interim, final, olds]) => [
        ...olds.map((n) => span(n, FR_OLD[n], "1970-01-09", "2015-12-31")),
        ...(interim === final ? [span(final, frOld(...olds), "2016-01-01")] : [span(interim, frOld(...olds), "2016-01-01", "2016-09-29"), span(final, frOld(...olds), "2016-09-30")])
      ]),
      ...same("1970-01-09", ["Guadeloupe", "Martinique", "French Guiana", "Réunion"]),
      span("Mayotte", "Mayotte", "2011-03-31")
    ]
  },
  {
    key: "jp", c: "JPN", names: ["Japan"],
    parts: [
      ...same("1893-04-01", ["Aichi Prefecture", "Akita Prefecture", "Aomori Prefecture", "Chiba Prefecture", "Ehime Prefecture", "Fukui Prefecture", "Fukuoka Prefecture", "Fukushima Prefecture", "Gifu Prefecture", "Gunma Prefecture", "Hiroshima Prefecture", "Hokkaidō", "Hyōgo Prefecture", "Ibaraki Prefecture", "Ishikawa Prefecture", "Iwate Prefecture", "Kagawa Prefecture", "Kagoshima Prefecture", "Kanagawa Prefecture", "Kumamoto Prefecture", "Kyōto Prefecture", "Kōchi Prefecture", "Mie Prefecture", "Miyagi Prefecture", "Miyazaki Prefecture", "Nagano Prefecture", "Nagasaki Prefecture", "Nara Prefecture", "Niigata Prefecture", "Okayama Prefecture", "Okinawa Prefecture", "Saga Prefecture", "Saitama Prefecture", "Shiga Prefecture", "Shimane Prefecture", "Shizuoka Prefecture", "Tochigi Prefecture", "Tokushima Prefecture", "Tottori Prefecture", "Toyama Prefecture", "Wakayama Prefecture", "Yamagata Prefecture", "Yamaguchi Prefecture", "Yamanashi Prefecture", "Ōita Prefecture", "Ōsaka Prefecture"]),
      span("Tokyo Prefecture", "Tokyo", "1893-04-01", "1943-06-30"),
      span("Tokyo", "Tokyo", "1943-07-01")
    ]
  },
  {
    key: "ng", c: "NGA", names: ["Nigeria"],
    parts: same("1996-10-01", ["Abia State", "Adamawa State", "Akwa Ibom State", "Anambra State", "Bauchi State", "Bayelsa State", "Benue State", "Borno State", "Cross River State", "Delta State", "Ebonyi State", "Edo State", "Ekiti State", "Enugu State", "Federal Capital Territory", "Gombe State", "Imo State", "Jigawa State", "Kaduna State", "Kano State", "Katsina State", "Kebbi State", "Kogi State", "Kwara State", "Lagos", "Nasarawa State", "Niger State", "Ogun State", "Ondo State", "Osun State", "Oyo State", "Plateau State", "Rivers State", "Sokoto State", "Taraba State", "Yobe State", "Zamfara State"])
  }
];

function rewind(g) {
  const fix = (poly) => {
    const a = d3.geoArea({ type: "Polygon", coordinates: [poly[0]] });
    if (a > 2 * Math.PI) poly = poly.map((r) => r.slice().reverse());
    return poly;
  };
  if (g.type === "Polygon") return { type: "Polygon", coordinates: fix(g.coordinates) };
  if (g.type === "MultiPolygon") return { type: "MultiPolygon", coordinates: g.coordinates.map(fix) };
  return g;
}
function polysOf(g) { return !g ? [] : g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []; }

function splitAt(geo, lats) {
  const ring = (r) => {
    const out = [r[0]];
    for (let i = 1; i < r.length; i++) {
      const a = r[i - 1], b = r[i];
      for (const y of lats) {
        if ((a[1] < y && b[1] > y) || (a[1] > y && b[1] < y)) out.push([a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]), y]);
      }
      out.push(b);
    }
    return out;
  };
  return { type: geo.type, coordinates: geo.type === "Polygon" ? geo.coordinates.map(ring) : geo.coordinates.map((p) => p.map(ring)) };
}
function stripZ(topo) {
  topo.arcs = topo.arcs.map((arc) => arc.map((p) => [p[0], p[1]]));
  return topo;
}
function topoFor(feats, spans) {
  const topo = server.topology({ d: { type: "FeatureCollection", features: feats } }, HI_Q);
  const pre = simplify.presimplify(topo, simplify.sphericalTriangleArea);
  const users = pre.arcs.map(() => []);
  const walk = (g, a) => { if (typeof a === "number") { const i = a < 0 ? ~a : a; if (!users[i].includes(g)) users[i].push(g); } else for (const x of a) walk(g, x); };
  pre.objects.d.geometries.forEach((g, i) => { if (g.arcs) walk(i, g.arcs); });
  const meet = (a, b) => spans[a].some((p) => spans[b].some((q) => p[0] <= (q[1] === null ? Infinity : q[1]) && q[0] <= (p[1] === null ? Infinity : p[1])));
  const coarse = weightFor(LO_KM);
  let inner = 0;
  pre.arcs.forEach((arc, i) => {
    const u = users[i];
    let shared = false;
    for (let a = 0; a < u.length && !shared; a++) for (let b = a + 1; b < u.length && !shared; b++) shared = meet(u[a], u[b]);
    if (shared) { inner++; return; }
    for (const p of arc) if (p[2] < coarse) p[2] = 0;
  });
  const t = client.quantize(stripZ(simplify.simplify(pre, weightFor(HI_KM))), HI_Q);
  t.objects.d.geometries.forEach((g) => { delete g.properties; delete g.id; });
  const ringArea = (ring) => d3.geoArea(client.feature(t, { type: "Polygon", arcs: [ring] }).geometry);
  const fixPoly = (poly) => {
    if (ringArea(poly[0]) > 2 * Math.PI) return null;
    return [poly[0]].concat(poly.slice(1).filter((r) => ringArea(r) > 2 * Math.PI));
  };
  let dropped = 0;
  t.objects.d.geometries.forEach((g) => {
    const polys = g.type === "Polygon" ? [g.arcs] : g.type === "MultiPolygon" ? g.arcs : [];
    const kept = polys.map(fixPoly).filter(Boolean);
    dropped += polys.length - kept.length;
    if (!kept.length) return;
    if (g.type === "Polygon") g.arcs = kept[0]; else g.arcs = kept;
  });
  if (dropped) console.log("  dropped " + dropped + " pieces turned inside out by simplifying");
  return t;
}

function polylabel(rings, precision) {
  const outer = rings[0];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of outer) { if (p[0] < minX) minX = p[0]; if (p[1] < minY) minY = p[1]; if (p[0] > maxX) maxX = p[0]; if (p[1] > maxY) maxY = p[1]; }
  const w = maxX - minX, h = maxY - minY, size = Math.min(w, h);
  const dist = (x, y) => {
    let inside = false, best = Infinity;
    for (const ring of rings) {
      for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
        const a = ring[i], b = ring[j];
        if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
        let px = b[0], py = b[1], dx = a[0] - px, dy = a[1] - py;
        if (dx || dy) {
          const t = ((x - px) * dx + (y - py) * dy) / (dx * dx + dy * dy);
          if (t > 1) { px = a[0]; py = a[1]; } else if (t > 0) { px += dx * t; py += dy * t; }
        }
        dx = x - px; dy = y - py;
        best = Math.min(best, dx * dx + dy * dy);
      }
    }
    return (inside ? 1 : -1) * Math.sqrt(best);
  };
  const cell = (x, y, hh) => { const d = dist(x, y); return { x, y, h: hh, d, max: d + hh * Math.SQRT2 }; };
  if (!size) return [minX, minY, 0];
  const queue = [];
  for (let x = minX; x < maxX; x += size) for (let y = minY; y < maxY; y += size) queue.push(cell(x + size / 2, y + size / 2, size / 2));
  let best = cell(minX + w / 2, minY + h / 2, 0);
  for (let n = 0; queue.length && n < 20000; n++) {
    queue.sort((a, b) => a.max - b.max);
    const c = queue.pop();
    if (c.d > best.d) best = c;
    if (c.max - best.d <= precision) continue;
    const hh = c.h / 2;
    queue.push(cell(c.x - hh, c.y - hh, hh), cell(c.x + hh, c.y - hh, hh), cell(c.x - hh, c.y + hh, hh), cell(c.x + hh, c.y + hh, hh));
  }
  return [best.x, best.y, best.d];
}

function labelOf(geo) {
  const polys = polysOf(geo);
  if (!polys.length) return null;
  let big = null, bigA = -1, area = 0;
  for (const p of polys) {
    const a = d3.geoArea({ type: "Polygon", coordinates: p });
    area += a;
    if (a > bigA) { bigA = a; big = p; }
  }
  const lat0 = d3.geoCentroid({ type: "Polygon", coordinates: big })[1], k = Math.cos(lat0 * Math.PI / 180);
  const rings = big.map((r) => r.map((p) => [p[0] * k, p[1]]));
  const pl = polylabel(rings, 0.02);
  const lon = pl[0] / k, lat = pl[1];
  const cut = (y) => {
    const xs = [];
    for (const r of big) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const a = r[i], b = r[j];
      if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
    }
    return xs.sort((a, b) => a - b);
  };
  const xs = cut(lat), kmx = Math.cos(lat * Math.PI / 180) * KM_DEG;
  let x0 = lon, x1 = lon;
  for (let i = 0; i + 1 < xs.length; i += 2) if (xs[i] <= lon && lon <= xs[i + 1]) { x0 = xs[i]; x1 = xs[i + 1]; }
  const mid = (x0 + x1) / 2;
  const inner = (x, y) => {
    let best = Infinity;
    for (const r of big) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const a = [r[i][0] * k, r[i][1]], b = [r[j][0] * k, r[j][1]];
      let px = b[0], py = b[1], dx = a[0] - px, dy = a[1] - py;
      if (dx || dy) { const t = ((x * k - px) * dx + (y - py) * dy) / (dx * dx + dy * dy); if (t > 1) { px = a[0]; py = a[1]; } else if (t > 0) { px += dx * t; py += dy * t; } }
      best = Math.min(best, Math.hypot(x * k - px, y - py));
    }
    return best;
  };
  const r1 = (x) => Math.round(x * 100) / 100;
  return [r1(lon), r1(lat), Math.round(pl[2] * KM_DEG), Math.round(Math.min(lon - x0, x1 - lon) * kmx), Math.round(area * R_KM * R_KM), r1(mid), Math.round(inner(mid, lat) * KM_DEG), Math.round((x1 - x0) / 2 * kmx)];
}

function bboxOf(feats) {
  let w = 180, s = 90, e = -180, n = -90;
  for (const f of feats) {
    const b = d3.geoBounds(f);
    if (b[0][0] > b[1][0]) { w = -180; e = 180; } else { w = Math.min(w, b[0][0]); e = Math.max(e, b[1][0]); }
    s = Math.min(s, b[0][1]); n = Math.max(n, b[1][1]);
  }
  return [w, s, e, n].map((x) => Math.round(x * 10) / 10);
}

function writeRegion(key, names, entries) {
  const geos = [], rows = [], seen = new Map();
  for (const en of entries) {
    const k = JSON.stringify(en.geo);
    let g = seen.get(k);
    if (g === undefined) { g = geos.length; geos.push(en.geo); seen.set(k, g); }
    rows.push([en.name, dayOf(en.first), en.last ? dayOf(en.last) : null, g]);
  }
  rows.sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
  const feats = geos.map((g) => ({ type: "Feature", properties: {}, geometry: g }));
  const spans = geos.map(() => []);
  rows.forEach((r) => spans[r[3]].push([r[1], r[2]]));
  const topo = topoFor(feats, spans);
  const labels = topo.objects.d.geometries.map((g, i) => labelOf(client.feature(topo, g).geometry) || labelOf(geos[i]));
  const file = "divisions/" + key + ".json";
  const body = JSON.stringify({ rows, labels, topo });
  writeFileSync(resolve(out, file), body);
  const first = Math.min(...rows.map((r) => r[1])), open = rows.some((r) => r[2] === null), last = open ? null : Math.max(...rows.map((r) => r[2]));
  const size = body.length;
  console.log(key, rows.length + " spans, " + geos.length + " shapes, " + Math.round(size / 1024) + " KB");
  return [key, names, first, last, bboxOf(feats), file];
}

function ahcb() {
  const src = JSON.parse(readFileSync(ahcbPath, "utf8"));
  const keep = new Set(["State", "Territory", "Unorganized Territory", "District of Columbia"]);
  const entries = [];
  let dropped = [];
  for (const f of src.features) {
    const p = f.properties;
    if (!keep.has(p.TERR_TYPE)) { dropped.push(p.FULL_NAME); continue; }
    entries.push({ name: p.FULL_NAME, first: p.START_DATE, last: p.END_DATE.slice(0, 10) === AHCB_END ? null : p.END_DATE, geo: rewind(f.geometry) });
  }
  console.log("AHCB: " + entries.length + " kept, left out: " + [...new Set(dropped)].join(", "));
  return writeRegion("us", ["United States", "United States of America"], entries);
}

function naturalEarth() {
  const topo = JSON.parse(readFileSync(provincesPath, "utf8"));
  const detailPath = provincesPath.replace(/provinces\.json$/, "provinces-detail.json");
  if (detailPath !== provincesPath && existsSync(detailPath)) {
    const fine = JSON.parse(readFileSync(detailPath, "utf8"));
    if (fine.arcs.length !== topo.arcs.length) throw new Error("provinces-detail.json does not line up with provinces.json");
    topo.arcs = fine.arcs;
    topo.transform = fine.transform;
    console.log("Natural Earth at the detail of " + detailPath);
  }
  const geoms = topo.objects.provinces.geometries;
  const out = [];
  for (const R of NE_REGIONS) {
    const mine = geoms.filter((g) => g.properties.c === R.c);
    const byName = new Map();
    for (const g of mine) {
      let n = g.properties.n;
      const f = client.feature(topo, g);
      const a = d3.geoArea(f) * R_KM * R_KM;
      if (R.c === "MEX" && n === "Mexico") { if (a < 50) continue; n = "Mexico City"; }
      if (R.c === "USA" && n === "Washington" && a < 1000) n = "District of Columbia";
      if (R.c === "ARG" && n === "Buenos Aires" && a < 1000) n = "Buenos Aires City";
      if (!byName.has(n)) byName.set(n, []);
      byName.get(n).push(g);
    }
    const used = new Set();
    const entries = R.parts.map((pt) => {
      const gs = [];
      for (const n of pt.ne) {
        if (!byName.has(n)) throw new Error(R.key + ": no " + n + " in Natural Earth");
        used.add(n);
        gs.push(...byName.get(n));
      }
      let geo = client.merge(topo, gs);
      if (pt.cut || pt.pick) {
        let polys = geo.coordinates;
        if (pt.pick) polys = polys.filter((p) => pt.pick(d3.geoCentroid({ type: "Polygon", coordinates: p })));
        if (pt.cut) {
          const [[x0, y0], [x1, y1]] = pt.cut;
          polys = clip.intersection(polys, [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]);
        }
        geo = { type: "MultiPolygon", coordinates: polys };
      }
      return { name: pt.name, first: pt.first, last: pt.last, geo: rewind(geo) };
    });
    const cuts = [];
    R.parts.forEach((pt) => { if (pt.cut) cuts.push(pt.cut[0][1], pt.cut[1][1]); });
    if (cuts.length) entries.forEach((en, i) => { if (!R.parts[i].cut) en.geo = splitAt(en.geo, cuts); });
    const unused = [...byName.keys()].filter((n) => !used.has(n));
    if (unused.length) console.log(R.key + ": Natural Earth pieces not used: " + unused.join(", "));
    out.push(writeRegion(R.key, R.names, entries));
  }
  return out;
}

mkdirSync(resolve(out, "divisions"), { recursive: true });
const regions = [ahcb(), ...naturalEarth()];
writeFileSync(resolve(out, "divisions.json"), JSON.stringify({ regions }));
console.log("divisions.json: " + regions.length + " regions");

// Older first-level divisions, from historical datasets, for the years before a country's divisions of today (see
// DIVISIONS-SOURCES.md). For each country it fetches the source's shapes into a cache folder, dates them, keeps only
// the divisions that belonged to the country on each date, joins those the source draws below the first level, and
// writes tools/divisions-hist/<key>.json: a TopoJSON whose object `d` holds one geometry per division and span, with
// `name`, `first`, and `last` (ISO days), and `names`, `source`, and `licence` beside it. build-divisions.mjs puts
// these spans before the country's spans from Natural Earth.
//
//   node chronia/tools/divisions-hist.mjs <node_modules> <cache folder> [key ...]
//
// The shapes are simplified together, so that two divisions keep the same line between them, to about the detail
// build-divisions.mjs keeps (HI_KM, 0.5 km), and rounded to 4 decimals.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const modules = resolve(process.argv[2] || "node_modules");
const cache = resolve(process.argv[3] || "divisions-hist-cache");
const only = process.argv.slice(4);
const require = createRequire(resolve(modules, "x.js"));
const server = require("topojson-server");
const client = require("topojson-client");
const simplify = require("topojson-simplify");
const d3 = require("d3-geo");

const R_KM = 6371.0088, KEEP_KM = 0.5, Q = 2e5;
const dayBefore = (iso) => new Date(Date.parse(iso + "T00:00:00Z") - 86400000).toISOString().slice(0, 10);

async function fetchTo(file, url, check) {
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  for (let t = 0; t < 4; t++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status + " " + url);
      const body = await r.text(), json = JSON.parse(body);
      if (check && !check(json)) throw new Error("unexpected answer from " + url);
      writeFileSync(file, body);
      return json;
    } catch (e) { if (t === 3) throw e; await new Promise((ok) => setTimeout(ok, 2000 * (t + 1))); }
  }
}

// Canada, from Natural Resources Canada's Territorial Evolution maps (Open Government Licence – Canada), from
// Confederation to the day before the divisions from Natural Earth begin (15 May 1912). Each map shows a year; the days
// are those of the changes, from the Wikipedia article "Territorial evolution of Canada": Confederation 1 July 1867;
// Rupert's Land and the North-Western Territory taken over and Manitoba made 15 July 1870; British Columbia joined
// 20 July 1871; Prince Edward Island 1 July 1873; Ontario's provisional boundary 26 June 1874; Keewatin made
// 7 October 1876; the Arctic islands taken over 1 September 1880; Manitoba enlarged 23 December 1881; Keewatin's
// southwestern line moved 7 May 1886; Ontario's boundary settled 12 August 1889; Keewatin enlarged 2 October 1895;
// islands and peninsulas moved 18 December 1897; the Yukon Territory made and Quebec enlarged 13 June 1898; the
// Yukon's line moved 23 May 1901; and Alberta and Saskatchewan made, and Keewatin put back under the territories,
// 1 September 1905. The maps' districts of the territories (Assiniboia, Saskatchewan, Alberta, Athabaska, Mackenzie,
// Franklin, Ungava, and the Yukon before 1898) were divisions of the territories, so they are joined into them;
// Keewatin, under Manitoba's lieutenant governor from 1876 to 1905, is drawn on its own. The territories' name lost its
// hyphen in 1906; the article gives no day, so the plain name is used from the map of 1905.
const CA_URL = "https://geoappext.nrcan.gc.ca/arcgis/rest/services/FGP/TE/MapServer/";
const CA_MAPS = [
  [1867, 8, "1867-07-01"], [1870, 18, "1870-07-15"], [1871, 203, "1871-07-20"], [1873, 213, "1873-07-01"],
  [1874, 223, "1874-06-26"], [1876, 233, "1876-10-07"], [1880, 243, "1880-09-01"], [1881, 253, "1881-12-23"],
  [1886, 273, "1886-05-07"], [1889, 283, "1889-08-12"], [1895, 294, "1895-10-02"], [1897, 305, "1897-12-18"],
  [1898, 316, "1898-06-13"], [1901, 327, "1901-05-23"], [1905, 338, "1905-09-01"]
];
const CA_END = "1912-05-14";
const CA_DISTRICTS = ["District of Assiniboia", "District of Saskatchewan", "District of Alberta", "District of Athabaska", "District of Mackenzie", "District of Franklin", "District of Ungava", "District of Yukon"];
const CA_OUTSIDE = ["Newfoundland", "Rupert's Land"];
async function canada() {
  const dir = resolve(cache, "ca");
  mkdirSync(dir, { recursive: true });
  const spans = [];
  for (let i = 0; i < CA_MAPS.length; i++) {
    const [year, layer, first] = CA_MAPS[i], last = i + 1 < CA_MAPS.length ? dayBefore(CA_MAPS[i + 1][2]) : CA_END;
    const fc = await fetchTo(resolve(dir, "te" + year + ".json"), CA_URL + layer + "/query?where=1%3D1&outFields=PROV_NAME&outSR=4326&geometryPrecision=5&f=geojson", (j) => Array.isArray(j.features) && j.features.length > 0);
    const nwt = first < "1905-09-01" ? "North-West Territories" : "Northwest Territories";
    const groups = new Map();
    for (const f of fc.features) {
      let n = f.properties.PROV_NAME;
      if (CA_OUTSIDE.includes(n)) continue;
      if (year === 1867 && n === "Northwest Territories") continue;
      if (n === "Arctic Islands") continue;
      if (n === "British Columbia" && first < "1871-07-20") continue;
      if (n === "Prince Edward Island" && first < "1873-07-01") continue;
      if (CA_DISTRICTS.includes(n) || n === "Northwest Territories" || (n === "District of Keewatin" && first >= "1905-09-01")) n = nwt;
      else if (n === "Disputed area") n = "Disputed by Ontario and Manitoba";
      if (!groups.has(n)) groups.set(n, []);
      groups.get(n).push(f);
    }
    spans.push({ year, first, last, groups });
  }
  return { key: "ca", names: ["Canada"], source: "Natural Resources Canada, Territorial Evolution (maps of 1867 to 1905)", licence: "Open Government Licence – Canada", feats: spans.flatMap(mapFeatures), maps: spans.length };
}

// The Austrian Empire's and Austria-Hungary's crown lands, from HistoGIS (Austrian Academy of Sciences, ACDH; CC BY
// 4.0), each dated to the day by HistoGIS, from 9 June 1815 to 31 October 1918, under the names English uses. Salzburg
// is within Upper Austria, Carinthia, Carniola, and the Littoral within Illyria, and Bukovina within Galicia until
// 1849, as in HistoGIS.
const HG_API = "https://histogis.acdh.oeaw.ac.at/api/";
const HG_EN = {
  "Erzherzogtum Österreich unter der Enns": "Lower Austria", "Erzherzogtum Österreich ob der Enns": "Upper Austria",
  "Herzogtum Steiermark": "Styria", "Herzogtum Ober- und Niederschlesien": "Silesia", "Königreich Dalmatien": "Dalmatia",
  "Großfürstentum Siebenbürgen": "Transylvania", "Königreich Böhmen": "Bohemia", "Markgrafschaft Mähren": "Moravia",
  "Herzogtum Salzburg": "Salzburg", "Herzogtum Kärnten": "Carinthia", "Herzogtum Krain": "Carniola",
  "Königreich Galizien und Lodomerien": "Galicia and Lodomeria", "Herzogtum Bukowina": "Bukovina", "Königreich Ungarn": "Hungary",
  "Land Vorarlberg": "Vorarlberg", "Königreich Kroatien und Slawonien": "Croatia-Slavonia", "Königreich Kroatien": "Croatia",
  "Königreich Slawonien": "Slavonia", "Gefürstete Grafschaft Tirol": "Tyrol", "Gefürstete Grafschaft Tirol mit dem Lande Vorarlberg": "Tyrol and Vorarlberg",
  "Triest mit Gebiet": "Trieste", "Militärgrenze": "Military Frontier", "Gefürstete Grafschaft Görz und Gradisca": "Gorizia and Gradisca",
  "Markgrafschaft Istrien": "Istria", "Königreich Illyrien": "Illyria", "Küstenland": "Littoral", "Königreich Lombardo-Venetien": "Lombardy–Venetia",
  "Königreich Lombardei": "Lombardy", "Königreich Venetien": "Venetia", "Woiwodschaft Serbien und Temeser Banat": "Voivodeship of Serbia and Banat of Temeschwar",
  "Bosnien und Herzegowina": "Bosnia and Herzegovina", "Freie Stadt Fiume mit Gebiet": "Fiume"
};
async function histogisUnits(dir, test) {
  const list = [];
  for (let url = HG_API + "tempspatial-simple/?format=json&page_size=500", i = 0; url; i++) {
    const page = await fetchTo(resolve(dir, "list" + i + ".json"), url, (j) => Array.isArray(j.results));
    list.push(...page.results);
    url = page.next;
  }
  const out = [];
  for (const u of list.filter(test)) out.push(await fetchTo(resolve(dir, u.id + ".json"), HG_API + "tempspatial/" + u.id + "/?format=json", (j) => j.type === "Feature"));
  return out;
}
async function histogis(key, names, test, english, source, until) {
  const dir = resolve(cache, "hg");
  mkdirSync(dir, { recursive: true });
  const units = await histogisUnits(dir, test);
  const feats = units.filter((f) => !until || f.properties.start_date <= until).map((f) => {
    const name = english[f.properties.title];
    if (!name) throw new Error("HistoGIS: no English name for " + f.properties.title);
    const last = until && f.properties.end_date > until ? until : f.properties.end_date;
    return { type: "Feature", properties: { name, first: f.properties.start_date, last }, geometry: dropSmall(f.geometry) };
  });
  return { key, names, source: "HistoGIS, " + source, licence: "CC BY 4.0", feats, maps: units.length };
}
const austria = () => histogis("at", ["Austrian Empire", "Austria-Hungary"], (u) => /^Aust(rian|ro-Hungarian) Empire Crownlands /.test(u.source_name), HG_EN, "the crown lands of the Austrian Empire and Austria-Hungary");

// The Kingdom of Prussia's provinces, from HistoGIS, from 9 June 1815 until the German Empire (31 December 1870):
// after that, Prussia is one of the Empire's states, and its provinces are below the first level.
const HG_PRUSSIA = {
  "Westfalen": "Westphalia", "Pommern": "Pomerania", "Posen": "Posen", "Sachsen": "Province of Saxony", "Brandenburg": "Brandenburg",
  "Schlesien": "Silesia", "Rheinprovinz": "Rhine Province", "Hohenzollern": "Hohenzollern", "Niederrhein": "Lower Rhine",
  "Jülich-Kleve-Berg": "Jülich-Cleves-Berg", "Westpreußen": "West Prussia", "Ostpreußen": "East Prussia", "Preußen": "Province of Prussia",
  "Hessen-Nassau": "Hesse-Nassau", "Hannover": "Hanover", "Schleswig-Holstein": "Schleswig-Holstein", "Berlin": "Berlin"
};
const prussia = () => histogis("prussia", ["Kingdom of Prussia", "Prussia"], (u) => /^Prussia Provinces /.test(u.source_name), HG_PRUSSIA, "the provinces of the Kingdom of Prussia", "1870-12-31");

// Italy's compartimenti, from ISTAT's historical boundaries (Confini delle unità amministrative a fini statistici;
// CC BY 3.0), from the Kingdom's proclamation (17 March 1861) to the day before the regions from Natural Earth begin
// (1 January 1948). The compartimenti were the statistical regions out of which the regions of 1948 were made; the
// provinces were then the first level of administration, but the compartimenti are drawn, to run on into the regions.
// ISTAT's maps are of census years, so a change between two censuses is drawn from the census that first shows it:
// 31 December 1871, 31 December 1881, 10 February 1901, 10 June 1911, and 1 December 1921, and 1 January 1923 and
// 2 January 1927 (the decree that made seventeen provinces) for its maps of those years. Venetia is drawn from
// 19 October 1866 and Lazio from 9 October 1870, the days they were joined to the Kingdom, on the map of 1871. The map
// of 1925 leaves out Basilicata and Calabria, so it isn't used. The maps are in UTM zone 32N.
const IT_URL = "https://www.istat.it/storage/cartografia/confini-amministrativi-storici/Limiti_";
const IT_MAPS = [
  [1861, "1861-03-17"], [1871, "1866-10-19", ["Lazio"]], [1871, "1870-10-09"], [1881, "1881-12-31"], [1901, "1901-02-10"],
  [1911, "1911-06-10"], [1921, "1921-12-01"], [1923, "1923-01-01"], [1927, "1927-01-02"]
];
const IT_END = "1947-12-31";
const IT_EN = {
  "Piemonte": "Piedmont", "Lombardia": "Lombardy", "Veneto": "Veneto", "Liguria": "Liguria", "Emilia": "Emilia", "Toscana": "Tuscany",
  "Umbria": "Umbria", "Marche": "Marche", "Lazio": "Lazio", "Abruzzi e Molise": "Abruzzi e Molise", "Campania": "Campania",
  "Puglie": "Apulia", "Basilicata": "Basilicata", "Calabrie": "Calabria", "Sicilia": "Sicily", "Sardegna": "Sardinia",
  "Venezia Tridentina": "Venezia Tridentina", "Venezia Giulia": "Venezia Giulia",
  "Piemonte e Liguria": "Piedmont and Liguria", "Province napoletane": "Neapolitan provinces", "Romagne": "Romagna",
  "Modena, Reggio e Massa": "Modena, Reggio, and Massa", "Parma e Piacenza": "Parma and Piacenza"
};
async function italy() {
  const dir = resolve(cache, "it");
  mkdirSync(dir, { recursive: true });
  const shp = require("shapefile"), proj4 = require("proj4");
  const utm = proj4("+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs", "WGS84");
  const un = (c) => typeof c[0] === "number" ? utm.forward(c).map((x) => Math.round(x * 1e6) / 1e6) : c.map(un);
  const spans = [];
  for (let i = 0; i < IT_MAPS.length; i++) {
    const [year, first, leave = []] = IT_MAPS[i], last = i + 1 < IT_MAPS.length ? dayBefore(IT_MAPS[i + 1][1]) : IT_END;
    const zip = resolve(dir, "Limiti_" + year + ".zip"), out = resolve(dir, "x" + year);
    if (!existsSync(zip)) {
      const r = await fetch(IT_URL + year + ".zip");
      if (!r.ok) throw new Error(r.status + " ISTAT " + year);
      writeFileSync(zip, Buffer.from(await r.arrayBuffer()));
    }
    if (!existsSync(out)) execFileSync("unzip", ["-oq", zip, "-d", out]);
    const base = resolve(out, "Compartimenti_" + year, "Compartimenti_" + year);
    const src = await shp.open(base + ".shp", base + ".dbf", { encoding: "utf-8" });
    const groups = new Map();
    for (let r = await src.read(); !r.done; r = await src.read()) {
      const p = r.value.properties, it = p.DEN_COMP || p.DEN_CIRC, n = IT_EN[it];
      if (!n) throw new Error("ISTAT " + year + ": no English name for " + it);
      if (leave.includes(it)) continue;
      if (!groups.has(n)) groups.set(n, []);
      groups.get(n).push({ type: "Feature", properties: {}, geometry: { type: r.value.geometry.type, coordinates: un(r.value.geometry.coordinates) } });
    }
    spans.push({ year, first, last, groups });
  }
  return { key: "it", names: ["Kingdom of Italy", "Italy", "Italian Social Republic"], source: "ISTAT, the compartimenti on its historical boundaries (1861 to 1927)", licence: "CC BY 3.0", feats: spans.flatMap(mapFeatures), maps: spans.length };
}

const SOURCES = { ca: canada, at: austria, prussia, it: italy };

// One map's shapes, joined by name, as features; each map is put into a topology of its own first, so that shapes the
// source draws side by side are joined along their shared lines.
// Islands and other pieces smaller than MIN_KM2 are left out (but never a division's largest piece): no line runs
// between divisions there, and the thousands of Arctic islands on Canada's maps would make the file many times larger.
const MIN_KM2 = 300;
function dropSmall(geo) {
  const polys = geo.type === "Polygon" ? [geo.coordinates] : geo.type === "MultiPolygon" ? geo.coordinates : [];
  const km2 = (p) => { const a = d3.geoArea({ type: "Polygon", coordinates: p }); return Math.min(a, 4 * Math.PI - a) * R_KM * R_KM; };
  const sized = polys.map((p) => [p, km2(p)]), big = Math.max(...sized.map((x) => x[1]));
  return { type: "MultiPolygon", coordinates: sized.filter(([, a]) => a >= MIN_KM2 || a === big).map(([p]) => p) };
}
function mapFeatures(sp) {
  const names = [...sp.groups.keys()];
  const fc = { type: "FeatureCollection", features: names.flatMap((n) => sp.groups.get(n).map((f) => ({ type: "Feature", properties: { n }, geometry: f.geometry }))) };
  const t = server.topology({ d: fc });
  return names.map((n) => {
    const gs = t.objects.d.geometries.filter((g) => g.properties.n === n);
    return { type: "Feature", properties: { name: n, first: sp.first, last: sp.last }, geometry: dropSmall(client.merge(t, gs)) };
  });
}

function write(rec) {
  const feats = rec.feats;
  // Spans whose shape and name run on unchanged from one map to the next are joined into one.
  const out = [];
  for (const f of feats) {
    const prev = out.find((g) => g.properties.name === f.properties.name && dayBefore(f.properties.first) === g.properties.last && JSON.stringify(g.geometry) === JSON.stringify(f.geometry));
    if (prev) prev.properties.last = f.properties.last; else out.push(f);
  }
  let t = server.topology({ d: { type: "FeatureCollection", features: out } }, Q);
  t = simplify.presimplify(t, simplify.sphericalTriangleArea);
  t = simplify.simplify(t, (KEEP_KM / R_KM) ** 2);
  t.arcs = t.arcs.map((a) => a.map((p) => [p[0], p[1]]));
  t = client.quantize(t, Q);
  t.objects.d.geometries.forEach((g, i) => { g.properties = out[i].properties; });
  const body = JSON.stringify({ names: rec.names, source: rec.source, licence: rec.licence, topo: t });
  mkdirSync(resolve(here, "divisions-hist"), { recursive: true });
  writeFileSync(resolve(here, "divisions-hist", rec.key + ".json"), body);
  console.log(rec.key + ": " + out.length + " spans from " + rec.maps + " maps or units, " + Math.round(body.length / 1024) + " KB");
}

for (const [key, make] of Object.entries(SOURCES)) {
  if (only.length && !only.includes(key)) continue;
  write(await make());
}

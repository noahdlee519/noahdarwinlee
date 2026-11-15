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
// A country is listed only where geoBoundaries' layout is the one that followed the reform. `first` is the day it began (the day
// after Natural Earth's ends, or a later day where another layout stood between, which is then left undrawn), `last` the day
// before a later reform that geoBoundaries does not have.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
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
  // South Sudan's ten states again, from 22 February 2020; the 28 and 32 states of 2015 to 2020 are not in the source, and the
  // administrative areas of Abyei, Pibor, and Ruweng lie inside the states here.
  { key: "ss", c: "SSD", first: "2020-02-22" },
  { key: "td", c: "TCD", first: "2012-09-04", rename: { "N'Djamena Region": "N'Djamena" } },
  // Angola's 18 provinces; the three made in 2024 (Icolo e Bengo, Cuando, and Moxico Leste) are not in the source.
  { key: "ao", c: "AGO", first: "2011-10-31" },
  // Egypt's 27 governorates, from the end of Helwan and 6th of October (14 April 2011); 2008 to 2011 is left undrawn.
  { key: "eg", c: "EGY", first: "2011-04-14", name: strip(/ Govern(or)?ate$/) },
  // Madagascar's 22 regions; Vatovavy-Fitovinany's division of 2021 is not in the source.
  { key: "mg", c: "MDG", first: "2009-10-04" },
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
for (const R of NOW) {
  if (only.length && !only.includes(R.key)) continue;
  const level = R.level || "ADM1", stem = "geoBoundaries-" + R.c + "-" + level;
  const meta = await fetchTo(resolve(cache, stem + "-metaData.json"), GB + R.c + "/" + level + "/" + stem + "-metaData.json");
  const src = await fetchTo(resolve(cache, stem + "_simplified.geojson"), GB + R.c + "/" + level + "/" + stem + "_simplified.geojson");
  const byName = new Map();
  for (const f of src.features) {
    let n = f.properties.shapeName;
    if ((R.drop || []).includes(n)) continue;
    if (R.rename && R.rename[n]) n = R.rename[n];
    if (R.name) n = R.name(n);
    if (!byName.has(n)) byName.set(n, []);
    byName.get(n).push(...polysOf(f.geometry));
  }
  const land = R.clipTo ? countryShape(R.clipTo) : null, feats = [];
  for (const [name, polys] of byName) {
    let geo = polys.length > 1 ? clip.union(...polys.map((p) => [p])) : polys;
    if (land) geo = clip.intersection(geo, land);
    geo = geo.filter((p) => p.length && p[0].length >= 4);
    if (!geo.length) { console.log(R.key + ": " + name + " lies outside " + R.clipTo + ", left out"); continue; }
    feats.push({ type: "Feature", properties: { name, first: R.first, last: R.last || null }, geometry: { type: "MultiPolygon", coordinates: geo } });
  }
  let t = server.topology({ d: { type: "FeatureCollection", features: feats } }, Q);
  t = simplify.presimplify(t, simplify.sphericalTriangleArea);
  t = simplify.simplify(t, (KEEP_KM / R_KM) ** 2);
  t.arcs = t.arcs.map((a) => a.map((p) => [p[0], p[1]]));
  t = client.quantize(t, Q);
  t.objects.d.geometries.forEach((g, i) => { g.properties = feats[i].properties; });
  const source = "geoBoundaries (gbOpen " + R.c + " " + level + ", " + meta.boundaryYear + "): " + meta.boundarySource;
  const body = JSON.stringify({ names: [], source, licence: meta.boundaryLicense, topo: t });
  writeFileSync(resolve(here, "divisions-now", R.key + ".json"), body);
  console.log(R.key + ": " + feats.length + " divisions from " + R.first + (R.last ? " to " + R.last : "") + ", " + Math.round(body.length / 1024) + " KB | " + meta.boundaryLicense);
}

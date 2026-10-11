import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const modules = resolve(process.argv[2] || "node_modules");
const input = resolve(process.argv[3] || "ne_10m_admin_1_states_provinces_lakes.geojson");
const keep = +(process.argv[4] || 0.12);
const keepDetail = +(process.argv[5] || 0.4);
const require = createRequire(resolve(modules, "x.js"));
const server = require("topojson-server");
const client = require("topojson-client");
const simplify = require("topojson-simplify");
const d3 = require("d3-geo");

const EARTH = 6371.0088;
const MIN_ISLAND_KM2 = 12;

const RENAME = {
  USA: "United States", TZA: "Tanzania", SRB: "Serbia", COD: "DR Congo", COG: "Congo", MKD: "North Macedonia",
  SWZ: "Eswatini", CZE: "Czechia", BHS: "Bahamas", GNB: "Guinea-Bissau", SDS: "South Sudan", HKG: "Hong Kong",
  MAC: "Macau", PSX: "Palestine", FSM: "Micronesia", TLS: "Timor-Leste", ALD: "Åland", PGA: "Spratly Islands",
  SGS: "South Georgia", VAT: "Vatican City", BLM: "Saint Barthélemy", STP: "São Tomé and Príncipe",
  USG: "Guantánamo Bay", UMI: "US Minor Outlying Islands", ESB: "Dhekelia", WSB: "Akrotiri", KAS: "Siachen Glacier",
  CIV: "Ivory Coast", CPV: "Cape Verde",
};
const FOLD = { KAB: "KAZ" };
const PROVINCE_NAME = { "RU-ALT": "Altai Krai" };

const GROUPED = new Set(["SVN", "LVA", "UGA", "AZE", "MKD", "MLT", "KOS", "HKG", "BTN", "PHL", "LKA", "ITA"]);
const GROUP_NAME = {
  "UGA|Western": "Western Region", "UGA|Central": "Central Region", "UGA|Eastern": "Eastern Region", "UGA|Northern": "Northern Region",
  "BTN|Eastern": "Eastern Bhutan", "BTN|Southern": "Southern Bhutan", "BTN|Western": "Western Bhutan", "BTN|Central": "Central Bhutan",
  "MKD|Greater Skopje": "Skopje Region", "MKD|Skopje": "Skopje Region", "MKD|Southwestern": "Southwestern Region",
  "MKD|Polog": "Polog Region", "MKD|Southeastern": "Southeastern Region", "MKD|Vardar": "Vardar Region",
  "MKD|Pelagonia": "Pelagonia Region", "MKD|Northeastern": "Northeastern Region", "MKD|Eastern": "Eastern Region",
  "PHL|Autonomous Region in Muslim Mindanao (ARMM)": "Bangsamoro", "PHL|Dinagat Islands (Region XIII)": "Caraga",
  "PHL|Cordillera Administrative Region (CAR)": "Cordillera",
  "LKA|Næ̆gĕnahira paḷāta": "Eastern Province", "LKA|Uturu paḷāta": "Northern Province", "LKA|Vayamba paḷāta": "North Western Province",
  "LKA|Basnāhira paḷāta": "Western Province", "LKA|Dakuṇu paḷāta": "Southern Province", "LKA|Sabaragamuva paḷāta": "Sabaragamuwa",
  "LKA|Ūva paḷāta": "Uva", "LKA|Madhyama paḷāta": "Central Province", "LKA|Uturumæ̆da paḷāta": "North Central Province",
  "ITA|Valle d'Aosta": "Aosta Valley", "ITA|Piemonte": "Piedmont", "ITA|Lombardia": "Lombardy", "ITA|Toscana": "Tuscany",
  "ITA|Sardegna": "Sardinia",
  "AZE|Naxçıvan Autonomous Republic": "Nakhchivan",
  "KOS|Đakovica": "Gjakova", "KOS|Gnjilane": "Gjilan", "KOS|Uroševac": "Ferizaj", "KOS|Kosovska Mitrovica": "Mitrovica",
  "KOS|Peć": "Peja", "HKG|The New Territories": "New Territories",
};
const groupName = (code, region) => GROUP_NAME[code + "|" + region] || region.replace(/\s*\([^)]*\)\s*$/, "").replace(/ Economic Region$/, "");

const kmArea = (geom) => { const a = d3.geoArea(geom); return Math.min(a, 4 * Math.PI - a) * EARTH * EARTH; };

const geo = JSON.parse(readFileSync(input, "utf8"));
const countries = new Map();
const features = [];
const groups = [], groupIndex = new Map();
let droppedIslands = 0;
for (const f of geo.features) {
  if (!f.geometry) continue;
  const p = f.properties;
  const code = FOLD[p.adm0_a3] || p.adm0_a3;
  if (!countries.has(code)) countries.set(code, RENAME[code] || (FOLD[p.adm0_a3] ? null : p.admin));
  if (countries.get(code) === null) countries.set(code, p.admin);
  let polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  const areas = polys.map((c) => kmArea({ type: "Polygon", coordinates: c }));
  const biggest = areas.indexOf(Math.max(...areas));
  const kept = polys.filter((c, i) => i === biggest || areas[i] >= MIN_ISLAND_KM2);
  droppedIslands += polys.length - kept.length;
  const properties = { n: PROVINCE_NAME[p.iso_3166_2] || p.name_en || p.name || RENAME[code] || p.admin, c: code };
  if (GROUPED.has(code) && p.region) {
    const name = groupName(code, p.region), key = code + "|" + name;
    if (!groupIndex.has(key)) { groupIndex.set(key, groups.length); groups.push({ n: name, c: code }); }
    properties.g = groupIndex.get(key);
  }
  features.push({
    type: "Feature",
    properties,
    geometry: kept.length === 1 ? { type: "Polygon", coordinates: kept[0] } : { type: "MultiPolygon", coordinates: kept },
  });
}
for (const [code, name] of countries) if (!name) countries.set(code, code);

const topo = server.topology({ provinces: { type: "FeatureCollection", features } }, 1e6);
const pre = simplify.presimplify(topo, simplify.sphericalTriangleArea);
const weights = [];
pre.arcs.forEach((arc) => arc.forEach((pt) => { if (isFinite(pt[2])) weights.push(pt[2]); }));
weights.sort((a, b) => a - b);
const threshold = (k) => weights[Math.max(0, Math.floor((1 - k) * (weights.length - 1)))];
const simple = simplify.simplify(pre, threshold(keep));
const out = client.quantize(simple, 2e5);
out.countries = [...countries].map(([c, n]) => ({ c, n })).sort((a, b) => a.n.localeCompare(b.n));
out.groups = groups;
out.detail = 1;
let vertices = 0;
simple.arcs.forEach((arc) => { vertices += arc.length; });
const json = JSON.stringify(out);
writeFileSync(resolve(here, "../data/provinces.json"), json);
console.log(features.length, "provinces in", countries.size, "countries and", groups.length, "groups;", droppedIslands, "islands under", MIN_ISLAND_KM2, "km² dropped;", simple.arcs.length, "arcs,", vertices, "vertices;", Math.round(json.length / 1024), "KB");

const fine = client.quantize(simplify.simplify(pre, threshold(keepDetail)), 1e6);
const detail = JSON.stringify({ type: "Topology", transform: fine.transform, arcs: fine.arcs });
let detailVertices = 0;
fine.arcs.forEach((arc) => { detailVertices += arc.length; });
if (fine.arcs.length !== out.arcs.length) throw new Error("detail arcs do not line up");
writeFileSync(resolve(here, "../data/provinces-detail.json"), detail);
console.log("provinces-detail.json:", fine.arcs.length, "arcs,", detailVertices, "vertices at", keepDetail, ";", Math.round(detail.length / 1024), "KB");

import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const modules = resolve(process.argv[2] || "node_modules");
const input = resolve(process.argv[3] || "ne_10m_admin_1_states_provinces_lakes.geojson");
const keep = +(process.argv[4] || 0.12);
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

const kmArea = (geom) => { const a = d3.geoArea(geom); return Math.min(a, 4 * Math.PI - a) * EARTH * EARTH; };

const geo = JSON.parse(readFileSync(input, "utf8"));
const countries = new Map();
const features = [];
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
  features.push({
    type: "Feature",
    properties: { n: p.name_en || p.name || RENAME[code] || p.admin, c: code },
    geometry: kept.length === 1 ? { type: "Polygon", coordinates: kept[0] } : { type: "MultiPolygon", coordinates: kept },
  });
}
for (const [code, name] of countries) if (!name) countries.set(code, code);

const topo = server.topology({ provinces: { type: "FeatureCollection", features } }, 1e6);
const pre = simplify.presimplify(topo, simplify.sphericalTriangleArea);
const weights = [];
pre.arcs.forEach((arc) => arc.forEach((pt) => { if (isFinite(pt[2])) weights.push(pt[2]); }));
weights.sort((a, b) => a - b);
const simple = simplify.simplify(pre, weights[Math.floor((1 - keep) * (weights.length - 1))]);
const out = client.quantize(simple, 2e5);
out.countries = [...countries].map(([c, n]) => ({ c, n })).sort((a, b) => a.n.localeCompare(b.n));
let vertices = 0;
simple.arcs.forEach((arc) => { vertices += arc.length; });
const json = JSON.stringify(out);
writeFileSync(resolve(here, "../data/provinces.json"), json);
console.log(features.length, "provinces in", countries.size, "countries;", droppedIslands, "islands under", MIN_ISLAND_KM2, "km² dropped;", simple.arcs.length, "arcs,", vertices, "vertices;", Math.round(json.length / 1024), "KB");

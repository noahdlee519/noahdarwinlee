// Builds the two data files the page loads:
//
//   data/countries-50m.json  Natural Earth 1:50m countries as TopoJSON (from
//                            the world-atlas package), with every feature given
//                            a stable unique id and a display name.
//   data/places.json         What the location boxes search: cities, capitals,
//                            airports and countries, as compact rows.
//
// Run from the greatercircle directory:
//
//   npm install world-atlas@2 world-countries@5 all-the-cities@3 pbf@3   (anywhere)
//   curl -LO https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv
//   node tools/build-data.mjs <node_modules dir> <airports.csv>
//
// Sources and their terms (see the page's small print):
//   Natural Earth (public domain) via world-atlas; GeoNames (CC BY 4.0) via
//   all-the-cities; OurAirports (public domain); mledoze/world-countries (ODbL).
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const modules = resolve(process.argv[2] || "node_modules");
const airportsCsv = resolve(process.argv[3] || "airports.csv");
const require = createRequire(resolve(modules, "x.js"));
const outDir = resolve(here, "..", "data");

// ----------------------------------------------------------------- countries
const topo = require("world-atlas/countries-50m.json");
const worldCountries = require("world-countries/countries.json");
const byN3 = new Map(worldCountries.map((c) => [c.ccn3, c]));
const byA2 = new Map(worldCountries.map((c) => [c.cca2, c]));

// Natural Earth's abbreviations, written out; and the few features with no
// ISO number of their own.
const RENAME = {
  "Antigua and Barb.": "Antigua and Barbuda", "Bosnia and Herz.": "Bosnia and Herzegovina",
  "Br. Indian Ocean Ter.": "British Indian Ocean Territory", "British Virgin Is.": "British Virgin Islands",
  "Cayman Is.": "Cayman Islands", "Central African Rep.": "Central African Republic",
  "Cook Is.": "Cook Islands", "Dem. Rep. Congo": "Democratic Republic of the Congo",
  "Congo": "Republic of the Congo", "Dominican Rep.": "Dominican Republic", "Eq. Guinea": "Equatorial Guinea",
  "Faeroe Is.": "Faroe Islands", "Falkland Is.": "Falkland Islands", "Fr. Polynesia": "French Polynesia",
  "Fr. S. Antarctic Lands": "French Southern and Antarctic Lands", "Heard I. and McDonald Is.": "Heard Island and McDonald Islands",
  "Indian Ocean Ter.": "Australian Indian Ocean Territories", "Ashmore and Cartier Is.": "Ashmore and Cartier Islands",
  "Macedonia": "North Macedonia", "Marshall Is.": "Marshall Islands", "N. Cyprus": "Northern Cyprus",
  "N. Mariana Is.": "Northern Mariana Islands", "Pitcairn Is.": "Pitcairn Islands", "S. Geo. and the Is.": "South Georgia and the South Sandwich Islands",
  "S. Sudan": "South Sudan", "Solomon Is.": "Solomon Islands", "St-Barthélemy": "Saint Barthélemy", "St-Martin": "Saint Martin",
  "St. Kitts and Nevis": "Saint Kitts and Nevis", "St. Pierre and Miquelon": "Saint Pierre and Miquelon",
  "St. Vin. and Gren.": "Saint Vincent and the Grenadines", "Turks and Caicos Is.": "Turks and Caicos Islands",
  "U.S. Virgin Is.": "United States Virgin Islands", "W. Sahara": "Western Sahara", "Wallis and Futuna Is.": "Wallis and Futuna",
  "eSwatini": "Eswatini", "United States of America": "United States", "Vatican": "Vatican City", "Åland": "Åland Islands",
  "Somaliland": "Somaliland", "Siachen Glacier": "Siachen Glacier", "Kosovo": "Kosovo"
};
const SYNTHETIC = { "Kosovo": "x-xk", "N. Cyprus": "x-ncy", "Somaliland": "x-som", "Siachen Glacier": "x-sia",
  "Indian Ocean Ter.": "x-iot", "Ashmore and Cartier Is.": "x-aci" };

const seen = new Map();
const countryRows = [];
for (const g of topo.objects.countries.geometries) {
  const neName = g.properties.name;
  let id = g.id;
  if (!id || !/^\d{3}$/.test(id) || seen.has(id)) id = SYNTHETIC[neName] || ("x-" + neName.toLowerCase().replace(/[^a-z]+/g, "-"));
  if (seen.has(id)) throw new Error("duplicate id " + id + " for " + neName);
  seen.set(id, neName);
  const wc = byN3.get(id);
  const name = RENAME[neName] || (wc ? wc.name.common : neName);
  g.id = id;
  g.properties = { name };
  // Search aliases: the official name, Natural Earth's short form, ISO codes,
  // and the alternative spellings the world-countries list keeps.
  const aliases = new Set();
  if (neName !== name) aliases.add(neName);
  if (wc) {
    aliases.add(wc.name.official); aliases.add(wc.cca2); aliases.add(wc.cca3);
    for (const s of wc.altSpellings || []) if (s.length > 2) aliases.add(s);
    for (const t of Object.values(wc.name.native || {})) { aliases.add(t.common); }
  }
  aliases.delete(name);
  countryRows.push({ id, name, cca2: wc ? wc.cca2 : null, capital: wc && wc.capital ? wc.capital[0] : null,
    latlng: wc ? wc.latlng : null, aliases: [...aliases].filter(Boolean) });
}
writeFileSync(resolve(outDir, "countries-50m.json"), JSON.stringify(topo));
console.log("countries-50m.json:", topo.objects.countries.geometries.length, "features");

// -------------------------------------------------------------------- places
// Rows: [kind, name, country-code, lon, lat, population, extra]
//   kind 0 country (extra = feature id, lon/lat = capital or centroid, name = country, extra2 = capital name)
//   kind 1 city    (extra = US state code or "")
//   kind 2 airport (extra = IATA code, population = 0; name = airport, extra2 = municipality)
const cities = require("all-the-cities");
const r4 = (x) => Math.round(x * 1e4) / 1e4;
const rows = [];

const cityByKey = new Map(); // "name|CC" -> best city
for (const c of cities) {
  const k = (c.name + "|" + c.country).toLowerCase();
  const prev = cityByKey.get(k);
  if (!prev || (c.population || 0) > (prev.population || 0)) cityByKey.set(k, c);
}

// Countries, located at their capital when the capital is a known city.
for (const c of countryRows) {
  let lon = c.latlng ? c.latlng[1] : null, lat = c.latlng ? c.latlng[0] : null;
  let capital = c.capital || "";
  if (c.capital && c.cca2) {
    const hit = cityByKey.get((c.capital + "|" + c.cca2).toLowerCase());
    if (hit) { lon = hit.loc.coordinates[0]; lat = hit.loc.coordinates[1]; }
  }
  if (lon == null) continue; // a few territories without coordinates
  rows.push([0, c.name, c.cca2 || "", r4(lon), r4(lat), 0, c.id, capital, c.aliases.join("|")]);
}

// Cities: anything of 50,000 people, every national capital, every seat of a
// first-order division (state capitals and the like).
let nCities = 0;
for (const c of cities) {
  const pop = c.population || 0;
  const keep = pop >= 50000 || c.featureCode === "PPLC" || c.featureCode === "PPLA";
  if (!keep) continue;
  const extra = c.country === "US" && /^[A-Z]{2}$/.test(c.adminCode || "") ? c.adminCode : "";
  rows.push([1, c.name, c.country, r4(c.loc.coordinates[0]), r4(c.loc.coordinates[1]), pop, extra]);
  nCities++;
}

// Airports: large and medium ones with an IATA code and scheduled service.
const csv = readFileSync(airportsCsv, "utf8").split("\n");
const header = parseCsvLine(csv[0]);
const col = (name) => header.indexOf(name);
const iType = col("type"), iName = col("name"), iLat = col("latitude_deg"), iLon = col("longitude_deg");
const iCountry = col("iso_country"), iMuni = col("municipality"), iSched = col("scheduled_service"), iIata = col("iata_code");
let nAirports = 0;
for (let i = 1; i < csv.length; i++) {
  if (!csv[i]) continue;
  const f = parseCsvLine(csv[i]);
  const type = f[iType], iata = f[iIata];
  if (!iata || !/^[A-Z0-9]{3}$/.test(iata)) continue;
  if (!(type === "large_airport" || (type === "medium_airport" && f[iSched] === "yes"))) continue;
  rows.push([2, f[iName], f[iCountry], r4(+f[iLon]), r4(+f[iLat]), type === "large_airport" ? 2 : 1, iata, f[iMuni] || ""]);
  nAirports++;
}

function parseCsvLine(line) {
  const out = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ",") { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out;
}

// Country code → display name, for the suggestion lines.
const countryNames = {};
for (const c of countryRows) if (c.cca2) countryNames[c.cca2] = c.name;
for (const c of worldCountries) if (!countryNames[c.cca2]) countryNames[c.cca2] = c.name.common;

const places = { countries: countryNames, rows };
writeFileSync(resolve(outDir, "places.json"), JSON.stringify(places));
console.log("places.json:", rows.length, "rows:", countryRows.length, "countries,", nCities, "cities,", nAirports, "airports");

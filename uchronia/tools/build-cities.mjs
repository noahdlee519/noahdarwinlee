import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const gc = resolve(here, "../../greatercircle/data");
const cities = JSON.parse(readFileSync(resolve(gc, "cities.json"), "utf8"));
const places = JSON.parse(readFileSync(resolve(gc, "places.json"), "utf8"));
const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’‘']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const ALIAS = { "washington d c": "washington", "new delhi": "delhi", "nur sultan": "astana", "naypyidaw": "naypyidaw" };
const capitals = places.rows.filter((r) => r[0] === 0 && r[7]).map((r) => ({ cc: r[2], name: ALIAS[fold(r[7])] || fold(r[7]), lon: r[3], lat: r[4] }));
const near = (a, b) => Math.hypot((a.lon - b.lon) * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180), a.lat - b.lat) < 0.25;
const out = cities.map(([name, cc, lon, lat, tier]) => {
  const isCapital = capitals.some((k) => k.cc === cc && (k.name === fold(name) || near(k, { lon, lat })));
  return [name, +lon.toFixed(4), +lat.toFixed(4), tier, isCapital ? 1 : 0];
});
writeFileSync(resolve(here, "../data/cities.json"), JSON.stringify(out));
console.log("cities.json:", out.length, "cities,", out.filter((c) => c[4]).length, "capitals");

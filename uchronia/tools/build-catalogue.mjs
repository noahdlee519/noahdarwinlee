import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const topo = JSON.parse(readFileSync(resolve(here, "../data/provinces.json"), "utf8"));
const names = new Map(topo.countries.map((c) => [c.c, c.n]));
const groups = topo.groups || [];
const byCountry = new Map();

for (const g of topo.objects.provinces.geometries) {
  const p = g.properties, country = names.get(p.c);
  if (!country) continue;
  const region = p.g >= 0 && p.g < groups.length ? String(groups[p.g].n) : p.n;
  if (!byCountry.has(country)) byCountry.set(country, new Set());
  byCountry.get(country).add(region);
}

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const lines = [...byCountry.keys()].sort(cmp).map((c) => c + ": " + [...byCountry.get(c)].sort(cmp).join("; "));
writeFileSync(resolve(here, "../data/catalogue.txt"), lines.join("\n") + "\n");
console.log(byCountry.size + " countries, " + [...byCountry.values()].reduce((n, s) => n + s.size, 0) + " regions");

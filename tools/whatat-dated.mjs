// What CHRONIA's yearly data (3400 BC to 1885) draws at places on a day.
// node tools/whatat-dated.mjs <node_modules> <chronia dir> <YYYY-MM-DD> <lon,lat[,label]> [more places]
// Prints each place's spans on that day: name, ruler, status, and the span's years and days.
import { readFileSync } from "node:fs";
// The detailed lines of a data file are in a file beside it ("modern-hi.json"), since November 2026.
const withHi = (p, d) => { if (!d.hi) { try { d.hi = JSON.parse(readFileSync(p.replace(/\.json$/, "-hi.json"), "utf8")).hi; } catch (e) {} } return d; };
import { createRequire } from "node:module";
import { resolve } from "node:path";

const [mods, dir, date, ...places] = process.argv.slice(2);
const require = createRequire(resolve(mods, "x.js"));
const client = require("topojson-client"), d3 = require("d3-geo");
const eras = JSON.parse(readFileSync(resolve(dir, "data/eras.json"), "utf8"));
const names = eras.polities.map((p) => p[0]);
const [y, m, dd] = date.split("-").map(Number);
const day = Math.round((Date.UTC(y, m - 1, dd) - Date.UTC(1886, 0, 1)) / 86400000);
const chunk = eras.dated.chunks.filter(([from]) => from <= y).pop();
const f = withHi(resolve(dir, "data", chunk[1]), JSON.parse(readFileSync(resolve(dir, "data", chunk[1]), "utf8")));
const days = new Map((f.days || []).map(([i, a, b]) => [i, [a, b]]));
const geoms = f.hi.objects.p.geometries;
const STATUS = ["state", "colony", "protectorate", "mandate", "occupied", "other", "disputed"];
const live = [];
const dayOf = (yy, mm, d) => Math.round((Date.UTC(yy, mm - 1, d) - Date.UTC(1886, 0, 1)) / 86400000);
f.rows.forEach((r, i) => {
  const [a, b] = days.get(i) || [null, null];
  const first = a != null ? a : dayOf(r[2], 1, 1), last = b != null ? b : dayOf(r[3], 12, 31);
  if (day < first || day > last) return;
  const g = client.feature(f.hi, geoms[i]);
  if (g.geometry) live.push({ r, i, g, box: d3.geoBounds(g) });
});
for (const p of places) {
  const [lon, lat, label] = p.split(",");
  const pt = [+lon, +lat];
  const hits = live.filter(({ box }) => pt[1] >= box[0][1] && pt[1] <= box[1][1]).filter(({ g }) => d3.geoContains(g, pt));
  console.log((label || p) + ": " + (hits.map(({ r, i }) => names[r[0]] + (r[1] >= 0 ? " (under " + names[r[1]] + ")" : "") + (r[4] ? " [" + (STATUS[r[4]] || r[4]) + "]" : "") + " " + r[2] + "–" + r[3]).join("; ") || "nothing"));
}

// What CHRONIA's data from 1886 draws at a place on a day.
// node tools/whatat.mjs <node_modules> <chronia dir> <lon> <lat> <YYYY-MM-DD> [more dates]
// Prints, for each date, the spans whose shape holds the point: name, status, owner, claimants, capital.
import { readFileSync } from "node:fs";
// The detailed lines of a data file are in a file beside it ("modern-hi.json"), since November 2026.
const withHi = (p, d) => { if (!d.hi) { try { d.hi = JSON.parse(readFileSync(p.replace(/\.json$/, "-hi.json"), "utf8")).hi; } catch (e) {} } return d; };
import { createRequire } from "node:module";
import { resolve } from "node:path";

const [mods, dir, lon, lat, ...dates] = process.argv.slice(2);
const require = createRequire(resolve(mods, "x.js"));
const client = require("topojson-client"), d3 = require("d3-geo");
const eras = JSON.parse(readFileSync(resolve(dir, "data/eras.json"), "utf8"));
const modern = withHi(resolve(dir, "data/modern.json"), JSON.parse(readFileSync(resolve(dir, "data/modern.json"), "utf8")));
const names = eras.polities.map((p) => p[0]);
const day0 = Date.UTC(1886, 0, 1), toDay = (Date.UTC(...modern.to.split("-").map((x, i) => (i === 1 ? x - 1 : +x))) - day0) / 86400000;
const geoms = modern.hi.objects.p.geometries;
const STATUS = ["state", "colony", "protectorate", "mandate", "occupied", "other", "disputed"];
const pt = [+lon, +lat];
for (const date of dates) {
  const [y, m, d] = date.split("-").map(Number), day = Math.min((Date.UTC(y, m - 1, d) - day0) / 86400000, toDay);
  const hits = [];
  modern.rows.forEach((r, i) => {
    const last = r[3] < 0 ? toDay : r[3];
    if (r[2] > day || last < day) return;
    const f = client.feature(modern.hi, geoms[i]);
    if (f.geometry && d3.geoContains(f, pt)) hits.push(names[r[0]] + " (" + (STATUS[r[4]] || r[4]) + (r[1] >= 0 && r[1] !== r[0] ? ", " + names[r[1]] : "") + (r[7] ? ", claimed by " + r[7].map((c) => names[c]).join(" and ") : "") + (r[5] ? ", capital " + r[5][0] : "") + ")");
  });
  console.log(date + (day === toDay && date > modern.to ? " (data ends " + modern.to + ")" : "") + ": " + (hits.join("; ") || "nothing"));
}

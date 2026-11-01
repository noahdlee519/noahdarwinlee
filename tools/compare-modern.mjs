// Compares two builds of CHRONIA's data from 1886 at sample points and dates.
// node tools/compare-modern.mjs <node_modules> <old chronia data dir> <new chronia data dir> <date> [more dates]
// Prints, for each date, the share of 5,000 sample points (a fixed grid) whose state, status, owner, or claimants differ.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const [mods, oldDir, newDir, ...dates] = process.argv.slice(2);
const require = createRequire(resolve(mods, "x.js"));
const client = require("topojson-client"), d3 = require("d3-geo");
const load = (dir) => {
  const eras = JSON.parse(readFileSync(resolve(dir, "eras.json"), "utf8")), modern = JSON.parse(readFileSync(resolve(dir, "modern.json"), "utf8"));
  const day0 = Date.UTC(1886, 0, 1), toDay = (Date.UTC(...modern.to.split("-").map((x, i) => (i === 1 ? x - 1 : +x))) - day0) / 86400000;
  const names = eras.polities.map((p) => p[0]);
  const feats = modern.hi.objects.p.geometries.map((g) => client.feature(modern.hi, g));
  const boxes = feats.map((f) => (f.geometry ? d3.geoBounds(f) : null));
  return { modern, toDay, names, feats, boxes };
};
const A = load(oldDir), B = load(newDir);
const pts = [];
for (let lat = -55; lat <= 75; lat += 2) for (let lon = -179; lon <= 179; lon += 2.3) pts.push([lon, lat]);
const at = (D, day, pt) => {
  const out = [];
  D.modern.rows.forEach((r, i) => {
    const last = r[3] < 0 ? D.toDay : r[3];
    if (r[2] > day || last < day || !D.boxes[i]) return;
    const b = D.boxes[i];
    if (b[0][0] <= b[1][0] && (pt[0] < b[0][0] || pt[0] > b[1][0])) return;
    if (pt[1] < b[0][1] || pt[1] > b[1][1]) return;
    if (d3.geoContains(D.feats[i], pt)) out.push(D.names[r[0]] + "|" + r[4] + "|" + (r[1] >= 0 ? D.names[r[1]] : "") + "|" + (r[7] || []).map((c) => D.names[c]).join("/"));
  });
  return out.sort().join(";");
};
for (const date of dates) {
  const [y, m, d] = date.split("-").map(Number), day = (Date.UTC(y, m - 1, d) - Date.UTC(1886, 0, 1)) / 86400000;
  let diff = 0, land = 0;
  const ex = [];
  for (const pt of pts) {
    const a = at(A, Math.min(day, A.toDay), pt), b = at(B, Math.min(day, B.toDay), pt);
    if (a || b) land++;
    if (a !== b) { diff++; if (ex.length < 8) ex.push(pt.join(",") + " " + a + " -> " + b); }
  }
  console.log(date + ": " + diff + " of " + land + " points on land differ" + (ex.length ? "\n  " + ex.join("\n  ") : ""));
}

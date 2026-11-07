// Compares two builds of CHRONIA's yearly data (3400 BC to 1885) at sample points and dates.
// node tools/compare-dated.mjs <node_modules> <old chronia dir> <new chronia dir> <YYYY-MM-DD or year> [more] [--box w,s,e,n] [--outside]
// Prints, for each date, how many of a fixed grid of points (every 2° of latitude and 2.3° of longitude) differ in state, ruler,
// status, part, or claimants; with --box only the points in the box count, with --outside only the points outside it.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const flag = (k) => { const i = args.indexOf(k); if (i < 0) return null; const v = args[i + 1]; args.splice(i, k === "--outside" ? 1 : 2); return v ?? true; };
const outside = !!flag("--outside"), boxArg = flag("--box");
const box = boxArg && boxArg !== true ? boxArg.split(",").map(Number) : null;
const [mods, oldDir, newDir, ...dates] = args;
const require = createRequire(resolve(mods, "x.js"));
const client = require("topojson-client"), d3 = require("d3-geo");
const dayOf = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1886, 0, 1)) / 86400000);
const load = (dir) => {
  const eras = JSON.parse(readFileSync(resolve(dir, "data/eras.json"), "utf8"));
  return { eras, names: eras.polities.map((p) => p[0]), files: new Map() };
};
const chunkOf = (D, y) => {
  const c = D.eras.dated.chunks.filter(([from]) => from <= y).pop();
  if (!D.files.has(c[1])) {
    const p = resolve(D === A ? oldDir : newDir, "data", c[1]), f = JSON.parse(readFileSync(p, "utf8"));
    // The detailed lines are in a file beside it ("1800-hi.json"), since November 2026.
    if (!f.hi) f.hi = JSON.parse(readFileSync(p.replace(/\.json$/, "-hi.json"), "utf8")).hi;
    const days = new Map((f.days || []).map(([i, a, b]) => [i, [a, b]]));
    const feats = f.hi.objects.p.geometries.map((g) => client.feature(f.hi, g));
    f.boxes = feats.map((g) => (g.geometry ? d3.geoBounds(g) : null));
    f.feats = feats;
    f.span = f.rows.map((r, i) => { const [a, b] = days.get(i) || [null, null]; return [a ?? (r[2] < 1000 ? -1e9 : dayOf(r[2], 1, 1)), b ?? dayOf(r[3], 12, 31)]; });
    D.files.set(c[1], f);
  }
  return D.files.get(c[1]);
};
const A = load(oldDir), B = load(newDir);
const pts = [];
for (let lat = -55; lat <= 75; lat += 2) for (let lon = -179; lon <= 179; lon += 2.3) {
  const inBox = box && lon >= box[0] && lon <= box[2] && lat >= box[1] && lat <= box[3];
  if (box && (outside ? inBox : !inBox)) continue;
  pts.push([lon, lat]);
}
const at = (D, y, day, pt) => {
  const f = chunkOf(D, y), out = [];
  f.rows.forEach((r, i) => {
    if (f.span[i][0] > day || f.span[i][1] < day || !f.boxes[i]) return;
    const b = f.boxes[i];
    if (b[0][0] <= b[1][0] && (pt[0] < b[0][0] || pt[0] > b[1][0])) return;
    if (pt[1] < b[0][1] || pt[1] > b[1][1]) return;
    if (d3.geoContains(f.feats[i], pt)) out.push(D.names[r[0]] + "|" + r[4] + "|" + (r[1] >= 0 ? D.names[r[1]] : "") + "|" + (r[8] >= 0 ? D.names[r[8]] : "") + "|" + (r[10] || []).map((c) => D.names[c]).join("/"));
  });
  return out.sort().join(";");
};
for (const date of dates) {
  const [y, m = 7, d = 1] = String(date).split("-").map(Number), day = dayOf(y, m, d);
  let diff = 0, land = 0;
  const ex = [];
  for (const pt of pts) {
    const a = at(A, y, day, pt), b = at(B, y, day, pt);
    if (a || b) land++;
    if (a !== b) { diff++; if (ex.length < 6) ex.push(pt.map((v) => v.toFixed(1)).join(",") + " " + a + " -> " + b); }
  }
  console.log(date + ": " + diff + " of " + land + " points on land differ" + (ex.length ? "\n  " + ex.join("\n  ") : ""));
}

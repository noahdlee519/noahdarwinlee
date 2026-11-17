// The last step of the build: each file's lines are tidied, at both levels of detail, once every file is written.
//   1. zip-slivers.mjs: long segments are given points along their great circles, the lines are cut wherever they cross, and
//      the hairline faces between two drawings of one border are closed.
//   2. mend-faces.mjs: the gaps and overlaps too wide for that (a strip no state covers on some date with land owned all round
//      it, or one that two states cover at once) change hands, so that the border is one line both states share. Gaps that run
//      out to the sea or to land nobody holds are first closed across their mouths, where the mouth lies on land (land.json).
//      And a hole in time is closed: a state gone from its land for part of a year, with nobody else there, and back again.
//   3. Handovers: where a newcomer's row begins on land some days or months before the old holder's row ends, the old row is
//      split in time and its later part gives up the newcomer's land (splitRows).
// It runs on the files as written, so the labels, the capitals, the colours, and the lists of neighbours are worked out from
// the shapes as they were. A file is marked ("tidy": 1) and is not done twice.
// build-eras.mjs calls tidyLines() at its end. To run it alone on built files: node tools/tidy-lines.mjs <node_modules> [data folder]
// (with --again after the two, on files already tidied: after a change to the steps, until the next full build)
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { closeSlivers } from "./zip-slivers.mjs";
import { mendInfo, landTest, applyTimeFixes, splitRows } from "./mend-faces.mjs";

export function tidyLines(data, require, km, log = console.log, again = false) {
  const client = require("topojson-client"), d3 = require("d3-geo");
  // As outward() in build-eras.mjs: a polygon d3 takes for the whole globe but itself is turned round.
  const outward = (topo) => {
    const flip = (poly) => (d3.geoArea(client.feature(topo, { type: "Polygon", arcs: poly })) <= 2 * Math.PI ? poly : poly.map((ring) => ring.slice().reverse().map((i) => ~i)));
    for (const g of topo.objects.p.geometries) { if (g.type === "Polygon") g.arcs = flip(g.arcs); else if (g.type === "MultiPolygon" && g.arcs.length) g.arcs = g.arcs.map(flip); }
    return topo;
  };
  const land = JSON.parse(readFileSync(resolve(data, "land.json"))), onLand = { lo: landTest(land.lo), hi: landTest(land.hi) };
  const files = ["modern.json"].concat(readdirSync(resolve(data, "dated")).filter((f) => f.endsWith(".json") && !f.endsWith("-hi.json")).sort().map((f) => "dated/" + f));
  const total = { files: 0, days: 0, split: 0, long: 0, cut: 0, closed: 0, km2: 0, mouths: 0, gaps: 0, overlaps: 0, faces: 0, mendedKm2: 0, shapes: 0, kept: 0, odd: 0 };
  for (const file of files) {
    const modern = file === "modern.json", path = resolve(data, file), hiPath = path.replace(/\.json$/, "-hi.json");
    const body = JSON.parse(readFileSync(path));
    if (body.tidy && !again) continue;
    const hi = JSON.parse(readFileSync(hiPath));
    // Handovers first: a trial run on a copy of the simplified lines finds the rows to split in time (mend-faces.mjs, splitRows).
    const found = [];
    closeSlivers(JSON.parse(JSON.stringify(body.lo)), km.lo, null, Object.assign({ handovers: found }, mendInfo(body, modern)));
    const cut = splitRows(body, hi, modern, found);
    if (cut.length) { total.split += new Set(cut.map((c) => c[0])).size; log("  " + file + ": " + new Set(cut.map((c) => c[0])).size + " rows split in time where a newcomer's row begins before the old holder's ends"); }
    const info = Object.assign(mendInfo(body, modern), { cut });
    for (const [topo, level, k] of [[body.lo, "lo", km.lo], [hi.hi, "hi", modern ? km.modernHi : km.hi]]) {
      // The holes in time are found once, in the simplified lines, and the detailed ones follow the days as changed.
      const fixes = level === "lo" ? [] : null;
      const st = closeSlivers(topo, k, outward, Object.assign({ onLand: onLand[level], timeFixes: fixes }, info)), m = st.mended;
      if (fixes && fixes.length) { applyTimeFixes(body, modern, fixes); total.days += fixes.length; for (const f of fixes) log("  " + file + ": row " + f.row + (f.from !== undefined ? " begins on day " + f.from : " ends on day " + f.to) + ", over a hole of " + f.km2 + " km²"); }
      total.long += st.long; total.cut += st.cut; total.closed += st.closed; total.km2 += st.km2; total.mouths += st.mouths;
      total.gaps += m.gaps; total.overlaps += m.overlaps; total.faces += m.faces; total.mendedKm2 += m.km2; total.shapes += m.shapes; total.kept += m.kept; total.odd += m.odd;
    }
    body.tidy = 1; hi.tidy = 1; total.files++;
    writeFileSync(path, JSON.stringify(body));
    writeFileSync(hiPath, JSON.stringify(hi));
  }
  log("lines tidied in " + total.files + " files: " + total.long + " points added along long segments, " + total.cut + " lines cut where they crossed, " + total.closed + " hairline faces closed (" + total.km2 + " km²), " + total.mouths + " open gaps closed across their mouths, " + total.gaps + " gaps and " + total.overlaps + " overlaps mended (" + total.faces + " faces, " + total.mendedKm2 + " km²) in " + total.shapes + " shapes; " + total.kept + " shapes left as they were, " + total.odd + " pieces of line that would not add up left alone; " + total.days + " rows begun earlier or ended later over holes in time, " + total.split + " rows split in time at a handover");
  return total;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const here = dirname(fileURLToPath(import.meta.url));
  tidyLines(resolve((process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : null) || resolve(here, "../data")), createRequire(resolve(process.argv[2] || "node_modules", "x.js")), { lo: 12, hi: 1.6, modernHi: 0.5 }, console.log, process.argv.includes("--again"));
}

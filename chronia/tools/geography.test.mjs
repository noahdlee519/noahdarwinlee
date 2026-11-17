// Tests of the dated geography as built (data/geography.json): node --test chronia/tools/geography.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const geo = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../data/geography.json"), "utf8"));
const km = (a, b) => { const R = 6371, t = Math.PI / 180, x = (b[0] - a[0]) * t * Math.cos(((a[1] + b[1]) / 2) * t), y = (b[1] - a[1]) * t; return R * Math.hypot(x, y); };
// The longest distance between two points of a lake's outer rings: for a thin arc, a little under its length.
const span = (polys) => { const pts = polys.flatMap((p) => p[0]); let m = 0; for (const a of pts) for (const b of pts) m = Math.max(m, km(a, b)); return m; };
const centre = (polys) => { const pts = polys.flatMap((p) => p[0]); return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]; };

test("the Manicouagan Reservoir appears in 1970, when the dam was commissioned", () => {
  const r = geo.lakes.only.find((x) => x[0] === "Réservoir Manicouagan");
  assert.equal(r[2], 1970);
});
test("before it, Lac Manicouagan lies east of the island and Lac Mouchalagane west, each an arc about 60 km long and 2 to 3 km wide", () => {
  const east = geo.lakes.add.find((x) => x[0] === "Lac Manicouagan"), west = geo.lakes.add.find((x) => x[0] === "Lac Mouchalagane");
  assert.ok(east && west, "both lakes are in the file");
  for (const l of [east, west]) {
    assert.equal(l[2], null);
    assert.equal(l[3], 1970);
    assert.ok(l[1] >= 120 && l[1] <= 190, l[0] + " is " + l[1] + " km²");
    const s = span(l[4]);
    assert.ok(s >= 45 && s <= 62, l[0] + " spans " + s.toFixed(1) + " km");
  }
  // the island's centre is about 68.7° W
  assert.ok(centre(east[4])[0] > -68.5 && centre(west[4])[0] < -68.9);
});

// The lakes Landsat saw before the dams (tools/lakes-before.json) are drawn until the reservoir's year.
const before = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "lakes-before.json"), "utf8"));
for (const [reservoir, d] of Object.entries(before)) {
  test(reservoir + ": the lakes under it are drawn until it appears", () => {
    const rows = geo.lakes.only.filter((x) => x[0] === reservoir), year = rows[0][2];
    assert.ok(year >= 1973, "the reservoir is dated after Landsat began");
    for (const l of d.lakes) {
      const r = geo.lakes.add.find((x) => x[0] === l.name);
      assert.ok(r, l.name + " is in the file");
      assert.deepEqual([r[2], r[3]], [null, year]);
      assert.ok(Math.abs(r[1] - l.km2) <= Math.max(3, 0.15 * l.km2), l.name + " is " + r[1] + " km², traced as " + l.km2);
    }
    assert.ok(d.km2 < rows.reduce((t, x) => t + x[1], 0), "the lakes are smaller than the reservoir");
  });
}

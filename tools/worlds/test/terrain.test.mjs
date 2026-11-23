import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../rng.mjs';
import { buildTerrain, landmasses } from '../terrain.mjs';

const W = 1600, H = 800;
const build = (seed, landShare, masses, style = {}) =>
  buildTerrain({ rng: makeRng(seed), width: W, height: H, landShare, masses, style });

const cases = [
  ['Le Guin', 0.33, 4, { layout: 'archipelago', islands: 0.2 }],
  ['Herbert', 0.38, 1, { layout: 'pangaea' }],
  ['Asimov', 0.35, 3, {}],
];

for (const [seed, share, masses, style] of cases) {
  test(`${seed}: land share is within 0.02 of the target`, () => {
    const t = build(seed, share, masses, style);
    let land = 0;
    for (let i = 0; i < W * H; i++) land += t.land[i];
    assert.ok(Math.abs(land / (W * H) - share) <= 0.02, `share ${land / (W * H)}`);
    // Sea all round the edge of the map.
    for (let x = 0; x < W; x++) assert.equal(t.land[x] + t.land[(H - 1) * W + x], 0);
    for (let y = 0; y < H; y++) assert.equal(t.land[y * W] + t.land[y * W + W - 1], 0);
    // Land is above the sea and the sea below it, except closed basins inland.
    let wrong = 0;
    for (let i = 0; i < W * H; i++) if (!t.land[i] && t.elev[i] >= 0) wrong++;
    assert.equal(wrong, 0);
  });

  test(`${seed}: the large landmasses have room for the flagships`, () => {
    const t = build(seed, share, masses, style);
    const { areas } = landmasses(t.land, W, H);
    const land = areas.reduce((s, a) => s + a, 0);
    // The largest flagship is about a sixth of the land and the smallest about
    // a fourteenth; together the seven take about four fifths of it.
    assert.ok(areas[0] >= land * 0.16, `largest mass ${areas[0]} of ${land}`);
    const roomy = areas.filter((a) => a >= land * 0.06).reduce((s, a) => s + a, 0);
    assert.ok(roomy >= land * 0.7, `roomy ${roomy} of ${land}`);
    assert.ok(t.ranges.length >= 1);
  });
}

test('the same seed gives the same terrain, and another seed a different one', () => {
  const a = build('Le Guin', 0.34, 2), b = build('Le Guin', 0.34, 2), c = build('Banks', 0.34, 2);
  assert.deepEqual(a.land, b.land);
  assert.deepEqual(a.elev, b.elev);
  let diff = 0;
  for (let i = 0; i < W * H; i++) if (a.land[i] !== c.land[i]) diff++;
  assert.ok(diff > W * H * 0.1);
});

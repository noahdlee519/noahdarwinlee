import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../rng.mjs';
import { buildTerrain } from '../terrain.mjs';
import { buildFields } from '../climate.mjs';
import { buildHydro } from '../hydro.mjs';

const W = 1600, H = 800;
const worlds = [['Asimov', 3, { latTop: 68, latBottom: -35 }], ['Atwood', 1, { layout: 'pangaea', latTop: 80, latBottom: 38 }]].map(([seed, masses, style]) => {
  const rng = makeRng(seed);
  const t = buildTerrain({ rng, width: W, height: H, landShare: 0.35, masses, style });
  const f = buildFields({ elev: t.elev, land: t.land, width: W, height: H, rng, style, dist: t.dist });
  const h = buildHydro({ elev: t.elev, land: t.land, width: W, height: H, rain: f.rain, rng, style });
  return { seed, t, h };
});
const cell = ([x, y]) => Math.floor(y) * W + Math.floor(x);

for (const { seed, t, h } of worlds) {
  test(`${seed}: there are rivers, and no river point lies in the sea`, () => {
    assert.ok(h.rivers.length >= 20, `${h.rivers.length} rivers`);
    assert.equal(h.rivers.length, h.riverMeta.length);
    for (const river of h.rivers) {
      assert.ok(river.length >= 2);
      for (const p of river) assert.equal(t.land[cell(p)], 1, `river point ${p} is in the sea`);
    }
  });

  test(`${seed}: elevation along a river never rises`, () => {
    for (const river of h.rivers) {
      for (let k = 1; k < river.length; k++) {
        assert.ok(h.filled[cell(river[k])] <= h.filled[cell(river[k - 1])], `river rises at ${river[k]}`);
      }
    }
  });

  test(`${seed}: every river ends at the sea, a lake, or a larger river that does`, () => {
    const onRiver = new Map(); // pixel -> rivers passing through it
    h.rivers.forEach((river, r) => river.forEach((p) => {
      const c = cell(p);
      if (!onRiver.has(c)) onRiver.set(c, []);
      onRiver.get(c).push(r);
    }));
    const touches = (c, test) => {
      const x = c % W, y = Math.floor(c / W);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const n = (y + dy) * W + x + dx;
        if (test(n)) return true;
      }
      return false;
    };
    const reaches = new Array(h.rivers.length).fill(null);
    const settle = (r, depth = 0) => {
      if (reaches[r] !== null) return reaches[r];
      assert.ok(depth < 200, 'rivers flow in a circle');
      const river = h.rivers[r], end = cell(river[river.length - 1]);
      const meta = h.riverMeta[r];
      let ok;
      if (meta.ends === 'sea') ok = touches(end, (n) => !t.land[n]);
      else if (meta.ends === 'lake') ok = touches(end, (n) => h.lakes[n] === 1);
      else {
        // It ends on another river: one that passes through its last point and
        // carries on from there, or reaches the sea or a lake at that very point.
        const others = (onRiver.get(end) || []).filter((o) => {
          if (o === r) return false;
          const other = h.rivers[o];
          const at = other.findIndex((p) => cell(p) === end);
          return at < other.length - 1 || h.riverMeta[o].ends !== 'river';
        });
        ok = others.length > 0 && others.some((o) => settle(o, depth + 1));
      }
      reaches[r] = ok;
      return ok;
    };
    h.rivers.forEach((_, r) => assert.ok(settle(r), `river ${r} (${h.riverMeta[r].ends}) goes nowhere`));
  });

  test(`${seed}: rivers widen downstream`, () => {
    // Where one stretch hands on to the next, the next is at least as wide.
    const starts = new Map();
    h.rivers.forEach((river, r) => starts.set(cell(river[0]), r));
    h.rivers.forEach((river, r) => {
      const next = starts.get(cell(river[river.length - 1]));
      if (next !== undefined && next !== r) assert.ok(h.riverMeta[next].width >= h.riverMeta[r].width);
    });
    assert.ok(h.riverMeta.some((m) => m.width >= 3));
  });

  test(`${seed}: lakes sit in basins`, () => {
    let lake = 0;
    for (let i = 0; i < W * H; i++) {
      if (!h.lakes[i]) continue;
      lake++;
      assert.equal(t.land[i], 1);
      // A lake pixel is a hollow: the filled surface stands above the ground.
      assert.ok(h.filled[i] > t.elev[i]);
    }
    assert.ok(lake > 0);
  });
}

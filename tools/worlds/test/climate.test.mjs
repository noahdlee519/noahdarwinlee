import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../rng.mjs';
import { buildTerrain, latitudeAt } from '../terrain.mjs';
import { buildClimate, COVER, DRY_CLASSES } from '../climate.mjs';

const W = 1600, H = 800, N = W * H;
const cache = new Map();
function world(seed, style) {
  if (!cache.has(seed)) {
    const rng = makeRng(seed);
    const t = buildTerrain({ rng, width: W, height: H, landShare: 0.35, masses: 2, style });
    const c = buildClimate({ elev: t.elev, land: t.land, width: W, height: H, rng, style, dist: t.dist });
    cache.set(seed, { t, c, style });
  }
  return cache.get(seed);
}
const shares = (c, land) => {
  const n = new Array(12).fill(0);
  let total = 0;
  for (let i = 0; i < N; i++) if (land[i]) { n[c.cover[i]]++; total++; }
  return n.map((v) => v / total);
};

const temperate = { latTop: 68, latBottom: -35 };
const arid = { layout: 'pangaea', latTop: 45, latBottom: 5, wet: 0.8 };
const wettest = { latTop: 16, latBottom: -16, wet: 1.5 };
const cold = { latTop: 82, latBottom: 40 };

test('every land pixel has a class, and the sea has none', () => {
  for (const [seed, style] of [['Asimov', temperate], ['Herbert', arid]]) {
    const { t, c } = world(seed, style);
    for (let i = 0; i < N; i++) {
      if (t.land[i]) assert.ok(c.cover[i] !== COVER.WATER && c.cover[i] !== COVER.URBAN, `land pixel ${i} has class ${c.cover[i]}`);
      else assert.equal(c.cover[i], COVER.WATER);
    }
  }
});

test('snow lies only on high ground or in high latitudes', () => {
  for (const [seed, style] of [['Asimov', temperate], ['Shelley', cold], ['Herbert', arid]]) {
    const { t, c } = world(seed, style);
    for (let y = 0; y < H; y++) {
      const lat = Math.abs(latitudeAt(y, H, style));
      if (lat >= 52) continue;
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (c.cover[i] !== COVER.SNOW) continue;
        // A facet is one class throughout, so look for the high ground it sits on nearby.
        let high = 0;
        for (let dy = -10; dy <= 10; dy += 2) for (let dx = -10; dx <= 10; dx += 2) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < W && yy < H) high = Math.max(high, t.elev[yy * W + xx]);
        }
        assert.ok(high >= 0.25, `snow at ${x},${y} (lat ${lat.toFixed(0)}) on ground only ${high.toFixed(2)} high`);
      }
    }
  }
});

test('cold worlds have snow and ice, but only a little of their land', () => {
  // Snow lies on the highest peaks and polar land only, broken up with rock.
  const { t, c } = world('Shelley', cold);
  const snow = shares(c, t.land)[COVER.SNOW];
  assert.ok(snow > 0.008 && snow < 0.08, `snow covers ${snow}`);
});

test('deserts and steppe fill a dry world and are all but absent from the wettest', () => {
  const dry = world('Herbert', arid), wet = world('Delany', wettest), mid = world('Asimov', temperate);
  const d = shares(dry.c, dry.t.land), w = shares(wet.c, wet.t.land), m = shares(mid.c, mid.t.land);
  const dryShare = (v) => DRY_CLASSES.reduce((a, k) => a + v[k], 0);
  assert.ok(dryShare(d) > 0.4, `dry world: ${d}`);
  assert.ok(w[COVER.DESERT] < 0.005 && dryShare(w) < 0.03, `wet world: ${w}`);
  assert.ok(w[COVER.FOREST] + w[COVER.WOODLAND] > 0.6, `wet world: ${w}`);
  // A world that runs from the subarctic across the equator has some of everything.
  for (const k of [COVER.FOREST, COVER.WOODLAND, COVER.GRASS, COVER.STEPPE, COVER.DESERT, COVER.ROCK]) assert.ok(m[k] > 0.01, `class ${k}: ${m}`);
});

test('the same seed gives the same land cover', () => {
  const rngA = makeRng('Asimov'), rngB = makeRng('Asimov');
  const { t } = world('Asimov', temperate);
  const a = buildClimate({ elev: t.elev, land: t.land, width: W, height: H, rng: rngA, style: temperate });
  const b = buildClimate({ elev: t.elev, land: t.land, width: W, height: H, rng: rngB, style: temperate });
  assert.deepEqual(a.cover, b.cover);
  assert.deepEqual(a.ponds, b.ponds);
});

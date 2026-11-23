import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeWorld } from '../world.mjs';
import { buildWorldFiles } from '../output.mjs';
import { labelRects, rectsOverlap } from '../labels.mjs';
import { RANK } from '../settlements.mjs';

const projects = JSON.parse(readFileSync(new URL('../../../portfolio-map/projects.json', import.meta.url), 'utf8'));
const world = makeWorld('Le Guin', projects);
const { width: W, height: H, land, lakes, owner } = world;
const D = world.detail;
// On land, allowing for coordinates rounded to tenths.
const onLand = (x, y) => {
  for (const [dx, dy] of [[0, 0], [0.12, 0], [-0.12, 0], [0, 0.12], [0, -0.12], [0.12, 0.12], [-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12]]) {
    const qx = Math.floor(x + dx), qy = Math.floor(y + dy);
    if (qx >= 0 && qy >= 0 && qx < W && qy < H && land[qy * W + qx] && !lakes[qy * W + qx]) return true;
  }
  return false;
};

test('every country has a capital, and every settlement is on land in its own country', () => {
  for (let k = 0; k < projects.length; k++) assert.equal(world.settlements.filter((s) => s.country === k && s.rank === RANK.CAPITAL).length, 1, `${projects[k].name} has no one capital`);
  for (const s of world.settlements) {
    assert.ok(onLand(s.x, s.y), `a settlement at ${s.x},${s.y} is not on land`);
    assert.equal(owner[Math.floor(s.y) * W + Math.floor(s.x)], s.country, `a settlement at ${s.x},${s.y} is outside its country`);
  }
  const ranks = [0, 1, 2, 3].map((r) => world.settlements.filter((s) => s.rank === r).length);
  assert.ok(ranks[1] >= 7 && ranks[2] > ranks[1] && ranks[3] > ranks[2], `a hierarchy of places: ${ranks}`);
});

test('roads and streets keep to the land; only ferries cross the sea', () => {
  const check = (pts, what) => {
    for (let k = 1; k < pts.length; k++) {
      const [x0, y0] = pts[k - 1], [x1, y1] = pts[k];
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.4));
      for (let j = 0; j <= n; j++) {
        const x = x0 + ((x1 - x0) * j) / n, y = y0 + ((y1 - y0) * j) / n;
        assert.ok(onLand(x, y), `${what} leaves the land at ${x.toFixed(1)},${y.toFixed(1)}`);
      }
    }
  };
  assert.ok(D.roads.roads.some((r) => r.cls === 'highway') && D.roads.roads.some((r) => r.cls === 'local'), 'no highways or local roads');
  for (const r of D.roads.roads) check(r.pts, `a ${r.cls} road`);
  for (const s of D.roads.streets) check(s, 'a street');
  for (const [a, b] of D.roads.ferries) {
    assert.ok(onLand(a[0], a[1]) && onLand(b[0], b[1]), 'a ferry does not run between two places on land');
  }
});

test('each national park lies inside one country', () => {
  assert.ok(D.parks.parks.length >= 2, `only ${D.parks.parks.length} parks`);
  D.parks.parks.forEach((p, id) => {
    let n = 0;
    for (let i = 0; i < W * H; i++) if (D.parks.mask[i] === id) { n++; assert.equal(owner[i], p.country, `${p.name} crosses into another country`); }
    assert.ok(n > 0, `${p.name} is empty`);
    assert.ok(/ National Park$/.test(p.name), p.name);
  });
});

test('no two labels overlap, at any zoom, the finer detail’s included', () => {
  const all = [...world.labels, ...D.labels];
  const rects = all.map((l) => labelRects(l));
  // A coarse grid keeps this from comparing every pair.
  const G = 40, cells = new Map();
  rects.forEach((rs, k) => {
    for (const r of rs) {
      const e = Math.hypot(r.hw, r.hh);
      for (let gx = Math.floor((r.cx - e) / G); gx <= Math.floor((r.cx + e) / G); gx++) for (let gy = Math.floor((r.cy - e) / G); gy <= Math.floor((r.cy + e) / G); gy++) {
        const key = gx + ',' + gy;
        if (!cells.has(key)) cells.set(key, new Set());
        cells.get(key).add(k);
      }
    }
  });
  const seen = new Set();
  for (const set of cells.values()) {
    const list = [...set];
    for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
      const i = Math.min(list[a], list[b]), j = Math.max(list[a], list[b]);
      if (seen.has(i * 100000 + j)) continue;
      seen.add(i * 100000 + j);
      const hit = rects[i].some((x) => rects[j].some((y) => rectsOverlap(x, y)));
      assert.ok(!hit, `${all[i].text} (${all[i].kind}) overlaps ${all[j].text} (${all[j].kind})`);
    }
  }
  const kinds = new Set(D.labels.map((l) => l.kind));
  for (const k of ['city', 'town', 'village', 'peak', 'park', 'shield']) assert.ok(kinds.has(k), `no ${k} names`);
});

test('the finer detail is the same byte for byte from the same seed', () => {
  const a = buildWorldFiles(world), b = buildWorldFiles(makeWorld('Le Guin', projects));
  assert.equal(a.json, b.json);
  assert.equal(a.detail, b.detail);
});

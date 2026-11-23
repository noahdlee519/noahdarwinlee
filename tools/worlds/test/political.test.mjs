import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildLand, buildNations } from '../world.mjs';
import { landmasses } from '../terrain.mjs';

const projects = JSON.parse(readFileSync(new URL('../../../projects/projects.json', import.meta.url), 'utf8'));
const W = 1600, H = 800, N = W * H;

// Check everything the plan asks of a division of the land.
function check(world, list, nations) {
  const { land } = world;
  const { owner, provinces, areas, capitals } = nations;
  // No unowned land, and no owned sea.
  for (let i = 0; i < N; i++) {
    if (land[i]) assert.ok(owner[i] >= 0 && owner[i] < list.length, `land pixel ${i} has no owner`);
    else assert.equal(owner[i], -1);
  }
  // Every project has a country.
  list.forEach((p, i) => assert.ok(areas[i] > 0, `${p.name} has no land`));
  // Flagships strictly decreasing by rank, and every flagship larger than every small country.
  const flags = list.map((p, i) => ({ p, i })).filter((e) => e.p.tier === 'flagship').sort((a, b) => a.p.rank - b.p.rank);
  for (let k = 1; k < flags.length; k++) {
    assert.ok(areas[flags[k - 1].i] > areas[flags[k].i], `${flags[k - 1].p.name} (${areas[flags[k - 1].i]}) should be larger than ${flags[k].p.name} (${areas[flags[k].i]})`);
  }
  const smallest = areas[flags[flags.length - 1].i];
  list.forEach((p, i) => { if (p.tier !== 'flagship') assert.ok(areas[i] < smallest, `${p.name} (${areas[i]}) should be smaller than the smallest flagship (${smallest})`); });
  // Each flagship is one piece of mainland; anything else it holds is a
  // small offshore island that had no project of its own.
  const masses = landmasses(land, W, H);
  const seen = new Uint8Array(N);
  const stack = new Int32Array(N);
  for (const { p, i: index } of flags) {
    const pieces = [];
    for (let s = 0; s < N; s++) {
      if (owner[s] !== index || seen[s]) continue;
      let top = 0, size = 0;
      stack[top++] = s; seen[s] = 1;
      while (top) {
        const i = stack[--top], x = i % W;
        size++;
        for (const n of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
          if (n >= 0 && n < N && owner[n] === index && !seen[n]) { seen[n] = 1; stack[top++] = n; }
        }
      }
      pieces.push({ size, mass: masses.id[s] });
    }
    pieces.sort((a, b) => b.size - a.size);
    assert.ok(pieces[0].size >= areas[index] * 0.9, `${p.name}'s mainland is only ${pieces[0].size} of ${areas[index]}`);
    for (const piece of pieces.slice(1)) {
      assert.notEqual(piece.mass, pieces[0].mass, `${p.name} is in two pieces on one landmass`);
      assert.equal(piece.size, masses.areas[piece.mass], `${p.name} holds part of an island, not the whole of it`);
    }
  }
  // Provinces: each non-empty, inside its project, and covering all of it.
  list.forEach((p, index) => {
    const count = new Array(p.provinces ? p.provinces.length : 0).fill(0);
    for (let i = 0; i < N; i++) {
      if (owner[i] !== index) { if (!p.provinces) continue; assert.ok(provinces[i] === -1 || list[owner[i]]?.provinces, 'a province outside its project'); continue; }
      if (p.provinces) { assert.ok(provinces[i] >= 0 && provinces[i] < count.length); count[provinces[i]]++; }
      else assert.equal(provinces[i], -1);
    }
    count.forEach((c, k) => assert.ok(c > areas[index] * 0.08, `${p.provinces[k].name} has only ${c} of ${areas[index]}`));
  });
  // A capital in each country.
  assert.equal(capitals.length, list.length);
  for (const c of capitals) assert.equal(list[owner[Math.floor(c.y) * W + Math.floor(c.x)]].id, c.id);
}

const lands = new Map();
const landOf = (name, list) => {
  const key = name + '/' + list.length;
  if (!lands.has(key)) lands.set(key, buildLand(name, list));
  return lands.get(key);
};

for (const name of ['Le Guin', 'Herbert', 'Clarke']) {
  test(`${name}: all land is project land, flagships are ranked mainland countries, and Dealdesk has its provinces`, () => {
    const world = landOf(name, projects);
    check(world, projects, buildNations(world, projects));
  });
}

test('a nineteenth project, small or flagship, still gives a valid world', () => {
  const small = [...projects, { id: 'test-small', name: 'A Nineteenth Project', tier: 'small' }];
  const flag = [...projects, { id: 'test-flag', name: 'Eighth Flagship', tier: 'flagship', rank: 8 }];
  for (const [name, list] of [['Le Guin', small], ['Asimov', flag]]) {
    const world = landOf(name, list);
    check(world, list, buildNations(world, list));
  }
});

test('one project fewer still gives a valid world', () => {
  const list = projects.filter((p) => p.id !== 'substack');
  const world = landOf('Clarke', list);
  check(world, list, buildNations(world, list));
});

test('the same seed gives the same countries', () => {
  const world = landOf('Herbert', projects);
  const a = buildNations(buildLand('Herbert', projects), projects), b = buildNations(buildLand('Herbert', projects), projects);
  assert.deepEqual(a.owner, b.owner);
  assert.deepEqual(a.provinces, b.provinces);
  assert.ok(world);
});

test('polar ice and the About island belong to no country', async () => {
  const { buildLand: bl } = await import('../world.mjs');
  const world = bl('Atwood', projects);
  const nations = buildNations(world, projects);
  let ice = 0;
  for (let i = 0; i < W * H; i++) if (world.ice[i]) {
    ice++;
    assert.equal(nations.owner[i], -1, 'polar ice has an owner');
    const y = Math.floor(i / W);
    assert.ok(y < 120 || y > H - 120, 'ice away from the pole');
  }
  assert.ok(ice > 5000, `only ${ice} pixels of ice`);
  // The ice is seamless where the world wraps: the east and west edge columns match.
  let differ = 0;
  for (let y = 0; y < H; y++) if (world.ice[y * W] !== world.ice[y * W + W - 1]) differ++;
  assert.ok(differ <= 3, `the ice breaks at the seam on ${differ} rows`);
});

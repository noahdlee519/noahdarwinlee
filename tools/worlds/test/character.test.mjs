// The character of the land, by the rules of the pass of 23 November (late): towns of several kinds and few ring
// roads, deserts in broad smooth fields, polar land after Greenland's, fewer and more characterful lakes, borders of
// several kinds, and an About island that differs from world to world.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WORLDS, buildLand, buildNations } from '../world.mjs';
import { classifyCover, prepareCover, renderCover, COVER, DRY_CLASSES } from '../climate.mjs';
import { warpRivers, buildSmallLakes, findVolcanoes } from '../lakes.mjs';
import { ABOUT_KINDS } from '../about.mjs';

const projects = JSON.parse(readFileSync(new URL('../../../projects/projects.json', import.meta.url), 'utf8'));
const lands = new Map();
const landOf = (name) => { if (!lands.has(name)) lands.set(name, buildLand(name, projects)); return lands.get(name); };

test('borders are of several kinds: some surveyed straight, along a parallel or a meridian, the rest natural', () => {
  let straight = 0, natural = 0, worldsWithStraight = 0;
  for (const name of ['Herbert', 'Jemisin', 'Verne', 'Clarke']) {
    const nations = buildNations(landOf(name), projects);
    const k = nations.borderKinds;
    const s = k.filter((b) => b.kind === 'straight' || b.kind === 'parallel' || b.kind === 'meridian');
    straight += s.length; natural += k.length - s.length;
    if (s.length) worldsWithStraight++;
    // A surveyed border is a straight line: every pixel edge the two countries share lies close to it.
    const { width: W, height: H } = landOf(name);
    for (const b of s) {
      const [ax, ay] = b.from, [bx, by] = b.to, l = Math.hypot(bx - ax, by - ay);
      if (b.kind === 'parallel') assert.ok(Math.abs(ay - by) < 0.01, 'a parallel runs east and west');
      if (b.kind === 'meridian') assert.ok(Math.abs(ax - bx) < 0.01, 'a meridian runs north and south');
      let near = 0, all = 0;
      for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
        const i = y * W + x, a = nations.owner[i];
        for (const j of [i + 1, i + W]) {
          const c = nations.owner[j];
          if (!((a === b.a && c === b.b) || (a === b.b && c === b.a))) continue;
          const mx = j === i + 1 ? x + 1 : x + 0.5, my = j === i + 1 ? y + 0.5 : y + 1;
          const t = ((mx - ax) * (bx - ax) + (my - ay) * (by - ay)) / (l * l);
          if (t < 0.05 || t > 0.95) continue;
          all++;
          if (Math.abs((mx - ax) * (by - ay) - (my - ay) * (bx - ax)) / l < 1.2) near++;
        }
      }
      assert.ok(all === 0 || near / all > 0.9, `${name}: a ${b.kind} border strays from its line (${near} of ${all})`);
    }
  }
  assert.ok(worldsWithStraight >= 3, `straight borders in only ${worldsWithStraight} of four worlds`);
  assert.ok(natural > straight, `natural borders (${natural}) should still outnumber surveyed ones (${straight})`);
});

test('lakes: few and characterful, tiny ones only in a glaciated lake district', () => {
  const counts = {};
  for (const name of ['Le Guin', 'Atwood', 'Herbert']) {
    const world = landOf(name);
    const { width, height, rng, land, elev, hydro, fields, terrain, style } = world;
    const nations = buildNations(world, projects);
    const { rivers: drawnRivers } = warpRivers(hydro.rivers, hydro.riverMeta, { land, elev, dist: terrain.dist, width, height, rng });
    const volcanoes = findVolcanoes({ land, elev, width, height, rng, count: style.volcanoes ?? (rng.fork('vn').chance(0.6) ? 2 : 0) });
    const L = buildSmallLakes({ land, elev, temp: fields.temp, moist: fields.moist, hydro, dist: terrain.dist, style, width, height, rng, drawnRivers, volcanoes, keepClear: nations.capitals }).lakes;
    let landPx = 0;
    for (const v of land) landPx += v;
    const per10k = (L.length / landPx) * 1e4, tiny = L.filter((l) => l.area < 1).length;
    counts[name] = { per10k, tiny, kinds: new Set(L.map((l) => l.kind)) };
    assert.ok(per10k < 5, `${name}: ${per10k.toFixed(1)} small lakes per 10,000 units of land`);
    assert.ok(tiny <= 40, `${name}: ${tiny} tiny lakes`);
    // Kettle lakes keep to their district: they lie in clusters, not strewn over the land.
    const kettles = L.filter((l) => l.kind === 'kettle');
    if (kettles.length > 10) {
      const cx = kettles.reduce((a, l) => a + l.x, 0) / kettles.length, cy = kettles.reduce((a, l) => a + l.y, 0) / kettles.length;
      const near = kettles.filter((l) => kettles.filter((o) => Math.hypot(o.x - l.x, o.y - l.y) < 40).length >= 4).length;
      assert.ok(near / kettles.length > 0.8, `${name}: kettle lakes are scattered (${near} of ${kettles.length} in clusters, round ${cx.toFixed(0)},${cy.toFixed(0)})`);
    }
  }
  // The cold, wet world has a lake district; the dry one none, but still a large lake and a crater or a tarn.
  assert.ok(counts.Atwood.kinds.has('kettle') && counts.Atwood.per10k > counts.Herbert.per10k);
  assert.ok(!counts.Herbert.kinds.has('kettle'), 'kettle lakes in a desert world');
  for (const n of ['Le Guin', 'Atwood']) assert.ok(['finger', 'chain', 'large'].filter((k) => counts[n].kinds.has(k)).length >= 2, `${n} lacks characterful lakes: ${[...counts[n].kinds]}`);
});

test('deserts are broad smooth fields of sand and dry grass, with rocky ground, salt flats, and dunes close in', () => {
  const world = landOf('Herbert');
  const pic = classifyCover({ ...world.coverArgs, scale: 1.5 });
  const { cover, width: PW, height: PH } = pic;
  const dry = new Set(DRY_CLASSES);
  let dryPx = 0, landPx = 0, pairs = 0, change = 0;
  const seen = new Set();
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW - 1; x++) {
    const c = cover[y * PW + x], d = cover[y * PW + x + 1];
    if (c === 255) continue;
    landPx++;
    if (dry.has(c)) { dryPx++; seen.add(c); }
    if (dry.has(c) && dry.has(d)) { pairs++; if (c !== d) change++; }
  }
  assert.ok(dryPx / landPx > 0.35, `Herbert is only ${((100 * dryPx) / landPx).toFixed(0)}% desert and steppe`);
  // No shards: neighbouring desert pixels nearly always share a class.
  assert.ok(change / pairs < 0.03, `the desert changes class at ${((100 * change) / pairs).toFixed(1)}% of neighbouring pixels`);
  for (const c of [COVER.DESERT, COVER.STEPPE, COVER.DRYROCK, COVER.SALT]) assert.ok(seen.has(c), `no ${Object.keys(COVER).find((k) => COVER[k] === c)} in Herbert's deserts`);
  assert.ok(!seen.has(COVER.DUNE), 'dune ripples show only close in');
  // Close in, the dune seas ripple, a shade off the sand; oases are small and few.
  const prep = prepareCover({ ...world.coverArgs, scale: 8 });
  let dunes = 0;
  for (let ty = 0; ty < 4 && !dunes; ty++) for (let tx = 0; tx < 12 && !dunes; tx++) {
    const w = renderCover(prep, tx * 1024, 1600 + ty * 1024, 512, 512);
    for (const c of w.cover) if (c === COVER.DUNE) dunes++;
  }
  assert.ok(dunes > 0, 'no dune ripples in the finer tiles');
  assert.ok(world.oases.length >= 2 && world.oases.length <= 9, `${world.oases.length} oases`);
});

test('polar land: a thick ice sheet off the map\'s edge, seamless, with a rocky and green fringe, nunataks, and a join', () => {
  const polarWorlds = WORLDS.filter((w) => w.ice);
  assert.ok(polarWorlds.length >= 5);
  assert.ok(new Set(polarWorlds.map((w) => w.polar)).size >= 3, 'polar land should join, nearly join, and stand apart in different worlds');
  const world = landOf('Zelazny'), { width: W, height: H, polar } = world;
  // Runs off the top edge all the way round, and is the same either side of the seam.
  let top = 0, depthSum = 0;
  for (let x = 0; x < W; x++) {
    if (polar.all[x]) top++;
    let k = 0;
    while (k < H && polar.all[k * W + x]) k++;
    depthSum += k;
  }
  assert.ok(top / W > 0.97, `the ice meets the top edge in only ${top} of ${W} columns`);
  assert.ok(depthSum / W > 70, `the ice sheet is only ${(depthSum / W).toFixed(0)} units deep on average`);
  let differ = 0;
  for (let y = 0; y < H; y++) if (polar.all[y * W] !== polar.all[y * W + W - 1]) differ++;
  assert.ok(differ <= 2, `the polar land breaks at the seam on ${differ} rows`);
  // Joined by an isthmus: a country holds some of the fringe, and the ice itself stays unclaimed.
  const nations = buildNations(world, projects);
  let claimed = 0;
  for (let i = 0; i < W * H; i++) { if (polar.claim[i] && nations.owner[i] >= 0) claimed++; if (world.ice[i]) assert.equal(nations.owner[i], -1, 'the ice sheet has an owner'); }
  assert.ok(claimed > 100, `only ${claimed} pixels of the polar fringe belong to a country`);
  // Its cover: mostly ice, a fringe of rock and tundra, and rock poking through the ice.
  const c = { snow: 0, rock: 0, grass: 0, inner: 0 };
  for (let y = 0.5; y < 140; y += 1) for (let x = 0.5; x < W; x += 2) {
    const v = polar.cover(x, y);
    if (v === COVER.SNOW) c.snow++; else if (v === COVER.ROCK) { c.rock++; if (y < 40) c.inner++; } else if (v === COVER.GRASS) c.grass++;
  }
  assert.ok(c.snow > c.rock + c.grass, 'the polar land is mostly ice');
  assert.ok(c.rock > 200 && c.grass > 200, `a fringe of rock (${c.rock}) and tundra (${c.grass})`);
  assert.ok(c.inner > 5, 'no nunataks in the ice');
});

test('the About island differs from world to world', () => {
  const kinds = WORLDS.map((w) => w.about);
  assert.ok(kinds.every((k) => ABOUT_KINDS.includes(k)), 'every world names a known setting');
  assert.ok(!ABOUT_KINDS.includes('lake'), 'an island in a lake is no longer one of the settings');
  assert.ok(new Set(kinds).size >= 7, `only ${new Set(kinds).size} settings across the twenty worlds`);
  const seen = {};
  for (const name of ['Bradbury', 'Gibson', 'Le Guin', 'Butler', 'Herbert']) {
    const a = landOf(name).about;
    assert.ok(a, `${name} has no About island`);
    seen[a.kind] = a;
  }
  assert.ok(seen.volcano.pond && seen.volcano.pond.crater && seen.volcano.crater, 'a volcano with a crater lake');
  assert.ok(seen.atoll.lagoon && seen.atoll.lagoon.r > 4, 'a lagoon within the island');
  assert.ok(seen.lighthouse.islets.length >= 1 && seen.lighthouse.lighthouse, 'a lighthouse, with stacks off its point');
  assert.ok(seen.causeway.causeway && seen.causeway.islets.some((p) => p.causeway), 'a causeway to an islet of its own');
  assert.ok(seen.loch.pond.r > seen.volcano.pond.r * 1.8, 'a larger lake in the middle of a loch island');
});

// The pass of 24 November: borders with history in them (long thin coastal countries, corridors to the sea or a
// river, shared islands, lines through lakes, and jogs round towns and river bends), volcanic island arcs, islands
// with towns in rivers and lakes, atolls that read by zoom 4, Braidable's braided delta, and the portfolio's square
// island with its round harbour.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { WORLDS, buildLand, buildNations } from '../world.mjs';
import { shapeSpecials } from '../shapes.mjs';
import { shapeFrontiers, piecesOf, sharedBorder } from '../frontiers.mjs';
import { coastDistance, landmasses } from '../terrain.mjs';
import { pathLines } from '../geom.mjs';
import { THEMED_PLACES } from '../cultures.mjs';
import { placeLabels, wrappedMiddle, labelRects, rectsOverlapWrapped } from '../labels.mjs';
import { makeRng } from '../rng.mjs';

const projects = JSON.parse(readFileSync(new URL('../../../projects/projects.json', import.meta.url), 'utf8'));
const idx = (id) => projects.findIndex((p) => p.id === id);

test('the borders\' new shapes keep the flagships whole and in order, every capital at home, and CHRONIA beside UCHRONIA', () => {
  const kinds = new Map();
  let paired = 0;
  const names = WORLDS.map((w) => w.name);
  for (const name of names) {
    const world = buildLand(name, projects), nations = buildNations(world, projects);
    shapeSpecials(world, nations, projects);
    const dist = coastDistance(world.land, world.width, world.height);
    const done = shapeFrontiers({ owner: nations.owner, land: world.land, width: world.width, height: world.height, projects, nations, rng: world.rng, dist, hydro: world.hydro });
    for (const f of done) kinds.set(f.kind, (kinds.get(f.kind) || 0) + 1);
    const { owner } = nations, W = world.width, H = world.height, N = W * H;
    // The areas as kept agree with the map.
    const areas = new Array(projects.length).fill(0);
    for (let i = 0; i < N; i++) if (owner[i] >= 0) areas[owner[i]]++;
    assert.deepEqual(areas, nations.areas, `${name}: the areas were not kept`);
    // Flagships in order, each larger than every small country, and each one piece on its own landmass.
    const flags = projects.map((p, k) => k).filter((k) => projects[k].tier === 'flagship').sort((a, b) => projects[a].rank - projects[b].rank);
    for (let f = 1; f < flags.length; f++) assert.ok(areas[flags[f - 1]] > areas[flags[f]], `${name}: ${projects[flags[f - 1]].name} is not larger than ${projects[flags[f]].name}`);
    for (let k = 0; k < projects.length; k++) if (projects[k].tier !== 'flagship') assert.ok(areas[k] < areas[flags[flags.length - 1]], `${name}: ${projects[k].name} outgrew a flagship`);
    const masses = landmasses(world.land, W, H);
    for (const f of flags) {
      const byMass = new Map();
      for (let i = 0; i < N; i++) if (owner[i] === f) byMass.set(masses.id[i], (byMass.get(masses.id[i]) || 0) + 1);
      const main = [...byMass.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const one = new Int16Array(N).fill(-1);
      for (let i = 0; i < N; i++) if (owner[i] === f && masses.id[i] === main) one[i] = 0;
      assert.equal(piecesOf(one, 0, W, H), 1, `${name}: ${projects[f].name}'s main body is in pieces`);
    }
    for (const c of nations.capitals) assert.equal(projects[owner[Math.floor(c.y) * W + Math.floor(c.x)]].id, c.id, `${name}: ${c.id}'s capital is abroad`);
    if (sharedBorder(owner, idx('chronia'), idx('uchronia'), W, H) > 0) paired++;
  }
  assert.ok(paired >= names.length - 4, `CHRONIA borders UCHRONIA in only ${paired} of ${names.length} worlds`);
  for (const k of ['corridor', 'island', 'lake']) assert.ok((kinds.get(k) || 0) >= 6, `only ${kinds.get(k) || 0} ${k} borders in ${names.length} worlds`);
  assert.ok((kinds.get('ribbon') || 0) >= 1, 'no long thin coastal country');
});

test('Braidable is a braided delta of interlaced islands, and the portfolio a compact island with a round harbour', () => {
  for (const name of ['Le Guin', 'Clarke', 'Jemisin']) {
    const world = buildLand(name, projects), nations = buildNations(world, projects);
    const before = nations.areas[idx('braidable')];
    const got = shapeSpecials(world, nations, projects);
    assert.ok(got.braid && got.folio, `${name}: a shape is missing`);
    // The strands cut the land into several islands, or a delta of several arms.
    const W = world.width, H = world.height;
    assert.ok(piecesOf(nations.owner, idx('braidable'), W, H) >= 3 || got.braid.mainland, `${name}: Braidable is not braided`);
    assert.ok(nations.areas[idx('braidable')] < before && nations.areas[idx('braidable')] > before * 0.6, `${name}: the channels took ${before - nations.areas[idx('braidable')]} of ${before}`);
    // The harbour is water, round, and open to the sea.
    const [hx, hy, R] = got.folio.harbour;
    assert.ok(R >= 3, `${name}: a harbour of ${R}`);
    let wet = 0, n = 0;
    for (let a = 0; a < 24; a++) for (const f of [0, 0.4, 0.8]) { n++; if (!world.land[Math.floor(hy + Math.sin(a / 24 * Math.PI * 2) * R * f) * W + Math.floor(hx + Math.cos(a / 24 * Math.PI * 2) * R * f)]) wet++; }
    assert.ok(wet / n > 0.9, `${name}: the harbour is ${Math.round((wet / n) * 100)}% water`);
    const cap = nations.capitals.find((c) => c.id === 'portfolio');
    assert.ok(Math.hypot(cap.x - hx, cap.y - hy) < R + 8, `${name}: Portfolio City is not on its harbour`);
  }
});

test('an ocean that runs across the map\'s edge is named in its middle, measured round the wrap', () => {
  const W = 1600, H = 800, N = W * H;
  // The middle round the wrap of water from x 1300 on across the edge to x 300 is at x 0 (or 1600).
  const px = [];
  for (let y = 100; y < 700; y += 10) for (let x = 0; x < W; x++) if (x >= 1300 || x < 300) px.push(y * W + x);
  const m = wrappedMiddle(px, W);
  assert.ok(m.wraps && Math.min(m.x, W - m.x) < 8 && Math.abs(m.y - 395) < 10, `the middle is at ${m.x.toFixed(1)},${m.y.toFixed(1)}`);
  // A world of one landmass in the middle: its ocean runs off both edges, and its name sits on the seam, whole.
  const land = new Uint8Array(N), owner = new Int16Array(N).fill(-1);
  for (let y = 120; y < 680; y++) for (let x = 420; x < 1180; x++) { land[y * W + x] = 1; owner[y * W + x] = x < 800 ? 0 : 1; }
  const projects = [{ id: 'a', name: 'Alpha', tier: 'flagship', rank: 1, names: { water: ['Epochs'] } }, { id: 'b', name: 'Beta', tier: 'flagship', rank: 2, names: { water: ['Annals'] } }];
  const labels = placeLabels({ owner, provinces: new Int16Array(N).fill(-1), projects, width: W, height: H, rng: makeRng('wrap'), extras: { land, lakes: new Uint8Array(N) } });
  const ocean = labels.find((l) => l.kind === 'ocean');
  assert.ok(ocean, 'the ocean has no name');
  assert.ok(Math.min(ocean.x, W - ocean.x) < 60 && Math.abs(ocean.y - 400) < 80, `the ocean is named at ${ocean.x},${ocean.y}, not in its middle round the wrap`);
  // No other name lies under it, across the seam either.
  for (const l of labels) if (l !== ocean) for (const a of labelRects(l)) for (const b of labelRects(ocean)) assert.ok(!rectsOverlapWrapped(a, b, W) && !rectsOverlapWrapped(b, a, W), `${l.text} lies under the ocean's name`);
});

test('the About island is larger, with bays, a town, a lighthouse cape, and a hill, a pond, or a crater lake', () => {
  for (const name of ['Le Guin', 'Bradbury', 'Zelazny', 'Clarke']) {
    const a = buildLand(name, projects).about;
    let n = 0;
    for (const v of a.mask) n += v;
    assert.ok(n > 150, `${name}: the About island is only ${n} pixels`);
    assert.ok(a.town && a.lighthouse, `${name}: no town or lighthouse`);
    assert.ok(a.peak || a.pond || a.crater, `${name}: no hill, pond, or crater lake`);
    // The dot is on dry land, in no hole.
    assert.ok(a.mask[Math.floor(a.y) * 1600 + Math.floor(a.x)], `${name}: the dot is in the water`);
  }
});

// The written worlds.
const dir = new URL('../../../projects/worlds/', import.meta.url);
const skip = !existsSync(new URL('index.json', dir)) && 'not generated yet';
const worlds = skip ? [] : JSON.parse(readFileSync(new URL('index.json', dir), 'utf8')).map((w) => ({ ...w, data: JSON.parse(readFileSync(new URL(`${w.slug}.json`, dir), 'utf8')), detail: JSON.parse(readFileSync(new URL(`detail/${w.slug}.json`, dir), 'utf8')) }));

test('across the twenty worlds, every new kind of border turns up, and most worlds have several', { skip }, () => {
  const count = (kind) => worlds.filter((w) => w.detail.shapes && w.detail.shapes.frontiers.some((f) => f.kind === kind)).length;
  const want = { ribbon: 4, corridor: 8, island: 12, lake: 12, town: 12, river: 8 };
  for (const [kind, n] of Object.entries(want)) assert.ok(count(kind) >= n, `${kind} borders in only ${count(kind)} worlds`);
  for (const w of worlds) assert.ok(new Set(w.detail.shapes.frontiers.map((f) => f.kind)).size >= 3, `${w.name}: only ${w.detail.shapes.frontiers.length} new borders`);
  // A corridor runs a long way, to the sea or to a great river.
  for (const w of worlds) for (const f of w.detail.shapes.frontiers.filter((q) => q.kind === 'corridor')) assert.ok(f.length >= 50 && (f.to === 'sea' || f.to === 'river'), `${w.name}: a corridor of ${f.length}`);
});

test('the exclave\'s own border is never the disputed one', { skip }, () => {
  for (const w of worlds) {
    const e = w.data.exclave;
    if (!e || !w.data.disputed) continue;
    for (const { pts } of pathLines(w.data.disputed)) for (const [x, y] of pts) assert.ok(Math.hypot(x - e.x, y - e.y) > 15, `${w.name}: the disputed stretch runs by the exclave`);
  }
});

test('volcanic island arcs, and islands with towns in the rivers and lakes', { skip }, () => {
  const arcs = worlds.filter((w) => w.detail.shapes.arcs.some((a) => a.islands >= 6 && a.cones >= 1));
  assert.ok(arcs.length >= 8, `island arcs in only ${arcs.length} worlds`);
  // Their cones are named with their heights, close to the arc.
  for (const w of arcs) for (const a of w.detail.shapes.arcs) assert.ok(w.detail.labels.some((l) => l.kind === 'peak' && l.volcano && Math.hypot(l.x - a.x, l.y - a.y) < 80), `${w.name}: an arc's volcano has no name`);
  const isles = (kind) => worlds.filter((w) => w.detail.shapes.townIslands.some((t) => t.kind === kind)).length;
  assert.ok(isles('river') >= 8, `river islands with towns in only ${isles('river')} worlds`);
  assert.ok(isles('lake') >= 6, `lake islands with towns in only ${isles('lake')} worlds`);
  // The island's town is named on the map, but where a great country's name lies over it (most are).
  const all = worlds.flatMap((w) => w.detail.shapes.townIslands.map((t) => ({ w, t })));
  const named = all.filter(({ w, t }) => [...w.data.labels, ...w.detail.labels].some((l) => l.text === t.town && l.dot && Math.hypot(l.dot[0] - t.x, l.dot[1] - t.y) < 4));
  assert.ok(named.length >= all.length * 0.5, `only ${named.length} of ${all.length} island towns are named`);
  assert.ok(named.filter(({ t }) => t.kind === 'lake').length >= 3 && named.filter(({ t }) => t.kind === 'river').length >= 8, 'too few island towns named of each kind');
});

test('atolls are rings large enough to read by zoom 4, on a pale reef', { skip }, () => {
  let n = 0;
  for (const w of worlds) {
    const atolls = w.detail.labels.filter((l) => l.kind === 'island' && / Atoll$/.test(l.text));
    if (!atolls.length) continue;
    n++;
    assert.ok(w.detail.islets && w.detail.islets.reef, `${w.name}: an atoll with no reef`);
    // The reef's rings: each some 9 units across or more.
    for (const { pts } of pathLines(w.detail.islets.reef)) {
      let x0 = Infinity, x1 = -Infinity;
      for (const [x] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
      assert.ok(x1 - x0 > 7, `${w.name}: a reef ${(x1 - x0).toFixed(1)} units across`);
    }
  }
  assert.ok(n >= 6, `atolls in only ${n} worlds`);
});

test('Braidable and the portfolio have their shapes and their own names, and every capital is its project and "City", in every world', { skip }, () => {
  const braidWords = THEMED_PLACES.braids.words;
  for (const w of worlds) {
    const s = w.detail.shapes;
    assert.ok(s.braid && s.folio, `${w.name}: a shape is missing`);
    const caps = [...w.data.labels, ...w.detail.labels].filter((l) => l.kind === 'capital').map((l) => l.text);
    // Every capital is its project's name and "City" (Chicago and New York apart), named on the map.
    const want = w.data.projects.map((p) => (p.id === 'chicago' ? 'Chicago' : p.id === 'nyc' ? 'New York' : `${projects.find((q) => q.id === p.id).name} City`));
    for (const c of want) assert.ok(caps.includes(c), `${w.name}: ${c} is not named; the capitals are ${caps.join(', ')}`);
    const b = w.data.projects.find((p) => p.id === 'braidable');
    assert.ok(pathLines(b.path, 2).length >= 3, `${w.name}: Braidable is not interlaced`);
  }
  // Their towns are named in their own words.
  const named = worlds.flatMap((w) => [...w.data.labels, ...w.detail.labels].map((l) => l.text));
  assert.ok(named.filter((t) => braidWords.some((r) => t.startsWith(r)) || t === 'Three Strands').length >= 40, 'few towns named for braids');
  assert.ok(named.filter((t) => THEMED_PLACES.folio.towns.includes(t)).length >= 30, 'few towns named for the parts of a book');
});

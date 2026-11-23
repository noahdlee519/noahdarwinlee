import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildLand, buildNations, buildLabels } from '../world.mjs';
import { labelsOverlap, labelRects, waterStructure, enclosure, SEA_ENCLOSURE, WATER_SPACING } from '../labels.mjs';

const projects = JSON.parse(readFileSync(new URL('../../../portfolio-map/projects.json', import.meta.url), 'utf8'));
const W = 1600;

// One world, built once, for every test in this file.
const world = buildLand('Le Guin', projects);
const nations = buildNations(world, projects);
const labels = buildLabels(world, nations, projects);

test('every country gets a label that shows by zoom 4', () => {
  for (const p of projects) {
    const l = labels.find((x) => x.kind === 'country' && x.id === p.id);
    assert.ok(l, `${p.name} has no label`);
    assert.ok(l.minZoom >= 1 && l.minZoom <= 4, `${p.name} minZoom ${l.minZoom}`);
  }
});

test('no two labels overlap', () => {
  // Every label is placed clear of every earlier one, so no zoom sees two overlap.
  // River labels follow a line and are checked by their own boxes.
  const flat = labels.filter((l) => l.kind !== 'river');
  for (let a = 0; a < flat.length; a++) {
    for (let b = a + 1; b < flat.length; b++) {
      assert.ok(!labelsOverlap(flat[a], flat[b]), `${flat[a].text} overlaps ${flat[b].text}`);
    }
  }
});

test('country labels sit inside their country', () => {
  projects.forEach((p, index) => {
    const l = labels.find((x) => x.kind === 'country' && x.id === p.id);
    for (const r of labelRects(l)) {
      const x = Math.floor(r.cx), y = Math.floor(r.cy);
      assert.equal(nations.owner[y * W + x], index, `${p.name}'s label centre is outside it`);
    }
  });
});
test('water is named after the countries it touches, and no name repeats', () => {
  const water = labels.filter((l) => ['ocean', 'sea', 'gulf', 'bay', 'strait', 'lake', 'river'].includes(l.kind));
  assert.ok(water.some((l) => l.kind === 'river'), 'no river is named');
  const texts = water.map((l) => l.text);
  assert.equal(new Set(texts).size, texts.length, `a name repeats: ${texts.join(', ')}`);
  const words = new Set();
  for (const p of projects) for (const k of ['water', 'river', 'lake']) for (const w of p.names[k]) words.add(w);
  const themed = water.filter((l) => l.theme);
  assert.ok(themed.length >= water.length * 0.7, 'most water should carry a project word');
  for (const l of themed) {
    assert.ok(words.has(l.word), `${l.text} uses a word no project has`);
    assert.ok(l.text.includes(l.word), `${l.text} does not contain ${l.word}`);
    assert.ok(projects.some((p) => p.id === l.theme), `${l.text} names an unknown project`);
  }
  for (const l of water.filter((x) => x.kind === 'river')) {
    assert.ok(/ River$|^River /.test(l.text), `${l.text} is not a river's name`);
    assert.ok(l.minZoom >= 2, `${l.text} shows before zoom 2`);
    assert.ok(Array.isArray(l.path) && l.path.length >= 2, `${l.text} has no line to follow`);
  }
  const forms = { lake: /^Lake /, ocean: / Ocean$/, sea: /^Sea of | Sea$/, gulf: /^Gulf of /, bay: / Bay$/, strait: / Strait$/ };
  for (const l of water) if (forms[l.kind]) assert.ok(forms[l.kind].test(l.text), `${l.kind} named ${l.text}`);
});

// Water named by its shape, as an atlas names it.
const structure = waterStructure(world.land, W, world.height);
const seaLabels = labels.filter((l) => ['ocean', 'sea', 'gulf', 'bay', 'strait'].includes(l.kind));
const pieceAt = (l) => {
  const c = structure.comp[Math.floor(l.y) * W + Math.floor(l.x)];
  return c >= 0 ? structure.pieces.find((p) => p.id === c) : null;
};

test('each ocean has exactly one name, and only a few oceans', () => {
  const oceans = structure.pieces.filter((p) => p.kind === 'ocean');
  assert.ok(oceans.length >= 1 && oceans.length <= 3, `${oceans.length} oceans`);
  for (const p of oceans) {
    const named = seaLabels.filter((l) => l.kind === 'ocean' && pieceAt(l) === p);
    assert.equal(named.length, 1, `the ocean round ${p.x},${p.y} has ${named.length} names`);
  }
  for (const l of seaLabels.filter((x) => x.kind === 'ocean')) assert.equal(pieceAt(l)?.kind, 'ocean', `${l.text} is not in an ocean's open water`);
});

test('no other water name sits in an ocean’s open water', () => {
  for (const l of seaLabels.filter((x) => x.kind !== 'ocean')) {
    const p = pieceAt(l);
    assert.ok(!p || p.kind === 'sea', `${l.text} sits in the open water of an ocean`);
  }
});

test('seas only where land closes round the water', () => {
  for (const l of seaLabels.filter((x) => x.kind === 'sea')) {
    const p = pieceAt(l);
    if (p) { assert.equal(p.kind, 'sea'); continue; }
    const d = structure.dist[Math.floor(l.y) * W + Math.floor(l.x)];
    const enc = enclosure(world.land, W, world.height, l.x, l.y, Math.min(4 * d + 60, 260));
    assert.ok(enc.share >= SEA_ENCLOSURE, `${l.text} is in water only ${enc.share.toFixed(2)} closed in`);
  }
});

test('water names show at their zooms, spaced apart, claiming water no other name claims', () => {
  const zoom = { ocean: [1, 1], sea: [2, 4], gulf: [2, 4], bay: [3, 4], strait: [3, 4] };
  for (const l of seaLabels) {
    assert.ok(l.minZoom >= zoom[l.kind][0] && l.minZoom <= zoom[l.kind][1], `${l.text} (${l.kind}) shows from zoom ${l.minZoom}`);
  }
  const gap = (a, b) => { let dx = Math.abs(a.x - b.x); dx = Math.min(dx, W - dx); return Math.hypot(dx, a.y - b.y); };
  for (let a = 0; a < seaLabels.length; a++) {
    for (let b = a + 1; b < seaLabels.length; b++) {
      const A = seaLabels[a], B = seaLabels[b];
      if (A.kind === B.kind) assert.ok(gap(A, B) >= WATER_SPACING[A.kind], `${A.text} and ${B.text} are ${gap(A, B).toFixed(0)} apart`);
      assert.ok(gap(A, B) >= (A.waterRadius || 0) + (B.waterRadius || 0), `${A.text} and ${B.text} claim the same water`);
    }
  }
});

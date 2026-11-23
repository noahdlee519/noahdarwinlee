import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildLand, buildNations, buildLabels } from '../world.mjs';
import { labelsOverlap, labelRects } from '../labels.mjs';

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

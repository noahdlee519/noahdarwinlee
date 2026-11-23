// The twenty written worlds, as the page reads them: no road over the water as drawn (but bridges and ferries),
// water named often and at every zoom, no names on the ice sheets, the renamed world, the New York and Illinois
// countries' real names, no "Saint" architects, and parks in the cities.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { WORLDS, slugOf } from '../world.mjs';
import { REAL_PLACES, ARCHITECTS } from '../cultures.mjs';
import { pathLines, drawnWater, Fill } from '../geom.mjs';
import { RIVER_BRIDGE } from '../dry.mjs';
import { WATER_KINDS } from '../labels.mjs';

const dir = new URL('../../../projects/worlds/', import.meta.url);
const written = existsSync(new URL('index.json', dir));
const skip = !written && 'not generated yet';
const read = (rel) => JSON.parse(readFileSync(new URL(rel, dir), 'utf8'));
const worlds = written ? read('index.json').map((w) => {
  const data = read(`${w.slug}.json`), detail = read(`detail/${w.slug}.json`), C = data.detail.chunks, chunks = [];
  for (let r = 0; r < C.rows; r++) for (let c = 0; c < C.cols; c++) chunks.push(read(`detail/${w.slug}/${c}-${r}.json`));
  return { ...w, data, detail, chunks };
}) : [];
const SALT = Object.keys(WATER_KINDS).filter((k) => k !== 'lake' && k !== 'river');

test('the world once called Dick is Zelazny, and nothing written is named dick', { skip }, () => {
  const index = read('index.json');
  assert.ok(index.some((w) => w.name === 'Zelazny' && w.slug === 'zelazny'));
  assert.ok(!index.some((w) => /dick/i.test(w.name + w.slug)), 'dick is still in the index');
  assert.ok(!existsSync(new URL('dick.json', dir)) && !existsSync(new URL('dick.png', dir)) && !existsSync(new URL('detail/dick.json', dir)) && !existsSync(new URL('tiles/dick', dir)), 'files named dick are left');
  // The page still opens old links to it.
  const app = readFileSync(new URL('../../../projects/app.js', import.meta.url), 'utf8');
  assert.match(app, /WORLD_ALIASES = \{ dick: "zelazny" \}/);
  // Its character is kept: polar ice at the top, joined by an isthmus, so five worlds still have polar ice.
  const z = WORLDS.find((w) => w.name === 'Zelazny');
  assert.equal(z.ice, 'n');
  assert.equal(WORLDS.filter((w) => w.ice).length, 5);
  assert.deepEqual(worlds.find((w) => w.slug === 'zelazny').data.polar, 'n');
});

test('no road or street lies over the water as drawn, but on its bridges', { skip }, () => {
  for (const w of worlds) {
    const water = drawnWater(w.data, w.detail, w.chunks);
    const bridges = w.detail.bridges ? [w.detail.bridges.major, w.detail.bridges.minor].filter(Boolean).flatMap((d) => pathLines(d)) : [];
    // Bridges, by a coarse grid of their points.
    const G = 2, onBridge = new Set();
    for (const { pts } of bridges) for (const [x, y] of pts) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) onBridge.add(`${Math.floor(x / G) + dx},${Math.floor(y / G) + dy}`);
    const lines = { ...w.detail.roads, street: w.chunks.map((c) => c.street || '').join(''), minor: w.chunks.map((c) => c.minor || '').join('') };
    for (const [cls, d] of Object.entries(lines)) {
      for (const { pts } of pathLines(d, 8)) {
        let river = 0;
        for (let k = 1; k < pts.length; k++) {
          const [x0, y0] = pts[k - 1], [x1, y1] = pts[k];
          const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.1));
          for (let j = 1; j <= n; j++) {
            const x = x0 + ((x1 - x0) * j) / n, y = y0 + ((y1 - y0) * j) / n;
            const bridged = onBridge.has(`${Math.floor(x / G)},${Math.floor(y / G)}`);
            if (water.water(x, y)) assert.ok(bridged, `${w.name}: a ${cls} road runs into the water at ${x.toFixed(1)},${y.toFixed(1)}`);
            if (cls !== 'street' && cls !== 'minor' && water.river(x, y)) { river += Math.hypot(x1 - x0, y1 - y0) / n; assert.ok(river <= RIVER_BRIDGE + 0.3, `${w.name}: a ${cls} road runs along a river at ${x.toFixed(1)},${y.toFixed(1)}`); } else river = 0;
          }
        }
      }
    }
    // A bridge is short: no longer than the longest a motorway may have, and a little either side.
    for (const { pts } of bridges) {
      let len = 0;
      for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      assert.ok(len <= 7, `${w.name}: a bridge ${len.toFixed(1)} long`);
    }
  }
});

test('water is named often, of many kinds, and more of it at each closer zoom', { skip }, () => {
  for (const w of worlds) {
    const all = [...w.data.labels, ...w.detail.labels];
    const salt = all.filter((l) => SALT.includes(l.kind));
    assert.ok(salt.length >= 40, `${w.name}: only ${salt.length} names for the sea's water`);
    assert.ok(new Set(salt.map((l) => l.kind)).size >= 7, `${w.name}: the sea's water is named in only ${new Set(salt.map((l) => l.kind)).size} kinds`);
    assert.ok(all.filter((l) => l.kind === 'lake').length >= 8, `${w.name}: few lakes named`);
    const upTo = (z) => salt.filter((l) => l.minZoom <= z).length;
    assert.ok(upTo(1) >= 1 && upTo(1) < upTo(2) && upTo(2) < upTo(3) && upTo(3) < upTo(4) && upTo(4) < upTo(5), `${w.name}: names by zoom ${[1, 2, 3, 4, 5].map(upTo)}`);
    for (const l of salt) assert.ok(l.minZoom >= WATER_KINDS[l.kind], `${w.name}: ${l.text} shows before its kind's zoom`);
    const texts = salt.map((l) => l.text);
    assert.equal(new Set(texts).size, texts.length, `${w.name}: a water name repeats`);
    const forms = { fjord: /fjord$|Fjord$|^Loch /, lagoon: / Lagoon$/, harbour: / Harbour$/, inlet: / Inlet$/, cove: / Cove$/, channel: / Channel$/, sound: / Sound$/, strait: / Strait$| Narrows$/ };
    for (const l of salt) if (forms[l.kind]) assert.match(l.text, forms[l.kind]);
  }
});

test('the ice sheets have no names', { skip }, () => {
  for (const w of worlds) for (const l of [...w.data.labels, ...w.detail.labels]) {
    assert.ok(!/^ice-/.test(l.id) && !/Ice Sheet$/.test(l.text), `${w.name}: ${l.text}`);
  }
});

test('the New York and Chicago countries\' places take New York State\'s and Illinois\'s names; no architect is a saint', { skip }, () => {
  const ny = new Set(['New York', ...REAL_PLACES['new-york'].towns]), il = new Set(['Chicago', ...REAL_PLACES.illinois.towns]);
  for (const w of worlds) {
    const nyc = w.data.projects.find((p) => p.id === 'nyc'), chi = w.data.projects.find((p) => p.id === 'chicago');
    const inside = (p) => { const f = new Fill(p.path); return (l) => l.dot && f.inside(l.dot[0], l.dot[1]); };
    const places = [...w.data.labels, ...w.detail.labels].filter((l) => ['capital', 'city', 'town', 'village'].includes(l.kind));
    const inNy = places.filter(inside(nyc)), inIl = places.filter(inside(chi));
    assert.ok(inNy.length >= 2 && inIl.length >= 2, `${w.name}: too few places to judge`);
    // (A village just over a border, by the drawn line, may be a neighbour's: one such is allowed.)
    assert.ok(inNy.filter((l) => !ny.has(l.text)).length <= 1, `${w.name}: ${inNy.filter((l) => !ny.has(l.text)).map((l) => l.text)} in the New York country`);
    assert.ok(inIl.filter((l) => !il.has(l.text)).length <= 1, `${w.name}: ${inIl.filter((l) => !il.has(l.text)).map((l) => l.text)} in the Chicago country`);
    assert.ok(inNy.some((l) => l.text === 'New York') && inIl.some((l) => l.text === 'Chicago'), `${w.name}: the capitals are not New York and Chicago`);
    for (const l of places) assert.ok(!/^Saint /.test(l.text) || !ARCHITECTS.includes(l.text.slice(6)), `${w.name}: ${l.text}`);
  }
});

test('cities have small parks, the larger ones named at the closest zoom', { skip }, () => {
  for (const w of worlds) {
    const parks = w.chunks.flatMap((c) => (c.parks ? pathLines(c.parks, 2) : []));
    assert.ok(parks.length >= 40, `${w.name}: only ${parks.length} city parks`);
    const names = w.detail.labels.filter((l) => l.kind === 'citypark');
    assert.ok(names.length >= 1, `${w.name}: no city park is named`);
    for (const l of names) assert.ok(l.minZoom >= 5, `${w.name}: ${l.text} shows from zoom ${l.minZoom}`);
  }
});

test('the coast has its small forms: fjords, cays, skerries, sandbars, and lagoons behind barrier islands', { skip }, () => {
  const has = (pred) => worlds.filter(pred).length;
  const isl = (w, k) => w.detail.islets && w.detail.islets[k] && w.detail.islets[k].length > 0;
  const named = (w, kind, re) => [...w.data.labels, ...w.detail.labels].some((l) => l.kind === kind && (!re || re.test(l.text)));
  assert.ok(has((w) => named(w, 'fjord')) >= 5, `only ${has((w) => named(w, 'fjord'))} worlds name a fjord`);
  assert.ok(has((w) => named(w, 'island', / (Cays|Keys)$/)) >= 8, 'few worlds have cays');
  assert.ok(has((w) => named(w, 'island', / (Skerries|Rocks)$/)) >= 6, 'few worlds have skerries');
  assert.ok(has((w) => named(w, 'lagoon')) >= 4, 'few worlds have lagoons');
  assert.ok(has((w) => isl(w, 'sand')) >= 12 && has((w) => isl(w, 'rock')) >= 8, 'few worlds have islets');
});

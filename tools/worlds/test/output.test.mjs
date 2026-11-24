import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

// The first load as a visitor downloads it: the JSON as the server sends it, compressed, and the picture.
const sent = (json, png) => gzipSync(json).length + png.length;
import { makeWorld, WORLDS, slugOf } from '../world.mjs';
import { buildWorldFiles } from '../output.mjs';

const projects = JSON.parse(readFileSync(new URL('../../../projects/projects.json', import.meta.url), 'utf8'));

test('Le Guin comes out byte for byte the same twice, inside the size budget', () => {
  const a = buildWorldFiles(makeWorld('Le Guin', projects));
  const b = buildWorldFiles(makeWorld('Le Guin', projects));
  assert.equal(a.json, b.json);
  assert.ok(a.png.equals(b.png));
  const total = sent(a.json, a.png);
  assert.ok(total <= 300 * 1024, `Le Guin is ${Math.round(total / 1024)} KB`);
});

const dir = new URL('../../../projects/worlds/', import.meta.url);
test('the written worlds: twenty in order, each inside the size budget', { skip: !existsSync(new URL('index.json', dir)) && 'not generated yet' }, () => {
  const index = JSON.parse(readFileSync(new URL('index.json', dir), 'utf8'));
  assert.equal(index.length, 20);
  assert.deepEqual(index.map((w) => w.name), WORLDS.map((w) => w.name));
  for (const w of index) {
    assert.equal(w.slug, slugOf(w.name));
    const json = readFileSync(new URL(`${w.slug}.json`, dir));
    const png = readFileSync(new URL(`${w.slug}.png`, dir));
    assert.ok(sent(json, png) <= 300 * 1024, `${w.name} is ${Math.round(sent(json, png) / 1024)} KB`);
  }
});

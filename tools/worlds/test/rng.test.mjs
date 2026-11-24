import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeRng, makeNoise, fbm } from '../rng.mjs';

const projects = JSON.parse(readFileSync(new URL('../../../projects/projects.json', import.meta.url), 'utf8'));

test('the project list has 18 projects, seven ranked flagships, and Dealdesk\'s four provinces', () => {
  assert.equal(projects.length, 18);
  const flagships = projects.filter((p) => p.tier === 'flagship');
  assert.deepEqual(flagships.map((p) => p.name), ['CHRONIA', 'LoreTour', 'UCHRONIA', 'Fuzhounese Dictionary', 'Leggio', 'GREATERCIRCLE', 'Dealdesk']);
  assert.deepEqual(flagships.map((p) => p.rank), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(projects.filter((p) => p.tier === 'small').length, 11);
  assert.equal(new Set(projects.map((p) => p.id)).size, 18);
  const dealdesk = projects.find((p) => p.id === 'dealdesk');
  assert.deepEqual(dealdesk.provinces.map((p) => p.name), ['Rollmap', 'Screener', 'Closebook', 'LBOmatic']);
});

test('the same seed gives the same first 1,000 values', () => {
  const a = makeRng('Le Guin'), b = makeRng('Le Guin');
  for (let i = 0; i < 1000; i++) assert.equal(a.next(), b.next());
});

test('different seeds differ', () => {
  const a = makeRng('Le Guin'), b = makeRng('Asimov');
  let same = 0;
  for (let i = 0; i < 1000; i++) if (a.next() === b.next()) same++;
  assert.ok(same < 5);
});

test('values are in [0, 1) and spread evenly', () => {
  const r = makeRng('spread');
  let sum = 0;
  for (let i = 0; i < 20000; i++) {
    const v = r.next();
    assert.ok(v >= 0 && v < 1);
    sum += v;
  }
  assert.ok(Math.abs(sum / 20000 - 0.5) < 0.01);
  for (let i = 0; i < 1000; i++) {
    const k = r.int(7);
    assert.ok(Number.isInteger(k) && k >= 0 && k < 7);
  }
  assert.ok(['a', 'b', 'c'].includes(r.pick(['a', 'b', 'c'])));
});

test('forked streams are repeatable and independent of the parent\'s position', () => {
  const a = makeRng('x'), b = makeRng('x');
  a.next(); a.next();
  assert.equal(a.fork('terrain').next(), b.fork('terrain').next());
  assert.notEqual(a.fork('terrain').next(), a.fork('climate').next());
});

test('noise is continuous and spans roughly [-1, 1]', () => {
  const noise = makeNoise(makeRng('noise'));
  let lo = 1, hi = -1;
  for (let i = 0; i < 40000; i++) {
    const x = (i % 200) * 0.173, y = Math.floor(i / 200) * 0.191;
    const n = noise(x, y);
    assert.ok(n >= -1 && n <= 1);
    assert.ok(Math.abs(n - noise(x + 1e-3, y)) < 0.01);
    assert.ok(Math.abs(n - noise(x, y + 1e-3)) < 0.01);
    lo = Math.min(lo, n); hi = Math.max(hi, n);
  }
  assert.ok(lo < -0.8 && hi > 0.8, `range ${lo}..${hi}`);
  // Zero at lattice points is a property of gradient noise; fBm stays in range too.
  const f = fbm(noise, 3.3, 7.7, 6);
  assert.ok(f >= -1 && f <= 1);
});

test('noise is the same for the same seed', () => {
  const a = makeNoise(makeRng('n')), b = makeNoise(makeRng('n'));
  for (let i = 0; i < 100; i++) assert.equal(a(i * 0.37, i * 0.11), b(i * 0.37, i * 0.11));
});

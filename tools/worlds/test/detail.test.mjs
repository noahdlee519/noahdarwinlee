import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeWorld } from '../world.mjs';
import { buildWorldFiles } from '../output.mjs';
import { labelRects, rectsOverlap } from '../labels.mjs';
import { RANK } from '../settlements.mjs';
import { ARCHITECTS, REAL_PLACES } from '../cultures.mjs';
import { landmasses } from '../terrain.mjs';

const projects = JSON.parse(readFileSync(new URL('../../../projects/projects.json', import.meta.url), 'utf8'));
const world = makeWorld('Le Guin', projects);
const { width: W, height: H, land, lakes, owner } = world;
const D = world.detail;
// On land, allowing for coordinates rounded to tenths.
const onLand = (x, y) => {
  for (const [dx, dy] of [[0, 0], [0.12, 0], [-0.12, 0], [0, 0.12], [0, -0.12], [0.12, 0.12], [-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12]]) {
    const qx = Math.floor(x + dx), qy = Math.floor(y + dy);
    if (qx >= 0 && qy >= 0 && qx < W && qy < H && ((land[qy * W + qx] && !lakes[qy * W + qx]) || (world.about && world.about.mask[qy * W + qx]))) return true;
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

test('roads and streets keep to the land; only ferries and bridges cross the sea', () => {
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
  // (Trunk roads join cities no motorway already joins; in Le Guin's islands there may be none.)
  for (const cls of ['motorway', 'secondary', 'local']) assert.ok(D.roads.roads.some((r) => r.cls === cls), `no ${cls} roads`);
  for (const r of D.roads.roads) if (!r.bridge) check(r.pts, `a ${r.cls} road`);
  for (const s of D.streets) check(s.pts, `a street (${s.cls})`);
  for (const [a, b] of D.roads.ferries) {
    assert.ok(onLand(a[0], a[1]) && onLand(b[0], b[1]), 'a ferry does not run between two places on land');
  }
});

test('each national park lies inside one country', () => {
  assert.ok(D.parks.parks.length >= 4, `only ${D.parks.parks.length} parks`);
  assert.ok(new Set(D.parks.parks.map((p) => p.kind)).size >= 3, 'the parks are all of one kind');
  D.parks.parks.forEach((p, id) => {
    let n = 0;
    for (let i = 0; i < W * H; i++) if (D.parks.mask[i] === id) { n++; assert.equal(owner[i], p.country, `${p.name} crosses into another country`); }
    assert.ok(n > 0, `${p.name} is empty`);
    assert.ok(/(Park|Reserve|Forest|Refuge|Preserve|Seashore|Monument|Wilderness|Wetlands|Sanctuary|Area)\b/.test(p.name), `${p.name} is not a park's name`);
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

test('the road network joins the places on each landmass', () => {
  // Union the places by the routes built between them.
  const S = world.settlements, idx = new Map(S.map((s, k) => [s, k])), uf = S.map((_, k) => k);
  const find = (k) => (uf[k] === k ? k : (uf[k] = find(uf[k])));
  for (const rt of D.roads.routes) uf[find(idx.get(rt.a))] = find(idx.get(rt.b));
  // On each landmass the cities are joined into one network (at most two pieces, where a range or a lake district
  // cuts a corner off).
  const masses = landmasses(land, W, H);
  const byMass = new Map();
  for (const s of S.filter((q) => q.rank <= 1)) { const m = masses.id[Math.floor(s.y) * W + Math.floor(s.x)]; if (!byMass.has(m)) byMass.set(m, new Set()); byMass.get(m).add(find(idx.get(s))); }
  for (const [m, groups] of byMass) assert.ok(groups.size <= 2, `the cities on landmass ${m} fall into ${groups.size} unconnected groups`);
  const joined = S.filter((s) => D.roads.routes.some((rt) => rt.a === s || rt.b === s)).length;
  assert.ok(joined / S.length > 0.95, `only ${joined} of ${S.length} places have a road`);
});

test('places are named in their country’s manner, with a few nods to the projects', () => {
  const capital = (id) => world.settlements.find((s) => s.rank === RANK.CAPITAL && projects[s.country].id === id);
  assert.equal(capital('chicago').name, 'Chicago');
  assert.equal(capital('nyc').name, 'New York');
  assert.equal(capital('fuzhounese').name, 'Fuzhounese Dictionary City');
  assert.equal(capital('chronia').name, 'CHRONIA City');
  assert.equal(capital('citylayoutguessr').name, 'citylayoutguessr City');
  const fz = projects.findIndex((p) => p.id === 'fuzhounese');
  for (const s of world.settlements.filter((q) => q.country === fz && q.rank > 0)) assert.match(s.name, /^\p{Lu}\p{Ll}*(-\p{Ll}+)*$/u, `${s.name} is not in Foochow Romanized form`);
  const ar = projects.findIndex((p) => p.id === 'architects');
  const archNames = world.settlements.filter((q) => q.country === ar && q.rank > 0).map((q) => q.name);
  const plain = archNames.filter((n) => ARCHITECTS.includes(n)).length;
  assert.ok(plain / archNames.length > 0.7, `the architects' towns are mostly plain surnames (${plain} of ${archNames.length})`);
  assert.ok(!archNames.some((n) => /^Saint /.test(n)), 'an architect made a saint');
  // The New York and Chicago countries: New York State's and Illinois's own towns.
  const real = (id, list) => world.settlements.filter((q) => projects[q.country].id === id && q.rank > 0).map((q) => q.name).filter((n) => !list.includes(n));
  assert.deepEqual(real('nyc', REAL_PLACES['new-york'].towns), [], 'invented names in the New York country');
  assert.deepEqual(real('chicago', REAL_PLACES.illinois.towns), [], 'invented names in the Chicago country');
  // Each country speaks one language: neighbours mostly differ.
  const ids = new Set(world.cultures.map((c) => c.phon.id));
  assert.ok(ids.size >= 8, `only ${ids.size} sound systems`);
});

test('the island called About lies in open water, in no country, with its dot', () => {
  const a = world.about;
  assert.ok(a, 'no About island');
  let n = 0;
  for (let i = 0; i < W * H; i++) if (a.mask[i]) { n++; assert.equal(owner[i], -1); assert.equal(land[i], 0); assert.equal(lakes[i], 0); }
  assert.ok(n > 1200, `the island is only ${n} pixels`);
  const files = buildWorldFiles(world).data;
  assert.deepEqual(files.here, [Math.round(a.x * 10) / 10, Math.round(a.y * 10) / 10]);
  assert.ok(world.labels.some((l) => l.id === 'about' && l.text === 'About'), 'the island has no name');
  assert.ok(!files.projects.some((p) => p.id === 'about'), 'About is not a project');
});

test('towns and cities are laid out in many ways, and only the largest have ring roads', () => {
  const S = world.settlements;
  const big = S.filter((s) => s.rank <= RANK.CITY), towns = S.filter((s) => s.rank === RANK.TOWN), villages = S.filter((s) => s.rank === RANK.VILLAGE);
  const rings = S.filter((s) => s.ringRoad);
  assert.ok(rings.length >= 1 && rings.length <= 3, `${rings.length} ring roads`);
  assert.ok(rings.every((s) => s.rank <= RANK.CITY), 'a ring road round a small place');
  assert.ok(new Set(big.map((s) => s.layout)).size >= 5, `the cities are of only ${new Set(big.map((s) => s.layout)).size} kinds`);
  assert.ok(new Set(towns.map((s) => s.layout)).size >= 3, 'the towns are all alike');
  assert.ok(villages.every((s) => s.layout === 'mainstreet' || s.layout === 'crossroads'), 'a village is a main street or a crossroads');
  // A ring road belongs to a metropolis, and is a line or two (open where the city meets the sea), not dashes.
  const ringRuns = D.streets.filter((st) => st.cls === 'ring');
  assert.ok(ringRuns.every((st) => S[st.of] && S[st.of].ringRoad), 'ring roads round places without one');
  for (const s of rings) assert.ok(ringRuns.filter((st) => S[st.of] === s).length <= 3, 'a ring road in pieces');
  // The built-up ground has an organic outline, not a disc: its reach varies round each city.
  const built = world.coverArgs.urban;
  let ragged = 0;
  for (const s of big) {
    const reach = [];
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      let t = 0;
      while (t < 30 && built(s.x + Math.cos(a) * t, s.y + Math.sin(a) * t)) t += 0.25;
      reach.push(t);
    }
    const m = reach.reduce((p, q) => p + q, 0) / reach.length, sd = Math.sqrt(reach.reduce((p, q) => p + (q - m) ** 2, 0) / reach.length);
    if (m > 0 && sd / m > 0.25) ragged++;
  }
  assert.ok(ragged / big.length > 0.7, `only ${ragged} of ${big.length} cities have a ragged outline`);
});

test('places come in a hierarchy of sizes, in several shapes, with dense cores and parks', () => {
  const S = world.settlements;
  const med = (list) => { const v = list.map((s) => s.reach).sort((a, b) => a - b); return v[v.length >> 1]; };
  const metro = S.filter((s) => s.metro), city = S.filter((s) => s.rank === RANK.CITY && !s.metro), town = S.filter((s) => s.rank === RANK.TOWN), village = S.filter((s) => s.rank === RANK.VILLAGE);
  assert.ok(metro.length >= 2 && metro.length <= 3, `${metro.length} metropolises`);
  assert.ok(med(metro) > 1.8 * med(city) && med(city) > 1.8 * med(town) && med(town) > 1.8 * med(village), `reaches ${[metro, city, town, village].map(med)}`);
  const shapes = new Set(S.filter((s) => s.rank <= RANK.TOWN).map((s) => s.shape));
  for (const sh of ['compact', 'linear', 'star', 'bay']) assert.ok(shapes.has(sh), `no ${sh} places (${[...shapes]})`);
  // The cores: darker ground in the middle of the cities.
  const kind = world.coverArgs.urban;
  for (const s of metro) assert.equal(kind(s.x, s.y), 2, 'a metropolis without a dense core');
  // Parks: in the built-up ground, a few in each city, the most in the metropolises.
  const P = D.cityParks;
  for (const s of metro) assert.ok(P.filter((p) => world.settlements[p.settlement] === s).length >= 4, 'a metropolis with few parks');
  for (const p of P) assert.ok(kind(p.x, p.y) > 0, 'a park outside the town');
});

test('small lakes are vectors in natural shapes, and the land cover makes no water flecks of its own', () => {
  const L = world.smallLakes.lakes;
  assert.ok(L.length > 15 && L.length < 200, `${L.length} small lakes`);
  for (const l of L) {
    assert.ok(l.ring.length >= 10, `a ${l.kind} lake has only ${l.ring.length} points`);
    assert.ok(onLand(l.x, l.y) || land[Math.floor(l.y) * W + Math.floor(l.x)] === 1, `a ${l.kind} lake is not on land`);
  }
  let ponds = 0;
  for (const p of world.picture.ponds) ponds += p;
  assert.equal(ponds, 0, 'the picture has pond flecks');
});

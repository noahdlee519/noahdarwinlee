// The map's finer detail: national parks, the subdivisions of the larger
// countries, small streams, and the names of small features (settlements,
// peaks, capes, islands and island groups, forests, deserts, plateaus,
// deltas, parks, and route shields), placed clear of every other name.

import { clamp, smoothstep, makeNoise, fbm } from './rng.mjs';
import { COVER } from './climate.mjs';
import { RANK } from './settlements.mjs';
import { landmasses } from './terrain.mjs';
import { labelRects, rectsOverlap, lineWidth, lineBreaks, samples, insideDistance, makeNamer, zoomFor } from './labels.mjs';

// ------------------------------------------------------------------ parks --

// buildParks({ land, owner, cover, elev, temp, moist, settlements, projects, areas, width, height, rng, dist, smallLakes })
//   => { mask: Int16Array (park index per pixel, -1 none), parks: [{ country, area, kind }] }
// Protected land where real protected land lies: whole ranges of ice and rock
// (a park and preserve), great forests, wetlands and lake districts (refuges),
// wild coasts (marine parks and seashores), deserts, and mixed wild country;
// each inside one country, away from the towns. The page draws only their
// names, and at the closest zooms a faint edge.
const PARK_KINDS = ['preserve', 'forest', 'refuge', 'marine', 'desert', 'park', 'park', 'small'];
export function buildParks({ land, owner, cover, elev, temp, moist, settlements, projects, areas, width, height, rng, dist, smallLakes }) {
  const W = width, H = height, N = W * H, S = W / 1600;
  const r = rng.fork('parks');
  const n = makeNoise(r);
  const wet = new Float32Array(N);
  if (smallLakes) for (const l of smallLakes.lakes) { const i = Math.floor(l.y) * W + Math.floor(l.x); if (i >= 0 && i < N) wet[i] += l.area; }
  const fit = {
    preserve: (i) => (cover[i] === COVER.SNOW || cover[i] === COVER.ROCK ? 1 : 0) + smoothstep(0.32, 0.5, elev[i]),
    forest: (i) => (cover[i] === COVER.FOREST ? 1 : cover[i] === COVER.WOODLAND ? 0.5 : 0),
    refuge: (i) => smoothstep(0.12, 0.03, elev[i]) * smoothstep(0.3, 0.6, moist[i]) + Math.min(1, wet[i] * 2),
    marine: (i) => (dist[i] <= 3 * S ? 1 : 0) * smoothstep(0.08, 0.01, elev[i]),
    desert: (i) => (cover[i] === COVER.DESERT || cover[i] === COVER.SAND || cover[i] === COVER.DUNE || cover[i] === COVER.SALT || cover[i] === COVER.DRYROCK ? 1 : cover[i] === COVER.STEPPE ? 0.3 : 0),
    park: (i) => (cover[i] === COVER.FOREST || cover[i] === COVER.ROCK ? 0.8 : cover[i] === COVER.WOODLAND ? 0.6 : 0.3) + 0.3 * smoothstep(0.2, 0.4, elev[i]),
    small: (i) => (cover[i] === COVER.FOREST || cover[i] === COVER.WOODLAND ? 0.7 : 0.4),
  };
  const remote = new Float32Array(N).fill(1);
  for (const s of settlements) {
    const R = (s.rank === 0 ? 20 : s.rank === 1 ? 13 : s.rank === 2 ? 6 : 2.5) * S;
    const x0 = Math.max(0, Math.floor(s.x - R)), x1 = Math.min(W - 1, Math.ceil(s.x + R));
    const y0 = Math.max(0, Math.floor(s.y - R)), y1 = Math.min(H - 1, Math.ceil(s.y + R));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (Math.hypot(x - s.x, y - s.y) < R) remote[y * W + x] = 0;
  }
  const ok = (i) => land[i] && owner[i] >= 0 && remote[i] > 0 && cover[i] !== COVER.URBAN;
  const mask = new Int16Array(N).fill(-1);
  const parks = [];
  const perCountry = new Int32Array(projects.length);
  const centres = [];
  const kinds = r.shuffle(PARK_KINDS.slice());
  kinds.unshift(kinds.splice(kinds.indexOf('preserve'), 1)[0]);
  const want = 6 + r.int(4);
  const step = Math.max(2, Math.round(3 * S));
  for (let round = 0; round < 2 && parks.length < want; round++) for (const kind of kinds) {
    if (parks.length >= want) break;
    const f = fit[kind];
    let best = -1, bv = 0;
    const win = kind === 'small' || kind === 'marine' ? 4 : 9;
    for (let y = 14; y < H - 14; y += step) for (let x = 14; x < W - 14; x += step) {
      const i = y * W + x;
      if (!ok(i) || perCountry[owner[i]] >= 2 || areas[owner[i]] < 1200 * S * S) continue;
      if (centres.some((c) => Math.hypot(c[0] - x, c[1] - y) < 70 * S)) continue;
      const k = owner[i];
      let sum = 0;
      for (let dy = -win; dy <= win; dy += 3) for (let dx = -win; dx <= win; dx += 3) { const j = (y + dy) * W + x + dx; if (owner[j] === k && ok(j)) sum += f(j); }
      sum *= 0.85 + 0.3 * r.next();
      if (sum > bv) { bv = sum; best = i; }
    }
    const cells = ((2 * win) / 3 + 1) ** 2;
    if (best < 0 || bv < cells * 0.45) continue;
    const k = owner[best];
    const AREA = { preserve: [2600, 5200], forest: [1200, 2600], refuge: [450, 1100], marine: [260, 650], desert: [1000, 2200], park: [900, 2200], small: [120, 320] }[kind];
    const target = Math.min(r.range(AREA[0], AREA[1]) * S * S, areas[k] * (kind === 'preserve' ? 0.14 : 0.08));
    const id = parks.length;
    const pri = (i) => f(i) + 0.35 * fbm(n, (i % W) / (14 * S), Math.floor(i / W) / (14 * S), 3);
    const heap = [[pri(best), best]];
    const seen = new Uint8Array(N);
    seen[best] = 1;
    let area = 0;
    while (heap.length && area < target) {
      heap.sort((a, b) => a[0] - b[0]);
      const [, i] = heap.pop();
      mask[i] = id; area++;
      const x = i % W;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
        if (j < 0 || j >= N || seen[j] || owner[j] !== k || !ok(j) || mask[j] >= 0 || f(j) < 0.2) continue;
        seen[j] = 1;
        heap.push([pri(j), j]);
      }
      if (heap.length > 4000) heap.splice(0, heap.length - 3000);
    }
    if (area < 100 * S * S) { for (let i = 0; i < N; i++) if (mask[i] === id) mask[i] = -1; continue; }
    for (let pass = 0; pass < 2; pass++) {
      const next = mask.slice();
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (owner[i] !== k) continue;
        let c = 0;
        for (const j of [i - 1, i + 1, i - W, i + W, i - W - 1, i - W + 1, i + W - 1, i + W + 1]) if (mask[j] === id) c++;
        if (mask[i] === id && c <= 2) next[i] = -1;
        else if (mask[i] !== id && mask[i] < 0 && c >= 6 && land[i]) next[i] = id;
      }
      mask.set(next);
    }
    keepLargest(mask, id, W, H);
    let a2 = 0;
    for (let i = 0; i < N; i++) if (mask[i] === id) a2++;
    parks.push({ country: k, area: a2, kind });
    perCountry[k]++;
    centres.push([best % W, Math.floor(best / W)]);
  }
  return { mask, parks };
}

function keepLargest(mask, id, W, H) {
  const N = W * H, comp = new Int32Array(N).fill(-1), stack = new Int32Array(N);
  let bestC = -1, bestA = 0, c = 0;
  for (let s = 0; s < N; s++) {
    if (mask[s] !== id || comp[s] >= 0) continue;
    let top = 0, a = 0;
    stack[top++] = s; comp[s] = c;
    while (top) {
      const i = stack[--top]; a++;
      const x = i % W;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < N && mask[j] === id && comp[j] < 0) { comp[j] = c; stack[top++] = j; }
    }
    if (a > bestA) { bestA = a; bestC = c; }
    c++;
  }
  for (let i = 0; i < N; i++) if (mask[i] === id && comp[i] !== bestC) mask[i] = -1;
}

// ---------------------------------------------------------- subdivisions --

// buildAdmin({ owner, provinces, projects, settlements, areas, width, height, rng })
//   => Int8Array: a region per pixel inside the larger flagships (-1 elsewhere),
// each round one of its main places, with wavy edges.
export function buildAdmin({ owner, projects, settlements, areas, width, height, rng }) {
  const W = width, H = height, N = W * H, S = W / 1600;
  const n = makeNoise(rng.fork('admin'));
  const region = new Int8Array(N).fill(-1);
  const seedsOf = projects.map((p, k) => {
    if (p.tier !== 'flagship' || p.provinces) return [];
    const want = clamp(Math.round(areas[k] / (6500 * S * S)), 0, 7);
    if (want < 2) return [];
    const own = settlements.filter((s) => s.country === k && s.rank <= RANK.TOWN).sort((a, b) => a.rank - b.rank || b.size - a.size);
    const seeds = [];
    for (const s of own) {
      if (seeds.length >= want) break;
      if (seeds.every((o) => Math.hypot(o.x - s.x, o.y - s.y) > 30 * S)) seeds.push(s);
    }
    return seeds.length >= 2 ? seeds : [];
  });
  // Some countries' subdivisions were surveyed, with straight lines between them; the rest wander, as old ones do.
  const ra = rng.fork('admin-kind');
  const surveyed = projects.map(() => ra.chance(0.45));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, k = owner[i];
    if (k < 0 || !seedsOf[k].length) continue;
    const amp = surveyed[k] ? 0 : 9 * S;
    const wx = x + amp * fbm(n, x / (40 * S), y / (40 * S), 3), wy = y + amp * fbm(n, x / (40 * S) + 7.1, y / (40 * S) - 3.3, 3);
    let best = 0, bd = Infinity;
    seedsOf[k].forEach((s, j) => { const d = (s.x - wx) ** 2 + (s.y - wy) ** 2; if (d < bd) { bd = d; best = j; } });
    region[i] = best;
  }
  return region;
}

// --------------------------------------------------------------- streams --

// buildStreams({ land, hydro, width, height, style }) => [[[x, y], ...]]
// The small streams the main rivers gather, for the closer zooms: every run
// of gathered water too small to be a river, from its head down to the river,
// lake, or sea it joins.
export function buildStreams({ land, hydro, width, height, style = {} }) {
  const W = width, H = height, N = W * H, S = W / 1600;
  const { acc, down, riverClass, lakes } = hydro;
  const tMain = (style.riverFlow ?? 430) * S * S;
  const t = tMain * 0.07;
  const isStream = (i) => land[i] && !lakes[i] && !riverClass[i] && acc[i] >= t;
  const hasIn = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (isStream(i) && down[i] >= 0) hasIn[down[i]] = 1;
  const visited = new Uint8Array(N);
  const centre = (i) => [(i % W) + 0.5, Math.floor(i / W) + 0.5];
  const out = [];
  for (let i = 0; i < N; i++) {
    if (!isStream(i) || hasIn[i]) continue;
    const pts = [centre(i)];
    let c = i, n = 0;
    visited[c] = 1;
    for (;;) {
      const d = down[c];
      if (d < 0) break;
      pts.push(centre(d));
      if (!isStream(d) || visited[d]) break;
      visited[d] = 1; c = d;
      if (++n > 4000) break;
    }
    if (pts.length >= 5) out.push(pts);
  }
  return out;
}

// --------------------------------------------------------------- names --

// placeDetailLabels({ labels, world, nations, settlements, roads, parks, projects, rng })
//   => new labels (each with detail: true), clear of every label given and of each other.
// Real parks for the New York and Chicago countries' towns, the largest first.
// The quarters of the New York and Chicago countries' capitals.
const REAL_DISTRICTS = {
  nyc: ['Manhattan', 'Brooklyn', 'Queens', 'The Bronx', 'Staten Island', 'Harlem', 'Astoria', 'Flushing'],
  chicago: ['The Loop', 'Hyde Park', 'Lincoln Park', 'Wicker Park', 'Pilsen', 'Bronzeville', 'Uptown', 'Logan Square'],
};
const REAL_PARKS = {
  nyc: ['Central Park', 'Prospect Park', 'Riverside Park', 'Bryant Park', 'Washington Square Park', 'Battery Park', 'Van Cortlandt Park', 'Pelham Bay Park', 'Fort Tryon Park', 'Flushing Meadows', 'Morningside Park', 'Tompkins Square Park', 'Inwood Hill Park', 'Carl Schurz Park', 'Marcus Garvey Park'],
  chicago: ['Grant Park', 'Lincoln Park', 'Jackson Park', 'Millennium Park', 'Washington Park', 'Humboldt Park', 'Garfield Park', 'Douglass Park', 'Burnham Park', 'Columbus Park', 'Marquette Park', 'McKinley Park', 'Sherman Park', 'Gage Park', 'Calumet Park'],
};

export function placeDetailLabels({ labels, land, elev, cover, hydro, temp, owner, settlements, roads, parks, projects, width, height, rng, cultures, smallLakes, volcanoes = [], drawnRivers, islets = null, cityParks = [], urban = null }) {
  const W = width, H = height, N = W * H, S = W / 1600;
  const r = rng.fork('detail-names');
  const namer = makeNamer(r);
  // Names in the language of the country a place lies in (or the nearest invented one at sea).
  const px0 = (x, y) => clamp(Math.floor(y), 0, H - 1) * W + clamp(Math.floor(x), 0, W - 1);
  const namerAt = (x, y) => { const k = owner[px0(x, y)]; return k >= 0 && cultures ? cultures[k].namer : namer; };
  const wordAt = (x, y) => namerAt(x, y).word();
  const placed = labels.map((l) => labelRects(l, 0.5 * S));
  const out = [];
  const clearOf = (rects) => {
    for (const p of placed) for (const a of rects) for (const b of p) if (rectsOverlap(a, b)) return false;
    return true;
  };
  const inMap = (rects) => rects.every((rc) => rc.cx - rc.hw > 1 && rc.cx + rc.hw < W - 1 && rc.cy - rc.hh > 1 && rc.cy + rc.hh < H - 1);
  const round = (l) => {
    l.x = Math.round(l.x * 10) / 10; l.y = Math.round(l.y * 10) / 10; l.size = Math.round(l.size * 100) / 100;
    if (l.dot) l.dot = l.dot.map((v) => Math.round(v * 10) / 10);
    return l;
  };
  const tryPut = (label, pad = 0.6 * S) => {
    const rects = labelRects(label, pad);
    if (!inMap(rects) || !clearOf(rects)) return false;
    round(label);
    placed.push(labelRects(label, 0.5 * S));
    label.detail = true;
    out.push(label);
    return true;
  };
  // A name beside a point symbol: right, left, above, below.
  const beside = (base, x, y, size, gapK = 0.75) => {
    const w = Math.max(...base.lines.map((ln) => lineWidth(ln, base.spacing || 0))) * size, gap = size * gapK;
    const hh = ((base.lines.length - 1) * 1.12 + 1) * size / 2;
    for (const [dx, dy] of [[w / 2 + gap, 0], [-w / 2 - gap, 0], [0, -hh - size * 0.5], [0, hh + size * 0.5], [w / 2 + gap * 0.8, -hh * 0.9], [w / 2 + gap * 0.8, hh * 0.9]]) {
      if (tryPut({ ...base, x: x + dx, y: y + dy, size, dot: [x, y] })) return true;
    }
    return false;
  };
  const px = (x, y) => clamp(Math.floor(y), 0, H - 1) * W + clamp(Math.floor(x), 0, W - 1);

  // Words of the projects' own not yet used on this map, for the parks.
  const usedWords = new Set(labels.filter((l) => l.word).map((l) => l.word));
  const themed = (k) => {
    if (k < 0) return null;
    const p = projects[k];
    for (const kind of ['lake', 'river', 'water']) for (const w of (p.names && p.names[kind]) || []) if (!usedWords.has(w)) { usedWords.add(w); return { word: w, theme: p.id }; }
    return null;
  };

  // ---- Settlements: cities, then towns, then villages. ----
  const SIZE = [4.9, 4.3, 3.4, 2.75];
  const KIND = ['capital', 'city', 'town', 'village'];
  const ZOOM = [1, 2, 3, 4];
  const placeRank = (rank) => {
    for (const s of settlements) {
      if (s.rank !== rank) continue;
      const text = s.name || namerAt(s.x, s.y).town();
      const size = SIZE[rank] * S;
      // The smallest villages wait for the closest zoom.
      const minZoom = rank === RANK.VILLAGE && s.size < 0.55 ? 5 : ZOOM[rank];
      if (!beside({ id: `${KIND[rank]}-${out.length}`, kind: KIND[rank], text, lines: [text], size, angle: 0, spacing: 0, minZoom }, s.x, s.y, size)) missed.push(s);
    }
  };
  // Places whose names found no room at their own zoom are named closer in, smaller on the map (the page sets
  // every name at a readable size), so no built-up patch is left without its dot and name at the closest zooms.
  const missed = [];
  const placeMissed = () => {
    for (const s of missed.slice().sort((a, b) => a.rank - b.rank)) {
      const text = s.name || namerAt(s.x, s.y).town();
      for (const [k, z] of [[0.55, 7], [0.36, 10]]) {
        const size = SIZE[s.rank] * S * k;
        if (beside({ id: `${KIND[s.rank]}-${out.length}`, kind: KIND[s.rank], text, lines: [text], size, angle: 0, spacing: 0, minZoom: z }, s.x, s.y, size)) break;
      }
    }
  };

  const placePeaks = () => {
  // ---- Peaks: the highest summits, a triangle and a height. ----
  {
    const cands = [];
    const st = Math.max(1, Math.round(2 * S));
    for (let y = 10; y < H - 10; y += st) for (let x = 10; x < W - 10; x += st) {
      const i = y * W + x;
      if (!land[i] || elev[i] < 0.42) continue;
      let top = true;
      for (let dy = -8; dy <= 8 && top; dy += 2) for (let dx = -8; dx <= 8; dx += 2) if (elev[i + dy * W + dx] > elev[i]) { top = false; break; }
      if (top) cands.push({ x: x + 0.5, y: y + 0.5, e: elev[i] });
    }
    cands.sort((a, b) => b.e - a.e || a.y - b.y || a.x - b.x);
    const taken = [];
    for (const c of cands) {
      if (taken.length >= 14) break;
      if (taken.some((t) => Math.hypot(t.x - c.x, t.y - c.y) < 70 * S)) continue;
      if (volcanoes.some((v) => Math.hypot(v.x - c.x, v.y - c.y) < 12 * S)) continue;
      const name = r.pick([(w) => `Mount ${w}`, (w) => `${w} Peak`, (w) => `Mount ${w}`, (w) => `${w}horn`])(wordAt(c.x, c.y));
      const metres = Math.round(380 + c.e * 5600 + r.next() * 120);
      const height = metres.toLocaleString('en-US') + ' m';
      const size = 3.1 * S;
      if (beside({ id: `peak-${out.length}`, kind: 'peak', text: name, lines: [name, height], size, angle: 0, spacing: 0, minZoom: taken.length < 3 ? 2 : 3 }, c.x, c.y, size, 0.9)) taken.push(c);
    }
  }

  };
  const placeParks = () => {
  // ---- National parks: the name inside the park. ----
  {
    const { mask, parks: list } = parks;
    list.forEach((p, id) => {
      const region = new Int32Array(N);
      let any = -1;
      for (let i = 0; i < N; i++) { region[i] = mask[i] === id ? 1 : 0; if (region[i]) any = i; }
      if (any < 0) return;
      const d = insideDistance(region, W, H);
      let best = any;
      for (let i = 0; i < N; i++) if (region[i] && d[i] > d[best]) best = i;
      const t = r.chance(0.55) ? themed(p.country) : null;
      const word = t ? t.word : cultures ? cultures[p.country].namer.word() : namer.word();
      const custom = cultures ? cultures[p.country].parks : null;
      p.name = custom ? custom[p.kind](word) : `${word} National Park`;
      const size = clamp(Math.sqrt(p.area) * 0.075, 3.1, 4.4) * S;
      const label = { id: `park-${id}`, kind: 'park', text: p.name, lines: lineBreaks(p.name)[Math.min(1, lineBreaks(p.name).length - 1)], x: (best % W) + 0.5, y: Math.floor(best / W) + 0.5, size, angle: 0, spacing: 0, minZoom: p.area > 1400 * S * S ? 2 : 3, park: id };
      if (t) { label.theme = t.theme; label.word = t.word; }
      if (!tryPut(label)) if (!tryPut({ ...label, lines: lineBreaks(p.name).slice(-1)[0], size: size * 0.85 })) tryPut({ ...label, lines: [p.name], size: size * 0.8 });
    });
  }

  };
  const placeRegions = () => {
  // ---- Regions: great forests, deserts, and plateaus. ----
  {
    const regionNames = [];
    const comps = (test, minArea) => {
      const seen = new Uint8Array(N), stack = new Int32Array(N), found = [];
      for (let s = 0; s < N; s += 1) {
        if (seen[s] || !test(s)) continue;
        const px0 = [];
        let top = 0;
        stack[top++] = s; seen[s] = 1;
        while (top) {
          const i = stack[--top]; px0.push(i);
          const x = i % W;
          for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < N && !seen[j] && test(j)) { seen[j] = 1; stack[top++] = j; }
        }
        if (px0.length >= minArea) found.push(px0);
      }
      return found.sort((a, b) => b.length - a.length || a[0] - b[0]);
    };
    // Blur the classes a little so a forest is one forest despite its clearings.
    const share = (cls) => {
      const f = new Float32Array(N);
      for (let i = 0; i < N; i++) f[i] = land[i] && cover[i] === cls ? 1 : 0;
      const g = new Float32Array(N), R = Math.round(4 * S);
      for (let y = R; y < H - R; y += 1) for (let x = R; x < W - R; x += 1) {
        let s = 0;
        for (let k = -R; k <= R; k += 2) s += f[y * W + x + k] + f[(y + k) * W + x];
        g[y * W + x] = s / (2 * (Math.floor(R) + 1));
      }
      return g;
    };
    const forest = share(COVER.FOREST), desert = share(COVER.DESERT);
    for (const extra of [COVER.SAND, COVER.DUNE, COVER.SALT, COVER.DRYROCK]) { const g = share(extra); for (let i = 0; i < N; i++) desert[i] += g[i]; }
    const plateau = (i) => land[i] && elev[i] > 0.27 && elev[i] < 0.5 && Math.abs(elev[Math.min(N - 1, i + 3)] - elev[Math.max(0, i - 3)]) + Math.abs(elev[Math.min(N - 1, i + 3 * W)] - elev[Math.max(0, i - 3 * W)]) < 0.025;
    const kinds = [
      { test: (i) => land[i] && forest[i] > 0.55, min: 2600 * S * S, forms: [(w) => `${w} Forest`, (w) => `${w} Woods`], max: 3 },
      { test: (i) => land[i] && desert[i] > 0.5, min: 900 * S * S, forms: [(w) => `${w} Desert`, (w) => `${w} Desert`, (w) => `${w} Sands`, (w) => `Erg ${w}`], max: 3 },
      { test: plateau, min: 900 * S * S, forms: [(w) => `${w} Plateau`], max: 2 },
    ];
    for (const k of kinds) {
      let n = 0;
      for (const pixels of comps(k.test, k.min)) {
        if (n >= k.max) break;
        const region = new Int32Array(N);
        for (const i of pixels) region[i] = 1;
        const d = insideDistance(region, W, H);
        let best = pixels[0];
        for (const i of pixels) if (d[i] > d[best]) best = i;
        const bx = (best % W) + 0.5, by = Math.floor(best / W) + 0.5;
        const text = r.pick(k.forms)(wordAt(bx, by));
        const size = clamp(Math.sqrt(pixels.length) * 0.05, 3.4 * S, 5.2 * S);
        if (tryPut({ id: `region-${out.length}`, kind: 'region', text, lines: [text], x: bx, y: by, size, angle: 0, spacing: 0.1, minZoom: 2 })) { n++; regionNames.push(text); }
      }
    }
  }

  };
  const placeDeltas = () => {
  // ---- Deltas: where a big river fans out in warm country. ----
  let deltas = 0;
  hydro.rivers.forEach((pts, k) => {
    const m = hydro.riverMeta[k];
    if (deltas >= 3 || m.ends !== 'sea' || m.width < 3 || pts.length < 40) return;
    deltas++;
    const [x, y] = pts[pts.length - 1];
    if (temp[px(x, y)] < 6) return;
    const back = pts[Math.max(0, pts.length - 10)];
    const text = `${wordAt(back[0], back[1])} Delta`;
    const size = 3.1 * S;
    tryPut({ id: `delta-${out.length}`, kind: 'region', text, lines: [text], x: back[0], y: back[1] - size * 1.4, size, angle: 0, spacing: 0.08, minZoom: 3 });
  });

  };
  const placeIslands = () => {
  // ---- Islands, and groups of small ones. ----
  {
    const masses = landmasses(land, W, H);
    const info = masses.areas.map(() => ({ sx: 0, sy: 0, n: 0, x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity }));
    for (let i = 0; i < N; i++) {
      const m = masses.id[i];
      if (m < 0) continue;
      const x = i % W, y = Math.floor(i / W), f = info[m];
      f.sx += x; f.sy += y; f.n++;
      if (x < f.x0) f.x0 = x; if (x > f.x1) f.x1 = x; if (y < f.y0) f.y0 = y; if (y > f.y1) f.y1 = y;
    }
    const small = [];
    info.forEach((f, m) => { if (f.n >= 9 * S * S && f.n <= 2600 * S * S) small.push({ m, x: f.sx / f.n + 0.5, y: f.sy / f.n + 0.5, n: f.n, f }); });
    // Groups: tiny islands within reach of one another.
    const tiny = small.filter((s) => s.n < 220 * S * S);
    const group = tiny.map((_, k) => k);
    const find = (k) => (group[k] === k ? k : (group[k] = find(group[k])));
    for (let a = 0; a < tiny.length; a++) for (let b = a + 1; b < tiny.length; b++) {
      if (Math.hypot(tiny[a].x - tiny[b].x, tiny[a].y - tiny[b].y) < 26 * S) group[find(a)] = find(b);
    }
    const groups = new Map();
    tiny.forEach((s, k) => { const g = find(k); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(s); });
    const grouped = new Set();
    const glist = [...groups.values()].filter((g) => g.length >= 3).sort((a, b) => b.length - a.length);
    for (const g of glist.slice(0, 4)) {
      const x = g.reduce((a, s) => a + s.x, 0) / g.length, y = g.reduce((a, s) => a + s.y, 0) / g.length;
      const text = `${wordAt(g[0].x, g[0].y)} Islands`;
      const size = 3.6 * S;
      if (tryPut({ id: `islands-${out.length}`, kind: 'island', text, lines: [text], x, y, size, angle: 0, spacing: 0.12, minZoom: 2 })) for (const s of g) grouped.add(s.m);
    }
    // Single islands of some size: the name just below the island.
    let n = 0;
    for (const s of small.filter((s) => !grouped.has(s.m) && s.n >= 40 * S * S).sort((a, b) => b.n - a.n || a.m - b.m)) {
      if (n >= 10) break;
      const w0 = wordAt(s.x, s.y);
      const text = r.chance(0.3) ? `Isle of ${w0}` : `${w0} Island`;
      const size = 3 * S;
      const label = { id: `island-${out.length}`, kind: 'island', text, lines: [text], x: s.x, y: s.f.y1 + 1 + size * 0.8, size, angle: 0, spacing: 0.06, minZoom: 3 };
      if (tryPut(label) || tryPut({ ...label, y: s.f.y0 - size * 0.8 })) n++;
    }
  }

  };
  const placeCapes = () => {
  // ---- Capes: the sharpest tips of land. ----
  {
    const cands = [];
    const st = Math.max(1, Math.round(2 * S));
    for (let y = 12; y < H - 12; y += st) for (let x = 12; x < W - 12; x += st) {
      const i = y * W + x;
      if (!land[i] || (land[i - 1] && land[i + 1] && land[i - W] && land[i + W])) continue;
      let l = 0, n = 0, ox = 0, oy = 0;
      for (const rad of [4 * S, 8 * S]) for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2, qx = x + Math.cos(a) * rad, qy = y + Math.sin(a) * rad;
        n++;
        if (land[px(qx, qy)]) l++; else { ox += Math.cos(a); oy += Math.sin(a); }
      }
      if (l / n < 0.3) cands.push({ x: x + 0.5, y: y + 0.5, f: l / n, ox, oy });
    }
    cands.sort((a, b) => a.f - b.f || a.y - b.y || a.x - b.x);
    const taken = [];
    for (const c of cands) {
      if (taken.length >= 8) break;
      if (taken.some((t) => Math.hypot(t.x - c.x, t.y - c.y) < 110 * S)) continue;
      const w0 = wordAt(c.x, c.y);
      const text = r.chance(0.65) ? `Cape ${w0}` : `${w0} Point`;
      const size = 2.9 * S;
      const ol = Math.hypot(c.ox, c.oy) || 1;
      const w = lineWidth(text, 0.04) * size;
      const x = c.x + (c.ox / ol) * (w / 2 + size * 0.6), y = c.y + (c.oy / ol) * size * 1.1;
      if (tryPut({ id: `cape-${out.length}`, kind: 'cape', text, lines: [text], x, y, size, angle: 0, spacing: 0.04, minZoom: 3 })) taken.push(c);
    }
  }

  };
  const placeShields = () => {
  // ---- Route shields, on the highways. ----
  for (const sh of roads.shields) {
    const size = 2.7 * S;
    const minZoom = sh.cls === 'motorway' ? 2 : sh.cls === 'trunk' ? 3 : 4;
    tryPut({ id: `shield-${out.length}`, kind: 'shield', text: sh.text, lines: [sh.text], x: sh.x, y: sh.y, size, angle: 0, spacing: 0, minZoom, shield: sh.sign }, 0.3 * S);
  }

  };
  // ---- Volcanoes: a cone with a crater lake, named and with a height. ----
  const placeVolcanoes = () => {
    for (const v of volcanoes) {
      const name = r.chance(0.5) ? `Mount ${wordAt(v.x, v.y)}` : `${wordAt(v.x, v.y)} Volcano`;
      const metres = Math.round(600 + v.e * 5200 + r.next() * 100);
      beside({ id: `volcano-${out.length}`, kind: 'peak', text: name, lines: [name, metres.toLocaleString('en-US') + ' m'], size: 3.1 * S, angle: 0, spacing: 0, minZoom: 3, volcano: true }, v.x, v.y, 3.1 * S, 0.9);
    }
  };
  // ---- The larger small lakes: finger lakes along their length, reservoirs, and the rest. ----
  const placeLakes = () => {
    if (!smallLakes) return;
    const list = smallLakes.lakes.filter((l) => l.area > (l.kind === 'finger' || l.kind === 'reservoir' || l.kind === 'chain' ? 1 : 2.5) * S * S).sort((a, b) => b.area - a.area);
    for (const l of list.slice(0, 70)) {
      const w0 = wordAt(l.x, l.y);
      const text = l.kind === 'reservoir' ? `${w0} Reservoir` : l.kind === 'crater' ? `Crater Lake ${w0}` : `Lake ${w0}`;
      // Along the lake's long axis.
      let cxx = 0, cyy = 0, cxy = 0;
      for (const [x, y] of l.ring) { cxx += (x - l.x) ** 2; cyy += (y - l.y) ** 2; cxy += (x - l.x) * (y - l.y); }
      let ang = (0.5 * Math.atan2(2 * cxy, cxx - cyy) * 180) / Math.PI;
      if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
      ang = Math.abs(ang) > 60 ? 0 : Math.round(ang);
      tryPut({ id: `lake-${out.length}`, kind: 'lake', text, lines: [text], x: l.x, y: l.y, size: 2.8 * S, angle: ang, spacing: 0, minZoom: l.area > 10 * S * S ? 4 : 5 });
    }
  };
  // ---- Marshes: where ponds crowd a flat wet coast. ----
  const placeMarshes = () => {
    if (!smallLakes) return;
    const marsh = smallLakes.lakes.filter((l) => l.kind === 'marsh');
    const done = [];
    for (const l of marsh) {
      if (done.length >= 3) break;
      if (done.some((d) => Math.hypot(d[0] - l.x, d[1] - l.y) < 110 * S)) continue;
      const near = marsh.filter((o) => Math.hypot(o.x - l.x, o.y - l.y) < 12 * S);
      if (near.length < 6) continue;
      const x = near.reduce((a, o) => a + o.x, 0) / near.length, y = near.reduce((a, o) => a + o.y, 0) / near.length;
      const text = `${wordAt(x, y)} ${r.pick(['Marshes', 'Wetlands', 'Fens', 'Marsh'])}`;
      if (tryPut({ id: `marsh-${out.length}`, kind: 'region', text, lines: [text], x, y, size: 3.2 * S, angle: 0, spacing: 0.06, minZoom: 3 })) done.push([x, y]);
    }
  };

  // ---- Groups of islets: cays on their bank, skerries off their coast. ----
  const placeIsletGroups = () => {
    if (!islets) return;
    for (const g of islets.groups) {
      // Named for the country whose coast is nearest.
      let k = -1;
      for (let rad = 2; rad < 60 && k < 0; rad += 3) for (let a = 0; a < 12 && k < 0; a++) { const o = owner[px(g.x + Math.cos(a / 12 * Math.PI * 2) * rad * S, g.y + Math.sin(a / 12 * Math.PI * 2) * rad * S)]; if (o >= 0) k = o; }
      const w0 = k >= 0 && cultures ? cultures[k].namer.word() : namer.word();
      const FORMS = {
        cays: [(w) => `${w} Cays`, (w) => `${w} Keys`, (w) => `${w} Cays`], skerries: [(w) => `${w} Skerries`, (w) => `${w} Rocks`],
        atoll: [(w) => `${w} Atoll`], spit: [(w) => `${w} Spit`, (w) => `${w} Spit`, (w) => `${w} Point`], tidal: [(w) => `${w} Holm`, (w) => `Isle of ${w}`, (w) => `${w} Island`],
      };
      const text = r.pick(FORMS[g.kind] || FORMS.skerries)(w0);
      const size = 3 * S;
      const base = { id: `islets-${out.length}`, kind: 'island', text, lines: [text], x: g.x, y: g.y, size, angle: 0, spacing: 0.06, minZoom: g.kind === 'atoll' ? 3 : 4 };
      if (!tryPut(base)) if (!tryPut({ ...base, y: g.y - (g.r || 6 * S) * 0.6 - size })) tryPut({ ...base, y: g.y + (g.r || 6 * S) * 0.6 + size });
    }
  };
  // ---- City parks: the larger ones named, for the closest zoom. ----
  const placeCityParks = () => {
    const realUsed = new Map();
    const list = cityParks.map((p, k) => ({ p, k })).filter(({ p }) => p.big || p.area > 0.22 * S * S).sort((a, b) => (b.p.big ? 1 : 0) - (a.p.big ? 1 : 0) || settlements[a.p.settlement].rank - settlements[b.p.settlement].rank || b.p.area - a.p.area || a.k - b.k);
    for (const { p } of list) {
      const s = settlements[p.settlement], id = projects[p.country].id;
      let text = null;
      if (REAL_PARKS[id]) { const n = realUsed.get(id) || 0; if (n < REAL_PARKS[id].length) { text = REAL_PARKS[id][n]; realUsed.set(id, n + 1); } }
      if (!text) {
        const w0 = cultures ? cultures[p.country].namer.word() : namer.word();
        text = r.pick([(w) => `${w} Park`, (w) => `${w} Park`, (w) => `${w} Gardens`, (w) => `${w} Green`, () => `${s.name} Common`])(w0);
      }
      const size = 2.25 * S;
      tryPut({ id: `citypark-${out.length}`, kind: 'citypark', text, lines: lineBreaks(text)[text.length > 14 ? Math.min(1, lineBreaks(text).length - 1) : 0], x: p.x, y: p.y, size, angle: 0, spacing: 0, minZoom: p.big ? 6 : 9 }, 0.3 * S);
    }
  };

  // ---- Districts: the quarters of the larger cities, named for the closest zooms (a metropolis has half a dozen, a
  // capital a few, a city one or two). New York's and Chicago's are their own. ----
  const placeDistricts = () => {
    if (!urban) return;
    const dr = r.fork('districts');
    settlements.forEach((s) => {
      const id = projects[s.country].id;
      if (s.rank > RANK.CITY || !(s.reach >= (REAL_DISTRICTS[id] ? 3 : 4.2) * S)) return;
      const real = s.rank === RANK.CAPITAL && REAL_DISTRICTS[id] ? REAL_DISTRICTS[id].slice() : null;
      // (In those two countries only the capitals have named quarters: their other names are all real towns'.)
      if (REAL_DISTRICTS[id] && !real) return;
      const want = s.metro ? 7 : s.rank === RANK.CAPITAL ? 4 : 2;
      const spots = [];
      let old = false;
      for (let t = 0; t < (real ? 400 : want * 30) && spots.length < want; t++) {
        const a = dr.next() * Math.PI * 2, rr = dr.range(0.28, 1.05) * s.reach;
        const x = s.x + Math.cos(a) * rr, y = s.y + Math.sin(a) * rr;
        if (!urban(x, y) || spots.some((p) => Math.hypot(p[0] - x, p[1] - y) < Math.max(2.4 * S, s.reach * 0.3))) continue;
        let text;
        if (real && real.length) text = real[0];
        else {
          const nm = cultures ? cultures[s.country].namer : namer, u = dr.next();
          text = u < 0.72 ? nm.town() : u < 0.8 && !old && (s.layout === 'medieval' || s.layout === 'radial' || s.layout === 'port') ? 'Old Town' : dr.pick([(w) => `${w} Quarter`, (w) => `${w} Heights`, (w) => `${w} Hill`, (w) => `${w} Side`])(nm.word());
        }
        const size = 2.3 * S;
        if (!tryPut({ id: `district-${out.length}`, kind: 'district', text, lines: lineBreaks(text)[text.length > 12 ? Math.min(1, lineBreaks(text).length - 1) : 0], x, y, size, angle: 0, spacing: 0.03, minZoom: 8 }, 0.3 * S)) continue;
        if (real && real.length) real.shift();
        if (text === 'Old Town') old = true;
        spots.push([x, y]);
      }
    });
  };

  // Most important first: each later name must fit round the earlier ones.
  placeRank(RANK.CITY);
  placeParks();
  placeRegions();
  placePeaks();
  placeShields();
  placeVolcanoes();
  placeIslands();
  placeIsletGroups();
  placeRank(RANK.TOWN);
  placeMarshes();
  placeCapes();
  placeDeltas();
  placeLakes();
  placeRank(RANK.VILLAGE);
  placeCityParks();
  placeDistricts();
  placeMissed();

  return out;
}

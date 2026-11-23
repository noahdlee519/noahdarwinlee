// The map's finer detail: national parks, the subdivisions of the larger
// countries, small streams, and the names of small features (settlements,
// peaks, capes, islands and island groups, forests, deserts, plateaus,
// deltas, parks, and route shields), placed clear of every other name.

import { clamp, smoothstep, makeNoise, fbm } from './rng.mjs';
import { COVER } from './climate.mjs';
import { RANK } from './settlements.mjs';
import { landmasses } from './terrain.mjs';
import { labelRects, rectsOverlap, lineWidth, samples, insideDistance, makeNamer, zoomFor } from './labels.mjs';

// ------------------------------------------------------------------ parks --

// buildParks({ land, owner, cover, elev, settlements, projects, areas, width, height, rng })
//   => { mask: Int16Array (park index per pixel, -1 none), parks: [{ country, area }] }
// A few parks a world, in wild country (forest, mountains, wild coasts) away
// from towns, each inside one country.
export function buildParks({ land, owner, cover, elev, settlements, projects, areas, width, height, rng, dist }) {
  const W = width, H = height, N = W * H, S = W / 1600;
  const r = rng.fork('parks');
  const n = makeNoise(r);
  const WILD = { [COVER.FOREST]: 1, [COVER.WOODLAND]: 0.75, [COVER.GRASS]: 0.4, [COVER.STEPPE]: 0.35, [COVER.DESERT]: 0.4, [COVER.ROCK]: 0.95, [COVER.SNOW]: 0.6 };
  const wild = new Float32Array(N);
  for (let i = 0; i < N; i++) if (land[i] && owner[i] >= 0) wild[i] = (WILD[cover[i]] ?? 0.3) + 0.25 * smoothstep(0.25, 0.5, elev[i]) + (dist[i] < 3 * S ? 0.15 : 0);
  // Away from the towns.
  for (const s of settlements) {
    const R = (s.rank === 0 ? 26 : s.rank === 1 ? 18 : s.rank === 2 ? 9 : 4) * S;
    const x0 = Math.max(0, Math.floor(s.x - R)), x1 = Math.min(W - 1, Math.ceil(s.x + R));
    const y0 = Math.max(0, Math.floor(s.y - R)), y1 = Math.min(H - 1, Math.ceil(s.y + R));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (Math.hypot(x - s.x, y - s.y) < R) wild[y * W + x] = 0;
  }
  const mask = new Int16Array(N).fill(-1);
  const parks = [];
  // One park in each of the larger countries, the wildest first, up to six.
  const order = projects.map((p, k) => k).filter((k) => areas[k] > 4000 * S * S).sort((a, b) => areas[b] - areas[a]);
  const step = Math.max(1, Math.round(3 * S));
  for (const k of order) {
    if (parks.length >= 6) break;
    // The wildest spot: the best average over a window.
    let best = -1, bv = 0;
    for (let y = 12; y < H - 12; y += step) for (let x = 12; x < W - 12; x += step) {
      const i = y * W + x;
      if (owner[i] !== k || wild[i] < 0.6) continue;
      let sum = 0;
      for (let dy = -9; dy <= 9; dy += 3) for (let dx = -9; dx <= 9; dx += 3) { const j = (y + dy) * W + x + dx; sum += owner[j] === k ? wild[j] : 0; }
      if (sum > bv) { bv = sum; best = i; }
    }
    if (best < 0 || bv < 30) continue;
    const target = clamp(areas[k] * 0.05, 450 * S * S, 2400 * S * S);
    // Grow by priority: wild ground first, with noise so the edge is irregular.
    const id = parks.length;
    const pri = (i) => wild[i] + 0.35 * fbm(n, (i % W) / (14 * S), Math.floor(i / W) / (14 * S), 3);
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
        if (j < 0 || j >= N || seen[j] || owner[j] !== k || wild[j] < 0.3 || mask[j] >= 0) continue;
        seen[j] = 1;
        heap.push([pri(j), j]);
      }
      if (heap.length > 4000) heap.splice(0, heap.length - 3000);
    }
    if (area < 250 * S * S) { for (let i = 0; i < N; i++) if (mask[i] === id) mask[i] = -1; continue; }
    // Smooth the edge: fill notches, shave spurs (never crossing a border).
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
    parks.push({ country: k, area: a2 });
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
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, k = owner[i];
    if (k < 0 || !seedsOf[k].length) continue;
    const wx = x + 9 * S * fbm(n, x / (40 * S), y / (40 * S), 3), wy = y + 9 * S * fbm(n, x / (40 * S) + 7.1, y / (40 * S) - 3.3, 3);
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
export function placeDetailLabels({ labels, land, elev, cover, hydro, temp, owner, settlements, roads, parks, projects, width, height, rng }) {
  const W = width, H = height, N = W * H, S = W / 1600;
  const r = rng.fork('detail-names');
  const namer = makeNamer(r);
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
      const text = namer.town();
      const size = SIZE[rank] * S;
      const ok = beside({ id: `${KIND[rank]}-${out.length}`, kind: KIND[rank], text, lines: [text], size, angle: 0, spacing: 0, minZoom: ZOOM[rank] }, s.x, s.y, size);
      if (ok) s.name = text;
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
      const name = r.pick([(w) => `Mount ${w}`, (w) => `${w} Peak`, (w) => `Mount ${w}`, (w) => `${w}horn`])(namer.word());
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
      const t = themed(p.country);
      const word = t ? t.word : namer.word();
      p.name = `${word} National Park`;
      const size = 3.3 * S;
      const lines = [`${word}`, 'National Park'];
      const label = { id: `park-${id}`, kind: 'park', text: p.name, lines, x: (best % W) + 0.5, y: Math.floor(best / W) + 0.5, size, angle: 0, spacing: 0.02, minZoom: 2, park: id };
      if (t) { label.theme = t.theme; label.word = t.word; }
      if (!tryPut(label)) tryPut({ ...label, lines: [p.name], size: size * 0.9 });
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
    const plateau = (i) => land[i] && elev[i] > 0.27 && elev[i] < 0.5 && Math.abs(elev[Math.min(N - 1, i + 3)] - elev[Math.max(0, i - 3)]) + Math.abs(elev[Math.min(N - 1, i + 3 * W)] - elev[Math.max(0, i - 3 * W)]) < 0.025;
    const kinds = [
      { test: (i) => land[i] && forest[i] > 0.55, min: 2600 * S * S, forms: [(w) => `${w} Forest`, (w) => `${w} Woods`], max: 3 },
      { test: (i) => land[i] && desert[i] > 0.6, min: 2200 * S * S, forms: [(w) => `${w} Desert`], max: 2 },
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
        const text = r.pick(k.forms)(namer.word());
        const size = clamp(Math.sqrt(pixels.length) * 0.05, 3.4 * S, 5.2 * S);
        if (tryPut({ id: `region-${out.length}`, kind: 'region', text, lines: [text], x: (best % W) + 0.5, y: Math.floor(best / W) + 0.5, size, angle: 0, spacing: 0.16, minZoom: 2 })) { n++; regionNames.push(text); }
      }
    }
  }

  };
  const placeDeltas = () => {
  // ---- Deltas: where a big river fans out in warm country. ----
  hydro.rivers.forEach((pts, k) => {
    const m = hydro.riverMeta[k];
    if (m.ends !== 'sea' || m.width < 2 || pts.length < 40) return;
    const [x, y] = pts[pts.length - 1];
    if (temp[px(x, y)] < 6) return;
    const back = pts[Math.max(0, pts.length - 10)];
    const text = `${namer.word()} Delta`;
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
      const text = `${namer.word()} Islands`;
      const size = 3.6 * S;
      if (tryPut({ id: `islands-${out.length}`, kind: 'island', text, lines: [text], x, y, size, angle: 0, spacing: 0.12, minZoom: 2 })) for (const s of g) grouped.add(s.m);
    }
    // Single islands of some size: the name just below the island.
    let n = 0;
    for (const s of small.filter((s) => !grouped.has(s.m) && s.n >= 40 * S * S).sort((a, b) => b.n - a.n || a.m - b.m)) {
      if (n >= 10) break;
      const text = r.chance(0.3) ? `Isle of ${namer.word()}` : `${namer.word()} Island`;
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
      const text = r.chance(0.65) ? `Cape ${namer.word()}` : `${namer.word()} Point`;
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
    tryPut({ id: `shield-${out.length}`, kind: 'shield', text: sh.text, lines: [sh.text], x: sh.x, y: sh.y, size, angle: 0, spacing: 0, minZoom: 2, shield: sh.kind }, 0.3 * S);
  }

  };
  // Most important first: each later name must fit round the earlier ones.
  placeRank(RANK.CITY);
  placeParks();
  placeRegions();
  placePeaks();
  placeShields();
  placeIslands();
  placeRank(RANK.TOWN);
  placeCapes();
  placeDeltas();
  placeRank(RANK.VILLAGE);

  return out;
}

// ------------------------------------------------------------ reservoirs --

// buildReservoirs({ land, elev, hydro, settlements, width, height, rng }) => [[[x, y], ...]] rings
// A few long, narrow lakes dammed on rivers in the hills, each a ring that
// swells along a stretch of the river and narrows at the dam.
export function buildReservoirs({ land, elev, hydro, width, height, rng }) {
  const W = width, H = height, S = W / 1600;
  const r = rng.fork('reservoirs');
  const out = [];
  const px = (x, y) => clamp(Math.floor(y), 0, H - 1) * W + clamp(Math.floor(x), 0, W - 1);
  const cands = [];
  hydro.rivers.forEach((pts, k) => {
    const m = hydro.riverMeta[k];
    if (m.width < 2 || pts.length < 30) return;
    for (let j = 6; j + 18 < pts.length - 6; j += 9) {
      const e = elev[px(pts[j][0], pts[j][1])];
      if (e < 0.12 || e > 0.34) continue;
      cands.push({ k, j, e, score: e + r.next() * 0.1 });
    }
  });
  cands.sort((a, b) => b.score - a.score || a.k - b.k || a.j - b.j);
  const taken = [];
  for (const c of cands) {
    if (out.length >= 5) break;
    const pts = hydro.rivers[c.k].slice(c.j, c.j + 16 + r.int(8));
    const mid = pts[pts.length >> 1];
    if (taken.some((t) => Math.hypot(t[0] - mid[0], t[1] - mid[1]) < 120 * S)) continue;
    // Smooth the course, then offset it both ways, widest two thirds of the way down to the dam.
    const sm = pts.map((p, i) => {
      let sx = 0, sy = 0, n = 0;
      for (let q = Math.max(0, i - 2); q <= Math.min(pts.length - 1, i + 2); q++) { sx += pts[q][0]; sy += pts[q][1]; n++; }
      return [sx / n, sy / n];
    });
    const width = (1.1 + r.next() * 0.9) * S;
    const left = [], right = [];
    let ok = true;
    sm.forEach((p, i) => {
      const a = sm[Math.max(0, i - 1)], b = sm[Math.min(sm.length - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const t = i / (sm.length - 1);
      const w = width * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.7 + 0.15 * S;
      const L = [p[0] - ty * w, p[1] + tx * w], R = [p[0] + ty * w, p[1] - tx * w];
      if (!land[px(L[0], L[1])] || !land[px(R[0], R[1])] || hydro.lakes[px(L[0], L[1])]) ok = false;
      left.push(L); right.push(R);
    });
    if (!ok) continue;
    out.push([...left, ...right.reverse()].map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]));
    taken.push(mid);
  }
  return out;
}

// Settlements: a capital, cities, towns, and villages for every country,
// where people would settle: on coasts, on rivers and at their mouths, on
// plains; few in mountains, deserts, and tundra. Each has a rank (0 capital,
// 1 city, 2 town, 3 village), a size that sets its built-up area, and a name.

import { makeNoise, fbm, clamp, smoothstep } from './rng.mjs';
import { COVER } from './climate.mjs';

export const RANK = { CAPITAL: 0, CITY: 1, TOWN: 2, VILLAGE: 3 };
// Least distance (map units, at 1600 wide) from a new settlement of this rank
// to any other of the same rank or larger.
const SPACING = [0, 48, 17, 8.5];

// buildSettlements({ land, elev, temp, cover, hydro, dist, owner, capitals, areas, projects, width, height, rng })
//   => [{ x, y, rank, country (project index), size }]
// capitals: the countries' capitals, kept where they are.
export function buildSettlements({ land, elev, temp, cover, hydro, dist, owner, capitals, areas, projects, width, height, rng, blocked = null, oases = [] }) {
  const W = width, H = height, N = W * H, S = W / 1600;
  const r = rng.fork('settlements');
  const { riverClass, lakes } = hydro;

  // Near a river: within a few pixels of a main river, by class.
  const nearRiver = new Float32Array(N);
  for (let i = 0; i < N; i++) if (riverClass[i] >= 2) nearRiver[i] = riverClass[i];
  for (let pass = 0; pass < 3; pass++) {
    const next = nearRiver.slice();
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const m = Math.max(nearRiver[i - 1], nearRiver[i + 1], nearRiver[i - W], nearRiver[i + W]) * 0.8;
      if (m > next[i]) next[i] = m;
    }
    nearRiver.set(next);
  }
  // River mouths: the last point of every river that reaches the sea.
  const mouths = [];
  hydro.rivers.forEach((pts, k) => {
    const m = hydro.riverMeta[k];
    if (m.ends === 'sea' && m.width >= 2) mouths.push(pts[pts.length - 1]);
  });

  const COVER_PULL = { [COVER.FOREST]: 0.75, [COVER.WOODLAND]: 0.95, [COVER.GRASS]: 1, [COVER.STEPPE]: 0.7, [COVER.DESERT]: 0.22, [COVER.ROCK]: 0.08, [COVER.SNOW]: 0, [COVER.SAND]: 0.6, [COVER.DUNE]: 0.1, [COVER.DRYROCK]: 0.12, [COVER.SALT]: 0.02 };
  const suit = (i) => {
    if (!land[i] || lakes[i] || owner[i] < 0 || (blocked && blocked[i])) return 0;
    const e = elev[i];
    let s = smoothstep(0.42, 0.1, e) * (COVER_PULL[cover[i]] ?? 0.5);
    if (temp[i] < -6) s *= smoothstep(-16, -6, temp[i]) * 0.8 + 0.2;
    const d = dist[i];
    if (d <= 2.5 * S) s *= 1.9; else if (d <= 9 * S) s *= 1.35;
    if (nearRiver[i] > 0) s *= 1 + 0.25 * nearRiver[i];
    // An oasis: the one place in the desert where people settle.
    if (oases.length) { const x = i % W, y = (i / W) | 0; for (const o of oases) if (Math.hypot(x + 0.5 - o.x, y + 0.5 - o.y) < o.r * 1.1) s = Math.max(s, 0.9); }
    return s;
  };

  // Candidates: every second pixel, scored, with a little luck.
  const step = Math.max(1, Math.round(2 * S));
  const cands = [];
  for (let y = step; y < H - step; y += step) for (let x = step; x < W - step; x += step) {
    const i = y * W + x;
    const s = suit(i);
    if (s <= 0.04) continue;
    let mouth = 0;
    for (const [mx, my] of mouths) if (Math.abs(mx - x) < 7 * S && Math.abs(my - y) < 7 * S) mouth = 1;
    cands.push({ i, x: x + 0.5, y: y + 0.5, s: s * (1 + mouth * 0.8) * (0.55 + 0.45 * r.next()), country: owner[i] });
  }
  cands.sort((a, b) => b.s - a.s || a.i - b.i);

  const out = capitals.map((c) => ({ x: c.x, y: c.y, rank: RANK.CAPITAL, country: projects.findIndex((p) => p.id === c.id), size: 1 }));
  // A coarse grid of what is placed, for spacing checks.
  const G = 24 * S, gw = Math.ceil(W / G), gh = Math.ceil(H / G);
  const grid = Array.from({ length: gw * gh }, () => []);
  const put = (s) => grid[Math.min(gh - 1, Math.floor(s.y / G)) * gw + Math.min(gw - 1, Math.floor(s.x / G))].push(s);
  out.forEach(put);
  const clear = (x, y, rank) => {
    const reach = SPACING[rank] * S;
    const gx = Math.floor(x / G), gy = Math.floor(y / G), k = Math.ceil(SPACING[1] * S / G);
    for (let yy = gy - k; yy <= gy + k; yy++) for (let xx = gx - k; xx <= gx + k; xx++) {
      if (yy < 0 || yy >= gh) continue;
      const cell = grid[yy * gw + ((xx % gw) + gw) % gw];
      for (const o of cell) {
        // A settlement keeps its own spacing from smaller ones, and theirs from larger.
        const need = Math.max(reach, SPACING[Math.max(o.rank, rank)] * S) * (o.rank < rank ? 1.25 : 1);
        if (Math.hypot(o.x - x, o.y - y) < need) return false;
      }
    }
    return true;
  };

  // How many of each rank a country gets, by its area.
  const quota = projects.map((p, k) => {
    const a = areas[k] / (S * S);
    const flag = p.tier === 'flagship';
    return [0, flag ? clamp(Math.round(a / 9000), 2, 6) : a > 3500 ? 1 : 0, clamp(Math.round(a / 1700), 1, 26), clamp(Math.round(a / 650), 1, 60)];
  });
  for (const rank of [RANK.CITY, RANK.TOWN, RANK.VILLAGE]) {
    const left = quota.map((q) => q[rank]);
    for (const c of cands) {
      if (left[c.country] <= 0) continue;
      // Villages may sit on poorer ground than towns, towns than cities.
      if (rank === RANK.CITY && c.s < 0.35) continue;
      if (!clear(c.x, c.y, rank)) continue;
      const s = { x: c.x, y: c.y, rank, country: c.country, size: clamp(c.s, 0.3, 2.2) };
      out.push(s); put(s);
      left[c.country]--;
    }
  }
  // Capitals are the largest place of their country.
  for (const s of out) if (s.rank === RANK.CAPITAL) s.size = 2.4;
  return out;
}

// The built-up area round each settlement, as discs the land cover is
// painted grey within (see urbanAt): radius by rank and size.
export function urbanSpots(settlements, width) {
  const S = width / 1600;
  const R = [11, 6.6, 2.8, 1.1];
  return settlements.map((s) => ({ x: s.x, y: s.y, r: R[s.rank] * S * (s.rank === 0 ? 1 : 0.75 + 0.25 * s.size) }));
}

// urbanField(spots, width, height, rng) => (x, y, elevAt) => boolean
// Whether a point (map units) is built up: inside a settlement's disc,
// frayed by noise so the edge is ragged and patchy, and kept off steep or
// high ground, so towns follow coasts and valleys.
export function urbanField(spots, width, height, rng) {
  const S = width / 1600;
  const n = makeNoise(rng.fork('urban'));
  const G = 16 * S, gw = Math.ceil(width / G), gh = Math.ceil(height / G);
  const grid = Array.from({ length: gw * gh }, () => []);
  for (const s of spots) {
    const x0 = Math.floor((s.x - s.r * 1.6) / G), x1 = Math.floor((s.x + s.r * 1.6) / G);
    const y0 = Math.floor((s.y - s.r * 1.6) / G), y1 = Math.floor((s.y + s.r * 1.6) / G);
    for (let gy = Math.max(0, y0); gy <= Math.min(gh - 1, y1); gy++) for (let gx = Math.max(0, x0); gx <= Math.min(gw - 1, x1); gx++) grid[gy * gw + gx].push(s);
  }
  return (x, y, e) => {
    const cell = grid[Math.min(gh - 1, Math.max(0, Math.floor(y / G))) * gw + Math.min(gw - 1, Math.max(0, Math.floor(x / G)))];
    if (!cell.length) return false;
    const wob = fbm(n, x / (2.6 * S), y / (2.6 * S), 3);
    for (const s of cell) {
      const d = Math.hypot(x - s.x, y - s.y);
      if (d > s.r * 1.6) continue;
      // Built-up ground thins out up the hills.
      const hill = smoothstep(0.16, 0.34, e);
      const reach = s.r * (0.72 + 0.55 * wob) * (1 - 0.8 * hill);
      if (d < reach) return true;
    }
    return false;
  };
}

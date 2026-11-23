// Land that belongs to no project: polar ice at the top or bottom of some
// worlds, and the small island called About, with its "you are here" dot.

import { makeNoise, fbm, clamp, smoothstep } from './rng.mjs';
import { blobRing, inRing } from './lakes.mjs';

// Distance from every pixel to the nearest land pixel (two-pass chamfer; the map wraps east and west).
function landDistance(land, W, H) {
  const N = W * H, d = new Float32Array(N);
  for (let i = 0; i < N; i++) d[i] = land[i] ? 0 : 1e9;
  const B = Math.SQRT2;
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!d[i]) continue;
      const xl = x > 0 ? x - 1 : W - 1, xr = x < W - 1 ? x + 1 : 0;
      let v = Math.min(d[i], d[y * W + xl] + 1);
      if (y > 0) v = Math.min(v, d[(y - 1) * W + x] + 1, d[(y - 1) * W + xl] + B, d[(y - 1) * W + xr] + B);
      d[i] = v;
    }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x; if (!d[i]) continue;
      const xl = x > 0 ? x - 1 : W - 1, xr = x < W - 1 ? x + 1 : 0;
      let v = Math.min(d[i], d[y * W + xr] + 1);
      if (y < H - 1) v = Math.min(v, d[(y + 1) * W + x] + 1, d[(y + 1) * W + xl] + B, d[(y + 1) * W + xr] + B);
      d[i] = v;
    }
  }
  return d;
}

// buildIce({ land, width, height, rng, sides }) => Uint8Array mask (1 = ice)
// sides: 'n', 's', or 'ns'. A band of ice along the map's top or bottom edge,
// its seaward edge ragged with ice shelves and bays, the same at the east and
// west edges (it is seamless where the world wraps), and kept well clear of
// the projects' land.
export function buildIce({ land, width, height, rng, sides }) {
  const W = width, H = height, N = W * H, S = W / 1600;
  const mask = new Uint8Array(N);
  if (!sides) return mask;
  const r = rng.fork('ice');
  const nA = makeNoise(r), nB = makeNoise(r);
  const dl = landDistance(land, W, H);
  // Noise that is seamless across x = 0 / x = W: two samples blended across the width.
  const seam = (n, x, y, sx, sy, oct) => ((W - x) * fbm(n, x / sx, y / sy, oct) + x * fbm(n, (x - W) / sx, y / sy, oct)) / W;
  for (const side of sides) {
    const depth = (r.range(34, 52)) * S;
    for (let x = 0; x < W; x++) {
      const broad = seam(nA, x, side === 'n' ? 0 : 50, 210 * S, 1, 3);
      for (let k = 0; k < 90 * S; k++) {
        const y = side === 'n' ? k : H - 1 - k;
        const fine = seam(nB, x, y, 14 * S, 14 * S, 4);
        const reach = depth * (0.72 + 0.6 * broad) + 7 * S * fine;
        if (k < reach && dl[y * W + x] > 5 * S) mask[y * W + x] = 1;
      }
    }
  }
  // Keep only ice joined to the band at the edge (no stray floes), and drop specks.
  const keep = new Uint8Array(N), stack = new Int32Array(N);
  let top = 0;
  for (let x = 0; x < W; x++) for (const y of [0, H - 1]) { const i = y * W + x; if (mask[i] && !keep[i]) { keep[i] = 1; stack[top++] = i; } }
  while (top) {
    const i = stack[--top], x = i % W, y = (i / W) | 0;
    for (const j of [y * W + (x > 0 ? x - 1 : W - 1), y * W + (x < W - 1 ? x + 1 : 0), y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j >= 0 && mask[j] && !keep[j]) { keep[j] = 1; stack[top++] = j; }
  }
  return keep;
}

// placeAbout({ land, ice, width, height, rng }) => { ring, x, y, mask } or null
// A small island in open water: well off every coast but not lost in the
// middle of an ocean, away from the map's edges.
export function placeAbout({ land, ice, width, height, rng }) {
  const W = width, H = height, N = W * H, S = W / 1600;
  const r = rng.fork('about');
  const all = new Uint8Array(N);
  for (let i = 0; i < N; i++) all[i] = land[i] || (ice && ice[i]) ? 1 : 0;
  const dl = landDistance(all, W, H);
  const cands = [];
  for (let y = 90 * S; y < H - 90 * S; y += 4 * S) for (let x = 110 * S; x < W - 110 * S; x += 4 * S) {
    const d = dl[Math.floor(y) * W + Math.floor(x)];
    if (d < 26 * S || d > 70 * S) continue;
    // Nearer the middle of the map is better, and a moderate distance from land.
    const score = -Math.abs(d - 38 * S) - 0.05 * Math.hypot(x - W / 2, (y - H / 2) * 1.6) + r.next() * 18 * S;
    cands.push({ x, y, score });
  }
  cands.sort((a, b) => b.score - a.score || a.y - b.y || a.x - b.x);
  const c = cands[0];
  if (!c) return null;
  const ring = blobRing(r, c.x, c.y, 6.5 * S, { stretch: 0.3, lean: r.next() * Math.PI, wobble: 1.6, n: 30 });
  const mask = new Uint8Array(N);
  for (let y = Math.floor(c.y - 14 * S); y <= c.y + 14 * S; y++) for (let x = Math.floor(c.x - 14 * S); x <= c.x + 14 * S; x++) if (inRing(ring, x + 0.5, y + 0.5)) mask[y * W + x] = 1;
  return { ring, x: c.x, y: c.y, mask };
}

export { landDistance };
export const smooth = smoothstep;
export const clampv = clamp;

// Shapes of their own for two countries:
//
//   Braidable   (an AI consulting practice whose mark is a braid) a braided delta: its land cut by three channels that
//               cross and recross like the strands of a braid, leaving a chain of interlaced islands; on a mainland
//               the strands rise from one channel inland, as a river's arms do.
//   Portfolio   (Noah's portfolio site) a compact island, squarish, with a round harbour opening to the sea (the
//               square and the circle of his mark); on a mainland, a near-island tied to it by a narrow isthmus.
//
// Both are cut from the land as divided (land is only taken away, never added), before the towns and the names.

import { clamp, makeNoise, smoothstep } from './rng.mjs';
import { axesOf } from './frontiers.mjs';
import { landmasses } from './terrain.mjs';

const N4 = (i, W, N) => { const x = i % W; return [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W >= 0 ? i - W : -1, i + W < N ? i + W : -1]; };

// The largest piece of country k.
function mainPiece(owner, k, W, H) {
  const N = W * H, seen = new Uint8Array(N);
  let best = [];
  for (let s = 0; s < N; s++) {
    if (owner[s] !== k || seen[s]) continue;
    const out = [], stack = [s];
    seen[s] = 1;
    while (stack.length) { const i = stack.pop(); out.push(i); for (const j of N4(i, W, N)) if (j >= 0 && !seen[j] && owner[j] === k) { seen[j] = 1; stack.push(j); } }
    if (out.length > best.length) best = out;
  }
  return best;
}

function makeSea(world, nations, i) {
  const o = nations.owner[i];
  if (o >= 0) nations.areas[o]--;
  nations.owner[i] = -1;
  if (nations.provinces) nations.provinces[i] = -1;
  world.land[i] = 0; world.landAll[i] = 0;
  world.elev[i] = Math.min(world.elev[i], -0.02);
  world.hydro.lakes[i] = 0;
}

// Specks of k's land left too small to keep (a pixel or two between channels) go to the sea.
function sweepSpecks(world, nations, k, min) {
  const { width: W, height: H } = world, N = W * H, owner = nations.owner, seen = new Uint8Array(N);
  for (let s = 0; s < N; s++) {
    if (owner[s] !== k || seen[s]) continue;
    const out = [], stack = [s];
    seen[s] = 1;
    while (stack.length) { const i = stack.pop(); out.push(i); for (const j of N4(i, W, N)) if (j >= 0 && !seen[j] && world.land[j]) { seen[j] = 1; stack.push(j); } }
    if (out.length < min && out.every((i) => owner[i] === k)) for (const i of out) makeSea(world, nations, i);
  }
}

// A capital that fell in the water moves to the nearest good ground of its own.
function keepCapital(world, nations, projects, k, prefer = null) {
  const { width: W, height: H } = world, owner = nations.owner;
  const cap = nations.capitals.find((c) => c.id === projects[k].id);
  if (!cap) return;
  if (!prefer && owner[Math.floor(cap.y) * W + Math.floor(cap.x)] === k) return;
  const [tx, ty] = prefer || [cap.x, cap.y];
  let bi = -1, bd = Infinity;
  for (let i = 0; i < W * H; i++) {
    if (owner[i] !== k || world.hydro.lakes[i]) continue;
    // Not on a speck: some of its own land round it.
    const x = i % W, y = (i / W) | 0;
    let around = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && owner[yy * W + xx] === k) around++; }
    if (around < 18) continue;
    const d = Math.hypot(x + 0.5 - tx, y + 0.5 - ty);
    if (d < bd) { bd = d; bi = i; }
  }
  if (bi >= 0) { cap.x = (bi % W) + 0.5; cap.y = ((bi / W) | 0) + 0.5; }
}

// ---------------------------------------------------------------- braids --

function braid(world, nations, projects, k, rng) {
  const { width: W, height: H } = world, N = W * H, S = W / 1600, owner = nations.owner;
  const M = mainPiece(owner, k, W, H);
  if (M.length < 900 * S * S) return null;
  const ax = axesOf(M, W);
  let { ux, uy } = ax;
  const mass = landmasses(world.land, W, H);
  const m0 = mass.id[M[0]];
  let mainland = false;
  for (let i = 0; i < N && !mainland; i++) if (mass.id[i] === m0 && owner[i] !== k) mainland = true;
  // Along the long axis: t in 0..1 from one end to the other; and the piece's middle line, slice by slice.
  const T = M.map((i) => ((i % W) + 0.5 - ax.cx) * ux + (((i / W) | 0) + 0.5 - ax.cy) * uy);
  let t0 = Infinity, t1 = -Infinity;
  for (const t of T) { t0 = Math.min(t0, t); t1 = Math.max(t1, t); }
  // On a mainland the strands open to the sea at the end with more of it, and rise inland from one channel.
  if (mainland) {
    const seaNear = (sign) => { let n = 0; M.forEach((i, j) => { if ((sign > 0 ? T[j] > t1 - (t1 - t0) * 0.2 : T[j] < t0 + (t1 - t0) * 0.2) && N4(i, W, N).some((q) => q >= 0 && !world.land[q])) n++; }); return n; };
    if (seaNear(-1) > seaNear(1)) { ux = -ux; uy = -uy; const a = -t1; t1 = -t0; t0 = a; for (let j = 0; j < T.length; j++) T[j] = -T[j]; }
  }
  const len = t1 - t0, bins = 24, lo = new Float64Array(bins).fill(Infinity), hi = new Float64Array(bins).fill(-Infinity);
  const Sx = M.map((i) => -((i % W) + 0.5 - ax.cx) * uy + (((i / W) | 0) + 0.5 - ax.cy) * ux);
  M.forEach((i, j) => { const b = clamp(Math.floor(((T[j] - t0) / len) * bins), 0, bins - 1); lo[b] = Math.min(lo[b], Sx[j]); hi[b] = Math.max(hi[b], Sx[j]); });
  // Smoothed middle and half-width by slice.
  const mid = [], half = [];
  for (let b = 0; b < bins; b++) {
    let sm = 0, sh = 0, c = 0;
    for (let q = Math.max(0, b - 2); q <= Math.min(bins - 1, b + 2); q++) if (lo[q] < Infinity) { sm += (lo[q] + hi[q]) / 2; sh += (hi[q] - lo[q]) / 2; c++; }
    mid.push(c ? sm / c : 0); half.push(c ? sh / c : 0);
  }
  const at = (arr, tau) => { const f = clamp(tau * bins - 0.5, 0, bins - 1), a = Math.floor(f), b = Math.min(bins - 1, a + 1); return arr[a] + (arr[b] - arr[a]) * (f - a); };
  const twists = rng.range(1.6, 2.4), phase = rng.range(0, Math.PI * 2);
  const wHalf = clamp(rng.range(1.1, 1.45) * S, 1, 2);
  const noise = makeNoise(rng.fork('braid-wobble'));
  const start = mainland ? rng.range(0.12, 0.22) : -0.1;
  const env = (tau) => (mainland ? smoothstep(start, start + 0.35, tau) : 0.55 + 0.45 * Math.sin(Math.PI * clamp(tau, 0, 1)));
  const strand = (s, tau) => at(mid, tau) + at(half, tau) * 0.5 * env(tau) * Math.sin(Math.PI * 2 * twists * tau + phase + (s * Math.PI * 2) / 3) + 0.9 * S * noise(tau * 9, s * 3.1);
  let cut = 0;
  M.forEach((i, j) => {
    const tau = (T[j] - t0) / len;
    if (tau < start) return;
    for (let s = 0; s < 3; s++) {
      // The strands are cut a little wider toward the sea.
      const w = wHalf * (mainland ? 0.75 + 0.5 * tau : 1);
      if (Math.abs(Sx[j] - strand(s, tau)) < w) { makeSea(world, nations, i); cut++; return; }
    }
  });
  sweepSpecks(world, nations, k, Math.round(14 * S * S));
  // The capital at the braids' mouth: on the middle line near the seaward end (either end of an island).
  const end = mainland || rng.chance(0.5) ? 0.86 : 0.14;
  keepCapital(world, nations, projects, k, [ax.cx + ux * (t0 + len * end) - uy * at(mid, end), ax.cy + uy * (t0 + len * end) + ux * at(mid, end)]);
  return { kind: 'braid', mainland, twists: Math.round(twists * 10) / 10, cut, x: Math.round(ax.cx), y: Math.round(ax.cy) };
}

// ------------------------------------------------------------- portfolio --

function folio(world, nations, projects, k, rng) {
  const { width: W, height: H } = world, N = W * H, S = W / 1600, owner = nations.owner;
  const M = mainPiece(owner, k, W, H);
  if (M.length < 500 * S * S) return null;
  const mass = landmasses(world.land, W, H);
  const m0 = mass.id[M[0]];
  const inM = new Uint8Array(N);
  for (const i of M) inM[i] = 1;
  let mainland = false;
  for (let i = 0; i < N && !mainland; i++) if (mass.id[i] === m0 && owner[i] !== k) mainland = true;
  const noise = makeNoise(rng.fork('folio'));
  let neck = null;
  if (mainland) {
    // A near-island: the sea comes in along its land border, but for an isthmus at the border's middle.
    const border = M.filter((i) => N4(i, W, N).some((j) => j >= 0 && owner[j] >= 0 && owner[j] !== k));
    if (!border.length) return null;
    const bx = axesOf(border, W);
    let bi = border[0], bd = Infinity;
    for (const i of border) { const d = Math.hypot((i % W) + 0.5 - bx.cx, ((i / W) | 0) + 0.5 - bx.cy); if (d < bd) { bd = d; bi = i; } }
    neck = [(bi % W) + 0.5, ((bi / W) | 0) + 0.5];
    const ax0 = axesOf(M, W), R0 = Math.sqrt(M.length / Math.PI);
    const depth = clamp(R0 * 0.28, 5 * S, 12 * S), neckHalf = clamp(R0 * 0.1, 2.2 * S, 4 * S);
    // Distance from the land border, within the piece.
    const d = new Float32Array(N).fill(Infinity), q = [];
    for (const i of border) { d[i] = 0; q.push(i); }
    for (let h = 0; h < q.length; h++) { const i = q[h]; if (d[i] > depth + 2) continue; for (const j of N4(i, W, N)) if (j >= 0 && inM[j] && d[j] > d[i] + 1) { d[j] = d[i] + 1; q.push(j); } }
    for (const i of M) {
      const x = (i % W) + 0.5, y = ((i / W) | 0) + 0.5;
      const dn = Math.hypot(x - neck[0], y - neck[1]);
      const reach = depth * (0.8 + 0.35 * noise(x / (7 * S), y / (7 * S)));
      if (d[i] < reach && dn > neckHalf + d[i] * 0.55) makeSea(world, nations, i);
    }
    void ax0;
  }
  // Squarish: trimmed to a rounded square round its middle, sized to keep most of it.
  const left = M.filter((i) => owner[i] === k);
  const ax = axesOf(left, W);
  const sq = (i, sc) => {
    const dx = (i % W) + 0.5 - ax.cx, dy = ((i / W) | 0) + 0.5 - ax.cy;
    const t = dx * ax.ux + dy * ax.uy, s = -dx * ax.uy + dy * ax.ux;
    const a = ax.sa * 1.85 * sc, b = Math.max(ax.sb * 1.85 * sc, a * 0.62);
    const wob = 1 + 0.07 * noise((ax.cx + t) / (8 * S), (ax.cy + s) / (8 * S));
    return (Math.abs(t) / a) ** 4 + (Math.abs(s) / b) ** 4 <= wob;
  };
  let sc = 0.85;
  for (; sc < 1.6; sc += 0.05) { let kept = 0; for (const i of left) if (sq(i, sc)) kept++; if (kept >= left.length * 0.8) break; }
  for (const i of left) if (!sq(i, sc) && !(neck && Math.hypot((i % W) + 0.5 - neck[0], ((i / W) | 0) + 0.5 - neck[1]) < 6 * S)) makeSea(world, nations, i);
  // The round harbour, on the side away from the isthmus (or the side with the most sea beyond it), with its mouth.
  const R0 = Math.sqrt(left.filter((i) => owner[i] === k).length / Math.PI);
  const R = clamp(R0 * 0.36, 3.2 * S, 9 * S);
  const dirs = [[ax.ux, ax.uy], [-ax.ux, -ax.uy], [-ax.uy, ax.ux], [ax.uy, -ax.ux]];
  let best = null, bestScore = -Infinity;
  for (const [dx, dy] of dirs) {
    // How far the land runs that way, and how open the water is beyond.
    let ext = 0;
    while (ext < 200 && owner[clamp(Math.floor(ax.cy + dy * ext), 0, H - 1) * W + clamp(Math.floor(ax.cx + dx * ext), 0, W - 1)] === k) ext++;
    let open = 0;
    for (let e = ext; e < ext + 30 * S; e++) { const x = Math.floor(ax.cx + dx * e), y = Math.floor(ax.cy + dy * e); if (x >= 0 && y >= 0 && x < W && y < H && !world.landAll[y * W + x]) open++; }
    let score = open + rng.next() * 4;
    if (neck) score -= 40 * Math.max(0, (dx * (neck[0] - ax.cx) + dy * (neck[1] - ax.cy)) / (Math.hypot(neck[0] - ax.cx, neck[1] - ax.cy) || 1));
    if (ext < R * 2.2) score -= 100;
    if (score > bestScore) { bestScore = score; best = { dx, dy, ext }; }
  }
  const off = Math.max(0, best.ext - R * 1.6);
  const hx = ax.cx + best.dx * off, hy = ax.cy + best.dy * off;
  const mouth = R * 0.3;
  const RR = Math.ceil(R + best.ext + 4);
  for (let y = Math.floor(hy - RR); y <= hy + RR; y++) for (let x = Math.floor(hx - RR); x <= hx + RR; x++) {
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const i = y * W + x;
    if (owner[i] !== k) continue;
    const px = x + 0.5 - hx, py = y + 0.5 - hy;
    const along = px * best.dx + py * best.dy, across = -px * best.dy + py * best.dx;
    if (Math.hypot(px, py) < R || (along > 0 && Math.abs(across) < mouth)) makeSea(world, nations, i);
  }
  sweepSpecks(world, nations, k, Math.round(20 * S * S));
  // The capital on the harbour's inner shore.
  keepCapital(world, nations, projects, k, [hx - best.dx * (R + 2.2 * S), hy - best.dy * (R + 2.2 * S)]);
  return { kind: 'folio', mainland, harbour: [Math.round(hx * 10) / 10, Math.round(hy * 10) / 10, Math.round(R * 10) / 10], mouth: [best.dx, best.dy].map((v) => Math.round(v * 100) / 100), neck: neck && neck.map((v) => Math.round(v)) };
}

// shapeSpecials(world, nations, projects) => { braid, folio } (either may be null)
export function shapeSpecials(world, nations, projects) {
  const out = {};
  const b = projects.findIndex((p) => p.id === 'braidable'), f = projects.findIndex((p) => p.id === 'portfolio');
  out.braid = b >= 0 ? braid(world, nations, projects, b, world.rng.fork('braidable-shape')) : null;
  out.folio = f >= 0 ? folio(world, nations, projects, f, world.rng.fork('portfolio-shape')) : null;
  return out;
}

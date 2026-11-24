// Land that belongs to no project: a polar landmass at the top or bottom of
// some worlds, and the small island called About, with its "you are here" dot.
//
// The polar land is drawn after the web map's Greenland, Svalbard, and
// Antarctica: an ice sheet in white that runs off the map's edge, with a
// coastal fringe of bare rock and pale tundra, glaciers that reach the sea at
// the heads of fjords and in outlets along the coast, nunataks of rock poking
// through the ice, ice shelves filling some bays, and islands offshore. It is
// seamless where the world wraps. In some worlds it joins a project's land
// across an isthmus (and that country takes the habitable fringe near it), in
// some it lies across a narrow strait, in others it stands apart.

import { makeNoise, fbm, clamp, smoothstep } from './rng.mjs';
import { blobRing, inRing, ringArea } from './lakes.mjs';
import { COVER } from './climate.mjs';

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

// buildPolar({ land, elev, width, height, rng, sides, link })
//   => { ice, claim, shelf, cover: (x, y) => class or -1, sides }
// sides: 'n' or 's' (or 'ns'). link: 'isthmus' (joined to the project land nearest the pole, whose country takes the
// fringe near the join), 'strait' (a narrow channel between), or 'apart'.
// ice: the polar land no project holds (ice sheet, fringe, shelves, islands). claim: polar land given to project land.
export function buildPolar({ land, width, height, rng, sides, link = 'apart' }) {
  const W = width, H = height, N = W * H, S = W / 1600;
  const ice = new Uint8Array(N), claim = new Uint8Array(N), shelf = new Uint8Array(N);
  if (!sides) return { ice, claim, shelf, cover: null, sides: '' };
  const r = rng.fork('ice');
  const nA = makeNoise(r), nB = makeNoise(r), nC = makeNoise(r), nF = makeNoise(r), nT = makeNoise(r), nN = makeNoise(r), nO = makeNoise(r), nS = makeNoise(r);
  const dl = landDistance(land, W, H);
  const TAU = Math.PI * 2;
  // Noise that repeats round the world: 1-D along x, sampled on a circle; and 2-D, blended across a strip at the seam.
  const per = (n, x, lambda, oct, off = 0) => { const a = (TAU * x) / W, R = W / (TAU * lambda); return fbm(n, R * Math.cos(a) + off, R * Math.sin(a) - off, oct); };
  const SB = 70 * S;
  const seam = (n, x, y, sc, oct) => {
    if (x >= SB) return fbm(n, x / sc, y / sc, oct);
    const w = smoothstep(0, SB, x), a = fbm(n, x / sc, y / sc, oct), b = fbm(n, (x + W) / sc, y / sc, oct);
    return (w * a + (1 - w) * b) / Math.sqrt(w * w + (1 - w) * (1 - w));
  };
  const wrapDx = (dx) => (dx > W / 2 ? dx - W : dx < -W / 2 ? dx + W : dx);
  const all = new Uint8Array(N); // every polar pixel, claimed or not
  const meta = [];

  for (const side of sides) {
    const kOf = (y) => (side === 'n' ? y : H - 1 - y);
    const yOf = (k) => (side === 'n' ? k : H - 1 - k);
    // The coast's depth from the edge: broad lobes and bays, then a crinkle.
    const base = r.range(100, 128) * S;
    const depth = new Float32Array(W);
    for (let x = 0; x < W; x++) depth[x] = base + 38 * S * per(nA, x, 260 * S, 3) + 14 * S * per(nB, x, 70 * S, 3, 3.3);
    // How near the projects' land comes to the pole, column by column.
    const top = new Float32Array(W).fill(1e9);
    for (let x = 0; x < W; x++) for (let k = 0; k < H * 0.45; k++) if (land[yOf(k) * W + x]) { top[x] = k; break; }
    // Where it joins or nearly joins: the column of project land nearest the pole.
    let jx = -1;
    if (link !== 'apart') { let best = Infinity; for (let x = 0; x < W; x++) if (top[x] < best) { best = top[x]; jx = x; } }
    // The great forms an ice-sheet coast has, so it is not one even band along the edge: a peninsula or two reaching
    // far out where the ocean is open (much of it bare rock and tundra), and a wide embayment or two where the sea
    // runs deep into the ice, most often facing the projects' land, so the water between is a sea and not a moat.
    const gr = r.fork('great-forms');
    const pen = new Float32Array(W), bay = new Float32Array(W);
    const bump = (arr, x0, half, amount, skew) => {
      for (let dx = -Math.ceil(half * 1.6); dx <= Math.ceil(half * 1.6); dx++) {
        // (Lopsided: steeper on one flank than the other.)
        const x = ((Math.floor(x0 + dx) % W) + W) % W, u = dx / (half * (1 + 0.35 * skew * Math.sign(dx)));
        // (Broad at the root and blunt at the end, not a spike.)
        const v = amount * Math.exp(-1.5 * Math.abs(u) ** 3) * (1 + 0.22 * per(nB, x, 40 * S, 2, 5.5));
        if (v > arr[x]) arr[x] = v;
      }
    };
    const roomAt = (x0, half) => { let m = Infinity; for (let dx = -half; dx <= half; dx += 4) m = Math.min(m, Math.min(top[((Math.floor(x0 + dx) % W) + W) % W], H * 0.45)); return m; };
    const forms = [];
    const spacedFrom = (x0, gap) => forms.every((f) => Math.abs(wrapDx(x0 - f)) > gap) && (jx < 0 || Math.abs(wrapDx(x0 - jx)) > gap * 0.6);
    for (let q = 0, n = 1 + gr.int(2); q < n; q++) {
      // The peninsula: where there is most open water for it.
      let best = null;
      for (let t = 0; t < 30; t++) {
        const x0 = gr.range(0, W), half = gr.range(38, 72) * S;
        if (!spacedFrom(x0, 220 * S)) continue;
        const room = roomAt(x0, half * 1.15) - base - 22 * S;
        if (room > 40 * S && (!best || room > best.room)) best = { x0, half, room };
      }
      if (!best) break;
      bump(pen, best.x0, best.half, Math.min(gr.range(60, 100) * S, best.room), gr.range(-1, 1));
      forms.push(best.x0);
    }
    for (let q = 0, n = 1 + gr.int(2); q < n; q++) {
      // The embayment: where the projects' land comes nearest (but not at the join).
      let best = null;
      for (let t = 0; t < 30; t++) {
        const x0 = gr.range(0, W), half = gr.range(70, 130) * S;
        if (!spacedFrom(x0, 240 * S)) continue;
        const room = roomAt(x0, half * 0.6);
        if (!best || room < best.room) best = { x0, half, room };
      }
      if (!best) break;
      bump(bay, best.x0, best.half, gr.range(50, 82) * S, gr.range(-1, 1));
      forms.push(best.x0);
    }
    for (let x = 0; x < W; x++) depth[x] = Math.max(26 * S, depth[x] + pen[x] - bay[x]);
    const reach = 75 * S;
    if (jx >= 0) for (let x = 0; x < W; x++) {
      const d = Math.abs(wrapDx(x - jx));
      if (d > reach || top[x] > H) continue;
      const want = top[x] - (link === 'strait' ? 3.5 * S : 0.5 * S);
      depth[x] = Math.max(depth[x], depth[x] + (want - depth[x]) * Math.pow(smoothstep(reach, 0, d), 0.6));
    }
    // Fjords: long narrow inlets, mostly where the coast runs straight.
    const fjords = [];
    const nf = 10 + r.int(8);
    for (let f = 0; f < nf; f++) {
      const x0 = r.range(0, W);
      if (jx >= 0 && Math.abs(wrapDx(x0 - jx)) < reach + 10 * S) continue;
      fjords.push({ x0, len: r.range(10, 30) * S, w: r.range(0.7, 1.5) * S, bend: r.range(2, 6) * S * (r.chance(0.5) ? 1 : -1), lean: r.range(-0.9, 0.9), ph: r.range(0, TAU), waves: r.range(1.5, 3.5) });
    }
    const fjordAt = (x, k) => {
      for (const f of fjords) {
        const head = depth[Math.floor(((f.x0 % W) + W) % W)] - f.len;
        if (k < head || k > depth[Math.floor(((f.x0 % W) + W) % W)] + 6 * S) continue;
        const u = (k - head) / f.len; // 0 at the head, 1 at the mouth
        // Winding, and leaning off the straight line to the pole.
        const cx = f.x0 + f.lean * (k - head - f.len) + f.bend * Math.sin(u * f.waves * Math.PI + f.ph) * (1 - 0.5 * u);
        if (Math.abs(wrapDx(x - cx)) < f.w * (0.35 + 0.65 * clamp(u, 0, 1)) + 0.2 * S) return { u, f };
      }
      return null;
    };
    // Ice shelves: a few stretches of coast where the ice runs on out over the sea, filling the bays to a smooth front.
    const shelves = [];
    for (let q = 0, nq = 1 + r.int(3); q < nq; q++) shelves.push({ x0: r.range(0, W), half: r.range(40, 90) * S, out: r.range(4, 11) * S });
    const shelfDepth = new Float32Array(W);
    for (let x = 0; x < W; x++) {
      let best = 0;
      for (const sh of shelves) {
        const d = Math.abs(wrapDx(x - sh.x0));
        if (d > sh.half) continue;
        // The front: the coast's depth smoothed wide, pushed seaward, eased off at the shelf's ends, on the great
        // peninsulas, and toward the join (eased, so a shelf never ends in a straight wall).
        let sm = 0;
        for (let k = -30; k <= 30; k += 3) { const xx = ((Math.floor(x + k * S) % W) + W) % W; sm = Math.max(sm, depth[xx] - pen[xx]); }
        const ease = smoothstep(sh.half, sh.half * 0.45, d) * smoothstep(12 * S, 0, pen[x]) * (jx >= 0 ? smoothstep(reach + 10 * S, reach + 60 * S, Math.abs(wrapDx(x - jx))) : 1);
        // (A shelf fills the coast's lesser bays; it does not wall off a great embayment.)
        const front = Math.min(sm, depth[x] + 20 * S) + sh.out * (0.6 + 0.4 * per(nS, x, 25 * S, 2));
        // (Eased toward the coast itself, not toward nothing: where the ease is nil the shelf is nil.)
        best = Math.max(best, depth[x] - 2 * S + (front - depth[x] + 2 * S) * ease);
      }
      shelfDepth[x] = best;
    }
    // Islands offshore: a few large ones with their own ice caps, more small ones.
    const islands = [];
    const ni = 12 + r.int(10);
    for (let q = 0; q < ni * 3 && islands.length < ni; q++) {
      const x = r.range(0, W), big = islands.length < 4;
      const rad = (big ? r.range(6, 12) : r.range(1.2, 4)) * S;
      const k = depth[Math.floor(x)] + rad + r.range(3, big ? 24 : 34) * S;
      const y = yOf(k);
      if (y < 2 || y > H - 3) continue;
      if (dl[Math.floor(y) * W + Math.floor(x)] < rad + 9 * S) continue;
      if (islands.some((o) => Math.hypot(wrapDx(o.x - x), o.y - y) < o.rad + rad + 3 * S)) continue;
      // An irregular outline: a stretched blob, its radius worked by noise round the shore, with bays and capes.
      const ring = [], st = 1 + r.next() * 0.9, ln = r.next() * Math.PI, off = r.next() * 50;
      for (let q = 0; q < 48; q++) {
        const t = (q / 48) * TAU, rr = rad * (1 + 0.5 * fbm(nC, Math.cos(t) * 1.8 + off, Math.sin(t) * 1.8 - off, 4));
        const u = Math.cos(t) * rr * st, v = (Math.sin(t) * rr) / Math.sqrt(st);
        ring.push([u * Math.cos(ln) - v * Math.sin(ln), u * Math.sin(ln) + v * Math.cos(ln)]);
      }
      islands.push({ x, y, rad: rad * st, ring });
    }

    for (let x = 0; x < W; x++) for (let k = 0; k < H * 0.42; k++) {
      const y = yOf(k), i = y * W + x;
      const crinkle = 5 * S * seam(nC, x, k, 9 * S, 4);
      const fj = fjordAt(x, k);
      let on = k < depth[x] + crinkle && !fj;
      if (!on && !fj && k < shelfDepth[x] + 1.5 * S * seam(nS, x, k, 6 * S, 2)) { on = true; shelf[i] = 1; }
      if (!on) for (const o of islands) { const dx = wrapDx(x + 0.5 - o.x), dy = y + 0.5 - o.y; if (Math.abs(dx) < o.rad * 2 && Math.abs(dy) < o.rad * 2 && inRing(o.ring, dx, dy)) { on = true; break; } }
      if (!on) continue;
      // Keep off the projects' land, but for the join; a strait stays open.
      const gap = jx >= 0 && Math.abs(wrapDx(x - jx)) < reach ? (link === 'strait' ? 2.5 * S : 0) : 8 * S;
      if (land[i] || dl[i] < gap) { shelf[i] = 0; continue; }
      all[i] = 1;
    }
    // The isthmus: a neck of land from the polar coast to the project land, a few units wide.
    if (link === 'isthmus' && jx >= 0) {
      const wNeck = r.range(7, 13) * S;
      for (let k = 0; k <= top[jx] + 2; k++) {
        const cx = jx + 3 * S * Math.sin(k / (9 * S));
        const hw = wNeck * (0.75 + 0.5 * smoothstep(top[jx] - 10 * S, top[jx], k)) * (1 + 0.15 * seam(nC, jx, k, 4 * S, 2));
        for (let x = Math.floor(cx - hw - 1); x <= cx + hw + 1; x++) {
          const xx = ((x % W) + W) % W, i = yOf(k) * W + xx;
          if (Math.abs(x + 0.5 - cx) <= hw && !land[i]) { all[i] = 1; shelf[i] = 0; }
        }
      }
    }
    meta.push({ side, kOf, yOf, depth, jx, fjordAt, base, pen });
  }
  // Seamless at the wrap: the last column repeats the first's neighbour pattern exactly.
  for (let y = 0; y < H; y++) { all[y * W + W - 1] = all[y * W]; shelf[y * W + W - 1] = shelf[y * W]; }
  // Drop specks.
  {
    const seen = new Uint8Array(N), stack = [];
    for (let s = 0; s < N; s++) {
      if (!all[s] || seen[s]) continue;
      const comp = [];
      seen[s] = 1; stack.push(s);
      while (stack.length) {
        const i = stack.pop(), x = i % W; comp.push(i);
        for (const j of [x > 0 ? i - 1 : i + W - 1, x < W - 1 ? i + 1 : i - W + 1, i - W, i + W]) if (j >= 0 && j < N && all[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
      }
      if (comp.length < 5) for (const i of comp) { all[i] = 0; shelf[i] = 0; }
    }
  }
  // Distance from each polar pixel to open sea (shelves count as ice, so a coast behind a shelf has no fringe).
  const sea = new Uint8Array(N);
  for (let i = 0; i < N; i++) sea[i] = all[i] || land[i] ? 0 : 1;
  const dSea = landDistance(sea, W, H);

  // The habitable fringe near an isthmus goes to the project land.
  for (const m of meta) {
    if (link !== 'isthmus' || m.jx < 0) continue;
    const jy = m.yOf(Math.max(0, m.depth[m.jx] - 2));
    const R = r.range(40, 70) * S;
    for (let i = 0; i < N; i++) {
      if (!all[i] || shelf[i]) continue;
      const x = i % W, y = (i / W) | 0;
      const d = Math.hypot(wrapDx(x - m.jx), y - jy);
      const neck = Math.abs(wrapDx(x - m.jx)) < 10 * S && m.kOf(y) > m.depth[m.jx] - 6 * S;
      if (neck || (d < R && dSea[i] < fringeWidth(x, y) * 0.9)) claim[i] = 1;
    }
  }
  for (let i = 0; i < N; i++) ice[i] = all[i] && !claim[i] ? 1 : 0;

  // ---- The cover: fringe, glaciers, nunataks, and ice. ----
  function fringeWidth(x, y) {
    // Long stretches of the coast are ice to the water's edge, as most of an ice sheet's coast is; between them the
    // bare fringe runs from a sliver to some 13 units (wider still on the great peninsulas, which the ice leaves
    // largely bare), and is nil again where an outlet glacier reaches the sea.
    let penHere = 0;
    for (const m of meta) if ((m.side === 'n') === (y < H / 2)) penHere = m.pen[clamp(Math.floor(x), 0, W - 1)];
    const icy = penHere > 8 * S ? 0 : smoothstep(0.0, -0.22, per(nF, x, 150 * S, 2, 4.4 + y * 0.0005));
    const w = (2.6 * S + 10.5 * S * smoothstep(-0.3, 0.4, per(nF, x, 60 * S, 3, 1.7 + y * 0.0007)) + 0.17 * penHere) * (1 - icy);
    // (Outlets are patches along the coast, not columns, so an island is never striped.)
    const outlet = seam(nO, x, y, 7 * S, 2);
    return outlet > 0.4 ? 0 : w * smoothstep(0.4, 0.22, outlet);
  }
  const bil = (F, x, y) => {
    const fx = clamp(x - 0.5, 0, W - 1.001), fy = clamp(y - 0.5, 0, H - 1.001);
    const ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy, k = iy * W + ix;
    return F[k] * (1 - u) * (1 - v) + F[k + 1] * u * (1 - v) + F[k + W] * (1 - u) * v + F[k + W + 1] * u * v;
  };
  // Within reach of the polar land (so the picture's edge runs a little out to sea under the vector coast).
  const near = landDistance(all, W, H);
  const cover = (mx, my) => {
    const i = clamp(Math.floor(my), 0, H - 1) * W + clamp(Math.floor(mx), 0, W - 1);
    if (near[i] > 2.5) return -1;
    if (!all[i] && land[i]) return -1;
    if (shelf[i]) return COVER.SNOW;
    const dc = bil(dSea, mx, my) - 0.5;
    const fw = fringeWidth(mx, my);
    // Fjord heads: the glacier comes down to the water.
    let head = false;
    for (const m of meta) { const f = m.fjordAt(mx, m.kOf(my) - 2.5 * S); if (f && f.u < 0.25) head = true; }
    if (dc < fw && !head) {
      const t = seam(nT, mx, my, 9 * S, 3) + 0.4 * per(nF, mx, 120 * S, 2, 9.1) + 0.25 * smoothstep(fw, 0, dc) - 0.15;
      return t > 0.05 ? COVER.GRASS : COVER.ROCK;
    }
    // Nunataks: rock through the ice, most near the coast, a few far in.
    const nu = seam(nN, mx, my, 8 * S, 3) + 0.45 * seam(nN, mx + 400, my, 30 * S, 2);
    const nearCoast = smoothstep(fw + 26 * S, fw + 2 * S, dc);
    if (nu > 0.74 - 0.3 * nearCoast) return COVER.ROCK;
    return COVER.SNOW;
  };
  return { ice, claim, shelf, all, cover, sides };
}

// The About island, in a different setting in each world.
export const ABOUT_KINDS = ['volcano', 'atoll', 'crescent', 'fjord', 'lake', 'lighthouse', 'causeway', 'ferry'];

// placeAbout({ land, ice, lakes, width, height, rng, kind }) => { kind, x, y (the dot), r, rings (land), holes (water
// within it), mask, cover: (x, y) => class or -1, causeway, lighthouse, dock } or null
export function placeAbout({ land, ice, lakes = null, width, height, rng, kind = 'volcano', temp = null }) {
  const W = width, H = height, N = W * H, S = W / 1600;
  const r = rng.fork('about');
  const all = new Uint8Array(N);
  for (let i = 0; i < N; i++) all[i] = land[i] || (ice && ice[i]) ? 1 : 0;
  const dl = landDistance(all, W, H);
  const TAU = Math.PI * 2;
  const n1 = makeNoise(r.fork('about-shape')), n2 = makeNoise(r.fork('about-cover'));

  // ---- Where. ----
  let site = null;
  if (kind === 'lake' && lakes) {
    // The largest lake wide enough for an island well inside it.
    const dw = landDistance(Uint8Array.from(lakes, (v) => (v ? 0 : 1)), W, H);
    let best = null;
    for (let y = 60 * S; y < H - 60 * S; y += 2) for (let x = 60 * S; x < W - 60 * S; x += 2) {
      const i = Math.floor(y) * W + Math.floor(x);
      if (!lakes[i]) continue;
      if (!best || dw[i] > best.d) best = { x: Math.floor(x) + 0.5, y: Math.floor(y) + 0.5, d: dw[i] };
    }
    if (best && best.d > 7 * S) site = { x: best.x, y: best.y, room: best.d };
    else kind = 'lighthouse';
  }
  if (!site) {
    const [lo, hi, want] = { causeway: [8, 13, 10], ferry: [16, 34, 22], lighthouse: [12, 30, 18] }[kind] || [26, 70, 38];
    const cands = [];
    for (let y = 90 * S; y < H - 90 * S; y += 4 * S) for (let x = 110 * S; x < W - 110 * S; x += 4 * S) {
      const d = dl[Math.floor(y) * W + Math.floor(x)];
      if (d < lo * S || d > hi * S) continue;
      const score = -Math.abs(d - want * S) - 0.05 * Math.hypot(x - W / 2, (y - H / 2) * 1.6) + r.next() * 18 * S;
      cands.push({ x, y, score });
    }
    cands.sort((a, b) => b.score - a.score || a.y - b.y || a.x - b.x);
    if (!cands[0]) return null;
    site = { x: cands[0].x, y: cands[0].y, room: dl[Math.floor(cands[0].y) * W + Math.floor(cands[0].x)] };
  }
  const { x: cx, y: cy } = site;
  const cold = temp ? temp[Math.floor(cy) * W + Math.floor(cx)] < 4 : false;

  // ---- What shape. ----
  const rings = [], holes = [];
  let rad = 6.5 * S, dot = [cx, cy];
  const extra = {};
  const wobble = (ring, amt, sc) => ring.map(([x, y]) => { const a = Math.atan2(y - cy, x - cx); const k = 1 + amt * fbm(n1, Math.cos(a) * sc + 3, Math.sin(a) * sc - 2, 3); return [cx + (x - cx) * k, cy + (y - cy) * k]; });
  const circle = (x, y, rr, n = 48, amt = 0, sc = 1.5, stretch = 1, lean = 0) => {
    const out = [];
    for (let q = 0; q < n; q++) {
      const t = (q / n) * TAU, k = 1 + amt * fbm(n1, Math.cos(t) * sc + x * 0.01, Math.sin(t) * sc + y * 0.01, 3);
      const u = Math.cos(t) * rr * k * stretch, v = Math.sin(t) * rr * k;
      out.push([x + u * Math.cos(lean) - v * Math.sin(lean), y + u * Math.sin(lean) + v * Math.cos(lean)]);
    }
    return out;
  };
  switch (kind) {
    case 'volcano': {
      rad = r.range(5.5, 7) * S;
      rings.push(circle(cx, cy, rad, 60, 0.12, 1.2, 1 + r.next() * 0.25, r.next() * Math.PI));
      const cr = r.range(1, 1.5) * S, off = r.range(0, 0.8) * S, a = r.next() * TAU;
      holes.push(circle(cx + Math.cos(a) * off, cy + Math.sin(a) * off, cr, 28, 0.08, 2));
      extra.crater = [cx + Math.cos(a) * off, cy + Math.sin(a) * off, cr];
      dot = [cx + Math.cos(a + Math.PI) * rad * 0.55, cy + Math.sin(a + Math.PI) * rad * 0.55];
      break;
    }
    case 'atoll': {
      rad = r.range(7, 9.5) * S;
      const lean = r.next() * Math.PI, st = 1 + r.next() * 0.35, rim = r.range(1.3, 1.9) * S;
      const passes = [];
      for (let q = 0, nq = 2 + r.int(3); q < nq; q++) passes.push({ a: r.next() * TAU, w: r.range(0.05, 0.16) });
      // The rim, cut into islets by the passes: each islet a ring of its own.
      const K = 120, pt = (t, rr) => { const k = 1 + 0.1 * fbm(n1, Math.cos(t) * 1.3, Math.sin(t) * 1.3, 3); const u = Math.cos(t) * rr * k * st, v = Math.sin(t) * rr * k; return [cx + u * Math.cos(lean) - v * Math.sin(lean), cy + u * Math.sin(lean) + v * Math.cos(lean)]; };
      const cut = (t) => passes.some((p) => Math.abs(((t - p.a + 3 * Math.PI) % TAU) - Math.PI) < p.w);
      let run = [];
      const flush = () => {
        if (run.length >= 3) {
          // Islets swell here and there.
          const outer = run.map((t) => pt(t, rad + rim * (0.5 + 0.9 * Math.max(0, fbm(n2, Math.cos(t) * 4, Math.sin(t) * 4, 2)))));
          const inner = run.map((t) => pt(t, rad - rim * 0.5)).reverse();
          rings.push([...outer, ...inner]);
        }
        run = [];
      };
      let start = 0;
      while (start < K && !cut((start / K) * TAU)) start++;
      for (let q = 0; q <= K; q++) { const t = ((start + q) / K) * TAU; if (cut(t)) flush(); else run.push(t); }
      flush();
      // The largest islet carries the dot.
      let big = rings[0], ba = 0;
      for (const g of rings) { const a = ringArea(g); if (a > ba) { ba = a; big = g; } }
      // (Half way across the islet, at the middle of its length.)
      const h = big.length >> 1, a1 = big[h >> 1], a2 = big[big.length - 1 - (h >> 1)];
      dot = [(a1[0] + a2[0]) / 2, (a1[1] + a2[1]) / 2];
      extra.lagoon = circle(cx, cy, rad - rim * 0.5, 60, 0.1, 1.3, st, lean);
      break;
    }
    case 'crescent': {
      rad = r.range(6, 8) * S;
      const a0 = r.next() * TAU, sweep = r.range(3.2, 4.4), th = r.range(1.6, 3) * S;
      const outer = [], inner = [];
      for (let q = 0; q <= 50; q++) {
        const t = a0 + (sweep * q) / 50, taper = Math.pow(Math.sin((Math.PI * q) / 50), 0.6);
        const k = 1 + 0.06 * fbm(n1, Math.cos(t) * 2, Math.sin(t) * 2, 3);
        outer.push([cx + Math.cos(t) * (rad + th * 0.5 * taper) * k, cy + Math.sin(t) * (rad + th * 0.5 * taper) * k]);
        inner.push([cx + Math.cos(t) * (rad - th * 0.5 * taper) * k, cy + Math.sin(t) * (rad - th * 0.5 * taper) * k]);
      }
      rings.push([...outer, ...inner.reverse()]);
      const tm = a0 + sweep / 2;
      dot = [cx + Math.cos(tm) * rad, cy + Math.sin(tm) * rad];
      break;
    }
    case 'fjord': {
      rad = r.range(6, 8) * S;
      const K = 140, fj = [];
      for (let q = 0, nq = 3 + r.int(3); q < nq; q++) fj.push({ a: r.next() * TAU, w: r.range(0.06, 0.1), d: r.range(0.55, 0.8) });
      const ring = [];
      for (let q = 0; q < K; q++) {
        const t = (q / K) * TAU;
        let rr = rad * (1 + 0.22 * fbm(n1, Math.cos(t) * 2.2, Math.sin(t) * 2.2, 4));
        for (const f of fj) { const da = Math.abs(((t - f.a + 3 * Math.PI) % TAU) - Math.PI); if (da < f.w * 2.5) rr *= 1 - f.d * Math.pow(1 - da / (f.w * 2.5), 0.7); }
        ring.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr * 0.85]);
      }
      rings.push(ring);
      break;
    }
    case 'lake': {
      rad = Math.min(site.room * 0.45, 4.5 * S);
      rings.push(circle(cx, cy, rad, 40, 0.25, 1.8, 1 + r.next() * 0.5, r.next() * Math.PI));
      break;
    }
    case 'lighthouse': case 'causeway': case 'ferry': {
      rad = r.range(4.5, 6.5) * S;
      rings.push(circle(cx, cy, rad, 56, 0.28, 1.7, 1 + r.next() * 0.6, r.next() * Math.PI));
      break;
    }
  }
  // The nearest project land, for the causeway, the ferry, and which way the island faces.
  let shore = null;
  {
    let best = Infinity;
    for (let y = Math.floor(cy - 50 * S); y <= cy + 50 * S; y++) for (let x = Math.floor(cx - 50 * S); x <= cx + 50 * S; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H || !land[y * W + x] || (lakes && lakes[y * W + x])) continue;
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d < best) { best = d; shore = [x + 0.5, y + 0.5]; }
    }
  }
  const inLand = (x, y) => rings.some((g) => inRing(g, x, y)) && !holes.some((g) => inRing(g, x, y));
  // The island's edge on the way to a point.
  const edgeToward = (p) => {
    const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1;
    let t = 0;
    while (t < l && inLand(cx + (dx / l) * t, cy + (dy / l) * t)) t += 0.1 * S;
    return [cx + (dx / l) * (t - 0.3 * S), cy + (dy / l) * (t - 0.3 * S)];
  };
  if (kind === 'causeway' && shore) {
    // Straight across the shallows to the coast, a road on an embankment.
    const a = edgeToward(shore), dx = shore[0] - a[0], dy = shore[1] - a[1], l = Math.hypot(dx, dy) || 1;
    extra.causeway = [a, [shore[0] - (dx / l) * 0.2 * S, shore[1] - (dy / l) * 0.2 * S]];
  }
  if (kind === 'lighthouse' || kind === 'causeway' || kind === 'ferry') {
    // A little town on the side facing the mainland, and a lighthouse on the far point.
    const toward = shore ? Math.atan2(shore[1] - cy, shore[0] - cx) : r.next() * TAU;
    const tp = edgeToward([cx + Math.cos(toward) * 40 * S, cy + Math.sin(toward) * 40 * S]);
    extra.town = [cx + (tp[0] - cx) * 0.55, cy + (tp[1] - cy) * 0.55, rad * 0.42];
    extra.dock = tp;
    const lp = edgeToward([cx - Math.cos(toward) * 40 * S, cy - Math.sin(toward) * 40 * S]);
    extra.lighthouse = lp;
    dot = [cx + (lp[0] - cx) * 0.25, cy + (lp[1] - cy) * 0.25];
  }

  const mask = new Uint8Array(N);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const g of rings) for (const [x, y] of g) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(x0); x <= x1; x++) if (x >= 0 && y >= 0 && x < W && y < H && inLand(x + 0.5, y + 0.5) && (kind === 'lake' || !land[y * W + x])) mask[y * W + x] = 1;

  // ---- What it is made of. ----
  const cover = (mx, my) => {
    const d = Math.hypot(mx - cx, my - cy);
    if (d > rad * 1.7 + 4 * S) return -1;
    const pi = clamp(Math.floor(my), 0, H - 1) * W + clamp(Math.floor(mx), 0, W - 1);
    if (kind === 'lake' ? !mask[pi] && d > rad + 1.5 * S : land[pi]) return -1;
    const n = fbm(n2, mx / (1.2 * S), my / (1.2 * S), 3);
    if (extra.town && Math.hypot(mx - extra.town[0], my - extra.town[1]) < extra.town[2] * (1 + 0.35 * n)) return COVER.URBAN;
    switch (kind) {
      case 'volcano': {
        const [kx, ky, kr] = extra.crater;
        const dk = Math.hypot(mx - kx, my - ky);
        if (dk < kr + 1.3 * S + 0.4 * S * n) return COVER.ROCK;
        if (dk < kr + 2.6 * S + 0.8 * S * n) return n > 0.15 ? COVER.ROCK : COVER.WOODLAND;
        return n > 0.3 ? COVER.WOODLAND : n < -0.45 ? COVER.SAND : COVER.FOREST;
      }
      case 'atoll': return n > 0.12 ? COVER.WOODLAND : n > -0.15 ? COVER.GRASS : COVER.SAND;
      case 'crescent': return Math.abs(d - rad) < 0.5 * S && n < 0 ? COVER.SAND : n > 0.25 ? COVER.FOREST : COVER.WOODLAND;
      case 'fjord': return d < rad * 0.4 + S * n && cold ? COVER.SNOW : n > 0.1 ? COVER.ROCK : COVER.GRASS;
      default: return n > 0.35 ? COVER.FOREST : n > -0.2 ? COVER.WOODLAND : COVER.GRASS;
    }
  };
  return { kind, x: dot[0], y: dot[1], cx, cy, r: rad, rings, holes, mask, cover, ...extra };
}

export { landDistance };

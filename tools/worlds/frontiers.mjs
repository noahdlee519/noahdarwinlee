// Borders with history in them, after the shapes real borders take:
//
//   ribbon     a long, thin country down a coast (a strip of its neighbour's shore, its own interior given back)
//   corridor   a panhandle: a narrow strip down the line between two neighbours, from a third country to the sea or
//              to a great river (as the Caprivi Strip reaches the Zambezi)
//   island     an island shared by two countries, the line across it surveyed straight or left irregular
//   lake       a border through a lake, on the line halfway between its shores
//   town jog   a border that steps out round a town the other side holds
//   river jog  a border that follows a river but cuts across the neck of one of its bends, the river having moved
//
// Each is tried as a change to the map of owners and kept only if it leaves every country in as many pieces as
// before (the flagships' main bodies whole), the flagships in their order of size and larger than every small
// country, each capital in its own country, and CHRONIA beside UCHRONIA if it was. Countries with provinces
// (Dealdesk) are left alone.

import { clamp, makeNoise } from './rng.mjs';
import { landmasses } from './terrain.mjs';

const N4 = (i, W, N) => { const x = i % W; return [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W >= 0 ? i - W : -1, i + W < N ? i + W : -1]; };

// How many 4-connected pieces country k has.
export function piecesOf(owner, k, W, H) {
  const N = W * H, seen = new Uint8Array(N), stack = new Int32Array(N);
  let n = 0;
  for (let s = 0; s < N; s++) {
    if (owner[s] !== k || seen[s]) continue;
    n++;
    let top = 0;
    stack[top++] = s; seen[s] = 1;
    while (top) {
      const i = stack[--top], x = i % W;
      if (x > 0 && !seen[i - 1] && owner[i - 1] === k) { seen[i - 1] = 1; stack[top++] = i - 1; }
      if (x < W - 1 && !seen[i + 1] && owner[i + 1] === k) { seen[i + 1] = 1; stack[top++] = i + 1; }
      if (i >= W && !seen[i - W] && owner[i - W] === k) { seen[i - W] = 1; stack[top++] = i - W; }
      if (i + W < N && !seen[i + W] && owner[i + W] === k) { seen[i + W] = 1; stack[top++] = i + W; }
    }
  }
  return n;
}

// The length of the border two countries share, in pixel edges.
export function sharedBorder(owner, a, b, W, H) {
  let n = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, o = owner[i];
    if (o !== a && o !== b) continue;
    if (x < W - 1) { const p = owner[i + 1]; if ((o === a && p === b) || (o === b && p === a)) n++; }
    if (y < H - 1) { const p = owner[i + W]; if ((o === a && p === b) || (o === b && p === a)) n++; }
  }
  return n;
}

// A change to the owners, undone if it fails the checks.
function makeCtx({ owner, land, W, H, projects, nations }) {
  const N = W * H, areas = nations.areas;
  const idOf = (k) => projects[k].id;
  const flags = projects.map((p, k) => k).filter((k) => projects[k].tier === 'flagship').sort((a, b) => projects[a].rank - projects[b].rank);
  const smalls = projects.map((p, k) => k).filter((k) => projects[k].tier !== 'flagship');
  const free = (k) => k >= 0 && !projects[k].provinces;
  // Braidable and the portfolio have shapes of their own (see shapes.mjs), kept whole.
  const shaped = (k) => k >= 0 && (projects[k].id === 'braidable' || projects[k].id === 'portfolio');
  const ch = projects.findIndex((p) => p.id === 'chronia'), uch = projects.findIndex((p) => p.id === 'uchronia');
  const pair0 = ch >= 0 && uch >= 0 ? sharedBorder(owner, ch, uch, W, H) : 0;
  const log = [];
  const touched = new Set();
  const ctx = {
    owner, land, W, H, N, projects, nations, areas, flags, smalls, free, shaped, idOf, ch, uch,
    set(i, k) { const o = owner[i]; if (o === k) return; log.push(i, o); owner[i] = k; if (o >= 0) areas[o]--; if (k >= 0) areas[k]++; touched.add(o); touched.add(k); },
    begin() { log.length = 0; touched.clear(); const pieces = new Map(); return { pieces }; },
    pieces0: new Map(),
    snapshot(ks) { const m = new Map(); for (const k of ks) if (k >= 0) m.set(k, piecesOf(owner, k, W, H)); return m; },
    revert() { for (let j = log.length - 2; j >= 0; j -= 2) { const i = log[j], o = log[j + 1], k = owner[i]; owner[i] = o; if (k >= 0) areas[k]--; if (o >= 0) areas[o]++; } log.length = 0; touched.clear(); },
    // The checks every change must pass. allow: extra pieces allowed per country.
    ok(before, allow = {}) {
      for (const [k, n] of before) if (piecesOf(owner, k, W, H) > n + (allow[k] || 0)) return false;
      for (let f = 1; f < flags.length; f++) if (areas[flags[f - 1]] < areas[flags[f]] * 1.025) return false;
      const least = areas[flags[flags.length - 1]];
      for (const s of smalls) if (areas[s] > least * 0.97) return false;
      for (const c of nations.capitals) { const k = projects.findIndex((p) => p.id === c.id), i = Math.floor(c.y) * W + Math.floor(c.x); if (owner[i] !== k) return false; }
      if (pair0 >= 12 && touched.has(ch) && touched.has(uch) && sharedBorder(owner, ch, uch, W, H) < Math.min(12, pair0 * 0.5)) return false;
      return true;
    },
  };
  return ctx;
}

// The pixels of country k's piece that holds pixel s.
function pieceAt(owner, s, W, N) {
  const k = owner[s], out = [], seen = new Uint8Array(N);
  const stack = [s]; seen[s] = 1;
  while (stack.length) {
    const i = stack.pop(); out.push(i);
    for (const j of N4(i, W, N)) if (j >= 0 && !seen[j] && owner[j] === k) { seen[j] = 1; stack.push(j); }
  }
  return out;
}

// The principal axes of a set of pixels: centre, unit major axis, and the spreads along and across it.
export function axesOf(pixels, W) {
  let mx = 0, my = 0;
  for (const i of pixels) { mx += i % W; my += (i / W) | 0; }
  mx /= pixels.length; my /= pixels.length;
  let sxx = 0, syy = 0, sxy = 0;
  for (const i of pixels) { const dx = (i % W) - mx, dy = ((i / W) | 0) - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy), ux = Math.cos(th), uy = Math.sin(th);
  let a = 0, b = 0;
  for (const i of pixels) { const dx = (i % W) - mx, dy = ((i / W) | 0) - my, t = dx * ux + dy * uy, s = -dx * uy + dy * ux; a += t * t; b += s * s; }
  return { cx: mx + 0.5, cy: my + 0.5, ux, uy, sa: Math.sqrt(a / pixels.length), sb: Math.sqrt(b / pixels.length) };
}

// ---------------------------------------------------------------- ribbon --

function ribbon(ctx, r, dist, lakes) {
  const { owner, W, H, N, projects, nations, areas, smalls, flags, free } = ctx;
  const S = W / 1600;
  for (const s of r.shuffle(smalls.slice())) {
    if (!free(s) || ctx.shaped(s)) continue;
    // Its flagship neighbour with the longest shared border.
    let F = -1, best = 0;
    for (const f of flags) { if (!free(f)) continue; const n = sharedBorder(owner, s, f, W, H); if (n > best) { best = n; F = f; } }
    if (F < 0 || best < 30 * S) continue;
    const D = clamp(Math.round(Math.sqrt(areas[s] / 18)), Math.round(8 * S), Math.round(14 * S));
    // Some 15 to 25 times as long as it is wide.
    const T = Math.min(areas[s], D * D * r.range(15, 25));
    const capOf = (k) => nations.capitals.find((c) => c.id === projects[k].id);
    const others = nations.capitals.filter((c) => c.id !== projects[s].id);
    const nearCap = (i) => { const x = i % W, y = (i / W) | 0; return others.some((c) => Math.abs(c.x - x) < 10 * S && Math.abs(c.y - y) < 10 * S); };
    const band = (i) => ctx.land[i] && dist[i] <= D && (owner[i] === s || owner[i] === F) && !nearCap(i) && (i % W) > 12 && (i % W) < W - 12;
    const seeds = [];
    for (let i = 0; i < N; i++) if (owner[i] === s && dist[i] <= D && band(i)) seeds.push(i);
    if (seeds.length < T * 0.06) continue;
    // Out along the coast from the country's own shore.
    const seen = new Uint8Array(N), order = [], q = seeds.slice();
    for (const i of seeds) seen[i] = 1;
    let head = 0;
    while (head < q.length && order.length < T) {
      const i = q[head++];
      order.push(i);
      for (const j of N4(i, W, N)) if (j >= 0 && !seen[j] && band(j)) { seen[j] = 1; q.push(j); }
    }
    if (order.length < T * 0.5) continue;
    const ax = axesOf(order, W);
    const mine = new Uint8Array(N);
    for (const i of order) mine[i] = 1;
    // Thin: as much edge as a strip D wide (a lump of the same area has far less).
    let edge = 0;
    for (const i of order) if (N4(i, W, N).some((j) => j < 0 || !mine[j])) edge++;
    if (edge < (1.25 * order.length) / D) continue;
    const before = ctx.snapshot([s, F]);
    ctx.begin();
    for (const i of order) ctx.set(i, s);
    // The country's old interior, on that landmass, goes to the flagship.
    const mass = landmasses(ctx.land, W, H);
    const m0 = mass.id[seeds[0]];
    for (let i = 0; i < N; i++) if (owner[i] === s && !mine[i] && mass.id[i] === m0) ctx.set(i, F);
    // Bits of the flagship's coast cut off from it by the strip join the strip.
    const fc = capOf(F);
    const keep = new Uint8Array(N);
    for (const i of pieceAt(owner, Math.floor(fc.y) * W + Math.floor(fc.x), W, N)) keep[i] = 1;
    for (let i = 0; i < N; i++) if (owner[i] === F && !keep[i] && mass.id[i] === m0) ctx.set(i, s);
    // The capital: on the shore, where the strip began.
    const cap = capOf(s);
    const ci = Math.floor(cap.y) * W + Math.floor(cap.x);
    let moved = null;
    if (owner[ci] !== s) {
      let bi = -1, bs = -Infinity;
      for (const i of seeds) { if (owner[i] !== s || dist[i] > 2 || lakes[i]) continue; const sc = -Math.hypot((i % W) - cap.x, ((i / W) | 0) - cap.y) * 0.05 + r.next(); if (sc > bs) { bs = sc; bi = i; } }
      if (bi < 0) { ctx.revert(); continue; }
      moved = [cap.x, cap.y];
      cap.x = (bi % W) + 0.5; cap.y = ((bi / W) | 0) + 0.5;
    }
    if (!ctx.ok(before)) { ctx.revert(); if (moved) [cap.x, cap.y] = moved; continue; }
    return { kind: 'ribbon', of: projects[s].id, along: projects[F].id, width: D, length: Math.round(order.length / D) };
  }
  return null;
}

// -------------------------------------------------------------- corridor --

function corridor(ctx, r, riverClass) {
  const { owner, W, H, N, projects, free, ch, uch } = ctx;
  const S = W / 1600;
  // Pairs of neighbours with a long border.
  const pairs = new Map();
  for (let i = 0; i < N; i++) {
    const a = owner[i];
    if (!free(a)) continue;
    for (const j of [i % W < W - 1 ? i + 1 : -1, i + W < N ? i + W : -1]) {
      const b = j >= 0 ? owner[j] : -1;
      if (!free(b) || b === a) continue;
      const key = Math.min(a, b) * 64 + Math.max(a, b);
      pairs.set(key, (pairs.get(key) || 0) + 1);
    }
  }
  const list = r.shuffle([...pairs.entries()].filter(([key, n]) => n >= 40 * S && !(Math.min(ch, uch) * 64 + Math.max(ch, uch) === key)).map(([key]) => [key >> 6, key & 63]).sort((p, q) => p[0] - q[0] || p[1] - q[1]));
  for (const [B, C] of list) {
    if (ctx.shaped(B) || ctx.shaped(C)) continue;
    // The band either side of their border.
    const E = new Uint8Array(N);
    let count = 0;
    for (let i = 0; i < N; i++) {
      const o = owner[i];
      if (o !== B && o !== C) continue;
      const other = o === B ? C : B;
      for (const j of N4(i, W, N)) if (j >= 0 && owner[j] === other) { E[i] = 1; count++; break; }
    }
    if (count < 60) continue;
    const near = (i, test) => { const x = i % W, y = (i / W) | 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; if (test(yy * W + xx)) return true; } return false; };
    // From where it meets the sea (or a great river), back along the border.
    const toRiver = r.chance(0.3);
    const parent = new Int32Array(N).fill(-2), depth = new Int32Array(N);
    const q = [];
    for (let i = 0; i < N; i++) if (E[i] && near(i, (j) => !ctx.land[j] || (toRiver && riverClass[j] >= 3))) { parent[i] = -1; q.push(i); }
    if (!q.length) continue;
    let head = 0;
    const starts = [];
    while (head < q.length) {
      const i = q[head++], x = i % W;
      if (depth[i] >= 55 * S && depth[i] <= 170 * S && near(i, (j) => free(owner[j]) && owner[j] !== B && owner[j] !== C)) starts.push(i);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const xx = x + dx, j = i + dy * W + dx;
        if (xx < 0 || xx >= W || j < 0 || j >= N || !E[j] || parent[j] !== -2) continue;
        parent[j] = i; depth[j] = depth[i] + 1; q.push(j);
      }
    }
    for (const st of r.shuffle(starts).slice(0, 4)) {
      // The third country, at the corridor's root.
      let A = -1;
      near(st, (j) => { const o = owner[j]; if (free(o) && o !== B && o !== C) { A = o; return true; } return false; });
      if (A < 0 || ctx.shaped(A)) continue;
      const path = [];
      for (let i = st; i >= 0; i = parent[i]) path.push(i);
      const h = r.range(2.2, 3.2) * S, R = Math.ceil(h);
      const before = ctx.snapshot([A, B, C]);
      ctx.begin();
      for (const p of path) {
        const px = p % W, py = (p / W) | 0;
        for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
          if (dx * dx + dy * dy > h * h) continue;
          const xx = px + dx, yy = py + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const j = yy * W + xx;
          if (owner[j] === B || owner[j] === C) ctx.set(j, A);
        }
      }
      if (!ctx.ok(before)) { ctx.revert(); continue; }
      const e = path[path.length - 1];
      return { kind: 'corridor', of: projects[A].id, between: [projects[B].id, projects[C].id], to: toRiver && ctx.land[e] ? 'river' : 'sea', length: path.length, x: (st % W) + 0.5, y: ((st / W) | 0) + 0.5, ex: (e % W) + 0.5, ey: ((e / W) | 0) + 0.5 };
    }
  }
  return null;
}

// ---------------------------------------------------------------- island --

function shareIsland(ctx, r) {
  const { owner, W, H, N, projects, nations, free } = ctx;
  const S = W / 1600;
  const mass = landmasses(ctx.land, W, H);
  const byMass = new Map();
  for (let i = 0; i < N; i++) { const m = mass.id[i]; if (m < 0) continue; let e = byMass.get(m); if (!e) byMass.set(m, (e = { px: [], owners: new Set() })); e.px.push(i); e.owners.add(owner[i]); }
  const cands = [...byMass.entries()].filter(([m, e]) => e.px.length >= 350 * S * S && e.px.length <= 6000 * S * S && e.owners.size === 1).sort((p, q) => p[0] - q[0]);
  for (const [, e] of r.shuffle(cands)) {
    const X = owner[e.px[0]];
    if (!free(X) || ctx.shaped(X)) continue;
    const ax = axesOf(e.px, W);
    if (ax.cx < 20 || ax.cx > W - 20) continue;
    // The nearest land of another country, across the water.
    let Y = -1, yx = 0, yy = 0;
    for (let rad = 6; rad < 90 * S && Y < 0; rad += 2) for (let a = 0; a < 48 && Y < 0; a++) {
      const x = Math.floor(ax.cx + Math.cos((a / 48) * Math.PI * 2) * (rad + ax.sa * 1.5)), y = Math.floor(ax.cy + Math.sin((a / 48) * Math.PI * 2) * (rad + ax.sa * 1.5));
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const o = owner[y * W + x];
      if (free(o) && !ctx.shaped(o) && o !== X && mass.id[y * W + x] !== mass.id[e.px[0]]) { Y = o; yx = x; yy = y; }
    }
    if (Y < 0) continue;
    let dx = yx - ax.cx, dy = yy - ax.cy;
    const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    // Surveyed (along a meridian or a parallel) or an old irregular line.
    const surveyed = r.chance(0.55);
    if (surveyed) { if (Math.abs(dx) > Math.abs(dy)) { dx = Math.sign(dx); dy = 0; } else { dy = Math.sign(dy); dx = 0; } }
    const noise = makeNoise(r.fork('island-line'));
    const proj = e.px.map((i) => { const x = (i % W) + 0.5 - ax.cx, y = ((i / W) | 0) + 0.5 - ax.cy, t = x * dx + y * dy, s = -x * dy + y * dx; return t + (surveyed ? 0 : 3.2 * S * noise(s / (9 * S), 0.5)); });
    const sorted = proj.slice().sort((a, b) => b - a);
    const share = r.range(0.32, 0.47), cut = sorted[Math.floor(sorted.length * share)];
    const cap = nations.capitals.find((c) => c.id === projects[X].id);
    const before = ctx.snapshot([X, Y]);
    ctx.begin();
    e.px.forEach((i, k) => { if (proj[k] > cut) ctx.set(i, Y); });
    if (cap && owner[Math.floor(cap.y) * W + Math.floor(cap.x)] !== X) { ctx.revert(); continue; }
    if (!ctx.ok(before, { [Y]: 1 }) || piecesOf(owner, Y, W, H) !== before.get(Y) + 1) { ctx.revert(); continue; }
    return { kind: 'island', of: [projects[X].id, projects[Y].id], line: surveyed ? 'surveyed' : 'irregular', x: Math.round(ax.cx), y: Math.round(ax.cy), area: e.px.length };
  }
  return null;
}

// ------------------------------------------------------------------ lake --

function lakeLines(ctx, lakes) {
  const { owner, W, H, N, projects, free } = ctx;
  const S = W / 1600;
  const comp = landmasses(lakes, W, H);
  const out = [];
  for (let m = 0; m < comp.areas.length && out.length < 3; m++) {
    if (comp.areas[m] < 40 * S * S) continue;
    const px = [];
    for (let i = 0; i < N; i++) if (comp.id[i] === m) px.push(i);
    // Its shores, and who holds them.
    const q = [], who = new Int32Array(N).fill(-2), shore = new Set();
    for (const i of px) for (const j of N4(i, W, N)) if (j >= 0 && ctx.land[j] && !lakes[j] && owner[j] >= 0 && who[j] === -2) { who[j] = owner[j]; q.push(j); shore.add(owner[j]); }
    if (shore.size < 2 || [...shore].some((k) => !free(k))) continue;
    // Each part of the lake to the country whose shore is nearest: the line halfway between.
    let head = 0;
    while (head < q.length) { const i = q[head++]; for (const j of N4(i, W, N)) if (j >= 0 && comp.id[j] === m && who[j] === -2) { who[j] = who[i]; q.push(j); } }
    const before = ctx.snapshot([...shore]);
    ctx.begin();
    for (const i of px) if (who[i] >= 0) ctx.set(i, who[i]);
    if (!ctx.ok(before)) { ctx.revert(); continue; }
    const ax = axesOf(px, W);
    out.push({ kind: 'lake', of: [...shore].map((k) => projects[k].id), x: Math.round(ax.cx), y: Math.round(ax.cy), area: px.length });
  }
  return out;
}

// shapeFrontiers({ owner, land, width, height, projects, nations, rng, dist, hydro, style }) => [{ kind, ... }]
// Runs on the owners as divided, before the exclave, the towns, and the names.
export function shapeFrontiers({ owner, land, width: W, height: H, projects, nations, rng, dist, hydro }) {
  const ctx = makeCtx({ owner, land, W, H, projects, nations });
  const r = rng.fork('frontiers');
  const done = [];
  const plan = r.fork('plan');
  if (plan.chance(0.5)) { const x = ribbon(ctx, r.fork('ribbon'), dist, hydro.lakes); if (x) done.push(x); }
  if (plan.chance(0.75)) { const x = corridor(ctx, r.fork('corridor'), hydro.riverClass); if (x) done.push(x); }
  if (plan.chance(0.8)) { const x = shareIsland(ctx, r.fork('island')); if (x) done.push(x); }
  done.push(...lakeLines(ctx, hydro.lakes));
  return done;
}

// ------------------------------------------------------------ town jogs --

// jogRoundTowns({ owner, land, width, height, projects, nations, settlements, rng }) => [{ kind: 'town', ... }]
// A town or a village a few units inside one country, near a neighbour: the neighbour's border steps out round it.
export function jogRoundTowns({ owner, land, width: W, height: H, projects, nations, settlements, rng, max = 2 }) {
  const ctx = makeCtx({ owner, land, W, H, projects, nations });
  const r = rng.fork('town-jogs');
  const S = W / 1600, N = W * H;
  const out = [];
  const list = r.shuffle(settlements.map((s, k) => k).filter((k) => settlements[k].rank >= 2));
  for (const k of list) {
    if (out.length >= max) break;
    const s = settlements[k], si = Math.floor(s.y) * W + Math.floor(s.x), B = owner[si];
    if (!ctx.free(B) || s.x < 20 || s.x > W - 20) continue;
    let A = -1, d = Infinity;
    const R0 = Math.ceil(8 * S);
    for (let dy = -R0; dy <= R0; dy++) for (let dx = -R0; dx <= R0; dx++) {
      const x = Math.floor(s.x) + dx, y = Math.floor(s.y) + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const o = owner[y * W + x], dd = Math.hypot(dx, dy);
      if (o >= 0 && o !== B && dd < d) { d = dd; A = o; }
    }
    if (!ctx.free(A) || d < 3 * S || d > 7 * S) continue;
    const rr = d + r.range(2, 3.4) * S, square = r.chance(0.5), RR = Math.ceil(rr);
    const inside = (dx, dy) => (square ? Math.max(Math.abs(dx), Math.abs(dy)) * 0.75 + Math.hypot(dx, dy) * 0.25 : Math.hypot(dx, dy)) < rr;
    // No other town or city of B in it.
    if (settlements.some((o, j) => j !== k && o.country === B && (o.rank <= 2) && inside(o.x - s.x, o.y - s.y))) continue;
    const before = ctx.snapshot([A, B]);
    ctx.begin();
    for (let dy = -RR; dy <= RR; dy++) for (let dx = -RR; dx <= RR; dx++) {
      const x = Math.floor(s.x) + dx, y = Math.floor(s.y) + dy;
      if (x < 0 || y < 0 || x >= W || y >= H || !inside(dx + 0.5 - (s.x % 1), dy + 0.5 - (s.y % 1))) continue;
      if (owner[y * W + x] === B) ctx.set(y * W + x, A);
    }
    if (!ctx.ok(before)) { ctx.revert(); continue; }
    for (const o of settlements) if (o.country === B && owner[Math.floor(o.y) * W + Math.floor(o.x)] === A) o.country = A;
    out.push({ kind: 'town', of: projects[A].id, from: projects[B].id, x: Math.round(s.x * 10) / 10, y: Math.round(s.y * 10) / 10 });
  }
  void N;
  return out;
}

// ------------------------------------------------------------ river jogs --

// jogAtRiverBends({ owner, land, width, height, projects, nations, rivers, riverMeta, rng }) => [{ kind: 'river', ... }]
// Where a border runs down a river, the land in one of the river's tight bends belongs to the far bank: the border
// cuts across the bend's neck.
export function jogAtRiverBends({ owner, land, width: W, height: H, projects, nations, rivers, riverMeta, rng, max = 2 }) {
  const ctx = makeCtx({ owner, land, W, H, projects, nations });
  const r = rng.fork('river-jogs');
  const S = W / 1600;
  const at = (x, y) => { const qx = Math.floor(x), qy = Math.floor(y); return qx >= 0 && qy >= 0 && qx < W && qy < H ? owner[qy * W + qx] : -1; };
  const cands = [];
  rivers.forEach((pts, k) => {
    if (riverMeta[k].width < 2 || pts.length < 20) return;
    const cum = [0];
    for (let j = 1; j < pts.length; j++) cum.push(cum[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
    for (let i = 2; i < pts.length - 8; i += 2) {
      for (let j = i + 4; j < pts.length - 2; j++) {
        const arc = cum[j] - cum[i];
        if (arc > 40 * S) break;
        const chord = Math.hypot(pts[j][0] - pts[i][0], pts[j][1] - pts[i][1]);
        if (chord < 3 * S || chord > 12 * S || arc < chord * 1.7) continue;
        cands.push({ k, i, j, v: r.next() });
        break;
      }
    }
  });
  cands.sort((a, b) => a.v - b.v);
  const out = [];
  const used = [];
  for (const c of cands) {
    if (out.length >= max) break;
    const poly = rivers[c.k].slice(c.i, c.j + 1);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, mx = 0, my = 0;
    for (const [x, y] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); mx += x; my += y; }
    mx /= poly.length; my /= poly.length;
    if (used.some(([ux, uy]) => Math.hypot(ux - mx, uy - my) < 60 * S) || mx < 20 || mx > W - 20) continue;
    // The land in the bend, and the bank across from it.
    const px = [];
    const inPoly = (x, y) => { let inside = false; for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) { const [xa, ya] = poly[a], [xb, yb] = poly[b]; if ((ya > y) !== (yb > y) && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) inside = !inside; } return inside; };
    for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(x0); x <= x1; x++) if (inPoly(x + 0.5, y + 0.5)) px.push(y * W + x);
    if (px.length < 10 * S * S) continue;
    const count = new Map();
    for (const i of px) count.set(owner[i], (count.get(owner[i]) || 0) + 1);
    const X = [...count.entries()].sort((a, b) => b[1] - a[1])[0][0];
    if (!ctx.free(X)) continue;
    const apex = poly[poly.length >> 1], chordMid = [(poly[0][0] + poly[poly.length - 1][0]) / 2, (poly[0][1] + poly[poly.length - 1][1]) / 2];
    let ox = apex[0] - chordMid[0], oy = apex[1] - chordMid[1];
    const ol = Math.hypot(ox, oy) || 1; ox /= ol; oy /= ol;
    const Y = at(apex[0] + ox * 2.5 * S, apex[1] + oy * 2.5 * S);
    if (!ctx.free(Y) || Y === X) continue;
    const before = ctx.snapshot([X, Y]);
    ctx.begin();
    for (const i of px) if (owner[i] === X) ctx.set(i, Y);
    if (!ctx.ok(before)) { ctx.revert(); continue; }
    used.push([mx, my]);
    out.push({ kind: 'river', of: projects[Y].id, from: projects[X].id, x: Math.round(mx * 10) / 10, y: Math.round(my * 10) / 10 });
  }
  // Where the rivers bend too gently for that: the border leaves the river for a loop of the far bank, the river's
  // old course, and comes back to it.
  if (out.length < max) {
    const stretches = [];
    rivers.forEach((pts, k) => {
      if (riverMeta[k].width < 2) return;
      let run = 0, runA = -1, runB = -1;
      for (let j = 1; j < pts.length - 1; j++) {
        const [x0, y0] = pts[j - 1], [x1, y1] = pts[j + 1];
        let tx = x1 - x0, ty = y1 - y0;
        const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        // (The border must run down the river itself: the same two countries close by and further out on each bank.)
        const a = at(pts[j][0] - ty * 3 * S, pts[j][1] + tx * 3 * S), b = at(pts[j][0] + ty * 3 * S, pts[j][1] - tx * 3 * S);
        const a1 = at(pts[j][0] - ty * 1.2 * S, pts[j][1] + tx * 1.2 * S), b1 = at(pts[j][0] + ty * 1.2 * S, pts[j][1] - tx * 1.2 * S);
        if (a >= 0 && b >= 0 && a !== b && a1 === a && b1 === b && ctx.free(a) && ctx.free(b) && (!run || (a === runA && b === runB))) { if (!run) { runA = a; runB = b; } run++; } else run = 0;
        if (run === 30) stretches.push({ k, j: j - 15, nx: -ty, ny: tx, a, b, v: r.next() });
      }
    });
    stretches.sort((p, q) => p.v - q.v);
    for (const st of stretches) {
      if (out.length >= max) break;
      const [px, py] = rivers[st.k][st.j];
      if (used.some(([ux, uy]) => Math.hypot(ux - px, uy - py) < 60 * S) || px < 20 || px > W - 20) continue;
      // The loop is cut from side X (a, to the left of the river's course, or b) and given to the other.
      const left = r.chance(0.5), X = left ? st.a : st.b, Y = left ? st.b : st.a, sgn = left ? 1 : -1;
      const rr = r.range(4.5, 7) * S, cx = px + st.nx * sgn * rr * 0.3, cy = py + st.ny * sgn * rr * 0.3, R = Math.ceil(rr) + 1;
      const before = ctx.snapshot([X, Y]);
      ctx.begin();
      for (let y = Math.floor(cy) - R; y <= cy + R; y++) for (let x = Math.floor(cx) - R; x <= cx + R; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        // A meander's loop: rounder away from the river, its two ends meeting the bank.
        if (Math.hypot(dx, dy) < rr && (dx * st.nx + dy * st.ny) * sgn > -rr * 0.3 && owner[y * W + x] === X) ctx.set(y * W + x, Y);
      }
      if (!ctx.ok(before)) { ctx.revert(); continue; }
      used.push([px, py]);
      out.push({ kind: 'river', of: projects[Y].id, from: projects[X].id, x: Math.round(px * 10) / 10, y: Math.round(py * 10) / 10, loop: true });
    }
  }
  return out;
}


// Countries and provinces.
//
// The land is first cut into a few thousand small cells whose edges settle on
// rivers and mountain crests (a cost-distance fill, dear to cross either).
// Countries are then groups of cells:
//   1. a plan decides which landmass hosts which projects and how large each
//      country is (flagships by rank, small countries on islands and coasts),
//   2. each landmass is divided by growing countries from seeds, then trading
//      border cells until the areas are right and the borders are short and
//      lie on rivers and ranges where they can.
// All land is project land: islands too small for a country of their own go
// to the nearest one.

import { makeNoise, clamp, smoothstep } from './rng.mjs';
import { landmasses } from './terrain.mjs';
import { Heap } from './hydro.mjs';

// Flagship weights by rank: 1.0 for the first down to 0.45 for the last.
export function flagshipWeights(count) {
  return Array.from({ length: count }, (_, i) => (count === 1 ? 1 : 1 - (0.55 * i) / (count - 1)));
}
export const SMALL_WEIGHT = 0.125; // a small country's usual size, on the same scale
const SMALL_LO = 0.05, SMALL_HI = 0.27;

// ---------------------------------------------------------------- cells --

function buildCells({ land, elev, width, height, rng, hydro, masses }) {
  const W = width, H = height, N = W * H, S = W / 1600;
  const noise = makeNoise(rng), noise2 = makeNoise(rng);
  // How much of a barrier each pixel is, 0..1: a river, or a mountain crest
  // (ground standing above its surroundings, high up).
  const barrier = new Float32Array(N);
  const blur = new Float32Array(N);
  {
    const R = Math.max(2, Math.round(4 * S)), tmp = new Float32Array(N), win = 2 * R + 1;
    for (let y = 0; y < H; y++) {
      let sum = 0;
      for (let x = -R; x <= R; x++) sum += Math.max(0, elev[y * W + clamp(x, 0, W - 1)]);
      for (let x = 0; x < W; x++) {
        tmp[y * W + x] = sum / win;
        sum += Math.max(0, elev[y * W + Math.min(W - 1, x + R + 1)]) - Math.max(0, elev[y * W + Math.max(0, x - R)]);
      }
    }
    for (let x = 0; x < W; x++) {
      let sum = 0;
      for (let y = -R; y <= R; y++) sum += tmp[clamp(y, 0, H - 1) * W + x];
      for (let y = 0; y < H; y++) {
        blur[y * W + x] = sum / win;
        sum += tmp[Math.min(H - 1, y + R + 1) * W + x] - tmp[Math.max(0, y - R) * W + x];
      }
    }
  }
  for (let i = 0; i < N; i++) {
    if (!land[i]) continue;
    const e = Math.max(0, elev[i]);
    let b = smoothstep(0.012, 0.05, e - blur[i]) * smoothstep(0.16, 0.3, e);
    b = Math.max(b, 0.55 * smoothstep(0.3, 0.55, e));
    if (hydro) {
      const rc = hydro.riverClass[i];
      if (rc >= 2) b = 1; else if (rc === 1) b = Math.max(b, 0.5);
    }
    barrier[i] = b;
  }

  // Seeds on a jittered grid, nudged off barriers.
  const step = 15 * S;
  const seeds = [];
  for (let gy = 0; gy * step < H; gy++) for (let gx = 0; gx * step < W; gx++) {
    for (let t = 0; t < 4; t++) {
      const x = Math.floor((gx + rng.range(0.1, 0.9)) * step), y = Math.floor((gy + rng.range(0.1, 0.9)) * step);
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x;
      if (land[i] && (barrier[i] < 0.3 || t === 3)) { seeds.push(i); break; }
    }
  }
  // Every landmass needs at least one seed, however small.
  const seeded = new Uint8Array(masses.areas.length);
  for (const s of seeds) seeded[masses.id[s]] = 1;
  for (let i = 0; i < N; i++) {
    const m = masses.id[i];
    if (m >= 0 && !seeded[m]) { seeded[m] = 1; seeds.push(i); }
  }

  // Grow all cells at once; whoever reaches a pixel most cheaply takes it.
  const cellOf = new Int32Array(N).fill(-1);
  const cost = new Float64Array(N).fill(Infinity);
  // The heap carries the pixel only; its would-be owner waits in `pend`.
  const heap2 = new Heap(N * 4 + seeds.length);
  const pend = new Int32Array(N).fill(-1);
  seeds.forEach((s, c) => { cost[s] = 0; pend[s] = c; heap2.push(0, s); });
  const done = new Uint8Array(N);
  while (heap2.size) {
    const key = heap2.keys[0];
    const p = heap2.pop();
    if (done[p] || key > cost[p]) continue;
    done[p] = 1;
    cellOf[p] = pend[p];
    const x = p % W, y = (p / W) | 0;
    for (let k = 0; k < 4; k++) {
      const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = y + (k === 2 ? 1 : k === 3 ? -1 : 0);
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx;
      if (!land[n] || done[n]) continue;
      const wig = 0.5 + 0.5 * noise(nx / (11 * S), ny / (11 * S)) + 0.4 * (0.5 + 0.5 * noise2(nx / (34 * S), ny / (34 * S)));
      const lake = hydro && hydro.lakes[n] ? 0.35 : 1;
      const c = key + (1 + 1.5 * wig) * lake + 22 * barrier[n];
      if (c < cost[n]) { cost[n] = c; pend[n] = pend[p]; heap2.push(c, n); }
    }
  }

  // The cell graph.
  const count = seeds.length;
  const cells = Array.from({ length: count }, (_, id) => ({ id, area: 0, sx: 0, sy: 0, mass: masses.id[seeds[id]], coast: 0, seed: seeds[id], nbr: new Map(), extra: 0, elev: 0 }));
  const link = (a, b, bar) => {
    const ca = cells[a], cb = cells[b];
    let e = ca.nbr.get(b);
    if (!e) { e = { len: 0, bar: 0 }; ca.nbr.set(b, e); cb.nbr.set(a, e); }
    e.len++; e.bar += bar;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, c = cellOf[i];
    if (c < 0) {
      continue;
    }
    const cell = cells[c];
    cell.area++; cell.sx += x; cell.sy += y; cell.elev += Math.max(0, elev[i]);
    if (!land[i + 1] || !land[i - 1] || !land[i + W] || !land[i - W]) cell.coast++;
    if (x < W - 1) { const d = cellOf[i + 1]; if (d >= 0 && d !== c) link(c, d, Math.max(barrier[i], barrier[i + 1])); }
    if (y < H - 1) { const d = cellOf[i + W]; if (d >= 0 && d !== c) link(c, d, Math.max(barrier[i], barrier[i + W])); }
  }
  for (const c of cells) { c.x = c.area ? c.sx / c.area : 0; c.y = c.area ? c.sy / c.area : 0; c.elev = c.area ? c.elev / c.area : 0; }
  return { cellOf, cells, barrier };
}

// ----------------------------------------------------------------- plan --

// Decide which landmass hosts which projects, and how large each country is.
// hosts: [{ mass, area }] largest first. Returns { unit, hosts: [{ mass, area,
// flagships: [rankIndex], smalls: n, scale }], dropped: [mass] } or throws.
export function planWorld({ hosts, flagCount, smallCount, rng }) {
  const weights = flagshipWeights(flagCount);
  const totalW = weights.reduce((s, w) => s + w, 0);
  const land = hosts.reduce((s, h) => s + h.area, 0);
  const u0 = land / (totalW + smallCount * SMALL_WEIGHT);
  // Landmasses that could take at least the smallest flagship.
  const big = [];
  hosts.forEach((h, i) => { if (flagCount && h.area >= weights[flagCount - 1] * u0 * 0.8 && big.length < 5) big.push(i); });
  if (flagCount && !big.length) big.push(0);
  const tie = hosts.map(() => rng.next());
  let best = null;

  const assign = new Int8Array(flagCount);
  const W = new Float64Array(hosts.length);
  const units = [0.84, 0.9, 0.95, 1, 1.05, 1.1, 1.16];
  const consider = (jitter) => {
    for (const k of units) {
      const u = u0 * k;
      W.fill(0);
      for (let f = 0; f < flagCount; f++) W[assign[f]] += weights[f];
      let score = 6 * Math.log(k) ** 2 + jitter;
      let ok = true;
      const n = new Int32Array(hosts.length), nMax = new Int32Array(hosts.length), spare = new Float64Array(hosts.length);
      const scale = new Float64Array(hosts.length).fill(1);
      let need = 0;
      for (let m = 0; m < hosts.length && ok; m++) {
        const A = hosts[m].area;
        if (W[m] > 0) {
          const resid = A - u * W[m];
          if (resid < -0.03 * u * W[m]) { ok = false; break; }
          if (resid < SMALL_LO * u) { scale[m] = A / (u * W[m]); spare[m] = 0; n[m] = 0; nMax[m] = 0; }
          else { spare[m] = resid; n[m] = Math.max(1, Math.ceil(resid / (SMALL_HI * u))); nMax[m] = Math.max(n[m], Math.floor(resid / (SMALL_LO * u))); }
        } else {
          spare[m] = A; n[m] = Math.max(1, Math.ceil(A / (SMALL_HI * u))); nMax[m] = Math.max(n[m], Math.floor(A / (SMALL_LO * u)));
        }
        need += n[m];
      }
      if (!ok) continue;
      // The flagships must keep their order once any stretching is counted.
      const areas = [];
      for (let f = 0; f < flagCount; f++) areas.push(weights[f] * u * scale[assign[f]]);
      for (let f = 1; f < flagCount; f++) if (areas[f - 1] < areas[f] * 1.035) ok = false;
      if (!ok) continue;
      // Too few small projects to people every island: the smallest go to a neighbour.
      const dropped = [];
      for (let m = hosts.length - 1; m >= 0 && need > smallCount; m--) {
        if (W[m] > 0 || n[m] === 0) continue;
        need -= n[m]; n[m] = 0; nMax[m] = 0; dropped.push(m);
        score += 3 + (8 * hosts[m].area) / u;
      }
      if (need > smallCount) {
        // Still too many: make do with fewer, larger small countries.
        for (let guard = 0; guard < 50 && need > smallCount; guard++) {
          let pick = -1;
          for (let m = 0; m < hosts.length; m++) if (n[m] > 1 && (pick < 0 || spare[m] / n[m] < spare[pick] / n[pick])) pick = m;
          if (pick < 0) break;
          n[pick]--; need--;
        }
        if (need > smallCount) continue;
      }
      // Spare small projects go wherever they would be largest.
      for (let extra = smallCount - need; extra > 0; extra--) {
        let pick = -1, size = 0;
        for (let m = 0; m < hosts.length; m++) {
          if (n[m] === 0 && !(W[m] > 0 && spare[m] > 0)) continue;
          const s = spare[m] / (n[m] + 1);
          if (s > size) { size = s; pick = m; }
        }
        if (pick < 0) { ok = false; break; }
        n[pick]++;
      }
      if (!ok) continue;
      for (let m = 0; m < hosts.length; m++) {
        if (!n[m]) continue;
        const each = spare[m] / n[m] / u;
        if (each * u < hosts[0].minArea) { ok = false; break; }
        const off = Math.log(each / SMALL_WEIGHT);
        score += n[m] * off * off * 0.5;
        if (each > SMALL_HI) score += n[m] * 4 * (each / SMALL_HI - 1);
        if (each < SMALL_LO) score += n[m] * 6 * (SMALL_LO / each - 1);
        score += tie[m] * 0.05;
      }
      if (!ok) continue;
      if (!best || score < best.score) {
        best = { score, unit: u, assign: Array.from(assign), n: Array.from(n), scale: Array.from(scale), spare: Array.from(spare), dropped };
      }
    }
  };
  // Every way of putting the flagships on the big landmasses.
  const walk = (f) => {
    if (f === flagCount) { consider(walkJitter()); return; }
    for (const m of big) { assign[f] = m; walk(f + 1); }
  };
  // A little noise so equally good plans do not always resolve the same way round.
  let jitterState = Math.floor(rng.next() * 2 ** 30);
  const walkJitter = () => { jitterState = (Math.imul(jitterState, 1103515245) + 12345) >>> 0; return (jitterState / 2 ** 32) * 0.35; };
  walk(0);
  if (!best) throw new Error('no way to seat the projects on this world\'s landmasses');
  return {
    unit: best.unit,
    weights,
    dropped: best.dropped.map((m) => hosts[m].mass),
    hosts: hosts.map((h, m) => ({
      mass: h.mass, area: h.area, smalls: best.n[m], scale: best.scale[m], spare: best.spare[m],
      flagships: best.assign.map((a, f) => (a === m ? f : -1)).filter((f) => f >= 0),
    })).filter((h) => h.flagships.length || h.smalls),
  };
}

// ------------------------------------------------------------ partition --

// Divide a set of cells among parts with target areas.
// parts: [{ target, seed (cell id), pinned }]. Returns Int32Array label per
// cell id (-1 outside the set).
function partition(cells, ids, parts, rng, { effort = 1 } = {}) {
  const label = new Int32Array(cells.length).fill(-1);
  const inSet = new Uint8Array(cells.length);
  for (const id of ids) inSet[id] = 1;
  const k = parts.length;
  const area = new Float64Array(k);
  if (k === 1) { for (const id of ids) label[id] = 0; return label; }

  // Grow from the seeds: the part furthest behind its target takes its
  // nearest free cell (nearness counts a river or crest as extra distance).
  const heaps = parts.map(() => new Heap(ids.length * 8 + 8));
  const claim = (id, p, d) => {
    label[id] = p; area[p] += cells[id].areaEff;
    for (const [nb, e] of cells[id].nbr) {
      if (!inSet[nb] || label[nb] >= 0) continue;
      const hop = Math.hypot(cells[id].x - cells[nb].x, cells[id].y - cells[nb].y) * (1 + (3 * e.bar) / e.len);
      heaps[p].push(d + hop, nb);
    }
  };
  parts.forEach((part, p) => claim(part.seed, p, 0));
  let left = ids.length - k;
  while (left > 0) {
    let pick = -1, ratio = Infinity;
    for (let p = 0; p < k; p++) {
      while (heaps[p].size && label[heaps[p].ids[0]] >= 0) heaps[p].pop();
      if (!heaps[p].size) continue;
      const r = area[p] / parts[p].target;
      if (r < ratio) { ratio = r; pick = p; }
    }
    if (pick < 0) break;
    const d = heaps[pick].keys[0];
    const id = heaps[pick].pop();
    claim(id, pick, d);
    left--;
  }
  // Anything unreached (it cannot happen on one landmass) joins a neighbour.
  for (let pass = 0; pass < 3 && left > 0; pass++) {
    for (const id of ids) {
      if (label[id] >= 0) continue;
      for (const [nb] of cells[id].nbr) if (inSet[nb] && label[nb] >= 0) { label[id] = label[nb]; area[label[nb]] += cells[id].areaEff; left--; break; }
    }
  }

  // Trade border cells. Energy: squared area error, plus border length with a
  // discount where the border lies on a river or a crest.
  const wB = 1 / 40;
  let wA = 2600;
  const pinned = new Int32Array(cells.length).fill(-1);
  parts.forEach((part, p) => { if (part.pinned) pinned[part.seed] = p; });
  const count = new Int32Array(k);
  for (const id of ids) count[label[id]]++;
  const queue = new Int32Array(ids.length), mark = new Int32Array(cells.length);
  let stamp = 0;
  // Would part `a` stay in one piece without cell `c`?
  const staysWhole = (c, a) => {
    const need = [];
    for (const [nb] of cells[c].nbr) if (label[nb] === a) need.push(nb);
    if (need.length <= 1) return true;
    stamp++;
    let head = 0, tail = 0;
    queue[tail++] = need[0]; mark[need[0]] = stamp;
    const want = new Set(need); want.delete(need[0]);
    while (head < tail && want.size) {
      const q = queue[head++];
      for (const [nb] of cells[q].nbr) {
        if (nb === c || label[nb] !== a || mark[nb] === stamp) continue;
        mark[nb] = stamp; queue[tail++] = nb;
        want.delete(nb);
      }
    }
    return want.size === 0;
  };
  const err = (p, a) => { const d = (a - parts[p].target) / parts[p].target; return d * d; };
  const tryMove = (c, temp) => {
    const a = label[c];
    if (pinned[c] >= 0 || count[a] <= 1) return false;
    // A neighbouring part to move into, picked at random among those it touches.
    let b = -1, seen = 0;
    for (const [nb] of cells[c].nbr) {
      const l = label[nb];
      if (l >= 0 && l !== a && rng.next() < 1 / ++seen) b = l;
    }
    if (b < 0) return false;
    let dB = 0;
    for (const [nb, e] of cells[c].nbr) {
      const l = label[nb];
      if (l < 0) continue;
      const w = e.len - 0.8 * e.bar;
      dB += w * ((l !== b ? 1 : 0) - (l !== a ? 1 : 0));
    }
    const ar = cells[c].areaEff;
    const dA = err(a, area[a] - ar) - err(a, area[a]) + err(b, area[b] + ar) - err(b, area[b]);
    const dE = wB * dB + wA * dA;
    if (dE > 0 && (temp <= 0 || rng.next() >= Math.exp(-dE / temp))) return false;
    if (!staysWhole(c, a)) return false;
    label[c] = b; area[a] -= ar; area[b] += ar; count[a]--; count[b]++;
    return true;
  };
  const sweep = (iters, t0, t1) => {
    for (let it = 0; it < iters; it++) {
      const temp = t0 > 0 ? t0 * (t1 / t0) ** (it / iters) : 0;
      tryMove(ids[rng.int(ids.length)], temp);
    }
  };
  const base = Math.round(ids.length * 260 * effort);
  sweep(base, 0.5, 0.02);
  sweep(Math.round(base * 0.4), 0, 0);
  wA *= 25;
  sweep(Math.round(base * 0.3), 0, 0);
  return label;
}

// ------------------------------------------------------------- the lot --

// buildCountries({ land, elev, width, height, projects, rng, hydro })
//   => { owner, provinces, capitals, areas, plan }
// owner: project index per pixel (-1 sea). provinces: province index per
// pixel within its project (-1 where the project has none).
export function buildCountries({ land, elev, width, height, projects, rng, hydro }) {
  const W = width, H = height, N = W * H, S = W / 1600;
  const r = rng.fork ? rng.fork('political') : rng;
  const masses = landmasses(land, W, H);
  const { cellOf, cells } = buildCells({ land, elev, width, height, rng: r, hydro, masses });

  const flagships = projects.map((p, index) => ({ p, index })).filter((e) => e.p.tier === 'flagship').sort((a, b) => a.p.rank - b.p.rank);
  const smalls = projects.map((p, index) => ({ p, index })).filter((e) => e.p.tier !== 'flagship');

  // Landmasses big enough for a country of their own host one; the rest
  // attach to the nearest cell of a host (found by spreading out over the sea).
  const hostMin = 1500 * S * S;
  const isHost = new Uint8Array(masses.areas.length);
  // No more islands than there are small projects to put on them, largest first.
  let islandHosts = 0;
  masses.areas.forEach((a, m) => { if (a >= hostMin && (m < 5 || islandHosts++ < smalls.length + 2)) isHost[m] = 1; });
  if (!isHost[0]) isHost[0] = 1;

  let plan = null;
  const anchorOf = new Int32Array(masses.areas.length).fill(-1); // non-host mass -> host cell
  const anchor = () => {
    // Nearest host cell for every pixel, spreading from host land across everything.
    const near = new Int32Array(N).fill(-1);
    const queue = new Int32Array(N);
    let head = 0, tail = 0;
    for (let i = 0; i < N; i++) if (land[i] && isHost[masses.id[i]]) { near[i] = cellOf[i]; queue[tail++] = i; }
    while (head < tail) {
      const i = queue[head++], x = i % W;
      for (const n of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
        if (n < 0 || n >= N || near[n] >= 0) continue;
        near[n] = near[i]; queue[tail++] = n;
      }
    }
    anchorOf.fill(-1);
    for (const c of cells) c.extra = 0;
    for (let i = 0; i < N; i++) {
      const m = masses.id[i];
      if (m < 0 || isHost[m] || anchorOf[m] >= 0) continue;
      anchorOf[m] = near[i];
    }
    masses.areas.forEach((a, m) => { if (!isHost[m] && anchorOf[m] >= 0) cells[anchorOf[m]].extra += a; });
    for (const c of cells) c.areaEff = c.area + c.extra;
  };
  for (let round = 0; round < 6; round++) {
    anchor();
    const hostArea = new Float64Array(masses.areas.length);
    for (const c of cells) if (isHost[c.mass]) hostArea[c.mass] += c.areaEff;
    const hosts = [];
    masses.areas.forEach((a, m) => { if (isHost[m]) hosts.push({ mass: m, area: hostArea[m], minArea: hostMin * 0.8 }); });
    hosts.sort((a, b) => b.area - a.area || a.mass - b.mass);
    plan = planWorld({ hosts, flagCount: flagships.length, smallCount: smalls.length, rng: r.fork ? r.fork('plan' + round) : r });
    if (!plan.dropped.length) break;
    // Islands the plan had no project for become satellites of a neighbour; plan again.
    for (const m of plan.dropped) isHost[m] = 0;
  }
  if (plan.dropped.length) throw new Error('the plan could not settle which islands stand alone');

  // ---- Seats: for each host, the parts and their seeds. ----
  const cellsByMass = new Map();
  for (const c of cells) {
    if (!isHost[c.mass]) continue;
    if (!cellsByMass.has(c.mass)) cellsByMass.set(c.mass, []);
    cellsByMass.get(c.mass).push(c.id);
  }
  // How exposed a cell is: the share of sea in the square around it.
  const integral = new Int32Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) {
    let row = 0;
    for (let x = 0; x < W; x++) {
      row += land[y * W + x];
      integral[(y + 1) * (W + 1) + x + 1] = integral[y * (W + 1) + x + 1] + row;
    }
  }
  const seaShare = (cx, cy, rad) => {
    const x0 = clamp(Math.round(cx - rad), 0, W), x1 = clamp(Math.round(cx + rad), 0, W);
    const y0 = clamp(Math.round(cy - rad), 0, H), y1 = clamp(Math.round(cy + rad), 0, H);
    const landIn = integral[y1 * (W + 1) + x1] - integral[y0 * (W + 1) + x1] - integral[y1 * (W + 1) + x0] + integral[y0 * (W + 1) + x0];
    return 1 - landIn / Math.max(1, (x1 - x0) * (y1 - y0));
  };

  const cellOwner = new Int32Array(cells.length).fill(-1); // project index per cell
  const slots = []; // small-country seats awaiting a project: { cellsOf: [ids], area }
  const seatOrder = [];
  for (const host of plan.hosts) {
    const ids = cellsByMass.get(host.mass) || [];
    const parts = [];
    for (const f of host.flagships) parts.push({ kind: 'flag', f, target: plan.weights[f] * plan.unit * host.scale });
    if (host.smalls) {
      const shares = Array.from({ length: host.smalls }, () => r.range(0.75, 1.3));
      const total = shares.reduce((s, v) => s + v, 0);
      const spare = host.flagships.length ? host.spare : host.area;
      for (const sh of shares) parts.push({ kind: 'small', target: (spare * sh) / total });
    }
    // A host with fewer cells than countries cannot seat them all.
    if (ids.length < parts.length) throw new Error('a landmass is too small for the countries planned on it');
    // Seeds. Flagships spread out across the mass; small countries take
    // exposed coastal spots (peninsulas and headlands) away from one another.
    const chosen = [];
    const spread = (id) => { let d = Infinity; for (const c of chosen) d = Math.min(d, Math.hypot(cells[id].x - cells[c].x, cells[id].y - cells[c].y)); return d; };
    const order = parts.map((_, i) => i).sort((a, b) => (parts[a].kind === parts[b].kind ? parts[b].target - parts[a].target : parts[a].kind === 'flag' ? -1 : 1));
    for (const pi of order) {
      const part = parts[pi];
      let best = -1, bestScore = -Infinity;
      for (const id of ids) {
        if (chosen.includes(id)) continue;
        const c = cells[id];
        let score;
        if (part.kind === 'flag') {
          score = chosen.length ? Math.min(spread(id), 400 * S) : r.next() * 100;
          score += r.next() * 40 * S;
        } else {
          if (!c.coast) continue;
          const reach = Math.sqrt(part.target) * 0.9;
          score = seaShare(c.x, c.y, reach) * 260 * S + Math.min(spread(id), 260 * S) * 0.7 + r.next() * 50 * S;
        }
        if (score > bestScore) { bestScore = score; best = id; }
      }
      if (best < 0) best = ids.find((id) => !chosen.includes(id));
      part.seed = best;
      part.pinned = part.kind === 'small';
      chosen.push(best);
    }
    const label = partition(cells, ids, parts, r);
    parts.forEach((part, pi) => {
      const mine = ids.filter((id) => label[id] === pi);
      if (part.kind === 'flag') for (const id of mine) cellOwner[id] = flagships[part.f].index;
      else slots.push({ cellIds: mine, area: mine.reduce((s, id) => s + cells[id].areaEff, 0), seed: part.seed });
    });
    seatOrder.push(host.mass);
  }

  // Small projects to seats: the longer the name, the larger the seat, with
  // some luck, so names have room and no two worlds seat them alike.
  const seatRank = slots.map((s, i) => i).sort((a, b) => slots[b].area * (0.8 + 0.4 * r.next()) - slots[a].area * (0.8 + 0.4 * r.next()));
  const nameRank = smalls.map((s, i) => i).sort((a, b) => smalls[b].p.name.length * (0.75 + 0.5 * r.next()) - smalls[a].p.name.length * (0.75 + 0.5 * r.next()));
  seatRank.forEach((si, k) => {
    const project = smalls[nameRank[k]];
    if (!project) return;
    for (const id of slots[si].cellIds) cellOwner[id] = project.index;
    slots[si].project = project.index;
  });

  // ---- Provinces. ----
  const cellProvince = new Int32Array(cells.length).fill(-1);
  projects.forEach((project, index) => {
    if (!project.provinces || project.provinces.length < 2) return;
    const all = cells.filter((c) => cellOwner[c.id] === index).map((c) => c.id);
    // The largest landmass the project sits on is divided; the rest follows.
    const byMass = new Map();
    for (const id of all) byMass.set(cells[id].mass, (byMass.get(cells[id].mass) || 0) + cells[id].area);
    const main = [...byMass.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
    const ids = all.filter((id) => cells[id].mass === main);
    const kk = Math.min(project.provinces.length, ids.length);
    const total = ids.reduce((s, id) => s + cells[id].areaEff, 0);
    const shares = Array.from({ length: kk }, () => r.range(0.8, 1.25));
    const sum = shares.reduce((s, v) => s + v, 0);
    const chosen = [];
    const parts = shares.map((sh) => {
      let best = -1, bestScore = -Infinity;
      for (const id of ids) {
        if (chosen.includes(id)) continue;
        let d = Infinity;
        for (const c of chosen) d = Math.min(d, Math.hypot(cells[id].x - cells[c].x, cells[id].y - cells[c].y));
        const score = (chosen.length ? d : 0) + r.next() * 12 * S;
        if (score > bestScore) { bestScore = score; best = id; }
      }
      chosen.push(best);
      return { target: (total * sh) / sum, seed: best, pinned: false };
    });
    const label = partition(cells, ids, parts, r, { effort: 1.5 });
    for (const id of ids) cellProvince[id] = label[id];
    // Cells of the project on other landmasses take the nearest province.
    for (const id of all) {
      if (cellProvince[id] >= 0) continue;
      let best = 0, bd = Infinity;
      for (const other of ids) {
        const d = Math.hypot(cells[id].x - cells[other].x, cells[id].y - cells[other].y);
        if (d < bd) { bd = d; best = cellProvince[other]; }
      }
      cellProvince[id] = best;
    }
  });

  // ---- Pixels. ----
  const owner = new Int16Array(N).fill(-1);
  const provinces = new Int16Array(N).fill(-1);
  for (let i = 0; i < N; i++) {
    if (!land[i]) continue;
    const m = masses.id[i];
    const c = isHost[m] ? cellOf[i] : anchorOf[m];
    owner[i] = cellOwner[c];
    provinces[i] = cellProvince[c];
  }
  const areas = new Array(projects.length).fill(0);
  for (let i = 0; i < N; i++) if (owner[i] >= 0) areas[owner[i]]++;

  // ---- Capitals: a low, sheltered cell well inside each country, by water if it can be. ----
  const capitals = [];
  projects.forEach((project, index) => {
    let best = null, bestScore = -Infinity;
    for (const c of cells) {
      if (cellOwner[c.id] !== index) continue;
      let inside = 1;
      for (const [nb] of c.nbr) if (cellOwner[nb] !== index) inside = 0;
      const river = hydro && hydro.riverClass[c.seed] ? 1 : 0;
      const score = inside * 3 + (c.coast ? 1.2 : 0) + river * 1.5 - c.elev * 14 + r.next() * 1.5;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    if (best) capitals.push({ id: project.id, x: (best.seed % W) + 0.5, y: Math.floor(best.seed / W) + 0.5 });
  });

  return { owner, provinces, capitals, areas, plan, cellOf, cells, masses };
}

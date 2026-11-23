// Rivers and lakes.
//
// Every hollow in the land is filled to its brim (a priority flood from the
// coast inward), so water at any point has a way down to the sea. The larger
// filled hollows become lakes. Flow is collected downhill, weighted by
// rainfall, and where enough has gathered there is a river.

import { makeRng, makeNoise } from './rng.mjs';

const DX = [1, 1, 0, -1, -1, -1, 0, 1];
const DY = [0, 1, 1, 1, 0, -1, -1, -1];

// A binary min-heap of (key, id) pairs on typed arrays.
export class Heap {
  constructor(capacity) {
    this.keys = new Float64Array(capacity);
    this.ids = new Int32Array(capacity);
    this.size = 0;
  }
  push(key, id) {
    let i = this.size++;
    const { keys, ids } = this;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (keys[p] <= key) break;
      keys[i] = keys[p]; ids[i] = ids[p];
      i = p;
    }
    keys[i] = key; ids[i] = id;
  }
  pop() {
    const { keys, ids } = this;
    const top = ids[0];
    const key = keys[--this.size], id = ids[this.size];
    let i = 0;
    const n = this.size;
    for (;;) {
      let c = 2 * i + 1;
      if (c >= n) break;
      if (c + 1 < n && keys[c + 1] < keys[c]) c++;
      if (keys[c] >= key) break;
      keys[i] = keys[c]; ids[i] = ids[c];
      i = c;
    }
    keys[i] = key; ids[i] = id;
    return top;
  }
}

// buildHydro({ elev, land, width, height, rain, rng, style })
//   => { rivers, riverMeta, lakes, filled, acc, down, riverClass }
// rivers: polylines of [x, y] from source to mouth, in pixel centres.
// riverMeta[i]: { width (1..4), ends: 'sea' | 'lake' | 'river' } for rivers[i].
// lakes: 1 where a lake lies. filled: the land with its hollows filled.
// riverClass: 0, or the width class of the river on that pixel.
export function buildHydro({ elev, land, width, height, rain, rng, style = {} }) {
  const W = width, H = height, N = W * H;
  const S = W / 1600;
  const r = rng ? (rng.fork ? rng.fork('hydro') : rng) : makeRng('hydro');
  const nA = makeNoise(r), nB = makeNoise(r);

  // The surface water runs on: the land, roughened a touch so rivers wander.
  const z = new Float64Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!land[i]) continue;
    const e = elev[i];
    z[i] = e + (e > 0 ? 0.005 * nA(x / (26 * S), y / (26 * S)) + 0.0022 * nB(x / (7 * S), y / (7 * S)) : 0);
  }

  // ---- Fill the hollows. ----
  const filled = new Float64Array(N);
  const closed = new Uint8Array(N);
  const order = new Int32Array(N); // land pixels in the order the flood reached them
  let reached = 0;
  const heap = new Heap(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!land[i]) continue;
    let coastal = x === 0 || y === 0 || x === W - 1 || y === H - 1;
    for (let k = 0; k < 8 && !coastal; k++) if (!land[i + DX[k] + DY[k] * W]) coastal = true;
    if (coastal) { closed[i] = 1; filled[i] = Math.max(z[i], 1e-6); heap.push(filled[i], i); }
  }
  const EPS = 2e-6;
  while (heap.size) {
    const c = heap.pop();
    order[reached++] = c;
    const cx = c % W, cy = (c / W) | 0;
    for (let k = 0; k < 8; k++) {
      const nx = cx + DX[k], ny = cy + DY[k];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx;
      if (!land[n] || closed[n]) continue;
      closed[n] = 1;
      // Across a filled flat the step up is uneven, pixel to pixel, so the way
      // out of it wanders instead of running dead straight.
      const h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
      filled[n] = Math.max(z[n], filled[c] + EPS * (k & 1 ? 1.4142 : 1) * (0.4 + 3 * ((h >>> 8) & 1023) / 1023));
      heap.push(filled[n], n);
    }
  }

  // ---- Which way the water runs. ----
  // A grid offers only eight ways down, and always taking the steepest makes
  // rivers run in ruled lines along them. So each pixel takes one of the two
  // grid directions either side of the true slope, picked by lot in proportion
  // to how near each is. Streams then wander, and wandering streams meet.
  const down = new Int32Array(N).fill(-1); // -1: into the sea (or not land)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!land[i]) continue;
    let best = -2, bestDrop = 0, onCoast = false;
    for (let k = 0; k < 8; k++) {
      const nx = x + DX[k], ny = y + DY[k];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) { best = -1; bestDrop = Infinity; onCoast = true; break; }
      const n = ny * W + nx;
      const len = k & 1 ? 1.4142 : 1;
      // The sea is always the way out for a pixel on the coast.
      if (!land[n]) onCoast = true;
      const drop = land[n] ? (filled[i] - filled[n]) / len : (filled[i] + 0.5) / len;
      if (drop > bestDrop) { bestDrop = drop; best = land[n] ? n : -1 - (k + 1); }
    }
    if (!onCoast && best >= 0) {
      const f = filled;
      const gx = 2 * (f[i + 1] - f[i - 1]) + f[i + 1 - W] - f[i - 1 - W] + f[i + 1 + W] - f[i - 1 + W];
      const gy = 2 * (f[i + W] - f[i - W]) + f[i + W - 1] - f[i - W - 1] + f[i + W + 1] - f[i - W + 1];
      if (gx !== 0 || gy !== 0) {
        let sct = Math.atan2(-gy, -gx) / (Math.PI / 4);
        if (sct < 0) sct += 8;
        const k1 = Math.floor(sct) % 8, k2 = (k1 + 1) % 8, frac = sct - Math.floor(sct);
        const h = ((Math.imul(i ^ 0x51ed270b, 0x9e3779b1) >>> 9) & 4095) / 4096;
        const first = h < frac ? k2 : k1, second = h < frac ? k1 : k2;
        for (const k of [first, second]) {
          const n = i + DX[k] + DY[k] * W;
          if (filled[n] < filled[i]) { best = n; break; }
        }
      }
    }
    down[i] = best === -2 ? -1 : best;
  }
  // A pixel that drains straight into the sea remembers which way: -(k + 2).
  const seaDir = new Int8Array(N).fill(-1);
  for (let i = 0; i < N; i++) if (down[i] < -1) { seaDir[i] = -down[i] - 2; down[i] = -1; }

  // ---- Gather the flow. The flood reached pixels from the lowest up, so its
  // order read backwards runs from every height down to the coast. ----
  const acc = new Float32Array(N);
  for (let k = reached - 1; k >= 0; k--) {
    const i = order[k];
    acc[i] += rain ? Math.max(0.02, rain[i]) : 0.4;
    if (down[i] >= 0) acc[down[i]] += acc[i];
  }
  // ---- Lakes: the filled hollows deep and wide enough, where enough water arrives. ----
  const lakes = new Uint8Array(N);
  const depthMin = 0.0035;
  const seen = new Uint8Array(N);
  const stack = new Int32Array(N);
  const found = [];
  for (let s = 0; s < N; s++) {
    if (!land[s] || seen[s] || filled[s] - elev[s] < depthMin) continue;
    const cells = [];
    let top = 0, inflow = 0, sunk = false;
    stack[top++] = s; seen[s] = 1;
    while (top) {
      const i = stack[--top];
      cells.push(i);
      if (acc[i] > inflow) inflow = acc[i];
      if (elev[i] < 0) sunk = true;
      const x = i % W;
      for (const n of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
        if (n < 0 || n >= N || !land[n] || seen[n] || filled[n] - elev[n] < depthMin) continue;
        seen[n] = 1; stack[top++] = n;
      }
    }
    found.push({ cells, inflow, sunk });
  }
  const lakeMin = (style.lakeMin ?? 26) * S * S, lakeMax = 9000 * S * S;
  const lakiness = style.lakes ?? 1;
  found.sort((a, b) => b.cells.length - a.cells.length || a.cells[0] - b.cells[0]);
  let kept = 0;
  for (const f of found) {
    const area = f.cells.length;
    if (area < lakeMin) continue;
    // A basin the sea level left below its rim is a lake whatever the weather;
    // any other hollow needs a river's worth of water, or it stays a dry flat.
    const wetEnough = f.inflow > area * 0.55 / lakiness + 40 * S * S;
    if (!f.sunk && (!wetEnough || area > lakeMax || kept >= 40 * lakiness)) continue;
    for (const i of f.cells) lakes[i] = 1;
    kept++;
  }

  // ---- Rivers. ----
  const tMain = (style.riverFlow ?? 430) * S * S, tMinor = tMain * 0.42;
  const classOf = (a) => (a < tMain ? 1 : a < tMain * 4.5 ? 2 : a < tMain * 18 ? 3 : 4);
  const isRiver = (i) => land[i] && !lakes[i] && acc[i] >= tMinor;
  // For each river pixel, the pixels that flow into it.
  const firstIn = new Int32Array(N).fill(-1), nextIn = new Int32Array(N).fill(-1);
  for (let k = 0; k < reached; k++) {
    const i = order[k];
    if (!isRiver(i)) continue;
    const d = down[i];
    if (d >= 0) { nextIn[i] = firstIn[d]; firstIn[d] = i; }
  }
  const mainInflow = (i) => {
    let best = -1;
    for (let u = firstIn[i]; u >= 0; u = nextIn[u]) if (best < 0 || acc[u] > acc[best] || (acc[u] === acc[best] && u < best)) best = u;
    return best;
  };

  const rivers = [], riverMeta = [];
  const riverClass = new Uint8Array(N);
  const centre = (i) => [(i % W) + 0.5, ((i / W) | 0) + 0.5];
  // Trace a stem upstream from `mouth`; `joint` is the point it ends on downstream.
  const pending = [];
  const trace = (mouth, ends, joint) => {
    const cells = [mouth];
    for (let c = mouth; ;) {
      const u = mainInflow(c);
      if (u < 0) break;
      cells.push(u);
      c = u;
    }
    // Short stubs on the coast are clutter, not rivers.
    const minLen = (ends === 'river' ? 7 : 12) * S;
    if (cells.length < minLen) return;
    for (const c of cells) {
      for (let u = firstIn[c]; u >= 0; u = nextIn[u]) if (u !== mainInflow(c)) pending.push([u, c]);
    }
    // Source to mouth, cut wherever the river steps up a width class.
    cells.reverse();
    const cuts = [0];
    for (let k = 1; k < cells.length; k++) {
      const from = cuts[cuts.length - 1];
      // No stretch shorter than three pixels, at either end.
      if (classOf(acc[cells[k]]) !== classOf(acc[cells[from]]) && k - from >= 3 && cells.length - k >= 3) cuts.push(k);
    }
    for (let c = 0; c < cuts.length; c++) {
      const from = cuts[c], last = c === cuts.length - 1;
      const to = last ? cells.length : cuts[c + 1] + 1; // each stretch runs on to the first pixel of the next
      const cls = classOf(acc[cells[from]]);
      const pts = cells.slice(from, to).map(centre);
      if (last && joint) pts.push(joint);
      for (let q = from; q < (last ? cells.length : cuts[c + 1]); q++) riverClass[cells[q]] = cls;
      rivers.push(pts);
      riverMeta.push({ width: cls, ends: last ? ends : 'river', seaDir: last && ends === 'sea' ? seaDir[cells[cells.length - 1]] : -1 });
    }
  };
  for (let k = 0; k < reached; k++) {
    const i = order[k];
    if (!isRiver(i)) continue;
    const d = down[i];
    if (d < 0) trace(i, 'sea', null);
    else if (lakes[d]) trace(i, 'lake', null);
    while (pending.length) {
      const [u, c] = pending.pop();
      trace(u, 'river', centre(c));
    }
  }
  // Rivers leaving a lake: a river pixel fed mainly by a lake starts there,
  // and the trace above already stops at the lake's edge, so nothing more to do.

  const filled32 = new Float32Array(N);
  for (let i = 0; i < N; i++) filled32[i] = filled[i];
  return { rivers, riverMeta, lakes, filled: filled32, acc, down, riverClass };
}

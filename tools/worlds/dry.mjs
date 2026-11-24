// Roads and streets kept out of the drawn water.
//
// The roads are routed over the land grid, but the map draws a smoothed coast and smoothed lakes over it, so a road
// that kept to the grid can still run a little way into the drawn water where the drawn shore cuts the corner. Here
// every road and street is checked against the water as drawn (see geom.mjs), at a tenth of a unit, and:
//   - where it crosses water that lies on both sides of it (a river mouth, a narrows, a strait) for a short way, the
//     crossing is a bridge: the road goes on, and the crossing is listed as a bridge to be drawn as one;
//   - where it only grazes the shore, it is moved inland, just clear of the water;
//   - and anywhere else it stops at the water's edge.
// Roads also may not run along a river: a road that follows a river's line for more than a short crossing is moved
// off it, or stopped.

import { drawnCurve } from './geom.mjs';

const STEP = 0.1;
// The longest a road may run on a river's line (a crossing at a slant), in map units.
export const RIVER_RUN = 2;
// The longest slanting crossing of a river that is kept (as a bridge) when the road cannot be moved square to it.
export const RIVER_BRIDGE = 4.5;

// The longest bridge each class may have, in map units.
export const MAX_BRIDGE = { motorway: 6, trunk: 6, secondary: 4.5, local: 3, arterial: 3, ring: 3, street: 1.2, minor: 0 };

// keepDry(pts, { curved, cls, water, river }) => { pieces: [[[x, y], ...]], bridges: [[[x, y], ...]], changed }
// pts: the line as written (curved: drawn as a curve through its midpoints; else as straight segments).
export function keepDry(pts, { curved, cls, water, river }) {
  const dense = curved ? drawnCurve(pts, STEP) : densify(pts, STEP);
  const n = dense.length;
  const wet = new Uint8Array(n);
  let any = false;
  // (With a hair's margin, so a line that only touches the shore counts as wet.)
  const wetAt = (x, y) => water(x, y) || water(x + 0.04, y) || water(x - 0.04, y) || water(x, y + 0.04) || water(x, y - 0.04);
  for (let i = 0; i < n; i++) if (wetAt(dense[i][0], dense[i][1])) { wet[i] = 1; any = true; }
  // Along a river for more than a crossing: wet too (2 = river). A main road's crossings of a river are bridges.
  const bridges = [];
  const major = cls === 'motorway' || cls === 'trunk' || cls === 'secondary';
  if (river) {
    let a = -1;
    for (let i = 0; i <= n; i++) {
      const on = i < n && !wet[i] && river(dense[i][0], dense[i][1]);
      if (on && a < 0) a = i;
      if (!on && a >= 0) {
        if ((i - a) * STEP > RIVER_RUN) { for (let k = a; k < i; k++) wet[k] = 2; any = true; }
        else if (major && a > 0 && i < n) bridges.push(dense.slice(Math.max(0, a - 3), Math.min(n, i + 3)));
        a = -1;
      }
    }
  }
  if (!any) return { pieces: [pts], bridges, changed: false };
  const keep = new Uint8Array(n).fill(1);
  const out = dense.map((p) => p.slice());
  const maxBridge = MAX_BRIDGE[cls] ?? 0;
  const dirAt = (i) => {
    const a = dense[Math.max(0, i - 2)], b = dense[Math.min(n - 1, i + 2)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  };
  const dryAt = (x, y) => !wetAt(x, y) && !(river && river(x, y, 0.05));
  for (let i = 0; i < n;) {
    if (!wet[i]) { i++; continue; }
    let j = i;
    while (j + 1 < n && wet[j + 1]) j++;
    const len = (j - i + 1) * STEP, interior = i > 0 && j < n - 1;
    const m = (i + j) >> 1, [tx, ty] = dirAt(m), [mx, my] = dense[m];
    // Water on both sides of the road at the middle of the run: a crossing.
    const crossing = wet[m] === 1 && water(mx - ty * 1.2, my + tx * 1.2) && water(mx + ty * 1.2, my - tx * 1.2);
    if (crossing && interior && len <= maxBridge) {
      bridges.push(dense.slice(Math.max(0, i - 3), Math.min(n, j + 4)));
    } else {
      // Grazing the shore (or riding a river): move the run, and a little either side, just clear of the water.
      const a = Math.max(0, i - 4), b = Math.min(n - 1, j + 4);
      let moved = true;
      const shift = [];
      for (let k = a; k <= b; k++) {
        const [dx, dy] = dirAt(k), [x, y] = dense[k];
        if (!wet[k] && dryAt(x - dy * 0.15, y + dx * 0.15) && dryAt(x + dy * 0.15, y - dx * 0.15)) { shift.push(0); continue; }
        let best = null;
        for (let t = 0.1; t <= 2 && best === null; t += 0.1) {
          for (const sg of [1, -1]) {
            const qx = x - dy * t * sg, qy = y + dx * t * sg;
            if (dryAt(qx, qy) && dryAt(qx - dy * 0.15 * sg, qy + dx * 0.15 * sg)) { best = t * sg; break; }
          }
        }
        if (best === null) { moved = false; break; }
        shift.push(best);
      }
      if (moved && len < 5) {
        // Smooth the offsets so the road bends gently aside, then check the result.
        const sm = shift.map((_, k) => { let s = 0, c = 0; for (let q = Math.max(0, k - 3); q <= Math.min(shift.length - 1, k + 3); q++) { if (Math.abs(shift[q]) > Math.abs(s / Math.max(c, 1))) { s = shift[q]; c = 1; } } return c ? s : 0; });
        const trial = [];
        for (let k = a; k <= b; k++) { const [dx, dy] = dirAt(k), t = sm[k - a] || 0; trial.push([dense[k][0] - dy * t, dense[k][1] + dx * t]); }
        if (trial.every(([x, y]) => dryAt(x, y))) {
          for (let k = a; k <= b; k++) out[k] = trial[k - a];
        } else moved = false;
      } else moved = false;
      // A slanting crossing of a river that cannot be moved off is a bridge too, if it is short; else the road stops.
      if (!moved && wet[m] === 2 && interior && len <= RIVER_BRIDGE) { for (let k = i; k <= j; k++) wet[k] = 0; bridges.push(dense.slice(Math.max(0, i - 1), Math.min(n, j + 2))); moved = true; }
      if (!moved) for (let k = Math.max(0, i - 2); k <= Math.min(n - 1, j + 2); k++) keep[k] = 0;
    }
    i = j + 1;
  }
  // The kept stretches, each a run of the (moved) samples, simplified only where that keeps it dry.
  const pieces = [];
  let run = [];
  const flush = () => {
    // (Scraps left between two cuts are dropped: a road is not drawn as dashes.)
    if (run.length >= 2 && (run.length - 1) * STEP >= (cls === 'street' || cls === 'minor' ? 0.5 : 1.2)) {
      const sim = simplify(run, 0.025);
      pieces.push(straightDry(sim, wetAt, river, bridges) ? sim : run);
    }
    run = [];
  };
  for (let i = 0; i < n; i++) { if (keep[i]) run.push(out[i]); else flush(); }
  flush();
  // Last, every piece as it will be drawn (straight, point to point) is walked finely, and split wherever a step of
  // it still touches the water off a bridge.
  const onBridge = (x, y) => bridges.some((b) => b.some((p) => Math.abs(p[0] - x) < 0.2 && Math.abs(p[1] - y) < 0.2));
  const clean = [];
  for (const piece of pieces) {
    let cur = [piece[0]];
    for (let k = 1; k < piece.length; k++) {
      const [x0, y0] = piece[k - 1], [x1, y1] = piece[k];
      const m = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.03));
      let bad = false;
      for (let j = 0; j <= m && !bad; j++) { const x = x0 + ((x1 - x0) * j) / m, y = y0 + ((y1 - y0) * j) / m; if (wetAt(x, y) && !onBridge(x, y)) bad = true; }
      if (bad) { if (cur.length > 1) clean.push(cur); cur = [piece[k]]; } else cur.push(piece[k]);
    }
    if (cur.length > 1) clean.push(cur);
  }
  const minLen = cls === 'street' || cls === 'minor' ? 0.5 : 1.2;
  const long = clean.filter((pc) => { let l = 0; for (let k = 1; k < pc.length; k++) l += Math.hypot(pc[k][0] - pc[k - 1][0], pc[k][1] - pc[k - 1][1]); return l >= minLen; });
  return { pieces: long, bridges, changed: true };
}

// Whether a polyline, drawn straight, stays dry (but for its bridges).
function straightDry(pts, water, river, bridges) {
  const onBridge = (x, y) => bridges.some((b) => b.some((p) => Math.abs(p[0] - x) < 0.2 && Math.abs(p[1] - y) < 0.2));
  let rrun = 0;
  for (let k = 1; k < pts.length; k++) {
    const [x0, y0] = pts[k - 1], [x1, y1] = pts[k];
    const m = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.05));
    for (let j = 0; j <= m; j++) {
      const x = x0 + ((x1 - x0) * j) / m, y = y0 + ((y1 - y0) * j) / m;
      if (water(x, y) && !onBridge(x, y)) return false;
      if (river && river(x, y) && !onBridge(x, y)) { rrun += Math.hypot(x1 - x0, y1 - y0) / m; if (rrun > RIVER_RUN) return false; } else rrun = 0;
    }
  }
  return true;
}

// Douglas–Peucker on an open run of points; keeps both ends.
function simplify(pts, tol) {
  if (pts.length <= 2) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    let worst = -1, far = tol;
    for (let k = a + 1; k < b; k++) {
      const d = len === 0 ? Math.hypot(pts[k][0] - ax, pts[k][1] - ay) : Math.abs((pts[k][0] - ax) * dy - (pts[k][1] - ay) * dx) / len;
      if (d > far) { far = d; worst = k; }
    }
    if (worst >= 0) { keep[worst] = 1; stack.push([a, worst], [worst, b]); }
  }
  return pts.filter((_, k) => keep[k]);
}

function densify(pts, step) {
  const out = [pts[0]];
  for (let k = 1; k < pts.length; k++) {
    const [x0, y0] = pts[k - 1], [x1, y1] = pts[k];
    const m = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let j = 1; j <= m; j++) out.push([x0 + ((x1 - x0) * j) / m, y0 + ((y1 - y0) * j) / m]);
  }
  return out;
}

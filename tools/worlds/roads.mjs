// Roads: a network joining the settlements, routed over a coarse grid that
// prefers low, gentle ground, crosses rivers on bridges, keeps off high
// mountains, and reuses roads already built, so routes merge into a network.
//
// Classes: highways between capitals and cities, main roads to the towns,
// local roads to the villages, and street grids in the built-up areas. Ferry
// routes cross narrow sea between road ends on different landmasses.

import { Heap } from './hydro.mjs';
import { RANK } from './settlements.mjs';
import { clamp } from './rng.mjs';
import { landmasses } from './terrain.mjs';

const G = 2; // map units per grid cell (at 1600 wide)
const DX = [1, 1, 0, -1, -1, -1, 0, 1], DY = [0, 1, 1, 1, 0, -1, -1, -1];

// buildRoads({ land, elev, hydro, owner, settlements, width, height, rng })
//   => { roads: [{ cls: 'highway'|'main'|'local', pts, from, to }], streets: [[[x, y], ...]], ferries: [[[x, y], [x, y]]], shields: [{ x, y, text, kind }] }
export function buildRoads({ land, elev, hydro, owner, settlements, width, height, rng }) {
  const W = width, H = height, S = W / 1600, g = G * S;
  const r = rng.fork('roads');
  const CW = Math.floor(W / g), CH = Math.floor(H / g), CN = CW * CH;
  const { lakes, riverClass } = hydro;

  // Cost of entering each cell; Infinity where a road cannot go.
  const cost = new Float32Array(CN).fill(Infinity);
  const bridge = new Uint8Array(CN);
  const px = (x, y) => Math.min(H - 1, Math.floor(y)) * W + Math.min(W - 1, Math.floor(x));
  for (let cy = 0; cy < CH; cy++) for (let cx = 0; cx < CW; cx++) {
    const x0 = cx * g, y0 = cy * g;
    let ok = true, e = 0, emax = 0, emin = 9, riv = 0;
    for (const [ax, ay] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75], [0.5, 0.5]]) {
      const i = px(x0 + ax * g, y0 + ay * g);
      if (!land[i] || lakes[i]) { ok = false; break; }
      e += elev[i] / 5; emax = Math.max(emax, elev[i]); emin = Math.min(emin, elev[i]);
      riv = Math.max(riv, riverClass[i]);
    }
    if (!ok) continue;
    const slope = (emax - emin) / (g * 0.7);
    let c = 1 + 9 * Math.max(0, e - 0.12) ** 1.4 * 6 + slope * 260;
    if (e > 0.5) c *= 4;
    if (e > 0.62) c *= 6;
    if (riv >= 2) { c += 4 + riv * 2; bridge[cy * CW + cx] = 1; }
    cost[cy * CW + cx] = c;
  }
  const built = new Float32Array(CN).fill(1); // falls where a road already runs

  const cellOf = (x, y) => clamp(Math.floor(y / g), 0, CH - 1) * CW + clamp(Math.floor(x / g), 0, CW - 1);
  // The passable cell nearest a point (a settlement on a pixel the grid calls water).
  const snap = (x, y) => {
    const c0 = cellOf(x, y);
    if (cost[c0] < Infinity) return c0;
    for (let rad = 1; rad < 6; rad++) for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      const cx = (c0 % CW) + dx, cy = Math.floor(c0 / CW) + dy;
      if (cx < 0 || cy < 0 || cx >= CW || cy >= CH) continue;
      if (cost[cy * CW + cx] < Infinity) return cy * CW + cx;
    }
    return -1;
  };

  const heap = new Heap(CN * 4);
  const dist = new Float64Array(CN), prev = new Int32Array(CN), stamp = new Int32Array(CN);
  let round = 0;
  // A* from a to b; returns the cells, or null if b cannot be reached.
  const route = (a, b, limit) => {
    round++;
    heap.size = 0;
    const bx = b % CW, by = Math.floor(b / CW);
    const h = (c) => Math.hypot((c % CW) - bx, Math.floor(c / CW) - by) * 0.32;
    dist[a] = 0; prev[a] = -1; stamp[a] = round;
    heap.push(h(a), a);
    let pops = 0;
    while (heap.size) {
      const c = heap.pop();
      if (c === b) break;
      if (++pops > limit) return null;
      const cx = c % CW, cy = Math.floor(c / CW), dc = dist[c];
      for (let k = 0; k < 8; k++) {
        const nx = cx + DX[k], ny = cy + DY[k];
        if (nx < 0 || ny < 0 || nx >= CW || ny >= CH) continue;
        const n = ny * CW + nx;
        if (cost[n] === Infinity) continue;
        const diag = k & 1;
        // No corner-cutting past water.
        if (diag && (cost[cy * CW + nx] === Infinity || cost[ny * CW + cx] === Infinity)) continue;
        const nd = dc + (diag ? 1.4142 : 1) * 0.5 * (cost[c] * built[c] + cost[n] * built[n]);
        if (stamp[n] !== round || nd < dist[n]) {
          stamp[n] = round; dist[n] = nd; prev[n] = c;
          heap.push(nd + h(n), n);
        }
      }
    }
    if (stamp[b] !== round) return null;
    const cells = [];
    for (let c = b; c >= 0; c = prev[c]) cells.push(c);
    return cells.reverse();
  };

  const masses = landmasses(land, W, H);
  const massOf = (s) => masses.id[px(s.x, s.y)];
  const roads = [];
  const used = (cells, fall) => { for (const c of cells) built[c] = Math.min(built[c], fall); };
  const toPts = (cells, a, b) => {
    const pts = cells.map((c) => [((c % CW) + 0.5) * g, (Math.floor(c / CW) + 0.5) * g]);
    return simplifyOnLand(pts, 0.55 * S, land, lakes, W, H);
  };
  const join = (a, b, cls, limit) => {
    const ca = snap(a.x, a.y), cb = snap(b.x, b.y);
    if (ca < 0 || cb < 0 || ca === cb) return false;
    const cells = route(ca, cb, limit);
    if (!cells) return false;
    used(cells, cls === 'highway' ? 0.3 : cls === 'main' ? 0.45 : 0.6);
    roads.push({ cls, pts: toPts(cells), from: a, to: b, cells });
    return true;
  };
  const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

  // Highways: a spanning tree over each landmass's capitals and cities, plus
  // the shortcuts a network has where the tree goes the long way round.
  const big = settlements.filter((s) => s.rank <= RANK.CITY);
  const byMass = new Map();
  for (const s of big) { const m = massOf(s); if (m >= 0) { if (!byMass.has(m)) byMass.set(m, []); byMass.get(m).push(s); } }
  for (const [, group] of [...byMass.entries()].sort((a, b) => a[0] - b[0])) {
    const edges = spanningTree(group);
    const extra = [];
    for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
      const d = Math.sqrt(d2(group[i], group[j]));
      if (d < 260 * S) extra.push([i, j, d]);
    }
    extra.sort((a, b) => a[2] - b[2]);
    const adj = group.map(() => []);
    for (const [i, j] of edges) { adj[i].push([j, Math.sqrt(d2(group[i], group[j]))]); adj[j].push([i, Math.sqrt(d2(group[i], group[j]))]); }
    for (const [i, j, d] of extra) {
      if (edges.some(([a, b]) => (a === i && b === j) || (a === j && b === i))) continue;
      if (graphDist(adj, i, j) > d * 1.7) { edges.push([i, j]); adj[i].push([j, d]); adj[j].push([i, d]); }
    }
    for (const [i, j] of edges) join(group[i], group[j], 'highway', 120000);
  }

  // Main roads: every town to the nearest place already on the network, by a
  // tree grown out from the highways; then a few loops between near towns.
  const net = [...big];
  const towns = settlements.filter((s) => s.rank === RANK.TOWN);
  const linkInto = (list, pool, cls, reach, limit) => {
    const left = list.slice();
    while (left.length) {
      // The unlinked place nearest the network goes next.
      let best = -1, bestD = Infinity, bestTo = null;
      for (let k = 0; k < left.length; k++) {
        const s = left[k], m = massOf(s);
        for (const o of pool) {
          if (massOf(o) !== m) continue;
          const d = d2(s, o);
          if (d < bestD) { bestD = d; best = k; bestTo = o; }
        }
      }
      if (best < 0) break;
      const s = left.splice(best, 1)[0];
      if (Math.sqrt(bestD) <= reach) join(s, bestTo, cls, limit);
      pool.push(s);
    }
  };
  linkInto(towns, net, 'main', 140 * S, 40000);
  // Loops: towns near one another but far apart by road.
  for (let i = 0; i < towns.length; i++) {
    const a = towns[i];
    let best = null, bd = Infinity;
    for (const b of towns) {
      if (b === a || massOf(b) !== massOf(a)) continue;
      const d = d2(a, b);
      if (d < bd && d > (20 * S) ** 2 && d < (70 * S) ** 2) { bd = d; best = b; }
    }
    if (best && r.next() < 0.5) join(a, best, 'main', 12000);
  }

  // Local roads: each village to its nearest neighbour on the network.
  const villages = settlements.filter((s) => s.rank === RANK.VILLAGE);
  linkInto(villages, net, 'local', 60 * S, 6000);
  for (const a of villages) {
    if (r.next() < 0.35) {
      let best = null, bd = Infinity;
      for (const b of villages) {
        if (b === a || massOf(b) !== massOf(a)) continue;
        const d = d2(a, b);
        if (d < bd && d > (8 * S) ** 2 && d < (32 * S) ** 2) { bd = d; best = b; }
      }
      if (best) join(a, best, 'local', 3000);
    }
  }

  // Streets: a loose grid in each built-up area, turned to the town's own
  // angle, kept on land, denser near the middle.
  const streets = [];
  for (const s of settlements) {
    if (s.rank > RANK.TOWN) continue;
    const R = (s.rank === 0 ? 9.5 : s.rank === 1 ? 5.8 : 2.5) * S;
    const step = (s.rank === 2 ? 0.75 : 0.95) * S;
    const ang = r.next() * Math.PI, ca = Math.cos(ang), sa = Math.sin(ang);
    for (const axis of [0, 1]) {
      for (let k = -R; k <= R; k += step * (0.8 + 0.4 * r.next())) {
        // A line across the town at offset k, cut to the town's disc and the land.
        const half = Math.sqrt(Math.max(0, R * R - k * k)) * (0.65 + 0.35 * r.next());
        let run = [];
        for (let t = -half; t <= half + 1e-9; t += 0.2 * S) {
          const u = axis ? k : t, v = axis ? t : k;
          const x = s.x + u * ca - v * sa, y = s.y + u * sa + v * ca;
          const i = px(x, y);
          if (x > 0 && y > 0 && x < W && y < H && land[i] && !lakes[i]) run.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
          else { if (run.length > 1) streets.push([run[0], run[run.length - 1]]); run = []; }
        }
        if (run.length > 1) streets.push([run[0], run[run.length - 1]]);
      }
    }
  }

  // Ferries: across narrow sea between road ends on different landmasses.
  const ferries = [];
  const ports = settlements.filter((s) => s.rank <= RANK.TOWN && massOf(s) >= 0 && nearSea(s, land, W, H, 3.5 * S));
  const pairs = [];
  for (let i = 0; i < ports.length; i++) for (let j = i + 1; j < ports.length; j++) {
    const a = ports[i], b = ports[j];
    if (massOf(a) === massOf(b)) continue;
    const d = Math.sqrt(d2(a, b));
    if (d > 110 * S) continue;
    // Mostly over the sea.
    let onLand = 0, n = 0;
    for (let t = 0.12; t <= 0.88; t += 0.02) { n++; if (land[px(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)]) onLand++; }
    if (onLand / n > 0.08) continue;
    const ma = Math.min(massOf(a), massOf(b)), mb = Math.max(massOf(a), massOf(b));
    pairs.push({ a, b, d, key: ma + ':' + mb });
  }
  pairs.sort((p, q) => p.d - q.d);
  const linked = new Set();
  for (const p of pairs) {
    if (linked.has(p.key) || ferries.length >= 9) continue;
    linked.add(p.key);
    ferries.push([[p.a.x, p.a.y], [p.b.x, p.b.y]]);
  }

  // Shields on the highways: a route number at the middle of each longer
  // stretch; routes that cross a border get a green E-number.
  const shields = [];
  let next = 1 + r.int(9), enext = 1 + r.int(20);
  for (const road of roads) {
    if (road.cls !== 'highway') continue;
    const len = pathLength(road.pts);
    if (len < 70 * S) continue;
    const international = owner[px(road.from.x, road.from.y)] !== owner[px(road.to.x, road.to.y)];
    const text = international ? `E${enext}` : String(next);
    if (international) enext += 1 + r.int(9); else next += 1 + r.int(14);
    for (const t of len > 220 * S ? [0.3, 0.7] : [0.5]) {
      const [x, y] = pointAt(road.pts, len * t);
      shields.push({ x, y, text, kind: international ? 'e' : 'n' });
    }
  }

  return { roads, streets, ferries, shields, cellSize: g };
}

function nearSea(s, land, W, H, reach) {
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const x = Math.floor(s.x + Math.cos(a) * reach), y = Math.floor(s.y + Math.sin(a) * reach);
    if (x < 0 || y < 0 || x >= W || y >= H || !land[y * W + x]) return true;
  }
  return false;
}

export function pathLength(pts) {
  let l = 0;
  for (let k = 1; k < pts.length; k++) l += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
  return l;
}
export function pointAt(pts, at) {
  for (let k = 1; k < pts.length; k++) {
    const l = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    if (at <= l) { const t = l ? at / l : 0; return [pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * t, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * t]; }
    at -= l;
  }
  return pts[pts.length - 1];
}

// A Euclidean minimum spanning tree (Prim), as index pairs.
function spanningTree(nodes) {
  const n = nodes.length, inTree = new Uint8Array(n), best = new Float64Array(n).fill(Infinity), from = new Int32Array(n).fill(-1);
  const edges = [];
  if (!n) return edges;
  best[0] = 0;
  for (let it = 0; it < n; it++) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!inTree[i] && (u < 0 || best[i] < best[u])) u = i;
    inTree[u] = 1;
    if (from[u] >= 0) edges.push([from[u], u]);
    for (let v = 0; v < n; v++) {
      if (inTree[v]) continue;
      const d = Math.hypot(nodes[u].x - nodes[v].x, nodes[u].y - nodes[v].y);
      if (d < best[v]) { best[v] = d; from[v] = u; }
    }
  }
  return edges;
}

function graphDist(adj, a, b) {
  const d = new Float64Array(adj.length).fill(Infinity), done = new Uint8Array(adj.length);
  d[a] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < adj.length; i++) if (!done[i] && d[i] < Infinity && (u < 0 || d[i] < d[u])) u = i;
    if (u < 0) return Infinity;
    if (u === b) return d[u];
    done[u] = 1;
    for (const [v, w] of adj[u]) if (d[u] + w < d[v]) d[v] = d[u] + w;
  }
}

// Douglas–Peucker that never lets a shortened stretch leave the land.
function simplifyOnLand(pts, tol, land, lakes, W, H) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const ok = (a, b) => {
    const [x0, y0] = pts[a], [x1, y1] = pts[b];
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.4);
    for (let k = 1; k < n; k++) {
      const x = Math.floor(x0 + ((x1 - x0) * k) / n), y = Math.floor(y0 + ((y1 - y0) * k) / n);
      const i = y * W + x;
      if (x < 0 || y < 0 || x >= W || y >= H || !land[i] || lakes[i]) return false;
    }
    return true;
  };
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    if (b - a < 2) continue;
    let worst = -1, wd = 0;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const len = Math.hypot(bx - ax, by - ay) || 1e-9;
    for (let k = a + 1; k < b; k++) {
      const d = Math.abs((bx - ax) * (ay - pts[k][1]) - (ax - pts[k][0]) * (by - ay)) / len;
      if (d > wd) { wd = d; worst = k; }
    }
    if (wd > tol || !ok(a, b)) { keep[worst < 0 ? (a + b) >> 1 : worst] = 1; stack.push([a, worst < 0 ? (a + b) >> 1 : worst], [worst < 0 ? (a + b) >> 1 : worst, b]); }
  }
  return pts.filter((_, k) => keep[k]).map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
}

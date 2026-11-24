// Roads: an engineered network joining the settlements, in a hierarchy.
//
//   motorway   between the capitals and the largest cities, near-direct,
//              bending for terrain; across borders, with E-numbers
//   trunk      between all the cities (a Gabriel graph, so near neighbours)
//   secondary  between the towns and their neighbours
//   local      from each village to the nearest place
//
// Each route is found on a grid by A* (sixteen directions, so few staircase
// bends) over a cost that prefers low, gentle ground, pays to bridge a river,
// and keeps off high mountains; later routes are drawn onto roads already
// built, so they merge at junctions. The union of the routes is then cut into
// stretches between junctions, and each stretch is straightened where the
// ground allows (never over a crest the route went round) and its corners
// rounded, so the roads read as engineered: long straights and smooth curves.

import { Heap } from './hydro.mjs';
import { RANK } from './settlements.mjs';
import { clamp, makeNoise, fbm } from './rng.mjs';
import { landmasses } from './terrain.mjs';

export const ROAD_CLASSES = ['motorway', 'trunk', 'secondary', 'local'];
const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2], [2, -1]];

// buildRoads({ land, elev, hydro, owner, settlements, blocked, cultures, projects, width, height, rng })
//   => { roads: [{ cls, pts }], routes, shields: [{ x, y, text, sign, cls }], ferries, exits: Map(settlement -> [angles]) }
export function buildRoads({ land, elev, hydro, owner, settlements, blocked, cultures, projects, width, height, rng }) {
  const W = width, H = height, S = W / 1600, g = 1.6 * S;
  const r = rng.fork('roads');
  const nBend = makeNoise(r.fork('bends'));
  const CW = Math.floor(W / g), CH = Math.floor(H / g), CN = CW * CH;
  const { lakes, riverClass } = hydro;
  const px = (x, y) => clamp(Math.floor(y), 0, H - 1) * W + clamp(Math.floor(x), 0, W - 1);
  const passable = (i) => land[i] && !lakes[i] && !(blocked && blocked[i]);

  // Cost of entering each cell; Infinity where no road can go.
  const cost = new Float32Array(CN).fill(Infinity);
  for (let cy = 0; cy < CH; cy++) for (let cx = 0; cx < CW; cx++) {
    const x0 = cx * g, y0 = cy * g;
    let ok = true, e = 0, emax = 0, emin = 9, riv = 0;
    for (const [ax, ay] of [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8], [0.5, 0.5]]) {
      const i = px(x0 + ax * g, y0 + ay * g);
      if (!passable(i)) { ok = false; break; }
      e += elev[i] / 5; emax = Math.max(emax, elev[i]); emin = Math.min(emin, elev[i]);
      riv = Math.max(riv, riverClass[i]);
    }
    if (!ok) continue;
    const slope = (emax - emin) / (g * 0.6);
    let c = 1 + 6 * Math.max(0, e - 0.14) ** 1.3 + slope * slope * 9000 + slope * 120;
    if (e > 0.46) c *= 3;
    if (e > 0.58) c *= 8;
    if (riv >= 2) c += 3 + riv * 2;
    cost[cy * CW + cx] = c;
  }
  const built = new Float32Array(CN).fill(1);
  const cellOf = (x, y) => clamp(Math.floor(y / g), 0, CH - 1) * CW + clamp(Math.floor(x / g), 0, CW - 1);
  // The passable cell nearest a place whose centre the place reaches over land.
  const reach = (x, y, c) => {
    const tx = ((c % CW) + 0.5) * g, ty = (Math.floor(c / CW) + 0.5) * g;
    const n = Math.max(1, Math.ceil(Math.hypot(tx - x, ty - y) / (0.25 * S)));
    for (let k = 0; k <= n; k++) if (!passable(px(x + ((tx - x) * k) / n, y + ((ty - y) * k) / n))) return false;
    return true;
  };
  const snap = (x, y) => {
    const c0 = cellOf(x, y);
    if (cost[c0] < Infinity && reach(x, y, c0)) return c0;
    for (let rad = 1; rad < 5; rad++) for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      const cx = (c0 % CW) + dx, cy = Math.floor(c0 / CW) + dy;
      if (cx < 0 || cy < 0 || cx >= CW || cy >= CH) continue;
      if (cost[cy * CW + cx] < Infinity && reach(x, y, cy * CW + cx)) return cy * CW + cx;
    }
    return -1;
  };

  const heap = new Heap(CN * 2);
  const dist = new Float64Array(CN), prev = new Int32Array(CN), stamp = new Int32Array(CN);
  let round = 0;
  const route = (a, b, limit, reuse) => {
    round++;
    heap.size = 0;
    const bx = b % CW, by = Math.floor(b / CW);
    // Weighted a little past admissible, for speed: routes stay within a few per cent of the cheapest.
    const h = (c) => Math.hypot((c % CW) - bx, Math.floor(c / CW) - by) * (reuse < 1 ? reuse : 1) * 1.15;
    dist[a] = 0; prev[a] = -1; stamp[a] = round;
    heap.push(h(a), a);
    let pops = 0;
    while (heap.size) {
      const c = heap.pop();
      if (c === b) break;
      if (++pops > limit) return null;
      const cx = c % CW, cy = Math.floor(c / CW), dc = dist[c];
      const kc = cost[c] * (built[c] < 1 ? reuse : 1);
      for (let k = 0; k < 16; k++) {
        const [dx, dy] = DIRS[k];
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= CW || ny >= CH) continue;
        const n = ny * CW + nx;
        if (cost[n] === Infinity) continue;
        let mid = 0;
        if (k >= 8) {
          // A knight's move passes two cells; both must be passable.
          const m1 = (cy + Math.trunc(dy / 2)) * CW + cx + Math.trunc(dx / 2), m2 = (cy + Math.round(dy / 2)) * CW + cx + Math.round(dx / 2);
          if (cost[m1] === Infinity || cost[m2] === Infinity) continue;
          mid = (cost[m1] * (built[m1] < 1 ? reuse : 1) + cost[m2] * (built[m2] < 1 ? reuse : 1)) / 2;
        } else if (k & 1) {
          if (cost[cy * CW + nx] === Infinity || cost[ny * CW + cx] === Infinity) continue;
        }
        const kn = cost[n] * (built[n] < 1 ? reuse : 1);
        const len = Math.hypot(dx, dy);
        const step = k >= 8 ? len * (kc + 2 * mid + kn) / 4 : len * (kc + kn) / 2;
        const nd = dc + step;
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
  const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  // The network: edges between grid cells, each with the best class that uses it.
  const edges = new Map();
  const nodeOf = new Map(); // settlement cell -> settlement
  const routes = [];
  const uf = settlements.map((_, k) => k);
  const find = (k) => (uf[k] === k ? k : (uf[k] = find(uf[k])));
  const idx = new Map(settlements.map((s, k) => [s, k]));
  // Roads already built are cheaper to follow, so routes share them instead of running alongside.
  const REUSE = [0.8, 0.5, 0.45, 0.42];
  let failed = 0;
  const failures = [];
  const join = (a, b, cls) => {
    const ca = snap(a.x, a.y), cb = snap(b.x, b.y);
    if (ca < 0 || cb < 0 || ca === cb) return false;
    const dd = Math.sqrt(d2(a, b)) / g;
    const cells = route(ca, cb, 6000 + dd * dd * (cls <= 1 ? 40 : 16), REUSE[cls]);
    if (!cells) { failed++; failures.push([cls, Math.round(dd * g)]); return false; }
    nodeOf.set(ca, a); nodeOf.set(cb, b);
    for (let k = 1; k < cells.length; k++) {
      const p = cells[k - 1], q = cells[k];
      const key = p < q ? p * CN + q : q * CN + p;
      const old = edges.get(key);
      if (old === undefined || cls < old) edges.set(key, cls);
      built[p] = built[q] = Math.min(built[p], 0.99);
    }
    routes.push({ cls, a, b, cells });
    uf[find(idx.get(a))] = find(idx.get(b));
    return true;
  };
  const netDist = (adj, s, t) => {
    const n = adj.length, d = new Float64Array(n).fill(Infinity), done = new Uint8Array(n);
    d[s] = 0;
    for (;;) {
      let u = -1;
      for (let i = 0; i < n; i++) if (!done[i] && d[i] < Infinity && (u < 0 || d[i] < d[u])) u = i;
      if (u < 0 || u === t) return d[t];
      done[u] = 1;
      for (const [v, w] of adj[u]) if (d[u] + w < d[v]) d[v] = d[u] + w;
    }
  };

  // Group places by landmass.
  const byMass = new Map();
  for (const s of settlements) { const m = massOf(s); if (m < 0) continue; if (!byMass.has(m)) byMass.set(m, []); byMass.get(m).push(s); }
  const massList = [...byMass.entries()].sort((a, b) => a[0] - b[0]);

  // ---- Motorways: the capitals and the largest cities, a tree and its shortcuts. ----
  for (const [, all] of massList) {
    const big = all.filter((s) => s.rank === RANK.CAPITAL || (s.rank === RANK.CITY && s.size > 1.15));
    if (big.length < 2) continue;
    const edgesM = spanningTree(big);
    const adj = big.map(() => []);
    const add = (i, j) => { const d = Math.sqrt(d2(big[i], big[j])); adj[i].push([j, d]); adj[j].push([i, d]); edgesM.push([i, j]); };
    const tree = edgesM.splice(0);
    for (const [i, j] of tree) add(i, j);
    const pairs = [];
    for (let i = 0; i < big.length; i++) for (let j = i + 1; j < big.length; j++) { const d = Math.sqrt(d2(big[i], big[j])); if (d < 420 * S) pairs.push([i, j, d]); }
    pairs.sort((p, q) => p[2] - q[2]);
    for (const [i, j, d] of pairs) if (netDist(adj, i, j) > d * 1.42) add(i, j);
    for (const [i, j] of edgesM) join(big[i], big[j], 0);
  }

  // ---- Trunk roads: every city, by a Gabriel graph (and a tree, so all are joined). ----
  for (const [, all] of massList) {
    const cities = all.filter((s) => s.rank <= RANK.CITY);
    if (cities.length < 2) continue;
    const pairs = new Set();
    for (const [i, j] of spanningTree(cities)) pairs.add(i < j ? `${i}:${j}` : `${j}:${i}`);
    for (const [i, j] of gabriel(cities, 240 * S)) pairs.add(i < j ? `${i}:${j}` : `${j}:${i}`);
    for (const key of [...pairs].sort()) {
      const [i, j] = key.split(':').map(Number);
      const a = cities[i], b = cities[j];
      if (routes.some((q) => q.cls === 0 && ((q.a === a && q.b === b) || (q.a === b && q.b === a)))) continue;
      join(a, b, 1);
    }
  }

  // ---- Secondary roads: the towns and their neighbours (a relative neighbourhood graph). ----
  for (const [, all] of massList) {
    const places = all.filter((s) => s.rank <= RANK.TOWN);
    const rn = relativeNeighbours(places, 120 * S);
    rn.sort((p, q) => d2(places[p[0]], places[p[1]]) - d2(places[q[0]], places[q[1]]));
    for (const [i, j] of rn) {
      const a = places[i], b = places[j];
      if (a.rank !== RANK.TOWN && b.rank !== RANK.TOWN) continue;
      join(a, b, 2);
    }
  }

  // ---- Local roads: each village to its nearest place, and some to a second. ----
  for (const [, all] of massList) {
    const villages = all.filter((s) => s.rank === RANK.VILLAGE);
    for (const v of villages) {
      const near = all.filter((o) => o !== v).map((o) => [o, d2(v, o)]).sort((p, q) => p[1] - q[1]).slice(0, 3);
      if (!near.length || near[0][1] > (55 * S) ** 2) continue;
      join(v, near[0][0], 3);
      if (near[1] && near[1][1] < (32 * S) ** 2 && r.next() < 0.45) {
        const a0 = Math.atan2(near[0][0].y - v.y, near[0][0].x - v.x), a1 = Math.atan2(near[1][0].y - v.y, near[1][0].x - v.x);
        let da = Math.abs(a0 - a1); if (da > Math.PI) da = 2 * Math.PI - da;
        if (da > 1.2) join(v, near[1][0], 3);
      }
    }
  }

  // ---- Every place on a landmass joined: link stray groups to the rest. ----
  for (const [, all] of massList) {
    for (let guard = 0; guard < 40; guard++) {
      const groups = new Map();
      for (const s of all) { const k = find(idx.get(s)); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(s); }
      if (groups.size < 2) break;
      const list = [...groups.values()].sort((a, b) => b.length - a.length);
      const main = list[0];
      let best = null, bd = Infinity;
      for (const grp of list.slice(1)) for (const s of grp) for (const o of main) { const d = d2(s, o); if (d < bd) { bd = d; best = [s, o]; } }
      if (!best || !join(best[0], best[1], best[0].rank <= RANK.TOWN && best[1].rank <= RANK.TOWN ? 2 : 3)) {
        // Unreachable over land (a range or water in the way): leave it be.
        if (best) uf[find(idx.get(best[0]))] = find(idx.get(best[1]));
      }
    }
  }

  // ---- The network, cut into stretches between junctions. ----
  const adjN = new Map();
  for (const [key, cls] of edges) {
    const p = Math.floor(key / CN), q = key % CN;
    if (!adjN.has(p)) adjN.set(p, []);
    if (!adjN.has(q)) adjN.set(q, []);
    adjN.get(p).push([q, cls]); adjN.get(q).push([p, cls]);
  }
  const isNode = (c) => {
    const a = adjN.get(c);
    if (!a || a.length !== 2 || nodeOf.has(c)) return true;
    return a[0][1] !== a[1][1];
  };
  const seen = new Set();
  const stretches = [];
  const walk = (start, first) => {
    const cells = [start];
    let prevC = start, cur = first[0];
    const cls = first[1];
    const mark = (a, b) => seen.add(a < b ? a * CN + b : b * CN + a);
    mark(start, cur);
    cells.push(cur);
    while (!isNode(cur)) {
      const nxt = adjN.get(cur).find(([q]) => q !== prevC);
      if (!nxt) break;
      const key = cur < nxt[0] ? cur * CN + nxt[0] : nxt[0] * CN + cur;
      if (seen.has(key)) break;
      mark(cur, nxt[0]);
      prevC = cur; cur = nxt[0];
      cells.push(cur);
      if (cur === start) break;
    }
    stretches.push({ cls, cells });
  };
  const nodes = [...adjN.keys()].sort((a, b) => a - b);
  for (const c of nodes) {
    if (!isNode(c)) continue;
    for (const e of adjN.get(c).slice().sort((a, b) => a[0] - b[0])) {
      const key = c < e[0] ? c * CN + e[0] : e[0] * CN + c;
      if (!seen.has(key)) walk(c, e);
    }
  }
  for (const c of nodes) for (const e of adjN.get(c)) {
    const key = c < e[0] ? c * CN + e[0] : e[0] * CN + c;
    if (!seen.has(key)) walk(c, e);
  }

  // ---- Straighten and round each stretch. ----
  const centre = (c) => {
    const s = nodeOf.get(c);
    return s ? [s.x, s.y] : [((c % CW) + 0.5) * g, (Math.floor(c / CW) + 0.5) * g];
  };
  const onLand = (x, y) => passable(px(x, y));
  const segOk = (a, b, emax, emin) => {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (0.35 * S)));
    for (let k = 0; k <= n; k++) {
      const x = a[0] + ((b[0] - a[0]) * k) / n, y = a[1] + ((b[1] - a[1]) * k) / n;
      const i = px(x, y);
      if (!passable(i)) return false;
      if (emax !== undefined && (elev[i] > emax + 0.012 || elev[i] < emin - 0.05)) return false;
    }
    return true;
  };
  const roads = [];
  for (const st of stretches) {
    const pts = st.cells.map(centre);
    const es = st.cells.map((c) => elev[px(...centre(c))]);
    // String-pulling: from each kept point, the furthest point a straight line reaches without climbing higher
    // than the route did between them.
    const keep = [pts[0]];
    let i = 0;
    const maxRun = [26, 18, 12, 9][st.cls];
    while (i < pts.length - 1) {
      let j = Math.min(pts.length - 1, i + maxRun), best = i + 1;
      for (; j > i + 1; j--) {
        let hi = -1, lo = 9;
        for (let q = i; q <= j; q++) { hi = Math.max(hi, es[q]); lo = Math.min(lo, es[q]); }
        if (segOk(pts[i], pts[j], hi, lo)) { best = j; break; }
      }
      keep.push(pts[best]);
      i = best;
    }
    // Long straights get a gentle sweep, as a surveyed road has: two points a third of the way along, nudged
    // sideways by a few per cent of the length (by a smooth noise, so it is the same wherever two roads meet).
    const swept = [keep[0]];
    for (let k = 1; k < keep.length; k++) {
      const a = keep[k - 1], b = keep[k];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len > 7 * S) {
        const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        const off = len * 0.045 * fbm(nBend, mx / (60 * S), my / (60 * S), 2);
        const p1 = [a[0] + (b[0] - a[0]) / 3 + nx * off, a[1] + (b[1] - a[1]) / 3 + ny * off];
        const p2 = [a[0] + (2 * (b[0] - a[0])) / 3 + nx * off * 0.8, a[1] + (2 * (b[1] - a[1])) / 3 + ny * off * 0.8];
        if (segOk(a, p1) && segOk(p1, p2) && segOk(p2, b)) { swept.push(p1, p2); }
      }
      swept.push(b);
    }
    // Rounded corners (Chaikin), wherever the rounded line still keeps to the land.
    let line = swept;
    for (let it = 0; it < 3; it++) {
      if (line.length < 3) break;
      const nx = [line[0]];
      for (let k = 1; k < line.length - 1; k++) {
        const a = line[k - 1], b = line[k], c = line[k + 1];
        const p = [b[0] + (a[0] - b[0]) * 0.25, b[1] + (a[1] - b[1]) * 0.25], q = [b[0] + (c[0] - b[0]) * 0.25, b[1] + (c[1] - b[1]) * 0.25];
        if (onLand(p[0], p[1]) && onLand(q[0], q[1]) && segOk(p, q)) { nx.push(p, q); } else nx.push(b);
      }
      nx.push(line[line.length - 1]);
      line = nx;
    }
    // Where a step between grid cells clips a corner of the sea, the road breaks there rather than cross it.
    let run = [line[0]];
    const flush = () => { if (run.length > 1) roads.push({ cls: ROAD_CLASSES[st.cls], pts: run.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]) }); };
    for (let k = 1; k < line.length; k++) {
      if (segOk(run[run.length - 1], line[k])) run.push(line[k]);
      else { flush(); run = [line[k]]; }
    }
    flush();
  }

  // ---- Where roads leave each place (for its arterial streets). ----
  const exits = new Map();
  for (const road of roads) {
    for (const [end, nxt] of [[0, 1], [road.pts.length - 1, road.pts.length - 2]]) {
      const p = road.pts[end];
      for (const s of settlements) {
        if (Math.abs(s.x - p[0]) > 0.01 || Math.abs(s.y - p[1]) > 0.01) continue;
        // Look a few units down the road, for its general heading.
        let k = nxt, far = road.pts[nxt];
        const step = end === 0 ? 1 : -1;
        while (k >= 0 && k < road.pts.length && Math.hypot(road.pts[k][0] - p[0], road.pts[k][1] - p[1]) < 3 * S) { far = road.pts[k]; k += step; }
        if (!exits.has(s)) exits.set(s, []);
        exits.get(s).push({ angle: Math.atan2(far[1] - p[1], far[0] - p[0]), cls: road.cls });
      }
    }
  }

  // ---- Ferries: across narrow sea between road ends on different landmasses. ----
  const ferries = [];
  const ports = settlements.filter((s) => s.rank <= RANK.TOWN && massOf(s) >= 0 && nearSea(s, land, W, H, 3.5 * S));
  const pairs = [];
  for (let i = 0; i < ports.length; i++) for (let j = i + 1; j < ports.length; j++) {
    const a = ports[i], b = ports[j];
    if (massOf(a) === massOf(b)) continue;
    const d = Math.sqrt(d2(a, b));
    if (d > 110 * S) continue;
    let onL = 0, n = 0;
    for (let t = 0.12; t <= 0.88; t += 0.02) { n++; if (land[px(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)]) onL++; }
    if (onL / n > 0.08) continue;
    pairs.push({ a, b, d, key: Math.min(massOf(a), massOf(b)) + ':' + Math.max(massOf(a), massOf(b)) });
  }
  pairs.sort((p, q) => p.d - q.d);
  const linked = new Set();
  for (const p of pairs) {
    if (linked.has(p.key) || ferries.length >= 10) continue;
    linked.add(p.key);
    ferries.push([[p.a.x, p.a.y], [p.b.x, p.b.y]]);
  }

  // ---- Route numbers, in each country's own style. ----
  const shields = [];
  const counters = projects.map(() => [1 + r.int(5), 1 + r.int(9), 20 + r.int(60)]);
  let eNum = 5 + r.int(20);
  const placedShields = [];
  // The road point nearest a route's point, on a road of its class or better.
  const G2 = 8 * S, gw = Math.ceil(W / G2), gh = Math.ceil(H / G2);
  const vgrid = Array.from({ length: gw * gh }, () => []);
  roads.forEach((road) => { const ci = ROAD_CLASSES.indexOf(road.cls); for (const p of road.pts) vgrid[clamp(Math.floor(p[1] / G2), 0, gh - 1) * gw + clamp(Math.floor(p[0] / G2), 0, gw - 1)].push([p, ci]); });
  const nearestOn = (x, y, cls) => {
    let best = null, bd = 3 * S;
    const gx = Math.floor(x / G2), gy = Math.floor(y / G2);
    for (let yy = gy - 1; yy <= gy + 1; yy++) for (let xx = gx - 1; xx <= gx + 1; xx++) {
      if (yy < 0 || xx < 0 || yy >= gh || xx >= gw) continue;
      for (const [p, ci] of vgrid[yy * gw + xx]) { if (ci > cls) continue; const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = p; } }
    }
    return best;
  };
  for (const rt of routes) {
    if (rt.cls > 2) continue;
    const mid = rt.cells[rt.cells.length >> 1];
    const mx = ((mid % CW) + 0.5) * g, my = (Math.floor(mid / CW) + 0.5) * g;
    const k = owner[px(mx, my)];
    if (k < 0) continue;
    const style = cultures[k].route;
    const across = rt.cls === 0 && owner[px(rt.a.x, rt.a.y)] !== owner[px(rt.b.x, rt.b.y)];
    let text, sign;
    if (across) { text = `E${eNum}`; sign = 'euro'; eNum += 2 + r.int(12); }
    else if (rt.cls === 0) { text = style.motorway(counters[k][0]); sign = style.mSign; counters[k][0] += 1 + r.int(3); }
    else if (rt.cls === 1) { text = style.trunk(counters[k][1]); sign = style.sign; counters[k][1] += 1 + r.int(6); }
    else { text = style.trunk(counters[k][2]); sign = style.sign; counters[k][2] += 1 + r.int(40); }
    const len = rt.cells.length * g;
    const spots = len > 260 * S ? [0.25, 0.5, 0.75] : len > 120 * S ? [0.33, 0.67] : len > 26 * S ? [0.5] : [];
    for (const t of spots) {
      const c = rt.cells[Math.floor(t * (rt.cells.length - 1))];
      const p = nearestOn(((c % CW) + 0.5) * g, (Math.floor(c / CW) + 0.5) * g, rt.cls);
      if (!p) continue;
      if (placedShields.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 34 * S)) continue;
      placedShields.push(p);
      shields.push({ x: p[0], y: p[1], text, sign, cls: ROAD_CLASSES[rt.cls] });
    }
  }

  return { roads, routes, shields, ferries, exits, cellSize: g, failed, failures };
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

// A Euclidean minimum spanning tree (Prim), as index pairs.
function spanningTree(nodes) {
  const n = nodes.length, inTree = new Uint8Array(n), best = new Float64Array(n).fill(Infinity), from = new Int32Array(n).fill(-1);
  const out = [];
  if (!n) return out;
  best[0] = 0;
  for (let it = 0; it < n; it++) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!inTree[i] && (u < 0 || best[i] < best[u])) u = i;
    inTree[u] = 1;
    if (from[u] >= 0) out.push([from[u], u]);
    for (let v = 0; v < n; v++) {
      if (inTree[v]) continue;
      const d = Math.hypot(nodes[u].x - nodes[v].x, nodes[u].y - nodes[v].y);
      if (d < best[v]) { best[v] = d; from[v] = u; }
    }
  }
  return out;
}

// Gabriel graph: i and j are joined when no other place lies inside the circle on their segment.
function gabriel(nodes, maxLen) {
  const out = [];
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const a = nodes[i], b = nodes[j];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d > maxLen) continue;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, rr = (d / 2) ** 2;
    let ok = true;
    for (let k = 0; k < nodes.length && ok; k++) if (k !== i && k !== j && (nodes[k].x - mx) ** 2 + (nodes[k].y - my) ** 2 < rr) ok = false;
    if (ok) out.push([i, j]);
  }
  return out;
}

// Relative neighbourhood graph: i and j are joined when no place is nearer both than they are to each other.
function relativeNeighbours(nodes, maxLen) {
  const out = [];
  const n = nodes.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = nodes[i], b = nodes[j];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d > maxLen) continue;
    let ok = true;
    for (let k = 0; k < n && ok; k++) {
      if (k === i || k === j) continue;
      const c = nodes[k];
      if (Math.abs(c.x - a.x) > d && Math.abs(c.x - b.x) > d) continue;
      if (Math.max(Math.hypot(c.x - a.x, c.y - a.y), Math.hypot(c.x - b.x, c.y - b.y)) < d) ok = false;
    }
    if (ok) out.push([i, j]);
  }
  return out;
}

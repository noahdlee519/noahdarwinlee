import { mendFaces, findMouths } from "./mend-faces.mjs";
// Slivers zipped shut: where two drawings of one border run a hair apart (a wartime piece cut from one source against the
// state beside it from another, or one line rounded to two neighbouring steps of the grid), the topology holds two lines
// with a thin face between them, and neither line is shared. The page draws a line that only one live shape uses as that
// shape's edge against ownerless land, with its band of colour, so each such face showed as a stray stroke or blob inside a
// country or doubled a border (Hungary, Germany, Romania, and the Reichskommissariats in March 1943).
//
// zipSlivers(topo, wKm) finds the faces of the file's lines (every date's together), and closes each face that is
//   - thin: its area over half its outline (its mean width) is under wKm and it is long for its size (4πA/P² under ROUND),
//     its two sides lying along each other all the way (no further apart than REACH × wKm); or no larger than CELLS steps
//     of the grid, whatever its shape (one point rounded two ways);
//     or a gap: no shape at any date has it inside these lines, it is under GAP_KM2, and its mean width is under GAP_KM
//     (two drawings of a border a kilometre or two apart, with nothing claiming the land between);
//   - inland: the face across each of its lines is land some shape covers at some date, so a spit or an island along a
//     coast, however thin, is left alone;
//   - made of two or more lines between two or more meeting points (a tiny enclave drawn as one closed line is left).
// A face is closed by running both of its sides along one line: the side with more points, with the other side's meeting
// points spliced in where they lie nearest, so no meeting point moves and no line outside the face is touched. Shapes
// that were only the face are left empty (a MultiPolygon of no polygons). The topology must be quantized, with rings wound as outward() leaves them
// (a shape's inside to the right of its lines).
const ROUND = 0.2, AREA_PER_KM = 20, CELLS = 3, GAP_KM2 = 60, GAP_KM = 3, REACH = 4, PASSES = 12, FAR_SCAN = 400;

export function zipSlivers(topo, wKm) {
  const t = topo.transform, geoms = topo.objects.p.geometries;
  let arcs = topo.arcs.map((arc) => { let x = 0, y = 0; return arc.map((p) => { x += p[0]; y += p[1]; return [x, y]; }); });
  const key = (p) => p[0] * 4194304 + p[1];
  const eachRing = (f) => { for (const g of geoms) { if (g.type === "Polygon") g.arcs = g.arcs.map((r, i) => f(r, i > 0)); else if (g.type === "MultiPolygon") g.arcs = g.arcs.map((poly) => poly.map((r, i) => f(r, i > 0))); } };
  // A ring's area in km², signed: negative for a ring wound with its inside to the right.
  const signed = (ring) => {
    let sum = 0, p0 = null, prev = null, kx = 0, ky = 0;
    for (const a of ring) {
      const l = a < 0 ? arcs[~a].slice().reverse() : arcs[a];
      for (const p of l) {
        if (!p0) { p0 = p; kx = t.scale[0] * 111.32 * Math.cos(((p[1] * t.scale[1] + t.translate[1]) * Math.PI) / 180); ky = t.scale[1] * 110.57; }
        if (prev) sum += (prev[0] - p0[0]) * kx * (p[1] - p0[1]) * ky - (p[0] - p0[0]) * kx * (prev[1] - p0[1]) * ky;
        prev = p;
      }
    }
    return [sum / 2, kx * ky];
  };
  const stats = { closed: 0, passes: 0, km2: 0, dropped: 0, turned: 0, apart: 0 };
  for (let pass = 0; pass < PASSES; pass++) {
    const n = arcs.length, use = new Uint32Array(2 * n);
    eachRing((ring) => { for (const a of ring) use[a < 0 ? 2 * ~a + 1 : 2 * a]++; return ring; });
    // Half-edges: 2k runs along arc k, 2k + 1 against it. Each node lists the half-edges that leave it, by angle.
    const nodes = new Map(), origin = new Float64Array(2 * n), ok = new Uint8Array(n);
    for (let k = 0; k < n; k++) {
      const a = arcs[k], m = a.length;
      if (!(use[2 * k] + use[2 * k + 1]) || m < 2 || (m === 2 && key(a[0]) === key(a[1]))) continue;
      ok[k] = 1;
      const ends = [[2 * k, a[0], a[1]], [2 * k + 1, a[m - 1], a[m - 2]]];
      for (const [h, p, q] of ends) {
        const id = key(p);
        origin[h] = id;
        if (!nodes.has(id)) nodes.set(id, []);
        nodes.get(id).push([Math.atan2(q[1] - p[1], q[0] - p[0]), h]);
      }
    }
    const at = new Int32Array(2 * n);
    for (const l of nodes.values()) { l.sort((a, b) => a[0] - b[0] || a[1] - b[1]); l.forEach((e, i) => { at[e[1]] = i; }); }
    // The face to the right of a half-edge: at its end, the next line anticlockwise from the way back.
    const next = (h) => { const l = nodes.get(origin[h ^ 1]); return l[(at[h ^ 1] + 1) % l.length][1]; };
    const cycleOf = new Int32Array(2 * n).fill(-1), cycles = [];
    for (let k = 0; k < n; k++) if (ok[k]) for (const h0 of [2 * k, 2 * k + 1]) {
      if (cycleOf[h0] >= 0) continue;
      const hs = [];
      let h = h0, owned = false;
      do { cycleOf[h] = cycles.length; hs.push(h); if (use[h]) owned = true; h = next(h); } while (h !== h0 && hs.length < 1e6);
      cycles.push({ hs, owned });
    }
    const line = (h) => (h & 1 ? arcs[h >> 1].slice().reverse() : arcs[h >> 1]);
    const cand = [];
    cycles.forEach((c, ci) => {
      const m = c.hs.length;
      if (m < 2 || m > 4000) return;
      const p0 = arcs[c.hs[0] >> 1][0], lat = p0[1] * t.scale[1] + t.translate[1], kx = t.scale[0] * 111.32 * Math.cos((lat * Math.PI) / 180), ky = t.scale[1] * 110.57;
      let area = 0, per = 0;
      for (const h of c.hs) {
        const l = line(h);
        for (let i = 0; i + 1 < l.length; i++) {
          const ax = (l[i][0] - p0[0]) * kx, ay = (l[i][1] - p0[1]) * ky, bx = (l[i + 1][0] - p0[0]) * kx, by = (l[i + 1][1] - p0[1]) * ky;
          area += ax * by - bx * ay; per += Math.hypot(bx - ax, by - ay);
        }
      }
      area /= 2;
      // A bounded face is walked clockwise (it lies to the right): its area is negative or nothing.
      if (area > 1e-9 || !per) return;
      const A = -area;
      const gap = !c.owned && A < GAP_KM2 && (4 * A) / per < GAP_KM;
      if (!gap && A > CELLS * kx * ky && ((4 * A) / per >= wKm || (4 * Math.PI * A) / (per * per) >= ROUND)) return;
      const seenArc = new Set(), seenNode = new Set();
      for (const h of c.hs) {
        if (seenArc.has(h >> 1) || seenNode.has(origin[h])) return;
        seenArc.add(h >> 1); seenNode.add(origin[h]);
        const o = cycles[cycleOf[h ^ 1]];
        if (cycleOf[h ^ 1] === ci || !o.owned) return;
      }
      cand.push({ c, A, kx, ky, gap });
    });
    if (!cand.length) break;
    cand.sort((a, b) => a.A - b.A);
    const busy = new Uint8Array(n), repl = new Map();
    let done = 0;
    for (const { c, A, kx, ky, gap } of cand) {
      if (c.hs.some((h) => busy[h >> 1])) continue;
      const m = c.hs.length, pts = c.hs.map((h) => (h & 1 ? arcs[h >> 1][arcs[h >> 1].length - 1] : arcs[h >> 1][0]));
      const d2 = (p, q) => ((p[0] - q[0]) * kx) ** 2 + ((p[1] - q[1]) * ky) ** 2;
      // The two meeting points furthest apart are the face's ends.
      let ia = 0, ib = 1, far = -1;
      if (m <= FAR_SCAN) { for (let i = 0; i < m; i++) for (let j = i + 1; j < m; j++) { const d = d2(pts[i], pts[j]); if (d > far) { far = d; ia = i; ib = j; } } }
      else {
        let j0 = 0;
        for (let j = 1; j < m; j++) { const d = d2(pts[0], pts[j]); if (d > far) { far = d; j0 = j; } }
        far = -1; ia = j0;
        for (let j = 0; j < m; j++) { const d = d2(pts[j0], pts[j]); if (d > far) { far = d; ib = j; } }
        if (ia > ib) { const s = ia; ia = ib; ib = s; }
      }
      if (ia === ib) continue;
      const P = c.hs.slice(ia, ib), Q = c.hs.slice(ib).concat(c.hs.slice(0, ia));
      const count = (l) => l.reduce((s, h) => s + arcs[h >> 1].length, 0);
      // The base runs from a to b: the side with more points, turned round if it is the side that comes back.
      const baseFwd = count(P) >= count(Q), baseHs = baseFwd ? P : Q, otherHs = baseFwd ? Q : P;
      let M = [];
      const nodeAt = [];
      baseHs.forEach((h, i) => { const l = line(h); nodeAt.push(i ? M.length - 1 : 0); M.push(...(i ? l.slice(1) : l)); });
      nodeAt.push(M.length - 1);
      let isNode = new Uint8Array(M.length);
      nodeAt.forEach((i) => { isNode[i] = 1; });
      if (!baseFwd) { M.reverse(); isNode.reverse(); }
      // The two sides must lie along each other: a face whose lines cross has an area near nothing however far apart they
      // run (the Tsardom of Russia took 43,000 km² of the Chukchi's land by one such face in a trial on the years 1600 to 1647).
      const O = [];
      otherHs.forEach((h, i) => { const l = line(h); O.push(...(i ? l.slice(1) : l)); });
      const off = (pts, to) => {
        let worst = 0;
        const stepP = Math.max(1, Math.floor((pts.length * to.length) / 2e6));
        for (let i = 0; i < pts.length; i += stepP) {
          const w = pts[i];
          let best = Infinity;
          for (let j = 0; j + 1 < to.length; j++) {
            const ax = to[j][0] * kx, ay = to[j][1] * ky, dx = to[j + 1][0] * kx - ax, dy = to[j + 1][1] * ky - ay, L = dx * dx + dy * dy;
            const u = L ? Math.max(0, Math.min(1, ((w[0] * kx - ax) * dx + (w[1] * ky - ay) * dy) / L)) : 0;
            const d = (w[0] * kx - ax - u * dx) ** 2 + (w[1] * ky - ay - u * dy) ** 2;
            if (d < best) best = d;
          }
          if (best > worst) worst = best;
        }
        return Math.sqrt(worst);
      };
      const reach = REACH * Math.max(gap ? GAP_KM : wKm, 1.5 * Math.hypot(kx, ky));
      if (O.length < 2 || M.length < 2 || off(O, M) > reach || off(M, O) > reach) { stats.apart++; continue; }
      const where = new Map();
      M.forEach((p, i) => { if (!where.has(key(p))) where.set(key(p), i); });
      const ins = [];
      let bad = false;
      otherHs.slice(1).forEach((h, oi) => {
        const w = line(h)[0], hit = where.get(key(w));
        if (hit !== undefined) { if (isNode[hit]) bad = true; isNode[hit] = 1; return; }
        let best = Infinity, seg = 0, tt = 0;
        for (let i = 0; i + 1 < M.length; i++) {
          const ax = M[i][0] * kx, ay = M[i][1] * ky, dx = M[i + 1][0] * kx - ax, dy = M[i + 1][1] * ky - ay, L = dx * dx + dy * dy;
          const u = L ? Math.max(0, Math.min(1, ((w[0] * kx - ax) * dx + (w[1] * ky - ay) * dy) / L)) : 0;
          const d = (w[0] * kx - ax - u * dx) ** 2 + (w[1] * ky - ay - u * dy) ** 2;
          if (d < best) { best = d; seg = i; tt = u; }
        }
        ins.push([seg, tt, oi, w]);
      });
      if (bad) continue;
      ins.sort((p, q) => p[0] - q[0] || p[1] - q[1] || (baseFwd ? q[2] - p[2] : p[2] - q[2]));
      if (ins.length) {
        const M2 = [], N2 = [];
        let q = 0;
        for (let i = 0; i < M.length; i++) {
          M2.push(M[i]); N2.push(isNode[i]);
          while (q < ins.length && ins[q][0] === i) { M2.push(ins[q][3]); N2.push(1); q++; }
        }
        M = M2; isNode = N2;
      }
      // The one line, cut at every meeting point; each old line of the face becomes the stretch between its two ends.
      const idx = new Map(), parts = [];
      let from = 0, cnt = 0;
      idx.set(key(M[0]), 0);
      for (let i = 1; i < M.length; i++) if (isNode[i] || i === M.length - 1) {
        if (idx.has(key(M[i]))) { bad = true; break; }
        parts.push(M.slice(from, i + 1)); idx.set(key(M[i]), ++cnt); from = i;
      }
      if (bad) continue;
      const fresh = [];
      for (const h of c.hs) {
        const a = arcs[h >> 1], x = idx.get(key(a[0])), y = idx.get(key(a[a.length - 1]));
        if (x === undefined || y === undefined || x === y) { bad = true; break; }
        fresh.push([h >> 1, x, y]);
      }
      if (bad) continue;
      const base = arcs.length;
      for (const p of parts) arcs.push(p);
      for (const [k, x, y] of fresh) {
        const path = [];
        if (x < y) for (let i = x; i < y; i++) path.push(base + i);
        else for (let i = x - 1; i >= y; i--) path.push(~(base + i));
        repl.set(k, path);
        busy[k] = 1;
      }
      done++; stats.km2 += A;
    }
    if (!done) break;
    stats.closed += done; stats.passes++;
    eachRing((ring, hole) => {
      if (!ring.some((a) => repl.has(a < 0 ? ~a : a))) return ring;
      const out = [];
      const push = (a) => { if (out.length && out[out.length - 1] === ~a) out.pop(); else out.push(a); };
      for (const a of ring) {
        const k = a < 0 ? ~a : a, p = repl.get(k);
        if (!p) push(a);
        else if (a < 0) for (let i = p.length - 1; i >= 0; i--) push(~p[i]);
        else for (const b of p) push(b);
      }
      while (out.length > 1 && out[0] === ~out[out.length - 1]) { out.shift(); out.pop(); }
      // A ring that was only the face goes (below).
      if (!out.length) return out;
      // A ring that crossed itself was two loops wound opposite ways, and closing the one leaves the other wound backwards
      // (the whole globe but a speck): such a ring goes if it is no larger than a sliver, and is turned round otherwise.
      const [was] = signed(ring), [is, cell] = signed(out);
      // What is left of a ring may be no more than the grid's own grain: it goes too.
      if (Math.abs(is) <= CELLS * cell) { stats.dropped++; return []; }
      if (hole ? is < 0 && was >= 0 : is > 0 && was <= 0) {
        if (Math.abs(is) <= CELLS * cell || Math.abs(is) < AREA_PER_KM * wKm) { stats.dropped++; return []; }
        stats.turned++;
        return out.slice().reverse().map((a) => ~a);
      }
      return out;
    });
    // A ring that is gone takes its polygon with it if it was the outside, and a shape with no polygon left is left empty.
    for (const g of geoms) {
      if (g.type === "Polygon") { if (!g.arcs[0].length) { g.type = "MultiPolygon"; g.arcs = []; } else g.arcs = g.arcs.filter((r) => r.length); }
      else if (g.type === "MultiPolygon") g.arcs = g.arcs.filter((poly) => poly[0].length).map((poly) => poly.filter((r) => r.length));
    }
  }
  // The lines no shape uses any more are taken out, and the list of needles follows.
  if (stats.closed) {
    const used = new Uint8Array(arcs.length);
    eachRing((ring) => { for (const a of ring) used[a < 0 ? ~a : a] = 1; return ring; });
    const to = new Int32Array(arcs.length).fill(-1), kept = [];
    arcs.forEach((a, k) => { if (used[k]) { to[k] = kept.length; kept.push(a); } });
    eachRing((ring) => ring.map((a) => (a < 0 ? ~to[~a] : to[a])));
    if (topo.needles) { topo.needles = topo.needles.filter((k) => to[k] >= 0 && used[k]).map((k) => to[k]); if (!topo.needles.length) delete topo.needles; }
    topo.arcs = kept.map((a) => a.map((p, i) => (i ? [p[0] - a[i - 1][0], p[1] - a[i - 1][1]] : p)));
  }
  return stats;
}

// Lines that cross or touch away from a meeting point are cut there, so that the faces between them can be found: two
// drawings of one border weave across each other, and a face is only a face where its lines meet at their ends. The
// crossing is rounded to the grid and becomes a point of both lines.
const CELL = 128, SNAP = 1.5;
export function planarize(topo) {
  const geoms = topo.objects.p.geometries;
  const arcs = topo.arcs.map((arc) => { let x = 0, y = 0; return arc.map((p) => { x += p[0]; y += p[1]; return [x, y]; }); });
  const n = arcs.length, first = new Int32Array(n + 1);
  for (let k = 0; k < n; k++) first[k + 1] = first[k] + Math.max(0, arcs[k].length - 1);
  const S = first[n], segArc = new Int32Array(S);
  for (let k = 0; k < n; k++) for (let i = first[k]; i < first[k + 1]; i++) segArc[i] = k;
  const hash = new Map();
  const put = (cx, cy, s) => { const key = cx * 65536 + cy; let l = hash.get(key); if (!l) hash.set(key, (l = [])); if (l[l.length - 1] !== s) l.push(s); };
  for (let k = 0; k < n; k++) {
    const a = arcs[k];
    for (let i = 0; i + 1 < a.length; i++) {
      const s = first[k] + i, dx = a[i + 1][0] - a[i][0], dy = a[i + 1][1] - a[i][1], steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (CELL / 4)));
      if (steps > 200000) continue;
      for (let j = 0; j <= steps; j++) {
        const x = a[i][0] + (dx * j) / steps, y = a[i][1] + (dy * j) / steps, e = CELL / 8;
        const x0 = Math.floor((x - e) / CELL), x1 = Math.floor((x + e) / CELL), y0 = Math.floor((y - e) / CELL), y1 = Math.floor((y + e) / CELL);
        put(x0, y0, s);
        if (x1 !== x0) put(x1, y0, s);
        if (y1 !== y0) { put(x0, y1, s); if (x1 !== x0) put(x1, y1, s); }
      }
    }
  }
  const cuts = new Map(), seen = new Set();
  const cut = (s, t, p) => { const k = segArc[s]; if (!cuts.has(k)) cuts.set(k, []); cuts.get(k).push([s - first[k], t, p]); };
  const orient = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const same = (p, q) => p[0] === q[0] && p[1] === q[1];
  const inside = (p, q, r) => !same(r, p) && !same(r, q) && Math.min(p[0], q[0]) <= r[0] && r[0] <= Math.max(p[0], q[0]) && Math.min(p[1], q[1]) <= r[1] && r[1] <= Math.max(p[1], q[1]);
  let found = 0;
  for (const l of hash.values()) {
    if (l.length < 2) continue;
    for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
      const s1 = l[i], s2 = l[j], k1 = segArc[s1], k2 = segArc[s2];
      if (k1 === k2) continue;
      const a = arcs[k1][s1 - first[k1]], b = arcs[k1][s1 - first[k1] + 1], c = arcs[k2][s2 - first[k2]], d = arcs[k2][s2 - first[k2] + 1];
      if (Math.max(a[0], b[0]) < Math.min(c[0], d[0]) || Math.max(c[0], d[0]) < Math.min(a[0], b[0]) || Math.max(a[1], b[1]) < Math.min(c[1], d[1]) || Math.max(c[1], d[1]) < Math.min(a[1], b[1])) continue;
      const d1 = orient(c, d, a), d2 = orient(c, d, b), d3 = orient(a, b, c), d4 = orient(a, b, d);
      const pair = s1 < s2 ? s1 * 4294967296 + s2 : s2 * 4294967296 + s1;
      if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
        if (seen.has(pair)) continue;
        seen.add(pair);
        const t = d1 / (d1 - d2), ex = a[0] + t * (b[0] - a[0]), ey = a[1] + t * (b[1] - a[1]);
        let p = [Math.round(ex), Math.round(ey)], near = SNAP;
        // A crossing right beside an end of either line is put at that end: rounded to a point of its own, two lines that
        // leave almost the same place almost the same way cross again a step further on, and so on up the line.
        for (const e of [a, b, c, d]) { const dist = Math.max(Math.abs(e[0] - ex), Math.abs(e[1] - ey)); if (dist <= near) { near = dist; p = e; } }
        const u = d3 / (d3 - d4);
        cut(s1, same(p, a) ? 0 : same(p, b) ? 1 : t, p); cut(s2, same(p, c) ? 0 : same(p, d) ? 1 : u, p); found++;
        continue;
      }
      // A point of one line on the other, between its points.
      const touch = [[d1, c, d, a, s2, s1, 0], [d2, c, d, b, s2, s1, 1], [d3, a, b, c, s1, s2, 0], [d4, a, b, d, s1, s2, 1]];
      for (const [o, p, q, r, on, of, end] of touch) {
        if (o !== 0 || !inside(p, q, r)) continue;
        const key2 = on * 4294967296 + of * 2 + end;
        if (seen.has(key2)) continue;
        seen.add(key2);
        const L = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2;
        cut(on, ((r[0] - p[0]) * (q[0] - p[0]) + (r[1] - p[1]) * (q[1] - p[1])) / L, r); cut(of, end, r); found++;
      }
    }
  }
  // A point that two lines share, or one line passes twice, is a meeting point too.
  const owner = new Map();
  for (let k = 0; k < n; k++) {
    const a = arcs[k];
    for (let i = 0; i < a.length; i++) {
      const id = a[i][0] * 4194304 + a[i][1], was = owner.get(id);
      if (was === undefined) owner.set(id, [k, i]);
      else if (was[0] !== k || (Math.abs(was[1] - i) > 1 && !(was[1] === 0 && i === a.length - 1))) {
        for (const [kk, ii] of [was, [k, i]]) {
          const aa = arcs[kk];
          if (ii > 0 && ii < aa.length - 1) { if (!cuts.has(kk)) cuts.set(kk, []); cuts.get(kk).push([ii, 0, aa[ii]]); }
        }
      }
    }
  }
  if (!cuts.size) return 0;
  const parts = new Map(), out = arcs.slice();
  let made = 0;
  for (const [k, list] of cuts) {
    const a = arcs[k], pts = [], flag = [];
    const bySeg = new Map();
    for (const c of list) { if (!bySeg.has(c[0])) bySeg.set(c[0], []); bySeg.get(c[0]).push(c); }
    const add = (p, f) => { const m = pts.length; if (m && same(pts[m - 1], p)) { if (f) flag[m - 1] = 1; } else { pts.push(p); flag.push(f ? 1 : 0); } };
    for (let i = 0; i < a.length; i++) {
      add(a[i], 0);
      const l = bySeg.get(i);
      if (l) { l.sort((p, q) => p[1] - q[1]); for (const c of l) add(c[1] <= 0 ? a[i] : c[1] >= 1 ? a[i + 1] : c[2], 1); }
    }
    const ids = [];
    let from = 0;
    for (let i = 1; i < pts.length; i++) if (i === pts.length - 1 || flag[i]) {
      const piece = pts.slice(from, i + 1);
      if (!ids.length) { out[k] = piece; ids.push(k); } else { out.push(piece); ids.push(out.length - 1); made++; }
      from = i;
    }
    if (ids.length > 1) parts.set(k, ids);
    else if (ids.length === 1) out[k] = pts;
  }
  const ring = (r) => r.flatMap((a) => { const k = a < 0 ? ~a : a, ids = parts.get(k); return !ids ? [a] : a < 0 ? ids.slice().reverse().map((i) => ~i) : ids; });
  for (const g of geoms) { if (g.type === "Polygon") g.arcs = g.arcs.map(ring); else if (g.type === "MultiPolygon") g.arcs = g.arcs.map((poly) => poly.map(ring)); }
  if (topo.needles) topo.needles = topo.needles.flatMap((k) => parts.get(k) || [k]).sort((a, b) => a - b);
  if (topo.mouths) topo.mouths = topo.mouths.flatMap((k) => parts.get(k) || [k]);
  topo.arcs = out.map((a) => a.map((p, i) => (i ? [p[0] - a[i - 1][0], p[1] - a[i - 1][1]] : p)));
  return made;
}

// Lines that are point for point the same become one line: cutting lines where they touch leaves such pairs, and two lines
// that leave a meeting point the same way cannot be put in order round it.
export function mergeSame(topo) {
  const seen = new Map(), to = new Map();
  topo.arcs.forEach((arc, k) => {
    let x = 0, y = 0;
    const pts = arc.map((p) => { x += p[0]; y += p[1]; return x * 4194304 + y; });
    if (pts.length < 2) return;
    const f = pts.join(";"), r = pts.slice().reverse().join(";");
    if (seen.has(f)) to.set(k, seen.get(f));
    else if (f !== r && seen.has(r)) to.set(k, ~seen.get(r));
    else seen.set(f, k);
  });
  if (!to.size) return 0;
  const ref = (a) => { const k = a < 0 ? ~a : a; if (!to.has(k)) return a; const t = to.get(k); return a < 0 ? ~t : t; };
  for (const g of topo.objects.p.geometries) {
    if (g.type === "Polygon") g.arcs = g.arcs.map((r) => r.map(ref));
    else if (g.type === "MultiPolygon") g.arcs = g.arcs.map((poly) => poly.map((r) => r.map(ref)));
  }
  for (const name of ["needles", "mouths"]) if (topo[name]) topo[name] = [...new Set(topo[name].map((k) => { const t = to.has(k) ? to.get(k) : k; return t < 0 ? ~t : t; }))].sort((a, b) => a - b);
  return to.size;
}

// A long segment is an arc of a great circle to d3 (areas, the state under the pointer) and near enough to the page, which
// draws a straight line on the screen between its ends; in the grid's plane it is a straight line in longitude and latitude,
// which lies elsewhere (90 km off at its middle, for a segment across 28° of longitude at 35° north). A point put on it in
// the plane, where another line crosses or a face is closed, would bend the arc: the Tsardom of Russia took 43,000 km² of
// the Chukchi's land that way in a trial. So every segment longer than LONG_DEG is first given points along its great
// circle, and the plane and the globe then agree to within some tens of metres. The edges of the world (the antimeridian
// and the poles) are left as they are.
const LONG_DEG = 0.5, R2D = 180 / Math.PI;
export function densify(topo) {
  const t = topo.transform, D2R = Math.PI / 180;
  let added = 0;
  topo.arcs = topo.arcs.map((arc) => {
    let x = 0, y = 0;
    const abs = arc.map((p) => { x += p[0]; y += p[1]; return [x, y]; }), out = [abs[0]];
    for (let i = 0; i + 1 < abs.length; i++) {
      const a = abs[i], b = abs[i + 1], la = a[0] * t.scale[0] + t.translate[0], pa = a[1] * t.scale[1] + t.translate[1], lb = b[0] * t.scale[0] + t.translate[0], pb = b[1] * t.scale[1] + t.translate[1];
      const edge = (Math.abs(la) > 179.99 && Math.abs(lb) > 179.99) || (Math.abs(pa) > 89.99 && Math.abs(pb) > 89.99) || Math.abs(pa) > 89.99 || Math.abs(pb) > 89.99;
      if (!edge && (Math.abs(lb - la) > LONG_DEG * 1.1 || Math.abs(pb - pa) > LONG_DEG * 1.1) && Math.abs(lb - la) < 180) {
        const va = [Math.cos(pa * D2R) * Math.cos(la * D2R), Math.cos(pa * D2R) * Math.sin(la * D2R), Math.sin(pa * D2R)], vb = [Math.cos(pb * D2R) * Math.cos(lb * D2R), Math.cos(pb * D2R) * Math.sin(lb * D2R), Math.sin(pb * D2R)];
        const w = Math.acos(Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]))), n = Math.ceil(Math.max(Math.abs(lb - la), Math.abs(pb - pa)) / LONG_DEG);
        if (w > 1e-9) for (let k = 1; k < n; k++) {
          const f = k / n, s0 = Math.sin((1 - f) * w) / Math.sin(w), s1 = Math.sin(f * w) / Math.sin(w);
          const v = [s0 * va[0] + s1 * vb[0], s0 * va[1] + s1 * vb[1], s0 * va[2] + s1 * vb[2]];
          const q = [Math.round((Math.atan2(v[1], v[0]) * R2D - t.translate[0]) / t.scale[0]), Math.round((Math.asin(Math.max(-1, Math.min(1, v[2]))) * R2D - t.translate[1]) / t.scale[1])], l = out[out.length - 1];
          if ((q[0] !== l[0] || q[1] !== l[1]) && (q[0] !== b[0] || q[1] !== b[1])) { out.push(q); added++; }
        }
      }
      out.push(b);
    }
    return out.map((p, i) => (i ? [p[0] - out[i - 1][0], p[1] - out[i - 1][1]] : p));
  });
  return added;
}

// Both steps, as the builder runs them on each level of each file: the lines cut where they cross (again and again until
// none do, since a crossing rounded to the grid can make another), then the slivers closed. The width follows the level's simplification.
const CUT_PASSES = 16, W_SHARE = 0.3, W_MAX = 2.5, MEND_SHARE = 0.85, MEND_MIN = 2.5, MEND_MAX = 10, MEND_BIG = 800, OVER_WIDE = 30;
// outward, when given, is the builder's own pass that turns round a polygon d3 takes for the whole globe but itself: closing
// a face can leave one so, where the ring is nearly flat.
// mend, when given ({ spans, people, soft, from, to, step }), has mendFaces (mend-faces.mjs) deal with the gaps and overlaps too
// wide for a sliver, after the lines are cut once more where closing the slivers made them cross.
export function closeSlivers(topo, km, outward, mend) {
  const long = densify(topo);
  let cut = 0;
  let same = 0;
  const cutAll = () => { for (let i = 0; i < CUT_PASSES; i++) { const made = planarize(topo); cut += made; same += mergeSame(topo); if (!made) break; } };
  cutAll();
  const st = zipSlivers(topo, Math.min(W_MAX, W_SHARE * km));
  let mended = null, mouths = 0;
  if (mend) {
    cutAll();
    const wide0 = Math.min(MEND_MAX, Math.max(MEND_MIN, MEND_SHARE * km));
    if (mend.onLand) {
      // A line across the mouth of each open gap, cut into the rest where it meets them.
      const found = findMouths(topo, { wide: wide0, small: 3 * wide0 * wide0, big: MEND_BIG * wide0, onLand: mend.onLand });
      mouths = found.stats.mouths;
      topo.mouths = [];
      for (const [a, b] of found.mouths) { topo.mouths.push(topo.arcs.length); topo.arcs.push([a, [b[0] - a[0], b[1] - a[1]]]); }
      cutAll();
    }
    const wide = Math.min(MEND_MAX, Math.max(MEND_MIN, MEND_SHARE * km));
    mended = mendFaces(topo, mend.spans, mend.people, { from: mend.from, to: mend.to, step: mend.step || 1, soft: mend.soft, id: mend.id, named: mend.named, holes: mend.holes, handovers: mend.handovers, cut: mend.cut, specks: mend.specks, timeFixes: mend.timeFixes, overWide: OVER_WIDE, overSmall: 3 * OVER_WIDE * OVER_WIDE, overBig: MEND_BIG * OVER_WIDE, log: mend.log, logOver: mend.logOver, name: mend.name, verify: mend.verify, near: mend.near, wide, small: 3 * wide * wide, big: MEND_BIG * wide });
  }
  if (outward && (st.closed || (mended && mended.shapes))) outward(topo);
  return { long, cut, same, closed: st.closed, km2: Math.round(st.km2), dropped: st.dropped, turned: st.turned, apart: st.apart, mouths, mended };
}

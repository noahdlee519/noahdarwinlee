// Slivers zipped shut: where two drawings of one border run a hair apart (a wartime piece cut from one source against the
// state beside it from another, or one line rounded to two neighbouring steps of the grid), the topology holds two lines
// with a thin face between them, and neither line is shared. The page draws a line that only one live shape uses as that
// shape's edge against ownerless land, with its band of colour, so each such face showed as a stray stroke or blob inside a
// country or doubled a border (Hungary, Germany, Romania, and the Reichskommissariats in March 1943).
//
// zipSlivers(topo, wKm) finds the faces of the file's lines (every date's together), and closes each face that is
//   - thin: its area over half its outline (its mean width) is under wKm, it is long for its size (4πA/P² under ROUND),
//     and its area is under AREA_PER_KM × wKm; or no larger than CELLS steps of the grid, whatever its shape (one point
//     rounded two ways);
//     or a gap: no shape at any date has it inside these lines, it is under GAP_KM2, and its mean width is under GAP_KM
//     (two drawings of a border a kilometre or two apart, with nothing claiming the land between);
//   - inland: the face across each of its lines is land some shape covers at some date, so a spit or an island along a
//     coast, however thin, is left alone;
//   - made of two or more lines between two or more meeting points (a tiny enclave drawn as one closed line is left).
// A face is closed by running both of its sides along one line: the side with more points, with the other side's meeting
// points spliced in where they lie nearest, so no meeting point moves and no line outside the face is touched. Shapes
// that were only the face are left as one line there and back. The topology must be quantized, with rings wound as outward() leaves them
// (a shape's inside to the right of its lines).
const ROUND = 0.2, AREA_PER_KM = 20, CELLS = 3, GAP_KM2 = 60, GAP_KM = 3, PASSES = 12, FAR_SCAN = 400;

export function zipSlivers(topo, wKm) {
  const t = topo.transform, geoms = topo.objects.p.geometries;
  let arcs = topo.arcs.map((arc) => { let x = 0, y = 0; return arc.map((p) => { x += p[0]; y += p[1]; return [x, y]; }); });
  const key = (p) => p[0] * 4194304 + p[1];
  const eachRing = (f) => { for (const g of geoms) { if (g.type === "Polygon") g.arcs = g.arcs.map(f); else if (g.type === "MultiPolygon") g.arcs = g.arcs.map((poly) => poly.map(f)); } };
  const stats = { closed: 0, passes: 0, km2: 0, dropped: 0, turned: 0 };
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
      if (!gap && A > CELLS * kx * ky && (A >= AREA_PER_KM * wKm || (4 * A) / per >= wKm || (4 * Math.PI * A) / (per * per) >= ROUND)) return;
      const seenArc = new Set(), seenNode = new Set();
      for (const h of c.hs) {
        if (seenArc.has(h >> 1) || seenNode.has(origin[h])) return;
        seenArc.add(h >> 1); seenNode.add(origin[h]);
        const o = cycles[cycleOf[h ^ 1]];
        if (cycleOf[h ^ 1] === ci || !o.owned) return;
      }
      cand.push({ c, A, kx, ky });
    });
    if (!cand.length) break;
    cand.sort((a, b) => a.A - b.A);
    const busy = new Uint8Array(n), repl = new Map();
    let done = 0;
    for (const { c, A, kx, ky } of cand) {
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
    eachRing((ring) => {
      if (!ring.some((a) => repl.has(a < 0 ? ~a : a))) return ring;
      const out = [];
      let one = null;
      const push = (a) => { if (one === null) one = a; if (out.length && out[out.length - 1] === ~a) out.pop(); else out.push(a); };
      for (const a of ring) {
        const k = a < 0 ? ~a : a, p = repl.get(k);
        if (!p) push(a);
        else if (a < 0) for (let i = p.length - 1; i >= 0; i--) push(~p[i]);
        else for (const b of p) push(b);
      }
      while (out.length > 1 && out[0] === ~out[out.length - 1]) { out.shift(); out.pop(); }
      // A ring that was only the face is left as one line there and back, as the simplified level leaves a speck of land.
      return out.length ? out : [one, ~one];
    });
    // Holes that were only a face are dropped.
    const flat = (r) => r.length === 2 && r[0] === ~r[1];
    for (const g of geoms) {
      if (g.type === "Polygon") g.arcs = g.arcs.filter((r, i) => !i || !flat(r));
      else if (g.type === "MultiPolygon") g.arcs = g.arcs.map((poly) => poly.filter((r, i) => !i || !flat(r)));
    }
  }
  // A ring that crossed itself was two loops wound opposite ways, and closing the one leaves the other wound backwards
  // (the whole globe but a speck): such a ring goes if it is no larger than a sliver, and is turned round otherwise.
  if (stats.closed) {
    const signed = (ring) => {
      let s = 0, p0 = null, prev = null, kx = 0, ky = 0;
      for (const a of ring) {
        const l = a < 0 ? arcs[~a].slice().reverse() : arcs[a];
        for (const p of l) {
          if (!p0) { p0 = p; kx = t.scale[0] * 111.32 * Math.cos(((p[1] * t.scale[1] + t.translate[1]) * Math.PI) / 180); ky = t.scale[1] * 110.57; }
          if (prev) s += (prev[0] - p0[0]) * kx * (p[1] - p0[1]) * ky - (p[0] - p0[0]) * kx * (prev[1] - p0[1]) * ky;
          prev = p;
        }
      }
      return [s / 2, kx * ky];
    };
    const small = (A, cell) => A <= CELLS * cell || A < AREA_PER_KM * wKm;
    const fix = (poly) => {
      const [A, cell] = signed(poly[0]);
      if (A > 0) {
        if (small(A, cell)) { stats.dropped++; return null; }
        stats.turned++;
        return poly.map((r) => r.slice().reverse().map((a) => ~a));
      }
      return poly.filter((r, i) => { if (!i) return true; const [h, c] = signed(r); if (h < 0 && small(-h, c)) { stats.dropped++; return false; } return true; });
    };
    const speck = (poly) => [[poly[0][0], ~poly[0][0]]];
    for (const g of geoms) {
      if (g.type === "Polygon") g.arcs = fix(g.arcs) || speck(g.arcs);
      else if (g.type === "MultiPolygon" && g.arcs.length) { const l = g.arcs.map(fix).filter(Boolean); g.arcs = l.length ? l : [speck(g.arcs[0])]; }
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
const CELL = 128;
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
        const t = d1 / (d1 - d2), p = [Math.round(a[0] + t * (b[0] - a[0])), Math.round(a[1] + t * (b[1] - a[1]))];
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
  topo.arcs = out.map((a) => a.map((p, i) => (i ? [p[0] - a[i - 1][0], p[1] - a[i - 1][1]] : p)));
  return made;
}

// Both steps, as the builder runs them on each level of each file: the lines cut where they cross (three times, since a
// crossing rounded to the grid can make another), then the slivers closed. The width follows the level's simplification.
const W_SHARE = 0.3, W_MAX = 2.5;
export function closeSlivers(topo, km) {
  let cut = 0;
  for (let i = 0; i < 3; i++) { const made = planarize(topo); cut += made; if (!made) break; }
  const st = zipSlivers(topo, Math.min(W_MAX, W_SHARE * km));
  return { cut, closed: st.closed, km2: Math.round(st.km2), dropped: st.dropped, turned: st.turned };
}

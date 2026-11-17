// Gaps and overlaps mended: zip-slivers.mjs closes the hairline faces between two drawings of one border, but two sources often
// differ by more than a hair. Where they do, a file holds a strip that no shape covers on some date, with land owned all round
// it, or a strip that two shapes cover at once. The page draws each shape's edge there as a border against ownerless land (or
// one state's border across another's land): the stray lines inside countries and the borders drawn double.
//
// mendFaces(topo, spans, people, opt) works on the faces of a file's lines, every date's together (the topology must be cut
// where lines cross, as planarize() in zip-slivers.mjs leaves it, quantized, and wound as outward() leaves it):
//   1. For every face it finds which shapes cover it, walking outwards-in from the sea across each line and counting the rings
//      that use the line (a shape's inside is to the right of its lines).
//   2. A gap is a face, or a patch of neighbouring faces, that no state covers on some date while states cover everything
//      round it. An overlap is a patch that two or more states cover at once. A people's land counts as ownerless, as on the
//      page. A patch is mended only if it is small (under opt.small km²) or narrow (its area over half its outline under
//      opt.wide km, and under opt.big km²); an overlap has wider limits (opt.overSmall, opt.overWide, opt.overBig), and two
//      shapes of one state over each other are parted whatever their size, the land taken from the one that carries no name
//      (a strip of the state's own coast), or from the larger of two that do, which keeps at least 40% of its land. A gap may open onto land nobody holds by a mouth
//      or two no wider than a gap. A gap up to WIDER times as wide is mended where no people holds the land either.
//   3. A face of a gap goes to the shape beside it with the longest edge on it, provided nothing else covers the face at any
//      time in that shape's span (so no overlap is made at another date). A face of an overlap is taken from one of the shapes
//      over it, provided another covers it for the whole of that shape's span (so no gap is made at another date): from the
//      one with the approximate border if only one has, else from the larger. No shape loses more than 3% of its land this
//      way, or gains more than 10%.
//   4. The rings of the shapes that changed are drawn again from their faces. A shape whose area would change by more than
//      its mended faces explain is left as it was.
// No line moves: faces only change hands, so a border between two shapes becomes the one line both share.
const PASSES = 6, PATCH_FACES = 400, LOSE = 0.03, ONE_LOSE = 0.6, GAIN = 0.1, WIDER = 2.4, HOLE_DAYS = 400, HOLE_KM2 = 100, HOLE_SHARE = 0.2, TIME_CLASH = 0.01, CLASH_KM2 = 2000;

export function mendFaces(topo, spans, people, opt) {
  const t = topo.transform, geoms = topo.objects.p.geometries, nR = geoms.length, T0 = opt.from, T1 = opt.to;
  const arcs = topo.arcs.map((arc) => { let x = 0, y = 0; return arc.map((p) => { x += p[0]; y += p[1]; return [x, y]; }); });
  const n = arcs.length, key = (p) => p[0] * 4194304 + p[1];
  const stats = { gaps: 0, overlaps: 0, matched: 0, faces: 0, km2: 0, shapes: 0, kept: 0, odd: 0, stuck: 0 };
  // Which shapes' rings use each half-edge (2k along arc k, 2k + 1 against it).
  const cnt = new Int32Array(2 * n + 1);
  const rings = (g, f) => { if (g.type === "Polygon") g.arcs.forEach(f); else if (g.type === "MultiPolygon") g.arcs.forEach((poly) => poly.forEach(f)); };
  const he = (a) => (a < 0 ? 2 * ~a + 1 : 2 * a);
  geoms.forEach((g) => rings(g, (ring) => { for (const a of ring) cnt[he(a) + 1]++; }));
  for (let i = 0; i < 2 * n; i++) cnt[i + 1] += cnt[i];
  const useRow = new Int32Array(cnt[2 * n]), fill = cnt.slice();
  geoms.forEach((g, gi) => rings(g, (ring) => { for (const a of ring) useRow[fill[he(a)]++] = gi; }));
  const used = (h) => cnt[h + 1] > cnt[h];
  // The lines drawn across the mouths of open gaps (findMouths): no shape uses them yet, and nothing is looked for across them.
  const mouth = new Uint8Array(n);
  for (const k of topo.mouths || []) mouth[k] = 1;
  delete topo.mouths;
  // Nodes, the half-edges that leave each by angle, and the faces (each a cycle of half-edges with the face to its right).
  const nodes = new Map(), origin = new Float64Array(2 * n), ok = new Uint8Array(n);
  for (let k = 0; k < n; k++) {
    const a = arcs[k], m = a.length;
    if (!(used(2 * k) || used(2 * k + 1) || mouth[k]) || m < 2 || (m === 2 && key(a[0]) === key(a[1]))) continue;
    ok[k] = 1;
    for (const [h, p, q] of [[2 * k, a[0], a[1]], [2 * k + 1, a[m - 1], a[m - 2]]]) {
      const id = key(p);
      origin[h] = id;
      if (!nodes.has(id)) nodes.set(id, []);
      nodes.get(id).push([Math.atan2(q[1] - p[1], q[0] - p[0]), h]);
    }
  }
  const at = new Int32Array(2 * n);
  for (const l of nodes.values()) { l.sort((a, b) => a[0] - b[0] || a[1] - b[1]); l.forEach((e, i) => { at[e[1]] = i; }); }
  const next = (h) => { const l = nodes.get(origin[h ^ 1]); return l[(at[h ^ 1] + 1) % l.length][1]; };
  const cycleOf = new Int32Array(2 * n).fill(-1), cyc = [];
  for (let k = 0; k < n; k++) if (ok[k]) for (const h0 of [2 * k, 2 * k + 1]) {
    if (cycleOf[h0] >= 0) continue;
    const hs = [];
    let h = h0;
    do { cycleOf[h] = cyc.length; hs.push(h); h = next(h); } while (h !== h0);
    cyc.push(hs);
  }
  const nC = cyc.length, line = (h) => (h & 1 ? arcs[h >> 1].slice().reverse() : arcs[h >> 1]);
  const kxAt = (p) => t.scale[0] * 111.32 * Math.cos(((p[1] * t.scale[1] + t.translate[1]) * Math.PI) / 180), ky = t.scale[1] * 110.57;
  const arcLen = new Float64Array(n);
  for (let k = 0; k < n; k++) if (ok[k]) { const a = arcs[k], kx = kxAt(a[0]); let s = 0; for (let i = 0; i + 1 < a.length; i++) s += Math.hypot((a[i + 1][0] - a[i][0]) * kx, (a[i + 1][1] - a[i][1]) * ky); arcLen[k] = s; }
  const area = new Float64Array(nC), per = new Float64Array(nC);
  cyc.forEach((hs, c) => {
    const p0 = arcs[hs[0] >> 1][0], kx = kxAt(p0);
    let s = 0, pr = 0;
    for (const h of hs) { const l = line(h); pr += arcLen[h >> 1]; for (let i = 0; i + 1 < l.length; i++) s += (l[i][0] - p0[0]) * kx * (l[i + 1][1] - p0[1]) * ky - (l[i + 1][0] - p0[0]) * kx * (l[i][1] - p0[1]) * ky; }
    area[c] = s / 2; per[c] = pr;
  });
  // The connected pieces of the lines: each has one cycle that faces outwards (the largest, wound the other way).
  const par = new Int32Array(n).map((v, i) => i), find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (const l of nodes.values()) for (let i = 1; i < l.length; i++) par[find(l[i][1] >> 1)] = find(l[0][1] >> 1);
  const outer = new Map();
  for (let c = 0; c < nC; c++) { const r = find(cyc[c][0] >> 1); if (!outer.has(r) || area[c] > area[outer.get(r)]) outer.set(r, c); }
  // How many times each shape covers each face.
  const W = new Int8Array(nC * nR), seen = new Uint8Array(nC), bad = new Uint8Array(nC);
  let box = null;
  const boxes = () => {
    if (box) return box;
    box = geoms.map(() => [Infinity, Infinity, -Infinity, -Infinity]);
    geoms.forEach((g, gi) => rings(g, (ring) => { const b = box[gi]; for (const a of ring) for (const p of arcs[a < 0 ? ~a : a]) { if (p[0] < b[0]) b[0] = p[0]; if (p[0] > b[2]) b[2] = p[0]; if (p[1] < b[1]) b[1] = p[1]; if (p[1] > b[3]) b[3] = p[1]; } }));
    return box;
  };
  const inside = (gi, x, y) => {
    let odd = false;
    rings(geoms[gi], (ring) => { for (const a of ring) { const l = arcs[a < 0 ? ~a : a]; for (let i = 0; i + 1 < l.length; i++) { const p = l[i], q = l[i + 1]; if ((p[1] > y) !== (q[1] > y) && x < p[0] + ((y - p[1]) / (q[1] - p[1])) * (q[0] - p[0])) odd = !odd; } } });
    return odd;
  };
  for (const c0 of outer.values()) {
    if (area[c0] <= 0) { for (let c = 0; c < nC; c++) if (find(cyc[c][0] >> 1) === find(cyc[c0][0] >> 1)) bad[c] = 1; continue; }
    if (cyc[c0].some(used)) {
      // A piece set inside other land (an enclave and its like): what covers the land round it is found by a point just outside.
      const l = line(cyc[c0][0]), dx = l[1][0] - l[0][0], dy = l[1][1] - l[0][1], d = Math.hypot(dx, dy) || 1, x = (l[0][0] + l[1][0]) / 2 + (dy / d) * 0.25, y = (l[0][1] + l[1][1]) / 2 - (dx / d) * 0.25, b = boxes();
      for (let gi = 0; gi < nR; gi++) if (x >= b[gi][0] && x <= b[gi][2] && y >= b[gi][1] && y <= b[gi][3] && inside(gi, x, y)) W[c0 * nR + gi] = 1;
    }
    seen[c0] = 1;
    const queue = [c0];
    let mismatch = false;
    const members = [c0];
    while (queue.length) {
      const c = queue.pop();
      for (const h of cyc[c]) {
        const c2 = cycleOf[h ^ 1];
        if (c2 === c) continue;
        if (!seen[c2]) {
          W.copyWithin(c2 * nR, c * nR, c * nR + nR);
          for (let i = cnt[h]; i < cnt[h + 1]; i++) W[c2 * nR + useRow[i]]--;
          for (let i = cnt[h ^ 1]; i < cnt[(h ^ 1) + 1]; i++) W[c2 * nR + useRow[i]]++;
          seen[c2] = 1; queue.push(c2); members.push(c2);
        } else if (!mismatch) {
          // The count must come out the same by every way round: where it does not, the lines still cross somewhere.
          for (let i = cnt[h]; i < cnt[h + 1] && !mismatch; i++) { const r = useRow[i]; let d = 0; for (let j = cnt[h]; j < cnt[h + 1]; j++) if (useRow[j] === r) d--; for (let j = cnt[h ^ 1]; j < cnt[(h ^ 1) + 1]; j++) if (useRow[j] === r) d++; if (W[c2 * nR + r] !== W[c * nR + r] + d) { mismatch = arcs[h >> 1][0]; if (opt.log) opt.log('mismatch arc ' + (h >> 1) + ' pts ' + arcs[h >> 1].slice(0, 3).join(' ') + ' row ' + r + ' W ' + W[c * nR + r] + ' -> ' + W[c2 * nR + r] + ' d ' + d + ' cyc ' + c + '(' + cyc[c].length + ') ' + c2 + '(' + cyc[c2].length + ') area ' + area[c].toFixed(1) + ' ' + area[c2].toFixed(1)); } }
        }
      }
    }
    if (mismatch) { stats.odd++; for (const c of members) bad[c] = 1; if (opt.log) opt.log('odd piece of ' + members.length + ' cycles at ' + mismatch.map((v, i) => (v * t.scale[i] + t.translate[i]).toFixed(3)).join(',')); }
  }
  // A face's states (not peoples), and when it is covered.
  const coverCache = new Map();
  const cover = (c) => { let l = coverCache.get(c); if (!l) { l = []; for (let r = 0; r < nR; r++) if (W[c * nR + r] > 0 && !people[r] && spans[r][1] >= T0 && spans[r][0] <= T1) l.push(r); coverCache.set(c, l); } return l; };
  const countAt = (c, time, but) => { let k = 0; for (const r of cover(c)) if (r !== but && spans[r][0] <= time && time <= spans[r][1]) k++; return k; };
  const liveAt = (c, time) => cover(c).filter((r) => spans[r][0] <= time && time <= spans[r][1]);
  // Whether the rows of l (but not `but`) cover the whole of [a, b] between them.
  const covered = (l, a, b, but) => {
    const s = l.filter((r) => r !== but && spans[r][1] >= a && spans[r][0] <= b).map((r) => spans[r]).sort((p, q) => p[0] - q[0]);
    let upto = a;
    for (const sp of s) { if (sp[0] > upto) return false; if (sp[1] + opt.step > upto) upto = sp[1] + opt.step; if (upto > b) return true; }
    return upto > b;
  };
  const clip = (sp) => [Math.max(sp[0], T0), Math.min(sp[1], T1)];
  // Limits for gaps, and wider ones for overlaps: land nobody holds may be right, but two states over one piece of land never is.
  const GAP = { small: opt.small, wide: opt.wide, big: opt.big }, OVER = { small: opt.overSmall, wide: opt.overWide, big: opt.overBig };
  const WIDE = { small: opt.small, wide: WIDER * opt.wide, big: WIDER * opt.big };
  const folk = new Map();
  const peopleAt = (c, time) => { let l = folk.get(c); if (!l) { l = []; for (let r = 0; r < nR; r++) if (people[r] && W[c * nR + r] > 0) l.push(r); folk.set(c, l); } return l.some((r) => spans[r][0] <= time && time <= spans[r][1]); };
  const narrowBy = (lim, A, P) => A <= lim.small || (A <= lim.big && P > 0 && (4 * A) / P <= lim.wide);
  const slim = (lim, g) => -area[g] <= lim.small / 4 || (-4 * area[g]) / per[g] <= lim.wide;
  // The patch of neighbouring faces round c that pass the test at a time: null if it runs to the sea or grows too large.
  const patch = (c, time, test, lim) => {
    const narrow = (A, P) => narrowBy(lim, A, P);
    const list = [c], inP = new Set([c]);
    let A = 0;
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      if (area[f] > 0 || bad[f]) return null;
      A -= area[f];
      if (A > lim.big || list.length > PATCH_FACES) return null;
      for (const h of cyc[f]) { const g = cycleOf[h ^ 1]; if (!mouth[h >> 1] && !inP.has(g) && test(g, time)) { inP.add(g); list.push(g); } }
    }
    let P = 0;
    for (const f of list) for (const h of cyc[f]) if (!inP.has(cycleOf[h ^ 1])) P += arcLen[h >> 1];
    return narrow(A, P) ? { list, inP, A, P } : null;
  };
  const rowArea = new Float64Array(nR);
  for (let c = 0; c < nC; c++) if (area[c] < 0) for (let r = 0; r < nR; r++) if (W[c * nR + r] > 0) rowArea[r] -= area[c];
  const inRing = (ring, x, y) => { let odd = false; for (const h of ring) { const l = arcs[h >> 1]; for (let i = 0; i + 1 < l.length; i++) { const p = l[i], q = l[i + 1]; if ((p[1] > y) !== (q[1] > y) && x < p[0] + ((y - p[1]) / (q[1] - p[1])) * (q[0] - p[0])) odd = !odd; } } return odd; };
  // The pieces of line set inside a face (an island of lines) take the face's change with it: their outward cycle is the face's too.
  const islands = [];
  for (const c0 of outer.values()) if (area[c0] > 0) { const l = line(cyc[c0][0]); islands.push([c0, (l[0][0] + l[1][0]) / 2, (l[0][1] + l[1][1]) / 2]); }
  const cbox = new Map();
  const boxOf = (c) => { let b = cbox.get(c); if (!b) { b = [Infinity, Infinity, -Infinity, -Infinity]; for (const h of cyc[c]) for (const p of arcs[h >> 1]) { if (p[0] < b[0]) b[0] = p[0]; if (p[0] > b[2]) b[2] = p[0]; if (p[1] < b[1]) b[1] = p[1]; if (p[1] > b[3]) b[3] = p[1]; } cbox.set(c, b); } return b; };
  const within = (c) => { const b = boxOf(c), l = []; for (const [c0, x, y] of islands) if (x > b[0] && x < b[2] && y > b[1] && y < b[3] && find(cyc[c0][0] >> 1) !== find(cyc[c][0] >> 1) && inRing(cyc[c], x, y)) l.push(c0); return l; };
  // For a report (opt.holes): land a state holds, loses, and holds again within a year, with nobody else on it between
  // (a change dated to one day in the row that ends and to another in the row that begins).
  if (opt.holes) {
    const agg = new Map();
    for (let c = 0; c < nC; c++) {
      if (area[c] >= 0 || bad[c]) continue;
      const l = cover(c).slice().sort((a, b) => spans[a][0] - spans[b][0]);
      let end = -Infinity, last = -1;
      for (const r of l) {
        if (last >= 0 && spans[r][0] > end + 1 && spans[r][0] - end <= 400 && opt.id[r] === opt.id[last] && end >= T0 && spans[r][0] <= T1) {
          const k = opt.id[r] + '|' + (end + 1) + '|' + (spans[r][0] - 1), o = agg.get(k) || { id: opt.id[r], from: end + 1, to: spans[r][0] - 1, km2: 0, rows: new Set(), next: new Set() };
          o.km2 -= area[c]; o.rows.add(last); o.next.add(r); agg.set(k, o);
        }
        if (spans[r][1] > end) { end = spans[r][1]; last = r; }
      }
    }
    for (const o of agg.values()) opt.holes.push(o);
  }
  // Holes in time closed (opt.timeFixes, an array to fill): a state that holds land, is gone from it for up to HOLE_DAYS with
  // nobody else there, and holds it again (a change the sources date to one day in the row that ends and another in the row
  // that begins, or a year one source skips) held it throughout. The rows that begin are begun earlier, or else the rows that
  // end are ended later, whichever sets less land over another state's (at most TIME_CLASH of a row, or nothing is done).
  if (opt.timeFixes) {
    const agg = new Map();
    for (let c = 0; c < nC; c++) {
      if (area[c] >= 0 || bad[c]) continue;
      const l = cover(c).slice().sort((a, b) => spans[a][0] - spans[b][0]);
      let end = -Infinity, last = -1;
      for (const r of l) {
        if (last >= 0 && spans[r][0] > end + 1 && spans[r][0] - end <= HOLE_DAYS && opt.id[r] === opt.id[last] && end >= T0 && spans[r][0] <= T1) {
          const k = opt.id[r] + '|' + (end + 1) + '|' + (spans[r][0] - 1), o = agg.get(k) || { id: opt.id[r], from: end + 1, to: spans[r][0] - 1, km2: 0, prev: new Set(), next: new Set() };
          o.km2 -= area[c]; o.prev.add(last); o.next.add(r); agg.set(k, o);
        }
        if (spans[r][1] > end) { end = spans[r][1]; last = r; }
      }
    }
    const facesOf = (r) => { const l = []; for (let c = 0; c < nC; c++) if (area[c] < 0 && W[c * nR + r] > 0) l.push(c); return l; };
    // The land of a row that another state covers at some time between two days.
    const clash = (r, a, b) => { let s = 0; for (const c of facesOf(r)) if (cover(c).some((x) => opt.id[x] !== opt.id[r] && spans[x][1] >= a && spans[x][0] <= b)) s -= area[c]; return s; };
    for (const o of [...agg.values()].sort((a, b) => b.km2 - a.km2)) {
      if (o.km2 < HOLE_KM2) continue;
      const next = [...o.next].filter((r) => spans[r][0] === o.to + 1), prev = [...o.prev].filter((r) => spans[r][1] === o.from - 1);
      // The hole must be a good part of the rows moved (a sliver of a hole is a gap in space, mended below).
      const fits = (rows, a, b) => rows.length > 0 && o.km2 >= HOLE_SHARE * rows.reduce((m, r) => m + rowArea[r], 0) && rows.every((r) => clash(r, a, b) <= Math.max(Math.min(TIME_CLASH * rowArea[r], CLASH_KM2), 1));
      // Of the two ways, the one that lays less of the state over its own other rows (which cannot be parted by land alone).
      const twice = (rows, a, b) => { let s = 0; for (const r of rows) for (const c of facesOf(r)) if (cover(c).some((x) => x !== r && opt.id[x] === opt.id[r] && spans[x][1] >= a && spans[x][0] <= b)) s -= area[c]; return s; };
      const okNext = fits(next, o.from, o.to), okPrev = fits(prev, o.from, o.to);
      if (!okNext && !okPrev) continue;
      if (okNext && (!okPrev || twice(next, o.from, o.to) <= twice(prev, o.from, o.to))) for (const r of next) { spans[r][0] = o.from; opt.timeFixes.push({ row: r, from: o.from, km2: Math.round(o.km2) }); }
      else for (const r of prev) { spans[r][1] = o.to; opt.timeFixes.push({ row: r, to: o.to, km2: Math.round(o.km2) }); }
      coverCache.clear();
    }
  }
  const changed = new Map();
  // No shape loses more than LOSE of its land to overlaps mended, or gains more than GAIN by gaps (or a small patch's worth).
  const lost = new Float64Array(nR), gained = new Float64Array(nR);
  const mayLose = (r, c) => lost[r] - area[c] <= Math.max(LOSE * rowArea[r], OVER.small / 10), mayGain = (r, c) => gained[r] - area[c] <= Math.max(GAIN * rowArea[r], GAP.small);
  const give = (c, r, w) => { const was = W[c * nR + r]; W[c * nR + r] = w; coverCache.delete(c); for (const c0 of within(c)) { W[c0 * nR + r] = w; coverCache.delete(c0); } if (!changed.has(r)) changed.set(r, 0); changed.set(r, changed.get(r) - area[c]); stats.faces++; stats.km2 -= area[c]; if (opt.log && -area[c] > (opt.logOver || 1e9)) { const p = arcs[cyc[c][0] >> 1][0]; opt.log((w ? 'gap ' : 'overlap ') + (-area[c]).toFixed(0) + ' km² wide ' + ((-4 * area[c]) / per[c]).toFixed(1) + ' at ' + (p[0] * t.scale[0] + t.translate[0]).toFixed(2) + ',' + (p[1] * t.scale[1] + t.translate[1]).toFixed(2) + ' row ' + r + ' ' + (opt.name ? opt.name(r) : '')); } return was; };
  const faces = [];
  for (let c = 0; c < nC; c++) if (area[c] < 0 && !bad[c]) faces.push(c);
  for (let pass = 0; pass < PASSES; pass++) {
    let did = 0;
    for (const c of faces) {
      const l = cover(c);
      // The dates to look at: when the face's own cover changes, and when its neighbours' does.
      const times = new Set([T0]);
      for (const r of l) { const [a, b] = clip(spans[r]); if (a <= b) { times.add(a); if (b + opt.step <= T1) times.add(b + opt.step); } }
      for (const h of cyc[c]) for (const r of cover(cycleOf[h ^ 1])) { const [a, b] = clip(spans[r]); if (a <= b) { times.add(a); if (b + opt.step <= T1) times.add(b + opt.step); } }
      for (const time of [...times].sort((a, b) => a - b)) {
        const k = countAt(c, time, -1);
        if (opt.near && pass === 0) { const p0 = arcs[cyc[c][0] >> 1][0], lo = p0[0] * t.scale[0] + t.translate[0], la = p0[1] * t.scale[1] + t.translate[1]; if (Math.abs(lo - opt.near[0]) < opt.near[2] && Math.abs(la - opt.near[1]) < opt.near[2]) opt.log('near face ' + c + ' at ' + lo.toFixed(2) + ',' + la.toFixed(2) + ' A ' + (-area[c]).toFixed(1) + ' w ' + ((-4 * area[c]) / per[c]).toFixed(2) + ' time ' + time + ' count ' + k + ' cover ' + cover(c).map((r) => r + '[' + spans[r] + ']').join(' ') + (k >= 2 ? ' patch ' + JSON.stringify((() => { const pt = patch(c, time, (g, tm) => area[g] < 0 && countAt(g, tm, -1) >= 2, OVER); return pt ? [pt.list.length, pt.A.toFixed(0), pt.P.toFixed(0)] : null; })()) : '')); }
        if (k === 0) {
          if (-area[c] > WIDE.big) continue;
          // The patch takes in the slim ownerless faces beside it, not the open land a gap may run out to. A wider gap is
          // mended only where no people holds the land either (a people's strip between two states is the people's).
          let lim = GAP, pt = -area[c] > GAP.big ? null : patch(c, time, (g, tm) => area[g] < 0 && !bad[g] && countAt(g, tm, -1) === 0 && slim(GAP, g), GAP);
          if (!pt) { lim = WIDE; pt = patch(c, time, (g, tm) => area[g] < 0 && !bad[g] && countAt(g, tm, -1) === 0 && !peopleAt(g, tm) && slim(WIDE, g), WIDE); if (pt && pt.list.some((f) => peopleAt(f, time))) pt = null; }
          if (!pt) continue;
          // Land all round: beyond the patch's edge everything is covered then, but for a mouth or two no wider than a gap.
          let open = 0;
          for (const f of pt.list) for (const h of cyc[f]) { const g = cycleOf[h ^ 1]; if (!mouth[h >> 1] && !pt.inP.has(g) && countAt(g, time, -1) === 0) open += arcLen[h >> 1]; }
          if (open > Math.min(2.5 * lim.wide, 0.15 * pt.P)) continue;
          let any = false;
          for (const f of pt.list) {
            if (countAt(f, time, -1) !== 0) continue;
            const edge = new Map();
            for (const h of cyc[f]) { const g = cycleOf[h ^ 1]; if (g !== f && !mouth[h >> 1]) for (const r of liveAt(g, time)) edge.set(r, (edge.get(r) || 0) + arcLen[h >> 1]); }
            const pick = [...edge.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]).find((r) => { const [a, b] = clip(spans[r]); return !cover(f).some((x) => x !== r && spans[x][1] >= a && spans[x][0] <= b) && W[f * nR + r] <= 0 && mayGain(r, f); });
            if (pick === undefined) continue;
            gained[pick] -= area[f]; give(f, pick, 1); any = true;
          }
          if (any) { stats.gaps++; did++; } else stats.stuck++;
        } else if (k >= 2) {
          // Shapes of one state over each other (a state and a strip of its own coast) are parted whatever their size.
          const one = opt.id && new Set(liveAt(c, time).map((r) => opt.id[r])).size === 1;
          const pt = one ? { list: [c], inP: new Set([c]) } : -area[c] > OVER.big ? null : patch(c, time, (g, tm) => area[g] < 0 && !bad[g] && countAt(g, tm, -1) >= 2, OVER);
          if (!pt) continue;
          let any = false;
          for (const f of pt.list) {
            const live = liveAt(f, time);
            if (live.length < 2) continue;
            const can = live.filter((r) => { const [a, b] = clip(spans[r]); return covered(cover(f), a, b, r); });
            if (!can.length) continue;
            // Keep the firmer and the smaller; of two alike, the one that began first.
            can.sort((a, b) => (one && opt.named ? opt.named[a] - opt.named[b] : 0) || (one ? 0 : opt.soft ? opt.soft[b] - opt.soft[a] : 0) || rowArea[b] - rowArea[a] || spans[b][0] - spans[a][0] || b - a);
            for (const r of can) { if (liveAt(f, time).length < 2) break; const [a, b] = clip(spans[r]); if (!covered(cover(f), a, b, r) || !(one ? !opt.named || !opt.named[r] || lost[r] - area[f] <= ONE_LOSE * rowArea[r] : mayLose(r, f))) continue; lost[r] -= area[f]; give(f, r, 0); any = true; }
          }
          // Two rows of one state that cannot be parted (each holds the land at a time the other does not) are made to
          // agree instead: a slim face beside this one that only one of them covers, and no other state ever does in the
          // other's span, goes to the other too, so their outlines run together and no line is drawn between them.
          if (one && liveAt(c, time).length >= 2) {
            for (const r of liveAt(c, time)) {
              const [a, b] = clip(spans[r]);
              for (const h of cyc[c]) {
                const f = cycleOf[h ^ 1];
                if (mouth[h >> 1] || f === c || area[f] >= 0 || bad[f] || W[f * nR + r] > 0 || !slim(GAP, f) || !mayGain(r, f)) continue;
                const l = cover(f).filter((x) => spans[x][1] >= a && spans[x][0] <= b);
                if (!l.length || l.some((x) => opt.id[x] !== opt.id[r])) continue;
                gained[r] -= area[f]; give(f, r, 1); any = true; stats.matched++;
              }
            }
          }
          if (any) { stats.overlaps++; did++; } else stats.stuck++;
        }
      }
    }
    if (!did) break;
  }
  if (opt.verify) for (let r = 0; r < nR; r++) if (!changed.has(r) && geoms[r].arcs && geoms[r].arcs.length) changed.set(r, 0);
  // The rings of each changed shape, walked along the edges of its faces with the shape on the right.
  // A ring's area in km² on an equal-area plane (longitude against the sine of latitude), so that rings of any size compare.
  const EX = (6371.0088 * Math.PI) / 180, ea = (p) => [(p[0] * t.scale[0] + t.translate[0]) * EX, 6371.0088 * Math.sin(((p[1] * t.scale[1] + t.translate[1]) * Math.PI) / 180)];
  const signedRing = (ring) => {
    let s = 0;
    for (const h of ring) { const l = line(h); let a = ea(l[0]); for (let i = 1; i < l.length; i++) { const b = ea(l[i]); s += a[0] * b[1] - b[0] * a[1]; a = b; } }
    return s / 2;
  };
  const planarArea = (g) => { let s = 0; rings(g, (ring) => { if (ring.length) s -= signedRing(ring.map(he)); }); return s; };
  const inR = (c, r) => W[c * nR + r] > 0;
  for (const [r, moved] of changed) {
    const edgeHs = [], isEdge = new Set();
    for (let c = 0; c < nC; c++) if (inR(c, r)) for (const h of cyc[c]) if (!inR(cycleOf[h ^ 1], r)) { edgeHs.push(h); isEdge.add(h); }
    const done = new Set(), out = [];
    let fail = false;
    for (const h0 of edgeHs) {
      if (done.has(h0)) continue;
      const ring = [];
      let h = h0;
      do {
        done.add(h); ring.push(h);
        let g = next(h), turns = 0;
        while (!isEdge.has(g) && turns++ < 64) g = next(g ^ 1);
        if (!isEdge.has(g)) { fail = true; break; }
        h = g;
      } while (h !== h0 && ring.length < 1e6 && !done.has(h));
      if (fail || h !== h0) { fail = true; break; }
      out.push(ring);
    }
    const before = planarArea(geoms[r]);
    if (!fail) {
      const ext = [], holes = [];
      for (const ring of out) { const s = signedRing(ring); if (s < 0) ext.push({ ring, a: -s, holes: [] }); else if (s > 0) holes.push(ring); }
      ext.sort((a, b) => a.a - b.a);
      for (const hole of holes) {
        const l = line(hole[0]), dx = l[1][0] - l[0][0], dy = l[1][1] - l[0][1], d = Math.hypot(dx, dy) || 1, x = (l[0][0] + l[1][0]) / 2 + (dy / d) * 0.25, y = (l[0][1] + l[1][1]) / 2 - (dx / d) * 0.25;
        const home = ext.find((e) => inRing(e.ring, x, y));
        if (home) home.holes.push(hole); else fail = true;
      }
      if (!fail) {
        const toArcs = (ring) => ring.map((h) => (h & 1 ? ~(h >> 1) : h >> 1));
        const made = { type: "MultiPolygon", arcs: ext.sort((a, b) => b.a - a.a).map((e) => [toArcs(e.ring)].concat(e.holes.map(toArcs))) };
        const after = planarArea(made);
        // The change must be what the faces explain (a shape that lay over itself may lose that much again).
        if (opt.log && !(Math.abs(after - before) <= Math.abs(moved) * 1.5 + 3 + 1e-5 * before)) opt.log('  area after=' + after.toFixed(0));
        if (opt.verify) { if (!(Math.abs(after - before) <= Math.abs(moved) * 1.5 + 3 + 1e-5 * before)) { stats.kept++; opt.log('verify row ' + r + ' before ' + before.toFixed(0) + ' after ' + after.toFixed(0) + ' bad=' + (() => { let b = 0, g = 0; for (let c = 0; c < nC; c++) if (inR(c, r)) { if (bad[c]) b++; else g++; } return b + '/' + (b + g); })()); } else stats.shapes++; continue; }
        if (Math.abs(after - before) <= Math.abs(moved) * 1.5 + 3 + 1e-5 * before) { geoms[r].type = "MultiPolygon"; geoms[r].arcs = made.arcs; stats.shapes++; continue; }
      }
    }
    if (opt.log) opt.log('kept row ' + r + ' fail=' + fail + ' before=' + before.toFixed(0) + ' moved=' + moved.toFixed(1) + ' rings=' + out.length);
    stats.kept++;
  }
  // For a report (opt.specks): slim faces one state holds with other states all round and none of its own land beside it.
  if (opt.specks) {
    for (const c of faces) {
      if (-area[c] > GAP.small || (-4 * area[c]) / per[c] > GAP.wide / 2 || (-4 * Math.PI * area[c]) / (per[c] * per[c]) > 0.25) continue;
      for (const r of cover(c)) {
        const [a, b] = clip(spans[r]);
        if (a > b || countAt(c, a, -1) !== 1) continue;
        let alone = true, shut = true;
        for (const h of cyc[c]) { const g = cycleOf[h ^ 1]; const l = liveAt(g, a); if (!l.length) shut = false; if (l.some((x) => opt.id[x] === opt.id[r])) alone = false; }
        if (alone && shut) { const p = arcs[cyc[c][0] >> 1][0]; opt.specks.push({ row: r, km2: -area[c], at: [p[0] * t.scale[0] + t.translate[0], p[1] * t.scale[1] + t.translate[1]], from: a, to: b }); }
      }
    }
  }
  // Lines inside a state: where two rows of one state lie over each other and cannot be parted (each holds the land at a time
  // the other does not), the edge of the one runs across the other's land. Such a line is listed with the rows that cover both
  // its sides (topo.inside, by line), and the page leaves it undrawn while one of them, of the same state, is shown.
  const insideOf = new Map();
  if (opt.id) {
    for (let k = 0; k < n; k++) {
      if (!ok[k]) continue;
      const f = cycleOf[2 * k], g = cycleOf[2 * k + 1];
      if (f === g || bad[f] || bad[g]) continue;
      let edge = null, both = null;
      for (let r = 0; r < nR; r++) { const a = W[f * nR + r] > 0, b = W[g * nR + r] > 0; if (a !== b) (edge = edge || []).push(r); else if (a) (both = both || []).push(r); }
      if (!edge || !both) continue;
      const l = both.filter((c) => edge.some((b) => opt.id[b] === opt.id[c] && spans[b][1] >= spans[c][0] && spans[b][0] <= spans[c][1]));
      if (l.length) insideOf.set(k, l);
    }
  }
  // The lines no shape uses any more are taken out, and the list of needles follows.
  const live = new Uint8Array(n);
  geoms.forEach((g) => rings(g, (ring) => { for (const a of ring) live[a < 0 ? ~a : a] = 1; }));
  const to = new Int32Array(n).fill(-1), kept = [];
  arcs.forEach((a, k) => { if (live[k]) { to[k] = kept.length; kept.push(a); } });
  const map = (ring) => ring.map((a) => (a < 0 ? ~to[~a] : to[a]));
  for (const g of geoms) { if (g.type === "Polygon") g.arcs = g.arcs.map(map); else if (g.type === "MultiPolygon") g.arcs = g.arcs.map((poly) => poly.map(map)); }
  if (topo.needles) { topo.needles = topo.needles.filter((k) => to[k] >= 0).map((k) => to[k]); if (!topo.needles.length) delete topo.needles; }
  delete topo.inside;
  if (insideOf.size) { topo.inside = {}; for (const [k, l] of insideOf) if (to[k] >= 0) topo.inside[to[k]] = l; stats.inside = insideOf.size; }
  topo.arcs = kept.map((a) => a.map((p, i) => (i ? [p[0] - a[i - 1][0], p[1] - a[i - 1][1]] : p)));
  stats.km2 = Math.round(stats.km2);
  return stats;
}

// What mendFaces needs to know of a file's rows: each row's first and last day (counted from 1 January 1886, as the page counts
// them, with the file's dated changes), whether it is a people, and whether its border is approximate.
const DAY0 = Date.UTC(1886, 0, 1), MONTHLY_FROM = 1648;
const dayOf = (y, m, d) => { const dt = new Date(0); dt.setUTCFullYear(y, m - 1, d); return Math.round((dt.getTime() - DAY0) / 86400000); };
// A change of days from mendFaces' timeFixes written back to a file: the row's years, and its entry in the file's dated changes.
export function applyTimeFixes(file, modern, fixes) {
  const ymd = (n) => { const d = new Date(DAY0 + n * 86400000); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]; };
  for (const f of fixes) {
    const r = file.rows[f.row];
    if (modern) { if (f.from !== undefined) r[2] = f.from; if (f.to !== undefined) r[3] = f.to; continue; }
    const monthly = file.to >= MONTHLY_FROM;
    let x = monthly ? (file.days || (file.days = [])).find((e) => e[0] === f.row) : null;
    if (monthly && !x) file.days.push((x = [f.row, null, null]));
    if (f.from !== undefined) { const [y, m, d] = ymd(f.from); r[2] = y; if (x) x[1] = m === 1 && d === 1 ? null : f.from; }
    if (f.to !== undefined) { const [y, m, d] = ymd(f.to); r[3] = y; if (x) x[2] = m === 12 && d === 31 ? null : f.to; }
  }
  if (file.days) file.days = file.days.filter((e) => e[1] !== null || e[2] !== null);
}
export function mendInfo(file, modern) {
  const rows = file.rows;
  if (modern) return { spans: rows.map((r) => [r[2], r[3] < 0 ? Infinity : r[3]]), people: rows.map(() => 0), soft: rows.map((r) => (r[8] === 1 ? 1 : 0)), id: rows.map((r) => r[0]), named: rows.map((r) => (r[6] ? 1 : 0)), from: 0, to: rows.reduce((m, r) => Math.max(m, r[2], r[3]), 0), step: 1 };
  const spans = rows.map((r) => [dayOf(r[2], 1, 1), dayOf(r[3], 12, 31)]);
  if (file.to >= MONTHLY_FROM) {
    const first = dayOf(file.from, 1, 1), last = dayOf(file.to, 12, 31);
    rows.forEach((r, i) => { if (r[2] < 1000) spans[i][0] = -1e9; });
    for (const x of file.days || []) {
      const r = rows[x[0]];
      if (x[1] !== null && !(r[2] === file.from && x[1] > first)) spans[x[0]][0] = x[1];
      if (x[2] !== null && !(r[3] === file.to && x[2] < last)) spans[x[0]][1] = x[2];
    }
  }
  return { spans, people: rows.map((r) => (r[7] ? 1 : 0)), soft: rows.map((r) => (r[9] <= 1 ? 1 : 0)), id: rows.map((r) => r[0]), named: rows.map((r) => (r[6] ? 1 : 0)), from: dayOf(file.from, 1, 1), to: dayOf(file.to, 12, 31), step: 1 };
}

// The mouths of open gaps. A gap between two states' borders often runs out to the sea, or to land nobody holds, so it is no
// face of its own but an inlet of the open land outside, and mendFaces would not see it. findMouths walks each large face's
// edge and finds the inlets: two points of the edge no more than opt.wide km apart, with a stretch of edge between them at
// least three times as long, enclosing a narrow pocket on the face's own side (under opt.big km², its area over half its
// outline under opt.wide). An arm of the sea is such an inlet too, so the mouth and the pocket's middle must lie on land
// (opt.onLand(lon, lat)). Each mouth is returned as a pair of grid points, for the caller to add as a line no shape uses:
// the pocket is then a face, and mendFaces gives it to a state beside it if nobody covers it while land lies all round.
export function findMouths(topo, opt) {
  const t = topo.transform;
  const arcs = topo.arcs.map((arc) => { let x = 0, y = 0; return arc.map((p) => { x += p[0]; y += p[1]; return [x, y]; }); });
  const n = arcs.length, key = (p) => p[0] * 4194304 + p[1], usedArc = new Uint8Array(n);
  const rings = (g, f) => { if (g.type === "Polygon") g.arcs.forEach(f); else if (g.type === "MultiPolygon") g.arcs.forEach((poly) => poly.forEach(f)); };
  topo.objects.p.geometries.forEach((g) => rings(g, (ring) => { for (const a of ring) usedArc[a < 0 ? ~a : a] = 1; }));
  const nodes = new Map(), origin = new Float64Array(2 * n), ok = new Uint8Array(n);
  for (let k = 0; k < n; k++) {
    const a = arcs[k], m = a.length;
    if (!usedArc[k] || m < 2 || (m === 2 && key(a[0]) === key(a[1]))) continue;
    ok[k] = 1;
    for (const [h, p, q] of [[2 * k, a[0], a[1]], [2 * k + 1, a[m - 1], a[m - 2]]]) { const id = key(p); origin[h] = id; if (!nodes.has(id)) nodes.set(id, []); nodes.get(id).push([Math.atan2(q[1] - p[1], q[0] - p[0]), h]); }
  }
  const at = new Int32Array(2 * n);
  for (const l of nodes.values()) { l.sort((a, b) => a[0] - b[0] || a[1] - b[1]); l.forEach((e, i) => { at[e[1]] = i; }); }
  const next = (h) => { const l = nodes.get(origin[h ^ 1]); return l[(at[h ^ 1] + 1) % l.length][1]; };
  const seen = new Uint8Array(2 * n), out = [], R = 6371.0088, D2R = Math.PI / 180;
  const ll = (p) => [p[0] * t.scale[0] + t.translate[0], p[1] * t.scale[1] + t.translate[1]];
  const stats = { edges: 0, mouths: 0, sea: 0 };
  for (let k = 0; k < n; k++) if (ok[k]) for (const h0 of [2 * k, 2 * k + 1]) {
    if (seen[h0]) continue;
    const P = [];
    let h = h0;
    do { seen[h] = 1; const l = h & 1 ? arcs[h >> 1].slice().reverse() : arcs[h >> 1]; for (let i = P.length ? 1 : 0; i < l.length; i++) P.push(l[i]); h = next(h); } while (h !== h0);
    const N = P.length - 1;
    if (N < 8) continue;
    // In kilometres: east and north of the first point by the local scale for distances, and on an equal-area plane for areas.
    const G = P.map(ll), E = G.map((g) => [g[0] * D2R * R, R * Math.sin(g[1] * D2R)]);
    const L = new Float64Array(N + 1), S = new Float64Array(N + 1);
    const dist = (i, j) => { const c = Math.cos(((G[i][1] + G[j][1]) / 2) * D2R); return Math.hypot((G[j][0] - G[i][0]) * c, G[j][1] - G[i][1]) * 111.195; };
    for (let i = 0; i < N; i++) { L[i + 1] = L[i] + dist(i, i + 1); S[i + 1] = S[i] + E[i][0] * E[i + 1][1] - E[i + 1][0] * E[i][1]; }
    // Only a face too large to be mended as it stands has inlets worth closing (its area positive for the open land outside).
    const whole = S[N] / 2;
    if (whole < 0 && -whole <= opt.big) continue;
    stats.edges++;
    const cell = opt.wide / 111.195, grid = new Map(), gk = (x, y) => x * 100003 + y;
    for (let i = 0; i < N; i++) { const id = gk(Math.floor(G[i][0] / cell), Math.floor(G[i][1] / cell)); let l = grid.get(id); if (!l) grid.set(id, (l = [])); l.push(i); }
    const along = (d) => { let lo = 0, hi = N; while (lo < hi) { const m = (lo + hi) >> 1; if (L[m] < d) lo = m + 1; else hi = m; } return lo; };
    for (let i = 0; i < N; i++) {
      const cx = Math.floor(G[i][0] / cell), cy = Math.floor(G[i][1] / cell), reach = Math.min(8, Math.ceil(1 / Math.max(0.12, Math.cos(G[i][1] * D2R))));
      let best = -1;
      for (let x = cx - reach; x <= cx + reach; x++) for (let y = cy - 1; y <= cy + 1; y++) {
        const l = grid.get(gk(x, y));
        if (!l) continue;
        for (const j of l) {
          if (j <= i + 2 || j <= best) continue;
          const d = dist(i, j), path = L[j] - L[i];
          if (d > opt.wide || path < 3 * d || path < opt.wide) continue;
          const A = (S[j] - S[i] + E[j][0] * E[i][1] - E[i][0] * E[j][1]) / 2;
          // The pocket lies on the face's side when the walk goes round it clockwise.
          if (A >= 0 || -A > opt.big || (-A > opt.small && (4 * -A) / (path + d) > opt.wide)) continue;
          best = j;
        }
      }
      if (best < 0) continue;
      const j = best, path = L[j] - L[i], mids = [[(G[i][0] + G[j][0]) / 2, (G[i][1] + G[j][1]) / 2]];
      for (const f of [0.15, 0.3, 0.45]) { const a = along(L[i] + f * path), b = along(L[j] - f * path); mids.push([(G[a][0] + G[b][0]) / 2, (G[a][1] + G[b][1]) / 2]); }
      if (mids.filter((m) => opt.onLand(m[0], m[1])).length < mids.length) { stats.sea++; continue; }
      out.push([P[i], P[j]]); stats.mouths++;
      i = j - 1;
    }
  }
  return { mouths: out, stats };
}
// Whether a point is on land, from a topology of the land (data/land.json's "lo" or "hi"): the lines' crossings of a ray counted.
export function landTest(land) {
  const t = land.transform, band = 0.5, rows = new Map();
  const obj = land.objects[Object.keys(land.objects)[0]], uses = new Int32Array(land.arcs.length);
  const walk = (a) => { if (typeof a === "number") uses[a < 0 ? ~a : a]++; else if (a) a.forEach(walk); };
  (obj.geometries || [obj]).forEach((g) => walk(g.arcs));
  land.arcs.forEach((arc, k) => {
    if (!(uses[k] & 1)) return;
    let x = 0, y = 0, prev = null;
    for (const p of arc) { x += p[0]; y += p[1]; const q = t ? [x * t.scale[0] + t.translate[0], y * t.scale[1] + t.translate[1]] : p; if (prev) { const b0 = Math.floor(Math.min(prev[1], q[1]) / band), b1 = Math.floor(Math.max(prev[1], q[1]) / band); for (let b = b0; b <= b1; b++) { let l = rows.get(b); if (!l) rows.set(b, (l = [])); l.push(prev[0], prev[1], q[0], q[1]); } } prev = q; }
  });
  return (lon, lat) => {
    const l = rows.get(Math.floor(lat / band));
    if (!l) return false;
    let odd = false;
    for (let i = 0; i < l.length; i += 4) { const y0 = l[i + 1], y1 = l[i + 3]; if ((y0 > lat) !== (y1 > lat) && lon < l[i] + ((lat - y0) / (y1 - y0)) * (l[i + 2] - l[i])) odd = !odd; }
    return odd;
  };
}

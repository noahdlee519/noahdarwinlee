// healNodes(topo, minKm2): on a quantized topology, joins arcs that meet at a point where no other arc ends (a cut build-eras.mjs made
// only so that a line comes out the same in every dated file: see splitAtNodes there), and drops that point where the triangle it
// makes with the points beside it is under minKm2, so the files are not weighed down with the meeting points of every other file.
export function healNodes(topo, minKm2) {
  const n = topo.arcs.length, t = topo.transform;
  const abs = topo.arcs.map((arc) => { let x = 0, y = 0; return arc.map((p) => { x += p[0]; y += p[1]; return [x, y]; }); });
  const used = new Uint8Array(n);
  const walk = (a, f) => { if (typeof a === "number") f(a); else if (a) a.forEach((x) => walk(x, f)); };
  for (const g of topo.objects.p.geometries) walk(g.arcs, (a) => { used[a < 0 ? ~a : a] = 1; });
  const key = (p) => p[0] * 4194304 + p[1];
  const ends = new Map();
  for (let k = 0; k < n; k++) {
    if (!used[k]) continue;
    const a = abs[k];
    for (const e of [0, 1]) { const kk = key(e ? a[a.length - 1] : a[0]); if (!ends.has(kk)) ends.set(kk, []); ends.get(kk).push([k, e]); }
  }
  // next[k][e]: the arc joined at end e of arc k (as [arc, its end]), where exactly two different arcs end there
  const link = new Map();
  for (const l of ends.values()) {
    if (l.length !== 2 || l[0][0] === l[1][0]) continue;
    link.set(l[0][0] * 2 + l[0][1], l[1]);
    link.set(l[1][0] * 2 + l[1][1], l[0]);
  }
  if (!link.size) return { joined: 0, dropped: 0 };
  // chains: walk from an arc end with no link (or anywhere in a closed chain)
  const chainOf = new Int32Array(n).fill(-1), dirOf = new Int8Array(n), posOf = new Int32Array(n), chains = [];
  const build = (start, startEnd) => {
    // start arc traversed so that we leave through end `out`; begin with the end opposite to startEnd as the chain's head
    const c = chains.length, items = [];
    let k = start, out = 1 - startEnd; // enter at startEnd, leave at `out`
    while (k !== -1 && chainOf[k] === -1) {
      chainOf[k] = c; dirOf[k] = out === 1 ? 1 : -1; posOf[k] = items.length; items.push(k);
      const nx = link.get(k * 2 + out);
      if (!nx) break;
      k = nx[0]; out = 1 - nx[1];
    }
    chains.push({ items, closed: false });
  };
  for (let k = 0; k < n; k++) {
    if (!used[k] || chainOf[k] !== -1) continue;
    const l0 = link.has(k * 2), l1 = link.has(k * 2 + 1);
    if (!l0 && !l1) continue;
    if (l0 && l1) continue; // interior: reached from a chain's head; closed chains handled below
    build(k, l0 ? 1 : 0);
  }
  for (let k = 0; k < n; k++) {
    if (!used[k] || chainOf[k] !== -1 || !link.has(k * 2) || !link.has(k * 2 + 1)) continue;
    build(k, 0);
    chains[chains.length - 1].closed = true;
  }
  // A chain is joined only if every ring that touches it runs its whole length in order (a ring that doubles back along one arc, as
  // a shape of no area does, leaves its chain as it is).
  const cidOf = (a) => chainOf[a < 0 ? ~a : a];
  const bad = new Set();
  const scan = (r) => {
    const m = r.length;
    let s = 0;
    if (cidOf(r[0]) !== -1 && m > 1) while (s < m && cidOf(r[(s + m - 1) % m]) === cidOf(r[s])) s++;
    const rr = s >= m ? r : r.slice(s).concat(r.slice(0, s));
    for (let i = 0; i < rr.length; ) {
      const a = rr[i], k = a < 0 ? ~a : a, c = chainOf[k];
      if (c === -1) { i++; continue; }
      const items = chains[c].items, len = items.length, fwd = (a >= 0) === (dirOf[k] === 1);
      let j = i, ok = true;
      while (j < rr.length && cidOf(rr[j]) === c) {
        const kk = rr[j] < 0 ? ~rr[j] : rr[j], want = fwd ? items[j - i] : items[len - 1 - (j - i)];
        if (j - i >= len || kk !== want || ((rr[j] >= 0) === (dirOf[kk] === 1)) !== fwd) ok = false;
        j++;
      }
      if (!ok || j - i !== len) bad.add(c);
      i = j;
    }
  };
  for (const g of topo.objects.p.geometries) {
    if (g.type === "Polygon") g.arcs.forEach(scan);
    else if (g.type === "MultiPolygon") g.arcs.forEach((poly) => poly.forEach(scan));
  }
  for (const c of bad) for (const k of chains[c].items) chainOf[k] = -1;
  let joined = 0, dropped = 0;
  const kmx = (p) => { const lat = p[1] * t.scale[1] + t.translate[1]; return [(p[0] * t.scale[0] + t.translate[0]) * 111.32 * Math.cos((lat * Math.PI) / 180), lat * 110.57]; };
  const tri = (a, b, c) => { const A = kmx(a), B = kmx(b), C = kmx(c); return Math.abs((B[0] - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (B[1] - A[1])) / 2; };
  const newIndex = new Int32Array(chains.length);
  chains.forEach((ch, c) => {
    if (bad.has(c)) return;
    const pts = [], seams = [];
    ch.items.forEach((k, i) => {
      const a = dirOf[k] === 1 ? abs[k] : abs[k].slice().reverse();
      if (i) { seams.push(pts.length - 1); pts.push(...a.slice(1)); } else pts.push(...a);
    });
    joined += ch.items.length - 1;
    const drop = new Set(), seamSet = new Set(seams);
    // Visvalingam's way, over the cut points alone: the one whose triangle with the points still beside it is smallest goes, and
    // the triangles beside it are measured again, until none is under the limit, so a curve cut at every point keeps its shape.
    const prev = pts.map((_, i) => i - 1), next = pts.map((_, i) => (i + 1 < pts.length ? i + 1 : -1));
    const cand = new Set(seams.filter((i) => i > 0 && i + 1 < pts.length));
    for (;;) {
      let best = -1, area = Infinity;
      for (const i of cand) { const a = tri(pts[prev[i]], pts[i], pts[next[i]]); if (a < area) { area = a; best = i; } }
      if (best < 0 || area >= minKm2) break;
      cand.delete(best); drop.add(best); dropped++;
      next[prev[best]] = next[best]; prev[next[best]] = prev[best];
    }
    const kept = pts.filter((_, i) => !drop.has(i));
    const first = ch.items[0];
    abs[first] = kept;
    newIndex[c] = first;
  });
  const ring = (r) => {
    const m = r.length;
    // rotate so the ring does not begin inside a chain
    let s = 0;
    const cid = (a) => chainOf[a < 0 ? ~a : a];
    if (cid(r[0]) !== -1 && m > 1) while (s < m && cid(r[(s + m - 1) % m]) === cid(r[s])) s++;
    const rr = s >= m ? r : r.slice(s).concat(r.slice(0, s));
    const out = [];
    for (let i = 0; i < rr.length; ) {
      const a = rr[i], k = a < 0 ? ~a : a, c = chainOf[k];
      if (c === -1) { out.push(a); i++; continue; }
      const len = chains[c].items.length, fwd = (a >= 0) === (dirOf[k] === 1);
      let j = i;
      while (j < rr.length && cid(rr[j]) === c && j - i < len) j++;
      if (j - i !== len) throw new Error("heal: a ring crosses chain " + c + " in part (" + (j - i) + " of " + len + ")");
      out.push(fwd ? newIndex[c] : ~newIndex[c]);
      i = j;
    }
    return out;
  };
  for (const g of topo.objects.p.geometries) {
    if (g.type === "Polygon") g.arcs = g.arcs.map(ring);
    else if (g.type === "MultiPolygon") g.arcs = g.arcs.map((poly) => poly.map(ring));
  }
  chains.forEach((ch, c) => { if (!bad.has(c)) ch.items.slice(1).forEach((k) => { abs[k] = [abs[k][0], abs[k][0]]; }); });
  topo.arcs = abs.map((a) => a.map((p, i) => (i ? [p[0] - a[i - 1][0], p[1] - a[i - 1][1]] : p)));
  return { joined, dropped, left: bad.size };
}

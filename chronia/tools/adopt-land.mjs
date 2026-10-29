// Land that no span from 1886 ever covers, though Natural Earth has it: the strips between
// CShapes' coarse coasts and the real ones, and islands CShapes leaves out (Anholt, Fehmarn,
// the North Frisian Islands). Each piece is given, for every stretch of time, to the span
// nearest to it on average then, if one is near enough. Land that is blank only at some dates
// (unclaimed interiors in the 1880s and 1890s, Svalbard before 1925) is never touched, since
// some span covers it at another date.
//
// Natural Earth's present-day owner of the piece (from its admin-1 units) is preferred when the
// span of that state, or of a state in its lineage, is about as near as the nearest one. That
// keeps Borkum German and Capraia Italian, though the Dutch and French coasts are as close.
// For strips of coast, it is preferred only when that span touches the strip, so a coast that
// changed hands (North Schleswig before 1920) goes to the state of the time.
//
// adoptLand({ list, land, clip, endDay, units, same }) returns edits for reshape():
// { base, first, last, polys, add: true }. units are Natural Earth's admin-1 units as
// { name, polys, box }, and same(unitName, spanName) says whether a span is that state's.

export const ADOPT = {
  TILE_DEG: 2, // land and spans are cut into tiles of this size to keep the clipping small
  MIN_KM2: 0.3, // smaller pieces are left to the page's coast fill
  SAMPLE: 48, // points along a piece measured for its distance to each span
  TOUCH_KM: 0.5, // a piece this close to a span at some date counts as touching the land
  STRIP_KM: 12, // a touching piece no wider than this (twice its area over its perimeter) is a strip of coast
  STRIP_KM2: 150, // or no larger than this
  STRIP_REACH_KM: 25, // a strip goes to a span whose mean distance from it is within this
  STRIP_MIN_KM: 1, // a strip narrower than this and smaller than STRIP_SMALL_KM2 is left to the page's
  STRIP_SMALL_KM2: 50, // coast fill, which covers it at every zoom (about 25,000 strips, three quarters of the points)
  ISLAND_KM: 60, // an island goes to a span this close to its nearest point, at most
  NE_SLACK_KM: 20, // the state Natural Earth gives a piece to wins if it is no more than this further than the nearest
  NE_NEAR_KM: 5, // a piece outside every Natural Earth unit takes the unit within this distance
  SOUTH: -60, // Antarctica is left alone
};

const RAD = Math.PI / 180, KM = 111.195;

const boxOf = (polys) => {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const poly of polys) for (const p of poly[0]) { if (p[0] < b[0]) b[0] = p[0]; if (p[1] < b[1]) b[1] = p[1]; if (p[0] > b[2]) b[2] = p[0]; if (p[1] > b[3]) b[3] = p[1]; }
  return b;
};
const hit = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
const planar = (ring) => { let s = 0; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) s += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]); return s / 2; };
const ringKm2 = (ring) => { const lat0 = ring.reduce((t, p) => t + p[1], 0) / ring.length; return Math.abs(planar(ring)) * Math.cos(lat0 * RAD) * KM * KM; };
const polyKm2 = (poly) => Math.max(0, ringKm2(poly[0]) - poly.slice(1).reduce((t, r) => t + ringKm2(r), 0));
const ringKm = (ring) => { let s = 0; for (let i = 1; i < ring.length; i++) { const k = Math.cos(((ring[i][1] + ring[i - 1][1]) / 2) * RAD); s += Math.hypot((ring[i][0] - ring[i - 1][0]) * k, ring[i][1] - ring[i - 1][1]) * KM; } return s; };

function clipRect(polys, b) {
  const edge = (ring, inside, cut) => {
    const out = [];
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i], q = ring[(i + 1) % ring.length], a = inside(p), c = inside(q);
      if (a) out.push(p);
      if (a !== c) out.push(cut(p, q));
    }
    return out;
  };
  const at = (k, v) => (p, q) => { const t = (v - p[k]) / (q[k] - p[k]); return k ? [p[0] + t * (q[0] - p[0]), v] : [v, p[1] + t * (q[1] - p[1])]; };
  const res = [];
  for (const poly of polys) {
    const pb = boxOf([poly]);
    if (!hit(pb, b)) continue;
    if (pb[0] >= b[0] && pb[2] <= b[2] && pb[1] >= b[1] && pb[3] <= b[3]) { res.push(poly); continue; }
    const rings = [];
    for (const ring of poly) {
      let r = ring.slice(0, -1);
      r = edge(r, (p) => p[0] >= b[0], at(0, b[0]));
      r = edge(r, (p) => p[0] <= b[2], at(0, b[2]));
      r = edge(r, (p) => p[1] >= b[1], at(1, b[1]));
      r = edge(r, (p) => p[1] <= b[3], at(1, b[3]));
      if (r.length >= 3) rings.push(r.concat([r[0]]));
      else if (!rings.length) break;
    }
    if (rings.length) res.push(rings);
  }
  return res;
}

// Points along the outer ring, evenly by count.
const samples = (poly, n) => {
  const ring = poly[0], step = Math.max(1, Math.floor((ring.length - 1) / n)), out = [];
  for (let i = 0; i < ring.length - 1; i += step) out.push(ring[i]);
  return out;
};

// Segments of a span's rings inside a box, in km about a reference latitude.
const segsIn = (polys, b) => {
  const segs = [];
  for (const poly of polys) {
    if (!hit(boxOf([poly]), b)) continue;
    for (const ring of poly) for (let i = 1; i < ring.length; i++) {
      const p = ring[i - 1], q = ring[i];
      if (Math.max(p[0], q[0]) < b[0] || Math.min(p[0], q[0]) > b[2] || Math.max(p[1], q[1]) < b[1] || Math.min(p[1], q[1]) > b[3]) continue;
      segs.push(p[0], p[1], q[0], q[1]);
    }
  }
  return segs;
};
const distTo = (pt, segs, kx) => {
  let best = Infinity;
  for (let i = 0; i < segs.length; i += 4) {
    const ax = (segs[i] - pt[0]) * kx, ay = segs[i + 1] - pt[1], bx = (segs[i + 2] - pt[0]) * kx, by = segs[i + 3] - pt[1];
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    const t = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0;
    const d = (ax + t * dx) ** 2 + (ay + t * dy) ** 2;
    if (d < best) best = d;
  }
  return Math.sqrt(best) * KM;
};
// Whether a point lies inside a span (then its distance is 0).
const inside = (pt, polys) => {
  for (const poly of polys) {
    let inn = false;
    for (let k = 0; k < poly.length; k++) {
      const ring = poly[k];
      let c = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const a = ring[i], b = ring[j];
        if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < ((b[0] - a[0]) * (pt[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
      }
      if (k === 0) { if (!c) break; inn = true; } else if (c) { inn = false; break; }
    }
    if (inn) return true;
  }
  return false;
};

function unitAt(pt, units, nearKm) {
  let best = null, bd = Infinity;
  const kx = Math.cos(pt[1] * RAD), r = nearKm / KM;
  for (const u of units) {
    if (pt[0] < u.box[0] - r / Math.max(0.2, kx) || pt[0] > u.box[2] + r / Math.max(0.2, kx) || pt[1] < u.box[1] - r || pt[1] > u.box[3] + r) continue;
    if (inside(pt, u.polys)) return u.name;
    for (const poly of u.polys) for (const v of poly[0]) { const d = ((v[0] - pt[0]) * kx) ** 2 + (v[1] - pt[1]) ** 2; if (d < bd) { bd = d; best = u.name; } }
  }
  return Math.sqrt(bd) * KM <= nearKm ? best : null;
}
const middle = (poly) => {
  const ring = poly[0], c = [ring.reduce((t, v) => t + v[0], 0) / ring.length, ring.reduce((t, v) => t + v[1], 0) / ring.length];
  if (inside(c, [poly])) return c;
  for (let i = 0; i + 2 < ring.length; i++) { const q = [(ring[i][0] + ring[i + 1][0] + ring[i + 2][0]) / 3, (ring[i][1] + ring[i + 1][1] + ring[i + 2][1]) / 3]; if (inside(q, [poly])) return q; }
  return ring[0];
};

export function adoptLand({ list, land, clip, endDay, units = [], same = () => false, log = console.log }) {
  const A = ADOPT, T = A.TILE_DEG, t0 = Date.now();
  const tileKey = (i, j) => i * 1000 + j;
  const tileBox = (i, j) => [-180 + i * T, -90 + j * T, -180 + (i + 1) * T, -90 + (j + 1) * T];
  const tilesOf = (b) => {
    const out = [];
    for (let i = Math.max(0, Math.floor((b[0] + 180) / T)); i <= Math.min(360 / T - 1, Math.floor((b[2] + 180) / T)); i++)
      for (let j = Math.max(0, Math.floor((b[1] + 90) / T)); j <= Math.min(180 / T - 1, Math.floor((b[3] + 90) / T)); j++) out.push([i, j]);
    return out;
  };
  // Land, cut into tiles.
  const landTiles = new Map();
  for (const poly of land) {
    const b = boxOf([poly]);
    if (b[3] < A.SOUTH) continue;
    for (const [i, j] of tilesOf(b)) {
      const part = clipRect([poly], tileBox(i, j));
      if (!part.length) continue;
      const k = tileKey(i, j);
      if (!landTiles.has(k)) landTiles.set(k, []);
      landTiles.get(k).push(...part);
    }
  }
  // Every span's shape, cut into the same tiles, once per distinct shape.
  const spanTiles = new Map(), seen = new Map();
  for (const s of list) {
    if (seen.has(s.polys)) continue;
    seen.set(s.polys, true);
    const b = s.box || boxOf(s.polys);
    for (const [i, j] of tilesOf(b)) {
      const k = tileKey(i, j);
      if (!landTiles.has(k)) continue;
      const part = clipRect(s.polys, tileBox(i, j));
      if (!part.length) continue;
      if (!spanTiles.has(k)) spanTiles.set(k, new Map());
      spanTiles.get(k).set(JSON.stringify(part).length + ":" + part[0][0][0].join(), part);
    }
  }
  // Land no span ever covers.
  const pieces = [];
  let failed = 0;
  for (const [k, lp] of landTiles) {
    const sp = spanTiles.has(k) ? [...spanTiles.get(k).values()] : [];
    let rest;
    try { rest = sp.length ? clip.difference(lp, ...sp) : clip.union(lp); } catch (e) {
      rest = lp;
      for (const c of sp) { try { rest = clip.difference(rest, c); } catch (e2) { failed++; } }
    }
    for (const poly of rest) {
      const a = polyKm2(poly);
      if (a < A.MIN_KM2) continue;
      pieces.push({ poly, a, w: (2 * a) / ringKm(poly[0]), box: boxOf([poly]) });
    }
  }
  landTiles.clear(); spanTiles.clear(); // the tiles are large and no longer needed
  log("adopting land: " + pieces.length + " pieces of land no span from 1886 covers, " + Math.round(pieces.reduce((t, p) => t + p.a, 0)) + " km², " + Math.round((Date.now() - t0) / 1000) + " s" + (failed ? ", " + failed + " clips failed" : ""));

  // Spans near each piece, and how far each is.
  const byBox = list.slice().sort((a, b) => (a.box || boxOf(a.polys))[0] - (b.box || boxOf(b.polys))[0]);
  const edits = [], stats = { strips: 0, islands: 0, wide: 0, far: 0, thin: 0, km2: 0, ne: 0 };
  const memo = new Map();
  for (const pc of pieces) {
    const lat = (pc.box[1] + pc.box[3]) / 2, kx = Math.cos(lat * RAD), reach = A.ISLAND_KM / KM;
    const near = [pc.box[0] - reach / Math.max(0.2, kx), pc.box[1] - reach, pc.box[2] + reach / Math.max(0.2, kx), pc.box[3] + reach];
    const pts = samples(pc.poly, A.SAMPLE);
    const cands = [];
    for (const s of byBox) {
      const b = s.box || boxOf(s.polys);
      if (b[0] > near[2]) break;
      if (!hit(b, near) || s.last < 0 || s.first > endDay) continue;
      let d = memo.get(s.polys);
      if (!d || d.pc !== pc) {
        const segs = segsIn(s.polys, near);
        const ds = segs.length ? pts.map((p) => (inside(p, s.polys) ? 0 : distTo(p, segs, kx))) : null;
        d = { pc, min: ds ? Math.min(...ds) : Infinity, mean: ds ? ds.reduce((t, v) => t + v, 0) / ds.length : Infinity };
        memo.set(s.polys, d);
      }
      if (d.min <= A.ISLAND_KM) cands.push({ s, min: d.min, mean: d.mean });
    }
    if (!cands.length) { stats.far++; continue; }
    const touching = cands.some((c) => c.min <= A.TOUCH_KM);
    if (touching && pc.w > A.STRIP_KM && pc.a > A.STRIP_KM2) { stats.wide++; continue; }
    if (touching && pc.w < A.STRIP_MIN_KM && pc.a < A.STRIP_SMALL_KM2) { stats.thin++; continue; }
    const ok = (c) => (touching ? c.mean <= A.STRIP_REACH_KM : c.min <= A.ISLAND_KM);
    const score = (c) => (touching ? c.mean : c.min + 0.01 * c.mean);
    const owner = units.length ? unitAt(middle(pc.poly), units, A.NE_NEAR_KM) : null;
    const theirs = owner ? (c) => same(owner, c.s.name) && (touching ? c.min <= A.TOUCH_KM : true) : () => false;
    const cuts = new Set([0]);
    for (const c of cands) { if (c.s.first > 0) cuts.add(c.s.first); if (c.s.last + 1 <= endDay) cuts.add(c.s.last + 1); }
    const bounds = [...cuts].sort((a, b) => a - b);
    let used = false;
    bounds.forEach((s0, k) => {
      const e0 = k + 1 < bounds.length ? bounds[k + 1] - 1 : endDay;
      let best = null, mine = null;
      for (const c of cands) {
        if (c.s.first > s0 || s0 > c.s.last || !ok(c)) continue;
        if (!best || score(c) < score(best)) best = c;
        if (theirs(c) && (!mine || score(c) < score(mine))) mine = c;
      }
      if (mine && (touching || mine.min <= best.min + A.NE_SLACK_KM)) { if (mine !== best) stats.ne++; best = mine; }
      if (!best) return;
      const last = edits[edits.length - 1];
      if (last && last.base === best.s && last.polys[0] === pc.poly && last.last + 1 === s0) { last.last = Math.min(e0, best.s.last); return; }
      edits.push({ base: best.s, first: s0, last: Math.min(e0, best.s.last), polys: [pc.poly], add: true });
      used = true;
    });
    if (used) { stats[touching ? "strips" : "islands"]++; stats.km2 += pc.a; }
  }
  log("adopting land: " + stats.strips + " strips of coast and " + stats.islands + " islands given to the spans nearest them (" + Math.round(stats.km2) + " km²), " + stats.thin + " thin strips left to the coast fill, " + stats.wide + " wide pieces and " + stats.far + " distant ones left blank, " + stats.ne + " times Natural Earth's owner over a nearer span, " + edits.length + " edits, " + Math.round((Date.now() - t0) / 1000) + " s");
  return { edits, pieces, stats };
}

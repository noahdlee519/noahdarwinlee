// Softens the inland edges of a shape built from today's units, for the early cultures, whose extents archaeology knows
// only roughly: drawn as unions of provinces they followed today's borders exactly. The coast is kept as it is.
//
// For a shape A of R km's scale (0.15 × √area, from 20 to 160 km):
//   1. The sea within 2.5 R of A counts as part of it, so the steps below touch only the edges on land.
//   2. A closing (out R, in R) and an opening (in R, out R) round its corners and fill its notches at that scale.
//   3. The edge is moved in and out along its normal by two waves, 3.5 R and 8 R long, together up to 0.4 R, their phases
//      from a hash of the seed, so a long straight line or a run of a modern border doesn't survive.
//   4. What is left is cut to A's own land, exactly, and to the land of the neighbouring units it reaches, where only the
//      pieces that touch A are kept, so it never jumps the sea to other land.
// Steps 1 to 3 work on outlines simplified to R / 25 (R / 10 for the rounding, with holes smaller than a circle of radius R
// filled), which is finer than anything they change.
// The same seed and shape give the same result in every build. A shape that fails is kept as drawn, and logged.
import { createHash } from "node:crypto";

const D2R = Math.PI / 180;
const kmX = (lat) => 111.32 * Math.cos(lat * D2R), KM_Y = 110.57;
const ringKm2 = (ring) => {
  let a = 0;
  const cx = kmX(ring[0][1]);
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += ring[j][0] * cx * ring[i][1] * KM_Y - ring[i][0] * cx * ring[j][1] * KM_Y;
  return Math.abs(a / 2);
};
const km2Of = (polys) => polys.reduce((t, p) => t + ringKm2(p[0]) - p.slice(1).reduce((u, h) => u + ringKm2(h), 0), 0);
const boxOf = (polys) => {
  const b = [180, 90, -180, -90];
  for (const p of polys) for (const [x, y] of p[0]) { if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; }
  return b;
};
const meets = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];

export const SOFT_SCALE = 0.15, SOFT_MIN_KM = 20, SOFT_MAX_KM = 160, SOFT_SEA = 2.5, SOFT_WAVE = 0.4;

export function makeSoften({ clip, turfBuf, landFeats }) {
  const land = landFeats.map((f) => {
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    return { polys, box: boxOf(polys) };
  });
  const buf = (polys, km) => {
    if (!polys.length) return [];
    const g = turfBuf({ type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: polys } }, km, { units: "kilometers", steps: 6 });
    if (!g || !g.geometry) return [];
    return g.geometry.type === "Polygon" ? [g.geometry.coordinates] : g.geometry.coordinates;
  };
  const simplify = (polys, tol) => polys.map((poly) => poly.map((ring) => {
    if (ring.length < 8) return ring;
    const keep = new Uint8Array(ring.length), stack = [[0, ring.length - 1]];
    keep[0] = keep[ring.length - 1] = 1;
    while (stack.length) {
      const [i, j] = stack.pop();
      const [x0, y0] = ring[i], [x1, y1] = ring[j], dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy;
      let far = -1, fd = tol * tol;
      for (let k = i + 1; k < j; k++) {
        const [x, y] = ring[k], t = l2 ? Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / l2)) : 0;
        const d = (x - x0 - t * dx) ** 2 + (y - y0 - t * dy) ** 2;
        if (d > fd) { fd = d; far = k; }
      }
      if (far > 0) { keep[far] = 1; stack.push([i, far], [far, j]); }
    }
    const out = ring.filter((_, k) => keep[k]);
    return out.length >= 4 ? out : ring;
  }));
  const wave = (polys, R, seed) => {
    const h = createHash("sha1").update(seed).digest(), ph = [h[0], h[1]].map((v) => (v / 255) * 2 * Math.PI);
    const step = Math.max(4, R / 5);
    return polys.map((poly) => poly.map((ring) => {
      const pts = [];
      for (let i = 0; i < ring.length - 1; i++) {
        const [x0, y0] = ring[i], [x1, y1] = ring[i + 1], lat = (y0 + y1) / 2;
        const n = Math.max(1, Math.ceil(Math.hypot((x1 - x0) * kmX(lat), (y1 - y0) * KM_Y) / step));
        for (let k = 0; k < n; k++) pts.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
      }
      if (pts.length < 3) return ring;
      let s = 0;
      const out = pts.map((p, i) => {
        const a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length], lat = p[1];
        const tx = (b[0] - a[0]) * kmX(lat), ty = (b[1] - a[1]) * KM_Y, tl = Math.hypot(tx, ty) || 1;
        if (i) s += Math.hypot((p[0] - pts[i - 1][0]) * kmX(lat), (p[1] - pts[i - 1][1]) * KM_Y);
        const w = R * SOFT_WAVE * (0.6 * Math.sin((2 * Math.PI * s) / (3.5 * R) + ph[0]) + 0.4 * Math.sin((2 * Math.PI * s) / (8 * R) + ph[1]));
        return [p[0] + ((ty / tl) * w) / kmX(lat), p[1] - ((tx / tl) * w) / KM_Y];
      });
      out.push(out[0]);
      return out;
    }));
  };
  // polygon-clipping can fail on near-coincident edges; an operation that throws is tried again on coordinates rounded to
  // 1e-6 and then 1e-5 degrees.
  const roundTo = (g, k) => g.map((poly) => poly.map((ring) => ring.map(([x, y]) => [Math.round(x * k) / k, Math.round(y * k) / k])));
  const safe = (op, ...gs) => {
    for (const k of [0, 1e6, 1e5]) {
      try { return clip[op](...(k ? gs.map((g) => roundTo(g, k)) : gs)); } catch (e) { if (k === 1e5) throw e; }
    }
  };
  const soften = (polys, seed) => {
    const R = Math.max(SOFT_MIN_KM, Math.min(SOFT_MAX_KM, SOFT_SCALE * Math.sqrt(km2Of(polys))));
    const tol = R / 25 / 111, coarse = simplify(polys, tol);
    const near = buf(coarse, SOFT_SEA * R), units = land.filter((l) => meets(l.box, boxOf(near)));
    const landC = units.length ? safe("union", ...units.map((l) => simplify(l.polys, tol))) : [];
    const S0 = safe("difference", near, safe("difference", landC, coarse)), hole = Math.PI * R * R;
    const S = simplify(S0.map((poly) => [poly[0]].concat(poly.slice(1).filter((h) => ringKm2(h) > hole))).filter((poly) => ringKm2(poly[0]) > hole / 4), tol * 2.5);
    let T = buf(buf(S, R), -R);
    T = buf(buf(T, -R), R);
    if (!T.length) T = S;
    const W = safe("union", wave(T, R, seed)), wBox = boxOf(W);
    const own = safe("intersection", W, polys), touch = buf(coarse, 2 * tol * 111);
    const spill = [];
    for (const u of units) {
      if (!meets(u.box, wBox)) continue;
      let ps = [];
      try {
        for (const p of safe("difference", safe("intersection", u.polys, W), polys)) if (safe("intersection", [p], touch).length) spill.push([p]);
      } catch (e) { continue; }
    }
    const out = spill.length ? safe("union", own, ...spill) : own;
    return out.length ? out : polys;
  };
  // A shape that still can't be softened is kept as it was, and named in the log.
  return (polys, seed) => {
    try { return soften(polys, seed); } catch (e) { console.log("soften: kept as drawn, " + e.message.slice(0, 80) + " for " + seed.slice(0, 120)); return polys; }
  };
}

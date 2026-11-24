// The island called About: land no project holds, with the "you are here" dot near its middle.
//
// Noah, 24 November 2026: bigger and more interesting. It stands in the open sea, clear of every other coast, about
// the size of a small project's island or a little less, with a coastline of its own: two or three bays or coves, a
// headland with a lighthouse on it, a named hill with its height, a pond or a small lake, one or two villages joined by
// a road, and now and then an islet or two offshore. Each world sets it in its own way (see ABOUT_KINDS), and names
// its places from one plain theme that suits "About" (Biography Bay, Portrait Hill, Footnote Lighthouse, and so on).
//
// The island is drawn from a field: positive on land, negative at sea, sampled on a fine grid. Its coast (and the
// water within it) is traced from that grid, the land cover is painted from it, and the villages, the road, the
// hill, and the pond are found on it.

import { makeNoise, fbm, clamp, smoothstep } from './rng.mjs';
import { COVER } from './climate.mjs';
import { landDistance } from './polar.mjs';

// The settings, one per world (see WORLDS in world.mjs):
//   volcano     a cone with a crater lake at its top
//   atoll       a lagoon within the island, open to the sea by a narrow pass
//   crescent    one great round bay, the island curved about it
//   fjord       cut by long narrow inlets
//   loch        a larger lake in its middle
//   lighthouse  a long cape, its lighthouse, and stacks off the point
//   causeway    a causeway out to a small islet of its own
//   ferry       a ferry from its harbour to the nearest town across the water
export const ABOUT_KINDS = ['volcano', 'atoll', 'crescent', 'fjord', 'loch', 'lighthouse', 'causeway', 'ferry'];

// Names, from one theme. Each word is used once in a world.
const NAMES = {
  hill: ['Portrait', 'Profile', 'Memoir', 'Headline', 'Masthead', 'Signature', 'Milestone', 'Overview', 'Biography'],
  lake: ['Byline', 'Margin', 'Caption', 'Epigraph', 'Preface', 'Synopsis', 'Abstract', 'Excerpt'],
  village: ['Curriculum', 'Foreword', 'Hometown', 'Letterhead', 'Monogram', 'Keepsake', 'Vita', 'Autograph', 'Colophon', 'Dedication', 'Prologue', 'Nameplate'],
  bay: ['Biography', 'Anecdote', 'Interview', 'Testimony', 'Narrative', 'Chronicle', 'Headshot', 'Reminiscence', 'Backstory'],
  cape: ['Résumé', 'Credentials', 'Highlight', 'Summary', 'Tagline', 'Pitch'],
  light: ['Footnote', 'Spotlight', 'Keynote', 'Masthead', 'Headline', 'Byline'],
  islet: ['Postscript', 'Addendum', 'Appendix', 'Endnote', 'Afterword', 'Errata'],
};

// Distance on a grid from every cell where `src` is set (chamfer, in cell steps).
function gridDistance(src, nx, ny) {
  const d = new Float32Array(nx * ny);
  for (let i = 0; i < d.length; i++) d[i] = src[i] ? 0 : 1e9;
  const B = Math.SQRT2;
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const i = y * nx + x; if (!d[i]) continue;
    let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + 1);
    if (y > 0) { v = Math.min(v, d[i - nx] + 1); if (x > 0) v = Math.min(v, d[i - nx - 1] + B); if (x < nx - 1) v = Math.min(v, d[i - nx + 1] + B); }
    d[i] = v;
  }
  for (let y = ny - 1; y >= 0; y--) for (let x = nx - 1; x >= 0; x--) {
    const i = y * nx + x; if (!d[i]) continue;
    let v = d[i];
    if (x < nx - 1) v = Math.min(v, d[i + 1] + 1);
    if (y < ny - 1) { v = Math.min(v, d[i + nx] + 1); if (x < nx - 1) v = Math.min(v, d[i + nx + 1] + B); if (x > 0) v = Math.min(v, d[i + nx - 1] + B); }
    d[i] = v;
  }
  return d;
}

// The loops where a gridded field crosses zero (marching squares), in world units.
function contours(F, nx, ny, x0, y0, g) {
  const link = new Map();
  const add = (a, b) => { (link.get(a) || link.set(a, []).get(a)).push(b); (link.get(b) || link.set(b, []).get(b)).push(a); };
  // Edge ids: the cell corner's index, times two, plus 0 for the edge to the east and 1 for the edge to the south.
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const k = j * nx + i, a = F[k] > 0, b = F[k + 1] > 0, c = F[k + nx + 1] > 0, d = F[k + nx] > 0;
    const code = a | (b << 1) | (c << 2) | (d << 3);
    if (code === 0 || code === 15) continue;
    const T = k * 2, Rr = (k + 1) * 2 + 1, Bt = (k + nx) * 2, L = k * 2 + 1;
    const mid = (F[k] + F[k + 1] + F[k + nx + 1] + F[k + nx]) / 4 > 0;
    switch (code) {
      case 1: case 14: add(L, T); break;
      case 2: case 13: add(T, Rr); break;
      case 3: case 12: add(L, Rr); break;
      case 4: case 11: add(Rr, Bt); break;
      case 6: case 9: add(T, Bt); break;
      case 7: case 8: add(L, Bt); break;
      case 5: if (mid) { add(T, Rr); add(Bt, L); } else { add(L, T); add(Rr, Bt); } break;
      case 10: if (mid) { add(L, T); add(Rr, Bt); } else { add(T, Rr); add(Bt, L); } break;
    }
  }
  const pos = (id) => {
    const k = id >> 1, i = k % nx, j = (k - i) / nx, a = F[k], b = id & 1 ? F[k + nx] : F[k + 1], t = a / (a - b);
    return id & 1 ? [x0 + i * g, y0 + (j + t) * g] : [x0 + (i + t) * g, y0 + j * g];
  };
  const seen = new Set(), loops = [];
  for (const start of link.keys()) {
    if (seen.has(start)) continue;
    const loop = [];
    let prev = -1, cur = start;
    while (!seen.has(cur)) {
      seen.add(cur); loop.push(pos(cur));
      const nb = link.get(cur), next = nb[0] !== prev ? nb[0] : nb[1];
      prev = cur; cur = next;
      if (cur === undefined) break;
    }
    if (loop.length >= 6) loops.push(loop);
  }
  return loops;
}

// Douglas-Peucker, for a closed loop.
function simplifyLoop(loop, tol) {
  const n = loop.length;
  if (n < 8) return loop;
  let far = 0, fd = -1;
  for (let k = 1; k < n; k++) { const d = Math.hypot(loop[k][0] - loop[0][0], loop[k][1] - loop[0][1]); if (d > fd) { fd = d; far = k; } }
  const keep = new Uint8Array(n);
  keep[0] = keep[far] = 1;
  const rdp = (a, b) => {
    const stack = [[a, b]];
    while (stack.length) {
      const [s, e] = stack.pop();
      const [x0, y0] = loop[s % n], [x1, y1] = loop[e % n];
      const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1e-9;
      let best = -1, bd = tol;
      for (let k = s + 1; k < e; k++) { const [x, y] = loop[k % n]; const d = Math.abs((x - x0) * dy - (y - y0) * dx) / l; if (d > bd) { bd = d; best = k; } }
      if (best >= 0) { keep[best % n] = 1; stack.push([s, best], [best, e]); }
    }
  };
  rdp(0, far); rdp(far, n);
  return loop.filter((p, k) => keep[k]);
}

const segDist = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return [Math.hypot(px - ax - t * dx, py - ay - t * dy), t];
};
const angDiff = (a, b) => Math.abs(((a - b + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);

// placeAbout({ land, ice, width, height, rng, kind, temp }) => {
//   kind, x, y (the dot), cx, cy, r (its reach from the dot), rings (land), holes (water within it), mask (its pixels),
//   cover: (x, y, facet x, facet y, jitter, sliver, scale) => class or -1, field: (x, y) => > 0 on land,
//   peak: [x, y, metres], pond: { x, y, r, crater }, lagoon, villages: [{ x, y, r, bay }], roads: [[x, y], ...][],
//   lighthouse: [x, y], cape: { x, y, tip }, bays: [{ x, y, w, big }], islets: [{ x, y, r }], causeway, dock, names
// } or null
export function placeAbout({ land, ice, width, height, rng, kind = 'volcano', temp = null, area: want = 1800 * (width / 1600) ** 2 }) {
  const W = width, H = height, N = W * H, S = W / 1600, TAU = Math.PI * 2;
  if (!ABOUT_KINDS.includes(kind)) kind = 'lighthouse';
  const r = rng.fork('about');
  const all = new Uint8Array(N);
  for (let i = 0; i < N; i++) all[i] = land[i] || (ice && ice[i]) ? 1 : 0;
  const dl = landDistance(all, W, H);
  const nA = makeNoise(r.fork('about-shape')), nB = makeNoise(r.fork('about-coast')), nC = makeNoise(r.fork('about-cover'));
  const sp = r.fork('about-plan');

  // ---- Where: in the open sea, with room all round. ----
  // (Its radius, before the coast is cut, for the area wanted: a small project's island, or a little less; set right
  // once the shape is drawn.)
  const R0 = clamp(Math.sqrt(want / 2.7) * sp.range(0.97, 1.03), 20 * S, 36 * S);
  const EXT = 1.95, CLEAR = 6 * S;
  const need = R0 * EXT + CLEAR;
  const cands = [];
  for (let y = 95 * S; y < H - 95 * S; y += 4 * S) for (let x = 115 * S; x < W - 115 * S; x += 4 * S) {
    const d = dl[Math.floor(y) * W + Math.floor(x)];
    if (d < need * 0.62) continue;
    // Room enough, and not far out in an empty ocean: near enough other land to be seen with it; and near the middle.
    const over = d - (need + 5 * S);
    const score = -(over < 0 ? -over * 3 : over * (kind === 'ferry' ? 1.4 : 0.7)) - 0.05 * Math.hypot(x - W / 2, (y - H / 2) * 1.6) + r.next() * 16 * S;
    cands.push({ x, y, score });
  }
  cands.sort((a, b) => b.score - a.score || a.y - b.y || a.x - b.x);
  if (!cands[0]) return null;
  const cx = cands[0].x, cy = cands[0].y;
  const room = dl[Math.floor(cy) * W + Math.floor(cx)];
  const cold = temp ? temp[Math.floor(cy) * W + Math.floor(cx)] < 4 : false;

  // The nearest other land: which way the harbour faces (and the ferry runs).
  let shore = null;
  {
    let best = Infinity;
    const reach = Math.ceil(room + 30 * S);
    for (let y = Math.floor(cy - reach); y <= cy + reach; y += 1) for (let x = Math.floor(cx - reach); x <= cx + reach; x += 1) {
      if (y < 0 || y >= H) continue;
      const xx = ((x % W) + W) % W;
      if (!land[y * W + xx]) continue;
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d < best) { best = d; shore = [x + 0.5, y + 0.5]; }
    }
  }
  const toward = shore ? Math.atan2(shore[1] - cy, shore[0] - cx) : sp.next() * TAU;

  // ---- What shape: a plan in units of the radius, centred on the site. ----
  const lean = sp.next() * Math.PI, st = sp.range(1.12, 1.42), rs = Math.sqrt(st);
  const cl = Math.cos(lean), sl = Math.sin(lean);
  const lobe = (t) => 1 + 0.2 * fbm(nA, Math.cos(t) * 1.3 + 3, Math.sin(t) * 1.3 - 2, 3);
  // The body's radius at an angle (an ellipse, wobbled).
  const body = (t) => { const u = Math.cos(t - lean), v = Math.sin(t - lean); return lobe(t) / Math.hypot(u / rs, v * rs); };
  const dir = (t, d) => [Math.cos(t) * d, Math.sin(t) * d];
  // Bays: two or three, spread round the coast; for a ferry, the first faces the mainland.
  const nb = kind === 'crescent' || kind === 'atoll' || kind === 'fjord' ? 2 : sp.chance(0.55) ? 3 : 2;
  const a0 = kind === 'ferry' || kind === 'causeway' ? toward + sp.range(-0.25, 0.25) : sp.next() * TAU;
  const bays = [];
  for (let k = 0; k < nb; k++) {
    const a = a0 + (k * TAU) / nb + (k ? sp.range(-0.35, 0.35) : 0);
    bays.push({ a, w: sp.range(0.26, 0.34), d: sp.range(0.85, 1.05), in: sp.range(0.9, 0.97), wide: sp.range(1.15, 1.45) });
  }
  // The gaps between them, largest first: the headlands go there.
  const sortedA = bays.map((b) => ((b.a % TAU) + TAU) % TAU).sort((p, q) => p - q);
  const gaps = sortedA.map((a, k) => { const b = k + 1 < sortedA.length ? sortedA[k + 1] : sortedA[0] + TAU; return { mid: (a + b) / 2, size: b - a }; }).sort((p, q) => q.size - p.size);
  const capeA = gaps[0].mid + sp.range(-0.15, 0.15);
  const capes = [{ a: capeA, len: kind === 'lighthouse' ? sp.range(0.42, 0.5) : sp.range(0.28, 0.36), w: sp.range(0.14, 0.18), main: true }];
  if (gaps[1] && sp.chance(0.7)) capes.push({ a: gaps[1].mid + sp.range(-0.2, 0.2), len: sp.range(0.14, 0.22), w: sp.range(0.12, 0.16) });
  // Kind by kind.
  const carve = [];
  let lagoon = null, crescent = null;
  const fjords = [];
  if (kind === 'crescent') {
    // The first bay grows into a great round bay.
    const b = bays[0];
    crescent = { a: b.a, c: dir(b.a, body(b.a) * 0.86), r: 0.62 };
    b.big = true; b.d = 0; b.w = 0.6;
  }
  if (kind === 'atoll') {
    const a = (gaps[1] || gaps[0]).mid + (gaps[1] ? 0 : Math.PI * 0.5);
    lagoon = { a, c: dir(a, body(a) * 0.42), r: sp.range(0.24, 0.29), mouth: dir(a, body(a) + 0.3) };
  }
  if (kind === 'fjord') {
    const nf = 2 + (sp.chance(0.5) ? 1 : 0);
    for (let k = 0; k < nf; k++) {
      const g = gaps[(k + 1) % gaps.length];
      const a = g.mid + (k >= gaps.length - 1 ? 0.5 : 0) + sp.range(-0.25, 0.25), head = sp.range(0.3, 0.45);
      // (Well apart from one another and from the headland, so no sliver of land is left between them.)
      if (angDiff(a, capes[0].a) < 0.7 || fjords.some((o) => angDiff(a, o.a) < 1.0)) continue;
      // (Winding a little, as a glacier's valley does.)
      const b1 = sp.range(-0.22, 0.22), b2 = b1 + sp.range(-0.3, 0.3), b3 = b2 + sp.range(-0.3, 0.3);
      fjords.push({ a, pts: [dir(a, body(a) + 0.3), dir(a + b1 * 0.5, body(a) * 0.86), dir(a + b2 * 0.7, body(a) * (0.86 + head) / 2), dir(a + b3, body(a) * head)], w: sp.range(0.045, 0.055) });
    }
  }
  // Islets: stacks off a lighthouse's point, a causeway's islet, or now and then a rock or two.
  const isletPlan = [];
  const mc = capes[0];
  if (kind === 'lighthouse') {
    for (let k = 0; k < 2; k++) { const a = mc.a + sp.range(-0.1, 0.1); isletPlan.push({ a, d: body(mc.a) + mc.len + sp.range(0.12, 0.16) + k * 0.09, r: sp.range(0.03, 0.042) }); }
  } else if (kind === 'causeway') {
    const g = gaps[1] || gaps[0], a = g.mid + (gaps[1] ? 0 : 0.6);
    isletPlan.push({ a, d: body(a) + 0.42, r: sp.range(0.13, 0.16), causeway: true });
  } else if (sp.chance(0.6)) {
    const g = gaps[gaps.length > 2 ? 2 : gaps.length - 1], a = g.mid + sp.range(-0.2, 0.2);
    isletPlan.push({ a, d: body(a) + sp.range(0.3, 0.38), r: sp.range(0.05, 0.075) });
  }
  const pondR = kind === 'loch' ? sp.range(0.21, 0.25) : kind === 'volcano' ? sp.range(0.07, 0.085) : sp.range(0.085, 0.105);
  const metres = kind === 'volcano' ? Math.round(sp.range(640, 1180) / 10) * 10 : Math.round(sp.range(210, 560) / 10) * 10;

  // ---- The field, for a radius R, before the pond is cut. ----
  const fieldQ = (qx, qy) => {
    const t = Math.atan2(qy, qx);
    const u = (qx * cl + qy * sl) / rs, v = (-qx * sl + qy * cl) * rs;
    let f = 1 - Math.hypot(u, v) / lobe(t);
    f += 0.09 * fbm(nB, qx * 2.4 + 11, qy * 2.4 - 7, 3) + 0.035 * fbm(nB, qx * 8 - 23, qy * 8 + 41, 2);
    for (const b of bays) {
      if (b.big) continue;
      // (Wider across its mouth than it is deep, and its shore wavering.)
      const bc = dir(b.a, body(b.a) * b.in), dx = qx - bc[0], dy = qy - bc[1], ca = Math.cos(b.a), sa = Math.sin(b.a);
      const al = dx * ca + dy * sa, ac = -dx * sa + dy * ca;
      const d = Math.hypot(al, ac / b.wide) / b.w * (1 + 0.22 * fbm(nB, qx * 5 + b.a * 7, qy * 5 - b.a * 3, 2));
      if (d < 1) f -= b.d * (1 - d * d) ** 2;
    }
    for (const c of capes) {
      const A = dir(c.a, body(c.a) * 0.5), T = dir(c.a, body(c.a) + c.len);
      const [d, s] = segDist(qx, qy, A[0], A[1], T[0], T[1]);
      const hw = c.w * (1 - 0.68 * s ** 0.9) * (1 + 0.18 * fbm(nB, qx * 6 - 5, qy * 6 + 9, 2));
      f = Math.max(f, (hw - d) * 1.4);
    }
    for (const p of isletPlan) {
      const c = dir(p.a, p.d), t2 = Math.atan2(qy - c[1], qx - c[0]);
      f = Math.max(f, p.r * (1 + 0.25 * fbm(nB, Math.cos(t2) * 1.5 + c[0] * 9, Math.sin(t2) * 1.5 + c[1] * 9, 2)) - Math.hypot(qx - c[0], qy - c[1]));
    }
    // The great bay, the lagoon, and the fjords last, so no headland closes them off.
    if (crescent) f = Math.min(f, Math.hypot(qx - crescent.c[0], qy - crescent.c[1]) - crescent.r * (1 + 0.08 * fbm(nB, qx * 4, qy * 4, 2)));
    if (lagoon) {
      f = Math.min(f, Math.hypot(qx - lagoon.c[0], qy - lagoon.c[1]) - lagoon.r * (1 + 0.12 * fbm(nB, qx * 5 + 3, qy * 5, 2)));
      f = Math.min(f, segDist(qx, qy, lagoon.c[0], lagoon.c[1], lagoon.mouth[0], lagoon.mouth[1])[0] - 0.035);
    }
    for (const fj of fjords) {
      for (let k = 1; k < fj.pts.length; k++) {
        const [d, t2] = segDist(qx, qy, fj.pts[k - 1][0], fj.pts[k - 1][1], fj.pts[k][0], fj.pts[k][1]);
        const s = (k - 1 + t2) / (fj.pts.length - 1);
        f = Math.min(f, d - fj.w * (1 - 0.5 * s) * (1 + 0.1 * fbm(nB, qx * 7, qy * 7, 2)));
      }
    }
    return f;
  };

  // ---- Fit it in: as large as the room allows, up to the radius planned. ----
  const Rmax = (room - CLEAR) / 1.7;
  let R = Math.min(R0, Rmax), sized = false;
  let grid = null;
  for (let pass = 0; pass < 14; pass++) {
    const g = 0.3 * S, B = 2.05 * R;
    const x0 = cx - B, y0 = cy - B, nx = Math.ceil((2 * B) / g) + 1, ny = nx;
    const F = new Float32Array(nx * ny);
    let clear = true;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = x0 + i * g, y = y0 + j * g;
      let f = i === 0 || j === 0 || i === nx - 1 || j === ny - 1 ? -1 : fieldQ((x - cx) / R, (y - cy) / R);
      if (f === 0) f = -1e-6;
      F[j * nx + i] = f;
      if (f > -0.04) {
        const qx = Math.floor(x), qy = Math.floor(y);
        if (qx < 0 || qy < 0 || qx >= W || qy >= H || dl[qy * W + qx] < CLEAR) clear = false;
      }
    }
    grid = { F, nx, ny, x0, y0, g };
    if (clear && !sized) {
      // Once: the radius set so the land comes to the area wanted (as far as the room allows).
      sized = true;
      let n = 0;
      for (let k = 0; k < F.length; k++) if (F[k] > 0) n++;
      const k2 = clamp(Math.sqrt(want / (n * g * g)), 0.8, 1.25);
      if (Math.abs(k2 - 1) > 0.04 && (k2 < 1 || R < Rmax)) { R = Math.min(R * k2, Math.max(R, Rmax)); continue; }
    }
    if (clear) break;
    R *= 0.93;
  }
  const { nx, ny, x0, y0, g } = grid;
  let F = grid.F;
  const idx = (x, y) => { const i = Math.round((x - x0) / g), j = Math.round((y - y0) / g); return i < 0 || j < 0 || i >= nx || j >= ny ? -1 : j * nx + i; };
  const toW = (q) => [cx + q[0] * R, cy + q[1] * R];
  const distances = () => {
    const wet = new Uint8Array(nx * ny), dry = new Uint8Array(nx * ny);
    for (let k = 0; k < F.length; k++) { if (F[k] > 0) dry[k] = 1; else wet[k] = 1; }
    const din = gridDistance(wet, nx, ny), dout = gridDistance(dry, nx, ny);
    for (let k = 0; k < din.length; k++) { din[k] *= g; dout[k] *= g; }
    return { din, dout };
  };
  let { din } = distances();
  // The main island: the land joined to the middle (islets apart).
  const mainOf = () => {
    let best = -1, bv = -1;
    for (let k = 0; k < F.length; k++) if (din[k] > bv) { bv = din[k]; best = k; }
    const seen = new Uint8Array(F.length), stack = [best];
    seen[best] = 1;
    while (stack.length) { const k = stack.pop(); for (const q of [k - 1, k + 1, k - nx, k + nx]) if (q >= 0 && q < F.length && !seen[q] && F[q] > 0) { seen[q] = 1; stack.push(q); } }
    return { main: seen, pole: best };
  };
  let { main, pole } = mainOf();
  const at = (k) => [x0 + (k % nx) * g, y0 + Math.floor(k / nx) * g];
  const poleP = at(pole);
  const hashU = (k, salt) => { const v = Math.sin(k * 12.9898 + salt * 78.233) * 43758.5453; return v - Math.floor(v); };

  // ---- The hill, and the pond (or the crater lake), chosen on the land as it is. ----
  let peakP, pondC;
  const pr = pondR * R;
  if (kind === 'volcano') {
    peakP = poleP;
    pondC = poleP;
  } else {
    // The hill: well inland, off to one side of the middle.
    let best = -1, bs = -Infinity;
    for (let k = 0; k < F.length; k++) {
      if (!main[k] || din[k] < 0.2 * R) continue;
      const p = at(k), d = Math.hypot(p[0] - poleP[0], p[1] - poleP[1]);
      if (d < 0.26 * R || d > 0.55 * R) continue;
      const s = din[k] + 0.12 * R * hashU(k, 1);
      if (s > bs) { bs = s; best = k; }
    }
    peakP = best >= 0 ? at(best) : poleP;
    // The pond: inland too, on the far side of the middle from the hill.
    best = -1; bs = -Infinity;
    const margin = kind === 'loch' ? 0.1 * R : 0.13 * R;
    for (let k = 0; k < F.length; k++) {
      if (!main[k] || din[k] < pr + margin) continue;
      const p = at(k), dp = Math.hypot(p[0] - peakP[0], p[1] - peakP[1]), dm = Math.hypot(p[0] - poleP[0], p[1] - poleP[1]);
      if (dp < pr + 0.3 * R || (kind !== 'loch' && dm < pr + 0.12 * R)) continue;
      const s = (kind === 'loch' ? -dm : dp * 0.5 + Math.min(din[k], 0.35 * R)) + 0.05 * R * hashU(k, 2);
      if (s > bs) { bs = s; best = k; }
    }
    pondC = best >= 0 ? at(best) : null;
  }
  // Cut the pond into the field.
  if (pondC) {
    const [px, py] = pondC;
    const pondF = (x, y) => { const t = Math.atan2(y - py, x - px); return Math.hypot(x - px, y - py) / R - pondR * (1 + 0.16 * fbm(nB, Math.cos(t) * 1.4 + px * 0.1, Math.sin(t) * 1.4 + py * 0.1, 2)); };
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; const v = pondF(x0 + i * g, y0 + j * g); if (v < F[k]) F[k] = v === 0 ? -1e-6 : v; }
  }
  // Water shut in by the land (a cove closed off, a scrap of a fjord) is filled: only the pond and the lagoon are left.
  {
    const sea = new Uint8Array(F.length), stack = [];
    for (let k = 0; k < F.length; k++) { const i = k % nx, j = (k - i) / nx; if ((i === 0 || j === 0 || i === nx - 1 || j === ny - 1) && F[k] <= 0) { sea[k] = 1; stack.push(k); } }
    while (stack.length) { const k = stack.pop(); for (const q of [k - 1, k + 1, k - nx, k + nx]) if (q >= 0 && q < F.length && !sea[q] && F[q] <= 0) { sea[q] = 1; stack.push(q); } }
    const keep = new Uint8Array(F.length);
    for (const c of [pondC, lagoon && toW(lagoon.c)]) {
      if (!c) continue;
      const s0 = idx(c[0], c[1]);
      if (s0 < 0 || F[s0] > 0 || sea[s0]) continue;
      keep[s0] = 1; stack.push(s0);
      while (stack.length) { const k = stack.pop(); for (const q of [k - 1, k + 1, k - nx, k + nx]) if (q >= 0 && q < F.length && !keep[q] && F[q] <= 0) { keep[q] = 1; stack.push(q); } }
    }
    for (let k = 0; k < F.length; k++) if (F[k] <= 0 && !sea[k] && !keep[k]) F[k] = 0.01;
  }
  let dout;
  ({ din, dout } = distances());
  ({ main } = mainOf());
  // On a volcano the hill's mark stands on the crater's rim.
  if (kind === 'volcano' && pondC) {
    const a = sp.next() * TAU;
    peakP = [pondC[0] + Math.cos(a) * (pr * 1.25 + 0.9 * S), pondC[1] + Math.sin(a) * (pr * 1.25 + 0.9 * S)];
  }

  // Field, sampled between grid points.
  const fAt = (x, y) => {
    const fx = (x - x0) / g, fy = (y - y0) / g;
    if (fx < 0 || fy < 0 || fx >= nx - 1 || fy >= ny - 1) return -1;
    const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, k = j * nx + i;
    return F[k] * (1 - u) * (1 - v) + F[k + 1] * u * (1 - v) + F[k + nx] * (1 - u) * v + F[k + nx + 1] * u * v;
  };
  const sample = (A, x, y, out) => {
    const fx = (x - x0) / g, fy = (y - y0) / g;
    if (fx < 0 || fy < 0 || fx >= nx - 1 || fy >= ny - 1) return out;
    const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, k = j * nx + i;
    return A[k] * (1 - u) * (1 - v) + A[k + 1] * u * (1 - v) + A[k + nx] * (1 - u) * v + A[k + nx + 1] * u * v;
  };
  const inLand = (x, y) => fAt(x, y) > 0;

  // ---- Its pixels. ----
  const mask = new Uint8Array(N);
  let area = 0;
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(H, y0 + ny * g); y++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, x0 + nx * g); x++) {
    if (!land[y * W + x] && inLand(x + 0.5, y + 0.5)) { mask[y * W + x] = 1; area++; }
  }
  const onMask = (x, y) => { const qx = Math.floor(x), qy = Math.floor(y); return qx >= 0 && qy >= 0 && qx < W && qy < H && mask[qy * W + qx] === 1; };
  // Well on dry land, by the pixels as well as the field (the tests and the drawn coast read the pixels).
  const solid = (x, y, d = 1) => sample(din, x, y, 0) >= d && onMask(x, y) && onMask(x + 0.4, y) && onMask(x - 0.4, y) && onMask(x, y + 0.4) && onMask(x, y - 0.4);

  // ---- The "you are here" dot: near the middle, clear of the hill and the pond. ----
  let dot = poleP, ds = -Infinity;
  for (let k = 0; k < F.length; k++) {
    if (!main[k] || din[k] < 2.5 * S) continue;
    const p = at(k);
    if (Math.hypot(p[0] - peakP[0], p[1] - peakP[1]) < 0.24 * R) continue;
    if (pondC && Math.hypot(p[0] - pondC[0], p[1] - pondC[1]) < pr + 0.14 * R) continue;
    const s = Math.min(din[k], 0.3 * R) - 0.6 * Math.hypot(p[0] - poleP[0], p[1] - poleP[1]);
    if (s > ds && solid(p[0], p[1], 2 * S)) { ds = s; dot = p; }
  }

  // ---- The coast, traced. ----
  const loops = contours(F, nx, ny, x0, y0, g).map((l) => simplifyLoop(l, 0.11 * S));
  const inLoop = (ring, x, y) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const rings = [], holes = [];
  for (const l of loops) {
    let depth = 0;
    for (const o of loops) if (o !== l && inLoop(o, l[0][0], l[0][1])) depth++;
    (depth % 2 ? holes : rings).push(l);
  }

  // ---- Bays as cut, their heads, and the villages at two of them. ----
  const bayOut = [];
  for (const b of bays) {
    const c = b.big ? toW(crescent.c) : toW(dir(b.a, body(b.a) * b.in));
    // The bay's head: the land nearest the middle of its water.
    let head = null, hd = Infinity;
    for (let k = 0; k < F.length; k++) {
      if (!main[k] || din[k] > 0.5 * S + g) continue;
      const p = at(k), d = Math.hypot(p[0] - c[0], p[1] - c[1]);
      if (d < hd) { hd = d; head = p; }
    }
    // (The name in the water, a little out from the head.)
    const ox = c[0] - (head ? head[0] : cx), oy = c[1] - (head ? head[1] : cy), ol = Math.hypot(ox, oy) || 1;
    const water = head ? [head[0] + (ox / ol) * (b.big ? 0.32 : 0.2) * R, head[1] + (oy / ol) * (b.big ? 0.32 : 0.2) * R] : c;
    bayOut.push({ a: b.a, x: water[0], y: water[1], head, w: (b.big ? 0.6 : b.w) * R, big: !!b.big });
  }
  const villages = [];
  {
    const spots = [];
    bayOut.forEach((b, n) => {
      if (!b.head) return;
      let best = null, bd = Infinity;
      for (let k = 0; k < F.length; k++) {
        if (!main[k] || din[k] < 1.7 * S || din[k] > 2.6 * S) continue;
        const p = at(k), d = Math.hypot(p[0] - b.head[0], p[1] - b.head[1]);
        if (d > 4.5 * S || d >= bd) continue;
        if (Math.hypot(p[0] - peakP[0], p[1] - peakP[1]) < 0.2 * R || Math.hypot(p[0] - dot[0], p[1] - dot[1]) < 4 * S) continue;
        if (pondC && Math.hypot(p[0] - pondC[0], p[1] - pondC[1]) < pr + 2.5 * S) continue;
        if (!solid(p[0], p[1], 1.5 * S)) continue;
        bd = d; best = p;
      }
      if (best) spots.push({ p: best, bay: n });
    });
    // The two farthest apart (the harbour facing the mainland first, for a ferry).
    let pair = null, pd = -1;
    for (let a = 0; a < spots.length; a++) for (let b = a + 1; b < spots.length; b++) {
      const d = Math.hypot(spots[a].p[0] - spots[b].p[0], spots[a].p[1] - spots[b].p[1]);
      if (d > pd) { pd = d; pair = [spots[a], spots[b]]; }
    }
    const chosen = pair && pd > 0.6 * R ? pair : spots.slice(0, 1);
    chosen.sort((p, q) => p.bay - q.bay);
    for (const s of chosen) villages.push({ x: s.p[0], y: s.p[1], r: sp.range(1.15, 1.5) * S, bay: s.bay });
  }

  // ---- The lighthouse, at the end of the main cape. ----
  let lighthouse = null, capeOut = null;
  {
    const ca = capes[0].a, ux = Math.cos(ca), uy = Math.sin(ca);
    let best = -Infinity;
    for (let k = 0; k < F.length; k++) {
      if (!main[k] || din[k] < 0.7 * S) continue;
      const p = at(k), along = (p[0] - cx) * ux + (p[1] - cy) * uy, across = Math.abs(-(p[0] - cx) * uy + (p[1] - cy) * ux);
      if (across > 0.12 * R) continue;
      if (along > best && solid(p[0], p[1], 0.7 * S)) { best = along; lighthouse = p; }
    }
    if (lighthouse) {
      // The tip, beyond the lighthouse, for the cape's name.
      let t = 0;
      while (inLand(lighthouse[0] + ux * t, lighthouse[1] + uy * t) && t < 6 * S) t += 0.2 * S;
      capeOut = { x: lighthouse[0] + ux * t, y: lighthouse[1] + uy * t, a: ca };
    }
  }

  // ---- The road: from village to village, inland, round the hill and the pond; and a track to the lighthouse. ----
  const roads = [];
  const route = (from, to) => {
    const start = idx(from[0], from[1]), goal = idx(to[0], to[1]);
    if (start < 0 || goal < 0) return null;
    const ok = (k) => main[k] && din[k] >= 1.0 * S;
    const cost = new Float32Array(F.length).fill(Infinity), prev = new Int32Array(F.length).fill(-1), done = new Uint8Array(F.length);
    const heap = [];
    const push = (k, pri) => { heap.push([pri, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const a = 2 * i + 1, b = a + 1; let m = i; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const [gx, gy] = at(goal);
    cost[start] = 0; push(start, 0);
    const steps = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
    while (heap.length) {
      const [, k] = pop();
      if (done[k]) continue;
      done[k] = 1;
      if (k === goal) break;
      const i = k % nx, j = (k - i) / nx;
      for (const [di, dj, len] of steps) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
        const q = jj * nx + ii;
        if (done[q] || (!ok(q) && q !== goal)) continue;
        const p = at(q);
        const hill = Math.exp(-((Math.hypot(p[0] - peakP[0], p[1] - peakP[1]) / (0.16 * R)) ** 2));
        const c = cost[k] + len * g * (1 + 2.2 * smoothstep(3 * S, 1 * S, din[q]) + 2.5 * hill);
        if (c < cost[q]) { cost[q] = c; prev[q] = k; push(q, c + Math.hypot(p[0] - gx, p[1] - gy)); }
      }
    }
    if (prev[goal] < 0) return null;
    const path = [];
    for (let k = goal; k >= 0; k = prev[k]) path.push(at(k));
    path.reverse();
    // Thinned, then rounded (Chaikin), so it reads as a road and not a staircase; kept only if it stays on dry land
    // (else rounded less, and at last as found).
    const dry = (pts) => {
      for (let k = 1; k < pts.length; k++) {
        const [ax, ay] = pts[k - 1], [bx, by] = pts[k], n = Math.ceil(Math.hypot(bx - ax, by - ay) / 0.3);
        for (let q = 0; q <= n; q++) { const x = ax + ((bx - ax) * q) / n, y = ay + ((by - ay) * q) / n; if (!onMask(x, y) || !onMask(x + 0.15, y + 0.15) || !onMask(x - 0.15, y - 0.15)) return false; }
      }
      return true;
    };
    for (const [thin, rounds] of [[4, 3], [3, 2], [2, 1], [1, 0]]) {
      let pts = path.filter((p, k) => k % thin === 0 || k === path.length - 1);
      pts[0] = from; pts[pts.length - 1] = to;
      for (let it = 0; it < rounds; it++) {
        const out = [pts[0]];
        for (let k = 0; k < pts.length - 1; k++) { const [ax, ay] = pts[k], [bx, by] = pts[k + 1]; out.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]); }
        out.push(pts[pts.length - 1]);
        pts = out;
      }
      if (rounds) pts = pts.filter((p, k) => k % 2 === 0 || k === pts.length - 1);
      pts = pts.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
      if (dry(pts)) return pts;
    }
    return null;
  };
  if (villages.length === 2) { const p = route([villages[0].x, villages[0].y], [villages[1].x, villages[1].y]); if (p) roads.push(p); }
  if (lighthouse && villages.length) {
    // To the nearest point of the road (or the nearest village), stopping short of the light.
    const along = roads.length ? roads[0] : [[villages[0].x, villages[0].y]];
    let near = along[0], nd = Infinity;
    for (const p of [...along, ...villages.map((v) => [v.x, v.y])]) { const d = Math.hypot(p[0] - lighthouse[0], p[1] - lighthouse[1]); if (d < nd) { nd = d; near = p; } }
    const ux = near[0] - lighthouse[0], uy = near[1] - lighthouse[1], ul = Math.hypot(ux, uy) || 1;
    const end = [lighthouse[0] + (ux / ul) * 0.9 * S, lighthouse[1] + (uy / ul) * 0.9 * S];
    if (nd > 4 * S && solid(end[0], end[1], 0.6 * S)) { const p = route(near, end); if (p) roads.push(p); }
  }

  // ---- Islets, as drawn; the causeway out to its own. ----
  const islets = isletPlan.map((p) => { const [x, y] = toW(dir(p.a, p.d)); return { x, y, r: p.r * R, causeway: !!p.causeway }; }).filter((p) => onMask(p.x, p.y));
  let causeway = null;
  const cw = islets.find((p) => p.causeway);
  if (cw) {
    // From the main island's nearest solid shore to the islet's.
    let a = null, ad = Infinity;
    for (let k = 0; k < F.length; k++) { if (!main[k] || din[k] > 0.6 * S + g || din[k] < 0.3 * S) continue; const p = at(k), d = Math.hypot(p[0] - cw.x, p[1] - cw.y); if (d < ad) { ad = d; a = p; } }
    if (a) {
      const ux = cw.x - a[0], uy = cw.y - a[1], l = Math.hypot(ux, uy) || 1;
      let t = l;
      while (t > 0 && inLand(a[0] + (ux / l) * t, a[1] + (uy / l) * t)) t -= 0.1 * S;
      causeway = [a, [a[0] + (ux / l) * (t + 0.5 * S), a[1] + (uy / l) * (t + 0.5 * S)]];
    }
  }
  const dock = kind === 'ferry' && villages.length ? bayOut[villages[0].bay].head : null;

  // ---- Names. ----
  const nr = r.fork('about-names'), used = new Set();
  const word = (list) => { const free = list.filter((w) => !used.has(w)); const w = free.length ? nr.pick(free) : nr.pick(list); used.add(w); return w; };
  const names = {};
  {
    const w = word(NAMES.hill);
    names.peak = nr.pick(kind === 'volcano' ? [`Mount ${w}`, `${w} Peak`] : [`${w} Hill`, `Mount ${w}`, `${w} Hill`, `${w} Peak`]);
  }
  if (pondC) { const w = word(NAMES.lake); names.pond = kind === 'loch' ? nr.pick([`Lake ${w}`, `${w} Water`]) : kind === 'volcano' ? `${w} Crater Lake` : nr.pick([`${w} Pond`, `${w} Pond`, `${w} Tarn`, `Lake ${w}`]); }
  names.villages = villages.map((v, n) => { const w = word(NAMES.village); return n === 0 && (kind === 'ferry' || kind === 'causeway') ? `${w} Harbour` : nr.pick([w, w, `${w} Village`]); });
  names.light = `${word(NAMES.light)} Lighthouse`;
  { const w = word(NAMES.cape); names.cape = nr.pick([`${w} Point`, `Cape ${w}`, `${w} Head`]); }
  names.bays = bayOut.map((b) => { const w = word(NAMES.bay); return b.big || bayOut.indexOf(b) === 0 ? `${w} Bay` : nr.pick([`${w} Cove`, `${w} Bay`]); });
  if (lagoon) names.lagoon = `${word(NAMES.bay)} Lagoon`;
  if (fjords.length) names.fjords = fjords.map(() => `${word(NAMES.bay)} Inlet`);
  names.islets = islets.map((p) => `${word(NAMES.islet)} ${p.causeway ? 'Island' : nr.pick(['Rock', 'Islet'])}`);

  // ---- What it is made of: the map's own greens, in facets, as the rest of the land is painted. ----
  const villageAt = (x, y, n) => villages.some((v) => Math.hypot(x - v.x, y - v.y) < v.r * (1 + 0.3 * n));
  const bx0 = x0 + g, by0 = y0 + g, bx1 = x0 + (nx - 2) * g, by1 = y0 + (ny - 2) * g;
  const VEG = [COVER.GRASS, COVER.WOODLAND, COVER.FOREST];
  const cover = (mx, my, fx = mx, fy = my, j = 0, u = 0.5, scale = 4) => {
    if (mx < bx0 || my < by0 || mx > bx1 || my > by1) return -1;
    const f = fAt(mx, my);
    // (Out a little past the coast, so the drawn coast never shows a gap.)
    if (f <= 0 && sample(dout, mx, my, 9) > 1.0 * S) return -1;
    const qx = Math.floor(mx), qy = Math.floor(my);
    if (qx >= 0 && qy >= 0 && qx < W && qy < H && land[qy * W + qx]) return -1;
    const n = fbm(nC, mx / (1.1 * S), my / (1.1 * S), 2);
    if (villageAt(mx, my, n)) return COVER.URBAN;
    const dp = Math.hypot(mx - peakP[0], my - peakP[1]) / R;
    const di = Math.max(0, sample(din, mx, my, 0));
    // The hill's top, bare; a volcano's cone, bare well down its sides; snow on a cold one.
    if (kind === 'volcano') {
      if (dp < 0.2 + 0.05 * n) return cold && dp < 0.12 ? COVER.SNOW : COVER.ROCK;
      if (dp < 0.3 + 0.08 * n && u < 0.5) return COVER.ROCK;
    } else if (dp < 0.075 + 0.03 * n) return cold ? COVER.SNOW : COVER.ROCK;
    // Sand at the heads of the bays (as the rest of the map's beaches, only in the finer tiles).
    if (scale >= 4 && di < 0.9 * S && n > -0.25) for (const b of bayOut) if (b.head && !b.big && Math.hypot(mx - b.head[0], my - b.head[1]) < b.w * 0.55) return COVER.SAND;
    // The facet's class, from its centre (so a facet is one colour), jittered as the rest of the land's are.
    const inF = fAt(fx, fy) > 0;
    const sx = inF ? fx : mx, sy = inF ? fy : my;
    const sdp = Math.hypot(sx - peakP[0], sy - peakP[1]) / R, sdi = Math.max(0, sample(din, sx, sy, 0));
    let v = 1.15 + 0.75 * fbm(nC, sx / (0.3 * R) + 7, sy / (0.3 * R) - 3, 2) + 1.0 * Math.exp(-((sdp / 0.45) ** 2)) - 0.9 * smoothstep(2.6 * S, 0.5 * S, sdi);
    if (cold) {
      // Tundra and bare rock: pale green, grey on the heights.
      if (sdp < 0.3 && u + 0.3 * n > 0.55) return COVER.ROCK;
      v -= 0.9;
    }
    v = clamp(v + j, 0, 2.999);
    let c = Math.floor(v);
    if (u > 0.97) c = Math.min(2, c + 1);
    else if (u > 0.94) c = Math.max(0, c - 1);
    return VEG[c];
  };

  // The reach of the island from the dot, for whatever must keep clear of it.
  let reach = 0;
  for (const ring of rings) for (const [x, y] of ring) reach = Math.max(reach, Math.hypot(x - dot[0], y - dot[1]));

  return {
    kind, x: dot[0], y: dot[1], cx, cy, r: reach, R, area, cold, rings, holes, mask, cover, field: fAt,
    peak: [peakP[0], peakP[1], metres], pond: pondC ? { x: pondC[0], y: pondC[1], r: pr, crater: kind === 'volcano' } : null,
    lagoon: lagoon ? (() => { const [x, y] = toW(lagoon.c); return { x, y, r: lagoon.r * R }; })() : null,
    fjords: fjords.map((fj) => toW(fj.pts[1])),
    villages, roads, lighthouse, cape: capeOut, bays: bayOut, islets, causeway, dock, names,
    crater: kind === 'volcano' && pondC ? [pondC[0], pondC[1], pr] : undefined,
  };
}

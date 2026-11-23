// Small water, in natural shapes, as vectors: kettle lakes scattered over cold
// lowlands, tarns in high cirques, long finger lakes down glaciated valleys,
// oxbows beside meandering lowland rivers, ponds in coastal marshes, crater
// lakes, and reservoirs behind dams. Also the meanders the rivers are drawn
// with: a smooth warp of their courses, strongest on flat lowland.

import { makeNoise, fbm, clamp, smoothstep } from './rng.mjs';

// An organic ring round (x, y): radius r, wobbled by a few harmonics, drawn
// out along angle `lean` by `stretch`.
export function blobRing(rng, x, y, r, { stretch = 0, lean = 0, wobble = 1, n } = {}) {
  const k = n || clamp(Math.round(10 + r * 7), 10, 30);
  const a1 = rng.next() * 0.2 * wobble, a2 = rng.next() * 0.16 * wobble, a3 = rng.next() * 0.09 * wobble;
  const p1 = rng.next() * 6.283, p2 = rng.next() * 6.283, p3 = rng.next() * 6.283;
  const cl = Math.cos(lean), sl = Math.sin(lean);
  const out = [];
  for (let i = 0; i < k; i++) {
    const t = (i / k) * Math.PI * 2;
    const rr = r * (1 + a1 * Math.cos(t + p1) + a2 * Math.cos(2 * t + p2) + a3 * Math.cos(3 * t + p3));
    const u = Math.cos(t) * rr * (1 + stretch), v = Math.sin(t) * rr / (1 + stretch * 0.5);
    out.push([x + u * cl - v * sl, y + u * sl + v * cl]);
  }
  return out;
}

// A lake shaped round a stretch of a course: half-width w(s) along it.
// dam: the downstream end is cut square (a reservoir); otherwise it tapers.
export function ribbonRing(pts, width, rng, { dam = false } = {}) {
  const sm = pts.map((p, i) => {
    let sx = 0, sy = 0, n = 0;
    for (let q = Math.max(0, i - 2); q <= Math.min(pts.length - 1, i + 2); q++) { sx += pts[q][0]; sy += pts[q][1]; n++; }
    return [sx / n, sy / n];
  });
  const left = [], right = [];
  const ph = rng.next() * 6.283, ph2 = rng.next() * 6.283;
  sm.forEach((p, i) => {
    const a = sm[Math.max(0, i - 1)], b = sm[Math.min(sm.length - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const t = i / (sm.length - 1);
    const shape = dam ? Math.pow(Math.sin(Math.PI * 0.5 * Math.min(1, t * 1.05)), 0.8) : Math.pow(Math.sin(Math.PI * t), 0.55);
    const wl = width * shape * (1 + 0.22 * Math.sin(t * 9 + ph)) + 0.08;
    const wr = width * shape * (1 + 0.22 * Math.sin(t * 7 + ph2)) + 0.08;
    left.push([p[0] - ty * wl, p[1] + tx * wl]);
    right.push([p[0] + ty * wr, p[1] - tx * wr]);
  });
  return [...left, ...right.reverse()];
}

export function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  return Math.abs(a) / 2;
}
export function inRing(ring, x, y) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// A spatial index of rings, for painting them into the land cover and for
// keeping things clear of them.
export function ringIndex(lakes, width, height) {
  const G = 4, gw = Math.ceil(width / G), gh = Math.ceil(height / G);
  const grid = Array.from({ length: gw * gh }, () => []);
  lakes.forEach((l, k) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of l.ring) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    l.box = [x0, y0, x1, y1];
    for (let gy = Math.max(0, Math.floor(y0 / G)); gy <= Math.min(gh - 1, Math.floor(y1 / G)); gy++)
      for (let gx = Math.max(0, Math.floor(x0 / G)); gx <= Math.min(gw - 1, Math.floor(x1 / G)); gx++) grid[gy * gw + gx].push(k);
  });
  const at = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return -1;
    const cell = grid[Math.floor(y / G) * gw + Math.floor(x / G)];
    for (const k of cell) {
      const b = lakes[k].box;
      if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
      if (inRing(lakes[k].ring, x, y) && !(lakes[k].holes && lakes[k].holes.some((h) => inRing(h, x, y)))) return k;
    }
    return -1;
  };
  return { at, inside: (x, y) => at(x, y) >= 0 };
}

// buildSmallLakes({ land, elev, temp, moist, hydro, dist, style, width, height, rng })
//   => { lakes: [{ kind, ring, area, x, y }], mask: Uint8Array (1 where a small lake lies), index }
export function buildSmallLakes({ land, elev, temp, moist, hydro, dist, style = {}, width, height, rng, drawnRivers, volcanoes = [], keepClear = [] }) {
  const W = width, H = height, N = W * H, S = W / 1600;
  const r = rng.fork('small-lakes');
  const nDistrict = makeNoise(r.fork('district'));
  const lean = r.next() * Math.PI; // the way the ice once moved
  const { riverClass, lakes: bigLakes } = hydro;
  const pondiness = style.ponds ?? 1;
  const lakes = [];
  // Occupancy at 1 unit, for spacing.
  const taken = new Uint8Array(N);
  const px = (x, y) => clamp(Math.floor(y), 0, H - 1) * W + clamp(Math.floor(x), 0, W - 1);
  const clearFor = (ring, margin, { river = 0 } = {}) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of ring) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    x0 -= margin; y0 -= margin; x1 += margin; y1 += margin;
    if (x0 < 2 || y0 < 2 || x1 > W - 2 || y1 > H - 2) return false;
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      const i = y * W + x;
      if (!land[i] || bigLakes[i] || taken[i] || (river >= 0 && riverClass[i] > river)) return false;
    }
    return true;
  };
  const occupy = (ring, kind, holes = null) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of ring) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) if (inRing(ring, x + 0.5, y + 0.5) || (x === Math.floor((x0 + x1) / 2) && y === Math.floor((y0 + y1) / 2))) taken[y * W + x] = 1;
    // A margin round it, so the next lake keeps its distance.
    for (let y = Math.floor(y0) - 1; y <= Math.ceil(y1) + 1; y++) for (let x = Math.floor(x0) - 1; x <= Math.ceil(x1) + 1; x++) if (x >= 0 && y >= 0 && x < W && y < H && !taken[y * W + x]) taken[y * W + x] = 2;
    const round = ring.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
    let cx = 0, cy = 0;
    for (const [x, y] of round) { cx += x; cy += y; }
    const lake = { kind, ring: round, area: ringArea(round), x: cx / round.length, y: cy / round.length };
    if (holes && holes.length) {
      lake.holes = holes.map((h) => h.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]));
      // (The islands stay in the lake's mark, so roads and towns keep off them.)
      for (const h of lake.holes) lake.area -= ringArea(h);
    }
    lakes.push(lake);
  };

  // Nothing on the capitals.
  for (const c of keepClear) for (let y = Math.floor(c.y - 4 * S); y <= c.y + 4 * S; y++) for (let x = Math.floor(c.x - 4 * S); x <= c.x + 4 * S; x++) if (x >= 0 && y >= 0 && x < W && y < H) taken[y * W + x] = 2;

  // ---- Crater lakes, in the volcanoes' summits. ----
  for (const v of volcanoes) {
    const ring = blobRing(r, v.x, v.y, (0.45 + r.next() * 0.35) * S, { wobble: 0.5 });
    occupy(ring, 'crater');
  }

  // ---- Reservoirs: dammed on rivers in the hills, blunt at the dam. ----
  {
    const cands = [];
    hydro.rivers.forEach((pts, k) => {
      const m = hydro.riverMeta[k];
      if (m.width < 2 || pts.length < 30) return;
      for (let j = 6; j + 18 < pts.length - 6; j += 9) {
        const e = elev[px(pts[j][0], pts[j][1])];
        if (e < 0.12 || e > 0.34 || temp[px(pts[j][0], pts[j][1])] < -4) continue;
        cands.push({ k, j, score: e + r.next() * 0.1 });
      }
    });
    cands.sort((a, b) => b.score - a.score || a.k - b.k || a.j - b.j);
    const spots = [];
    for (const c of cands) {
      if (spots.length >= 5) break;
      const pts = hydro.rivers[c.k].slice(c.j, c.j + 14 + r.int(10));
      const mid = pts[pts.length >> 1];
      if (spots.some((t) => Math.hypot(t[0] - mid[0], t[1] - mid[1]) < 110 * S)) continue;
      const ring = ribbonRing(pts, (0.9 + r.next() * 0.8) * S, r, { dam: true });
      if (!clearFor(ring, 0.4, { river: 4 })) continue;
      occupy(ring, 'reservoir');
      spots.push(mid);
    }
  }

  // ---- Finger lakes: long and narrow, down glaciated mountain valleys. ----
  {
    const cands = [];
    hydro.rivers.forEach((pts, k) => {
      if (pts.length < 20) return;
      for (let j = 3; j + 14 < pts.length - 3; j += 4) {
        const i = px(pts[j][0], pts[j][1]);
        const e = elev[i], t = temp[i];
        if (e < 0.08 || e > 0.45 || t > 12 || t < -16) continue;
        // A valley: the ground either side stands well above the river.
        const a = pts[Math.max(0, j - 3)], b = pts[j + 3];
        let tx = b[0] - a[0], ty = b[1] - a[1];
        const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const side = (d) => Math.max(elev[px(pts[j][0] - ty * d * S, pts[j][1] + tx * d * S)], elev[px(pts[j][0] + ty * d * S, pts[j][1] - tx * d * S)]);
        const wall = Math.max(side(4), side(8)) - e;
        if (wall < 0.02) continue;
        cands.push({ k, j, score: wall * 4 + smoothstep(9, -2, t) * 0.4 + r.next() * 0.25 });
      }
    });
    cands.sort((a, b) => b.score - a.score || a.k - b.k || a.j - b.j);
    const want = Math.round(clamp(cands.length / 8, cands.length ? 2 : 0, 8) * (style.lakes ?? 1));
    const spots = [];
    for (const c of cands) {
      if (spots.length >= want) break;
      const len = 12 + r.int(20);
      const pts = hydro.rivers[c.k].slice(c.j, Math.min(hydro.rivers[c.k].length - 2, c.j + len));
      if (pts.length < 10) continue;
      const mid = pts[pts.length >> 1];
      if (spots.some((s) => Math.hypot(s[0] - mid[0], s[1] - mid[1]) < 26 * S)) continue;
      const ring = ribbonRing(pts, (0.5 + r.next() * 0.7) * S, r);
      if (!clearFor(ring, 0.6, { river: 4 })) continue;
      occupy(ring, 'finger');
      spots.push(mid);
    }
  }

  // ---- Oxbows: crescents beside meandering lowland rivers. ----
  if (drawnRivers) {
    drawnRivers.forEach((pts, k) => {
      const m = hydro.riverMeta[k];
      if (m.width < 2 || pts.length < 30) return;
      for (let j = 10; j < pts.length - 10; j += 14 + r.int(16)) {
        const [x, y] = pts[j];
        const i = px(x, y);
        if (elev[i] > 0.1 || r.next() > 0.45 * (m.width - 1) / 2) continue;
        const a = pts[j - 3], b = pts[j + 3];
        let tx = b[0] - a[0], ty = b[1] - a[1];
        const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const side = r.chance(0.5) ? 1 : -1;
        const rho = (0.7 + r.next() * 0.9) * S, off = (1.3 + 0.6 * m.width) * S + rho;
        const cx = x - ty * side * off, cy = y + tx * side * off;
        const face = Math.atan2(y - cy, x - cx); // the opening faces the river
        const span = 3.6 + r.next() * 0.8, th = (0.22 + r.next() * 0.12) * S;
        const outer = [], inner = [];
        for (let q = 0; q <= 14; q++) {
          const ang = face + Math.PI - span / 2 + (span * q) / 14 + Math.PI;
          const taper = Math.pow(Math.sin((Math.PI * q) / 14), 0.5);
          outer.push([cx + Math.cos(ang) * (rho + th * taper), cy + Math.sin(ang) * (rho + th * taper)]);
          inner.push([cx + Math.cos(ang) * (rho - th * taper), cy + Math.sin(ang) * (rho - th * taper)]);
        }
        const ring = [...outer, ...inner.reverse()];
        if (!clearFor(ring, 0.3, { river: 1 })) continue;
        occupy(ring, 'oxbow');
      }
    });
  }

  // ---- Chains of lakes strung along a river, on a plateau or a broad valley floor. ----
  {
    const cands = [];
    hydro.rivers.forEach((pts, k) => {
      const m = hydro.riverMeta[k];
      if (m.width < 2 || pts.length < 70) return;
      for (let j = 8; j + 60 < pts.length - 8; j += 15) {
        const i = px(pts[j][0], pts[j][1]);
        const e = elev[i], t = temp[i];
        if (e < 0.05 || e > 0.3 || t > 16 || t < -10 || moist[i] < 0.25) continue;
        cands.push({ k, j, score: moist[i] * 0.5 + smoothstep(16, 0, t) * 0.5 + r.next() * 0.5 });
      }
    });
    cands.sort((a, b) => b.score - a.score || a.k - b.k || a.j - b.j);
    const want = Math.min(cands.length ? 1 + (r.chance(0.5) ? 1 : 0) + ((style.lakes ?? 1) > 1.2 ? 1 : 0) : 0, 3);
    const spots = [];
    for (const c of cands) {
      if (spots.length >= want) break;
      const river = hydro.rivers[c.k];
      const mid = river[c.j + 30];
      if (spots.some((s) => Math.hypot(s[0] - mid[0], s[1] - mid[1]) < 150 * S)) continue;
      let j = c.j, made = 0;
      const n = 3 + r.int(3);
      for (let q = 0; q < n && j + 8 < river.length - 4; q++) {
        const len = 5 + r.int(9);
        const pts = river.slice(j, j + len);
        const ring = ribbonRing(pts, (0.55 + r.next() * 0.9) * S, r);
        if (clearFor(ring, 0.4, { river: 4 })) { occupy(ring, 'chain'); made++; }
        j += len + 3 + r.int(6);
      }
      if (made >= 2) spots.push(mid);
    }
  }

  // ---- A large lake or two with bays and islands, on a main river in the lowland. ----
  {
    const cands = [];
    hydro.rivers.forEach((pts, k) => {
      const m = hydro.riverMeta[k];
      if (m.width < 2 || pts.length < 40) return;
      for (let j = 12; j < pts.length - 12; j += 10) {
        const i = px(pts[j][0], pts[j][1]);
        const e = elev[i], t = temp[i];
        if (e < 0.03 || e > 0.2 || dist[i] < 22 * S || moist[i] < 0.2 || t < -8) continue;
        cands.push({ x: pts[j][0], y: pts[j][1], score: moist[i] * 0.4 + r.next() });
      }
    });
    cands.sort((a, b) => b.score - a.score || a.x - b.x || a.y - b.y);
    const want = cands.length ? (r.chance(0.55) ? 1 : 2) : 0;
    const spots = [];
    for (const c of cands) {
      if (spots.length >= want) break;
      if (spots.some((s) => Math.hypot(s[0] - c.x, s[1] - c.y) < 200 * S)) continue;
      const rad = (5 + r.next() * 6) * S;
      const nB = makeNoise(r.fork('bays' + spots.length));
      const lean2 = r.next() * Math.PI, stretch = 0.3 + r.next() * 0.9;
      // An outline with bays and headlands: a stretched blob, its radius worked by noise round the shore.
      const ring = [];
      const K = 90;
      for (let q = 0; q < K; q++) {
        const t = (q / K) * Math.PI * 2;
        const ct = Math.cos(t), st = Math.sin(t);
        const rr = rad * (1 + 0.42 * fbm(nB, ct * 1.6, st * 1.6, 4) + 0.16 * Math.sin(3 * t + lean2));
        const u = ct * rr * (1 + stretch), v = (st * rr) / (1 + stretch * 0.5);
        ring.push([c.x + u * Math.cos(lean2) - v * Math.sin(lean2), c.y + u * Math.sin(lean2) + v * Math.cos(lean2)]);
      }
      if (!clearFor(ring, 1, { river: 4 })) continue;
      // Islands: a few, near the lake's middle and in its larger bays.
      const holes = [];
      const nI = 1 + r.int(4);
      for (let q = 0; q < nI * 4 && holes.length < nI; q++) {
        const a = r.next() * Math.PI * 2, d = r.next() * rad * 0.55;
        const hx = c.x + Math.cos(a) * d * (1 + stretch * 0.6), hy = c.y + Math.sin(a) * d;
        const hr = (0.35 + r.next() * r.next() * 1.6) * S;
        const hole = blobRing(r, hx, hy, hr, { stretch: r.next() * 0.8, lean: r.next() * Math.PI, wobble: 1.4, n: 14 });
        if (!hole.every(([x, y]) => inRing(ring, x, y))) continue;
        if (!holes.every((o) => hole.every(([x, y]) => !inRing(o, x, y)) && o.every(([x, y]) => !inRing(hole, x, y)))) continue;
        let near = Infinity;
        for (const [x, y] of hole) for (const [qx, qy] of ring) near = Math.min(near, Math.hypot(x - qx, y - qy));
        if (near < 0.6 * S) continue;
        holes.push(hole);
      }
      occupy(ring, 'large', holes);
      spots.push([c.x, c.y]);
    }
  }

  // ---- A lake district, in a glaciated lowland or two only; tarns under the coldest peaks; ponds in a coastal
  // marsh. Tiny lakes nowhere else. ----
  {
    // Where the district lies: the coldest, wettest low country, picked as one or two patches.
    const pick = [];
    for (let y = 30 * S; y < H - 30 * S; y += 6 * S) for (let x = 30 * S; x < W - 30 * S; x += 6 * S) {
      const i = px(x, y);
      if (!land[i] || bigLakes[i]) continue;
      const t = temp[i], e = elev[i], m = moist[i];
      const glac = smoothstep(6, -1, t) * smoothstep(-22, -12, t) * smoothstep(0.26, 0.12, e) * smoothstep(0.2, 0.45, m) * smoothstep(5 * S, 20 * S, dist[i]);
      if (glac > 0.25) pick.push({ x, y, s: glac + 0.6 * fbm(nDistrict, x / (80 * S), y / (80 * S), 2) + r.next() * 0.2 });
    }
    pick.sort((a, b) => b.s - a.s || a.x - b.x || a.y - b.y);
    const districts = [];
    const maxD = (style.lakes ?? 1) > 1.2 || pondiness > 1.2 ? 2 : 1;
    for (const p of pick) {
      if (districts.length >= maxD) break;
      if (districts.some((d) => Math.hypot(d.x - p.x, d.y - p.y) < 160 * S)) continue;
      districts.push({ x: p.x, y: p.y, r: (26 + r.next() * 22) * S * Math.sqrt(pondiness) });
    }
    const inDistrict = (x, y) => {
      let best = 0;
      for (const d of districts) {
        const q = Math.hypot(x - d.x, (y - d.y) * 1.25) / d.r;
        best = Math.max(best, smoothstep(1.05, 0.45, q + 0.35 * fbm(nDistrict, x / (12 * S), y / (12 * S), 2)));
      }
      return best;
    };
    const step = 2.6 * S;
    let tarns = 0, marshes = 0;
    const marshAt = [];
    for (let gy = step; gy < H - step; gy += step) for (let gx = step; gx < W - step; gx += step) {
      const x = gx + (r.next() - 0.5) * step, y = gy + (r.next() - 0.5) * step;
      const i = px(x, y);
      if (!land[i] || bigLakes[i] || taken[i]) { r.next(); r.next(); continue; }
      const t = temp[i], e = elev[i], m = moist[i];
      const dis = districts.length ? inDistrict(x, y) : 0;
      const tarn = smoothstep(0.36, 0.46, e) * smoothstep(0, -8, t) * smoothstep(0.6, 0.52, e);
      const marsh = smoothstep(0.04, 0.012, e) * smoothstep(0.45, 0.7, m) * smoothstep(10 * S, 2.5 * S, dist[i]) * smoothstep(-2, 6, t);
      const p = 0.3 * dis * smoothstep(0.3, 0.12, e) + (tarns < 14 ? 0.035 * tarn : 0) + (marshes < 40 ? 0.12 * marsh : 0);
      const u = r.next(), v = r.next();
      if (u > p) continue;
      const kind = dis > 0.05 && dis * 0.3 >= marsh * 0.12 ? 'kettle' : marsh * 0.12 > tarn * 0.035 ? 'marsh' : 'tarn';
      // Marsh ponds keep together, in one or two marshes, not strewn down every coast.
      if (kind === 'marsh' && marshAt.length && !marshAt.some((q) => Math.hypot(q[0] - x, q[1] - y) < 14 * S) && marshAt.length > 6) continue;
      const big = kind === 'marsh' ? 0.5 : kind === 'tarn' ? 0.6 : 2.6;
      const rad = (0.45 + big * Math.pow(v, 2)) * S;
      if (dist[i] < rad + 1.5 * S) continue;
      const ring = blobRing(r, x, y, rad, { stretch: kind === 'kettle' ? 0.4 + r.next() * 1.4 : 0.15, lean: lean + (r.next() - 0.5) * 0.4, wobble: kind === 'kettle' ? 1.6 : 1 });
      if (!clearFor(ring, kind === 'kettle' ? 0.8 : 0.4, { river: 0 })) continue;
      occupy(ring, kind);
      if (kind === 'tarn') tarns++;
      if (kind === 'marsh') { marshes++; marshAt.push([x, y]); }
    }
  }

  const mask = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (taken[i] === 1) mask[i] = 1;
  return { lakes, mask, index: ringIndex(lakes, W, H) };
}

// warpRivers(rivers, { land, elev, dist, width, height, rng }) => polylines
// The rivers' courses, smoothed and given meanders: a smooth warp of the
// plane, strong on flat lowland, faint in the hills, none at the coast. As one
// warp moves every river, a tributary still meets its river.
export function warpRivers(rivers, meta, { land, elev, dist, width, height, rng }) {
  const W = width, H = height, S = W / 1600;
  const r = rng.fork('meanders');
  const nA = makeNoise(r), nB = makeNoise(r);
  const px = (x, y) => clamp(Math.floor(y), 0, H - 1) * W + clamp(Math.floor(x), 0, W - 1);
  const lam = 5.5 * S;
  const warp = (x, y) => {
    const i = px(x, y);
    const flat = smoothstep(0.2, 0.05, elev[i]);
    const A = (0.25 + 1.35 * flat) * S * smoothstep(0.8 * S, 4.5 * S, dist[i]);
    return [x + A * fbm(nA, x / lam, y / lam, 2), y + A * fbm(nB, x / lam, y / lam, 2)];
  };
  // Resample at a third of a unit, smooth away the grid's staircase (ends fixed), then warp.
  const out = rivers.map((pts) => {
    const even = [pts[0]];
    for (let k = 1; k < pts.length; k++) {
      const [x0, y0] = pts[k - 1], [x1, y1] = pts[k];
      const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / (0.34 * S)));
      for (let j = 1; j <= n; j++) even.push([x0 + ((x1 - x0) * j) / n, y0 + ((y1 - y0) * j) / n]);
    }
    let cur = even;
    for (let pass = 0; pass < 3; pass++) {
      const nx = cur.slice();
      for (let k = 2; k < cur.length - 2; k++) nx[k] = [(cur[k - 2][0] + cur[k - 1][0] * 2 + cur[k][0] * 2 + cur[k + 1][0] * 2 + cur[k + 2][0]) / 8, (cur[k - 2][1] + cur[k - 1][1] * 2 + cur[k][1] * 2 + cur[k + 1][1] * 2 + cur[k + 2][1]) / 8];
      cur = nx;
    }
    return cur.map(([x, y]) => warp(x, y));
  });
  // A river that ends on another meets it exactly: its last point moves onto the nearest point of the larger river.
  const G = 6, gw = Math.ceil(W / G), gh = Math.ceil(H / G);
  const grid = Array.from({ length: gw * gh }, () => []);
  out.forEach((pts, k) => { for (let j = 1; j < pts.length; j++) grid[clamp(Math.floor(pts[j][1] / G), 0, gh - 1) * gw + clamp(Math.floor(pts[j][0] / G), 0, gw - 1)].push([k, j]); });
  out.forEach((pts, k) => {
    if (meta[k].ends !== 'river') return;
    const [x, y] = pts[pts.length - 1];
    let best = null, bd = 3 * S;
    const gx = Math.floor(x / G), gy = Math.floor(y / G);
    for (let yy = gy - 1; yy <= gy + 1; yy++) for (let xx = gx - 1; xx <= gx + 1; xx++) {
      if (yy < 0 || xx < 0 || yy >= gh || xx >= gw) continue;
      for (const [k2, j] of grid[yy * gw + xx]) {
        if (k2 === k || meta[k2].width < meta[k].width) continue;
        const [ax, ay] = out[k2][j - 1], [bx, by] = out[k2][j];
        const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9;
        const t = clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1);
        const qx = ax + dx * t, qy = ay + dy * t, d = Math.hypot(qx - x, qy - y);
        if (d < bd) { bd = d; best = [qx, qy]; }
      }
    }
    if (best) pts[pts.length - 1] = best;
  });
  return { rivers: out, warp };
}

// findVolcanoes({ land, elev, width, height, rng, count }) => [{ x, y, e }]
// A few lone summits, well apart, taken as volcanoes (each gets a crater lake).
export function findVolcanoes({ land, elev, width, height, rng, count = 2 }) {
  const W = width, H = height, S = W / 1600;
  const r = rng.fork('volcanoes');
  const cands = [];
  for (let y = 20; y < H - 20; y += 2) for (let x = 20; x < W - 20; x += 2) {
    const i = y * W + x;
    if (!land[i] || elev[i] < 0.38) continue;
    let top = true;
    for (let dy = -10; dy <= 10 && top; dy += 2) for (let dx = -10; dx <= 10; dx += 2) if (elev[i + dy * W + dx] > elev[i]) { top = false; break; }
    if (top) cands.push({ x: x + 0.5, y: y + 0.5, e: elev[i], k: r.next() });
  }
  cands.sort((a, b) => a.k - b.k);
  const out = [];
  for (const c of cands) {
    if (out.length >= count) break;
    if (out.some((o) => Math.hypot(o.x - c.x, o.y - c.y) < 200 * S)) continue;
    out.push({ x: c.x, y: c.y, e: c.e });
  }
  return out;
}

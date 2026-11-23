// Terrain: the elevation grid, the land mask, and the sea level that gives a
// world its share of land.
//
// A world is not thresholded noise. It is drawn first as a sketch (one to
// four continental masses, each a chain of overlapping lobes with peninsulas
// added and gulfs bitten out, plus island groups and arcs) and the noise then
// crinkles the sketch's coast. Mountain ranges are drawn as lines and raised
// with ridged noise, so they read as ranges.

import { makeNoise, fbm, ridged, clamp, smoothstep } from './rng.mjs';

const TAU = Math.PI * 2;

// Latitude in degrees at a row, from the world's style.
export function latitudeAt(y, height, style = {}) {
  const top = style.latTop ?? 68, bottom = style.latBottom ?? -35;
  return top + ((bottom - top) * (y + 0.5)) / height;
}

function smax(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
}

// A chain of lobes along a wandering line.
function chain(rng, x, y, angle, count, radius, { step = 0.9, turn = 0.5, vary = 0.3 } = {}) {
  const lobes = [];
  let a = angle;
  // Start half the chain's length behind the centre so the mass sits on it.
  const half = ((count - 1) * step * radius) / 2;
  let px = x - Math.cos(a) * half, py = y - Math.sin(a) * half;
  for (let i = 0; i < count; i++) {
    const r = radius * (1 + rng.range(-vary, vary));
    lobes.push({ x: px, y: py, r, asp: rng.range(1, 1.7), ang: a + rng.range(-0.9, 0.9) });
    a += rng.range(-turn, turn);
    px += Math.cos(a) * step * radius;
    py += Math.sin(a) * step * radius;
  }
  return lobes;
}

// Lobe radius for a chain of `count` lobes covering about `area`.
function radiusFor(area, count, step = 0.9) {
  return Math.sqrt(area / (Math.PI + 1.75 * (step / 0.9) * (count - 1)));
}

// The sketches. Each returns the masses as { cx, cy, share, count, angle, turn }
// in fractions of the map.
const LAYOUTS = {
  pangaea(rng) {
    return [{ cx: rng.range(0.44, 0.56), cy: rng.range(0.46, 0.54), share: 1, count: 5 + rng.int(2), angle: rng.range(-0.3, 0.3), turn: 0.55 }];
  },
  twins(rng) {
    const dy = rng.range(-0.07, 0.07), big = rng.range(0.5, 0.6), flip = rng.chance(0.5);
    return [
      { cx: 0.27 + rng.range(-0.03, 0.03), cy: 0.5 + dy, share: flip ? big : 1 - big, count: 3 + rng.int(2), angle: Math.PI / 2 + rng.range(-0.6, 0.6), turn: 0.6 },
      { cx: 0.73 + rng.range(-0.03, 0.03), cy: 0.5 - dy, share: flip ? 1 - big : big, count: 3 + rng.int(2), angle: Math.PI / 2 + rng.range(-0.6, 0.6), turn: 0.6 },
    ];
  },
  northsouth(rng) {
    const dx = rng.range(-0.1, 0.1), big = rng.range(0.5, 0.6);
    return [
      { cx: 0.44 + dx, cy: 0.28, share: big, count: 4 + rng.int(2), angle: rng.range(-0.25, 0.25), turn: 0.4 },
      { cx: 0.56 - dx, cy: 0.73, share: 1 - big, count: 4 + rng.int(2), angle: rng.range(-0.25, 0.25), turn: 0.4 },
    ];
  },
  trio(rng) {
    const up = rng.chance(0.5) ? 1 : -1;
    const shares = [rng.range(0.3, 0.45), rng.range(0.25, 0.4), rng.range(0.2, 0.3)];
    const spots = rng.shuffle([
      [0.21, 0.5 - 0.1 * up], [0.53, 0.5 + 0.13 * up], [0.81, 0.5 - 0.12 * up],
    ]);
    return spots.map(([x, y], i) => ({
      cx: x + rng.range(-0.03, 0.03), cy: y + rng.range(-0.04, 0.04), share: shares[i],
      count: 2 + rng.int(3), angle: rng.range(0, Math.PI), turn: 0.7,
    }));
  },
  quad(rng) {
    const shares = [rng.range(0.28, 0.36), rng.range(0.22, 0.3), rng.range(0.18, 0.26), rng.range(0.14, 0.2)];
    const spots = rng.shuffle([[0.22, 0.3], [0.73, 0.27], [0.29, 0.74], [0.78, 0.72]]);
    return spots.map(([x, y], i) => ({
      cx: x + rng.range(-0.04, 0.04), cy: y + rng.range(-0.04, 0.04), share: shares[i],
      count: 2 + rng.int(3), angle: rng.range(0, Math.PI), turn: 0.7,
    }));
  },
  spine(rng) {
    const down = rng.chance(0.5) ? 1 : -1;
    return [
      { cx: 0.45, cy: 0.5, share: 0.72, count: 7, angle: down * rng.range(0.3, 0.45), turn: 0.35, thin: true },
      { cx: 0.8, cy: 0.5 - down * 0.25, share: 0.28, count: 2 + rng.int(2), angle: rng.range(0, Math.PI), turn: 0.6 },
    ];
  },
  // A long mass curving round an inner sea.
  crescent(rng) {
    const start = rng.range(0, TAU), sweep = rng.range(3.9, 4.7);
    return [
      { arc: { cx: 0.5, cy: 0.5, rx: 0.3, ry: 0.29, start, sweep }, share: 0.82, count: 9 },
      { cx: 0.5 + 0.34 * Math.cos(start - 0.75), cy: 0.5 + 0.3 * Math.sin(start - 0.75), share: 0.18, count: 2, angle: rng.range(0, Math.PI), turn: 0.6 },
    ];
  },
  // A ring of land, nearly closed, with one strait into the sea it holds.
  ring(rng) {
    const start = rng.range(0, TAU);
    return [{ arc: { cx: 0.5, cy: 0.5, rx: 0.31, ry: 0.3, start, sweep: 5.75 }, share: 1, count: 12 }];
  },
  // Several modest lands and a great many islands.
  archipelago(rng) {
    const spots = rng.shuffle([[0.2, 0.32], [0.5, 0.26], [0.8, 0.38], [0.3, 0.72], [0.66, 0.7]]);
    const shares = [0.3, 0.26, 0.24, 0.2];
    return spots.slice(0, 4).map(([x, y], i) => ({
      cx: x + rng.range(-0.04, 0.04), cy: y + rng.range(-0.04, 0.04), share: shares[i],
      count: 3 + rng.int(3), angle: rng.range(0, Math.PI), turn: 0.8, thin: true,
    }));
  },
};

const DEFAULT_LAYOUT = { 1: ['pangaea', 'ring'], 2: ['twins', 'northsouth', 'spine', 'crescent'], 3: ['trio'], 4: ['quad', 'archipelago'] };

// Fit the layout to the number of masses asked for: drop the smallest, or add
// modest ones in the emptiest water.
function fitMassCount(specs, masses, rng) {
  let out = specs.slice().sort((a, b) => b.share - a.share);
  while (out.length > masses) out.pop();
  let tries = 0;
  while (out.length < masses && tries++ < 8) {
    let best = null;
    for (let i = 0; i < 60; i++) {
      const x = rng.range(0.14, 0.86), y = rng.range(0.18, 0.82);
      let near = Infinity;
      for (const s of out) {
        const sx = s.arc ? s.arc.cx : s.cx, sy = s.arc ? s.arc.cy : s.cy;
        // An arc's own centre is open water, so a mass may sit there.
        const d = s.arc ? Math.abs(Math.hypot((x - sx) / s.arc.rx, (y - sy) / s.arc.ry) - 1) * 0.3 : Math.hypot(x - sx, (y - sy) * 0.5);
        near = Math.min(near, d);
      }
      if (!best || near > best.near) best = { x, y, near };
    }
    out.push({ cx: best.x, cy: best.y, share: 0.16 + rng.range(0, 0.06), count: 2 + rng.int(2), angle: rng.range(0, Math.PI), turn: 0.7 });
  }
  const total = out.reduce((s, m) => s + m.share, 0);
  for (const m of out) m.share /= total;
  return out;
}

// buildTerrain({ rng, width, height, landShare, masses, style })
//   => { elev, land, seaLevel, ranges, lobes }
// elev is above zero on land and below it in the sea, except in closed basins
// inland, which sit below their rims (the hydrology turns those into lakes).
export function buildTerrain({ rng, width, height, landShare, masses = 2, style = {} }) {
  const W = width, H = height, N = W * H;
  // Lengths below are written for a 1600-wide map and scale with the grid.
  const S = W / 1600;
  const r = rng.fork ? rng.fork('terrain') : rng;
  const nWarpA = makeNoise(r), nWarpB = makeNoise(r), nWarpC = makeNoise(r), nWarpD = makeNoise(r);
  const nDetail = makeNoise(r), nRough = makeNoise(r), nHill = makeNoise(r), nRidge = makeNoise(r);
  const nValleyA = makeNoise(r), nValleyB = makeNoise(r), nValleyC = makeNoise(r);
  const nIsle = makeNoise(r), nPlateau = makeNoise(r), nFjord = makeNoise(r), nRangeA = makeNoise(r), nRangeB = makeNoise(r);

  // Room at the top or bottom for a polar landmass, where the world has one: the projects' land keeps further off.
  const polarRoom = 120 * S;
  const mT = 46 * S + (style.ice && style.ice.includes('n') ? polarRoom : 0), mB = 46 * S + (style.ice && style.ice.includes('s') ? polarRoom : 0);
  const layoutName = style.layout && LAYOUTS[style.layout] ? style.layout : r.pick(DEFAULT_LAYOUT[clamp(masses, 1, 4)]);
  const specs = fitMassCount(LAYOUTS[layoutName](r), clamp(masses, 1, 4), r);

  const islandShare = style.islands ?? 0.12;
  const landPx = landShare * N;
  const massPx = landPx * (1 - islandShare) * 0.92;

  // ---- The sketch: lobes (land), bites (gulfs), and range lines. ----
  const lobes = []; // { x, y, r, mass }
  const bites = []; // { x, y, r, depth }
  const ranges = []; // { pts: [[x, y]], w, h, mass }
  const skeletons = [];

  specs.forEach((spec, mi) => {
    const area = massPx * spec.share;
    let nodes;
    if (spec.arc) {
      const { cx, cy, rx, ry, start, sweep } = spec.arc;
      const count = spec.count;
      // Lobe size from the arc's length, so the lobes just overlap.
      const len = sweep * ((rx * W + ry * H) / 2);
      const rad = Math.max(area / (1.8 * len), (len / (count - 1)) * 0.72);
      nodes = [];
      for (let i = 0; i < count; i++) {
        const t = start + (sweep * i) / (count - 1);
        const wob = 1 + r.range(-0.1, 0.1);
        nodes.push({ x: (cx + rx * wob * Math.cos(t)) * W, y: (cy + ry * wob * Math.sin(t)) * H, r: rad * (1 + r.range(-0.3, 0.3)), asp: r.range(1, 1.6), ang: t + Math.PI / 2 + r.range(-0.7, 0.7) });
      }
    } else {
      const count = spec.count;
      const step = spec.thin ? 1.15 : 0.9;
      const rad = radiusFor(area, count, step);
      nodes = chain(r, spec.cx * W, spec.cy * H, spec.angle, count, rad, { step, turn: spec.turn, vary: 0.3 });
    }
    // Keep the mass off the map's edge: slide the whole chain inward, then
    // shrink any lobe that still reaches the margin.
    const margin = 46 * S;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x - n.r); maxX = Math.max(maxX, n.x + n.r);
      minY = Math.min(minY, n.y - n.r); maxY = Math.max(maxY, n.y + n.r);
    }
    let sx = 0, sy = 0;
    if (maxX - minX < W - 2 * margin) { if (minX < margin) sx = margin - minX; else if (maxX > W - margin) sx = W - margin - maxX; }
    if (maxY - minY < H - mT - mB) { if (minY < mT) sy = mT - minY; else if (maxY > H - mB) sy = H - mB - maxY; }
    for (const n of nodes) {
      n.x += sx; n.y += sy;
      n.x = clamp(n.x, margin + 20 * S, W - margin - 20 * S);
      n.y = clamp(n.y, mT + 20 * S, H - mB - 20 * S);
      const room = Math.min(n.x - margin * 0.6, W - n.x - margin * 0.6, n.y - mT * 0.6 - (mT - 46 * S) * 0.4, H - n.y - mB * 0.6 - (mB - 46 * S) * 0.4);
      n.r = Math.max(18 * S, Math.min(n.r, room));
    }
    for (const n of nodes) lobes.push({ ...n, mass: mi });
    skeletons.push(nodes);

    // Peninsulas: smaller lobes hung off the chain.
    const pens = 2 + r.int(3) + (nodes.length > 5 ? 2 : 0);
    for (let i = 0; i < pens; i++) {
      const n = r.pick(nodes);
      const a = r.range(0, TAU);
      const pr = n.r * r.range(0.26, 0.5);
      const asp = r.range(1.5, 3.4), long = pr * Math.sqrt(asp);
      const d = n.r * r.range(0.8, 1.0) + long * 0.45;
      const px = n.x + Math.cos(a) * d, py = n.y + Math.sin(a) * d;
      if (px < margin + long || px > W - margin - long || py < mT + long || py > H - mB - long) continue;
      const lean = a + r.range(-0.6, 0.6);
      lobes.push({ x: px, y: py, r: pr, asp, ang: lean, mass: mi });
      // Some peninsulas run on into a second, smaller lobe, bent to one side.
      if (r.chance(0.5)) {
        const a2 = lean + r.range(-0.9, 0.9), pr2 = pr * r.range(0.5, 0.8), asp2 = r.range(1.3, 2.6);
        const reach2 = long * 0.8 + pr2 * Math.sqrt(asp2) * 0.6;
        const qx = px + Math.cos(lean) * long * 0.8 + Math.cos(a2) * pr2 * 0.6, qy = py + Math.sin(lean) * long * 0.8 + Math.sin(a2) * pr2 * 0.6;
        if (qx > margin + reach2 * 0.5 && qx < W - margin - reach2 * 0.5 && qy > mT + reach2 * 0.5 && qy < H - mB - reach2 * 0.5) lobes.push({ x: qx, y: qy, r: pr2, asp: asp2, ang: a2, mass: mi });
      }
    }
    // Gulfs: bites out of the edge of a lobe.
    const gulfs = 1 + r.int(3);
    for (let i = 0; i < gulfs; i++) {
      const n = r.pick(nodes);
      const br = n.r * r.range(0.3, 0.55);
      for (let t = 0; t < 8; t++) {
        const a = r.range(0, TAU), d = n.r * r.range(0.8, 1.05);
        const bx = n.x + Math.cos(a) * d, by = n.y + Math.sin(a) * d;
        // Only where the sketch's coast really is, so the bite opens to the sea.
        let c = Infinity;
        for (const l of nodes) c = Math.min(c, Math.hypot(bx - l.x, by - l.y) - l.r);
        if (c > -0.3 * br && c < 0.3 * br) {
          // Long gulfs point inland.
          const asp = r.range(1.2, 3), ang = a + r.range(-0.7, 0.7);
          const reach = br * Math.sqrt(asp) * 0.5;
          bites.push({ x: bx - Math.cos(ang) * reach, y: by - Math.sin(ang) * reach, r: br, asp, ang, depth: r.range(0.6, 1) });
          break;
        }
      }
    }

  });

  // Islands: groups and arcs in open water, sized so a small country fits.
  const clearance = (x, y) => {
    let c = Infinity;
    for (const l of lobes) c = Math.min(c, Math.hypot(x - l.x, y - l.y) - l.r);
    return c;
  };
  const islandPx = landPx * islandShare;
  const bigIslands = style.bigIslands ?? Math.max(3, Math.round(islandShare * 40));
  let spent = 0;
  for (let i = 0; i < bigIslands && spent < islandPx * 0.8; i++) {
    const rad = Math.sqrt((islandPx * r.range(0.5, 1.5)) / bigIslands / Math.PI) * 1.05;
    let best = null;
    for (let t = 0; t < 80; t++) {
      const x = r.range(0.06, 0.94) * W, y = r.range(0.1 * H + mT - 46 * S, 0.9 * H - mB + 46 * S);
      const c = clearance(x, y);
      // Near enough to a coast to belong to it, far enough to be an island.
      const want = rad * 1.5 + 34 * S;
      const score = -Math.abs(c - want * r.range(1, 1.8));
      if (c > rad + 26 * S && (!best || score > best.score)) best = { x, y, score };
    }
    if (!best) continue;
    const parts = r.chance(0.55) ? 1 : 2 + r.int(2);
    let ang = r.range(0, TAU), x = best.x, y = best.y, pr = rad / Math.sqrt(parts * 0.75);
    for (let p = 0; p < parts; p++) {
      const rr = pr * r.range(0.75, 1.15);
      const room = Math.min(x, W - x, y - (mT - 46 * S), H - y - (mB - 46 * S)) - 30 * S;
      if (room > 12 * S) lobes.push({ x, y, r: Math.min(rr, room), asp: r.range(1, 2.2), ang: r.range(0, TAU), mass: -1, island: true });
      ang += r.range(-0.9, 0.9);
      x += Math.cos(ang) * pr * 1.25; y += Math.sin(ang) * pr * 1.25;
      pr *= r.range(0.7, 0.95);
    }
    spent += Math.PI * rad * rad;
  }
  // Arcs of small islands trailing off the land, and scattered islets.
  const arcs = style.arcs ?? Math.round(2 + islandShare * 30);
  for (let i = 0; i < arcs; i++) {
    const src = r.pick(lobes.filter((l) => !l.island || r.chance(0.3)));
    let ang = r.range(0, TAU);
    let x = src.x + Math.cos(ang) * (src.r + 16 * S), y = src.y + Math.sin(ang) * (src.r + 16 * S);
    const curve = r.range(-0.3, 0.3);
    let rr = r.range(9, 19) * S;
    const n = 3 + r.int(6);
    for (let k = 0; k < n; k++) {
      if (x < 44 * S || x > W - 44 * S || y < mT - 2 * S || y > H - mB + 2 * S) break;
      if (clearance(x, y) > rr * 0.4) lobes.push({ x, y, r: rr, asp: r.range(1, 2.4), ang: ang + r.range(-0.6, 0.6), mass: -1, island: true, small: true });
      ang += curve + r.range(-0.25, 0.25);
      const hop = rr * r.range(1.7, 2.6);
      x += Math.cos(ang) * hop; y += Math.sin(ang) * hop;
      rr *= r.range(0.72, 1.05);
      if (rr < 4 * S) break;
    }
  }

  for (const l of [...lobes, ...bites]) {
    l.asp ??= 1; l.ang ??= 0;
    l.amp = clamp(l.r / (95 * S), 0.42, 1);
    l.cos = Math.cos(l.ang); l.sin = Math.sin(l.ang);
    l.ia = 1 / (l.r * Math.sqrt(l.asp)); l.ib = Math.sqrt(l.asp) / l.r;
  }

  // ---- The field. ----
  const field = new Float32Array(N);
  // Lobes are looked up through a coarse grid so a pixel only tests the ones near it.
  const G = 32, gw = Math.ceil(W / G), gh = Math.ceil(H / G);
  const buckets = Array.from({ length: gw * gh }, () => []);
  const reach = 150 * S; // the warp can move a point about this far
  lobes.forEach((l, i) => {
    const pad = l.r * Math.sqrt(l.asp) * 2.05 + reach;
    const x0 = Math.max(0, Math.floor((l.x - pad) / G)), x1 = Math.min(gw - 1, Math.floor((l.x + pad) / G));
    const y0 = Math.max(0, Math.floor((l.y - pad) / G)), y1 = Math.min(gh - 1, Math.floor((l.y + pad) / G));
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) buckets[gy * gw + gx].push(i);
  });

  const coldAt = new Float32Array(H);
  for (let y = 0; y < H; y++) coldAt[y] = smoothstep(48, 62, Math.abs(latitudeAt(y, H, style)));
  const rough = style.roughness ?? 1;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      // Two warps: a broad one that bends whole coasts, a finer one for bays.
      const ax = nWarpA(x / (300 * S), y / (300 * S)), ay = nWarpB(x / (300 * S), y / (300 * S));
      const cx = nWarpC(x / (88 * S), y / (88 * S)), cy = nWarpD(x / (88 * S), y / (88 * S));
      const wx = x + S * (84 * ax + 26 * cx);
      const wy = y + S * (84 * ay + 26 * cy);
      let v = -1.05;
      const list = buckets[Math.min(gh - 1, y >> 5) * gw + Math.min(gw - 1, x >> 5)];
      // How much crinkle the coast gets here: less on small islands, so they
      // keep their shape. Blended across lobes so there is no seam.
      let wSum = 1e-6, aSum = 0;
      // The best lobe of each of the two nearest masses, to keep a strait between them.
      let m1 = -2, v1 = -9, v2 = -9;
      for (let k = 0; k < list.length; k++) {
        const l = lobes[list[k]];
        const dx = wx - l.x, dy = wy - l.y;
        const lv = 1 - Math.hypot((dx * l.cos + dy * l.sin) * l.ia, (dy * l.cos - dx * l.sin) * l.ib);
        if (lv > -1.05) {
          const w = (lv + 1.05) ** 4;
          wSum += w; aSum += w * l.amp;
          v = smax(v, lv, 0.2);
          if (l.mass >= 0) {
            if (l.mass === m1) { if (lv > v1) v1 = lv; }
            else if (lv > v1) { v2 = v1; v1 = lv; m1 = l.mass; }
            else if (lv > v2) v2 = lv;
          }
        }
      }
      for (let k = 0; k < bites.length; k++) {
        const b = bites[k];
        const dx = wx - b.x, dy = wy - b.y;
        const d = Math.hypot((dx * b.cos + dy * b.sin) * b.ia, (dy * b.cos - dx * b.sin) * b.ib);
        if (d < 1) v -= b.depth * (1 - d) ** 1.3 * 1.8;
      }
      const local = wSum > 1e-5 ? aSum / wSum : 1;
      const rf = nRough(x / (380 * S), y / (380 * S));
      const amp = 1.15 * rough * local;
      // Some coasts are rugged and some smooth: the fine octaves come and go.
      const cold = coldAt[y];
      // Cold coasts are the most broken of all: fjords and skerries.
      const fine = clamp(0.62 + 0.75 * rf, 0.25, 1.3) * (1 + 0.9 * cold);
      // The crinkle rides partly on the warp, so bays curl instead of sitting
      // square. Each octave is about 0.58 of the last: a coast's roughness.
      const qx = (x + S * 30 * ax) / (200 * S), qy = (y + S * 30 * ay) / (200 * S);
      let det = 0, oa = 1, of = 1;
      for (let o = 0; o < 7; o++) {
        det += (o < 3 ? oa : oa * fine) * nDetail(qx * of + o * 17.31, qy * of - o * 9.73);
        oa *= 0.57; of *= 2.03;
      }
      // Small islands get a crinkle at their own scale.
      if (local < 0.95) det += (1 - local) * 1.1 * fbm(nIsle, x / (38 * S), y / (38 * S), 3, 2, 0.5);
      let f = v * 0.8 + amp * det;
      if (v2 > -0.95) f -= 0.9 * smoothstep(-0.95, -0.25, v2);
      // Fjords: in cold latitudes, long narrow inlets bite into the coast.
      if (cold > 0) {
        const fj = ridged(nFjord, x / (60 * S), y / (60 * S), 3, 2.2, 0.6);
        f -= cold * 0.5 * smoothstep(0.42, 0.8, fj) * smoothstep(0.45, 0.05, Math.abs(f));
      }
      // Sea all round the map's edge.
      const edge = Math.min(x, W - 1 - x, y - (mT - 46 * S), H - 1 - y - (mB - 46 * S));
      if (edge < 44 * S) f -= 1.4 * Math.min(1, 1 - edge / (44 * S)) ** 2;
      field[i] = f;
    }
  }

  // ---- Sea level: the threshold that gives the land share asked for. ----
  const land = new Uint8Array(N);
  const basin = new Uint8Array(N);
  const stack = new Int32Array(N);
  const target = Math.round(landShare * N);

  const maskAt = (t) => {
    let count = 0;
    for (let i = 0; i < N; i++) land[i] = field[i] > t ? 1 : 0;
    // Ocean: water reachable from the map's edge. Anything else is a basin inland.
    const ocean = new Uint8Array(N);
    let top = 0;
    const push = (i) => { if (!land[i] && !ocean[i]) { ocean[i] = 1; stack[top++] = i; } };
    for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
    while (top) {
      const i = stack[--top], x = i % W;
      if (x > 0) push(i - 1);
      if (x < W - 1) push(i + 1);
      if (i >= W) push(i - W);
      if (i < N - W) push(i + W);
    }
    // Specks of land too small to draw go back to the sea.
    const seen = new Uint8Array(N);
    const comp = [];
    for (let s = 0; s < N; s++) {
      if (!land[s] && !ocean[s]) { basin[s] = 1; land[s] = 1; } else basin[s] = 0;
    }
    for (let s = 0; s < N; s++) {
      if (!land[s] || seen[s]) continue;
      comp.length = 0;
      top = 0; stack[top++] = s; seen[s] = 1;
      while (top) {
        const i = stack[--top], x = i % W;
        comp.push(i);
        if (x > 0 && land[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; stack[top++] = i - 1; }
        if (x < W - 1 && land[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; stack[top++] = i + 1; }
        if (i >= W && land[i - W] && !seen[i - W]) { seen[i - W] = 1; stack[top++] = i - W; }
        if (i < N - W && land[i + W] && !seen[i + W]) { seen[i + W] = 1; stack[top++] = i + W; }
      }
      if (comp.length < 9 * S * S) for (const i of comp) { land[i] = 0; basin[i] = 0; }
      else count += comp.length;
    }
    return count;
  };

  // A first guess from the field's quantile, then a few corrections for what
  // the basins and specks add and take away.
  const sample = new Float32Array(Math.ceil(N / 7));
  for (let i = 0, k = 0; i < N; i += 7) sample[k++] = field[i];
  sample.sort();
  const quant = (share) => sample[clamp(Math.round((1 - share) * sample.length), 0, sample.length - 1)];
  let lo = quant(Math.min(0.98, landShare + 0.08)), hi = quant(Math.max(0.02, landShare - 0.08));
  let seaLevel = quant(landShare), count = maskAt(seaLevel);
  for (let it = 0; it < 14 && Math.abs(count - target) > N * 0.0015; it++) {
    if (count > target) lo = seaLevel; else hi = seaLevel;
    seaLevel = (lo + hi) / 2;
    count = maskAt(seaLevel);
  }

  // ---- Distance to the sea, for placing ranges and for the lie of the land. ----
  const dist = coastDistance(land, W, H);

  // ---- Ranges, walked across the land that is really there. ----
  // A cordillera keeps a set distance from one coast; a divide keeps as far
  // from every coast as it can, which walks it down the middle of the mass.
  const masses_ = landmasses(land, W, H);
  const near = new Float32Array(N); // how close an earlier range runs, 0..1
  const byMass = new Map();
  for (let i = 0; i < N; i += 1) {
    const m = masses_.id[i];
    if (m < 0 || masses_.areas[m] < 2600 * S * S) continue;
    // A thinned list of candidate starting points per mass.
    if ((i * 7919) % 23 !== 0) continue;
    if (!byMass.has(m)) byMass.set(m, []);
    byMass.get(m).push(i);
  }
  const mountains = style.mountains ?? 1;
  const distAt = (x, y) => (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 ? 0 : dist[Math.round(y) * W + Math.round(x)]);
  const massAt = (x, y) => (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 ? -1 : masses_.id[Math.round(y) * W + Math.round(x)]);
  const stampNear = (pts, w) => {
    for (const [px, py] of pts) {
      const rad = Math.ceil(w * 3);
      for (let dy = -rad; dy <= rad; dy += 2) for (let dx = -rad; dx <= rad; dx += 2) {
        const x = Math.round(px + dx), y = Math.round(py + dy);
        if (x < 0 || y < 0 || x >= W - 1 || y >= H - 1) continue;
        const v = 1 - Math.hypot(dx, dy) / (w * 3);
        if (v > 0) {
          const i = y * W + x;
          if (v > near[i]) near[i] = near[i + 1] = near[i + W] = near[i + W + 1] = v;
        }
      }
    }
  };
  for (const [m, starts] of [...byMass.entries()].sort((a, b) => a[0] - b[0])) {
    const area = masses_.areas[m];
    const big = area > 14000 * S * S;
    const want = big ? clamp(Math.round(Math.sqrt(area / (30000 * S * S)) * 1.5 * mountains + r.range(-0.3, 0.7)), 1, 6) : r.chance(0.55 * mountains) ? 1 : 0;
    let maxDist = 0;
    for (const i of starts) maxDist = Math.max(maxDist, dist[i]);
    for (let k = 0; k < want; k++) {
      const kind = k === 0 ? r.pick(['coast', 'coast', 'divide']) : r.pick(['coast', 'divide', 'divide']);
      const target = kind === 'coast' ? r.range(16, 30) * S : maxDist * r.range(0.6, 1);
      // Start where the land is the right distance from the sea and no range runs yet.
      let start = -1, bestScore = -Infinity;
      for (let t = 0; t < 60; t++) {
        const i = starts[r.int(starts.length)];
        const sc = -Math.abs(dist[i] - Math.min(target, maxDist * 0.9)) - near[i] * 80 * S + r.range(0, 6);
        if (dist[i] > 9 * S && sc > bestScore) { bestScore = sc; start = i; }
      }
      if (start < 0) continue;
      const hop = 11 * S;
      const length = (big ? r.range(130, 420) : r.range(50, 110)) * S * Math.min(1.3, Math.sqrt(area / (60000 * S * S)) + 0.45);
      const walk = (heading) => {
        const pts = [];
        let x = start % W, y = Math.floor(start / W), h = heading;
        for (let step = 0; step < length / hop / 2; step++) {
          let best = null;
          for (let c = -3; c <= 3; c++) {
            const hh = h + c * 0.17;
            const nx = x + Math.cos(hh) * hop, ny = y + Math.sin(hh) * hop;
            if (massAt(nx, ny) !== m) continue;
            const d = distAt(nx, ny);
            if (d < 8 * S) continue;
            // Look a little further on too, so the walk does not run into a bay.
            const d2 = distAt(nx + Math.cos(hh) * hop * 2, ny + Math.sin(hh) * hop * 2);
            const sc = -Math.abs(d - target) * (kind === 'coast' ? 1 : 0.35) - Math.abs(c) * 1.1 * S - near[Math.round(ny) * W + Math.round(nx)] * 60 * S + (d2 < 8 * S ? -30 * S : 0) + r.range(0, 3.5 * S);
            if (!best || sc > best.sc) best = { sc, nx, ny, hh };
          }
          if (!best) break;
          x = best.nx; y = best.ny; h = best.hh;
          pts.push([x, y]);
        }
        return pts;
      };
      const h0 = r.range(0, TAU);
      // For a cordillera, set off along the coast (across the slope of the distance).
      let heading = h0;
      if (kind === 'coast') {
        const sx = start % W, sy = Math.floor(start / W);
        const gx = distAt(sx + 4, sy) - distAt(sx - 4, sy), gy = distAt(sx, sy + 4) - distAt(sx, sy - 4);
        heading = Math.atan2(gx, -gy);
      }
      const fwd = walk(heading), back = walk(heading + Math.PI);
      const pts = [...back.reverse(), [start % W, Math.floor(start / W)], ...fwd];
      if (pts.length < 5) continue;
      let room = Infinity;
      for (const [px, py] of pts) room = Math.min(room, distAt(px, py));
      const w = clamp(r.range(13, 26) * S * (kind === 'coast' ? 0.9 : 1.1), 7 * S, Math.max(8 * S, maxDist * 0.42));
      ranges.push({ pts, w, h: r.range(0.62, 1) * (big ? 1 : 0.7), mass: m, kind });
      stampNear(pts, w);
      // A spur off the side, now and then.
      if (big && r.chance(0.5) && pts.length > 8) {
        const at = 2 + r.int(pts.length - 4);
        const from = pts[at], next = pts[at + 1];
        let ang = Math.atan2(next[1] - from[1], next[0] - from[0]) + (r.chance(0.5) ? 1 : -1) * r.range(0.7, 1.3);
        const spur = [from.slice()];
        let x = from[0], y = from[1];
        const n = 4 + r.int(6);
        for (let i = 0; i < n; i++) {
          ang += r.range(-0.25, 0.25);
          x += Math.cos(ang) * hop; y += Math.sin(ang) * hop;
          if (massAt(x, y) !== m || distAt(x, y) < 8 * S) break;
          spur.push([x, y]);
        }
        if (spur.length > 3) ranges.push({ pts: spur, w: w * 0.7, h: r.range(0.4, 0.65), mass: m, spur: true });
      }
    }
  }

  const rangeF = new Float32Array(N);
  // Range envelopes, rasterised by distance to each range's line.
  for (const rg of ranges) {
    const pad = rg.w * 3.4 + 24 * S;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of rg.pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    x0 = Math.max(0, Math.floor(x0 - pad)); x1 = Math.min(W - 1, Math.ceil(x1 + pad));
    y0 = Math.max(0, Math.floor(y0 - pad)); y1 = Math.min(H - 1, Math.ceil(y1 + pad));
    const pts = rg.pts, segs = pts.length - 1;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        // Wobble the lookup so the range is not a smooth tube.
        const wx = x + 13 * S * nRangeA(x / (46 * S), y / (46 * S));
        const wy = y + 13 * S * nRangeB(x / (46 * S), y / (46 * S));
        let best = Infinity, bt = 0;
        for (let s = 0; s < segs; s++) {
          const ax = pts[s][0], ay = pts[s][1], bx = pts[s + 1][0], by = pts[s + 1][1];
          const dx = bx - ax, dy = by - ay;
          const l2 = dx * dx + dy * dy || 1;
          const t = clamp(((wx - ax) * dx + (wy - ay) * dy) / l2, 0, 1);
          const d2 = (wx - ax - dx * t) ** 2 + (wy - ay - dy * t) ** 2;
          if (d2 < best) { best = d2; bt = (s + t) / segs; }
        }
        const u = Math.sqrt(best) / rg.w;
        if (u > 3.4) continue;
        // Taper at both ends; a core and a wider apron of foothills.
        const taper = smoothstep(0, 0.16, bt) * smoothstep(0, 0.16, 1 - bt);
        const v = rg.h * (0.35 + 0.65 * taper) * (0.78 * Math.exp(-u * u * 1.3) + 0.22 * Math.exp(-u * u * 0.22));
        const i = y * W + x;
        if (v > rangeF[i]) rangeF[i] = v;
      }
    }
  }


  // ---- Elevation. ----
  const elev = new Float32Array(N);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const d = field[i] - seaLevel;
      if (!land[i]) { elev[i] = Math.min(-0.002, d * 0.5); continue; }
      if (basin[i]) { elev[i] = Math.min(-0.004, d * 0.4 - 0.004); continue; }
      // The land rises steadily from the coast, so water has a way down; hills
      // and plateaux ride on that rise without damming it.
      const dd = dist[i] / S;
      const inland = 1 - Math.exp(-dd / 120);
      const hills = 0.5 + 0.5 * fbm(nHill, x / (70 * S), y / (70 * S), 5, 2, 0.5);
      const plateau = smoothstep(0.05, 0.5, nPlateau(x / (260 * S), y / (260 * S)));
      const rg = rangeF[i];
      const crest = ridged(nRidge, x / (44 * S), y / (44 * S), 5, 2.1, 0.55);
      const coast = smoothstep(0, 9, dd);
      let e = 0.004 + 0.11 * inland + 0.00022 * Math.min(dd, 320) + inland * (0.045 * hills + 0.07 * plateau * inland) + 0.01 * hills * coast;
      // Valleys: the land dips along winding lines (where a noise crosses
      // zero), large ones and small, and rivers find and follow them.
      const vx = x + 22 * S * nValleyC(x / (90 * S), y / (90 * S)), vy = y + 22 * S * nValleyC(x / (90 * S) + 31, y / (90 * S) - 17);
      e += coast * (0.05 * Math.abs(nValleyA(vx / (125 * S), vy / (125 * S))) + 0.02 * Math.abs(nValleyB(vx / (46 * S), vy / (46 * S))));
      e += coast * rg * (0.28 + 0.66 * crest) * 0.85;
      elev[i] = clamp(e, 0.002, 1);
    }
  }

  return { elev, land, seaLevel, ranges: ranges.filter((g) => !g.spur), lobes, layout: layoutName, dist };
}

// Distance from each land pixel to the sea, in pixels (a two-pass chamfer).
export function coastDistance(land, width, height) {
  const W = width, H = height, N = W * H;
  const d = new Float32Array(N);
  const A = 1, B = Math.SQRT2;
  for (let i = 0; i < N; i++) d[i] = land[i] ? 1e9 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!d[i]) continue;
    let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + A);
    if (y > 0) {
      v = Math.min(v, d[i - W] + A);
      if (x > 0) v = Math.min(v, d[i - W - 1] + B);
      if (x < W - 1) v = Math.min(v, d[i - W + 1] + B);
    }
    d[i] = v;
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x;
    if (!d[i]) continue;
    let v = d[i];
    if (x < W - 1) v = Math.min(v, d[i + 1] + A);
    if (y < H - 1) {
      v = Math.min(v, d[i + W] + A);
      if (x < W - 1) v = Math.min(v, d[i + W + 1] + B);
      if (x > 0) v = Math.min(v, d[i + W - 1] + B);
    }
    d[i] = v;
  }
  return d;
}

// Connected pieces of land, largest first: { id: Int32Array per pixel (-1 sea), areas: number[] }.
export function landmasses(land, width, height) {
  const W = width, H = height, N = W * H;
  const raw = new Int32Array(N).fill(-1);
  const stack = new Int32Array(N);
  const sizes = [];
  for (let s = 0; s < N; s++) {
    if (!land[s] || raw[s] >= 0) continue;
    const id = sizes.length;
    let top = 0, size = 0;
    stack[top++] = s; raw[s] = id;
    while (top) {
      const i = stack[--top], x = i % W;
      size++;
      if (x > 0 && land[i - 1] && raw[i - 1] < 0) { raw[i - 1] = id; stack[top++] = i - 1; }
      if (x < W - 1 && land[i + 1] && raw[i + 1] < 0) { raw[i + 1] = id; stack[top++] = i + 1; }
      if (i >= W && land[i - W] && raw[i - W] < 0) { raw[i - W] = id; stack[top++] = i - W; }
      if (i < N - W && land[i + W] && raw[i + W] < 0) { raw[i + W] = id; stack[top++] = i + W; }
    }
    sizes.push(size);
  }
  const order = sizes.map((_, i) => i).sort((a, b) => sizes[b] - sizes[a] || a - b);
  const rank = new Int32Array(sizes.length);
  order.forEach((old, i) => { rank[old] = i; });
  const id = new Int32Array(N).fill(-1);
  for (let i = 0; i < N; i++) if (raw[i] >= 0) id[i] = rank[raw[i]];
  return { id, areas: order.map((o) => sizes[o]) };
}

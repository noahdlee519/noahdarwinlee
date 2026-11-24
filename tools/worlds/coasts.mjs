// The coast's smaller forms, after the way real coasts are built:
//
//   fjords     long, narrow, steep-sided inlets cut into cold mountainous coasts, up the valleys, with side arms
//   cays       small low sandy islands on the banks of warm shallow seas, in clusters (a green heart on the larger)
//   skerries   swarms of bare rocky islets off cold, broken coasts
//   stacks     single pillars of rock just off steep headlands
//   bars       sandbars across the mouths of rivers
//   barriers   long thin sandy islands off low, straight coasts in warm and temperate seas, with a lagoon behind
//
// Fjords are cut into the land itself (they are large enough to be part of the coast and its countries). The rest
// are too small for the land grid: they are kept as vector outlines, drawn over the sea closer in, and belong to
// no country (as small islets on a regional map do not show any).

import { makeNoise, fbm, clamp, smoothstep } from './rng.mjs';
import { latitudeAt, coastDistance } from './terrain.mjs';
import { seaLevelTemp } from './climate.mjs';
import { blobRing, inRing } from './lakes.mjs';

const TAU = Math.PI * 2;

// Bilinear sample of a field.
function sampler(F, W, H) {
  return (x, y) => {
    const fx = clamp(x - 0.5, 0, W - 1.001), fy = clamp(y - 0.5, 0, H - 1.001);
    const ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy, k = iy * W + ix;
    return F[k] * (1 - u) * (1 - v) + F[k + 1] * u * (1 - v) + F[k + W] * (1 - u) * v + F[k + W + 1] * u * v;
  };
}

// carveFjords({ land, elev, width, height, rng, style }) => [{ pts: [[x, y], ...], width, arm }]
// Cuts fjords into cold mountainous coasts, in place: each starts at the coast and runs inland up the lowest ground
// ahead (a glacier's valley), narrowing to its head, sometimes with a side arm; it never comes near another coast,
// so no land is cut in two.
export function carveFjords({ land, elev, width, height, rng, style = {} }) {
  const W = width, H = height, N = W * H, S = W / 1600;
  const r = rng.fork('fjords');
  const nW = makeNoise(r);
  const dist = coastDistance(land, W, H);
  const D = sampler(dist, W, H), E = sampler(elev, W, H);
  const cold = (y) => smoothstep(46, 60, Math.abs(latitudeAt(clamp(y, 0, H - 1), H, style)));
  const isLand = (x, y) => { const qx = Math.floor(x), qy = Math.floor(y); return qx >= 1 && qy >= 1 && qx < W - 1 && qy < H - 1 && land[qy * W + qx] === 1; };
  // Candidate mouths: coast pixels on cold coasts with mountains close behind.
  const cands = [];
  const st = Math.max(1, Math.round(2 * S));
  for (let y = 4; y < H - 4; y += st) {
    const c = cold(y);
    if (c < 0.3) continue;
    for (let x = 4; x < W - 4; x += st) {
      const i = y * W + x;
      if (!land[i] || (land[i - 1] && land[i + 1] && land[i - W] && land[i + W])) continue;
      const gx = D(x + 2, y) - D(x - 2, y), gy = D(x, y + 2) - D(x, y - 2), gl = Math.hypot(gx, gy);
      if (gl < 0.5) continue;
      const nx = gx / gl, ny = gy / gl;
      let hi = 0;
      for (let t = 3; t <= 24; t += 1.5) { if (!isLand(x + nx * t, y + ny * t)) { hi = -1; break; } hi = Math.max(hi, E(x + nx * t, y + ny * t)); }
      if (hi < 0.075) continue;
      cands.push({ x: x + 0.5, y: y + 0.5, nx, ny, score: (0.05 + hi) * c * (0.6 + 0.8 * r.next()) });
    }
  }
  cands.sort((a, b) => b.score - a.score || a.y - b.y || a.x - b.x);
  const want = clamp(Math.round(cands.length / (22 / S)), 0, 16);
  const fjords = [];
  const near = (x, y, R) => fjords.some((f) => f.pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < R));
  const walk = (x0, y0, h0, L) => {
    const pts = [[x0, y0]];
    let x = x0, y = y0, h = h0, maxD = 0;
    const step = 0.5 * S;
    for (let t = 0; t < L; t += step) {
      let best = null;
      for (const dh of [-0.32, -0.16, 0, 0.16, 0.32]) {
        const hh = h + dh, ax = x + Math.cos(hh) * 3 * S, ay = y + Math.sin(hh) * 3 * S;
        if (!isLand(ax, ay)) continue;
        // Down the valley: the lowest ground ahead, without turning much, and a gentle wander of its own.
        const sc = -E(ax, ay) - Math.abs(dh) * 0.025 + 0.012 * fbm(nW, ax / (9 * S), ay / (9 * S), 2);
        if (!best || sc > best.sc) best = { sc, hh };
      }
      if (!best) break;
      h = best.hh;
      const nx = x + Math.cos(h) * step, ny = y + Math.sin(h) * step;
      const d = D(nx, ny);
      maxD = Math.max(maxD, d);
      // Never toward another shore: stop while the far side is still well away.
      if (t > 4 * S && (d < maxD - 6 * S || d < 4 * S && t > 8 * S)) break;
      x = nx; y = ny;
      pts.push([x, y]);
    }
    return pts;
  };
  const carve = (pts, w0, w1) => {
    const n = pts.length;
    for (let k = 0; k < n; k++) {
      const u = k / Math.max(1, n - 1), [px, py] = pts[k];
      // (At least the pixel the line runs through: the land grid is a unit to the pixel.)
      const w = Math.max(0.75 * S, (w0 * (1 - u) + w1 * u) * (1 + 0.18 * fbm(nW, px / (3 * S), py / (3 * S), 2)) / 2);
      const R = Math.ceil(w + 1);
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const qx = Math.floor(px) + dx, qy = Math.floor(py) + dy;
        if (qx < 1 || qy < 1 || qx >= W - 1 || qy >= H - 1) continue;
        if (Math.hypot(qx + 0.5 - px, qy + 0.5 - py) > w) continue;
        const i = qy * W + qx;
        if (land[i]) { land[i] = 0; elev[i] = -0.004; }
      }
    }
    // Steep sides: the land rises sharply from the water, more toward the head.
    for (let k = 0; k < n; k += 2) {
      const u = k / Math.max(1, n - 1), [px, py] = pts[k], R = Math.ceil(6 * S);
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const qx = Math.floor(px) + dx, qy = Math.floor(py) + dy;
        if (qx < 1 || qy < 1 || qx >= W - 1 || qy >= H - 1) continue;
        const i = qy * W + qx, d = Math.hypot(qx + 0.5 - px, qy + 0.5 - py);
        if (!land[i] || d > 6 * S) continue;
        const lift = (0.07 + 0.08 * u) * smoothstep(6 * S, 1.2 * S, d);
        if (elev[i] < 0.3) elev[i] = Math.min(0.3, Math.max(elev[i], elev[i] * 0.5 + lift + 0.05 * smoothstep(6 * S, 1.5 * S, d)));
      }
    }
  };
  for (const c of cands) {
    if (fjords.length >= want) break;
    if (near(c.x, c.y, 26 * S)) continue;
    const L = r.range(30, 72) * S;
    // Start a little out to sea, so the mouth opens cleanly.
    const pts = walk(c.x - c.nx * 1.5 * S, c.y - c.ny * 1.5 * S, Math.atan2(c.ny, c.nx), L);
    if (pts.length * 0.5 * S < 18 * S) continue;
    if (fjords.some((f) => f.pts.some((p) => pts.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 10 * S)))) continue;
    const w0 = r.range(1.2, 2) * S, w1 = r.range(0.5, 0.75) * S;
    carve(pts, w0, w1);
    fjords.push({ pts, width: w0, arm: false });
    // A side arm, now and then, off the middle reach.
    if (pts.length * 0.5 * S > 24 * S && r.chance(0.5)) {
      const k = Math.floor(pts.length * r.range(0.3, 0.55));
      const a = pts[Math.max(0, k - 2)], b = pts[Math.min(pts.length - 1, k + 2)];
      const h = Math.atan2(b[1] - a[1], b[0] - a[0]) + (r.chance(0.5) ? 1 : -1) * r.range(0.7, 1.2);
      const [sx, sy] = pts[k];
      const arm = walk(sx, sy, h, pts.length * 0.5 * S * r.range(0.3, 0.5));
      if (arm.length > 10) {
        const wk = w0 + (w1 - w0) * (k / pts.length);
        carve(arm, wk * 0.85, w1);
        fjords.push({ pts: arm, width: wk * 0.85, arm: true });
      }
    }
  }
  return fjords;
}

// buildIslets({ land, landAll, elev, width, height, rng, style, hydro, about, lakes }) => {
//   islets: [{ kind: 'cay'|'skerry'|'stack'|'bar'|'barrier', ring, green? }],
//   groups: [{ kind: 'cays'|'skerries', x, y, n }], lagoons: [{ x, y, along: [[x, y], ...] }] }
export function buildIslets({ landAll, elev, width, height, rng, style = {}, hydro, about = null, keepClear = [] }) {
  const W = width, H = height, N = W * H, S = W / 1600;
  const r = rng.fork('islets');
  const nB = makeNoise(r);
  // Distance from each sea pixel to the land (and each land pixel's distance to the sea, as 0).
  const seaD = coastDistance(landAll.map((v) => (v ? 0 : 1)), W, H);
  const SD = sampler(seaD, W, H), E = sampler(elev, W, H);
  const lakes = hydro.lakes;
  const seaTemp = (y) => seaLevelTemp(latitudeAt(clamp(y, 0, H - 1), H, style)) + (style.warm || 0);
  const inSea = (x, y) => { const qx = Math.floor(x), qy = Math.floor(y); return qx >= 0 && qy >= 0 && qx < W && qy < H && !landAll[qy * W + qx] && !lakes[qy * W + qx]; };
  const aboutNear = (x, y, R) => about && Math.hypot(x - about.x, y - about.y) < (about.r || 8 * S) + R;
  const islets = [], groups = [], lagoons = [];
  const placed = []; // [x, y, r]
  const clearOfPlaced = (x, y, rad, gap) => placed.every(([px, py, pr]) => Math.hypot(px - x, py - y) > pr + rad + gap) && keepClear.every(([kx, ky, kr]) => Math.hypot(kx - x, ky - y) > kr + rad);
  // A ring clear of the land by `gap` (its points and centre at sea, that far from any land).
  const ringClear = (ring, gap) => ring.every(([x, y]) => inSea(x, y) && SD(x, y) > gap);
  const put = (kind, ring, x, y, rad, extra = {}) => { islets.push({ kind, ring: ring.map(([a, b]) => [Math.round(a * 100) / 100, Math.round(b * 100) / 100]), ...extra }); placed.push([x, y, rad]); };

  // ---- Cays: clusters on banks in warm shallow seas, near the coasts and islands. ----
  {
    const cands = [];
    const st = Math.max(3, Math.round(5 * S));
    for (let y = st; y < H - st; y += st) {
      if (seaTemp(y) < 22.5) continue;
      for (let x = 0; x < W; x += st) {
        const d = seaD[y * W + x];
        if (!inSea(x, y) || d < 5 * S || d > 26 * S || aboutNear(x, y, 20 * S)) continue;
        cands.push({ x: x + 0.5, y: y + 0.5, v: r.next() });
      }
    }
    cands.sort((a, b) => a.v - b.v);
    const want = clamp(Math.round(cands.length / 110), 0, 5);
    const banks = [];
    for (const c of cands) {
      if (banks.length >= want) break;
      if (banks.some((b) => Math.hypot(b.x - c.x, b.y - c.y) < 70 * S)) continue;
      const a = r.range(0, Math.PI), len = r.range(9, 20) * S, wid = len * r.range(0.28, 0.45), ca = Math.cos(a), sa = Math.sin(a);
      const members = [];
      const n = 8 + r.int(14);
      for (let t = 0; t < n * 8 && members.length < n; t++) {
        const u = (r.next() * 2 - 1), v = (r.next() * 2 - 1);
        if (u * u + v * v > 1) continue;
        const x = c.x + ca * u * len - sa * v * wid, y = c.y + sa * u * len + ca * v * wid;
        const rad = r.range(0.35, 1.15) * S * (1 - 0.35 * Math.hypot(u, v));
        if (!inSea(x, y) || SD(x, y) < 1.5 * S || !clearOfPlaced(x, y, rad, 0.45 * S)) continue;
        const ring = blobRing(r, x, y, rad, { stretch: r.range(0.3, 1.4), lean: a + r.range(-0.4, 0.4), wobble: 1.4, n: 12 });
        if (!ringClear(ring, 0.8 * S)) continue;
        put('cay', ring, x, y, rad, rad > 0.6 * S ? { green: blobRing(r, x, y, rad * 0.55, { stretch: 0.6, lean: a, wobble: 1, n: 10 }).map(([p, q]) => [Math.round(p * 100) / 100, Math.round(q * 100) / 100]) } : {});
        members.push([x, y]);
      }
      if (members.length >= 4) {
        banks.push(c);
        groups.push({ kind: 'cays', x: members.reduce((s, m) => s + m[0], 0) / members.length, y: members.reduce((s, m) => s + m[1], 0) / members.length, n: members.length, r: len });
      }
    }
  }

  // ---- Skerries: swarms of rocky islets off cold, broken coasts. ----
  {
    const cands = [];
    const st = Math.max(2, Math.round(4 * S));
    for (let y = st; y < H - st; y += st) {
      if (seaTemp(y) > 7) continue;
      for (let x = 0; x < W; x += st) {
        const d = seaD[y * W + x];
        if (!inSea(x, y) || d < 1.5 * S || d > 4 * S || aboutNear(x, y, 14 * S)) continue;
        cands.push({ x: x + 0.5, y: y + 0.5, v: r.next() });
      }
    }
    cands.sort((a, b) => a.v - b.v);
    const want = clamp(Math.round(cands.length / 90), 0, 9);
    let made = 0;
    for (const c of cands) {
      if (made >= want) break;
      if (groups.some((g) => Math.hypot(g.x - c.x, g.y - c.y) < 60 * S)) continue;
      const members = [];
      const n = 7 + r.int(16);
      for (let t = 0; t < n * 10 && members.length < n; t++) {
        const x = c.x + r.range(-9, 9) * S, y = c.y + r.range(-9, 9) * S;
        const d = SD(x, y), rad = r.range(0.1, 0.42) * S;
        if (!inSea(x, y) || d < 0.5 * S || d > 4.5 * S || !clearOfPlaced(x, y, rad, 0.22 * S)) continue;
        const ring = blobRing(r, x, y, rad, { stretch: r.range(0, 0.8), lean: r.range(0, Math.PI), wobble: 1.8, n: 9 });
        if (!ringClear(ring, 0.35 * S)) continue;
        put('skerry', ring, x, y, rad);
        members.push([x, y]);
      }
      if (members.length >= 5) {
        made++;
        groups.push({ kind: 'skerries', x: members.reduce((s, m) => s + m[0], 0) / members.length, y: members.reduce((s, m) => s + m[1], 0) / members.length, n: members.length, r: 7 * S });
      }
    }
  }

  // ---- Sea stacks: just off steep headlands. ----
  {
    const cands = [];
    const st = Math.max(1, Math.round(2 * S));
    for (let y = 8; y < H - 8; y += st) for (let x = 8; x < W - 8; x += st) {
      const i = y * W + x;
      if (!landAll[i] || (landAll[i - 1] && landAll[i + 1] && landAll[i - W] && landAll[i + W])) continue;
      if (seaTemp(y) > 24 || elev[i] < 0.06) continue;
      // A headland: land on few of the rays round the point.
      let l = 0, ox = 0, oy = 0;
      for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU, qx = Math.floor(x + Math.cos(a) * 4 * S), qy = Math.floor(y + Math.sin(a) * 4 * S); if (qx >= 0 && qy >= 0 && qx < W && qy < H && landAll[qy * W + qx]) l++; else { ox += Math.cos(a); oy += Math.sin(a); } }
      if (l > 6) continue;
      cands.push({ x: x + 0.5, y: y + 0.5, ox, oy, v: elev[i] + 0.1 * r.next() });
    }
    cands.sort((a, b) => b.v - a.v);
    let made = 0;
    for (const c of cands) {
      if (made >= 22) break;
      const ol = Math.hypot(c.ox, c.oy) || 1, ux = c.ox / ol, uy = c.oy / ol;
      const k = 1 + r.int(3);
      let ok = 0;
      for (let j = 0; j < k; j++) {
        const t = r.range(0.7, 1.6) * S, side = r.range(-0.8, 0.8) * S;
        const x = c.x + ux * t - uy * side, y = c.y + uy * t + ux * side, rad = r.range(0.06, 0.13) * S;
        if (!inSea(x, y) || SD(x, y) < 0.35 * S || !clearOfPlaced(x, y, rad, 0.5 * S) || aboutNear(x, y, 4 * S)) continue;
        const ring = blobRing(r, x, y, rad, { stretch: 0.2, lean: r.range(0, Math.PI), wobble: 1, n: 8 });
        if (!ringClear(ring, 0.18 * S)) continue;
        put('stack', ring, x, y, rad);
        ok++;
      }
      if (ok) made++;
    }
  }

  // ---- Sandbars: across the mouths of rivers, a little way out. ----
  {
    let made = 0;
    hydro.rivers.forEach((pts, k) => {
      const m = hydro.riverMeta[k];
      if (made >= 8 || m.ends !== 'sea' || m.width < 2 || pts.length < 20) return;
      const [mx, my] = pts[pts.length - 1];
      if (seaTemp(my) < 4) return;
      const back = pts[Math.max(0, pts.length - 8)];
      let dx = mx - back[0], dy = my - back[1];
      const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
      const off = r.range(1.6, 2.6) * S, len = r.range(1.8, 3.6) * S, wid = r.range(0.16, 0.3) * S;
      const cx = mx + dx * off, cy = my + dy * off;
      // A gentle crescent, bowed out to sea.
      const line = [];
      for (let t = -1; t <= 1.0001; t += 0.25) line.push([cx - dy * t * len / 2 + dx * (1 - t * t) * 0.4 * S, cy + dx * t * len / 2 + dy * (1 - t * t) * 0.4 * S]);
      const ring = strip(line, wid);
      if (!ringClear(ring, 0.3 * S) || !clearOfPlaced(cx, cy, len / 2, 0.3 * S)) return;
      put('bar', ring, cx, cy, len / 2);
      made++;
    });
  }

  // ---- Barrier islands, with lagoons behind: off low, straight coasts in warm and temperate seas. ----
  {
    const cands = [];
    const st = Math.max(3, Math.round(6 * S));
    for (let y = st; y < H - st; y += st) {
      const t = seaTemp(y);
      if (t < 13) continue;
      for (let x = st; x < W - st; x += st) {
        if (!inSea(x, y) || Math.abs(seaD[y * W + x] - 2.5 * S) > 1.2 * S || aboutNear(x, y, 30 * S)) continue;
        cands.push({ x: x + 0.5, y: y + 0.5, v: r.next() });
      }
    }
    cands.sort((a, b) => a.v - b.v);
    const grad = (x, y) => { const gx = SD(x + 0.7, y) - SD(x - 0.7, y), gy = SD(x, y + 0.7) - SD(x, y - 0.7), l = Math.hypot(gx, gy) || 1; return [gx / l, gy / l]; };
    let made = 0;
    for (const c of cands) {
      if (made >= 3) break;
      if (lagoons.some((g) => Math.hypot(g.x - c.x, g.y - c.y) < 90 * S)) continue;
      // Follow the coast at a set distance out, both ways.
      const off = r.range(2.2, 3.2) * S;
      const trace = (dir) => {
        const out = [];
        let x = c.x, y = c.y, turn = 0, prev = null;
        for (let k = 0; k < 80; k++) {
          const [gx, gy] = grad(x, y);
          const tx = -gy * dir, ty = gx * dir;
          if (prev) { let da = Math.atan2(ty, tx) - prev; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; turn += Math.abs(da); }
          prev = Math.atan2(ty, tx);
          x += tx * 0.5 * S; y += ty * 0.5 * S;
          const e = off - SD(x, y);
          x += gx * e * 0.8; y += gy * e * 0.8;
          if (!inSea(x, y) || Math.abs(SD(x, y) - off) > 0.6 * S || turn > 1.4) break;
          // Low land behind: no hills within a few units of the shore.
          const lx = x - gx * (off + 3 * S), ly = y - gy * (off + 3 * S);
          if (E(lx, ly) > 0.07) break;
          out.push([x, y]);
        }
        return out;
      };
      const line = [...trace(-1).reverse(), [c.x, c.y], ...trace(1)];
      if (line.length * 0.5 * S < 14 * S) continue;
      // Broken into islands by tidal inlets.
      let k = 0, pieces = 0;
      const all = [];
      while (k < line.length - 6) {
        const n = Math.round(r.range(8, 22) * S / (0.5 * S));
        const seg = line.slice(k, Math.min(line.length, k + n));
        k += n + Math.round(r.range(1.4, 2.6));
        if (seg.length < 5) continue;
        const ring = strip(smoothLine(seg), r.range(0.3, 0.55) * S, true);
        if (!ringClear(ring, 0.5 * S) || !seg.every(([x, y]) => clearOfPlaced(x, y, 0.3 * S, 0.6 * S))) continue;
        all.push({ ring, seg });
        pieces++;
      }
      if (pieces < 2) continue;
      for (const { ring, seg } of all) put('barrier', ring, seg[seg.length >> 1][0], seg[seg.length >> 1][1], 0.4 * S);
      // The lagoon: between the islands and the shore, along the middle of the chain.
      const mid = line[line.length >> 1], [gx, gy] = grad(mid[0], mid[1]);
      const lx = mid[0] - gx * off * 0.5, ly = mid[1] - gy * off * 0.5;
      // (The whole chain's length, a half-lagoon in from it: the lagoon's name is set along this.)
      const along = line.map(([x, y]) => { const [hx, hy] = grad(x, y); return [Math.round((x - hx * off * 0.5) * 10) / 10, Math.round((y - hy * off * 0.5) * 10) / 10]; });
      lagoons.push({ x: lx, y: ly, along, off });
      made++;
    }
  }
  // ---- Atolls: in warm open water, a ring of low sandy islets on a reef round a lagoon (drawn as cays are). ----
  {
    const ar = r.fork('atolls');
    let made = 0;
    for (let t = 0; t < 400 && made < 3; t++) {
      const x = ar.range(30 * S, W - 30 * S), y = ar.range(30 * S, H - 30 * S);
      if (seaTemp(y) < 19 || !inSea(x, y) || SD(x, y) < 16 * S || SD(x, y) > 70 * S || aboutNear(x, y, 30 * S)) continue;
      if (groups.some((g) => Math.hypot(g.x - x, g.y - y) < 50 * S)) continue;
      // Large enough to read as a ring by zoom 4: some 9 to 15 units across, its rim half a unit wide.
      const R0 = ar.range(4.5, 7.5) * S, st = ar.range(1, 1.4), lean = ar.range(0, Math.PI), gapAt = ar.range(0, TAU);
      const at = (a, rr) => { const u = Math.cos(a) * rr * st, v = Math.sin(a) * rr / st; return [x + u * Math.cos(lean) - v * Math.sin(lean), y + u * Math.sin(lean) + v * Math.cos(lean)]; };
      const pieces = [];
      // Arcs of the rim, with passes between them, and a wider pass to leeward.
      for (let a = 0; a < TAU - 0.05;) {
        const span = ar.range(0.3, 0.9), pass = ar.range(0.06, 0.16);
        let da = a - gapAt; da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) > 0.3) {
          const line = [];
          for (let q = 0; q <= 10; q++) line.push(at(a + (span * q) / 10, R0 * (1 + 0.04 * Math.sin(q * 1.1 + a * 3))));
          pieces.push({ ring: strip(line, ar.range(0.4, 0.7) * S, true), mid: line[5] });
        }
        a += span + pass;
      }
      if (pieces.length < 3 || !pieces.every((pc) => ringClear(pc.ring, 3 * S)) || !clearOfPlaced(x, y, R0 * st, 1.5 * S)) continue;
      // The reef the islets stand on: a pale band of shallow water all the way round, under them.
      const reefLine = [];
      for (let q = 0; q <= 72; q++) reefLine.push(at((q / 72) * TAU, R0));
      const outer = [], inner = [];
      for (let q = 0; q < 72; q++) { const [px, py] = reefLine[q], ox = px - x, oy = py - y, ol = Math.hypot(ox, oy) || 1; outer.push([px + (ox / ol) * 0.75 * S, py + (oy / ol) * 0.75 * S]); inner.push([px - (ox / ol) * 0.6 * S, py - (oy / ol) * 0.6 * S]); }
      islets.push({ kind: 'reef', ring: outer.map(([a, b]) => [Math.round(a * 100) / 100, Math.round(b * 100) / 100]), hole: inner.map(([a, b]) => [Math.round(a * 100) / 100, Math.round(b * 100) / 100]) });
      for (const pc of pieces) put('cay', pc.ring, pc.mid[0], pc.mid[1], 0.3 * S);
      placed.push([x, y, R0 * st]);
      groups.push({ kind: 'atoll', x, y, n: pieces.length, r: R0 * st + 1.2 * S });
      made++;
    }
  }

  // ---- Spits: off low headlands, a sandspit that runs out with the shore's drift and hooks back at its end. And
  // tidal islands: a small island a little way off a low shore, joined to it by a bar of sand at low tide. ----
  {
    const sr = r.fork('spits');
    const cands = [];
    const st = Math.max(1, Math.round(2 * S));
    for (let y = 10; y < H - 10; y += st) for (let x = 10; x < W - 10; x += st) {
      const i = y * W + x;
      if (!landAll[i] || (landAll[i - 1] && landAll[i + 1] && landAll[i - W] && landAll[i + W])) continue;
      if (seaTemp(y) < 3 || elev[i] > 0.05) continue;
      let l = 0, ox = 0, oy = 0;
      for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU, qx = Math.floor(x + Math.cos(a) * 4 * S), qy = Math.floor(y + Math.sin(a) * 4 * S); if (qx >= 0 && qy >= 0 && qx < W && qy < H && landAll[qy * W + qx]) l++; else { ox += Math.cos(a); oy += Math.sin(a); } }
      if (l < 5 || l > 8) continue;
      cands.push({ x: x + 0.5, y: y + 0.5, ox, oy, v: sr.next() });
    }
    cands.sort((a, b) => a.v - b.v);
    let spits = 0, tidal = 0;
    for (const c of cands) {
      if (spits >= 4 && tidal >= 3) break;
      if (aboutNear(c.x, c.y, 10 * S) || groups.some((g) => Math.hypot(g.x - c.x, g.y - c.y) < 40 * S)) continue;
      const ol = Math.hypot(c.ox, c.oy) || 1, ux = c.ox / ol, uy = c.oy / ol;
      if (spits < 4 && (tidal >= 3 || sr.chance(0.6))) {
        // Out along the shore's line (square to the seaward way), curving seaward, then hooked back toward land.
        const side = sr.chance(0.5) ? 1 : -1, len = sr.range(3, 6) * S;
        const line = [];
        for (let q = 0; q <= 12; q++) {
          const t = q / 12, hook = t > 0.72 ? ((t - 0.72) / 0.28) ** 2 : 0;
          const along = len * (t - 0.35 * hook), out = (0.55 + 1.5 * Math.sin(t * Math.PI * 0.6)) * S - hook * 1.5 * S;
          line.push([c.x + ux * out - uy * side * along, c.y + uy * out + ux * side * along]);
        }
        const ring = strip(line, sr.range(0.13, 0.2) * S, true);
        // (Its root touches the shore; the rest stands clear in the water.)
        if (!line.slice(3).every(([x, y]) => inSea(x, y) && SD(x, y) > 0.45 * S) || !clearOfPlaced(line[7][0], line[7][1], len / 2, 0.4 * S)) continue;
        put('bar', ring, line[7][0], line[7][1], len / 2);
        groups.push({ kind: 'spit', x: line[8][0] + ux * 1.6 * S, y: line[8][1] + uy * 1.6 * S, n: 1, r: 1.5 * S });
        spits++;
      } else if (tidal < 3) {
        const off = sr.range(1.8, 3) * S, rad = sr.range(0.45, 0.8) * S;
        const x = c.x + ux * off, y = c.y + uy * off;
        const ring = blobRing(sr, x, y, rad, { stretch: sr.range(0, 0.5), lean: sr.range(0, Math.PI), wobble: 1.2, n: 12 });
        if (!ringClear(ring, 0.5 * S) || !clearOfPlaced(x, y, rad, 0.5 * S)) continue;
        const bar = [];
        for (let q = 0; q <= 5; q++) { const t = q / 5; bar.push([c.x + ux * (0.2 * S + (off - rad * 0.6 - 0.2 * S) * t) - uy * Math.sin(t * Math.PI) * 0.25 * S, c.y + uy * (0.2 * S + (off - rad * 0.6 - 0.2 * S) * t) + ux * Math.sin(t * Math.PI) * 0.25 * S]); }
        put('cay', ring, x, y, rad, { green: blobRing(sr, x, y, rad * 0.6, { stretch: 0.2, lean: 0, wobble: 1, n: 10 }).map(([a, b]) => [Math.round(a * 100) / 100, Math.round(b * 100) / 100]) });
        put('bar', strip(bar, 0.07 * S), (c.x + x) / 2, (c.y + y) / 2, 0.2 * S);
        groups.push({ kind: 'tidal', x, y: y - rad - 1.6 * S, n: 1, r: 0 });
        tidal++;
      }
    }
  }
  void N; void nB;
  return { islets, groups, lagoons };
}

// A ring round a line, `w` wide, with rounded (or tapered) ends.
function strip(line, w, taper = false) {
  const left = [], right = [];
  const n = line.length;
  for (let k = 0; k < n; k++) {
    const a = line[Math.max(0, k - 1)], b = line[Math.min(n - 1, k + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const u = k / Math.max(1, n - 1);
    const hw = (w / 2) * (taper ? Math.min(1, Math.sin(Math.PI * u) * 2.2 + 0.25) : Math.sin(Math.PI * (0.1 + 0.8 * u)) * 0.6 + 0.4);
    left.push([line[k][0] - ty * hw, line[k][1] + tx * hw]);
    right.push([line[k][0] + ty * hw, line[k][1] - tx * hw]);
  }
  return [...left, ...right.reverse()];
}
function smoothLine(pts) {
  return pts.map((p, k) => {
    let sx = 0, sy = 0, c = 0;
    for (let q = Math.max(0, k - 2); q <= Math.min(pts.length - 1, k + 2); q++) { sx += pts[q][0]; sy += pts[q][1]; c++; }
    return [sx / c, sy / c];
  });
}

export { inRing };

// buildIslandArcs({ land, elev, ice, width, height, rng, style }) => [{ islands: [[x, y, r]], cones: [{ x, y, e, crater }] }]
// Volcanic island arcs: a curved chain of small high islands some way off a coast, bowed out to the open sea (the
// coast lies on the arc's inner side, as the Aleutians and the Lesser Antilles lie), the larger ones each a cone,
// some with a crater lake. Drawn into the land and its heights in place, so they are part of the map's land and of
// the countries nearest them.
export function buildIslandArcs({ land, elev, ice = null, width, height, rng, style = {} }) {
  const W = width, H = height, S = W / 1600;
  const r = rng.fork('island-arcs');
  const count = style.arcs ?? ((style.volcanoes ?? 0) >= 3 ? 2 : r.chance(0.6) ? 1 : 0);
  if (!count) return [];
  const solid = new Uint8Array(W * H);
  for (let i = 0; i < solid.length; i++) solid[i] = land[i] || (ice && ice[i]) ? 1 : 0;
  const seaD = coastDistance(solid.map((v) => (v ? 0 : 1)), W, H);
  const SD = sampler(seaD, W, H);
  const noise = makeNoise(r.fork('arc-shape'));
  const arcs = [];
  for (let t = 0; t < 600 && arcs.length < count; t++) {
    const px = r.range(70 * S, W - 70 * S), py = r.range(70 * S, H - 70 * S);
    const d0 = SD(px, py);
    if (d0 < 24 * S || d0 > 70 * S) continue;
    if (arcs.some((a) => a.islands.some(([x, y]) => Math.hypot(x - px, y - py) < 150 * S))) continue;
    // Toward the nearest land: down the slope of the distance.
    let gx = SD(px + 2, py) - SD(px - 2, py), gy = SD(px, py + 2) - SD(px, py - 2);
    const gl = Math.hypot(gx, gy) || 1; gx /= gl; gy /= gl;
    const Rr = r.range(90, 170) * S, ox = px - gx * Rr, oy = py - gy * Rr;
    const a0 = Math.atan2(py - oy, px - ox), span = r.range(0.55, 0.95);
    const islands = [], cones = [];
    let a = a0 - span / 2;
    while (a <= a0 + span / 2) {
      const u = (a - (a0 - span / 2)) / span;
      const rad = r.range(2, 4.2) * S * (0.7 + 0.5 * Math.sin(Math.PI * u));
      const rr = Rr + r.range(-2.5, 2.5) * S;
      const x = ox + Math.cos(a) * rr, y = oy + Math.sin(a) * rr;
      a += (r.range(7, 12) * S) / Rr;
      if (x < 12 || y < 12 || x > W - 12 || y > H - 12 || SD(x, y) < rad + 9 * S) continue;
      islands.push([x, y, rad]);
    }
    if (islands.length < 6) continue;
    for (const [x, y, rad] of islands) {
      const cone = rad > 2.6 * S;
      const peak = cone ? r.range(0.3, 0.58) : r.range(0.06, 0.16);
      const R = Math.ceil(rad * 1.4) + 1;
      for (let yy = Math.floor(y) - R; yy <= y + R; yy++) for (let xx = Math.floor(x) - R; xx <= x + R; xx++) {
        const dx = xx + 0.5 - x, dy = yy + 0.5 - y, d = Math.hypot(dx, dy);
        const edge = rad * (1 + 0.28 * noise((x + dx * 0.6) / (2.2 * S), (y + dy * 0.6) / (2.2 * S)));
        if (d >= edge) continue;
        const i = yy * W + xx;
        land[i] = 1;
        elev[i] = Math.max(elev[i], 0.015 + peak * Math.pow(1 - d / edge, cone ? 1.25 : 0.8));
      }
      if (cone) cones.push({ x, y, e: peak, rad, crater: false });
    }
    // The largest one or two cones hold a crater lake (and are named, with their heights).
    cones.slice().sort((p, q) => q.rad - p.rad).slice(0, r.chance(0.5) ? 2 : 1).forEach((c) => { c.crater = true; });
    arcs.push({ islands: islands.map(([x, y, rad]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(rad * 10) / 10]), cones });
  }
  return arcs;
}

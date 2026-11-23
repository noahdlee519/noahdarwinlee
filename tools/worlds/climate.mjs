// Climate and land cover.
//
// Temperature comes from latitude and height. Rain is carried by the
// prevailing wind of each latitude band (easterlies near the equator and the
// poles, westerlies between), falls on the windward side of high ground, and
// leaves a rain shadow behind it. The two give each place one of seven
// land-cover classes.
//
// The classes are not painted as smooth bands. The land is cut into small
// angular facets (jittered triangles, long and thin in places) and each facet
// takes one class, so classes meet in shards and slivers, as on the web map
// this page borrows its look from.

import { makeNoise, fbm, clamp, smoothstep } from './rng.mjs';
import { latitudeAt, coastDistance } from './terrain.mjs';

export const COVER = { FOREST: 0, WOODLAND: 1, GRASS: 2, STEPPE: 3, DESERT: 4, ROCK: 5, SNOW: 6, URBAN: 7, SAND: 8, DUNE: 9, DRYROCK: 10, SALT: 11, WATER: 255 };
// Every class a desert is painted in (see renderCover's desert manner).
export const DRY_CLASSES = [COVER.DESERT, COVER.STEPPE, COVER.DUNE, COVER.DRYROCK, COVER.SALT];

// Sea-level temperature in °C at a latitude.
export function seaLevelTemp(lat) {
  return 29 - 44 * Math.abs(Math.sin((lat * Math.PI) / 180)) ** 2.5;
}

// Rain a latitude gets before the land has its say: wet at the equator, dry
// in the subtropics, wet again in the middle latitudes, dry at the poles.
function zonalRain(lat) {
  const a = Math.abs(lat);
  // The subtropical highs (about 20 to 32 degrees) are where the great deserts lie.
  const z = 0.24 + 0.8 * Math.exp(-((a / 12) ** 2)) + 0.52 * Math.exp(-(((a - 50) / 15) ** 2)) - 0.3 * Math.exp(-(((a - 26) / 9.5) ** 2));
  return Math.max(0.07, z) * (1 - 0.55 * smoothstep(62, 86, a));
}

function boxBlur(src, W, H, radius, passes = 2) {
  let a = src, b = new Float32Array(W * H);
  const win = radius * 2 + 1;
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < H; y++) {
      let sum = 0;
      const row = y * W;
      for (let x = -radius; x <= radius; x++) sum += a[row + clamp(x, 0, W - 1)];
      for (let x = 0; x < W; x++) {
        b[row + x] = sum / win;
        sum += a[row + Math.min(W - 1, x + radius + 1)] - a[row + Math.max(0, x - radius)];
      }
    }
    for (let x = 0; x < W; x++) {
      let sum = 0;
      for (let y = -radius; y <= radius; y++) sum += b[clamp(y, 0, H - 1) * W + x];
      for (let y = 0; y < H; y++) {
        a[y * W + x] = sum / win;
        sum += b[Math.min(H - 1, y + radius + 1) * W + x] - b[Math.max(0, y - radius) * W + x];
      }
    }
  }
  return a;
}

// buildFields({ elev, land, width, height, rng, style }) => { temp, rain, moist }
// temp in °C; rain and moist are unitless, about 0 (none) to 1 and over (wet).
export function buildFields({ elev, land, width, height, rng, style = {}, dist }) {
  const W = width, H = height, N = W * H;
  const S = W / 1600;
  const r = rng.fork ? rng.fork('climate') : rng;
  const nT = makeNoise(r), nP = makeNoise(r), nZ = makeNoise(r);
  const temp = new Float32Array(N), rain = new Float32Array(N), moist = new Float32Array(N);
  const d = dist || coastDistance(land, W, H);
  const wet = (style.wet ?? 1) * 1.08, warm = style.warm ?? 0;

  // The winds do not blow dead along the rows: each sweep runs on a slant
  // with a slow wave in it, so a dry interior is not a ruled stripe.
  const east = new Float32Array(N), west = new Float32Array(N);
  const back = clamp(0.5 * wet * wet, 0.3, 0.9);
  const slant = (r.chance(0.5) ? 1 : -1) * r.range(0.1, 0.22);
  const wave = r.range(16, 30) * S, waveLen = r.range(170, 260) * S, phase = r.range(0, 6.28);
  for (const dir of [1, -1]) {
    const out = dir === 1 ? west : east; // a wind from the west blows towards +x
    const offset = new Int32Array(W);
    for (let x = 0; x < W; x++) offset[x] = Math.round(dir * slant * (x - W / 2) + wave * Math.sin(x / waveLen + phase * dir));
    let lo = 0, hi = 0;
    for (let x = 0; x < W; x++) { lo = Math.min(lo, offset[x]); hi = Math.max(hi, offset[x]); }
    for (let v = -hi; v < H - lo; v++) {
      let q = 1, prev = 0;
      for (let k = 0; k < W; k++) {
        const x = dir === 1 ? k : W - 1 - k;
        const y = v + offset[x];
        if (y < 0 || y >= H) { q += (1 - q) * 0.022 / S; prev = 0; continue; }
        const i = y * W + x;
        if (!land[i]) { q += (1 - q) * 0.022 / S; prev = 0; out[i] = q * 0.78; continue; }
        const e = Math.max(0, elev[i]);
        const up = Math.max(0, e - prev) / S, down = Math.max(0, prev - e) / S;
        prev = e;
        // Air forced up a slope drops its rain there; sinking air dries.
        out[i] = q * (0.78 + Math.min(1.2, 26 * up)) * (1 - Math.min(0.5, 14 * down));
        q -= q * (0.002 / S + 1.15 * up * S);
        // Land gives some of its rain back to the air, so a rain shadow fades
        // downwind instead of running on across the whole continent.
        if (q < back) q += (back - q) * 0.0045 / S;
      }
    }
  }
  for (let y = 0; y < H; y++) {
    const lat0 = latitudeAt(y, H, style);
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      // The climate belts wander north and south a little; they are not ruled lines.
      const lat = lat0 + 7 * nZ(x / (340 * S), y / (340 * S)), a = Math.abs(lat);
      const westerly = smoothstep(25, 34, a) * (1 - smoothstep(58, 67, a));
      const e = Math.max(0, elev[i]);
      rain[i] = zonalRain(lat) * (westerly * west[i] + (1 - westerly) * east[i]);
      // Plains and plateaux are a little cooler; the heights are much colder.
      temp[i] = seaLevelTemp(lat) + warm - 18 * e - 62 * Math.max(0, e - 0.24) + 2 * nT(x / (160 * S), y / (160 * S));
    }
  }
  boxBlur(rain, W, H, Math.max(2, Math.round(10 * S)), 2);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      // A little sea air reaches every coast, whatever the wind.
      const sea = 0.1 * Math.exp(-d[i] / (26 * S));
      const p = (rain[i] * (1 + 0.3 * fbm(nP, x / (150 * S), y / (150 * S), 3)) + sea) * wet;
      rain[i] = p;
      // The hotter it is, the more rain it takes to stay green.
      moist[i] = p / (0.4 + 0.021 * Math.max(0, temp[i]));
    }
  }
  return { temp, rain, moist, dist: d };
}

// A mesh of jittered triangles over the map. `step` is the lattice spacing,
// `stretch` how long the facets are for their width, `angle` the way they lean.
// The mesh is geometry: buildMesh lays it out (drawing from the rng exactly as
// the whole picture always has), and rasterMesh paints any window of it.
function buildMesh(rng, W, H, step, stretch, angle) {
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const ax = ca * step * stretch, ay = sa * step * stretch; // lattice axis i
  const bx = (-sa * step) / stretch, by = (ca * step) / stretch; // lattice axis j
  // Lattice range that covers the map: invert the corners.
  const det = ax * by - ay * bx;
  let i0 = Infinity, i1 = -Infinity, j0 = Infinity, j1 = -Infinity;
  for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]]) {
    const i = (x * by - y * bx) / det, j = (y * ax - x * ay) / det;
    i0 = Math.min(i0, i); i1 = Math.max(i1, i); j0 = Math.min(j0, j); j1 = Math.max(j1, j);
  }
  i0 = Math.floor(i0) - 2; i1 = Math.ceil(i1) + 2; j0 = Math.floor(j0) - 2; j1 = Math.ceil(j1) + 2;
  const ni = i1 - i0 + 1, nj = j1 - j0 + 1;
  const vx = new Float32Array(ni * nj), vy = new Float32Array(ni * nj);
  for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) {
    const u = i + i0 + rng.range(-0.4, 0.4), v = j + j0 + rng.range(-0.4, 0.4);
    vx[j * ni + i] = u * ax + v * bx;
    vy[j * ni + i] = u * ay + v * by;
  }
  // Triangles in the order they are numbered: three vertex indices each.
  const count = (nj - 1) * (ni - 1) * 2;
  const tri = new Int32Array(count * 3);
  let t = 0;
  for (let j = 0; j < nj - 1; j++) for (let i = 0; i < ni - 1; i++) {
    const a = j * ni + i, b = a + 1, c = a + ni, d = c + 1;
    // Split each cell along one diagonal or the other.
    if (rng.chance(0.5)) { tri.set([a, b, d, a, d, c], t); } else { tri.set([a, b, c, b, d, c], t); }
    t += 6;
  }
  const cx = new Float32Array(count), cy = new Float32Array(count);
  for (let k = 0; k < count; k++) {
    const p = tri[k * 3], q = tri[k * 3 + 1], r = tri[k * 3 + 2];
    cx[k] = (vx[p] + vx[q] + vx[r]) / 3; cy[k] = (vy[p] + vy[q] + vy[r]) / 3;
  }
  return { vx, vy, tri, cx, cy, count, W, H };
}

// Which facet each pixel of a window (x0, y0, w, h, in the mesh's own pixels)
// falls in: { id: Int32Array(w * h) }.
function rasterMesh(mesh, x0, y0, w, h) {
  const { vx, vy, tri, count, W, H } = mesh;
  const id = new Int32Array(w * h).fill(-1);
  const X1 = Math.min(W, x0 + w) - 1, Y1 = Math.min(H, y0 + h) - 1;
  const eps = -1e-3;
  for (let k = 0; k < count; k++) {
    const p = tri[k * 3], q = tri[k * 3 + 1], r = tri[k * 3 + 2];
    const xa = vx[p], ya = vy[p], xb = vx[q], yb = vy[q], xc = vx[r], yc = vy[r];
    const minX = Math.max(x0, 0, Math.floor(Math.min(xa, xb, xc))), maxX = Math.min(X1, Math.ceil(Math.max(xa, xb, xc)));
    if (minX > maxX) continue;
    const minY = Math.max(y0, 0, Math.floor(Math.min(ya, yb, yc))), maxY = Math.min(Y1, Math.ceil(Math.max(ya, yb, yc)));
    if (minY > maxY) continue;
    const area = (xb - xa) * (yc - ya) - (xc - xa) * (yb - ya);
    if (area === 0) continue;
    const sgn = area > 0 ? 1 : -1;
    for (let y = minY; y <= maxY; y++) {
      const py = y + 0.5;
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        if (((xb - xa) * (py - ya) - (yb - ya) * (px - xa)) * sgn < eps) continue;
        if (((xc - xb) * (py - yb) - (yc - yb) * (px - xb)) * sgn < eps) continue;
        if (((xa - xc) * (py - yc) - (ya - yc) * (px - xc)) * sgn < eps) continue;
        id[(y - y0) * w + (x - x0)] = k;
      }
    }
  }
  // Any pixel the triangles' edges missed takes its neighbour's facet.
  for (let i = 0; i < w * h; i++) if (id[i] < 0) id[i] = i > 0 && id[i - 1] >= 0 ? id[i - 1] : 0;
  return id;
}

// Moisture to a position on the scale desert 0 | steppe 1 | grass 2 | woodland 3 | forest 4 (to 5).
// Moisture at which each class begins: desert, steppe, grass, woodland, forest. Grass and farmland take the widest
// band, as in the reference, where the land is mostly the middle green; beige is kept for the genuinely dry.
const STOPS = [0, 0.055, 0.115, 0.4, 0.68, 1.4];
function vegIndex(m) {
  if (m <= 0) return 0;
  for (let k = 1; k < STOPS.length; k++) {
    if (m < STOPS[k]) return k - 1 + (m - STOPS[k - 1]) / (STOPS[k] - STOPS[k - 1]);
  }
  return 4.999;
}
const VEG_CLASS = [COVER.DESERT, COVER.STEPPE, COVER.GRASS, COVER.WOODLAND, COVER.FOREST];

// classifyCover({ fields, elev, land, width, height, rng, style, water, scale, bleed })
//   => { cover, ponds, width, height }
// water (optional): { rivers: Uint8Array mask of main rivers, lakes: Uint8Array }
// greens the banks of rivers that cross dry country.
// scale (optional): draw the same facets on a grid `scale` times finer, for
// the picture. The facets are geometry, so they come out sharper, not different.
// bleed (optional, with scale): carry the land cover this many map units out
// to sea, so a smooth vector coast drawn over the picture never shows a gap.
export function classifyCover(opts) {
  const prep = prepareCover(opts);
  return { ...renderCover(prep, 0, 0, prep.W, prep.H), width: prep.W, height: prep.H };
}

// prepareCover(same options as classifyCover) => everything the land cover at
// one scale needs, ready to paint any window of it with renderCover.
// urban (optional): (x, y, elev) => boolean, map units: built-up ground, painted grey.
// shade (optional): also return a hillshade level per pixel (0 flat, 1 in
// shadow, 2 lit), from the slope of the land to a light in the north-west.
// ice (optional): a mask of polar ice, all snow. lakes (optional): (x, y) => true inside a small lake, painted as
// water. flow (optional): gathered water per pixel, for glaciers down the valleys.
export function prepareCover({ fields, elev, land, width, height, rng, style = {}, water, scale = 1, bleed = 0, urban = null, shade = false, ice = null, lakes = null, flow = null, dist = null, basins = null, oases = null, polar = null, about = null }) {
  const W0 = width, H0 = height;
  const W = Math.round(W0 * scale), H = Math.round(H0 * scale);
  const S = W / 1600;
  const r = rng.fork ? rng.fork('cover') : rng;

  // Three meshes: broad patches, and two sets of thin shards leaning different ways.
  const lean = r.range(0, Math.PI);
  const broad = buildMesh(r, W, H, 23 * S, 1.25, lean + 0.6);
  const fineA = buildMesh(r, W, H, 8.5 * S, 1.45, lean);
  const fineB = buildMesh(r, W, H, 8.5 * S, 1.45, lean + 1.25);
  const tiny = buildMesh(r, W, H, 5 * S, 1.6, lean + 2.2);
  const rand = (n) => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = r.next(); return a; };
  const broadJ = rand(broad.count), broadPick = rand(broad.count);
  const fineJA = rand(fineA.count), fineJB = rand(fineB.count);
  const fineKA = rand(fineA.count), fineKB = rand(fineB.count);
  const tinyJ = rand(tiny.count);
  // Wet ground near a river, for green banks in dry country.
  let bank = null;
  if (water && water.rivers) {
    const N0 = W0 * H0, S0 = W0 / 1600;
    bank = new Float32Array(N0);
    for (let i = 0; i < N0; i++) bank[i] = water.rivers[i] || (water.lakes && water.lakes[i]) ? 1 : 0;
    boxBlur(bank, W0, H0, Math.max(1, Math.round(3 * S0)), 2);
  }
  // The same for rivers alone: in the desert a river is lined with green, a lake is not ringed with it.
  let riverBank = null;
  if (water && water.rivers) {
    const N0 = W0 * H0, S0 = W0 / 1600;
    riverBank = new Float32Array(N0);
    for (let i = 0; i < N0; i++) riverBank[i] = water.rivers[i] && !(water.lakes && water.lakes[i]) ? 1 : 0;
    boxBlur(riverBank, W0, H0, Math.max(1, Math.round(2 * S0)), 2);
  }

  // Where the picture's land runs out past the coast, each sea pixel reads
  // the climate of the land pixel nearest to it.
  let nearest = null;
  if (bleed > 0) {
    const N0 = W0 * H0;
    nearest = new Int32Array(N0).fill(-1);
    let frontier = [];
    for (let i = 0; i < N0; i++) if (land[i]) nearest[i] = i;
    for (let i = 0; i < N0; i++) {
      if (!land[i]) continue;
      const x = i % W0;
      if ((x > 0 && !land[i - 1]) || (x < W0 - 1 && !land[i + 1]) || (i >= W0 && !land[i - W0]) || (i < N0 - W0 && !land[i + W0])) frontier.push(i);
    }
    for (let ring = 0; ring < Math.ceil(bleed) + 1; ring++) {
      const next = [];
      for (const i of frontier) {
        const x = i % W0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, n = i + dx + dy * W0;
          if (nx < 0 || nx >= W0 || n < 0 || n >= N0 || nearest[n] >= 0) continue;
          nearest[n] = nearest[i]; next.push(n);
        }
      }
      frontier = next;
    }
  }

  const nDune = makeNoise(r.fork('dunes')), duneAngle = r.next() * Math.PI;
  // Gathered water, softened, so glaciers follow the valleys with smooth edges at any scale.
  let flowSoft = null;
  if (flow) {
    flowSoft = new Float32Array(W0 * H0);
    for (let i = 0; i < flowSoft.length; i++) flowSoft[i] = Math.min(60, Math.sqrt(flow[i]));
    boxBlur(flowSoft, W0, H0, 1, 2);
  }
  // Deserts: smooth broad fields, not facets (see renderCover).
  const dr = r.fork('desert');
  const desertNoise = { a: makeNoise(dr), b: makeNoise(dr), rock: makeNoise(dr), erg: makeNoise(dr), oasis: makeNoise(dr) };
  // The region's dryness, blurred wide, so the mountains in a desert are painted in the desert's manner too; and the
  // lie of the land, blurred, so rugged ground (above its surroundings, or steep) can be told from a flat plateau.
  const S00 = W0 / 1600;
  const aridity = boxBlur(Float32Array.from(fields.moist), W0, H0, Math.max(2, Math.round(9 * S00)), 2);
  // The dry basins, blurred, so only the broad ones show as salt flats.
  if (basins) basins = boxBlur(Float32Array.from(basins), W0, H0, Math.max(1, Math.round(2.5 * S00)), 2);
  const elevSoft = boxBlur(Float32Array.from(elev, (e) => Math.max(0, e)), W0, H0, Math.max(2, Math.round(6 * S00)), 2);
  const elevMid = boxBlur(Float32Array.from(elev, (e) => Math.max(0, e)), W0, H0, Math.max(1, Math.round(2 * S00)), 2);
  return { W0, H0, W, H, scale, fields, elev, land, style, broad, fineA, fineB, tiny, broadJ, broadPick, fineJA, fineJB, fineKA, fineKB, tinyJ, bank, nearest, urban, shade, ice, lakes, flow: flowSoft, dist, nDune, duneAngle, basins, oases, desertNoise, aridity, elevSoft, elevMid, riverBank, polar, about };
}

// renderCover(prep, x0, y0, w, h) => { cover, ponds } for a window of the picture
// (in its own pixels): a class index per pixel, 255 for the sea.
export function renderCover(prep, wx0, wy0, w, h) {
  const { W0, H0, scale, fields, elev, land, style, broad, fineA, fineB, tiny, broadJ, broadPick, fineJA, fineJB, fineKA, fineKB, tinyJ, bank, nearest, urban, ice, lakes, flow, dist, nDune, duneAngle, basins, oases, desertNoise: DN, aridity, elevSoft, elevMid, riverBank, polar: polarCover, about: aboutCover } = prep;
  const S0 = W0 / 1600, dca = Math.cos(duneAngle), dsa = Math.sin(duneAngle);
  // Elevation between pixel centres, for the hillshade.
  const E = (x, y) => {
    const fx = clamp(x - 0.5, 0, W0 - 1.001), fy = clamp(y - 0.5, 0, H0 - 1.001);
    const ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy, k = iy * W0 + ix;
    const a = Math.max(0, elev[k]), b = Math.max(0, elev[k + 1]), c = Math.max(0, elev[k + W0]), d = Math.max(0, elev[k + W0 + 1]);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  // Any field between pixel centres, so a boundary drawn from it is smooth at every scale.
  const bil = (F, x, y) => {
    const fx = clamp(x - 0.5, 0, W0 - 1.001), fy = clamp(y - 0.5, 0, H0 - 1.001);
    const ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy, k = iy * W0 + ix;
    return F[k] * (1 - u) * (1 - v) + F[k + 1] * u * (1 - v) + F[k + W0] * (1 - u) * v + F[k + W0 + 1] * u * v;
  };
  const shade = prep.shade ? new Uint8Array(w * h) : null;
  const { temp, moist } = fields;
  const N = w * h;
  const desertClass = (mx, my) => {
    if (!DN) return -1;
    const t = bil(temp, mx, my);
    if (t < -6) return -1;
    const ar = bil(aridity, mx, my);
    if (ar > 0.2) return -1;
    const n1 = fbm(DN.a, mx / (34 * S0), my / (34 * S0), 3);
    if (vegIndex(ar) + 0.55 * n1 > 1.85) return -1;
    const mm = bil(moist, mx, my), vS = vegIndex(mm);
    const n2 = fbm(DN.b, mx / (13 * S0), my / (13 * S0), 3);
    // Green banks where a river crosses the desert, and the oases.
    const bk = riverBank ? bil(riverBank, mx, my) : 0;
    if (bk > 0.22) return bk > 0.5 ? COVER.WOODLAND : COVER.GRASS;
    if (oases) for (const o of oases) {
      const d = Math.hypot(mx - o.x, my - o.y);
      if (d > o.r * 1.6) continue;
      const q = d / o.r + 0.45 * fbm(DN.oasis, mx / (0.9 * S0), my / (0.9 * S0), 3);
      if (q < 0.55) return COVER.WOODLAND;
      if (q < 1) return COVER.GRASS;
    }
    const eh = E(mx, my);
    if (scale >= 4 && dist && bil(dist, mx, my) < 1.3 && eh < 0.06) return COVER.SAND;
    // Rugged ground: high, or standing above its surroundings, or steep; a flat plateau stays sand.
    const em = bil(elevMid, mx, my);
    const slope = Math.abs(bil(elevMid, mx + 1, my) - bil(elevMid, mx - 1, my)) + Math.abs(bil(elevMid, mx, my + 1) - bil(elevMid, mx, my - 1));
    const rug = Math.max(em - 0.38, (em - bil(elevSoft, mx, my)) * 2.6, slope * 5 - 0.03) + 0.025 * fbm(DN.rock, mx / (9 * S0), my / (9 * S0), 2) + 0.01 * n2;
    if (eh + 0.04 * n2 > 0.6) return eh > 0.68 && t < -7 ? COVER.SNOW : COVER.ROCK;
    const shore = bank ? bil(bank, mx, my) : 0;
    if ((rug > 0.12 && shore < 0.03) || em + 0.04 * n2 > 0.5) return COVER.DRYROCK;
    // The wetter heights within a desert: smooth green, not shards.
    if (vS + 0.4 * n2 > 2.35) return vS > 3.2 ? COVER.WOODLAND : COVER.GRASS;
    // Salt flats: the floors of the dry basins that hold no lake.
    if (basins && vS < 1.3 && eh < 0.24 && slope < 0.01) {
      const b = bil(basins, mx, my) + 0.0012 * n2;
      if (b > 0.0024) return COVER.SALT;
    }
    // Dune seas, rippled, in the driest low sand: only in the finer tiles, and only a shade off the sand.
    if (scale >= 8 && vS < 0.7 && eh < 0.16) {
      const erg = fbm(DN.erg, mx / (40 * S0), my / (40 * S0), 2);
      if (erg > 0.12) {
        const u = (mx * dca + my * dsa) / (1.4 * S0) + 2.4 * fbm(nDune, mx / (8 * S0), my / (8 * S0), 2);
        if (Math.sin(u * Math.PI * 2) > 0.55 - 0.5 * smoothstep(0.12, 0.4, erg)) return COVER.DUNE;
      }
    }
    return vS + 0.85 * n1 + 0.15 * n2 < 0.95 ? COVER.DESERT : COVER.STEPPE;
  };
  const broadId = rasterMesh(broad, wx0, wy0, w, h), fineAId = rasterMesh(fineA, wx0, wy0, w, h);
  const fineBId = rasterMesh(fineB, wx0, wy0, w, h), tinyId = rasterMesh(tiny, wx0, wy0, w, h);
  const cover = new Uint8Array(N).fill(COVER.WATER);
  const ponds = new Uint8Array(N);
  const pondiness = style.ponds ?? 1;
  for (let ly = 0; ly < h; ly++) {
    const y = wy0 + ly;
    const y0 = Math.min(H0 - 1, Math.floor(y / scale));
    for (let lx = 0; lx < w; lx++) {
      const x = wx0 + lx;
      const i = ly * w + lx;
      const i0 = y0 * W0 + Math.min(W0 - 1, Math.floor(x / scale));
      const onLand = land[i0] === 1;
      if (!onLand && !(nearest && nearest[i0] >= 0)) continue;
      const mx = (x + 0.5) / scale, my = (y + 0.5) / scale;
      // Small lakes are water in the picture too, under their vector outlines.
      if (onLand && lakes && lakes(mx, my)) { cover[i] = COVER.WATER; continue; }
      // The About island and the polar land, each in its own manner (see polar.mjs); seamless across the wrap.
      if (aboutCover) { const c = aboutCover(mx, my); if (c >= 0) { cover[i] = c; continue; } }
      if (polarCover) { const c = polarCover(mx, my); if (c >= 0) { cover[i] = c; continue; } }
      if (ice && !onLand && ice[nearest[i0]]) continue;
      if (ice && ice[i0]) { cover[i] = COVER.SNOW; continue; }
      const b = broadId[i];
      const useA = broadPick[b] < 0.5;
      const mesh = useA ? fineA : fineB;
      const f = useA ? fineAId[i] : fineBId[i];
      // The facet's class comes from the climate at its centre, so the whole
      // facet is one colour. A facet centred in the sea reads its own pixel.
      let s = onLand ? i0 : nearest[i0];
      const fx = Math.floor(mesh.cx[f] / scale), fy = Math.floor(mesh.cy[f] / scale);
      if (fx >= 0 && fy >= 0 && fx < W0 && fy < H0 && land[fy * W0 + fx]) s = fy * W0 + fx;
      const jf = useA ? fineJA[f] : fineJB[f];
      const kf = useA ? fineKA[f] : fineKB[f];
      const t = temp[s], e = elev[s];
      // Jitter: broad patches drift a little; one facet in five jumps a class.
      let j = (broadJ[b] - 0.5) * 0.7;
      if (jf < 0.09) j -= 0.55 + kf * 0.9;
      else if (jf > 0.91) j += 0.55 + kf * 0.9;
      else j += (jf - 0.5) * 0.35;

      let m = moist[s];
      if (bank && bank[s] > 0.02) m += Math.min(0.5, bank[s] * 1.6);
      // ---- Deserts, in their own manner: broad smooth fields of pale sand and dry grass, darker warm grey-beige on
      // the rocky plateaus and mountains, near-white salt flats in the dry basins, dune ripples only close in, and
      // small green oases; no shards. ----
      if (onLand || nearest) {
        const desert = desertClass(mx, my);
        if (desert >= 0) {
          cover[i] = desert;
          if (onLand && urban && urban(mx, my, elev[i0])) cover[i] = COVER.URBAN;
          continue;
        }
      }
      let v = vegIndex(m);
      // Cold ground grows little: tundra reads as dry grass, then bare.
      // Cold ground: boreal forest gives way to tundra, a pale green (grass),
      // never desert; the cold is wet enough for that, as in the far north.
      if (t < -3) v = clamp(v, 2.05, Math.max(2.05, 4.6 + (t + 3) * 0.22));
      // Facets jump a class up or down, but green land never jumps to beige: a shard of steppe in a meadow reads as
      // a stain, where a shard of a darker or lighter green reads as texture.
      const v0 = v;
      v = clamp(v + j, 0, 4.999);
      if (v0 >= 2.15 && v < 2) v = 2 + (2 - v) * 0.3;
      let c = VEG_CLASS[Math.floor(v)];
      let glacier = false;

      // High ground: bare rock on the heights, snow on the coldest of them.
      const tj = t + (jf - 0.5) * 5 + (broadJ[b] - 0.5) * 3;
      const ej = e + (kf - 0.5) * 0.14 + (broadJ[b] - 0.5) * 0.05;
      // Snow and ice only on the highest, coldest peaks and on polar land;
      // elsewhere bare rock on the heights, and only a fleck of it on cold plains.
      if (ej > 0.5 || (ej > 0.36 && tj < -4)) c = COVER.ROCK;
      const polar = tj < -25;
      const peak = ej > 0.63 && tj < -7;
      if (polar || peak) c = !polar && kf > 0.78 ? COVER.ROCK : COVER.SNOW;
      else if (t < -11 && kf > 0.84) c = jf > 0.6 ? COVER.SNOW : COVER.ROCK;
      cover[i] = c;
      // Glaciers: tongues of ice down the valleys below snowy peaks, solid white.
      if (flow && c !== COVER.SNOW && onLand) {
        const fx = clamp(mx - 0.5, 0, W0 - 1.001), fy = clamp(my - 0.5, 0, H0 - 1.001), ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, w = fy - iy, k = iy * W0 + ix;
        const fl = flow[k] * (1 - u) * (1 - w) + flow[k + 1] * u * (1 - w) + flow[k + W0] * (1 - u) * w + flow[k + W0 + 1] * u * w;
        const eh = E(mx, my);
        if (fl > 2.2 * S0 && eh > 0.3 && t - 18 * (eh - elev[i0]) < -4 + 24 * (eh - 0.3)) { c = COVER.SNOW; cover[i] = c; glacier = true; }
      }
      // Sand: beaches on dry or warm coasts, and dune fields (ergs) in the driest desert, in long ripples.
      if (c === COVER.DESERT || c === COVER.STEPPE || c === COVER.GRASS) {
        const dd = dist ? dist[onLand ? i0 : (nearest ? nearest[i0] : i0)] : 9;
        // (Only in the finer tiles: the first picture stays plain, and small.)
        const beach = scale >= 4 && (dd <= 1 || !onLand) && (moist[s] < 0.34 || t > 18) && e < 0.06;
        let dune = false;
        if (scale >= 4 && c === COVER.DESERT && moist[s] < 0.06 && e < 0.26) {
          const u = (mx * dca + my * dsa) / (1.7 * S0) + 2.2 * fbm(nDune, mx / (9 * S0), my / (9 * S0), 2);
          dune = Math.sin(u * Math.PI * 2) > 0.15 + 0.6 * smoothstep(0.06, 0.02, -moist[s] + 0.08);
        }
        if (beach || dune) { c = COVER.SAND; cover[i] = c; }
      }
      if (onLand && urban && c !== COVER.SNOW && urban(mx, my, elev[i0])) { cover[i] = COVER.URBAN; continue; }
      if (shade && onLand) {
        // The rise toward the south-east, per map unit: land facing the
        // north-west is lit, land facing the south-east in shadow.
        const lit = (E(mx + 0.7, my) - E(mx - 0.7, my) + E(mx, my + 0.7) - E(mx, my - 0.7)) / 1.98;
        const jit = (tinyJ[tinyId[i]] - 0.5) * 0.0016;
        if (lit + jit < -0.0042) shade[i] = 1;
        else if (lit + jit > 0.0055) shade[i] = 2;
      }

      // The smallest facets: a scatter of slivers a class up or down, and
      // snow and rock broken up and mottled, so neither lies in solid blocks.
      const tf = tinyId[i];
      if (c === COVER.SNOW && !glacier) {
        const u = tinyJ[tf];
        if (u < (polar ? 0.12 : 0.42)) c = COVER.ROCK;
        cover[i] = c;
      } else if (c === COVER.ROCK) {
        const u = tinyJ[tf];
        if (u < 0.22 && ej < 0.62) c = VEG_CLASS[Math.max(0, Math.min(2, Math.floor(v)))];
        cover[i] = c;
      }
      if (c < COVER.ROCK) {
        const u = tinyJ[tf];
        if (u > 0.97) c = VEG_CLASS[Math.min(4, Math.floor(v) + 1)];
        else if (u > 0.94) c = VEG_CLASS[Math.max(Math.floor(v) >= 2 ? 2 : 0, Math.floor(v) - 1)];
        cover[i] = c;
      }

      // Flecks of water: many on cold wet lowland (a land of lakes), few elsewhere.
      const cool = smoothstep(9, 1, t) * smoothstep(-12, -4, t);
      const chance = (0.004 + 0.06 * cool * smoothstep(0.25, 0.6, moist[s])) * pondiness * smoothstep(0.22, 0.1, e);
      // (The scattered small lakes are vectors now, painted above; the land cover makes no water of its own.)
      void chance;
    }
  }
  return shade ? { cover, ponds, shade } : { cover, ponds };
}

// findOases({ land, elev, fields, hydro, dist, width, height, rng }) => [{ x, y, r }]
// A few springs in the deep desert, where what little water there is gathers: each a small green patch, and in time a
// village (see buildSettlements).
export function findOases({ land, elev, fields, hydro, dist, width, height, rng }) {
  const W = width, H = height, S = W / 1600;
  const r = rng.fork('oases');
  const { temp, moist } = fields;
  const cands = [];
  let desertPx = 0;
  for (let y = 4; y < H - 4; y += 4) for (let x = 4; x < W - 4; x += 4) {
    const i = y * W + x;
    if (!land[i] || hydro.lakes[i] || moist[i] > 0.07 || temp[i] < 8) continue;
    desertPx += 16;
    if (elev[i] > 0.24 || dist[i] < 10 * S || hydro.riverClass[i]) continue;
    cands.push({ x: x + 0.5, y: y + 0.5, s: Math.log(1 + hydro.acc[i]) + r.next() * 1.5 });
  }
  cands.sort((a, b) => b.s - a.s || a.x - b.x || a.y - b.y);
  const want = clamp(Math.round(desertPx / (22000 * S * S)), 0, 9);
  const out = [];
  for (const c of cands) {
    if (out.length >= want) break;
    if (out.some((o) => Math.hypot(o.x - c.x, o.y - c.y) < 45 * S)) continue;
    out.push({ x: c.x, y: c.y, r: (1.1 + r.next() * 1.6) * S });
  }
  return out;
}

// buildClimate({ elev, land, width, height, rng, style }) => { cover, ponds, temp, rain, moist }
// cover: a class index 0..6 per land pixel, 255 for the sea.
export function buildClimate(opts) {
  const fields = buildFields(opts);
  const { cover, ponds } = classifyCover({ ...opts, fields });
  return { cover, ponds, ...fields };
}

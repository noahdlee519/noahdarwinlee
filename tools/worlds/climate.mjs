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

export const COVER = { FOREST: 0, WOODLAND: 1, GRASS: 2, STEPPE: 3, DESERT: 4, ROCK: 5, SNOW: 6, WATER: 255 };

// Sea-level temperature in °C at a latitude.
export function seaLevelTemp(lat) {
  return 29 - 44 * Math.abs(Math.sin((lat * Math.PI) / 180)) ** 2.5;
}

// Rain a latitude gets before the land has its say: wet at the equator, dry
// in the subtropics, wet again in the middle latitudes, dry at the poles.
function zonalRain(lat) {
  const a = Math.abs(lat);
  const z = 0.24 + 0.8 * Math.exp(-((a / 12) ** 2)) + 0.52 * Math.exp(-(((a - 50) / 15) ** 2)) - 0.2 * Math.exp(-(((a - 26) / 9) ** 2));
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

// A mesh of jittered triangles over the map: { id: Int32Array per pixel, cx, cy }.
// `step` is the lattice spacing, `stretch` how long the facets are for their
// width, `angle` the way they lean.
function facetMesh(rng, W, H, step, stretch, angle) {
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
  const id = new Int32Array(W * H).fill(-1);
  const cx = [], cy = [];
  const fill = (x0, y0, x1, y1, x2, y2) => {
    const tri = cx.length;
    cx.push((x0 + x1 + x2) / 3); cy.push((y0 + y1 + y2) / 3);
    const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2))), maxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2))), maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
    if (minX > maxX || minY > maxY) return;
    let area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (area === 0) return;
    const sgn = area > 0 ? 1 : -1;
    const eps = -1e-3;
    for (let y = minY; y <= maxY; y++) {
      const py = y + 0.5;
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const w0 = ((x1 - x0) * (py - y0) - (y1 - y0) * (px - x0)) * sgn;
        if (w0 < eps) continue;
        const w1 = ((x2 - x1) * (py - y1) - (y2 - y1) * (px - x1)) * sgn;
        if (w1 < eps) continue;
        const w2 = ((x0 - x2) * (py - y2) - (y0 - y2) * (px - x2)) * sgn;
        if (w2 < eps) continue;
        id[y * W + x] = tri;
      }
    }
  };
  for (let j = 0; j < nj - 1; j++) for (let i = 0; i < ni - 1; i++) {
    const a = j * ni + i, b = a + 1, c = a + ni, d = c + 1;
    // Split each cell along one diagonal or the other.
    if (rng.chance(0.5)) {
      fill(vx[a], vy[a], vx[b], vy[b], vx[d], vy[d]);
      fill(vx[a], vy[a], vx[d], vy[d], vx[c], vy[c]);
    } else {
      fill(vx[a], vy[a], vx[b], vy[b], vx[c], vy[c]);
      fill(vx[b], vy[b], vx[d], vy[d], vx[c], vy[c]);
    }
  }
  // Any pixel the triangles' edges missed takes its neighbour's facet.
  for (let i = 0; i < W * H; i++) if (id[i] < 0) id[i] = i > 0 && id[i - 1] >= 0 ? id[i - 1] : 0;
  return { id, cx: Float32Array.from(cx), cy: Float32Array.from(cy), count: cx.length };
}

// Moisture to a position on the scale desert 0 | steppe 1 | grass 2 | woodland 3 | forest 4 (to 5).
const STOPS = [0, 0.1, 0.2, 0.36, 0.56, 1.2];
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
export function classifyCover({ fields, elev, land, width, height, rng, style = {}, water, scale = 1, bleed = 0 }) {
  const W0 = width, H0 = height;
  const W = Math.round(W0 * scale), H = Math.round(H0 * scale), N = W * H;
  const S = W / 1600;
  const r = rng.fork ? rng.fork('cover') : rng;
  const { temp, moist } = fields;

  // Three meshes: broad patches, and two sets of thin shards leaning different ways.
  const lean = r.range(0, Math.PI);
  const broad = facetMesh(r, W, H, 23 * S, 1.25, lean + 0.6);
  const fineA = facetMesh(r, W, H, 8.5 * S, 1.45, lean);
  const fineB = facetMesh(r, W, H, 8.5 * S, 1.45, lean + 1.25);
  const tiny = facetMesh(r, W, H, 5 * S, 1.6, lean + 2.2);
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

  const cover = new Uint8Array(N).fill(COVER.WATER);
  const ponds = new Uint8Array(N);
  const pondiness = style.ponds ?? 1;
  for (let y = 0; y < H; y++) {
    const y0 = Math.min(H0 - 1, Math.floor(y / scale));
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const i0 = y0 * W0 + Math.min(W0 - 1, Math.floor(x / scale));
      const onLand = land[i0] === 1;
      if (!onLand && !(nearest && nearest[i0] >= 0)) continue;
      const b = broad.id[i];
      const useA = broadPick[b] < 0.5;
      const mesh = useA ? fineA : fineB;
      const f = mesh.id[i];
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
      let v = vegIndex(m);
      // Cold ground grows little: tundra reads as dry grass, then bare.
      // Cold ground: boreal forest gives way to tundra, a pale green (grass),
      // never desert; the cold is wet enough for that, as in the far north.
      if (t < -3) v = clamp(v, 2.05, Math.max(2.05, 4.6 + (t + 3) * 0.22));
      v = clamp(v + j, 0, 4.999);
      let c = VEG_CLASS[Math.floor(v)];

      // High ground: bare rock on the heights, snow on the coldest of them.
      const tj = t + (jf - 0.5) * 5 + (broadJ[b] - 0.5) * 3;
      const ej = e + (kf - 0.5) * 0.14 + (broadJ[b] - 0.5) * 0.05;
      // Snow and ice only on the highest, coldest peaks and on polar land;
      // elsewhere bare rock on the heights, and only a fleck of it on cold plains.
      if (ej > 0.5 || (ej > 0.36 && tj < -4)) c = COVER.ROCK;
      const polar = tj < -25;
      const peak = ej > 0.6 && tj < -6;
      if (polar || peak) c = !polar && kf > 0.78 ? COVER.ROCK : COVER.SNOW;
      else if (t < -11 && kf > 0.84) c = jf > 0.6 ? COVER.SNOW : COVER.ROCK;
      cover[i] = c;

      // The smallest facets: a scatter of slivers a class up or down, and
      // snow and rock broken up and mottled, so neither lies in solid blocks.
      const tf = tiny.id[i];
      if (c === COVER.SNOW) {
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
        else if (u > 0.94) c = VEG_CLASS[Math.max(0, Math.floor(v) - 1)];
        cover[i] = c;
      }

      // Flecks of water: many on cold wet lowland (a land of lakes), few elsewhere.
      const cool = smoothstep(9, 1, t) * smoothstep(-12, -4, t);
      const chance = (0.004 + 0.06 * cool * smoothstep(0.25, 0.6, moist[s])) * pondiness * smoothstep(0.22, 0.1, e);
      if (onLand && tinyJ[tf] < chance && c !== COVER.SNOW && c !== COVER.DESERT) ponds[i] = 1;
    }
  }
  return { cover, ponds, width: W, height: H };
}

// buildClimate({ elev, land, width, height, rng, style }) => { cover, ponds, temp, rain, moist }
// cover: a class index 0..6 per land pixel, 255 for the sea.
export function buildClimate(opts) {
  const fields = buildFields(opts);
  const { cover, ponds } = classifyCover({ ...opts, fields });
  return { cover, ponds, ...fields };
}

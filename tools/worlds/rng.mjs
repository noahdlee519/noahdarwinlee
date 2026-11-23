// Seeded random numbers and 2-D noise for the world generator.
// Everything a world is made of comes from a string seed, so the same
// seed always gives the same world.

// xmur3: a string to a stream of 32-bit hashes.
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

// makeRng(seed) => { next(), int(n), pick(arr), range(a, b), chance(p), shuffle(arr), fork(label) }
export function makeRng(seed) {
  const key = String(seed);
  const h = xmur3(key);
  let a = h(), b = h(), c = h(), d = h();
  // sfc32
  const next = () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  for (let i = 0; i < 12; i++) next();
  const rng = {
    next,
    int: (n) => Math.floor(next() * n),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    range: (lo, hi) => lo + (hi - lo) * next(),
    chance: (p) => next() < p,
    shuffle: (arr) => {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const t = out[i]; out[i] = out[j]; out[j] = t;
      }
      return out;
    },
    // An independent stream, so one stage of the generator can change how
    // many numbers it draws without disturbing the stages after it.
    fork: (label) => makeRng(key + '/' + label),
  };
  return rng;
}

// makeNoise(rng) => (x, y) => number in about [-1, 1]. Gradient (Perlin)
// noise with sixteen gradient directions and a quintic fade.
export function makeNoise(rng) {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = rng.int(i + 1);
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const gx = new Float64Array(16), gy = new Float64Array(16);
  const turn = rng.next() * Math.PI * 2;
  for (let i = 0; i < 16; i++) {
    gx[i] = Math.cos(turn + (i * Math.PI) / 8);
    gy[i] = Math.sin(turn + (i * Math.PI) / 8);
  }
  const SCALE = 1.5;
  return (x, y) => {
    const xf = Math.floor(x), yf = Math.floor(y);
    const xi = xf & 255, yi = yf & 255;
    const dx = x - xf, dy = y - yf;
    const u = dx * dx * dx * (dx * (dx * 6 - 15) + 10);
    const v = dy * dy * dy * (dy * (dy * 6 - 15) + 10);
    const a = perm[xi] + yi, b = perm[xi + 1] + yi;
    const g00 = perm[a] & 15, g10 = perm[b] & 15;
    const g01 = perm[a + 1] & 15, g11 = perm[b + 1] & 15;
    const n00 = gx[g00] * dx + gy[g00] * dy;
    const n10 = gx[g10] * (dx - 1) + gy[g10] * dy;
    const n01 = gx[g01] * dx + gy[g01] * (dy - 1);
    const n11 = gx[g11] * (dx - 1) + gy[g11] * (dy - 1);
    const nx0 = n00 + u * (n10 - n00);
    const nx1 = n01 + u * (n11 - n01);
    const n = (nx0 + v * (nx1 - nx0)) * SCALE;
    return n < -1 ? -1 : n > 1 ? 1 : n;
  };
}

// Fractal Brownian motion: octaves of noise, each finer and fainter.
// Normalised so the result stays in about [-1, 1].
export function fbm(noise, x, y, octaves = 5, lacunarity = 2, gain = 0.5) {
  let sum = 0, amp = 1, norm = 0, f = 1;
  for (let o = 0; o < octaves; o++) {
    // Offsets keep the octaves from lining up at the origin.
    sum += amp * noise(x * f + o * 17.31, y * f - o * 9.73);
    norm += amp;
    amp *= gain;
    f *= lacunarity;
  }
  return sum / norm;
}

// Ridged noise in [0, 1]: sharp crests where the noise crosses zero.
export function ridged(noise, x, y, octaves = 5, lacunarity = 2, gain = 0.5) {
  let sum = 0, amp = 1, norm = 0, f = 1, prev = 1;
  for (let o = 0; o < octaves; o++) {
    let r = 1 - Math.abs(noise(x * f + o * 31.7, y * f + o * 12.9));
    r *= r;
    sum += amp * r * prev;
    norm += amp;
    prev = 0.4 + 0.6 * r;
    amp *= gain;
    f *= lacunarity;
  }
  return sum / norm;
}

// Domain warp: push a point about by two noises, so shapes built on it
// bend and fold instead of sitting on a grid.
export function warp(noiseA, noiseB, x, y, scale, amount) {
  return [
    x + amount * noiseA(x / scale, y / scale),
    y + amount * noiseB(x / scale + 5.2, y / scale - 3.7),
  ];
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

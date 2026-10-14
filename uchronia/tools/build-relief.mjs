import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, renameSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const modules = resolve(process.argv[2] || "node_modules");
const cache = resolve(process.argv[3] || "terrarium");
const zoom = +(process.argv[4] || 5);
const output = resolve(process.argv[5] || resolve(here, "../data/relief-4096.webp"));
const quality = +(process.argv[6] || 90);
const require = createRequire(resolve(modules, "x.js"));
const sharp = require("sharp");
const { PNG } = require("pngjs");

const W = 4096, H = 2048, SS = 2, WS = W * SS, HS = H * SS;
const R = 6371008.8;
const FINE = { exaggerate: 8, weight: 0.6 };
const COARSE = { exaggerate: 25, weight: 0.8, radius: 6 };
const GAIN = 4.2;
const LIFT = 1.6;
const LIGHTS = [
  { az: 315, alt: 45, w: 0.6 },
  { az: 0, alt: 45, w: 0.2 },
  { az: 270, alt: 45, w: 0.2 },
];
const FADE = [80, 84.5];
const SOURCE = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium";
const N = 1 << zoom, T = 256, M = N * T;

const fetchTile = async (x, y) => {
  const file = resolve(cache, String(zoom), String(x), y + ".png");
  if (existsSync(file) && statSync(file).size > 0) return readFileSync(file);
  mkdirSync(dirname(file), { recursive: true });
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(`${SOURCE}/${zoom}/${x}/${y}.png`);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      PNG.sync.read(buf);
      writeFileSync(file + ".part", buf);
      renameSync(file + ".part", file);
      return buf;
    } catch (e) {
      if (attempt >= 5) throw new Error(`tile ${zoom}/${x}/${y}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
};

const mosaic = new Float32Array(M * M);
const jobs = [];
for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) jobs.push([x, y]);
let next = 0, done = 0;
const worker = async () => {
  while (next < jobs.length) {
    const [tx, ty] = jobs[next++];
    const png = PNG.sync.read(await fetchTile(tx, ty));
    if (png.width !== T || png.height !== T) throw new Error(`tile ${zoom}/${tx}/${ty} is ${png.width}x${png.height}`);
    const d = png.data;
    for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) {
      const k = (j * T + i) * 4;
      mosaic[(ty * T + j) * M + tx * T + i] = Math.max(0, d[k] * 256 + d[k + 1] + d[k + 2] / 256 - 32768);
    }
    if (++done % 128 === 0) console.log("tiles", done, "/", jobs.length);
  }
};
await Promise.all(Array.from({ length: 8 }, worker));

const sample = (mx, my) => {
  const fx = mx - 0.5, fy = Math.min(M - 1, Math.max(0, my - 0.5));
  const x0 = Math.floor(fx), y0 = Math.min(M - 2, Math.floor(fy));
  const ax = fx - x0, ay = fy - y0;
  const xa = ((x0 % M) + M) % M, xb = (xa + 1) % M;
  const r0 = y0 * M, r1 = r0 + M;
  return (mosaic[r0 + xa] * (1 - ax) + mosaic[r0 + xb] * ax) * (1 - ay) + (mosaic[r1 + xa] * (1 - ax) + mosaic[r1 + xb] * ax) * ay;
};

const LIMIT = Math.atan(Math.sinh(Math.PI)) * 180 / Math.PI;
const elev = new Float32Array(WS * HS);
const lat = new Float64Array(HS);
for (let r = 0; r < HS; r++) {
  lat[r] = 90 - (r + 0.5) * 180 / HS;
  const phi = Math.max(-LIMIT, Math.min(LIMIT, lat[r])) * Math.PI / 180;
  const my = (1 - Math.log(Math.tan(Math.PI / 4 + phi / 2)) / Math.PI) / 2 * M;
  for (let c = 0; c < WS; c++) elev[r * WS + c] = sample(((c + 0.5) / WS) * M, my);
}

const lights = LIGHTS.map(({ az, alt, w }) => {
  const a = az * Math.PI / 180, h = alt * Math.PI / 180;
  return [Math.cos(h) * Math.sin(a) * w, Math.cos(h) * Math.cos(a) * w, Math.sin(h) * w];
});
const flat = lights.reduce((s, l) => s + l[2], 0);
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

const blur = (src, radius, passes) => {
  let a = Float32Array.from(src), b = new Float32Array(src.length);
  for (let p = 0; p < passes; p++) {
    for (let r = 0; r < HS; r++) {
      const rx = Math.min(WS / 8, Math.round(radius / Math.max(0.1, Math.cos(lat[r] * Math.PI / 180)))), row = r * WS, n = 2 * rx + 1;
      let s = 0;
      for (let i = -rx; i <= rx; i++) s += a[row + (i + WS) % WS];
      for (let c = 0; c < WS; c++) {
        b[row + c] = s / n;
        s += a[row + (c + rx + 1) % WS] - a[row + (c - rx + WS) % WS];
      }
    }
    for (let c = 0; c < WS; c++) {
      let s = 0;
      for (let i = -radius; i <= radius; i++) s += b[Math.min(HS - 1, Math.max(0, i)) * WS + c];
      for (let r = 0; r < HS; r++) {
        a[r * WS + c] = s / (2 * radius + 1);
        s += b[Math.min(HS - 1, r + radius + 1) * WS + c] - b[Math.max(0, r - radius) * WS + c];
      }
    }
  }
  return a;
};

const dy = Math.PI * R / HS;
const hillshade = (grid, exaggerate, weight, target, mask) => {
  for (let r = 0; r < HS; r++) {
    const fade = 1 - smooth(FADE[0], FADE[1], Math.abs(lat[r]));
    if (fade <= 0) continue;
    const dx = 2 * Math.PI * R * Math.cos(lat[r] * Math.PI / 180) / WS;
    const up = Math.max(0, r - 1) * WS, down = Math.min(HS - 1, r + 1) * WS, row = r * WS;
    const sy = (r === 0 || r === HS - 1 ? 1 : 2) * dy;
    for (let c = 0; c < WS; c++) {
      if (!mask[row + c]) continue;
      const ge = exaggerate * (grid[row + (c + 1) % WS] - grid[row + (c + WS - 1) % WS]) / (2 * dx);
      const gn = exaggerate * (grid[up + c] - grid[down + c]) / sy;
      const len = Math.sqrt(ge * ge + gn * gn + 1);
      let s = 0;
      for (const l of lights) s += (-ge * l[0] - gn * l[1] + l[2]) / len;
      target[row + c] += weight * (s - flat) * fade;
    }
  }
};

const land = new Uint8Array(WS * HS);
for (let r = 0; r < HS; r++) {
  const up = Math.max(0, r - 1) * WS, down = Math.min(HS - 1, r + 1) * WS, row = r * WS;
  for (let c = 0; c < WS; c++) {
    const z = elev[row + c], zl = elev[row + (c + WS - 1) % WS], zr = elev[row + (c + 1) % WS], zu = elev[up + c], zd = elev[down + c];
    land[row + c] = z > 0 && !(z === zl && z === zr && z === zu && z === zd) ? 1 : 0;
  }
}
const shade = new Float32Array(WS * HS);
const dry = new Float32Array(WS * HS);
for (let i = 0; i < WS * HS; i++) dry[i] = elev[i] > 0 ? 1 : 0;
const broad = blur(elev, COARSE.radius, 3), share = blur(dry, COARSE.radius, 3);
for (let i = 0; i < WS * HS; i++) broad[i] = share[i] > 1e-3 ? broad[i] / share[i] : 0;
hillshade(broad, COARSE.exaggerate, COARSE.weight, shade, land);
for (let i = 0; i < WS * HS; i++) if (elev[i] <= 0) elev[i] = broad[i];
hillshade(elev, FINE.exaggerate, FINE.weight, shade, land);

const out = Buffer.alloc(W * H * 3);
let lo = 255, hi = 0;
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  let s = 0;
  for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) s += shade[(r * SS + j) * WS + c * SS + i];
  const d = s / (SS * SS);
  const v = Math.round(128 + 127 * Math.tanh(GAIN * (d > 0 ? LIFT * d : d)));
  lo = Math.min(lo, v); hi = Math.max(hi, v);
  const k = (r * W + c) * 3;
  out[k] = out[k + 1] = out[k + 2] = v;
}

mkdirSync(dirname(output), { recursive: true });
await sharp(out, { raw: { width: W, height: H, channels: 3 } }).webp({ quality, effort: 6, smartSubsample: false }).toFile(output);
console.log("relief:", W + "x" + H, "from zoom", zoom, "tiles; values", lo + "-" + hi + ";", Math.round(statSync(output).size / 1024), "KB at quality", quality, "->", output);

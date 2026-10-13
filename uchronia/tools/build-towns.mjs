import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(process.argv[2] || "cities.pbf");
const MIN_POP = +(process.argv[3] || 5000);
const buf = readFileSync(source);

let pos = 0;
const varint = () => {
  let v = 0, mul = 1, b;
  do { b = buf[pos++]; v += (b & 0x7f) * mul; mul *= 128; } while (b & 0x80);
  return v;
};
const svarint = () => { const v = varint(); return v % 2 ? -(v + 1) / 2 : v / 2; };
const text = (n) => { const s = buf.toString("utf8", pos, pos + n); pos += n; return s; };

const all = [];
let lon = 0, lat = 0;
while (pos < buf.length) {
  const end = varint() + pos;
  const c = { name: "", alt: "", country: "", code: "", pop: 0, lon: 0, lat: 0 };
  while (pos < end) {
    const key = varint(), tag = key >> 3, type = key & 7;
    if (tag === 10) { lon += svarint(); c.lon = lon / 1e5; }
    else if (tag === 11) { lat += svarint(); c.lat = lat / 1e5; }
    else if (tag === 9) c.pop = varint();
    else if (tag === 1) svarint();
    else if (type === 2) { const s = text(varint()); if (tag === 2) c.name = s; else if (tag === 3) c.country = s; else if (tag === 4) c.alt = s; else if (tag === 7) c.code = s; }
    else if (type === 0) varint();
    else throw new Error("unexpected field " + tag + "/" + type);
  }
  all.push(c);
}

const cities = JSON.parse(readFileSync(resolve(here, "../data/cities.json"), "utf8"));
const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const km = (a, b) => {
  const r = Math.PI / 180, dl = (b[0] - a[0]) * r, p1 = a[1] * r, p2 = b[1] * r;
  const h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
};
const grid = new Map();
const cell = (x, y) => Math.floor((x + 180) / 1) * 1000 + Math.floor((y + 90) / 1);
const near = (p) => {
  const out = [], gx = Math.floor(p[0] + 180), gy = Math.floor(p[1] + 90);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) (grid.get((gx + dx) * 1000 + gy + dy) || []).forEach((q) => out.push(q));
  return out;
};
const add = (q) => { const k = cell(q.p[0], q.p[1]); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(q); };
cities.forEach((r) => add({ p: [r[1], r[2]], n: fold(r[0]), big: true }));

const latin = (s) => /^[\u0000-\u024F\u1E00-\u1EFF'’ .,()-]+$/.test(s);
all.forEach((c) => { if (!latin(c.name)) c.name = latin(c.alt) ? c.alt : ""; });
const kept = [];
all.filter((c) => c.pop >= MIN_POP && /^PPL/.test(c.code) && c.code !== "PPLX" && c.code !== "PPLH" && c.code !== "PPLQ" && c.name)
  .sort((a, b) => b.pop - a.pop)
  .forEach((c) => {
    const p = [c.lon, c.lat], n = fold(c.name);
    const clash = near(p).some((q) => { const d = km(p, q.p); return d < (q.big ? 6 : 2.5) || (q.n === n && d < 40); });
    if (clash) return;
    add({ p, n, big: false });
    kept.push([c.name, +c.lon.toFixed(3), +c.lat.toFixed(3), Math.round(c.pop / 1000)]);
  });

writeFileSync(resolve(here, "../data/towns.json"), "[" + kept.map((r) => JSON.stringify(r)).join(",\n") + "]\n");
console.log(all.length + " places, " + kept.length + " towns of " + MIN_POP + " or more kept");

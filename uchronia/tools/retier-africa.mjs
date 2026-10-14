import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(process.argv[2] || "cities.pbf");
const buf = readFileSync(source);
let pos = 0;
const varint = () => { let v = 0, mul = 1, b; do { b = buf[pos++]; v += (b & 0x7f) * mul; mul *= 128; } while (b & 0x80); return v; };
const svarint = () => { const v = varint(); return v % 2 ? -(v + 1) / 2 : v / 2; };
const text = (n) => { const s = buf.toString("utf8", pos, pos + n); pos += n; return s; };
const places = [];
let lon = 0, lat = 0;
while (pos < buf.length) {
  const end = varint() + pos;
  const c = { names: [], cc: "", pop: 0, lon: 0, lat: 0 };
  while (pos < end) {
    const key = varint(), tag = key >> 3, type = key & 7;
    if (tag === 10) { lon += svarint(); c.lon = lon / 1e5; }
    else if (tag === 11) { lat += svarint(); c.lat = lat / 1e5; }
    else if (tag === 9) c.pop = varint();
    else if (tag === 1) svarint();
    else if (type === 2) { const s = text(varint()); if (tag === 2 || tag === 4) c.names.push(s); else if (tag === 3) c.cc = s; }
    else if (type === 0) varint();
  }
  places.push(c);
}

const AFRICA = new Set("DZ AO BJ BW BF BI CV CM CF TD KM CD CG CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG EH ZM ZW".split(" "));
const TOP = new Set(["Cairo", "Lagos", "Kinshasa", "Luanda", "Dar es Salaam", "Johannesburg", "Khartoum", "Abidjan", "Addis Ababa", "Nairobi"]);
const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const km = (a, b) => {
  const r = Math.PI / 180, dl = (b[0] - a[0]) * r, p1 = a[1] * r, p2 = b[1] * r;
  const h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
};

const file = resolve(here, "../data/cities.json");
const cities = JSON.parse(readFileSync(file, "utf8"));
const changed = [];
cities.forEach((row) => {
  const [name, x, y, tier] = row, n = fold(name);
  let best = null;
  for (const p of places) {
    if (Math.abs(p.lat - y) > 0.5 || Math.abs(p.lon - x) > 0.7) continue;
    if (!p.names.some((m) => fold(m) === n)) continue;
    const d = km([x, y], [p.lon, p.lat]);
    if (d < 30 && (!best || p.pop > best.pop)) best = p;
  }
  if (!best || !AFRICA.has(best.cc)) return;
  const want = TOP.has(name) ? 1 : best.pop >= 1500000 ? 2 : best.pop >= 800000 ? 3 : tier;
  if (want < tier) { changed.push(name + " " + tier + "→" + want); row[3] = want; }
});
writeFileSync(file, "[" + cities.map((r) => JSON.stringify(r)).join(",") + "]");
console.log(changed.length + " African cities raised: " + changed.join(", "));

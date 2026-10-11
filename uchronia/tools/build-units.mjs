import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const modules = resolve(process.argv[2] || "node_modules");
const input = resolve(process.argv[3] || "ne_10m_admin_1_states_provinces_lakes.geojson");
const rest = process.argv.slice(4);
const numbers = rest.filter((a) => /^[\d.]+$/.test(a)), keep = +(numbers[0] || 0.1), keepDetail = +(numbers[1] || 0.6);
const files = new Map(rest.filter((a) => !/^[\d.]+$/.test(a)).map((a) => [basename(a), resolve(a)]));
const require = createRequire(resolve(modules, "x.js"));
const server = require("topojson-server");
const client = require("topojson-client");
const simplify = require("topojson-simplify");
const d3 = require("d3-geo");
const CL = require("clipper-lib");
const { areaList } = require("@vant/area-data");
const { pinyin } = require("pinyin-pro");

const EARTH = 6371.0088;
const MIN_ISLAND_KM2 = 12;
const MIN_UNIT_KM2 = 1;
const FRAGMENT_KM2 = 2;
const SMALL_PART_KM2 = 0.5;
const SCALE = 1e6;
const STEP = 20000;
const TOL = 4;

const RENAME = {
  USA: "United States", TZA: "Tanzania", SRB: "Serbia", COD: "DR Congo", COG: "Congo", MKD: "North Macedonia",
  SWZ: "Eswatini", CZE: "Czechia", BHS: "Bahamas", GNB: "Guinea-Bissau", SDS: "South Sudan", HKG: "Hong Kong",
  MAC: "Macau", PSX: "Palestine", FSM: "Micronesia", TLS: "Timor-Leste", ALD: "Åland", PGA: "Spratly Islands",
  SGS: "South Georgia", VAT: "Vatican City", BLM: "Saint Barthélemy", STP: "São Tomé and Príncipe",
  USG: "Guantánamo Bay", UMI: "US Minor Outlying Islands", ESB: "Dhekelia", WSB: "Akrotiri", KAS: "Siachen Glacier",
  CIV: "Ivory Coast", CPV: "Cape Verde",
};
const FOLD = { KAB: "KAZ" };
const PROVINCE_NAME = { "RU-ALT": "Altai Krai" };

const kmArea = (geom) => { const a = d3.geoArea(geom); return Math.min(a, 4 * Math.PI - a) * EARTH * EARTH; };
const need = (name) => { if (!files.has(name)) throw new Error("missing source file " + name); return files.get(name); };
const readJSON = (name) => JSON.parse(readFileSync(need(name), "utf8"));

const geo = JSON.parse(readFileSync(input, "utf8"));
const countries = new Map();
const parents = [];
for (const f of geo.features) {
  if (!f.geometry) continue;
  const p = f.properties;
  const code = FOLD[p.adm0_a3] || p.adm0_a3;
  if (!countries.has(code)) countries.set(code, RENAME[code] || (FOLD[p.adm0_a3] ? null : p.admin));
  if (countries.get(code) === null) countries.set(code, p.admin);
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  const areas = polys.map((c) => kmArea({ type: "Polygon", coordinates: c }));
  const biggest = areas.indexOf(Math.max(...areas));
  parents.push({ n: PROVINCE_NAME[p.iso_3166_2] || p.name_en || p.name || RENAME[code] || p.admin, c: code, geo: polys.filter((c, i) => i === biggest || areas[i] >= MIN_ISLAND_KM2) });
}
for (const [code, name] of countries) if (!name) countries.set(code, code);

const reference = JSON.parse(readFileSync(resolve(here, "../data/provinces.json"), "utf8"));
const provinces = reference.objects.provinces.geometries.map((g) => ({ n: g.properties.n, c: g.properties.c }));
const listed = [...countries].map(([c, n]) => ({ c, n })).sort((a, b) => a.n.localeCompare(b.n));
if (provinces.length !== parents.length || provinces.some((q, i) => q.n !== parents[i].n || q.c !== parents[i].c)) throw new Error("the provinces differ from data/provinces.json");
if (JSON.stringify(listed) !== JSON.stringify(reference.countries)) throw new Error("the countries differ from data/provinces.json");

const RAD = Math.PI / 180 / SCALE;
const signed = (r) => {
  let s = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[i][0] - r[j][0]) * (Math.sin(r[i][1] * RAD) + Math.sin(r[j][1] * RAD));
  return (-s / 2) * RAD * EARTH * EARTH;
};
const area = (mp) => mp.reduce((s, poly) => s + poly.reduce((t, r, i) => t + (i ? -1 : 1) * Math.abs(signed(r)), 0), 0);
const box = (mp) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const poly of mp) for (const [x, y] of poly[0]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
};
const hit = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
const top = (m) => { let k = -1, v = -Infinity; for (const [a, b] of m) if (b > v || (b === v && a < k)) { k = a; v = b; } return k; };
const ints = (geom) => (geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates).map((poly) => poly.map((ring) => {
  const r = ring.map(([x, y]) => [Math.round(x * SCALE), Math.round(y * SCALE)]);
  if (r.length > 1 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1]) r.pop();
  return r;
}));
const shoelace = (r) => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]); return s / 2; };
const inside = (ring, x, y) => {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const interior = (ring) => {
  let y0 = Infinity, y1 = -Infinity;
  for (const [, y] of ring) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const y = Math.floor((y0 + y1) / 2) + 0.5, xs = [];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y) xs.push(((xj - xi) * (y - yi)) / (yj - yi) + xi);
  }
  xs.sort((a, b) => a - b);
  let best = 0;
  for (let i = 2; i + 1 < xs.length; i += 2) if (xs[i + 1] - xs[i] > xs[best + 1] - xs[best]) best = i;
  return [(xs[best] + xs[best + 1]) / 2, y];
};
function run(type, subject, other) {
  const c = new CL.Clipper();
  for (const [mps, role] of [[subject, CL.PolyType.ptSubject], [other || [], CL.PolyType.ptClip]])
    for (const mp of mps) for (const poly of mp) poly.forEach((ring, i) => {
      if (ring.length < 3) return;
      const path = ring.map(([X, Y]) => ({ X, Y }));
      if ((shoelace(ring) > 0) === (i > 0)) path.reverse();
      c.AddPath(path, role, true);
    });
  const solution = new CL.Paths(), outers = [], holes = [];
  c.Execute(type, solution, CL.PolyFillType.pftNonZero, CL.PolyFillType.pftNonZero);
  for (const path of solution) if (path.length > 2) (CL.Clipper.Orientation(path) ? outers : holes).push(path.map((q) => [q.X, q.Y]));
  const polys = outers.map((r) => ({ rings: [r], bb: box([[r]]), a: Math.abs(shoelace(r)) }));
  for (const h of holes) {
    const hb = box([[h]]), [x, y] = interior(h);
    let best = null;
    for (const o of polys) if (o.bb[0] <= hb[0] && o.bb[1] <= hb[1] && o.bb[2] >= hb[2] && o.bb[3] >= hb[3] && (!best || o.a < best.a) && inside(o.rings[0], x, y)) best = o;
    if (best) best.rings.push(h);
  }
  return polys.map((o) => o.rings);
}
const crop = (mp, [x0, y0, x1, y1]) => mp.map((poly) => poly.map((ring) => {
  let r = ring;
  for (const [axis, limit, below] of [[0, x0 - 1000, false], [0, x1 + 1000, true], [1, y0 - 1000, false], [1, y1 + 1000, true]]) {
    const out = [];
    r.forEach((a, i) => {
      const b = r[(i + 1) % r.length], ina = below ? a[axis] <= limit : a[axis] >= limit, inb = below ? b[axis] <= limit : b[axis] >= limit;
      if (ina) out.push(a);
      if (ina !== inb) { const p = [0, 0]; p[axis] = limit; p[1 - axis] = Math.round(a[1 - axis] + ((limit - a[axis]) / (b[axis] - a[axis])) * (b[1 - axis] - a[1 - axis])); out.push(p); }
    });
    r = out;
  }
  return r;
})).filter((poly) => poly[0].length > 2).map((poly) => poly.filter((r) => r.length > 2));
const union = (...mps) => run(CL.ClipType.ctUnion, mps);
const intersect = (a, b) => run(CL.ClipType.ctIntersection, [a], [b]);
const minus = (a, ...bs) => run(CL.ClipType.ctDifference, [a], bs);

const cellKey = (gx, gy) => (gx + 50000) * 100000 + gy + 50000;
function edgeIndex(mps, size) {
  const grid = new Map();
  mps.forEach((mp, k) => {
    for (const poly of mp) for (const ring of poly) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [ax, ay] = ring[j], [bx, by] = ring[i], seg = [ax, ay, bx, by, k];
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) / size));
      for (let s = 0; s < n; s++) {
        const x0 = ax + ((bx - ax) * s) / n, y0 = ay + ((by - ay) * s) / n, x1 = ax + ((bx - ax) * (s + 1)) / n, y1 = ay + ((by - ay) * (s + 1)) / n;
        for (let gx = Math.floor((Math.min(x0, x1) - 2) / size); gx <= Math.floor((Math.max(x0, x1) + 2) / size); gx++)
          for (let gy = Math.floor((Math.min(y0, y1) - 2) / size); gy <= Math.floor((Math.max(y0, y1) + 2) / size); gy++) {
            const key = cellKey(gx, gy), l = grid.get(key);
            if (!l) grid.set(key, [seg]); else if (l[l.length - 1] !== seg) l.push(seg);
          }
      }
    }
  });
  return { grid, size };
}
function onEdge({ grid, size }, x, y, skip) {
  const l = grid.get(cellKey(Math.floor(x / size), Math.floor(y / size)));
  let best = -1, bd = TOL * TOL;
  if (l) for (const [ax, ay, bx, by, k] of l) {
    if (k === skip) continue;
    const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    const ex = ax + t * dx - x, ey = ay + t * dy - y, d = ex * ex + ey * ey;
    if (d < bd) { bd = d; best = k; }
  }
  return best;
}
const span = (ax, ay, bx, by) => Math.hypot((bx - ax) * Math.cos((ay + by) * RAD / 2), by - ay) * 111.2 / SCALE;
function adjacency(mp, index, skip) {
  const out = new Map();
  for (const poly of mp) for (const ring of poly) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[j], [bx, by] = ring[i];
    const k = onEdge(index, (ax + bx) / 2, (ay + by) / 2, skip);
    if (k >= 0) out.set(k, (out.get(k) || 0) + span(ax, ay, bx, by));
  }
  return out;
}
function nearest(mp, kids) {
  const bb = box(mp), cos = Math.cos((bb[1] + bb[3]) * RAD / 2), pts = mp.flatMap((poly) => poly[0]);
  const sample = pts.filter((_, i) => i % Math.max(1, Math.floor(pts.length / 64)) === 0);
  const apart = (b) => Math.hypot(Math.max(0, b[0] - bb[2], bb[0] - b[2]) * cos, Math.max(0, b[1] - bb[3], bb[1] - b[3]));
  let best = -1, bd = Infinity;
  for (const [g, i] of kids.map((k, i) => [apart(k.bb), i]).sort((a, b) => a[0] - b[0] || a[1] - b[1])) {
    if (g > bd) break;
    for (const poly of kids[i].mp) for (const ring of poly) for (const [x, y] of ring) for (const [px, py] of sample) {
      const d = Math.hypot((x - px) * cos, y - py);
      if (d < bd) { bd = d; best = i; }
    }
  }
  return best;
}
function cells(poly) {
  const [x0, y0, x1, y1] = box([poly]), out = [];
  for (let gy = Math.floor(y0 / STEP); gy * STEP < y1; gy++)
    for (const row of intersect([poly], [[[[x0 - 9, gy * STEP], [x1 + 9, gy * STEP], [x1 + 9, (gy + 1) * STEP], [x0 - 9, (gy + 1) * STEP]]]])) {
      const [rx0, , rx1] = box([row]);
      for (let gx = Math.floor(rx0 / STEP); gx * STEP < rx1; gx++)
        out.push(...intersect([row], [[[[gx * STEP, gy * STEP - 9], [(gx + 1) * STEP, gy * STEP - 9], [(gx + 1) * STEP, (gy + 1) * STEP + 9], [gx * STEP, (gy + 1) * STEP + 9]]]]));
    }
  return out;
}
function carve(parent, kids) {
  for (let i = 0; i < kids.length; i++) {
    const prior = [];
    for (let j = 0; j < i; j++) if (kids[j].mp.length && hit(kids[i].bb, kids[j].bb)) prior.push(kids[j].mp);
    if (prior.length) { kids[i].mp = minus(kids[i].mp, ...prior); kids[i].bb = box(kids[i].mp); }
  }
  kids = kids.filter((k) => k.mp.length);
  if (kids.length < 2) return kids;
  const index = edgeIndex(kids.map((k) => k.mp), 50000), pieces = [];
  kids.forEach((k, i) => k.mp.forEach((poly) => pieces.push({ poly, owner: i })));
  for (const gap of minus(parent.mp, ...kids.map((k) => k.mp))) {
    const adj = adjacency([gap], index);
    if (!adj.size) { pieces.push({ poly: gap, owner: nearest([gap], kids) }); continue; }
    if (adj.size === 1 || area([gap]) < 0.05) { pieces.push({ poly: gap, owner: top(adj) }); continue; }
    const part = cells(gap), owner = part.map((q) => { const a = adjacency([q], index); return a.size ? top(a) : -1; });
    if (owner.includes(-1)) {
      const partIndex = edgeIndex(part.map((q) => [q]), STEP / 2);
      for (let changed = true; changed; ) {
        changed = false;
        part.forEach((q, i) => {
          if (owner[i] >= 0) return;
          const tally = new Map();
          for (const [j, l] of adjacency([q], partIndex, i)) if (owner[j] >= 0) tally.set(owner[j], (tally.get(owner[j]) || 0) + l);
          if (tally.size) { owner[i] = top(tally); changed = true; }
        });
      }
    }
    part.forEach((q, i) => pieces.push({ poly: q, owner: owner[i] >= 0 ? owner[i] : nearest([q], kids) }));
  }
  const all = edgeIndex(pieces.map((q) => [q.poly]), 50000), sizes = pieces.map((q) => area([q.poly]));
  const near = pieces.map((q, i) => adjacency([q.poly], all, i));
  for (let pass = 0; pass < 4; pass++) {
    const seen = new Array(pieces.length).fill(false), groups = [], total = new Map(), biggest = new Map();
    pieces.forEach((q, i) => {
      if (seen[i]) return;
      const members = [], stack = [i];
      seen[i] = true;
      while (stack.length) { const j = stack.pop(); members.push(j); for (const [m] of near[j]) if (!seen[m] && pieces[m].owner === q.owner) { seen[m] = true; stack.push(m); } }
      const g = { owner: q.owner, members, size: members.reduce((t, j) => t + sizes[j], 0) };
      total.set(g.owner, (total.get(g.owner) || 0) + g.size);
      if (!biggest.has(g.owner) || biggest.get(g.owner).size < g.size) biggest.set(g.owner, g);
      groups.push(g);
    });
    let moved = false;
    for (const g of groups) {
      if (total.get(g.owner) >= MIN_UNIT_KM2 && (biggest.get(g.owner) === g || g.size >= FRAGMENT_KM2)) continue;
      const tally = new Map();
      for (const j of g.members) for (const [m, l] of near[j]) if (pieces[m].owner !== g.owner) tally.set(pieces[m].owner, (tally.get(pieces[m].owner) || 0) + l);
      if (!tally.size) continue;
      const to = top(tally);
      for (const j of g.members) pieces[j].owner = to;
      moved = true;
    }
    if (!moved) break;
  }
  return kids.map((k, i) => ({ n: k.n, order: k.order, polys: pieces.filter((q) => q.owner === i).map((q) => q.poly) })).filter((u) => u.polys.length);
}
function assign(code, children) {
  const own = parents.map((p, i) => i).filter((i) => parents[i].c === code);
  const groups = new Map(own.map((i) => [i, []]));
  children.forEach((ch, order) => {
    const bb = box(ch.mp);
    let best = -1, most = MIN_UNIT_KM2, clip = null;
    for (const i of own) {
      if (!hit(bb, parents[i].bb)) continue;
      const part = intersect(crop(ch.mp, parents[i].bb), crop(parents[i].mp, bb)), a = area(part);
      if (a > most) { most = a; best = i; clip = part; }
    }
    if (best >= 0) groups.get(best).push({ n: ch.n, mp: clip, bb: box(clip), order });
  });
  for (const [i, list] of groups) {
    const byName = new Map();
    for (const k of list) { const m = byName.get(k.n); if (m) { m.mp = union(m.mp, k.mp); m.bb = box(m.mp); } else byName.set(k.n, k); }
    groups.set(i, [...byName.values()]);
  }
  return groups;
}

function readDbf(path) {
  const b = readFileSync(path), n = b.readUInt32LE(4), head = b.readUInt16LE(8), size = b.readUInt16LE(10), gbk = new TextDecoder("gbk"), fields = [];
  for (let o = 32; b[o] !== 13; o += 32) fields.push([b.toString("latin1", o, o + 11).replace(/\0.*/, ""), b[o + 16]]);
  return Array.from({ length: n }, (_, i) => {
    let o = head + i * size + 1;
    const r = {};
    for (const [name, len] of fields) { r[name] = gbk.decode(b.subarray(o, o + len)).trim(); o += len; }
    return r;
  });
}
const ETHNIC = {
  朝鲜: "Korean", 蒙古: "Mongol", 回: "Hui", 藏: "Tibetan", 羌: "Qiang", 彝: "Yi", 苗: "Miao", 侗: "Dong", 布依: "Bouyei", 土家: "Tujia", 壮: "Zhuang", 哈尼: "Hani",
  傣: "Dai", 白: "Bai", 景颇: "Jingpo", 傈僳: "Lisu", 哈萨克: "Kazakh", 柯尔克孜: "Kyrgyz", 黎: "Li",
};
const MINORITIES = Object.keys(ETHNIC).concat("满 维吾尔 瑶 佤 畲 拉祜 水 东乡 纳西 土 达斡尔 仫佬 布朗 撒拉 毛南 仡佬 锡伯 阿昌 普米 塔吉克 怒 鄂温克 保安 裕固 京 独龙 鄂伦春 赫哲 门巴 珞巴 基诺 各".split(" ")).sort((a, b) => b.length - a.length);
const CN_NAMES = {
  哈尔滨: "Harbin", 齐齐哈尔: "Qiqihar", 呼和浩特: "Hohhot", 鄂尔多斯: "Ordos", 呼伦贝尔: "Hulunbuir", 巴彦淖尔: "Bayannur", 乌兰察布: "Ulanqab", 兴安: "Hinggan",
  锡林郭勒: "Xilin Gol", 阿拉善: "Alxa", 乌鲁木齐: "Ürümqi", 克拉玛依: "Karamay", 吐鲁番: "Turpan", 博尔塔拉: "Bortala", 巴音郭楞: "Bayingolin", 阿克苏: "Aksu",
  克孜勒苏: "Kizilsu", 喀什: "Kashgar", 和田: "Hotan", 伊犁: "Ili", 阿勒泰: "Altay", 拉萨: "Lhasa", 日喀则: "Shigatse", 昌都: "Qamdo", 林芝: "Nyingchi", 那曲: "Nagqu",
  阿里: "Ngari", 果洛: "Golog", 甘孜: "Garzê", 阿坝: "Ngawa", 迪庆: "Dêqên",
};
const CN_FIXES = { 烏海市: "乌海市", 詹州市: "儋州市", 米泉县: "米东区" };
const romanize = (zh) => {
  if (CN_NAMES[zh]) return CN_NAMES[zh];
  const s = pinyin(zh, { toneType: "none", type: "array" }).map((x, i) => (i && /^[aoe]/.test(x) ? "'" : "") + x.toLowerCase()).join("");
  return s[0].toUpperCase() + s.slice(1);
};
const strip = (s) => s.replace(/(自治县|自治旗|自治州|特区|林区|地区|自治|自|县|市|区|旗|盟)$/, "");
const peel = (s) => {
  const groups = [];
  for (let again = true; again; ) {
    again = false;
    for (const m of MINORITIES) {
      const cut = s.endsWith(m + "族") ? m.length + 1 : s.endsWith(m) && m.length > 1 ? m.length : 0;
      if (cut && s.length - cut >= 2) { groups.unshift(ETHNIC[m] || m); s = s.slice(0, -cut); again = true; break; }
    }
  }
  return [s, groups];
};
const baseName = (s) => peel(strip(strip(s)))[0];
function englishName(zh) {
  if (/自治[州县]$/.test(zh)) {
    const [place, groups] = peel(zh.slice(0, -3));
    return romanize(place) + " " + groups.join(" and ") + " Autonomous " + (zh.endsWith("州") ? "Prefecture" : "County");
  }
  if (zh.endsWith("地区")) return romanize(zh.slice(0, -2)) + " Prefecture";
  if (zh.endsWith("林区")) return romanize(zh.slice(0, -2)) + " Forestry District";
  if (zh.endsWith("盟")) return romanize(zh.slice(0, -1)) + " League";
  if (zh.endsWith("县")) return romanize(zh.slice(0, -1)) + " County";
  return romanize(zh.replace(/市$/, ""));
}
const byCount = (m) => [...m].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0];
function chinaUnits() {
  const feats = readJSON("geoBoundaries-CHN-ADM2_simplified.geojson").features, rows = readDbf(need("中国县界.dbf"));
  if (rows.length !== feats.length || feats.some((f, i) => String(f.properties.shapeName || "").toLowerCase() !== String(rows[i].ENAME || "").toLowerCase()))
    throw new Error("中国县界.dbf does not match geoBoundaries-CHN-ADM2_simplified.geojson");
  const own = parents.map((p, i) => i).filter((i) => parents[i].c === "CHN"), counties = [];
  feats.forEach((f, i) => {
    if (!f.geometry) return;
    const mp = union(ints(f.geometry)), bb = box(mp);
    let home = -1, most = MIN_UNIT_KM2;
    for (const p of own) if (hit(bb, parents[p].bb)) { const a = area(intersect(crop(mp, parents[p].bb), crop(parents[p].mp, bb))); if (a > most) { most = a; home = p; } }
    if (home < 0) return;
    const code = String(rows[i].GB1999);
    counties.push({ mp, home, code, prefix: code.slice(0, 4), name: CN_FIXES[rows[i].NAME] || rows[i].NAME });
  });
  const provinceOf = new Map();
  for (const p of own) {
    const tally = new Map();
    for (const c of counties) if (c.home === p && c.code.length === 6) tally.set(c.code.slice(0, 2), (tally.get(c.code.slice(0, 2)) || 0) + 1);
    if (tally.size) provinceOf.set(p, byCount(tally));
  }
  const { city_list: cities, county_list: cnties } = areaList;
  const prefecture = (code) => (/直辖/.test(cities[code.slice(0, 4) + "00"] || "直辖") ? null : code.slice(0, 4));
  const candidates = new Map();
  for (const [code, name] of Object.entries(cnties).concat(Object.entries(cities))) {
    if (/直辖|^县$|^市辖区$/.test(name)) continue;
    const k = code.slice(0, 2) + ":" + baseName(name);
    if (!candidates.has(k)) candidates.set(k, []);
    candidates.get(k).push(code);
  }
  const common = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return i; };
  const kept = counties.filter((c) => provinceOf.has(c.home) && !["11", "12", "31", "50"].includes(provinceOf.get(c.home)));
  for (const c of kept) {
    const prov = provinceOf.get(c.home), b = baseName(c.name);
    const list = [b].concat(b.length === 1 ? [b + "州", b + "城"] : []).flatMap((x) => candidates.get(prov + ":" + x) || []);
    if (list.length) { const best = list.sort((p, q) => common(q, c.code) - common(p, c.code) || (p < q ? -1 : 1))[0]; c.key = prefecture(best) || best; }
    c.trusted = c.code.slice(0, 2) === prov;
  }
  const byPrefix = new Map();
  for (const c of kept) if (c.key && c.trusted && c.key.length === 4) { const m = byPrefix.get(c.prefix) || new Map(); m.set(c.key, (m.get(c.key) || 0) + 1); byPrefix.set(c.prefix, m); }
  for (const c of kept) if (!c.key && c.trusted) c.key = byPrefix.has(c.prefix) ? byCount(byPrefix.get(c.prefix)) : prefecture(c.code);
  const index = edgeIndex(kept.map((c) => c.mp), 50000);
  for (let changed = true; changed; ) {
    changed = false;
    kept.forEach((c, i) => {
      if (c.key) return;
      const tally = new Map();
      for (const [j, l] of adjacency(c.mp, index, i)) if (kept[j].key && kept[j].home === c.home) tally.set(kept[j].key, (tally.get(kept[j].key) || 0) + l);
      if (tally.size) { c.key = byCount(tally); changed = true; }
    });
  }
  const groups = new Map();
  for (const c of kept) if (c.key) { if (!groups.has(c.key)) groups.set(c.key, []); groups.get(c.key).push(c.mp); }
  return [...groups].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([key, mps]) => ({ n: englishName(key.length === 4 ? cities[key + "00"] : cnties[key]), mp: union(...mps) }));
}

const BR_FIXES = { "São Luiz": "São Luiz do Anauá", Açu: "Assú", Arês: "Arez", "Gracho Cardoso": "Graccho Cardoso", "Barão de Monte Alto": "Barão do Monte Alto", "Santo Antônio do Leverger": "Santo Antônio de Leverger" };
function brazilUnits() {
  const feats = readJSON("geoBoundaries-BRA-ADM2_simplified.geojson").features, tables = "@br-geo-kit/ibge/data/2026/tables/";
  const towns = require(tables + "municipalities.json").slice().sort((a, b) => (a.code < b.code ? -1 : 1));
  const names = new Map(require(tables + "regions.json").filter((r) => r.kind === "immediate").map((r) => [r.code, r.name.replace(/ [-¿] /g, " – ")]));
  const plain = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
  const groups = new Map();
  let j = 0;
  for (const f of feats) {
    const want = plain(BR_FIXES[f.properties.shapeName] || f.properties.shapeName), from = j;
    while (j < towns.length && plain(towns[j].name) !== want) j++;
    if (j === towns.length || j > from + 1 || !f.geometry) throw new Error("the IBGE municipalities do not match geoBoundaries-BRA-ADM2_simplified.geojson at " + f.properties.shapeName);
    const code = towns[j++].immediate;
    if (!groups.has(code)) groups.set(code, []);
    groups.get(code).push(ints(f.geometry));
  }
  return [...groups].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([code, mps]) => ({ n: names.get(code), mp: union(...mps) }));
}
const RU = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };
const latin = (s) => [...s].map((c, i, all) => {
  const l = c.toLowerCase(), prev = (all[i - 1] || "").toLowerCase(), next = (all[i + 1] || "").toLowerCase(), after = (all[i + 2] || "").toLowerCase();
  if (!(l in RU)) return c;
  let t = RU[l];
  if ((l === "и" || l === "ы") && next === "й" && !(after in RU)) t = "y";
  else if (l === "й" && (prev === "и" || prev === "ы") && !(next in RU)) t = "";
  else if (l === "е" && (!(prev in RU) || "аеёиоуыэюяъь".includes(prev))) t = "ye";
  else if (l === "ь" && "ио".includes(next)) t = "y";
  return c === l ? t : t.charAt(0).toUpperCase() + t.slice(1);
}).join("");
const RU_TYPES = [[/^городской округ (.+)$/, "$1 Urban Okrug"], [/^(.+) городской округ$/, "$1 Urban Okrug"], [/^ЗАТО (.+)$/, "ZATO $1"], [/^(.+) (муниципальный )?район$/, "$1 District"], [/^(.+) кожуун$/, "$1 Kozhuun"], [/^(.+) улус$/, "$1 Ulus"]];
const russianName = (raw) => {
  let n = raw.replace(/[\u200e\u200f]/g, "").trim();
  n = NAMES.RUS[n] || n;
  const rule = RU_TYPES.find(([re]) => re.test(n));
  if (rule) n = n.replace(rule[0], rule[1]);
  return latin(n).replace(/ ([Rr]ayon|[Mm]unicipal [Dd]istrict)$/, " District").replace(/ ([Uu]rban [Dd]istrict|[Uu]rban [Oo]krug|[Mm]unicipality)$/, " Urban Okrug");
};
const mongolianName = (n) => n.replace(/([OoUu])'/g, (m, v) => ({ O: "Ö", o: "ö", U: "Ü", u: "ü" })[v]).replace(/X/g, "Kh").replace(/x/g, "kh").replace(/C(?!h)/g, "Ts").replace(/c(?!h)/g, "ts").replace(/ (\p{Ll})/gu, (m, c) => " " + c.toUpperCase());
const fromGB = (iso, level, rename) => () => readJSON(`geoBoundaries-${iso}-ADM${level}_simplified.geojson`).features
  .map((f) => ({ f, n: f.geometry && rename(String(f.properties.shapeName || "").replace(/\s+/g, " ").replace(/(\S)\(/g, "$1 (").trim()) }))
  .filter((u) => u.n).map(({ f, n }) => ({ n, mp: union(ints(f.geometry)) }));
const US_TYPES = new Set(["County", "Parish", "Borough", "Census Area", "City and Borough", "Municipality", "City"]);
const NAMES = {
  CAN: {
    "South Coast--Burin Peninsula *": "South Coast–Burin Peninsula", "West Coast--Northern Peninsul*": "West Coast–Northern Peninsula–Labrador",
    "Notre Dame--Central Bonavista*": "Notre Dame–Central Bonavista Bay", "Gaspésie--Îles-de-la-Madelei": "Gaspésie–Îles-de-la-Madeleine",
    "Banff--Jasper--Rocky Mountain*": "Banff–Jasper–Rocky Mountain House", "Athabasca--Grande Prairie--Pe*": "Athabasca–Grande Prairie–Peace River",
    "Lower Mainland--Southwest / L*": "Lower Mainland–Southwest", "Vancouver Island and Coast / *": "Vancouver Island and Coast",
  },
  KAZ: { "Zhamb.": "Zhambylskiy", Zhualy: "Zhualynskiy", "Almaty (Alma-Ata)": "Almaty" },
  PAK: { Sheikhpura: "Sheikhupura" },
  ZAF: { Cacadu: "Sarah Baartman", Eden: "Garden Route", Sisonke: "Harry Gwala", Uthungulu: "King Cetshwayo" },
  DZA: { Bashar: "Béchar", Tinduf: "Tindouf", "Burj Umar Idris": "Bordj Omar Driss", "Al Wata": "El Ouata", "Bani Abbas": "Béni Abbès", Ghardaia: "Ghardaïa" },
  IND: { "DATA NOT AVAILABLE": null, "Leh (Ladakh)": "Leh", "Kadapa (YSR)": "YSR Kadapa", "Warangal (R)": "Warangal Rural", "Warangal (U)": "Warangal Urban" },
  RUS: {
    "городской округ Сосновобор": "городской округ Сосновоборск", "городской округ Лесосибирс": "городской округ Лесосибирск", "Closed administrative-territorial formation of Zhe": "ЗАТО Железногорск",
    "Черемховское городское мун": "городской округ Черемхово", "городской округ Усолье-Сиб": "городской округ Усолье-Сибирское", "городской округ Усть-Илимс": "городской округ Усть-Илимск",
    "Свирское городское муницип": "городской округ Свирск", "Зиминское городское муници": "городской округ Зима", "городской округ Новый Урен": "городской округ Новый Уренгой",
    "городской округ Нижневарто": "городской округ Нижневартовск", "городской округ Нефтеюганс": "городской округ Нефтеюганск", "городской округ Петровск-З": "городской округ Петровск-Забайкальский",
    "городской округ Архангельс": "городской округ Архангельск", "городской округ Новая Земл": "городской округ Новая Земля", "городской округ Северодвин": "городской округ Северодвинск",
    "городской округ Благовещен": "городской округ Благовещенск", "городской округ Северобайк": "городской округ Северобайкальск", "городской округ Новоалтайс": "городской округ Новоалтайск",
    "городской округ Красноурал": "городской округ Красноуральск", "городской округ Нижняя Сал": "городской округ Нижняя Салда", "Горноуральский городской о": "Горноуральский городской округ",
    "Малышевский городской окру": "Малышевский городской округ", "Арамильский городской окру": "Арамильский городской округ", "городской округ Нижний Таг": "городской округ Нижний Тагил",
    "Асбестовский городской окр": "Асбестовский городской округ", "городской округ Алапаевско": "городской округ Алапаевское", "городской округ Верхняя Пы": "городской округ Верхняя Пышма",
    "городской округ Верхняя Ту": "городской округ Верхняя Тура", "городской округ Каменск-Ур": "городской округ Каменск-Уральский", "городской округ Краснотурь": "городской округ Краснотурьинск",
    "городской округ Красноуфим": "городской округ Красноуфимск", "городской округ Староуткин": "городской округ Староуткинск", "Нижнетуринский городской о": "Нижнетуринский городской округ",
    "Североуральский городской": "Североуральский городской округ", "Сосьвинский городской окру": "Сосьвинский городской округ", "Качканарский городской окр": "Качканарский городской округ",
    "Кировградский городской ок": "Кировградский городской округ", "Новоуральский городской ок": "Новоуральский городской округ", "Артёмовский городской окру": "Артёмовский городской округ",
    "городской округ Верхний Та": "городской округ Верхний Тагил", "городской округ Среднеурал": "городской округ Среднеуральск", "городской округ Первоураль": "городской округ Первоуральск",
    "Берёзовский городской окру": "Берёзовский городской округ", "Лысьвенский городской окру": "Лысьвенский городской округ", "Дальнегорский городской ок": "Дальнегорский городской округ",
    "Уссурийский городской окру": "Уссурийский городской округ", "Находкинский городской окр": "Находкинский городской округ", "Арсеньевский городской окр": "Арсеньевский городской округ",
    "Дальнереченский городской": "Дальнереченский городской округ", "Лесозаводский городской ок": "Лесозаводский городской округ", "городской округ Большой Ка": "городской округ Большой Камень",
    "Владивостокский городской": "Владивостокский городской округ",
    "Tomsk municipal region": "Tomsky District", "Kargasok region": "Kargasoksky District", "Asino region": "Asinovsky District", "Upper Ket region": "Verkhneketsky District",
    "Pervomay region": "Pervomaysky District", "Zalari municipal region": "Zalarinsky District", "Ust-Ilimsky": "Ust-Ilimsky District", "Yeniseisk Rayon": "Yeniseysky District",
    "imeni Lazo Rayon": "Imeni Lazo District", "imeni Poliny Osipenko Rayon": "Imeni Poliny Osipenko District", Komsomolsky: "Komsomolsky District",
    "Mujejärvi District": "Muyezersky District", "Petroskoi District": "Petrozavodsk Urban Okrug", "Äänisenranta District": "Prionezhsky District", "Pitkäranta District": "Pitkyarantsky District",
    "Puutoisten District": "Pudozhsky District", "Aunus District": "Olonetsky District", "Kalevala District": "Kalevalsky District", "Kontupohja District": "Kondopozhsky District",
    "Kostamus City District": "Kostomuksha Urban Okrug", "Lahdenpohja District": "Lakhdenpokhsky District", "Louhi District": "Loukhsky District", "Prääsä District": "Pryazhinsky District",
    "Sorokka District": "Belomorsky District", "Sortavala District": "Sortavalsky District", "Suojärvi District": "Suoyarvsky District",
  },
};
const SPLIT = [
  {
    c: "USA", source: "Counties, Natural Earth 1:10m admin-2 counties with lakes (from the US Census Bureau)", license: "Public domain",
    url: "https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_admin_2_counties_lakes.geojson",
    load: () => readJSON("ne_10m_admin_2_counties_lakes.geojson").features.filter((f) => f.geometry && f.properties.ADM0_A3 === "USA")
      .map(({ properties: p, geometry }) => ({ n: US_TYPES.has(p.TYPE_EN) ? p.NAME + " " + p.TYPE_EN : p.NAME_ALT || p.NAME, mp: union(ints(geometry)) })),
  },
  {
    c: "CHN", source: "Prefectures, merged from the 1:4,000,000 county boundaries of the National Administration of Surveying, Mapping and Geoinformation of China (via Revolutionary GIS, github.com/justinelliotmeyers/-1_400-, and geoBoundaries)", license: "ODC PDDL 1.0 (public domain)",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/CHN/ADM2",
    load: chinaUnits,
  },
  {
    c: "DEU", source: "Kreise, © GeoBasis-DE / BKG 2021 (via geoBoundaries)", license: "Data licence Germany – attribution – version 2.0 (dl-de/by-2-0)",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/DEU/ADM3",
    load: fromGB("DEU", 3, (n) => n.replace(/ \(DE\)$/, "").replace(/^(.*), (Stadtkreis|Kreisfreie Stadt)$/, "$1").replace(/^(.*), Landkreis$/, "Landkreis $1")),
  },
  {
    c: "CAN", source: "Economic regions, Statistics Canada 2022 (via geoBoundaries)", license: "Open Government Licence – Canada 2.0",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/CAN/ADM2",
    load: fromGB("CAN", 2, (n) => NAMES.CAN[n] || n.split(" / ")[0].replace(/--/g, "–")),
  },
  {
    c: "COD", source: "Territories and cities, Référentiel Géographique Commun and OCHA DR Congo (via geoBoundaries)", license: "CC BY 3.0 IGO",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/COD/ADM2",
    load: fromGB("COD", 2, (n) => n),
  },
  {
    c: "KAZ", source: "Districts (2017), © OpenStreetMap contributors (via Wambacher and geoBoundaries)", license: "ODbL 1.0",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/KAZ/ADM2",
    load: fromGB("KAZ", 2, (n) => NAMES.KAZ[n] || n.replace(/`/g, "'")),
  },
  {
    c: "PAK", source: "Districts (2019), geoBoundaries", license: "Public domain",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/PAK/ADM2",
    load: fromGB("PAK", 2, (n) => NAMES.PAK[n] || n),
  },
  {
    c: "ZAF", source: "District municipalities, Municipal Demarcation Board and OCHA ROSEA (via geoBoundaries)", license: "CC BY 3.0 IGO",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/ZAF/ADM2",
    load: fromGB("ZAF", 2, (n) => NAMES.ZAF[n] || n),
  },
  {
    c: "BRA", source: "Immediate geographic regions (regiões geográficas imediatas, 2017), IBGE: municipal boundaries (via OCHA ROLAC and geoBoundaries) merged by the IBGE composition of each region (IBGE Localidades API, via the npm package @br-geo-kit/ibge 1.0.0)", license: "CC BY 3.0 IGO (boundaries); IBGE public data (composition)",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/BRA/ADM2",
    load: brazilUnits,
  },
  {
    c: "RUS", min: 150000, source: "Districts and urban okrugs (2017) of the federal subjects larger than 150,000 km², © OpenStreetMap contributors (via Wambacher and geoBoundaries)", license: "ODbL 1.0",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/RUS/ADM2",
    load: fromGB("RUS", 2, russianName),
  },
  {
    c: "AUS", source: "Local government areas (2022), © Australian Bureau of Statistics (via geoBoundaries)", license: "CC BY 4.0",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/AUS/ADM2",
    load: fromGB("AUS", 2, (n) => n.replace(/ \((NSW|Vic\.|Qld|SA|WA|Tas\.|NT)\)$/, "")),
  },
  {
    c: "IND", source: "Districts (2021), Pathways Data and the Local Government Directory, lgdirectory.gov.in (via geoBoundaries)", license: "ODbL 1.0",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/IND/ADM2",
    load: fromGB("IND", 2, (n) => (n in NAMES.IND ? NAMES.IND[n] : n.replace(/ & /g, " and "))),
  },
  {
    c: "ARG", source: "Departments (2020), Instituto Geográfico Nacional, UNHCR and OCHA ROLAC (via geoBoundaries)", license: "CC BY 3.0 IGO",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/ARG/ADM2",
    load: fromGB("ARG", 2, (n) => n.replace(/ de julio$/, " de Julio")),
  },
  {
    c: "IDN", source: "Regencies and cities (2020), BPS – Statistics Indonesia, WFP and OCHA ROAP (via geoBoundaries)", license: "CC BY 3.0 IGO",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/IDN/ADM2",
    load: fromGB("IDN", 2, (n) => n),
  },
  {
    c: "MLI", source: "Cercles (2017), DNCT, DNP and OCHA Mali (via geoBoundaries)", license: "CC BY 4.0",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/MLI/ADM2",
    load: fromGB("MLI", 2, (n) => n),
  },
  {
    c: "NER", source: "Departments (2018), geoBoundaries and City Population (citypopulation.de)", license: "CC BY 3.0",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/NER/ADM2",
    load: fromGB("NER", 2, (n) => n),
  },
  {
    c: "TCD", source: "Departments (2019), OCHA Chad (via geoBoundaries)", license: "CC BY 3.0 IGO",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/TCD/ADM2",
    load: fromGB("TCD", 2, (n) => n),
  },
  {
    c: "MNG", source: "Sums and Ulaanbaatar districts (2021), National Statistical Office of Mongolia and OCHA ROAP (via geoBoundaries)", license: "CC BY 3.0 IGO",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/MNG/ADM2",
    load: fromGB("MNG", 2, mongolianName),
  },
  {
    c: "IRN", source: "Counties (shahrestans, 2017), © OpenStreetMap contributors (via Wambacher and geoBoundaries)", license: "ODbL 1.0",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/IRN/ADM2",
    load: fromGB("IRN", 2, (n) => n.replace(/ County$/, "")),
  },
  {
    c: "SDN", source: "Localities (2020), OCHA ROSEA and the Information Management Working Group (via geoBoundaries)", license: "CC BY 3.0 IGO",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/SDN/ADM2",
    load: fromGB("SDN", 2, (n) => n),
  },
  {
    c: "MRT", source: "Moughataas (2020), WFP and OCHA ROWCA (via geoBoundaries)", license: "CC BY 3.0 IGO",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/MRT/ADM2",
    load: fromGB("MRT", 2, (n) => n),
  },
  {
    c: "PER", source: "Provinces (2020), Instituto Geográfico Nacional and OCHA ROLAC (via geoBoundaries)", license: "CC BY 3.0 IGO",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/PER/ADM2",
    load: fromGB("PER", 2, (n) => (/Ã/.test(n) ? Buffer.from(n, "latin1").toString("utf8") : n)),
  },
  {
    c: "BOL", source: "Provinces (2015), GeoBolivia (via geoBoundaries)", license: "Public domain",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/BOL/ADM2",
    load: fromGB("BOL", 2, (n) => n),
  },
  {
    c: "AGO", source: "Municipalities (2006), Wikimedia Commons (via geoBoundaries)", license: "Public domain",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/AGO/ADM2",
    load: fromGB("AGO", 2, (n) => n),
  },
  {
    c: "MOZ", source: "Districts (2019), Instituto Nacional de Estatística and OCHA ROSEA (via geoBoundaries)", license: "CC BY 3.0 IGO",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/MOZ/ADM2",
    load: fromGB("MOZ", 2, (n) => n),
  },
  {
    c: "TZA", source: "Districts (2021), National Bureau of Statistics and OCHA ROSA (via geoBoundaries)", license: "CC BY 3.0 IGO",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/TZA/ADM2",
    load: fromGB("TZA", 2, (n) => n),
  },
  {
    c: "ZMB", source: "Districts (2020), GRID3 and the Office of the Surveyor General (via geoBoundaries)", license: "CC BY 4.0",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/ZMB/ADM2",
    load: fromGB("ZMB", 2, (n) => n),
  },
  {
    c: "MDG", source: "Districts (2020), BNGRC and OCHA ROSA (via geoBoundaries)", license: "CC BY 3.0 IGO",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/MDG/ADM2",
    load: fromGB("MDG", 2, (n) => n),
  },
  {
    c: "ETH", source: "Zones (2016), Open Africa and Code for Ethiopia (via geoBoundaries)", license: "ODbL 1.0",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/ETH/ADM2",
    load: fromGB("ETH", 2, (n) => n.replace(/ \(R\d\)$/, "")),
  },
  {
    c: "SAU", source: "Governorates (2021), © OpenStreetMap contributors (via geoBoundaries)", license: "ODbL 1.0 (OpenStreetMap data; geoBoundaries lists CC BY-SA 2.0)",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/SAU/ADM2",
    load: fromGB("SAU", 2, (n) => n.replace(/ Governorate$/, "")),
  },
  {
    c: "DZA", min: 60000, source: "Communes (2021) of the wilayas larger than 60,000 km², © OpenStreetMap contributors (via osm-boundaries.com and geoBoundaries)", license: "ODbL 1.0 (OpenStreetMap data; geoBoundaries lists CC BY-SA 2.0)",
    url: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/DZA/ADM3",
    load: fromGB("DZA", 3, (n) => NAMES.DZA[n] || n),
  },
];

const t0 = Date.now();
for (const p of parents) if (SPLIT.some((s) => s.c === p.c)) { p.mp = union(ints({ type: "MultiPolygon", coordinates: p.geo })); p.bb = box(p.mp); }
const units = parents.map((p) => [{ n: p.n, polys: ints({ type: "MultiPolygon", coordinates: p.geo }) }]);
const split = [], counts = {};
for (const s of SPLIT) {
  for (const [i, kids] of assign(s.c, s.load())) {
    if (s.min && area(parents[i].mp) < s.min) continue;
    const done = kids.length > 1 ? carve(parents[i], kids) : [];
    if (done.length < 2) continue;
    units[i] = done.sort((a, b) => a.n.localeCompare(b.n, "en") || a.order - b.order);
    counts[s.c] = (counts[s.c] || 0) + done.length;
  }
  if (counts[s.c]) split.push(s);
  console.log(s.c, counts[s.c] || 0, "units", Math.round((Date.now() - t0) / 1000) + "s");
}

const push = (r, v) => { if (r[r.length - 1] === v) return false; if (r.length > 1 && r[r.length - 2] === v) { r.pop(); return false; } r.push(v); return true; };
const close = (r) => {
  for (let again = true; again; ) {
    again = false;
    if (r.length > 1 && r[r.length - 1] === r[0]) { r.pop(); again = true; } else if (r.length > 2 && r[1] === r[r.length - 1]) { r.shift(); r.pop(); again = true; }
  }
  return r;
};
function refine(rings, X, Y, tol, H) {
  const grid = new Map(), used = new Set();
  for (const u of rings) for (const poly of u) for (const ring of poly) for (const v of ring) used.add(v);
  for (const v of used) {
    const k = (Math.floor(X[v] / H) + 50000) * 100000 + Math.floor(Y[v] / H) + 50000, l = grid.get(k);
    if (l) l.push(v); else grid.set(k, [v]);
  }
  const between = (a, b) => {
    const ax = X[a], ay = Y[a], dx = X[b] - ax, dy = Y[b] - ay, l2 = dx * dx + dy * dy, found = [];
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / H));
    for (let s = 0; s < n; s++) {
      const x0 = ax + (dx * s) / n, y0 = ay + (dy * s) / n, x1 = ax + (dx * (s + 1)) / n, y1 = ay + (dy * (s + 1)) / n;
      for (let gx = Math.floor((Math.min(x0, x1) - tol) / H); gx <= Math.floor((Math.max(x0, x1) + tol) / H); gx++)
        for (let gy = Math.floor((Math.min(y0, y1) - tol) / H); gy <= Math.floor((Math.max(y0, y1) + tol) / H); gy++) {
          const l = grid.get((gx + 50000) * 100000 + gy + 50000);
          if (l) for (const v of l) {
            if (v === a || v === b) continue;
            const t = ((X[v] - ax) * dx + (Y[v] - ay) * dy) / l2;
            if (!(t > 0 && t < 1)) continue;
            const ex = ax + t * dx - X[v], ey = ay + t * dy - Y[v];
            if (ex * ex + ey * ey <= tol * tol) found.push([t, v]);
          }
        }
    }
    return found.sort((p, q) => p[0] - q[0] || p[1] - q[1]).filter((p, i, all) => !i || p[1] !== all[i - 1][1]);
  };
  let inserted = 0, added = 1, dirty = null;
  for (let pass = 0; added && pass < 8; pass++) {
    const changed = new Set();
    added = 0;
    for (const u of rings) for (const poly of u) poly.forEach((ring, i) => {
      if (dirty && !dirty.has(ring)) return;
      const r = [];
      ring.forEach((a, k) => { push(r, a); for (const [, v] of between(a, ring[(k + 1) % ring.length])) if (push(r, v)) added++; });
      poly[i] = close(r);
      if (r.length !== ring.length || r.some((v, k) => v !== ring[k])) changed.add(r);
    });
    inserted += added;
    dirty = changed;
  }
  return inserted;
}
function node(list) {
  const C = 100, X = [], Y = [], snap = new Map();
  const id = ([x, y]) => {
    const cx = Math.floor(x / C), cy = Math.floor(y / C);
    for (let i = cx - 1; i <= cx + 1; i++) for (let j = cy - 1; j <= cy + 1; j++) {
      const l = snap.get((i + 2e6) * 4e6 + j + 2e6);
      if (l) for (const v of l) if (Math.abs(X[v] - x) <= TOL && Math.abs(Y[v] - y) <= TOL) return v;
    }
    X.push(x); Y.push(y);
    const k = (cx + 2e6) * 4e6 + cy + 2e6, l = snap.get(k);
    if (l) l.push(X.length - 1); else snap.set(k, [X.length - 1]);
    return X.length - 1;
  };
  const rings = list.map((u) => u.polys.map((poly) => poly.map((ring) => ring.map(id))));
  let inserted = refine(rings, X, Y, TOL, 10000);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const u of rings) for (const poly of u) for (const ring of poly) for (const v of ring) { if (X[v] < x0) x0 = X[v]; if (X[v] > x1) x1 = X[v]; if (Y[v] < y0) y0 = Y[v]; if (Y[v] > y1) y1 = Y[v]; }
  [x0, y0, x1, y1] = [x0 / SCALE, y0 / SCALE, x1 / SCALE, y1 / SCALE];
  const kx = (1e6 - 1) / (x1 - x0), ky = (1e6 - 1) / (y1 - y0), cell = new Map(), QX = [], QY = [];
  const q = (v) => {
    const a = Math.round((X[v] / SCALE - x0) * kx), b = Math.round((Y[v] / SCALE - y0) * ky), k = a * 1e6 + b;
    if (!cell.has(k)) { cell.set(k, QX.length); QX.push(a); QY.push(b); }
    return cell.get(k);
  };
  for (const u of rings) for (const poly of u) for (const ring of poly) for (const v of ring) q(v);
  const H = 16, hot = new Map(), gx = (v) => (X[v] / SCALE - x0) * kx, gy = (v) => (Y[v] / SCALE - y0) * ky;
  QX.forEach((a, c) => { const k = Math.floor(a / H) * 1e6 + Math.floor(QY[c] / H), l = hot.get(k); if (l) l.push(c); else hot.set(k, [c]); });
  const enter = (px, py, dx, dy, cx, cy) => {
    let t0 = 0, t1 = 1;
    if (dx) { const a = (cx - 0.5 - px) / dx, b = (cx + 0.5 - px) / dx; t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b)); } else if (Math.round(px) !== cx) return -1;
    if (dy) { const a = (cy - 0.5 - py) / dy, b = (cy + 0.5 - py) / dy; t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b)); } else if (Math.round(py) !== cy) return -1;
    return t0 < t1 || (t0 === t1 && Math.round(px + t0 * dx) === cx && Math.round(py + t0 * dy) === cy) ? t0 : -1;
  };
  const trace = (a, b) => {
    const flip = X[a] > X[b] || (X[a] === X[b] && Y[a] > Y[b]), s = flip ? b : a, e = flip ? a : b, hits = [];
    const px = gx(s), py = gy(s), dx = gx(e) - px, dy = gy(e) - py, ux = (px + 0.5) / H, uy = (py + 0.5) / H, vx = dx / H, vy = dy / H;
    const ei = Math.floor(ux + vx), ej = Math.floor(uy + vy), si = Math.sign(vx), sj = Math.sign(vy);
    let i = Math.floor(ux), j = Math.floor(uy), tx = si ? (si > 0 ? i + 1 - ux : ux - i) / Math.abs(vx) : Infinity, ty = sj ? (sj > 0 ? j + 1 - uy : uy - j) / Math.abs(vy) : Infinity;
    for (;;) {
      for (const c of hot.get(i * 1e6 + j) || []) { const t = enter(px, py, dx, dy, QX[c], QY[c]); if (t >= 0) hits.push([t, c]); }
      if ((i === ei && j === ej) || Math.min(tx, ty) > 1) break;
      if (tx < ty) { i += si; tx += 1 / Math.abs(vx); } else if (ty < tx) { j += sj; ty += 1 / Math.abs(vy); } else { i += si; j += sj; tx += 1 / Math.abs(vx); ty += 1 / Math.abs(vy); }
    }
    const out = [q(s)];
    for (const [, c] of hits.sort((m, n) => m[0] - n[0] || m[1] - n[1])) if (out[out.length - 1] !== c) out.push(c);
    if (out[out.length - 1] !== q(e)) out.push(q(e));
    return flip ? out.reverse() : out;
  };
  const grid = rings.map((u) => u.map((poly) => poly.map((ring) => {
    const r = [];
    ring.forEach((a, k) => { const path = trace(a, ring[(k + 1) % ring.length]); for (let m = 0; m + 1 < path.length; m++) push(r, path[m]); });
    return close(r);
  })));
  const twice = (r) => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (QX[r[j]] - QX[r[i]]) * (QY[r[j]] + QY[r[i]]); return s; };
  const loops = (ring) => {
    const out = [], stack = [], at = new Map();
    for (const v of ring) {
      if (!at.has(v)) { at.set(v, stack.length); stack.push(v); continue; }
      const loop = stack.splice(at.get(v) + 1);
      for (const w of loop) at.delete(w);
      if (loop.length > 1 && twice([v, ...loop])) out.push([v, ...loop]);
    }
    if (stack.length > 2 && twice(stack)) out.push(stack);
    return out;
  };
  const M = 2 ** 22;
  const merge = (polys) => {
    const net = new Map();
    for (const poly of polys) poly.forEach((ring, i) => {
      const r = ring.slice(), t = r.length > 2 ? twice(r) : 0;
      if (!t) return;
      if ((t > 0) !== (i > 0)) r.reverse();
      r.forEach((a, k) => {
        const b = r[(k + 1) % r.length], back = b * M + a, n = net.get(back);
        if (n) net.set(back, n - 1); else net.set(a * M + b, (net.get(a * M + b) || 0) + 1);
      });
    });
    const next = new Map();
    for (const [key, n] of net) for (let c = 0; c < n; c++) { const a = Math.floor(key / M), b = key % M; if (!next.has(a)) next.set(a, []); next.get(a).push(b); }
    const all = [];
    for (const [start, list] of next) while (list.length) {
      const ring = [start];
      for (let cur = list.pop(); cur !== start && cur !== undefined; cur = (next.get(cur) || []).pop()) ring.push(cur);
      all.push(...loops(ring));
    }
    const outers = all.filter((r) => twice(r) < 0).map((r) => ({ rings: [r], ring: r.map((v) => [QX[v], QY[v]]), size: -twice(r) }));
    for (const h of all.filter((r) => twice(r) > 0)) {
      const [x, y] = interior(h.map((v) => [QX[v], QY[v]]));
      let best = null;
      for (const o of outers) if ((!best || o.size < best.size) && inside(o.ring, x, y)) best = o;
      if (best) best.rings.push(h);
    }
    return outers.sort((a, b) => b.size - a.size).map((o) => o.rings);
  };
  const degrees = (r) => r.map((v) => [QX[v] === 999999 ? x1 : QX[v] / kx + x0, QY[v] === 999999 ? y1 : QY[v] / ky + y0]);
  const kmOf = (poly) => poly.reduce((t, r, i) => t + (i ? -1 : 1) * Math.abs(signed(degrees(r).map(([x, y]) => [x * SCALE, y * SCALE]))), 0);
  const parts = grid.map(merge), family = new Map();
  list.forEach((u, i) => { if (!family.has(u.p)) family.set(u.p, []); family.get(u.p).push(i); });
  for (let pass = 0, moved = true; moved && pass < 4; pass++) {
    moved = false;
    const owner = new Map(), gains = new Map();
    parts.forEach((ps, i) => ps.forEach((poly) => poly.forEach((r) => r.forEach((a, k) => owner.set(a * M + r[(k + 1) % r.length], i)))));
    parts.forEach((ps, i) => {
      if (family.get(list[i].p).length < 2 || ps.length < 2) return;
      parts[i] = ps.filter((poly, j) => {
        if (!j || kmOf(poly) >= SMALL_PART_KM2) return true;
        const tally = new Map();
        for (const r of poly) r.forEach((a, k) => { const w = owner.get(r[(k + 1) % r.length] * M + a); if (w !== undefined && w !== i && list[w].p === list[i].p) tally.set(w, (tally.get(w) || 0) + 1); });
        if (!tally.size) return true;
        const w = top(tally);
        if (!gains.has(w)) gains.set(w, []);
        gains.get(w).push(poly);
        moved = true;
        return false;
      });
    });
    for (const [w, extra] of gains) parts[w] = merge(parts[w].concat(extra));
  }
  const close2 = (r) => r.concat([r[0]]);
  const mps = parts.map((ps) => ps.map((poly) => poly.map((r) => close2(degrees(r)))));
  return { mps, inserted, vertices: QX.length };
}

const flat = [];
units.forEach((list, p) => list.forEach((u) => flat.push({ n: u.n, p, polys: u.polys })));
const { mps: noded, inserted, vertices: nodedVertices } = node(flat);
noded.forEach((mp, i) => { if (!mp.length) throw new Error("unit " + flat[i].n + " of " + parents[flat[i].p].n + " has no area left"); });
console.log("noded:", nodedVertices, "vertices,", inserted, "inserted", Math.round((Date.now() - t0) / 1000) + "s");
const multipolygon = (mp) => (mp.length === 1 ? { type: "Polygon", coordinates: mp[0] } : { type: "MultiPolygon", coordinates: mp });
const features = flat.map((u, i) => ({ type: "Feature", properties: { n: u.n, p: u.p }, geometry: multipolygon(noded[i]) }));
const weights = (topo) => {
  const pre = simplify.presimplify(topo, simplify.sphericalTriangleArea), w = [];
  pre.arcs.forEach((arc) => arc.forEach((pt) => { if (isFinite(pt[2])) w.push(pt[2]); }));
  return { pre, w: w.sort((a, b) => a - b) };
};
const base = weights(server.topology({ provinces: { type: "FeatureCollection", features: parents.map((p) => ({ type: "Feature", properties: { n: p.n, c: p.c }, geometry: multipolygon(p.geo) })) } }, 1e6)).w;
const level = (k) => base[Math.max(0, Math.floor((1 - k) * (base.length - 1)))], threshold = level(keep), fine = level(keepDetail);
const full = server.topology({ units: { type: "FeatureCollection", features } }, 1e6);
const { pre } = weights(full);
const ringsOf = (g) => (g.type === "Polygon" ? [g.arcs] : g.arcs);
const shapesOf = (topo) => client.feature(topo, topo.objects.units).features.map((f) => (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates));
const before = shapesOf(full).map((list) => list.map((c) => kmArea({ type: "Polygon", coordinates: c })));
const several = new Set(flat.filter((u, i) => i && flat[i - 1].p === u.p).map((u) => u.p));
const arcBox = pre.arcs.map((arc) => { const b = [Infinity, Infinity, -Infinity, -Infinity]; for (const [x, y] of arc) { if (x < b[0]) b[0] = x; if (x > b[2]) b[2] = x; if (y < b[1]) b[1] = y; if (y > b[3]) b[3] = y; } return b; });
const guard = (k, b) => { let n = 0; for (const pt of pre.arcs[k < 0 ? ~k : k]) if (pt[2] !== Infinity && (!b || (pt[0] >= b[0] && pt[0] <= b[2] && pt[1] >= b[1] && pt[1] <= b[3]))) { pt[2] = Infinity; n++; } return n; };
let guarded = 0;
const check = (simple) => {
  let more = 0;
  const shapes = shapesOf(simple);
  shapes.forEach((list, i) => list.forEach((c, j) => {
    const a = d3.geoArea({ type: "Polygon", coordinates: c }), now = Math.min(a, 4 * Math.PI - a) * EARTH * EARTH;
    if (a <= 2 * Math.PI && !(several.has(flat[i].p) && before[i][j] >= SMALL_PART_KM2 && now < before[i][j] / 2)) return;
    for (const ring of ringsOf(full.objects.units.geometries[i])[j]) for (const k of ring) more += guard(k);
    guarded++;
  }));
  const mp = shapes.map((list) => ints({ type: "MultiPolygon", coordinates: list })), bbs = mp.map((m) => (m.length ? box(m) : [0, 0, -1, -1])), buckets = new Map(), tested = new Set();
  const near = (u, region) => {
    const [x0, y0, x1, y1] = box(region).map((v) => v / SCALE), m = Math.max(x1 - x0, y1 - y0) + 0.01, close = [];
    for (const poly of ringsOf(full.objects.units.geometries[u])) for (const ring of poly) for (const k of ring) {
      const bb = arcBox[k < 0 ? ~k : k];
      if (bb[0] <= x1 + m && bb[2] >= x0 - m && bb[1] <= y1 + m && bb[3] >= y0 - m) close.push(k);
    }
    const n = close.reduce((t, k) => t + guard(k, [x0 - m, y0 - m, x1 + m, y1 + m]), 0);
    more += n || close.reduce((t, k) => t + guard(k), 0);
    guarded++;
  };
  mp.forEach((m, i) => {
    const paths = [], fill = (type) => { const c = new CL.Clipper(), out = new CL.Paths(); c.AddPaths(paths, CL.PolyType.ptSubject, true); c.Execute(CL.ClipType.ctUnion, out, type, type); return out; };
    for (const poly of m) poly.forEach((ring, j) => { const path = ring.map(([X, Y]) => ({ X, Y })); if ((shoelace(ring) > 0) === (j > 0)) path.reverse(); paths.push(path); });
    const [all, positive, odd] = [CL.PolyFillType.pftNonZero, CL.PolyFillType.pftPositive, CL.PolyFillType.pftEvenOdd].map(fill);
    for (const [a, b] of [[all, positive], [positive, odd]]) {
      const c = new CL.Clipper(), out = new CL.Paths();
      c.AddPaths(a, CL.PolyType.ptSubject, true);
      c.AddPaths(b, CL.PolyType.ptClip, true);
      c.Execute(CL.ClipType.ctDifference, out, CL.PolyFillType.pftNonZero, CL.PolyFillType.pftNonZero);
      const wrong = out.map((path) => [path.map((q) => [q.X, q.Y])]);
      if (wrong.reduce((t, [r]) => t + signed(r), 0) >= 0.01) near(i, wrong);
    }
  });
  bbs.forEach((b, i) => { for (let gx = Math.floor(b[0] / SCALE); gx <= Math.floor(b[2] / SCALE); gx++) for (let gy = Math.floor(b[1] / SCALE); gy <= Math.floor(b[3] / SCALE); gy++) { const k = cellKey(gx, gy); if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(i); } });
  for (const l of buckets.values()) for (let a = 0; a < l.length; a++) for (let b = a + 1; b < l.length; b++) {
    const i = l[a], j = l[b], key = i * 1e5 + j;
    if (tested.has(key) || !hit(bbs[i], bbs[j])) continue;
    tested.add(key);
    const both = intersect(mp[i], mp[j]);
    if (area(both) >= 0.01) { near(i, both); near(j, both); }
  }
  return more;
};
for (let round = 0, more = 1; more && round < 8; round++) more = check(simplify.simplify(pre, threshold)) + check(simplify.simplify(pre, fine));
const simple = simplify.simplify(pre, threshold), detail = client.quantize(simplify.simplify(pre, fine), 4e5);
const out = client.quantize(simple, 2e5);
out.provinces = provinces;
out.countries = reference.countries;
out.split = split.map((s) => s.c);
out.sources = split.map(({ c, source, license, url }) => ({ c, source, license, url }));
out.detail = 1;
let vertices = 0;
simple.arcs.forEach((arc) => { vertices += arc.length; });
const json = JSON.stringify(out), fineJson = JSON.stringify({ type: "Topology", transform: detail.transform, arcs: detail.arcs });
if (detail.arcs.length !== out.arcs.length) throw new Error("the detail arcs do not line up with units.json");
writeFileSync(resolve(here, "../data/units.json"), json);
writeFileSync(resolve(here, "../data/units-detail.json"), fineJson);
let fineVertices = 0;
detail.arcs.forEach((arc) => { fineVertices += arc.length; });
console.log(features.length, "units,", split.map((s) => s.c + " " + counts[s.c]).join(", ") + ";", simple.arcs.length, "arcs,", vertices, "vertices (" + (vertices / pre.arcs.reduce((t, a) => t + a.length, 0)).toFixed(3) + " of the points kept, " + guarded + " polygons or overlaps guarded);", Math.round(json.length / 1024), "KB,", Math.round(gzipSync(json).length / 1024), "KB gzipped;", Math.round((Date.now() - t0) / 1000) + "s");
console.log("units-detail.json:", fineVertices, "vertices at", keepDetail, "(" + (fineVertices / vertices).toFixed(2) + "x);", Math.round(fineJson.length / 1024), "KB,", Math.round(gzipSync(fineJson).length / 1024), "KB gzipped");

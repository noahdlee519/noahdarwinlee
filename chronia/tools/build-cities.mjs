import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CITY_SINCE, CITY_UNTIL, CITY_NAMES, CITY_ADD, CITY_POP, REBA_FIX, PLACE_DROP, PLACE_EDIT, REGION_SWITCH } from "./city-tables.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(process.argv[2] || "city-sources");
const hbPlaces = resolve(process.argv[3] || "historical-basemaps/geojson", "places.geojson");
const geoNamesPath = resolve(process.argv[4] || resolve(here, "../../uchronia/data/cities.json"));
const out = resolve(here, "../data");
const check = process.argv.includes("--check");

const NOW = 2020, LEAD = 100, LAG = 100, CAP_1900 = 4e4, CAP_1950 = 2e5, EARLY_CAP = 2e3, APPEAR = 5000, UNKNOWN_FROM = 1850, US_TOP = 100, US_GONE = 2500;
const TIER_POP = { 1: 5e6, 2: 1.5e6, 3: 7e5, 4: 2e5 };
const RANKS = [68, 294, 500];
const R_KM = 6371.0088, rad = Math.PI / 180;
const km = (a, b) => {
  const dl = (b.lat - a.lat) * rad, dn = (b.lon - a.lon) * rad;
  const h = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dn / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
};
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\b(city|saint|st|san|santa|sao|el|al|la|le)\b\.?/g, "").replace(/[^a-z]/g, "");
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const csv = (text) => {
  const rows = [];
  let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter((r) => r.length > 1);
};
const yearOfCol = (h) => { const m = /^(BC|AD)_(\d+)$/.exec(h); return m ? (m[1] === "BC" ? -m[2] : +m[2]) : null; };

const readReba = (file, tag) => {
  const rows = csv(readFileSync(resolve(src, file), "latin1"));
  const head = rows[0], years = head.map(yearOfCol);
  return rows.slice(1).map((r) => {
    const pts = [];
    for (let i = 6; i < r.length; i++) if (years[i] !== null && r[i].trim() !== "" && +r[i] > 0) pts.push([years[i], +r[i]]);
    const fix = (s) => s.replace(/�/g, "").trim();
    return { tag, name: fix(r[0]), other: r[1] ? r[1].split(",").map(fix).filter(Boolean) : [], country: r[2], lat: +r[3], lon: +r[4], pts };
  }).filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon) && (r.lat || r.lon));
};

const despike = (pts) => {
  let p = pts.slice();
  for (let pass = 0; pass < 2; pass++) {
    p = p.filter((x, i) => {
      if (i === 0 || i === p.length - 1 || p[i + 1][0] - p[i - 1][0] > 400) return true;
      const a = p[i - 1][1] / x[1], b = p[i + 1][1] / x[1];
      return !((a >= 4 && b >= 4) || (a <= 0.25 && b <= 0.25));
    });
  }
  return p;
};
const mergePts = (lists) => {
  const by = new Map();
  for (const [pts, w] of lists) for (const [y, v] of pts) {
    const e = by.get(y);
    if (!e || w > e[1]) by.set(y, [v, w]);
  }
  return [...by.entries()].sort((a, b) => a[0] - b[0]).map(([y, [v]]) => [y, v]);
};

const fixReba = (rows) => {
  const out = [];
  for (const r of rows) {
    const f = REBA_FIX[r.name];
    if (!f) { out.push(r); continue; }
    if (f.drop) continue;
    const keep = r.pts.filter(([y]) => !(f.before !== undefined && y < f.before) && !(f.after !== undefined && y > f.after));
    if (f.move) out.push({ ...r, name: f.move[2] || r.name, other: f.move[2] ? [] : r.other, lon: f.move[0], lat: f.move[1], pts: keep });
    else if (f.split !== undefined) {
      for (const [part, to] of [[keep.filter(([y]) => y < f.split), f.early], [keep.filter(([y]) => y >= f.split), f.late]]) {
        if (!part.length) continue;
        out.push(to ? { ...r, name: to[2] || r.name, other: to[2] ? [] : r.other, lon: to[0], lat: to[1], pts: part } : { ...r, pts: part });
      }
    } else if (keep.length) out.push({ ...r, pts: keep });
  }
  return out;
};
const chandler = fixReba(readReba("chandlerV2.csv", "c"));
const modelski = fixReba(readReba("modelskiAncientV2.csv", "ma"));
const geo = JSON.parse(readFileSync(geoNamesPath, "utf8"));
const ne = JSON.parse(readFileSync(resolve(src, "ne_10m_populated_places.geojson"), "utf8")).features.map((f) => f.properties);
const hanson = csv(readFileSync(resolve(src, "roman_cities_pop.csv"), "utf8"));

const ents = [];
const grid = new Map();
const cell = (lon, lat) => Math.floor(lon) + "," + Math.floor(lat);
const addEnt = (e) => {
  e.i = ents.length;
  e.names = e.names || new Set();
  e.names.add(norm(e.name));
  ents.push(e);
  const k = cell(e.lon, e.lat);
  if (!grid.has(k)) grid.set(k, []);
  grid.get(k).push(e);
  return e;
};
const near = (lon, lat, maxKm) => {
  const out = [], p = { lon, lat }, r = Math.ceil(maxKm / 80) + 1;
  for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
    const g = grid.get(Math.floor(lon) + dx + "," + (Math.floor(lat) + dy));
    if (g) for (const e of g) { const d = km(p, e); if (d <= maxKm) out.push([e, d]); }
  }
  return out.sort((a, b) => a[1] - b[1]);
};
const findEnt = (lon, lat, keys, nameKm, anyKm) => {
  const cands = near(lon, lat, nameKm);
  const named = cands.find(([e, d]) => keys.some((k) => k && e.names.has(k)));
  if (named) return named[0];
  const any = cands.find(([, d]) => d <= anyKm);
  return any ? any[0] : null;
};

for (const [name, lon, lat, tier] of geo) addEnt({ name, lon, lat, tier, geo: true, sources: new Set(["g"]) });

const rebaRows = [...chandler.map((r) => ({ ...r, pts: despike(r.pts) })), ...modelski];
const relocated = [];
for (const r of rebaRows) {
  const keys = [r.name, ...r.other].map(norm), recent = r.pts.some(([y]) => y >= 1850);
  let e = findEnt(r.lon, r.lat, keys, 60, recent ? 8 : 0);
  if (!e && recent) {
    const same = ents.filter((x) => x.geo && x.names.has(norm(r.name)));
    if (same.length === 1 && km(r, same[0]) < 1000) { e = same[0]; relocated.push(r.name + " (" + r.country + ") " + Math.round(km(r, e)) + " km"); }
  }
  if (!e) e = addEnt({ name: r.name, lon: r.lon, lat: r.lat, sources: new Set() });
  for (const k of keys) if (k.length > 2) e.names.add(k);
  e.sources.add(r.tag);
  e.reba = e.reba || [];
  e.reba.push(r);
  if (!e.country) e.country = r.country;
}

const neBy = new Map();
for (const p of ne) {
  const keys = [p.NAME, p.NAMEASCII, p.NAME_EN, ...(p.NAMEALT || "").split("|")].filter(Boolean).map(norm);
  const e = findEnt(p.LONGITUDE, p.LATITUDE, keys, 40, 6);
  if (!e) continue;
  const prev = neBy.get(e);
  if (!prev || (p.POP_MAX || 0) > (prev.POP_MAX || 0)) neBy.set(e, p);
}
for (const [e, p] of neBy) {
  e.ne = p;
  if (p.WIKIDATAID) e.qid = p.WIKIDATAID;
  if (!e.country) e.country = p.ADM0NAME;
}

const hHead = hanson[0], hi = (k) => hHead.indexOf(k);
const cleanAncient = (s) => s.replace(/\s*\((?:[^()]*)\)/g, "").replace(/\?/g, "").trim();
for (const r of hanson.slice(1)) {
  const m = /POINT \(([-\d.]+) ([-\d.]+)\)/.exec(r[hi("geometry")]);
  if (!m) continue;
  const lon = +m[1], lat = +m[2], name = cleanAncient(r[hi("Ancient Toponym")]), modernName = r[hi("Modern Toponym")];
  const keys = [modernName, name].map(norm);
  const h = { name, modernName, province: r[hi("Province")], start: +r[hi("Start Date")], end: r[hi("End Date")] === "" ? null : Math.round(+r[hi("End Date")]), pop: +r[hi("pop_est")] || 0, rank: r[hi("Barrington Atlas Rank")] };
  let e = findEnt(lon, lat, keys, 8, 3);
  if (e && e.hanson && e.hanson.pop >= h.pop) continue;
  if (!e) e = addEnt({ name, lon, lat, sources: new Set() });
  e.sources.add("h");
  e.hanson = h;
  e.names.add(norm(name));
  if (modernName) e.names.add(norm(modernName));
}

let neHanson = 0;
for (const e of ents) {
  if (!e.hanson || e.reba || e.geo || e.ne) continue;
  const keys = [e.hanson.modernName, e.hanson.name].map(norm);
  let best = null;
  for (const p of ne) {
    if (Math.abs(p.LATITUDE - e.lat) > 0.1 || Math.abs(p.LONGITUDE - e.lon) > 0.15) continue;
    const d = km(e, { lon: p.LONGITUDE, lat: p.LATITUDE }), named = [p.NAME, p.NAMEASCII, p.NAME_EN].filter(Boolean).some((n) => keys.includes(norm(n)));
    if ((named && d < 8) || d < 3) { best = p; break; }
  }
  if (!best) continue;
  e.ne = best;
  if (best.WIKIDATAID) e.qid = best.WIKIDATAID;
  e.modernName = best.NAME_EN || best.NAME;
  neHanson++;
}

let hb = [];
try { hb = JSON.parse(readFileSync(hbPlaces, "utf8")).features; } catch (err) { console.warn("historical-basemaps places not read: " + err.message); }
for (const f of hb) {
  const p = f.properties;
  if (!f.geometry || f.geometry.type !== "Point" || !Number.isFinite(p.inhabitedSince) || PLACE_DROP.has(p.name)) continue;
  const ed = PLACE_EDIT[p.name] || {};
  const [lon, lat] = f.geometry.coordinates, name = ed.name || p.name;
  let e = findEnt(lon, lat, [norm(name)], 25, 5);
  if (!e) e = addEnt({ name, lon, lat, sources: new Set() });
  e.sources.add("p");
  e.hb = { since: ed.since ?? p.inhabitedSince, until: ed.until ?? (Number.isFinite(p.inhabitedUntil) ? p.inhabitedUntil : null) };
}

for (const [name, lon, lat, since, until, pop] of CITY_ADD) addEnt({ name, lon, lat, sources: new Set(["t"]), add: { since, until }, tPop: pop ? { pts: pop } : undefined });

const WD = new Map();
for (const line of readFileSync(resolve(here, "cities-wikidata.txt"), "utf8").split("\n")) {
  const [q, inc, pops] = line.split("|");
  if (!q) continue;
  WD.set(q, { inc: inc === "" || inc === undefined ? null : +inc, pts: pops ? pops.split(",").map((v) => v.split(":").map(Number)) : [] });
}
const usPath = resolve(src, "1790-2010_MASTER.csv");
let usMatched = 0, usAdded = 0;
if (existsSync(usPath)) {
  const rows = csv(readFileSync(usPath, "utf8").replace(/\r\n?/g, "\n")), head = rows[0], col = (n) => head.indexOf(n);
  const decades = [];
  for (let y = 1790; y <= 2010; y += 10) decades.push(y);
  const recs = rows.slice(1).map((r) => ({ name: r[col("City")], st: r[col("ST")], lon: +r[col("LON")], lat: +r[col("LAT")], pts: decades.map((y) => [y, +r[col(String(y))] || 0]).filter(([, p]) => p > 0) }))
    .filter((r) => r.name && r.pts.length && Number.isFinite(r.lon) && Number.isFinite(r.lat));
  const top = new Set();
  for (const y of decades) recs.filter((r) => r.pts.some(([t]) => t === y)).sort((a, b) => b.pts.find(([t]) => t === y)[1] - a.pts.find(([t]) => t === y)[1]).slice(0, US_TOP).forEach((r) => top.add(r));
  const peak = (r) => Math.max(...r.pts.map(([, p]) => p));
  for (const r of recs.sort((a, b) => peak(b) - peak(a))) {
    const named = near(r.lon, r.lat, 20).find(([e]) => e.names.has(norm(r.name)));
    let e = named ? named[0] : null;
    if (e && e.us) continue;
    if (!e) {
      if (!top.has(r) || near(r.lon, r.lat, 3).length) continue;
      e = addEnt({ name: r.name, lon: r.lon, lat: r.lat, sources: new Set(["u"]), usGone: true });
      usAdded++;
    } else usMatched++;
    e.sources.add("u");
    e.us = r;
  }
}

const toT = (v) => {
  if (typeof v === "number") return v;
  const [y, m, d] = v.split("-").map(Number), a = Date.UTC(y, 0, 1), len = (Date.UTC(y + 1, 0, 1) - a) / 864e5;
  return Math.floor((y + (Date.UTC(y, m - 1, d) - a) / 864e5 / len) * 1e4) / 1e4;
};
const resolveKey = (key) => {
  const [name, hint] = key.split("|");
  const near = (e) => hint === undefined || Math.round(e.lon / 10) * 10 === +hint;
  let c = ents.filter((e) => e.name === name && near(e));
  if (!c.length) c = ents.filter((e) => e.names.has(norm(name)) && near(e));
  c.sort((a, b) => (b.geo ? 1 : 0) - (a.geo ? 1 : 0) || (b.reba ? b.reba.length : 0) - (a.reba ? a.reba.length : 0));
  return c[0] || null;
};
const unmatched = [], claimed = new Map();
const applyTable = (table, field) => {
  for (const key of Object.keys(table)) {
    const e = resolveKey(key);
    if (!e) { unmatched.push(field + ":" + key); continue; }
    const k = field + e.i;
    if (claimed.has(k)) { unmatched.push(field + ":" + key + " (same city as " + claimed.get(k) + ")"); continue; }
    claimed.set(k, key);
    e[field] = table[key];
  }
};
applyTable(CITY_SINCE, "tSince");
applyTable(CITY_UNTIL, "tUntil");
applyTable(CITY_NAMES, "tNames");
applyTable(CITY_POP, "tPop");

const URBAN = [[1800, 0.016], [1850, 0.027], [1900, 0.05], [1950, 0.17], [2020, 1]];
const urbanAt = (t) => t <= 1800 ? 0.016 : interp(URBAN, t);
const prominentFrom = (pts, lo) => {
  if (!pts.length) return 1900;
  const est = (t) => t >= pts[0][0] ? interp(pts, t) : pts[0][1] * urbanAt(t) / urbanAt(pts[0][0]);
  for (let t = lo; t <= NOW; t++) if (est(t) >= APPEAR) return Math.min(t, pts[pts.length - 1][0]);
  return Math.min(1900, pts[pts.length - 1][0]);
};
const switchFor = (province) => {
  for (const [re, y] of REGION_SWITCH) if (re.test(province)) return y;
  return 500;
};
const interp = (pts, t) => {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) {
    const [y0, p0] = pts[i - 1], [y1, p1] = pts[i];
    return p0 * Math.pow(p1 / p0, (t - y0) / (y1 - y0));
  }
  return pts[pts.length - 1][1];
};

for (const e of ents) {
  let pts = [];
  if (e.reba) {
    const ma = e.reba.filter((r) => r.tag === "ma").flatMap((r) => r.pts);
    const c = e.reba.filter((r) => r.tag === "c").map((r) => r.pts);
    const cAll = mergePts(c.map((p) => [p, 1])).filter(([y]) => y > 1000 || !ma.some(([m]) => Math.abs(m - y) < 60));
    pts = mergePts([[despike(ma), 2], [cAll, 1]]);
  }
  if (e.hanson && e.hanson.pop && !pts.some(([y]) => y >= -100 && y <= 300)) pts = mergePts([[pts, 1], [[[100, e.hanson.pop]], 1]]);
  const un = [];
  if (e.ne) for (let y = 1950; y <= 2020; y += 5) if (e.ne["POP" + y] > 0) un.push([y, e.ne["POP" + y] * 1000]);
  if (un.length) pts = pts.filter(([y]) => y < 1950).concat(un);
  if (e.us) {
    const cp = e.us.pts, c0 = cp[0][0], c1 = un.length ? Math.min(cp[cp.length - 1][0], un[0][0] - 1) : cp[cp.length - 1][0];
    pts = pts.filter(([y]) => y < c0 - 5 || y > c1 + 5).concat(cp.filter(([y]) => y <= c1)).sort((a, b) => a[0] - b[0]);
  }
  const wd = !e.us && e.qid ? WD.get(e.qid) : null;
  if (wd && wd.pts.length) {
    const cut = pts.length ? pts[0][0] - 1 : Infinity, add = wd.pts.filter(([y, p]) => y < cut && p > 0);
    if (add.length) pts = add.concat(pts);
  }
  const modern = !!(e.geo || e.ne || pts.some(([y]) => y >= 1900));
  e.real = pts.length > 0;
  if (modern && !e.usGone && !pts.some(([y]) => y >= 1990)) {
    const anchor = e.ne && e.ne.POP_MIN > 0 ? e.ne.POP_MIN : TIER_POP[e.tier || 4];
    pts.push([NOW, anchor]);
  }
  const has = (a, b) => pts.some(([y]) => y >= a && y <= b);
  if (modern && !e.add && !e.usGone) {
    const scaled = (t, cap) => { const nx = pts.find(([y]) => y > t); return Math.min(cap, nx[1] * urbanAt(t) / urbanAt(nx[0])); };
    if (!has(1925, 1975)) pts.push([1950, scaled(1950, CAP_1950)]);
    pts.sort((a, b) => a[0] - b[0]);
    if (!has(1880, 1920) && (e.tSince === undefined || toT(e.tSince) <= 1900)) pts.push([1900, scaled(1900, CAP_1900)]);
  }
  pts.sort((a, b) => a[0] - b[0]);
  if (e.tPop) {
    const d = e.tPop.drop, own = e.tPop.pts.map(([y, k]) => [y, k * 1000]);
    pts = pts.filter(([y]) => !(d && y >= d[0] && y <= d[1]) && !own.some(([o]) => Math.abs(o - y) < 1)).concat(own).sort((a, b) => a[0] - b[0]);
    e.real = true;
  }
  for (let i = pts.length - 1; i > 0; i--) {
    const [y0, p0] = pts[i - 1], [y1, p1] = pts[i];
    if (y1 - y0 > 250) pts.splice(i, 0, [y0 + 100, Math.min(p0, p1) / 3], [y1 - 100, Math.min(p0, p1) / 3]);
  }
  const firstReal = pts.length ? pts[0][0] : null, fromHanson = e.hanson && pts.length && pts[0][0] === 100 && pts[0][1] === e.hanson.pop;
  const dated = [e.hb && e.hb.since, e.hanson && e.hanson.start, e.add && e.add.since].filter((v) => Number.isFinite(v));
  let since;
  if (e.tSince !== undefined) {
    since = toT(e.tSince);
    if (e.real && !fromHanson && firstReal - LEAD > since) { const v = Math.min(pts[0][1] / 4, EARLY_CAP); pts.unshift([since, v], [firstReal - LEAD, v]); }
  }
  else if (dated.length) since = Math.min(...dated, firstReal ?? Infinity);
  else if (e.us && firstReal >= e.us.pts[0][0] - 5) { since = prominentFrom(pts, e.us.pts[0][0] - 10); if (since < pts[0][0]) pts.unshift([since, pts[0][1] / 2]); }
  else if (e.real && firstReal < 1850) { since = firstReal - LEAD; pts.unshift([since, pts[0][1] / 4]); }
  else {
    if (e.real) since = prominentFrom(pts, Math.max(1800, firstReal - LEAD));
    else {
      const now = pts.length ? pts[pts.length - 1][1] : APPEAR;
      since = NOW;
      for (let t = UNKNOWN_FROM; t <= NOW; t++) if (now * urbanAt(t) >= APPEAR) { since = t; break; }
    }
    if (wd && wd.inc !== null && wd.inc > since && wd.inc < (e.real ? firstReal : NOW)) since = wd.inc;
  }
  if (pts.length && pts[0][0] >= 1850 && since < pts[0][0]) pts.unshift([Math.floor(since), pts[0][1] * urbanAt(since) / urbanAt(pts[0][0])]);
  pts = pts.filter(([y], i) => y >= Math.floor(since) || (pts[i + 1] && pts[i + 1][0] > since));
  if (pts.length && pts[0][0] < since) pts[0] = [Math.floor(since), interp(pts, since)];
  let until = null;
  const datedEnd = [e.hb && e.hb.until, e.add && e.add.until, e.hanson && e.hanson.end].filter((v) => Number.isFinite(v));
  if (e.tUntil !== undefined) until = e.tUntil;
  else if (e.usGone) {
    const big = e.us.pts.filter(([, p]) => p >= US_GONE), last = big.length ? big[big.length - 1][0] : e.us.pts[e.us.pts.length - 1][0];
    if (last < 1990) { until = last + 10; pts.push([until, interp(pts, last) / 2]); }
  }
  else if (!modern) {
    if (datedEnd.length) until = Math.max(...datedEnd);
    else if (e.hanson && !e.reba) { until = switchFor(e.hanson.province); if (pts.length) pts.push([until, pts[pts.length - 1][1] / 2]); }
    else if (pts.length) { until = pts[pts.length - 1][0] + LAG; pts.push([until, pts[pts.length - 1][1] / 4]); }
  }
  if (until !== null && pts.length) pts = pts.filter(([y]) => y <= until);
  if (!pts.length) pts = [[Math.floor(since), e.hanson ? Math.max(e.hanson.pop, 1000) : 5000]];
  e.pts = pts.map(([y, p]) => [y, Math.max(0.1, Math.round(p / 100) / 10)]);
  e.since = since;
  e.until = until;
  let steps = null;
  if (e.tNames) steps = e.tNames.map(([w, n], i) => [i === 0 ? -9999 : toT(w), n]);
  else if (e.hanson && norm(e.hanson.name) !== norm(e.name) && (e.reba || e.geo)) steps = [[-9999, e.hanson.name], [switchFor(e.hanson.province), e.name]];
  else if (e.hanson && e.modernName && norm(e.modernName) !== norm(e.hanson.name)) steps = [[-9999, e.hanson.name], [switchFor(e.hanson.province), e.modernName]];
  if (steps) {
    steps = steps.filter((s, i) => i === 0 || s[1] !== steps[i - 1][1]);
    e.display = steps[steps.length - 1][1];
    if (steps.length === 1) { e.display = steps[0][1]; steps = null; }
  }
  e.steps = steps;
  e.display = e.display || e.name;
}

const live = ents.filter((e) => !(e.until !== null && e.until <= e.since));
const popAt = (e, t) => interp(e.pts, t);
const SAMPLES = [];
for (let t = -3700; t <= 2020; t += 10) SAMPLES.push(t);
const best = new Map(live.map((e) => [e, Infinity]));
const atSample = new Map();
for (const t of SAMPLES) {
  const alive = live.filter((e) => e.since <= t && (e.until === null || t < e.until)).sort((a, b) => popAt(b, t) - popAt(a, t));
  alive.forEach((e, r) => { if (r < best.get(e)) best.set(e, r); });
  atSample.set(t, alive);
}

const ids = new Map(), used = new Set();
for (const e of live) {
  let id = slug(e.display) || "city";
  if (used.has(id)) id += "-" + slug(e.country || "") ;
  let n = 2, base = id;
  while (used.has(id)) id = base + "-" + n++;
  used.add(id);
  ids.set(e, id);
}
const r3 = (v) => Math.round(v * 1000) / 1000;
const sig2 = (v) => { if (v < 1) return Math.round(v * 10) / 10; const m = Math.pow(10, Math.floor(Math.log10(v)) - 1); return Math.round(v / m) * m; };
const thin = (pts, keep) => {
  let last = -Infinity;
  const held = new Set(keep ? keep.map(([y]) => y) : []);
  const kept = pts.filter((p, i) => { if (i === 0 || i === pts.length - 1 || held.has(p[0]) || p[0] - last >= 20) { last = p[0]; return true; } return false; });
  return kept.filter((p, i) => held.has(p[0]) || !kept[i + 1] || !held.has(kept[i + 1][0]) || kept[i + 1][0] - p[0] >= 5 || i === 0).map(([y, v]) => [y, sig2(v)]);
};
const rowOf = (e) => {
  const row = [ids.get(e), e.display, r3(e.lon), r3(e.lat), e.since, e.until, thin(e.pts, e.tPop && e.tPop.pts).flat(), e.steps || 0, e.qid || 0];
  while (row.length > 7 && !row[row.length - 1]) row.pop();
  return row;
};
const major = live.filter((e) => best.get(e) < RANKS[2]), minor = live.filter((e) => best.get(e) >= RANKS[2]);
const order = (a, b) => best.get(a) - best.get(b);
major.sort(order);
minor.sort(order);
const SOURCES = "Reba, Reitsma, and Seto (2016) from Chandler (1987) and Modelski (2003); UN World Urbanization Prospects and Hanson (2016) via SDAM; Natural Earth; GeoNames via UCHRONIA; historical-basemaps; CHRONIA's tables";
writeFileSync(resolve(out, "cities-dated.json"), JSON.stringify({ ranks: RANKS, sources: SOURCES, rows: major.map(rowOf) }));
writeFileSync(resolve(out, "cities-dated-minor.json"), JSON.stringify({ rows: minor.map(rowOf) }));

if (relocated.length) console.warn("Reba rows moved to the GeoNames city of the same name: " + relocated.join(", "));
if (unmatched.length) console.warn("table keys not matched: " + unmatched.join(", "));
console.log(neHanson + " towns of Hanson's database continue as Natural Earth places");
console.log(live.length + " cities, " + major.length + " in cities-dated.json, " + minor.length + " in cities-dated-minor.json, " + live.filter((e) => e.steps).length + " with names by date");
if (check) {
  for (const t of [-1500, -500, 1, 300, 800, 1000, 1200, 1500, 1700, 1850, 1890, 1900, 1910, 1950, 2000, 2020]) {
    const a = atSample.get(Math.round(t / 10) * 10) || [];
    const nameAt = (e) => { let n = e.display; if (e.steps) for (const [w, s] of e.steps) if (w <= t) n = s; return n; };
    console.log(t, a.length, a.slice(0, 25).map((e) => nameAt(e) + " " + Math.round(popAt(e, t) / 1000)).join(", "));
  }
}
if (process.env.DBG) for (const n of process.env.DBG.split(",")) for (const e of ents.filter((x) => x.display === n || x.name === n)) console.log(JSON.stringify({ name: e.name, d: e.display, lon: e.lon, lat: e.lat, geo: e.geo, tier: e.tier, reba: (e.reba || []).map((r) => [r.tag, r.name, r.other.join("/"), r.lon, r.lat, r.pts.length]), ne: e.ne && [e.ne.NAME, e.ne.LONGITUDE, e.ne.LATITUDE, e.ne.POP_MAX, e.ne.POP2000], h: e.hanson && e.hanson.name, pts: e.pts, since: e.since, until: e.until }));

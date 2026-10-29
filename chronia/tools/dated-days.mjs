// Dates the changes of borders from 1801 to 1885 to the day.
//
// Cliopatria gives its spans in whole years: a span runs from 1 January of its first year to 31 December
// of its last. A change in year Y is every span that starts in Y and every span that ends in Y - 1.
// tools/dated-days.json gives the day of each change it names (a treaty coming into force, a declaration
// of independence, an annexation), with the names of the states it changed. A span named by an entry of
// its year takes the entry's day: as its first day if it starts in Y, or the day before as its last day
// if it ends in Y - 1. A span no entry names takes the day of the nearest named span it is linked to by
// overlapping shapes (a span that starts in Y overlaps one that ends in Y - 1 by more than OVERLAP_KM2),
// so the land that passes from one state to another changes hands on one day, and a people whose land a
// colony takes changes with the colony. Spans linked to no named span stay on 1 January of their year.
// Changes in 1800 stay on 1 January 1800, since the spans that end in 1799 are in the file of the 1700s.
//
// Used by build-eras.mjs when it writes the century files, and on its own (node tools/dated-days.mjs
// node_modules) to date the files already in data/ without rebuilding them.

export const DAYS_FROM = 1801, DAYS_TO = 1885, OVERLAP_KM2 = 20, LINK_SHARE = 0.02;
const DAY0 = Date.UTC(1886, 0, 1), DAY_MS = 86400000;

// Days since 1 January 1886, as the page and modern.json count them.
export function dayOf(y, m, d) { return Math.round((Date.UTC(y, m - 1, d) - DAY0) / DAY_MS); }
export function dayOfIso(iso) { const [y, m, d] = iso.split("-").map(Number); return dayOf(y, m, d); }
export function isoOfDay(day) { const d = new Date(DAY0 + day * DAY_MS); return d.toISOString().slice(0, 10); }

function boxOf(rings) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of rings[0]) { if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; }
  return b;
}
const hit = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
// Area in km² of MultiPolygon coordinates, on a plane scaled at each ring's latitude (enough for
// telling an overlap from a shared edge).
function km2(polys) {
  let s = 0;
  for (const p of polys) p.forEach((ring, k) => {
    let a = 0;
    for (let i = 0; i < ring.length - 1; i++) a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    a = Math.abs(a) / 2 * 111.32 * 111.32 * Math.cos(ring[0][1] * Math.PI / 180);
    s += k ? -a : a;
  });
  return s;
}
function parts(polys) {
  const list = (polys || []).map((p) => ({ p, box: boxOf(p) }));
  const box = list.reduce((b, q) => [Math.min(b[0], q.box[0]), Math.min(b[1], q.box[1]), Math.max(b[2], q.box[2]), Math.max(b[3], q.box[3])], [Infinity, Infinity, -Infinity, -Infinity]);
  return { list, box };
}

// The area two shapes share, in km², intersecting only the pieces whose boxes meet; stops counting
// at `enough`.
function overlapKm2(clip, A, B, enough = Infinity) {
  if (!A.list.length || !B.list.length || !hit(A.box, B.box)) return 0;
  let sum = 0;
  for (const a of A.list) {
    if (!hit(a.box, B.box)) continue;
    for (const b of B.list) {
      if (!hit(a.box, b.box)) continue;
      try { sum += km2(clip.intersection([a.p], [b.p])); } catch (e) { /* a bad ring: no overlap counted */ }
      if (sum >= enough) return sum;
    }
  }
  return sum;
}

// spans: [{ first, last, names: [name, ...], polys }] (MultiPolygon coordinates). Sets dayFrom on spans
// whose start is dated and dayTo on spans whose end is, and returns every change day from 1800 (dated
// or 1 January), the changes dated, and the entries that named no span.
export function dateChanges(spans, table, clip, log = () => {}) {
  const byYear = new Map();
  for (const e of table) {
    if (!byYear.has(e.y)) byYear.set(e.y, []);
    const day = dayOfIso(e.date);
    // Cliopatria sometimes counts a change from the year before or after it came into force.
    if (!(day >= dayOf(e.y - 1, 1, 1) && day <= dayOf(e.y + 1, 12, 31))) throw new Error("dated-days: " + e.date + " (" + e.what + ") is more than a year from " + e.y);
    byYear.get(e.y).push({ ...e, day, used: 0 });
  }
  const shape = new Map(), shapeOf = (s) => { if (!shape.has(s)) shape.set(s, parts(s.polys)); return shape.get(s); };
  const days = new Set(), report = [];
  for (const s of spans) {
    if (s.first >= 1800 && s.first <= DAYS_TO) days.add(dayOf(s.first, 1, 1));
    if (s.last + 1 >= 1800 && s.last + 1 <= DAYS_TO) days.add(dayOf(s.last + 1, 1, 1));
  }
  const inBox = (e, s) => { if (!e.box) return true; const b = shapeOf(s).box, x = (b[0] + b[2]) / 2, y = (b[1] + b[3]) / 2; return e.box[0] <= x && x <= e.box[2] && e.box[1] <= y && y <= e.box[3]; };
  for (let Y = DAYS_FROM; Y <= DAYS_TO; Y++) {
    const entries = byYear.get(Y) || [];
    const S = spans.filter((s) => s.first === Y), E = spans.filter((s) => s.last === Y - 1);
    if (!S.length && !E.length) continue;
    const all = S.concat(E), isStart = new Set(S);
    // Named spans take their entry's day; of two entries naming one span, the later in the table.
    const day = new Map(), why = new Map();
    for (const s of all) for (const e of entries) if (s.names.some((n) => e.names.includes(n)) && inBox(e, s)) { day.set(s, e.day); why.set(s, e); }
    if (!day.size) continue;
    // The rest take the day of a named span they overlap, or of their own state's other shape in the
    // change (its old shape when the new one is dated, and the other way round, or its shape under a new
    // name). The day passes once to another state's shape, and only across an overlap of at least
    // LINK_SHARE of the smaller shape, so it does not run along a chain of neighbours whose coarse borders
    // overlap. Overlaps are measured only for the shapes the day reaches.
    const size = new Map(), sizeOf = (s) => { if (!size.has(s)) size.set(s, km2(s.polys || [])); return size.get(s); };
    const linkCache = new Map(), linksOf = (a) => {
      if (linkCache.has(a)) return linkCache.get(a);
      const out = [];
      for (const b of isStart.has(a) ? E : S) {
        if (!hit(shapeOf(a).box, shapeOf(b).box)) continue;
        // Shapes of one name, or sharing at least half the smaller (a state renamed, a new regime), count
        // as one state.
        const k = overlapKm2(clip, shapeOf(a), shapeOf(b)), small = Math.min(sizeOf(a), sizeOf(b)), same = a.names[0] === b.names[0] || k >= 0.5 * small;
        if (k > OVERLAP_KM2 && (same || k >= LINK_SHARE * small)) out.push([b, k, same]);
      }
      linkCache.set(a, out);
      return out;
    };
    const cost = new Map([...day.keys()].map((s) => [s, 0]));
    let front = [...day.keys()];
    while (front.length) {
      const next = new Map();
      for (const s of front) for (const [o, k, same] of linksOf(s)) {
        const c = cost.get(s) + (same ? 0 : 1);
        if (c > 1 || (cost.has(o) && cost.get(o) <= c)) continue;
        const best = next.get(o);
        if (!best || c < best[2] || (c === best[2] && k > best[1])) next.set(o, [s, k, c]);
      }
      for (const [o, [s, , c]] of next) { day.set(o, day.get(s)); why.set(o, why.get(s)); cost.set(o, c); }
      front = [...next.keys()];
    }
    const left = all.filter((s) => !day.has(s));
    if (!left.length) days.delete(dayOf(Y, 1, 1));
    for (const [s, d] of day) {
      const named = cost.get(s) === 0 && s.names.some((n) => why.get(s).names.includes(n));
      if (isStart.has(s)) { s.dayFrom = d; s.fromNamed = named; } else { s.dayTo = d - 1; s.toNamed = named; }
      days.add(d); why.get(s).used++;
    }
    for (const e of entries) if (e.used) report.push({ y: Y, date: e.date, what: e.what, spans: [...new Set(all.filter((s) => why.get(s) === e).map((s) => (isStart.has(s) ? "+" : "-") + s.names[0]))] });
    log("  " + Y + ": " + day.size + " of " + all.length + " spans dated by " + entries.filter((e) => e.used).length + " of " + entries.length + " entries");
  }
  // A span whose first day is the day after its last is never shown (two changes on one day). One whose
  // first day comes later still (two changes a year apart, dated across each other) loses the day it
  // took from a neighbour, or, if an entry named it for both, both days.
  for (const s of spans) {
    const a = () => s.dayFrom ?? (s.first < 1000 ? -Infinity : dayOf(s.first, 1, 1)), b = () => s.dayTo ?? dayOf(s.last, 12, 31);
    if (a() <= b() + 1) continue;
    if (s.dayFrom !== undefined && !s.fromNamed) delete s.dayFrom;
    if (a() > b() + 1 && s.dayTo !== undefined && !s.toNamed) delete s.dayTo;
    if (a() > b() + 1) { delete s.dayFrom; delete s.dayTo; }
    log("  " + s.names[0] + " " + s.first + "-" + s.last + ": first day after last, " + (s.dayFrom === undefined && s.dayTo === undefined ? "days dropped" : "a neighbour's day dropped"));
  }
  const unused = [...byYear.values()].flat().filter((e) => !e.used);
  return { days: [...days].sort((a, b) => a - b), report, unused };
}

// On its own: dates data/dated/1800.json and data/eras.json in place.
if (import.meta.url === "file://" + process.argv[1]) {
  const { readFileSync, writeFileSync } = await import("node:fs");
  const { resolve, dirname } = await import("node:path");
  const { createRequire } = await import("node:module");
  const { fileURLToPath } = await import("node:url");
  const here = dirname(fileURLToPath(import.meta.url));
  const require = createRequire(resolve(process.argv[2] || "node_modules", "x.js"));
  const client = require("topojson-client"), clip = require("polygon-clipping");
  const data = resolve(here, "../data"), eras = JSON.parse(readFileSync(resolve(data, "eras.json"))), names = eras.polities.map((p) => p[0]);
  const file = resolve(data, "dated/1800.json"), ch = JSON.parse(readFileSync(file));
  const spans = ch.rows.map((r, i) => {
    const g = client.feature(ch.hi, ch.hi.objects.p.geometries[i]).geometry;
    return { i, first: r[2], last: r[3], names: [names[r[0]]], polys: !g ? [] : g.type === "Polygon" ? [g.coordinates] : g.coordinates };
  });
  const table = JSON.parse(readFileSync(resolve(here, "dated-days.json"))).changes;
  const t0 = Date.now();
  const res = dateChanges(spans, table, clip, (m) => console.log(m));
  ch.days = spans.filter((s) => s.dayFrom !== undefined || s.dayTo !== undefined).map((s) => [s.i, s.dayFrom ?? null, s.dayTo ?? null]);
  writeFileSync(file, JSON.stringify(ch));
  eras.dated.days = res.days;
  writeFileSync(resolve(data, "eras.json"), JSON.stringify(eras));
  if (process.argv[3]) writeFileSync(resolve(process.argv[3]), JSON.stringify({ dated: res.report, unused: res.unused.map((e) => [e.y, e.date, e.what]) }, null, 1));
  console.log(res.report.length + " changes dated, " + ch.days.length + " rows with days, " + res.days.length + " change days from 1800, " + res.unused.length + " entries unused, in " + Math.round((Date.now() - t0) / 1000) + " s");
}

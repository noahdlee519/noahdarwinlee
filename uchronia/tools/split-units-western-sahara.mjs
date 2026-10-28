import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const unitsPath = resolve(here, "../data/units.json");
const detailPath = resolve(here, "../data/units-detail.json");
const provinces = JSON.parse(readFileSync(resolve(here, "../data/provinces.json"), "utf8"));
const provDetail = JSON.parse(readFileSync(resolve(here, "../data/provinces-detail.json"), "utf8"));
const units = JSON.parse(readFileSync(unitsPath, "utf8"));
const detail = JSON.parse(readFileSync(detailPath, "utf8"));

const SPLITS = [
  { province: "Guelmim-Es Semara", added: "Es Semara" },
  { province: "Laâyoune-Boujdour-Sakia El Hamra", added: "Tarfaya" }
];

const provGeoms = provinces.objects.provinces.geometries;
const provNames = provGeoms.map((g) => g.properties);
if (units.provinces.length + SPLITS.length !== provNames.length) throw new Error("units.json is already split, or provinces.json is not");

const decode = (arcs) => arcs.map((arc) => { let x = 0, y = 0; return arc.map((p) => [(x += p[0]), (y += p[1])]); });
const encode = (arcs) => arcs.map((arc) => { let x = 0, y = 0; return arc.map((p) => { const d = [p[0] - x, p[1] - y]; x = p[0]; y = p[1]; return d; }); });
const tops = [units, detail].map((t) => ({ arcs: decode(t.arcs), s: t.transform.scale, o: t.transform.translate }));
const toLL = (T, p) => [p[0] * T.s[0] + T.o[0], p[1] * T.s[1] + T.o[1]];
const toQ = (T, p) => [Math.round((p[0] - T.o[0]) / T.s[0]), Math.round((p[1] - T.o[1]) / T.s[1])];
const geoms = units.objects.units.geometries;
const flat = (g) => (g.type === "Polygon" ? g.arcs : g.type === "MultiPolygon" ? g.arcs.flat() : []);

const pd = { arcs: decode(provDetail.arcs), s: provDetail.transform.scale, o: provDetail.transform.translate };
function cutLine(a, b) {
  const own = (g) => new Set(flat(g).flat().map((r) => (r < 0 ? ~r : r)));
  const A = own(provGeoms[a]), B = own(provGeoms[b]);
  const shared = [...A].filter((i) => B.has(i));
  if (!shared.length) throw new Error("provinces " + a + " and " + b + " share no boundary");
  const ring = flat(provGeoms[a]).find((r) => r.some((x) => shared.includes(x < 0 ? ~x : x)));
  const n = ring.length, isShared = (k) => shared.includes(ring[k] < 0 ? ~ring[k] : ring[k]);
  let k0 = ring.findIndex((x, k) => isShared(k) && !isShared((k - 1 + n) % n));
  if (k0 < 0) throw new Error("the shared boundary is the whole ring");
  const pts = [];
  for (let k = k0; isShared(k % n); k++) {
    const r = ring[k % n], arc = pd.arcs[r < 0 ? ~r : r].map((p) => toLL(pd, p));
    (r < 0 ? arc.reverse() : arc).forEach((p, j) => { if (!(pts.length && j === 0)) pts.push(p); });
  }
  return pts;
}

function nearest(T, ringRefs, p, onlyArc) {
  let best = null;
  for (const ref of ringRefs) {
    const i = ref < 0 ? ~ref : ref;
    if (onlyArc !== undefined && i !== onlyArc) continue;
    const pts = T.arcs[i].map((q) => toLL(T, q));
    for (let k = 0; k + 1 < pts.length; k++) {
      const a = pts[k], b = pts[k + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
      const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0;
      const q = [a[0] + t * dx, a[1] + t * dy], d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (!best || d < best.d) best = { arc: i, seg: k, t, at: q, d };
    }
  }
  return best;
}

function splitArc(i, places) {
  const m = tops[0].arcs.length;
  tops.forEach((T, n) => {
    const pts = T.arcs[i], q = toQ(T, places[n].at), k = places[n].seg;
    T.arcs[i] = pts.slice(0, k + 1).concat([q]);
    T.arcs.push([q].concat(pts.slice(k + 1)));
  });
  for (const g of geoms) {
    const fix = (ring) => ring.flatMap((r) => (r === i ? [i, m] : r === ~i ? [~m, ~i] : [r]));
    if (g.type === "Polygon") g.arcs = g.arcs.map(fix);
    else if (g.type === "MultiPolygon") g.arcs = g.arcs.map((p) => p.map(fix));
  }
}

const startOf = (T, ref) => { const a = T.arcs[ref < 0 ? ~ref : ref]; return ref < 0 ? a[a.length - 1] : a[0]; };
const insideRing = (pts, p) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
};

for (const sp of SPLITS) {
  const pOld = provNames.findIndex((p) => p.n === sp.province.replace("Guelmim-Es Semara", "Guelmim"));
  const pNew = provNames.findIndex((p) => p.n === sp.added);
  if (pOld < 0 || pNew < units.provinces.length) throw new Error("provinces.json has no split of " + sp.province);
  const u = geoms.findIndex((g) => g.properties.p === pOld);
  if (u < 0 || geoms.filter((g) => g.properties.p === pOld).length !== 1 || geoms[u].type !== "Polygon" || geoms[u].arcs.length !== 1) throw new Error(sp.province + " is not one unit of one ring");
  const line = cutLine(pOld, pNew);
  const ends = [line[0], line[line.length - 1]];
  const marks = ends.map((e) => {
    const ring = geoms[u].arcs[0];
    const c0 = nearest(tops[0], ring, e), c1 = nearest(tops[1], ring, e, c0.arc);
    if (c0.d > 0.05 || c1.d > 0.05) throw new Error(sp.province + ": the cut ends " + c0.d.toFixed(3) + "° from the unit's edge");
    const atEnd = [c0, c1].every((c, n) => { const T = tops[n], a = T.arcs[c.arc]; const q = toQ(T, c.at); return (q[0] === a[0][0] && q[1] === a[0][1]) || (q[0] === a[a.length - 1][0] && q[1] === a[a.length - 1][1]); });
    if (!atEnd) splitArc(c0.arc, [c0, c1]);
    return [toQ(tops[0], c0.at), toQ(tops[1], c1.at)];
  });
  const ring = geoms[u].arcs[0];
  const cuts = tops.map((T, n) => ring.map((ref, k) => k).filter((k) => marks.some((m) => { const s = startOf(T, ring[k]); return m[n][0] === s[0] && m[n][1] === s[1]; })));
  if (cuts[0].length !== 2 || String(cuts[0]) !== String(cuts[1])) throw new Error(sp.province + ": cut points not found cleanly " + JSON.stringify(cuts));
  const [k1, k2] = cuts[0];
  const halfA = ring.slice(k1, k2), halfB = ring.slice(k2).concat(ring.slice(0, k1));
  const cIndex = tops[0].arcs.length;
  const fromA = startOf(tops[0], ring[k1]), lineStart = toQ(tops[0], ends[0]);
  const forward = Math.hypot(fromA[0] - lineStart[0], fromA[1] - lineStart[1]) <= Math.hypot(fromA[0] - toQ(tops[0], ends[1])[0], fromA[1] - toQ(tops[0], ends[1])[1]);
  tops.forEach((T, n) => {
    const a = startOf(T, ring[k1]), b = startOf(T, ring[k2]);
    const mid = (forward ? line : line.slice().reverse()).slice(1, -1).map((p) => toQ(T, p));
    T.arcs.push([a].concat(mid, [b]));
  });
  const ringA = halfA.concat([~cIndex]), ringB = halfB.concat([cIndex]);
  const pts = (r) => r.flatMap((ref) => { const i = ref < 0 ? ~ref : ref, a = tops[0].arcs[i].map((q) => toLL(tops[0], q)); return ref < 0 ? a.reverse() : a; });
  const newRing = flat(provGeoms[pNew]).find(() => true);
  const newPts = newRing.flatMap((ref) => { const i = ref < 0 ? ~ref : ref, a = pd.arcs[i].map((q) => toLL(pd, q)); return ref < 0 ? a.reverse() : a; });
  const probe = (r) => { const p = pts(r); let sx = 0, sy = 0; p.forEach((q) => { sx += q[0]; sy += q[1]; }); const c = [sx / p.length, sy / p.length]; return insideRing(p, c) ? c : p[Math.floor(p.length / 2)]; };
  const aIsNew = insideRing(newPts, probe(ringA));
  if (aIsNew === insideRing(newPts, probe(ringB))) throw new Error(sp.province + ": cannot tell the two halves apart");
  geoms[u].arcs = [aIsNew ? ringB : ringA];
  geoms[u].properties.n = provNames[pOld].n;
  geoms.push({ type: "Polygon", arcs: [aIsNew ? ringA : ringB], properties: { n: sp.added, p: pNew } });
}

units.provinces = provNames.map((p) => ({ n: p.n, c: p.c }));
units.countries = provinces.countries;
units.arcs = encode(tops[0].arcs);
detail.arcs = encode(tops[1].arcs);
writeFileSync(unitsPath, JSON.stringify(units));
writeFileSync(detailPath, JSON.stringify(detail));
console.log("units.json: " + geoms.length + " units, " + units.arcs.length + " arcs; units-detail.json: " + detail.arcs.length + " arcs");

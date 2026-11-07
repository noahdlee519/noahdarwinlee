import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { geoArea, geoDistance, geoEquirectangular, geoOrthographic, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
import { Resvg } from "@resvg/resvg-js";
import { dayFromDate, readWhen } from "./when.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.CHRONIA_ROOT || join(HERE, "..", "..");
const FONTS = join(HERE, "..", "fonts");
export const W = 1200, H = 630;
const PALETTE = 10, DISPUTED = 6, R_KM = 6371, TAU = 2 * Math.PI, HALF_PI = Math.PI / 2, D2R = Math.PI / 180;
const LINE_H = 1.18, CAP_H = 0.92, SPACE = 0.22, PEOPLE_SPACE = 0.05, BLEED_KM = 20;
const EDITS_URL = "https://jvcmeuqlyygpwelmvxuv.supabase.co/functions/v1/chronia-edits";

const memo = new Map();
const once = (k, f) => { if (!memo.has(k)) memo.set(k, f()); return memo.get(k); };
const readText = (p) => readFileSync(join(ROOT, p), "utf8");
const readJSON = (p) => JSON.parse(readText(p));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const eras = () => once("eras", () => readJSON("chronia/data/eras.json"));
const land = () => once("land", () => readJSON("chronia/data/land.json"));
const sea = () => once("sea", () => readJSON("uchronia/data/sea.json"));
// The detailed lines of a data file are in a file beside it ("modern-hi.json"), since November 2026.
const withHi = (p, d) => { if (!d.hi) d.hi = readJSON(p.replace(/\.json$/, "-hi.json")).hi; return d; };
const modern = () => once("modern", () => withHi("chronia/data/modern.json", readJSON("chronia/data/modern.json")));
const widths = () => once("widths", () => JSON.parse(readFileSync(join(HERE, "widths.json"), "utf8")));
const chunks = new Map();
function chunk(file) {
  let c = chunks.get(file);
  if (!c) {
    c = withHi("chronia/data/" + file, readJSON("chronia/data/" + file));
    chunks.set(file, c);
    while (chunks.size > 3) chunks.delete(chunks.keys().next().value);
  }
  return c;
}

function rewound(geo) {
  const fix = (coords) => {
    const a = geoArea({ type: "Polygon", coordinates: coords });
    return a > TAU ? coords.map((r) => r.slice().reverse()) : coords;
  };
  if (geo.type === "FeatureCollection") return { type: "GeometryCollection", geometries: geo.features.map(rewound) };
  const g = geo.type === "Feature" ? geo.geometry : geo;
  if (g.type === "Polygon") return { type: "Polygon", coordinates: fix(g.coordinates) };
  if (g.type === "MultiPolygon") return { type: "MultiPolygon", coordinates: g.coordinates.map(fix) };
  if (g.type === "GeometryCollection") return { type: "GeometryCollection", geometries: g.geometries.map(rewound) };
  return g;
}
const landGeo = (lv) => once("landgeo" + lv, () => { const t = land()[lv]; return rewound(feature(t, t.objects.land)); });
const deepGeo = (lv) => once("deepgeo" + lv, () => { const t = sea()[lv]; return rewound(feature(t, t.objects.deep)); });

function palette() {
  return once("pal", () => {
    const css = readText("chronia/app.css"), block = css.slice(0, css.indexOf("}")), v = {};
    for (const m of block.matchAll(/--ch-([a-z0-9-]+):\s*([^;]+);/g)) v[m[1]] = m[2].trim();
    const colors = [], bands = [];
    for (let i = 0; i < PALETTE; i++) { colors.push(v["c" + i]); bands.push(v["b" + i]); }
    for (const k of ["ocean", "ocean-deep", "border", "label", "label-halo", "people", "paper", "people-fill", "water", "limb", "glow"]) if (!v[k]) throw new Error("no --ch-" + k);
    if (colors.some((c) => !c) || bands.some((c) => !c) || !/^#/.test(css.match(/--bg:\s*([^;]+);/)[1])) throw new Error("palette");
    return { ...v, bg: css.match(/--bg:\s*([^;]+);/)[1].trim(), ink: css.match(/--ink:\s*([^;]+);/)[1].trim(), colors, bands };
  });
}

function paint(c, what) {
  const m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(c);
  if (!m) return what + '="' + c + '"';
  return what + '="rgb(' + m[1] + "," + m[2] + "," + m[3] + ')"' + (m[4] !== undefined ? " " + what + '-opacity="' + m[4] + '"' : "");
}

function hexHsl(h) {
  const r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let hh = 0, ss = 0;
  if (d) {
    ss = d / (1 - Math.abs(2 * l - 1));
    hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hh = (hh * 60 + 360) % 360;
  }
  return [hh, ss, l];
}
function bandFor(hex, pal) {
  const h = hexHsl(hex);
  let best = 0, bd = Infinity;
  for (let i = 0; i < PALETTE; i++) {
    const f = hexHsl(pal.colors[i]), dd = Math.min(Math.abs(f[0] - h[0]), 360 - Math.abs(f[0] - h[0]));
    if (dd < bd) { bd = dd; best = i; }
  }
  const b = hexHsl(pal.bands[best]);
  return "hsl(" + h[0].toFixed(1) + "," + (100 * (h[1] < 0.05 ? h[1] : b[1])).toFixed(1) + "%," + (100 * b[2]).toFixed(1) + "%)";
}

let editsCache = { at: 0, list: [] };
function editTime(s, end) {
  const m = /^(-?\d{1,4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(String(s || ""));
  if (!m) return null;
  const y = +m[1], mo = m[2] ? +m[2] : 0, d = m[3] ? +m[3] : 0;
  if (!mo) return end ? y + 1 : y;
  const u = (yy, mm, dd) => { const x = new Date(0); x.setUTCFullYear(yy, mm - 1, dd); x.setUTCHours(0, 0, 0, 0); return x.getTime(); };
  const y0 = u(y, 1, 1), len = (u(y + 1, 1, 1) - y0) / 864e5, at = d ? u(y, mo, d + (end ? 1 : 0)) : u(y, mo + (end ? 1 : 0), 1);
  return y + (at - y0) / 864e5 / len;
}
export async function loadEdits(fetcher = fetch) {
  if (Date.now() - editsCache.at < 60000) return editsCache.list;
  try {
    const r = await fetcher(EDITS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "list" }), signal: AbortSignal.timeout(1500) });
    if (!r.ok) throw new Error("edits " + r.status);
    const b = await r.json();
    const list = (b.edits || []).filter((e) => e && e.kind && e.target).map((e) => ({ kind: e.kind, target: String(e.target), value: e.value || {}, updated_at: e.updated_at || "", id: e.id || 0, t0: editTime(e.from, false), t1: editTime(e.to, true) }))
      .filter((e) => e.t0 !== null && e.t1 !== null)
      .sort((a, b) => (a.updated_at < b.updated_at ? -1 : a.updated_at > b.updated_at ? 1 : a.id - b.id));
    editsCache = { at: Date.now(), list };
  } catch (e) {
    editsCache = { at: Date.now() - 45000, list: editsCache.list };
  }
  return editsCache.list;
}
function editAt(list, kind, target, t) {
  let v = null;
  for (const e of list) if (e.kind === kind && e.target === target && e.t0 <= t && t < e.t1) v = e.value;
  return v;
}

function landGrid() {
  return once("grid", () => {
    const topo = land().lo, f = feature(topo, topo.objects.land), N = 10, GW = 360 * N, GH = 180 * N;
    const rows = Array.from({ length: GH }, () => []);
    const polys = f.type === "FeatureCollection" ? f.features.flatMap((x) => (x.geometry.type === "Polygon" ? [x.geometry.coordinates] : x.geometry.coordinates)) : f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys) for (const ring of poly) for (let i = 0; i + 1 < ring.length; i++) {
      const [x0, y0] = ring[i], [x1, y1] = ring[i + 1];
      if (y0 === y1) continue;
      const r0 = Math.ceil((90 - Math.max(y0, y1)) * N - 0.5), r1 = Math.floor((90 - Math.min(y0, y1)) * N - 0.5);
      for (let r = Math.max(0, r0); r <= Math.min(GH - 1, r1); r++) {
        const lat = 90 - (r + 0.5) / N, t = (lat - y0) / (y1 - y0);
        if (t < 0 || t > 1) continue;
        rows[r].push(x0 + t * (x1 - x0));
      }
    }
    const g = new Uint8Array(GW * GH);
    rows.forEach((xs, r) => {
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const c0 = Math.max(0, Math.ceil((xs[k] + 180) * N - 0.5)), c1 = Math.min(GW - 1, Math.floor((xs[k + 1] + 180) * N - 0.5));
        for (let c = c0; c <= c1; c++) g[r * GW + c] = 1;
      }
    });
    const R = 2, h = new Uint8Array(GW * GH), deep = new Uint8Array(GW * GH);
    for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
      let ok = 1;
      for (let d = -R; d <= R && ok; d++) if (!g[r * GW + ((c + d + GW) % GW)]) ok = 0;
      h[r * GW + c] = ok;
    }
    for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
      let ok = 1;
      for (let d = -R; d <= R && ok; d++) { const rr = r + d; if (rr < 0 || rr >= GH || !h[rr * GW + c]) ok = 0; }
      deep[r * GW + c] = ok;
    }
    return { deep, N, GW, GH };
  });
}
function inland(p, G) {
  const c = Math.floor((((p[0] + 180) % 360) + 360) % 360 * G.N), r = Math.floor((90 - p[1]) * G.N);
  return r >= 0 && r < G.GH && G.deep[r * G.GW + Math.min(G.GW - 1, c)] === 1;
}
function splitCoast(lines, coastal, inner) {
  const G = landGrid();
  for (const l of lines) {
    let run = [], kind = null;
    const flush = () => { if (run.length > 1) (kind ? inner : coastal).push(run); };
    for (const p of l) {
      const k = inland(p, G);
      if (kind === null) kind = k;
      if (k !== kind) { run.push(p); flush(); run = [run[run.length - 1]]; kind = k; } else run.push(p);
    }
    flush();
  }
}

function polityColour(cat, edits, extra, id, day, year, at) {
  const ed = editedColour(cat, edits, extra, id, at);
  if (ed >= 0) return ed;
  const e = cat[id];
  if (!e) return 0;
  const steps = day !== undefined ? e[7] : year !== undefined ? e[8] : null, t = day !== undefined ? day : year;
  if (steps) for (let k = steps.length - 1; k >= 0; k--) if (t >= steps[k][0]) return steps[k][1];
  if (e[1] >= 0) return e[1];
  let h = 0;
  for (let i = 0; i < e[0].length; i++) h = (h * 31 + e[0].charCodeAt(i)) >>> 0;
  return h % PALETTE;
}
function editedColour(cat, edits, extra, id, at) {
  const e = cat[id];
  if (!e) return -1;
  const v = editAt(edits, "country-colour", e[0], at);
  if (!v) return -1;
  if (v.hex) {
    const hex = String(v.hex).toLowerCase();
    let k = extra.indexOf(hex);
    if (k < 0) { k = extra.length; extra.push(hex); }
    return PALETTE + k;
  }
  return v.c >= 0 && v.c < PALETTE ? v.c : -1;
}
function apart(cols) {
  const out = [];
  for (const c of cols) {
    let k = c, tries = 0;
    while (out.includes(k) && tries++ < PALETTE) k = (k + 5 + tries) % PALETTE;
    out.push(k);
  }
  return out;
}

export function mapAt(when, edits) {
  const idx = eras(), cat = idx.polities, extra = [];
  const mFrom = idx.modern.from.split("-").map(Number), fromDay = dayFromDate(mFrom[0], mFrom[1], mFrom[2]);
  const at = when.t, polys = [];
  let topo, rows;
  if (when.monthly && when.day >= fromDay) {
    const md = modern();
    topo = { lo: md.lo, hi: md.hi };
    md.rows.forEach((r, i) => {
      if (!(r[2] <= when.day && (r[3] < 0 || when.day <= r[3]))) return;
      const hue = r[1] >= 0 ? r[1] : r[0], claims = r[4] === DISPUTED && r[7] ? r[7] : null;
      const own = editedColour(cat, edits, extra, r[0], at);
      polys.push({ row: i, id: r[0], hue, member: -1, people: false, band: false, soft: !!claims, claims,
        claimColors: claims ? apart(claims.map((c) => polityColour(cat, edits, extra, c, when.day, undefined, at))) : null,
        color: claims ? -1 : own >= 0 ? own : polityColour(cat, edits, extra, hue, when.day, undefined, at), label: r[6] });
    });
  } else {
    let k = 0;
    idx.dated.chunks.forEach((c, i) => { if (c[0] <= when.year) k = i; });
    const c = chunk(idx.dated.chunks[k][1]);
    topo = { lo: c.lo, hi: c.hi };
    let from = null, to = null;
    if (when.monthly) {
      from = c.rows.map((r) => (r[2] < 1000 ? -1e9 : dayFromDate(r[2], 1, 1)));
      to = c.rows.map((r) => dayFromDate(r[3], 12, 31));
      (c.days || []).forEach((x) => { if (x[1] !== null) from[x[0]] = x[1]; if (x[2] !== null) to[x[0]] = x[2]; });
    }
    const groupIds = new Set((c.groups || []).map((g) => g[0]));
    c.rows.forEach((r, i) => {
      if (when.monthly ? !(from[i] <= when.day && when.day <= to[i]) : !(r[2] <= when.year && when.year <= r[3])) return;
      const people = !!r[7], member = groupIds.has(r[0]) ? r[0] : groupIds.has(r[8]) && !people ? r[8] : -1;
      const hue = member >= 0 ? member : r[1] >= 0 && !people ? r[1] : r[0], claims = r[4] === DISPUTED && r[10] ? r[10] : null;
      const own = people || claims ? -1 : editedColour(cat, edits, extra, r[0], at);
      polys.push({ row: i, id: r[0], hue, member, people, band: r[7] === 2, soft: r[9] <= 1 || people || !!claims, claims,
        claimColors: claims ? apart(claims.map((x) => polityColour(cat, edits, extra, x, undefined, when.year, at))) : null,
        color: people || claims ? -1 : own >= 0 ? own : polityColour(cat, edits, extra, hue, undefined, when.year, at), label: r[6] });
    });
  }
  rows = polys;
  return { topo, polys: rows, extra, cat, edits, at };
}

function textWidth(text, f, style, space) {
  const w = widths()[style];
  let u = 0;
  for (const ch of text) u += w[ch] !== undefined ? w[ch] : 0.5;
  return (u + space * text.length) * f;
}
const labelTarget = (side, people, minF, cap) => Math.max(minF, Math.min(cap, (5 + 3.6 * Math.log2(Math.max(1, side) / 10)) * (people ? 0.85 : 1)));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

export function viewOf(v, flatOn) {
  const p = String(v || "").split(",").map(Number);
  const ok = p.length === 3 && p.every(Number.isFinite);
  return { lon: ok ? ((((p[0] + 180) % 360) + 360) % 360) - 180 : 10, lat: ok ? clamp(p[1], -89.5, 89.5) : 48, zoom: ok ? clamp(p[2], 0.6, 40) : 1, flat: !!flatOn };
}

function projectionFor(view) {
  const cx = W / 2, cy = H / 2 + 12;
  if (view.flat) {
    const baseK = Math.max(20, Math.min((W - 24) / TAU, (H - 16) / Math.PI)), k = baseK * view.zoom;
    let xc = view.lon * D2R, yc = view.lat * D2R;
    const wrap = k * TAU > W + 1, x0 = -Math.PI + cx / k, x1 = Math.PI - (W - cx) / k;
    if (!wrap) xc = x0 > x1 ? 0 : clamp(xc, x0, x1);
    const y0 = (H - cy) / k - HALF_PI, y1 = HALF_PI - cy / k;
    yc = y0 > y1 ? 0 : clamp(yc, y0, y1);
    const pr = geoEquirectangular().precision(0.35).clipExtent([[-20, -20], [W + 20, H + 20]]).scale(k);
    if (wrap) pr.rotate([-xc / D2R, 0]).translate([cx, cy + yc * k]);
    else pr.translate([cx - xc * k, cy + yc * k]);
    return { pr, S: k, flat: true, centre: [xc / D2R, yc / D2R] };
  }
  const baseR = Math.max(80, Math.min(W - 20, H) / 2 - 14), r = baseR * view.zoom;
  const pr = geoOrthographic().rotate([-view.lon, -view.lat, 0]).scale(r).translate([cx, cy]).clipAngle(90).precision(0.35).clipExtent([[-20, -20], [W + 20, H + 20]]);
  return { pr, S: r, flat: false, r, cx, cy, centre: [view.lon, view.lat] };
}

function fontFiles() {
  return ["im-fell-english-latin-400-normal.ttf", "im-fell-english-latin-400-italic.ttf", "im-fell-english-sc-latin-400-normal.ttf"].map((f) => join(FONTS, f));
}

export function previewSVG(when, view, edits) {
  const pal = palette(), map = mapAt(when, edits), P = projectionFor(view), path = geoPath(P.pr);
  const colors = pal.colors.concat(map.extra), bands = pal.bands.concat(map.extra.map((h) => bandFor(h, pal)));
  const S = P.S, kp = S / R_KM, lv = S >= 900 ? "hi" : "lo", topo = map.topo[lv], geomsAll = topo.objects.p.geometries;
  const polys = map.polys, geoms = polys.map((p) => geomsAll[p.row]), ix = new Map(geoms.map((g, i) => [g, i]));
  const pOf = (g) => polys[ix.get(g)];
  const d = (geo) => path(geo) || "";
  const areaCap = P.flat ? null : P.r * P.r;
  const fill = (geo) => {
    const g = geo.type === "Feature" ? geo.geometry : geo;
    if (!g) return "";
    if (g.type === "GeometryCollection") return g.geometries.map(fill).join("");
    const list = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    let s = "";
    for (const c of list) {
      const one = { type: "Polygon", coordinates: c }, ga = geoArea(one);
      if (ga > TAU) continue;
      const pd = path(one);
      if (!pd) continue;
      const pa = path.area(one);
      if (areaCap ? pa > ga * areaCap * 1.02 + 40 : pa > W * H * 0.5 && ga < 0.05) continue;
      s += pd;
    }
    return s;
  };
  const landD = fill(landGeo(lv));
  const lw = clamp((S - 700) / 3300, 0, 1), bw = Math.min(6.5, Math.max(S / 260, Math.min(2.2, Math.max(1.3, S / 165)))), bandLine = bw * 2, bleed = Math.min(80, 2 * BLEED_KM * kp);
  const coll = { type: "GeometryCollection", geometries: geoms };
  const kind = (a, b) => {
    const pa = pOf(a), pb = pOf(b);
    if (pa.id === pb.id) return 0;
    if (pa.claims || pb.claims) return 2;
    if (pa.band && pb.band) return 0;
    if (pa.member >= 0 && pa.member === pb.member) return 4;
    if (!pa.people && !pb.people && pa.hue === pb.hue) return 3;
    return pa.soft || pb.soft ? 2 : 1;
  };
  const meshD = (fn) => d(mesh(topo, coll, fn));
  const owner = new Map(), twice = new Set();
  const walk = (g, a) => {
    if (typeof a === "number") { const i = a < 0 ? ~a : a, o = owner.get(i); if (o === undefined) owner.set(i, g); else if (o !== g) owner.set(i, null); else twice.add(i); return; }
    for (const x of a) walk(g, x);
  };
  geoms.forEach((g) => { if (g.arcs) walk(g, g.arcs); });
  const buckets = new Map();
  owner.forEach((g, i) => {
    if (!g || twice.has(i)) return;
    const p = pOf(g), b = p.claims ? "d" : p.band ? "b" : p.people ? "p" : (p.soft ? "s" : "h") + p.color;
    if (!buckets.has(b)) buckets.set(b, []);
    buckets.get(b).push([i]);
  });
  const edge = { hard: [], soft: [], peopleBleed: [], bleed: colors.map(() => []), inner: colors.map(() => []) };
  buckets.forEach((arcs, b) => {
    const lines = feature(topo, { type: "MultiLineString", arcs }).geometry.coordinates;
    const coastal = [], inner = [];
    splitCoast(lines, coastal, inner);
    if (b === "p" || b === "b") { edge.peopleBleed.push(...coastal); if (b === "p") edge.soft.push(...inner); return; }
    if (b === "d") { edge.soft.push(...inner); return; }
    const c = +b.slice(1);
    edge.bleed[c].push(...coastal);
    edge.inner[c].push(...inner);
    (b[0] === "s" ? edge.soft : edge.hard).push(...inner);
  });
  const ml = (lines) => (lines.length ? d({ type: "MultiLineString", coordinates: lines }) : "");

  const groupD = colors.map(() => []), peoplesD = [], disputes = new Map();
  polys.forEach((p, i) => {
    const s = fill(feature(topo, geoms[i]));
    if (!s) return;
    if (p.claims) { const k = p.claimColors.join(","); if (!disputes.has(k)) disputes.set(k, { cols: p.claimColors, d: [] }); disputes.get(k).d.push(s); }
    else if (p.people) peoplesD.push(s);
    else groupD[p.color].push(s);
  });
  const out = [];
  const push = (s) => out.push(s);
  push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '">');
  const defs = [];
  const sphereD = d({ type: "Sphere" });
  defs.push('<clipPath id="sphere"><path d="' + sphereD + '"/></clipPath>');
  defs.push('<clipPath id="land"><path d="' + landD + '"/></clipPath>');
  defs.push('<mask id="coast" maskUnits="userSpaceOnUse" x="0" y="0" width="' + W + '" height="' + H + '"><path d="' + landD + '" fill="none" stroke="#fff" stroke-width="' + bandLine.toFixed(2) + '" stroke-linejoin="round"/></mask>');
  groupD.forEach((g, c) => { if (g.length) defs.push('<clipPath id="g' + c + '"><path d="' + g.join("") + '"/></clipPath>'); });
  let pat = 0;
  disputes.forEach((x) => {
    x.id = "s" + pat++;
    const B = 12, w = B * x.cols.length;
    defs.push('<pattern id="' + x.id + '" patternUnits="userSpaceOnUse" width="' + w + '" height="' + w + '" patternTransform="rotate(45)">' +
      x.cols.map((col, i) => '<rect x="' + i * B + '" y="0" width="' + B + '" height="' + w + '" fill="' + colors[col] + '"/><rect x="' + i * B + '" y="0" width="2" height="' + w + '" ' + paint(pal.border, "fill") + ' opacity="0.35"/>').join("") + "</pattern>");
  });
  if (!P.flat) defs.push('<radialGradient id="glow" gradientUnits="userSpaceOnUse" cx="' + P.cx + '" cy="' + P.cy + '" r="' + (P.r * 1.07).toFixed(1) + '"><stop offset="' + (1 / 1.07).toFixed(4) + '" ' + paint(pal.glow, "stop-color").replace(/stop-color-opacity/, "stop-opacity") + '/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>');
  push("<defs>" + defs.join("") + "</defs>");
  push('<rect width="' + W + '" height="' + H + '" fill="' + pal.bg + '"/>');
  if (!P.flat && P.r * 1.07 < Math.hypot(W, H)) push('<circle cx="' + P.cx + '" cy="' + P.cy + '" r="' + (P.r * 1.07).toFixed(1) + '" fill="url(#glow)"/>');
  push('<path d="' + sphereD + '" fill="' + pal.ocean + '"/>');
  push('<g clip-path="url(#sphere)">');
  const deepD = fill(deepGeo(S < 900 ? "low" : "high"));
  if (deepD) push('<path d="' + deepD + '" fill="' + pal["ocean-deep"] + '"/>');
  const gap = Math.max(1.25, Math.min(3.4, S < 450 ? S / 240 : Math.max(1.7, S / 520))), n = S < 250 ? 2 : S < 450 ? 3 : 4;
  for (let i = n; i >= 1; i--) {
    const a = 0.3 + (0.7 * (n - i)) / (n - 1);
    push('<path d="' + landD + '" fill="none" ' + paint(pal.water, "stroke").replace(/stroke-opacity="([\d.]+)"/, (m, o) => 'stroke-opacity="' + (+o * a).toFixed(3) + '"') + ' stroke-width="' + (2 * i * gap + 0.9).toFixed(2) + '" stroke-linejoin="round"/>');
    push('<path d="' + landD + '" fill="none" stroke="' + pal.ocean + '" stroke-width="' + Math.max(0, 2 * i * gap - 0.7).toFixed(2) + '" stroke-linejoin="round"/>');
  }
  push("</g>");

  const fills = (cols, withGroups, withPeople) => {
    const s = [];
    if (withGroups) groupD.forEach((g, c) => {
      if (!g.length) return;
      const bl = ml(edge.bleed[c]);
      if (bleed > 0.6 && bl) s.push('<path d="' + bl + '" fill="none" stroke="' + cols[c] + '" stroke-width="' + bleed.toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round"/>');
      s.push('<path d="' + g.join("") + '" fill="' + cols[c] + '"/>');
    });
    if (withPeople) {
      const pb = ml(edge.peopleBleed);
      if (bleed > 0.6 && pb) s.push('<path d="' + pb + '" fill="none" stroke="' + pal["people-fill"] + '" stroke-width="' + bleed.toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round"/>');
      if (peoplesD.length) s.push('<path d="' + peoplesD.join("") + '" fill="' + pal["people-fill"] + '"/>');
    }
    return s.join("");
  };
  push('<g clip-path="url(#land)">');
  push('<rect width="' + W + '" height="' + H + '" fill="' + pal.paper + '"/>');
  push(fills(colors, true, false));
  disputes.forEach((x) => push('<path d="' + x.d.join("") + '" fill="url(#' + x.id + ')"/>'));
  push(fills(colors, false, true));
  push('<g mask="url(#coast)" opacity="0.6">' + fills(bands, true, false) + "</g>");
  groupD.forEach((g, c) => {
    if (!g.length) return;
    const bd = meshD((a, b) => {
      if (a === b) return false;
      const ca = pOf(a).color === c && !pOf(a).people && !pOf(a).claims, cb = pOf(b).color === c && !pOf(b).people && !pOf(b).claims;
      return ca !== cb || (ca && cb && pOf(a).hue !== pOf(b).hue);
    }) + ml(edge.inner[c]);
    if (bd) push('<g clip-path="url(#g' + c + ')"><path d="' + bd + '" fill="none" stroke="' + bands[c] + '" stroke-opacity="0.6" stroke-width="' + bandLine.toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round"/></g>');
  });
  push("</g>");
  push('<path d="' + landD + '" fill="none" stroke="' + pal.border + '" stroke-width="' + (0.75 + 0.35 * lw).toFixed(2) + '" stroke-linejoin="round"/>');
  push('<g clip-path="url(#land)" fill="none" stroke="' + pal.border + '" stroke-linecap="round" stroke-linejoin="round">');
  const kin = meshD((a, b) => a !== b && kind(a, b) === 3), member = meshD((a, b) => a !== b && kind(a, b) === 4);
  const hard = meshD((a, b) => a !== b && kind(a, b) === 1) + ml(edge.hard), soft = meshD((a, b) => a !== b && kind(a, b) === 2) + ml(edge.soft);
  if (kin) push('<path d="' + kin + '" stroke-opacity="0.55" stroke-width="' + (0.6 + 0.3 * lw).toFixed(2) + '"/>');
  const mw = 0.7 + 0.3 * lw;
  if (member) push('<path d="' + member + '" stroke-opacity="0.7" stroke-width="' + mw.toFixed(2) + '" stroke-linecap="butt" stroke-dasharray="' + (mw * 4.2).toFixed(2) + " " + (mw * 2.6).toFixed(2) + '"/>');
  if (hard) push('<path d="' + hard + '" stroke-width="' + (1.15 + 0.55 * lw).toFixed(2) + '"/>');
  const dot = S < 500 ? 1.3 : 1.6 + 0.5 * lw;
  if (soft) push('<path d="' + soft + '" stroke-width="' + dot.toFixed(2) + '" stroke-dasharray="0.1 ' + (dot * 2.1).toFixed(2) + '"/>');
  push("</g>");
  if (P.flat) {
    const b = path.bounds({ type: "Sphere" });
    push('<rect x="' + b[0][0].toFixed(1) + '" y="' + b[0][1].toFixed(1) + '" width="' + (b[1][0] - b[0][0]).toFixed(1) + '" height="' + (b[1][1] - b[0][1]).toFixed(1) + '" fill="none" stroke="' + pal.limb + '" stroke-width="1"/>');
    push('<rect x="' + (b[0][0] - 5).toFixed(1) + '" y="' + (b[0][1] - 5).toFixed(1) + '" width="' + (b[1][0] - b[0][0] + 10).toFixed(1) + '" height="' + (b[1][1] - b[0][1] + 10).toFixed(1) + '" fill="none" stroke="' + pal.limb + '" stroke-width="2.4"/>');
  } else {
    push('<circle cx="' + P.cx + '" cy="' + P.cy + '" r="' + P.r.toFixed(1) + '" fill="none" stroke="' + pal.limb + '" stroke-width="1.6"/>');
    push('<circle cx="' + P.cx + '" cy="' + P.cy + '" r="' + (P.r + 5).toFixed(1) + '" fill="none" stroke="' + pal.limb + '" stroke-width="0.8"/>');
  }

  const dateF = 30, dateW = textWidth(when.label, dateF, "n", 0), boxW = dateW + 56, boxH = 52, bx = (W - boxW) / 2, by = 14;
  const mark = "CHRONIA", markF = 17, markW = textWidth(mark, markF, "sc", 0.16), mW = markW + 30, mH = 32, mx = W - mW - 16, my = H - mH - 16;
  const placed = [{ x0: bx - 6, y0: by - 6, x1: bx + boxW + 6, y1: by + boxH + 6 }, { x0: mx - 6, y0: my - 6, x1: mx + mW + 6, y1: my + mH + 6 }];
  const labels = [];
  const visible = (ll) => (P.flat ? true : geoDistance(ll, P.centre) < HALF_PI * 0.82);
  const order = polys.filter((p) => p.label).sort((a, b) => b.label[5] - a.label[5]);
  const seen = new Set();
  for (const p of order) {
    if (seen.has(p.id) || labels.length >= 60) continue;
    const lab = p.label;
    if (lab[2] * kp < 0.5) continue;
    const e = map.cat[p.id];
    if (!e) continue;
    const nm = editAt(map.edits, "country-name", e[0], map.at), name = nm && nm.name ? nm.name : e[0];
    if (!name || !visible([lab[0], lab[1]])) continue;
    const q = P.pr([lab[0], lab[1]]);
    if (!q || !isFinite(q[0])) continue;
    const people = p.people, style = people ? "i" : "n", sp = people ? PEOPLE_SPACE : SPACE, text = people ? name : name.toUpperCase();
    const minF = people ? 8.5 : 7.5, cap = people ? 15 : 26, side = Math.sqrt(lab[5]) * kp, target = labelTarget(side, people, minF, cap);
    const availW = Math.max(lab[3], 2 * lab[2]) * kp * 0.95, availH = 2 * lab[2] * kp;
    const words = text.split(" "), opts = [[text]];
    if (words.length > 1) {
      let best = null;
      for (let k = 1; k < words.length; k++) { const a = words.slice(0, k).join(" "), b = words.slice(k).join(" "), w = Math.max(a.length, b.length); if (!best || w < best[2]) best = [a, b, w]; }
      opts.push([best[0], best[1]]);
    }
    let pick = null;
    for (const lines of opts) {
      const u = Math.max(...lines.map((l) => textWidth(l, 1, style, sp))), h = CAP_H + LINE_H * (lines.length - 1);
      const f = Math.min(target, availW / u, (availH * 0.95) / h);
      if (f >= minF * 0.93 && (!pick || f > pick.f * 1.15)) pick = { lines, f, u, h };
    }
    if (!pick) continue;
    let ang = 0;
    if (lab[4]) {
      const k2 = Math.max(0.05, Math.cos(lab[1] * D2R)) * 111.195, dk = 60;
      const q2 = P.pr([lab[0] + (dk * Math.cos(lab[4] * D2R)) / k2, lab[1] + (dk * Math.sin(lab[4] * D2R)) / 111.195]);
      if (q2 && isFinite(q2[0])) { ang = Math.atan2(q2[1] - q[1], q2[0] - q[0]); if (ang > HALF_PI) ang -= Math.PI; if (ang < -HALF_PI) ang += Math.PI; }
    }
    const f = pick.f, hw = (pick.u * f) / 2 + 2, hh = (pick.h * f) / 2 + 1, ca = Math.abs(Math.cos(ang)), sa = Math.abs(Math.sin(ang));
    const ex = hw * ca + hh * sa, ey = hw * sa + hh * ca, box = { x0: q[0] - ex, y0: q[1] - ey, x1: q[0] + ex, y1: q[1] + ey };
    if (box.x0 < 6 || box.y0 < 6 || box.x1 > W - 6 || box.y1 > H - 6 || placed.some((b) => overlaps(b, box))) continue;
    if (!P.flat && [[box.x0, box.y0], [box.x1, box.y0], [box.x0, box.y1], [box.x1, box.y1]].some(([x, y]) => Math.hypot(x - P.cx, y - P.cy) > P.r * 0.96)) continue;
    placed.push(box);
    seen.add(p.id);
    const spx = sp * f, deg = (ang / D2R).toFixed(2);
    const tl = pick.lines.map((l, i) => {
      const off = (i - (pick.lines.length - 1) / 2) * f * LINE_H + (CAP_H * f) / 2;
      return '<text x="' + (q[0] + spx / 2).toFixed(1) + '" y="' + (q[1] + off).toFixed(1) + '">' + esc(l) + "</text>";
    }).join("");
    labels.push('<g transform="rotate(' + deg + " " + q[0].toFixed(1) + " " + q[1].toFixed(1) + ')" font-family="IM FELL English" font-size="' + f.toFixed(1) + '"' + (people ? ' font-style="italic"' : "") + ' letter-spacing="' + spx.toFixed(2) + '" text-anchor="middle" fill="' + (people ? pal.people : pal.label) + '"' + (p.band ? ' opacity="0.72"' : "") + ' stroke-width="' + Math.max(2, f * 0.22).toFixed(2) + '" ' + paint(pal["label-halo"], "stroke") + ' stroke-linejoin="round" paint-order="stroke">' + tl + "</g>");
  }
  push(labels.join(""));

  const frame = (x, y, w, h, two) => '<rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + w.toFixed(1) + '" height="' + h + '" fill="' + pal.bg + '" stroke="' + pal.ink + '" stroke-width="1.2"/>' +
    (two ? '<rect x="' + (x + 4).toFixed(1) + '" y="' + (y + 4) + '" width="' + (w - 8).toFixed(1) + '" height="' + (h - 8) + '" fill="none" stroke="' + pal.ink + '" stroke-width="0.7"/>' : "");
  push(frame(bx, by, boxW, boxH, true));
  push('<text x="' + (W / 2).toFixed(1) + '" y="' + (by + boxH / 2 + dateF * 0.34).toFixed(1) + '" font-family="IM FELL English" font-size="' + dateF + '" text-anchor="middle" fill="' + pal.ink + '">' + esc(when.label) + "</text>");
  push(frame(mx, my, mW, mH, false));
  push('<text x="' + (mx + mW / 2 + (0.16 * markF) / 2).toFixed(1) + '" y="' + (my + mH / 2 + markF * 0.34).toFixed(1) + '" font-family="IM FELL English SC" font-size="' + markF + '" letter-spacing="' + (0.16 * markF).toFixed(2) + '" text-anchor="middle" fill="' + pal.ink + '">' + mark + "</text>");
  push("</svg>");
  return out.join("");
}

export function toPNG(svg) {
  const r = new Resvg(svg, { fitTo: { mode: "original" }, font: { fontFiles: fontFiles(), loadSystemFonts: false, defaultFontFamily: "IM FELL English" } });
  return r.render().asPng();
}

export async function preview(q, fetcher) {
  const idx = eras(), to = idx.modern.to.split("-").map(Number), when = readWhen(q.y, dayFromDate(to[0], to[1], to[2]));
  const view = viewOf(q.v, q.flat === "1"), edits = await loadEdits(fetcher);
  const svg = previewSVG(when, view, edits);
  return { svg, png: toPNG(svg), when, view };
}

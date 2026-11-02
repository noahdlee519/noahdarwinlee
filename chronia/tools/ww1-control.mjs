// The First World War's zones of control in Europe and the Middle East, from the fronts of
// tools/occupations.json (see the README's "Occupations of the First World War"), which build-eras.mjs
// also cuts out of the states on the main map. Each belligerent state's CShapes shape, from the day it
// entered the war to the day it left, is held by its own side, except the land the other side held: the
// occupation zones' areas cut from it in the order occupations.json gives them, as csOccupy cuts them,
// each held by its occupier's side while the occupier is at war. Neutral states' land is hatched only
// where an occupier at war held it (Luxembourg, Albania). The days are those of the zones' periods and
// the states' entries and exits, to the armistice of Compiègne.

export const WW1_SIDES = {
  allies: ["Allies (the Entente)", "#2f62b0"],
  central: ["Central Powers (Germany, Austria-Hungary, the Ottoman Empire, and Bulgaria)", "#3b3b3b"]
};

// [CShapes code, side, first day at war, last day at war, box to cut the state's land to (optional)].
const BELLIGERENTS = [
  ["300", "central", "1914-07-28", "1918-11-03"],
  ["340", "allies", "1914-07-28", "1918-11-11"],
  ["255", "central", "1914-08-01", "1918-11-11"],
  // Russia west of the Urals, until the Treaty of Brest-Litovsk.
  ["365", "allies", "1914-08-01", "1918-03-03", [-180, 30, 60, 72]],
  ["220", "allies", "1914-08-03", "1918-11-11"],
  ["211", "allies", "1914-08-04", "1918-11-11"],
  ["200", "allies", "1914-08-04", "1918-11-11"],
  ["341", "allies", "1914-08-06", "1918-11-11"],
  // The Ottoman Empire from its fleet's raid on Russia's Black Sea ports to the armistice of Mudros.
  ["640", "central", "1914-10-29", "1918-10-30"],
  // Egypt north of 26°, the Suez Canal and the Western Desert, from Britain's declaration of war on the Ottomans.
  ["651", "allies", "1914-11-05", "1918-11-11", [20, 26, 40, 33]],
  ["325", "allies", "1915-05-23", "1918-11-11"],
  ["355", "central", "1915-10-14", "1918-09-29"],
  // Romania to the Treaty of Bucharest, and again from 10 November 1918.
  ["360", "allies", "1916-08-27", "1918-05-07"],
  ["360", "allies", "1918-11-10", "1918-11-11"],
  ["350", "allies", "1917-06-30", "1918-11-11"]
];
export const WW1_WAR = { key: "ww1", name: "First World War in Europe and the Middle East", from: "1914-07-28", to: "1918-11-11" };

export function buildWW1(env) {
  const { ne, server, client, simplify, clip, out, index, dayOf, areaKm2, clockwise, weightFor, writeFileSync, readFileSync, existsSync, resolve, only } = env;
  if (only.length && !only.includes(WW1_WAR.key)) return;
  const t0 = Date.now();
  const occPath = resolve(env.here, "occupations.json");
  const csPath = resolve(process.env.CSHAPES || "cshapes/inst/extdata/cshapes_2_gw.topojson");
  if (!existsSync(occPath) || !existsSync(csPath)) { console.warn("ww1: no " + (existsSync(occPath) ? csPath + " (set CSHAPES)" : occPath)); return; }
  const OCC = JSON.parse(readFileSync(occPath, "utf8"));
  const day = (iso) => { const [y, m, d] = iso.split("-").map(Number); return dayOf(y, m, d); };
  const isoAdd = (iso, n) => new Date(Date.UTC(...iso.split("-").map((v, i) => +v - (i === 1 ? 1 : 0))) + n * 86400000).toISOString().slice(0, 10);
  const polysOf = (g) => (g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);
  const km2 = (polys) => polys.reduce((t, p) => t + areaKm2(p), 0);
  const { from: WAR_FROM, to: WAR_TO } = WW1_WAR;

  // CShapes, simplified to about 0.5 km in one topology so that neighbours keep their shared borders.
  const csRaw = JSON.parse(readFileSync(csPath, "utf8"));
  const csKey = Object.keys(csRaw.objects)[0];
  const csTopo = simplify.simplify(simplify.presimplify(csRaw, simplify.sphericalTriangleArea), weightFor(0.5));
  const codes = new Set(BELLIGERENTS.map((b) => b[0]).concat(OCC.zones.flatMap((z) => z.of)));
  const spans = csTopo.objects[csKey].geometries
    .map((g, i) => ({ i, p: g.properties, g }))
    .filter(({ p }) => codes.has(String(p.gwcode)) && p.start <= WAR_TO && p.end >= WAR_FROM);
  const shapeMemo = new Map();
  const shapeOf = (s, box) => {
    const k = s.i + ":" + (box || "");
    if (!shapeMemo.has(k)) {
      let polys = polysOf(client.feature(csTopo, s.g).geometry);
      if (box) polys = clip.intersection(polys, [[[box[0], box[1]], [box[2], box[1]], [box[2], box[3]], [box[0], box[3]], [box[0], box[1]]]]);
      shapeMemo.set(k, polys);
    }
    return shapeMemo.get(k);
  };

  // The zones' areas, as build-eras.mjs reads them.
  const areaMemo = new Map();
  const closed = (ring) => { const pts = ring.map((p) => [p[0], p[1]]); if (pts[0][0] !== pts[pts.length - 1][0] || pts[0][1] !== pts[pts.length - 1][1]) pts.push(pts[0]); return pts; };
  const area = (key) => {
    if (areaMemo.has(key)) return areaMemo.get(key);
    const a = OCC.areas[key];
    if (!a) throw new Error("occupations.json: no area " + key);
    const parts = a.polys ? a.polys.map((poly) => poly.map(closed)) : a.rings || a.ring ? (a.rings || [a.ring]).map((ring) => [closed(ring)]) : [];
    if (a.ne) {
      const units = ne.features.filter((f) => f.properties.adm0_a3 === a.ne.adm0 && a.ne.units.includes(f.properties.name));
      if (units.length !== a.ne.units.length) throw new Error("occupations.json: area " + key + " has " + units.length + " of " + a.ne.units.length + " Natural Earth units");
      for (const f of units) parts.push(...polysOf(f.geometry));
    }
    let polys = clip.union(...parts);
    if (a.minus) polys = clip.difference(polys, [[closed(a.minus)]]);
    areaMemo.set(key, polys);
    return polys;
  };

  const atWar = (code, a, b) => BELLIGERENTS.find((x) => x[0] === code && x[2] <= a && b <= x[3]);
  // The days on which anything changes.
  const cuts = new Set([WAR_FROM]);
  const addCut = (iso) => { if (iso > WAR_FROM && iso <= WAR_TO) cuts.add(iso); };
  for (const x of BELLIGERENTS) { addCut(x[2]); addCut(isoAdd(x[3], 1)); }
  for (const z of OCC.zones) for (const p of z.periods) { addCut(p.from); addCut(isoAdd(p.to, 1)); }
  for (const s of spans) { addCut(s.p.start); addCut(isoAdd(s.p.end, 1)); }
  const starts = [...cuts].sort();

  // One state's land in [a, b], split into the zones that held part of it and the rest.
  const stateMemo = new Map();
  const stateAt = (s, a, b) => {
    const code = String(s.p.gwcode);
    const own = atWar(code, a, b);
    const periods = [];
    OCC.zones.forEach((z, zi) => {
      if (!z.of.includes(code) || !z.by || !atWar(z.by, a, b)) return;
      for (const p of z.periods) if (p.from <= a && b <= p.to) periods.push({ z, zi, area: p.area });
    });
    if (!own && !periods.length) return null;
    periods.sort((x, y) => x.zi - y.zi);
    const sig = s.i + "|" + (own ? own[1] + own[4] : "-") + "|" + periods.map((p) => p.zi + ":" + p.area).join(",");
    if (stateMemo.has(sig)) return stateMemo.get(sig);
    let rest = shapeOf(s, own && own[4]);
    if (!own) rest = shapeOf(s);
    const pieces = [];
    for (const p of periods) {
      const part = clip.intersection(rest, area(p.area)).filter((q) => areaKm2(q) >= (p.z.min_km2 ?? 100));
      if (!part.length) continue;
      rest = clip.difference(rest, part).filter((q) => areaKm2(q) >= 1);
      pieces.push({ side: atWar(p.z.by, a, b)[1], polys: part });
    }
    // Slivers along the lines, when that is all the state has left, go to its largest zone (Serbia from November 1915).
    if (pieces.length && rest.length && km2(rest) < 100) {
      const big = pieces.reduce((x, y) => (km2(y.polys) > km2(x.polys) ? y : x));
      big.polys = clip.union(big.polys, rest);
      rest = [];
    }
    const res = { sig, parts: pieces.concat(own && rest.length ? [{ side: own[1], polys: rest }] : []) };
    stateMemo.set(sig, res);
    return res;
  };

  const shapes = [], rows = [], open = new Map();
  let distinct = 0;
  starts.forEach((a, k) => {
    const b = k + 1 < starts.length ? isoAdd(starts[k + 1], -1) : WAR_TO;
    const bySide = new Map();
    for (const s of spans) {
      if (s.p.start > a || s.p.end < b) continue;
      const st = stateAt(s, a, b);
      if (!st) continue;
      st.parts.forEach((pt, j) => {
        if (!bySide.has(pt.side)) bySide.set(pt.side, { sig: [], polys: [] });
        const e = bySide.get(pt.side);
        e.sig.push(st.sig + "#" + j);
        e.polys.push(pt.polys);
      });
    }
    const first = day(a), last = day(b);
    for (const side of [...open.keys()]) if (!bySide.has(side)) open.delete(side);
    for (const [side, e] of bySide) {
      const sig = e.sig.join(";");
      const r = open.get(side);
      if (r && r.sig === sig) { r[2] = last; continue; }
      const polys = clip.union(...e.polys).filter((q) => areaKm2(q) >= 2);
      distinct++;
      const row = [side, first, last, shapes.length];
      row.sig = sig;
      shapes.push({ type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: clockwise(polys) } });
      rows.push(row);
      open.set(side, row);
    }
  });

  const sideKeys = Object.keys(WW1_SIDES).filter((k) => rows.some((r) => r[0] === k));
  const raw = server.topology({ c: { type: "FeatureCollection", features: shapes } }, 1e5);
  const topo = client.quantize(simplify.simplify(simplify.presimplify(raw, simplify.sphericalTriangleArea), weightFor(1)), 1e5);
  let bbox = [Infinity, Infinity, -Infinity, -Infinity];
  for (const f of shapes) for (const poly of f.geometry.coordinates) for (const [x, y] of poly[0]) bbox = [Math.min(bbox[0], x), Math.min(bbox[1], y), Math.max(bbox[2], x), Math.max(bbox[3], y)];
  bbox = bbox.map((v) => +v.toFixed(2));
  const firstDay = day(WAR_FROM), lastDay = day(WAR_TO);
  const data = {
    key: WW1_WAR.key, name: WW1_WAR.name, credit: "Wikipedia's campaign articles",
    source: "The fronts of the occupations of the First World War (tools/occupations.json): lines drawn through the towns named in the English Wikipedia articles on each campaign and occupation, checked on 29 October 2026, with the British official Chronology of the War where Wikipedia gives none; the states' land from CShapes 2.0",
    sides: sideKeys.map((k) => [k, WW1_SIDES[k][0], WW1_SIDES[k][1]]),
    rows: rows.map((r) => [sideKeys.indexOf(r[0]), r[1], r[2], r[3]]), topo
  };
  writeFileSync(resolve(out, WW1_WAR.key + ".json"), JSON.stringify(data));
  index.wars = index.wars.filter((w) => w[0] !== WW1_WAR.key).concat([[WW1_WAR.key, WW1_WAR.name, firstDay, lastDay, bbox, "control/" + WW1_WAR.key + ".json"]]).sort((x, y) => x[2] - y[2]);
  console.log(WW1_WAR.key + ": " + starts.length + " stretches of days, " + rows.length + " shapes of " + sideKeys.length + " sides, " + Math.round(JSON.stringify(data).length / 1024) + " KB, " + Math.round((Date.now() - t0) / 1000) + " s");
}

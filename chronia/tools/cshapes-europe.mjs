// The borders between Europe's states from 1816 to 1885 from CShapes-Europe (Cederman, Girardin, Müller-Crepon, and Pengl,
// ETH Zürich: the states of the international system in Europe, year by year from 1816, on the same lines as CShapes 2.0
// from 1886). The dataset maps sovereign states only: it draws Finland and Congress Poland as Russia, Lombardy–Venetia and
// Tuscany as Austria, Hanover inside the United Kingdom while the two shared a king, and the Danubian principalities and
// Serbia not at all, and its outlines lie on a grid of about two kilometres. So it does not replace the map: it moves land
// between states where it and the map disagree on whose it was.
//
// Each span whose sovereign (the span itself, or its ruler when it is a colony, protectorate, mandate, or dependency) is a
// state of CSE_HOLDER loses the land that CShapes-Europe gives, in the same year, to another state of CSE_HOLDER, piece by
// piece, and the piece joins the span of that state it touches. A piece moves only if it is at least PIECE_KM2 in area and
// PIECE_WIDTH_KM wide on average, so the two datasets' different drawings of a line they agree on leave the map's own line,
// and only if a span of the other state touches it. A span that would lose more than PROTECT_SHARE of its land in a year is
// one the dataset does not draw as the map does (Hanover inside the United Kingdom to 1837, a personal union), and keeps it all.
// States smaller than CSE_MIN_KM2 in the dataset are left out on both sides unless SMALL_OK names them, and CSE_REFUSE keeps
// the moves where the dataset is the one in error. Land the dataset gives to no state of CSE_HOLDER is not touched.

export const CSE_FROM = 1816, CSE_TO = 1885;
export const CSE_MIN_KM2 = 12000, PIECE_KM2 = 40, PIECE_WIDTH_KM = 3, PROTECT_SHARE = 0.4;
// The map's sovereigns and the dataset's state codes (Gleditsch and Ward's, and its own from 10000 for states they leave out).
export const CSE_HOLDER = {
  "United Kingdom": 200, "Netherlands": 210, "Belgium": 211,
  "Bourbon Kingdom of France": 220, "Kingdom of France": 220, "Kingdom of the French": 220, "French Second Republic": 220, "Second French Empire": 220, "French Third Republic": 220,
  "Switzerland": 225, "Kingdom of Spain": 230, "Kingdom of Portugal": 235,
  "Kingdom of Hanover": 240, "Kingdom of Bavaria": 245, "Kingdom of Prussia": 255, "North German Confederation": 255, "German Empire": 255,
  "Grand Duchy of Baden": 267, "Kingdom of Saxony": 269, "Kingdom of Württemberg": 271, "Grand Duchy of Mecklenburg-Schwerin": 280,
  "Austrian Empire": 300, "Austria-Hungary": 300,
  "Kingdom of Italy": 325, "Papal States": 327, "Kingdom of Sardinia": 10023, "Kingdom of the Two Sicilies": 10016,
  "Principality of Serbia": 340, "Kingdom of Serbia": 340, "Kingdom of Greece": 350,
  "Principality of Romania": 360, "United Principalities of Moldavia and Wallachia": 360, "Kingdom of Romania": 360,
  "Russian Empire": 365, "United Kingdoms of Sweden and Norway": 380, "Denmark": 390, "Ottoman Empire": 640,
  // Smaller states the dataset draws with the map's own outline to within its grid. The Thuringian and Anhalt duchies, Reuss,
  // and Schwarzburg, made of scattered exclaves the dataset draws as a few blocks, are left out.
  "Electorate of Hesse": 273, "Grand Duchy of Hesse": 275, "Duchy of Nassau": 10021, "Duchy of Brunswick": 10037,
  "Duchy of Oldenburg": 10022, "Grand Duchy of Oldenburg": 10022, "Grand Duchy of Mecklenburg-Strelitz": 10020, "Free City of Bremen": 10006,
  "Free City of Frankfurt": 10010, "Principality of Lippe": 10017, "Principality of Schaumburg-Lippe": 10034,
  "Principality of Waldeck and Pyrmont": 10036, "Principality of Hohenzollern-Sigmaringen": 10015,
  "Free City of Krakow": 10009, "Duchy of Modena and Reggio": 332, "Duchy of Parma and Piacenza": 335, "Duchy of Lucca": 10018, "Duchy of Massa and Carrara": 10019,
  "Principality of Montenegro": 341
};
// Moves the map keeps out, where the dataset is wrong or less exact than the map: [state code, state code, first year, last
// year, box of the piece's centre or null for the whole border]. Borders that have not moved since, where the map's units lie
// on the same line, the dataset's grid only blurs: the Pyrenees, Switzerland's borders, Spain and Portugal, France and the
// Low Countries, France and the German states (the dataset's line of 1871 gives Gérardmer and Briey to Germany and
// Château-Salins to France), the Ore Mountains, Sweden-Norway and Russia, and Dalmatia and Croatia with Bosnia; and the Alps between
// France and Piedmont above the Var. The Bay of Kotor, Austria's from 1815, which the dataset gives to the Ottomans and from 1879
// to Montenegro; Pančevo and Zemun, on the Austrian bank of the Danube and the Sava, which it gives to the Ottomans and Serbia; and
// Vranje, Serbia's from 1878, which it leaves to them; Tende and La Brigue, Italian until 1947.
export const CSE_REFUSE = [
  [220, 255, 0, 9999, null], [220, 245, 0, 9999, null], [220, 267, 0, 9999, null],
  [220, 230, 0, 9999, null], [225, null, 0, 9999, null], [230, 235, 0, 9999, null], [220, 210, 0, 9999, null], [220, 211, 0, 9999, null],
  [300, 269, 0, 9999, null], [380, 365, 0, 9999, null], [300, 640, 0, 9999, [15, 42, 19.2, 45.5]],
  [220, 10023, 0, 9999, [5.5, 44.4, 7.8, 46.5]], [220, 325, 0, 9999, [5.5, 43.9, 7.8, 46.5]], [220, 10023, 0, 9999, [7.2, 43.9, 7.8, 44.4]],
  [340, 640, 1879, 9999, [21.4, 42.1, 22.7, 42.8]], [340, 355, 1879, 9999, [21.4, 42.1, 22.7, 42.8]],
  [271, 245, 0, 9999, [9.85, 47.55, 10.2, 47.8]], [300, 640, 0, 9999, [18.8, 44.3, 23, 45.9]], [300, 340, 0, 9999, [18.8, 44.3, 23, 45.9]], [300, 341, 0, 9999, null]
];
// Land the dataset's grid puts on the wrong side of a line it otherwise draws better than the map, which stays where it is:
// [west, south, east, north]. Pavia, on the Lombard bank of the Ticino, with the land that joins it to the rest of Lombardy.
export const CSE_STAY = [[9.1, 45.165, 9.4, 45.3]];
// Spans that keep their land whatever the dataset says: Luxembourg and Limburg, in personal union with the Netherlands, which
// the dataset draws in Belgium until 1839 and Luxembourg apart only from 1868.
export const CSE_KEEP = new Set(["Luxembourg", "Limburg", "Duchy of Limburg"]);
const RULED = new Set([1, 2, 3, 5]);
const SMALL_OK = new Set([273, 275, 10021, 10037, 10022, 10020, 10006, 10010, 10012, 10017, 10034, 10036, 10014, 10015, 10009, 332, 335, 10018, 10019, 341]);

// The same step serves the seam at 1 January 1886 (o): the shapes of that day from CShapes 2.0 for a few states, so that their
// last years before it end on the lines the map draws from it. o sets the years, the states, the smallest piece, the spans
// kept whole, the moves refused, the land that stays, and the tag the changed spans carry.
export function europeFromCShapes(list, features, h, o = {}) {
  const { clip, tryClip, rewind, polyKm2, boxOf, boxHit, withBox, log } = h;
  const FROM = o.from ?? CSE_FROM, TO = o.to ?? CSE_TO, HOLDER = o.holder ?? CSE_HOLDER, KEEP = o.keep ?? CSE_KEEP, MIN_KM2 = o.pieceKm2 ?? PIECE_KM2,
    MIN_WIDTH = o.widthKm ?? PIECE_WIDTH_KM, STAY = o.stay ?? CSE_STAY, TAG = o.tag ?? "cse", LABEL = o.label ?? "cshapes-europe", MIN_AREA = o.minKm2 ?? CSE_MIN_KM2;
  const R = 6371.0088, rad = Math.PI / 180;
  const ringKm = (ring) => {
    let t = 0;
    for (let i = 1; i < ring.length; i++) {
      const [x0, y0] = ring[i - 1], [x1, y1] = ring[i];
      const dx = (x1 - x0) * Math.cos(((y0 + y1) / 2) * rad), dy = y1 - y0;
      t += Math.sqrt(dx * dx + dy * dy) * rad * R;
    }
    return t;
  };
  const polysOf = (g) => (!g ? [] : g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);
  const recs = [];
  for (const f of features) {
    const p = f.properties, a = Math.max(p.From, FROM), b = Math.min(p.To, TO);
    if (a > b || p.Holder !== p.Id || !(p.Area >= MIN_AREA || SMALL_OK.has(p.Id))) continue;
    const polys = rewind(polysOf(f.geometry));
    if (polys.length) recs.push({ h: p.Holder, name: p.Name, first: a, last: b, polys, box: boxOf(polys) });
  }
  const mapped = new Set(Object.values(HOLDER));
  const sovOf = (s) => {
    if (s.people || s.claims || !s.polys || KEEP.has(s.name)) return null;
    if (s.ruler) return RULED.has(s.status) ? HOLDER[s.ruler] ?? null : null;
    return HOLDER[s.name] ?? null;
  };
  const refused = (H1, H2, a, b, box) => (o.refuse ? o.refuse(H1, H2, a, b, box) : false) || (!o.refuse && CSE_REFUSE.some(([x, y, f, l, bx]) => (((x === H1 && (y === null || y === H2)) || (x === H2 && (y === null || y === H1)))) && f <= b && l >= a &&
    (!bx || (((box[0] + box[2]) / 2 >= bx[0] && (box[0] + box[2]) / 2 <= bx[2] && (box[1] + box[3]) / 2 >= bx[1] && (box[1] + box[3]) / 2 <= bx[3])))));
  const inWindow = (s) => s.last >= FROM && s.first <= TO;
  // Candidate spans, and the spans of each state that pieces may join.
  const subjects = [], byHolder = new Map();
  list.forEach((s, i) => {
    if (!inWindow(s)) return;
    const H = sovOf(s);
    if (H === null || !mapped.has(H)) return;
    const box = s.box || boxOf(s.polys);
    subjects.push({ i, s, H, box });
    if (!byHolder.has(H)) byHolder.set(H, []);
    byHolder.get(H).push({ i, s, box });
  });
  const discs = STAY.map(([x0, y0, x1, y1]) => rewind([[[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]])[0]);
  const keepPiece = (q) => {
    const km2 = polyKm2(q);
    if (km2 < MIN_KM2) return false;
    const per = q.reduce((t, r) => t + ringKm(r), 0);
    return per > 0 && (2 * km2) / per >= MIN_WIDTH;
  };
  // A grid of a span's vertices, to find the span a piece touches: a piece cut from a span along the border it shares with a
  // neighbour has the neighbour's vertices on that stretch.
  const key = (x, y) => Math.round(x * 200) + ":" + Math.round(y * 200);
  const vertexSets = new Map();
  const vertsOf = (s) => {
    let v = vertexSets.get(s);
    if (!v) { v = new Set(); for (const poly of s.polys) for (const ring of poly) for (const [x, y] of ring) v.add(key(x, y)); vertexSets.set(s, v); }
    return v;
  };
  const touch = (q, t) => { const v = vertsOf(t); let n = 0; for (const ring of q) for (const [x, y] of ring) if (v.has(key(x, y))) n++; return n; };
  const edits = new Map();
  const editOf = (i) => { let e = edits.get(i); if (!e) edits.set(i, (e = { remove: [], add: [] })); return e; };
  let moved = 0, movedKm2 = 0, kept = 0, protectedYears = 0, failed = 0;
  const pairs = new Map(), guarded = new Map();
  for (const sub of subjects) {
    const { s, H, box } = sub;
    const a0 = Math.max(s.first, FROM), b0 = Math.min(s.last, TO);
    const near = recs.filter((r) => r.h !== H && r.last >= a0 && r.first <= b0 && boxHit(r.box, box));
    const own = recs.filter((r) => r.h === H && r.last >= a0 && r.first <= b0);
    if (!near.length) continue;
    const cuts = new Set([a0, b0 + 1]);
    for (const r of near.concat(own)) { if (r.first > a0) cuts.add(r.first); if (r.last < b0) cuts.add(r.last + 1); }
    const at = [...cuts].sort((x, y) => x - y);
    const area = s.polys.reduce((t, q) => t + polyKm2(q), 0);
    for (let k = 0; k + 1 < at.length; k++) {
      const a = at[k], b = at[k + 1] - 1;
      const others = near.filter((r) => r.first <= a && r.last >= b);
      if (!others.length || !own.some((r) => r.first <= a && r.last >= b)) continue;
      const pieces = [];
      let lost = 0;
      for (const r of others) {
        const x = tryClip(clip.intersection, s.polys, r.polys);
        if (!x) { failed++; continue; }
        for (let q of rewind(x)) {
          const km2 = polyKm2(q);
          lost += km2;
          if (!keepPiece(q) || refused(H, r.h, a, b, boxOf([q]))) continue;
          const bq = boxOf([q]), hit = discs.filter((d) => boxHit(boxOf([d]), bq));
          if (hit.length) { const d = tryClip(clip.difference, [q], ...hit.map((c) => [c])); if (!d) continue; for (const q2 of rewind(d)) if (keepPiece(q2)) pieces.push({ q: q2, H2: r.h, km2: polyKm2(q2) }); continue; }
          pieces.push({ q, H2: r.h, km2 });
        }
      }
      if (lost > PROTECT_SHARE * area) { protectedYears += b - a + 1; guarded.set(s.name, (guarded.get(s.name) || 0) + b - a + 1); continue; }
      for (const pc of pieces) {
        const cands = (byHolder.get(pc.H2) || []).filter((t) => t.s.last >= a && t.s.first <= b && boxHit(t.box, boxOf([pc.q])));
        let best = null, most = 0;
        for (const t of cands) { const n = touch(pc.q, t.s); if (n > most) { most = n; best = t; } }
        if (!best) { kept++; continue; }
        const ya = Math.max(a, best.s.first), yb = Math.min(b, best.s.last);
        editOf(sub.i).remove.push({ a: ya, b: yb, q: pc.q });
        editOf(best.i).add.push({ a: ya, b: yb, q: pc.q });
        moved++; movedKm2 += pc.km2;
        if (h.onMove) h.onMove({ from: s.name, to: best.s.name, a: ya, b: yb, km2: pc.km2, box: boxOf([pc.q]), q: pc.q });
        const pk = s.name + " → " + best.s.name;
        pairs.set(pk, (pairs.get(pk) || 0) + pc.km2);
      }
    }
  }
  // Each span with edits, cut into the years in which its land stays the same.
  const res = [];
  let pieces = 0;
  list.forEach((s, i) => {
    const e = edits.get(i);
    if (!e) { res.push(s); return; }
    const all = e.remove.concat(e.add), cuts = new Set([s.first, s.last + 1]);
    for (const x of all) { cuts.add(x.a); cuts.add(x.b + 1); }
    const at = [...cuts].filter((y) => y >= s.first && y <= s.last + 1).sort((x, y) => x - y);
    for (let k = 0; k + 1 < at.length; k++) {
      const a = at[k], b = at[k + 1] - 1;
      const rm = e.remove.filter((x) => x.a <= a && x.b >= b).map((x) => x.q), ad = e.add.filter((x) => x.a <= a && x.b >= b).map((x) => x.q);
      const seg = { ...s, first: a, last: b };
      if (s.dayFrom && a !== s.first) delete seg.dayFrom;
      if (s.dayTo && b !== s.last) delete seg.dayTo;
      if (!rm.length && !ad.length) { res.push(a === s.first && b === s.last ? s : withBox(seg)); continue; }
      let polys = s.polys;
      if (rm.length) { const d = tryClip(clip.difference, polys, ...rm.map((q) => [q])); if (d) polys = rewind(d).filter((q) => polyKm2(q) >= 0.05); else failed++; }
      if (ad.length) { const u = tryClip(clip.union, polys, ...ad.map((q) => [q])); polys = u ? rewind(u) : polys.concat(ad); if (!u) failed++; }
      if (!polys.length) continue;
      pieces++;
      res.push(withBox({ ...seg, polys, cse: TAG, geoHash: undefined }));
    }
  });
  log(LABEL + ": " + recs.length + " shapes of " + new Set(recs.map((r) => r.h)).size + " states, " + moved + " pieces (" + Math.round(movedKm2) + " km² in all) moved between states in " +
    pieces + " spans, " + kept + " left where no span of the other state touched them, " + protectedYears + " span-years kept whole (" + [...guarded].map(([n, y]) => n + " " + y).join(", ") + ")" +
    (failed ? ", " + failed + " clips failed" : "") + "; the largest moves: " + [...pairs].sort((x, y) => y[1] - x[1]).slice(0, 25).map(([n, v]) => n + " " + Math.round(v)).join(", "));
  return res;
}

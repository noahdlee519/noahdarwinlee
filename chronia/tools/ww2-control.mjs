// The Second World War's zones of control, month by month, from towns' capture and liberation dates
// (tools/control/ww2-towns.json; see the README's "Zones of control"). Each month, on the 15th, every
// town listed for the war has a holder; the land is split into the towns' Voronoi cells, which are
// joined by side and cut to the countries then at war. Two wars: Europe, Africa, and the Middle East
// from September 1939, and Asia and the Pacific from the Mukden Incident of September 1931. The axis
// side's cells, not cut to the land, are also written to tools/control/ww2-axis.json, which
// build-eras.mjs reads to cut the wartime regimes to the ground the Axis held each month.

export const WW2_SIDES = {
  axis: ["Axis (Germany, Italy, Japan, and their allies)", "#3b3b3b"],
  allies: ["Allies", "#2f62b0"],
  soviet: ["Soviet Union", "#b23a30"],
  vichy: ["Vichy France", "#7c4f9e"]
};

// The countries in each war, from the day they entered it: [Natural Earth adm0_a3, first day, test on
// the unit's properties and centre (optional)]. Neutral countries are left out, so they are never hatched.
const west = (lon) => (p, c) => c[0] < lon;
const north = (lat) => (p, c) => c[1] > lat;
const named = (...names) => (p) => names.includes(p.name);
const EUROPE_UNITS = [
  ["POL", "1939-09-01"], ["DEU", "1939-09-01"], ["AUT", "1939-09-01"], ["CZE", "1939-09-01"], ["SVK", "1939-09-01"],
  ["FRA", "1939-09-01", (p, c) => c[0] > -6 && c[1] > 41], ["GBR", "1939-09-01"], ["GGY", "1939-09-01"], ["JEY", "1939-09-01"], ["IMN", "1939-09-01"],
  ["RUS", "1939-09-01", named("Kaliningrad")], ["LTU", "1939-09-01", named("Klaipedos")],
  ["BLR", "1939-09-17"], ["UKR", "1939-09-17", (p) => p.name !== "Transcarpathia" && p.name !== "Chernivtsi"],
  ["RUS", "1939-09-17", (p, c) => c[0] < 60 && p.name !== "Kaliningrad" && !["Nenets", "Komi", "Yamal-Nenets", "Khanty-Mansiy"].includes(p.name)],
  ["GEO", "1939-09-17"], ["ARM", "1939-09-17"], ["AZE", "1939-09-17"],
  ["FIN", "1939-11-30"], ["ALA", "1939-11-30"],
  ["DNK", "1940-04-09"], ["NOR", "1940-04-09", (p) => !["Svalbard", "Bouvet Island"].includes(p.name)],
  ["NLD", "1940-05-10", (p, c) => c[1] > 50], ["BEL", "1940-05-10"], ["LUX", "1940-05-10"],
  ["ITA", "1940-06-10"], ["SMR", "1940-06-10"], ["VAT", "1940-06-10"], ["MLT", "1940-06-10"], ["ALB", "1940-06-10"],
  ["LBY", "1940-06-10", north(26)], ["EGY", "1940-06-10", north(26)], ["ERI", "1940-06-10"], ["ETH", "1940-06-10"], ["SOM", "1940-06-10"], ["SOL", "1940-06-10"], ["DJI", "1940-06-10"],
  ["MAR", "1940-06-25", (p) => !["Tanger - Tétouan", "Laâyoune - Boujdour - Sakia El Hamra", "Oued el Dahab", "Guelmim - Es-Semara"].includes(p.name)],
  ["DZA", "1940-06-25", north(33)], ["TUN", "1940-06-25", north(32)], ["SYR", "1940-06-25"], ["LBN", "1940-06-25"],
  ["EST", "1940-06-15"], ["LVA", "1940-06-15"], ["LTU", "1940-06-15", (p) => p.name !== "Klaipedos"],
  ["MDA", "1940-06-28"], ["UKR", "1940-06-28", named("Chernivtsi")],
  ["GRC", "1940-10-28"],
  ["BGR", "1941-03-01"],
  ["SRB", "1941-04-06"], ["HRV", "1941-04-06"], ["BIH", "1941-04-06"], ["SVN", "1941-04-06"], ["MNE", "1941-04-06"], ["MKD", "1941-04-06"], ["KOS", "1941-04-06"],
  ["HUN", "1941-04-11"], ["UKR", "1941-04-11", named("Transcarpathia")],
  ["IRQ", "1941-05-02"],
  ["ROU", "1941-06-22"],
  ["IRN", "1941-08-25"]
];
const ASIA_UNITS = [
  ["CHN", "1931-09-18", named("Liaoning", "Jilin", "Heilongjiang")],
  ["CHN", "1933-01-01", named("Inner Mongol")],
  ["CHN", "1937-07-07", (p) => !["Xinjiang", "Xizang", "Qinghai", "Paracel Islands", "Liaoning", "Jilin", "Heilongjiang", "Inner Mongol"].includes(p.name)],
  ["KOR", "1937-07-07"], ["PRK", "1937-07-07"], ["TWN", "1937-07-07"], ["JPN", "1937-07-07"],
  ["VNM", "1940-09-22"], ["LAO", "1940-09-22"], ["KHM", "1940-09-22"],
  ["THA", "1941-12-08"], ["MYS", "1941-12-08"], ["SGP", "1941-12-08"], ["BRN", "1941-12-08"], ["HKG", "1941-12-08"],
  ["PHL", "1941-12-08"], ["IDN", "1941-12-08"], ["TLS", "1941-12-08"], ["MMR", "1941-12-08"], ["PNG", "1941-12-08"], ["SLB", "1941-12-08"],
  ["GUM", "1941-12-08"], ["MNP", "1941-12-08"], ["PLW", "1941-12-08"], ["FSM", "1941-12-08"], ["MHL", "1941-12-08"], ["KIR", "1941-12-08", (p, c) => c[0] > 160], ["NRU", "1941-12-08"],
  ["IND", "1941-12-08", named("Manipur", "Nagaland", "Andaman and Nicobar")],
  ["USA", "1941-12-08", named("Alaska")],
  ["RUS", "1945-08-09", named("Sakhalin", "Primor'ye", "Khabarovsk", "Amur", "Yevrey")]
];
export const WW2_WARS = [
  { key: "ww2europe", name: "Second World War in Europe, Africa, and the Middle East", theatres: ["europe"], from: "1939-09", to: "1945-05", box: [-11, 1, 61, 72], units: EUROPE_UNITS },
  { key: "ww2asia", name: "Second World War in Asia and the Pacific", theatres: ["asia"], from: "1931-09", to: "1945-09", box: [88, -12, 180, 56], units: ASIA_UNITS }
];
// The Aleutians only, not the rest of Alaska.
const ALEUTIANS = [172, 51, 180, 53.5];

export function buildWW2(env) {
  const { ne, server, client, simplify, clip, Delaunay, input, out, index, dayOf, areaKm2, clockwise, weightFor, writeFileSync, readFileSync, existsSync, resolve, only } = env;
  const file = resolve(input, "ww2-towns.json");
  if (!existsSync(file)) { console.warn("ww2: no " + file); return; }
  const src = JSON.parse(readFileSync(file, "utf8"));
  const axisOut = { source: src.source, theatres: [] };
  const centre = (f) => {
    let b = [Infinity, Infinity, -Infinity, -Infinity];
    const g = f.geometry, polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    for (const poly of polys) for (const [x, y] of poly[0]) b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)];
    return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
  };
  for (const war of WW2_WARS) {
    if (only.length && !only.includes(war.key) && !only.includes("ww2")) continue;
    const t0 = Date.now();
    // The war's units, in one topology (simplified to about 0.5 km), so the land of any set of them is merged exactly.
    const feats = [], unitFrom = [];
    ne.features.forEach((f) => {
      const p = f.properties, c = centre(f);
      let first = null;
      for (const [a3, from, test] of war.units) {
        if (p.adm0_a3 !== a3 || (test && !test(p, c))) continue;
        if (a3 === "USA" && !(c[0] > ALEUTIANS[0] || c[0] < -165)) continue;
        if (first === null || from < first) first = from;
      }
      if (first === null) return;
      let geom = f.geometry;
      if (p.adm0_a3 === "USA") {
        const bx = [[[ALEUTIANS[0], ALEUTIANS[1]], [ALEUTIANS[2], ALEUTIANS[1]], [ALEUTIANS[2], ALEUTIANS[3]], [ALEUTIANS[0], ALEUTIANS[3]], [ALEUTIANS[0], ALEUTIANS[1]]]];
        const cut = clip.intersection(geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates, [bx]);
        if (!cut.length) return;
        geom = { type: "MultiPolygon", coordinates: cut };
      }
      feats.push({ type: "Feature", properties: {}, geometry: geom });
      unitFrom.push(first);
    });
    const rawTopo = server.topology({ u: { type: "FeatureCollection", features: feats } }, 1e6);
    const topoU = simplify.simplify(simplify.presimplify(rawTopo, simplify.sphericalTriangleArea), weightFor(0.5));
    const regionMemo = new Map();
    const regionAt = (iso) => {
      const ids = []; unitFrom.forEach((d, i) => { if (d <= iso) ids.push(i); });
      const key = ids.length + ":" + ids[0] + ":" + ids[ids.length - 1] + ":" + ids.reduce((t, i) => (t * 31 + i) % 1e9, 7);
      if (!regionMemo.has(key)) regionMemo.set(key, { key, polys: ids.length ? client.merge(topoU, ids.map((i) => topoU.objects.u.geometries[i])).coordinates : [] });
      return regionMemo.get(key);
    };
    const towns = src.towns.filter((t) => war.theatres.includes(t[4]));
    const holderAt = (t, iso) => { let h = null; for (const [d, s] of t[3]) { if (d <= iso) h = s; else break; } return h; };
    const [y0, m0] = war.from.split("-").map(Number), [y1, m1] = war.to.split("-").map(Number);
    const bbox = war.box, lat0 = (bbox[1] + bbox[3]) / 2, kx = Math.cos(lat0 * Math.PI / 180);
    const frame = [(bbox[0] - 1) * kx, bbox[1] - 1, (bbox[2] + 1) * kx, bbox[3] + 1];
    const shapes = [], rows = [], open = new Map(), axisMonths = [];
    let prevSig = "", prev = null, distinct = 0;
    const finish = (s, last) => { const r = open.get(s); if (r) { r[2] = last; open.delete(s); } };
    for (let y = y0, m = m0; y < y1 || (y === y1 && m <= m1); m === 12 ? (y++, m = 1) : m++) {
      const iso = y + "-" + String(m).padStart(2, "0") + "-15";
      const first = dayOf(y, m, 1), last = dayOf(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1) - 1;
      const pts = [], sides = [];
      towns.forEach((t, i) => { const s = holderAt(t, iso); if (s && WW2_SIDES[s]) { pts.push([t[0], t[1]]); sides.push(s); } });
      const reg = regionAt(iso), region = reg.polys;
      const sig = reg.key + "|" + pts.length + "|" + sides.join("");
      let byside, axis;
      if (sig === prevSig && prev) ({ byside, axis } = prev);
      else {
        const d = Delaunay.from(pts, (p) => p[0] * kx, (p) => p[1]);
        const v = d.voronoi(frame);
        const geoms = [], groups = new Map();
        pts.forEach((p, k) => {
          const c = v.cellPolygon(k);
          if (!c) return;
          if (!groups.has(sides[k])) groups.set(sides[k], []);
          groups.get(sides[k]).push(geoms.length);
          geoms.push({ type: "Polygon", coordinates: [c.map((q) => [q[0] / kx, q[1]])] });
        });
        const topo = server.topology({ c: { type: "GeometryCollection", geometries: geoms } });
        byside = new Map(); axis = [];
        for (const [s, list] of groups) {
          const merged = client.merge(topo, list.map((k) => topo.objects.c.geometries[k])).coordinates;
          if (s === "axis") axis = merged.map((poly) => poly.map((r) => r.map(([x, yy]) => [+x.toFixed(3), +yy.toFixed(3)])));
          if (!region.length) continue;
          const polys = clip.intersection(merged, region).filter((p) => areaKm2(p) >= 2);
          if (polys.length) byside.set(s, polys);
        }
        prevSig = sig; prev = { byside, axis }; distinct++;
      }
      for (const s of [...open.keys()]) if (!byside.has(s)) finish(s, first - 1);
      for (const [s, polys] of byside) {
        const r = open.get(s);
        if (r && r.polys === polys) { r[2] = last; continue; }
        if (r) finish(s, first - 1);
        const row = [s, first, last, shapes.length];
        row.polys = polys;
        shapes.push({ type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: clockwise(polys) } });
        rows.push(row);
        open.set(s, row);
      }
      const am = axisMonths[axisMonths.length - 1];
      if (am && am[2] === axis) am[1] = last; else axisMonths.push([first, last, axis]);
    }
    const sideKeys = [...new Set(rows.map((r) => r[0]))];
    const raw = server.topology({ c: { type: "FeatureCollection", features: shapes } }, 1e5);
    const topo = client.quantize(simplify.simplify(simplify.presimplify(raw, simplify.sphericalTriangleArea), weightFor(1)), 1e5);
    const firstDay = rows.reduce((a, r) => Math.min(a, r[1]), Infinity), lastDay = rows.reduce((a, r) => Math.max(a, r[2]), -Infinity);
    const data = {
      key: war.key, name: war.name, credit: "towns' capture and liberation dates", source: src.source,
      sides: sideKeys.map((k) => [k, WW2_SIDES[k][0], WW2_SIDES[k][1]]),
      rows: rows.map((r) => [sideKeys.indexOf(r[0]), r[1], r[2], r[3]]), topo
    };
    writeFileSync(resolve(out, war.key + ".json"), JSON.stringify(data));
    index.wars = index.wars.filter((w) => w[0] !== war.key).concat([[war.key, war.name, firstDay, lastDay, bbox, "control/" + war.key + ".json"]]).sort((a, b) => a[2] - b[2]);
    axisOut.theatres.push({ key: war.key, box: bbox, first: firstDay, last: lastDay, months: axisMonths.map(([a, b, p]) => [a, b, p]) });
    console.log(war.key + ": " + towns.length + " towns, " + distinct + " distinct months, " + rows.length + " shapes of " + sideKeys.length + " sides, " + Math.round(JSON.stringify(data).length / 1024) + " KB, " + Math.round((Date.now() - t0) / 1000) + " s");
  }
  if (axisOut.theatres.length) writeFileSync(resolve(input, "ww2-axis.json"), JSON.stringify(axisOut));
}

// The Spanish Civil War's zones of control, from towns' dates of capture (tools/control/spain-towns.json;
// see the README's "Zones of control"). On each sample day, every town listed has a holder, the Republic
// or the Nationalists; the land is split into the towns' Voronoi cells, which are joined by side and cut
// to Spain's provinces (with the Balearics, the Canaries, Ceuta, and Melilla). The days are the 1st and
// 15th of each month, as the page shows a month by its 15th, with the first days of the rising and the
// last days of the war sampled more often (SPAIN_EXTRA). A sample's state holds until the next sample.

export const SPAIN_SIDES = {
  rep: ["Spanish Republic", "#b0302c"],
  nat: ["Nationalists", "#2f4f8a"]
};
const FROM = "1936-07-17", TO = "1939-04-01";
// The rising: towns' sides were settled from 17 to 21 July 1936, so the first sample, for 17 to 31
// July, is the state on the 21st. The final offensive: Madrid fell on 28 March 1939, Valencia on the
// 30th, and Almería, Murcia, and Cartagena on the 31st.
const FIRST_STATE = "1936-07-21";
const SPAIN_EXTRA = ["1939-03-27", "1939-03-28", "1939-03-29", "1939-03-30", "1939-03-31"];
const BOX = [-18.2, 27.6, 4.4, 43.9];

export function buildSpain(env) {
  const { ne, server, client, simplify, clip, Delaunay, input, out, index, dayOf, areaKm2, clockwise, weightFor, writeFileSync, readFileSync, existsSync, resolve, only } = env;
  if (only.length && !only.includes("spain")) return;
  const file = resolve(input, "spain-towns.json");
  if (!existsSync(file)) { console.warn("spain: no " + file); return; }
  const t0 = Date.now();
  const src = JSON.parse(readFileSync(file, "utf8"));
  // Spain's provinces, in one topology simplified to about 0.5 km, merged into the land the cells are cut to.
  const feats = ne.features.filter((f) => f.properties.adm0_a3 === "ESP").map((f) => ({ type: "Feature", properties: {}, geometry: f.geometry }));
  const rawU = server.topology({ u: { type: "FeatureCollection", features: feats } }, 1e6);
  const topoU = simplify.simplify(simplify.presimplify(rawU, simplify.sphericalTriangleArea), weightFor(0.5));
  const region = client.merge(topoU, topoU.objects.u.geometries).coordinates;
  const day = (iso) => { const [y, m, d] = iso.split("-").map(Number); return dayOf(y, m, d); };
  // Sample days: [first day of the range, the day whose state is drawn].
  const samples = [[FROM, FIRST_STATE]];
  for (let y = 1936, m = 8; y < 1939 || (y === 1939 && m <= 3); m === 12 ? (y++, m = 1) : m++) {
    const mm = y + "-" + String(m).padStart(2, "0");
    samples.push([mm + "-01", mm + "-01"], [mm + "-15", mm + "-15"]);
  }
  for (const d of SPAIN_EXTRA.concat([TO])) samples.push([d, d]);
  samples.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const holderAt = (t, iso) => { let h = null; for (const [d, s] of t[3]) { if (d <= iso) h = s; else break; } return h; };
  const lat0 = (BOX[1] + BOX[3]) / 2, kx = Math.cos(lat0 * Math.PI / 180);
  const frame = [(BOX[0] - 1) * kx, BOX[1] - 1, (BOX[2] + 1) * kx, BOX[3] + 1];
  const shapes = [], rows = [], open = new Map();
  let prevSig = "", prev = null, distinct = 0;
  const finish = (s, last) => { const r = open.get(s); if (r) { r[2] = last; open.delete(s); } };
  samples.forEach(([from, state], k) => {
    const first = day(from), last = k + 1 < samples.length ? day(samples[k + 1][0]) - 1 : day(TO);
    const pts = [], sides = [];
    for (const t of src.towns) { const s = holderAt(t, state); if (s && SPAIN_SIDES[s]) { pts.push([t[0], t[1]]); sides.push(s); } }
    const sig = sides.join("") + "|" + pts.length;
    let byside;
    if (sig === prevSig && prev) byside = prev;
    else {
      const d = Delaunay.from(pts, (p) => p[0] * kx, (p) => p[1]);
      const v = d.voronoi(frame);
      const geoms = [], groups = new Map();
      pts.forEach((p, i) => {
        const c = v.cellPolygon(i);
        if (!c) return;
        if (!groups.has(sides[i])) groups.set(sides[i], []);
        groups.get(sides[i]).push(geoms.length);
        geoms.push({ type: "Polygon", coordinates: [c.map((q) => [q[0] / kx, q[1]])] });
      });
      const topo = server.topology({ c: { type: "GeometryCollection", geometries: geoms } });
      byside = new Map();
      for (const [s, list] of groups) {
        const merged = client.merge(topo, list.map((i) => topo.objects.c.geometries[i])).coordinates;
        const polys = clip.intersection(merged, region).filter((p) => areaKm2(p) >= 2);
        if (polys.length) byside.set(s, polys);
      }
      prevSig = sig; prev = byside; distinct++;
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
  });
  const sideKeys = [...new Set(rows.map((r) => r[0]))];
  const raw = server.topology({ c: { type: "FeatureCollection", features: shapes } }, 1e5);
  const topo = client.quantize(simplify.simplify(simplify.presimplify(raw, simplify.sphericalTriangleArea), weightFor(0.5)), 1e5);
  const firstDay = rows.reduce((a, r) => Math.min(a, r[1]), Infinity), lastDay = rows.reduce((a, r) => Math.max(a, r[2]), -Infinity);
  const data = {
    key: "spain", name: "Spanish Civil War", credit: "towns' dates of capture", source: src.source,
    sides: sideKeys.map((s) => [s, SPAIN_SIDES[s][0], SPAIN_SIDES[s][1]]),
    rows: rows.map((r) => [sideKeys.indexOf(r[0]), r[1], r[2], r[3]]), topo
  };
  writeFileSync(resolve(out, "spain.json"), JSON.stringify(data));
  index.wars = index.wars.filter((w) => w[0] !== "spain").concat([["spain", data.name, firstDay, lastDay, BOX, "control/spain.json"]]).sort((a, b) => a[2] - b[2]);
  console.log("spain: " + src.towns.length + " towns, " + samples.length + " sample days, " + distinct + " distinct, " + rows.length + " shapes of " + sideKeys.length + " sides, " + Math.round(JSON.stringify(data).length / 1024) + " KB, " + Math.round((Date.now() - t0) / 1000) + " s");
}

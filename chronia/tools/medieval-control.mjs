// The early medieval wars' zones of control, from towns' dates of capture (tools/control/medieval-wars.json; see the README's
// "Zones of control"), drawn as the Spanish Civil War's are: on each month's sample day every town listed has a holder, the
// land is split into the towns' Voronoi cells, which are joined by side and cut to the war's region (Natural Earth's
// first-level divisions of its countries, within its outline if it has one). A month shows its state on the 15th, and holds
// until the next month. The dates come from the chronicles (Procopius for the Gothic War, the Anglo-Saxon Chronicle for the
// Great Heathen Army, the Royal Frankish Annals for the Saxon Wars, the Arab chroniclers for Spain and Sicily), most only to the
// year or the season; each town's note says what its dates rest on, and "approx." marks a date worked out from the towns around.

export function buildMedievalWars(env) {
  const { ne, server, client, simplify, clip, Delaunay, input, out, index, dayOf, areaKm2, clockwise, weightFor, writeFileSync, readFileSync, existsSync, resolve, only } = env;
  const file = resolve(input, "medieval-wars.json");
  if (!existsSync(file)) { console.warn("medieval wars: no " + file); return; }
  const src = JSON.parse(readFileSync(file, "utf8"));
  const iso = (d) => { const [y, m = "01", dd = "01"] = String(d).split("-"); return y.padStart(4, "0") + "-" + m.padStart(2, "0") + "-" + dd.padStart(2, "0"); };
  const day = (d) => { const [y, m, dd] = iso(d).split("-").map(Number); return dayOf(y, m, dd); };
  const inRing = (ring, p) => { let k = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) if ((ring[i][1] > p[1]) !== (ring[j][1] > p[1]) && p[0] < ring[i][0] + ((p[1] - ring[i][1]) * (ring[j][0] - ring[i][0])) / (ring[j][1] - ring[i][1])) k = !k; return k; };
  for (const W of src.wars) {
    if (only.length && !only.includes(W.key) && !only.includes("medieval")) continue;
    const t0 = Date.now();
    const R = W.region;
    const feats = ne.features.filter((f) => {
      const p = f.properties;
      if (!R.countries.includes(p.adm0_a3)) return false;
      if (R.units && R.units[p.adm0_a3] && !R.units[p.adm0_a3].includes(p.name_en || p.name) && !R.units[p.adm0_a3].includes(p.name)) return false;
      if (R.geounits && !R.geounits.includes(p.geonunit)) return false;
      if (R.regions && R.regions[p.adm0_a3] && !R.regions[p.adm0_a3].includes(p.region)) return false;
      return true;
    }).map((f) => ({ type: "Feature", properties: {}, geometry: f.geometry }));
    if (!feats.length) { console.warn(W.key + ": no land for its region"); continue; }
    const rawU = server.topology({ u: { type: "FeatureCollection", features: feats } }, 1e6);
    const topoU = simplify.simplify(simplify.presimplify(rawU, simplify.sphericalTriangleArea), weightFor(0.5));
    let region = client.merge(topoU, topoU.objects.u.geometries).coordinates;
    if (R.within) region = clip.intersection(region, [[R.within.concat([R.within[0]])]]);
    const box = [Infinity, Infinity, -Infinity, -Infinity];
    for (const poly of region) for (const [x, y] of poly[0]) { box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y); box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y); }
    const BOX = box.map((v) => Math.round(v * 100) / 100);
    // Sample days: the first of each month, drawn as the state on its 15th.
    const samples = [];
    const [fy, fm] = iso(W.from).split("-").map(Number), [ty, tm] = iso(W.to).split("-").map(Number);
    for (let y = fy, m = fm; y < ty || (y === ty && m <= tm); m === 12 ? (y++, m = 1) : m++) {
      const mm = String(y).padStart(4, "0") + "-" + String(m).padStart(2, "0");
      samples.push([y === fy && m === fm ? iso(W.from) : mm + "-01", mm + "-15"]);
    }
    const towns = W.towns.map((t) => [t[0], t[1], t[2], t[3].map(([d, s]) => [iso(d), s])]);
    for (const t of towns) for (const [, s] of t[3]) if (!W.sides[s]) throw new Error(W.key + ": town " + t[2] + " has no side " + s);
    const holderAt = (t, d) => { let h = null; for (const [x, s] of t[3]) { if (x <= d) h = s; else break; } return h; };
    const lat0 = (BOX[1] + BOX[3]) / 2, kx = Math.cos((lat0 * Math.PI) / 180);
    const frame = [(BOX[0] - 1) * kx, BOX[1] - 1, (BOX[2] + 1) * kx, BOX[3] + 1];
    const shapes = [], rows = [], open = new Map();
    let prevSig = "", prev = null, distinct = 0;
    const finish = (s, last) => { const r = open.get(s); if (r) { r[2] = last; open.delete(s); } };
    samples.forEach(([from, state], k) => {
      const first = day(from), last = k + 1 < samples.length ? day(samples[k + 1][0]) - 1 : (tm === 12 ? dayOf(ty + 1, 1, 1) : dayOf(ty, tm + 1, 1)) - 1;
      const pts = [], sides = [];
      for (const t of towns) { const s = holderAt(t, state); if (s) { pts.push([t[0], t[1]]); sides.push(s); } }
      const sig = sides.join(",") + "|" + pts.length;
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
      key: W.key, name: W.name, credit: "towns' dates of capture", source: W.source,
      sides: sideKeys.map((s) => [s, W.sides[s][0], W.sides[s][1]]),
      rows: rows.map((r) => [sideKeys.indexOf(r[0]), r[1], r[2], r[3]]), topo
    };
    writeFileSync(resolve(out, W.key + ".json"), JSON.stringify(data));
    index.wars = index.wars.filter((w) => w[0] !== W.key).concat([[W.key, W.name, firstDay, lastDay, BOX, "control/" + W.key + ".json"]]).sort((a, b) => a[2] - b[2]);
    console.log(W.key + ": " + towns.length + " towns, " + samples.length + " months, " + distinct + " distinct, " + rows.length + " shapes of " + sideKeys.length + " sides, " + Math.round(JSON.stringify(data).length / 1024) + " KB, " + Math.round((Date.now() - t0) / 1000) + " s");
  }
}

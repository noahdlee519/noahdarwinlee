// The occupations of the Napoleonic Wars in the zones of control: the land each occupier held in the wars themselves, day by day,
// from the dated table of 1803 to 1885 (tools/napoleonic.mjs, WAR_OCC), on the same UCHRONIA units the main map draws those years
// with. The main map leaves these occupations out and keeps the land its lawful owner's until the peace or the armistice that ended
// each war; what ran on after it is drawn there (see the README's "Europe from 1803 to 1885").
import { buildNapoleonic, WAR_OCC_SIDES } from "./napoleonic.mjs";

export const NAPOLEONIC_WAR = { key: "napoleonic", name: "Occupations of the Napoleonic Wars" };

const planar = (ring) => { let s = 0; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) s += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]; return s / 2; };
const polysOf = (g) => (!g ? [] : g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);
const rewind = (polys) => polys.map((poly) => poly.map((ring, k) => ((planar(ring) > 0) === (k === 0) ? ring.slice().reverse() : ring)));

export function buildNapoleonicControl(env) {
  const { here, ne, server, client, simplify, clip, out, index, areaKm2, clockwise, weightFor, writeFileSync, readFileSync, existsSync, resolve, only } = env;
  if (only.length && !only.includes(NAPOLEONIC_WAR.key)) return;
  const dir = resolve(here, "../../uchronia/data"), unitsPath = resolve(dir, "units.json"), provincesPath = resolve(dir, "provinces.json");
  if (!existsSync(unitsPath) || !existsSync(provincesPath)) { console.log("napoleonic: no UCHRONIA units or provinces in " + dir + ", so the zones of control keep their old file"); return; }
  const topo = JSON.parse(readFileSync(unitsPath, "utf8"));
  const provinces = JSON.parse(readFileSync(provincesPath, "utf8")).objects.provinces.geometries.map((g) => g.properties);
  const N = buildNapoleonic({ topo, provinces, client, clip, neAll: ne.features, rewind, polysOf });
  const sideKeys = Object.keys(WAR_OCC_SIDES).filter((k) => N.war.some((r) => r.side === k));
  const shapes = [], rows = [];
  for (const r of N.war) {
    const polys = r.polys.filter((q) => areaKm2(q) >= 0.5);
    if (!polys.length) continue;
    rows.push([sideKeys.indexOf(r.side), r.first, r.last, shapes.length]);
    shapes.push({ type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: clockwise(polys) } });
  }
  const raw = server.topology({ c: { type: "FeatureCollection", features: shapes } }, 1e5);
  const topoOut = client.quantize(simplify.simplify(simplify.presimplify(raw, simplify.sphericalTriangleArea), weightFor(0.3)), 1e5);
  let bbox = [Infinity, Infinity, -Infinity, -Infinity];
  for (const f of shapes) for (const poly of f.geometry.coordinates) for (const [x, y] of poly[0]) bbox = [Math.min(bbox[0], x), Math.min(bbox[1], y), Math.max(bbox[2], x), Math.max(bbox[3], y)];
  bbox = bbox.map((v) => +v.toFixed(2));
  const data = {
    key: NAPOLEONIC_WAR.key, name: NAPOLEONIC_WAR.name, credit: "CHRONIA's table of 1803 to 1815",
    source: "The occupations of the Napoleonic Wars in CHRONIA's dated table of Europe from 1803 to 1885 (tools/napoleonic.mjs), from the English Wikipedia articles on each state, treaty, and siege; the land from UCHRONIA's districts and provinces",
    sides: sideKeys.map((k) => [k, WAR_OCC_SIDES[k][0], WAR_OCC_SIDES[k][1]]), rows, topo: topoOut
  };
  writeFileSync(resolve(out, NAPOLEONIC_WAR.key + ".json"), JSON.stringify(data));
  const first = rows.reduce((a, r) => Math.min(a, r[1]), Infinity), last = rows.reduce((a, r) => Math.max(a, r[2]), -Infinity);
  index.wars = index.wars.filter((w) => w[0] !== NAPOLEONIC_WAR.key).concat([[NAPOLEONIC_WAR.key, NAPOLEONIC_WAR.name, first, last, bbox, "control/" + NAPOLEONIC_WAR.key + ".json"]]).sort((x, y) => x[2] - y[2]);
  console.log("napoleonic: " + rows.length + " shapes of " + sideKeys.length + " sides, " + N.war.map((r) => r.side + " " + r.from + ".." + r.to).length + " stretches, " + Math.round(JSON.stringify(data).length / 1024) + " KB");
}

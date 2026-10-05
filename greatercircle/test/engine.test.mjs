// node --test test/   (from greatercircle/)
//
// The engine against d3-geo, and against what a route must satisfy: never
// inside an avoided country, no longer than it has to be, the same length in
// either direction.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const G = require(resolve(here, "../engine.js"));

// The vendored UMD bundles, run in a bare context so they attach to a global.
const ctx = vm.createContext({});
for (const f of ["d3-array", "d3-geo", "topojson-client", "topojson-simplify"]) {
  vm.runInContext(readFileSync(resolve(here, "../vendor", f + ".min.js"), "utf8"), ctx, { filename: f });
}
const d3 = ctx.d3, topojson = ctx.topojson;

const topo = JSON.parse(readFileSync(resolve(here, "../data/countries-50m.json"), "utf8"));
const world = topojson.feature(topo, topo.objects.countries);
const byName = new Map(world.features.map((f) => [f.properties.name, f]));
const feat = (name) => { const f = byName.get(name); if (!f) throw new Error("no feature " + name); return f; };
const KM = G.EARTH_RADIUS_KM;

function rand(seed) { // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

test("lon/lat ↔ vector round trip and angles agree with d3", () => {
  const r = rand(1);
  for (let i = 0; i < 2000; i++) {
    const lon = r() * 360 - 180, lat = r() * 180 - 90;
    const [lon2, lat2] = G.toLonLat(G.toVec(lon, lat));
    assert.ok(Math.abs(lat - lat2) < 1e-9);
    if (Math.abs(lat) < 89.999) assert.ok(Math.abs(((lon - lon2 + 540) % 360) - 180) < 1e-9);
    const lonB = r() * 360 - 180, latB = r() * 180 - 90;
    const mine = G.angleBetween(G.toVec(lon, lat), G.toVec(lonB, latB));
    const theirs = d3.geoDistance([lon, lat], [lonB, latB]);
    assert.ok(Math.abs(mine - theirs) < 1e-9, `${mine} vs ${theirs}`);
  }
});

test("distances: sphere and ellipsoid in the known range", () => {
  // Paris – New York: 5,838 km on the sphere, 5,853 km on the ellipsoid.
  const e = G.ellipsoidDistanceKm(2.3522, 48.8566, -74.006, 40.7128);
  assert.ok(Math.abs(e - 5853) < 3, String(e));
  const s = G.sphereDistanceKm(2.3522, 48.8566, -74.006, 40.7128);
  assert.ok(Math.abs(s - 5838) < 3, String(s));
  assert.equal(G.ellipsoidDistanceKm(10, 10, 10, 10), 0);
});

test("signed area: sign follows winding and magnitude matches d3", () => {
  const ccw = [[0, 0], [10, 0], [10, 10], [0, 10]].map((c) => G.toVec(c[0], c[1]));
  const a = G.sphericalSignedArea(ccw);
  assert.ok(a > 0, "anticlockwise (as seen from outside) is positive");
  assert.ok(G.sphericalSignedArea([...ccw].reverse()) < 0);
  // d3 wants clockwise exterior rings.
  const d = d3.geoArea({ type: "Polygon", coordinates: [[[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]] });
  assert.ok(Math.abs(Math.abs(a) - d) < 1e-9, `${a} vs ${d}`);
});

// A 10°×10° square as a clockwise GeoJSON polygon, the way the data is wound.
const square = { type: "Feature", id: "sq", properties: { name: "Square" },
  geometry: { type: "Polygon", coordinates: [[[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]] } };

test("arcs against a square: crossing, touching, running along, through a corner", () => {
  const obs = G.buildObstacles([square]);
  assert.equal(obs.n, 4);
  assert.equal(obs.corners.count, 4, "four convex corners");
  const V = (lon, lat) => G.toVec(lon, lat);
  const cornerAt = (lon, lat) => { const v = V(lon, lat); for (let i = 0; i < 4; i++) if (G.angleBetween(v, [obs.corners.X[i], obs.corners.Y[i], obs.corners.Z[i]]) < 1e-12) return i; return -1; };
  assert.ok(!G.arcIsFree(obs, V(-5, 5), V(15, 5), -1, -1), "straight through");
  assert.ok(G.arcIsFree(obs, V(-5, -5), V(15, -5), -1, -1), "passes south of it");
  assert.ok(G.arcIsFree(obs, V(-5, 10), V(15, 10), -1, -1), "the great circle bulges north of the top edge");
  assert.ok(G.arcIsFree(obs, V(-5, 0), V(0, 0), -1, cornerAt(0, 0)), "touches a corner from outside");
  assert.ok(G.arcIsFree(obs, V(0, 0), V(10, 0), cornerAt(0, 0), cornerAt(10, 0)), "runs along the bottom edge");
  assert.ok(G.arcIsFree(obs, V(0, 20), V(0, 0), -1, cornerAt(0, 0)), "runs along the west edge from beyond");
  assert.ok(!G.arcIsFree(obs, V(0, 0), V(10, 10), cornerAt(0, 0), cornerAt(10, 10)), "the diagonal goes through");
  // Through the corner (10,10) transversally: reflect an outside point through it.
  const w = V(10, 10), v = V(15, 15), dot = v[0] * w[0] + v[1] * w[1] + v[2] * w[2];
  const b = G.normalize([2 * dot * w[0] - v[0], 2 * dot * w[1] - v[1], 2 * dot * w[2] - v[2]]);
  assert.ok(G.angleBetween(b, V(5, 5)) < 0.02, "the reflection lands inside");
  assert.ok(!G.arcIsFree(obs, v, b, -1, -1), "passes straight through the corner");
  assert.ok(G.arcIsFree(obs, v, w, -1, -1), "ends on the corner from outside");
  assert.ok(!G.arcIsFree(obs, w, b, -1, -1), "starts on the corner and goes in");
  // Points in and out.
  assert.deepEqual(G.featuresContaining(obs, V(5, 5)), [0]);
  assert.deepEqual(G.featuresContaining(obs, V(-1, 5)), []);
  assert.deepEqual(G.featuresContaining(obs, V(5, 10.3)), [], "north of the top edge but south of its bulge? no: 10.3 is above the chord too");
  assert.deepEqual(G.featuresContaining(obs, V(5, 10.02)), [0], "inside the northward bulge of the top edge (its crown is at 10.038°)");
});

test("arcs along the square's edges in either direction, and endpoints on edges", () => {
  const obs = G.buildObstacles([square]);
  const V = (lon, lat) => G.toVec(lon, lat);
  const cornerAt = (lon, lat) => { const v = V(lon, lat); for (let i = 0; i < 4; i++) if (G.angleBetween(v, [obs.corners.X[i], obs.corners.Y[i], obs.corners.Z[i]]) < 1e-12) return i; return -1; };
  assert.ok(G.arcIsFree(obs, V(10, 0), V(0, 0), cornerAt(10, 0), cornerAt(0, 0)), "along the bottom edge, backwards");
  assert.ok(G.arcIsFree(obs, V(0, 0), V(0, 10), cornerAt(0, 0), cornerAt(0, 10)), "up the west edge");
  assert.ok(G.arcIsFree(obs, V(0, 10), V(0, 0), cornerAt(0, 10), cornerAt(0, 0)), "down the west edge");
  assert.ok(G.arcIsFree(obs, V(0, 0), V(0, -5), cornerAt(0, 0), -1), "away from the corner, down the meridian");
  assert.ok(G.arcIsFree(obs, V(0, 20), V(0, 15), -1, -1), "on the meridian beyond the square");
  assert.ok(!G.arcIsFree(obs, V(0, 5), V(5, 5), -1, -1), "from the west edge straight in");
  assert.ok(G.arcIsFree(obs, V(0, 5), V(-5, 5), -1, -1), "from the west edge straight out");
  assert.ok(!G.arcIsFree(obs, V(0, 5), V(10, 5), -1, -1), "edge to edge through the middle");
});

// An S: two bars, the equator the bottom of the upper one from 0 to 5 and the
// top of the lower one from 15 to 20, and inside the obstacle between. The
// arc from corner (0,0) to corner (20,0) runs along the boundary, then through
// the obstacle, then along the boundary again.
const sShape = { type: "Feature", id: "s", properties: { name: "S" },
  geometry: { type: "Polygon", coordinates: [[[0, 0], [5, 0], [5, -5], [20, -5], [20, 0], [15, 0], [15, 5], [0, 5], [0, 0]]] } };

test("an arc that runs along a straight border and then into the obstacle is blocked", () => {
  const obs = G.buildObstacles([sShape]);
  const V = (lon, lat) => G.toVec(lon, lat);
  const cornerAt = (lon, lat) => { const v = V(lon, lat); for (let i = 0; i < obs.corners.count; i++) if (G.angleBetween(v, [obs.corners.X[i], obs.corners.Y[i], obs.corners.Z[i]]) < 1e-12) return i; return -1; };
  assert.ok(cornerAt(0, 0) >= 0 && cornerAt(20, 0) >= 0, "the ends of the runs are corners");
  assert.ok(!G.arcIsFree(obs, V(0, 0), V(20, 0), cornerAt(0, 0), cornerAt(20, 0)), "corner to corner along the equator goes through");
  assert.ok(!G.arcIsFree(obs, V(20, 0), V(0, 0), cornerAt(20, 0), cornerAt(0, 0)), "and the other way");
  assert.ok(!G.arcIsFree(obs, V(-2, 0), V(22, 0), -1, -1), "from beyond either end too");
  assert.ok(G.arcIsFree(obs, V(0, 0), V(5, 0), cornerAt(0, 0), -1), "but along the first run alone is fine");
  const route = G.findRoute(obs, V(-2, 0), V(22, 0));
  assert.equal(route.status, "done");
  // Over the top: (-2,0)→(0,5)→(15,5)→(22,0), 5.39° + 14.94° + 8.60°.
  const deg = route.length * 180 / Math.PI;
  assert.ok(deg > 28.9 && deg < 28.95, `goes round: ${deg}°`);
  assert.equal(route.waypoints.length, 4);
  for (let i = 0; i + 1 < route.waypoints.length; i++) {
    for (const p of G.sampleArc(route.waypoints[i], route.waypoints[i + 1], 0.001, false)) {
      assert.deepEqual(G.featuresContaining(obs, p), [], "route point inside the S at " + G.toLonLat(p));
    }
  }
});

test("antipodes: a free semicircle is found, and obstacles are not ignored", () => {
  const obs = G.buildObstacles(["Ghana", "United Kingdom", "Algeria"].map(feat));
  const a = G.toVec(0, 0), b = G.toVec(180, 0);
  const r = G.findRoute(obs, a, b);
  assert.equal(r.status, "done");
  assert.ok(r.antipodal);
  assert.ok(Math.abs(r.length - Math.PI) < 1e-9);
  assertOutside(r, obs, ["Ghana", "United Kingdom", "Algeria"]);
  // No semicircle free: ring the start with obstacles? Hard to build; at least
  // the nudged search must still answer when every meridian is blocked near
  // the start by a band.
  const band = { type: "Feature", id: "band", properties: { name: "band" }, geometry: { type: "Polygon", coordinates: [[[-179, 20], [-179, 30], [179, 30], [179, 20], [-179, 20]]] } };
  const obs2 = G.buildObstacles([band]);
  const r2 = G.findRoute(obs2, G.toVec(0, 0), G.toVec(180, 0));
  assert.equal(r2.status, "done");
  assertOutside(r2, obs2, ["band"]);
});

test("a route around the square bends at its corners and is the shortest", () => {
  const obs = G.buildObstacles([square]);
  const a = G.toVec(-5, 5), b = G.toVec(15, 5);
  const s = G.findRoute(obs, a, b);
  assert.equal(s.status, "done");
  assert.equal(s.waypoints.length, 4, "start, two corners, end");
  const direct = G.angleBetween(a, b);
  assert.ok(s.length > direct);
  // Compare with the two obvious candidates: over the top or under the bottom.
  const via = (c1, c2) => G.angleBetween(a, c1) + G.angleBetween(c1, c2) + G.angleBetween(c2, b);
  const top = via(G.toVec(0, 10), G.toVec(10, 10)), bottom = via(G.toVec(0, 0), G.toVec(10, 0));
  assert.ok(Math.abs(s.length - Math.min(top, bottom)) < 1e-12, `${s.length} vs ${top} / ${bottom}`);
  const back = G.findRoute(obs, b, a);
  assert.ok(Math.abs(back.length - s.length) < 1e-12, "same length either way");
});

test("point in country agrees with d3.geoContains (Russia, USA, South Africa, Italy, Fiji, Canada)", () => {
  const names = ["Russia", "United States", "South Africa", "Italy", "Fiji", "Canada", "Indonesia", "Norway"];
  const obs = G.buildObstacles(names.map(feat));
  const r = rand(7);
  let total = 0, mismatches = [];
  for (let fi = 0; fi < names.length; fi++) {
    const f = feat(names[fi]);
    const [[x0, y0], [x1, y1]] = d3.geoBounds(f);
    for (let i = 0; i < 1500; i++) {
      let lon = x0 + r() * ((x1 >= x0 ? x1 : x1 + 360) - x0); if (lon > 180) lon -= 360;
      const lat = y0 + r() * (y1 - y0);
      const mine = G.featuresContaining(obs, G.toVec(lon, lat)).includes(fi);
      const theirs = d3.geoContains(f, [lon, lat]);
      total++;
      if (mine !== theirs) mismatches.push([names[fi], lon.toFixed(4), lat.toFixed(4), mine, theirs]);
    }
  }
  // Agreement away from boundaries; the two models differ only by how an edge
  // is drawn between vertices, and a point can only disagree within that.
  console.log(`  point-in-polygon: ${mismatches.length} of ${total} differ from d3 ${JSON.stringify(mismatches.slice(0, 3))}`);
  assert.ok(mismatches.length <= total * 0.002, `${mismatches.length} of ${total}: ${JSON.stringify(mismatches.slice(0, 5))}`);
  // Lesotho is a hole in South Africa.
  assert.equal(G.featuresContaining(obs, G.toVec(28.2, -29.6)).includes(names.indexOf("South Africa")), false, "Maseru is not in South Africa");
  assert.equal(G.featuresContaining(obs, G.toVec(28.0, -26.2)).includes(names.indexOf("South Africa")), true, "Johannesburg is");
  assert.equal(G.featuresContaining(obs, G.toVec(12.434, 41.902)).includes(names.indexOf("Italy")), false, "the Vatican is not in Italy");
  assert.equal(G.featuresContaining(obs, G.toVec(12.46, 43.94)).includes(names.indexOf("Italy")), false, "nor is San Marino");
  assert.equal(G.featuresContaining(obs, G.toVec(179.3, -16.6)).includes(names.indexOf("Fiji")), true, "Vanua Levu");
  assert.equal(G.featuresContaining(obs, G.toVec(-179.9, -16.5)).includes(names.indexOf("Fiji")), d3.geoContains(feat("Fiji"), [-179.9, -16.5]), "just across the antimeridian, same answer as d3");
});

function samplePath(waypoints, step = 0.002) {
  const pts = [];
  for (let i = 0; i + 1 < waypoints.length; i++) {
    const seg = G.sampleArc(waypoints[i], waypoints[i + 1], step, i === 0);
    for (const p of seg) pts.push(p);
  }
  return pts;
}

// Every sampled point of the route must be outside every avoided feature, or
// else on its boundary (the route lies against the obstacles it goes round).
function assertOutside(route, obs, names) {
  const pts = samplePath(route.waypoints);
  let onBoundary = 0;
  for (const p of pts) {
    const inside = G.featuresContaining(obs, p);
    if (inside.length) {
      // featuresContaining already treats boundary points as outside; so an
      // "inside" here is real unless it is within a hair of an edge.
      const d = distanceToEdges(obs, p);
      assert.ok(d < 1e-9, `route point ${G.toLonLat(p)} is inside ${names[inside[0]]} by ${(d * KM).toFixed(3)} km`);
      onBoundary++;
    }
  }
  return { sampled: pts.length, onBoundary };
}

function distanceToEdges(obs, p) {
  let best = Infinity;
  for (let e = 0; e < obs.n; e++) {
    const r = obs.rings[obs.ringOf[e]];
    const d = e + 1 < r.end ? e + 1 : r.start;
    const a = [obs.X[e], obs.Y[e], obs.Z[e]], b = [obs.X[d], obs.Y[d], obs.Z[d]];
    const n = G.normalize([a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]);
    const s = p[0] * n[0] + p[1] * n[1] + p[2] * n[2];
    const foot = G.normalize([p[0] - s * n[0], p[1] - s * n[1], p[2] - s * n[2]]);
    const within = G.angleBetween(a, foot) <= G.angleBetween(a, b) + 1e-12 && G.angleBetween(foot, b) <= G.angleBetween(a, b) + 1e-12;
    const dist = within ? Math.asin(Math.min(1, Math.abs(s))) : Math.min(G.angleBetween(p, a), G.angleBetween(p, b));
    if (dist < best) best = dist;
  }
  return best;
}

const CITY = {
  London: [-0.1278, 51.5074], Tokyo: [139.6917, 35.6895], NewYork: [-74.006, 40.7128], Dubai: [55.2708, 25.2048],
  Helsinki: [24.9384, 60.1699], Nairobi: [36.8219, -1.2921], Sydney: [151.2093, -33.8688], MexicoCity: [-99.1332, 19.4326],
  Toronto: [-79.3832, 43.6532], Maseru: [27.4833, -29.3167], Johannesburg: [28.0473, -26.2041], Anchorage: [-149.9003, 61.2181],
  Singapore: [103.8198, 1.3521], Delhi: [77.209, 28.6139], Honolulu: [-157.8583, 21.3069], Reykjavik: [-21.8277, 64.1283],
  Moscow: [37.6173, 55.7558], Seoul: [126.978, 37.5665], Perth: [115.8605, -31.9505], Santiago: [-70.6693, -33.4489],
  Taipei: [121.5654, 25.033], Beijing: [116.4074, 39.9042]
};
const vec = (name) => G.toVec(CITY[name][0], CITY[name][1]);

function scenario(from, to, avoid, expect) {
  test(`${from} → ${to} avoiding ${avoid.join(", ") || "nothing"}`, () => {
    const t0 = performance.now();
    const obs = G.buildObstacles(avoid.map(feat));
    const t1 = performance.now();
    const route = G.findRoute(obs, vec(from), vec(to));
    const t2 = performance.now();
    const direct = G.angleBetween(vec(from), vec(to)) * KM;
    const line = `  ${from}→${to} | ${avoid.join("+") || "-"} | corners ${obs.corners.count} | build ${(t1 - t0).toFixed(0)}ms search ${(t2 - t1).toFixed(0)}ms | expanded ${route.expanded} tested ${route.tested || 0} | status ${route.status}` +
      (route.status === "done" ? ` | direct ${direct.toFixed(0)} km, route ${(route.length * KM).toFixed(0)} km (+${((route.length * KM / direct - 1) * 100).toFixed(1)}%), ${route.waypoints.length - 2} bends` : "");
    console.log(line);
    assert.equal(route.status, expect.status);
    if (expect.status === "done") {
      assert.ok(route.length * KM >= direct - 1e-6);
      if (expect.minExtra != null) assert.ok(route.length * KM >= direct + expect.minExtra, "should have to detour");
      if (expect.maxRatio != null) assert.ok(route.length * KM <= direct * expect.maxRatio, "too long a detour");
      const stats = assertOutside(route, obs, avoid);
      const back = G.findRoute(obs, vec(to), vec(from));
      assert.equal(back.status, "done");
      assert.ok(Math.abs(back.length - route.length) < 1e-9, `asymmetric: ${back.length} vs ${route.length}`);
      // Stepping in slices gives the same answer as one go.
      const s = G.startSearch(obs, vec(from), vec(to));
      let steps = 0;
      while (s.status === "running") { G.stepSearch(s, 2); steps++; }
      assert.equal(s.status, "done");
      assert.ok(Math.abs(s.length - route.length) < 1e-12);
      if (expect.maxMs != null) assert.ok(t2 - t1 < expect.maxMs, `search took ${(t2 - t1).toFixed(0)} ms`);
      void stats;
    }
  });
}

scenario("London", "Tokyo", [], { status: "done", maxRatio: 1.0000001 });
scenario("London", "Tokyo", ["Russia"], { status: "done", minExtra: 500, maxRatio: 1.3, maxMs: 3000 });
scenario("NewYork", "Dubai", ["Iran", "Iraq"], { status: "done", maxRatio: 1.2, maxMs: 2000 });
scenario("Helsinki", "Nairobi", ["Belarus", "Ukraine"], { status: "done", maxRatio: 1.2, maxMs: 2000 });
scenario("Sydney", "London", ["India", "China"], { status: "done", maxRatio: 1.2, maxMs: 3000 });
scenario("MexicoCity", "Toronto", ["United States"], { status: "done", minExtra: 1000, maxRatio: 3, maxMs: 4000 });
scenario("Anchorage", "Singapore", ["Russia", "China", "Japan"], { status: "done", maxRatio: 1.4, maxMs: 5000 });
scenario("Reykjavik", "Seoul", ["Russia"], { status: "done", maxRatio: 1.5, maxMs: 4000 });
scenario("Honolulu", "Delhi", ["China", "Russia", "Japan", "Taiwan", "Philippines", "Vietnam"], { status: "done", maxRatio: 1.5, maxMs: 6000 });
scenario("Perth", "Santiago", ["New Zealand", "Fiji"], { status: "done", maxRatio: 1.5, maxMs: 4000 });
scenario("Perth", "Santiago", ["Australia"], { status: "inside" });
scenario("Moscow", "Beijing", ["Mongolia", "Kazakhstan"], { status: "done", maxRatio: 1.3, maxMs: 3000 });
scenario("Taipei", "London", ["China", "Russia", "India", "Pakistan", "Iran", "Afghanistan", "Myanmar"], { status: "done", maxRatio: 1.6, maxMs: 8000 });
scenario("Moscow", "Tokyo", ["Russia"], { status: "inside" });
scenario("Maseru", "Nairobi", ["South Africa"], { status: "none" });
scenario("Johannesburg", "Tokyo", ["Indonesia", "Australia", "India", "China", "Russia", "Brazil", "Canada", "United States", "Greenland", "Norway", "Philippines", "Vietnam", "Thailand", "Myanmar", "Malaysia"], { status: "done", maxRatio: 2, maxMs: 15000 });

// ---- drawn regions: turned inside out, and grown by a buffer

const poly = (id, coords, props = {}) => ({ type: "Feature", id, properties: { name: id, ...props }, geometry: { type: "Polygon", coordinates: [coords.concat([coords[0]])] } });
const V = (lon, lat) => G.toVec(lon, lat);
// Angular distance from p to the arc a–b.
function distToArc(p, a, b) {
  const n = G.normalize([a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]);
  const d = p[0] * n[0] + p[1] * n[1] + p[2] * n[2];
  const c = G.normalize([p[0] - d * n[0], p[1] - d * n[1], p[2] - d * n[2]]);
  if (Math.abs(G.angleBetween(a, c) + G.angleBetween(c, b) - G.angleBetween(a, b)) < 1e-9) return Math.asin(Math.min(1, Math.abs(d)));
  return Math.min(G.angleBetween(p, a), G.angleBetween(p, b));
}
function routePoints(route, step = 0.002) {
  const pts = [];
  for (let i = 0; i + 1 < route.waypoints.length; i++) pts.push(...G.sampleArc(route.waypoints[i], route.waypoints[i + 1], step));
  return pts;
}
const SQUARE = [[0, 0], [10, 0], [10, 10], [0, 10]];
const squareEdges = SQUARE.map((p, i) => [V(...p), V(...SQUARE[(i + 1) % 4])]);
const distToSquare = (p) => Math.min(...squareEdges.map(([a, b]) => distToArc(p, a, b)));

test("an inverted region is everything outside its ring, whichever way it was drawn", () => {
  for (const ring of [SQUARE, SQUARE.slice().reverse()]) {
    const obs = G.buildObstacles([poly("r1", ring, { invert: true })]);
    assert.deepEqual(G.featuresContaining(obs, V(5, 5)), [], "inside the ring is free");
    assert.deepEqual(G.featuresContaining(obs, V(30, 5)), [0], "outside it is avoided");
    assert.deepEqual(G.featuresContaining(obs, V(-150, -40)), [0], "far away too");
    const free = G.findRoute(obs, V(2, 2), V(8, 8));
    assert.equal(free.status, "done");
    assert.equal(free.waypoints.length, 2, "two points inside see each other");
    const out = G.findRoute(obs, V(2, 2), V(30, 5));
    assert.equal(out.status, "inside");
    // the same ring not inverted is the square itself, as before
    const plain = G.buildObstacles([poly("r1", ring)]);
    assert.deepEqual(G.featuresContaining(plain, V(5, 5)), [0]);
    assert.deepEqual(G.featuresContaining(plain, V(30, 5)), []);
  }
});

test("inside an inverted L, the route bends round the inner corner and stays in the L", () => {
  const L = [[0, 0], [20, 0], [20, 6], [6, 6], [6, 20], [0, 20]];
  const lFeature = poly("L", L.slice().reverse()); // clockwise, so d3 reads it as the L itself
  for (const ring of [L, L.slice().reverse()]) {
    const obs = G.buildObstacles([poly("r1", ring, { invert: true })]);
    const r = G.findRoute(obs, V(18, 3), V(3, 18));
    assert.equal(r.status, "done");
    assert.ok(r.waypoints.length >= 3, "bends at least once");
    const corner = r.waypoints.slice(1, -1).map(G.toLonLat);
    assert.ok(corner.some(([lon, lat]) => Math.abs(lon - 6) < 1e-6 && Math.abs(lat - 6) < 1e-6), "at the L's inner corner " + JSON.stringify(corner));
    for (const p of routePoints(r)) assert.ok(d3.geoContains(lFeature, G.toLonLat(p)) || G.angleBetween(p, V(6, 6)) < 1e-6, "stays in the L at " + G.toLonLat(p));
  }
});

test("buffer pieces are small, clockwise for d3, and cover the ring's edges and corners", () => {
  const rings = G.bufferRings(SQUARE, 200);
  assert.equal(rings.length, 8, "a disc per corner and a strip per edge");
  for (const r of rings) {
    assert.ok(d3.geoArea({ type: "Polygon", coordinates: [r] }) < 2 * Math.PI, "clockwise: d3 sees the small side");
    assert.deepEqual(r[0], r[r.length - 1], "closed");
  }
  assert.deepEqual(G.bufferRings(SQUARE, 0), []);
  // Every point within 200 km of the square's edge is in some piece.
  const pieces = rings.map((r) => ({ type: "Feature", geometry: { type: "Polygon", coordinates: [r] } }));
  const rnd = rand(7);
  for (let i = 0; i < 3000; i++) {
    const p = [-3 + rnd() * 16, -3 + rnd() * 16];
    const d = distToSquare(V(...p)) * KM;
    if (d < 199.5) assert.ok(pieces.some((f) => d3.geoContains(f, p)), `point ${p} (${d.toFixed(1)} km off the edge) is covered`);
  }
});

test("a buffered region keeps the route at least the buffer away, and no further than it must", () => {
  for (const km of [100, 250]) {
    const feats = [poly("r1", SQUARE)].concat(G.bufferRings(SQUARE, km).map((r, k) => ({ type: "Feature", id: "r1~" + k, properties: { name: "r1" }, geometry: { type: "Polygon", coordinates: [r] } })));
    const obs = G.buildObstacles(feats);
    const r = G.findRoute(obs, V(-12, 4), V(22, 6));
    assert.equal(r.status, "done");
    const dmin = Math.min(...routePoints(r).map((p) => distToSquare(p) * KM));
    assert.ok(dmin >= km - 0.01, `${km} km buffer: the route comes no nearer than ${dmin.toFixed(2)} km`);
    assert.ok(dmin <= km + 6, `${km} km buffer: it hugs the buffer (${dmin.toFixed(2)} km)`);
    // a point within the buffer is reported as inside the region's pieces
    const inside = G.findRoute(obs, V(-0.5, 5), V(22, 6));
    assert.equal(inside.status, "inside");
  }
});

test("a buffer on an inverted region shrinks the room inside it", () => {
  const BIG = [[0, 0], [20, 0], [20, 20], [0, 20]];
  const feats = [poly("r1", BIG, { invert: true })].concat(G.bufferRings(BIG, 150).map((r, k) => ({ type: "Feature", id: "r1~" + k, properties: { name: "r1" }, geometry: { type: "Polygon", coordinates: [r] } })));
  const obs = G.buildObstacles(feats);
  assert.equal(G.findRoute(obs, V(5, 5), V(15, 15)).status, "done", "well inside: free");
  assert.equal(G.findRoute(obs, V(0.8, 10), V(15, 15)).status, "inside", "within 150 km of the edge, inside: blocked");
  assert.equal(G.findRoute(obs, V(30, 10), V(15, 15)).status, "inside", "outside: blocked");
});

// The route is worked out off the main thread, so the globe keeps turning
// while it runs. One message in, one result out; a newer request supersedes
// an older one still running.
// Loaded as a worker normally; loaded as a plain script when the page could
// not start a worker, in which case it answers through the same messages on
// the main thread (the search still runs in slices, so the page stays
// responsive, just less so).
var IN_WORKER = typeof importScripts === "function";
if (IN_WORKER) importScripts("vendor/topojson-client.min.js", "engine.js");

var G = GreatCircle;
var shim = null;
if (!IN_WORKER) {
  shim = { onmessage: null, postMessage: function (m) { setTimeout(function () { handle(m); }, 0); } };
  self.GreatCircleRouter = shim;
}
function send(m) {
  if (IN_WORKER) postMessage(m);
  else if (shim.onmessage) shim.onmessage({ data: m });
}
var world = null;      // every country, as GeoJSON features
var byId = new Map();  // feature id -> feature
var everything = null; // obstacles built from every country, for "crosses"
var cache = [];        // recent obstacle sets, by the sorted list of ids
var latest = 0;        // id of the most recent route request

function handle(m) {
  if (m.type === "init") init(m);
  else if (m.type === "route") { latest = m.id; route(m); }
}
if (IN_WORKER) self.onmessage = function (e) { handle(e.data); };

function init(m) {
  var t0 = performance.now();
  world = topojson.feature(m.topology, m.topology.objects.countries).features;
  world.forEach(function (f) { byId.set(String(f.id), f); });
  everything = G.buildObstacles(world);
  send({ type: "ready", ms: Math.round(performance.now() - t0), corners: everything.corners.count });
}

function obstaclesFor(ids) {
  var key = ids.slice().sort().join(",");
  for (var i = 0; i < cache.length; i++) if (cache[i].key === key) return cache[i].obs;
  var feats = ids.map(function (id) { return byId.get(String(id)); }).filter(Boolean);
  var obs = G.buildObstacles(feats);
  cache.push({ key: key, obs: obs });
  if (cache.length > 6) cache.shift();
  return obs;
}

/* Which countries a chain of arcs passes over, as ids in the order met.
   The one the start is in comes first, the one the end is in last. */
function countriesAlong(waypoints) {
  var order = new Map(); // feature index -> position along the way
  var pos = 0;
  G.featuresContaining(everything, waypoints[0]).forEach(function (idx) { order.set(idx, -1); });
  for (var i = 0; i + 1 < waypoints.length; i++) {
    var here = new Map();
    G.featuresCrossedByArc(everything, waypoints[i], waypoints[i + 1], here);
    here.forEach(function (at, idx) { var p = pos + at; if (!order.has(idx) || order.get(idx) > p) order.set(idx, p); });
    pos += G.angleBetween(waypoints[i], waypoints[i + 1]);
  }
  G.featuresContaining(everything, waypoints[waypoints.length - 1]).forEach(function (idx) { if (!order.has(idx)) order.set(idx, pos + 1); });
  return Array.from(order.entries()).sort(function (p, q) { return p[1] - q[1]; }).map(function (e) { return everything.features[e[0]].id; });
}

function route(m) {
  var id = m.id, t0 = performance.now();
  var a = G.toVec(m.a[0], m.a[1]), b = G.toVec(m.b[0], m.b[1]);
  var direct = G.angleBetween(a, b);
  var result = {
    type: "result", id: id, status: "done",
    directKm: direct * G.EARTH_RADIUS_KM,
    directEllipsoidKm: G.ellipsoidDistanceKm(m.a[0], m.a[1], m.b[0], m.b[1]),
    directCrosses: countriesAlong([a, b]),
    startIn: G.featuresContaining(everything, a).map(function (i) { return everything.features[i].id; }),
    endIn: G.featuresContaining(everything, b).map(function (i) { return everything.features[i].id; }),
    avoid: m.avoid
  };
  if (!m.avoid.length) {
    result.waypoints = [m.a, m.b];
    result.lengthKm = result.directKm;
    result.bends = 0;
    result.ms = Math.round(performance.now() - t0);
    send(result);
    return;
  }
  var obs = obstaclesFor(m.avoid);
  var s = G.startSearch(obs, a, b);
  var tick = function () {
    if (latest !== id) return; // superseded while waiting
    if (s.status === "running") {
      G.stepSearch(s, 40);
      if (s.status === "running") {
        send({ type: "progress", id: id, expanded: s.expanded, active: s.active.length, stage: s.stage });
        setTimeout(tick, 0);
        return;
      }
    }
    finishRoute();
  };
  var finishRoute = function () {
    result.ms = Math.round(performance.now() - t0);
    result.expanded = s.expanded;
    if (s.status === "inside") {
      result.status = "inside";
      result.insideA = s.insideA.map(function (i) { return obs.features[i].id; });
      result.insideB = s.insideB.map(function (i) { return obs.features[i].id; });
    } else if (s.status === "none") {
      result.status = "none";
    } else {
      result.waypoints = s.waypoints.map(function (v) { return G.toLonLat(v); });
      result.lengthKm = s.length * G.EARTH_RADIUS_KM;
      result.bends = s.waypoints.length - 2;
      result.antipodal = !!s.antipodal;
      result.routeCrosses = countriesAlong(s.waypoints);
    }
    send(result);
  };
  tick();
}

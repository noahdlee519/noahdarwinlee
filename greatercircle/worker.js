var IN_WORKER = typeof importScripts === "function";
if (IN_WORKER) importScripts("vendor/clipper.min.js", "vendor/topojson-client.min.js", "engine.js");

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
var world = null;
var byId = new Map();
var everything = null;
var cache = [];
var latest = 0;

function handle(m) {
  try {
    if (m.type === "init") init(m);
    else if (m.type === "route") { latest = m.id; route(m); }
    else if (m.type === "buffers") buffers(m);
  } catch (err) {
    send({ type: "result", id: m.id || 0, status: "error", message: String(err && err.message || err) });
  }
}
if (IN_WORKER) self.onmessage = function (e) { handle(e.data); };

function init(m) {
  var t0 = performance.now();
  world = topojson.feature(m.topology, m.topology.objects.countries).features;
  world.forEach(function (f) { byId.set(String(f.id), f); });
  everything = G.buildObstacles(world);
  send({ type: "ready", ms: Math.round(performance.now() - t0), corners: everything.corners.count });
}

var outlines = new Map();
function outlineOf(id, km) {
  var key = id + "|" + km.toFixed(4);
  var hit = outlines.get(key);
  if (hit) return hit;
  var f = byId.get(String(id));
  var coords = f ? G.bufferOutline(f.geometry, km) : [];
  outlines.set(key, coords);
  if (outlines.size > 40) outlines.delete(outlines.keys().next().value);
  return coords;
}

function buffers(m) {
  m.ids.forEach(function (id) {
    if (!byId.has(String(id))) return;
    send({ type: "buffers", id: String(id), km: m.km, coordinates: outlineOf(id, m.km) });
  });
}

function obstaclesFor(ids, regions, bufferKm) {
  regions = regions || [];
  bufferKm = bufferKm || 0;
  var key = bufferKm.toFixed(4) + "|" + ids.slice().sort().join(",") + "|" + regions.map(function (r) { return r.id + ":" + (r.inverted ? "i" : "") + ":" + (r.bufferKm || 0) + ":" + r.ring.map(function (p) { return p[0].toFixed(4) + "," + p[1].toFixed(4); }).join(";"); }).join("|");
  for (var i = 0; i < cache.length; i++) if (cache[i].key === key) return cache[i].obs;
  var feats = ids.map(function (id) {
    var f = byId.get(String(id));
    if (!f || !(bufferKm > 0)) return f;
    return { type: "Feature", id: f.id + "~b", properties: { name: f.properties.name }, geometry: { type: "MultiPolygon", coordinates: outlineOf(f.id, bufferKm) } };
  }).filter(Boolean);
  regions.forEach(function (r) {
    var ring = r.ring.slice();
    if (ring.length && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) ring.push(ring[0]);
    feats.push({ type: "Feature", id: r.id, properties: { name: r.name, invert: !!r.inverted }, geometry: { type: "Polygon", coordinates: [ring] } });
    G.bufferRings(ring, r.bufferKm || 0).forEach(function (piece, k) {
      feats.push({ type: "Feature", id: r.id + "~" + k, properties: { name: r.name }, geometry: { type: "Polygon", coordinates: [piece] } });
    });
  });
  var obs = G.buildObstacles(feats);
  cache.push({ key: key, obs: obs });
  if (cache.length > 6) cache.shift();
  return obs;
}

function countriesAlong(waypoints) {
  var order = new Map();
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
  if (cached(m)) return;
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
  var regions = m.regions || [];
  if (!m.avoid.length && !regions.length) {
    result.waypoints = [m.a, m.b];
    result.lengthKm = result.directKm;
    result.bends = 0;
    if (Math.PI - direct < 1e-9) {
      var free = G.findRoute(obstaclesFor([]), a, b);
      result.waypoints = free.waypoints.map(function (v) { return G.toLonLat(v); });
      result.antipodal = true;
    }
    result.ms = Math.round(performance.now() - t0);
    deliver(m, result, obstaclesFor([]), a, b, t0);
    return;
  }
  var obs = obstaclesFor(m.avoid, regions, m.bufferKm);
  var s = G.startSearch(obs, a, b);
  var tick = function () {
    if (latest !== id) return;
    try {
      step();
    } catch (err) {
      send({ type: "result", id: id, status: "error", message: String(err && err.message || err) });
    }
  };
  var step = function () {
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
      var near = function (ids, v) {
        var out = {};
        ids.forEach(function (fid) {
          fid = String(fid);
          if (fid.slice(-2) !== "~b") return;
          var f = byId.get(fid.slice(0, -2));
          if (f) out[f.id] = G.boundaryDistance(f.geometry, v) * G.EARTH_RADIUS_KM;
        });
        return out;
      };
      result.nearA = near(result.insideA, a);
      result.nearB = near(result.insideB, b);
    } else if (s.status === "none") {
      result.status = "none";
    } else {
      result.waypoints = s.waypoints.map(function (v) { return G.toLonLat(v); });
      result.lengthKm = s.length * G.EARTH_RADIUS_KM;
      result.bends = s.waypoints.length - 2;
      result.antipodal = !!s.antipodal;
      result.routeCrosses = countriesAlong(s.waypoints);
    }
    deliver(m, result, obs, a, b, t0);
  };
  tick();
}

var beaconData = null, beaconWaiting = null;
function withBeacons(then) {
  if (beaconData) { then(beaconData); return; }
  if (beaconWaiting) { beaconWaiting.push(then); return; }
  beaconWaiting = [then];
  var done = function (d) { var w = beaconWaiting; beaconWaiting = null; w.forEach(function (f) { f(d); }); };
  fetch("data/navaids.json").then(function (r) { return r.json(); }).then(function (d) {
    beaconData = { types: d.types, rows: d.beacons, index: G.beaconIndex(d.beacons) };
    done(beaconData);
  }).catch(function () { done(null); });
}

var routeCache = [];
function routeKey(m) {
  var regions = m.regions || [];
  return (m.bufferKm || 0).toFixed(4) + "|" + m.avoid.slice().sort().join(",") + "|" + regions.map(function (r) { return r.id + ":" + (r.inverted ? "i" : "") + ":" + r.ring.map(function (p) { return p[0].toFixed(4) + "," + p[1].toFixed(4); }).join(";"); }).join("|") + "|" + m.a[0].toFixed(5) + "," + m.a[1].toFixed(5) + "|" + m.b[0].toFixed(5) + "," + m.b[1].toFixed(5);
}
function cached(m) {
  var key = routeKey(m);
  for (var i = 0; i < routeCache.length; i++) {
    var c = routeCache[i];
    if (c.key !== key) continue;
    var r = JSON.parse(JSON.stringify(c.result));
    r.id = m.id; r.cached = true;
    send(r);
    if (c.plan) { var p = JSON.parse(JSON.stringify(c.plan)); p.id = m.id; send(p); }
    else if (c.start) c.start(m.id);
    return true;
  }
  return false;
}
function remember(m, result, start) {
  var entry = { key: routeKey(m), result: result, plan: null, start: start };
  routeCache.push(entry);
  if (routeCache.length > 8) routeCache.shift();
  return entry;
}

function nameOf(v) {
  var ids = G.featuresContaining(everything, v);
  return ids.length ? everything.features[ids[0]].name : null;
}

function deliver(m, result, obs, a, b, t0) {
  send(result);
  if (result.status !== "done" || result.antipodal) return;
  var entry;
  var start = function (id) {
    setTimeout(function () { plan(id, result, obs, a, b, entry); }, 0);
  };
  entry = remember(m, result, start);
  start(m.id);
}

function plan(id, result, obs, a, b, entry) {
  if (latest !== id) return;
  withBeacons(function (data) {
    if (latest !== id) return;
    if (!data) { send({ type: "plan", id: id, status: "unavailable" }); return; }
    var t0 = performance.now();
    var ideal = result.waypoints.map(function (p) { return G.toVec(p[0], p[1]); });
    var bs = G.startBeaconSearch(obs, data.index, ideal, a, b);
    var slice = IN_WORKER ? 40 : 12;
    var tick = function () {
      if (latest !== id) return;
      try {
        G.stepBeaconSearch(bs, slice);
        if (bs.status === "running") {
          send({ type: "planProgress", id: id, expanded: bs.expanded });
          setTimeout(tick, 0);
          return;
        }
        var out = { type: "plan", id: id, status: bs.status, ms: Math.round(performance.now() - t0), expanded: bs.expanded };
        if (bs.status === "done") {
          var R = G.EARTH_RADIUS_KM;
          out.km = bs.length * R;
          out.overKm = out.km - result.lengthKm;
          out.waypoints = bs.waypoints.map(function (v) { return G.toLonLat(v); });
          out.points = bs.waypoints.map(function (v, k) {
            if (k === 0 || k === bs.waypoints.length - 1) return { ident: null, country: nameOf(v), lon: out.waypoints[k][0], lat: out.waypoints[k][1] };
            var row = data.rows[bs.beacons[k - 1]];
            return { ident: row[0], type: data.types[row[1]], name: row[4], country: nameOf(v), lon: row[2], lat: row[3] };
          });
          out.legs = [];
          for (var k = 0; k + 1 < bs.waypoints.length; k++) {
            var km = G.angleBetween(bs.waypoints[k], bs.waypoints[k + 1]) * R;
            out.legs.push({ km: km, long: km > G.BEACON_LEG_KM });
          }
          out.crosses = countriesAlong(bs.waypoints);
        }
        if (entry && (out.status === "done" || out.status === "none")) entry.plan = out;
        send(out);
      } catch (err) {
        send({ type: "plan", id: id, status: "error", message: String(err && err.message || err) });
      }
    };
    tick();
  });
}

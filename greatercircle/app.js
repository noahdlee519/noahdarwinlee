// greatercircle: the globe, the two places, the countries to go round.
//
// The drawing is a canvas and d3-geo's orthographic projection, which shows
// the near half of the sphere and clips the far half. The maths of the route
// is in engine.js and runs in a worker (worker.js), so turning the globe never
// waits on it. Places are searched in a list the page carries, with Photon
// for what it does not have.
(function () {
  "use strict";

  var G = GreatCircle;
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $("globe");
  var ctx = canvas.getContext("2d");
  var panel = $("panel");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover)").matches;

  // ------------------------------------------------------------- state
  var state = {
    a: null, b: null,          // { lon, lat, label }
    avoid: new Map(),          // feature id -> name
    units: "km",
    result: null,              // the last answer from the worker
    pendingId: 0,              // the request we are waiting on, or 0
    avoidMode: false,
    hover: -1,                 // index into features, or -1
    ready: false
  };

  // The data, once loaded.
  var topology = null, features = [], featureById = new Map(), lod = null, borders = null, graticule = null;
  var cities = []; // { name, cc, lon, lat, tier, x, y, z }
  var countries = [];          // [{ id, name, key }] sorted, for the avoid search
  var places = null, placesPromise = null;

  // ------------------------------------------------------------- view
  var projection = d3.geoOrthographic().clipAngle(90).precision(0.35);
  var path = d3.geoPath(projection, ctx);
  var view = { lon: -25, lat: 28, zoom: 1 };
  var dpr = 1, W = 0, H = 0, base = 0, cx = 0, cy = 0;
  var MIN_ZOOM = 0.6, MAX_ZOOM = 24;

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    // The globe sits in the part of the window the panel leaves free.
    var phone = W <= 640;
    var panelW = phone ? 0 : 352 + 2 * 24;
    var sheetH = phone ? Math.min(H * 0.5, panel.getBoundingClientRect().height || 204) : 0;
    var freeW = W - panelW, freeH = H - sheetH - (phone ? 70 : 40);
    cx = phone ? W / 2 : panelW + freeW / 2;
    cy = phone ? (H - sheetH) / 2 + 10 : H / 2;
    base = Math.max(80, Math.min(freeW, freeH) / 2 - 16);
    pick.width = W; pick.height = H;
    pickDirty = true;
    applyView();
  }

  function applyView() {
    view.lat = Math.max(-90, Math.min(90, view.lat));
    view.lon = ((view.lon + 540) % 360) - 180;
    view.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, view.zoom));
    projection.rotate([-view.lon, -view.lat, 0]).scale(base * view.zoom).translate([cx, cy]);
    pickDirty = true;
  }

  // ------------------------------------------------------------- palette
  var pal = {}, hatch = null;
  function refreshPalette() {
    var cs = getComputedStyle(document.documentElement);
    var get = function (name) { return cs.getPropertyValue(name).trim(); };
    ["ocean", "land", "land-hover", "border", "limb", "glow", "grat", "hatch", "route", "route-halo", "direct", "marker", "marker-ink", "city", "city-ring", "label"]
      .forEach(function (k) { pal[k] = get("--gc-" + k); });
    // Diagonal lines for the countries being avoided.
    var c = document.createElement("canvas");
    c.width = c.height = 8;
    var hc = c.getContext("2d");
    hc.strokeStyle = pal.hatch; hc.lineWidth = 1.4; hc.lineCap = "square";
    hc.beginPath(); hc.moveTo(-2, 10); hc.lineTo(10, -2); hc.moveTo(-2, 2); hc.lineTo(2, -2); hc.moveTo(6, 10); hc.lineTo(10, 6); hc.stroke();
    hatch = ctx.createPattern(c, "repeat");
  }

  // ------------------------------------------------------------- drawing
  // The land and the borders are projected here rather than through d3's
  // path: d3 resamples every edge along its great circle for exactness, which
  // for a whole globe of coastline means well over a hundred thousand points a
  // frame, whatever the detail of the data. The orthographic projection of a
  // unit vector is three dot products, so with the vertices kept as vectors a
  // frame is a tight loop. A vertex on the far side is pushed out to the limb,
  // which cuts a polygon straddling the horizon along the limb to within a
  // pixel. d3 still draws the routes, where its resampling is what makes an
  // arc an arc, and does the exact point-in-country test for the pointer.
  var renderQueued = false, interacting = 0, settleTimer = null;

  /* Draw on the next frame: rough while the globe is moving, full once it
     has settled. (The argument is kept for the callers' sake; which it is
     depends only on whether an interaction is under way.) */
  function scheduleRender(detail) {
    void detail;
    if (!renderQueued) { renderQueued = true; requestAnimationFrame(frame); }
  }

  function frame() {
    renderQueued = false;
    render(interacting > 0 ? "coarse" : "full");
  }

  /* Interactions call this on every move; the full drawing follows a short
     while after the last one. */
  function moving() {
    interacting = 1;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(function () { interacting = 0; scheduleRender("full"); }, 140);
    scheduleRender("coarse");
  }

  // Frame basis: screen east, screen north, and the direction to the viewer.
  var B = { ex: 0, ey: 0, ez: 0, nx: 0, ny: 0, nz: 0, cx: 0, cy: 0, cz: 0, r: 1 };
  function basis() {
    var lon = view.lon * Math.PI / 180, lat = view.lat * Math.PI / 180;
    var sl = Math.sin(lon), cl = Math.cos(lon), sp = Math.sin(lat), cp = Math.cos(lat);
    B.ex = -sl; B.ey = cl; B.ez = 0;
    B.nx = -sp * cl; B.ny = -sp * sl; B.nz = cp;
    B.cx = cp * cl; B.cy = cp * sl; B.cz = sp;
    B.r = projection.scale();
  }

  /* Vertices of every ring of every feature as vectors, with a cap around
     each feature, for each level of detail. */
  function prepare(featureList) {
    return featureList.map(function (f, i) {
      var polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
      var rings = [], sx = 0, sy = 0, sz = 0, count = 0;
      polys.forEach(function (poly) {
        poly.forEach(function (ring) {
          var n = ring.length, X = new Float64Array(n), Y = new Float64Array(n), Z = new Float64Array(n);
          for (var k = 0; k < n; k++) {
            var v = G.toVec(ring[k][0], ring[k][1]);
            X[k] = v[0]; Y[k] = v[1]; Z[k] = v[2]; sx += v[0]; sy += v[1]; sz += v[2]; count++;
          }
          rings.push({ x: X, y: Y, z: Z, n: n });
        });
      });
      var c = G.normalize([sx, sy, sz]);
      if (!(Math.hypot(sx, sy, sz) > 1e-9)) c = [rings[0].x[0], rings[0].y[0], rings[0].z[0]];
      var minDot = 1;
      rings.forEach(function (rg) { for (var k = 0; k < rg.n; k++) { var d = c[0] * rg.x[k] + c[1] * rg.y[k] + c[2] * rg.z[k]; if (d < minDot) minDot = d; } });
      return { id: f.id, index: i, rings: rings, cx: c[0], cy: c[1], cz: c[2], radius: Math.acos(Math.max(-1, Math.min(1, minDot))) };
    });
  }
  function prepareLines(mesh) {
    return mesh.coordinates.map(function (line) {
      var n = line.length, X = new Float64Array(n), Y = new Float64Array(n), Z = new Float64Array(n);
      for (var k = 0; k < n; k++) { var v = G.toVec(line[k][0], line[k][1]); X[k] = v[0]; Y[k] = v[1]; Z[k] = v[2]; }
      return { x: X, y: Y, z: Z, n: n };
    });
  }
  function makeGraticule() {
    var lines = [];
    for (var lat = -80; lat <= 80; lat += 10) { var pts = []; for (var lon = -180; lon <= 180; lon += 2) pts.push([lon, lat]); lines.push(pts); }
    // Meridians stop short of the poles, where they would crowd into a
    // star; four of them go all the way.
    for (var lo = -180; lo < 180; lo += 10) {
      var top = lo % 90 === 0 ? 90 : 80, mp = [];
      for (var la = -top; la <= top; la += 2) mp.push([lo, la]);
      lines.push(mp);
    }
    return prepareLines({ coordinates: lines });
  }

  /* Is any of the feature in front? Behind the globe entirely when the cap
     is more than a quarter turn past the horizon. */
  function featureInFront(f) {
    var d = f.cx * B.cx + f.cy * B.cy + f.cz * B.cz;
    var theta = Math.acos(Math.max(-1, Math.min(1, d)));
    if (theta - f.radius > Math.PI / 2) return false;
    if (theta + f.radius < Math.PI / 2) {
      // Wholly in front: is any of it on the screen? Its footprint lies
      // within r·sin(radius) of its centre.
      var px = cx + B.r * (f.cx * B.ex + f.cy * B.ey + f.cz * B.ez);
      var py = cy - B.r * (f.cx * B.nx + f.cy * B.ny + f.cz * B.nz);
      var rad = B.r * Math.sin(Math.min(f.radius, Math.PI / 2)) + 2;
      if (px + rad < 0 || px - rad > W || py + rad < 0 || py - rad > H) return false;
    }
    return true;
  }

  /* Adds a ring to the current path. Vertices behind the horizon go to the
     limb; a ring with nothing in front is left out altogether. */
  function traceRing(c, rg) {
    var X = rg.x, Y = rg.y, Z = rg.z, n = rg.n;
    var r = B.r, ex = B.ex, ey = B.ey, ez = B.ez, nx = B.nx, ny = B.ny, nz = B.nz, vx = B.cx, vy = B.cy, vz = B.cz;
    var any = false;
    for (var k = 0; k < n; k++) { if (X[k] * vx + Y[k] * vy + Z[k] * vz > 0) { any = true; break; } }
    if (!any) return false;
    for (k = 0; k < n; k++) {
      var x = X[k], y = Y[k], z = Z[k];
      var sx = x * ex + y * ey + z * ez, sy = x * nx + y * ny + z * nz, sz = x * vx + y * vy + z * vz;
      if (sz < 0) { var l = Math.hypot(sx, sy) || 1; sx /= l; sy /= l; }
      if (k === 0) c.moveTo(cx + r * sx, cy - r * sy); else c.lineTo(cx + r * sx, cy - r * sy);
    }
    c.closePath();
    return true;
  }
  function traceFeature(c, f) {
    if (!featureInFront(f)) return;
    for (var i = 0; i < f.rings.length; i++) traceRing(c, f.rings[i]);
  }
  /* Adds polylines to the path, breaking them where they pass behind. */
  function traceLines(c, lines) {
    var r = B.r, ex = B.ex, ey = B.ey, ez = B.ez, nx = B.nx, ny = B.ny, nz = B.nz, vx = B.cx, vy = B.cy, vz = B.cz;
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i], X = L.x, Y = L.y, Z = L.z, n = L.n, pen = false;
      for (var k = 0; k < n; k++) {
        var x = X[k], y = Y[k], z = Z[k];
        var sz = x * vx + y * vy + z * vz;
        if (sz < -0.002) { pen = false; continue; }
        var sx = x * ex + y * ey + z * ez, sy = x * nx + y * ny + z * nz;
        if (sz < 0) { var l = Math.hypot(sx, sy) || 1; sx /= l; sy /= l; }
        if (!pen) { c.moveTo(cx + r * sx, cy - r * sy); pen = true; } else c.lineTo(cx + r * sx, cy - r * sy);
      }
    }
  }

  var marks = null;
  function mark(name) { if (marks) marks.push([name, performance.now()]); }
  /* The level for the size of the globe on the screen, one step rougher
     while it moves. */
  function levelFor(detail) {
    var px = projection.scale(); // radius in pixels
    var level = px < 900 ? 0 : px < 2600 ? 1 : 2;
    if (detail !== "full" && level > 0) level--;
    return level;
  }
  function featuresFor(detail) {
    var level = levelFor(detail);
    return level === 2 ? lod.full : level === 1 ? lod.mid : lod.coarse;
  }
  function bordersFor(detail) {
    var level = levelFor(detail);
    return level === 2 ? borders.full : level === 1 ? borders.mid : borders.coarse;
  }

  function render(detail) {
    if (!lod) return;
    mark("start");
    basis();
    var feats = featuresFor(detail);
    var mesh = bordersFor(detail);
    var r = B.r;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // The glow outside the limb, then the sea.
    if (r * 1.07 < Math.hypot(W, H)) {
      var glow = ctx.createRadialGradient(cx, cy, r, cx, cy, r * 1.07);
      glow.addColorStop(0, pal.glow); glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.07, 0, 2 * Math.PI); ctx.fill();
    }
    ctx.fillStyle = pal.ocean;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.fill();
    mark("sea");

    // Graticule, faint.
    ctx.beginPath(); traceLines(ctx, graticule);
    ctx.strokeStyle = pal.grat; ctx.lineWidth = 0.6; ctx.stroke();
    mark("graticule");

    // Land, a fill per country: one path for all of it costs ten times as
    // much as two hundred small ones. The hovered and avoided ones come
    // after, in their own colours.
    ctx.fillStyle = pal.land;
    for (var i = 0; i < feats.length; i++) {
      if (i === state.hover || state.avoid.has(feats[i].id)) continue;
      if (!featureInFront(feats[i])) continue;
      ctx.beginPath(); traceFeature(ctx, feats[i]); ctx.fill();
    }
    mark("land");

    if (state.hover >= 0 && !state.avoid.has(feats[state.hover].id)) {
      ctx.beginPath(); traceFeature(ctx, feats[state.hover]);
      ctx.fillStyle = pal["land-hover"]; ctx.fill();
    }
    state.avoid.forEach(function (name, id) {
      var f = featureById.get(id);
      if (!f) return;
      var fi = f.index;
      ctx.beginPath(); traceFeature(ctx, feats[fi]);
      ctx.fillStyle = fi === state.hover ? pal["land-hover"] : pal.land; ctx.fill();
      ctx.fillStyle = hatch; ctx.fill();
    });

    // Borders between countries; the coast is the land's own edge.
    ctx.beginPath(); traceLines(ctx, mesh);
    ctx.strokeStyle = pal.border; ctx.lineWidth = 0.7; ctx.stroke();
    mark("borders");

    // The limb.
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = pal.limb; ctx.lineWidth = 1; ctx.stroke();

    drawCities();
    drawRoutes();
    drawMarkers();
    ctx.restore();
    mark("end");
  }

  function drawRoutes() {
    var res = state.result;
    if (!state.a || !state.b) return;
    var direct = { type: "LineString", coordinates: [[state.a.lon, state.a.lat], [state.b.lon, state.b.lat]] };
    if (res && res.antipodal && res.waypoints) direct = { type: "LineString", coordinates: res.waypoints.slice(0, 2).concat(res.waypoints.length > 2 ? [res.waypoints[res.waypoints.length - 1]] : []) };
    if ((drag && drag.marker) || state.stale) {
      // While a marker is being dragged, or until the worker has answered
      // for a moved point, the old route no longer starts at it: show the
      // direct arc from where it is now, and the rest when it comes.
      ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.beginPath(); path(direct);
      ctx.strokeStyle = pal.route; ctx.lineWidth = 1.5; ctx.stroke();
      return;
    }
    if (!res || res.status !== "done") return;
    var detour = res.waypoints && res.lengthKm > res.directKm + 0.5;
    if (detour) {
      // The direct arc, faint and dashed, so the detour is seen against it.
      ctx.beginPath(); path(direct);
      ctx.setLineDash([4, 5]); ctx.strokeStyle = pal.direct; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.setLineDash([]);
    }
    var line = { type: "LineString", coordinates: res.waypoints || direct.coordinates };
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath(); path(line);
    ctx.strokeStyle = pal["route-halo"]; ctx.lineWidth = 5; ctx.stroke();
    ctx.beginPath(); path(line);
    ctx.strokeStyle = pal.route; ctx.lineWidth = 2; ctx.stroke();
    if (detour && view.zoom > 1.5) {
      // The corners it bends at.
      for (var i = 1; i + 1 < res.waypoints.length; i++) {
        var p = projection(res.waypoints[i]);
        if (!p || !visible(res.waypoints[i])) continue;
        ctx.beginPath(); ctx.arc(p[0], p[1], 2.2, 0, 2 * Math.PI);
        ctx.fillStyle = pal.route; ctx.fill();
      }
    }
  }

  /* The world cities: a dot each, and names as the globe comes closer, the
     most important first. Names are placed in order of rank and skipped
     where they would sit on one already placed. */
  function cityDotRadius() { var r = B.r; return r < 900 ? 1.4 : r < 2600 ? 1.9 : 2.4; }
  function labelTierFor(r) { return r >= 5200 ? 4 : r >= 3000 ? 3 : r >= 1500 ? 2 : r >= 640 ? 1 : 0; }
  var cityScreen = []; // where each city landed this frame, for the pointer
  function drawCities() {
    cityScreen = [];
    if (!cities.length) return;
    var r = B.r, show = labelTierFor(r), dot = cityDotRadius();
    if (!show) return; // a city appears, dot and name together, when the globe is close enough
    var ex = B.ex, ey = B.ey, ez = B.ez, nx = B.nx, ny = B.ny, nz = B.nz, vx = B.cx, vy = B.cy, vz = B.cz;
    ctx.fillStyle = pal.city;
    ctx.strokeStyle = pal["city-ring"]; ctx.lineWidth = 1.2;
    for (var i = 0; i < cities.length; i++) {
      var c = cities[i];
      if (c.tier > show) continue;
      var sz = c.x * vx + c.y * vy + c.z * vz;
      if (sz <= 0.02) continue;
      var px = cx + r * (c.x * ex + c.y * ey + c.z * ez), py = cy - r * (c.x * nx + c.y * ny + c.z * nz);
      if (px < -20 || py < -20 || px > W + 20 || py > H + 20) continue;
      cityScreen.push({ c: c, x: px, y: py });
      ctx.beginPath(); ctx.arc(px, py, dot, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    }
    ctx.font = "400 11px 'Familjen Grotesk', 'Helvetica Neue', Helvetica, Arial, sans-serif";
    ctx.textBaseline = "middle"; ctx.textAlign = "left";
    ctx.lineJoin = "round"; ctx.lineWidth = 3; ctx.strokeStyle = pal.ocean;
    var placed = [], pad = 3;
    for (i = 0; i < cityScreen.length; i++) {
      var s = cityScreen[i];
      if (s.c.tier > show) continue;
      var w = ctx.measureText(s.c.name).width;
      var lx = s.x + dot + 4, ly = s.y - 7, lw = w + pad * 2, lh = 14;
      var clash = false;
      for (var k = 0; k < placed.length; k++) { var q = placed[k]; if (lx < q.x + q.w && lx + lw > q.x && ly < q.y + q.h && ly + lh > q.y) { clash = true; break; } }
      if (clash) continue;
      placed.push({ x: lx, y: ly, w: lw, h: lh });
      ctx.strokeText(s.c.name, s.x + dot + 4, s.y);
      ctx.fillStyle = pal.label; ctx.fillText(s.c.name, s.x + dot + 4, s.y);
      ctx.fillStyle = pal.city;
    }
  }
  function cityAt(x, y) {
    var best = null, bestD = 9;
    for (var i = 0; i < cityScreen.length; i++) { var d = Math.hypot(cityScreen[i].x - x, cityScreen[i].y - y); if (d < bestD) { bestD = d; best = cityScreen[i].c; } }
    return best;
  }
  function loadCities() {
    fetch("data/cities.json").then(function (r) { return r.json(); }).then(function (rows) {
      cities = rows.map(function (r) { var v = G.toVec(r[2], r[3]); return { name: r[0], cc: r[1], lon: r[2], lat: r[3], tier: r[4], x: v[0], y: v[1], z: v[2] }; });
      cities.sort(function (a, b) { return a.tier - b.tier; });
      scheduleRender("full");
    }).catch(function (err) { console.warn("cities", err); });
  }

  function visible(lonlat) {
    var rot = projection.rotate();
    return d3.geoDistance(lonlat, [-rot[0], -rot[1]]) < Math.PI / 2 - 1e-6;
  }

  function markerPos(pt) {
    if (!pt || !visible([pt.lon, pt.lat])) return null;
    return projection([pt.lon, pt.lat]);
  }

  function drawMarkers() {
    [["A", state.a], ["B", state.b]].forEach(function (m) {
      var p = markerPos(m[1]);
      if (!p) return;
      ctx.beginPath(); ctx.arc(p[0], p[1], 8.5, 0, 2 * Math.PI);
      ctx.fillStyle = pal["route-halo"]; ctx.fill();
      ctx.beginPath(); ctx.arc(p[0], p[1], 7, 0, 2 * Math.PI);
      ctx.fillStyle = pal.marker; ctx.fill();
      ctx.fillStyle = pal["marker-ink"];
      ctx.font = "500 10px 'Familjen Grotesk', 'Helvetica Neue', Helvetica, Arial, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(m[0], p[0], p[1] + 0.5);
    });
  }

  // ------------------------------------------------------------- picking
  // A second, unseen canvas with each country in its own colour, so the
  // country under the pointer is a pixel read rather than a search.
  var pick = document.createElement("canvas");
  var pctx = pick.getContext("2d", { willReadFrequently: true });
  var pickDirty = true;

  function renderPick() {
    basis();
    var feats = lod.full; // at full detail whatever is drawn: small countries stay pickable
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.clearRect(0, 0, W, H);
    for (var i = 0; i < feats.length; i++) {
      var code = i + 1;
      pctx.fillStyle = "rgb(" + (code & 255) + "," + ((code >> 8) & 255) + ",0)";
      pctx.beginPath(); traceFeature(pctx, feats[i]); pctx.fill();
    }
    pickDirty = false;
  }

  /* The country at window position (x, y), as an index, or -1. The pixel's
     colour is a candidate; the exact test confirms it, since a pixel on a
     border is a blend of two. */
  function countryAt(x, y) {
    if (!lod) return -1;
    if (pickDirty) renderPick();
    var lonlat = projection.invert([x, y]);
    if (!lonlat || !isFinite(lonlat[0]) || !visible(lonlat)) return -1;
    var tried = {};
    for (var dy = 0; dy <= 2; dy++) {
      for (var dx = 0; dx <= 2; dx++) {
        var px = Math.round(x) + (dx === 2 ? -1 : dx), py = Math.round(y) + (dy === 2 ? -1 : dy);
        if (px < 0 || py < 0 || px >= W || py >= H) continue;
        var d = pctx.getImageData(px, py, 1, 1).data;
        if (d[3] === 0) continue;
        var idx = (d[0] | (d[1] << 8)) - 1;
        if (idx < 0 || idx >= features.length || tried[idx]) continue;
        tried[idx] = true;
        if (d3.geoContains(features[idx], lonlat)) return idx;
      }
    }
    return -1;
  }

  // ------------------------------------------------------------- interaction
  var pointers = new Map(); // active pointers, for drag and pinch
  var drag = null;          // { x, y, lon, lat, moved, marker, lastT, vx, vy, lastX, lastY }
  var pinch = null;
  var inertia = null;

  function degPerPx() { return 180 / (Math.PI * projection.scale()); }

  canvas.addEventListener("pointerdown", function (e) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* a pointer that is already gone */ }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    stopInertia();
    stopFly();
    if (pointers.size === 2) {
      drag = null;
      canvas.classList.remove("is-dragging");
      var pts = Array.from(pointers.values());
      pinch = { d: dist(pts[0], pts[1]), zoom: view.zoom, mx: (pts[0].x + pts[1].x) / 2, my: (pts[0].y + pts[1].y) / 2 };
      return;
    }
    var marker = markerAt(e.clientX, e.clientY, e.pointerType !== "mouse");
    drag = { x: e.clientX, y: e.clientY, lon: view.lon, lat: view.lat, moved: false, marker: marker,
      lastT: performance.now(), lastX: e.clientX, lastY: e.clientY, vx: 0, vy: 0, shift: e.shiftKey };
    canvas.classList.add("is-dragging");
    if (e.pointerType === "mouse") canvas.focus({ preventScroll: true });
  });

  canvas.addEventListener("pointermove", function (e) {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      var pts = Array.from(pointers.values());
      var nd = dist(pts[0], pts[1]);
      var mx = (pts[0].x + pts[1].x) / 2, my = (pts[0].y + pts[1].y) / 2;
      var s = degPerPx();
      view.lon -= (mx - pinch.mx) * s; view.lat += (my - pinch.my) * s;
      pinch.mx = mx; pinch.my = my;
      applyView(); // before the zoom reads what is under the fingers
      zoomAt(pinch.zoom * nd / pinch.d, mx, my, true);
      moving();
      return;
    }
    if (drag) {
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      drag.moved = true;
      if (drag.marker) {
        var ll = projection.invert([e.clientX, e.clientY]);
        if (ll && isFinite(ll[0]) && visible(ll)) {
          setPoint(drag.marker, { lon: ll[0], lat: ll[1], label: null }, { quiet: true });
        }
        moving();
        return;
      }
      // The surface follows the pointer: a drag to the right carries the
      // globe right, so what is at the centre moves west, and down, north.
      var sc = degPerPx();
      view.lon = drag.lon - dx * sc;
      view.lat = drag.lat + dy * sc;
      var now = performance.now(), dt = now - drag.lastT;
      if (dt > 0) {
        drag.vx = 0.6 * drag.vx + 0.4 * ((e.clientX - drag.lastX) * sc / dt);
        drag.vy = 0.6 * drag.vy + 0.4 * ((e.clientY - drag.lastY) * sc / dt);
      }
      drag.lastT = now; drag.lastX = e.clientX; drag.lastY = e.clientY;
      applyView();
      moving();
      hideTip();
      return;
    }
    hover(e.clientX, e.clientY, e.shiftKey);
  });

  function endPointer(e) {
    pointers.delete(e.pointerId);
    if (pinch) { if (pointers.size < 2) pinch = null; if (pointers.size === 0) { interacting = 0; scheduleRender("full"); } return; }
    if (!drag) return;
    var d = drag; drag = null;
    canvas.classList.remove("is-dragging");
    if (!d.moved) {
      if (e.type !== "pointercancel") click(e.clientX, e.clientY, d.shift || e.shiftKey);
      return;
    }
    if (d.marker) { commitPoint(d.marker); return; }
    // Let it glide.
    var since = performance.now() - d.lastT;
    if (!reduceMotion && since < 60 && Math.hypot(d.vx, d.vy) > 0.02) startInertia(d.vx, d.vy);
    else { interacting = 0; scheduleRender("full"); }
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("lostpointercapture", function (e) { pointers.delete(e.pointerId); });

  canvas.addEventListener("pointerleave", function () { if (!drag) { setHover(-1); hideTip(); } });

  function dist(p, q) { return Math.hypot(p.x - q.x, p.y - q.y); }

  function startInertia(vx, vy) {
    inertia = { vx: vx, vy: vy, t: performance.now() };
    interacting = 1;
    requestAnimationFrame(inertiaStep);
  }
  function inertiaStep() {
    if (!inertia) return;
    var now = performance.now(), dt = Math.min(40, now - inertia.t); inertia.t = now;
    view.lon -= inertia.vx * dt; view.lat += inertia.vy * dt;
    var decay = Math.pow(0.0025, dt / 1000); // most of it gone within a second
    inertia.vx *= decay; inertia.vy *= decay;
    applyView();
    if (Math.hypot(inertia.vx, inertia.vy) < 0.004) { inertia = null; interacting = 0; scheduleRender("full"); return; }
    scheduleRender("coarse");
    requestAnimationFrame(inertiaStep);
  }
  function stopInertia() { if (inertia) { inertia = null; interacting = 0; } }

  /* Zoom so that what is under (x, y) stays under it. */
  function zoomAt(zoom, x, y, noSettle) {
    var before = projection.invert([x, y]);
    var wasVisible = before && isFinite(before[0]) && visible(before);
    view.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    applyView();
    if (wasVisible) {
      // Turn the globe so the point comes back under the pointer; twice,
      // since the first turn is only right at the centre.
      for (var k = 0; k < 2; k++) {
        var after = projection([before[0], before[1]]);
        if (!after) break;
        var s = degPerPx();
        view.lon -= (x - after[0]) * s;
        view.lat += (y - after[1]) * s;
        applyView();
      }
    }
    if (!noSettle) moving();
  }

  var EMBED = /[?&]embed=1(&|$)/.test(location.search);
  if (EMBED) document.body.classList.add("is-embed");
  var zoomHintTimer = 0;
  canvas.addEventListener("wheel", function (e) {
    if (EMBED && !e.ctrlKey && !e.metaKey) {
      // Inside another page, a plain scroll should scroll that page past
      // the globe, as a map embed does; say how to zoom instead.
      var hint = $("zoom-hint");
      if (hint) { hint.classList.add("is-shown"); clearTimeout(zoomHintTimer); zoomHintTimer = setTimeout(function () { hint.classList.remove("is-shown"); }, 1100); }
      return;
    }
    e.preventDefault();
    stopInertia(); stopFly(); hideTip();
    var f = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0016));
    zoomAt(view.zoom * f, e.clientX, e.clientY);
  }, { passive: false });

  $("zoom-in").addEventListener("click", function () { stopFly(); zoomAt(view.zoom * 1.5, cx, cy); });
  $("zoom-out").addEventListener("click", function () { stopFly(); zoomAt(view.zoom / 1.5, cx, cy); });
  $("fit").addEventListener("click", function () { fitRoute(true); });
  $("avoid-mode").addEventListener("click", function () {
    state.avoidMode = !state.avoidMode;
    $("avoid-mode").setAttribute("aria-pressed", String(state.avoidMode));
    canvas.classList.toggle("is-avoid-mode", state.avoidMode);
    $("avoid-hint").textContent = state.avoidMode ? (canHover ? "Click" : "Tap") + " a country to add it, again to take it off" : (canHover ? "Or shift-click a country on the globe" : "Or press avoid, then tap countries");
  });

  canvas.addEventListener("keydown", function (e) {
    var step = 6 / Math.sqrt(view.zoom);
    if (e.key === "ArrowLeft") view.lon -= step;
    else if (e.key === "ArrowRight") view.lon += step;
    else if (e.key === "ArrowUp") view.lat += step;
    else if (e.key === "ArrowDown") view.lat -= step;
    else if (e.key === "+" || e.key === "=") { zoomAt(view.zoom * 1.3, cx, cy); return; }
    else if (e.key === "-" || e.key === "_") { zoomAt(view.zoom / 1.3, cx, cy); return; }
    else return;
    e.preventDefault();
    applyView(); moving();
  });

  function markerAt(x, y, touch) {
    var best = null, bestD = touch ? 26 : 14;
    [["a", state.a], ["b", state.b]].forEach(function (m) {
      var p = markerPos(m[1]);
      if (!p) return;
      var d = Math.hypot(p[0] - x, p[1] - y);
      if (d < bestD) { bestD = d; best = m[0]; }
    });
    return best;
  }

  function click(x, y, shift) {
    var ll = projection.invert([x, y]);
    if (!ll || !isFinite(ll[0]) || !visible(ll)) return;
    if (shift || state.avoidMode) {
      var idx = countryAt(x, y);
      if (idx >= 0) toggleAvoid(features[idx].id, features[idx].properties.name);
      return;
    }
    var slot = !state.a ? "a" : !state.b ? "b" : "b";
    var city = cityAt(x, y);
    if (city) {
      setPoint(slot, { lon: city.lon, lat: city.lat, label: city.name + ", " + ((places && places.countries[city.cc]) || city.cc) }, { quiet: true });
      commitPoint(slot);
      return;
    }
    var idx2 = countryAt(x, y);
    setPoint(slot, { lon: ll[0], lat: ll[1], label: null, country: idx2 >= 0 ? features[idx2].properties.name : null }, { quiet: true });
    commitPoint(slot);
  }

  // ------------------------------------------------------------- hover
  var hoverRAF = 0;
  function hover(x, y, shift) {
    if (!canHover || hoverRAF) return;
    hoverRAF = requestAnimationFrame(function () {
      hoverRAF = 0;
      var m = markerAt(x, y);
      canvas.classList.toggle("is-over-marker", !!m);
      if (m) {
        setHover(-1);
        var pt = m === "a" ? state.a : state.b;
        showTip(x, y, m.toUpperCase(), pt.label || fmtLonLat(pt), "drag to move");
        return;
      }
      var city = cityAt(x, y);
      canvas.classList.toggle("is-over-city", !!city && !(shift || state.avoidMode));
      if (city && !(shift || state.avoidMode)) {
        setHover(-1);
        showTip(x, y, city.name, places && places.countries[city.cc] || city.cc, "click to set a point here");
        return;
      }
      var idx = countryAt(x, y);
      setHover(idx);
      canvas.classList.toggle("is-over-country", idx >= 0 && (shift || state.avoidMode));
      if (idx >= 0) {
        var f = features[idx], avoided = state.avoid.has(f.id);
        showTip(x, y, f.properties.name, null, avoided ? "avoided" + (shift || state.avoidMode ? " · click to allow" : "") : (shift || state.avoidMode ? "click to avoid" : (canHover ? "shift-click to avoid" : "")));
      } else hideTip();
    });
  }
  function setHover(idx) {
    if (idx === state.hover) return;
    state.hover = idx;
    scheduleRender(interacting ? "coarse" : "full");
  }
  var tip = $("tip");
  function showTip(x, y, main, sub, note) {
    tip.innerHTML = "";
    var b = document.createElement("b"); b.textContent = main; b.style.fontWeight = "400"; tip.appendChild(b);
    if (sub) { var s = document.createElement("small"); s.textContent = sub; tip.appendChild(s); }
    if (note) { var n = document.createElement("small"); n.textContent = note; tip.appendChild(n); }
    tip.hidden = false;
    var w = tip.offsetWidth;
    tip.style.left = (x + 14 + w > W ? x - 14 - w - 14 : x) + "px";
    tip.style.top = y + "px";
  }
  function hideTip() { tip.hidden = true; }

  // ------------------------------------------------------------- flying
  var fly = null;
  function flyTo(lon, lat, zoom, done) {
    stopInertia();
    var toZoom = zoom == null ? view.zoom : Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    if (reduceMotion) { view.lon = lon; view.lat = lat; view.zoom = toZoom; applyView(); scheduleRender("full"); if (done) done(); return; }
    var from = versorFromAngles([-view.lon, -view.lat, 0]);
    var to = versorFromAngles([-lon, -lat, 0]);
    var dAngle = d3.geoDistance([view.lon, view.lat], [lon, lat]);
    var ms = Math.min(1400, 450 + dAngle * 350);
    fly = { t0: performance.now(), ms: ms, interp: versorInterpolate(from, to), z0: view.zoom, z1: toZoom, done: done };
    interacting = 1;
    requestAnimationFrame(flyStep);
  }
  function flyStep() {
    if (!fly) return;
    var t = Math.min(1, (performance.now() - fly.t0) / fly.ms);
    var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    var q = fly.interp(e);
    var ang = versorToAngles(q);
    view.lon = -ang[0]; view.lat = -ang[1];
    view.zoom = fly.z0 * Math.pow(fly.z1 / fly.z0, e);
    applyView();
    if (t >= 1) { var d = fly.done; fly = null; interacting = 0; scheduleRender("full"); if (d) d(); return; }
    scheduleRender("coarse");
    requestAnimationFrame(flyStep);
  }
  function stopFly() { if (fly) { fly = null; interacting = 0; } }

  /* Turn the globe to show A, B and the route between them. */
  function fitRoute(always) {
    var pts = [];
    if (state.a) pts.push([state.a.lon, state.a.lat]);
    if (state.b) pts.push([state.b.lon, state.b.lat]);
    if (state.result && state.result.status === "done" && state.result.waypoints) pts = state.result.waypoints.slice();
    if (!pts.length) return;
    if (pts.length === 1) { flyTo(pts[0][0], pts[0][1]); return; }
    // The centre is the mean direction; samples along the arcs count too.
    var sx = 0, sy = 0, sz = 0, all = [];
    for (var i = 0; i + 1 < pts.length; i++) {
      var seg = G.sampleArc(G.toVec(pts[i][0], pts[i][1]), G.toVec(pts[i + 1][0], pts[i + 1][1]), 0.03, i === 0);
      seg.forEach(function (v) { all.push(v); sx += v[0]; sy += v[1]; sz += v[2]; });
    }
    var c = G.normalize([sx, sy, sz]);
    if (!(Math.hypot(sx, sy, sz) > 1e-6)) c = G.toVec(pts[0][0], pts[0][1]);
    var far = 0;
    all.forEach(function (v) { far = Math.max(far, G.angleBetween(c, v)); });
    var ll = G.toLonLat(c);
    var zoom;
    if (far > 1.35) zoom = 1; // more than about 77° either way: show the whole globe
    else {
      var free = Math.min(W - (W <= 640 ? 0 : 400), H - (W <= 640 ? 260 : 60)) / 2 - 24;
      zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, free / (base * Math.max(Math.sin(far) * 1.12, 0.06))));
    }
    if (!always && allVisible(all)) return;
    flyTo(ll[0], ll[1], zoom);
  }
  function allVisible(vecs) {
    var rot = projection.rotate(), c = G.toVec(-rot[0], -rot[1]);
    var r = projection.scale();
    for (var i = 0; i < vecs.length; i++) {
      if (G.angleBetween(c, vecs[i]) > Math.PI / 2 - 0.05) return false;
      var p = projection(G.toLonLat(vecs[i]));
      if (!p || p[0] < 8 || p[1] < 8 || p[0] > W - 8 || p[1] > H - 8) return false;
    }
    return true;
  }

  // Versors (unit quaternions) for turning the globe smoothly.
  function versorFromAngles(a) {
    var l = a[0] * Math.PI / 360, p = a[1] * Math.PI / 360, g = a[2] * Math.PI / 360;
    var sl = Math.sin(l), cl = Math.cos(l), sp = Math.sin(p), cp = Math.cos(p), sg = Math.sin(g), cg = Math.cos(g);
    return [cl * cp * cg + sl * sp * sg, sl * cp * cg - cl * sp * sg, cl * sp * cg + sl * cp * sg, cl * cp * sg - sl * sp * cg];
  }
  function versorToAngles(q) {
    var a = q[0], b = q[1], c = q[2], d = q[3];
    return [Math.atan2(2 * (a * b + c * d), 1 - 2 * (b * b + c * c)) * 180 / Math.PI,
      Math.asin(Math.max(-1, Math.min(1, 2 * (a * c - d * b)))) * 180 / Math.PI,
      Math.atan2(2 * (a * d + b * c), 1 - 2 * (c * c + d * d)) * 180 / Math.PI];
  }
  function versorInterpolate(a, b) {
    var dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (dot < 0) { b = [-b[0], -b[1], -b[2], -b[3]]; dot = -dot; }
    if (dot > 0.9995) return function (t) { var q = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2]), a[3] + t * (b[3] - a[3])]; var l = Math.hypot(q[0], q[1], q[2], q[3]); return q.map(function (x) { return x / l; }); };
    var th = Math.acos(dot), s = Math.sin(th);
    return function (t) {
      var wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
      return [wa * a[0] + wb * b[0], wa * a[1] + wb * b[1], wa * a[2] + wb * b[2], wa * a[3] + wb * b[3]];
    };
  }

  // ------------------------------------------------------------- points
  var inputs = { a: $("in-a"), b: $("in-b") };

  function fmtLonLat(p) {
    return Math.abs(p.lat).toFixed(2) + "°" + (p.lat >= 0 ? "N" : "S") + " " + Math.abs(p.lon).toFixed(2) + "°" + (p.lon >= 0 ? "E" : "W");
  }

  /* Sets A or B. quiet: during a drag, when the route is not recomputed. */
  function setPoint(slot, pt, opts) {
    opts = opts || {};
    state[slot] = pt;
    var text = pt ? (pt.label || (pt.country ? fmtLonLat(pt) + " · " + pt.country : fmtLonLat(pt))) : "";
    if (suggesters[slot]) suggesters[slot].setValue(text); else inputs[slot].value = text;
    $("clear-" + slot).hidden = !pt;
    if (!opts.quiet) { commitPoint(slot); }
    else scheduleRender("coarse");
  }

  var fitPending = false; // A or B moved: show the new route when it comes
  function commitPoint(slot) {
    var pt = state[slot];
    fitPending = true;
    state.stale = true; // the route drawn no longer starts here
    if (pt && !pt.label) { var text = fmtLonLat(pt) + (pt.country ? " · " + pt.country : ""); if (suggesters[slot]) suggesters[slot].setValue(text); else inputs[slot].value = text; }
    updateHint();
    requestRoute();
    writeUrl();
    scheduleRender("full");
  }

  function updateHint() {
    var h = $("hint"), tap = canHover ? "click" : "tap";
    if (!state.a && !state.b) h.textContent = "Or " + tap + " two points on the globe";
    else if (!state.b) h.textContent = "Now B: " + tap + " the globe, or type a place";
    else h.textContent = "Drag A or B to move them, " + (canHover ? "clicking" : "tapping") + " again moves B";
  }

  $("clear-a").addEventListener("click", function () { setPoint("a", null); inputs.a.focus(); });
  $("clear-b").addEventListener("click", function () { setPoint("b", null); inputs.b.focus(); });
  $("swap").addEventListener("click", function () {
    var a = state.a, b = state.b;
    state.a = b; state.b = a;
    setPoint("a", state.a, { quiet: true }); setPoint("b", state.b, { quiet: true });
    commitPoint("a");
  });

  // ------------------------------------------------------------- avoid
  function toggleAvoid(id, name) {
    if (state.avoid.has(id)) state.avoid.delete(id);
    else state.avoid.set(id, name);
    avoidChanged();
  }
  function avoidChanged() {
    renderChips();
    requestRoute();
    writeUrl();
    scheduleRender("full");
  }
  function renderChips() {
    var ul = $("chips");
    ul.innerHTML = "";
    state.avoid.forEach(function (name, id) {
      var li = document.createElement("li");
      li.className = "gc-chip";
      li.appendChild(document.createTextNode(name));
      var x = document.createElement("button");
      x.type = "button"; x.setAttribute("aria-label", "Stop avoiding " + name); x.textContent = "×";
      x.addEventListener("click", function () { state.avoid.delete(id); avoidChanged(); });
      li.appendChild(x);
      ul.appendChild(li);
    });
    if (state.avoid.size > 1) {
      var li2 = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button"; b.className = "gc-linkbtn"; b.textContent = "clear all"; b.style.fontSize = "13px";
      b.addEventListener("click", function () { state.avoid.clear(); avoidChanged(); });
      li2.appendChild(b); ul.appendChild(li2);
    }
  }

  // ------------------------------------------------------------- search
  function fold(s) {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }

  /* "51.5, -0.12", "51.5N 0.12W", "51°30'N 0°7'W" and the like. */
  function parseLatLon(q) {
    var s = q.split("·")[0].trim().toUpperCase();
    var m = s.match(/^\s*([-+]?\d+(?:\.\d+)?)\s*°?\s*([NS])?\s*[, ]\s*([-+]?\d+(?:\.\d+)?)\s*°?\s*([EW])?\s*$/);
    if (!m) {
      var dms = s.match(/^\s*(\d+)[°\s]+(\d+(?:\.\d+)?)['′\s]*([NS])\s*[, ]?\s*(\d+)[°\s]+(\d+(?:\.\d+)?)['′\s]*([EW])\s*$/);
      if (!dms) return null;
      var lat = (+dms[1] + dms[2] / 60) * (dms[3] === "S" ? -1 : 1);
      var lon = (+dms[4] + dms[5] / 60) * (dms[6] === "W" ? -1 : 1);
      return finite(lat, lon);
    }
    var la = +m[1], lo = +m[3];
    if (m[2] === "S") la = -Math.abs(la);
    if (m[4] === "W") lo = -Math.abs(lo);
    return finite(la, lo);
  }
  function finite(lat, lon) {
    if (!(Math.abs(lat) <= 90 && Math.abs(lon) <= 180)) return null;
    return { lon: lon, lat: lat };
  }

  var placesFailed = false;
  function loadPlaces() {
    if (placesPromise) return placesPromise;
    placesPromise = fetch("data/places.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (data) {
      var rows = data.rows.map(function (r) {
        var kind = r[0], name = r[1], cc = r[2];
        var o = { kind: kind, name: name, cc: cc, lon: r[3], lat: r[4], pop: r[5] || 0, extra: r[6] || "", extra2: r[7] || "",
          country: data.countries[cc] || cc, key: fold(name) };
        if (kind === 0) o.aliases = (r[8] || "").split("|").filter(Boolean).map(fold);
        if (kind === 2) o.iata = r[6];
        return o;
      });
      places = { rows: rows, countries: data.countries, aliases: new Map() };
      rows.forEach(function (r) { if (r.kind === 0) places.aliases.set(String(r.extra), r.aliases || []); });
      applyAliases();
      return places;
    }).catch(function (err) {
      console.warn("places list", err);
      placesFailed = true;
      places = { rows: [], countries: {} };
      return places;
    });
    return placesPromise;
  }

  /* The countries' other names come with the place list; the country list
     is built when the map arrives. Whichever is second applies them. */
  function applyAliases() {
    if (!places || !places.aliases || !countries.length) return;
    countries.forEach(function (c) { var a = places.aliases.get(c.id); if (a) c.aliases = a; });
  }

  /* Score every place against the query; the best few come back. */
  function searchPlaces(q) {
    if (!places) return [];
    var fq = fold(q);
    if (!fq) return [];
    var words = fq.split(" ");
    var first = words[0];
    var upper = q.trim().toUpperCase();
    var out = [];
    for (var i = 0; i < places.rows.length; i++) {
      var p = places.rows[i], key = p.key, score = 0;
      if (key === fq) score = 100;
      else if (key.indexOf(fq) === 0) score = 80;
      else if (key.indexOf(" " + first) >= 0 || key.indexOf(first) === 0) {
        // every word has to start a word of the name (or its country)
        var ok = true, hay = key + " " + fold(p.country) + (p.extra2 ? " " + fold(p.extra2) : "");
        for (var w = 0; w < words.length; w++) {
          if (!(hay.indexOf(words[w]) === 0 || hay.indexOf(" " + words[w]) >= 0)) { ok = false; break; }
        }
        if (ok) score = 60;
      }
      if (!score && p.kind === 0 && p.aliases) {
        for (var a = 0; a < p.aliases.length; a++) { if (p.aliases[a] === fq) { score = 90; break; } if (p.aliases[a].indexOf(fq) === 0 && fq.length > 2) { score = 55; break; } }
      }
      if (p.kind === 2 && p.iata === upper) score = 120;
      if (!score && p.kind === 2 && fq.length > 2 && fold(p.extra2).indexOf(fq) === 0) score = 40;
      if (!score) continue;
      // Within a score, the better known first.
      var weight = p.kind === 1 ? Math.log10(p.pop + 1) : p.kind === 0 ? 7.5 : (p.pop === 2 ? 6.5 : 4.5);
      if (p.kind === 2 && fq.length <= 3 && p.iata !== upper) weight -= 2;
      out.push({ p: p, s: score + weight });
    }
    out.sort(function (x, y) { return y.s - x.s; });
    return out.slice(0, 8).map(function (x) { return x.p; });
  }

  function placeLabel(p) {
    if (p.kind === 0) return p.extra2 ? p.extra2 + ", " + p.name : p.name;
    if (p.kind === 1) return p.name + ", " + (p.extra ? p.extra + ", " : "") + p.country;
    return p.name + " (" + p.iata + ")";
  }
  function placeSub(p) {
    if (p.kind === 0) return p.extra2 ? "capital of " + p.name : "country";
    if (p.kind === 1) return p.pop ? Math.round(p.pop / 1000).toLocaleString() + "k people" : "";
    return (p.extra2 ? p.extra2 + ", " : "") + p.country;
  }
  function placeKind(p) { return p.kind === 0 ? "country" : p.kind === 1 ? "city" : "airport"; }

  // Photon, for whatever the list does not know. Only once typing pauses.
  var photonTimer = 0, photonSeq = 0;
  function photon(q, cb) {
    clearTimeout(photonTimer);
    var seq = ++photonSeq;
    photonTimer = setTimeout(function () {
      var url = "https://photon.komoot.io/api/?limit=6&lang=en&q=" + encodeURIComponent(q);
      fetch(url).then(function (r) { return r.json(); }).then(function (j) {
        if (seq !== photonSeq) return;
        var rows = (j.features || []).map(function (f) {
          var pr = f.properties || {}, c = f.geometry.coordinates;
          var bits = [pr.name, pr.city && pr.city !== pr.name ? pr.city : null, pr.state, pr.country].filter(Boolean);
          return { kind: 3, name: pr.name || bits[0] || q, lon: c[0], lat: c[1], label: bits.join(", "), sub: (pr.osm_value || pr.type || "").replace(/_/g, " "), country: pr.country || "" };
        }).filter(function (r) { return isFinite(r.lon) && isFinite(r.lat); });
        cb(rows);
      }).catch(function () { cb([]); });
    }, 350);
  }

  /* A text field with a list of suggestions under it. */
  function suggester(input, list, opts) {
    var items = [], selected = -1, open = false, closeTimer = 0, enterPending = false;
    function close() { open = false; enterPending = false; list.hidden = true; list.innerHTML = ""; items = []; selected = -1; input.removeAttribute("aria-activedescendant"); input.setAttribute("aria-expanded", "false"); }
    function show(rows, note) {
      if (enterPending && rows.length) { enterPending = false; close(); opts.pick(rows[0]); return; }
      if (enterPending && !note) enterPending = false;
      items = rows; selected = -1;
      list.innerHTML = "";
      rows.forEach(function (row, i) {
        var li = document.createElement("li");
        li.setAttribute("role", "option"); li.id = list.id + "-" + i; li.setAttribute("aria-selected", "false");
        var k = document.createElement("span"); k.className = "gc-sug-kind"; k.textContent = opts.kind(row);
        var m = document.createElement("span"); m.className = "gc-sug-main"; m.textContent = opts.main(row);
        li.appendChild(k); li.appendChild(m);
        var sub = opts.sub(row);
        if (sub) { var s = document.createElement("span"); s.className = "gc-sug-sub"; s.textContent = sub; li.appendChild(s); }
        li.addEventListener("pointerdown", function (e) { e.preventDefault(); });
        li.addEventListener("click", function () { choose(i); });
        list.appendChild(li);
      });
      if (note) { var n = document.createElement("li"); n.className = "gc-sug-note"; n.textContent = note; list.appendChild(n); }
      open = rows.length > 0 || !!note;
      list.hidden = !open;
      input.setAttribute("aria-expanded", String(open));
      if (open) {
        // No taller than the panel has room for below the field, so the
        // list scrolls itself rather than the panel.
        var room = panel.getBoundingClientRect().bottom - list.getBoundingClientRect().top - 12;
        list.style.maxHeight = Math.max(120, Math.min(290, room)) + "px";
      }
    }
    function choose(i) {
      if (i < 0 || i >= items.length) return;
      var row = items[i];
      close();
      opts.pick(row);
    }
    function highlight(i) {
      var lis = list.querySelectorAll("li[role=option]");
      lis.forEach(function (li, k) { li.setAttribute("aria-selected", String(k === i)); });
      selected = i;
      if (i >= 0 && lis[i]) { input.setAttribute("aria-activedescendant", lis[i].id); lis[i].scrollIntoView({ block: "nearest" }); }
    }
    var lastQuery = "", searching = false;
    function update() {
      var q = input.value;
      lastQuery = q;
      if (!q.trim()) {
        searching = false;
        if (opts.all) show(opts.all(), null); else close();
        return;
      }
      searching = true;
      opts.search(q, function (rows, note) { if (input.value !== q) return; searching = !!note && !rows.length; show(rows, note); });
    }
    input.addEventListener("input", function () { enterPending = false; opts.changed && opts.changed(); update(); });
    input.addEventListener("focus", function () {
      clearTimeout(closeTimer);
      if (opts.load) opts.load();
      if (opts.all && !input.value.trim()) update();
      else if (input.value.trim() && input.value !== lastQuery) update();
    });
    input.addEventListener("blur", function () { closeTimer = setTimeout(close, 120); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { if (!open) update(); else highlight(Math.min(items.length - 1, selected + 1)); e.preventDefault(); }
      else if (e.key === "ArrowUp") { if (open) { highlight(Math.max(0, selected - 1)); e.preventDefault(); } }
      else if (e.key === "Enter") {
        if (open && selected >= 0) { choose(selected); e.preventDefault(); }
        else if (open && items.length) { choose(0); e.preventDefault(); }
        else if (open || searching) { enterPending = true; e.preventDefault(); } // an answer is still on its way
        else if (opts.enter) { opts.enter(input.value); e.preventDefault(); }
      }
      else if (e.key === "Escape") { close(); }
    });
    /* A value written by the page rather than typed: focusing the field
       again must not go searching for it. */
    function setValue(v) { input.value = v; lastQuery = v; }
    return { close: close, refresh: update, setValue: setValue };
  }

  var suggesters = {};
  function pointSuggester(slot) {
    var input = inputs[slot];
    suggesters[slot] = suggester(input, $("sug-" + slot), {
      load: loadPlaces,
      changed: function () { /* typing over a chosen place: it stays until a new one is chosen */ },
      search: function (q, cb) {
        var ll = parseLatLon(q);
        if (ll) { cb([{ kind: 4, lon: ll.lon, lat: ll.lat, label: fmtLonLat(ll) }]); return; }
        loadPlaces().then(function () {
          var rows = searchPlaces(q);
          if (rows.length) { cb(rows); return; }
          if (fold(q).length < 3) { cb([], placesFailed ? "The place list did not load, lat, lon still works" : null); return; }
          cb([], placesFailed ? "The place list did not load, looking it up…" : "looking further afield…");
          photon(q, function (more) { cb(more, more.length ? null : (placesFailed ? "The place list did not load and the lookup found nothing, lat, lon still works" : "nothing found")); });
        });
      },
      main: function (r) { return r.kind === 3 ? r.label : r.kind === 4 ? r.label : placeLabel(r); },
      sub: function (r) { return r.kind === 3 ? r.sub : r.kind === 4 ? "coordinates" : placeSub(r); },
      kind: function (r) { return r.kind === 3 ? "place" : r.kind === 4 ? "" : placeKind(r); },
      pick: function (r) {
        var label = r.kind === 3 ? r.label : r.kind === 4 ? r.label : placeLabel(r);
        setPoint(slot, { lon: r.lon, lat: r.lat, label: label }, { quiet: true });
        commitPoint(slot);
        flyTo(r.lon, r.lat, Math.max(view.zoom, 1.6), function () { fitRoute(false); });
        if (slot === "a" && !state.b) inputs.b.focus();
        else { input.blur(); if (W <= 640) setSheet(false); }
      },
      enter: function (q) {
        var ll = parseLatLon(q);
        if (ll) { setPoint(slot, { lon: ll.lon, lat: ll.lat, label: fmtLonLat(ll) }); flyTo(ll.lon, ll.lat); }
      }
    });
  }
  pointSuggester("a");
  pointSuggester("b");

  function countrySuggester() {
    suggester($("in-avoid"), $("sug-avoid"), {
      // Every country, on focus, before anything is typed: a list to pick
      // from as much as a box to search in.
      all: function () { return countries; },
      search: function (q, cb) {
        var fq = fold(q);
        var rows = countries.filter(function (c) { return c.key.indexOf(fq) === 0 || c.key.indexOf(" " + fq) >= 0 || c.aliases.some(function (a) { return a.indexOf(fq) === 0; }); });
        rows.sort(function (x, y) { return (x.key.indexOf(fq) === 0 ? 0 : 1) - (y.key.indexOf(fq) === 0 ? 0 : 1) || x.name.localeCompare(y.name); });
        cb(rows.slice(0, 8));
      },
      main: function (c) { return c.name; },
      sub: function () { return ""; },
      kind: function (c) { return state.avoid.has(c.id) ? "avoided" : ""; },
      pick: function (c) {
        $("in-avoid").value = "";
        toggleAvoid(c.id, c.name);
        $("in-avoid").focus();
      }
    });
  }

  // ------------------------------------------------------------- the worker
  var worker = null, routeTimer = 0, seq = 0, queued = false, busyTimer = 0;

  function startWorker() {
    try {
      if (location.search.indexOf("noworker") >= 0) throw new Error("no worker, by request");
      worker = new Worker("worker.js");
    } catch (err) {
      startShim();
      return;
    }
    worker.onerror = function (e) {
      console.error("worker", e.message);
      if (!state.ready) { console.warn("worker failed to start; routing on the main thread"); startShim(); return; }
      if (state.pendingId) { state.pendingId = 0; clearTimeout(busyTimer); showError("Something went wrong working out the route"); }
    };
    worker.onmessage = onWorkerMessage;
    worker.postMessage({ type: "init", topology: topology });
  }

  /* The same code, as a script on this thread: worker.js knows which way
     it was loaded and answers through the same messages. */
  var shimStarted = false;
  function startShim() {
    if (shimStarted) return;
    shimStarted = true;
    var sc = document.createElement("script");
    sc.src = "worker.js";
    sc.onload = function () {
      worker = self.GreatCircleRouter;
      worker.onmessage = onWorkerMessage;
      worker.postMessage({ type: "init", topology: topology });
    };
    sc.onerror = function () { showError("The route finder could not start"); };
    document.head.appendChild(sc);
  }

  function onWorkerMessage(e) {
    var m = e.data;
    if (m.type === "ready") {
      state.ready = true; window.__greatercircle.readyMs = m.ms;
      if (queued) { queued = false; requestRoute(); }
      // The globe is up and the route finder ready: fetch the place list
      // in the quiet, so the first keystroke has it.
      var prefetch = function () { setTimeout(loadPlaces, 800); };
      if (window.requestIdleCallback) requestIdleCallback(prefetch); else prefetch();
      return;
    }
    if (m.id !== state.pendingId) return; // an older request, superseded
    if (m.type === "progress") { showBusy(m); return; }
    if (m.type === "result") {
      state.pendingId = 0;
      clearTimeout(busyTimer);
      state.stale = false;
      if (m.status === "error") { state.result = null; showError("Something went wrong working out the route: " + (m.message || "unknown error")); scheduleRender("full"); fitPending = false; return; }
      state.result = m;
      showResult();
      scheduleRender("full");
      if (m.status === "done" && fitPending && !drag && !pinch && !inertia) fitRoute(false);
      fitPending = false;
    }
  }

  /* Ask for the route again, soon; several changes in a row ask once. */
  function requestRoute() {
    clearTimeout(routeTimer);
    if (!state.a || !state.b) { state.result = null; state.pendingId = 0; showResult(); return; }
    if (!state.ready) { queued = true; showBusy(null); return; }
    routeTimer = setTimeout(function () {
      var id = ++seq;
      state.pendingId = id;
      worker.postMessage({ type: "route", id: id, a: [state.a.lon, state.a.lat], b: [state.b.lon, state.b.lat], avoid: Array.from(state.avoid.keys()) });
      clearTimeout(busyTimer);
      busyTimer = setTimeout(function () { if (state.pendingId === id) showBusy(null); }, 180);
    }, 40);
  }

  // ------------------------------------------------------------- results
  var UNITS = { km: { f: 1, label: "km" }, mi: { f: 0.621371192, label: "mi" }, nmi: { f: 1 / 1.852, label: "nmi" } };
  function fmt(km, unit) {
    var u = UNITS[unit || state.units];
    return Math.round(km * u.f).toLocaleString() + " " + u.label;
  }
  function names(ids) {
    return ids.map(function (id) { var f = featureById.get(String(id)); return f ? f.properties.name : id; });
  }
  function joinNames(list) {
    if (list.length <= 1) return list.join("");
    return list.slice(0, -1).join(", ") + " and " + list[list.length - 1];
  }

  function showBusy(m) {
    var el = $("summary");
    if (m && el.classList.contains("is-busy")) {
      // Progress: only the counter changes, and it is kept out of what a
      // screen reader is told, which would otherwise hear every slice.
      var ctr = $("progress");
      if (ctr) ctr.textContent = m.expanded ? m.expanded.toLocaleString() + " corners so far" : "";
      return;
    }
    el.classList.add("is-busy");
    el.setAttribute("aria-busy", "true");
    panel.classList.add("has-result");
    var what = !state.ready ? "Starting the route finder…" : state.avoid.size ? "Finding the way round " + joinNames(Array.from(state.avoid.values())) + "…" : "Measuring…";
    el.innerHTML = "";
    var line = document.createElement("span"); line.className = "gc-line";
    line.textContent = what + " ";
    var counter = document.createElement("span"); counter.id = "progress"; counter.setAttribute("aria-hidden", "true");
    line.appendChild(counter);
    el.appendChild(line);
  }

  function showError(text) {
    var el = $("summary"); el.classList.remove("is-busy"); el.setAttribute("aria-busy", "false"); el.innerHTML = "";
    var w = document.createElement("span"); w.className = "gc-warn"; w.textContent = text; el.appendChild(w);
  }

  function showResult() {
    var sum = $("summary"), out = $("out"), res = state.result;
    sum.classList.remove("is-busy");
    sum.setAttribute("aria-busy", "false");
    panel.classList.toggle("has-result", !!res);
    sum.innerHTML = ""; out.innerHTML = "";
    $("results").hidden = true;
    $("fit").hidden = !(state.a && state.b);
    if (!res) return;
    $("results").hidden = false;

    var big = document.createElement("span"); big.className = "gc-big";
    var line = document.createElement("span"); line.className = "gc-line";

    if (res.status === "inside") {
      var parts = [];
      if (res.insideA.length) parts.push("A is in " + joinNames(names(res.insideA)));
      if (res.insideB.length) parts.push("B is in " + joinNames(names(res.insideB)));
      big.textContent = fmt(res.directKm); big.appendChild(small("direct"));
      sum.appendChild(big);
      var warn = document.createElement("span"); warn.className = "gc-warn";
      warn.textContent = parts.join("; ") + ", which you are avoiding ";
      res.insideA.concat(res.insideB).forEach(function (id) {
        var b = document.createElement("button"); b.type = "button";
        b.textContent = "Allow " + names([id])[0];
        b.addEventListener("click", function () { state.avoid.delete(String(id)); avoidChanged(); });
        warn.appendChild(b); warn.appendChild(document.createTextNode(" "));
      });
      sum.appendChild(warn);
    } else if (res.status === "none") {
      big.textContent = fmt(res.directKm); big.appendChild(small("direct"));
      sum.appendChild(big);
      var w2 = document.createElement("span"); w2.className = "gc-warn";
      w2.textContent = "There is no way from A to B that stays out of " + joinNames(Array.from(state.avoid.values()));
      sum.appendChild(w2);
    } else {
      var detour = res.lengthKm > res.directKm + 0.5;
      if (state.avoid.size && !detour) {
        big.textContent = fmt(res.directKm); big.appendChild(small("direct"));
        sum.appendChild(big);
        line.innerHTML = "";
        line.appendChild(document.createTextNode("The direct way already keeps out of " + joinNames(Array.from(state.avoid.values()))));
        sum.appendChild(line);
      } else if (detour) {
        big.textContent = fmt(res.lengthKm); big.appendChild(small("avoiding " + joinNames(Array.from(state.avoid.values()))));
        sum.appendChild(big);
        var extra = res.lengthKm - res.directKm;
        var b1 = document.createElement("b"); b1.textContent = "+" + fmt(extra) + " (" + (100 * extra / res.directKm).toFixed(1) + "%)";
        line.appendChild(b1);
        line.appendChild(document.createTextNode(" over the direct " + fmt(res.directKm) + ", with " + res.bends + (res.bends === 1 ? " bend" : " bends")));
        sum.appendChild(line);
      } else {
        big.textContent = fmt(res.directKm); big.appendChild(small("great circle"));
        sum.appendChild(big);
        if (res.antipodal) { line.textContent = "A and B are antipodes: every way round is this long"; sum.appendChild(line); }
      }
    }

    // The details.
    var dl = document.createElement("dl"); dl.className = "gc-rows";
    row(dl, "Direct, on the sphere", fmt(res.directKm));
    if (res.directEllipsoidKm != null) row(dl, "Direct, on the WGS84 ellipsoid", fmt(res.directEllipsoidKm));
    var detoured = res.status === "done" && res.lengthKm > res.directKm + 0.5;
    if (detoured) {
      row(dl, "Avoiding " + joinNames(Array.from(state.avoid.values())), fmt(res.lengthKm));
      row(dl, "Bends", String(res.bends));
    }
    if (res.ms != null && res.expanded) row(dl, "Worked out in", (res.ms / 1000).toFixed(res.ms < 100 ? 2 : 1) + " s · " + res.expanded.toLocaleString() + " corners searched");
    out.appendChild(dl);

    var ends = (res.startIn || []).concat(res.endIn || []).map(String);
    crossesList(out, "The direct way crosses", res.directCrosses, ends);
    if (detoured) crossesList(out, "The way round crosses", res.routeCrosses, ends);
  }

  function small(text) { var s = document.createElement("small"); s.textContent = text; return s; }
  function row(dl, k, v) {
    var div = document.createElement("div"); div.className = "gc-row";
    var dt = document.createElement("dt"); dt.textContent = k;
    var dd = document.createElement("dd"); dd.textContent = v;
    div.appendChild(dt); div.appendChild(dd); dl.appendChild(div);
  }
  /* The countries a way passes over, each one a button that puts it on the
     avoid list, except the ones A and B are in, which cannot be avoided. */
  function crossesList(out, title, ids, ends) {
    if (!ids) return;
    var box = document.createElement("div"); box.className = "gc-crosses";
    var lab = document.createElement("div"); lab.className = "gc-label"; lab.textContent = title + (ids.length ? "" : " nothing: open sea all the way");
    box.appendChild(lab);
    if (ids.length) {
      var ul = document.createElement("ul"); ul.className = "gc-chips";
      ids.forEach(function (id) {
        id = String(id);
        var f = featureById.get(id); if (!f) return;
        var li = document.createElement("li");
        if (!state.avoid.has(id) && id !== ANTARCTICA && ends.indexOf(id) < 0) {
          var b = document.createElement("button"); b.type = "button"; b.className = "gc-chip gc-chip-add";
          b.textContent = f.properties.name; b.title = "Avoid " + f.properties.name;
          b.addEventListener("click", function () { state.avoid.set(id, f.properties.name); avoidChanged(); });
          li.appendChild(b);
        } else {
          li.className = "gc-chip"; li.style.borderColor = "var(--rule)"; li.style.paddingRight = "10px";
          li.textContent = f.properties.name;
        }
        ul.appendChild(li);
      });
      box.appendChild(ul);
    }
    out.appendChild(box);
  }

  document.querySelectorAll(".gc-units button").forEach(function (b) {
    b.addEventListener("click", function () {
      state.units = b.dataset.unit;
      document.querySelectorAll(".gc-units button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      try { localStorage.setItem("gc-units", state.units); } catch (e) {}
      showResult();
    });
  });

  // ------------------------------------------------------------- the url
  var ANTARCTICA = "010";
  function writeUrl() {
    var p = [];
    var pt = function (k, v) { if (v) p.push(k + "=" + v.lat.toFixed(4) + "," + v.lon.toFixed(4) + (v.label ? "," + encodeURIComponent(v.label) : "")); };
    pt("a", state.a); pt("b", state.b);
    if (state.avoid.size) p.push("avoid=" + Array.from(state.avoid.keys()).join(","));
    var h = p.length ? "#" + p.join("&") : "";
    if (h !== location.hash) history.replaceState(null, "", h || location.pathname + location.search);
  }
  function readUrl() {
    var h = location.hash.replace(/^#/, "");
    state.a = null; state.b = null; state.avoid.clear();
    ["a", "b"].forEach(function (k) { if (suggesters[k]) suggesters[k].setValue(""); else inputs[k].value = ""; $("clear-" + k).hidden = true; });
    if (!h) return false;
    var any = false;
    h.split("&").forEach(function (kv) {
      var i = kv.indexOf("="); if (i < 0) return;
      var k = kv.slice(0, i), v = kv.slice(i + 1);
      if (k === "a" || k === "b") {
        var bits = v.split(",");
        var lat = +bits[0], lon = +bits[1];
        if (isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
          var label = null;
          if (bits[2]) { try { label = decodeURIComponent(bits.slice(2).join(",")); } catch (err) { label = bits.slice(2).join(","); } }
          state[k] = { lon: lon, lat: lat, label: label };
          if (suggesters[k]) suggesters[k].setValue(label || fmtLonLat(state[k])); else inputs[k].value = label || fmtLonLat(state[k]);
          $("clear-" + k).hidden = false;
          any = true;
        }
      } else if (k === "avoid") {
        v.split(",").forEach(function (id) { var f = featureById.get(id); if (f && id !== ANTARCTICA) { state.avoid.set(id, f.properties.name); any = true; } });
      }
    });
    return any;
  }

  // ------------------------------------------------------------- the about note
  (function () {
    var box = $("about"), btn = $("about-btn");
    if (!box || !btn) return;
    function setOpen(open) {
      box.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
    }
    btn.addEventListener("click", function () { setOpen(!box.classList.contains("is-open")); });
    // Hover and focus show it through the stylesheet; the attribute follows.
    box.addEventListener("mouseenter", function () { if (canHover) btn.setAttribute("aria-expanded", "true"); });
    box.addEventListener("mouseleave", function () { if (!box.classList.contains("is-open") && !box.contains(document.activeElement)) btn.setAttribute("aria-expanded", "false"); });
    box.addEventListener("focusin", function () { btn.setAttribute("aria-expanded", "true"); });
    box.addEventListener("focusout", function (e) { if (!box.contains(e.relatedTarget) && !box.classList.contains("is-open")) btn.setAttribute("aria-expanded", "false"); });
    document.addEventListener("pointerdown", function (e) { if (box.classList.contains("is-open") && !box.contains(e.target)) setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || !(box.classList.contains("is-open") || box.contains(document.activeElement))) return;
      setOpen(false);
      if (box.contains(document.activeElement)) document.activeElement.blur();
    });
  })();

  // ------------------------------------------------------------- the sheet
  // On a phone the panel is a sheet at the bottom with three heights: open,
  // closed (the two fields and the answer), and swiped down out of the way
  // (the handle alone). The handle's tap moves it a step; a swipe moves it
  // the way it was swiped.
  var SHEET_HIDDEN = 0, SHEET_PEEK = 1, SHEET_OPEN = 2;
  var sheetGestureAt = 0;
  function sheetState() {
    return panel.classList.contains("is-open") ? SHEET_OPEN : panel.classList.contains("is-hidden") ? SHEET_HIDDEN : SHEET_PEEK;
  }
  function setSheetState(st) {
    st = Math.max(SHEET_HIDDEN, Math.min(SHEET_OPEN, st));
    var open = st === SHEET_OPEN;
    panel.classList.toggle("is-open", open);
    panel.classList.toggle("is-hidden", st === SHEET_HIDDEN);
    var controls = document.querySelector(".gc-controls");
    controls.classList.toggle("is-lifted", open);
    controls.classList.toggle("is-low", st === SHEET_HIDDEN);
    $("sheet-handle").setAttribute("aria-expanded", String(open));
    $("sheet-handle").setAttribute("aria-label", open ? "Show less" : "Show more");
    if (!open) panel.scrollTop = 0;
    // The globe takes the room the sheet leaves, once it has moved.
    setTimeout(function () { layout(); scheduleRender("full"); }, 300);
  }
  function setSheet(open) { setSheetState(open ? SHEET_OPEN : SHEET_PEEK); }
  $("sheet-handle").addEventListener("click", function () {
    if (performance.now() - sheetGestureAt < 500) return; // the end of a swipe, not a tap
    var st = sheetState();
    setSheetState(st === SHEET_OPEN ? SHEET_PEEK : st + 1);
  });
  // Typing in a field on a phone opens the sheet so the suggestions have room.
  [inputs.a, inputs.b, $("in-avoid")].forEach(function (inp) {
    inp.addEventListener("focus", function () {
      if (W <= 640 && !panel.classList.contains("is-open") && performance.now() - sheetGestureAt > 500) setSheet(true);
    });
  });

  var sheetDrag = null;
  panel.addEventListener("pointerdown", function (e) {
    if (W > 640 || e.pointerType === "mouse") return;
    sheetDrag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), engaged: false,
      onHandle: !!(e.target.closest && e.target.closest(".gc-sheet-handle, .gc-head")) };
  });
  panel.addEventListener("pointermove", function (e) {
    var d = sheetDrag;
    if (!d || e.pointerId !== d.id) return;
    var dy = e.clientY - d.y0, dx = e.clientX - d.x0;
    if (!d.engaged) {
      if (Math.abs(dy) < 10 || Math.abs(dy) < Math.abs(dx) * 1.2) return;
      // In the open sheet the body scrolls; a swipe counts from the handle
      // or the title, or downward from the top of the scroll.
      if (sheetState() === SHEET_OPEN && !d.onHandle && !(panel.scrollTop <= 0 && dy > 0)) { sheetDrag = null; return; }
      d.engaged = true;
      try { panel.setPointerCapture(e.pointerId); } catch (err) {}
      panel.classList.add("is-dragging");
      if (document.activeElement && panel.contains(document.activeElement)) document.activeElement.blur();
    }
    // Follows the finger downward; upward it snaps on release.
    var y = Math.max(0, dy);
    panel.style.transform = y ? "translateY(" + y + "px)" : "";
  });
  function endSheetDrag(e) {
    var d = sheetDrag;
    if (!d || e.pointerId !== d.id) return;
    sheetDrag = null;
    if (!d.engaged) return;
    sheetGestureAt = performance.now();
    var dy = e.clientY - d.y0, v = dy / Math.max(1, performance.now() - d.t0);
    panel.classList.remove("is-dragging");
    panel.style.transform = "";
    var st = sheetState();
    if (dy > 40 || v > 0.4) setSheetState(st - 1);
    else if (dy < -40 || v < -0.4) setSheetState(st + 1);
  }
  panel.addEventListener("pointerup", endSheetDrag);
  panel.addEventListener("pointercancel", endSheetDrag);

  // ------------------------------------------------------------- start
  function init(topo) {
    topology = topo;
    var obj = topo.objects.countries;
    features = topojson.feature(topo, obj).features;
    features.forEach(function (f, i) { f.id = String(f.id); f.index = i; featureById.set(f.id, f); });
    // Three levels of detail: all of it, a third of it, a tenth of it, by
    // Visvalingam's area-of-the-triangle weight on the sphere. The
    // simplification keeps the topology, so neighbours still share borders.
    // Which level is drawn depends on how big the globe is on the screen: a
    // globe a few hundred pixels across cannot show the full eighty thousand
    // vertices, and tracing them costs the frame.
    var pre = topojson.presimplify(topo, topojson.sphericalTriangleArea);
    var weights = [];
    pre.arcs.forEach(function (arc) { arc.forEach(function (pt) { if (isFinite(pt[2])) weights.push(pt[2]); }); });
    weights.sort(function (p, q) { return p - q; });
    var keep = function (fraction) { return weights[Math.max(0, Math.min(weights.length - 1, Math.floor((1 - fraction) * (weights.length - 1))))]; };
    var mid = topojson.simplify(pre, keep(0.33));
    var coarse = topojson.simplify(pre, keep(0.11));
    lod = { full: prepare(features), mid: prepare(topojson.feature(mid, mid.objects.countries).features), coarse: prepare(topojson.feature(coarse, coarse.objects.countries).features) };
    var inner = function (a, b) { return a !== b; };
    borders = { full: prepareLines(topojson.mesh(topo, obj, inner)), mid: prepareLines(topojson.mesh(mid, mid.objects.countries, inner)), coarse: prepareLines(topojson.mesh(coarse, coarse.objects.countries, inner)) };
    graticule = makeGraticule();
    countries = features.filter(function (f) { return f.id !== ANTARCTICA; }).map(function (f) {
      return { id: f.id, name: f.properties.name, key: fold(f.properties.name), aliases: [] };
    }).sort(function (x, y) { return x.name.localeCompare(y.name); });
    countrySuggester();
    applyAliases();

    try { var u = localStorage.getItem("gc-units"); if (UNITS[u]) { state.units = u; document.querySelectorAll(".gc-units button").forEach(function (x) { x.setAttribute("aria-pressed", String(x.dataset.unit === u)); }); } } catch (e) {}

    refreshPalette();
    layout();
    var fromUrl = readUrl();
    renderChips();
    updateHint();
    if (!canHover) $("avoid-hint").textContent = "Or press avoid, then tap countries";
    startWorker();
    loadCities();
    $("load").classList.add("is-gone");
    setTimeout(function () { $("load").remove(); }, 400);
    if (fromUrl) { requestRoute(); setTimeout(function () { fitRoute(true); }, 50); }
    scheduleRender("full");
    $("fit").hidden = !(state.a && state.b);
  }

  window.addEventListener("resize", function () { layout(); scheduleRender("full"); });
  new MutationObserver(function () { refreshPalette(); scheduleRender("full"); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { scheduleRender("full"); });
  window.addEventListener("hashchange", function () {
    readUrl(); renderChips(); updateHint(); fitPending = true; state.stale = true; requestRoute(); scheduleRender("full");
  });

  // A handle for the tests: where a place lands on the screen, and timings.
  window.__greatercircle = {
    project: function (lon, lat) { return visible([lon, lat]) ? projection([lon, lat]) : null; },
    state: state, view: view,
    timeRender: function (detail) { var t0 = performance.now(); render(detail || "full"); return performance.now() - t0; },
    counts: function () { var c = function (l) { var n = 0; l.forEach(function (f) { f.rings.forEach(function (r) { n += r.n; }); }); return n; }; return { full: c(lod.full), mid: c(lod.mid), coarse: c(lod.coarse) }; },
    profile: function (detail) {
      marks = []; render(detail || "full");
      var out = {}; for (var i = 1; i < marks.length; i++) out[marks[i][0]] = +(marks[i][1] - marks[i - 1][1]).toFixed(1);
      marks = null; return out;
    },
    ready: function () { return !!lod; },
    exp: { traceFeature: traceFeature, basis: basis, featuresFor: featuresFor, ctx: ctx }
  };

  refreshPalette();
  layout();
  fetch("data/countries-50m.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(init).catch(function (err) {
    $("load").textContent = "The map did not load (" + err.message + "), reload to try again";
    console.error(err);
  });
})();

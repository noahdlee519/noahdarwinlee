(function () {
  "use strict";

  var G = GreatCircle;
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $("globe");
  var ctx = canvas.getContext("2d");
  var satCanvas = $("sat"), sat = null, satTried = false, satOn = false, satLive = false;
  var panel = $("panel");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover)").matches;

  var state = {
    a: null, b: null,
    avoid: new Map(),
    regions: [],
    bufferKm: 50 * 1.609344,
    tab: null,
    plan: null,
    shownId: 0,
    hoverLeg: -1,
    pinLeg: -1,
    planAll: false,
    units: "km",
    result: null,
    pendingId: 0,
    avoidMode: false,
    hover: -1,
    ready: false
  };

  var topology = null, features = [], featureById = new Map(), lod = null, borders = null, graticule = null;
  var cities = [];
  var admin1 = null, admin1Asked = false;
  var lakes = null;
  var airports = null;
  var countries = [];
  var places = null, placesPromise = null;

  var projection = d3.geoOrthographic().clipAngle(90).precision(0.35);
  var path = d3.geoPath(projection, ctx);
  var view = { lon: -25, lat: 28, zoom: 1 };
  var dpr = 1, W = 0, H = 0, base = 0, cx = 0, cy = 0;
  var MIN_ZOOM = 0.6, MAX_ZOOM = 80;

  var panelRight = 0;
  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    satCanvas.width = canvas.width; satCanvas.height = canvas.height;
    detail.key = "";
    var phone = W <= 640;
    var pr = panel.getBoundingClientRect();
    panelRight = phone ? 0 : (pr.right > 0 ? pr.right - 12 : 452);
    var panelW = panelRight;
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

  var pal = {}, hatch = null;
  function refreshPalette() {
    var cs = getComputedStyle(document.documentElement);
    var get = function (name) { return cs.getPropertyValue(name).trim(); };
    ["ocean", "land", "land-hover", "border", "limb", "glow", "grat", "hatch", "route", "route-halo", "direct", "marker", "marker-ink", "city", "city-ring", "label", "label-halo", "region-fill", "border-sub", "faint", "hover-route", "buffer-edge"]
      .forEach(function (k) { pal[k] = get("--gc-" + k); });
    if (!pal["label-halo"]) pal["label-halo"] = pal.ocean;
    var c = document.createElement("canvas");
    c.width = c.height = 8;
    var hc = c.getContext("2d");
    hc.strokeStyle = pal.hatch; hc.lineWidth = 1.4; hc.lineCap = "square";
    hc.beginPath(); hc.moveTo(-2, 10); hc.lineTo(10, -2); hc.moveTo(-2, 2); hc.lineTo(2, -2); hc.moveTo(6, 10); hc.lineTo(10, 6); hc.stroke();
    hatch = ctx.createPattern(c, "repeat");
  }

  var renderQueued = false, interacting = 0, settleTimer = null;

  function scheduleRender(detail) {
    void detail;
    if (!renderQueued) { renderQueued = true; requestAnimationFrame(frame); }
  }

  function frame() {
    renderQueued = false;
    var t0 = performance.now();
    render("full");
    if (interacting > 0) noteCost(performance.now() - t0);
    else maybeDetail();
  }

  function moving() {
    interacting = 1;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(function () { interacting = 0; scheduleRender("full"); }, 140);
    scheduleRender("coarse");
  }

  var B = { ex: 0, ey: 0, ez: 0, nx: 0, ny: 0, nz: 0, cx: 0, cy: 0, cz: 0, r: 1 };
  function basis() {
    var lon = view.lon * Math.PI / 180, lat = view.lat * Math.PI / 180;
    var sl = Math.sin(lon), cl = Math.cos(lon), sp = Math.sin(lat), cp = Math.cos(lat);
    B.ex = -sl; B.ey = cl; B.ez = 0;
    B.nx = -sp * cl; B.ny = -sp * sl; B.nz = cp;
    B.cx = cp * cl; B.cy = cp * sl; B.cz = sp;
    B.r = projection.scale();
  }

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
      var n = line.length, X = new Float64Array(n), Y = new Float64Array(n), Z = new Float64Array(n), sx = 0, sy = 0, sz = 0;
      for (var k = 0; k < n; k++) { var v = G.toVec(line[k][0], line[k][1]); X[k] = v[0]; Y[k] = v[1]; Z[k] = v[2]; sx += v[0]; sy += v[1]; sz += v[2]; }
      var c = Math.hypot(sx, sy, sz) > 1e-9 ? G.normalize([sx, sy, sz]) : [X[0], Y[0], Z[0]];
      var minDot = 1;
      for (k = 0; k < n; k++) { var d = c[0] * X[k] + c[1] * Y[k] + c[2] * Z[k]; if (d < minDot) minDot = d; }
      return { x: X, y: Y, z: Z, n: n, cx: c[0], cy: c[1], cz: c[2], radius: Math.acos(Math.max(-1, Math.min(1, minDot))) };
    });
  }
  function makeGraticule() {
    var lines = [];
    for (var lat = -80; lat <= 80; lat += 10) { var pts = []; for (var lon = -180; lon <= 180; lon += 2) pts.push([lon, lat]); lines.push(pts); }
    for (var lo = -180; lo < 180; lo += 10) {
      var top = lo % 90 === 0 ? 90 : 80, mp = [];
      for (var la = -top; la <= top; la += 2) mp.push([lo, la]);
      lines.push(mp);
    }
    return prepareLines({ coordinates: lines });
  }

  function featureInFront(f) {
    var d = f.cx * B.cx + f.cy * B.cy + f.cz * B.cz;
    var theta = Math.acos(Math.max(-1, Math.min(1, d)));
    if (theta - f.radius > Math.PI / 2) return false;
    if (theta + f.radius < Math.PI / 2) {
      var px = cx + B.r * (f.cx * B.ex + f.cy * B.ey + f.cz * B.ez);
      var py = cy - B.r * (f.cx * B.nx + f.cy * B.ny + f.cz * B.nz);
      var rad = B.r * Math.sin(Math.min(f.radius, Math.PI / 2)) + 2;
      if (px + rad < 0 || px - rad > W || py + rad < 0 || py - rad > H) return false;
    }
    return true;
  }

  var EDGE = 24;
  function outcode(px, py) {
    return (px < -EDGE ? 1 : px > W + EDGE ? 2 : 0) | (py < -EDGE ? 4 : py > H + EDGE ? 8 : 0);
  }
  function traceRing(c, rg) {
    var X = rg.x, Y = rg.y, Z = rg.z, n = rg.n;
    var r = B.r, ex = B.ex, ey = B.ey, ez = B.ez, nx = B.nx, ny = B.ny, nz = B.nz, vx = B.cx, vy = B.cy, vz = B.cz;
    var any = false;
    for (var k = 0; k < n; k++) { if (X[k] * vx + Y[k] * vy + Z[k] * vz > 0) { any = true; break; } }
    if (!any) return false;
    var side = 0, lx = 0, ly = 0, held = false;
    for (k = 0; k < n; k++) {
      var x = X[k], y = Y[k], z = Z[k];
      var sx = x * ex + y * ey + z * ez, sy = x * nx + y * ny + z * nz, sz = x * vx + y * vy + z * vz;
      if (sz < 0) { var l = Math.hypot(sx, sy) || 1; sx /= l; sy /= l; }
      var px = cx + r * sx, py = cy - r * sy;
      if (k === 0) { c.moveTo(px, py); side = outcode(px, py); held = false; continue; }
      var oc = outcode(px, py);
      if (oc & side) { lx = px; ly = py; held = true; side = oc & side; continue; }
      if (held) { c.lineTo(lx, ly); held = false; }
      c.lineTo(px, py);
      side = oc;
    }
    if (held) c.lineTo(lx, ly);
    c.closePath();
    return true;
  }
  function traceFeature(c, f) {
    if (!featureInFront(f)) return;
    for (var i = 0; i < f.rings.length; i++) traceRing(c, f.rings[i]);
  }
  function traceLines(c, lines) {
    var r = B.r, ex = B.ex, ey = B.ey, ez = B.ez, nx = B.nx, ny = B.ny, nz = B.nz, vx = B.cx, vy = B.cy, vz = B.cz;
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i], X = L.x, Y = L.y, Z = L.z, n = L.n, pen = false, side = 0;
      if (L.radius < Math.PI / 2 && !featureInFront(L)) continue;
      for (var k = 0; k < n; k++) {
        var x = X[k], y = Y[k], z = Z[k];
        var sz = x * vx + y * vy + z * vz;
        if (sz < -0.002) { pen = false; continue; }
        var sx = x * ex + y * ey + z * ez, sy = x * nx + y * ny + z * nz;
        if (sz < 0) { var l = Math.hypot(sx, sy) || 1; sx /= l; sy /= l; }
        var px = cx + r * sx, py = cy - r * sy, oc = outcode(px, py);
        if (!pen) { c.moveTo(px, py); pen = true; side = oc; continue; }
        if (oc & side) { c.moveTo(px, py); side = oc & side; continue; }
        c.lineTo(px, py);
        side = oc;
      }
    }
  }

  var marks = null;
  function mark(name) { if (marks) marks.push([name, performance.now()]); }
  var slow = 0, slowFrames = 0;
  function levelFor(detail) {
    void detail;
    var px = projection.scale();
    var level = px < 900 ? 0 : px < 2600 ? 1 : 2;
    return Math.max(0, level - slow);
  }
  function noteCost(ms) {
    if (slow) return;
    if (ms > 28) { if (++slowFrames >= 6) slow = 1; } else slowFrames = 0;
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

    if (r * 1.07 < Math.hypot(W, H)) {
      var glow = ctx.createRadialGradient(cx, cy, r, cx, cy, r * 1.07);
      glow.addColorStop(0, pal.glow); glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.07, 0, 2 * Math.PI); ctx.fill();
    }
    var live = satOn && !!sat && sat.ready();
    if (live !== satLive) { satLive = live; document.documentElement.classList.toggle("gc-sat-on", live); refreshPalette(); }
    satCanvas.hidden = !live;
    if (live) renderSat();
    else {
      ctx.fillStyle = pal.ocean;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.fill();
    }
    mark("sea");

    ctx.beginPath(); traceLines(ctx, graticule);
    ctx.strokeStyle = pal.grat; ctx.lineWidth = 0.6; ctx.stroke();
    mark("graticule");

    ctx.fillStyle = pal.land;
    for (var i = 0; i < feats.length && !live; i++) {
      if (i === state.hover || state.avoid.has(feats[i].id)) continue;
      if (!featureInFront(feats[i])) continue;
      ctx.beginPath(); traceFeature(ctx, feats[i]); ctx.fill();
    }
    mark("land");

    if (state.hover >= 0 && !state.avoid.has(feats[state.hover].id)) {
      ctx.beginPath(); traceFeature(ctx, feats[state.hover]);
      ctx.fillStyle = pal["land-hover"]; ctx.fill();
    }
    if (state.bufferKm > 0 && state.avoid.size) {
      ctx.beginPath();
      state.avoid.forEach(function (name, id) {
        var b = countryBuffers.get(id + "|" + state.bufferKm);
        if (b) path(b);
      });
      ctx.fillStyle = pal["region-fill"]; ctx.fill();
      ctx.setLineDash([3, 4]); ctx.strokeStyle = pal["buffer-edge"]; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
    }
    state.avoid.forEach(function (name, id) {
      var f = featureById.get(id);
      if (!f) return;
      var fi = f.index;
      ctx.beginPath(); traceFeature(ctx, feats[fi]);
      ctx.fillStyle = fi === state.hover ? pal["land-hover"] : pal.land; ctx.fill();
      ctx.fillStyle = hatch; ctx.fill();
    });

    mark("avoid");
    if (lakes && !live) {
      ctx.fillStyle = pal.ocean;
      for (var li = 0; li < lakes.length; li++) {
        var lk = lakes[li];
        if (r * Math.sin(Math.min(lk.radius, Math.PI / 2)) < 0.7) continue;
        if (!featureInFront(lk)) continue;
        ctx.beginPath(); traceFeature(ctx, lk); ctx.fill();
      }
    }
    mark("lakes");
    var sub = subdivisionAlpha(r);
    if (sub > 0) {
      if (!admin1) loadAdmin1();
      else {
        ctx.beginPath(); traceLines(ctx, admin1);
        ctx.globalAlpha = sub; ctx.setLineDash([1.5, 3]); ctx.lineCap = "round";
        ctx.strokeStyle = pal["border-sub"]; ctx.lineWidth = 0.9; ctx.stroke();
        ctx.setLineDash([]); ctx.lineCap = "butt"; ctx.globalAlpha = 1;
      }
    }
    mark("admin1");
    ctx.beginPath(); traceLines(ctx, mesh);
    ctx.strokeStyle = pal.border; ctx.lineWidth = 0.7; ctx.stroke();
    mark("borders");

    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = pal.limb; ctx.lineWidth = 1; ctx.stroke();

    drawRegions();
    mark("regions");
    drawCities();
    mark("cities");
    drawRoutes();
    drawMarkers();
    drawDrawing();
    ctx.restore();
    mark("end");
  }

  var lineCache = { key: "", lines: null };
  function routeLines() {
    var res = state.result;
    if (!res || res.status !== "done") return null;
    var plan = state.plan && state.plan.status === "done" ? state.plan : null;
    var key = res.id + "|" + (plan ? "p" : "") + "|" + (res.cached ? 1 : 0);
    if (lineCache.key === key && lineCache.res === res) return lineCache.lines;
    var direct = [[state.a.lon, state.a.lat], [state.b.lon, state.b.lat]];
    if (res.antipodal && res.waypoints) direct = res.waypoints.slice(0, 2).concat(res.waypoints.length > 2 ? [res.waypoints[res.waypoints.length - 1]] : []);
    var lines = { direct: { type: "LineString", coordinates: direct } };
    if (detourOf(res)) lines.avoid = { type: "LineString", coordinates: res.waypoints };
    if (plan) {
      lines.plan = { type: "LineString", coordinates: plan.waypoints };
      lines.legs = plan.legs.map(function (l, i) { return { type: "LineString", coordinates: [plan.waypoints[i], plan.waypoints[i + 1]] }; });
    }
    lineCache = { key: key, res: res, lines: lines };
    return lines;
  }

  function drawRoutes() {
    var res = state.result;
    beaconScreen = [];
    if (!state.a || !state.b) return;
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    if ((drag && drag.marker) || state.stale || !res || res.status !== "done") {
      if ((drag && drag.marker) || state.stale) {
        ctx.beginPath(); path({ type: "LineString", coordinates: [[state.a.lon, state.a.lat], [state.b.lon, state.b.lat]] });
        ctx.strokeStyle = pal.route; ctx.lineWidth = 1.5; ctx.stroke();
      }
      return;
    }
    var lines = routeLines(), tab = currentTab();
    ["direct", "avoid", "plan"].forEach(function (k) {
      if (k === tab || !lines[k]) return;
      ctx.beginPath(); path(lines[k]);
      ctx.strokeStyle = pal["route-halo"]; ctx.lineWidth = 3.4; ctx.stroke();
      ctx.beginPath(); path(lines[k]);
      ctx.setLineDash([5, 6]); ctx.strokeStyle = pal.faint; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.setLineDash([]);
    });
    var sel = lines[tab] || lines.avoid || lines.direct;
    ctx.beginPath(); path(sel);
    ctx.strokeStyle = pal["route-halo"]; ctx.lineWidth = 6; ctx.stroke();
    ctx.beginPath(); path(sel);
    ctx.strokeStyle = pal.route; ctx.lineWidth = 2.4; ctx.stroke();
    var leg = state.pinLeg >= 0 ? state.pinLeg : state.hoverLeg;
    if (tab === "plan" && lines.legs && leg >= 0 && lines.legs[leg]) {
      ctx.beginPath(); path(lines.legs[leg]);
      ctx.strokeStyle = pal["hover-route"]; ctx.lineWidth = 5; ctx.stroke();
    }
    if (tab === "plan" && state.plan && state.plan.status === "done") {
      var labels = view.zoom > 2.2, pts = state.plan.points;
      ctx.font = "500 10px 'Familjen Grotesk', 'Helvetica Neue', Helvetica, Arial, sans-serif";
      ctx.textBaseline = "middle"; ctx.textAlign = "left";
      for (var i = 1; i + 1 < pts.length; i++) {
        var bc = pts[i], ll = [bc.lon, bc.lat];
        if (!visible(ll)) continue;
        var q = projection(ll);
        if (!q) continue;
        var on = leg === i - 1;
        beaconScreen.push({ b: bc, i: i - 1, x: q[0], y: q[1] });
        ctx.beginPath();
        var r = on ? 1.7 : 1;
        if (/^VOR/.test(bc.type)) { ctx.moveTo(q[0], q[1] - 4 * r); ctx.lineTo(q[0] + 3.6 * r, q[1] + 2.2 * r); ctx.lineTo(q[0] - 3.6 * r, q[1] + 2.2 * r); ctx.closePath(); }
        else ctx.arc(q[0], q[1], 2.8 * r, 0, 2 * Math.PI);
        ctx.fillStyle = on ? pal["hover-route"] : pal["route-halo"]; ctx.fill();
        ctx.strokeStyle = pal.route; ctx.lineWidth = 1.3; ctx.stroke();
        if (labels || on) {
          var text = on ? bc.ident + " | " + fmt(state.plan.legs[i - 1].km) : bc.ident;
          ctx.font = (on ? "600 13px" : "500 10px") + " 'Familjen Grotesk', 'Helvetica Neue', Helvetica, Arial, sans-serif";
          ctx.lineWidth = 3; ctx.strokeStyle = pal["label-halo"]; ctx.strokeText(text, q[0] + 8, q[1]);
          ctx.fillStyle = pal.label; ctx.fillText(text, q[0] + 8, q[1]);
        }
      }
    } else if (tab === "avoid" && view.zoom > 1.5 && res.waypoints) {
      for (var j = 1; j + 1 < res.waypoints.length; j++) {
        var p = projection(res.waypoints[j]);
        if (!p || !visible(res.waypoints[j])) continue;
        ctx.beginPath(); ctx.arc(p[0], p[1], 2.2, 0, 2 * Math.PI);
        ctx.fillStyle = pal.route; ctx.fill();
      }
    }
  }

  var beaconScreen = [];
  function beaconAt(x, y) {
    var best = null, bestD = 8;
    beaconScreen.forEach(function (s) { var d = Math.hypot(s.x - x, s.y - y); if (d < bestD) { bestD = d; best = s; } });
    return best;
  }

  var ADMIN1_FROM = 1400, ADMIN1_FULL = 2200;
  function subdivisionAlpha(r) { return Math.max(0, Math.min(1, (r - ADMIN1_FROM) / (ADMIN1_FULL - ADMIN1_FROM))); }
  function loadLakes() {
    fetch("data/lakes.json").then(function (r) { return r.json(); }).then(function (topo) {
      lakes = prepare(topojson.feature(topo, topo.objects.lakes).features);
      scheduleRender("full");
    }).catch(function (err) { console.warn("lakes", err); });
  }
  function loadAdmin1() {
    if (admin1Asked) return;
    admin1Asked = true;
    fetch("data/admin1.json").then(function (r) { return r.json(); }).then(function (topo) {
      admin1 = prepareLines(topojson.mesh(topo, topo.objects.admin1));
      scheduleRender("full");
    }).catch(function (err) { console.warn("admin1", err); admin1Asked = false; });
  }
  function cityDotRadius() { var r = B.r; return r < 900 ? 1.4 : r < 2600 ? 1.9 : 2.4; }
  function labelTierFor(r) { return r >= 2200 ? 4 : r >= 1300 ? 3 : r >= 850 ? 2 : r >= 560 ? 1 : 0; }
  var cityScreen = [];
  function drawCities() {
    cityScreen = [];
    if (!cities.length) return;
    var r = B.r, show = labelTierFor(r), dot = cityDotRadius();
    if (!show) return;
    var ex = B.ex, ey = B.ey, ez = B.ez, nx = B.nx, ny = B.ny, nz = B.nz, vx = B.cx, vy = B.cy, vz = B.cz;
    ctx.font = "400 11px 'Familjen Grotesk', 'Helvetica Neue', Helvetica, Arial, sans-serif";
    var placed = [], pad = 3;
    for (var i = 0; i < cities.length; i++) {
      var c = cities[i];
      if (c.tier > show) break;
      var sz = c.x * vx + c.y * vy + c.z * vz;
      if (sz <= 0.02) continue;
      var px = cx + r * (c.x * ex + c.y * ey + c.z * ez), py = cy - r * (c.x * nx + c.y * ny + c.z * nz);
      if (px < -20 || py < -20 || px > W + 20 || py > H + 20) continue;
      if (!c.w) c.w = ctx.measureText(c.name).width;
      var lx = px + dot + 4, ly = py - 7, lw = c.w + pad * 2, lh = 14;
      var clash = false;
      for (var k = 0; k < placed.length; k++) { var q = placed[k]; if (lx < q.x + q.w + 4 && lx + lw + 4 > q.x && ly < q.y + q.h + 1 && ly + lh + 1 > q.y) { clash = true; break; } }
      if (clash) continue;
      placed.push({ x: lx, y: ly, w: lw, h: lh });
      cityScreen.push({ c: c, x: px, y: py });
    }
    var nCities = cityScreen.length;
    var air = airportAlpha(r);
    if (air > 0) {
      if (!airports) loadPlaces();
      else for (i = 0; i < airports.length; i++) {
        c = airports[i];
        sz = c.x * vx + c.y * vy + c.z * vz;
        if (sz <= 0.02) continue;
        px = cx + r * (c.x * ex + c.y * ey + c.z * ez); py = cy - r * (c.x * nx + c.y * ny + c.z * nz);
        if (px < -20 || py < -20 || px > W + 20 || py > H + 20) continue;
        if (!c.label) c.label = c.iata;
        if (!c.w) c.w = ctx.measureText(c.label).width;
        lx = px + dot + 8; ly = py - 7; lw = c.w + pad * 2; lh = 14;
        clash = false;
        for (k = 0; k < placed.length; k++) { q = placed[k]; if (lx < q.x + q.w + 4 && lx + lw + 4 > q.x && ly < q.y + q.h + 1 && ly + lh + 1 > q.y) { clash = true; break; } }
        if (clash) continue;
        placed.push({ x: lx, y: ly, w: lw, h: lh });
        cityScreen.push({ c: c, x: px, y: py });
      }
    }
    ctx.fillStyle = pal.city;
    ctx.strokeStyle = pal["city-ring"]; ctx.lineWidth = 1.2;
    for (i = 0; i < nCities; i++) {
      var s = cityScreen[i];
      ctx.beginPath(); ctx.arc(s.x, s.y, dot, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    }
    ctx.textBaseline = "middle"; ctx.textAlign = "left";
    ctx.lineJoin = "round"; ctx.lineWidth = 3; ctx.strokeStyle = pal["label-halo"];
    for (i = 0; i < nCities; i++) {
      s = cityScreen[i];
      ctx.strokeText(s.c.name, s.x + dot + 4, s.y);
      ctx.fillStyle = pal.label; ctx.fillText(s.c.name, s.x + dot + 4, s.y);
    }
    if (cityScreen.length > nCities) {
      ctx.globalAlpha = air;
      ctx.lineJoin = "round"; ctx.lineWidth = 1; ctx.strokeStyle = pal["city-ring"]; ctx.fillStyle = pal.city;
      for (i = nCities; i < cityScreen.length; i++) {
        s = cityScreen[i];
        planePath(s.x, s.y, 5.5);
        ctx.fill(); ctx.stroke();
      }
      ctx.lineWidth = 3; ctx.strokeStyle = pal["label-halo"];
      for (i = nCities; i < cityScreen.length; i++) {
        s = cityScreen[i];
        ctx.strokeText(s.c.label, s.x + dot + 8, s.y);
        ctx.fillStyle = pal.label; ctx.fillText(s.c.label, s.x + dot + 8, s.y);
      }
      ctx.globalAlpha = 1;
    }
  }
  function planePath(x, y, h) {
    var u = h / 10;
    ctx.beginPath();
    ctx.moveTo(x, y - 10 * u);
    ctx.lineTo(x + 1.6 * u, y - 7 * u);
    ctx.lineTo(x + 1.6 * u, y - 2 * u);
    ctx.lineTo(x + 10 * u, y + 2.5 * u);
    ctx.lineTo(x + 10 * u, y + 4.5 * u);
    ctx.lineTo(x + 1.6 * u, y + 2.5 * u);
    ctx.lineTo(x + 1.2 * u, y + 7 * u);
    ctx.lineTo(x + 4 * u, y + 9 * u);
    ctx.lineTo(x + 4 * u, y + 10 * u);
    ctx.lineTo(x, y + 8.6 * u);
    ctx.lineTo(x - 4 * u, y + 10 * u);
    ctx.lineTo(x - 4 * u, y + 9 * u);
    ctx.lineTo(x - 1.2 * u, y + 7 * u);
    ctx.lineTo(x - 1.6 * u, y + 2.5 * u);
    ctx.lineTo(x - 10 * u, y + 4.5 * u);
    ctx.lineTo(x - 10 * u, y + 2.5 * u);
    ctx.lineTo(x - 1.6 * u, y - 2 * u);
    ctx.lineTo(x - 1.6 * u, y - 7 * u);
    ctx.closePath();
  }
  var AIRPORTS_FROM = 5500, AIRPORTS_FULL = 7500;
  function airportAlpha(r) { return Math.max(0, Math.min(1, (r - AIRPORTS_FROM) / (AIRPORTS_FULL - AIRPORTS_FROM))); }
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
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      var tm = ctx.measureText(m[0]);
      var inkL = tm.actualBoundingBoxLeft || 0, inkR = tm.actualBoundingBoxRight || tm.width;
      var inkA = tm.actualBoundingBoxAscent || 7, inkD = tm.actualBoundingBoxDescent || 0;
      ctx.fillText(m[0], p[0] + (inkL - inkR) / 2, p[1] + (inkA - inkD) / 2);
    });
  }

  var pick = document.createElement("canvas");
  var pctx = pick.getContext("2d", { willReadFrequently: true });
  var pickDirty = true;

  function renderPick() {
    basis();
    var feats = lod.full;
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.clearRect(0, 0, W, H);
    for (var i = 0; i < feats.length; i++) {
      var code = i + 1;
      pctx.fillStyle = "rgb(" + (code & 255) + "," + ((code >> 8) & 255) + ",0)";
      pctx.beginPath(); traceFeature(pctx, feats[i]); pctx.fill();
    }
    pickDirty = false;
  }

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

  var pointers = new Map();
  var drag = null;
  var pinch = null;
  var inertia = null;

  var focusByPointer = false;
  canvas.addEventListener("focus", function () { canvas.classList.toggle("show-ring", !focusByPointer); });
  canvas.addEventListener("blur", function () { canvas.classList.remove("show-ring"); });
  function degPerPx() { return 180 / (Math.PI * projection.scale()); }

  canvas.addEventListener("pointerdown", function (e) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { }
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
    var handle = handleAt(e.clientX, e.clientY);
    if (handle) { handleDrag = { region: selected, handle: handle }; return; }
    if (drawing && drawing.tool === "circle") {
      var c0 = projection.invert([e.clientX, e.clientY]);
      if (c0 && isFinite(c0[0]) && visible(c0)) { drawing.center = [c0[0], c0[1]]; drawing.radiusKm = 0; drawing.active = true; }
      return;
    }
    if (drawing && drawing.tool === "lasso") { drawing.screen = [[e.clientX, e.clientY]]; drawing.active = true; return; }
    var marker = markerAt(e.clientX, e.clientY, e.pointerType !== "mouse");
    drag = { x: e.clientX, y: e.clientY, lon: view.lon, lat: view.lat, moved: false, marker: marker,
      lastT: performance.now(), lastX: e.clientX, lastY: e.clientY, vx: 0, vy: 0, shift: e.shiftKey };
    canvas.classList.add("is-dragging");
    if (e.pointerType === "mouse") { focusByPointer = true; canvas.focus({ preventScroll: true }); focusByPointer = false; }
  });

  canvas.addEventListener("pointermove", function (e) {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (handleDrag) {
      var hl = projection.invert([e.clientX, e.clientY]);
      if (hl && isFinite(hl[0]) && visible(hl)) {
        var r = handleDrag.region, h = handleDrag.handle;
        if (h.what === "center") r.center = [hl[0], hl[1]];
        else if (h.what === "edge") r.radiusKm = Math.max(5, Math.round(G.sphereDistanceKm(r.center[0], r.center[1], hl[0], hl[1])));
        else r.points[h.what] = [hl[0], hl[1]];
        scheduleRender("coarse");
      }
      return;
    }
    if (drawing && drawing.active && drawing.tool === "circle") {
      var cl = projection.invert([e.clientX, e.clientY]);
      if (cl && isFinite(cl[0]) && visible(cl)) {
        drawing.radiusKm = G.sphereDistanceKm(drawing.center[0], drawing.center[1], cl[0], cl[1]);
        setStatus("Radius " + Math.round(drawing.radiusKm).toLocaleString() + " km");
        scheduleRender("coarse");
      }
      return;
    }
    if (drawing && drawing.active && drawing.tool === "lasso") {
      var last = drawing.screen[drawing.screen.length - 1];
      if (Math.hypot(e.clientX - last[0], e.clientY - last[1]) > 2) { drawing.screen.push([e.clientX, e.clientY]); scheduleRender("coarse"); }
      return;
    }
    if (drawing && drawing.tool === "polygon" && !drag) {
      var pl = projection.invert([e.clientX, e.clientY]);
      drawing.pointer = pl && isFinite(pl[0]) && visible(pl) ? [pl[0], pl[1]] : null;
      if (drawing.points.length) scheduleRender("coarse");
    }
    canvas.classList.toggle("is-over-handle", !!handleAt(e.clientX, e.clientY));
    if (pinch && pointers.size === 2) {
      var pts = Array.from(pointers.values());
      var nd = dist(pts[0], pts[1]);
      var mx = (pts[0].x + pts[1].x) / 2, my = (pts[0].y + pts[1].y) / 2;
      var s = degPerPx();
      view.lon -= (mx - pinch.mx) * s; view.lat += (my - pinch.my) * s;
      pinch.mx = mx; pinch.my = my;
      applyView();
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
    if (handleDrag) { handleDrag = null; if (e.type !== "pointercancel") regionsChanged(); return; }
    if (drawing && drawing.active && drawing.tool === "circle") { drawing.active = false; finishCircle(); return; }
    if (drawing && drawing.active && drawing.tool === "lasso") { drawing.active = false; finishLasso(drawing.screen); return; }
    if (pinch) { if (pointers.size < 2) pinch = null; if (pointers.size === 0) { interacting = 0; scheduleRender("full"); } return; }
    if (!drag) return;
    var d = drag; drag = null;
    canvas.classList.remove("is-dragging");
    if (!d.moved) {
      if (e.type !== "pointercancel") click(e.clientX, e.clientY, d.shift || e.shiftKey);
      return;
    }
    if (d.marker) { commitPoint(d.marker); return; }
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
    var decay = Math.pow(0.0025, dt / 1000);
    inertia.vx *= decay; inertia.vy *= decay;
    applyView();
    if (Math.hypot(inertia.vx, inertia.vy) < 0.004) { inertia = null; interacting = 0; scheduleRender("full"); return; }
    scheduleRender("coarse");
    requestAnimationFrame(inertiaStep);
  }
  function stopInertia() { if (inertia) { inertia = null; interacting = 0; } }

  function zoomAt(zoom, x, y, noSettle) {
    var before = projection.invert([x, y]);
    var wasVisible = before && isFinite(before[0]) && visible(before);
    view.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    applyView();
    if (wasVisible) {
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
  function renderSat() {
    sat.draw({ dpr: dpr, light: 0, detail: detail.shown && !detail.off, cx: cx, cy: cy, r: B.r, e: [B.ex, B.ey, B.ez], n: [B.nx, B.ny, B.nz], c: [B.cx, B.cy, B.cz] });
  }
  function setSatellite(on) {
    if (on && !sat && !satTried) {
      satTried = true;
      sat = window.GreatCircleSat ? window.GreatCircleSat(satCanvas) : null;
      if (sat) {
        sat.onRestore = function () { detail.key = ""; detail.rect = null; scheduleRender("full"); };
        var urls = [{ src: "data/earth-2048.webp", size: 2048 }];
        if (W > 640) urls.push({ src: "data/earth-4096.webp", size: 4096 });
        sat.load(urls, function () { detail.key = ""; scheduleRender("full"); });
      }
    }
    if (on && !sat) {
      on = false;
      $("sat-btn").disabled = true;
      $("sat-btn").title = "The satellite view needs WebGL, which this browser does not offer";
    }
    satOn = on;
    detail.key = "";
    $("sat-btn").setAttribute("aria-pressed", String(on));
    try { localStorage.setItem("gc-satellite", on ? "1" : "0"); } catch (e) {}
    scheduleRender("full");
  }
  $("sat-btn").addEventListener("click", function () { setSatellite(!satOn); });

  var DETAIL_URLS = ["BlueMarble_ShadedRelief_Bathymetry", "BlueMarble_NextGeneration", "BlueMarble_ShadedRelief"].map(function (layer) {
    return "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/" + layer + "/default/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg";
  });
  var DETAIL_MAX_Z = 8, DETAIL_MAX_TILES = 40;
  var detail = { key: "", rect: null, cache: new Map(), gen: 0, ok: 0, failed: 0, off: false, shown: false, put: new Set(), source: 0 };
  function wrap180(x) { return ((x + 180) % 360 + 360) % 360 - 180; }
  function mercY(lat) { var p = lat * Math.PI / 180; return (1 - Math.log(Math.tan(Math.PI / 4 + p / 2)) / Math.PI) / 2; }
  function lonLatAt(x, y) {
    if (Math.hypot(x - cx, y - cy) > projection.scale()) return null;
    var ll = projection.invert([x, y]);
    return ll && isFinite(ll[0]) && isFinite(ll[1]) ? ll : null;
  }
  function detailWanted() {
    if (!sat.detailFits()) return null;
    var S = projection.scale() * dpr;
    var latC = Math.max(-75, Math.min(75, view.lat)) * Math.PI / 180;
    var z = Math.floor(Math.log(2 * Math.PI * S * Math.cos(latC) / 256 / 1.15) / Math.LN2);
    if (z < 5) return null;
    z = Math.min(DETAIL_MAX_Z, z);
    var lons = [], lats = [], ref = view.lon;
    for (var i = 0; i <= 8; i++) for (var j = 0; j <= 6; j++) {
      var ll = lonLatAt(W * i / 8, H * j / 6);
      if (!ll) continue;
      lons.push(ref + wrap180(ll[0] - ref)); lats.push(ll[1]);
    }
    if (lons.length < 6) return null;
    var lo0 = Math.min.apply(null, lons), lo1 = Math.max.apply(null, lons);
    var la0 = Math.max(-85, Math.min.apply(null, lats)), la1 = Math.min(85, Math.max.apply(null, lats));
    if (la0 >= la1) return null;
    for (; z >= 5; z--) {
      var n = 1 << z;
      var x0 = Math.floor((lo0 + 180) / 360 * n), x1 = Math.floor((lo1 + 180) / 360 * n);
      var y0 = Math.max(0, Math.floor(mercY(la1) * n)), y1 = Math.min(n - 1, Math.floor(mercY(la0) * n));
      var nx = Math.min(n, x1 - x0 + 1), ny = y1 - y0 + 1;
      if (nx <= sat.slots && ny <= sat.slots && nx * ny <= DETAIL_MAX_TILES) return { z: z, x0: ((x0 % n) + n) % n, y0: y0, nx: nx, ny: ny };
    }
    return null;
  }
  function maybeDetail() {
    if (detail.off || !sat || !satOn || !sat.ready()) return;
    var key = [view.lon.toFixed(3), view.lat.toFixed(3), view.zoom.toFixed(4), W, H].join();
    if (key === detail.key) return;
    detail.key = key;
    var want = detailWanted();
    if (!want) {
      if (detail.rect) { detail.rect = null; detail.shown = false; sat.endDetail(); scheduleRender("full"); }
      return;
    }
    var r = detail.rect;
    if (!r || r.z !== want.z || r.x0 !== want.x0 || r.y0 !== want.y0 || r.nx !== want.nx || r.ny !== want.ny) {
      if (!sat.beginDetail(want)) { detail.off = true; return; }
      detail.rect = want; detail.gen++; detail.put = new Set(); detail.shown = true;
    }
    requestTiles();
  }
  function requestTiles() {
    var r = detail.rect, n = 1 << r.z, gen = detail.gen, changedAny = false;
    for (var j = 0; j < r.ny; j++) for (var i = 0; i < r.nx; i++) {
      var x = (r.x0 + i) % n, y = r.y0 + j, key = r.z + "/" + x + "/" + y;
      if (detail.put.has(key)) continue;
      var t = detail.cache.get(key);
      if (t && t.ok) {
        detail.cache.delete(key); detail.cache.set(key, t);
        if (sat.putTile(t.img, i, j)) { detail.put.add(key); changedAny = true; }
        continue;
      }
      if (t) continue;
      loadTile(r.z, x, y, key, gen);
    }
    trimTiles();
    if (changedAny) scheduleRender("full");
  }
  function loadTile(z, x, y, key, gen) {
    var t = { img: new Image(), ok: false };
    detail.cache.set(key, t);
    t.img.crossOrigin = "anonymous";
    t.img.decoding = "async";
    t.img.onload = function () {
      t.ok = true; detail.ok++;
      if (detail.gen !== gen || !detail.rect) return;
      var r = detail.rect, n = 1 << r.z;
      if (r.z !== z) return;
      var i = ((x - r.x0) % n + n) % n, j = y - r.y0;
      if (i < r.nx && j >= 0 && j < r.ny && !detail.put.has(key) && sat.putTile(t.img, i, j)) { detail.put.add(key); scheduleRender("full"); }
    };
    var source = detail.source;
    t.img.onerror = function () {
      t.failed = true;
      if (source !== detail.source) return;
      detail.failed++;
      if (detail.ok || detail.failed < 4 || detail.off) return;
      if (detail.source + 1 < DETAIL_URLS.length) {
        detail.source++; detail.failed = 0;
        detail.cache = new Map(); detail.put = new Set(); detail.key = "";
        if (detail.rect) { sat.beginDetail(detail.rect); detail.gen++; }
        scheduleRender("full");
        return;
      }
      detail.off = true; detail.shown = false;
      sat.endDetail();
      console.warn("satellite detail tiles are unavailable");
      scheduleRender("full");
    };
    t.img.src = DETAIL_URLS[source].replace("{z}", z).replace("{y}", y).replace("{x}", x);
  }
  function trimTiles() {
    if (detail.cache.size <= 160) return;
    var keep = new Set(detail.put);
    var it = detail.cache.keys();
    while (detail.cache.size > 140) {
      var nx = it.next();
      if (nx.done) break;
      var tv = detail.cache.get(nx.value);
      if (!keep.has(nx.value) && (tv.ok || tv.failed)) detail.cache.delete(nx.value);
    }
  }

  $("avoid-mode").addEventListener("click", function () {
    state.avoidMode = !state.avoidMode;
    $("avoid-mode").setAttribute("aria-pressed", String(state.avoidMode));
    canvas.classList.toggle("is-avoid-mode", state.avoidMode);
    setAvoidHint();
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
    if (drawing && drawing.tool === "polygon") {
      var first = drawing.points.length ? projection(drawing.points[0]) : null;
      if (first && drawing.points.length >= 3 && Math.hypot(first[0] - x, first[1] - y) < 10) { finishPolygon(); return; }
      drawing.points.push([ll[0], ll[1]]);
      setStatus(drawing.points.length < 3 ? "Click to add corners, click the first one again to close, Esc to cancel" : drawing.points.length + " corners, click the first one or press Enter to close");
      scheduleRender("full");
      return;
    }
    if (selected && !shift && !state.avoidMode) selectRegion(null);
    if (shift || state.avoidMode) {
      var idx = countryAt(x, y);
      if (idx >= 0) toggleAvoid(features[idx].id, features[idx].properties.name);
      return;
    }
    if (state.a && state.b && !drawing) {
      var cityP = cityAt(x, y), idxP = countryAt(x, y);
      if (cityP || idxP >= 0) { openPop(x, y, ll, cityP, idxP); return; }
    }
    var slot = !state.a ? "a" : !state.b ? "b" : "b";
    var city = cityAt(x, y);
    if (city) {
      setPoint(slot, { lon: city.lon, lat: city.lat, label: (city.airport ? city.name + " (" + city.iata + ")" : city.name) + ", " + ((places && places.countries[city.cc]) || city.cc) }, { quiet: true });
      commitPoint(slot);
      return;
    }
    var idx2 = countryAt(x, y);
    setPoint(slot, { lon: ll[0], lat: ll[1], label: null, country: idx2 >= 0 ? features[idx2].properties.name : null }, { quiet: true });
    commitPoint(slot);
  }

  var hoverRAF = 0;
  function hover(x, y, shift) {
    if (!canHover || hoverRAF) return;
    hoverRAF = requestAnimationFrame(function () {
      hoverRAF = 0;
      var here = lonLatAt(x, y);
      var dp = view.zoom < 6 ? 2 : view.zoom < 30 ? 3 : 4;
      tipAt = here ? Math.abs(here[1]).toFixed(dp) + "°" + (here[1] >= 0 ? "N" : "S") + " " + Math.abs(here[0]).toFixed(dp) + "°" + (here[0] >= 0 ? "E" : "W") : null;
      var m = markerAt(x, y);
      canvas.classList.toggle("is-over-marker", !!m);
      if (m) {
        setHover(-1);
        var pt = m === "a" ? state.a : state.b;
        showTip(x, y, m.toUpperCase(), pt.label || fmtLonLat(pt), "drag to move");
        return;
      }
      var beacon = beaconAt(x, y);
      if (beacon) {
        setHover(-1);
        var bl = state.plan && state.plan.legs && state.plan.legs[beacon.i];
        showTip(x, y, beacon.b.ident, beacon.b.name + " " + beacon.b.type, bl ? "leg " + (beacon.i + 1) + " | " + fmt(bl.km) : null);
        return;
      }
      var city = cityAt(x, y);
      canvas.classList.toggle("is-over-city", !!city && !(shift || state.avoidMode));
      if (city && !(shift || state.avoidMode)) {
        setHover(-1);
        showTip(x, y, city.airport ? city.name + " (" + city.iata + ")" : city.name, places && places.countries[city.cc] || city.cc, "click to set a point here");
        return;
      }
      var idx = countryAt(x, y);
      setHover(idx);
      canvas.classList.toggle("is-over-country", idx >= 0 && (shift || state.avoidMode));
      if (idx >= 0) {
        var f = features[idx], avoided = state.avoid.has(f.id);
        showTip(x, y, f.properties.name, null, avoided ? "avoided" + (shift || state.avoidMode || (state.a && state.b) ? " | click to allow" : "") : (shift || state.avoidMode || (state.a && state.b) ? "click to avoid" : "shift-click to avoid"));
      } else if (tipAt) showTip(x, y, null, null, null);
      else hideTip();
    });
  }
  function setHover(idx) {
    if (idx === state.hover) return;
    state.hover = idx;
    scheduleRender(interacting ? "coarse" : "full");
  }
  var tip = $("tip"), tipAt = null;
  function showTip(x, y, main, sub, note) {
    tip.innerHTML = "";
    if (main) { var b = document.createElement("b"); b.textContent = main; b.style.fontWeight = "400"; tip.appendChild(b); }
    if (sub) { var s = document.createElement("small"); s.textContent = sub; tip.appendChild(s); }
    if (note) { var n = document.createElement("small"); n.textContent = note; tip.appendChild(n); }
    if (tipAt) { var c = document.createElement("small"); c.className = "gc-tip-at"; c.textContent = tipAt; tip.appendChild(c); }
    tip.hidden = false;
    var w = tip.offsetWidth;
    tip.style.left = (x + 14 + w > W ? x - 14 - w - 14 : x) + "px";
    tip.style.top = y + "px";
  }
  function hideTip() { tip.hidden = true; }

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

  function fitRoute(always) {
    var pts = [];
    if (state.a) pts.push([state.a.lon, state.a.lat]);
    if (state.b) pts.push([state.b.lon, state.b.lat]);
    if (state.result && state.result.status === "done" && state.result.waypoints) pts = state.result.waypoints.slice();
    if (!pts.length) return;
    if (pts.length === 1) { flyTo(pts[0][0], pts[0][1]); return; }
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
    if (far > 1.35) zoom = 1;
    else {
      var free = Math.min(W - panelRight, H - (W <= 640 ? Math.min(H * 0.5, panel.getBoundingClientRect().height) + 70 : 60)) / 2 - 24;
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

  var inputs = { a: $("in-a"), b: $("in-b") };

  function fmtLonLat(p) {
    return Math.abs(p.lat).toFixed(2) + "°" + (p.lat >= 0 ? "N" : "S") + " " + Math.abs(p.lon).toFixed(2) + "°" + (p.lon >= 0 ? "E" : "W");
  }

  function inputText(label) { return label.replace(/\s*\(([A-Z0-9]{3,4})\)/, ""); }
  function setPoint(slot, pt, opts) {
    opts = opts || {};
    state[slot] = pt;
    var text = pt ? (pt.label ? inputText(pt.label) : (pt.country ? fmtLonLat(pt) + " | " + pt.country : fmtLonLat(pt))) : "";
    if (suggesters[slot]) suggesters[slot].setValue(text); else inputs[slot].value = text;
    $("clear-" + slot).hidden = !pt;
    if (!opts.quiet) { commitPoint(slot); }
    else scheduleRender("coarse");
  }

  var fitPending = false;
  function commitPoint(slot) {
    var pt = state[slot];
    fitPending = true;
    state.stale = true;
    if (pt && !pt.label) { var text = fmtLonLat(pt) + (pt.country ? " | " + pt.country : ""); if (suggesters[slot]) suggesters[slot].setValue(text); else inputs[slot].value = text; }
    updateHint();
    requestRoute();
    writeUrl();
    scheduleRender("full");
  }

  var pop = $("pop"), popActions = [];
  function openPop(x, y, ll, city, idx) {
    var f = idx >= 0 ? features[idx] : null;
    var cityLabel = city ? (city.airport ? city.name + " (" + city.iata + ")" : city.name) : null;
    $("pop-title").textContent = cityLabel || f.properties.name;
    popActions = [];
    if (f && f.id !== ANTARCTICA) {
      var av = state.avoid.has(f.id);
      popActions.push({ label: (av ? "Allow " : "Avoid ") + f.properties.name, fn: function () { toggleAvoid(f.id, f.properties.name); } });
    }
    popActions.push({ label: "Move B here", fn: function () {
      if (city) setPoint("b", { lon: city.lon, lat: city.lat, label: cityLabel + ", " + ((places && places.countries[city.cc]) || city.cc) });
      else setPoint("b", { lon: ll[0], lat: ll[1], label: null, country: f ? f.properties.name : null });
    } });
    var box = $("pop-actions");
    box.innerHTML = "";
    popActions.forEach(function (a, i) {
      var b = document.createElement("button"); b.type = "button"; b.className = "gc-btn " + (i ? "gc-btn-quiet" : "gc-btn-primary"); b.dataset.action = i; b.textContent = a.label;
      box.appendChild(b);
    });
    hideTip();
    pop.hidden = false;
    var w = pop.offsetWidth, hh = pop.offsetHeight;
    pop.style.left = Math.max(8, Math.min(W - w - 8, x + 12)) + "px";
    pop.style.top = Math.max(8, Math.min(H - hh - 8, y + 12)) + "px";
    box.firstChild.focus({ preventScroll: true });
  }
  function closePop(back) {
    if (pop.hidden) return;
    pop.hidden = true;
    if (back) canvas.focus({ preventScroll: true });
  }
  pop.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("button[data-action]");
    if (!b) return;
    var a = popActions[+b.dataset.action];
    closePop(true);
    if (a) a.fn();
  });
  document.addEventListener("pointerdown", function (e) { if (!pop.hidden && !pop.contains(e.target)) closePop(false); }, true);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !pop.hidden) { e.preventDefault(); closePop(true); } });
  pop.addEventListener("focusout", function (e) { if (e.relatedTarget && !pop.contains(e.relatedTarget)) closePop(false); });
  canvas.addEventListener("wheel", function () { closePop(false); }, { passive: true });

  function setAvoidHint() {
    var h = $("avoid-hint");
    if (state.avoidMode) h.textContent = (canHover ? "Click" : "Tap") + " a country to add it, again to take it off";
    else if (canHover) h.innerHTML = 'Or click a country on the globe once A and B are set<span class="gc-draw-hint">, or draw a region of your own with the pen</span>';
    else h.textContent = "Or tap a country on the globe once A and B are set";
  }
  function updateHint() {
    var h = $("hint"), tap = canHover ? "click" : "tap";
    if (!state.a && !state.b) h.textContent = "Or " + tap + " two points on the globe, or type lat, lon";
    else if (!state.b) h.textContent = "Now pick where you are going: type it, or " + tap + " the globe";
    else h.textContent = "Drag A or B to move them, or " + tap + " a country to avoid it";
  }

  $("clear-a").addEventListener("click", function () { setPoint("a", null); inputs.a.focus(); });
  $("clear-b").addEventListener("click", function () { setPoint("b", null); inputs.b.focus(); });
  $("swap").addEventListener("click", function () {
    var a = state.a, b = state.b;
    state.a = b; state.b = a;
    setPoint("a", state.a, { quiet: true }); setPoint("b", state.b, { quiet: true });
    commitPoint("a");
  });

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
  var INVERT_ICON_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.5" y="3.5" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="5" fill="currentColor"/></svg>';
  var INVERT_ICON_ON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" d="M2.6 2.6h18.8v18.8H2.6z M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10z"/></svg>';
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
    state.regions.forEach(function (r) {
      var li = document.createElement("li");
      li.className = "gc-chip gc-chip-region" + (r === selected ? " is-selected" : "") + (r.inverted ? " is-inverted" : "");
      li.dataset.region = r.id;
      li.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l3.5-.8L19 7.7a2 2 0 0 0-2.8-2.8L4.8 16.4z"/></svg>';
      var name = document.createElement("span");
      name.className = "gc-chip-name"; name.textContent = r.name; name.title = "Click to show its corners, double-click to rename";
      name.addEventListener("click", function () { selectRegion(selected === r ? null : r); });
      name.addEventListener("dblclick", function () {
        var inp = document.createElement("input"); inp.type = "text"; inp.value = r.name; inp.setAttribute("aria-label", "Name of the region");
        var done = function () { var v = inp.value.trim(); if (v) r.name = v; renderChips(); writeUrl(); };
        inp.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); inp.blur(); } if (ev.key === "Escape") { inp.value = r.name; inp.blur(); } });
        inp.addEventListener("blur", done);
        li.replaceChild(inp, name); inp.focus(); inp.select();
      });
      if (r.inverted) { var pre = document.createElement("span"); pre.className = "gc-chip-pre"; pre.textContent = "outside"; li.appendChild(pre); }
      li.appendChild(name);
      var inv = document.createElement("button");
      inv.type = "button"; inv.className = "gc-chip-invert";
      inv.setAttribute("aria-pressed", String(!!r.inverted));
      inv.setAttribute("aria-label", "Avoid everywhere outside " + r.name + " instead");
      inv.title = r.inverted ? "Avoiding everywhere outside it: click to avoid the region itself" : "Invert: avoid everywhere outside it instead";
      inv.innerHTML = r.inverted ? INVERT_ICON_ON : INVERT_ICON_OFF;
      inv.addEventListener("click", function () { r.inverted = !r.inverted; regionsChanged(); });
      li.appendChild(inv);
      var x = document.createElement("button");
      x.type = "button"; x.setAttribute("aria-label", "Remove " + r.name); x.textContent = "×";
      x.addEventListener("click", function () { removeRegion(r); });
      li.appendChild(x);
      ul.appendChild(li);
    });
    renderOptionChips();
    if (state.avoid.size + state.regions.length > 1) {
      var li2 = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button"; b.className = "gc-linkbtn"; b.textContent = "clear all"; b.style.fontSize = "13px";
      b.addEventListener("click", function () { state.avoid.clear(); state.regions = []; selected = null; avoidChanged(); });
      li2.appendChild(b); ul.appendChild(li2);
    }
  }

  function fold(s) {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }

  function parseLatLon(q) {
    var s = q.split(/[|·]/)[0].trim().toUpperCase();
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
      airports = rows.filter(function (r) { return r.kind === 2 && r.iata; }).map(function (r) {
        var v = G.toVec(r.lon, r.lat);
        return { name: r.name, cc: r.cc, lon: r.lon, lat: r.lat, iata: r.iata, big: r.pop === 2, airport: true, x: v[0], y: v[1], z: v[2] };
      });
      airports.sort(function (a, b) { return (b.big ? 1 : 0) - (a.big ? 1 : 0); });
      scheduleRender("full");
      return places;
    }).catch(function (err) {
      console.warn("places list", err);
      placesFailed = true;
      places = { rows: [], countries: {} };
      return places;
    });
    return placesPromise;
  }

  function applyAliases() {
    if (!places || !places.aliases || !countries.length) return;
    countries.forEach(function (c) { var a = places.aliases.get(c.id); if (a) c.aliases = a; });
  }

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
      place();
    }
    function place() {
      if (!open) return;
      var floating = window.innerWidth > 640;
      list.classList.toggle("is-floating", floating);
      if (!floating) {
        list.style.left = list.style.top = list.style.bottom = list.style.width = "";
        var pr = panel.getBoundingClientRect(), line = list.parentElement.getBoundingClientRect();
        var want = Math.max(120, Math.min(290, pr.height - line.height - 28));
        list.style.maxHeight = want + "px";
        var need = line.bottom + want + 12 - pr.bottom;
        if (need > 1) panel.scrollTop += need;
        return;
      }
      var a = list.parentElement.getBoundingClientRect(), vh = window.innerHeight;
      var below = vh - a.bottom - 16, above = a.top - 16;
      var up = below < 200 && above > below;
      list.style.left = a.left + "px";
      list.style.width = a.width + "px";
      if (up) { list.style.top = "auto"; list.style.bottom = (vh - a.top) + "px"; }
      else { list.style.top = a.bottom + "px"; list.style.bottom = "auto"; }
      list.style.maxHeight = Math.max(120, Math.min(360, up ? above : below)) + "px";
    }
    panel.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    panel.addEventListener("transitionend", function (e) { if (e.target === panel) place(); });
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
        else if (open || searching) { enterPending = true; e.preventDefault(); }
        else if (opts.enter) { opts.enter(input.value); e.preventDefault(); }
      }
      else if (e.key === "Escape") { if (!list.hidden) e.preventDefault(); close(); }
    });
    function setValue(v) { input.value = v; lastQuery = v; }
    return { close: close, refresh: update, setValue: setValue };
  }

  var suggesters = {};
  function pointSuggester(slot) {
    var input = inputs[slot];
    suggesters[slot] = suggester(input, $("sug-" + slot), {
      load: loadPlaces,
      changed: function () { },
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

  var regionSeq = 0;
  var drawing = null;
  var selected = null;
  var handleDrag = null;
  var drawStatus = $("draw-status");

  function destination(lon, lat, bearingDeg, km) {
    var d = km / G.EARTH_RADIUS_KM, b = bearingDeg * Math.PI / 180;
    var p1 = lat * Math.PI / 180, l1 = lon * Math.PI / 180;
    var p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
    var l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
    return [((l2 * 180 / Math.PI + 540) % 360) - 180, p2 * 180 / Math.PI];
  }
  function regionRing(r) {
    var pts;
    if (r.kind === "circle") {
      pts = [];
      for (var i = 0; i < 72; i++) pts.push(destination(r.center[0], r.center[1], i * 5, r.radiusKm));
    } else pts = r.points;
    return smallSide(pts);
  }
  function smallSide(pts) {
    return d3.geoArea({ type: "Polygon", coordinates: [pts.concat([pts[0]])] }) > 2 * Math.PI ? pts.slice().reverse() : pts;
  }
  function regionPolygon(r) {
    var ring = regionRing(r).slice();
    if (r.inverted) ring.reverse();
    ring.push(ring[0]);
    return { type: "Polygon", coordinates: [ring] };
  }
  var bufferCache = new Map();
  function bufferShape(r) {
    if (!(state.bufferKm > 0)) return null;
    var ring = regionRing(r);
    var key = state.bufferKm.toFixed(2) + "|" + ring.map(function (p) { return p[0].toFixed(4) + "," + p[1].toFixed(4); }).join(";");
    var hit = bufferCache.get(r.id);
    if (hit && hit.key === key) return hit.shape;
    var shape = { type: "MultiPolygon", coordinates: G.bufferRings(ring, state.bufferKm).map(function (rg) { return [rg]; }) };
    bufferCache.set(r.id, { key: key, shape: shape });
    return shape;
  }

  function ringProblem(ring) {
    if (ring.length < 3) return "A region needs at least three corners";
    var V = ring.map(function (p) { return G.toVec(p[0], p[1]); });
    var n = V.length;
    for (var i = 0; i < n; i++) {
      for (var j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        if (arcsCross(V[i], V[(i + 1) % n], V[j], V[(j + 1) % n])) return "The outline crosses itself";
      }
    }
    var area = Math.abs(G.sphericalSignedArea(V));
    if (area > Math.PI) return "That is more than a quarter of the globe";
    if (area < 1e-9) return "The region is too small to matter";
    return null;
  }
  function arcsCross(a, b, c, d) {
    var n1 = cross3(a, b), n2 = cross3(c, d);
    var sc = dot3(c, n1), sd = dot3(d, n1), sa = dot3(a, n2), sb = dot3(b, n2);
    if ((sc > 0) === (sd > 0) || (sa > 0) === (sb > 0)) return false;
    var p = cross3(n1, n2);
    var onArc = (a[0] + b[0]) * p[0] + (a[1] + b[1]) * p[1] + (a[2] + b[2]) * p[2];
    var onEdge = (c[0] + d[0]) * p[0] + (c[1] + d[1]) * p[1] + (c[2] + d[2]) * p[2];
    return (onArc > 0) === (onEdge > 0);
  }
  function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

  function addRegion(r) {
    r.id = "r" + (++regionSeq);
    if (!r.name) r.name = "Region " + regionSeq;
    state.regions.push(r);
    regionsChanged();
  }
  function removeRegion(r) {
    state.regions = state.regions.filter(function (x) { return x !== r; });
    if (selected === r) selected = null;
    regionsChanged();
  }
  function regionsChanged() {
    renderChips();
    requestRoute();
    writeUrl();
    scheduleRender("full");
  }
  function selectRegion(r) {
    selected = r;
    document.querySelectorAll(".gc-chip-region").forEach(function (li) { li.classList.toggle("is-selected", !!r && li.dataset.region === r.id); });
    scheduleRender("full");
  }
  function regionById(id) { for (var i = 0; i < state.regions.length; i++) if (state.regions[i].id === id) return state.regions[i]; return null; }

  function setTool(tool) {
    if (drawing && drawing.tool === tool) tool = null;
    cancelDrawing();
    if (!tool) { setStatus(null); return; }
    drawing = { tool: tool, points: [], pointer: null, center: null, radiusKm: 0, active: false };
    selectRegion(null);
    canvas.classList.add("is-drawing");
    document.querySelectorAll(".gc-tool").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.tool === tool)); });
    setStatus(tool === "polygon" ? "Click to add corners, click the first one again to close, Esc to cancel"
      : tool === "circle" ? "Press at the centre and drag out the radius, Esc to cancel"
      : "Draw round the area with the mouse held down, Esc to cancel");
    scheduleRender("full");
  }
  function cancelDrawing() {
    drawing = null;
    canvas.classList.remove("is-drawing");
    document.querySelectorAll(".gc-tool").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
    setStatus(null);
    scheduleRender("full");
  }
  var statusTimer = 0;
  function setStatus(text, brief) {
    clearTimeout(statusTimer);
    if (!text) { drawStatus.hidden = true; return; }
    drawStatus.textContent = text;
    drawStatus.hidden = false;
    if (brief) statusTimer = setTimeout(function () { drawStatus.hidden = true; }, 2200);
  }
  function finishPolygon() {
    var pts = drawing.points.slice();
    var why = ringProblem(pts);
    if (why) { setStatus(why, true); return false; }
    addRegion({ kind: "polygon", points: pts });
    cancelDrawing();
    return true;
  }
  function finishLasso(screenPts) {
    var kept = simplify(screenPts, 2.5);
    if (kept.length > 1 && Math.hypot(kept[0][0] - kept[kept.length - 1][0], kept[0][1] - kept[kept.length - 1][1]) < 6) kept.pop();
    var pts = [];
    kept.forEach(function (q) { var ll = projection.invert(q); if (ll && isFinite(ll[0]) && visible(ll)) pts.push([ll[0], ll[1]]); });
    var why = ringProblem(pts);
    if (why) { setStatus(why, true); cancelDrawing(); return; }
    addRegion({ kind: "polygon", points: pts });
    cancelDrawing();
  }
  function finishCircle() {
    var d = drawing;
    if (!d.center || d.radiusKm < 5) { setStatus("Drag further out for a circle", true); d.active = false; d.center = null; scheduleRender("full"); return; }
    if (d.radiusKm > 9000) { setStatus("That is more than a quarter of the globe", true); d.active = false; d.center = null; scheduleRender("full"); return; }
    addRegion({ kind: "circle", center: d.center, radiusKm: Math.round(d.radiusKm) });
    cancelDrawing();
  }
  function simplify(pts, tol) {
    if (pts.length < 3) return pts;
    var keep = new Uint8Array(pts.length); keep[0] = 1; keep[pts.length - 1] = 1;
    var far = 0, farD = -1;
    for (var k = 1; k < pts.length; k++) { var dk = Math.hypot(pts[k][0] - pts[0][0], pts[k][1] - pts[0][1]); if (dk > farD) { farD = dk; far = k; } }
    keep[far] = 1;
    var stack = far < pts.length - 1 ? [[0, far], [far, pts.length - 1]] : [[0, far]];
    while (stack.length) {
      var seg = stack.pop(), a = seg[0], b = seg[1], best = -1, bestD = tol;
      var ax = pts[a][0], ay = pts[a][1], bx = pts[b][0], by = pts[b][1], L = Math.hypot(bx - ax, by - ay) || 1;
      for (var i = a + 1; i < b; i++) {
        var d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L;
        if (d > bestD) { bestD = d; best = i; }
      }
      if (best >= 0) { keep[best] = 1; stack.push([a, best]); stack.push([best, b]); }
    }
    var out = [];
    for (i = 0; i < pts.length; i++) if (keep[i]) out.push(pts[i]);
    return out;
  }

  function drawRegions() {
    if (!state.regions.length) return;
    ctx.lineJoin = "round";
    state.regions.forEach(function (r) {
      var b = bufferShape(r);
      if (!b) return;
      ctx.beginPath(); path(b);
      ctx.fillStyle = pal["region-fill"]; ctx.fill();
    });
    state.regions.forEach(function (r) {
      var poly = regionPolygon(r);
      ctx.beginPath(); path(poly);
      ctx.fillStyle = pal["region-fill"]; ctx.fill();
      ctx.fillStyle = hatch; ctx.fill();
      ctx.strokeStyle = pal.route; ctx.lineWidth = r === selected ? 2 : 1.2; ctx.stroke();
    });
    if (selected) {
      handlesOf(selected).forEach(function (h) {
        ctx.beginPath(); ctx.arc(h.x, h.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = pal.marker; ctx.fill(); ctx.strokeStyle = pal["marker-ink"]; ctx.lineWidth = 1.2; ctx.stroke();
      });
    }
  }
  function handlesOf(r) {
    var out = [];
    if (r.kind === "circle") {
      var c = projection(r.center); if (c && visible(r.center)) out.push({ x: c[0], y: c[1], what: "center" });
      var e = destination(r.center[0], r.center[1], 90, r.radiusKm);
      var ep = projection(e); if (ep && visible(e)) out.push({ x: ep[0], y: ep[1], what: "edge" });
    } else {
      r.points.forEach(function (p, i) { var q = projection(p); if (q && visible(p)) out.push({ x: q[0], y: q[1], what: i }); });
    }
    return out;
  }
  function handleAt(x, y) {
    if (!selected) return null;
    var hs = handlesOf(selected);
    for (var i = 0; i < hs.length; i++) if (Math.hypot(hs[i].x - x, hs[i].y - y) < 9) return hs[i];
    return null;
  }
  function drawDrawing() {
    var d = drawing;
    if (!d) return;
    ctx.setLineDash([5, 4]); ctx.strokeStyle = pal.route; ctx.lineWidth = 1.5; ctx.lineJoin = "round";
    if (d.tool === "polygon" && d.points.length) {
      var line = d.points.slice();
      if (d.pointer) line.push(d.pointer);
      ctx.beginPath(); path({ type: "LineString", coordinates: line }); ctx.stroke();
      if (d.points.length > 2) { ctx.globalAlpha = 0.5; ctx.beginPath(); path({ type: "LineString", coordinates: [line[line.length - 1], d.points[0]] }); ctx.stroke(); ctx.globalAlpha = 1; }
      ctx.setLineDash([]);
      d.points.forEach(function (p, i) {
        var q = projection(p); if (!q || !visible(p)) return;
        ctx.beginPath(); ctx.arc(q[0], q[1], i === 0 ? 6 : 4, 0, 2 * Math.PI);
        ctx.fillStyle = pal.marker; ctx.fill();
        if (i === 0) { ctx.strokeStyle = pal["marker-ink"]; ctx.lineWidth = 1.5; ctx.stroke(); }
      });
    } else if (d.tool === "circle" && d.center && d.radiusKm > 0) {
      ctx.beginPath(); path(regionPolygon({ kind: "circle", center: d.center, radiusKm: d.radiusKm })); ctx.stroke();
      ctx.setLineDash([]);
      var c = projection(d.center);
      if (c) { ctx.beginPath(); ctx.arc(c[0], c[1], 3, 0, 2 * Math.PI); ctx.fillStyle = pal.marker; ctx.fill(); }
    } else if (d.tool === "lasso" && d.screen && d.screen.length > 1) {
      ctx.beginPath(); ctx.moveTo(d.screen[0][0], d.screen[0][1]);
      for (var i = 1; i < d.screen.length; i++) ctx.lineTo(d.screen[i][0], d.screen[i][1]);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  $("draw-btn").addEventListener("click", function () {
    var tools = $("draw-tools");
    var open = tools.hidden;
    tools.hidden = !open;
    $("draw-btn").setAttribute("aria-expanded", String(open));
    $("draw-btn").classList.toggle("is-on", open);
    if (!open) { cancelDrawing(); selectRegion(null); }
  });
  document.querySelectorAll(".gc-tool").forEach(function (b) {
    b.addEventListener("click", function () { setTool(b.dataset.tool); });
  });
  canvas.addEventListener("dblclick", function (e) {
    if (drawing && drawing.tool === "polygon" && drawing.points.length >= 3) { e.preventDefault(); finishPolygon(); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (e.key === "Escape") {
      if (drawing) { cancelDrawing(); e.preventDefault(); }
      else if (selected) selectRegion(null);
    } else if (e.key === "Enter" && drawing && drawing.tool === "polygon") { finishPolygon(); e.preventDefault(); }
    else if ((e.key === "Delete" || e.key === "Backspace") && selected && !drawing) { removeRegion(selected); e.preventDefault(); }
  });

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
      if (state.pendingId) { state.pendingId = 0; clearTimeout(busyTimer); state.busy = false; state.result = { status: "error", directKm: 0 }; renderPanel(); }
    };
    worker.onmessage = onWorkerMessage;
    worker.postMessage({ type: "init", topology: topology });
  }

  var shimStarted = false;
  function startShim() {
    if (shimStarted) return;
    shimStarted = true;
    var load = function (src, then) {
      var sc = document.createElement("script");
      sc.src = src;
      sc.onload = then;
      sc.onerror = function () { state.result = { status: "error", directKm: 0 }; renderPanel(); };
      document.head.appendChild(sc);
    };
    load("vendor/clipper.min.js", function () {
      load("worker.js", function () {
        worker = self.GreatCircleRouter;
        worker.onmessage = onWorkerMessage;
        worker.postMessage({ type: "init", topology: topology });
      });
    });
  }

  function onWorkerMessage(e) {
    var m = e.data;
    if (m.type === "ready") {
      state.ready = true; window.__greatercircle.readyMs = m.ms;
      requestBuffers();
      if (queued) { queued = false; requestRoute(); }
      var prefetch = function () { setTimeout(loadPlaces, 800); };
      if (window.requestIdleCallback) requestIdleCallback(prefetch); else prefetch();
      return;
    }
    if (m.type === "buffers") {
      countryBuffers.set(m.id + "|" + m.km, { type: "MultiPolygon", coordinates: m.coordinates });
      if (m.km === state.bufferKm && state.avoid.has(m.id)) scheduleRender("full");
      return;
    }
    if (m.type === "plan" || m.type === "planProgress") {
      if (m.id !== state.shownId) return;
      if (m.type === "planProgress") { if (currentTab() === "plan") renderPanel(); return; }
      state.plan = m;
      lineCache.key = "";
      renderPanel();
      if (currentTab() === "plan") announce();
      scheduleRender("full");
      if (currentTab() === "plan" && fitPending === "plan") { fitPending = false; fitRoute(false); }
      return;
    }
    if (m.id !== state.pendingId) return;
    if (m.type === "progress") { state.progress = m.expanded; renderBusy(); return; }
    if (m.type === "result") {
      state.pendingId = 0;
      clearTimeout(busyTimer);
      state.busy = false;
      state.stale = false;
      state.shownId = m.id;
      state.plan = m.status === "done" && !m.antipodal ? { status: "pending" } : null;
      state.hoverLeg = -1; state.pinLeg = -1; state.planAll = false;
      beaconScreen = [];
      lineCache.key = "";
      if (m.status === "error") { state.result = m; renderPanel(); scheduleRender("full"); fitPending = false; return; }
      state.result = m;
      renderPanel();
      announce();
      scheduleRender("full");
      if (m.status === "done" && fitPending && !drag && !pinch && !inertia) fitRoute(false);
      fitPending = false;
    }
  }

  var countryBuffers = new Map(), buffersAsked = new Set();
  function requestBuffers() {
    if (!state.ready || !worker || !(state.bufferKm > 0)) return;
    var km = state.bufferKm, ids = [];
    state.avoid.forEach(function (name, id) {
      var key = id + "|" + km;
      if (buffersAsked.has(key)) return;
      buffersAsked.add(key);
      ids.push(id);
    });
    if (ids.length) worker.postMessage({ type: "buffers", km: km, ids: ids });
  }

  function requestRoute() {
    clearTimeout(routeTimer);
    requestBuffers();
    if (!state.a || !state.b) { state.result = null; state.plan = null; state.pendingId = 0; state.busy = false; renderPanel(); return; }
    if (!state.ready) { queued = true; state.busy = true; renderBusy(); return; }
    routeTimer = setTimeout(function () {
      var id = ++seq;
      state.pendingId = id;
      worker.postMessage({ type: "route", id: id, a: [state.a.lon, state.a.lat], b: [state.b.lon, state.b.lat], avoid: Array.from(state.avoid.keys()), bufferKm: state.bufferKm,
        regions: state.regions.map(function (r) { return { id: r.id, name: r.name, ring: regionRing(r), inverted: !!r.inverted, bufferKm: state.bufferKm }; }) });
      clearTimeout(busyTimer);
      busyTimer = setTimeout(function () { if (state.pendingId === id) { state.busy = true; state.progress = 0; renderBusy(); } }, 180);
    }, 40);
  }

  var UNITS = { km: { f: 1, label: "km" }, mi: { f: 0.621371192, label: "mi" }, nmi: { f: 1 / 1.852, label: "nmi" } };
  function fmt(km, unit) {
    var u = UNITS[unit || state.units];
    return Math.round(km * u.f).toLocaleString() + " " + u.label;
  }
  function baseId(id) { id = String(id); var k = id.indexOf("~"); return k < 0 ? id : id.slice(0, k); }
  function uniqueBase(ids) { var out = []; ids.forEach(function (id) { id = baseId(id); if (out.indexOf(id) < 0) out.push(id); }); return out; }
  function names(ids) {
    return ids.map(function (id) {
      id = baseId(id);
      var f = featureById.get(id); if (f) return f.properties.name;
      var r = regionById(id); return r ? (r.inverted ? "everywhere outside " + r.name : r.name) : id;
    });
  }
  function avoidedNames() {
    return Array.from(state.avoid.values()).concat(state.regions.map(function (r) { return r.inverted ? "everywhere outside " + r.name : r.name; }));
  }
  function joinNames(list) {
    if (list.length <= 1) return list.join("");
    if (list.length === 2) return list[0] + " and " + list[1];
    return list.slice(0, -1).join(", ") + ", and " + list[list.length - 1];
  }

  function avoiding() { return !!(state.avoid.size || state.regions.length); }
  function detourOf(res) { return !!(res && res.status === "done" && avoiding() && res.waypoints && res.lengthKm > res.directKm + 0.5); }
  function availableTabs(res) {
    if (!res || res.status !== "done") return [];
    var t = ["direct"];
    if (detourOf(res)) t.push("avoid");
    if (!res.antipodal) t.push("plan");
    return t;
  }
  function currentTab() {
    var t = availableTabs(state.result);
    if (!t.length) return null;
    if (state.tab && t.indexOf(state.tab) >= 0) return state.tab;
    return t.indexOf("avoid") >= 0 ? "avoid" : "direct";
  }
  function codeOf(pt, fallback) {
    var m = pt && pt.label && /\(([A-Z0-9]{3,4})\)/.exec(pt.label);
    return m ? m[1] : fallback;
  }
  function shortName(pt) {
    if (!pt) return "";
    if (!pt.label) return fmtLonLat(pt);
    return pt.label.replace(/\s*\([A-Z0-9]{3,4}\)/, "").split(",")[0].replace(/ (International )?Airport$/, "");
  }
  function endName(slot) { var pt = state[slot]; return codeOf(pt, null) || shortName(pt) || slot.toUpperCase(); }
  function hours(km) {
    var h = km / 850 + 0.5, hh = Math.floor(h), mm = Math.round((h - hh) * 12) * 5;
    if (mm === 60) { hh++; mm = 0; }
    return { text: "≈ " + hh + "h " + (mm < 10 ? "0" : "") + mm + "m", spoken: "about " + hh + (hh === 1 ? " hour" : " hours") + (mm ? " " + mm + " minutes" : "") };
  }
  function pctOf(extra, of) { return (100 * extra / of).toFixed(1) + "%"; }
  function setText(el, s) { if (el.textContent !== s) el.textContent = s; }
  function avoidLabel() {
    var n = avoidedNames();
    if (n.length <= 2) return joinNames(n);
    return n.length + " places";
  }
  function tabKm(tab) {
    var res = state.result;
    if (!res || res.status !== "done") return null;
    if (tab === "direct") return res.directKm;
    if (tab === "avoid") return res.lengthKm;
    return state.plan && state.plan.status === "done" ? state.plan.km : null;
  }

  var ui = {
    result: $("result"), tabs: $("tabs"), big: $("hero-big"), time: $("hero-time"), delta: $("hero-delta"), note: $("hero-note"),
    warn: $("warn"), plan: $("plan"), planStatus: $("plan-status"), timeline: $("timeline"), planAll: $("plan-all"), planTitle: $("plan-title"),
    crosses: $("crosses"), crossTitle: $("crosses-title"), crossList: $("cross-list"), foot: $("foot"), stats: $("stats"), status: $("status"),
    options: $("options"), optChips: $("opt-chips"), examples: $("examples"), tagline: $("tagline")
  };
  var warnActions = [];

  function renderBusy() {
    if (!state.busy) return;
    var what = !state.ready ? "Starting the route finder…" : avoiding() ? "Finding the way round " + avoidLabel() + "…" : "Measuring…";
    ui.result.hidden = false;
    ui.result.classList.add("is-busy");
    ui.result.setAttribute("aria-busy", "true");
    panel.classList.add("has-result");
    if (!state.result) { setText(ui.big, "…"); setText(ui.time, ""); ui.tabs.hidden = true; }
    setText(ui.note, what + (state.progress ? " " + state.progress.toLocaleString() + " corners so far" : ""));
  }

  var warnSet = false;
  function warning(text, actions) {
    if (text) warnSet = true;
    warnActions = actions || [];
    if (!text) { ui.warn.hidden = true; ui.warn.innerHTML = ""; ui.warn.dataset.key = ""; return; }
    var key0 = text + "|" + warnActions.map(function (a) { return a.label; }).join("|");
    if (ui.warn.dataset.key === key0 && !ui.warn.hidden) return;
    ui.warn.innerHTML = "";
    ui.warn.hidden = false;
    var key = text + "|" + warnActions.map(function (a) { return a.label; }).join("|");
    if (ui.warn.dataset.key === key && !ui.warn.hidden) return;
    ui.warn.dataset.key = key;
    var p = document.createElement("p"); p.className = "gc-warn-text"; p.textContent = text; ui.warn.appendChild(p);
    if (warnActions.length) {
      var row = document.createElement("div"); row.className = "gc-warn-actions";
      warnActions.forEach(function (a, i) {
        var b = document.createElement("button"); b.type = "button"; b.className = "gc-btn " + (i ? "gc-btn-quiet" : "gc-btn-primary"); b.dataset.action = i; b.textContent = a.label;
        row.appendChild(b);
      });
      ui.warn.appendChild(row);
    }
  }
  ui.warn.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("button[data-action]");
    if (!b) return;
    var a = warnActions[+b.dataset.action];
    if (a) { a.fn(); if (!document.activeElement || document.activeElement === document.body || !document.body.contains(b)) $("tabpanel").focus({ preventScroll: true }); }
  });

  function insideWarning(res) {
    var plain = true, actions = [];
    var where = function (raw, within) {
      return joinNames(uniqueBase(raw).map(function (id) {
        var r = regionById(id);
        if (!r) {
          if (within.indexOf(id) >= 0 || !(state.bufferKm > 0)) return "in " + names([id])[0];
          plain = false;
          return "too close to " + names([id])[0] + " for a " + fmtBuffer(state.bufferKm) + " buffer";
        }
        var inBase = raw.some(function (x) { return String(x) === id; });
        if (!inBase) { plain = false; return "within " + fmtBuffer(state.bufferKm) + " of " + r.name + (r.inverted ? "'s edge" : ""); }
        if (r.inverted) { plain = false; return "outside " + r.name; }
        return "in " + r.name;
      }));
    };
    var parts = [];
    if (res.insideA.length) parts.push(endName("a") + " is " + where(res.insideA, (res.startIn || []).map(String)));
    if (res.insideB.length) parts.push(endName("b") + " is " + where(res.insideB, (res.endIn || []).map(String)));
    var nearest = Infinity;
    [res.nearA, res.nearB].forEach(function (near, k) {
      var inside = ((k ? res.endIn : res.startIn) || []).map(String);
      Object.keys(near || {}).forEach(function (id) { if (inside.indexOf(id) < 0) nearest = Math.min(nearest, near[id]); });
    });
    if (isFinite(nearest)) {
      var fits = BUFFER_MI.filter(function (mi) { return mi * MI_KM * 1.035 + 0.1 < nearest && mi * MI_KM < state.bufferKm; });
      var to = fits.length ? fits[fits.length - 1] : 0;
      actions.push({ label: to ? "Use a " + to + " mi buffer" : "Turn the buffer off", fn: function () { setBuffer(to); } });
    }
    uniqueBase(res.insideA.concat(res.insideB)).forEach(function (id) {
      var r = regionById(id);
      actions.push({ label: r ? "Remove " + r.name : "Allow " + names([id])[0], fn: function () { if (r) removeRegion(r); else { state.avoid.delete(id); avoidChanged(); } } });
    });
    warning(parts.join("; ") + (plain ? ", which you are avoiding." : "."), actions);
  }

  function renderPanel() {
    var res = state.result, tabs = availableTabs(res);
    if (state.tab && tabs.length && tabs.indexOf(state.tab) < 0) state.tab = null;
    var tab = currentTab();
    var hasA = !!state.a, hasB = !!state.b;
    panel.classList.toggle("is-empty", !hasA && !hasB);
    ui.examples.hidden = hasA || hasB;
    ui.tagline.hidden = hasA || hasB;
    ui.optChips.hidden = !(hasA || hasB || avoiding());
    setText($("code-a"), codeOf(state.a, "A"));
    setText($("code-b"), codeOf(state.b, "B"));
    setText($("sum-a"), endName("a")); setText($("sum-b"), endName("b"));
    setText($("sum-a-name"), codeOf(state.a, null) ? shortName(state.a) : "");
    setText($("sum-b-name"), codeOf(state.b, null) ? shortName(state.b) : "");
    $("fit").hidden = !(hasA && hasB);
    renderOptionChips();
    ui.result.classList.remove("is-busy");
    ui.result.setAttribute("aria-busy", "false");
    panel.classList.toggle("has-result", !!res);
    ui.result.hidden = !res;
    ui.plan.hidden = true;
    ui.crosses.hidden = true;
    ui.foot.hidden = !res;
    if (!res) { warning(null); return; }
    ui.tabs.hidden = tabs.length < 2;
    ui.tabs.classList.toggle("is-two", tabs.length === 2);
    ["direct", "avoid", "plan"].forEach(function (k) {
      var b = $("tab-" + k), on = k === tab;
      b.hidden = tabs.indexOf(k) < 0;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
      var km = tabKm(k);
      setText($("tab-" + k + "-km"), km != null ? fmt(km) : (k === "plan" && state.plan && state.plan.status === "pending" ? "…" : k === "plan" ? "none" : ""));
    });
    setText($("tab-avoid-name"), "Avoiding");
    $("tab-avoid").setAttribute("aria-label", "Avoiding " + avoidLabel() + (tabKm("avoid") != null ? ", " + fmt(tabKm("avoid")) : ""));
    $("tabpanel").setAttribute("aria-labelledby", "tab-" + (tab || "direct"));
    var big = "", time = "", delta = "", note = "";
    warnSet = false;
    if (res.status === "error") {
      big = "–";
      ui.foot.hidden = true;
      warning("Something went wrong finding the route.", [{ label: "Try again", fn: function () { requestRoute(); } }]);
    } else if (res.status === "inside") {
      big = fmt(res.directKm); note = "direct";
      insideWarning(res);
    } else if (res.status === "none") {
      big = fmt(res.directKm); note = "direct";
      var lastId = Array.from(state.avoid.keys()).pop(), lastR = state.regions[state.regions.length - 1];
      var acts = [];
      if (lastR) acts.push({ label: "Remove " + lastR.name, fn: function () { removeRegion(lastR); } });
      else if (lastId) acts.push({ label: "Allow " + state.avoid.get(lastId), fn: function () { state.avoid.delete(lastId); avoidChanged(); } });
      warning("There is no way from " + endName("a") + " to " + endName("b") + " that stays out of " + joinNames(avoidedNames()) + ".", acts);
    } else if (tab === "direct") {
      big = fmt(res.directKm); time = hours(res.directKm).text;
      if (res.antipodal) delta = endName("a") + " and " + endName("b") + " are antipodes: every way round is this long";
      else delta = "The great circle, the shortest way there is";
      if (avoiding() && !detourOf(res)) note = "Already stays out of " + avoidLabel() + (state.bufferKm > 0 ? " | " + fmtBuffer(state.bufferKm) + " buffer" : "");
      if (detourOf(res)) {
        var over = (res.directCrosses || []).map(String).filter(function (id) { return state.avoid.has(id); }).map(function (id) { return state.avoid.get(id); });
        warning(over.length ? "Flies over " + joinNames(over) + ", which you are avoiding." : "Goes through what you are avoiding.", [{ label: "Go round it", fn: function () { setTab("avoid", true); } }]);
      }
    } else if (tab === "avoid") {
      var ex = res.lengthKm - res.directKm;
      big = fmt(res.lengthKm); time = hours(res.lengthKm).text;
      delta = "+" + fmt(ex) + " (" + pctOf(ex, res.directKm) + ") to go round " + avoidLabel();
      note = "The shortest way round" + (state.bufferKm > 0 ? ", at least " + fmtBuffer(state.bufferKm) + " off" : "") + ", with " + res.bends + (res.bends === 1 ? " bend" : " bends");
    } else if (tab === "plan") {
      var pl = state.plan || { status: "pending" };
      if (pl.status === "done") {
        big = fmt(pl.km); time = hours(pl.km).text;
        delta = "+" + fmt(pl.overKm) + " (" + pctOf(pl.overKm, res.lengthKm) + ") over the shortest way" + (detourOf(res) ? " round" : "");
        note = "From one radio beacon to the next, as a flight plan does";
      } else if (pl.status === "pending") {
        big = "…"; note = "Finding radio beacons along the way…";
      } else if (pl.status === "none") {
        big = fmt(res.lengthKm);
        warning("No chain of radio beacons reaches from " + endName("a") + " to " + endName("b") + " here.", [{ label: detourOf(res) ? "Show the way round" : "Show the shortest way", fn: function () { setTab(detourOf(res) ? "avoid" : "direct", true); } }]);
      } else {
        big = fmt(res.lengthKm);
        warning("The radio beacons could not be loaded.", [{ label: "Try again", fn: function () { requestRoute(); } }]);
      }
    }
    if (!warnSet) warning(null);
    setText(ui.big, big); setText(ui.time, time); setText(ui.delta, delta); setText(ui.note, note);
    ui.delta.hidden = !delta; ui.note.hidden = !note; ui.time.hidden = !time;
    if (tab === "plan") renderPlan();
    renderCrosses(tab);
    var ms = res.ms, ex2 = res.expanded;
    if (tab === "plan" && state.plan && state.plan.status === "done") { ms = (ms || 0) + state.plan.ms; ex2 = (ex2 || 0) + state.plan.expanded; }
    setText(ui.stats, ms != null && ex2 ? "Worked out in " + (ms / 1000).toFixed(ms < 100 ? 2 : 1) + " s | " + ex2.toLocaleString() + (tab === "plan" ? " corners and beacons searched" : " corners searched") : "");
    layoutSoon();
  }

  var planBuilt = "";
  function renderPlan() {
    var pl = state.plan;
    ui.plan.hidden = false;
    if (!pl || pl.status !== "done") {
      ui.timeline.innerHTML = ""; planBuilt = "";
      ui.planAll.hidden = true;
      setText(ui.planTitle, "Flight plan");
      setText(ui.planStatus, !pl || pl.status === "pending" ? "Finding radio beacons along the way…" : "");
      ui.planStatus.hidden = !(!pl || pl.status === "pending");
      ui.plan.hidden = !(!pl || pl.status === "pending");
      return;
    }
    ui.planStatus.hidden = true;
    var n = pl.points.length - 2;
    setText(ui.planTitle, "Flight plan | " + n + (n === 1 ? " radio beacon" : " radio beacons"));
    var LIMIT = 9, limit = state.planAll ? pl.legs.length : Math.min(LIMIT, pl.legs.length);
    var key = state.shownId + "|" + state.units + "|" + limit;
    ui.planAll.hidden = limit >= pl.legs.length;
    setText(ui.planAll, "Show all " + pl.legs.length + " legs");
    if (planBuilt !== key) {
      planBuilt = key;
      var frag = document.createDocumentFragment(), group = null, last = undefined;
      var addRow = function (pt, legIndex, kind) {
        var country = pt.country || "Over the sea";
        if (country !== last) {
          last = country;
          var g = document.createElement("li"); g.className = "gc-tl-group";
          var h = document.createElement("h4"); h.className = "gc-tl-country"; h.textContent = country; g.appendChild(h);
          group = document.createElement("ol"); group.className = "gc-tl-legs"; g.appendChild(group);
          frag.appendChild(g);
        }
        var li = document.createElement("li");
        li.className = "gc-tl-row gc-tl-" + kind + (legIndex >= 0 && pl.legs[legIndex].long ? " is-long" : "");
        if (legIndex >= 0) { li.dataset.leg = legIndex; li.tabIndex = 0; li.setAttribute("aria-pressed", "false"); li.setAttribute("role", "button"); }
        var icon = document.createElement("span"); icon.className = "gc-tl-icon"; icon.setAttribute("aria-hidden", "true");
        icon.innerHTML = kind === "end" ? '<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="6" fill="currentColor"/></svg>'
          : /^VOR/.test(pt.type) ? '<svg viewBox="0 0 14 14" width="14" height="14"><path d="M7 1.5L12.6 11.5H1.4Z" fill="var(--gc-card)" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>'
          : '<svg viewBox="0 0 14 14" width="14" height="14"><circle cx="7" cy="7" r="4.6" fill="var(--gc-card)" stroke="currentColor" stroke-width="1.6"/></svg>';
        li.appendChild(icon);
        var txt = document.createElement("span"); txt.className = "gc-tl-text";
        var id = document.createElement("b"); id.textContent = kind === "end" ? (legIndex < 0 ? endName("a") : endName("b")) : pt.ident;
        var sub = document.createElement("small");
        sub.textContent = kind === "end" ? (legIndex < 0 ? shortName(state.a) + ", departure" : shortName(state.b) + ", arrival") : pt.name + " " + pt.type;
        txt.appendChild(id); txt.appendChild(sub); li.appendChild(txt);
        var km = document.createElement("span"); km.className = "gc-tl-km";
        if (legIndex >= 0) {
          var sr = document.createElement("span"); sr.className = "sr-only"; sr.textContent = "leg "; km.appendChild(sr);
          km.appendChild(document.createTextNode(fmt(pl.legs[legIndex].km)));
          if (pl.legs[legIndex].long) { var lg = document.createElement("small"); lg.textContent = "no beacon near"; km.appendChild(lg); }
        }
        li.appendChild(km);
        group.appendChild(li);
      };
      addRow(pl.points[0], -1, "end");
      for (var i = 0; i < limit; i++) addRow(pl.points[i + 1], i, i + 1 === pl.points.length - 1 ? "end" : "beacon");
      ui.timeline.innerHTML = "";
      ui.timeline.appendChild(frag);
    }
    markLeg();
  }
  function markLeg() {
    var leg = state.pinLeg >= 0 ? state.pinLeg : state.hoverLeg;
    ui.timeline.querySelectorAll(".gc-tl-row[data-leg]").forEach(function (li) { li.classList.toggle("is-on", +li.dataset.leg === leg); li.classList.toggle("is-pinned", +li.dataset.leg === state.pinLeg); li.setAttribute("aria-pressed", String(+li.dataset.leg === state.pinLeg)); });
  }
  ui.timeline.addEventListener("pointerover", function (e) {
    var li = e.target.closest && e.target.closest(".gc-tl-row[data-leg]");
    var leg = li ? +li.dataset.leg : -1;
    if (leg === state.hoverLeg || e.pointerType !== "mouse") return;
    state.hoverLeg = leg; markLeg(); scheduleRender("full");
  });
  ui.timeline.addEventListener("pointerleave", function () { if (state.hoverLeg < 0) return; state.hoverLeg = -1; markLeg(); scheduleRender("full"); });
  ui.timeline.addEventListener("click", function (e) {
    var li = e.target.closest && e.target.closest(".gc-tl-row[data-leg]");
    if (!li) return;
    var leg = +li.dataset.leg;
    state.pinLeg = state.pinLeg === leg ? -1 : leg;
    markLeg(); scheduleRender("full");
    if (state.pinLeg >= 0 && state.plan && state.plan.points) {
      var p = state.plan.points[leg + 1];
      if (!visible([p.lon, p.lat])) flyTo(p.lon, p.lat);
    }
  });
  ui.timeline.addEventListener("keydown", function (e) {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".gc-tl-row[data-leg]")) { e.preventDefault(); e.target.click(); }
  });
  ui.timeline.addEventListener("focusin", function (e) {
    var li = e.target.closest && e.target.closest(".gc-tl-row[data-leg]");
    if (!li || +li.dataset.leg === state.hoverLeg) return;
    state.hoverLeg = +li.dataset.leg; markLeg(); scheduleRender("full");
  });
  ui.planAll.addEventListener("click", function () {
    state.planAll = true;
    var n = ui.timeline.querySelectorAll(".gc-tl-row[data-leg]").length;
    renderPlan();
    var rows = ui.timeline.querySelectorAll(".gc-tl-row[data-leg]");
    if (rows[n]) rows[n].focus();
  });

  function renderCrosses(tab) {
    var res = state.result;
    var ids = tab === "plan" ? (state.plan && state.plan.status === "done" ? state.plan.crosses : null) : tab === "avoid" ? res.routeCrosses : res.directCrosses;
    if (!ids) { ui.crosses.hidden = true; return; }
    ui.crosses.hidden = false;
    var ends = (res.startIn || []).concat(res.endIn || []).map(String);
    var list = ids.map(String).filter(function (id) { return featureById.has(id); });
    var key = list.join(",") + "|" + Array.from(state.avoid.keys()).join(",") + "|" + ends.join(",");
    if (ui.crossList.dataset.key === key) return;
    ui.crossList.dataset.key = key;
    setText(ui.crossTitle, list.length ? "Crosses " + list.length + (list.length === 1 ? " country" : " countries") : "Crosses nothing: open sea all the way");
    ui.crossList.innerHTML = "";
    list.forEach(function (id) {
      var f = featureById.get(id), li = document.createElement("li");
      if (!state.avoid.has(id) && id !== ANTARCTICA && ends.indexOf(id) < 0) {
        var b = document.createElement("button"); b.type = "button"; b.className = "gc-chip gc-chip-add";
        b.dataset.id = id; b.textContent = f.properties.name; b.title = "Avoid " + f.properties.name; b.setAttribute("aria-label", "Avoid " + f.properties.name);
        li.appendChild(b);
      } else {
        li.className = "gc-chip" + (state.avoid.has(id) ? " is-avoided" : "");
        li.textContent = f.properties.name;
      }
      ui.crossList.appendChild(li);
    });
  }
  ui.crossList.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("button[data-id]");
    if (!b) return;
    var id = b.dataset.id, f = featureById.get(id);
    state.avoid.set(id, f.properties.name);
    state.tab = null;
    avoidChanged();
    ui.crossTitle.focus();
  });

  function setTab(tab, focus) {
    state.tab = tab;
    state.hoverLeg = -1; state.pinLeg = -1;
    if (tab === "plan") fitPending = "plan";
    renderPanel();
    writeUrl();
    scheduleRender("full");
    if (tab === "plan" && state.plan && state.plan.status === "done") { fitPending = false; fitRoute(false); }
    if (focus) $("tab-" + currentTab()).focus();
  }
  ui.tabs.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[role=tab]");
    if (b) setTab(b.dataset.tab, false);
  });
  ui.tabs.addEventListener("keydown", function (e) {
    var list = Array.prototype.filter.call(ui.tabs.querySelectorAll("[role=tab]"), function (b) { return !b.hidden; });
    var i = list.indexOf(document.activeElement);
    if (i < 0) return;
    var j = e.key === "ArrowRight" ? (i + 1) % list.length : e.key === "ArrowLeft" ? (i - 1 + list.length) % list.length : e.key === "Home" ? 0 : e.key === "End" ? list.length - 1 : -1;
    if (j < 0) return;
    e.preventDefault();
    setTab(list[j].dataset.tab, true);
  });

  function announce() {
    var res = state.result;
    if (!res) return;
    var t = currentTab(), text;
    if (res.status === "done" && t === "plan" && tabKm("plan") == null) {
      text = state.plan && state.plan.status === "pending" ? "Flight plan: finding radio beacons along the way." : (ui.warn.querySelector(".gc-warn-text") || {}).textContent || "";
    } else if (res.status === "done") {
      var km = tabKm(t);
      text = (t === "avoid" ? "Avoiding " + avoidLabel() + ": " : t === "plan" ? "Flight plan: " : "Direct: ") + fmt(km) + ", " + hours(km).spoken + ".";
      if (t === "avoid") text += " " + fmt(res.lengthKm - res.directKm) + " longer than direct.";
    } else text = (ui.warn.querySelector(".gc-warn-text") || {}).textContent || "";
    ui.status.textContent = "";
    setTimeout(function () { ui.status.textContent = text; }, 30);
  }

  var optOpener = null;
  function setOptions(open, opener, byKey) {
    ui.options.hidden = !open;
    document.querySelectorAll(".gc-opt-chip").forEach(function (c) { c.setAttribute("aria-expanded", String(open && c === opener)); c.classList.toggle("is-open", open && c === opener); });
    if (open) {
      optOpener = opener || null;
      if (W <= 640) setSheet(true);
      var k = opener && opener.dataset.opt;
      var target = k === "buffer" ? ui.options.querySelector("input[name=buffer]:checked") : k === "units" ? ui.options.querySelector("input[name=units]:checked") : $("in-avoid");
      if (target && !(k === "avoid" && !canHover)) target.focus();
    } else if (optOpener) { if (byKey) optOpener.focus(); else if (ui.options.contains(document.activeElement)) document.activeElement.blur(); optOpener = null; }
    layoutSoon();
  }
  document.querySelectorAll(".gc-opt-chip").forEach(function (c) {
    c.addEventListener("click", function () { setOptions(ui.options.hidden || !c.classList.contains("is-open"), c); });
  });
  $("options-done").addEventListener("click", function (e) { setOptions(false, null, e.detail === 0); });
  ui.options.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    e.preventDefault(); setOptions(false, null, true);
  });
  function renderOptionChips() {
    setText($("chip-avoid"), avoiding() ? "Avoiding " + avoidLabel() : "Avoid a country");
    $("chip-buffer").hidden = !avoiding();
    setText($("chip-buffer"), state.bufferKm > 0 ? fmtBuffer(state.bufferKm) + " buffer" : "No buffer");
    setText($("chip-units"), state.units);
    $("chip-avoid").classList.toggle("is-set", avoiding());
    var mi = String(bufferMi(state.bufferKm));
    ui.options.querySelectorAll("input[name=buffer]").forEach(function (r) { r.checked = r.value === mi; });
    ui.options.querySelectorAll("input[name=units]").forEach(function (r) { r.checked = r.value === state.units; });
    $("buffer-row").hidden = !avoiding();
  }
  ui.options.querySelectorAll("input[name=units]").forEach(function (r) {
    r.addEventListener("change", function () {
      state.units = r.value;
      try { localStorage.setItem("gc-units", state.units); } catch (e) {}
      planBuilt = "";
      renderPanel();
      scheduleRender("full");
    });
  });
  ui.options.querySelectorAll("input[name=buffer]").forEach(function (r) {
    r.addEventListener("change", function () { setBuffer(+r.value); });
  });

  $("share").addEventListener("click", function () {
    var url = location.href, label = $("share-label");
    var done = function (text) { label.textContent = text; ui.status.textContent = text; setTimeout(function () { label.textContent = "Share this route"; }, 2000); };
    if (navigator.share && !canHover) { navigator.share({ title: "GREATERCIRCLE: " + endName("a") + " to " + endName("b"), url: url }).catch(function () {}); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { done("Link copied"); }, function () { done("Copy the address bar to share"); });
    else done("Copy the address bar to share");
  });

  var layoutTimer = 0, lastPanelH = 0;
  function layoutSoon() {
    if (W > 640) return;
    cancelAnimationFrame(layoutTimer);
    layoutTimer = requestAnimationFrame(function () {
      var h = Math.round(panel.getBoundingClientRect().height);
      if (h !== lastPanelH) { lastPanelH = h; layout(); scheduleRender("full"); }
    });
  }

  var MI_KM = 1.609344, BUFFER_MI = [0, 1, 5, 10, 20, 50, 100], BUFFER_DEFAULT_MI = 50;
  function bufferMi(km) {
    var best = BUFFER_MI[0];
    BUFFER_MI.forEach(function (mi) { if (Math.abs(mi * MI_KM - km) < Math.abs(best * MI_KM - km)) best = mi; });
    return best;
  }
  function fmtBuffer(km) { return bufferMi(km) + " mi"; }
  function setBuffer(mi) {
    state.bufferKm = mi * MI_KM;
    renderOptionChips();
    requestRoute();
    writeUrl();
    scheduleRender("full");
  }

  var ANTARCTICA = "010";
  function writeUrl() {
    var p = [];
    var pt = function (k, v) { if (v) p.push(k + "=" + v.lat.toFixed(4) + "," + v.lon.toFixed(4) + (v.label ? "," + encodeURIComponent(v.label) : "")); };
    pt("a", state.a); pt("b", state.b);
    if (state.avoid.size) p.push("avoid=" + Array.from(state.avoid.keys()).join(","));
    state.regions.forEach(function (r) {
      var body = r.kind === "circle" ? "c~" + r.center[1].toFixed(3) + "," + r.center[0].toFixed(3) + "," + r.radiusKm
        : "p~" + r.points.map(function (q) { return q[1].toFixed(3) + "," + q[0].toFixed(3); }).join(";");
      p.push("r=" + encodeURIComponent(r.name) + "~" + body + (r.inverted ? "~i" : ""));
    });
    if ((state.avoid.size || state.regions.length) && bufferMi(state.bufferKm) !== BUFFER_DEFAULT_MI) p.push("buf=" + bufferMi(state.bufferKm) + "mi");
    if (state.tab && state.a && state.b && (!state.result || currentTab() === state.tab)) p.push("tab=" + state.tab);
    var h = p.length ? "#" + p.join("&") : "";
    if (h !== location.hash) history.replaceState(null, "", h || location.pathname + location.search);
  }
  function readUrl() {
    var h = location.hash.replace(/^#/, "");
    state.a = null; state.b = null; state.avoid.clear(); state.regions = []; selected = null; state.bufferKm = BUFFER_DEFAULT_MI * MI_KM; state.tab = null;
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
          if (suggesters[k]) suggesters[k].setValue(label ? inputText(label) : fmtLonLat(state[k])); else inputs[k].value = label ? inputText(label) : fmtLonLat(state[k]);
          $("clear-" + k).hidden = false;
          any = true;
        }
      } else if (k === "avoid") {
        v.split(",").forEach(function (id) { var f = featureById.get(id); if (f && id !== ANTARCTICA) { state.avoid.set(id, f.properties.name); any = true; } });
      } else if (k === "r") {
        var parts = v.split("~");
        if (parts.length !== 3 && !(parts.length === 4 && parts[3] === "i")) return;
        var name; try { name = decodeURIComponent(parts[0]); } catch (err) { name = parts[0]; }
        var r = null;
        if (parts[1] === "c") {
          var cc = parts[2].split(",").map(Number);
          if (cc.length === 3 && cc.every(isFinite) && Math.abs(cc[0]) <= 90) r = { kind: "circle", center: [cc[1], cc[0]], radiusKm: Math.max(5, Math.min(9000, cc[2])) };
        } else if (parts[1] === "p") {
          var pts = parts[2].split(";").map(function (q) { var c = q.split(",").map(Number); return c.length === 2 && c.every(isFinite) ? [c[1], c[0]] : null; }).filter(Boolean);
          if (pts.length >= 3 && !ringProblem(pts)) r = { kind: "polygon", points: pts };
        }
        if (r) { r.id = "r" + (++regionSeq); r.name = name || r.id; r.inverted = parts[3] === "i"; state.regions.push(r); any = true; }
      } else if (k === "wp") {
        if (v === "1") state.tab = "plan";
      } else if (k === "tab") {
        if (v === "direct" || v === "avoid" || v === "plan") state.tab = v;
      } else if (k === "buf") {
        var miles = /mi$/.test(v), bk = parseFloat(v);
        if (isFinite(bk) && bk >= 0) state.bufferKm = bufferMi(miles ? bk * MI_KM : bk) * MI_KM;
      }
    });
    return any;
  }

  (function () {
    var box = $("about"), btn = $("about-btn");
    if (!box || !btn) return;
    function setOpen(open) {
      box.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
    }
    btn.addEventListener("click", function () { setOpen(!box.classList.contains("is-open")); });
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
    setTimeout(function () { layout(); scheduleRender("full"); }, 300);
  }
  function setSheet(open) { setSheetState(open ? SHEET_OPEN : SHEET_PEEK); }
  $("sheet-handle").addEventListener("click", function () {
    if (performance.now() - sheetGestureAt < 500) return;
    var st = sheetState();
    setSheetState(st === SHEET_OPEN ? SHEET_PEEK : st + 1);
  });
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
      if (sheetState() === SHEET_OPEN && !d.onHandle && !(panel.scrollTop <= 0 && dy > 0)) { sheetDrag = null; return; }
      d.engaged = true;
      try { panel.setPointerCapture(e.pointerId); } catch (err) {}
      panel.classList.add("is-dragging");
      if (document.activeElement && panel.contains(document.activeElement)) document.activeElement.blur();
    }
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

  function init(topo) {
    topology = topo;
    var obj = topo.objects.countries;
    features = topojson.feature(topo, obj).features;
    features.forEach(function (f, i) { f.id = String(f.id); f.index = i; featureById.set(f.id, f); });
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

    try { var u = localStorage.getItem("gc-units"); if (UNITS[u]) state.units = u; } catch (e) {}

    refreshPalette();
    layout();
    try { if (localStorage.getItem("gc-satellite") === "1") setSatellite(true); } catch (e) {}
    var fromUrl = readUrl();
    renderChips();
    renderPanel();
    updateHint();
    setAvoidHint();
    startWorker();
    loadCities();
    loadLakes();
    $("load").classList.add("is-gone");
    setTimeout(function () { $("load").remove(); }, 400);
    if (fromUrl) { requestRoute(); setTimeout(function () { fitRoute(true); }, 50); }
    scheduleRender("full");
  }

  window.addEventListener("resize", function () { layout(); scheduleRender("full"); });
  new MutationObserver(function () { refreshPalette(); scheduleRender("full"); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { scheduleRender("full"); });
  window.addEventListener("hashchange", function () {
    readUrl(); renderChips(); updateHint(); renderPanel(); fitPending = true; state.stale = true; requestRoute(); scheduleRender("full");
  });

  window.__greatercircle = {
    project: function (lon, lat) { return visible([lon, lat]) ? projection([lon, lat]) : null; },
    state: state, view: view, drawing: function () { return drawing; },
    regionShape: function (i) { return regionPolygon(state.regions[i]); },
    setView: function (lon, lat, zoom) { view.lon = lon; view.lat = lat; view.zoom = zoom; applyView(); render("full"); },
    scale: function () { return projection.scale(); }, admin1: function () { return !!admin1; },
    timeRender: function (detail) { var t0 = performance.now(); render(detail || "full"); return performance.now() - t0; },
    counts: function () { var c = function (l) { var n = 0; l.forEach(function (f) { f.rings.forEach(function (r) { n += r.n; }); }); return n; }; return { full: c(lod.full), mid: c(lod.mid), coarse: c(lod.coarse) }; },
    profile: function (detail) {
      marks = []; render(detail || "full");
      var out = {}; for (var i = 1; i < marks.length; i++) out[marks[i][0]] = +(marks[i][1] - marks[i - 1][1]).toFixed(1);
      marks = null; return out;
    },
    ready: function () { return !!lod; },
    satellite: function () { return { on: satOn, live: satLive, tiles: detail.put.size, rect: detail.rect }; },
    exp: { traceFeature: traceFeature, basis: basis, featuresFor: featuresFor, ctx: ctx }
  };

  refreshPalette();
  layout();
  fetch("data/countries-50m.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(init).catch(function (err) {
    $("load").textContent = "The map did not load (" + err.message + "), reload to try again";
    console.error(err);
  });
})();

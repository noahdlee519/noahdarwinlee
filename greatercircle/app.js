(function () {
  "use strict";

  var G = GreatCircle;
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $("globe");
  var ctx = canvas.getContext("2d");
  var satCanvas = $("sat"), sat = null, satTried = false, satOn = false, satLive = false;
  var panel = $("panel");
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduceMotion = motionQuery.matches;
  if (motionQuery.addEventListener) motionQuery.addEventListener("change", function () { reduceMotion = motionQuery.matches; });
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

  var globeProjection = d3.geoOrthographic().clipAngle(90).precision(0.35);
  var flatProjection = d3.geoNaturalEarth1().precision(0.35);
  var projection = globeProjection;
  var path = d3.geoPath(projection, ctx);
  var flat = false, flatBase = 1, halfFreeH = 300, FLAT_MIN = 0.85;
  var RAD = Math.PI / 180, NE_XMAX = Math.PI * 0.8707, NE_YMAX = neY(Math.PI / 2);
  function neA(phi) { var p2 = phi * phi, p4 = p2 * p2; return 0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)); }
  function neY(phi) { var p2 = phi * phi, p4 = p2 * p2; return phi * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4))); }
  function wrapPi(x) { return x - 2 * Math.PI * Math.floor((x + Math.PI) / (2 * Math.PI)); }
  var flatInvert = flatProjection.invert;
  flatProjection.invert = function (p) {
    var t = flatProjection.translate(), s = flatProjection.scale();
    var x = (p[0] - t[0]) / s, y = (t[1] - p[1]) / s;
    if (Math.abs(y) > NE_YMAX) return null;
    var phi = d3.geoNaturalEarth1Raw.invert(0, y)[1];
    if (Math.abs(x) > Math.PI * neA(phi) + 1e-9) return null;
    return flatInvert(p);
  };
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
    if (phone && typeof placeSheet === "function") placeSheet();
    var sheetH = phone ? (typeof sheetVisible === "function" ? sheetVisible(Math.min(sheetMode, SHEET_HALF)) : 220) : 0;
    var topInset = phone ? 64 : 0;
    var freeW = W - panelW, freeH = H - sheetH - (phone ? topInset + 8 : 40);
    cx = phone ? W / 2 : panelW + freeW / 2;
    cy = phone ? (topInset + H - sheetH) / 2 : H / 2;
    base = Math.max(80, Math.min(freeW, freeH) / 2 - 16);
    flatBase = Math.max(20, Math.min((freeW - 32) / (2 * NE_XMAX), (freeH - 32) / (2 * NE_YMAX)));
    halfFreeH = freeH / 2;
    pick.width = W; pick.height = H;
    pickDirty = true;
    applyView();
  }

  function applyView() {
    view.lat = Math.max(-90, Math.min(90, view.lat));
    view.lon = ((view.lon + 540) % 360) - 180;
    if (flat) {
      view.zoom = Math.max(FLAT_MIN, Math.min(MAX_ZOOM, view.zoom));
      var s = flatBase * view.zoom, room = Math.max(0, s * NE_YMAX - halfFreeH + 24);
      var y0 = Math.max(-room, Math.min(room, s * neY(Math.max(-89.9, Math.min(89.9, view.lat)) * RAD)));
      view.lat = d3.geoNaturalEarth1Raw.invert(0, y0 / s)[1] / RAD;
      projection.rotate([-view.lon, 0, 0]).scale(s).translate([cx, cy + y0]);
    } else {
      view.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, view.zoom));
      projection.rotate([-view.lon, -view.lat, 0]).scale(base * view.zoom).translate([cx, cy]);
    }
    pickDirty = true;
  }

  var pal = {}, hatch = null;
  function refreshPalette() {
    var cs = getComputedStyle(document.documentElement);
    var get = function (name) { return cs.getPropertyValue(name).trim(); };
    ["ocean", "land", "land-hover", "border", "limb", "glow", "grat", "hatch", "route", "route-halo", "direct", "marker", "marker-ink", "city", "city-ring", "label", "label-halo", "region-fill", "border-sub", "faint", "hover-route", "buffer-edge", "flow", "country-label", "country-halo"]
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

  var under = document.createElement("canvas"), underCtx = under.getContext("2d"), underOk = false, fullWanted = false;
  function scheduleRender(detail) {
    void detail;
    underOk = false; fullWanted = true;
    if (!renderQueued) { renderQueued = true; requestAnimationFrame(frame); }
  }
  function scheduleFlow() {
    if (!renderQueued) { renderQueued = true; requestAnimationFrame(frame); }
  }

  function frame() {
    renderQueued = false;
    if (!fullWanted && underOk && under.width === canvas.width && under.height === canvas.height) { renderTop(); return; }
    fullWanted = false;
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
    if (flat) { var tr = projection.translate(); B.l0 = lon; B.tx = tr[0]; B.ty = tr[1]; }
  }
  function flatXY(lam, phi) {
    var p2 = phi * phi, p4 = p2 * p2;
    var x = lam * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)));
    var y = phi * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)));
    FX = B.tx + B.r * x; FY = B.ty - B.r * y;
  }
  var FX = 0, FY = 0;
  function unwrapInto(target, X, Y, Z, n) {
    var lon = new Float64Array(n), lat = new Float64Array(n), prev = 0, min = Infinity, max = -Infinity, pmin = Infinity, pmax = -Infinity;
    for (var k = 0; k < n; k++) {
      var l = Math.atan2(Y[k], X[k]), p = Math.asin(Math.max(-1, Math.min(1, Z[k])));
      if (k > 0) l = prev + wrapPi(l - prev);
      lon[k] = l; lat[k] = p; prev = l;
      if (l < min) min = l; if (l > max) max = l;
      if (p < pmin) pmin = p; if (p > pmax) pmax = p;
    }
    target.pmin = pmin; target.pmax = pmax;
    target.lon = lon; target.lat = lat; target.minL = min; target.maxL = max;
    target.drift = n > 1 ? Math.round((lon[n - 1] - lon[0]) / (2 * Math.PI)) : 0;
    var sum = 0; for (k = 0; k < n; k++) sum += lat[k];
    target.pole = sum >= 0 ? Math.PI / 2 : -Math.PI / 2;
    return target;
  }
  function flatOffsets(minL, maxL, pmin, pmax) {
    var out = [];
    if (pmin != null) {
      var yTop = B.ty - B.r * neY(pmax), yBot = B.ty - B.r * neY(pmin);
      if (yBot < -EDGE || yTop > H + EDGE) return out;
    }
    for (var o = -2; o <= 2; o++) {
      var off = o * 2 * Math.PI, lo = minL + off, hi = maxL + off;
      if (hi < -Math.PI - 1e-9 || lo > Math.PI + 1e-9) continue;
      if (pmin != null) {
        var x1 = B.tx + B.r * Math.min(lo * 0.8707, lo * 0.5), x2 = B.tx + B.r * Math.max(hi * 0.8707, hi * 0.5);
        if (x2 < -EDGE || x1 > W + EDGE) continue;
      }
      out.push(off);
    }
    return out;
  }
  function traceRingFlat(c, rg) {
    var L = rg.lon, P = rg.lat, n = rg.n;
    var shift = wrapPi(L[0] - B.l0) - L[0];
    var offs = rg.drift ? [-2 * Math.PI, 0, 2 * Math.PI] : flatOffsets(rg.minL + shift, rg.maxL + shift, rg.pmin, rg.pmax);
    for (var oi = 0; oi < offs.length; oi++) {
      var s = shift + offs[oi], side = 0, held = false, lx = 0, ly = 0;
      for (var k = 0; k < n; k++) {
        flatXY(L[k] + s, P[k]);
        if (k === 0) { c.moveTo(FX, FY); side = outcode(FX, FY); continue; }
        var oc = outcode(FX, FY);
        if (oc & side) { lx = FX; ly = FY; held = true; side = oc & side; continue; }
        if (held) { c.lineTo(lx, ly); held = false; }
        c.lineTo(FX, FY); side = oc;
      }
      if (held) c.lineTo(lx, ly);
      if (rg.drift) {
        flatXY(L[n - 1] + s, rg.pole); c.lineTo(FX, FY);
        flatXY(L[0] + s, rg.pole); c.lineTo(FX, FY);
      }
      c.closePath();
    }
    return true;
  }
  function traceLinesFlat(c, lines) {
    for (var i = 0; i < lines.length; i++) {
      var Ln = lines[i], L = Ln.lon, P = Ln.lat, n = Ln.n;
      var shift = wrapPi(L[0] - B.l0) - L[0], offs = flatOffsets(Ln.minL + shift, Ln.maxL + shift, Ln.pmin, Ln.pmax);
      for (var oi = 0; oi < offs.length; oi++) {
        var s = shift + offs[oi], side = 0;
        for (var k = 0; k < n; k++) {
          flatXY(L[k] + s, P[k]);
          var oc = outcode(FX, FY);
          if (k === 0) { c.moveTo(FX, FY); side = oc; continue; }
          if (oc & side) { c.moveTo(FX, FY); side = oc & side; continue; }
          c.lineTo(FX, FY); side = oc;
        }
      }
    }
  }
  function screenOf(lonDeg, latDeg, x, y, z) {
    if (flat) { flatXY(wrapPi(lonDeg * RAD - B.l0), latDeg * RAD); return FX > -40 && FY > -40 && FX < W + 40 && FY < H + 40; }
    var sz = x * B.cx + y * B.cy + z * B.cz;
    if (sz <= 0.02) return false;
    FX = cx + B.r * (x * B.ex + y * B.ey + z * B.ez); FY = cy - B.r * (x * B.nx + y * B.ny + z * B.nz);
    return true;
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
          rings.push(unwrapInto({ x: X, y: Y, z: Z, n: n }, X, Y, Z, n));
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
      return unwrapInto({ x: X, y: Y, z: Z, n: n, cx: c[0], cy: c[1], cz: c[2], radius: Math.acos(Math.max(-1, Math.min(1, minDot))) }, X, Y, Z, n);
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
    if (flat) return true;
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
    for (var i = 0; i < f.rings.length; i++) { if (flat) traceRingFlat(c, f.rings[i]); else traceRing(c, f.rings[i]); }
  }
  function traceLines(c, lines) {
    if (flat) { traceLinesFlat(c, lines); return; }
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

    if (flat) {
      ctx.beginPath(); path({ type: "Sphere" });
      ctx.lineJoin = "round"; ctx.strokeStyle = pal.glow;
      ctx.lineWidth = 14; ctx.globalAlpha = 0.45; ctx.stroke(); ctx.lineWidth = 6; ctx.globalAlpha = 0.8; ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = pal.ocean; ctx.fill();
    } else if (r * 1.07 < Math.hypot(W, H)) {
      var glow = ctx.createRadialGradient(cx, cy, r, cx, cy, r * 1.07);
      glow.addColorStop(0, pal.glow); glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.07, 0, 2 * Math.PI); ctx.fill();
    }
    var live = !flat && !flatOnly && satOn && !!sat && sat.ready();
    if (live !== satLive) { satLive = live; document.documentElement.classList.toggle("gc-sat-on", live); refreshPalette(); }
    satCanvas.hidden = !live;
    if (live) renderSat();
    else if (flat) {
      ctx.save(); ctx.beginPath(); path({ type: "Sphere" }); ctx.clip();
    } else {
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

    drawCountryLabels(feats);
    if (flat) { ctx.restore(); ctx.beginPath(); path({ type: "Sphere" }); }
    else { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); }
    ctx.strokeStyle = pal.limb; ctx.lineWidth = 1; ctx.stroke();

    drawRegions();
    mark("regions");
    drawCities();
    mark("cities");
    ctx.restore();
    if (under.width !== canvas.width || under.height !== canvas.height) { under.width = canvas.width; under.height = canvas.height; }
    underCtx.clearRect(0, 0, under.width, under.height);
    underCtx.drawImage(canvas, 0, 0);
    underOk = !flatOnly;
    ctx.save();
    ctx.scale(dpr, dpr);
    drawTopLayers();
    ctx.restore();
    mark("end");
  }
  function renderTop() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(under, 0, 0);
    ctx.restore();
    ctx.save();
    ctx.scale(dpr, dpr);
    drawTopLayers();
    ctx.restore();
  }
  function drawTopLayers() {
    drawRoutes();
    drawMarkers();
    drawDrawing();
    if (canvas.classList.contains("show-ring") && document.activeElement === canvas) {
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(cx, cy, 11, 0, 2 * Math.PI);
      ctx.moveTo(cx - 20, cy); ctx.lineTo(cx - 6, cy); ctx.moveTo(cx + 6, cy); ctx.lineTo(cx + 20, cy);
      ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy - 6); ctx.moveTo(cx, cy + 6); ctx.lineTo(cx, cy + 20);
      ctx.strokeStyle = pal["route-halo"]; ctx.lineWidth = 4.5; ctx.stroke();
      ctx.strokeStyle = pal.route; ctx.lineWidth = 1.8; ctx.stroke();
    }
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

  function densify(coords, n) {
    var V = coords.map(function (c) { return G.toVec(c[0], c[1]); }), lens = [0], total = 0;
    for (var i = 1; i < V.length; i++) { total += G.angleBetween(V[i - 1], V[i]); lens.push(total); }
    var out = [], j = 0;
    for (var k = 0; k < n; k++) {
      var at = total * k / (n - 1);
      while (j < V.length - 2 && lens[j + 1] < at) j++;
      var seg = lens[j + 1] - lens[j], t = seg > 0 ? (at - lens[j]) / seg : 0;
      out.push(G.toLonLat(slerp(V[j], V[Math.min(j + 1, V.length - 1)], t)));
    }
    return out;
  }
  function slerp(a, b, t) {
    var d = G.angleBetween(a, b);
    if (d < 1e-9) return a.slice();
    var s0 = Math.sin((1 - t) * d) / Math.sin(d), s1 = Math.sin(t * d) / Math.sin(d);
    return G.normalize([s0 * a[0] + s1 * b[0], s0 * a[1] + s1 * b[1], s0 * a[2] + s1 * b[2]]);
  }
  var anim = null, ANIM_N = 160;
  function startAnim(kind, fromCoords, toCoords, ms) {
    if (reduceMotion || !toCoords) { anim = null; return; }
    anim = { kind: kind, to: densify(toCoords, ANIM_N), from: fromCoords ? densify(fromCoords, ANIM_N) : null, t0: performance.now(), ms: ms };
    var tick = function () { if (!anim) return; scheduleRender("full"); if (performance.now() - anim.t0 < anim.ms) requestAnimationFrame(tick); else { anim = null; scheduleRender("full"); } };
    requestAnimationFrame(tick);
  }
  function animatedLine() {
    if (!anim) return null;
    var t = Math.min(1, (performance.now() - anim.t0) / anim.ms), e = 1 - Math.pow(1 - t, 3);
    if (anim.kind === "draw") {
      var n = Math.max(2, Math.round(e * (ANIM_N - 1)) + 1);
      return { type: "LineString", coordinates: anim.to.slice(0, n) };
    }
    var pts = anim.to.map(function (p, i) { var a = G.toVec(anim.from[i][0], anim.from[i][1]), b = G.toVec(p[0], p[1]); return G.toLonLat(slerp(a, b, e)); });
    return { type: "LineString", coordinates: pts };
  }
  function routeDrawn() {
    var lines = routeLines(), tab = currentTab();
    if (!lines) return;
    var sel = lines[tab] || lines.avoid || lines.direct;
    startAnim("draw", null, sel.coordinates, 750);
  }
  var flatOnly = false;
  function makeCard(info) {
    anim = null;
    stopFly(); stopInertia();
    var wasFlat = flat;
    if (wasFlat) setProjection(false);
    var saved = { lon: view.lon, lat: view.lat, zoom: view.zoom }, t = fitTarget();
    if (t && !t.single) { view.lon = t.lon; view.lat = t.lat; view.zoom = Math.min(t.zoom, 1.6); applyView(); }
    flatOnly = true;
    render("full");
    var Wc = 1200, Hc = 630, out = document.createElement("canvas");
    out.width = Wc; out.height = Hc;
    var c = out.getContext("2d"), cs = getComputedStyle(document.documentElement);
    var v = function (n, f) { return cs.getPropertyValue(n).trim() || f; };
    var font = "'Familjen Grotesk', 'Helvetica Neue', Helvetica, Arial, sans-serif";
    c.fillStyle = v("--gc-ocean", "#e68019"); c.fillRect(0, 0, Wc, Hc);
    var r = projection.scale(), side = Math.min(2 * r + 40, W, H);
    var sx = Math.max(0, Math.min(W - side, cx - side / 2)), sy = Math.max(0, Math.min(H - side, cy - side / 2));
    var gs = 600;
    c.drawImage(canvas, sx * dpr, sy * dpr, side * dpr, side * dpr, Wc - gs + 30, (Hc - gs) / 2, gs, gs);
    flatOnly = false;
    if (wasFlat) setProjection(true);
    view.lon = saved.lon; view.lat = saved.lat; view.zoom = saved.zoom; applyView();
    render("full");
    var grad = c.createLinearGradient(560, 0, 760, 0);
    grad.addColorStop(0, v("--gc-card", "#8f4606")); grad.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = v("--gc-card", "#8f4606"); c.fillRect(0, 0, 560, Hc);
    c.fillStyle = grad; c.fillRect(560, 0, 200, Hc);
    var ink = v("--gc-text", "#ffffff"), muted = v("--gc-muted", "#fde3c9"), accent = v("--gc-accent", "#ffe7a3"), word = v("--gc-word", "#e3e3b0");
    c.textBaseline = "alphabetic";
    var spaced = function (text, x, y, sp) { for (var i = 0; i < text.length; i++) { c.fillText(text[i], x, y); x += c.measureText(text[i]).width + sp; } return x; };
    c.font = "500 26px " + font; c.fillStyle = ink;
    var x = spaced("GREATER", 56, 84, 4); c.fillStyle = word; spaced("CIRCLE", x, 84, 4);
    c.fillStyle = ink; c.font = "600 92px " + font;
    var codes = info.from + "  \u2192  " + info.to;
    while (c.measureText(codes).width > 470 && parseInt(c.font, 10) > 40) c.font = "600 " + (parseInt(c.font.split(" ")[1], 10) - 6) + "px " + font;
    c.fillText(codes, 56, 214);
    var fit = function (text, weight, size, min, y, color) {
      c.font = weight + " " + size + "px " + font;
      while (c.measureText(text).width > 480 && size > min) { size -= 2; c.font = weight + " " + size + "px " + font; }
      while (c.measureText(text).width > 480 && text.length > 4) text = text.slice(0, -2) + "…";
      c.fillStyle = color; c.fillText(text, 56, y);
    };
    fit(info.names, "400", 26, 18, 258, muted);
    fit(info.km, "500", 96, 60, 398, ink);
    fit(info.line, "400", 30, 20, 452, accent);
    fit(info.sub, "400", 26, 18, 494, muted);
    c.font = "400 22px " + font; c.fillStyle = muted;
    c.fillText("noahdarwinlee.com/greatercircle", 56, 576);
    return new Promise(function (res) { out.toBlob(function (b) { res(b); }, "image/png"); });
  }
  function tabChanged(prev) {
    var lines = routeLines(), tab = currentTab();
    if (!lines || prev === tab) return;
    var from = lines[prev] || lines.avoid || lines.direct, to = lines[tab] || lines.avoid || lines.direct;
    if (from === to) return;
    startAnim("morph", from.coordinates, to.coordinates, 320);
  }

  var FLOW_DASH_PX = 14, flowRun = null, flowOn = false;
  function flowing() { return !reduceMotion && !flatOnly; }
  function flowPath(sel) {
    if (flowRun && flowRun.line === sel) return flowRun;
    var V = sel.coordinates.map(function (c) { return G.toVec(c[0], c[1]); }), lens = [0], total = 0;
    for (var i = 1; i < V.length; i++) { total += G.angleBetween(V[i - 1], V[i]); lens.push(total); }
    var km = total * 6371.0088;
    flowRun = { line: sel, V: V, lens: lens, total: total, ms: Math.max(2200, Math.min(6000, 1800 + km * 0.35)), t0: performance.now() };
    return flowRun;
  }
  function drawFlowDot(sel) {
    var f = flowPath(sel);
    if (!(f.total > 0)) return;
    var t = ((performance.now() - f.t0) % f.ms) / f.ms, at = t * f.total, j = 0;
    while (j < f.V.length - 2 && f.lens[j + 1] < at) j++;
    var seg = f.lens[j + 1] - f.lens[j], v = slerp(f.V[j], f.V[j + 1], seg > 0 ? (at - f.lens[j]) / seg : 0), ll = G.toLonLat(v);
    if (!visible(ll)) return;
    var q = projection(ll);
    if (!q) return;
    ctx.beginPath(); ctx.arc(q[0], q[1], 1.2, 0, 2 * Math.PI);
    ctx.fillStyle = pal.flow || pal.route; ctx.fill();
  }
  function flowTick() {
    var res = state.result;
    if (!flowing() || !state.a || !state.b || !res || res.status !== "done" || state.stale) { flowOn = false; return; }
    scheduleFlow();
    requestAnimationFrame(flowTick);
  }
  function startFlow() {
    if (flowOn || !flowing()) return;
    flowOn = true;
    requestAnimationFrame(flowTick);
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
      ctx.setLineDash([5, 6]); ctx.lineDashOffset = flowing() ? -((performance.now() / 1000) * FLOW_DASH_PX) % 11 : 0;
      ctx.strokeStyle = pal.faint; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
    });
    var animated = animatedLine(), sel = animated || lines[tab] || lines.avoid || lines.direct;
    ctx.beginPath(); path(sel);
    ctx.strokeStyle = pal["route-halo"]; ctx.lineWidth = 6; ctx.stroke();
    ctx.beginPath(); path(sel);
    ctx.strokeStyle = pal.route; ctx.lineWidth = 2.4; ctx.stroke();
    if (!animated && flowing()) { drawFlowDot(sel); startFlow(); }
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

  var labelInfo = null, labelOrder = [], labelBoxes = [], labelCache = new Map(), labelBuilding = false;
  var SHORT_NAMES = { "Democratic Republic of the Congo": "DR Congo", "Republic of the Congo": "Congo", "Central African Republic": "Central African Rep.", "Bosnia and Herzegovina": "Bosnia and Herz.", "Dominican Republic": "Dominican Rep.", "French Southern and Antarctic Lands": "French Southern Lands", "South Georgia and the South Sandwich Islands": "South Georgia", "Saint Helena, Ascension and Tristan da Cunha": "Saint Helena", "Heard Island and McDonald Islands": "Heard Island", "Saint Vincent and the Grenadines": "Saint Vincent", "United States Virgin Islands": "US Virgin Islands", "British Indian Ocean Territory": "Chagos", "Australian Indian Ocean Territories": "Christmas Island", "Ashmore and Cartier Islands": "Ashmore Islands" };
  var LABEL_FONT = "'Familjen Grotesk', 'Helvetica Neue', Helvetica, Arial, sans-serif";
  function ringDist(x, y, rings) {
    var inside = false, min = Infinity;
    for (var r = 0; r < rings.length; r++) {
      var ring = rings[r];
      for (var i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
        var a = ring[i], b = ring[j];
        if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
        var dx = b[0] - a[0], dy = b[1] - a[1], t = dx || dy ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy))) : 0;
        var ex = a[0] + t * dx - x, ey = a[1] + t * dy - y, d = ex * ex + ey * ey;
        if (d < min) min = d;
      }
    }
    return (inside ? 1 : -1) * Math.sqrt(min);
  }
  function polylabel(rings, precision) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    rings[0].forEach(function (p) { if (p[0] < minX) minX = p[0]; if (p[1] < minY) minY = p[1]; if (p[0] > maxX) maxX = p[0]; if (p[1] > maxY) maxY = p[1]; });
    var size = Math.min(maxX - minX, maxY - minY);
    if (!(size > 0)) return [minX, minY];
    var cell = function (x, y, h) { var d = ringDist(x, y, rings); return { x: x, y: y, h: h, d: d, max: d + h * Math.SQRT2 }; };
    var queue = [], h = size / 2;
    for (var x = minX; x < maxX; x += size) for (var y = minY; y < maxY; y += size) queue.push(cell(x + h, y + h, h));
    var best = cell((minX + maxX) / 2, (minY + maxY) / 2, 0), guard = 0;
    while (queue.length && guard++ < 4000) {
      var bi = 0;
      for (var q = 1; q < queue.length; q++) if (queue[q].max > queue[bi].max) bi = q;
      var c = queue[bi]; queue[bi] = queue[queue.length - 1]; queue.pop();
      if (c.d > best.d) best = c;
      if (c.max - best.d <= precision) continue;
      h = c.h / 2;
      queue.push(cell(c.x - h, c.y - h, h), cell(c.x + h, c.y - h, h), cell(c.x - h, c.y + h, h), cell(c.x + h, c.y + h, h));
    }
    return [best.x, best.y];
  }
  function spanAt(polys, lon, lat) {
    var xs = [];
    for (var p = 0; p < polys.length; p++) for (var r = 0; r < polys[p].length; r++) {
      var ring = polys[p][r];
      for (var i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
        var a = ring[i], b = ring[j];
        if ((a[1] > lat) === (b[1] > lat) || Math.abs(a[0] - b[0]) > 180) continue;
        xs.push(a[0] + (lat - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
    }
    xs.sort(function (u, v) { return u - v; });
    for (var k = 0; k + 1 < xs.length; k += 2) if (xs[k] <= lon && lon <= xs[k + 1]) return [xs[k], xs[k + 1]];
    return null;
  }
  function buildLabelInfo() {
    labelBuilding = true;
    var list = [], i = 0;
    var step = function (deadline) {
      while (i < features.length && (!deadline || deadline.timeRemaining() > 3)) {
        var f = features[i], polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
        var best = null, bestA = 0, total = 0;
        polys.forEach(function (poly) { var ar = d3.geoArea({ type: "Polygon", coordinates: poly }); if (ar > 2 * Math.PI) ar = 4 * Math.PI - ar; total += ar; if (ar > bestA) { bestA = ar; best = poly; } });
        if (best) {
          var mid = 0; best[0].forEach(function (pt) { mid += pt[1]; }); mid /= best[0].length;
          var k = Math.max(0.15, Math.cos(mid * RAD));
          var scaled = best.map(function (ring) { return ring.map(function (pt) { return [pt[0] * k, pt[1]]; }); });
          var pl = polylabel(scaled, Math.max(0.02, Math.sqrt(bestA) * 57 / 60)), lon = pl[0] / k, lat = pl[1];
          if (f.id === ANTARCTICA) { lon = 0; lat = -80; }
          var span = spanAt([best], lon, lat) || [lon - 1, lon + 1];
          var name = SHORT_NAMES[f.properties.name] || f.properties.name;
          list[i] = { i: i, id: f.id, text: name.toLocaleUpperCase("en"), lat: lat, lon: f.id === ANTARCTICA ? lon : (span[0] + span[1]) / 2, span: f.id === ANTARCTICA ? [-180, 180] : span, area: bestA, total: total, polys: polys, v: G.toVec(lon, lat) };
        }
        i++;
      }
      if (i < features.length) { if (window.requestIdleCallback) requestIdleCallback(step, { timeout: 400 }); else setTimeout(step, 16); return; }
      labelInfo = list;
      labelOrder = list.filter(Boolean).sort(function (p, q) { return q.area - p.area; });
      labelBuilding = false;
      scheduleRender("full");
    };
    if (window.requestIdleCallback) requestIdleCallback(step, { timeout: 400 }); else setTimeout(step, 16);
  }
  var glyphW = new Map();
  function advance(ch, fs) {
    var key = fs + "|" + ch, w = glyphW.get(key);
    if (w == null) { w = ctx.measureText(ch).width; glyphW.set(key, w); }
    return w;
  }
  function parallelPath(lat, lonC, lonL, lonR, need) {
    var phi = lat * RAD, cosP = Math.max(0.05, Math.cos(phi)), out = { pts: [[0, 0, 0]], left: 0, right: 0 };
    var stepDeg = Math.max(0.01, Math.min(2, 2.5 / (B.r * cosP) / RAD));
    var v = G.toVec(lonC, lat);
    if (!screenOf(lonC, lat, v[0], v[1], v[2])) return null;
    var c0x = FX, c0y = FY;
    out.pts[0] = [FX, FY, 0];
    var sides = [[-1, lonL], [1, lonR]];
    for (var s = 0; s < 2; s++) {
      var dir = sides[s][0], lim = sides[s][1], acc = 0, px = c0x, py = c0y, arr = [];
      for (var k = 1; k < 600 && acc < need; k++) {
        var lo = lonC + dir * k * stepDeg;
        if (dir < 0 ? lo < lim : lo > lim) break;
        var w = G.toVec(lo, lat);
        if (!flat && w[0] * B.cx + w[1] * B.cy + w[2] * B.cz < 0.12) break;
        screenOf(lo, lat, w[0], w[1], w[2]);
        acc += Math.hypot(FX - px, FY - py); px = FX; py = FY;
        arr.push([FX, FY, dir * acc]);
      }
      if (dir < 0) { out.left = acc; out.pts = arr.reverse().concat(out.pts); } else { out.right = acc; out.pts = out.pts.concat(arr); }
    }
    return out;
  }
  function pointAt(pts, s) {
    var lo = 0, hi = pts.length - 1;
    if (s <= pts[0][2]) lo = hi = 0;
    else if (s >= pts[hi][2]) lo = hi;
    else { while (hi - lo > 1) { var m = (lo + hi) >> 1; if (pts[m][2] <= s) lo = m; else hi = m; } }
    var a = pts[lo], b = pts[Math.min(hi, pts.length - 1)];
    if (lo === hi) { b = pts[Math.min(lo + 1, pts.length - 1)]; a = lo === b ? pts[Math.max(0, lo - 1)] : a; }
    var t = b[2] - a[2] ? (s - a[2]) / (b[2] - a[2]) : 0;
    var A = pts[Math.max(0, lo === hi ? lo - 1 : lo)], Bp = pts[Math.min(pts.length - 1, lo === hi ? lo + 1 : hi)];
    return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), Math.atan2(Bp[1] - A[1], Bp[0] - A[0])];
  }
  function drawCountryLabels() {
    labelBoxes = [];
    if (!labelInfo) { if (!labelBuilding && features.length) buildLabelInfo(); return; }
    var r = B.r, sw = W, sh = H, centerLL = null, placedAny = 0;
    var margin = 6;
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    for (var o = 0; o < labelOrder.length && placedAny < 80; o++) {
      var L = labelOrder[o];
      var areaPx = L.area * r * r;
      var fs = Math.min(17, Math.sqrt(areaPx) / 7.5);
      if (fs < 8.5) continue;
      fs = Math.round(fs * 2) / 2;
      var lat = L.lat, lonC = L.lon, span = L.span;
      var onScreen = screenOf(L.lon, L.lat, L.v[0], L.v[1], L.v[2]) && FX > margin && FY > margin && FX < sw - margin && FY < sh - margin;
      if (!onScreen) {
        if (areaPx < sw * sh * 0.25) continue;
        if (!centerLL) { centerLL = projection.invert([cx, cy]) || false; }
        if (!centerLL || !d3.geoContains({ type: "MultiPolygon", coordinates: L.polys }, centerLL)) continue;
        lat = centerLL[1];
        span = spanAt(L.polys, centerLL[0], lat);
        if (!span) continue;
        lonC = centerLL[0];
      }
      for (var tries = 0; tries < 2; tries++) {
        ctx.font = "500 " + fs + "px " + LABEL_FONT;
        var ls = fs * 0.16, chars = L.text.split(""), adv = chars.map(function (ch) { return advance(ch, fs); });
        var total = adv.reduce(function (p, q) { return p + q; }, 0) + ls * (chars.length - 1);
        var pp = parallelPath(lat, lonC, span[0], span[1], total / 2 + fs);
        if (!pp) break;
        if (pp.left < total / 2 || pp.right < total / 2) { if (fs > 9) { fs = Math.max(8.5, Math.round(fs * 0.8 * 2) / 2); continue; } pp = null; }
        break;
      }
      if (!pp) continue;
      var c0 = pointAt(pp.pts, 0), flip = Math.cos(c0[2]) < 0;
      if (pp.pts.length < 3) continue;
      var pos = [], s = -total / 2, ok = true;
      for (var g = 0; g < chars.length; g++) {
        var at = s + adv[g] / 2, q = pointAt(pp.pts, flip ? -at : at);
        if (q[0] < margin || q[1] < margin || q[0] > sw - margin || q[1] > sh - margin) { ok = false; break; }
        if (flat && !projection.invert([q[0], q[1]])) { ok = false; break; }
        pos.push(q); s += adv[g] + ls;
      }
      if (!ok) continue;
      var half = fs * 0.62, clash = false, boxes = [];
      for (g = 0; g < pos.length && !clash; g++) {
        var bx = { x: pos[g][0] - half, y: pos[g][1] - half, w: 2 * half, h: 2 * half };
        for (var k = 0; k < labelBoxes.length; k++) { var b = labelBoxes[k]; if (bx.x < b.x + b.w + 2 && bx.x + bx.w + 2 > b.x && bx.y < b.y + b.h + 2 && bx.y + bx.h + 2 > b.y) { clash = true; break; } }
        boxes.push(bx);
      }
      if (clash) continue;
      Array.prototype.push.apply(labelBoxes, boxes);
      placedAny++;
      ctx.font = "500 " + fs + "px " + LABEL_FONT;
      for (var pass = 0; pass < 2; pass++) {
        if (pass === 0) { ctx.strokeStyle = pal["country-halo"] || pal["label-halo"]; ctx.lineWidth = Math.max(2, fs * 0.24); }
        else ctx.fillStyle = pal["country-label"] || pal.label;
        for (g = 0; g < pos.length; g++) {
          ctx.save();
          ctx.translate(pos[g][0], pos[g][1]);
          ctx.rotate(pos[g][2] + (flip ? Math.PI : 0));
          if (pass === 0) ctx.strokeText(chars[g], 0, 0); else ctx.fillText(chars[g], 0, 0);
          ctx.restore();
        }
      }
    }
    ctx.restore();
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
    var placed = labelBoxes.slice(), pad = 3;
    for (var i = 0; i < cities.length; i++) {
      var c = cities[i];
      if (c.tier > show) break;
      if (!screenOf(c.lon, c.lat, c.x, c.y, c.z)) continue;
      var px = FX, py = FY;
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
        if (!screenOf(c.lon, c.lat, c.x, c.y, c.z)) continue;
        px = FX; py = FY;
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
    if (flat) return true;
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
  canvas.addEventListener("focus", function () { canvas.classList.toggle("show-ring", !focusByPointer); scheduleRender("full"); });
  canvas.addEventListener("blur", function () { canvas.classList.remove("show-ring"); scheduleRender("full"); });
  function degPerPx() { return 180 / (Math.PI * projection.scale() * (flat ? 0.8707 : 1)); }

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
    if (flat) return;
    sat.draw({ dpr: dpr, light: 0, detail: detail.shown && !detail.off, cx: cx, cy: cy, r: B.r, e: [B.ex, B.ey, B.ez], n: [B.nx, B.ny, B.nz], c: [B.cx, B.cy, B.cz] });
  }
  function setProjection(on) {
    flat = !!on;
    projection = flat ? flatProjection : globeProjection;
    path = d3.geoPath(projection, ctx);
    labelCache.clear();
    applyView();
  }
  var mapFade = null;
  function setFlat(on, opts) {
    opts = opts || {};
    if (!!on === flat) return;
    stopFly(); stopInertia(); anim = null;
    if (!reduceMotion && !opts.instant && canvas.width) {
      var snap = document.createElement("canvas");
      snap.width = canvas.width; snap.height = canvas.height;
      snap.getContext("2d").drawImage(canvas, 0, 0);
      snap.className = "gc-map-fade"; snap.style.width = W + "px"; snap.style.height = H + "px";
      canvas.parentNode.insertBefore(snap, canvas.nextSibling);
      if (mapFade) mapFade.remove();
      mapFade = snap;
      requestAnimationFrame(function () { requestAnimationFrame(function () { snap.classList.add("is-going"); }); });
      setTimeout(function () { snap.remove(); if (mapFade === snap) mapFade = null; }, 420);
    }
    var lon = view.lon;
    setProjection(on);
    view.lon = lon; view.lat = flat ? 20 : view.lat; view.zoom = 1;
    applyView();
    var btn = $("flat-btn");
    btn.setAttribute("aria-pressed", String(flat));
    $("sat-btn").disabled = flat || !!$("sat-btn").dataset.noWebgl;
    document.documentElement.classList.toggle("gc-flat", flat);
    try { localStorage.setItem("gc-map", flat ? "flat" : "globe"); } catch (e) {}
    if (!opts.quiet) writeUrl();
    var t = fitTarget();
    if (t && !t.single) { view.lon = t.lon; view.lat = t.lat; view.zoom = t.zoom; applyView(); }
    else if (t) { view.lon = t.lon; applyView(); }
    scheduleRender("full");
  }
  $("flat-btn").addEventListener("click", function () { setFlat(!flat); });
  document.addEventListener("keydown", function (e) {
    if ((e.key === "m" || e.key === "M") && !e.metaKey && !e.ctrlKey && !e.altKey) {
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault(); setFlat(!flat);
    }
  });
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
      $("sat-btn").disabled = true; $("sat-btn").dataset.noWebgl = "1";
      $("sat-btn").dataset.tip = "The satellite view needs WebGL, which this browser does not offer"; $("sat-btn").dataset.tipSub = "";
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
    if (!flat && Math.hypot(x - cx, y - cy) > projection.scale()) return null;
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
    if (flat) return;
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
    else if (e.key === "Enter") {
      e.preventDefault();
      if (drawing && drawing.tool !== "polygon") return;
      if (drawing) { e.stopPropagation(); click(cx, cy, false); return; }
      var had = { a: state.a, b: state.b, n: state.avoid.size };
      click(cx, cy, e.shiftKey);
      if (!pop.hidden) return;
      var say = "";
      if (state.avoid.size !== had.n) say = state.avoid.size > had.n ? "Avoiding " + joinNames(Array.from(state.avoid.values())) : "Stopped avoiding a country";
      else if (state.a !== had.a && state.a) say = "A is " + (state.a.label || fmtLonLat(state.a));
      else if (state.b !== had.b && state.b) say = "B is " + (state.b.label || fmtLonLat(state.b));
      if (say) { $("status").textContent = ""; setTimeout(function () { $("status").textContent = say; }, 30); }
      return;
    }
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
      tipHere = here ? [here[0], here[1], dp] : null;
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
  var tip = $("tip"), tipAt = null, tipHere = null, tipCopied = false, tipCopiedTimer = 0;
  document.addEventListener("keydown", function (e) {
    if ((e.key !== "c" && e.key !== "C") || e.metaKey || e.ctrlKey || e.altKey || tip.hidden || !tipHere) return;
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (!navigator.clipboard || !navigator.clipboard.writeText) return;
    e.preventDefault();
    var text = tipHere[1].toFixed(tipHere[2] + 2) + ", " + tipHere[0].toFixed(tipHere[2] + 2);
    navigator.clipboard.writeText(text).then(function () {
      tipCopied = true;
      var at = tip.querySelector(".gc-tip-at"); if (at) at.textContent = "Copied";
      $("status").textContent = "Copied " + text;
      clearTimeout(tipCopiedTimer);
      tipCopiedTimer = setTimeout(function () { tipCopied = false; var at2 = tip.querySelector(".gc-tip-at"); if (at2 && tipAt) at2.textContent = tipAt + " | C to copy"; }, 1200);
    }, function () {});
  });
  function showTip(x, y, main, sub, note) {
    if (pop && !pop.hidden) { hideTip(); return; }
    tip.innerHTML = "";
    if (main) { var b = document.createElement("b"); b.textContent = main; b.style.fontWeight = "400"; tip.appendChild(b); }
    if (sub) { var s = document.createElement("small"); s.textContent = sub; tip.appendChild(s); }
    if (note) { var n = document.createElement("small"); n.textContent = note; tip.appendChild(n); }
    if (tipAt) { var c = document.createElement("small"); c.className = "gc-tip-at"; c.textContent = tipCopied ? "Copied" : tipAt + " | C to copy"; tip.appendChild(c); }
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
    if (flat) {
      var dl = ((lon - view.lon + 540) % 360) - 180;
      fly = { t0: performance.now(), ms: Math.min(1200, 450 + Math.hypot(dl, lat - view.lat) * 4), flat: { l0: view.lon, dl: dl, p0: view.lat, p1: lat }, z0: view.zoom, z1: Math.max(FLAT_MIN, toZoom), done: done };
      interacting = 1;
      requestAnimationFrame(flyStep);
      return;
    }
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
    if (fly.flat) { view.lon = fly.flat.l0 + fly.flat.dl * e; view.lat = fly.flat.p0 + (fly.flat.p1 - fly.flat.p0) * e; }
    else { var ang = versorToAngles(fly.interp(e)); view.lon = -ang[0]; view.lat = -ang[1]; }
    view.zoom = fly.z0 * Math.pow(fly.z1 / fly.z0, e);
    applyView();
    if (t >= 1) { var d = fly.done; fly = null; interacting = 0; scheduleRender("full"); if (d) d(); return; }
    scheduleRender("coarse");
    requestAnimationFrame(flyStep);
  }
  function stopFly() { if (fly) { fly = null; interacting = 0; } }

  function fitRoute(always) {
    var t = fitTarget();
    if (!t) return;
    if (t.single) { flyTo(t.lon, t.lat); return; }
    if (!always && allVisible(t.all)) return;
    flyTo(t.lon, t.lat, t.zoom);
  }
  function fitTarget() {
    var pts = [];
    if (state.a) pts.push([state.a.lon, state.a.lat]);
    if (state.b) pts.push([state.b.lon, state.b.lat]);
    if (state.result && state.result.status === "done" && state.result.waypoints) pts = state.result.waypoints.slice();
    if (!pts.length) return null;
    if (pts.length === 1) return { single: true, lon: pts[0][0], lat: pts[0][1] };
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
    if (flat) {
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      all.forEach(function (v) {
        var q = G.toLonLat(v), lam = wrapPi((q[0] - ll[0]) * RAD), phi = q[1] * RAD, xx = lam * neA(phi), yy = neY(phi);
        if (xx < minX) minX = xx; if (xx > maxX) maxX = xx; if (yy < minY) minY = yy; if (yy > maxY) maxY = yy;
      });
      var freeW2 = W - panelRight - 48, freeH2 = 2 * halfFreeH - 48;
      zoom = Math.max(FLAT_MIN, Math.min(MAX_ZOOM, Math.min(freeW2 / (flatBase * Math.max(maxX - minX, 0.02)), freeH2 / (flatBase * Math.max(maxY - minY, 0.02)))));
      var midX = (minX + maxX) / 2, midY = (minY + maxY) / 2, latC = d3.geoNaturalEarth1Raw.invert(0, midY)[1];
      return { lon: ll[0] + midX / neA(latC) / RAD, lat: latC / RAD, zoom: zoom, all: all };
    }
    if (far > 1.35) zoom = 1;
    else {
      var free = Math.min(W - panelRight, H - (W <= 640 ? sheetVisible(Math.min(sheetMode, SHEET_HALF)) + 72 : 60)) / 2 - 24;
      zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, free / (base * Math.max(Math.sin(far) * 1.12, 0.06))));
    }
    return { lon: ll[0], lat: ll[1], zoom: zoom, all: all };
  }
  function allVisible(vecs) {
    var rot = projection.rotate(), c = G.toVec(-rot[0], -rot[1]);
    for (var i = 0; i < vecs.length; i++) {
      if (!flat && G.angleBetween(c, vecs[i]) > Math.PI / 2 - 0.05) return false;
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
    var here = function (slot) {
      return function () {
        if (city) setPoint(slot, { lon: city.lon, lat: city.lat, label: cityLabel + ", " + ((places && places.countries[city.cc]) || city.cc) });
        else setPoint(slot, { lon: ll[0], lat: ll[1], label: null, country: f ? f.properties.name : null });
      };
    };
    popActions.push({ label: "Move A here", fn: here("a") });
    popActions.push({ label: "Move B here", fn: here("b") });
    var box = $("pop-actions");
    box.innerHTML = "";
    popActions.forEach(function (a, i) {
      var b = document.createElement("button"); b.type = "button"; b.className = "gc-btn gc-btn-quiet"; b.dataset.action = i; b.textContent = a.label;
      box.appendChild(b);
    });
    hideTip();
    pop.hidden = false;
    var w = pop.offsetWidth, hh = pop.offsetHeight;
    pop.style.left = Math.max(8, Math.min(W - w - 8, x + 12)) + "px";
    pop.style.top = Math.max(8, Math.min(H - hh - 8, y + 12)) + "px";
    box.firstChild.focus({ preventScroll: true });
  }
  function closePop(back, byPointer) {
    if (pop.hidden) return;
    pop.hidden = true;
    if (back) { focusByPointer = !!byPointer; canvas.focus({ preventScroll: true }); focusByPointer = false; }
  }
  pop.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("button[data-action]");
    if (!b) return;
    var a = popActions[+b.dataset.action];
    closePop(true, e.detail > 0);
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

  $("clear-a").addEventListener("click", function () { withUndo("From cleared", function () { setPoint("a", null); }); inputs.a.focus(); });
  $("clear-b").addEventListener("click", function () { withUndo("To cleared", function () { setPoint("b", null); }); inputs.b.focus(); });
  var swapTimer = null;
  $("swap").addEventListener("click", function () {
    var a = state.a, b = state.b;
    if (!a && !b) {
      var btn = $("swap"), hint = $("hint");
      btn.classList.remove("is-shaking"); void btn.offsetWidth; btn.classList.add("is-shaking");
      hint.textContent = "Nothing to swap yet: pick a From and a To first";
      hint.classList.add("is-nudge");
      $("status").textContent = "Nothing to swap yet";
      clearTimeout(swapTimer);
      swapTimer = setTimeout(function () { btn.classList.remove("is-shaking"); hint.classList.remove("is-nudge"); updateHint(); }, 2200);
      return;
    }
    state.a = b; state.b = a;
    setPoint("a", state.a, { quiet: true }); setPoint("b", state.b, { quiet: true });
    commitPoint("a");
  });

  function snapshot() {
    return { a: state.a, b: state.b, avoid: new Map(state.avoid), regions: state.regions.map(function (r) { return Object.assign({}, r, { points: r.points && r.points.slice(), center: r.center && r.center.slice() }); }), bufferKm: state.bufferKm };
  }
  var undoTimer = 0, undoSnap = null;
  function offerUndo(text, snap) {
    undoSnap = snap;
    var box = $("undo");
    $("undo-text").textContent = text;
    box.hidden = false;
    box.classList.remove("is-shown"); void box.offsetWidth; box.classList.add("is-shown");
    $("status").textContent = text + ". Undo is available.";
    clearTimeout(undoTimer);
    undoTimer = setTimeout(hideUndo, 6000);
  }
  function hideUndo() { clearTimeout(undoTimer); undoSnap = null; var box = $("undo"); box.classList.remove("is-shown"); setTimeout(function () { if (!undoSnap) box.hidden = true; }, 200); }
  $("undo-btn").addEventListener("click", function () {
    var s = undoSnap;
    if (!s) return;
    hideUndo();
    state.avoid = s.avoid; state.regions = s.regions; state.bufferKm = s.bufferKm;
    selected = null;
    setPoint("a", s.a, { quiet: true }); setPoint("b", s.b, { quiet: true });
    state.tab = null;
    renderChips(); renderOptionChips(); updateHint();
    fitPending = true; state.stale = true;
    requestRoute(); writeUrl(); scheduleRender("full");
    $("status").textContent = "Undone";
  });
  function withUndo(text, fn) { var s = snapshot(); fn(); offerUndo(text, s); }
  function toggleAvoid(id, name) {
    if (state.avoid.has(id)) { withUndo((name || state.avoid.get(id)) + " allowed again", function () { state.avoid.delete(id); avoidChanged(); }); return; }
    state.avoid.set(id, name);
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
      x.addEventListener("click", function () { var nm = state.avoid.get(id); withUndo(nm + " removed", function () { state.avoid.delete(id); avoidChanged(); }); });
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
      x.addEventListener("click", function () { withUndo(r.name + " removed", function () { removeRegion(r); }); });
      li.appendChild(x);
      ul.appendChild(li);
    });
    renderOptionChips();
    if (state.avoid.size + state.regions.length > 1) {
      var li2 = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button"; b.className = "gc-linkbtn"; b.textContent = "clear all"; b.style.fontSize = "13px";
      b.addEventListener("click", function () { withUndo("Cleared everything avoided", function () { state.avoid.clear(); state.regions = []; selected = null; avoidChanged(); }); });
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

  function recentPlaces() {
    try { var v = JSON.parse(localStorage.getItem("gc-recent") || "[]"); return Array.isArray(v) ? v.filter(function (r) { return r && isFinite(r.lon) && isFinite(r.lat) && r.label; }).slice(0, 6) : []; } catch (e) { return []; }
  }
  function rememberPlace(p) {
    var list = recentPlaces().filter(function (r) { return r.label !== p.label; });
    list.unshift(p);
    try { localStorage.setItem("gc-recent", JSON.stringify(list.slice(0, 6))); } catch (e) {}
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
      all: function () { return recentPlaces().filter(function (r) { var o = slot === "a" ? state.b : state.a; return !o || o.label !== r.label; }); },
      main: function (r) { return r.kind >= 3 ? r.label : placeLabel(r); },
      sub: function (r) { return r.kind === 3 ? r.sub : r.kind === 4 ? "coordinates" : r.kind === 5 ? r.sub : placeSub(r); },
      kind: function (r) { return r.kind === 3 ? "place" : r.kind === 4 ? "" : r.kind === 5 ? "recent" : placeKind(r); },
      pick: function (r) {
        var label = r.kind >= 3 ? r.label : placeLabel(r);
        rememberPlace({ kind: 5, lon: r.lon, lat: r.lat, label: label, sub: r.kind === 5 ? r.sub : r.kind === 3 ? r.sub || "" : r.kind === 4 ? "coordinates" : placeSub(r) || "" });
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
      if (m.status === "done" && fitPending && !drag) routeDrawn();
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

  var ANTARCTICA = "010";
  var P = GreatCirclePanel({
    state: state, $: $, panel: panel, fmt: fmt, scheduleRender: scheduleRender, joinNames: joinNames, requestRoute: requestRoute,
    names: names, featureById: featureById, avoidChanged: avoidChanged, writeUrl: writeUrl, uniqueBase: uniqueBase,
    removeRegion: removeRegion, regionById: regionById, canHover: canHover, avoidedNames: avoidedNames, visible: visible,
    setSheet: setSheet, layout: layout, fmtLonLat: fmtLonLat, flyTo: flyTo, fitRoute: fitRoute, ANTARCTICA: ANTARCTICA,
    W: function () { return W; }, setFitPending: function (v) { fitPending = v; },
    reduceMotion: function () { return reduceMotion; }, tabChanged: function (prev) { tabChanged(prev); }, makeCard: makeCard
  });
  var renderPanel = P.renderPanel, renderBusy = P.renderBusy, announce = P.announce, currentTab = P.currentTab, detourOf = P.detourOf,
    renderOptionChips = P.renderOptionChips, bufferMi = P.bufferMi, MI_KM = P.MI_KM, BUFFER_DEFAULT_MI = P.BUFFER_DEFAULT_MI;
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
    if ((state.avoid.size || state.regions.length) && Math.abs(state.bufferKm - BUFFER_DEFAULT_MI * MI_KM) > 0.01) {
      var bu = UNITS[state.units];
      p.push("buf=" + Math.round(state.bufferKm * bu.f) + bu.label);
    }
    if (state.tab && state.a && state.b && (!state.result || currentTab() === state.tab)) p.push("tab=" + state.tab);
    if (state.a && state.b && state.a.label && state.b.label) {
      try { localStorage.setItem("gc-last", JSON.stringify({ hash: p.join("&"), text: P.endName("a") + " \u2192 " + P.endName("b") })); } catch (e) {}
    }
    if (flat) p.push("map=flat");
    if (state.wind) p.push("wind=" + (state.windMonth != null ? ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"][state.windMonth] : "1"));
    var h = p.length ? "#" + p.join("&") : "";
    if (h !== location.hash) history.replaceState(null, "", h || location.pathname + location.search);
  }
  var wantFlat = null;
  function readUrl() {
    var h = location.hash.replace(/^#/, "");
    wantFlat = null;
    state.a = null; state.b = null; state.avoid.clear(); state.regions = []; selected = null; state.bufferKm = BUFFER_DEFAULT_MI * MI_KM; state.tab = null; state.wind = false; state.windMonth = null;
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
      } else if (k === "map") {
        wantFlat = v === "flat";
      } else if (k === "wind") {
        var wmi = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(v);
        state.wind = v === "1" || wmi >= 0;
        state.windMonth = wmi >= 0 && wmi !== new Date().getMonth() ? wmi : null;
      } else if (k === "tab") {
        if (v === "direct" || v === "avoid" || v === "plan") state.tab = v;
      } else if (k === "buf") {
        var bk = parseFloat(v), per = /nmi$/.test(v) ? 1.852 : /mi$/.test(v) ? MI_KM : 1;
        if (isFinite(bk) && bk >= 0) state.bufferKm = bufferMi(bk * per) * MI_KM;
      }
    });
    return any;
  }

  Array.prototype.forEach.call(document.querySelectorAll(".gc-about"), function (box) {
    var btn = box.querySelector(".gc-about-btn");
    if (!btn) return;
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
  });

  (function () {
    var tipEl = document.createElement("div"), shown = null;
    tipEl.className = "gc-ctl-tip"; tipEl.hidden = true; tipEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(tipEl);
    var ctls = document.querySelectorAll(".gc-ctl[title]");
    Array.prototype.forEach.call(ctls, function (el) {
      if (!el.dataset.tip) el.dataset.tip = el.getAttribute("title");
      el.removeAttribute("title");
      el.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") show(el); });
      el.addEventListener("pointerleave", hide);
      el.addEventListener("focus", function () { if (el.matches(":focus-visible")) show(el); });
      el.addEventListener("blur", hide);
      el.addEventListener("click", function () { if (shown === el) setTimeout(function () { if (shown === el) show(el); }, 0); });
    });
    function show(el) {
      shown = el;
      var on = el.getAttribute("aria-pressed") === "true" || el.getAttribute("aria-expanded") === "true";
      var title = on && el.dataset.tipOn ? el.dataset.tipOn : el.dataset.tip, sub = on && el.dataset.tipOn ? "" : (el.dataset.tipSub || "");
      tipEl.innerHTML = "";
      var b = document.createElement("b"); b.textContent = title; tipEl.appendChild(b);
      if (sub) { var s = document.createElement("span"); s.textContent = sub; tipEl.appendChild(s); }
      tipEl.hidden = false;
      var r = el.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
      var left = r.left - w - 10;
      if (left < 8) left = Math.min(window.innerWidth - w - 8, r.right + 10);
      tipEl.style.left = left + "px";
      tipEl.style.top = Math.max(8, Math.min(window.innerHeight - h - 8, r.top + r.height / 2 - h / 2)) + "px";
    }
    function hide() { shown = null; tipEl.hidden = true; }
  })();

  var SHEET_PEEK = 0, SHEET_HALF = 1, SHEET_FULL = 2;
  var sheetMode = SHEET_PEEK, sheetGestureAt = 0, sheetY = 0;
  function sheetHeight() { return panel.getBoundingClientRect().height || H; }
  function peekPx() {
    var top = panel.getBoundingClientRect().top, end;
    if (panel.classList.contains("has-result")) {
      var delta = $("hero-delta");
      end = delta && !delta.hidden && delta.textContent ? delta : ($("hero-top") || $("result"));
    } else end = document.querySelector(".gc-route-card");
    var px = end ? end.getBoundingClientRect().bottom - top + 12 : 220;
    return Math.max(150, Math.min(px, H * 0.5));
  }
  function sheetVisible(mode) {
    var full = sheetHeight(), peek = Math.min(peekPx(), full);
    if (mode === SHEET_FULL) return full;
    if (mode === SHEET_HALF) return Math.min(full, Math.max(peek, Math.round(H * 0.56)));
    return peek;
  }
  function sheetYFor(mode) { return sheetHeight() - sheetVisible(mode); }
  function placeSheet() {
    if (W > 640) { panel.style.removeProperty("--sheet-y"); return; }
    sheetY = sheetYFor(sheetMode);
    panel.style.setProperty("--sheet-y", sheetY + "px");
  }
  function setSheetMode(mode) {
    mode = Math.max(SHEET_PEEK, Math.min(SHEET_FULL, mode));
    sheetMode = mode;
    var full = mode === SHEET_FULL;
    panel.classList.toggle("is-open", full);
    panel.classList.toggle("is-half", mode === SHEET_HALF);
    document.querySelector(".gc-controls").classList.toggle("is-lifted", full);
    $("sheet-handle").setAttribute("aria-expanded", String(full));
    $("sheet-handle").setAttribute("aria-label", full ? "Show less" : "Show more");
    if (!full) panel.scrollTop = 0;
    placeSheet();
    var settle = function () { layout(); scheduleRender("full"); if (state.result && state.result.status === "done" && mode !== SHEET_FULL) fitRoute(false); };
    if (reduceMotion) settle(); else { clearTimeout(setSheetMode.t); setSheetMode.t = setTimeout(settle, 340); }
  }
  function setSheet(open) { setSheetMode(open ? SHEET_FULL : SHEET_HALF); }
  $("sheet-handle").addEventListener("click", function () {
    if (performance.now() - sheetGestureAt < 500) return;
    setSheetMode(sheetMode === SHEET_FULL ? SHEET_PEEK : sheetMode + 1);
  });
  [inputs.a, inputs.b, $("in-avoid")].forEach(function (inp) {
    inp.addEventListener("focus", function () {
      if (W <= 640 && sheetMode !== SHEET_FULL && performance.now() - sheetGestureAt > 500) setSheet(true);
    });
  });
  if (window.visualViewport) {
    var kbUpdate = function () {
      var vv = window.visualViewport;
      var kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      panel.style.setProperty("--kb", (W <= 640 ? kb : 0) + "px");
      if (W <= 640) placeSheet();
    };
    window.visualViewport.addEventListener("resize", kbUpdate);
    window.visualViewport.addEventListener("scroll", kbUpdate);
  }

  var sheetDrag = null;
  panel.addEventListener("pointerdown", function (e) {
    if (W > 640 || e.pointerType === "mouse") return;
    if (e.target.closest && e.target.closest(".gc-opt-chips, input, .gc-suggest")) return;
    sheetDrag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, y: sheetY, t: performance.now(), v: 0, last: e.clientY, engaged: false,
      onHandle: !!(e.target.closest && e.target.closest(".gc-sheet-handle")) };
  });
  panel.addEventListener("pointermove", function (e) {
    var d = sheetDrag;
    if (!d || e.pointerId !== d.id) return;
    var dy = e.clientY - d.y0, dx = e.clientX - d.x0;
    if (!d.engaged) {
      if (Math.abs(dy) < 8 || Math.abs(dy) < Math.abs(dx) * 1.2) return;
      if (sheetMode === SHEET_FULL && !d.onHandle && !(panel.scrollTop <= 0 && dy > 0)) { sheetDrag = null; return; }
      d.engaged = true;
      try { panel.setPointerCapture(e.pointerId); } catch (err) {}
      panel.classList.add("is-dragging");
      if (document.activeElement && panel.contains(document.activeElement)) document.activeElement.blur();
    }
    var now = performance.now();
    d.v = 0.8 * ((e.clientY - d.last) / Math.max(1, now - d.t)) + 0.2 * d.v;
    d.last = e.clientY; d.t = now;
    var y = d.y + dy, lo = sheetYFor(SHEET_FULL), hi = sheetYFor(SHEET_PEEK);
    if (y < lo) y = lo - (lo - y) * 0.35;
    if (y > hi) y = hi + (y - hi) * 0.35;
    panel.style.setProperty("--sheet-y", y + "px");
    e.preventDefault();
  });
  function endSheetDrag(e) {
    var d = sheetDrag;
    if (!d || e.pointerId !== d.id) return;
    sheetDrag = null;
    if (!d.engaged) return;
    sheetGestureAt = performance.now();
    panel.classList.remove("is-dragging");
    var y = d.y + (e.clientY - d.y0), aim = y + d.v * 200, best = SHEET_PEEK, bestD = Infinity;
    [SHEET_PEEK, SHEET_HALF, SHEET_FULL].forEach(function (m) { var dd = Math.abs(sheetYFor(m) - aim); if (dd < bestD) { bestD = dd; best = m; } });
    setSheetMode(best);
  }
  $("ways-btn").addEventListener("click", function () { if (W <= 640 && sheetMode !== SHEET_FULL) setSheetMode(SHEET_FULL); });
  var fadeQueued = false;
  function updateFades() {
    fadeQueued = false;
    var max = panel.scrollHeight - panel.clientHeight;
    panel.classList.toggle("is-scrolled", panel.scrollTop > 2);
    panel.classList.toggle("has-more", panel.scrollTop < max - 2);
  }
  function queueFades() { if (!fadeQueued) { fadeQueued = true; requestAnimationFrame(updateFades); } }
  panel.addEventListener("scroll", queueFades, { passive: true });
  window.addEventListener("resize", queueFades);
  if (window.ResizeObserver) {
    var fadeRo = new ResizeObserver(queueFades);
    fadeRo.observe(panel);
    Array.prototype.forEach.call(panel.children, function (el) { fadeRo.observe(el); });
  }
  queueFades();
  panel.addEventListener("pointerup", endSheetDrag);
  panel.addEventListener("pointercancel", function (e) {
    var d = sheetDrag;
    if (!d || e.pointerId !== d.id) return;
    sheetDrag = null;
    panel.classList.remove("is-dragging");
    if (d.engaged) setSheetMode(sheetMode);
  });

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
    try {
      var last = JSON.parse(localStorage.getItem("gc-last") || "null");
      var ex = $("examples");
      if (last && last.hash && last.text && !ex.querySelector('a[href="#' + last.hash + '"]')) {
        var link = document.createElement("a");
        link.className = "gc-example gc-example-last"; link.href = "#" + last.hash;
        link.textContent = "Your last route: " + last.text;
        ex.insertBefore(link, ex.querySelector(".gc-example"));
      }
    } catch (e) {}

    try { var u = localStorage.getItem("gc-units"); if (UNITS[u]) state.units = u; } catch (e) {}

    refreshPalette();
    layout();
    try { if (localStorage.getItem("gc-satellite") === "1") setSatellite(true); } catch (e) {}
    var fromUrl = readUrl();
    var startFlat = wantFlat;
    if (startFlat === null) { try { startFlat = localStorage.getItem("gc-map") === "flat"; } catch (e) { startFlat = false; } }
    if (startFlat) setFlat(true, { instant: true, quiet: true });
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

  var lastW = window.innerWidth;
  window.addEventListener("resize", function () {
    var typing = document.activeElement && document.activeElement.tagName === "INPUT" && panel.contains(document.activeElement);
    if (window.innerWidth <= 640 && typing && window.innerWidth === lastW) { placeSheet(); return; }
    lastW = window.innerWidth;
    layout(); scheduleRender("full");
  });
  new MutationObserver(function () { refreshPalette(); scheduleRender("full"); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { scheduleRender("full"); });
  window.addEventListener("hashchange", function () {
    readUrl();
    if (!!wantFlat !== flat) setFlat(!!wantFlat, { instant: true, quiet: true }); renderChips(); updateHint(); renderPanel(); fitPending = true; state.stale = true; requestRoute(); scheduleRender("full");
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

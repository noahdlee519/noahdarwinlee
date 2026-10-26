(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var canvas = $("globe");
  var ctx = canvas.getContext("2d");
  var R_KM = 6371.0088, D2R = Math.PI / 180, TAU = 2 * Math.PI, HALF_PI = Math.PI / 2;
  var SERIF = "'IM Fell English', 'Old Standard TT', Georgia, 'Times New Roman', serif";
  var UC = "../uchronia/";
  var STORE_FLAT = "chronia-flat";
  var PALETTE = 10;
  var SOFT_BEFORE = 1648;
  var START_YEAR = 1815;
  var LAST_YEAR = 2026;
  var KEEP_MAPS = 8;
  var phoneQuery = window.matchMedia("(max-width: 640px)");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover)").matches;

  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  function wrap180(x) { return ((x + 180) % 360 + 360) % 360 - 180; }
  function wrapPi(x) { return ((x + Math.PI) % TAU + TAU) % TAU - Math.PI; }
  function toVec(lon, lat) {
    var l = lon * D2R, p = lat * D2R, c = Math.cos(p);
    return [c * Math.cos(l), c * Math.sin(l), Math.sin(p)];
  }
  function normalize(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function fetchJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + " " + r.status);
      return r.json();
    });
  }

  var view = { lon: 15, lat: 32, zoom: 1 };
  var flat = false;
  var dpr = 1, W = 0, H = 0, cx = 0, cy = 0, baseR = 0, baseK = 0, freeT = 0, freeB = 0;
  var projection = d3.geoOrthographic().clipAngle(90).precision(0.35);
  var MIN_ZOOM = 0.6, MAX_ZOOM = 40;
  var FB = { k: 1, xc: 0, yc: 0, wrap: false, vmin: -Math.PI, vmax: Math.PI, pmin: -HALF_PI, pmax: HALF_PI };
  var B = { ex: 0, ey: 0, ez: 0, nx: 0, ny: 0, nz: 0, cx: 0, cy: 0, cz: 0, r: 1 };

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    sizeRelief();
    var phone = phoneQuery.matches;
    var timeH = $("time").getBoundingClientRect().height || 80;
    document.documentElement.style.setProperty("--ch-time-h", Math.round(timeH) + "px");
    var cardH = phone && !$("card").hidden ? $("card").getBoundingClientRect().height : 0;
    freeT = phone ? 58 : 76;
    freeB = H - timeH - cardH;
    cx = W / 2;
    cy = (freeT + freeB) / 2;
    baseR = Math.max(80, Math.min(W - 20, freeB - freeT) / 2 - 14);
    baseK = Math.max(20, Math.min((W - 24) / TAU, (freeB - freeT - 16) / Math.PI));
    applyView();
    placeTicks();
  }
  function zoomRange() {
    if (!flat) return [MIN_ZOOM, MAX_ZOOM];
    return [1, Math.max(2, MAX_ZOOM * baseR / baseK)];
  }
  function applyView() {
    var zr = zoomRange();
    view.zoom = Math.max(zr[0], Math.min(zr[1], view.zoom));
    if (flat) {
      var k = baseK * view.zoom;
      var xc = view.lon * D2R, yc = Math.max(-90, Math.min(90, view.lat)) * D2R;
      var x0 = -Math.PI + cx / k, x1 = Math.PI - (W - cx) / k;
      FB.wrap = k * TAU > W + 1;
      xc = FB.wrap ? wrapPi(xc) : x0 > x1 ? 0 : Math.max(x0, Math.min(x1, xc));
      var y0 = (freeB - cy) / k - HALF_PI, y1 = HALF_PI - (cy - freeT) / k;
      yc = y0 > y1 ? 0 : Math.max(y0, Math.min(y1, yc));
      view.lon = xc / D2R; view.lat = yc / D2R;
      FB.k = k; FB.xc = xc; FB.yc = yc;
      var margin = 40 / k;
      FB.vmin = FB.wrap ? xc - cx / k - margin : Math.max(-Math.PI, xc - cx / k - margin);
      FB.vmax = FB.wrap ? xc + (W - cx) / k + margin : Math.min(Math.PI, xc + (W - cx) / k + margin);
      FB.pmin = Math.max(-HALF_PI, yc - (H - cy) / k - margin);
      FB.pmax = Math.min(HALF_PI, yc + cy / k + margin);
    } else {
      view.lon = wrap180(view.lon);
      view.lat = Math.max(-89.5, Math.min(89.5, view.lat));
      projection.rotate([-view.lon, -view.lat, 0]).scale(baseR * view.zoom).translate([cx, cy]);
      var lon = view.lon * D2R, lat = view.lat * D2R;
      var sl = Math.sin(lon), cl = Math.cos(lon), sp = Math.sin(lat), cp = Math.cos(lat);
      B.ex = -sl; B.ey = cl; B.ez = 0;
      B.nx = -sp * cl; B.ny = -sp * sl; B.nz = cp;
      B.cx = cp * cl; B.cy = cp * sl; B.cz = sp;
      B.r = baseR * view.zoom;
    }
  }
  function localScale() { return (flat ? baseK : baseR) * view.zoom; }
  function kmPx() { return localScale() / R_KM; }

  function capOf(X, Y, Z, n, sx, sy, sz) {
    var c = Math.hypot(sx, sy, sz) > 1e-9 ? normalize([sx, sy, sz]) : [X[0], Y[0], Z[0]];
    var minDot = 1;
    for (var k = 0; k < n; k++) { var d = c[0] * X[k] + c[1] * Y[k] + c[2] * Z[k]; if (d < minDot) minDot = d; }
    return { cx: c[0], cy: c[1], cz: c[2], radius: Math.acos(Math.max(-1, Math.min(1, minDot))) };
  }
  function prepare(f) {
    var g = f.geometry || f;
    var polys = !g ? [] : g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    var rings = [], sx = 0, sy = 0, sz = 0, AX = [], AY = [], AZ = [];
    polys.forEach(function (poly) {
      poly.forEach(function (ring) {
        var n = ring.length, X = new Float64Array(n), Y = new Float64Array(n), Z = new Float64Array(n);
        for (var k = 0; k < n; k++) {
          var v = toVec(ring[k][0], ring[k][1]);
          X[k] = v[0]; Y[k] = v[1]; Z[k] = v[2]; sx += v[0]; sy += v[1]; sz += v[2];
          AX.push(v[0]); AY.push(v[1]); AZ.push(v[2]);
        }
        rings.push({ x: X, y: Y, z: Z, n: n });
      });
    });
    if (!rings.length) return { rings: [], cx: 1, cy: 0, cz: 0, radius: -10, geo: null };
    var cap = capOf(AX, AY, AZ, AX.length, sx, sy, sz);
    cap.rings = rings;
    cap.geo = g;
    return cap;
  }
  function preparePolys(f) {
    var g = f.geometry || f;
    var polys = !g ? [] : g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    return polys.map(function (poly) { return prepare({ type: "Polygon", coordinates: poly }); });
  }
  function prepareLine(coords) {
    var n = coords.length, X = new Float64Array(n), Y = new Float64Array(n), Z = new Float64Array(n), sx = 0, sy = 0, sz = 0;
    for (var k = 0; k < n; k++) { var v = toVec(coords[k][0], coords[k][1]); X[k] = v[0]; Y[k] = v[1]; Z[k] = v[2]; sx += v[0]; sy += v[1]; sz += v[2]; }
    var cap = capOf(X, Y, Z, n, sx, sy, sz);
    cap.x = X; cap.y = Y; cap.z = Z; cap.n = n;
    return cap;
  }
  function prepareArc(coords) {
    var parts = null, start = 0;
    for (var k = 1; k < coords.length; k++) {
      var a = coords[k - 1], b = coords[k];
      if ((Math.abs(a[0]) > 179.9999 && Math.abs(b[0]) > 179.9999) || (a[1] < -89.9999 && b[1] < -89.9999)) {
        if (!parts) parts = [];
        if (k - 1 > start) parts.push(coords.slice(start, k));
        start = k;
      }
    }
    if (!parts) return prepareLine(coords);
    if (coords.length - 1 > start) parts.push(coords.slice(start));
    var m = prepareLine(coords);
    m.parts = parts.map(prepareLine);
    return m;
  }
  function prepareLines(g) {
    if (!g) return [];
    var list = g.type === "MultiLineString" ? g.coordinates : g.type === "LineString" ? [g.coordinates] : [];
    return list.filter(function (c) { return c.length >= 2; }).map(prepareArc);
  }

  function featureInFront(f) {
    if (f.radius < -1) return false;
    var d = f.cx * B.cx + f.cy * B.cy + f.cz * B.cz;
    var theta = Math.acos(Math.max(-1, Math.min(1, d)));
    if (theta - f.radius > HALF_PI) return false;
    if (theta + f.radius < HALF_PI) {
      var px = cx + B.r * (f.cx * B.ex + f.cy * B.ey + f.cz * B.ez);
      var py = cy - B.r * (f.cx * B.nx + f.cy * B.ny + f.cz * B.nz);
      var rad = B.r * Math.sin(Math.min(f.radius, HALF_PI)) + 2;
      if (px + rad < 0 || px - rad > W || py + rad < 0 || py - rad > H) return false;
    }
    return true;
  }
  function rangeHits(a, b) {
    for (var s = -1; s <= 1; s++) { var sh = s * TAU; if (b + sh >= FB.vmin && a + sh <= FB.vmax) return true; }
    return false;
  }
  function featureInFlat(f) {
    if (f.radius < -1) return false;
    var lat = Math.asin(Math.max(-1, Math.min(1, f.cz))), r = f.radius;
    if (lat + r < FB.pmin || lat - r > FB.pmax) return false;
    if (r >= HALF_PI || Math.abs(lat) + r >= HALF_PI - 1e-6) return true;
    var hw = Math.asin(Math.min(1, Math.sin(r) / Math.cos(lat))) + 1e-3;
    var lc = Math.atan2(f.cy, f.cx);
    return rangeHits(lc - hw, lc + hw);
  }
  function inView(f) { return flat ? featureInFlat(f) : featureInFront(f); }

  var EDGE = 24;
  function outcode(px, py) {
    return (px < -EDGE ? 1 : px > W + EDGE ? 2 : 0) | (py < -EDGE ? 4 : py > H + EDGE ? 8 : 0);
  }
  function traceRing(c, rg) {
    var X = rg.x, Y = rg.y, Z = rg.z, n = rg.n;
    var r = B.r, ex = B.ex, ey = B.ey, ez = B.ez, nx = B.nx, ny = B.ny, nz = B.nz, vx = B.cx, vy = B.cy, vz = B.cz;
    var any = false;
    for (var k = 0; k < n; k++) { if (X[k] * vx + Y[k] * vy + Z[k] * vz > 0) { any = true; break; } }
    if (!any) return;
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
  }
  function traceLine(c, L) {
    if (L.radius < HALF_PI && !featureInFront(L)) return;
    var r = B.r, ex = B.ex, ey = B.ey, ez = B.ez, nx = B.nx, ny = B.ny, nz = B.nz, vx = B.cx, vy = B.cy, vz = B.cz;
    var X = L.x, Y = L.y, Z = L.z, n = L.n, pen = false, side = 0;
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
  function flatArrays(rg) {
    if (rg.L) return;
    var n = rg.n, L = new Float64Array(n), P = new Float64Array(n);
    for (var k = 0; k < n; k++) {
      P[k] = Math.asin(Math.max(-1, Math.min(1, rg.z[k])));
      L[k] = Math.atan2(rg.y[k], rg.x[k]);
    }
    rg.L = L; rg.P = P;
  }
  var scratch = new Float64Array(8192);
  function traceFlat(c, rg, closed) {
    flatArrays(rg);
    var n = rg.n, L = rg.L;
    if (n < 2) return;
    if (scratch.length < n) scratch = new Float64Array(n * 2);
    var l = wrapPi(L[0]), min = l, max = l, sumY = rg.P[0];
    scratch[0] = l;
    for (var k = 1; k < n; k++) {
      var d = L[k] - L[k - 1];
      if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU;
      l += d; scratch[k] = l;
      if (l < min) min = l; else if (l > max) max = l;
      sumY += rg.P[k];
    }
    var wind = 0;
    if (closed) {
      var dc = L[0] - L[n - 1];
      if (dc > Math.PI) dc -= TAU; else if (dc < -Math.PI) dc += TAU;
      wind = l + dc - scratch[0];
      if (Math.abs(wind) < Math.PI) wind = 0;
      else { if (scratch[0] + wind < min) min = scratch[0] + wind; if (scratch[0] + wind > max) max = scratch[0] + wind; }
    }
    for (var s = -1; s <= 1; s++) {
      var sh = s * TAU;
      if (max + sh < FB.vmin || min + sh > FB.vmax) continue;
      emitFlat(c, rg, n, sh, closed, wind, sumY < 0 ? -1 : 1);
    }
  }
  function emitFlat(c, rg, n, sh, closed, wind, pole) {
    var k = FB.k, x0 = cx - k * FB.xc, y0 = cy + k * FB.yc, P = rg.P;
    var side = 0, lx = 0, ly = 0, held = false;
    for (var i = 0; i < n; i++) {
      var px = x0 + k * (scratch[i] + sh), py = y0 - k * P[i];
      if (i === 0) { c.moveTo(px, py); side = outcode(px, py); held = false; continue; }
      var oc = outcode(px, py);
      if (oc & side) {
        if (closed) { lx = px; ly = py; held = true; }
        else c.moveTo(px, py);
        side = oc & side;
        continue;
      }
      if (held) { c.lineTo(lx, ly); held = false; }
      c.lineTo(px, py);
      side = oc;
    }
    if (held) c.lineTo(lx, ly);
    if (!closed) return;
    if (wind) {
      var end = x0 + k * (scratch[0] + wind + sh), start = x0 + k * (scratch[0] + sh);
      c.lineTo(end, y0 - k * P[0]);
      c.lineTo(end, y0 - k * pole * HALF_PI);
      c.lineTo(start, y0 - k * pole * HALF_PI);
    }
    c.closePath();
  }
  function traceOutline(c, d) {
    var k = FB.k, x0 = cx - k * FB.xc, y0 = cy + k * FB.yc;
    d = d || 0;
    if (FB.wrap) { c.rect(-20, y0 - k * HALF_PI - d, W + 40, k * Math.PI + 2 * d); return; }
    c.rect(x0 - k * Math.PI - d, y0 - k * HALF_PI - d, k * TAU + 2 * d, k * Math.PI + 2 * d);
  }
  function traceSphere(c, d) {
    if (flat) traceOutline(c, d);
    else c.arc(cx, cy, B.r + (d || 0), 0, TAU);
  }
  var geoPath = d3.geoPath(projection, ctx);
  function traceFeature(c, f) {
    if (flat) {
      if (!featureInFlat(f)) return;
      for (var j = 0; j < f.rings.length; j++) traceFlat(c, f.rings[j], true);
      return;
    }
    if (!featureInFront(f)) return;
    if (f.radius > Math.PI / 4 && f.geo && -(f.cx * B.cx + f.cy * B.cy + f.cz * B.cz) >= Math.cos(f.radius) - 1e-9) {
      if (c !== ctx) d3.geoPath(projection, c)(f.geo); else geoPath(f.geo);
      return;
    }
    for (var i = 0; i < f.rings.length; i++) traceRing(c, f.rings[i]);
  }
  function traceArc(c, L) {
    if (L.parts) { for (var i = 0; i < L.parts.length; i++) traceArc(c, L.parts[i]); return; }
    if (flat) { if (featureInFlat(L)) traceFlat(c, L, false); return; }
    traceLine(c, L);
  }
  function traceAll(c, list) { for (var i = 0; i < list.length; i++) traceFeature(c, list[i]); }
  function traceArcs(c, list) { for (var i = 0; i < list.length; i++) traceArc(c, list[i]); }
  function projectLL(lon, lat) {
    if (flat) {
      var lam = lon * D2R;
      return [cx + FB.k * (FB.wrap ? wrapPi(lam - FB.xc) : wrapPi(lam) - FB.xc), cy - FB.k * (lat * D2R - FB.yc), 1];
    }
    var v = toVec(lon, lat), d = v[0] * B.cx + v[1] * B.cy + v[2] * B.cz;
    if (d <= 0) return null;
    return [cx + B.r * (v[0] * B.ex + v[1] * B.ey + v[2] * B.ez), cy - B.r * (v[0] * B.nx + v[1] * B.ny + v[2] * B.nz), d];
  }
  function lonLatAt(x, y) {
    if (flat) {
      var lam = FB.xc + (x - cx) / FB.k, phi = FB.yc - (y - cy) / FB.k;
      if (FB.wrap) lam = wrapPi(lam);
      if (Math.abs(lam) > Math.PI || Math.abs(phi) > HALF_PI) return null;
      return [lam / D2R, phi / D2R];
    }
    if (Math.hypot(x - cx, y - cy) > B.r) return null;
    var ll = projection.invert([x, y]);
    return ll && isFinite(ll[0]) ? ll : null;
  }

  var pal = {};
  function readPalette() {
    var cs = getComputedStyle(document.documentElement);
    ["ocean", "ocean-deep", "grat", "limb", "glow", "border", "label", "label-halo", "people", "city", "city-ring", "select", "hover", "paper", "people-fill", "water", "sea-label", "river"].forEach(function (k) {
      pal[k] = cs.getPropertyValue("--ch-" + k).trim();
    });
    ["city-halo", "town"].forEach(function (k) { pal[k] = cs.getPropertyValue("--ch-" + k).trim(); });
    pal.colors = []; pal.bands = [];
    for (var i = 0; i < PALETTE; i++) {
      pal.colors.push(cs.getPropertyValue("--ch-c" + i).trim() || "#e7d6b9");
      pal.bands.push(cs.getPropertyValue("--ch-b" + i).trim() || "#957049");
    }
  }

  var renderQueued = false, moving = false, settleTimer = 0;
  function scheduleRender() {
    if (!renderQueued) { renderQueued = true; requestAnimationFrame(frame); }
  }
  function frame() {
    renderQueued = false;
    try { draw(); } catch (e) { console.error(e); }
  }
  function nudge() {
    moving = true;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(function () { moving = false; scheduleRender(); writeHash(); }, 160);
    scheduleRender();
  }

  var catalogue = null, maps = [], land = null, places = [], sea = null, rivers = null, riversLoad = null, lakes = null, lakesLoad = null;
  var current = null, now = START_YEAR, wantKey = "", modern = null, cities = null;
  var selected = -1, hoverId = -1, ready = false;
  var DAY0 = Date.UTC(1886, 0, 1), DAY_MS = 86400000, MID_DAY = 15;
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function dayFromDate(y, m, d) { return Math.round((Date.UTC(y, m - 1, d) - DAY0) / DAY_MS); }
  function dateOfDay(day) { var d = new Date(DAY0 + day * DAY_MS); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]; }
  function timeOfDay(day) {
    var dt = dateOfDay(day), y = dt[0], start = Date.UTC(y, 0, 1), len = (Date.UTC(y + 1, 0, 1) - start) / DAY_MS;
    return y + ((DAY0 + day * DAY_MS - start) / DAY_MS + 0.5) / len;
  }
  function dayOfTime(t) {
    var y = Math.floor(t), start = Date.UTC(y, 0, 1), len = (Date.UTC(y + 1, 0, 1) - start) / DAY_MS;
    return Math.floor((start + (t - y) * len * DAY_MS - DAY0) / DAY_MS);
  }
  function isModern(t) { return !!modern && t >= modern.fromTime; }

  function polityName(id) { return id >= 0 && catalogue[id] ? catalogue[id][0] : ""; }
  function polityColor(id) {
    var e = catalogue[id];
    if (!e) return 0;
    if (e[1] >= 0) return e[1];
    var h = 0;
    for (var i = 0; i < e[0].length; i++) h = (h * 31 + e[0].charCodeAt(i)) >>> 0;
    return h % PALETTE;
  }
  function mapIndexFor(y) {
    var k = 0;
    for (var i = 0; i < maps.length; i++) if (maps[i].y <= y) k = i;
    return k;
  }

  var loadedOrder = [];
  function loadMap(i) {
    var m = maps[i];
    if (!m) return Promise.reject(new Error("no map " + i));
    if (m.snap) return Promise.resolve(m.snap);
    if (!m.loading) {
      m.loading = fetchJSON(m.file).then(function (d) {
        m.snap = buildSnap(d);
        loadedOrder = loadedOrder.filter(function (j) { return j !== i; });
        loadedOrder.push(i);
        for (var n = 0; loadedOrder.length > KEEP_MAPS && n < loadedOrder.length; n++) {
          var old = loadedOrder[0];
          if (maps[old].snap === current) { loadedOrder.push(loadedOrder.shift()); continue; }
          loadedOrder.shift();
          maps[old].snap = null; maps[old].loading = null;
        }
        return m.snap;
      }).catch(function (e) { m.loading = null; throw e; });
    }
    return m.loading;
  }

  function finishSnap(snap) {
    snap.order = snap.polys.filter(Boolean).sort(function (a, b) { return (b.label ? b.label[5] : 0) - (a.label ? a.label[5] : 0); });
    snap.byId = new Map();
    snap.order.forEach(function (p) { if (!snap.byId.has(p.id)) snap.byId.set(p.id, p); });
    snap.levels = {};
    return snap;
  }
  function buildSnap(d) {
    var softYear = d.year < SOFT_BEFORE;
    var polys = d.rows.map(function (r, i) {
      if (r[0] < 0) return null;
      var hue = r[1] >= 0 ? r[1] : r[0];
      return {
        i: i, id: r[0], ruler: r[1], part: r[2], b: r[3], people: !!r[4], label: r[5],
        hue: hue, color: r[4] ? -1 : polityColor(hue), soft: softYear || r[3] <= 1 || !!r[4], status: -1
      };
    });
    return finishSnap({
      year: d.year, key: "y" + d.year, polys: polys, topo: { hi: d.hi, lo: d.lo },
      geoms: { hi: d.hi.objects.p.geometries, lo: d.lo.objects.p.geometries }
    });
  }
  var modernSnaps = new Map();
  function activeRows(day) {
    var out = [], rows = modern.rows;
    for (var i = 0; i < rows.length; i++) { var r = rows[i]; if (r[2] <= day && (r[3] < 0 || day <= r[3])) out.push(i); }
    return out;
  }
  function modernSnap(day) {
    var idx = activeRows(day), key = "m" + idx.join(",");
    var snap = modernSnaps.get(key);
    if (snap) { modernSnaps.delete(key); modernSnaps.set(key, snap); return snap; }
    var polys = idx.map(function (ri, i) {
      var r = modern.rows[ri], hue = r[1] >= 0 ? r[1] : r[0];
      return { i: i, row: ri, id: r[0], ruler: r[4] ? r[1] : -1, part: -1, b: 3, people: false, label: r[6], hue: hue, color: polityColor(hue), soft: false, status: r[4], cap: r[5], start: r[2], end: r[3] };
    });
    snap = finishSnap({
      year: null, key: key, modern: true, polys: polys, topo: { hi: modern.hi, lo: modern.lo },
      geoms: { hi: idx.map(function (i) { return modern.hi.objects.p.geometries[i]; }), lo: idx.map(function (i) { return modern.lo.objects.p.geometries[i]; }) }
    });
    modernSnaps.set(key, snap);
    while (modernSnaps.size > 24) {
      var oldest = modernSnaps.keys().next().value;
      if (modernSnaps.get(oldest) === current) { var keep = modernSnaps.get(oldest); modernSnaps.delete(oldest); modernSnaps.set(oldest, keep); break; }
      modernSnaps.delete(oldest);
    }
    return snap;
  }

  var featCache = { hi: new WeakMap(), lo: new WeakMap() };
  function featOf(topo, key, g) {
    var c = featCache[key].get(g);
    if (!c) {
      var geo = topojson.feature(topo, g);
      c = { geo: geo, prep: preparePolys(geo) };
      featCache[key].set(g, c);
    }
    return c;
  }
  function level(snap, key) {
    var L = snap.levels[key];
    if (L) return L;
    var topo = snap.topo[key], geoms = snap.geoms[key], polys = snap.polys;
    var ix = new Map();
    geoms.forEach(function (g, i) { ix.set(g, i); });
    var cached = geoms.map(function (g) { return featOf(topo, key, g); });
    var geo = cached.map(function (c) { return c.geo; });
    var feats = cached.map(function (c) { return c.prep; });
    var colOf = function (g) { var p = polys[ix.get(g)]; return p && !p.people ? p.color : -1; };
    var groups = [];
    for (var c = 0; c < PALETTE; c++) groups.push([]);
    var peoples = [], unnamed = [];
    polys.forEach(function (p, i) {
      var target = !p ? unnamed : p.people ? peoples : groups[p.color];
      for (var j = 0; j < feats[i].length; j++) target.push(feats[i][j]);
    });
    var kind = function (a, b) {
      var pa = polys[ix.get(a)], pb = polys[ix.get(b)];
      if (!pa && !pb) return 0;
      if (pa && pb && pa.id === pb.id) return 0;
      var soft = (pa ? pa.soft : false) || (pb ? pb.soft : false);
      if (pa && pb && !pa.people && !pb.people && pa.hue === pb.hue) return 3;
      return soft ? 2 : 1;
    };
    var collection = { type: "GeometryCollection", geometries: geoms };
    var mesh = function (fn) { return prepareLines(topojson.mesh(topo, collection, fn)); };
    var edges = outerEdges(topo, geoms, function (g) {
      var p = polys[ix.get(g)];
      return !p ? null : p.people ? "p" : (p.soft ? "s" : "h") + p.color;
    });
    var arcsOf = function (lines) { return lines.map(prepareArc); };
    L = {
      geo: geo, feats: feats, groups: groups, peoples: peoples, unnamed: unnamed,
      hard: mesh(function (a, b) { return a !== b && kind(a, b) === 1; }).concat(arcsOf(edges.hard)),
      soft: mesh(function (a, b) { return a !== b && kind(a, b) === 2; }).concat(arcsOf(edges.soft)),
      kin: mesh(function (a, b) { return a !== b && kind(a, b) === 3; }),
      bleed: edges.bleed.map(arcsOf), peopleBleed: arcsOf(edges.peopleBleed),
      bands: groups.map(function (list, c) {
        if (!list.length) return null;
        return mesh(function (a, b) {
          return a !== b && (colOf(a) === c) !== (colOf(b) === c);
        }).concat(arcsOf(edges.inner[c]));
      })
    };
    if (key === "hi") {
      L.bounds = cached.map(function (c) { if (!c.bounds) c.bounds = d3.geoBounds(c.geo); return c.bounds; });
      L.area = cached.map(function (c) { if (c.area === undefined) c.area = d3.geoArea(c.geo); return c.area; });
    }
    snap.levels[key] = L;
    return L;
  }
  function outerEdges(topo, geoms, bucketOf) {
    var owner = new Map();
    var walk = function (g, a) {
      if (typeof a === "number") {
        var i = a < 0 ? ~a : a, o = owner.get(i);
        if (o === undefined) owner.set(i, g); else if (o !== g) owner.set(i, null);
        return;
      }
      for (var k = 0; k < a.length; k++) walk(g, a[k]);
    };
    geoms.forEach(function (g) { if (g.arcs) walk(g, g.arcs); });
    var buckets = {};
    owner.forEach(function (g, i) {
      if (!g) return;
      var b = bucketOf(g);
      if (b === null) return;
      (buckets[b] = buckets[b] || []).push([i]);
    });
    var out = { hard: [], soft: [], peopleBleed: [], bleed: [], inner: [] };
    for (var c = 0; c < PALETTE; c++) { out.bleed.push([]); out.inner.push([]); }
    Object.keys(buckets).forEach(function (b) {
      var lines = topojson.feature(topo, { type: "MultiLineString", arcs: buckets[b] }).geometry.coordinates;
      var coastal = [], inner = [];
      splitCoast(lines, coastal, inner);
      if (b === "p") { out.peopleBleed = coastal; out.soft = out.soft.concat(inner); return; }
      var col = +b.slice(1);
      out.bleed[col] = out.bleed[col].concat(coastal);
      out.inner[col] = out.inner[col].concat(inner);
      if (b[0] === "s") out.soft = out.soft.concat(inner); else out.hard = out.hard.concat(inner);
    });
    return out;
  }
  function useLevel() {
    var S = localScale();
    return (!moving && S >= 900) || S >= 2600 ? "hi" : "lo";
  }

  var reliefCanvas = document.createElement("canvas"), relief = null, reliefTried = false, RELIEF_RES = 0.5, RELIEF_MOVING = 0.3, reliefRes = RELIEF_RES, reliefKey = "";
  function sizeRelief(res) {
    reliefRes = res || RELIEF_RES;
    reliefCanvas.width = Math.max(1, Math.round(W * dpr * reliefRes));
    reliefCanvas.height = Math.max(1, Math.round(H * dpr * reliefRes));
    reliefKey = "";
  }
  function reliefReady() {
    if (!relief && !reliefTried) {
      reliefTried = true;
      relief = window.UchroniaSat ? window.UchroniaSat(reliefCanvas) : null;
      if (relief) {
        relief.onRestore = function () { reliefKey = ""; scheduleRender(); };
        relief.load([{ src: UC + "data/relief-4096.webp", size: 4096 }], function () { reliefKey = ""; scheduleRender(); });
      }
    }
    return !!relief && relief.ready();
  }
  function renderRelief() {
    var res = moving ? RELIEF_MOVING : RELIEF_RES;
    if (res !== reliefRes) sizeRelief(res);
    var key = [flat ? 1 : 0, view.lon, view.lat, view.zoom, W, H, dpr, reliefRes].join();
    if (key === reliefKey) return;
    reliefKey = key;
    var o = { flat: flat, dpr: dpr * reliefRes, light: 0, sepia: 0, detail: false, cx: cx, cy: cy };
    if (flat) { o.k = FB.k; o.xc = FB.xc; o.yc = FB.yc; o.wrap = !!FB.wrap; }
    else { o.e = [B.ex, B.ey, B.ez]; o.n = [B.nx, B.ny, B.nz]; o.c = [B.cx, B.cy, B.cz]; o.r = B.r; }
    relief.draw(o);
  }

  var graticule = (function () {
    var lines = [];
    for (var lat = -80; lat <= 80; lat += 10) { var pts = []; for (var lon = -180; lon <= 180; lon += 2) pts.push([lon, lat]); lines.push(prepareLine(pts)); }
    for (var lo = -180; lo < 180; lo += 10) {
      var top = lo % 90 === 0 ? 90 : 80, mp = [];
      for (var la = -top; la <= top; la += 2) mp.push([lo, la]);
      lines.push(prepareLine(mp));
    }
    return lines;
  })();
  var seams = (function () {
    var out = [];
    for (var g = 0; g < 12; g++) { var l0 = -180 + g * 30, line = []; for (var la = -70; la <= 70; la += 2) line.push([l0, la]); out.push(prepareLine(line)); }
    [70, -70].forEach(function (cap) { var ring = []; for (var lo = -180; lo <= 180; lo += 3) ring.push([lo, cap]); out.push(prepareLine(ring)); });
    return out;
  })();

  function bandWidth(S) { return Math.min(6.5, Math.max(S / 260, Math.min(2.2, Math.max(1.3, S / 165)))); }
  var ISLAND_PX = 1.6, RIPPLE_PX = 9, BLEED_KM = 20, BAND_ISLAND = 2.5, ISLAND_TINT = 0.75, BAND_RES = 0.5, BAND_MOVING = 0.35;
  var canOff = typeof OffscreenCanvas === "function";
  var bandCanvas = canOff ? new OffscreenCanvas(1, 1) : document.createElement("canvas"), bandCtx = bandCanvas.getContext("2d"), bandKey = "", bandImage = null, bandOld = null, bandFill = null;
  var maskCanvas = canOff ? new OffscreenCanvas(1, 1) : document.createElement("canvas"), maskCtx = maskCanvas.getContext("2d"), maskKey = "";
  function drawCoastBand(id, paintFills, list, landPath, kp, line, alpha, peopleBleed, peoplePath, unnamedPath, bleed) {
    var n = landCount(list, kp, line * BAND_ISLAND), m = landCount(list, kp, ISLAND_PX);
    if (!m) return;
    var res = moving ? Math.max(0.5, dpr * BAND_MOVING) : Math.max(1, dpr * BAND_RES);
    var vkey = [flat ? 1 : 0, view.lon, view.lat, view.zoom, W, H, res, line, n, m, list === land.hi ? 1 : 0].join();
    if (vkey !== maskKey) paintCoastMask(list, landPath, n, m, line, res);
    maskKey = vkey;
    var key = id + "|" + vkey;
    if (key !== bandKey) paintCoastBand(paintFills, peopleBleed, peoplePath, unnamedPath, bleed, res);
    bandKey = key;
    ctx.save();
    var k = canvas.width / bandCanvas.width;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = bandFill;
    ctx.fillRect(0, 0, bandCanvas.width, bandCanvas.height);
    ctx.restore();
  }
  function resetLayer(cv, res) {
    var w = Math.max(1, Math.round(W * res)), h = Math.max(1, Math.round(H * res));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    var c = cv.getContext("2d");
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
    c.clearRect(0, 0, w, h);
    c.setTransform(res, 0, 0, res, 0, 0);
    c.lineJoin = "round"; c.lineCap = "round";
    return c;
  }
  function paintCoastMask(list, landPath, n, m, line, res) {
    var k = resetLayer(maskCanvas, res);
    k.beginPath(); traceCoast(k, list, n); k.lineWidth = line; k.strokeStyle = "#000"; k.stroke();
    k.beginPath();
    for (var i = n; i < m; i++) traceFeature(k, list[i]);
    k.fillStyle = "rgba(0,0,0," + ISLAND_TINT + ")"; k.fill();
    k.globalCompositeOperation = "destination-in"; k.fillStyle = "#000"; k.fill(landPath);
    k.globalCompositeOperation = "source-over";
  }
  function paintCoastBand(paintFills, peopleBleed, peoplePath, unnamedPath, bleed, res) {
    var g = resetLayer(bandCanvas, res);
    paintFills(g, pal.bands);
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = "#000"; g.strokeStyle = "#000";
    if (bleed > 0.6) { g.lineWidth = bleed; g.stroke(peopleBleed); }
    g.fill(peoplePath); g.fill(unnamedPath);
    g.globalCompositeOperation = "destination-in";
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(maskCanvas, 0, 0);
    g.globalCompositeOperation = "source-over";
    if (bandOld && bandOld.close) bandOld.close();
    bandOld = bandImage;
    bandImage = canOff ? bandCanvas.transferToImageBitmap() : bandCanvas;
    bandFill = ctx.createPattern(bandImage, "no-repeat");
  }
  function lineWeight(S) { return clamp01((S - 700) / 3300); }
  function drawWaterLines(list, S) {
    var gap = Math.max(1.25, Math.min(3.4, S < 450 ? S / 240 : Math.max(1.7, S / 520))), n = moving ? 1 : S < 250 ? 2 : S < 450 ? 3 : 4;
    var kp = kmPx();
    ctx.save();
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    for (var i = n; i >= 1; i--) {
      ctx.beginPath(); traceCoast(ctx, list, landCount(list, kp, RIPPLE_PX * (n === 1 ? 1 : i)));
      ctx.globalAlpha = n === 1 ? 0.6 : 0.3 + 0.7 * (n - i) / (n - 1);
      ctx.strokeStyle = pal.water; ctx.lineWidth = 2 * i * gap + 0.9; ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = pal.ocean; ctx.lineWidth = 2 * i * gap - 0.7; ctx.stroke();
    }
    ctx.restore();
  }

  var seaCanvas = document.createElement("canvas"), seaCtx = seaCanvas.getContext("2d"), seaKey = "";
  function drawSea(coast, S) {
    var key = [flat ? 1 : 0, view.lon, view.lat, view.zoom, W, H, dpr, moving ? 1 : 0, sea ? 1 : 0, coast === land.hi ? 1 : 0].join();
    if (key !== seaKey) {
      seaKey = key;
      if (seaCanvas.width !== canvas.width || seaCanvas.height !== canvas.height) { seaCanvas.width = canvas.width; seaCanvas.height = canvas.height; }
      var main = ctx;
      ctx = seaCtx;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineJoin = "round";
      ctx.beginPath(); traceSphere(ctx); ctx.fillStyle = pal.ocean; ctx.fill();
      ctx.save();
      ctx.beginPath(); traceSphere(ctx); ctx.clip();
      if (sea) { ctx.beginPath(); traceAll(ctx, S < 900 ? sea.low : sea.high); ctx.fillStyle = pal["ocean-deep"]; ctx.fill(); }
      if (layers.grid) { ctx.beginPath(); traceArcs(ctx, graticule); ctx.strokeStyle = pal.grat; ctx.lineWidth = 0.6; ctx.stroke(); }
      drawWaterLines(coast, S);
      ctx.restore();
      ctx = main;
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(seaCanvas, 0, 0);
    ctx.restore();
  }

  var placedLabels = [];
  function draw() {
    if (!ready || !current) return;
    applyView();
    var S = localScale(), kp = kmPx(), key = useLevel();
    var snap = current, L = level(snap, key);
    var landList = land[key];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = "round";

    if (!flat && B.r * 1.07 < Math.hypot(W, H)) {
      var glow = ctx.createRadialGradient(cx, cy, B.r, cx, cy, B.r * 1.07);
      glow.addColorStop(0, pal.glow); glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, cy, B.r * 1.07, 0, TAU); ctx.arc(cx, cy, B.r, 0, TAU, true); ctx.fill();
    }
    drawSea(landList, S);

    var nLand = landCount(landList, kp, ISLAND_PX);
    var landPath = new Path2D();
    for (var li = 0; li < nLand; li++) traceFeature(landPath, landList[li]);
    ctx.save();
    ctx.clip(landPath);
    ctx.fillStyle = pal.paper; ctx.fillRect(0, 0, W, H);
    var groupPaths = [], bleedPaths = [], c;
    for (c = 0; c < PALETTE; c++) {
      if (!L.groups[c].length) { groupPaths.push(null); bleedPaths.push(null); continue; }
      var gp = new Path2D(); traceAll(gp, L.groups[c]); groupPaths.push(gp);
      var bp = new Path2D(); traceArcs(bp, L.bleed[c]); bleedPaths.push(bp);
    }
    var peoplePath = new Path2D(); traceAll(peoplePath, L.peoples);
    var peopleBleed = new Path2D(); traceArcs(peopleBleed, L.peopleBleed);
    var unnamedPath = new Path2D(); traceAll(unnamedPath, L.unnamed);
    var bleed = Math.min(80, 2 * BLEED_KM * kp);
    var paintFills = function (g, colors) {
      g.lineJoin = "round"; g.lineCap = "round";
      if (bleed > 0.6) {
        g.lineWidth = bleed;
        for (c = 0; c < PALETTE; c++) if (bleedPaths[c]) { g.strokeStyle = colors[c]; g.stroke(bleedPaths[c]); }
      }
      for (c = 0; c < PALETTE; c++) if (groupPaths[c]) { g.fillStyle = colors[c]; g.fill(groupPaths[c]); }
    };
    paintFills(ctx, pal.colors);
    if (bleed > 0.6) { ctx.strokeStyle = pal["people-fill"]; ctx.lineWidth = bleed; ctx.stroke(peopleBleed); }
    ctx.fillStyle = pal["people-fill"]; ctx.fill(peoplePath);
    ctx.fillStyle = pal.paper; ctx.fill(unnamedPath);
    if (layers.relief && reliefReady()) {
      renderRelief();
      ctx.save();
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = 0.72;
      ctx.drawImage(reliefCanvas, 0, 0, W, H);
      ctx.restore();
    }
    var bw = bandWidth(S), softMap = snap.year !== null && snap.year < SOFT_BEFORE;
    var bandAlpha = softMap ? 0.4 : 0.6, bandLine = bw * (softMap ? 3 : 2);
    for (c = 0; c < PALETTE; c++) {
      if (!groupPaths[c] || !L.bands[c]) continue;
      ctx.save();
      ctx.clip(groupPaths[c]);
      ctx.beginPath(); traceArcs(ctx, L.bands[c]);
      ctx.globalAlpha = bandAlpha;
      ctx.strokeStyle = pal.bands[c]; ctx.lineWidth = bandLine; ctx.lineCap = "round"; ctx.stroke();
      ctx.restore();
    }
    var hp = hoverId >= 0 ? snap.byId.get(hoverId) : null, sp = selected >= 0 ? snap.byId.get(selected) : null;
    if (hp && hp !== sp) { ctx.beginPath(); tracePolity(snap, L, hp.id); ctx.fillStyle = pal.hover; ctx.fill(); }
    if (sp) { ctx.beginPath(); tracePolity(snap, L, sp.id); ctx.fillStyle = "rgba(140,42,26,0.12)"; ctx.fill(); }
    ctx.restore();
    drawCoastBand(snap.key + key, paintFills, landList, landPath, kp, bandLine, bandAlpha, peopleBleed, peoplePath, unnamedPath, bleed);

    drawLakes(kp);
    drawRivers(S);

    var lw = lineWeight(S);
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath(); traceCoast(ctx, landList, nLand); ctx.strokeStyle = pal.border; ctx.lineWidth = 0.75 + 0.35 * lw; ctx.stroke();
    ctx.save();
    ctx.clip(landPath);
    ctx.beginPath(); traceArcs(ctx, L.kin); ctx.globalAlpha = 0.55; ctx.strokeStyle = pal.border; ctx.lineWidth = 0.6 + 0.3 * lw; ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.beginPath(); traceArcs(ctx, L.hard); ctx.lineWidth = 1.15 + 0.55 * lw; ctx.stroke();
    ctx.beginPath(); traceArcs(ctx, L.soft);
    var dot = S < 500 ? 1.3 : 1.6 + 0.5 * lw;
    ctx.setLineDash([0.1, dot * 2.1]); ctx.lineWidth = dot; ctx.stroke();
    ctx.setLineDash([]);
    if (sp) { ctx.beginPath(); tracePolity(snap, L, sp.id); ctx.strokeStyle = pal.select; ctx.lineWidth = 1.8; ctx.stroke(); }
    ctx.restore();

    drawAging(S);
    ctx.strokeStyle = pal.limb;
    if (flat) {
      ctx.beginPath(); traceOutline(ctx, 0); ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); traceOutline(ctx, 5); ctx.lineWidth = 2.4; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(cx, cy, B.r, 0, TAU); ctx.lineWidth = 1.6; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, B.r + 5, 0, TAU); ctx.lineWidth = 0.8; ctx.stroke();
    }

    placedLabels = [];
    var placed = fixedBoxes();
    drawPolityLabels(snap, placed, kp);
    drawSeaLabels(placed, S);
    drawPlaces(placed, S);
  }
  function tracePolity(snap, L, id) {
    for (var i = 0; i < snap.polys.length; i++) { var p = snap.polys[i]; if (p && p.id === id) traceAll(ctx, L.feats[i]); }
  }

  function drawAging(S) {
    var amt = clamp01((6000 - S) / 3500);
    ctx.save();
    if (!flat) { ctx.beginPath(); ctx.arc(cx, cy, B.r, 0, TAU); ctx.clip(); }
    ctx.globalCompositeOperation = "multiply";
    if (flat) {
      var k = FB.k, y0 = cy + k * FB.yc, top = y0 - k * HALF_PI, h = k * Math.PI, e = h * 0.07;
      [[top, top + e, top], [top + h, top + h - e, top + h - e]].forEach(function (d) {
        var gy = ctx.createLinearGradient(0, d[0], 0, d[1]);
        gy.addColorStop(0, "rgba(140,94,40,0.26)"); gy.addColorStop(1, "rgba(140,94,40,0)");
        ctx.fillStyle = gy; ctx.fillRect(0, d[2], W, e);
      });
    } else {
      var r = B.r;
      if (amt > 0) { ctx.beginPath(); traceArcs(ctx, seams); ctx.strokeStyle = "rgba(96,64,30," + (0.22 * amt) + ")"; ctx.lineWidth = 0.7; ctx.stroke(); }
      var vg = ctx.createRadialGradient(cx - r * 0.22, cy - r * 0.26, r * 0.15, cx, cy, r * 1.02);
      vg.addColorStop(0, "rgba(255,255,255,0)"); vg.addColorStop(0.62, "rgba(214,176,112,0.12)"); vg.addColorStop(1, "rgba(150,104,48,0.38)");
      ctx.fillStyle = vg;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = "screen";
      var hl = ctx.createRadialGradient(cx - r * 0.38, cy - r * 0.42, 0, cx - r * 0.38, cy - r * 0.42, r * 0.55);
      hl.addColorStop(0, "rgba(255,248,226,0.2)"); hl.addColorStop(1, "rgba(255,248,226,0)");
      ctx.fillStyle = hl;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawLakes(kp) {
    if (!layers.water) return;
    if (!lakes) {
      if (!lakesLoad) lakesLoad = fetchJSON(UC + "data/lakes.json").then(function (rows) {
        lakes = rows.map(function (r) { return { name: r[0], km2: r[1], f: prepare({ type: "MultiPolygon", coordinates: r[4] }) }; });
        lakes.sort(function (a, b) { return b.km2 - a.km2; });
        scheduleRender();
      }).catch(function (e) { console.warn("lakes", e); });
      return;
    }
    var big = new Path2D(), small = new Path2D(), w = 0.6 + 0.3 * lineWeight(localScale());
    for (var i = 0; i < lakes.length; i++) {
      var px = Math.sqrt(lakes[i].km2) * kp;
      if (px < LAKE_PX) break;
      traceFeature(px < LAKE_LINE_PX ? small : big, lakes[i].f);
    }
    ctx.fillStyle = pal.ocean; ctx.fill(big); ctx.fill(small);
    ctx.lineWidth = w;
    ctx.strokeStyle = pal.border; ctx.stroke(big);
    ctx.strokeStyle = pal.water; ctx.stroke(small);
  }
  var LAKE_PX = 6, LAKE_LINE_PX = 18;

  var RIVERS_FROM = 520, RIVERS_FULL = 960;
  function riverRank(S) { return S < 800 ? 4 : S < 1300 ? 5 : 6; }
  function drawRivers(S) {
    if (!layers.water) return;
    if (S < RIVERS_FROM) return;
    if (!rivers) {
      if (!riversLoad) riversLoad = fetchJSON(UC + "data/rivers.json").then(function (t) {
        if (!t.objects || !t.objects.rivers) throw new Error("rivers do not match");
        var byRank = [[], [], [], [], [], [], []];
        topojson.feature(t, t.objects.rivers).features.forEach(function (f) {
          var rk = f.properties && f.properties.r;
          if (rk >= 1 && rk <= 6) byRank[rk] = byRank[rk].concat(prepareLines(f.geometry));
        });
        rivers = byRank;
        scheduleRender();
      }).catch(function (e) { console.warn("rivers", e); });
      return;
    }
    var top = riverRank(S), fade = clamp01((S - RIVERS_FROM) / (RIVERS_FULL - RIVERS_FROM));
    ctx.save();
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.strokeStyle = pal.river;
    for (var rk = 1; rk <= top; rk++) {
      ctx.beginPath(); traceArcs(ctx, rivers[rk]);
      ctx.globalAlpha = fade * (rk <= 2 ? 1 : 0.85);
      ctx.lineWidth = rk <= 1 ? 1.25 : rk <= 3 ? 1 : 0.75;
      ctx.stroke();
    }
    ctx.restore();
  }

  var LINE_H = 1.18, CAP_H = 0.92, SPACE = 0.22, PEOPLE_SPACE = 0.05, TIGHT = 0.1;
  var widthCache = new Map();
  function unitWidth(text, people, space) {
    var sp = space === undefined ? (people ? PEOPLE_SPACE : SPACE) : space;
    var k = (people ? "i" : "n") + sp + text, w = widthCache.get(k);
    if (w !== undefined) return w;
    ctx.font = (people ? "italic 400 " : "400 ") + "100px " + SERIF;
    ctx.letterSpacing = "0px";
    w = ctx.measureText(text).width / 100 + Array.from(text).length * sp;
    widthCache.set(k, w);
    return w;
  }
  function splits(text) {
    var words = text.split(" "), out = [[text]];
    if (words.length >= 2) {
      var best2 = null, bw = Infinity;
      for (var i = 1; i < words.length; i++) {
        var a = words.slice(0, i).join(" "), b = words.slice(i).join(" "), w = Math.max(a.length, b.length);
        if (w < bw) { bw = w; best2 = [a, b]; }
      }
      out.push(best2);
    }
    if (words.length >= 4) {
      var best3 = null, b3 = Infinity;
      for (var x = 1; x < words.length - 1; x++) for (var y = x + 1; y < words.length; y++) {
        var l = [words.slice(0, x).join(" "), words.slice(x, y).join(" "), words.slice(y).join(" ")];
        var m = Math.max(l[0].length, l[1].length, l[2].length);
        if (m < b3) { b3 = m; best3 = l; }
      }
      out.push(best3);
    }
    return out;
  }
  var labelCache = new Map();
  function labelOptions(name, people, space) {
    var sp = space === undefined ? (people ? PEOPLE_SPACE : SPACE) : space;
    var key = (people ? "i" : "n") + sp + name, hit = labelCache.get(key);
    if (hit) return hit;
    var text = people ? name : name.toUpperCase();
    hit = splits(text).map(function (lines) {
      var w = 0;
      lines.forEach(function (l) { w = Math.max(w, unitWidth(l, people, sp)); });
      return { lines: lines, w: w, h: CAP_H + LINE_H * (lines.length - 1), space: sp };
    });
    labelCache.set(key, hit);
    return hit;
  }
  function mkBox(x, y, hw, hh, ang) {
    var c = Math.abs(Math.cos(ang)), s = Math.abs(Math.sin(ang));
    var ex = hw * c + hh * s, ey = hw * s + hh * c;
    return { x: x - ex, y: y - ey, w: 2 * ex, h: 2 * ey, cx: x, cy: y, hw: hw, hh: hh, ang: ang || 0 };
  }
  function axesOf(b) {
    if (b.hw === undefined) return { cx: b.x + b.w / 2, cy: b.y + b.h / 2, hw: b.w / 2, hh: b.h / 2, c: 1, s: 0 };
    return { cx: b.cx, cy: b.cy, hw: b.hw, hh: b.hh, c: Math.cos(b.ang), s: Math.sin(b.ang) };
  }
  function separated(A, B, ax, ay) {
    var d = Math.abs((B.cx - A.cx) * ax + (B.cy - A.cy) * ay);
    var ra = A.hw * Math.abs(A.c * ax + A.s * ay) + A.hh * Math.abs(-A.s * ax + A.c * ay);
    var rb = B.hw * Math.abs(B.c * ax + B.s * ay) + B.hh * Math.abs(-B.s * ax + B.c * ay);
    return d > ra + rb;
  }
  function overlaps(a, b) {
    if (!(a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y)) return false;
    if (!a.ang && !b.ang) return true;
    var A = axesOf(a), B = axesOf(b);
    return !(separated(A, B, A.c, A.s) || separated(A, B, -A.s, A.c) || separated(A, B, B.c, B.s) || separated(A, B, -B.s, B.c));
  }
  function collides(placed, b) {
    for (var i = 0; i < placed.length; i++) if (overlaps(b, placed[i])) return true;
    return false;
  }
  function fixedBoxes() {
    var out = [];
    [$("head"), $("ctls"), document.querySelector(".ch-site"), $("card"), $("time")].forEach(function (el) {
      if (!el || el.hidden) return;
      var r = el.getBoundingClientRect();
      if (r.width) out.push({ x: r.left - 4, y: r.top - 4, w: r.width + 8, h: r.height + 8 });
    });
    return out;
  }
  function insideView(b) {
    if (b.x < 2 || b.y < 2 || b.x + b.w > W - 2 || b.y + b.h > H - 2) return false;
    if (flat) {
      var k = FB.k, y0 = cy + k * FB.yc;
      return b.y > y0 - k * HALF_PI + 3 && b.y + b.h < y0 + k * HALF_PI - 3;
    }
    var corners = [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]];
    for (var i = 0; i < 4; i++) if (Math.hypot(corners[i][0] - cx, corners[i][1] - cy) > B.r - 2) return false;
    return true;
  }
  function labelSpots(L) {
    var cands = L[6] ? [L].concat(L[6]) : [L], out = [];
    for (var i = 0; i < cands.length; i++) {
      var p = projectLL(cands[i][0], cands[i][1]);
      if (p && p[2] >= 0.2) out.push(p);
    }
    return out;
  }
  function packRing(xy, m) {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (var k = 0; k < m; k += 2) {
      var x = xy[k], y = xy[k + 1];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    return { xy: xy, n: m >> 1, x0: x0, y0: y0, x1: x1, y1: y1 };
  }
  function globeRing(rg, tol) {
    var X = rg.x, Y = rg.y, Z = rg.z, n = rg.n, r = B.r, k;
    for (k = 0; k < n; k++) if (X[k] * B.cx + Y[k] * B.cy + Z[k] * B.cz > 0) break;
    if (k === n) return null;
    var xy = new Float64Array(2 * n + 2), m = 0, lx = Infinity, ly = Infinity, side = 0, held = false, hx = 0, hy = 0;
    for (k = 0; k < n; k++) {
      var x = X[k], y = Y[k], z = Z[k];
      var sx = x * B.ex + y * B.ey + z * B.ez, sy = x * B.nx + y * B.ny + z * B.nz;
      if (x * B.cx + y * B.cy + z * B.cz < 0) { var l = Math.hypot(sx, sy) || 1; sx /= l; sy /= l; }
      var px = cx + r * sx, py = cy - r * sy, oc = outcode(px, py);
      if (oc & side) { hx = px; hy = py; held = true; side &= oc; continue; }
      if (held) { xy[m++] = hx; xy[m++] = hy; held = false; }
      side = oc;
      if (Math.abs(px - lx) + Math.abs(py - ly) < tol) continue;
      xy[m++] = px; xy[m++] = py; lx = px; ly = py;
    }
    if (held) { xy[m++] = hx; xy[m++] = hy; }
    return m >= 6 ? packRing(xy, m) : null;
  }
  function flatRing(rg, tol) {
    flatArrays(rg);
    var n = rg.n, LL = rg.L, P = rg.P, U = new Float64Array(n), l = wrapPi(LL[0]), min = l, max = l, sumY = P[0], k, d;
    U[0] = l;
    for (k = 1; k < n; k++) {
      d = LL[k] - LL[k - 1];
      if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU;
      l += d; U[k] = l; sumY += P[k];
      if (l < min) min = l; else if (l > max) max = l;
    }
    d = LL[0] - LL[n - 1];
    if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU;
    var wind = l + d - U[0];
    if (Math.abs(wind) < Math.PI) wind = 0;
    var sh = 0, over = 0;
    for (var s = -1; s <= 1; s++) {
      var o = Math.min(max + s * TAU, FB.vmax) - Math.max(min + s * TAU, FB.vmin);
      if (o > over) { over = o; sh = s * TAU; }
    }
    if (over <= 0) return null;
    var kk = FB.k, x0 = cx - kk * FB.xc, y0 = cy + kk * FB.yc;
    var xy = new Float64Array(2 * n + 8), m = 0, lx = Infinity, ly = Infinity, side = 0, held = false, hx = 0, hy = 0;
    for (k = 0; k < n; k++) {
      var px = x0 + kk * (U[k] + sh), py = y0 - kk * P[k], oc = outcode(px, py);
      if (oc & side) { hx = px; hy = py; held = true; side &= oc; continue; }
      if (held) { xy[m++] = hx; xy[m++] = hy; held = false; }
      side = oc;
      if (Math.abs(px - lx) + Math.abs(py - ly) < tol) continue;
      xy[m++] = px; xy[m++] = py; lx = px; ly = py;
    }
    if (held) { xy[m++] = hx; xy[m++] = hy; }
    if (wind) {
      var end = x0 + kk * (U[0] + wind + sh), start = x0 + kk * (U[0] + sh), pole = y0 - kk * (sumY < 0 ? -1 : 1) * HALF_PI;
      xy[m++] = end; xy[m++] = y0 - kk * P[0]; xy[m++] = end; xy[m++] = pole; xy[m++] = start; xy[m++] = pole;
    }
    return m >= 6 ? packRing(xy, m) : null;
  }
  function rimRing() {
    var xy = new Float64Array(144);
    for (var k = 0; k < 72; k++) { xy[2 * k] = cx + B.r * Math.cos(k * TAU / 72); xy[2 * k + 1] = cy + B.r * Math.sin(k * TAU / 72); }
    return packRing(xy, 144);
  }
  function screenShape(feats, tol, minSize) {
    var rings = [], i, j, r;
    for (i = 0; i < feats.length; i++) {
      var f = feats[i];
      if (!inView(f)) continue;
      for (j = 0; j < f.rings.length; j++) {
        r = flat ? flatRing(f.rings[j], tol) : globeRing(f.rings[j], tol);
        if (r && r.x1 > 0 && r.x0 < W && r.y1 > 0 && r.y0 < H && r.x1 - r.x0 + r.y1 - r.y0 > minSize) rings.push(r);
      }
      if (!flat && f.radius > Math.PI / 4 && f.geo && -(f.cx * B.cx + f.cy * B.cy + f.cz * B.cz) >= Math.cos(f.radius) - 1e-9 &&
        d3.geoContains(f.geo, [wrap180(view.lon + 180), -view.lat])) rings.push(rimRing());
    }
    if (!rings.length) return null;
    var s = { rings: rings, x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (i = 0; i < rings.length; i++) {
      r = rings[i];
      s.x0 = Math.min(s.x0, r.x0); s.y0 = Math.min(s.y0, r.y0); s.x1 = Math.max(s.x1, r.x1); s.y1 = Math.max(s.y1, r.y1);
    }
    return s;
  }
  function boxCorners(b) {
    var A = axesOf(b), ux = A.c * A.hw, uy = A.s * A.hw, vx = -A.s * A.hh, vy = A.c * A.hh;
    return [A.cx - ux - vx, A.cy - uy - vy, A.cx + ux - vx, A.cy + uy - vy, A.cx + ux + vx, A.cy + uy + vy, A.cx - ux + vx, A.cy - uy + vy];
  }
  function obstacles(placed, s) {
    var x0 = s.x0 - 40, y0 = s.y0 - 40, x1 = s.x1 + 40, y1 = s.y1 + 40;
    var e = 6, out = [e, e, W - e, e, W - e, e, W - e, H - e, W - e, H - e, e, H - e, e, H - e, e, e];
    for (var i = 0; i < placed.length; i++) {
      var b = placed[i];
      if (b.x > x1 || b.x + b.w < x0 || b.y > y1 || b.y + b.h < y0) continue;
      var c = boxCorners(b);
      for (var k = 0; k < 8; k += 2) out.push(c[k], c[k + 1], c[(k + 2) % 8], c[(k + 3) % 8]);
    }
    return out;
  }
  var segBuf = new Float64Array(8192);
  function prepFit(s, obst, a, b, ang) {
    var c = Math.cos(ang), sn = Math.sin(ang), ia = 1 / a, ib = 1 / b, need = obst.length, i, k;
    for (i = 0; i < s.rings.length; i++) need += 4 * s.rings[i].n;
    if (segBuf.length < need) segBuf = new Float64Array(need * 2);
    var g = segBuf, m = 0, u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
    for (i = 0; i < s.rings.length; i++) {
      var xy = s.rings[i].xy, n = s.rings[i].n;
      var pu = (xy[2 * n - 2] * c + xy[2 * n - 1] * sn) * ia, pv = (-xy[2 * n - 2] * sn + xy[2 * n - 1] * c) * ib;
      for (k = 0; k < n; k++) {
        var qu = (xy[2 * k] * c + xy[2 * k + 1] * sn) * ia, qv = (-xy[2 * k] * sn + xy[2 * k + 1] * c) * ib;
        g[m++] = pu; g[m++] = pv; g[m++] = qu; g[m++] = qv;
        if (qu < u0) u0 = qu;
        if (qu > u1) u1 = qu;
        if (qv < v0) v0 = qv;
        if (qv > v1) v1 = qv;
        pu = qu; pv = qv;
      }
    }
    var poly = m;
    for (k = 0; k < obst.length; k += 2) { g[m++] = (obst[k] * c + obst[k + 1] * sn) * ia; g[m++] = (-obst[k] * sn + obst[k + 1] * c) * ib; }
    indexFit(g, poly, m);
    var cu = [], cv = [];
    [[3, 3], [W - 3, 3], [3, H - 3], [W - 3, H - 3]].forEach(function (q) { cu.push((q[0] * c + q[1] * sn) * ia); cv.push((-q[0] * sn + q[1] * c) * ib); });
    return {
      g: g, poly: poly, end: m, a: a, b: b, c: c, s: sn, ia: ia, ib: ib, grid: { start: grid.start, items: grid.items, U0: grid.U0, V0: grid.V0, cs: grid.cs, gu: grid.gu, gv: grid.gv },
      u0: Math.max(u0, Math.min.apply(null, cu)), u1: Math.min(u1, Math.max.apply(null, cu)),
      v0: Math.max(v0, Math.min.apply(null, cv)), v1: Math.min(v1, Math.max.apply(null, cv))
    };
  }
  var grid = { start: new Int32Array(2), items: new Int32Array(1) };
  function cellAt(d, cs, n) { return Math.max(0, Math.min(n - 1, Math.floor(d / cs))); }
  function indexFit(g, poly, end) {
    var U0 = Infinity, V0 = Infinity, U1 = -Infinity, V1 = -Infinity, k, n = poly >> 2;
    for (k = 0; k < poly; k += 2) {
      if (g[k] < U0) U0 = g[k];
      if (g[k] > U1) U1 = g[k];
      if (g[k + 1] < V0) V0 = g[k + 1];
      if (g[k + 1] > V1) V1 = g[k + 1];
    }
    var cs = Math.max(U1 - U0, V1 - V0, 1e-6) / Math.max(2, Math.min(40, Math.round(Math.sqrt(n / 2))));
    var gu = Math.max(1, Math.ceil((U1 - U0) / cs)), gv = Math.max(1, Math.ceil((V1 - V0) / cs)), cells = gu * gv;
    if (grid.start.length < cells + 2) grid.start = new Int32Array(cells * 2 + 2);
    var start = grid.start, i, j, i0, i1, j0, j1;
    start.fill(0, 0, cells + 2);
    for (var pass = 0; pass < 2; pass++) {
      if (pass) {
        for (i = 1; i <= cells; i++) start[i] += start[i - 1];
        start[cells + 1] = start[cells];
        if (grid.items.length < start[cells]) grid.items = new Int32Array(start[cells] * 2);
      }
      for (k = 0; k < end; k += 4) {
        i0 = cellAt(Math.min(g[k], g[k + 2]) - U0, cs, gu); i1 = cellAt(Math.max(g[k], g[k + 2]) - U0, cs, gu);
        j0 = cellAt(Math.min(g[k + 1], g[k + 3]) - V0, cs, gv); j1 = cellAt(Math.max(g[k + 1], g[k + 3]) - V0, cs, gv);
        for (j = j0; j <= j1; j++) for (i = i0; i <= i1; i++) {
          if (pass) grid.items[--start[j * gu + i + 1]] = k;
          else start[j * gu + i + 1]++;
        }
      }
    }
    grid.U0 = U0; grid.V0 = V0; grid.cs = cs; grid.gu = gu; grid.gv = gv;
  }
  function linf(ax, ay, bx, by) {
    var m = Math.min(Math.max(Math.abs(ax), Math.abs(ay)), Math.max(Math.abs(bx), Math.abs(by)));
    var dx = bx - ax, dy = by - ay, t, x;
    if (dx !== dy) { t = (ay - ax) / (dx - dy); if (t > 0 && t < 1) { x = Math.abs(ax + t * dx); if (x < m) m = x; } }
    if (dx !== -dy) { t = -(ax + ay) / (dx + dy); if (t > 0 && t < 1) { x = Math.abs(ax + t * dx); if (x < m) m = x; } }
    return m;
  }
  function bruteDist(F, u, v) {
    var g = F.g, poly = F.poly, end = F.end, dm = Infinity, inside = false;
    for (var k = 0; k < end; k += 4) {
      var ax = g[k] - u, ay = g[k + 1] - v, bx = g[k + 2] - u, by = g[k + 3] - v;
      if (k < poly && (ay > 0) !== (by > 0) && ax + (bx - ax) * ay / (ay - by) > 0) inside = !inside;
      if ((ax > dm && bx > dm) || (ax < -dm && bx < -dm) || (ay > dm && by > dm) || (ay < -dm && by < -dm)) continue;
      var d = linf(ax, ay, bx, by);
      if (d < dm) dm = d;
    }
    return inside ? dm : -dm;
  }
  function cellDist(F, cell, u, v, dm) {
    var g = F.g, items = F.grid.items, start = F.grid.start;
    for (var t = start[cell + 1]; t < start[cell + 2]; t++) {
      var k = items[t], ax = g[k] - u, ay = g[k + 1] - v, bx = g[k + 2] - u, by = g[k + 3] - v;
      if ((ax > dm && bx > dm) || (ax < -dm && bx < -dm) || (ay > dm && by > dm) || (ay < -dm && by < -dm)) continue;
      var d = linf(ax, ay, bx, by);
      if (d < dm) dm = d;
    }
    return dm;
  }
  function fitDist(F, u, v) {
    var G = F.grid, cs = G.cs, gu = G.gu, gv = G.gv, ci = Math.floor((u - G.U0) / cs), cj = Math.floor((v - G.V0) / cs);
    if (ci < 0 || cj < 0 || ci >= gu || cj >= gv) return bruteDist(F, u, v);
    var g = F.g, poly = F.poly, start = G.start, items = G.items, inside = false, dm = Infinity, c, t, k, ay, by;
    for (c = ci; c < gu; c++) {
      var row = cj * gu + c;
      for (t = start[row + 1]; t < start[row + 2]; t++) {
        k = items[t];
        if (k >= poly) continue;
        ay = g[k + 1] - v; by = g[k + 3] - v;
        if ((ay > 0) === (by > 0)) continue;
        var x = g[k] + (g[k + 2] - g[k]) * ay / (ay - by);
        if (x > u && Math.min(gu - 1, Math.floor((x - G.U0) / cs)) === c) inside = !inside;
      }
    }
    for (var r = 0; ; r++) {
      if (r > 0 && (r - 1) * cs >= dm) break;
      if (ci - r < 0 && cj - r < 0 && ci + r >= gu && cj + r >= gv) break;
      for (var j = Math.max(0, cj - r); j <= Math.min(gv - 1, cj + r); j++) {
        if (j === cj - r || j === cj + r) {
          for (var i = Math.max(0, ci - r); i <= Math.min(gu - 1, ci + r); i++) dm = cellDist(F, j * gu + i, u, v, dm);
        } else {
          if (ci - r >= 0) dm = cellDist(F, j * gu + ci - r, u, v, dm);
          if (ci + r < gu) dm = cellDist(F, j * gu + ci + r, u, v, dm);
        }
      }
    }
    return inside ? dm : -dm;
  }
  function toFit(F, x, y) { return [(x * F.c + y * F.s) * F.ia, (-x * F.s + y * F.c) * F.ib]; }
  function fromFit(F, u, v) { var x = u * F.a, y = v * F.b; return [x * F.c - y * F.s, x * F.s + y * F.c]; }
  function heapPush(q, c) {
    q.push(c);
    for (var i = q.length - 1; i > 0;) { var j = (i - 1) >> 1; if (q[j].max >= c.max) break; q[i] = q[j]; q[j] = c; i = j; }
  }
  function heapPop(q) {
    var top = q[0], last = q.pop();
    if (q.length) {
      q[0] = last;
      for (var i = 0; ;) {
        var l = 2 * i + 1, r = l + 1, k = i;
        if (l < q.length && q[l].max > q[k].max) k = l;
        if (r < q.length && q[r].max > q[k].max) k = r;
        if (k === i) break;
        q[i] = q[k]; q[k] = last; i = k;
      }
    }
    return top;
  }
  function poleOf(F, seeds, budget, enough) {
    var best = { u: 0, v: 0, d: -Infinity }, evals = 0, q = [], i;
    var cell = function (u, v, h) {
      evals++;
      var d = fitDist(F, u, v);
      if (d > best.d) best = { u: u, v: v, d: d };
      return { u: u, v: v, h: h, max: d + h };
    };
    for (i = 0; i < seeds.length; i++) { var t = toFit(F, seeds[i][0], seeds[i][1]); cell(t[0], t[1], 0); }
    var w = F.u1 - F.u0, hh = F.v1 - F.v0;
    if (evals < budget && w > 0 && hh > 0) {
      var size = Math.max(Math.min(w, hh), Math.sqrt(w * hh / 20)), h = size / 2;
      for (var u = F.u0; u < F.u1; u += size) for (var v = F.v0; v < F.v1; v += size) heapPush(q, cell(u + h, v + h, h));
      while (q.length && evals < budget && !(best.d >= enough)) {
        var c = heapPop(q), eps = Math.max(0.2, best.d * 0.04);
        if (c.max - best.d <= eps) break;
        h = c.h / 2;
        var kids = [cell(c.u - h, c.v - h, h), cell(c.u + h, c.v - h, h), cell(c.u - h, c.v + h, h), cell(c.u + h, c.v + h, h)];
        for (i = 0; i < 4; i++) if (kids[i].max > best.d + eps) heapPush(q, kids[i]);
      }
    }
    if (best.d === -Infinity) return null;
    var xy = fromFit(F, best.u, best.v);
    return { x: xy[0], y: xy[1], d: best.d };
  }
  function climb(F, x, y) {
    var t = toFit(F, x, y), u = t[0], v = t[1], d = fitDist(F, u, v), step = Math.max(0.3, Math.abs(d) * 0.25);
    for (var it = 0; it < 3; it++, step /= 2) {
      var moves = [[step, 0], [-step, 0], [0, step], [0, -step]];
      for (var i = 0; i < 4; i++) {
        var e = fitDist(F, u + moves[i][0], v + moves[i][1]);
        if (e > d) { d = e; u += moves[i][0]; v += moves[i][1]; }
      }
    }
    var xy = fromFit(F, u, v);
    return { x: xy[0], y: xy[1], d: d };
  }
  function fontFor(d, o) {
    var pad = Math.max(1, Math.min(2.2, d * o.h * 0.12));
    return Math.min(d * 0.9, d - pad / (o.h / 2), d - 1.8 * pad / (o.w / 2));
  }
  function roomFor(f, o) { return 1.6 * Math.max(f / 0.9, f + 4.4 / o.h, f + 8 / o.w); }
  function principalAxis(s, x, y) {
    var pick = null, area = 0;
    for (var i = 0; i < s.rings.length; i++) {
      var r = s.rings[i];
      if (x < r.x0 || x > r.x1 || y < r.y0 || y > r.y1) continue;
      var a = (r.x1 - r.x0) * (r.y1 - r.y0);
      if (a > area) { area = a; pick = r; }
    }
    if (!pick) return null;
    var xy = pick.xy, n = pick.n, A = 0, Sx = 0, Sy = 0, Sxx = 0, Syy = 0, Sxy = 0, ox = pick.x0, oy = pick.y0;
    for (var k = 0, j = n - 1; k < n; j = k++) {
      var x0 = xy[2 * j] - ox, y0 = xy[2 * j + 1] - oy, x1 = xy[2 * k] - ox, y1 = xy[2 * k + 1] - oy, cr = x0 * y1 - x1 * y0;
      A += cr; Sx += (x0 + x1) * cr; Sy += (y0 + y1) * cr;
      Sxx += (x0 * x0 + x0 * x1 + x1 * x1) * cr; Syy += (y0 * y0 + y0 * y1 + y1 * y1) * cr;
      Sxy += (x0 * y1 + 2 * x0 * y0 + 2 * x1 * y1 + x1 * y0) * cr;
    }
    if (Math.abs(A) < 1) return null;
    A /= 2;
    var mx = Sx / (6 * A), my = Sy / (6 * A);
    var cxx = Sxx / (12 * A) - mx * mx, cyy = Syy / (12 * A) - my * my, cxy = Sxy / (24 * A) - mx * my;
    var tr = (cxx + cyy) / 2, det = Math.sqrt(Math.max(0, (cxx - cyy) * (cxx - cyy) / 4 + cxy * cxy));
    var l1 = tr + det, l2 = tr - det;
    if (l2 <= 0) return null;
    return { ang: 0.5 * Math.atan2(2 * cxy, cxx - cyy), e: Math.sqrt(l1 / l2) };
  }
  function fitPolity(p, name, s, obst, seeds, budget, memo) {
    var cap = p.people ? 15 : 26, opts = labelOptions(name, p.people), best = null, i, o, F, r, f;
    if (memo) {
      o = labelOptions(name, p.people, memo.sp)[memo.oi];
      var at = projectLL(memo.lon, memo.lat);
      if (o && at) {
        F = prepFit(s, obst, o.w / 2, o.h / 2, memo.ang);
        r = climb(F, at[0], at[1]);
        if (r.d > 0) return { o: o, oi: memo.oi, x: r.x, y: r.y, f: Math.min(cap, fontFor(r.d, o)), ang: memo.ang };
      }
      budget = seeds.length;
    }
    for (i = 0; i < opts.length; i++) {
      o = opts[i];
      F = prepFit(s, obst, o.w / 2, o.h / 2, 0);
      r = poleOf(F, best ? [[best.x, best.y]].concat(seeds) : seeds, best ? budget / 3 : budget, roomFor(cap, o));
      if (!r || r.d <= 0) continue;
      f = fontFor(r.d, o);
      if (!best || f > best.f * 1.12) best = { o: o, oi: i, x: r.x, y: r.y, f: f, ang: 0 };
      if (best.f >= cap) break;
    }
    var ax = best && best.f < cap * 0.9 && budget > seeds.length ? principalAxis(s, best.x, best.y) : null;
    if (ax && ax.e > 1.9 && Math.abs(ax.ang) > 0.14 && (Math.abs(ax.ang) <= 0.75 || (ax.e > 2.4 && best.f < 10))) {
      var ang = Math.abs(ax.ang) > 1.2 ? -HALF_PI : ax.ang, top = best;
      for (i = 0; i <= top.oi; i += top.oi || 1) {
        o = opts[i];
        F = prepFit(s, obst, o.w / 2, o.h / 2, ang);
        r = poleOf(F, [[top.x, top.y]], budget / 2, roomFor(cap, o));
        if (r && r.d > 0 && fontFor(r.d, o) > best.f * (best === top ? 1.4 : 1.12)) best = { o: o, oi: i, x: r.x, y: r.y, f: fontFor(r.d, o), ang: ang };
      }
    }
    if (best && best.f < 8.5 && !p.people) {
      o = labelOptions(name, false, TIGHT)[best.oi];
      F = prepFit(s, obst, o.w / 2, o.h / 2, best.ang);
      r = poleOf(F, [[best.x, best.y]], budget / 2, roomFor(cap, o));
      if (r && r.d > 0 && fontFor(r.d, o) > best.f) best = { o: o, oi: best.oi, x: r.x, y: r.y, f: fontFor(r.d, o), ang: best.ang };
    }
    if (best) best.f = Math.min(cap, best.f);
    return best;
  }
  function seaSide(s, size, lines) {
    var main = null, i;
    for (i = 0; i < s.rings.length; i++) { var r = s.rings[i]; if (!main || (r.x1 - r.x0) * (r.y1 - r.y0) > (main.x1 - main.x0) * (main.y1 - main.y0)) main = r; }
    if (!main || main.x1 - main.x0 > 200 || main.y1 - main.y0 > 200) return null;
    ctx.font = "400 " + size + "px " + SERIF;
    ctx.letterSpacing = "1px";
    var w = 0;
    lines.forEach(function (l) { w = Math.max(w, ctx.measureText(l).width); });
    var hw = w / 2 + 2, hh = size * 0.6 * lines.length + 1, out = [];
    [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (d) {
      var xy = main.xy, best = -Infinity, bx = 0, by = 0;
      for (var k = 0; k < main.n; k++) { var v = xy[2 * k] * d[0] + xy[2 * k + 1] * d[1]; if (v > best) { best = v; bx = xy[2 * k]; by = xy[2 * k + 1]; } }
      out.push(mkBox(bx + d[0] * (hw + 2), by + d[1] * (hh + 2), hw, hh, 0));
    });
    return out;
  }
  function boxOnLand(L, b, cache) {
    for (var i = 0; i < L.feats.length; i++) {
      var feats = L.feats[i], near = false;
      for (var j = 0; j < feats.length && !near; j++) {
        var f = feats[j];
        if (!inView(f)) continue;
        if (flat) { near = true; break; }
        var px = cx + B.r * (f.cx * B.ex + f.cy * B.ey + f.cz * B.ez), py = cy - B.r * (f.cx * B.nx + f.cy * B.ny + f.cz * B.nz);
        var rad = B.r * Math.sin(Math.min(f.radius, HALF_PI)) + 4;
        near = f.radius >= HALF_PI || (px + rad > b.x && px - rad < b.x + b.w && py + rad > b.y && py - rad < b.y + b.h);
      }
      if (!near) continue;
      var s = cache.get(i);
      if (s === undefined) { s = screenShape(feats, 1, 0); cache.set(i, s); }
      if (!s || s.x0 > b.x + b.w || s.x1 < b.x || s.y0 > b.y + b.h || s.y1 < b.y) continue;
      var F = prepFit(s, [], b.w / 2, b.h / 2, 0), t = toFit(F, b.x + b.w / 2, b.y + b.h / 2), d = fitDist(F, t[0], t[1]);
      if (d > -1) return true;
    }
    return false;
  }
  var anchors = new Map(), settleLabels = 0;
  function layoutPolities(snap, placed, kp) {
    var key = useLevel(), L = level(snap, key), items = [], small = [], shapes = new Map(), S = localScale();
    var quick = moving || rangeActive, budget = 120;
    for (var k = 0; k < snap.order.length; k++) {
      var p = snap.order[k], lab = p.label;
      if (!lab || lab[2] * kp < 0.6) continue;
      var name = polityName(p.id);
      if (!name) continue;
      var size = Math.sqrt(lab[5]) * kp, s = screenShape(L.feats[p.i], Math.max(0.8, Math.min(5, size / 40)), Math.min(4, size / 8));
      shapes.set(p.i, s);
      if (!s) continue;
      var seeds = labelSpots(lab);
      var got = fitPolity(p, name, s, obstacles(placed, s), seeds, quick ? seeds.length : budget, quick ? anchors.get(p.id) : null);
      if (!got || got.f < (p.people ? 8.5 : 7.5)) {
        if (!p.people && (lab[5] > 1500 || lab[2] * kp > 2) && S >= 600 && Math.sqrt(lab[5]) * kp < 70 && s.x0 > 0 && s.y0 > 0 && s.x1 < W && s.y1 < H) small.push({ p: p, name: name, s: s });
        continue;
      }
      var box = mkBox(got.x, got.y, got.o.w * got.f / 2 + 1, got.f * got.o.h / 2 + 1, got.ang);
      if (!insideView(box) || collides(placed, box)) continue;
      placed.push(box);
      items.push({ id: p.id, name: name, people: p.people, x: got.x, y: got.y, f: got.f, ang: got.ang, lines: got.o.lines, space: got.o.space, box: box });
      if (!quick) {
        var ll = lonLatAt(got.x, got.y);
        if (ll) anchors.set(p.id, { lon: ll[0], lat: ll[1], oi: got.oi, sp: got.o.space, ang: got.ang });
      }
    }
    for (var j = 0; j < small.length; j++) {
      var it = small[j], at = projectLL(it.p.label[0], it.p.label[1]);
      if (at && at[2] < 0.45) continue;
      var opts = labelOptions(it.name, false), lines = opts[it.name.length > 24 && opts[2] ? 2 : it.name.length > 10 && opts[1] ? 1 : 0].lines;
      var boxes = seaSide(it.s, 9, lines);
      if (!boxes) continue;
      for (var q = 0; q < boxes.length; q++) {
        var b = boxes[q];
        if (!insideView(b) || collides(placed, b) || boxOnLand(L, b, shapes)) continue;
        placed.push(b);
        items.push({ id: it.p.id, name: it.name, people: false, x: b.cx, y: b.cy, f: 9, ang: 0, lines: lines, space: 1 / 9, box: b, sea: true });
        break;
      }
    }
    return items;
  }
  function drawPolityLabels(snap, placed, kp) {
    var S = localScale(), caps = reserveCapitals(snap, placed, S), nFixed = placed.length - caps.length;
    if (!layers.states) return;
    var quick = moving || rangeActive;
    var key = [snap.key, useLevel(), view.lon.toFixed(5), view.lat.toFixed(5), view.zoom.toFixed(5), flat ? 1 : 0, W, H, quick ? 1 : 0, caps.length,
      placed.slice(0, nFixed).map(function (b) { return Math.round(b.x) + ":" + Math.round(b.y) + ":" + Math.round(b.w) + ":" + Math.round(b.h); }).join(",")].join("|");
    var memo = labelCache.get("layout");
    if (!memo || memo.key !== key) { memo = { key: key, items: layoutPolities(snap, placed.slice(), kp) }; labelCache.set("layout", memo); }
    if (quick && !settleLabels) settleLabels = setTimeout(function wait() { settleLabels = moving || rangeActive ? setTimeout(wait, 200) : 0; if (!settleLabels) scheduleRender(); }, 200);
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    for (var k = 0; k < memo.items.length; k++) {
      var it = memo.items[k], f = it.f, sp = f * it.space;
      placed.push(it.box);
      placedLabels.push({ name: it.name, x: it.x, y: it.y, size: f, kind: it.people ? "people" : "polity", id: it.id, ang: it.ang, box: it.box, sea: !!it.sea });
      ctx.save();
      ctx.translate(it.x, it.y);
      if (it.ang) ctx.rotate(it.ang);
      ctx.font = (it.people ? "italic 400 " : "400 ") + f.toFixed(1) + "px " + SERIF;
      ctx.letterSpacing = sp.toFixed(2) + "px";
      ctx.lineWidth = it.sea ? 3 : Math.max(2, f * 0.22);
      ctx.strokeStyle = it.sea ? pal.ocean : pal["label-halo"];
      ctx.fillStyle = it.people ? pal.people : pal.label;
      for (var i = 0; i < it.lines.length; i++) {
        var ly = (i - (it.lines.length - 1) / 2) * f * LINE_H;
        ctx.strokeText(it.lines[i], sp / 2, ly);
        ctx.fillText(it.lines[i], sp / 2, ly);
      }
      ctx.restore();
    }
    ctx.letterSpacing = "0px";
  }

  var SEAS = [
    ["North Atlantic Ocean", -42, 31, 1], ["South Atlantic Ocean", -17, -24, 1], ["North Pacific Ocean", -152, 31, 1],
    ["South Pacific Ocean", -122, -27, 1], ["Pacific Ocean", 168, 9, 1], ["Indian Ocean", 79, -22, 1],
    ["Southern Ocean", 95, -59, 1], ["Arctic Ocean", 10, 84, 1],
    ["Mediterranean Sea", 18, 34.6, 2], ["Caribbean Sea", -76, 15, 2], ["Gulf of Mexico", -91, 25, 2], ["North Sea", 3.5, 56, 2],
    ["Baltic Sea", 19.4, 57.6, 2], ["Black Sea", 34.4, 43.3, 2], ["Caspian Sea", 50.8, 42.4, 2], ["Red Sea", 38.4, 20.4, 2],
    ["Arabian Sea", 64, 14, 2], ["Bay of Bengal", 89, 15, 2], ["South China Sea", 114, 13, 2], ["East China Sea", 125.5, 29, 2],
    ["Sea of Japan", 134.5, 40.2, 2], ["Sea of Okhotsk", 150, 54, 2], ["Bering Sea", -178, 58, 2], ["Gulf of Alaska", -146, 56.5, 2],
    ["Hudson Bay", -86, 59.5, 2], ["Labrador Sea", -55, 58, 2], ["Norwegian Sea", 2, 68, 2], ["Barents Sea", 40, 73.5, 2],
    ["Kara Sea", 70, 75, 2], ["Laptev Sea", 125, 76, 2], ["East Siberian Sea", 165, 74, 2], ["Beaufort Sea", -140, 72.5, 2],
    ["Greenland Sea", -5, 76, 2], ["Coral Sea", 155, -16, 2], ["Tasman Sea", 160, -38, 2], ["Philippine Sea", 132, 18, 2],
    ["Gulf of Guinea", 2.5, 1.5, 2], ["Weddell Sea", -45, -72, 2], ["Ross Sea", -175, -76, 2],
    ["Persian Gulf", 51.5, 27, 3], ["Yellow Sea", 123, 35.5, 3], ["Adriatic Sea", 15.6, 42.9, 3], ["Aegean Sea", 25, 38.6, 3],
    ["Tyrrhenian Sea", 12, 40, 3], ["Bay of Biscay", -5, 45.5, 3], ["Java Sea", 110, -5, 3], ["Celebes Sea", 122, 3.5, 3],
    ["Banda Sea", 127, -5.5, 3], ["Arafura Sea", 135, -10, 3], ["Timor Sea", 126, -11.5, 3], ["Gulf of Aden", 48, 12.6, 3],
    ["Andaman Sea", 96, 11, 3], ["Chukchi Sea", -170, 69, 3], ["Mozambique Channel", 41, -18, 3], ["Great Australian Bight", 130, -35.5, 3]
  ].map(function (r) {
    var name = r[3] === 1 ? r[0].toUpperCase() : r[0], cut = name.lastIndexOf(" ");
    var lines = r[3] === 1 && name.split(" ").length > 2 ? [name.slice(0, cut), name.slice(cut + 1)] : [name];
    return { lines: lines, lon: r[1], lat: r[2], tier: r[3] };
  });
  function seaShown(t, S) { return t === 1 ? S >= 160 && S < 3000 : t === 2 ? S >= 480 && S < 9000 : S >= 1400 && S < 14000; }
  function drawSeaLabels(placed, S) {
    if (!layers.seas) return;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    for (var i = 0; i < SEAS.length; i++) {
      var sl = SEAS[i];
      if (!seaShown(sl.tier, S)) continue;
      var p = projectLL(sl.lon, sl.lat);
      if (!p || p[2] < 0.3) continue;
      var size = sl.tier === 1 ? Math.max(11, Math.min(15, S / 45)) : sl.tier === 2 ? 12.5 : 11, spacing = size * (sl.tier === 1 ? 0.3 : 0.12);
      ctx.font = "italic 400 " + size.toFixed(1) + "px " + SERIF;
      ctx.letterSpacing = spacing.toFixed(2) + "px";
      var w = 0;
      for (var j = 0; j < sl.lines.length; j++) w = Math.max(w, ctx.measureText(sl.lines[j]).width);
      var lh = size * 1.3, box = mkBox(p[0], p[1], w / 2 + 2, size * 0.6 + lh * (sl.lines.length - 1) / 2, 0);
      if (!insideView(box) || collides(placed, box)) continue;
      placed.push(box);
      ctx.lineWidth = 3; ctx.strokeStyle = pal.ocean; ctx.fillStyle = pal["sea-label"];
      for (j = 0; j < sl.lines.length; j++) {
        var ly = p[1] + (j - (sl.lines.length - 1) / 2) * lh;
        ctx.strokeText(sl.lines[j], p[0] + spacing / 2, ly);
        ctx.fillText(sl.lines[j], p[0] + spacing / 2, ly);
      }
    }
    ctx.letterSpacing = "0px";
  }
  function capitalAt(c, day) {
    var m = c[4];
    if (m) for (var i = 0; i < m.length; i++) if (day <= m[i][0]) return [m[i][1], m[i][2], m[i][3]];
    return [namedAt(c[3], c[0], day), c[1], c[2]];
  }
  function namedAt(names, fallback, when) {
    var n = fallback;
    if (names) for (var i = 0; i < names.length; i++) if (names[i][0] <= when) n = names[i][1];
    return n;
  }
  function placesNow() {
    var y = Math.round(now);
    return places.filter(function (r) { return r[3] <= y && (r[4] === null || y < r[4]); });
  }
  function cityTier(S) { return S < 330 ? 0 : S < 480 ? 1 : S < 800 ? 2 : S < 1400 ? 3 : 4; }
  function markSize(S) { return S < 900 ? 1 : 1.15; }
  function capitalList(snap, S) {
    var out = [];
    if (!snap.modern || S < 230) return out;
    var day = dayOfTime(now);
    for (var i = 0; i < snap.order.length; i++) {
      var p = snap.order[i];
      if (!p.cap) continue;
      var c = capitalAt(p.cap, day), pt = projectLL(c[1], c[2]);
      if (pt && pt[2] >= 0.25) out.push({ pt: pt, name: c[0] });
    }
    return out;
  }
  function reserveCapitals(snap, placed, S) {
    var list = S >= 700 && layers.capitals ? capitalList(snap, S) : [], rm = 4.3 * markSize(S) + 0.5, out = [];
    for (var i = 0; i < list.length; i++) {
      var pt = list[i].pt, mark = { x: pt[0] - rm, y: pt[1] - rm, w: 2 * rm, h: 2 * rm };
      if (!insideView(mark) || collides(placed, mark)) continue;
      placed.push(mark);
      out.push(list[i]);
    }
    out.placed = placed;
    out.held = S >= 700;
    capSpots = out;
    return out;
  }
  var capSpots = [];
  function drawMark(p, k, kind) {
    var x = p[0], y = p[1];
    ctx.fillStyle = pal["city-halo"];
    if (kind === 0) {
      ctx.beginPath(); ctx.arc(x, y, 4.3 * k, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 3.2 * k, 0, TAU); ctx.strokeStyle = pal.city; ctx.lineWidth = 0.85; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 1.35 * k, 0, TAU); ctx.fillStyle = pal.city; ctx.fill();
      return;
    }
    var r = kind === 1 ? 1.85 * k : 1.4 * k;
    ctx.beginPath(); ctx.arc(x, y, r + 1, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = kind === 1 ? pal.city : pal.town; ctx.fill();
  }
  var CITY_STYLE = [
    { size: 12.4, font: "400 ", ls: 0.2, ink: "city", halo: 2.4 },
    { size: 11.2, font: "400 ", ls: 0.1, ink: "city", halo: 2.2 },
    { size: 10.8, font: "italic 400 ", ls: 0, ink: "town", halo: 2 }
  ];
  function placeOne(placed, p, name, k, kind, held) {
    if (!(kind === 0 ? layers.capitals : layers.cities)) return false;
    var st = CITY_STYLE[kind], size = st.size * (k > 1 ? 1.05 : 1);
    ctx.font = st.font + size.toFixed(2) + "px " + SERIF;
    ctx.letterSpacing = st.ls + "px";
    var w = ctx.measureText(name).width;
    var rm = kind === 0 ? 4.3 * k : (kind === 1 ? 2.85 : 2.4) * k, h = size * 0.86, gap = rm + 3;
    var mark = held ? null : { x: p[0] - rm, y: p[1] - rm, w: 2 * rm, h: 2 * rm };
    if (mark && (!insideView(mark) || collides(placed, mark))) return false;
    var spots = [[p[0] + gap, p[1]], [p[0] - gap - w, p[1]], [p[0] - w / 2, p[1] - rm - 2.5 - h / 2], [p[0] - w / 2, p[1] + rm + 2.5 + h / 2]];
    for (var s = 0; s < spots.length; s++) {
      var tx = spots[s][0], ty = spots[s][1], box = { x: tx - 1.5, y: ty - h / 2 - 1.5, w: w + 3, h: h + 3 };
      if (!insideView(box) || collides(placed, box)) continue;
      if (mark) placed.push(mark);
      placed.push(box);
      drawMark(p, k, kind);
      ctx.textAlign = "left";
      ctx.lineWidth = st.halo; ctx.strokeStyle = pal["city-halo"]; ctx.fillStyle = pal[st.ink];
      ctx.strokeText(name, tx, ty); ctx.fillText(name, tx, ty);
      placedLabels.push({ name: name, x: p[0], y: p[1], size: size, kind: ["capital", "city", "town"][kind], box: box });
      return true;
    }
    return false;
  }
  function drawPlaces(placed, S) {
    if (S < 230) return;
    var k = markSize(S), modernNow = current && current.modern, day = modernNow ? dayOfTime(now) : -Infinity, i;
    ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    if (modernNow) {
      var held = capSpots.placed === placed && capSpots.held, caps = held ? capSpots : capitalList(current, S);
      for (i = 0; i < caps.length; i++) placeOne(placed, caps[i].pt, caps[i].name, k, 0, held);
    }
    if (modernNow && cities && day >= cities.from) {
      var top = cityTier(S);
      for (i = 0; i < cities.rows.length; i++) {
        var c = cities.rows[i];
        if (c[3] > top || (c[4] !== null && day < c[4])) continue;
        var p = projectLL(c[1], c[2]);
        if (p && p[2] >= 0.25) placeOne(placed, p, namedAt(c[5], c[0], day), k, c[3] <= 1 ? 1 : 2);
      }
    } else {
      var list = placesNow(), y = Math.round(now);
      for (i = 0; i < list.length; i++) {
        var q = projectLL(list[i][1], list[i][2]);
        if (q && q[2] >= 0.25) placeOne(placed, q, namedAt(list[i][5], list[i][0], y), k, 1);
      }
    }
    ctx.letterSpacing = "0px";
    ctx.textAlign = "center";
  }

  function inBounds(b, ll) {
    if (ll[1] < b[0][1] || ll[1] > b[1][1]) return false;
    if (b[0][0] <= b[1][0]) return ll[0] >= b[0][0] && ll[0] <= b[1][0];
    return ll[0] >= b[0][0] || ll[0] <= b[1][0];
  }
  var landGeo = null;
  function polityAt(x, y) {
    if (!current) return null;
    var ll = lonLatAt(x, y);
    if (!ll) return null;
    if (landGeo && !d3.geoContains(landGeo, ll)) return null;
    var L = level(current, "hi"), best = null, bestA = Infinity;
    for (var i = 0; i < current.polys.length; i++) {
      var p = current.polys[i];
      if (!p || !inBounds(L.bounds[i], ll)) continue;
      if (L.area[i] < bestA && d3.geoContains(L.geo[i], ll)) { best = p; bestA = L.area[i]; }
    }
    return best;
  }

  function degPerPx() { return 180 / (Math.PI * (flat ? FB.k : B.r)); }
  function panBy(dx, dy) {
    var s = degPerPx();
    view.lon -= dx * s; view.lat += dy * s;
    applyView();
    nudge();
  }
  function zoomAt(z, x, y) {
    var before = lonLatAt(x, y);
    view.zoom = z;
    applyView();
    if (before) {
      if (flat) {
        view.lon = before[0] - (x - cx) / FB.k / D2R;
        view.lat = before[1] + (y - cy) / FB.k / D2R;
        applyView();
      } else {
        for (var i = 0; i < 2; i++) {
          var after = projection(before);
          if (!after) break;
          var s = degPerPx();
          view.lon -= (x - after[0]) * s;
          view.lat += (y - after[1]) * s;
          applyView();
        }
      }
    }
    nudge();
  }

  var pointers = new Map(), drag = null, pinch = null, inertia = null, downAt = null;
  function stopInertia() { if (inertia) { cancelAnimationFrame(inertia.raf); inertia = null; } }
  canvas.addEventListener("pointerdown", function (e) {
    stopInertia();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    hideTip();
    if (pointers.size === 1) {
      drag = { x: e.clientX, y: e.clientY, samples: [[e.timeStamp, e.clientX, e.clientY]] };
      downAt = { x: e.clientX, y: e.clientY, t: e.timeStamp, moved: false };
    } else if (pointers.size === 2) {
      var pts = Array.from(pointers.values());
      pinch = { d: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), z: view.zoom, mx: (pts[0].x + pts[1].x) / 2, my: (pts[0].y + pts[1].y) / 2 };
      drag = null;
      if (downAt) downAt.moved = true;
    }
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!pointers.has(e.pointerId)) {
      if (e.pointerType === "mouse") hoverAt(e.clientX, e.clientY);
      return;
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size >= 2) {
      var pts = Array.from(pointers.values());
      var d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), mx = (pts[0].x + pts[1].x) / 2, my = (pts[0].y + pts[1].y) / 2;
      zoomAt(pinch.z * d / Math.max(1, pinch.d), mx, my);
      panBy(mx - pinch.mx, my - pinch.my);
      pinch.mx = mx; pinch.my = my;
      return;
    }
    if (!drag) return;
    if (downAt && !downAt.moved && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) downAt.moved = true;
    if (!downAt || downAt.moved) {
      panBy(e.clientX - drag.x, e.clientY - drag.y);
      drag.x = e.clientX; drag.y = e.clientY;
      drag.samples.push([e.timeStamp, e.clientX, e.clientY]);
      if (drag.samples.length > 8) drag.samples.shift();
      setHover(-1);
    }
  });
  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 1) {
      var rest = Array.from(pointers.values())[0];
      drag = { x: rest.x, y: rest.y, samples: [] };
      return;
    }
    if (pointers.size) return;
    var clickLike = downAt && !downAt.moved && e.timeStamp - downAt.t < 600 && e.type === "pointerup";
    if (clickLike) {
      var p = polityAt(e.clientX, e.clientY);
      select(p ? p.id : -1);
    } else if (drag && drag.samples.length >= 2 && !reduceMotion) {
      var s = drag.samples, a = s[0], b = s[s.length - 1];
      for (var i = s.length - 1; i > 0; i--) if (b[0] - s[i][0] > 80) { a = s[i]; break; }
      var dt = Math.max(8, b[0] - a[0]);
      var vx = (b[1] - a[1]) / dt, vy = (b[2] - a[2]) / dt, sp = Math.hypot(vx, vy);
      if (e.timeStamp - b[0] < 60 && sp > 0.25) {
        if (sp > 2) { vx *= 2 / sp; vy *= 2 / sp; }
        inertia = { vx: vx * 16, vy: vy * 16, raf: 0 };
        var step = function () {
          if (!inertia) return;
          panBy(inertia.vx, inertia.vy);
          inertia.vx *= 0.9; inertia.vy *= 0.9;
          if (Math.hypot(inertia.vx, inertia.vy) < 0.3) { inertia = null; return; }
          inertia.raf = requestAnimationFrame(step);
        };
        inertia.raf = requestAnimationFrame(step);
      }
    }
    drag = null; downAt = null;
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse" && !pointers.size) { setHover(-1); hideTip(); } });
  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    stopInertia();
    var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomAt(view.zoom * Math.exp(-dy * 0.0016), e.clientX, e.clientY);
  }, { passive: false });
  canvas.addEventListener("dblclick", function (e) { zoomAt(view.zoom * 2, e.clientX, e.clientY); });

  var hoverRaf = 0, hoverXY = null;
  function hoverAt(x, y) {
    hoverXY = [x, y];
    if (hoverRaf) return;
    hoverRaf = requestAnimationFrame(function () {
      hoverRaf = 0;
      if (!hoverXY || drag) return;
      var p = polityAt(hoverXY[0], hoverXY[1]);
      setHover(p ? p.id : -1);
      if (p) showTip(hoverXY[0], hoverXY[1], p); else hideTip();
    });
  }
  function setHover(id) {
    if (id === hoverId) return;
    hoverId = id;
    canvas.classList.toggle("is-over", id >= 0);
    scheduleRender();
  }
  var tip = $("tip");
  function showTip(x, y, p) {
    tip.textContent = polityName(p.id);
    var sub = p.ruler >= 0 ? "held by " + polityName(p.ruler) : p.people ? "a people or culture" : "";
    if (sub) { var s = document.createElement("small"); s.textContent = sub; tip.appendChild(s); }
    tip.hidden = false;
    var w = tip.offsetWidth;
    tip.style.left = (x + 14 + w > W - 8 ? x - w - 28 : x) + "px";
    tip.style.top = y + "px";
  }
  function hideTip() { tip.hidden = true; }

  function fmtYear(y) {
    if (y < 0) return -y + " BC";
    if (y < 1000) return "AD " + y;
    return String(y);
  }
  function fmtDay(day) { var d = dateOfDay(day); return d[2] + " " + MONTHS[d[1] - 1] + " " + d[0]; }
  function fmtNow(t) {
    if (!isModern(t)) return fmtYear(Math.round(t));
    var d = dateOfDay(dayOfTime(t));
    return (d[2] === MID_DAY ? "" : d[2] + " ") + MONTHS[d[1] - 1] + " " + d[0];
  }
  function monthTime(y, m) { return timeOfDay(dayFromDate(y, m, MID_DAY)); }
  function changeBefore(day) {
    var c = modern.changes, lo = 0, hi = c.length - 1, k = -1;
    while (lo <= hi) { var mid = (lo + hi) >> 1; if (c[mid] <= day) { k = mid; lo = mid + 1; } else hi = mid - 1; }
    return k;
  }
  function monthIndex(word) {
    var w = word.toLowerCase();
    for (var i = 0; i < 12; i++) if (MONTHS[i].toLowerCase().indexOf(w) === 0 && w.length >= 3) return i + 1;
    return 0;
  }
  function modernTime(y, m, d) {
    if (!modern || y < 1886) return null;
    if (!m) return monthTime(y, 7);
    if (m > 12 || (d && d > new Date(Date.UTC(y, m, 0)).getUTCDate())) return null;
    return timeOfDay(dayFromDate(y, m, d || MID_DAY));
  }
  function parseTime(s) {
    var t = String(s || "").trim().replace(/\./g, "").replace(/,/g, " ").replace(/\s+/g, " ");
    var u = t.toUpperCase(), m;
    if ((m = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(t))) return modernTime(+m[1], +m[2], m[3] ? +m[3] : 0);
    if ((m = /^(\d{1,2})\/(\d{4})$/.exec(t))) return modernTime(+m[2], +m[1], 0);
    if ((m = /^(\d{1,2}) ([A-Za-z]+) (\d{4})$/.exec(t)) && monthIndex(m[2])) return modernTime(+m[3], monthIndex(m[2]), +m[1]);
    if ((m = /^([A-Za-z]+) (\d{1,2}) (\d{4})$/.exec(t)) && monthIndex(m[1])) return modernTime(+m[3], monthIndex(m[1]), +m[2]);
    if ((m = /^([A-Za-z]+) (\d{4})$/.exec(t)) && monthIndex(m[1])) return modernTime(+m[2], monthIndex(m[1]), 0);
    m = /^(AD |CE )?(-)?(\d{1,4})( ?(BC|BCE|AD|CE))?$/.exec(u);
    if (!m) return null;
    var n = +m[3];
    if (m[2] || m[5] === "BC" || m[5] === "BCE") n = -n;
    if (n === 0) n = 1;
    var mt = modernTime(n, 0, 0);
    return mt !== null ? mt : n;
  }
  function listYears(ys) {
    var t = ys.map(fmtYear);
    if (t.length === 1) return t[0];
    if (t.length === 2) return t[0] + " and " + t[1];
    return t.slice(0, -1).join(", ") + ", and " + t[t.length - 1];
  }

  var KNOTS = [[-3000, 0], [-500, 0.13], [500, 0.24], [1400, 0.37], [1800, 0.53], [1886, 0.6], [LAST_YEAR + 1, 1]];
  var RANGE_MAX = 10000;
  function posOf(y) {
    for (var i = 1; i < KNOTS.length; i++) {
      var a = KNOTS[i - 1], b = KNOTS[i];
      if (y <= b[0]) return a[1] + (b[1] - a[1]) * (y - a[0]) / (b[0] - a[0]);
    }
    return 1;
  }
  function yearAt(t) {
    for (var i = 1; i < KNOTS.length; i++) {
      var a = KNOTS[i - 1], b = KNOTS[i];
      if (t <= b[1]) return a[0] + (b[0] - a[0]) * (t - a[1]) / (b[1] - a[1]);
    }
    return LAST_YEAR + 1;
  }
  var range = $("range"), yearInput = $("year-input"), asof = $("asof");
  range.max = String(RANGE_MAX);
  function trackWidth() { return Math.max(1, $("ticks").getBoundingClientRect().width); }
  var points = [];
  function buildPoints() {
    points = maps.map(function (m) { return m.y; });
    if (modern) modern.changes.forEach(function (d) { points.push(timeOfDay(d)); });
    points.sort(function (a, b) { return a - b; });
  }
  function placeTicks() {
    if (!maps.length) return;
    var ticks = $("ticks"), eras = $("eras"), w = trackWidth();
    ticks.textContent = ""; eras.textContent = "";
    var add = function (y, cls) {
      var s = document.createElement("span");
      if (cls) s.className = cls;
      s.style.left = (posOf(y) * 100).toFixed(3) + "%";
      ticks.appendChild(s);
      return s;
    };
    var marks = [];
    for (var y = -3000; y <= 1000; y += 500) marks.push(y);
    for (y = 1100; y <= 1800; y += 100) marks.push(y);
    for (y = 1810; y <= 2020; y += 10) marks.push(y);
    marks.forEach(function (y) { add(y === 0 ? 1 : y, y % 1000 === 0 || y === 1500 || y === 1900 || y === 1950 ? "is-major" : ""); });
    maps.forEach(function (m) { m.tick = add(m.y, "is-map"); });
    changeTicks = modern ? modern.changes.map(function (d) { return add(timeOfDay(d), "is-change"); }) : [];
    nowTick = null;
    var labels = [-3000, -2000, -1000, 1, 500, 1000, 1500, 1700, 1800, 1900, 1950, 2000], lastRight = -Infinity;
    labels.forEach(function (y) {
      var x = posOf(y) * w, text = y === 1 ? "AD 1" : fmtYear(y), tw = text.length * 6.6, shift = x < tw / 2 ? x / tw : 0.5;
      var left = x - tw * shift;
      if (left < lastRight + 10) return;
      lastRight = left + tw;
      var s = document.createElement("span");
      s.textContent = text;
      s.style.left = (posOf(y) * 100).toFixed(3) + "%";
      if (shift !== 0.5) s.style.translate = (-shift * 100).toFixed(1) + "% 0";
      eras.appendChild(s);
    });
    markCurrentTick();
  }
  var changeTicks = [], nowTick = null;
  function markCurrentTick() {
    maps.forEach(function (m) { if (m.tick) m.tick.classList.toggle("is-now", !!current && m.snap === current); });
    var t = current && current.modern ? changeTicks[changeBefore(Math.min(dayOfTime(now), modern.toDay))] || null : null;
    if (t === nowTick) return;
    if (nowTick) nowTick.classList.remove("is-now");
    if (t) t.classList.add("is-now");
    nowTick = t;
  }
  var rangeActive = false;
  function syncTime() {
    if (!rangeActive) range.value = String(Math.round(posOf(now) * RANGE_MAX));
    range.setAttribute("aria-valuetext", fmtNow(now));
    if (document.activeElement !== yearInput) yearInput.value = fmtNow(now);
    yearInput.classList.toggle("is-long", yearInput.value.length > 9);
    yearInput.classList.toggle("is-longer", yearInput.value.length > 14);
    if (isModern(now)) {
      var day = dayOfTime(now), since = modern.changes[changeBefore(Math.min(day, modern.toDay))];
      if (!current || !current.modern) asof.textContent = "Loading the borders";
      else if (day > modern.toDay) asof.textContent = "The latest borders, of " + dateOfDay(modern.toDay)[0];
      else asof.textContent = "Borders since " + fmtDay(since);
    } else {
      var m = maps[mapIndexFor(now)];
      asof.textContent = !current || current.year !== m.y ? "Loading the map of " + fmtYear(m.y) : "Borders from the map of " + fmtYear(m.y);
    }
    $("prev-map").disabled = !points.length || now <= points[0] + 1e-6;
    $("next-map").disabled = !points.length || now >= points[points.length - 1] - 1e-6;
    markCurrentTick();
  }
  function useSnap(snap) {
    if (current === snap) return;
    current = snap;
    if (selected >= 0) renderCard();
    hideTip();
    hoverId = -1;
    canvas.classList.remove("is-over");
  }
  function setTime(t, fromRange) {
    if (!maps.length) return;
    t = Math.max(KNOTS[0][0], Math.min(LAST_YEAR + 0.999, t));
    if (!isModern(t)) { t = Math.round(t); if (t === 0) t = 1; }
    now = t;
    if (!fromRange) rangeActive = false;
    if (isModern(t)) {
      var day = Math.min(dayOfTime(t), modern.toDay);
      wantKey = "d" + day;
      useSnap(modernSnap(day));
      syncTime();
      writeHash();
      scheduleRender();
      return;
    }
    var mi = mapIndexFor(t);
    wantKey = "y" + maps[mi].y;
    syncTime();
    loadMap(mi).then(function (snap) {
      if (wantKey !== "y" + maps[mi].y) return;
      useSnap(snap);
      syncTime();
      writeHash();
      scheduleRender();
      if (mi > 0) loadMap(mi - 1).catch(function () {});
      if (mi < maps.length - 1) loadMap(mi + 1).catch(function () {});
    }).catch(function (e) {
      console.warn("map", e);
      asof.textContent = "The map of " + fmtYear(maps[mi].y) + " could not be loaded";
    });
    scheduleRender();
  }
  function stepMap(dir) {
    if (!points.length) return;
    var eps = 1e-6, k = -1;
    for (var i = 0; i < points.length; i++) if (points[i] <= now + eps) k = i;
    if (dir < 0) {
      if (k >= 0 && now > points[k] + eps) setTime(points[k]);
      else if (k > 0) setTime(points[k - 1]);
    } else if (k + 1 < points.length) setTime(points[k + 1]);
  }
  function stepUnit(dir) {
    if (isModern(now)) {
      var d = dateOfDay(dayOfTime(now)), y = d[0], m = d[1] + dir;
      if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
      if (y < 1886) setTime(1885);
      else if (y <= LAST_YEAR) setTime(monthTime(y, m));
      return;
    }
    var next = Math.round(now) + dir;
    if (next === 0) next = dir;
    setTime(modern && next >= 1886 ? monthTime(1886, 1) : next);
  }
  range.addEventListener("input", function () {
    stopPlay();
    rangeActive = true;
    var t = +range.value / RANGE_MAX, y = yearAt(t), w = trackWidth(), snapTo = null;
    for (var i = 0; i < maps.length; i++) if (Math.abs(posOf(maps[i].y) - t) * w < 5) { snapTo = maps[i].y; break; }
    if (snapTo !== null) y = snapTo;
    else if (modern && y >= 1885.5) {
      var yr = Math.floor(Math.max(y, 1886)), mo = Math.min(12, Math.floor((Math.max(y, 1886) - yr) * 12) + 1);
      y = yr > LAST_YEAR ? monthTime(LAST_YEAR, 12) : monthTime(yr, mo);
    } else if (y < 1000) y = Math.round(y / 10) * 10;
    setTime(y, true);
  });
  range.addEventListener("change", function () { rangeActive = false; syncTime(); });
  range.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      stopPlay();
      var dir = e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 1;
      if (e.shiftKey) stepUnit(dir); else stepMap(dir);
    } else if (e.key === "Home") { e.preventDefault(); setTime(maps[0].y); }
    else if (e.key === "End") { e.preventDefault(); setTime(modern ? monthTime(LAST_YEAR, 12) : LAST_YEAR); }
  });
  function commitYearInput() {
    var t = parseTime(yearInput.value);
    if (t === null) { yearInput.value = fmtNow(now); return; }
    stopPlay();
    if (Math.abs(t - now) > 1e-9) setTime(t); else yearInput.value = fmtNow(now);
  }
  yearInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); yearInput.blur(); }
    else if (e.key === "Escape") { yearInput.value = fmtNow(now); yearInput.blur(); }
  });
  yearInput.addEventListener("blur", commitYearInput);
  yearInput.addEventListener("focus", function () { yearInput.select(); });
  $("prev-map").addEventListener("click", function (e) { stopPlay(); if (e.shiftKey) stepUnit(-1); else stepMap(-1); });
  $("next-map").addEventListener("click", function (e) { stopPlay(); if (e.shiftKey) stepUnit(1); else stepMap(1); });

  var playTimer = 0, PLAY_MAP = 1400, PLAY_MONTH = 60, PLAY_CHANGE = 400;
  function playEnd() { return modern ? monthTime(2019, 12) : maps[maps.length - 1].y; }
  function playStep() {
    if (isModern(now)) {
      var d = dateOfDay(dayOfTime(now)), y = d[0], m = d[1] + 1, was = current;
      if (m > 12) { m = 1; y++; }
      if (monthTime(y, m) > playEnd() + 1e-9) return -1;
      setTime(monthTime(y, m));
      return current !== was ? PLAY_CHANGE : PLAY_MONTH;
    }
    var mi = mapIndexFor(now);
    if (maps[mi].snap !== current) return 100;
    if (mi < maps.length - 1) setTime(maps[mi + 1].y);
    else if (modern) setTime(monthTime(1886, 1));
    else return -1;
    return isModern(now) ? PLAY_CHANGE : PLAY_MAP;
  }
  function startPlay() {
    if (now >= playEnd() - 1e-9) setTime(maps[0].y);
    $("play").setAttribute("aria-pressed", "true");
    $("play").setAttribute("aria-label", "Stop playing");
    var tick = function () {
      var wait = playStep();
      if (wait < 0) stopPlay(); else playTimer = setTimeout(tick, wait);
    };
    playTimer = setTimeout(tick, isModern(now) ? PLAY_CHANGE : PLAY_MAP);
  }
  function stopPlay() {
    if (!playTimer) return;
    clearTimeout(playTimer); playTimer = 0;
    $("play").setAttribute("aria-pressed", "false");
    $("play").setAttribute("aria-label", "Play through time");
  }
  $("play").addEventListener("click", function () { if (playTimer) stopPlay(); else startPlay(); });

  function setFlat(on) {
    if (on === flat) return;
    var S = localScale();
    flat = on;
    view.zoom = S / (flat ? baseK : baseR);
    reliefKey = "";
    applyView();
    $("flat-btn").setAttribute("aria-pressed", flat ? "true" : "false");
    $("flat-btn").setAttribute("aria-label", flat ? "Globe" : "Flat map");
    $("flat-btn").setAttribute("data-tip", flat ? "Globe (M)" : "Flat map (M)");
    try { localStorage.setItem(STORE_FLAT, flat ? "1" : "0"); } catch (e) {}
    nudge();
  }
  $("flat-btn").addEventListener("click", function () { setFlat(!flat); });
  $("zoom-in").addEventListener("click", function () { zoomAt(view.zoom * 1.6, cx, cy); });
  $("zoom-out").addEventListener("click", function () { zoomAt(view.zoom / 1.6, cx, cy); });

  var card = $("card"), wikiCache = new Map(), wikiAsk = 0;
  function select(id) {
    if (id < 0) { closeCard(); return; }
    selected = id;
    card.hidden = false;
    renderCard();
    if (phoneQuery.matches) layout();
    scheduleRender();
  }
  function closeCard() {
    selected = -1;
    card.hidden = true;
    if (phoneQuery.matches) layout();
    scheduleRender();
  }
  $("card-close").addEventListener("click", closeCard);
  function polityButton(id) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = polityName(id);
    b.addEventListener("click", function () { select(id); });
    return b;
  }
  function wikiTitle(id, y) {
    var w = catalogue[id][3];
    if (typeof w === "string") return w;
    var t = w[0][1];
    for (var i = 0; i < w.length; i++) if (w[i][0] <= y) t = w[i][1];
    return t;
  }
  var STATUS = ["State", "Colony", "Protectorate", "Mandate", "Occupied territory"];
  function renderCard() {
    if (selected < 0 || !catalogue[selected]) return;
    var e = catalogue[selected], p = current ? current.byId.get(selected) : null;
    var modernNow = !!(current && current.modern), when = modernNow ? fmtDay(Math.min(dayOfTime(now), modern.toDay)) : current ? "the map of " + fmtYear(current.year) : fmtNow(now);
    var whenYear = modernNow ? dateOfDay(dayOfTime(now))[0] : current ? current.year : Math.round(now);
    $("card-kind").textContent = e[4] ? "People or culture" : p && p.status > 0 ? STATUS[p.status] : p && p.ruler >= 0 ? "Dependency" : "State";
    $("card-name").textContent = e[0];
    var facts = $("card-facts");
    facts.textContent = "";
    var addText = function (t) { facts.appendChild(document.createTextNode(t)); };
    var addPolity = function (id) { if (current.byId.has(id)) facts.appendChild(polityButton(id)); else addText(polityName(id)); };
    if (p) {
      if (p.ruler >= 0) {
        addText("Held by "); addPolity(p.ruler);
        addText((modernNow ? " on " : " on ") + when + ". ");
      }
      if (p.part >= 0 && p.part !== p.ruler) { addText("Part of "); addPolity(p.part); addText(". "); }
      if (p.cap) addText("Capital: " + capitalAt(p.cap, Math.min(dayOfTime(now), modern.toDay))[0] + ". ");
      if (modernNow) {
        addText(p.end < 0 ? "These borders since " + fmtDay(p.start) + ". " : "These borders from " + fmtDay(p.start) + " to " + fmtDay(p.end) + ". ");
      }
    } else {
      addText("Not on the map " + (modernNow ? "on " : "of ") + (modernNow ? when : current ? fmtYear(current.year) : fmtNow(now)) + ". ");
    }
    var ys = e[2], cs = e[5];
    if (cs) {
      var first = ys.length ? Math.min(ys[0], cs[0]) : cs[0];
      addText(first < cs[0] ? "On the maps from " + fmtYear(first) + ", and continuously from " + cs[0] + " to " + (cs[1] >= 2019 ? "today" : cs[1]) + "." : "On the map from " + cs[0] + " to " + (cs[1] >= 2019 ? "today" : cs[1]) + ".");
    } else if (ys.length) {
      if (ys.length <= 4) addText("On the maps of " + listYears(ys) + ".");
      else addText("On " + ys.length + " maps, from " + fmtYear(ys[0]) + " to " + fmtYear(ys[ys.length - 1]) + ".");
    }
    if (p && p.b <= 1 && !p.people) addText(" Its borders here are approximate.");
    loadWiki(e[0], wikiTitle(selected, whenYear));
  }
  function wikiSummary(title) {
    var url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title.replace(/ /g, "_")) + "?redirect=true";
    return fetch(url).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error("wikipedia " + r.status);
      return r.json();
    }).then(function (d) { return d && d.type !== "disambiguation" && d.extract ? d : null; });
  }
  function wikiSearch(q) {
    var url = "https://en.wikipedia.org/w/api.php?action=query&list=search&srnamespace=0&srlimit=1&format=json&origin=*&srsearch=" + encodeURIComponent(q);
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("wikipedia search " + r.status);
      return r.json();
    }).then(function (d) {
      var hit = d && d.query && d.query.search && d.query.search[0];
      return hit ? wikiSummary(hit.title) : null;
    });
  }
  function loadWiki(name, title) {
    var ask = ++wikiAsk, text = $("wiki-text"), img = $("wiki-img"), more = $("wiki-more");
    var show = function (d) {
      if (ask !== wikiAsk) return;
      if (!d) {
        text.className = "ch-wiki-text is-quiet";
        text.textContent = "Wikipedia has no article under this name.";
        img.hidden = true; more.hidden = true;
        return;
      }
      text.className = "ch-wiki-text";
      text.textContent = d.extract;
      if (d.thumbnail && d.thumbnail.source && /^https:\/\/upload\.wikimedia\.org\//.test(d.thumbnail.source)) {
        img.src = d.thumbnail.source; img.hidden = false;
      } else img.hidden = true;
      var href = d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page;
      if (href && /^https:\/\/en\.wikipedia\.org\//.test(href)) {
        $("wiki-link").href = href;
        $("wiki-link").textContent = d.title && d.title !== name ? "Read “" + d.title + "” on Wikipedia" : "Read more on Wikipedia";
        more.hidden = false;
      } else more.hidden = true;
    };
    img.hidden = true; more.hidden = true;
    text.className = "ch-wiki-text is-quiet";
    text.textContent = "Looking it up on Wikipedia";
    var job = wikiCache.get(title);
    if (!job) {
      job = wikiSummary(title).then(function (d) { return d || (title !== name ? wikiSummary(name) : null); }).then(function (d) { return d || wikiSearch(name); });
      wikiCache.set(title, job);
      job.catch(function () { wikiCache.delete(title); });
    }
    job.then(show).catch(function () {
      if (ask !== wikiAsk) return;
      text.className = "ch-wiki-text is-quiet";
      text.textContent = "Wikipedia could not be reached.";
    });
  }

  var about = $("about"), aboutBtn = $("about-btn");
  function setAbout(open) {
    about.classList.toggle("is-open", open);
    about.classList.toggle("is-shut", !open);
    aboutBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  aboutBtn.addEventListener("click", function () { setAbout(!about.classList.contains("is-open")); });
  about.addEventListener("mouseleave", function () { if (!about.contains(document.activeElement)) about.classList.remove("is-shut"); });
  about.addEventListener("focusout", function (e) { if (!about.contains(e.relatedTarget)) about.classList.remove("is-shut"); });
  document.addEventListener("pointerdown", function (e) {
    if (about.classList.contains("is-open") && !about.contains(e.target)) {
      about.classList.remove("is-open");
      aboutBtn.setAttribute("aria-expanded", "false");
    }
  });

  var STORE_LAYERS = "chronia-layers";
  var layers = { states: true, capitals: true, cities: true, seas: true, water: true, relief: true, grid: true };
  var layersBtn = $("layers-btn"), layersPanel = $("layers");
  try {
    var savedLayers = JSON.parse(localStorage.getItem(STORE_LAYERS) || "{}");
    Object.keys(layers).forEach(function (k) { if (typeof savedLayers[k] === "boolean") layers[k] = savedLayers[k]; });
  } catch (e) {}
  function syncLayerInputs() {
    layersPanel.querySelectorAll("input[data-layer]").forEach(function (el) { el.checked = !!layers[el.getAttribute("data-layer")]; });
  }
  function setLayer(name, on) {
    if (!(name in layers)) return false;
    layers[name] = !!on;
    syncLayerInputs();
    try { localStorage.setItem(STORE_LAYERS, JSON.stringify(layers)); } catch (e) {}
    seaKey = ""; reliefKey = "";
    scheduleRender();
    return true;
  }
  function setLayersOpen(open, focusBtn) {
    layersPanel.hidden = !open;
    layersBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) { if (about.classList.contains("is-open")) setAbout(false); var first = layersPanel.querySelector("input"); if (first) first.focus(); }
    else if (focusBtn) layersBtn.focus();
  }
  syncLayerInputs();
  layersPanel.addEventListener("change", function (e) {
    var name = e.target && e.target.getAttribute("data-layer");
    if (name) setLayer(name, e.target.checked);
  });
  layersBtn.addEventListener("click", function () { setLayersOpen(layersPanel.hidden, false); });
  aboutBtn.addEventListener("click", function () { if (!layersPanel.hidden) setLayersOpen(false, false); });
  document.addEventListener("pointerdown", function (e) {
    if (!layersPanel.hidden && !layersPanel.contains(e.target) && !layersBtn.contains(e.target)) setLayersOpen(false, false);
  });
  layersPanel.addEventListener("focusout", function (e) {
    if (!layersPanel.hidden && e.relatedTarget && !layersPanel.contains(e.relatedTarget) && e.relatedTarget !== layersBtn) setLayersOpen(false, false);
  });
  window.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || layersPanel.hidden) return;
    e.stopPropagation();
    setLayersOpen(false, true);
  }, true);
  layersPanel.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || /^[pPmM+=_−-]$/.test(e.key)) e.stopPropagation();
  });
  var layersApi = {
    layers: function () { return Object.assign({}, layers); },
    setLayer: setLayer,
    layersOpen: function () { return !layersPanel.hidden; }
  };

  var hoverTip = $("hover-tip"), tipTimer = 0;
  if (canHover) {
    document.querySelectorAll("[data-tip]").forEach(function (el) {
      el.addEventListener("mouseenter", function () {
        clearTimeout(tipTimer);
        tipTimer = setTimeout(function () {
          hoverTip.textContent = el.getAttribute("data-tip");
          var r = el.getBoundingClientRect(), top = !!el.closest(".ch-top");
          hoverTip.classList.add("is-on");
          var w = hoverTip.offsetWidth, h = hoverTip.offsetHeight;
          var x = Math.max(6, Math.min(W - w - 6, r.left + r.width / 2 - w / 2));
          var y = top ? el.closest(".ch-frame").getBoundingClientRect().bottom + 8 : r.top - h - 8;
          hoverTip.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)";
        }, 380);
      });
      el.addEventListener("mouseleave", function () { clearTimeout(tipTimer); hoverTip.classList.remove("is-on"); });
      el.addEventListener("click", function () { clearTimeout(tipTimer); hoverTip.classList.remove("is-on"); });
    });
  }

  document.addEventListener("keydown", function (e) {
    var t = e.target, typing = t && ((t.tagName === "INPUT" && t.type === "text") || t.tagName === "TEXTAREA");
    if (e.key === "Escape") {
      if (about.classList.contains("is-open")) { setAbout(false); return; }
      if (!card.hidden) closeCard();
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey || t === range) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); stopPlay(); if (e.shiftKey) stepUnit(-1); else stepMap(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); stopPlay(); if (e.shiftKey) stepUnit(1); else stepMap(1); }
    else if (e.key === "p" || e.key === "P") { if (playTimer) stopPlay(); else startPlay(); }
    else if (e.key === "m" || e.key === "M") setFlat(!flat);
    else if (e.key === "+" || e.key === "=") zoomAt(view.zoom * 1.6, cx, cy);
    else if (e.key === "-" || e.key === "_" || e.key === "−") zoomAt(view.zoom / 1.6, cx, cy);
  });

  var hashTimer = 0;
  function writeHash() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(function () {
      if (!ready) return;
      var h = "#y=" + hashTime() + "&v=" + view.lon.toFixed(2) + "," + view.lat.toFixed(2) + "," + view.zoom.toFixed(2) + (flat ? "&flat=1" : "");
      if (location.hash !== h) try { history.replaceState(null, "", h); } catch (e) {}
    }, 250);
  }
  function hashTime() {
    if (!isModern(now)) return String(Math.round(now));
    var d = dateOfDay(dayOfTime(now));
    return d[0] + "-" + (d[1] < 10 ? "0" : "") + d[1] + (d[2] === MID_DAY ? "" : "-" + (d[2] < 10 ? "0" : "") + d[2]);
  }
  function readHash() {
    var out = {};
    String(location.hash || "").replace(/^#/, "").split("&").forEach(function (kv) {
      var i = kv.indexOf("=");
      if (i > 0) out[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
      else if (/^-?\d+(-\d+){0,2}$/.test(kv)) out.y = kv;
    });
    return out;
  }

  window.addEventListener("resize", function () { layout(); scheduleRender(); });
  if (phoneQuery.addEventListener) phoneQuery.addEventListener("change", function () { layout(); scheduleRender(); });

  function reveal() {
    ready = true;
    $("load").classList.add("is-gone");
    document.documentElement.classList.add("ch-ready");
    scheduleRender();
  }
  function prepLand(topo) {
    var f = topojson.feature(topo, topo.objects.land);
    var list = [];
    (f.features || [f]).forEach(function (x) { list = list.concat(preparePolys(x)); });
    list.forEach(function (p) {
      var a = d3.geoArea({ type: "Polygon", coordinates: [p.geo.coordinates[0]] });
      if (a > TAU) a = 2 * TAU - a;
      p.km = Math.sqrt(a) * R_KM;
      p.coast = p.geo.coordinates.filter(function (r) { return r.length >= 2; }).map(prepareArc);
    });
    list.sort(function (a, b) { return b.km - a.km; });
    return list;
  }
  function landCount(list, kp, px) {
    var lo = 0, hi = list.length;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (list[mid].km * kp >= px) lo = mid + 1; else hi = mid; }
    return lo;
  }
  function traceCoast(c, list, n) {
    for (var i = 0; i < n; i++) { var p = list[i]; if (inView(p)) traceArcs(c, p.coast); }
  }
  var coastGrid = null, COAST_KM = 32, GRID_W = 2880, GRID_H = 1440;
  function buildCoastGrid(list) {
    try {
      var cv = document.createElement("canvas"), k = GRID_W / 360;
      cv.width = GRID_W; cv.height = GRID_H;
      var g = cv.getContext("2d", { willReadFrequently: true });
      var path = new Path2D();
      list.forEach(function (p) {
        p.geo.coordinates.forEach(function (ring) {
          for (var i = 0; i < ring.length; i++) {
            var x = (ring[i][0] + 180) * k, y = (90 - ring[i][1]) * k;
            if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
          }
          path.closePath();
        });
      });
      g.fillStyle = "#000"; g.fill(path, "evenodd");
      g.globalCompositeOperation = "destination-out";
      g.lineJoin = "round"; g.lineCap = "round";
      g.lineWidth = 2 * COAST_KM * k / 111.195;
      list.forEach(function (p) {
        p.coast.forEach(function (L) {
          (L.parts || [L]).forEach(function (q) {
            g.beginPath();
            for (var i = 0; i < q.n; i++) {
              var lon = Math.atan2(q.y[i], q.x[i]) / D2R, lat = Math.asin(Math.max(-1, Math.min(1, q.z[i]))) / D2R;
              var x = (lon + 180) * k, y = (90 - lat) * k;
              if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
            }
            g.stroke();
          });
        });
      });
      var px = g.getImageData(0, 0, GRID_W, GRID_H).data, a = new Uint8Array(GRID_W * GRID_H);
      for (var i = 0; i < a.length; i++) a[i] = px[i * 4 + 3] > 127 ? 1 : 0;
      coastGrid = { a: a, k: k, r: COAST_KM * k / 111.195 };
    } catch (e) { coastGrid = null; }
  }
  function inland(lon, lat) {
    if (!coastGrid) return false;
    var G = coastGrid, y = Math.floor((90 - lat) * G.k);
    if (y < 0 || y >= GRID_H) return false;
    var x = Math.floor((wrap180(lon) + 180) * G.k), c = Math.cos(lat * D2R);
    var w = Math.min(40, Math.ceil(G.r / Math.max(0.05, c) - G.r));
    for (var d = -w; d <= w; d++) if (!G.a[y * GRID_W + ((x + d) % GRID_W + GRID_W) % GRID_W]) return false;
    return true;
  }
  function splitCoast(lines, coastal, inner) {
    var reach = 1.4 * COAST_KM / 111.195;
    var step = function (a, b) { var dx = (a[0] - b[0]) * Math.cos(a[1] * D2R); return Math.sqrt(dx * dx + (a[1] - b[1]) * (a[1] - b[1])); };
    lines.forEach(function (ln) {
      var n = ln.length, m = new Uint8Array(n), k, s, e;
      for (k = 0; k < n; k++) m[k] = inland(ln[k][0], ln[k][1]) ? 1 : 0;
      var used = new Uint8Array(n);
      for (s = 0; s < n; s = e) {
        for (e = s + 1; e < n && m[e] === m[s]; e++);
        if (!m[s]) continue;
        var a = s, b = e - 1;
        for (var d = 0; a > 0 && d < reach; a--) d += step(ln[a], ln[a - 1]);
        for (d = 0; b < n - 1 && d < reach; b++) d += step(ln[b], ln[b + 1]);
        for (k = a; k <= b; k++) used[k] = 1;
        if (b > a) inner.push(ln.slice(a, b + 1));
      }
      for (s = 0; s < n; s = e) {
        for (e = s + 1; e < n && used[e] === used[s]; e++);
        if (!used[s] && e - s >= 2) coastal.push(ln.slice(s, e));
      }
    });
  }

  function start() {
    readPalette();
    var h = readHash();
    try { flat = localStorage.getItem(STORE_FLAT) === "1"; } catch (e) {}
    if (h.flat === "1") flat = true;
    if (h.v) {
      var v = h.v.split(",").map(Number);
      if (v.length === 3 && v.every(isFinite)) { view.lon = v[0]; view.lat = v[1]; view.zoom = v[2]; }
    }
    $("flat-btn").setAttribute("aria-pressed", flat ? "true" : "false");
    if (flat) { $("flat-btn").setAttribute("aria-label", "Globe"); $("flat-btn").setAttribute("data-tip", "Globe (M)"); }
    layout();
    Promise.all([
      fetchJSON("data/eras.json"), fetchJSON("data/land.json"), fetchJSON("data/places.json").catch(function () { return []; }),
      fetchJSON("data/modern.json"), fetchJSON("data/cities.json").catch(function () { return null; })
    ]).then(function (r) {
      var idx = r[0];
      catalogue = idx.polities;
      maps = idx.maps.map(function (m) { return { y: m[0], file: "data/" + m[1], snap: null, loading: null }; });
      var md = r[3], from = idx.modern.from.split("-").map(Number), to = idx.modern.to.split("-").map(Number);
      modern = { rows: md.rows, hi: md.hi, lo: md.lo, changes: idx.modern.changes, toDay: dayFromDate(to[0], to[1], to[2]) };
      modern.fromTime = timeOfDay(dayFromDate(from[0], from[1], from[2])) - 0.5 / 365;
      cities = r[4];
      buildPoints();
      var t0 = h.y ? parseTime(h.y) : null;
      now = t0 !== null ? t0 : START_YEAR;
      land = { hi: prepLand(r[1].hi), lo: prepLand(r[1].lo) };
      buildCoastGrid(land.lo);
      landGeo = topojson.feature(r[1].lo, r[1].lo.objects.land);
      places = r[2] || [];
      layout();
      var first = isModern(now) ? Promise.resolve(modernSnap(Math.min(dayOfTime(now), modern.toDay))) : loadMap(mapIndexFor(now));
      return first.then(function (snap) {
        current = snap;
        reveal();
        setTime(now);
        fetchJSON(UC + "data/sea.json").then(function (t) {
          var prep = function (topo) { return topojson.feature(topo, topo.objects.deep).features.map(prepare); };
          sea = { high: prep(t.high), low: prep(t.low) };
          scheduleRender();
        }).catch(function (e) { console.warn("sea", e); });
      });
    }).catch(function (e) {
      console.error(e);
      $("load").textContent = "The atlas could not be loaded. Try reloading the page.";
      document.documentElement.classList.add("ch-ready");
    });
    if (document.fonts && document.fonts.load) {
      document.fonts.load("400 20px 'IM Fell English'").then(function () { widthCache.clear(); labelCache.clear(); scheduleRender(); }).catch(function () {});
    }
  }

  window.__chronia = {
    ready: function () { return ready && !!current; },
    year: function () { return now; },
    shown: function () { return yearInput.value; },
    asof: function () { return asof.textContent; },
    playing: function () { return !!playTimer; },
    play: function (on) { if (on && !playTimer) startPlay(); else if (!on) stopPlay(); },
    date: function () { return isModern(now) ? hashTime() : null; },
    mapYear: function () { return current ? (current.modern ? "modern" : current.year) : null; },
    maps: function () { return maps.map(function (m) { return m.y; }); },
    setYear: function (y) { stopPlay(); setTime(typeof y === "string" ? parseTime(y) : y); },
    step: function (dir, unit) { if (unit) stepUnit(dir); else stepMap(dir); },
    view: view,
    setView: function (lon, lat, zoom) { view.lon = lon; view.lat = lat; if (zoom) view.zoom = zoom; applyView(); scheduleRender(); },
    setFlat: setFlat,
    polities: function () { return current ? current.order.map(function (p) { return polityName(p.id); }) : []; },
    selected: function () { return selected >= 0 ? polityName(selected) : null; },
    selectName: function (n) {
      var p = current && current.order.find(function (q) { return polityName(q.id) === n; });
      if (p) select(p.id);
      return !!p;
    },
    hitAt: function (x, y) { var p = polityAt(x, y); return p ? polityName(p.id) : null; },
    project: function (lon, lat) { return projectLL(lon, lat); },
    labels: function () { return placedLabels.slice(); },
    timeRender: function (n) {
      n = n || 10;
      var t0 = performance.now();
      for (var i = 0; i < n; i++) draw();
      return (performance.now() - t0) / n;
    },
    moving: function (on) { moving = !!on; },
    timeLabels: function (n) {
      n = n || 10;
      var kp = kmPx(), t0 = performance.now();
      for (var i = 0; i < n; i++) layoutPolities(current, fixedBoxes(), kp);
      var t1 = performance.now();
      for (i = 0; i < n; i++) { placedLabels = []; drawPlaces(fixedBoxes(), localScale()); }
      return { polities: (t1 - t0) / n, places: (performance.now() - t1) / n };
    },
    inland: function (lon, lat) { return inland(lon, lat); }
  };
  Object.assign(window.__chronia, layersApi);

  start();
})();

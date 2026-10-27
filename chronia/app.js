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
    ["division", "division-label"].forEach(function (k) { pal[k] = cs.getPropertyValue("--ch-" + k).trim(); });
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
    if (!moving && relief) { try { maybeRelief(); } catch (e) { console.warn("terrain", e); rd.off = true; } }
  }
  function nudge() {
    moving = true;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(function () { moving = false; scheduleRender(); writeHash(); }, 160);
    scheduleRender();
  }

  var catalogue = null, maps = [], land = null, sea = null, rivers = null, riversLoad = null, lakes = null, lakesLoad = null;
  var current = null, now = START_YEAR, wantKey = "", modern = null, cities = null;
  var dated = null, datedSnaps = new Map();
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
  function isDated(t) { return !!dated && !isModern(t) && t >= dated.from - 0.5; }

  var DISPUTED = 6;
  function apart(cols) {
    var out = [];
    cols.forEach(function (c) {
      var k = c, tries = 0;
      while (out.indexOf(k) >= 0 && tries++ < PALETTE) k = (k + 5 + tries) % PALETTE;
      out.push(k);
    });
    return out;
  }
  function polityName(id) { return id >= 0 && catalogue[id] ? catalogue[id][0] : ""; }
  var colourDays = [], colourYears = [];
  function colourMarks() {
    var d = new Set(), y = new Set();
    catalogue.forEach(function (e) { (e[7] || []).forEach(function (s) { d.add(s[0]); }); (e[8] || []).forEach(function (s) { y.add(s[0]); }); });
    colourDays = Array.from(d).sort(function (a, b) { return a - b; });
    colourYears = Array.from(y).sort(function (a, b) { return a - b; });
  }
  function marksBefore(list, t) { var n = 0; while (n < list.length && list[n] <= t) n++; return n; }
  function polityColor(id, day, year) {
    var e = catalogue[id];
    if (!e) return 0;
    var steps = day !== undefined ? e[7] : year !== undefined ? e[8] : null, t = day !== undefined ? day : year;
    if (steps) for (var k = steps.length - 1; k >= 0; k--) if (t >= steps[k][0]) return steps[k][1];
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
        i: i, id: r[0], ruler: r[1], part: r[2], b: r[3], people: !!r[4], band: r[4] === 2, label: r[5],
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
    var idx = activeRows(day), key = "m" + idx.join(",") + "|" + marksBefore(colourDays, day);
    var snap = modernSnaps.get(key);
    if (snap) { modernSnaps.delete(key); modernSnaps.set(key, snap); return snap; }
    var polys = idx.map(function (ri, i) {
      var r = modern.rows[ri], hue = r[1] >= 0 ? r[1] : r[0], claims = r[4] === DISPUTED && r[7] ? r[7] : null;
      return { i: i, row: ri, id: r[0], ruler: r[4] ? r[1] : -1, part: -1, b: 3, people: false, label: r[6], hue: hue, color: claims ? -1 : polityColor(hue, day), claims: claims, claimColors: claims ? apart(claims.map(function (c) { return polityColor(c, day); })) : null, soft: !!claims, status: r[4], cap: claims ? null : r[5], start: r[2], end: r[3] };
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

  function chunkIndexFor(y) {
    var k = 0;
    for (var i = 0; i < dated.chunks.length; i++) if (dated.chunks[i].from <= y) k = i;
    return k;
  }
  function loadChunk(k) {
    var c = dated.chunks[k];
    if (!c) return Promise.reject(new Error("no chunk " + k));
    if (c.data) return Promise.resolve(c);
    if (!c.loading) {
      c.loading = fetchJSON(c.file).then(function (d) { c.data = d; return c; }).catch(function (e) { c.loading = null; throw e; });
    }
    return c.loading;
  }
  function datedSnap(k, y) {
    var c = dated.chunks[k], rows = c.data.rows, idx = [], soft = false;
    var groupIds = new Set((c.data.groups || []).map(function (g) { return g[0]; }));
    for (var i = 0; i < rows.length; i++) if (rows[i][2] <= y && y <= rows[i][3]) idx.push(i);
    var key = "e" + k + (soft ? "s" : "") + ":" + idx.join(",") + "|" + marksBefore(colourYears, y);
    var snap = datedSnaps.get(key);
    if (snap) { datedSnaps.delete(key); datedSnaps.set(key, snap); return snap; }
    var polys = idx.map(function (ri, i) {
      var r = rows[ri], people = !!r[7], member = groupIds.has(r[0]) ? r[0] : groupIds.has(r[8]) && !people ? r[8] : -1, hue = member >= 0 ? member : r[1] >= 0 && !people ? r[1] : r[0], claims = r[4] === DISPUTED && r[10] ? r[10] : null;
      return { i: i, row: ri, id: r[0], ruler: people || claims ? -1 : r[1], part: r[8], member: member, b: r[9], people: people, band: r[7] === 2, label: r[6], hue: hue, color: people || claims ? -1 : polityColor(hue, undefined, y), claims: claims, claimColors: claims ? apart(claims.map(function (c) { return polityColor(c, undefined, y); })) : null, soft: soft || r[9] <= 1 || people || !!claims, status: r[4], cap: people || claims ? null : r[5], start: r[2], end: r[3] };
    });
    snap = finishSnap({
      year: null, key: key, dated: true, soft: soft, polys: polys, topo: { hi: c.data.hi, lo: c.data.lo },
      geoms: { hi: idx.map(function (i) { return c.data.hi.objects.p.geometries[i]; }), lo: idx.map(function (i) { return c.data.lo.objects.p.geometries[i]; }) }
    });
    snap.groups = (c.data.groups || []).filter(function (g) { return g[1] <= y && y <= g[2] && g[4]; }).map(function (g) {
      var mem = g[3].filter(function (ri) { return idx.indexOf(ri) >= 0; });
      if (mem.length < 2) return null;
      return { id: g[0], group: true, label: g[4], people: false,
        geoLo: topojson.mergeArcs(c.data.lo, mem.map(function (ri) { return c.data.lo.objects.p.geometries[ri]; })),
        geoHi: topojson.mergeArcs(c.data.hi, mem.map(function (ri) { return c.data.hi.objects.p.geometries[ri]; })) };
    }).filter(Boolean);
    datedSnaps.set(key, snap);
    while (datedSnaps.size > 24) {
      var oldest = datedSnaps.keys().next().value;
      if (datedSnaps.get(oldest) === current) { var keep = datedSnaps.get(oldest); datedSnaps.delete(oldest); datedSnaps.set(oldest, keep); break; }
      datedSnaps.delete(oldest);
    }
    return snap;
  }
  function datedChangeBefore(y) {
    var c = dated.changes, lo = 0, hi = c.length - 1, k = -1;
    while (lo <= hi) { var mid = (lo + hi) >> 1; if (c[mid] <= y) { k = mid; lo = mid + 1; } else hi = mid - 1; }
    return k;
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
    syncGrid();
    var lk = key + gridTag, L = snap.levels[lk];
    if (L) return L;
    var topo = snap.topo[key], geoms = snap.geoms[key], polys = snap.polys;
    var ix = new Map();
    geoms.forEach(function (g, i) { ix.set(g, i); });
    var cached = geoms.map(function (g) { return featOf(topo, key, g); });
    var geo = cached.map(function (c) { return c.geo; });
    var feats = cached.map(function (c) { return c.prep; });
    var colOf = function (g) { var p = polys[ix.get(g)]; return p && !p.people && !p.claims ? p.color : -1; };
    var groups = [];
    for (var c = 0; c < PALETTE; c++) groups.push([]);
    var peoples = [], unnamed = [], disputes = new Map();
    polys.forEach(function (p, i) {
      var dk = p && p.claims ? p.claimColors.join(",") : null;
      if (dk && !disputes.has(dk)) disputes.set(dk, { cols: p.claimColors, feats: [] });
      var target = !p ? unnamed : p.people ? peoples : dk ? disputes.get(dk).feats : groups[p.color];
      for (var j = 0; j < feats[i].length; j++) target.push(feats[i][j]);
    });
    var kind = function (a, b) {
      var pa = polys[ix.get(a)], pb = polys[ix.get(b)];
      if (!pa && !pb) return 0;
      if (pa && pb && pa.id === pb.id) return 0;
      if ((pa && pa.claims) || (pb && pb.claims)) return 2;
      if ((!pa || pa.band) && (!pb || pb.band)) return 0;
      var soft = (pa ? pa.soft : false) || (pb ? pb.soft : false);
      if (pa && pb && pa.member >= 0 && pa.member === pb.member) return 4;
      if (pa && pb && !pa.people && !pb.people && pa.hue === pb.hue) return 3;
      return soft ? 2 : 1;
    };
    var collection = { type: "GeometryCollection", geometries: geoms };
    var mesh = function (fn) { return prepareLines(topojson.mesh(topo, collection, fn)); };
    var edges = outerEdges(topo, geoms, function (g) {
      var p = polys[ix.get(g)];
      return !p ? null : p.claims ? "d" : p.band ? "b" : p.people ? "p" : (p.soft ? "s" : "h") + p.color;
    });
    var arcsOf = function (lines) { return lines.map(prepareArc); };
    L = {
      topo: topo, geoms: geoms, polys: polys,
      geo: geo, feats: feats, groups: groups, peoples: peoples, unnamed: unnamed, disputes: Array.from(disputes.values()),
      hard: mesh(function (a, b) { return a !== b && kind(a, b) === 1; }).concat(arcsOf(edges.hard)),
      soft: mesh(function (a, b) { return a !== b && kind(a, b) === 2; }).concat(arcsOf(edges.soft)),
      kin: mesh(function (a, b) { return a !== b && kind(a, b) === 3; }),
      member: mesh(function (a, b) { return a !== b && kind(a, b) === 4; }),
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
    snap.levels[lk] = L;
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
      if (b === "p" || b === "b") { out.peopleBleed = out.peopleBleed.concat(coastal); if (b === "p") out.soft = out.soft.concat(inner); return; }
      if (b === "d") { out.soft = out.soft.concat(inner); return; }
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
        relief.onRestore = function () { reliefKey = ""; rd.key = ""; rd.rect = null; scheduleRender(); };
        relief.load([{ src: UC + "data/relief-4096.webp", size: 4096 }], function () { reliefKey = ""; scheduleRender(); });
      }
    }
    return !!relief && relief.ready();
  }
  function renderRelief() {
    var res = moving ? RELIEF_MOVING : RELIEF_RES;
    if (res !== reliefRes) sizeRelief(res);
    var key = [flat ? 1 : 0, view.lon, view.lat, view.zoom, W, H, dpr, reliefRes, rd.gen, rd.put.size, rd.rect ? 1 : 0].join();
    if (key === reliefKey) return;
    reliefKey = key;
    var o = { flat: flat, dpr: dpr * reliefRes, light: 0, sepia: 0, detail: !!rd.rect && !rd.off, cx: cx, cy: cy };
    if (flat) { o.k = FB.k; o.xc = FB.xc; o.yc = FB.yc; o.wrap = !!FB.wrap; }
    else { o.e = [B.ex, B.ey, B.ez]; o.n = [B.nx, B.ny, B.nz]; o.c = [B.cx, B.cy, B.cz]; o.r = B.r; }
    relief.draw(o);
  }
  var rd = { key: "", rect: null, cache: new Map(), gen: 0, put: new Set(), off: false, failed: 0, ok: 0 };
  var RELIEF_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png", RELIEF_MAX_Z = 11, RELIEF_MAX_TILES = 40;
  function mercY(lat) { var p = lat * D2R; return (1 - Math.log(Math.tan(Math.PI / 4 + p / 2)) / Math.PI) / 2; }
  function reliefWanted() {
    if (!relief.detailFits()) return null;
    var S = localScale() * dpr;
    var latC = Math.max(-75, Math.min(75, view.lat)) * D2R;
    var z = Math.floor(Math.log(TAU * S * Math.cos(latC) / 256 / 1.15) / Math.LN2);
    if (z < 5) return null;
    z = Math.min(RELIEF_MAX_Z, z);
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
      if (nx <= relief.slots && ny <= relief.slots && nx * ny <= RELIEF_MAX_TILES) return { z: z, x0: ((x0 % n) + n) % n, y0: y0, nx: nx, ny: ny };
    }
    return null;
  }
  function maybeRelief() {
    if (rd.off || !relief || !layers.relief || !relief.ready()) return;
    var key = [flat ? 1 : 0, view.lon.toFixed(3), view.lat.toFixed(3), view.zoom.toFixed(4), W, H].join();
    if (key === rd.key) return;
    rd.key = key;
    var want = reliefWanted();
    if (!want || want.z < 6) {
      if (rd.rect) { rd.rect = null; relief.endDetail(); scheduleRender(); }
      return;
    }
    var r = rd.rect;
    if (!r || r.z !== want.z || r.x0 !== want.x0 || r.y0 !== want.y0 || r.nx !== want.nx || r.ny !== want.ny) {
      if (!relief.beginDetail(want)) { rd.off = true; return; }
      rd.rect = want; rd.gen++; rd.put = new Set();
    }
    var n = 1 << want.z, gen = rd.gen, any = false;
    for (var j = 0; j < want.ny; j++) for (var i = 0; i < want.nx; i++) {
      var x = (want.x0 + i) % n, y = want.y0 + j, k = want.z + "/" + x + "/" + y;
      if (rd.put.has(k)) continue;
      var t = rd.cache.get(k);
      if (t && t.canvas) { if (relief.putTile(t.canvas, i, j)) { rd.put.add(k); any = true; } continue; }
      if (!t) reliefTile(want.z, x, y, k, gen);
    }
    if (rd.cache.size > 200) { var it = rd.cache.keys(); while (rd.cache.size > 160) { var nk = it.next(); if (nk.done) break; if (!rd.put.has(nk.value)) rd.cache.delete(nk.value); else break; } }
    if (any) scheduleRender();
  }
  function reliefTile(z, x, y, key, gen) {
    var t = { canvas: null }, img = new Image();
    rd.cache.set(key, t);
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = function () {
      try { t.canvas = hillshade(img, z, y); } catch (e) { console.warn("terrain tile", e); rd.off = true; return; }
      rd.ok++;
      if (rd.gen !== gen || !rd.rect || rd.rect.z !== z) return;
      var r = rd.rect, n = 1 << z, i = ((x - r.x0) % n + n) % n, j = y - r.y0;
      if (i < r.nx && j >= 0 && j < r.ny && relief.putTile(t.canvas, i, j)) { rd.put.add(key); scheduleRender(); }
    };
    img.onerror = function () { rd.cache.delete(key); rd.failed++; if (!rd.ok && rd.failed > 6) { rd.off = true; relief.endDetail(); rd.rect = null; scheduleRender(); } };
    img.src = RELIEF_URL.replace("{z}", z).replace("{x}", x).replace("{y}", y);
  }
  function hillshade(img, z, y) {
    var N = 256, c = document.createElement("canvas");
    c.width = c.height = N;
    var g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    var src = g.getImageData(0, 0, N, N), d = src.data, e = new Float32Array(N * N);
    for (var i = 0; i < N * N; i++) e[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768;
    var lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 0.5) / (1 << z))));
    var cell = 40075016 * Math.cos(lat) / (N << z), ex = z <= 6 ? 6 : z <= 8 ? 4 : z <= 10 ? 3 : 2.4;
    var lights = [[-0.7071, 0.7071, 0.6], [0, 1, 0.2], [-1, 0, 0.2]], alt = Math.SQRT1_2;
    for (var row = 0; row < N; row++) for (var col = 0; col < N; col++) {
      var k = row * N + col, h = e[k];
      var l = e[row * N + Math.max(0, col - 1)], r = e[row * N + Math.min(N - 1, col + 1)];
      var u = e[Math.max(0, row - 1) * N + col], dn = e[Math.min(N - 1, row + 1) * N + col];
      var gx = (r - l) / (2 * cell) * ex, gy = (u - dn) / (2 * cell) * ex;
      var nz = 1 / Math.sqrt(1 + gx * gx + gy * gy), nx = -gx * nz, ny = -gy * nz, v = 0;
      for (var q = 0; q < 3; q++) v += lights[q][2] * ((nx * lights[q][0] + ny * lights[q][1]) * alt + nz * alt - alt);
      var o = Math.round(128 + 127 * Math.tanh(4.2 * v * (v > 0 ? 1.6 : 1)));
      d[k * 4] = d[k * 4 + 1] = d[k * 4 + 2] = o;
      d[k * 4 + 3] = h > 0 ? 255 : 0;
    }
    g.putImageData(src, 0, 0);
    return c;
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
  function densify(f) {
    var g = f.geometry;
    if (!g) return f;
    var ring = function (r) {
      var out = [];
      for (var i = 0; i < r.length; i++) {
        if (i) {
          var a = r[i - 1], b = r[i], n = Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / SEA_STEP);
          for (var k = 1; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
        }
        out.push(r[i]);
      }
      return out;
    };
    var polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    return { type: "Feature", properties: f.properties, geometry: { type: "MultiPolygon", coordinates: polys.map(function (p) { return p.map(ring); }) } };
  }
  var SEA_STEP = 1;
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
    var vkey = [flat ? 1 : 0, view.lon, view.lat, view.zoom, W, H, res, line, n, m, list === land.hi ? 1 : list === land.fine ? 2 : 0, landTag].join();
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
    var key = [flat ? 1 : 0, view.lon, view.lat, view.zoom, W, H, dpr, moving ? 1 : 0, sea ? 1 : 0, coast === land.hi ? 1 : coast === land.fine ? 2 : 0, landTag].join();
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
    var landList = landAt(landKey(key));
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
    L.disputes.forEach(function (d) {
      var dp = new Path2D(); traceAll(dp, d.feats);
      ctx.fillStyle = stripes(d.cols); ctx.fill(dp);
    });
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
    var bw = bandWidth(S), softMap = !!snap.soft || (snap.year !== null && snap.year < SOFT_BEFORE);
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
    var unheld = null;
    var tint = function (id, color) {
      if (bleed > 0.6) {
        if (!unheld) {
          unheld = new Path2D();
          unheld.rect(-10, -10, W + 20, H + 20);
          for (c = 0; c < PALETTE; c++) if (groupPaths[c]) unheld.addPath(groupPaths[c]);
          unheld.addPath(peoplePath); unheld.addPath(unnamedPath);
        }
        ctx.save();
        ctx.clip(unheld, "evenodd");
        ctx.beginPath(); traceArcs(ctx, coastOf(L, id));
        ctx.lineWidth = bleed; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = color; ctx.stroke();
        ctx.restore();
      }
      ctx.beginPath(); tracePolity(snap, L, id); ctx.fillStyle = color; ctx.fill();
    };
    if (hp && hp !== sp) tint(hp.id, pal.hover);
    if (sp) tint(sp.id, "rgba(140,42,26,0.12)");
    ctx.restore();
    drawCoastBand(snap.key + key, paintFills, landList, landPath, kp, bandLine, bandAlpha, peopleBleed, peoplePath, unnamedPath, bleed);

    drawMarshes(kp, landPath);
    drawRivers(S);
    drawLakes(kp);

    drawDivisionLines(snap, L, landPath, S);
    syncKey();
    var lw = lineWeight(S);
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath(); traceCoast(ctx, landList, nLand); ctx.strokeStyle = pal.border; ctx.lineWidth = 0.75 + 0.35 * lw; ctx.stroke();
    ctx.save();
    ctx.clip(landPath);
    ctx.beginPath(); traceArcs(ctx, L.kin); ctx.globalAlpha = 0.55; ctx.strokeStyle = pal.border; ctx.lineWidth = 0.6 + 0.3 * lw; ctx.stroke();
    if (L.member && L.member.length) {
      var mw = 0.7 + 0.3 * lw;
      ctx.beginPath(); traceArcs(ctx, L.member); ctx.globalAlpha = 0.7; ctx.lineWidth = mw; ctx.lineCap = "butt";
      ctx.setLineDash([mw * 4.2, mw * 2.6]); ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = "round";
    }
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
    drawDivisionLabels(placed, S);
    syncCardDivision();
  }
  function coastOf(L, id) {
    if (!L.coastOf) L.coastOf = new Map();
    var hit = L.coastOf.get(id);
    if (hit) return hit;
    if (!L.arcUse) {
      L.arcUse = new Map();
      L.geoms.forEach(function (g) {
        var seen = new Set();
        var walk = function (a) { if (typeof a === "number") { var i = a < 0 ? ~a : a; if (!seen.has(i)) { seen.add(i); L.arcUse.set(i, (L.arcUse.get(i) || 0) + 1); } } else if (a) for (var k = 0; k < a.length; k++) walk(a[k]); };
        walk(g.arcs);
      });
    }
    var own = [];
    L.geoms.forEach(function (g, i) {
      var p = L.polys[i];
      if (!p || p.id !== id) return;
      var walk = function (a) { if (typeof a === "number") { var j = a < 0 ? ~a : a; if (L.arcUse.get(j) === 1) own.push([j]); } else if (a) for (var k = 0; k < a.length; k++) walk(a[k]); };
      walk(g.arcs);
    });
    var coastal = [];
    if (own.length) splitCoast(topojson.feature(L.topo, { type: "MultiLineString", arcs: own }).geometry.coordinates, coastal, []);
    hit = coastal.map(prepareArc);
    L.coastOf.set(id, hit);
    return hit;
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
      if (amt > 0 && layers.grid) { ctx.beginPath(); traceArcs(ctx, seams); ctx.strokeStyle = "rgba(96,64,30," + (0.22 * amt) + ")"; ctx.lineWidth = 0.7; ctx.stroke(); }
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
        lakes = rows.map(function (r) { return { name: r[0], km2: r[1], coords: r[4], f: prepare({ type: "MultiPolygon", coordinates: r[4] }) }; });
        bigLakes = rows.filter(function (r) { return r[1] >= BIG_LAKE_KM2; }).map(function (r, i) {
          var b = [180, 90, -180, -90];
          r[4].forEach(function (poly) { poly[0].forEach(function (v) { b = [Math.min(b[0], v[0]), Math.min(b[1], v[1]), Math.max(b[2], v[0]), Math.max(b[3], v[1])]; }); });
          return { id: "L" + i, b: b, coords: r[4] };
        });
        lakes.sort(function (a, b) { return b.km2 - a.km2; });
        scheduleRender();
      }).catch(function (e) { console.warn("lakes", e); });
      return;
    }
    var big = new Path2D(), small = new Path2D(), w = 0.6 + 0.3 * lineWeight(localScale()), list = lakesAt();
    for (var i = 0; i < list.length; i++) {
      var px = Math.sqrt(list[i].km2) * kp;
      if (px < LAKE_PX) break;
      traceFeature(px < LAKE_LINE_PX ? small : big, list[i].f);
    }
    ctx.fillStyle = pal.ocean; ctx.fill(big); ctx.fill(small);
    ctx.lineWidth = w;
    ctx.strokeStyle = pal.border; ctx.stroke(big);
    ctx.strokeStyle = pal.water; ctx.stroke(small);
  }
  var LAKE_PX = 6, LAKE_LINE_PX = 18;
  var marshPat = null, marshPatKey = "", marshDrawn = false, MARSH_PX = 8;
  function marshPattern() {
    var key = dpr + pal.river;
    if (marshPat && marshPatKey === key) return marshPat;
    var cw = 18, chh = 12, cv = document.createElement("canvas");
    cv.width = Math.round(cw * dpr); cv.height = Math.round(chh * dpr);
    var g = cv.getContext("2d");
    g.scale(dpr, dpr);
    g.strokeStyle = pal.river; g.lineWidth = 0.75; g.lineCap = "round";
    var tuft = function (x, y) {
      g.beginPath();
      g.moveTo(x - 3.2, y); g.lineTo(x + 3.2, y);
      g.moveTo(x, y); g.lineTo(x, y - 2.8);
      g.moveTo(x - 1.4, y); g.lineTo(x - 2.4, y - 2.1);
      g.moveTo(x + 1.4, y); g.lineTo(x + 2.4, y - 2.1);
      g.stroke();
    };
    tuft(4.5, 4.8); tuft(13.5, 10.8);
    marshPat = ctx.createPattern(cv, "repeat");
    if (marshPat && marshPat.setTransform) marshPat.setTransform(new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, 0, 0]));
    marshPatKey = key;
    return marshPat;
  }
  function marshesNow() {
    return geog ? geog.marshes.filter(function (m) { return inSpan(m.from, m.to); }) : [];
  }
  function drawMarshes(kp, landPath) {
    marshDrawn = false;
    if (!layers.water) return;
    var path = new Path2D(), any = false;
    marshesNow().forEach(function (m) { if (Math.sqrt(m.km2) * kp >= MARSH_PX) { traceFeature(path, m.f); any = true; } });
    if (!any) return;
    ctx.save();
    ctx.clip(landPath);
    ctx.globalAlpha = 0.4; ctx.fillStyle = pal.ocean; ctx.fill(path, "evenodd");
    ctx.globalAlpha = 0.85; ctx.fillStyle = marshPattern(); ctx.fill(path, "evenodd");
    ctx.restore();
    marshDrawn = true;
  }

  var RIVERS_FROM = 520, RIVERS_FULL = 960;
  function riverRank(S) { return S < 800 ? 4 : S < 1300 ? 5 : 6; }
  function drawRivers(S) {
    if (!layers.water) return;
    if (S < RIVERS_FROM) return;
    if (!rivers) {
      if (!riversLoad) riversLoad = fetchJSON(UC + "data/rivers.json").then(function (t) {
        if (!t.objects || !t.objects.rivers) throw new Error("rivers do not match");
        riverTopo = t;
        rivers = riverRanks(t);
        scheduleRender();
      }).catch(function (e) { console.warn("rivers", e); });
      return;
    }
    var top = riverRank(S), fade = clamp01((S - RIVERS_FROM) / (RIVERS_FULL - RIVERS_FROM));
    ctx.save();
    clipOutLakes();
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.strokeStyle = pal.river;
    for (var rk = 1; rk <= top; rk++) {
      ctx.beginPath(); traceArcs(ctx, rivers[rk]); traceArcs(ctx, datedRivers(rk));
      ctx.globalAlpha = fade * (rk <= 2 ? 1 : 0.85);
      ctx.lineWidth = rk <= 1 ? 1.25 : rk <= 3 ? 1 : 0.75;
      ctx.stroke();
    }
    ctx.restore();
  }

  var geog = null, geogLoad = null, landTag = "", gridTag = "", landCache = new Map(), riverTopo = null;
  var lakeState = { key: -1, base: null, list: null }, riverState = { key: -1, lists: null }, landGeoState = { tag: "", geo: null };
  function inSpan(from, to) { return (from === null || now >= from) && (to === null || now < to); }
  function stateOf(times) {
    var lo = 0, hi = times.length;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (times[mid] <= now) lo = mid + 1; else hi = mid; }
    return lo;
  }
  function loadGeography() {
    if (geogLoad) return;
    geogLoad = fetchJSON("data/geography.json").then(function (g) {
      geog = prepGeography(g);
      landCache.clear();
      lakeState.key = -1; riverState.key = -1;
      if (riverTopo) rivers = riverRanks(riverTopo);
      scheduleRender();
    }).catch(function (e) { console.warn("geography", e); });
  }
  function patchesFor(key, g) {
    var byKey = new Map();
    land[key].forEach(function (p) { var r = p.geo.coordinates[0]; byKey.set(r.length + "," + r[0][0] + "," + r[0][1], p); });
    return (g.land[key] || []).map(function (q, i) {
      q.id = key + i; q.base = byKey.get(q.k.join()) || null;
      return q;
    }).filter(function (q) { return q.base; });
  }
  var FINE_S = 5000, fineLoad = null, geogRaw = null, fineGridMs = -1;
  function coastKey() { return land.fine && (!geog || geog.land.fine) ? "fine" : "lo"; }
  function loadFine() {
    if (fineLoad) return;
    fineLoad = fetchJSON("data/land-detail.json").then(function (t) {
      land.fine = prepLand(t);
      if (geog && geogRaw) geog.land.fine = patchesFor("fine", geogRaw);
      landCache.clear();
      setTimeout(function () {
        var t0 = performance.now();
        buildCoastGrid(datedLand(coastKey()).list);
        gridTag = "fine";
        fineGridMs = Math.round(performance.now() - t0);
        scheduleRender();
      }, 0);
      scheduleRender();
    }).catch(function (e) { console.warn("land detail", e); });
  }
  function landKey(key) {
    if (key !== "hi" || localScale() < FINE_S) return key;
    if (!land.fine) { loadFine(); return key; }
    if (geog && !(geog.land.fine && geog.land.fine.length) && activePatches("hi").length) return key;
    return "fine";
  }
  function prepGeography(g) {
    var out = { land: {}, lakeOnly: new Map(), lakeAdd: [], lakeTimes: [], riverDrop: new Map(), riverAdd: [], riverTimes: [], marshes: [] };
    geogRaw = g;
    ["hi", "lo"].concat(land.fine ? ["fine"] : []).forEach(function (key) { out.land[key] = patchesFor(key, g); });
    var times = function (list, from, to) { if (from !== null) list.push(from); if (to !== null) list.push(to); };
    g.lakes.only.forEach(function (r) { out.lakeOnly.set(r[0] + "|" + r[1], [r[2], r[3]]); times(out.lakeTimes, r[2], r[3]); });
    g.lakes.add.forEach(function (r, i) {
      var b = [180, 90, -180, -90];
      r[4].forEach(function (poly) { poly[0].forEach(function (v) { b = [Math.min(b[0], v[0]), Math.min(b[1], v[1]), Math.max(b[2], v[0]), Math.max(b[3], v[1])]; }); });
      out.lakeAdd.push({ id: "w" + i, name: r[0], km2: r[1], from: r[2], to: r[3], added: true, b: b, coords: r[4], f: prepare({ type: "MultiPolygon", coordinates: r[4] }) });
      times(out.lakeTimes, r[2], r[3]);
    });
    (g.marshes || []).forEach(function (r) {
      var b = [180, 90, -180, -90];
      r[4].forEach(function (poly) { poly[0].forEach(function (v) { b = [Math.min(b[0], v[0]), Math.min(b[1], v[1]), Math.max(b[2], v[0]), Math.max(b[3], v[1])]; }); });
      out.marshes.push({ name: r[0], km2: r[1], from: r[2], to: r[3], b: b, f: prepare({ type: "MultiPolygon", coordinates: r[4] }) });
    });
    g.rivers.drop.forEach(function (r) { out.riverDrop.set(r[0], r); });
    g.rivers.add.forEach(function (r) {
      out.riverAdd.push({ name: r[0], rank: r[1], spans: r[2], line: prepareArc(r[3]) });
      r[2].forEach(function (s) { times(out.riverTimes, s[0], s[1]); });
    });
    out.lakeTimes.sort(function (a, b) { return a - b; });
    out.riverTimes.sort(function (a, b) { return a - b; });
    return out;
  }
  function activePatches(key) {
    return geog && geog.land[key] ? geog.land[key].filter(function (q) { return inSpan(q.f, q.t); }) : [];
  }
  function landItem(poly) {
    var p = prepare({ type: "Polygon", coordinates: poly });
    var a = d3.geoArea({ type: "Polygon", coordinates: [poly[0]] });
    if (a > TAU) a = 2 * TAU - a;
    p.km = Math.sqrt(a) * R_KM;
    p.coast = poly.filter(function (r) { return r.length >= 2; }).map(prepareArc);
    return p;
  }
  function datedLand(key) {
    var act = activePatches(key), tag = act.map(function (q) { return q.id; }).join();
    if (!tag) return { list: land[key], tag: "" };
    var ck = key + "|" + tag, list = landCache.get(ck);
    if (list) return { list: list, tag: tag };
    var byBase = new Map(), adds = [];
    act.forEach(function (q) { if (!byBase.has(q.base)) byBase.set(q.base, []); byBase.get(q.base).push(q); });
    list = land[key].slice();
    byBase.forEach(function (qs, base) {
      var at = list.indexOf(base);
      qs.forEach(function (q) { (q.a || []).forEach(function (poly) { adds.push(landItem(poly)); }); });
      if (qs.some(function (q) { return q.d; })) { list[at] = null; return; }
      var rings = base.geo.coordinates, outer = rings[0].slice(0, -1), holes = rings.slice(1), cuts = [];
      var fill = [];
      qs.forEach(function (q) { cuts = cuts.concat(q.s || []); holes = holes.concat(q.h || []); fill = fill.concat((q.x || []).map(function (x) { return x.join(); })); });
      if (fill.length) holes = holes.filter(function (r) { return fill.indexOf(r.length + "," + r[0][0] + "," + r[0][1]) < 0; });
      cuts.sort(function (a, b) { return b[0] - a[0]; });
      cuts.forEach(function (c) { outer.splice.apply(outer, [c[0], c[1]].concat(c[2])); });
      outer.push(outer[0]);
      list[at] = landItem([outer].concat(holes));
    });
    list = list.filter(Boolean).concat(adds);
    list.sort(function (a, b) { return b.km - a.km; });
    landCache.set(ck, list);
    if (landCache.size > 8) landCache.delete(landCache.keys().next().value);
    return { list: list, tag: tag };
  }
  function landAt(key) {
    var r = datedLand(key);
    landTag = r.tag;
    return r.list;
  }
  var bigLakes = [], BIG_LAKE_KM2 = 800;
  function syncGrid() {
    if (!geog || !coastGrid) return;
    var ck = coastKey(), act = activePatches(ck), wet = geog.lakeAdd.filter(function (l) { return inSpan(l.from, l.to); }).concat(bigLakes);
    var tag = (ck === "fine" ? "fine," : "") + act.map(function (q) { return q.id; }).concat(wet.map(function (l) { return l.id; })).join();
    if (tag === gridTag) return;
    var was = gridTag.split(","), list = datedLand(ck).list;
    var near = function (b) {
      var m = 1;
      return list.filter(function (p) {
        if (!p.bb) { p.bb = [180, 90, -180, -90]; p.geo.coordinates[0].forEach(function (v) { p.bb = [Math.min(p.bb[0], v[0]), Math.min(p.bb[1], v[1]), Math.max(p.bb[2], v[0]), Math.max(p.bb[3], v[1])]; }); }
        return p.bb[0] <= b[2] + m && b[0] - m <= p.bb[2] && p.bb[1] <= b[3] + m && b[1] - m <= p.bb[3];
      });
    };
    geog.land[ck].forEach(function (q) { if (act.indexOf(q) >= 0 || was.indexOf(q.id) >= 0) buildCoastGrid(near(q.b), q.b); });
    geog.lakeAdd.forEach(function (l) { if (was.indexOf(l.id) >= 0 && wet.indexOf(l) < 0) buildCoastGrid(near(l.b), l.b); });
    wet.forEach(wetGrid);
    gridTag = tag;
  }
  function wetGrid(l) {
    var k = GRID_W / 360, r = COAST_KM * k / 111.195, mg = Math.ceil(r) + 2, b = l.b;
    var gx = Math.max(0, Math.floor((b[0] + 180) * k) - mg), gy = Math.max(0, Math.floor((90 - b[3]) * k) - mg);
    var gw = Math.min(GRID_W, Math.ceil((b[2] + 180) * k) + mg) - gx, gh = Math.min(GRID_H, Math.ceil((90 - b[1]) * k) + mg) - gy;
    var cv = document.createElement("canvas");
    cv.width = gw; cv.height = gh;
    var g = cv.getContext("2d", { willReadFrequently: true }), path = new Path2D();
    l.coords.forEach(function (poly) {
      poly.forEach(function (ring) {
        ring.forEach(function (v, i) { var x = (v[0] + 180) * k - gx, y = (90 - v[1]) * k - gy; if (i) path.lineTo(x, y); else path.moveTo(x, y); });
        path.closePath();
      });
    });
    g.fillStyle = "#000"; g.fill(path, "evenodd");
    g.lineJoin = "round"; g.lineWidth = 2 * r; g.strokeStyle = "#000"; g.stroke(path);
    var px = g.getImageData(0, 0, gw, gh).data;
    for (var yy = 0; yy < gh; yy++) for (var xx = 0; xx < gw; xx++) if (px[(yy * gw + xx) * 4 + 3] > 127) coastGrid.a[(gy + yy) * GRID_W + gx + xx] = 0;
  }
  function landGeoAt() {
    if (!geog || !landGeo) return landGeo;
    var r = datedLand("lo");
    if (!r.tag) return landGeo;
    if (landGeoState.tag !== r.tag) landGeoState = { tag: r.tag, geo: { type: "MultiPolygon", coordinates: r.list.map(function (p) { return p.geo.coordinates; }) } };
    return landGeoState.geo;
  }
  function lakesAt() {
    if (!geog) return lakes;
    var k = stateOf(geog.lakeTimes);
    if (lakeState.key === k && lakeState.base === lakes) return lakeState.list;
    var list = lakes.filter(function (l) { var s = geog.lakeOnly.get(l.name + "|" + l.km2); return !s || inSpan(s[0], s[1]); });
    geog.lakeAdd.forEach(function (l) { if (inSpan(l.from, l.to)) list.push(l); });
    list.sort(function (a, b) { return b.km2 - a.km2; });
    lakeState = { key: k, base: lakes, list: list };
    return list;
  }
  function riverRanks(t) {
    var byRank = [[], [], [], [], [], [], []], drop = geog ? geog.riverDrop : null;
    topojson.feature(t, t.objects.rivers).features.forEach(function (f, i) {
      var rk = f.properties && f.properties.r, d = drop && drop.get(i), c = f.geometry && f.geometry.coordinates;
      if (d && c && c.length === d[1] && c[0][0] === d[2] && c[0][1] === d[3]) return;
      if (rk >= 1 && rk <= 6) byRank[rk] = byRank[rk].concat(prepareLines(f.geometry));
    });
    return byRank;
  }
  function datedRivers(rank) {
    if (!geog) return [];
    var k = stateOf(geog.riverTimes);
    if (riverState.key !== k) {
      var lists = [[], [], [], [], [], [], []];
      geog.riverAdd.forEach(function (r) {
        if (r.spans.some(function (s) { return inSpan(s[0], s[1]); })) lists[r.rank].push(r.line);
      });
      riverState = { key: k, lists: lists };
    }
    return riverState.lists[rank] || [];
  }
  function clipOutLakes() {
    if (!geog || !lakes) return;
    var list = lakesAt(), kp = kmPx(), path = null;
    for (var i = 0; i < list.length; i++) {
      var l = list[i];
      if (!l.added || Math.sqrt(l.km2) * kp < LAKE_PX || !inView(l.f)) continue;
      if (!path) { path = new Path2D(); path.rect(-10, -10, W + 20, H + 20); }
      traceFeature(path, l.f);
    }
    if (path) ctx.clip(path, "evenodd");
  }
  var geographyApi = {
    geography: function () {
      var lk = lakes ? lakesAt() : [];
      return {
        loaded: !!geog,
        land: activePatches("hi").map(function (q) { return q.g; }),
        landTag: landTag,
        gridTag: gridTag,
        lakes: lk.filter(function (l) { return l.added; }).map(function (l) { return l.name + " " + l.km2; }),
        lakeCount: lk.length,
        hidden: geog && lakes ? lakes.length - lk.filter(function (l) { return !l.added; }).length : 0,
        rivers: geog ? geog.riverAdd.filter(function (r) { return r.spans.some(function (s) { return inSpan(s[0], s[1]); }); }).map(function (r) { return r.name; }) : []
      };
    },
    hasLake: function (name) { return !!lakes && lakesAt().some(function (l) { return l.name === name; }); }
  };

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
    var words = text.split(" "), out = [[text]], cut = text.indexOf("-");
    if (words.length === 1 && cut > 2 && cut < text.length - 3) out.push([text.slice(0, cut + 1), text.slice(cut + 1)]);
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
    [$("head"), $("ctls"), $("card"), $("time"), $("key")].forEach(function (el) {
      if (!el || el.hidden) return;
      var r = el.getBoundingClientRect();
      if (r.width) out.push({ x: r.left - 4, y: r.top - 4, w: r.width + 8, h: r.height + 8, ui: true });
    });
    return out;
  }
  function insideView(b) {
    if (b.x < 2 || b.y < 2 || b.x + b.w > W - 2 || b.y + b.h > H - 2) return false;
    return insideMap(b);
  }
  function hitsLabel(placed, b) {
    for (var i = 0; i < placed.length; i++) if (!placed[i].ui && overlaps(b, placed[i])) return true;
    return false;
  }
  function inSight(placed, boxes) {
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i], x = b.x + b.w / 2, y = b.y + b.h / 2, hid = x < 0 || x > W || y < 0 || y > H;
      for (var j = 0; j < placed.length && !hid; j++) { var u = placed[j]; if (u.ui && x > u.x && x < u.x + u.w && y > u.y && y < u.y + u.h) hid = true; }
      if (!hid) return true;
    }
    return false;
  }
  function insideMap(b) {
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
  function prepFit(s, obst, a, b, ang, win) {
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
    (win === undefined ? [[3, 3], [W - 3, 3], [3, H - 3], [W - 3, H - 3]] : win || []).forEach(function (q) { cu.push((q[0] * c + q[1] * sn) * ia); cv.push((-q[0] * sn + q[1] * c) * ib); });
    return {
      g: g, poly: poly, end: m, a: a, b: b, c: c, s: sn, ia: ia, ib: ib, grid: { start: grid.start, items: grid.items, U0: grid.U0, V0: grid.V0, cs: grid.cs, gu: grid.gu, gv: grid.gv },
      u0: cu.length ? Math.max(u0, Math.min.apply(null, cu)) : u0, u1: cu.length ? Math.min(u1, Math.max.apply(null, cu)) : u1,
      v0: cv.length ? Math.max(v0, Math.min.apply(null, cv)) : v0, v1: cv.length ? Math.min(v1, Math.max.apply(null, cv)) : v1
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
  function nearCentre(F, x, y, tau, budget) {
    var t = toFit(F, x, y), cu = t[0], cv = t[1], a = F.a, b = F.b, best = null, bd = Infinity, evals = 0, q = [], hmin = Math.max(0.05, tau * 0.04);
    var cell = function (u, v, h) {
      evals++;
      var d = fitDist(F, u, v), dist = Math.hypot((u - cu) * a, (v - cv) * b);
      if (d >= tau && dist < bd) { bd = dist; best = { u: u, v: v, d: d }; }
      return { u: u, v: v, h: h, d: d, max: -Math.hypot(Math.max(0, Math.abs(u - cu) - h) * a, Math.max(0, Math.abs(v - cv) - h) * b) };
    };
    cell(cu, cv, 0);
    var w = F.u1 - F.u0, hh = F.v1 - F.v0;
    if (best || !(w > 0 && hh > 0)) return best ? (function (xy) { return { x: xy[0], y: xy[1], d: best.d }; })(fromFit(F, best.u, best.v)) : null;
    var size = Math.max(Math.min(w, hh), Math.sqrt(w * hh / 20)), h = size / 2, i;
    for (var u = F.u0; u < F.u1; u += size) for (var v = F.v0; v < F.v1; v += size) { var c0 = cell(u + h, v + h, h); if (c0.d + h >= tau) heapPush(q, c0); }
    while (q.length && evals < budget) {
      var c = heapPop(q);
      if (-c.max >= bd) break;
      if (c.h <= hmin) continue;
      h = c.h / 2;
      var kids = [cell(c.u - h, c.v - h, h), cell(c.u + h, c.v - h, h), cell(c.u - h, c.v + h, h), cell(c.u + h, c.v + h, h)];
      for (i = 0; i < 4; i++) if (kids[i].d + h >= tau && -kids[i].max < bd) heapPush(q, kids[i]);
    }
    if (!best) return null;
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
  var CENTRE_KEEP = 0.78, GU = 4000, GROUND_WIN = 0.2 * GU, RECENTER = 0.06 * GU, MAX_TILT = 0.52, MAX_TILT_SHORT = 0.6, FADE_MS = 150;
  var groundCache = new Map(), lastGround = new Map(), labelState = new Map(), labelFading = [];
  function labelEpoch() {
    if (!labelCache.has("epoch")) { labelCache.set("epoch", 1); groundCache.clear(); lastGround.clear(); }
  }
  function glyphW(ch, people) {
    var k = "g" + (people ? "i" : "n") + ch, w = widthCache.get(k);
    if (w !== undefined) return w;
    ctx.font = (people ? "italic 400 " : "400 ") + "100px " + SERIF;
    ctx.letterSpacing = "0px";
    w = ctx.measureText(ch).width / 100;
    widthCache.set(k, w);
    return w;
  }
  function groundFrame(lon, lat) {
    if (flat) return { flat: true, lc: lon * D2R, pc: lat * D2R };
    var A = toVec(lon, lat), l = lon * D2R, q = lat * D2R;
    var north = [-Math.sin(q) * Math.cos(l), -Math.sin(q) * Math.sin(l), Math.cos(q)];
    var p0 = Math.max(-1.05, Math.min(1.05, q)), sp = Math.sin(p0), cp = Math.cos(p0);
    var P = [sp * A[0] + cp * north[0], sp * A[1] + cp * north[1], sp * A[2] + cp * north[2]];
    var A0 = normalize([A[0] - sp * P[0], A[1] - sp * P[1], A[2] - sp * P[2]]);
    var Q = [P[1] * A0[2] - P[2] * A0[1], P[2] * A0[0] - P[0] * A0[2], P[0] * A0[1] - P[1] * A0[0]];
    return { flat: false, P: P, A0: A0, Q: Q, p0: p0, A: A };
  }
  function planePut(xy, m, fr, l, p) {
    xy[m] = GU * (fr.flat ? l : l * Math.cos(p));
    xy[m + 1] = GU * (p - (fr.flat ? fr.pc : fr.p0));
    return m + 2;
  }
  function planeRing(rg, fr) {
    var n = rg.n, lam = new Float64Array(n), phi = new Float64Array(n), k, i, kb = 0, best = -1, d;
    if (fr.flat) {
      flatArrays(rg);
      for (k = 0; k < n; k++) { lam[k] = wrapPi(rg.L[k] - fr.lc); phi[k] = rg.P[k]; }
    } else {
      var P = fr.P, A0 = fr.A0, Q = fr.Q, X = rg.x, Y = rg.y, Z = rg.z;
      for (k = 0; k < n; k++) {
        var x = X[k], y = Y[k], z = Z[k];
        phi[k] = Math.asin(Math.max(-1, Math.min(1, x * P[0] + y * P[1] + z * P[2])));
        lam[k] = Math.atan2(x * Q[0] + y * Q[1] + z * Q[2], x * A0[0] + y * A0[1] + z * A0[2]);
      }
    }
    for (k = 0; k < n; k++) if (Math.abs(lam[k]) > best) { best = Math.abs(lam[k]); kb = k; }
    var xy = new Float64Array(2 * n + 4), m = 0, l = lam[kb], prev = l, sum = 0;
    for (i = 0; i < n; i++) {
      k = (kb + i) % n; d = lam[k] - prev;
      if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU;
      l += d; prev = lam[k]; sum += phi[k];
      m = planePut(xy, m, fr, l, phi[k]);
    }
    d = lam[kb] - prev;
    if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU;
    if (Math.abs(l + d - lam[kb]) > Math.PI) {
      var pole = sum < 0 ? -HALF_PI : HALF_PI;
      m = planePut(xy, m, fr, l, pole); m = planePut(xy, m, fr, lam[kb], pole);
    }
    return m >= 6 ? packRing(xy, m) : null;
  }
  function clipRing(r, e) {
    if (r.x0 >= -e && r.x1 <= e && r.y0 >= -e && r.y1 <= e) return r;
    if (r.x0 > e || r.x1 < -e || r.y0 > e || r.y1 < -e) return null;
    var a = r.xy, m = r.n;
    for (var side = 0; side < 4 && m; side++) {
      var ax = side & 1, sg = side < 2 ? 1 : -1, b = new Float64Array(4 * m + 4), q = 0;
      var px = a[2 * m - 2], py = a[2 * m - 1], pc = sg * (ax ? py : px);
      for (var k = 0; k < m; k++) {
        var x = a[2 * k], y = a[2 * k + 1], cc = sg * (ax ? y : x);
        if ((cc <= e) !== (pc <= e)) { var t = (e - pc) / (cc - pc); b[q++] = px + t * (x - px); b[q++] = py + t * (y - py); }
        if (cc <= e) { b[q++] = x; b[q++] = y; }
        px = x; py = y; pc = cc;
      }
      a = b; m = q >> 1;
    }
    return m >= 3 ? packRing(a, 2 * m) : null;
  }
  function planeShape(feats, fr, clip) {
    var rings = [], i, j, r, e = clip * GU;
    for (i = 0; i < feats.length; i++) {
      var f = feats[i];
      if (f.radius < -1) continue;
      if (!fr.flat && f.radius + clip * 1.5 < Math.PI && f.cx * fr.A[0] + f.cy * fr.A[1] + f.cz * fr.A[2] < Math.cos(f.radius + clip * 1.5)) continue;
      for (j = 0; j < f.rings.length; j++) { r = planeRing(f.rings[j], fr); if (r) r = clipRing(r, e); if (r) rings.push(r); }
    }
    if (!rings.length) return null;
    var s = { rings: rings, x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (i = 0; i < rings.length; i++) {
      r = rings[i];
      s.x0 = Math.min(s.x0, r.x0); s.y0 = Math.min(s.y0, r.y0); s.x1 = Math.max(s.x1, r.x1); s.y1 = Math.max(s.y1, r.y1);
    }
    return s;
  }
  function planeOf(fr, lon, lat) {
    if (fr.flat) return [GU * wrapPi(lon * D2R - fr.lc), GU * (lat * D2R - fr.pc)];
    var v = toVec(lon, lat), p = Math.asin(Math.max(-1, Math.min(1, v[0] * fr.P[0] + v[1] * fr.P[1] + v[2] * fr.P[2])));
    var l = Math.atan2(v[0] * fr.Q[0] + v[1] * fr.Q[1] + v[2] * fr.Q[2], v[0] * fr.A0[0] + v[1] * fr.A0[1] + v[2] * fr.A0[2]);
    return [GU * l * Math.cos(p), GU * (p - fr.p0)];
  }
  function sphereOf(fr, u, v) {
    var p = v / GU + fr.p0, c = Math.cos(p), l = c > 1e-9 ? u / (GU * c) : 0, cl = c * Math.cos(l), sl = c * Math.sin(l), sp = Math.sin(p);
    return [cl * fr.A0[0] + sl * fr.Q[0] + sp * fr.P[0], cl * fr.A0[1] + sl * fr.Q[1] + sp * fr.P[1], cl * fr.A0[2] + sl * fr.Q[2] + sp * fr.P[2]];
  }
  function planeLL(fr, u, v) {
    if (fr.flat) return [wrap180((fr.lc + u / GU) / D2R), (fr.pc + v / GU) / D2R];
    var X = sphereOf(fr, u, v);
    return [Math.atan2(X[1], X[0]) / D2R, Math.asin(Math.max(-1, Math.min(1, X[2]))) / D2R];
  }
  function screenAt(fr, u, v, sh) {
    if (fr.flat) return [cx + FB.k * (fr.lc + u / GU + sh - FB.xc), cy - FB.k * (fr.pc + v / GU - FB.yc), 1];
    var X = sphereOf(fr, u, v), x = X[0], y = X[1], z = X[2];
    return [cx + B.r * (x * B.ex + y * B.ey + z * B.ez), cy - B.r * (x * B.nx + y * B.ny + z * B.nz), x * B.cx + y * B.cy + z * B.cz];
  }
  function fitForms(opts, sp, obst, win, seeds, ang, budget) {
    var out = [], best = null;
    for (var i = 0; i < opts.length; i++) {
      var o = opts[i], F = prepFit(sp, obst, o.w / 2, o.h / 2, ang, win);
      var r = poleOf(F, best ? [[best.u, best.v]].concat(seeds) : seeds, best ? budget / 2 : budget, Infinity);
      if (!r || r.d <= 0) continue;
      var fm = { oi: i, sp: o.space, ang: ang, u: r.x, v: r.y, d: r.d, tight: false };
      out.push(fm);
      if (!best || fm.d > best.d) best = fm;
    }
    return out;
  }
  function bestOf(forms, ang) {
    var b = null;
    forms.forEach(function (fm) { if ((ang === undefined || (fm.ang !== 0) === ang) && (!b || fm.d > b.d)) b = fm; });
    return b;
  }
  function allForms(p, name, sp, win) {
    var opts = labelOptions(name, p.people), forms = fitForms(opts, sp, [], win, [[0, 0]], 0, 150), i;
    if (!forms.length) return forms;
    var top = bestOf(forms), ax = principalAxis(sp, top.u, top.v);
    if (ax && ax.e > 1.5 && Math.abs(ax.ang) > 0.12) {
      var lim = name.length > 6 ? MAX_TILT : MAX_TILT_SHORT, a = Math.max(-lim, Math.min(lim, ax.ang));
      forms = forms.concat(fitForms(opts, sp, [], win, [[top.u, top.v]], a, 80));
    }
    if (!p.people) {
      var tight = labelOptions(name, false, TIGHT);
      [bestOf(forms, false), bestOf(forms, true)].forEach(function (fm) {
        if (!fm) return;
        var o = tight[fm.oi], r = poleOf(prepFit(sp, [], o.w / 2, o.h / 2, fm.ang, win), [[fm.u, fm.v]], 40, Infinity);
        if (r && r.d > fm.d * 1.04) forms.push({ oi: fm.oi, sp: TIGHT, ang: fm.ang, u: r.x, v: r.y, d: r.d, tight: true });
      });
    }
    return forms;
  }
  function centred(sp, win, name, people, fm, ctr, wall) {
    var o = labelOptions(name, people, fm.sp)[fm.oi], dmax = fm.d, F = null, pole = fm;
    if (wall) {
      F = prepFit(sp, wall, o.w / 2, o.h / 2, fm.ang, win);
      var r = poleOf(F, [[fm.u, fm.v], [ctr[0], ctr[1]], [0, 0]], 80, Infinity);
      if (r && r.d >= 0.85 * fm.d) { dmax = r.d; pole = { u: r.x, v: r.y, d: r.d }; } else F = null;
    }
    if (!F) F = prepFit(sp, [], o.w / 2, o.h / 2, fm.ang, win);
    var at = nearCentre(F, ctr[0], ctr[1], CENTRE_KEEP * dmax, 260) || { x: pole.u, y: pole.v, d: pole.d };
    var out = [{ oi: fm.oi, sp: fm.sp, ang: fm.ang, u: at.x, v: at.y, d: at.d, dmax: dmax, tight: fm.tight }];
    if (at.d < 0.97 * pole.d) out.push({ oi: fm.oi, sp: fm.sp, ang: fm.ang, u: pole.u, v: pole.v, d: pole.d, dmax: pole.d, tight: fm.tight, pole: true });
    return out;
  }
  function centreOf(geo) {
    var g = geo && geo.geometry, polys = !g ? [] : g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [], big = null, ba = 0;
    polys.forEach(function (poly) {
      var a = d3.geoArea({ type: "Polygon", coordinates: poly });
      if (a > TAU) a = 2 * TAU - a;
      if (a > ba) { ba = a; big = poly; }
    });
    if (!big) return null;
    var c = d3.geoCentroid({ type: "Polygon", coordinates: big });
    return isFinite(c[0]) && isFinite(c[1]) ? c : null;
  }
  function groundCand(p, name, feats, lon, lat, capLL, reach, again, cenLL) {
    var fr = groundFrame(lon, lat), sp = planeShape(feats, fr, reach ? reach + 0.35 : 0.6), e = reach * GU;
    if (!sp) return null;
    var win = !reach ? null : [[-e, -e], [e, -e], [-e, e], [e, e]];
    var forms = allForms(p, name, sp, win);
    if (!forms.length) return null;
    var top = bestOf(forms), ctr = cenLL ? planeOf(fr, cenLL[0], cenLL[1]) : [0, 0], wall = null;
    if (capLL) {
      var cpt = planeOf(fr, capLL[0], capLL[1]), hc = 0.4 * top.d, x0 = cpt[0] - hc, x1 = cpt[0] + hc + 0.3 * capLL[2] * top.d, y0 = cpt[1] - hc, y1 = cpt[1] + hc;
      if (x1 > sp.x0 && x0 < sp.x1 && y1 > sp.y0 && y0 < sp.y1) wall = [x0, y0, x1, y0, x1, y0, x1, y1, x1, y1, x0, y1, x0, y1, x0, y0];
    }
    var out = [];
    forms.forEach(function (fm) { out = out.concat(centred(sp, win, name, p.people, fm, ctr, wall)); });
    var plain = bestOf(out.filter(function (fm) { return !fm.tight && !fm.pole; }), false) || out[0];
    if (!fr.flat && !again && !reach && (Math.abs(plain.u) > RECENTER || Math.abs(plain.v) > RECENTER)) {
      var ll = planeLL(fr, plain.u, plain.v);
      return groundCand(p, name, feats, ll[0], ll[1], capLL, reach, true, cenLL) || { fr: fr, forms: out };
    }
    return { fr: fr, forms: out };
  }

  function groundLayout(snap, p, name, allow) {
    labelEpoch();
    var g = p.group ? p.geoLo : snap.geoms.lo[p.i], cap = (snap.modern || snap.dated) && p.cap ? capitalNow(p.cap) : null;
    var key = (flat ? "f" : "g") + (p.group ? "G" : "") + name + "|" + p.label.slice(0, 6).join() + (cap ? "|" + cap[1] + "," + cap[2] : ""), hit = groundCache.get(key);
    if (hit) { groundCache.delete(key); groundCache.set(key, hit); }
    if (hit || !allow) return hit;
    if (groundCache.size > 2000) groundCache.delete(groundCache.keys().next().value);
    var feats = featOf(snap.topo.lo, "lo", g).prep, lab = p.label, spots = [[lab[0], lab[1]]].concat(lab[6] || []), cands = [], capLL = cap ? [cap[1], cap[2], String(cap[0] || "").length] : null;
    var span = Math.sqrt(lab[5]) / R_KM, gap = Math.max(0.07, span / 5), i, c;
    var add = function (c) {
            if (!c) return;
      c.ll = planeLL(c.fr, c.forms[0].u, c.forms[0].v);
      var v = toVec(c.ll[0], c.ll[1]);
      for (var k = 0; k < cands.length; k++) if (Math.acos(Math.min(1, v[0] * cands[k].v[0] + v[1] * cands[k].v[1] + v[2] * cands[k].v[2])) < gap * 0.6) return;
      c.v = v;
      cands.push(c);
    };
    var cen = centreOf(featOf(snap.topo.lo, "lo", g).geo);
    for (i = 0; i < spots.length && cands.length < 6; i++) add(groundCand(p, name, feats, spots[i][0], spots[i][1], capLL, i ? GROUND_WIN / GU : 0, false, i ? null : cen));
    hit = { cands: cands, more: cands.length && span > 0.12 ? { pts: null, grow: function (lim) {
      var m = hit.more;
      if (!m.pts) {
        var fr = groundFrame(lab[0], lab[1]), sp = planeShape(feats, fr, 3.2), F = sp && prepFit(sp, [], 1, 1, 0, null), step = gap * GU;
        m.pts = [];
        if (F) for (var u = Math.ceil(sp.x0 / step) * step; u < sp.x1; u += step) for (var w = Math.ceil(sp.y0 / step) * step; w < sp.y1; w += step) {
          var d = fitDist(F, u, w);
          if (d > step * 0.2) { var ll = planeLL(fr, u, w); m.pts.push({ ll: ll, d: d }); }
        }
        m.pts.sort(function (a, b) { return b.d - a.d; });
      }
      var n = 0, vis = [], sc = (flat ? FB.k : B.r) / GU;
      m.pts.forEach(function (q) {
        if (q.done) return;
        var at = projectLL(q.ll[0], q.ll[1]);
        if (!at || at[2] < 0.4 || at[0] < lim[0] || at[0] > lim[2] || at[1] < lim[1] || at[1] > lim[3]) return;
        vis.push({ q: q, s: Math.min(q.d * sc, 300) - 0.5 * Math.hypot(at[0] - cx, at[1] - cy) });
      });
      vis.sort(function (a, b) { return b.s - a.s; });
      for (var k = 0; k < vis.length && n < 3 && cands.length < 16; k++, n++) {
        vis[k].q.done = true;
        add(groundCand(p, name, feats, vis[k].q.ll[0], vis[k].q.ll[1], capLL, gap / 3, false));
      }
      return n > 0;
    } } : null };
    groundCache.set(key, hit);
    return hit;
  }
  function upright(g) {
    var tl = Math.hypot(g.tx, g.ty), nl = Math.hypot(g.nx, g.ny);
    if (!(tl > 0) || !(nl > 0)) return;
    var px = -g.ty / tl * nl, py = g.tx / tl * nl;
    if (px * g.nx + py * g.ny < 0) { px = -px; py = -py; }
    g.nx = px; g.ny = py;
  }
  function glyphLayout(fr, fm, o, f, people, scale) {
    var ca = Math.cos(fm.ang), sa = Math.sin(fm.ang), inv = 1 / scale, spx = f * o.space, L = o.lines.length, sh = 0, i, j;
    if (fr.flat) { var lam = fr.lc + fm.u / GU; sh = FB.wrap ? wrapPi(lam - FB.xc) - (lam - FB.xc) : wrapPi(lam) - lam; }
    var c0 = screenAt(fr, fm.u, fm.v, sh);
    if (c0[2] < 0.25) return null;
    var c1 = screenAt(fr, fm.u + ca * inv, fm.v + sa * inv, sh), lines = [], boxes = [], hh = f * CAP_H / 2;
    for (i = 0; i < L; i++) {
      var chars = Array.from(o.lines[i]), n = chars.length, adv = [], tot = spx * (n - 1);
      for (j = 0; j < n; j++) { adv.push(glyphW(chars[j], people) * f); tot += adv[j]; }
      var t = -tot / 2, off = ((L - 1) / 2 - i) * f * LINE_H, gl = [], nmax = 0;
      for (j = 0; j < n; j++) {
        var tc = t + adv[j] / 2, pu = fm.u + (tc * ca - off * sa) * inv, pv = fm.v + (tc * sa + off * ca) * inv;
        var q = screenAt(fr, pu, pv, sh);
        if (q[2] < 0.22) return null;
        var qa = screenAt(fr, pu + ca * inv, pv + sa * inv, sh), qb = screenAt(fr, pu - sa * inv, pv + ca * inv, sh);
        var g = { ch: chars[j], x: q[0], y: q[1], tx: qa[0] - q[0], ty: qa[1] - q[1], nx: qb[0] - q[0], ny: qb[1] - q[1], adv: adv[j] };
        upright(g);
        nmax = Math.max(nmax, Math.hypot(g.nx, g.ny));
        gl.push(g);
        t += adv[j] + spx;
      }
      var a = gl[0], b = gl[n - 1], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, straight = true, ta = Math.atan2(dy, dx), tl = Math.hypot(a.tx, a.ty);
      for (j = 0; j < n && straight && n > 1; j++) {
        var gj = gl[j], dev = Math.abs((gj.x - a.x) * dy - (gj.y - a.y) * dx) / len, da = Math.atan2(gj.ty, gj.tx) - ta;
        if (dev > 0.3 || Math.abs(Math.atan2(Math.sin(da), Math.cos(da))) > 0.012 || Math.abs(Math.hypot(gj.tx, gj.ty) / tl - 1) > 0.02) straight = false;
      }
      var ln = { text: o.lines[i], spx: spx, straight: straight, gl: gl };
      if (straight) {
        var sx = a.x - a.tx * a.adv / 2, sy = a.y - a.ty * a.adv / 2, ex = b.x + b.tx * b.adv / 2, ey = b.y + b.ty * b.adv / 2, m = gl[n >> 1];
        ln.mx = (sx + ex) / 2; ln.my = (sy + ey) / 2; ln.tx = m.tx; ln.ty = m.ty; ln.nx = m.nx; ln.ny = m.ny;
      }
      var step = straight ? n : 3;
      for (j = 0; j < n; j += step) {
        var g0 = gl[j], g1 = gl[Math.min(n, j + step) - 1];
        var x0 = g0.x - g0.tx * g0.adv / 2, y0 = g0.y - g0.ty * g0.adv / 2, x1 = g1.x + g1.tx * g1.adv / 2, y1 = g1.y + g1.ty * g1.adv / 2;
        boxes.push(mkBox((x0 + x1) / 2, (y0 + y1) / 2, Math.hypot(x1 - x0, y1 - y0) / 2 + 1, hh * nmax + 1, Math.atan2(y1 - y0, x1 - x0)));
      }
      lines.push(ln);
    }
    return { lines: lines, boxes: boxes, x: c0[0], y: c0[1], ang: Math.atan2(c1[1] - c0[1], c1[0] - c0[0]) };
  }
  function straightLines(lines, x, y, f, spx) {
    return lines.map(function (text, i) {
      return { text: text, spx: spx, straight: true, mx: x, my: y + (i - (lines.length - 1) / 2) * f * LINE_H, tx: 1, ty: 0, nx: 0, ny: -1 };
    });
  }
  function seaSide(s, size, lines) {
    var main = null, i;
    for (i = 0; i < s.rings.length; i++) { var r = s.rings[i]; if (!main || (r.x1 - r.x0) * (r.y1 - r.y0) > (main.x1 - main.x0) * (main.y1 - main.y0)) main = r; }
    if (!main || main.x1 - main.x0 > 200 || main.y1 - main.y0 > 200) return null;
    ctx.font = "400 " + size + "px " + SERIF;
    ctx.letterSpacing = "1px";
    var w = 0;
    lines.forEach(function (l) { w = Math.max(w, ctx.measureText(l).width); });
    var hw = w / 2 + 2, hh = size * 0.6 * lines.length + 1, out = [], mx = (main.x0 + main.x1) / 2, my = (main.y0 + main.y1) / 2, xy = main.xy;
    [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (d) {
      var best = -Infinity, bx = mx, by = my, k, v;
      for (k = 0; k < main.n; k++) {
        var x = xy[2 * k], y = xy[2 * k + 1];
        if (d[0] && !d[1] && Math.abs(y - my) > hh + 2) continue;
        if (d[1] && !d[0] && Math.abs(x - mx) > hw + 2) continue;
        v = x * d[0] + y * d[1];
        if (v > best) { best = v; bx = x; by = y; }
      }
      if (!d[0]) bx = mx;
      if (!d[1]) by = my;
      out.push(mkBox(bx + d[0] * (hw + 3), by + d[1] * (hh + 3), hw, hh, 0));
    });
    out.pref = main.y1 - main.y0 > main.x1 - main.x0 ? [3, 2, 0, 1, 5, 4, 7, 6] : [0, 1, 3, 2, 5, 4, 7, 6];
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
  var settleLabels = 0;
  function labelTarget(side, people, minF, cap) {
    return Math.max(minF, Math.min(cap, (5 + 3.6 * Math.log2(Math.max(1, side) / 10)) * (people ? 0.85 : 1)));
  }
  function formSig(fm) { return fm.oi + (fm.ang ? "a" : "h") + (fm.tight ? "t" : "n") + (fm.pole ? "p" : ""); }
  function placeGround(p, name, G, side, placed, scale) {
    var st = labelState.get(p.id), people = p.people, cap = people ? 15 : 26, minF = people ? 8.5 : 7.5, thr = st ? minF * 0.93 : minF;
    var target = labelTarget(side, people, minF, cap), order = [], ci, k, near = -1, nd = 0.2;
    if (st && st.v) for (ci = 0; ci < G.cands.length; ci++) {
      var cv = G.cands[ci].v, dd = Math.acos(Math.min(1, cv[0] * st.v[0] + cv[1] * st.v[1] + cv[2] * st.v[2]));
      if (dd < nd) { nd = dd; near = ci; }
    }
    if (near > 0 && !(moving || rangeActive)) order.push(0);
    if (near >= 0) order.push(near);
    for (ci = 0; ci < G.cands.length; ci++) if (order.indexOf(ci) < 0) order.push(ci);
    for (var oi = 0; oi < order.length; oi++) {
      ci = order[oi];
      var c = G.cands[ci], ranked = [];
      for (k = 0; k < c.forms.length; k++) {
        var fm = c.forms[k], fit = 0.88 * fm.d * scale, f = Math.min(cap, target, fit), fmax = fm.pole ? f : Math.min(cap, target, 0.88 * fm.dmax * scale), same = ci === near && st.form === formSig(fm), tilt = fm.ang;
        if (!c.fr.flat) {
          var q0 = screenAt(c.fr, fm.u, fm.v, 0), q1 = screenAt(c.fr, fm.u + Math.cos(fm.ang) * 4 / scale, fm.v + Math.sin(fm.ang) * 4 / scale, 0);
          if (q0[2] < 0.25) continue;
          tilt = Math.atan2(q1[1] - q0[1], q1[0] - q0[0]);
        }
        tilt = Math.abs(tilt);
        if (tilt > (name.length > 6 ? 0.55 : 0.65) + (same ? 0.25 : 0)) continue;
        var pen = (fm.ang ? 0.8 : 1) * (fm.oi ? (fm.oi === 1 ? 0.9 : 0.82) : 1) * (fm.tight ? 0.9 : 1) * (fm.pole ? 0.75 : 1) * (tilt > 0.2 ? 1.2 - tilt : 1);
        if (f < thr && !people && side >= 28 && (side >= 64 || localScale() < 600) && fit * 1.18 >= thr) { f = thr; pen *= 0.7; }
        ranked.push({ k: k, f: f, s: Math.max(f, fmax) * pen * (same ? 1.12 : 1), same: same });
      }
      var top = 0, keep = null;
      ranked.forEach(function (r) { top = Math.max(top, r.f); if (r.same) keep = r; });
      ranked.sort(function (a, b) { return b.s - a.s; });
      if (keep && keep.f * 1.25 >= top) ranked = [keep].concat(ranked.filter(function (r) { return r !== keep; }));
      for (var t = 0; t < Math.min(4, ranked.length); t++) {
        var rk = ranked[t];
        if (rk.f < thr) continue;
        var fmk = c.forms[rk.k], o = labelOptions(name, people, fmk.sp)[fmk.oi], geo = glyphLayout(c.fr, fmk, o, rk.f, people, scale);
        if (!geo) continue;
        var ok = true, held = rk.same, pad = rk.same ? 0 : 2 + 0.15 * rk.f;
        for (var bi = 0; bi < geo.boxes.length && ok; bi++) {
          var bx = geo.boxes[bi];
          ok = held ? insideMap(bx) && !hitsLabel(placed, bx) : insideView(bx) && !collides(placed, pad ? mkBox(bx.cx, bx.cy, bx.hw + pad, bx.hh + pad, bx.ang) : bx);
        }
        if (ok && held) ok = inSight(placed, geo.boxes);
        if (!ok) continue;
        return { id: p.id, name: name, people: people, band: !!p.band, f: rk.f, geo: geo, v: c.v, form: !t || !st ? formSig(fmk) : st.form, src: { fr: c.fr, fm: fmk, o: o, scale: scale } };
      }
    }
    return null;
  }
  function boundsOf(boxes) {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    boxes.forEach(function (b) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); });
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  function layoutPolities(snap, placed, kp) {
    var lv = useLevel(), L = level(snap, lv), items = [], small = [], shapes = new Map(), S = localScale(), i;
    var quick = moving || rangeActive, t0 = performance.now(), scale = (flat ? FB.k : B.r) / GU, fk = flat ? "f" : "g";
    var first = [], rest = [];
    for (i = 0; i < snap.order.length; i++) (labelState.has(snap.order[i].id) ? first : rest).push(snap.order[i]);
    var order = (snap.groups || []).concat(first, rest), seen = new Set();
    for (i = 0; i < order.length; i++) {
      var p = order[i], lab = p.label;
      if (!lab || lab[2] * kp < 0.5 || seen.has(p.id)) continue;
      var name = polityName(p.id);
      if (!name) continue;
      var feats = p.group ? featOf(snap.topo[lv], lv, lv === "hi" ? p.geoHi : p.geoLo).prep : L.feats[p.i], any = false;
      for (var j = 0; j < feats.length && !any; j++) any = inView(feats[j]);
      if (!any) continue;
      var side = Math.sqrt(lab[5]) * kp, wh = Infinity;
      labelOptions(name, p.people).forEach(function (o) { wh = Math.min(wh, o.w * o.h); });
      var G = 1.1 * side / Math.sqrt(wh) < (p.people ? 8 : 7) ? null : groundLayout(snap, p, name, !quick || performance.now() - t0 < 16);
      if (G) lastGround.set(fk + p.id, G); else G = lastGround.get(fk + p.id);
      var it = G ? placeGround(p, name, G, side, placed, scale) : null;
      for (var tries = 0; !it && G && G.more && side > 60 && tries < 3 && (!quick || performance.now() - t0 < 16) && G.more.grow([W * 0.08, H * 0.12, W * 0.92, H * 0.88]); tries++) it = placeGround(p, name, G, side, placed, scale);
      if (it) {
        seen.add(p.id);
        for (j = 0; j < it.geo.boxes.length; j++) placed.push(it.geo.boxes[j]);
        items.push(it);
        continue;
      }
      if (!p.group && !p.people && (lab[5] > 1500 || lab[2] * kp > 2) && S >= 600 && side < 64) {
        var s = screenShape(feats, Math.max(0.8, Math.min(5, side / 40)), Math.min(4, side / 8));
        shapes.set(p.i, s);
        var was = labelState.get(p.id);
        if (s && (was && was.dir >= 0 ? s.x1 > 0 && s.y1 > 0 && s.x0 < W && s.y0 < H : s.x0 > 0 && s.y0 > 0 && s.x1 < W && s.y1 < H)) small.push({ p: p, name: name, s: s });
      }
    }
    for (j = 0; j < small.length; j++) {
      var sm = small[j], at = projectLL(sm.p.label[0], sm.p.label[1]);
      if (at && at[2] < 0.45) continue;
      var opts = labelOptions(sm.name, false), lines = opts[sm.name.length > 24 && opts[2] ? 2 : sm.name.length > 10 && opts[1] ? 1 : 0].lines;
      var boxes = seaSide(sm.s, 9, lines), st = labelState.get(sm.p.id), dirs = boxes && boxes.pref;
      if (!boxes) continue;
      if (st && st.dir >= 0) dirs = [st.dir].concat(dirs.filter(function (d) { return d !== st.dir; }));
      for (var q = 0; q < dirs.length; q++) {
        var b = boxes[dirs[q]], held = st && st.dir === dirs[q];
        if (held ? !insideMap(b) || hitsLabel(placed, b) || !inSight(placed, [b]) : !insideView(b) || collides(placed, b)) continue;
        if (boxOnLand(L, b, shapes)) continue;
        placed.push(b);
        seen.add(sm.p.id);
        items.push({ id: sm.p.id, name: sm.name, people: false, f: 9, sea: true, dir: dirs[q], geo: { lines: straightLines(lines, b.cx, b.cy, 9, 1), boxes: [b], x: b.cx, y: b.cy, ang: 0 } });
        break;
      }
    }
    var time = performance.now(), keep = new Map();
    items.forEach(function (it) {
      var st = labelState.get(it.id);
      it.t0 = st ? st.t0 : reduceMotion ? -Infinity : time;
      keep.set(it.id, { v: it.sea ? null : it.v, form: it.sea ? "" : it.form, dir: it.sea ? it.dir : -1, t0: it.t0 });
    });
    labelState.forEach(function (st, id) {
      if (keep.has(id) || reduceMotion || !st.last || st.last.sea) return;
      labelFading = labelFading.filter(function (x) { return x.id !== id; });
      labelFading.push({ id: id, t1: time, it: st.last });
    });
    items.forEach(function (it) { keep.get(it.id).last = it; });
    labelFading = labelFading.filter(function (x) { return !keep.has(x.id); });
    labelState = keep;
    items.partial = quick;
    return items;
  }
  function drawLabelItem(it, geo, alpha) {
    var f = it.f, lines = geo.lines, i, j, ln, g;
    ctx.globalAlpha = alpha;
    ctx.font = (it.people ? "italic 400 " : "400 ") + f.toFixed(1) + "px " + SERIF;
    ctx.lineWidth = it.sea ? 3 : Math.max(2, f * 0.22);
    ctx.strokeStyle = it.sea ? pal.ocean : pal["label-halo"];
    ctx.fillStyle = it.people ? pal.people : pal.label;
    if (it.band) ctx.globalAlpha = alpha * 0.72;
    for (var pass = 0; pass < 2; pass++) {
      for (i = 0; i < lines.length; i++) {
        ln = lines[i];
        if (ln.straight) {
          ctx.letterSpacing = ln.spx.toFixed(2) + "px";
          ctx.setTransform(dpr * ln.tx, dpr * ln.ty, -dpr * ln.nx, -dpr * ln.ny, dpr * ln.mx, dpr * ln.my);
          if (pass) ctx.fillText(ln.text, ln.spx / 2, 0); else ctx.strokeText(ln.text, ln.spx / 2, 0);
          continue;
        }
        ctx.letterSpacing = "0px";
        for (j = 0; j < ln.gl.length; j++) {
          g = ln.gl[j];
          ctx.setTransform(dpr * g.tx, dpr * g.ty, -dpr * g.nx, -dpr * g.ny, dpr * g.x, dpr * g.y);
          if (pass) ctx.fillText(g.ch, 0, 0); else ctx.strokeText(g.ch, 0, 0);
        }
      }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
  }
  function drawPolityLabels(snap, placed, kp) {
    if (!layers.states) return;
    var quick = moving || rangeActive;
    var key = [snap.key, useLevel(), view.lon.toFixed(5), view.lat.toFixed(5), view.zoom.toFixed(5), flat ? 1 : 0, W, H, quick ? 1 : 0,
      placed.map(function (b) { return Math.round(b.x) + ":" + Math.round(b.y) + ":" + Math.round(b.w) + ":" + Math.round(b.h); }).join(",")].join("|");
    var memo = labelCache.get("layout");
    if (!memo || memo.key !== key) { memo = { key: key, items: layoutPolities(snap, placed.slice(), kp) }; labelCache.set("layout", memo); }
    if (quick && !settleLabels) settleLabels = setTimeout(function wait() { settleLabels = moving || rangeActive ? setTimeout(wait, 200) : 0; if (!settleLabels) scheduleRender(); }, 200);
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    var time = performance.now(), live = false, k, it;
    for (k = 0; k < memo.items.length; k++) {
      it = memo.items[k];
      var a = Math.min(1, Math.max(0, (time - it.t0) / FADE_MS));
      if (a < 1) live = true;
      for (var j = 0; j < it.geo.boxes.length; j++) placed.push(it.geo.boxes[j]);
      placedLabels.push({ name: it.name, x: it.geo.x, y: it.geo.y, size: it.f, kind: it.people ? "people" : "polity", id: it.id, ang: it.geo.ang, lines: it.geo.lines.length,
        box: boundsOf(it.geo.boxes), boxes: it.geo.boxes, sea: !!it.sea });
      drawLabelItem(it, it.geo, a);
    }
    var scale = (flat ? FB.k : B.r) / GU;
    labelFading = labelFading.filter(function (x) {
      var a = 1 - (time - x.t1) / FADE_MS, src = x.it.src;
      if (a <= 0 || !src) return false;
      live = true;
      var f = Math.min(x.it.people ? 15 : 26, x.it.f * scale / src.scale), geo = !!src.fr.flat === flat ? glyphLayout(src.fr, src.fm, src.o, f, x.it.people, scale) : null;
      if (geo) drawLabelItem({ f: f, people: x.it.people, band: x.it.band }, geo, a);
      return true;
    });
    ctx.letterSpacing = "0px";
    if (live) scheduleRender();
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
    return { name: r[0], lines: lines, lon: r[1], lat: r[2], tier: r[3] };
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
  function capitalNow(cap) {
    if (!cap) return null;
    var c = capitalAt(cap, Math.min(dayOfTime(now), modern.toDay));
    return c[0] ? c : null;
  }
  function namedAt(names, fallback, when) {
    var n = fallback;
    if (names) for (var i = 0; i < names.length; i++) if (names[i][0] <= when) n = names[i][1];
    return n;
  }
  function prepCities(d, minor) {
    return d.rows.map(function (r) {
      var s = r[6], ys = [], ps = [];
      for (var i = 0; i < s.length; i += 2) { ys.push(s[i]); ps.push(s[i + 1]); }
      return { id: r[0], name: r[1], lon: r[2], lat: r[3], since: r[4], until: r[5] === null ? Infinity : r[5], ys: ys, ps: ps, steps: r[7] || null, qid: r[8] || null, minor: minor };
    });
  }
  function popAt(c, t) {
    var ys = c.ys, ps = c.ps, n = ys.length;
    if (t <= ys[0]) return ps[0];
    for (var i = 1; i < n; i++) if (t <= ys[i]) return ps[i - 1] * Math.pow(ps[i] / ps[i - 1], (t - ys[i - 1]) / (ys[i] - ys[i - 1]));
    return ps[n - 1];
  }
  var cityRank = { t: NaN, n: 0, list: [] };
  function cityRanked(t) {
    if (cityRank.t === t && cityRank.n === cities.rows.length) return cityRank.list;
    var list = [], rows = cities.rows, ranks = cities.ranks;
    for (var i = 0; i < rows.length; i++) {
      var c = rows[i];
      if (c.since <= t && t < c.until) list.push({ c: c, pop: popAt(c, t), tier: 4 });
    }
    list.sort(function (a, b) { return b.pop - a.pop; });
    for (i = 0; i < list.length; i++) list[i].tier = i < ranks[0] ? 1 : i < ranks[1] ? 2 : i < ranks[2] ? 3 : 4;
    cityRank = { t: t, n: rows.length, list: list };
    return list;
  }
  function loadMinorCities() {
    if (cities.minorLoad) return;
    cities.minorLoad = fetchJSON("data/cities-dated-minor.json").then(function (d) {
      cities.rows = cities.rows.concat(prepCities(d, true));
      cityNearCache.clear();
      scheduleRender();
    }).catch(function (e) { console.warn("cities", e); });
  }
  var cityNearCache = new Map();
  function plainName(n) { return n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, ""); }
  function cityNear(lon, lat, name) {
    if (!cities) return null;
    var key = lon + "," + lat + "," + name;
    if (cityNearCache.has(key)) return cityNearCache.get(key);
    var best = null, bd = 0.25, near = null, nd = 0.001, want = plainName(name);
    for (var i = 0; i < cities.rows.length; i++) {
      var c = cities.rows[i], dx = (c.lon - lon) * Math.cos(lat * Math.PI / 180), dy = c.lat - lat, d = dx * dx + dy * dy;
      if (d >= bd && d >= nd) continue;
      var same = plainName(c.name) === want;
      if (!same && c.steps) for (var j = 0; j < c.steps.length && !same; j++) same = plainName(c.steps[j][1]) === want;
      if (same && d < bd) { bd = d; best = c; }
      else if (d < nd) { nd = d; near = c; }
    }
    best = best || near;
    cityNearCache.set(key, best);
    return best;
  }
  function capitalName(c) {
    var city = cityNear(c[1], c[2], c[0]);
    return city && city.steps ? namedAt(city.steps, c[0], now) : c[0];
  }
  function cityTier(S) { return S < 330 ? 0 : S < 480 ? 1 : S < 800 ? 2 : S < 1400 ? 3 : 4; }
  function markSize(S) { return S < 900 ? 1 : 1.15; }
  function capitalList(snap, S) {
    var out = [];
    if (!(snap.modern || snap.dated) || S < 230) return out;
    var seen = new Set();
    for (var i = 0; i < snap.order.length; i++) {
      var p = snap.order[i], c = capitalNow(p.cap);
      if (!c || seen.has(p.id + "|" + c[1] + "|" + c[2])) continue;
      seen.add(p.id + "|" + c[1] + "|" + c[2]);
      var pt = projectLL(c[1], c[2]);
      if (pt && pt[2] >= 0.25) out.push({ pt: pt, name: capitalName(c), id: p.id, cap: p.cap, city: cityNear(c[1], c[2], c[0]) });
    }
    return out;
  }
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
    { size: 10.8, font: "400 ", ls: 0, ink: "town", halo: 2 }
  ];
  function placeOne(placed, p, name, k, kind, held, ref) {
    if (!(kind === 0 ? layers.capitals : layers.cities)) return false;
    var st = CITY_STYLE[kind], size = st.size * (k > 1 ? 1.05 : 1);
    var rm = kind === 0 ? 4.3 * k : (kind === 1 ? 2.85 : 2.4) * k, h = size * 0.86, gap = rm + 3;
    var mark = held ? null : { x: p[0] - rm, y: p[1] - rm, w: 2 * rm, h: 2 * rm };
    if (mark && (!insideView(mark) || collides(placed, mark))) return false;
    ctx.font = st.font + size.toFixed(2) + "px " + SERIF;
    ctx.letterSpacing = st.ls + "px";
    var w = ctx.measureText(name).width;
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
      var lab = { name: name, x: p[0], y: p[1], size: size, kind: ["capital", "city", "town"][kind], box: box, ref: ref || null }, city = ref && ref.city;
      if (city) { lab.id = city.id; lab.qid = city.qid; lab.lon = city.lon; lab.lat = city.lat; }
      placedLabels.push(lab);
      return true;
    }
    return false;
  }
  function drawPlaces(placed, S) {
    if (S < 230) return;
    var k = markSize(S), modernNow = current && current.modern, i;
    ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    var capCity = new Set();
    if (current) {
      var caps = capitalList(current, S);
      for (i = 0; i < caps.length; i++) {
        placeOne(placed, caps[i].pt, caps[i].name, k, 0, false, { cap: caps[i].cap, of: caps[i].id, city: caps[i].city });
        if (layers.capitals && caps[i].city) capCity.add(caps[i].city);
      }
    }
    if (cities) {
      var top = cityTier(S), list = cityRanked(now);
      if (top >= 4) loadMinorCities();
      for (i = 0; i < list.length; i++) {
        if (list[i].tier > top) break;
        var c = list[i].c;
        if (capCity.has(c)) continue;
        var p = projectLL(c.lon, c.lat);
        if (p && p[2] >= 0.25) placeOne(placed, p, namedAt(c.steps, c.name, now), k, list[i].tier <= 1 ? 1 : 2, false, { city: c });
      }
    }
    ctx.letterSpacing = "0px";
    ctx.textAlign = "center";
  }

  var DIV_FROM = 620, DIV_NAMES_FROM = 1250, DIV_FIRST_YEAR = 1700;
  var divIndex = null, divIndexLoad = null, divClick = null, divShown = "";
  function divDay() {
    if (current && current.modern) return Math.min(dayOfTime(now), modern.toDay);
    if (now < DIV_FIRST_YEAR) return null;
    return dayOfTime(Math.floor(now) + 0.5);
  }
  function divBoxCap(b) {
    var X = [], Y = [], Z = [], sx = 0, sy = 0, sz = 0;
    for (var i = 0; i <= 4; i++) for (var j = 0; j <= 4; j++) {
      var v = toVec(b[0] + (b[2] - b[0]) * i / 4, b[1] + (b[3] - b[1]) * j / 4);
      X.push(v[0]); Y.push(v[1]); Z.push(v[2]); sx += v[0]; sy += v[1]; sz += v[2];
    }
    return capOf(X, Y, Z, X.length, sx, sy, sz);
  }
  function divInView(c) {
    if (flat) return featureInFlat(c);
    if (!featureInFront(c)) return false;
    var theta = Math.acos(Math.max(-1, Math.min(1, c.cx * B.cx + c.cy * B.cy + c.cz * B.cz)));
    return theta <= c.radius || B.r * Math.sin(Math.min(HALF_PI, theta - c.radius)) < Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 20;
  }
  function divLoadIndex() {
    if (!divIndexLoad) divIndexLoad = fetchJSON("data/divisions.json").then(function (d) {
      divIndex = d.regions.map(function (r) { return { key: r[0], names: r[1], first: r[2], last: r[3], cap: divBoxCap(r[4]), file: "data/" + r[5], data: null, load: null }; });
      scheduleRender();
    }).catch(function (e) { console.warn("divisions", e); });
    return divIndexLoad;
  }
  function divLoad(reg) {
    if (!reg.load) reg.load = fetchJSON(reg.file).then(function (d) {
      reg.data = { rows: d.rows, labels: d.labels, topo: d.topo, geoms: d.topo.objects.d.geometries, feats: [], arcs: [], states: new Map() };
      scheduleRender();
      return reg;
    }).catch(function (e) { reg.load = null; console.warn("divisions", reg.key, e); });
    return reg.load;
  }
  function divRegions(day, needView) {
    if (!divIndex) { divLoadIndex(); return []; }
    var out = [];
    for (var i = 0; i < divIndex.length; i++) {
      var reg = divIndex[i];
      if (day < reg.first || (reg.last !== null && day > reg.last)) continue;
      if (needView && !divInView(reg.cap)) continue;
      if (!reg.data) { divLoad(reg); continue; }
      out.push(reg);
    }
    return out;
  }
  function divState(reg, day) {
    var D = reg.data, idx = [];
    for (var i = 0; i < D.rows.length; i++) { var r = D.rows[i]; if (r[1] <= day && (r[2] === null || day <= r[2])) idx.push(i); }
    var key = idx.join(","), st = D.states.get(key);
    if (st) return st;
    var owner = new Map(), lines = [];
    var walk = function (g, a) {
      if (typeof a === "number") {
        var j = a < 0 ? ~a : a, o = owner.get(j);
        if (o === undefined) owner.set(j, g); else if (o !== g && o !== -1) { owner.set(j, -1); lines.push(divArc(D, j)); }
        return;
      }
      for (var m = 0; m < a.length; m++) walk(g, a[m]);
    };
    idx.forEach(function (i) { var g = D.rows[i][3]; if (D.geoms[g].arcs) walk(g, D.geoms[g].arcs); });
    st = {
      rows: idx.slice().sort(function (a, b) { return D.labels[D.rows[b][3]][4] - D.labels[D.rows[a][3]][4]; }),
      lines: lines,
      inside: new Map()
    };
    D.states.set(key, st);
    if (D.states.size > 64) D.states.delete(D.states.keys().next().value);
    return st;
  }
  function divArc(D, j) {
    var a = D.arcs[j];
    if (!a) a = D.arcs[j] = prepareArc(topojson.feature(D.topo, { type: "LineString", arcs: [j] }).geometry.coordinates);
    return a;
  }
  function divFeat(reg, g) {
    var D = reg.data, f = D.feats[g];
    if (!f) { var geo = topojson.feature(D.topo, D.geoms[g]); f = D.feats[g] = { geo: geo, bounds: d3.geoBounds(geo) }; }
    return f;
  }
  function divCountry(reg, snap) {
    var out = [];
    for (var i = 0; i < snap.polys.length; i++) { var p = snap.polys[i]; if (p && reg.names.indexOf(polityName(p.id)) >= 0) out.push(i); }
    return out;
  }
  var divDrawn = false;
  function drawDivisionLines(snap, L, landPath, S) {
    divDrawn = false;
    if (!layers.subdivisions || S < DIV_FROM) return;
    var day = divDay();
    if (day === null) return;
    var regs = divRegions(day, true), w = 0.65 + 0.35 * lineWeight(S), clipped = false;
    for (var r = 0; r < regs.length; r++) {
      var st = divState(regs[r], day), own = divCountry(regs[r], snap);
      if (!st.lines.length || !own.length) continue;
      var shape = new Path2D();
      for (var i = 0; i < own.length; i++) traceAll(shape, L.feats[own[i]]);
      if (!clipped) { ctx.save(); ctx.clip(landPath); clipped = true; }
      ctx.save();
      ctx.clip(shape);
      ctx.beginPath(); traceArcs(ctx, st.lines);
      ctx.setLineDash([w * 4.2, w * 2.6]);
      ctx.lineWidth = w; ctx.lineCap = "butt"; ctx.strokeStyle = pal.division; ctx.stroke();
      divDrawn = true;
      ctx.restore();
    }
    if (clipped) ctx.restore();
  }
  function divInsideCountry(reg, st, ri, lab) {
    var hit = st.inside.get(ri + "|" + current.key);
    if (hit !== undefined) return hit;
    var L = level(current, "hi"), own = divCountry(reg, current), ll = [lab[0], lab[1]];
    hit = false;
    for (var i = 0; i < own.length && !hit; i++) hit = inBounds(L.bounds[own[i]], ll) && d3.geoContains(L.geo[own[i]], ll);
    st.inside.set(ri + "|" + current.key, hit);
    return hit;
  }
  var divMeasure = new Map(), divLayout = { key: "", items: [] };
  function divText(name, f) {
    var key = name + "|" + f.toFixed(1), hit = divMeasure.get(key);
    if (hit) return hit;
    var text = name.toUpperCase(), opts = [{ lines: [text], w: ctx.measureText(text).width }];
    for (var c = text.indexOf(" "); c > 0; c = text.indexOf(" ", c + 1)) {
      var a = text.slice(0, c), b = text.slice(c + 1);
      opts.push({ lines: [a, b], w: Math.max(ctx.measureText(a).width, ctx.measureText(b).width) });
    }
    hit = opts.slice(1).sort(function (x, y) { return x.w - y.w; });
    hit.unshift(opts[0]);
    if (divMeasure.size > 4000) divMeasure.clear();
    divMeasure.set(key, hit);
    return hit;
  }
  function layoutDivisionLabels(regs, day, placed, kp) {
    var items = [];
    for (var r = 0; r < regs.length; r++) {
      var reg = regs[r], D = reg.data, st = divState(reg, day);
      for (var k = 0; k < st.rows.length; k++) {
        var row = D.rows[st.rows[k]], lab = D.labels[row[3]];
        if (!lab || Math.max(lab[2], lab[6]) * kp < 7) continue;
        var f = Math.round(2 * Math.max(8, Math.min(11, 7 + Math.max(lab[2], lab[6]) * kp / 14))) / 2, sp = f * 0.2, lh = f * 1.15;
        ctx.font = "400 " + f.toFixed(1) + "px " + SERIF;
        ctx.letterSpacing = sp.toFixed(2) + "px";
        var opts = divText(row[0], f), got = null;
        for (var c = 0; c < 2 && !got; c++) {
          var lon = c ? lab[5] : lab[0], rad = (c ? lab[6] : lab[2]) * kp, half = (c ? lab[7] : lab[3]) * kp * 0.95;
          for (var q = 0; q < Math.min(2, opts.length) && !got; q++) {
            var o = opts[q], hh = f * 0.62 + lh * (o.lines.length - 1) / 2;
            if (o.w / 2 > half || hh > rad * 0.8) continue;
            var p = projectLL(lon, lab[1]);
            if (!p || p[2] < 0.3) break;
            got = { p: p, o: o, hh: hh };
          }
        }
        if (!got || !divInsideCountry(reg, st, st.rows[k], lab)) continue;
        var box = mkBox(got.p[0], got.p[1], got.o.w / 2 + 1.5, got.hh + 1, 0);
        if (!insideView(box) || collides(placed, box)) continue;
        placed.push(box);
        items.push({ name: row[0], x: got.p[0], y: got.p[1], f: f, sp: sp, lh: lh, lines: got.o.lines, box: box });
      }
    }
    return items;
  }
  function drawDivisionLabels(placed, S) {
    if (!layers.subdivisions || S < DIV_NAMES_FROM) return;
    var day = divDay();
    if (day === null) return;
    var regs = divRegions(day, true), sig = 0;
    for (var i = 0; i < placed.length; i++) sig = (sig * 31 + Math.round(placed[i].x * 7 + placed[i].y * 13 + placed[i].w)) % 1000000007;
    var key = [current.key, day, regs.map(function (r) { return r.key; }).join(), view.lon.toFixed(5), view.lat.toFixed(5), view.zoom.toFixed(5), flat ? 1 : 0, W, H, placed.length, sig].join("|");
    if (key !== divLayout.key) divLayout = { key: key, items: layoutDivisionLabels(regs, day, placed.slice(), kmPx()) };
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    ctx.lineWidth = 2.2; ctx.strokeStyle = pal["city-halo"]; ctx.fillStyle = pal["division-label"];
    for (var k = 0; k < divLayout.items.length; k++) {
      var it = divLayout.items[k];
      placed.push(it.box);
      placedLabels.push({ name: it.name, x: it.x, y: it.y, size: it.f, kind: "division", box: it.box });
      ctx.font = "400 " + it.f.toFixed(1) + "px " + SERIF;
      ctx.letterSpacing = it.sp.toFixed(2) + "px";
      for (var j = 0; j < it.lines.length; j++) {
        var ly = it.y + (j - (it.lines.length - 1) / 2) * it.lh;
        ctx.strokeText(it.lines[j], it.x + it.sp / 2, ly);
        ctx.fillText(it.lines[j], it.x + it.sp / 2, ly);
      }
    }
    ctx.letterSpacing = "0px";
  }
  function divisionAt(ll, id) {
    var day = divDay();
    if (!ll || id < 0 || day === null || !current) return null;
    var name = polityName(id), L = level(current, "hi"), inside = false;
    for (var i = 0; i < current.polys.length && !inside; i++) {
      var p = current.polys[i];
      if (p && p.id === id) inside = inBounds(L.bounds[i], ll) && d3.geoContains(L.geo[i], ll);
    }
    if (!inside) return null;
    if (!divIndex) { divLoadIndex(); return null; }
    for (var r = 0; r < divIndex.length; r++) {
      var reg = divIndex[r];
      if (reg.names.indexOf(name) < 0 || day < reg.first || (reg.last !== null && day > reg.last)) continue;
      if (!reg.data) { divLoad(reg); continue; }
      var D = reg.data, st = divState(reg, day);
      for (var k = 0; k < st.rows.length; k++) {
        var row = D.rows[st.rows[k]], f = divFeat(reg, row[3]);
        if (inBounds(f.bounds, ll) && d3.geoContains(f.geo, ll)) return row[0];
      }
    }
    return null;
  }
  var divCardKey = "";
  function syncCardDivision() {
    var el = $("card-div");
    if (!el) return;
    var key = [card.hidden ? 0 : 1, layers.subdivisions ? 1 : 0, selected, divClick ? divClick.join() : "", divDay(), current ? current.key : "", divIndex ? divIndex.filter(function (r) { return r.data; }).length : -1].join("|");
    if (key === divCardKey) return;
    divCardKey = key;
    var name = !card.hidden && layers.subdivisions ? divisionAt(divClick, selected) : null;
    var text = name ? "The place clicked is in " + name + "." : "";
    if (text === divShown) return;
    divShown = text;
    el.textContent = text;
    el.hidden = !text;
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
    var lg = landGeoAt();
    if (lg && !d3.geoContains(lg, ll)) return null;
    var L = level(current, "hi"), best = null, bestA = Infinity;
    for (var i = 0; i < current.polys.length; i++) {
      var p = current.polys[i];
      if (!p || !inBounds(L.bounds[i], ll)) continue;
      if (L.area[i] < bestA && d3.geoContains(L.geo[i], ll)) { best = p; bestA = L.area[i]; }
    }
    return best || polityNear(L, ll);
  }
  function polityNear(L, ll) {
    var k = Math.max(0.2, Math.cos(ll[1] * D2R));
    for (var r = 0.06; r <= 0.19; r += 0.06) {
      var hits = new Map(), top = null;
      for (var a = 0; a < 8; a++) {
        var q = [ll[0] + r * Math.cos(a * Math.PI / 4) / k, ll[1] + r * Math.sin(a * Math.PI / 4)];
        for (var i = 0; i < current.polys.length; i++) {
          var p = current.polys[i];
          if (!p || !inBounds(L.bounds[i], q) || !d3.geoContains(L.geo[i], q)) continue;
          hits.set(p, (hits.get(p) || 0) + 1);
          if (!top || hits.get(p) > hits.get(top)) top = p;
          break;
        }
      }
      if (top) return top;
    }
    return null;
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
      var town = cityAt(e.clientX, e.clientY, e.pointerType !== "mouse");
      divClick = town ? null : lonLatAt(e.clientX, e.clientY);
      var p = town ? null : polityAt(e.clientX, e.clientY);
      if (town) openCity(town); else select(p ? p.id : -1);
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
      var town = cityAt(hoverXY[0], hoverXY[1], false);
      if (town) { setHover(-1); canvas.classList.add("is-over"); showCityTip(hoverXY[0], hoverXY[1], town); return; }
      var p = polityAt(hoverXY[0], hoverXY[1]);
      setHover(p ? p.id : -1);
      canvas.classList.toggle("is-over", !!p);
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
  function claimNames(ids) {
    var n = ids.map(polityName);
    return n.length < 3 ? n.join(" and ") : n.slice(0, -1).join(", ") + ", and " + n[n.length - 1];
  }
  var stripeCache = new Map();
  function stripes(cols) {
    var key = cols.join("|") + "|" + pal.colors.join(","), p = stripeCache.get(key);
    if (p) return p;
    var B = 12, cv = document.createElement("canvas");
    cv.width = B * cols.length; cv.height = 2;
    var g = cv.getContext("2d");
    cols.forEach(function (col, i) { g.fillStyle = pal.colors[col]; g.fillRect(i * B, 0, B, 2); });
    p = ctx.createPattern(cv, "repeat");
    if (p && p.setTransform && window.DOMMatrix) p.setTransform(new DOMMatrix().rotateSelf(45).scaleSelf(0.5));
    stripeCache.set(key, p);
    return p;
  }
  var TIP_ICONS = {
    flag: '<path d="M4 14.2V2.2" /><path d="M4 2.9c1.9-1 3.5.9 5.4 0s3.2-.8 4.2-.2v6c-1-.6-2.3-.7-4.2.2s-3.5-1-5.4 0" />',
    region: '<path stroke-dasharray="0.1 2.3" d="M2.2 6.2L5.6 2.4l4.1 1.6 3.9-.6.7 4.6-2.2 2.5.6 3.6-4.6-.6-3.4 1.2-1.4-4.4z" />',
    city: '<path d="M1.8 14h12.4M3 14V8.2h3V14M6 14V3.6h4V14M10 14V6.8h3.2V14" /><path d="M7.4 6v.1M8.6 6v.1M7.4 8.4v.1M8.6 8.4v.1M7.4 10.8v.1M8.6 10.8v.1M4.5 10.4v.1M11.6 9.2v.1M11.6 11.4v.1" />'
  };
  function setTip(icon, text) {
    tip.textContent = "";
    tip.classList.toggle("has-ico", !!icon);
    if (icon) {
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "ch-tip-ico");
      svg.setAttribute("viewBox", "0 0 16 16");
      svg.setAttribute("aria-hidden", "true");
      svg.innerHTML = TIP_ICONS[icon];
      tip.appendChild(svg);
    }
    tip.appendChild(document.createTextNode(text));
  }
  function showTip(x, y, p) {
    var dv = layers.subdivisions ? divisionAt(lonLatAt(x, y), p.id) : null;
    setTip(dv ? "region" : p.people ? null : "flag", dv ? dv + ", " + polityName(p.id) : polityName(p.id));
    var sub = p.claims ? (polityName(p.id) === "Disputed land" ? "between " : "disputed between ") + claimNames(p.claims) + (p.ruler >= 0 ? ", held by " + polityName(p.ruler) : "") : p.ruler >= 0 ? "held by " + polityName(p.ruler) + (p.member >= 0 && p.member !== p.id ? ", in the " + polityName(p.member) : "") : p.member >= 0 && p.member !== p.id ? "in the " + polityName(p.member) : p.band ? "bands with no fixed borders" : p.people ? "a people or culture" : "";
    if (sub) { var s = document.createElement("small"); s.textContent = sub; tip.appendChild(s); }
    tip.hidden = false;
    var w = tip.offsetWidth;
    tip.style.left = (x + 14 + w > W - 8 ? x - w - 28 : x) + "px";
    tip.style.top = y + "px";
  }
  function hideTip() { tip.hidden = true; }
  function cityAt(x, y, touch) {
    var best = null, bestD = Infinity, pad = touch ? 8 : 3;
    for (var i = 0; i < placedLabels.length; i++) {
      var l = placedLabels[i];
      if (!l.ref || (l.kind !== "capital" && l.kind !== "city" && l.kind !== "town")) continue;
      var d = Math.hypot(x - l.x, y - l.y), b = l.box;
      var onMark = d <= (l.kind === "capital" ? 5 : 3.5) + pad;
      var onName = x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad;
      if ((onMark || onName) && d < bestD) { best = l; bestD = d; }
    }
    return best;
  }
  function showCityTip(x, y, l) {
    var ref = cityRef(l), c = cityFacts(ref), st = cityState(ref);
    setTip("city", st ? c.name + ", " + polityName(st.id) : c.name);
    var sub = c.modern !== c.name ? "now " + c.modern : l.kind === "capital" ? "a capital" : "";
    if (sub) { var s = document.createElement("small"); s.textContent = sub; tip.appendChild(s); }
    tip.hidden = false;
    var w = tip.offsetWidth;
    tip.style.left = (x + 14 + w > W - 8 ? x - w - 28 : x) + "px";
    tip.style.top = y + "px";
  }

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

  var KNOTS = [[-3000, 0], [-500, 0.12], [500, 0.22], [1200, 0.31], [1400, 0.37], [1800, 0.53], [1886, 0.6], [LAST_YEAR + 1, 1]];
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
  var range = $("range"), yearInput = $("year-input"), asof = { textContent: "" };
  range.max = String(RANGE_MAX);
  function trackWidth() { return Math.max(1, $("ticks").getBoundingClientRect().width); }
  var points = [];
  function buildPoints() {
    points = maps.map(function (m) { return m.y; });
    if (modern) modern.changes.forEach(function (d) { points.push(timeOfDay(d)); });
    if (dated) dated.changes.forEach(function (y) { points.push(y); });
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
    datedTicks = dated ? dated.changes.map(function (y) { return add(y, "is-change"); }) : [];
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
  var changeTicks = [], nowTick = null, datedTicks = [];
  function markCurrentTick() {
    maps.forEach(function (m) { if (m.tick) m.tick.classList.toggle("is-now", !!current && m.snap === current); });
    var t = current && current.modern ? changeTicks[changeBefore(Math.min(dayOfTime(now), modern.toDay))] || null : current && current.dated ? datedTicks[datedChangeBefore(Math.round(now))] || null : null;
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
    } else if (isDated(now)) {
      var dc = dated.changes[datedChangeBefore(Math.round(now))];
      asof.textContent = !current || !current.dated || wantKey !== "e" + Math.round(now) ? "Loading the borders" : "Borders since " + fmtYear(dc);
    } else {
      var m = maps[mapIndexFor(now)];
      asof.textContent = !current || current.year !== m.y ? "Loading the map of " + fmtYear(m.y) : "Borders from the map of " + fmtYear(m.y);
    }
    markCurrentTick();
    syncKey();
  }
  function useSnap(snap) {
    if (current === snap) return;
    current = snap;
    if (selected >= 0 || selCity) renderCard();
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
    if (isDated(t)) {
      var ck = chunkIndexFor(t);
      wantKey = "e" + t;
      syncTime();
      loadChunk(ck).then(function () {
        if (wantKey !== "e" + t) return;
        useSnap(datedSnap(ck, t));
        syncTime();
        writeHash();
        scheduleRender();
        if (ck > 0) loadChunk(ck - 1).catch(function () {});
        if (ck < dated.chunks.length - 1) loadChunk(ck + 1).catch(function () {});
      }).catch(function (e) {
        console.warn("dated", e);
        asof.textContent = "The borders of " + fmtYear(t) + " could not be loaded";
      });
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

  var PLAY = { yearlyFrom: 1200, map: 1400, year: 250, yearChange: 700, month: 60, monthChange: 400, load: 100 };
  var playTimer = 0, playMode = "";
  function playEnd() { return modern ? monthTime(2019, 12) : maps[maps.length - 1].y; }
  function playNext(t) {
    if (isModern(t)) {
      var d = dateOfDay(dayOfTime(t)), y = d[0], m = d[1] + 1;
      if (m > 12) { m = 1; y++; }
      return monthTime(y, m);
    }
    if (t < PLAY.yearlyFrom) {
      var mi = mapIndexFor(t);
      return mi < maps.length - 1 ? Math.min(maps[mi + 1].y, PLAY.yearlyFrom) : PLAY.yearlyFrom;
    }
    var next = Math.round(t) + 1;
    return modern && next >= 1886 ? monthTime(1886, 1) : next;
  }
  function changedBetween(a, b) {
    if (isModern(a) !== isModern(b)) return true;
    for (var i = 0; i < points.length; i++) if (points[i] > a + 1e-6 && points[i] <= b + 1e-6) return true;
    return false;
  }
  function playWait(from, to) {
    var changed = changedBetween(from, to);
    if (isModern(to)) return changed ? PLAY.monthChange : PLAY.month;
    if (to <= PLAY.yearlyFrom) return PLAY.map;
    return changed ? PLAY.yearChange : PLAY.year;
  }
  function playLoaded() { return isModern(now) || (isDated(now) ? !!current && !!current.dated && wantKey === "e" + Math.round(now) : maps[mapIndexFor(now)].snap === current); }
  function playStep() {
    if (!playLoaded()) return PLAY.load;
    var from = now, to = playNext(now);
    if (to > playEnd() + 1e-9) return -1;
    setTime(to);
    return playWait(from, to);
  }
  function playDelay(ms) { return playMode === "fast" ? ms / 2 : ms; }
  function syncPlayButtons() {
    syncSearch();
    [["play", "normal", "Play through time"], ["play-fast", "fast", "Play at double speed"]].forEach(function (b) {
      var on = playMode === b[1];
      $(b[0]).setAttribute("aria-pressed", on ? "true" : "false");
      $(b[0]).setAttribute("aria-label", on ? "Pause" : b[2]);
    });
  }
  function startPlay(fast) {
    var mode = fast ? "fast" : "normal";
    if (playTimer) { playMode = mode; syncPlayButtons(); return; }
    if (now >= playEnd() - 1e-9) setTime(maps[0].y);
    playMode = mode;
    syncPlayButtons();
    var tick = function () {
      var wait = playStep();
      if (wait < 0) stopPlay(); else playTimer = setTimeout(tick, playDelay(wait));
    };
    playTimer = setTimeout(tick, playDelay(isModern(now) ? PLAY.monthChange : now < PLAY.yearlyFrom ? PLAY.map : PLAY.yearChange));
  }
  function stopPlay() {
    if (!playTimer) return;
    clearTimeout(playTimer); playTimer = 0; playMode = "";
    syncPlayButtons();
  }
  function togglePlay(fast) { if (playMode === (fast ? "fast" : "normal")) stopPlay(); else startPlay(fast); }
  $("play").addEventListener("click", function () { togglePlay(false); });
  $("play-fast").addEventListener("click", function () { togglePlay(true); });

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
  var BLURB_URL = "https://kigvciyyjlgjcgnwgrwf.supabase.co/functions/v1/chronia-blurb", BLURB_WAIT = 28000, BLURB_PEEK = 700;
  var blurbCache = new Map(), blurbTimer = 0, selCity = null, cardClick = false;
  function select(id) {
    if (id < 0) { closeCard(); return; }
    selected = id;
    selCity = null;
    cardClick = true;
    card.hidden = false;
    renderCard();
    if (phoneQuery.matches) layout();
    scheduleRender();
  }
  function closeCard() {
    selected = -1;
    selCity = null;
    clearTimeout(blurbTimer);
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
  var STATUS = ["State", "Colony", "Protectorate", "Mandate", "Occupied territory", "Dependency", "Disputed land"];
  var STATUS_ASK = ["state", "colony", "protectorate", "mandate", "occupied", "dependency"];
  function isoDay(day) {
    var d = dateOfDay(day);
    return d[0] + "-" + (d[1] < 10 ? "0" : "") + d[1] + "-" + (d[2] < 10 ? "0" : "") + d[2];
  }
  function askYear() {
    return Math.max(-3000, Math.min(2026, isModern(now) ? dateOfDay(dayOfTime(now))[0] : Math.round(now) || 1));
  }
  function cityRef(l) {
    var r = l.ref, city = r.city || null;
    var at = r.cap ? capitalNow(r.cap) || (city ? null : capitalAt(r.cap, Math.min(dayOfTime(now), modern.toDay))) : null;
    if (!at) return { lon: city.lon, lat: city.lat, modern: city.name, names: city.steps, since: city.since, of: -1, kind: l.kind };
    if (city) return { lon: at[1], lat: at[2], modern: city.name, names: city.steps, since: city.since, of: r.of, kind: l.kind };
    return { lon: at[1], lat: at[2], modern: at[0], names: null, since: null, of: r.of, kind: l.kind };
  }
  function cityFacts(c) {
    var modernNow = !!(current && current.modern), day = modernNow ? Math.min(dayOfTime(now), modern.toDay) : Math.round(now);
    return { name: namedAt(c.names, c.modern, now), modern: c.modern, day: day, modernNow: modernNow, early: c.since != null && now < c.since };
  }
  function cityState(c) {
    if (!current) return null;
    if (c.of >= 0 && current.byId.has(c.of)) {
      var own = current.byId.get(c.of);
      var at = capitalNow(own.cap);
      if (at && Math.abs(at[1] - c.lon) < 0.05 && Math.abs(at[2] - c.lat) < 0.05) return own;
    }
    var pt = projectLL(c.lon, c.lat);
    if (!pt) return null;
    var tries = [[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4], [7, 7], [-7, 7], [7, -7], [-7, -7], [10, 0], [-10, 0], [0, 10], [0, -10]];
    for (var i = 0; i < tries.length; i++) {
      var p = polityAt(pt[0] + tries[i][0], pt[1] + tries[i][1]);
      if (p) return p;
    }
    return null;
  }
  function openCity(l) {
    selected = -1;
    selCity = cityRef(l);
    cardClick = true;
    card.hidden = false;
    renderCard();
    if (phoneQuery.matches) layout();
    scheduleRender();
  }
  function renderCityCard(click) {
    var c = selCity, f = cityFacts(c), p = cityState(c);
    var datedNow = !!(current && current.dated), on = datedNow ? " in " : " on ";
    var when = f.modernNow ? fmtDay(f.day) : datedNow ? fmtYear(Math.round(now)) : current ? "the map of " + fmtYear(current.year) : fmtNow(now);
    var capAt = p ? capitalNow(p.cap) : null, isCap = !!(capAt && Math.abs(capAt[1] - c.lon) < 0.05 && Math.abs(capAt[2] - c.lat) < 0.05);
    $("card-kind").textContent = isCap ? "Capital" : c.place ? "Place" : c.kind === "town" ? "Town" : "City";
    $("card-name").textContent = f.name;
    var facts = $("card-facts");
    facts.textContent = "";
    var addText = function (t) { facts.appendChild(document.createTextNode(t)); };
    if (f.modern && f.modern !== f.name) addText("Now " + f.modern + ". ");
    if (f.early) addText("Not yet founded" + on + when + ". ");
    else if (p) {
      addText(isCap ? "Capital of " : "In ");
      facts.appendChild(polityButton(p.id));
      addText(on + when + ".");
    } else addText("In no state" + on + when + ".");
    var y = askYear();
    loadWiki(f.modern || f.name, f.modern && f.modern !== f.name ? f.name : f.modern || f.name, {
      ask: { kind: "city", name: f.name, modern: f.modern || "", lon: c.lon, lat: c.lat, state: p ? polityName(p.id) : "", capital: isCap, year: y },
      label: f.name, when: fmtYear(y), click: click
    }, [c.lon, c.lat]);
  }
  function renderCard() {
    var click = cardClick;
    cardClick = false;
    if (selCity) { renderCityCard(click); return; }
    if (selected < 0 || !catalogue[selected]) return;
    var e = catalogue[selected], p = current ? current.byId.get(selected) : null;
    var modernNow = !!(current && current.modern), datedNow = !!(current && current.dated);
    var when = modernNow ? fmtDay(Math.min(dayOfTime(now), modern.toDay)) : datedNow ? fmtYear(Math.round(now)) : current ? "the map of " + fmtYear(current.year) : fmtNow(now);
    var whenYear = modernNow ? dateOfDay(dayOfTime(now))[0] : datedNow ? Math.round(now) : current ? current.year : Math.round(now);
    $("card-kind").textContent = e[4] ? "People or culture" : p && p.status > 0 ? STATUS[p.status] : p && p.ruler >= 0 ? "Dependency" : "State";
    $("card-name").textContent = e[0];
    var facts = $("card-facts");
    facts.textContent = "";
    var addText = function (t) { facts.appendChild(document.createTextNode(t)); };
    var addPolity = function (id) { if (current.byId.has(id)) facts.appendChild(polityButton(id)); else addText(polityName(id)); };
    if (p) {
      if (p.claims) {
        addText("Disputed between ");
        p.claims.forEach(function (c, k) { if (k) addText(k === p.claims.length - 1 ? (p.claims.length > 2 ? ", and " : " and ") : ", "); addPolity(c); });
        addText((datedNow ? " in " : " on ") + when + ". ");
      }
      if (p.ruler >= 0) {
        addText("Held by "); addPolity(p.ruler);
        addText((datedNow ? " in " : " on ") + when + ". ");
      }
      if (p.part >= 0 && p.part !== p.ruler) { addText("Part of "); addPolity(p.part); addText(". "); }
      var capNow = capitalNow(p.cap);
      if (capNow) addText("Capital: " + capitalName(capNow) + ". ");
      if (modernNow) {
        addText(p.end < 0 ? "These borders since " + fmtDay(p.start) + ". " : "These borders from " + fmtDay(p.start) + " to " + fmtDay(p.end) + ". ");
      } else if (datedNow) {
        addText(p.start === p.end ? "These borders in " + fmtYear(p.start) + ". " : "These borders from " + fmtYear(p.start) + " to " + fmtYear(p.end) + ". ");
      }
    } else {
      addText("Not on the map " + (modernNow ? "on " : datedNow ? "in " : "of ") + (modernNow || datedNow ? when : current ? fmtYear(current.year) : fmtNow(now)) + ". ");
    }
    var ys = e[2], cs = e[5], runs = [];
    [e[6], cs].forEach(function (r) {
      if (!r) return;
      var last = runs[runs.length - 1];
      if (last && r[0] <= last[1] + 1) last[1] = Math.max(last[1], r[1]); else runs.push([r[0], r[1]]);
    });
    if (runs.length) {
      var runText = runs.map(function (r) { return r[0] === r[1] ? "in " + fmtYear(r[0]) : "from " + fmtYear(r[0]) + " to " + (r[1] >= 2019 ? "today" : fmtYear(r[1])); });
      var before = ys.filter(function (y) { return y < runs[0][0]; });
      addText(before.length ? "On the maps from " + fmtYear(before[0]) + ", and continuously " + runText.join(" and ") + "." : "On the map " + runText.join(" and ") + ".");
    } else if (ys.length) {
      if (ys.length <= 4) addText("On the maps of " + listYears(ys) + ".");
      else addText("On " + ys.length + " maps, from " + fmtYear(ys[0]) + " to " + fmtYear(ys[ys.length - 1]) + ".");
    }
    if (p && p.band) addText(" Bands of hunters, gatherers, or fishers, who ranged over this land without fixed borders.");
    else if (p && p.b <= 1 && !p.people) addText(" Its borders here are approximate.");
    var title = wikiTitle(selected, whenYear), y = askYear();
    loadWiki(e[0], title, {
      ask: {
        kind: "state", name: e[0], wiki: title,
        status: e[4] || (p && p.people) ? "people" : p && p.claims ? "state" : p && p.status > 0 ? STATUS_ASK[p.status] || "dependency" : p && p.ruler >= 0 ? "dependency" : "state",
        ruler: p && p.ruler >= 0 ? polityName(p.ruler) : "",
        partOf: p && p.part >= 0 && p.part !== p.ruler ? polityName(p.part) : "",
        capital: p && capitalNow(p.cap) ? capitalNow(p.cap)[0] : "",
        since: modernNow && p ? isoDay(p.start) : "",
        neighbours: neighbourNames(selected),
        year: y
      },
      label: e[0], when: fmtYear(y), click: click
    });
  }
  function neighbourNames(id) {
    var snap = current;
    if (!snap || !snap.geoms || !snap.geoms.lo) return [];
    if (!snap.nb) snap.nb = topojson.neighbors(snap.geoms.lo);
    var seen = new Set([id]), out = [];
    snap.polys.forEach(function (p, i) {
      if (!p || p.id !== id) return;
      snap.nb[i].forEach(function (j) {
        var q = snap.polys[j];
        if (!q || q.claims || seen.has(q.id) || !polityName(q.id)) return;
        seen.add(q.id);
        out.push({ name: polityName(q.id), w: q.label ? q.label[5] : 0 });
      });
    });
    return out.sort(function (a, b) { return b.w - a.w; }).slice(0, 10).map(function (x) { return x.name; });
  }
  var blurbWriter = new Map();
  function writerName(t) { var m = blurbWriter.get(t) || ""; return /deepseek/i.test(m) ? "DeepSeek" : "Claude"; }
  function blurbFetch(ask, peek) {
    var k = JSON.stringify(ask), have = blurbCache.get(k);
    if (have) return have;
    var ctl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, BLURB_WAIT) : 0;
    var job = fetch(BLURB_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(peek ? Object.assign({ peek: true }, ask) : ask),
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (d && typeof d.text === "string" && d.text && typeof d.model === "string") blurbWriter.set(d.text, d.model);
      return d && typeof d.text === "string" && d.text ? d.text : null;
    }).catch(function () { return null; }).then(function (t) {
      clearTimeout(timer);
      if (!t) blurbCache.delete(k);
      return t;
    });
    if (!peek) blurbCache.set(k, job);
    else job.then(function (t) { if (t && !blurbCache.has(k)) blurbCache.set(k, Promise.resolve(t)); });
    return job;
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
  var WIKI_NEAR_KM = 60;
  function nearPage(d, at) {
    var c = d && d.coordinates;
    if (!c || !isFinite(c.lat) || !isFinite(c.lon)) return null;
    var p1 = c.lat * D2R, p2 = at[1] * D2R, dp = p2 - p1, dl = (at[0] - c.lon) * D2R;
    var h = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h))) <= WIKI_NEAR_KM ? d : null;
  }
  function wikiSearchNear(q, at) {
    var url = "https://en.wikipedia.org/w/api.php?action=query&list=search&srnamespace=0&srlimit=5&format=json&origin=*&srsearch=" + encodeURIComponent(q);
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("wikipedia search " + r.status);
      return r.json();
    }).then(function (d) {
      var hits = (d && d.query && d.query.search) || [], k = 0;
      var next = function () {
        if (k >= hits.length) return null;
        return wikiSummary(hits[k++].title).then(function (s) { return nearPage(s, at) || next(); });
      };
      return next();
    });
  }
  function loadWiki(name, title, blurb, at) {
    var ask = ++wikiAsk, text = $("wiki-text"), img = $("wiki-img"), more = $("wiki-more"), by = $("wiki-by");
    var wiki = null, wikiState = 0, mode = blurb ? "ai" : "wiki";
    var quiet = function (t) { text.className = "ch-wiki-text is-quiet"; text.textContent = t; };
    var paint = function () {
      if (ask !== wikiAsk) return;
      if (wiki) {
        if (wiki.thumbnail && wiki.thumbnail.source && /^https:\/\/upload\.wikimedia\.org\//.test(wiki.thumbnail.source)) {
          img.src = wiki.thumbnail.source; img.hidden = false;
        } else img.hidden = true;
        var href = wiki.content_urls && wiki.content_urls.desktop && wiki.content_urls.desktop.page;
        if (href && /^https:\/\/en\.wikipedia\.org\//.test(href)) {
          $("wiki-link").href = href;
          $("wiki-link").textContent = wiki.title && wiki.title !== name ? "Read “" + wiki.title + "” on Wikipedia" : "Read more on Wikipedia";
          more.hidden = false;
        } else more.hidden = true;
      } else { img.hidden = true; more.hidden = true; }
      if (mode === "ai" || mode === "done") return;
      if (wikiState === 0) quiet("Looking it up on Wikipedia");
      else if (wikiState === 2) quiet("Wikipedia could not be reached.");
      else if (!wiki) quiet(at ? "Wikipedia has no article on this place." : "Wikipedia has no article under this name.");
      else { text.className = "ch-wiki-text"; text.textContent = wiki.extract; }
    };
    var writing = function (job) {
      mode = "ai";
      by.hidden = true;
      quiet("Writing about " + blurb.label + " in " + blurb.when + "…");
      text.classList.add("is-writing");
      job.then(function (t) {
        if (ask !== wikiAsk) return;
        if (t) {
          mode = "done";
          text.className = "ch-wiki-text";
          text.textContent = t;
          by.textContent = "Written by " + writerName(t) + " for this date";
          by.hidden = false;
        } else mode = "wiki";
        paint();
      });
    };
    var offer = function () {
      mode = "offer";
      by.textContent = "";
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ch-wiki-ask";
      b.textContent = "Write about " + blurb.label + " in " + blurb.when;
      b.addEventListener("click", function () { if (ask === wikiAsk) writing(blurbFetch(blurb.ask)); });
      by.appendChild(b);
      by.hidden = false;
    };
    clearTimeout(blurbTimer);
    img.hidden = true; more.hidden = true; by.hidden = true;
    var key = at ? title + "@" + at[0].toFixed(2) + "," + at[1].toFixed(2) : title, job = wikiCache.get(key);
    if (!job) {
      if (at) job = wikiSummary(title).then(function (d) { return nearPage(d, at) || (title !== name ? wikiSummary(name).then(function (e) { return nearPage(e, at); }) : null); }).then(function (d) { return d || wikiSearchNear(name, at); });
      else job = wikiSummary(title).then(function (d) { return d || (title !== name ? wikiSummary(name) : null); }).then(function (d) { return d || wikiSearch(name); });
      wikiCache.set(key, job);
      job.catch(function () { wikiCache.delete(key); });
    }
    job.then(function (d) { wiki = d; wikiState = 1; paint(); }, function () { wikiState = 2; paint(); });
    if (blurb) {
      var have = blurbCache.get(JSON.stringify(blurb.ask));
      if (blurb.click || have) writing(have || blurbFetch(blurb.ask));
      else {
        offer();
        blurbTimer = setTimeout(function () {
          blurbFetch(blurb.ask, true).then(function (t) { if (t && ask === wikiAsk && mode === "offer") writing(Promise.resolve(t)); });
        }, BLURB_PEEK);
      }
    }
    paint();
  }

  var cardApi = {
    cityHitAt: function (x, y, touch) {
      var l = cityAt(x, y, !!touch);
      return l ? { name: l.name, kind: l.kind, x: l.x, y: l.y, box: l.box } : null;
    },
    openCityAt: function (x, y) {
      var l = cityAt(x, y, false);
      if (l) openCity(l);
      return !!l;
    },
    selectedCity: function () { return selCity ? cityFacts(selCity).name : null; },
    card: function () {
      var by = $("wiki-by"), ask = by.querySelector("button");
      return {
        open: !card.hidden,
        kind: $("card-kind").textContent,
        name: $("card-name").textContent,
        facts: $("card-facts").textContent,
        text: $("wiki-text").textContent,
        writing: $("wiki-text").classList.contains("is-writing"),
        by: by.hidden ? "" : by.textContent,
        offer: ask ? ask.textContent : "",
        more: $("wiki-more").hidden ? "" : $("wiki-link").textContent,
        href: $("wiki-more").hidden ? "" : $("wiki-link").href
      };
    }
  };

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
  var layers = { states: true, capitals: true, cities: true, seas: true, water: true, relief: true, grid: true, subdivisions: true };
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
    syncKey();
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
  var searchBtn = $("search-btn"), searchPanel = $("search"), searchInput = $("search-input"), searchList = $("search-list"), searchNone = $("search-none");
  var searchHits = [], searchAt = -1, flyRaf = 0, SEARCH_MAX = 8;
  var SEARCH_ORDER = { State: 0, City: 1, Ocean: 2, Sea: 2, Town: 3, Lake: 4, Marsh: 4, People: 5, Band: 5 };
  function fold(t) { return String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g, "").trim(); }
  function centreOfCoords(coords) { var c = d3.geoCentroid({ type: "MultiPolygon", coordinates: coords }); return [c[0], c[1]]; }
  function searchIndex() {
    var out = [], seen = new Set();
    if (current) current.order.forEach(function (p) {
      if (seen.has(p.id) || p.claims) return;
      seen.add(p.id);
      var name = polityName(p.id);
      if (!name || !p.label) return;
      var sub = p.ruler >= 0 ? "held by " + polityName(p.ruler) : p.member >= 0 && p.member !== p.id ? "in the " + polityName(p.member) : "";
      out.push({ kind: p.band ? "Band" : p.people ? "People" : "State", name: name, sub: sub, w: p.label[5], km2: p.label[5], id: p.id, ll: [p.label[0], p.label[1]] });
    });
    if (cities) cityRanked(now).forEach(function (x) {
      var c = x.c, nm = namedAt(c.steps, c.name, now);
      out.push({ kind: x.tier <= 2 ? "City" : "Town", name: nm, alt: nm !== c.name ? c.name : "", sub: nm !== c.name ? "now " + c.name : "", w: x.pop, city: c, tier: x.tier, ll: [c.lon, c.lat] });
    });
    SEAS.forEach(function (sl) { out.push({ kind: /Ocean/.test(sl.name) ? "Ocean" : "Sea", name: sl.name, ll: [sl.lon, sl.lat], w: 4 - sl.tier, sea: sl.tier }); });
    if (lakes) {
      var lseen = new Set();
      lakesAt().forEach(function (l) {
        if (!l.name || l.km2 < 150 || lseen.has(l.name)) return;
        lseen.add(l.name);
        if (!l.ll && l.coords) l.ll = centreOfCoords(l.coords);
        if (l.ll) out.push({ kind: "Lake", name: l.name, ll: l.ll, w: l.km2, km2: l.km2 });
      });
    }
    marshesNow().forEach(function (m) { out.push({ kind: "Marsh", name: m.name, ll: [(m.b[0] + m.b[2]) / 2, (m.b[1] + m.b[3]) / 2], w: m.km2, km2: m.km2 }); });
    return out;
  }
  function searchScore(q, it) {
    var n = fold(it.name), a = it.alt ? fold(it.alt) : "";
    if (n === q) return 0;
    if (n.indexOf(q) === 0) return 1;
    if (a && (a === q || a.indexOf(q) === 0)) return 1.5;
    if ((" " + n).indexOf(" " + q) >= 0) return 2;
    if (a && (" " + a).indexOf(" " + q) >= 0) return 2.5;
    if (q.length >= 3 && n.indexOf(q) >= 0) return 3;
    return -1;
  }
  function runSearch() {
    var q = fold(searchInput.value);
    searchHits = [];
    if (q) {
      searchIndex().forEach(function (it) { var sc = searchScore(q, it); if (sc >= 0) { it.sc = sc; searchHits.push(it); } });
      searchHits.sort(function (a, b) { return a.sc - b.sc || SEARCH_ORDER[a.kind] - SEARCH_ORDER[b.kind] || b.w - a.w; });
      var dedupe = new Set();
      searchHits = searchHits.filter(function (it) { var k = it.kind + "|" + it.name; if (dedupe.has(k)) return false; dedupe.add(k); return true; }).slice(0, SEARCH_MAX);
    }
    searchAt = searchHits.length ? 0 : -1;
    drawSearchList();
    searchNone.hidden = !q || searchHits.length > 0;
  }
  function drawSearchList() {
    searchList.textContent = "";
    searchHits.forEach(function (it, i) {
      var li = document.createElement("li"), nm = document.createElement("span"), sm = document.createElement("small");
      li.className = "ch-search-hit" + (i === searchAt ? " is-on" : "");
      li.id = "search-hit-" + i;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", i === searchAt ? "true" : "false");
      nm.textContent = it.name;
      sm.textContent = it.kind + (it.sub ? " | " + it.sub : "");
      li.appendChild(nm); li.appendChild(sm);
      li.addEventListener("pointerdown", function (e) { e.preventDefault(); goSearch(it); });
      searchList.appendChild(li);
    });
    searchInput.setAttribute("aria-expanded", searchHits.length ? "true" : "false");
    if (searchAt >= 0) searchInput.setAttribute("aria-activedescendant", "search-hit-" + searchAt); else searchInput.removeAttribute("aria-activedescendant");
  }
  function scaleFor(km2, lo, hi) { return Math.max(lo, Math.min(hi, 0.32 * Math.min(W, H) * R_KM / Math.sqrt(Math.max(1, km2)))); }
  function flyTo(lon, lat, S) {
    stopInertia();
    cancelAnimationFrame(flyRaf);
    var zr = zoomRange(), z1 = Math.max(zr[0], Math.min(zr[1], S / (flat ? baseK : baseR)));
    var a = { lon: view.lon, lat: view.lat, z: view.zoom }, dl = ((lon - a.lon + 540) % 360) - 180;
    if (reduceMotion) { view.lon = a.lon + dl; view.lat = lat; view.zoom = z1; applyView(); nudge(); return; }
    var far = Math.min(1, Math.hypot(dl * Math.cos(lat * D2R), lat - a.lat) / 90), t0 = performance.now(), dur = 700 + 600 * far;
    var step = function (t) {
      var k = Math.min(1, (t - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      view.lon = a.lon + dl * e; view.lat = a.lat + (lat - a.lat) * e;
      view.zoom = a.z * Math.pow(z1 / a.z, e) * Math.pow(0.35, far * 4 * e * (1 - e));
      applyView(); nudge();
      if (k < 1) flyRaf = requestAnimationFrame(step);
    };
    flyRaf = requestAnimationFrame(step);
  }
  function goSearch(it) {
    setSearchOpen(false, false);
    var S = localScale();
    if (it.city) { flyTo(it.ll[0], it.ll[1], Math.max(S, it.tier <= 1 ? 900 : 1500)); openCity({ ref: { city: it.city }, kind: it.tier <= 1 ? "city" : "town" }); return; }
    if (it.id !== undefined) { flyTo(it.ll[0], it.ll[1], scaleFor(it.km2, 200, 6000)); select(it.id); return; }
    if (it.sea) { flyTo(it.ll[0], it.ll[1], it.sea === 1 ? 260 : it.sea === 2 ? 700 : 1700); return; }
    flyTo(it.ll[0], it.ll[1], scaleFor(it.km2, 500, 8000));
  }
  function searchWhen() { return yearInput && yearInput.value ? yearInput.value : ""; }
  function setSearchOpen(open, focusBtn) {
    if (open && playMode) return;
    searchPanel.hidden = !open;
    searchBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      if (!layersPanel.hidden) setLayersOpen(false, false);
      if (about.classList.contains("is-open")) setAbout(false);
      if (cities && !cities.minorLoad) loadMinorCities();
      $("search-when").textContent = searchWhen();
      searchInput.value = "";
      runSearch();
      searchInput.focus();
    } else if (focusBtn) searchBtn.focus();
  }
  function syncSearch() {
    if (!searchBtn) return;
    var busy = !!playMode;
    searchBtn.disabled = busy;
    searchBtn.setAttribute("data-tip", busy ? "Search (pause to search)" : "Search (/)");
    if (busy && !searchPanel.hidden) setSearchOpen(false, false);
  }
  searchBtn.addEventListener("click", function () { setSearchOpen(searchPanel.hidden, false); });
  searchInput.addEventListener("input", runSearch);
  searchInput.addEventListener("keydown", function (e) {
    e.stopPropagation();
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!searchHits.length) return;
      searchAt = (searchAt + (e.key === "ArrowDown" ? 1 : searchHits.length - 1)) % searchHits.length;
      drawSearchList();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (searchAt >= 0) goSearch(searchHits[searchAt]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSearchOpen(false, true);
    }
  });
  document.addEventListener("pointerdown", function (e) {
    if (!searchPanel.hidden && !searchPanel.contains(e.target) && !searchBtn.contains(e.target)) setSearchOpen(false, false);
  });
  document.addEventListener("keydown", function (e) {
    var t = e.target, typing = t && ((t.tagName === "INPUT" && t.type === "text") || t.tagName === "TEXTAREA");
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "/") { e.preventDefault(); setSearchOpen(true, false); }
  });
  syncSearch();
  var layersApi = {
    layers: function () { return Object.assign({}, layers); },
    setLayer: setLayer,
    layersOpen: function () { return !layersPanel.hidden; }
  };

  var STORE_KEY = "chronia-key";
  var keyBtn = $("key-btn"), keyList = $("key-list"), keyState = "";
  var KEY_ROWS = {
    capital: function (s) { return layers.capitals && (!!s.modern || s.dated && s.polys.some(function (p) { return p && !!capitalNow(p.cap); })); },
    city: function () { return layers.cities && !!cities && localScale() >= 230; },
    town: function () { return layers.cities && !!cities && cityTier(localScale()) >= 2; },
    border: function (s) { return s.polys.some(function (p) { return p && !p.soft; }); },
    soft: function (s) { return s.polys.some(function (p) { return p && p.soft; }); },
    dependency: function (s) { return s.polys.some(function (p) { return p && p.ruler >= 0 && !p.claims; }); },
    people: function (s) { return s.polys.some(function (p) { return p && p.people && !p.band; }); },
    band: function (s) { return s.polys.some(function (p) { return p && p.band; }); },
    disputed: function (s) { return s.polys.some(function (p) { return p && p.claims; }); },
    division: function () { return divDrawn; },
    member: function (s) { return s.polys.some(function (p) { return p && p.member >= 0 && p.id !== p.member; }); },
    marsh: function () { return marshDrawn; }
  };
  function syncKey() {
    if (!current) return;
    var shown = Object.keys(KEY_ROWS).filter(function (k) { return KEY_ROWS[k](current); }), state = shown.join(",");
    if (state === keyState) return;
    keyState = state;
    Array.prototype.forEach.call(keyList.children, function (li) { li.hidden = shown.indexOf(li.getAttribute("data-key")) < 0; });
  }
  function setKeyOpen(open, keep) {
    keyList.hidden = !open;
    keyBtn.setAttribute("aria-expanded", open ? "true" : "false");
    keyBtn.setAttribute("aria-label", open ? "Hide the key" : "Show the key");
    if (keep) try { localStorage.setItem(STORE_KEY, open ? "1" : "0"); } catch (e) {}
    scheduleRender();
  }
  var keyOpen = !phoneQuery.matches && window.innerHeight >= 600;
  try { var savedKey = localStorage.getItem(STORE_KEY); if (savedKey === "1" || savedKey === "0") keyOpen = savedKey === "1"; } catch (e) {}
  setKeyOpen(keyOpen, false);
  keyBtn.addEventListener("click", function () { setKeyOpen(keyList.hidden, true); });

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
    else if (e.key === "p" || e.key === "P") togglePlay(e.shiftKey);
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
    playIntro();
    scheduleRender();
  }
  function playIntro() {
    var root = document.documentElement;
    if (root.classList.contains("ch-ready")) return false;
    var play = !reduceMotion;
    if (play) {
      var roll = document.createElement("div");
      roll.className = "ch-roll";
      roll.setAttribute("aria-hidden", "true");
      document.body.appendChild(roll);
      root.classList.add("ch-intro");
      setTimeout(function () { root.classList.remove("ch-intro"); roll.remove(); }, 3000);
    }
    root.classList.add("ch-ready");
    return play;
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
  function buildCoastGrid(list, box) {
    try {
      var cv = document.createElement("canvas"), k = GRID_W / 360, gx = 0, gy = 0, gw = GRID_W, gh = GRID_H;
      if (box) {
        var mg = Math.ceil(2 * COAST_KM * k / 111.195) + 2;
        gx = Math.max(0, Math.floor((box[0] + 180) * k) - mg); gy = Math.max(0, Math.floor((90 - box[3]) * k) - mg);
        gw = Math.min(GRID_W, Math.ceil((box[2] + 180) * k) + mg) - gx; gh = Math.min(GRID_H, Math.ceil((90 - box[1]) * k) + mg) - gy;
      }
      cv.width = gw; cv.height = gh;
      var g = cv.getContext("2d", { willReadFrequently: true });
      g.translate(-gx, -gy);
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
      var px = g.getImageData(0, 0, gw, gh).data, a = box && coastGrid ? coastGrid.a : new Uint8Array(GRID_W * GRID_H);
      for (var yy = 0; yy < gh; yy++) for (var xx = 0; xx < gw; xx++) a[(gy + yy) * GRID_W + gx + xx] = px[(yy * gw + xx) * 4 + 3] > 127 ? 1 : 0;
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
    var reach = (gridTag.indexOf("fine") === 0 ? 0.12 : 1.4) * COAST_KM / 111.195;
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
      fetchJSON("data/eras.json"), fetchJSON("data/land.json"), fetchJSON("data/cities-dated.json").catch(function () { return null; }),
      fetchJSON("data/modern.json")
    ]).then(function (r) {
      var idx = r[0];
      catalogue = idx.polities;
      colourMarks();
      maps = idx.maps.map(function (m) { return { y: m[0], file: "data/" + m[1], snap: null, loading: null }; });
      var md = r[3], from = idx.modern.from.split("-").map(Number), to = idx.modern.to.split("-").map(Number);
      modern = { rows: md.rows, hi: md.hi, lo: md.lo, changes: idx.modern.changes, toDay: dayFromDate(to[0], to[1], to[2]) };
      modern.fromTime = timeOfDay(dayFromDate(from[0], from[1], from[2])) - 0.5 / 365;
      if (idx.dated) {
        dated = { from: idx.dated.from, to: idx.dated.to, changes: idx.dated.changes, chunks: idx.dated.chunks.map(function (c) { return { from: c[0], file: "data/" + c[1], data: null, loading: null }; }) }; PLAY.yearlyFrom = dated.from;
      }
      cities = r[2] ? { ranks: r[2].ranks, rows: prepCities(r[2], false), minorLoad: null } : null;
      buildPoints();
      var t0 = h.y ? parseTime(h.y) : null;
      now = t0 !== null ? t0 : START_YEAR;
      land = { hi: prepLand(r[1].hi), lo: prepLand(r[1].lo) };
      buildCoastGrid(land.lo);
      landGeo = topojson.feature(r[1].lo, r[1].lo.objects.land);
      layout();
      if (isDated(now)) now = Math.round(now);
      var first = isModern(now) ? Promise.resolve(modernSnap(Math.min(dayOfTime(now), modern.toDay))) : isDated(now) ? loadChunk(chunkIndexFor(now)).then(function () { return datedSnap(chunkIndexFor(now), now); }) : loadMap(mapIndexFor(now));
      return first.then(function (snap) {
        current = snap;
        reveal();
        setTime(now);
        fetchJSON(UC + "data/sea.json").then(function (t) {
          var prep = function (topo) { return topojson.feature(topo, topo.objects.deep).features.map(function (f) { return prepare(densify(f)); }); };
          sea = { high: prep(t.high), low: prep(t.low) };
          scheduleRender();
        }).catch(function (e) { console.warn("sea", e); });
        loadGeography();
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
    search: function (q) { setSearchOpen(true, false); searchInput.value = q; runSearch(); return searchHits.map(function (h) { return h.kind + ": " + h.name + (h.sub ? " (" + h.sub + ")" : ""); }); },
    searchOpen: function () { return !searchPanel.hidden; },
    ready: function () { return ready && !!current; },
    year: function () { return now; },
    shown: function () { return yearInput.value; },
    asof: function () { return asof.textContent; },
    playing: function () { return playTimer ? playMode : false; },
    play: function (on, fast) { if (on) startPlay(!!fast); else stopPlay(); },
    keyOpen: function () { return !keyList.hidden; },
    keyRows: function () { return Array.prototype.filter.call(keyList.children, function (li) { return !li.hidden; }).map(function (li) { return li.getAttribute("data-key"); }); },
    setKeyOpen: function (on) { setKeyOpen(on, true); },
    date: function () { return isModern(now) ? hashTime() : null; },
    mapYear: function () { return current ? (current.modern ? "modern" : current.dated ? "dated" : current.year) : null; },
    changes: function () { return points.slice(); },
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
      divClick = null;
      if (p) select(p.id);
      return !!p;
    },
    hitAt: function (x, y) { var p = polityAt(x, y); return p ? polityName(p.id) : null; },
    project: function (lon, lat) { return projectLL(lon, lat); },
    labels: function () { return placedLabels.slice(); },
    cityAt: function (x, y) {
      var best = null, bd = 64;
      for (var i = 0; i < placedLabels.length; i++) {
        var l = placedLabels[i];
        if (l.kind !== "capital" && l.kind !== "city" && l.kind !== "town") continue;
        var b = l.box, inBox = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h, d = (l.x - x) * (l.x - x) + (l.y - y) * (l.y - y);
        if (inBox) d = Math.min(d, 1);
        if (d < bd) { bd = d; best = l; }
      }
      if (!best) return null;
      var c = best.id && cities ? cities.rows.find(function (r) { return r.id === best.id; }) : null;
      return { id: best.id || null, name: best.name, kind: best.kind, qid: best.qid || null, modern: c ? c.name : null, lon: c ? c.lon : null, lat: c ? c.lat : null, pop: c ? Math.round(popAt(c, now) * 1000) : null, since: c ? c.since : null, until: c && c.until !== Infinity ? c.until : null, x: best.x, y: best.y };
    },
    cityCount: function () { return cities ? { loaded: cities.rows.length, alive: cityRanked(now).length, minor: !!cities.minorLoad } : null; },
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
      var t2 = performance.now();
      labelCache.delete("epoch");
      layoutPolities(current, fixedBoxes(), kp);
      return { polities: (t1 - t0) / n, places: (t2 - t1) / n, ground: performance.now() - t2 };
    },
    inland: function (lon, lat) { return inland(lon, lat); },
    labelInfo: function (n) {
      var p = current && current.order.find(function (q) { return polityName(q.id) === n; });
      if (!p || !p.label) return null;
      var G = groundLayout(current, p, n, true), sc = (flat ? FB.k : B.r) / GU;
      return { side: Math.sqrt(p.label[5]) * kmPx(), state: labelState.get(p.id) ? labelState.get(p.id).form : null, cands: G.cands.map(function (c) {
        return { at: planeLL(c.fr, c.forms[0].u, c.forms[0].v).map(function (x) { return +x.toFixed(2); }), forms: c.forms.map(function (f) {
          var q0 = flat ? [0, 0] : screenAt(c.fr, f.u, f.v, 0), q1 = flat ? [Math.cos(f.ang), -Math.sin(f.ang)] : screenAt(c.fr, f.u + Math.cos(f.ang) * 4 / sc, f.v + Math.sin(f.ang) * 4 / sc, 0);
          return [f.oi, +f.ang.toFixed(2), f.tight ? "t" : "n", +(0.88 * f.d * sc).toFixed(1), Math.round(q0[0]), Math.round(q0[1]), +Math.atan2(q1[1] - q0[1], q1[0] - q0[0]).toFixed(2)];
        }) };
      }) };
    }
  };
  Object.assign(window.__chronia, layersApi, geographyApi);
  Object.assign(window.__chronia, cardApi);
  window.__chronia.divisions = function () {
    var day = divDay(), out = { day: day, regions: [] };
    if (divIndex && day !== null) divIndex.forEach(function (reg) {
      if (!reg.data || day < reg.first || (reg.last !== null && day > reg.last)) return;
      var st = divState(reg, day);
      out.regions.push({ key: reg.key, names: st.rows.map(function (i) { return reg.data.rows[i][0]; }), lines: st.lines.length });
    });
    return out;
  };
  window.__chronia.divisionAt = function (x, y) {
    var ll = lonLatAt(x, y), p = polityAt(x, y);
    return p ? divisionAt(ll, p.id) : null;
  };
  window.__chronia.cardDivision = function () { var el = $("card-div"); return el && !el.hidden ? el.textContent : null; };

  start();
})();

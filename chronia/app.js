(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var LANG = window.CH_LANG || "en", L10N = window.CH_L || {}, PL = {};
  var EN = { "@year": "{y}", "@my": "{month} {y}", "@mdy": "{month} {d}, {y}", "{y} BC": "{y} BC", "AD {y}": "AD {y}" };
  function T(s, o) {
    var t = L10N[s];
    if (t == null) t = EN[s] != null ? EN[s] : s;
    return o ? t.replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }) : t;
  }
  function translatePage(root) {
    if (LANG === "en") return;
    var key = function (v) { return v.replace(/\s+/g, " ").trim(); }, walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = [], n;
    while ((n = walker.nextNode())) list.push(n);
    list.forEach(function (t) {
      if (t.parentElement && t.parentElement.closest("script,style,svg,kbd")) return;
      var k = key(t.nodeValue);
      if (k && L10N[k] != null) t.nodeValue = /^\s*/.exec(t.nodeValue)[0] + L10N[k] + /\s*$/.exec(t.nodeValue)[0];
    });
    root.querySelectorAll("[aria-label],[data-tip],[placeholder],[title],[alt]").forEach(function (e) {
      ["aria-label", "data-tip", "placeholder", "title", "alt"].forEach(function (a) { var v = e.getAttribute(a); if (v && L10N[key(v)] != null) e.setAttribute(a, L10N[key(v)]); });
    });
  }
  translatePage(document.body);
  if (L10N[document.title]) document.title = L10N[document.title];
  var CJK = { zh: "'Songti SC', 'STSong', 'Noto Serif CJK SC', 'Source Han Serif SC', 'SimSun', ", ja: "'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif CJK JP', 'Source Han Serif JP', 'MS Mincho', ", ko: "'AppleMyungjo', 'Nanum Myeongjo', 'Noto Serif CJK KR', 'Source Han Serif KR', 'Batang', " }[LANG] || "";
  var PROVINCE_OF = /^(Western |Eastern )?Roman Empire$/;
  var canvas = $("globe");
  var ctx = canvas.getContext("2d");
  var R_KM = 6371.0088, D2R = Math.PI / 180, TAU = 2 * Math.PI, HALF_PI = Math.PI / 2;
  var SERIF = "'IM Fell English', 'Old Standard TT', Georgia, " + CJK + "'Times New Roman', serif";
  var UC = "../uchronia/";
  var UC_APP = "/uchronia/";
  var STORE_FLAT = "chronia-flat", STORE_SPEED = "chronia-play-speed";
  var PALETTE = 10;
  var SOFT_BEFORE = 1648;
  var START_YEAR = 1815, MONTHLY_FROM = 1648, DAYS_FROM = 1800;
  // The timeline runs to the present month by the viewer's clock (never before October 2026), so months
  // that have not happened yet are not on it.
  var LAST_YM = Math.max(2026 * 12 + 9, new Date().getFullYear() * 12 + new Date().getMonth());
  var LAST_YEAR = Math.floor(LAST_YM / 12), LAST_MONTH = LAST_YM % 12 + 1;
  var KEEP_MAPS = 8;
  var PLAIN = addrHas("plain"), LOW_MEM = (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4) || !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  var CHUNK_KEEP = PLAIN ? 1e9 : LOW_MEM ? 3 : 5, CHUNK_HOLD_MS = 5000, CHUNK_IDLE_MS = 60000, FINE_IDLE_MS = 20000, HIDDEN_MS = 20000, BASE_HOLD_MS = 5000, SNAP_KEEP = PLAIN ? 24 : LOW_MEM ? 6 : 12, RELIEF_KEEP = PLAIN ? 200 : LOW_MEM ? 48 : 96, RELIEF_IDLE_MS = 60000, MODERN_DROP_BEFORE = 1800, MODERN_HOLD_MS = 30000, REST_MS = 300, FINE_ALWAYS_S = 2600;
  var phoneQuery = window.matchMedia("(max-width: 640px)");
  var coarseQuery = window.matchMedia("(hover: none) and (pointer: coarse)");
  function touchMap() { return phoneQuery.matches || coarseQuery.matches; }
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
  // jsonLoading counts the data files on their way, so a saved video can wait for each date's map to be complete.
  var jsonLoading = 0;
  // The site's build stamps DATA_V with a hash of data/, so a page gets all its data files from the same build: they are
  // cached for an hour or more, and the polity numbers in eras.json must match those in modern.json and the dated files.
  var DATA_V = "";
  function fetchJSON(url) {
    if (DATA_V && url.indexOf("data/") === 0) url += "?v=" + DATA_V;
    jsonLoading++;
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + " " + r.status);
      return r.json();
    }).finally(function () { jsonLoading--; });
  }

  // roll: how far the globe is turned on the screen, in degrees clockwise (0 has north up). The flat map is always north up.
  var view = { lon: 15, lat: 32, zoom: 1, roll: 0 };
  var flat = false;
  var dpr = 1, W = 0, H = 0, cx = 0, cy = 0, baseR = 0, baseK = 0, freeT = 0, freeB = 0;
  var projection = d3.geoOrthographic().clipAngle(90).precision(0.35), ROLL_SIGN = -1;
  var MIN_ZOOM = 0.6, MAX_ZOOM = 80;
  var FB = { k: 1, xc: 0, yc: 0, wrap: false, spin: false, vmin: -Math.PI, vmax: Math.PI, pmin: -HALF_PI, pmax: HALF_PI };
  var B = { ex: 0, ey: 0, ez: 0, nx: 0, ny: 0, nz: 0, cx: 0, cy: 0, cz: 0, r: 1 };

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2, benchDpr || 99);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    sizeRelief();
    var phone = phoneQuery.matches;
    // On phones the date sits in the year bar, between the backward and forward play buttons; elsewhere at the top.
    var yb = $("year-box"), timeBar = $("time"), topRow = $("top");
    if (phone && yb.parentNode !== timeBar) timeBar.insertBefore(yb, $("track"));
    else if (!phone && yb.parentNode !== topRow) topRow.insertBefore(yb, topRow.firstChild);
    var timeH = $("time").getBoundingClientRect().height || 80;
    document.documentElement.style.setProperty("--ch-time-h", Math.round(timeH) + "px");
    var cardH = phone && !$("card").hidden ? $("card").getBoundingClientRect().height : 0;
    // The date sits under the top row on narrower screens, so the map starts below it there.
    var ybBottom = yb.parentNode === topRow ? topRow.offsetTop + yb.offsetTop + yb.offsetHeight + 10 : 0;
    // A banner under the top row (adsPlace, where the gaps beside the date are too narrow for two) pushes the map down too.
    fitSite();
    var adsUnder = typeof adsPlace === "function" && typeof ADS === "object" && ADS ? adsPlace() : 0;
    freeT = Math.max(phone ? 58 : 76, ybBottom, adsUnder);
    // The card starts below such a banner too, not over it (iPads, 26 November 2026).
    document.documentElement.style.setProperty("--ch-ad-under", (phone ? 0 : Math.round(adsUnder)) + "px");
    freeB = H - timeH - cardH;
    cx = W / 2;
    cy = (freeT + freeB) / 2;
    baseR = Math.max(80, Math.min(W - 20, freeB - freeT) / 2 - 14);
    baseK = Math.max(20, Math.min((W - 24) / TAU, (freeB - freeT - 16) / Math.PI));
    // The cached layers (terrain, sea, land, names) are keyed on layoutEpoch, which moves only when the map's frame does: a
    // banner shown or hidden moves the globe's centre without changing the window's size, and a cache keyed on the size alone
    // drew the sea and terrain where the globe had been (Noah's phone, 19 November 2026).
    var frameSig = [W, H, cx, cy, baseR, baseK].join();
    if (frameSig !== layoutSig) { layoutSig = frameSig; layoutEpoch++; }
    baseEpoch++;
    applyView();
    placeTicks();
  }
  // The address under the name is never wider than the name: from its size in the style sheet, it is set smaller where
  // it would run past the name's last letter (on the narrowest phones, Noah, 27 November 2026).
  function fitSite() {
    var site = document.querySelector(".ch-site"), title = document.querySelector(".ch-brand .ch-title");
    if (!site || !title) return;
    site.style.fontSize = "";
    var cs = getComputedStyle(title), room = title.getBoundingClientRect().width - parseFloat(cs.letterSpacing || 0), w = site.getBoundingClientRect().width;
    if (room > 0 && w > room) site.style.fontSize = Math.max(5, parseFloat(getComputedStyle(site).fontSize) * room / w).toFixed(2) + "px";
  }
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", function () { fitSite(); });
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
      // Wider than the window, the world repeats across it (wrap). Narrower, it is one world in its frame, but turned to the
      // longitude the reader was looking at (spin, 19 November 2026; until then it was put back on the prime meridian, so
      // zooming all the way out over the Pacific jumped to Europe). Both draw a longitude at wrapPi(lam - xc) from the
      // centre; spin keeps to the frame's width round the centre.
      FB.wrap = k * TAU > W + 1;
      FB.spin = !FB.wrap;
      xc = wrapPi(xc);
      var y0 = (freeB - cy) / k - HALF_PI, y1 = HALF_PI - (cy - freeT) / k;
      yc = y0 > y1 ? 0 : Math.max(y0, Math.min(y1, yc));
      view.lon = xc / D2R; view.lat = yc / D2R;
      FB.k = k; FB.xc = xc; FB.yc = yc;
      var margin = 40 / k;
      FB.vmin = FB.wrap ? xc - cx / k - margin : xc - Math.PI - margin;
      FB.vmax = FB.wrap ? xc + (W - cx) / k + margin : xc + Math.PI + margin;
      FB.pmin = Math.max(-HALF_PI, yc - (H - cy) / k - margin);
      FB.pmax = Math.min(HALF_PI, yc + cy / k + margin);
    } else {
      view.lon = wrap180(view.lon);
      view.lat = Math.max(-89.5, Math.min(89.5, view.lat));
      view.roll = wrap180(view.roll || 0);
      projection.rotate([-view.lon, -view.lat, ROLL_SIGN * view.roll]).scale(baseR * view.zoom).translate([cx, cy]);
      var lon = view.lon * D2R, lat = view.lat * D2R;
      var sl = Math.sin(lon), cl = Math.cos(lon), sp = Math.sin(lat), cp = Math.cos(lat);
      // The screen's right and up, east and north at the centre turned by the roll.
      var ex = -sl, ey = cl, ez = 0, nx = -sp * cl, ny = -sp * sl, nz = cp, rc = Math.cos(view.roll * D2R), rs = Math.sin(view.roll * D2R);
      B.ex = rc * ex + rs * nx; B.ey = rc * ey + rs * ny; B.ez = rc * ez + rs * nz;
      B.nx = rc * nx - rs * ex; B.ny = rc * ny - rs * ey; B.nz = rc * nz - rs * ez;
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
  // Points are snapped to a grid of 1/SNAP of a pixel (a finer one when the map stands still), and a point
  // in the same cell as the one before is skipped: at a world view most of the borders' points fall
  // within a pixel of each other. Snapping both ways round gives the same points, so the shapes on either
  // side of a border still meet exactly.
  var SNAP = 4;
  function snapNow() { SNAP = moving ? 2 : 4; }
  function outcode(px, py) {
    return (px < -EDGE ? 1 : px > W + EDGE ? 2 : 0) | (py < -EDGE ? 4 : py > H + EDGE ? 8 : 0);
  }
  function traceRing(c, rg) {
    var X = rg.x, Y = rg.y, Z = rg.z, n = rg.n;
    var r = B.r, ex = B.ex, ey = B.ey, ez = B.ez, nx = B.nx, ny = B.ny, nz = B.nz, vx = B.cx, vy = B.cy, vz = B.cz;
    var any = false;
    for (var k = 0; k < n; k++) { if (X[k] * vx + Y[k] * vy + Z[k] * vz > 0) { any = true; break; } }
    if (!any) return;
    // A ring ends with a line back to its first point rather than closePath(): Chromium's closePath()
    // takes longer the more rings a path already holds, so a world of borders took most of a frame.
    var side = 0, lx = 0, ly = 0, held = false, q = SNAP, qx = NaN, qy = NaN, fx = 0, fy = 0;
    for (k = 0; k < n; k++) {
      var x = X[k], y = Y[k], z = Z[k];
      var sx = x * ex + y * ey + z * ez, sy = x * nx + y * ny + z * nz, sz = x * vx + y * vy + z * vz;
      if (sz < 0) { var l = Math.hypot(sx, sy) || 1; sx /= l; sy /= l; }
      var px = Math.round((cx + r * sx) * q) / q, py = Math.round((cy - r * sy) * q) / q;
      if (px === qx && py === qy) continue;
      qx = px; qy = py;
      if (k === 0) { c.moveTo(px, py); fx = px; fy = py; side = outcode(px, py); held = false; continue; }
      var oc = outcode(px, py);
      if (oc & side) { lx = px; ly = py; held = true; side = oc & side; continue; }
      if (held) { c.lineTo(lx, ly); held = false; }
      c.lineTo(px, py);
      side = oc;
    }
    if (held) c.lineTo(lx, ly);
    c.lineTo(fx, fy);
  }
  function traceLine(c, L) {
    if (L.radius < HALF_PI && !featureInFront(L)) return;
    var r = B.r, ex = B.ex, ey = B.ey, ez = B.ez, nx = B.nx, ny = B.ny, nz = B.nz, vx = B.cx, vy = B.cy, vz = B.cz;
    var X = L.x, Y = L.y, Z = L.z, n = L.n, pen = false, side = 0, q = SNAP, qx = NaN, qy = NaN;
    for (var k = 0; k < n; k++) {
      var x = X[k], y = Y[k], z = Z[k];
      var sz = x * vx + y * vy + z * vz;
      if (sz < -0.002) { pen = false; qx = NaN; continue; }
      var sx = x * ex + y * ey + z * ez, sy = x * nx + y * ny + z * nz;
      if (sz < 0) { var l = Math.hypot(sx, sy) || 1; sx /= l; sy /= l; }
      var px = Math.round((cx + r * sx) * q) / q, py = Math.round((cy - r * sy) * q) / q;
      if (pen && px === qx && py === qy && k < n - 1) continue;
      qx = px; qy = py;
      var oc = outcode(px, py);
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
    var side = 0, lx = 0, ly = 0, held = false, q = SNAP, qx = NaN, qy = NaN, fx = 0, fy = 0;
    for (var i = 0; i < n; i++) {
      var px = Math.round((x0 + k * (scratch[i] + sh)) * q) / q, py = Math.round((y0 - k * P[i]) * q) / q;
      if (px === qx && py === qy && (closed || i < n - 1)) continue;
      qx = px; qy = py;
      if (i === 0) { c.moveTo(px, py); fx = px; fy = py; side = outcode(px, py); held = false; continue; }
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
    c.lineTo(fx, fy);
  }
  function traceOutline(c, d) {
    var k = FB.k, x0 = cx - k * FB.xc, y0 = cy + k * FB.yc;
    d = d || 0;
    if (FB.wrap) { c.rect(-20, y0 - k * HALF_PI - d, W + 40, k * Math.PI + 2 * d); return; }
    c.rect(cx - k * Math.PI - d, y0 - k * HALF_PI - d, k * TAU + 2 * d, k * Math.PI + 2 * d);
  }
  // Whether a circle of radius `rad` round the globe's centre covers the whole window. Zoomed in, the globe's
  // disc is far larger than the screen (5,600 device pixels across at 7x on a 2x screen), and filling or
  // clipping to it made the graphics card work out its smooth edge every time, though none of it showed:
  // on an M2 (6 November 2026) the aged-paper stage took 38 ms of each frame on the globe against 0.4 ms on
  // the flat map. Where the disc covers the window, a rectangle the size of the window draws the same pixels.
  function discCovers(rad) {
    if (flat) return false;
    var dx = Math.max(cx, W - cx) + 2, dy = Math.max(cy, H - cy) + 2;
    return dx * dx + dy * dy < rad * rad;
  }
  function traceDisc(c, rad) {
    if (discCovers(rad)) c.rect(-2, -2, W + 4, H + 4);
    else c.arc(cx, cy, rad, 0, TAU);
  }
  function traceSphere(c, d) {
    if (flat) traceOutline(c, d);
    else traceDisc(c, B.r + (d || 0));
  }
  var geoPath = d3.geoPath(projection, ctx), geoPathCtx = ctx;
  function traceFeature(c, f) {
    if (flat) {
      if (!featureInFlat(f)) return;
      for (var j = 0; j < f.rings.length; j++) traceFlat(c, f.rings[j], true);
      return;
    }
    if (!featureInFront(f)) return;
    if (f.radius > Math.PI / 4 && f.geo && -(f.cx * B.cx + f.cy * B.cy + f.cz * B.cz) >= Math.cos(f.radius) - 1e-9) {
      if (c === ctx && c !== geoPathCtx) { geoPathCtx = ctx; geoPath = d3.geoPath(projection, ctx); }
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
      return [cx + FB.k * wrapPi(lam - FB.xc), cy - FB.k * (lat * D2R - FB.yc), 1];
    }
    var v = toVec(lon, lat), d = v[0] * B.cx + v[1] * B.cy + v[2] * B.cz;
    if (d <= 0) return null;
    return [cx + B.r * (v[0] * B.ex + v[1] * B.ey + v[2] * B.ez), cy - B.r * (v[0] * B.nx + v[1] * B.ny + v[2] * B.nz), d];
  }
  function lonLatAt(x, y) {
    if (flat) {
      var lam = FB.xc + (x - cx) / FB.k, phi = FB.yc - (y - cy) / FB.k;
      if (FB.spin && Math.abs(x - cx) > FB.k * Math.PI) return null;
      lam = wrapPi(lam);
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
    ["ocean", "ocean-deep", "grat", "limb", "glow", "border", "label", "label-halo", "people", "city", "city-ring", "select", "hover", "paper", "people-fill", "water", "sea-label", "river", "river-label"].forEach(function (k) {
      pal[k] = cs.getPropertyValue("--ch-" + k).trim();
    });
    ["city-halo", "town"].forEach(function (k) { pal[k] = cs.getPropertyValue("--ch-" + k).trim(); });
    ["division", "division-label", "front"].forEach(function (k) { pal[k] = cs.getPropertyValue("--ch-" + k).trim(); });
    // The brass of the meridian ring (drawRing); without them the ring falls back to the limb's ink.
    ["ring", "ring-hi", "ring-lo", "ring-edge"].forEach(function (k) { pal[k] = cs.getPropertyValue("--ch-" + k).trim() || pal.limb; });
    pal.colors = []; pal.bands = [];
    for (var i = 0; i < PALETTE; i++) {
      pal.colors.push(cs.getPropertyValue("--ch-c" + i).trim() || "#e7d6b9");
      pal.bands.push(cs.getPropertyValue("--ch-b" + i).trim() || "#957049");
    }
    customHex.forEach(function (h) { pal.colors.push(h); pal.bands.push(bandFor(h)); });
    if (typeof inkReset === "function" && ink) inkReset();
  }
  // Colours the developer tools set outside the ten: each takes a slot after them (PALETTE + its index here).
  var customHex = [];
  function nColors() { return PALETTE + customHex.length; }
  function customSlot(hex) {
    hex = String(hex).toLowerCase();
    var k = customHex.indexOf(hex);
    if (k < 0) { k = customHex.length; customHex.push(hex); if (pal.colors) { pal.colors.push(hex); pal.bands.push(bandFor(hex)); } }
    return PALETTE + k;
  }
  function hexHsl(h) {
    var r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, hh = 0, ss = 0;
    if (d) {
      ss = d / (1 - Math.abs(2 * l - 1));
      hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      hh = (hh * 60 + 360) % 360;
    }
    return [hh, ss, l];
  }
  // A custom colour's coastal band: its own hue, at the saturation and lightness of the band of the palette
  // colour nearest it in hue, so it sits with the others.
  function bandFor(hex) {
    var h = hexHsl(hex), best = 0, bd = Infinity;
    for (var i = 0; i < PALETTE; i++) {
      var f = hexHsl(pal.colors && pal.colors[i] ? pal.colors[i] : "#e7d6b9"), dd = Math.min(Math.abs(f[0] - h[0]), 360 - Math.abs(f[0] - h[0]));
      if (dd < bd) { bd = dd; best = i; }
    }
    var b = hexHsl(pal.bands && pal.bands[best] ? pal.bands[best] : "#957049");
    return "hsl(" + h[0].toFixed(1) + "," + (100 * (h[1] < 0.05 ? h[1] : b[1])).toFixed(1) + "%," + (100 * b[2]).toFixed(1) + "%)";
  }

  var renderQueued = false, moving = false, settleTimer = 0;
  function scheduleRender(soft) {
    if (!soft) baseEpoch++;
    if (!renderQueued) { renderQueued = true; requestAnimationFrame(frame); }
  }
  // While the map moves, a device that can't keep up draws it at a lower resolution and stretches it to
  // the screen; the full drawing comes back when the map stops. moveRes steps down (1, 0.7, then 0.5 of
  // the screen's pixels) when the frames while moving come more than MOVE_SLOW_MS apart on average, over
  // MOVE_RUN frames, and back up when they come under MOVE_FAST_MS. Each step down is kept only if it pays:
  // the gap at the lower resolution must be under MOVE_GAIN of the gap above it, or the map goes back up and
  // stays there (moveFloor). On a fast machine (an M2, measured on 6 November 2026) the stretch itself, which
  // makes the browser finish the small canvas at once, cost more than the pixels it saved. &full in the
  // address keeps the full resolution throughout.
  var mainCtx = ctx, lowCanvas = null, lowCtx = null, moveRes = 1, moveGaps = [], lastMoveFrame = 0, MOVE_SLOW_MS = 26;
  function addrHas(flag) { var re = new RegExp("(^|[#?&])" + flag + "(&|$)"); return re.test(String(location.search || "")) || re.test(String(location.hash || "")); }
  var MOVE_FAST_MS = 15, MOVE_RUN = 12, MOVE_GAIN = 0.85, moveFloor = addrHas("full") ? 1 : 0.5, gapAt = {};
  function moveStep(avg) {
    var up = moveRes < 0.6 ? 0.7 : 1, down = moveRes > 0.8 ? 0.7 : 0.5;
    gapAt[moveRes] = avg;
    if (moveRes < 1 && gapAt[up] && avg > gapAt[up] * MOVE_GAIN) { moveFloor = up; moveRes = up; return; }
    if (avg > MOVE_SLOW_MS && moveRes > moveFloor) { moveRes = Math.max(moveFloor, down); return; }
    if (avg < MOVE_FAST_MS && moveRes < 1) moveRes = up;
  }
  function frame(ts) {
    renderQueued = false;
    armRest();
    var f0 = perf ? performance.now() : 0;
    if (moving) {
      if (lastMoveFrame && ts - lastMoveFrame < 250) {
        moveGaps.push(ts - lastMoveFrame);
        if (moveGaps.length >= MOVE_RUN) {
          moveStep(moveGaps.reduce(function (a, b) { return a + b; }, 0) / moveGaps.length);
          moveGaps = [];
        }
      }
      lastMoveFrame = ts;
    } else lastMoveFrame = 0;
    var ld = moving && moveRes < 1 ? Math.max(0.5, dpr * moveRes) : dpr;
    if (ld < dpr) {
      if (!lowCanvas) { lowCanvas = document.createElement("canvas"); lowCtx = lowCanvas.getContext("2d"); }
      var lw = Math.max(1, Math.round(W * ld)), lh = Math.max(1, Math.round(H * ld));
      if (lowCanvas.width !== lw || lowCanvas.height !== lh) { lowCanvas.width = lw; lowCanvas.height = lh; }
      var fullDpr = dpr;
      ctx = lowCtx; dpr = ld;
      try { draw(); } catch (e) { console.error(e); } finally { ctx = mainCtx; dpr = fullDpr; }
      if (perf) perf.cur = performance.now();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(lowCanvas, 0, 0, canvas.width, canvas.height);
      if (perf) pmark("stretch");
    } else {
      try { draw(); } catch (e) { console.error(e); }
    }
    if (perf) perfFrame(ts, performance.now() - f0, ld < dpr ? ld / dpr : 1);
    if (!moving && relief && introOver) { try { maybeRelief(); } catch (e) { console.warn("terrain", e); rd.off = true; } }
  }

  // A frame-rate readout for measuring on a real device, shown only with &fps in the address. It counts the
  // frames drawn while the map moves and the gaps between them (which take in the graphics card's share,
  // since a frame can't start until the last is on the screen), and times draw()'s stages in the page's own
  // time. Copy puts the numbers, the browser, the screen, and the graphics chip on the clipboard.
  var perf = null;
  function perfInHash() { return addrHas("fps"); }
  function perfStart() {
    if (perf) return;
    perf = { gaps: [], draws: [], stages: {}, cur: null, last: 0, res: 1, el: null, txt: null, moved: 0, timer: 0, gpu: addrHas("gpu") };
    var el = perf.el = document.createElement("div");
    el.className = "ch-perf";
    var txt = perf.txt = document.createElement("pre");
    el.appendChild(txt);
    var row = document.createElement("div");
    var copy = document.createElement("button"), reset = document.createElement("button");
    copy.type = reset.type = "button";
    copy.textContent = "Copy"; reset.textContent = "Reset";
    copy.addEventListener("click", function () {
      var t = perf.benchText || perfText(true);
      (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy"; }, 1500); }, function () { window.prompt("Copy these numbers:", t); });
    });
    reset.addEventListener("click", function () { perf.benchText = null; perf.gaps = []; perf.draws = []; perf.stages = {}; perf.moved = 0; gapAt = {}; moveRes = 1; if (!addrHas("full")) moveFloor = 0.5; perfShow(); });
    row.appendChild(copy); row.appendChild(reset);
    el.appendChild(row);
    document.body.appendChild(el);
    perf.timer = setInterval(perfShow, 500);
    perfShow();
  }
  // Marks the end of a stage of draw(); the time since the last mark goes to that stage. With &gpu in the
  // address, it first reads back a pixel, which makes the browser finish the stage on the graphics card, so
  // each stage's time takes in the card's share (and the map is slower while measuring).
  function pmark(name) {
    if (perf.gpu) try { ctx.getImageData(0, 0, 1, 1); } catch (e) {}
    var t = performance.now();
    if (perf.cur) { var a = perf.stages[name] || (perf.stages[name] = []); a.push(t - perf.cur); if (a.length > 120) a.shift(); }
    perf.cur = t;
  }
  function perfFrame(ts, ms, res) {
    if (moving) {
      if (perf.last && ts - perf.last < 250) { perf.gaps.push(ts - perf.last); if (perf.gaps.length > 240) perf.gaps.shift(); }
      perf.last = ts;
      perf.draws.push(ms); if (perf.draws.length > 240) perf.draws.shift();
      perf.moved++;
      perf.res = res;
    } else perf.last = 0;
  }
  function pctl(a, q) { if (!a.length) return 0; var b = a.slice().sort(function (x, y) { return x - y; }); return b[Math.min(b.length - 1, Math.floor(q * b.length))]; }
  function avgOf(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : 0; }
  var perfGpu = null;
  function gpuName() {
    if (perfGpu !== null) return perfGpu;
    try {
      var gl = document.createElement("canvas").getContext("webgl"), x = gl && gl.getExtension("WEBGL_debug_renderer_info");
      perfGpu = gl ? (x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) : "no WebGL";
    } catch (e) { perfGpu = "unknown"; }
    return perfGpu;
  }
  function perfText(full) {
    var g = perf.gaps, fps = g.length ? 1000 / avgOf(g) : 0, lines = [];
    lines.push("Moving: " + (g.length ? fps.toFixed(0) + " fps" : "drag the map") + (g.length ? " | gap median " + pctl(g, 0.5).toFixed(0) + " ms, slowest 10% " + pctl(g, 0.9).toFixed(0) + " ms" : ""));
    lines.push("Draw (" + (perf.gpu ? "page and graphics card" : "page time") + "): " + avgOf(perf.draws).toFixed(1) + " ms | resolution " + (perf.res < 1 ? Math.round(perf.res * 100) + "%" : "full") + " | " + (flat ? "flat" : "globe") + ", zoom " + view.zoom.toFixed(2));
    var names = ["sea", "land", "relief", "bands", "coast band", "water", "borders", "finish", "labels", "stretch"];
    lines.push(names.filter(function (n) { return perf.stages[n]; }).map(function (n) { return n + " " + avgOf(perf.stages[n]).toFixed(1); }).join(" | "));
    lines.push(perf.moved + " frames moving | screen " + W + "x" + H + " at " + dpr + "x | lowest resolution allowed " + Math.round(moveFloor * 100) + "%" + (Object.keys(gapAt).length ? " | gaps by resolution: " + Object.keys(gapAt).sort().reverse().map(function (k) { return Math.round(k * 100) + "% " + gapAt[k].toFixed(0) + " ms"; }).join(", ") : ""));
    if (full) {
      lines.push("Date shown: " + fmtNow(now) + " | view " + view.lon.toFixed(2) + ", " + view.lat.toFixed(2));
      lines.push("Graphics: " + gpuName());
      lines.push("Browser: " + navigator.userAgent);
    }
    return lines.join("\n");
  }
  function perfShow() { if (perf && !bench && !perf.benchText) perf.txt.textContent = perfText(false); }

  // &bench: turns the globe by itself for BENCH_MS in each of a list of setups, one layer off at a time, and
  // shows the gap between frames in each, so one run on a real device shows what each layer costs there.
  var skip = {}, bench = null, benchDpr = 0, BENCH_MS = 3000;
  var BENCH = [
    ["all layers", {}], ["no terrain", { relief: 1 }], ["no aged paper", { aging: 1 }], ["no coastal band", { coastband: 1 }],
    ["no colour bands", { bands: 1 }], ["no names", { labels: 1 }], ["no rivers and lakes", { water: 1 }], ["no sea ripples", { ripples: 1 }],
    ["1x pixels", { dpr1: 1 }], ["old moving detail", { sharp: 1 }], ["names as text", { sprites: 1 }], ["names laid out every frame", { carry: 1 }], ["all off", { relief: 1, aging: 1, coastband: 1, bands: 1, labels: 1, water: 1, ripples: 1 }], ["flat map", { flat: 1 }], ["all layers again", {}]
  ];
  function benchStart() {
    if (bench || !perf) return;
    var wasFlat = flat, z0 = view.zoom, lat0 = view.lat;
    bench = { i: -1, rows: [], t0: 0, lon: view.lon, wasFlat: wasFlat, floor: moveFloor };
    moveFloor = 1; moveRes = 1;
    perf.txt.textContent = "Measuring: the globe turns by itself for about " + Math.round(BENCH.length * BENCH_MS / 1000) + " seconds. Keep this tab in front.";
    var next = function () {
      if (bench.i >= 0) {
        var g = perf.gaps;
        bench.rows.push([BENCH[bench.i][0], g.length ? pctl(g, 0.5) : 0, g.length ? 1000 / avgOf(g) : 0, avgOf(perf.draws)]);
      }
      bench.i++;
      skip = {};
      if (bench.i >= BENCH.length) return benchEnd();
      var cfg = BENCH[bench.i][1];
      Object.keys(cfg).forEach(function (k) { skip[k] = 1; });
      var wantDpr = cfg.dpr1 ? 1 : 0;
      if (wantDpr !== benchDpr) { benchDpr = wantDpr; layout(); }
      if (!!cfg.flat !== flat) setFlat(!!cfg.flat);
      if (!cfg.flat) { view.zoom = z0; view.lat = lat0; }
      perf.gaps = []; perf.draws = []; perf.last = 0;
      bench.t0 = performance.now() + 400;
      perf.txt.textContent = "Measuring " + (bench.i + 1) + " of " + BENCH.length + ": " + BENCH[bench.i][0] + "…";
    };
    var step = function () {
      if (!bench) return;
      bench.lon += flat ? 0.25 : 0.35;
      view.lon = wrap180(bench.lon);
      applyView();
      nudge();
      if (performance.now() < bench.t0) { perf.gaps = []; perf.draws = []; }
      if (performance.now() > bench.t0 + BENCH_MS) next();
      if (bench) requestAnimationFrame(step);
    };
    next();
    requestAnimationFrame(step);
  }
  function benchEnd() {
    var rows = bench.rows, base = rows[0][1];
    skip = {};
    if (benchDpr) { benchDpr = 0; layout(); }
    if (flat !== bench.wasFlat) setFlat(bench.wasFlat);
    moveFloor = bench.floor;
    var lines = ["Benchmark: gap between frames while turning (lower is better)"];
    rows.forEach(function (r) { lines.push((r[0] + ":                    ").slice(0, 22) + r[1].toFixed(0) + " ms (" + r[2].toFixed(0) + " fps), page " + r[3].toFixed(1) + " ms" + (r[0] !== "all layers" && base ? ", " + (r[1] - base >= 0 ? "+" : "") + (r[1] - base).toFixed(0) + " ms" : "")); });
    lines.push("Screen " + W + "x" + H + " at " + dpr + "x | zoom " + view.zoom.toFixed(2));
    lines.push("Graphics: " + gpuName());
    lines.push("Browser: " + navigator.userAgent);
    bench = null;
    perf.benchText = lines.join("\n");
    perf.txt.textContent = perf.benchText;
    scheduleRender();
  }

  // The map counts as moving until SETTLE_MS after it last moved, and then the full drawing comes back. With a button or a
  // finger still down on it, it waits SETTLE_HELD_MS: the full drawing takes several frames' time, and a short pause in a
  // drag brought it back, so the drag caught when it went on. Letting go brings it back after SETTLE_MS (endPointer).
  var SETTLE_MS = 160, SETTLE_HELD_MS = 600;
  function settle() { moving = false; scheduleRender(); writeHash(); }
  function nudge() {
    scaleWake();
    moving = true;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settle, pointers && pointers.size ? SETTLE_HELD_MS : SETTLE_MS);
    scheduleRender();
  }

  var srcKeys = null, srcInfo = null;
  var catalogue = null, maps = [], land = null, sea = null, rivers = null, riversLoad = null, lakes = null, lakesLoad = null;
  var current = null, now = START_YEAR, wantKey = "", modern = null, cities = null;
  var dated = null, datedSnaps = new Map();
  var selected = -1, hoverId = -1, ready = false;
  var DAY0 = Date.UTC(1886, 0, 1), DAY_MS = 86400000, MID_DAY = 15;
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var MONTHS_L = L10N["@months"] || MONTHS, MONTHS_G = L10N["@monthsOf"] || MONTHS_L;

  // Midnight UTC on a date, for any year. Date.UTC reads a year from 0 to 99 as 1900 to 1999, which made July 15,
  // AD 44 the same day as July 15, 1944 (and drew the Eastern Front across the Roman world), so no date here goes
  // through it; setUTCFullYear takes the year as given.
  function utcMs(y, m0, d) { var x = new Date(0); x.setUTCFullYear(y, m0, d); return x.getTime(); }
  function daysInMonth(y, m) { return new Date(utcMs(y, m, 0)).getUTCDate(); }
  function dayFromDate(y, m, d) { return Math.round((utcMs(y, m - 1, d) - DAY0) / DAY_MS); }
  function dateOfDay(day) { var d = new Date(DAY0 + day * DAY_MS); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]; }
  function timeOfDay(day) {
    var dt = dateOfDay(day), y = dt[0], start = utcMs(y, 0, 1), len = (utcMs(y + 1, 0, 1) - start) / DAY_MS;
    return y + ((DAY0 + day * DAY_MS - start) / DAY_MS + 0.5) / len;
  }
  function dayOfTime(t) {
    var y = Math.floor(t), start = utcMs(y, 0, 1), len = (utcMs(y + 1, 0, 1) - start) / DAY_MS;
    return Math.floor((start + (t - y) * len * DAY_MS - DAY0) / DAY_MS);
  }
  function isModern(t) { return !!modern && t >= modern.fromTime; }
  function isDated(t) { return !!dated && !isModern(t) && t >= dated.from - 0.5; }
  // From 1648 (MONTHLY_FROM) the date is a day, shown by the month, as from 1886; before, a year. The changes have their
  // days from 1800 (DAYS_FROM); from 1648 to 1799 a change of a year takes effect on 1 January.
  function monthlyFrom() { return dated ? MONTHLY_FROM : 1886; }
  function isMonthly(t) { return isModern(t) || (!!dated && t >= MONTHLY_FROM); }
  function yearOf(t) { return isMonthly(t) ? dateOfDay(dayOfTime(t))[0] : Math.round(t); }

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
  // The name in the data, whatever a country-name edit shows (the edits are keyed by it).
  function polityOwnName(id) { return id >= 0 && catalogue[id] ? catalogue[id][0] : ""; }
  // The borders before 1886 that a treaty fixed and those after that stayed unsettled ([one side's polities, the other's,
  // from, to], in years before 1886 and in days after; see FIRM and VAGUE in the builder), as a set of "a|b" for a date.
  // bordersKnown: eras.json lists the treaty and unsettled borders (built from 10 November 2026). Data built before
  // that has no list and dots only borders with a side of precision 1, as it did then.
  var borderPairs = { firm: [], vague: [] }, bordersKnown = false;
  function pairsAt(list, t) {
    var out = new Set();
    list.forEach(function (e) {
      if (t < e[2] || t > e[3]) return;
      e[0].forEach(function (a) { e[1].forEach(function (b) { out.add(a + "|" + b); out.add(b + "|" + a); }); });
    });
    return out;
  }
  function polityName(id) {
    if (!(id >= 0 && catalogue[id])) return "";
    var v = edits.nameN ? editAt("country-name", catalogue[id][0], now) : null;
    return v ? v.name : catalogue[id][0];
  }
  // "in the Holy Roman Empire", but "in British America": a group named for a place takes no article.
  function polityNameL(id) { var n = polityName(id); return (PL.pol && PL.pol[n]) || n; }
  function placeNameL(n, qid) { return (qid && PL.q && PL.q[qid + "|" + n]) || (PL.city && PL.city[n]) || n; }
  // "in Poland" but "in the Holy Roman Empire": a group's English name takes "the" when it holds a common noun (Empire,
  // Kingdom of, Crown of, League, Union, Netherlands, State, Confederacy), and not when it is a bare name such as Poland,
  // East Francia, or Kievan Rus' (Noah, 27 November 2026: the tooltip said "in the Poland").
  var THE_GROUP = /\b(Empire|Kingdom|Crown|League|Union|Netherlands|State|States|Confederacy|Confederation|Republic|Duchy|Order|Caliphate|Sultanate|Khanate|Commonwealth)\b/;
  function inGroup(id) { var n = polityNameL(id); return LANG !== "en" ? T("in {name}", { name: n }) : THE_GROUP.test(n) && !/^British America$/.test(n) ? "in the " + n : "in " + n; }
  // A group, such as Poland in 1316, is drawn only through its members: it has no shape of its own on the map.
  function isGroupIn(snap, id) {
    if (!snap || id < 0 || snap.byId.has(id)) return false;
    for (var i = 0; i < snap.polys.length; i++) { var q = snap.polys[i]; if (q && q.member === id) return true; }
    return false;
  }
  var colourDays = [], colourYears = [];
  function colourMarks() {
    var d = new Set(), y = new Set();
    catalogue.forEach(function (e) { (e[7] || []).forEach(function (s) { d.add(s[0]); }); (e[8] || []).forEach(function (s) { y.add(s[0]); }); });
    colourDays = Array.from(d).sort(function (a, b) { return a - b; });
    colourYears = Array.from(y).sort(function (a, b) { return a - b; });
  }
  function marksBefore(list, t) { var n = 0; while (n < list.length && list[n] <= t) n++; return n; }
  // The colour slot a country-colour edit gives this polity at time `at`, or -1.
  function editedColour(id, at) {
    var e = catalogue[id];
    if (!e || at === undefined || !edits.colourN) return -1;
    var v = editAt("country-colour", e[0], at);
    if (!v) return -1;
    return v.hex ? customSlot(v.hex) : v.c;
  }
  // Which colour edits hold at `at`, for the snapshots' keys, so a snapshot is rebuilt when they change.
  function colourEditKey(at) {
    if (!edits.colourN) return "";
    var out = [];
    edits.list.forEach(function (e) { if (e.kind === "country-colour" && e.t0 <= at && at < e.t1) out.push(e.id); });
    return out.length ? "|c" + out.join(".") + "@" + edits.tag : "";
  }
  function polityColor(id, day, year, at) {
    var ed = editedColour(id, at);
    if (ed >= 0) return ed;
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

  var loadedOrder = [], snapCount = 0;
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
    snap.n = ++snapCount;
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
  // The spans from 1886 (modern.json, the largest file) load when a date from 1886 is first shown, or once the page is idle.
  function loadModern() {
    modern.used = performance.now();
    if (!modern.load) modern.load = fetchJSON("data/modern.json").then(function (md) {
      modern.rows = md.rows; modern.lo = md.lo; modern.hi = md.hi || md.lo; modern.src = md.src || null;
      modern.used = performance.now();
      modern.fine = md.hi ? 3 : 0;
      if (!md.hi && (PLAIN || (isModern(now) && (fineNow() || !introOver)))) loadModernFine();
      return modern;
    }, function (e) { modern.load = null; throw e; });
    return modern.load;
  }
  function loadModernFine() {
    var lo = modern.lo;
    if (!modern.rows || modern.fine) return;
    modern.fine = 1;
    loadHi("data/modern-hi.json", function (hi) {
      if (modern.lo !== lo) return;
      modern.hi = hi; modern.fine = 2;
      modernSnaps.clear();
      if (current && current.modern) { useSnap(modernSnap(Math.min(dayOfTime(now), modern.toDay))); scheduleRender(); }
    }, function () { if (modern.lo === lo) { modern.fine = 0; modern.fineFailed = true; } });
  }
  function dropModern() {
    modern.rows = null; modern.lo = null; modern.hi = null; modern.load = null; modern.fine = 0;
    modernSnaps.clear();
    sweepFeats();
  }
  function fineNow() { return PLAIN || !!exporting || localScale() >= FINE_ALWAYS_S; }
  function fineWanted() { return fineNow() || (!playTimer && !rangeActive); }
  function wantFine() {
    if (!current) return;
    if (isModern(now)) { if (current.modern) loadModernFine(); }
    else if (isDated(now) && dated) loadChunkFine(chunkIndexFor(now));
  }
  function trimData(force) {
    if (PLAIN) return;
    force = force === true;
    var t = performance.now(), later = false, awayModern = modern && modern.rows && !(current && current.modern) && !isModern(now);
    if (dated) {
      var live = [], keep = current && current.dated ? current.chunk : -1, at = isDated(now) ? chunkIndexFor(now) : -1;
      dated.chunks.forEach(function (c, k) { if (c.data) live.push(k); });
      live.sort(function (a, b) { return dated.chunks[b].used - dated.chunks[a].used; });
      for (var i = 0; i < live.length; i++) {
        var k = live[i], c = dated.chunks[k], idle = t - c.used;
        if (k === keep || k === at) continue;
        if (force || idle >= (i < CHUNK_KEEP ? CHUNK_IDLE_MS : CHUNK_HOLD_MS)) dropChunk(k);
        else { later = true; if (c.fine === 2 && idle >= FINE_IDLE_MS) dropChunkFine(k); }
      }
    }
    if (awayModern) {
      if (force || (yearOf(now) < MODERN_DROP_BEFORE && t - modern.used >= MODERN_HOLD_MS)) dropModern();
      else { later = true; if (modern.fine === 2 && t - modern.used >= FINE_IDLE_MS) dropModernFine(); }
    }
    if (rd.cache.size && !rd.rect) { if (force || t - rd.used >= RELIEF_IDLE_MS) rd.cache.clear(); else later = true; }
    if (force) { trimSnaps(null, true); inkReset(true); }
    clearTimeout(trimTimer);
    if (later) trimTimer = setTimeout(trimData, 5000);
  }
  function dropChunkFine(k) {
    var c = dated.chunks[k], pre = "e" + k;
    c.data.hi = c.data.lo; c.fine = 0;
    datedSnaps.forEach(function (snap, key) { if (snap !== current && (key.indexOf(pre + ":") === 0 || key.indexOf(pre + "s:") === 0)) datedSnaps.delete(key); });
    sweepFeats();
  }
  function dropModernFine() {
    modern.hi = modern.lo; modern.fine = 0;
    modernSnaps.clear();
    sweepFeats();
  }
  function trimSnaps(own, all) {
    if (PLAIN) {
      while (own && own.size > SNAP_KEEP) {
        var first = own.keys().next().value, held = own.get(first);
        own.delete(first);
        if (held === current) { own.set(first, held); break; }
      }
      return;
    }
    var dropped = false, both = [datedSnaps, modernSnaps];
    for (;;) {
      if (!all && datedSnaps.size + modernSnaps.size <= SNAP_KEEP) break;
      var old = null, from = null, at = null;
      both.forEach(function (m) { m.forEach(function (snap, key) { if (snap !== current && (!old || snap.used < old.used)) { old = snap; from = m; at = key; } }); });
      if (!old) break;
      from.delete(at);
      dropped = true;
    }
    if (dropped) sweepFeats();
  }
  var hiddenTimer = 0;
  document.addEventListener("visibilitychange", function () {
    clearTimeout(hiddenTimer);
    if (document.hidden) hiddenTimer = setTimeout(function () { if (document.hidden && ready && !playTimer && !exporting && !lapse) { trimData(true); restBase(); } }, HIDDEN_MS);
  });
  function dropChunk(k) {
    var c = dated.chunks[k], pre = "e" + k;
    c.data = null; c.loading = null; c.fine = 0;
    datedSnaps.forEach(function (snap, key) { if (snap !== current && (key.indexOf(pre + ":") === 0 || key.indexOf(pre + "s:") === 0)) datedSnaps.delete(key); });
    sweepFeats();
  }
  var restTimer = 0, trimTimer = 0, baseTimer = 0;
  function armRest() { clearTimeout(restTimer); clearTimeout(baseTimer); restTimer = setTimeout(atRest, REST_MS); }
  function atRest() {
    if (!ready || !current) return;
    if (fineWanted()) wantFine();
    trimData();
    baseTimer = setTimeout(restBase, BASE_HOLD_MS);
  }
  // The detailed lines of a data file are in a file beside it (written by the build since November 2026), fetched once the
  // simplified lines have drawn the first map; until they come, the simplified lines stand in for them. The swap is counted
  // as a load, so a saved video waits for it.
  function loadHi(file, use, fail) {
    jsonLoading++;
    fetchJSON(file).then(function (d) { use(d.hi); }).catch(function (e) { console.warn("detail", file, e); if (fail) fail(); }).finally(function () { jsonLoading--; });
  }
  // Loads that can wait run after the opening and when the browser is idle, so they don't compete with the first map.
  // No deadline: a load forced in while the map is being dragged parses for a tenth of a second or more and drops frames.
  function whenIdle(f) {
    afterIntro(function () { (window.requestIdleCallback || function (cb) { return setTimeout(cb, 4000); })(f); });
  }
  // The files beside the date's are fetched ahead only when the date is near them: within a decade of its file's edge, or
  // while the timeline plays. modern.json (from 1886, the largest file) is fetched ahead from 1860.
  var NEAR_EDGE = 10, MODERN_AHEAD = 1860;
  function activeRows(day) {
    var out = [], rows = modern.rows;
    for (var i = 0; i < rows.length; i++) { var r = rows[i]; if (r[2] <= day && (r[3] < 0 || day <= r[3])) out.push(i); }
    return out;
  }
  // A polity's own colour edit comes first, so a member of a group (whose hue is the group's) can be recoloured too.
  function ownColour(id, at, otherwise) { var ed = editedColour(id, at); return ed >= 0 ? ed : otherwise(); }
  function modernSnap(day) {
    modern.used = performance.now();
    var at = timeOfDay(day), idx = activeRows(day), key = "m" + idx.join(",") + "|" + marksBefore(colourDays, day) + colourEditKey(at);
    var snap = modernSnaps.get(key);
    if (snap) { modernSnaps.delete(key); modernSnaps.set(key, snap); snap.used = performance.now(); return snap; }
    var polys = idx.map(function (ri, i) {
      var r = modern.rows[ri], hue = r[1] >= 0 ? r[1] : r[0], claims = r[4] === DISPUTED && r[7] ? r[7] : null;
      return { i: i, row: ri, sk: modern.src ? modern.src[ri] : -1, id: r[0], ruler: r[4] ? r[1] : -1, part: -1, b: r[8] === 1 ? 1 : 3, soft: !!claims || r[8] === 1, people: false, label: r[6], hue: hue, color: claims ? -1 : ownColour(r[0], at, function () { return polityColor(hue, day, undefined, at); }), claims: claims, claimColors: claims ? apart(claims.map(function (c) { return polityColor(c, day, undefined, at); })) : null, status: r[4], cap: claims ? null : r[5], start: r[2], end: r[3] };
    });
    snap = finishSnap({
      year: null, key: key, modern: true, polys: polys, vague: pairsAt(borderPairs.vague, day), topo: { hi: modern.hi, lo: modern.lo },
      geoms: { hi: idx.map(function (i) { return modern.hi.objects.p.geometries[i]; }), lo: idx.map(function (i) { return modern.lo.objects.p.geometries[i]; }) }
    });
    snap.used = performance.now();
    modernSnaps.set(key, snap);
    trimSnaps(modernSnaps);
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
    c.used = performance.now();
    if (c.data) return Promise.resolve(c);
    if (!c.loading) {
      c.loading = fetchJSON(c.file).then(function (d) {
        c.data = d; c.used = performance.now(); prepDays(d);
        if (d.hi) c.fine = 3;
        else {
          d.hi = d.lo; c.fine = 0;
          if (PLAIN || (isDated(now) && chunkIndexFor(now) === k && (fineNow() || !introOver))) loadChunkFine(k);
        }
        trimData();
        return c;
      }).catch(function (e) { c.loading = null; throw e; });
    }
    return c.loading;
  }
  function loadChunkFine(k) {
    var c = dated.chunks[k], d = c && c.data;
    if (!d || c.fine) return;
    c.fine = 1;
    loadHi(c.file.replace(/\.json$/, "-hi.json"), function (hi) {
      if (c.data !== d) return;
      d.hi = hi; c.fine = 2;
      var pre = "e" + k;
      datedSnaps.forEach(function (snap, key) { if (key.indexOf(pre + ":") === 0 || key.indexOf(pre + "s:") === 0) datedSnaps.delete(key); });
      if (current && current.dated && isDated(now) && chunkIndexFor(now) === k) { useSnap(datedSnap(k, now)); scheduleRender(); }
    }, function () { if (c.data === d) { c.fine = 0; c.fineFailed = true; } });
  }
  // A row's first and last day: the days the chunk gives for changes dated within the year (from 1800),
  // or else 1 January of its first year and 31 December of its last.
  function prepDays(d) {
    if (d.to < MONTHLY_FROM) return;
    var n = d.rows.length;
    d.dayFrom = new Array(n); d.dayTo = new Array(n); d.dayKnown = new Array(n);
    for (var i = 0; i < n; i++) { d.dayFrom[i] = d.rows[i][2] < 1000 ? -1e9 : dayFromDate(d.rows[i][2], 1, 1); d.dayTo[i] = dayFromDate(d.rows[i][3], 12, 31); d.dayKnown[i] = 0; }
    // A span that ends in the file's last year, or begins in its first, changes hands with one in the neighbouring file, which this
    // date never loads: its day there is left at the year's end or beginning, so no land lies ownerless between the two (Piedmont
    // from 10 November to 31 December 1859, when the spans to the Treaty of Zurich had ended and those after it lay in the file of 1860).
    var first = dayFromDate(d.from, 1, 1), last = dayFromDate(d.to, 12, 31);
    (d.days || []).forEach(function (x) {
      var r = d.rows[x[0]];
      if (x[1] !== null && !(r[2] === d.from && x[1] > first)) { d.dayFrom[x[0]] = x[1]; d.dayKnown[x[0]] |= 1; }
      if (x[2] !== null && !(r[3] === d.to && d.to < dated.to && x[2] < last)) { d.dayTo[x[0]] = x[2]; d.dayKnown[x[0]] |= 2; }
    });
  }
  function datedSnap(k, t) {
    var c = dated.chunks[k], rows = c.data.rows, idx = [], soft = false;
    c.used = performance.now();
    var monthly = isMonthly(t), day = monthly ? dayOfTime(t) : 0, y = monthly ? yearOf(t) : t;
    var groupIds = new Set((c.data.groups || []).map(function (g) { return g[0]; }));
    if (monthly && !c.data.dayFrom) prepDays(c.data);
    for (var i = 0; i < rows.length; i++) if (monthly ? c.data.dayFrom[i] <= day && day <= c.data.dayTo[i] : rows[i][2] <= y && y <= rows[i][3]) idx.push(i);
    var key = "e" + k + (soft ? "s" : "") + ":" + idx.join(",") + "|" + marksBefore(colourYears, y) + colourEditKey(t);
    var snap = datedSnaps.get(key);
    if (snap) { datedSnaps.delete(key); datedSnaps.set(key, snap); snap.used = performance.now(); return snap; }
    var polys = idx.map(function (ri, i) {
      var r = rows[ri], people = !!r[7], member = groupIds.has(r[0]) ? r[0] : groupIds.has(r[8]) && !people ? r[8] : -1, hue = member >= 0 ? member : r[1] >= 0 && !people ? r[1] : r[0], claims = r[4] === DISPUTED && r[10] ? r[10] : null;
      return { i: i, row: ri, sk: c.data.src ? c.data.src[ri] : -1, id: r[0], ruler: people || claims ? -1 : r[1], part: r[8], member: member, b: r[9], people: people, band: r[7] === 2, label: r[6], hue: hue, color: people || claims ? -1 : ownColour(r[0], t, function () { return polityColor(hue, undefined, y, t); }), claims: claims, claimColors: claims ? apart(claims.map(function (c) { return polityColor(c, undefined, y, t); })) : null, soft: soft || (bordersKnown ? !(r[9] >= 3) : r[9] <= 1) || people || !!claims, status: r[4], cap: people || claims ? null : r[5], start: r[2], end: r[3], startDay: monthly && c.data.dayKnown[ri] & 1 ? c.data.dayFrom[ri] : null, endDay: monthly && c.data.dayKnown[ri] & 2 ? c.data.dayTo[ri] : null };
    });
    snap = finishSnap({
      year: null, key: key, dated: true, chunk: k, soft: soft, polys: polys, firm: pairsAt(borderPairs.firm, y), topo: { hi: c.data.hi, lo: c.data.lo },
      geoms: { hi: idx.map(function (i) { return c.data.hi.objects.p.geometries[i]; }), lo: idx.map(function (i) { return c.data.lo.objects.p.geometries[i]; }) }
    });
    snap.groups = (c.data.groups || []).filter(function (g) { return g[1] <= y && y <= g[2] && g[4]; }).map(function (g) {
      var mem = g[3].filter(function (ri) { return idx.indexOf(ri) >= 0; });
      if (mem.length < 2) return null;
      return { id: g[0], group: true, label: g[4], people: false,
        geoLo: topojson.mergeArcs(c.data.lo, mem.map(function (ri) { return c.data.lo.objects.p.geometries[ri]; })),
        geoHi: topojson.mergeArcs(c.data.hi, mem.map(function (ri) { return c.data.hi.objects.p.geometries[ri]; })) };
    }).filter(Boolean);
    snap.used = performance.now();
    datedSnaps.set(key, snap);
    trimSnaps(datedSnaps);
    return snap;
  }
  function datedChangeBefore(y) {
    var c = dated.times, lo = 0, hi = c.length - 1, k = -1;
    while (lo <= hi) { var mid = (lo + hi) >> 1; if (c[mid] <= y) { k = mid; lo = mid + 1; } else hi = mid - 1; }
    return k;
  }

  var featCache = PLAIN ? { hi: new WeakMap(), lo: new WeakMap() } : { hi: new Map(), lo: new Map() };
  function sweepFeats() {
    if (PLAIN) return;
    var live = { hi: new Set(), lo: new Set() };
    var add = function (snap) {
      if (!snap || !snap.geoms) return;
      snap.geoms.hi.forEach(function (g) { live.hi.add(g); });
      snap.geoms.lo.forEach(function (g) { live.lo.add(g); });
      (snap.groups || []).forEach(function (g) { live.hi.add(g.geoHi); live.lo.add(g.geoLo); });
    };
    datedSnaps.forEach(add); modernSnaps.forEach(add); add(current);
    maps.forEach(function (m) { add(m.snap); });
    ["hi", "lo"].forEach(function (k) { featCache[k].forEach(function (c, g) { if (!live[k].has(g)) featCache[k].delete(g); }); });
  }
  function featOf(topo, key, g) {
    var c = featCache[key].get(g);
    if (!c) {
      var geo = topojson.feature(topo, g);
      c = { geo: geo, prep: preparePolys(geo) };
      featCache[key].set(g, c);
    }
    return c;
  }
  // A date's detailed shapes with their bounds and areas, which finding the state at a point needs. This is not the
  // whole detailed level: pointing at the map used to build that (its border lines too, a third of a second on a
  // laptop) though the map was drawn from the simplified one.
  function shapesOf(snap) {
    if (snap.shapes) return snap.shapes;
    var topo = snap.topo.hi, cached = snap.geoms.hi.map(function (g) { return featOf(topo, "hi", g); });
    snap.shapes = {
      geo: cached.map(function (c) { return c.geo; }),
      bounds: cached.map(function (c) { if (!c.bounds) c.bounds = d3.geoBounds(c.geo); return c.bounds; }),
      area: cached.map(function (c) { if (c.area === undefined) c.area = d3.geoArea(c.geo); return c.area; })
    };
    return snap.shapes;
  }
  function level(snap, key) {
    syncGrid();
    var lk = key + gridTag + "|" + nColors(), L = snap.levels[lk];
    if (L) return L;
    var topo = snap.topo[key], geoms = snap.geoms[key], polys = snap.polys;
    var ix = new Map();
    geoms.forEach(function (g, i) { ix.set(g, i); });
    var cached = geoms.map(function (g) { return featOf(topo, key, g); });
    var geo = cached.map(function (c) { return c.geo; });
    var feats = cached.map(function (c) { return c.prep; });
    var colOf = function (g) { var p = polys[ix.get(g)]; return p && !p.people && !p.claims ? p.color : -1; };
    var hueOf = function (g) { var p = polys[ix.get(g)]; return p ? p.hue : -1; };
    var groups = [];
    for (var c = 0; c < nColors(); c++) groups.push([]);
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
      // A treaty border before 1886 is solid where both sides are drawn at least from a source's outline; an unsettled one
      // from 1886 is dotted.
      if (pa && pb && !pa.people && !pb.people) {
        if (soft && snap.firm && pa.b >= 2 && pb.b >= 2 && snap.firm.has(pa.id + "|" + pb.id)) soft = false;
        else if (!soft && snap.vague && snap.vague.has(pa.id + "|" + pb.id)) soft = true;
      }
      if (pa && pb && pa.member >= 0 && pa.member === pb.member) return 4;
      // Kin (one ruler) only within one group: a land in personal union that sits in another confederation, as Luxembourg and
      // Limburg in the German Confederation beside the Netherlands, or Holstein beside Schleswig, keeps a full border.
      if (pa && pb && !pa.people && !pb.people && pa.hue === pb.hue && pa.part === pb.part) return 3;
      return soft ? 2 : 1;
    };
    // Each arc is sorted once into the kinds of line it belongs to (the shapes on its two sides decide), rather than
    // once for each kind of line, and the lines are joined from the arcs' points kept by arcVec.
    var store = arcStore(topo), use = arcUse(topo, geoms);
    var hardA = [], softA = [], kinA = [], memberA = [], bandA = groups.map(function () { return []; });
    for (var j = 0; j < use.n; j++) {
      var ia = use.first[j], ib = use.last[j];
      if (ia < 0 || ia === ib) continue;
      var ga = geoms[ia], gb = geoms[ib], sa = use.sign[j], kd = kind(ga, gb);
      if (kd === 1) hardA.push(sa); else if (kd === 2) softA.push(sa); else if (kd === 3) kinA.push(sa); else if (kd === 4) memberA.push(sa);
      // A band runs where the colour changes, and also between two neighbours that share a colour but not
      // a hue (two separate states, such as the Netherlands and Hanover in 1815), so they don't read as one.
      var ca = colOf(ga), cb = colOf(gb);
      if (ca !== cb) { if (ca >= 0) bandA[ca].push(sa); if (cb >= 0) bandA[cb].push(sa); }
      else if (ca >= 0 && hueOf(ga) !== hueOf(gb)) bandA[ca].push(sa);
    }
    var mesh = function (arcs) { return arcRuns(topo, arcs).map(function (run) { return prepareRun(topo, store, run); }).filter(Boolean); };
    var edges = outerEdges(topo, store, use, function (i) {
      var p = polys[i];
      return !p ? null : p.claims ? "d" : p.band ? "b" : p.people ? "p" : (p.soft ? "s" : "h") + p.color;
    }, withinState(topo, polys));
    L = {
      topo: topo, geoms: geoms, polys: polys,
      geo: geo, feats: feats, groups: groups, peoples: peoples, unnamed: unnamed, disputes: Array.from(disputes.values()),
      hard: mesh(hardA).concat(edges.hard),
      soft: mesh(softA).concat(edges.soft),
      kin: mesh(kinA),
      member: mesh(memberA),
      bleed: edges.bleed, peopleBleed: edges.peopleBleed,
      bands: groups.map(function (list, c) { return list.length ? mesh(bandA[c]).concat(edges.inner[c]) : null; })
    };
    if (key === "hi") { var sh = shapesOf(snap); L.bounds = sh.bounds; L.area = sh.area; }
    snap.levels[lk] = L;
    return L;
  }
  // The arcs that only one shape uses, once (the outside edges), sorted by what that shape is and split into the stretches
  // along the coast and the stretches inland. bucketOf takes the shape's place in the snapshot.
  // Whether a line that one shape alone uses lies inside another shape of the same state on the map (see topo.inside).
  function withinState(topo, polys) {
    var inside = topo.inside, rowId = null;
    if (!inside) return null;
    return function (i, gi) {
      var l = inside[i], p = polys[gi];
      if (!l || !p) return false;
      if (!rowId) { rowId = new Map(); polys.forEach(function (q) { if (q && q.row !== undefined && !q.group) rowId.set(q.row, q.id); }); }
      for (var k = 0; k < l.length; k++) if (rowId.get(l[k]) === p.id) return true;
      return false;
    };
  }
  function outerEdges(topo, store, use, bucketOf, within) {
    var buckets = {};
    for (var k = 0; k < use.seen.length; k++) {
      var i = use.seen[k];
      if (use.count[i] !== 1) continue;
      // A needle (the builder's markNeedles): two borders a hair apart, not a state's edge against ownerless land.
      if (topo.needles) { if (!store.needle) { store.needle = new Uint8Array(topo.arcs.length); for (var q = 0; q < topo.needles.length; q++) store.needle[topo.needles[q]] = 1; } if (store.needle[i]) continue; }
      // A line inside a state (the builder's topo.inside): one row's edge across another row of the same state, shown now.
      if (within && within(i, use.first[i])) continue;
      var b = bucketOf(use.first[i]);
      if (b === null) continue;
      (buckets[b] = buckets[b] || []).push(i);
    }
    var out = { hard: [], soft: [], peopleBleed: [], bleed: [], inner: [] };
    for (var c = 0; c < nColors(); c++) { out.bleed.push([]); out.inner.push([]); }
    var add = function (to, from) { for (var q = 0; q < from.length; q++) to.push(from[q]); };
    Object.keys(buckets).forEach(function (b) {
      var coastal = [], inner = [];
      buckets[b].forEach(function (i) { var sp = arcSplit(topo, store, i); add(coastal, sp.coastal); add(inner, sp.inner); });
      if (b === "p" || b === "b") { add(out.peopleBleed, coastal); if (b === "p") add(out.soft, inner); return; }
      if (b === "d") { add(out.soft, inner); return; }
      var col = +b.slice(1);
      add(out.bleed[col], coastal);
      add(out.inner[col], inner);
      add(b[0] === "s" ? out.soft : out.hard, inner);
    });
    return out;
  }
  // What a date's border lines are built from, kept for each file's arcs (the lines of the topology) so that a new date
  // joins them rather than working them out again: a date's lines are runs of whole arcs, and going from one date to the
  // next changes which runs, not the arcs. Before this (measured 12 November 2026) every new date decoded each arc and
  // turned its points into vectors once for every kind of line and colour, a quarter of a second or more a step.
  //   vec: the arc's points as unit vectors, and whether it runs along the antimeridian or the pole (seam);
  //   one, rev: the arc alone as a line, forwards and backwards;
  //   split: an outside arc's stretches along the coast and inland, good for as long as the coast grid stands.
  var arcStores = new WeakMap();
  function arcStore(topo) {
    var st = arcStores.get(topo);
    if (!st) { var n = topo.arcs.length; st = { vec: new Array(n), one: new Array(n), rev: new Array(n), split: [], grid: null, base: "", tag: "", use: null }; arcStores.set(topo, st); }
    return st;
  }
  function arcPoints(topo, i) { return topojson.feature(topo, { type: "LineString", arcs: [i] }).geometry.coordinates; }
  function seamStep(a, b) { return (Math.abs(a[0]) > 179.9999 && Math.abs(b[0]) > 179.9999) || (a[1] < -89.9999 && b[1] < -89.9999); }
  function arcVec(topo, st, i) {
    var a = st.vec[i];
    if (a) return a;
    var pts = arcPoints(topo, i), n = pts.length, X = new Float64Array(n), Y = new Float64Array(n), Z = new Float64Array(n), seam = false;
    for (var k = 0; k < n; k++) {
      var v = toVec(pts[k][0], pts[k][1]);
      X[k] = v[0]; Y[k] = v[1]; Z[k] = v[2];
      if (k && seamStep(pts[k - 1], pts[k])) seam = true;
    }
    return (st.vec[i] = { x: X, y: Y, z: Z, n: n, seam: seam });
  }
  // A line from vectors already worked out, as prepareLine() makes one from coordinates.
  function lineOf(X, Y, Z, n) {
    var sx = 0, sy = 0, sz = 0;
    for (var k = 0; k < n; k++) { sx += X[k]; sy += Y[k]; sz += Z[k]; }
    var cap = capOf(X, Y, Z, n, sx, sy, sz);
    cap.x = X; cap.y = Y; cap.z = Z; cap.n = n;
    return cap;
  }
  // A run of arcs (as topojson joins them: each arc's first point takes the place of the last point before it, and a
  // negative arc runs backwards) as one line, the same as prepareArc() makes from the run's coordinates.
  function prepareRun(topo, st, run) {
    var m = run.length, n = 0, seam = false, k, a, v, i;
    if (m === 1) { var kept = run[0] < 0 ? st.rev[~run[0]] : st.one[run[0]]; if (kept) return kept; }
    for (k = 0; k < m; k++) { a = run[k]; v = arcVec(topo, st, a < 0 ? ~a : a); n += v.n - (k ? 1 : 0); if (v.seam) seam = true; }
    var line;
    if (seam) {
      var pts = [];
      for (k = 0; k < m; k++) {
        a = run[k];
        var ap = arcPoints(topo, a < 0 ? ~a : a);
        if (pts.length) pts.pop();
        if (a < 0) ap.reverse();
        for (i = 0; i < ap.length; i++) pts.push(ap[i]);
      }
      line = pts.length >= 2 ? prepareArc(pts) : null;
    } else if (n < 2) line = null;
    else {
      var X = new Float64Array(n), Y = new Float64Array(n), Z = new Float64Array(n), at = 0;
      for (k = 0; k < m; k++) {
        a = run[k]; v = st.vec[a < 0 ? ~a : a];
        if (k) at--;
        if (a < 0) { for (i = v.n - 1; i >= 0; i--, at++) { X[at] = v.x[i]; Y[at] = v.y[i]; Z[at] = v.z[i]; } }
        else { X.set(v.x, at); Y.set(v.y, at); Z.set(v.z, at); at += v.n; }
      }
      line = lineOf(X, Y, Z, n);
    }
    if (m === 1 && line) { if (run[0] < 0) st.rev[~run[0]] = line; else st.one[run[0]] = line; }
    return line;
  }
  // The arcs given, joined end to end into runs where they meet, as topojson.mesh() joins them (arcs in the order of their
  // numbers, each turned the way it was first met).
  // This is topojson's own joining (stitch, in topojson-client 3), step for step, so the runs and their order are the same,
  // but with each arc's two ends looked up as numbers worked out once for the file: topojson adds up every point of
  // every arc to find its end and keys the ends by their text, which was most of what a new date still cost.
  function arcRuns(topo, arcs) {
    if (!arcs.length) return [];
    var st = arcStore(topo), E = st.ends === undefined ? (st.ends = arcEnds(topo)) : st.ends;
    if (!E) return topojson.meshArcs(topo, { type: "LineString", arcs: arcs }).arcs;
    arcs = arcs.slice();
    var byStart = new Map(), byEnd = new Map(), runs = [], done = new Set(), empty = -1, j, i, t, f, g;
    for (j = 0; j < arcs.length; j++) {
      i = arcs[j];
      if (E.empty[i < 0 ? ~i : i]) { t = arcs[++empty]; arcs[empty] = i; arcs[j] = t; }
    }
    for (j = 0; j < arcs.length; j++) {
      i = arcs[j];
      var start = i < 0 ? E.b[~i] : E.a[i], end = i < 0 ? E.a[~i] : E.b[i];
      if ((f = byEnd.get(start))) {
        byEnd.delete(f.end);
        f.push(i);
        f.end = end;
        if ((g = byStart.get(end))) {
          byStart.delete(g.start);
          var fg = g === f ? f : f.concat(g);
          fg.start = f.start; fg.end = g.end;
          byEnd.set(fg.end, fg); byStart.set(fg.start, fg);
        } else { byEnd.set(f.end, f); byStart.set(f.start, f); }
      } else if ((f = byStart.get(end))) {
        byStart.delete(f.start);
        f.unshift(i);
        f.start = start;
        if ((g = byEnd.get(start))) {
          byEnd.delete(g.end);
          var gf = g === f ? f : g.concat(f);
          gf.start = g.start; gf.end = f.end;
          byEnd.set(gf.end, gf); byStart.set(gf.start, gf);
        } else { byEnd.set(f.end, f); byStart.set(f.start, f); }
      } else {
        f = [i];
        f.start = start; f.end = end;
        byEnd.set(end, f); byStart.set(start, f);
      }
    }
    var flush = function (from, other) {
      from.forEach(function (f) {
        other.delete(f.start);
        delete f.start; delete f.end;
        for (var q = 0; q < f.length; q++) done.add(f[q] < 0 ? ~f[q] : f[q]);
        runs.push(f);
      });
    };
    flush(byEnd, byStart);
    flush(byStart, byEnd);
    for (j = 0; j < arcs.length; j++) if (!done.has(arcs[j] < 0 ? ~arcs[j] : arcs[j])) runs.push([arcs[j]]);
    return runs;
  }
  // Each arc's first and last point as one number each (the file's points are whole numbers on a grid), and whether the
  // arc is empty as topojson counts it; null for a file whose points are not on such a grid, which topojson then joins.
  function arcEnds(topo) {
    if (!topo.transform) return null;
    var n = topo.arcs.length, a = new Float64Array(n), b = new Float64Array(n), empty = new Uint8Array(n), M = 4194304;
    for (var i = 0; i < n; i++) {
      var arc = topo.arcs[i], x = 0, y = 0;
      if (!arc.length) return null;
      for (var k = 0; k < arc.length; k++) { x += arc[k][0]; y += arc[k][1]; }
      var x0 = arc[0][0], y0 = arc[0][1];
      if (!(x0 >= 0 && x0 < M && y0 >= 0 && y0 < M && x >= 0 && x < M && y >= 0 && y < M) || x0 % 1 || y0 % 1 || x % 1 || y % 1) return null;
      a[i] = x0 * M + y0; b[i] = x * M + y;
      empty[i] = arc.length < 3 && arc.length > 1 && !arc[1][0] && !arc[1][1] ? 1 : 0;
    }
    return { a: a, b: b, empty: empty };
  }
  // How a date's shapes use the file's arcs: for each arc, the first and the last shape that has it (by their place in the
  // snapshot, -1 where no shape has it), the way round it was first met, and how many times it is met in all; and the arcs
  // in the order they were first met. The arrays belong to the file and are filled again for each date, so what is
  // returned is good only until the next call for the same file.
  function arcUse(topo, geoms) {
    var st = arcStore(topo), u = st.use;
    if (!u) { var n = topo.arcs.length; u = st.use = { n: n, first: new Int32Array(n), last: new Int32Array(n), sign: new Int32Array(n), count: new Uint16Array(n), seen: [] }; }
    var first = u.first, last = u.last, sign = u.sign, count = u.count, seen = u.seen, gi = 0;
    first.fill(-1); last.fill(-1); count.fill(0); seen.length = 0;
    var walk = function (a) {
      if (typeof a === "number") {
        var i = a < 0 ? ~a : a;
        if (first[i] < 0) { first[i] = gi; sign[i] = a; seen.push(i); }
        last[i] = gi;
        if (count[i] < 65535) count[i]++;
        return;
      }
      for (var k = 0; k < a.length; k++) walk(a[k]);
    };
    for (; gi < geoms.length; gi++) { var g = geoms[gi]; if (g && g.arcs && (g.type === "Polygon" || g.type === "MultiPolygon")) walk(g.arcs); }
    return u;
  }
  // An outside arc's stretches along the coast and inland, as lines. They hold until the coast grid is next rebuilt.
  function arcSplit(topo, st, i) {
    if (st.grid !== coastGrid || st.base !== gridBase || st.tag !== gridTag) { st.split = []; st.grid = coastGrid; st.base = gridBase; st.tag = gridTag; }
    var sp = st.split[i];
    if (sp) return sp;
    sp = st.split[i] = { coastal: [], inner: [] };
    var pts = arcPoints(topo, i), same = true;
    for (var k = 1; k < pts.length && same; k++) if (pts[k][0] !== pts[0][0] || pts[k][1] !== pts[0][1]) same = false;
    if (same) return sp;
    var v = arcVec(topo, st, i);
    var piece = function (a, b) {
      if (v.seam) return prepareArc(pts.slice(a, b));
      return lineOf(v.x.slice(a, b), v.y.slice(a, b), v.z.slice(a, b), b - a);
    };
    coastSpans(pts, function (a, b) { sp.inner.push(piece(a, b)); }, function (a, b) { sp.coastal.push(piece(a, b)); });
    return sp;
  }
  function useLevel() {
    var S = localScale();
    return (!moving && S >= 900) || S >= 2600 ? "hi" : "lo";
  }

  var reliefCanvas = document.createElement("canvas"), relief = null, reliefTried = false, RELIEF_RES = 0.5, RELIEF_MOVING = 0.5, RELIEF_MOVING_PART = 0.5, reliefRes = RELIEF_RES, reliefKey = "", reliefPart = null;
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
  // The terrain's canvas is sized for the pixels the map is drawn at now: while the map moves on a slow device it is drawn at a
  // lower resolution (dpr drops in frame()), and a canvas left at the full size put the terrain in the wrong place.
  // While the map moves, the terrain is drawn at half its width and height (RELIEF_MOVING_PART), a quarter of its pixels, into
  // the bottom left of its canvas, and stretched over the map from there (reliefPart, the part's place in the canvas's image).
  // The canvas keeps its size, since resizing a WebGL canvas at each end of a drag made the browser wait for the graphics card.
  // A copy of sat.js from before 23 November 2026, kept by a browser, has no parts and draws the terrain in full as before.
  function renderRelief() {
    var res = moving ? RELIEF_MOVING : RELIEF_RES;
    if (res !== reliefRes || reliefCanvas.width !== Math.max(1, Math.round(W * dpr * res)) || reliefCanvas.height !== Math.max(1, Math.round(H * dpr * res))) sizeRelief(res);
    var part = moving && !skip.sharp && relief.parts ? RELIEF_MOVING_PART : 1, pw = Math.max(1, Math.round(reliefCanvas.width * part)), ph = Math.max(1, Math.round(reliefCanvas.height * part));
    var key = [flat ? 1 : 0, view.lon, view.lat, view.zoom, view.roll, W, H, layoutEpoch, dpr, reliefRes, part, rd.gen, rd.put.size, rd.rect ? 1 : 0].join();
    if (key === reliefKey) return;
    reliefKey = key;
    reliefPart = part < 1 ? [0, reliefCanvas.height - ph, pw, ph] : null;
    var o = { flat: flat, dpr: dpr * reliefRes * part, light: 0, sepia: 0, detail: !!rd.rect && !rd.off, cx: cx, cy: cy, w: pw, h: ph };
    if (flat) { o.k = FB.k; o.xc = FB.xc; o.yc = FB.yc; o.wrap = !!FB.wrap; o.spin = !!FB.spin; }
    else { o.e = [B.ex, B.ey, B.ez]; o.n = [B.nx, B.ny, B.nz]; o.c = [B.cx, B.cy, B.cz]; o.r = B.r; }
    relief.draw(o);
  }
  var rd = { key: "", rect: null, cache: new Map(), gen: 0, put: new Set(), off: false, failed: 0, ok: 0, used: 0 };
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
    var key = [flat ? 1 : 0, view.lon.toFixed(3), view.lat.toFixed(3), view.zoom.toFixed(4), view.roll.toFixed(3), W, H, layoutEpoch].join();
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
    rd.used = performance.now();
    if (rd.cache.size > RELIEF_KEEP) { var it = rd.cache.keys(); while (rd.cache.size > RELIEF_KEEP * 0.8) { var nk = it.next(); if (nk.done) break; if (!rd.put.has(nk.value)) rd.cache.delete(nk.value); else break; } }
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
  var ISLAND_PX = 1.6, RIPPLE_PX = 9, BLEED_KM = 20, BAND_ISLAND = 2.5, BAND_RES = 0.5, BAND_MOVING = 0.22, BAND_MOVING_MIN = 0.35;
  var canOff = typeof OffscreenCanvas === "function";
  var bandCanvas = canOff ? new OffscreenCanvas(1, 1) : document.createElement("canvas"), bandCtx = bandCanvas.getContext("2d"), bandKey = "", bandImage = null, bandOld = null, bandFill = null;
  var maskCanvas = canOff ? new OffscreenCanvas(1, 1) : document.createElement("canvas"), maskCtx = maskCanvas.getContext("2d"), maskKey = "";
  function drawCoastBand(id, paintFills, list, landPath, kp, line, alpha, peopleBleed, peoplePath, unnamedPath, bleed) {
    var n = landCount(list, kp, line * BAND_ISLAND), m = landCount(list, kp, ISLAND_PX);
    if (!m) return;
    // While the map moves the band is painted coarser (0.35 of the screen's points at 1x, 0.44 at 2x; 0.5 and 0.7 before
    // 23 November 2026): the layer is painted anew every frame of a drag, and its cost falls with its size.
    var res = moving ? (skip.sharp ? Math.max(0.5, dpr * 0.35) : Math.max(BAND_MOVING_MIN, dpr * BAND_MOVING)) : Math.max(1, dpr * BAND_RES);
    var vkey = [flat ? 1 : 0, view.lon, view.lat, view.zoom, view.roll, W, H, layoutEpoch, res, line, n, m, list === land.hi ? 1 : list === land.fine ? 2 : 0, landTag].join();
    if (vkey !== maskKey) paintCoastMask(list, landPath, n, m, line, res);
    maskKey = vkey;
    var key = id + "|" + vkey;
    if (key !== bandKey) paintCoastBand(paintFills, peopleBleed, peoplePath, unnamedPath, bleed, res);
    bandKey = key;
    ctx.save();
    var k = ctx.canvas.width / bandCanvas.width;
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
  // Every island gets the mainland's band, at the mainland's width (24 November 2026): until then an island under
  // BAND_ISLAND bands across was tinted all over instead, so Corsica or Crete, seen across the Mediterranean, read as solid
  // colour with no border, and for a few hours that day such islands got a narrower band of their own.
  function paintCoastMask(list, landPath, n, m, line, res) {
    var k = resetLayer(maskCanvas, res);
    k.beginPath(); traceCoast(k, list, m); k.lineWidth = line; k.strokeStyle = "#000"; k.stroke();
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
    // While moving, every frame is new, so the sea is drawn straight onto the map rather than kept.
    if (moving) { seaKey = ""; ctx.save(); paintSea(coast, S); ctx.restore(); return; }
    var key = [flat ? 1 : 0, view.lon, view.lat, view.zoom, view.roll, W, H, layoutEpoch, dpr, moving ? 1 : 0, sea ? 1 : 0, coast === land.hi ? 1 : coast === land.fine ? 2 : 0, landTag].join();
    if (key !== seaKey) {
      seaKey = key;
      if (seaCanvas.width !== ctx.canvas.width || seaCanvas.height !== ctx.canvas.height) { seaCanvas.width = ctx.canvas.width; seaCanvas.height = ctx.canvas.height; }
      var main = ctx;
      ctx = seaCtx;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      paintSea(coast, S);
      ctx = main;
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(seaCanvas, 0, 0);
    ctx.restore();
  }

  function paintSea(coast, S) {
    ctx.lineJoin = "round";
    ctx.beginPath(); traceSphere(ctx); ctx.fillStyle = pal.ocean; ctx.fill();
    ctx.save();
    ctx.beginPath(); traceSphere(ctx); ctx.clip();
    if (sea) { ctx.beginPath(); traceAll(ctx, S < 900 ? sea.low : sea.high); ctx.fillStyle = pal["ocean-deep"]; ctx.fill(); }
    if (layers.grid) { ctx.beginPath(); traceArcs(ctx, graticule); ctx.strokeStyle = pal.grat; ctx.lineWidth = 0.6; ctx.stroke(); }
    if (!skip.ripples) drawWaterLines(coast, S);
    ctx.restore();
  }
  var placedLabels = [];
  function draw() {
    if (!ready || !current) return;
    if (perf) { if (perf.gpu) try { ctx.getImageData(0, 0, 1, 1); } catch (e) {} perf.cur = performance.now(); }
    snapNow();
    applyView();
    anchorStripes(false);
    var S = localScale(), kp = kmPx(), key = useLevel();
    var snap = current, L = level(snap, key);
    var landList = landAt(landKey(key));
    var sig = baseSigNow(snap, L, landList, S);
    if (sig && sameBase(sig, baseSig)) pasteBase();
    else { drawBase(snap, L, key, S, kp, landList); keepBase(sig); }
    if (perf) pmark("finish");
    placedLabels = [];
    labelFresh = false;
    var placed = fixedBoxes();
    if (!skip.labels) {
      reserveMarks(placed, S);
      drawPolityLabels(snap, placed, kp);
      drawSeaLabels(placed, S);
      drawLakeLabels(placed, S, kp);
      for (var ri = placed.length - 1; ri >= 0; ri--) if (placed[ri].res) placed.splice(ri, 1);
      drawPlaces(placed, S);
      drawRiverLabels(placed, S);
      drawDivisionLabels(placed, S);
    }
    if (perf) pmark("labels");
    syncCardDivision();
  }
  var layoutEpoch = 0, layoutSig = "", baseCanvas = null, baseCtx = null, baseSig = null, baseState = null, baseEpoch = 0, baseMode = 0, baseStats = { hits: 0, misses: 0 };
  var BASE_STATE = ["globalAlpha", "lineWidth", "lineCap", "lineJoin", "miterLimit", "strokeStyle", "fillStyle", "font", "textAlign", "textBaseline", "letterSpacing", "lineDashOffset"];
  function baseOn() { return !PLAIN && baseMode >= 0 && !exporting && !moving && ctx === mainCtx; }
  function baseSigNow(snap, L, landList, S) {
    if (!baseOn()) return null;
    if (layers.control) { var cd = ctlDay(); if (cd !== null && ctlWars(cd, true).length) return null; }
    var div = null;
    if (layers.subdivisions && S >= DIV_FROM) { var dd = divDay(); if (dd !== null) div = divRegions(dd, true).map(function (r) { return divState(r, dd); }); }
    return {
      e: baseEpoch, snap: snap, L: L, land: landList, lakes: lakes ? lakesAt() : null, rivers: rivers, riverAt: geog ? stateOf(geog.riverTimes) : -1,
      marsh: geog ? geog.marshes.map(function (m) { return inSpan(m.from, m.to) ? 1 : 0; }).join("") : "", div: div, hover: hoverId, sel: selected, lapse: lapse ? lapse.f : null,
      view: [view.lon, view.lat, view.zoom, view.roll, flat ? 1 : 0, canvas.width, canvas.height, dpr, W, H, cx, cy, baseR, baseK, freeT, freeB].join()
    };
  }
  function sameBase(a, b) {
    if (!b || a.e !== b.e || a.snap !== b.snap || a.L !== b.L || a.land !== b.land || a.lakes !== b.lakes || a.rivers !== b.rivers || a.riverAt !== b.riverAt || a.marsh !== b.marsh) return false;
    if (a.hover !== b.hover || a.sel !== b.sel || a.lapse !== b.lapse || a.view !== b.view) return false;
    if (!a.div !== !b.div) return false;
    if (a.div) {
      if (a.div.length !== b.div.length) return false;
      for (var i = 0; i < a.div.length; i++) if (a.div[i] !== b.div[i]) return false;
    }
    return true;
  }
  function keepBase(sig) {
    baseSig = null;
    if (!sig) return;
    baseStats.misses++;
    if (!baseCanvas) { baseCanvas = document.createElement("canvas"); baseCtx = baseCanvas.getContext("2d"); }
    if (baseCanvas.width !== canvas.width || baseCanvas.height !== canvas.height) { baseCanvas.width = canvas.width; baseCanvas.height = canvas.height; }
    baseCtx.globalCompositeOperation = "copy";
    baseCtx.drawImage(canvas, 0, 0);
    baseState = BASE_STATE.map(function (k) { return ctx[k]; });
    baseState.push(ctx.getLineDash());
    baseSig = sig;
  }
  function pasteBase() {
    baseStats.hits++;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "copy";
    ctx.drawImage(baseCanvas, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    BASE_STATE.forEach(function (k, i) { ctx[k] = baseState[i]; });
    ctx.setLineDash(baseState[BASE_STATE.length]);
    syncKey();
    syncWars();
  }
  function restBase() {
    if (!baseCanvas || playTimer || rangeActive || lapse) return;
    baseSig = null;
    if (baseCanvas.width > 1) { baseCanvas.width = 1; baseCanvas.height = 1; }
  }
  function drawBase(snap, L, key, S, kp, landList) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = "round"; ctx.lineCap = "round";

    if (!flat && B.r * 1.07 < Math.hypot(W, H) && !discCovers(B.r)) {
      var glow = ctx.createRadialGradient(cx, cy, B.r, cx, cy, B.r * 1.07);
      glow.addColorStop(0, pal.glow); glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, cy, B.r * 1.07, 0, TAU); ctx.arc(cx, cy, B.r, 0, TAU, true); ctx.fill();
    }
    drawSea(landList, S);
    if (perf) pmark("sea");

    if (flat) { ctx.save(); ctx.beginPath(); traceOutline(ctx); ctx.clip(); }
    var nLand = landCount(landList, kp, ISLAND_PX);
    var landPath = new Path2D();
    for (var li = 0; li < nLand; li++) traceFeature(landPath, landList[li]);
    ctx.save();
    ctx.clip(landPath);
    ctx.fillStyle = pal.paper; ctx.fillRect(0, 0, W, H);
    var groupPaths = [], bleedPaths = [], c;
    for (c = 0; c < nColors(); c++) {
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
        for (c = 0; c < nColors(); c++) if (bleedPaths[c]) { g.strokeStyle = colors[c]; g.stroke(bleedPaths[c]); }
      }
      for (c = 0; c < nColors(); c++) if (groupPaths[c]) { g.fillStyle = colors[c]; g.fill(groupPaths[c]); }
    };
    paintFills(ctx, pal.colors);
    if (perf) pmark("land");
    L.disputes.forEach(function (d) {
      var dp = new Path2D(); traceAll(dp, d.feats);
      ctx.fillStyle = stripes(d.cols); ctx.fill(dp);
    });
    if (bleed > 0.6) { ctx.strokeStyle = pal["people-fill"]; ctx.lineWidth = bleed; ctx.stroke(peopleBleed); }
    ctx.fillStyle = pal["people-fill"]; ctx.fill(peoplePath);
    ctx.fillStyle = pal.paper; ctx.fill(unnamedPath);
    var held = paintHeld(snap, L), outside = null;
    if (held) {
      outside = new Path2D(); outside.rect(-10, -10, W + 20, H + 20); outside.addPath(held);
    }
    // On a phone or a touch screen the terrain is left out while the map moves, which keeps dragging smooth, and comes back
    // when it stops; on a computer it moves with the map.
    if (layers.relief && reliefReady() && !(moving && touchMap()) && !skip.relief) {
      renderRelief();
      ctx.save();
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = 0.72;
      if (reliefPart) ctx.drawImage(reliefCanvas, reliefPart[0], reliefPart[1], reliefPart[2], reliefPart[3], 0, 0, W, H);
      else ctx.drawImage(reliefCanvas, 0, 0, W, H);
      ctx.restore();
    }
    if (perf) pmark("relief");
    var bw = bandWidth(S), softMap = !!snap.soft || (snap.year !== null && snap.year < SOFT_BEFORE);
    var bandAlpha = softMap ? 0.4 : 0.6, bandLine = bw * (softMap ? 3 : 2);
    if (outside) { ctx.save(); ctx.clip(outside, "evenodd"); }
    for (c = 0; c < nColors(); c++) {
      if (!groupPaths[c] || !L.bands[c] || skip.bands) continue;
      ctx.save();
      ctx.clip(groupPaths[c]);
      ctx.beginPath(); traceArcs(ctx, L.bands[c]);
      ctx.globalAlpha = bandAlpha;
      ctx.strokeStyle = pal.bands[c]; ctx.lineWidth = bandLine; ctx.lineCap = "round"; ctx.stroke();
      ctx.restore();
    }
    if (outside) ctx.restore();
    var hp = hoverId >= 0 ? snap.byId.get(hoverId) : null, sp = selected >= 0 ? snap.byId.get(selected) || (isGroupIn(snap, selected) ? { id: selected, group: true } : null) : null;
    var unheld = null;
    var tint = function (id, color, grp) {
      if (bleed > 0.6) {
        if (!unheld) {
          unheld = new Path2D();
          unheld.rect(-10, -10, W + 20, H + 20);
          for (c = 0; c < nColors(); c++) if (groupPaths[c]) unheld.addPath(groupPaths[c]);
          unheld.addPath(peoplePath); unheld.addPath(unnamedPath);
        }
        ctx.save();
        ctx.clip(unheld, "evenodd");
        ctx.beginPath(); traceArcs(ctx, coastOf(L, id));
        ctx.lineWidth = bleed; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = color; ctx.stroke();
        ctx.restore();
      }
      ctx.beginPath(); tracePolity(snap, L, id, grp); ctx.fillStyle = color; ctx.fill();
    };
    if (hp && hp !== sp) tint(hp.id, pal.hover);
    if (sp) tint(sp.id, "rgba(140,42,26,0.12)", sp.group);
    ctx.restore();
    if (outside) { ctx.save(); ctx.clip(outside, "evenodd"); }
    if (perf) pmark("bands");
    if (!skip.coastband) drawCoastBand(snap.n + "|" + key, paintFills, landList, landPath, kp, bandLine, bandAlpha, peopleBleed, peoplePath, unnamedPath, bleed);
    if (outside) ctx.restore();

    if (perf) pmark("coast band");
    if (!skip.water) {
      drawMarshes(kp, landPath);
      drawRivers(S, landPath);
      drawLakes(kp);
    }

    if (perf) pmark("water");
    drawDivisionLines(snap, L, landPath, S);
    drawControl(landPath, S);
    syncKey();
    syncWars();
    var lw = lineWeight(S);
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath(); traceCoast(ctx, landList, nLand); ctx.strokeStyle = pal.border; ctx.lineWidth = 0.75 + 0.35 * lw; ctx.stroke();
    ctx.save();
    ctx.clip(landPath);
    ctx.beginPath(); traceArcs(ctx, L.kin); ctx.globalAlpha = 0.55; ctx.strokeStyle = pal.border; ctx.lineWidth = 0.6 + 0.3 * lw; ctx.stroke();
    if (layers.subdivisions && L.member && L.member.length) {
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
    ctx.restore();
    if (sp) drawSelected(snap, L, sp.id, sp.group);
    if (lapse) drawLapseWash(snap, L, landPath);
    if (flat) ctx.restore();

    if (perf) pmark("borders");
    if (!skip.aging) drawAging(S);
    ctx.strokeStyle = pal.limb;
    if (flat) {
      ctx.beginPath(); traceOutline(ctx, 0); ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); traceOutline(ctx, 5); ctx.lineWidth = 2.4; ctx.stroke();
    } else {
      if (!discCovers(B.r - 2)) drawRing();
    }

  }
  // The globe is held in a brass meridian ring, as on an armillary: a band between two dark edges, lit along its inner
  // side and shaded along its outer, with a tick engraved every five degrees (longer at every ten, longest at every
  // thirty). The ticks are fixed to the ring, not to the globe, so they stay still as the globe turns. The ring lies
  // in the 14 px the layout already leaves round the globe (baseR, in layout), a little slimmer on a small globe, so the
  // map is no smaller for it; the flat map keeps its ruled frame. It is part of the map's canvas, so a saved image and
  // a video carry it. A frame costs six strokes: the band's one gradient and the ticks' one path are kept until the
  // globe's centre or radius, the ring's colours (a change of palette), or the canvas being drawn on, changes.
  var ringTicks = null, ringGrad = null, ringKey = "", ringCtx = null;
  function drawRing() {
    var r = B.r, w = Math.max(5, Math.min(8, r * 0.022)), r0 = r + 0.6, r1 = r0 + w, key = [cx, cy, r, pal.ring, pal["ring-hi"], pal["ring-lo"]].join();
    if (key !== ringKey || ctx !== ringCtx) {
      ringTicks = new Path2D();
      for (var i = 0; i < 72; i++) {
        var a = i * TAU / 72, c = Math.cos(a), s = Math.sin(a), ra = r1 - 0.9, rb = ra - w * (i % 6 === 0 ? 0.74 : i % 2 === 0 ? 0.52 : 0.3);
        ringTicks.moveTo(cx + ra * c, cy + ra * s); ringTicks.lineTo(cx + rb * c, cy + rb * s);
      }
      // Lit from the upper left, like the bezels on the page.
      ringGrad = ctx.createLinearGradient(cx - r1 * 0.7, cy - r1 * 0.7, cx + r1 * 0.7, cy + r1 * 0.7);
      ringGrad.addColorStop(0, pal["ring-hi"]); ringGrad.addColorStop(0.42, pal.ring); ringGrad.addColorStop(1, pal["ring-lo"]);
      ringKey = key; ringCtx = ctx;
    }
    ctx.lineCap = "butt";
    ctx.beginPath(); ctx.arc(cx, cy, (r0 + r1) / 2, 0, TAU); ctx.lineWidth = w; ctx.strokeStyle = ringGrad; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r0 + 1.3, 0, TAU); ctx.lineWidth = 1; ctx.strokeStyle = pal["ring-hi"]; ctx.globalAlpha = 0.75; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r1 - 1.1, 0, TAU); ctx.lineWidth = 1.2; ctx.strokeStyle = pal["ring-lo"]; ctx.globalAlpha = 0.6; ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = pal["ring-edge"];
    ctx.lineWidth = 0.9; ctx.stroke(ringTicks);
    ctx.beginPath(); ctx.arc(cx, cy, r0, 0, TAU); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r1, 0, TAU); ctx.lineWidth = 1.1; ctx.stroke();
    // Left as the limb's two rules left it, for whatever is drawn next.
    ctx.lineCap = "round"; ctx.strokeStyle = pal.limb; ctx.lineWidth = 0.8;
  }
  function coastOf(L, id) {
    if (!L.coastOf) L.coastOf = new Map();
    var hit = L.coastOf.get(id);
    if (hit) return hit;
    if (!L.arcUse) {
      L.arcUse = new Map();
      L.geoms.forEach(function (g) {
        var seen = new Set();
        var walk = function (a) { if (typeof a === "number") { var i = a < 0 ? ~a : a; if (!seen.has(i)) { seen.add(i); L.arcUse.set(i, (L.arcUse.get(i) || 0) + 1); } else L.arcUse.set(i, 2); } else if (a) for (var k = 0; k < a.length; k++) walk(a[k]); };
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
  // The selected state is ruled along its outside edge only, just beyond its border, so the seams between its pieces
  // (where its borders are exact and where they are approximate, or where a stretch of it ends sooner) do not cut it into
  // regions of their own.
  function drawSelected(snap, L, id, grp) {
    var shape = new Path2D();
    for (var i = 0; i < snap.polys.length; i++) { var p = snap.polys[i]; if (p && (p.id === id || grp && p.member === id)) traceAll(shape, L.feats[i]); }
    var outside = new Path2D();
    outside.rect(-10, -10, W + 20, H + 20);
    outside.addPath(shape);
    ctx.save();
    ctx.beginPath();
    if (flat) traceOutline(ctx); else traceDisc(ctx, B.r);
    ctx.clip();
    ctx.clip(outside, "evenodd");
    ctx.strokeStyle = pal.select; ctx.lineWidth = 3.6; ctx.lineJoin = "round";
    ctx.stroke(shape);
    ctx.restore();
  }
  function tracePolity(snap, L, id, grp) {
    for (var i = 0; i < snap.polys.length; i++) { var p = snap.polys[i]; if (p && (p.id === id || grp && p.member === id)) traceAll(ctx, L.feats[i]); }
  }

  function drawAging(S) {
    var amt = clamp01((6000 - S) / 3500);
    ctx.save();
    ctx.beginPath();
    if (flat) traceOutline(ctx); else if (!discCovers(B.r)) ctx.arc(cx, cy, B.r, 0, TAU); else ctx.rect(-2, -2, W + 4, H + 4);
    if (flat || !discCovers(B.r)) ctx.clip();
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
      ctx.beginPath(); traceDisc(ctx, r); ctx.fill();
      ctx.globalCompositeOperation = "screen";
      var hl = ctx.createRadialGradient(cx - r * 0.38, cy - r * 0.42, 0, cx - r * 0.38, cy - r * 0.42, r * 0.55);
      hl.addColorStop(0, "rgba(255,248,226,0.2)"); hl.addColorStop(1, "rgba(255,248,226,0)");
      ctx.fillStyle = hl;
      ctx.beginPath(); traceDisc(ctx, r); ctx.fill();
    }
    ctx.restore();
  }

  function drawLakes(kp) {
    if (!layers.water) return;
    if (!lakes) {
      if (!lakesLoad) lakesLoad = fetchJSON(UC + "data/lakes.json").then(function (rows) {
        lakes = rows.map(function (r) { return { name: r[0], km2: r[1], lon: r[2], lat: r[3], coords: r[4], f: prepare({ type: "MultiPolygon", coordinates: r[4] }) }; });
        bigLakes = rows.filter(function (r) { return r[1] >= BIG_LAKE_KM2; }).map(function (r, i) {
          var b = [180, 90, -180, -90];
          r[4].forEach(function (poly) { poly[0].forEach(function (v) { b = [Math.min(b[0], v[0]), Math.min(b[1], v[1]), Math.max(b[2], v[0]), Math.max(b[3], v[1])]; }); });
          return { id: "L" + i, b: b, coords: r[4], key: r[0] + "|" + r[1] };
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
  function drawRivers(S, landPath) {
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
    // Only on the land of the date, so a river doesn't run across water that the coastline takes in then
    // (the Fens before they were drained, the Zuiderzee).
    if (landPath) ctx.clip(landPath);
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

  var geog = null, geogLoad = null, landTag = "", gridTag = "", gridBase = "lo", hiGridMs = -1, landCache = new Map(), riverTopo = null;
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
  var fineRaw = null;
  function patchesFor(key, g) {
    var byKey = new Map();
    land[key].forEach(function (p) { var r = p.geo.coordinates[0]; byKey.set(r.length + "," + r[0][0] + "," + r[0][1], p); });
    return ((key === "fine" ? fineRaw : g.land[key]) || []).map(function (q, i) {
      q.id = key + i; q.base = byKey.get(q.k.join()) || null;
      return q;
    }).filter(function (q) { return q.base; });
  }
  var FINE_S = 5000, fineLoad = null, geogRaw = null, fineGridMs = -1;
  function coastKey() { return gridBase; }
  // The grid is rebuilt from the land of the date shown when the rebuild starts, patches and all, so its tag names those
  // patches: syncGrid() then redoes only what has changed since. The map is drawn from the grid before until it is ready.
  function upgradeGrid(k, then) {
    var t0 = performance.now(), land0 = datedLand(k);
    buildCoastGridSlowly(land0.list, function (grid) {
      if (!grid) return;
      coastGrid = grid;
      gridBase = k; gridTag = k + "," + land0.tag;
      then(Math.round(performance.now() - t0));
    });
  }
  function loadFine() {
    if (fineLoad) return;
    var patches = fetchJSON("data/geography-fine.json").catch(function (e) { console.warn("fine geography", e); return null; });
    fineLoad = Promise.all([fetchJSON("data/land-detail.json"), patches]).then(function (r) {
      var t = r[0];
      fineRaw = r[1] && r[1].land ? r[1].land.fine : [];
      land.fine = prepLand(t);
      if (geog && geogRaw) geog.land.fine = patchesFor("fine", geogRaw);
      landCache.clear();
      setTimeout(function () {
        upgradeGrid(land.fine && (!geog || geog.land.fine) ? "fine" : "hi", function (ms) { fineGridMs = ms; scheduleRender(); });
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
      var at = lakeAnchor(r[4]);
      out.lakeAdd.push({ id: "w" + i, name: r[0], km2: r[1], from: r[2], to: r[3], added: true, b: b, lon: at[0], lat: at[1], coords: r[4], f: prepare({ type: "MultiPolygon", coordinates: r[4] }) });
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
    var ck = coastKey(), act = activePatches(ck), wet = geog.lakeAdd.filter(function (l) { return inSpan(l.from, l.to); }).concat(bigLakes.filter(function (l) { var s = geog.lakeOnly.get(l.key); return !s || inSpan(s[0], s[1]); }));
    var tag = ck + "," + act.map(function (q) { return q.id; }).concat(wet.map(function (l) { return l.id; })).join();
    if (tag === gridTag) return;
    var was = gridTag.split(","), list = datedLand(ck).list;
    var near = function (b) {
      var m = 1;
      return list.filter(function (p) {
        if (!p.bb) { p.bb = [180, 90, -180, -90]; p.geo.coordinates[0].forEach(function (v) { p.bb = [Math.min(p.bb[0], v[0]), Math.min(p.bb[1], v[1]), Math.max(p.bb[2], v[0]), Math.max(p.bb[3], v[1])]; }); }
        return p.bb[0] <= b[2] + m && b[0] - m <= p.bb[2] && p.bb[1] <= b[3] + m && b[1] - m <= p.bb[3];
      });
    };
    // Only the patches that have come or gone since the grid was last brought up to date are redone: each is worked out
    // afresh from all the land near it, so the patches that stand as they were are already right.
    geog.land[ck].forEach(function (q) { if ((act.indexOf(q) >= 0) !== (was.indexOf(q.id) >= 0)) buildCoastGrid(near(q.b), q.b); });
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
        if (ring.length) path.lineTo((ring[0][0] + 180) * k - gx, (90 - ring[0][1]) * k - gy);
      });
    });
    g.fillStyle = "#000"; g.fill(path, "evenodd");
    g.lineJoin = "round"; g.lineCap = "round"; g.lineWidth = 2 * r; g.strokeStyle = "#000"; g.stroke(path);
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
  function divNameL(k, n) { return (PL.div && PL.div[k + "|" + n]) || n; }
  function lakeNameL(n) { return (PL.lake && PL.lake[n]) || n; }
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
    var byRank = [[], [], [], [], [], [], []], drop = geog ? geog.riverDrop : null, named = new Map();
    topojson.feature(t, t.objects.rivers).features.forEach(function (f, i) {
      var rk = f.properties && f.properties.r, d = drop && drop.get(i), c = f.geometry && f.geometry.coordinates;
      if (d && c && c.length === d[1] && c[0][0] === d[2] && c[0][1] === d[3]) return;
      if (!(rk >= 1 && rk <= 6)) return;
      var lines = prepareLines(f.geometry);
      byRank[rk] = byRank[rk].concat(lines);
      var n = f.properties.n;
      if (!n || !lines.length) return;
      if (!named.has(n)) named.set(n, { name: n, r: rk, lines: [] });
      var e = named.get(n);
      e.lines = e.lines.concat(lines); e.r = Math.min(e.r, rk);
    });
    byRank.names = Array.from(named.values());
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
        gridBase: gridBase,
        hiGridMs: hiGridMs,
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
    var text = people ? name : name.toLocaleUpperCase(LANG);
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
    [$("head"), $("ctls"), $("card"), $("time"), $("key"), $("wars"), $("changes")].forEach(function (el) {
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
      if (b.y <= y0 - k * HALF_PI + 3 || b.y + b.h >= y0 + k * HALF_PI - 3) return false;
      return FB.wrap || (b.x > cx - k * Math.PI + 3 && b.x + b.w < cx + k * Math.PI - 3);
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
  function flatRing(rg, tol, only) {
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
      if (only !== undefined && s !== only) continue;
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
        // A world turned in its frame cuts the shapes across its seam, so each copy that reaches the frame is a ring.
        for (var sc = flat && FB.spin ? -1 : 0; sc <= (flat && FB.spin ? 1 : 0); sc++) {
          r = flat ? flatRing(f.rings[j], tol, FB.spin ? sc : undefined) : globeRing(f.rings[j], tol);
          if (r && r.x1 > 0 && r.x0 < W && r.y1 > 0 && r.y0 < H && r.x1 - r.x0 + r.y1 - r.y0 > minSize) rings.push(r);
        }
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
    var o = labelOptions(name, people, fm.sp)[fm.oi], dmax = fm.d, F = null, pole = fm, clear = null;
    if (wall) {
      F = prepFit(sp, wall, o.w / 2, o.h / 2, fm.ang, win);
      var r = poleOf(F, [[fm.u, fm.v], [ctr[0], ctr[1]], [0, 0]], 80, Infinity);
      if (r && r.d >= 0.85 * fm.d) { dmax = r.d; pole = { u: r.x, v: r.y, d: r.d }; }
      else {
        // The name loses more than 15% of its size by keeping clear of the capital's name, so the larger form ignores it. But
        // on the screen a name is capped at its largest size, where the two are the same size and the larger form lies across
        // the capital: it was then refused, and the name fell back to a small spot at the land's edge (Mongolia on the flat map,
        // whose shape the projection widens). The form that keeps clear is offered too, first, so it wins a tie.
        if (r && r.d >= 0.4 * fm.d) { var ac = nearCentre(F, ctr[0], ctr[1], CENTRE_KEEP * r.d, 260) || { x: r.x, y: r.y, d: r.d }; clear = { oi: fm.oi, sp: fm.sp, ang: fm.ang, u: ac.x, v: ac.y, d: ac.d, dmax: r.d, tight: fm.tight }; }
        F = null;
      }
    }
    if (!F) F = prepFit(sp, [], o.w / 2, o.h / 2, fm.ang, win);
    var at = nearCentre(F, ctr[0], ctr[1], CENTRE_KEEP * dmax, 260) || { x: pole.u, y: pole.v, d: pole.d };
    var out = [{ oi: fm.oi, sp: fm.sp, ang: fm.ang, u: at.x, v: at.y, d: at.d, dmax: dmax, tight: fm.tight }];
    if (clear) out.unshift(clear);
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
    var top = bestOf(forms), ctr = cenLL ? planeOf(fr, cenLL[0], cenLL[1]) : [0, 0], wall = capWall(fr, capLL, top.d, sp);
    var out = [];
    forms.forEach(function (fm) { out = out.concat(centred(sp, win, name, p.people, fm, ctr, wall)); });
    var plain = bestOf(out.filter(function (fm) { return !fm.tight && !fm.pole; }), false) || out[0];
    var lazy = { p: p, name: name, capLL: capLL, sp: sp, win: win, ctr: ctr, made: new Map() };
    if (!fr.flat && !again && !reach && (Math.abs(plain.u) > RECENTER || Math.abs(plain.v) > RECENTER)) {
      var ll = planeLL(fr, plain.u, plain.v);
      return groundCand(p, name, feats, ll[0], ll[1], capLL, reach, true, cenLL) || { fr: fr, forms: out, lazy: lazy };
    }
    return { fr: fr, forms: out, lazy: lazy };
  }
  function capWall(fr, capLL, d, sp) {
    if (!capLL) return null;
    var cpt = planeOf(fr, capLL[0], capLL[1]), hc = 0.4 * d, x0 = cpt[0] - hc, x1 = cpt[0] + hc + 0.3 * capLL[2] * d, y0 = cpt[1] - hc, y1 = cpt[1] + hc;
    return x1 > sp.x0 && x0 < sp.x1 && y1 > sp.y0 && y0 < sp.y1 ? [x0, y0, x1, y0, x1, y0, x1, y1, x1, y1, x0, y1, x0, y1, x0, y0] : null;
  }
  // On a globe turned so that north isn't up, a name laid along its parallel looks slanted on the screen,
  // and past the tilt limit it can't be used at all. These forms are laid at the angle on the ground that
  // reads level on the screen, and are centred like the others, so the name stays in the middle of its land.
  var LEVEL_FROM = 0.3, LEVEL_STEP = 0.1;
  function screenTilt(fr, u, v, ang, scale) {
    var q0 = screenAt(fr, u, v, 0), q1 = screenAt(fr, u + Math.cos(ang) * 4 / scale, v + Math.sin(ang) * 4 / scale, 0);
    return Math.atan2(q1[1] - q0[1], q1[0] - q0[0]);
  }
  function levelForms(c, scale, was) {
    var z = c.lazy, fm0 = c.forms[0];
    if (!z || c.fr.flat || !fm0) return null;
    var t0 = screenTilt(c.fr, fm0.u, fm0.v, 0, scale);
    if (Math.abs(t0) <= LEVEL_FROM) return null;
    var a = t0;
    for (var it = 0; it < 2; it++) a = wrapPi(a + screenTilt(c.fr, fm0.u, fm0.v, a, scale));
    var m = was && /l(-?\d+)/.exec(was), key = m && Math.abs(a / LEVEL_STEP - +m[1]) < 1.5 ? +m[1] : Math.round(a / LEVEL_STEP), hit = z.made.get(key);
    if (hit) return hit;
    a = key * LEVEL_STEP;
    var opts = labelOptions(z.name, z.p.people), forms = fitForms(opts, z.sp, [], z.win, [[0, 0], z.ctr], a, 100), out = [];
    var top = bestOf(forms), wall = top ? capWall(c.fr, z.capLL, top.d, z.sp) : null;
    forms.forEach(function (fm) {
      centred(z.sp, z.win, z.name, z.p.people, fm, z.ctr, wall).forEach(function (f) { f.lev = key; out.push(f); });
    });
    if (z.made.size > 5) z.made.delete(z.made.keys().next().value);
    z.made.set(key, out);
    return out;
  }

  function groundKey(snap, p, name) {
    var cap = (snap.modern || snap.dated) && p.cap ? capitalNow(p.cap) : null;
    return (flat ? "f" : "g") + (p.group ? "G" : "") + name + "|" + p.label.slice(0, 6).join() + (cap ? "|" + cap[1] + "," + cap[2] : "");
  }
  function groundLayout(snap, p, name, allow) {
    labelEpoch();
    var g = p.group ? p.geoLo : snap.geoms.lo[p.i], cap = (snap.modern || snap.dated) && p.cap ? capitalNow(p.cap) : null;
    var key = groundKey(snap, p, name), hit = groundCache.get(key);
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
    hit = { key: key, cands: cands, more: cands.length && span > 0.12 ? { pts: null, grow: function (lim) {
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
    if (fr.flat) { var lam = fr.lc + fm.u / GU; sh = wrapPi(lam - FB.xc) - (lam - FB.xc); }
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
  // The shapes in view, found once per layout (in cache.vis) rather than for every box: [index, circles], where a
  // circle is [x, y, radius] on the screen, or null for a shape that may be anywhere.
  function shapesInView(L, cache) {
    if (cache.vis) return cache.vis;
    var vis = [];
    for (var i = 0; i < L.feats.length; i++) {
      var feats = L.feats[i], circles = null;
      for (var j = 0; j < feats.length; j++) {
        var f = feats[j];
        if (!inView(f)) continue;
        if (!circles) circles = [];
        if (flat || f.radius >= HALF_PI) { circles.push(null); continue; }
        circles.push([cx + B.r * (f.cx * B.ex + f.cy * B.ey + f.cz * B.ez), cy - B.r * (f.cx * B.nx + f.cy * B.ny + f.cz * B.nz), B.r * Math.sin(Math.min(f.radius, HALF_PI)) + 4]);
      }
      if (circles) vis.push([i, circles]);
    }
    cache.vis = vis;
    return vis;
  }
  function boxOnLand(L, b, cache) {
    var vis = shapesInView(L, cache);
    for (var v = 0; v < vis.length; v++) {
      var i = vis[v][0], circles = vis[v][1], feats = L.feats[i], near = false;
      for (var j = 0; j < circles.length && !near; j++) {
        var c = circles[j];
        near = !c || (c[0] + c[2] > b.x && c[0] - c[2] < b.x + b.w && c[1] + c[2] > b.y && c[1] - c[2] < b.y + b.h);
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
  var settleLabels = 0, LABEL_QUICK_MS = 8;
  function labelTarget(side, people, minF, cap) {
    return Math.max(minF, Math.min(cap, (5 + 3.6 * Math.log2(Math.max(1, side) / 10)) * (people ? 0.85 : 1)));
  }
  function formSig(fm) { return fm.oi + (fm.lev !== undefined ? "l" + fm.lev : fm.ang ? "a" : "h") + (fm.tight ? "t" : "n") + (fm.pole ? "p" : ""); }
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
      var c = G.cands[ci], ranked = [], lev = levelForms(c, scale, ci === near ? st.form : null), forms = lev ? c.forms.concat(lev) : c.forms;
      for (k = 0; k < forms.length; k++) {
        var fm = forms[k], fit = 0.88 * fm.d * scale, f = Math.min(cap, target, fit), fmax = fm.pole ? f : Math.min(cap, target, 0.88 * fm.dmax * scale), same = ci === near && st.form === formSig(fm), tilt = fm.ang;
        if (!c.fr.flat) {
          var q0 = screenAt(c.fr, fm.u, fm.v, 0), q1 = screenAt(c.fr, fm.u + Math.cos(fm.ang) * 4 / scale, fm.v + Math.sin(fm.ang) * 4 / scale, 0);
          if (q0[2] < 0.25) continue;
          tilt = Math.atan2(q1[1] - q0[1], q1[0] - q0[0]);
        }
        tilt = Math.abs(tilt);
        if (tilt > (name.length > 6 ? 0.55 : 0.65) + (same ? 0.25 : 0)) continue;
        var pen = (fm.lev !== undefined ? 0.88 : fm.ang ? 0.8 : 1) * (fm.oi ? (fm.oi === 1 ? 0.9 : 0.82) : 1) * (fm.tight ? 0.9 : 1) * (fm.pole ? 0.75 : 1) * (tilt > 0.2 ? 1.2 - tilt : 1);
        if (f < thr && !people && side >= 28 && (side >= 64 || localScale() < 600) && fit * 1.18 >= thr) { f = thr; pen *= 0.7; }
        ranked.push({ k: k, f: f, s: Math.max(f, fmax) * pen * (same ? 1.12 : 1), same: same });
      }
      var top = 0, keep = null;
      ranked.forEach(function (r) { top = Math.max(top, r.f); if (r.same) keep = r; });
      ranked.sort(function (a, b) { return b.s - a.s; });
      // While the map moves, a name keeps its form unless another would be a quarter larger, so it
      // doesn't jump about. At rest the forms are ranked as they are (the current one still has its
      // 12% bonus): zoomed in, every form reaches the largest size, and a name placed from further out
      // would otherwise stay where it was put for the wider view (South West Africa under the Angolan border).
      if (keep && keep.f * 1.25 >= top && (moving || rangeActive)) ranked = [keep].concat(ranked.filter(function (r) { return r !== keep; }));
      for (var t = 0; t < Math.min(6, ranked.length); t++) {
        var rk = ranked[t];
        if (rk.f < thr) continue;
        var fmk = forms[rk.k], o = labelOptions(name, people, fmk.sp)[fmk.oi], geo = glyphLayout(c.fr, fmk, o, rk.f, people, scale);
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
  // A pinned name (a label edit): straight, at the edit's point, at its size and angle or the layout's usual
  // ones. Nothing when the point is behind the globe or off the screen.
  function pinnedItem(p, v, kp, placed) {
    var q = projectLL(v.lon, v.lat);
    if (!q || (!flat && q[2] < 0.25)) return null;
    var name = polityNameL(p.id);
    if (!name) return null;
    var side = Math.sqrt(p.label[5]) * kp, people = !!p.people;
    var f = v.size || Math.max(people ? 8.5 : 7.5, Math.min(people ? 15 : 26, labelTarget(side, people, people ? 8.5 : 7.5, people ? 15 : 26)));
    var opts = labelOptions(name, people), o = opts[0];
    for (var k = 0; k < opts.length; k++) { o = opts[k]; if (o.w * f <= 260) break; }
    var a = (v.angle || 0) * D2R, ca = Math.cos(a), sa = Math.sin(a), spx = o.space * f;
    var lines = o.lines.map(function (text, i) {
      var off = (i - (o.lines.length - 1) / 2) * f * LINE_H;
      return { text: text, spx: spx, straight: true, mx: q[0] - sa * off, my: q[1] + ca * off, tx: ca, ty: sa, nx: sa, ny: -ca };
    });
    var box = mkBox(q[0], q[1], o.w * f / 2 + 2, o.h * f / 2 + 1, a);
    if (!insideView(box)) return null;
    return { id: p.id, name: name, people: people, band: !!p.band, f: f, pinned: true, geo: { lines: lines, boxes: [box], x: q[0], y: q[1], ang: a } };
  }
  function layoutPolities(snap, placed, kp) {
    var lv = useLevel(), L = level(snap, lv), items = [], small = [], shapes = new Map(), S = localScale(), i;
    // While the map moves, new names get LABEL_QUICK_MS of each frame; the rest are laid out when it stops.
    var quick = moving || rangeActive, t0 = performance.now(), scale = (flat ? FB.k : B.r) / GU, fk = flat ? "f" : "g", budget = quick ? LABEL_QUICK_MS : 16;
    var first = [], rest = [];
    for (i = 0; i < snap.order.length; i++) (labelState.has(snap.order[i].id) ? first : rest).push(snap.order[i]);
    var order = (snap.groups || []).concat(first, rest), seen = new Set();
    // Names pinned by a label edit go first, where the edit puts them, and the others are laid out round them.
    if (edits.labelN || devGhost) for (i = 0; i < order.length; i++) {
      var pp = order[i], pv = !seen.has(pp.id) && pp.label ? (devGhost && devGhost.target === polityOwnName(pp.id) ? devGhost : editAt("label", polityOwnName(pp.id), now)) : null;
      var pin = pv ? pinnedItem(pp, pv, kp, placed) : null;
      if (!pin) continue;
      seen.add(pp.id);
      for (var pb = 0; pb < pin.geo.boxes.length; pb++) placed.push(pin.geo.boxes[pb]);
      items.push(pin);
    }
    for (i = 0; i < order.length; i++) {
      var p = order[i], lab = p.label;
      if (!lab || lab[2] * kp < 0.5 || seen.has(p.id)) continue;
      if (!layers.subdivisions && !p.group && p.member >= 0 && p.member !== p.id && PROVINCE_OF.test(polityName(p.member))) continue;
      var name = polityNameL(p.id);
      if (!name) continue;
      var feats = p.group ? featOf(snap.topo[lv], lv, lv === "hi" ? p.geoHi : p.geoLo).prep : L.feats[p.i], any = false;
      for (var j = 0; j < feats.length && !any; j++) any = inView(feats[j]);
      if (!any) continue;
      var side = Math.sqrt(lab[5]) * kp, wh = Infinity;
      labelOptions(name, p.people).forEach(function (o) { wh = Math.min(wh, o.w * o.h); });
      var tiny = 1.1 * side / Math.sqrt(wh) < (p.people ? 8 : 7), G = tiny ? null : groundLayout(snap, p, name, !quick || performance.now() - t0 < budget);
      if (G) lastGround.set(fk + p.id, G);
      else { G = lastGround.get(fk + p.id); if (G && tiny && G.key !== groundKey(snap, p, name)) G = null; }
      var it = G ? placeGround(p, name, G, side, placed, scale) : null;
      for (var tries = 0; !it && G && G.more && side > 60 && tries < 3 && (!quick || performance.now() - t0 < budget) && G.more.grow([W * 0.08, H * 0.12, W * 0.92, H * 0.88]); tries++) it = placeGround(p, name, G, side, placed, scale);
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
        items.push({ id: sm.p.id, name: sm.name, people: false, f: 9, sea: true, dir: dirs[q], at: lonLatAt(b.cx, b.cy), geo: { lines: straightLines(lines, b.cx, b.cy, 9, 1), boxes: [b], x: b.cx, y: b.cy, ang: 0 } });
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
  // Names from sprites (23 November 2026). A name's letters were each drawn as text, outlined for the halo and then filled, under
  // a transform of their own; a graphics card draws outlined text that way very slowly (on an M2 at 2x, about 0.5 ms a letter:
  // the names took 70 to 150 ms of a frame that took 8 ms without them). Each letter, and each straight line of a name, is now
  // drawn once into a page of sprites (ink.pages), its halo and its ink apart, and stamped from there with drawImage, which
  // costs almost nothing. The halo and the ink stay two passes, so a letter's halo never covers its neighbour's ink.
  //   - Letters of names that curve (states, peoples, rivers) are kept at sizes a tenth apart (INK_STEP) and scaled down to the
  //     size wanted, by at most a tenth; a line that is drawn straight and whole (a sea, a lake, a city, a division, a state
  //     named beside its coast) is kept at its own size.
  //   - A letter's sprite is drawn at INK_SS times the screen's pixels (twice at 1x, 1.5 times at 2x), so a letter turned or
  //     scaled stays sharp; a whole line's at the screen's own pixels, since it is stamped upright and unscaled.
  //   - The letters and the lines are kept apart (two stores), since the lines come and go as the map moves: a store that
  //     fills its pages (INK_PAGES, four of 2,048 pixels square, two on a phone or tablet) is emptied and starts again.
  //   - The stores are emptied when the fonts arrive, the palette is read, or the screen's pixel ratio changes (inkReset).
  //   - A state's name is set letter by letter on a straight line as on a curved one. As text, a straight line was one
  //     string, which the browser kerns, so a name's letters shifted by a pixel or two as the globe's turning made its line
  //     straight or curved.
  // &vectortext in the address, or __chronia.textSprites(false), draws the names as text as before; "names as text" in the
  // benchmark (&bench) times it.
  var INK_PAGE = 2048, INK_PAGES = LOW_MEM ? 2 : 4, INK_STEP = 1.1, INK_MIN = 6, INK_GAP = 2, inkQ = null;
  var textSprites = !addrHas("vectortext"), textLetters = false, inkK = 0, inkFor = 0, INK_SS = 1.5;
  function inkStore() { return { pages: [], map: new Map(), page: -1, x: 0, y: 0, row: 0, flushed: 0, made: 0, k: 2 }; }
  var ink = { glyph: inkStore(), line: inkStore() };
  // With drop (a tab hidden for a while), the pages' canvases are let go as well; they are made again when a name is drawn.
  function inkReset(drop) {
    [ink.glyph, ink.line].forEach(function (st) {
      st.map.clear(); st.page = -1; st.x = st.y = st.row = 0;
      if (st.pages.length) st.flushed++;
      if (drop === true) { st.pages.forEach(function (pg) { pg.cv.width = pg.cv.height = 1; }); st.pages = []; }
    });
    inkFor = window.devicePixelRatio || 1;
    var real = Math.min(2, Math.max(1, inkFor));
    inkK = ink.glyph.k = Math.max(2, Math.round(real * INK_SS * 2) / 2);
    ink.line.k = real;
  }
  function inkPage(st) {
    st.page++;
    // Lines waiting to be stamped (inkQ) are stamped before the pages they are on are cleared.
    if (st.page >= INK_PAGES) { if (st === ink.line) inkDrain(); st.map.clear(); st.page = 0; st.flushed++; }
    var pg = st.pages[st.page];
    if (!pg) {
      var cv = document.createElement("canvas");
      cv.width = cv.height = INK_PAGE;
      pg = st.pages[st.page] = { cv: cv, g: cv.getContext("2d") };
    }
    pg.g.setTransform(1, 0, 0, 1, 0, 0);
    pg.g.clearRect(0, 0, INK_PAGE, INK_PAGE);
    st.x = st.y = st.row = 0;
    return pg;
  }
  // The size a curved name's letters are kept at: the next of the sizes a tenth apart at or above f.
  function inkSize(f) { return +(INK_MIN * Math.pow(INK_STEP, Math.max(0, Math.ceil(Math.log(f / INK_MIN) / Math.log(INK_STEP) - 1e-6)))).toFixed(2); }
  // The sprite of a text in a font (as for ctx.font), with letter spacing sp, aligned and set on its baseline as given, in a
  // colour: its ink when lw is 0, or its outline lw wide. Returns null for a text too large for a page.
  function inkSprite(st, key, text, font, sp, align, base, color, lw) {
    var sprite = st.map.get(key);
    if (sprite !== undefined) return sprite;
    if (inkFor !== (window.devicePixelRatio || 1)) inkReset();
    var pg = st.page < 0 ? inkPage(st) : st.pages[st.page], g = pg.g, k = st.k;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.font = font; g.letterSpacing = sp + "px"; g.textAlign = align; g.textBaseline = base;
    var m = g.measureText(text), pad = lw / 2 + 1.5;
    var ox = Math.ceil((m.actualBoundingBoxLeft + pad) * k), oy = Math.ceil((m.actualBoundingBoxAscent + pad) * k);
    var w = ox + Math.ceil((m.actualBoundingBoxRight + pad) * k), h = oy + Math.ceil((m.actualBoundingBoxDescent + pad) * k);
    if (!(w > 0 && h > 0) || w > INK_PAGE || h > INK_PAGE) { st.map.set(key, null); return null; }
    if (st.x + w > INK_PAGE) { st.x = 0; st.y += st.row + INK_GAP; st.row = 0; }
    if (st.y + h > INK_PAGE) {
      pg = inkPage(st); g = pg.g;
      g.font = font; g.letterSpacing = sp + "px"; g.textAlign = align; g.textBaseline = base;
    }
    sprite = { cv: pg.cv, x: st.x, y: st.y, w: w, h: h, ox: ox / k, oy: oy / k, cw: w / k, ch: h / k };
    g.setTransform(k, 0, 0, k, st.x + ox, st.y + oy);
    if (lw) { g.lineJoin = "round"; g.lineWidth = lw; g.strokeStyle = color; g.strokeText(text, 0, 0); }
    else { g.fillStyle = color; g.fillText(text, 0, 0); }
    st.x += w + INK_GAP; st.row = Math.max(st.row, h);
    st.map.set(key, sprite); st.made++;
    return sprite;
  }
  // Stamps a sprite with its anchor at (x, y) under the transform in force, scaled by sc.
  function inkStamp(sp, x, y, sc) { ctx.drawImage(sp.cv, sp.x, sp.y, sp.w, sp.h, x - sp.ox * sc, y - sp.oy * sc, sp.cw * sc, sp.ch * sc); }
  // A whole line stamped from the lines' sprites, outlined (lw wide, in hc) unless hc is null, then filled (fc): false when a
  // sprite can't be made, and nothing is drawn. The lines' sprites are drawn at the screen's own pixels, and at rest a line is
  // stamped on whole pixels (snap, for a line under the map's plain transform), so it is as sharp as text; while the map moves
  // it is stamped where it falls, so it glides rather than steps.
  // Inside inkQueued (the seas', lakes', cities', and divisions' names), the stamps wait until the function is done, so that
  // every sprite it needs is made first: a page drawn on between two stamps from it is copied whole each time where the canvas
  // is not on the graphics card (4.6 ms a name in headless Chromium, a second for a frame that brought in 130 cities).
  function inkLine(text, x, y, font, sp, al, bl, hc, lw, fc, snap) {
    var pre = font + "|" + sp + "|" + al + "|" + bl + "|", a = null, b, gen = ink.line.flushed;
    if (hc !== null) a = inkSprite(ink.line, pre + "h" + lw + hc + "|" + text, text, font, sp, al, bl, hc, lw);
    b = inkSprite(ink.line, pre + "f" + fc + "|" + text, text, font, sp, al, bl, fc, 0);
    // the store was emptied to make room for the ink: the halo's sprite went with it
    if (a && gen !== ink.line.flushed) a = inkSprite(ink.line, pre + "h" + lw + hc + "|" + text, text, font, sp, al, bl, hc, lw);
    if ((hc !== null && !a) || !b) return false;
    if (snap && !moving) { x = Math.round(x * dpr) / dpr; y = Math.round(y * dpr) / dpr; }
    if (inkQ) { if (a) inkQ.push(a, x, y); inkQ.push(b, x, y); return true; }
    if (a) inkStamp(a, x, y, 1);
    inkStamp(b, x, y, 1);
    return true;
  }
  function inkDrain() {
    if (!inkQ) return;
    for (var i = 0; i < inkQ.length; i += 3) inkStamp(inkQ[i], inkQ[i + 1], inkQ[i + 2], 1);
    inkQ.length = 0;
  }
  // fn with its lines' stamps held until it is done (and stamped then, also when it throws).
  function inkQueued(fn) {
    return function () {
      if (inkQ) return fn.apply(this, arguments);
      inkQ = [];
      try { return fn.apply(this, arguments); } finally { try { inkDrain(); } finally { inkQ = null; } }
    };
  }
  // A whole line of text at (x, y), outlined and then filled, as ctx.strokeText and ctx.fillText would draw it with the font,
  // letter spacing, alignment, baseline, line width, and colours in force, from the lines' sprites, under the map's plain
  // transform. With halo false, the ink alone.
  function inkText(text, x, y, halo) {
    if (textSprites && !skip.sprites && inkLine(text, x, y, ctx.font, parseFloat(ctx.letterSpacing) || 0, ctx.textAlign, ctx.textBaseline, halo !== false ? ctx.strokeStyle : null, ctx.lineWidth, ctx.fillStyle, true)) return;
    // the check's text ("letters") is set on whole pixels at rest as the sprites are, so the two can be compared point for point
    if (textLetters && !moving) { x = Math.round(x * dpr) / dpr; y = Math.round(y * dpr) / dpr; }
    if (halo !== false) ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  }
  // The sprites of a name's letters and whole lines, halo and ink: [[halo, ink, x, transform's glyph or line], ...], or null
  // when one can't be made (the name is then drawn as text).
  function labelSprites(it, geo, again) {
    var gen = ink.glyph.flushed + ink.line.flushed;
    var f = it.f, fb = inkSize(f), sc = f / fb, style = it.people ? "italic 400 " : "400 ", font = style + fb + "px " + SERIF;
    var lw = Math.round((it.sea ? 3 : Math.max(2, f * 0.22)) / sc * 8) / 8;
    var hc = it.sea ? pal.ocean : pal["label-halo"], fc = it.people ? pal.people : pal.label;
    var ph = style + fb + "|h" + lw + hc + "|", pf = style + fb + "|f" + fc + "|", out = [], lines = geo.lines, i, j, a, b;
    for (i = 0; i < lines.length; i++) {
      var ln = lines[i];
      if (!ln.gl) {
        // a whole line (a state named beside its coast, a name pinned by an edit) is kept at its own size
        var lf = style + f + "px " + SERIF, sp = Math.round(ln.spx * 100) / 100, pre = lf + "|" + sp + "|center|middle|", lw1 = it.sea ? 3 : Math.max(2, f * 0.22);
        a = inkSprite(ink.line, pre + "h" + lw1 + hc + "|" + ln.text, ln.text, lf, sp, "center", "middle", hc, lw1);
        b = inkSprite(ink.line, pre + "f" + fc + "|" + ln.text, ln.text, lf, sp, "center", "middle", fc, 0);
        if (!a || !b) return null;
        out.push([a, b, ln.spx / 2, ln, 1]);
        continue;
      }
      for (j = 0; j < ln.gl.length; j++) {
        var g = ln.gl[j];
        if (g.ch === " " || g.ch === "\u00a0") continue;
        a = inkSprite(ink.glyph, ph + g.ch, g.ch, font, 0, "center", "middle", hc, lw);
        b = inkSprite(ink.glyph, pf + g.ch, g.ch, font, 0, "center", "middle", fc, 0);
        if (!a || !b) return null;
        out.push([a, b, 0, g, sc]);
      }
    }
    // a store emptied part of the way through took the first of these sprites with it: once more, from the start
    if (gen !== ink.glyph.flushed + ink.line.flushed) return again ? null : labelSprites(it, geo, true);
    out.gen = gen;
    return out;
  }
  function drawLabelItem(it, geo, alpha, ready) {
    var list = !textSprites || skip.sprites ? null : ready && ready.gen === ink.glyph.flushed + ink.line.flushed ? ready : labelSprites(it, geo);
    if (!list) return drawLabelVector(it, geo, alpha);
    var k, e, q;
    ctx.globalAlpha = it.band ? alpha * 0.72 : alpha;
    for (var pass = 0; pass < 2; pass++) {
      for (k = 0; k < list.length; k++) {
        e = list[k]; q = e[3];
        if (q.ch === undefined) ctx.setTransform(dpr * q.tx, dpr * q.ty, -dpr * q.nx, -dpr * q.ny, dpr * q.mx, dpr * q.my);
        else ctx.setTransform(dpr * q.tx, dpr * q.ty, -dpr * q.nx, -dpr * q.ny, dpr * q.x, dpr * q.y);
        inkStamp(e[pass], e[2], 0, e[4]);
      }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
  }
  function drawLabelVector(it, geo, alpha) {
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
        if (ln.straight && !(textLetters && ln.gl)) {
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
  // Names carried along (23 November 2026). While the map turns or slides at one zoom, the states' names stay where the last
  // layout put them on the ground, and each frame only works out where their letters now fall on the screen (glyphLayout; a
  // name set beside its coast moves with the point it was set at). Laying them out afresh every frame, as before, took most of
  // what was left of a moving frame once the names came from sprites (on an M2, 7.5 ms of about 20 over Europe). A layout is
  // carried for LABEL_CARRY_MS, then made afresh, so names come in for land that has turned into view; a change of zoom, date,
  // level, or size lays them out at once, as does a name pinned by an edit. A name that turns out of view is dropped.
  var LABEL_CARRY_MS = 250, labelCarryMs = null, labelStats = { layouts: 0, carried: 0, placesCarried: 0 };
  function carrySig(snap) { return [snap.key, useLevel(), flat ? 1 : 0, view.zoom.toFixed(5), W, H, layoutEpoch].join("|"); }
  function carriedLabels(snap) {
    var from = labelCache.get("carry");
    if (!from || skip.carry || edits.labelN || devGhost || from.sig !== carrySig(snap)) return null;
    if (performance.now() - from.time >= (labelCarryMs === null ? LABEL_CARRY_MS : labelCarryMs)) return null;
    var scale = (flat ? FB.k : B.r) / GU, out = [], i, j, it, geo;
    for (i = 0; i < from.items.length; i++) {
      it = from.items[i];
      if (it.sea) {
        var q = it.at ? projectLL(it.at[0], it.at[1]) : null, b = it.geo.boxes[0];
        if (!q || (!flat && q[2] < 0.45)) continue;
        geo = { lines: straightLines(it.geo.lines.map(function (l) { return l.text; }), q[0], q[1], it.f, 1), boxes: [mkBox(q[0], q[1], b.hw, b.hh, 0)], x: q[0], y: q[1], ang: 0 };
      } else if (it.src && !!it.src.fr.flat === flat) geo = glyphLayout(it.src.fr, it.src.fm, it.src.o, it.f, it.people, scale);
      else return null;
      if (!geo) continue;
      var seen = false;
      for (j = 0; j < geo.boxes.length && !seen; j++) { var bx = geo.boxes[j]; seen = bx.x < W && bx.y < H && bx.x + bx.w > 0 && bx.y + bx.h > 0; }
      if (!seen) continue;
      var copy = {};
      for (var key in it) copy[key] = it[key];
      copy.geo = geo;
      out.push(copy);
    }
    out.partial = true;
    return out;
  }
  function drawPolityLabels(snap, placed, kp) {
    if (!layers.states) return;
    var quick = moving || rangeActive;
    var key = [snap.key, useLevel(), view.lon.toFixed(5), view.lat.toFixed(5), view.zoom.toFixed(5), view.roll.toFixed(4), flat ? 1 : 0, W, H, layoutEpoch, quick ? 1 : 0,
      placed.map(function (b) { return Math.round(b.x) + ":" + Math.round(b.y) + ":" + Math.round(b.w) + ":" + Math.round(b.h); }).join(",")].join("|");
    var memo = labelCache.get("layout");
    if (!memo || memo.key !== key) {
      var items = moving && !rangeActive ? carriedLabels(snap) : null;
      if (items) labelStats.carried++;
      else {
        items = layoutPolities(snap, placed.slice(), kp);
        labelStats.layouts++;
        labelFresh = true;
        labelCache.set("carry", { sig: carrySig(snap), time: performance.now(), items: items });
      }
      memo = { key: key, items: items };
      labelCache.set("layout", memo);
    }
    if (quick && !settleLabels) settleLabels = setTimeout(function wait() { settleLabels = moving || rangeActive ? setTimeout(wait, 200) : 0; if (!settleLabels) scheduleRender(true); }, 200);
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    var time = performance.now(), live = false, k, it, warring = atWarIds();
    // Every name's sprites are made before any is stamped: a page of sprites drawn on between two stamps from it is sent to
    // the graphics card again.
    var sprites = textSprites && !skip.sprites ? memo.items.map(function (m) { return labelSprites(m, m.geo); }) : null;
    for (k = 0; k < memo.items.length; k++) {
      it = memo.items[k];
      var a = Math.min(1, Math.max(0, (time - it.t0) / FADE_MS));
      if (a < 1) live = true;
      for (var j = 0; j < it.geo.boxes.length; j++) placed.push(it.geo.boxes[j]);
      placedLabels.push({ name: it.name, x: it.geo.x, y: it.geo.y, size: it.f, kind: it.people ? "people" : "polity", id: it.id, ang: it.geo.ang, lines: it.geo.lines.length,
        box: boundsOf(it.geo.boxes), boxes: it.geo.boxes, sea: !!it.sea });
      var la = lapseLabelAlpha(it.id, a);
      drawLabelItem(it, it.geo, la, sprites && sprites[k]);
      if (warring && warring.has(it.id)) { var sb = drawSword(it, it.geo, la); if (sb) placed.push(sb); }
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
    if (live) scheduleRender(true);
  }

  drawSeaLabels = inkQueued(drawSeaLabels); drawLakeLabels = inkQueued(drawLakeLabels); drawPlaces = inkQueued(drawPlaces); drawDivisionLabels = inkQueued(drawDivisionLabels);
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
    var loc = T(r[0]), name = r[3] === 1 ? loc.toLocaleUpperCase(LANG) : loc, cut = name.lastIndexOf(" ");
    var lines = loc !== r[0] ? name.split("\n") : r[3] === 1 && name.split(" ").length > 2 ? [name.slice(0, cut), name.slice(cut + 1)] : [name];
    return { name: loc.replace(/\n/g, " "), lines: lines, lon: r[1], lat: r[2], tier: r[3] };
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
        inkText(sl.lines[j], p[0] + spacing / 2, ly);
      }
    }
    ctx.letterSpacing = "0px";
  }
  // Lake and river names, as UCHRONIA draws them (22 November 2026): a lake's name in italics at the point Natural Earth gives
  // it, once the lake is 18 px across; a river's name bent along its course, letter by letter, at the stretch nearest the middle
  // of the view where it fits without turning too sharply, kept in the same place while the map moves. Both follow the date:
  // lakes and rivers that come and go (reservoirs, dried seas, rivers turned) are named only while they are drawn.
  var LAKE_LABEL_S = 650, LAKE_LABEL_PX = 18;
  function lakeAnchor(polys) {
    var best = null, bestA = -1;
    polys.forEach(function (poly) {
      var ring = poly[0], a = 0, x = 0, y = 0;
      for (var k = 0, n = ring.length - 1; k < n; k++) {
        var p = ring[k], q = ring[k + 1], c = p[0] * q[1] - q[0] * p[1];
        a += c; x += (p[0] + q[0]) * c; y += (p[1] + q[1]) * c;
      }
      if (Math.abs(a) > bestA) { bestA = Math.abs(a); best = a ? [x / (3 * a), y / (3 * a)] : ring[0]; }
    });
    return best || [0, 0];
  }
  function drawLakeLabels(placed, S, kp) {
    if (!layers.water || !lakes || S < LAKE_LABEL_S) return;
    var list = lakesAt(), size = 11;
    ctx.save();
    ctx.font = "italic 400 " + size + "px " + SERIF;
    ctx.letterSpacing = "0.5px";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round"; ctx.lineWidth = 3;
    ctx.strokeStyle = pal.ocean; ctx.fillStyle = pal["sea-label"];
    for (var i = 0; i < list.length; i++) {
      var L = list[i];
      if (Math.sqrt(L.km2) * kp < LAKE_LABEL_PX) break;
      if (!L.name || L.lon === undefined) continue;
      var p = projectLL(L.lon, L.lat);
      if (!p || (!flat && p[2] < 0.3) || p[0] < 0 || p[0] > W || p[1] < 0 || p[1] > H) continue;
      var lnm = lakeNameL(L.name), w = ctx.measureText(lnm).width, box = mkBox(p[0], p[1], w / 2 + 2, size * 0.6, 0);
      if (!insideView(box) || collides(placed, box)) continue;
      placed.push(box);
      inkText(lnm, p[0], p[1]);
    }
    ctx.letterSpacing = "0px";
    ctx.restore();
  }
  function riverLabelRank(S) { return S < 650 ? 0 : S < 1100 ? 2 : S < 2000 ? 4 : 6; }
  function riverNames() {
    if (!rivers) return [];
    if (!geog) return rivers.names;
    var k = stateOf(geog.riverTimes);
    if (riverNameState.key === k && riverNameState.base === rivers) return riverNameState.list;
    var named = new Map();
    rivers.names.forEach(function (e) { named.set(e.name, { name: e.name, r: e.r, lines: e.lines }); });
    geog.riverAdd.forEach(function (r) {
      if (!r.name || !r.spans.some(function (s) { return inSpan(s[0], s[1]); })) return;
      var e = named.get(r.name);
      if (e) named.set(r.name, { name: e.name, r: Math.min(e.r, r.rank), lines: e.lines.concat([r.line]) });
      else named.set(r.name, { name: r.name, r: r.rank, lines: [r.line] });
    });
    var list = Array.from(named.values()).sort(function (a, b) { return a.r - b.r; });
    riverNameState = { key: k, base: rivers, list: list };
    return list;
  }
  var riverNameState = { key: null, base: null, list: [] };
  var glyphSizes = new Map();
  function charWidth(font, ch) {
    var k = font + "|" + ch, w = glyphSizes.get(k);
    if (w == null) { ctx.font = font; w = ctx.measureText(ch).width; glyphSizes.set(k, w); }
    return w;
  }
  function lineKm(L) {
    if (L.km) return L.km;
    var km = new Float64Array(L.n);
    for (var k = 1; k < L.n; k++) {
      var d = L.x[k] * L.x[k - 1] + L.y[k] * L.y[k - 1] + L.z[k] * L.z[k - 1];
      km[k] = km[k - 1] + Math.acos(Math.max(-1, Math.min(1, d))) * R_KM;
    }
    return (L.km = km);
  }
  function leafLines(lines, out) {
    lines.forEach(function (L) { if (L.parts) leafLines(L.parts, out); else out.push(L); });
    return out;
  }
  function linePoint(L, k) {
    if (flat) { flatArrays(L); return projectLL(L.L[k] / D2R, L.P[k] / D2R); }
    var x = L.x[k], y = L.y[k], z = L.z[k], d = x * B.cx + y * B.cy + z * B.cz;
    if (d <= 0) return null;
    return [cx + B.r * (x * B.ex + y * B.ey + z * B.ez), cy - B.r * (x * B.nx + y * B.ny + z * B.nz), d];
  }
  function riverSpan(L, a, b, box) {
    var km = L.km, lo = 0, hi = L.n - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (km[mid] <= a) lo = mid; else hi = mid; }
    var pts = [], kms = [];
    for (var k = lo; k < L.n; k++) {
      var p = linePoint(L, k);
      if (!p || (!flat && p[2] <= 0.05) || p[0] < box[0] || p[0] > box[2] || p[1] < box[1] || p[1] > box[3]) return null;
      if (pts.length && Math.abs(p[0] - pts[pts.length - 1][0]) > W / 2) return null;
      pts.push([p[0], p[1]]); kms.push(km[k]);
      if (km[k] >= b) break;
    }
    if (pts.length < 2 || kms[kms.length - 1] < b || kms[0] > a) return null;
    return smoothRun(pts, kms);
  }
  function smoothRun(pts, kms) {
    var step = 2, res = [pts[0]], rk = [kms[0]];
    for (var k = 1; k < pts.length; k++) {
      var d = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]), m = Math.max(1, Math.ceil(d / step));
      for (var j = 1; j <= m; j++) {
        var t = j / m;
        res.push([pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * t, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * t]);
        rk.push(kms[k - 1] + (kms[k] - kms[k - 1]) * t);
      }
    }
    var w = 7, out = [], cum = [0];
    for (k = 0; k < res.length; k++) {
      var sx = 0, sy = 0, c = 0;
      for (j = Math.max(0, k - w); j <= Math.min(res.length - 1, k + w); j++) { sx += res[j][0]; sy += res[j][1]; c++; }
      out.push([sx / c, sy / c]);
      if (k) cum.push(cum[k - 1] + Math.hypot(out[k][0] - out[k - 1][0], out[k][1] - out[k - 1][1]));
    }
    return { pts: out, cum: cum, km: rk, len: cum[cum.length - 1] };
  }
  function runPx(run, km) {
    var lo = 0, hi = run.km.length - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (run.km[mid] <= km) lo = mid; else hi = mid; }
    var t = run.km[hi] > run.km[lo] ? (km - run.km[lo]) / (run.km[hi] - run.km[lo]) : 0;
    return run.cum[lo] + (run.cum[hi] - run.cum[lo]) * Math.max(0, Math.min(1, t));
  }
  function pointAt(run, s) {
    var cum = run.cum, pts = run.pts, lo = 0, hi = cum.length - 1;
    s = Math.max(0, Math.min(run.len, s));
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
    var seg = cum[hi] - cum[lo] || 1, t = (s - cum[lo]) / seg;
    return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * t, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * t];
  }
  function glyphsAt(run, s0, ws, sp, tw, f) {
    if (s0 < 0 || s0 + tw > run.len) return null;
    var a = pointAt(run, s0), b = pointAt(run, s0 + tw), back = b[0] < a[0];
    var glyphs = [], turn = 0, d = 0, prev = null;
    for (var j = 0; j < ws.length; j++) {
      var mid = d + ws[j] / 2, s = back ? s0 + tw - mid : s0 + mid;
      var p = pointAt(run, s), q1 = pointAt(run, s - f * 0.7), q2 = pointAt(run, s + f * 0.7);
      var ang = Math.atan2(q2[1] - q1[1], q2[0] - q1[0]) + (back ? Math.PI : 0);
      if (prev !== null) {
        var da = Math.abs(ang - prev); da = Math.min(da, TAU - da);
        if (da > RIVER_TURN) return null;
        turn += da;
      }
      prev = ang;
      var g = [p[0] + Math.sin(ang) * f * 0.8, p[1] - Math.cos(ang) * f * 0.8, ang];
      // The letters sit beside the line, not on it, so on the inside of a bend they crowd together and on the outside they
      // spread apart; a spot where two neighbours end up much nearer or farther than their widths ask is passed over
      // (24 November 2026; before then such names were drawn with their letters run into each other).
      if (glyphs.length && ws[j - 1] && ws[j]) {
        var gp = glyphs[glyphs.length - 1], want = (ws[j - 1] + ws[j]) / 2 + sp, got = Math.hypot(g[0] - gp[0], g[1] - gp[1]);
        if (got < want * RIVER_SQUEEZE || got > want / RIVER_SQUEEZE) return null;
      }
      glyphs.push(g);
      d += ws[j] + sp;
    }
    return turn < RIVER_TURNS ? { glyphs: glyphs, turn: turn } : null;
  }
  var RIVER_TURN = 0.6, RIVER_TURNS = 1.6, RIVER_SQUEEZE = 0.75;
  function glyphBox(glyphs, f) {
    var gx0 = Infinity, gy0 = Infinity, gx1 = -Infinity, gy1 = -Infinity;
    glyphs.forEach(function (g) { gx0 = Math.min(gx0, g[0]); gy0 = Math.min(gy0, g[1]); gx1 = Math.max(gx1, g[0]); gy1 = Math.max(gy1, g[1]); });
    return mkBox((gx0 + gx1) / 2, (gy0 + gy1) / 2, (gx1 - gx0) / 2 + f * 0.6, (gy1 - gy0) / 2 + f * 0.6, 0);
  }
  function vecAt(L, km) {
    var k = 0;
    while (k < L.n - 2 && L.km[k + 1] < km) k++;
    var t = L.km[k + 1] > L.km[k] ? Math.max(0, Math.min(1, (km - L.km[k]) / (L.km[k + 1] - L.km[k]))) : 0;
    return [L.x[k] + (L.x[k + 1] - L.x[k]) * t, L.y[k] + (L.y[k + 1] - L.y[k]) * t, L.z[k] + (L.z[k + 1] - L.z[k]) * t];
  }
  function nearestOn(leaves, v) {
    var best = null, bestDot = -2;
    for (var li = 0; li < leaves.length; li++) {
      var L = leaves[li];
      lineKm(L);
      for (var k = 0; k < L.n; k++) {
        var d = L.x[k] * v[0] + L.y[k] * v[1] + L.z[k] * v[2];
        if (d > bestDot) { bestDot = d; best = { li: li, ckm: L.km[k] }; }
      }
    }
    return best;
  }
  var riverPick = new Map();
  function riverSpot(rv, ws, sp, tw, f, box, kp, placed) {
    var leaves = leafLines(rv.lines, []), textKm = tw / kp, half = textKm * 0.7, step = textKm * 0.5;
    var key = rv.name, was = riverPick.get(key), sig = leaves.length;
    function at(li, c) {
      var L = leaves[li];
      if (!L) return null;
      lineKm(L);
      if (c + half > L.km[L.n - 1]) return null;
      var run = riverSpan(L, c - half, c + half, box);
      if (!run) return null;
      var g = glyphsAt(run, runPx(run, c) - tw / 2, ws, sp, tw, f);
      if (!g) return null;
      g.box = glyphBox(g.glyphs, f);
      if (collides(placed, g.box)) return null;
      g.li = li; g.ckm = c; g.c = pointAt(run, runPx(run, c));
      return g;
    }
    if (was && was.sig !== sig && was.v) {
      var moved = nearestOn(leaves, was.v);
      if (moved) { was = { sig: sig, li: moved.li, ckm: moved.ckm, step: was.step, v: was.v }; riverPick.set(key, was); }
    }
    if (moving) return was && was.sig === sig ? at(was.li, was.ckm) : null;
    if (was && was.sig === sig && was.step > step * 0.8 && was.step < step * 1.25) {
      var keep = at(was.li, was.ckm);
      if (keep) return keep;
    }
    var best = null, mx = (box[0] + box[2]) / 2, my = (box[1] + box[3]) / 2, diag = Math.hypot(box[2] - box[0], box[3] - box[1]);
    for (var li = 0; li < leaves.length; li++) {
      var L = leaves[li];
      if (flat ? !featureInFlat(L) : !featureInFront(L)) continue;
      lineKm(L);
      var count = Math.floor(L.km[L.n - 1] / step);
      for (var m = 0; m < count; m++) {
        var g = at(li, (m + 0.5) * step);
        if (!g) continue;
        g.score = g.turn + Math.hypot(g.c[0] - mx, g.c[1] - my) / diag;
        if (!best || g.score < best.score) best = g;
      }
    }
    if (best) riverPick.set(key, { sig: sig, li: best.li, ckm: best.ckm, step: step, v: vecAt(leaves[best.li], best.ckm) });
    return best;
  }
  function drawRiverLabels(placed, S) {
    var top = Math.min(riverLabelRank(S), riverRank(S));
    if (!layers.water || !rivers || !top || clamp01((S - RIVERS_FROM) / (RIVERS_FULL - RIVERS_FROM)) < 0.6) return;
    var f = 11.5, font = "italic 400 " + f + "px " + SERIF, box = [4, 4, W - 4, H - 4], shown = 0, kp = kmPx(), list = riverNames(), names = [], gen0 = ink.glyph.flushed;
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round"; ctx.lineWidth = 3;
    for (var i = 0; i < list.length && shown < 40; i++) {
      var rv = list[i];
      if (rv.r > top) break;
      var chars = Array.from((PL.river && PL.river[rv.name]) || rv.name), sp = f * 0.06, ws = [], tw = 0;
      for (var j = 0; j < chars.length; j++) { ws.push(charWidth(font, chars[j])); tw += ws[j] + (j ? sp : 0); }
      var spot = riverSpot(rv, ws, sp, tw, f, box, kp, placed);
      if (!spot || !insideMap(spot.box)) continue;
      placed.push(spot.box);
      shown++;
      names.push({ chars: chars, spot: spot, rs: riverSprites(chars, f) });
    }
    // Every name's sprites are made before any is stamped; if the store was emptied on the way, the sprites made before that
    // went with it, and all are made again (as text, if it is emptied a second time).
    if (ink.glyph.flushed !== gen0) {
      gen0 = ink.glyph.flushed;
      names.forEach(function (nm) { nm.rs = riverSprites(nm.chars, f); });
      if (ink.glyph.flushed !== gen0) names.forEach(function (nm) { nm.rs = null; });
    }
    ctx.font = font; ctx.strokeStyle = pal["label-halo"]; ctx.fillStyle = pal["river-label"] || pal.river;
    names.forEach(function (nm) {
      var rs = nm.rs;
      for (var pass = rs ? 0 : 1; pass < 2; pass++) for (j = 0; j < nm.spot.glyphs.length; j++) {
        if (nm.chars[j] === " ") continue;
        var g = nm.spot.glyphs[j];
        ctx.save();
        ctx.translate(g[0], g[1]); ctx.rotate(g[2]);
        if (rs) inkStamp(rs[j][pass], 0, 0, rs.sc);
        else { ctx.strokeText(nm.chars[j], 0, 0); ctx.fillText(nm.chars[j], 0, 0); }
        ctx.restore();
      }
    });
    ctx.restore();
  }
  // A river name's letters as sprites, halo and ink, or null to draw them as text.
  function riverSprites(chars, f) {
    if (!textSprites || skip.sprites) return null;
    var fb = inkSize(f), sc = f / fb, font = "italic 400 " + fb + "px " + SERIF, lw = Math.round(3 / sc * 8) / 8, hc = pal["label-halo"], fc = pal["river-label"] || pal.river;
    var ph = "italic 400 " + fb + "|h" + lw + hc + "|", pf = "italic 400 " + fb + "|f" + fc + "|", out = [];
    for (var j = 0; j < chars.length; j++) {
      if (chars[j] === " ") { out.push(null); continue; }
      var a = inkSprite(ink.glyph, ph + chars[j], chars[j], font, 0, "center", "middle", hc, lw), b = inkSprite(ink.glyph, pf + chars[j], chars[j], font, 0, "center", "middle", fc, 0);
      if (!a || !b) return null;
      out.push([a, b]);
    }
    out.sc = sc;
    return out;
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
  var cityRank = { t: NaN, n: 0, tag: -1, list: [] };
  // The cities alive at t, largest first, each with its tier (1, the largest marks, to 4): by population, or as a
  // city-size edit sets it; a city with a city-hide edit is left out.
  function cityRanked(t) {
    if (cityRank.t === t && cityRank.n === cities.rows.length && cityRank.tag === edits.tag) return cityRank.list;
    var list = [], rows = cities.rows, ranks = cities.ranks, cityEdits = edits.cityN > 0;
    for (var i = 0; i < rows.length; i++) {
      var c = rows[i];
      if (c.since <= t && t < c.until && !(cityEdits && editAt("city-hide", c.id, t))) list.push({ c: c, pop: popAt(c, t), tier: 4 });
    }
    list.sort(function (a, b) { return b.pop - a.pop; });
    for (i = 0; i < list.length; i++) list[i].tier = i < ranks[0] ? 1 : i < ranks[1] ? 2 : i < ranks[2] ? 3 : 4;
    if (cityEdits) {
      list.forEach(function (x) { var v = editAt("city-size", x.c.id, t); if (v) x.tier = v.tier; });
      list.sort(function (a, b) { return a.tier - b.tier || b.pop - a.pop; });
    }
    cityRank = { t: t, n: rows.length, tag: edits.tag, list: list };
    return list;
  }
  function cityHidden(c, t) { return !!(c && edits.cityN && editAt("city-hide", c.id, t)); }
  // A city's name at t: a city-name edit's, or its own of the time.
  function cityShownNameL(c, t) { var n = cityShownName(c, t); return placeNameL(n, n === c.name ? c.qid : null); }
  function cityShownName(c, t) {
    var v = edits.cityN ? editAt("city-name", c.id, t) : null;
    return v ? v.name : namedAt(c.steps, c.name, t);
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
  function capitalNameL(c) { var city = cityNear(c[1], c[2], c[0]), n = capitalName(c); return placeNameL(n, city && n === city.name ? city.qid : null); }
  function capitalName(c) {
    var city = cityNear(c[1], c[2], c[0]), v = city && edits.cityN ? editAt("city-name", city.id, now) : null;
    if (v) return v.name;
    return city && city.steps ? namedAt(city.steps, c[0], now) : c[0];
  }
  function cityTier(S) { return S < 330 ? 0 : S < 480 ? 1 : S < 800 ? 2 : S < 1400 ? 3 : 4; }
  function markSize(S) { return S < 900 ? 1 : 1.15; }
  // A state drawn in several pieces can carry a capital on each, picked from the capitals on that piece's land (the Ottoman
  // Empire's Anatolia took Bursa, and its Thrace Edirne, while Constantinople was the capital). A state has one capital at a
  // time, so of its pieces' capitals the one in the largest city is the state's, on the map and on its card.
  var capPicked = { snap: null, t: NaN, n: -1, map: null };
  function polityCapAt(p) {
    if (!p || !current) return null;
    var n = cities ? cities.rows.length : 0;
    if (capPicked.snap !== current || capPicked.t !== now || capPicked.n !== n) {
      var map = new Map();
      current.order.forEach(function (q) {
        var c = q.cap ? capitalNow(q.cap) : null;
        if (!c) return;
        var city = cityNear(c[1], c[2], c[0]), pop = city ? popAt(city, now) : 0, was = map.get(q.id);
        if (!was || pop > was.pop) map.set(q.id, { p: q, c: c, city: city, pop: pop });
      });
      capPicked = { snap: current, t: now, n: n, map: map };
    }
    return capPicked.map.get(p.id) || null;
  }
  function polityCap(p) { var b = polityCapAt(p); return b ? b.c : p && p.cap ? capitalNow(p.cap) : null; }
  function capitalList(snap, S) {
    var out = [];
    if (!(snap.modern || snap.dated) || S < 230) return out;
    var seen = new Set();
    for (var i = 0; i < snap.order.length; i++) {
      var p = snap.order[i], b = snap === current ? polityCapAt(p) : null, c = b ? b.c : capitalNow(p.cap);
      if (!c || seen.has(p.id)) continue;
      seen.add(p.id);
      var pt = projectLL(c[1], c[2]);
      if (pt && pt[2] >= 0.25 && !cityHidden(b ? b.city : cityNear(c[1], c[2], c[0]), now)) out.push({ pt: pt, name: capitalNameL(c), id: p.id, cap: b ? b.p.cap : p.cap, city: b ? b.city : cityNear(c[1], c[2], c[0]), ll: [c[1], c[2]] });
    }
    return out;
  }
  // The marks are UCHRONIA's (22 November 2026, at Noah's asking): capitals, cities, and towns 30% larger than before, and a
  // town's dot in the cities' ink.
  var MARK_BIG = 1.3;
  function drawMark(p, k, kind, sel) {
    var x = p[0], y = p[1];
    ctx.fillStyle = pal["city-halo"];
    if (sel) {
      var R = (kind === 0 ? 4.3 : kind === 1 ? 3.4 : 3) * k;
      ctx.beginPath(); ctx.arc(x, y, R + 2.2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.strokeStyle = pal.select; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, R * 0.45, 0, TAU); ctx.fillStyle = pal.select; ctx.fill();
      return;
    }
    k *= MARK_BIG;
    if (kind === 0) {
      ctx.beginPath(); ctx.arc(x, y, 4.3 * k, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 3.2 * k, 0, TAU); ctx.strokeStyle = pal.city; ctx.lineWidth = 0.85 * MARK_BIG; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 1.35 * k, 0, TAU); ctx.fillStyle = pal.city; ctx.fill();
      return;
    }
    var r = kind === 1 ? 1.85 * k : 1.4 * k;
    ctx.beginPath(); ctx.arc(x, y, r + 1, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = pal.city; ctx.fill();
  }
  var CITY_STYLE = [
    { size: 12.4, font: "400 ", ls: 0.2, ink: "city", halo: 2.4 },
    { size: 11.2, font: "400 ", ls: 0.1, ink: "city", halo: 2.2 },
    { size: 10.8, font: "400 ", ls: 0, ink: "town", halo: 2 }
  ];
  function placeOne(placed, p, name, k, kind, held, ref, sel) {
    if (!sel && !(kind === 0 ? layers.capitals : layers.cities)) return false;
    var st = CITY_STYLE[kind], size = st.size * (k > 1 ? 1.05 : 1) * (sel ? 1.4 : 1);
    var rm = sel ? ((kind === 0 ? 4.3 : kind === 1 ? 3.4 : 3) + 2.2) * k : kind === 0 ? 4.3 * MARK_BIG * k : (kind === 1 ? 1.85 : 1.4) * MARK_BIG * k + 1, h = size * 0.86, gap = rm + 3;
    var mark = held ? null : { x: p[0] - rm, y: p[1] - rm, w: 2 * rm, h: 2 * rm };
    if (mark && !sel && (!insideView(mark) || collides(placed, mark))) return false;
    ctx.font = (sel ? "600 " : st.font) + size.toFixed(2) + "px " + SERIF;
    ctx.letterSpacing = st.ls + "px";
    var w = ctx.measureText(name).width;
    var spots = [[p[0] + gap, p[1]], [p[0] - gap - w, p[1]], [p[0] - w / 2, p[1] - rm - 2.5 - h / 2], [p[0] - w / 2, p[1] + rm + 2.5 + h / 2]];
    var n = spots.length, tries = sel ? 2 * n + 1 : n;
    for (var s = 0; s < tries; s++) {
      var spot = spots[s % n], tx = spot[0], ty = spot[1], box = { x: tx - 1.5, y: ty - h / 2 - 1.5, w: w + 3, h: h + 3 };
      if (s < 2 * n && (!insideView(box) || (s < n && collides(placed, box)))) continue;
      if (mark) placed.push(mark);
      placed.push(box);
      drawMark(p, k, kind, sel);
      ctx.textAlign = "left";
      ctx.lineWidth = st.halo + (sel ? 1.2 : 0); ctx.strokeStyle = pal["city-halo"]; ctx.fillStyle = sel ? pal.select : pal[st.ink];
      inkText(name, tx, ty);
      var lab = { name: name, x: p[0], y: p[1], size: size, kind: ["capital", "city", "town"][kind], box: box, ref: ref || null }, city = ref && ref.city;
      if (city) { lab.id = city.id; lab.qid = city.qid; lab.lon = city.lon; lab.lat = city.lat; }
      placedLabels.push(lab);
      if (placeRec && placeLL) placeRec.push({ ll: placeLL, name: name, k: k, kind: kind, sel: !!sel, ref: ref || null, rm: mark ? rm : 0, dx: tx - p[0], dy: ty - p[1], w: w, h: h, size: size,
        font: ctx.font, ls: st.ls, lw: ctx.lineWidth, hc: ctx.strokeStyle, fc: ctx.fillStyle });
      return true;
    }
    return false;
  }
  function reserveMarks(placed, S) {
    if (S < 230) return;
    var k = markSize(S), i, pt;
    var add = function (q, r) { placed.push({ x: q[0] - r, y: q[1] - r, w: 2 * r, h: 2 * r, res: true }); };
    if (current && layers.capitals) {
      var caps = capitalList(current, S);
      for (i = 0; i < caps.length; i++) add(caps[i].pt, 4.3 * MARK_BIG * k + 1);
    }
    if (cities && layers.cities) {
      var list = cityRanked(now);
      for (i = 0; i < list.length && list[i].tier <= 1; i++) {
        pt = projectLL(list[i].c.lon, list[i].c.lat);
        if (pt && pt[2] >= 0.25) add(pt, 1.85 * MARK_BIG * k + 2);
      }
    }
  }
  // The cities' marks and names are carried along like the states' names (carriedLabels): while the map moves at one zoom,
  // each stays on the side of its mark where the last layout put it, and a frame only works out where each city now falls
  // (placesCarried). They are laid out afresh in the frames in which the states' names are, and after LABEL_CARRY_MS.
  var placeRec = null, placeLL = null, labelFresh = false;
  function placesSig(S) {
    return [current ? current.key : "", now, flat ? 1 : 0, view.zoom.toFixed(5), W, H, layoutEpoch, layers.capitals ? 1 : 0, layers.cities ? 1 : 0, cities ? cities.rows.length : 0,
      selCity ? (selCity.id || selCity.lon + "," + selCity.lat) : "", markSize(S), textSprites && !skip.sprites ? 1 : 0].join("|");
  }
  function placesCarried(placed, rec) {
    ctx.textBaseline = "middle"; ctx.lineJoin = "round"; ctx.textAlign = "left";
    for (var i = 0; i < rec.length; i++) {
      var r = rec[i], p = projectLL(r.ll[0], r.ll[1]);
      if (!p || p[2] < 0.25) continue;
      var tx = p[0] + r.dx, ty = p[1] + r.dy;
      if (Math.max(tx + r.w, p[0] + r.rm) < 0 || Math.min(tx, p[0] - r.rm) > W || ty + r.h < -r.rm || ty - r.h > H + r.rm) continue;
      var box = { x: tx - 1.5, y: ty - r.h / 2 - 1.5, w: r.w + 3, h: r.h + 3 };
      if (r.rm) placed.push({ x: p[0] - r.rm, y: p[1] - r.rm, w: 2 * r.rm, h: 2 * r.rm });
      placed.push(box);
      drawMark(p, r.k, r.kind, r.sel);
      if (!inkLine(r.name, tx, ty, r.font, r.ls, "left", "middle", r.hc, r.lw, r.fc, true)) {
        ctx.font = r.font; ctx.letterSpacing = r.ls + "px"; ctx.lineWidth = r.lw; ctx.strokeStyle = r.hc; ctx.fillStyle = r.fc;
        ctx.strokeText(r.name, tx, ty); ctx.fillText(r.name, tx, ty);
      }
      var lab = { name: r.name, x: p[0], y: p[1], size: r.size, kind: ["capital", "city", "town"][r.kind], box: box, ref: r.ref }, city = r.ref && r.ref.city;
      if (city) { lab.id = city.id; lab.qid = city.qid; lab.lon = city.lon; lab.lat = city.lat; }
      placedLabels.push(lab);
    }
    ctx.letterSpacing = "0px";
    ctx.textAlign = "center";
  }
  function drawPlaces(placed, S) {
    if (S < 230) return;
    var sig = placesSig(S), from = moving && !rangeActive && !skip.carry && !labelFresh && textSprites && !skip.sprites ? labelCache.get("places") : null;
    if (from && from.sig === sig && performance.now() - from.time < (labelCarryMs === null ? LABEL_CARRY_MS : labelCarryMs)) { labelStats.placesCarried++; placesCarried(placed, from.rec); return; }
    placeRec = [];
    try { drawPlacesFresh(placed, S); } finally { labelCache.set("places", { sig: sig, time: performance.now(), rec: placeRec }); placeRec = null; placeLL = null; }
  }
  function drawPlacesFresh(placed, S) {
    var k = markSize(S), modernNow = current && current.modern, i;
    ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    var capCity = new Set(), sc = selCity;
    var isSel = function (city, q) { return !!sc && (sc.id ? !!city && city.id === sc.id : !!q && Math.abs(q[0] - sc.lon) < 1e-6 && Math.abs(q[1] - sc.lat) < 1e-6); };
    if (sc) {
      var sp = projectLL(sc.lon, sc.lat);
      placeLL = [sc.lon, sc.lat];
      if (sp && sp[2] >= 0.25) placeOne(placed, sp, cityFacts(sc).name, k, sc.kind === "capital" ? 0 : sc.kind === "city" ? 1 : 2, false, sc.ref || (sc.city ? { city: sc.city } : null), true);
    }
    if (current) {
      var caps = capitalList(current, S);
      for (i = 0; i < caps.length; i++) {
        if (isSel(caps[i].city, caps[i].ll)) { if (caps[i].city) capCity.add(caps[i].city); continue; }
        placeLL = caps[i].ll;
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
        if (capCity.has(c) || isSel(c, null)) continue;
        var p = projectLL(c.lon, c.lat);
        placeLL = [c.lon, c.lat];
        if (p && p[2] >= 0.25) placeOne(placed, p, cityShownNameL(c, now), k, list[i].tier <= 1 ? 1 : 2, false, { city: c });
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
    return isMonthly(now) ? dayOfTime(now) : dayOfTime(Math.floor(now) + 0.5);
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
    var outer = [];
    owner.forEach(function (o, j) { if (o !== -1) outer.push(j); });
    st = {
      key: reg.key + ":" + key,
      rows: idx.slice().sort(function (a, b) { return D.labels[D.rows[b][3]][4] - D.labels[D.rows[a][3]][4]; }),
      lines: lines,
      outer: outer,
      inside: new Map()
    };
    D.states.set(key, st);
    if (D.states.size > 64) D.states.delete(D.states.keys().next().value);
    return st;
  }
  // Two files can divide one state: Sweden's and Norway's under one crown (1814 to 1905), and Sudan's and South Sudan's
  // before 2011. Each file draws only the lines between its own divisions, so the line between the two files' divisions
  // (the border between the two kingdoms, Finnmarken and Nordland against Norrbotten, Jämtland against Nordre Trondhjem)
  // was drawn by neither. It is found as the stretches of the first file's outer edge that run along the second's: the
  // two files are drawn from different sources and share no points, so they are matched by distance, a point against
  // the other edge's segments through a grid of 0.1 degree cells. A stretch starts where the edges come within about
  // 5 km (SEAM_DEG) and runs on while they stay within about 15 km (SEAM_WIDE), since in the mountains the two sources
  // part by up to that much; measured on 1900's files, that finds 1,585 km of the border, all of it (a wider allowance
  // finds no more), where 5 km alone found 1,273 in nine broken pieces. Kept for each pair of dates.
  var divSeams = new Map(), SEAM_DEG = 0.05, SEAM_WIDE = 0.15, SEAM_CELL = 0.1;
  function divSeam(regA, stA, regB, stB) {
    var key = stA.key + "|" + stB.key, hit = divSeams.get(key);
    if (hit) return hit;
    var coordsOf = function (reg, j) { return topojson.feature(reg.data.topo, { type: "LineString", arcs: [j] }).geometry.coordinates; };
    var grid = new Map(), cell = function (x, y) { return Math.floor(x / SEAM_CELL) + "," + Math.floor(y / SEAM_CELL); };
    stB.outer.forEach(function (j) {
      var c = coordsOf(regB, j);
      for (var k = 1; k < c.length; k++) {
        var a = c[k - 1], b = c[k], seg = [a, b];
        for (var x = Math.floor((Math.min(a[0], b[0]) - SEAM_WIDE) / SEAM_CELL); x <= Math.floor((Math.max(a[0], b[0]) + SEAM_WIDE) / SEAM_CELL); x++)
          for (var y = Math.floor((Math.min(a[1], b[1]) - SEAM_WIDE) / SEAM_CELL); y <= Math.floor((Math.max(a[1], b[1]) + SEAM_WIDE) / SEAM_CELL); y++) {
            var g = grid.get(x + "," + y);
            if (!g) grid.set(x + "," + y, g = []);
            g.push(seg);
          }
      }
    });
    // How far a point lies from the other edge, in degrees, longitude counted at its true width (past SEAM_WIDE, 1).
    var far = function (p) {
      var g = grid.get(cell(p[0], p[1])), m = 1;
      if (!g) return m;
      var kx = Math.cos(p[1] * Math.PI / 180);
      for (var i = 0; i < g.length; i++) {
        var a = g[i][0], b = g[i][1], ax = (b[0] - a[0]) * kx, ay = b[1] - a[1], px = (p[0] - a[0]) * kx, py = p[1] - a[1];
        var L2 = ax * ax + ay * ay, t = L2 ? Math.max(0, Math.min(1, (px * ax + py * ay) / L2)) : 0, dx = px - t * ax, dy = py - t * ay;
        m = Math.min(m, Math.sqrt(dx * dx + dy * dy));
      }
      return m;
    };
    var lines = [];
    stA.outer.forEach(function (j) {
      var c = coordsOf(regA, j), run = [], close = false;
      for (var k = 0; k <= c.length; k++) {
        var d = k < c.length ? far(c[k]) : 1;
        if (d < SEAM_WIDE) { run.push(c[k]); close = close || d < SEAM_DEG; continue; }
        if (run.length > 1 && close) lines.push(prepareArc(run));
        run = []; close = false;
      }
    });
    divSeams.set(key, lines);
    if (divSeams.size > 32) divSeams.delete(divSeams.keys().next().value);
    return lines;
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
  var ctlIndex = null, ctlIndexLoad = null, ctlEnd = -Infinity;
  // A war whose file runs to the last month any war's file has (one still going on when the files were last
  // made) stays on the map after it, at its last month, as the borders stay at the data's last day.
  function ctlOn(w, day) { return day >= w.first && (day <= w.last || w.last === ctlEnd); }
  function ctlLoadIndex() {
    if (!ctlIndexLoad) ctlIndexLoad = fetchJSON("data/control.json").then(function (d) {
      ctlIndex = d.wars.map(function (w) { return { key: w[0], name: w[1], first: w[2], last: w[3], cap: divBoxCap(w[4]), file: "data/" + w[5], data: null, load: null }; });
      ctlEnd = ctlIndex.reduce(function (m, w) { return Math.max(m, w.last); }, -Infinity);
      scheduleRender();
    }).catch(function (e) { console.warn("control", e); });
    return ctlIndexLoad;
  }
  function ctlLoad(w) {
    if (!w.load) w.load = fetchJSON(w.file).then(function (d) {
      w.data = { kind: d.kind || "control", credit: d.credit || "", sides: d.sides, source: d.source, rows: d.rows, topo: d.topo, geoms: d.topo.objects.c.geometries, feats: [], arcs: [], states: new Map() };
      scheduleRender();
      return w;
    }).catch(function (e) { w.load = null; console.warn("control", w.key, e); });
    return w.load;
  }
  var ctlMonth = 0;
  // From 1648 the date is a day; before, a war's months are stepped through within the year (ctlMonth).
  function ctlDay() { return isMonthly(now) ? dayOfTime(now) : dayFromDate(Math.round(now), ctlMonth || 7, MID_DAY); }
  function ctlFineYear(y) {
    if (!layers.control || !ctlIndex || y >= monthlyFrom()) return false;
    var a = dayFromDate(y, 1, 1), b = dayFromDate(y, 12, 31);
    return ctlIndex.some(function (w) { return w.first < 0 && w.first <= b && w.last >= a; });
  }
  function ctlWars(day, needView) {
    if (!ctlIndex) { ctlLoadIndex(); return []; }
    var out = [];
    for (var i = 0; i < ctlIndex.length; i++) {
      var w = ctlIndex[i];
      if (!ctlOn(w, day)) continue;
      if (needView && !divInView(w.cap)) continue;
      if (!w.data) { ctlLoad(w); continue; }
      out.push(w);
    }
    return out;
  }
  function ctlState(w, day) {
    var D = w.data, idx = [];
    day = Math.min(day, w.last);
    for (var i = 0; i < D.rows.length; i++) { var r = D.rows[i]; if (r[1] <= day && day <= r[2]) idx.push(i); }
    var key = idx.join(","), st = D.states.get(key);
    if (st) return st;
    var owner = new Map(), lines = [];
    var walk = function (g, a) {
      if (typeof a === "number") {
        var j = a < 0 ? ~a : a, o = owner.get(j);
        if (o === undefined) owner.set(j, g); else if (o !== g && o !== -1) { owner.set(j, -1); lines.push(ctlArc(D, j)); }
        return;
      }
      for (var m = 0; m < a.length; m++) walk(g, a[m]);
    };
    idx.forEach(function (i) { var g = D.rows[i][3]; if (D.geoms[g].arcs) walk(g, D.geoms[g].arcs); });
    st = { rows: idx, lines: lines };
    D.states.set(key, st);
    if (D.states.size > 64) D.states.delete(D.states.keys().next().value);
    return st;
  }
  function ctlArc(D, j) {
    var a = D.arcs[j];
    if (!a) a = D.arcs[j] = prepareArc(topojson.feature(D.topo, { type: "LineString", arcs: [j] }).geometry.coordinates);
    return a;
  }
  function ctlFeat(w, g) {
    var D = w.data, f = D.feats[g];
    if (!f) { var geo = topojson.feature(D.topo, D.geoms[g]); f = D.feats[g] = { geo: geo, shape: prepare(geo) }; }
    return f;
  }
  function seatOn(r, day) { return (!r[2] || day >= warDay(r[2])) && (!r[3] || day <= warDay(r[3])); }
  var seatMemo = new Map();
  function warSeats(w, day) {
    var key = w.key + "|" + day + "|" + (current ? current.key : "") + "|" + (pal.colors || []).join("");
    var hit = seatMemo.get(key);
    if (hit) return hit;
    var D = w.data, table = SEATS[w.key] || {}, groups = SIDE_GROUPS[w.key] || [], parties = WAR_PARTIES[w.key] || [];
    var sides = D.sides.map(function (s) {
      var list = (table[s[0]] || []).filter(function (r) { return seatOn(r, day); }).map(function (r) { return { ll: [r[0], r[1]], firm: true }; });
      var gi = groups.indexOf(s[0]);
      if (gi >= 0 && parties[gi]) parties[gi].forEach(function (p) {
        if (!p.flag || p.side || (p.from && day < warDay(p.from)) || (p.to && day > warDay(p.to))) return;
        list.push({ ll: p.ll, firm: false });
      });
      var seats = [];
      list.forEach(function (x) {
        var q = polityAtLL(x.ll);
        if (q && !q.people && !q.claims) seats.push({ id: q.id, ll: x.ll, firm: x.firm, colour: pal.colors[q.color] });
      });
      return seats;
    });
    var firm = new Map(), loose = new Map();
    sides.forEach(function (seats, si) {
      seats.forEach(function (x) {
        var m = x.firm ? firm : loose;
        if (!m.has(x.id)) m.set(x.id, new Set());
        m.get(x.id).add(si);
      });
    });
    hit = sides.map(function (seats, si) {
      var keep = seats.filter(function (x) {
        var a = firm.get(x.id), b = loose.get(x.id);
        if (x.firm) return a.size === 1;
        return !a && b.size === 1;
      }), ids = [];
      keep.forEach(function (x) { if (ids.indexOf(x.id) < 0) ids.push(x.id); });
      return { ids: ids, seats: keep, all: seats };
    });
    if (seatMemo.size > 64) seatMemo.clear();
    seatMemo.set(key, hit);
    return hit;
  }
  var ctlDrawn = false;
  function drawControl(landPath, S) {
    ctlDrawn = false;
    if (!layers.control) return;
    var day = ctlDay();
    if (day === null) return;
    var wars = ctlWars(day, true);
    if (!wars.length) return;
    ctlDrawn = true;
    var lw = lineWeight(S);
    ctx.save();
    ctx.clip(landPath);
    for (var k = 0; k < wars.length; k++) {
      var w = wars[k], D = w.data, st = ctlState(w, day);
      if (D.kind === "presence") {
        for (var i = 0; i < st.rows.length; i++) {
          var r = D.rows[st.rows[i]];
          ctx.beginPath(); traceFeature(ctx, ctlFeat(w, r[3]).shape);
          ctx.globalAlpha = 0.2; ctx.fillStyle = D.sides[r[0]][2]; ctx.fill();
        }
        continue;
      }
      ctx.globalAlpha = 0.9;
      ctx.beginPath(); traceArcs(ctx, st.lines);
      ctx.strokeStyle = pal.front; ctx.lineWidth = 1.1 + 0.5 * lw; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
    }
    ctx.restore();
  }
  function paintHeld(snap, L) {
    if (!layers.control) return null;
    var day = ctlDay();
    if (day === null) return null;
    var wars = ctlWars(day, true), path = null;
    for (var k = 0; k < wars.length; k++) {
      var w = wars[k], D = w.data;
      if (D.kind === "presence") continue;
      var st = ctlState(w, day), own = warSeats(w, day);
      for (var i = 0; i < st.rows.length; i++) {
        var r = D.rows[st.rows[i]], f = ctlFeat(w, r[3]), side = own[r[0]], zone = new Path2D();
        traceFeature(zone, f.shape);
        if (!path) path = new Path2D();
        path.addPath(zone);
        ctx.save();
        ctx.clip(zone);
        if (side.seats.length) {
          if (!f.mid) f.mid = d3.geoCentroid(f.geo);
          var near = side.seats[0], best = Infinity;
          side.seats.forEach(function (x) { var dd = d3.geoDistance(x.ll, f.mid); if (dd < best) { best = dd; near = x; } });
          var keep = new Path2D();
          keep.rect(-10, -10, W + 20, H + 20);
          for (var j = 0; j < snap.polys.length; j++) { var q = snap.polys[j]; if (q && side.ids.indexOf(q.id) >= 0) traceAll(keep, L.feats[j]); }
          ctx.clip(keep, "evenodd");
          ctx.fillStyle = near.colour; ctx.fillRect(-10, -10, W + 20, H + 20);
        } else {
          ctx.fillStyle = pal.paper; ctx.fillRect(-10, -10, W + 20, H + 20);
          ctx.globalAlpha = 0.36; ctx.fillStyle = D.sides[r[0]][2]; ctx.fillRect(-10, -10, W + 20, H + 20);
        }
        ctx.restore();
      }
    }
    return path;
  }
  var warIdMemo = { key: "", ids: null };
  function atWarIds() {
    if (!layers.control || !current) return null;
    var day = ctlDay();
    if (day === null) return null;
    var wars = ctlWars(day, false), rows = warsAtDate();
    var key = day + "|" + current.key + "|" + wars.map(function (w) { return w.key; }).join(",") + "|" + rows.length;
    if (warIdMemo.key === key) return warIdMemo.ids;
    var ids = new Set();
    wars.forEach(function (w) {
      var st = ctlState(w, day), held = new Set(st.rows.map(function (i) { return w.data.rows[i][0]; }));
      warSeats(w, day).forEach(function (s, si) { if (held.has(si)) s.all.forEach(function (x) { ids.add(x.id); }); });
    });
    rows.forEach(function (r) {
      r.groups.forEach(function (g) { g.forEach(function (m) { var q = m.ll ? polityAtLL(m.ll) : null; if (q) ids.add(q.id); }); });
    });
    warIdMemo = { key: key, ids: ids };
    return ids;
  }
  var SWORD = typeof Path2D === "function" ? new Path2D("M6 0L7.9 2.8V14.4H4.1V2.8Z M0.8 14.4H11.2V16.9H0.8Z M4.9 16.9H7.1V20.6H4.9Z M7.8 22.2A1.8 1.8 0 1 1 4.2 22.2A1.8 1.8 0 1 1 7.8 22.2Z") : null;
  function drawSword(it, geo, alpha) {
    var ln = geo.lines[0];
    if (!ln || !SWORD) return null;
    var o = ln.straight ? { x: ln.mx, y: ln.my, tx: ln.tx, ty: ln.ty, nx: ln.nx, ny: ln.ny } : ln.gl[Math.floor(ln.gl.length / 2)];
    if (!o) return null;
    var s = Math.max(0.55, Math.min(1.05, it.f * 0.065)), d = it.f * 0.62 + 12 * s;
    ctx.setTransform(dpr * o.tx, dpr * o.ty, -dpr * o.nx, -dpr * o.ny, dpr * o.x, dpr * o.y);
    ctx.translate(0, -d);
    ctx.scale(s, s);
    ctx.translate(-6, -11.8);
    ctx.globalAlpha = alpha;
    ctx.lineJoin = "round";
    ctx.lineWidth = 3.6; ctx.strokeStyle = pal["label-halo"]; ctx.stroke(SWORD);
    ctx.fillStyle = it.people ? pal.people : pal.label; ctx.fill(SWORD);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    return mkBox(o.x + o.nx * d, o.y + o.ny * d, 7 * s, 12.5 * s, Math.atan2(o.ty, o.tx));
  }
  // A side's name in the reader's language: the place names' table for a state, the atlas's own strings for the rest.
  function sideNameL(n) { return (PL.pol && PL.pol[n]) || T(n); }
  // The war and its file at a point, for the hover's "held by" and the card's Sources.
  function controlAt(ll) {
    var c = controlInfoAt(ll);
    return c ? c.text : null;
  }
  function controlInfoAt(ll) {
    if (!layers.control || !ll) return null;
    var day = ctlDay();
    if (day === null) return null;
    var wars = ctlWars(day, false);
    for (var k = 0; k < wars.length; k++) {
      var w = wars[k], D = w.data, st = ctlState(w, day);
      for (var i = 0; i < st.rows.length; i++) {
        var r = D.rows[st.rows[i]];
        if (d3.geoContains(ctlFeat(w, r[3]).geo, ll)) return { key: w.key, name: w.name, source: D.source || "", text: T(D.kind === "presence" ? "presence of {name}" : "held by {name}", { name: sideNameL(D.sides[r[0]][1]) }) + (D.credit ? T(", per {credit}", { credit: T(D.credit) }) : "") };
      }
    }
    return null;
  }
  var divDrawn = false;
  function drawDivisionLines(snap, L, landPath, S) {
    divDrawn = false;
    if (!layers.subdivisions || S < DIV_FROM) return;
    var day = divDay();
    if (day === null) return;
    var regs = divRegions(day, true), w = 0.65 + 0.35 * lineWeight(S), clipped = false;
    for (var r = 0; r < regs.length; r++) {
      var st = divState(regs[r], day), own = divCountry(regs[r], snap), lines = st.lines;
      // A later file dividing the same state as this one: the line between the two files' divisions (see divSeam).
      for (var q = r + 1; q < regs.length && own.length; q++) {
        var other = divCountry(regs[q], snap);
        if (other.some(function (i) { return own.indexOf(i) >= 0; })) lines = lines.concat(divSeam(regs[r], st, regs[q], divState(regs[q], day)));
      }
      if (!lines.length || !own.length) continue;
      var shape = new Path2D();
      for (var i = 0; i < own.length; i++) traceAll(shape, L.feats[own[i]]);
      if (!clipped) { ctx.save(); ctx.clip(landPath); clipped = true; }
      ctx.save();
      ctx.clip(shape);
      ctx.beginPath(); traceArcs(ctx, lines);
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
    var L = shapesOf(current), own = divCountry(reg, current), ll = [lab[0], lab[1]];
    hit = false;
    for (var i = 0; i < own.length && !hit; i++) hit = inBounds(L.bounds[own[i]], ll) && d3.geoContains(L.geo[own[i]], ll);
    st.inside.set(ri + "|" + current.key, hit);
    return hit;
  }
  var divMeasure = new Map(), divLayout = { key: "", items: [] };
  function divText(name, f) {
    var key = name + "|" + f.toFixed(1), hit = divMeasure.get(key);
    if (hit) return hit;
    var text = name.toLocaleUpperCase(LANG), opts = [{ lines: [text], w: ctx.measureText(text).width }];
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
        var opts = divText(divNameL(reg.key, row[0]), f), got = null;
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
    var key = [current.key, day, regs.map(function (r) { return r.key; }).join(), view.lon.toFixed(5), view.lat.toFixed(5), view.zoom.toFixed(5), view.roll.toFixed(4), flat ? 1 : 0, W, H, layoutEpoch, placed.length, sig].join("|");
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
        inkText(it.lines[j], it.x + it.sp / 2, ly);
      }
    }
    ctx.letterSpacing = "0px";
  }
  // Whether a point lies in a state's shape on the map shown.
  function insidePolity(ll, id) {
    if (!ll || id < 0 || !current) return false;
    var L = shapesOf(current);
    for (var i = 0; i < current.polys.length; i++) {
      var p = current.polys[i];
      if (p && p.id === id && inBounds(L.bounds[i], ll) && d3.geoContains(L.geo[i], ll)) return true;
    }
    return false;
  }
  var divAtReg = null;
  function divisionAt(ll, id) {
    var day = divDay();
    divAtReg = null;
    if (!ll || id < 0 || day === null || !current) return null;
    var name = polityName(id);
    if (!insidePolity(ll, id)) return null;
    if (!divIndex) { divLoadIndex(); return null; }
    for (var r = 0; r < divIndex.length; r++) {
      var reg = divIndex[r];
      if (reg.names.indexOf(name) < 0 || day < reg.first || (reg.last !== null && day > reg.last)) continue;
      if (!reg.data) { divLoad(reg); continue; }
      var D = reg.data, st = divState(reg, day);
      for (var k = 0; k < st.rows.length; k++) {
        var row = D.rows[st.rows[k]], f = divFeat(reg, row[3]);
        if (inBounds(f.bounds, ll) && d3.geoContains(f.geo, ll)) { divAtReg = reg.key; return row[0]; }
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
    var country = ($("card-name") || {}).textContent || "";
    var nameL = name ? divNameL(divAtReg, name) : "";
    var text = name ? (country && country !== nameL ? T("You clicked on {name} within {country}.", { name: nameL, country: country }) : T("You clicked on {name}.", { name: nameL })) : "";
    var shown = text + "|" + (name ? askYear() + "|" + selected : "");
    if (shown === divShown) return;
    divShown = shown;
    el.textContent = text;
    el.hidden = !text;
    srcDivision(name ? divAtReg : null);
    divNote(name, nameL);
  }
  function loadingDots(el, live) {
    var dots = 3;
    el.textContent = T("Loading") + "...";
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return 0;
    var tick = setInterval(function () {
      if (!live()) { clearInterval(tick); return; }
      dots = dots % 3 + 1;
      el.textContent = T("Loading") + ".".repeat(dots);
    }, 450);
    return tick;
  }
  var divNoteAsk = 0, divNoteTimer = 0;
  function divNote(name, nameL) {
    var box = $("card-divnote"), out = $("divnote-text"), by = $("divnote-by"), ask = ++divNoteAsk;
    clearTimeout(divNoteTimer);
    by.textContent = "";
    out.textContent = "";
    out.hidden = true;
    out.className = "ch-wiki-text";
    if (!name || selected < 0) { box.hidden = true; return; }
    var y = askYear(), q = { kind: "division", name: name, country: polityName(selected), year: y };
    var show = function (job) {
      by.hidden = true;
      out.hidden = false;
      out.classList.add("is-writing", "is-quiet");
      var tick = loadingDots(out, function () { return ask === divNoteAsk && out.classList.contains("is-writing"); });
      job.then(function (t) {
        clearInterval(tick);
        if (ask !== divNoteAsk) return;
        out.classList.remove("is-writing", "is-quiet");
        if (t) { out.textContent = t; return; }
        out.hidden = true;
        if (blurbStop) blurbStopShow(by); else by.textContent = T("The note could not be written just now.");
        by.hidden = false;
      });
    };
    var have = blurbCache.get(JSON.stringify(q));
    box.hidden = false;
    if (have) { show(have); return; }
    var b = document.createElement("button");
    b.type = "button";
    b.className = "ch-wiki-ask";
    b.textContent = T("Write about {name} in {year}", { name: nameL || name, year: fmtYear(y) });
    b.addEventListener("click", function () { if (ask === divNoteAsk) show(blurbFetch(q)); });
    by.appendChild(b);
    by.hidden = false;
    divNoteTimer = setTimeout(function () {
      blurbFetch(q, true).then(function (t) { if (t && ask === divNoteAsk && !out.textContent) show(Promise.resolve(t)); });
    }, BLURB_PEEK);
  }

  function inBounds(b, ll) {
    if (ll[1] < b[0][1] || ll[1] > b[1][1]) return false;
    if (b[0][0] <= b[1][0]) return ll[0] >= b[0][0] && ll[0] <= b[1][0];
    return ll[0] >= b[0][0] || ll[0] <= b[1][0];
  }
  var landGeo = null;
  function polityAt(x, y) {
    if (!current) return null;
    return polityAtLL(lonLatAt(x, y));
  }
  function polityAtLL(ll) {
    if (!current || !ll) return null;
    var lg = landGeoAt();
    if (lg && !d3.geoContains(lg, ll)) return null;
    var L = shapesOf(current), best = null, bestA = Infinity;
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
  // A move on the screen as a move east and south at the centre, undoing the globe's roll.
  function unroll(dx, dy) {
    if (flat || !view.roll) return [dx, dy];
    var c = Math.cos(view.roll * D2R), s = Math.sin(view.roll * D2R);
    return [c * dx + s * dy, -s * dx + c * dy];
  }
  function panBy(dx, dy) {
    var s = degPerPx(), d = unroll(dx, dy);
    view.lon -= d[0] * s; view.lat += d[1] * s;
    applyView();
    nudge();
  }
  // An arrow key moves the map a tenth of the screen's shorter side that way, eased over a fifth of a second (at once
  // with reduced motion); held down, the key's repeats carry it on.
  var panRaf = 0;
  function panKey(key) {
    var px = Math.min(W, H) / 10, dx = key === "ArrowLeft" ? px : key === "ArrowRight" ? -px : 0, dy = key === "ArrowUp" ? px : key === "ArrowDown" ? -px : 0;
    stopInertia();
    cancelAnimationFrame(flyRaf);
    cancelAnimationFrame(panRaf);
    if (reduceMotion) { panBy(dx, dy); return; }
    var t0 = performance.now(), done = 0, DUR = 180;
    var step = function (t) {
      var k = Math.min(1, (t - t0) / DUR), e = 1 - Math.pow(1 - k, 3);
      panBy(dx * (e - done), dy * (e - done));
      done = e;
      if (k < 1) panRaf = requestAnimationFrame(step);
    };
    panRaf = requestAnimationFrame(step);
  }
  // Turns the globe by `deg` degrees clockwise about the centre of the screen.
  function rollBy(deg) {
    if (flat || !deg) return;
    view.roll = wrap180(view.roll + deg);
    applyView();
    syncCompass();
    nudge();
  }
  // Moves the map so the place `ll` (lon, lat) is back under the screen point x, y.
  function keepAt(ll, x, y) {
    if (!ll) return;
    if (flat) {
      view.lon = ll[0] - (x - cx) / FB.k / D2R;
      view.lat = ll[1] + (y - cy) / FB.k / D2R;
      applyView();
      return;
    }
    for (var i = 0; i < 4; i++) {
      var after = projection(ll);
      if (!after) break;
      if (Math.hypot(x - after[0], y - after[1]) < 0.25) break;
      var s = degPerPx(), d = unroll(x - after[0], y - after[1]);
      view.lon -= d[0] * s;
      view.lat += d[1] * s;
      applyView();
    }
  }
  function zoomAt(z, x, y) {
    var before = lonLatAt(x, y);
    view.zoom = z;
    applyView();
    keepAt(before, x, y);
    nudge();
  }

  var pointers = new Map(), drag = null, pinch = null, inertia = null, downAt = null;
  function stopInertia() { if (inertia) { cancelAnimationFrame(inertia.raf); inertia = null; } }
  // Two-finger gestures. PINCH_MIN keeps fingers set down almost together from zooming wildly on a tiny spread;
  // TWIST_GAP is the spread below which a twist is too noisy to turn the globe; PINCH_JUMP is a midpoint move, in one
  // event, too big to be a finger's.
  var PINCH_MIN = 40, TWIST_GAP = 90, PINCH_JUMP = 90;
  function startPinch(pts, ids) {
    pinch = {
      ids: ids || Array.from(pointers.keys()).slice(0, 2),
      d: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), z: view.zoom,
      mx: (pts[0].x + pts[1].x) / 2, my: (pts[0].y + pts[1].y) / 2,
      a: Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x), twist: 0, turning: pinch && pinch.turning || false
    };
  }
  canvas.addEventListener("pointerdown", function (e) {
    lastDownType = e.pointerType;
    stopInertia();
    lapseHold();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    hideTip();
    if (devMode === "label" && pointers.size === 1) {
      var lab = devLabelAt(e.clientX, e.clientY);
      if (lab) { devDrag = lab; drag = null; downAt = null; return; }
    }
    if (pointers.size === 1) {
      drag = { x: e.clientX, y: e.clientY, samples: [[e.timeStamp, e.clientX, e.clientY]], spin: !flat && (e.shiftKey || e.button === 2) ? Math.atan2(e.clientY - cy, e.clientX - cx) : null };
      downAt = { x: e.clientX, y: e.clientY, t: e.timeStamp, moved: false };
    } else if (pointers.size === 2) {
      var pts = Array.from(pointers.values());
      startPinch(pts);
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
    if (devDrag) {
      var ll = lonLatAt(e.clientX + devDrag.dx, e.clientY + devDrag.dy);
      if (ll) { devGhost = { target: devDrag.target, lon: ll[0], lat: ll[1], size: devDrag.size, angle: devDrag.angle }; labelCache.delete("layout"); scheduleRender(); }
      return;
    }
    if (pinch && pointers.size >= 2) {
      // Only the two fingers the pinch began with move it; a third is ignored.
      var p0 = pointers.get(pinch.ids[0]), p1 = pointers.get(pinch.ids[1]);
      if (!p0 || !p1) return;
      var d = Math.hypot(p0.x - p1.x, p0.y - p1.y), mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
      // One finger's event moves the midpoint by half its step; a jump larger than a finger can make between two events
      // (a finger lifted and set down unseen) starts the pinch afresh rather than throwing the map.
      if (Math.hypot(mx - pinch.mx, my - pinch.my) > PINCH_JUMP) { startPinch([p0, p1], pinch.ids); return; }
      // The place under the fingers' midpoint stays under it: the zoom is about it, and so is any turn.
      var under = lonLatAt(pinch.mx, pinch.my);
      view.zoom = pinch.z * Math.max(PINCH_MIN, d) / Math.max(PINCH_MIN, pinch.d);
      applyView();
      // Twisting turns the globe only past a threshold, raised once the pinch has zoomed, and then only by the twist
      // beyond it, so it eases in instead of jumping. Fingers close together give a noisy angle, so they don't turn it.
      var a = Math.atan2(p1.y - p0.y, p1.x - p0.x), da = wrap180((a - pinch.a) / D2R);
      pinch.a = a;
      if (!flat && d >= TWIST_GAP && Math.abs(da) < 30) {
        pinch.twist += da;
        var from = Math.abs(Math.log(view.zoom / pinch.z)) > 0.2 ? TWIST_ZOOMED : TWIST_FROM;
        if (pinch.turning) rollBy(da);
        else if (Math.abs(pinch.twist) > from) { pinch.turning = true; rollBy(pinch.twist - Math.sign(pinch.twist) * from); }
      }
      keepAt(under, mx, my);
      pinch.mx = mx; pinch.my = my;
      nudge();
      return;
    }
    if (!drag) return;
    if (downAt && !downAt.moved && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) downAt.moved = true;
    if (drag.spin !== null && drag.spin !== undefined) {
      // With Shift held, or the right button, a drag turns the globe about the centre of the screen.
      if (!downAt || downAt.moved) {
        var sa = Math.atan2(e.clientY - cy, e.clientX - cx);
        if (Math.hypot(e.clientX - cx, e.clientY - cy) > 12) rollBy(wrap180((sa - drag.spin) / D2R));
        drag.spin = sa;
        setHover(-1);
      }
      return;
    }
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
    else if (pinch && pinch.ids.indexOf(e.pointerId) >= 0) { var two = Array.from(pointers.keys()).slice(0, 2); startPinch(two.map(function (k) { return pointers.get(k); }), two); }
    if (devDrag) {
      var dd = devDrag;
      devDrag = null;
      if (devGhost && dev && dev.ui) dev.ui.onPick("label", { name: dd.target, shown: dd.shown, lon: devGhost.lon, lat: devGhost.lat, size: dd.size, angle: dd.angle });
      return;
    }
    if (pointers.size === 1) {
      var rest = Array.from(pointers.values())[0];
      drag = { x: rest.x, y: rest.y, samples: [] };
      return;
    }
    if (pointers.size) return;
    if (moving) { clearTimeout(settleTimer); settleTimer = setTimeout(settle, SETTLE_MS); }
    var clickLike = downAt && !downAt.moved && e.timeStamp - downAt.t < 600 && e.type === "pointerup";
    if (clickLike) {
      if (reportPicking) { pickReport(e.clientX, e.clientY); drag = null; downAt = null; return; }
      if (devMode && devMode !== "label" && devClick(e.clientX, e.clientY)) { drag = null; downAt = null; return; }
      var town = cityAt(e.clientX, e.clientY, e.pointerType !== "mouse");
      var p = town ? null : polityAt(e.clientX, e.clientY), lab = town ? null : polityLabelAt(e.clientX, e.clientY);
      if ((playTimer || lapse) && (town || p)) { pauseNote(e.clientX, e.clientY); drag = null; downAt = null; return; }
      divClick = town ? null : lonLatAt(e.clientX, e.clientY);
      if (town) openCity(town); else select(lab ? lab.id : p ? p.id : -1);
    } else if (drag && drag.spin === null && drag.samples.length >= 2 && !reduceMotion) {
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
  // No page zoom on a touch screen (see the note on touch-action in app.css): Safari's own pinch events are refused wherever they
  // begin. A Mac's trackpad, which sends them too, is left alone.
  if (navigator.maxTouchPoints > 0) ["gesturestart", "gesturechange", "gestureend"].forEach(function (type) {
    document.addEventListener(type, function (e) { e.preventDefault(); }, { passive: false });
  });
  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    stopInertia();
    lapseHold();
    var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomAt(view.zoom * Math.exp(-dy * 0.0016), e.clientX, e.clientY);
  }, { passive: false });
  // A double click with a mouse zooms in. A double tap with a finger or a pen does not (since 23 November 2026): two quick taps
  // on a country, wanting its card, zoomed the map in instead; a finger has the pinch.
  var lastDownType = "mouse";
  canvas.addEventListener("dblclick", function (e) { if (lastDownType === "mouse") zoomAt(view.zoom * 2, e.clientX, e.clientY); });
  // The right button turns the globe, so the canvas keeps its own menu to itself.
  canvas.addEventListener("contextmenu", function (e) { if (!flat) e.preventDefault(); });

  // Turning: the buttons under Globe in the View panel and the keys [ and ] turn the globe TURN_STEP degrees, and N, the
  // compass, or the third button turns it back north up, over TURN_MS (at once when motion is reduced).
  var TWIST_FROM = 15, TWIST_ZOOMED = 30, TURN_STEP = 15, TURN_MS = 380, turnAnim = 0;
  function turnTo(target) {
    if (flat) return;
    cancelAnimationFrame(turnAnim);
    var from = view.roll, d = wrap180(target - from);
    if (!d) return;
    if (reduceMotion) { rollBy(d); return; }
    var t0 = performance.now();
    var step = function (t) {
      var k = Math.min(1, (t - t0) / TURN_MS), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      view.roll = wrap180(from + d * e);
      applyView(); syncCompass(); nudge();
      if (k < 1) turnAnim = requestAnimationFrame(step); else writeHash();
    };
    turnAnim = requestAnimationFrame(step);
  }
  function syncCompass() {
    var turned = !flat && Math.abs(view.roll) >= 0.05;
    $("compass").hidden = !turned;
    if (turned) $("compass-needle").setAttribute("transform", "rotate(" + view.roll.toFixed(2) + " 16 16)");
    $("turn").hidden = $("turn-how").hidden = flat;
    $("turn-north").disabled = !turned;
  }
  $("turn-left").addEventListener("click", function () { turnTo(Math.round((view.roll - TURN_STEP) / TURN_STEP) * TURN_STEP); });
  $("turn-right").addEventListener("click", function () { turnTo(Math.round((view.roll + TURN_STEP) / TURN_STEP) * TURN_STEP); });
  $("turn-north").addEventListener("click", function () { turnTo(0); });
  $("compass").addEventListener("click", function () { turnTo(0); });

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
    var n = ids.map(polityNameL);
    return n.length < 3 ? n.join(T(" and ")) : n.slice(0, -1).join(T(", ")) + T(", and ") + n[n.length - 1];
  }
  function addTpl(el, tpl, vals) {
    tpl.split(/(\{\w+\})/).forEach(function (part) {
      var m = /^\{(\w+)\}$/.exec(part), v = m ? vals[m[1]] : part;
      if (v == null || v === "") return;
      el.appendChild(typeof v === "string" || typeof v === "number" ? document.createTextNode(String(v)) : v);
    });
  }
  var stripeCache = new Map();
  var stripeAnchor = null, stripeT = [0, 0], stripeNow = [0, 0];
  function setStripeT(p) {
    if (p && p.setTransform && window.DOMMatrix) p.setTransform(new DOMMatrix().translateSelf(stripeNow[0], stripeNow[1]).rotateSelf(45).scaleSelf(0.5));
  }
  function anchorStripes(fixed) {
    if (!fixed) {
      var p = stripeAnchor ? projectLL(stripeAnchor.lon, stripeAnchor.lat) : null;
      if (!p || Math.hypot(p[0] - cx, p[1] - cy) > (flat ? Math.max(W, H) : B.r * 0.6)) {
        var ll = lonLatAt(cx, cy), q = ll ? projectLL(ll[0], ll[1]) : null;
        if (q) { stripeAnchor = { lon: ll[0], lat: ll[1], ox: stripeT[0] - q[0], oy: stripeT[1] - q[1] }; p = q; }
      }
      if (p && stripeAnchor) stripeT = [p[0] + stripeAnchor.ox, p[1] + stripeAnchor.oy];
    }
    stripeNow = fixed ? [0, 0] : stripeT;
    stripeCache.forEach(setStripeT);
  }
  var STRIPE_LINE = 0.35;
  function stripes(cols) {
    var key = cols.join("|") + "|" + pal.colors.join(","), p = stripeCache.get(key);
    if (p) return p;
    var B = 12, cv = document.createElement("canvas");
    cv.width = B * cols.length; cv.height = 2;
    var g = cv.getContext("2d");
    cols.forEach(function (col, i) { g.fillStyle = pal.colors[col]; g.fillRect(i * B, 0, B, 2); });
    // A fine dark line between the stripes, so they show however alike the claimants' colours look
    // (to colour-blind eyes, many pairs of the ten colours look the same).
    g.globalAlpha = STRIPE_LINE; g.fillStyle = pal.border;
    cols.forEach(function (col, i) { g.fillRect(i * B, 0, 2, 2); });
    p = ctx.createPattern(cv, "repeat");
    setStripeT(p);
    stripeCache.set(key, p);
    return p;
  }
  var TIP_ICONS = {
    flag: '<path d="M4 14.2V2.2" /><path d="M4 2.9c1.9-1 3.5.9 5.4 0s3.2-.8 4.2-.2v6c-1-.6-2.3-.7-4.2.2s-3.5-1-5.4 0" />',
    region: '<path stroke-dasharray="0.1 2.3" d="M2.2 6.2L5.6 2.4l4.1 1.6 3.9-.6.7 4.6-2.2 2.5.6 3.6-4.6-.6-3.4 1.2-1.4-4.4z" />',
    city: '<path d="M1.8 14h12.4M3 14V8.2h3V14M6 14V3.6h4V14M10 14V6.8h3.2V14" /><path d="M7.4 6v.1M8.6 6v.1M7.4 8.4v.1M8.6 8.4v.1M7.4 10.8v.1M8.6 10.8v.1M4.5 10.4v.1M11.6 9.2v.1M11.6 11.4v.1" />',
    capital: '<path d="M1.8 14h12.4M3 14V8.2h3V14M6 14V5.6h4V14M10 14V6.8h3.2V14" /><path d="M8 5.6V1" /><path d="M8 1.3h3l-.8 1 .8 1H8" /><path d="M7.4 7.6v.1M8.6 7.6v.1M7.4 9.7v.1M8.6 9.7v.1M7.4 11.8v.1M8.6 11.8v.1M4.5 10.4v.1M11.6 9.2v.1M11.6 11.4v.1" />'
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
    setTip(dv ? "region" : p.people ? null : "flag", dv ? divNameL(divAtReg, dv) + T(", ") + polityNameL(p.id) : polityNameL(p.id));
    var sub = p.claims ? T(polityName(p.id) === "Disputed land" ? "between {names}" : "disputed between {names}", { names: claimNames(p.claims) }) + (p.ruler >= 0 ? T(", held by {name}", { name: polityNameL(p.ruler) }) : "") : p.ruler >= 0 ? T("held by {name}", { name: polityNameL(p.ruler) }) + (p.member >= 0 && p.member !== p.id ? T(", ") + inGroup(p.member) : "") : p.member >= 0 && p.member !== p.id ? inGroup(p.member) : p.band ? T("bands with no fixed borders") : p.people ? T("a people or culture") : "";
    var held = controlAt(lonLatAt(x, y));
    if (held) sub = (sub ? sub + " | " : "") + held;
    if (sub) { var s = document.createElement("small"); s.textContent = sub; tip.appendChild(s); }
    tip.hidden = false;
    var w = tip.offsetWidth;
    tip.style.left = (x + 14 + w > W - 8 ? x - w - 28 : x) + "px";
    tip.style.top = y + "px";
    resyncCoords();
  }
  function hideTip() { tip.hidden = true; resyncCoords(); }
  // While the map plays or follows a country, a click on a state or a city opens nothing: a note on the atlas's paper,
  // where the click was, says to pause first, and fades after two and a half seconds (since 25 November 2026).
  var pauseNoteEl = $("pause-note"), pauseNoteTimer = 0;
  function pauseNote(x, y) {
    if (!pauseNoteEl) return;
    hideTip();
    pauseNoteEl.textContent = T("Pause the map first, then click a country.");
    pauseNoteEl.hidden = false;
    var w = pauseNoteEl.offsetWidth, h = pauseNoteEl.offsetHeight;
    pauseNoteEl.style.left = Math.round(Math.max(8 + w / 2, Math.min(window.innerWidth - 8 - w / 2, x))) + "px";
    pauseNoteEl.style.top = Math.round(Math.max(8 + h + 14, y)) + "px";
    void pauseNoteEl.offsetWidth;
    pauseNoteEl.classList.add("is-on");
    clearTimeout(pauseNoteTimer);
    pauseNoteTimer = setTimeout(function () {
      pauseNoteEl.classList.remove("is-on");
      pauseNoteTimer = setTimeout(function () { pauseNoteEl.hidden = true; }, 250);
    }, 2500);
  }
  // With Shift held, the coordinates under the cursor, beside it (Noah's request, 15 November 2026).
  var coords = $("coords"), mouseAt = null;
  function syncCoords(shift) {
    var ll = shift && mouseAt ? lonLatAt(mouseAt[0], mouseAt[1]) : null;
    if (!ll) { coords.hidden = true; return; }
    var part = function (v, pos, neg) { return Math.abs(v).toFixed(2) + "° " + (v < 0 ? neg : pos); };
    coords.textContent = part(ll[1], "N", "S") + ", " + part(ll[0], "E", "W");
    coords.hidden = false;
    var w = coords.offsetWidth;
    // With a tooltip showing, the coordinates sit just above it, on its left edge, whatever its height (Noah, 27 November
    // 2026: a two-line tooltip, a city with its modern name, rose into them).
    if (!tip.hidden) {
      var r = tip.getBoundingClientRect();
      coords.style.transform = "none";
      coords.style.left = Math.round(r.left) + "px";
      coords.style.top = Math.round(Math.max(8, r.top - 6 - coords.offsetHeight)) + "px";
      return;
    }
    coords.style.transform = "";
    coords.style.left = (mouseAt[0] + 14 + w > W - 8 ? mouseAt[0] - w - 28 : mouseAt[0]) + "px";
    coords.style.top = Math.max(48, mouseAt[1]) + "px";
  }
  function resyncCoords() { if (coords && !coords.hidden) syncCoords(true); }
  canvas.addEventListener("pointermove", function (e) { if (e.pointerType === "mouse") { mouseAt = [e.clientX, e.clientY]; syncCoords(e.shiftKey); } });
  canvas.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") { mouseAt = null; syncCoords(false); } });
  document.addEventListener("keydown", function (e) { if (e.key === "Shift") syncCoords(true); });
  // The globe's focus ring is for those who reach it with Tab. Browsers count the arrow keys as keyboard use, so a click
  // on the globe after stepping the year drew the ring round the whole screen; it now shows only after Tab, until the
  // next click or tap.
  document.addEventListener("keydown", function (e) { if (e.key === "Tab") document.documentElement.classList.add("ch-tabbing"); }, true);
  document.addEventListener("pointerdown", function () { document.documentElement.classList.remove("ch-tabbing"); }, true);
  document.addEventListener("keyup", function (e) { if (e.key === "Shift") syncCoords(false); });
  window.addEventListener("blur", function () { syncCoords(false); });
  // The state or people whose name is under the point: a click on a name opens what the name names, so a click on
  // POLAND in 1316 opens Poland, not the duchy the letters lie on (Noah, 27 November 2026).
  function polityLabelAt(x, y) {
    for (var i = placedLabels.length - 1; i >= 0; i--) {
      var l = placedLabels[i];
      if ((l.kind !== "polity" && l.kind !== "people") || l.sea || !l.boxes || !catalogue[l.id]) continue;
      var b = l.box;
      if (!b || x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) continue;
      for (var j = 0; j < l.boxes.length; j++) { var q = l.boxes[j]; if (x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h) return l; }
    }
    return null;
  }
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
    setTip(l.kind === "capital" ? "capital" : "city", st ? placeNameL(c.name, ref.qid) + T(", ") + polityNameL(st.id) : placeNameL(c.name, ref.qid));
    var sub = c.modern !== c.name ? T("now {name}", { name: placeNameL(c.modern, ref.qid) }) : "";
    if (sub) { var s = document.createElement("small"); s.textContent = sub; tip.appendChild(s); }
    tip.hidden = false;
    var w = tip.offsetWidth;
    tip.style.left = (x + 14 + w > W - 8 ? x - w - 28 : x) + "px";
    tip.style.top = y + "px";
    resyncCoords();
  }

  function eraYear(y) { return y < 0 ? T("{y} BC", { y: -y }) : y < 1000 ? T("AD {y}", { y: y }) : String(y); }
  function fmtYear(y) { return T("@year", { y: eraYear(y) }); }
  // Years under 1000 carry their era ("July AD 800"), as the year alone does, so "January 1" can't be read as a day.
  function monthYear(y, m) { return T("@my", { month: MONTHS_L[m - 1], m: m, y: y >= 1000 ? String(y) : eraYear(y) }); }
  // Month, day, year ("August 23, 1815"), as the date's frame writes it.
  function fmtMDY(y, m, d) { return T("@mdy", { month: MONTHS_G[m - 1], m: m, d: d, y: y >= 1000 ? String(y) : eraYear(y) }); }
  function fmtDay(day) { var d = dateOfDay(day); return fmtMDY(d[0], d[1], d[2]); }
  function fmtDate(day) { return fmtDay(day); }
  function dayYear(day) { var d = dateOfDay(day); return d[0] + ((d[1] - 1) * 30.44 + d[2] - 0.5) / 366; }
  function fmtNow(t) {
    if (!isMonthly(t)) {
      var ry = Math.round(t);
      if (preDate && Math.abs(t - now) < 1e-9) return preDate.d ? fmtMDY(ry, preDate.m, preDate.d) : monthYear(ry, preDate.m);
      return ctlMonth && layers.control ? monthYear(ry, ctlMonth) : fmtYear(ry);
    }
    var d = dateOfDay(dayOfTime(t));
    // The day is always shown (Noah, 25 November 2026); until then the 15th stood for the whole month and showed as one.
    return fmtMDY(d[0], d[1], d[2]);
  }
  // Where the date's field is too narrow for the month's name (on a phone, between the buttons), it is cut to three letters.
  var fitCtx = null, fitBox = null, fitWatch = false;
  function fitDate(text) {
    var m = LANG === "en" ? /^([A-Z][a-z]+)( .+)$/.exec(text) : null, el = $("year-input");
    if (LANG !== "en") {
      var k = -1, full = "";
      for (var q = 0; q < 12 && k < 0; q++) [MONTHS_G[q], MONTHS_L[q]].forEach(function (nm) { if (k < 0 && nm.length > 4 && text.indexOf(nm) >= 0) { k = q; full = nm; } });
      if (k < 0 || !el) return text;
      m = [text, full, text.replace(full, "\u0000")];
    }
    if (!m || m[1].length <= 3 || !el) return text;
    // The box's font and room are read once and again when its size changes, not at each date: reading them makes the
    // browser lay the page out there and then, twice for every date the marker is dragged through.
    if (!fitBox) {
      if (!el.clientWidth) return text;
      var st = getComputedStyle(el);
      fitBox = { font: st.fontStyle + " " + st.fontWeight + " " + st.fontSize + " " + st.fontFamily, room: el.clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight) - 2, fits: new Map() };
      if (!fitWatch) {
        fitWatch = true;
        var forget = function () { fitBox = null; };
        if (window.ResizeObserver) new ResizeObserver(forget).observe(el);
        window.addEventListener("resize", forget);
        if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", forget);
      }
    }
    var fits = function (t) {
      var fit = fitBox.fits.get(t);
      if (fit === undefined) {
        fitCtx = fitCtx || document.createElement("canvas").getContext("2d");
        fitCtx.font = fitBox.font;
        fit = fitCtx.measureText(t).width * 1.04 <= fitBox.room;
        if (fitBox.fits.size > 4000) fitBox.fits.clear();
        fitBox.fits.set(t, fit);
      }
      return fit;
    };
    if (fits(text)) return text;
    if (LANG !== "en") { var cut = m[2].replace("\u0000", (L10N["@monthsShort"] || [])[k] || m[1].slice(0, 3) + "."); return cut; }
    // Three letters for the month, and on the narrowest phones no comma either ("Sep 23 1866").
    var short = m[1].slice(0, 3) + m[2];
    return fits(short) ? short : short.replace(",", "");
  }
  function monthTime(y, m) { return timeOfDay(dayFromDate(y, m, MID_DAY)); }
  function changeBefore(day) {
    var c = modern.changes, lo = 0, hi = c.length - 1, k = -1;
    while (lo <= hi) { var mid = (lo + hi) >> 1; if (c[mid] <= day) { k = mid; lo = mid + 1; } else hi = mid - 1; }
    return k;
  }
  function monthIndex(word) {
    var w = word.toLowerCase();
    if (w.length < 3) return 0;
    for (var i = 0; i < 12; i++) if (MONTHS[i].toLowerCase().indexOf(w) === 0 || MONTHS_L[i].toLowerCase().indexOf(w) === 0 || MONTHS_G[i].toLowerCase().indexOf(w) === 0) return i + 1;
    return 0;
  }
  function modernTime(y, m, d) {
    if (!(modern || dated) || y < monthlyFrom()) return null;
    if (!m) return monthTime(y, 7);
    if (m > 12 || (d && d > daysInMonth(y, m))) return null;
    return timeOfDay(dayFromDate(y, m, d || MID_DAY));
  }
  // A typed date as [year, month, day] (0 for none; years BC negative), or null. The order of the parts is free: July 4 1000,
  // 4 July 1000, the 4th of July, 1000, 1000 July 4, 1000-07-04, 7/4/1000 (with slashes the month comes first unless it
  // cannot), 4.7.1000 (with dots the day comes first unless it cannot), and any of them with BC, BCE, AD, or CE, or "c." for
  // circa. Months are named by three letters or more. A day the month does not have is not a date.
  function parseDate(s) {
    var t = String(s || "").toLowerCase().trim();
    if (LANG !== "en") {
      (L10N["@bcWords"] || []).forEach(function (w) { if (t.indexOf(w) >= 0) t = t.replace(w, " ") + " bc"; });
      (L10N["@adWords"] || []).forEach(function (w) { t = t.replace(w, " "); });
      (L10N["@fillers"] || []).forEach(function (w) { t = t.replace(new RegExp("(^|\\s)" + w + "(?=\\s|$)", "g"), " "); });
      t = t.replace(/(\d+)\s*[年년]\s*(\d+)\s*[月월]\s*(\d+)\s*[日일]?/, "$1-$2-$3").replace(/(\d+)\s*[年년]\s*(\d+)\s*[月월]/, "$1-$2").replace(/(\d+)\s*[年년]/, "$1").replace(/(\d)\s*\.(?=\s|$)/g, "$1").replace(/(\p{L})\./gu, "$1").trim();
    }
    t = t.replace(/(\d)(b\.?c|a\.?d|c\.?e)\b/g, "$1 $2");
    var era = /\b(?:b\.?\s*c|a\.?\s*d|c\.?\s*e)\b/.test(t), bc = /\bb\.?\s*c\.?(?:\s*e\.?)?(?=\s|$|\d|,)/.test(t) || /(?:^|\s)b\.?c\.?(?:e\.?)?$/.test(t);
    t = t.replace(/\bb\.?\s*c\.?(?:\s*e\.?)?(?=\s|$|\d|,)/g, " ").replace(/\b(?:a\.?\s*d|c\.?\s*e)\.?(?=\s|$|\d|,)/g, " ");
    t = t.replace(/^\s*(?:c\.|ca\.?|circa)\s*/, " ").replace(/\b(?:the|of)\b/g, " ");
    t = t.replace(/(\d)(?:st|nd|rd|th)\b/g, "$1").replace(/([a-z])\./g, "$1").replace(/,/g, " ").replace(/\s+/g, " ").trim();
    var m, y, mo = 0, d = 0, neg = false;
    if ((m = /^(-)?(\d{1,4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(t))) { neg = !!m[1]; y = +m[2]; mo = +m[3]; d = m[4] ? +m[4] : 0; }
    else if ((m = /^(\d{1,4})\/(\d{1,2})\/(\d{1,2})$/.exec(t)) && m[1].length > 2) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = /^(\d{1,2})([\/.])(\d{1,2})\2(-?\d{1,4})$/.exec(t))) {
      var p = +m[1], q = +m[3], dayFirst = m[2] === "." ? q <= 12 || p > 12 : p > 12 && q <= 12;
      y = +m[4]; mo = dayFirst ? q : p; d = dayFirst ? p : q;
      if (y < 0) { neg = true; y = -y; }
    } else if ((m = /^(\d{1,2})\/(\d{1,4})$/.exec(t)) && m[2].length > 2) { y = +m[2]; mo = +m[1]; }
    else {
      var parts = t.split(" ").filter(Boolean), nums = [], names = [];
      for (var i = 0; i < parts.length; i++) {
        if (/^-?\d{1,4}$/.test(parts[i])) nums.push(parts[i]);
        else if (/^\p{L}+$/u.test(parts[i]) && monthIndex(parts[i])) names.push(monthIndex(parts[i]));
        else return null;
      }
      if (names.length > 1 || !nums.length || nums.length > 2 || (!names.length && nums.length > 1)) return null;
      mo = names.length ? names[0] : 0;
      if (nums.length === 2) {
        // The day is the number of one or two digits beside the month's name; the other is the year.
        var first = parts.indexOf(nums[0]), name = parts.findIndex(function (w) { return !/^-?\d/.test(w); });
        var dayAt = /^\d{1,2}$/.test(nums[0]) && Math.abs(first - name) === 1 ? 0 : 1;
        if (!/^\d{1,2}$/.test(nums[dayAt])) return null;
        d = +nums[dayAt]; y = +nums[1 - dayAt];
        if (y < 0 && dayAt === 0) return null;
      } else {
        // "July 4" is a day without a year, not the year 4: a month with a year of one or two digits needs its era.
        if (mo && /^\d{1,2}$/.test(nums[0]) && !era) return null;
        y = +nums[0];
      }
      if (y < 0) { neg = true; y = -y; }
    }
    if (!y || mo > 12 || (d && !mo)) return null;
    if (d) {
      var len = [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0 || y < 1582)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
      if (d < 1 || d > len) return null;
    }
    if (bc || neg) y = -y;
    return [y, mo, d];
  }
  // A typed date as a time on the map. Before the map goes by the day (1648), a month or day is read but the year is the time.
  function parseTime(s) {
    var p = parseDate(s);
    if (!p) return null;
    var mt = p[0] > 0 ? modernTime(p[0], p[1], p[2]) : null;
    if (mt !== null) return mt;
    if (p[1] && p[0] >= monthlyFrom() && (modern || dated)) return null;
    return p[0];
  }
  function listYears(ys) {
    var t = ys.map(fmtYear);
    if (t.length === 1) return t[0];
    if (t.length === 2) return t[0] + " and " + t[1];
    return t.slice(0, -1).join(", ") + ", and " + t[t.length - 1];
  }

  // The scale is even, at a few pixels a year, and shows a window of the years (tl.start for tl.span
  // years); the window scrolls when the date leaves it, and while the marker is held at either end of
  // the bar, so dragging it to the left edge runs back continuously to 3400 BC.
  var KNOTS = [[-3400, 0]], FIRST_T = -3400;
  var RANGE_MAX = 10000, TL_PX = 5, TL_MIN = 80, TL_MAX = 300, TL_EDGE = 6;
  var tl = { start: 1760, span: 250, ppy: 5, w: 1250 };
  // The end of the timeline (the end of the present month) and the last date play and the End key go to.
  function lastT() { return timeOfDay(dayFromDate(LAST_YEAR, LAST_MONTH + 1, 1)) - 0.5 / 365; }
  function lastTime() { return modern ? monthTime(LAST_YEAR, LAST_MONTH) : LAST_YEAR; }
  function posOf(y) { return (y - tl.start) / tl.span; }
  function yearAt(t) { return tl.start + t * tl.span; }
  function clampStart(s) { return Math.max(FIRST_T, Math.min(lastT() - tl.span, s)); }
  var range = $("range"), yearInput = $("year-input"), asof = { textContent: "" };
  range.max = String(RANGE_MAX);
  function trackWidth() { return Math.max(1, $("ticks").getBoundingClientRect().width); }
  var points = [];
  function buildPoints() {
    points = maps.map(function (m) { return m.y; });
    if (modern) modern.changes.forEach(function (d) { points.push(timeOfDay(d)); });
    if (dated) dated.times.forEach(function (y) { points.push(y); });
    points.sort(function (a, b) { return a - b; });
  }
  function sizeWindow() {
    var w = trackWidth();
    tl.w = w;
    tl.span = Math.max(TL_MIN, Math.min(TL_MAX, Math.round(w / TL_PX)));
    tl.ppy = w / tl.span;
    tl.start = clampStart(tl.start);
  }
  // Moves the window; the ticks and their labels are one long strip each, moved with a transform.
  function setWindow(s) {
    tl.start = clampStart(s);
    var x = "translateX(" + ((band || 0) - (tl.start - FIRST_T) * tl.ppy).toFixed(1) + "px)";
    ["ticks-strip", "eras-strip", "events-strip"].forEach(function (id) { var el = $(id); if (el) el.style.transform = x; });
    ["eras", "tl-events"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.classList.toggle("at-start", tl.start <= FIRST_T + 1e-6);
      el.classList.toggle("at-end", tl.start + tl.span >= lastT() - 1e-6);
    });
  }
  // The rubber band: pulled past 34,000 BC or the present, the bar's years and its marker follow the pull at a
  // lessening rate, up to BAND_MAX px, and spring back when let go (over BAND_MS); a glide or a scroll that runs into
  // an end bounces a little. None of it with reduced motion.
  var band = 0, bandRaf = 0, bandIdle = 0, wheelOver = 0, wheelLet = false, wheelStep = 0, wheelPrev = 0, wheelRun = 0, WHEEL_FADE = 4, BAND_MAX = 36, BAND_MS = 90;
  function rubber(o) { return Math.sign(o) * BAND_MAX * (1 - 1 / (Math.abs(o) * 0.55 / BAND_MAX + 1)); }
  // How far, in px, the start `s` lies past an end: positive past the beginning, negative past the present.
  function pastEnd(s) { return (clampStart(s) - s) * tl.ppy; }
  function applyBand(px) {
    band = reduceMotion || Math.abs(px) < 0.3 ? 0 : px;
    setWindow(tl.start);
    range.style.transform = band ? "translateX(" + band.toFixed(1) + "px)" : "";
    // The gap it opens is left empty: the scale's ruled lines (on the fixed .ch-ticks) are clipped away there too.
    var clip = band ? "inset(-12px " + Math.max(0, -band).toFixed(1) + "px -12px " + Math.max(0, band).toFixed(1) + "px)" : "";
    ["ticks", "eras"].forEach(function (id) { $(id).style.clipPath = clip; });
  }
  function setBand(px) { cancelAnimationFrame(bandRaf); bandRaf = 0; applyBand(px); }
  function springBack() {
    cancelAnimationFrame(bandRaf);
    bandRaf = 0;
    if (!band) return;
    var from = band, t0 = performance.now();
    bandRaf = requestAnimationFrame(function step(ts) {
      var k = Math.min(1, (ts - t0) / BAND_MS);
      applyBand(from * Math.pow(1 - k, 3));
      bandRaf = k < 1 ? requestAnimationFrame(step) : 0;
    });
  }
  // Out to `peak` px and back, for a glide that runs into an end.
  function bounce(peak) {
    if (reduceMotion || !peak) return;
    cancelAnimationFrame(bandRaf);
    var t0 = performance.now();
    bandRaf = requestAnimationFrame(function step(ts) {
      var k = Math.min(1, (ts - t0) / BAND_MS);
      applyBand(peak * Math.sin(Math.PI * k) * (1 - k * 0.3));
      bandRaf = k < 1 ? requestAnimationFrame(step) : 0;
    });
  }
  // Keeps the date in view: when it is off the window, or within 4% of an end, the window is centred on it. On a phone,
  // while the map plays, the date starts again at the end it is moving away from (the left when playing forward), so the
  // short bar shows the years ahead rather than the half already passed.
  function follow(t) {
    var p = posOf(t);
    if (!(p < 0.04 || p > 0.96)) return;
    if (playTimer && phoneQuery.matches && playMode) setWindow(playMode === playModeOf(true) ? t - tl.span * 0.95 : t - tl.span * 0.05);
    else setWindow(t - tl.span / 2);
  }
  function placeTicks() {
    if (!maps.length && !dated) return;
    sizeWindow();
    var ticks = $("ticks"), eras = $("eras"), ppy = tl.ppy, width = (lastT() - FIRST_T) * ppy;
    ticks.textContent = ""; eras.textContent = "";
    var ts = document.createElement("div"), es = document.createElement("div");
    ts.id = "ticks-strip"; es.id = "eras-strip";
    ts.className = es.className = "ch-strip";
    ts.style.width = es.style.width = width.toFixed(0) + "px";
    ticks.appendChild(ts); eras.appendChild(es);
    var at = function (y) { return ((y - FIRST_T) * ppy).toFixed(1) + "px"; };
    var add = function (y, cls) {
      var s = document.createElement("span");
      if (cls) s.className = cls;
      s.style.left = at(y);
      ts.appendChild(s);
      return s;
    };
    // Labels every so many years, with at least 70 px between them (44 px on a phone's short timeline, so the years
    // nearest today, 2020 among them, still have a label), and five minor ticks to a label.
    var steps = [10, 20, 25, 50, 100, 200, 250, 500, 1000], step = steps[steps.length - 1], gap = tl.w < 400 ? 44 : 70;
    for (var i = 0; i < steps.length; i++) if (steps[i] * ppy >= gap) { step = steps[i]; break; }
    var minor = step / 5;
    for (var y = Math.ceil(FIRST_T / minor) * minor; y <= lastT(); y += minor) {
      var major = y % step === 0;
      add(y === 0 ? 1 : y, major ? "is-major" : "");
      if (!major) continue;
      var lab = document.createElement("span");
      lab.textContent = y === 0 ? fmtYear(1) : y < 0 ? fmtYear(y) : String(y);
      lab.style.left = at(y === 0 ? 1 : y);
      if (y <= FIRST_T) lab.className = "is-first";
      // A label too near the end of the timeline to be centred on its tick ends at the tick instead.
      else if ((lastT() - y) * ppy < 18) lab.className = "is-last";
      es.appendChild(lab);
    }
    placeEvents();
    maps.forEach(function (m) { m.tick = add(m.y, "is-map"); });
    changeTicks = modern ? modern.changes.map(function (d) { return add(timeOfDay(d), "is-change"); }) : [];
    datedTicks = dated ? dated.times.map(function (y) { return add(y, "is-change"); }) : [];
    nowTick = null;
    setWindow(tl.start);
    follow(drag ? drag.t : now);
    if (!drag) range.value = String(Math.round(posOf(now) * RANGE_MAX));
    markCurrentTick();
  }
  var changeTicks = [], nowTick = null, datedTicks = [];
  // Events in history named above the timeline (data/timeline-events.json): each at its date, in small type, on
  // one strip that moves with the ticks. Where two names would overlap, the one of lower rank (1 is the most
  // important), then the earlier, is shown and the other left out, so the row never crowds; a name says its date
  // when hovered, and a click goes to that date.
  var tlEvents = null, tlEventsLoad = null, evMeasure = null;
  function eventTime(d) {
    if (typeof d === "number") return d;
    var m = /^(-?\d+)-(\d+)-(\d+)$/.exec(String(d));
    return m ? timeOfDay(dayFromDate(+m[1], +m[2], +m[3])) : null;
  }
  function eventDate(d, t) {
    if (typeof d === "number") return fmtYear(d);
    var x = dateOfDay(dayOfTime(t));
    return fmtMDY(x[0], x[1], x[2]);
  }
  function loadEvents() {
    if (tlEventsLoad) return;
    tlEventsLoad = fetchJSON("data/timeline-events.json").then(function (d) {
      tlEvents = (d.events || []).map(function (e) { var t = eventTime(e[0]); return { d: e[0], t: t, name: T(String(e[1])), rank: +e[2] || 3 }; })
        .filter(function (e) { return e.t !== null && e.t >= FIRST_T && e.t <= lastT(); });
      placeEvents();
    }).catch(function (e) { console.warn("timeline events", e); });
  }
  function placeEvents() {
    var box = $("tl-events");
    if (!box || !tlEvents || !tl.ppy) return;
    box.textContent = "";
    var strip = document.createElement("div"), ppy = tl.ppy, width = (lastT() - FIRST_T) * ppy;
    strip.id = "events-strip";
    strip.className = "ch-strip";
    strip.style.width = width.toFixed(0) + "px";
    if (!evMeasure) evMeasure = document.createElement("canvas").getContext("2d");
    evMeasure.font = "11px " + SERIF;
    // Two rows: a name goes on the lower row if it fits there, else on the upper one, else it is left out.
    // A tick under each name marks its date on the line.
    // An upper name's tick runs down past the lower row, so it may only pass through a gap there: a lower name
    // can't cover an upper tick, and an upper name can't take a place whose tick would cross a lower name.
    var rows = [[], []], upTicks = [], GAP = 12, CLEAR = 4;
    var fits = function (row, a, b) { for (var i = 0; i < row.length; i++) if (a < row[i][1] + GAP && b > row[i][0] - GAP) return false; return true; };
    var lowFits = function (a, b) { if (!fits(rows[0], a, b)) return false; for (var i = 0; i < upTicks.length; i++) if (upTicks[i] > a - CLEAR && upTicks[i] < b + CLEAR) return false; return true; };
    var upFits = function (a, b, x) { if (!fits(rows[1], a, b)) return false; for (var i = 0; i < rows[0].length; i++) if (x > rows[0][i][0] - CLEAR && x < rows[0][i][1] + CLEAR) return false; return true; };
    tlEvents.slice().sort(function (a, b) { return a.rank - b.rank || a.t - b.t; }).forEach(function (e) {
      var x = (e.t - FIRST_T) * ppy, w = evMeasure.measureText(e.name).width + 2;
      var a = Math.max(0, Math.min(width - w, x - w / 2)), b = a + w, r = lowFits(a, b) ? 0 : upFits(a, b, x) ? 1 : -1;
      if (r < 0) return;
      rows[r].push([a, b]);
      if (r === 1) upTicks.push(x);
      var s = document.createElement("span");
      s.className = "ch-ev ch-ev-" + e.rank + " ch-ev-row" + r;
      s.textContent = e.name;
      s.style.left = a.toFixed(1) + "px";
      var tick = document.createElement("i");
      tick.style.left = (x - a).toFixed(1) + "px";
      s.appendChild(tick);
      s.title = e.name + ", " + eventDate(e.d, e.t);
      s.addEventListener("click", function () { stopPlay(); setTime(Math.max(FIRST_T, Math.min(lastT(), e.t))); });
      strip.appendChild(s);
    });
    box.appendChild(strip);
    setWindow(tl.start);
  }
  function markCurrentTick() {
    maps.forEach(function (m) { if (m.tick) m.tick.classList.toggle("is-now", !!current && m.snap === current); });
    var t = current && current.modern ? changeTicks[changeBefore(Math.min(dayOfTime(now), modern.toDay))] || null : current && current.dated ? datedTicks[datedChangeBefore(now)] || null : null;
    if (t === nowTick) return;
    if (nowTick) nowTick.classList.remove("is-now");
    if (t) t.classList.add("is-now");
    nowTick = t;
  }
  var rangeActive = false;
  function syncTime() {
    syncComments();
    if (!drag) { follow(now); range.value = String(Math.round(posOf(now) * RANGE_MAX)); range.classList.remove("is-off"); }
    range.setAttribute("aria-valuetext", fmtNow(now));
    if (document.activeElement !== yearInput) yearInput.value = fitDate(fmtNow(now));
    syncSpin();
    if (markPart) showMark(markPart);
    if (isModern(now)) {
      var day = dayOfTime(now), since = modern.changes[changeBefore(Math.min(day, modern.toDay))];
      if (!current || !current.modern) asof.textContent = T("Loading the borders");
      else if (day > modern.toDay) asof.textContent = T("The latest borders, of {year}", { year: fmtYear(dateOfDay(modern.toDay)[0]) });
      else asof.textContent = T("Borders since {date}", { date: fmtDay(since) });
    } else if (isDated(now)) {
      var dc = dated.times[datedChangeBefore(now)];
      asof.textContent = !current || !current.dated || wantKey !== "e" + now ? T("Loading the borders") : T("Borders since {date}", { date: dc >= DAYS_FROM ? fmtDay(dayOfTime(dc)) : fmtYear(Math.floor(dc)) });
    } else if (maps.length) {
      var m = maps[mapIndexFor(now)];
      asof.textContent = !current || current.year !== m.y ? T("Loading the map of {year}", { year: fmtYear(m.y) }) : T("Borders from the map of {year}", { year: fmtYear(m.y) });
    }
    markCurrentTick();
    syncKey();
    syncWars();
    syncChanges();
  }
  function useSnap(snap) {
    if (current === snap) return;
    current = snap;
    if (fineNow()) wantFine();
    if (selected >= 0 || selCity) renderCard();
    hideTip();
    hoverId = -1;
    canvas.classList.remove("is-over");
  }
  // A step by hand keeps the detail the map shows, as play does (prefetchPlay, playStep). Each stretch of years comes as its
  // rough lines and then its fine ones, and a step into a file whose fine lines had not come drew the rough ones for a moment,
  // several kilometres off, so the borders seemed to change and change back. Now a step near a file's edge asks for the
  // neighbouring file's fine lines ahead (stepFine), and a step into a file whose fine lines are on their way keeps the map
  // as it is until they come, for up to STEP_FINE_WAIT ms (whenFine). Dragging the slider and play are left as they were.
  // askedKey is the date asked for until the map shows it (its file may be on its way), for ready().
  var STEP_FINE_WAIT = 2500, holdKey = "", askedKey = "";
  function stepFine() { return !playTimer && !rangeActive; }
  function whenFine(t, key, fromRange, show) {
    if (fromRange || playTimer || !current || !playWantsFine() || fineReady(t, true)) { show(); return; }
    var t0 = performance.now();
    holdKey = key;
    (function wait() {
      if (wantKey !== key) { if (holdKey === key) holdKey = ""; return; }
      if (fineReady(t, true) || performance.now() - t0 > STEP_FINE_WAIT) { holdKey = ""; show(); return; }
      setTimeout(wait, 40);
    })();
  }
  // The 15th of a month stands for the whole month (MID_DAY), so the date shows only the month there; after the day keys
  // have been used, the 15th shows as a day like any other, until the date is moved some other way.
  var dayMode = false, keepDayMode = false;
  // Before 1648 the map goes by the year, but a month and a day can still be chosen (Noah, 25 November 2026): preDate holds
  // them, for the year on screen, as the date's frame shows them; the map is the year's either way. Cleared when the date
  // moves some other way.
  var preDate = null, keepPre = false, preWarned = false;
  function setTime(t, fromRange) {
    if (!keepDayMode) dayMode = false;
    if (!keepPre) preDate = null;
    if (!maps.length && !dated) return;
    t = t >= lastT() ? lastTime() : Math.max(FIRST_T, t);
    if (!isMonthly(t)) { t = Math.round(t); if (t === 0) t = 1; }
    if (isMonthly(t) || fromRange || t !== Math.round(now)) ctlMonth = 0;
    // A card describes one date, so changing the date closes it.
    if (t !== now && (selected >= 0 || selCity) && !card.hidden) closeCard();
    now = t;
    if (!fromRange) rangeActive = false;
    if (isModern(t)) {
      var day = Math.min(dayOfTime(t), modern.toDay);
      wantKey = "d" + day; askedKey = wantKey;
      if (!modern.rows) {
        syncTime();
        loadModern().then(function () {
          if (wantKey !== "d" + day) return;
          whenFine(t, "d" + day, fromRange, function () {
            useSnap(modernSnap(day)); if (askedKey === "d" + day) askedKey = "";
            syncTime();
            writeHash();
            scheduleRender(true);
          });
        }).catch(function (e) {
          console.warn("modern", e);
          asof.textContent = T("The borders of {date} could not be loaded", { date: fmtNow(t) });
        });
        scheduleRender(true);
        return;
      }
      whenFine(t, "d" + day, fromRange, function () {
        useSnap(modernSnap(day)); if (askedKey === "d" + day) askedKey = "";
        syncTime();
        writeHash();
        scheduleRender(true);
        // Close to 1886, the last file before it is asked for, with its fine lines when the map shows them.
        if (dated && yearOf(t) - yearOf(modern.fromTime) < NEAR_EDGE) whenIdle(function () {
          var last = dated.chunks.length - 1, fine = stepFine();
          loadChunk(last).then(function () { if (fine) loadChunkFine(last); }).catch(function () {});
        });
      });
      return;
    }
    if (isDated(t)) {
      var ck = chunkIndexFor(t);
      wantKey = "e" + t; askedKey = wantKey;
      syncTime();
      loadChunk(ck).then(function () {
        if (wantKey !== "e" + t) return;
        whenFine(t, "e" + t, fromRange, function () {
          useSnap(datedSnap(ck, t)); if (askedKey === "e" + t) askedKey = "";
          syncTime();
          writeHash();
          scheduleRender(true);
          whenIdle(function () {
            var y = yearOf(t), next = dated.chunks[ck + 1], to = next ? next.from - 1 : dated.to, fine = stepFine();
            var get = function (k) { loadChunk(k).then(function () { if (fine) loadChunkFine(k); }).catch(function () {}); };
            if (ck > 0 && (playTimer || y - dated.chunks[ck].from < NEAR_EDGE)) get(ck - 1);
            if (next && (playTimer || to - y < NEAR_EDGE)) get(ck + 1);
            if (!next && to - y < NEAR_EDGE) loadModern().then(function () { if (fine) loadModernFine(); }).catch(function () {});
          });
        });
      }).catch(function (e) {
        console.warn("dated", e);
        asof.textContent = T("The borders of {date} could not be loaded", { date: fmtYear(t) });
      });
      scheduleRender(true);
      return;
    }
    var mi = mapIndexFor(t);
    wantKey = "y" + maps[mi].y; askedKey = wantKey;
    syncTime();
    loadMap(mi).then(function (snap) {
      if (wantKey !== "y" + maps[mi].y) return;
      useSnap(snap); if (askedKey === "y" + maps[mi].y) askedKey = "";
      syncTime();
      writeHash();
      scheduleRender(true);
      if (mi > 0) loadMap(mi - 1).catch(function () {});
      if (mi < maps.length - 1) loadMap(mi + 1).catch(function () {});
    }).catch(function (e) {
      console.warn("map", e);
      asof.textContent = T("The map of {year} could not be loaded", { year: fmtYear(maps[mi].y) });
    });
    scheduleRender(true);
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
  // The same day of another month, where the date is a day (a date shown by the month stays one; the 31st becomes the
  // month's last day).
  function sameDay(y, m, day) {
    if (dayMode) keepDayMode = true;
    if (day === MID_DAY) return monthTime(y, m);
    var last = daysInMonth(y, m);
    return timeOfDay(dayFromDate(y, m, Math.min(day, last)));
  }
  // The month keys: from 1648, and through a war's months, as stepUnit; otherwise before 1648, a chosen month (stepPre).
  function stepMonthKey(dir) {
    if (!isMonthly(now) && !ctlFineYear(Math.round(now))) { stepPre(dir, false); return; }
    stepUnit(dir);
  }
  function stepUnit(dir) {
    var mf = monthlyFrom();
    if (isMonthly(now)) {
      var d = dateOfDay(dayOfTime(now)), y = d[0], m = d[1] + dir;
      if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
      if (y < mf) setTime(mf - 1);
      else if (y * 12 + m <= LAST_YEAR * 12 + LAST_MONTH) { setTime(sameDay(y, m, d[2])); keepDayMode = false; }
      return;
    }
    var yr = Math.round(now);
    if (ctlFineYear(yr)) {
      var mo = (ctlMonth || 7) + dir, y2 = yr;
      if (mo < 1) { mo = 12; y2--; } else if (mo > 12) { mo = 1; y2++; }
      if (ctlFineYear(y2)) {
        if (y2 !== yr) setTime(y2);
        ctlMonth = mo;
        syncTime();
        writeHash();
        scheduleRender();
        return;
      }
    }
    var next = yr + dir;
    if (next === 0) next = dir;
    setTime((modern || dated) && next >= mf ? monthTime(mf, 1) : next);
    if (ctlFineYear(next) && Math.round(now) === next) {
      ctlMonth = dir > 0 ? 1 : 12;
      syncTime();
      writeHash();
      scheduleRender();
    }
  }
  // A year back or forward, in the same month from 1648 (a year that steps back past 1648 is shown by the year, and one that
  // steps forward into it opens in July, the month the years before it stand for).
  function stepYear(dir) {
    var mf = monthlyFrom();
    if (isMonthly(now)) {
      var d = dateOfDay(dayOfTime(now)), y = d[0] + dir, m = d[1];
      if (y < mf) setTime(y === 0 ? -1 : y);
      // A year on that would pass the last month stays put: going to the last month would be a step of months, not of a year.
      else if (y * 12 + m <= LAST_YEAR * 12 + LAST_MONTH) { setTime(sameDay(y, m, d[2])); keepDayMode = false; }
      return;
    }
    var yr = Math.round(now), next = yr + dir, mo = ctlMonth;
    if (next === 0) next = dir;
    if (preDate) {
      var pd = preDate, got = preShift(yr, pd.m, pd.d || 1, 0, 12 * dir);
      if (got[0] < monthlyFrom()) {
        keepPre = true;
        try { setTime(got[0]); if (Math.round(now) === got[0]) preDate = { m: got[1], d: pd.d ? got[2] : 0 }; } finally { keepPre = false; }
        syncTime(); writeHash();
        return;
      }
      if (pd.d) { keepDayMode = true; dayMode = true; }
      try { setTime(pd.d ? timeOfDay(dayFromDate(got[0], got[1], got[2])) : monthTime(got[0], got[1])); } finally { keepDayMode = false; }
      return;
    }
    setTime((modern || dated) && next >= mf ? monthTime(next, 7) : next);
    if (mo && ctlFineYear(next) && Math.round(now) === next) { ctlMonth = mo; syncTime(); writeHash(); scheduleRender(); }
  }
  // The map's years have no year 0 (1 BC is -1); a calendar's do (1 BC is 0). Dates before 1648 are counted on the
  // proleptic Gregorian calendar, which is one more reason they are approximate.
  function astroYear(y) { return y < 0 ? y + 1 : y; }
  function mapYear(a) { return a <= 0 ? a - 1 : a; }
  function preShift(y, m, d, days, months) {
    var dt = new Date(Date.UTC(2000, 0, 1));
    dt.setUTCFullYear(astroYear(y), m - 1 + months, 1);
    var last = new Date(dt.getTime()); last.setUTCMonth(last.getUTCMonth() + 1, 0);
    dt.setUTCDate(Math.min(d, last.getUTCDate()));
    dt.setUTCDate(dt.getUTCDate() + days);
    return [mapYear(dt.getUTCFullYear()), dt.getUTCMonth() + 1, dt.getUTCDate()];
  }
  function preWarn() {
    if (preWarned) return;
    preWarned = true;
    yearHint(T("Before {from} the map changes only by the year, so a month or a day here may not be accurate.", { from: fmtYear(monthlyFrom()) }));
  }
  // Moves the chosen day or month before 1648 (byDay: days, else months), into 1648 where the map has days.
  function stepPre(n, byDay) {
    var yr = Math.round(now), base = preDate || { m: 7, d: 0 };
    var got = preShift(yr, base.m, base.d || MID_DAY, byDay ? n : 0, byDay ? 0 : n), y = got[0];
    var mf = monthlyFrom();
    if (y >= mf) {
      if (byDay || base.d) { keepDayMode = true; dayMode = true; }
      try { setTime(byDay || base.d ? timeOfDay(dayFromDate(y, got[1], got[2])) : monthTime(y, got[1])); } finally { keepDayMode = false; }
      return;
    }
    if (y < FIRST_T) return;
    keepPre = true;
    try {
      if (y !== yr) setTime(y);
      if (Math.round(now) !== y) return;
      preDate = { m: got[1], d: byDay || base.d ? got[2] : 0 };
    } finally { keepPre = false; }
    syncTime();
    writeHash();
    preWarn();
  }
  // A day back or forward; before 1648 the day is kept beside the year's map (stepPre).
  function stepDay(dir) {
    if (!isMonthly(now)) { stepPre(dir, true); return; }
    var day = dayOfTime(now) + dir, d = dateOfDay(day);
    if (d[0] < monthlyFrom()) return;
    if (d[0] * 12 + d[1] > LAST_YEAR * 12 + LAST_MONTH) return;
    keepDayMode = true; dayMode = true;
    try { setTime(timeOfDay(day)); } finally { keepDayMode = false; }
  }
  // The month buttons step by the month from 1648, and before that only through a war's months; the day buttons by the
  // day from 1648.
  function syncSpin() {
    var daily = isMonthly(now), rough = daily ? "" : " " + T("(approximate before {year})", { year: fmtYear(1648) });
    ["day-up", "day-down"].forEach(function (id) {
      var b = $(id);
      if (!b) return;
      b.classList.remove("is-off");
      b.setAttribute("aria-disabled", "false");
      b.setAttribute("data-tip", (id === "day-up" ? T("Forward a day (8)") : T("Back a day (3)")) + rough);
    });
    ["month-up", "month-down"].forEach(function (id) {
      var b = $(id);
      b.classList.remove("is-off");
      b.setAttribute("aria-disabled", "false");
      b.setAttribute("data-tip", (id === "month-up" ? T("Forward a month (9)") : T("Back a month (2)")) + rough);
    });
  }
  // While the marker is dragged, the map follows it, drawn quickly (rangeActive) until it is let go
  // (drag.t is the date it points at).
  var drag = null;
  function snapTime(y) {
    y = Math.max(FIRST_T, Math.min(lastT() - 1e-6, y));
    var mf = monthlyFrom();
    if ((modern || dated) && y >= mf - 0.5) {
      var yr = Math.floor(Math.max(y, mf)), mo = Math.min(12, Math.floor((Math.max(y, mf) - yr) * 12) + 1);
      return yr * 12 + mo > LAST_YEAR * 12 + LAST_MONTH ? monthTime(LAST_YEAR, LAST_MONTH) : monthTime(yr, mo);
    }
    y = Math.round(y);
    return y === 0 ? 1 : y;
  }
  function showDrag(t) {
    drag.t = t;
    rangeActive = true;
    if (Math.abs(t - now) > 1e-9) setTime(t, true);
    yearInput.value = fitDate(fmtNow(t));
    range.setAttribute("aria-valuetext", yearInput.value);
  }
  function endDrag() {
    if (!drag) return;
    var t = drag.t;
    cancelAnimationFrame(drag.raf);
    drag = null;
    rangeActive = false;
    springBack();
    if (t !== null && Math.abs(t - now) > 1e-9) setTime(t); else { syncTime(); scheduleRender(); }
  }
  // At either end of the bar, the window scrolls while the marker is held there, slowly at first and
  // faster the longer it is held (from 60% of the window a second, gaining twice that each second).
  function edgeScroll(ts) {
    if (!drag) return;
    var dt = Math.min(0.1, (ts - (drag.last || ts)) / 1000), r = $("ticks").getBoundingClientRect();
    drag.last = ts;
    var dir = drag.x <= r.left + TL_EDGE ? -1 : drag.x >= r.right - TL_EDGE ? 1 : 0;
    if (dir && (dir < 0 ? tl.start > FIRST_T : tl.start + tl.span < lastT())) {
      drag.held = (drag.held || 0) + dt;
      setWindow(tl.start + dir * tl.span * 0.6 * (1 + 2 * drag.held) * dt);
      range.value = dir < 0 ? "0" : String(RANGE_MAX);
      showDrag(snapTime(yearAt(dir < 0 ? 0 : 1)));
    } else drag.held = 0;
    // Held past the very end of history, the bar stretches after the pointer.
    var over = drag.x < r.left && tl.start <= FIRST_T + 1e-6 ? r.left - drag.x : drag.x > r.right && tl.start + tl.span >= lastT() - 1e-6 ? r.right - drag.x : 0;
    if (over) setBand(rubber(over * 0.6)); else if (band && !bandRaf) springBack();
    drag.raf = requestAnimationFrame(edgeScroll);
  }
  range.addEventListener("pointerdown", function (e) {
    stopPlay();
    if (drag) cancelAnimationFrame(drag.raf);
    drag = { x: e.clientX, t: null, held: 0, last: 0, raf: 0 };
    drag.raf = requestAnimationFrame(edgeScroll);
  });
  window.addEventListener("pointermove", function (e) { if (drag) drag.x = e.clientX; });
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
  range.addEventListener("input", function () {
    stopPlay();
    var t = snapTime(yearAt(+range.value / RANGE_MAX));
    if (drag) { rangeActive = true; showDrag(t); } else setTime(t);
  });
  range.addEventListener("change", function () { if (drag) endDrag(); });
  // Scrolling over the bar (two fingers on a trackpad, sideways or up and down, or a mouse wheel) moves the
  // window of years without changing the date; the marker is hidden while its date is outside the window.
  $("track").addEventListener("wheel", function (e) {
    if (drag) return;
    var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (e.deltaMode === 1) d *= 16; else if (e.deltaMode === 2) d *= tl.w;
    if (!d) return;
    e.preventDefault();
    var to = tl.start + d / tl.ppy, o = pastEnd(to);
    // Scrolling on past an end stretches the bar and holds it while the fingers keep scrolling; it springs back once
    // they let go. A browser doesn't say when fingers leave a trackpad, and the trackpad glides on for up to a second
    // after, so the glide is told by its shape: four steps in a row, each smaller than the one before, under 60% of the
    // largest (WHEEL_FADE). A hand slowing down rarely does that; it then springs back at once, and the rest of the glide
    // is let go without stretching again. Otherwise it springs back 90 ms after the scrolling stops.
    if (o && (band || wheelLet || Math.abs(clampStart(to) - tl.start) < 1e-6)) {
      clearTimeout(bandIdle);
      bandIdle = setTimeout(function () { wheelOver = 0; wheelLet = false; wheelStep = wheelPrev = wheelRun = 0; springBack(); }, 90);
      if (wheelLet) return;
      var ad = Math.abs(d);
      wheelRun = ad < wheelPrev * 0.98 ? wheelRun + 1 : 0;
      wheelPrev = ad;
      wheelStep = Math.max(wheelStep, ad);
      if (band && wheelRun >= WHEEL_FADE && ad < wheelStep * 0.6) { wheelLet = true; wheelOver = 0; springBack(); return; }
      wheelOver = band && Math.sign(o) !== Math.sign(wheelOver) ? 0 : wheelOver;
      wheelOver += o;
      setBand(rubber(wheelOver));
      return;
    }
    wheelOver = 0; wheelLet = false; wheelStep = wheelPrev = wheelRun = 0;
    if (band) setBand(0);
    setWindow(to);
    markerInWindow();
  }, { passive: false });
  function markerInWindow() {
    var p = posOf(now);
    range.value = String(Math.round(Math.max(0, Math.min(1, p)) * RANGE_MAX));
    range.classList.toggle("is-off", p < 0 || p > 1);
  }
  // On touch screens the bar is swiped: a finger that moves sideways scrolls the window of years, and
  // lets it glide on when it lifts; a finger put on the marker drags it, as a mouse does; a tap sets the
  // date at that point. The range input takes no touches there (pointer-events: none in app.css), so
  // these come to the track.
  var swipe = null, glide = 0, SWIPE_SLOP = 8, MARKER_REACH = 24;
  function trackFrac(x) { var r = $("ticks").getBoundingClientRect(); return Math.max(0, Math.min(1, (x - r.left) / r.width)); }
  $("track").addEventListener("pointerdown", function (e) {
    if (getComputedStyle(range).pointerEvents !== "none" || (e.pointerType === "mouse" && e.button !== 0)) return;
    cancelAnimationFrame(glide);
    if (band) setBand(0);
    var r = $("ticks").getBoundingClientRect(), p = posOf(now), mx = r.left + p * r.width;
    try { this.setPointerCapture(e.pointerId); } catch (err) {}
    swipe = { id: e.pointerId, x0: e.clientX, start0: tl.start, mode: p >= 0 && p <= 1 && Math.abs(e.clientX - mx) <= MARKER_REACH ? "marker" : "wait", hist: [[performance.now(), e.clientX]] };
    if (swipe.mode === "marker") {
      stopPlay();
      if (drag) cancelAnimationFrame(drag.raf);
      drag = { x: e.clientX, t: null, held: 0, last: 0, raf: 0 };
      drag.raf = requestAnimationFrame(edgeScroll);
      rangeActive = true;
    }
  });
  $("track").addEventListener("pointermove", function (e) {
    if (!swipe || e.pointerId !== swipe.id) return;
    var dx = e.clientX - swipe.x0;
    swipe.hist.push([performance.now(), e.clientX]);
    if (swipe.hist.length > 8) swipe.hist.shift();
    if (swipe.mode === "wait" && Math.abs(dx) > SWIPE_SLOP) { swipe.mode = "pan"; swipe.x0 = e.clientX; dx = 0; }
    if (swipe.mode === "pan") {
      var to = swipe.start0 - dx / tl.ppy;
      setWindow(to);
      setBand(rubber(pastEnd(to)));
      markerInWindow();
    }
    else if (swipe.mode === "marker" && drag) {
      var f = trackFrac(e.clientX);
      range.value = String(Math.round(f * RANGE_MAX));
      showDrag(snapTime(yearAt(f)));
    }
  });
  function endSwipe(e) {
    if (!swipe || e.pointerId !== swipe.id) return;
    var sw = swipe;
    swipe = null;
    if (sw.mode === "wait" && e.type === "pointerup") { stopPlay(); setTime(snapTime(yearAt(trackFrac(e.clientX)))); return; }
    if (sw.mode !== "pan") return;
    if (band) { springBack(); return; }
    var h = sw.hist, a = h[0], b = h[h.length - 1], now0 = performance.now();
    if (now0 - b[0] > 80 || b[0] - a[0] < 10) return;
    var v = (b[1] - a[1]) / (b[0] - a[0]), last = now0;
    // The window glides on at the finger's speed, slowing by about 5% a frame.
    glide = requestAnimationFrame(function step(ts) {
      var dt = Math.min(50, ts - last);
      last = ts;
      setWindow(tl.start - v * dt / tl.ppy);
      markerInWindow();
      v *= Math.pow(0.95, dt / 16.7);
      if (Math.abs(v) > 0.02 && tl.start > FIRST_T && tl.start + tl.span < lastT()) glide = requestAnimationFrame(step);
      else if (Math.abs(v) > 0.15) bounce(rubber(v * 120));
    });
  }
  $("track").addEventListener("pointerup", endSwipe);
  $("track").addEventListener("pointercancel", endSwipe);
  range.addEventListener("keydown", function (e) {
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    // The arrow keys move the map here too, as everywhere on the page (since 25 November 2026; before, they moved the date,
    // and the slider keeps the focus after a drag). The number keys move the date.
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      panKey(e.key);
    } else if (e.key === "Home") { e.preventDefault(); setTime(FIRST_T); }
    else if (e.key === "End") { e.preventDefault(); setTime(lastTime()); }
  });
  function commitYearInput() {
    var t = parseTime(yearInput.value), p = parseDate(yearInput.value);
    // Before 1648 a month is kept where a war's months are stepped through (ctlFineYear); otherwise the map goes by the year.
    if (t !== null && p && p[1] && t === p[0] && ctlFineYear(p[0])) {
      stopPlay();
      setTime(p[0]);
      ctlMonth = p[1];
      syncTime();
      writeHash();
      scheduleRender();
      return;
    }
    if (t === null) {
      var typed = String(yearInput.value).trim();
      yearInput.value = fitDate(fmtNow(now));
      if (typed && typed !== yearInput.value) yearHint(T("No date in “{typed}”. Try {examples}.", { typed: typed.length > 24 ? typed.slice(0, 23) + "…" : typed, examples: [fmtYear(1815), monthYear(1815, 7), fmtMDY(1815, 7, 4), "1815-07-04", fmtYear(-500)].join(T(", ")) }));
      return;
    }
    stopPlay();
    if (p && p[1] && t === p[0]) {
      keepPre = true;
      try { if (Math.abs(t - now) > 1e-9) setTime(t); preDate = { m: p[1], d: p[2] || 0 }; } finally { keepPre = false; }
      syncTime(); writeHash();
      preWarned = false; preWarn();
      return;
    }
    // A typed day is shown as a day, the 15th too (which otherwise stands for the whole month).
    if (p && p[2]) { keepDayMode = true; dayMode = true; }
    try { if (Math.abs(t - now) > 1e-9) setTime(t); else { syncTime(); yearInput.value = fitDate(fmtNow(now)); } } finally { keepDayMode = false; }
  }
  // A date that cannot be read is put back, and a line under the frame says what the field takes.
  var hintTimer = 0;
  function yearHint(text) {
    var h = $("year-hint");
    clearTimeout(hintTimer);
    h.textContent = text;
    h.hidden = !text;
    if (text) hintTimer = setTimeout(function () { yearHint(""); }, 6000);
  }
  yearInput.addEventListener("focus", function () { yearHint(""); });
  yearInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); yearInput.blur(); }
    else if (e.key === "Escape") { yearInput.value = fitDate(fmtNow(now)); yearInput.blur(); }
  });
  yearInput.addEventListener("blur", commitYearInput);
  // The buttons beside the date: back a year, a month, and a day on its left (three, two, and one arrows), forward a day,
  // a month, and a year on its right.
  // Hovering a button underlines what it moves: the year (with its era) or the month's name, in a copy of the date laid
  // over the field (an input cannot underline part of its text).
  var yearMark = $("year-mark"), markPart = "";
  function showMark(part) {
    markPart = part;
    var v = yearInput.value, m = /^(.*?)((?:AD )?\d+(?: BC)?)$/.exec(v);
    if (!part || document.activeElement === yearInput || !m) { yearMark.classList.remove("is-on"); return; }
    var head = m[1], year = m[2], mm = /^(\d+ )?([A-Za-z]+)( )$/.exec(head);
    if (part === "month" && (!mm || $("month-up").getAttribute("aria-disabled") === "true")) { yearMark.classList.remove("is-on"); return; }
    var dm = part === "day" ? /^(\D*?)(\d+)(\D*)$/.exec(head) : null;
    if (part === "day" && (!dm || $("day-up").getAttribute("aria-disabled") === "true")) { yearMark.classList.remove("is-on"); return; }
    var esc = function (t) { return t.replace(/&/g, "&amp;").replace(/</g, "&lt;"); };
    yearMark.innerHTML = part === "year" ? esc(head) + "<u>" + esc(year) + "</u>" : part === "day" ? esc(dm[1]) + "<u>" + esc(dm[2]) + "</u>" + esc(dm[3]) + esc(year) : esc(mm[1] || "") + "<u>" + esc(mm[2]) + "</u>" + " " + esc(year);
    yearMark.style.left = yearInput.offsetLeft + "px";
    yearMark.style.width = yearInput.offsetWidth + "px";
    yearMark.classList.add("is-on");
  }
  var DATE_KEYS = { Digit1: "year-down", Digit2: "month-down", Digit3: "day-down", Digit8: "day-up", Digit9: "month-up", Digit0: "year-up",
    Numpad1: "year-down", Numpad2: "month-down", Numpad3: "day-down", Numpad8: "day-up", Numpad9: "month-up", Numpad0: "year-up" };
  [["year-up", function () { stepYear(1); }, "year"], ["year-down", function () { stepYear(-1); }, "year"],
   ["month-up", function () { stepMonthKey(1); }, "month"], ["month-down", function () { stepMonthKey(-1); }, "month"],
   ["day-up", function () { stepDay(1); }, "day"], ["day-down", function () { stepDay(-1); }, "day"]].forEach(function (b) {
    var el = $(b[0]);
    el.addEventListener("click", function () {
      if (el.getAttribute("aria-disabled") === "true") return;
      stopPlay();
      b[1]();
      if (markPart) showMark(el.matches(":hover") ? b[2] : "");
    });
    el.addEventListener("mouseenter", function () { if (canHover) showMark(b[2]); });
    el.addEventListener("mouseleave", function () { showMark(""); });
  });
  yearInput.addEventListener("focus", function () { yearMark.classList.remove("is-on"); });
  yearInput.addEventListener("focus", function () { yearInput.select(); });

  // Play keeps an even pace (since 10 November 2026; before, it held on a date whose borders changed): every step of the
  // same kind takes the same time, divided by the speed slider's.
  // Before 1200 it goes year by year as well, at `early` a year (about four and a half minutes from 3400 BC); before
  // 10 November 2026 it jumped from one change to the next there, 0.8 seconds each, however many years lay between.
  var PLAY = { yearlyFrom: 1200, map: 1400, early: 60, year: 250, month: 60, load: 100 };
  var playTimer = 0, playMode = "";
  // Play runs to the present month, the end of the timeline (after 2019 the map is the last day of the data, while the date runs on).
  function playEnd() { return lapse ? lapse.endT : dataEnd(); }
  function dataEnd() { return modern ? lastTime() : dated ? dated.to : maps[maps.length - 1].y; }
  function playNext(t) {
    if (lapse) return lapseNext(t);
    if (isMonthly(t)) {
      if (playDaily()) return timeOfDay(dayOfTime(t) + playDays());
      var d = dateOfDay(dayOfTime(t)), y = d[0], m = d[1] + 1;
      if (m > 12) { m = 1; y++; }
      return sameDay(y, m, d[2]);
    }
    if (t < PLAY.yearlyFrom && isDated(t)) {
      var ny = Math.floor(t + 1e-6) + 1;
      return Math.min(ny === 0 ? 1 : ny, PLAY.yearlyFrom);
    }
    if (t < PLAY.yearlyFrom) {
      var mi = mapIndexFor(t);
      return mi < maps.length - 1 ? Math.min(maps[mi + 1].y, PLAY.yearlyFrom) : PLAY.yearlyFrom;
    }
    var next = Math.round(t) + 1, mf = monthlyFrom();
    return (modern || dated) && next >= mf ? (playDaily() ? timeOfDay(dayFromDate(mf, 1, 1)) : monthTime(mf, 1)) : next;
  }
  // The time before t when playing backwards: a month back from 1648, a year back to 1200, and the
  // previous change before that, the steps forward play takes.
  function playPrev(t) {
    if (isMonthly(t)) {
      var mf = monthlyFrom();
      if (playDaily()) { var pd = dayOfTime(t) - playDays(); return dateOfDay(pd)[0] < mf ? mf - 1 : timeOfDay(pd); }
      var d = dateOfDay(dayOfTime(t)), y = d[0], m = d[1] - 1;
      if (m < 1) { m = 12; y--; }
      return y < mf ? mf - 1 : sameDay(y, m, d[2]);
    }
    if (t <= PLAY.yearlyFrom && dated && t - 1 >= dated.from - 1e-6) {
      var py = Math.ceil(t - 1e-6) - 1;
      return Math.max(py === 0 ? -1 : py, FIRST_T);
    }
    if (t <= PLAY.yearlyFrom) {
      for (var p = points.length - 1; p >= 0; p--) if (points[p] < t - 1e-6) return points[p];
      return FIRST_T;
    }
    var prev = Math.round(t) - 1;
    return prev === 0 ? -1 : prev;
  }
  function playWait(from, to) {
    if (lapse) return lapseWait();
    if (isMonthly(to)) return PLAY.month;
    if (to <= PLAY.yearlyFrom) return isDated(to) ? PLAY.early : PLAY.map;
    return PLAY.year;
  }
  // While the timeline plays, the next PLAY_FILES files in its direction are asked for as soon as each step is taken, not
  // when the browser is next idle (which, while it plays, may be seconds away), so play seldom waits for one: from 1200
  // the files hold 50 to 100 years, and 1,500 to 2,000 years before that, and each comes as its rough lines and then its
  // fine ones. Going forward from the last of them, the file from 1886 on (modern.json) is asked for too.
  // Play keeps the detail it started with: when the map shows a file's fine lines (at rest they come within a moment, and
  // close in they always do), the next file's fine lines are asked for with its rough ones, and a step into a file whose
  // fine lines are still on their way waits for them (up to PLAY_FINE_WAIT ms), so the borders don't drop to the rough
  // lines for a moment at each file's edge and come back.
  var PLAY_FILES = 2, PLAY_FINE_WAIT = 2500, fineHold = 0;
  function playWantsFine() {
    if (fineNow()) return true;
    if (!current) return false;
    if (current.modern) return !!modern && modern.fine >= 2;
    return !!current.dated && !!dated && !!dated.chunks[current.chunk] && dated.chunks[current.chunk].fine >= 2;
  }
  // Whether the date's file has the detail play wants (or never will: a file not yet come is play's ordinary wait).
  function fineReady(t, fine) {
    if (!fine) return true;
    if (isModern(t)) {
      if (!modern || !modern.rows || modern.fineFailed) return true;
      if (!modern.fine) loadModernFine();
      return modern.fine !== 1 && modern.fine !== 0;
    }
    if (!isDated(t) || !dated) return true;
    var k = chunkIndexFor(t), c = dated.chunks[k];
    if (!c || !c.data || c.fineFailed) return true;
    if (!c.fine) loadChunkFine(k);
    return c.fine !== 1 && c.fine !== 0;
  }
  function prefetchPlay(t) {
    if (!playTimer || !dated) return;
    var back = playBack(), noop = function () {}, fine = playWantsFine();
    var get = function (i, n) { loadChunk(i).then(function () { if (fine && n === 1) loadChunkFine(i); }).catch(noop); };
    if (isModern(t)) {
      if (back) for (var b = 1; b <= PLAY_FILES; b++) if (dated.chunks[dated.chunks.length - b]) get(dated.chunks.length - b, b);
      return;
    }
    if (!isDated(t)) return;
    var ck = chunkIndexFor(t);
    for (var k = 1; k <= PLAY_FILES; k++) {
      var i = back ? ck - k : ck + k;
      if (dated.chunks[i]) get(i, k);
      else if (!back && i === dated.chunks.length && modern) loadModern().then(function () { if (fine) loadModernFine(); }).catch(noop);
    }
  }
  function playLoaded() { return isModern(now) || (isDated(now) ? !!current && !!current.dated && wantKey === "e" + now : !!maps.length && maps[mapIndexFor(now)].snap === current); }
  function playStep() {
    if (!playLoaded()) return PLAY.load;
    var back = playBack(), from = now, to = back ? playPrev(now) : playNext(now);
    if (back ? from <= FIRST_T + 1e-9 || to < FIRST_T - 1e-9 : to > playEnd() + 1e-9) return -1;
    if (!fineReady(to, playWantsFine())) {
      if (!fineHold) fineHold = performance.now();
      if (performance.now() - fineHold < PLAY_FINE_WAIT) return PLAY.load;
    }
    fineHold = 0;
    setTime(to);
    prefetchPlay(to);
    prepareAhead(to);
    return playWait(from, to);
  }
  // While the timeline plays, the next PLAY_AHEAD frames are built in the pause after each one is drawn: the snapshot of
  // the borders and its level (the shapes and border lines at the zoom shown), which took 150 to 300 ms of a new date's
  // first drawing, against about 15 ms for a date already built, and made the play judder. One frame is built per task,
  // so drawing is never held up for long, and a step that comes first cancels the rest. A file the frames need that
  // hasn't come yet is asked for, and they are built next time.
  var PLAY_AHEAD = 2, aheadTimer = 0, aheadRaf = 0;
  function snapIfLoaded(t) {
    if (isModern(t)) return modern && modern.rows ? modernSnap(Math.min(dayOfTime(t), modern.toDay)) : null;
    if (isDated(t)) {
      var ck = chunkIndexFor(t), c = dated.chunks[ck];
      if (!c.data) { loadChunk(ck).catch(function () {}); return null; }
      return datedSnap(ck, t);
    }
    var mi = mapIndexFor(t);
    if (maps[mi] && !maps[mi].snap) loadMap(mi).catch(function () {});
    return maps[mi] ? maps[mi].snap : null;
  }
  function prepareFrame(t) {
    var snap = snapIfLoaded(t);
    if (snap) level(snap, useLevel());
    return !!snap;
  }
  function prepareAhead(t) {
    clearTimeout(aheadTimer); cancelAnimationFrame(aheadRaf);
    var back = playBack(), k = 0, at = t;
    var next = function () {
      if (!playTimer || k++ >= PLAY_AHEAD) return;
      at = back ? playPrev(at) : playNext(at);
      if (back ? at < FIRST_T - 1e-9 : at > playEnd() + 1e-9) return;
      prepareFrame(at);
      aheadTimer = setTimeout(next, 0);
    };
    aheadRaf = requestAnimationFrame(function () { aheadTimer = setTimeout(next, 0); });
  }
  // playMode is "normal", "fast", "back", or "back-fast".
  function playBack() { return playMode.indexOf("back") === 0; }
  // The speed: the - and + keys step through SPEEDS; any speed above 0 and up to 4, to two decimals, can be typed in the
  // field between them (since 25 November 2026). It is kept as a power of two (playSpeed = log2 of the speed). At 0.5x and
  // slower, play goes by the day from 1648; faster, by the month.
  var SPEEDS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4], SPEED_MIN = Math.log2(0.01), SPEED_MAX = 2, playSpeed = 0, speedOut = $("speed");
  try { var sv = parseFloat(localStorage.getItem(STORE_SPEED)); if (isFinite(sv)) playSpeed = Math.max(SPEED_MIN, Math.min(SPEED_MAX, sv)); } catch (e) {}
  function playDelay(ms) { return ms / Math.pow(2, playSpeed); }
  function speedX(v) { return Math.round(Math.pow(2, v) * 100) / 100; }
  function playDaily() { return speedX(playSpeed) <= 0.5; }
  // At 0.5x and slower play steps by days, as many in a step as keep its pace even with the month's steps above it (a month
  // a step at 0.5x, about a week at 0.25x, a day at 0.1x and slower), each step taking the month step's time (PLAY.month).
  // Until 25 November 2026 it went a day a step from 0.5x down, which made 0.51x thirty times faster than 0.5x.
  function playDays() { return Math.max(1, Math.round(30.44 * Math.pow(speedX(playSpeed) / 0.5, DAY_CURVE))); }
  var DAY_CURVE = Math.log(30.44) / Math.log(5);
  // "0.25x", with a plain x in the figures' own type, where a × came out thinner than the figures (Noah, 25 November 2026).
  function speedText(v) { return String(speedX(v)) + "x"; }
  function setPlaySpeed(v, keep) {
    playSpeed = Math.max(SPEED_MIN, Math.min(SPEED_MAX, v));
    var x = speedX(playSpeed);
    if (document.activeElement !== speedOut) speedOut.value = speedText(playSpeed);
    speedOut.setAttribute("aria-label", x === 1 ? T("Speed of play: usual speed") : T("Speed of play: {x} times the usual speed", { x: String(x) }));
    $("speed-down").disabled = !(x > SPEEDS[0]);
    $("speed-up").disabled = !(x < SPEEDS[SPEEDS.length - 1]);
    if (keep === false) return;
    try { localStorage.setItem(STORE_SPEED, String(playSpeed)); } catch (e) {}
  }
  // The next preset faster or slower than the speed now, so a typed 0.6x steps to 0.75x or 0.5x.
  function stepPlaySpeed(d) {
    var x = speedX(playSpeed), pick = null;
    SPEEDS.forEach(function (s) { if (d > 0 ? s > x + 1e-9 && pick === null : s < x - 1e-9) pick = s; });
    if (pick !== null) setPlaySpeed(Math.log2(pick));
  }
  $("speed-down").addEventListener("click", function () { stepPlaySpeed(-1); });
  $("speed-up").addEventListener("click", function () { stepPlaySpeed(1); });
  function commitSpeed() {
    var raw = String(speedOut.value).trim().replace(/[x×]$/i, "").trim().replace(",", "."), x = /^\d*\.?\d+$/.test(raw) ? Math.round(parseFloat(raw) * 100) / 100 : NaN;
    if (x > 0 && x <= 4) { setPlaySpeed(Math.log2(x)); speedOut.value = speedText(playSpeed); return; }
    speedOut.value = speedText(playSpeed);
    if (raw && raw !== String(speedX(playSpeed))) yearHint(T("Type a speed above 0 and up to 4, such as {a} or {b}.", { a: "0.25", b: "1.5" }));
  }
  speedOut.addEventListener("focus", function () { speedOut.value = String(speedX(playSpeed)); speedOut.select(); });
  speedOut.addEventListener("keydown", function (e) {
    e.stopPropagation();
    if (e.key === "Enter") { e.preventDefault(); speedOut.blur(); }
    else if (e.key === "Escape") { speedOut.value = String(speedX(playSpeed)); speedOut.blur(); }
  });
  speedOut.addEventListener("blur", commitSpeed);
  setPlaySpeed(playSpeed, false);
  var PLAY_BUTTONS = [["play", "normal", T("Play through time")], ["play-back", "back", T("Play backwards")]];
  function syncPlayTips() {
    PLAY_BUTTONS.forEach(function (b) {
      var on = playMode === b[1];
      $(b[0]).setAttribute("aria-pressed", on ? "true" : "false");
      $(b[0]).setAttribute("aria-label", on ? T("Pause") : b[2]);
    });
  }
  function syncPlayButtons() {
    syncSearch();
    syncPlayTips();
  }
  // playMode is "normal" or "back" ("" when stopped).
  function playModeOf(back) { return back ? "back" : "normal"; }
  function startPlay(back) {
    var mode = playModeOf(back);
    if (playTimer) { playMode = mode; syncPlayButtons(); return; }
    if (back) { if (now <= FIRST_T + 1e-9 || now > playEnd() + 1e-9) setTime(playEnd()); }
    else if (now >= playEnd() - 1e-9 || (lapse && now < lapse.startT - 1e-9)) setTime(lapse ? lapse.startT : FIRST_T);
    playMode = mode;
    syncPlayButtons();
    prepareAhead(now);
    var tick = function () {
      var wait = playStep();
      if (wait < 0) { stopPlay(); lapseDone(); } else playTimer = setTimeout(tick, playDelay(wait));
    };
    playTimer = setTimeout(tick, playDelay(playWait(now, now)));
    prefetchPlay(now);
  }
  function stopPlay() {
    if (!playTimer) return;
    clearTimeout(playTimer); playTimer = 0; playMode = "";
    syncPlayButtons();
  }
  function togglePlay(back) { if (playMode === playModeOf(back)) stopPlay(); else startPlay(back); }
  $("play").addEventListener("click", function () { togglePlay(false); });
  $("play-back").addEventListener("click", function () { togglePlay(true); });
  var lapseTagOf = null, tagList = null, lapse = null, LAPSE_MIN_YEARS = 30, LAPSE_SECONDS = 75, LAPSE_WASH = 0.6, LAPSE_LABEL = 0.4, LAPSE_SPRING = 2.4, LAPSE_MAX_S = 6000, LAPSE_HOLD = 4000, LAPSE_FLY = 1300, LAPSE_PAUSE = 400, LAPSE_SETTLE_MAX = 8000, LAPSE_MONTH = 50;
  function loadLapseTags() {
    fetchJSON("data/tags.json").then(function (d) {
      var byName = new Map();
      catalogue.forEach(function (e, id) { if (!byName.has(e[0])) byName.set(e[0], []); byName.get(e[0]).push(id); });
      lapseTagOf = new Map();
      d.forEach(function (t) {
        var ids = [];
        t[1].forEach(function (n) { (byName.get(n) || []).forEach(function (id) { ids.push(id); }); });
        var tag = { name: t[0], ids: ids };
        ids.forEach(function (id) { lapseTagOf.set(id, tag); });
      });
      tagList = d;
      syncLapseBtn();
      syncComments();
    }).catch(function () { tagList = []; syncComments(); });
  }
  function spanOf(id) {
    var e = catalogue[id], lo = Infinity, hi = -Infinity;
    [e[6], e[5]].forEach(function (s) { if (s) { lo = Math.min(lo, s[0]); hi = Math.max(hi, s[1]); } });
    return lo <= hi ? [lo, hi] : null;
  }
  function lapseFor(id) {
    var e = catalogue[id];
    if (!e || e[4]) return null;
    var tag = lapseTagOf ? lapseTagOf.get(id) : null, ids = tag ? tag.ids : [id], lo = Infinity, hi = -Infinity;
    ids.forEach(function (i) { var s = spanOf(i); if (s) { lo = Math.min(lo, s[0]); hi = Math.max(hi, s[1]); } });
    if (!(hi - lo >= LAPSE_MIN_YEARS)) return null;
    return { tag: tag ? tag.name : "", id: id, ids: new Set(ids), from: lo, to: hi };
  }
  function syncLapseBtn() {
    var f = selected >= 0 && !selCity && !card.hidden ? lapseFor(selected) : null;
    $("card-follow").hidden = !f;
    if (f) $("card-follow-text").textContent = f.tag ? T("Follow {name} through time", { name: f.tag }) : T("Follow it through time");
  }
  $("card-follow-btn").addEventListener("click", function () { if (selected >= 0) startLapse(selected); });
  function lapseTime(y, first) {
    if (y === 0) y = first ? 1 : -1;
    return y >= MONTHLY_FROM ? monthTime(y, first ? 12 : 1) : y;
  }
  // A month a step where the map changes by the month (from 1648), landing on the last date; a year a step before, and
  // five years while none of its states is on the map.
  function lapseNext(t) {
    if (!lapse.gap && isMonthly(t)) {
      var d = dateOfDay(dayOfTime(t)), ny = d[0], nm = d[1] + 1;
      if (nm > 12) { nm = 1; ny++; }
      var n = monthTime(ny, nm);
      return n > lapse.endT && t < lapse.endT - 1e-9 ? lapse.endT : n;
    }
    var y = yearOf(t) + (lapse.gap ? 5 : 1);
    if (y > yearOf(lapse.endT)) y = Math.max(yearOf(t) + 1, yearOf(lapse.endT));
    if (y === 0) y = 1;
    return y >= MONTHLY_FROM ? monthTime(y, 1) : y;
  }
  function lapseWait() { return lapse.gap ? lapse.pace / 2 : isMonthly(now) ? LAPSE_MONTH : lapse.pace; }
  function lapseOwn(p) { var ids = lapse.f.ids; return ids.has(p.id) || (p.member >= 0 && ids.has(p.member)); }
  function lapseHas(p) { var ids = lapse.f.ids; return lapseOwn(p) || (p.ruler >= 0 && ids.has(p.ruler)) || (p.part >= 0 && ids.has(p.part)); }
  function lapseLabelAlpha(id, a) { return lapse && !(lapse.f.ids.has(id) || (lapse.shown && lapse.shown.has(id))) ? a * LAPSE_LABEL : a; }
  function lapseHold() { if (lapse) { lapse.holdUntil = performance.now() + LAPSE_HOLD; lapse.v = { lon: 0, lat: 0, z: 0 }; } }
  function lapseFree() {
    var top = 0, bottom = H;
    ["top", "time", "follow"].forEach(function (id) {
      var el = $(id);
      if (!el || el.hidden) return;
      var r = el.getBoundingClientRect();
      if (!r.height) return;
      if ((r.top + r.bottom) / 2 < H / 2) top = Math.max(top, r.bottom); else bottom = Math.min(bottom, r.top);
    });
    return bottom - top > H / 4 ? { top: top, bottom: bottom } : { top: 0, bottom: H };
  }
  function lapseBox(snap) {
    var pieces = [], tot = 0, areaBy = new Map();
    snap.polys.forEach(function (p, i) {
      if (!p || !lapseOwn(p)) return;
      var g = featOf(snap.topo.lo, "lo", snap.geoms.lo[i]).geo.geometry;
      if (!g) return;
      var shapes = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
      shapes.forEach(function (c) {
        var f = { type: "Polygon", coordinates: c }, a = d3.geoArea(f);
        if (a > TAU) { f = { type: "Polygon", coordinates: c.map(function (r) { return r.slice().reverse(); }) }; a = 2 * TAU - a; }
        pieces.push({ f: f, a: a });
        tot += a;
        var own = lapse.f.ids.has(p.id) ? p.id : p.member;
        areaBy.set(own, (areaBy.get(own) || 0) + a);
      });
    });
    if (!pieces.length || !(tot > 0)) return null;
    pieces.sort(function (x, y) { return y.a - x.a; });
    var kept = [], sum = 0;
    for (var k = 0; k < pieces.length && (k === 0 || sum < 0.9 * tot); k++) { kept.push(pieces[k].f); sum += pieces[k].a; }
    var b = d3.geoBounds({ type: "GeometryCollection", geometries: kept }), w = b[0][0], s = b[0][1], e = b[1][0], n = b[1][1];
    if (e < w) e += 360;
    var big = -1, bigA = -1;
    areaBy.forEach(function (a, id) { if (a > bigA) { bigA = a; big = id; } });
    var wide = s < 0 && n > 0 ? 1 : Math.max(Math.cos(s * D2R), Math.cos(n * D2R));
    return { lon: wrap180((w + e) / 2), lat: (s + n) / 2, wKm: Math.max(150, (e - w) * 111.32 * wide), hKm: Math.max(150, (n - s) * 110.57), id: big };
  }
  function lapseAim(snap) {
    var box = lapseBox(snap);
    lapse.gap = !box;
    var name = box ? polityNameL(box.id) : T("Not on the map");

    if (name !== lapse.name) { lapse.name = name; $("follow-name").textContent = name; }
    if (!box) return;
    lapse.lastId = box.id;
    var fr = lapseFree(), m = 36, zr = zoomRange(), base = flat ? baseK : baseR;
    var S = R_KM * 0.88 * Math.min((W - 2 * m) / box.wKm, (fr.bottom - fr.top - 2 * m) / box.hKm);
    S = Math.max(zr[0] * base, Math.min(Math.min(LAPSE_MAX_S, zr[1] * base), S));
    var dy = (fr.top + fr.bottom) / 2 - H / 2;
    lapse.target = { lon: box.lon, lat: Math.max(-80, Math.min(80, box.lat + dy / (S / R_KM) / 110.57)), zoom: S / base, S: S };
  }
  function lapseLoop(ts) {
    if (!lapse) return;
    lapse.raf = requestAnimationFrame(lapseLoop);
    var dt = lapse.last ? Math.min(0.1, (ts - lapse.last) / 1000) : 0;
    lapse.last = ts;
    if (current && current.key !== lapse.key && playLoaded()) { lapse.key = current.key; lapseAim(current); }
    if (lapse.fly) {
      if (!lapse.target) {
        if (lapse.key && ts - lapse.t0 > 3000) { lapse.fly = false; lapse.playAt = ts; }
        return;
      }
      lapse.fly = false;
      flyTo(lapse.target.lon, lapse.target.lat, lapse.target.S);
      lapse.holdUntil = ts + (reduceMotion ? 0 : LAPSE_FLY);
      lapse.settling = ts;
      return;
    }
    if (lapse.playAt && ts >= lapse.playAt) { lapse.playAt = 0; startPlay(false); }
    if (lapse.settling && ts - lapse.settling > LAPSE_SETTLE_MAX) lapseSettled(ts);
    var t = lapse.target;
    if (!t || ts < lapse.holdUntil || pointers.size) return;
    var ex = wrap180(t.lon - view.lon), ey = t.lat - view.lat, ez = Math.log(t.zoom / view.zoom), v = lapse.v;
    var still = Math.abs(v.lon) + Math.abs(v.lat) < 0.05 && Math.abs(v.z) < 0.01;
    if (lapse.settling && still && Math.abs(ex) < 0.03 && Math.abs(ey) < 0.03 && Math.abs(ez) < 0.006) lapseSettled(ts);
    if (reduceMotion) {
      if (Math.abs(ex) + Math.abs(ey) + Math.abs(ez) < 1e-6) return;
      view.lon = t.lon; view.lat = t.lat; view.zoom = t.zoom;
      applyView(); nudge();
      return;
    }
    if (Math.abs(ex) < 0.005 && Math.abs(ey) < 0.005 && Math.abs(ez) < 0.001 && Math.abs(v.lon) + Math.abs(v.lat) < 0.01 && Math.abs(v.z) < 0.002) return;
    var w = LAPSE_SPRING;
    v.lon += (w * w * ex - 2 * w * v.lon) * dt;
    v.lat += (w * w * ey - 2 * w * v.lat) * dt;
    v.z += (w * w * ez - 2 * w * v.z) * dt;
    view.lon = wrap180(view.lon + v.lon * dt);
    view.lat = Math.max(-85, Math.min(85, view.lat + v.lat * dt));
    view.zoom *= Math.exp(v.z * dt);
    applyView(); nudge();
  }
  function lapseSettled(ts) {
    lapse.settling = 0;
    lapse.playAt = ts + LAPSE_PAUSE;
  }
  function placeLapseBar() {
    var bar = $("follow");
    if (bar.hidden) return;
    var low = innerHeight, me = bar.getBoundingClientRect();
    ["top", "time", "key", "changes", "wars"].forEach(function (id) {
      var el = $(id), r = el && !el.hidden ? el.getBoundingClientRect() : null;
      if (!r || !r.height || (r.top + r.bottom) / 2 < innerHeight / 2) return;
      if (id !== "top" && id !== "time" && (r.right < me.left || r.left > me.right)) return;
      low = Math.min(low, r.top);
    });
    bar.style.bottom = Math.round(innerHeight - low + 10) + "px";
  }
  function startLapse(id) {
    var f = lapseFor(id);
    if (!f) return;
    endLapse();
    stopPlay();
    closeCard();
    lapse = { f: f, startT: lapseTime(f.from, true), endT: Math.min(lapseTime(f.to, false), dataEnd()), pace: Math.max(40, Math.min(400, LAPSE_SECONDS * 1000 / (f.to - f.from + 1))),
      key: "", target: null, gap: false, name: "", lastId: id, fly: true, settling: 0, playAt: 0, holdUntil: 0, v: { lon: 0, lat: 0, z: 0 }, last: 0, t0: performance.now(), raf: 0, timer: 0 };
    $("follow-tag").textContent = f.tag || polityNameL(id);
    $("follow-name").textContent = "";
    $("follow").hidden = false;
    placeLapseBar();
    setTime(lapse.startT);
    lapse.raf = requestAnimationFrame(lapseLoop);
    scheduleRender();
    try { $("follow-stop").focus({ preventScroll: true }); } catch (e) {}
  }
  function endLapse() {
    if (!lapse) return;
    cancelAnimationFrame(lapse.raf);
    clearTimeout(lapse.timer);
    lapse = null;
    stopPlay();
    $("follow").hidden = true;
    scheduleRender();
  }
  function lapseDone() {
    var was = lapse;
    if (!was) return;
    was.timer = setTimeout(function () {
      if (lapse !== was) return;
      var id = was.lastId;
      endLapse();
      if (id >= 0 && current && current.byId.has(id)) select(id);
    }, 1200);
  }
  function drawLapseWash(snap, L, landPath) {
    var shape = new Path2D(), any = false;
    lapse.shown = new Set();
    for (var i = 0; i < snap.polys.length; i++) { var p = snap.polys[i]; if (p && lapseHas(p)) { traceAll(shape, L.feats[i]); any = true; lapse.shown.add(p.id); } }
    ctx.save();
    ctx.clip(landPath);
    if (any) { var out = new Path2D(); out.rect(-10, -10, W + 20, H + 20); out.addPath(shape); ctx.clip(out, "evenodd"); }
    ctx.globalAlpha = LAPSE_WASH;
    ctx.fillStyle = pal.paper;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  $("follow-stop").addEventListener("click", endLapse);
  window.addEventListener("keydown", function (e) {
    if (lapse && e.key === "Escape" && !panelsOpen()) { e.preventDefault(); endLapse(); }
  }, true);
  window.addEventListener("resize", function () { if (lapse) { placeLapseBar(); lapse.key = ""; } });

  function setFlat(on) {
    if (on === flat) return;
    var S = localScale();
    flat = on;
    view.zoom = S / (flat ? baseK : baseR);
    reliefKey = "";
    applyView();
    syncProjection();
    syncCompass();
    try { localStorage.setItem(STORE_FLAT, flat ? "1" : "0"); } catch (e) {}
    nudge();
  }
  // The globe or the flat map, chosen in the View panel (or with M).
  function syncProjection() { $("view-globe").checked = !flat; $("view-flat").checked = flat; }
  ["view-globe", "view-flat"].forEach(function (id) {
    $(id).addEventListener("change", function () { if ($(id).checked) setFlat(id === "view-flat"); });
  });

  var card = $("card"), wikiCache = new Map(), wikiAsk = 0;
  var BLURB_URL = "https://jvcmeuqlyygpwelmvxuv.supabase.co/functions/v1/chronia-blurb", BLURB_WAIT = 28000, BLURB_PEEK = 700;
  var blurbCache = new Map(), blurbTimer = 0, selCity = null, cardClick = false;
  // Set when the note's function says no more new notes may be written today: "limit" when this visitor has had
  // their 100 (the function's WHO_CAP, sent back as `cap`), "cap" when the whole site has had its 10,000. Notes
  // already written are still shown; the card says why a new one isn't.
  var blurbStop = null;
  function blurbStopText() {
    if (!blurbStop) return "";
    return blurbStop.error === "cap"
      ? T("CHRONIA has written all the new notes it can today. Notes already written still show, and new ones can be written tomorrow.")
      : blurbStop.cap ? T("You have had today’s {n} new notes. Notes already written still show, and new ones can be written tomorrow.", { n: blurbStop.cap }) : T("You have had all of today’s new notes. Notes already written still show, and new ones can be written tomorrow.");
  }
  // The same, in a card's line, with a link to Premium after a reader's own limit (not the site's), for a reader
  // without it: the link goes to Premium's page.
  function blurbStopShow(el) {
    el.textContent = blurbStopText();
    if (!blurbStop || blurbStop.error !== "limit" || typeof premium !== "object" || !premium || premium.on || !PREMIUM_LIVE) return;
    var a = document.createElement("a");
    a.href = "premium/";
    a.className = "ch-premium-link";
    a.textContent = T("Get CHRONIA Premium for 5× the daily notes");
    a.addEventListener("click", function (e) { e.stopPropagation(); });
    el.appendChild(document.createTextNode(" "));
    el.appendChild(a);
  }
  var factsAsk = 0;
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
    closePicture();
    selected = -1;
    selCity = null;
    clearTimeout(blurbTimer);
    card.hidden = true;
    syncComments();
    if (phoneQuery.matches) layout();
    scheduleRender();
  }
  $("card-close").addEventListener("click", closeCard);
  // The pinned bar: once the card's name has scrolled above the top of the card, the bar shows it again, with a button back
  // to the top and the close button.
  var cardPinned = false;
  function syncCardPin() {
    var nameEl = $("card-name"), on = !card.hidden && card.scrollTop > nameEl.offsetTop + nameEl.offsetHeight - 6;
    if (on) $("card-pin-name").textContent = nameEl.textContent;
    if (on === cardPinned) return;
    cardPinned = on;
    card.classList.toggle("is-pinned", on);
    ["card-top", "card-pin-close"].forEach(function (id) { $(id).tabIndex = on ? 0 : -1; });
    $("card-pin").setAttribute("aria-hidden", on ? "false" : "true");
  }
  card.addEventListener("scroll", syncCardPin, { passive: true });
  $("card-top").addEventListener("click", function () {
    card.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    $("card-close").focus({ preventScroll: true });
  });
  $("card-pin-close").addEventListener("click", closeCard);
  $("card-pin").setAttribute("aria-hidden", "true");
  function polityButton(id) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = polityNameL(id);
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
    return Math.max(KNOTS[0][0], Math.min(LAST_YEAR, yearOf(now) || 1));
  }
  function cityRef(l) {
    var r = l.ref, city = r.city || null;
    var at = r.cap ? capitalNow(r.cap) || (city ? null : capitalAt(r.cap, Math.min(dayOfTime(now), modern.toDay))) : null;
    if (!at) return { id: city.id, qid: city.qid, lon: city.lon, lat: city.lat, modern: city.name, names: city.steps, since: city.since, until: city.until, of: -1, kind: l.kind };
    if (city) return { id: city.id, qid: city.qid, lon: at[1], lat: at[2], modern: city.name, names: city.steps, since: city.since, until: city.until, of: r.of, kind: l.kind };
    return { lon: at[1], lat: at[2], modern: at[0], names: null, since: null, of: r.of, kind: l.kind };
  }
  function cityFacts(c) {
    var modernNow = !!(current && current.modern), day = modernNow ? Math.min(dayOfTime(now), modern.toDay) : yearOf(now);
    var ed = c.id && edits.cityN ? editAt("city-name", c.id, now) : null;
    return { name: ed ? ed.name : namedAt(c.names, c.modern, now), modern: c.modern, day: day, modernNow: modernNow, early: c.since != null && now < c.since };
  }
  function cityState(c) {
    if (!current) return null;
    if (c.of >= 0 && current.byId.has(c.of)) {
      var own = current.byId.get(c.of);
      var at = polityCap(own);
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
    selCity.ref = l.ref;
    cardClick = true;
    card.hidden = false;
    renderCard();
    if (phoneQuery.matches) layout();
    scheduleRender();
  }
  function renderCityCard(click) {
    var c = selCity, f = cityFacts(c), p = cityState(c);
    var datedNow = !!(current && current.dated), byDay = f.modernNow || isMonthly(now);
    var when = f.modernNow ? fmtDay(f.day) : datedNow ? (byDay ? fmtDay(dayOfTime(now)) : fmtYear(Math.round(now))) : current ? fmtYear(current.year) : fmtNow(now);
    var whenP = !f.modernNow && !datedNow && current ? T("on the map of {year}", { year: when }) : datedNow && !byDay ? T("in {date}", { date: when }) : T("on {date}", { date: when });
    var capAt = p ? polityCap(p) : null, isCap = !!(capAt && Math.abs(capAt[1] - c.lon) < 0.05 && Math.abs(capAt[2] - c.lat) < 0.05);
    $("card-kind").textContent = T(isCap ? "Capital" : c.place ? "Place" : c.kind === "town" ? "Town" : "City");
    $("card-name").textContent = placeNameL(f.name, f.name === c.modern ? c.qid : null);
    var facts = $("card-facts");
    facts.textContent = "";
    var addText = function (t) { facts.appendChild(document.createTextNode(t)); };
    if (f.modern && f.modern !== f.name) addText(T("Now {name}.", { name: placeNameL(f.modern, c.qid) }) + " ");
    if (f.early) addText(T("Not yet founded {when}.", { when: whenP }) + " ");
    else if (p) addTpl(facts, T(isCap ? "Capital of {state} {when}." : "In {state} {when}.", {}), { state: polityButton(p.id), when: whenP });
    else addText(T("In no state {when}.", { when: whenP }));
    var y = askYear();
    renderCitySources(c, f, y, f.name);
    loadWiki(f.modern || f.name, f.modern && f.modern !== f.name ? f.name : f.modern || f.name, {
      ask: { kind: "city", name: f.name, modern: f.modern || "", lon: c.lon, lat: c.lat, state: p ? polityName(p.id) : "", capital: isCap, year: y },
      label: placeNameL(f.name, f.name === c.modern ? c.qid : null), when: fmtYear(y), click: click
    }, [c.lon, c.lat]);
  }
  function renderCard() {
    if (typeof syncCardPin === "function") syncCardPin();
    var click = cardClick;
    cardClick = false;
    syncLapseBtn();
    syncComments();
    if (selCity) { renderCityCard(click); return; }
    if (selected < 0 || !catalogue[selected]) return;
    var e = catalogue[selected], p = current ? current.byId.get(selected) : null;
    var modernNow = !!(current && current.modern), datedNow = !!(current && current.dated);
    var byDay = datedNow && isMonthly(now);
    var when = modernNow ? fmtDay(Math.min(dayOfTime(now), modern.toDay)) : byDay ? fmtDay(dayOfTime(now)) : datedNow ? fmtYear(Math.round(now)) : current ? T("the map of {year}", { year: fmtYear(current.year) }) : fmtNow(now);
    var whenYear = modernNow ? dateOfDay(dayOfTime(now))[0] : datedNow ? yearOf(now) : current ? current.year : Math.round(now);
    $("card-kind").textContent = T(e[4] ? "People or culture" : p && p.status > 0 ? STATUS[p.status] : p && p.ruler >= 0 ? "Dependency" : "State");
    // In the reader's language, as the map labels it (Noah, 25 November 2026: the card said "Papal States" in Italian).
    var nameL = (PL.pol && PL.pol[e[0]]) || e[0];
    $("card-name").textContent = nameL;
    var facts = $("card-facts"), factsAt = ++factsAsk;
    facts.textContent = "";
    // One fact a line, as "Label: value".
    var line = function (label) {
      var el = document.createElement("span");
      el.className = "ch-fact";
      if (label) { var b = document.createElement("span"); b.className = "ch-fact-label"; b.textContent = T("{label}: ", { label: T(label) }); el.appendChild(b); }
      facts.appendChild(el);
      return el;
    };
    var textLine = function (label, t) { var el = line(label); el.appendChild(document.createTextNode(t)); return el; };
    var placeLine = function (label, name, lon, lat) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = name;
      b.addEventListener("click", function () { flyTo(lon, lat, Math.max(localScale(), 1500)); });
      line(label).appendChild(b);
    };
    var addPolity = function (el, id) { if (current.byId.has(id) || isGroupIn(current, id)) el.appendChild(polityButton(id)); else el.appendChild(document.createTextNode(polityNameL(id))); };
    // A group's card lists its members, each a button to its own card (Noah, 27 November 2026), as a member's card names
    // the group it is part of.
    if (!p && current && isGroupIn(current, selected)) {
      var seen = new Set(), ml = null;
      current.order.forEach(function (q) {
        if (q.member !== selected || q.id === selected || seen.has(q.id)) return;
        seen.add(q.id);
        if (!ml) ml = line("Made up of"); else ml.appendChild(document.createTextNode(T(", ")));
        ml.appendChild(polityButton(q.id));
      });
    }
    if (p) {
      if (p.claims) {
        var dl = line("Disputed between");
        p.claims.forEach(function (c, k) { if (k) dl.appendChild(document.createTextNode(k === p.claims.length - 1 ? (p.claims.length > 2 ? T(", and ") : T(" and ")) : T(", "))); addPolity(dl, c); });
      }
      if (p.ruler >= 0) addPolity(line("Held by"), p.ruler);
      if (p.part >= 0 && p.part !== p.ruler) addPolity(line("Part of"), p.part);
      var capNow = polityCap(p);
      if (capNow) placeLine("Capital", capitalNameL(capNow), capNow[1], capNow[2]);
      var big = !e[4] && !p.people ? largestCity(p) : null;
      if (big) placeLine("Largest city", cityShownNameL(big, now), big.lon, big.lat);
      var flagLine = null, langLine = null;
      if (!e[4] && !p.people && !p.claims) {
        flagLine = line("Flag"); flagLine.hidden = true;
        langLine = line("Language"); langLine.hidden = true;
      }
      // One line for the span of its borders: "June 9, 1815 to August 23, 1866".
      // "Borders since" while they still stand.
      if (modernNow) { if (p.end >= 0) textLine("Borders from", T("{from} to {to}", { from: fmtDate(p.start), to: fmtDate(p.end) })); else textLine("Borders since", fmtDate(p.start)); }
      else if (datedNow) {
        var from = p.startDay !== null ? fmtDate(p.startDay) : fmtYear(p.start), until = p.endDay !== null ? fmtDate(p.endDay) : fmtYear(p.end);
        if (from === until) textLine("Borders", from);
        else textLine("Borders from", T("{from} to {to}", { from: from, to: until }));
      }
      if (p.band) line("").textContent = T("Bands of hunters, gatherers, or fishers, who ranged over this land without fixed borders.");
      else if (p.b <= 1 && !p.people) line("").textContent = T("Its borders here are approximate.");
      else if (datedNow && bordersKnown && p.b === 2 && !p.people && !p.claims) line("").textContent = T("Its borders are dotted, except where a treaty had fixed the line.");
      else if (modernNow && current && current.vague && !p.claims) {
        var unsettled = [];
        current.vague.forEach(function (k) { var ab = k.split("|"); if (+ab[0] === p.id && current.byId.has(+ab[1]) && unsettled.indexOf(+ab[1]) < 0) unsettled.push(+ab[1]); });
        if (unsettled.length) line("").textContent = T(unsettled.length > 1 ? "Its borders with {names} were not yet settled, so they are dotted." : "Its border with {names} was not yet settled, so it is dotted.", { names: claimNames(unsettled) });
      }
    } else if (!isGroupIn(current, selected)) {
      line("").textContent = T(modernNow || byDay ? "Not on the map on {date}." : datedNow ? "Not on the map in {date}." : "Not on the map of {date}.", { date: modernNow || datedNow ? (modernNow ? fmtDate(Math.min(dayOfTime(now), modern.toDay)) : byDay ? fmtDate(dayOfTime(now)) : when) : current ? fmtYear(current.year) : fmtNow(now) });
    }
    var title = wikiTitle(selected, whenYear), y = askYear();
    renderSources(p, e[0], whenYear);
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
      label: nameL, when: fmtYear(y), click: click
    });
    if (flagLine) {
      var at = modernNow ? dayYear(Math.min(dayOfTime(now), modern.toDay)) : byDay ? dayYear(dayOfTime(now)) : whenYear + 0.5, job = wikiCache.get(title);
      var chosen = title !== e[0];
      if (job) job.then(function (d) { return d && d.wikibase_item ? wdFacts(d.wikibase_item, at, chosen) : null; }).then(function (f) {
        if (!f || factsAt !== factsAsk) return;
        if (f.flag) {
          var im = document.createElement("img");
          im.className = "ch-flag"; im.alt = T("Flag of {name}", { name: nameL }); im.src = f.flag;
          flagLine.appendChild(im); flagLine.hidden = false;
        }
        if (f.langs.length) {
          langLine.firstChild.textContent = T("{label}: ", { label: T(f.langs.length > 1 ? "Languages" : "Language") });
          langLine.appendChild(document.createTextNode(f.langs.join(", "))); langLine.hidden = false;
        }
      }, function () {});
    }
  }
  // The state's largest city on the map at this time: the most populous city inside its land, or just
  // off its coast when no other state's land holds it.
  var bigCache = new Map();
  function largestCity(p) {
    if (!cities || !current) return null;
    var key = current.key + "|" + p.id + "|" + now;
    if (bigCache.has(key)) return bigCache.get(key);
    if (bigCache.size > 200) bigCache.clear();
    var L = shapesOf(current), own = [], out = null;
    current.polys.forEach(function (q, i) { if (q && q.id === p.id) own.push(i); });
    var inside = function (list, ll) {
      for (var j = 0; j < list.length; j++) if (inBounds(L.bounds[list[j]], ll) && d3.geoContains(L.geo[list[j]], ll)) return true;
      return false;
    };
    var other = function (ll) {
      for (var i = 0; i < current.polys.length; i++) { var q = current.polys[i]; if (q && q.id !== p.id && inBounds(L.bounds[i], ll) && d3.geoContains(L.geo[i], ll)) return true; }
      return false;
    };
    var list = cityRanked(now);
    for (var k = 0; k < list.length && !out; k++) {
      var c = list[k].c, ll = [c.lon, c.lat];
      if (inside(own, ll)) { out = c; break; }
      for (var a = 0; a < 8 && !out; a++) {
        var q = [c.lon + 0.1 * Math.cos(a * Math.PI / 4) / Math.max(0.2, Math.cos(c.lat * D2R)), c.lat + 0.1 * Math.sin(a * Math.PI / 4)];
        if (inside(own, q) && !other(ll)) out = c;
      }
    }
    bigCache.set(key, out);
    return out;
  }
  // Flags and languages come from Wikidata, by the Wikipedia article's item: the flag (P41) and the official
  // languages of the whole state (P37, not those of one part of it), whose dates hold at the date shown.
  var wdCache = new Map(), wdLabelCache = new Map();
  function wdGet(params) {
    return fetch("https://www.wikidata.org/w/api.php?format=json&origin=*&" + params).then(function (r) {
      if (!r.ok) throw new Error("wikidata " + r.status);
      return r.json();
    });
  }
  function wdTime(qs, end) {
    if (!qs || !qs[0] || !qs[0].datavalue) return null;
    var v = qs[0].datavalue.value, m = /^([+-]\d+)-(\d\d)-(\d\d)/.exec(v.time || "");
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3], pr = v.precision || 11;
    if (pr <= 9 || !mo) return end ? y + 0.999 : y;
    if (pr === 10 || !d) return y + (end ? mo : mo - 1) / 12;
    return y + ((mo - 1) * 30.44 + d - (end ? 0 : 1)) / 366;
  }
  function wdPick(claims, prop, at, whole) {
    var list = (claims[prop] || []).filter(function (c) {
      var q = c.qualifiers || {};
      return c.rank !== "deprecated" && c.mainsnak && c.mainsnak.datavalue && !(whole && (q.P518 || q.P3005));
    });
    var dated = [], open = [], later = [];
    list.forEach(function (c) {
      var q = c.qualifiers || {}, a = wdTime(q.P580, false), b = wdTime(q.P582, true);
      if (a === null && b === null) open.push(c);
      else if ((a === null || a <= at) && (b === null || at <= b)) dated.push(c);
      else if (a !== null && a > at) later.push(c);
    });
    // A whole state's official language that Wikidata dates from a later law (French in France from 1992) was
    // its language before too, so for languages those count when nothing else holds at the date.
    var use = dated.length ? dated : open.length ? open : whole ? later : [];
    var best = use.filter(function (c) { return c.rank === "preferred"; });
    return (best.length ? best : use).map(function (c) { return c.mainsnak.datavalue.value; });
  }
  // Wikidata's answers are kept in the browser for a week, only the statements the card reads, so a card
  // opened again asks nothing.
  var WD_KEEP = 7 * 864e5, WD_PROPS = ["P41", "P37", "P2936", "P571", "P576"];
  function wdStored(key) {
    try { var v = JSON.parse(localStorage.getItem(key) || "null"); return v && Date.now() - v.t < WD_KEEP ? v.d : undefined; } catch (e) { return undefined; }
  }
  function wdStore(key, d) {
    try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), d: d })); } catch (e) { }
  }
  function wdFacts(qid, at, chosen) {
    var job = wdCache.get(qid);
    if (!job) {
      var kept = wdStored("chronia-wd:" + qid);
      job = kept !== undefined ? Promise.resolve(kept) : wdGet("action=wbgetentities&props=claims&ids=" + encodeURIComponent(qid)).then(function (d) {
        var all = d && d.entities && d.entities[qid] && d.entities[qid].claims, claims = null;
        if (all) { claims = {}; WD_PROPS.forEach(function (k) { if (all[k]) claims[k] = all[k]; }); }
        wdStore("chronia-wd:" + qid, claims);
        return claims;
      });
      wdCache.set(qid, job);
      job.catch(function () { wdCache.delete(qid); });
    }
    return job.then(function (claims) {
      if (!claims) return null;
      // Nothing from an item for a date before it began or after it ended (Morocco's item is the state since
      // 1956), unless the article was chosen for these years (Italian Libya, whose item begins in 1934, for 1913).
      var born = wdTime(claims.P571, false), gone = wdTime(claims.P576, true);
      if (!chosen && ((born !== null && at < born) || (gone !== null && at > gone))) return null;
      var flags = wdPick(claims, "P41", at), langs = [];
      wdPick(claims, "P37", at, true).concat(langsUsed(claims, at)).forEach(function (v) { if (v.id && langs.indexOf(v.id) < 0) langs.push(v.id); });
      langs = langs.slice(0, 4);
      // Each line stands on its own: a flag that can't be fetched doesn't take the languages with it.
      var flag = flags.length ? flagThumb(flags[0]).catch(function () { return null; }) : null;
      return Promise.all([flag, wdLabels(langs).catch(function () { return []; })]).then(function (r) { return { flag: r[0], langs: r[1] }; });
    });
  }
  // Only when Wikidata gives no official language for the whole state (the United States has none): the
  // languages used that it ranks preferred, or else the one or two with the most speakers, or the only one it lists.
  function langsUsed(claims, at) {
    if (wdPick(claims, "P37", at, true).length) return [];
    var all = (claims.P2936 || []).filter(function (c) { var q = c.qualifiers || {}; return c.rank !== "deprecated" && c.mainsnak && c.mainsnak.datavalue && !q.P518 && !q.P3005; });
    var top = all.filter(function (c) { return c.rank === "preferred"; });
    if (!top.length) {
      var speakers = function (c) { var q = c.qualifiers && c.qualifiers.P1098; return q && q[0] && q[0].datavalue ? +q[0].datavalue.value.amount : 0; };
      top = all.filter(function (c) { return speakers(c) > 0; }).sort(function (a, b) { return speakers(b) - speakers(a); }).slice(0, 2);
    }
    if (!top.length && all.length === 1) top = all;
    return top.map(function (c) { return c.mainsnak.datavalue.value; });
  }
  function wdLabels(ids) {
    ids.forEach(function (q) { if (!wdLabelCache.has(q)) { var k = wdStored("chronia-wdl:" + q); if (k !== undefined) wdLabelCache.set(q, k); } });
    var need = ids.filter(function (q) { return !wdLabelCache.has(q); });
    var got = need.length ? wdGet("action=wbgetentities&props=labels&languages=en&ids=" + need.join("|")).then(function (d) {
      need.forEach(function (q) { var e = d && d.entities && d.entities[q], n = e && e.labels && e.labels.en ? e.labels.en.value : null; wdLabelCache.set(q, n); wdStore("chronia-wdl:" + q, n); });
    }) : Promise.resolve();
    return got.then(function () {
      return ids.map(function (q) { var n = wdLabelCache.get(q); return n ? n.charAt(0).toUpperCase() + n.slice(1) : null; }).filter(Boolean);
    });
  }
  // Wikimedia serves thumbnails from thumb.wikimedia.org and originals from upload.wikimedia.org.
  var WM_IMG = /^https:\/\/(upload|thumb)\.wikimedia\.org\//;

  // The note's picture, opened large (the lightbox): Wikipedia's original when it is at most LIGHTBOX_W wide, or else its
  // thumbnail at that width (one of Wikimedia's standard sizes), shown over the small one already loaded until it comes.
  // The caption links to the picture's own page on Wikipedia, which gives its author, source, and licence.
  var LIGHTBOX_W = 1280, picture = null, lightbox = $("lightbox"), lightImg = $("lightbox-img"), lightBack = null;
  function largePicture(p) {
    var o = p.original;
    if (o && o.source && WM_IMG.test(o.source) && (!o.width || o.width <= LIGHTBOX_W)) return o.source;
    var m = /\/(\d+)px-[^/]+$/.exec(p.thumb);
    if (m && +m[1] < LIGHTBOX_W) return p.thumb.replace(/\/\d+px-([^/]+)$/, "/" + LIGHTBOX_W + "px-$1");
    return o && o.source && WM_IMG.test(o.source) ? o.source : p.thumb;
  }
  function pictureFile(p) {
    var src = p.original && p.original.source || p.thumb;
    var m = /\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)\/[^/]+$/.exec(src) || /\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)$/.exec(src);
    return m ? decodeURIComponent(m[1]) : null;
  }
  function openPicture() {
    if (!picture) return;
    var p = picture, big = largePicture(p), file = pictureFile(p), src = $("lightbox-src");
    lightBack = document.activeElement;
    lightImg.onerror = null;
    lightImg.src = p.thumb;
    lightImg.alt = p.title;
    if (big !== p.thumb) {
      var pre = new Image();
      pre.onload = function () { if (picture === p && !lightbox.hidden) lightImg.src = big; };
      pre.onerror = function () {
        var o = p.original && p.original.source;
        if (o && o !== big && WM_IMG.test(o) && picture === p && !lightbox.hidden) lightImg.src = o;
      };
      pre.src = big;
    }
    $("lightbox-cap").textContent = p.title;
    if (file) { src.href = "https://en.wikipedia.org/wiki/File:" + encodeURIComponent(file.replace(/ /g, "_")); src.hidden = false; }
    else src.hidden = true;
    lightbox.hidden = false;
    $("lightbox-close").focus();
  }
  function closePicture() {
    if (!lightbox || lightbox.hidden) return false;
    lightbox.hidden = true;
    lightImg.removeAttribute("src");
    if (lightBack && lightBack.focus && document.contains(lightBack)) lightBack.focus();
    lightBack = null;
    return true;
  }
  $("wiki-zoom").addEventListener("click", openPicture);
  $("lightbox-close").addEventListener("click", closePicture);
  lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closePicture(); });
  // Esc closes the picture before anything else; Tab stays between the link and the close button.
  lightbox.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closePicture(); return; }
    if (e.key === "Tab") {
      var stops = [$("lightbox-src"), $("lightbox-close")].filter(function (el) { return !el.hidden; });
      var i = stops.indexOf(document.activeElement);
      e.preventDefault();
      stops[(i + (e.shiftKey ? stops.length - 1 : 1)) % stops.length].focus();
      return;
    }
    e.stopPropagation();
  });
  var flagCache = new Map();
  function flagThumb(file) {
    if (flagCache.has(file)) return flagCache.get(file);
    var job = fetch("https://en.wikipedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&iiurlheight=40&format=json&origin=*&titles=" + encodeURIComponent("File:" + file)).then(function (r) {
      if (!r.ok) throw new Error("flag " + r.status);
      return r.json();
    }).then(function (d) {
      var pages = d && d.query && d.query.pages, url = null;
      for (var k in pages) { var ii = pages[k].imageinfo; if (ii && ii[0]) url = ii[0].thumburl || ii[0].url; }
      return url && WM_IMG.test(url) ? url : null;
    });
    flagCache.set(file, job);
    job.catch(function () { flagCache.delete(file); });
    return job;
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
        out.push({ name: polityNameL(q.id), w: q.label ? q.label[5] : 0 });
      });
    });
    return out.sort(function (a, b) { return b.w - a.w; }).slice(0, 10).map(function (x) { return x.name; });
  }
  function blurbFetch(ask, peek) {
    if (LANG !== "en" && !ask.lang) ask = Object.assign({}, ask, { lang: LANG });
    var k = JSON.stringify(ask), have = blurbCache.get(k);
    if (have) return have;
    var ctl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, BLURB_WAIT) : 0;
    // An account with Premium sends its session with a note to be written, for its doubled count; a peek counts nothing.
    var paid = !peek && typeof premium === "object" && premium && premium.on && typeof reportToken === "function";
    var job = (paid ? reportToken().catch(function () { return null; }) : Promise.resolve(null)).then(function (t) {
      var headers = { "Content-Type": "application/json" };
      if (t) headers.Authorization = "Bearer " + t;
      return fetch(BLURB_URL, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(peek ? Object.assign({ peek: true }, ask) : ask),
        signal: ctl ? ctl.signal : undefined
      });
    }).then(function (r) {
      if (r.status === 429) return r.json().then(function (d) { if (d && (d.error === "limit" || d.error === "cap")) blurbStop = { error: d.error, cap: d.cap }; return null; }, function () { return null; });
      return r.ok ? r.json() : null;
    }).then(function (d) {
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
  // The same article in the reader's own Wikipedia, through English Wikipedia's language links (since 25 November 2026;
  // until then a card in another language showed the English article's opening). Null where that Wikipedia has none, and
  // the card keeps the English one. Chinese asks for simplified characters, as the atlas writes them.
  var wikiLocalCache = new Map();
  function wikiLocal(title) {
    if (LANG === "en" || !title) return Promise.resolve(null);
    if (wikiLocalCache.has(title)) return wikiLocalCache.get(title);
    var job = fetch("https://en.wikipedia.org/w/api.php?action=query&prop=langlinks&redirects=1&format=json&origin=*&lllang=" + LANG + "&titles=" + encodeURIComponent(title)).then(function (r) {
      if (!r.ok) throw new Error("wikipedia links " + r.status);
      return r.json();
    }).then(function (d) {
      var pages = d && d.query && d.query.pages, t = null;
      if (pages) Object.keys(pages).forEach(function (k) { var l = pages[k].langlinks; if (l && l[0] && l[0]["*"]) t = l[0]["*"]; });
      if (!t) return null;
      var opts = LANG === "zh" ? { headers: { "Accept-Language": "zh-Hans" } } : undefined;
      return fetch("https://" + LANG + ".wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(t.replace(/ /g, "_")) + "?redirect=true", opts).then(function (r) {
        return r.ok ? r.json() : null;
      }).then(function (x) { return x && x.type !== "disambiguation" && x.extract ? x : null; });
    }).catch(function () { wikiLocalCache.delete(title); return null; });
    wikiLocalCache.set(title, job);
    return job;
  }
  var WIKI_LINK = /^https:\/\/[a-z-]+\.wikipedia\.org\//;
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
  // The Sources section at the end of a state's or a people's card (see the README's "Sources on the card"): where its borders,
  // its dates, its name, and the card's text come from, and the ledger's notes on it. Each row of the data has a code for a
  // key "borders|name|dates" (eras.json's srcKeys), and eras.json's sources gives each part its phrase and its sources. The
  // ledger's notes are in data/sources.json, fetched the first time the section is opened. Everything is set as text, never
  // as HTML. A card whose data has no codes (an older file) has no section.
  var srcNotes = null, srcNotesLoad = null, srcNotesFailed = false, srcOpen = false, srcCtx = null;
  function polySrc(p) {
    var k = p && srcKeys && srcInfo && p.sk >= 0 && srcKeys[p.sk] ? srcKeys[p.sk].split("|") : null;
    return k && srcInfo.borders[k[0]] && srcInfo.name[k[1]] && srcInfo.dates[k[2]] ? k : null;
  }
  // The notes that name the polity, or the table its borders come from, and whose years hold the year.
  function notesFor(name, tag, year, notes) {
    return notes.filter(function (n) { return n.from <= year && year <= n.to && (n.names.indexOf(name) >= 0 || (n.tags || []).indexOf(tag) >= 0); });
  }
  function srcLink(href, text) {
    var a = document.createElement("a");
    a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = text;
    return a;
  }
  // Text with each of the sources' names that has a link made into one.
  function srcPhrase(el, text, ids) {
    var marks = (ids || []).map(function (id) { return srcInfo.sources[id]; }).filter(function (x) { return x && x.url && /^https:\/\//.test(x.url) && text.indexOf(x.label) >= 0; });
    var rest = text;
    while (rest) {
      var first = null, at = -1;
      marks.forEach(function (m) { var i = rest.indexOf(m.label); if (i >= 0 && (at < 0 || i < at)) { at = i; first = m; } });
      if (!first) break;
      if (at) el.appendChild(document.createTextNode(rest.slice(0, at)));
      el.appendChild(srcLink(first.url, first.label));
      rest = rest.slice(at + first.label.length);
    }
    if (rest) el.appendChild(document.createTextNode(rest));
  }
  // Text with its web addresses made into links.
  function srcPlain(el, text) {
    String(text).split(/(https:\/\/[^\s<>"]*[^\s<>".,;:)\]])/).forEach(function (part, i) {
      if (!part) return;
      if (i % 2) el.appendChild(srcLink(part, part)); else el.appendChild(document.createTextNode(part));
    });
  }
  // The sources that the About panel once listed in one paragraph, given instead on the cards they bear on (Noah's request,
  // 18 November 2026): the land and its relief on every state's card, a division's or a zone of control's source when the
  // card was opened by a click inside one, and the city sources on a city's card. The full list, with the licences, is on
  // the More info page, which the About panel links to.
  var SRC = {
    ne: ["Natural Earth", "https://www.naturalearthdata.com/"],
    terrain: ["Terrain Tiles", "https://registry.opendata.aws/terrain-tiles/"],
    cbs: ["Statistics Netherlands", "https://www.cbs.nl/"],
    ahcb: ["the Newberry Library’s Atlas of Historical County Boundaries", "https://digital.newberry.org/ahcb/"],
    geonames: ["GeoNames", "https://www.geonames.org/"],
    reba: ["Reba, Reitsma, and Seto", "https://doi.org/10.1038/sdata.2016.34"],
    hanson: ["J. W. Hanson", "https://oxrep.web.ox.ac.uk/cities-database"],
    hb: ["historical-basemaps", "https://github.com/aourednik/historical-basemaps"]
  };
  // A war's own links, beside the source its file names.
  var SRC_WAR = {
    syria: [["Wikipedia’s town map of Syria", "https://en.wikipedia.org/wiki/Module:Syrian_Civil_War_detailed_map"]],
    ukraine: [["Wikipedia’s town map of Ukraine", "https://en.wikipedia.org/wiki/Module:Russo-Ukrainian_war_detailed_map"]],
    israel: [["Wikipedia’s town map of Israel and Palestine", "https://en.wikipedia.org/wiki/Module:Israeli-Palestinian_conflict_detailed_map"]],
    mexico: [["OCVED", "https://github.com/javierosorio/OCVED_2.0"]],
    civilwar: [["the Coast Survey’s sketches of the rebellion", "https://commons.wikimedia.org/wiki/File:Historical_sketch_of_the_rebellion._LOC_99447101.jpg"], ["the Army’s American Military History", "https://archive.org/details/cmh-pub-30-21-nsia"]]
  };
  // A line's text from plain strings and [label, address] pairs, the pairs made into links.
  function srcRich(el, parts) {
    parts.forEach(function (x) { if (typeof x === "string") el.appendChild(document.createTextNode(T(x))); else el.appendChild(srcLink(x[1], T(x[0]))); });
  }
  // The list's words: "A", "A and B", "A, B, and C".
  function srcList(items) {
    var out = [];
    items.forEach(function (x, i) { if (i) out.push(i === items.length - 1 ? (items.length > 2 ? T(", and ") : T(" and ")) : T(", ")); out.push(x); });
    return out;
  }
  // The Low Countries, where the coasts and the polders are drawn from their own sources.
  function lowCountries(ll) { return !!ll && ll[0] > 2.4 && ll[0] < 7.3 && ll[1] > 50.6 && ll[1] < 53.7; }
  function srcLine(label, cls) {
    var el = document.createElement("p"), b = document.createElement("span");
    el.className = "ch-src-line" + (cls ? " " + cls : "");
    b.className = "ch-fact-label"; b.textContent = T("{label}: ", { label: T(label) });
    el.appendChild(b);
    return el;
  }
  function renderSources(p, name, year) {
    var box = $("src"), body = $("src-body"), k = polySrc(p);
    srcCtx = null;
    body.textContent = "";
    if (!k) { box.hidden = true; return; }
    var B = srcInfo.borders[k[0]], N = srcInfo.name[k[1]], D = srcInfo.dates[k[2]];
    // "The source's own name" names the source: "Cliopatria's own name".
    var first = srcInfo.sources[B.ids[0]], owner = LANG !== "en" ? "The source’s" : first ? first.label + (/s$/.test(first.label) ? "’" : "’s") : "The source’s";
    var own = function (t) { return t.replace(/^The source’s/, owner); };
    var borders = srcLine(p.people ? "Extent" : "Borders");
    srcPhrase(borders, T(B.text), B.ids);
    var dates = srcLine("Dates");
    srcPhrase(dates, own(T(D.text)), B.ids.concat(D.ids));
    var nm = srcLine("Name");
    srcPhrase(nm, own(T(N.text)), k[1] === "source" ? B.ids : N.ids);
    // Filled in by srcText once Wikipedia has answered with an article of the same name: never from the guess at its title.
    var same = document.createElement("span");
    if (k[1] === "editors") nm.appendChild(same);
    var land = srcLine("Land");
    srcRich(land, [SRC.ne, "’s coasts, lakes, and rivers, with relief from ", SRC.terrain]);
    if (lowCountries(divClick && insidePolity(divClick, p.id) ? divClick : p.label ? [p.label[0], p.label[1]] : null)) srcRich(land, ["; the medieval coasts from Deltares and the Rijksdienst voor het Cultureel Erfgoed, and the polders from ", SRC.cbs]);
    land.appendChild(document.createTextNode("."));
    // Filled in by srcDivision when the card names the division that was clicked.
    var division = srcLine("Division");
    division.hidden = true;
    // The point last clicked, if it lies in this state: a card opened from search keeps no stale point from before.
    var zone = null, held = divClick && insidePolity(divClick, p.id) ? controlInfoAt(divClick) : null;
    if (held) {
      zone = srcLine("Zone of control");
      zone.appendChild(document.createTextNode(T(held.name) + ": "));
      srcPlain(zone, held.source.replace(/\.?$/, "."));
      if (SRC_WAR[held.key]) { zone.appendChild(document.createTextNode(T(" See "))); srcRich(zone, srcList(SRC_WAR[held.key])); zone.appendChild(document.createTextNode(".")); }
    }
    var text = srcLine("Text");
    text.hidden = true;
    var quiet = document.createElement("p");
    quiet.className = "ch-src-quiet";
    quiet.textContent = T("Where a neighbour is drawn from another source, the line between them may follow the neighbour’s.");
    var notes = document.createElement("div");
    notes.className = "ch-src-notes";
    var report = document.createElement("button");
    report.type = "button"; report.className = "ch-src-report"; report.textContent = T("Report a problem");
    var at = p.label ? [p.label[0], p.label[1]] : [view.lon, view.lat];
    report.addEventListener("click", function () { reportAbout(name, at[0], at[1]); });
    [borders, dates, nm, land, division, zone, text, quiet, notes, report].forEach(function (el) { if (el) body.appendChild(el); });
    srcCtx = { name: name, tag: k[0], year: year, text: text, notes: notes, same: same, division: division };
    box.hidden = false;
    box.open = srcOpen;
    if (srcOpen) fillNotes();
  }
  // The Division line, for the division the card names: the United States' states and territories from the Newberry
  // Library's atlas, the others from Natural Earth's states and provinces under the names of their time.
  function srcDivision(reg) {
    var el = srcCtx && srcCtx.division;
    if (!el) return;
    var label = el.firstChild;
    el.textContent = ""; el.appendChild(label);
    el.hidden = !reg;
    if (!reg) return;
    if (reg === "us") srcRich(el, [SRC.ahcb, ", which dates every change to a state’s or territory’s boundary to the day."]);
    else srcRich(el, [SRC.ne, "’s states and provinces, under the names of their time, dated by the editors."]);
  }
  // The Sources section on a city's card. The city data does not record which source gave each city, so the lines name
  // the sources that cover its region and its time: Hanson for the Greek and Roman world before 600, the census for the
  // United States from 1790, the UN from 1950, and Reba, Reitsma, and Seto's compilation of Chandler and Modelski
  // throughout.
  function renderCitySources(c, f, year, name) {
    var box = $("src"), body = $("src-body");
    srcCtx = null;
    body.textContent = "";
    var classical = c.lon > -10 && c.lon < 45 && c.lat > 22 && c.lat < 56, roman = classical && year < 600;
    var us = c.lon > -125 && c.lon < -66 && c.lat > 24 && c.lat < 50 && year >= 1790;
    // A city that is gone (an end year) is known from Hanson, historical-basemaps' dated places, or the editors' tables;
    // one that stands today is placed by GeoNames and Natural Earth, and named by date from the editors' tables.
    // A capital that is in no city file is placed by the capitals' table, from Wikidata and the editors.
    var gone = c.until != null && isFinite(c.until), place = srcLine(gone ? "Where it stood" : "Where it stands"), nm = null;
    if (c.id == null) place.appendChild(document.createTextNode(T("The capitals’ table, from Wikidata and the editors.")));
    else if (gone) srcRich(place, (classical && (c.since == null || c.since < 600) ? [SRC.hanson, " (with the Barrington Atlas’s names), "] : []).concat([SRC.hb, "’ dated places, or the editors’ own tables of places the sources lack."]));
    else {
      srcRich(place, srcList([SRC.geonames, SRC.ne]).concat(["’s populated places."]));
      nm = srcLine("Name");
      if (f.modern && f.name !== f.modern) {
        if (roman) srcRich(nm, ["The Barrington Atlas’s name, through ", SRC.hanson, "."]);
        else nm.appendChild(document.createTextNode(T("The name an English-language atlas of the time would print, from the editors’ table of names by date.")));
      } else srcRich(nm, [SRC.geonames, "."]);
    }
    var pop = srcLine("Population"), from = [SRC.reba, " (Chandler’s and Modelski’s estimates)"];
    if (roman) from.push(", ", SRC.hanson, "’s Cities Database");
    if (us) from.push(", the United States census through Historical U.S. City Populations");
    if (year >= 1950) from.push(", the UN’s World Urbanization Prospects");
    from.push(", and the editors’ tables, by which the map ranks the cities it shows.");
    srcRich(pop, from);
    var same = document.createElement("span");
    var text = srcLine("Text");
    text.hidden = true;
    var report = document.createElement("button");
    report.type = "button"; report.className = "ch-src-report"; report.textContent = T("Report a problem");
    report.addEventListener("click", function () { reportAbout(name, c.lon, c.lat); });
    [place, nm, pop, text, report].forEach(function (el) { if (el) body.appendChild(el); });
    srcCtx = { name: name, text: text, notes: null, same: same, division: null };
    box.hidden = false;
    box.open = srcOpen;
  }
  // The Text line, set when the card's text is: Wikipedia's extract, or a note a language model wrote.
  function srcText(mode, wiki, loc) {
    if (!srcCtx) return;
    var el = srcCtx.text, label = el.firstChild;
    srcCtx.same.textContent = wiki && wiki.title === srcCtx.name ? T(", matching Wikipedia’s article title") : "";
    if (loc) wiki = loc;
    el.textContent = ""; el.appendChild(label);
    if (mode === "done") el.appendChild(document.createTextNode(T("A note written by a language model from the card’s facts and the date; it can be wrong.")));
    else if (mode !== "ai" && wiki && wiki.extract) {
      var href = wiki.content_urls && wiki.content_urls.desktop && wiki.content_urls.desktop.page;
      el.appendChild(document.createTextNode(T("Wikipedia, “")));

      if (href && WIKI_LINK.test(href)) el.appendChild(srcLink(href, wiki.title || srcCtx.name)); else el.appendChild(document.createTextNode(wiki.title || srcCtx.name));
      el.appendChild(document.createTextNode("”"));
    } else { el.hidden = true; return; }
    el.hidden = false;
  }
  function fillNotes() {
    var ctx = srcCtx;
    if (!ctx || !ctx.notes) return;
    var say = function (t) { ctx.notes.textContent = ""; var q = document.createElement("p"); q.className = "ch-src-quiet"; q.textContent = t; ctx.notes.appendChild(q); };
    if (srcNotesFailed) { say(T("The editors’ notes could not be loaded.")); return; }
    if (!srcNotes) {
      say(T("Looking up the editors’ notes"));
      if (!srcNotesLoad) srcNotesLoad = fetchJSON("data/sources.json").then(function (d) { srcNotes = d && Array.isArray(d.notes) ? d.notes : []; }, function () { srcNotesFailed = true; }).then(function () { if (srcCtx && $("src").open) fillNotes(); });
      return;
    }
    var mine = notesFor(ctx.name, ctx.tag, ctx.year, srcNotes);
    if (!mine.length) { say(T("The editors’ ledger has no note on it at this date.")); return; }
    ctx.notes.textContent = "";
    ctx.notes.appendChild(srcLine("Editors’ notes", "ch-src-notes-head"));
    mine.forEach(function (n) {
      var t = document.createElement("p"), ol = document.createElement("ol");
      t.className = "ch-src-note-title"; t.textContent = n.title;
      n.sources.forEach(function (x) { var li = document.createElement("li"); srcPlain(li, x); ol.appendChild(li); });
      ctx.notes.appendChild(t); ctx.notes.appendChild(ol);
    });
  }
  $("src").addEventListener("toggle", function () { srcOpen = $("src").open; if (srcOpen) fillNotes(); });
  function loadWiki(name, title, blurb, at) {
    var ask = ++wikiAsk, text = $("wiki-text"), img = $("wiki-img"), zoom = $("wiki-zoom"), more = $("wiki-more"), by = $("wiki-by");
    var wiki = null, wikiLoc = null, wikiState = 0, mode = blurb ? "ai" : "wiki", shownName = $("card-name").textContent;
    var quiet = function (t) { text.className = "ch-wiki-text is-quiet"; text.removeAttribute("lang"); text.textContent = t; };
    var paint = function () {
      if (ask !== wikiAsk) return;
      srcText(mode, wiki, wikiLoc);
      var W = wikiLoc || wiki;
      if (wiki) {
        if (wiki.thumbnail && wiki.thumbnail.source && WM_IMG.test(wiki.thumbnail.source)) {
          img.src = wiki.thumbnail.source; zoom.hidden = false;
          picture = { thumb: wiki.thumbnail.source, original: wiki.originalimage, title: wiki.title || name };
        } else { zoom.hidden = true; picture = null; }
        var href = W.content_urls && W.content_urls.desktop && W.content_urls.desktop.page;
        if (href && WIKI_LINK.test(href)) {
          $("wiki-link").href = href;
          $("wiki-link").textContent = W.title && W.title !== name && W.title !== shownName ? T("Read “{title}” on Wikipedia", { title: W.title }) : T("Read more on Wikipedia");
          more.hidden = false;
        } else more.hidden = true;
      } else { zoom.hidden = true; more.hidden = true; picture = null; }
      if (mode === "ai" || mode === "done") return;
      if (wikiState === 0) quiet(T("Looking it up on Wikipedia"));
      else if (wikiState === 2) {
        quiet(T("Wikipedia could not be reached.") + " ");
        var again = document.createElement("button");
        again.type = "button";
        again.className = "ch-wiki-again";
        again.textContent = T("Try again");
        again.addEventListener("click", function () { if (ask === wikiAsk) loadWiki(name, title, blurb, at); });
        text.appendChild(again);
      }
      else if (!wiki) quiet(T(at ? "Wikipedia has no article on this place." : "Wikipedia has no article under this name."));

      else { text.className = "ch-wiki-text"; text.textContent = W.extract; text.lang = wikiLoc ? (LANG === "zh" ? "zh-Hans" : LANG) : "en"; }
    };
    var writing = function (job) {
      mode = "ai";
      by.hidden = true;
      quiet("");
      text.classList.add("is-writing");
      var tick = loadingDots(text, function () { return ask === wikiAsk && mode === "ai"; });
      job.then(function (t) {
        clearInterval(tick);
        if (ask !== wikiAsk) return;
        if (t) {
          mode = "done";
          text.className = "ch-wiki-text";
          text.textContent = t;
          by.textContent = "";
          by.hidden = true;
        } else {
          mode = "wiki";
          blurbStopShow(by);
          by.hidden = !blurbStop;
        }
        paint();
      });
    };
    var offer = function () {
      mode = "offer";
      by.textContent = "";
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ch-wiki-ask";
      b.textContent = T("Write about {name} in {year}", { name: blurb.label, year: blurb.when });
      b.addEventListener("click", function () { if (ask === wikiAsk) writing(blurbFetch(blurb.ask)); });
      by.appendChild(b);
      by.hidden = false;
    };
    clearTimeout(blurbTimer);
    zoom.hidden = true; more.hidden = true; by.hidden = true; picture = null;
    var key = at ? title + "@" + at[0].toFixed(2) + "," + at[1].toFixed(2) : title, job = wikiCache.get(key);
    if (!job) {
      if (at) job = wikiSummary(title).then(function (d) { return nearPage(d, at) || (title !== name ? wikiSummary(name).then(function (e) { return nearPage(e, at); }) : null); }).then(function (d) { return d || wikiSearchNear(name, at); });
      else job = wikiSummary(title).then(function (d) { return d || (title !== name ? wikiSummary(name) : null); }).then(function (d) { return d || wikiSearch(name); });
      wikiCache.set(key, job);
      job.catch(function () { wikiCache.delete(key); });
    }
    job.then(function (d) {
      if (!d || LANG === "en") return d;
      return wikiLocal(d.title).then(function (l) { wikiLoc = l; return d; });
    }).then(function (d) { wiki = d; wikiState = 1; paint(); }, function () { wikiState = 2; paint(); });
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
  var aboutTip = $("about-tip"), aboutHead = $("head"), aboutOff = 0;
  function aboutNear(x, y) {
    return [aboutHead, aboutTip].some(function (el) {
      var r = el.getBoundingClientRect();
      return r.width > 0 && x >= r.left - 24 && x <= r.right + 24 && y >= r.top - 24 && y <= r.bottom + 24;
    });
  }
  function aboutUnhover() {
    clearTimeout(aboutOff);
    about.classList.remove("is-hover");
    if (!about.contains(document.activeElement)) about.classList.remove("is-shut");
  }
  aboutBtn.addEventListener("mouseenter", function () {
    if (!canHover) return;
    clearTimeout(aboutOff);
    if (!about.classList.contains("is-hover") && !about.contains(document.activeElement)) about.classList.remove("is-shut");
    about.classList.add("is-hover");
  });
  document.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse" || !about.classList.contains("is-hover")) return;
    clearTimeout(aboutOff);
    if (!aboutNear(e.clientX, e.clientY)) aboutOff = setTimeout(aboutUnhover, 200);
  });
  document.documentElement.addEventListener("mouseleave", aboutUnhover);
  about.addEventListener("focusout", function (e) { if (!about.contains(e.relatedTarget)) about.classList.remove("is-shut"); });
  document.addEventListener("pointerdown", function (e) {
    if (about.classList.contains("is-open") && !about.contains(e.target)) {
      about.classList.remove("is-open");
      aboutBtn.setAttribute("aria-expanded", "false");
    }
  });

  var STORE_LAYERS = "chronia-layers";
  var layers = { states: true, capitals: true, cities: true, seas: true, water: true, relief: true, grid: true, subdivisions: true, control: false, safe: false };
  var langSel = $("lang-select"), LANGS = window.CH_LANGS || { en: "English" };
  if (LANG !== "en") langSel.parentNode.querySelector("legend").textContent = T("Language") + " | Language";
  Object.keys(LANGS).forEach(function (k) { var o = document.createElement("option"); o.value = k; o.textContent = LANGS[k]; o.lang = k; if (k === LANG) o.selected = true; langSel.appendChild(o); });
  langSel.addEventListener("change", function () {
    try { localStorage.setItem("lang", langSel.value); } catch (e) {}
    var u = new URL(location.href);
    u.searchParams.delete("lang");
    location.replace(u.href);
  });
  var menuBtn = $("menu-btn"), ctlsBox = $("ctls");
  function setMenu(open) {
    ctlsBox.classList.toggle("ch-menu-open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  menuBtn.addEventListener("click", function (e) { e.stopPropagation(); setMenu(!ctlsBox.classList.contains("ch-menu-open")); });
  $("ctl-set").addEventListener("click", function () { setMenu(false); });
  document.addEventListener("pointerdown", function (e) { if (ctlsBox.classList.contains("ch-menu-open") && !$("ctl-set").contains(e.target) && !menuBtn.contains(e.target)) setMenu(false); }, true);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && ctlsBox.classList.contains("ch-menu-open")) { setMenu(false); menuBtn.focus(); } });
  phoneQuery.addEventListener("change", function () { setMenu(false); });
  var layersBtn = $("layers-btn"), layersPanel = $("layers");
  try {
    var savedLayers = JSON.parse(localStorage.getItem(STORE_LAYERS) || "{}");
    Object.keys(layers).forEach(function (k) { if (typeof savedLayers[k] === "boolean") layers[k] = savedLayers[k]; });
  } catch (e) {}
  // The colour-blind safe colours are a second set of the ten in app.css, under data-ch-palette="safe".
  function applyPaletteChoice() {
    if (layers.safe) document.documentElement.setAttribute("data-ch-palette", "safe");
    else document.documentElement.removeAttribute("data-ch-palette");
  }
  applyPaletteChoice();
  function syncLayerInputs() {
    layersPanel.querySelectorAll("input[data-layer]").forEach(function (el) { el.checked = !!layers[el.getAttribute("data-layer")]; });
  }
  function setLayer(name, on) {
    if (!(name in layers)) return false;
    layers[name] = !!on;
    syncLayerInputs();
    try { localStorage.setItem(STORE_LAYERS, JSON.stringify(layers)); } catch (e) {}
    if (name === "safe") { applyPaletteChoice(); readPalette(); bandKey = ""; }
    syncKey();
    syncWars();
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
  // Saving: a picture of the view as it is, and a timelapse video of it over a range of dates, framed as
  // the screen is. Each frame is the map drawn for one date, once everything that date needs has loaded,
  // with the date in a frame at the top as the page shows it, and the name in the corner. The video is
  // H.264 in an MP4 file, encoded by the browser (WebCodecs) and packed into the file by mp4Pack below.
  var saveBtn = $("save-btn"), savePanel = $("save"), saveNote = $("tl-note"), saveMake = $("tl-make"), saveProg = $("tl-prog"), saveBar = $("tl-bar"), saveCount = $("tl-count");
  var tlFrom = $("tl-from"), tlTo = $("tl-to"), tlStep = $("tl-step"), tlFps = $("tl-fps");
  var exporting = null, TL_MAX_YEARS = 500, VIDEO_MAX_W = 4096, VIDEO_MAX_H = 2304, VIDEO_MAX_AREA = 4096 * 2160, HOLD_S = 1;
  var canVideo = typeof window.VideoEncoder === "function" && typeof window.VideoFrame === "function";
  function setSaveOpen(open, focusBtn) {
    if (!open && exporting) return;
    savePanel.hidden = !open;
    saveBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      if (!layersPanel.hidden) setLayersOpen(false, false);
      if (about.classList.contains("is-open")) setAbout(false);
      if (!tlFrom.value) {
        var y = yearOf(now);
        tlFrom.value = fmtYear(Math.max(FIRST_T, y - 100 === 0 ? -1 : y - 100));
        tlTo.value = fmtYear(y);
      }
      checkTimelapse();
      $("save-image").focus();
    } else if (focusBtn) saveBtn.focus();
  }
  saveBtn.addEventListener("click", function () { setSaveOpen(savePanel.hidden, false); });
  document.addEventListener("pointerdown", function (e) {
    if (!savePanel.hidden && !exporting && !savePanel.contains(e.target) && !saveBtn.contains(e.target)) setSaveOpen(false, false);
  });
  savePanel.addEventListener("focusout", function (e) {
    if (!savePanel.hidden && !exporting && e.relatedTarget && !savePanel.contains(e.relatedTarget) && e.relatedTarget !== saveBtn) setSaveOpen(false, false);
  });
  window.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || savePanel.hidden) return;
    e.stopPropagation();
    if (exporting) exporting.cancel = true; else setSaveOpen(false, true);
  }, true);
  savePanel.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || /^[pPoOmM+=_−/-]$/.test(e.key)) e.stopPropagation();
  });

  // Reports of errors on the map, from anyone signed in with Google: a place chosen on the map, a stretch of
  // time, and a note, sent to the chronia-report function, which keeps up to 50 a day from each account.
  // Signing in uses Google's own button on the page (an ID token the function trades with Supabase for a
  // session), or, where Google's script can't load, Supabase's sign-in page, which comes back here with the
  // session in the address; the map's date and view are kept in the tab while it goes.
  var REPORT_URL = "https://jvcmeuqlyygpwelmvxuv.supabase.co/functions/v1/chronia-report", REPORT_AUTH = "https://jvcmeuqlyygpwelmvxuv.supabase.co/auth/v1";
  var REPORT_STORE = "chronia-auth", REPORT_BACK = "chronia-auth-back", GOOGLE_CLIENT = "396377978550-hnmvoi4lkdovg00o0vat20ckslml6l1m.apps.googleusercontent.com";
  var reportBtn = $("report-btn"), reportPanel = $("report"), reportLock = $("report-lock"), reportForm = $("report-form");
  var reportLockNote = $("report-lock-note"), reportGoogle = $("report-google"), reportGsi = $("report-gsi");
  var reportWhere = $("report-where"), reportPick = $("report-pick"), reportFrom = $("report-from"), reportTo = $("report-to");
  var reportNote = $("report-note"), reportLine = $("report-note-line"), reportSend = $("report-send"), reportWho = $("report-who");
  var reportPicking = false, reportPlace = null, reportBusy = false, reportSession = null, reportMe = null, reportRefreshing = null, gsiState = 0, gsiNonce = "", reportBackOpen = false;
  try { reportSession = JSON.parse(localStorage.getItem(REPORT_STORE) || "null"); } catch (e) {}
  if (!reportSession || typeof reportSession.a !== "string" || typeof reportSession.r !== "string") reportSession = null;
  function claimsOf(token) {
    try {
      var p = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p), function (ch) { return ch.charCodeAt(0); }))) || {};
    } catch (e) { return {}; }
  }
  function keepReportSession(a, r) {
    reportSession = a ? { a: a, r: r, e: (+claimsOf(a).exp || 0) * 1000 } : null;
    if (!a) reportMe = null;
    try { if (reportSession) localStorage.setItem(REPORT_STORE, JSON.stringify(reportSession)); else localStorage.removeItem(REPORT_STORE); } catch (e) {}
    // Signed in on the way to buying Premium (signinForPremium): back to its page.
    var toPremium = false;
    try { toPremium = !!a && sessionStorage.getItem("chronia-premium-back") === "1"; if (toPremium) sessionStorage.removeItem("chronia-premium-back"); } catch (e) {}
    if (toPremium) { location.assign("premium/"); return; }
    syncReport();
  }
  (function takeSignIn() {
    var h = location.hash;
    if (!/^#(.*&)?(access_token|error_description)=/.test(h)) return;
    var q = new URLSearchParams(h.slice(1)), back = "";
    try { back = sessionStorage.getItem(REPORT_BACK) || ""; sessionStorage.removeItem(REPORT_BACK); } catch (e) {}
    try { history.replaceState(null, "", location.pathname + back); } catch (e) {}
    reportBackOpen = true;
    if (q.get("access_token") && q.get("refresh_token")) keepReportSession(q.get("access_token"), q.get("refresh_token"));
    else setTimeout(function () { reportLockNote.textContent = T("Signing in did not work: {why}.", { why: q.get("error_description") || T("try again") }); }, 0);
  })();
  function reportPost(body, token) {
    var headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = "Bearer " + token;
    return fetch(REPORT_URL, { method: "POST", headers: headers, body: JSON.stringify(body) }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (j) { return { status: res.status, body: j }; });
    });
  }
  function reportToken() {
    try {
      var kept = JSON.parse(localStorage.getItem(REPORT_STORE) || "null");
      if (reportSession && !reportRefreshing && kept && typeof kept.a === "string" && typeof kept.r === "string" && kept.r !== reportSession.r) reportSession = kept;
    } catch (e) {}
    var s = reportSession;
    if (!s) return Promise.resolve(null);
    if (s.e - Date.now() > 60000) return Promise.resolve(s.a);
    if (reportRefreshing) return reportRefreshing;
    reportRefreshing = reportPost({ action: "refresh", refresh_token: s.r }).then(function (r) {
      if (r.status === 401) { keepReportSession(null); return null; }
      if (r.status !== 200) throw new Error("refresh " + r.status);
      keepReportSession(r.body.access_token, r.body.refresh_token);
      return r.body.access_token;
    });
    reportRefreshing.then(function () { reportRefreshing = null; }, function () { reportRefreshing = null; });
    return reportRefreshing;
  }
  function reportAsk(body) {
    return reportToken().then(function (t) {
      if (!t) return { status: 401, body: { error: "signin" } };
      return reportPost(body, t);
    }).then(function (r) { if (r.status === 401) keepReportSession(null); return r; });
  }
  function showWho() {
    if (!reportMe) { reportWho.textContent = T("Signed in"); return; }
    // The count of reports left today is not shown (Noah, 19 November 2026); the limit still holds, and the function
    // says so when it is reached.
    reportWho.textContent = T("Signed in as {name}", { name: reportMe.name });
  }
  function loadMe() {
    reportAsk({ action: "me" }).then(function (r) {
      if (r.status === 200) { reportMe = { name: r.body.name, left: r.body.left }; showWho(); }
    }, function () {});
  }
  function syncReport() {
    reportLock.hidden = !!reportSession;
    reportForm.hidden = !reportSession;
    if (reportSession) { showWho(); if (!reportMe && !reportPanel.hidden) loadMe(); }
    else if (!reportPanel.hidden) startGoogle(reportGsi, reportGoogle);
    if (typeof syncAccount === "function") syncAccount();
    if (typeof checkTimelapse === "function") checkTimelapse();
  }
  function randomHex(n) { var a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, function (b) { return (b < 16 ? "0" : "") + b.toString(16); }).join(""); }
  // Google's own button, drawn wherever sign-in is offered (the report panel, the account panel, and the
  // invitation) once Google's script loads; where it can't load, the place's own button (alt) goes to Supabase's
  // sign-in page instead. The script is loaded only when a place asks for it.
  var gsiWaiting = [];
  // The button is asked for at the width of the place it sits in (248 px at most, and 200 at least, the narrowest
  // Google draws its large button): the save panel on a phone has only 216 px. Google makes it wider than asked when
  // its words need more, in whatever language it chooses, so a button still too wide for its place is scaled down to
  // fit (gsiFit, run whenever the place or the button changes size) and never runs past the panel's edge.
  var gsiBoxes = typeof WeakSet === "function" ? new WeakSet() : null;
  var gsiWatch = gsiBoxes && typeof ResizeObserver === "function" ? new ResizeObserver(function (es) {
    es.forEach(function (e) { gsiFit(gsiBoxes.has(e.target) ? e.target : e.target.parentNode); });
  }) : null;
  function gsiFit(box) {
    var b = box && box.firstElementChild;
    if (!b) return;
    b.style.transform = "";
    var room = box.clientWidth, w = b.offsetWidth;
    if (!(room > 0 && w > room)) return;
    // Scaled from its own top left corner and moved to the place's left edge, wherever the place had put it
    // (centred in some panels, at the left in others).
    var dx = box.getBoundingClientRect().left + box.clientLeft - b.getBoundingClientRect().left;
    b.style.transformOrigin = "0 0";
    b.style.transform = "translate(" + dx.toFixed(2) + "px, 0) scale(" + (room / w).toFixed(4) + ")";
  }
  function gsiDraw(box, alt) {
    if (box.getAttribute("data-drawn")) return;
    try {
      var room = box.parentNode ? Math.floor(box.parentNode.getBoundingClientRect().width) : 0;
      google.accounts.id.renderButton(box, { type: "standard", theme: "outline", size: "large", text: "signin_with", shape: "rectangular", logo_alignment: "left", width: room > 0 ? Math.max(200, Math.min(248, room)) : 248 });
      box.setAttribute("data-drawn", "1");
      alt.hidden = true;
      gsiFit(box);
      if (gsiWatch) { gsiBoxes.add(box); gsiWatch.observe(box); if (box.firstElementChild) gsiWatch.observe(box.firstElementChild); }
    } catch (e) { console.warn("google sign-in", e); alt.hidden = false; }
  }
  function startGoogle(box, alt) {
    if (!window.crypto || !crypto.subtle || gsiState === -1) { alt.hidden = false; return; }
    if (gsiState === 2) { gsiDraw(box, alt); return; }
    if (!gsiWaiting.some(function (w) { return w[0] === box; })) gsiWaiting.push([box, alt]);
    if (gsiState === 1) return;
    gsiState = 1;
    var failed = function () { gsiState = -1; gsiWaiting.forEach(function (w) { w[1].hidden = false; }); gsiWaiting = []; };
    var sc = document.createElement("script");
    sc.src = "https://accounts.google.com/gsi/client";
    sc.async = true;
    sc.onerror = failed;
    sc.onload = function () {
      gsiNonce = randomHex(32);
      crypto.subtle.digest("SHA-256", new TextEncoder().encode(gsiNonce)).then(function (buf) {
        var hashed = Array.from(new Uint8Array(buf), function (b) { return (b < 16 ? "0" : "") + b.toString(16); }).join("");
        try {
          google.accounts.id.initialize({ client_id: GOOGLE_CLIENT, callback: googleSignedIn, nonce: hashed, ux_mode: "popup", context: "signin", itp_support: true, use_fedcm_for_prompt: true });
          gsiState = 2;
          gsiWaiting.forEach(function (w) { gsiDraw(w[0], w[1]); });
          gsiWaiting = [];
        } catch (e) { console.warn("google sign-in", e); failed(); }
      });
    };
    document.head.appendChild(sc);
  }
  function signInNotes(text) { [reportLockNote, $("account-note")].forEach(function (n) { if (n) n.textContent = text; }); }
  function googleSignedIn(resp) {
    if (!resp || !resp.credential) return;
    signInNotes(T("Signing in…"));
    reportPost({ action: "google", id_token: resp.credential, nonce: gsiNonce }).then(function (r) {
      if (r.status !== 200) throw new Error("google " + r.status);
      signInNotes("");
      keepReportSession(r.body.access_token, r.body.refresh_token);
      hideInvite(false);
      if (!reportPanel.hidden) {
        if (!reportFrom.value) reportNow();
        loadMe();
        reportPick.focus();
      }
    }).catch(function (e) {
      console.warn("google sign-in", e);
      signInNotes(T("Signing in did not work. Try the other way:"));
      [reportGoogle, $("account-google"), $("invite-google"), $("tl-google")].forEach(function (b) { b.hidden = false; });
    });
  }
  // The other way in: Supabase's own Google sign-in page, which comes back here (see takeSignIn).
  function signInByPage() {
    try { sessionStorage.setItem(REPORT_BACK, location.search + location.hash); } catch (e) {}
    location.href = REPORT_AUTH + "/authorize?provider=google&redirect_to=" + encodeURIComponent(location.origin + location.pathname);
  }
  [reportGoogle, $("account-google"), $("invite-google"), $("tl-google")].forEach(function (b) { b.addEventListener("click", signInByPage); });
  function setReportPicking(on) {
    reportPicking = on;
    reportPick.setAttribute("aria-pressed", on ? "true" : "false");
    reportPick.textContent = T(on ? "Click the place on the map" : reportPlace ? "Choose another place" : "Choose a place on the map");
    document.body.classList.toggle("is-picking", on);
    // On phones the report panel leaves little map to aim at, so choosing a place hides it and gives the whole map,
    // with a bar to cancel; the panel comes back with the place, or on Cancel (19 November 2026).
    var full = on && phoneQuery.matches;
    document.body.classList.toggle("is-picking-full", full);
    $("pick-bar").hidden = !full;
  }
  function setReportOpen(open, focusBtn) {
    reportPanel.hidden = !open;
    reportBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open) { setReportPicking(false); if (focusBtn) reportBtn.focus(); return; }
    if (!layersPanel.hidden) setLayersOpen(false, false);
    if (!savePanel.hidden) setSaveOpen(false, false);
    if (about.classList.contains("is-open")) setAbout(false);
    syncReport();
    if (reportSession && !reportFrom.value) reportNow();
    if (reportSession) reportPick.focus();
  }
  function reportNow() { reportFrom.value = reportTo.value = yearInput.value; }
  function timeKey(t) {
    if (!isMonthly(t)) return String(Math.round(t));
    var d = dateOfDay(dayOfTime(t));
    return d[0] + "-" + (d[1] < 10 ? "0" : "") + d[1] + (d[2] === MID_DAY ? "" : "-" + (d[2] < 10 ? "0" : "") + d[2]);
  }
  // The report form opened on a polity from its card's Sources section, with its place and the date shown filled in.
  function reportAbout(name, lon, lat) {
    reportPlace = { lon: +lon.toFixed(4), lat: +lat.toFixed(4), zoom: +view.zoom.toFixed(2), place: name + " on the map of " + yearInput.value };
    reportWhere.textContent = name + " | " + Math.abs(reportPlace.lat).toFixed(2) + "° " + (reportPlace.lat < 0 ? "S" : "N") + ", " + Math.abs(reportPlace.lon).toFixed(2) + "° " + (reportPlace.lon < 0 ? "W" : "E");
    reportLine.textContent = "";
    reportNow();
    setReportOpen(true, false);
  }
  function pickReport(x, y) {
    var ll = lonLatAt(x, y);
    if (!ll) return;
    var p = polityAt(x, y), name = p ? polityName(p.id) : "";
    reportPlace = { lon: +ll[0].toFixed(4), lat: +ll[1].toFixed(4), zoom: +view.zoom.toFixed(2), place: (name || "No state") + " on the map of " + yearInput.value };
    reportWhere.textContent = (name || T("No state here")) + " | " + Math.abs(reportPlace.lat).toFixed(2) + "° " + (reportPlace.lat < 0 ? "S" : "N") + ", " + Math.abs(reportPlace.lon).toFixed(2) + "° " + (reportPlace.lon < 0 ? "W" : "E");
    setReportPicking(false);
    reportLine.textContent = "";
    reportNote.focus();
  }
  function reportTrouble(r) {
    if (!r) return T("The reports server could not be reached. Check the connection and try again.");
    if (r.status === 429) return T("That is 50 reports today, the most for one account. Send the rest tomorrow; this one is kept here.");
    if (r.status === 400 && r.body && r.body.field) return T("The server did not accept the {field}.", { field: r.body.field });
    return T("Something went wrong on the server ({status}). Try again in a minute.", { status: r.status });
  }
  reportForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (reportBusy || !reportSession) return;
    var from = reportFrom.value.trim(), to = reportTo.value.trim(), note = reportNote.value.trim();
    var a = rangeEnd(from, false), b = rangeEnd(to, true), t = parseTime(from);
    var say = function (msg, el) { reportLine.textContent = msg; if (el) el.focus(); };
    var ex = [fmtYear(1815), fmtYear(-500), monthYear(1941, 6), fmtMDY(1941, 6, 22)].join(T(", "));
    if (!reportPlace) return say(T("Choose the place on the map first."), reportPick);
    if (!a || t === null) return say(T("The first date isn't one the atlas can read. Write it as the date box does: {examples}.", { examples: ex }), reportFrom);
    if (!b) return say(T("The last date isn't one the atlas can read. Write it as the date box does: {examples}.", { examples: ex }), reportTo);
    if (b.y * 12 + b.m < a.y * 12 + a.m) return say(T("The last date comes before the first."), reportTo);
    if (!note) return say(T("Please describe the issue."), reportNote);
    var on = Object.keys(layers).filter(function (k) { return layers[k]; }).join(", ") + (flat ? " | flat map" : " | globe");
    reportBusy = true; reportSend.disabled = true;
    say(T("Sending…"));
    reportAsk({ action: "send", lon: reportPlace.lon, lat: reportPlace.lat, zoom: reportPlace.zoom, place: reportPlace.place, from: from, to: to, at: timeKey(t), layers: on, note: note }).then(function (r) {
      if (r.status === 200) {
        reportNote.value = "";
        reportPlace = null;
        reportWhere.textContent = T("None yet");
        setReportPicking(false);
        if (reportMe) { reportMe.left = r.body.left; showWho(); }
        say(r.body && r.body.id ? T("Sent as report {id}. Thank you.", { id: r.body.id }) : T("Sent. Thank you."));
      } else if (r.status === 401) {
        reportLockNote.textContent = T("Your sign-in has run out. Sign in again; your report is kept.");
      } else say(reportTrouble(r));
    }, function () { say(reportTrouble(null)); }).then(function () { reportBusy = false; reportSend.disabled = false; });
  });
  reportPick.addEventListener("click", function () { setReportPicking(!reportPicking); });
  $("pick-exit").addEventListener("click", function (e) { e.stopPropagation(); setReportPicking(false); reportPick.focus(); });

  // Typing on a phone (23 November 2026): the on-screen keyboard covered the field being typed in, the date in the
  // year bar above all, and the lower fields of the report and save panels. Android's Chrome shrinks the page for the
  // keyboard (interactive-widget=resizes-content in the viewport tag); Safari doesn't, so the keyboard's height is
  // read from the visual viewport: the year bar is lifted above it (--ch-kb), and a panel that holds the field is cut to
  // the room left and scrolled to the field.
  (function keyboardRoom() {
    var vv = window.visualViewport;
    if (!vv) return;
    var root = document.documentElement, panel = null, raf = 0;
    var typing = function () {
      var el = document.activeElement;
      return el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && !/^(checkbox|radio|button|submit|range)$/.test(el.type))) ? el : null;
    };
    function update() {
      raf = 0;
      var el = typing(), kb = el && phoneQuery.matches ? Math.round(window.innerHeight - vv.height - vv.offsetTop) : 0;
      if (kb < 60) kb = 0;
      root.style.setProperty("--ch-kb", kb + "px");
      root.classList.toggle("ch-kb-open", kb > 0);
      var host = el && kb ? el.closest(".ch-layers, .ch-search") : null;
      if (panel && panel !== host) { panel.style.maxHeight = ""; panel.style.overflowY = ""; panel = null; }
      if (host) {
        panel = host;
        var room = vv.offsetTop + vv.height - host.getBoundingClientRect().top - 8;
        host.style.maxHeight = Math.max(120, Math.round(room)) + "px";
        host.style.overflowY = "auto";
      }
      if (el && kb) {
        var r = el.getBoundingClientRect(), bottom = vv.offsetTop + vv.height;
        if (r.bottom > bottom - 8 || r.top < vv.offsetTop) el.scrollIntoView({ block: "nearest" });
      }
    }
    var soon = function () { if (!raf) raf = requestAnimationFrame(update); };
    vv.addEventListener("resize", soon);
    vv.addEventListener("scroll", soon);
    document.addEventListener("focusin", function () { setTimeout(soon, 60); setTimeout(soon, 400); });
    document.addEventListener("focusout", function () { setTimeout(soon, 60); });
  })();
  $("report-now").addEventListener("click", reportNow);
  function signOut() {
    keepReportSession(null);
    try { localStorage.removeItem(PREMIUM_STORE); } catch (e) {}
    try { if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) {}
  }
  $("report-out").addEventListener("click", signOut);

  // The account, at the top right: a figure while signed out, the first letter of the name once signed in. Its
  // panel offers Google's sign-in, or shows the name and email address from the sign-in itself (the token's own
  // claims; nothing more is fetched), with Sign out.
  var accountBtn = $("account-btn"), accountPanel = $("account");
  function accountInfo() {
    if (!reportSession) return null;
    var c = claimsOf(reportSession.a), m = c.user_metadata || {}, email = typeof c.email === "string" ? c.email : "";
    return { name: String(m.full_name || m.name || email.split("@")[0] || "Signed in").slice(0, 80), email: email.slice(0, 200) };
  }
  function syncAccount() {
    if (!accountBtn) return;
    if (!savePanel.hidden && typeof checkTimelapse === "function") checkTimelapse();
    if (typeof premium === "object" && premium) premiumSeen();
    var me = accountInfo(), ini = $("account-initial"), pic = $("account-pic"), url = me ? keptPicture() : null;
    $("account-out").hidden = !!me;
    $("account-in").hidden = !me;
    accountBtn.classList.toggle("is-in", !!me);
    ini.hidden = !me || !!url;
    pic.hidden = !url;
    if (url && pic.getAttribute("src") !== url) pic.src = url;
    if (comments && comments.ui) comments.ui.account();
    if (me) {
      ini.textContent = (me.name.trim().charAt(0) || "?").toUpperCase();
      $("account-name").textContent = me.name;
      $("account-email").textContent = me.email;
      accountBtn.setAttribute("aria-label", T("Account: {name}", { name: me.name }));
      accountBtn.setAttribute("data-tip", me.name);
    } else {
      accountBtn.setAttribute("aria-label", T("Sign in"));
      accountBtn.setAttribute("data-tip", T("Sign in"));

      if (!accountPanel.hidden) startGoogle($("account-gsi"), $("account-google"));
    }
  }
  function setAccountOpen(open, focusBtn) {
    accountPanel.hidden = !open;
    accountBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open) { if (focusBtn) accountBtn.focus(); return; }
    if (!layersPanel.hidden) setLayersOpen(false, false);
    if (!savePanel.hidden) setSaveOpen(false, false);
    if (!reportPanel.hidden) setReportOpen(false, false);
    if (about.classList.contains("is-open")) setAbout(false);
    hideInvite(false);
    $("account-note").textContent = "";
    if (reportSession && !comments) loadComments();
    syncAccount();
    premiumAsk(false);
  }
  accountBtn.addEventListener("click", function () { setAccountOpen(accountPanel.hidden, false); });
  // A picture that can no longer be fetched (removed, or the network down) gives way to the initial.
  $("account-pic").addEventListener("error", function () { $("account-pic").hidden = true; if (reportSession) $("account-initial").hidden = false; });
  // Advertisements and Premium. Banners sit beside the date where the gaps are wide enough for them, or one sits
  // under the top row where they are not. An account with CHRONIA Premium ($10, once, through Stripe; the function
  // chronia-premium) sees none, and may have five times the daily notes (chronia-blurb is sent its session for that).
  // ADS holds AdSense's publisher id and the three ad units' slot ids (each a fixed 320 by 50, made on 19 November
  // 2026); with the client empty no advertisement is asked for and nothing of Google's is loaded. Google's script is
  // loaded only here, only once a banner is placed, so a reader with Premium never loads it, and a signed-in reader's
  // banners wait until the page knows whether the account has Premium. A banner Google leaves unfilled (as all are until
  // the site is approved, or where there is no ad to show) is hidden, and the map takes its room back. `&ads` in the
  // address draws labelled boxes in the banners' places, to see the layout without AdSense.
  var PREMIUM_URL = "https://jvcmeuqlyygpwelmvxuv.supabase.co/functions/v1/chronia-premium", PREMIUM_STORE = "chronia-premium";
  // PREMIUM_LIVE turns the offer on, once chronia-premium is deployed and Stripe's keys are set; until then the
  // page never calls the function.
  var ADS = { client: "ca-pub-8179332869743841", left: "4385958710", right: "3792217290", below: "6931843961" }, PREMIUM_LIVE = true;
  // A side banner is 50 high and as wide as its gap allows, from 160 to 320 (AdSense fills a fixed unit at any width from
  // 120); only where a gap is narrower than that does a single banner go under the top row.
  var AD_SIDE_W = [160, 320], AD_H = 50, AD_BELOW = [320, 50], AD_GAP = 8;
  var adsDemo = addrHas("ads"), adsMode = "", adsSize = null, adsLoaded = false;
  var premium = { on: false, open: false, asked: 0, who: "", known: false, pending: null }, adsShown = false;
  function accountId() { return reportSession ? String(claimsOf(reportSession.a).sub || "") : ""; }
  premium.who = accountId();
  try { premium.on = !!premium.who && localStorage.getItem(PREMIUM_STORE) === premium.who; } catch (e) {}
  if (premium.on && $("about-premium")) $("about-premium").hidden = true;
  // Signed out, there is nothing to wait for; signed in, the first answer from chronia-premium (or its failure) settles it.
  premium.known = !premium.who || premium.on;
  // ADS_ON waits for Google's approval of chroniaatlas.com (21 November 2026). Before it, AdSense marks a banner
  // "filled" but draws it blank, so the page showed two empty grey boxes beside the date; with it false, no banner is
  // placed and none of Google's advertising code loads. Set it true once AdSense shows the site as "Ready".
  var ADS_ON = false;
  // Where Google has no advertisement to show (AdSense still off, a slot left unfilled, or an ad blocker), a reader
  // without Premium sees the atlas's own banner for Premium in its place (Noah, 25 November 2026). While AdSense is off,
  // only one banner is placed, so the date isn't flanked by two of the same.
  var HOUSE = PREMIUM_LIVE;
  function adsWanted() { return ((ADS_ON && !!ADS.client) || adsDemo || HOUSE) && !premium.on && premium.known; }
  function houseAd(el) {
    el.textContent = "";
    delete el.dataset.waiting;
    var a = document.createElement("a"), t = document.createElement("span"), sub = document.createElement("span");
    a.className = "ch-ad-house"; a.href = "premium/";
    t.className = "ch-ad-house-title"; t.textContent = T("Get CHRONIA Premium");
    sub.className = "ch-ad-house-sub"; sub.textContent = el.id === "ad-right" ? T("$10, once, for good") : T("No ads | no watermark | 5× the notes");
    a.appendChild(t); a.appendChild(sub);
    if (parseFloat(el.style.width) < 230) a.classList.add("is-narrow");
    el.appendChild(a);
  }
  // Hides a banner Google has left unfilled, and lays the page out again so the map takes its room back.
  function adsGone(el) {
    if (HOUSE && !premium.on) { if (!el.querySelector(".ch-ad-house")) houseAd(el); return; }
    if (!el.dataset.unfilled) { el.dataset.unfilled = "1"; layout(); scheduleRender(); }
  }
  function adsWatch(el, ins) {
    // Nothing from Google within 12 seconds (its script blocked by an ad blocker, or the network): the banner goes too.
    setTimeout(function () { if (!ins.getAttribute("data-ad-status")) adsGone(el); }, 12000);
    if (typeof MutationObserver !== "function") return;
    new MutationObserver(function () {
      var st = ins.getAttribute("data-ad-status");
      if (st === "filled") delete el.dataset.waiting;
      if (st === "unfilled" && !el.dataset.unfilled) adsGone(el);
      else if (st === "filled" && el.dataset.unfilled) { delete el.dataset.unfilled; layout(); scheduleRender(); }
    }).observe(ins, { attributes: true, attributeFilter: ["data-ad-status"] });
  }
  function adsFill(el, slot, size) {
    if (el.firstChild && el.querySelector(".ch-ad-house") && el.style.width !== size[0] + "px") el.textContent = "";
    if (el.firstChild) return;
    el.style.width = size[0] + "px"; el.style.height = size[1] + "px";
    if (!adsDemo && (!ADS_ON || !ADS.client)) { houseAd(el); return; }
    if (adsDemo || !ADS.client) {
      var d = document.createElement("div");
      d.className = "ch-ad-demo";
      d.textContent = "ADVERTISEMENT | " + size[0] + " × " + size[1];
      el.appendChild(d);
      return;
    }
    var ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "inline-block"; ins.style.width = size[0] + "px"; ins.style.height = size[1] + "px";
    ins.setAttribute("data-ad-client", ADS.client);
    ins.setAttribute("data-ad-slot", slot);
    el.appendChild(ins);
    // The banner's frame stays invisible until Google says it has an advertisement for it (data-ad-status="filled"):
    // an unapproved site, a slot with nothing to show, or an ad blocker leaves no empty box (20 November 2026).
    el.dataset.waiting = "1";
    adsWatch(el, ins);
    if (!adsLoaded) {
      adsLoaded = true;
      var sc = document.createElement("script");
      sc.async = true; sc.crossOrigin = "anonymous";
      sc.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(ADS.client);
      sc.onerror = function () { ["ad-left", "ad-right", "ad-below"].forEach(function (id) { var e = $(id); if (e && e.firstChild) adsGone(e); }); };
      // Google's consent message (AdSense, Privacy & messaging: the European regulations message, set up in AdSense)
      // comes with this script and asks readers in the EEA, the UK, and Switzerland before any advertisement is chosen.
      // Once Google's consent API is ready, the about note offers "Privacy and cookie settings" to change the choice.
      window.googlefc = window.googlefc || {};
      window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
      window.googlefc.callbackQueue.push({ CONSENT_API_READY: function () { var c = $("about-consent"); if (c) c.hidden = false; } });
      document.head.appendChild(sc);
    }
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  }
  // Places the banners, and gives the y the map must start below when one sits under the top row (0 otherwise).
  // The first call that finds advertisements wanted settles where they go, by the room at that moment: a banner
  // AdSense has filled can't be made another size, so a later, narrower window only hides the ones that no longer fit.
  function adsRowSlot(top, head, ctls) {
    // The same 8 px from the title's plate and the menu's, the margin the plates keep from the screen's edges (Noah,
    // 25 November 2026: 5 and 10 px read as uneven).
    var x0 = top.offsetLeft + head.offsetLeft + head.offsetWidth + 8, x1 = top.offsetLeft + ctls.offsetLeft - 8;
    return [x0, top.offsetTop + head.offsetTop + Math.round((head.offsetHeight - AD_H - 2) / 2), Math.max(0, Math.round(x1 - x0) - 2)];
  }
  function adsPlace() {
    var L = $("ad-left"), R = $("ad-right"), B = $("ad-below");
    if (!L) return 0;
    var ctls0 = $("ctls"), wide = function (on) { ctls0.style.minWidth = on ? $("head").offsetWidth + "px" : ""; ctls0.style.justifyContent = on ? "space-evenly" : ""; };
    if (!adsWanted()) { wide(false); L.hidden = R.hidden = B.hidden = true; return 0; }
    // By the offsets, not the boxes on the screen: the top row slides in when the page opens, and its boxes move with it.
    var top = $("top"), yb = $("year-box"), head = $("head"), ctls = $("ctls"), inTop = yb.parentNode === top;
    if (!(head.offsetHeight > 0 && ctls.offsetHeight > 0)) return 0;   // the top row is not laid out yet: asked again once it is
    // While AdSense is off, the atlas's own banners for Premium go in the gaps beside the date, one each side, where both
    // fit; where they don't, one goes at the top as Google's would: on a phone between the title and the menu, elsewhere
    // under the top row (Noah, 25 November 2026; that morning narrower screens had none). They are the atlas's own, so
    // they are placed afresh at every layout, at the size the room allows.
    var houseOnly = !ADS_ON && !adsDemo;
    if (houseOnly) {
      adsMode = "";
      [L, R].forEach(function (e) { delete e.dataset.unfilled; });
    }
    // The date is in the top row's middle column (since 19 November 2026), which is in the page's middle only where the
    // title and the tools leave room; its own offset says where it is.
    wide(inTop && !phoneQuery.matches && adsMode !== "below");
    var headR = head.offsetLeft + head.offsetWidth, ybL = yb.offsetLeft, ybR = ybL + yb.offsetWidth;
    // The date is beside the title only where it is in the top row and on its line.
    var beside = inTop && yb.offsetTop < head.offsetHeight - 4;
    if (!beside) wide(false);
    var gapL = beside ? ybL - headR : 0, gapR = beside ? ctls.offsetLeft - ybR : 0, room = Math.min(gapL, gapR) - 2 * AD_GAP;
    if (!adsMode) {
      adsSize = null;
      // The atlas's own banners fit a narrower gap than Google's units (130 px, the name on two lines).
      var minW = houseOnly ? 130 : AD_SIDE_W[0];
      if (room >= minW + 2) adsSize = [Math.min(AD_SIDE_W[1], Math.floor(room - 2)), AD_H];
      adsMode = adsSize ? "side" : "below";
      if (!adsSize) wide(false);
    }
    if (adsMode === "side") {
      B.hidden = true;
      L.hidden = !!L.dataset.unfilled; R.hidden = !!R.dataset.unfilled;
      if (room < adsSize[0] + 2) {
        wide(false);
        if (houseOnly) { L.hidden = R.hidden = true; return 0; }
        [L, R].forEach(function (e) { if (!e.firstChild) e.hidden = true; });
        var shown = [L, R].filter(function (e) { return !e.hidden; }), bw = adsSize[0] + 2, bh = adsSize[1] + 2;
        if (phoneQuery.matches) {
          shown.slice(1).forEach(function (e) { e.hidden = true; });
          // In the middle of the screen, as far as the room between the title and the menu allows (Noah, 20 November 2026):
          // a banner Google filled at a wider window keeps its size, so it would otherwise sit against the title.
          if (shown.length) {
            var slot = adsRowSlot(top, head, ctls), x = Math.max(slot[0], Math.min((W - bw) / 2, slot[0] + slot[2] + 2 - bw));
            shown[0].style.left = Math.round(x - top.offsetLeft) + "px"; shown[0].style.top = Math.round(slot[1] - top.offsetTop) + "px";
          }
          return 0;
        }
        var kb = $("key").getBoundingClientRect(), cb = $("changes").getBoundingClientRect(), span = shown.length * bw + (shown.length - 1) * AD_GAP;
        if (cb.left - kb.right - 2 * AD_GAP >= span) {
          shown.forEach(function (e, i) {
            var x = (kb.right + cb.left - span) / 2 + i * (bw + AD_GAP), y = Math.max(kb.bottom, cb.bottom) - bh;
            e.style.left = Math.round(x - top.offsetLeft) + "px"; e.style.top = Math.round(y - top.offsetTop) + "px";
          });
          return 0;
        }
        var below = top.offsetTop + Math.max(head.offsetTop + head.offsetHeight, ctls.offsetTop + ctls.offsetHeight, inTop ? yb.offsetTop + yb.offsetHeight : 0) + 6;
        var row = span <= W - 2 * AD_GAP;
        shown.forEach(function (e, i) {
          var x = row ? (W - span) / 2 + i * (bw + AD_GAP) : (W - bw) / 2, y = below + (row ? 0 : i * (bh + AD_GAP));
          e.style.left = Math.round(x - top.offsetLeft) + "px"; e.style.top = Math.round(y - top.offsetTop) + "px";
        });
        return shown.length ? below + (row ? bh : shown.length * bh + (shown.length - 1) * AD_GAP) + 8 : 0;
      }
      if (!L.dataset.unfilled) adsFill(L, ADS.left, adsSize);
      if (!R.dataset.unfilled) adsFill(R, ADS.right, adsSize);
      L.style.top = R.style.top = Math.round((head.offsetHeight - adsSize[1] - 2) / 2) + "px";
      L.style.left = Math.round(headR + (gapL - adsSize[0] - 2) / 2) + "px";
      R.style.left = Math.round(ybR + (gapR - adsSize[0] - 2) / 2) + "px";
      return 0;
    }
    L.hidden = R.hidden = true;
    wide(false);
    if (houseOnly) delete B.dataset.unfilled;
    var under = top.offsetTop + Math.max(head.offsetTop + head.offsetHeight, ctls.offsetTop + ctls.offsetHeight, inTop ? yb.offsetTop + yb.offsetHeight : 0) + 6;
    // On a phone the banner runs from the left of the title to the right of the buttons, so it is as wide as the top row on
    // every phone; elsewhere it is 320 wide, centred. It goes wherever Google leaves it unfilled (Noah, 19 November 2026). The room for it is kept from the first layout, and the banner itself shows only once the page has
    // loaded and opened (endIntro), so it never stands alone on the loading screen and the map never moves when it comes.
    var phone = phoneQuery.matches, size = AD_BELOW;
    if (B.dataset.unfilled) { B.hidden = true; return 0; }
    if (phone) {
      var slot = adsRowSlot(top, head, ctls);
      if (slot[2] < 120) { B.hidden = true; return 0; }
      size = [slot[2], AD_H];
      B.style.left = Math.round(slot[0]) + "px"; B.style.top = Math.round(slot[1]) + "px"; B.style.translate = "none";
      B.hidden = !introOver;
      if (introOver) adsFill(B, ADS.below, size);
      B.style.width = size[0] + "px";
      return 0;
    } else {
      if (W < AD_BELOW[0] + 12) { B.hidden = true; return 0; }
      B.style.left = ""; B.style.translate = "";
    }
    B.style.top = Math.round(under) + "px";
    B.hidden = !introOver;
    if (introOver) adsFill(B, ADS.below, size);
    B.style.width = size[0] + "px";
    return under + size[1] + 2 + 8;
  }
  function syncPremium() {
    var box = $("premium-box"), out = $("premium-out");
    if (!box) return;
    box.hidden = !(premium.on || premium.open);
    out.hidden = !premium.open || premium.on;
    $("premium-buy").hidden = premium.on;
    if ($("about-premium")) $("about-premium").hidden = premium.on;
    $("premium-text").textContent = premium.on
      ? T("You have CHRONIA Premium. With Premium, you have no advertisements, 5x the daily notes, and first priority with addressing map errors. Thank you for your support.")
      : T("No advertisements, no watermark on your videos and images, and more, for $10 once.");
    if (typeof syncImgOpts === "function") syncImgOpts();
    if (adsWanted() !== adsShown) { adsShown = adsWanted(); layout(); scheduleRender(); }
  }
  // The account changed (signed in, out, or as someone else): what the last one had paid for is not this one's.
  function premiumSeen() {
    var id = accountId();
    if (id === premium.who) return;
    premium.who = id; premium.asked = 0;
    try { premium.on = !!id && localStorage.getItem(PREMIUM_STORE) === id; } catch (e) { premium.on = false; }
    premium.known = !id || premium.on;
    syncPremium();
    if (id) premiumAsk(true);
  }
  function premiumPost(body) {
    return reportToken().catch(function () { return null; }).then(function (t) {
      var headers = { "Content-Type": "application/json" };
      if (t) headers.Authorization = "Bearer " + t;
      return fetch(PREMIUM_URL, { method: "POST", headers: headers, body: JSON.stringify(body) });
    }).then(function (res) { return res.json().catch(function () { return {}; }).then(function (j) { return { status: res.status, body: j }; }); });
  }
  function premiumAsk(force) {
    if (!PREMIUM_LIVE && !adsDemo) return Promise.resolve(false);
    // A question still on its way is answered with its own answer, not with what was known before it was asked.
    if (premium.pending && !force) return premium.pending;
    if (!force && Date.now() - premium.asked < 60000) return Promise.resolve(premium.on);
    premium.asked = Date.now();
    var settle = function () { if (!premium.known) { premium.known = true; syncPremium(); } return premium.on; };
    var ask = premium.pending = premiumPost({ action: "status" }).then(function (r) {
      if (r.status !== 200) return settle();
      premium.open = !!r.body.open;
      // Only an answer for a signed-in account settles it: a session that has lapsed keeps what the browser remembers.
      if (r.body.signedIn || !reportSession) premium.on = !!r.body.premium;
      premium.known = true;
      try { if (premium.on) localStorage.setItem(PREMIUM_STORE, accountId()); else if (r.body.signedIn) localStorage.removeItem(PREMIUM_STORE); } catch (e) {}
      syncPremium();
      return premium.on;
    }, settle);
    ask.then(function () { if (premium.pending === ask) premium.pending = null; });
    return ask;
  }
  // The account panel offers Premium with a link to its own page (premium/), which lists what it gives and sells it.
  // That page sends a reader who isn't signed in here with ?signin=premium: the account panel opens, and once they
  // have signed in (here, or through Supabase's page and back) they are sent back to it.
  var PREMIUM_BACK = "chronia-premium-back";
  (function signinForPremium() {
    if (!/[?&]signin=premium(&|$)/.test(location.search || "")) return;
    try { history.replaceState(null, "", location.pathname + location.search.replace(/([?&])signin=premium(&|$)/, function (all, a, c) { return c ? a : ""; }) + location.hash); } catch (e) {}
    if (reportSession) { location.replace("premium/"); return; }
    try { sessionStorage.setItem(PREMIUM_BACK, "1"); } catch (e) {}
    setTimeout(function () { setAccountOpen(true, false); }, 0);
  })();
  // Back from Stripe: `?premium=done` or `?premium=no`. Stripe's webhook marks the account a moment after the
  // payment, so the page asks a few times before giving up.
  (function premiumBack() {
    var m = /[?&]premium=(done|no)(&|$)/.exec(location.search || "");
    if (!m) return;
    try { history.replaceState(null, "", location.pathname + location.search.replace(/([?&])premium=(done|no)(&|$)/, function (all, a, b, c) { return c ? a : ""; }) + location.hash); } catch (e) {}
    setTimeout(function () {
      setAccountOpen(true, false);
      var note = $("premium-note"), box = $("premium-box");
      box.hidden = false;
      if (m[1] === "no") { note.textContent = T("The payment was not made, and nothing was charged."); premiumAsk(true); return; }
      note.textContent = T("Thank you. Confirming the payment…");
      var tries = 0;
      (function again() {
        premiumAsk(true).then(function (on) {
          if (on) { note.textContent = ""; return; }
          if (++tries < 10) setTimeout(again, 2000);
          else note.textContent = T("The payment has not been confirmed yet. It can take a minute: open this panel again shortly.");
        });
      })();
    }, 0);
  })();
  if (reportSession) premiumAsk(false);
  adsShown = adsWanted();
  if (adsShown) { layout(); window.addEventListener("load", function () { layout(); scheduleRender(); }); setTimeout(function () { layout(); scheduleRender(); }, 1500); }

  [layersBtn, saveBtn, $("search-btn"), reportBtn].forEach(function (b) { b.addEventListener("click", function () { if (!accountPanel.hidden) setAccountOpen(false, false); }); });
  $("account-out-btn").addEventListener("click", function () { signOut(); setAccountOpen(false, true); });
  document.addEventListener("pointerdown", function (e) {
    if (!accountPanel.hidden && !accountPanel.contains(e.target) && !accountBtn.contains(e.target)) setAccountOpen(false, false);
  });
  window.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!accountPanel.hidden) { e.stopPropagation(); setAccountOpen(false, true); }
    else if (!$("invite").hidden) { e.stopPropagation(); hideInvite(true); }
  }, true);

  // After a minute with the atlas open, in front, and in use, a small card under the account button offers to
  // sign in: Google's own button, what it is for and what is kept, a link to the privacy notice, and Not now.
  // It never blocks the map. It is not shown to anyone signed in, during a video export, or to the developer
  // tools or the frame-rate readout; Not now (or Esc) keeps it away for INVITE_AGAIN_DAYS, and it shows at most
  // once a visit.
  var INVITE_STORE = "chronia-signin-later", INVITE_AFTER_S = 60, INVITE_AGAIN_DAYS = 30, inviteSeconds = 0, inviteDone = false;
  function inviteWanted() {
    if (reportSession || dev || perf) return false;
    try { if (Date.now() - (+localStorage.getItem(INVITE_STORE) || 0) < INVITE_AGAIN_DAYS * DAY_MS) return false; } catch (e) {}
    return true;
  }
  function panelOpen() { return panelsOpen() || !!lapse; }
  function panelsOpen() { return !layersPanel.hidden || !savePanel.hidden || !reportPanel.hidden || !accountPanel.hidden || !$("search").hidden || about.classList.contains("is-open") || !$("tour").hidden; }
  function showInvite() {
    inviteDone = true;
    $("invite").hidden = false;
    startGoogle($("invite-gsi"), $("invite-google"));
  }
  function hideInvite(later) {
    if ($("invite").hidden) return;
    $("invite").hidden = true;
    if (later) try { localStorage.setItem(INVITE_STORE, String(Date.now())); } catch (e) {}
  }
  $("invite-later").addEventListener("click", function () { hideInvite(true); });
  setInterval(function () {
    if (inviteDone || !ready || document.visibilityState !== "visible" || !document.hasFocus()) return;
    if (++inviteSeconds < INVITE_AFTER_S) return;
    if (!inviteWanted()) { inviteDone = true; return; }
    if (exporting || panelOpen() || drag || pointers.size) return;
    showInvite();
  }, 1000);
  var TOUR_STORE = "chronia-tour", tourAt = -1, tourFrom = null, tourAsk = addrHas("tour=1") ? 1 : addrHas("tour=0") ? 0 : -1;
  var TOUR = [
    { title: "Welcome to CHRONIA", text: "An atlas of the world’s states from 3400 BC to today. This short tour shows you around it in nine steps.", next: "Show me" },
    { at: "#year-box", title: "The date", text: "The map shows the world on this day. Type a year here to go straight to it, or step a month or a year at a time with the arrows." },
    { at: "#track", title: "The timeline", text: "Drag along it to move through the centuries. The events marked above it can be clicked, and take you to their date." },
    { at: ".ch-when-fwd", title: "Play", text: "Play runs the years forward, or backward, and the minus and plus set how fast they go." },
    { at: "#globe", title: "The map", text: "Drag to move it, scroll or pinch to zoom, and click a state to read about it. Its capital and largest city are links that take you there." },
    { at: "#search-btn", alt: "#menu-btn", pad: 0, title: "Search", text: "Find a state, a city, or a people, and the map goes to it." },
    { at: "#layers-btn", alt: "#menu-btn", pad: 0, title: "View", text: "Choose the globe or a flat map, and show or hide zones of control, cities, rivers, terrain, first-level divisions, and more." },
    { at: "#changes-btn", title: "Changes", text: "What changed on the map at this date, with buttons to step to the change before and the next one." },
    { at: "#about-btn", pad: 0, title: "About", text: "The atlas, its sources, and how it was made. You can take this tour again from here.", next: "Done" }
  ];
  function tourSeen() { try { return localStorage.getItem(TOUR_STORE) === "1"; } catch (e) { return false; } }
  function tourTarget(step) {
    var el = step.at && document.querySelector(step.at);
    if (el && step.alt && el.getBoundingClientRect().width < 2) el = document.querySelector(step.alt);
    if (!el) return null;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return null;
    if (getComputedStyle(el).visibility === "hidden") return null;
    return r;
  }
  function placeTour() {
    if (tourAt < 0) return;
    // The box stands the same distance off its part on every side. A round button sits in a tray or plate that is exactly
    // as tall as its own cell, so its box hugs the cell (pad 0) and stays inside the brass; the date's box is drawn round
    // the date's own frame, wherever the layout puts it (the top row on a wide screen, the foot on a phone).
    var spot = $("tour-spot"), card = $("tour-card"), step = TOUR[tourAt], r = tourTarget(step), pad = step.pad != null ? step.pad : 6, gap = 12, m = 12;
    var W = innerWidth, H = innerHeight, cw = Math.min(310, W - 2 * m);
    card.style.width = cw + "px";
    var ch = card.offsetHeight, x, y;
    if (r) {
      var sl = Math.max(2, r.left - pad), st = Math.max(2, r.top - pad), sr = Math.min(W - 2, r.right + pad), sb = Math.min(H - 2, r.bottom + pad);
      spot.classList.remove("is-none");
      spot.style.left = sl + "px";
      spot.style.top = st + "px";
      spot.style.width = sr - sl + "px";
      spot.style.height = sb - st + "px";
      x = Math.max(m, Math.min(W - cw - m, (sl + sr) / 2 - cw / 2));
      if (sb + gap + ch <= H - m) y = sb + gap;
      else if (st - gap - ch >= m) y = st - gap - ch;
      else { x = (W - cw) / 2; y = (H - ch) / 2; }
    } else {
      spot.classList.add("is-none");
      spot.style.left = W / 2 + "px";
      spot.style.top = H / 2 + "px";
      spot.style.width = spot.style.height = "0px";
      x = (W - cw) / 2;
      y = (H - ch) / 2;
    }
    card.style.left = Math.round(x) + "px";
    card.style.top = Math.round(Math.max(m, y)) + "px";
  }
  function showTourStep(i) {
    tourAt = Math.max(0, Math.min(TOUR.length - 1, i));
    var step = TOUR[tourAt];
    $("tour-count").textContent = (tourAt + 1) + " | " + TOUR.length;
    $("tour-title").textContent = T(step.title);
    $("tour-text").textContent = T(step.text);
    $("tour-back").hidden = tourAt === 0;
    $("tour-next").textContent = T(step.next || "Next");
    placeTour();
    try { $("tour-next").focus({ preventScroll: true }); } catch (e) {}
  }
  function openTour() {
    if (!$("tour").hidden) return;
    hideInvite(false);
    setAbout(false);
    tourFrom = document.activeElement;
    $("tour").hidden = false;
    showTourStep(0);
  }
  function closeTour() {
    if ($("tour").hidden) return;
    $("tour").hidden = true;
    tourAt = -1;
    inviteSeconds = 0;
    try { localStorage.setItem(TOUR_STORE, "1"); } catch (e) {}
    if (tourFrom && tourFrom.focus && document.contains(tourFrom) && tourFrom !== document.body) try { tourFrom.focus({ preventScroll: true }); } catch (e) {}
    tourFrom = null;
  }
  function maybeTour() {
    if (dev || perf || exporting || reportSession) return;
    if (tourAsk === 0 || (tourAsk < 0 && tourSeen())) return;
    if (panelOpen()) return;
    openTour();
  }
  $("tour-next").addEventListener("click", function () { if (tourAt >= TOUR.length - 1) closeTour(); else showTourStep(tourAt + 1); });
  $("tour-back").addEventListener("click", function () { showTourStep(tourAt - 1); });
  $("tour-skip").addEventListener("click", closeTour);
  $("tour-again").addEventListener("click", function () { setAbout(false); openTour(); });
  $("consent-btn").addEventListener("click", function () {
    setAbout(false);
    try { window.googlefc.callbackQueue.push(window.googlefc.showRevocationMessage); } catch (e) {}
  });
  window.addEventListener("keydown", function (e) {
    if ($("tour").hidden) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeTour(); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); $("tour-next").click(); return; }
    if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); if (tourAt > 0) showTourStep(tourAt - 1); return; }
    if (e.key === "Tab") {
      var f = Array.prototype.filter.call($("tour-card").querySelectorAll("button"), function (b) { return !b.hidden; });
      var i = f.indexOf(document.activeElement);
      e.preventDefault();
      e.stopPropagation();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      return;
    }
    if (!$("tour-card").contains(e.target) || (e.key !== "Enter" && e.key !== " ")) e.stopPropagation();
  }, true);
  window.addEventListener("resize", function () { if (tourAt >= 0) placeTour(); });
  reportBtn.addEventListener("click", function () { setReportOpen(reportPanel.hidden, false); });
  [layersBtn, saveBtn, $("search-btn")].forEach(function (b) { b.addEventListener("click", function () { if (!reportPanel.hidden) setReportOpen(false, false); }); });
  window.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || reportPanel.hidden) return;
    e.stopPropagation();
    if (reportPicking) setReportPicking(false); else setReportOpen(false, true);
  }, true);
  reportPanel.addEventListener("keydown", function (e) { if (e.key !== "Escape") e.stopPropagation(); });
  syncReport();
  if (reportBackOpen) setTimeout(function () { setReportOpen(true, false); }, 0);

  // A date typed for the range: a bare year means the whole year (January to December by the month).
  function rangeEnd(s, last) {
    var t = String(s || "").trim(), m = /^(\d{1,4})(?:\s*(BC|BCE|AD|CE))?$/i.exec(t) || /^(?:AD|CE)\s*(\d{1,4})$/i.exec(t);
    if (m) {
      var y = +m[1];
      if (m[2] && /^BC/i.test(m[2])) y = -y;
      if (y === 0) y = 1;
      return { y: y, m: last ? 12 : 1, bare: true };
    }
    var v = parseTime(t);
    if (v === null) return null;
    if (!isMonthly(v)) return { y: Math.round(v) || 1, m: last ? 12 : 1, bare: true };
    var d = dateOfDay(dayOfTime(v));
    return { y: d[0], m: d[1], bare: false };
  }
  function nextYear(y) { return y === -1 ? 1 : y + 1; }
  function yearsBetween(a, b) { return b - a - (a < 0 && b > 0 ? 1 : 0); }
  // The dates of the frames, or a reason there are none.
  function timelapsePlan() {
    var a = rangeEnd(tlFrom.value, false), b = rangeEnd(tlTo.value, true), monthly = tlStep.value === "month";
    if (!a) return { why: T("Type the first date as a year ({y1}, {y2}) or a month ({m}).", { y1: fmtYear(1648), y2: fmtYear(-500), m: monthYear(1914, 6) }) };
    if (!b) return { why: T("Type the last date as a year ({y1}, {y2}) or a month ({m}).", { y1: fmtYear(1648), y2: fmtYear(-500), m: monthYear(1914, 6) }) };
    var endY = LAST_YEAR, endM = LAST_MONTH;
    if (a.y < Math.round(FIRST_T)) return { why: T("The map begins in {year}.", { year: fmtYear(Math.round(FIRST_T)) }) };
    if (b.y > endY || (b.y === endY && !b.bare && b.m > endM)) { b = { y: endY, m: endM, bare: b.bare }; }
    if (b.y === endY && b.bare) b.m = endM;
    if (a.y * 12 + a.m >= b.y * 12 + b.m || a.y > b.y) return { why: T("The last date must come after the first.") };
    if (yearsBetween(a.y, b.y) > TL_MAX_YEARS) return { why: T("At most {n} years at a time.", { n: TL_MAX_YEARS }) };
    var frames = [], y, mo, mid = a.bare ? 7 : a.m;
    if (!monthly) {
      for (y = a.y; y <= b.y; y = nextYear(y)) {
        if ((modern || dated) && y >= monthlyFrom()) {
          if (y === endY && mid > endM) { frames.push({ t: monthTime(y, endM), label: fmtNow(monthTime(y, endM)) }); continue; }
          var mt = monthTime(y, mid);
          frames.push({ t: mt, label: a.bare ? String(y) : fmtNow(mt) });
        } else frames.push({ t: y, label: fmtYear(y) });
      }
    } else {
      for (y = a.y; y <= b.y; y = nextYear(y)) {
        if (!(modern || dated) || y < monthlyFrom()) { frames.push({ t: y, label: fmtYear(y) }); continue; }
        var m0 = y === a.y ? a.m : 1, m1 = y === b.y ? b.m : 12;
        for (mo = m0; mo <= m1; mo++) { var t = monthTime(y, mo); frames.push({ t: t, label: fmtNow(t) }); }
      }
    }
    if (frames.length < 2) return { why: T("That range has only one frame.") };
    return { frames: frames, fps: +tlFps.value || 4 };
  }
  function fmtLength(s) {
    s = Math.round(s);
    var sec = function (n) { return T(n === 1 ? "{n} second" : "{n} seconds", { n: n }); };
    if (s < 60) return sec(s);
    var m = Math.floor(s / 60), r = s % 60;
    return T(m === 1 ? "{n} minute" : "{n} minutes", { n: m }) + (r ? " " + sec(r) : "");
  }
  function checkTimelapse() {
    if (exporting) return null;
    if (!canVideo) {
      saveNote.textContent = T("This browser can't make videos. Recent Chrome, Edge, Safari, and Firefox can.");
      saveMake.disabled = true;
      return null;
    }
    // Timelapse videos are for readers signed in with Google (19 November 2026). Signed out, the section shows only a line
    // and Google's own sign-in button, as the report panel does, in place of the video's settings (Noah, 19 November).
    // The video is made in the browser, so this is a door, not a lock.
    if (syncTimelapseLock()) return null;
    var plan = timelapsePlan();
    if (plan.why) { saveNote.textContent = plan.why; saveMake.disabled = true; return null; }
    var n = plan.frames.length, sz = videoSize();
    saveNote.textContent = T("{n} frames", { n: n.toLocaleString(LANG) }) + " | " + fmtLength(n / plan.fps + HOLD_S) + " | " + T("{w} by {h}", { w: sz.w, h: sz.h });
    saveMake.disabled = false;
    return plan;
  }
  // Shows the sign-in in place of the video's settings when the reader is signed out; true while it does.
  function syncTimelapseLock() {
    var out = !reportSession && !exporting;
    $("tl-lock").hidden = !out;
    $("tl-body").hidden = out;
    if (out && !savePanel.hidden) startGoogle($("tl-gsi"), $("tl-google"));
    return out;
  }
  [tlFrom, tlTo].forEach(function (el) { el.addEventListener("input", checkTimelapse); });
  [tlStep, tlFps].forEach(function (el) { el.addEventListener("change", checkTimelapse); });
  [tlFrom, tlTo].forEach(function (el) { el.addEventListener("keydown", function (e) { if (e.key === "Enter" && !saveMake.disabled) { e.preventDefault(); makeTimelapse(); } }); });

  // The size of the video: the screen's, at most 4096 by 2304 (H.264's limit at level 5.1), and even.
  function videoSize() {
    var w = canvas.width, h = canvas.height, s = Math.min(1, VIDEO_MAX_W / w, VIDEO_MAX_H / h, Math.sqrt(VIDEO_MAX_AREA / (w * h)));
    return { w: Math.max(2, Math.floor(w * s / 2) * 2), h: Math.max(2, Math.floor(h * s / 2) * 2) };
  }
  // The frame: the page's background, the map, the date in its frame where the page shows it, and the name.
  function composeFrame(out, label, mark, noDate) {
    var c = out.getContext("2d"), k = out.width / W, cs = getComputedStyle(document.documentElement);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.save();
    c.translate(out.width * 0.5, out.height * 0.45);
    c.scale(out.width * 0.5 * Math.SQRT2, out.height * 0.55 * Math.SQRT2);
    var g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, "#f5ecd5"); g.addColorStop(0.6, "#ecdfc0"); g.addColorStop(1, "#dcc79d");
    c.fillStyle = g; c.fillRect(-2, -2, 4, 4);
    c.restore();
    c.drawImage(canvas, 0, 0, out.width, out.height);
    c.setTransform(k, 0, 0, k, 0, 0);
    var box = $("year-box"), r = box.getBoundingClientRect(), cr = canvas.getBoundingClientRect(), bs = getComputedStyle(box), ys = getComputedStyle(yearInput);
    var x = r.left - cr.left, y = r.top - cr.top, w = r.width, h = r.height;
    // On a phone the date is in the year bar, which the frame leaves out, so it goes at the top in the middle.
    if (box.parentNode !== $("top")) { x = (W - w) / 2; y = 8; h = Math.min(h, 54); }
    if (w > 0 && h > 0 && !noDate) {
      // The saved frame holds the date alone, without the buttons beside it, so it is cut to the date's width.
      c.font = ys.fontStyle + " " + ys.fontWeight + " " + ys.fontSize + " " + ys.fontFamily;
      var fw = Math.min(w, Math.ceil(c.measureText(label).width) + 72);
      x += (w - fw) / 2; w = fw;
      // The date's frame, as the page has it: ivory in a brass bezel, lit on its upper and left sides, between two dark rules.
      var bg = cs.getPropertyValue("--ch-ivory").trim() || cs.getPropertyValue("--bg").trim() || bs.backgroundColor, rule = cs.getPropertyValue("--rule").trim() || "#3a2a1a";
      c.fillStyle = bg; c.fillRect(x, y, w, h);
      c.lineWidth = 3; c.strokeStyle = pal.ring || rule; c.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
      c.lineWidth = 1; c.strokeStyle = pal["ring-hi"] || rule; c.beginPath(); c.moveTo(x + 1.5, y + h - 1.5); c.lineTo(x + 1.5, y + 1.5); c.lineTo(x + w - 1.5, y + 1.5); c.stroke();
      c.strokeStyle = pal["ring-edge"] || rule; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); c.strokeRect(x + 4.5, y + 4.5, w - 9, h - 9);
      c.fillStyle = ys.color; c.textAlign = "center"; c.textBaseline = "middle";
      c.font = ys.fontStyle + " " + ys.fontWeight + " " + ys.fontSize + " " + ys.fontFamily;
      c.fillText(label, x + w / 2, y + h / 2 + 0.5, w - 16);
    }
    // The mark in the lower right: the small name on a saved image, a plate with the name and the address on a video made
    // without Premium, and nothing on a Premium video.
    mark = mark || "corner";
    var ts = getComputedStyle($("head").querySelector(".ch-title")), name = "CHRONIA", i;
    function spaced(str, f, sp) { var t = 0; for (var j = 0; j < str.length; j++) t += c.measureText(str[j]).width + (j < str.length - 1 ? sp : 0); return t; }
    function drawSpaced(str, x0, y0, sp) { for (var j = 0; j < str.length; j++) { c.fillText(str[j], x0, y0); x0 += c.measureText(str[j]).width + sp; } }
    if (mark === "corner") {
      var fs = 12, sp = fs * 0.16;
      c.font = "400 " + fs + "px " + ts.fontFamily;
      c.textAlign = "left"; c.textBaseline = "alphabetic";
      var tw = spaced(name, fs, sp);
      c.globalAlpha = 0.72; c.fillStyle = ys.color;
      drawSpaced(name, W - 16 - tw, H - 14, sp);
      c.globalAlpha = 1;
    } else if (mark === "plate") {
      var u = Math.max(0.8, Math.min(1.6, Math.min(W, H) / 560)), f1 = 17 * u, s1 = f1 * 0.18, f2 = 10.5 * u, addr = "chroniaatlas.com";
      c.textAlign = "left"; c.textBaseline = "alphabetic";
      c.font = "400 " + f1 + "px " + ts.fontFamily; var w1 = spaced(name, f1, s1);
      c.font = "400 " + f2 + "px " + ys.fontFamily; var w2 = c.measureText(addr).width;
      var pw = Math.ceil(Math.max(w1, w2) + 30 * u), ph = Math.ceil(f1 + f2 + 26 * u), px = W - pw - 16 * u, py = H - ph - 16 * u;
      var ivory = cs.getPropertyValue("--ch-ivory").trim() || "#f3ead2", rl = cs.getPropertyValue("--rule").trim() || "#3a2a1a";
      c.globalAlpha = 0.9;
      c.fillStyle = ivory; c.fillRect(px, py, pw, ph);
      c.lineWidth = 3; c.strokeStyle = pal.ring || rl; c.strokeRect(px + 2.5, py + 2.5, pw - 5, ph - 5);
      c.lineWidth = 1; c.strokeStyle = pal["ring-hi"] || rl; c.beginPath(); c.moveTo(px + 1.5, py + ph - 1.5); c.lineTo(px + 1.5, py + 1.5); c.lineTo(px + pw - 1.5, py + 1.5); c.stroke();
      c.strokeStyle = pal["ring-edge"] || rl; c.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1); c.strokeRect(px + 4.5, py + 4.5, pw - 9, ph - 9);
      c.fillStyle = ys.color;
      c.font = "400 " + f1 + "px " + ts.fontFamily; drawSpaced(name, px + (pw - w1) / 2, py + 10 * u + f1 * 0.92, s1);
      c.font = "400 " + f2 + "px " + ys.fontFamily; c.fillText(addr, px + (pw - w2) / 2, py + ph - 10 * u);
      c.globalAlpha = 1;
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
  }
  function download(blob, name) {
    var a = document.createElement("a"), url = URL.createObjectURL(blob);
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }
  function fileDate(t) { return fmtNow(t).replace(/\s+/g, "-").toLowerCase(); }
  var IMG_STORE = "chronia-image";
  function imgOpts() {
    var o = { date: true, mark: true };
    try { var v = JSON.parse(localStorage.getItem(IMG_STORE) || "{}"); if (v.date === false) o.date = false; if (v.mark === false) o.mark = false; } catch (e) {}
    return o;
  }
  function syncImgOpts() {
    var paid = typeof premium === "object" && premium && premium.on, o = imgOpts();
    $("img-date").disabled = $("img-mark").disabled = !paid;
    $("img-date").checked = paid ? o.date : true;
    $("img-mark").checked = paid ? o.mark : true;
    $("img-opts-note").hidden = paid;
  }
  ["img-date", "img-mark"].forEach(function (id) {
    $(id).addEventListener("change", function () {
      try { localStorage.setItem(IMG_STORE, JSON.stringify({ date: $("img-date").checked, mark: $("img-mark").checked })); } catch (e) {}
    });
  });
  syncImgOpts();
  $("save-image").addEventListener("click", function () {
    if (exporting || !ready || !current) return;
    draw();
    var out = document.createElement("canvas");
    out.width = canvas.width; out.height = canvas.height;
    // Without Premium a saved image has the date and the CHRONIA plate, as a video has (Noah, 25 November 2026); with it,
    // either can be left out (imgOpts). Until then an image had the date and the small name in its corner.
    var paid = premium && premium.on, o = imgOpts();
    composeFrame(out, fmtNow(now), paid && !o.mark ? "none" : "plate", paid && !o.date);
    out.toBlob(function (blob) { if (blob) download(blob, "chronia-" + fileDate(now) + ".png"); }, "image/png");
  });

  // Opens the map on screen in UCHRONIA as a map of one's own: UCHRONIA's map is its regions (Natural Earth's states and provinces), each
  // with an owner, so each region goes to the state that holds most of it here (sampled on a grid of up to 7 by 7 points inside it); a
  // state too small to hold any region whole is drawn as UCHRONIA's drawn land instead; dependencies keep their rulers, disputed land its
  // claimants, and the cities are this date's, under their names of the date, in place of today's. The map goes to UCHRONIA in a link,
  // as its own "Copy link" makes one, or as a file to open there if it is too big for a link.
  var UC_ALIAS = {
    "Czech Republic": "Czechia", "Bosnia-Herzegovina": "Bosnia and Herzegovina", "Côte d'Ivoire": "Ivory Coast", "East Timor": "Timor-Leste",
    "New Caledonia and Dependencies": "New Caledonia", "Saint Kitts": "Saint Kitts and Nevis", "Saint Vincent": "Saint Vincent and the Grenadines",
    "Commonwealth of Dominica": "Dominica", "Saint Barthelemy": "Saint Barthélemy", "Wallis and Futuna Islands": "Wallis and Futuna",
    "Kerguelen Islands": "French Southern and Antarctic Lands"
  };
  var UC_GRID = 7, UC_UNIT_GRID = 4, UC_WHOLE = 0.9, UC_CELL = 2, UC_LINK_MAX = 300000, UC_MAX_PIECES = 280, UC_MAX_POINTS = 55000, UC_MAX_CITIES = 2500, UC_PALETTE = 10;
  var ucTopo = null, ucBusy = false, ucNote = $("uc-note"), ucNoteText = ucNote.textContent;
  function ucLoad() {
    if (ucTopo) return Promise.resolve(ucTopo);
    return fetch("../uchronia/data/provinces.json").then(function (r) { if (!r.ok) throw new Error("provinces " + r.status); return r.json(); }).then(function (t) { ucTopo = t; return t; });
  }
  function geoPolys(g) { return !g ? [] : g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []; }
  function ringBox(r, b) { for (var i = 0; i < r.length; i++) { var x = r[i][0], y = r[i][1]; if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; } return b; }
  function inRings(rings, x, y) {
    var k = false;
    for (var a = 0; a < rings.length; a++) {
      var r = rings[a];
      for (var i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > y) !== (r[j][1] > y) && x < r[i][0] + ((y - r[i][1]) * (r[j][0] - r[i][0])) / (r[j][1] - r[i][1])) k = !k;
    }
    return k;
  }
  function polyKm2(poly) {
    var s = 0;
    poly.forEach(function (r, k) {
      var a = 0, lat = 0;
      for (var i = 0, j = r.length - 1; i < r.length; j = i++) { a += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]); lat += r[i][1]; }
      a = Math.abs(a / 2) * 111.2 * 111.2 * Math.cos((lat / r.length) * Math.PI / 180);
      s += k ? -a : a;
    });
    return Math.max(0, s);
  }
  // Douglas–Peucker on a closed ring, in degrees; null if fewer than three points are left.
  function thinRing(r, tol) {
    var n = r.length - 1;
    if (n < 3) return null;
    var keep = new Uint8Array(n + 1), stack = [[0, n]];
    keep[0] = keep[n] = 1;
    while (stack.length) {
      var se = stack.pop(), a = se[0], b = se[1], ax = r[a][0], ay = r[a][1], bx = r[b][0], by = r[b][1], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, far = -1, at = -1;
      for (var i = a + 1; i < b; i++) {
        var px = r[i][0] - ax, py = r[i][1] - ay, d;
        if (L === 0) d = px * px + py * py; else { var u = Math.max(0, Math.min(1, (px * dx + py * dy) / L)); d = Math.pow(px - u * dx, 2) + Math.pow(py - u * dy, 2); }
        if (d > far) { far = d; at = i; }
      }
      if (at >= 0 && far > tol * tol) { keep[at] = 1; stack.push([a, at], [at, b]); }
    }
    if (n >= 4 && keep.reduce(function (t, v) { return t + v; }, 0) < 4) keep[Math.floor(n / 2)] = keep[Math.floor(n / 4)] = 1;
    var out = [];
    for (i = 0; i < n; i++) if (keep[i]) out.push(r[i]);
    return out.length >= 3 ? out : null;
  }
  function ucEncode(polys) {
    return polys.map(function (poly) {
      return poly.map(function (ring) {
        var out = [], px = 0, py = 0;
        for (var i = 0; i < ring.length; i++) { var x = Math.round(ring[i][0] * 1e4), y = Math.round(ring[i][1] * 1e4); out.push(x - px, y - py); px = x; py = y; }
        return out;
      });
    });
  }
  function ucMap(topo, units, snap, t) {
    var feats = topojson.feature(topo, topo.objects.provinces).features, nb = topo.countries.length;
    var baseIndex = new Map(), codeIndex = new Map();
    topo.countries.forEach(function (c, i) { baseIndex.set(c.n, i); codeIndex.set(c.c, i); });
    // The states on the map, each as polygons with boxes, in a grid of UC_CELL degrees.
    var items = [], grid = new Map();
    snap.polys.forEach(function (p) {
      if (!p || p.people || !snap.geoms.hi[p.i]) return;
      var g = topojson.feature(snap.topo.hi, snap.geoms.hi[p.i]).geometry, key = p.claims ? "d" + p.claims.join(",") : "p" + p.id;
      geoPolys(g).forEach(function (poly) {
        if (!poly.length || poly[0].length < 4) return;
        var it = { p: p, key: key, rings: poly, box: ringBox(poly[0], [Infinity, Infinity, -Infinity, -Infinity]), km2: polyKm2(poly) };
        items.push(it);
        for (var cx = Math.floor(it.box[0] / UC_CELL); cx <= Math.floor(it.box[2] / UC_CELL); cx++) for (var cy = Math.floor(it.box[1] / UC_CELL); cy <= Math.floor(it.box[3] / UC_CELL); cy++) {
          var k = cx + ":" + cy;
          if (!grid.has(k)) grid.set(k, []);
          grid.get(k).push(it);
        }
      });
    });
    function stateAt(x, y) {
      var list = grid.get(Math.floor(x / UC_CELL) + ":" + Math.floor(y / UC_CELL));
      if (list) for (var i = 0; i < list.length; i++) { var it = list[i], b = it.box; if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3] && inRings(it.rings, x, y)) return it; }
      return null;
    }
    // Each region's votes: the state under each sample point, or nobody.
    function vote(f, grid1) {
      var polys = geoPolys(f.geometry), b = [Infinity, Infinity, -Infinity, -Infinity], v = new Map(), n = 0;
      polys.forEach(function (poly) { ringBox(poly[0], b); });
      var sx = (b[2] - b[0]) / grid1, sy = (b[3] - b[1]) / grid1;
      for (var i = 0; i < grid1; i++) for (var j = 0; j < grid1; j++) {
        var x = b[0] + (i + 0.5) * sx, y = b[1] + (j + 0.5) * sy;
        if (!polys.some(function (poly) { return inRings(poly, x, y); })) continue;
        var it = stateAt(x, y), k = it ? it.key : "";
        v.set(k, (v.get(k) || 0) + 1);
        if (it) v.set("@" + k, it);
        n++;
      }
      if (!n && polys.length && polys[0][0].length) {
        var r = polys[0][0], mx = 0, my = 0;
        r.forEach(function (q) { mx += q[0] / r.length; my += q[1] / r.length; });
        var it0 = stateAt(mx, my), k0 = it0 ? it0.key : "";
        v.set(k0, 1);
        if (it0) v.set("@" + k0, it0);
      }
      return v;
    }
    var votes = feats.map(function (f) { return vote(f, UC_GRID); });
    var share = votes.map(function (v) { var n = 0, most = 0; v.forEach(function (c, k) { if (k.charAt(0) !== "@") { n += c; if (c > most) most = c; } }); return n ? most / n : 1; });
    // A group of small regions that UCHRONIA moves as one goes to one owner.
    var byGroup = new Map();
    feats.forEach(function (f, p) { var g = f.properties.g; if (g >= 0) { if (!byGroup.has(g)) byGroup.set(g, []); byGroup.get(g).push(p); } });
    byGroup.forEach(function (ps) {
      var sum = new Map();
      ps.forEach(function (p) { votes[p].forEach(function (n, k) { if (k.charAt(0) === "@") sum.set(k, n); else sum.set(k, (sum.get(k) || 0) + n); }); });
      ps.forEach(function (p) { votes[p] = sum; });
    });
    // Countries: a state whose name is one of UCHRONIA's countries is that country; any other is a new one.
    var countryOf = new Map(), rows = new Map(), next = nb, usedBase = new Set();
    function countryFor(it) {
      if (countryOf.has(it.key)) return countryOf.get(it.key);
      var p = it.p, name = p.claims ? (polityName(p.id) === "Disputed land" ? "Disputed by " + claimNames(p.claims) : polityName(p.id)) : polityName(p.id);
      var base = p.claims ? undefined : baseIndex.get(UC_ALIAS[name] || name), i;
      if (base !== undefined && !usedBase.has(base)) { i = base; usedBase.add(base); } else i = next++;
      var color = p.claims ? (p.claimColors ? p.claimColors[0] : 0) : p.color;
      rows.set(i, { i: i, name: i < nb ? null : name.slice(0, 60), color: color >= 0 && color < UC_PALETTE ? color : 0, p: p });
      countryOf.set(it.key, i);
      return i;
    }
    var owners = votes.map(function (v) {
      var best = "", most = -1;
      v.forEach(function (n, k) { if (k.charAt(0) !== "@" && n > most) { most = n; best = k; } });
      return best ? countryFor(v.get("@" + best)) : -1;
    });
    // A region split between states is given unit by unit (its counties, districts, or prefectures), in UCHRONIA's smaller subdivisions.
    var uRows = [];
    if (units) {
      var ufeats = topojson.feature(units, units.objects.units).features, unitsOf = new Map();
      ufeats.forEach(function (f, u) { var p = f.properties.p; if (!unitsOf.has(p)) unitsOf.set(p, []); unitsOf.get(p).push(f); });
      feats.forEach(function (f, p) {
        var us = unitsOf.get(p);
        if (!us || us.length < 2 || f.properties.g >= 0 || share[p] >= UC_WHOLE) return;
        var row = [p], mixed = false;
        us.forEach(function (uf) {
          var v = vote(uf, UC_UNIT_GRID), best = "", most = -1;
          v.forEach(function (n, k) { if (k.charAt(0) !== "@" && n > most) { most = n; best = k; } });
          var o = most < 0 ? owners[p] : best ? countryFor(v.get("@" + best)) : -1;
          if (o !== owners[p]) mixed = true;
          row.push(o);
        });
        if (mixed) uRows.push(row);
      });
    }
    var split = new Set(uRows.map(function (row) { return row[0]; }));
    var held = new Set(owners);
    uRows.forEach(function (row) { row.slice(1).forEach(function (o) { held.add(o); }); });
    // States that hold no region whole are drawn, the largest first, as far as UCHRONIA's limits allow.
    var byKey = new Map();
    items.forEach(function (it) { if (!byKey.has(it.key)) byKey.set(it.key, []); byKey.get(it.key).push(it); });
    var small = [];
    byKey.forEach(function (its, key) {
      if (countryOf.has(key) && held.has(countryOf.get(key))) return;
      small.push({ its: its, km2: its.reduce(function (s, it) { return s + it.km2; }, 0) });
    });
    small.sort(function (a, b) { return b.km2 - a.km2; });
    var pieces = [], points = 0;
    small.forEach(function (sm) {
      if (pieces.length >= UC_MAX_PIECES || sm.km2 < 30) return;
      var tol = Math.min(0.05, Math.max(0.005, Math.sqrt(sm.km2) / 111 / 40)), polys = [];
      sm.its.slice().sort(function (a, b) { return b.km2 - a.km2; }).slice(0, 400).forEach(function (it) {
        if (it.km2 < 5) return;
        var rings = [];
        it.rings.slice(0, 200).forEach(function (r, k) { var th = thinRing(r, tol); if (th && th.length <= 5000) rings.push(th); else if (!k) rings = null; });
        if (rings && rings.length) polys.push(rings);
      });
      var n = polys.reduce(function (s, poly) { return s + poly.reduce(function (t2, r) { return t2 + r.length; }, 0); }, 0);
      if (!polys.length || points + n > UC_MAX_POINTS) return;
      points += n;
      pieces.push([countryFor(sm.its[0]), ucEncode(polys)]);
    });
    var d = {}, o = [];
    feats.forEach(function (f, p) {
      var b = codeIndex.has(f.properties.c) ? codeIndex.get(f.properties.c) : -1;
      if (!split.has(p) && owners[p] !== b) o.push(p, owners[p]);
    });
    if (o.length) d.o = o;
    if (uRows.length) d.u = uRows;
    if (pieces.length) d.h = pieces;
    var alive = new Set(Array.from(held).filter(function (x) { return x >= 0; }));
    pieces.forEach(function (pc) { alive.add(pc[0]); });
    var c = [], r = [], ds = [];
    rows.forEach(function (row) {
      if (!alive.has(row.i)) return;
      c.push([row.i, row.name, row.color]);
      var p = row.p, ruler = p.ruler >= 0 && countryOf.has("p" + p.ruler) && alive.has(countryOf.get("p" + p.ruler)) ? countryOf.get("p" + p.ruler) : -1;
      if (ruler !== row.i) r.push([row.i, ruler]);
      if (p.claims && row.i >= nb) {
        var cl = p.claims.map(function (id) { return countryOf.get("p" + id); }).filter(function (x) { return x !== undefined && alive.has(x); });
        if (cl.length) ds.push([row.i, cl]);
      }
    });
    if (c.length) d.c = c;
    if (r.length) d.r = r;
    if (ds.length) d.d = ds;
    // Today's cities give way to this date's, the largest first, with the states' capitals.
    if (ucCities) d.x = ucCities.map(function (row, i) { return i; });
    var caps = [];
    snap.polys.forEach(function (p) { var cp = p && !p.people && !p.claims && p.cap ? capitalNow(p.cap) : null; if (cp) caps.push(cp); });
    var a = [], seq = 0, placed = [];
    function near(lon, lat) { for (var i = 0; i < placed.length; i++) if (Math.abs(placed[i][0] - lon) < 0.05 && Math.abs(placed[i][1] - lat) < 0.05) return i; return -1; }
    var ranked = cities ? cityRanked(t).slice(0, UC_MAX_CITIES) : [], capCity = new Set(), capFound = new Set();
    caps.forEach(function (k, ki) {
      var best = -1, bestD = Infinity;
      ranked.forEach(function (e, i) {
        var dx = Math.abs(k[1] - e.c.lon), dy = Math.abs(k[2] - e.c.lat), same = plainName(String(cityShownName(e.c, t))) === plainName(String(k[0]));
        if (dx >= 0.15 || dy >= 0.15 || !same && (dx >= 0.05 || dy >= 0.05)) return;
        var dd = dx * dx + dy * dy - (same ? 1 : 0);
        if (dd < bestD) { bestD = dd; best = i; }
      });
      if (best >= 0) { capCity.add(best); capFound.add(ki); }
    });
    ranked.forEach(function (e, i) {
      var cc = e.c;
      a.push([cityShownName(cc, t).slice(0, 60), Math.round(cc.lon * 1e4) / 1e4, Math.round(cc.lat * 1e4) / 1e4, e.tier, capCity.has(i) ? 1 : 0, "u" + (++seq)]);
      placed.push([cc.lon, cc.lat]);
    });
    caps.forEach(function (k, ki) {
      if (capFound.has(ki) || near(k[1], k[2]) >= 0) return;
      a.push([String(k[0]).slice(0, 60), Math.round(k[1] * 1e4) / 1e4, Math.round(k[2] * 1e4) / 1e4, 3, 1, "u" + (++seq)]);
      placed.push([k[1], k[2]]);
    });
    if (a.length) d.a = a;
    return { map: d, regions: o.length / 2 + uRows.length, countries: c.length, drawn: pieces.length };
  }
  var ucUnits = null;
  function ucLoadUnits() {
    if (ucUnits) return Promise.resolve(ucUnits);
    return fetch("../uchronia/data/units.json").then(function (r) { return r.ok ? r.json() : null; }).then(function (u) { ucUnits = u && u.objects && u.objects.units ? u : null; return ucUnits; }).catch(function () { return null; });
  }
  var ucCities = null;
  function ucLoadCities() {
    if (ucCities) return Promise.resolve(ucCities);
    return fetch("../uchronia/data/cities.json").then(function (r) { return r.ok ? r.json() : null; }).then(function (c) { ucCities = Array.isArray(c) ? c : null; return ucCities; }).catch(function () { return null; });
  }
  function ucCode(d) {
    var bytes = new TextEncoder().encode(JSON.stringify(d));
    var b64 = function (u) { var s = ""; for (var i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
    if (window.CompressionStream) {
      try {
        var cs = new CompressionStream("deflate-raw"), w = cs.writable.getWriter();
        w.write(bytes).catch(function () { }); w.close().catch(function () { });
        return new Response(cs.readable).arrayBuffer().then(function (z) { return "z" + b64(new Uint8Array(z)); });
      } catch (e) { }
    }
    return Promise.resolve("j" + b64(bytes));
  }
  $("uc-open").addEventListener("click", function () {
    if (ucBusy || exporting || !ready || !current) return;
    var snap = current, t = now, when = fmtNow(now);
    var tab = window.open("", "_blank");
    ucBusy = true;
    $("uc-open").disabled = true;
    ucNote.textContent = T("Fitting the map of {date} to UCHRONIA's regions…", { date: when });
    Promise.all([ucLoad(), ucLoadCities(), ucLoadUnits()]).then(function (got) {
      return new Promise(function (res) { setTimeout(res, 30); }).then(function () { return ucMap(got[0], got[2], snap, t); });
    }).then(function (res) {
      return ucCode(res.map).then(function (code) {
        var url = UC_APP + "#m=" + code;
        if (code.length <= UC_LINK_MAX) {
          if (tab) tab.location.href = url; else location.href = url;
          ucNote.textContent = T("Opened {date} in UCHRONIA: {c} countries, {r} regions moved, {d} drawn.", { date: when, c: res.countries, r: res.regions, d: res.drawn });
        } else {
          if (tab) tab.close();
          download(new Blob([JSON.stringify({ format: "uchronia", v: 2, saved: new Date().toISOString(), map: res.map })], { type: "application/json" }), "chronia-" + fileDate(t) + "-uchronia.json");
          ucNote.textContent = T("Too big for a link, so it was saved as a file: open it in UCHRONIA with File | Open file.");
        }
      });
    }).catch(function (e) {
      console.warn("uchronia", e);
      if (tab) tab.close();
      ucNote.textContent = T("The map could not be made for UCHRONIA. Try again.");
    }).then(function () {
      ucBusy = false;
      $("uc-open").disabled = false;
      setTimeout(function () { if (!ucBusy) ucNote.textContent = ucNoteText; }, 15000);
    });
  });

  // Waits until the map for date t is shown and nothing it needs (borders, divisions, zones) is still loading,
  // then draws it with every name in place at once.
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function drawSettled(t) {
    setTime(t);
    var p = isModern(t) ? loadModern() : isDated(t) ? loadChunk(chunkIndexFor(t)) : loadMap(mapIndexFor(t));
    var tries = 0;
    function settle() {
      return sleep(0).then(function () {
        if (exporting && exporting.cancel) return;
        draw();
        if (jsonLoading === 0 || tries++ > 300) return sleep(0).then(function () { if (jsonLoading === 0) draw(); });
        return sleep(50).then(settle);
      });
    }
    return p.then(settle, settle);
  }
  function pickCodec(w, h, fps) {
    var bitrate = Math.round(Math.min(24e6, Math.max(3e6, w * h * Math.min(fps, 12) * 0.12)));
    var list = ["avc1.640033", "avc1.640034", "avc1.4d0033", "avc1.42e033"];
    return list.reduce(function (p, codec) {
      return p.then(function (got) {
        if (got) return got;
        var cfg = { codec: codec, width: w, height: h, bitrate: bitrate, framerate: fps, avc: { format: "avc" } };
        return VideoEncoder.isConfigSupported(cfg).then(function (r) { return r && r.supported ? cfg : null; }, function () { return null; });
      });
    }, Promise.resolve(null));
  }
  function makeTimelapse() {
    if (!reportSession && !exporting) { setSaveOpen(false, false); setAccountOpen(true, false); return; }
    var plan = checkTimelapse();
    if (!plan || exporting) return;
    var job = exporting = { cancel: false }, frames = plan.frames, fps = plan.fps, sz = videoSize();
    var keep = { t: now, motion: reduceMotion };
    stopPlay();
    if (!card.hidden) closeCard();
    document.documentElement.classList.add("ch-exporting");
    saveMake.hidden = true; saveProg.hidden = false; saveBar.value = 0;
    [tlFrom, tlTo, tlStep, tlFps, $("save-image")].forEach(function (el) { el.disabled = true; });
    saveNote.textContent = T("Getting ready");
    $("tl-cancel").focus();
    var out = document.createElement("canvas"), samples = [], desc = null, failed = null, encoder = null;
    out.width = sz.w; out.height = sz.h;
    reduceMotion = true;
    function finish(msg) {
      reduceMotion = keep.motion;
      if (encoder && encoder.state !== "closed") { try { encoder.close(); } catch (e) {} }
      exporting = null;
      document.documentElement.classList.remove("ch-exporting");
      saveMake.hidden = false; saveProg.hidden = true;
      [tlFrom, tlTo, tlStep, tlFps, $("save-image")].forEach(function (el) { el.disabled = false; });
      setTime(keep.t);
      checkTimelapse();
      if (msg) saveNote.textContent = msg;
      saveMake.focus();
    }
    // Whether the account has Premium, and so a video without the watermark, is settled before the first frame: on a
    // device it hasn't been seen on, or just after signing in, the answer may not have come yet.
    premiumAsk(false).then(function (on) { job.clean = !!on; }, function () { job.clean = !!premium.on; }).then(function () {
      return pickCodec(sz.w, sz.h, fps);
    }).then(function (cfg) {
      if (!cfg) throw new Error("no codec");
      encoder = new VideoEncoder({
        output: function (chunk, meta) {
          var data = new Uint8Array(chunk.byteLength);
          chunk.copyTo(data);
          samples.push({ data: data, key: chunk.type === "key" });
          var d = meta && meta.decoderConfig && meta.decoderConfig.description;
          if (d && !desc) desc = ArrayBuffer.isView(d) ? new Uint8Array(d.buffer, d.byteOffset, d.byteLength).slice() : new Uint8Array(d).slice();
        },
        error: function (e) { failed = e; }
      });
      encoder.configure(cfg);
      var i = 0;
      function step() {
        if (job.cancel) return Promise.resolve("cancel");
        if (failed) return Promise.reject(failed);
        if (i >= frames.length) return Promise.resolve("done");
        var f = frames[i];
        return drawSettled(f.t).then(function () {
          if (job.cancel) return "cancel";
          composeFrame(out, f.label, job.clean ? "none" : "plate");
          var vf = new VideoFrame(out, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
          encoder.encode(vf, { keyFrame: i % Math.max(1, fps * 2) === 0 });
          vf.close();
          i++;
          saveBar.value = i / frames.length;
          saveCount.textContent = T("Frame {i} of {n}", { i: i.toLocaleString(LANG), n: frames.length.toLocaleString(LANG) });
          saveNote.textContent = f.label;
          var wait = function () { return encoder.encodeQueueSize > 3 ? sleep(10).then(wait) : null; };
          return Promise.resolve(wait()).then(step);
        });
      }
      return step();
    }).then(function (how) {
      if (how === "cancel") { finish(T("Stopped.")); return; }
      saveNote.textContent = T("Finishing the file");
      return encoder.flush().then(function () {
        if (failed) throw failed;
        if (!desc || samples.length !== frames.length) throw new Error("encoder gave " + samples.length + " of " + frames.length);
        var blob = mp4Pack(samples, desc, sz.w, sz.h, fps, HOLD_S);
        var a = frames[0].label, b = frames[frames.length - 1].label;
        download(blob, ("chronia-" + a + "-to-" + b).replace(/\s+/g, "-").toLowerCase() + ".mp4");
        finish(T("Saved") + " | " + (blob.size / 1048576).toLocaleString(LANG, { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + " MB");
      });
    }).catch(function (e) {
      console.warn("timelapse", e);
      finish(T(String(e && e.message) === "no codec" ? "This browser can't make a video this size. Make the window smaller and try again." : "The video could not be made."));

    });
  }
  saveMake.addEventListener("click", makeTimelapse);
  $("tl-cancel").addEventListener("click", function () { if (exporting) exporting.cancel = true; });
  checkTimelapse();

  // An MP4 file of one H.264 track (ISO/IEC 14496-12 and -15): the file type, the samples in one 'mdat',
  // then the 'moov' that indexes them. Each frame lasts 1/fps of a second, the last also hold seconds more.
  function mp4Pack(samples, avcC, w, h, fps, hold) {
    var TS = fps * 1000, unit = 1000, n = samples.length, total = 0, i;
    for (i = 0; i < n; i++) total += samples[i].data.length;
    var durTs = n * unit + hold * TS, durMv = Math.round(durTs / TS * 1000);
    function u8(v) { return [v & 255]; }
    function u16(v) { return [(v >>> 8) & 255, v & 255]; }
    function u32(v) { return [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]; }
    function u64(v) { var hi = Math.floor(v / 4294967296); return u32(hi).concat(u32(v >>> 0)); }
    function str(s) { var a = []; for (var j = 0; j < s.length; j++) a.push(s.charCodeAt(j)); return a; }
    function box(type) {
      var body = [], k;
      for (k = 1; k < arguments.length; k++) { var p = arguments[k]; if (p instanceof Uint8Array) p = Array.from(p); body = body.concat(p); }
      return u32(body.length + 8).concat(str(type), body);
    }
    function full(type, ver, flags) { var rest = Array.prototype.slice.call(arguments, 3); return box.apply(null, [type, [ver], u32(flags).slice(1)].concat(rest)); }
    var matrix = [].concat(u32(0x10000), u32(0), u32(0), u32(0), u32(0x10000), u32(0), u32(0), u32(0), u32(0x40000000));
    var ftyp = box("ftyp", str("isom"), u32(512), str("isomiso2avc1mp41"));
    var big = total + 8 > 4294967295;
    var mdatHead = big ? u32(1).concat(str("mdat"), u64(total + 16)) : u32(total + 8).concat(str("mdat"));
    var dataAt = ftyp.length + mdatHead.length;
    var stts = [[n - 1, unit], [1, unit + hold * TS]].filter(function (e) { return e[0] > 0; });
    var sync = []; for (i = 0; i < n; i++) if (samples[i].key) sync.push(i + 1);
    var sizes = []; for (i = 0; i < n; i++) sizes.push.apply(sizes, u32(samples[i].data.length));
    var avc1 = box("avc1", [0, 0, 0, 0, 0, 0], u16(1), u16(0), u16(0), u32(0), u32(0), u32(0), u16(w), u16(h), u32(0x480000), u32(0x480000), u32(0), u16(1),
      new Array(32).fill(0), u16(0x18), u16(0xffff), box("avcC", avcC));
    var stbl = box("stbl",
      full("stsd", 0, 0, u32(1), avc1),
      full("stts", 0, 0, u32(stts.length), [].concat.apply([], stts.map(function (e) { return u32(e[0]).concat(u32(e[1])); }))),
      full("stss", 0, 0, u32(sync.length), [].concat.apply([], sync.map(u32))),
      full("stsc", 0, 0, u32(1), u32(1), u32(n), u32(1)),
      full("stsz", 0, 0, u32(0), u32(n), sizes),
      big ? full("co64", 0, 0, u32(1), u64(dataAt)) : full("stco", 0, 0, u32(1), u32(dataAt)));
    var minf = box("minf", full("vmhd", 0, 1, u16(0), u16(0), u16(0), u16(0)), box("dinf", full("dref", 0, 0, u32(1), full("url ", 0, 1))), stbl);
    var mdia = box("mdia",
      full("mdhd", 0, 0, u32(0), u32(0), u32(TS), u32(durTs), u16(0x55c4), u16(0)),
      full("hdlr", 0, 0, u32(0), str("vide"), u32(0), u32(0), u32(0), str("CHRONIA"), u8(0)),
      minf);
    var trak = box("trak", full("tkhd", 0, 3, u32(0), u32(0), u32(1), u32(0), u32(durMv), u32(0), u32(0), u16(0), u16(0), u16(0), u16(0), matrix, u32(w * 65536), u32(h * 65536)), mdia);
    var moov = box("moov", full("mvhd", 0, 0, u32(0), u32(0), u32(1000), u32(durMv), u32(0x10000), u16(0x100), u16(0), u32(0), u32(0), matrix, new Array(24).fill(0), u32(2)), trak);
    var parts = [new Uint8Array(ftyp), new Uint8Array(mdatHead)];
    for (i = 0; i < n; i++) parts.push(samples[i].data);
    parts.push(new Uint8Array(moov));
    return new Blob(parts, { type: "video/mp4" });
  }
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
      var name = polityNameL(p.id);
      if (!name || !p.label) return;
      var sub = p.ruler >= 0 ? T("held by {name}", { name: polityNameL(p.ruler) }) : p.member >= 0 && p.member !== p.id ? inGroup(p.member) : "";
      out.push({ kind: p.band ? "Band" : p.people ? "People" : "State", name: name, alt2: name !== polityName(p.id) ? polityName(p.id) : "", sub: sub, w: p.label[5], km2: p.label[5], id: p.id, ll: [p.label[0], p.label[1]] });
    });
    if (cities) cityRanked(now).forEach(function (x) {
      var c = x.c, nm = cityShownName(c, now), nmL = placeNameL(nm, nm === c.name ? c.qid : null);
      out.push({ kind: x.tier <= 2 ? "City" : "Town", name: nmL, alt: nm !== c.name ? c.name : "", alt2: nmL !== nm ? nm : "", sub: nm !== c.name ? T("now {name}", { name: placeNameL(c.name, c.qid) }) : "", w: x.pop, city: c, tier: x.tier, ll: [c.lon, c.lat] });
    });
    SEAS.forEach(function (sl, k) { out.push({ kind: sl.tier === 1 ? "Ocean" : "Sea", name: sl.name,
 ll: [sl.lon, sl.lat], w: 4 - sl.tier, sea: sl.tier }); });
    if (lakes) {
      var lseen = new Set();
      lakesAt().forEach(function (l) {
        if (!l.name || l.km2 < 150 || lseen.has(l.name)) return;
        lseen.add(l.name);
        if (!l.ll && l.coords) l.ll = centreOfCoords(l.coords);
        if (l.ll) out.push({ kind: "Lake", name: lakeNameL(l.name), alt2: lakeNameL(l.name) !== l.name ? l.name : "", ll: l.ll, w: l.km2, km2: l.km2 });
      });
    }
    marshesNow().forEach(function (m) { out.push({ kind: "Marsh", name: m.name, ll: [(m.b[0] + m.b[2]) / 2, (m.b[1] + m.b[3]) / 2], w: m.km2, km2: m.km2 }); });
    return out;
  }
  function searchScore(q, it) {
    var n = fold(it.name), a = it.alt ? fold(it.alt) : "", a2 = it.alt2 ? fold(it.alt2) : "";
    if (n === q || a2 === q) return 0;
    if (n.indexOf(q) === 0 || (a2 && a2.indexOf(q) === 0)) return 1;
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
      sm.textContent = T(it.kind) + (it.sub ? " | " + it.sub : "");

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
    if (it.city) { flyTo(it.ll[0], it.ll[1], Math.max(S, it.tier <= 1 ? 14000 : 20000)); openCity({ ref: { city: it.city }, kind: it.tier <= 1 ? "city" : "town" }); return; }
    if (it.id !== undefined) { flyTo(it.ll[0], it.ll[1], scaleFor(it.km2, 200, 6000)); select(it.id); return; }
    if (it.sea) { flyTo(it.ll[0], it.ll[1], it.sea === 1 ? 260 : it.sea === 2 ? 700 : 1700); return; }
    flyTo(it.ll[0], it.ll[1], scaleFor(it.km2, 500, 8000));
  }
  function setSearchOpen(open, focusBtn) {
    if (open && playMode) return;
    searchPanel.hidden = !open;
    searchBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      if (!layersPanel.hidden) setLayersOpen(false, false);
      if (about.classList.contains("is-open")) setAbout(false);
      if (cities && !cities.minorLoad) loadMinorCities();
      searchInput.value = "";
      runSearch();
      searchInput.focus();
    } else if (focusBtn) searchBtn.focus();
  }
  function syncSearch() {
    if (!searchBtn) return;
    var busy = !!playMode;
    searchBtn.disabled = busy;
    searchBtn.setAttribute("data-tip", T(busy ? "Search (pause to search)" : "Search (/)"));
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
    if (typing || exporting || e.metaKey || e.ctrlKey || e.altKey) return;
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
    border: function (s) { return level(s, useLevel()).hard.length > 0; },
    soft: function (s) { return level(s, useLevel()).soft.length > 0; },
    people: function (s) { return s.polys.some(function (p) { return p && p.people && !p.band; }); },
    band: function (s) { return s.polys.some(function (p) { return p && p.band; }); },
    disputed: function (s) { return s.polys.some(function (p) { return p && p.claims; }); },
    // The lines between members of a larger state (the Holy Roman Empire, the Roman provinces) are its first-level divisions.
    division: function (s) { return divDrawn || layers.subdivisions && s.polys.some(function (p) { return p && p.member >= 0 && p.id !== p.member; }); },
    control: function () { return ctlDrawn; }
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
    keyBtn.setAttribute("aria-label", T(open ? "Hide the key" : "Show the key"));
    if (keep) try { localStorage.setItem(STORE_KEY, open ? "1" : "0"); } catch (e) {}
    scheduleRender();
  }
  // Open at first on a computer; closed on phones, tablets (a touch screen with no hover, as an iPad), and short screens.
  var keyOpen = !phoneQuery.matches && window.innerHeight >= 600 && !(window.matchMedia && matchMedia("(hover: none) and (pointer: coarse)").matches);
  try { var savedKey = localStorage.getItem(STORE_KEY); if (savedKey === "1" || savedKey === "0") keyOpen = savedKey === "1"; } catch (e) {}
  setKeyOpen(keyOpen, false);
  keyBtn.addEventListener("click", function () { setKeyOpen(keyList.hidden, true); });

  // The scale bar. It wakes whenever the map moves (nudge) and fades SCALE_MS after the last move. It measures at the
  // centre of the screen: on the flat map (equirectangular) along the parallel there, R cos φ / k km a pixel; on the
  // globe, where the scale is true only near the centre, R / r. It shows only once a region is in view, since across a
  // whole world the scale changes too much for one bar to mean anything: on the flat map while the screen spans under
  // SCALE_SPAN degrees of latitude, on the globe while the screen's corners are within SCALE_REACH degrees of its centre.
  var SCALE_MS = 3000, SCALE_SPAN = 90, SCALE_REACH = 60, EARTH_KM = 6371.0088, MI_KM = 1.609344;
  var scaleBox = $("scale"), scaleTimer = 0, scaleRaf = 0;
  function niceUnder(v) {
    var p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p;
    return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p;
  }
  function scaleRow(id, units, perPx, most) {
    var n = niceUnder(perPx * most), w = n / perPx, m = n / Math.pow(10, Math.floor(Math.log10(n)));
    // Five squares for a 5, four for a 2 or a 1, so each square is a round share.
    var bar = $(id);
    bar.style.width = w.toFixed(1) + "px";
    bar.style.setProperty("--seg", (w / (m === 5 ? 5 : 4)).toFixed(2) + "px");
    $(id + "-n").textContent = n.toLocaleString(LANG || "en") + " " + units;
  }
  function scaleKmPerPx() {
    if (flat) {
      if ((freeB - freeT) / FB.k / D2R > SCALE_SPAN) return 0;
      var phi = FB.yc - ((freeT + freeB) / 2 - cy) / FB.k;
      return EARTH_KM * Math.cos(phi) / FB.k;
    }
    var reach = Math.max(Math.hypot(cx, freeT - cy), Math.hypot(W - cx, freeB - cy));
    if (reach >= B.r || Math.asin(reach / B.r) / D2R > SCALE_REACH) return 0;
    return EARTH_KM / B.r;
  }
  function placeScale() {
    var gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ch-gap")) || 10;
    var ch = $("changes"), anchor = ch && !ch.hidden ? ch.getBoundingClientRect() : $("side").getBoundingClientRect();
    var sw = scaleBox.offsetWidth, sh = scaleBox.offsetHeight, kr = $("key").getBoundingClientRect();
    var right = innerWidth - anchor.left + gap, bottom = innerHeight - anchor.bottom;
    // Beside Changes, on its bottom line; where the key (or anything else on that line) leaves no room, above Changes.
    var left = anchor.left - gap - sw;
    if (left < kr.right + gap && kr.bottom > anchor.bottom - sh) { right = innerWidth - anchor.right; bottom = innerHeight - anchor.top + gap; }
    scaleBox.style.right = Math.max(0, right).toFixed(0) + "px";
    scaleBox.style.bottom = Math.max(0, bottom).toFixed(0) + "px";
  }
  function scaleNow() {
    scaleRaf = 0;
    var kpp = scaleKmPerPx();
    if (!kpp || !isFinite(kpp)) { scaleBox.classList.remove("is-on"); return; }
    var most = phoneQuery.matches ? 80 : 110;
    scaleRow("scale-km", "km", kpp, most);
    scaleRow("scale-mi", "mi", kpp / MI_KM, most);
    placeScale();
    scaleBox.classList.add("is-on");
  }
  function scaleWake() {
    if (!scaleBox || !ready) return;
    if (!scaleRaf) scaleRaf = requestAnimationFrame(scaleNow);
    clearTimeout(scaleTimer);
    scaleTimer = setTimeout(function () { scaleBox.classList.remove("is-on"); }, SCALE_MS);
  }
  var hoverTip = $("hover-tip"), tipTimer = 0;

  // The wars on the map at the date, with their sides' flags, while the zones of control are on (#wars).
  // Each war's sides are lists of parties: [flag, name, capital's longitude, latitude, first day, last day,
  // side in the war's file]. A party with a side shows only while the file gives that side ground; a party
  // without a flag is drawn as a swatch of its side's colour. Clicking a party flies to its capital or seat.
  var STORE_WARS = "chronia-wars";
  var warsBox = $("wars"), warsBtn = $("wars-btn"), warsList = $("wars-list"), warsState = null;
  var fH = function (cs) { var h = 20 / cs.length; return cs.map(function (c, i) { return '<rect y="' + (i * h).toFixed(2) + '" width="30" height="' + (h + 0.05).toFixed(2) + '" fill="' + c + '"/>'; }).join(""); };
  var fV = function (cs) { var w = 30 / cs.length; return cs.map(function (c, i) { return '<rect x="' + (i * w).toFixed(2) + '" width="' + (w + 0.05).toFixed(2) + '" height="20" fill="' + c + '"/>'; }).join(""); };
  var fStar = function (cx, cy, r, fill, n) {
    n = n || 5; var pts = [];
    for (var i = 0; i < 2 * n; i++) { var a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * 0.42 : r; pts.push((cx + rr * Math.cos(a)).toFixed(2) + "," + (cy + rr * Math.sin(a)).toFixed(2)); }
    return '<polygon points="' + pts.join(" ") + '" fill="' + fill + '"/>';
  };
  var fCross = function (bg, c, x, w, inner, wi) {
    var s = '<rect width="30" height="20" fill="' + bg + '"/><rect x="' + x + '" width="' + w + '" height="20" fill="' + c + '"/><rect y="' + (10 - w / 2) + '" width="30" height="' + w + '" fill="' + c + '"/>';
    if (inner) s += '<rect x="' + (x + (w - wi) / 2) + '" width="' + wi + '" height="20" fill="' + inner + '"/><rect y="' + (10 - wi / 2) + '" width="30" height="' + wi + '" fill="' + inner + '"/>';
    return s;
  };
  var fUnion = '<rect width="30" height="20" fill="#012169"/><path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0L30 20M30 0L0 20" stroke="#c8102e" stroke-width="1.4"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6"/><path d="M15 0v20M0 10h30" stroke="#c8102e" stroke-width="3.4"/>';
  var fUS = function () {
    var s = fH(["#b22234", "#fff", "#b22234", "#fff", "#b22234", "#fff", "#b22234", "#fff", "#b22234", "#fff", "#b22234", "#fff", "#b22234"]) + '<rect width="12" height="10.77" fill="#3c3b6e"/>';
    for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) s += '<circle cx="' + (1.6 + c * 2.9 + (r % 2) * 1.2).toFixed(2) + '" cy="' + (1.5 + r * 2.6).toFixed(2) + '" r="0.55" fill="#fff"/>';
    return s;
  };
  var fCrescent = function (bg) { return '<rect width="30" height="20" fill="' + bg + '"/><circle cx="12" cy="10" r="5" fill="#fff"/><circle cx="13.4" cy="10" r="4" fill="' + bg + '"/>' + fStar(18.6, 10, 2.2, "#fff"); };
  var FLAGS = {
    us: fUS(),
    csa: fH(["#bf0a30", "#fff", "#bf0a30"]) + '<rect width="12" height="13.33" fill="#002868"/>' + [0, 1, 2, 3, 4, 5, 6].map(function (i) { var a = -Math.PI / 2 + i * 2 * Math.PI / 7; return '<circle cx="' + (6 + 3.6 * Math.cos(a)).toFixed(2) + '" cy="' + (6.67 + 3.6 * Math.sin(a)).toFixed(2) + '" r="0.75" fill="#fff"/>'; }).join(""),
    uk: fUnion,
    fr: fV(["#0055a4", "#fff", "#ef4135"]),
    be: fV(["#000", "#fdda24", "#ef3340"]),
    ru: fH(["#fff", "#0039a6", "#d52b1e"]),
    rs: fH(["#c6363c", "#0c4076", "#fff"]),
    it: fV(["#009246", "#fff", "#ce2b37"]) + '<path d="M13 7.5h4v3.6c0 1.6-2 2.4-2 2.4s-2-0.8-2-2.4z" fill="#c8102e" stroke="#2b5fb3" stroke-width="0.5"/><path d="M15 7.9v5M13.3 10h3.4" stroke="#fff" stroke-width="0.8"/>',
    pt: '<rect width="12" height="20" fill="#046a38"/><rect x="12" width="18" height="20" fill="#da291c"/><circle cx="12" cy="10" r="3.6" fill="none" stroke="#ffe900" stroke-width="1"/><path d="M10.6 8.6h2.8v2.4c0 1.1-1.4 1.6-1.4 1.6s-1.4-0.5-1.4-1.6z" fill="#fff" stroke="#da291c" stroke-width="0.4"/>',
    ro: fV(["#002b7f", "#fcd116", "#ce1126"]),
    gr: fH(["#0d5eaf", "#fff", "#0d5eaf", "#fff", "#0d5eaf", "#fff", "#0d5eaf", "#fff", "#0d5eaf"]) + '<rect width="11.11" height="11.11" fill="#0d5eaf"/><rect x="4.44" width="2.22" height="11.11" fill="#fff"/><rect y="4.44" width="11.11" height="2.22" fill="#fff"/>',
    jp: '<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#bc002d"/>',
    ah: '<rect width="15" height="20" fill="#c8102e"/><rect y="6.67" width="15" height="6.67" fill="#fff"/><rect x="15" width="15" height="6.67" fill="#ce2939"/><rect x="15" y="6.67" width="15" height="6.67" fill="#fff"/><rect x="15" y="13.33" width="15" height="6.67" fill="#477050"/>',
    de1871: fH(["#000", "#fff", "#dd0000"]),
    de1935: '<rect width="30" height="20" fill="#dd0000"/><circle cx="15" cy="10" r="6" fill="#fff"/><g transform="rotate(45 15 10)"><path d="M15 6.4v7.2M11.4 10h7.2M15 6.4h3.1M18.6 10v3.1M15 13.6h-3.1M11.4 10v-3.1" fill="none" stroke="#000" stroke-width="1.35"/></g>',
    ot: fCrescent("#e30a17"),
    tr: fCrescent("#e30a17"),
    bg: fH(["#fff", "#00966e", "#d62612"]),
    pl: fH(["#fff", "#dc143c"]),
    no: fCross("#ba0c2f", "#fff", 8.5, 4.4, "#00205b", 2.2),
    fi: fCross("#fff", "#002f6c", 8.5, 4.4),
    nl: fH(["#ae1c28", "#fff", "#21468b"]),
    yu: fH(["#0c4076", "#fff", "#c6363c"]),
    hu: fH(["#ce2939", "#fff", "#477050"]),
    su: '<rect width="30" height="20" fill="#cc0000"/><path d="M6.2 1.6l0.42 1.3h1.37l-1.1 0.8 0.42 1.3-1.1-0.8-1.1 0.8 0.42-1.3-1.1-0.8h1.37z" fill="none" stroke="#ffd900" stroke-width="0.35"/><path d="M3.9 8.9a2.7 2.7 0 1 0 3.6-3.4" fill="none" stroke="#ffd900" stroke-width="0.8"/><path d="M4.5 6.2l3.4 3.4M4 6.7l1-1" fill="none" stroke="#ffd900" stroke-width="0.8"/>',
    cn: '<rect width="30" height="20" fill="#fe0000"/><rect width="15" height="10" fill="#000095"/>' + fStar(7.5, 5, 3.4, "#fff", 12) + '<circle cx="7.5" cy="5" r="1.9" fill="#000095"/><circle cx="7.5" cy="5" r="1.55" fill="#fff"/>',
    au: '<rect width="30" height="20" fill="#012169"/><g transform="scale(0.5)">' + fUnion + '</g>' + fStar(7.5, 15, 2.2, "#fff", 7) + fStar(22.5, 5, 1, "#fff", 7) + fStar(20, 9.5, 1, "#fff", 7) + fStar(25.5, 8.5, 1, "#fff", 7) + fStar(22.5, 16, 1, "#fff", 7),
    th: '<rect width="30" height="20" fill="#a51931"/><rect y="3.33" width="30" height="13.33" fill="#f4f5f8"/><rect y="6.67" width="30" height="6.67" fill="#2d2a4a"/>',
    esRep: fH(["#c60b1e", "#ffc400", "#6a2e86"]),
    esNat: '<rect width="30" height="20" fill="#c60b1e"/><rect y="5" width="30" height="10" fill="#ffc400"/>',
    mx: fV(["#006847", "#fff", "#ce1126"]) + '<circle cx="15" cy="10" r="2.3" fill="#8c5a2b"/>',
    syGov: fH(["#ce1126", "#fff", "#000"]) + fStar(11, 10, 2, "#007a3d") + fStar(19, 10, 2, "#007a3d"),
    syRev: fH(["#007a3d", "#fff", "#000"]) + fStar(9, 10, 1.8, "#ce1126") + fStar(15, 10, 1.8, "#ce1126") + fStar(21, 10, 1.8, "#ce1126"),
    ir: fH(["#239f40", "#fff", "#da0000"]) + '<path d="M15 7.9v4.2M13.7 8.6c-0.9 1 -0.6 2.6 0.8 3.2M16.3 8.6c0.9 1 0.6 2.6 -0.8 3.2" fill="none" stroke="#da0000" stroke-width="0.6"/>',
    il: '<rect width="30" height="20" fill="#fff"/><rect y="2" width="30" height="3" fill="#0038b8"/><rect y="15" width="30" height="3" fill="#0038b8"/><path d="M15 6.6l3 5.1h-6zM15 13.4l3-5.1h-6z" fill="none" stroke="#0038b8" stroke-width="0.8"/>',
    ua: fH(["#0057b7", "#ffd700"]),
    ye: fH(["#ce1126", "#fff", "#000"]),
    yeSouth: fH(["#ce1126", "#fff", "#000"]) + '<path d="M0 0L12 10L0 20z" fill="#3e5eb9"/>' + fStar(4.2, 10, 2.4, "#ce1126"),
    sa: '<rect width="30" height="20" fill="#006c35"/><path d="M9 7.5h12M10 9.2h10" stroke="#fff" stroke-width="1.1"/><path d="M8.5 13.2h12.5l1.5-0.8" fill="none" stroke="#fff" stroke-width="0.9"/>',
    ae: fH(["#00732f", "#fff", "#000"]) + '<rect width="8" height="20" fill="#ff0000"/>'
  };
  var WASH = [-77.04, 38.9], LONDON = [-0.13, 51.51], PARIS = [2.35, 48.86], MOSCOW = [37.62, 55.75], TOKYO = [139.69, 35.69], ROME = [12.5, 41.9], BERLIN = [13.4, 52.52];
  var P = function (flag, name, ll, from, to, side) { return { flag: flag, name: name, ll: ll, from: from || null, to: to || null, side: side || null }; };
  var WAR_PARTIES = {
    civilwar: [
      [P("us", "United States", WASH)],
      [P("csa", "Confederate States", [-86.3, 32.38], null, "1861-05-28"), P("csa", "Confederate States", [-77.44, 37.54], "1861-05-29")]
    ],
    ww1: [
      [P("rs", "Serbia", [20.46, 44.82]), P("ru", "Russian Empire", [30.32, 59.94], null, "1918-03-03"), P("fr", "France", PARIS), P("be", "Belgium", [4.35, 50.85]), P("uk", "United Kingdom", LONDON),
        P("rs", "Montenegro", [18.92, 42.39], "1914-08-06"), P("jp", "Japan", TOKYO, "1914-08-23"), P("it", "Italy", ROME, "1915-05-23"), P("pt", "Portugal", [-9.14, 38.72], "1916-03-09"),
        P("ro", "Romania", [26.1, 44.43], "1916-08-27", "1918-05-07"), P("ro", "Romania", [26.1, 44.43], "1918-11-10"), P("us", "United States", WASH, "1917-04-06"), P("gr", "Greece", [23.73, 37.98], "1917-06-30")],
      [P("ah", "Austria-Hungary", [16.37, 48.21], null, "1918-11-03"), P("de1871", "German Empire", BERLIN), P("ot", "Ottoman Empire", [28.98, 41.01], "1914-10-29", "1918-10-30"), P("bg", "Bulgaria", [23.32, 42.7], "1915-10-14", "1918-09-29")]
    ],
    ww2europe: [
      [P("pl", "Poland", [21.01, 52.23]), P("uk", "United Kingdom", LONDON, "1939-09-03"), P("fr", "France", PARIS, "1939-09-03"), P("no", "Norway", [10.75, 59.91], "1940-04-09"),
        P("nl", "Netherlands", [4.9, 52.37], "1940-05-10"), P("be", "Belgium", [4.35, 50.85], "1940-05-10"), P("gr", "Greece", [23.73, 37.98], "1940-10-28"), P("yu", "Yugoslavia", [20.46, 44.82], "1941-04-06"),
        P("su", "Soviet Union", MOSCOW, "1941-06-22"), P("us", "United States", WASH, "1941-12-11"), P("it", "Italy", ROME, "1943-10-13"), P("ro", "Romania", [26.1, 44.43], "1944-08-24"), P("bg", "Bulgaria", [23.32, 42.7], "1944-09-08")],
      [P("de1935", "Germany", BERLIN, null, "1945-05-08"), P("it", "Italy", ROME, "1940-06-10", "1943-09-08"), P("bg", "Bulgaria", [23.32, 42.7], "1941-03-01", "1944-09-07"), P("ro", "Romania", [26.1, 44.43], "1941-06-22", "1944-08-23"),
        P("fi", "Finland", [24.94, 60.17], "1941-06-25", "1944-09-19"), P("hu", "Hungary", [19.04, 47.5], "1941-06-27", "1945-05-08")]
    ],
    ww2asia: [
      [P("cn", "China", [118.8, 32.06], null, "1937-11-19"), P("cn", "China", [106.55, 29.56], "1937-11-20"), P("us", "United States", WASH, "1941-12-08"), P("uk", "United Kingdom", LONDON, "1941-12-08"),
        P("nl", "Netherlands", [4.9, 52.37], "1941-12-08"), P("au", "Australia", [149.13, -35.28], "1941-12-08"), P("su", "Soviet Union", MOSCOW, "1945-08-09")],
      [P("jp", "Japan", TOKYO), P("th", "Thailand", [100.5, 13.75], "1942-01-25", "1945-08-16")]
    ],
    spain: [
      [P("esRep", "Spanish Republic", [-3.7, 40.42], null, "1936-11-06"), P("esRep", "Spanish Republic", [-0.38, 39.47], "1936-11-07", "1937-10-30"), P("esRep", "Spanish Republic", [2.17, 41.39], "1937-10-31", "1939-01-25"), P("esRep", "Spanish Republic", [-3.7, 40.42], "1939-01-26")],
      [P("esNat", "Nationalists", [-3.7, 42.34])]
    ],
    mexico: [
      [P("mx", "Mexico", [-99.13, 19.43], "2006-12-11")],
      [P(null, "Sinaloa Cartel", [-107.39, 24.8], null, null, "sinaloa"), P(null, "Los Zetas", [-99.51, 27.48], null, null, "zetas"), P(null, "Gulf Cartel", [-97.5, 25.87], null, null, "golfo"),
        P(null, "La Familia Michoacana", [-101.19, 19.7], null, null, "familia"), P(null, "Beltrán Leyva Organization", [-99.23, 18.92], null, null, "beltran"), P(null, "La Barbie's faction", [-99.88, 16.85], null, null, "barbie"),
        P(null, "Jalisco New Generation Cartel", [-103.35, 20.67], null, null, "cjng"), P(null, "Juárez Cartel", [-106.42, 31.69], null, null, "juarez"), P(null, "Tijuana Cartel", [-117.04, 32.51], null, null, "tijuana"),
        P(null, "Fuel-theft gangs", [-97.53, 18.84], null, null, "fuel")]
    ],
    syria: [
      [P("syGov", "Syrian government", [36.29, 33.51], null, "2024-12-07"), P("ru", "Russia", MOSCOW, "2015-09-30", "2024-12-07"), P("ir", "Iran", [51.39, 35.69], null, "2024-12-07")],
      [P("syRev", "Syrian opposition", [37.05, 36.59], null, "2024-12-07"), P("syRev", "Syrian transitional government", [36.29, 33.51], "2024-12-08"), P("tr", "Turkey", [32.85, 39.93], "2016-08-24")],
      [P(null, "Tahrir al-Sham", [36.63, 35.93], null, "2024-12-07", "syHts")],
      [P(null, "Kurdish-led forces (SDF)", [41.23, 37.05], null, null, "syKurd"), P("us", "United States", WASH, "2014-09-22")],
      [P(null, "Islamic State", [38.99, 35.95], null, null, "isis")],
      [P(null, "Druze militias", [36.57, 32.71], null, null, "druze"), P("il", "Israel", [35.21, 31.77], null, null, "israel")]
    ],
    israel: [
      [P("il", "Israel", [35.21, 31.77])],
      [P(null, "Hamas", [34.45, 31.5], null, null, "hamas")]
    ],
    ukraine: [
      [P("ua", "Ukraine", [30.52, 50.45])],
      [P("ru", "Russia", MOSCOW)]
    ],
    // The government's seat is Sanaa until the Houthis took it, then Aden.
    yemen: [
      [P("ye", "Yemeni government", [44.21, 15.35], null, "2015-02-05"), P("ye", "Yemeni government", [45.03, 12.78], "2015-02-06"),
        P("sa", "Saudi Arabia", [46.72, 24.63], "2015-03-26"), P("ae", "United Arab Emirates", [54.37, 24.47], "2015-03-26")],
      [P(null, "Houthis (Ansar Allah)", [44.21, 15.35], null, null, "yeHouthi")],
      [P("yeSouth", "Southern Transitional Council", [45.03, 12.78], "2017-05-11", null, "yeStc")],
      [P(null, "al-Qaeda in the Arabian Peninsula", [48.78, 14.54], null, null, "yeAqap")],
      [P(null, "Islamic State", [45.03, 12.78], null, null, "isis")]
    ]
  };
  var SIDE_GROUPS = { civilwar: ["union", "csa"], ww1: ["allies", "central"], ww2europe: ["allies", "axis"], ww2asia: ["allies", "axis"], spain: ["rep", "nat"] };
  var ISTANBUL = [28.95, 41.01], TOLEDO = [-4.03, 39.86], SEVILLE = [-5.97, 37.38], LEON = [-5.57, 42.6], PAVIA = [9.16, 45.18], DAMASCUS = [36.29, 33.51];
  var SEAT = function (ll, from, to) { return [ll[0], ll[1], from || null, to || null]; };
  var SEATS = {
    gothicwar: { goth: [SEAT([12.2, 44.42], null, "540-05-31"), SEAT(PAVIA, "540-06-01")], rom: [SEAT(ISTANBUL)] },
    lombards: { rom: [SEAT(ISTANBUL)], lom: [SEAT(PAVIA)] },
    hispania: { vis: [SEAT(TOLEDO)], uma: [SEAT(DAMASCUS)], ast: [SEAT([-5.84, 43.36])] },
    saxonwars: { fra: [SEAT([6.08, 50.78])] },
    sicily: { rom: [SEAT(ISTANBUL)], ara: [SEAT([10.1, 35.68])] },
    heathenarmy: { eng: [SEAT([-1.31, 51.06])] },
    normanconquest: { eng: [SEAT(LONDON, null, "1066-12-24")], nor: [SEAT([1.1, 49.44])] },
    toledo: { tol: [SEAT(TOLEDO)], bad: [SEAT([-6.97, 38.88])], cas: [SEAT(LEON)], zar: [SEAT([-0.88, 41.66])], sev: [SEAT(SEVILLE)], val: [SEAT([-0.38, 39.47])], alm: [SEAT([-8.0, 31.63])] },
    firstcrusade: { byz: [SEAT(ISTANBUL)], fat: [SEAT([31.25, 30.06])] },
    reconquista: { mus: [SEAT(SEVILLE, null, "1248-11-22")], cas: [SEAT(TOLEDO)], ara: [SEAT([-0.88, 41.66])], por: [SEAT([-8.42, 40.21])], leo: [SEAT(LEON, null, "1230-09-23")], gra: [SEAT([-3.61, 37.19])] },
    mongolinvasion: { vbu: [SEAT([49.07, 54.95])], rus: [SEAT([40.4, 56.14])], pol: [SEAT([19.94, 50.06])], boh: [SEAT([14.42, 50.09])], hun: [SEAT([18.74, 47.79])], mon: [SEAT([102.85, 47.21])] },
    hundredyears: { eng: [SEAT(LONDON)], fra: [SEAT(PARIS, null, "1418-05-28"), SEAT([2.4, 47.08], "1418-05-29", "1436-04-12"), SEAT(PARIS, "1436-04-13")], bur: [SEAT([5.02, 47.32])] },
    napoleonic: { fr: [SEAT(PARIS)], ru: [SEAT([30.31, 59.94])], pr: [SEAT(BERLIN)], at: [SEAT([16.37, 48.21])], uk: [SEAT(LONDON)], na: [SEAT([14.27, 40.85])] },
    ww2europe: { soviet: [SEAT(MOSCOW)], vichy: [SEAT([3.42, 46.12], "1940-07-10")] },
    ww2asia: { soviet: [SEAT(MOSCOW)], vichy: [SEAT([3.42, 46.12], "1940-07-10")] },
    syria: { syGov: [SEAT(DAMASCUS, null, "2024-12-07")], syNew: [SEAT(DAMASCUS, "2024-12-08")], usa: [SEAT(WASH)], israel: [SEAT([35.21, 31.77])] },
    yemen: { yeGov: [SEAT([44.21, 15.35], null, "2015-02-05"), SEAT([45.03, 12.78], "2015-02-06")] },
    israel: { israel: [SEAT([35.21, 31.77])], pa: [SEAT([35.21, 31.9])] },
    ukraine: { ukraine: [SEAT([30.52, 50.45])], russia: [SEAT(MOSCOW)] }
  };
  var warDay = function (iso) { var a = iso.split("-"); return dayFromDate(+a[0], +a[1], +a[2]); };
  function warParties(w, day) {
    var groups = WAR_PARTIES[w.key] || [], D = w.data, out = [];
    day = Math.min(day, w.last);
    groups.forEach(function (g) {
      var list = g.filter(function (p) {
        if (p.from && day < warDay(p.from)) return false;
        if (p.to && day > warDay(p.to)) return false;
        if (!p.side) return true;
        if (!D) return false;
        var k = -1;
        D.sides.forEach(function (s, i) { if (s[0] === p.side) k = i; });
        return k >= 0 && D.rows.some(function (r) { return r[0] === k && r[1] <= day && day <= r[2]; });
      });
      if (list.length) out.push(list);
    });
    return out;
  }
  // Every notable war of the date (data/wars.json, from Wikidata and the Wikipedia infoboxes; see tools/build-wars.mjs), after the wars
  // the zones of control draw. A side's member shows in the colour of the state at its capital on the map that date.
  var WARS_MAX = 30, allWars = null, allWarsLoad = null, allWarsMemo = { key: "", rows: [] };
  function loadAllWars() {
    if (!allWarsLoad) allWarsLoad = fetchJSON("data/wars.json").then(function (d) { allWars = d.wars; warsState = null; scheduleRender(); })
      .catch(function (e) { allWarsLoad = null; console.warn("wars", e); });
  }
  function memberColour(ll) {
    var p = ll ? polityAtLL(ll) : null;
    if (!p) return null;
    if (p.claims) return pal.colors[p.claimColors ? p.claimColors[0] : 0];
    return p.people ? pal["people-fill"] : pal.colors[p.color];
  }
  function warsAtDate() {
    if (!allWars) { loadAllWars(); return []; }
    var monthly = isMonthly(now), day = monthly ? dayOfTime(now) : null, y = yearOf(now);
    var key = (monthly ? "d" + day : "y" + y) + "|" + (current ? current.key || current.year || "" : "") + "|" + (current && current.polys ? current.polys.length : 0) + "|" + (pal.colors || []).join("");
    if (key === allWarsMemo.key) return allWarsMemo.rows;
    var rows = allWars.filter(function (w) {
      if (y < w[2] || y > w[4]) return false;
      if (monthly && w[3] !== null && day < w[3]) return false;
      if (monthly && w[5] !== null && day > w[5]) return false;
      return true;
    }).sort(function (a, b) { return b[6] - a[6]; }).slice(0, WARS_MAX).map(function (w) {
      return { name: w[0], loc: w[7], groups: w[8].map(function (side) {
        return side.map(function (m) {
          var ll = m[1] !== null && m[1] !== undefined ? [m[1], m[2]] : null, f = m.length > 3 ? m[3] : -1;
          return { name: m[0], ll: ll, sprite: f, colour: f >= 0 ? "" : memberColour(ll) };
        });
      }) };
    });
    allWarsMemo = { key: key, rows: rows };
    return rows;
  }
  function sideColour(w, key) {
    var c = "#888";
    if (w.data) w.data.sides.forEach(function (s) { if (s[0] === key) c = s[2]; });
    return c;
  }
  var warsTipTimer = 0;
  function warsTip(el, text) {
    hoverTip.textContent = text;
    var r = el.getBoundingClientRect();
    hoverTip.classList.add("is-on");
    var w = hoverTip.offsetWidth, h = hoverTip.offsetHeight;
    hoverTip.style.transform = "translate(" + Math.round(Math.max(6, Math.min(W - w - 6, r.left + r.width / 2 - w / 2))) + "px," + Math.round(r.top - h - 8) + "px)";
  }
  // The wars' names in the reader's language (since 25 November 2026): a war's name is its English Wikipedia article's
  // title, so English Wikipedia's language links give the title of the same article in the reader's Wikipedia, asked for
  // 50 at a time as the panel shows them. A war with no article there keeps its English name.
  var warNames = new Map();
  function warNameL(n) { return warNames.get(n) || n; }
  function warNamesFetch(names) {
    if (LANG === "en") return;
    var need = names.filter(function (n) { return !warNames.has(n); }).slice(0, 50);
    if (!need.length) return;
    need.forEach(function (n) { warNames.set(n, ""); });
    fetch("https://en.wikipedia.org/w/api.php?action=query&prop=langlinks&redirects=1&lllimit=max&format=json&origin=*&lllang=" + LANG + "&titles=" + encodeURIComponent(need.join("|"))).then(function (r) {
      return r.ok ? r.json() : null;
    }).then(function (d) {
      var q = d && d.query, back = {};
      if (!q || !q.pages) return;
      (q.normalized || []).forEach(function (x) { back[x.to] = x.from; });
      (q.redirects || []).forEach(function (x) { back[x.to] = back[x.from] || x.from; });
      Object.keys(q.pages).forEach(function (k) {
        var pg = q.pages[k], l = pg.langlinks && pg.langlinks[0];
        if (l && l["*"]) warNames.set(back[pg.title] || pg.title, l["*"]);
      });
      warsState = null;
      syncWars();
    }, function () {});
  }
  function syncWars() {
    if (!warsBox) return;
    var on = !!layers.control;
    if (warsBox.hidden === on) { warsBox.hidden = !on; scheduleRender(); }
    if (!on) return;
    if (!ctlIndex) { ctlLoadIndex(); return; }
    var day = ctlDay(), rows = [];
    ctlIndex.forEach(function (w) {
      if (!ctlOn(w, day)) return;
      if (!w.data) ctlLoad(w);
      var groups = warParties(w, day);
      if (groups.length) rows.push({ w: w, name: w.name, groups: groups });
    });
    warsAtDate().forEach(function (r) { rows.push(r); });
    warNamesFetch(rows.filter(function (r) { return !r.w; }).map(function (r) { return r.name; }));
    var state = rows.map(function (r) { return r.name + ":" + r.groups.map(function (g) { return g.map(function (p) { return p.name + p.ll + (p.colour || "") + (p.sprite >= 0 ? p.sprite : ""); }).join(","); }).join("|"); }).join(";");
    if (state === warsState) return;
    warsState = state;
    warsList.textContent = "";
    if (!rows.length) {
      var none = document.createElement("p");
      none.className = "ch-wars-none";
      none.textContent = T(allWars ? "No notable wars on this date" : "Looking up the wars of this date");
      warsList.appendChild(none);
    }
    rows.forEach(function (r) {
      var row = document.createElement("div"), name = document.createElement("p"), sides = document.createElement("div");
      row.className = "ch-wars-row"; name.className = "ch-wars-name"; sides.className = "ch-wars-sides";
      name.textContent = r.w ? T(r.name) : warNameL(r.name);
      r.groups.forEach(function (g, gi) {
        if (gi) { var vs = document.createElement("span"); vs.className = "ch-wars-vs"; vs.textContent = T("vs"); sides.appendChild(vs); }
        var grp = document.createElement("span");
        grp.className = "ch-wars-side";
        g.forEach(function (p) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "ch-wars-flag";
          var pn = sideNameL(p.name);
          b.setAttribute("aria-label", p.ll ? T("{name}, go to its capital", { name: pn }) : pn);
          if (!p.flag && !p.side && !(p.sprite >= 0)) b.classList.add("is-chip");
          if (!p.ll) b.classList.add("is-nowhere");
          b.innerHTML = p.sprite >= 0
            ? '<span class="ch-wars-sprite" aria-hidden="true"></span>'
            : p.flag
            ? '<svg width="21" height="14" viewBox="0 0 30 20" aria-hidden="true" focusable="false">' + FLAGS[p.flag] + "</svg>"
            : '<svg width="21" height="14" viewBox="0 0 30 20" aria-hidden="true" focusable="false"><rect width="30" height="20" fill="' + (r.w ? sideColour(r.w, p.side) : p.colour || pal.paper) + '"/></svg>';
          if (p.sprite >= 0) { b.firstChild.style.setProperty("--fx", p.sprite % 20); b.firstChild.style.setProperty("--fy", Math.floor(p.sprite / 20)); }
          if (canHover) {
            b.addEventListener("mouseenter", function () { warsTip(b, pn); });
            b.addEventListener("mouseleave", function () { hoverTip.classList.remove("is-on"); });
          }
          b.addEventListener("focus", function () { warsTip(b, pn); });
          b.addEventListener("blur", function () { hoverTip.classList.remove("is-on"); });
          // Without hover, a tap names the party for a few seconds as well as flying to it.
          b.addEventListener("click", function () {
            clearTimeout(warsTipTimer);
            if (canHover) hoverTip.classList.remove("is-on");
            else { warsTip(b, pn); warsTipTimer = setTimeout(function () { hoverTip.classList.remove("is-on"); }, 2600); }
            if (p.ll) flyTo(p.ll[0], p.ll[1], Math.max(localScale(), 1800));
          });
          grp.appendChild(b);
        });
        sides.appendChild(grp);
      });
      row.appendChild(name); row.appendChild(sides);
      warsList.appendChild(row);
    });
  }
  function setWarsOpen(open, keep) {
    warsList.hidden = !open;
    warsBtn.setAttribute("aria-expanded", open ? "true" : "false");
    warsBtn.setAttribute("aria-label", T(open ? "Hide the wars at this date" : "Show the wars at this date"));

    if (keep) try { localStorage.setItem(STORE_WARS, open ? "1" : "0"); } catch (e) {}
    scheduleRender();
  }
  var warsOpen = false;
  try { warsOpen = localStorage.getItem(STORE_WARS) === "1"; } catch (e) {}
  setWarsOpen(warsOpen, false);
  warsBtn.addEventListener("click", function () { setWarsOpen(warsList.hidden, true); });

  var STORE_CHANGES = "chronia-changes";
  var changesBox = $("changes"), changesBtn = $("changes-btn"), changesBody = $("changes-body"), changesDate = $("changes-date"), changesList = $("changes-list");
  var changesPrev = $("changes-prev"), changesNext = $("changes-next"), changesKey = "", changesTimer = 0, changesEvents = null, changesBounds = new WeakMap(), CHANGES_MAX = 12;
  function changeIndex(t) {
    var k = -1;
    for (var i = 0; i < points.length; i++) if (points[i] <= t + 1e-6) k = i;
    return k;
  }
  function timeBefore(p) {
    if (!isMonthly(p)) return Math.round(p) === 1 ? -1 : Math.round(p) - 1;
    var tb = timeOfDay(dayOfTime(p) - 1);
    return isMonthly(tb) ? tb : Math.floor(tb);
  }
  // The day an event of the dated table shows on, when the map does not change on its own day: a change between two
  // files (one span ending in a file's last year, the next beginning in the next file's first) is drawn on 1 January
  // between them (prepDays), so the Treaty of Adrianople of 14 September 1829 and Greece's independence of 3 February
  // 1830 both show on 1 January 1830, with their own dates beside them (since 25 November 2026).
  function eventShownOn(ds) {
    if (!dated || !/^\d{4}-\d\d-\d\d$/.test(ds)) return null;
    var y = +ds.slice(0, 4), dn = dayFromDate(y, +ds.slice(5, 7), +ds.slice(8, 10));
    if (!changeDaySet) changeDaySet = new Set(dated.days || []);
    if (changeDaySet.has(dn)) return null;
    for (var i = 1; i < dated.chunks.length; i++) {
      var f = dated.chunks[i].from;
      if (f > DAYS_FROM && (y === f || y === f - 1)) return f + "-01-01";
    }
    return null;
  }
  var changeDaySet = null;
  function changeDate(p) { return p < DAYS_FROM ? fmtYear(yearOf(p)) : fmtDay(dayOfTime(p)); }
  function snapFor(t) {
    if (isModern(t)) return loadModern().then(function () { return modernSnap(Math.min(dayOfTime(t), modern.toDay)); });
    if (isDated(t)) { var k = chunkIndexFor(t); return loadChunk(k).then(function () { return datedSnap(k, isMonthly(t) ? t : Math.round(t)); }); }
    return Promise.resolve(null);
  }
  // The dated events, with their sentences in the reader's language where lang/events-<code>.json has them (since
  // 25 November 2026; a sentence it lacks stays in English).
  function changesEventsLoad() {
    if (!changesEvents) changesEvents = Promise.all([
      fetchJSON("data/events.json").catch(function () { return []; }),
      LANG === "en" ? null : fetchJSON("lang/events-" + LANG + ".json").catch(function () { return null; })
    ]).then(function (r) {
      var tr = r[1];
      return tr ? r[0].map(function (e) { return tr[e[1]] ? [e[0], tr[e[1]]].concat(e.slice(2)) : e; }) : r[0];
    });
    return changesEvents;
  }
  function polityTotals(snap) {
    var m = new Map();
    snap.polys.forEach(function (p, i) {
      if (!p || p.people || p.claims || !p.label) return;
      var s = m.get(p.id);
      if (!s) { s = { id: p.id, km2: 0, big: -1, ll: null, ruler: -1, status: 0, cap: null, rows: [] }; m.set(p.id, s); }
      s.km2 += p.label[5];
      s.rows.push(p.row);
      if (p.label[5] > s.big) { s.big = p.label[5]; s.ll = [p.label[0], p.label[1]]; s.ruler = p.ruler >= 0 && p.ruler !== p.id ? p.ruler : -1; s.status = p.status || 0; s.cap = p.cap || null; }
    });
    return m;
  }
  // The rows each state's land (every piece, the ones too small for a name too), each people's land, or each piece of
  // disputed land is drawn from, to tell whether it changed.
  function pieceRows(snap, kind) {
    var m = new Map();
    snap.polys.forEach(function (p) {
      if (!p || p.row == null || (kind === "people" ? !p.people : kind === "claims" ? !p.claims : p.people || p.claims)) return;
      var s = m.get(p.id);
      if (!s) { s = { id: p.id, km2: 0, ll: p.label ? [p.label[0], p.label[1]] : null, rows: [] }; m.set(p.id, s); }
      s.rows.push(p.row);
      if (p.label) s.km2 += p.label[5];
    });
    return m;
  }
  function sameRows(a, b) {
    if (a.length !== b.length) return false;
    var x = a.slice().sort(), y = b.slice().sort();
    for (var i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
    return true;
  }
  function holderAt(snap, ll) {
    for (var i = 0; i < snap.polys.length; i++) {
      var p = snap.polys[i];
      if (!p || p.people || p.claims) continue;
      var g = snap.geoms.lo[i], b = changesBounds.get(g);
      if (!b) { b = d3.geoBounds(featOf(snap.topo.lo, "lo", g).geo); changesBounds.set(g, b); }
      var lon = ll[0], inLon = b[0][0] <= b[1][0] ? lon >= b[0][0] && lon <= b[1][0] : lon >= b[0][0] || lon <= b[1][0];
      if (!inLon || ll[1] < b[0][1] || ll[1] > b[1][1]) continue;
      if (d3.geoContains(featOf(snap.topo.lo, "lo", g).geo, ll)) return p.id;
    }
    return -1;
  }
  // What changed from one map to the next, as lines for the Changes panel. Since 24 November 2026 it also names the
  // smaller changes that used to leave only "The borders shift a little on this date": a colony becoming a protectorate
  // and the like, a capital that moves, a small territory that grows or shrinks by a fifth or more (Hong Kong in 1898),
  // and, when nothing larger changes, the states whose borders move by less than the threshold or are redrawn with no
  // change of area, and the peoples whose land changes. Rows are compared only when both maps come from the same file,
  // since rows are numbered per file.
  function changeLines(before, after, tb, ta) {
    var A = polityTotals(before), B = polityTotals(after), out = [], used = new Set(), gained = new Set(), gone = [], added = [], told = new Set();
    var big = function (x, y) { return y.km2 - x.km2; };
    A.forEach(function (s, id) { if (!B.has(id)) gone.push(s); });
    B.forEach(function (s, id) { if (!A.has(id)) added.push(s); });
    gone.sort(big); added.sort(big);
    gone.forEach(function (g) { g.to = g.ll ? holderAt(after, g.ll) : -1; });
    added.forEach(function (a) {
      var from = gone.filter(function (g) { return g.to === a.id; });
      from.forEach(function (g) { used.add(g.id); });
      if (!from.length) out.push({ kind: "new", a: a });
      else if (from.length === 1 && Math.abs(from[0].km2 - a.km2) <= 0.05 * Math.max(a.km2, from[0].km2)) out.push({ kind: "renamed", g: from[0], a: a });
      else out.push({ kind: "formed", a: a, from: from });
    });
    gone.forEach(function (g) {
      if (used.has(g.id)) return;
      if (g.to >= 0 && B.has(g.to)) { out.push({ kind: "joined", g: g, a: B.get(g.to) }); gained.add(g.to); }
      else out.push({ kind: "ended", g: g });
    });
    var moved = [], slight = [], sameFile = before.topo && after.topo && before.topo.lo === after.topo.lo;
    var dayA = tb == null ? null : dayOfTime(tb), dayB = ta == null ? null : dayOfTime(ta);
    out.forEach(function (l) { [l.a, l.g].forEach(function (x) { if (x) told.add(x.id); }); });
    B.forEach(function (s, id) {
      var p = A.get(id);
      if (!p) return;
      var who = function (r) { return B.get(r) || A.get(r) || { id: r, ll: null, km2: 0 }; }, said = false;
      if (p.ruler !== s.ruler) { out.push(s.ruler >= 0 ? { kind: "under", a: s, r: who(s.ruler) } : { kind: "free", a: s, r: who(p.ruler) }); said = true; }
      else if (s.ruler >= 0 && s.status !== p.status && s.status > 0 && s.status < DISPUTED) { out.push({ kind: "status", a: s, r: who(s.ruler), st: s.status }); said = true; }
      if (p.cap && s.cap && dayA != null && dayB != null) {
        var ca = capitalAt(p.cap, dayA), cb = capitalAt(s.cap, dayB);
        if (ca[0] && cb[0] && ca[0] !== cb[0] && Math.hypot(ca[1] - cb[1], ca[2] - cb[2]) > 0.1) { out.push({ kind: "capital", a: s, x: ca, y: cb }); said = true; }
      }
      var d = s.km2 - p.km2, ad = Math.abs(d);
      if (gained.has(id)) return;
      if (ad >= 1) s.sd = d;
      if ((ad >= 1500 && ad >= 0.02 * p.km2) || (ad >= 10 && ad >= 0.2 * p.km2)) moved.push({ s: s, d: ad });
      else if (!said && !told.has(id) && ad >= 1) slight.push({ s: s, d: ad });
    });
    moved = takings(before, after, moved, out);
    moved.sort(function (x, y) { return y.d - x.d; });
    if (moved.length) out.push({ kind: "moved", list: moved.map(function (m) { return m.s; }) });
    if (out.length) return out;
    slight = takings(before, after, slight, out);
    if (sameFile) {
      var RA = pieceRows(before, "state"), RB = pieceRows(after, "state"), inSlight = new Set(slight.map(function (m) { return m.s.id; }));
      RB.forEach(function (s, id) {
        var p = RA.get(id);
        if (p && !inSlight.has(id) && !told.has(id) && !sameRows(p.rows, s.rows)) slight.push({ s: B.get(id) || s, d: 0 });
      });
    }
    slight.sort(function (x, y) { return y.d - x.d || y.s.km2 - x.s.km2; });
    var paired = new Set();
    slight.forEach(function (m, i) {
      if (paired.has(m.s.id)) return;
      for (var j = i + 1; j < slight.length; j++) {
        var o = slight[j];
        if (paired.has(o.s.id) || !(bordering(after, m.s.id, o.s.id) || bordering(before, m.s.id, o.s.id))) continue;
        paired.add(m.s.id); paired.add(o.s.id);
        out.push({ kind: "between", a: m.s, b: o.s });
        return;
      }
    });
    slight = slight.filter(function (m) { return !paired.has(m.s.id); });
    if (slight.length) out.push({ kind: "slight", list: slight.map(function (m) { return m.s; }) });
    if (sameFile) {
      var CA = new Set(), disputed = new Map(), PA = pieceRows(before, "people"), PB = pieceRows(after, "people"), lands = [];
      before.polys.forEach(function (p) { if (p && p.claims) CA.add(p.row); });
      after.polys.forEach(function (p) {
        if (p && p.claims && !CA.has(p.row)) p.claims.forEach(function (c) { if (!disputed.has(c)) { var w = B.get(c) || A.get(c); disputed.set(c, { id: c, ll: w ? w.ll : null, km2: w ? w.km2 : 0 }); } });
      });
      if (disputed.size) out.push({ kind: "disputed", list: Array.from(disputed.values()) });
      PB.forEach(function (s, id) { var p = PA.get(id); if (p && !sameRows(p.rows, s.rows)) lands.push(s); });
      lands.sort(function (x, y) { return y.km2 - x.km2; });
      if (lands.length) out.push({ kind: "lands", list: lands });
    }
    return out;
  }
  // Pairs a state that gained land with a neighbour (on either map) that lost about as much (from half to twice of what it
  // has not yet given to a larger gainer), and says the one took it from the other; returns the rest (since 25 November 2026).
  function takings(before, after, list, out) {
    var gain = list.filter(function (m) { return m.s.sd > 0; }).sort(function (x, y) { return y.d - x.d; });
    var lose = list.filter(function (m) { return m.s.sd < 0; }), used = new Set(), left = new Map();
    lose.forEach(function (l) { left.set(l.s.id, l.d); });
    gain.forEach(function (g) {
      var best = null, fit = 0;
      lose.forEach(function (l) {
        var rest = left.get(l.s.id), f = Math.min(g.d, rest) / Math.max(g.d, rest);
        if (f >= 0.5 && f > fit && (bordering(after, g.s.id, l.s.id) || bordering(before, g.s.id, l.s.id))) { best = l; fit = f; }
      });
      if (!best) return;
      used.add(g.s.id); used.add(best.s.id);
      left.set(best.s.id, Math.max(0, left.get(best.s.id) - g.d));
      out.push({ kind: "took", a: g.s, b: best.s, km: g.d });
    });
    return list.filter(function (m) { return !used.has(m.s.id); });
  }
  function bordering(snap, a, b) {
    if (!snap.geoms || !snap.geoms.lo) return false;
    if (!snap.nb) snap.nb = topojson.neighbors(snap.geoms.lo);
    for (var i = 0; i < snap.polys.length; i++) {
      var p = snap.polys[i];
      if (!p || p.id !== a || p.people) continue;
      var n = snap.nb[i];
      for (var j = 0; j < n.length; j++) { var q = snap.polys[n[j]]; if (q && q.id === b) return true; }
    }
    return false;
  }
  function fmtKm(n) { return Number(n >= 100 ? n.toPrecision(2) : Math.round(n)).toLocaleString(LANG); }
  function withKm(parts, x) { return typeof x.sd === "number" ? parts.concat(" (" + (x.sd > 0 ? "+" : "\u2212") + fmtKm(Math.abs(x.sd)) + " km\u00b2)") : parts; }
  function changeName(s, here) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "ch-changes-name";
    b.textContent = polityNameL(s.id) || "a state";
    b.addEventListener("click", function () {
      if (!s.ll) return;
      if (here && current && current.byId && current.byId.has(s.id)) goSearch({ id: s.id, ll: s.ll, km2: s.km2 });
      else flyTo(s.ll[0], s.ll[1], scaleFor(s.km2, 200, 6000));
    });
    return b;
  }
  var THE_FIRST = /^(Kingdoms?|Empire|Republic|Duch(y|ies)|Grand Duchy|Archduchy|Principalit(y|ies)|County|Margraviate|Electorate|Landgraviate|Sultanate|Khanate|Emirate|Caliphate|Regency|Beylik|Free City|Commonwealth|Confederation|Federation|Union|United|Viceroyalty|Captaincy|Colony|Territory|Protectorate|Prince-Bishopric|Bishopric|Archbishopric|Lordship|Despotate|Imamate|Shogunate|Tsardom|Grand Principality|Khedivate|Dominion|Holy|Papal|Joint|State of)\b/;
  var THE_LAST = /(Empire|Confederation|Republic|[Dd]ynasty|Kingdom|kingdoms|Union|Caliphate|Sultanate|Khanate|Emirate|Islands|States|states|city-states|chiefdoms|Coalition|Horde|Raj|Netherlands|Philippines|Bahamas|Gambia|Commonwealth|Federation|Shogunate|Republics|Provinces|Territories|Isles|Emirates|Free State|Consulate|Directory|Mandate|Colony|Company|Territory|Protectorate|Dominion|Province|Governorate|Viceroyalty)$/;
  var PLURAL = /(Islands|States|states|kingdoms|city-states|chiefdoms|Provinces|Territories|Isles|Emirates|Netherlands|Philippines|Bahamas|Republics)$/;
  function verb(s, one, many) { return PLURAL.test(polityName(s.id) || "") ? many : one; }
  function named(s, here, first) {
    var n = polityName(s.id) || "";
    return THE_FIRST.test(n) || THE_LAST.test(n) ? [first ? "The " : "the ", changeName(s, here)] : [changeName(s, here)];
  }
  var STATUS_A = ["", "a colony", "a protectorate", "a mandate", "an occupied territory", "a dependency"];
  var STATUS_BECOMES = ["", "{a} becomes a colony of {b}.", "{a} becomes a protectorate of {b}.", "{a} becomes a mandate of {b}.", "{a} becomes an occupied territory of {b}.", "{a} becomes a dependency of {b}."];
  function changeLine(parts, cls) {
    var p = document.createElement("p");
    p.className = "ch-changes-line" + (cls ? " " + cls : "");
    parts.forEach(function (x) { p.appendChild(typeof x === "string" ? document.createTextNode(x) : x); });
    return p;
  }
  function listOf(items, more) {
    var out = [];
    items.forEach(function (n, i) {
      if (i) out.push(more ? T(", ") : items.length === 2 ? T(" and ") : i === items.length - 1 ? T(", and ") : T(", "));
      out = out.concat(n);
    });
    if (more) out.push(T(", and {n} more", { n: more }));
    return out;
  }
  function tplParts(tpl, vals) {
    var out = [];
    tpl.split(/(\{\w+\})/).forEach(function (part) { var m = /^\{(\w+)\}$/.exec(part); if (!m) { if (part) out.push(part); } else out = out.concat(vals[m[1]]); });
    return out;
  }
  function renderChanges(p, lines, events, seam, still) {
    changesList.textContent = "";
    events.forEach(function (e) {
      var parts = [e[1].replace(/[.。]?$/, LANG === "ja" || LANG === "zh" ? "。" : ".")];
      if (/^https:\/\//.test(e[2])) {
        var a = document.createElement("a");
        a.className = "ch-changes-src";
        a.href = e[2]; a.target = "_blank"; a.rel = "noopener noreferrer";
        a.textContent = T("Source");
        parts.push(a);
      }
      changesList.appendChild(changeLine(parts, "ch-changes-event"));
    });
    if (seam) changesList.appendChild(changeLine([seam], "ch-changes-none"));
    var shown = 0;
    lines.forEach(function (l) {
      if (shown >= CHANGES_MAX) return;
      shown++;
      var row, six = function (list, here) { return list.slice(0, 6).map(function (x) { return withKm(named(x, here, false), x); }); };
      if (LANG !== "en") {
        var nm = function (x, here) { return [changeName(x, here)]; }, lst = function (list, here) { return listOf(list.slice(0, 6).map(function (x) { return withKm(nm(x, here), x); }), Math.max(0, list.length - 6)); };
        row = l.kind === "new" ? tplParts(T("{a} appears on the map."), { a: nm(l.a, true) })
          : l.kind === "renamed" ? tplParts(T("{a} becomes {b}."), { a: nm(l.g, false), b: nm(l.a, true) })
          : l.kind === "formed" ? tplParts(T("{a} is formed from {list}."), { a: nm(l.a, true), list: lst(l.from, false) })
          : l.kind === "joined" ? tplParts(T("{a} passes to {b}."), { a: nm(l.g, false), b: nm(l.a, true) })
          : l.kind === "ended" ? tplParts(T("{a} leaves the map."), { a: nm(l.g, false) })
          : l.kind === "under" ? tplParts(T("{a} comes under {b}."), { a: nm(l.a, true), b: nm(l.r, true) })
          : l.kind === "free" ? tplParts(T("{a} is no longer under {b}."), { a: nm(l.a, true), b: nm(l.r, false) })
          : l.kind === "status" ? tplParts(T(STATUS_BECOMES[l.st]), { a: nm(l.a, true), b: nm(l.r, true) })
          : l.kind === "capital" ? tplParts(T("The capital of {a} moves from {x} to {y}."), { a: nm(l.a, true), x: [capitalNameL(l.x)], y: [capitalNameL(l.y)] })
          : l.kind === "slight" ? tplParts(T("The borders of {list} shift slightly."), { list: lst(l.list, true) })
          : l.kind === "lands" ? tplParts(T("The lands of {list} change."), { list: lst(l.list, true) })
          : l.kind === "disputed" ? tplParts(T("Land becomes disputed between {list}."), { list: lst(l.list, true) })
          : l.kind === "between" ? tplParts(T("The border between {a} and {b} shifts slightly."), { a: nm(l.a, true), b: nm(l.b, true) })
          : l.kind === "took" ? tplParts(T("{a} takes about {n} km² from {b}."), { a: nm(l.a, true), n: [fmtKm(l.km)], b: nm(l.b, true) })
          : tplParts(T(lines.length > 1 ? "Borders also move for {list}." : "Borders move for {list}."), { list: lst(l.list, true) });
      }
      else if (l.kind === "new") row = named(l.a, true, true).concat(verb(l.a, " appears", " appear") + " on the map.");
      else if (l.kind === "renamed") row = named(l.g, false, true).concat(verb(l.g, " becomes ", " become "), named(l.a, true, false), ".");
      else if (l.kind === "formed") row = named(l.a, true, true).concat(verb(l.a, " is", " are") + " formed from ", listOf(six(l.from, false), Math.max(0, l.from.length - 6)), ".");
      else if (l.kind === "joined") row = named(l.g, false, true).concat(verb(l.g, " passes", " pass") + " to ", named(l.a, true, false), ".");
      else if (l.kind === "ended") row = named(l.g, false, true).concat(verb(l.g, " leaves", " leave") + " the map.");
      else if (l.kind === "under") row = named(l.a, true, true).concat(verb(l.a, " comes", " come") + " under ", named(l.r, true, false), ".");
      else if (l.kind === "free") row = named(l.a, true, true).concat(verb(l.a, " is", " are") + " no longer under ", named(l.r, false, false), ".");
      else if (l.kind === "moved") row = [lines.length > 1 ? "Borders also move for " : "Borders move for "].concat(listOf(six(l.list, true), Math.max(0, l.list.length - 6)), ".");
      else if (l.kind === "status") row = named(l.a, true, true).concat(verb(l.a, " becomes ", " become ") + STATUS_A[l.st] + " of ", named(l.r, true, false), ".");
      else if (l.kind === "capital") row = ["The capital of "].concat(named(l.a, true, false), " moves from " + capitalNameL(l.x) + " to " + capitalNameL(l.y) + ".");
      else if (l.kind === "slight") row = ["The borders of "].concat(listOf(six(l.list, true), Math.max(0, l.list.length - 6)), " shift slightly.");
      else if (l.kind === "lands") row = ["The lands of "].concat(listOf(six(l.list, true), Math.max(0, l.list.length - 6)), " change.");
      else if (l.kind === "disputed") row = ["Land becomes disputed between "].concat(listOf(six(l.list, true), Math.max(0, l.list.length - 6)), ".");
      else if (l.kind === "between") row = ["The border between "].concat(named(l.a, true, false), " and ", named(l.b, true, false), " shifts slightly.");
      else if (l.kind === "took") row = named(l.a, true, true).concat(verb(l.a, " takes", " take") + " about " + fmtKm(l.km) + " km\u00b2 from ", named(l.b, true, false), ".");
      changesList.appendChild(changeLine(row));
    });
    if (lines.length > CHANGES_MAX) changesList.appendChild(changeLine([T(lines.length - CHANGES_MAX === 1 ? "And {n} more change." : "And {n} more changes.", { n: lines.length - CHANGES_MAX })], "ch-changes-none"));
    if (!events.length && !lines.length && !seam) changesList.appendChild(changeLine([T(still ? "Nothing on the map changes on this date." : "The borders shift a little on this date, with no state gained or lost.")], "ch-changes-none"));
    scheduleRender();
  }
  function showChanges(k, key) {
    var p = points[k];
    changesDate.textContent = changeDate(p);
    changesPrev.disabled = k <= 0;
    changesNext.disabled = k >= points.length - 1;
    if (k === 0) { renderChanges(p, [], [], T("The atlas begins here.")); return; }
    var tb = timeBefore(p), seam = isModern(p) && !isModern(tb) ? T("From this day the borders come from CShapes 2.0 rather than Cliopatria, so many names and lines change here because the source does.") : "";
    changesList.textContent = "";
    changesList.appendChild(changeLine([T("Looking up the changes")], "ch-changes-none"));
    var day = p >= DAYS_FROM ? storedDate(p) : null;
    Promise.all([seam ? null : snapFor(tb), seam ? null : snapFor(p), changesEventsLoad()]).then(function (r) {
      if (changesKey !== key) return;
      var events = day ? r[2].filter(function (e) { return e[0] === day; }).concat(r[2].filter(function (e) { return e[0] !== day && eventShownOn(e[0]) === day; }).map(function (e) {
        var d = e[0].split("-");
        return [e[0], fmtDay(dayFromDate(+d[0], +d[1], +d[2])) + ": " + e[1], e[2]];
      })) : [];
      renderChanges(p, r[0] && r[1] ? changeLines(r[0], r[1], tb, p) : [], events, seam, !!(r[0] && r[1] && r[0].key === r[1].key));
    }).catch(function (e) {
      console.warn("changes", e);
      if (changesKey !== key) return;
      changesList.textContent = "";
      changesList.appendChild(changeLine([T("The changes of this date could not be loaded.")], "ch-changes-none"));
    });
  }
  function syncChanges() {
    if (!changesBox || changesBody.hidden || !ready || !points.length) return;
    var k = changeIndex(now), key = k >= 0 ? String(points[k]) : "none";
    if (key === changesKey) return;
    changesKey = key;
    clearTimeout(changesTimer);
    if (k < 0) { changesDate.textContent = ""; changesList.textContent = ""; return; }
    changesTimer = setTimeout(function () { if (changesKey === key) showChanges(k, key); }, playMode ? 0 : 120);
  }
  function setChangesOpen(open, keep) {
    changesBody.hidden = !open;
    changesBox.classList.toggle("is-open", open);
    changesBtn.setAttribute("aria-expanded", open ? "true" : "false");
    changesBtn.setAttribute("aria-label", T(open ? "Hide what changed at this date" : "Show what changed at this date"));
    if (keep) try { localStorage.setItem(STORE_CHANGES, open ? "1" : "0"); } catch (e) {}
    changesKey = "";
    if (open) syncChanges();
    scheduleRender();
  }
  if (changesBox) {
    var changesOpen = false;
    try { changesOpen = localStorage.getItem(STORE_CHANGES) === "1"; } catch (e) {}
    setChangesOpen(changesOpen, false);
    changesBtn.addEventListener("click", function () { setChangesOpen(changesBody.hidden, true); });
    changesPrev.addEventListener("click", function () { var k = changeIndex(now); stopPlay(); if (k > 0) setTime(points[k - 1]); });
    changesNext.addEventListener("click", function () { var k = changeIndex(now); stopPlay(); if (k + 1 < points.length) setTime(points[k + 1]); });
  }
  syncWars();
  // A button's hint shows on hover and, for the keyboard, when the button takes focus.
  function showHint(el, wait) {
    clearTimeout(tipTimer);
    tipTimer = setTimeout(function () {
      hoverTip.textContent = el.getAttribute("data-tip");
      var r = el.getBoundingClientRect(), top = !!el.closest(".ch-top");
      hoverTip.classList.add("is-on");
      var w = hoverTip.offsetWidth, h = hoverTip.offsetHeight;
      var x = Math.max(6, Math.min(W - w - 6, r.left + r.width / 2 - w / 2));
      var y = top ? el.closest(".ch-frame").getBoundingClientRect().bottom + 8 : r.top - h - 8;
      hoverTip.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)";
    }, wait);
  }
  function hideHint() { clearTimeout(tipTimer); hoverTip.classList.remove("is-on"); }
  document.querySelectorAll("[data-tip]").forEach(function (el) {
    if (canHover) {
      el.addEventListener("mouseenter", function () { showHint(el, 380); });
      el.addEventListener("mouseleave", hideHint);
    }
    el.addEventListener("focus", function () { if (el.matches(":focus-visible")) showHint(el, 120); });
    el.addEventListener("blur", hideHint);
    el.addEventListener("click", hideHint);
  });

  document.addEventListener("keydown", function (e) {
    var t = e.target, typing = t && ((t.tagName === "INPUT" && t.type === "text") || t.tagName === "TEXTAREA");
    if (e.key === "Escape") {
      if (about.classList.contains("is-open")) { setAbout(false); return; }
      if (!card.hidden) closeCard();
      return;
    }
    if (typing || exporting || e.metaKey || e.ctrlKey || e.altKey || t === range) return;
    // The arrow keys move the map a little that way (Noah, 25 November 2026); until then they moved the date, which the
    // number keys do now. 4 and 7 go to the change before and the next (before, Shift ← and →).
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); panKey(e.key); }
    else if (!e.shiftKey && (e.code === "Digit4" || e.code === "Numpad4")) { e.preventDefault(); stopPlay(); stepMap(-1); }
    else if (!e.shiftKey && (e.code === "Digit7" || e.code === "Numpad7")) { e.preventDefault(); stopPlay(); stepMap(1); }
    else if (e.key === "D" && e.shiftKey) openDev();
    // The number keys move the date as the keys beside it do: 1, 2, 3 back a year, a month, a day; 8, 9, 0 forward a day,
    // a month, a year (Noah, 25 November 2026). The top row's digits or the keypad's, without Shift.
    else if (!e.shiftKey && DATE_KEYS[e.code]) { e.preventDefault(); $(DATE_KEYS[e.code]).click(); }
    else if (e.key === "p" || e.key === "P") togglePlay(false);
    else if (e.key === "o" || e.key === "O") togglePlay(true);
    else if (e.key === "," || e.key === "<") stepPlaySpeed(-1);
    else if (e.key === "." || e.key === ">") stepPlaySpeed(1);
    else if (e.key === "m" || e.key === "M") setFlat(!flat);
    else if (e.key === "[") $("turn-left").click();
    else if (e.key === "]") $("turn-right").click();
    else if (e.key === "n" || e.key === "N") turnTo(0);
    else if (e.key === "+" || e.key === "=") zoomAt(view.zoom * 1.6, cx, cy);
    else if (e.key === "-" || e.key === "_" || e.key === "−") zoomAt(view.zoom / 1.6, cx, cy);
  });

  var hashTimer = 0;
  function writeHash() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(function () {
      if (!ready) return;
      var h = "?y=" + hashTime() + "&v=" + view.lon.toFixed(2) + "," + view.lat.toFixed(2) + "," + view.zoom.toFixed(2) + (!flat && Math.abs(view.roll) >= 0.05 ? "," + view.roll.toFixed(1) : "") + (flat ? "&flat=1" : "") + (devOpen ? "&dev" : "") + (perf ? "&fps" + (perf.gpu ? "&gpu" : "") : "") + (moveFloor === 1 && addrHas("full") ? "&full" : "");
      if (location.search + location.hash !== h) try { history.replaceState(null, "", location.pathname + h); } catch (e) {}
    }, 250);
  }
  function hashTime() {
    if (!isMonthly(now)) return String(Math.round(now)) + (ctlMonth && layers.control ? "-" + (ctlMonth < 10 ? "0" : "") + ctlMonth : "");
    var d = dateOfDay(dayOfTime(now));
    return d[0] + "-" + (d[1] < 10 ? "0" : "") + d[1] + "-" + (d[2] < 10 ? "0" : "") + d[2];
  }
  function readHash() {
    var out = {};
    [location.hash, location.search].map(function (s) { return String(s || "").replace(/^[#?]/, ""); }).join("&").split("&").forEach(function (kv) {
      var i = kv.indexOf("=");
      if (i > 0) try { out[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); } catch (e) {}
      else if (/^-?\d+(-\d+){0,2}$/.test(kv)) out.y = kv;
    });
    return out;
  }

  function refitDate() { if (document.activeElement !== yearInput && ready) yearInput.value = fitDate(fmtNow(now)); }
  window.addEventListener("resize", function () { layout(); scheduleRender(); refitDate(); });
  // The title and the menu change width when the page's fonts arrive (and with the sign-in state), after the first layout
  // has placed the banner between them; laid out again then, the banner keeps clear of both instead of keeping the
  // fallback font's gap (it overlapped the menu on a phone, 20 November 2026).
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { inkReset(); layout(); scheduleRender(); refitDate(); placeEvents(); });
  // Whenever a face arrives (the italic comes after the roman, when a people's name first needs it), the widths measured and
  // the sprites drawn in the face that stood in for it are let go. Before 23 November 2026 only the roman's arrival did this,
  // so an italic name set letter by letter kept the stand-in's wider letter widths, and its letters stood too far apart.
  // Only the map's own faces count: an interface face that arrives when a panel first opens leaves the names as they are.
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", function (e) {
    var faces = e && e.fontfaces;
    if (faces && faces.length && !faces.some(function (f) { return /IM Fell English|Old Standard TT/i.test(f.family || ""); })) return;
    widthCache.clear(); glyphSizes.clear(); labelCache.clear(); inkReset(); scheduleRender();
  });
  if (window.ResizeObserver) {
    var topRowW = "", topRowFrame = 0, topRowRO = new ResizeObserver(function () {
      var w = $("head").offsetWidth + "|" + $("ctls").offsetWidth;
      if (w === topRowW || topRowFrame) return;
      topRowW = w;
      topRowFrame = requestAnimationFrame(function () { topRowFrame = 0; layout(); scheduleRender(); });
    });
    topRowRO.observe($("head")); topRowRO.observe($("ctls"));
  }
  if (phoneQuery.addEventListener) phoneQuery.addEventListener("change", function () { layout(); scheduleRender(); });

  // The first map is drawn before the opening starts, and what can wait (the sharper land, the seas'
  // depths, the rivers and lakes) is fetched and prepared one piece at a time after it has played, so the
  // opening runs on a quiet page. afterIntro(f) runs f once that time has come, in the order asked.
  var introQueue = [], introOver = false;
  function afterIntro(f) { if (introOver) f(); else introQueue.push(f); }
  function endIntro() {
    introOver = true;
    adsPlace();   // the banner under the top row, kept back while the page loads and opens, shows now in the room kept for it
    scheduleRender();
    var next = function () {
      var f = introQueue.shift();
      if (!f) return;
      try { f(); } catch (e) { console.error(e); }
      setTimeout(next, 250);
    };
    next();
  }
  function reveal() {
    ready = true;
    try { draw(); } catch (e) { console.error(e); }
    $("load").classList.add("is-gone");
    requestAnimationFrame(function () {
      var introMs = playIntro() ? 2700 : 0;
      setTimeout(endIntro, introMs);
      setTimeout(maybeTour, introMs + 600);
      scheduleRender();
    });
  }
  function playIntro() {
    var root = document.documentElement;
    if (root.classList.contains("ch-ready")) return false;
    // The paper roll opens the atlas once a visit: a reader coming back in the same tab finds the map already laid out.
    var seen = false;
    try { seen = sessionStorage.getItem("chronia-opened") === "1"; sessionStorage.setItem("chronia-opened", "1"); } catch (e) {}
    var play = !reduceMotion && !seen;
    if (play) {
      var veil = document.createElement("div");
      veil.className = "ch-veil";
      veil.setAttribute("aria-hidden", "true");
      veil.innerHTML = '<div class="ch-veil-paper"></div><div class="ch-roll"></div>';
      document.body.appendChild(veil);
      root.classList.add("ch-intro");
      setTimeout(function () { root.classList.remove("ch-intro"); veil.remove(); }, 3000);
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
  // A stretch of the grid, gw by gh cells from (gx, gy), marked into a from the land in list.
  function markCoastGrid(list, a, gx, gy, gw, gh, fillPath) {
    var cv = document.createElement("canvas"), k = GRID_W / 360;
    cv.width = gw; cv.height = gh;
    var g = cv.getContext("2d", { willReadFrequently: true });
    g.translate(-gx, -gy);
    g.fillStyle = "#000"; g.fill(fillPath || coastFill(list), "evenodd");
    g.globalCompositeOperation = "destination-out";
    g.lineJoin = "round"; g.lineCap = "round";
    g.lineWidth = 2 * COAST_KM * k / 111.195;
    // A patch of the grid is redone from the land near it, which may be a whole continent: the stretches of its coast
    // too far from the patch to mark it (wholly to one side of it, by more than the line's reach) are left out, as
    // stroking all of them took most of the half second a far-off date's patches cost (12 November 2026). Each
    // line's place on the grid is kept (gx, gy).
    var far = g.lineWidth / 2 + 2, x0 = gx - far, x1 = gx + gw + far, y0 = gy - far, y1 = gy + gh + far;
    list.forEach(function (p) {
      p.coast.forEach(function (L) {
        (L.parts || [L]).forEach(function (q) {
          var i;
          if (!q.gx) {
            q.gx = new Float64Array(q.n); q.gy = new Float64Array(q.n);
            for (i = 0; i < q.n; i++) {
              var lon = Math.atan2(q.y[i], q.x[i]) / D2R, lat = Math.asin(Math.max(-1, Math.min(1, q.z[i]))) / D2R;
              q.gx[i] = (lon + 180) * k; q.gy[i] = (90 - lat) * k;
            }
          }
          var X = q.gx, Y = q.gy, pen = false, was = 0, any = false;
          g.beginPath();
          for (i = 0; i < q.n; i++) {
            var x = X[i], y = Y[i], side = (x < x0 ? 1 : x > x1 ? 2 : 0) | (y < y0 ? 4 : y > y1 ? 8 : 0);
            if (i && !(side & was)) {
              if (!pen) g.moveTo(X[i - 1], Y[i - 1]);
              g.lineTo(x, y);
              pen = any = true;
            } else pen = false;
            was = side;
          }
          if (any) g.stroke();
        });
      });
    });
    var px = g.getImageData(0, 0, gw, gh).data;
    for (var yy = 0; yy < gh; yy++) for (var xx = 0; xx < gw; xx++) a[(gy + yy) * GRID_W + gx + xx] = px[(yy * gw + xx) * 4 + 3] > 127 ? 1 : 0;
  }
  function coastFill(list) {
    var k = GRID_W / 360, path = new Path2D();
    list.forEach(function (p) {
      p.geo.coordinates.forEach(function (ring) {
        for (var i = 0; i < ring.length; i++) {
          var x = (ring[i][0] + 180) * k, y = (90 - ring[i][1]) * k;
          if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
        }
        if (ring.length) path.lineTo((ring[0][0] + 180) * k, (90 - ring[0][1]) * k);
      });
    });
    return path;
  }
  function buildCoastGrid(list, box) {
    try {
      var k = GRID_W / 360, gx = 0, gy = 0, gw = GRID_W, gh = GRID_H;
      if (box) {
        var mg = Math.ceil(2 * COAST_KM * k / 111.195) + 2;
        gx = Math.max(0, Math.floor((box[0] + 180) * k) - mg); gy = Math.max(0, Math.floor((90 - box[3]) * k) - mg);
        gw = Math.min(GRID_W, Math.ceil((box[2] + 180) * k) + mg) - gx; gh = Math.min(GRID_H, Math.ceil((90 - box[1]) * k) + mg) - gy;
      }
      var a = box && coastGrid ? coastGrid.a : new Uint8Array(GRID_W * GRID_H);
      markCoastGrid(list, a, gx, gy, gw, gh);
      coastGrid = { a: a, k: k, r: COAST_KM * k / 111.195 };
    } catch (e) { coastGrid = null; }
  }
  // The whole grid afresh, a band of rows at a time with the page free to draw between them: all at once it held the
  // page for a third of a second on a laptop (12 November 2026), in the middle of the zoom that called for the finer
  // coast. then() is given the grid, or nothing if a later rebuild has overtaken this one.
  var GRID_BAND = 120, gridJob = 0;
  function buildCoastGridSlowly(list, then) {
    var job = ++gridJob, a = new Uint8Array(GRID_W * GRID_H), k = GRID_W / 360, y = 0, path = null;
    var band = function () {
      if (job !== gridJob) { then(null); return; }
      try {
        path = path || coastFill(list);
        var h = Math.min(GRID_BAND, GRID_H - y);
        markCoastGrid(list, a, 0, y, GRID_W, h, path);
        y += h;
      } catch (e) { then(null); return; }
      if (y < GRID_H) setTimeout(band, 0); else then({ a: a, k: k, r: COAST_KM * k / 111.195 });
    };
    setTimeout(band, 0);
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
  // The stretches of a line that run inland (and a little way on at each end) and the stretches along the coast, each given
  // to its callback as the first point's index and the index after the last.
  function coastSpans(ln, onInner, onCoastal) {
    var reach = (gridBase === "lo" ? 1.4 : 0.12) * COAST_KM / 111.195;
    var step = function (a, b) { var dx = (a[0] - b[0]) * Math.cos(a[1] * D2R); return Math.sqrt(dx * dx + (a[1] - b[1]) * (a[1] - b[1])); };
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
      if (b > a) onInner(a, b + 1);
    }
    for (s = 0; s < n; s = e) {
      for (e = s + 1; e < n && used[e] === used[s]; e++);
      if (!used[s] && e - s >= 2) onCoastal(s, e);
    }
  }
  function splitCoast(lines, coastal, inner) {
    lines.forEach(function (ln) {
      coastSpans(ln, function (a, b) { inner.push(ln.slice(a, b)); }, function (a, b) { coastal.push(ln.slice(a, b)); });
    });
  }

  // Noah's edits from the developer tools (see dev.js and supabase/functions/chronia-edits): each changes a country's
  // colour, name, or name placement, or a city's size or name, or hides a city, from one date to another. They are
  // a layer applied while drawing; the data files are never changed. The page fetches the list at the start without
  // waiting for it, so the first map is drawn without edits and drawn again when they arrive.
  var EDITS_URL = "https://jvcmeuqlyygpwelmvxuv.supabase.co/functions/v1/chronia-edits";
  var edits = { list: [], byKey: new Map(), tag: 0, failed: false, loaded: false };
  function editUTC(y, m, d) { var x = new Date(0); x.setUTCFullYear(y, m - 1, d); x.setUTCHours(0, 0, 0, 0); return x.getTime(); }
  // A stored date ("1815", "1815-07", "1815-07-03", "-500") as a time on the timeline's scale: the start of
  // its year, month, or day, or (with end) the start of the next, so a span holds t when start <= t < end.
  function editTime(s, end) {
    var m = /^(-?\d{1,4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(String(s || ""));
    if (!m) return null;
    var y = +m[1], mo = m[2] ? +m[2] : 0, d = m[3] ? +m[3] : 0;
    if (!mo) return end ? y + 1 : y;
    var y0 = editUTC(y, 1, 1), len = (editUTC(y + 1, 1, 1) - y0) / DAY_MS;
    var at = d ? editUTC(y, mo, d + (end ? 1 : 0)) : editUTC(y, mo + (end ? 1 : 0), 1);
    return y + (at - y0) / DAY_MS / len;
  }
  function setEdits(list) {
    edits.list = (list || []).filter(function (e) { return e && e.kind && e.target; }).map(function (e) {
      return { id: e.id, kind: e.kind, target: String(e.target), from: e.from, to: e.to, value: e.value || {}, note: e.note || "", updated_at: e.updated_at || "", t0: editTime(e.from, false), t1: editTime(e.to, true) };
    }).filter(function (e) { return e.t0 !== null && e.t1 !== null; });
    edits.list.sort(function (a, b) { return a.updated_at < b.updated_at ? -1 : a.updated_at > b.updated_at ? 1 : (a.id || 0) - (b.id || 0); });
    edits.byKey = new Map();
    edits.list.forEach(function (e) { var k = e.kind + "|" + e.target, l = edits.byKey.get(k); if (l) l.push(e); else edits.byKey.set(k, [e]); });
    edits.colourN = edits.list.filter(function (e) { return e.kind === "country-colour"; }).length;
    edits.nameN = edits.list.filter(function (e) { return e.kind === "country-name"; }).length;
    edits.cityN = edits.list.filter(function (e) { return /^city-/.test(e.kind); }).length;
    edits.labelN = edits.list.filter(function (e) { return e.kind === "label"; }).length;
    edits.tag++;
    editsChanged();
    scheduleRender();
  }
  // The value of the latest-saved edit of this kind and target whose span holds t, or null.
  function editAt(kind, target, t) {
    var l = edits.byKey.get(kind + "|" + target);
    if (!l) return null;
    for (var i = l.length - 1; i >= 0; i--) if (l[i].t0 <= t && t < l[i].t1) return l[i].value;
    return null;
  }
  // The edits whose country or city isn't in the data (renamed in a rebuild, or mistyped).
  function editsNotFound() {
    var names = null, ids = null;
    return edits.list.filter(function (e) {
      if (/^city-/.test(e.kind)) {
        if (!cities) return false;
        if (!ids) { ids = new Set(); cities.rows.forEach(function (c) { ids.add(c.id); }); }
        return !ids.has(e.target);
      }
      if (!catalogue) return false;
      if (!names) { names = new Set(); catalogue.forEach(function (c) { names.add(c[0]); }); }
      return !names.has(e.target);
    });
  }
  // Called whenever the edits change, to drop what was worked out from the old ones.
  function editsChanged() {
    if (!ready || !current) return;
    labelCache.clear();
    setTime(now);
  }
  function loadEdits() {
    return fetch(EDITS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "list" }) }).then(function (r) {
      if (!r.ok) throw new Error("edits " + r.status);
      return r.json();
    }).then(function (b) { edits.loaded = true; edits.failed = false; setEdits(b.edits); }, function (e) { edits.failed = true; console.warn("edits", e); });
  }

  // Comments on a country's card and the profile they are written under (comments.js, loaded the first time a country's
  // card opens, or the Account panel opens signed in; never with the page). They talk only to the chronia-comments
  // function, through window.CHRONIA_COMMENTS; comments.js adds its own part to it as CHRONIA_COMMENTS.ui.
  var COMMENTS_URL = "https://jvcmeuqlyygpwelmvxuv.supabase.co/functions/v1/chronia-comments", PICTURE_STORE = "chronia-picture";
  var comments = null;
  // The open card's thread: its own name, its tag, and every name of the tag (at most 60), or null where the card is not
  // a country's; undefined while the tags are still loading.
  function commentsThread() {
    if (card.hidden || selCity || selected < 0 || !catalogue || !catalogue[selected]) return null;
    if (tagList === null) return undefined;
    var name = catalogue[selected][0], t = tagList.find(function (x) { return x[1].indexOf(name) >= 0; });
    if (!t) return { name: name, tag: "", names: [name] };
    var names = t[1].slice(0, 60);
    if (names.indexOf(name) < 0) names[names.length - 1] = name;
    return { name: name, tag: t[0], names: names };
  }
  function syncComments() {
    if (typeof card === "undefined") return;
    var th = commentsThread();
    if (!comments) { if (th) loadComments(); return; }
    if (comments.ui && th !== undefined) comments.ui.card(th);
  }
  // The account's picture, kept from the function's last answer so the account button shows it from the start.
  function keptPicture() {
    try { var k = JSON.parse(localStorage.getItem("chronia-picture") || "null"); return k && k.who === accountId() && typeof k.url === "string" ? k.url : null; } catch (e) { return null; }
  }
  function loadComments() {
    if (comments) return;
    comments = window.CHRONIA_COMMENTS = {
      url: COMMENTS_URL,
      T: T,
      // The Google session the report panel keeps: its access token (refreshed when near its end) or null, and the
      // account's id ("" signed out). signIn() opens the Account panel, where the sign-in is.
      token: function () { return reportToken().catch(function () { return null; }); },
      who: accountId,
      signIn: function () { setAccountOpen(true, false); },
      // A 401 from the comments function: the session is dropped, as reportAsk does, so sign-in is offered again.
      signedOut: function () { keepReportSession(null); },
      // The Account panel opened (where the profile is edited), signed in.
      openAccount: function () { setAccountOpen(true, false); },
      // The map's date as the page writes it in the address ("1815", "1941-06", "1941-06-22"); a date so written as
      // the page shows dates (the map's own date without one); and the map moved to a date, with the card of the
      // name given (or the card that was open) opened there.
      at: hashTime,
      when: function (at) {
        if (at === undefined) return fmtNow(now);
        var p = parseDate(at);
        if (!p) return String(at);
        return p[2] ? fmtMDY(p[0], p[1], p[2]) : p[1] ? monthYear(p[0], p[1]) : fmtYear(p[0]);
      },
      goTo: function (at, name) {
        var t = parseTime(at);
        if (t === null) return;
        var id = selected, k = catalogue.findIndex(function (e) { return e[0] === name; });
        if (k >= 0) id = k;
        stopPlay();
        setTime(t);
        if (id >= 0) select(id);
      },
      thread: function () { return commentsThread() || null; },
      // The account's picture (a URL, or null for the initial), shown on the account button.
      picture: function (url) {
        try { localStorage.setItem(PICTURE_STORE, JSON.stringify({ who: accountId(), url: url || null })); } catch (e) {}
        syncAccount();
      },
      // A reply's thread to open once comments.js has come ({ root, mark }), from a link (openLinked).
      linked: null,
      ui: null
    };
    var sc = document.createElement("script");
    sc.src = "comments.js" + (DATA_V ? "?v=" + DATA_V : "");
    sc.onerror = function () { console.warn("comments.js could not be loaded"); };
    document.head.appendChild(sc);
  }

  // The developer tools (dev.js) are loaded only when opened, with #dev in the address or Shift+D. They talk to the
  // page through window.CHRONIA_DEV; dev.js adds its own part to it as CHRONIA_DEV.ui.
  var dev = null, devMode = null, devDrag = null, devGhost = null;
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  // A time on the timeline as a stored date: a year before 1800, a day from then.
  function storedDate(t) {
    if (t < MONTHLY_FROM) return String(Math.floor(t + 1e-9));
    var d = dateOfDay(dayOfTime(t));
    return d[0] + "-" + pad2(d[1]) + "-" + pad2(d[2]);
  }
  // The stretch of the timeline the borders shown hold for: from the change before the date to the day (or year)
  // before the next, as stored dates.
  function devStretch() {
    var i = -1, k;
    for (k = 0; k < points.length; k++) if (points[k] <= now + 1e-7) i = k;
    var from = i >= 0 ? storedDate(points[i]) : storedDate(FIRST_T), next = i + 1 < points.length ? points[i + 1] : null, to;
    if (next === null) to = storedDate(lastT());
    else if (next < MONTHLY_FROM) to = String(Math.round(next) - 1);
    else { var d = dateOfDay(dayOfTime(next) - 1); to = d[0] + "-" + pad2(d[1]) + "-" + pad2(d[2]); }
    return [from, to];
  }
  function devLabelAt(x, y) {
    for (var i = placedLabels.length - 1; i >= 0; i--) {
      var l = placedLabels[i];
      if ((l.kind !== "polity" && l.kind !== "people") || l.sea || !l.box) continue;
      var b = l.box;
      if (x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) continue;
      var target = polityOwnName(l.id), v = editAt("label", target, now);
      return { target: target, shown: l.name, dx: l.x - x, dy: l.y - y, size: v ? v.size : null, angle: v ? v.angle : null, id: l.id };
    }
    return null;
  }
  function devCityAt(x, y) {
    var best = null, bd = 400;
    for (var i = 0; i < placedLabels.length; i++) {
      var l = placedLabels[i];
      if (l.kind !== "capital" && l.kind !== "city" && l.kind !== "town") continue;
      var b = l.box, inBox = b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h, d = (l.x - x) * (l.x - x) + (l.y - y) * (l.y - y);
      if (inBox) d = Math.min(d, 1);
      if (d < bd) { bd = d; best = l; }
    }
    if (!best) return null;
    var c = best.id && cities ? cities.rows.find(function (r) { return r.id === best.id; }) : null;
    return c ? { id: c.id, name: cityShownName(c, now), own: namedAt(c.steps, c.name, now) } : null;
  }
  // A click on the map while the Country or City tool is on goes to the tools instead of opening the card.
  function devClick(x, y) {
    if (!dev || !dev.ui) return false;
    if (devMode === "country") {
      var p = polityAt(x, y);
      dev.ui.onPick("country", p ? { name: polityOwnName(p.id), shown: polityName(p.id) } : null);
      return true;
    }
    if (devMode === "city") { dev.ui.onPick("city", devCityAt(x, y)); return true; }
    return false;
  }
  function openDev() {
    if (dev) { if (dev.ui) dev.ui.show(); return; }
    dev = window.CHRONIA_DEV = {
      url: EDITS_URL,
      now: function () { return now; },
      fmt: function (t) { return fmtNow(t === undefined ? now : t); },
      stretch: devStretch,
      stored: storedDate,
      palette: function () { return pal.colors.slice(0, PALETTE); },
      edits: function () { return edits.list.map(function (e) { return { id: e.id, kind: e.kind, target: e.target, from: e.from, to: e.to, value: e.value, note: e.note, updated_at: e.updated_at, t0: e.t0, t1: e.t1 }; }); },
      setEdits: setEdits,
      notFound: editsNotFound,
      failed: function () { return edits.failed; },
      pick: function (mode) { devMode = mode || null; canvas.classList.toggle("is-dev-pick", !!devMode); },
      ghost: function (g) { devGhost = g || null; labelCache.delete("layout"); scheduleRender(); },
      opened: function (on) { devOpen = !!on; writeHash(); },
      // The Google session the report panel keeps: token() gives its access token (refreshed when near its
      // end), or null when no one is signed in; signIn() opens the report panel, where the button is.
      token: function () { return reportToken().catch(function () { return null; }); },
      signedOut: function () { keepReportSession(null); },
      signIn: function () { setReportOpen(true); },
      ui: null
    };
    var sc = document.createElement("script");
    sc.src = "dev.js" + (DATA_V ? "?v=" + DATA_V : "");
    sc.onerror = function () { console.warn("dev.js could not be loaded"); dev = null; };
    document.head.appendChild(sc);
  }
  var devOpen = false;
  window.addEventListener("hashchange", function () {
    if (devInHash() && !devOpen) openDev();
    var b = addrHas("bench");
    if (perfInHash() || b) perfStart();
    if (b && ready) { perf.benchText = null; benchStart(); }
  });
  function devInHash() { return addrHas("dev"); }

  // A link that opens a card, and a reply in its thread, at the date in ?y= (the page of the account's own comments,
  // comments/, makes them): &card=<name> opens that name's card, if the map of the date has it, and &comment=<id>&root=<its
  // thread's top comment> then opens the thread with the comment marked. They are read once, when the first map is drawn,
  // and taken out of the address, so a reload or a link shared after does not carry them. A name the map lacks, or a
  // comment since deleted, leaves the map at the date, and says nothing.
  // A link may open a card: ?card=<a state's or people's name> (a comment's link adds &comment and &root), or, from the
  // place pages (chroniaatlas.com/places/, since 28 November 2026), ?city=<a city's name, then or now>. Without a view of
  // its own (&v=) the map then flies there once the opening is over, as a search does.
  function openLinked(h) {
    if (!h.card && !h.city && !h.comment && !h.root) return;
    var keep = function (s, lead) {
      var kv = String(s || "").replace(/^[?#]/, "").split("&").filter(function (x) { return x && !/^(card|city|comment|root)(=|$)/.test(x); });
      return kv.length ? lead + kv.join("&") : "";
    };
    try { history.replaceState(null, "", location.pathname + keep(location.search, "?") + keep(location.hash, "#")); } catch (e) {}
    if (h.city && cities) {
      // A town may be among the lesser places, which load later: the link waits for them once.
      var findCity = function (again) {
        var hit = cityRanked(now).find(function (x) { return cityShownName(x.c, now) === h.city; }) || cityRanked(now).find(function (x) { return x.c.name === h.city; });
        if (!hit) {
          if (!again) { loadMinorCities(); if (cities.minorLoad) cities.minorLoad.then(function () { findCity(true); }); }
          return;
        }
        openCity({ ref: { city: hit.c }, kind: hit.tier <= 1 ? "city" : "town" });
        if (!h.v) afterIntro(function () { flyTo(hit.c.lon, hit.c.lat, Math.max(localScale(), hit.tier <= 1 ? 14000 : 20000)); });
      };
      findCity(false);
      return;
    }
    var p = h.card && current ? current.order.find(function (q) { return polityName(q.id) === h.card; }) : null;
    if (!p) return;
    select(p.id);
    if (!h.v && p.label) afterIntro(function () { flyTo(p.label[0], p.label[1], scaleFor(p.label[5], 200, 6000)); });
    var mark = Math.floor(+h.comment), root = Math.floor(+h.root) || mark;
    if (!(mark > 0) || !(root > 0)) return;
    loadComments();
    if (comments.ui) comments.ui.open(root, mark);
    else comments.linked = { root: root, mark: mark };
  }

  function start() {
    loadEdits();
    readPalette();
    var h = readHash();
    try { flat = localStorage.getItem(STORE_FLAT) === "1"; } catch (e) {}
    if (h.flat === "1") flat = true;
    if (h.v) {
      var v = h.v.split(",").map(Number);
      if ((v.length === 3 || v.length === 4) && v.every(isFinite)) { view.lon = v[0]; view.lat = v[1]; view.zoom = v[2]; view.roll = v.length === 4 ? wrap180(v[3]) : 0; }
    }
    syncProjection();
    syncCompass();
    layout();
    Promise.all([
      fetchJSON("data/eras.json"), fetchJSON("data/land.json"), fetchJSON("data/cities-dated.json").catch(function () { return null; }),
      LANG === "en" ? null : fetchJSON("lang/places-" + LANG + ".json").catch(function () { return null; })
    ]).then(function (r) {
      PL = r[3] || {};
      var idx = r[0];
      catalogue = idx.polities;
      srcKeys = idx.srcKeys || null; srcInfo = idx.sources || null;
      loadLapseTags();
      if (idx.borders) { borderPairs = idx.borders; bordersKnown = true; }
      colourMarks();
      maps = idx.maps.map(function (m) { return { y: m[0], file: "data/" + m[1], snap: null, loading: null }; });
      var from = idx.modern.from.split("-").map(Number), to = idx.modern.to.split("-").map(Number);
      modern = { rows: null, hi: null, lo: null, load: null, changes: idx.modern.changes, toDay: dayFromDate(to[0], to[1], to[2]) };
      modern.fromTime = timeOfDay(dayFromDate(from[0], from[1], from[2])) - 0.5 / 365;
      if (idx.dated) {
        // The change points: the years until 1647, 1 January of the years of change from 1648 to 1799, then the days of
        // the changes from 1800.
        dated = { from: idx.dated.from, to: idx.dated.to, changes: idx.dated.changes, days: idx.dated.days || [], chunks: idx.dated.chunks.map(function (c) { return { from: c[0], file: "data/" + c[1], data: null, loading: null }; }) }; PLAY.yearlyFrom = Math.max(dated.from, PLAY.yearlyFrom);
        dated.times = dated.changes.filter(function (y) { return !dated.days.length || y < DAYS_FROM; }).map(function (y) { return y < MONTHLY_FROM ? y : timeOfDay(dayFromDate(y, 1, 1)); }).concat(dated.days.map(timeOfDay));
      }
      cities = r[2] ? { ranks: r[2].ranks, rows: prepCities(r[2], false), minorLoad: null } : null;
      buildPoints();
      var fine = h.y ? /^(\d{1,4})-(\d{2})$/.exec(h.y) : null;
      if (fine && +fine[1] < monthlyFrom() && +fine[2] >= 1 && +fine[2] <= 12) { ctlMonth = +fine[2]; h.y = fine[1]; }
      var t0 = h.y ? parseTime(h.y) : null;
      now = Math.max(KNOTS[0][0], t0 !== null ? t0 : parseTime(String(START_YEAR)));
      // Opened without a date, the atlas starts on a day, July 15, 1815, not on the month (Noah, 25 November 2026); a link
      // with the 15th written out opens on that day too.
      if ((t0 === null || /-15$/.test(h.y)) && isMonthly(now)) dayMode = true;
      land = { hi: prepLand(r[1].hi), lo: prepLand(r[1].lo) };
      buildCoastGrid(land.lo);
      landGeo = topojson.feature(r[1].lo, r[1].lo.objects.land);
      layout();
      if (isDated(now) && !isMonthly(now)) now = Math.round(now);
      var first = isModern(now) ? loadModern().then(function () { return modernSnap(Math.min(dayOfTime(now), modern.toDay)); }) : isDated(now) ? loadChunk(chunkIndexFor(now)).then(function () { return datedSnap(chunkIndexFor(now), now); }) : loadMap(mapIndexFor(now));
      // The coasts and lakes of the past (the Zuiderzee before its polders, the Fens before their draining) come with
      // the first map, so the land of today never shows in their place while they load.
      loadGeography();
      return Promise.all([first, geogLoad]).then(function (r) {
        var snap = r[0];
        current = snap;
        if (dayMode) keepDayMode = true;
        try { setTime(now); } finally { keepDayMode = false; }
        reveal();
        openLinked(h);
        afterIntro(function () { if (gridBase === "lo") upgradeGrid("hi", function (ms) { hiGridMs = ms; scheduleRender(); }); });
        var seaData = fetchJSON(UC + "data/sea.json");
        afterIntro(function () {
          seaData.then(function (t) {
            var prep = function (topo) { return topojson.feature(topo, topo.objects.deep).features.map(function (f) { return prepare(densify(f)); }); };
            sea = { high: prep(t.high), low: prep(t.low) };
            scheduleRender();
          }).catch(function (e) { console.warn("sea", e); });
        });
        whenIdle(function () { if (isModern(now) || yearOf(now) >= MODERN_AHEAD) loadModern().catch(function () {}); });
        loadEvents();
        if (devInHash()) openDev();
        if (perfInHash() || addrHas("bench")) perfStart();
        if (addrHas("bench")) setTimeout(benchStart, 2500);
      });
    }).catch(function (e) {
      console.error(e);
      $("load").textContent = T("The atlas could not be loaded. Try reloading the page.");
      document.documentElement.classList.add("ch-ready");
    });
    if (document.fonts && document.fonts.load) {
      document.fonts.load("400 20px 'IM Fell English'").then(function () { widthCache.clear(); labelCache.clear(); inkReset(); scheduleRender(); }).catch(function () {});
      document.fonts.load("italic 400 20px 'IM Fell English'").then(function () { widthCache.clear(); glyphSizes.clear(); labelCache.clear(); inkReset(); scheduleRender(); }).catch(function () {});
    }
  }

  // For the checks (tools/chronia-strays.mjs): every stretch the page draws as a shape's edge against ownerless land, inland,
  // at the level the view uses, with what lies on each side of it d0 km off and, where a side is ownerless, how far the
  // next owned land is (up to 16 × d0). A stretch with owned land close on both sides is a stray line: two drawings of one
  // border, a gap, or an overlap. A people's land counts as ownerless, as it does when the page draws a state's edge.
  function strayEdges(d0) {
    if (!current) return null;
    var key = useLevel(), L = level(current, key), topo = L.topo, polys = L.polys, store = arcStore(topo), use = arcUse(topo, L.geoms);
    if (!L.bb) L.bb = L.geo.map(function (g) { var b = d3.geoBounds(g); return b; });
    var at = function (ll) {
      var out = [];
      for (var i = 0; i < polys.length; i++) {
        if (!polys[i] || polys[i].people || !isFinite(L.bb[i][0][0]) || !inBounds(L.bb[i], ll)) continue;
        if (d3.geoContains(L.geo[i], ll)) out.push(i);
      }
      return out;
    };
    var res = [], needle = store.needle, within = withinState(topo, polys);
    for (var k = 0; k < use.seen.length; k++) {
      var i = use.seen[k];
      if (use.count[i] !== 1 || (needle && needle[i])) continue;
      var own = use.first[i], p = polys[own];
      if (!p || (within && within(i, own))) continue;
      var sp = arcSplit(topo, store, i);
      for (var q = 0; q < sp.inner.length; q++) {
        var ln = sp.inner[q], pts = [];
        for (var j = 0; j < ln.n; j++) pts.push([Math.atan2(ln.y[j], ln.x[j]) / D2R, Math.asin(Math.max(-1, Math.min(1, ln.z[j]))) / D2R]);
        var len = 0, segs = [];
        for (j = 0; j + 1 < pts.length; j++) { var l = d3.geoDistance(pts[j], pts[j + 1]) * R_KM; len += l; segs.push(l); }
        if (!(len > 0)) continue;
        // up to three probes along the stretch, at the middles of its longest segments
        var order = segs.map(function (l, j) { return j; }).sort(function (a, b) { return segs[b] - segs[a]; }).slice(0, 3), worst = null;
        for (var o = 0; o < order.length; o++) {
          var a = pts[order[o]], b = pts[order[o] + 1], mid = d3.geoInterpolate(a, b)(0.5), kx = Math.cos(mid[1] * D2R) || 1e-6;
          var dx = (b[0] - a[0]) * kx, dy = b[1] - a[1], n = Math.hypot(dx, dy);
          if (!n) continue;
          var ox = -dy / n / kx / 111.195, oy = dx / n / 111.195, sides = [];
          for (var sgn = -1; sgn <= 1; sgn += 2) {
            var gap = -1, who = [];
            for (var m = 1; m <= 16; m *= 2) { who = at([mid[0] + sgn * ox * d0 * m, mid[1] + sgn * oy * d0 * m]); if (who.length) { gap = m; break; } }
            sides.push({ gap: gap, who: who });
          }
          // the probe that looks least like a stray decides (a stretch is a stray only if all of it is)
          var score = Math.max(sides[0].gap < 0 ? 99 : sides[0].gap, sides[1].gap < 0 ? 99 : sides[1].gap);
          if (!worst || score > worst.score) worst = { score: score, sides: sides, mid: mid };
        }
        if (!worst) continue;
        var names = worst.sides.map(function (sd) { return sd.who.map(function (w) { return polys[w] ? polityName(polys[w].id) : "?"; }).join("+"); });
        var others = worst.sides.map(function (sd) { return sd.who.filter(function (w) { return w !== own; }).length; });
        res.push([+worst.mid[0].toFixed(3), +worst.mid[1].toFixed(3), +len.toFixed(1), worst.score, polityName(p.id), names[0], names[1], worst.sides[0].who.length + worst.sides[1].who.length, others[0] + others[1] ? 1 : 0, p.soft ? 1 : 0, p.people ? 1 : 0, p.claims ? 1 : 0]);
      }
    }
    return { level: key, scale: localScale(), strays: res };
  }
  window.__chronia = {
    strays: strayEdges,
    // Whether the map shown is drawn from a file's rough lines alone (its fine ones not yet come).
    rough: function () { return !!current && !!current.topo && current.topo.hi === current.topo.lo; },
    setEdits: function (l) { setEdits(l); },
    editAt: function (k, t, at) { return editAt(k, t, at); },
    notFound: function () { return editsNotFound().map(function (e) { return e.kind + "|" + e.target; }); },
    timeOf: function (s) { return parseTime(s); },
    dateOf: function (s) { return parseDate(s); },
    editTime: function (s, end) { return editTime(s, end); },
    editsFailed: function () { return edits.failed; },
    labelBox: function (n) {
      for (var i = 0; i < placedLabels.length; i++) { var l = placedLabels[i]; if (l.name === n && l.kind !== "city" && l.kind !== "capital" && l.kind !== "town") return [l.x, l.y, l.box, l.boxes]; }
      return null;
    },
    cities: function () { return cities ? cityRanked(now).map(function (x) { return { id: x.c.id, name: cityShownName(x.c, now), tier: x.tier }; }) : []; },
    fillAt: function (lon, lat) {
      var q = projectLL(lon, lat);
      if (!q) return null;
      draw();
      var d = ctx.getImageData(Math.round(q[0] * dpr) - 3, Math.round(q[1] * dpr) - 3, 7, 7).data, ch = [[], [], []];
      for (var i = 0; i < d.length; i += 4) for (var k = 0; k < 3; k++) ch[k].push(d[i + k]);
      return ch.map(function (a) { a.sort(function (x, y) { return x - y; }); return a[a.length >> 1]; });
    },
    perfState: function () {
      return { plain: PLAIN, lowMem: LOW_MEM, labels: { layouts: labelStats.layouts, carried: labelStats.carried, placesCarried: labelStats.placesCarried }, base: { hits: baseStats.hits, misses: baseStats.misses, mode: baseMode }, chunks: dated ? dated.chunks.filter(function (c) { return c.data; }).length : 0,
        fine: dated ? dated.chunks.filter(function (c) { return c.data && c.fine >= 2; }).length : 0, modern: modern && modern.rows ? (modern.fine >= 2 ? "fine" : "loaded") : "none", snaps: datedSnaps.size + modernSnaps.size, tiles: rd.cache.size };
    },
    baseCache: function (mode) { baseMode = mode; baseSig = null; scheduleRender(); },
    // For how long a layout of the names is carried while the map moves, in ms (0 lays them out every frame, as before
    // 23 November 2026; null puts back LABEL_CARRY_MS).
    labelCarry: function (ms) { labelCarryMs = ms === null || ms === undefined ? null : +ms; labelCache.delete("carry"); labelCache.delete("layout"); labelCache.delete("places"); },
    // The size of a page of sprites and how many a store may fill, for a check that wants the stores emptied often; nulls put
    // back what ships. Either way both stores start again.
    inkPages: function (size, count) { INK_PAGE = size || 2048; INK_PAGES = count || (LOW_MEM ? 2 : 4); inkReset(true); scheduleRender(); },
    // Names from sprites: on or off (off draws them as text, as before 23 November 2026); with no argument, what is kept.
    // "letters" draws them as text but every line letter by letter, as the sprites are placed (a straight line as text is one
    // string, which the browser kerns), so that a check can compare the two drawings point for point.
    textSprites: function (on) {
      if (on !== undefined) { textSprites = on === true; textLetters = on === "letters"; scheduleRender(); }
      var n = function (st) { return st.page < 0 ? 0 : st.page + 1; };
      return { on: textSprites, sprites: ink.glyph.map.size + ink.line.map.size, pages: n(ink.glyph) + n(ink.line), made: ink.glyph.made + ink.line.made, flushed: ink.glyph.flushed + ink.line.flushed, scale: inkK };
    },
    // How the terrain was last drawn: its canvas's size, and the size of the part of it drawn into (all of it at rest).
    terrain: function () { return { ready: !!relief && relief.ready(), canvas: [reliefCanvas.width, reliefCanvas.height], drawn: reliefPart ? [reliefPart[2], reliefPart[3]] : [reliefCanvas.width, reliefCanvas.height] }; },
    timeDraw: function () { var t0 = performance.now(); draw(); return performance.now() - t0; },
    // How far d3's projection (used for the largest shapes and to find the place under the pointer) lands from CHRONIA's own
    // at a spread of points on the near side, in pixels, so the roll is checked to turn both the same way.
    projGap: function () {
      var worst = 0;
      for (var a = -60; a <= 60; a += 20) for (var b = -60; b <= 60; b += 20) {
        var ll = [view.lon + a, Math.max(-85, Math.min(85, view.lat + b))], q = projectLL(ll[0], ll[1]), r = projection(ll);
        if (q && q[2] > 0.15 && r) worst = Math.max(worst, Math.hypot(q[0] - r[0], q[1] - r[1]));
      }
      return worst;
    },
    turn: function (deg) { rollBy(deg); writeHash(); },
    roll: function () { return view.roll; },
    lonLatAt: function (x, y) { return lonLatAt(x, y); },
    // The scale bar: km a pixel at the centre (0 where it isn't shown), and whether it is showing; wake() as a move would.
    scale: function (wake) { if (wake) scaleWake(); return { kmPerPx: scaleKmPerPx(), on: scaleBox.classList.contains("is-on"), km: $("scale-km-n").textContent, mi: $("scale-mi-n").textContent }; },
    project: function (lon, lat) { return projectLL(lon, lat); },
    prepareFrame: function (t) { var t0 = performance.now(), ok = prepareFrame(t); return ok ? performance.now() - t0 : -1; },
    loadingJSON: function () { return jsonLoading; },
    wars: function () { return warsAtDate().map(function (r) { return r.name; }); },
    // Whether any war's zones of control were drawn in the last frame, and the day arithmetic, for the checks.
    controlDrawn: function () { return ctlDrawn; },
    controlDay: function () { return ctlDay(); },
    days: { of: dayFromDate, date: dateOfDay, time: timeOfDay, at: dayOfTime },
    changesText: function () { return changesBody.hidden ? null : changesDate.textContent + " | " + changesList.textContent; },
    openChanges: function (open) { setChangesOpen(open !== false, false); },
    search: function (q) { setSearchOpen(true, false); searchInput.value = q; runSearch(); return searchHits.map(function (h) { return h.kind + ": " + h.name + (h.sub ? " (" + h.sub + ")" : ""); }); },
    searchOpen: function () { return !searchPanel.hidden; },
    // Not while a step waits for a file's fine lines: the map still shows the date before.
    ready: function () { return ready && !!current && !holdKey && !askedKey; },
    year: function () { return now; },
    shown: function () { return yearInput.value; },
    asof: function () { return asof.textContent; },
    playing: function () { return playTimer ? playMode : false; },
    play: function (on, back) { if (on) startPlay(!!back); else stopPlay(); },
    speed: function (v) { if (v !== undefined) setPlaySpeed(v); return playSpeed; },
    keyOpen: function () { return !keyList.hidden; },
    keyRows: function () { return Array.prototype.filter.call(keyList.children, function (li) { return !li.hidden; }).map(function (li) { return li.getAttribute("data-key"); }); },
    setKeyOpen: function (on) { setKeyOpen(on, true); },
    date: function () { return isMonthly(now) ? hashTime() : null; },
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
  window.__chronia.frame = function (mark) { var o = document.createElement("canvas"); o.width = canvas.width; o.height = canvas.height; composeFrame(o, fmtNow(now), mark); return o.toDataURL("image/png"); };
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
  window.__chronia.cardDivisionNote = function () { var box = $("card-divnote"), btn = box.querySelector("button"); return box.hidden ? null : { offer: btn ? btn.textContent : "", text: $("divnote-text").hidden ? "" : $("divnote-text").textContent, writing: $("divnote-text").classList.contains("is-writing") }; };

  start();
})();

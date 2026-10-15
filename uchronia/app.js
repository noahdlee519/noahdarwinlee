(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var canvas = $("globe");
  var ctx = canvas.getContext("2d");
  var satView = document.createElement("canvas"), satCanvas = satView, satShow = null;
  satView.className = "uc-globe uc-globe-sat";
  satView.setAttribute("aria-hidden", "true");
  satView.hidden = true;
  canvas.parentNode.insertBefore(satView, canvas);
  var panel = $("panel"), bar = $("bar"), sheetMode = null;
  var phoneQuery = window.matchMedia("(max-width: 640px)");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover)").matches;
  var R_KM = 6371.0088;
  var D2R = Math.PI / 180;
  var TAU = 2 * Math.PI;
  var PALETTE = 10;
  var UNCLAIMED = -1;
  var STORE = "uchronia-map", STORE_PREV = "uchronia-map-previous", STORE_SAT = "uchronia-satellite", STORE_FLAT = "uchronia-flat", STORE_FINE = "uchronia-fine", STORE_NAMES = "uchronia-names", STORE_STYLE = "uchronia-style";
  var FONT = "'Familjen Grotesk', 'Helvetica Neue', Helvetica, Arial, sans-serif";
  var SERIF = "'IM Fell English', 'Old Standard TT', Georgia, 'Times New Roman', serif";
  var NAME_MAX = 60;
  var MAX_NEW = 2000, MAX_ADDED_CITIES = 8000, MAX_PIECES = 300, MAX_PIECE_POINTS = 60000, SEA = -3;
  var DETAIL_URLS = ["BlueMarble_ShadedRelief_Bathymetry", "BlueMarble_NextGeneration", "BlueMarble_ShadedRelief"].map(function (layer) {
    return "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/" + layer + "/default/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg";
  });
  var DETAIL_MAX_Z = 8, DETAIL_MAX_TILES = 40;
  var DEFAULT_NAME = /^New country( \d+)?$/;

  function toVec(lon, lat) {
    var l = lon * D2R, p = lat * D2R, c = Math.cos(p);
    return [c * Math.cos(l), c * Math.sin(l), Math.sin(p)];
  }
  function normalize(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  function wrap180(x) { return ((x + 180) % 360 + 360) % 360 - 180; }
  function wrapPi(x) { return ((x + Math.PI) % TAU + TAU) % TAU - Math.PI; }
  function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function isInt(v) { return typeof v === "number" && isFinite(v) && Math.floor(v) === v; }

  var HALF_PI = Math.PI / 2;

  var levels = null, feats = null, geoFull = null, objKey = "provinces";
  var nUnit = 0, nProv = 0, unitProv = null, unitName = [], provName = [], provUnits = [];
  var provGroup = null, groupName = [], groupProvs = [], baseObjects = null, detailGeo = null, hasDetail = false;
  var pieces = [], pieceSeq = 0, pieceVersion = 0, lasso = null, unitBox = null, unitCoast = null, edgeHint = -1, PC = window.polygonClipping;
  var unitArea = null, unitNeighbors = null, unitGrid = null, unitClose = null;
  var CLOSE_KM = 220;
  var arcA = null, arcB = null, arcLines = null, arcSeam = null;
  var countries = [], owner = null, ownerVersion = 0;
  var cities = [], cityIndex = new Map(), citySeq = 0;
  var base = null, fineData = false, sharedOpen = 0;
  var graticule = null, graticuleIdx = [];
  var ui = { tool: "select", country: -1, region: -1, piece: null, city: null, hover: -1, hoverPiece: null, bare: false, whole: false, erase: false, satellite: false, fine: false, countryNames: true, cityNames: true, towns: false, scaleBar: true, rivers: true, gridLabels: true, terrain: true, lakes: true, waterNames: true, regionLines: true };

  var projection = d3.geoOrthographic().clipAngle(90).precision(0.35);
  var view = { lon: 15, lat: 30, zoom: 1 };
  var flat = false;
  var dpr = 1, W = 0, H = 0, baseR = 0, baseK = 0, cx = 0, cy = 0, freeL = 0, freeR = 0, freeT = 0, freeB = 0, scaleL = 18, scaleB = 0;
  var MIN_ZOOM = 0.6, MAX_ZOOM = 60;
  var FB = { k: 1, xc: 0, yc: 0, vmin: -Math.PI, vmax: Math.PI, pmin: -HALF_PI, pmax: HALF_PI };


  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    satCanvas.width = satView.width = canvas.width; satCanvas.height = satView.height = canvas.height;
    reliefCanvas.width = Math.round(W * dpr * RELIEF_RES); reliefCanvas.height = Math.round(H * dpr * RELIEF_RES);
    var phone = phoneQuery.matches, bare = ui.bare;
    var barH = phone || bare ? 0 : barBase();
    var sheetH = phone && !bare ? Math.min(H * 0.5, panel.getBoundingClientRect().height || 150) : 0;
    var freeW = W, freeH = H - barH - sheetH - (phone && !bare ? 70 : 40);
    cx = W / 2;
    cy = phone ? (H - sheetH) / 2 + 10 : barH + (H - barH) / 2;
    freeL = 0; freeR = W; freeT = barH; freeB = H - sheetH;
    scaleL = phone ? 14 : 18; scaleB = H - sheetH - (phone && !bare ? 12 : 16);
    document.documentElement.style.setProperty("--uc-bar-h", barH + "px");
    if (phone !== sheetMode) { sheetMode = phone; $("file-menu").open = phone; if (!phone) { $("adv").open = false; $("check-menu").open = false; } }
    baseR = Math.max(80, Math.min(freeW, freeH) / 2 - 16);
    baseK = Math.max(20, Math.min((freeW - 32) / TAU, (freeH - 24) / Math.PI));
    applyView();
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
      var x0 = -Math.PI + (cx - freeL) / k, x1 = Math.PI - (freeR - cx) / k;
      FB.wrap = k * TAU > freeR - freeL + 1;
      xc = FB.wrap ? wrapPi(xc) : x0 > x1 ? 0 : Math.max(x0, Math.min(x1, xc));
      var y0 = (freeB - cy) / k - HALF_PI, y1 = HALF_PI - (cy - freeT) / k;
      yc = y0 > y1 ? 0 : Math.max(y0, Math.min(y1, yc));
      view.lon = xc / D2R; view.lat = yc / D2R;
      FB.k = k; FB.xc = xc; FB.yc = yc;
    } else {
      view.lon = wrap180(view.lon);
      view.lat = Math.max(-90, Math.min(90, view.lat));
      projection.rotate([-view.lon, -view.lat, 0]).scale(baseR * view.zoom).translate([cx, cy]);
    }
  }
  function localScale() { return (flat ? baseK : baseR) * view.zoom; }
  function zoomForScale(S) { return S / (flat ? baseK : baseR); }

  var pal = {}, hatch = null;
  var PAL_KEYS = ["ocean", "grat", "limb", "glow", "border", "prov", "label", "label-halo", "city", "city-ring", "city-label", "city-halo", "select", "select-fill", "hover", "unclaimed", "hatch", "sat-light", "water", "sea-label", "river", "grid-label", "ocean-deep", "river-label"];
  function refreshPalette() {
    var cs = getComputedStyle(document.documentElement);
    PAL_KEYS.forEach(function (k) { pal[k] = cs.getPropertyValue("--uc-" + k).trim(); });
    var was = pal.antique;
    pal.antique = document.documentElement.getAttribute("data-uc-style") === "antique";
    pal.colors = []; pal.bands = []; tints.clear();
    for (var i = 0; i < PALETTE; i++) {
      pal.colors.push(cs.getPropertyValue("--uc-c" + i).trim() || "#cccccc");
      if (pal.antique) pal.bands.push(cs.getPropertyValue("--uc-b" + i).trim() || "#8a6a4a");
    }
    if (was !== undefined && was !== pal.antique) { remeasure(); fitBar(true); }
    if (pal.antique) loadSea();
    var c = document.createElement("canvas");
    c.width = c.height = 8;
    var hc = c.getContext("2d");
    hc.strokeStyle = pal.hatch; hc.lineWidth = 1.1; hc.lineCap = "square";
    hc.beginPath(); hc.moveTo(-2, 10); hc.lineTo(10, -2); hc.moveTo(-2, 2); hc.lineTo(2, -2); hc.moveTo(6, 10); hc.lineTo(10, 6); hc.stroke();
    hatch = ctx.createPattern(c, "repeat");
    groupsDirty = true;
    renderSwatches();
  }
  var tints = new Map();
  function tintOf(hex) {
    var t = tints.get(hex);
    if (t) return t;
    var m = /^#([0-9a-f]{6})$/i.exec(hex), paper = [243, 234, 211];
    if (!m) return hex;
    var n = parseInt(m[1], 16), rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    t = "rgb(" + rgb.map(function (v, i) { return Math.round(paper[i] + (v - paper[i]) * 0.5); }).join(",") + ")";
    tints.set(hex, t);
    return t;
  }
  var HELD_BY = {
    GBR: "AIA BMU IOT VGB CYM FLK GIB GGY IMN JEY MSR PCN SHN SGS TCA WSB ESB",
    USA: "ASM GUM MNP PRI VIR UMI USG",
    FRA: "PYF NCL WLF ATF CLP BLM MAF SPM",
    NLD: "ABW CUW SXM",
    DNK: "GRL FRO",
    AUS: "ATC CSI HMD IOA NFK",
    NZL: "COK NIU",
    CHN: "HKG MAC",
    FIN: "ALD"
  };
  var SHORT_NAME = { "United Kingdom": "UK", "United States": "US" };
  function rulerOf(c) {
    var co = countries[c], r = co ? co.ruler : -1;
    return isInt(r) && r >= 0 && r !== c && countries[r] && countries[r].alive && hasLand(r) ? r : -1;
  }
  function hueOf(c) {
    for (var k = 0, r; k < 8 && (r = rulerOf(c)) >= 0; k++) c = r;
    return c;
  }
  function rules(r, c) {
    for (var k = 0; k < 8 && c >= 0; k++) { if (c === r) return true; c = countries[c] && isInt(countries[c].ruler) ? countries[c].ruler : -1; }
    return false;
  }
  function rulerTag(c) {
    var r = rulerOf(c);
    if (r < 0) return "";
    var n = countries[r].name.trim();
    return "(" + (SHORT_NAME[n] || n) + ")";
  }
  function shownName(c) {
    var t = rulerTag(c);
    return t ? countries[c].name + " " + t : countries[c].name;
  }
  function colorOf(c) {
    var col = countries[hueOf(c)].color;
    if (typeof col === "number") return pal.colors[col % PALETTE];
    return pal.antique ? tintOf(col) : col;
  }
  function bandOf(c) {
    var col = countries[hueOf(c)].color;
    return typeof col === "number" ? pal.bands[col % PALETTE] : col;
  }
  function remeasure() {
    widthCache.clear(); glyphCache.clear();
    cities.forEach(function (c) { c.w = 0; });
    if (feats) queueLabels(countries.map(function (c, i) { return i; }));
    scheduleRender();
  }

  var renderQueued = false, interacting = 0, settleTimer = null;
  function scheduleRender() {
    if (!renderQueued) { renderQueued = true; requestAnimationFrame(frame); }
  }
  function frame() {
    renderQueued = false;
    var t0 = performance.now();
    render();
    if (interacting > 0) noteCost(performance.now() - t0);
    else { maybeDetail(); maybeRelief(); }
  }
  function moving() {
    interacting = 1;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(function () { interacting = 0; scheduleRender(); settled(); }, 140);
    scheduleRender();
  }
  var slow = 0, slowFrames = 0;
  var DETAIL_S = 3600;
  function levelFor() {
    var px = localScale();
    var level = px < 900 ? 0 : px < 2600 ? 1 : 2;
    if (level === 2 && px >= DETAIL_S && !slow) {
      wantDetail();
      if (detailGeo && detailGeo.ready && levels[3]) level = 3;
    }
    return Math.max(0, level - slow);
  }
  function wantDetail() {
    if (!hasDetail || (detailGeo && detailGeo.key === objKey)) return;
    var key = objKey;
    var dg = detailGeo = { key: key, ready: false, failed: false };
    fetchJSON(key === "units" ? "data/units-detail.json" : "data/provinces-detail.json").then(function (d) {
      if (detailGeo !== dg || objKey !== key) return;
      if (!d || !Array.isArray(d.arcs) || d.arcs.length !== arcA.length) throw new Error("the detailed borders do not match");
      dg.topo = { type: "Topology", transform: d.transform, arcs: d.arcs, objects: baseObjects };
      dg.feats = new Array(nUnit); dg.lines = new Array(d.arcs.length);
      prepareDetail(dg, 0, 0);
    }).catch(function (e) { dg.failed = true; console.warn("detailed borders", e); });
  }
  function prepareDetail(dg, i, a) {
    if (detailGeo !== dg) return;
    var t0 = performance.now(), geoms = dg.topo.objects[dg.key].geometries, n = dg.lines.length;
    while (i < nUnit && performance.now() - t0 < 10) { dg.feats[i] = prepare([topojson.feature(dg.topo, geoms[i])])[0]; i++; }
    while (i >= nUnit && a < n && performance.now() - t0 < 10) { dg.lines[a] = prepareArc(topojson.feature(dg.topo, { type: "LineString", arcs: [a] }).geometry.coordinates); a++; }
    if (i < nUnit || a < n) { setTimeout(function () { prepareDetail(dg, i, a); }, 0); return; }
    levels[3] = dg.topo; feats[3] = dg.feats; arcLines[3] = dg.lines;
    shapeCache[3].clear();
    dg.ready = true;
    scheduleRender();
  }
  function noteCost(ms) {
    if (slow) return;
    if (ms > 28) { if (++slowFrames >= 6) { slow = 1; } } else slowFrames = 0;
  }

  var B = { ex: 0, ey: 0, ez: 0, nx: 0, ny: 0, nz: 0, cx: 0, cy: 0, cz: 0, r: 1 };
  function basis() {
    var lon = view.lon * D2R, lat = view.lat * D2R;
    var sl = Math.sin(lon), cl = Math.cos(lon), sp = Math.sin(lat), cp = Math.cos(lat);
    B.ex = -sl; B.ey = cl; B.ez = 0;
    B.nx = -sp * cl; B.ny = -sp * sl; B.nz = cp;
    B.cx = cp * cl; B.cy = cp * sl; B.cz = sp;
    B.r = projection.scale();
  }
  function flatWindow() {
    var k = FB.k, margin = 40 / k;
    FB.vmin = FB.wrap ? FB.xc - cx / k - margin : Math.max(-Math.PI, FB.xc - cx / k - margin);
    FB.vmax = FB.wrap ? FB.xc + (W - cx) / k + margin : Math.min(Math.PI, FB.xc + (W - cx) / k + margin);
    FB.pmin = Math.max(-HALF_PI, FB.yc - (H - cy) / k - margin);
    FB.pmax = Math.min(HALF_PI, FB.yc + cy / k + margin);
  }
  function setupFrame() { if (flat) flatWindow(); else basis(); }

  function capOf(X, Y, Z, n, sx, sy, sz) {
    var c = Math.hypot(sx, sy, sz) > 1e-9 ? normalize([sx, sy, sz]) : [X[0], Y[0], Z[0]];
    var minDot = 1;
    for (var k = 0; k < n; k++) { var d = c[0] * X[k] + c[1] * Y[k] + c[2] * Z[k]; if (d < minDot) minDot = d; }
    return { cx: c[0], cy: c[1], cz: c[2], radius: Math.acos(Math.max(-1, Math.min(1, minDot))) };
  }
  function prepare(featureList) {
    return featureList.map(function (f) {
      var g = f.geometry;
      var polys = !g ? [] : g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
      var rings = [], sx = 0, sy = 0, sz = 0, all = { X: [], Y: [], Z: [] };
      polys.forEach(function (poly) {
        poly.forEach(function (ring) {
          var n = ring.length, X = new Float64Array(n), Y = new Float64Array(n), Z = new Float64Array(n);
          for (var k = 0; k < n; k++) {
            var v = toVec(ring[k][0], ring[k][1]);
            X[k] = v[0]; Y[k] = v[1]; Z[k] = v[2]; sx += v[0]; sy += v[1]; sz += v[2];
            all.X.push(v[0]); all.Y.push(v[1]); all.Z.push(v[2]);
          }
          rings.push({ x: X, y: Y, z: Z, n: n });
        });
      });
      if (!rings.length) return { rings: [], cx: 1, cy: 0, cz: 0, radius: -10, geo: null };
      var cap = capOf(all.X, all.Y, all.Z, all.X.length, sx, sy, sz);
      cap.rings = rings;
      cap.geo = g;
      return cap;
    });
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
  function makeGraticule() {
    var lines = [];
    for (var lat = -80; lat <= 80; lat += 10) { var pts = []; for (var lon = -180; lon <= 180; lon += 2) pts.push([lon, lat]); lines.push(prepareLine(pts)); }
    for (var lo = -180; lo < 180; lo += 10) {
      var top = lo % 90 === 0 ? 90 : 80, mp = [];
      for (var la = -top; la <= top; la += 2) mp.push([lo, la]);
      lines.push(prepareLine(mp));
    }
    return lines;
  }

  function featureInFront(f) {
    if (f.radius < -1) return false;
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
  function rangeHits(a, b) {
    for (var s = -1; s <= 1; s++) { var sh = s * TAU; if (b + sh >= FB.vmin && a + sh <= FB.vmax) return true; }
    return false;
  }
  function featureInFlat(f) {
    if (f.radius < -1) return false;
    var lat = Math.asin(Math.max(-1, Math.min(1, f.cz))), r = f.radius;
    if (lat + r < FB.pmin || lat - r > FB.pmax) return false;
    if (r >= Math.PI / 2 || Math.abs(lat) + r >= Math.PI / 2 - 1e-6) return true;
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
    if (L.radius < Math.PI / 2 && !featureInFront(L)) return;
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

  var geoPathFor = new Map();
  function d3path(c) {
    var p = geoPathFor.get(c);
    if (!p) { p = d3.geoPath(projection, c); geoPathFor.set(c, p); }
    return p;
  }
  function traceFeature(c, f) {
    if (flat) {
      if (!featureInFlat(f)) return;
      for (var j = 0; j < f.rings.length; j++) traceFlat(c, f.rings[j], true);
      return;
    }
    if (!featureInFront(f)) return;
    if (f.radius > Math.PI / 4 && f.geo && -(f.cx * B.cx + f.cy * B.cy + f.cz * B.cz) >= Math.cos(f.radius) - 1e-9) {
      d3path(c)(f.geo);
      return;
    }
    for (var i = 0; i < f.rings.length; i++) traceRing(c, f.rings[i]);
  }
  function traceArc(c, L) {
    if (L.parts) { for (var i = 0; i < L.parts.length; i++) traceArc(c, L.parts[i]); return; }
    if (flat) { if (featureInFlat(L)) traceFlat(c, L, false); return; }
    traceLine(c, L);
  }
  function traceArcs(c, lines, idx) { for (var i = 0; i < idx.length; i++) traceArc(c, lines[idx[i]]); }

  var groups = [], unclaimedUnits = [], unitsOf = [], groupsDirty = true, arcsDirty = true;
  var FINER = new Set("AGO ARG AUS AUT BLR BOL BRA CAN CHN COD DEU DZA ETH IDN IND IRN KAZ KEN MDG MEX MLI MMR MNG MOZ MRT MYS NER PAK PER POL RUS SAU SDN SOL TCD TZA UKR USA ZAF ZMB".split(" "));
  function hasFiner(c) {
    var us = unitsOf[c] || [];
    for (var i = 0; i < us.length; i++) { var o = base.provOwner[unitProv[us[i]]]; if (o >= 0 && FINER.has(base.countries[o].code)) return true; }
    return false;
  }
  var borderArcs = [], provArcs = [], unitArcs = [], coastArcs = [], borderProvArcs = [], borderUnitArcs = [], allProvArcs = [], allUnitArcs = [], soloArcs = [], fineShown = new Set(), fineUnits = new Uint8Array(0);
  function rebuildGroups() {
    var map = new Map();
    unitsOf = countries.map(function () { return []; });
    unclaimedUnits = [];
    for (var u = 0; u < nUnit; u++) {
      var o = owner[u];
      if (o < 0 || !unitsOf[o]) unclaimedUnits.push(u); else unitsOf[o].push(u);
    }
    for (var c = 0; c < countries.length; c++) {
      if (!unitsOf[c].length) continue;
      var fill = colorOf(c);
      var g = map.get(fill);
      if (!g) { g = { fill: fill, band: pal.antique ? bandOf(c) : null, countries: [] }; map.set(fill, g); }
      g.countries.push(c);
    }
    groups = Array.from(map.values());
    groupsDirty = false;
    bandArcs = null;
  }
  var shapeCache = [new Map(), new Map(), new Map(), new Map()], shapeVersion = new Map();
  var EMPTY_SHAPE = { rings: [], cx: 1, cy: 0, cz: 0, radius: -10, geo: null };
  function touchShapes(list) {
    list.forEach(function (c) { shapeVersion.set(c, (shapeVersion.get(c) || 0) + 1); });
  }
  function shapeOf(c, lvl) {
    var m = shapeCache[lvl], s = m.get(c), v = shapeVersion.get(c) || 0;
    if (s && s.v === v) return s.f;
    var us = c === UNCLAIMED ? unclaimedUnits : unitsOf[c];
    var f = EMPTY_SHAPE;
    if (us && us.length) {
      var t = levels[lvl], g = t.objects[objKey].geometries;
      var merged = topojson.merge(t, us.map(function (u) { return g[u]; }));
      f = prepare([{ geometry: merged }])[0];
    }
    m.set(c, { v: v, f: f });
    return f;
  }
  function freshGroups() { if (groupsDirty) rebuildGroups(); }
  var innerKinds = new Uint8Array(0);
  function rebuildArcs() {
    borderArcs = []; provArcs = []; unitArcs = []; coastArcs = []; borderProvArcs = []; borderUnitArcs = []; allProvArcs = []; allUnitArcs = []; soloArcs = []; unitCoast = null; bandArcs = null;
    innerKinds = new Uint8Array(countries.length);
    fineUnits = new Uint8Array(countries.length);
    for (var a = 0; a < arcA.length; a++) {
      var A = arcA[a], b = arcB[a];
      if (A < 0) continue;
      if (b < 0) { if (!arcSeam[a]) coastArcs.push(a); continue; }
      var pa = unitProv[A], pb = unitProv[b];
      var apart = pa !== pb && (ui.fine || provGroup[pa] < 0 || provGroup[pa] !== provGroup[pb]);
      (apart ? allProvArcs : allUnitArcs).push(a);
      if (owner[A] !== owner[b]) { borderArcs.push(a); (apart ? borderProvArcs : borderUnitArcs).push(a); continue; }
      var co = owner[A] >= 0 ? countries[owner[A]] : null, hide = co && co.lines ? co.lines : 0;
      var fineOnly = !apart && fineData && pa === pb && !ui.fine;
      if (co && !fineOnly) innerKinds[owner[A]] |= apart ? 1 : 2;
      if (co && fineData && pa === pb) fineUnits[owner[A]] = 1;
      if (!(hide & (apart ? 1 : 2))) {
        (apart ? provArcs : unitArcs).push(a);
        if (!apart && !ui.fine && fineShown.has(owner[A])) soloArcs.push(a);
      }
    }
    arcsDirty = false;
  }
  var selCache = { c: -2, v: -1, arcs: [] };
  function selectionArcs(c) {
    if (selCache.c === c && selCache.v === ownerVersion) return selCache.arcs;
    var out = [];
    for (var a = 0; a < arcA.length; a++) {
      var A = arcA[a];
      if (A < 0 || arcSeam[a]) continue;
      var b = arcB[a], inA = owner[A] === c, inB = b >= 0 && owner[b] === c;
      if (inA !== inB) out.push(a);
    }
    selCache = { c: c, v: ownerVersion, arcs: out };
    return out;
  }
  function ownersChanged(list, keepShapes) {
    ownerVersion++;
    groupsDirty = true;
    arcsDirty = true;
    if (keepShapes) return;
    if (list) touchShapes(list.concat([UNCLAIMED]));
    else { shapeCache.forEach(function (m) { m.clear(); }); }
  }

  function hasLand(c) {
    if (unitsOf[c] && unitsOf[c].length) return true;
    for (var i = 0; i < pieces.length; i++) if (pieces[i].owner === c) return true;
    return false;
  }
  function piecesChanged() {
    pieceVersion++;
    if (ui.piece) ui.piece = pieceById(ui.piece.id);
    if (ui.hoverPiece) ui.hoverPiece = pieceById(ui.hoverPiece.id);
    scheduleRender();
  }
  function pieceById(id) {
    for (var i = 0; i < pieces.length; i++) if (pieces[i].id === id) return pieces[i];
    return null;
  }
  function withOwner(p, o) { return { id: p.id, owner: o, shape: p.shape, edges: null }; }
  function ringSigned(ring) {
    var s = 0;
    for (var i = 0; i + 1 < ring.length; i++) s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    return s / 2;
  }
  function toD3(mp) { return mp.map(function (poly) { return poly.map(function (ring) { return ring.slice().reverse(); }); }); }
  function cleanPolys(mp) {
    var q = mp.map(function (poly) { return poly.map(function (ring) { return ring.map(function (pt) { return [Math.round(pt[0] * 1e4) / 1e4, Math.round(pt[1] * 1e4) / 1e4]; }); }); });
    return toD3(PC.union(q).filter(function (poly) { return Math.abs(ringSigned(poly[0])) > 2e-8; }));
  }
  function makeShape(polys) {
    var bbs = [], n = 0;
    polys.forEach(function (poly) {
      var x0 = 180, y0 = 90, x1 = -180, y1 = -90, ring = poly[0];
      for (var i = 0; i < ring.length; i++) {
        var pt = ring[i];
        if (pt[0] < x0) x0 = pt[0]; if (pt[0] > x1) x1 = pt[0];
        if (pt[1] < y0) y0 = pt[1]; if (pt[1] > y1) y1 = pt[1];
      }
      bbs.push([x0, y0, x1, y1]);
      poly.forEach(function (r) { n += r.length; });
    });
    var bb = [180, 90, -180, -90];
    bbs.forEach(function (b) { bb[0] = Math.min(bb[0], b[0]); bb[1] = Math.min(bb[1], b[1]); bb[2] = Math.max(bb[2], b[2]); bb[3] = Math.max(bb[3], b[3]); });
    var geo = { type: "MultiPolygon", coordinates: polys };
    return { polys: polys, geo: geo, f: prepare([{ geometry: geo }])[0], bb: bb, bbs: bbs, n: n, cand: null, candGen: -1, gen: -1, units: [], cover: [], area: 0, labelLand: null, labelGen: -1 };
  }
  function polysContain(polys, x, y) {
    var inside = false;
    for (var a = 0; a < polys.length; a++) for (var b = 0; b < polys[a].length; b++) {
      var ring = polys[a][b];
      for (var i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
        var p = ring[i], q = ring[j];
        if ((p[1] > y) !== (q[1] > y) && x < (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1]) + p[0]) inside = !inside;
      }
    }
    return inside;
  }
  function pieceAtLL(lon, lat) {
    for (var i = pieces.length - 1; i >= 0; i--) {
      var bb = pieces[i].shape.bb;
      if (lon < bb[0] || lon > bb[2] || lat < bb[1] || lat > bb[3]) continue;
      if (polysContain(pieces[i].shape.polys, lon, lat)) return pieces[i];
    }
    return null;
  }
  function pieceAt(x, y, u) {
    if (!pieces.length) return null;
    if (u === undefined) u = unitAt(x, y);
    if (u < 0) return null;
    var ll = lonLatAt(x, y);
    return ll ? pieceAtLL(wrap180(ll[0]), ll[1]) : null;
  }
  function pickAt(x, y) {
    var u = unitAt(x, y);
    if (u < 0) return { u: -1, p: null, o: null };
    var p = pieceAt(x, y, u);
    return { u: u, p: p, o: p ? p.owner : owner[u] };
  }
  function shapeCand(s) {
    if (s.cand && s.candGen === geomGen) return s.cand;
    var out = [], bbs = s.bbs;
    for (var u = 0; u < nUnit; u++) {
      var k = u * 4;
      for (var j = 0; j < bbs.length; j++) {
        var bb = bbs[j];
        if (unitBox[k] > bb[2] || unitBox[k + 2] < bb[0] || unitBox[k + 1] > bb[3] || unitBox[k + 3] < bb[1]) continue;
        out.push(u);
        break;
      }
    }
    s.cand = out; s.candGen = geomGen;
    return out;
  }
  function lowInside(u, polys) {
    var f = feats[0][u], ins = 0, outs = 0;
    for (var r = 0; r < f.rings.length; r++) {
      var rg = f.rings[r];
      flatArrays(rg);
      for (var k = 0; k < rg.n; k++) {
        if (polysContain(polys, rg.L[k] / D2R, rg.P[k] / D2R)) ins++; else outs++;
        if (ins && outs) return -1;
      }
    }
    return ins ? 1 : 0;
  }
  function shapeCover(s) {
    if (s.gen === geomGen) return s;
    var cand = shapeCand(s), verts = [];
    s.polys.forEach(function (poly) { poly.forEach(function (ring) { for (var i = 0; i < ring.length; i++) verts.push(ring[i]); }); });
    s.units = []; s.cover = []; s.area = 0; s.labelLand = null;
    cand.forEach(function (u) {
      var k = u * 4, x0 = unitBox[k], y0 = unitBox[k + 1], x1 = unitBox[k + 2], y1 = unitBox[k + 3], near = false, km = 0;
      for (var i = 0; i < verts.length; i++) { var v = verts[i]; if (v[0] >= x0 && v[0] <= x1 && v[1] >= y0 && v[1] <= y1) { near = true; break; } }
      if (!near) {
        var st = lowInside(u, s.polys);
        if (st === 0) return;
        if (st === 1) km = unitArea[u];
      }
      if (!km) {
        var g = geoFull[u].geometry, part = [];
        try { part = PC.intersection(s.polys, g.type === "Polygon" ? [g.coordinates] : g.coordinates); } catch (e) { part = []; }
        part.forEach(function (poly) { var a = d3.geoArea({ type: "Polygon", coordinates: poly }); if (a > TAU) a = 2 * TAU - a; km += a * R_KM * R_KM; });
      }
      if (km > 0) { s.units.push(u); s.cover.push(km); s.area += km; }
    });
    s.gen = geomGen;
    return s;
  }
  function pieceLabelLand(s) {
    if (s.labelLand && s.labelGen === geomGen) return s.labelLand;
    shapeCover(s);
    var land = [];
    if (s.units.length) {
      var t = levels[0], gs = t.objects[objKey].geometries;
      var m = topojson.merge(t, s.units.map(function (u) { return gs[u]; }));
      try { land = m.coordinates.length ? PC.intersection(s.polys, m.coordinates) : []; } catch (e) { land = []; }
    }
    s.labelLand = land; s.labelGen = geomGen;
    return land;
  }
  function withPieces(c, coords) {
    var minus = [], plus = [];
    pieces.forEach(function (p) {
      var s = shapeCover(p.shape);
      if (p.owner === c) { var l = pieceLabelLand(s); if (l.length) plus.push(l); return; }
      for (var i = 0; i < s.units.length; i++) if (owner[s.units[i]] === c) { minus.push(s.polys); return; }
    });
    if (!minus.length && !plus.length) return coords;
    try {
      var g = coords;
      if (minus.length && g.length) g = PC.difference.apply(null, [g].concat(minus));
      if (plus.length) g = PC.union.apply(null, (g.length ? [g] : []).concat(plus));
      return toD3(g);
    } catch (e) { return coords; }
  }
  function countryArea(c) {
    var area = 0;
    (unitsOf[c] || []).forEach(function (u) { area += unitArea[u]; });
    pieces.forEach(function (p) {
      var s = shapeCover(p.shape);
      for (var i = 0; i < s.units.length; i++) if (owner[s.units[i]] === c) area -= s.cover[i];
      if (p.owner === c) area += s.area;
    });
    return Math.max(0, area);
  }
  function cityOwner(c) {
    var u = cityUnit(c);
    if (u < 0) return null;
    if (pieces.length) { var p = pieceAtLL(c.lon, c.lat); if (p) return p.owner; }
    return owner[u];
  }
  function unitHolds(u, lam, phi) {
    var k = u * 4, lon = lam / D2R, lat = phi / D2R;
    if (lon < unitBox[k] || lon > unitBox[k + 2] || lat < unitBox[k + 1] || lat > unitBox[k + 3]) return false;
    return ringsHold(feats[2][u], lam, phi);
  }
  function unitNear(lon, lat) {
    var lam = lon * D2R, phi = lat * D2R;
    if (edgeHint >= 0 && edgeHint < nUnit && unitHolds(edgeHint, lam, phi)) return edgeHint;
    if (!unitGrid) return -1;
    var gx = Math.floor((wrap180(lon) + 180) / 2), gy = Math.floor((Math.max(-89.999, Math.min(89.999, lat)) + 90) / 2);
    var list = unitGrid.get(gx * 100 + gy) || [];
    for (var i = 0; i < list.length; i++) if (unitHolds(list[i], lam, phi)) { edgeHint = list[i]; return list[i]; }
    return -1;
  }
  function edgeKey(p) {
    var h = p.owner + 7, cand = shapeCand(p.shape), bb = p.shape.bb;
    for (var i = 0; i < cand.length; i++) h = (Math.imul(h, 31) + owner[cand[i]] + 3) | 0;
    for (i = 0; i < pieces.length; i++) {
      var q = pieces[i], qb = q.shape.bb;
      if (qb[0] > bb[2] + 0.01 || qb[2] < bb[0] - 0.01 || qb[1] > bb[3] + 0.01 || qb[3] < bb[1] - 0.01) continue;
      h = (Math.imul(h, 31) + q.id * 3 + q.owner + 5) | 0;
    }
    return geomGen + ":" + h + ":" + cand.length;
  }
  function visibleOwnerLL(lon, lat) {
    lon = wrap180(lon); lat = Math.max(-90, Math.min(90, lat));
    var u = unitNear(lon, lat);
    if (u < 0) return SEA;
    for (var i = pieces.length - 1; i >= 0; i--) {
      var q = pieces[i];
      var bb = q.shape.bb;
      if (lon < bb[0] || lon > bb[2] || lat < bb[1] || lat > bb[3]) continue;
      if (polysContain(q.shape.polys, lon, lat)) return q.owner;
    }
    return owner[u];
  }
  function sideOwner(a, b, right) {
    var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    var cs = Math.max(0.02, Math.cos(my * D2R));
    var dx = (b[0] - a[0]) * cs, dy = b[1] - a[1], len = Math.hypot(dx, dy);
    if (!(len > 0)) return SEA;
    var eps = Math.min(2e-3, Math.max(2e-6, len * 0.25));
    var nx = right ? -dy : dy, ny = right ? dx : -dx;
    return visibleOwnerLL(mx + nx / len * eps / cs, my + ny / len * eps);
  }
  function pieceEdges(p) {
    var key = edgeKey(p);
    if (p.edges && p.edges.key === key) return p.edges;
    var rings = [], perim = 0;
    edgeHint = -1;
    p.shape.polys.forEach(function (poly) { poly.forEach(function (ring) { for (var k = 0; k + 1 < ring.length; k++) perim += Math.max(Math.abs(ring[k + 1][0] - ring[k][0]), Math.abs(ring[k + 1][1] - ring[k][1])); }); });
    var step = Math.max(0.004, perim / 2500);
    p.shape.polys.forEach(function (poly) {
      poly.forEach(function (ring, ri) {
        var A = ringSigned(ring), right = ri === 0 ? A < 0 : A > 0;
        var pts = [ring[0]], out = [];
        for (var k = 0; k + 1 < ring.length; k++) {
          var a = ring[k], b = ring[k + 1];
          var m = Math.max(1, Math.min(64, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / step)));
          for (var j = 1; j <= m; j++) {
            var q = j === m ? b : [a[0] + (b[0] - a[0]) * j / m, a[1] + (b[1] - a[1]) * j / m];
            out.push(sideOwner(pts[pts.length - 1], q, right));
            pts.push(q);
          }
        }
        rings.push({ pts: pts, out: out });
      });
    });
    var e = p.edges = { key: key, rings: rings, sel: null, selKey: "" };
    e.borders = edgeRuns(e, function (o) { return o !== SEA && o !== p.owner; });
    return e;
  }
  function edgeRuns(e, pred) {
    var lines = [];
    e.rings.forEach(function (r) {
      var pts = r.pts, out = r.out, n = out.length;
      if (!n) return;
      var start = 0;
      while (start < n && pred(out[start])) start++;
      if (start === n) { lines.push(prepareLine(pts)); return; }
      var cur = null;
      for (var i = 1; i <= n; i++) {
        var k = (start + i) % n;
        if (pred(out[k])) { if (!cur) cur = [pts[k]]; cur.push(pts[k + 1]); }
        else if (cur) { lines.push(prepareLine(cur)); cur = null; }
      }
      if (cur) lines.push(prepareLine(cur));
    });
    return lines;
  }
  function pieceSelRuns(p, c) {
    var e = pieceEdges(p), key = e.key + "|" + c;
    if (e.selKey !== key) { e.sel = edgeRuns(e, function (o) { return o !== SEA && (p.owner === c) !== (o === c); }); e.selKey = key; }
    return e.sel;
  }
  function coastOf(u) {
    if (!unitCoast) {
      unitCoast = new Array(nUnit);
      coastArcs.forEach(function (a) { var A = arcA[a]; (unitCoast[A] || (unitCoast[A] = [])).push(a); });
    }
    return unitCoast[u] || [];
  }
  function visiblePieces() {
    if (!pieces.length) return null;
    var out = [];
    for (var i = 0; i < pieces.length; i++) if (inView(pieces[i].shape.f)) out.push(pieces[i]);
    return out.length ? out : null;
  }
  function clipOutPieces(vis) {
    ctx.save();
    ctx.beginPath(); ctx.rect(-10, -10, W + 20, H + 20);
    for (var i = 0; i < vis.length; i++) traceFeature(ctx, vis[i].shape.f);
    ctx.clip("evenodd");
  }
  function clipToLand(vis, lvl) {
    var units = new Set(), seen = new Set(), F = feats[lvl];
    vis.forEach(function (p) {
      var cand = shapeCand(p.shape);
      for (var i = 0; i < cand.length; i++) { units.add(cand[i]); seen.add(owner[cand[i]] >= 0 ? owner[cand[i]] : UNCLAIMED); }
    });
    ctx.save();
    ctx.beginPath();
    if (units.size <= 120) units.forEach(function (u) { traceFeature(ctx, F[u]); });
    else seen.forEach(function (o) { traceFeature(ctx, shapeOf(o, lvl)); });
    ctx.clip();
  }
  function satTint() { return pal.antique ? 0.45 : 0.22; }
  var WASH = 0.28, WASH_RGB = [233, 217, 180], washCache = new Map();
  function washed(col) {
    var w = washCache.get(col);
    if (w) return w;
    var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(col), rgb = null;
    if (m) {
      var hx = m[1].length === 3 ? m[1].replace(/./g, "$&$&") : m[1], n = parseInt(hx, 16);
      rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    } else {
      var r = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(col);
      if (r) rgb = [+r[1], +r[2], +r[3]];
    }
    w = rgb ? "rgb(" + rgb.map(function (v, i) { var s = 255 - (255 - v) * (255 - WASH_RGB[i]) / 255; return Math.round(v + (s - v) * WASH); }).join(",") + ")" : col;
    washCache.set(col, w);
    return w;
  }
  function punch(paths) {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out"; ctx.globalAlpha = 1;
    ctx.beginPath(); paths();
    ctx.fillStyle = "#000"; ctx.fill();
    ctx.restore();
  }
  var layerCanvas = null;
  function layerFill(list, color, relPat) {
    var cv = layerCanvas || (layerCanvas = document.createElement("canvas"));
    if (cv.width !== canvas.width || cv.height !== canvas.height) { cv.width = canvas.width; cv.height = canvas.height; }
    var g = cv.getContext("2d"), main = ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "copy"; g.globalAlpha = 1;
    g.fillStyle = color; g.fillRect(0, 0, cv.width, cv.height);
    g.globalCompositeOperation = "source-over";
    g.setTransform(main.getTransform());
    ctx = g;
    try {
      g.beginPath(); g.rect(-10, -10, W + 20, H + 20);
      shade(relPat);
      g.globalCompositeOperation = "destination-in";
      g.beginPath(); list.forEach(function (p) { traceFeature(g, p.shape.f); });
      g.fillStyle = "#000"; g.fill();
    } finally {
      g.globalCompositeOperation = "source-over";
      ctx = main;
    }
    main.save();
    main.setTransform(1, 0, 0, 1, 0, 0);
    main.drawImage(cv, 0, 0);
    main.restore();
  }
  function drawPieceFills(vis, lvl, satellite, satLand, relPat) {
    clipToLand(vis, lvl);
    ctx.globalAlpha = satellite ? satTint() : 1;
    var byOwner = new Map();
    vis.forEach(function (p) {
      var o = p.owner >= 0 && countries[p.owner] ? p.owner : UNCLAIMED;
      if (!byOwner.has(o)) byOwner.set(o, []);
      byOwner.get(o).push(p);
    });
    byOwner.forEach(function (list, o) {
      ctx.beginPath();
      list.forEach(function (p) { traceFeature(ctx, p.shape.f); });
      if (satLand) punch(function () { list.forEach(function (p) { traceFeature(ctx, p.shape.f); }); });
      if (o >= 0) {
        if (relPat && !satLand) { layerFill(list, colorOf(o), relPat); return; }
        ctx.fillStyle = satLand ? washed(colorOf(o)) : colorOf(o); ctx.fill(); shade(relPat); return;
      }
      ctx.fillStyle = satLand ? washed(pal.unclaimed) : pal.unclaimed; ctx.fill(); shade(relPat);
      var ga = ctx.globalAlpha; ctx.globalAlpha = 1; ctx.fillStyle = hatch; ctx.fill(); ctx.globalAlpha = ga;
    });
    ctx.globalAlpha = 1;
    drawPieceBands(vis, satellite, arcLines[lvl]);
    drawPieceHover(vis);
    var c = currentCountry();
    if (c >= 0 && ui.tool === "select" && !ui.city) {
      ctx.beginPath();
      vis.forEach(function (p) { if (p.owner === c) traceFeature(ctx, p.shape.f); });
      ctx.fillStyle = pal["select-fill"]; ctx.fill();
    }
    ctx.restore();
  }
  function drawPieceBands(vis, satellite, L) {
    var bw = bandWidth(localScale());
    if (!bw) return;
    ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.lineWidth = bw * 2;
    ctx.globalAlpha = satellite ? 0.45 : 0.6;
    vis.forEach(function (p) {
      var e = pieceEdges(p), o = p.owner;
      if (o >= 0 && countries[o]) {
        ctx.save();
        ctx.beginPath(); traceFeature(ctx, p.shape.f); ctx.clip();
        ctx.beginPath(); e.borders.forEach(function (b) { traceArc(ctx, b); });
        shapeCand(p.shape).forEach(function (u) { coastOf(u).forEach(function (a) { traceArc(ctx, L[a]); }); });
        ctx.strokeStyle = bandOf(o); ctx.stroke();
        ctx.restore();
      }
      if (!e.next) {
        e.next = new Map();
        e.rings.forEach(function (r) { r.out.forEach(function (n) { if (n !== SEA && n !== o && n >= 0 && !e.next.has(n)) e.next.set(n, edgeRuns(e, function (x) { return x === n; })); }); });
      }
      if (!e.next.size) return;
      ctx.save();
      ctx.beginPath(); ctx.rect(-10, -10, W + 20, H + 20); traceFeature(ctx, p.shape.f); ctx.clip("evenodd");
      e.next.forEach(function (runs, n) {
        if (!countries[n]) return;
        ctx.beginPath(); runs.forEach(function (b) { traceArc(ctx, b); });
        ctx.strokeStyle = bandOf(n); ctx.stroke();
      });
      ctx.restore();
    });
    ctx.globalAlpha = 1; ctx.lineCap = "butt";
  }
  function drawPieceHover(vis) {
    var u = ui.hover, hp = ui.hoverPiece;
    if (u < 0 || drag || stroke || cityDrag || lasso) return;
    var vo = hp ? hp.owner : owner[u], list = [];
    if (ui.tool === "paint") {
      var to = brush();
      if (to === null) return;
      if (ui.whole && vo >= 0) vis.forEach(function (p) { if (p.owner === vo && p.owner !== to) list.push(p); });
      else if (hp && vis.indexOf(hp) >= 0) {
        var ru = regionUnits(u), any = hp.owner !== to;
        for (var i = 0; !any && i < ru.length; i++) if (owner[ru[i]] !== to) any = true;
        if (!any) return;
        ctx.beginPath(); traceFeature(ctx, regionShape(u, levelFor()));
      }
      if (list.length) { ctx.beginPath(); list.forEach(function (p) { traceFeature(ctx, p.shape.f); }); }
      else if (!hp || ui.whole) return;
      ctx.globalAlpha = 0.85; ctx.fillStyle = to >= 0 ? colorOf(to) : pal.unclaimed; ctx.fill();
      if (to < 0) { ctx.fillStyle = hatch; ctx.fill(); }
      ctx.globalAlpha = 1;
      ctx.setLineDash([3, 3]); ctx.strokeStyle = pal.select; ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]);
    } else if (ui.tool === "select") {
      if (vo < 0 || vo === ui.country) return;
      vis.forEach(function (p) { if (p.owner === vo) list.push(p); });
      if (!list.length) return;
      ctx.beginPath(); list.forEach(function (p) { traceFeature(ctx, p.shape.f); });
      ctx.fillStyle = pal.hover; ctx.fill();
    }
  }
  function drawPieceLines(vis, lvl, L, satellite) {
    clipToLand(vis, lvl);
    ctx.lineJoin = "round";
    ctx.beginPath();
    vis.forEach(function (p) { var b = pieceEdges(p).borders; for (var i = 0; i < b.length; i++) traceArc(ctx, b[i]); });
    ctx.strokeStyle = pal.border; ctx.lineWidth = satellite ? 1.3 : 1.15; ctx.stroke();
    var c = currentCountry();
    if (c >= 0 && !ui.city && !((ui.tool === "paint" || ui.tool === "draw") && ui.erase)) {
      ctx.beginPath();
      vis.forEach(function (p) { var r = pieceSelRuns(p, c); for (var i = 0; i < r.length; i++) traceArc(ctx, r[i]); });
      ctx.strokeStyle = pal.select; ctx.lineWidth = 2.2; ctx.stroke();
      vis.forEach(function (p) {
        if (p.owner !== c) return;
        ctx.save();
        ctx.beginPath(); traceFeature(ctx, p.shape.f); ctx.clip();
        ctx.beginPath();
        shapeCand(p.shape).forEach(function (u) { coastOf(u).forEach(function (a) { traceArc(ctx, L[a]); }); });
        ctx.stroke();
        ctx.restore();
      });
    }
    ctx.restore();
  }
  function drawStrokeOverlay(F, satellite) {
    var by = new Map();
    stroke.changes.forEach(function (from, u) {
      var o = owner[u];
      if (o === from) return;
      var k = o >= 0 && countries[o] ? o : UNCLAIMED;
      if (!by.has(k)) by.set(k, []);
      by.get(k).push(u);
    });
    ctx.globalAlpha = satellite ? satTint() : 1;
    by.forEach(function (list, o) {
      ctx.beginPath();
      list.forEach(function (u) { traceFeature(ctx, F[u]); });
      if (o >= 0) { ctx.fillStyle = colorOf(o); ctx.fill(); return; }
      ctx.fillStyle = pal.unclaimed; ctx.fill();
      var ga = ctx.globalAlpha; ctx.globalAlpha = 1; ctx.fillStyle = hatch; ctx.fill(); ctx.globalAlpha = ga;
    });
    ctx.globalAlpha = 1;
  }
  function drawRegionLines(L, uArcs, pArcs, ua, pa) {
    if (ua > 0 && uArcs.length) {
      ctx.beginPath(); traceArcs(ctx, L, uArcs);
      ctx.globalAlpha = ua * 0.7; ctx.setLineDash([1, 3]); ctx.lineCap = "round";
      ctx.strokeStyle = pal.prov; ctx.lineWidth = 0.7; ctx.stroke();
      ctx.setLineDash([]); ctx.lineCap = "butt"; ctx.globalAlpha = 1;
    }
    if (pa > 0 && pArcs.length) {
      ctx.beginPath(); traceArcs(ctx, L, pArcs);
      ctx.globalAlpha = pa; ctx.setLineDash([1.5, 3]); ctx.lineCap = "round";
      ctx.strokeStyle = pal.prov; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.setLineDash([]); ctx.lineCap = "butt"; ctx.globalAlpha = 1;
    }
  }
  function drawLasso() {
    if (!lasso) return;
    ctx.beginPath();
    var started = false;
    for (var i = 0; i < lasso.ll.length; i++) {
      var q = lasso.ll[i];
      if (!q) continue;
      var pt = projectLL(q[0], q[1]);
      if (!pt) continue;
      if (!started) { ctx.moveTo(pt[0], pt[1]); started = true; } else ctx.lineTo(pt[0], pt[1]);
    }
    if (!started) return;
    ctx.closePath();
    var to = brush();
    if (to === null) return;
    ctx.globalAlpha = 0.35; ctx.fillStyle = to >= 0 ? colorOf(to) : pal.unclaimed; ctx.fill(); ctx.globalAlpha = 1;
    ctx.setLineDash([4, 3]); ctx.lineJoin = "round"; ctx.strokeStyle = pal.select; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
  }

  var sat = null, satTried = false;
  function satOn() { return ui.satellite && sat && sat.ready(); }

  var marks = null;
  function mark(name) { if (marks) marks.push([name, performance.now()]); }
  var seaDeep = null, seaLow = null, seaPath = null, seaLoad = null;
  function loadSea() {
    if (seaLoad) return;
    seaLoad = fetchJSON("data/sea.json").then(function (t) {
      if (!t.high || !t.low || !t.high.objects.deep || !t.low.objects.deep) throw new Error("sea does not match");
      var fs = topojson.feature(t.high, t.high.objects.deep).features, path = new Path2D();
      fs.forEach(function (f) {
        var g = f.geometry;
        (!g ? [] : g.type === "Polygon" ? [g.coordinates] : g.coordinates).forEach(function (poly) {
          poly.forEach(function (ring) {
            ring.forEach(function (pt, k) { if (k) path.lineTo(pt[0] * D2R, pt[1] * D2R); else path.moveTo(pt[0] * D2R, pt[1] * D2R); });
            path.closePath();
          });
        });
      });
      seaDeep = prepare(fs); seaPath = path;
      seaLow = prepare(topojson.feature(t.low, t.low.objects.deep).features);
      scheduleRender();
    }).catch(function (e) { console.warn("sea", e); });
  }
  function drawDeep() {
    if (!seaDeep) return;
    ctx.fillStyle = pal["ocean-deep"];
    if (flat) {
      var k = FB.k;
      for (var s = FB.wrap ? -1 : 0; s <= (FB.wrap ? 1 : 0); s++) {
        ctx.save();
        ctx.transform(k, 0, 0, -k, cx - k * (FB.xc - s * TAU), cy + k * FB.yc);
        ctx.fill(seaPath);
        ctx.restore();
      }
      return;
    }
    var list = localScale() < 900 ? seaLow : seaDeep;
    ctx.beginPath();
    for (var i = 0; i < list.length; i++) if (onScreen(list[i])) traceFeature(ctx, list[i]);
    ctx.fill();
  }
  function renderSat() {
    var o = { flat: flat, dpr: dpr, light: parseFloat(pal["sat-light"]) || 0, sepia: pal.antique ? 0.6 : 0, wash: pal.antique ? WASH : 0, detail: detail.shown && !detail.off, cx: cx, cy: cy };
    if (flat) { o.k = FB.k; o.xc = FB.xc; o.yc = FB.yc; o.wrap = !!FB.wrap; }
    else { o.e = [B.ex, B.ey, B.ez]; o.n = [B.nx, B.ny, B.nz]; o.c = [B.cx, B.cy, B.cz]; o.r = B.r; }
    sat.draw(o);
    if (satShow) satShow.transferFromImageBitmap(satCanvas.transferToImageBitmap());
  }
  var reliefCanvas = document.createElement("canvas"), relief = null, reliefTried = false, RELIEF_RES = 0.5;
  var rd = { key: "", rect: null, cache: new Map(), gen: 0, put: new Set(), off: false, failed: 0, ok: 0 };
  var RELIEF_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png", RELIEF_MAX_Z = 11;
  function reliefOn() {
    if (!ui.terrain || ui.satellite) return false;
    if (!relief && !reliefTried) {
      reliefTried = true;
      relief = window.UchroniaSat ? window.UchroniaSat(reliefCanvas) : null;
      if (relief) {
        relief.onRestore = function () { rd.key = ""; rd.rect = null; scheduleRender(); };
        relief.load([{ src: "data/relief-4096.webp", size: 4096 }], function () { rd.key = ""; scheduleRender(); });
      }
    }
    return !!relief && relief.ready();
  }
  function renderRelief() {
    var o = { flat: flat, dpr: dpr * RELIEF_RES, light: 0, sepia: 0, detail: !!rd.rect && !rd.off, cx: cx, cy: cy };
    if (flat) { o.k = FB.k; o.xc = FB.xc; o.yc = FB.yc; o.wrap = !!FB.wrap; }
    else { o.e = [B.ex, B.ey, B.ez]; o.n = [B.nx, B.ny, B.nz]; o.c = [B.cx, B.cy, B.cz]; o.r = B.r; }
    relief.draw(o);
  }
  var reliefKey = "", reliefPat = null;
  function reliefFrame() {
    var key = [flat ? 1 : 0, view.lon, view.lat, view.zoom, W, H, dpr, rd.gen, rd.put.size, rd.rect ? 1 : 0].join();
    if (key !== reliefKey || !reliefPat) { renderRelief(); reliefPat = reliefPattern(); reliefKey = key; }
    return reliefPat;
  }
  function reliefPattern() {
    var pat = ctx.createPattern(reliefCanvas, "no-repeat"), f = 1 / (dpr * RELIEF_RES);
    if (pat && pat.setTransform && window.DOMMatrix) pat.setTransform(new DOMMatrix([f, 0, 0, f, 0, 0]));
    return pat;
  }
  function shade(pat) {
    if (!pat) return;
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = pal.antique ? 0.72 : 0.6;
    ctx.fillStyle = pat; ctx.fill();
    ctx.restore();
  }
  function maybeRelief() {
    if (rd.off || !relief || !ui.terrain || ui.satellite || !relief.ready()) return;
    var key = [flat ? 1 : 0, view.lon.toFixed(3), view.lat.toFixed(3), view.zoom.toFixed(4), W, H].join();
    if (key === rd.key) return;
    rd.key = key;
    var want = detailWanted(relief, RELIEF_MAX_Z);
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
  function render() {
    try { draw(); }
    catch (e) { canvas.width = canvas.width; console.error(e); }
  }
  function draw() {
    if (!feats) return;
    mark("start");
    setupFrame();
    freshGroups();
    if (arcsDirty) rebuildArcs();
    var lvl = levelFor(), F = feats[lvl], L = arcLines[lvl], S = localScale();
    var satellite = satOn(), satSea = satellite && !pal.antique, satLand = satellite && pal.antique;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    if (satView.hidden === satellite) satView.hidden = !satellite;
    if (satellite) renderSat();
    var relPat = !satellite && reliefOn() ? reliefFrame() : null;

    if (flat) {
      if (!satSea) { ctx.beginPath(); traceOutline(ctx); ctx.fillStyle = pal.ocean; ctx.fill(); }
      ctx.save();
      ctx.beginPath(); traceOutline(ctx); ctx.clip();
      if (!satSea) {
        if (pal.antique) drawDeep();
        ctx.beginPath(); traceArcs(ctx, graticule, graticuleIdx);
        ctx.strokeStyle = pal.grat; ctx.lineWidth = 0.6; ctx.stroke();
        if (pal.antique) drawWaterLines(L, S);
      }
    } else {
      var r = B.r;
      if (r * 1.07 < Math.hypot(W, H)) {
        var glow = ctx.createRadialGradient(cx, cy, r, cx, cy, r * 1.07);
        glow.addColorStop(0, pal.glow); glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.07, 0, TAU); ctx.arc(cx, cy, r, 0, TAU, true); ctx.fill();
      }
      if (!satSea) {
        ctx.fillStyle = pal.ocean;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
        if (pal.antique) drawDeep();
        ctx.beginPath(); traceArcs(ctx, graticule, graticuleIdx);
        ctx.strokeStyle = pal.grat; ctx.lineWidth = 0.6; ctx.stroke();
        if (pal.antique) {
          ctx.save();
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
          drawWaterLines(L, S);
          ctx.restore();
        }
      }
    }

    mark("sea");
    var vis = visiblePieces(), cutFills = vis && satellite;
    if (cutFills) clipOutPieces(vis);
    ctx.globalAlpha = satellite ? satTint() : 1;
    var bandW = bandWidth(S);
    if (satLand) {
      groups.forEach(function (gr) { punch(function () { for (var i = 0; i < gr.countries.length; i++) traceFeature(ctx, shapeOf(gr.countries[i], lvl)); }); });
      if (unclaimedUnits.length) punch(function () { traceFeature(ctx, shapeOf(UNCLAIMED, lvl)); });
    }
    for (var g = 0; g < groups.length; g++) {
      var list = groups[g].countries;
      ctx.beginPath();
      for (var i = 0; i < list.length; i++) traceFeature(ctx, shapeOf(list[i], lvl));
      ctx.fillStyle = satLand ? washed(groups[g].fill) : groups[g].fill; ctx.fill();
      shade(relPat);
      if (bandW && groups[g].band) {
        ctx.save(); ctx.clip();
        ctx.beginPath(); traceArcs(ctx, L, bandArcsOf(g));
        ctx.globalAlpha = satellite ? 0.45 : 0.6;
        ctx.strokeStyle = groups[g].band; ctx.lineWidth = bandW * 2; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
        ctx.restore();
      }
    }
    if (unclaimedUnits.length) {
      ctx.beginPath(); traceFeature(ctx, shapeOf(UNCLAIMED, lvl));
      ctx.fillStyle = satLand ? washed(pal.unclaimed) : pal.unclaimed; ctx.fill();
      shade(relPat);
      ctx.globalAlpha = 1;
      ctx.fillStyle = hatch; ctx.fill();
    }
    ctx.globalAlpha = 1;
    mark("fills");

    if (stroke && !stroke.merged) drawStrokeOverlay(F, satellite);
    drawHover(F, lvl);
    drawSelectionFill(F, lvl);
    mark("overlays");

    if (vis) { if (cutFills) ctx.restore(); drawPieceFills(vis, lvl, satellite, satLand, relPat); }
    drawLakes(S, satellite);
    var ua = ui.fine && ui.regionLines ? clamp01((S - 700) / 500) : 0, pa = ui.regionLines ? provAlpha(S) : 0;
    if (vis) clipOutPieces(vis);
    drawRegionLines(L, unitArcs, provArcs, ua, pa);
    if (!ui.fine && ui.regionLines && soloArcs.length) drawRegionLines(L, soloArcs, [], clamp01((S - 700) / 500), 0);
    if (vis) ctx.restore();
    if (vis && (ua > 0 || pa > 0)) {
      var byHide = new Map();
      vis.forEach(function (p) { var h = p.owner >= 0 && countries[p.owner] ? countries[p.owner].lines || 0 : 0; if (!byHide.has(h)) byHide.set(h, []); byHide.get(h).push(p); });
      byHide.forEach(function (list, h) {
        if ((h & 3) === 3) return;
        ctx.save();
        ctx.beginPath(); list.forEach(function (p) { traceFeature(ctx, p.shape.f); }); ctx.clip();
        drawRegionLines(L, h & 2 ? [] : allUnitArcs, h & 1 ? [] : allProvArcs, ua, pa);
        ctx.restore();
      });
    }
    mark("provlines");
    drawRivers(S);
    ctx.lineJoin = "round";
    ctx.beginPath(); traceArcs(ctx, L, coastArcs);
    ctx.globalAlpha = satellite ? 0.55 : 1;
    ctx.strokeStyle = pal.border; ctx.lineWidth = 0.75; ctx.stroke();
    ctx.globalAlpha = 1;
    if (vis) clipOutPieces(vis);
    ctx.beginPath(); traceArcs(ctx, L, borderArcs);
    ctx.strokeStyle = pal.border; ctx.lineWidth = satellite ? 1.3 : 1.15; ctx.stroke();
    drawSelectionLine(L);
    if (vis) { ctx.restore(); drawPieceLines(vis, lvl, L, satellite); }
    drawLasso();
    if (pal.antique) drawAging(S);

    if (flat) {
      ctx.restore();
      ctx.beginPath(); traceOutline(ctx, 0);
      ctx.strokeStyle = pal.limb; ctx.lineWidth = 1; ctx.stroke();
      if (pal.antique) { ctx.beginPath(); traceOutline(ctx, 5); ctx.lineWidth = 2.4; ctx.stroke(); }
    } else {
      ctx.beginPath(); ctx.arc(cx, cy, B.r, 0, TAU);
      ctx.strokeStyle = pal.limb; ctx.lineWidth = pal.antique ? 1.6 : 1; ctx.stroke();
      if (pal.antique) { ctx.beginPath(); ctx.arc(cx, cy, B.r + 5, 0, TAU); ctx.lineWidth = 0.8; ctx.stroke(); }
    }

    mark("borders");
    var placed = fixedBoxes();
    drawLabels(placed);
    drawSeaLabels(placed, S);
    drawLakeLabels(placed, S);
    mark("labels");
    var cityShown = drawCities(placed);
    drawRiverLabels(placed, S);
    drawGridLabels(placed, satSea);
    drawTowns(placed, S, cityDot(S));
    paintCities(cityShown, cityDot(S));
    mark("cities");
    drawScale();
    ctx.restore();
  }
  function niceStep(raw) {
    var p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    return 5 * p <= raw ? 5 * p : 2 * p <= raw ? 2 * p : p;
  }
  var rivers = null, riverDetail = null, riverDetailLoad = null, RIVERS_FROM = 1.3, RIVERS_FULL = 2.4, RIVER_DETAIL_S = 1300;
  function riverSet(t) {
    if (!t.objects || !t.objects.rivers) throw new Error("rivers do not match");
    var byRank = [], named = new Map();
    topojson.feature(t, t.objects.rivers).features.forEach(function (f) {
      var g = f.geometry, pr = f.properties || {}, r = pr.r;
      if (!g || !(r >= 1)) return;
      (g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : []).forEach(function (line) {
        if (line.length < 2) return;
        var L = prepareArc(line);
        (byRank[r] = byRank[r] || []).push(L);
        if (!pr.n) return;
        if (!named.has(pr.n)) named.set(pr.n, { name: pr.n, r: r, lines: [] });
        var e = named.get(pr.n);
        e.lines.push(L); e.r = Math.min(e.r, r);
      });
    });
    return { byRank: byRank, names: Array.from(named.values()).sort(function (a, b) { return a.r - b.r; }) };
  }
  var riversDone = false;
  function loadRivers() {
    fetchJSON("data/rivers.json").then(function (t) { rivers = riverSet(t); riversDone = true; scheduleRender(); })
      .catch(function (e) { riversDone = true; console.warn("rivers", e); });
  }
  function riverSetFor(S) {
    if (S >= RIVER_DETAIL_S && ui.rivers) {
      if (!riverDetailLoad) riverDetailLoad = fetchJSON("data/rivers-detail.json").then(function (t) { riverDetail = riverSet(t); scheduleRender(); })
        .catch(function (e) { console.warn("river detail", e); });
      if (riverDetail) return riverDetail;
    }
    return rivers;
  }
  function onScreen(L) {
    var p = projectVec(L.cx, L.cy, L.cz, 0, 0);
    if (!p) return true;
    var r = 2 * B.r * Math.sin(Math.min(Math.PI, L.radius) / 2) + 2;
    return p[0] + r > 0 && p[0] - r < W && p[1] + r > 0 && p[1] - r < H;
  }
  function riverRank(S) { return S < 300 ? 2 : S < 520 ? 3 : S < 800 ? 4 : S < 1300 ? 5 : S < 2400 ? 6 : S < 4500 ? 7 : S < 8000 ? 8 : 9; }
  function riverFade() { return clamp01((view.zoom - RIVERS_FROM) / (RIVERS_FULL - RIVERS_FROM)); }
  function drawRivers(S) {
    var fade = riverFade(), set = riverSetFor(S);
    if (!set || !ui.rivers || fade <= 0) return;
    var byRank = set.byRank, top = Math.min(byRank.length - 1, riverRank(S)), w = Math.max(0.6, Math.min(1.5, S / 700));
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.strokeStyle = pal.river; ctx.lineJoin = "round"; ctx.lineCap = "round";
    for (var r = 1; r <= top; r++) {
      var list = byRank[r];
      if (!list) continue;
      ctx.beginPath();
      for (var i = 0; i < list.length; i++) if (flat || onScreen(list[i])) traceArc(ctx, list[i]);
      ctx.lineWidth = w * (r <= 2 ? 1.35 : r <= 4 ? 1.1 : r <= 6 ? 0.85 : 0.7);
      ctx.stroke();
    }
    ctx.restore();
  }
  var glyphSizes = new Map();
  function charWidth(font, ch) {
    var k = font + "|" + ch, w = glyphSizes.get(k);
    if (w == null) { ctx.font = font; w = ctx.measureText(ch).width; glyphSizes.set(k, w); }
    return w;
  }
  function riverLabelRank(S) { return S < 650 ? 0 : S < 1100 ? 2 : S < 2000 ? 4 : S < 3800 ? 6 : S < 7000 ? 7 : 9; }
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
  function riverSpan(L, a, b, box) {
    var km = L.km, lo = 0, hi = L.n - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (km[mid] <= a) lo = mid; else hi = mid; }
    var pts = [], kms = [];
    if (flat) flatArrays(L);
    for (var k = lo; k < L.n; k++) {
      var p = projectVec(L.x[k], L.y[k], L.z[k], flat ? L.L[k] : 0, flat ? L.P[k] : 0);
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
        if (da > 0.6) return null;
        turn += da;
      }
      prev = ang;
      glyphs.push([p[0] + Math.sin(ang) * f * 0.8, p[1] - Math.cos(ang) * f * 0.8, ang]);
      d += ws[j] + sp;
    }
    return turn < 1.6 ? { glyphs: glyphs, turn: turn } : null;
  }
  var riverPick = new Map();
  function glyphBox(glyphs, f) {
    var gx0 = Infinity, gy0 = Infinity, gx1 = -Infinity, gy1 = -Infinity;
    glyphs.forEach(function (g) { gx0 = Math.min(gx0, g[0]); gy0 = Math.min(gy0, g[1]); gx1 = Math.max(gx1, g[0]); gy1 = Math.max(gy1, g[1]); });
    return mkBox((gx0 + gx1) / 2, (gy0 + gy1) / 2, (gx1 - gx0) / 2 + f * 0.6, (gy1 - gy0) / 2 + f * 0.6, 0);
  }
  function riverSpot(rv, set, ws, sp, tw, f, box, kmPx, placed) {
    var leaves = rv.leaves || (rv.leaves = leafLines(rv.lines, [])), textKm = tw / kmPx, half = textKm * 0.7, step = textKm * 0.5;
    var key = rv.name, was = riverPick.get(key);
    function at(li, m) {
      var L = leaves[li], c = (m + 0.5) * step;
      if (c + half > L.km[L.n - 1]) return null;
      var run = riverSpan(L, c - half, c + half, box);
      if (!run) return null;
      var g = glyphsAt(run, runPx(run, c) - tw / 2, ws, sp, tw, f);
      if (!g) return null;
      g.box = glyphBox(g.glyphs, f);
      if (collides(placed, g.box)) return null;
      g.li = li; g.m = m; g.c = pointAt(run, runPx(run, c));
      return g;
    }
    if (was && was.set === set && was.step > step * 0.8 && was.step < step * 1.25) {
      var keep = at(was.li, was.m);
      if (keep) return keep;
    }
    var best = null, mx = (box[0] + box[2]) / 2, my = (box[1] + box[3]) / 2, diag = Math.hypot(box[2] - box[0], box[3] - box[1]);
    for (var li = 0; li < leaves.length; li++) {
      var L = leaves[li];
      if (!flat && !onScreen(L)) continue;
      lineKm(L);
      var count = Math.floor(L.km[L.n - 1] / step);
      for (var m = 0; m < count; m++) {
        var g = at(li, m);
        if (!g) continue;
        g.score = g.turn + Math.hypot(g.c[0] - mx, g.c[1] - my) / diag;
        if (!best || g.score < best.score) best = g;
      }
    }
    if (best) riverPick.set(key, { set: set, li: best.li, m: best.m, step: step });
    return best;
  }
  function drawRiverLabels(placed, S) {
    var set = riverSetFor(S), top = riverLabelRank(S);
    if (!set || !ui.rivers || !ui.waterNames || !top || riverFade() < 0.6) return;
    var f = pal.antique ? 11.5 : 10.5, font = (pal.antique ? "italic 400 " : "italic 500 ") + f + "px " + (pal.antique ? SERIF : FONT);
    var box = [freeL + 4, freeT + 4, freeR - 4, freeB - 4], shown = 0, kmPx = (flat ? FB.k : S) / R_KM;
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round"; ctx.lineWidth = 3;
    for (var i = 0; i < set.names.length && shown < 40; i++) {
      var rv = set.names[i];
      if (rv.r > top) break;
      var chars = Array.from(rv.name), sp = f * 0.06, ws = [], tw = 0;
      for (var j = 0; j < chars.length; j++) { ws.push(charWidth(font, chars[j])); tw += ws[j] + (j ? sp : 0); }
      var spot = riverSpot(rv, set, ws, sp, tw, f, box, kmPx, placed);
      if (!spot) continue;
      var glyphs = spot.glyphs;
      placed.push(spot.box);
      shown++;
      ctx.font = font; ctx.strokeStyle = pal["label-halo"]; ctx.fillStyle = pal["river-label"];
      for (j = 0; j < glyphs.length; j++) {
        if (chars[j] === " ") continue;
        ctx.save();
        ctx.translate(glyphs[j][0], glyphs[j][1]); ctx.rotate(glyphs[j][2]);
        ctx.strokeText(chars[j], 0, 0); ctx.fillText(chars[j], 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  }
  function degrees(v, ns) {
    if (!v) return "0°";
    if (!ns && Math.abs(v) === 180) return "180°";
    return Math.abs(v) + "°" + (ns ? (v > 0 ? "N" : "S") : (v > 0 ? "E" : "W"));
  }
  var gridShown = [];
  function drawGridLabels(placed, satellite) {
    gridShown = [];
    if (!ui.gridLabels || satellite) return;
    var x0 = freeL + 6, x1 = freeR - 6, y0 = freeT + 6, y1 = freeB - 6, items = [], v, p, best, dist;
    if (flat) {
      var k = FB.k, left = FB.wrap ? x0 : Math.max(x0, cx - k * (Math.PI + FB.xc)), right = FB.wrap ? x1 : Math.min(x1, cx + k * (Math.PI - FB.xc));
      var top = Math.max(y0, cy + k * (FB.yc - HALF_PI)), bottom = Math.min(y1, cy + k * (FB.yc + HALF_PI));
      var st = k * 10 * D2R < 46 ? 20 : 10;
      for (v = -Math.floor(80 / st) * st; v <= 80; v += st) {
        var y = cy - k * (v * D2R - FB.yc);
        if (y > top + 16 && y < bottom - 8) items.push([degrees(v, true), left + 3, y, true]);
      }
      for (v = -Math.floor(170 / st) * st; v < 180; v += st) {
        var x = cx + k * (FB.wrap ? wrapPi(v * D2R - FB.xc) : v * D2R - FB.xc);
        if (x > left + 16 && x < right - 16) items.push([degrees(v, false), x, top + 8, false]);
      }
    } else if (B.r > Math.hypot(Math.max(cx - x0, x1 - cx), Math.max(cy - y0, y1 - cy))) {
      edgeCrossings(items, x0 + 2, y0 + 16, x0 + 2, y1 - 8, 1, true, x0 + 3);
      edgeCrossings(items, x0 + 16, y0 + 2, x1 - 16, y0 + 2, 0, false, y0 + 8);
    } else {
      var xT = cx - 0.5 * Math.min(B.r, cx - x0), yT = cy + (view.lat >= 0 ? 0.5 : -0.5) * Math.min(B.r, view.lat >= 0 ? y1 - cy : cy - y0);
      var lat0 = Math.max(-80, Math.min(80, view.lat)), lon = null, lat = null;
      best = Infinity;
      for (v = -180; v < 180; v += 10) {
        p = projectLL(v, lat0);
        if (p && p[2] > 0.3 && p[0] > x0 + 40 && p[0] < x1 - 40 && (dist = Math.abs(p[0] - xT)) < best) { best = dist; lon = v; }
      }
      best = Infinity;
      for (v = -80; v <= 80; v += 10) {
        p = projectLL(view.lon, v);
        if (p && p[2] > 0.3 && p[1] > y0 + 20 && p[1] < y1 - 20 && (dist = Math.abs(p[1] - yT)) < best) { best = dist; lat = v; }
      }
      if (lon !== null) for (v = -80; v <= 80; v += 10) { p = projectLL(lon, v); if (p && p[2] > 0.3) items.push([degrees(v, true), p[0], p[1], false]); }
      if (lat !== null) for (v = -180; v < 180; v += 10) { p = projectLL(v, lat); if (p && p[2] > 0.3) items.push([degrees(v, false), p[0], p[1], false]); }
    }
    if (!items.length) return;
    var small = localScale() < 260;
    ctx.save();
    ctx.font = pal.antique ? "italic 400 " + (small ? 10 : 11.5) + "px " + SERIF : "500 " + (small ? 9.5 : 10.5) + "px " + FONT;
    ctx.textBaseline = "middle"; ctx.textAlign = "center"; ctx.lineJoin = "round"; ctx.lineWidth = 3;
    ctx.strokeStyle = pal["label-halo"]; ctx.fillStyle = pal["grid-label"];
    for (var i = 0; i < items.length; i++) {
      var it = items[i], w = ctx.measureText(it[0]).width, mx = it[3] ? it[1] + w / 2 : it[1];
      if (mx - w / 2 < x0 || mx + w / 2 > x1 || it[2] < y0 + 4 || it[2] > y1 - 4) continue;
      var box = mkBox(mx, it[2], w / 2 + 2, 7, 0);
      if (collides(placed, box)) continue;
      placed.push(box);
      gridShown.push(it[0]);
      ctx.strokeText(it[0], mx, it[2]);
      ctx.fillText(it[0], mx, it[2]);
    }
    ctx.restore();
  }
  function edgeCrossings(items, ax, ay, bx, by, axis, ns, at) {
    var n = Math.ceil(Math.hypot(bx - ax, by - ay) / 4), prev = null;
    for (var s = 0; s <= n; s++) {
      var t = s / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t, ll = lonLatAt(x, y);
      if (ll && prev) {
        var a = prev[0][axis], b = ll[axis];
        if (!ns && Math.abs(b - a) > 180) b += b < a ? 360 : -360;
        var m = Math.ceil(Math.min(a, b) / 10) * 10;
        if (m <= Math.max(a, b) && a !== b) {
          var f = (m - a) / (b - a), px = prev[1] + (x - prev[1]) * f, py = prev[2] + (y - prev[2]) * f;
          items.push([degrees(ns ? m : ((m + 540) % 360) - 180, ns), ns ? at : px, ns ? py : at, ns]);
        }
      }
      prev = ll ? [ll, x, y] : null;
    }
  }
  function scaleRows() {
    if (!ui.scaleBar) return null;
    var perKm = flat ? FB.k / (R_KM * Math.max(0.05, Math.cos(FB.yc))) : localScale() / R_KM;
    if (!(perKm > 0) || !isFinite(perKm)) return null;
    var km = niceStep(120 / perKm), mi = niceStep(120 / (perKm * 1.609344));
    return [[km * perKm, km.toLocaleString() + (pal.antique ? " kilometres" : " km")], [mi * perKm * 1.609344, mi.toLocaleString() + (pal.antique ? " miles" : " mi")]];
  }
  function scaleFont() { return pal.antique ? "italic 400 12.5px " + SERIF : "500 11px " + FONT; }
  var controlsEl = document.querySelector(".uc-controls"), siteEls = document.querySelectorAll(".uc-site, .uc-site .name, .uc-site .back-link");
  function fixedBoxes() {
    var out = [], rows = scaleRows();
    if (rows) {
      ctx.save();
      ctx.font = scaleFont();
      var span = 0;
      for (var i = 0; i < 2; i++) span = Math.max(span, rows[i][0] + 7 + ctx.measureText(rows[i][1]).width);
      ctx.restore();
      out.push(mkBox(scaleL + span / 2, scaleB - 8.5, span / 2 + 6, 16, 0));
    }
    var els = [controlsEl];
    if (sheetMode && !ui.bare) els = els.concat(Array.from(siteEls));
    els.forEach(function (el) {
      var r = el && el.getBoundingClientRect();
      if (r && r.width && r.height) out.push(mkBox(r.left + r.width / 2, r.top + r.height / 2, r.width / 2 + 4, r.height / 2 + 4, 0));
    });
    return out;
  }
  function drawScale() {
    var rows = scaleRows();
    if (!rows) return;
    ctx.save();
    ctx.font = scaleFont();
    ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.lineJoin = "round";
    for (var i = 0; i < 2; i++) {
      var len = rows[i][0], x = scaleL, y = scaleB - (1 - i) * 17;
      if (pal.antique) {
        ctx.fillStyle = pal["label-halo"]; ctx.fillRect(x - 2, y - 4.5, len + 4, 9);
        for (var k = 0; k < 4; k++) {
          ctx.fillStyle = k % 2 ? pal.unclaimed : pal.label;
          ctx.fillRect(x + k * len / 4, y - 2.5, len / 4, 5);
        }
        ctx.strokeStyle = pal.label; ctx.lineWidth = 0.8; ctx.strokeRect(x, y - 2.5, len, 5);
      } else {
        ctx.beginPath();
        ctx.moveTo(x, y - 3.5); ctx.lineTo(x, y + 3.5); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.moveTo(x + len, y - 3.5); ctx.lineTo(x + len, y + 3.5);
        ctx.strokeStyle = pal["label-halo"]; ctx.lineWidth = 4; ctx.stroke();
        ctx.strokeStyle = pal.label; ctx.lineWidth = 1.3; ctx.stroke();
      }
      ctx.strokeStyle = pal["label-halo"]; ctx.lineWidth = 3;
      ctx.strokeText(rows[i][1], x + len + 7, y);
      ctx.fillStyle = pal.label; ctx.fillText(rows[i][1], x + len + 7, y);
    }
    ctx.restore();
  }

  var aging = null;
  function makeAging() {
    var out = { seams: [] };
    for (var g = 0; g < 12; g++) {
      var l0 = -180 + g * 30, line = [];
      for (var la = -70; la <= 70; la += 2) line.push([l0, la]);
      out.seams.push(prepareLine(line));
    }
    [70, -70].forEach(function (cap) {
      var ring = [];
      for (var lo = -180; lo <= 180; lo += 3) ring.push([lo, cap]);
      out.seams.push(prepareLine(ring));
    });
    return out;
  }
  function drawAging(S) {
    if (!aging) aging = makeAging();
    var A = aging, globe = !flat;
    var seams = clamp01((6000 - S) / 3500);
    ctx.save();
    if (globe) { ctx.beginPath(); ctx.arc(cx, cy, B.r, 0, TAU); ctx.clip(); }
    ctx.globalCompositeOperation = "multiply";
    if (!globe) drawSheet();
    if (globe && seams > 0) {
      ctx.beginPath(); traceArcs(ctx, A.seams, A.seams.map(function (x, j) { return j; }));
      ctx.strokeStyle = "rgba(96,64,30," + (0.22 * seams) + ")"; ctx.lineWidth = 0.7; ctx.stroke();
    }
    if (globe) {
      var vg = ctx.createRadialGradient(cx - B.r * 0.22, cy - B.r * 0.26, B.r * 0.15, cx, cy, B.r * 1.02);
      vg.addColorStop(0, "rgba(255,255,255,0)"); vg.addColorStop(0.62, "rgba(214,176,112,0.12)"); vg.addColorStop(1, "rgba(150,104,48,0.38)");
      ctx.fillStyle = vg;
      ctx.beginPath(); ctx.arc(cx, cy, B.r, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = "screen";
      var hl = ctx.createRadialGradient(cx - B.r * 0.38, cy - B.r * 0.42, 0, cx - B.r * 0.38, cy - B.r * 0.42, B.r * 0.55);
      hl.addColorStop(0, "rgba(255,248,226,0.2)"); hl.addColorStop(1, "rgba(255,248,226,0)");
      ctx.fillStyle = hl;
      ctx.beginPath(); ctx.arc(cx, cy, B.r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function drawSheet() {
    var k = FB.k, y0 = cy + k * FB.yc, top = y0 - k * HALF_PI, h = k * Math.PI, e = h * 0.07;
    [[top, top + e, top], [top + h, top + h - e, top + h - e]].forEach(function (d) {
      var gy = ctx.createLinearGradient(0, d[0], 0, d[1]);
      gy.addColorStop(0, "rgba(140,94,40,0.26)"); gy.addColorStop(1, "rgba(140,94,40,0)");
      ctx.fillStyle = gy; ctx.fillRect(0, d[2], W, e);
    });
  }

  function provAlpha(S) {
    var from = ui.tool === "paint" ? 330 : 650, span = 450;
    return clamp01((S - from) / span);
  }

  function brush() {
    if (ui.tool !== "paint" && ui.tool !== "draw") return null;
    if (ui.erase) return UNCLAIMED;
    return ui.country >= 0 && countries[ui.country] && countries[ui.country].alive ? ui.country : null;
  }
  function fineAt(u) {
    if (!ui.fine) return false;
    var o = owner[u], co = o >= 0 ? countries[o] : null;
    return !(co && co.lines & 2);
  }
  function regionUnits(u) {
    if (u < 0) return [];
    if (fineAt(u)) return [u];
    var p = unitProv[u], g = provGroup[p];
    if (g < 0) return fineData ? provUnits[p] : [u];
    var out = [];
    groupProvs[g].forEach(function (q) { provUnits[q].forEach(function (x) { out.push(x); }); });
    return out;
  }
  function regionName(u) {
    if (u < 0) return "";
    var p = unitProv[u], g = provGroup[p];
    if (!fineAt(u)) return g >= 0 ? groupName[g] : provName[p];
    if (fineData && provUnits[p].length > 1) return unitName[u] + ", " + provName[p];
    return g >= 0 ? provName[p] + ", " + groupName[g] : provName[p];
  }
  function regionTitle(u) {
    if (u < 0) return "";
    var p = unitProv[u], g = provGroup[p];
    if (!fineAt(u)) return g >= 0 ? groupName[g] : provName[p];
    return fineData && provUnits[p].length > 1 ? unitName[u] : provName[p];
  }
  var regionShapes = new Map();
  function regionShape(u, lvl) {
    var p = unitProv[u], g = provGroup[p];
    var key = (fineAt(u) ? "u" + u : g >= 0 ? "g" + g : fineData ? "p" + p : "u" + u) + ":" + lvl;
    var f = regionShapes.get(key);
    if (f) return f;
    var list = regionUnits(u);
    if (list.length === 1) f = feats[lvl][list[0]];
    else {
      var t = levels[lvl], gs = t.objects[objKey].geometries;
      f = prepare([{ geometry: topojson.merge(t, list.map(function (q) { return gs[q]; })) }])[0];
    }
    regionShapes.set(key, f);
    return f;
  }
  function drawHover(F, lvl) {
    var u = ui.hover, hp = ui.hoverPiece;
    if (u < 0 || drag || stroke || cityDrag || lasso) return;
    var vo = hp ? hp.owner : owner[u];
    if (ui.tool === "paint") {
      var to = brush();
      if (to === null) return;
      if (hp && !ui.whole) return;
      var whole = ui.whole && vo >= 0, list = whole ? (unitsOf[vo] || []) : regionUnits(u);
      var any = false;
      for (var i = 0; i < list.length; i++) if (owner[list[i]] !== to) { any = true; break; }
      if (!any) return;
      ctx.beginPath();
      traceFeature(ctx, whole ? shapeOf(vo, lvl) : regionShape(u, lvl));
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = to >= 0 ? colorOf(to) : pal.unclaimed; ctx.fill();
      if (to < 0) { ctx.fillStyle = hatch; ctx.fill(); }
      ctx.globalAlpha = 1;
      ctx.setLineDash([3, 3]); ctx.strokeStyle = pal.select; ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]);
    } else if (ui.tool === "select") {
      var o = vo;
      if (o < 0 || o === ui.country || !unitsOf[o] || !unitsOf[o].length) return;
      ctx.beginPath();
      traceFeature(ctx, shapeOf(o, lvl));
      ctx.fillStyle = pal.hover; ctx.fill();
    }
  }
  function currentCountry() {
    var c = ui.country;
    return c >= 0 && countries[c] && countries[c].alive ? c : -1;
  }
  function drawSelectionFill(F, lvl) {
    var c = currentCountry();
    if (c < 0 || ui.tool !== "select" || ui.city || !unitsOf[c] || !unitsOf[c].length) return;
    ctx.beginPath();
    traceFeature(ctx, shapeOf(c, lvl));
    ctx.fillStyle = pal["select-fill"]; ctx.fill();
  }
  function drawSelectionLine(L) {
    var c = currentCountry();
    if (c < 0 || ui.city || ((ui.tool === "paint" || ui.tool === "draw") && ui.erase)) return;
    ctx.beginPath(); traceArcs(ctx, L, selectionArcs(c));
    ctx.strokeStyle = pal.select; ctx.lineWidth = 2.2; ctx.lineJoin = "round"; ctx.stroke();
  }

  function projectVec(x, y, z, lam, phi) {
    if (flat) return [cx + FB.k * (FB.wrap ? wrapPi(lam - FB.xc) : wrapPi(lam) - FB.xc), cy - FB.k * (phi - FB.yc), 1];
    var d = x * B.cx + y * B.cy + z * B.cz;
    if (d <= 0) return null;
    return [cx + B.r * (x * B.ex + y * B.ey + z * B.ez), cy - B.r * (x * B.nx + y * B.ny + z * B.nz), d];
  }
  function projectLL(lon, lat) {
    var v = toVec(lon, lat);
    return projectVec(v[0], v[1], v[2], lon * D2R, lat * D2R);
  }

  var widthCache = new Map();
  function unitWidth(text) {
    var w = widthCache.get(text);
    if (w == null) {
      ctx.font = pal.antique ? "400 100px " + SERIF : "500 100px " + FONT;
      ctx.letterSpacing = pal.antique ? "22px" : "16px";
      w = ctx.measureText(text).width / 100;
      ctx.letterSpacing = "0px";
      widthCache.set(text, w);
    }
    return w;
  }
  var glyphCache = new Map();
  function glyphWidth(ch) {
    var w = glyphCache.get(ch);
    if (w == null) {
      ctx.font = "400 100px " + SERIF; ctx.letterSpacing = "0px";
      w = ctx.measureText(ch).width / 100;
      glyphCache.set(ch, w);
    }
    return w;
  }
  function labelText(name) { return (name || "").trim().toUpperCase(); }
  function arcOf(L, px, py, w) {
    var b = L.arc[0], e = L.arc[1];
    var pb = projectVec(b.v[0], b.v[1], b.v[2], b.lam, b.phi), pe = projectVec(e.v[0], e.v[1], e.v[2], e.lam, e.phi);
    if (!pb || !pe) return null;
    var ax = pb[0] - px, ay = pb[1] - py, bx = pe[0] - px, by = pe[1] - py;
    if (flat && Math.max(Math.abs(ax), Math.abs(bx)) > Math.PI * FB.k) return null;
    var d = 2 * (ax * by - ay * bx);
    var span = Math.hypot(bx - ax, by - ay);
    if (!(span > 1) || Math.abs(d) < 1e-6 * span * span) return null;
    var a2 = ax * ax + ay * ay, b2 = bx * bx + by * by;
    var ux = (by * a2 - ay * b2) / d, uy = (ax * b2 - bx * a2) / d;
    var R = Math.hypot(ux, uy);
    if (!(R > w * 0.9) || R > w * 40) return null;
    var phi = Math.atan2(-uy, -ux), rx = bx - ax, ry = by - ay;
    if (rx < 0) { rx = -rx; ry = -ry; }
    var dir = -Math.sin(phi) * rx + Math.cos(phi) * ry >= 0 ? 1 : -1;
    var tx = -dir * Math.sin(phi), ty = dir * Math.cos(phi);
    var out = -ty * Math.cos(phi) + tx * Math.sin(phi) > 0 ? 1 : -1;
    return { qx: px + ux, qy: py + uy, R: R, phi: phi, dir: dir, out: out, ang: Math.atan2(ty, tx) };
  }
  function drawArcText(lines, A, f, spacing) {
    var glyphs = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i], ly = (i - (lines.length - 1) / 2) * f * LINE_H, Ri = A.R + A.out * ly;
      var chars = Array.from(line), ws = [], total = 0;
      for (var j = 0; j < chars.length; j++) { var gw = glyphWidth(chars[j]) * f; ws.push(gw); total += gw + spacing; }
      var x = -(total - spacing) / 2;
      for (j = 0; j < chars.length; j++) {
        var xc = x + ws[j] / 2, ph = A.phi + A.dir * xc / Ri;
        x += ws[j] + spacing;
        if (chars[j] === " ") continue;
        glyphs.push(chars[j], A.qx + Ri * Math.cos(ph), A.qy + Ri * Math.sin(ph), ph + A.dir * HALF_PI);
      }
    }
    ctx.save();
    ctx.font = "400 " + f.toFixed(1) + "px " + SERIF;
    ctx.letterSpacing = "0px";
    ctx.lineWidth = Math.max(2, f * 0.22);
    ctx.strokeStyle = pal["label-halo"];
    ctx.fillStyle = pal.label;
    for (var pass = 0; pass < 2; pass++) {
      for (var k = 0; k < glyphs.length; k += 4) {
        var c = Math.cos(glyphs[k + 3]), sn = Math.sin(glyphs[k + 3]);
        ctx.setTransform(dpr * c, dpr * sn, -dpr * sn, dpr * c, dpr * glyphs[k + 1], dpr * glyphs[k + 2]);
        if (pass) ctx.fillText(glyphs[k], 0, 0); else ctx.strokeText(glyphs[k], 0, 0);
      }
    }
    ctx.restore();
  }
  var LINE_H = 1.18, CAP_H = 0.92, TIGHT = 0.1;
  var labelOrder = [];
  function drawLabels(placed) {
    if (!ui.countryNames) return;
    var S = localScale();
    var kmPx = (flat ? FB.k : S) / R_KM;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    var small = [];
    for (var k = 0; k < labelOrder.length; k++) {
      var c = labelOrder[k], co = countries[c];
      if (!co || !co.alive || !co.label || !hasLand(c)) continue;
      var L = co.label;
      var lines = L.name === co.name ? L.lines : [labelText(co.name)], tag = rulerTag(c), tf = 0, tw = 0, extra = 0;
      if (!lines[0]) continue;
      var arc = null, px = 0, py = 0, f = 0, w = 0, i, sp = pal.antique ? 0.22 : 0.16;
      var bt = pal.antique && L.bent && lines === L.lines ? L.bent : null;
      if (bt) {
        var pb = projectVec(bt.v[0], bt.v[1], bt.v[2], bt.lam, bt.phi);
        if (pb && (flat || pb[2] >= 0.72)) {
          f = Math.min(24, bt.fkm * kmPx * Math.sqrt(flat ? 1 : pb[2]));
          for (i = 0; i < lines.length; i++) w = Math.max(w, unitWidth(lines[i]) * f);
          if (f >= 8.5) arc = arcOf(bt, pb[0], pb[1], w);
          if (arc) { px = pb[0]; py = pb[1]; }
        }
      }
      if (!arc) {
        var p = projectVec(L.v[0], L.v[1], L.v[2], L.lam, L.phi);
        if (!p) continue;
        var fore = flat ? 1 : p[2];
        if (fore < 0.2) continue;
        px = p[0]; py = p[1];
        f = Math.min(24, L.fkm * kmPx * Math.sqrt(fore));
        var loose = 0, tight = 0;
        for (i = 0; i < lines.length; i++) { loose = Math.max(loose, unitWidth(lines[i])); tight = Math.max(tight, unitWidth(lines[i]) - Array.from(lines[i]).length * (sp - TIGHT)); }
        if (pal.antique && f < 8.5 && f * loose / tight >= 8.5) { f *= loose / tight; sp = TIGHT; }
        if (f < 8.5) {
          var rr = L.size * kmPx * Math.sqrt(fore) / 2, kpx = kmPx * Math.sqrt(fore);
          if (L.area < BESIDE_KM2 && rr <= 18 && Math.sqrt(L.area) * kpx >= 6) { small.push({ lines: tag ? lines.concat([tag]) : lines, x: px, y: py, r: rr }); continue; }
          if (f < 4.2) continue;
          var fs = pal.antique ? TIGHT : sp, fw = (pal.antique ? tight : loose) * 8.5;
          if (!mostlyOwn(c, L, fw / kpx, 8.5 * (CAP_H + LINE_H * (lines.length - 1)) / kpx)) continue;
          f = 8.5; sp = fs;
        }
        w = (sp === TIGHT ? tight : loose) * f;
      }
      if (px < -300 || px > W + 300 || py < -100 || py > H + 100) continue;
      var h = f * (CAP_H + LINE_H * (lines.length - 1)), box;
      if (tag) {
        tf = Math.max(8.5, f * 0.62);
        ctx.font = "italic 400 " + tf.toFixed(1) + "px " + (pal.antique ? SERIF : FONT);
        ctx.letterSpacing = "0px";
        tw = ctx.measureText(tag).width;
        extra = tf * 1.25;
      }
      if (arc) {
        var sag = arc.R - Math.sqrt(Math.max(0, arc.R * arc.R - w * w / 4)), toQ = sag / 2 / arc.R;
        box = mkBox(px + (arc.qx - px) * toQ - Math.sin(arc.ang) * extra / 2, py + (arc.qy - py) * toQ + Math.cos(arc.ang) * extra / 2, Math.max(w, tw) / 2 + 3, h / 2 + sag / 2 + extra / 2 + 2, arc.ang);
      } else {
        var a0 = L.ang && (flat || fore >= 0.72) ? screenAngle(L, px, py) : 0;
        box = mkBox(px - Math.sin(a0) * extra / 2, py + Math.cos(a0) * extra / 2, Math.max(w, tw) / 2 + 3, h / 2 + extra / 2 + 2, a0);
      }
      var ang = box.ang;
      if (!flat && !insideDisc(box)) continue;
      if (collides(placed, box)) continue;
      placed.push(box);
      var spacing = f * sp;
      if (arc) { drawArcText(lines, arc, f, spacing); if (tf) drawTag(tag, px, py, arc.ang, h / 2 + tf * 0.8, tf); continue; }
      if (tf) drawTag(tag, px, py, ang, h / 2 + tf * 0.8, tf);
      ctx.save();
      ctx.translate(px, py);
      if (ang) ctx.rotate(ang);
      ctx.font = (pal.antique ? "400 " : "500 ") + f.toFixed(1) + "px " + (pal.antique ? SERIF : FONT);
      ctx.letterSpacing = spacing.toFixed(2) + "px";
      ctx.lineWidth = Math.max(2, f * 0.22);
      ctx.strokeStyle = pal["label-halo"];
      ctx.fillStyle = pal.label;
      for (i = 0; i < lines.length; i++) {
        var ly = (i - (lines.length - 1) / 2) * f * LINE_H;
        ctx.strokeText(lines[i], spacing / 2, ly);
        ctx.fillText(lines[i], spacing / 2, ly);
      }
      ctx.restore();
    }
    drawBesideLabels(small, placed);
    ctx.letterSpacing = "0px";
  }
  function drawTag(tag, x, y, ang, dy, size) {
    ctx.save();
    ctx.translate(x, y);
    if (ang) ctx.rotate(ang);
    ctx.font = "italic 400 " + size.toFixed(1) + "px " + (pal.antique ? SERIF : FONT);
    ctx.letterSpacing = "0px";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = Math.max(2, size * 0.3);
    ctx.strokeStyle = pal["label-halo"];
    ctx.fillStyle = pal.label;
    ctx.strokeText(tag, 0, dy);
    ctx.fillText(tag, 0, dy);
    ctx.restore();
  }
  var BESIDE_KM2 = 30000;
  function mostlyOwn(c, L, wkm, hkm) {
    var key = Math.round(Math.log2(wkm) * 12) + ":" + L.name;
    if (L.fit && L.fit.key === key) return L.fit.ok;
    var own = 0, foreign = 0, n = 0, cs = Math.cos(L.ang || 0), sn = Math.sin(L.ang || 0), coslat = Math.max(0.05, Math.cos(L.phi));
    for (var i = 0; i < 7; i++) for (var j = 0; j < 3; j++) {
      var u = (i / 6 - 0.5) * wkm * 0.92, v = (j / 2 - 0.5) * hkm * 0.8;
      var x = u * cs - v * sn, y = u * sn + v * cs;
      var o = visibleOwnerLL(L.lon + x / (111.2 * coslat), L.lat + y / 111.2);
      n++;
      if (o === c) own++; else if (o !== SEA) foreign++;
    }
    var ok = own >= n * 0.5 && foreign <= n * 0.2;
    L.fit = { key: key, ok: ok };
    return ok;
  }
  var BESIDE = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.75, 0.75], [-0.75, 0.75], [0.75, -0.75], [-0.75, -0.75]];
  function overWater(box) {
    var n = 0, wet = 0;
    for (var i = 0; i < 5; i++) for (var j = 0; j < 3; j++) {
      var g = lonLatAt(box.ox + (i / 2 - 1) * box.ex * 0.95, box.oy + (j - 1) * box.ey * 0.85);
      if (!g) continue;
      n++;
      if (visibleOwnerLL(g[0], g[1]) === SEA) wet++;
    }
    return n >= 9 && wet === n;
  }
  function drawBesideLabels(list, placed) {
    if (!list.length) return;
    var f = pal.antique ? 10 : 9.5, sp = f * (pal.antique ? 0.22 : 0.12);
    ctx.font = (pal.antique ? "400 " : "500 ") + f + "px " + (pal.antique ? SERIF : FONT);
    ctx.letterSpacing = sp.toFixed(2) + "px";
    ctx.lineWidth = 3; ctx.strokeStyle = pal["label-halo"]; ctx.fillStyle = pal.label;
    list.forEach(function (it) {
      var w = 0;
      it.lines.forEach(function (l) { w = Math.max(w, ctx.measureText(l).width); });
      var h = f * (CAP_H + LINE_H * (it.lines.length - 1));
      for (var d = 0; d < BESIDE.length; d++) {
        var dx = BESIDE[d][0], dy = BESIDE[d][1], gap = it.r + 5;
        var bx = it.x + dx * (gap + w / 2), by = it.y + dy * (gap + h / 2);
        if (bx - w / 2 < 4 || bx + w / 2 > W - 4 || by - h / 2 < freeT + 4 || by + h / 2 > freeB - 4) continue;
        var box = mkBox(bx, by, w / 2 + 2, h / 2 + 2, 0);
        if (!flat && !insideDisc(box)) continue;
        if (collides(placed, box) || !overWater(box)) continue;
        placed.push(box);
        for (var i = 0; i < it.lines.length; i++) {
          var ly = by + (i - (it.lines.length - 1) / 2) * f * LINE_H;
          ctx.strokeText(it.lines[i], bx + sp / 2, ly);
          ctx.fillText(it.lines[i], bx + sp / 2, ly);
        }
        return;
      }
    });
  }
  var bandArcs = null;
  function bandArcsOf(g) {
    if (!bandArcs) {
      var at = new Map();
      groups.forEach(function (gr, i) { gr.countries.forEach(function (c) { at.set(c, i); }); });
      bandArcs = groups.map(function () { return []; });
      borderArcs.forEach(function (a) {
        var ga = at.get(owner[arcA[a]]), gb = at.get(owner[arcB[a]]);
        if (ga !== undefined) bandArcs[ga].push(a);
        if (gb !== undefined && gb !== ga) bandArcs[gb].push(a);
      });
      coastArcs.forEach(function (a) { var ga = at.get(owner[arcA[a]]); if (ga !== undefined) bandArcs[ga].push(a); });
    }
    return bandArcs[g] || [];
  }
  function bandWidth(S) { return pal.antique ? Math.min(6.5, Math.max(S / 260, Math.min(2.2, Math.max(1.3, S / 165)))) : 0; }
  function isSpeck(a, S) {
    return !a.parts && a.radius * S < 2 && a.x[0] === a.x[a.n - 1] && a.y[0] === a.y[a.n - 1] && a.z[0] === a.z[a.n - 1];
  }
  function drawWaterLines(L, S) {
    if (!coastArcs.length) return;
    var gap = Math.max(1.25, Math.min(3.4, S < 450 ? S / 240 : Math.max(1.7, S / 520))), n = S < 250 ? 2 : S < 450 ? 3 : 4;
    ctx.save();
    ctx.beginPath();
    for (var k = 0; k < coastArcs.length; k++) { var a = L[coastArcs[k]]; if (!isSpeck(a, S)) traceArc(ctx, a); }
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    for (var i = n; i >= 1; i--) {
      ctx.globalAlpha = 0.3 + 0.7 * (n - i) / (n - 1);
      ctx.strokeStyle = pal.water; ctx.lineWidth = 2 * i * gap + 0.9; ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = pal.ocean; ctx.lineWidth = 2 * i * gap - 0.7; ctx.stroke();
    }
    ctx.restore();
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
    var v = toVec(r[1], r[2]), name = r[3] === 1 ? r[0].toUpperCase() : r[0], cut = name.lastIndexOf(" ");
    var lines = r[3] === 1 && name.split(" ").length > 2 ? [name.slice(0, cut), name.slice(cut + 1)] : [name];
    return { lines: lines, v: v, lam: r[1] * D2R, phi: r[2] * D2R, tier: r[3] };
  });
  function seaShown(t, S) { return t === 1 ? S >= 160 && S < 3000 : t === 2 ? S >= 480 && S < 9000 : S >= 1400 && S < 14000; }
  var lakes = null, lakesLoad = null, LAKES_FROM = 650, SMALL_LAKE = 500, lakesDrawn = 0;
  function lakeKmPx(S) { return (flat ? FB.k : S) / R_KM; }
  function drawLakes(S, satellite) {
    if (S < LAKES_FROM) return;
    if (!lakesLoad) lakesLoad = fetchJSON("data/lakes.json").then(function (rows) {
      lakes = rows.map(function (r) {
        var v = toVec(r[2], r[3]);
        return { name: r[0], km2: r[1], v: v, lam: r[2] * D2R, phi: r[3] * D2R, reach: Math.sqrt(r[1]) * 1.6 + 5, f: prepare([{ geometry: { type: "MultiPolygon", coordinates: r[4] } }])[0] };
      });
      scheduleRender();
    }).catch(function (e) { console.warn("lakes", e); });
    if (!lakes) return;
    var kp = lakeKmPx(S), any = false;
    lakesDrawn = 0;
    ctx.beginPath();
    for (var i = 0; i < lakes.length; i++) {
      var L = lakes[i];
      if (Math.sqrt(L.km2) * kp < 2.5 || (!ui.lakes && L.km2 < SMALL_LAKE)) break;
      var p = projectVec(L.v[0], L.v[1], L.v[2], L.lam, L.phi), r = L.reach * kp;
      if (!p || p[0] + r < 0 || p[0] - r > W || p[1] + r < 0 || p[1] - r > H) continue;
      traceFeature(ctx, L.f); any = true; lakesDrawn++;
    }
    if (!any) return;
    ctx.save();
    ctx.globalAlpha = satellite ? 0.85 : 1;
    ctx.fillStyle = pal.ocean; ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round"; ctx.strokeStyle = pal.border; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.restore();
  }
  function drawLakeLabels(placed, S) {
    if (!lakes || !ui.waterNames || S < LAKES_FROM) return;
    var kp = lakeKmPx(S), size = pal.antique ? 11 : 10;
    ctx.font = (pal.antique ? "italic 400 " + size + "px " + SERIF : "italic 400 " + size + "px " + FONT);
    ctx.letterSpacing = "0.5px";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    for (var i = 0; i < lakes.length; i++) {
      var L = lakes[i];
      if (Math.sqrt(L.km2) * kp < 18 || (!ui.lakes && L.km2 < SMALL_LAKE)) break;
      if (!L.name) continue;
      var p = projectVec(L.v[0], L.v[1], L.v[2], L.lam, L.phi);
      if (!p || (!flat && p[2] < 0.3) || p[0] < 0 || p[0] > W || p[1] < 0 || p[1] > H) continue;
      var label = L.name;
      var w = ctx.measureText(label).width, box = mkBox(p[0], p[1], w / 2 + 2, size * 0.6, 0);
      if (collides(placed, box)) continue;
      placed.push(box);
      ctx.lineWidth = 3; ctx.strokeStyle = pal.ocean; ctx.fillStyle = pal["sea-label"];
      ctx.strokeText(label, p[0], p[1]); ctx.fillText(label, p[0], p[1]);
    }
    ctx.letterSpacing = "0px";
  }
  function drawSeaLabels(placed, S) {
    if (!pal.antique || !ui.waterNames) return;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    for (var i = 0; i < SEAS.length; i++) {
      var sl = SEAS[i];
      if (!seaShown(sl.tier, S)) continue;
      var p = projectVec(sl.v[0], sl.v[1], sl.v[2], sl.lam, sl.phi);
      if (!p || (!flat && p[2] < 0.3)) continue;
      var size = sl.tier === 1 ? Math.max(11, Math.min(15, S / 45)) : sl.tier === 2 ? 12.5 : 11, spacing = size * (sl.tier === 1 ? 0.3 : 0.12);
      ctx.font = "italic 400 " + size.toFixed(1) + "px " + SERIF;
      ctx.letterSpacing = spacing.toFixed(2) + "px";
      var w = 0;
      for (var j = 0; j < sl.lines.length; j++) w = Math.max(w, ctx.measureText(sl.lines[j]).width);
      var lh = size * 1.3, box = mkBox(p[0], p[1], w / 2 + 2, (size * 0.6 + lh * (sl.lines.length - 1) / 2), 0);
      if (box.x < -20 || box.y < -20 || box.x + box.w > W + 20 || box.y + box.h > H + 20) continue;
      if (flat) {
        var mx = cx - FB.k * (FB.xc + Math.PI), my = cy + FB.k * (FB.yc - HALF_PI);
        if ((!FB.wrap && (box.x < mx + 4 || box.x + box.w > mx + FB.k * TAU - 4)) || box.y < my + 4 || box.y + box.h > my + FB.k * Math.PI - 4) continue;
      } else if (!insideDisc(box)) continue;
      if (collides(placed, box)) continue;
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
  function mkBox(ox, oy, ex, ey, ang) {
    var c = Math.abs(Math.cos(ang)), s = Math.abs(Math.sin(ang));
    var hw = ex * c + ey * s, hh = ex * s + ey * c;
    return { x: ox - hw, y: oy - hh, w: hw * 2, h: hh * 2, ox: ox, oy: oy, ex: ex, ey: ey, ang: ang };
  }
  function insideDisc(b) {
    var r2 = B.r * B.r * 0.985, c = Math.cos(b.ang), s = Math.sin(b.ang);
    var ex = b.ex - 3, ey = b.ey - 2;
    for (var i = -1; i <= 1; i += 2) for (var j = -1; j <= 1; j += 2) {
      var dx = b.ox + i * ex * c - j * ey * s - cx, dy = b.oy + i * ex * s + j * ey * c - cy;
      if (dx * dx + dy * dy > r2) return false;
    }
    return true;
  }
  function screenAngle(L, px, py) {
    var v = L.v, lam = L.lam, phi = Math.asin(Math.max(-1, Math.min(1, v[2])));
    var E = [-Math.sin(lam), Math.cos(lam), 0];
    var N = [-Math.sin(phi) * Math.cos(lam), -Math.sin(phi) * Math.sin(lam), Math.cos(phi)];
    var ca = Math.cos(L.ang), sa = Math.sin(L.ang), dl = 0.004;
    var q = normalize([v[0] + dl * (ca * E[0] + sa * N[0]), v[1] + dl * (ca * E[1] + sa * N[1]), v[2] + dl * (ca * E[2] + sa * N[2])]);
    var qp = Math.asin(Math.max(-1, Math.min(1, q[2]))), ql = Math.atan2(q[1], q[0]);
    var p2 = projectVec(q[0], q[1], q[2], ql, qp);
    if (!p2) return 0;
    var a = Math.atan2(p2[1] - py, p2[0] - px);
    if (a > Math.PI / 2) a -= Math.PI; else if (a < -Math.PI / 2) a += Math.PI;
    return a;
  }
  function bestSplit(name) {
    var words = name.split(" "), best = null, bestW = Infinity;
    for (var i = 1; i < words.length; i++) {
      var a = words.slice(0, i).join(" "), b = words.slice(i).join(" ");
      var w = Math.max(unitWidth(a), unitWidth(b));
      if (w < bestW) { bestW = w; best = [a, b]; }
    }
    return best;
  }
  var BOX_CELL = 48, boxStamp = 0;
  function boxCells(q, fn) {
    var x0 = Math.floor(q.x / BOX_CELL), x1 = Math.floor((q.x + q.w) / BOX_CELL), y0 = Math.floor(q.y / BOX_CELL), y1 = Math.floor((q.y + q.h) / BOX_CELL);
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > 400) return false;
    for (var x = x0; x <= x1; x++) for (var y = y0; y <= y1; y++) fn(x * 4096 + y);
    return true;
  }
  function hits(b, q) {
    if (!(b.x < q.x + q.w && b.x + b.w > q.x && b.y < q.y + q.h && b.y + b.h > q.y)) return false;
    return (!b.ang && !q.ang) || overlapRotated(b, q);
  }
  function collides(placed, b) {
    var grid = placed.grid;
    if (!grid) { grid = placed.grid = new Map(); placed.wide = []; placed.indexed = 0; }
    for (; placed.indexed < placed.length; placed.indexed++) {
      var q = placed[placed.indexed];
      if (!boxCells(q, function (k) { var l = grid.get(k); if (!l) grid.set(k, (l = [])); l.push(q); })) placed.wide.push(q);
    }
    for (var i = 0; i < placed.wide.length; i++) if (hits(b, placed.wide[i])) return true;
    var stamp = ++boxStamp, hit = false;
    if (!boxCells(b, function (k) {
      if (hit) return;
      var l = grid.get(k);
      if (l) for (var j = 0; j < l.length; j++) { var q = l[j]; if (q.stamp === stamp) continue; q.stamp = stamp; if (hits(b, q)) { hit = true; return; } }
    })) {
      for (i = 0; i < placed.length; i++) if (hits(b, placed[i])) return true;
      return false;
    }
    return hit;
  }
  function overlapRotated(a, b) {
    var ca = Math.cos(a.ang), sa = Math.sin(a.ang), cb = Math.cos(b.ang), sb = Math.sin(b.ang);
    var axes = [ca, sa, -sa, ca, cb, sb, -sb, cb];
    var dx = b.ox - a.ox, dy = b.oy - a.oy;
    for (var k = 0; k < 8; k += 2) {
      var ax = axes[k], ay = axes[k + 1];
      var ra = a.ex * Math.abs(ax * ca + ay * sa) + a.ey * Math.abs(-ax * sa + ay * ca);
      var rb = b.ex * Math.abs(ax * cb + ay * sb) + b.ey * Math.abs(-ax * sb + ay * cb);
      if (Math.abs(dx * ax + dy * ay) > ra + rb) return false;
    }
    return true;
  }

  function cityDot(S) { return S < 900 ? 1.7 : S < 2600 ? 2.2 : 2.7; }
  function tierFor(S) { return S >= 5000 ? 5 : S >= 2200 ? 4 : S >= 1300 ? 3 : S >= 850 ? 2 : S >= 560 ? 1 : 0; }
  var cityScreen = [];
  function drawCities(placed) {
    cityScreen = [];
    if (!cities.length) return [];
    var S = localScale(), show = tierFor(S) + (ui.tool === "city" ? 1 : 0), dot = cityDot(S);
    var pad = 3, shown = [];
    for (var i = 0; i < cities.length; i++) {
      var c = cities[i];
      var must = c === ui.city || (cityDrag && cityDrag.city === c);
      if (c.tier > show && !must) continue;
      var p = projectVec(c.x, c.y, c.z, c.lam, c.phi);
      if (!p || (!flat && p[2] <= 0.02)) continue;
      var px = p[0], py = p[1];
      if (px < -20 || py < -20 || px > W + 20 || py > H + 20) continue;
      ctx.font = cityFont(c);
      if (!c.w) c.w = ctx.measureText(c.name).width;
      if (!ui.cityNames && !must && ui.tool !== "city") continue;
      var mr = markSize(c, dot), off = mr + (c.cap ? 4.5 : 4), named = true, mbox = mkBox(px, py, mr + 1.5, mr + 1.5, 0);
      if (!must && !c.cap && collides(placed, mbox)) continue;
      var box = named ? mkBox(px + off - pad + c.w / 2 + pad, py, c.w / 2 + pad, pal.antique ? 7.5 : 7, 0) : mkBox(px, py, mr + 3, mr + 3, 0);
      var tx = px + off, ty = py, align = "left";
      if (!must && named && pal.antique && collides(placed, box)) {
        var hh = 7.5, alt = [[px - off - c.w / 2, py, "right", px - off], [px, py - mr - 3 - hh, "center", px], [px, py + mr + 3 + hh, "center", px]];
        for (var t = 0; t < alt.length; t++) {
          var b2 = mkBox(alt[t][0], alt[t][1], c.w / 2 + pad, hh, 0);
          if (!collides(placed, b2)) { box = b2; tx = alt[t][3]; ty = alt[t][1]; align = alt[t][2]; break; }
        }
      }
      if (!must && collides(placed, box)) {
        if (!c.cap) continue;
        named = false; box = null;
      }
      placed.push(mbox);
      if (box) placed.push(box);
      var it = { c: c, x: px, y: py, off: off, named: named, r: mr, tx: tx, ty: ty, align: align };
      shown.push(it);
      cityScreen.push(it);
    }
    return shown;
  }
  function paintCities(shown, dot) {
    var i, s;
    ctx.lineWidth = 1.2;
    for (i = shown.length - 1; i >= 0; i--) {
      s = shown[i];
      drawCityMark(s.c, s.x, s.y, dot);
      if (s.c === ui.city) {
        ctx.strokeStyle = pal.select; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 4, 0, TAU); ctx.stroke();
        ctx.lineWidth = 1.2;
      }
    }
    ctx.textBaseline = "middle"; ctx.textAlign = "left";
    ctx.lineJoin = "round"; ctx.lineWidth = pal.antique ? 4 : 3;
    ctx.strokeStyle = pal["city-halo"];
    for (i = shown.length - 1; i >= 0; i--) {
      s = shown[i];
      if (!s.named) continue;
      ctx.font = cityFont(s.c);
      ctx.globalAlpha = isTown(s.c) && !pal.antique ? 0.8 : 1;
      ctx.textAlign = s.align;
      ctx.strokeText(s.c.name, s.tx, s.ty);
      ctx.fillStyle = pal["city-label"]; ctx.fillText(s.c.name, s.tx, s.ty);
    }
    ctx.globalAlpha = 1; ctx.textAlign = "left";
  }
  var towns = null, townsLoad = null;
  function townMin(S) { return S >= 12000 ? 5 : S >= 8000 ? 15 : S >= 5000 ? 40 : Infinity; }
  function loadTowns() {
    townsLoad = fetchJSON("data/towns.json").then(function (rows) {
      towns = rows.map(function (r) { var v = toVec(r[1], r[2]); return { name: r[0], pop: r[3], x: v[0], y: v[1], z: v[2], lam: r[1] * D2R, phi: r[2] * D2R, w: 0 }; });
      townCells = new Map();
      rows.forEach(function (r, i) {
        var k = cellKey(Math.floor(r[1]), Math.floor(r[2])), list = townCells.get(k);
        if (!list) townCells.set(k, (list = []));
        list.push(i);
      });
      scheduleRender();
    }).catch(function (e) { console.warn("towns", e); });
  }
  var townCells = null;
  function cellKey(lon, lat) { return ((lon % 360) + 360) % 360 * 181 + lat + 90; }
  function viewCells() {
    var lons = [], lats = [];
    for (var i = 0; i <= 4; i++) for (var j = 0; j <= 4; j++) {
      var g = lonLatAt(freeL + (freeR - freeL) * i / 4, freeT + (freeB - freeT) * j / 4);
      if (!g) return null;
      lons.push(wrap180(g[0] - view.lon)); lats.push(g[1]);
    }
    var x0 = Math.min.apply(null, lons) - 1, x1 = Math.max.apply(null, lons) + 1;
    var y0 = Math.max(-90, Math.min.apply(null, lats) - 1), y1 = Math.min(89, Math.max.apply(null, lats) + 1);
    if (x1 - x0 > 60 || y1 - y0 > 40 || y0 < -80 || y1 > 80) return null;
    var out = [];
    for (var lon = Math.floor(view.lon + x0); lon <= Math.floor(view.lon + x1); lon++) for (var lat = Math.floor(y0); lat <= Math.floor(y1); lat++) out.push(cellKey(lon, lat));
    return out;
  }
  function townOrder() {
    var keys = townCells && viewCells();
    if (!keys) return null;
    var list = [];
    keys.forEach(function (k) { var c = townCells.get(k); if (c) for (var i = 0; i < c.length; i++) list.push(c[i]); });
    return list.sort(function (a, b) { return a - b; });
  }
  function drawTowns(placed, S, dot) {
    var min = townMin(S);
    if (!ui.cityNames || !ui.towns || min === Infinity) return;
    if (!townsLoad) loadTowns();
    if (!towns) return;
    var font = pal.antique ? "400 10.5px " + SERIF : "400 9.5px " + FONT, r = dot * 0.6 + 0.6, shown = [];
    ctx.font = font;
    var order = townOrder(), n = order ? order.length : towns.length;
    for (var i = 0; i < n; i++) {
      var t = towns[order ? order[i] : i];
      if (t.pop < min) break;
      var p = projectVec(t.x, t.y, t.z, t.lam, t.phi);
      if (!p || (!flat && p[2] <= 0.05)) continue;
      if (p[0] < -10 || p[1] < -10 || p[0] > W + 10 || p[1] > H + 10) continue;
      if (!t.w) t.w = ctx.measureText(t.name).width;
      var off = r + 3.5, box = mkBox(p[0] + off + t.w / 2, p[1], t.w / 2 + 2, pal.antique ? 6.5 : 6, 0), mb = mkBox(p[0], p[1], r + 1.5, r + 1.5, 0);
      if (collides(placed, mb) || collides(placed, box)) continue;
      placed.push(mb, box);
      shown.push(p[0], p[1], t);
    }
    if (!shown.length) return;
    ctx.lineWidth = 1;
    ctx.fillStyle = pal["city-ring"]; ctx.strokeStyle = pal.city;
    ctx.beginPath();
    for (i = 0; i < shown.length; i += 3) { ctx.moveTo(shown[i] + r, shown[i + 1]); ctx.arc(shown[i], shown[i + 1], r, 0, TAU); }
    ctx.fill(); ctx.stroke();
    ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.lineJoin = "round";
    ctx.lineWidth = pal.antique ? 3.5 : 3; ctx.strokeStyle = pal["city-halo"]; ctx.fillStyle = pal["city-label"];
    ctx.globalAlpha = pal.antique ? 0.92 : 0.75;
    for (i = 0; i < shown.length; i += 3) { ctx.strokeText(shown[i + 2].name, shown[i] + r + 3.5, shown[i + 1]); ctx.fillText(shown[i + 2].name, shown[i] + r + 3.5, shown[i + 1]); }
    ctx.globalAlpha = 1;
  }
  function isTown(c) { return !c.cap && c.tier >= 4; }
  function isSmall(c) { return !c.cap && c.tier >= 5; }
  function cityFont(c) {
    if (pal.antique) return (c.cap ? "700 13px " : isSmall(c) ? "400 10.5px " : isTown(c) ? "400 11.5px " : "400 12.5px ") + SERIF;
    return (c.cap ? "500 12px " : isSmall(c) ? "400 9.5px " : isTown(c) ? "400 10px " : "400 11px ") + FONT;
  }
  function markSize(c, dot) { return c.cap ? dot + 3.8 : isSmall(c) ? dot * 0.6 + 0.6 : isTown(c) ? dot * 0.8 + 0.8 : dot + 0.9; }
  function drawCityMark(c, x, y, dot) {
    var r = markSize(c, dot);
    ctx.lineWidth = 1.1;
    if (c.cap) {
      ctx.fillStyle = pal["city-ring"]; ctx.strokeStyle = pal.city;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = pal.city;
      ctx.beginPath();
      for (var k = 0; k < 10; k++) {
        var a = -HALF_PI + k * Math.PI / 5, q = k % 2 ? r * 0.34 : r * 0.8;
        if (k) ctx.lineTo(x + q * Math.cos(a), y + q * Math.sin(a)); else ctx.moveTo(x + q * Math.cos(a), y + q * Math.sin(a));
      }
      ctx.closePath(); ctx.fill();
    } else if (isTown(c)) {
      ctx.fillStyle = pal["city-ring"]; ctx.strokeStyle = pal.city;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
    } else {
      ctx.fillStyle = pal.city; ctx.strokeStyle = pal["city-ring"];
      ctx.beginPath(); ctx.rect(x - r, y - r, r * 2, r * 2); ctx.fill(); ctx.stroke();
    }
  }
  function cityAt(x, y, touch) {
    var best = null, bestD = touch ? 18 : 9;
    for (var i = 0; i < cityScreen.length; i++) {
      var d = Math.hypot(cityScreen[i].x - x, cityScreen[i].y - y);
      if (d < bestD) { bestD = d; best = cityScreen[i].c; }
    }
    if (best || ui.tool !== "city") return best;
    var show = tierFor(localScale()) + 1;
    bestD = 9;
    for (i = 0; i < cities.length; i++) {
      var c = cities[i];
      if (c.tier > show) continue;
      var p = projectVec(c.x, c.y, c.z, c.lam, c.phi);
      if (!p || (!flat && p[2] <= 0.02)) continue;
      d = Math.hypot(p[0] - x, p[1] - y);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }
  function sortCities() {
    cities.sort(function (a, b) { return b.cap - a.cap || a.tier - b.tier || a.rank - b.rank; });
  }

  function visible(lonlat) {
    var rot = projection.rotate();
    return d3.geoDistance(lonlat, [-rot[0], -rot[1]]) < Math.PI / 2 - 1e-6;
  }
  function lonLatAt(x, y) {
    if (flat) {
      var lam = FB.xc + (x - cx) / FB.k, phi = FB.yc - (y - cy) / FB.k;
      if (FB.wrap) lam = wrapPi(lam);
      if (Math.abs(lam) > Math.PI || Math.abs(phi) > HALF_PI) return null;
      return [lam / D2R, phi / D2R];
    }
    var ll = projection.invert([x, y]);
    return ll && isFinite(ll[0]) && visible(ll) ? ll : null;
  }

  function ringsHold(f, lam, phi) {
    var rings = f.rings, inside = false;
    for (var r = 0; r < rings.length; r++) {
      var rg = rings[r];
      flatArrays(rg);
      var X = rg.L, Y = rg.P, n = rg.n;
      for (var i = 0, j = n - 1; i < n; j = i++) {
        if ((Y[i] > phi) !== (Y[j] > phi) && lam < (X[j] - X[i]) * (phi - Y[i]) / (Y[j] - Y[i]) + X[i]) inside = !inside;
      }
    }
    return inside;
  }
  function unitAtLL(lon, lat, F) {
    if (!unitGrid) return -1;
    var lam = lon * D2R, phi = lat * D2R, pad = 0.05;
    var gx = Math.min(179, Math.floor((lon + 180) / 2)), gy = Math.floor((Math.max(-89.999, Math.min(89.999, lat)) + 90) / 2);
    var list = unitGrid.get(gx * 100 + gy) || [];
    for (var i = 0; i < list.length; i++) {
      var u = list[i], k = u * 4;
      if (lon < unitBox[k] - pad || lon > unitBox[k + 2] + pad || lat < unitBox[k + 1] - pad || lat > unitBox[k + 3] + pad) continue;
      if (F[u] && ringsHold(F[u], lam, phi)) return u;
    }
    return -1;
  }
  function unitAt(x, y) {
    if (!feats) return -1;
    var ll = lonLatAt(x, y);
    if (!ll) return -1;
    return unitAtLL(wrap180(ll[0]), ll[1], feats[levelFor()]);
  }

  function buildUnitGrid() {
    unitGrid = new Map();
    unitBox = new Float64Array(nUnit * 4);
    for (var u = 0; u < nUnit; u++) {
      var b = d3.geoBounds(geoFull[u]);
      var x0 = b[0][0], y0 = b[0][1], x1 = b[1][0], y1 = b[1][1];
      unitBox[u * 4] = 1e9; unitBox[u * 4 + 1] = 1e9; unitBox[u * 4 + 2] = -1e9; unitBox[u * 4 + 3] = -1e9;
      if (!isFinite(x0) || !isFinite(y0)) continue;
      if (x1 < x0) { x0 = -180; x1 = 180; }
      unitBox[u * 4] = x0; unitBox[u * 4 + 1] = y0; unitBox[u * 4 + 2] = x1; unitBox[u * 4 + 3] = y1;
      var gx0 = Math.floor((x0 + 180) / 2), gx1 = Math.floor((Math.min(179.999, x1) + 180) / 2);
      var gy0 = Math.floor((y0 + 90) / 2), gy1 = Math.floor((Math.min(89.999, y1) + 90) / 2);
      for (var gx = gx0; gx <= gx1; gx++) for (var gy = gy0; gy <= gy1; gy++) {
        var key = gx * 100 + gy, list = unitGrid.get(key);
        if (!list) { list = []; unitGrid.set(key, list); }
        list.push(u);
      }
    }
  }
  function unitOfPoint(lon, lat, strict) {
    if (!unitGrid) return -1;
    var gx = Math.floor((wrap180(lon) + 180) / 2), gy = Math.floor((Math.max(-89.999, Math.min(89.999, lat)) + 90) / 2);
    var list = unitGrid.get(gx * 100 + gy) || [], lam = lon * D2R, phi = lat * D2R;
    for (var i = 0; i < list.length; i++) if (unitHolds(list[i], lam, phi)) return list[i];
    if (strict) return -1;
    var best = -1, bestD = 0.004;
    for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
      var l2 = unitGrid.get(((gx + dx + 180) % 180) * 100 + gy + dy) || [];
      for (i = 0; i < l2.length; i++) {
        var d = nearestVertex(geoFull[l2[i]].geometry, lon, lat);
        if (d < bestD) { bestD = d; best = l2[i]; }
      }
    }
    return best;
  }
  function nearestVertex(g, lon, lat) {
    var best = Infinity, v = toVec(lon, lat);
    var polys = !g ? [] : g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    for (var a = 0; a < polys.length; a++) for (var b = 0; b < polys[a].length; b++) {
      var ring = polys[a][b];
      for (var k = 0; k < ring.length; k++) {
        var w = toVec(ring[k][0], ring[k][1]);
        var d = 1 - (v[0] * w[0] + v[1] * w[1] + v[2] * w[2]);
        if (d < best) best = d;
      }
    }
    return Math.sqrt(2 * Math.max(0, best));
  }
  function cityUnit(c) {
    if (c.u === -2) c.u = unitOfPoint(c.lon, c.lat);
    return c.u;
  }

  var labelQueue = new Set(), labelTimer = 0, labelPaint = 0;
  function queueLabels(list) {
    var hit = new Set();
    list.forEach(function (c) { if (c >= 0) { labelQueue.add(c); hit.add(c); } });
    if (hit.size) countries.forEach(function (co, i) { if (isInt(co.ruler) && hit.has(co.ruler)) labelQueue.add(i); });
    clearTimeout(labelTimer);
    labelTimer = setTimeout(runLabels, 90);
  }
  var capitalAt = null;
  function runLabels() {
    freshGroups();
    capitalAt = new Map();
    for (var i = 0; i < cities.length; i++) {
      if (!cities[i].cap) continue;
      var o = cityOwner(cities[i]);
      if (o !== null && o >= 0 && !capitalAt.has(o)) capitalAt.set(o, cities[i]);
    }
    var t0 = performance.now();
    while (labelQueue.size && performance.now() - t0 < 14) {
      var c = labelQueue.values().next().value;
      labelQueue.delete(c);
      if (!countries[c]) continue;
      try { computeLabel(c); } catch (e) { countries[c].label = null; }
    }
    sortLabels();
    var now = performance.now();
    if (!labelQueue.size || now - labelPaint > 250) { labelPaint = now; scheduleRender(); }
    if (labelQueue.size) labelTimer = setTimeout(runLabels, 0);
  }
  function sortLabels() {
    labelOrder = [];
    for (var c = 0; c < countries.length; c++) if (countries[c].label) labelOrder.push(c);
    labelOrder.sort(function (a, b) { return countries[b].label.area - countries[a].label.area; });
  }
  function setLabel(co, lon, lat, fkm, lines, ang, area, size) {
    var p = lat * D2R;
    co.label = { v: toVec(lon, lat), lam: lon * D2R, phi: p, lon: lon, lat: lat, fkm: fkm, lines: lines, ang: ang, area: area, size: size, name: co.name };
  }
  function computeLabel(c) {
    var us = unitsOf[c] || [], co = countries[c];
    if (!co.alive || !hasLand(c)) { co.label = null; return; }
    var topo = levels[0], geoms = topo.objects[objKey].geometries;
    var coords = us.length ? topojson.merge(topo, us.map(function (u) { return geoms[u]; })).coordinates : [];
    if (pieces.length) coords = withPieces(c, coords);
    var best = null, bestA = 0, allA = 0;
    coords.forEach(function (poly) {
      var a = d3.geoArea({ type: "Polygon", coordinates: poly });
      if (a > TAU) a = 2 * TAU - a;
      allA += a;
      if (a > bestA) { bestA = a; best = poly; }
    });
    var name = labelText(co.name);
    if (!best || !name) {
      if (!us.length) { co.label = null; return; }
      var cen0 = d3.geoCentroid(geoFull[us[0]]);
      setLabel(co, cen0[0], cen0[1], 4, [name], 0, 0, 20);
      return;
    }
    var cen = d3.geoCentroid({ type: "Polygon", coordinates: best });
    var proj = d3.geoAzimuthalEquidistant().rotate([-cen[0], -cen[1]]).scale(R_KM).translate([0, 0]);
    var rings = best.map(function (ring) { return ring.map(function (pt) { var q = proj(pt); return [q[0], -q[1]]; }); });
    var ext = extent(rings[0]);
    var layouts = [[name]];
    if (name.indexOf(" ") > 0) layouts.push(bestSplit(name));
    var capital = capitalAt && capitalAt.get(c), home = null;
    if (capital) { var hq = proj([capital.lon, capital.lat]); if (hq && isFinite(hq[0])) home = [hq[0], -hq[1]]; }
    function search(rs) {
      var axis = principalAxis(rs[0]);
      var angles = [0];
      if (axis.elong > 2.1 && Math.abs(axis.angle) > 0.25) angles.push(axis.angle);
      var best0 = null;
      layouts.forEach(function (lines) {
        var uw = 0;
        lines.forEach(function (l) { uw = Math.max(uw, unitWidth(l)); });
        var lh = CAP_H + LINE_H * (lines.length - 1), aspect = Math.max(0.5, uw / lh);
        angles.forEach(function (ang) {
          var cs = Math.cos(ang), sn = Math.sin(ang);
          var sq = rs.map(function (ring) { return ring.map(function (q) { return [(q[0] * cs + q[1] * sn) / aspect, -q[0] * sn + q[1] * cs]; }); });
          var pl = polylabel(sq);
          if (!(pl[2] > 0)) return;
          var avoid = home ? [(home[0] * cs + home[1] * sn) / aspect, -home[0] * sn + home[1] * cs] : null, dmax = pl[2];
          pl = placeLabel(sq, dmax, aspect, pl, avoid);
          var fkm = Math.SQRT2 * pl[2] / lh * 0.9;
          var score = Math.SQRT2 * Math.min(dmax, pl[2] / CENTRE_KEEP) / lh * 0.9 * (ang ? 0.62 : 1) * (lines.length > 1 ? 0.88 : 1);
          if (!best0 || score > best0.score) {
            var xr = pl[0] * aspect, yr = pl[1];
            best0 = { score: score, fkm: fkm, lines: lines, ang: ang, uw: uw, lh: lh, x: xr * cs - yr * sn, y: xr * sn + yr * cs };
          }
        });
      });
      return best0;
    }
    var top = search(rings), shape = rings, shift = [0, 0];
    var hull = clusterHull(coords, best, proj);
    if (hull) {
      var hc = ringCentroid(hull), home0 = home;
      if (home) home = [home[0] - hc[0], home[1] - hc[1]];
      var hs = hull.map(function (q) { return [q[0] - hc[0], q[1] - hc[1]]; });
      var wide = search([hs]);
      home = home0;
      if (wide) { wide.x += hc[0]; wide.y += hc[1]; }
      var isles = bestA < 0.7 * allA;
      if (wide && (!top || wide.score * (isles ? 0.8 : 0.55) > top.score) && foreignShare(wide, proj, c) < 0.06 && (isles || enclosure(wide, proj, c) >= 0.65)) { top = wide; shape = [hs]; shift = hc; }
    }
    if (!top) {
      setLabel(co, cen[0], cen[1], 4, [name], 0, bestA * R_KM * R_KM, ext);
      return;
    }
    var ll = proj.invert([top.x, -top.y]);
    setLabel(co, ll[0], ll[1], top.fkm, top.lines, top.ang, bestA * R_KM * R_KM, ext);
    co.label.sea = shape !== rings;
    var local = { lines: top.lines, ang: top.ang, fkm: top.fkm, x: top.x - shift[0], y: top.y - shift[1] };
    var bent = pal.antique && !UNBENDABLE.test(name) ? bendLabel(shape, local, cen[1], home ? [home[0] - shift[0], home[1] - shift[1]] : null) : null;
    if (!bent) return;
    bent.x += shift[0]; bent.y += shift[1];
    bent.arc = bent.arc.map(function (q) { return [q[0] + shift[0], q[1] + shift[1]]; });
    var bl = proj.invert([bent.x, -bent.y]);
    co.label.bent = { v: toVec(bl[0], bl[1]), lam: bl[0] * D2R, phi: bl[1] * D2R, fkm: bent.fkm, arc: bent.arc.map(function (q) {
      var g = proj.invert([q[0], -q[1]]);
      return { v: toVec(g[0], g[1]), lam: g[0] * D2R, phi: g[1] * D2R };
    }) };
  }
  function ringCentroid(ring) {
    var a = 0, x = 0, y = 0;
    for (var i = 0; i + 1 < ring.length; i++) {
      var p = ring[i], q = ring[i + 1], k = p[0] * q[1] - q[0] * p[1];
      a += k; x += (p[0] + q[0]) * k; y += (p[1] + q[1]) * k;
    }
    return a ? [x / (3 * a), y / (3 * a)] : [0, 0];
  }
  function clusterHull(coords, best, proj) {
    var parts = [];
    coords.forEach(function (poly) {
      var pts = poly[0].map(function (pt) { var q = proj(pt); return q && isFinite(q[0]) ? [q[0], -q[1]] : null; }).filter(Boolean);
      if (pts.length < 3) return;
      var bb = [Infinity, Infinity, -Infinity, -Infinity];
      pts.forEach(function (q) { if (q[0] < bb[0]) bb[0] = q[0]; if (q[1] < bb[1]) bb[1] = q[1]; if (q[0] > bb[2]) bb[2] = q[0]; if (q[1] > bb[3]) bb[3] = q[1]; });
      parts.push({ pts: pts, bb: bb, main: poly === best });
    });
    var inn = parts.filter(function (q) { return q.main; });
    if (!inn.length) return null;
    var box = inn[0].bb.slice(), grew = true, GAP = 600;
    var rest = parts.filter(function (q) { return !q.main; });
    while (grew) {
      grew = false;
      rest = rest.filter(function (q) {
        var gx = Math.max(0, q.bb[0] - box[2], box[0] - q.bb[2]), gy = Math.max(0, q.bb[1] - box[3], box[1] - q.bb[3]);
        if (Math.hypot(gx, gy) > GAP) return true;
        inn.push(q); grew = true;
        box = [Math.min(box[0], q.bb[0]), Math.min(box[1], q.bb[1]), Math.max(box[2], q.bb[2]), Math.max(box[3], q.bb[3])];
        return false;
      });
    }
    var all = [];
    inn.forEach(function (q) { for (var i = 0; i < q.pts.length; i++) all.push(q.pts[i]); });
    all.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var cross = function (o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); };
    var lower = [], upper = [], i;
    for (i = 0; i < all.length; i++) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], all[i]) <= 0) lower.pop(); lower.push(all[i]); }
    for (i = all.length - 1; i >= 0; i--) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], all[i]) <= 0) upper.pop(); upper.push(all[i]); }
    var hull = lower.slice(0, -1).concat(upper.slice(0, -1));
    if (hull.length < 3) return null;
    hull.push(hull[0]);
    return hull;
  }
  function foreignShare(t, proj, c) {
    var line = t.lines.length, w = t.uw * t.fkm, h = t.lh * t.fkm, cs = Math.cos(t.ang), sn = Math.sin(t.ang), bad = 0, n = 0;
    for (var i = 0; i < 9; i++) for (var j = 0; j < 3 + line; j++) {
      var u = (i / 8 - 0.5) * w, v = (j / (2 + line) - 0.5) * h;
      var x = t.x + u * cs - v * sn, y = t.y + u * sn + v * cs, g = proj.invert([x, -y]);
      if (!g || !isFinite(g[0])) continue;
      var o = visibleOwnerLL(g[0], g[1]);
      n++;
      if (o !== SEA && o !== c) bad++;
    }
    return n ? bad / n : 1;
  }
  function enclosure(t, proj, c) {
    var reach = Math.max(t.uw, t.lh) * t.fkm * 1.3, step = Math.max(12, reach / 90), hit = 0, N = 16;
    for (var k = 0; k < N; k++) {
      var a = k / N * TAU, dx = Math.cos(a), dy = Math.sin(a);
      for (var r = step; r <= reach; r += step) {
        var g = proj.invert([t.x + dx * r, -(t.y + dy * r)]);
        if (g && isFinite(g[0]) && visibleOwnerLL(g[0], g[1]) === c) { hit++; break; }
      }
    }
    return hit / N;
  }
  var CENTRE_KEEP = 0.78;
  var UNBENDABLE = /[\u0590-\u08FF\u0900-\u0DFF\u0E00-\u0FFF\u1000-\u109F\u1780-\u17FF\uFB1D-\uFDFF\uFE70-\uFEFF]|\p{M}/u;
  function clearOf(avoid, x, y, d) {
    if (!avoid) return true;
    var hs = 0.64 * d, dx = x - avoid[0];
    return Math.abs(y - avoid[1]) >= 2.3 * hs || -dx >= 1.4 * hs || dx >= 2.8 * hs;
  }
  function placeLabel(rings, dmax, aspect, start, avoid) {
    var at = nearCentre(rings, dmax * CENTRE_KEEP, aspect, start, avoid, Infinity);
    if (!avoid) return at || start;
    var best = null, bestScore = -1;
    var weigh = function (c) {
      if (!c) return;
      var sc = c[2] * Math.exp(-Math.hypot(c[0] * aspect, c[1]) / (4 * dmax));
      if (sc > bestScore) { bestScore = sc; best = c; }
    };
    weigh(at);
    [0.62, 0.48].forEach(function (k) { var t = dmax * k; weigh(nearCentre(rings, t, aspect, start, avoid, t)); });
    return best || nearCentre(rings, dmax * CENTRE_KEEP, aspect, start, null, Infinity) || start;
  }
  function nearCentre(rings, tau, aspect, start, avoid, cap) {
    var ext = rings[0], minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < ext.length; i++) {
      var p = ext[i];
      if (p[0] < minX) minX = p[0]; if (p[1] < minY) minY = p[1];
      if (p[0] > maxX) maxX = p[0]; if (p[1] > maxY) maxY = p[1];
    }
    var w = maxX - minX, h = maxY - minY, size = Math.min(w, h);
    var d0 = Math.min(start[2], cap);
    var best = clearOf(avoid, start[0], start[1], d0) ? { x: start[0], y: start[1], d: d0, dist: Math.hypot(start[0] * aspect, start[1]) } : { x: start[0], y: start[1], d: d0, dist: Infinity };
    if (!(size > 0) || best.dist === 0) return best.dist === Infinity ? null : [best.x, best.y, best.d];
    var precision = Math.max(w, h) / 150, heap = [];
    function push(c) {
      heap.push(c);
      var i = heap.length - 1;
      while (i > 0) { var j = (i - 1) >> 1; if (heap[j].lb <= heap[i].lb) break; var t = heap[i]; heap[i] = heap[j]; heap[j] = t; i = j; }
    }
    function pop() {
      var top = heap[0], last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        var i = 0;
        for (;;) {
          var l = 2 * i + 1, r = l + 1, m = i;
          if (l < heap.length && heap[l].lb < heap[m].lb) m = l;
          if (r < heap.length && heap[r].lb < heap[m].lb) m = r;
          if (m === i) break;
          var t = heap[i]; heap[i] = heap[m]; heap[m] = t; i = m;
        }
      }
      return top;
    }
    function cell(x, y, half) {
      return { x: x, y: y, h: half, d: signedDistance(x, y, rings), lb: Math.hypot(Math.max(0, Math.abs(x) - half) * aspect, Math.max(0, Math.abs(y) - half)) };
    }
    var half = size / 2;
    for (var x = minX; x < maxX; x += size) for (var y = minY; y < maxY; y += size) push(cell(x + half, y + half, half));
    var guard = 0;
    while (heap.length && guard++ < 6000) {
      var c = pop();
      if (c.lb >= best.dist) break;
      if (c.d + c.h * Math.SQRT2 < tau) continue;
      if (c.d >= tau && clearOf(avoid, c.x, c.y, Math.min(c.d, cap))) {
        var dist = Math.hypot(c.x * aspect, c.y);
        if (dist < best.dist) best = { x: c.x, y: c.y, d: Math.min(c.d, cap), dist: dist };
      }
      if (c.h * 2 <= precision) continue;
      half = c.h / 2;
      push(cell(c.x - half, c.y - half, half));
      push(cell(c.x + half, c.y - half, half));
      push(cell(c.x - half, c.y + half, half));
      push(cell(c.x + half, c.y + half, half));
    }
    return best.dist === Infinity ? null : [best.x, best.y, best.d];
  }
  function bendLabel(rings, straight, lat, home) {
    var best = null, lines = straight.lines, ang = straight.ang, uw = 0;
    lines.forEach(function (l) { uw = Math.max(uw, unitWidth(l)); });
    var lh = CAP_H + LINE_H * (lines.length - 1), aspect = Math.max(0.5, uw / lh), wkm = uw * straight.fkm;
    var cs = Math.cos(ang), sn = Math.sin(ang);
    [1, -1].forEach(function (side) {
      [1.6, 2.6].forEach(function (k) {
        var rho = k * wkm, torn = false;
        var sq = rings.map(function (ring) {
          var prev = null;
          return ring.map(function (q) {
            var x = q[0] * cs + q[1] * sn, y = -q[0] * sn + q[1] * cs, dy = y - side * rho;
            var th = Math.atan2(x, -side * dy), r = Math.max(1e-6, Math.sqrt(x * x + dy * dy));
            if (prev !== null && Math.abs(th - prev) > Math.PI) torn = true;
            prev = th;
            return [th * rho / aspect, side * rho * Math.log(rho / r)];
          });
        });
        if (torn) return;
        var pl = polylabel(sq);
        if (!(pl[2] > 0)) return;
        var avoid = null;
        if (home) {
          var hx = home[0] * cs + home[1] * sn, hy = -home[0] * sn + home[1] * cs, hd = hy - side * rho;
          avoid = [Math.atan2(hx, -side * hd) * rho / aspect, side * rho * Math.log(rho / Math.max(1e-6, Math.hypot(hx, hd)))];
        }
        pl = placeLabel(sq, pl[2], aspect, pl, avoid);
        var r = rho * Math.exp(-side * pl[1] / rho), th0 = pl[0] * aspect / rho;
        var at = function (t, rr) {
          var px = rr * Math.sin(t), py = side * rho - side * rr * Math.cos(t);
          return [px * cs - py * sn, px * sn + py * cs];
        };
        var fkm = Math.SQRT2 * pl[2] * (r / rho) / lh * 0.9;
        for (var tries = 0; tries < 3; tries++, fkm *= 0.85) {
          var score = fkm * ((side > 0) === (lat >= 0) ? 1.08 : 1);
          if (best && score <= best.score) return;
          if (r < 1.05 * uw * fkm) continue;
          var half = uw * fkm / 2 / r, hh = lh * fkm / 2, inside = true;
          for (var i = -2; i <= 2 && inside; i++) for (var j = -1; j <= 1 && inside; j += 2) {
            var q = at(th0 + i * half / 2, r + j * hh);
            if (!inRings(rings, q[0], q[1])) inside = false;
          }
          if (!inside) continue;
          var a = at(th0, r);
          best = { score: score, fkm: fkm, x: a[0], y: a[1], arc: [at(th0 - half, r), at(th0 + half, r)] };
          return;
        }
      });
    });
    return best && best.fkm >= straight.fkm * 0.8 ? best : null;
  }
  function inRings(rings, x, y) {
    var inside = false;
    for (var k = 0; k < rings.length; k++) {
      var ring = rings[k];
      for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        var a = ring[i], b = ring[j];
        if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
      }
    }
    return inside;
  }
  function extent(ring) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < ring.length; i++) {
      var p = ring[i];
      if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
    }
    return Math.max(maxX - minX, maxY - minY) || 20;
  }
  function principalAxis(ring) {
    var n = ring.length, mx = 0, my = 0;
    for (var i = 0; i < n; i++) { mx += ring[i][0]; my += ring[i][1]; }
    mx /= n; my /= n;
    var sxx = 0, syy = 0, sxy = 0;
    for (i = 0; i < n; i++) { var dx = ring[i][0] - mx, dy = ring[i][1] - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
    var angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    var m = (sxx + syy) / 2, d = Math.sqrt(Math.max(0, (sxx - syy) * (sxx - syy) / 4 + sxy * sxy));
    var l1 = m + d, l2 = Math.max(1e-9, m - d);
    return { angle: angle, elong: Math.sqrt(l1 / l2) };
  }
  function polylabel(rings) {
    var ext = rings[0], minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < ext.length; i++) {
      var p = ext[i];
      if (p[0] < minX) minX = p[0]; if (p[1] < minY) minY = p[1];
      if (p[0] > maxX) maxX = p[0]; if (p[1] > maxY) maxY = p[1];
    }
    var w = maxX - minX, h = maxY - minY, size = Math.min(w, h);
    if (!(size > 0)) return [minX, minY, 0];
    var precision = Math.max(w, h) / 150;
    var heap = [];
    function push(c) {
      heap.push(c);
      var i = heap.length - 1;
      while (i > 0) { var j = (i - 1) >> 1; if (heap[j].max >= heap[i].max) break; var t = heap[i]; heap[i] = heap[j]; heap[j] = t; i = j; }
    }
    function pop() {
      var top = heap[0], last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        var i = 0;
        for (;;) {
          var l = 2 * i + 1, r = l + 1, m = i;
          if (l < heap.length && heap[l].max > heap[m].max) m = l;
          if (r < heap.length && heap[r].max > heap[m].max) m = r;
          if (m === i) break;
          var t = heap[i]; heap[i] = heap[m]; heap[m] = t; i = m;
        }
      }
      return top;
    }
    function cell(x, y, half) { var d = signedDistance(x, y, rings); return { x: x, y: y, h: half, d: d, max: d + half * Math.SQRT2 }; }
    var half = size / 2;
    for (var x = minX; x < maxX; x += size) for (var y = minY; y < maxY; y += size) push(cell(x + half, y + half, half));
    var best = cell(minX + w / 2, minY + h / 2, 0);
    var cen = ringCentroid(ext);
    if (cen) { var cc = cell(cen[0], cen[1], 0); if (cc.d > best.d) best = cc; }
    var guard = 0;
    while (heap.length && guard++ < 5000) {
      var c = pop();
      if (c.d > best.d) best = c;
      if (c.max - best.d <= precision) continue;
      half = c.h / 2;
      push(cell(c.x - half, c.y - half, half));
      push(cell(c.x + half, c.y - half, half));
      push(cell(c.x - half, c.y + half, half));
      push(cell(c.x + half, c.y + half, half));
    }
    return [best.x, best.y, Math.max(0, best.d)];
  }
  function ringCentroid(ring) {
    var area = 0, x = 0, y = 0;
    for (var i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
      var a = ring[i], b = ring[j], f = a[0] * b[1] - b[0] * a[1];
      x += (a[0] + b[0]) * f; y += (a[1] + b[1]) * f; area += f * 3;
    }
    return area ? [x / area, y / area] : null;
  }
  function signedDistance(x, y, rings) {
    var inside = false, minSq = Infinity;
    for (var k = 0; k < rings.length; k++) {
      var ring = rings[k];
      for (var i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
        var a = ring[i], b = ring[j];
        if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
        var sx = a[0], sy = a[1], dx = b[0] - sx, dy = b[1] - sy;
        if (dx !== 0 || dy !== 0) {
          var t = ((x - sx) * dx + (y - sy) * dy) / (dx * dx + dy * dy);
          if (t > 1) { sx = b[0]; sy = b[1]; } else if (t > 0) { sx += dx * t; sy += dy * t; }
        }
        dx = x - sx; dy = y - sy;
        var dsq = dx * dx + dy * dy;
        if (dsq < minSq) minSq = dsq;
      }
    }
    return (inside ? 1 : -1) * Math.sqrt(minSq);
  }

  var pointers = new Map();
  var drag = null, pinch = null, inertia = null, stroke = null, cityDrag = null, spaceDown = false;
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  canvas.addEventListener("mousedown", function (e) { if (e.button === 1) e.preventDefault(); });
  function degPerPx() { return 180 / (Math.PI * projection.scale()); }
  function dist(p, q) { return Math.hypot(p.x - q.x, p.y - q.y); }
  function panBy(dx, dy) {
    if (flat) {
      view.lon -= dx / FB.k / D2R;
      view.lat += dy / FB.k / D2R;
    } else {
      var s = degPerPx();
      view.lon -= dx * s; view.lat += dy * s;
    }
    applyView();
  }
  function dragView(d, dx, dy) {
    if (flat) {
      view.lon = d.lon - dx / FB.k / D2R;
      view.lat = d.lat + dy / FB.k / D2R;
    } else {
      var s = degPerPx();
      view.lon = d.lon - dx * s; view.lat = d.lat + dy * s;
    }
    applyView();
  }
  function cancelCityDrag() {
    if (!cityDrag) return;
    if (cityDrag.moved && cityIndex.get(cityDrag.city.id) === cityDrag.city) restoreCity(cityDrag.city, cityDrag.from);
    cityDrag = null;
    scheduleRender();
  }
  function blurPanelInput() {
    var ae = document.activeElement;
    if (ae && ae !== canvas && panel.contains(ae) && (ae.tagName === "INPUT" || ae.tagName === "SELECT" || ae.tagName === "TEXTAREA")) ae.blur();
  }

  canvas.addEventListener("pointerdown", function (e) {
    var mouse = e.pointerType === "mouse";
    if (mouse && e.button > 2) return;
    blurPanelInput();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    stopInertia(); stopFly(); hideTip();
    if (pointers.size === 2) {
      if (stroke) endStroke();
      cancelLasso();
      cancelCityDrag();
      drag = null;
      canvas.classList.remove("is-dragging");
      var pts = Array.from(pointers.values());
      pinch = { d: dist(pts[0], pts[1]), zoom: view.zoom, mx: (pts[0].x + pts[1].x) / 2, my: (pts[0].y + pts[1].y) / 2 };
      return;
    }
    if (pointers.size > 2) return;
    if (mouse) canvas.focus({ preventScroll: true });
    var turn = mouse && (e.button !== 0 || e.shiftKey || spaceDown);
    if (!turn && ui.tool === "draw") {
      if (mouse && e.altKey) { pickUp(e.clientX, e.clientY); return; }
      startLasso(e.clientX, e.clientY);
      return;
    }
    var c = !turn && ui.tool !== "paint" ? cityAt(e.clientX, e.clientY, !mouse) : null;
    if (c && c === ui.city) { cityDrag = { city: c, x: e.clientX, y: e.clientY, moved: false, from: citySnapshot(c) }; return; }
    if (!turn && ui.tool === "paint" && mouse) {
      if (e.altKey) { pickUp(e.clientX, e.clientY); return; }
      startStroke(e.clientX, e.clientY);
      return;
    }
    drag = { x: e.clientX, y: e.clientY, lon: view.lon, lat: view.lat, moved: false, turnOnly: turn,
      lastT: performance.now(), vx: 0, vy: 0, alt: e.altKey, city: c };
    canvas.classList.add("is-dragging");
  });

  canvas.addEventListener("pointermove", function (e) {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      var pts = Array.from(pointers.values());
      var nd = dist(pts[0], pts[1]);
      var mx = (pts[0].x + pts[1].x) / 2, my = (pts[0].y + pts[1].y) / 2;
      panBy(mx - pinch.mx, my - pinch.my);
      pinch.mx = mx; pinch.my = my;
      zoomAt(pinch.zoom * nd / pinch.d, mx, my, true);
      moving();
      return;
    }
    if (cityDrag) {
      if (cityIndex.get(cityDrag.city.id) !== cityDrag.city) { cityDrag = null; return; }
      if (!cityDrag.moved && Math.hypot(e.clientX - cityDrag.x, e.clientY - cityDrag.y) < 4) return;
      cityDrag.moved = true;
      var ll = lonLatAt(e.clientX, e.clientY);
      if (ll) placeCity(cityDrag.city, ll[0], ll[1]);
      scheduleRender();
      return;
    }
    if (lasso) {
      if (pointers.size <= 1) addLassoPoint(e.clientX, e.clientY);
      return;
    }
    if (stroke) {
      paintAlong(stroke.x, stroke.y, e.clientX, e.clientY);
      stroke.x = e.clientX; stroke.y = e.clientY;
      return;
    }
    if (drag) {
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      drag.moved = true;
      var pl = view.lon, pt = view.lat;
      dragView(drag, dx, dy);
      var now = performance.now(), dt = now - drag.lastT;
      if (dt > 0) {
        drag.vx = 0.6 * drag.vx + 0.4 * (wrap180(view.lon - pl) / dt);
        drag.vy = 0.6 * drag.vy + 0.4 * ((view.lat - pt) / dt);
      }
      drag.lastT = now;
      moving();
      return;
    }
    hover(e.clientX, e.clientY);
  });

  function endPointer(e) {
    pointers.delete(e.pointerId);
    if (pinch) {
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 0) { interacting = 0; scheduleRender(); }
      return;
    }
    if (cityDrag) {
      var cd = cityDrag; cityDrag = null;
      if (cityIndex.get(cd.city.id) !== cd.city) { scheduleRender(); return; }
      if (e.type === "pointercancel") { if (cd.moved) restoreCity(cd.city, cd.from); scheduleRender(); return; }
      if (cd.moved) {
        pushStep("Moving a city", [{ t: "city", id: cd.city.id, from: cd.from, to: citySnapshot(cd.city) }]);
        selectCity(cd.city);
        changed();
      } else selectCity(cd.city);
      return;
    }
    if (lasso) { if (e.type === "pointercancel") cancelLasso(); else finishLasso(); return; }
    if (stroke) { endStroke(); return; }
    if (!drag) return;
    var d = drag; drag = null;
    canvas.classList.remove("is-dragging");
    if (!d.moved) {
      if (e.type !== "pointercancel" && !d.turnOnly) {
        if (d.city && cityIndex.get(d.city.id) === d.city) selectCity(d.city);
        else click(e.clientX, e.clientY, d);
      }
      return;
    }
    var since = performance.now() - d.lastT;
    if (!reduceMotion && since < 60 && Math.hypot(d.vx, d.vy) > 0.002) startInertia(d.vx, d.vy);
    else { interacting = 0; scheduleRender(); }
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("lostpointercapture", function (e) { pointers.delete(e.pointerId); });
  canvas.addEventListener("pointerleave", function () { if (!drag && !stroke && !cityDrag && !lasso) { setHover(-1); hideTip(); } });

  function startInertia(vx, vy) {
    inertia = { vx: vx, vy: vy, t: performance.now() };
    interacting = 1;
    requestAnimationFrame(inertiaStep);
  }
  function inertiaStep() {
    if (!inertia) return;
    var now = performance.now(), dt = Math.min(40, now - inertia.t); inertia.t = now;
    view.lon += inertia.vx * dt; view.lat += inertia.vy * dt;
    var decay = Math.pow(0.0025, dt / 1000);
    inertia.vx *= decay; inertia.vy *= decay;
    applyView();
    if (Math.hypot(inertia.vx, inertia.vy) < 0.0004) { inertia = null; interacting = 0; scheduleRender(); settled(); return; }
    scheduleRender();
    requestAnimationFrame(inertiaStep);
  }
  function stopInertia() { if (inertia) { inertia = null; interacting = 0; } }

  function zoomAt(zoom, x, y, noSettle) {
    var before = lonLatAt(x, y);
    view.zoom = zoom;
    applyView();
    if (before) {
      if (flat) {
        view.lon = before[0] - (x - cx) / FB.k / D2R;
        view.lat = before[1] + (y - cy) / FB.k / D2R;
        applyView();
      } else {
        for (var i = 0; i < 2; i++) {
          var after = projection([before[0], before[1]]);
          if (!after) break;
          var s = degPerPx();
          view.lon -= (x - after[0]) * s;
          view.lat += (y - after[1]) * s;
          applyView();
        }
      }
    }
    if (!noSettle) moving();
  }
  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    stopInertia(); stopFly(); hideTip();
    var f = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0016));
    zoomAt(view.zoom * f, e.clientX, e.clientY);
  }, { passive: false });
  $("zoom-in").addEventListener("click", function () { stopFly(); zoomAt(view.zoom * 1.5, cx, cy); });
  $("zoom-out").addEventListener("click", function () { stopFly(); zoomAt(view.zoom / 1.5, cx, cy); });

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

  function click(x, y, d) {
    var ll = lonLatAt(x, y);
    if (ui.tool === "paint") {
      if (!ll) return;
      if (d.alt) { pickUp(x, y); return; }
      startStroke(x, y);
      endStroke();
      return;
    }
    if (ui.tool === "city") {
      if (!ll) return;
      addCity(ll[0], ll[1]);
      return;
    }
    if (ui.tool === "draw") return;
    var u = ll ? unitAt(x, y) : -1;
    if (u < 0) { ui.country = -1; ui.region = -1; ui.piece = null; ui.city = null; renderPanel(); scheduleRender(); return; }
    var pc = pieceAt(x, y, u);
    ui.city = null;
    ui.piece = pc;
    ui.region = pc ? -1 : u;
    ui.country = pc ? pc.owner : owner[u];
    renderPanel();
    scheduleRender();
  }

  function brushWord() { return "Giving land to "; }
  function pickUp(x, y) {
    var pk = pickAt(x, y);
    if (pk.u < 0) return;
    if (pk.o < 0) { ui.erase = true; toast("Leaving land unclaimed"); }
    else { ui.erase = false; ui.country = pk.o; toast(brushWord() + countries[ui.country].name); }
    renderPanel();
    scheduleRender();
  }
  function pickBrushAt(x, y) {
    var pk = pickAt(x, y);
    if (pk.u >= 0 && pk.o >= 0) {
      ui.country = pk.o; ui.erase = false;
      toast(brushWord() + countries[ui.country].name);
      renderPanel(); scheduleRender();
    }
  }

  function startStroke(x, y) {
    if (brush() === null) { pickBrushAt(x, y); return; }
    stroke = { x: x, y: y, changes: new Map(), touched: new Set(), fresh: new Map(), pieceFrom: null, caps: capOwners() };
    canvas.classList.add("is-painting");
    paintAt(x, y);
  }
  function paintAt(x, y) {
    var u = unitAt(x, y);
    if (u < 0) return;
    var to = brush();
    if (to === null) return;
    freshGroups();
    var pc = pieceAt(x, y, u), vo = pc ? pc.owner : owner[u];
    if (to >= 0 && !stroke.fresh.has(to)) {
      stroke.fresh.set(to, !hasLand(to) && DEFAULT_NAME.test(countries[to].name) ? { u: u, whole: ui.whole && vo >= 0 ? vo : -1 } : null);
    }
    if (ui.whole && vo >= 0) {
      (unitsOf[vo] || []).slice().forEach(function (q) { assign(q, to); });
      pieces.slice().forEach(function (p) { if (p.owner === vo) assignPiece(p, to); });
      return;
    }
    var ru = regionUnits(u);
    if (pc) cutPieces(ru);
    ru.slice().forEach(function (q) { assign(q, to); });
  }
  function cutPieces(us) {
    var set = new Set(us), coords = [];
    us.forEach(function (q) { var g = geoFull[q].geometry; if (g.type === "Polygon") coords.push(g.coordinates); else g.coordinates.forEach(function (c) { coords.push(c); }); });
    if (!coords.length) return;
    var after = [], cut = false;
    pieces.forEach(function (p) {
      var cover = shapeCover(p.shape).units, hit = false;
      for (var i = 0; i < cover.length; i++) if (set.has(cover[i])) { hit = true; break; }
      if (!hit) { after.push(p); return; }
      var rest;
      try { rest = cleanPolys(PC.difference(p.shape.polys, coords)); } catch (e) { after.push(p); return; }
      cut = true;
      stroke.touched.add(p.owner);
      if (rest.length) after.push({ id: ++pieceSeq, owner: p.owner, shape: makeShape(rest), edges: null });
    });
    if (!cut) return;
    if (!stroke.pieceFrom) stroke.pieceFrom = pieces;
    pieces = after;
    piecesChanged();
  }
  function assignPiece(p, to) {
    if (p.owner === to) return;
    if (!stroke.pieceFrom) { stroke.pieceFrom = pieces; pieces = pieces.slice(); }
    var i = pieces.indexOf(p);
    if (i < 0) return;
    stroke.touched.add(p.owner); stroke.touched.add(to);
    pieces[i] = withOwner(p, to);
    piecesChanged();
  }
  function assign(u, to) {
    if (owner[u] === to) return;
    if (!stroke.changes.has(u)) stroke.changes.set(u, owner[u]);
    var was = owner[u];
    stroke.touched.add(was); stroke.touched.add(to);
    owner[u] = to;
    if (!stroke.merged && stroke.changes.size > 400) { stroke.merged = true; touchShapes(Array.from(stroke.touched).concat([UNCLAIMED])); }
    ownersChanged([was, to], !stroke.merged);
    scheduleRender();
  }
  function paintAlong(x0, y0, x1, y1) {
    var n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4));
    for (var i = 1; i <= n; i++) paintAt(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n);
  }
  function endStroke() {
    var s = stroke; stroke = null;
    canvas.classList.remove("is-painting");
    if (!s) return;
    if (!s.merged && s.changes.size) touchShapes(Array.from(s.touched).concat([UNCLAIMED]));
    var ps = [], from = [], to = [];
    s.changes.forEach(function (f, u) { if (owner[u] !== f) { ps.push(u); from.push(f); to.push(owner[u]); } });
    var ops = [];
    if (ps.length) ops.push({ t: "own", ps: ps, from: from, to: to, g: geomGen });
    if (s.pieceFrom) ops.push({ t: "pieces", from: s.pieceFrom, to: pieces });
    if (!ops.length) return;
    var label = "Painting";
    s.fresh.forEach(function (info, c) {
      if (!info || !countries[c] || !countries[c].alive) return;
      freshGroups();
      if (!hasLand(c)) return;
      var name = info.whole >= 0 && countries[info.whole] ? countries[info.whole].name : regionTitle(info.u);
      if (name) {
        var co = countries[c], before = { name: co.name, color: co.color };
        co.name = uniqueName(name, c);
        ops.push({ t: "country", c: c, from: before, to: { name: co.name, color: co.color } });
        countriesVersion++;
        label = "Founding " + co.name;
      }
      var capOp = chooseCapital(c);
      if (capOp) ops.push(capOp);
    });
    demoteCaptured(s.caps, ops);
    pushStep(label, ops);
    queueLabels(Array.from(s.touched));
    changed();
  }

  var hoverRAF = 0, hoverAt = null, hoverLater = false;
  function hover(x, y) {
    if (!canHover) return;
    hoverAt = [x, y];
    if (interacting || inertia) { hoverLater = true; return; }
    if (hoverRAF) return;
    hoverRAF = requestAnimationFrame(function () {
      hoverRAF = 0;
      var x = hoverAt[0], y = hoverAt[1];
      var city = ui.tool !== "paint" && ui.tool !== "draw" ? cityAt(x, y) : null;
      canvas.classList.toggle("is-over-city", !!city && city !== ui.city);
      canvas.classList.toggle("is-over-picked", !!city && city === ui.city);
      if (city) {
        setHover(-1);
        showTip(x, y, city.name, city.cap ? "Capital" : null, city === ui.city ? "drag to move" : (canHover ? "click" : "tap") + " to pick, then drag to move");
        return;
      }
      var u = unitAt(x, y), hp = u >= 0 ? pieceAt(x, y, u) : null;
      setHover(u, hp);
      if (u < 0) { hideTip(); return; }
      var o = hp ? hp.owner : owner[u], main = o >= 0 ? countries[o].name : "Unclaimed land";
      var note = null;
      if (ui.tool === "paint") {
        var to = brush();
        if (to === null) note = "click to give land to this country";
        else if (o !== to) note = "to " + (to >= 0 ? countries[to].name : "unclaimed land");
      } else if (ui.tool === "draw") {
        if (brush() === null) note = "click to give land to this country";
      } else if (ui.tool === "city") note = "click to found a city here";
      showTip(x, y, main, hp && !(ui.tool === "paint" && !ui.whole) ? "Drawn land, " + regionName(u) : regionName(u), note);
    });
  }
  function settled() {
    if (!hoverLater || !hoverAt || drag || inertia) return;
    hoverLater = false;
    hover(hoverAt[0], hoverAt[1]);
  }
  function setHover(u, hp) {
    hp = hp || null;
    if (u === ui.hover && hp === ui.hoverPiece) return;
    ui.hover = u; ui.hoverPiece = hp;
    scheduleRender();
  }
  var tip = $("tip");
  function showTip(x, y, main, sub, note) {
    tip.textContent = "";
    var b = document.createElement("b"); b.textContent = main; b.style.fontWeight = "400"; tip.appendChild(b);
    if (sub) { var s = document.createElement("small"); s.textContent = sub; tip.appendChild(s); }
    if (note) { var n = document.createElement("small"); n.textContent = note; tip.appendChild(n); }
    tip.hidden = false;
    var w = tip.offsetWidth;
    tip.style.left = (x + 14 + w > W ? x - 14 - w - 14 : x) + "px";
    tip.style.top = y + "px";
  }
  function hideTip() { tip.hidden = true; }

  var fly = null;
  function flyTo(lon, lat, zoom) {
    stopInertia();
    var zr = zoomRange();
    var toZoom = zoom == null ? view.zoom : Math.max(zr[0], Math.min(zr[1], zoom));
    if (reduceMotion) { view.lon = lon; view.lat = lat; view.zoom = toZoom; applyView(); scheduleRender(); return; }
    var dAngle = d3.geoDistance([view.lon, view.lat], [lon, lat]);
    var ms = Math.min(1400, 450 + dAngle * 350);
    if (flat) {
      fly = { t0: performance.now(), ms: ms, flat: true, lon0: view.lon, dlon: lon - view.lon, lat0: view.lat, lat1: lat, z0: view.zoom, z1: toZoom };
    } else {
      var from = versorFromAngles([-view.lon, -view.lat, 0]);
      var to = versorFromAngles([-lon, -lat, 0]);
      fly = { t0: performance.now(), ms: ms, interp: versorInterpolate(from, to), z0: view.zoom, z1: toZoom };
    }
    interacting = 1;
    requestAnimationFrame(flyStep);
  }
  function flyStep() {
    if (!fly) return;
    var t = Math.min(1, (performance.now() - fly.t0) / fly.ms);
    var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    if (fly.flat) {
      view.lon = fly.lon0 + fly.dlon * e;
      view.lat = fly.lat0 + (fly.lat1 - fly.lat0) * e;
    } else {
      var ang = versorToAngles(fly.interp(e));
      view.lon = -ang[0]; view.lat = -ang[1];
    }
    view.zoom = fly.z0 * Math.pow(fly.z1 / fly.z0, e);
    applyView();
    if (t >= 1) { fly = null; interacting = 0; scheduleRender(); return; }
    scheduleRender();
    requestAnimationFrame(flyStep);
  }
  function stopFly() { if (fly) { fly = null; interacting = 0; } }
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
  function flyToCountry(c) {
    var L = countries[c] && countries[c].label;
    if (!L) return;
    var size = Math.max(L.size || 0, 200);
    var want = (sheetMode ? Math.min(W, H - 220) : Math.min(freeR - freeL, freeB - freeT - 20)) / 2 - 30;
    var S = want / Math.min(1, size / 2 / R_KM * 1.3);
    var zoom = zoomForScale(S);
    var cap = zoomForScale(baseR * 12);
    flyTo(L.lon, L.lat, Math.max(view.zoom, Math.min(zoom, cap)));
  }

  var undoStack = [], redoStack = [], lastEdit = { key: null, t: 0 }, geomGen = 0;
  var toastStep = null;
  function solidPoly(poly) {
    var a = d3.geoArea({ type: "Polygon", coordinates: poly });
    if (a > TAU) a = 2 * TAU - a;
    var km2 = a * R_KM * R_KM, km = d3.geoLength({ type: "LineString", coordinates: poly[0] }) * R_KM;
    return km2 >= 0.3 && km2 / Math.max(km, 1e-6) >= 0.1;
  }
  function polysKm2(polys) {
    var t = 0;
    polys.forEach(function (poly) { var a = d3.geoArea({ type: "Polygon", coordinates: poly }); if (a > TAU) a = 2 * TAU - a; t += a; });
    return t * R_KM * R_KM;
  }
  function prunePieces() {
    if (!pieces.length) return null;
    var after = [], changedAny = false, hit = new Set();
    pieces.forEach(function (p) {
      var s = shapeCover(p.shape), other = false;
      s.units.forEach(function (u, i) { if (s.cover[i] >= 0.5 && owner[u] !== p.owner) other = true; });
      if (!other) { changedAny = true; hit.add(p.owner); return; }
      var polys = p.shape.polys;
      var kept = polys.filter(solidPoly);
      if (kept.length === polys.length || (kept.length && Math.abs(polysKm2(kept) - polysKm2(polys)) < 0.1)) { after.push(p); return; }
      changedAny = true; hit.add(p.owner);
      if (kept.length) after.push({ id: ++pieceSeq, owner: p.owner, shape: makeShape(kept), edges: null });
    });
    if (!changedAny) return null;
    var before = pieces;
    pieces = after;
    piecesChanged();
    queueLabels(Array.from(hit));
    return { t: "pieces", from: before, to: after };
  }
  function freeOrphans(ops) {
    if (!countries.some(function (co) { return isInt(co.ruler) && co.ruler >= 0; })) return;
    freshGroups();
    countries.forEach(function (co, c) {
      var r = co.ruler;
      if (!co.alive || !isInt(r) || r < 0 || (countries[r] && countries[r].alive && hasLand(r))) return;
      co.ruler = -1;
      ops.push({ t: "ruler", c: c, from: r, to: -1 });
      groupsDirty = true;
      countriesVersion++;
      queueLabels([c]);
    });
  }
  function pushStep(label, ops) {
    var pruned = prunePieces();
    if (pruned) ops.push(pruned);
    freeOrphans(ops);
    var step = { label: label, ops: ops };
    if (toastStep) { toastStep = null; hideToast(); }
    undoStack.push(step);
    if (undoStack.length > 400) undoStack.shift();
    redoStack.length = 0;
    lastEdit = { key: null, t: 0 };
    return step;
  }
  function editStep(key, label, op) {
    var top = undoStack[undoStack.length - 1], now = performance.now();
    if (top && lastEdit.key === key && now - lastEdit.t < 3000 && top.ops.length === 1 && top.ops[0].t === op.t && redoStack.length === 0) top.ops[0].to = op.to;
    else pushStep(label, [op]);
    lastEdit = { key: key, t: now };
  }
  function ensureCountry(i) {
    while (countries.length <= i) countries.push({ code: "N" + countries.length, name: "", color: 0, alive: false, label: null });
  }
  function opUnits(op, i) {
    var u = op.ps[i];
    if (op.g === geomGen || !fineData) return [u];
    return provUnits[u] || [];
  }
  function applyOp(op, back) {
    var v;
    if (op.t === "own") {
      for (var i = 0; i < op.ps.length; i++) {
        var val = back ? op.from[i] : op.to[i];
        if (val >= 0) ensureCountry(val);
        var list = opUnits(op, i);
        for (var j = 0; j < list.length; j++) owner[list[j]] = val;
      }
      var touched = new Set(op.from.concat(op.to));
      ownersChanged(Array.from(touched));
      queueLabels(Array.from(touched));
    } else if (op.t === "country") {
      v = back ? op.from : op.to;
      ensureCountry(op.c);
      var co = countries[op.c];
      if (!v) co.alive = false;
      else { co.alive = true; co.name = v.name; co.color = v.color; }
      groupsDirty = true;
      countriesVersion++;
      queueLabels([op.c]);
    } else if (op.t === "ruler") {
      ensureCountry(op.c);
      countries[op.c].ruler = back ? op.from : op.to;
      groupsDirty = true;
      countriesVersion++;
      queueLabels([op.c]);
    } else if (op.t === "lines") {
      ensureCountry(op.c);
      countries[op.c].lines = back ? op.from : op.to;
      arcsDirty = true;
    } else if (op.t === "city") {
      v = back ? op.from : op.to;
      setCityState(op.id, v);
      sortCities();
    } else if (op.t === "replace") {
      loadDiff(back ? op.from : op.to, false);
    } else if (op.t === "pieces") {
      var hit = new Set();
      op.from.concat(op.to).forEach(function (p) { hit.add(p.owner); shapeCover(p.shape).units.forEach(function (q) { hit.add(owner[q]); }); });
      pieces = (back ? op.from : op.to).slice();
      piecesChanged();
      queueLabels(Array.from(hit));
    }
  }
  function undo() {
    cancelLasso();
    if (stroke) endStroke();
    cancelCityDrag();
    var s = undoStack.pop();
    if (!s) return;
    for (var i = s.ops.length - 1; i >= 0; i--) applyOp(s.ops[i], true);
    redoStack.push(s);
    lastEdit = { key: null, t: 0 };
    afterHistory();
    toast("Undone: " + lowerFirst(s.label));
  }
  function redo() {
    cancelLasso();
    if (stroke) endStroke();
    cancelCityDrag();
    var s = redoStack.pop();
    if (!s) return;
    for (var i = 0; i < s.ops.length; i++) applyOp(s.ops[i], false);
    undoStack.push(s);
    lastEdit = { key: null, t: 0 };
    afterHistory();
    toast("Redone: " + lowerFirst(s.label));
  }
  function undoIfTop(step) {
    return function () { if (undoStack[undoStack.length - 1] === step) undo(); };
  }
  function afterHistory() {
    if (ui.city && cityIndex.get(ui.city.id) !== ui.city) ui.city = null;
    if (ui.piece) ui.piece = pieceById(ui.piece.id);
    if (ui.country >= 0 && !(countries[ui.country] && countries[ui.country].alive)) ui.country = -1;
    changed();
  }

  var saveTimer = 0;
  function changed() {
    sharedOpen = 0;
    scheduleChecks();
    renderPanel();
    scheduleRender();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 500);
  }
  function flushSave() { if (saveTimer) { clearTimeout(saveTimer); saveTimer = 0; save(); } }
  window.addEventListener("pagehide", flushSave);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") flushSave(); });

  function uniqueName(stem, except) {
    var taken = new Set();
    countries.forEach(function (c, i) { if (c.alive && i !== except) taken.add(c.name); });
    if (!taken.has(stem)) return stem;
    for (var i = 2; ; i++) if (!taken.has(stem + " " + i)) return stem + " " + i;
  }
  function neighbourCountries(units) {
    var near = new Set();
    units.forEach(function (u) { (unitNeighbors[u] || []).forEach(function (q) { if (owner[q] >= 0) near.add(owner[q]); }); });
    return Array.from(near);
  }
  function closeCountries(units) {
    var near = new Set();
    if (!unitClose) return [];
    units.forEach(function (u) { (unitClose[u] || []).forEach(function (q) { if (owner[q] >= 0) near.add(owner[q]); }); });
    return Array.from(near);
  }
  function wheelGap(a, b) {
    var d = Math.abs(a - b) % PALETTE;
    return Math.min(d, PALETTE - d);
  }
  function pickTone(nearColors, used, closeColors) {
    var best = 0, bestScore = Infinity;
    for (var k = 0; k < PALETTE; k++) {
      var clash = 0, gap = 9, closeClash = 0, closeGap = 9;
      nearColors.forEach(function (n) { if (n === k) clash++; gap = Math.min(gap, wheelGap(n, k)); });
      (closeColors || []).forEach(function (n) { if (n === k) closeClash++; closeGap = Math.min(closeGap, wheelGap(n, k)); });
      var score = clash * 1000 + closeClash * 300 - Math.min(gap, 4) * 40 - Math.min(closeGap, 3) * 15 + used[k];
      if (score < bestScore) { bestScore = score; best = k; }
    }
    return best;
  }
  function freeColor(neighbours, closeBy) {
    freshGroups();
    var used = new Array(PALETTE).fill(0);
    countries.forEach(function (c, i) { if (c.alive && typeof c.color === "number" && unitsOf[i] && unitsOf[i].length) used[c.color % PALETTE]++; });
    var near = [], close = [];
    neighbours.forEach(function (n) { if (n >= 0 && countries[n]) { var h = countries[hueOf(n)]; if (typeof h.color === "number") near.push(h.color % PALETTE); } });
    (closeBy || []).forEach(function (n) { if (n >= 0 && countries[n] && neighbours.indexOf(n) < 0) { var h = countries[hueOf(n)]; if (typeof h.color === "number") close.push(h.color % PALETTE); } });
    return pickTone(near, used, close);
  }
  function createCountry(name, color) {
    var i = countries.length;
    countries.push({ code: "N" + i, name: name, color: color, alive: true, label: null });
    groupsDirty = true;
    countriesVersion++;
    return { t: "country", c: i, from: null, to: { name: name, color: color } };
  }
  var freshCountry = -1;
  function newCountry() {
    var op = createCountry(uniqueName("New country"), freeColor([]));
    pushStep("New country", [op]);
    freshCountry = op.c;
    ui.country = op.c; ui.erase = false; ui.city = null; ui.region = -1; ui.piece = null;
    setTool("paint");
    changed();
    if (canHover) { var inp = $("country-name"); inp.focus(); inp.select(); }
  }
  function capOwners() {
    var m = new Map();
    cities.forEach(function (c) { if (c.cap) m.set(c, cityOwner(c)); });
    return m;
  }
  function demoteCaptured(before, ops) {
    var by = new Map(), any = false;
    cities.forEach(function (c) {
      if (!c.cap) return;
      var o = cityOwner(c);
      if (o === null || o < 0) return;
      if (!by.has(o)) by.set(o, []);
      by.get(o).push(c);
    });
    by.forEach(function (list, o) {
      if (list.length < 2) return;
      var native = list.filter(function (c) { return before.get(c) === o; });
      var keep = native.length ? native : [list[0]];
      list.forEach(function (c) {
        if (keep.indexOf(c) >= 0) return;
        var was = citySnapshot(c);
        c.cap = 0; c.w = 0;
        ops.push({ t: "city", id: c.id, from: was, to: citySnapshot(c) });
        any = true;
      });
    });
    if (any) sortCities();
  }
  function chooseCapital(c) {
    var inLand = [];
    for (var i = 0; i < cities.length; i++) if (cityOwner(cities[i]) === c) inLand.push(cities[i]);
    if (!inLand.length || inLand.some(function (x) { return x.cap; })) return null;
    var best = inLand[0];
    var before = citySnapshot(best);
    best.cap = 1; best.tier = Math.min(best.tier, 2); best.w = 0;
    sortCities();
    return { t: "city", id: best.id, from: before, to: citySnapshot(best) };
  }
  function makeIndependent(u) {
    if (u < 0) return;
    var list = regionUnits(u).slice();
    var from = list.map(function (q) { return owner[q]; });
    var near = neighbourCountries(list).concat(from);
    var op = createCountry(uniqueName(regionTitle(u) || "New country"), freeColor(near, closeCountries(list)));
    list.forEach(function (q) { owner[q] = op.c; });
    ownersChanged(from.concat([op.c]));
    var ops = [op, { t: "own", ps: list, from: from, to: list.map(function () { return op.c; }), g: geomGen }];
    var capOp = chooseCapital(op.c);
    if (capOp) ops.push(capOp);
    pushStep("Independence", ops);
    ui.country = op.c; ui.region = u;
    queueLabels(from.concat([op.c]));
    changed();
  }
  function dissolve(c) {
    freshGroups();
    var us = unitsOf[c].slice(), had = pieces.some(function (p) { return p.owner === c; });
    if (!us.length && !had) return;
    var ops = [];
    if (us.length) {
      var from = us.map(function () { return c; }), to = us.map(function () { return UNCLAIMED; });
      us.forEach(function (u) { owner[u] = UNCLAIMED; });
      ownersChanged([c]);
      ops.push({ t: "own", ps: us, from: from, to: to, g: geomGen });
    }
    if (had) {
      var before = pieces;
      pieces = pieces.filter(function (p) { return p.owner !== c; });
      piecesChanged();
      ops.push({ t: "pieces", from: before, to: pieces });
    }
    var step = pushStep("Dissolving " + countries[c].name, ops);
    queueLabels([c]);
    changed();
    toast(countries[c].name + " dissolved, its land left unclaimed" + (had ? " and its drawn borders undone" : ""), "Undo", undoIfTop(step));
    toastStep = step;
  }
  function startLasso(x, y) {
    if (brush() === null) { pickBrushAt(x, y); return; }
    var ll = lonLatAt(x, y);
    lasso = { pts: [[x, y]], ll: [ll ? [ll[0], ll[1]] : null] };
    canvas.classList.add("is-painting");
    hideTip();
    scheduleRender();
  }
  function addLassoPoint(x, y) {
    var last = lasso.pts[lasso.pts.length - 1];
    if (Math.hypot(x - last[0], y - last[1]) < 2 || lasso.pts.length >= 20000) return;
    var ll = lonLatAt(x, y);
    lasso.pts.push([x, y]); lasso.ll.push(ll ? [ll[0], ll[1]] : null);
    scheduleRender();
  }
  function cancelLasso() {
    if (!lasso) return;
    lasso = null;
    canvas.classList.remove("is-painting");
    scheduleRender();
  }
  function screenArea(pts) {
    var a = 0;
    for (var i = 0, n = pts.length, j = n - 1; i < n; j = i++) a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
    return Math.abs(a / 2);
  }
  function simplifyPts(pts, tol) {
    var n = pts.length, keep = new Uint8Array(n), t2 = tol * tol, stack = [[0, n - 1]];
    keep[0] = 1; keep[n - 1] = 1;
    while (stack.length) {
      var sg = stack.pop(), a = sg[0], b = sg[1], best = -1, bd = t2;
      var ax = pts[a][0], ay = pts[a][1], dx = pts[b][0] - ax, dy = pts[b][1] - ay, l2 = dx * dx + dy * dy;
      for (var i = a + 1; i < b; i++) {
        var px = pts[i][0] - ax, py = pts[i][1] - ay, d;
        if (l2 > 0) { var t = Math.max(0, Math.min(1, (px * dx + py * dy) / l2)); d = (px - t * dx) * (px - t * dx) + (py - t * dy) * (py - t * dy); }
        else d = px * px + py * py;
        if (d > bd) { bd = d; best = i; }
      }
      if (best > 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
    }
    var out = [];
    for (i = 0; i < n; i++) if (keep[i]) out.push(i);
    return out;
  }
  function lassoPolys(ll) {
    var ring = [], off = 0, prev = null, sumLat = 0;
    ll.forEach(function (q) {
      var x = q[0] + off;
      if (!flat && prev !== null) { if (x - prev > 180) { off -= 360; x -= 360; } else if (x - prev < -180) { off += 360; x += 360; } }
      prev = x; ring.push([x, q[1]]); sumLat += q[1];
    });
    var first = ring[0], last = ring[ring.length - 1];
    if (!flat && Math.abs(last[0] - first[0]) > 180) {
      var pole = sumLat < 0 ? -90 : 90;
      ring.push([last[0], pole], [first[0], pole]);
    }
    ring.push([first[0], first[1]]);
    var out = [];
    for (var s = -2; s <= 2; s++) {
      var x0 = -180 + 360 * s, x1 = 180 + 360 * s;
      PC.intersection([ring], [[[x0, -90], [x1, -90], [x1, 90], [x0, 90], [x0, -90]]]).forEach(function (poly) {
        out.push(poly.map(function (r) { return r.map(function (pt) { return [Math.max(-180, Math.min(180, pt[0] - 360 * s)), pt[1]]; }); }));
      });
    }
    return out.length ? cleanPolys(out) : [];
  }
  function finishLasso() {
    var L = lasso;
    cancelLasso();
    if (!L || L.pts.length < 3 || screenArea(L.pts) < 60) return;
    var to = brush();
    if (to === null) return;
    var ll = [];
    var tol = 1.2, keep = simplifyPts(L.pts, tol);
    while (keep.length > 1500 && tol < 40) { tol *= 1.6; keep = simplifyPts(L.pts, tol); }
    keep.forEach(function (i) { if (L.ll[i]) ll.push(L.ll[i]); });
    if (ll.length < 3) return;
    var polys;
    try { polys = lassoPolys(ll); } catch (e) { polys = []; }
    if (!polys.length) return;
    var shape = makeShape(polys);
    shapeCover(shape);
    if (!shape.units.length) { toast("Draw round some land to give it away"); return; }
    commitPiece(shape, to);
  }
  function commitPiece(shape, to) {
    if (pieces.length >= MAX_PIECES) { toast("That is as many drawn areas as a map can hold, remove some first"); return; }
    var fresh = to >= 0 && !hasLand(to) && DEFAULT_NAME.test(countries[to].name);
    var before = pieces, after = [], touched = new Set([to]), cut = false, caps = capOwners();
    before.forEach(function (p) {
      var bb = p.shape.bb, nb = shape.bb;
      if (bb[0] > nb[2] || bb[2] < nb[0] || bb[1] > nb[3] || bb[3] < nb[1]) { after.push(p); return; }
      var rest;
      try {
        if (!PC.intersection(p.shape.polys, shape.polys).length) { after.push(p); return; }
        rest = cleanPolys(PC.difference(p.shape.polys, shape.polys));
      } catch (e) { after.push(p); return; }
      cut = true; touched.add(p.owner);
      if (rest.length) after.push({ id: ++pieceSeq, owner: p.owner, shape: makeShape(rest), edges: null });
    });
    if (!cut && shape.units.every(function (u) { return owner[u] === to; })) { toast(to >= 0 ? "That land is " + countries[to].name + "'s already" : "That land is unclaimed already"); return; }
    var points = shape.n;
    after.forEach(function (p) { points += p.shape.n; });
    if (points > MAX_PIECE_POINTS) { toast("That is as much drawn land as a map can hold, remove some first"); return; }
    shape.units.forEach(function (u) { touched.add(owner[u]); });
    var piece = { id: ++pieceSeq, owner: to, shape: shape, edges: null };
    after.push(piece);
    pieces = after;
    piecesChanged();
    var ops = [{ t: "pieces", from: before, to: after }], label = "Drawing a border";
    if (fresh) {
      var name = cityIn(piece) || titleUnder(shape);
      if (name) {
        var co = countries[to], was = { name: co.name, color: co.color };
        co.name = uniqueName(name, to);
        ops.push({ t: "country", c: to, from: was, to: { name: co.name, color: co.color } });
        countriesVersion++;
        label = "Founding " + co.name;
      }
      var capOp = chooseCapital(to);
      if (capOp) ops.push(capOp);
    }
    demoteCaptured(caps, ops);
    pushStep(label, ops);
    queueLabels(Array.from(touched));
    changed();
  }
  function cityIn(p) {
    for (var i = 0; i < cities.length; i++) {
      var c = cities[i];
      if (cityUnit(c) >= 0 && pieceAtLL(c.lon, c.lat) === p) return c.name;
    }
    return "";
  }
  function titleUnder(s) {
    var best = -1, km = 0;
    for (var i = 0; i < s.units.length; i++) if (s.cover[i] > km) { km = s.cover[i]; best = s.units[i]; }
    return best >= 0 ? regionTitle(best) : "";
  }
  function removePiece(p) {
    var i = pieces.indexOf(p);
    if (i < 0) return;
    var before = pieces, after = pieces.slice();
    after.splice(i, 1);
    var touched = [p.owner];
    shapeCover(p.shape).units.forEach(function (u) { touched.push(owner[u]); });
    pieces = after;
    piecesChanged();
    var step = pushStep("Removing drawn land", [{ t: "pieces", from: before, to: after }]);
    ui.piece = null;
    queueLabels(touched);
    changed();
    toast("Drawn land removed", "Undo", undoIfTop(step));
    toastStep = step;
  }
  function pieceIndependent(p) {
    var i = pieces.indexOf(p);
    if (i < 0) return;
    var s = shapeCover(p.shape), from = p.owner;
    var near = neighbourCountries(s.units).concat(s.units.map(function (u) { return owner[u]; }), [from]);
    var op = createCountry(uniqueName(cityIn(p) || titleUnder(s) || "New country"), freeColor(near, closeCountries(s.units)));
    var before = pieces;
    pieces = pieces.slice();
    pieces[i] = withOwner(p, op.c);
    piecesChanged();
    var ops = [op, { t: "pieces", from: before, to: pieces }];
    var capOp = chooseCapital(op.c);
    if (capOp) ops.push(capOp);
    pushStep("Independence", ops);
    ui.country = op.c; ui.piece = pieces[i];
    queueLabels([from, op.c]);
    changed();
  }
  function setCountryName(c, name) {
    var co = countries[c];
    var before = { name: co.name, color: co.color };
    co.name = name;
    editStep("name:" + c, "Renaming", { t: "country", c: c, from: before, to: { name: name, color: co.color } });
    queueLabels([c]);
    changed();
  }
  function setCountryColor(c, color) {
    var co = countries[c];
    if (co.color === color) return;
    var before = { name: co.name, color: co.color };
    co.color = color;
    groupsDirty = true;
    editStep("color:" + c, "Recolouring", { t: "country", c: c, from: before, to: { name: co.name, color: color } });
    changed();
  }

  function recolorFreed(c, was, ops) {
    var co = countries[c];
    if (was < 0 || !countries[was] || typeof co.color !== "number" || co.color !== countries[hueOf(was)].color) return;
    freshGroups();
    var us = unitsOf[c] || [];
    var nc = freeColor(neighbourCountries(us).concat([was]), closeCountries(us));
    ops.push({ t: "country", c: c, from: { name: co.name, color: co.color }, to: { name: co.name, color: nc } });
    co.color = nc;
  }
  function setCountryRuler(c, r) {
    var co = countries[c], was = isInt(co.ruler) ? co.ruler : -1;
    if (r === c || (r >= 0 && rules(c, r))) return;
    if (was === r) return;
    co.ruler = r;
    groupsDirty = true;
    countriesVersion++;
    var ops = [{ t: "ruler", c: c, from: was, to: r }];
    if (r < 0) recolorFreed(c, was, ops);
    pushStep(r >= 0 ? "Making " + co.name + " a subject of " + countries[r].name : "Freeing " + co.name, ops);
    queueLabels([c]);
    changed();
  }

  function setCountryLines(c, lines) {
    var co = countries[c], was = co.lines || 0;
    if (was === lines) return;
    co.lines = lines;
    arcsDirty = true;
    var hid = lines & ~was, label = hid ? (hid & 1 ? "Hiding region lines" : "Hiding finer lines") : ((was & ~lines) & 1 ? "Showing region lines" : "Showing finer lines");
    pushStep(label, [{ t: "lines", c: c, from: was, to: lines }]);
    changed();
  }
  function citySnapshot(c) { return { name: c.name, lon: c.lon, lat: c.lat, tier: c.tier, cap: c.cap }; }
  function cityById(id) { return cityIndex.get(id) || null; }
  function placeCity(c, lon, lat) {
    c.lon = lon; c.lat = lat;
    var v = toVec(lon, lat), p = lat * D2R;
    c.x = v[0]; c.y = v[1]; c.z = v[2];
    c.lam = lon * D2R; c.phi = p;
    c.u = -2;
  }
  function restoreCity(c, s) { placeCity(c, s.lon, s.lat); }
  var cityRank = 0;
  function setCityState(id, v) {
    var c = cityIndex.get(id);
    if (!v) {
      if (c) { var at = cities.indexOf(c); if (at >= 0) cities.splice(at, 1); cityIndex.delete(id); }
      if (ui.city === c) ui.city = null;
      return;
    }
    var m = /^u(\d+)$/.exec(id);
    if (m) citySeq = Math.max(citySeq, +m[1]);
    if (!c) { c = { id: id, rank: id.charAt(0) === "b" ? +id.slice(1) : 100000 + (++cityRank) }; cities.push(c); cityIndex.set(id, c); }
    c.name = v.name; c.tier = v.tier; c.cap = v.cap; c.w = 0;
    placeCity(c, v.lon, v.lat);
  }
  function selectCity(c) {
    ui.city = c; ui.country = -1; ui.region = -1; ui.piece = null;
    renderPanel(); scheduleRender();
  }
  function addCity(lon, lat) {
    var id = "u" + (++citySeq);
    var v = { name: "New city", lon: lon, lat: lat, tier: 3, cap: 0 };
    setCityState(id, v);
    sortCities();
    pushStep("Founding a city", [{ t: "city", id: id, from: null, to: v }]);
    selectCity(cityById(id));
    changed();
    if (canHover) { var inp = $("city-name"); inp.focus(); inp.select(); }
  }
  function deleteCity(c) {
    if (!c) return;
    var snap = citySnapshot(c);
    setCityState(c.id, null);
    var step = pushStep("Deleting " + snap.name, [{ t: "city", id: c.id, from: snap, to: null }]);
    ui.city = null;
    changed();
    toast(snap.name + " deleted", "Undo", undoIfTop(step));
    toastStep = step;
  }
  function setCityName(c, name) {
    var before = citySnapshot(c);
    c.name = name; c.w = 0;
    editStep("cname:" + c.id, "Renaming a city", { t: "city", id: c.id, from: before, to: citySnapshot(c) });
    changed();
  }
  function setCitySize(c, size) {
    var before = citySnapshot(c);
    if (size === "capital") { c.cap = 1; c.tier = Math.min(c.tier, 2); }
    else if (size === "city") { c.cap = 0; c.tier = Math.min(c.tier, 3); }
    else if (size === "small") { c.cap = 0; c.tier = 5; }
    else { c.cap = 0; c.tier = 4; }
    c.w = 0;
    sortCities();
    pushStep("Resizing a city", [{ t: "city", id: c.id, from: before, to: citySnapshot(c) }]);
    changed();
  }
  function citySize(c) { return c.cap ? "capital" : c.tier >= 5 ? "small" : c.tier >= 4 ? "town" : "city"; }

  var lastLand = "paint";
  function landTool() { return ui.tool === "paint" || ui.tool === "draw"; }
  function setTool(t) {
    if (stroke) endStroke();
    cancelLasso();
    if (t === "land") t = landTool() ? ui.tool : lastLand;
    if (t === "paint" || t === "draw") lastLand = t;
    ui.tool = t;
    if (t === "paint" || t === "draw") ui.city = null;
    if (t === "city") ui.country = -1;
    if (t !== "select") ui.piece = null;
    hideTip();
    renderPanel();
    scheduleRender();
  }

  var hint = $("hint");
  function setHint(parts) {
    hint.textContent = "";
    parts.forEach(function (p) {
      if (typeof p === "string") hint.appendChild(document.createTextNode(p));
      else { var b = document.createElement("b"); b.textContent = p.b; hint.appendChild(b); }
    });
  }
  var pickVersion = -1, countriesVersion = 0;
  function regionCount(c) {
    var us = unitsOf[c] || [];
    if (ui.fine && !(countries[c] && countries[c].lines & 2)) return us.length;
    var s = new Set();
    us.forEach(function (u) { var p = unitProv[u], g = provGroup[p]; s.add(g >= 0 ? -1 - g : p); });
    return s.size;
  }
  function renderPanel() {
    if (!feats) return;
    freshGroups();
    document.querySelectorAll(".uc-tool").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.tool === ui.tool || (b.dataset.tool === "land" && landTool()))); });
    canvas.classList.toggle("is-tool-paint", ui.tool === "paint");
    canvas.classList.toggle("is-tool-city", ui.tool === "city");
    canvas.classList.toggle("is-tool-draw", ui.tool === "draw");
    var verb = canHover ? "Click" : "Tap";
    var where = flat ? "map" : "globe";
    var c = currentCountry();
    if (ui.tool === "select") {
      if (ui.city) setHint(["Drag the city on the " + where + " to move it"]);
      else if (c < 0 && ui.region >= 0 && owner[ui.region] < 0) setHint(["No country holds this land"]);
      else if (c >= 0) setHint(["Rename or recolour ", { b: countries[c].name }, ", or paint its borders"]);
      else setHint([verb + " a country or a city to change it, or found a new country"]);
    } else if (ui.tool === "paint") {
      var to = brush();
      var more = canHover ? " · Shift-drag moves the " + where + " · Alt-click picks a country" : "";
      if (to === UNCLAIMED) setHint([(canHover ? "Click or drag over" : "Tap") + " regions to leave them unclaimed" + more]);
      else if (to === null) setHint([verb + " a country to give land to, or found a new one"]);
      else setHint([(canHover ? "Click or drag over" : "Tap") + (ui.whole ? " countries to give them whole to " : " regions to give them to "), { b: countries[to].name }, more]);
    } else if (ui.tool === "draw") {
      var dto = brush();
      var dmore = canHover ? " · Shift-drag moves the " + where + " · Alt-click picks a country" : " · two fingers move the " + where;
      if (dto === UNCLAIMED) setHint([(canHover ? "Drag" : "Draw") + " round land to leave it unclaimed" + dmore]);
      else if (dto === null) setHint([verb + " a country to give land to, or found a new one"]);
      else setHint([(canHover ? "Drag" : "Draw") + " round land to give it to ", { b: countries[dto].name }, dmore]);
    } else {
      setHint([(canHover ? "Click the " : "Tap the ") + where + " to found a city, or pick a city, then drag it to move it"]);
    }

    if (freshCountry >= 0 && c !== freshCountry) scheduleChecks();
    var showCountry = c >= 0 && !ui.city && ui.tool !== "city" && !((ui.tool === "paint" || ui.tool === "draw") && ui.erase);
    $("country-pane").hidden = !showCountry;
    if (showCountry) {
      var inp = $("country-name");
      if (document.activeElement !== inp) inp.value = countries[c].name;
      var col = countries[c].color;
      document.querySelectorAll(".uc-swatch[data-color]").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.dataset.color === col)); });
      var custom = document.querySelector(".uc-swatch-custom");
      if (custom) {
        custom.setAttribute("aria-pressed", String(typeof col === "string"));
        custom.style.background = typeof col === "string" ? col : "none";
      }
      var n = regionCount(c), land = hasLand(c), drawn = 0, capital = null;
      pieces.forEach(function (p) { if (p.owner === c) drawn++; });
      if (land) for (var i = 0; i < cities.length; i++) { if (cities[i].cap && cityOwner(cities[i]) === c) { capital = cities[i]; break; } }
      var parts = [];
      if (n || !drawn) parts.push(n.toLocaleString() + (n === 1 ? " region" : " regions"));
      if (drawn) parts.push(drawn + (drawn === 1 ? " drawn area" : " drawn areas"));
      var facts = land ? parts.join(" and ") + " · " + Math.round(countryArea(c)).toLocaleString() + " km²" + (capital ? " · capital " + capital.name : "") : "No land yet: Give land (B) gives it some";
      $("country-facts").textContent = facts;
      if (ui.tool === "select" && !ui.city && !sheetMode) setHint([{ b: countries[c].name }, ": " + facts]);
      var hideLines = countries[c].lines || 0;
      if (arcsDirty) { freshGroups(); rebuildArcs(); }
      var kinds = innerKinds[c] || 0, solo = !ui.fine && !(kinds & 2), none2 = !(kinds & 2) && (!solo || !hasFiner(c) || (fineData && !fineUnits[c]));
      $("lines-1").setAttribute("aria-pressed", String(!!(kinds & 1) && !(hideLines & 1)));
      $("lines-2").setAttribute("aria-pressed", String(solo ? fineShown.has(c) && !(hideLines & 2) && !none2 : !!(kinds & 2) && !(hideLines & 2)));
      $("lines-1").disabled = !(kinds & 1);
      $("lines-2").disabled = none2;
      setTip($("lines-1"), kinds & 1 ? "The lines between its states, provinces, and regions" : "It is a single region, with no lines inside it");
      setTip($("lines-2"), none2 ? "Its regions have no finer lines inside them"
        : solo ? "Its counties and districts, in this country alone, until Finer regions in the View menu is switched on or off"
        : "The finer lines inside them: counties and districts, and the parts of grouped regions");
      $("inner").hidden = ui.tool !== "select";
      var rr = rulerOf(c);
      $("subject-row").hidden = ui.tool !== "select" || !land;
      $("swatches").hidden = rr >= 0;
      $("subject-name").textContent = rr >= 0 ? countries[rr].name : "no one";
      if (subjectVersion !== countriesVersion + "/" + ownerVersion || +$("subject-pick").dataset.c !== c) fillSubjectPick(c);
      $("paint-with").hidden = ui.tool !== "select";
      $("dissolve").hidden = !land;
      syncCountryPick(c);
    }
    var r0 = ui.region, pc0 = ui.tool === "select" && !ui.city ? ui.piece : null;
    var showRegion = !pc0 && ui.tool === "select" && !ui.city && r0 >= 0 && r0 < nUnit && ((c >= 0 && owner[r0] === c && regionUnits(r0).length < (unitsOf[c] || []).length) || owner[r0] < 0);
    $("region-line").hidden = !showRegion && !pc0;
    $("remove-piece").hidden = !pc0;
    if (pc0) $("region-name").textContent = pc0.owner < 0 ? "Drawn land, unclaimed" : "Drawn land";
    else if (showRegion) $("region-name").textContent = "Region: " + regionName(r0) + (owner[r0] < 0 ? ", unclaimed" : "");
    $("land-pane").hidden = !landTool();
    if (landTool()) {
      var bto = brush(), named = bto !== null && bto >= 0;
      $("land-to").setAttribute("aria-pressed", String(!ui.erase));
      $("land-to-name").textContent = named ? countries[bto].name : "a country";
      $("land-to-dot").style.background = named ? colorOf(bto) : "none";
      $("land-to-dot").style.boxShadow = named && pal.antique ? "inset 0 0 0 2px " + bandOf(bto) : "none";
      $("paint-erase").setAttribute("aria-pressed", String(ui.erase));
      $("paint-regions").setAttribute("aria-pressed", String(ui.tool === "paint" && !(ui.whole && !ui.erase)));
      $("paint-whole").setAttribute("aria-pressed", String(ui.tool === "paint" && ui.whole && !ui.erase));
      $("paint-whole").disabled = ui.erase;
      $("brush-lasso").setAttribute("aria-pressed", String(ui.tool === "draw"));
    }

    var showCity = !!ui.city && ui.tool !== "paint";
    $("city-pane").hidden = !showCity;
    bar.classList.toggle("has-ctx", showCountry || landTool() || showCity || !$("region-line").hidden);
    if (showCity) {
      var cin = $("city-name");
      if (document.activeElement !== cin) cin.value = ui.city.name;
      var size = citySize(ui.city);
      document.querySelectorAll("#city-size button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.size === size)); });
    }
    $("undo").disabled = !undoStack.length;
    $("redo").disabled = !redoStack.length;
    var undoWhat = undoStack.length ? "Undo " + lowerFirst(undoStack[undoStack.length - 1].label) : "Undo";
    setTip($("undo"), undoWhat + " (Ctrl+Z)");
    $("undo").setAttribute("aria-label", undoWhat);
    var redoWhat = redoStack.length ? "Redo " + lowerFirst(redoStack[redoStack.length - 1].label) : "Redo";
    setTip($("redo"), redoWhat + " (Ctrl+Shift+Z)");
    $("redo").setAttribute("aria-label", redoWhat);
    $("fine").checked = ui.fine;
    var st = currentStyle();
    document.querySelectorAll("#style-seg button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.style === st)); });
    $("show-countries").checked = ui.countryNames;
    $("show-cities").checked = ui.cityNames;
    $("show-towns").checked = !!ui.towns;
    $("show-scale").checked = ui.scaleBar;
    $("show-grid").checked = ui.gridLabels;
    $("show-rivers").checked = ui.rivers;
    $("show-terrain").checked = ui.terrain;
    $("show-lakes").checked = ui.lakes;
    $("show-water-names").checked = ui.waterNames;
    $("show-region-lines").checked = ui.regionLines;
  }
  function syncCountryPick(c) {
    var sel = $("country-pick");
    if (pickVersion !== countriesVersion || sel.options.length < 2) fillCountryPick();
    sel.value = String(c);
  }
  function fillCountryPick() {
    var sel = $("country-pick");
    sel.textContent = "";
    var head = new Option("Choose a country", "");
    head.disabled = true;
    sel.appendChild(head);
    var list = [], cur = currentCountry();
    freshGroups();
    countries.forEach(function (co, i) { if (co.alive && (i === cur || hasLand(i))) list.push(i); });
    list.sort(function (a, b) { return countries[a].name.localeCompare(countries[b].name); });
    list.forEach(function (i) { sel.appendChild(new Option(countries[i].name || "Unnamed", String(i))); });
    pickVersion = countriesVersion;
    var c = currentCountry();
    sel.value = c >= 0 ? String(c) : "";
  }
  var subjectVersion = -1;
  function fillSubjectPick(c) {
    var sel = $("subject-pick");
    sel.textContent = "";
    sel.appendChild(new Option("No one: it rules itself", "-1"));
    var list = [];
    freshGroups();
    countries.forEach(function (co, i) { if (i !== c && co.alive && hasLand(i) && !rules(c, i)) list.push(i); });
    list.sort(function (a, b) { return countries[a].name.localeCompare(countries[b].name); });
    list.forEach(function (i) { sel.appendChild(new Option(countries[i].name || "Unnamed", String(i))); });
    sel.value = String(rulerOf(c));
    sel.dataset.c = String(c);
    subjectVersion = countriesVersion + "/" + ownerVersion;
  }
  $("subject-pick").addEventListener("change", function () {
    var c = currentCountry(), v = +$("subject-pick").value;
    if (c < 0 || !isInt(v)) return;
    setCountryRuler(c, v);
  });
  var SWATCH_NAMES = ["Yellow", "Apricot", "Sand", "Salmon", "Pink", "Lavender", "Periwinkle", "Sky blue", "Mint", "Lime"];
  var SWATCH_NAMES_ANTIQUE = ["Yellow", "Orange", "Buff", "Salmon", "Rose", "Lavender", "Blue", "Violet", "Green", "Olive"];
  function renderSwatches() {
    var box = $("swatches");
    if (!box) return;
    box.textContent = "";
    for (var i = 0; i < PALETTE; i++) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "uc-swatch"; b.dataset.color = String(i);
      b.style.background = pal.colors[i];
      if (pal.antique) b.style.setProperty("--band", pal.bands[i]);
      b.setAttribute("aria-label", (pal.antique ? SWATCH_NAMES_ANTIQUE : SWATCH_NAMES)[i] || "Colour " + (i + 1));
      setTip(b, b.getAttribute("aria-label"));
      b.setAttribute("aria-pressed", "false");
      box.appendChild(b);
    }
    var custom = document.createElement("label");
    custom.className = "uc-swatch uc-swatch-custom";
    setTip(custom, "Any colour");
    var cross = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    cross.setAttribute("viewBox", "0 0 12 12"); cross.setAttribute("width", "12"); cross.setAttribute("height", "12");
    cross.setAttribute("aria-hidden", "true"); cross.setAttribute("focusable", "false");
    var arm = document.createElementNS("http://www.w3.org/2000/svg", "path");
    arm.setAttribute("d", "M6 1.5v9M1.5 6h9"); arm.setAttribute("fill", "none"); arm.setAttribute("stroke", "currentColor");
    arm.setAttribute("stroke-width", "1.3"); arm.setAttribute("stroke-linecap", "round");
    cross.appendChild(arm);
    custom.appendChild(cross);
    var input = document.createElement("input");
    input.type = "color"; input.setAttribute("aria-label", "Any colour");
    custom.appendChild(input);
    box.appendChild(custom);
    input.addEventListener("input", function () { var c = currentCountry(); if (c >= 0) setCountryColor(c, input.value.toLowerCase()); });
  }
  $("swatches").addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".uc-swatch[data-color]");
    var c = currentCountry();
    if (!b || c < 0) return;
    setCountryColor(c, +b.dataset.color);
    lastEdit = { key: null, t: 0 };
  });

  document.querySelectorAll(".uc-tool").forEach(function (b) { b.addEventListener("click", function () { setTool(b.dataset.tool); }); });
  $("country-name").addEventListener("input", function () {
    var c = currentCountry();
    if (c < 0) return;
    setCountryName(c, $("country-name").value.slice(0, NAME_MAX));
    countriesVersion++;
  });
  $("country-name").addEventListener("blur", function () {
    var c = currentCountry();
    if (c < 0) return;
    if (!countries[c].name.trim()) { setCountryName(c, "Unnamed country"); $("country-name").value = countries[c].name; }
    lastEdit = { key: null, t: 0 };
  });
  $("country-name").addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); $("country-name").blur(); } });
  $("country-pick").addEventListener("change", function () {
    var v = $("country-pick").value;
    if (v === "") return;
    ui.country = +v; ui.erase = false; ui.region = -1; ui.piece = null; ui.city = null;
    renderPanel(); scheduleRender();
    flyToCountry(ui.country);
  });
  $("country-pick").addEventListener("pointerdown", fillCountryPick);
  $("country-pick").addEventListener("focus", fillCountryPick);
  [1, 2].forEach(function (bit) {
    $("lines-" + bit).addEventListener("click", function () {
      var c = currentCountry();
      if (c < 0) return;
      var lines = countries[c].lines || 0;
      if (bit !== 2 || ui.fine || (innerKinds[c] & 2)) { setCountryLines(c, lines ^ bit); return; }
      if (fineShown.has(c) && !(lines & 2)) { fineShown.delete(c); arcsDirty = true; renderPanel(); scheduleRender(); return; }
      loadFine().then(function (ok) {
        if (!ok || ui.fine) return;
        fineShown.add(c);
        if (lines & 2) setCountryLines(c, lines & ~2);
        arcsDirty = true; renderPanel(); scheduleRender();
      });
    });
  });
  $("paint-with").addEventListener("click", function () { ui.erase = false; setTool("paint"); });
  $("dissolve").addEventListener("click", function () { var c = currentCountry(); if (c >= 0) dissolve(c); });
  $("remove-piece").addEventListener("click", function () { if (ui.piece) removePiece(ui.piece); });
  $("land-to").addEventListener("click", function () { ui.erase = false; renderPanel(); scheduleRender(); });
  $("brush-lasso").addEventListener("click", function () { setTool("draw"); });
  $("new-country").addEventListener("click", newCountry);
  $("paint-regions").addEventListener("click", function () { ui.whole = false; if (ui.tool !== "paint") setTool("paint"); else { renderPanel(); scheduleRender(); } });
  $("paint-whole").addEventListener("click", function () { ui.whole = true; ui.erase = false; if (ui.tool !== "paint") setTool("paint"); else { renderPanel(); scheduleRender(); } });
  $("paint-erase").addEventListener("click", function () { ui.erase = true; ui.whole = false; renderPanel(); scheduleRender(); });
  $("city-name").addEventListener("input", function () { if (ui.city) setCityName(ui.city, $("city-name").value.slice(0, NAME_MAX)); });
  $("city-name").addEventListener("blur", function () {
    if (ui.city && !ui.city.name.trim()) { setCityName(ui.city, "Unnamed city"); $("city-name").value = ui.city.name; }
    lastEdit = { key: null, t: 0 };
  });
  $("city-name").addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); $("city-name").blur(); } });
  document.querySelectorAll("#city-size button").forEach(function (b) {
    b.addEventListener("click", function () { if (ui.city && citySize(ui.city) !== b.dataset.size) setCitySize(ui.city, b.dataset.size); });
  });
  $("city-delete").addEventListener("click", function () { deleteCity(ui.city); });
  $("undo").addEventListener("click", undo);
  $("redo").addEventListener("click", redo);

  function typing(e) {
    var t = e.target;
    return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
  }
  document.addEventListener("keydown", function (e) {
    var mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === "z" || e.key === "Z")) {
      if (typing(e)) return;
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
      return;
    }
    if (mod && (e.key === "y" || e.key === "Y")) { if (typing(e)) return; e.preventDefault(); redo(); return; }
    if (typing(e) || mod || e.altKey) return;
    if (e.key === " " && !spaceDown) { spaceDown = true; canvas.classList.add("is-turning"); if (e.target === canvas || e.target === document.body) e.preventDefault(); return; }
    var k = e.key.toLowerCase();
    if (k === "v") setTool("select");
    else if (k === "b") setTool("paint");
    else if (k === "d") setTool("draw");
    else if (k === "c") setTool("city");
    else if (k === "s") setSatellite(!ui.satellite);
    else if (k === "h") setBare(!ui.bare);
    else if (k === "m") setFlat(!flat);
    else if ((e.key === "Delete" || e.key === "Backspace") && ui.city) { e.preventDefault(); deleteCity(ui.city); }
    else if ((e.key === "Delete" || e.key === "Backspace") && ui.piece && ui.tool === "select") { e.preventDefault(); removePiece(ui.piece); }
    else if (e.key === "Escape") {
      if (lasso) { cancelLasso(); return; }
      if (ui.city) ui.city = null;
      else if (ui.tool !== "select") { setTool("select"); return; }
      else { ui.country = -1; ui.region = -1; ui.piece = null; }
      renderPanel(); scheduleRender();
    }
  });
  document.addEventListener("keyup", function (e) { if (e.key === " ") { spaceDown = false; canvas.classList.remove("is-turning"); } });
  window.addEventListener("blur", function () { spaceDown = false; canvas.classList.remove("is-turning"); });

  var globeView = null;
  function setFlat(on) {
    if (on === flat || !feats) return;
    stopInertia(); stopFly();
    var S = localScale(), wasZoom = view.zoom;
    if (on) globeView = { lon: view.lon, lat: view.lat, zoom: view.zoom };
    flat = on;
    if (flat) view.zoom = wasZoom <= 1.25 ? (W <= 640 ? 2 : 1) : zoomForScale(S);
    else if (wasZoom <= 1.35) {
      view.zoom = 1;
      if (globeView) view.lat = globeView.lat;
    } else view.zoom = zoomForScale(S);
    applyView();
    detail.key = "";
    $("flat-btn").setAttribute("aria-pressed", String(flat));
    $("flat-btn").setAttribute("aria-label", flat ? "Globe" : "Flat map");
    setTip($("flat-btn"), flat ? "Globe (M)" : "Flat map (M)");
    try { localStorage.setItem(STORE_FLAT, flat ? "1" : "0"); } catch (e) { }
    renderPanel();
    moving();
  }
  $("flat-btn").addEventListener("click", function () { setFlat(!flat); });

  function setSatellite(on) {
    if (on && !sat && !satTried) {
      satTried = true;
      if (window.UchroniaSat && window.OffscreenCanvas) {
        try {
          var off = new OffscreenCanvas(canvas.width, canvas.height), show = satView.getContext("bitmaprenderer");
          sat = show && off.transferToImageBitmap ? window.UchroniaSat(off) : null;
          if (sat) { satCanvas = off; satShow = show; }
        } catch (e) { sat = null; }
      }
      if (!sat) sat = window.UchroniaSat ? window.UchroniaSat(satCanvas) : null;
      if (sat) {
        sat.onRestore = function () { detail.key = ""; detail.rect = null; scheduleRender(); };
        var urls = [{ src: "data/earth-2048.webp", size: 2048 }];
        if (W > 640) urls.push({ src: "data/earth-4096.webp", size: 4096 });
        sat.load(urls, function () { detail.key = ""; scheduleRender(); });
      }
    }
    if (on && !sat) { toast("The satellite view needs WebGL, which this browser does not offer"); on = false; }
    ui.satellite = on;
    detail.key = "";
    $("sat-btn").setAttribute("aria-pressed", String(on));
    try { localStorage.setItem(STORE_SAT, on ? "1" : "0"); } catch (e) { }
    scheduleRender();
  }
  $("sat-btn").addEventListener("click", function () { setSatellite(!ui.satellite); });

  var detail = { key: "", rect: null, cache: new Map(), gen: 0, ok: 0, failed: 0, off: false, shown: false, put: new Set(), source: 0 };
  function mercY(lat) { var p = lat * D2R; return (1 - Math.log(Math.tan(Math.PI / 4 + p / 2)) / Math.PI) / 2; }
  function detailWanted(r, maxZ) {
    if (!r.detailFits()) return null;
    var S = localScale() * dpr;
    var latC = Math.max(-75, Math.min(75, view.lat)) * D2R;
    var z = Math.floor(Math.log(TAU * S * Math.cos(latC) / 256 / 1.15) / Math.LN2);
    if (z < 5) return null;
    z = Math.min(maxZ, z);
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
      if (nx <= r.slots && ny <= r.slots && nx * ny <= DETAIL_MAX_TILES) return { z: z, x0: ((x0 % n) + n) % n, y0: y0, nx: nx, ny: ny };
    }
    return null;
  }
  function maybeDetail() {
    if (detail.off || !sat || !ui.satellite || !sat.ready()) return;
    var key = [flat ? 1 : 0, view.lon.toFixed(3), view.lat.toFixed(3), view.zoom.toFixed(4), W, H].join();
    if (key === detail.key) return;
    detail.key = key;
    var want = detailWanted(sat, DETAIL_MAX_Z);
    if (!want) {
      if (detail.rect) { detail.rect = null; detail.shown = false; sat.endDetail(); scheduleRender(); }
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
    if (changedAny) scheduleRender();
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
      if (i < r.nx && j >= 0 && j < r.ny && !detail.put.has(key) && sat.putTile(t.img, i, j)) { detail.put.add(key); scheduleRender(); }
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
        scheduleRender();
        return;
      }
      detail.off = true; detail.shown = false;
      sat.endDetail();
      console.warn("satellite detail tiles are unavailable");
      scheduleRender();
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

  var statusTimer = 0;
  function toast(text, action, onAction, ms) {
    $("status-text").textContent = text;
    var btn = $("status-action");
    if (action) {
      btn.textContent = action; btn.hidden = false;
      btn.onclick = function () { hideToast(); onAction(); };
    } else { btn.hidden = true; btn.onclick = null; }
    $("status").hidden = false;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(hideToast, ms || (action ? 7000 : 2200));
  }
  function hideToast() { $("status").hidden = true; toastStep = null; }

  function validName(s) { return typeof s === "string" ? s.slice(0, NAME_MAX) : null; }
  function validColor(c) {
    if (isInt(c) && c >= 0 && c < PALETTE) return c;
    if (typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
    return null;
  }
  function validLonLat(lon, lat) { return typeof lon === "number" && typeof lat === "number" && isFinite(lon) && isFinite(lat) && Math.abs(lon) <= 180 && Math.abs(lat) <= 90; }
  function validCity(row) {
    if (!Array.isArray(row) || row.length < 5) return null;
    var name = validName(row[0]);
    if (name === null || !validLonLat(row[1], row[2])) return null;
    var tier = Math.max(1, Math.min(4, Math.round(+row[3] || 3)));
    return { name: name, lon: row[1], lat: row[2], tier: tier, cap: row[4] ? 1 : 0 };
  }
  function round4(x) { return Math.round(x * 1e4) / 1e4; }
  var MAP_KEYS = ["c", "o", "u", "x", "m", "a", "h", "l", "r"];
  function encodePolys(polys) {
    return polys.map(function (poly) {
      return poly.map(function (ring) {
        var out = [], px = 0, py = 0;
        for (var i = 0; i + 1 < ring.length; i++) {
          var x = Math.round(ring[i][0] * 1e4), y = Math.round(ring[i][1] * 1e4);
          out.push(x - px, y - py); px = x; py = y;
        }
        return out;
      });
    });
  }
  function crossings(ring, limit) {
    var n = ring.length - 1, found = 0;
    for (var i = 0; i < n; i++) {
      var a = ring[i], b = ring[i + 1];
      var ax0 = Math.min(a[0], b[0]), ax1 = Math.max(a[0], b[0]), ay0 = Math.min(a[1], b[1]), ay1 = Math.max(a[1], b[1]);
      for (var j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        var c = ring[j], d = ring[j + 1];
        if (Math.max(c[0], d[0]) < ax0 || Math.min(c[0], d[0]) > ax1 || Math.max(c[1], d[1]) < ay0 || Math.min(c[1], d[1]) > ay1) continue;
        var d1 = (d[0] - c[0]) * (a[1] - c[1]) - (d[1] - c[1]) * (a[0] - c[0]);
        var d2 = (d[0] - c[0]) * (b[1] - c[1]) - (d[1] - c[1]) * (b[0] - c[0]);
        var d3v = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        var d4 = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);
        if (((d1 > 0) !== (d2 > 0)) && ((d3v > 0) !== (d4 > 0)) && d1 && d2 && d3v && d4 && ++found > limit) return found;
      }
    }
    return found;
  }
  function loadPolys(polys) {
    var bad = 0;
    for (var a = 0; a < polys.length; a++) for (var b = 0; b < polys[a].length; b++) {
      bad += crossings(polys[a][b], 6);
      if (bad > 6) return null;
    }
    if (bad) { try { return cleanPolys(polys); } catch (e) { return null; } }
    return polys.map(function (poly) {
      return poly.map(function (ring, i) { var A = ringSigned(ring); return (i === 0 ? A > 0 : A < 0) ? ring.slice().reverse() : ring; });
    });
  }
  function decodePolys(rows, left) {
    if (!Array.isArray(rows) || !rows.length || rows.length > 400) return null;
    var polys = [], n = 0;
    for (var a = 0; a < rows.length; a++) {
      var poly = rows[a];
      if (!Array.isArray(poly) || !poly.length || poly.length > 200) return null;
      var rings = [];
      for (var b = 0; b < poly.length; b++) {
        var r = poly[b];
        if (!Array.isArray(r) || r.length < 6 || r.length % 2 || r.length > 5000) return null;
        n += r.length / 2;
        if (n > left) return null;
        var ring = [], x = 0, y = 0;
        for (var i = 0; i < r.length; i += 2) {
          if (!isInt(r[i]) || !isInt(r[i + 1])) return null;
          x += r[i]; y += r[i + 1];
          if (Math.abs(x) > 1800000 || Math.abs(y) > 900000) return null;
          ring.push([x / 1e4, y / 1e4]);
        }
        ring.push(ring[0].slice());
        rings.push(ring);
      }
      polys.push(rings);
    }
    return { polys: polys, n: n };
  }
  function isMapObject(d) {
    if (!d || typeof d !== "object" || Array.isArray(d)) return false;
    var keys = Object.keys(d);
    return keys.every(function (k) { return MAP_KEYS.indexOf(k) >= 0; });
  }
  function makeDiff() {
    var d = {};
    var cs = [];
    countries.forEach(function (c, i) {
      var b = base.countries[i];
      if (b) {
        if (c.name !== b.name || c.color !== b.color) cs.push([i, c.name !== b.name ? c.name : null, c.color !== b.color ? c.color : null]);
      } else if (c.alive) cs.push([i, c.name, c.color]);
    });
    if (cs.length) d.c = cs;
    var o = [], uu = [];
    for (var p = 0; p < nProv; p++) {
      var us = provUnits[p];
      if (!us.length) continue;
      var first = owner[us[0]], mixed = false;
      for (var i = 1; i < us.length; i++) if (owner[us[i]] !== first) { mixed = true; break; }
      if (!mixed) { if (first !== base.provOwner[p]) o.push(p, first); }
      else { var row = [p]; for (i = 0; i < us.length; i++) row.push(owner[us[i]]); uu.push(row); }
    }
    if (o.length) d.o = o;
    if (uu.length) d.u = uu;
    var x = [], m = [], a = [];
    base.cities.forEach(function (b, i) {
      var c = cityIndex.get("b" + i);
      if (!c) { x.push(i); return; }
      if (c.name !== b.name || c.lon !== b.lon || c.lat !== b.lat || c.tier !== b.tier || c.cap !== b.cap) m.push([i, c.name, round4(c.lon), round4(c.lat), c.tier, c.cap]);
    });
    cities.forEach(function (c) { if (c.id.charAt(0) === "u") a.push([c.name, round4(c.lon), round4(c.lat), c.tier, c.cap, c.id]); });
    if (x.length) d.x = x;
    if (m.length) d.m = m;
    if (a.length) d.a = a;
    if (pieces.length) d.h = pieces.map(function (p) { return [p.owner, encodePolys(p.shape.polys)]; });
    var ls = [];
    countries.forEach(function (c, i) { if (c.alive && c.lines) ls.push([i, c.lines]); });
    if (ls.length) d.l = ls;
    var rs = [];
    countries.forEach(function (c, i) {
      var r = isInt(c.ruler) ? c.ruler : -1, b = base.countries[i], br = b ? b.ruler : -1;
      if (c.alive && r !== br && (r < 0 || countries[r])) rs.push([i, r]);
    });
    if (rs.length) d.r = rs;
    return d;
  }
  function isEmpty(d) { return !d || Object.keys(d).length === 0; }
  function needsFine(d) { return !!(d && Array.isArray(d.u) && d.u.length); }
  function loadDiff(d, compact) {
    var old = countries;
    var nb = base.countries.length;
    for (var u = 0; u < nUnit; u++) owner[u] = base.provOwner[unitProv[u]];
    countries = base.countries.map(function (b, i) { return { code: b.code, name: b.name, color: b.color, ruler: b.ruler, alive: true, label: old[i] ? old[i].label : null }; });
    d = isMapObject(d) ? d : {};
    var remap = new Map();
    if (Array.isArray(d.c)) d.c.slice(0, nb + MAX_NEW).forEach(function (row) {
      if (!Array.isArray(row)) return;
      var i = row[0];
      if (!isInt(i) || i < 0) return;
      var name = validName(row[1]), color = validColor(row[2]);
      if (i < nb) { if (name !== null) countries[i].name = name; if (color !== null) countries[i].color = color; return; }
      if (remap.has(i)) return;
      var j;
      if (compact) { if (remap.size >= MAX_NEW) return; j = nb + remap.size; }
      else { if (i >= nb + 100000) return; j = i; }
      remap.set(i, j);
      ensureCountry(j);
      var prev = old[j];
      countries[j] = { code: "N" + j, name: name || "New country", color: color === null ? 0 : color, alive: true, label: !compact && prev && prev.alive ? prev.label : null };
    });
    ensureCountry(old.length - 1);
    function ownerOf(v) {
      if (!isInt(v)) return null;
      if (v === -1) return -1;
      if (v >= 0 && v < nb) return v;
      return remap.has(v) ? remap.get(v) : null;
    }
    if (Array.isArray(d.o)) {
      var lim = Math.min(d.o.length, 2 * nProv);
      for (var k = 0; k + 1 < lim; k += 2) {
        var p = d.o[k], v = ownerOf(d.o[k + 1]);
        if (!isInt(p) || p < 0 || p >= nProv || v === null) continue;
        var us = provUnits[p];
        for (var q = 0; q < us.length; q++) owner[us[q]] = v;
      }
    }
    if (Array.isArray(d.u) && fineData) d.u.slice(0, nProv).forEach(function (row) {
      if (!Array.isArray(row)) return;
      var p = row[0];
      if (!isInt(p) || p < 0 || p >= nProv) return;
      var us = provUnits[p];
      if (row.length !== us.length + 1) return;
      for (var i = 0; i < us.length; i++) { var v = ownerOf(row[i + 1]); if (v !== null) owner[us[i]] = v; }
    });
    if (Array.isArray(d.l)) d.l.slice(0, nb + MAX_NEW).forEach(function (row) {
      if (!Array.isArray(row) || !isInt(row[1]) || row[1] < 1 || row[1] > 3) return;
      var i = ownerOf(row[0]);
      if (i !== null && i >= 0 && countries[i]) countries[i].lines = row[1];
    });
    if (Array.isArray(d.r)) d.r.slice(0, nb + MAX_NEW).forEach(function (row) {
      if (!Array.isArray(row)) return;
      var i = ownerOf(row[0]), r = ownerOf(row[1]);
      if (i === null || i < 0 || r === null || !countries[i] || r === i) return;
      countries[i].ruler = r;
    });
    cities = []; cityIndex = new Map();
    base.cities.forEach(function (b, i) { setCityState("b" + i, b); });
    var nbc = base.cities.length;
    if (Array.isArray(d.x)) d.x.slice(0, nbc).forEach(function (i) { if (isInt(i) && i >= 0 && i < nbc) setCityState("b" + i, null); });
    if (Array.isArray(d.m)) d.m.slice(0, nbc).forEach(function (row) {
      if (!Array.isArray(row) || !isInt(row[0]) || row[0] < 0 || row[0] >= nbc) return;
      var c = validCity(row.slice(1));
      if (c) setCityState("b" + row[0], c);
    });
    if (Array.isArray(d.a)) {
      var rows = d.a.slice(0, MAX_ADDED_CITIES);
      rows.forEach(function (row) { var m = Array.isArray(row) && /^u(\d{1,7})$/.exec(row[5]); if (m) citySeq = Math.max(citySeq, +m[1]); });
      rows.forEach(function (row) {
        var c = validCity(row);
        if (!c) return;
        var id = typeof row[5] === "string" && /^u\d{1,7}$/.test(row[5]) && !cityIndex.has(row[5]) ? row[5] : "u" + (++citySeq);
        setCityState(id, c);
      });
    }
    sortCities();
    var list = [], left = MAX_PIECE_POINTS;
    if (Array.isArray(d.h)) d.h.slice(0, MAX_PIECES).forEach(function (row) {
      if (!Array.isArray(row)) return;
      var o = ownerOf(row[0]);
      if (o === null) return;
      var dec = decodePolys(row[1], left);
      if (!dec) return;
      left -= dec.n;
      var polys = loadPolys(dec.polys);
      if (polys && polys.length) list.push({ id: ++pieceSeq, owner: o, shape: makeShape(polys), edges: null });
    });
    pieces = list;
    piecesChanged();
    ownersChanged();
    countriesVersion++;
    labelQueue.clear();
    sortLabels();
    freshGroups();
    queueLabels(countries.map(function (c, i) { return i; }));
    if (ui.city && cityIndex.get(ui.city.id) !== ui.city) ui.city = null;
    if (ui.country >= 0 && !(countries[ui.country] && countries[ui.country].alive)) ui.country = -1;
  }
  function replaceMap(d, label) {
    cancelLasso();
    if (stroke) endStroke();
    cancelCityDrag();
    var before = makeDiff();
    loadDiff(d, true);
    var step = pushStep(label, [{ t: "replace", from: before, to: makeDiff() }]);
    ui.city = null; ui.region = -1; ui.piece = null;
    changed();
    return step;
  }
  function save() {
    saveTimer = 0;
    try {
      var d = makeDiff();
      if (isEmpty(d)) localStorage.removeItem(STORE);
      else localStorage.setItem(STORE, JSON.stringify({ v: 2, map: d, shared: sharedOpen || undefined }));
    } catch (e) { }
  }
  function readStoredRaw(key) {
    try {
      var s = localStorage.getItem(key);
      if (!s) return null;
      var o = JSON.parse(s);
      return o && isMapObject(o.map) ? o : null;
    } catch (e) { return null; }
  }
  function readStored(key) { var o = readStoredRaw(key); return o ? o.map : null; }

  function bytesToB64url(bytes) {
    var s = "";
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlToBytes(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function streamThrough(bytes, stream) {
    var w = stream.writable.getWriter();
    w.write(bytes).catch(function () { });
    w.close().catch(function () { });
    return new Response(stream.readable).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  function encodeMap(d) {
    var bytes = new TextEncoder().encode(JSON.stringify(d));
    if (window.CompressionStream) {
      try { return streamThrough(bytes, new CompressionStream("deflate-raw")).then(function (z) { return "z" + bytesToB64url(z); }); } catch (e) { }
    }
    return Promise.resolve("j" + bytesToB64url(bytes));
  }
  function decodeMap(s) {
    try {
      var kind = s.charAt(0), bytes = b64urlToBytes(s.slice(1));
      var json = kind === "z" ? (window.DecompressionStream ? streamThrough(bytes, new DecompressionStream("deflate-raw")) : Promise.reject(new Error("no DecompressionStream"))) : Promise.resolve(bytes);
      return json.then(function (b) {
        if (b.length > 4e6) throw new Error("too big");
        return JSON.parse(new TextDecoder().decode(b));
      });
    } catch (e) { return Promise.reject(e); }
  }
  $("share").addEventListener("click", function () {
    encodeMap(makeDiff()).then(function (code) {
      var url = location.origin + location.pathname + "#m=" + code;
      if (url.length > 60000) { toast("Too many changes for a link: save a file instead"); return; }
      var done = function () { toast("Link copied"); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { window.prompt("Copy this link", url); });
      else window.prompt("Copy this link", url);
    }).catch(function () { toast("The link could not be made: save a file instead"); });
  });
  $("export").addEventListener("click", function () {
    var blob = new Blob([JSON.stringify({ format: "uchronia", v: 2, saved: new Date().toISOString(), map: makeDiff() })], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "uchronia-map.json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  });
  $("import").addEventListener("click", function () { $("import-file").click(); });
  $("import-file").addEventListener("change", function () {
    var f = $("import-file").files[0];
    $("import-file").value = "";
    if (!f) return;
    if (f.size > 5e6) { toast("That file is too big to be a map"); return; }
    f.text().then(function (text) {
      var o = JSON.parse(text);
      var d = o && typeof o === "object" && o.format === "uchronia" ? o.map : o;
      if (!isMapObject(d)) throw new Error("not a map");
      return (needsFine(d) ? loadFine() : Promise.resolve(true)).then(function () {
        var step = replaceMap(d, "Opening a file");
        toast("Map opened", "Undo", undoIfTop(step));
        toastStep = step;
      });
    }).catch(function () { toast("That file is not a map from this page"); });
  });
  $("reset").addEventListener("click", function () {
    if (isEmpty(makeDiff())) { toast("This is already the world as it is"); return; }
    var step = replaceMap({}, "Starting over");
    toast("Back to the world as it is", "Undo", undoIfTop(step));
    toastStep = step;
  });

  function backToMine() {
    var prev = readStored(STORE_PREV);
    if (!prev) { toast("Your earlier map is no longer kept"); return; }
    (needsFine(prev) ? loadFine() : Promise.resolve(true)).then(function () { replaceMap(prev, "Going back to your map"); toast("Your map is back"); });
  }
  function openSharedFromHash() {
    var m = /^#m=([A-Za-z0-9_-]{1,300000})$/.exec(location.hash);
    if (!m) return Promise.resolve(false);
    return decodeMap(m[1]).then(function (d) {
      if (!isMapObject(d)) throw new Error("not a map");
      return (needsFine(d) ? loadFine() : Promise.resolve(true)).then(function () {
        var mine = makeDiff();
        var kept = sharedOpen === 2;
        if (!sharedOpen && !isEmpty(mine)) {
          try { localStorage.setItem(STORE_PREV, JSON.stringify({ v: 2, map: mine })); kept = true; } catch (e) { }
        }
        replaceMap(d, "Opening a shared map");
        sharedOpen = kept ? 2 : 1;
        requestAnimationFrame(function () { setTimeout(save, 0); });
        history.replaceState(null, "", location.pathname + location.search);
        if (kept) toast("A shared map is open", "Back to mine", backToMine, 12000);
        else toast("A shared map is open");
        return true;
      });
    }).catch(function (e) {
      console.warn("shared map", e);
      history.replaceState(null, "", location.pathname + location.search);
      toast("That link's map could not be read");
      return false;
    });
  }

  var tipBox = null, hintOn = null, hintTimer = 0, hintLeft = 0;
  function describeTip(el) {
    var t = el.dataset.tip || "";
    if (t && t !== el.getAttribute("aria-label") && t !== el.textContent.trim()) el.setAttribute("aria-description", t);
    else el.removeAttribute("aria-description");
  }
  function setTip(el, text) {
    if (el.dataset.tip === text) return;
    el.dataset.tip = text;
    describeTip(el);
    if (hintOn === el) fillHint(el);
  }
  function fillHint(el) {
    var t = el.dataset.tip || "", m = /^(.*?)\s*\(([^()]+)\)$/.exec(t);
    tipBox.textContent = m ? m[1] : t;
    if (m) {
      var k = document.createElement("span");
      k.className = "uc-hover-key";
      k.textContent = m[2];
      tipBox.appendChild(k);
    }
    placeHint(el);
  }
  function placeHint(el) {
    var r = el.getBoundingClientRect(), w = tipBox.offsetWidth, h = tipBox.offsetHeight, vw = document.documentElement.clientWidth, vh = window.innerHeight, x, y, gap = 8;
    if (el.dataset.tipSide === "left") {
      x = r.left - gap - w;
      y = r.top + r.height / 2 - h / 2;
    } else {
      x = r.left + r.width / 2 - w / 2;
      y = r.bottom + gap;
      if (y + h > vh - 6) y = r.top - gap - h;
    }
    tipBox.style.left = Math.round(Math.max(6, Math.min(vw - w - 6, x))) + "px";
    tipBox.style.top = Math.round(Math.max(6, Math.min(vh - h - 6, y))) + "px";
  }
  function showHint(el) {
    if (!el.isConnected || !el.dataset.tip || el.closest("[hidden]")) return;
    hintOn = el;
    tipBox.hidden = false;
    fillHint(el);
    tipBox.classList.add("is-on");
  }
  function hideHint() {
    clearTimeout(hintTimer);
    if (hintOn) hintLeft = Date.now();
    hintOn = null;
    if (!tipBox || tipBox.hidden) return;
    tipBox.classList.remove("is-on");
    tipBox.hidden = true;
  }
  (function () {
    tipBox = document.createElement("div");
    tipBox.className = "uc-hover-tip";
    tipBox.setAttribute("role", "tooltip");
    tipBox.setAttribute("aria-hidden", "true");
    tipBox.hidden = true;
    document.body.appendChild(tipBox);
    Array.prototype.forEach.call(document.querySelectorAll("[data-tip]"), describeTip);
    function soon(el) {
      clearTimeout(hintTimer);
      if (hintOn && hintOn !== el) hideHint();
      hintTimer = setTimeout(showHint, Date.now() - hintLeft < 600 ? 40 : 420, el);
    }
    document.addEventListener("pointerover", function (e) {
      if (e.pointerType !== "mouse") return;
      var el = e.target.closest ? e.target.closest("[data-tip]") : null;
      if (el === hintOn) return;
      if (!el) { hideHint(); return; }
      if (!e.buttons) soon(el);
    });
    document.addEventListener("pointerout", function (e) {
      var el = e.target.closest ? e.target.closest("[data-tip]") : null;
      if (el && !el.contains(e.relatedTarget)) hideHint();
    });
    document.addEventListener("focusin", function (e) {
      var el = e.target.closest ? e.target.closest("[data-tip]") : null;
      if (el && el.matches(":focus-visible")) soon(el);
    });
    document.addEventListener("focusout", function (e) { if (hintOn && hintOn.contains(e.target)) hideHint(); });
    document.addEventListener("pointerdown", hideHint, true);
    document.addEventListener("keydown", hideHint, true);
    document.addEventListener("wheel", hideHint, { capture: true, passive: true });
    window.addEventListener("resize", hideHint);
    window.addEventListener("blur", hideHint);
  })();

  (function () {
    var box = $("about"), btn = $("about-btn");
    function setOpen(open) {
      box.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
    }
    btn.addEventListener("click", function () {
      var open = !box.classList.contains("is-open");
      setOpen(open);
      box.classList.toggle("is-shut", !open);
    });
    box.addEventListener("mouseenter", function () {
      box.classList.remove("is-shut");
      if (canHover) btn.setAttribute("aria-expanded", "true");
    });
    box.addEventListener("mouseleave", function () {
      if (box.contains(document.activeElement)) return;
      box.classList.remove("is-shut");
      if (!box.classList.contains("is-open")) btn.setAttribute("aria-expanded", "false");
    });
    box.addEventListener("focusin", function () { if (!box.classList.contains("is-shut")) btn.setAttribute("aria-expanded", "true"); });
    box.addEventListener("focusout", function (e) {
      if (box.contains(e.relatedTarget)) return;
      if (!box.matches(":hover")) box.classList.remove("is-shut");
      if (!box.classList.contains("is-open")) btn.setAttribute("aria-expanded", "false");
    });
    document.addEventListener("pointerdown", function (e) { if (box.classList.contains("is-open") && !box.contains(e.target)) setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || !(box.classList.contains("is-open") || box.contains(document.activeElement))) return;
      setOpen(false);
      if (box.contains(document.activeElement)) document.activeElement.blur();
    });
  })();

  var menus = [$("check-menu"), $("file-menu"), $("adv")];
  var baseCaps = new Map(), issues = [], checkTimer = 0;
  var DEFAULT_CITY = /^(New|Unnamed) city( \d+)?$/, UNNAMED_COUNTRY = /^Unnamed country( \d+)?$/;
  function capitalsBy() {
    var by = new Map();
    for (var i = 0; i < cities.length; i++) {
      var c = cities[i];
      if (!c.cap) continue;
      var o = cityOwner(c);
      if (o === null || o < 0) continue;
      if (!by.has(o)) by.set(o, []);
      by.get(o).push(c);
    }
    return by;
  }
  function cityMoved(c) {
    if (c.id.charAt(0) === "u") return true;
    var b = base.cities[+c.id.slice(1)];
    return !!b && (b.lon !== c.lon || b.lat !== c.lat);
  }
  function findIssues() {
    var out = [];
    if (!feats || !base) return out;
    freshGroups();
    var caps = capitalsBy(), names = new Map();
    if (freshCountry >= 0 && currentCountry() !== freshCountry) freshCountry = -1;
    countries.forEach(function (co, i) {
      if (!co.alive || i === freshCountry) return;
      var founded = /^N\d+$/.test(co.code);
      if (DEFAULT_NAME.test(co.name) || UNNAMED_COUNTRY.test(co.name)) out.push({ country: i, name: co.name, note: "Never renamed", rename: true });
      if (!hasLand(i)) { if (founded) out.push({ country: i, name: co.name, note: "Has no land" }); return; }
      var cs = caps.get(i) || [], had = baseCaps.get(i) || 0;
      if (!cs.length && (founded || had)) out.push({ country: i, name: co.name, note: "Has no capital" });
      if (cs.length > 1 && cs.length > had) out.push({ country: i, name: co.name, note: "Has " + cs.length + " capitals: " + cs.map(function (c) { return c.name; }).join(", ") });
      var key = co.name.trim().toLowerCase();
      if (names.has(key)) out.push({ country: i, name: co.name, note: "Another country has this name" });
      else names.set(key, i);
    });
    var links = countryLinks(), clashes = new Map();
    countries.forEach(function (co, i) {
      if (!co.alive || !hasLand(i)) return;
      [[links.touch[i], 2], [links.near[i], 1]].forEach(function (pair) {
        pair[0].forEach(function (j) {
          if (!countries[j] || !countries[j].alive || !hasLand(j)) return;
          var a = hueOf(i), b = hueOf(j);
          if (a === b || colorOf(i) !== colorOf(j)) return;
          var lo = Math.min(a, b), hi = Math.max(a, b), key = lo + ":" + hi, was = clashes.get(key);
          if (!was || was.how < pair[1]) clashes.set(key, { a: lo, b: hi, how: pair[1] });
        });
      });
    });
    clashes.forEach(function (c) {
      out.push({ country: c.a, name: countries[c.a].name, note: "Same colour as " + countries[c.b].name + (c.how === 2 ? ", which borders it" : ", just across the water") });
    });
    cities.forEach(function (c) {
      var unnamed = DEFAULT_CITY.test(c.name);
      if (!unnamed && !cityMoved(c)) return;
      var o = cityOwner(c);
      if (unnamed) out.push({ city: c, name: c.name, note: "Never renamed, " + (o === null ? "at sea" : o < 0 || !countries[o] ? "on unclaimed land" : "in " + countries[o].name), rename: true });
      else if (o === null) out.push({ city: c, name: c.name, note: "Stands in the sea" });
    });
    return out;
  }
  function scheduleChecks() { clearTimeout(checkTimer); checkTimer = setTimeout(runChecks, 300); }
  function runChecks() {
    issues = findIssues();
    var n = $("check-count"), shown = !n.hidden;
    n.hidden = !issues.length;
    if (shown !== !n.hidden) fitBar(true);
    n.textContent = issues.length > 99 ? "99+" : String(issues.length);
    $("check-menu").querySelector("summary").setAttribute("aria-label", issues.length ? "Check: " + issues.length + (issues.length === 1 ? " thing" : " things") + " to look at" : "Check: nothing to fix");
    if ($("check-menu").open) renderChecks();
  }
  function renderChecks() {
    var box = $("check-list");
    box.textContent = "";
    if (!issues.length) {
      var p = document.createElement("p");
      p.className = "uc-check-empty"; p.textContent = "Nothing to fix";
      box.appendChild(p);
      return;
    }
    issues.forEach(function (it) {
      var b = document.createElement("button"), t = document.createElement("span"), n = document.createElement("small");
      b.type = "button"; b.className = "uc-menu-item uc-issue";
      t.textContent = it.name; n.textContent = it.note;
      b.appendChild(t); b.appendChild(n);
      b.addEventListener("click", function () { goToIssue(it); });
      box.appendChild(b);
    });
  }
  function goToIssue(it) {
    closeMenus(null);
    if (it.city) {
      if (cityIndex.get(it.city.id) !== it.city) { runChecks(); return; }
      if (ui.tool !== "select" && ui.tool !== "city") setTool("select");
      selectCity(it.city);
      flyTo(it.city.lon, it.city.lat, Math.max(view.zoom, zoomForScale(1600)));
      if (it.rename && canHover) { var ci = $("city-name"); ci.focus(); ci.select(); }
      return;
    }
    var c = it.country;
    if (!countries[c] || !countries[c].alive) { runChecks(); return; }
    if (ui.tool !== "select") setTool("select");
    ui.country = c; ui.city = null; ui.region = -1; ui.piece = null; ui.erase = false;
    renderPanel(); scheduleRender();
    flyToCountry(c);
    if (it.rename && canHover) { var ni = $("country-name"); ni.focus(); ni.select(); }
  }
  $("check-menu").addEventListener("toggle", function () { if ($("check-menu").open) { runChecks(); renderChecks(); } });
  function closeMenus(except) {
    menus.forEach(function (m) { if (m !== except && m.open && !(sheetMode && m.id === "file-menu")) m.open = false; });
  }
  menus.forEach(function (m) {
    m.addEventListener("toggle", function () {
      if (!m.open) return;
      if (!sheetMode) closeMenus(m);
      if (!$("history").hidden) showHistory(false);
    });
  });
  document.addEventListener("pointerdown", function (e) {
    if (sheetMode) return;
    menus.forEach(function (m) { if (m.open && !m.contains(e.target)) m.open = false; });
  }, true);
  window.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || sheetMode) return;
    var open = menus.filter(function (m) { return m.open; })[0];
    if (!open) return;
    e.preventDefault(); e.stopPropagation();
    open.open = false;
    open.querySelector("summary").focus();
  }, true);
  $("file-menu").querySelectorAll(".uc-menu-item").forEach(function (b) {
    b.addEventListener("click", function () {
      if (sheetMode) return;
      $("file-menu").open = false;
      $("file-menu").querySelector("summary").focus();
    });
  });
  var BAR_MODES = [["", "", ""], ["", "", "no-labels"], ["", "no-title", "no-labels"], ["bar-a", "", ""], ["bar-a", "", "no-labels"], ["bar-b", "", "no-labels"],
    ["bar-a", "no-title", "no-labels"], ["bar-b", "no-title", "no-labels"], ["bar-c", "no-title", "no-labels"]];
  var barWidth = -1;
  function itemsBox(el) {
    var l = Infinity, t = Infinity, r = -Infinity, btm = -Infinity;
    Array.prototype.forEach.call(el.children, function (k) {
      var q = k.getBoundingClientRect();
      if (!q.width) return;
      l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); btm = Math.max(btm, q.bottom);
    });
    return l === Infinity ? el.getBoundingClientRect() : { left: l, top: t, right: r, bottom: btm };
  }
  function barFits() {
    var panelBox = panel.getBoundingClientRect(), main = panel.querySelector(".uc-main"), boxes = [main.getBoundingClientRect(), $("new-country").getBoundingClientRect(), itemsBox(panel.querySelector(".uc-end"))];
    if (main.scrollWidth > main.clientWidth + 1) return false;
    for (var i = 0; i < boxes.length; i++) {
      var a = boxes[i];
      if (a.left < panelBox.left - 1 || a.right > panelBox.right + 1) return false;
      for (var j = i + 1; j < boxes.length; j++) {
        var b = boxes[j];
        if (a.top < b.bottom - 2 && b.top < a.bottom - 2 && a.left < b.right + 8 && b.left < a.right + 8) return false;
      }
    }
    return true;
  }
  function barBase() {
    var bottom = bar.getBoundingClientRect().bottom;
    if (bar.classList.contains("has-ctx")) bottom -= bar.querySelector(".uc-context").getBoundingClientRect().height + 6;
    return Math.ceil(bottom);
  }
  function fitBar(force) {
    if (!BAR_MODES || sheetMode || ui.bare) return;
    var w = Math.round(bar.getBoundingClientRect().width);
    if (w === barWidth && !force) return;
    barWidth = w;
    var all = ["bar-a", "bar-b", "bar-c", "no-title", "no-labels"];
    for (var m = 0; m < BAR_MODES.length; m++) {
      all.forEach(function (c) { bar.classList.remove(c); });
      BAR_MODES[m].forEach(function (c) { if (c) bar.classList.add(c); });
      if (barFits()) return;
    }
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitBar(true); });
  if (window.ResizeObserver) new ResizeObserver(function () {
    fitBar(false);
    if (sheetMode || ui.bare) return;
    document.documentElement.style.setProperty("--uc-bar-h", Math.ceil(bar.getBoundingClientRect().bottom) + "px");
    var h = barBase();
    if (h !== freeT) { freeT = h; applyView(); scheduleRender(); }
  }).observe(bar);

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
    document.body.classList.toggle("uc-sheet-open", open);
    var controls = document.querySelector(".uc-controls");
    controls.classList.toggle("is-lifted", open);
    controls.classList.toggle("is-low", st === SHEET_HIDDEN);
    $("sheet-handle").setAttribute("aria-expanded", String(open));
    $("sheet-handle").setAttribute("aria-label", open ? "Show less" : "Show more");
    if (!open) panel.scrollTop = 0;
    setTimeout(function () { layout(); scheduleRender(); }, 300);
  }
  $("sheet-handle").addEventListener("click", function () {
    if (performance.now() - sheetGestureAt < 500) return;
    var st = sheetState();
    setSheetState(st === SHEET_OPEN ? SHEET_PEEK : st + 1);
  });
  [$("country-name"), $("city-name")].forEach(function (inp) {
    inp.addEventListener("focus", function () {
      if (sheetMode && !panel.classList.contains("is-open") && performance.now() - sheetGestureAt > 500) setSheetState(SHEET_OPEN);
    });
  });
  var sheetDrag = null;
  panel.addEventListener("pointerdown", function (e) {
    if (!sheetMode) return;
    var onHandle = !!(e.target.closest && e.target.closest(".uc-sheet-handle, .uc-head"));
    if (e.pointerType === "mouse") {
      if (e.button !== 0 || !onHandle || e.target.closest("input, select, textarea, a, .uc-about")) return;
      e.preventDefault();
    }
    sheetDrag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), engaged: false, onHandle: onHandle };
  });
  panel.addEventListener("pointermove", function (e) {
    var d = sheetDrag;
    if (!d || e.pointerId !== d.id) return;
    var dy = e.clientY - d.y0, dx = e.clientX - d.x0;
    if (!d.engaged) {
      if (Math.abs(dy) < 10 || Math.abs(dy) < Math.abs(dx) * 1.2) return;
      if (sheetState() === SHEET_OPEN && !d.onHandle && !(panel.scrollTop <= 0 && dy > 0)) { sheetDrag = null; return; }
      d.engaged = true;
      try { panel.setPointerCapture(e.pointerId); } catch (err) { }
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

  function colorAll() {
    freshGroups();
    var links = countryLinks(), hue = countries.map(function (c, i) { return hueOf(i); });
    var adj = countries.map(function () { return new Set(); }), closeAdj = countries.map(function () { return new Set(); });
    links.touch.forEach(function (set, i) { set.forEach(function (j) { var a = hue[i], b = hue[j]; if (a !== b) { adj[a].add(b); adj[b].add(a); } }); });
    links.near.forEach(function (set, i) { set.forEach(function (j) { var a = hue[i], b = hue[j]; if (a !== b && !adj[a].has(b)) { closeAdj[a].add(b); closeAdj[b].add(a); } }); });
    var order = countries.map(function (c, i) { return i; }).filter(function (i) { return hue[i] === i; });
    order.sort(function (x, y) { return (adj[y].size + closeAdj[y].size) - (adj[x].size + closeAdj[x].size) || x - y; });
    var used = new Array(PALETTE).fill(0), done = new Array(countries.length).fill(false);
    order.forEach(function (i) {
      var near = [], close = [];
      adj[i].forEach(function (n) { if (done[n]) near.push(countries[n].color); });
      closeAdj[i].forEach(function (n) { if (done[n]) close.push(countries[n].color); });
      var code = countries[i].code, h = 0;
      for (var k = 0; k < code.length; k++) h = (h * 31 + code.charCodeAt(k)) >>> 0;
      var rot = used.map(function (n, k) { return n + ((k + h) % PALETTE) * 0.01; });
      var best = pickTone(near, rot, close);
      countries[i].color = best; used[best]++; done[i] = true;
    });
    countries.forEach(function (c, i) { if (hue[i] !== i) c.color = countries[hue[i]].color; });
  }

  function closeUnits(arcs) {
    var grid = new Map(), pts = [], STEP = 0.4;
    function add(lon, lat, u) {
      var gx = Math.floor((lon + 180) / 1) % 360, gy = Math.floor(lat + 90);
      var key = gy * 400 + gx, list = grid.get(key);
      if (!list) { list = []; grid.set(key, list); }
      list.push(pts.length);
      pts.push(lon, lat, u);
    }
    for (var a = 0; a < arcA.length; a++) {
      if (arcB[a] >= 0 || arcA[a] < 0 || arcSeam[a]) continue;
      var arc = arcs[a], u = arcA[a];
      if (!arc || !arc.length) continue;
      for (var k = 0; k < arc.length; k++) {
        add(arc[k][0], arc[k][1], u);
        if (k + 1 < arc.length) {
          var dx = arc[k + 1][0] - arc[k][0], dy = arc[k + 1][1] - arc[k][1];
          if (Math.abs(dx) > 180) continue;
          var n = Math.floor(Math.max(Math.abs(dx), Math.abs(dy)) / STEP);
          for (var j = 1; j <= n; j++) add(arc[k][0] + dx * j / (n + 1), arc[k][1] + dy * j / (n + 1), u);
        }
      }
    }
    var close = new Array(nUnit), seen = new Set(), KMD = 111.195, reach = CLOSE_KM / KMD;
    for (var q = 0; q < nUnit; q++) close[q] = [];
    for (var i = 0; i < pts.length; i += 3) {
      var lon = pts[i], lat = pts[i + 1], pu = pts[i + 2];
      var cos = Math.max(0.05, Math.cos(lat * Math.PI / 180));
      var ry = Math.ceil(reach), rx = Math.min(180, Math.ceil(reach / cos));
      var cy = Math.floor(lat + 90), cx = Math.floor(lon + 180) % 360;
      for (var yy = cy - ry; yy <= cy + ry; yy++) {
        if (yy < 0 || yy >= 180) continue;
        for (var xx = cx - rx; xx <= cx + rx; xx++) {
          var list = grid.get(yy * 400 + ((xx % 360) + 360) % 360);
          if (!list) continue;
          for (var m = 0; m < list.length; m++) {
            var o = list[m];
            if (o <= i) continue;
            var uo = pts[o + 2];
            if (uo === pu) continue;
            var lo = pu < uo ? pu : uo, hi = pu < uo ? uo : pu, pair = lo * 1048576 + hi;
            if (seen.has(pair)) continue;
            var ddx = pts[o] - lon;
            if (ddx > 180) ddx -= 360; else if (ddx < -180) ddx += 360;
            var ddy = pts[o + 1] - lat, mc = Math.cos((lat + pts[o + 1]) * Math.PI / 360);
            var km = Math.sqrt(ddx * ddx * mc * mc + ddy * ddy) * KMD;
            if (km > CLOSE_KM) continue;
            seen.add(pair);
            close[lo].push(hi); close[hi].push(lo);
          }
        }
      }
    }
    return close;
  }
  function countryLinks() {
    var touch = countries.map(function () { return new Set(); }), near = countries.map(function () { return new Set(); });
    for (var a = 0; a < arcA.length; a++) {
      var b = arcB[a];
      if (b < 0 || arcA[a] < 0) continue;
      var oa = owner[arcA[a]], ob = owner[b];
      if (oa >= 0 && ob >= 0 && oa !== ob) { touch[oa].add(ob); touch[ob].add(oa); }
    }
    if (unitClose) for (var u = 0; u < unitClose.length; u++) {
      var ou = owner[u];
      if (ou < 0) continue;
      unitClose[u].forEach(function (q) { var oq = owner[q]; if (oq >= 0 && oq !== ou && !touch[ou].has(oq)) { near[ou].add(oq); near[oq].add(ou); } });
    }
    return { touch: touch, near: near };
  }

  function setGeometry(topo, isFine) {
    objKey = isFine ? "units" : "provinces";
    baseObjects = topo.objects;
    detailGeo = null;
    hasDetail = !!topo.detail;
    var geoms = topo.objects[objKey].geometries;
    nUnit = geoms.length;
    unitProv = new Int32Array(nUnit);
    unitName = new Array(nUnit);
    for (var u = 0; u < nUnit; u++) {
      var pr = geoms[u].properties || {};
      unitProv[u] = isFine ? pr.p : u;
      unitName[u] = pr.n || "";
    }
    provUnits = [];
    for (var p = 0; p < nProv; p++) provUnits.push([]);
    for (u = 0; u < nUnit; u++) if (unitProv[u] >= 0 && unitProv[u] < nProv) provUnits[unitProv[u]].push(u);
    var pre = topojson.presimplify(topo, topojson.sphericalTriangleArea);
    var weights = [];
    pre.arcs.forEach(function (arc) { arc.forEach(function (pt) { if (isFinite(pt[2])) weights.push(pt[2]); }); });
    weights.sort(function (x, y) { return x - y; });
    var keep = function (fraction) { return weights[Math.max(0, Math.min(weights.length - 1, Math.floor((1 - fraction) * (weights.length - 1))))]; };
    levels = [topojson.simplify(pre, keep(0.11)), topojson.simplify(pre, keep(0.33)), pre];
    var gj = levels.map(function (t) { return topojson.feature(t, t.objects[objKey]).features; });
    geoFull = topojson.feature(topo, topo.objects[objKey]).features;
    feats = gj.map(prepare);
    arcLines = levels.map(function (t) { return t.arcs.map(prepareArc); });
    arcSeam = new Uint8Array(pre.arcs.length);
    pre.arcs.forEach(function (arc, a) {
      var seam = arc.length > 1;
      for (var k = 0; k < arc.length && seam; k++) if (!(Math.abs(arc[k][0]) > 179.9999 || arc[k][1] < -89.9999)) seam = false;
      arcSeam[a] = seam ? 1 : 0;
    });
    arcA = new Int32Array(topo.arcs.length).fill(-1);
    arcB = new Int32Array(topo.arcs.length).fill(-1);
    geoms.forEach(function (g, u) {
      var polys = g.type === "Polygon" ? [g.arcs] : g.type === "MultiPolygon" ? g.arcs : [];
      polys.forEach(function (rings) {
        rings.forEach(function (ring) {
          ring.forEach(function (k) {
            var a = k < 0 ? ~k : k;
            if (arcA[a] < 0) arcA[a] = u;
            else if (arcA[a] !== u) arcB[a] = u;
          });
        });
      });
    });
    unitNeighbors = new Array(nUnit);
    for (u = 0; u < nUnit; u++) unitNeighbors[u] = [];
    for (var a = 0; a < arcA.length; a++) {
      if (arcB[a] < 0 || arcA[a] < 0) continue;
      unitNeighbors[arcA[a]].push(arcB[a]);
      unitNeighbors[arcB[a]].push(arcA[a]);
    }
    unitClose = closeUnits(levels[1].arcs);
    unitArea = new Float64Array(nUnit);
    for (u = 0; u < nUnit; u++) {
      var ar = d3.geoArea(geoFull[u]);
      if (ar > TAU) ar = 2 * TAU - ar;
      unitArea[u] = ar * R_KM * R_KM;
    }
    buildUnitGrid();
    shapeCache.forEach(function (m) { m.clear(); });
    regionShapes.clear();
    selCache = { c: -2, v: -1, arcs: [] };
    cities.forEach(function (c) { c.u = -2; });
    groupsDirty = true; arcsDirty = true;
    ui.hover = -1;
    fineData = isFine;
  }

  var fineLoad = null;
  function loadFine() {
    if (fineData) return Promise.resolve(true);
    if (!fineLoad) {
      $("fine").disabled = true;
      fineLoad = fetchJSON("data/units.json").then(function (t) {
        if (!t.objects || !t.objects.units || !Array.isArray(t.provinces) || t.provinces.length !== nProv) throw new Error("units do not match");
        switchToFine(t);
        $("fine").disabled = false;
        return true;
      }).catch(function (e) {
        console.warn("finer regions", e);
        fineLoad = null;
        $("fine").disabled = false;
        toast("The finer regions did not load");
        return false;
      });
    }
    return fineLoad;
  }
  function switchToFine(t) {
    if (stroke) endStroke();
    cancelCityDrag();
    var provOwner = new Int32Array(nProv);
    for (var p = 0; p < nProv; p++) provOwner[p] = provUnits[p].length ? owner[provUnits[p][0]] : base.provOwner[p];
    var region = ui.region >= 0 ? unitProv[ui.region] : -1;
    setGeometry(t, true);
    geomGen++;
    owner = new Int32Array(nUnit);
    for (var u = 0; u < nUnit; u++) owner[u] = provOwner[unitProv[u]];
    ui.region = region >= 0 && provUnits[region].length ? provUnits[region][0] : -1;
    ownersChanged();
    queueLabels(countries.map(function (c, i) { return i; }));
    renderPanel();
    scheduleRender();
  }
  $("fine").addEventListener("change", function () {
    var on = $("fine").checked;
    fineShown.clear();
    try { localStorage.setItem(STORE_FINE, on ? "1" : "0"); } catch (e) { }
    if (!on) { ui.fine = false; arcsDirty = true; renderPanel(); scheduleRender(); return; }
    loadFine().then(function (ok) {
      ui.fine = !!ok;
      arcsDirty = true;
      if (!ok) try { localStorage.setItem(STORE_FINE, "0"); } catch (e) { }
      renderPanel(); scheduleRender();
    });
  });

  function setNames() {
    ui.countryNames = $("show-countries").checked;
    ui.cityNames = $("show-cities").checked;
    ui.towns = $("show-towns").checked;
    ui.scaleBar = $("show-scale").checked;
    ui.gridLabels = $("show-grid").checked;
    ui.rivers = $("show-rivers").checked;
    ui.terrain = $("show-terrain").checked;
    ui.lakes = $("show-lakes").checked;
    ui.waterNames = $("show-water-names").checked;
    ui.regionLines = $("show-region-lines").checked;
    try { localStorage.setItem(STORE_NAMES, [ui.countryNames, ui.cityNames, ui.scaleBar, ui.gridLabels, ui.rivers, ui.terrain, ui.towns, ui.lakes, ui.waterNames, ui.regionLines].map(function (on) { return on ? "1" : "0"; }).join("")); } catch (e) { }
    scheduleRender();
  }
  ["show-countries", "show-cities", "show-towns", "show-scale", "show-grid", "show-rivers", "show-terrain", "show-lakes", "show-water-names", "show-region-lines"].forEach(function (id) { $(id).addEventListener("change", setNames); });

  function init(topo, cityRows) {
    var geoms = topo.objects.provinces.geometries;
    nProv = geoms.length;
    var codeIndex = new Map();
    countries = topo.countries.map(function (c, i) { codeIndex.set(c.c, i); return { code: c.c, name: c.n, color: 0, ruler: -1, alive: true, label: null }; });
    Object.keys(HELD_BY).forEach(function (k) { HELD_BY[k].split(" ").forEach(function (h) { if (codeIndex.has(k) && codeIndex.has(h)) countries[codeIndex.get(h)].ruler = codeIndex.get(k); }); });
    provName = new Array(nProv);
    var provOwner = new Int32Array(nProv);
    groupName = (topo.groups || []).map(function (g) { return String(g.n); });
    groupProvs = groupName.map(function () { return []; });
    provGroup = new Int32Array(nProv).fill(-1);
    for (var p = 0; p < nProv; p++) {
      provName[p] = geoms[p].properties.n;
      provOwner[p] = codeIndex.has(geoms[p].properties.c) ? codeIndex.get(geoms[p].properties.c) : UNCLAIMED;
      var g = geoms[p].properties.g;
      if (g >= 0 && g < groupName.length) { provGroup[p] = g; groupProvs[g].push(p); }
    }
    setGeometry(topo, false);
    owner = new Int32Array(nUnit);
    for (var u = 0; u < nUnit; u++) owner[u] = provOwner[unitProv[u]];
    graticule = makeGraticule();
    graticuleIdx = graticule.map(function (g, i) { return i; });
    colorAll();
    cities = []; cityIndex = new Map();
    var baseCities = cityRows.map(function (r) { return { name: r[0], lon: r[1], lat: r[2], tier: r[3], cap: r[4] }; });
    base = {
      provOwner: provOwner,
      countries: countries.map(function (c) { return { code: c.code, name: c.name, color: c.color, ruler: c.ruler }; }),
      cities: baseCities
    };
    baseCities.forEach(function (b, i) { setCityState("b" + i, b); });
    sortCities();
    ownersChanged();
    baseCaps = new Map();
    capitalsBy().forEach(function (list, o) { baseCaps.set(o, list.length); });
    var stored = readStoredRaw(STORE);
    var finePref = null;
    try { finePref = localStorage.getItem(STORE_FINE); } catch (e) { }
    var flatPref = null;
    try { flatPref = localStorage.getItem(STORE_FLAT); } catch (e) { }
    var namesPref = null;
    try { namesPref = localStorage.getItem(STORE_NAMES); } catch (e) { }
    if (namesPref && namesPref.length >= 2) { ui.countryNames = namesPref[0] !== "0"; ui.cityNames = namesPref[1] !== "0"; ui.scaleBar = namesPref[2] !== "0"; ui.gridLabels = namesPref[3] !== "0"; ui.rivers = namesPref[4] !== "0"; ui.terrain = namesPref[5] !== "0"; ui.towns = namesPref[6] === "1"; ui.lakes = namesPref[7] !== "0"; ui.waterNames = namesPref[8] !== "0"; ui.regionLines = namesPref[9] !== "0"; }
    if (flatPref === "1") { flat = true; view.zoom = window.innerWidth <= 640 ? 2 : 1; $("flat-btn").setAttribute("aria-pressed", "true"); $("flat-btn").setAttribute("aria-label", "Globe"); setTip($("flat-btn"), "Globe (M)"); }
    if (stored && !needsFine(stored.map)) { loadDiff(stored.map, true); sharedOpen = stored.shared === 2 ? 2 : stored.shared ? 1 : 0; }
    else queueLabels(countries.map(function (c, i) { return i; }));

    refreshPalette();
    layout();
    var satPref = null;
    try { satPref = localStorage.getItem(STORE_SAT); } catch (e) { }
    if (satPref === "1") setSatellite(true);
    renderPanel();
    scheduleRender();
    var ready = Promise.resolve(true), fineDone = false, shownAt = performance.now();
    if (finePref === "1" || (stored && needsFine(stored.map))) {
      ready = loadFine().then(function (ok) {
        if (ok && finePref === "1") { ui.fine = true; arcsDirty = true; }
        if (ok && stored && needsFine(stored.map)) { loadDiff(stored.map, true); sharedOpen = stored.shared === 2 ? 2 : stored.shared ? 1 : 0; }
        renderPanel(); scheduleRender();
      });
    }
    ready.then(function () { fineDone = true; }, function () { fineDone = true; });
    ready.then(openSharedFromHash).then(scheduleChecks);
    loadRivers();
    var settled = function () {
      return fineDone && labelQueue.size === 0 && (!ui.rivers || riversDone)
        && (!ui.terrain || ui.satellite || (reliefTried && (!relief || relief.ready())))
        && (!ui.satellite || !sat || sat.ready());
    };
    var reveal = function () {
      var l = $("load");
      if (!l) return;
      l.classList.add("is-gone");
      bar.classList.add("is-ruled");
      setTimeout(function () { if (l.isConnected) l.remove(); }, 1000);
    };
    (function wait() {
      if (settled() || performance.now() - shownAt > 8000) requestAnimationFrame(function () { requestAnimationFrame(reveal); });
      else setTimeout(wait, 120);
    })();
  }

  var darkMedia = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function currentStyle() {
    var r = document.documentElement;
    return r.getAttribute("data-uc-style") === "antique" ? "antique" : r.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }
  function applyStyle(st) {
    var r = document.documentElement;
    if (st === "antique") { r.setAttribute("data-uc-style", "antique"); r.setAttribute("data-theme", "light"); }
    else { r.removeAttribute("data-uc-style"); r.setAttribute("data-theme", st === "dark" ? "dark" : "light"); }
  }
  function setStyle(st) {
    applyStyle(st);
    try {
      if (st === "antique") localStorage.setItem(STORE_STYLE, "antique");
      else { localStorage.setItem(STORE_STYLE, "plain"); localStorage.setItem("ndl-theme", st); }
    } catch (e) { }
  }
  function syncStyle() {
    var t = null, st = null;
    try { t = localStorage.getItem("ndl-theme"); st = localStorage.getItem(STORE_STYLE); } catch (e) { }
    st = st !== "plain" ? "antique" : t === "dark" || t === "light" ? t : darkMedia && darkMedia.matches ? "dark" : "light";
    if (st !== currentStyle()) applyStyle(st);
  }
  function styleChanged() {
    var bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    if (bg) document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) { m.setAttribute("content", bg); });
    var faces = ["400", "italic 400"].map(function (w) { return w + " 20px 'IM Fell English'"; });
    if (pal.antique && document.fonts && document.fonts.load && !faces.every(function (f) { return document.fonts.check(f); })) {
      Promise.all(faces.map(function (f) { return document.fonts.load(f); })).then(remeasure, function () { });
    }
  }
  document.querySelectorAll("#style-seg button").forEach(function (b) {
    b.addEventListener("click", function () { if (b.dataset.style !== currentStyle()) setStyle(b.dataset.style); });
  });
  window.addEventListener("storage", function (e) { if (e.key === "ndl-theme" || e.key === STORE_STYLE) syncStyle(); });
  window.addEventListener("pageshow", syncStyle);
  if (darkMedia && darkMedia.addEventListener) darkMedia.addEventListener("change", syncStyle);

  function setBare(on) {
    ui.bare = !!on;
    closeMenus(null);
    document.body.classList.toggle("is-bare", ui.bare);
    var b = $("ui-btn");
    b.setAttribute("aria-pressed", String(ui.bare));
    b.setAttribute("aria-label", ui.bare ? "Show the interface" : "Hide the interface");
    setTip(b, ui.bare ? "Show the interface (H)" : "Hide the interface (H)");
    hideTip();
    layout();
    scheduleRender();
  }
  $("ui-btn").addEventListener("click", function () { setBare(!ui.bare); });
  window.addEventListener("resize", function () { layout(); scheduleRender(); });
  window.addEventListener("hashchange", openSharedFromHash);
  new MutationObserver(function () { refreshPalette(); styleChanged(); renderPanel(); scheduleRender(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-uc-style"] });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () {
    widthCache.clear(); glyphCache.clear();
    cities.forEach(function (c) { c.w = 0; });
    if (feats) queueLabels(countries.map(function (c, i) { return i; }));
    scheduleRender();
  });

  var HISTORIAN = "https://kigvciyyjlgjcgnwgrwf.supabase.co/functions/v1/dynamic-endpoint", STORE_HISTORY = "uchronia-history";
  var places = new Map(), historyBusy = false, historyKey = "";
  function listOf(names, max) {
    var uniq = Array.from(new Set(names));
    if (uniq.length <= max) return uniq.join(", ");
    return uniq.slice(0, max).join(", ") + " and " + (uniq.length - max) + " more";
  }
  function addPlace(name, lon, lat, zoom) { if (name && !places.has(name) && isFinite(lon) && isFinite(lat)) places.set(name, { lon: lon, lat: lat, zoom: zoom }); }
  function plainName(t) {
    return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\u2018\u2019`]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
  }
  var regionIndex = null;
  function regionsNamed(bc, name) {
    if (!regionIndex) {
      regionIndex = new Map();
      var add = function (k, p) { if (!regionIndex.has(k)) regionIndex.set(k, []); if (regionIndex.get(k).indexOf(p) < 0) regionIndex.get(k).push(p); };
      for (var p = 0; p < nProv; p++) {
        var o = base.provOwner[p];
        if (o < 0) continue;
        add(o + "|" + plainName(provName[p]), p);
        if (provGroup[p] >= 0) add(o + "|" + plainName(groupName[provGroup[p]]), p);
      }
    }
    return regionIndex.get(bc + "|" + plainName(name)) || [];
  }
  function applyPlan(plan) {
    freshGroups();
    var ops = [], caps = capOwners(), touched = new Set(), made = [], missed = 0, moved = 0;
    var alias = new Map(), rulers = new Map();
    var findNow = function (name) {
      var n = plainName(name), hit = -1;
      if (!n) return -1;
      if (/^(unclaimed|no one|nobody|none|terra nullius)$/.test(n)) return UNCLAIMED;
      if (alias.has(n)) return alias.get(n);
      countries.forEach(function (c, i) { if (hit < 0 && c.alive && plainName(c.name) === n) hit = i; });
      if (hit < 0) base.countries.forEach(function (b, i) { if (hit < 0 && plainName(b.name) === n && countries[i] && countries[i].alive) hit = i; });
      return hit < 0 ? null : hit;
    };
    var findBase = function (name) {
      var n = plainName(name), hit = -1;
      base.countries.forEach(function (b, i) { if (hit < 0 && plainName(b.name) === n) hit = i; });
      if (hit < 0) countries.forEach(function (c, i) { if (hit < 0 && i < base.countries.length && c.alive && plainName(c.name) === n) hit = i; });
      return hit;
    };
    (plan.new_countries || []).forEach(function (nc) {
      var name = String(nc && nc.name || "").trim().slice(0, 60);
      if (!name || findNow(name) !== null) return;
      var op = createCountry(uniqueName(name), 0);
      ops.push(op); made.push(op);
      alias.set(plainName(name), op.c);
      if (nc.ruler) rulers.set(op.c, String(nc.ruler));
    });
    (plan.renames || []).forEach(function (r) {
      var c = findNow(r && r.country), name = String(r && r.new_name || "").trim().slice(0, 60);
      if (c === null || c < 0 || !name) { missed++; return; }
      var co = countries[c], before = { name: co.name, color: co.color };
      co.name = uniqueName(name, c);
      ops.push({ t: "country", c: c, from: before, to: { name: co.name, color: co.color } });
      alias.set(plainName(name), c); alias.set(plainName(before.name), c);
      touched.add(c);
    });
    countriesVersion++;
    var next = new Map(), pieceTo = new Map();
    (plan.transfers || []).forEach(function (t) {
      var to = findNow(t && t.to), from = findBase(t && t.from);
      if (to === null || from < 0) { missed++; return; }
      if (t.whole) {
        for (var p = 0; p < nProv; p++) if (base.provOwner[p] === from) (provUnits[p] || []).forEach(function (u) { next.set(u, to); });
        var now = findNow(base.countries[from].name);
        if (now !== null && now >= 0) pieces.forEach(function (pc) { if (pc.owner === now) pieceTo.set(pc.id, to); });
        moved++;
        return;
      }
      (t.regions || []).forEach(function (name) {
        var ps = regionsNamed(from, name);
        if (!ps.length) { missed++; return; }
        ps.forEach(function (p) { (provUnits[p] || []).forEach(function (u) { next.set(u, to); }); });
        moved++;
      });
    });
    var ps = [], fr = [], tv = [];
    next.forEach(function (to, u) { if (owner[u] !== to) { ps.push(u); fr.push(owner[u]); tv.push(to); touched.add(owner[u]); touched.add(to); owner[u] = to; } });
    if (ps.length) ops.push({ t: "own", ps: ps, from: fr, to: tv, g: geomGen });
    if (pieceTo.size) {
      var before = pieces;
      pieces = pieces.map(function (pc) { if (!pieceTo.has(pc.id) || pieceTo.get(pc.id) === pc.owner) return pc; touched.add(pc.owner); touched.add(pieceTo.get(pc.id)); return withOwner(pc, pieceTo.get(pc.id)); });
      ops.push({ t: "pieces", from: before, to: pieces });
      piecesChanged();
    }
    touchShapes(Array.from(touched).concat([UNCLAIMED]));
    ownersChanged(Array.from(touched));
    freshGroups();
    made.forEach(function (op) {
      var co = countries[op.c];
      co.color = freeColor(neighbourCountries(unitsOf[op.c] || []), closeCountries(unitsOf[op.c] || []));
      op.to.color = co.color;
    });
    var subj = [];
    rulers.forEach(function (name, c) { subj.push([c, name]); });
    (plan.subjects || []).forEach(function (k) {
      var c = findNow(k && k.country);
      if (c === null || c < 0) { missed++; return; }
      subj.push([c, String(k.ruler || "")]);
    });
    subj.forEach(function (k) {
      var c = k[0], r = k[1].trim() ? findNow(k[1]) : -1, co = countries[c], was = isInt(co.ruler) ? co.ruler : -1;
      if (r === null) { missed++; return; }
      if (r === c || (r >= 0 && rules(c, r)) || r === was) return;
      co.ruler = r;
      ops.push({ t: "ruler", c: c, from: was, to: r });
      if (r < 0) { groupsDirty = true; recolorFreed(c, was, ops); }
      touched.add(c);
    });
    if (subj.length) { groupsDirty = true; freshGroups(); }
    demoteCaptured(caps, ops);
    (plan.capitals || []).forEach(function (k) {
      var c = findNow(k && k.country), name = String(k && k.city || "").trim().slice(0, 60);
      if (c === null || c < 0 || !name) { missed++; return; }
      var n = plainName(name), city = null;
      cities.forEach(function (x) { if (plainName(x.name) === n && cityOwner(x) === c) city = x; });
      var at = isFinite(k.lon) && isFinite(k.lat) && Math.abs(k.lat) <= 90 ? unitOfPoint(wrap180(k.lon), k.lat, true) : -1;
      if (!city && (at < 0 || owner[at] !== c)) { missed++; return; }
      cities.forEach(function (x) {
        if (x === city || !x.cap || cityOwner(x) !== c) return;
        var was = citySnapshot(x);
        x.cap = 0; x.w = 0;
        ops.push({ t: "city", id: x.id, from: was, to: citySnapshot(x) });
      });
      if (city) {
        if (city.cap) return;
        var was = citySnapshot(city);
        city.cap = 1; city.tier = Math.min(city.tier, 2); city.w = 0;
        ops.push({ t: "city", id: city.id, from: was, to: citySnapshot(city) });
        return;
      }
      var id = "u" + (++citySeq), v = { name: name, lon: wrap180(k.lon), lat: k.lat, tier: 2, cap: 1 };
      setCityState(id, v);
      ops.push({ t: "city", id: id, from: null, to: v });
    });
    sortCities();
    made.forEach(function (op) { var capOp = chooseCapital(op.c); if (capOp) ops.push(capOp); });
    var fresh = new Set(ops.filter(function (op) { return op.t === "country" && !op.from; }).map(function (op) { return op.c; }));
    if (!ps.length && !pieceTo.size && !ops.some(function (op) { return !fresh.has(op.c) || (op.t !== "country" && op.t !== "ruler"); })) {
      ops.forEach(function (op) { if (op.t === "ruler") countries[op.c].ruler = op.from; });
      for (var i = ops.length - 1; i >= 0; i--) if (ops[i].t === "country" && !ops[i].from) countries[ops[i].c].alive = false;
      return null;
    }
    var step = pushStep("Redrawing the map", ops);
    queueLabels(Array.from(touched).concat(made.map(function (op) { return op.c; })));
    ui.country = -1; ui.region = -1; ui.piece = null; ui.city = null;
    changed();
    return { step: step, moved: moved, missed: missed, made: made.length, units: ps };
  }
  function describeChanges() {
    if (!feats || !base) return "";
    freshGroups();
    places = new Map();
    var lines = [], baseHas = new Set(base.provOwner), oldName = function (o) { return o >= 0 && base.countries[o] ? base.countries[o].name : "no country"; };
    var nowName = function (o) { return o >= 0 && countries[o] && countries[o].alive ? countries[o].name : "unclaimed land"; };
    countries.forEach(function (co, i) {
      var b = base.countries[i], alive = co.alive && hasLand(i);
      if (alive && co.label) addPlace(co.name, co.label.lon, co.label.lat, 0);
      if (!b) { if (alive) lines.push("A new country: " + co.name + "."); return; }
      if (!alive) { if (baseHas.has(i)) lines.push(b.name + " no longer exists."); return; }
      if (co.name !== b.name) lines.push(b.name + " is now called " + co.name + ".");
    });
    countries.forEach(function (co, i) {
      if (!co.alive || !hasLand(i)) return;
      var r = rulerOf(i), b = base.countries[i], br = b && isInt(b.ruler) ? b.ruler : -1;
      if (r === br) return;
      if (r >= 0) lines.push(co.name + " is a subject of " + countries[r].name + ".");
      else if (br >= 0) lines.push(co.name + " rules itself, no longer a subject of " + base.countries[br].name + ".");
    });
    var moves = new Map();
    var move = function (from, to, name, p) {
      var k = from + ">" + to;
      if (!moves.has(k)) moves.set(k, { from: from, to: to, names: [] });
      moves.get(k).names.push(name);
      if (!places.has(name)) { var cen = d3.geoCentroid(geoFull[provUnits[p][0]]); addPlace(name, cen[0], cen[1], 5); }
    };
    for (var p = 0; p < nProv; p++) {
      var us = provUnits[p], bo = base.provOwner[p];
      if (!us || !us.length) continue;
      var now = new Set(us.map(function (u) { return owner[u]; }));
      if (now.size === 1) { var o = owner[us[0]]; if (o !== bo) move(bo, o, provName[p], p); continue; }
      now.forEach(function (o) { if (o !== bo) move(bo, o, "part of " + provName[p], p); });
    }
    moves.forEach(function (m) {
      if (m.to < 0) lines.push("Left unclaimed, once " + oldName(m.from) + ": " + listOf(m.names, 40) + ".");
      else lines.push(nowName(m.to) + " holds, once " + (m.from < 0 ? "unclaimed" : oldName(m.from) + "'s") + ": " + listOf(m.names, 40) + ".");
    });
    pieces.forEach(function (pc) {
      var cover = shapeCover(pc.shape).units, from = new Set(), names = [];
      cover.forEach(function (u) { var q = unitProv[u]; from.add(base.provOwner[q]); names.push(provName[q]); });
      if (from.size === 1 && from.has(pc.owner)) return;
      lines.push("A border drawn by hand gives " + nowName(pc.owner) + " land in " + listOf(names, 6) + ", once " + listOf(Array.from(from).map(oldName), 4) + ".");
    });
    base.cities.forEach(function (b, i) {
      var c = cityIndex.get("b" + i);
      if (!c) { lines.push("The city of " + b.name + " is gone."); return; }
      var bits = [];
      if (c.name !== b.name) bits.push(b.name + " is now called " + c.name);
      if (c.cap && !b.cap) bits.push(c.name + " became a capital");
      if (!c.cap && b.cap) bits.push(c.name + " is no longer a capital");
      if (b.lon !== c.lon || b.lat !== c.lat) bits.push(c.name + " stands somewhere else, in " + nowName(cityOwner(c)));
      if (bits.length) { lines.push(bits.join("; ") + "."); addPlace(c.name, c.lon, c.lat, 0); }
    });
    cities.forEach(function (c) {
      if (c.id.charAt(0) !== "u") return;
      var o = cityOwner(c);
      lines.push("A new " + (c.cap ? "capital" : isTown(c) ? "town" : "city") + ", " + c.name + ", in " + (o === null ? "the sea" : nowName(o)) + ".");
      addPlace(c.name, c.lon, c.lat, 0);
    });
    if (!lines.length) return "";
    var caps = [];
    capitalsBy().forEach(function (list, o) {
      if (!countries[o] || !countries[o].alive) return;
      var named = lines.some(function (l) { return l.indexOf(countries[o].name) >= 0; });
      if (named && list.length) { caps.push(countries[o].name + ": " + list.map(function (c) { addPlace(c.name, c.lon, c.lat, 0); return c.name; }).join(", ")); }
    });
    if (caps.length) lines.push("Capitals today: " + caps.join("; ") + ".");
    var text = lines.join("\n");
    return text.length > 13500 ? text.slice(0, 13500) + "\n(and more)" : text;
  }
  function renderHistory(text) { renderProse($("history-text"), text); }
  function renderProse(box, text) {
    box.textContent = "";
    var para = null;
    text.split("\n").forEach(function (line) {
      var t = line.trim();
      if (!t) { para = null; return; }
      var el;
      if (/^#\s/.test(t)) { el = document.createElement("h3"); el.className = "uc-chron-name"; t = t.replace(/^#\s+/, ""); para = null; }
      else if (/^##\s/.test(t)) { el = document.createElement("h4"); t = t.replace(/^##\s+/, ""); para = null; }
      else if (para) { para.appendChild(document.createTextNode(" ")); el = null; }
      else { el = para = document.createElement("p"); }
      var target = el || para;
      t.split(/(\[\[[^\]]*\]\]?)/).forEach(function (bit) {
        var m = /^\[\[([^\]]*)\]?\]?$/.exec(bit);
        if (!m) { if (bit) target.appendChild(document.createTextNode(bit.replace(/\*\*|__/g, ""))); return; }
        var name = m[1], place = places.get(name);
        if (!place) { target.appendChild(document.createTextNode(name)); return; }
        var a = document.createElement("button");
        a.type = "button"; a.className = "uc-place"; a.textContent = name;
        a.addEventListener("click", function () {
          var c = countries.findIndex(function (co) { return co.alive && co.name === name; });
          if (c >= 0) flyToCountry(c);
          else flyTo(place.lon, place.lat, Math.max(view.zoom, place.zoom || zoomForScale(1600)));
          if (sheetMode) showHistory(false);
        });
        target.appendChild(a);
      });
      if (el) box.appendChild(el);
    });
  }
  function historyStatus(msg) { $("history-status").textContent = msg || ""; $("history-status").hidden = !msg; }
  var STORE_CONVS = "uchronia-histories", CONV_MAX = 30, conv = null, convRead = false;
  function readConvs() {
    try {
      var a = JSON.parse(localStorage.getItem(STORE_CONVS) || "[]");
      return Array.isArray(a) ? a.filter(function (c) { return c && typeof c.id === "string" && typeof c.history === "string" && Array.isArray(c.turns); }) : [];
    } catch (e) { return []; }
  }
  function writeConvs(list) {
    while (true) {
      try { localStorage.setItem(STORE_CONVS, JSON.stringify(list)); return; } catch (e) { if (list.length <= 1) return; list = list.slice(0, -1); }
    }
  }
  function storeConv(c) {
    var list = readConvs().filter(function (x) { return x.id !== c.id; });
    list.unshift(c);
    writeConvs(list.slice(0, CONV_MAX));
    try { localStorage.setItem(STORE_HISTORY, c.id); } catch (e) { }
  }
  function titleOf(text) { var m = /^#\s+(.+)$/m.exec(text || ""); return m ? m[1].trim().slice(0, 120) : "A history"; }
  function currentConv() {
    if (convRead) return conv;
    convRead = true;
    var raw = null;
    try { raw = localStorage.getItem(STORE_HISTORY); } catch (e) { }
    if (!raw) return null;
    var old = null;
    try { old = JSON.parse(raw); } catch (e) { }
    if (old && typeof old === "object" && typeof old.text === "string") {
      conv = { id: Date.now().toString(36), when: Date.now(), title: titleOf(old.text), premise: "", note: "", changes: old.key || "", history: old.text, turns: [], map: null };
      storeConv(conv);
      return conv;
    }
    conv = readConvs().filter(function (c) { return c.id === raw; })[0] || null;
    return conv;
  }
  function sameMap(c) { return !c.map || JSON.stringify(c.map) === JSON.stringify(makeDiff()); }
  function renderTurns(c) {
    var box = $("history-turns");
    box.textContent = "";
    c.turns.forEach(function (t) { addTurn(t.q, t.a); });
  }
  function addTurn(q, a) {
    var box = $("history-turns"), qe = document.createElement("p"), ae = document.createElement("div");
    qe.className = "uc-chron-q"; qe.textContent = q;
    ae.className = "uc-chron-text";
    box.appendChild(qe); box.appendChild(ae);
    if (a) renderProse(ae, a);
    return { q: qe, a: ae };
  }
  function askedOf(c) { return c.asked || (c.premise || "").split("\n")[0] || c.note || ""; }
  function savedOpen() { return !$("history-saved").hidden; }
  function showAsked(q) { var e = $("history-asked"); e.textContent = q || ""; e.hidden = !q || savedOpen(); }
  function showConv(c) {
    describeChanges();
    showAsked(askedOf(c));
    renderHistory(c.history);
    renderTurns(c);
    $("history-chat").hidden = false;
    $("history-chat-status").textContent = "";
    var stale = c.map ? !sameMap(c) : c.changes !== describeChanges();
    historyStatus(stale ? "The map has changed since this was written." : "");
    showAsk(false);
  }
  function showSaved(open) {
    $("history-saved").hidden = !open;
    $("history-saved-btn").setAttribute("aria-expanded", String(open));
    $("history-saved-btn").textContent = open ? "Back" : "Saved";
    if (open) {
      ["history-ask", "history-new", "history-asked", "history-text", "history-chat", "history-status"].forEach(function (id) { $(id).hidden = true; });
      renderSaved();
      return;
    }
    $("history-text").hidden = false;
    $("history-status").hidden = false;
    $("history-asked").hidden = !$("history-asked").textContent;
    if (historyBusy) { showAsk(false); $("history-chat").hidden = busyKind !== "chat"; }
    showHistory(true);
  }
  function renderSaved() {
    var list = readConvs(), ul = $("history-list"), cur = currentConv();
    ul.textContent = "";
    $("history-none").hidden = list.length > 0;
    list.forEach(function (c) {
      var li = document.createElement("li"), b = document.createElement("button"), t = document.createElement("span"), m = document.createElement("span"), del = document.createElement("button");
      b.type = "button"; b.className = "uc-chron-item"; b.disabled = historyBusy;
      t.className = "uc-chron-item-t"; t.textContent = c.title || titleOf(c.history);
      var bits = [new Date(c.when || 0).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })];
      if (askedOf(c)) bits.push(askedOf(c));
      if (c.turns.length) bits.push(c.turns.length + (c.turns.length === 1 ? " question" : " questions"));
      if (cur && cur.id === c.id) { bits.push("open"); b.setAttribute("aria-current", "true"); }
      m.className = "uc-chron-item-m"; m.textContent = bits.join(" · ");
      b.appendChild(t); b.appendChild(m);
      b.addEventListener("click", function () {
        if (historyBusy) return;
        conv = c; convRead = true;
        try { localStorage.setItem(STORE_HISTORY, c.id); } catch (e) { }
        if (!c.map || sameMap(c)) { showSaved(false); return; }
        (needsFine(c.map) ? loadFine() : Promise.resolve(true)).then(function () {
          var step = replaceMap(c.map, "Opening a history's map");
          toast("Its map is back", "Undo", undoIfTop(step));
          toastStep = step;
          showSaved(false);
        });
      });
      del.type = "button"; del.className = "uc-chron-del"; del.textContent = "Delete"; del.disabled = historyBusy;
      del.setAttribute("aria-label", "Delete " + (c.title || "this history"));
      del.addEventListener("click", function () {
        writeConvs(readConvs().filter(function (x) { return x.id !== c.id; }));
        if (conv && conv.id === c.id) { conv = null; try { localStorage.removeItem(STORE_HISTORY); } catch (e) { } }
        renderSaved();
      });
      li.appendChild(b); li.appendChild(del);
      ul.appendChild(li);
    });
  }
  function showHistory(open) {
    $("history").hidden = !open;
    $("history-btn").setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("is-history", open);
    if (!open) return;
    closeMenus(null);
    if (!$("history-saved").hidden) return;
    var changes = describeChanges(), c = currentConv();
    if (!historyBusy) {
      if (c) showConv(c);
      else {
        $("history-text").textContent = ""; $("history-chat").hidden = true;
        showAsked("");
        historyStatus("");
        showAsk(true);
        setMode(changes ? "map" : "turn");
      }
    }
    syncAsk();
  }
  var askMode = "map", busyKind = "";
  var MODES = {
    map: { hint: "", hold: "Optional: where it begins, or what to stress", go: "Write its history", label: "A note for the historian" },
    turn: { hint: "The historian redraws the world from your turning point, then writes its history.", hold: "What if Rome never fell? (a year is welcome)", go: "Redraw the map", label: "A turning point" }
  };
  function setMode(m) {
    askMode = m;
    $("mode-map").setAttribute("aria-pressed", String(m === "map"));
    $("mode-turn").setAttribute("aria-pressed", String(m === "turn"));
    $("history-hint").textContent = m === "map" && !describeChanges() ? "Your map is still our world: change it first, or give a turning point." : MODES[m].hint;
    $("history-input").placeholder = MODES[m].hold;
    $("history-input").setAttribute("aria-label", MODES[m].label);
    $("history-go").textContent = MODES[m].go;
    syncAsk();
  }
  function syncAsk() {
    document.body.classList.toggle("uc-thinking", historyBusy);
    if (savedOpen()) renderSaved();
    $("history-go").disabled = historyBusy || (askMode === "map" && !describeChanges());
    $("history-ask-go").disabled = historyBusy;
  }
  function showAsk(open) {
    $("history-ask").hidden = !open || savedOpen();
    $("history-new").hidden = open || historyBusy || !currentConv() || savedOpen();
    $("history-cancel").hidden = !open || historyBusy || !currentConv();
  }
  function writeHistory(premise, asked) {
    var changes = describeChanges(), note = typeof premise === "string" ? premise : $("history-input").value.trim();
    asked = typeof asked === "string" ? asked : note;
    if (!changes || historyBusy) return;
    historyBusy = true; historyKey = changes; busyKind = "write";
    syncAsk();
    $("history-text").textContent = "";
    $("history-chat").hidden = true;
    showAsked(asked);
    showAsk(false);
    historyStatus("The historian is writing…");
    var text = "", queued = false, done = false;
    var paint = function () { queued = false; renderHistory(text); };
    var finish = function (msg, keep) {
      historyBusy = false; done = true;
      syncAsk();
      historyStatus(msg);
      renderHistory(text);
      if (!text) showAsked("");
      if (!text || (msg && !keep)) showAsk(true);
      if (text && (!msg || keep)) {
        conv = { id: Date.now().toString(36), when: Date.now(), title: titleOf(text), premise: typeof premise === "string" ? premise : "", note: note, asked: asked, changes: changes, history: text, turns: [], map: makeDiff() };
        convRead = true;
        storeConv(conv);
        $("history-input").value = "";
        if (savedOpen()) renderSaved();
        else { showConv(conv); if (msg) historyStatus(msg); }
      }
    };
    fetch(HISTORIAN, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ changes: changes, note: note }) }).then(function (res) {
      if (res.status === 429) return finish("The historian has written all they can for today. Try again tomorrow.");
      if (res.status === 503) return finish("The historian is not taking requests yet.");
      if (!res.ok || !res.body) return finish("The historian could not be reached. Try again in a moment.");
      historyStatus("");
      var reader = res.body.getReader(), dec = new TextDecoder(), buf = "";
      var pump = function () {
        return reader.read().then(function (r) {
          if (r.value) buf += dec.decode(r.value, { stream: true });
          var nl;
          while ((nl = buf.indexOf("\n")) >= 0) {
            var line = buf.slice(0, nl); buf = buf.slice(nl + 1);
            if (!line) continue;
            var ev = null;
            try { ev = JSON.parse(line); } catch (e) { continue; }
            if (ev.t === "text") { text += ev.v; if (!queued) { queued = true; requestAnimationFrame(paint); } }
            else if (ev.t === "end") finish(ev.reason === "refusal" ? "The historian declined to write this one." : ev.reason === "max_tokens" ? "The history ran long and was cut short." : "", ev.reason === "max_tokens");
            else if (ev.t === "error") { if (ev.status) console.warn("historian", ev.status, ev.kind); finish(text ? "The history broke off. Try again." : ev.status === 401 || ev.status === 403 ? "The historian's key was refused." : ev.credit ? "The historian is out of credit." : "The historian could not write this. Try again in a moment."); }
          }
          if (r.done) { if (!done) finish(text ? "" : "The historian could not write this. Try again in a moment."); return; }
          return pump();
        });
      };
      return pump();
    }).catch(function (e) {
      console.warn("historian", e);
      if (!done) finish("The historian could not be reached. Check your connection and try again.");
    });
  }
  $("history-btn").addEventListener("click", function () { showHistory($("history").hidden); });
  $("history-close").addEventListener("click", function () { showHistory(false); $("history-btn").focus(); });
  $("history-go").addEventListener("click", function () { if (askMode === "turn") redrawMap(); else writeHistory(); });
  $("mode-map").addEventListener("click", function () { setMode("map"); });
  $("mode-turn").addEventListener("click", function () { setMode("turn"); });
  $("history-new").addEventListener("click", function () {
    $("history-text").textContent = ""; $("history-chat").hidden = true;
    showAsked(""); historyStatus("");
    showAsk(true); setMode(describeChanges() ? "map" : "turn"); $("history-input").focus();
  });
  $("history-cancel").addEventListener("click", function () { var c = currentConv(); if (c) showConv(c); $("history-new").focus(); });
  $("history-input").addEventListener("keydown", function (e) { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); $("history-go").click(); } });
  function readEvents(res, on) {
    var reader = res.body.getReader(), dec = new TextDecoder(), buf = "";
    var pump = function () {
      return reader.read().then(function (r) {
        if (r.value) buf += dec.decode(r.value, { stream: true });
        var nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          var line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (!line) continue;
          var ev = null;
          try { ev = JSON.parse(line); } catch (e) { continue; }
          on(ev);
        }
        if (r.done) { on({ t: "closed" }); return; }
        return pump();
      });
    };
    return pump();
  }
  function centreOf(units) {
    var x = 0, y = 0, z = 0, step = Math.max(1, Math.floor(units.length / 400));
    for (var i = 0; i < units.length; i += step) {
      var k = units[i] * 4, v = toVec((unitBox[k] + unitBox[k + 2]) / 2, (unitBox[k + 1] + unitBox[k + 3]) / 2);
      x += v[0]; y += v[1]; z += v[2];
    }
    var n = Math.hypot(x, y, z);
    if (!n) return null;
    return [Math.atan2(y / n, x / n) / D2R, Math.asin(z / n) / D2R];
  }
  function redrawMap() {
    var premise = $("history-input").value.trim();
    if (!premise || historyBusy) { if (!premise) $("history-input").focus(); return; }
    historyBusy = true; busyKind = "redraw";
    var asked = performance.now();
    syncAsk();
    $("history-chat").hidden = true;
    $("history-text").textContent = "";
    showAsked(premise);
    showAsk(false);
    historyStatus("The historian is redrawing the map. This can take a minute or two…");
    var done = false;
    var finish = function (msg) {
      if (done) return;
      done = true; historyBusy = false;
      syncAsk();
      historyStatus(msg);
      if (msg) { showAsked(""); showAsk(true); }
    };
    fetch(HISTORIAN, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "redraw", premise: premise }) }).then(function (res) {
      if (res.status === 429) return finish("The historian has done all they can for today. Try again tomorrow.");
      if (res.status === 503) return finish("The historian is not taking requests yet.");
      if (!res.ok || !res.body) return finish("The historian could not be reached. Try again in a moment.");
      return readEvents(res, function (ev) {
        if (done) return;
        if (ev.t === "plan" && ev.plan && ev.plan.declined) return finish("The historian declines to draw that world.");
        if (ev.t === "plan") {
          var r = null, before = makeDiff();
          cancelLasso();
          if (stroke) endStroke();
          cancelCityDrag();
          try { loadDiff({}, true); r = applyPlan(ev.plan || {}); } catch (e) { console.warn("redraw", e); }
          if (r && !describeChanges()) { if (undoStack[undoStack.length - 1] === r.step) undoStack.pop(); r = null; }
          if (r) r.step.ops = [{ t: "replace", from: before, to: makeDiff() }];
          else { loadDiff(before, true); changed(); }
          if (!r) return finish("The historian's map could not be drawn. Try putting it another way.");
          if (r.missed) console.warn("redraw: " + r.missed + " names not found");
          finish("");
          var title = ev.plan && typeof ev.plan.title === "string" ? ev.plan.title.slice(0, 80) : "";
          toast(title ? "The map is redrawn: " + title : "The map is redrawn", "Undo", undoIfTop(r.step), 9000);
          toastStep = r.step;
          var at = centreOf(r.units);
          if (at) flyTo(at[0], at[1]);
          var year = ev.plan && isInt(ev.plan.year) ? ev.plan.year : 0;
          writeHistory(year && year < new Date().getFullYear() ? premise + "\nThe map shows the world in " + (year < 0 ? -year + " BC" : year) + "." : premise, premise);
        } else if (ev.t === "end") finish(ev.reason === "refusal" ? "The historian declined to redraw this one." : ev.reason === "max_tokens" ? "The historian's map ran too long. Try a narrower turning point." : "The historian could not redraw this. Try again in a moment.");
        else if (ev.t === "error") { if (ev.status) console.warn("historian", ev.status, ev.kind); finish(ev.status === 401 || ev.status === 403 ? "The historian's key was refused." : ev.credit ? "The historian is out of credit." : "The historian could not redraw this. Try again in a moment."); }
        else if (ev.t === "closed") finish(performance.now() - asked > 100000 ? "The historian ran out of time on a map this large. Try a smaller part of the world or a narrower turning point." : "The historian could not redraw this. Try again in a moment.");
      });
    }).catch(function (e) {
      console.warn("historian", e);
      finish("The historian could not be reached. Check your connection and try again.");
    });
  }

  function askHistorian() {
    var c = currentConv(), q = $("history-q").value.trim();
    if (!c || historyBusy) return;
    if (!q) { $("history-q").focus(); return; }
    historyBusy = true; busyKind = "chat";
    syncAsk();
    $("history-chat-status").textContent = "The historian is answering…";
    var turn = addTurn(q, ""), text = "", queued = false, done = false, edited = false;
    turn.q.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    $("history-q").value = "";
    var paint = function () { queued = false; renderProse(turn.a, text); };
    var finish = function (msg) {
      if (done) return;
      done = true; historyBusy = false;
      syncAsk();
      $("history-chat-status").textContent = msg || "";
      if (edited) { c.map = makeDiff(); c.changes = describeChanges(); }
      if (text && !msg) {
        renderProse(turn.a, text);
        c.turns.push({ q: q, a: text });
        c.when = Date.now();
        storeConv(c);
        return;
      }
      if (edited) storeConv(c);
      turn.q.remove(); turn.a.remove();
      if (!$("history-q").value) $("history-q").value = q;
    };
    var payload = { mode: "chat", changes: describeChanges() || c.changes, note: c.premise || c.note || "", history: c.history, turns: c.turns.slice(-24), question: q };
    fetch(HISTORIAN, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(function (res) {
      if (res.status === 429) return finish("The historian has answered all they can for today. Try again tomorrow.");
      if (res.status === 413) return finish("This conversation has grown too long to continue. Write a new history to start another.");
      if (res.status === 503) return finish("The historian is not taking requests yet.");
      if (!res.ok || !res.body) return finish("The historian could not be reached. Try again in a moment.");
      $("history-chat-status").textContent = "";
      return readEvents(res, function (ev) {
        if (ev.t === "text") { text += ev.v; if (!queued) { queued = true; requestAnimationFrame(paint); } }
        else if (ev.t === "plan") {
          var r = null;
          try { r = applyPlan(ev.plan || {}); } catch (e) { console.warn("historian edit", e); }
          if (!r) return;
          edited = true;
          r.step.label = "The historian's changes";
          if (r.missed) console.warn("historian edit: " + r.missed + " names not found");
          toast("The historian changed the map", "Undo", undoIfTop(r.step), 9000);
          toastStep = r.step;
          var at = centreOf(r.units);
          if (at) flyTo(at[0], at[1]);
        }
        else if (ev.t === "end") finish(ev.reason === "refusal" ? "The historian declined to answer that." : ev.reason === "max_tokens" ? "" : "");
        else if (ev.t === "error") { if (ev.status) console.warn("historian", ev.status, ev.kind); finish(ev.status === 401 || ev.status === 403 ? "The historian's key was refused." : ev.credit ? "The historian is out of credit." : "The historian could not answer this. Try again in a moment."); }
        else if (ev.t === "closed") finish(text ? "" : "The historian could not answer this. Try again in a moment.");
      });
    }).catch(function (e) {
      console.warn("historian", e);
      finish("The historian could not be reached. Check your connection and try again.");
    });
  }
  $("history-ask-go").addEventListener("click", askHistorian);
  $("history-q").addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); askHistorian(); } });
  $("history-saved-btn").addEventListener("click", function () { showSaved($("history-saved").hidden); });

  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("history").hidden && $("history").contains(document.activeElement)) { showHistory(false); $("history-btn").focus(); } });

  window.__uchronia = {
    ready: function () { return !!feats; },
    ui: ui, view: view,
    countries: function () { return countries; },
    owner: function () { return owner; },
    provinces: function () { return { n: nProv, name: provName, units: nUnit, unitName: unitName, unitProv: unitProv }; },
    cities: function () { return cities; },
    shownCities: function () { return cityScreen.length; },
    townsLoaded: function () { return !!townsLoad; },
    project: function (lon, lat) { setupFrame(); var p = projectLL(lon, lat); return p ? [p[0], p[1]] : null; },
    provinceAt: unitAt,
    lonLatAt: lonLatAt,
    applyPlan: function (plan) { var r = applyPlan(plan); return r ? { moved: r.moved, missed: r.missed, made: r.made, units: r.units.length } : null; },
    setView: function (lon, lat, zoom) { view.lon = lon; view.lat = lat; view.zoom = zoom; applyView(); render(); scheduleRender(); },
    setFlat: function (on) { setFlat(!!on); render(); },
    isFlat: function () { return flat; },
    scale: function () { return flat ? FB.k : projection.scale(); },
    localScale: localScale,
    fillOf: function (c) { return colorOf(c); },
    shownName: function (c) { return shownName(c); },
    soloLines: function () { if (arcsDirty) { freshGroups(); rebuildArcs(); } return soloArcs.length; },
    lakesDrawn: function () { return lakesDrawn; },
    timeRender: function () { var t0 = performance.now(); render(); return performance.now() - t0; },
    profile: function () {
      marks = []; render();
      var out = {}; for (var i = 1; i < marks.length; i++) out[marks[i][0]] = +(marks[i][1] - marks[i - 1][1]).toFixed(1);
      marks = null; return out;
    },
    counts: function () { return feats.map(function (F) { var n = 0; F.forEach(function (f) { f.rings.forEach(function (r) { n += r.n; }); }); return n; }); },
    makeDiff: function () { return makeDiff(); },
    labelsPending: function () { return labelQueue.size; },
    satReady: function () { return !!(sat && sat.ready()); },
    detail: function () { return { rect: detail.rect, ok: detail.ok, failed: detail.failed, off: detail.off, put: detail.put.size, cache: detail.cache.size, source: detail.source }; },
    fine: function () { return { data: fineData, on: ui.fine, units: nUnit }; },
    level: function () { setupFrame(); return levelFor(); },
    detailBorders: function () { return detailGeo ? { key: detailGeo.key, ready: detailGeo.ready, failed: detailGeo.failed } : null; },
    regionGroups: function () { return { name: groupName, provs: groupProvs }; },
    pieces: function () { return pieces.map(function (p) { var s = shapeCover(p.shape); return { id: p.id, owner: p.owner, area: s.area, units: s.units.length, points: p.shape.n }; }); },
    visibleOwner: function (lon, lat) { var u = unitOfPoint(lon, lat, true); if (u < 0) return null; var p = pieceAtLL(lon, lat); return p ? p.owner : owner[u]; },
    countryArea: function (c) { freshGroups(); return countryArea(c); },
    loadFine: loadFine,
    history: function () { return { undo: undoStack.length, redo: redoStack.length }; },
    gridLabels: function () { render(); return gridShown.slice(); },
    changesText: function () { return describeChanges(); },
    independent: function () { if (ui.piece) pieceIndependent(ui.piece); else makeIndependent(ui.region); },
    places: function () { return Array.from(places.keys()); },
    riversShown: function () { return !!rivers && ui.rivers && view.zoom > RIVERS_FROM; },
    riverDetail: function () { return !!riverDetail; },
    issues: function () { return findIssues().map(function (it) { return it.name + ": " + it.note; }); },
    riverCount: function () { return rivers ? rivers.byRank.reduce(function (n, l) { return n + (l ? l.length : 0); }, 0) : 0; },
    lineCounts: function () { freshGroups(); if (arcsDirty) rebuildArcs(); return { prov: provArcs.length, unit: unitArcs.length }; },
    validate: function (d) {
      var keep = makeDiff();
      loadDiff(d, true);
      var out = JSON.stringify(makeDiff().l || []);
      loadDiff(keep, true);
      return out;
    }
  };

  function fetchJSON(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(url + " " + r.status); return r.json(); });
  }
  refreshPalette();
  layout();
  Promise.all([fetchJSON("data/provinces.json"), fetchJSON("data/cities.json")]).then(function (res) { init(res[0], res[1]); }).catch(function (err) {
    $("load").textContent = "The map did not load (" + err.message + "), reload to try again";
    $("load").classList.add("is-failed");
    console.error(err);
  });
})();

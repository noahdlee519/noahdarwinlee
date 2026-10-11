(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var canvas = $("globe");
  var ctx = canvas.getContext("2d");
  var satCanvas = document.createElement("canvas");
  var panel = $("panel");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover)").matches;
  var R_KM = 6371.0088;
  var PALETTE = 10;
  var UNCLAIMED = -1;
  var STORE = "uchronia-map", STORE_PREV = "uchronia-map-previous", STORE_SAT = "uchronia-satellite";
  var FONT = "'Familjen Grotesk', 'Helvetica Neue', Helvetica, Arial, sans-serif";
  var NAME_MAX = 60;

  function toVec(lon, lat) {
    var l = lon * Math.PI / 180, p = lat * Math.PI / 180, c = Math.cos(p);
    return [c * Math.cos(l), c * Math.sin(l), Math.sin(p)];
  }
  function normalize(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }

  var levels = null, feats = null, geoFull = null;
  var nProv = 0, provName = [], provArea = null, provNeighbors = null;
  var arcA = null, arcB = null, arcLines = null;
  var countries = [], owner = null, ownerVersion = 0;
  var cities = [], citySeq = 0;
  var base = null;
  var graticule = null;
  var ui = { tool: "select", country: -1, region: -1, city: null, hover: -1, whole: false, erase: false, satellite: false };

  var projection = d3.geoOrthographic().clipAngle(90).precision(0.35);
  var view = { lon: 15, lat: 30, zoom: 1 };
  var dpr = 1, W = 0, H = 0, baseR = 0, cx = 0, cy = 0;
  var MIN_ZOOM = 0.6, MAX_ZOOM = 40;

  var pick = document.createElement("canvas");
  var pctx = pick.getContext("2d", { willReadFrequently: true });
  var pickDirty = true;

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    satCanvas.width = canvas.width; satCanvas.height = canvas.height;
    var phone = W <= 640;
    var panelW = phone ? 0 : 352 + 2 * 24;
    var sheetH = phone ? Math.min(H * 0.5, panel.getBoundingClientRect().height || 150) : 0;
    var freeW = W - panelW, freeH = H - sheetH - (phone ? 70 : 40);
    cx = phone ? W / 2 : panelW + freeW / 2;
    cy = phone ? (H - sheetH) / 2 + 10 : H / 2;
    baseR = Math.max(80, Math.min(freeW, freeH) / 2 - 16);
    pick.width = W; pick.height = H;
    pickDirty = true;
    applyView();
  }

  function applyView() {
    view.lat = Math.max(-90, Math.min(90, view.lat));
    view.lon = ((view.lon + 540) % 360) - 180;
    view.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, view.zoom));
    projection.rotate([-view.lon, -view.lat, 0]).scale(baseR * view.zoom).translate([cx, cy]);
    pickDirty = true;
  }

  var pal = {}, hatch = null;
  var PAL_KEYS = ["ocean", "grat", "limb", "glow", "border", "prov", "label", "label-halo", "city", "city-ring", "city-label", "city-halo", "select", "select-fill", "hover", "unclaimed", "hatch", "sat-light"];
  function refreshPalette() {
    var cs = getComputedStyle(document.documentElement);
    PAL_KEYS.forEach(function (k) { pal[k] = cs.getPropertyValue("--uc-" + k).trim(); });
    pal.colors = [];
    for (var i = 0; i < PALETTE; i++) pal.colors.push(cs.getPropertyValue("--uc-c" + i).trim() || "#cccccc");
    var c = document.createElement("canvas");
    c.width = c.height = 8;
    var hc = c.getContext("2d");
    hc.strokeStyle = pal.hatch; hc.lineWidth = 1.2; hc.lineCap = "square";
    hc.beginPath(); hc.moveTo(-2, 10); hc.lineTo(10, -2); hc.moveTo(-2, 2); hc.lineTo(2, -2); hc.moveTo(6, 10); hc.lineTo(10, 6); hc.stroke();
    hatch = ctx.createPattern(c, "repeat");
    groupsDirty = true;
    renderSwatches();
  }
  function colorOf(c) {
    var col = countries[c].color;
    return typeof col === "number" ? pal.colors[col % PALETTE] : col;
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
  }
  function moving() {
    interacting = 1;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(function () { interacting = 0; scheduleRender(); }, 140);
    scheduleRender();
  }
  var slow = 0, slowFrames = 0;
  function levelFor() {
    var px = projection.scale();
    var level = px < 900 ? 0 : px < 2600 ? 1 : 2;
    return Math.max(0, level - slow);
  }
  function noteCost(ms) {
    if (slow) return;
    if (ms > 28) { if (++slowFrames >= 6) { slow = 1; pickDirty = true; } } else slowFrames = 0;
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

  function capOf(X, Y, Z, n, sx, sy, sz) {
    var c = Math.hypot(sx, sy, sz) > 1e-9 ? normalize([sx, sy, sz]) : [X[0], Y[0], Z[0]];
    var minDot = 1;
    for (var k = 0; k < n; k++) { var d = c[0] * X[k] + c[1] * Y[k] + c[2] * Z[k]; if (d < minDot) minDot = d; }
    return { cx: c[0], cy: c[1], cz: c[2], radius: Math.acos(Math.max(-1, Math.min(1, minDot))) };
  }
  function prepare(featureList) {
    return featureList.map(function (f) {
      var g = f.geometry;
      var polys = !g ? [] : g.type === "Polygon" ? [g.coordinates] : g.coordinates;
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
      if (!rings.length) return { rings: [], cx: 1, cy: 0, cz: 0, radius: -10 };
      var cap = capOf(all.X, all.Y, all.Z, all.X.length, sx, sy, sz);
      cap.rings = rings;
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
  function traceFeature(c, f) {
    if (!featureInFront(f)) return;
    for (var i = 0; i < f.rings.length; i++) traceRing(c, f.rings[i]);
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
  function traceArcs(c, lines, idx) { for (var i = 0; i < idx.length; i++) traceLine(c, lines[idx[i]]); }

  var groups = [], unclaimedProvs = [], provsOf = [], groupsDirty = true, arcsDirty = true, borderArcs = [], innerArcs = [];
  function rebuildGroups() {
    var map = new Map();
    provsOf = countries.map(function () { return []; });
    unclaimedProvs = [];
    for (var p = 0; p < nProv; p++) {
      var o = owner[p];
      if (o < 0) unclaimedProvs.push(p); else provsOf[o].push(p);
    }
    for (var c = 0; c < countries.length; c++) {
      if (!provsOf[c].length) continue;
      var fill = colorOf(c);
      var g = map.get(fill);
      if (!g) { g = { fill: fill, countries: [] }; map.set(fill, g); }
      g.countries.push(c);
    }
    groups = Array.from(map.values());
    groupsDirty = false;
  }
  var shapeCache = [new Map(), new Map(), new Map()], shapeVersion = new Map();
  var EMPTY_SHAPE = { rings: [], cx: 1, cy: 0, cz: 0, radius: -10 };
  function touchShapes(list) {
    list.forEach(function (c) { shapeVersion.set(c, (shapeVersion.get(c) || 0) + 1); });
  }
  function shapeOf(c, lvl) {
    var m = shapeCache[lvl], s = m.get(c), v = shapeVersion.get(c) || 0;
    if (s && s.v === v) return s.f;
    var ps = c === UNCLAIMED ? unclaimedProvs : provsOf[c];
    var f = EMPTY_SHAPE;
    if (ps && ps.length) {
      var t = levels[lvl], g = t.objects.provinces.geometries;
      var merged = topojson.merge(t, ps.map(function (p) { return g[p]; }));
      f = prepare([{ geometry: merged }])[0];
    }
    m.set(c, { v: v, f: f });
    return f;
  }
  function freshGroups() { if (groupsDirty) rebuildGroups(); }
  function rebuildArcs() {
    borderArcs = []; innerArcs = [];
    for (var a = 0; a < arcA.length; a++) {
      var b = arcB[a];
      if (b < 0) continue;
      (owner[arcA[a]] !== owner[b] ? borderArcs : innerArcs).push(a);
    }
    arcsDirty = false;
  }
  var selCache = { c: -2, v: -1, arcs: [] };
  function selectionArcs(c) {
    if (selCache.c === c && selCache.v === ownerVersion) return selCache.arcs;
    var out = [];
    for (var a = 0; a < arcA.length; a++) {
      var A = arcA[a];
      if (A < 0) continue;
      var b = arcB[a], inA = owner[A] === c, inB = b >= 0 && owner[b] === c;
      if (inA !== inB) out.push(a);
    }
    selCache = { c: c, v: ownerVersion, arcs: out };
    return out;
  }
  function ownersChanged(list) {
    ownerVersion++;
    groupsDirty = true;
    arcsDirty = true;
    if (list) touchShapes(list.concat([UNCLAIMED]));
    else { shapeCache.forEach(function (m) { m.clear(); }); }
  }

  var sat = null, satTried = false;
  function satOn() { return ui.satellite && sat && sat.ready(); }

  var marks = null;
  function mark(name) { if (marks) marks.push([name, performance.now()]); }
  function render() {
    if (!feats) return;
    mark("start");
    basis();
    freshGroups();
    if (arcsDirty) rebuildArcs();
    var lvl = levelFor(), F = feats[lvl], L = arcLines[lvl], r = B.r;
    var satellite = satOn();
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    if (r * 1.07 < Math.hypot(W, H)) {
      var glow = ctx.createRadialGradient(cx, cy, r, cx, cy, r * 1.07);
      glow.addColorStop(0, pal.glow); glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.07, 0, 2 * Math.PI); ctx.arc(cx, cy, r, 0, 2 * Math.PI, true); ctx.fill();
    }
    if (satellite) {
      sat.draw({ e: [B.ex, B.ey, B.ez], n: [B.nx, B.ny, B.nz], c: [B.cx, B.cy, B.cz], cx: cx, cy: cy, r: r, dpr: dpr, light: parseFloat(pal["sat-light"]) || 0 });
      ctx.drawImage(satCanvas, 0, 0, W, H);
    }
    if (!satellite) {
      ctx.fillStyle = pal.ocean;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.fill();
      ctx.beginPath(); traceArcs(ctx, graticule, graticuleIdx);
      ctx.strokeStyle = pal.grat; ctx.lineWidth = 0.6; ctx.stroke();
    }

    mark("sea");
    ctx.globalAlpha = satellite ? 0.34 : 1;
    for (var g = 0; g < groups.length; g++) {
      var list = groups[g].countries;
      ctx.beginPath();
      for (var i = 0; i < list.length; i++) traceFeature(ctx, shapeOf(list[i], lvl));
      ctx.fillStyle = groups[g].fill; ctx.fill();
    }
    if (unclaimedProvs.length) {
      ctx.beginPath(); traceFeature(ctx, shapeOf(UNCLAIMED, lvl));
      ctx.fillStyle = pal.unclaimed; ctx.fill();
      ctx.fillStyle = hatch; ctx.fill();
    }
    ctx.globalAlpha = 1;
    mark("fills");

    drawHover(F);
    drawSelectionFill(F);
    mark("overlays");

    var pa = provAlpha(r);
    if (pa > 0) {
      ctx.beginPath(); traceArcs(ctx, L, innerArcs);
      ctx.globalAlpha = pa; ctx.setLineDash([1.5, 3]); ctx.lineCap = "round";
      ctx.strokeStyle = satellite ? "rgba(255,255,255,0.55)" : pal.prov; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.setLineDash([]); ctx.lineCap = "butt"; ctx.globalAlpha = 1;
    }
    mark("provlines");
    ctx.beginPath(); traceArcs(ctx, L, borderArcs);
    ctx.strokeStyle = satellite ? "rgba(255,255,255,0.9)" : pal.border; ctx.lineWidth = satellite ? 1.3 : 1.1; ctx.lineJoin = "round"; ctx.stroke();
    drawSelectionLine(L);

    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = pal.limb; ctx.lineWidth = 1; ctx.stroke();

    mark("borders");
    var placed = [];
    drawLabels(placed, satellite);
    mark("labels");
    drawCities(placed, satellite);
    mark("cities");
    ctx.restore();
  }
  var graticuleIdx = [];

  function provAlpha(r) {
    var from = ui.tool === "paint" ? 330 : 650, span = 450;
    return clamp01((r - from) / span);
  }

  function brush() {
    if (ui.tool !== "paint") return null;
    if (ui.erase) return UNCLAIMED;
    return ui.country >= 0 && countries[ui.country] && countries[ui.country].alive ? ui.country : null;
  }
  function drawHover(F) {
    var p = ui.hover;
    if (p < 0 || drag || stroke || cityDrag) return;
    if (ui.tool === "paint") {
      var to = brush();
      if (to === null || owner[p] === to) return;
      var list = ui.whole && owner[p] >= 0 ? provsOf[owner[p]] : [p];
      ctx.beginPath();
      for (var i = 0; i < list.length; i++) traceFeature(ctx, F[list[i]]);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = to >= 0 ? colorOf(to) : pal.unclaimed; ctx.fill();
      if (to < 0) { ctx.fillStyle = hatch; ctx.fill(); }
      ctx.globalAlpha = 1;
      ctx.setLineDash([3, 3]); ctx.strokeStyle = pal.select; ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]);
    } else if (ui.tool === "select") {
      var o = owner[p];
      if (o < 0 || o === ui.country) return;
      ctx.beginPath();
      provsOf[o].forEach(function (q) { traceFeature(ctx, F[q]); });
      ctx.fillStyle = pal.hover; ctx.fill();
    }
  }
  function currentCountry() {
    var c = ui.country;
    return c >= 0 && countries[c] && countries[c].alive ? c : -1;
  }
  function drawSelectionFill(F) {
    var c = currentCountry();
    if (c < 0 || ui.tool !== "select" || ui.city) return;
    ctx.beginPath();
    provsOf[c].forEach(function (q) { traceFeature(ctx, F[q]); });
    ctx.fillStyle = pal["select-fill"]; ctx.fill();
  }
  function drawSelectionLine(L) {
    var c = currentCountry();
    if (c < 0 || ui.city || (ui.tool === "paint" && ui.erase)) return;
    ctx.beginPath(); traceArcs(ctx, L, selectionArcs(c));
    ctx.strokeStyle = pal.select; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();
  }

  var widthCache = new Map();
  function unitWidth(text) {
    var w = widthCache.get(text);
    if (w == null) {
      ctx.font = "500 100px " + FONT;
      ctx.letterSpacing = "16px";
      w = ctx.measureText(text).width / 100;
      ctx.letterSpacing = "0px";
      widthCache.set(text, w);
    }
    return w;
  }
  var labelOrder = [];
  function drawLabels(placed, satellite) {
    var r = B.r, kmPx = r / R_KM;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    for (var k = 0; k < labelOrder.length; k++) {
      var c = labelOrder[k], co = countries[c];
      if (!co || !co.alive || !co.label || !provsOf[c] || !provsOf[c].length) continue;
      var L = co.label;
      var d = L.v[0] * B.cx + L.v[1] * B.cy + L.v[2] * B.cz;
      if (d < 0.2) continue;
      var px = cx + r * (L.v[0] * B.ex + L.v[1] * B.ey + L.v[2] * B.ez);
      var py = cy - r * (L.v[0] * B.nx + L.v[1] * B.ny + L.v[2] * B.nz);
      if (px < -200 || px > W + 200 || py < -60 || py > H + 60) continue;
      var name = co.name.trim().toUpperCase();
      if (!name) continue;
      var fore = Math.sqrt(d);
      var availW = Math.min(L.w * 0.92, Math.max(L.r * 2.4, L.w * 0.5)) * kmPx * fore;
      var availH = Math.max(L.r * 1.8, L.h * 0.42) * kmPx * fore;
      var lines = [name];
      var f = Math.min(30, availW / unitWidth(name), availH * 0.6);
      if (f < 10 && name.indexOf(" ") > 0) {
        var split = bestSplit(name);
        var f2 = Math.min(30, availW / Math.max(unitWidth(split[0]), unitWidth(split[1])), availH * 0.3);
        if (f2 > f * 1.25) { lines = split; f = f2; }
      }
      if (f < 8.5) continue;
      var w = 0;
      for (var i = 0; i < lines.length; i++) w = Math.max(w, unitWidth(lines[i]) * f);
      var h = f * 1.18 * lines.length;
      var box = { x: px - w / 2 - 3, y: py - h / 2 - 2, w: w + 6, h: h + 4 };
      if (collides(placed, box)) continue;
      placed.push(box);
      var spacing = f * 0.16;
      ctx.font = "500 " + f.toFixed(1) + "px " + FONT;
      ctx.letterSpacing = spacing.toFixed(2) + "px";
      ctx.lineWidth = Math.max(2, f * 0.22);
      ctx.strokeStyle = satellite ? "rgba(0,0,0,0.5)" : pal["label-halo"];
      ctx.fillStyle = satellite ? "rgba(255,255,255,0.94)" : pal.label;
      for (i = 0; i < lines.length; i++) {
        var ly = py + (i - (lines.length - 1) / 2) * f * 1.18;
        ctx.strokeText(lines[i], px + spacing / 2, ly);
        ctx.fillText(lines[i], px + spacing / 2, ly);
      }
    }
    ctx.letterSpacing = "0px";
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
  function collides(placed, b) {
    for (var i = 0; i < placed.length; i++) {
      var q = placed[i];
      if (b.x < q.x + q.w && b.x + b.w > q.x && b.y < q.y + q.h && b.y + b.h > q.y) return true;
    }
    return false;
  }

  function cityDot() { var r = B.r; return r < 900 ? 1.7 : r < 2600 ? 2.2 : 2.7; }
  function tierFor(r) { return r >= 2200 ? 4 : r >= 1300 ? 3 : r >= 850 ? 2 : r >= 560 ? 1 : 0; }
  var cityScreen = [];
  function drawCities(placed, satellite) {
    cityScreen = [];
    if (!cities.length) return;
    var r = B.r, show = tierFor(r) + (ui.tool === "city" ? 1 : 0), dot = cityDot();
    var ex = B.ex, ey = B.ey, ez = B.ez, nx = B.nx, ny = B.ny, nz = B.nz, vx = B.cx, vy = B.cy, vz = B.cz;
    var pad = 3, shown = [];
    for (var i = 0; i < cities.length; i++) {
      var c = cities[i];
      var must = c === ui.city || (cityDrag && cityDrag.city === c);
      if (c.tier > show && !must) continue;
      var sz = c.x * vx + c.y * vy + c.z * vz;
      if (sz <= 0.02) continue;
      var px = cx + r * (c.x * ex + c.y * ey + c.z * ez), py = cy - r * (c.x * nx + c.y * ny + c.z * nz);
      if (px < -20 || py < -20 || px > W + 20 || py > H + 20) continue;
      ctx.font = (c.cap ? "500 12px " : "400 11px ") + FONT;
      if (!c.w) c.w = ctx.measureText(c.name).width;
      var off = dot + (c.cap ? 6 : 4);
      var box = { x: px + off - pad, y: py - 7, w: c.w + pad * 2, h: 14 };
      if (!must && collides(placed, box)) continue;
      placed.push(box);
      shown.push({ c: c, x: px, y: py, off: off });
    }
    ctx.lineWidth = 1.2;
    for (i = 0; i < shown.length; i++) {
      var s = shown[i];
      if (s.c.cap) {
        var hs = dot + 2.2;
        ctx.fillStyle = pal.city; ctx.strokeStyle = pal["city-ring"];
        ctx.beginPath(); ctx.rect(s.x - hs, s.y - hs, hs * 2, hs * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = pal["city-ring"];
        ctx.beginPath(); ctx.arc(s.x, s.y, dot * 0.85, 0, 2 * Math.PI); ctx.fill();
      } else {
        ctx.fillStyle = pal.city; ctx.strokeStyle = pal["city-ring"];
        ctx.beginPath(); ctx.arc(s.x, s.y, dot, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      }
      if (s.c === ui.city) {
        ctx.strokeStyle = pal.select; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(s.x, s.y, dot + 6, 0, 2 * Math.PI); ctx.stroke();
        ctx.lineWidth = 1.2;
      }
      cityScreen.push(s);
    }
    ctx.textBaseline = "middle"; ctx.textAlign = "left";
    ctx.lineJoin = "round"; ctx.lineWidth = 3;
    ctx.strokeStyle = satellite ? "rgba(0,0,0,0.7)" : pal["city-halo"];
    for (i = 0; i < shown.length; i++) {
      s = shown[i];
      ctx.font = (s.c.cap ? "500 12px " : "400 11px ") + FONT;
      ctx.strokeText(s.c.name, s.x + s.off, s.y);
      ctx.fillStyle = pal["city-label"]; ctx.fillText(s.c.name, s.x + s.off, s.y);
    }
  }
  function cityAt(x, y, touch) {
    var best = null, bestD = touch ? 18 : 9;
    for (var i = 0; i < cityScreen.length; i++) {
      var d = Math.hypot(cityScreen[i].x - x, cityScreen[i].y - y);
      if (d < bestD) { bestD = d; best = cityScreen[i].c; }
    }
    return best;
  }
  function sortCities() {
    cities.sort(function (a, b) { return a.tier - b.tier || b.cap - a.cap; });
  }

  function visible(lonlat) {
    var rot = projection.rotate();
    return d3.geoDistance(lonlat, [-rot[0], -rot[1]]) < Math.PI / 2 - 1e-6;
  }
  function lonLatAt(x, y) {
    var ll = projection.invert([x, y]);
    return ll && isFinite(ll[0]) && visible(ll) ? ll : null;
  }

  function renderPick() {
    basis();
    var F = feats[levelFor()];
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.clearRect(0, 0, W, H);
    for (var p = 0; p < nProv; p++) {
      var f = F[p];
      if (!featureInFront(f)) continue;
      var code = p + 1;
      pctx.fillStyle = "rgb(" + (code & 255) + "," + ((code >> 8) & 255) + "," + ((code >> 16) & 255) + ")";
      pctx.beginPath(); traceFeature(pctx, f); pctx.fill();
    }
    pickDirty = false;
  }
  function provinceAt(x, y) {
    if (!feats) return -1;
    var ll = lonLatAt(x, y);
    if (!ll) return -1;
    if (pickDirty) renderPick();
    var tried = {};
    for (var dy = 0; dy <= 2; dy++) {
      for (var dx = 0; dx <= 2; dx++) {
        var px = Math.round(x) + (dx === 2 ? -1 : dx), py = Math.round(y) + (dy === 2 ? -1 : dy);
        if (px < 0 || py < 0 || px >= W || py >= H) continue;
        var d = pctx.getImageData(px, py, 1, 1).data;
        if (d[3] === 0) continue;
        var idx = (d[0] | (d[1] << 8) | (d[2] << 16)) - 1;
        if (idx < 0 || idx >= nProv || tried[idx]) continue;
        tried[idx] = true;
        if (d3.geoContains(geoFull[idx], ll)) return idx;
      }
    }
    return -1;
  }

  var labelQueue = new Set(), labelTimer = 0;
  function queueLabels(list) {
    list.forEach(function (c) { if (c >= 0) labelQueue.add(c); });
    clearTimeout(labelTimer);
    labelTimer = setTimeout(runLabels, 90);
  }
  function runLabels() {
    freshGroups();
    var t0 = performance.now();
    while (labelQueue.size && performance.now() - t0 < 14) {
      var c = labelQueue.values().next().value;
      labelQueue.delete(c);
      if (!countries[c]) continue;
      try { computeLabel(c); } catch (e) { countries[c].label = null; }
    }
    sortLabels();
    scheduleRender();
    if (labelQueue.size) labelTimer = setTimeout(runLabels, 0);
  }
  function sortLabels() {
    labelOrder = [];
    for (var c = 0; c < countries.length; c++) if (countries[c].label) labelOrder.push(c);
    labelOrder.sort(function (a, b) { return countries[b].label.area - countries[a].label.area; });
  }
  function computeLabel(c) {
    var ps = provsOf[c];
    if (!countries[c].alive || !ps || !ps.length) { countries[c].label = null; return; }
    var topo = levels[1], geoms = topo.objects.provinces.geometries;
    var merged = topojson.merge(topo, ps.map(function (p) { return geoms[p]; }));
    var best = null, bestA = 0;
    merged.coordinates.forEach(function (poly) {
      var a = d3.geoArea({ type: "Polygon", coordinates: poly });
      if (a > 2 * Math.PI) a = 4 * Math.PI - a;
      if (a > bestA) { bestA = a; best = poly; }
    });
    if (!best) {
      var p0 = ps[0], g0 = geoFull[p0];
      var cen0 = d3.geoCentroid(g0);
      countries[c].label = { v: toVec(cen0[0], cen0[1]), r: 5, w: 10, h: 10, area: 0 };
      return;
    }
    var cen = d3.geoCentroid({ type: "Polygon", coordinates: best });
    var proj = d3.geoAzimuthalEquidistant().rotate([-cen[0], -cen[1]]).scale(R_KM).translate([0, 0]);
    var rings = best.map(function (ring) { return ring.map(function (pt) { return proj(pt); }); });
    var pl = polylabel(rings);
    var ll = proj.invert([pl[0], pl[1]]);
    countries[c].label = { v: toVec(ll[0], ll[1]), r: pl[2], w: pl[3], h: pl[4], area: bestA * R_KM * R_KM };
  }
  function polylabel(rings) {
    var ext = rings[0], minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < ext.length; i++) {
      var p = ext[i];
      if (p[0] < minX) minX = p[0]; if (p[1] < minY) minY = p[1];
      if (p[0] > maxX) maxX = p[0]; if (p[1] > maxY) maxY = p[1];
    }
    var w = maxX - minX, h = maxY - minY, size = Math.min(w, h);
    if (!(size > 0)) return [minX, minY, 0, w, h];
    var precision = Math.max(w, h) / 120;
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
    while (heap.length && guard++ < 4000) {
      var c = pop();
      if (c.d > best.d) best = c;
      if (c.max - best.d <= precision) continue;
      half = c.h / 2;
      push(cell(c.x - half, c.y - half, half));
      push(cell(c.x + half, c.y - half, half));
      push(cell(c.x - half, c.y + half, half));
      push(cell(c.x + half, c.y + half, half));
    }
    return [best.x, best.y, Math.max(0, best.d), w, h];
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
  var focusByPointer = false;
  canvas.addEventListener("focus", function () { canvas.classList.toggle("show-ring", !focusByPointer); });
  canvas.addEventListener("blur", function () { canvas.classList.remove("show-ring"); });
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  canvas.addEventListener("mousedown", function (e) { if (e.button === 1) e.preventDefault(); });
  function degPerPx() { return 180 / (Math.PI * projection.scale()); }
  function dist(p, q) { return Math.hypot(p.x - q.x, p.y - q.y); }

  canvas.addEventListener("pointerdown", function (e) {
    var mouse = e.pointerType === "mouse";
    if (mouse && e.button > 2) return;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    stopInertia(); stopFly(); hideTip();
    if (pointers.size === 2) {
      if (stroke) endStroke();
      cityDrag = null; drag = null;
      canvas.classList.remove("is-dragging");
      var pts = Array.from(pointers.values());
      pinch = { d: dist(pts[0], pts[1]), zoom: view.zoom, mx: (pts[0].x + pts[1].x) / 2, my: (pts[0].y + pts[1].y) / 2 };
      return;
    }
    if (pointers.size > 2) return;
    if (mouse) { focusByPointer = true; canvas.focus({ preventScroll: true }); focusByPointer = false; }
    var turn = mouse && (e.button !== 0 || e.shiftKey || spaceDown);
    if (!turn && ui.tool !== "paint") {
      var c = cityAt(e.clientX, e.clientY, !mouse);
      if (c) { cityDrag = { city: c, x: e.clientX, y: e.clientY, moved: false, from: citySnapshot(c) }; return; }
    }
    if (!turn && ui.tool === "paint" && mouse) {
      if (e.altKey) { pickUp(e.clientX, e.clientY); return; }
      startStroke(e.clientX, e.clientY);
      return;
    }
    drag = { x: e.clientX, y: e.clientY, lon: view.lon, lat: view.lat, moved: false, turnOnly: turn,
      lastT: performance.now(), lastX: e.clientX, lastY: e.clientY, vx: 0, vy: 0, alt: e.altKey };
    canvas.classList.add("is-dragging");
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
      applyView();
      zoomAt(pinch.zoom * nd / pinch.d, mx, my, true);
      moving();
      return;
    }
    if (cityDrag) {
      if (!cityDrag.moved && Math.hypot(e.clientX - cityDrag.x, e.clientY - cityDrag.y) < 4) return;
      cityDrag.moved = true;
      var ll = lonLatAt(e.clientX, e.clientY);
      if (ll) placeCity(cityDrag.city, ll[0], ll[1]);
      scheduleRender();
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
      if (e.type === "pointercancel") { if (cd.moved) restoreCity(cd.city, cd.from); scheduleRender(); return; }
      if (cd.moved) {
        pushStep("Moving a city", [{ t: "city", id: cd.city.id, from: cd.from, to: citySnapshot(cd.city) }]);
        selectCity(cd.city);
        changed();
      } else selectCity(cd.city);
      return;
    }
    if (stroke) { endStroke(); return; }
    if (!drag) return;
    var d = drag; drag = null;
    canvas.classList.remove("is-dragging");
    if (!d.moved) {
      if (e.type !== "pointercancel" && !d.turnOnly) click(e.clientX, e.clientY, d);
      return;
    }
    var since = performance.now() - d.lastT;
    if (!reduceMotion && since < 60 && Math.hypot(d.vx, d.vy) > 0.02) startInertia(d.vx, d.vy);
    else { interacting = 0; scheduleRender(); }
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("lostpointercapture", function (e) { pointers.delete(e.pointerId); });
  canvas.addEventListener("pointerleave", function () { if (!drag && !stroke && !cityDrag) { setHover(-1); hideTip(); } });

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
    if (Math.hypot(inertia.vx, inertia.vy) < 0.004) { inertia = null; interacting = 0; scheduleRender(); return; }
    scheduleRender();
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
    var p = ll ? provinceAt(x, y) : -1;
    if (p < 0) { ui.country = -1; ui.region = -1; ui.city = null; renderPanel(); scheduleRender(); return; }
    ui.city = null;
    ui.region = p;
    ui.country = owner[p];
    renderPanel();
    scheduleRender();
  }

  function pickUp(x, y) {
    var p = provinceAt(x, y);
    if (p < 0) return;
    if (owner[p] < 0) { ui.erase = true; toast("Painting unclaimed land"); }
    else { ui.erase = false; ui.country = owner[p]; toast("Painting with " + countries[ui.country].name); }
    renderPanel();
    scheduleRender();
  }

  function startStroke(x, y) {
    if (brush() === null) {
      var p = provinceAt(x, y);
      if (p >= 0 && owner[p] >= 0) {
        ui.country = owner[p]; ui.erase = false;
        toast("Painting with " + countries[ui.country].name);
        renderPanel(); scheduleRender();
      }
      return;
    }
    stroke = { x: x, y: y, changes: new Map(), touched: new Set() };
    canvas.classList.add("is-painting");
    paintAt(x, y);
  }
  function paintAt(x, y) {
    var p = provinceAt(x, y);
    if (p < 0) return;
    var to = brush();
    if (to === null) return;
    if (ui.whole && owner[p] >= 0) {
      freshGroups();
      provsOf[owner[p]].slice().forEach(function (q) { assign(q, to); });
    } else assign(p, to);
  }
  function assign(p, to) {
    if (owner[p] === to) return;
    if (!stroke.changes.has(p)) stroke.changes.set(p, owner[p]);
    var was = owner[p];
    stroke.touched.add(was); stroke.touched.add(to);
    owner[p] = to;
    ownersChanged([was, to]);
    scheduleRender();
  }
  function paintAlong(x0, y0, x1, y1) {
    var n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4));
    for (var i = 1; i <= n; i++) paintAt(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n);
  }
  function endStroke() {
    var s = stroke; stroke = null;
    canvas.classList.remove("is-painting");
    if (!s || !s.changes.size) return;
    var ps = [], from = [], to = [];
    s.changes.forEach(function (f, p) { if (owner[p] !== f) { ps.push(p); from.push(f); to.push(owner[p]); } });
    if (!ps.length) return;
    pushStep("Painting", [{ t: "own", ps: ps, from: from, to: to }]);
    queueLabels(Array.from(s.touched));
    changed();
  }

  var hoverRAF = 0, hoverAt = null;
  function hover(x, y) {
    if (!canHover) return;
    hoverAt = [x, y];
    if (hoverRAF) return;
    hoverRAF = requestAnimationFrame(function () {
      hoverRAF = 0;
      var x = hoverAt[0], y = hoverAt[1];
      var city = ui.tool !== "paint" ? cityAt(x, y) : null;
      canvas.classList.toggle("is-over-city", !!city);
      if (city) {
        setHover(-1);
        showTip(x, y, city.name, city.cap ? "Capital" : null, ui.tool === "select" ? "click to edit, drag to move" : "drag to move");
        return;
      }
      var p = provinceAt(x, y);
      setHover(p);
      if (p < 0) { hideTip(); return; }
      var o = owner[p], main = o >= 0 ? countries[o].name : "Unclaimed land";
      var note = null;
      if (ui.tool === "paint") {
        var to = brush();
        if (to === null) note = "click to paint with this country";
        else if (o !== to) note = "to " + (to >= 0 ? countries[to].name : "unclaimed land");
      } else if (ui.tool === "city") note = "click to found a city here";
      showTip(x, y, main, provName[p], note);
    });
  }
  function setHover(p) {
    if (p === ui.hover) return;
    ui.hover = p;
    scheduleRender();
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

  var fly = null;
  function flyTo(lon, lat, zoom) {
    stopInertia();
    var toZoom = zoom == null ? view.zoom : Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    if (reduceMotion) { view.lon = lon; view.lat = lat; view.zoom = toZoom; applyView(); scheduleRender(); return; }
    var from = versorFromAngles([-view.lon, -view.lat, 0]);
    var to = versorFromAngles([-lon, -lat, 0]);
    var dAngle = d3.geoDistance([view.lon, view.lat], [lon, lat]);
    var ms = Math.min(1400, 450 + dAngle * 350);
    fly = { t0: performance.now(), ms: ms, interp: versorInterpolate(from, to), z0: view.zoom, z1: toZoom };
    interacting = 1;
    requestAnimationFrame(flyStep);
  }
  function flyStep() {
    if (!fly) return;
    var t = Math.min(1, (performance.now() - fly.t0) / fly.ms);
    var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    var ang = versorToAngles(fly.interp(e));
    view.lon = -ang[0]; view.lat = -ang[1];
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
    var ll = [Math.atan2(L.v[1], L.v[0]) * 180 / Math.PI, Math.asin(L.v[2]) * 180 / Math.PI];
    var size = Math.max(L.w, L.h, 200);
    var want = Math.min(W - (W <= 640 ? 0 : 400), H - (W <= 640 ? 220 : 60)) / 2 - 30;
    var zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, want / (baseR * Math.min(1, size / 2 / R_KM * 1.3))));
    flyTo(ll[0], ll[1], Math.max(view.zoom, Math.min(zoom, 12)));
  }

  var undoStack = [], redoStack = [], lastEdit = { key: null, t: 0 };
  function pushStep(label, ops) {
    undoStack.push({ label: label, ops: ops });
    if (undoStack.length > 400) undoStack.shift();
    redoStack.length = 0;
    lastEdit = { key: null, t: 0 };
  }
  function editStep(key, label, op) {
    var top = undoStack[undoStack.length - 1], now = performance.now();
    if (top && lastEdit.key === key && now - lastEdit.t < 3000 && top.ops.length === 1 && top.ops[0].t === op.t && redoStack.length === 0) top.ops[0].to = op.to;
    else pushStep(label, [op]);
    lastEdit = { key: key, t: now };
  }
  function applyOp(op, back) {
    var v;
    if (op.t === "own") {
      for (var i = 0; i < op.ps.length; i++) owner[op.ps[i]] = back ? op.from[i] : op.to[i];
      var touched = new Set(op.from.concat(op.to));
      ownersChanged(Array.from(touched));
      queueLabels(Array.from(touched));
    } else if (op.t === "country") {
      v = back ? op.from : op.to;
      var co = countries[op.c];
      if (!v) co.alive = false;
      else { co.alive = true; co.name = v.name; co.color = v.color; }
      groupsDirty = true;
      countriesVersion++;
      queueLabels([op.c]);
    } else if (op.t === "city") {
      v = back ? op.from : op.to;
      setCityState(op.id, v);
    } else if (op.t === "replace") {
      loadDiff(back ? op.from : op.to);
    }
  }
  function undo() {
    if (stroke) endStroke();
    var s = undoStack.pop();
    if (!s) return;
    for (var i = s.ops.length - 1; i >= 0; i--) applyOp(s.ops[i], true);
    redoStack.push(s);
    lastEdit = { key: null, t: 0 };
    afterHistory();
    toast("Undone: " + s.label.toLowerCase());
  }
  function redo() {
    var s = redoStack.pop();
    if (!s) return;
    for (var i = 0; i < s.ops.length; i++) applyOp(s.ops[i], false);
    undoStack.push(s);
    lastEdit = { key: null, t: 0 };
    afterHistory();
    toast("Redone: " + s.label.toLowerCase());
  }
  function afterHistory() {
    if (ui.city && cities.indexOf(ui.city) < 0) ui.city = null;
    if (ui.country >= 0 && !(countries[ui.country] && countries[ui.country].alive)) ui.country = -1;
    changed();
  }

  var saveTimer = 0;
  function changed() {
    renderPanel();
    scheduleRender();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 500);
  }

  function uniqueName(stem) {
    var taken = new Set(countries.filter(function (c) { return c.alive; }).map(function (c) { return c.name; }));
    if (!taken.has(stem)) return stem;
    for (var i = 2; ; i++) if (!taken.has(stem + " " + i)) return stem + " " + i;
  }
  function freeColor(neighbours) {
    freshGroups();
    var used = new Array(PALETTE).fill(0), near = new Array(PALETTE).fill(0);
    countries.forEach(function (c, i) { if (c.alive && typeof c.color === "number" && provsOf[i] && provsOf[i].length) used[c.color % PALETTE]++; });
    neighbours.forEach(function (n) { if (n >= 0 && typeof countries[n].color === "number") near[countries[n].color % PALETTE]++; });
    var best = 0, bestScore = Infinity;
    for (var k = 0; k < PALETTE; k++) { var s = near[k] * 1000 + used[k]; if (s < bestScore) { bestScore = s; best = k; } }
    return best;
  }
  function createCountry(name, color) {
    var i = countries.length;
    countries.push({ code: "N" + i, name: name, color: color, alive: true, label: null });
    groupsDirty = true;
    countriesVersion++;
    return { t: "country", c: i, from: null, to: { name: name, color: color } };
  }
  function newCountry() {
    var op = createCountry(uniqueName("New country"), freeColor([]));
    pushStep("New country", [op]);
    ui.country = op.c; ui.erase = false; ui.city = null; ui.region = -1;
    setTool("paint");
    changed();
    if (canHover) { var inp = $("country-name"); inp.focus(); inp.select(); }
  }
  function makeIndependent(p) {
    if (p < 0) return;
    var from = owner[p];
    var near = new Set([from]);
    (provNeighbors[p] || []).forEach(function (q) { near.add(owner[q]); });
    var op = createCountry(uniqueName(provName[p] || "New country"), freeColor(Array.from(near)));
    owner[p] = op.c;
    ownersChanged([from, op.c]);
    pushStep("Independence", [op, { t: "own", ps: [p], from: [from], to: [op.c] }]);
    ui.country = op.c; ui.region = p;
    queueLabels([from, op.c]);
    changed();
  }
  function dissolve(c) {
    freshGroups();
    var ps = provsOf[c].slice();
    if (!ps.length) return;
    var from = ps.map(function () { return c; }), to = ps.map(function () { return UNCLAIMED; });
    ps.forEach(function (p) { owner[p] = UNCLAIMED; });
    ownersChanged([c]);
    pushStep("Dissolving " + countries[c].name, [{ t: "own", ps: ps, from: from, to: to }]);
    queueLabels([c]);
    changed();
    toast(countries[c].name + " dissolved, its land left unclaimed", "Undo", undo);
  }
  function setCountryName(c, name) {
    var co = countries[c];
    var before = { name: co.name, color: co.color };
    co.name = name;
    editStep("name:" + c, "Renaming", { t: "country", c: c, from: before, to: { name: name, color: co.color } });
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

  function citySnapshot(c) { return { name: c.name, lon: c.lon, lat: c.lat, tier: c.tier, cap: c.cap }; }
  function cityById(id) { for (var i = 0; i < cities.length; i++) if (cities[i].id === id) return cities[i]; return null; }
  function placeCity(c, lon, lat) {
    c.lon = lon; c.lat = lat;
    var v = toVec(lon, lat);
    c.x = v[0]; c.y = v[1]; c.z = v[2];
  }
  function restoreCity(c, s) { placeCity(c, s.lon, s.lat); }
  function setCityState(id, v) {
    var c = cityById(id);
    if (!v) {
      if (c) cities.splice(cities.indexOf(c), 1);
      if (ui.city === c) ui.city = null;
      return;
    }
    if (!c) { c = { id: id }; cities.push(c); }
    c.name = v.name; c.tier = v.tier; c.cap = v.cap; c.w = 0;
    placeCity(c, v.lon, v.lat);
    sortCities();
  }
  function selectCity(c) {
    ui.city = c; ui.country = -1; ui.region = -1;
    renderPanel(); scheduleRender();
  }
  function addCity(lon, lat) {
    var id = "u" + (++citySeq);
    var v = { name: "New city", lon: lon, lat: lat, tier: 3, cap: 0 };
    setCityState(id, v);
    pushStep("Founding a city", [{ t: "city", id: id, from: null, to: v }]);
    selectCity(cityById(id));
    changed();
    if (canHover) { var inp = $("city-name"); inp.focus(); inp.select(); }
  }
  function deleteCity(c) {
    if (!c) return;
    var snap = citySnapshot(c);
    setCityState(c.id, null);
    pushStep("Deleting " + snap.name, [{ t: "city", id: c.id, from: snap, to: null }]);
    ui.city = null;
    changed();
    toast(snap.name + " deleted", "Undo", undo);
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
    else { c.cap = 0; c.tier = 4; }
    c.w = 0;
    sortCities();
    pushStep("Resizing a city", [{ t: "city", id: c.id, from: before, to: citySnapshot(c) }]);
    changed();
  }
  function citySize(c) { return c.cap ? "capital" : c.tier >= 4 ? "town" : "city"; }

  function setTool(t) {
    if (stroke) endStroke();
    ui.tool = t;
    if (t !== "select" && t !== "city") ui.city = t === "city" ? ui.city : null;
    if (t === "city") ui.country = -1;
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
  function renderPanel() {
    if (!feats) return;
    freshGroups();
    document.querySelectorAll(".uc-tool").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.tool === ui.tool)); });
    canvas.classList.toggle("is-tool-paint", ui.tool === "paint");
    canvas.classList.toggle("is-tool-city", ui.tool === "city");
    var verb = canHover ? "Click" : "Tap";
    var c = currentCountry();
    if (ui.tool === "select") {
      if (ui.city) setHint(["Drag the city on the globe to move it"]);
      else if (c < 0 && ui.region >= 0 && owner[ui.region] < 0) setHint(["No country holds this land"]);
      else if (c >= 0) setHint(["Rename or recolour ", { b: countries[c].name }, " here, or paint its borders"]);
      else setHint([verb + " a country or a city to change it, or found a new country"]);
    } else if (ui.tool === "paint") {
      var to = brush();
      var more = canHover ? " · Shift-drag turns the globe · Alt-click picks a country" : "";
      if (to === UNCLAIMED) setHint([(canHover ? "Click or drag over" : "Tap") + " regions to leave them unclaimed" + more]);
      else if (to === null) setHint([verb + " a country to paint with it, or found a new one"]);
      else setHint([(canHover ? "Click or drag over" : "Tap") + (ui.whole ? " countries to give them whole to " : " regions to give them to "), { b: countries[to].name }, more]);
    } else {
      setHint([canHover ? "Click the globe to found a city, or drag one to move it" : "Tap the globe to found a city, or drag one to move it"]);
    }

    var showCountry = c >= 0 && !ui.city && ui.tool !== "city" && !(ui.tool === "paint" && ui.erase);
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
      var ps = provsOf[c] || [], area = 0;
      ps.forEach(function (p) { area += provArea[p]; });
      $("country-facts").textContent = ps.length ? ps.length.toLocaleString() + (ps.length === 1 ? " region · " : " regions · ") + Math.round(area).toLocaleString() + " km²" : "No land yet: paint some regions to give it some";
      $("paint-with").hidden = ui.tool !== "select";
      $("dissolve").hidden = !ps.length;
      syncCountryPick(c);
    }
    var r0 = ui.region;
    var showRegion = ui.tool === "select" && !ui.city && r0 >= 0 && ((c >= 0 && owner[r0] === c && provsOf[c].length > 1) || owner[r0] < 0);
    $("region-line").hidden = !showRegion;
    if (showRegion) $("region-name").textContent = owner[r0] < 0 ? provName[r0] + ", unclaimed land" : provName[r0];
    $("paint-pane").hidden = ui.tool !== "paint";
    $("paint-regions").setAttribute("aria-pressed", String(!ui.whole && !ui.erase));
    $("paint-whole").setAttribute("aria-pressed", String(ui.whole && !ui.erase));
    $("paint-erase").setAttribute("aria-pressed", String(ui.erase));

    var showCity = !!ui.city && ui.tool !== "paint";
    $("city-pane").hidden = !showCity;
    if (showCity) {
      var cin = $("city-name");
      if (document.activeElement !== cin) cin.value = ui.city.name;
      var size = citySize(ui.city);
      document.querySelectorAll("#city-size button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.size === size)); });
    }
    $("new-country").parentNode.hidden = ui.tool === "city";
    $("undo").disabled = !undoStack.length;
    $("redo").disabled = !redoStack.length;
    $("undo").title = undoStack.length ? "Undo " + undoStack[undoStack.length - 1].label.toLowerCase() + " (Ctrl+Z)" : "Undo (Ctrl+Z)";
  }
  function syncCountryPick(c) {
    var sel = $("country-pick");
    if (pickVersion !== countriesVersion || sel.options.length < 2) fillCountryPick();
    sel.value = String(c);
  }
  function fillCountryPick() {
    var sel = $("country-pick");
    sel.innerHTML = "";
    var head = new Option("Choose a country", "");
    head.disabled = true;
    sel.appendChild(head);
    var list = [];
    countries.forEach(function (co, i) { if (co.alive) list.push(i); });
    list.sort(function (a, b) { return countries[a].name.localeCompare(countries[b].name); });
    list.forEach(function (i) { sel.appendChild(new Option(countries[i].name || "Unnamed", String(i))); });
    pickVersion = countriesVersion;
    var c = currentCountry();
    sel.value = c >= 0 ? String(c) : "";
  }
  function renderSwatches() {
    var box = $("swatches");
    if (!box) return;
    box.innerHTML = "";
    for (var i = 0; i < PALETTE; i++) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "uc-swatch"; b.dataset.color = String(i);
      b.style.background = pal.colors[i];
      b.setAttribute("aria-label", "Colour " + (i + 1));
      b.setAttribute("aria-pressed", "false");
      box.appendChild(b);
    }
    var custom = document.createElement("label");
    custom.className = "uc-swatch uc-swatch-custom";
    custom.title = "Any colour";
    custom.appendChild(document.createTextNode("+"));
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
    ui.country = +v; ui.erase = false; ui.region = -1; ui.city = null;
    renderPanel(); scheduleRender();
    flyToCountry(ui.country);
  });
  $("country-pick").addEventListener("pointerdown", fillCountryPick);
  $("country-pick").addEventListener("focus", function () { if (pickVersion !== countriesVersion) { fillCountryPick(); var c = currentCountry(); if (c >= 0) $("country-pick").value = String(c); } });
  $("paint-with").addEventListener("click", function () { ui.erase = false; setTool("paint"); });
  $("dissolve").addEventListener("click", function () { var c = currentCountry(); if (c >= 0) dissolve(c); });
  $("independent").addEventListener("click", function () { makeIndependent(ui.region); });
  $("new-country").addEventListener("click", newCountry);
  $("paint-regions").addEventListener("click", function () { ui.whole = false; ui.erase = false; renderPanel(); scheduleRender(); });
  $("paint-whole").addEventListener("click", function () { ui.whole = true; ui.erase = false; renderPanel(); scheduleRender(); });
  $("paint-erase").addEventListener("click", function () { ui.erase = !ui.erase; if (ui.erase) ui.whole = false; renderPanel(); scheduleRender(); });
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
    else if (k === "c") setTool("city");
    else if (k === "s") setSatellite(!ui.satellite);
    else if ((e.key === "Delete" || e.key === "Backspace") && ui.city) { e.preventDefault(); deleteCity(ui.city); }
    else if (e.key === "Escape") {
      if (ui.city) ui.city = null;
      else if (ui.tool !== "select") { setTool("select"); return; }
      else { ui.country = -1; ui.region = -1; }
      renderPanel(); scheduleRender();
    }
  });
  document.addEventListener("keyup", function (e) { if (e.key === " ") { spaceDown = false; canvas.classList.remove("is-turning"); } });
  window.addEventListener("blur", function () { spaceDown = false; canvas.classList.remove("is-turning"); });

  function setSatellite(on) {
    if (on && !sat && !satTried) {
      satTried = true;
      sat = window.UchroniaSat ? window.UchroniaSat(satCanvas) : null;
      if (sat) {
        sat.onRestore = scheduleRender;
        var urls = [{ src: "data/earth-2048.webp", size: 2048 }];
        if (W > 640) urls.push({ src: "data/earth-4096.webp", size: 4096 });
        sat.load(urls, scheduleRender);
      }
    }
    if (on && !sat) { toast("The satellite view needs WebGL, which this browser does not offer"); on = false; }
    ui.satellite = on;
    $("sat-btn").setAttribute("aria-pressed", String(on));
    try { localStorage.setItem(STORE_SAT, on ? "1" : "0"); } catch (e) { }
    scheduleRender();
  }
  $("sat-btn").addEventListener("click", function () { setSatellite(!ui.satellite); });

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
  function hideToast() { $("status").hidden = true; }

  function validName(s) { return typeof s === "string" ? s.slice(0, NAME_MAX) : null; }
  function validColor(c) {
    if (typeof c === "number" && c >= 0 && c < PALETTE && Math.floor(c) === c) return c;
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
    var o = [];
    for (var p = 0; p < nProv; p++) if (owner[p] !== base.owner[p]) o.push(p, owner[p]);
    if (o.length) d.o = o;
    var byId = new Map();
    cities.forEach(function (c) { byId.set(c.id, c); });
    var x = [], m = [], a = [];
    base.cities.forEach(function (b, i) {
      var c = byId.get("b" + i);
      if (!c) { x.push(i); return; }
      if (c.name !== b.name || c.lon !== b.lon || c.lat !== b.lat || c.tier !== b.tier || c.cap !== b.cap) m.push([i, c.name, round4(c.lon), round4(c.lat), c.tier, c.cap]);
    });
    cities.forEach(function (c) { if (c.id.charAt(0) === "u") a.push([c.name, round4(c.lon), round4(c.lat), c.tier, c.cap, c.id]); });
    if (x.length) d.x = x;
    if (m.length) d.m = m;
    if (a.length) d.a = a;
    return d;
  }
  function isEmpty(d) { return !d || Object.keys(d).length === 0; }
  function loadDiff(d) {
    var old = countries;
    owner.set(base.owner);
    countries = base.countries.map(function (b, i) { return { code: b.code, name: b.name, color: b.color, alive: true, label: old[i] ? old[i].label : null }; });
    cities = [];
    citySeq = 0;
    base.cities.forEach(function (b, i) { setCityState("b" + i, b); });
    d = d && typeof d === "object" ? d : {};
    if (Array.isArray(d.c)) d.c.forEach(function (row) {
      if (!Array.isArray(row)) return;
      var i = row[0];
      if (typeof i !== "number" || i < 0 || i >= 4000 || Math.floor(i) !== i) return;
      while (countries.length <= i) countries.push({ code: "N" + countries.length, name: "", color: 0, alive: false, label: null });
      var co = countries[i];
      var name = validName(row[1]), color = validColor(row[2]);
      if (i >= base.countries.length) { co.alive = true; co.name = name || "New country"; co.color = color === null ? 0 : color; }
      else { if (name !== null) co.name = name; if (color !== null) co.color = color; }
    });
    if (Array.isArray(d.o)) for (var k = 0; k + 1 < d.o.length; k += 2) {
      var p = d.o[k], v = d.o[k + 1];
      if (typeof p !== "number" || p < 0 || p >= nProv || Math.floor(p) !== p) continue;
      if (typeof v !== "number" || Math.floor(v) !== v || v < -1 || v >= countries.length) continue;
      if (v >= 0 && !countries[v].alive) continue;
      owner[p] = v;
    }
    if (Array.isArray(d.x)) d.x.forEach(function (i) { if (typeof i === "number" && base.cities[i]) setCityState("b" + i, null); });
    if (Array.isArray(d.m)) d.m.forEach(function (row) {
      if (!Array.isArray(row) || typeof row[0] !== "number" || !base.cities[row[0]]) return;
      var c = validCity(row.slice(1));
      if (c) setCityState("b" + row[0], c);
    });
    if (Array.isArray(d.a)) {
      d.a.forEach(function (row) { var m = Array.isArray(row) && /^u(\d{1,7})$/.exec(row[5]); if (m) citySeq = Math.max(citySeq, +m[1]); });
      d.a.forEach(function (row) {
        var c = validCity(row);
        if (!c) return;
        var id = /^u\d{1,7}$/.test(row[5]) && !cityById(row[5]) ? row[5] : "u" + (++citySeq);
        setCityState(id, c);
      });
    }
    sortCities();
    ownersChanged();
    countriesVersion++;
    labelQueue.clear();
    sortLabels();
    freshGroups();
    queueLabels(countries.map(function (c, i) { return i; }));
    if (ui.city && cities.indexOf(ui.city) < 0) ui.city = null;
    if (ui.country >= 0 && !(countries[ui.country] && countries[ui.country].alive)) ui.country = -1;
  }
  function replaceMap(d, label) {
    var before = makeDiff();
    loadDiff(d);
    pushStep(label, [{ t: "replace", from: before, to: makeDiff() }]);
    ui.city = null; ui.region = -1;
    changed();
  }
  function save() {
    try {
      var d = makeDiff();
      if (isEmpty(d)) localStorage.removeItem(STORE);
      else localStorage.setItem(STORE, JSON.stringify({ v: 1, map: d }));
    } catch (e) { }
  }
  function readStored(key) {
    try {
      var s = localStorage.getItem(key);
      if (!s) return null;
      var o = JSON.parse(s);
      return o && o.map ? o.map : null;
    } catch (e) { return null; }
  }

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
    w.write(bytes); w.close();
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
      return json.then(function (b) { return JSON.parse(new TextDecoder().decode(b)); });
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
    var blob = new Blob([JSON.stringify({ format: "uchronia", v: 1, saved: new Date().toISOString(), map: makeDiff() })], { type: "application/json" });
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
      var d = o && o.format === "uchronia" ? o.map : o;
      if (!d || typeof d !== "object") throw new Error("not a map");
      replaceMap(d, "Opening a file");
      toast("Map opened", "Undo", undo);
    }).catch(function () { toast("That file is not a map from this page"); });
  });
  $("reset").addEventListener("click", function () {
    if (isEmpty(makeDiff())) { toast("This is already the world as it is"); return; }
    replaceMap({}, "Starting over");
    toast("Back to the world as it is", "Undo", undo);
  });

  function openSharedFromHash() {
    var m = /^#m=([A-Za-z0-9_-]+)$/.exec(location.hash);
    if (!m) return Promise.resolve(false);
    return decodeMap(m[1]).then(function (d) {
      var mine = makeDiff();
      if (!isEmpty(mine)) { try { localStorage.setItem(STORE_PREV, JSON.stringify({ v: 1, map: mine })); } catch (e) { } }
      loadDiff(d);
      history.replaceState(null, "", location.pathname + location.search);
      undoStack.length = 0; redoStack.length = 0;
      save();
      changed();
      if (!isEmpty(mine)) toast("A shared map is open. Yours is kept", "Back to mine", function () { var prev = readStored(STORE_PREV); if (prev) replaceMap(prev, "Going back to your map"); }, 12000);
      else toast("A shared map is open");
      return true;
    }).catch(function (e) {
      console.warn("shared map", e);
      history.replaceState(null, "", location.pathname + location.search);
      toast("That link's map could not be read");
      return false;
    });
  }

  (function () {
    var box = $("about"), btn = $("about-btn");
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
      if (W <= 640 && !panel.classList.contains("is-open") && performance.now() - sheetGestureAt > 500) setSheetState(SHEET_OPEN);
    });
  });
  var sheetDrag = null;
  panel.addEventListener("pointerdown", function (e) {
    if (W > 640 || e.pointerType === "mouse") return;
    sheetDrag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), engaged: false,
      onHandle: !!(e.target.closest && e.target.closest(".uc-sheet-handle, .uc-head")) };
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
    var adj = countries.map(function () { return new Set(); });
    for (var a = 0; a < arcA.length; a++) {
      var b = arcB[a];
      if (b < 0) continue;
      var oa = owner[arcA[a]], ob = owner[b];
      if (oa >= 0 && ob >= 0 && oa !== ob) { adj[oa].add(ob); adj[ob].add(oa); }
    }
    var order = countries.map(function (c, i) { return i; });
    order.sort(function (x, y) { return adj[y].size - adj[x].size || x - y; });
    var used = new Array(PALETTE).fill(0), done = new Array(countries.length).fill(false);
    order.forEach(function (i) {
      var near = new Array(PALETTE).fill(0);
      adj[i].forEach(function (n) { if (done[n]) near[countries[n].color]++; });
      var code = countries[i].code, h = 0;
      for (var k = 0; k < code.length; k++) h = (h * 31 + code.charCodeAt(k)) >>> 0;
      var best = 0, bestScore = Infinity;
      for (k = 0; k < PALETTE; k++) {
        var col = (h + k) % PALETTE, score = near[col] * 1000 + used[col];
        if (score < bestScore) { bestScore = score; best = col; }
      }
      countries[i].color = best; used[best]++; done[i] = true;
    });
  }

  function init(topo, cityRows) {
    var geoms = topo.objects.provinces.geometries;
    nProv = geoms.length;
    var codeIndex = new Map();
    countries = topo.countries.map(function (c, i) { codeIndex.set(c.c, i); return { code: c.c, name: c.n, color: 0, alive: true, label: null }; });
    owner = new Int32Array(nProv);
    provName = new Array(nProv);
    for (var p = 0; p < nProv; p++) {
      provName[p] = geoms[p].properties.n;
      owner[p] = codeIndex.has(geoms[p].properties.c) ? codeIndex.get(geoms[p].properties.c) : UNCLAIMED;
    }
    var pre = topojson.presimplify(topo, topojson.sphericalTriangleArea);
    var weights = [];
    pre.arcs.forEach(function (arc) { arc.forEach(function (pt) { if (isFinite(pt[2])) weights.push(pt[2]); }); });
    weights.sort(function (x, y) { return x - y; });
    var keep = function (fraction) { return weights[Math.max(0, Math.min(weights.length - 1, Math.floor((1 - fraction) * (weights.length - 1))))]; };
    levels = [topojson.simplify(pre, keep(0.11)), topojson.simplify(pre, keep(0.33)), pre];
    var gj = levels.map(function (t) { return topojson.feature(t, t.objects.provinces).features; });
    geoFull = topojson.feature(topo, topo.objects.provinces).features;
    feats = gj.map(prepare);
    arcLines = levels.map(function (t) { return t.arcs.map(prepareLine); });
    graticule = makeGraticule();
    graticuleIdx = graticule.map(function (g, i) { return i; });

    arcA = new Int32Array(topo.arcs.length).fill(-1);
    arcB = new Int32Array(topo.arcs.length).fill(-1);
    geoms.forEach(function (g, p) {
      var polys = g.type === "Polygon" ? [g.arcs] : g.type === "MultiPolygon" ? g.arcs : [];
      polys.forEach(function (rings) {
        rings.forEach(function (ring) {
          ring.forEach(function (k) {
            var a = k < 0 ? ~k : k;
            if (arcA[a] < 0) arcA[a] = p;
            else if (arcA[a] !== p) arcB[a] = p;
          });
        });
      });
    });
    provNeighbors = new Array(nProv);
    for (p = 0; p < nProv; p++) provNeighbors[p] = [];
    for (var a = 0; a < arcA.length; a++) {
      if (arcB[a] < 0 || arcA[a] < 0) continue;
      provNeighbors[arcA[a]].push(arcB[a]);
      provNeighbors[arcB[a]].push(arcA[a]);
    }
    provArea = new Float64Array(nProv);
    for (p = 0; p < nProv; p++) {
      var ar = d3.geoArea(geoFull[p]);
      if (ar > 2 * Math.PI) ar = 4 * Math.PI - ar;
      provArea[p] = ar * R_KM * R_KM;
    }
    colorAll();
    cities = [];
    cityRows.forEach(function (r, i) { setCityState("b" + i, { name: r[0], lon: r[1], lat: r[2], tier: r[3], cap: r[4] }); });
    base = {
      owner: owner.slice(),
      countries: countries.map(function (c) { return { code: c.code, name: c.name, color: c.color }; }),
      cities: cityRows.map(function (r) { return { name: r[0], lon: r[1], lat: r[2], tier: r[3], cap: r[4] }; })
    };
    ownersChanged();
    var stored = readStored(STORE);
    if (stored) loadDiff(stored);
    else queueLabels(countries.map(function (c, i) { return i; }));

    refreshPalette();
    layout();
    var satPref = null;
    try { satPref = localStorage.getItem(STORE_SAT); } catch (e) { }
    if (satPref === "1") setSatellite(true);
    renderPanel();
    $("load").classList.add("is-gone");
    setTimeout(function () { var l = $("load"); if (l) l.remove(); }, 400);
    scheduleRender();
    openSharedFromHash();
  }

  window.addEventListener("resize", function () { layout(); scheduleRender(); });
  window.addEventListener("hashchange", openSharedFromHash);
  new MutationObserver(function () { refreshPalette(); renderPanel(); scheduleRender(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { widthCache.clear(); cities.forEach(function (c) { c.w = 0; }); scheduleRender(); });

  window.__uchronia = {
    ready: function () { return !!feats; },
    ui: ui, view: view,
    countries: function () { return countries; },
    owner: function () { return owner; },
    provinces: function () { return { n: nProv, name: provName }; },
    cities: function () { return cities; },
    project: function (lon, lat) { return visible([lon, lat]) ? projection([lon, lat]) : null; },
    provinceAt: provinceAt,
    setView: function (lon, lat, zoom) { view.lon = lon; view.lat = lat; view.zoom = zoom; applyView(); render(); },
    scale: function () { return projection.scale(); },
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
    history: function () { return { undo: undoStack.length, redo: redoStack.length }; }
  };

  function fetchJSON(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(url + " " + r.status); return r.json(); });
  }
  refreshPalette();
  layout();
  Promise.all([fetchJSON("data/provinces.json"), fetchJSON("data/cities.json")]).then(function (res) { init(res[0], res[1]); }).catch(function (err) {
    $("load").textContent = "The map did not load (" + err.message + "), reload to try again";
    console.error(err);
  });
})();

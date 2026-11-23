// The portfolio map: one imaginary world per visit, drawn as an SVG, with a mapping app's interface around it.
// The world files come from tools/worlds/generate.mjs; the content from projects.json and about.json.
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var ROOT = "/projects/";
  var MAX_ZOOM = 6;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ---------------------------------------------------------------- helpers

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function svg(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function getJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + " " + r.status);
      return r.json();
    });
  }
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  // Path data (M, L, H, V, Q, T, Z, upper and lower case) to rings of points, for areas and bounds.
  function rings(d) {
    var out = [], ring = null, x = 0, y = 0, sx = 0, sy = 0, cmd = "", qx = 0, qy = 0, lastQ = false;
    var tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) || [];
    var i = 0;
    function num() { return parseFloat(tokens[i++]); }
    function start(nx, ny) { ring = [[nx, ny]]; out.push(ring); x = sx = nx; y = sy = ny; }
    while (i < tokens.length) {
      if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
      var rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), wasQ = false;
      if (C === "Z") { x = sx; y = sy; lastQ = false; continue; }
      if (C === "M") {
        var mx = num(), my = num();
        start(rel ? x + mx : mx, rel ? y + my : my);
        cmd = rel ? "l" : "L";
        continue;
      }
      if (C === "L") { var lx = num(), ly = num(); x = rel ? x + lx : lx; y = rel ? y + ly : ly; }
      else if (C === "H") { var hx = num(); x = rel ? x + hx : hx; }
      else if (C === "V") { var vy = num(); y = rel ? y + vy : vy; }
      else if (C === "Q") {
        var a = num(), b = num(), c = num(), e = num();
        qx = rel ? x + a : a; qy = rel ? y + b : b;
        ring.push([qx, qy]);
        x = rel ? x + c : c; y = rel ? y + e : e; wasQ = true;
      } else if (C === "T") {
        var tx = num(), ty = num();
        qx = lastQ ? 2 * x - qx : x; qy = lastQ ? 2 * y - qy : y;
        ring.push([qx, qy]);
        x = rel ? x + tx : tx; y = rel ? y + ty : ty; wasQ = true;
      } else { i++; continue; }
      lastQ = wasQ;
      ring.push([x, y]);
    }
    return out;
  }
  function shapeOf(d) {
    var rs = rings(d), area = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, cx = 0, cy = 0, big = 0;
    rs.forEach(function (r) {
      var a = 0, rx = 0, ry = 0;
      for (var k = 0; k < r.length; k++) {
        var p = r[k], q = r[(k + 1) % r.length];
        a += p[0] * q[1] - q[0] * p[1];
        if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
        if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
        rx += p[0]; ry += p[1];
      }
      area += Math.abs(a / 2);
      if (Math.abs(a) > big) { big = Math.abs(a); cx = rx / r.length; cy = ry / r.length; }
    });
    return { area: area, box: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, rings: rs, main: [cx, cy] };
  }

  // ---------------------------------------------------------------- the map

  // Each kind of label's smallest and largest size on screen, in pixels.
  // Water names are small, as on the reference: about a town's size, an ocean a little more.
  var LABEL_FLOOR = { country: 11.5, ocean: 12, sea: 11, gulf: 10.5, bay: 10.5, capital: 11.5, city: 11.5, province: 11, range: 10.5, lake: 10.5, strait: 10.5, river: 10.5, town: 11, village: 10, peak: 10, park: 11, region: 10.5, island: 10.5, cape: 10, shield: 9.5 };
  var LABEL_CAP = { country: 34, ocean: 16, sea: 13, gulf: 12.5, bay: 12, capital: 15, city: 14, province: 15, range: 13, lake: 12.5, strait: 12, river: 12, town: 13, village: 12, peak: 12, park: 15, region: 14, island: 13, cape: 12, shield: 11 };
  var LABEL_RANK = { ocean: 40, sea: 50, gulf: 55, province: 52, capital: 60, city: 62, shield: 66, park: 68, range: 70, region: 72, peak: 74, lake: 75, island: 76, bay: 78, strait: 80, river: 85, town: 90, cape: 92, village: 96 };
  var WATER = { sea: 1, ocean: 1, gulf: 1, bay: 1, lake: 1, strait: 1, river: 1 };

  function MapView(host) {
    this.host = host;
    // The drawing is larger than the screen by a margin on every side, so a drag can slide it as one composited
    // layer and the vectors are redrawn only when the map comes to rest.
    this.M = 240;
    this.svg = svg("svg", { class: "map-svg", role: "application", "aria-label": "Map", tabindex: "0" }, host);
    this.svg.style.setProperty("--overscan", this.M + "px");
    this.svg.setAttribute("aria-roledescription", "map");
    this.ocean = svg("rect", { class: "map-ocean", x: 0, y: 0, width: "100%", height: "100%" }, this.svg);
    this.root = svg("g", { class: "map-world" }, this.svg);
    this.s = 1; this.tx = 0; this.ty = 0;
    this.insets = { left: 0, top: 0, right: 0, bottom: 0 };
    this.world = null;
    this.selected = null; this.selectedProvince = null;
    this.onSelect = function () {};
    this.onView = function () {};
    this.anim = null;
    this.pending = false;
    this.c = null;
    this.idle = 0;
    this._size = { w: host.clientWidth, h: host.clientHeight };
    this._bind();
  }

  MapView.prototype.size = function () { return this._size; };
  MapView.prototype.resized = function () {
    this._size = { w: this.host.clientWidth, h: this.host.clientHeight };
    if (this.world) this.set({ s: this.s, tx: this.tx, ty: this.ty });
  };

  // The rectangle of the map the visitor can see, past the panel and the footer.
  MapView.prototype.rect = function () {
    var z = this.size(), i = this.insets;
    return { l: i.left, t: i.top, r: z.w - i.right, b: z.h - i.bottom, w: z.w - i.left - i.right, h: z.h - i.top - i.bottom };
  };
  // The scale at which the whole world fits the screen (zoom 1), and the scale limits.
  MapView.prototype.fit = function () {
    var z = this.size(), W = this.world.width, H = this.world.height;
    var bottom = this.insets.bottomFixed || 0;
    return Math.min(z.w / W, (z.h - bottom) / H);
  };
  // Zoom 1 is the whole world on a screen at least as large as a small laptop's; on a phone, where the whole world
  // is a thin strip, zoom 1 is a little closer than that, so the same four steps reach the same detail.
  MapView.prototype.ref = function () { return Math.max(this.fit(), 0.6); };
  MapView.prototype.limits = function () {
    var r = this.rect(), W = this.world.width, H = this.world.height, f = this.fit();
    return { min: Math.min(f, r.w / W, r.h / H), max: this.ref() * MAX_ZOOM };
  };
  MapView.prototype.zoom = function () { return this.s / this.ref(); };

  MapView.prototype.clampView = function (v) {
    var r = this.rect(), lim = this.limits(), W = this.world.width, H = this.world.height;
    var s = clamp(v.s, lim.min, lim.max);
    // The world wraps east and west, so only north and south are bounded.
    var tx = v.tx, ty = v.ty;
    void W;
    if (H * s <= r.h + 0.5) ty = r.t + (r.h - H * s) / 2;
    else ty = clamp(ty, r.b - H * s, r.t);
    return { s: s, tx: tx, ty: ty };
  };
  MapView.prototype.set = function (v, fast) {
    var c = this.clampView(v);
    this.s = c.s; this.tx = c.tx; this.ty = c.ty;
    this.render(false, fast);
  };
  // A view that shows a box of the world in the visible rectangle.
  MapView.prototype.viewFor = function (box, opts) {
    opts = opts || {};
    var r = this.rect(), pad = opts.pad == null ? 0.72 : opts.pad, lim = this.limits();
    var s = Math.min((r.w * pad) / Math.max(box.w, 1), (r.h * pad) / Math.max(box.h, 1));
    s = clamp(s, opts.min || lim.min, Math.min(lim.max, this.ref() * (opts.maxZoom || MAX_ZOOM)));
    var cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    return { s: s, tx: r.l + r.w / 2 - cx * s, ty: r.t + r.h / 2 - cy * s };
  };
  MapView.prototype.zoomAt = function (factor, px, py, animate) {
    var to = this.clampView({ s: this.s * factor, tx: 0, ty: 0 });
    var s = to.s, wx = (px - this.tx) / this.s, wy = (py - this.ty) / this.s;
    var v = { s: s, tx: px - wx * s, ty: py - wy * s };
    if (animate) this.flyTo(v, { duration: 320 });
    else { this.stop(); this.set(v); }
  };
  MapView.prototype.zoomBy = function (factor) {
    var r = this.rect();
    this.zoomAt(factor, r.l + r.w / 2, r.t + r.h / 2, true);
  };

  MapView.prototype.stop = function () {
    if (this.anim) { cancelAnimationFrame(this.anim.raf); this.anim = null; }
  };
  // Flies the view to another, through a gentle zoom-out when the trip is long.
  MapView.prototype.flyTo = function (to, opts) {
    opts = opts || {};
    this.stop();
    to = this.clampView(to);
    var self = this, r = this.rect();
    var from = { s: this.s, tx: this.tx, ty: this.ty };
    var cx = r.l + r.w / 2, cy = r.t + r.h / 2;
    var p0 = [(cx - from.tx) / from.s, (cy - from.ty) / from.s];
    var p1 = [(cx - to.tx) / to.s, (cy - to.ty) / to.s];
    // The world repeats east and west: fly to whichever copy of the place is nearest.
    var W = this.world.width, shift = Math.round((p0[0] - p1[0]) / W) * W;
    if (shift) { p1[0] += shift; to = { s: to.s, tx: cx - p1[0] * to.s, ty: to.ty }; }
    var dist = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) * Math.min(from.s, to.s);
    var dip = clamp((dist - r.w * 0.35) / (r.w * 2.5), 0, 0.3);
    var duration = reduceMotion.matches ? 0 : opts.duration || clamp(420 + dist * 0.35, 480, 950);
    if (!duration) { this.set(to); if (opts.done) opts.done(); return; }
    var t0 = performance.now();
    var ls0 = Math.log(from.s), ls1 = Math.log(to.s);
    var a = { raf: 0 };
    this.anim = a;
    function frame(now) {
      if (self.anim !== a) return;
      var t = clamp((now - t0) / duration, 0, 1), k = ease(t);
      var s = Math.exp(ls0 + (ls1 - ls0) * k) * (1 - dip * Math.sin(Math.PI * k));
      var px = p0[0] + (p1[0] - p0[0]) * k, py = p0[1] + (p1[1] - p0[1]) * k;
      var v = { s: s, tx: cx - px * s, ty: cy - py * s };
      if (t >= 1) v = to;
      self.s = v.s; self.tx = v.tx; self.ty = v.ty;
      var c = self.clampView(v);
      self.s = c.s; self.tx = c.tx; self.ty = c.ty;
      self.render();
      if (t < 1) a.raf = requestAnimationFrame(frame);
      else { self.anim = null; if (opts.done) opts.done(); }
    }
    a.raf = requestAnimationFrame(frame);
  };

  // ------------------------------------------------------------ drawing

  // The world is drawn in layers, bottom to top. A layer that holds geometry is a template, cloned once for every
  // copy of the world the view needs (the world repeats east and west) and shifted by the world's width.
  MapView.prototype.load = function (world) {
    var self = this;
    this.stop();
    this.world = world;
    this.root.textContent = "";
    this.host.classList.remove("is-image-in");
    var W = world.width, H = world.height, g = this.root;
    this.layers = [];
    function layer(cls, copied) {
      var host = svg("g", { class: "map-layer " + cls }, g);
      var L = { host: host, tpl: copied ? svg("g", { class: cls + "-copy" }) : null, clones: [], ks: [] };
      self.layers.push(L);
      return L;
    }
    // The land-cover picture, under a quiet stand-in of the land until it arrives; finer tiles go over it.
    var Limg = layer("map-ground", true);
    svg("path", { class: "map-land", d: world.coast }, Limg.tpl);
    var image = svg("image", { class: "map-image", x: 0, y: 0, width: W, height: H, preserveAspectRatio: "none" }, Limg.tpl);
    if (world.polar && world.polar.indexOf("n") >= 0) svg("rect", { class: "map-polar-cap", x: 0, y: -H * 3, width: W, height: H * 3 }, Limg.tpl);
    if (world.polar && world.polar.indexOf("s") >= 0) svg("rect", { class: "map-polar-cap", x: 0, y: H, width: W, height: H * 3 }, Limg.tpl);
    this.tileHost = svg("g", { class: "map-tiles" }, g);
    this.tiles = new Tiles(this);
    // The finer detail (parks, streams, roads, subdivisions, and small places' names) arrives once the map is zoomed
    // in; its layers wait, empty, in their places in the drawing order.
    this.detail = null; this.detailAsked = false;
    this.parkLayer = layer("map-parks", true);
    // Streams and rivers, then the sea and lakes over them, and the estuaries: land meets water as two flat colours,
    // with no line between them.
    var La = layer("map-water", true);
    this.waterLayer = La;
    this.streamTpl = svg("g", { class: "map-streams" }, La.tpl);
    var rg = svg("g", { class: "map-rivers" }, La.tpl);
    world.rivers.slice().sort(function (a, b) { return b.width - a.width; }).forEach(function (r) {
      var p = svg("path", { d: r.path }, rg);
      p.style.setProperty("--rw", r.width + "px");
      if (r.minZoom > 1) p.classList.add("is-minor");
    });
    // The sea: this copy's own strip of the map, less its land, so neighbouring copies meet edge to edge.
    // Beyond a polar edge the ice cap runs on, so the map's edge there is ice, not sea.
    var pn = world.polar && world.polar.indexOf("n") >= 0, ps = world.polar && world.polar.indexOf("s") >= 0;
    svg("path", { class: "map-sea", d: "M0 " + (pn ? 0 : -H * 3) + "H" + W + "V" + (ps ? H : H * 4) + "H0Z" + world.coast, "fill-rule": "evenodd" }, La.tpl);
    if (world.lakes) svg("path", { class: "map-lakes", d: world.lakes }, La.tpl);
    this.reservoirTpl = svg("g", { class: "map-reservoirs" }, La.tpl);
    if (world.estuaries && world.estuaries.fill) {
      svg("path", { class: "map-estuary", d: world.estuaries.fill }, La.tpl);
    }
    this.roadLayer = layer("map-roads", true);
    // The picked and hovered country's tint, under the borders.
    this.tintLayer = layer("map-tint", true);
    var Lb = layer("map-lines", true);
    this.lineLayer = Lb;
    this.adminTpl = svg("g", { class: "map-admin" }, Lb.tpl);
    if (world.provinceBorders) svg("path", { class: "map-provinces", d: world.provinceBorders }, Lb.tpl);
    svg("path", { class: "map-borders", d: world.borders }, Lb.tpl);
    this.outlineLayer = layer("map-outline", true);
    // "You are here": a blue dot with a white ring and a soft pulsing halo, on the island called About. Drawn in
    // screen pixels whatever the zoom.
    if (world.here) {
      var Lh = layer("map-here", true);
      var hg = svg("g", { class: "here", role: "link", "aria-label": "About Noah" }, Lh.tpl);
      hg.style.transform = "translate(" + world.here[0] + "px," + world.here[1] + "px) scale(var(--inv))";
      svg("circle", { class: "here-halo", r: 13 }, hg);
      svg("circle", { class: "here-ring", r: 7.5 }, hg);
      svg("circle", { class: "here-dot", r: 5.5 }, hg);
    }
    this._labels(g);
    // The countries' shapes, never painted: they answer which country lies under a point.
    this.hitLayer = svg("g", { class: "map-hit" }, g);
    this.shapes = {};
    world.projects.forEach(function (p) {
      var path = svg("path", { d: p.path }, self.hitLayer);
      self.shapes[p.id] = { el: path, shape: shapeOf(p.path), project: p, provinces: {} };
      (p.provinces || []).forEach(function (v) {
        var pv = svg("path", { d: v.path }, self.hitLayer);
        self.shapes[p.id].provinces[v.id] = { el: pv, shape: shapeOf(v.path), path: v.path };
      });
    });
    this.hover = null;
    this.imageReady = this.picture(ROOT + "worlds/" + world.image.src).then(function (href) { return new Promise(function (resolve) {
      var img = new Image();
      img.decoding = "async";
      img.onload = img.onerror = function () {
        self.baseHref = href;
        self._setImageHref(image);
        if (self.onPicture) self.onPicture(href);
        self._refresh(Limg);
        requestAnimationFrame(function () {
          self.host.classList.add("is-image-in");
          resolve();
        });
      };
      img.src = href;
    }); });
    this.groundLayer = Limg;
    this.selected = null; this.selectedProvince = null;
    this._tint();
    this.render(true);
  };

  // A picture's address (one place to hook any recolouring of the land-cover pictures, should it come back).
  MapView.prototype.picture = function (url) { return Promise.resolve(url); };
  // Kinds of names the visitor has switched off in the menu's map layers: they are neither drawn nor counted.
  MapView.prototype.setHiddenKinds = function (kinds) {
    this.hiddenKinds = kinds || {};
    if (this.world && !this.anim) this.render(true);
    else if (this.world) this.render();
  };
  MapView.prototype._setImageHref = function (image) {
    if (this.baseHref) image.setAttribute("href", this.baseHref);
  };

  // A layer's template changed: every copy is cloned afresh.
  MapView.prototype._refresh = function (L) {
    L.clones.forEach(function (c) { c.remove(); });
    L.clones = []; L.ks = [];
    this._place(L);
  };
  // Each layer gets one copy of its template for every world-width the drawing spans.
  MapView.prototype._place = function (L) {
    var ks = this.copies || [0], W = this.world.width;
    while (L.clones.length < ks.length) { var c = L.tpl.cloneNode(true); L.host.appendChild(c); L.clones.push(c); L.ks.push(null); }
    while (L.clones.length > ks.length) { L.clones.pop().remove(); L.ks.pop(); }
    for (var i = 0; i < ks.length; i++) {
      if (L.ks[i] !== ks[i]) { L.ks[i] = ks[i]; L.clones[i].setAttribute("transform", "translate(" + ks[i] * W + " 0)"); }
    }
  };

  // The picked country (and its provinces) and the hovered one, tinted; the picked one outlined.
  MapView.prototype._tint = function () {
    var T = this.tintLayer.tpl, O = this.outlineLayer.tpl;
    T.textContent = ""; O.textContent = "";
    var id = this.selected, sh = id && this.shapes[id];
    if (this.hover && this.hover.id && !(this.hover.id === id && !this.hover.province)) {
      var hs = this.shapes[this.hover.id];
      if (hs) {
        var hd = this.hover.province && hs.provinces[this.hover.province] ? hs.provinces[this.hover.province].path : hs.project.path;
        svg("path", { class: "map-hover" + (this.hover.province ? " is-province" : ""), d: hd }, T);
      }
    }
    if (sh) {
      svg("path", { class: "map-sel", d: sh.project.path }, T);
      var pv = this.selectedProvince && sh.provinces[this.selectedProvince];
      if (pv) svg("path", { class: "map-sel is-province", d: pv.path }, T);
      svg("path", { class: "map-outline-glow", d: sh.project.path }, O);
      svg("path", { class: "map-outline-line", d: sh.project.path }, O);
      if (pv) svg("path", { class: "map-outline-prov", d: pv.path }, O);
    }
    this._refresh(this.tintLayer);
    this._refresh(this.outlineLayer);
  };

  // Which country (or, inside the picked country, which province) lies under a point on the screen, on any copy.
  MapView.prototype.hitAt = function (x, y) {
    var t = document.elementFromPoint(x, y);
    if (t && t.closest && (t.closest(".here") || t.closest('.lbl[data-here]')) && this.root.contains(t)) return { here: true };
    if (this.world && this.world.here) {
      var hr0 = this.host.getBoundingClientRect(), W0 = this.world.width;
      var hx = (((x - hr0.left - this.tx) / this.s) % W0 + W0) % W0, hy = (y - hr0.top - this.ty) / this.s;
      // The island itself, about six units across.
      if (Math.hypot(hx - this.world.here[0], hy - this.world.here[1]) < Math.max(5.5, 14 / this.s)) return { here: true };
    }
    var lab = t && t.closest && t.closest(".lbl[data-id]");
    if (lab && this.root.contains(lab)) return { id: lab.getAttribute("data-id"), province: lab.getAttribute("data-province") };
    var hr = this.host.getBoundingClientRect(), W = this.world.width;
    var wx = (x - hr.left - this.tx) / this.s, wy = (y - hr.top - this.ty) / this.s;
    wx = ((wx % W) + W) % W;
    var pt = new DOMPoint(wx, wy), id;
    var sel = this.selected && this.shapes[this.selected];
    if (sel) for (var pid in sel.provinces) if (sel.provinces[pid].el.isPointInFill(pt)) return { id: this.selected, province: pid };
    for (id in this.shapes) if (this.shapes[id].el.isPointInFill(pt)) return { id: id, province: null };
    return null;
  };
  // Fly to the blue dot, zoomed in on the About island, then, after a moment there, on to the site's about page.
  MapView.prototype.goHere = function (opts) {
    opts = opts || {};
    var w = this.world, self = this;
    var go = opts.go || function () { window.location.href = "/#about"; };
    if (!w || !w.here) { go(); return; }
    var target = this.viewFor({ x: w.here[0] - 14, y: w.here[1] - 9, w: 28, h: 18 }, { pad: 1, maxZoom: 4.5 });
    this.hereFlight = true;
    this.flyTo(target, { duration: 1100, done: function () {
      self.host.classList.add("is-here");
      setTimeout(function () { self.hereFlight = false; go(); }, reduceMotion.matches ? 120 : 650);
    } });
  };
  MapView.prototype.setHover = function (h) {
    if (h && h.here) { this.host.classList.add("is-over"); if (this.hover) { this.hover = null; this._tint(); } return; }
    var a = this.hover, same = (!a && !h) || (a && h && a.id === h.id && a.province === h.province);
    this.host.classList.toggle("is-over", !!h);
    if (same) return;
    this.hover = h;
    this._tint();
  };

  MapView.prototype._labels = function (g) {
    this.labelLayer = svg("g", { class: "map-labels" }, g);
    this.labels = [];
    this._addLabels(this.world.labels);
  };
  MapView.prototype._addLabels = function (list) {
    var self = this, lg = this.labelLayer, base = this.labels.length;
    list.forEach(function (l, n0) {
      var n = base + n0;
      var water = !!WATER[l.kind];
      var kind = l.kind;
      var floor = LABEL_FLOOR[kind] || 11, cap = Math.max(LABEL_CAP[kind] || 14, floor);
      var item = { l: l, floor: floor, cap: cap, shown: false };
      if (kind === "country") {
        item.rank = l.minZoom > 1 ? 30 : (self._tier(l.id) === "flagship" ? self._rank(l.id) : 20 + (40 - l.size));
        item.country = l.id;
      } else item.rank = LABEL_RANK[kind] || 95;
      var cls = "lbl k-" + kind + (water ? " is-water" : "");
      var gEl;
      // Each name is drawn once, on whichever copy of the world lies nearest the middle of the view.
      var wrap = svg("g", { class: "lbl-wrap" }, lg);
      item.wrap = wrap; item.k = 0;
      if (l.path) {
        // Lettering along the river's course: sized in world units, from the zoom.
        var id = "rp-" + n;
        svg("path", { id: id, d: "M" + l.path.map(function (p) { return p[0] + " " + p[1]; }).join("L"), fill: "none" }, wrap);
        gEl = svg("text", { class: cls + " lbl-path", dy: (l.size * 0.355).toFixed(2) }, wrap);
        gEl.style.setProperty("--ls", l.size);
        gEl.style.setProperty("--fl", floor / l.size);
        gEl.style.setProperty("--cap", cap / l.size);
        gEl.style.setProperty("--sp", l.spacing || 0);
        var tp = svg("textPath", { href: "#" + id, startOffset: "50%", "text-anchor": "middle" }, gEl);
        tp.textContent = l.text;
        var mid = l.path[Math.floor(l.path.length / 2)], a0 = l.path[Math.max(0, Math.floor(l.path.length / 2) - 2)], a1 = l.path[Math.min(l.path.length - 1, Math.floor(l.path.length / 2) + 2)];
        item.ox = mid[0]; item.oy = mid[1];
        item.angle = Math.atan2(a1[1] - a0[1], a1[0] - a0[0]) * 180 / Math.PI;
        item.box = { x: -l.text.length * l.size * 0.29, y: -l.size * 0.6, w: l.text.length * l.size * 0.58, h: l.size * 1.2 };
      } else {
        var ox = l.dot ? l.dot[0] : l.x, oy = l.dot ? l.dot[1] : l.y;
        gEl = svg("g", { class: cls }, wrap);
        gEl.style.transform = "translate(" + ox + "px," + oy + "px) scale(calc(clamp(" + (floor / l.size).toFixed(4) + ", var(--P), " + (cap / l.size).toFixed(4) + ") * var(--inv)))";
        // The offset from the dot is kept in label units, so the name stays beside its dot at every zoom.
        var inner = svg("g", { transform: "translate(" + (l.x - ox).toFixed(2) + " " + (l.y - oy).toFixed(2) + ") rotate(" + (l.angle || 0) + ")" }, gEl);
        var lines = l.lines || [l.text];
        var nudge = l.spacing ? (l.spacing * l.size) / 2 : 0;
        if (kind === "shield") {
          // A route number on a small rounded plate.
          var sw = (l.text.length * 0.62 + 0.7) * l.size, sh = l.size * 1.35;
          // Each country signs its routes its own way: the plate's colours (and for some, its shape) by style.
          var sign = l.shield || "yellow";
          if (sign === "badge" || sign === "interstate") {
            var bw = sw / 2, bh = sh / 2;
            svg("path", { class: "lbl-plate sign-" + sign, d: "M" + (-bw) + " " + (-bh) + "H" + bw + "V" + (bh * 0.35) + "Q" + bw + " " + (bh * 1.05) + " 0 " + (bh * 1.3) + "Q" + (-bw) + " " + (bh * 1.05) + " " + (-bw) + " " + (bh * 0.35) + "Z", "stroke-width": (l.size * 0.09).toFixed(2) }, inner);
          } else svg("rect", { class: "lbl-plate sign-" + sign, x: (-sw / 2).toFixed(2), y: (-sh / 2).toFixed(2), width: sw.toFixed(2), height: sh.toFixed(2), rx: (sh * (sign === "white" ? 0.18 : 0.28)).toFixed(2), "stroke-width": (l.size * 0.09).toFixed(2) }, inner);
          gEl.classList.add("sign-" + sign);
        }
        var t = svg("text", { "font-size": l.size, "text-anchor": "middle", "stroke-width": (l.size * 0.2).toFixed(2) }, inner);
        if (l.spacing) t.setAttribute("letter-spacing", (l.spacing * l.size).toFixed(2));
        lines.forEach(function (line, k) {
          var ts = svg("tspan", { x: nudge.toFixed(2), y: ((k - (lines.length - 1) / 2) * 1.12 * l.size + l.size * 0.355).toFixed(2) }, t);
          if (kind === "peak" && k > 0) { ts.setAttribute("font-size", (l.size * 0.85).toFixed(2)); ts.setAttribute("class", "lbl-sub"); }
          ts.textContent = line;
        });
        if (l.dot) symbolFor(kind, l.size, gEl, l.volcano);
        item.ox = ox; item.oy = oy;
        item.angle = 0;
        if (kind === "country") gEl.setAttribute("data-id", l.id);
        if (l.id === "about") gEl.setAttribute("data-here", "1");
        if (kind === "province") { gEl.setAttribute("data-id", l.parent); gEl.setAttribute("data-province", l.id); }
      }
      item.el = gEl;
      item.water = water;
      self.labels.push(item);
    });
    this.labelsMeasured = false;
  };

  // A place's symbol, in label units round its origin: a white dot in a dark ring for a town (larger for a city,
  // smaller for a village), a ring with a dark centre for a capital, a small triangle for a peak.
  var DOT = { capital: 0.34, city: 0.3, town: 0.25, village: 0.22 };
  function symbolFor(kind, size, parent, volcano) {
    if (kind === "peak") {
      var a = size * 0.42;
      if (volcano) {
        // A cone with its crater cut off the top.
        svg("path", { class: "lbl-peak is-volcano", d: "M" + (-a * 0.32).toFixed(2) + " " + (-a * 0.7).toFixed(2) + "L" + (a * 0.32).toFixed(2) + " " + (-a * 0.7).toFixed(2) + "L" + (a * 1.0).toFixed(2) + " " + (a * 0.7).toFixed(2) + "L" + (-a * 1.0).toFixed(2) + " " + (a * 0.7).toFixed(2) + "Z" }, parent);
        return;
      }
      svg("path", { class: "lbl-peak", d: "M0 " + (-a).toFixed(2) + "L" + (a * 0.95).toFixed(2) + " " + (a * 0.7).toFixed(2) + "L" + (-a * 0.95).toFixed(2) + " " + (a * 0.7).toFixed(2) + "Z" }, parent);
      return;
    }
    var rad = size * (DOT[kind] || 0.24);
    svg("circle", { class: "lbl-dot", r: rad.toFixed(2), "stroke-width": (rad * (kind === "village" ? 0.4 : 0.5)).toFixed(2) }, parent);
    if (kind === "capital") svg("circle", { class: "lbl-dot-in", r: (rad * 0.42).toFixed(2) }, parent);
  }

  MapView.prototype._tier = function (id) { var p = this.projectsById && this.projectsById[id]; return p ? p.tier : "small"; };
  MapView.prototype._rank = function (id) { var p = this.projectsById && this.projectsById[id]; return p && p.rank ? p.rank : 10; };

  // Each label's box, in label units, once the fonts are in.
  // onlyNew: measure only labels not yet measured (the finer detail's, as they arrive).
  MapView.prototype.measureLabels = function (onlyNew) {
    var self = this;
    this.labels.forEach(function (it) {
      if (it.l.path || (onlyNew && it.box)) return;
      // getBBox ignores the group's own transform, so this is the box in label units around the label's origin.
      var b = it.el.getBBox();
      it.box = { x: b.x, y: b.y, w: b.width, h: b.height };
      if (it.l.angle) it.tw = self._textWidth(it);
    });
    this.labelsMeasured = true;
  };

  // Which labels show at this zoom: by rank, never overlapping, never too small.
  MapView.prototype.placeLabels = function () {
    if (!this.labels) return;
    if (!this.labelsMeasured) this.measureLabels(true);
    // Below zoom 1 (the whole world beside the panel) the first labels still show; collisions thin them.
    var z = Math.max(this.zoom(), 1), s = this.s, Ppx = this.labelScale(), size = this.size();
    var r = this.rect(), ins = this.insets;
    // The controls floating over the map (search, the corner's scale, the buttons) are kept clear of lettering.
    var placed = (this.obstacles ? this.obstacles() : []).map(function (b) {
      return { x: b.left + b.width / 2, y: b.top + b.height / 2, hw: b.width / 2 + 2, hh: b.height / 2 + 2, a: 0 };
    }), self = this;
    var order = this.labels.slice().sort(function (a, b) {
      var sa = a.country && a.country === self.selected ? -1 : a.rank;
      var sb = b.country && b.country === self.selected ? -1 : b.rank;
      return sa - sb;
    });
    var fixedCount = placed.length;
    function obstacleHit(box) { return placed.slice(0, fixedCount).some(function (q) { return overlap(box, q); }); }
    var hidden = this.hiddenKinds || {};
    order.forEach(function (it) {
      var l = it.l, show = false;
      if (hidden[l.kind]) { if (it.shown) { it.shown = false; it.el.classList.remove("is-on"); } return; }
      var forced = it.country && it.country === self.selected;
      var inProvince = l.kind === "province" && self.selected === l.parent;
      if ((z + 1e-6 >= l.minZoom) || forced || (inProvince && z * 1.6 >= l.minZoom)) {
        var px = clamp(Ppx * l.size, it.floor, it.cap);
        var k = px / l.size; // screen px per label unit
        var span = self.world.width * s, rcx = r.l + r.w / 2;
        var kc = Math.round((rcx - (it.ox * s + self.tx)) / span);
        if (kc !== it.k) { it.k = kc; it.wrap.setAttribute("transform", kc ? "translate(" + kc * self.world.width + " 0)" : ""); }
        var cx = it.ox * s + self.tx + kc * span, cy = it.oy * s + self.ty;
        var b = it.box, a = (it.l.path ? it.angle : 0) * Math.PI / 180;
        var bx = (b.x + b.w / 2) * k, by = (b.y + b.h / 2) * k;
        var ccx = cx + bx * Math.cos(a) - by * Math.sin(a), ccy = cy + bx * Math.sin(a) + by * Math.cos(a);
        var hw = b.w * k / 2 + 2, hh = b.h * k / 2 + 1.5;
        var ang = it.l.path ? a : (l.angle || 0) * Math.PI / 180;
        if (!it.l.path) {
          // The box from getBBox is axis-aligned around the rotated text; use the text's own box when rotated.
          if (l.angle) {
            var lines = l.lines || [l.text];
            var longest = 0;
            lines.forEach(function (x) { longest = Math.max(longest, x.length); });
            var tw = it.tw || (it.tw = self._textWidth(it));
            hw = tw * k / 2 + 2; hh = lines.length * 1.12 * l.size * k / 2 + 1.5;
            ccx = cx + (l.x - it.ox) * k; ccy = cy + (l.y - it.oy) * k;
          } else ang = 0;
        }
        var box = { x: ccx, y: ccy, hw: hw, hh: hh, a: ang };
        var M = self.M;
        var ex = Math.abs(hw * Math.cos(ang)) + Math.abs(hh * Math.sin(ang)), ey = Math.abs(hw * Math.sin(ang)) + Math.abs(hh * Math.cos(ang));
        var on = ccx + ex > -M && ccx - ex < size.w + M && ccy + ey > -M && ccy - ey < size.h + M;
        // Never half under the panel or the sheet.
        if (ins.left && ccx - ex < r.l + 4 && ccx + ex > r.l - 4) on = false;
        if (ins.bottom && ccy + ey > r.b - 4 && ccy - ey < r.b + 4) on = false;
        if (on) {
          show = !placed.some(function (q) { return overlap(box, q); }) || !!(forced && !obstacleHit(box));
          if (show) placed.push(box);
        }
      }
      show = !!show;
      if (show !== !!it.shown) {
        it.shown = show;
        // (Always with an explicit true or false: toggle with no second argument flips the class instead.)
        it.el.classList.toggle("is-on", show);
      }
    });
  };
  MapView.prototype._textWidth = function (it) {
    var t = it.el.querySelector("text");
    var w = 0;
    $$("tspan", t).forEach(function (ts) { w = Math.max(w, ts.getComputedTextLength()); });
    return w || it.box.w;
  };
  function overlap(a, b) {
    // Separating axes for two rotated rectangles.
    var axes = [a.a, a.a + Math.PI / 2, b.a, b.a + Math.PI / 2];
    var dx = b.x - a.x, dy = b.y - a.y;
    for (var i = 0; i < 4; i++) {
      var ux = Math.cos(axes[i]), uy = Math.sin(axes[i]);
      var d = Math.abs(dx * ux + dy * uy);
      var ra = Math.abs(a.hw * Math.cos(a.a - axes[i])) + Math.abs(a.hh * Math.sin(a.a - axes[i]));
      var rb = Math.abs(b.hw * Math.cos(b.a - axes[i])) + Math.abs(b.hh * Math.sin(b.a - axes[i]));
      if (d > ra + rb) return false;
    }
    return true;
  }

  // Screen pixels per label unit: the labels read as on the contact sheets at zoom 1 and grow gently with zoom.
  // Tied to the map's scale, so a label is the same size on a phone and a desktop showing the same part of the world.
  MapView.prototype.labelScale = function () {
    return 0.977 * Math.pow(this.s, 0.78);
  };

  // A frame: during a gesture, the last drawing is moved and scaled as it is, if it still covers the screen; otherwise,
  // and once the map rests, the vectors and labels are drawn afresh.
  MapView.prototype.render = function (now, fast) {
    var self = this;
    if (now) return this._draw();
    this.fastFrame = this.pending ? this.fastFrame && !!fast : !!fast;
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(function () {
      self.pending = false;
      if (self.fastFrame && self._covered()) self._compose();
      else self._draw();
    });
  };
  MapView.prototype._covered = function () {
    var c = this.c;
    if (!c) return false;
    var k = this.s / c.s;
    if (k < 0.7 || k > 1.6) return false;
    var z = this.size(), M = this.M;
    var x0 = -this.tx / this.s, x1 = (z.w - this.tx) / this.s, y0 = -this.ty / this.s, y1 = (z.h - this.ty) / this.s;
    var rx0 = (-M - c.tx) / c.s, rx1 = (z.w + M - c.tx) / c.s, ry0 = (-M - c.ty) / c.s, ry1 = (z.h + M - c.ty) / c.s;
    return x0 >= rx0 && x1 <= rx1 && y0 >= ry0 && y1 <= ry1;
  };
  MapView.prototype._compose = function () {
    var self = this, c = this.c, M = this.M, k = this.s / c.s;
    var dx = this.tx + M - k * (c.tx + M), dy = this.ty + M - k * (c.ty + M);
    this.svg.style.transform = "translate(" + dx.toFixed(2) + "px," + dy.toFixed(2) + "px) scale(" + k.toFixed(5) + ")";
    clearTimeout(this.idle);
    this.idle = setTimeout(function () { if (!self.anim) self.render(); }, 140);
    this.onView(this);
  };
  MapView.prototype._draw = function () {
    if (!this.world) return;
    clearTimeout(this.idle);
    var s = this.s, z = this.zoom(), M = this.M, W = this.world.width, span = W * s;
    // At rest, the view's offset is brought back to the copy of the world under the middle of the map.
    if (!this.anim && !this.interacting) {
      var r = this.rect(), q = Math.floor((r.l + r.w / 2 - this.tx) / span);
      if (q) this.tx += q * span;
    }
    var k0 = Math.floor((-M - this.tx) / span), k1 = Math.floor((this.size().w + M - this.tx) / span), ks = [];
    for (var k = k0; k <= k1; k++) ks.push(k);
    this.copies = ks;
    for (var li = 0; li < this.layers.length; li++) if (this.layers[li].tpl) this._place(this.layers[li]);
    this.c = { s: s, tx: this.tx, ty: this.ty };
    this.svg.style.transform = "";
    this.root.setAttribute("transform", "matrix(" + s + " 0 0 " + s + " " + (this.tx + M) + " " + (this.ty + M) + ")");
    var st = this.root.style;
    st.setProperty("--P", this.labelScale().toFixed(4));
    st.setProperty("--inv", (1 / s).toFixed(5));
    st.setProperty("--px", (1 / s).toFixed(5) + "px");
    this.host.classList.toggle("is-z15", z >= 1.4);
    this.host.classList.toggle("is-z2", z >= 1.9);
    this.host.classList.toggle("is-z3", z >= 2.9);
    this.host.classList.toggle("is-z35", z >= 3.4);
    this.host.classList.toggle("is-z4", z >= 3.9);
    this.host.classList.toggle("is-z5", z >= 4.9);
    if (z >= 3.3 && this.detail && !this.anim && !this.interacting) this._loadChunks();
    if (z >= 1.3 && !this.detailAsked && !this.anim && !this.interacting) this._loadDetail();
    this.placeLabels();
    if (!this.anim && !this.interacting) this.tiles.update();
    if (this.onDraw) this.onDraw(this);
    this.onView(this);
  };

  // ------------------------------------------------------------ finer detail

  // The world's finer detail, fetched the first time the map is zoomed in: national parks, streams, roads and
  // streets, ferries, the larger countries' subdivisions, and the names of small places and features.
  MapView.prototype._loadDetail = function () {
    var self = this, w = this.world;
    this.detailAsked = true;
    if (!w || !w.detail) return;
    getJSON(ROOT + "worlds/" + w.detail.src).then(function (d) {
      if (self.world !== w) return;
      self.detail = d;
      self.chunksAsked = {};
      var P = self.parkLayer.tpl;
      d.parks.forEach(function (p) { svg("path", { class: "map-park is-" + (p.kind || "park"), d: p.path, "data-park": p.id }, P); });
      if (d.wadis) svg("path", { class: "map-wadi", d: d.wadis }, self.streamTpl);
      if (d.streams) svg("path", { class: "map-stream", d: d.streams }, self.streamTpl);
      if (d.lakes) svg("path", { class: "map-small-lakes", d: d.lakes }, self.reservoirTpl);
      var R = self.roadLayer.tpl;
      // Lowest first: streets (from the chunks, under everything), local and secondary roads, the town arterials and
      // rings, trunk roads, motorways, and the ferries.
      self.streetTpl = svg("g", { class: "map-streets" }, R);
      ["local", "secondary", "arterial", "ring", "trunk", "motorway"].forEach(function (k) { if (d.roads[k]) svg("path", { class: "map-road r-" + k, d: d.roads[k] }, R); });
      // A causeway: a road on a pale embankment across the water.
      if (d.causeway) { svg("path", { class: "map-causeway", d: d.causeway }, R); svg("path", { class: "map-road r-causeway", d: d.causeway }, R); }
      if (d.ferries) svg("path", { class: "map-ferry", d: d.ferries }, R);
      if (d.admin) svg("path", { class: "map-subdiv", d: d.admin }, self.adminTpl);
      [self.parkLayer, self.waterLayer, self.roadLayer, self.lineLayer].forEach(function (L) { self._refresh(L); });
      self._addLabels(d.labels);
      self.host.classList.add("has-detail");
      self.render(true);
    }).catch(function () {});
  };

  // The finest detail (streets, lanes, and the smallest lakes), in chunks of the map, fetched for the part in view.
  MapView.prototype._loadChunks = function () {
    var self = this, w = this.world, C = w.detail && w.detail.chunks;
    if (!C || !this.streetTpl) return;
    var W = w.width, H = w.height, s = this.s, r = this.rect(), M = 40;
    var x0 = (r.l - this.tx) / s - M, x1 = (r.l + r.w - this.tx) / s + M, y0 = (r.t - this.ty) / s - M, y1 = (r.t + r.h - this.ty) / s + M;
    var want = [];
    for (var cy = Math.max(0, Math.floor(y0 / C.size)); cy <= Math.min(C.rows - 1, Math.floor(y1 / C.size)); cy++) {
      for (var gx = Math.floor(x0 / C.size); gx <= Math.floor(x1 / C.size); gx++) {
        var cx = ((gx % C.cols) + C.cols) % C.cols, key = cx + "-" + cy;
        if (!this.chunksAsked[key] && want.indexOf(key) < 0) want.push(key);
      }
    }
    want.forEach(function (key) {
      self.chunksAsked[key] = true;
      getJSON(ROOT + "worlds/" + C.src + key + ".json").then(function (c) {
        if (self.world !== w) return;
        if (c.minor) svg("path", { class: "map-road r-minor", d: c.minor }, self.streetTpl);
        if (c.street) svg("path", { class: "map-road r-street", d: c.street }, self.streetTpl);
        if (c.lakes) svg("path", { class: "map-small-lakes", d: c.lakes }, self.reservoirTpl);
        self._refresh(self.roadLayer);
        self._refresh(self.waterLayer);
      }).catch(function () { self.chunksAsked[key] = false; });
    });
  };

  // ------------------------------------------------------------ finer tiles

  // Zoomed in, the land-cover picture is drawn again from finer tiles, for the part of the map in view only, so it
  // stays sharp to the 4x limit on a high-density screen. The whole-world picture stays underneath, so a tile still
  // on its way shows the same land, only softer.
  function Tiles(view) {
    this.view = view;
    this.els = {};
    this.level = null;
  }
  Tiles.prototype.levelFor = function () {
    var v = this.view, w = v.world, T = w.tiles;
    if (!T || !T.levels || !T.levels.length) return null;
    // Pixels the screen shows per map unit, counted to 2x at most: beyond that the eye gains little, and a phone's
    // first view then needs only the whole-world picture.
    var need = v.s * Math.min(window.devicePixelRatio || 1, 2), base = w.image.width / w.width;
    if (need <= base * 1.3) return null;
    var lv = null;
    // The coarsest level with a pixel for every screen pixel (within a few per cent).
    for (var i = 0; i < T.levels.length; i++) { lv = T.levels[i]; if (lv.scale * 1.05 >= need) break; }
    return lv;
  };
  Tiles.prototype.update = function () {
    var v = this.view, w = v.world, T = w.tiles, lv = this.levelFor(), want = {}, self = this;
    this.level = lv;
    if (lv) {
      var z = v.size(), margin = 96, W = w.width, H = w.height, u = lv.unit;
      var x0 = (-margin - v.tx) / v.s, x1 = (z.w + margin - v.tx) / v.s;
      var y0 = (-margin - v.ty) / v.s, y1 = (z.h + margin - v.ty) / v.s;
      var r0 = Math.max(0, Math.floor(y0 / u)), r1 = Math.min(lv.rows - 1, Math.floor(y1 / u));
      for (var k = Math.floor(x0 / W); k <= Math.floor(x1 / W); k++) {
        for (var col = 0; col < lv.cols; col++) {
          var tx0 = col * u + k * W, tx1 = Math.min(W, (col + 1) * u) + k * W;
          if (tx1 < x0 || tx0 > x1) continue;
          for (var row = r0; row <= r1; row++) {
            var idx = row * lv.cols + col;
            if (!((parseInt(lv.has.charAt(idx >> 2), 16) >> (idx & 3)) & 1)) continue;
            want[lv.scale + "/" + col + "-" + row + "@" + k] = { lv: lv, col: col, row: row, k: k };
          }
        }
      }
      void H;
    }
    var pending = 0;
    Object.keys(want).forEach(function (key) {
      if (!self.els[key]) self.els[key] = self._make(want[key]);
      if (!self.els[key].loaded) pending++;
    });
    // Tiles out of view go at once; tiles of another level wait until this level's are in.
    Object.keys(this.els).forEach(function (key) {
      if (want[key]) return;
      var el = self.els[key];
      if (lv && el.scale === lv.scale) { el.node.remove(); delete self.els[key]; }
      else if (!pending || !lv) { el.node.remove(); delete self.els[key]; }
    });
    this.pending = pending;
  };
  Tiles.prototype._make = function (t) {
    var v = this.view, w = v.world, lv = t.lv, self = this;
    var px = Math.min(lv.size, Math.round(w.width * lv.scale) - t.col * lv.size), py = Math.min(lv.size, Math.round(w.height * lv.scale) - t.row * lv.size);
    var node = svg("image", {
      class: "map-tile", x: t.col * lv.unit + t.k * w.width, y: t.row * lv.unit,
      width: px / lv.scale, height: py / lv.scale, preserveAspectRatio: "none"
    }, v.tileHost);
    var el = { node: node, scale: lv.scale, url: ROOT + "worlds/" + w.tiles.src + lv.scale + "/" + t.col + "-" + t.row + ".png", loaded: false };
    node.addEventListener("load", function () {
      el.loaded = true;
      node.classList.add("is-in");
      if (self.pending && !--self.pending) self.update();
    });
    node.addEventListener("error", function () { el.loaded = true; });
    v.picture(el.url).then(function (href) { node.setAttribute("href", href); });
    return el;
  };

  // ------------------------------------------------------------ selection

  MapView.prototype.select = function (id, province, opts) {
    opts = opts || {};
    $$(".lbl.is-sel", this.labelLayer).forEach(function (e) { e.classList.remove("is-sel"); });
    this.selected = id && this.shapes[id] ? id : null;
    this.selectedProvince = this.selected && province && this.shapes[id].provinces[province] ? province : null;
    this.hover = null;
    this._tint();
    if (!this.selected) { this.render(); return; }
    var sel = this.selectedProvince;
    $$('.lbl[data-id="' + id + '"]', this.labelLayer).forEach(function (e) {
      if (!e.hasAttribute("data-province") || e.getAttribute("data-province") === sel) e.classList.add("is-sel");
    });
    if (opts.fly !== false) this.flyTo(this.viewOf(id, province), { duration: opts.instant ? 1 : undefined });
    else this.render();
  };
  // The view that frames a country, or one of its provinces, beside the panel.
  MapView.prototype.viewOf = function (id, province) {
    var sh = this.shapes[id], target = province && sh.provinces[province] ? sh.provinces[province] : sh;
    return this.viewFor(this.focusBox(target.shape), { maxZoom: province ? 3.2 : 2.8 });
  };
  // The part of a country worth framing: its whole extent, unless far-flung islets make that much larger than its mainland.
  MapView.prototype.focusBox = function (shape) {
    var biggest = null, bigA = 0;
    shape.rings.forEach(function (r) {
      var a = 0;
      for (var k = 0; k < r.length; k++) { var p = r[k], q = r[(k + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; }
      a = Math.abs(a / 2);
      if (a > bigA) { bigA = a; biggest = r; }
    });
    if (!biggest || bigA > shape.area * 0.6) return shape.box;
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    shape.rings.forEach(function (r) {
      var a = 0;
      for (var k = 0; k < r.length; k++) { var p = r[k], q = r[(k + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; }
      if (Math.abs(a / 2) < bigA * 0.08) return;
      r.forEach(function (p) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; });
    });
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };

  // ------------------------------------------------------------ gestures

  MapView.prototype._bind = function () {
    var self = this, el = this.svg;
    var pointers = new Map(), drag = null, pinch = null, moved = 0, downAt = 0, vel = [0, 0], lastMove = 0;

    el.addEventListener("pointerdown", function (e) {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      self.stop();
      self.interacting = true;
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pointers.size === 1) {
        drag = { x: e.clientX, y: e.clientY, tx: self.tx, ty: self.ty, target: e.target };
        moved = 0; downAt = performance.now(); vel = [0, 0]; lastMove = downAt;
      } else if (pointers.size === 2) {
        var pts = Array.from(pointers.values());
        pinch = { d: Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]), m: mid(pts), s: self.s, tx: self.tx, ty: self.ty };
        drag = null; moved = 99;
      }
      self.host.classList.add("is-grabbing");
    });
    // A mouse resting over a country tints it.
    var hoverRaf = 0, hoverAt = null;
    el.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse" || pointers.size || !self.world) return;
      hoverAt = [e.clientX, e.clientY];
      if (hoverRaf) return;
      hoverRaf = requestAnimationFrame(function () { hoverRaf = 0; if (!pointers.size && hoverAt) self.setHover(self.hitAt(hoverAt[0], hoverAt[1])); });
    });
    el.addEventListener("pointerleave", function () { hoverAt = null; if (self.world) self.setHover(null); });
    el.addEventListener("pointermove", function (e) {
      if (!pointers.has(e.pointerId)) return;
      var prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pinch && pointers.size >= 2) {
        var pts = Array.from(pointers.values()).slice(0, 2), m = mid(pts);
        var d = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]);
        var s = pinch.s * d / pinch.d;
        var wx = (pinch.m[0] - pinch.tx) / pinch.s, wy = (pinch.m[1] - pinch.ty) / pinch.s;
        var cs = clamp(s, self.limits().min, self.limits().max);
        self.set({ s: cs, tx: m[0] - wx * cs, ty: m[1] - wy * cs }, true);
      } else if (drag) {
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        moved = Math.max(moved, Math.hypot(dx, dy));
        if (moved > 3) {
          var now = performance.now(), dt = Math.max(now - lastMove, 1);
          vel = [0.8 * (e.clientX - prev[0]) / dt + 0.2 * vel[0], 0.8 * (e.clientY - prev[1]) / dt + 0.2 * vel[1]];
          lastMove = now;
          self.set({ s: self.s, tx: drag.tx + dx, ty: drag.ty + dy }, true);
        }
      }
    });
    function up(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (pinch && pointers.size < 2) {
        pinch = null;
        if (pointers.size === 1) {
          var p = Array.from(pointers.values())[0];
          drag = { x: p[0], y: p[1], tx: self.tx, ty: self.ty };
        }
      }
      if (pointers.size) return;
      self.interacting = false;
      self.host.classList.remove("is-grabbing");
      if (drag && moved <= 4 && e.type === "pointerup") {
        var hit = self.hitAt(e.clientX, e.clientY);
        if (hit && hit.here) self.goHere();
        else if (hit) self.onSelect(hit.id, hit.province);
        else self.onSelect(null);
        if (!self.anim) self.render();
      } else if (drag && performance.now() - lastMove < 60 && Math.hypot(vel[0], vel[1]) > 0.25 && !reduceMotion.matches) {
        glide(vel);
      }
      drag = null;
    }
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);

    function glide(v) {
      var a = { raf: 0 }, last = performance.now();
      self.anim = a;
      function frame(now) {
        if (self.anim !== a) return;
        var dt = Math.min(now - last, 40); last = now;
        var decay = Math.exp(-dt / 280);
        v = [v[0] * decay, v[1] * decay];
        self.set({ s: self.s, tx: self.tx + v[0] * dt, ty: self.ty + v[1] * dt }, true);
        if (Math.hypot(v[0], v[1]) > 0.02) a.raf = requestAnimationFrame(frame);
        else { self.anim = null; self.render(); }
      }
      a.raf = requestAnimationFrame(frame);
    }

    // Wheel and trackpad: eased toward a target scale, anchored at the pointer.
    var wheel = null;
    el.addEventListener("wheel", function (e) {
      e.preventDefault();
      var dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(dy) * 1.5 && e.deltaMode === 0) {
        self.stop(); self.set({ s: self.s, tx: self.tx - e.deltaX, ty: self.ty - dy }, true);
        return;
      }
      var k = Math.exp(-dy * (e.ctrlKey ? 0.012 : 0.0024));
      var lim = self.limits();
      if (!wheel || !self.anim || self.anim !== wheel.a) {
        self.stop();
        wheel = { a: { raf: 0 }, target: self.s };
      }
      wheel.target = clamp(wheel.target * k, lim.min, lim.max);
      wheel.x = e.clientX; wheel.y = e.clientY;
      if (reduceMotion.matches || e.ctrlKey) {
        self.zoomAt(wheel.target / self.s, wheel.x, wheel.y, false);
        wheel = null;
        return;
      }
      if (!wheel.a.raf) {
        self.anim = wheel.a;
        var w = wheel;
        var step = function () {
          if (self.anim !== w.a) return;
          var f = Math.pow(w.target / self.s, 0.28);
          var wx = (w.x - self.tx) / self.s, wy = (w.y - self.ty) / self.s, s = self.s * f;
          self.set({ s: s, tx: w.x - wx * s, ty: w.y - wy * s }, true);
          if (Math.abs(Math.log(w.target / self.s)) > 0.002) w.a.raf = requestAnimationFrame(step);
          else { self.anim = null; w.a.raf = 0; self.render(); }
        };
        wheel.a.raf = requestAnimationFrame(step);
      }
    }, { passive: false });

    el.addEventListener("dblclick", function (e) {
      e.preventDefault();
      self.zoomAt(e.shiftKey ? 0.5 : 2, e.clientX, e.clientY, true);
    });

    el.addEventListener("keydown", function (e) {
      var step = 80;
      var map = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
      if (map[e.key]) {
        e.preventDefault();
        self.flyTo({ s: self.s, tx: self.tx + map[e.key][0], ty: self.ty + map[e.key][1] }, { duration: 200 });
      } else if (e.key === "+" || e.key === "=") { e.preventDefault(); self.zoomBy(1.6); }
      else if (e.key === "-" || e.key === "_") { e.preventDefault(); self.zoomBy(1 / 1.6); }
    });

    function mid(pts) { return [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2]; }
  };

  window.PortfolioMap = { MapView: MapView, shapeOf: shapeOf, store: store, getJSON: getJSON, svg: svg, $: $, $$: $$, clamp: clamp, ROOT: ROOT, reduceMotion: reduceMotion };
})();

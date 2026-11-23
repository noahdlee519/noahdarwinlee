// The portfolio map: one imaginary world per visit, drawn as an SVG, with a mapping app's interface around it.
// The world files come from tools/worlds/generate.mjs; the content from projects.json and about.json.
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var ROOT = "/portfolio-map/";
  var MAX_ZOOM = 4;
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
  var LABEL_FLOOR = { country: 11.5, ocean: 12, sea: 11, capital: 11.5, province: 11, range: 10.5, lake: 11, strait: 10.5, river: 11, town: 11 };
  var LABEL_CAP = { country: 34, ocean: 24, sea: 16, capital: 14, province: 15, range: 14, lake: 15, strait: 13, river: 13.5, town: 12.5 };
  var LABEL_RANK = { ocean: 40, sea: 50, province: 52, capital: 60, range: 70, lake: 75, strait: 80, river: 85, town: 90 };
  var WATER = { sea: 1, ocean: 1, lake: 1, strait: 1, river: 1 };

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
    var tx = v.tx, ty = v.ty;
    if (W * s <= r.w + 0.5) tx = r.l + (r.w - W * s) / 2;
    else tx = clamp(tx, r.r - W * s, r.l);
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

  MapView.prototype.load = function (world) {
    var self = this, P = world.palette;
    this.stop();
    this.world = world;
    this.root.textContent = "";
    this.ocean.setAttribute("fill", P.water);
    this.host.style.setProperty("--water", P.water);
    var W = world.width, H = world.height, g = this.root;
    var layers = {};
    // A quiet stand-in for the land until the land-cover picture arrives.
    layers.land = svg("path", { class: "map-land", d: world.coast, fill: P.grass }, g);
    var image = svg("image", { class: "map-image", x: 0, y: 0, width: W, height: H, preserveAspectRatio: "none" });
    this.imageReady = new Promise(function (resolve) {
      var img = new Image();
      img.decoding = "async";
      img.onload = img.onerror = function () {
        image.setAttribute("href", img.src);
        requestAnimationFrame(function () { image.classList.add("is-in"); resolve(); });
      };
      img.src = ROOT + "worlds/" + world.image.src;
    });
    world.order.forEach(function (name) {
      if (name === "image") g.appendChild(image);
      else if (name === "rivers") {
        var rg = svg("g", { class: "map-rivers", stroke: P.line }, g);
        world.rivers.slice().sort(function (a, b) { return b.width - a.width; }).forEach(function (r) {
          var p = svg("path", { d: r.path, "data-min": r.minZoom }, rg);
          p.style.setProperty("--rw", r.width + "px");
          if (r.minZoom > 1) p.classList.add("is-minor");
        });
        layers.rivers = rg;
      } else if (name === "sea") {
        svg("path", { class: "map-sea", d: "M" + -W * 3 + " " + -H * 3 + "H" + W * 4 + "V" + H * 4 + "H" + -W * 3 + "Z" + world.coast, fill: P.water, "fill-rule": "evenodd" }, g);
      } else if (name === "lakes" && world.lakes) {
        svg("path", { class: "map-lakes", d: world.lakes, fill: P.water, stroke: P.line }, g);
      } else if (name === "coast") {
        svg("path", { class: "map-coast", d: world.coast, stroke: P.line }, g);
      } else if (name === "estuaries" && world.estuaries && world.estuaries.fill) {
        svg("path", { class: "map-estuary", d: world.estuaries.fill, fill: P.water }, g);
        svg("path", { class: "map-coast", d: world.estuaries.edge, stroke: P.line }, g);
        self._countries(g);
      } else if (name === "provinceBorders" && world.provinceBorders) {
        if (!layers.countries) self._countries(g);
        svg("path", { class: "map-provinces", d: world.provinceBorders, stroke: P.province }, g);
      } else if (name === "borders") {
        if (!self.countryLayer) self._countries(g);
        svg("path", { class: "map-borders", d: world.borders, stroke: P.border }, g);
        self.outline = svg("g", { class: "map-outline" }, g);
      } else if (name === "labels") {
        self._labels(g);
      }
    });
    if (!this.countryLayer || this.countryLayer.parentNode !== g) this._countries(g);
    this.selected = null; this.selectedProvince = null;
    this.render(true);
  };

  MapView.prototype._countries = function (g) {
    var self = this;
    if (this.countryLayer && this.countryLayer.parentNode === g) return;
    var cg = svg("g", { class: "map-countries" }, g);
    this.countryLayer = cg;
    this.shapes = {};
    this.world.projects.forEach(function (p) {
      var path = svg("path", { class: "map-country", d: p.path, "data-id": p.id }, cg);
      self.shapes[p.id] = { el: path, shape: shapeOf(p.path), project: p, provinces: {} };
      (p.provinces || []).forEach(function (v) {
        var pv = svg("path", { class: "map-province", d: v.path, "data-id": p.id, "data-province": v.id }, cg);
        self.shapes[p.id].provinces[v.id] = { el: pv, shape: shapeOf(v.path) };
      });
    });
  };

  MapView.prototype._labels = function (g) {
    var self = this, P = this.world.palette;
    var lg = svg("g", { class: "map-labels" }, g);
    this.labelLayer = lg;
    this.labels = [];
    this.world.labels.forEach(function (l, n) {
      var water = !!WATER[l.kind];
      var kind = l.kind;
      var floor = LABEL_FLOOR[kind] || 11, cap = Math.max(LABEL_CAP[kind] || 14, floor);
      var item = { l: l, floor: floor, cap: cap, shown: false };
      if (kind === "country") {
        var proj = self.world.projects.filter(function (p) { return p.id === l.id; })[0];
        item.rank = l.minZoom > 1 ? 30 : (self._tier(l.id) === "flagship" ? self._rank(l.id) : 20 + (40 - l.size));
        item.country = l.id;
        void proj;
      } else item.rank = LABEL_RANK[kind] || 95;
      var cls = "lbl k-" + kind + (water ? " is-water" : "");
      var gEl;
      if (l.path) {
        // Lettering along the river's course: sized in world units, from the zoom.
        var id = "rp-" + n;
        svg("path", { id: id, d: "M" + l.path.map(function (p) { return p[0] + " " + p[1]; }).join("L"), fill: "none" }, lg);
        gEl = svg("text", { class: cls + " lbl-path", dy: (l.size * 0.355).toFixed(2) }, lg);
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
        gEl = svg("g", { class: cls }, lg);
        gEl.style.transform = "translate(" + ox + "px," + oy + "px) scale(calc(clamp(" + (floor / l.size).toFixed(4) + ", var(--P), " + (cap / l.size).toFixed(4) + ") * var(--inv)))";
        // The offset from the dot is kept in label units, so the name stays beside its dot at every zoom.
        var inner = svg("g", { transform: "translate(" + (l.x - ox).toFixed(2) + " " + (l.y - oy).toFixed(2) + ") rotate(" + (l.angle || 0) + ")" }, gEl);
        var lines = l.lines || [l.text];
        var nudge = l.spacing ? (l.spacing * l.size) / 2 : 0;
        var t = svg("text", { "font-size": l.size, "text-anchor": "middle", "stroke-width": (l.size * 0.2).toFixed(2) }, inner);
        if (l.spacing) t.setAttribute("letter-spacing", (l.spacing * l.size).toFixed(2));
        lines.forEach(function (line, k) {
          var ts = svg("tspan", { x: nudge.toFixed(2), y: ((k - (lines.length - 1) / 2) * 1.12 * l.size + l.size * 0.355).toFixed(2) }, t);
          ts.textContent = line;
        });
        if (l.dot) {
          var rad = l.size * (kind === "capital" ? 0.3 : 0.24);
          svg("circle", { class: "lbl-dot", r: rad.toFixed(2), "stroke-width": (rad * 0.55).toFixed(2) }, gEl);
          if (kind === "capital") svg("circle", { class: "lbl-dot-in", r: (rad * 0.35).toFixed(2) }, gEl);
        }
        item.ox = ox; item.oy = oy;
        item.angle = 0;
        if (kind === "country") gEl.setAttribute("data-id", l.id);
        if (kind === "province") { gEl.setAttribute("data-id", l.parent); gEl.setAttribute("data-province", l.id); }
      }
      item.el = gEl;
      item.water = water;
      self.labels.push(item);
    });
    void P;
    this.labelsMeasured = false;
  };

  MapView.prototype._tier = function (id) { var p = this.projectsById && this.projectsById[id]; return p ? p.tier : "small"; };
  MapView.prototype._rank = function (id) { var p = this.projectsById && this.projectsById[id]; return p && p.rank ? p.rank : 10; };

  // Each label's box, in label units, once the fonts are in.
  MapView.prototype.measureLabels = function () {
    var self = this;
    this.labels.forEach(function (it) {
      if (it.l.path) return;
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
    if (!this.labelsMeasured) this.measureLabels();
    var z = this.zoom(), s = this.s, Ppx = this.labelScale(), size = this.size();
    var placed = [], self = this;
    var order = this.labels.slice().sort(function (a, b) {
      var sa = a.country && a.country === self.selected ? -1 : a.rank;
      var sb = b.country && b.country === self.selected ? -1 : b.rank;
      return sa - sb;
    });
    order.forEach(function (it) {
      var l = it.l, show = false;
      var forced = it.country && it.country === self.selected;
      var inProvince = l.kind === "province" && self.selected === l.parent;
      if ((z + 1e-6 >= l.minZoom) || forced || (inProvince && z * 1.6 >= l.minZoom)) {
        var px = clamp(Ppx * l.size, it.floor, it.cap);
        var k = px / l.size; // screen px per label unit
        var cx = it.ox * s + self.tx, cy = it.oy * s + self.ty;
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
        var on = ccx + hw > -M && ccx - hw < size.w + M && ccy + hh > -M && ccy - hh < size.h + M;
        if (on) {
          show = forced || !placed.some(function (q) { return overlap(box, q); });
          if (show) placed.push(box);
        }
      }
      if (show !== it.shown) {
        it.shown = show;
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
    var s = this.s, z = this.zoom(), M = this.M;
    this.c = { s: s, tx: this.tx, ty: this.ty };
    this.svg.style.transform = "";
    this.root.setAttribute("transform", "matrix(" + s + " 0 0 " + s + " " + (this.tx + M) + " " + (this.ty + M) + ")");
    var st = this.root.style;
    st.setProperty("--P", this.labelScale().toFixed(4));
    st.setProperty("--inv", (1 / s).toFixed(5));
    st.setProperty("--px", (1 / s).toFixed(5) + "px");
    this.host.classList.toggle("is-z2", z >= 1.9);
    this.host.classList.toggle("is-z3", z >= 2.9);
    this.placeLabels();
    this.onView(this);
  };

  // ------------------------------------------------------------ selection

  MapView.prototype.select = function (id, province, opts) {
    opts = opts || {};
    var self = this;
    if (this.selected && this.shapes[this.selected]) {
      this.shapes[this.selected].el.classList.remove("is-sel");
      var prov = this.shapes[this.selected].provinces;
      Object.keys(prov).forEach(function (k) { prov[k].el.classList.remove("is-sel"); });
    }
    $$(".lbl.is-sel", this.labelLayer).forEach(function (e) { e.classList.remove("is-sel"); });
    if (this.outline) this.outline.textContent = "";
    this.selected = id || null;
    this.selectedProvince = province || null;
    if (!id || !this.shapes[id]) { this.render(); return; }
    var sh = this.shapes[id];
    sh.el.classList.add("is-sel");
    var target = sh;
    if (province && sh.provinces[province]) {
      sh.provinces[province].el.classList.add("is-sel");
      target = sh.provinces[province];
    }
    $$('.lbl[data-id="' + id + '"]', this.labelLayer).forEach(function (e) {
      if (!e.hasAttribute("data-province") || e.getAttribute("data-province") === province) e.classList.add("is-sel");
    });
    var d = sh.project.path;
    svg("path", { class: "map-outline-glow", d: d }, this.outline);
    svg("path", { class: "map-outline-line", d: d }, this.outline);
    if (province && sh.provinces[province]) svg("path", { class: "map-outline-prov", d: sh.provinces[province].el.getAttribute("d") }, this.outline);
    if (opts.fly !== false) this.flyTo(this.viewFor(this.focusBox(target.shape), { maxZoom: province ? 3.2 : 2.8 }), { duration: opts.instant ? 1 : undefined });
    else this.render();
    void self;
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
      el.setPointerCapture(e.pointerId);
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
      self.host.classList.remove("is-grabbing");
      if (drag && moved <= 4 && e.type === "pointerup") {
        var t = document.elementFromPoint(e.clientX, e.clientY);
        var hit = t && t.closest && t.closest("[data-id]");
        if (hit && self.root.contains(hit)) self.onSelect(hit.getAttribute("data-id"), hit.getAttribute("data-province"));
        else self.onSelect(null);
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

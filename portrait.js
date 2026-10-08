(function () {
  "use strict";
  var $ = function (q) { return document.querySelector(q); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  (function () {
    var canvas = $("#tiles");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var SRC = canvas.getAttribute("data-src") || "/art/web/me-tiles-320.webp";
    var COLS = 16, ROWS = 25;

    var INKS = [[11, 11, 11], [42, 68, 214], [230, 128, 25], [255, 255, 255]];
    var INK_CSS = INKS.map(function (c) { return "rgb(" + c.join(",") + ")"; });
    var CIRCLE = Math.PI / 4;

    var PAIRS = [];
    for (var a = 0; a < 4; a++) {
      for (var b = 0; b < 4; b++) {
        if (a === b) continue;
        var mix = [0, 1, 2].map(function (k) { return INKS[a][k] * (1 - CIRCLE) + INKS[b][k] * CIRCLE; });
        PAIRS.push({ sq: a, ci: b, mix: mix, css: "rgb(" + mix.map(Math.round).join(",") + ")" });
      }
    }

    var imgW = 0, imgH = 0, SR, SG, SB, SL, SQ;
    function prep(img) {
      imgW = img.naturalWidth;
      imgH = img.naturalHeight;
      var c = document.createElement("canvas");
      c.width = imgW;
      c.height = imgH;
      var x = c.getContext("2d");
      x.drawImage(img, 0, 0);
      var d = x.getImageData(0, 0, imgW, imgH).data;
      var W1 = imgW + 1, N = W1 * (imgH + 1);
      SR = new Float64Array(N); SG = new Float64Array(N); SB = new Float64Array(N);
      SL = new Float64Array(N); SQ = new Float64Array(N);
      for (var y = 0; y < imgH; y++) {
        var r = 0, g = 0, bl = 0, l = 0, q = 0;
        for (var xx = 0; xx < imgW; xx++) {
          var i = (y * imgW + xx) * 4;
          var R = d[i], G = d[i + 1], B = d[i + 2];
          var L = 0.299 * R + 0.587 * G + 0.114 * B;
          R = L + (R - L) * 1.35; G = L + (G - L) * 1.35; B = L + (B - L) * 1.35;
          R = 128 + (R - 128) * 1.2; G = 128 + (G - 128) * 1.2; B = 128 + (B - 128) * 1.2;
          r += R; g += G; bl += B; l += L; q += L * L;
          var o = (y + 1) * W1 + xx + 1, u = y * W1 + xx + 1;
          SR[o] = SR[u] + r; SG[o] = SG[u] + g; SB[o] = SB[u] + bl; SL[o] = SL[u] + l; SQ[o] = SQ[u] + q;
        }
      }
    }

    function patch(x, y, s) {
      var k = imgW / cssW;
      var x0 = Math.max(0, Math.min(imgW - 1, Math.floor(x * k))), x1 = Math.max(x0 + 1, Math.min(imgW, Math.round((x + s) * k)));
      var y0 = Math.max(0, Math.min(imgH - 1, Math.floor(y * k))), y1 = Math.max(y0 + 1, Math.min(imgH, Math.round((y + s) * k)));
      var W1 = imgW + 1, n = (x1 - x0) * (y1 - y0);
      var sum = function (S) { return S[y1 * W1 + x1] - S[y0 * W1 + x1] - S[y1 * W1 + x0] + S[y0 * W1 + x0]; };
      var l = sum(SL) / n;
      return { r: sum(SR) / n, g: sum(SG) / n, b: sum(SB) / n, sd: Math.sqrt(Math.max(0, sum(SQ) / n - l * l)) };
    }

    var dist = function (c, m) {
      var dr = c[0] - m.r, dg = c[1] - m.g, db = c[2] - m.b;
      return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    };
    function inksAt(x, y, s) {
      var m = patch(x, y, s), best = 0, bestD = Infinity, solo = 0, soloD = Infinity;
      for (var i = 0; i < PAIRS.length; i++) {
        var dd = dist(PAIRS[i].mix, m);
        if (dd < bestD) { bestD = dd; best = i; }
      }
      for (var j = 0; j < INKS.length; j++) {
        var d2 = dist(INKS[j], m);
        if (d2 < soloD) { soloD = d2; solo = j; }
      }
      return [best, solo];
    }

    var MAX_GEN = 4;
    var gridSpec = /^(\d+)x(\d+)$/.exec(canvas.getAttribute("data-grid") || "");
    var GX = gridSpec ? +gridSpec[1] : 4;
    var GY = gridSpec ? +gridSpec[2] : 4;
    var CROP = 0;
    if (gridSpec && !fine && COLS % GX === 0) {
      var need = GY * (COLS / GX);
      if (need < ROWS) CROP = ROWS - need;
    }
    var OFF = 0, viewH = 0;
    var revealed = [];
    var animUntil = 0;
    var SPLIT_MS = 240;
    var MERGE_MS = 380;
    var REST_MS = 1500;
    var IDLE_MS = 4500;
    var lastTouch = 0;
    var FLASH_MS = 900;
    var COLORS = ["#e68019", "#2a44d6"];
    var MAX_LEAVES = 120000;

    var dpr = 1, base = 16, roots = [], leafCount = 0, running = false, visible = true;
    var cssW = 0, cssH = 0;

    function node(x, y, s, g, now, pre) {
      var k = pre == null ? inksAt(x, y, s) : [pre, 0];
      return { x: x, y: y, s: s, p: k[0], solo: k[1], g: g, kids: null, born: now, from: null, t0: 0, dur: 0, merge0: 0, flash: 0, hue: 0 };
    }

    function measure() {
      var w = canvas.parentElement.clientWidth;
      var vw = document.documentElement.clientWidth || innerWidth, vh = document.documentElement.clientHeight || innerHeight;
      var maxH = Math.min(720, vh * (vw <= 900 ? 0.6 : 0.78));
      return { base: Math.max(6, Math.floor(Math.min(w / COLS, maxH / (ROWS - CROP)))), dpr: Math.min(window.devicePixelRatio || 1, 2) };
    }
    function layout() {
      var m = measure();
      base = m.base;
      cssW = base * COLS;
      cssH = base * ROWS;
      OFF = base * Math.floor(CROP / 2);
      viewH = cssH - base * CROP;
      dpr = m.dpr;
      canvas.style.width = cssW + "px";
      canvas.style.height = viewH + "px";
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(viewH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, -OFF * dpr);
      if (!fine) {
        MAX_GEN = 0;
        while (MAX_GEN < 4 && base / Math.pow(2, MAX_GEN + 1) >= 2) MAX_GEN++;
      }
      revealed = [];
      var now = performance.now();
      roots = [];
      leafCount = 0;
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          roots.push(node(c * base, r * base, base, 0, now, PRE ? PRE.charCodeAt(r * COLS + c) - 97 : null));
          leafCount++;
        }
      }
    }

    function split(n, now, colorful) {
      if (n.kids || n.g >= MAX_GEN || leafCount > MAX_LEAVES) return false;
      var h = n.s / 2;
      n.kids = [
        node(n.x, n.y, h, n.g + 1, now),
        node(n.x + h, n.y, h, n.g + 1, now),
        node(n.x, n.y + h, h, n.g + 1, now),
        node(n.x + h, n.y + h, h, n.g + 1, now),
      ];
      var hue = Math.random() < 0.5 ? 0 : 1;
      n.kids.forEach(function (k) {
        k.from = [n.x, n.y, n.s];
        k.t0 = reduce ? 0 : now;
        if (colorful) {
          k.flash = now;
          k.hue = hue;
        }
      });
      n.merge0 = 0;
      leafCount += 3;
      animUntil = Math.max(animUntil, now + FLASH_MS);
      return true;
    }

    function brush(px, py, now) {
      var R = Math.max(base * 0.8, 10);
      var c0 = Math.max(0, Math.floor((px - R) / base)), c1 = Math.min(COLS - 1, Math.floor((px + R) / base));
      var r0 = Math.max(0, Math.floor((py - R) / base)), r1 = Math.min(ROWS - 1, Math.floor((py + R) / base));
      for (var r = r0; r <= r1; r++) {
        for (var c = c0; c <= c1; c++) visit(roots[r * COLS + c], px, py, R, now);
      }
    }

    function visit(n, px, py, R, now) {
      var nx = Math.max(n.x, Math.min(px, n.x + n.s)), ny = Math.max(n.y, Math.min(py, n.y + n.s));
      if ((nx - px) * (nx - px) + (ny - py) * (ny - py) > R * R) return;
      if (n.kids) {
        if (n.merge0) {
          n.merge0 = 0;
          n.kids.forEach(function (k) { k.born = now; });
        }
        n.kids.forEach(function (k) { visit(k, px, py, R, now); });
        return;
      }
      var cx = n.x + n.s / 2, cy = n.y + n.s / 2;
      if ((cx - px) * (cx - px) + (cy - py) * (cy - py) > R * R) return;
      if (now - n.born < SPLIT_MS + 60) return;
      if (!split(n, now, true)) n.born = now;
    }

    function heal(n, now) {
      if (!fine || !n.kids) return;
      var allLeaves = true;
      for (var i = 0; i < 4; i++) {
        heal(n.kids[i], now);
        if (n.kids[i].kids) allLeaves = false;
      }
      if (!allLeaves) return;
      if (n.merge0) {
        if (reduce || now - n.merge0 >= MERGE_MS) {
          n.kids = null;
          n.merge0 = 0;
          n.born = now;
          leafCount -= 3;
        }
        return;
      }
      if (now - lastTouch < IDLE_MS) return;
      var newest = 0;
      for (var j = 0; j < 4; j++) newest = Math.max(newest, n.kids[j].born);
      if (now - newest > REST_MS) n.merge0 = now;
    }

    var ease = function (t) { return 1 - Math.pow(1 - t, 3); };

    function flashColor(n, now) {
      if (!n.flash) return null;
      var t = Math.max(0, (now - n.flash) / FLASH_MS);
      if (t >= 1) {
        n.flash = 0;
        return null;
      }
      return COLORS[n.hue] + Math.round((1 - t) * 255).toString(16).padStart(2, "0");
    }

    function drawLeaf(n, x, y, s, now) {
      var pr = PAIRS[n.p];
      var dev = s * dpr;
      var fl = flashColor(n, now);
      if (dev < 2.2) {
        ctx.fillStyle = INK_CSS[n.solo];
        ctx.fillRect(x, y, s, s);
        if (fl) {
          ctx.fillStyle = fl;
          ctx.fillRect(x, y, s, s);
        }
        return;
      }
      ctx.fillStyle = INK_CSS[pr.sq];
      ctx.fillRect(x, y, s, s);
      if (fl) {
        ctx.fillStyle = fl;
        ctx.fillRect(x, y, s, s);
      }
      ctx.fillStyle = INK_CSS[pr.ci];
      ctx.beginPath();
      ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawNode(n, now, parentRect) {
      var x = n.x, y = n.y, s = n.s;
      if (n.from && n.t0) {
        var t = (now - n.t0) / (n.dur || SPLIT_MS);
        if (t >= 1) n.t0 = 0;
        else {
          var e = ease(Math.max(0, t));
          x = n.from[0] + (x - n.from[0]) * e;
          y = n.from[1] + (y - n.from[1]) * e;
          s = n.from[2] + (s - n.from[2]) * e;
        }
      }
      if (parentRect) {
        var m = ease(parentRect[3]);
        x += (parentRect[0] - x) * m;
        y += (parentRect[1] - y) * m;
        s += (parentRect[2] - s) * m;
      }
      if (!n.kids) {
        drawLeaf(n, x, y, s, now);
        return;
      }
      var pr = parentRect;
      if (n.merge0) {
        var mt = Math.min(1, (now - n.merge0) / MERGE_MS);
        pr = [n.x, n.y, n.s, mt];
      }
      for (var i = 0; i < 4; i++) drawNode(n.kids[i], now, pr);
    }

    function busy() {
      for (var i = 0; i < roots.length; i++) if (roots[i].kids) return true;
      return false;
    }

    var flashing = false;
    function frame(now) {
      if (!visible) {
        running = false;
        return;
      }
      for (var i = 0; i < roots.length; i++) heal(roots[i], now);
      ctx.setTransform(dpr, 0, 0, dpr, 0, -OFF * dpr);
      ctx.clearRect(0, 0, cssW, cssH);
      for (var j = 0; j < roots.length; j++) drawNode(roots[j], now, null);
      if ((fine && busy()) || now < animUntil || flashing) {
        requestAnimationFrame(frame);
      } else {
        running = false;
      }
      flashing = false;
    }

    function kick() {
      flashing = true;
      if (!running) {
        running = true;
        requestAnimationFrame(frame);
      }
    }

    var last = null;
    function onMove(e) {
      if (!imgReady) return;
      var rect = canvas.getBoundingClientRect();
      var px = (e.clientX - rect.left) * (cssW / rect.width);
      var py = (e.clientY - rect.top) * (cssH / rect.height);
      var now = performance.now();
      lastTouch = now;
      if (last) {
        var dx = px - last[0], dy = py - last[1];
        var steps = Math.min(40, Math.ceil(Math.hypot(dx, dy) / 4));
        for (var i = 1; i <= steps; i++) brush(last[0] + (dx * i) / steps, last[1] + (dy * i) / steps, now);
      } else {
        brush(px, py, now);
      }
      last = [px, py];
      kick();
    }
    if (fine) {
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerdown", onMove);
      canvas.addEventListener("pointerleave", function () { last = null; });
    }

    function intro() {
      if (reduce || !fine) return;
      var now = performance.now();
      roots.forEach(function (n, i) {
        var row = Math.floor(i / COLS);
        split(n, now, false);
        n.kids.forEach(function (k) {
          k.t0 = 0;
          split(k, now, false);
          k.kids.forEach(function (g) {
            g.t0 = 0;
            g.born = now - REST_MS + 200 + row * 40;
          });
          k.born = now;
        });
      });
    }

    var PRE = canvas.getAttribute("data-tiles") || "";
    if (PRE.length !== COLS * ROWS || /[^a-l]/.test(PRE)) PRE = null;

    function appear() {
      if (reduce) return;
      var now = performance.now(), last = 0;
      roots.forEach(function (n, i) {
        var c = i % COLS, r = Math.floor(i / COLS);
        var d = (c * 0.7 + r) * 26 + Math.random() * 40;
        n.from = [n.x + n.s / 2, n.y + n.s / 2, 0];
        n.t0 = now + d;
        n.dur = 420;
        n.flash = now + d;
        n.hue = Math.random() < 0.5 ? 0 : 1;
        last = Math.max(last, d);
      });
      animUntil = Math.max(animUntil, now + last + FLASH_MS);
    }

    var started = false, imgReady = false;
    function start() {
      if (started) return;
      started = true;
      layout();
      appear();
      kick();
    }
    var img = new Image();
    img.decoding = "async";
    img.onload = function () {
      prep(img);
      imgReady = true;
      start();
    };
    img.src = SRC;
    if (PRE) start();

    var rw;
    addEventListener("resize", function () {
      clearTimeout(rw);
      rw = setTimeout(function () {
        if (!started) return;
        if (window.visualViewport && visualViewport.scale > 1.01) return;
        var m = measure();
        if (m.base === base && m.dpr === dpr) return;
        var had = revealed.slice();
        layout();
        had.forEach(function (on, key) { if (on) reveal(key % GX, Math.floor(key / GX), 0, 0, true); });
        kick();
      }, 120);
    });

    new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      if (visible) kick();
    }).observe(canvas);

    addEventListener("pageshow", function () { if (started) kick(); });
    document.addEventListener("visibilitychange", function () { if (started && !document.hidden) kick(); });
    canvas.addEventListener("contextrestored", function () { if (started) kick(); });

    function reveal(gx, gy, tx, ty, instant) {
      var key = gy * GX + gx;
      if (revealed[key]) return;
      revealed[key] = true;
      var now = performance.now();
      var still = reduce || instant;
      var c0 = Math.floor((gx * COLS) / GX), c1 = Math.floor(((gx + 1) * COLS) / GX);
      var r0 = Math.floor((gy * ROWS) / GY), r1 = Math.floor(((gy + 1) * ROWS) / GY);
      var x0 = c0 * base, x1 = c1 * base, y0 = r0 * base, y1 = r1 * base;
      if (CROP) {
        y0 = OFF + (gy * viewH) / GY;
        y1 = OFF + ((gy + 1) * viewH) / GY;
        r0 = Math.max(0, Math.floor(y0 / base));
        r1 = Math.min(ROWS, Math.ceil(y1 / base));
      }
      var deep = function (n) {
        if (n.x >= x1 || n.x + n.s <= x0 || n.y >= y1 || n.y + n.s <= y0) return;
        if (n.g >= MAX_GEN) return;
        var d = still ? 0 : Math.hypot(n.x + n.s / 2 - tx, n.y + n.s / 2 - ty) * 2.2 + n.g * 170;
        if (!n.kids) split(n, now, !instant && n.g === MAX_GEN - 1);
        if (!n.kids) return;
        n.kids.forEach(function (k) {
          if (still) k.t0 = 0;
          else {
            k.t0 = now + d;
            if (k.flash) k.flash = now + d;
          }
          k.born = now + d;
          animUntil = Math.max(animUntil, now + d + FLASH_MS);
          deep(k);
        });
      };
      for (var r = r0; r < r1; r++) {
        for (var c = c0; c < c1; c++) deep(roots[r * COLS + c]);
      }
      kick();
    }

    if (!fine) {
      canvas.addEventListener("click", function (e) {
        if (!imgReady) return;
        var rect = canvas.getBoundingClientRect();
        var px = (e.clientX - rect.left) * (cssW / rect.width);
        var py = (e.clientY - rect.top) * (viewH / rect.height);
        var gx = Math.min(GX - 1, Math.max(0, Math.floor((px / cssW) * GX)));
        var gy = Math.min(GY - 1, Math.max(0, Math.floor((py / viewH) * GY)));
        reveal(gx, gy, px, py + OFF);
      });
    }
  })();
})();

(function () {
  "use strict";
  var cv = document.querySelector(".trail");
  if (!cv) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  var c2 = cv.getContext("2d");
  var dots = [];
  var W = 0, H = 0, d = 1, run = false, lx = null, ly = null, flip = 0;
  function colors() {
    var cs = getComputedStyle(cv);
    return [cs.getPropertyValue("--trail-a").trim() || "#e68019", cs.getPropertyValue("--trail-b").trim() || "#2a44d6"];
  }
  function size() {
    d = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth;
    H = innerHeight;
    cv.width = W * d;
    cv.height = H * d;
    c2.setTransform(d, 0, 0, d, 0, 0);
  }
  size();
  addEventListener("resize", size);
  addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    var x = e.clientX, y = e.clientY;
    if (lx === null) {
      lx = x;
      ly = y;
      return;
    }
    var dist = Math.hypot(x - lx, y - ly);
    if (dist < 32) return;
    var n = Math.min(3, Math.floor(dist / 32));
    var cols = colors();
    for (var i = 1; i <= n; i++) {
      flip++;
      dots.push({
        x: lx + ((x - lx) * i) / n,
        y: ly + ((y - ly) * i) / n,
        r: 3 + Math.random() * 3.5,
        c: cols[flip % 2],
        sq: Math.random() < 0.5,
        a: (Math.floor(Math.random() * 6) * 15 * Math.PI) / 180,
        hollow: Math.random() < 0.5,
        t: performance.now(),
      });
    }
    lx = x;
    ly = y;
    if (dots.length > 160) dots.splice(0, dots.length - 160);
    if (!run) {
      run = true;
      requestAnimationFrame(tick);
    }
  }, { passive: true });
  function tick(now) {
    c2.clearRect(0, 0, W, H);
    dots = dots.filter(function (p) { return now - p.t < 900; });
    dots.forEach(function (p) {
      var t = (now - p.t) / 900;
      var e = 1 - t * t;
      c2.globalAlpha = e;
      var r = p.r * (0.35 + 0.65 * e);
      c2.beginPath();
      if (p.sq) {
        var ca = Math.cos(p.a) * r, sa = Math.sin(p.a) * r;
        c2.moveTo(p.x - ca + sa, p.y - sa - ca);
        c2.lineTo(p.x + ca + sa, p.y + sa - ca);
        c2.lineTo(p.x + ca - sa, p.y + sa + ca);
        c2.lineTo(p.x - ca - sa, p.y - sa + ca);
        c2.closePath();
      } else c2.arc(p.x, p.y, r, 0, Math.PI * 2);
      if (p.hollow) {
        c2.strokeStyle = p.c;
        c2.lineWidth = 1.5;
        c2.stroke();
      } else {
        c2.fillStyle = p.c;
        c2.fill();
      }
    });
    c2.globalAlpha = 1;
    if (dots.length) requestAnimationFrame(tick);
    else run = false;
  }
})();

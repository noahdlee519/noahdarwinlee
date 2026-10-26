(function () {
  "use strict";
  var box = document.querySelector(".shots");
  if (!box) return;
  var track = box.querySelector(".track");
  var slides = Array.prototype.slice.call(track.querySelectorAll(".slide"));
  var count = box.querySelector(".count");
  var cap = box.querySelector(".cap");
  var prev = box.querySelector(".arrow-prev");
  var next = box.querySelector(".arrow-next");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var at = 0;

  if (slides.length < 2) {
    box.querySelector(".shots-nav").hidden = true;
    return;
  }

  function show(i) {
    at = i;
    slides.forEach(function (s, k) {
      var v = s.querySelector("video");
      if (!v) return;
      if (k !== i) v.pause();
      else if (!reduce) {
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      }
    });
    count.textContent = i + 1 + " / " + slides.length;
    cap.textContent = slides[i].getAttribute("data-cap");
    prev.disabled = i === 0;
    next.disabled = i === slides.length - 1;
  }

  function go(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo({ left: i * track.clientWidth, behavior: reduce ? "auto" : "smooth" });
    show(i);
  }

  var t;
  track.addEventListener(
    "scroll",
    function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var i = Math.round(track.scrollLeft / track.clientWidth);
        if (i !== at) show(i);
      }, 60);
    },
    { passive: true }
  );

  prev.addEventListener("click", function () { go(at - 1); });
  next.addEventListener("click", function () { go(at + 1); });
  addEventListener("keydown", function (e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    var t = e.target, tag = t && t.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "VIDEO" || (t && t.isContentEditable)) return;
    e.preventDefault();
    go(at + (e.key === "ArrowRight" ? 1 : -1));
  });

  var drag = null, swallow = false, settle = 0;
  track.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "touch" || e.button !== 0) return;
    var v = e.target.closest && e.target.closest("video");
    if (v && e.clientY > v.getBoundingClientRect().bottom - 56) return;
    var now = performance.now();
    drag = { id: e.pointerId, x: e.clientX, left: track.scrollLeft, start: at, moved: false, lastX: e.clientX, lastT: now, vx: 0 };
  });
  addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < 6) return;
      drag.moved = true;
      clearTimeout(settle);
      track.classList.add("is-dragging");
      try { track.setPointerCapture(drag.id); } catch (err) {}
    }
    var now = performance.now();
    if (now > drag.lastT) drag.vx = (e.clientX - drag.lastX) / (now - drag.lastT);
    drag.lastX = e.clientX;
    drag.lastT = now;
    track.scrollLeft = drag.left - dx;
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag;
    drag = null;
    if (!d.moved) return;
    var w = track.clientWidth, dx = d.lastX - d.x, fast = performance.now() - d.lastT < 120 ? d.vx : 0, i = d.start;
    if (Math.abs(dx) > w) i = Math.round(track.scrollLeft / w);
    else if (dx < -w * 0.15 || fast < -0.5) i = d.start + 1;
    else if (dx > w * 0.15 || fast > 0.5) i = d.start - 1;
    swallow = true;
    setTimeout(function () { swallow = false; }, 0);
    go(i);
    settle = setTimeout(function () { track.classList.remove("is-dragging"); }, reduce ? 0 : 500);
  }
  addEventListener("pointerup", endDrag);
  addEventListener("pointercancel", endDrag);
  track.addEventListener("click", function (e) {
    if (!swallow) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);
  track.addEventListener("dragstart", function (e) { e.preventDefault(); });

  addEventListener("resize", function () {
    track.scrollTo({ left: at * track.clientWidth, behavior: "auto" });
  });

  addEventListener("load", function () {
    slides.forEach(function (s) {
      var img = s.querySelector("img");
      if (img) img.loading = "eager";
    });
  });
})();

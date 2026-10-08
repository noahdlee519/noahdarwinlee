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
  track.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); go(at + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(at - 1); }
  });

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

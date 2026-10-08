(function () {
  "use strict";
  var list = document.querySelector(".art-index");
  if (!list) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var links = Array.prototype.slice.call(list.querySelectorAll("a[href^='#']"));
  var cards = links.map(function (a) {
    return document.getElementById(a.getAttribute("href").slice(1));
  });
  var current = null;
  var lockUntil = 0;

  function mark(i) {
    if (i === current) return;
    if (current !== null && links[current]) links[current].removeAttribute("aria-current");
    current = i;
    if (i !== null && links[i]) links[i].setAttribute("aria-current", "true");
  }

  function update() {
    if (performance.now() < lockUntil) return;
    var line = window.innerHeight * 0.35;
    var doc = document.documentElement;
    var atEnd = window.scrollY + window.innerHeight >= doc.scrollHeight - 2;
    var found = null;
    for (var i = 0; i < cards.length; i++) {
      if (!cards[i]) continue;
      var r = cards[i].getBoundingClientRect();
      if (r.height === 0) continue;
      if (r.top <= line) found = i;
      else break;
    }
    if (atEnd) {
      for (var j = cards.length - 1; j >= 0; j--) {
        if (cards[j] && cards[j].getBoundingClientRect().top < window.innerHeight) { found = j; break; }
      }
    }
    if (found === null && cards[0] && cards[0].getBoundingClientRect().height) found = 0;
    mark(found);
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      update();
    });
  }

  list.addEventListener("click", function (e) {
    var a = e.target.closest("a[href^='#']");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    var target = document.getElementById(a.getAttribute("href").slice(1));
    if (!target) return;
    e.preventDefault();
    mark(links.indexOf(a));
    lockUntil = performance.now() + (reduce.matches ? 0 : 900);
    target.scrollIntoView({ behavior: reduce.matches ? "auto" : "smooth", block: "start" });
    history.replaceState(history.state, "", a.getAttribute("href"));
    setTimeout(update, reduce.matches ? 0 : 950);
  });

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("load", update);
  update();
})();

(function () {
  "use strict";
  var list = document.querySelector(".art-index");
  if (!list) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  list.addEventListener("click", function (e) {
    var a = e.target.closest("a[href^='#']");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    var target = document.getElementById(a.getAttribute("href").slice(1));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce.matches ? "auto" : "smooth", block: "start" });
    history.replaceState(history.state, "", a.getAttribute("href"));
  });
})();

// The list of projects on the art page: a click glides to the project rather
// than jumping, and puts its name in the address without adding a step to the
// history, so back still goes to the page you came from. With no script the
// links are ordinary links to the same places.
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

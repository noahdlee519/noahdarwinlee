(function () {
  "use strict";
  var toggle = document.getElementById("page-toggle");
  if (!toggle) return;
  var body = document.getElementById(toggle.getAttribute("aria-controls"));
  if (!body) return;

  toggle.addEventListener("click", function () {
    var open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    body.classList.toggle("is-collapsed", !open);
    document.body.classList.toggle("is-folded", !open);
    if (!open) window.scrollTo(0, 0);
    document.dispatchEvent(new Event("bio:toggle"));
  });
})();

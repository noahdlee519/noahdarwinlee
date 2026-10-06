// The page's own name under back: it folds the page away and the message box
// takes its place, and brings the page back. Open on arrival; with no script
// the button does nothing and the page is simply there.
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
    // The page just got a lot shorter or longer; the header measures its fade
    // against the page's height.
    document.dispatchEvent(new Event("bio:toggle"));
  });
})();

// The back button under the name: the page you came from, the way the
// browser's own back button goes. With nothing to go back to -- the page was
// opened on its own -- the link's address takes over, which is the front page.
(function () {
  "use strict";
  var link = document.querySelector("[data-back]");
  if (!link) return;
  link.addEventListener("click", function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (history.length > 1) {
      e.preventDefault();
      history.back();
    }
  });
})();

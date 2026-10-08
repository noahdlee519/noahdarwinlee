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

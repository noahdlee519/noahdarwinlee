// "All work" on a project's page goes back to the portfolio at the place it was left, at once. When the portfolio is the page
// before, it is the browser's back, which keeps the page as it was; otherwise the portfolio's own script puts the scroll back
// where it was (saved as it was left) or, failing that, at this project's card.
(function () {
  "use strict";
  var link = document.querySelector("[data-return]");
  if (!link) return;
  var slug = link.getAttribute("data-return");
  link.addEventListener("click", function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    try { sessionStorage.setItem("portfolio-back", slug); } catch (err) {}
    var from = "";
    try { from = new URL(document.referrer).pathname; } catch (err) {}
    if (history.length > 1 && /^\/portfolio\/?(index\.html)?$/.test(from)) {
      e.preventDefault();
      history.back();
    }
  });
})();

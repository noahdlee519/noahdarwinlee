// Expands the about panel inline above the artwork. The link points at /#about,
// so cmd/ctrl-click opens the homepage with the panel already expanded, and with
// no script at all a <noscript> rule in index.html just shows the content.
(function () {
  const toggle = document.getElementById("about-toggle");
  const panel = document.getElementById("about-panel");
  if (!toggle || !panel) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  function setOpen(open) {
    panel.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    if (open) history.replaceState(null, "", "#about");
    else if (location.hash === "#about") {
      history.replaceState(null, "", location.pathname + location.search);
    }
    // The fixed header measures against page height, so let it re-run.
    document.dispatchEvent(new Event("bio:toggle"));
  }

  toggle.addEventListener("click", (event) => {
    // Let modified clicks and middle-clicks follow /#about as a normal link.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    const open = !panel.classList.contains("is-open");
    setOpen(open);
    if (open) {
      window.scrollTo({ top: 0, behavior: reduce.matches ? "auto" : "smooth" });
    }
  });

  // /#about opens it directly.
  if (location.hash === "#about") setOpen(true);
  window.addEventListener("hashchange", () => {
    if (location.hash === "#about") setOpen(true);
  });
})();

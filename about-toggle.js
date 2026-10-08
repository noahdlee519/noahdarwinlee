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
    document.dispatchEvent(new Event("bio:toggle"));
  }

  toggle.addEventListener("click", (event) => {
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

  if (location.hash === "#about") setOpen(true);
  window.addEventListener("hashchange", () => {
    if (location.hash === "#about") setOpen(true);
  });
})();

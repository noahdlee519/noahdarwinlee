(function () {
  const toTopBtn = document.getElementById("to-top-btn");
  if (!toTopBtn) return;

  const COOLDOWN_MS = 500;
  let lastClick = 0;

  toTopBtn.addEventListener("click", () => {
    const now = Date.now();
    if (now - lastClick < COOLDOWN_MS) return;
    lastClick = now;
    window.scrollTo({ top: 0, behavior: "auto" });
  });
})();

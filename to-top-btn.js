(function () {
  const toTopBtn = document.getElementById("to-top-btn");
  if (!toTopBtn) return;

  const COOLDOWN_MS = 500;
  const DURATION_MS = 220;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  let lastClick = 0;
  let animating = false;

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function scrollToTopQuick() {
    if (animating) return;
    const startY = window.scrollY;
    if (startY <= 0) return;

    if (reduce.matches) {
      window.scrollTo(0, 0);
      return;
    }

    animating = true;
    const startTime = performance.now();

    function step(now) {
      const progress = Math.min((now - startTime) / DURATION_MS, 1);
      window.scrollTo(0, Math.round(startY * (1 - easeOutCubic(progress))));
      if (progress < 1) requestAnimationFrame(step);
      else animating = false;
    }
    requestAnimationFrame(step);
  }

  toTopBtn.addEventListener("click", () => {
    const now = Date.now();
    if (now - lastClick < COOLDOWN_MS) return;
    lastClick = now;
    scrollToTopQuick();
  });
})();

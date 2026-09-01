(function () {
  const container = document.querySelector(".top-right-links");
  if (!container) return;

  const sets = container.querySelectorAll(".top-right-set");
  if (sets.length < 2) return;

  const links = container.querySelectorAll("a");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const DISPLAY_MS = 5000;

  let activeIndex = 0;
  let intervalId = null;
  let held = false; // hover or keyboard focus
  let stopped = reduce.matches; // user (or OS) asked for no motion
  let resumeTimer = null;

  function showSet(index) {
    sets.forEach((set, i) => {
      const visible = i === index;
      set.classList.toggle("is-visible", visible);
      set.setAttribute("aria-hidden", visible ? "false" : "true");
      // visibility:hidden (via the class) also removes them from the tab order,
      // but be explicit so no invisible link is ever focusable.
      if (visible) set.removeAttribute("inert");
      else set.setAttribute("inert", "");
    });
  }

  function advance() {
    activeIndex = (activeIndex + 1) % sets.length;
    showSet(activeIndex);
  }

  function start() {
    if (intervalId !== null || held || stopped) return;
    intervalId = setInterval(advance, DISPLAY_MS);
  }

  function pause() {
    if (intervalId === null) return;
    clearInterval(intervalId);
    intervalId = null;
  }

  function clearResume() {
    if (resumeTimer === null) return;
    clearTimeout(resumeTimer);
    resumeTimer = null;
  }

  const isFaded = () => container.classList.contains("is-faded");

  function resumeSoon() {
    clearResume();
    // slight delay so moving between neighboring links doesn't flicker the timer
    resumeTimer = setTimeout(() => {
      resumeTimer = null;
      const stillHeld =
        [...links].some((l) => l.matches(":hover") || l === document.activeElement);
      if (!stillHeld || isFaded()) {
        held = false;
        start();
      }
    }, 80);
  }

  function forceResume() {
    held = false;
    clearResume();
    start();
  }

  function hold() {
    if (isFaded()) return;
    held = true;
    clearResume();
    pause();
  }

  links.forEach((link) => {
    link.addEventListener("pointerenter", hold);
    link.addEventListener("focus", hold);
    link.addEventListener("pointerleave", () => { held = false; resumeSoon(); });
    link.addEventListener("blur", () => { held = false; resumeSoon(); });
  });

  function setStopped(value) {
    stopped = value;
    if (stopped) pause();
    else start();
  }

  // If the header fade kills pointer events mid-hover, mouseleave may never fire.
  new MutationObserver(() => { if (isFaded()) forceResume(); })
    .observe(container, { attributes: true, attributeFilter: ["class"] });

  window.addEventListener("blur", forceResume);
  document.addEventListener("visibilitychange", () => { if (document.hidden) forceResume(); });
  reduce.addEventListener?.("change", (e) => setStopped(e.matches));

  showSet(0);
  setStopped(stopped);
})();

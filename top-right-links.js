(function () {
  const container = document.querySelector(".top-right-links");
  if (!container) return;

  const sets = container.querySelectorAll(".top-right-set");
  if (sets.length < 2) return;

  const links = container.querySelectorAll("a");
  let activeIndex = 0;
  let intervalId = null;
  let hovering = false;
  let resumeTimer = null;
  const displayMs = 5000;

  function showSet(index) {
    sets.forEach((set, i) => {
      const visible = i === index;
      set.classList.toggle("is-visible", visible);
      set.setAttribute("aria-hidden", visible ? "false" : "true");
    });
  }

  function advanceSet() {
    activeIndex = (activeIndex + 1) % sets.length;
    showSet(activeIndex);
  }

  function startCycle() {
    if (intervalId !== null) return;
    intervalId = setInterval(advanceSet, displayMs);
  }

  function pauseCycle() {
    if (intervalId === null) return;
    clearInterval(intervalId);
    intervalId = null;
  }

  function clearResumeTimer() {
    if (resumeTimer === null) return;
    clearTimeout(resumeTimer);
    resumeTimer = null;
  }

  function isFaded() {
    return container.classList.contains("is-faded");
  }

  function resumeCycleSoon() {
    clearResumeTimer();
    // slight delay so moving between neighboring links doesn't flicker the timer
    resumeTimer = setTimeout(() => {
      resumeTimer = null;
      hovering = [...links].some((link) => link.matches(":hover"));
      if (!hovering || isFaded()) {
        hovering = false;
        startCycle();
      }
    }, 80);
  }

  function forceResume() {
    hovering = false;
    clearResumeTimer();
    startCycle();
  }

  links.forEach((link) => {
    link.addEventListener("pointerenter", () => {
      if (isFaded()) return;
      hovering = true;
      clearResumeTimer();
      pauseCycle();
    });

    link.addEventListener("pointerleave", () => {
      hovering = false;
      resumeCycleSoon();
    });
  });

  // If the header fade disables pointer events mid-hover, mouseleave may never fire.
  const fadeObserver = new MutationObserver(() => {
    if (isFaded()) forceResume();
  });
  fadeObserver.observe(container, { attributes: true, attributeFilter: ["class"] });

  // Tab blur / backgrounding can also leave a stuck hover pause behind.
  window.addEventListener("blur", forceResume);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) forceResume();
  });

  startCycle();
})();

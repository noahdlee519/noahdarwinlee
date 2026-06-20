(function () {
  const container = document.querySelector(".top-right-links");
  if (!container) return;

  const sets = container.querySelectorAll(".top-right-set");
  if (sets.length < 2) return;

  const links = container.querySelectorAll("a");
  let activeIndex = 0;
  let intervalId = null;
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

  function isHoveringLink() {
    return [...links].some((link) => link.matches(":hover"));
  }

  links.forEach((link) => {
    link.addEventListener("mouseenter", pauseCycle);
    link.addEventListener("mouseleave", () => {
      requestAnimationFrame(() => {
        if (!isHoveringLink()) {
          startCycle();
        }
      });
    });
  });

  startCycle();
})();

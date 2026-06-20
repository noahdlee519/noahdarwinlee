(function () {
  const container = document.querySelector(".top-right-links");
  if (!container) return;

  const sets = container.querySelectorAll(".top-right-set");
  if (sets.length < 2) return;

  let activeIndex = 0;
  const displayMs = 5000;

  function showSet(index) {
    sets.forEach((set, i) => {
      const visible = i === index;
      set.classList.toggle("is-visible", visible);
      set.setAttribute("aria-hidden", visible ? "false" : "true");
    });
  }

  setInterval(() => {
    activeIndex = (activeIndex + 1) % sets.length;
    showSet(activeIndex);
  }, displayMs);
})();

// Shared header behaviour: fade the fixed nav on scroll (desktop only) and
// show the back-to-top button. Reads its fade distance from data-fade-distance
// on <body>, defaulting to 90.
(function () {
  const name = document.querySelector(".name");
  // .theme-btn is appended by theme.js after this runs, so it is collected
  // when the fade next updates rather than here. See refreshTargets().
  const navLinks = document.querySelectorAll(".about-link, .back-link");
  const topRight = document.querySelector(".top-right-links");
  const toTop = document.getElementById("to-top-btn");
  if (!name) return;

  const fadeDistance = Number(document.body.dataset.fadeDistance || 90);
  const TO_TOP_AT = 100;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  let targets = [name, ...navLinks];
  if (topRight) targets.push(topRight);

  /* The day/night switch is built after this file runs, so the list of things
     to fade is rebuilt on the first update that finds it. */
  function refreshTargets() {
    const theme = document.getElementById("theme-btn");
    /* Unless it is inside the rail, which is already on the list: two opacities
       multiplied is not the same fade as one, and the switch would go before
       the links it stands beside. */
    if (!theme || topRight?.contains(theme)) return;
    if (targets.indexOf(theme) === -1) targets = [...targets, theme];
  }

  function reset() {
    targets.forEach((el) => {
      el.style.opacity = "";
      el.style.pointerEvents = "";
      el.removeAttribute("inert");
    });
    topRight?.classList.remove("is-faded");
    toTop?.classList.remove("is-visible");
  }

  function update() {
    refreshTargets();
    if (window.innerWidth <= 900) return reset();

    // Never let the header fade out on a page too short to scroll back up.
    const maxScroll = Math.max(
      document.documentElement.scrollHeight - window.innerHeight,
      0
    );
    const distance = Math.min(fadeDistance, Math.max(maxScroll, 1));
    const opacity = 1 - Math.min(window.scrollY / distance, 1);
    const faded = opacity <= 0.05;

    targets.forEach((el) => {
      el.style.opacity = opacity;
      el.style.pointerEvents = faded ? "none" : "";
      // Keep faded links out of the tab order and the accessibility tree.
      if (faded) el.setAttribute("inert", "");
      else el.removeAttribute("inert");
    });
    topRight?.classList.toggle("is-faded", faded);
    toTop?.classList.toggle("is-visible", window.scrollY >= TO_TOP_AT);
  }

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  reduce.addEventListener?.("change", update);
  document.addEventListener("bio:toggle", update);
  update();
  window.__updateHeaderFade = update;
})();

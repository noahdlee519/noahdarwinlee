(function () {
  const name = document.querySelector(".name");
  const navLinks = document.querySelectorAll(".about-link, .back-link");
  const topRight = document.querySelector(".site-menu");
  const toTop = document.getElementById("to-top-btn");
  if (!name) return;

  const fadeDistance = Number(document.body.dataset.fadeDistance || 90);
  const TO_TOP_AT = 100;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  let targets = [name, ...navLinks];
  if (topRight) targets.push(topRight);
  const lead = document.querySelector(".projects-lead");
  if (lead) targets.push(lead);

  function refreshTargets() {
    const theme = document.getElementById("theme-btn");
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

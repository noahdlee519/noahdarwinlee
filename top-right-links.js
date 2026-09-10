(function () {
  const container = document.querySelector(".top-right-links");
  if (!container) return;

  const sets = container.querySelectorAll(".top-right-set");
  if (sets.length < 2) return;

  const links = container.querySelectorAll("a");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  /* On a phone the rail is not furniture in the corner, it is a block in the
     middle of the page you are reading. Something in the text that changes
     every five seconds while you read is a nuisance rather than an invitation,
     so at this width nothing turns unless it is asked to. Same breakpoint as
     the stylesheet. */
  const narrow = window.matchMedia("(max-width: 900px)");
  const DISPLAY_MS = 5000;

  const HELD_AFTER_PRESS_MS = 20000;

  let activeIndex = 0;
  let intervalId = null;
  let held = false; // hover or keyboard focus
  let stopped = reduce.matches; // user (or OS) asked for no motion
  let resumeTimer = null;
  let pressTimer = null;

  function showSet(index) {
    /* Which side the caret stands on, and which way it points: the second set
       is shown by going forward, so the way back from it is to the left. */
    container.classList.toggle("is-flipped", index % 2 === 1);
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
    if (intervalId !== null || held || stopped || narrow.matches) return;
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
  /* Rotating or not is a question of width, and the window can be resized. */
  narrow.addEventListener?.("change", (e) => {
    if (e.matches) pause();
    else start();
  });

  /* The set changes on its own every five seconds, which is fine to watch and
     no use at all if you are looking for something: the list you want may have
     just gone. This is the way to turn it yourself. It is built here rather
     than written into the markup because it is no use without this file. */
  const next = document.createElement("button");
  next.type = "button";
  next.className = "top-right-next";
  next.textContent = "\u25B8";
  next.setAttribute("aria-label", "Show the other links");
  next.setAttribute("aria-controls", "top-right-stack");
  container.appendChild(next);

  next.addEventListener("click", () => {
    advance();
    /* Somebody working through the list by hand should not have it move
       underneath them, so a press holds the rotation for a good while. The
       hold is refreshed by each press rather than stacked. */
    held = true;
    clearResume();
    pause();
    if (pressTimer !== null) clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      pressTimer = null;
      held = false;
      start();
    }, HELD_AFTER_PRESS_MS);
  });

  showSet(0);
  setStopped(stopped);
})();

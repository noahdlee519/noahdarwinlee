// The day/night switch.
//
// The theme is resolved twice: once in a small inline script in every page's
// <head>, before the first paint, so nobody watches the orange flash past on
// the way into a dark page; and once here, where the button that changes it
// gets built. The head script is duplicated on purpose — it has to run before
// the stylesheet paints, and a file that has to be fetched cannot promise that.
//
// A choice is remembered. No choice follows the system, and goes on following
// it if the system changes while the page is open. There is no third "auto"
// position on the switch: pressing it always means the theme you can see, and
// the way back to following the system is to clear the site's storage, which
// is not something anybody wants a button for.
(function () {
  var KEY = "ndl-theme";
  var root = document.documentElement;
  var media = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;
  var btn = null;

  function saved() {
    try {
      var v = localStorage.getItem(KEY);
      return v === "dark" || v === "light" ? v : null;
    } catch (e) {
      return null;
    }
  }

  function system() {
    return media && media.matches ? "dark" : "light";
  }

  function current() {
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  /* The word is the state you are in, not the one you would move to. Asked
     which way round it should read, people answer with what they can see. */
  function label(theme) {
    if (!btn) return;
    btn.textContent = theme === "dark" ? "night" : "day";
    btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    btn.setAttribute(
      "aria-label",
      theme === "dark" ? "Night. Switch to day." : "Day. Switch to night."
    );
  }

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    label(theme);
  }

  function build() {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-btn";
    btn.id = "theme-btn";
    label(current());
    btn.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      apply(next);
      try {
        localStorage.setItem(KEY, next);
      } catch (e) {}
      /* The header fades on scroll and the switch fades with it, so the fade
         has to be told there is one more thing to fade. */
      if (window.__updateHeaderFade) window.__updateHeaderFade();
    });
    document.body.appendChild(btn);
    if (window.__updateHeaderFade) window.__updateHeaderFade();
  }

  /* Only while nothing has been chosen here: somebody who has pressed the
     switch has said something more specific than their operating system did. */
  if (media && media.addEventListener) {
    media.addEventListener("change", function () {
      if (!saved()) apply(system());
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();

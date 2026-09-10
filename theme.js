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

  /* The switch carries no writing — it is a filled circle by day and a hollow
     one by night — so its whole name is the label, which is what a screen
     reader reads and what a tooltip shows. */
  function label(theme) {
    if (!btn) return;
    btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    btn.setAttribute(
      "aria-label",
      theme === "dark" ? "Night. Switch to day." : "Day. Switch to night."
    );
    btn.title = theme === "dark" ? "Switch to day" : "Switch to night";
  }

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    label(theme);
  }

  var anchor = null;

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
    /* Where the front page keeps its menu, the switch goes in beside it: two
       small controls in the same corner, one for the light and one for the way
       out of the page, laid out as a row by the stylesheet rather than each
       finding its own way to the same spot.

       Everywhere else there is no menu, and it goes on the line of the name
       instead -- the first line of every page on the site -- in a wrapper the
       stylesheet lays out as a row. The switch used to position itself by
       measuring the word, which meant re-measuring every time the type loaded
       or the window moved, and being a few pixels out whenever that had not
       happened yet. Sharing a line box is the version that cannot drift. */
    var corner = document.querySelector(".site-menu");
    if (corner) {
      corner.insertBefore(btn, corner.firstChild);
      if (window.__updateHeaderFade) window.__updateHeaderFade();
      return;
    }
    anchor = document.querySelector(".name") ||
      document.querySelector(".about-link, .back-link");
    if (anchor && anchor.parentNode) {
      var line = document.createElement("span");
      line.className = "header-line";
      anchor.parentNode.insertBefore(line, anchor);
      line.appendChild(anchor);
      line.appendChild(btn);
    } else {
      document.body.appendChild(btn);
    }
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

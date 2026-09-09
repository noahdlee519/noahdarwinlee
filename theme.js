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

  /* The switch sits just to the right of "about" (or of "back", on the pages
     that have one), and how far right that is depends on how wide the word
     comes out — which is not known until the typeface has loaded. So it is
     measured rather than guessed, and measured again whenever the window
     changes size. Below 901px the header is an ordinary stack instead of a set
     of fixed corners: the stylesheet puts the switch in that stack, and the
     measurements are taken back off so they cannot fight it. */
  function place() {
    if (!btn || !anchor) return;
    if (window.innerWidth <= 900) {
      btn.style.left = "";
      btn.style.top = "";
      return;
    }
    /* Measured across the letters rather than across the element's box: a line
       box is taller than its type, so centring on the box puts the circle a
       few pixels below the middle of the word, which is exactly the sort of
       thing you cannot unsee. */
    var range = document.createRange();
    range.selectNodeContents(anchor);
    var ink = range.getBoundingClientRect();
    range.detach && range.detach();
    var a = ink.width ? ink : anchor.getBoundingClientRect();
    if (!a.width) return;
    btn.style.left = Math.round(a.left + a.width + 13) + "px";
    btn.style.top = Math.round(a.top + a.height / 2 - btn.offsetHeight / 2) + "px";
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
    /* Next to the line it belongs with, rather than at the end of the body.
       On a wide window everything up there is fixed and the DOM order makes no
       difference; on a narrow one the header is an ordinary stack, and a
       switch tacked onto the end of the document would float over the pictures
       instead of sitting in that stack. */
    anchor = document.querySelector(".about-link, .back-link");
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    } else {
      document.body.appendChild(btn);
    }
    place();
    window.addEventListener("resize", place);
    /* The word is a different width once the real typeface arrives. */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
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

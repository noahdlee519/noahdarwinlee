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
      return v === "dark" || v === "light" || v === "white" ? v : null;
    } catch (e) {
      return null;
    }
  }

  function system() {
    return media && media.matches ? "dark" : "light";
  }

  var NEXT = { white: "light", light: "dark", dark: "white" };
  var NAME = { light: "Orange", white: "White", dark: "Night" };

  function current() {
    var t = root.getAttribute("data-theme");
    return t === "dark" || t === "white" ? t : "light";
  }

  function label(theme) {
    if (!btn) return;
    var next = NEXT[theme];
    btn.removeAttribute("aria-pressed");
    btn.setAttribute(
      "aria-label",
      NAME[theme] + ". Switch to " + NAME[next].toLowerCase() + "."
    );
    btn.title = "Switch to " + NAME[next].toLowerCase();
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
      var next = NEXT[current()];
      apply(next);
      try {
        localStorage.setItem(KEY, next);
      } catch (e) {}
      if (window.__updateHeaderFade) window.__updateHeaderFade();
    });
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

  if (media && media.addEventListener) {
    media.addEventListener("change", function () {
      if (!saved()) apply(system());
    });
  }

  function resync() {
    var t = saved() || system();
    if (t !== current()) apply(t);
  }
  window.addEventListener("pageshow", resync);
  window.addEventListener("storage", function (e) {
    if (e.key === KEY) resync();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();

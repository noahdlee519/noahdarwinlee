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

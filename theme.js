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
    btn.removeAttribute("title");
    btn.setAttribute("data-tip", NAME[next]);
  }

  var still = 0;

  function apply(theme) {
    root.classList.add("theme-instant");
    root.setAttribute("data-theme", theme);
    label(theme);
    void root.offsetWidth;
    cancelAnimationFrame(still);
    still = requestAnimationFrame(function () {
      still = requestAnimationFrame(function () {
        root.classList.remove("theme-instant");
      });
    });
  }

  var anchor = null, flashTimer = 0;

  var toast = null, toastTimer = 0;
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="mailto:"]') : null;
    if (!a || a.classList.contains("mail-compose") || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var addr = decodeURIComponent(a.getAttribute("href").slice(7).split("?")[0]);
    if (!addr || !navigator.clipboard || !navigator.clipboard.writeText) return;
    navigator.clipboard.writeText(addr).then(function () {
      if (!toast) {
        toast = document.createElement("div");
        toast.className = "copy-toast";
        toast.setAttribute("role", "status");
        document.body.appendChild(toast);
      }
      toast.textContent = "Copied " + addr;
      toast.classList.add("is-shown");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.classList.remove("is-shown"); }, 2200);
    }, function () {});
  });

  function build() {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-btn";
    btn.id = "theme-btn";
    label(current());
    btn.addEventListener("click", function (e) {
      var next = NEXT[current()];
      apply(next);
      if (e.pointerType === "touch" || e.pointerType === "pen" || (window.matchMedia && window.matchMedia("(hover: none)").matches)) {
        btn.setAttribute("data-tip", NAME[next]);
        btn.classList.add("is-flash");
        clearTimeout(flashTimer);
        flashTimer = setTimeout(function () { btn.classList.remove("is-flash"); label(current()); }, 1200);
      }
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

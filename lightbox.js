(function () {
  var zooms = document.querySelectorAll(".art-zoom");
  if (!zooms.length) return;

  var box = null;
  var frame = null;
  var closer = null;
  var cameFrom = null;
  var showing = null;
  var magnified = false;

  var ZOOM_MIN = 2.6;
  var ZOOM_MAX = 5;

  var hovers = window.matchMedia
    ? window.matchMedia("(hover: hover) and (pointer: fine)")
    : { matches: false };

  var FULL_URL = "art/web/full.json";
  var full = null;
  var asked = null;

  function loadManifest() {
    if (asked) return asked;
    if (!window.fetch || !window.Promise) {
      asked = { then: function (fn) { fn(); return this; } };
      return asked;
    }
    asked = fetch(FULL_URL, { cache: "force-cache" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (json) {
        if (!json || !json.stems) return;
        var stems = {};
        json.stems.forEach(function (stem) {
          stems[stem] = true;
        });
        full = { suffix: json.suffix || "-2400.webp", stems: stems };
      })
      .catch(function () {});
    return asked;
  }

  function stemOf(src) {
    var path = src.replace(/^https?:\/\/[^/]+\//, "").replace(/^\/+/, "");
    return path.replace(/-\d+\.(webp|jpe?g|png)$/i, "");
  }

  function upgrade(shown) {
    if (!full || !shown) return;
    var stem = stemOf(shown.getAttribute("src") || "");
    if (!full.stems[stem]) return;
    var big = new Image();
    big.onload = function () {
      if (!shown.isConnected) return;
      var picture = shown.parentNode;
      if (picture && picture.tagName === "PICTURE") {
        var sources = picture.querySelectorAll("source");
        for (var i = sources.length - 1; i >= 0; i--) {
          sources[i].parentNode.removeChild(sources[i]);
        }
      }
      shown.removeAttribute("srcset");
      shown.removeAttribute("sizes");
      shown.src = big.src;
    };
    big.src = stem + full.suffix;
  }

  function build() {
    box = document.createElement("div");
    box.className = "lightbox";
    box.hidden = true;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");

    frame = document.createElement("button");
    frame.type = "button";
    frame.className = "lightbox-frame";

    closer = document.createElement("button");
    closer.type = "button";
    closer.className = "lightbox-close";
    closer.setAttribute("aria-label", "Close (esc)");
    closer.title = "Close";
    closer.textContent = "esc";

    box.appendChild(frame);
    box.appendChild(closer);
    document.body.appendChild(box);

    closer.addEventListener("click", close);
    box.addEventListener("click", function (event) {
      if (event.target === box) close();
    });

    frame.addEventListener("click", function (event) {
      if (magnified) demagnify();
      else magnify(event);
    });

    frame.addEventListener("pointermove", function (event) {
      if (!magnified || !hovers.matches) return;
      showing.style.transformOrigin = originFrom(event);
    });
  }

  function originFrom(event) {
    var r = frame.getBoundingClientRect();
    if (!r.width || !r.height) return "50% 50%";
    var x = ((event.clientX - r.left) / r.width) * 100;
    var y = ((event.clientY - r.top) / r.height) * 100;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    return x.toFixed(2) + "% " + y.toFixed(2) + "%";
  }

  function factor() {
    if (!showing) return ZOOM_MIN;
    var wide = showing.getBoundingClientRect().width;
    var real = showing.naturalWidth || 0;
    if (!wide || !real) return ZOOM_MIN;
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, real / wide));
  }

  function magnify(event) {
    if (!showing) return;
    showing.style.transformOrigin =
      event && event.detail ? originFrom(event) : "50% 50%";
    showing.style.transform = "scale(" + factor().toFixed(3) + ")";
    magnified = true;
    frame.classList.add("is-magnified");
    frame.setAttribute("aria-label", "Zoom out");
  }

  function demagnify() {
    if (showing) {
      showing.style.transform = "";
      showing.style.transformOrigin = "";
    }
    magnified = false;
    if (frame) {
      frame.classList.remove("is-magnified");
      frame.setAttribute("aria-label", "Zoom in");
    }
  }

  function open(zoom) {
    if (!box) build();

    var source = zoom.querySelector("picture");
    var copy = source.cloneNode(true);
    Array.prototype.forEach.call(copy.querySelectorAll("source"), function (s) {
      s.setAttribute("sizes", "100vw");
    });
    var img = copy.querySelector("img");
    if (img) {
      img.removeAttribute("loading");
      img.removeAttribute("class");
      img.removeAttribute("width");
      img.removeAttribute("height");
      img.setAttribute("sizes", "100vw");
    }

    frame.textContent = "";
    frame.appendChild(copy);
    showing = img;
    demagnify();
    box.setAttribute("aria-label", (img && img.alt) || "Picture");
    loadManifest().then(function () {
      upgrade(img);
    });

    cameFrom = zoom;
    box.hidden = false;
    document.body.classList.add("is-zoomed");
    requestAnimationFrame(function () {
      box.classList.add("is-open");
    });
    closer.focus({ preventScroll: true });
  }

  function close() {
    if (!box || box.hidden) return;
    box.classList.remove("is-open");
    box.hidden = true;
    demagnify();
    showing = null;
    frame.textContent = "";
    document.body.classList.remove("is-zoomed");
    if (cameFrom) cameFrom.focus({ preventScroll: true });
    cameFrom = null;
  }

  Array.prototype.forEach.call(zooms, function (zoom) {
    zoom.addEventListener("pointerenter", loadManifest);
    zoom.addEventListener("focus", loadManifest);
    zoom.addEventListener("click", function (event) {
      event.preventDefault();
      open(zoom);
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || !box || box.hidden) return;
    event.preventDefault();
    event.stopPropagation();
    if (magnified) return demagnify();
    close();
  });

  document.addEventListener("focusin", function (event) {
    if (!box || box.hidden) return;
    if (!box.contains(event.target)) closer.focus({ preventScroll: true });
  });
})();

// Any picture on the front page, full screen.
//
// The gallery shows everything at once, which is the point of it, but a
// painting at 380px in a row of four is a thumbnail of a painting. Clicking one
// puts it on its own ground at whatever size the window allows.
//
// The overlay is built once, on the first press, and reused: it is markup
// nobody needs until they ask for it. Escape closes it, so does the button, so
// does clicking anywhere — and focus goes back to the picture you came from,
// which is where the eye already is.
(function () {
  var zooms = document.querySelectorAll(".art-zoom");
  if (!zooms.length) return;

  var box = null;
  var frame = null;
  var closer = null;
  var cameFrom = null;

  /* ---- the full-size copies ----
     The gallery loads pictures at the size the gallery shows them, which is
     the right size to load for a page of forty of them and the wrong size for
     one of them filling a window. Where a bigger file exists it is fetched
     here and nowhere else: the manifest is read the first time anybody opens
     anything, and the file itself only when the picture that needs it is
     opened. Until it arrives the gallery's copy is on screen, so there is
     never a blank frame -- the picture simply sharpens.

     A manifest rather than an attribute on every image: which pictures have a
     full-size copy is a fact about what is in art/web, and art/build-web.sh
     already knows it. */
  var FULL_URL = "art/web/full.json";
  var full = null;      // { suffix, stems: {stem: true} }
  var asked = null;     // the one request for it, whatever state it is in

  /* Returns the request rather than firing and forgetting, so that opening a
     picture before the manifest has landed still upgrades it when it does.
     Asked for once; every caller after that gets the same promise. */
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

  /* art/web/masaryk/ma1-640.jpg -> art/web/masaryk/ma1 */
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
      /* The window may have been closed, or another picture opened, while
         this was on its way. */
      if (!shown.isConnected) return;
      /* The <source>s have to go, not just the img's own srcset: a source that
         still matches beats anything set on the img, so leaving them there
         means fetching the large file and then not showing it. */
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
    /* A dialog rather than a region: it takes the whole window, and what is
       behind it is not to be read while it is open. */
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");

    frame = document.createElement("div");
    frame.className = "lightbox-frame";

    closer = document.createElement("button");
    closer.type = "button";
    closer.className = "lightbox-close";
    closer.setAttribute("aria-label", "Close");
    closer.title = "Close";
    closer.textContent = "×";

    box.appendChild(frame);
    box.appendChild(closer);
    document.body.appendChild(box);

    closer.addEventListener("click", close);
    box.addEventListener("click", function (event) {
      /* Anywhere, including the picture: at this size the picture is the
         subject, not a control, and wanting it gone is the only thing left to
         want. */
      if (event.target !== closer) close();
    });
  }

  function open(zoom) {
    if (!box) build();

    /* The whole <picture> is copied rather than just its src, so the browser
       still chooses between the formats it can read. What changes is sizes:
       in the gallery this picture was told it would be 380px wide, and here it
       is as wide as the window. */
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
    box.setAttribute("aria-label", (img && img.alt) || "Picture");
    /* After the manifest, whenever that is: the first picture opened on a
       visit is usually asking before the answer has arrived. */
    loadManifest().then(function () {
      upgrade(img);
    });

    cameFrom = zoom;
    box.hidden = false;
    document.body.classList.add("is-zoomed");
    /* Off the same frame as the unhide, so the transition has two states to
       move between rather than starting already finished. */
    requestAnimationFrame(function () {
      box.classList.add("is-open");
    });
    closer.focus({ preventScroll: true });
  }

  function close() {
    if (!box || box.hidden) return;
    box.classList.remove("is-open");
    box.hidden = true;
    frame.textContent = "";
    document.body.classList.remove("is-zoomed");
    if (cameFrom) cameFrom.focus({ preventScroll: true });
    cameFrom = null;
  }

  Array.prototype.forEach.call(zooms, function (zoom) {
    /* The manifest is worth having before the click that needs it, and a
       pointer over a picture is a good enough guess that one is coming. */
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
    /* Nothing else on this page listens for escape, but say so anyway: the
       game and the blog both do, and this file may not always be alone. */
    event.stopPropagation();
    close();
  });

  /* Tab must not walk out of the overlay into the page behind it. With two
     stops — the picture is not one — the trap is this short. */
  document.addEventListener("focusin", function (event) {
    if (!box || box.hidden) return;
    if (!box.contains(event.target)) closer.focus({ preventScroll: true });
  });
})();

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

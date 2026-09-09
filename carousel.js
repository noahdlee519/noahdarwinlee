// The cards that show more than one view of the same piece in the same frame.
//
// Everything else on the front page is laid out flat — a lead and a row of the
// rest — because a picture you have to click for is a picture most people never
// see. A card marked art-card-carousel is the exception: two views of one work
// where showing both side by side would read as two works.
//
// Which half of the picture the pointer is over decides which way a click goes,
// and the cursor says so before the click is spent. Every view is in the markup
// from the start, so with no script the first one is simply the picture.
(function () {
  var cards = document.querySelectorAll(".art-card-carousel");
  if (!cards.length) return;

  Array.prototype.forEach.call(cards, function (card) {
    var views = card.querySelectorAll(".art-carousel .art-plate");
    var status = card.querySelector(".carousel-status");
    if (views.length < 2) return;

    var at = 0;

    function show(next) {
      at = (next + views.length) % views.length;
      Array.prototype.forEach.call(views, function (view, i) {
        view.hidden = i !== at;
      });
      if (status) status.textContent = at + 1 + " of " + views.length;
      var button = views[at].querySelector(".art-trigger");
      if (button) button.focus({ preventScroll: true });
    }

    Array.prototype.forEach.call(views, function (view) {
      var button = view.querySelector(".art-trigger");
      if (!button) return;

      /* Left half back, right half on. The classes are only the cursor: the
         click below works out its own direction, so a click that lands between
         two pointermove events still goes the way the pointer was pointing. */
      function side(event) {
        var box = button.getBoundingClientRect();
        return event.clientX - box.left < box.width / 2 ? -1 : 1;
      }

      button.addEventListener("pointermove", function (event) {
        var back = side(event) < 0;
        button.classList.toggle("is-prev", back);
        button.classList.toggle("is-next", !back);
      });

      button.addEventListener("pointerleave", function () {
        button.classList.remove("is-prev", "is-next");
      });

      button.addEventListener("click", function (event) {
        event.preventDefault();
        /* A click with no coordinates is the keyboard pressing enter, and
           enter goes forward. */
        show(at + (event.detail === 0 ? 1 : side(event)));
      });

      button.addEventListener("keydown", function (event) {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          show(at - 1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          show(at + 1);
        }
      });
    });

    /* The markup already has the first view showing and the rest hidden; this
       only writes the count for a screen reader. */
    if (status) status.textContent = "1 of " + views.length;
  });
})();

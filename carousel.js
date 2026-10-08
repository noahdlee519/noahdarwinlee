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

    if (status) status.textContent = "1 of " + views.length;
  });
})();

// Eight links behind one mark.
//
// What used to be here showed four of them at a time and changed itself every
// five seconds. A list that moves while you are reading it is a list you
// cannot use, and eight links do not have to sit across the top of the page to
// be findable. They are all in the markup, in one panel, and the nine squares
// open it.
//
// Everything visible is done in the stylesheet, off one attribute on the
// container. This file only decides when that attribute changes -- and what
// the keyboard, the rest of the page, and the scroll should be able to do
// about it.
(function () {
  var menu = document.getElementById("site-menu");
  if (!menu) return;
  var button = document.getElementById("site-menu-btn");
  var panel = document.getElementById("site-menu-panel");
  if (!button || !panel) return;

  var links = Array.prototype.slice.call(panel.querySelectorAll("a"));
  var open = false;
  var openedAt = 0;

  /* Closed, the links are not in the tab order: a panel nobody can see is not
     a place the keyboard should be able to arrive at. */
  function setOpen(next, focusFirst) {
    if (open === next) return;
    open = next;
    menu.setAttribute("data-open", String(open));
    button.setAttribute("aria-expanded", String(open));
    if (open) {
      panel.removeAttribute("inert");
      openedAt = window.scrollY;
      if (focusFirst && links.length) links[0].focus({ preventScroll: true });
    } else {
      panel.setAttribute("inert", "");
    }
  }

  function close(returnFocus) {
    if (!open) return;
    setOpen(false);
    if (returnFocus) button.focus({ preventScroll: true });
  }

  setOpen(false);
  panel.setAttribute("inert", "");
  menu.setAttribute("data-open", "false");

  button.addEventListener("click", function (event) {
    event.stopPropagation();
    setOpen(!open, false);
  });

  /* Down from the button walks into the list, which is what a menu does. */
  button.addEventListener("keydown", function (event) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    setOpen(true, false);
    var target = event.key === "ArrowDown" ? links[0] : links[links.length - 1];
    if (target) target.focus({ preventScroll: true });
  });

  panel.addEventListener("keydown", function (event) {
    var here = links.indexOf(document.activeElement);
    if (here === -1) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      var step = event.key === "ArrowDown" ? 1 : -1;
      /* Round, rather than stopping at the ends: with eight of them the way
         to the last is up from the first. */
      var next = (here + step + links.length) % links.length;
      links[next].focus({ preventScroll: true });
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      links[event.key === "Home" ? 0 : links.length - 1].focus({ preventScroll: true });
    }
  });

  /* A link that opens in a new tab leaves this page where it was, with the
     panel still hanging open over it. */
  links.forEach(function (link) {
    link.addEventListener("click", function () {
      close(false);
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || !open) return;
    event.preventDefault();
    close(true);
  });

  /* Anywhere else on the page. pointerdown rather than click so it closes on
     the way down, before whatever was pressed happens. */
  document.addEventListener("pointerdown", function (event) {
    if (!open || menu.contains(event.target)) return;
    close(false);
  });

  /* The header fades on the way down the page and takes the mark with it, so a
     panel left open would be hanging off something invisible. A little travel
     is allowed first: a phone that jogs a few pixels under a thumb has not
     scrolled. */
  window.addEventListener(
    "scroll",
    function () {
      if (!open) return;
      if (Math.abs(window.scrollY - openedAt) > 40) close(false);
    },
    { passive: true }
  );

  window.addEventListener("blur", function () {
    close(false);
  });
})();

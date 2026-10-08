(function () {
  var menu = document.getElementById("site-menu");
  if (!menu) return;
  var button = document.getElementById("site-menu-btn");
  var panel = document.getElementById("site-menu-panel");
  if (!button || !panel) return;

  var links = Array.prototype.slice.call(panel.querySelectorAll("a"));
  var open = false;
  var openedAt = 0;

  var leaveTimer = null;

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

  function cancelLeave() {
    if (leaveTimer) {
      clearTimeout(leaveTimer);
      leaveTimer = null;
    }
  }

  setOpen(false);
  panel.setAttribute("inert", "");
  menu.setAttribute("data-open", "false");

  if (window.matchMedia("(hover: hover)").matches) {
    menu.addEventListener("mouseenter", function () {
      cancelLeave();
      setOpen(true, false);
    });

    menu.addEventListener("mouseleave", function () {
      cancelLeave();
      leaveTimer = setTimeout(function () {
        close(false);
      }, 300);
    });
  }

  button.addEventListener("click", function (event) {
    event.stopPropagation();
    setOpen(!open, false);
  });

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
      var next = (here + step + links.length) % links.length;
      links[next].focus({ preventScroll: true });
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      links[event.key === "Home" ? 0 : links.length - 1].focus({ preventScroll: true });
    }
  });

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

  document.addEventListener("pointerdown", function (event) {
    if (!open || menu.contains(event.target)) return;
    close(false);
  });

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

// Opens and closes the contact dropdown in the about panel.
// Hover on pointer devices, tap on touch, same pattern as the
// nine-square menu in the header.
(function () {
  var menu = document.getElementById("contact-menu");
  if (!menu) return;
  var btn = menu.querySelector(".contact-menu-btn");
  var leaveTimer;

  function setOpen(open) {
    menu.setAttribute("data-open", String(open));
    btn.setAttribute("aria-expanded", String(open));
  }

  function cancelLeave() {
    if (leaveTimer) {
      clearTimeout(leaveTimer);
      leaveTimer = null;
    }
  }

  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    setOpen(menu.getAttribute("data-open") !== "true");
  });

  if (window.matchMedia("(hover: hover)").matches) {
    menu.addEventListener("mouseenter", function () {
      cancelLeave();
      setOpen(true);
    });
    menu.addEventListener("mouseleave", function () {
      cancelLeave();
      leaveTimer = setTimeout(function () {
        setOpen(false);
      }, 300);
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && menu.getAttribute("data-open") === "true") {
      setOpen(false);
      btn.focus();
    }
  });

  document.addEventListener("click", function (e) {
    if (menu.getAttribute("data-open") === "true" && !menu.contains(e.target)) {
      setOpen(false);
    }
  });

  // close when the about panel collapses so it does not flash
  // open the next time the panel expands.
  document.addEventListener("bio:toggle", function () {
    var panel = document.getElementById("about-panel");
    if (panel && !panel.classList.contains("is-open")) {
      setOpen(false);
    }
  });
})();

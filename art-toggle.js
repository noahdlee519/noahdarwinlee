(function () {
  const toggle = document.getElementById("art-toggle");
  const gallery = document.getElementById("art-gallery");
  if (!toggle || !gallery) return;

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    gallery.classList.toggle("is-collapsed", !open);
    toggle.setAttribute("aria-expanded", String(open));
    document.dispatchEvent(new Event("bio:toggle"));
  });
})();

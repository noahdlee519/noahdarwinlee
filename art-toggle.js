// Folds the gallery away under the "art" header, and brings it back. Open on
// arrival; with no script the button does nothing and the pictures are simply
// there, which is the state the markup is written in.
(function () {
  const toggle = document.getElementById("art-toggle");
  const gallery = document.getElementById("art-gallery");
  if (!toggle || !gallery) return;

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    gallery.classList.toggle("is-collapsed", !open);
    toggle.setAttribute("aria-expanded", String(open));
    // The page just got a lot shorter or longer, and the fixed header
    // measures its fade against page height -- the same nudge about sends.
    document.dispatchEvent(new Event("bio:toggle"));
  });
})();

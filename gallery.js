// Enhances the static gallery markup in index.html.
// Every artwork is already in the HTML (title, image, caption, alt text) so the
// page works, and is indexable, with JavaScript switched off. This file only
// adds opening, cycling and deep-linking on top of it.
(function () {
  const gallery = document.getElementById("art-gallery");
  if (!gallery) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const SCROLL_OFFSET = 55;
  const cards = [...gallery.querySelectorAll(".art-card")];
  const baseTitle = document.title;
  let openCard = null;

  // The tab, browser history and any pasted link carry the open piece's name.
  function setDocTitle(card) {
    if (!card) {
      document.title = baseTitle;
      return;
    }
    const name = card.querySelector(".art-title").textContent.trim();
    document.title = `${name} — Noah Darwin Lee`;
  }

  const isDesktop = () => window.innerWidth > 900;
  const behavior = () => (reduce.matches ? "auto" : "smooth");

  // Scroll so the artwork itself sits SCROLL_OFFSET from the top. The card box
  // starts ~60px above its image (card padding + stage margin), so this must be
  // measured from the image, not the card.
  function scrollToCard(el) {
    requestAnimationFrame(() => {
      const y = Math.max(0, window.scrollY + el.getBoundingClientRect().top - SCROLL_OFFSET);
      if (Math.abs(y - window.scrollY) < 1) return;
      window.scrollTo({ top: y, behavior: behavior() });
    });
  }

  // The caption panel wipes open from the image's right edge. Its top aligns
  // with the top of the image; its height is whatever the caption needs. Left
  // edge comes from --art-media-width so every caption shares the same x.
  function layoutPanel(card) {
    const panel = card.querySelector(".art-caption-panel");
    const frame = card.querySelector(".carousel-frame");
    if (!panel || !frame) return;
    if (!isDesktop()) {
      panel.style.top = "";
      return;
    }
    const stageTop = card.querySelector(".art-stage").getBoundingClientRect().top;
    const frameRect = frame.getBoundingClientRect();
    panel.style.left = "";
    panel.style.top = `${frameRect.top - stageTop}px`;
  }

  function closeCard(card, { focus = false } = {}) {
    if (!card) return;
    const trigger = card.querySelector(".art-trigger");
    card.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    if (card._reset) card._reset();
    if (openCard === card) {
      openCard = null;
      setDocTitle(null);
    }
    if (focus) trigger.focus();
    if (location.hash === "#" + card.id) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  }

  function openCardEl(card, { scroll = true, updateHash = true } = {}) {
    if (openCard && openCard !== card) closeCard(openCard);
    if (card.classList.contains("is-open")) return;
    card.classList.add("is-open");
    card.querySelector(".art-trigger").setAttribute("aria-expanded", "true");
    openCard = card;
    setDocTitle(card);
    layoutPanel(card);
    requestAnimationFrame(() => layoutPanel(card));
    if (updateHash && card.id) history.replaceState(null, "", "#" + card.id);
    if (scroll) scrollToCard(card.querySelector(".art-image") || card);
  }

  cards.forEach((card) => {
    const trigger = card.querySelector(".art-trigger");
    const img = trigger.querySelector(".art-image");
    const source = trigger.querySelector("source");
    const title = card.querySelector(".art-title");
    const slides = [...card.querySelectorAll(".art-slide-data")];
    const captions = [...card.querySelectorAll(".art-caption")];
    const status = card.querySelector(".carousel-status");
    const total = slides.length + 1;

    // Slide 0 is the markup already in the page; remember it so we can go back.
    const first = {
      src: img.getAttribute("src"),
      srcset: source ? source.getAttribute("srcset") : "",
      w: img.getAttribute("width"),
      h: img.getAttribute("height"),
      alt: img.getAttribute("alt"),
      title: title.textContent,
    };
    const frames = [first, ...slides.map((s) => ({
      src: s.dataset.src,
      srcset: s.dataset.srcset,
      w: s.dataset.w,
      h: s.dataset.h,
      alt: s.getAttribute("alt"),
      title: s.dataset.title,
    }))];

    let index = 0;
    let warmed = false;

    // Nothing beyond the cover is fetched until the carousel is actually opened.
    function warm() {
      if (warmed) return;
      warmed = true;
      frames.slice(1).forEach((f) => {
        const pre = new Image();
        if (f.srcset) pre.srcset = f.srcset;
        pre.src = f.src;
      });
    }

    function render() {
      const f = frames[index];
      // Hold the current box so the layout doesn't collapse while the next
      // image decodes.
      const frame = card.querySelector(".carousel-frame");
      const held = img.getBoundingClientRect().height;
      if (held > 0) frame.style.minHeight = `${Math.ceil(held)}px`;

      if (source) source.setAttribute("srcset", f.srcset || "");
      img.setAttribute("width", f.w);
      img.setAttribute("height", f.h);
      img.setAttribute("alt", f.alt);
      img.setAttribute("src", f.src);
      title.textContent = f.title;

      captions.forEach((c, i) => {
        c.hidden = i !== index;
        c.classList.toggle("is-active", i === index);
      });
      if (status) status.textContent = `${index + 1} of ${total}`;
      if (card === openCard) setDocTitle(card);

      const settle = () => {
        frame.style.minHeight = "";
        layoutPanel(card);
      };
      if (img.complete && img.naturalWidth > 0) requestAnimationFrame(settle);
      else img.addEventListener("load", settle, { once: true });
    }

    function go(delta, { keepTop = true } = {}) {
      if (total < 2) return;
      const before = keepTop ? img.getBoundingClientRect().top : null;
      index = (index + delta + total) % total;
      render();
      if (before != null) {
        requestAnimationFrame(() => {
          const drift = img.getBoundingClientRect().top - before;
          if (Math.abs(drift) > 0.5) window.scrollBy({ top: drift, behavior: "auto" });
        });
      }
    }

    card._reset = () => {
      if (index !== 0) { index = 0; render(); }
    };

    trigger.addEventListener("click", (event) => {
      if (!card.classList.contains("is-open")) {
        warm();
        openCardEl(card);
        return;
      }
      if (total < 2) return;
      // Click the left half to go back, the right half to go forward.
      const rect = img.getBoundingClientRect();
      go(event.clientX - rect.left < rect.width / 2 ? -1 : 1);
    });

    // Keyboard: Enter/Space open (native button behaviour), arrows cycle.
    trigger.addEventListener("keydown", (event) => {
      if (!card.classList.contains("is-open") || total < 2) return;
      if (event.key === "ArrowRight") { event.preventDefault(); go(1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); go(-1); }
    });

    if (total > 1) {
      // Tracked whether the card is open or not: closed, it's just a cursor
      // hint that there's more to the piece in that direction; open, the
      // same halves are the actual prev/next click zones.
      trigger.addEventListener("mousemove", (event) => {
        const rect = img.getBoundingClientRect();
        const left = event.clientX - rect.left < rect.width / 2;
        trigger.classList.toggle("is-prev", left);
        trigger.classList.toggle("is-next", !left);
      });
      trigger.addEventListener("mouseleave", () => {
        trigger.classList.remove("is-prev", "is-next");
      });
    }

    title.addEventListener("click", () => {
      if (card.classList.contains("is-open")) closeCard(card, { focus: true });
      else { warm(); openCardEl(card); }
    });
  });

  // One close behaviour for everything: Escape, or a click outside.
  // With a piece open, up/down step between pieces the way left/right step
  // between the slides of a carousel.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && openCard) {
      closeCard(openCard, { focus: true });
      return;
    }
    if (!openCard) return;
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const i = cards.indexOf(openCard);
    const next = cards[i + (event.key === "ArrowDown" ? 1 : -1)];
    if (!next) return; // stop at the ends rather than wrapping
    event.preventDefault();
    openCardEl(next);
    next.querySelector(".art-trigger").focus({ preventScroll: true });
  });

  document.addEventListener("click", (event) => {
    if (!openCard) return;
    if (openCard.contains(event.target)) return;
    if (event.target.closest(".art-card")) return; // another card handles itself
    closeCard(openCard);
  });

  window.addEventListener("resize", () => { if (openCard) layoutPanel(openCard); });

  // Deep links: /#masaryk opens that piece on load.
  function openFromHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    const card = cards.find((c) => c.id === id);
    if (card) openCardEl(card, { scroll: true, updateHash: false });
  }
  window.addEventListener("hashchange", openFromHash);
  openFromHash();
})();

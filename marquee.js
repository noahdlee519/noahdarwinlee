// Materials page: each row is one title repeated end to end, with that item's
// image dropped in after a randomly chosen word. Rows are frozen until hovered.
(function () {
  const rows = [...document.querySelectorAll(".marquee-row")];
  if (!rows.length) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = window.matchMedia("(hover: none)");
  const SPEED = 20; // seconds per 1000px (50 px/s)

  function pick(max) {
    return Math.floor(Math.random() * max);
  }

  // One repetition: the title's words, with the image after a random word.
  function makeRun(title, img, ratio) {
    const run = document.createElement("span");
    run.className = "marquee-run";
    const words = title.toUpperCase().split(/\s+/);
    const at = pick(words.length);
    words.forEach((word, i) => {
      const w = document.createElement("span");
      w.className = "marquee-word";
      w.textContent = word;
      run.appendChild(w);
      if (img && i === at) {
        const picture = document.createElement("picture");
        const source = document.createElement("source");
        source.type = "image/webp";
        source.srcset = img + ".webp";
        const el = document.createElement("img");
        el.className = "marquee-img";
        el.src = img + ".jpg";
        el.alt = "";
        el.loading = "lazy";
        el.decoding = "async";
        el.width = Math.round(480 * ratio);
        el.height = 480;
        picture.appendChild(source);
        picture.appendChild(el);
        run.appendChild(picture);
      }
    });
    return run;
  }

  rows.forEach((row) => {
    const title = row.dataset.title;
    const img = row.dataset.img;
    const ratio = parseFloat(row.dataset.ratio) || 1;

    const track = document.createElement("div");
    track.className = "marquee-track";
    track.setAttribute("aria-hidden", "true"); // the row's aria-label carries the name
    const seq = document.createElement("div");
    seq.className = "marquee-seq";
    track.appendChild(seq);
    row.appendChild(track);

    // Fill one sequence to several screens wide, so the loop never shows a gap
    // and you travel a long way before the same arrangement of words and images
    // comes round again. Cloning it gives a seamless wrap.
    let guard = 0;
    do {
      seq.appendChild(makeRun(title, img, ratio));
      const mark = document.createElement("span");
      mark.className = "marquee-mark";
      seq.appendChild(mark);
      guard += 1;
    } while (seq.scrollWidth < window.innerWidth * 3 && guard < 60);

    const clone = seq.cloneNode(true);
    clone.classList.add("is-clone");
    track.appendChild(clone);

    const width = seq.scrollWidth;
    const duration = (width / 1000) * SPEED;
    // Every other row runs the other way.
    const reverse = rows.indexOf(row) % 2 === 1;
    track.style.animationName = reverse ? "marquee-right" : "marquee-left";
    track.style.animationDuration = `${duration}s`;
    // A negative delay parks each row at a different point in its loop, so the
    // block looks scattered rather than aligned while frozen.
    const offset = (parseFloat(row.dataset.offset) || 0) / 100;
    track.style.animationDelay = `${offset * duration}s`;
    if (reverse) track.style.transform = "translateX(-50%)";
  });

  // Touch devices have no hover, so the rows drift on their own instead.
  function applyMode() {
    document.body.classList.toggle("marquee-auto", coarse.matches && !reduce.matches);
    document.body.classList.toggle("marquee-still", reduce.matches);
  }
  coarse.addEventListener?.("change", applyMode);
  reduce.addEventListener?.("change", applyMode);
  applyMode();
})();

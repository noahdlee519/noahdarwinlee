(function () {
  const rows = [...document.querySelectorAll(".marquee-row")];
  if (!rows.length) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = window.matchMedia("(hover: none)");

  const DRIFT = 50;
  const MAX_FLING = 3600;
  const EASE = 0.42;
  const DRAG_SLOP = 6;

  function pick(max) {
    return Math.floor(Math.random() * max);
  }

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
        el.draggable = false;
        el.width = Math.round(480 * ratio);
        el.height = 480;
        picture.appendChild(source);
        picture.appendChild(el);
        run.appendChild(picture);
      }
    });
    return run;
  }

  function wrap(x, w) {
    if (!w) return 0;
    x %= w;
    if (x > 0) x -= w;
    return x;
  }

  const lanes = rows.map((row, index) => {
    const title = row.dataset.title;
    const img = row.dataset.img;
    const ratio = parseFloat(row.dataset.ratio) || 1;

    const track = document.createElement("div");
    track.className = "marquee-track";
    track.setAttribute("aria-hidden", "true");
    const seq = document.createElement("div");
    seq.className = "marquee-seq";
    track.appendChild(seq);
    row.appendChild(track);

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

    const lane = {
      row: row,
      track: track,
      seq: seq,
      clone: clone,
      width: seq.scrollWidth,
      dir: index % 2 === 1 ? 1 : -1,
      offset: 0,
      velocity: 0,
      hovered: false,
      dragging: false,
      pointerId: null,
      lastX: 0,
      lastT: 0,
      moved: 0
    };
    lane.offset = wrap(-((parseFloat(row.dataset.offset) || 0) / 100) * lane.width, lane.width);
    return lane;
  });

  function measure() {
    lanes.forEach((lane) => {
      const w = lane.seq.scrollWidth;
      if (w && Math.abs(w - lane.width) > 1) {
        lane.width = w;
        lane.offset = wrap(lane.offset, w);
      }
    });
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  window.addEventListener("load", measure);
  window.addEventListener("resize", measure);
  document.querySelectorAll(".marquee-img").forEach((img) => {
    if (!img.complete) img.addEventListener("load", measure, { once: true });
  });

  function driftFor(lane) {
    if (reduce.matches) return 0;
    if (lane.dragging) return 0;
    if (coarse.matches || lane.hovered) return DRIFT * lane.dir;
    return 0;
  }

  let visible = true;
  let looping = false;

  let last = 0;
  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    lanes.forEach((lane) => {
      if (!lane.dragging && dt) {
        const target = driftFor(lane);
        lane.velocity += (target - lane.velocity) * (1 - Math.exp(-dt / EASE));
        lane.offset = wrap(lane.offset + lane.velocity * dt, lane.width);
      }
      lane.track.style.transform = "translateX(" + lane.offset.toFixed(2) + "px)";
    });
    if (visible) {
      requestAnimationFrame(frame);
    } else {
      looping = false;
    }
  }

  function startLoop() {
    if (looping) return;
    looping = true;
    last = 0;
    requestAnimationFrame(frame);
  }
  startLoop();

  if (typeof IntersectionObserver !== "undefined") {
    let count = 0;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { count += e.isIntersecting ? 1 : -1; });
        visible = count > 0;
        if (visible) startLoop();
      },
      { rootMargin: "200px" }
    );
    rows.forEach((r) => io.observe(r));
  }

  lanes.forEach((lane) => {
    const row = lane.row;

    row.addEventListener("pointerenter", () => { lane.hovered = true; });
    row.addEventListener("pointerleave", () => { lane.hovered = false; });

    row.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      lane.dragging = true;
      lane.pointerId = e.pointerId;
      lane.lastX = e.clientX;
      lane.lastT = e.timeStamp;
      lane.velocity = 0;
      lane.moved = 0;
      row.classList.add("is-dragging");
      if (row.setPointerCapture) row.setPointerCapture(e.pointerId);
    });

    row.addEventListener("pointermove", (e) => {
      if (!lane.dragging || e.pointerId !== lane.pointerId) return;
      const dx = e.clientX - lane.lastX;
      const dt = Math.max(1, e.timeStamp - lane.lastT) / 1000;
      lane.moved += Math.abs(dx);
      lane.offset = wrap(lane.offset + dx, lane.width);
      lane.velocity = Math.max(-MAX_FLING, Math.min(MAX_FLING, dx / dt));
      lane.lastX = e.clientX;
      lane.lastT = e.timeStamp;
      if (lane.moved > DRAG_SLOP) e.preventDefault();
    });

    function endDrag(e) {
      if (!lane.dragging || (e && e.pointerId !== lane.pointerId)) return;
      lane.dragging = false;
      lane.pointerId = null;
      row.classList.remove("is-dragging");
      if (lane.moved > DRAG_SLOP) {
        lane.suppressClick = true;
        setTimeout(() => { lane.suppressClick = false; }, 0);
      }
    }
    row.addEventListener("pointerup", endDrag);
    row.addEventListener("pointercancel", endDrag);

    row.addEventListener("click", (e) => {
      if (lane.suppressClick) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    row.addEventListener("dragstart", (e) => e.preventDefault());
  });

  function applyMode() {
    document.body.classList.toggle("marquee-still", reduce.matches);
  }
  coarse.addEventListener?.("change", applyMode);
  reduce.addEventListener?.("change", applyMode);
  applyMode();
})();

/* Layout Guesser — name the city from its layout, seen from above.
   One guess per image, no retries: a wrong answer reveals the city and moves on.

   Data lives in game/cities.json. Images live in art/game/ and are matched to a
   city by its id: art/game/<id>.webp (or .jpg / .jpeg / .png — whichever is
   there). A city with no image on disk is skipped silently, so the game works
   with three images or three hundred and never has to be kept in sync by hand.

   A game in progress is kept in localStorage so a refresh puts you back where
   you were. It is thrown away the moment the game ends. */

(function () {
  "use strict";

  var DATA_URL = "cities.json";
  var EXTENSIONS = ["webp", "jpg", "jpeg", "png"];
  var BATCH = 4;
  var STORE_KEY = "ndl-layout-guesser-v1";

  var el = {
    intro: document.getElementById("game-intro"),
    tiers: document.getElementById("game-tiers"),
    empty: document.getElementById("game-empty"),
    board: document.getElementById("game-board"),
    progress: document.getElementById("game-progress"),
    score: document.getElementById("game-score"),
    frame: document.getElementById("game-frame"),
    form: document.getElementById("game-form"),
    input: document.getElementById("game-input"),
    submit: document.getElementById("game-submit"),
    reveal: document.getElementById("game-reveal"),
    verdict: document.getElementById("game-verdict"),
    answer: document.getElementById("game-answer"),
    next: document.getElementById("game-next"),
    quit: document.getElementById("game-quit"),
    status: document.getElementById("game-status"),
    result: document.getElementById("game-result"),
    resultScore: document.getElementById("game-result-score"),
    recap: document.getElementById("game-recap"),
    replay: document.getElementById("game-replay"),
    change: document.getElementById("game-change"),
    credit: document.getElementById("game-credit")
  };

  var data = null;
  var state = null;
  var byId = {};
  var manifest = null;   // ids that have a picture, written by build-images.sh
  var loupe = null;

  /* ---------- text matching ---------- */

  function norm(s) {
    return String(s)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  /* Damerau-Levenshtein (optimal string alignment): like Levenshtein but a
     swapped pair of letters costs one, not two, so "tornoto" and "chigaco"
     are one step from the answer the way a typist expects. */
  function lev(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var two = [];
    var prev = [];
    var cur = [];
    var i, j, t;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      for (j = 1; j <= b.length; j++) {
        var cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (
          i > 1 &&
          j > 1 &&
          a.charCodeAt(i - 1) === b.charCodeAt(j - 2) &&
          a.charCodeAt(i - 2) === b.charCodeAt(j - 1)
        ) {
          cur[j] = Math.min(cur[j], two[j - 2] + 1);
        }
      }
      two = prev;
      prev = cur;
    }
    return prev[b.length];
  }

  /* How far off a guess may be, by the length of what it is measured against.
     Abbreviations have to be exact — otherwise "sf" passes for Singapore and
     "dc" for Mexico City's "df" — and everything else gets one slip, which is
     what a typo actually is. Only long names get two, because there is more of
     them to get wrong. Loosening any of these starts accepting Houston for
     Boston and Dublin for Berlin, which is worse than rejecting a near miss. */
  function tolerance(len) {
    if (len <= 3) return 0;
    if (len <= 12) return 1;
    return 2;
  }

  /* Every name and alias in the file, so a guess that is exactly some other
     city's name is never taken as a near miss for this one. */
  var everyTerm = null;

  function buildTermIndex() {
    everyTerm = {};
    data.cities.forEach(function (c) {
      [c.city].concat(c.aliases || []).forEach(function (t) {
        var k = norm(t);
        if (k && !everyTerm[k]) everyTerm[k] = c.id;
      });
    });
  }

  function isMatch(guess, city) {
    var g = norm(guess);
    if (!g) return false;
    var targets = [city.city].concat(city.aliases || []).map(norm);

    /* Exact wins outright. */
    if (targets.indexOf(g) !== -1) return true;

    /* If what they typed is exactly the name of a different place, they meant
       that place. Without this, "panama" counts as a one-letter typo for
       Manama, and "houston" for Boston. */
    if (everyTerm && everyTerm[g] && everyTerm[g] !== city.id) return false;

    return targets.some(function (t) {
      if (!t) return false;
      if (Math.abs(g.length - t.length) > tolerance(t.length)) return false;
      return lev(g, t) <= tolerance(t.length);
    });
  }

  /* ---------- saved game ---------- */

  function save() {
    if (!state) return;
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({
          tier: state.tier,
          index: state.index,
          correct: state.correct,
          revealed: state.revealed,
          rounds: state.rounds.map(function (r) {
            return { id: r.city.id, url: r.url };
          }),
          log: state.log.map(function (e) {
            return { id: e.city.id, right: e.right, guess: e.guess };
          })
        })
      );
    } catch (err) {
      /* private mode, quota, whatever — the game just won't resume */
    }
  }

  function forget() {
    try {
      localStorage.removeItem(STORE_KEY);
    } catch (err) {}
  }

  function restore() {
    var saved;
    try {
      saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    } catch (err) {
      return false;
    }
    if (!saved || !saved.rounds || !saved.rounds.length) return false;

    var rounds = [];
    for (var i = 0; i < saved.rounds.length; i++) {
      var city = byId[saved.rounds[i].id];
      if (!city) return false; // the list changed under it; start fresh
      rounds.push({ city: city, url: saved.rounds[i].url });
    }
    if (!(saved.index >= 0) || saved.index >= rounds.length) {
      forget();
      return false;
    }

    var log = (saved.log || [])
      .map(function (e) {
        return { city: byId[e.id], right: e.right, guess: e.guess };
      })
      .filter(function (e) {
        return e.city;
      });

    state = {
      tier: saved.tier,
      rounds: rounds,
      index: saved.index,
      correct: saved.correct || 0,
      revealed: false,
      log: log
    };

    show(el.intro, false);
    show(el.result, false);
    show(el.board, true);
    renderRound();
    if (saved.revealed && log.length === state.index + 1) {
      reveal(log[state.index]);
    }
    return true;
  }

  /* ---------- images ---------- */

  function imageOk(url) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        resolve(img.naturalWidth > 1);
      };
      img.onerror = function () {
        resolve(false);
      };
      img.src = url;
    });
  }

  function resolveImage(dir, id) {
    var i = 0;
    function tryNext() {
      if (i >= EXTENSIONS.length) return Promise.resolve(null);
      var url = dir + id + "." + EXTENSIONS[i++];
      return imageOk(url).then(function (ok) {
        return ok ? url : tryNext();
      });
    }
    return tryNext();
  }

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  /* Warms the next few images so the player never waits between rounds. */
  function warm(rounds, from, count) {
    for (var i = from; i < from + count && i < rounds.length; i++) {
      var img = new Image();
      img.src = rounds[i].url;
    }
  }

  /* With the manifest (art/game/images.json, written by build-images.sh) this
     is instant: shuffle the cities that have a picture and take ten.

     Without it we have to ask the server about every candidate in turn, and
     that is what made "mixed" look broken — it draws from all 100 cities, so
     with 31 pictures it was firing a few hundred 404s and downloading ten
     images before showing round one. The probing path is kept only as a
     fallback for a checkout where the manifest hasn't been built. */
  function buildRounds(tier, want) {
    var dir = data.imageDir || "../art/game/";
    var mode = modeOf(tier);
    /* Three kinds of button: a level (easy/medium/hard), a continent, and
       "mixed", which is everything. */
    var pool = shuffle(
      data.cities.filter(function (c) {
        if (!mode || mode.id === "mixed") return mode ? true : c.tier === tier;
        if (mode.continent) return c.continent === mode.continent;
        return c.tier === mode.id;
      })
    );

    if (manifest && manifest.ids) {
      var ext = manifest.ext || "webp";
      var rounds = [];
      for (var i = 0; i < pool.length && rounds.length < want; i++) {
        if (manifest.ids.indexOf(pool[i].id) !== -1) {
          rounds.push({ city: pool[i], url: dir + pool[i].id + "." + ext });
        }
      }
      warm(rounds, 0, 3);
      return Promise.resolve(rounds);
    }

    var out = [];
    function step(i) {
      if (out.length >= want || i >= pool.length) return Promise.resolve(out);
      var slice = pool.slice(i, i + BATCH);
      return Promise.all(
        slice.map(function (c) {
          return resolveImage(dir, c.id);
        })
      ).then(function (urls) {
        slice.forEach(function (c, k) {
          if (urls[k] && out.length < want) out.push({ city: c, url: urls[k] });
        });
        return step(i + BATCH);
      });
    }
    return step(0);
  }

  /* ---------- rendering ---------- */

  function show(node, on) {
    if (node) node.hidden = !on;
  }

  function modeOf(id) {
    return (data.tiers || []).filter(function (x) {
      return x.id === id;
    })[0];
  }

  function tierLabel(id) {
    var t = modeOf(id);
    return t ? t.label : id;
  }

  function renderTiers() {
    el.tiers.innerHTML = "";
    var rows = {};
    var order = [];
    (data.tiers || []).forEach(function (t) {
      var key = t.group || "level";
      if (!rows[key]) {
        rows[key] = document.createElement("div");
        rows[key].className = "game-tier-row";
        order.push(key);
      }
      var b = document.createElement("button");
      b.type = "button";
      b.className = "game-tier";
      b.dataset.tier = t.id;
      b.textContent = t.label;
      b.addEventListener("click", function () {
        start(t.id);
      });
      rows[key].appendChild(b);
    });
    order.forEach(function (key) {
      el.tiers.appendChild(rows[key]);
    });
  }

  /* If a file has been renamed or removed since the game was saved, drop that
     round rather than showing a broken image. */
  function dropRound() {
    state.rounds.splice(state.index, 1);
    if (state.index >= state.rounds.length) finish();
    else renderRound();
  }

  /* A loupe: click the image and a small window follows the pointer showing the
     picture at its own resolution, which is roughly twice what fits on screen.
     Click again to put it away. Dragging works on a touchscreen. */
  function buildLoupe(stage, img, url) {
    var lens = document.createElement("div");
    lens.className = "game-loupe";
    lens.hidden = true;
    stage.appendChild(lens);

    var on = false;
    var size = 0;
    var zoom = 1;
    /* The round loads a 1400px file, which has nothing left to magnify on a
       dense screen. The @2x file is the full 2000px original; it is fetched the
       first time someone zooms, so people who never zoom never pay for it. */
    var source = url;
    var sourceWidth = 0;
    var wanted = false;

    function betterSource() {
      if (wanted || !manifest || !manifest.zoomExt) return;
      wanted = true;
      var big = new Image();
      big.onload = function () {
        source = big.src;
        sourceWidth = big.naturalWidth;
        if (on) measure();
      };
      big.src = url.replace(/\.[a-z0-9]+$/i, "") + manifest.zoomExt;
    }

    function measure() {
      var r = img.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      var natural = sourceWidth || img.naturalWidth || r.width;
      size = Math.round(Math.min(230, r.width * 0.5, r.height * 0.62));
      /* Magnify as far as the file can go without going soft, within reason,
         and then 10% past that. The ceiling is the screenshot itself: a bigger
         original zooms further. */
      zoom = Math.max(1.5, Math.min(3.2, natural / ((r.width || 1) * dpr))) * 1.1;
      lens.style.width = size + "px";
      lens.style.height = size + "px";
      lens.style.backgroundImage = 'url("' + source + '")';
      lens.style.backgroundSize = r.width * zoom + "px " + r.height * zoom + "px";
      return r;
    }

    function place(clientX, clientY) {
      var r = measure();
      var px = Math.max(0, Math.min(r.width, clientX - r.left));
      var py = Math.max(0, Math.min(r.height, clientY - r.top));
      var left = Math.max(0, Math.min(r.width - size, px - size / 2));
      var top = Math.max(0, Math.min(r.height - size, py - size / 2));
      lens.style.left = left + "px";
      lens.style.top = top + "px";
      lens.style.backgroundPosition =
        (px - left - px * zoom) + "px " + (py - top - py * zoom) + "px";
    }

    function show(x, y) {
      on = true;
      betterSource();
      stage.classList.add("is-zoomed");
      lens.hidden = false;
      place(x, y);
    }

    function hide() {
      on = false;
      stage.classList.remove("is-zoomed");
      lens.hidden = true;
    }

    img.addEventListener("click", function (e) {
      e.preventDefault();
      if (on) hide();
      else show(e.clientX, e.clientY);
      /* keep typing working — the click would otherwise take focus off the box */
      if (!el.form.hidden) el.input.focus({ preventScroll: true });
    });
    stage.addEventListener("pointermove", function (e) {
      if (on) place(e.clientX, e.clientY);
    });
    stage.addEventListener("pointerdown", function (e) {
      if (on && e.pointerType !== "mouse") place(e.clientX, e.clientY);
    });
    window.addEventListener("resize", function () {
      if (on) hide();
    });

    return { hide: hide };
  }

  function renderRound() {
    var round = state.rounds[state.index];
    state.revealed = false;

    if (loupe) loupe.hide();
    el.frame.innerHTML = "";
    var stage = document.createElement("div");
    stage.className = "game-stage";
    var img = document.createElement("img");
    img.className = "game-image";
    img.src = round.url;
    img.alt = "Satellite image of a city, round " + (state.index + 1);
    img.decoding = "async";
    img.title = "Click to magnify";
    img.addEventListener("error", dropRound);
    stage.appendChild(img);
    el.frame.appendChild(stage);
    loupe = buildLoupe(stage, img, round.url);
    warm(state.rounds, state.index + 1, 2);

    el.progress.textContent =
      tierLabel(state.tier) + " · " + (state.index + 1) + " / " + state.rounds.length;
    el.score.textContent = state.correct + " correct";
    show(el.reveal, false);
    show(el.form, true);
    el.input.value = "";
    el.input.disabled = false;
    el.submit.disabled = false;
    el.input.focus({ preventScroll: true });
    save();
  }

  function answerLine(city) {
    return city.country ? city.city + ", " + city.country : city.city;
  }

  function reveal(entry) {
    state.revealed = true;
    el.reveal.classList.toggle("is-right", entry.right);
    el.reveal.classList.toggle("is-wrong", !entry.right);
    el.verdict.textContent = entry.right ? "Yes." : "No.";
    el.answer.textContent = answerLine(entry.city);

    show(el.form, false);
    show(el.reveal, true);
    el.score.textContent = state.correct + " correct";
    el.status.textContent =
      (entry.right ? "Correct. " : "Wrong. ") + "The answer is " + answerLine(entry.city) + ".";
    el.next.textContent = state.index + 1 >= state.rounds.length ? "see result" : "next";
    el.next.focus({ preventScroll: true });
  }

  function judge(guess) {
    var round = state.rounds[state.index];
    var entry = { city: round.city, right: isMatch(guess, round.city), guess: guess.trim() };
    if (entry.right) state.correct += 1;
    state.log.push(entry);
    reveal(entry);
    save();
  }

  function advance() {
    state.index += 1;
    if (state.index >= state.rounds.length) finish();
    else renderRound();
  }

  function finish() {
    forget();
    show(el.board, false);
    show(el.result, true);
    el.resultScore.textContent =
      tierLabel(state.tier) + " · " + state.correct + " of " + state.log.length;
    el.recap.innerHTML = "";
    state.log.forEach(function (entry) {
      var li = document.createElement("li");
      li.className = "game-recap-item " + (entry.right ? "is-right" : "is-wrong");
      var mark = document.createElement("span");
      mark.className = "game-recap-mark";
      mark.setAttribute("aria-hidden", "true");
      var name = document.createElement("span");
      name.className = "game-recap-name";
      name.textContent = answerLine(entry.city);
      li.appendChild(mark);
      li.appendChild(name);
      if (!entry.right && entry.guess) {
        var said = document.createElement("span");
        said.className = "game-recap-guess";
        said.textContent = "you said " + entry.guess;
        li.appendChild(said);
      }
      el.recap.appendChild(li);
    });
    el.replay.focus({ preventScroll: true });
  }

  function start(tier) {
    forget();
    show(el.intro, false);
    show(el.result, false);
    show(el.board, true);
    el.frame.innerHTML = '<p class="game-loading">loading…</p>';
    el.progress.textContent = tierLabel(tier);
    el.score.textContent = "";
    show(el.form, false);
    show(el.reveal, false);

    buildRounds(tier, data.rounds || 10).then(function (rounds) {
      if (!rounds.length) {
        show(el.board, false);
        show(el.intro, true);
        show(el.empty, true);
        return;
      }
      state = { tier: tier, rounds: rounds, index: 0, correct: 0, revealed: false, log: [] };
      renderRound();
    });
  }

  function toIntro() {
    forget();
    if (loupe) loupe.hide();
    state = null;
    show(el.board, false);
    show(el.result, false);
    show(el.intro, true);
    if (history.replaceState) history.replaceState(null, "", location.pathname);
  }

  /* ---------- wiring ---------- */

  el.form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!state || el.input.disabled) return;
    el.input.disabled = true;
    el.submit.disabled = true;
    judge(el.input.value);
  });

  el.next.addEventListener("click", advance);
  el.replay.addEventListener("click", function () {
    start(state ? state.tier : "easy");
  });
  el.change.addEventListener("click", toIntro);
  if (el.quit) el.quit.addEventListener("click", toIntro);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && el.reveal && !el.reveal.hidden) {
      e.preventDefault();
      advance();
      return;
    }
    /* Escape leaves the game and goes back to the level buttons. */
    if (e.key === "Escape" && state && !el.board.hidden) {
      e.preventDefault();
      toIntro();
    }
  });

  fetch(DATA_URL, { cache: "no-cache" })
    .then(function (r) {
      if (!r.ok) throw new Error("cities.json " + r.status);
      return r.json();
    })
    .then(function (json) {
      data = json;
      return fetch((json.imageDir || "../art/game/") + "images.json", { cache: "no-cache" })
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .catch(function () {
          return null;
        })
        .then(function (list) {
          manifest = list;
          return json;
        });
    })
    .then(function (json) {
      data.cities.forEach(function (c) {
        byId[c.id] = c;
      });
      buildTermIndex();
      el.credit.textContent = data.credit || "";
      renderTiers();
      if (restore()) return;
      var hash = (location.hash || "").replace("#", "");
      if (hash && data.tiers.some(function (t) { return t.id === hash; })) start(hash);
    })
    .catch(function () {
      el.tiers.innerHTML = "";
      show(el.empty, true);
      el.empty.textContent = "The list of cities could not be loaded.";
    });
})();

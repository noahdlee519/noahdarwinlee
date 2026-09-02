/* Layout Guesser — name the city from its grid, seen from orbit.
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
    status: document.getElementById("game-status"),
    result: document.getElementById("game-result"),
    resultScore: document.getElementById("game-result-score"),
    resultLine: document.getElementById("game-result-line"),
    recap: document.getElementById("game-recap"),
    replay: document.getElementById("game-replay"),
    change: document.getElementById("game-change"),
    credit: document.getElementById("game-credit")
  };

  var data = null;
  var state = null;
  var byId = {};

  /* ---------- text matching ---------- */

  function norm(s) {
    return String(s)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  /* Levenshtein, one row at a time. Guesses are short, so this is free. */
  function lev(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var prev = [];
    var i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      var cur = [i];
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(
          prev[j] + 1,
          cur[j - 1] + 1,
          prev[j - 1] + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1)
        );
      }
      prev = cur;
    }
    return prev[b.length];
  }

  function tolerance(len) {
    if (len <= 5) return 1;
    if (len <= 9) return 2;
    return 3;
  }

  function isMatch(guess, city) {
    var g = norm(guess);
    if (!g) return false;
    var targets = [city.city].concat(city.aliases || []).map(norm);
    return targets.some(function (t) {
      if (!t) return false;
      if (g === t) return true;
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

  /* Walks a freshly shuffled pool in small batches and keeps the first `want`
     cities whose image actually loads, so every game is a different ten.
     Doubles as a preload: by the time round one is up, the rest are cached. */
  function buildRounds(tier, want) {
    var dir = data.imageDir || "../art/game/";
    var pool = shuffle(
      data.cities.filter(function (c) {
        return c.tier === tier;
      })
    );
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

  function tierLabel(id) {
    var t = (data.tiers || []).filter(function (x) {
      return x.id === id;
    })[0];
    return t ? t.label : id;
  }

  function renderTiers() {
    el.tiers.innerHTML = "";
    (data.tiers || []).forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "game-tier";
      b.dataset.tier = t.id;
      b.innerHTML = '<span class="game-tier-name"></span><span class="game-tier-note"></span>';
      b.querySelector(".game-tier-name").textContent = t.label;
      b.querySelector(".game-tier-note").textContent = t.note || "";
      b.addEventListener("click", function () {
        start(t.id);
      });
      el.tiers.appendChild(b);
    });
  }

  /* If a file has been renamed or removed since the game was saved, drop that
     round rather than showing a broken image. */
  function dropRound() {
    state.rounds.splice(state.index, 1);
    if (state.index >= state.rounds.length) finish();
    else renderRound();
  }

  function renderRound() {
    var round = state.rounds[state.index];
    state.revealed = false;

    el.frame.innerHTML = "";
    var img = document.createElement("img");
    img.className = "game-image";
    img.src = round.url;
    img.alt = "Satellite view of a city, round " + (state.index + 1);
    img.decoding = "async";
    img.addEventListener("error", dropRound);
    el.frame.appendChild(img);

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

  function verdictLine(score, total) {
    var pct = total ? score / total : 0;
    if (pct === 1) return "Perfect. You have either travelled or memorised an atlas.";
    if (pct >= 0.8) return "Strong. You are reading street patterns, not just coastlines.";
    if (pct >= 0.5) return "Respectable. The coastlines are carrying you.";
    if (pct >= 0.2) return "The world is bigger from above than it looks on a map.";
    return "Everywhere looks the same from 786 kilometres up. That is rather the point.";
  }

  function finish() {
    forget();
    show(el.board, false);
    show(el.result, true);
    el.resultScore.textContent =
      tierLabel(state.tier) + " · " + state.correct + " of " + state.log.length;
    el.resultLine.textContent = verdictLine(state.correct, state.log.length);
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

  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && el.reveal && !el.reveal.hidden) {
      e.preventDefault();
      advance();
    }
  });

  fetch(DATA_URL, { cache: "no-cache" })
    .then(function (r) {
      if (!r.ok) throw new Error("cities.json " + r.status);
      return r.json();
    })
    .then(function (json) {
      data = json;
      data.cities.forEach(function (c) {
        byId[c.id] = c;
      });
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

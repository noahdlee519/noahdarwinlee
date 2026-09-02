/* citylayoutguessr — name the city from its layout, seen from above.
   One guess per image, no retries: a wrong answer reveals the city and moves on.

   Data lives in citylayoutguessr/cities.json. Images live in art/game/ and are matched to a
   city by its id: art/game/<id>.webp (or .jpg / .jpeg / .png — whichever is
   there). A city with no image on disk is skipped silently, so the game works
   with three images or three hundred and never has to be kept in sync by hand.

   A game in progress is kept in localStorage so a refresh puts you back where
   you were. It is thrown away the moment the game ends. */

(function () {
  "use strict";

  var DATA_URL = "cities.json";
  var STORE_KEY = "ndl-layout-guesser-v1";
  var LENGTHS = [10, 20, 30, 50, Infinity];
  var SETUP_KEY = "ndl-layout-guesser-setup-v1";
  var DAILY_KEY = "ndl-clg-daily-v1";
  var DAILY_EPOCH = Date.UTC(2026, 8, 2); // no. 1 was 2 September 2026
  var DAILY_ROUNDS = 10;

  var el = {
    intro: document.getElementById("game-intro"),
    setup: document.getElementById("game-setup"),
    daily: document.getElementById("game-daily"),
    dailyStart: document.getElementById("daily-start"),
    dailyNote: document.getElementById("daily-note"),
    share: document.getElementById("game-share"),
    shareNote: document.getElementById("game-share-note"),
    setupLevels: document.getElementById("setup-levels"),
    setupContinents: document.getElementById("setup-continents"),
    setupLength: document.getElementById("setup-length"),
    setupTicks: document.getElementById("setup-ticks"),
    setupPool: document.getElementById("setup-pool"),
    setupStart: document.getElementById("setup-start"),
    empty: document.getElementById("game-empty"),
    board: document.getElementById("game-board"),
    progressWhere: document.getElementById("game-progress-where"),
    progressCount: document.getElementById("game-progress-count"),
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
    credit: document.getElementById("game-credit"),
    cosmetic: document.getElementById("game-cosmetic"),
    cosmeticToggle: document.getElementById("cosmetic-toggle"),
    colors: document.getElementById("game-colors"),
    colorBg: document.getElementById("color-bg"),
    colorInk: document.getElementById("color-ink"),
    colorAccent: document.getElementById("color-accent"),
    presetList: document.getElementById("game-preset-list"),
    resetColors: document.getElementById("reset-colors"),
    colorWarning: document.getElementById("color-warning")
  };

  var data = null;
  var state = null;
  var byId = {};
  var manifest = null;   // ids that have a picture, written by build-images.sh
  var loupe = null;
  var choice = null;     // {levels:[], continents:[], length:number|Infinity}

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
          cfg: {
            levels: state.cfg.levels,
            continents: state.cfg.continents,
            length: state.cfg.length === Infinity ? "endless" : state.cfg.length,
            daily: state.cfg.daily || null
          },
          total: state.total,
          index: state.index,
          correct: state.correct,
          wrong: state.wrong,
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

    var cfg = saved.cfg;
    if (!cfg || !cfg.levels || !cfg.continents) return false;
    cfg.length = cfg.length === "endless" ? Infinity : cfg.length;
    if (!cfg.daily) delete cfg.daily;
    /* Yesterday's unfinished daily is not today's; drop it rather than let it
       be finished under today's number. */
    if (cfg.daily && cfg.daily !== dayKey()) {
      forget();
      return false;
    }

    state = {
      cfg: cfg,
      rounds: rounds,
      total: saved.total || rounds.length,
      index: saved.index,
      correct: saved.correct || 0,
      wrong: saved.wrong || 0,
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
  function buildRounds(cfg) {
    var dir = data.imageDir || "../art/game/";
    var pool = shuffle(playable(cfg));
    var ext = (manifest && manifest.ext) || "webp";
    var want = cfg.length === Infinity ? pool.length : Math.min(cfg.length, pool.length);
    var rounds = pool.slice(0, want).map(function (c) {
      return { city: c, url: dir + c.id + "." + ext };
    });
    warm(rounds, 0, 3);
    return rounds;
  }

  /* Endless: when the last of the shuffled set is used up, shuffle again and
     keep going. You stop it, it doesn't stop you. */
  function extend() {
    var dir = data.imageDir || "../art/game/";
    var ext = (manifest && manifest.ext) || "webp";
    var more = shuffle(playable(state.cfg)).map(function (c) {
      return { city: c, url: dir + c.id + "." + ext };
    });
    if (!more.length) return false;
    state.rounds = state.rounds.concat(more);
    return true;
  }

  /* ---------- the daily ----------

     The site is a folder of static files, so there is nowhere to keep "today's
     ten". Instead the day itself is the seed: everyone who opens the same link
     on the same day shuffles the same list in the same order and gets the same
     ten cities. No server, no coordination, and the link never changes.

     The day is counted in UTC so that everyone, everywhere, is on the same
     puzzle at the same moment — which is the whole point of comparing scores. */

  function dayKey(d) {
    return (d || new Date()).toISOString().slice(0, 10);
  }

  function dayNumber(key) {
    var parts = key.split("-");
    var t = Date.UTC(+parts[0], +parts[1] - 1, +parts[2]);
    /* Clamped, so a browser whose clock is behind still sees a sane number. */
    return Math.max(1, Math.floor((t - DAILY_EPOCH) / 86400000) + 1);
  }

  function prettyDay(key) {
    var months = ["January","February","March","April","May","June","July",
                  "August","September","October","November","December"];
    var parts = key.split("-");
    return +parts[2] + " " + months[+parts[1] - 1] + " " + parts[0];
  }

  /* FNV-1a, then mulberry32: a small deterministic generator so the shuffle is
     identical in every browser rather than merely random. */
  function seedFrom(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seededShuffle(list, seed) {
    var a = list.slice();
    var next = rng(seed);
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(next() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function dailyConfig(key) {
    return {
      levels: levels().map(function (t) { return t.id; }),
      continents: continents().map(function (t) { return t.id; }),
      length: DAILY_ROUNDS,
      daily: key
    };
  }

  /* Sorted first, so the order depends only on which cities exist and not on
     the order they happen to sit in the file. */
  function dailyRounds(key) {
    var dir = data.imageDir || "../art/game/";
    var ext = (manifest && manifest.ext) || "webp";
    var pool = playable(dailyConfig(key))
      .slice()
      .sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
    return seededShuffle(pool, seedFrom("citylayoutguessr-" + key))
      .slice(0, DAILY_ROUNDS)
      .map(function (c) {
        return { city: c, url: dir + c.id + "." + ext };
      });
  }

  function readDaily() {
    try {
      return JSON.parse(localStorage.getItem(DAILY_KEY) || "null");
    } catch (err) {
      return null;
    }
  }

  function writeDaily(record) {
    try {
      localStorage.setItem(DAILY_KEY, JSON.stringify(record));
    } catch (err) {}
  }

  function shareText(record) {
    var marks = record.log.map(function (e) { return e.right ? "\u25cf" : "\u25cb"; }).join("");
    return "citylayoutguessr no. " + dayNumber(record.day) + "\n" +
           record.correct + " / " + record.log.length + "\n" +
           marks + "\n" +
           "https://noahdarwinlee.com/citylayoutguessr/#daily";
  }

  function renderDaily() {
    var key = dayKey();
    var done = readDaily();
    show(el.daily, true);
    if (done && done.day === key) {
      el.dailyStart.textContent = "see today\u2019s result";
      el.dailyNote.textContent =
        "no. " + dayNumber(key) + " \u00b7 played \u00b7 " + done.correct + " of " + done.log.length;
    } else {
      el.dailyStart.textContent = "today\u2019s challenge";
      el.dailyNote.textContent = "no. " + dayNumber(key) + " \u00b7 " + prettyDay(key);
    }
  }

  /* Already played today: show what you got rather than letting you go again,
     or the number stops meaning anything. */
  function showDailyResult(record) {
    state = {
      cfg: dailyConfig(record.day),
      rounds: [],
      total: record.log.length,
      index: record.log.length,
      correct: record.correct,
      wrong: record.wrong,
      revealed: false,
      log: record.log.map(function (e) {
        return { city: byId[e.id], right: e.right, guess: e.guess };
      }).filter(function (e) { return e.city; })
    };
    forget();
    show(el.intro, false);
    show(el.board, false);
    show(el.empty, false);
    show(el.result, true);
    paintResult();
  }

  function startDaily() {
    var key = dayKey();
    var done = readDaily();
    if (done && done.day === key) {
      showDailyResult(done);
      return;
    }
    var rounds = dailyRounds(key);
    if (!rounds.length) {
      show(el.empty, true);
      return;
    }
    forget();
    show(el.intro, false);
    show(el.empty, false);
    show(el.result, false);
    show(el.board, true);
    state = {
      cfg: dailyConfig(key),
      rounds: rounds,
      total: rounds.length,
      index: 0,
      correct: 0,
      wrong: 0,
      revealed: false,
      log: []
    };
    warm(rounds, 0, 3);
    renderRound();
  }


  /* ---------------- cosmetic settings ----------------

     Lifted from the flash card tool. Three colours drive the whole page through
     CSS variables; the guard below is the part that matters, because a colour
     picker will happily let you make white text on a white ground. Anything
     under a 3:1 contrast ratio gets pushed back rather than accepted. */

  var COLOR_KEY = "ndl-clg-colors-v1";
  var MIN_CONTRAST = 3;        // enough to see a fill or a big word
  var MIN_INK_CONTRAST = 4.5;  // what body text actually needs to read well
  var DEFAULT_COLORS = { bg: "#e68019", ink: "#ffffff", accent: "#e3e3b0" };
  var COLOR_PRESETS = [
    { name: "orange", bg: "#e68019", ink: "#ffffff", accent: "#e3e3b0" },
    { name: "night", bg: "#101014", ink: "#f2f2f2", accent: "#918fff" },
    { name: "paper", bg: "#fff2eb", ink: "#1a1a1a", accent: "#ff1467" },
    { name: "sea", bg: "#0b3c49", ink: "#f2f2f2", accent: "#7fd1b9" },
    { name: "slate", bg: "#2b2d42", ink: "#edf2f4", accent: "#ef233c" }
  ];
  var lastGoodColors = { bg: DEFAULT_COLORS.bg, ink: DEFAULT_COLORS.ink, accent: DEFAULT_COLORS.accent };
  var warningTimer = null;

  function normalizeHex(value, fallback) {
    var raw = String(value || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
      return "#" + raw.slice(1).split("").map(function (c) { return c + c; }).join("").toLowerCase();
    }
    return fallback;
  }

  function luminance(hex) {
    var n = parseInt(hex.slice(1), 16);
    var channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (c) {
      var v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function contrast(a, b) {
    var hi = Math.max(luminance(a), luminance(b));
    var lo = Math.min(luminance(a), luminance(b));
    return (hi + 0.05) / (lo + 0.05);
  }

  function toHsl(hex) {
    var n = parseInt(hex.slice(1), 16);
    var r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, bl = (n & 255) / 255;
    var max = Math.max(r, g, bl), min = Math.min(r, g, bl);
    var l = (max + min) / 2;
    var h = 0, sat = 0;
    if (max !== min) {
      var d = max - min;
      sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - bl) / d + (g < bl ? 6 : 0));
      else if (max === g) h = (bl - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return { h: h, s: sat, l: l };
  }

  function toHex(hsl) {
    var h = hsl.h, sat = hsl.s, l = hsl.l;
    function channel(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    var r, g, b;
    if (sat === 0) {
      r = g = b = l;
    } else {
      var q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat;
      var p = 2 * l - q;
      r = channel(p, q, h + 1 / 3);
      g = channel(p, q, h);
      b = channel(p, q, h - 1 / 3);
    }
    return "#" + [r, g, b].map(function (v) {
      var x = Math.round(v * 255).toString(16);
      return x.length === 1 ? "0" + x : x;
    }).join("");
  }

  /* Rather than snapping an unreadable colour to grey — which would make the
     accent and the text identical and flatten the whole design — keep its hue
     and move only its lightness until it clears the ground. */
  function readableOn(bg, want, target) {
    var need = target || MIN_CONTRAST;
    var light = luminance(bg) <= 0.5;
    var hsl = want ? toHsl(want) : null;
    /* A near-grey has no hue worth preserving, so snap it to clean ink rather
       than walking it down to a washed-out mid grey. */
    if (hsl && hsl.s >= 0.12) {
      for (var i = 0; i < 24; i++) {
        hsl.l = light ? Math.min(0.97, hsl.l + 0.04) : Math.max(0.03, hsl.l - 0.04);
        var candidate = toHex(hsl);
        if (contrast(bg, candidate) >= need) return candidate;
      }
    }
    return light ? "#f5f5f5" : "#111111";
  }

  function warn(message) {
    el.colorWarning.textContent = message;
    show(el.colorWarning, true);
    clearTimeout(warningTimer);
    warningTimer = setTimeout(function () {
      show(el.colorWarning, false);
    }, 3200);
  }

  /* Keeps whichever field was just touched and moves the others out of its way,
     so changing the background never silently reverts the background. */
  function sanitizeColors(input, changed) {
    var next = {
      bg: normalizeHex(input.bg, DEFAULT_COLORS.bg),
      ink: normalizeHex(input.ink, DEFAULT_COLORS.ink),
      accent: normalizeHex(input.accent, DEFAULT_COLORS.accent)
    };
    var notes = [];

    ["ink", "accent"].forEach(function (role) {
      var need = role === "ink" ? MIN_INK_CONTRAST : MIN_CONTRAST;
      if (contrast(next.bg, next[role]) >= need) return;
      if (changed === role) {
        next[role] = lastGoodColors[role];
        notes.push(role + "-reverted");
      } else {
        next[role] = readableOn(next.bg, next[role], need);
        notes.push(role + "-adjusted");
      }
    });

    /* If both had to move they can land on the same value; the accent exists to
       be distinguishable, so push it further rather than leave a duplicate. */
    if (next.ink === next.accent) {
      var hsl = toHsl(next.accent);
      hsl.l = luminance(next.bg) > 0.5 ? Math.max(0.28, hsl.l + 0.22) : Math.min(0.78, hsl.l - 0.18);
      var parted = toHex(hsl);
      if (contrast(next.bg, parted) >= MIN_CONTRAST) next.accent = parted;
    }

    return { colors: next, notes: notes };
  }

  function applyColors(colors) {
    document.body.style.setProperty("--bg", colors.bg);
    document.body.style.setProperty("--ink", colors.ink);
    document.body.style.setProperty("--accent", colors.accent);
    el.colorBg.value = colors.bg;
    el.colorInk.value = colors.ink;
    el.colorAccent.value = colors.accent;
    lastGoodColors = { bg: colors.bg, ink: colors.ink, accent: colors.accent };
    renderPresets();
    return colors;
  }

  function saveColors(colors) {
    try {
      localStorage.setItem(COLOR_KEY, JSON.stringify(colors));
    } catch (err) {}
  }

  function loadColors() {
    try {
      var raw = localStorage.getItem(COLOR_KEY);
      if (!raw) return { bg: DEFAULT_COLORS.bg, ink: DEFAULT_COLORS.ink, accent: DEFAULT_COLORS.accent };
      var parsed = JSON.parse(raw);
      return sanitizeColors({ bg: parsed.bg, ink: parsed.ink, accent: parsed.accent }, null).colors;
    } catch (err) {
      return { bg: DEFAULT_COLORS.bg, ink: DEFAULT_COLORS.ink, accent: DEFAULT_COLORS.accent };
    }
  }

  function sameColors(a, b) {
    return a.bg === b.bg && a.ink === b.ink && a.accent === b.accent;
  }

  function renderPresets() {
    if (!el.presetList) return;
    el.presetList.innerHTML = "";
    COLOR_PRESETS.forEach(function (preset) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "game-preset";
      var chip = document.createElement("span");
      chip.className = "game-preset-chip";
      chip.setAttribute("aria-hidden", "true");
      chip.style.setProperty("--chip-bg", preset.bg);
      chip.style.setProperty("--chip-ink", preset.ink);
      chip.style.setProperty("--chip-accent", preset.accent);
      var name = document.createElement("span");
      name.textContent = preset.name;
      b.appendChild(chip);
      b.appendChild(name);
      if (sameColors(lastGoodColors, { bg: preset.bg, ink: preset.ink, accent: preset.accent })) {
        b.classList.add("is-on");
      }
      b.addEventListener("click", function () {
        show(el.colorWarning, false);
        saveColors(applyColors({ bg: preset.bg, ink: preset.ink, accent: preset.accent }));
      });
      el.presetList.appendChild(b);
    });
  }

  function colorsFromInputs(e) {
    var changed = e && e.target === el.colorBg ? "bg"
                : e && e.target === el.colorInk ? "ink"
                : e && e.target === el.colorAccent ? "accent"
                : null;
    var result = sanitizeColors(
      { bg: el.colorBg.value, ink: el.colorInk.value, accent: el.colorAccent.value },
      changed
    );
    if (result.notes.indexOf("ink-reverted") !== -1) {
      warn("that text colour is too close to the background to read — kept the last one.");
    } else if (result.notes.indexOf("accent-reverted") !== -1) {
      warn("that accent is too close to the background to see — kept the last one.");
    } else if (result.notes.length && changed === "bg") {
      warn("the text was too close to that background, so it was adjusted to stay readable.");
    }
    saveColors(applyColors(result.colors));
  }

  function setupCosmetics() {
    show(el.cosmetic, true);
    applyColors(loadColors());
    el.cosmeticToggle.addEventListener("click", function () {
      var open = el.colors.hidden;
      show(el.colors, open);
      el.cosmeticToggle.setAttribute("aria-expanded", String(open));
    });
    [el.colorBg, el.colorInk, el.colorAccent].forEach(function (input) {
      input.addEventListener("input", colorsFromInputs);
      input.addEventListener("change", colorsFromInputs);
    });
    el.resetColors.addEventListener("click", function () {
      show(el.colorWarning, false);
      saveColors(applyColors({ bg: DEFAULT_COLORS.bg, ink: DEFAULT_COLORS.ink, accent: DEFAULT_COLORS.accent }));
    });
  }

  /* ---------- rendering ---------- */

  function show(node, on) {
    if (node) node.hidden = !on;
  }

  function levels() {
    return data.tiers || [];
  }

  function continents() {
    return data.continents || [];
  }

  /* Every city the current selection allows, whether or not it has a picture. */
  function selected(cfg) {
    return data.cities.filter(function (c) {
      return cfg.levels.indexOf(c.tier) !== -1 &&
             cfg.continents.indexOf(c.continent) !== -1;
    });
  }

  /* ...and the subset that can actually be drawn. */
  function playable(cfg) {
    if (!manifest || !manifest.ids) return selected(cfg);
    return selected(cfg).filter(function (c) {
      return manifest.ids.indexOf(c.id) !== -1;
    });
  }

  /* A short name for what is being played, for the progress bar and the
     result. Anything unfiltered is left unsaid rather than spelled out. */
  function describe(cfg) {
    if (cfg.daily) return "daily no. " + dayNumber(cfg.daily);
    var bits = [];
    if (cfg.levels.length < levels().length) {
      bits.push(cfg.levels.join(" + "));
    }
    if (cfg.continents.length < continents().length) {
      bits.push(cfg.continents.map(function (id) {
        var c = continents().filter(function (x) { return x.id === id; })[0];
        return c ? c.label : id;
      }).join(" + "));
    }
    if (cfg.length === Infinity) bits.push("endless");
    return bits.join(" · ");
  }

  function check(container, id, label, count) {
    var l = document.createElement("label");
    l.className = "game-check";
    var input = document.createElement("input");
    input.type = "checkbox";
    input.value = id;
    input.checked = true;
    var mark = document.createElement("span");
    mark.className = "game-check-mark";
    var text = document.createElement("span");
    text.className = "game-check-text";
    text.textContent = label;
    l.appendChild(input);
    l.appendChild(mark);
    l.appendChild(text);
    if (count !== null) {
      var n = document.createElement("span");
      n.className = "game-check-count";
      n.textContent = count;
      l.appendChild(n);
      if (!count) l.classList.add("is-empty");
    }
    container.appendChild(l);
    return input;
  }

  function boxes(container) {
    return [].slice.call(container.querySelectorAll('input[type="checkbox"]'));
  }

  function withPicture(test) {
    return data.cities.filter(function (c) {
      return test(c) && (!manifest || !manifest.ids || manifest.ids.indexOf(c.id) !== -1);
    }).length;
  }

  /* The "all" box drives the rest and follows them back. */
  function wireAll(container) {
    var all = boxes(container)[0];
    var rest = boxes(container).slice(1);
    all.addEventListener("change", function () {
      rest.forEach(function (b) {
        if (!b.closest(".game-check").classList.contains("is-empty") || !all.checked) {
          b.checked = all.checked;
        }
      });
      refreshSetup();
    });
    rest.forEach(function (b) {
      b.addEventListener("change", function () {
        all.checked = rest.every(function (x) { return x.checked; });
        refreshSetup();
      });
    });
  }

  function chosen(container) {
    return boxes(container).slice(1).filter(function (b) { return b.checked; })
      .map(function (b) { return b.value; });
  }

  function readSetup() {
    var i = parseInt(el.setupLength.value, 10) || 0;
    return {
      levels: chosen(el.setupLevels),
      continents: chosen(el.setupContinents),
      length: LENGTHS[i]
    };
  }

  function lengthLabel(n) {
    return n === Infinity ? "endless" : String(n);
  }

  /* Grey out the lengths this selection cannot fill, and pull the slider back
     if it is sitting on one of them. Endless always stands, because it repeats. */
  function refreshSetup() {
    var cfg = readSetup();
    var n = cfg.levels.length && cfg.continents.length ? playable(cfg).length : 0;
    var highest = 0;

    el.setupTicks.innerHTML = "";
    LENGTHS.forEach(function (len, i) {
      var ok = n > 0 && (len === Infinity || len <= n);
      if (ok) highest = i;
      var t = document.createElement("span");
      t.className = "game-tick " + (ok ? "" : "is-off");
      /* A range thumb's centre travels from half a thumb in to half a thumb
         short of the end, so the ticks have to be inset by the same amount or
         they sit beside the stops instead of under them. */
      var pct = (i / (LENGTHS.length - 1)) * 100;
      t.style.left = "calc(" + pct + "% + " + (10 - pct * 0.2).toFixed(2) + "px)";
      t.textContent = lengthLabel(len);
      el.setupTicks.appendChild(t);
    });

    var i = parseInt(el.setupLength.value, 10) || 0;
    if (n > 0 && LENGTHS[i] !== Infinity && LENGTHS[i] > n) {
      i = highest;
      el.setupLength.value = i;
    }
    el.setupLength.max = String(LENGTHS.length - 1);
    var ticks = el.setupTicks.children;
    if (ticks[i]) ticks[i].classList.add("is-on");

    cfg = readSetup();
    el.setupPool.textContent = n
      ? n + (n === 1 ? " map" : " maps") + " to draw from"
      : (cfg.levels.length && cfg.continents.length
          ? "no maps for that combination yet"
          : "pick at least one of each");
    el.setupStart.disabled = !n;
    saveSetup(cfg);
  }

  function saveSetup(cfg) {
    try {
      localStorage.setItem(SETUP_KEY, JSON.stringify({
        levels: cfg.levels, continents: cfg.continents,
        length: cfg.length === Infinity ? "endless" : cfg.length
      }));
    } catch (err) {}
  }

  function loadSetup() {
    try {
      var v = JSON.parse(localStorage.getItem(SETUP_KEY) || "null");
      if (!v) return null;
      v.length = v.length === "endless" ? Infinity : v.length;
      return v;
    } catch (err) {
      return null;
    }
  }

  function renderSetup() {
    var saved = loadSetup();

    el.setupLevels.innerHTML = "";
    check(el.setupLevels, "__all", "all", null);
    levels().forEach(function (t) {
      check(el.setupLevels, t.id, t.label,
            withPicture(function (c) { return c.tier === t.id; }));
    });

    el.setupContinents.innerHTML = "";
    check(el.setupContinents, "__all", "all", null);
    continents().forEach(function (t) {
      check(el.setupContinents, t.id, t.label,
            withPicture(function (c) { return c.continent === t.id; }));
    });

    if (saved) {
      boxes(el.setupLevels).slice(1).forEach(function (b) {
        b.checked = saved.levels.indexOf(b.value) !== -1;
      });
      boxes(el.setupContinents).slice(1).forEach(function (b) {
        b.checked = saved.continents.indexOf(b.value) !== -1;
      });
      var i = LENGTHS.indexOf(saved.length);
      if (i !== -1) el.setupLength.value = i;
    }
    boxes(el.setupLevels)[0].checked = boxes(el.setupLevels).slice(1).every(function (b) { return b.checked; });
    boxes(el.setupContinents)[0].checked = boxes(el.setupContinents).slice(1).every(function (b) { return b.checked; });

    renderDaily();
    wireAll(el.setupLevels);
    wireAll(el.setupContinents);
    el.setupLength.addEventListener("input", refreshSetup);
    refreshSetup();
  }

  /* If a file has been renamed or removed since the game was saved, drop that
     round rather than showing a broken image. */
  function dropRound() {
    state.rounds.splice(state.index, 1);
    state.total = Math.min(state.total, state.rounds.length);
    if (state.index >= state.rounds.length) {
      if (state.cfg.length === Infinity && extend()) renderRound();
      else finish();
    } else {
      renderRound();
    }
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

    /* Split so a narrow screen can drop the filter description and keep the
       bar to one line — the count is the part you actually need mid-game. */
    var where = describe(state.cfg);
    el.progressWhere.textContent = where ? where + " · " : "";
    el.progressCount.textContent = state.cfg.length === Infinity
      ? "round " + (state.index + 1)
      : (state.index + 1) + " / " + state.total;
    el.score.textContent = score();
    show(el.reveal, false);
    show(el.form, true);
    el.input.value = "";
    el.input.disabled = false;
    el.submit.disabled = false;
    el.input.focus({ preventScroll: true });
    save();
  }

  function score() {
    return state.correct + " right · " + state.wrong + " wrong";
  }

  function answerLine(city) {
    return city.country ? city.city + ", " + city.country : city.city;
  }

  function reveal(entry) {
    state.revealed = true;
    el.reveal.classList.toggle("is-right", entry.right);
    el.reveal.classList.toggle("is-wrong", !entry.right);
    el.verdict.textContent = entry.right ? "Correct" : "Incorrect";
    el.answer.textContent = answerLine(entry.city);

    show(el.form, false);
    show(el.reveal, true);
    el.score.textContent = score();
    el.status.textContent =
      (entry.right ? "Correct. " : "Incorrect. ") + "The answer is " + answerLine(entry.city) + ".";
    el.next.textContent =
      state.cfg.length !== Infinity && state.index + 1 >= state.total ? "see result" : "next";
    el.next.focus({ preventScroll: true });
  }

  function judge(guess) {
    var round = state.rounds[state.index];
    var entry = { city: round.city, right: isMatch(guess, round.city), guess: guess.trim() };
    if (entry.right) state.correct += 1;
    else state.wrong += 1;
    state.log.push(entry);
    reveal(entry);
    save();
  }

  function advance() {
    state.index += 1;
    if (state.index >= state.rounds.length) {
      if (state.cfg.length === Infinity && extend()) renderRound();
      else finish();
    } else {
      renderRound();
    }
  }

  function paintResult() {
    var where = describe(state.cfg);
    var tally = state.correct + " of " + state.log.length;
    el.resultScore.textContent = where ? where + " · " + tally : tally;
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

    /* One go a day, so there is no "play again" on a daily — the share button
       takes its place. */
    var isDaily = Boolean(state.cfg.daily);
    show(el.replay, !isDaily);
    show(el.share, isDaily);
    show(el.shareNote, false);
    (isDaily ? el.share : el.replay).focus({ preventScroll: true });
  }

  function finish() {
    forget();
    show(el.board, false);
    show(el.result, true);
    if (state.cfg.daily) {
      writeDaily({
        day: state.cfg.daily,
        correct: state.correct,
        wrong: state.wrong,
        log: state.log.map(function (e) {
          return { id: e.city.id, right: e.right, guess: e.guess };
        })
      });
    }
    paintResult();
  }

  function start(cfg) {
    forget();
    var rounds = buildRounds(cfg);
    if (!rounds.length) {
      show(el.empty, true);
      return;
    }
    show(el.intro, false);
    show(el.empty, false);
    show(el.result, false);
    show(el.board, true);
    state = {
      cfg: cfg,
      rounds: rounds,
      total: rounds.length,
      index: 0,
      correct: 0,
      wrong: 0,
      revealed: false,
      log: []
    };
    renderRound();
  }

  function toIntro() {
    forget();
    if (loupe) loupe.hide();
    state = null;
    show(el.board, false);
    show(el.result, false);
    show(el.intro, true);
    show(el.empty, false);
    renderDaily();
    refreshSetup();
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

  el.setup.addEventListener("submit", function (e) {
    e.preventDefault();
    var cfg = readSetup();
    if (cfg.levels.length && cfg.continents.length) start(cfg);
  });

  el.dailyStart.addEventListener("click", startDaily);

  el.share.addEventListener("click", function () {
    var record = readDaily();
    if (!record) return;
    var text = shareText(record);
    function done(ok) {
      el.shareNote.textContent = ok ? "copied" : text;
      show(el.shareNote, true);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); },
                                              function () { done(false); });
    } else {
      done(false);
    }
  });

  el.next.addEventListener("click", advance);
  el.replay.addEventListener("click", function () {
    start(state ? state.cfg : readSetup());
  });
  el.change.addEventListener("click", toIntro);

  /* In an endless game, stopping is how it ends — so show the recap rather
     than throwing the run away. A fixed-length game you quit is abandoned. */
  function leave() {
    if (state && state.cfg.length === Infinity && state.log.length) finish();
    else toIntro();
  }
  if (el.quit) el.quit.addEventListener("click", leave);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && el.reveal && !el.reveal.hidden) {
      e.preventDefault();
      advance();
      return;
    }
    /* Escape leaves the game and goes back to the level buttons. */
    if (e.key === "Escape" && state && !el.board.hidden) {
      e.preventDefault();
      leave();
    }
  });

  fetch(DATA_URL, { cache: "reload" })
    .then(function (r) {
      if (!r.ok) throw new Error("cities.json " + r.status);
      return r.json();
    })
    .then(function (json) {
      data = json;
      return fetch((json.imageDir || "../art/game/") + "images.json", { cache: "reload" })
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
      setupCosmetics();
      renderSetup();
      if (restore()) return;

      /* Old links like /game/#hard still work: they preselect and start. */
      var hash = (location.hash || "").replace("#", "");
      var allLevels = levels().map(function (t) { return t.id; });
      var allConts = continents().map(function (t) { return t.id; });
      if (hash === "daily") {
        startDaily();
      } else if (hash === "mixed") {
        start({ levels: allLevels, continents: allConts, length: 10 });
      } else if (allLevels.indexOf(hash) !== -1) {
        start({ levels: [hash], continents: allConts, length: 10 });
      } else if (hash) {
        var cont = continents().filter(function (c) {
          return c.id.toLowerCase().replace(/\s+/g, "-") === hash;
        })[0];
        if (cont) start({ levels: allLevels, continents: [cont.id], length: 10 });
      }

      /* Pasting #daily into a tab that is already open changes the hash without
         reloading, so listen for that too. */
      window.addEventListener("hashchange", function () {
        if ((location.hash || "").replace("#", "") === "daily") startDaily();
      });
    })
    .catch(function (err) {
      /* Anything thrown while starting up used to vanish into this handler and
         surface only as "could not be loaded". Say it out loud. */
      if (window.console && console.error) console.error("citylayoutguessr:", err);
      show(el.setup, false);
      show(el.empty, true);
      el.empty.textContent = "The list of cities could not be loaded.";
    });
})();

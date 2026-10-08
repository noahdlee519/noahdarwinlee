(function () {
  "use strict";

  var DATA_URL = "cities.json";
  var CATALOG_URL = "catalog.json";
  var STORE_KEY = "ndl-layout-guesser-v1";
  var STORE_KEY_DAILY = "ndl-clg-daily-progress-v1-e2";
  var LENGTHS = [10, 20, 30, 50, Infinity];
  var SETUP_KEY = "ndl-layout-guesser-setup-v1";
  var DAILY_KEY = "ndl-clg-daily-v1-e2";
  var DAILY_EPOCH = Date.UTC(2026, 8, 2);
  var DAILY_ROUNDS = 10;

  var HINT_TRIES = 4;

  var DAILY_MIX = [
    { tier: "easy", count: 4 },
    { tier: "medium", count: 3 },
    { tier: "hard", count: 3 }
  ];

  var DAILY_EDITION = "2";

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
    setupPacks: document.getElementById("setup-packs"),
    setupSpecial: document.getElementById("setup-special"),
    setupSpecialOpen: document.getElementById("setup-special-open"),
    setupSpecialCount: document.getElementById("setup-special-count"),
    setupSpecialDone: document.getElementById("setup-special-done"),
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
    suggest: document.getElementById("game-suggest"),
    submit: document.getElementById("game-submit"),
    ask: document.getElementById("game-ask"),
    reveal: document.getElementById("game-reveal"),
    verdict: document.getElementById("game-verdict"),
    answer: document.getElementById("game-answer"),
    earned: document.getElementById("game-earned"),
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
    colorWarning: document.getElementById("color-warning"),
    account: document.getElementById("game-account"),
    signIn: document.getElementById("game-signin"),
    signInSlot: document.getElementById("game-signin-slot"),
    googleBtn: document.getElementById("game-google-btn"),
    who: document.getElementById("game-who"),
    avatar: document.getElementById("game-avatar"),
    whoName: document.getElementById("game-who-name"),
    signOut: document.getElementById("game-signout"),
    leaders: document.getElementById("game-leaders"),
    leadersList: document.getElementById("game-leaders-list"),
    leadersNote: document.getElementById("game-leaders-note"),
    leadersSlot: document.getElementById("game-leaders-slot"),
    leadersSlotResult: document.getElementById("game-leaders-slot-result"),
    logoHome: document.getElementById("game-logo-home"),
    customFold: document.getElementById("game-custom-fold"),
    customBody: document.getElementById("game-custom-body"),
    leadersFold: document.getElementById("game-leaders-fold"),
    leadersBody: document.getElementById("game-leaders-body"),
    accountNote: document.getElementById("game-account-note"),
    tabToday: document.getElementById("tab-today"),
    tabAllTime: document.getElementById("tab-alltime"),
    rename: document.getElementById("game-rename"),
    renameForm: document.getElementById("game-rename-form"),
    nameInput: document.getElementById("game-name-input"),
    nameCancel: document.getElementById("game-name-cancel"),
    nameNote: document.getElementById("game-name-note"),
    setupContinue: document.getElementById("setup-continue"),
    setupHints: document.getElementById("setup-hints"),
    setupHintsSet: document.getElementById("setup-hints-set"),
    setupHintText: document.getElementById("setup-hint-text"),
    setupShare: document.getElementById("setup-share"),
    setupShareNote: document.getElementById("setup-share-note")
  };

  var data = null;
  var state = null;
  var byId = {};
  var manifest = null;
  var loupe = null;
  var choice = null;

  function norm(s) {
    return String(s)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

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

  function tolerance(len) {
    if (len <= 3) return 0;
    if (len <= 12) return 1;
    return 2;
  }

  var catalog = [];
  var termIndex = {};

  function addToCatalog(name, country, id, aliases) {
    var key = norm(name);
    if (!key || termIndex[key]) return;
    var entry = { name: name, country: country || "", id: id || null, key: key, terms: [] };
    entry.terms.push({ k: key, alias: null });
    termIndex[key] = { entry: entry, alias: null };
    (aliases || []).forEach(function (a) {
      var k = norm(a);
      if (!k || termIndex[k]) return;
      entry.terms.push({ k: k, alias: a });
      termIndex[k] = { entry: entry, alias: a };
    });
    catalog.push(entry);
  }

  function buildCatalog(extra) {
    catalog = [];
    termIndex = {};
    data.cities.forEach(function (c) {
      addToCatalog(c.city, c.country, c.id, c.aliases);
    });
    (extra || []).forEach(function (c) {
      addToCatalog(c.city, c.country, null, c.aliases);
    });
  }

  var SUGGEST_MIN = 3;
  var SUGGEST_MAX = 8;

  function queryForms(raw) {
    var g = norm(raw);
    if (!g) return [];
    var words = g.split(" ");
    var forms = [];
    for (var n = words.length; n >= 1; n--) forms.push(words.slice(0, n).join(" "));
    return forms;
  }

  function placeScore(term, q) {
    if (term === q) return 0;
    if (term.lastIndexOf(q, 0) === 0) return 1;
    if ((" " + term).indexOf(" " + q) !== -1) return 2;
    if (term.indexOf(q) !== -1) return 3;
    return -1;
  }

  function rank(rows) {
    rows.sort(function (a, b) {
      var an = a.alias ? 1 : 0;
      var bn = b.alias ? 1 : 0;
      if (an !== bn) return an - bn;
      if (a.score !== b.score) return a.score - b.score;
      if (a.entry.name.length !== b.entry.name.length) {
        return a.entry.name.length - b.entry.name.length;
      }
      return a.entry.name < b.entry.name ? -1 : 1;
    });
    return rows.slice(0, SUGGEST_MAX);
  }

  function collect(pick) {
    var rows = [];
    catalog.forEach(function (entry) {
      var best = -1;
      var alias = null;
      entry.terms.forEach(function (t) {
        var s = pick(t);
        if (s < 0) return;
        if (best === -1 || s < best || (s === best && alias && !t.alias)) {
          best = s;
          alias = t.alias;
        }
      });
      if (best !== -1) rows.push({ entry: entry, score: best, alias: alias });
    });
    return rows;
  }

  function searchPlain(q) {
    return collect(function (t) { return placeScore(t.k, q); });
  }

  function searchTypo(q) {
    if (q.length < 4) return [];
    return collect(function (t) {
      var room = tolerance(t.k.length);
      if (Math.abs(t.k.length - q.length) > room) return -1;
      var d = lev(q, t.k);
      return d <= room ? d : -1;
    });
  }

  function suggest(raw) {
    var forms = queryForms(raw);
    var i, rows;
    for (i = 0; i < forms.length; i++) {
      rows = searchPlain(forms[i]);
      if (rows.length) return rank(rows);
    }
    for (i = 0; i < forms.length; i++) {
      rows = searchTypo(forms[i]);
      if (rows.length) return rank(rows);
    }
    return [];
  }

  var picked = null;
  var shown = [];
  var active = -1;

  function closeSuggest() {
    if (el.suggest.hidden) return;
    el.suggest.hidden = true;
    el.suggest.textContent = "";
    el.suggest.classList.remove("is-above");
    el.input.setAttribute("aria-expanded", "false");
    el.input.removeAttribute("aria-activedescendant");
    shown = [];
    active = -1;
  }

  function placeSuggest() {
    var vv = window.visualViewport;
    var floor = vv ? vv.height + vv.offsetTop : window.innerHeight;
    var box = el.input.getBoundingClientRect();
    var below = floor - box.bottom;
    el.suggest.classList.toggle("is-above", below < 170 && box.top > below);
  }

  function drawSuggest(rows) {
    el.suggest.textContent = "";
    rows.forEach(function (row, i) {
      var li = document.createElement("li");
      li.id = "game-suggest-" + i;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", "false");
      li.appendChild(document.createTextNode(row.entry.name));
      if (row.entry.country) {
        var where = document.createElement("span");
        where.className = "game-suggest-where";
        where.textContent = " — " + row.entry.country;
        li.appendChild(where);
      }
      el.suggest.appendChild(li);
    });
    el.suggest.hidden = false;
    el.input.setAttribute("aria-expanded", "true");
    placeSuggest();
  }

  function openSuggest() {
    if (!state || el.input.disabled || el.form.hidden) return closeSuggest();
    var raw = el.input.value.trim();
    if (raw.length < SUGGEST_MIN) return closeSuggest();
    var rows = suggest(raw);
    if (!rows.length) return closeSuggest();
    shown = rows;
    active = -1;
    drawSuggest(rows);
  }

  function markActive() {
    var items = el.suggest.children;
    for (var i = 0; i < items.length; i++) {
      var on = i === active;
      items[i].classList.toggle("is-active", on);
      items[i].setAttribute("aria-selected", on ? "true" : "false");
      if (on) {
        if (items[i].scrollIntoView) items[i].scrollIntoView({ block: "nearest" });
        el.input.setAttribute("aria-activedescendant", items[i].id);
      }
    }
    if (active === -1) el.input.removeAttribute("aria-activedescendant");
  }

  function moveActive(step) {
    if (el.suggest.hidden) {
      openSuggest();
      return;
    }
    if (!shown.length) return;
    active =
      active === -1
        ? step > 0
          ? 0
          : shown.length - 1
        : (active + step + shown.length) % shown.length;
    markActive();
  }

  function take(row) {
    if (!row) return;
    picked = row.entry;
    el.input.value = row.entry.name;
    closeSuggest();
    show(el.ask, false);
    el.input.focus({ preventScroll: true });
  }

  function standing() {
    if (picked) return picked;
    var hit = termIndex[norm(el.input.value)];
    return hit ? hit.entry : null;
  }

  function resetGuessBox() {
    picked = null;
    closeSuggest();
    el.input.value = "";
  }

  function slot(cfg) {
    return cfg && cfg.daily ? STORE_KEY_DAILY : STORE_KEY;
  }

  function save(paused) {
    if (!state) return;
    try {
      localStorage.setItem(
        slot(state.cfg),
        JSON.stringify({
          cfg: {
            levels: state.cfg.levels,
            continents: state.cfg.continents,
            length: state.cfg.length === Infinity ? "endless" : state.cfg.length,
            hints: Boolean(state.cfg.hints),
            seed: state.cfg.seed || null,
            daily: state.cfg.daily || null
          },
          tries: state.tries || 0,
          paused: Boolean(paused),
          total: state.total,
          index: state.index,
          correct: state.correct,
          wrong: state.wrong,
          points: state.points || 0,
          revealed: state.revealed,
          rounds: state.rounds.map(function (r) {
            return { id: r.city.id, url: r.url };
          }),
          log: state.log.map(function (e) {
            return { id: e.city.id, right: e.right, guess: e.guess,
                     points: e.points, credit: e.credit };
          })
        })
      );
    } catch (err) {
    }
  }

  function forget(which) {
    try {
      localStorage.removeItem(which || (state ? slot(state.cfg) : STORE_KEY));
    } catch (err) {}
  }

  function peek(which) {
    var saved;
    try {
      saved = JSON.parse(localStorage.getItem(which) || "null");
    } catch (err) {
      return null;
    }
    if (!saved || !saved.rounds || !saved.rounds.length) return null;
    if (!(saved.index >= 0) || saved.index >= saved.rounds.length) return null;
    if (saved.cfg && saved.cfg.daily && saved.cfg.daily !== dayKey()) {
      forget(which);
      return null;
    }
    return saved;
  }

  function restore(which, evenIfPaused) {
    which = which || STORE_KEY;
    var saved;
    try {
      saved = JSON.parse(localStorage.getItem(which) || "null");
    } catch (err) {
      return false;
    }
    if (!saved || !saved.rounds || !saved.rounds.length) return false;
    if (saved.paused && !evenIfPaused) return false;

    var rounds = [];
    for (var i = 0; i < saved.rounds.length; i++) {
      var city = byId[saved.rounds[i].id];
      if (!city) return false;
      rounds.push({ city: city, url: saved.rounds[i].url });
    }
    if (!(saved.index >= 0) || saved.index >= rounds.length) {
      forget(which);
      return false;
    }

    var log = (saved.log || [])
      .map(function (e) {
        return { city: byId[e.id], right: e.right, guess: e.guess,
                 points: e.points, credit: e.credit };
      })
      .filter(function (e) {
        return e.city;
      });

    var cfg = saved.cfg;
    if (!cfg || !cfg.levels || !cfg.continents) return false;
    cfg.length = cfg.length === "endless" ? Infinity : cfg.length;
    if (!cfg.daily) delete cfg.daily;
    if (cfg.daily && cfg.daily !== dayKey()) {
      forget(which);
      return false;
    }

    state = {
      cfg: cfg,
      rounds: rounds,
      total: saved.total || rounds.length,
      index: saved.index,
      correct: saved.correct || 0,
      wrong: saved.wrong || 0,
      points: saved.points !== undefined ? saved.points
              : log.reduce(function (n, e) { return n + fillOf(e); }, 0),
      tries: saved.tries || 0,
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

  function warm(rounds, from, count) {
    for (var i = from; i < from + count && i < rounds.length; i++) {
      var img = new Image();
      img.src = rounds[i].url;
    }
  }

  function poolFor(cfg) {
    return playable(cfg).slice().sort(function (a, b) {
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  }

  function buildRounds(cfg) {
    var dir = data.imageDir || "../art/game/";
    var pool = cfg.seed
      ? seededShuffle(poolFor(cfg), cfg.seed)
      : shuffle(playable(cfg));
    var ext = (manifest && manifest.ext) || "webp";
    var want = cfg.length === Infinity ? pool.length : Math.min(cfg.length, pool.length);
    var rounds = pool.slice(0, want).map(function (c) {
      return { city: c, url: dir + c.id + "." + ext };
    });
    warm(rounds, 0, 3);
    return rounds;
  }

  function extend() {
    var dir = data.imageDir || "../art/game/";
    var ext = (manifest && manifest.ext) || "webp";
    state.pass = (state.pass || 0) + 1;
    var pool = poolFor(state.cfg);
    var more = (state.cfg.seed
      ? seededShuffle(pool, (state.cfg.seed + state.pass * 0x9e3779b1) >>> 0)
      : shuffle(pool)).map(function (c) {
      return { city: c, url: dir + c.id + "." + ext };
    });
    if (!more.length) return false;
    state.rounds = state.rounds.concat(more);
    return true;
  }

  var DAY_ZONE = "America/New_York";
  var dayFormat = null;
  try {
    dayFormat = new Intl.DateTimeFormat("en-CA", {
      timeZone: DAY_ZONE, year: "numeric", month: "2-digit", day: "2-digit"
    });
  } catch (err) {
    dayFormat = null;
  }

  function dayKey(d) {
    var when = d || new Date();
    if (dayFormat) return dayFormat.format(when);
    return when.toISOString().slice(0, 10);
  }

  function dayNumber(key) {
    var parts = key.split("-");
    var t = Date.UTC(+parts[0], +parts[1] - 1, +parts[2]);
    return Math.max(1, Math.floor((t - DAILY_EPOCH) / 86400000) + 1);
  }

  function prettyDay(key) {
    var parts = key.split("-");
    return +parts[1] + "/" + +parts[2] + "/" + parts[0].slice(2);
  }

  function dailyName(key) {
    return "daily game " + dayNumber(key) + ": " + prettyDay(key);
  }

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

  function randomSeed() {
    return Math.floor(Math.random() * 4294967296) >>> 0;
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

  function contSlug(id) {
    return String(id).toLowerCase().replace(/\s+/g, "-");
  }

  function encodeCfg(cfg) {
    var all = continents().map(function (c) { return c.id; });
    var allLevels = levels().map(function (t) { return t.id; });
    var parts = [
      cfg.levels.length === allLevels.length ? "all" : cfg.levels.slice().sort().join("."),
      cfg.continents.length === all.length
        ? "all"
        : cfg.continents.length
        ? cfg.continents.map(contSlug).sort().join(".")
        : "none",
      cfg.length === Infinity ? "endless" : String(cfg.length),
      cfg.hints ? "h" : "n",
      (cfg.seed >>> 0).toString(36)
    ];
    if (cfgPacks(cfg).length) parts.push(cfgPacks(cfg).slice().sort().join("."));
    return "g=" + parts.join("_");
  }

  function decodeCfg(hash) {
    if (!hash || hash.slice(0, 2) !== "g=") return null;
    var parts = hash.slice(2).split("_");
    if (parts.length < 5) return null;

    var allLevels = levels().map(function (t) { return t.id; });
    var allConts = continents().map(function (c) { return c.id; });

    var lv = parts[0] === "all"
      ? allLevels
      : parts[0].split(".").filter(function (x) { return allLevels.indexOf(x) !== -1; });
    var co = parts[1] === "all"
      ? allConts
      : parts[1] === "none"
      ? []
      : parts[1].split(".").map(function (slug) {
          return allConts.filter(function (id) { return contSlug(id) === slug; })[0];
        }).filter(Boolean);

    var allPacks = packs().map(function (p) { return p.id; });
    var pk = (parts[5] || "").split(".").filter(function (id) {
      return allPacks.indexOf(id) !== -1;
    });

    if (!lv.length) lv = allLevels;
    if (!co.length && !pk.length) co = allConts;

    var len = parts[2] === "endless" ? Infinity : parseInt(parts[2], 10);
    if (!(len > 0) && len !== Infinity) len = 10;
    var seed = parseInt(parts[4], 36);
    if (!isFinite(seed)) return null;

    return {
      levels: lv,
      continents: co,
      packs: pk,
      length: len,
      hints: parts[3] === "h",
      seed: seed >>> 0
    };
  }

  function shareUrl(cfg) {
    return location.origin + location.pathname + "#" + encodeCfg(cfg);
  }

  function dailyConfig(key) {
    return {
      levels: levels().map(function (t) { return t.id; }),
      continents: continents().map(function (t) { return t.id; }),
      packs: [],
      length: DAILY_ROUNDS,
      hints: false,
      daily: key
    };
  }

  function dailyPool(key) {
    return playable(dailyConfig(key))
      .slice()
      .sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
  }

  function dailyRounds(key) {
    var dir = data.imageDir || "../art/game/";
    var ext = (manifest && manifest.ext) || "webp";
    var seed = "citylayoutguessr-" + DAILY_EDITION + "-" + key;
    var pool = dailyPool(key);
    var taken = {};
    var picked = [];

    DAILY_MIX.forEach(function (part) {
      var ofTier = pool.filter(function (c) { return c.tier === part.tier; });
      seededShuffle(ofTier, seedFrom(seed + "-" + part.tier))
        .slice(0, part.count)
        .forEach(function (c) {
          taken[c.id] = true;
          picked.push(c);
        });
    });

    if (picked.length < DAILY_ROUNDS) {
      var rest = pool.filter(function (c) { return !taken[c.id]; });
      seededShuffle(rest, seedFrom(seed + "-fill"))
        .slice(0, DAILY_ROUNDS - picked.length)
        .forEach(function (c) { picked.push(c); });
    }

    return seededShuffle(picked, seedFrom(seed + "-order"))
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

  function scoreOf(record) {
    if (!record) return 0;
    return record.points !== undefined ? record.points : record.correct || 0;
  }

  var MARKS = ["\u25cb", "\u25d4", "\u25d1", "\u25d5", "\u25cf"];

  function shareText(record) {
    var marks = record.log.map(function (e) {
      return MARKS[Math.round(fillOf(e) * 4)] || MARKS[0];
    }).join("");
    return "citylayoutguessr \u2014 daily game " + dayNumber(record.day) +
           ": " + prettyDay(record.day) + "\n" +
           points(scoreOf(record)) + " / " + record.log.length + "\n" +
           marks + "\n" +
           "https://noahdarwinlee.com/citylayoutguessr/#daily";
  }

  function dailyNote(name, state) {
    el.dailyNote.textContent = "";
    el.dailyNote.appendChild(document.createTextNode(name));
    if (!state) return;
    el.dailyNote.appendChild(document.createElement("br"));
    var line = document.createElement("span");
    line.className = "game-daily-state";
    line.textContent = state;
    el.dailyNote.appendChild(line);
  }

  function renderDaily() {
    var key = dayKey();
    var done = readDaily();
    var midway = peek(STORE_KEY_DAILY);
    show(el.daily, true);
    if (done && done.day === key) {
      el.dailyStart.textContent = "see today\u2019s result";
      dailyNote(dailyName(key),
                points(scoreOf(done)) + " of " + done.log.length + " (played)");
    } else if (midway) {
      el.dailyStart.textContent = "resume today\u2019s challenge";
      dailyNote(dailyName(key),
                "map " + (midway.index + 1) +
                " of " + (midway.total || midway.rounds.length) + " (paused)");
    } else {
      el.dailyStart.textContent = "today\u2019s challenge";
      dailyNote(dailyName(key), "");
    }
  }

  function showDailyResult(record) {
    state = {
      cfg: dailyConfig(record.day),
      rounds: [],
      total: record.log.length,
      index: record.log.length,
      correct: record.correct,
      wrong: record.wrong,
      points: scoreOf(record),
      revealed: false,
      log: record.log.map(function (e) {
        return { city: byId[e.id], right: e.right, guess: e.guess,
                 points: e.points, credit: e.credit };
      }).filter(function (e) { return e.city; })
    };
    forget(STORE_KEY_DAILY);
    show(el.intro, false);
    show(el.board, false);
    show(el.empty, false);
    show(el.result, true);
    placeBoard("result");
    loadBoard();
    paintResult();
  }

  function startDaily() {
    var key = dayKey();
    var done = readDaily();
    if (done && done.day === key) {
      showDailyResult(done);
      return;
    }
    if (restore(STORE_KEY_DAILY, true)) return;
    var rounds = dailyRounds(key);
    if (!rounds.length) {
      show(el.empty, true);
      return;
    }
    forget(STORE_KEY_DAILY);
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
      points: 0,
      revealed: false,
      log: []
    };
    warm(rounds, 0, 3);
    tell("game_start", { daily: true });
    renderRound();
  }


  var COLOR_KEY = "ndl-clg-colors-v1";
  var SET_ASIDE_KEY = "ndl-clg-colors-set-aside-v1";
  var MIN_CONTRAST = 3;
  var MIN_INK_CONTRAST = 4.5;
  var DEFAULT_COLORS = { bg: "#e68019", ink: "#ffffff", accent: "#e3e3b0" };
  var COLOR_PRESETS = [
    { name: "orange", bg: "#e68019", ink: "#ffffff", accent: "#e3e3b0" },
    { name: "night", bg: "#000000", ink: "#f2f2f2", accent: "#918fff" },
    { name: "paper", bg: "#fff2eb", ink: "#1a1a1a", accent: "#ff1467" },
    { name: "sea", bg: "#0b3c49", ink: "#f2f2f2", accent: "#7fd1b9" },
    { name: "slate", bg: "#2b2d42", ink: "#edf2f4", accent: "#ef233c" },
    { name: "mono", bg: "#ffffff", ink: "#000000", accent: "#4a4a4a" }
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

  function readableOn(bg, want, target) {
    var need = target || MIN_CONTRAST;
    var light = luminance(bg) <= 0.5;
    var hsl = want ? toHsl(want) : null;
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

  function forgetColors() {
    try {
      localStorage.removeItem(COLOR_KEY);
    } catch (err) {}
  }

  function setAside(colors) {
    try {
      localStorage.setItem(SET_ASIDE_KEY, JSON.stringify(colors));
    } catch (err) {}
  }

  function loadSetAside() {
    try {
      var raw = JSON.parse(localStorage.getItem(SET_ASIDE_KEY) || "null");
      if (!raw) return null;
      return {
        bg: normalizeHex(raw.bg, DEFAULT_COLORS.bg),
        ink: normalizeHex(raw.ink, DEFAULT_COLORS.ink),
        accent: normalizeHex(raw.accent, DEFAULT_COLORS.accent)
      };
    } catch (err) {
      return null;
    }
  }

  function clearSetAside() {
    try {
      localStorage.removeItem(SET_ASIDE_KEY);
    } catch (err) {}
  }

  function followTheme() {
    document.body.style.removeProperty("--bg");
    document.body.style.removeProperty("--ink");
    document.body.style.removeProperty("--accent");
    var now = getComputedStyle(document.body);
    var here = {
      bg: normalizeHex(now.getPropertyValue("--bg").trim(), DEFAULT_COLORS.bg),
      ink: normalizeHex(now.getPropertyValue("--ink").trim(), DEFAULT_COLORS.ink),
      accent: normalizeHex(now.getPropertyValue("--accent").trim(), DEFAULT_COLORS.accent)
    };
    el.colorBg.value = here.bg;
    el.colorInk.value = here.ink;
    el.colorAccent.value = here.accent;
    lastGoodColors = here;
    renderPresets();
  }

  function loadColors() {
    try {
      var raw = localStorage.getItem(COLOR_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return sanitizeColors({ bg: parsed.bg, ink: parsed.ink, accent: parsed.accent }, null).colors;
    } catch (err) {
      return null;
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
        clearSetAside();
        saveColors(applyColors({ bg: preset.bg, ink: preset.ink, accent: preset.accent }));
      });
      el.presetList.appendChild(b);
    });

    var yours = loadSetAside();
    if (!yours) return;
    var back = document.createElement("button");
    back.type = "button";
    back.className = "game-preset";
    var chip = document.createElement("span");
    chip.className = "game-preset-chip";
    chip.setAttribute("aria-hidden", "true");
    chip.style.setProperty("--chip-bg", yours.bg);
    chip.style.setProperty("--chip-ink", yours.ink);
    chip.style.setProperty("--chip-accent", yours.accent);
    var label = document.createElement("span");
    label.textContent = "yours";
    back.appendChild(chip);
    back.appendChild(label);
    back.title = "the colours you picked, before the day and night switch took the page back";
    back.addEventListener("click", function () {
      show(el.colorWarning, false);
      clearSetAside();
      saveColors(applyColors(yours));
    });
    el.presetList.appendChild(back);
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
    var saved = loadColors();
    if (saved) applyColors(saved);
    else followTheme();

    var themeWatch = new MutationObserver(function () {
      var chosen = loadColors();
      if (!chosen) return followTheme();
      setAside(chosen);
      forgetColors();
      followTheme();
      warn("your colours are set aside while this follows the switch — they are in the presets, under “yours”.");
    });
    themeWatch.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"]
    });
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
      forgetColors();
      clearSetAside();
      followTheme();
    });
  }

  function show(node, on) {
    if (node) node.hidden = !on;
    if (node === el.board) {
      document.body.classList.toggle("is-playing", Boolean(on));
    }
  }

  function levels() {
    return data.tiers || [];
  }

  function continents() {
    return data.continents || [];
  }

  function packs() {
    return data.packs || [];
  }

  function packById(id) {
    return packs().filter(function (p) { return p.id === id; })[0] || null;
  }

  function inPack(city, packId) {
    var pack = packById(packId);
    if (!pack) return false;
    if ((city.packs || []).indexOf(packId) !== -1) return true;
    return (pack.countries || []).indexOf(city.country) !== -1;
  }

  function cfgPacks(cfg) {
    return (cfg && cfg.packs) || [];
  }

  function hasRegion(cfg) {
    return Boolean(cfg && (cfg.continents.length || cfgPacks(cfg).length));
  }

  var regionByCountry = null;

  function regionOf(country) {
    if (!regionByCountry) {
      regionByCountry = {};
      (data.regions || []).forEach(function (r) {
        (r.countries || []).forEach(function (c) {
          regionByCountry[c] = r;
        });
      });
    }
    return (country && regionByCountry[country]) || null;
  }

  function placeOf(city) {
    if (city && city.id && byId[city.id]) city = byId[city.id];
    var country = (city && city.country) || "";
    var region = regionOf(country);
    return {
      country: country,
      region: region ? region.id : "",
      regionLabel: region ? region.label : "",
      continent: (city && city.continent) || (region && region.continent) || ""
    };
  }

  var QUARTER = 0.25;

  function inQuarters(cfg) {
    if (!cfg) return false;
    if (cfg.daily) return true;
    return cfg.continents.length === continents().length;
  }

  function creditFor(guess, answer) {
    var got = { continent: false, region: false, country: false, city: false,
                points: 0, where: "" };
    if (!guess || !answer) return got;
    var g = placeOf(guess);
    var a = placeOf(answer);
    got.city = Boolean(guess.id && guess.id === answer.id);
    got.country = Boolean(g.country && g.country === a.country);
    got.region = Boolean(g.region && g.region === a.region);
    got.continent = Boolean(g.continent && g.continent === a.continent);
    got.points = (got.continent ? QUARTER : 0) + (got.region ? QUARTER : 0) +
                 (got.country ? QUARTER : 0) + (got.city ? QUARTER : 0);
    got.where = got.country ? a.country
              : got.region ? a.regionLabel
              : got.continent ? a.continent
              : "";
    return got;
  }

  function points(n) {
    var r = Math.round((Number(n) || 0) * 100) / 100;
    return r === Math.round(r) ? String(Math.round(r)) : String(r);
  }

  function fillOf(entry) {
    if (entry.points === undefined || entry.points === null) {
      return entry.right ? 1 : 0;
    }
    return entry.points;
  }

  function selected(cfg) {
    var chosenPacks = cfgPacks(cfg);
    return data.cities.filter(function (c) {
      if (cfg.levels.indexOf(c.tier) === -1) return false;
      var byPack = chosenPacks.some(function (id) { return inPack(c, id); });
      if (c.packOnly) return byPack;
      return byPack || cfg.continents.indexOf(c.continent) !== -1;
    });
  }

  function playable(cfg) {
    if (!manifest || !manifest.ids) return selected(cfg);
    return selected(cfg).filter(function (c) {
      return manifest.ids.indexOf(c.id) !== -1;
    });
  }

  function describe(cfg) {
    if (cfg.daily) return dailyName(cfg.daily);
    var bits = [];
    if (cfg.levels.length < levels().length) {
      bits.push(cfg.levels.join(" + "));
    }
    if (cfg.continents.length && cfg.continents.length < continents().length) {
      bits.push(cfg.continents.map(function (id) {
        var c = continents().filter(function (x) { return x.id === id; })[0];
        return c ? c.label : id;
      }).join(" + "));
    }
    if (cfgPacks(cfg).length) {
      bits.push(cfgPacks(cfg).map(function (id) {
        var p = packById(id);
        return p ? p.label : id;
      }).join(" + "));
    }
    if (cfg.length === Infinity) bits.push("endless");
    if (cfg.hints) bits.push("hints");
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

  function packCount(id) {
    return withPicture(function (c) { return inPack(c, id); });
  }

  function buildPacks() {
    if (!el.setupPacks) return;
    el.setupPacks.innerHTML = "";
    packs().forEach(function (pack) {
      check(el.setupPacks, pack.id, pack.label, packCount(pack.id)).checked = false;
    });
  }

  function specialIsOpen() {
    return Boolean(el.setupSpecial && !el.setupSpecial.hidden);
  }

  function refreshSpecial() {
    if (!el.setupSpecialCount) return;
    var n = chosenEvery(el.setupPacks).length;
    el.setupSpecialCount.textContent = n ? String(n) : "";
    if (el.setupSpecialOpen) {
      el.setupSpecialOpen.classList.toggle("is-on", n > 0);
      el.setupSpecialOpen.setAttribute("aria-expanded", specialIsOpen() ? "true" : "false");
    }
  }

  function wireSpecial() {
    if (!el.setupPacks) return;
    boxes(el.setupPacks).forEach(function (b) {
      b.addEventListener("change", function () {
        refreshSpecial();
        refreshSetup();
      });
    });
    if (el.setupSpecialOpen) {
      el.setupSpecialOpen.addEventListener("click", function () {
        show(el.setupSpecial, !specialIsOpen());
        refreshSpecial();
      });
    }
    if (el.setupSpecialDone) {
      el.setupSpecialDone.addEventListener("click", function () {
        show(el.setupSpecial, false);
        refreshSpecial();
      });
    }
    refreshSpecial();
  }

  function withPicture(test) {
    return data.cities.filter(function (c) {
      return test(c) && (!manifest || !manifest.ids || manifest.ids.indexOf(c.id) !== -1);
    }).length;
  }

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

  function chosenEvery(container) {
    if (!container) return [];
    return boxes(container).filter(function (b) { return b.checked; })
      .map(function (b) { return b.value; });
  }

  var setupSeed = randomSeed();

  function readSetup() {
    var i = parseInt(el.setupLength.value, 10) || 0;
    return {
      levels: chosen(el.setupLevels),
      continents: chosen(el.setupContinents),
      packs: chosenEvery(el.setupPacks),
      length: LENGTHS[i],
      hints: Boolean(el.setupHints && el.setupHints.checked)
        && !(el.setupHintsSet && el.setupHintsSet.hidden),
      seed: setupSeed
    };
  }

  function lengthLabel(n) {
    return n === Infinity ? "endless" : String(n);
  }

  function refreshContinue() {
    if (!el.setupContinue) return;
    var midway = peek(STORE_KEY);
    if (!midway) {
      show(el.setupContinue, false);
      return;
    }
    var total = midway.total || midway.rounds.length;
    el.setupContinue.textContent =
      "continue " + (midway.index + 1) + (midway.cfg && midway.cfg.length === "endless"
        ? ""
        : "/" + total);
    show(el.setupContinue, true);
  }

  function refreshSetup() {
    var cfg = readSetup();
    var n = cfg.levels.length && hasRegion(cfg) ? playable(cfg).length : 0;
    var highest = 0;

    el.setupTicks.innerHTML = "";
    LENGTHS.forEach(function (len, i) {
      var ok = n > 0 && (len === Infinity || len <= n);
      if (ok) highest = i;
      var t = document.createElement("span");
      t.className = "game-tick " + (ok ? "" : "is-off");
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
    var missing = !cfg.levels.length
      ? "select at least one difficulty level first"
      : !hasRegion(cfg)
      ? "select at least one region first"
      : "";
    el.setupPool.textContent = n
      ? "your game will draw from " + n + (n === 1 ? " map" : " maps")
      : (missing || "no maps for that combination yet");
    el.setupPool.classList.toggle("is-warning", Boolean(missing) || !n);
    var given = givenBy(cfg);
    if (el.setupHintsSet) show(el.setupHintsSet, !given.country);
    if (el.setupHintText) {
      el.setupHintText.textContent = given.continent
        ? "2 misses reveals the country"
        : "2 misses reveals the continent & 3 misses reveals the country";
    }

    el.setupStart.disabled = !n;
    saveSetup(cfg);
  }

  function saveSetup(cfg) {
    try {
      localStorage.setItem(SETUP_KEY, JSON.stringify({
        levels: cfg.levels, continents: cfg.continents, packs: cfgPacks(cfg),
        length: cfg.length === Infinity ? "endless" : cfg.length,
        hints: Boolean(cfg.hints)
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
            withPicture(function (c) { return !c.packOnly && c.tier === t.id; }));
    });

    el.setupContinents.innerHTML = "";
    check(el.setupContinents, "__all", "all", null);
    continents().forEach(function (t) {
      check(el.setupContinents, t.id, t.label,
            withPicture(function (c) { return !c.packOnly && c.continent === t.id; }));
    });

    buildPacks();

    if (saved) {
      boxes(el.setupLevels).slice(1).forEach(function (b) {
        b.checked = saved.levels.indexOf(b.value) !== -1;
      });
      boxes(el.setupContinents).slice(1).forEach(function (b) {
        b.checked = saved.continents.indexOf(b.value) !== -1;
      });
      if (el.setupPacks) {
        boxes(el.setupPacks).forEach(function (b) {
          b.checked = (saved.packs || []).indexOf(b.value) !== -1;
        });
      }
      var i = LENGTHS.indexOf(saved.length);
      if (i !== -1) el.setupLength.value = i;
      if (el.setupHints) el.setupHints.checked = saved.hints !== false;
    }
    boxes(el.setupLevels)[0].checked = boxes(el.setupLevels).slice(1).every(function (b) { return b.checked; });
    if (el.setupSpecialOpen) el.setupContinents.appendChild(el.setupSpecialOpen);
    boxes(el.setupContinents)[0].checked = boxes(el.setupContinents).slice(1).every(function (b) { return b.checked; });

    renderDaily();
    wireAll(el.setupLevels);
    wireAll(el.setupContinents);
    wireSpecial();
    el.setupLength.addEventListener("input", refreshSetup);
    if (el.setupHints) el.setupHints.addEventListener("change", refreshSetup);
    refreshSetup();
  }

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

  function buildLoupe(stage, img, url) {
    var lens = document.createElement("div");
    lens.className = "game-loupe";
    lens.hidden = true;
    stage.appendChild(lens);

    var on = false;
    var size = 0;
    var zoom = 1;
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

  function buildTapZoom(stage, img) {
    var on = false;

    function reset() {
      on = false;
      stage.classList.remove("is-zoomed");
      img.style.transform = "";
      img.style.transformOrigin = "";
    }

    stage.addEventListener("mousedown", function (e) {
      if (document.activeElement === el.input) e.preventDefault();
    });

    stage.addEventListener("click", function (e) {
      e.preventDefault();
      if (on) {
        reset();
        return;
      }
      var r = stage.getBoundingClientRect();
      var x = Math.max(0, Math.min(1, (e.clientX - r.left) / (r.width || 1)));
      var y = Math.max(0, Math.min(1, (e.clientY - r.top) / (r.height || 1)));
      on = true;
      stage.classList.add("is-zoomed");
      img.style.transformOrigin = (x * 100).toFixed(1) + "% " + (y * 100).toFixed(1) + "%";
      img.style.transform = "scale(2.6)";
    });

    window.addEventListener("resize", function () {
      if (on) reset();
    });

    return { hide: reset };
  }

  function renderRound() {
    var round = state.rounds[state.index];
    state.revealed = false;

    if (loupe) loupe.hide();
    el.frame.innerHTML = "";
    var stage = document.createElement("div");
    stage.className = "game-stage";
    var flash = document.createElement("div");
    flash.className = "game-flash";
    flash.id = "game-flash";
    var img = document.createElement("img");
    img.className = "game-image";
    img.src = round.url;
    img.alt = "Satellite image of a city, round " + (state.index + 1);
    img.decoding = "async";
    if (!(window.matchMedia && window.matchMedia("(hover: none)").matches)) {
      img.title = "Click to magnify";
    }
    img.addEventListener("error", dropRound);
    stage.appendChild(img);
    stage.appendChild(flash);
    el.frame.appendChild(stage);
    var touch = window.matchMedia && window.matchMedia("(hover: none)").matches;
    loupe = touch ? buildTapZoom(stage, img) : buildLoupe(stage, img, round.url);
    warm(state.rounds, state.index + 1, 2);

    el.progressWhere.textContent = "";
    el.progressCount.textContent = state.cfg.length === Infinity
      ? "map " + (state.index + 1)
      : "map " + (state.index + 1) + "/" + state.total;
    setScore();
    show(el.reveal, false);
    show(el.form, true);
    resetGuessBox();
    emptyAsked = false;
    show(el.ask, false);
    el.input.disabled = false;
    el.submit.disabled = false;
    el.input.focus({ preventScroll: true });
    save();
  }

  function scorePart(n, word, mark) {
    return (
      '<span class="game-score-part">' + n +
      '<span class="game-score-word"> ' + word + '</span>' +
      '<span class="game-score-mark" aria-hidden="true"> ' + mark + '</span>' +
      "</span>"
    );
  }

  function setScore() {
    if (state && inQuarters(state.cfg)) {
      el.score.innerHTML =
        scorePart(points(state.points), "points", "◑") +
        '<span class="game-score-sep"> · </span>' +
        scorePart(state.correct, "exact", "✓");
      return;
    }
    el.score.innerHTML =
      scorePart(state.correct, "right", "✓") +
      '<span class="game-score-sep"> · </span>' +
      scorePart(state.wrong, "wrong", "✗");
  }

  function answerLine(city) {
    return city.country ? city.city + " [" + city.country + "]" : city.city;
  }

  function fillAnswer(node, city) {
    node.textContent = city.city;
    if (!city.country) return;
    var where = document.createElement("span");
    where.className = "game-answer-country";
    where.textContent = "[" + city.country + "]";
    node.appendChild(document.createTextNode(" "));
    node.appendChild(where);
  }

  function flashResult(right) {
    var flash = document.getElementById("game-flash");
    var img = document.querySelector(".game-image");
    if (!flash || !img) return;
    flash.style.width = img.offsetWidth + "px";
    flash.style.height = img.offsetHeight + "px";
    flash.classList.remove("is-right", "is-wrong");
    void flash.offsetWidth;
    flash.classList.add(right ? "is-right" : "is-wrong");
  }

  function reveal(entry) {
    state.revealed = true;
    el.reveal.classList.toggle("is-right", entry.right);
    el.reveal.classList.toggle("is-wrong", !entry.right);
    el.verdict.textContent = entry.right ? "Correct" : "Incorrect";
    fillAnswer(el.answer, entry.city);

    var near = !entry.right && entry.credit && entry.credit.points > 0;
    if (near) {
      el.earned.textContent =
        "+" + points(entry.credit.points) + " \u2014 the right " +
        (entry.credit.country
          ? "country"
          : (entry.credit.region ? "region" : "continent") +
            (entry.credit.where ? ", " + entry.credit.where : ""));
    } else {
      el.earned.textContent = "";
    }
    show(el.earned, near);

    show(el.form, false);
    show(el.reveal, true);
    setScore();
    el.status.textContent =
      (entry.right ? "Correct. " : "Incorrect. ") + "The answer is " + answerLine(entry.city) + "." +
      (near ? " " + el.earned.textContent + "." : "");
    el.next.textContent =
      state.cfg.length !== Infinity && state.index + 1 >= state.total ? "see result" : "next";
    show(el.ask, false);
    el.next.focus({ preventScroll: true });
  }

  var emptyAsked = false;

  function askedToSkip() {
    if (emptyAsked) {
      if (state) state.tries = HINT_TRIES;
      return true;
    }
    emptyAsked = true;
    el.ask.textContent = "type a city or press enter once more to give up";
    show(el.ask, true);
    el.input.focus({ preventScroll: true });
    return false;
  }

  function givenBy(cfg) {
    var pool = cfg ? playable(cfg) : [];
    if (!pool.length) return { continent: false, country: false };
    var continents = {}, countries = {};
    for (var i = 0; i < pool.length; i++) {
      continents[pool[i].continent || ""] = 1;
      countries[pool[i].country || ""] = 1;
    }
    return {
      continent: Object.keys(continents).length === 1,
      country: Object.keys(countries).length === 1
    };
  }

  function continentIsGiven(cfg) {
    return givenBy(cfg).continent;
  }

  function hintsSayNothing(cfg) {
    return givenBy(cfg).country;
  }

  function hintFor(city, tries, skipContinent) {
    if (tries === 1) return "try again";
    var where = skipContinent
      ? city.country || city.continent
      : tries === 2
      ? city.continent || city.country
      : city.country || city.continent;
    return where ? "hint: it\u2019s in " + where : null;
  }

  function judge(entry, label) {
    var round = state.rounds[state.index];
    var right = Boolean(entry && entry.id && entry.id === round.city.id);

    if (!right && state.cfg.hints && !hintsSayNothing(state.cfg)) {
      state.tries = (state.tries || 0) + 1;
      var clue = state.tries < HINT_TRIES
        ? hintFor(round.city, state.tries, continentIsGiven(state.cfg))
        : null;
      if (clue) {
        flashResult(false);
        el.ask.textContent = clue;
        show(el.ask, true);
        el.status.textContent = clue.charAt(0).toUpperCase() + clue.slice(1) + ".";
        resetGuessBox();
        el.input.disabled = false;
        el.submit.disabled = false;
        el.input.focus({ preventScroll: true });
        emptyAsked = false;
        save();
        return;
      }
    }

    var credit = inQuarters(state.cfg) ? creditFor(entry, round.city) : null;
    var logged = {
      city: round.city,
      right: right,
      guess: (label || "").trim(),
      credit: credit,
      points: credit ? credit.points : right ? 1 : 0
    };
    if (logged.right) state.correct += 1;
    else state.wrong += 1;
    state.points = (state.points || 0) + logged.points;
    state.log.push(logged);
    show(el.ask, false);
    emptyAsked = false;
    state.tries = 0;
    flashResult(logged.right);
    reveal(logged);
    save();
  }

  function advance() {
    state.index += 1;
    state.tries = 0;
    if (state.index >= state.rounds.length) {
      if (state.cfg.length === Infinity && extend()) renderRound();
      else finish();
    } else {
      renderRound();
    }
  }

  function paintResult() {
    var where = describe(state.cfg);
    var quarters = inQuarters(state.cfg);
    var tally = (quarters ? points(state.points) : state.correct) +
                " of " + state.log.length;
    el.resultScore.textContent = where ? where + " \u00b7 " + tally : tally;
    el.recap.innerHTML = "";
    state.log.forEach(function (entry) {
      var got = fillOf(entry);
      var li = document.createElement("li");
      li.className = "game-recap-item " +
        (entry.right ? "is-right" : got > 0 ? "is-part" : "is-wrong");
      var mark = document.createElement("span");
      mark.className = "game-recap-mark";
      mark.setAttribute("aria-hidden", "true");
      if (got > 0 && got < 1) mark.style.setProperty("--fill", got * 100 + "%");
      var name = document.createElement("span");
      name.className = "game-recap-name";
      fillAnswer(name, entry.city);
      li.appendChild(mark);
      li.appendChild(name);
      if (!entry.right) {
        var said = document.createElement("span");
        said.className = "game-recap-guess";
        said.textContent =
          (entry.guess ? "you said \u2018" + entry.guess + "\u2019" : "pass") +
          (quarters && got > 0 ? " \u00b7 +" + points(got) : "");
        li.appendChild(said);
      }
      el.recap.appendChild(li);
    });

    var isDaily = Boolean(state.cfg.daily);
    show(el.replay, !isDaily);
    show(el.share, isDaily);
    show(el.shareNote, false);
    (isDaily ? el.share : el.replay).focus({ preventScroll: true });
  }

  function finish() {
    forget(slot(state.cfg));
    show(el.board, false);
    show(el.result, true);
    if (state.cfg.daily) {
      var record = {
        day: state.cfg.daily,
        correct: state.correct,
        wrong: state.wrong,
        points: state.points || 0,
        noAccount: !(cloudOn() && cloud.user()),
        log: state.log.map(function (e) {
          return { id: e.city.id, right: e.right, guess: e.guess,
                   points: e.points, credit: e.credit };
        })
      };
      writeDaily(record);
      placeBoard("result");
      postDaily(record);
    }
    tell("game_finish", {
      daily: Boolean(state.cfg.daily),
      correct: state.correct,
      points: state.points || 0,
      rounds: state.log.length
    });
    paintResult();
  }

  function start(cfg) {
    forget(STORE_KEY);
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
      points: 0,
      revealed: false,
      log: []
    };
    if (cfg.seed === setupSeed) setupSeed = randomSeed();
    tell("game_start", { daily: false, rounds: cfg.length });
    renderRound();
  }

  function toIntro() {
    if (loupe) loupe.hide();
    state = null;
    show(el.board, false);
    show(el.result, false);
    show(el.intro, true);
    show(el.empty, false);
    placeBoard("menu");
    loadBoard();
    renderDaily();
    refreshSetup();
    refreshContinue();
    if (history.replaceState) history.replaceState(null, "", location.pathname);
  }

  var cloud = null;
  var boardDay = null;
  var boardTab = "today";
  var TAB_KEY = "ndl-clg-board-tab-v1";
  try {
    boardTab = localStorage.getItem(TAB_KEY) === "alltime" ? "alltime" : "today";
  } catch (err) {}

  function cloudOn() {
    return Boolean(cloud && cloud.enabled);
  }

  function tell(kind, detail) {
    if (cloudOn() && cloud.track) cloud.track(kind, detail || null);
  }

  var googleAsked = false;
  function askForGoogleButton() {
    if (googleAsked || !el.googleBtn || !cloudOn()) return;
    if (!cloud.mountGoogleButton) return;
    googleAsked = true;
    cloud.mountGoogleButton(el.googleBtn).then(function (mounted) {
      show(el.googleBtn, mounted);
      show(el.signIn, !mounted);
    });
  }

  document.addEventListener("clg-google-unavailable", function () {
    show(el.googleBtn, false);
    show(el.signIn, true);
  });

  function renderAccount() {
    if (!el.account) return;
    if (!cloudOn()) {
      show(el.account, false);
      return;
    }
    var me = cloud.user();
    var renaming = el.renameForm && !el.renameForm.hidden;
    show(el.account, true);
    if (!me) askForGoogleButton();
    show(el.signInSlot || el.signIn, !me);
    show(el.accountNote, !me);
    show(el.who, Boolean(me) && !renaming);
    if (!me) {
      if (el.renameForm) show(el.renameForm, false);
      return;
    }
    el.whoName.textContent = me.name;
    if (me.avatar) {
      el.avatar.src = me.avatar;
      show(el.avatar, true);
    } else {
      show(el.avatar, false);
    }
  }

  function placeBoard(where) {
    if (!el.leaders) return;
    var slot = where === "result" ? el.leadersSlotResult : el.leadersSlot;
    if (!slot || !slot.parentNode) return;
    if (el.account) slot.parentNode.insertBefore(el.account, slot);
    slot.parentNode.insertBefore(el.leaders, slot);
  }

  var BOARD_ROWS = 10;

  function ordinal(n) {
    if (n === 1) return "1st";
    if (n === 2) return "2nd";
    if (n === 3) return "3rd";
    return n + "th";
  }

  function boardLine(row, me, allTime) {
    var li = document.createElement("li");
    li.className = "game-leader" + (me && row.user_id === me.id ? " is-you" : "");

    var place = document.createElement("span");
    place.className = "game-leader-place";
    place.textContent = row.place;

    var name = document.createElement("span");
    name.className = "game-leader-name";
    name.textContent = row.display_name || "player";

    var score = document.createElement("span");
    score.className = "game-leader-score";
    if (allTime) {
      score.textContent = points(row.total);
      var days = document.createElement("span");
      days.className = "game-leader-days";
      days.textContent = row.days === 1 ? "1 day" : row.days + " days";
      score.appendChild(days);
    } else {
      score.textContent = points(row.correct) + " / " + DAILY_ROUNDS;
    }

    li.appendChild(place);
    if (row.avatar_url) {
      var pic = document.createElement("img");
      pic.className = "game-leader-avatar";
      pic.src = row.avatar_url;
      pic.alt = "";
      pic.width = 26;
      pic.height = 26;
      pic.loading = "lazy";
      li.appendChild(pic);
    }
    li.appendChild(name);
    li.appendChild(score);
    return li;
  }

  function paintTabs() {
    if (!el.tabToday) return;
    var today = boardTab === "today";
    el.tabToday.classList.toggle("is-on", today);
    el.tabAllTime.classList.toggle("is-on", !today);
    el.tabToday.setAttribute("aria-selected", today ? "true" : "false");
    el.tabAllTime.setAttribute("aria-selected", today ? "false" : "true");
  }

  var boardTick = null;

  function boardLoading(on) {
    if (boardTick) {
      clearInterval(boardTick);
      boardTick = null;
    }
    if (!on || !el.leadersNote) return;
    var dots = 0;
    function write() {
      dots = (dots % 3) + 1;
      el.leadersNote.textContent = "loading" + new Array(dots + 1).join(".");
    }
    write();
    show(el.leadersNote, true);
    boardTick = setInterval(write, 380);
  }

  function loadBoard() {
    if (!cloudOn() || !el.leaders) return;
    paintTabs();
    var day = dayKey();
    var want = boardTab;
    boardDay = day + ":" + want;
    var stamp = boardDay;
    var ask = want === "alltime"
      ? cloud.lifetime(BOARD_ROWS)
      : cloud.board(day, BOARD_ROWS);

    el.leadersList.textContent = "";
    show(el.leaders, true);
    boardLoading(true);

    ask.then(function (rows) {
      if (boardDay !== stamp) return;
      boardLoading(false);
      if (!rows) {
        show(el.leaders, false);
        return;
      }
      var me = cloud.user();
      var allTime = want === "alltime";
      el.leadersList.textContent = "";
      rows.forEach(function (row) {
        el.leadersList.appendChild(boardLine(row, me, allTime));
      });
      show(el.leaders, true);
      freshen();

      if (!rows.length) {
        el.leadersNote.textContent = allTime
          ? "no scores yet."
          : me
          ? "be the first to post a score today by playing today’s challenge."
          : "nobody has posted a score today.";
        show(el.leadersNote, true);
        return;
      }
      if (!me) {
        el.leadersNote.textContent = "sign in to put your score on the board";
        show(el.leadersNote, true);
        return;
      }
      var mine = rows.some(function (row) { return row.user_id === me.id; });
      if (mine) {
        show(el.leadersNote, false);
        return;
      }
      (allTime ? cloud.myLifetime() : cloud.myPlace(day)).then(function (row) {
        if (boardDay !== stamp) return;
        if (!row) {
          var mine = readDaily();
          var playedToday = Boolean(mine && mine.day === dayKey());
          el.leadersNote.textContent = allTime
            ? "you haven’t finished a daily yet."
            : playedToday
            ? (mine.noAccount
                ? "verifying account — play tomorrow to add to the leaderboard"
                : "you played today—that score has not reached the board yet")
            : "you haven’t played today yet.";
        } else if (allTime) {
          el.leadersNote.textContent =
            "you: " + points(row.total) + " over " + row.days +
            (row.days === 1 ? " day" : " days") + " · " + ordinal(row.place);
        } else {
          el.leadersNote.textContent =
            "you: " + points(row.correct) + " / " + DAILY_ROUNDS + " · " + ordinal(row.place);
        }
        show(el.leadersNote, true);
      });
    })["catch"](function () {
      if (boardDay !== stamp) return;
      boardLoading(false);
      el.leadersNote.textContent = "the board could not be reached.";
      show(el.leadersNote, true);
    });
  }

  function freshen() {
    if (!el.leadersList) return;
    el.leadersList.classList.remove("is-fresh");
    void el.leadersList.offsetWidth;
    el.leadersList.classList.add("is-fresh");
  }

  function repaint() {
    document.body.classList.remove("is-refreshing");
    void document.body.offsetWidth;
    document.body.classList.add("is-refreshing");
  }

  if (el.logoHome) {
    el.logoHome.addEventListener("click", function () {
      if (state && el.board && !el.board.hidden) leave();
      else if (el.result && !el.result.hidden) toIntro();
      repaint();
    });
  }

  if (el.customFold) {
    el.customFold.addEventListener("click", function () {
      var open = el.customBody.hidden;
      show(el.customBody, open);
      el.customFold.setAttribute("aria-expanded", String(open));
      el.customFold.classList.toggle("is-folded", !open);
    });
  }

  function foldBoard(open) {
    if (!el.leadersFold) return;
    show(el.leadersBody, open);
    el.leadersFold.setAttribute("aria-expanded", String(open));
    el.leaders.classList.toggle("is-folded", !open);
  }

  if (el.leadersFold) {
    el.leadersFold.addEventListener("click", function () {
      foldBoard(el.leadersBody.hidden);
    });
  }

  function pickTab(which) {
    if (boardTab === which) return;
    boardTab = which;
    try {
      localStorage.setItem(TAB_KEY, which);
    } catch (err) {}
    loadBoard();
  }

  if (el.tabToday) {
    el.tabToday.addEventListener("click", function () { pickTab("today"); });
    el.tabAllTime.addEventListener("click", function () { pickTab("alltime"); });
  }

  function postDaily(record) {
    if (!cloudOn()) return;
    if (!cloud.user()) {
      el.leadersNote.textContent = "sign in to put this score on the board";
      show(el.leadersNote, true);
      show(el.leaders, true);
      return;
    }
    cloud.postDaily(scoreOf(record), record.log.length).then(function (res) {
      if (res.ok || res.reason === "already") {
        record.posted = true;
        writeDaily(record);
      } else {
        el.leadersNote.textContent = "that score could not be posted.";
        show(el.leadersNote, true);
      }
      loadBoard();
    });
  }

  function postSavedDaily() {
    if (!cloudOn() || !cloud.user()) return;
    var record = readDaily();
    if (!record || record.day !== dayKey() || record.posted) return;
    cloud.postDaily(scoreOf(record), record.log.length).then(function (res) {
      if (res.ok || res.reason === "already") {
        record.posted = true;
        writeDaily(record);
      }
      loadBoard();
    });
  }

  document.addEventListener("clg-cloud-ready", function () {
    cloud = window.clgCloud || null;
    renderAccount();
    if (!cloudOn()) return;
    postSavedDaily();
    placeBoard(el.result && !el.result.hidden ? "result" : "menu");
    loadBoard();
  });

  function openRename() {
    if (!cloudOn() || !el.renameForm) return;
    var me = cloud.user();
    if (!me) return;
    el.nameInput.value = me.name || "";
    show(el.who, false);
    show(el.nameNote, false);
    show(el.renameForm, true);
    el.nameInput.focus();
    el.nameInput.select();
  }

  function closeRename() {
    if (!el.renameForm) return;
    show(el.renameForm, false);
    show(el.nameNote, false);
    renderAccount();
  }

  if (el.rename) el.rename.addEventListener("click", openRename);
  if (el.nameCancel) el.nameCancel.addEventListener("click", closeRename);

  if (el.renameForm) {
    el.renameForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var wanted = el.nameInput.value.trim();
      if (!wanted) {
        el.nameNote.textContent = "a name, please.";
        show(el.nameNote, true);
        return;
      }
      el.nameNote.textContent = "saving…";
      show(el.nameNote, true);
      cloud.setName(wanted).then(function (res) {
        if (!res.ok) {
          var why = res.reason || "";
          el.nameNote.textContent = /not allowed/i.test(why)
            ? why + " — try another."
            : "could not save that name" +
              (why && why !== "failed" ? " — " + why : "") + ".";
          show(el.nameNote, true);
          if (window.console && console.warn) {
            console.warn("citylayoutguessr: rename failed —", res.reason);
          }
          return;
        }
        closeRename();
        loadBoard();
      });
    });

    el.nameInput.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRename();
      }
    });
  }

  if (el.signIn) {
    el.signIn.addEventListener("click", function () {
      if (cloudOn()) cloud.signIn();
    });
  }

  if (el.signOut) {
    el.signOut.addEventListener("click", function () {
      if (cloudOn()) cloud.signOut();
    });
  }

  function send(entry, label) {
    el.input.disabled = true;
    el.submit.disabled = true;
    closeSuggest();
    judge(entry, label);
  }

  el.form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!state || el.input.disabled) return;

    if (!el.input.value.trim()) {
      if (!askedToSkip()) return;
      send(null, "");
      return;
    }

    var entry = standing();
    if (!entry) {
      el.ask.textContent = "pick a city from the list";
      show(el.ask, true);
      openSuggest();
      el.input.focus({ preventScroll: true });
      return;
    }

    send(entry, entry.name);
  });

  el.setup.addEventListener("submit", function (e) {
    e.preventDefault();
    var cfg = readSetup();
    if (cfg.levels.length && hasRegion(cfg)) start(cfg);
  });

  if (el.setupShare) {
    el.setupShare.addEventListener("click", function () {
      var cfg = readSetup();
      if (!cfg.levels.length || !hasRegion(cfg)) return;
      var url = shareUrl(cfg);
      function done(ok) {
        el.setupShareNote.textContent = ok ? "link copied — it plays this exact game" : url;
        show(el.setupShareNote, true);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { done(true); },
                                                function () { done(false); });
      } else {
        done(false);
      }
    });
  }

  el.dailyStart.addEventListener("click", startDaily);

  if (el.setupContinue) {
    el.setupContinue.addEventListener("click", function () {
      if (!restore(STORE_KEY, true)) {
        forget(STORE_KEY);
        refreshContinue();
      }
    });
  }

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

  (function keepFieldAboveKeyboard() {
    var vv = window.visualViewport;
    if (!vv) return;

    function adjust() {
      if (document.activeElement !== el.input) return;
      if (window.innerHeight - vv.height < 120) return;
      var box = el.input.getBoundingClientRect();
      var floor = vv.height + vv.offsetTop;
      var overlap = box.bottom - floor + 12;
      if (overlap > 1) window.scrollBy(0, overlap);
    }

    vv.addEventListener("resize", adjust);
    vv.addEventListener("scroll", adjust);
    el.input.addEventListener("focus", function () {
      setTimeout(adjust, 120);
      setTimeout(adjust, 400);
    });
  })();

  el.input.addEventListener("input", function () {
    if (el.input.value.trim()) {
      emptyAsked = false;
      show(el.ask, false);
    }
    picked = null;
    openSuggest();
  });

  el.input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveActive(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveActive(-1);
      return;
    }
    if (e.key === "Enter" && !el.suggest.hidden && active !== -1) {
      e.preventDefault();
      take(shown[active]);
      return;
    }
    if (e.key === "Escape" && !el.suggest.hidden) {
      e.preventDefault();
      e.stopPropagation();
      closeSuggest();
      return;
    }
    if (e.key === "Tab") closeSuggest();
  });

  el.suggest.addEventListener("mousedown", function (e) {
    e.preventDefault();
  });

  el.suggest.addEventListener("click", function (e) {
    var li = e.target;
    while (li && li.parentNode !== el.suggest) li = li.parentNode;
    if (!li) return;
    var i = Array.prototype.indexOf.call(el.suggest.children, li);
    if (i !== -1) take(shown[i]);
  });

  document.addEventListener("pointerdown", function (e) {
    if (el.suggest.hidden) return;
    if (e.target === el.input || el.suggest.contains(e.target)) return;
    closeSuggest();
  });

  window.addEventListener("resize", function () {
    if (!el.suggest.hidden) placeSuggest();
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", function () {
      if (!el.suggest.hidden) placeSuggest();
    });
  }

  el.next.addEventListener("click", advance);
  el.replay.addEventListener("click", function () {
    start(state ? state.cfg : readSetup());
  });
  el.change.addEventListener("click", toIntro);

  function leave() {
    if (state && state.cfg.length === Infinity && state.log.length) {
      finish();
      return;
    }
    if (state && state.index < state.total) save(true);
    toIntro();
  }
  if (el.quit) el.quit.addEventListener("click", leave);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && el.reveal && !el.reveal.hidden) {
      e.preventDefault();
      advance();
      return;
    }
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
          return fetch(CATALOG_URL, { cache: "reload" })
            .then(function (r) {
              return r.ok ? r.json() : null;
            })
            .catch(function () {
              return null;
            })
            .then(function (extra) {
              json.catalog = (extra && extra.cities) || [];
              return json;
            });
        });
    })
    .then(function (json) {
      data.cities.forEach(function (c) {
        byId[c.id] = c;
      });
      buildCatalog(data.catalog);
      el.credit.textContent = data.credit || "";
      setupCosmetics();
      renderSetup();
      var hash = (location.hash || "").replace("#", "");

      var shared = decodeCfg(hash);
      if (shared) {
        start(shared);
        if (history.replaceState) history.replaceState(null, "", location.pathname);
        return;
      }

      if (restore(STORE_KEY_DAILY)) return;
      if (restore(STORE_KEY)) return;
      refreshContinue();

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

      window.addEventListener("hashchange", function () {
        var now = (location.hash || "").replace("#", "");
        if (now === "daily") return startDaily();
        var pasted = decodeCfg(now);
        if (pasted) {
          start(pasted);
          if (history.replaceState) history.replaceState(null, "", location.pathname);
        }
      });
    })
    .catch(function (err) {
      if (window.console && console.error) console.error("citylayoutguessr:", err);
      show(el.setup, false);
      show(el.empty, true);
      el.empty.textContent = "The list of cities could not be loaded.";
    });
})();

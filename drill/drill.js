(function () {
  "use strict";

  // One engine for every deck. A page sets <body data-deck="…"> and loads
  // data/<deck>.js first, which fills window.DRILL_DATA[deck].
  var DECKS = {
    philosophers: {
      noun: "philosopher",
      plural: "philosophers",
      tagWord: "school",
      groupWord: "eras",
      groups: [
        ["ancient", "Greece and Rome"],
        ["asian", "Asian traditions"],
        ["medieval", "Medieval"],
        ["early-modern", "Early modern"],
        ["19th", "19th century"],
        ["20th", "20th century"],
      ],
      other: ["../authors/", "authors and their works"],
      sections: ["ideas", "works", "facts", "quotes"],
      gens: {
        termWho: 3,
        ideaWho: 3,
        ideaMeaning: 2,
        quoteWho: 2,
        factWho: 2,
        workWho: 2,
        whichWork: 1,
        workNote: 1,
        tag: 1,
        bornFirst: 1,
      },
      cardClues: ["ideas", "facts", "quotes", "works"],
      matchClue: "ideas",
      matchLabel: "match each philosopher to one of their ideas",
      modes: [
        ["quiz", "multiple choice on ideas, works, quotes, lives, and dates"],
        ["cards", "flip cards: recall everything you can, then check"],
        ["match", "pair six philosophers with their ideas against the clock"],
        ["order", "put five philosophers in order of birth"],
        ["browse", "read through every entry"],
      ],
    },
    authors: {
      noun: "author",
      plural: "authors",
      tagWord: "movement",
      groupWord: "periods",
      groups: [
        ["classical", "Antiquity and the Middle Ages"],
        ["early-modern", "Renaissance to 1800"],
        ["19th", "19th century"],
        ["modern", "Modernism"],
        ["postwar", "Postwar and contemporary"],
      ],
      other: ["../philosophers/", "philosophers and their ideas"],
      sections: ["works", "facts", "lines", "characters"],
      gens: {
        workWho: 4,
        factWho: 3,
        whichWork: 2,
        workNote: 2,
        lineWork: 2,
        lineWho: 1,
        charWork: 2,
        tag: 1,
        place: 1,
        bornFirst: 1,
      },
      cardClues: ["works", "facts", "lines", "characters"],
      matchClue: "works",
      matchLabel: "match each author to one of their works",
      modes: [
        ["quiz", "multiple choice on works, first lines, characters, lives, and dates"],
        ["cards", "flip cards: recall everything you can, then check"],
        ["match", "pair six authors with their works against the clock"],
        ["order", "put five authors in order of birth"],
        ["browse", "read through every entry"],
      ],
    },
  };

  var SECTION_TITLES = {
    ideas: "ideas",
    works: "works",
    facts: "life",
    quotes: "in their words",
    lines: "lines",
    characters: "characters",
  };

  var LENGTHS = [10, 20, 50, 0];
  var KNOWN_AT = 4;
  var MAX_BOX = 5;

  var root = document.getElementById("drill");
  var deckId = document.body.getAttribute("data-deck");
  var deck = DECKS[deckId];
  var ALL = (window.DRILL_DATA && window.DRILL_DATA[deckId]) || [];
  if (!root) return;
  if (!deck || !ALL.length) {
    root.innerHTML = '<p class="lede">This deck could not be loaded.</p>';
    return;
  }

  /* ---------- storage ---------- */

  var KEY = "ndl-drill-" + deckId;

  function load(key, fallback) {
    try {
      var v = JSON.parse(localStorage.getItem(key));
      return v && typeof v === "object" ? v : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function store(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  // stats[id] = [box 0–5, times right, times wrong]
  var stats = load(KEY + "-stats", {});
  var settings = load(KEY + "-settings", {});
  var groupIds = deck.groups.map(function (g) {
    return g[0];
  });
  if (!Array.isArray(settings.groups)) settings.groups = groupIds.slice();
  settings.groups = settings.groups.filter(function (g) {
    return groupIds.indexOf(g) !== -1;
  });
  if (!settings.groups.length) settings.groups = groupIds.slice();
  if (LENGTHS.indexOf(settings.length) === -1) settings.length = 20;

  function saveSettings() {
    store(KEY + "-settings", settings);
  }

  function box(item) {
    var s = stats[item.id];
    return s ? s[0] : -1;
  }

  function record(item, ok) {
    var s = stats[item.id] || [0, 0, 0];
    if (ok) {
      s[0] = Math.min(MAX_BOX, s[0] + 1);
      s[1]++;
    } else {
      s[0] = Math.max(0, s[0] - 2);
      s[2]++;
    }
    stats[item.id] = s;
    store(KEY + "-stats", stats);
  }

  // Unseen and shaky entries come up more often than ones you know.
  function weight(item) {
    var b = box(item);
    return b < 0 ? 5 : [6, 4, 2.5, 1.5, 0.8, 0.4][b];
  }

  /* ---------- helpers ---------- */

  function rand(n) {
    return Math.floor(Math.random() * n);
  }

  function pick(arr) {
    return arr[rand(arr.length)];
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = rand(i + 1);
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function weightedPick(items, fn) {
    var total = 0;
    var ws = items.map(function (it) {
      var w = fn(it);
      total += w;
      return w;
    });
    var r = Math.random() * total;
    for (var i = 0; i < items.length; i++) {
      r -= ws[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function escRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function list(arr) {
    return Array.isArray(arr) ? arr : [];
  }

  function groupLabel(id) {
    for (var i = 0; i < deck.groups.length; i++) {
      if (deck.groups[i][0] === id) return deck.groups[i][1];
    }
    return id;
  }

  function currentPool() {
    return ALL.filter(function (it) {
      return settings.groups.indexOf(it.group) !== -1;
    });
  }

  // The data is written without names in its clues; this is a backstop.
  var maskCache = {};
  function mask(text, item) {
    if (!maskCache[item.id]) {
      maskCache[item.id] = item.name
        .split(/[\s\-]+/)
        .map(function (t) {
          return t.replace(/[.,()]/g, "");
        })
        .filter(function (t) {
          return t.length > 3 && t.toLowerCase() !== "saint";
        })
        .map(function (t) {
          try {
            return new RegExp("(?<!\\p{L})" + escRe(t) + "(?!\\p{L})", "giu");
          } catch (e) {
            return new RegExp("\\b" + escRe(t) + "\\b", "gi");
          }
        });
    }
    var out = String(text);
    maskCache[item.id].forEach(function (re) {
      out = out.replace(re, "———");
    });
    return out;
  }

  function fmtTime(ms) {
    var s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  /* ---------- screens ---------- */

  var actions = {};
  var keys = null;
  var cleanup = null;

  function render(html, acts, onKey) {
    if (cleanup) cleanup();
    cleanup = null;
    root.innerHTML = html;
    actions = acts || {};
    keys = onKey || null;
  }

  root.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]");
    if (!el || !root.contains(el) || el.disabled) return;
    var fn = actions[el.getAttribute("data-act")];
    if (fn) fn(el, e);
  });

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) {
      if (e.key === "Escape") t.blur();
      return;
    }
    if (e.key === "Escape" && actions.menu) {
      e.preventDefault();
      actions.menu();
      return;
    }
    if (keys && keys(e.key, e) === true) e.preventDefault();
  });

  function scrollTop() {
    window.scrollTo(0, 0);
  }

  function metaBar(parts, extra) {
    return (
      '<div class="d-meta">' +
      parts
        .map(function (p) {
          return '<span class="d-meta-item">' + p + "</span>";
        })
        .join("") +
      '<span class="d-meta-actions">' +
      (extra || "") +
      '<button type="button" class="text-action" data-act="menu">menu<span class="kbd-hint"> [esc]</span></button>' +
      "</span></div>"
    );
  }

  /* ---------- profiles ---------- */

  function sectionRows(item, sec) {
    if (sec === "ideas") {
      return list(item.ideas).map(function (d) {
        return '<span class="pf-term">' + esc(d.term) + "</span> " + esc(d.text);
      });
    }
    if (sec === "works") {
      return list(item.works).map(function (w) {
        return (
          "<cite>" +
          esc(w.title) +
          "</cite>" +
          (w.year ? ' <span class="pf-year">' + esc(w.year) + "</span>" : "") +
          (w.note ? " " + esc(w.note) : "")
        );
      });
    }
    if (sec === "facts") return list(item.facts).map(esc);
    if (sec === "quotes") {
      return list(item.quotes).map(function (q) {
        return "“" + esc(q) + "”";
      });
    }
    if (sec === "lines") {
      return list(item.lines).map(function (l) {
        return "“" + esc(l.text) + "” <cite>" + esc(l.work) + "</cite>";
      });
    }
    if (sec === "characters") {
      return list(item.characters).map(function (c) {
        return esc(c.name) + ", in <cite>" + esc(c.work) + "</cite>";
      });
    }
    return [];
  }

  function sectionHTML(item, sec, focus) {
    var rows = sectionRows(item, sec);
    if (!rows.length) return "";
    return (
      '<div class="pf-sec"><h3 class="pf-h">' +
      SECTION_TITLES[sec] +
      '</h3><ul class="pf-list">' +
      rows
        .map(function (r, i) {
          var on = focus && focus[0] === sec && focus[1] === i;
          return "<li" + (on ? ' class="is-focus"' : "") + ">" + r + "</li>";
        })
        .join("") +
      "</ul></div>"
    );
  }

  function metaLine(item) {
    return [item.dates, item.place, item.tag]
      .filter(Boolean)
      .map(esc)
      .join(" · ");
  }

  function headHTML(item) {
    var known = box(item) >= KNOWN_AT;
    return (
      '<div class="pf-head"><span class="pf-name">' +
      esc(item.name) +
      "</span>" +
      (known ? '<span class="pf-known" title="known">known</span>' : "") +
      '<span class="pf-meta">' +
      metaLine(item) +
      "</span></div>"
    );
  }

  function profileHTML(item, focus) {
    return (
      '<div class="pf">' +
      headHTML(item) +
      (item.blurb ? '<p class="pf-blurb">' + esc(item.blurb) + "</p>" : "") +
      deck.sections
        .map(function (sec) {
          return sectionHTML(item, sec, focus);
        })
        .join("") +
      "</div>"
    );
  }

  // Head, the row the question was about, the blurb, and the rest folded.
  function compactProfileHTML(item, focus) {
    var focusRow = "";
    if (focus) {
      var rows = sectionRows(item, focus[0]);
      if (rows[focus[1]] != null) {
        focusRow =
          '<div class="pf-sec"><h3 class="pf-h">' +
          SECTION_TITLES[focus[0]] +
          '</h3><ul class="pf-list"><li class="is-focus">' +
          rows[focus[1]] +
          "</li></ul></div>";
      }
    }
    return (
      '<div class="pf">' +
      headHTML(item) +
      focusRow +
      (item.blurb ? '<p class="pf-blurb">' + esc(item.blurb) + "</p>" : "") +
      '<details class="pf-more"><summary>everything on ' +
      esc(item.name) +
      "</summary>" +
      deck.sections
        .map(function (sec) {
          return sectionHTML(item, sec, focus);
        })
        .join("") +
      "</details></div>"
    );
  }

  /* ---------- question generators ---------- */

  // Wrong answers, drawn from the chosen eras first and from the same era
  // more often than not, so they are plausible.
  function distractors(item, n, ok, pool) {
    var seen = {};
    seen[item.id] = true;
    var cands = [];
    function add(src) {
      src.forEach(function (c) {
        if (seen[c.id] || (ok && !ok(c))) return;
        seen[c.id] = true;
        cands.push(c);
      });
    }
    add(pool);
    if (cands.length < n) add(ALL);
    var same = shuffle(
      cands.filter(function (c) {
        return c.group === item.group;
      })
    );
    var diff = shuffle(
      cands.filter(function (c) {
        return c.group !== item.group;
      })
    );
    var out = [];
    while (out.length < n && (same.length || diff.length)) {
      var useSame = same.length && (!diff.length || Math.random() < 0.6);
      out.push((useSame ? same : diff).pop());
    }
    return out.length === n ? out : null;
  }

  function nameQuestion(item, pool, q) {
    var ds = distractors(item, 3, null, pool);
    if (!ds) return null;
    q.item = item;
    q.options = shuffle(
      [item].concat(ds).map(function (it) {
        return { text: it.name, owner: it, kind: "name", correct: it === item };
      })
    );
    return q;
  }

  function titleQuestion(item, title, pool, q) {
    var ds = distractors(
      item,
      3,
      function (c) {
        return list(c.works).some(function (w) {
          return w.title !== title;
        });
      },
      pool
    );
    if (!ds) return null;
    var used = {};
    used[title] = true;
    var opts = [{ text: title, owner: item, kind: "title", correct: true }];
    for (var i = 0; i < ds.length; i++) {
      var ws = list(ds[i].works).filter(function (w) {
        return !used[w.title];
      });
      if (!ws.length) return null;
      var w = pick(ws);
      used[w.title] = true;
      opts.push({ text: w.title, owner: ds[i], kind: "title", correct: false });
    }
    q.item = item;
    q.options = shuffle(opts);
    return q;
  }

  function choiceQuestion(item, field, label, pool) {
    var value = item[field];
    if (!value) return null;
    var seen = {};
    seen[value] = true;
    var near = [];
    var far = [];
    shuffle(ALL).forEach(function (c) {
      var v = c[field];
      if (!v || seen[v]) return;
      seen[v] = true;
      (c.group === item.group ? near : far).push(v);
    });
    var others = near.slice(0, 2).concat(far, near.slice(2)).slice(0, 3);
    if (others.length < 3) return null;
    return {
      item: item,
      label: label,
      prompt: esc(item.name),
      sub: esc(item.dates || ""),
      promptClass: "is-name",
      options: shuffle(
        [value].concat(others).map(function (v) {
          return { text: v, kind: "plain", correct: v === value };
        })
      ),
    };
  }

  var GEN = {
    factWho: function (item, pool) {
      var facts = list(item.facts);
      if (!facts.length) return null;
      var i = rand(facts.length);
      return nameQuestion(item, pool, {
        label: "who is this?",
        prompt: esc(mask(facts[i], item)),
        focus: ["facts", i],
      });
    },

    termWho: function (item, pool) {
      var ideas = list(item.ideas);
      if (!ideas.length) return null;
      var i = rand(ideas.length);
      return nameQuestion(item, pool, {
        label: "whose idea?",
        prompt: esc(ideas[i].term),
        promptClass: "is-term",
        focus: ["ideas", i],
      });
    },

    ideaWho: function (item, pool) {
      var ideas = list(item.ideas);
      if (!ideas.length) return null;
      var i = rand(ideas.length);
      return nameQuestion(item, pool, {
        label: "whose idea is this?",
        prompt: esc(mask(ideas[i].text, item)),
        focus: ["ideas", i],
      });
    },

    quoteWho: function (item, pool) {
      var quotes = list(item.quotes);
      if (!quotes.length) return null;
      var i = rand(quotes.length);
      return nameQuestion(item, pool, {
        label: "who said it?",
        prompt: "“" + esc(mask(quotes[i], item)) + "”",
        promptClass: "is-quote",
        focus: ["quotes", i],
      });
    },

    lineWho: function (item, pool) {
      var lines = list(item.lines);
      if (!lines.length) return null;
      var i = rand(lines.length);
      return nameQuestion(item, pool, {
        label: "who wrote this line?",
        prompt: "“" + esc(mask(lines[i].text, item)) + "”",
        promptClass: "is-quote",
        focus: ["lines", i],
      });
    },

    workWho: function (item, pool) {
      var works = list(item.works);
      if (!works.length) return null;
      var i = rand(works.length);
      return nameQuestion(item, pool, {
        label: deckId === "authors" ? "who wrote it?" : "whose work is this?",
        prompt: "<cite>" + esc(works[i].title) + "</cite>",
        sub: esc(works[i].year || ""),
        promptClass: "is-title",
        focus: ["works", i],
      });
    },

    whichWork: function (item, pool) {
      var works = list(item.works);
      if (!works.length) return null;
      var i = rand(works.length);
      return titleQuestion(item, works[i].title, pool, {
        label: "which of these did they write?",
        prompt: esc(item.name),
        sub: esc(item.dates || ""),
        promptClass: "is-name",
        focus: ["works", i],
      });
    },

    workNote: function (item, pool) {
      var works = list(item.works).filter(function (w) {
        return w.note;
      });
      if (!works.length) return null;
      var w = pick(works);
      return titleQuestion(item, w.title, pool, {
        label: "which work is this?",
        prompt: esc(mask(w.note, item)),
        focus: ["works", list(item.works).indexOf(w)],
      });
    },

    lineWork: function (item, pool) {
      var lines = list(item.lines);
      if (!lines.length) return null;
      var i = rand(lines.length);
      return titleQuestion(item, lines[i].work, pool, {
        label: "which work is this line from?",
        prompt: "“" + esc(mask(lines[i].text, item)) + "”",
        promptClass: "is-quote",
        focus: ["lines", i],
      });
    },

    charWork: function (item, pool) {
      var chars = list(item.characters);
      if (!chars.length) return null;
      var i = rand(chars.length);
      return titleQuestion(item, chars[i].work, pool, {
        label: "which work is this character from?",
        prompt: esc(chars[i].name),
        promptClass: "is-term",
        focus: ["characters", i],
      });
    },

    ideaMeaning: function (item, pool) {
      var ideas = list(item.ideas);
      if (!ideas.length) return null;
      var i = rand(ideas.length);
      var ds = distractors(
        item,
        3,
        function (c) {
          return list(c.ideas).length > 0;
        },
        pool
      );
      if (!ds) return null;
      var opts = [{ text: mask(ideas[i].text, item), owner: item, kind: "plain", correct: true }];
      ds.forEach(function (d) {
        var idea = pick(d.ideas);
        opts.push({ text: mask(idea.text, d), owner: d, kind: "plain", correct: false, ownerTerm: idea.term });
      });
      opts[0].ownerTerm = ideas[i].term;
      return {
        item: item,
        label: "what does it mean?",
        prompt: esc(ideas[i].term),
        sub: esc(item.name),
        promptClass: "is-term",
        focus: ["ideas", i],
        options: shuffle(opts),
      };
    },

    tag: function (item) {
      return choiceQuestion(item, "tag", "which " + deck.tagWord + "?", null);
    },

    place: function (item) {
      return choiceQuestion(item, "place", "where are they from?", null);
    },

    bornFirst: function (item, pool) {
      var picks = [item];
      var gap = 10;
      function fill(src) {
        shuffle(src).forEach(function (c) {
          if (picks.length >= 4 || typeof c.born !== "number") return;
          var clear = picks.every(function (p) {
            return p !== c && Math.abs(p.born - c.born) >= gap;
          });
          if (clear) picks.push(c);
        });
      }
      if (typeof item.born !== "number") return null;
      fill(pool);
      if (picks.length < 4) fill(ALL);
      if (picks.length < 4) return null;
      var last = Math.random() < 0.35;
      var answer = picks.reduce(function (a, b) {
        return last ? (b.born > a.born ? b : a) : b.born < a.born ? b : a;
      });
      return {
        item: answer,
        label: last ? "who was born last?" : "who was born first?",
        prompt: "",
        options: shuffle(picks).map(function (it) {
          return { text: it.name, owner: it, kind: "name", correct: it === answer };
        }),
        showDates: true,
      };
    },
  };

  function makeQuestion(pool, recent) {
    var fresh = pool.filter(function (it) {
      return recent.indexOf(it.id) === -1;
    });
    var src = fresh.length ? fresh : pool;
    var names = Object.keys(deck.gens);
    for (var tries = 0; tries < 30; tries++) {
      var item = weightedPick(src, weight);
      var name = weightedPick(names, function (n) {
        return deck.gens[n];
      });
      var q = GEN[name](item, pool);
      if (q) return q;
    }
    return null;
  }

  /* ---------- menu ---------- */

  function menu() {
    var pool = currentPool();
    var known = pool.filter(function (it) {
      return box(it) >= KNOWN_AT;
    }).length;
    var seen = pool.filter(function (it) {
      return box(it) >= 0;
    }).length;

    var groupsHTML = deck.groups
      .map(function (g) {
        var on = settings.groups.indexOf(g[0]) !== -1;
        var n = ALL.filter(function (it) {
          return it.group === g[0];
        }).length;
        return (
          '<button type="button" class="chip' +
          (on ? " is-on" : "") +
          '" data-act="group" data-group="' +
          g[0] +
          '" aria-pressed="' +
          on +
          '">' +
          esc(g[1]) +
          ' <span class="chip-n">' +
          n +
          "</span></button>"
        );
      })
      .join("");

    var lengthsHTML = LENGTHS.map(function (n) {
      var on = settings.length === n;
      return (
        '<button type="button" class="chip' +
        (on ? " is-on" : "") +
        '" data-act="length" data-n="' +
        n +
        '" aria-pressed="' +
        on +
        '">' +
        (n ? n : "endless") +
        "</button>"
      );
    }).join("");

    var modesHTML = deck.modes
      .map(function (m, i) {
        return (
          '<li><button type="button" class="text-action d-mode" data-act="mode" data-mode="' +
          m[0] +
          '">' +
          m[0] +
          '<span class="kbd-hint"> [' +
          (i + 1) +
          ']</span></button><span class="d-mode-desc">' +
          esc(m[1]) +
          "</span></li>"
        );
      })
      .join("");

    var allOn = settings.groups.length === groupIds.length;

    render(
      '<p class="lede">' +
        ALL.length +
        " " +
        deck.plural +
        ". Pick the " +
        deck.groupWord +
        " to drill, then a way to drill them.</p>" +
        '<div class="d-sec"><h2 class="d-h">' +
        deck.groupWord +
        ' <button type="button" class="text-action is-small" data-act="all-groups">' +
        (allOn ? "only one" : "all") +
        "</button></h2>" +
        '<div class="chip-row">' +
        groupsHTML +
        "</div></div>" +
        '<div class="d-sec"><h2 class="d-h">rounds</h2><div class="chip-row">' +
        lengthsHTML +
        "</div></div>" +
        '<div class="d-sec"><h2 class="d-h">drill</h2><ul class="d-modes">' +
        modesHTML +
        "</ul></div>" +
        '<p class="d-progress">' +
        pool.length +
        " in play · seen " +
        seen +
        " · known " +
        known +
        ' <span class="d-bar" aria-hidden="true"><span style="width:' +
        (pool.length ? Math.round((known / pool.length) * 100) : 0) +
        '%"></span></span></p>' +
        '<p class="d-small"><button type="button" class="text-action is-small" data-act="reset">reset progress</button></p>' +
        '<p class="d-small d-switch">also: <a href="' +
        deck.other[0] +
        '">' +
        esc(deck.other[1]) +
        "</a></p>",
      {
        group: function (el) {
          var g = el.getAttribute("data-group");
          var i = settings.groups.indexOf(g);
          if (i === -1) settings.groups.push(g);
          else if (settings.groups.length > 1) settings.groups.splice(i, 1);
          saveSettings();
          menu();
        },
        "all-groups": function () {
          if (settings.groups.length === groupIds.length) settings.groups = [groupIds[0]];
          else settings.groups = groupIds.slice();
          saveSettings();
          menu();
        },
        length: function (el) {
          settings.length = Number(el.getAttribute("data-n"));
          saveSettings();
          menu();
        },
        mode: function (el) {
          start(el.getAttribute("data-mode"));
        },
        reset: function () {
          if (!window.confirm("Forget what you have seen and known in this deck?")) return;
          stats = {};
          store(KEY + "-stats", stats);
          menu();
        },
      },
      function (key) {
        var n = Number(key);
        if (n >= 1 && n <= deck.modes.length) {
          start(deck.modes[n - 1][0]);
          return true;
        }
      }
    );
  }

  function start(mode, pool) {
    pool = pool || currentPool();
    scrollTop();
    if (mode === "quiz") quiz(pool);
    else if (mode === "cards") cards(pool);
    else if (mode === "match") match(pool);
    else if (mode === "order") order(pool);
    else if (mode === "browse") browse();
  }

  /* ---------- quiz ---------- */

  function quiz(pool) {
    var total = settings.length;
    var st = { n: 0, right: 0, streak: 0, best: 0, missed: [], recent: [] };

    function next() {
      if (total && st.n >= total) return done();
      var q = makeQuestion(pool, st.recent);
      if (!q) return done();
      st.recent.push(q.item.id);
      if (st.recent.length > Math.min(6, pool.length - 1)) st.recent.shift();
      ask(q);
    }

    function ask(q) {
      var answered = false;
      var parts = [
        "question " + (st.n + 1) + (total ? " of " + total : ""),
        "score " + st.right,
        "streak " + st.streak,
      ];
      var extra = total
        ? ""
        : '<button type="button" class="text-action" data-act="end">end</button>';
      render(
        metaBar(parts, extra) +
          '<p class="q-label">' +
          esc(q.label) +
          "</p>" +
          (q.prompt
            ? '<div class="q-prompt ' + (q.promptClass || "") + '">' + q.prompt + "</div>"
            : "") +
          (q.sub ? '<p class="q-sub">' + q.sub + "</p>" : "") +
          '<ol class="q-options">' +
          q.options
            .map(function (o, i) {
              var long = o.text.length > 70 ? " is-long" : "";
              var text = o.kind === "title" ? "<cite>" + esc(o.text) + "</cite>" : esc(o.text);
              return (
                '<li><button type="button" class="opt' +
                long +
                '" data-act="answer" data-i="' +
                i +
                '"><span class="opt-key">' +
                (i + 1) +
                '</span><span class="opt-body"><span class="opt-text">' +
                text +
                '</span><span class="opt-note"></span></span></button></li>'
              );
            })
            .join("") +
          "</ol>" +
          '<div class="q-feedback" aria-live="polite"></div>',
        {
          answer: function (el) {
            answer(Number(el.getAttribute("data-i")));
          },
          next: next,
          end: done,
          menu: menu,
        },
        function (key) {
          if (!answered) {
            var n = Number(key);
            if (n >= 1 && n <= q.options.length) {
              answer(n - 1);
              return true;
            }
          } else if (key === "Enter" || key === " " || key === "n" || key === "ArrowRight") {
            next();
            return true;
          }
        }
      );

      function answer(i) {
        if (answered) return;
        answered = true;
        var chosen = q.options[i];
        var ok = chosen.correct;
        st.n++;
        if (ok) {
          st.right++;
          st.streak++;
          st.best = Math.max(st.best, st.streak);
        } else {
          st.streak = 0;
          if (st.missed.indexOf(q.item) === -1) st.missed.push(q.item);
        }
        record(q.item, ok);

        var buttons = root.querySelectorAll(".opt");
        q.options.forEach(function (o, j) {
          var b = buttons[j];
          b.disabled = true;
          if (o.correct) b.classList.add("is-right");
          else if (j === i) b.classList.add("is-wrong");
          else b.classList.add("is-dim");
          var note = "";
          if (o.owner && (o.kind === "title" || o.kind === "plain")) {
            note = o.owner.name + (o.ownerTerm ? " · " + o.ownerTerm : "");
          } else if (o.owner && (q.showDates || !o.correct)) {
            note = o.owner.dates || "";
          }
          b.querySelector(".opt-note").textContent = note;
        });

        var meta = root.querySelectorAll(".d-meta-item");
        if (meta[1]) meta[1].textContent = "score " + st.right;
        if (meta[2]) meta[2].textContent = "streak " + st.streak;

        var correctOpt = q.options.filter(function (o) {
          return o.correct;
        })[0];
        var answerText =
          correctOpt.kind === "title"
            ? "<cite>" + esc(correctOpt.text) + "</cite>"
            : correctOpt.kind === "name"
            ? esc(correctOpt.text)
            : "";
        root.querySelector(".q-feedback").innerHTML =
          '<p class="q-verdict ' +
          (ok ? "is-right" : "is-wrong") +
          '">' +
          (ok ? "right" : answerText ? "no: " + answerText : "no") +
          "</p>" +
          compactProfileHTML(q.item, q.focus) +
          '<button type="button" class="text-action d-next" data-act="next">' +
          (total && st.n >= total ? "results" : "next") +
          '<span class="kbd-hint"> [enter]</span></button>';
        var nextBtn = root.querySelector(".d-next");
        if (nextBtn && nextBtn.getBoundingClientRect().bottom > window.innerHeight) {
          nextBtn.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }
    }

    function done() {
      scrollTop();
      var missed = st.missed;
      render(
        '<p class="end-score">' +
          st.right +
          ' <span>of</span> ' +
          st.n +
          "</p>" +
          '<p class="d-small">best streak ' +
          st.best +
          "</p>" +
          (missed.length
            ? '<div class="d-sec"><h2 class="d-h">to review</h2>' +
              missed
                .map(function (it) {
                  return '<details class="d-entry"><summary>' + summaryHTML(it) + "</summary>" + profileHTML(it) + "</details>";
                })
                .join("") +
              "</div>"
            : "") +
          '<div class="d-actions">' +
          '<button type="button" class="text-action" data-act="again">again<span class="kbd-hint"> [enter]</span></button>' +
          (missed.length >= 1
            ? '<button type="button" class="text-action" data-act="missed">drill the ones I missed</button>'
            : "") +
          '<button type="button" class="text-action" data-act="menu">menu</button></div>',
        {
          again: function () {
            start("quiz", pool);
          },
          missed: function () {
            start("quiz", missed.slice());
          },
          menu: menu,
        },
        function (key) {
          if (key === "Enter") {
            start("quiz", pool);
            return true;
          }
        }
      );
    }

    next();
  }

  function summaryHTML(it) {
    return (
      '<span class="d-entry-name">' +
      esc(it.name) +
      "</span>" +
      '<span class="d-entry-meta">' +
      metaLine(it) +
      "</span>" +
      (box(it) >= KNOWN_AT ? '<span class="pf-known">known</span>' : "")
    );
  }

  /* ---------- cards ---------- */

  function clueFor(item) {
    var opts = [];
    deck.cardClues.forEach(function (sec) {
      list(item[sec]).forEach(function (v, i) {
        opts.push([sec, i, v]);
      });
    });
    if (!opts.length) return null;
    var c = pick(opts);
    var sec = c[0];
    var v = c[2];
    var html;
    if (sec === "ideas") html = '<span class="card-term">' + esc(v.term) + "</span>" + esc(mask(v.text, item));
    else if (sec === "works") html = "<cite>" + esc(v.title) + "</cite>";
    else if (sec === "quotes") html = "“" + esc(mask(v, item)) + "”";
    else if (sec === "lines") html = "“" + esc(mask(v.text, item)) + "”";
    else if (sec === "characters") html = esc(v.name) + ' <span class="card-in">in <cite>' + esc(v.work) + "</cite></span>";
    else html = esc(mask(v, item));
    return { html: html, focus: [sec, c[1]], long: sec !== "works" && sec !== "characters" };
  }

  function cards(pool) {
    var total = settings.length || pool.length;
    var queue = pool
      .map(function (it) {
        return { it: it, k: weight(it) * (0.5 + Math.random()) };
      })
      .sort(function (a, b) {
        return b.k - a.k;
      })
      .slice(0, total)
      .map(function (x) {
        return x.it;
      });
    var size = queue.length;
    var firstTry = 0;
    var seenOnce = {};
    var shown = 0;

    function show() {
      if (!queue.length) return done();
      var item = queue[0];
      var clueFirst = settings.cardsClueFirst;
      var clue = clueFirst ? clueFor(item) : null;
      var flipped = false;
      shown++;

      render(
        metaBar(
          ["card " + shown, queue.length + " left"],
          '<button type="button" class="text-action" data-act="dir" aria-pressed="' +
            !!clueFirst +
            '">' +
            (clueFirst ? "clue first" : "name first") +
            "</button>"
        ) +
          '<button type="button" class="flip" data-act="flip" aria-label="Flip card">' +
          '<span class="flip-label">' +
          (clue ? "who?" : "what do you know about them?") +
          "</span>" +
          (clue
            ? '<span class="flip-clue' + (clue.long ? " is-long" : "") + '">' + clue.html + "</span>"
            : '<span class="flip-name">' +
              esc(item.name) +
              '</span><span class="flip-sub">' +
              esc(deckId === "philosophers" ? "ideas, works, school, and life" : "works, movement, and life") +
              "</span>") +
          '<span class="flip-hint">click to flip <span class="kbd-hint">[space]</span></span>' +
          "</button>" +
          '<div class="flip-back" hidden></div>' +
          '<div class="d-actions card-grade" hidden>' +
          '<button type="button" class="text-action" data-act="again">again<span class="kbd-hint"> [1]</span></button>' +
          '<button type="button" class="text-action" data-act="got">got it<span class="kbd-hint"> [2]</span></button>' +
          "</div>",
        {
          flip: flip,
          again: function () {
            grade(false);
          },
          got: function () {
            grade(true);
          },
          dir: function () {
            settings.cardsClueFirst = !settings.cardsClueFirst;
            saveSettings();
            shown--;
            show();
          },
          menu: menu,
        },
        function (key) {
          if (!flipped && (key === " " || key === "Enter")) {
            flip();
            return true;
          }
          if (flipped && key === "1") {
            grade(false);
            return true;
          }
          if (flipped && key === "2") {
            grade(true);
            return true;
          }
        }
      );

      function flip() {
        if (flipped) return;
        flipped = true;
        var back = root.querySelector(".flip-back");
        back.innerHTML = profileHTML(item, clue && clue.focus);
        back.hidden = false;
        root.querySelector(".card-grade").hidden = false;
        var f = root.querySelector(".flip");
        f.classList.add("is-flipped");
        f.disabled = true;
        root.querySelector(".flip-hint").textContent = "";
      }

      function grade(ok) {
        record(item, ok);
        queue.shift();
        if (ok) {
          if (!seenOnce[item.id]) firstTry++;
        } else {
          queue.splice(Math.min(queue.length, 3 + rand(3)), 0, item);
        }
        seenOnce[item.id] = true;
        scrollTop();
        show();
      }
    }

    function done() {
      render(
        '<p class="end-score">' +
          firstTry +
          " <span>of</span> " +
          size +
          '</p><p class="d-small">known on the first try</p>' +
          '<div class="d-actions">' +
          '<button type="button" class="text-action" data-act="again">again<span class="kbd-hint"> [enter]</span></button>' +
          '<button type="button" class="text-action" data-act="menu">menu</button></div>',
        {
          again: function () {
            start("cards", pool);
          },
          menu: menu,
        },
        function (key) {
          if (key === "Enter") {
            start("cards", pool);
            return true;
          }
        }
      );
    }

    show();
  }

  /* ---------- match ---------- */

  function matchClue(item, used) {
    var sec = deck.matchClue;
    var opts = list(item[sec])
      .map(function (v, i) {
        return { text: sec === "ideas" ? v.term : v.title, i: i };
      })
      .filter(function (o) {
        return !used[o.text.toLowerCase()];
      });
    if (!opts.length) return null;
    var o = pick(opts);
    used[o.text.toLowerCase()] = true;
    return { text: o.text, focus: [sec, o.i] };
  }

  function match(pool) {
    var round = 0;
    var totalMistakes = 0;
    var rounds = settings.length ? Math.max(1, Math.round(settings.length / 6)) : 0;
    var timer = null;

    function play() {
      round++;
      var src = pool.length >= 6 ? pool : ALL;
      var picks = [];
      var used = {};
      var guard = 0;
      while (picks.length < Math.min(6, src.length) && guard++ < 200) {
        var it = weightedPick(src, weight);
        if (picks.some(function (p) { return p.item === it; })) continue;
        var clue = matchClue(it, used);
        if (!clue) continue;
        picks.push({ item: it, clue: clue });
      }
      var rights = picks.map(function (p, i) {
        return i;
      });
      rights = shuffle(rights);
      var sel = null;
      var mistakes = 0;
      var missedIn = {};
      var matched = 0;
      var t0 = Date.now();

      render(
        metaBar(
          [
            "round " + round + (rounds ? " of " + rounds : ""),
            '<span class="m-mistakes">mistakes 0</span>',
            '<span class="m-time">0:00</span>',
          ],
          rounds ? "" : '<button type="button" class="text-action" data-act="end">end</button>'
        ) +
          '<p class="q-label">' +
          esc(deck.matchLabel) +
          "</p>" +
          '<div class="m-grid"><div class="m-col">' +
          picks
            .map(function (p, i) {
              return '<button type="button" class="m-cell" data-act="pick" data-side="l" data-i="' + i + '">' + esc(p.item.name) + "</button>";
            })
            .join("") +
          '</div><div class="m-col">' +
          rights
            .map(function (i) {
              var text = picks[i].clue.text;
              var inner = deck.matchClue === "works" ? "<cite>" + esc(text) + "</cite>" : esc(text);
              return '<button type="button" class="m-cell" data-act="pick" data-side="r" data-i="' + i + '">' + inner + "</button>";
            })
            .join("") +
          "</div></div>" +
          '<div class="q-feedback" aria-live="polite"></div>',
        {
          pick: function (el) {
            var side = el.getAttribute("data-side");
            var i = Number(el.getAttribute("data-i"));
            if (!sel || sel.side === side) {
              root.querySelectorAll(".m-cell.is-sel").forEach(function (b) {
                b.classList.remove("is-sel");
              });
              if (sel && sel.side === side && sel.i === i) {
                sel = null;
                return;
              }
              sel = { side: side, i: i, el: el };
              el.classList.add("is-sel");
              return;
            }
            var a = sel;
            sel = null;
            a.el.classList.remove("is-sel");
            var leftI = side === "l" ? i : a.i;
            if (a.i === i) {
              matched++;
              record(picks[i].item, !missedIn[i]);
              [a.el, el].forEach(function (b) {
                b.classList.add("is-done");
                b.disabled = true;
              });
              if (matched === picks.length) finish();
            } else {
              mistakes++;
              totalMistakes++;
              missedIn[leftI] = true;
              root.querySelector(".m-mistakes").textContent = "mistakes " + mistakes;
              [a.el, el].forEach(function (b) {
                b.classList.remove("is-miss");
                void b.offsetWidth;
                b.classList.add("is-miss");
              });
            }
          },
          next: next,
          end: done,
          menu: menu,
        },
        function (key) {
          if (matched === picks.length && (key === "Enter" || key === " ")) {
            next();
            return true;
          }
        }
      );

      var timeEl = root.querySelector(".m-time");
      timer = setInterval(function () {
        timeEl.textContent = fmtTime(Date.now() - t0);
      }, 500);
      cleanup = function () {
        clearInterval(timer);
      };

      function finish() {
        clearInterval(timer);
        var last = rounds && round >= rounds;
        root.querySelector(".q-feedback").innerHTML =
          '<p class="q-verdict ' +
          (mistakes ? "" : "is-right") +
          '">' +
          (mistakes ? "done in " : "clean, in ") +
          fmtTime(Date.now() - t0) +
          "</p>" +
          picks
            .map(function (p) {
              return (
                '<details class="d-entry"><summary>' +
                summaryHTML(p.item) +
                "</summary>" +
                profileHTML(p.item, p.clue.focus) +
                "</details>"
              );
            })
            .join("") +
          '<button type="button" class="text-action d-next" data-act="next">' +
          (last ? "results" : "next round") +
          '<span class="kbd-hint"> [enter]</span></button>';
      }
    }

    function next() {
      if (rounds && round >= rounds) return done();
      scrollTop();
      play();
    }

    function done() {
      render(
        '<p class="end-score">' +
          totalMistakes +
          ' <span>' +
          (totalMistakes === 1 ? "mistake" : "mistakes") +
          "</span></p>" +
          '<p class="d-small">' +
          round +
          (round === 1 ? " round" : " rounds") +
          "</p>" +
          '<div class="d-actions">' +
          '<button type="button" class="text-action" data-act="again">again<span class="kbd-hint"> [enter]</span></button>' +
          '<button type="button" class="text-action" data-act="menu">menu</button></div>',
        {
          again: function () {
            start("match", pool);
          },
          menu: menu,
        },
        function (key) {
          if (key === "Enter") {
            start("match", pool);
            return true;
          }
        }
      );
    }

    play();
  }

  /* ---------- order ---------- */

  function order(pool) {
    var round = 0;
    var score = 0;
    var possible = 0;
    var rounds = settings.length ? Math.max(1, Math.round(settings.length / 5)) : 0;

    function choose() {
      var gapFor = [25, 10, 3];
      for (var g = 0; g < gapFor.length; g++) {
        for (var tries = 0; tries < 20; tries++) {
          var picks = [];
          var src = shuffle(pool.length >= 5 ? pool : ALL);
          var first = weightedPick(src, weight);
          picks.push(first);
          for (var i = 0; i < src.length && picks.length < 5; i++) {
            var c = src[i];
            var clear = picks.every(function (p) {
              return p !== c && Math.abs(p.born - c.born) >= gapFor[g];
            });
            if (clear) picks.push(c);
          }
          if (picks.length === 5) return picks;
        }
      }
      return shuffle(ALL).slice(0, 5);
    }

    function play() {
      round++;
      var items = shuffle(choose());
      var placed = [];
      var checked = false;

      function draw() {
        var correct = items.slice().sort(function (a, b) {
          return a.born - b.born;
        });
        var slots = "";
        for (var s = 0; s < items.length; s++) {
          var it = placed[s];
          if (!it) {
            slots += '<li class="o-slot is-empty"><span class="opt-key">' + (s + 1) + "</span></li>";
            continue;
          }
          var cls = checked ? (correct[s] === it ? " is-right" : " is-wrong") : "";
          slots +=
            '<li class="o-slot' +
            cls +
            '"><button type="button" class="o-placed" data-act="unplace" data-s="' +
            s +
            '"' +
            (checked ? " disabled" : "") +
            '><span class="opt-key">' +
            (s + 1) +
            '</span><span class="opt-body"><span class="opt-text">' +
            esc(it.name) +
            '</span><span class="opt-note">' +
            (checked ? esc(it.dates || "") : "") +
            "</span></span></button></li>";
        }
        var left = items.filter(function (it) {
          return placed.indexOf(it) === -1;
        });
        var feedback = "";
        if (checked) {
          var right = placed.filter(function (it, s) {
            return correct[s] === it;
          }).length;
          feedback =
            '<p class="q-verdict ' +
            (right === items.length ? "is-right" : "") +
            '">' +
            right +
            " of " +
            items.length +
            " in place</p>" +
            (right < items.length
              ? '<ol class="o-answer">' +
                correct
                  .map(function (it) {
                    return "<li><span>" + esc(it.name) + '</span> <span class="opt-note">' + esc(it.dates || "") + "</span></li>";
                  })
                  .join("") +
                "</ol>"
              : "") +
            '<button type="button" class="text-action d-next" data-act="next">' +
            (rounds && round >= rounds ? "results" : "next") +
            '<span class="kbd-hint"> [enter]</span></button>';
        }
        render(
          metaBar(
            ["round " + round + (rounds ? " of " + rounds : ""), "score " + score + "/" + possible],
            rounds ? "" : '<button type="button" class="text-action" data-act="end">end</button>'
          ) +
            '<p class="q-label">earliest born first</p>' +
            '<ol class="o-slots">' +
            slots +
            "</ol>" +
            (left.length
              ? '<div class="o-pool">' +
                left
                  .map(function (it) {
                    return (
                      '<button type="button" class="opt" data-act="place" data-id="' +
                      esc(it.id) +
                      '"><span class="opt-key">' +
                      String.fromCharCode(97 + items.indexOf(it)) +
                      '</span><span class="opt-body"><span class="opt-text">' +
                      esc(it.name) +
                      '</span><span class="opt-note">' +
                      esc(it.tag || "") +
                      "</span></span></button>"
                    );
                  })
                  .join("") +
                '</div><p class="d-small">click a placed name to take it back</p>'
              : "") +
            '<div class="q-feedback" aria-live="polite">' +
            feedback +
            "</div>",
          {
            place: function (el) {
              place(el.getAttribute("data-id"));
            },
            unplace: function (el) {
              if (checked) return;
              placed.splice(Number(el.getAttribute("data-s")));
              draw();
            },
            next: next,
            end: done,
            menu: menu,
          },
          function (key) {
            if (checked) {
              if (key === "Enter" || key === " ") {
                next();
                return true;
              }
              return;
            }
            var idx = key.length === 1 ? key.charCodeAt(0) - 97 : -1;
            if (idx >= 0 && idx < items.length && placed.indexOf(items[idx]) === -1) {
              place(items[idx].id);
              return true;
            }
            if (key === "Backspace" && placed.length) {
              placed.pop();
              draw();
              return true;
            }
          }
        );
      }

      function place(id) {
        var it = items.filter(function (x) {
          return x.id === id;
        })[0];
        if (!it || placed.indexOf(it) !== -1) return;
        placed.push(it);
        if (placed.length === items.length) {
          checked = true;
          var correct = items.slice().sort(function (a, b) {
            return a.born - b.born;
          });
          placed.forEach(function (p, s) {
            var ok = correct[s] === p;
            record(p, ok);
            if (ok) score++;
          });
          possible += items.length;
        }
        draw();
      }

      draw();
    }

    function next() {
      if (rounds && round >= rounds) return done();
      play();
    }

    function done() {
      render(
        '<p class="end-score">' +
          score +
          " <span>of</span> " +
          possible +
          '</p><p class="d-small">in the right place</p>' +
          '<div class="d-actions">' +
          '<button type="button" class="text-action" data-act="again">again<span class="kbd-hint"> [enter]</span></button>' +
          '<button type="button" class="text-action" data-act="menu">menu</button></div>',
        {
          again: function () {
            start("order", pool);
          },
          menu: menu,
        },
        function (key) {
          if (key === "Enter") {
            start("order", pool);
            return true;
          }
        }
      );
    }

    play();
  }

  /* ---------- browse ---------- */

  function haystack(it) {
    if (!it._hay) {
      var parts = [it.name, it.dates, it.place, it.tag, it.blurb];
      deck.sections.forEach(function (sec) {
        list(it[sec]).forEach(function (v) {
          if (typeof v === "string") parts.push(v);
          else
            Object.keys(v).forEach(function (k) {
              parts.push(v[k]);
            });
        });
      });
      it._hay = parts
        .join(" ")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
    }
    return it._hay;
  }

  function browse() {
    render(
      metaBar([ALL.length + " " + deck.plural]) +
        '<label class="sr-only" for="browse-q">Search</label>' +
        '<input type="search" id="browse-q" class="d-search" placeholder="search names, ' +
        (deckId === "philosophers" ? "ideas, and works" : "works, and characters") +
        '" autocomplete="off" />' +
        '<div id="browse-list"></div>',
      { menu: menu },
      function (key) {
        if (key === "/") {
          root.querySelector("#browse-q").focus();
          return true;
        }
      }
    );
    var input = root.querySelector("#browse-q");
    var out = root.querySelector("#browse-list");

    function draw() {
      var q = input.value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
      var words = q ? q.split(/\s+/) : [];
      var html = "";
      deck.groups.forEach(function (g) {
        var items = ALL.filter(function (it) {
          if (it.group !== g[0]) return false;
          var h = haystack(it);
          return words.every(function (w) {
            return h.indexOf(w) !== -1;
          });
        }).sort(function (a, b) {
          return a.born - b.born;
        });
        if (!items.length) return;
        html +=
          '<div class="d-sec"><h2 class="d-h">' +
          esc(g[1]) +
          ' <span class="chip-n">' +
          items.length +
          "</span></h2>" +
          items
            .map(function (it) {
              return (
                '<details class="d-entry"' +
                (words.length && items.length <= 3 ? " open" : "") +
                "><summary>" +
                summaryHTML(it) +
                "</summary>" +
                profileHTML(it) +
                "</details>"
              );
            })
            .join("") +
          "</div>";
      });
      out.innerHTML = html || '<p class="d-small">nothing matches</p>';
    }

    input.addEventListener("input", draw);
    draw();
  }

  menu();
})();

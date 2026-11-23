// The interface around the map: which world to show, the panel, search, the rail, the footer strip, and on a
// phone the bottom sheet and tab bar.
(function () {
  "use strict";
  var PM = window.PortfolioMap;
  var $ = PM.$, $$ = PM.$$, store = PM.store, ROOT = PM.ROOT, clamp = PM.clamp;
  var WORLD_KEY = "portfolio-map-world";
  var SAVED_KEY = "portfolio-map-saved";
  var RAIL = 72, PANEL = 408, STRIP = 24;
  var phoneQuery = window.matchMedia("(max-width: 759px)");
  // How to reach Noah, from the portfolio's contact section.
  var RESUME = "/portfolio/Lee_Noah_Resume.pdf";
  var CONTACT = {
    question: "Want to build something together?",
    email: "noahlee519@gmail.com",
    links: [
      { label: "LinkedIn", url: "https://www.linkedin.com/in/noahdlee/" },
      { label: "Instagram", url: "https://www.instagram.com/noahdarwinlee/" }
    ]
  };
  var reduceMotion = PM.reduceMotion;

  var params = new URLSearchParams(location.search);
  var state = {
    projects: [], byId: {}, worlds: [], entry: null, world: null, map: null,
    view: null, project: null, province: null, panelOpen: true, sheet: "peek",
    saved: [], shapes: {}
  };
  var els = {
    body: document.body, panel: $("#panel"), panelBody: $("#panel-body"), panelScroll: $("#panel-scroll"),
    tab: $("#panel-tab"), grip: $(".sheet-grip"), search: $("#search"), input: $("#search-input"),
    list: $("#search-list"), clear: $(".search-clear"), go: $(".search-go"), me: $(".search-me"),
    toast: $("#toast"), strip: $("#strip"), worldName: $(".strip-world-name"), fab: $("#fab-world"),
    dialog: $("#feedback-dialog")
  };

  // ------------------------------------------------------------------ small things

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function icon(id, cls) { return '<svg class="ic' + (cls ? " " + cls : "") + '" aria-hidden="true"><use href="#' + id + '" /></svg>'; }
  function isPhone() { return phoneQuery.matches; }
  function external(url) { return /^https?:/.test(url) && url.indexOf(location.origin) !== 0; }
  function linkAttrs(url) { return 'href="' + esc(url) + '"' + (external(url) || /\.pdf$/.test(url) ? ' target="_blank" rel="noopener noreferrer"' : ""); }
  function list(items) {
    if (items.length < 2) return items.join("");
    if (items.length === 2) return items[0] + " and " + items[1];
    return items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
  }
  function fmtKm(n) {
    var p = Math.pow(10, Math.max(0, Math.floor(Math.log10(n)) - 2));
    return (Math.round(n / p) * p).toLocaleString("en-US");
  }

  var toastTimer = 0;
  function toast(text) {
    els.toast.textContent = text;
    els.toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove("is-on"); }, 2200);
  }

  // Hearts: kept in the browser where it allows, and for the visit where it doesn't.
  function loadSaved() {
    try { var v = JSON.parse(store.get(SAVED_KEY) || "[]"); if (Array.isArray(v)) return v; } catch (e) {}
    return [];
  }
  function isSaved(id) { return state.saved.indexOf(id) >= 0; }
  function toggleSaved(id) {
    var i = state.saved.indexOf(id);
    if (i >= 0) state.saved.splice(i, 1); else state.saved.unshift(id);
    store.set(SAVED_KEY, JSON.stringify(state.saved));
    updateCount();
    return i < 0;
  }
  function updateCount() {
    $$(".rail-count").forEach(function (b) {
      b.hidden = !state.saved.length;
      b.textContent = state.saved.length;
    });
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(fallback);
    return Promise.resolve(fallback());
    function fallback() {
      var t = document.createElement("textarea");
      t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); } catch (e) {}
      t.remove();
    }
  }

  function shareUrl(id, province) {
    var q = "?world=" + encodeURIComponent(state.world.slug) + "&project=" + encodeURIComponent(id) + (province ? "&province=" + encodeURIComponent(province) : "");
    return location.origin + ROOT + q;
  }
  function syncUrl() {
    var q = state.view === "project" && state.project ? "?world=" + state.world.slug + "&project=" + state.project + (state.province ? "&province=" + state.province : "") : "";
    try { history.replaceState(null, "", ROOT + q); } catch (e) {}
  }

  // ------------------------------------------------------------------ countries as little maps

  // Each country's shape as a symbol, for search results, lists, and the panel's locator.
  function buildShapes() {
    var sprite = $("#country-sprite");
    if (!sprite) {
      sprite = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      sprite.id = "country-sprite"; sprite.setAttribute("width", "0"); sprite.setAttribute("height", "0");
      sprite.setAttribute("aria-hidden", "true"); sprite.classList.add("sprite");
      document.body.appendChild(sprite);
    }
    var html = "";
    state.shapes = {};
    state.world.projects.forEach(function (p) {
      var sh = state.map.shapes[p.id];
      var b = state.map.focusBox(sh.shape), side = Math.max(b.w, b.h) * 1.18 + 4;
      var vb = [b.x + b.w / 2 - side / 2, b.y + b.h / 2 - side / 2, side, side].map(function (n) { return n.toFixed(1); }).join(" ");
      state.shapes[p.id] = { box: b, vb: vb, area: sh.shape.area };
      html += '<symbol id="c-' + p.id + '" viewBox="' + vb + '"><path d="' + p.path + '" vector-effect="non-scaling-stroke" /></symbol>';
    });
    sprite.innerHTML = html;
  }
  function glyph(id) {
    return '<span class="glyph" aria-hidden="true"><svg><use href="#c-' + id + '" /></svg></span>';
  }

  // The world with one country picked out, as an atlas's locator map.
  function locator(id, province) {
    var w = state.world, P = w.palette;
    var proj = w.projects.filter(function (p) { return p.id === id; })[0];
    var prov = province && proj.provinces ? proj.provinces.filter(function (v) { return v.id === province; })[0] : null;
    return '<svg class="locator" viewBox="0 0 ' + w.width + " " + w.height + '" aria-hidden="true" preserveAspectRatio="xMidYMid meet">' +
      '<rect width="' + w.width + '" height="' + w.height + '" fill="' + P.water + '" />' +
      '<path d="' + w.coast + '" fill="#f4f6f2" stroke="' + P.line + '" stroke-width="2" />' +
      '<path d="' + proj.path + '" fill="' + (prov ? "#f6c592" : "#e68019") + '" />' +
      (prov ? '<path d="' + prov.path + '" fill="#e68019" />' : "") +
      "</svg>";
  }

  // A country with no screenshots is shown as its own piece of the map: its land, its neighbours, and its seas.
  function terrain(id) {
    var w = state.world, P = w.palette, sh = state.shapes[id], b = sh.box;
    var pad = Math.max(b.w, b.h) * 0.35 + 12, ratio = 16 / 10;
    var vw = Math.max(b.w + pad * 2, (b.h + pad * 2) * ratio), vh = vw / ratio;
    // Framed a little low, clear of the search box that floats over the top of the panel.
    var x = b.x + b.w / 2 - vw / 2, y = b.y + b.h / 2 - vh * (isPhone() ? 0.5 : 0.62);
    var proj = w.projects.filter(function (p) { return p.id === id; })[0];
    var px = vw / 408;
    return '<svg class="terrain" viewBox="' + [x, y, vw, vh].map(function (n) { return n.toFixed(1); }).join(" ") + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<rect x="' + (x - 10) + '" y="' + (y - 10) + '" width="' + (vw + 20) + '" height="' + (vh + 20) + '" fill="' + P.water + '" />' +
      '<image href="' + ROOT + "worlds/" + w.image.src + '" width="' + w.width + '" height="' + w.height + '" preserveAspectRatio="none" />' +
      '<path d="M-4800 -2400H6400V3200H-4800Z' + w.coast + '" fill="' + P.water + '" fill-rule="evenodd" />' +
      (w.lakes ? '<path d="' + w.lakes + '" fill="' + P.water + '" />' : "") +
      '<path d="' + w.coast + '" fill="none" stroke="' + P.line + '" stroke-width="' + (0.8 * px).toFixed(2) + '" />' +
      '<path d="M-4800 -2400H6400V3200H-4800Z' + proj.path + '" fill="#ffffff" fill-opacity="0.28" fill-rule="evenodd" />' +
      '<path d="' + w.borders + '" fill="none" stroke="' + P.border + '" stroke-width="' + (1 * px).toFixed(2) + '" />' +
      '<path d="' + proj.path + '" fill="#e68019" fill-opacity="0.14" stroke="#b85d06" stroke-width="' + (1.75 * px).toFixed(2) + '" stroke-linejoin="round" />' +
      "</svg>";
  }

  function capitalOf(id) {
    var l = state.world.labels.filter(function (x) { return x.kind === "capital" && x.of === id; })[0];
    return l ? l.text : null;
  }
  function watersOf(p) {
    var words = [].concat(p.names.water || [], p.names.river || [], p.names.lake || []);
    var kinds = { ocean: 0, sea: 1, strait: 2, lake: 3, river: 4 };
    return state.world.labels.filter(function (l) {
      return l.kind in kinds && words.some(function (w) { return new RegExp("(^|\\s)" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\s|$)").test(l.text); });
    }).sort(function (a, b) { return kinds[a.kind] - kinds[b.kind]; }).map(function (l) { return l.text; });
  }

  // ------------------------------------------------------------------ the panel's views

  function mediaBlock(media, label, id) {
    if (!media || !media.length) {
      return '<div class="hero hero-terrain">' + terrain(id) + "</div>";
    }
    var slides = media.map(function (m, i) {
      var inner;
      if (m.video) {
        inner = '<video src="' + esc(m.video) + '" poster="' + esc(m.poster) + '" muted loop playsinline preload="none" aria-label="' + esc(m.alt) + '"></video>';
      } else {
        inner = '<img src="' + esc(m.src) + '"' + (m.srcset ? ' srcset="' + esc(m.srcset) + '" sizes="(max-width: 759px) 100vw, 408px"' : "") +
          ' alt="' + esc(m.alt) + '" decoding="async"' + (i ? ' loading="lazy"' : ' fetchpriority="high"') + " />";
      }
      return '<figure class="slide" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + " of " + media.length + '" data-cap="' + esc(m.caption || "") + '">' + inner + "</figure>";
    }).join("");
    var many = media.length > 1;
    return '<section class="hero' + (many ? " is-many" : "") + '" aria-roledescription="carousel" aria-label="' + esc(label) + '">' +
      '<div class="track" tabindex="0" aria-label="' + esc(label) + (many ? "; use the arrow keys to move between them" : "") + '">' + slides + "</div>" +
      (many ? '<button class="hero-arrow hero-prev" type="button" aria-label="Previous picture" disabled>' + icon("i-left") + "</button>" +
        '<button class="hero-arrow hero-next" type="button" aria-label="Next picture">' + icon("i-right") + "</button>" +
        '<span class="hero-count" aria-live="polite">1 / ' + media.length + "</span>" : "") +
      "</section>" +
      '<p class="caption">' + esc(media[0].caption || "") + "</p>";
  }

  function actions(p, province) {
    var saved = isSaved(p.id);
    return '<div class="actions">' +
      '<a class="action action-visit" ' + linkAttrs(p.url) + '><span class="action-dot">' + icon("i-visit") + "</span><span>Visit</span></a>" +
      '<button class="action action-save' + (saved ? " is-on" : "") + '" type="button" aria-pressed="' + saved + '" data-save="' + p.id + '"><span class="action-dot">' + icon("i-heart") + '</span><span class="action-save-text">' + (saved ? "Saved" : "Save") + "</span></button>" +
      '<button class="action action-share" type="button" data-share="' + p.id + '"' + (province ? ' data-province="' + province + '"' : "") + '><span class="action-dot">' + icon("i-link") + "</span><span>Share</span></button>" +
      "</div>";
  }

  function viewProject(id, province) {
    var p = state.byId[id];
    var prov = province && p.provinces ? p.provinces.filter(function (v) { return v.id === province; })[0] : null;
    var cap = capitalOf(id), sh = state.shapes[id];
    var area = sh ? fmtKm(sh.area * Math.pow(state.world.scale.kmPerUnit, 2)) : null;
    var waters = watersOf(p);
    var h = "";
    var media = prov ? prov.media : p.media;
    h += mediaBlock(media, "Pictures of " + (prov ? prov.name : p.name), id);
    h += '<header class="head">';
    if (prov) h += '<button class="crumb" type="button" data-open="' + id + '">' + icon("i-left") + "<span>" + esc(p.name) + "</span></button>";
    h += '<h2 class="title" tabindex="-1">' + esc(prov ? prov.name : p.name) + "</h2>";
    h += '<p class="sub">' + (prov ? "A province of " + esc(p.name) : '<a class="domain" ' + linkAttrs(p.url) + ">" + esc(p.domain) + "</a>") + "</p>";
    h += "</header>";
    h += actions(p, province);
    h += '<div class="prose"><p>' + esc(prov ? prov.blurb : p.blurb) + "</p></div>";
    if (p.provinces && !prov) {
      h += '<section class="block"><h3 class="block-title">Provinces</h3><ul class="rows">' + p.provinces.map(function (v) {
        return '<li><button class="row" type="button" data-open="' + id + '" data-province="' + v.id + '">' +
          '<img class="row-thumb" src="' + esc(v.media[0].src) + '" alt="" loading="lazy" decoding="async" />' +
          '<span class="row-text"><b>' + esc(v.name) + "</b><span>" + esc(v.blurb) + "</span></span>" + icon("i-right", "row-go") + "</button></li>";
      }).join("") + "</ul></section>";
    }
    if (!prov) (p.sections || []).forEach(function (s) {
      h += '<section class="block"><h3 class="block-title">' + esc(s.title) + "</h3>" + s.paragraphs.map(function (x) { return "<p>" + esc(x) + "</p>"; }).join("") +
        (s.chips ? '<ul class="chips">' + s.chips.map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("") + "</ul>" : "") + "</section>";
    });
    if (!prov && p.uses && p.uses.length) {
      h += '<details class="block uses"><summary class="block-title">Who it’s for' + icon("i-right", "uses-chevron") + "</summary>" + p.uses.map(function (u) {
        return "<h4>" + esc(u.title) + "</h4><ul>" + u.items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
      }).join("") + "</details>";
    }
    // The atlas entry: where the country lies, its capital, its size, and the waters named in its words.
    h += '<section class="block atlas"><h3 class="block-title">In the atlas</h3><div class="atlas-grid">' + locator(id, province) + '<dl class="facts">';
    if (cap) h += "<div><dt>Capital</dt><dd>" + esc(cap) + "</dd></div>";
    if (area) h += "<div><dt>Area</dt><dd>" + area + " km²</dd></div>";
    if (p.provinces) h += "<div><dt>Provinces</dt><dd>" + p.provinces.length + "</dd></div>";
    h += '<div><dt>World</dt><dd><button class="link-btn" type="button" data-next-world>' + esc(state.world.name) + "</button></dd></div>";
    h += "</dl></div>";
    if (waters.length) h += '<p class="waters">Waters named for it: ' + esc(list(waters)) + "</p>";
    h += "</section>";
    return h;
  }

  function rowFor(p) {
    return '<li><button class="row" type="button" data-open="' + p.id + '">' + glyph(p.id) +
      '<span class="row-text"><b>' + esc(p.name) + "</b><span>" + esc(p.domain) + "</span></span>" +
      (isSaved(p.id) ? '<span class="row-heart" aria-label="Saved">' + icon("i-heart") + "</span>" : "") + "</button></li>";
  }

  // On a phone, the sheet at rest names the world; raised, it lists the world's countries.
  function viewWorld() {
    var n = state.world.projects.length, h = "";
    h += '<header class="head head-world"><h2 class="title" tabindex="-1">' + esc(state.world.name) + "</h2>";
    h += '<p class="sub">A world of ' + n + " countries, each one of my projects</p></header>";
    var flag = state.projects.filter(function (p) { return p.tier === "flagship"; });
    var small = state.projects.filter(function (p) { return p.tier !== "flagship"; });
    h += '<section class="block block-first"><h3 class="block-title">The large countries</h3><ul class="rows">' + flag.map(rowFor).join("") + "</ul></section>";
    h += '<section class="block"><h3 class="block-title">Islands and small states</h3><ul class="rows">' + small.map(rowFor).join("") + "</ul></section>";
    return h;
  }

  function contactBlock() {
    var c = CONTACT;
    return '<section class="block contact" id="contact-block"><h3 class="block-title">' + esc(c.question) + "</h3>" +
      '<a class="mail" href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a>" +
      '<div class="contact-row"><button class="btn btn-quiet" type="button" data-copy="' + esc(c.email) + '">' + icon("i-copy") + "<span>Copy address</span></button>" +
      '<a class="btn btn-quiet" ' + linkAttrs(RESUME) + ">" + icon("i-resume") + "<span>Resume</span></a></div>" +
      '<p class="contact-links">' + c.links.map(function (l) { return "<a " + linkAttrs(l.url) + ">" + esc(l.label) + "</a>"; }).join('<i class="sep" aria-hidden="true">|</i>') + "</p></section>";
  }

  function viewSaved() {
    var h = '<header class="head head-plain"><h2 class="title" tabindex="-1">Saved</h2><p class="sub">Projects you’ve hearted, kept in this browser</p></header>';
    var items = state.saved.map(function (id) { return state.byId[id]; }).filter(Boolean);
    if (!items.length) {
      h += '<div class="empty">' + icon("i-heart", "empty-heart") + "<p>Nothing saved yet. Open a country and press Save to keep it here.</p></div>";
    } else h += '<ul class="rows rows-saved">' + items.map(rowFor).join("") + "</ul>";
    return h;
  }

  function viewContact() {
    return '<header class="head head-plain"><h2 class="title" tabindex="-1">Contact</h2><p class="sub">Email is the best way to reach me</p></header>' + contactBlock();
  }

  // ------------------------------------------------------------------ opening and closing

  function open(view, opts) {
    opts = opts || {};
    state.view = view;
    var id = opts.id, province = opts.province || null;
    if (view === "project") {
      state.project = id; state.province = province;
    } else {
      state.project = null; state.province = null;
    }
    var html = view === "project" ? viewProject(id, province) : view === "world" ? viewWorld() : view === "saved" ? viewSaved() : view === "contact" ? viewContact() : "";
    stopVideos();
    els.panelBody.innerHTML = html;
    var head = $(".head", els.panelBody);
    if (head) head.insertAdjacentHTML("afterend", peekLinks());
    els.panel.setAttribute("data-view", view || "none");
    els.panel.setAttribute("aria-label", view === "project" ? (province ? state.byId[id].provinces.filter(function (v) { return v.id === province; })[0].name : state.byId[id].name) : view === "world" ? state.world.name : view === "saved" ? "Saved" : view === "contact" ? "Contact" : "Details");
    els.panelScroll.scrollTop = 0;
    bindPanel();
    renderPeek();
    if (view) showPanel(true, opts.sheet);
    updateRail();
    updateSearchBox();
    syncUrl();
    if (view === "project") state.map.select(id, province, { fly: opts.fly !== false, instant: opts.instant });
    else if (state.map.selected) state.map.select(null);
    if (opts.focus) {
      var t = $(".title", els.panelBody);
      if (t) t.focus({ preventScroll: true });
    }
  }

  function close() {
    state.view = null; state.project = null; state.province = null;
    stopVideos();
    if (state.map.selected) state.map.select(null);
    if (!isPhone()) showPanel(false);
    els.panel.setAttribute("data-view", "none");
    updateRail(); updateSearchBox(); syncUrl();
    if (isPhone()) open("world", { sheet: "peek" });
  }

  function showPanel(on, sheet) {
    state.panelOpen = on;
    els.body.classList.toggle("is-panel", on);
    els.tab.setAttribute("aria-expanded", String(on));
    els.tab.setAttribute("aria-label", on ? "Collapse the side panel" : "Expand the side panel");
    if (isPhone()) setSheet(on ? sheet || (state.sheet === "peek" ? "half" : state.sheet) : "peek");
    insets();
  }

  function updateRail() {
    var v = state.view;
    $$(".rail-btn[data-view]").forEach(function (b) {
      var name = b.getAttribute("data-view"), on;
      if (isPhone()) on = name === "explore" ? (v === "project" || v === "world" || state.sheet === "peek") : name === "saved" ? v === "saved" && state.sheet !== "peek" : false;
      else on = name === v && state.panelOpen;
      b.classList.toggle("is-on", !!on);
      if (b.tagName === "BUTTON") b.setAttribute("aria-pressed", String(!!on));
    });
  }

  function updateSearchBox() {
    var p = state.view === "project" ? state.byId[state.project] : null;
    if (document.activeElement !== els.input) {
      var prov = p && state.province ? p.provinces.filter(function (v) { return v.id === state.province; })[0] : null;
      els.input.value = p ? (prov ? prov.name : p.name) : "";
    }
    var closeable = !!state.view && state.view !== "world" && (state.panelOpen || state.view === "project");
    els.clear.hidden = !closeable;
    els.go.hidden = closeable;
    els.search.classList.toggle("has-value", !!els.input.value);
  }

  // On a phone the footer strip's links sit under the sheet's heading, so they show when the sheet is down.
  function peekLinks() {
    return '<p class="peek-links">Map: <button class="link-btn" type="button" data-next-world>' + esc(state.world.name) + '</button><i class="sep" aria-hidden="true">|</i><a href="/terms/">Terms</a><i class="sep" aria-hidden="true">|</i><a href="/privacy/">Privacy</a><i class="sep" aria-hidden="true">|</i><button class="link-btn" type="button" data-feedback>Site feedback</button></p>';
  }
  function renderPeek() {
    var p = $(".peek-links", els.panelBody);
    if (p) p.outerHTML = peekLinks();
  }

  // ------------------------------------------------------------------ the panel's controls

  function bindPanel() {
    var hero = $(".hero.is-many", els.panelBody) || $(".hero:not(.hero-terrain)", els.panelBody);
    if (hero) carousel(hero);
  }

  function carousel(hero) {
    var track = $(".track", hero), slides = $$(".slide", hero), prev = $(".hero-prev", hero), next = $(".hero-next", hero);
    var count = $(".hero-count", hero), cap = hero.nextElementSibling;
    var at = 0;
    function go(i, smooth) {
      i = clamp(i, 0, slides.length - 1);
      track.scrollTo({ left: i * track.clientWidth, behavior: smooth && !reduceMotion.matches ? "smooth" : "auto" });
    }
    function update() {
      var i = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
      if (i === at && hero.dataset.ready) return;
      hero.dataset.ready = "1";
      at = i;
      if (prev) prev.disabled = i <= 0;
      if (next) next.disabled = i >= slides.length - 1;
      if (count) count.textContent = i + 1 + " / " + slides.length;
      if (cap && cap.classList.contains("caption")) cap.textContent = slides[i].getAttribute("data-cap") || "";
      slides.forEach(function (s, k) {
        var v = $("video", s);
        if (!v) return;
        if (k === i && !reduceMotion.matches) { v.preload = "auto"; var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
        else v.pause();
      });
    }
    var raf = 0;
    track.addEventListener("scroll", function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
    if (prev) prev.addEventListener("click", function () { go(at - 1, true); });
    if (next) next.addEventListener("click", function () { go(at + 1, true); });
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); go(at + 1, true); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(at - 1, true); }
    });
    update();
  }

  function stopVideos() { $$("video", els.panelBody).forEach(function (v) { v.pause(); }); }

  // One listener for everything clickable in the panel, the peek, and the strip.
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-open],[data-save],[data-share],[data-copy],[data-next-world],[data-feedback],[data-close]");
    if (!t) return;
    if (t.hasAttribute("data-open")) {
      open("project", { id: t.getAttribute("data-open"), province: t.getAttribute("data-province"), focus: e.detail === 0 });
    } else if (t.hasAttribute("data-save")) {
      var on = toggleSaved(t.getAttribute("data-save"));
      t.classList.toggle("is-on", on);
      t.setAttribute("aria-pressed", String(on));
      $(".action-save-text", t).textContent = on ? "Saved" : "Save";
      if (on && !reduceMotion.matches) { t.classList.remove("is-pop"); void t.offsetWidth; t.classList.add("is-pop"); }
      toast(on ? "Saved to your list" : "Removed from your list");
    } else if (t.hasAttribute("data-share")) {
      copy(shareUrl(t.getAttribute("data-share"), t.getAttribute("data-province"))).then(function () { toast("Link copied"); });
    } else if (t.hasAttribute("data-copy")) {
      copy(t.getAttribute("data-copy")).then(function () { toast("Address copied"); });
    } else if (t.hasAttribute("data-next-world")) {
      nextWorld();
    } else if (t.hasAttribute("data-feedback")) {
      openFeedback();
    } else if (t.hasAttribute("data-close")) {
      if (els.dialog.open) els.dialog.close();
    }
  });

  // ------------------------------------------------------------------ search

  var results = [], active = -1;
  function searchFor(q) {
    q = q.trim().toLowerCase();
    var out = [];
    state.projects.forEach(function (p) {
      var hay = (p.name + " " + p.domain).toLowerCase();
      var score = !q ? 0 : p.name.toLowerCase().indexOf(q) === 0 ? 0 : hay.indexOf(q) >= 0 ? 1 : -1;
      if (score >= 0) out.push({ p: p, score: score, rank: p.tier === "flagship" ? p.rank : 20 });
      (p.provinces || []).forEach(function (v) {
        if (!q) return;
        var s = v.name.toLowerCase().indexOf(q) === 0 ? 0 : v.name.toLowerCase().indexOf(q) >= 0 ? 1 : -1;
        if (s >= 0) out.push({ p: p, v: v, score: s, rank: p.rank || 20 });
      });
    });
    return out.sort(function (a, b) { return a.score - b.score || a.rank - b.rank; });
  }
  function showResults() {
    var q = els.input.value;
    results = searchFor(q);
    active = q.trim() && results.length ? 0 : -1;
    if (!results.length) {
      els.list.innerHTML = '<li class="search-none" role="presentation">No project by that name. Try another word, or browse the map.</li>';
    } else {
      els.list.innerHTML = results.map(function (r, i) {
        var sub = r.v ? "Province of " + r.p.name : (r.p.tier === "flagship" ? "Country" : "Small state") + " | " + r.p.domain;
        return '<li role="option" id="opt-' + i + '" class="search-opt" aria-selected="' + (i === active) + '" data-i="' + i + '">' + glyph(r.p.id) +
          '<span class="row-text"><b>' + esc(r.v ? r.v.name : r.p.name) + "</b><span>" + esc(sub) + "</span></span></li>";
      }).join("");
    }
    els.list.hidden = false;
    els.input.setAttribute("aria-expanded", "true");
    els.search.classList.add("is-listing");
    els.input.setAttribute("aria-activedescendant", active >= 0 ? "opt-" + active : "");
  }
  function hideResults() {
    els.list.hidden = true;
    els.input.setAttribute("aria-expanded", "false");
    els.input.removeAttribute("aria-activedescendant");
    els.search.classList.remove("is-listing");
  }
  function choose(i) {
    var r = results[i];
    if (!r) return;
    hideResults();
    els.input.blur();
    open("project", { id: r.p.id, province: r.v ? r.v.id : null });
  }
  els.input.addEventListener("focus", function () { els.input.select(); showResults(); });
  els.input.addEventListener("input", function () { showResults(); els.search.classList.toggle("has-value", !!els.input.value); });
  els.input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (els.list.hidden) showResults();
      if (!results.length) return;
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length;
      $$(".search-opt", els.list).forEach(function (o, k) { o.setAttribute("aria-selected", String(k === active)); });
      var cur = $("#opt-" + active);
      els.input.setAttribute("aria-activedescendant", "opt-" + active);
      if (cur) cur.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(active >= 0 ? active : 0);
    } else if (e.key === "Escape") {
      e.preventDefault(); e.stopPropagation();
      hideResults(); updateSearchBox(); els.input.blur();
    }
  });
  els.list.addEventListener("pointerdown", function (e) { e.preventDefault(); });
  els.list.addEventListener("click", function (e) {
    var o = e.target.closest(".search-opt");
    if (o) choose(+o.getAttribute("data-i"));
  });
  els.input.addEventListener("blur", function () { setTimeout(function () { if (document.activeElement !== els.input) { hideResults(); updateSearchBox(); } }, 120); });
  els.go.addEventListener("click", function () { els.input.focus(); });
  els.clear.addEventListener("click", function () {
    if (document.activeElement === els.input && els.input.value) { els.input.value = ""; showResults(); return; }
    close();
    els.input.focus({ preventScroll: true });
  });

  // ------------------------------------------------------------------ the rail and tabs

  $$(".rail-btn[data-view]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      var v = b.getAttribute("data-view");
      if (v === "resume") return;
      e.preventDefault();
      if (v === "explore") {
        if (state.view !== "project") open("world", { sheet: "peek" });
        setSheet("peek");
        updateRail();
        return;
      }
      if (!isPhone() && state.view === v && state.panelOpen) { close(); return; }
      open(v, { focus: e.detail === 0, sheet: v === "saved" || v === "contact" ? "half" : undefined });
      if (v === "contact" && isPhone()) { var c = $("#contact-block"); if (c) c.scrollIntoView(); }
    });
  });
  els.tab.addEventListener("click", function () { showPanel(!state.panelOpen); updateRail(); updateSearchBox(); });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    var menu = $("#site-menu");
    if (menu && menu.getAttribute("data-open") === "true") return;
    if (els.dialog.open) return;
    if (state.view && state.view !== "world" && (state.panelOpen || isPhone())) {
      e.preventDefault();
      var wasProject = state.view === "project";
      close();
      if (wasProject && !isPhone()) els.input.focus({ preventScroll: true });
    }
  });

  // ------------------------------------------------------------------ the phone's bottom sheet

  var sheetY = { peek: 0, half: 0, full: 0 };
  function sheetMetrics() {
    var h = window.innerHeight, tab = $(".rail").getBoundingClientRect().height;
    var top = 76;
    var height = h - tab - top;
    var links = $(".peek-links", els.panelBody);
    var peekH = links ? links.offsetTop + links.offsetHeight + 12 + els.panelScroll.offsetTop - els.panelScroll.scrollTop : 120;
    peekH = clamp(peekH, 96, 220);
    sheetY = { full: 0, half: Math.round(height - Math.max(h * 0.5 - tab, peekH + 120)), peek: Math.round(height - peekH) };
    els.panel.style.setProperty("--sheet-h", height + "px");
    return sheetY;
  }
  function setSheet(name, instant) {
    if (!isPhone()) return;
    state.sheet = name;
    sheetMetrics();
    els.panel.classList.toggle("is-instant", !!instant || reduceMotion.matches);
    els.panel.style.setProperty("--sheet-y", sheetY[name] + "px");
    els.panel.setAttribute("data-sheet", name);
    els.body.classList.toggle("is-sheet-full", name === "full");
    if (name === "peek") els.panelScroll.scrollTop = 0;
    insets();
    updateRail();
  }
  (function dragSheet() {
    var drag = null;
    els.panel.addEventListener("pointerdown", function (e) {
      if (!isPhone() || (e.pointerType === "mouse" && e.button !== 0)) return;
      var onGrip = els.grip.contains(e.target);
      // When the sheet is all the way up, its content scrolls; only the grip moves it.
      if (state.sheet === "full" && !onGrip && els.panelScroll.scrollTop > 0) return;
      drag = { x: e.clientX, y: e.clientY, y0: sheetY[state.sheet], id: e.pointerId, moved: false, t: performance.now(), last: e.clientY, v: 0, grip: onGrip };
    });
    els.panel.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved) {
        if (Math.hypot(dx, dy) < 7) return;
        // Sideways belongs to the pictures; upward on a full sheet belongs to its scrolling.
        if (Math.abs(dx) > Math.abs(dy) || (state.sheet === "full" && !drag.grip && dy < 0)) { drag = null; return; }
        drag.moved = true;
        els.panel.classList.add("is-dragging");
        try { els.panel.setPointerCapture(e.pointerId); } catch (err) {}
      }
      var now = performance.now();
      drag.v = 0.7 * (e.clientY - drag.last) / Math.max(now - drag.t, 1) + 0.3 * drag.v;
      drag.t = now; drag.last = e.clientY;
      var y = drag.y0 + dy;
      if (y < 0) y = y / 3;
      if (y > sheetY.peek) y = sheetY.peek + (y - sheetY.peek) / 3;
      els.panel.style.setProperty("--sheet-y", y + "px");
    });
    function end(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag; drag = null;
      els.panel.classList.remove("is-dragging");
      if (!d.moved) return;
      var y = d.y0 + (e.clientY - d.y) + clamp(d.v, -3, 3) * 160;
      var best = "peek", dist = Infinity;
      ["full", "half", "peek"].forEach(function (k) { var dd = Math.abs(sheetY[k] - y); if (dd < dist) { dist = dd; best = k; } });
      setSheet(best);
      // A drag is not a tap: keep the click that follows from opening anything.
      var stop = function (ev) { ev.stopPropagation(); ev.preventDefault(); };
      els.panel.addEventListener("click", stop, { capture: true, once: true });
      setTimeout(function () { els.panel.removeEventListener("click", stop, { capture: true }); }, 60);
    }
    els.panel.addEventListener("pointerup", end);
    els.panel.addEventListener("pointercancel", end);
    // A tap on the grip or the heading of a lowered sheet raises it.
    els.panel.addEventListener("click", function (e) {
      if (!isPhone() || e.target.closest("a,button,summary,.track")) return;
      if (els.grip.contains(e.target)) { setSheet(state.sheet === "peek" ? "half" : state.sheet === "half" ? "full" : "peek"); return; }
      if (state.sheet === "peek" && e.target.closest(".head")) setSheet("half");
    });
  })();

  // ------------------------------------------------------------------ insets, the scale bar, and the strip

  function insets() {
    var m = state.map;
    if (!m || !m.world) return;
    if (isPhone()) {
      var sheetTop = window.innerHeight - $(".rail").getBoundingClientRect().height - (parseFloat(els.panel.style.getPropertyValue("--sheet-h")) || 0) + sheetY[state.sheet];
      m.insets = { left: 0, top: 64, right: 0, bottom: Math.max(0, window.innerHeight - sheetTop) };
    } else {
      m.insets = { left: RAIL + (state.panelOpen ? PANEL : 0), top: 0, right: 0, bottom: STRIP };
    }
    m.insets.bottomFixed = isPhone() ? 0 : STRIP;
    els.body.style.setProperty("--map-left", m.insets.left + "px");
    els.body.style.setProperty("--map-bottom", m.insets.bottom + "px");
    if (m.anim) return;
    var lim = m.limits();
    if (m.s < lim.min - 1e-6) m.flyTo(m.viewFor({ x: 0, y: 0, w: m.world.width, h: m.world.height }, { pad: 1 }), { duration: 420 });
    else m.set({ s: m.s, tx: m.tx, ty: m.ty });
  }

  function niceDistance(km) {
    var p = Math.pow(10, Math.floor(Math.log10(km))), n = km / p;
    return (n >= 5 ? 5 : n >= 2 ? 2 : 1) * p;
  }
  function updateScale(m) {
    var kmPerPx = state.world.scale.kmPerUnit / m.s;
    var km = niceDistance(kmPerPx * 96), px = km / kmPerPx;
    var text = km.toLocaleString("en-US") + " km";
    $$(".scale").forEach(function (s) {
      $(".scale-text", s).textContent = text;
      $(".scale-bar", s).style.width = px.toFixed(1) + "px";
      if (s.getAttribute("role")) s.setAttribute("aria-label", "Scale: " + px.toFixed(0) + " pixels is " + text);
    });
  }

  // ------------------------------------------------------------------ worlds

  function pickWorld(worlds) {
    var asked = params.get("world");
    var found = worlds.filter(function (w) { return w.slug === asked; })[0];
    if (found) return found;
    var last = store.get(WORLD_KEY);
    var i = worlds.findIndex(function (w) { return w.slug === last; });
    return i >= 0 ? worlds[(i + 1) % worlds.length] : worlds[Math.floor(Math.random() * worlds.length)];
  }

  function loadWorld(entry) {
    return PM.getJSON(ROOT + "worlds/" + entry.slug + ".json").then(function (w) {
      state.entry = entry;
      state.world = w;
      store.set(WORLD_KEY, w.slug);
      state.map.projectsById = state.byId;
      state.map.load(w);
      buildShapes();
      els.worldName.textContent = w.name;
      document.title = "Noah Darwin Lee | Projects | " + w.name;
      return document.fonts.ready.then(function () { state.map.measureLabels(); });
    });
  }

  var switching = false;
  function nextWorld() {
    if (switching) return;
    switching = true;
    var i = state.worlds.indexOf(state.entry);
    var next = state.worlds[(i + 1) % state.worlds.length];
    var keep = state.view === "project" ? { id: state.project, province: state.province } : null;
    els.body.classList.add("is-switching");
    setTimeout(function () {
      loadWorld(next).then(function () {
        insets();
        state.map.set(homeView());
        if (keep) open("project", { id: keep.id, province: keep.province, instant: true, sheet: isPhone() ? state.sheet : undefined });
        else if (state.view === "world") open("world", { sheet: state.sheet });
        else renderPeek();
        return state.map.imageReady;
      }).then(function () {
        els.body.classList.remove("is-switching");
        toast("Map: " + next.name + " | " + (state.worlds.indexOf(next) + 1) + " of " + state.worlds.length);
        switching = false;
      }, function () { els.body.classList.remove("is-switching"); switching = false; });
    }, reduceMotion.matches ? 0 : 220);
  }

  // The first view: the whole world beside the panel on a desktop; on a phone, the world's full height.
  function homeView() {
    var m = state.map, W = m.world.width, H = m.world.height;
    if (isPhone()) {
      var r = m.rect(), s = clamp((r.h + 40) / H, m.limits().min, m.limits().max);
      return { s: s, tx: r.l + r.w / 2 - (W / 2) * s, ty: r.t + r.h / 2 - (H / 2) * s };
    }
    return m.viewFor({ x: 0, y: 0, w: W, h: H }, { pad: 1 });
  }

  // ------------------------------------------------------------------ feedback, the menu's theme switch

  function openFeedback() {
    if (typeof els.dialog.showModal === "function") els.dialog.showModal();
    else els.dialog.setAttribute("open", "");
    setTimeout(function () { $("#feedback-message").focus(); }, 30);
  }
  els.dialog.addEventListener("click", function (e) { if (e.target === els.dialog) els.dialog.close(); });

  (function menuClick() {
    var menu = $("#site-menu"), entered = 0;
    if (!menu) return;
    menu.addEventListener("mouseenter", function () { entered = performance.now(); });
    menu.addEventListener("click", function (e) {
      if (!e.target.closest("#site-menu-btn")) return;
      // The menu opens on hover; the click that usually follows should not close it again.
      if (menu.getAttribute("data-open") === "true" && performance.now() - entered < 700) e.stopPropagation();
    }, true);
  })();

  document.addEventListener("DOMContentLoaded", function () {
    var btn = $("#theme-btn"), slot = $(".site-menu-theme-slot");
    if (!btn || !slot) return;
    slot.appendChild(btn);
    var names = { light: "Orange", white: "White", dark: "Night" };
    function label() {
      var t = document.documentElement.getAttribute("data-theme");
      btn.textContent = names[t === "dark" || t === "white" ? t : "light"];
    }
    label();
    new MutationObserver(label).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  });

  // ------------------------------------------------------------------ start

  function layout() {
    els.body.classList.toggle("is-phone", isPhone());
    if (isPhone()) {
      els.panel.classList.add("is-instant");
      setSheet(state.sheet || "peek", true);
      requestAnimationFrame(function () { els.panel.classList.remove("is-instant"); });
    } else {
      els.panel.style.removeProperty("--sheet-y");
      showPanel(state.panelOpen);
    }
    updateRail(); updateSearchBox();
  }

  state.saved = loadSaved();
  updateCount();

  Promise.all([PM.getJSON(ROOT + "projects.json"), PM.getJSON(ROOT + "worlds/index.json")]).then(function (r) {
    state.projects = r[0];
    r[0].forEach(function (p) { state.byId[p.id] = p; });
    state.worlds = r[1];
    state.map = new PM.MapView($("#map"));
    state.map.obstacles = function () {
      return [".search-box", ".brand", ".scale-corner", ".zoom", ".fab-world"].map(function (s) { return $(s); }).filter(function (e) {
        return e && e.offsetParent !== null && getComputedStyle(e).display !== "none";
      }).map(function (e) { return e.getBoundingClientRect(); });
    };
    state.map.onSelect = function (id, province) {
      if (!id) return;
      if (state.view === "project" && state.project === id && !province && state.province) province = null;
      open("project", { id: id, province: province || null, sheet: isPhone() ? "half" : undefined });
    };
    state.map.onView = function (m) {
      var lim = m.limits();
      $("#zoom-in").disabled = m.s >= lim.max - 1e-6;
      $("#zoom-out").disabled = m.s <= lim.min + 1e-6;
      updateScale(m);
    };
    $("#zoom-in").addEventListener("click", function () { state.map.zoomBy(1.6); });
    $("#zoom-out").addEventListener("click", function () { state.map.zoomBy(1 / 1.6); });
    $("#strip-world").addEventListener("click", nextWorld);
    els.fab.addEventListener("click", nextWorld);
    var resizeRaf = 0;
    window.addEventListener("resize", function () {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(function () { state.map.resized(); layout(); });
    });
    phoneQuery.addEventListener("change", layout);
    return loadWorld(pickWorld(state.worlds));
  }).then(function () {
    var askedProject = params.get("project"), askedProvince = params.get("province");
    var p = askedProject && state.byId[askedProject];
    state.panelOpen = !!p || isPhone();
    if (isPhone()) state.sheet = p ? "half" : "peek";
    layout();
    renderPeek();
    var prov = p && askedProvince && (p.provinces || []).some(function (v) { return v.id === askedProvince; }) ? askedProvince : null;
    if (p) open("project", { id: p.id, province: prov, fly: false, sheet: isPhone() ? "half" : undefined });
    else if (isPhone()) open("world", { sheet: "peek" });
    // The one entrance: the world arrives a little far off and settles; a shared link then flies to its country.
    var home = homeView(), m = state.map, r = m.rect();
    var cx = r.l + r.w / 2, cy = r.t + r.h / 2, k = reduceMotion.matches ? 1 : 0.9;
    m.set({ s: home.s * k, tx: cx - (cx - home.tx) * k, ty: cy - (cy - home.ty) * k });
    return m.imageReady.then(function () {
      els.body.classList.remove("is-loading");
      var target = p ? m.viewOf(p.id, prov) : home;
      setTimeout(function () { m.flyTo(target, { duration: p ? 1100 : 1000 }); }, reduceMotion.matches ? 0 : 120);
    });
  }).then(function () {
    window.__portfolioMap = { ready: true, map: state.map, state: state, open: open, nextWorld: nextWorld, home: homeView };
  }).catch(function (err) {
    els.body.classList.remove("is-loading");
    els.body.classList.add("is-failed");
    toast("The map didn’t load. Reload the page to try again.");
    if (window.console) console.error(err);
  });
})();

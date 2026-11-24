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
    toast: $("#toast"), strip: $("#strip"), worldName: $(".strip-world-name"),
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
    try { history.replaceState(null, "", ROOT + q + location.hash); } catch (e) {}
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
    var w = state.world;
    var proj = w.projects.filter(function (p) { return p.id === id; })[0];
    var prov = province && proj.provinces ? proj.provinces.filter(function (v) { return v.id === province; })[0] : null;
    return '<svg class="locator" viewBox="0 0 ' + w.width + " " + w.height + '" aria-hidden="true" preserveAspectRatio="xMidYMid meet">' +
      '<rect width="' + w.width + '" height="' + w.height + '" style="fill: var(--m-water)" />' +
      '<path d="' + w.coast + '" style="fill: var(--m-locator-land); stroke: var(--m-line)" stroke-width="2" />' +
      '<path d="' + proj.path + '" fill="' + (prov ? "#f6c592" : "#e68019") + '" />' +
      (prov ? '<path d="' + prov.path + '" fill="#e68019" />' : "") +
      "</svg>";
  }

  // A country with no screenshots is shown as its own piece of the map: its land, its neighbours, and its seas.
  function terrain(id) {
    var w = state.world, sh = state.shapes[id], b = sh.box;
    var water = 'style="fill: var(--m-water)"';
    // The country fills about half the picture's height, with room under it for its name; on a desktop it sits
    // a little low, clear of the search box that floats over the top of the panel.
    var ratio = 16 / 10, phone = isPhone();
    var vw = Math.max(b.w / 0.62, (b.h / (phone ? 0.5 : 0.38)) * ratio, 60), vh = vw / ratio;
    var x = b.x + b.w / 2 - vw / 2, y = b.y + b.h / 2 - vh * (phone ? 0.42 : 0.55);
    var proj = w.projects.filter(function (p) { return p.id === id; })[0];
    var px = vw / 408;
    return '<svg class="terrain" viewBox="' + [x, y, vw, vh].map(function (n) { return n.toFixed(1); }).join(" ") + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<rect x="' + (x - 10) + '" y="' + (y - 10) + '" width="' + (vw + 20) + '" height="' + (vh + 20) + '" ' + water + " />" +
      '<image class="terrain-picture" href="' + (state.map.baseHref || ROOT + "worlds/" + w.image.src) + '" width="' + w.width + '" height="' + w.height + '" preserveAspectRatio="none" />' +
      '<path d="M-4800 -2400H6400V3200H-4800Z' + w.coast + '" ' + water + ' fill-rule="evenodd" />' +
      (w.lakes ? '<path d="' + w.lakes + '" ' + water + " />" : "") +
      '<path d="' + w.coast + '" style="fill: none; stroke: var(--m-line)" stroke-width="' + (0.8 * px).toFixed(2) + '" />' +
      '<path d="M-4800 -2400H6400V3200H-4800Z' + proj.path + '" style="fill: var(--m-halo)" fill-opacity="0.28" fill-rule="evenodd" />' +
      '<path d="' + w.borders + '" style="fill: none; stroke: var(--m-border)" stroke-width="' + (1 * px).toFixed(2) + '" />' +
      '<path d="' + proj.path + '" style="fill: #e68019; stroke: var(--m-sel-ink)" fill-opacity="0.14" stroke-width="' + (1.75 * px).toFixed(2) + '" stroke-linejoin="round" />' +
      terrainName(id, b, px, x, y, vw, vh) +
      "</svg>";
  }

  // The country's name, set in the map's lettering across its own land.
  function terrainName(id, b, px, x, y, vw, vh) {
    var l = state.world.labels.filter(function (q) { return q.kind === "country" && q.id === id; })[0];
    var lines = l && l.lines ? l.lines : [state.byId[id].name];
    var longest = Math.max.apply(null, lines.map(function (s) { return s.length; }));
    var sizePx = Math.min(22, 330 / (longest * 0.62 + 1));
    var fs = sizePx * px, spacing = (l && l.spacing ? l.spacing : 0.1) * fs;
    // Under the country, as a caption on the map; never off the picture.
    var cx = Math.min(Math.max(b.x + b.w / 2, x + vw * 0.2), x + vw * 0.8);
    var cy = Math.min(b.y + b.h + fs * (0.9 + (lines.length - 1) * 0.55), y + vh - fs * (0.6 + (lines.length - 1) * 1.1));
    return '<text class="terrain-name" x="' + cx.toFixed(1) + '" y="' + cy.toFixed(1) + '" font-size="' + fs.toFixed(2) + '" letter-spacing="' + spacing.toFixed(2) + '" stroke-width="' + (fs * 0.22).toFixed(2) + '" text-anchor="middle">' +
      lines.map(function (s, k) { return '<tspan x="' + cx.toFixed(1) + '" dy="' + (k ? 1.1 * fs : (0.35 - (lines.length - 1) * 0.55) * fs).toFixed(2) + '">' + esc(s) + "</tspan>"; }).join("") + "</text>";
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

  // A project's pictures come from its "media" list in projects.json: { src, alt, caption }, or { video, poster,
  // alt, caption }, with srcset where there are several sizes. The one marked "cover": true (or else the first
  // still) heads the panel; with more than one, all of them follow in "Photos and videos". A project with none
  // shows its own piece of the map instead, so adding screenshots later means only filling in that list.
  function coverOf(media) {
    return media.filter(function (m) { return m.cover; })[0] || media.filter(function (m) { return !m.video; })[0] || media[0];
  }
  function countLabel(media) {
    var v = media.filter(function (m) { return m.video; }).length, ph = media.length - v, parts = [];
    if (ph) parts.push(ph + (ph === 1 ? " photo" : " photos"));
    if (v) parts.push(v + (v === 1 ? " video" : " videos"));
    return parts.join(" and ");
  }
  function topPicture(media, id) {
    if (!media || !media.length) return '<div class="hero hero-terrain">' + terrain(id) + "</div>";
    var m = coverOf(media), src = m.video ? m.poster : m.src;
    var h = '<figure class="hero hero-photo">' +
      '<button class="hero-open" type="button" data-photos="' + media.indexOf(m) + '" aria-label="' + esc(m.alt) + ', full screen">' +
      '<img src="' + esc(src) + '"' + (m.srcset && !m.video ? ' srcset="' + esc(m.srcset) + '" sizes="(max-width: 759px) 100vw, 408px"' : "") +
      ' alt="" decoding="async" fetchpriority="high" /></button>';
    if (media.length > 1) h += '<button class="hero-more" type="button" data-photos="0">' + icon("i-photos") + "<span>" + countLabel(media) + "</span></button>";
    h += "</figure>";
    if (media.length === 1 && m.caption) h += '<p class="caption">' + esc(m.caption) + "</p>";
    return h;
  }
  function gallery(media, label) {
    if (!media || media.length < 2) return "";
    var slides = media.map(function (m, i) {
      var inner;
      if (m.video) {
        inner = '<video src="' + esc(m.video) + '" poster="' + esc(m.poster) + '" muted loop playsinline preload="none" aria-label="' + esc(m.alt) + '"></video>';
      } else {
        inner = '<img src="' + esc(m.src) + '"' + (m.srcset ? ' srcset="' + esc(m.srcset) + '" sizes="(max-width: 759px) 100vw, 360px"' : "") +
          ' alt="' + esc(m.alt) + '" decoding="async" loading="lazy" />';
      }
      return '<figure class="slide" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + " of " + media.length + '" data-cap="' + esc(m.caption || "") + '">' +
        '<button class="slide-open" type="button" data-photos="' + i + '" aria-label="' + esc(m.alt) + ', full screen">' + inner + "</button></figure>";
    }).join("");
    return '<section class="block photos" id="photos"><h3 class="block-title">Photos and videos</h3>' +
      '<div class="gallery" aria-roledescription="carousel" aria-label="' + esc(label) + '">' +
      '<div class="track" tabindex="0" aria-label="' + esc(label) + '; use the arrow keys to move between them">' + slides + "</div>" +
      '<button class="hero-arrow hero-prev" type="button" aria-label="Previous picture" disabled>' + icon("i-left") + "</button>" +
      '<button class="hero-arrow hero-next" type="button" aria-label="Next picture">' + icon("i-right") + "</button>" +
      '<span class="hero-count" aria-live="polite">1 / ' + media.length + "</span></div>" +
      '<p class="caption">' + esc(media[0].caption || "") + "</p></section>";
  }

  // A list's row: the name, a line on what the project is, and its address.
  function rowText(name, tagline, link) {
    return '<span class="row-text"><b>' + esc(name) + "</b>" + (tagline ? '<span class="row-line">' + esc(tagline) + "</span>" : "") +
      '<span class="row-link">' + esc(link) + "</span></span>";
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
    h += topPicture(media, id);
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
          rowText(v.name, v.tagline, p.domain) + icon("i-right", "row-go") + "</button></li>";
      }).join("") + "</ul></section>";
    }
    h += gallery(media, "Photos and videos of " + (prov ? prov.name : p.name));
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
      rowText(p.name, p.tagline, p.domain) +
      (isSaved(p.id) ? '<span class="row-heart" aria-label="Saved">' + icon("i-heart") + "</span>" : "") + "</button></li>";
  }

  // On a phone, the sheet at rest is headed Projects (Noah, 24 November 2026: no world's name on a phone); raised, it
  // lists the countries, the large ones first with no heading, then the islands and small states.
  function viewWorld() {
    var n = state.world.projects.length, h = "";
    h += '<header class="head head-world"><h2 class="title" tabindex="-1">Projects</h2>';
    // On a phone the opening line lives here, under the world's name, until the visitor acts.
    h += '<p class="sub">' + (hintShown() ? "Click on a project to learn more." : "A world of " + n + " countries, each one of my projects") + "</p></header>";
    var flag = state.projects.filter(function (p) { return p.tier === "flagship"; });
    var small = state.projects.filter(function (p) { return p.tier !== "flagship"; });
    h += '<section class="block block-first"><ul class="rows">' + flag.map(rowFor).join("") + "</ul></section>";
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
    return '<header class="head head-plain"><h2 class="title" tabindex="-1">Contact</h2></header>' + contactBlock();
  }

  // ------------------------------------------------------------------ opening and closing

  function open_(view, opts) { return open(view, opts); }
  // The opening line over the map goes for good, this visit, once the visitor opens a project, searches, or opens
  // the menu.
  function hintShown() { var h = $("#hint"); return !!h && !h.classList.contains("is-gone"); }
  function dismissHint() {
    var h = $("#hint");
    if (h && !h.classList.contains("is-gone")) {
      h.classList.add("is-gone");
      setTimeout(function () { h.hidden = true; }, 450);
      var sub = $(".head-world .sub", els.panelBody);
      if (sub && state.world) sub.textContent = "A world of " + state.world.projects.length + " countries, each one of my projects";
    }
  }

  function open(view, opts) {
    if (view === "project") dismissHint();
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
    return '<p class="peek-links"><a href="/terms/">Terms</a><i class="sep" aria-hidden="true">|</i><a href="/privacy/">Privacy</a><i class="sep" aria-hidden="true">|</i><button class="link-btn" type="button" data-feedback>Site feedback</button></p>';
  }
  function renderPeek() {
    var p = $(".peek-links", els.panelBody);
    if (p) p.outerHTML = peekLinks();
  }

  // ------------------------------------------------------------------ the panel's controls

  function bindPanel() {
    var g = $(".gallery", els.panelBody);
    if (g) carousel(g);
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
    var t = e.target.closest("[data-open],[data-save],[data-share],[data-copy],[data-next-world],[data-feedback],[data-close],[data-photos]");
    if (!t) return;
    if (t.hasAttribute("data-photos")) {
      viewer.open(currentMedia(), +(t.getAttribute("data-photos") || 0), t);
      return;
    }
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
        return '<li role="option" id="opt-' + i + '" class="search-opt" aria-selected="' + (i === active) + '" data-i="' + i + '">' + glyph(r.p.id) +
          rowText(r.v ? r.v.name : r.p.name, r.v ? r.v.tagline : r.p.tagline, r.p.domain) + "</li>";
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
  els.input.addEventListener("input", function () { dismissHint(); showResults(); els.search.classList.toggle("has-value", !!els.input.value); });
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
    // Lowered, the sheet shows its heading: the world's or the project's name and the line under it.
    var head = $(".head", els.panelBody);
    var peekH = head ? head.offsetTop + head.offsetHeight + 18 + els.panelScroll.offsetTop - els.panelScroll.scrollTop : 120;
    peekH = clamp(peekH, 96, 200);
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
    // The phone's corner bar, after the Google Maps app: miles above the line and kilometres below it, each measured
    // back from the right end, where both figures sit.
    var mi = niceDistance(kmPerPx * 96 / 1.609344), miPx = mi * 1.609344 / kmPerPx;
    var miText = mi.toLocaleString("en-US") + (mi === 1 ? " mile" : " miles");
    $$(".scale").forEach(function (s) {
      $(".scale-text", s).textContent = text;
      $(".scale-bar", s).style.width = px.toFixed(1) + "px";
      var d = $(".scale-dual", s);
      if (d) {
        d.style.setProperty("--km", px.toFixed(1) + "px");
        d.style.setProperty("--mi", miPx.toFixed(1) + "px");
        $(".scale-mi", s).textContent = miText;
        $(".scale-km", s).textContent = text;
      }
      if (s.getAttribute("role")) s.setAttribute("aria-label", "Scale: " + px.toFixed(0) + " pixels is " + text);
    });
  }

  // ------------------------------------------------------------------ worlds

  // Worlds renamed since links to them were shared: the old name opens the new world.
  var WORLD_ALIASES = { dick: "zelazny" };

  function pickWorld(worlds) {
    var asked = params.get("world");
    if (asked && WORLD_ALIASES[asked.toLowerCase()]) asked = WORLD_ALIASES[asked.toLowerCase()];
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
      $(".drawer-world").textContent = w.name;
      document.title = "Noah Darwin Lee | Projects" + (isPhone() ? "" : " | " + w.name);
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

  // ------------------------------------------------------------------ feedback

  function openFeedback() {
    if (typeof els.dialog.showModal === "function") els.dialog.showModal();
    else els.dialog.setAttribute("open", "");
    setTimeout(function () { $("#feedback-message").focus(); }, 30);
  }
  els.dialog.addEventListener("click", function (e) { if (e.target === els.dialog) els.dialog.close(); });

  // ------------------------------------------------------------------ photos and videos, full screen

  // The media of whatever the panel shows: the project's, or one of Dealdesk's tools'.
  function currentMedia() {
    var p = state.byId[state.project];
    if (!p) return [];
    var prov = state.province && p.provinces ? p.provinces.filter(function (v) { return v.id === state.province; })[0] : null;
    return (prov ? prov.media : p.media) || [];
  }

  // Keeps Tab within an open dialog of the page's own (the menu and the viewer).
  function trapTab(box, e) {
    var f = $$("a[href], button:not([disabled]), [tabindex='0'], video[controls]", box).filter(function (x) { return x.offsetParent !== null || x === document.activeElement; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !box.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !box.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  }

  var viewer = (function () {
    var box = $("#viewer"), stage = $(".viewer-stage", box), count = $(".viewer-count", box), cap = $(".viewer-caption", box);
    var prev = $(".viewer-prev", box), next = $(".viewer-next", box), closeBtn = $(".viewer-close", box);
    var list = [], at = 0, back = null, slide = null;
    // Pinch and double-tap zoom on photos: scale and offset of the photo now shown.
    var z = { k: 1, x: 0, y: 0 };

    function srcOf(m) {
      if (!m.srcset) return m.src;
      var best = m.src, w = 0;
      m.srcset.split(",").forEach(function (part) {
        var bits = part.trim().split(/\s+/), n = parseInt(bits[1], 10) || 0;
        if (n > w && n <= 2400) { w = n; best = bits[0]; }
      });
      return best;
    }
    function applyZoom(animate) {
      if (!slide) return;
      var el = slide.querySelector("img");
      if (!el) return;
      el.style.transition = animate && !reduceMotion.matches ? "transform 220ms cubic-bezier(0.23, 1, 0.32, 1)" : "none";
      el.style.transform = z.k === 1 ? "" : "translate(" + z.x + "px," + z.y + "px) scale(" + z.k + ")";
      box.classList.toggle("is-zoomed", z.k > 1.01);
    }
    function show(i, dir) {
      at = (i + list.length) % list.length;
      var m = list[at];
      z = { k: 1, x: 0, y: 0 };
      var el = document.createElement("figure");
      el.className = "viewer-slide" + (dir ? " from-" + (dir > 0 ? "right" : "left") : "");
      if (m.video) el.innerHTML = '<video src="' + esc(m.video) + '" poster="' + esc(m.poster) + '" controls autoplay muted loop playsinline aria-label="' + esc(m.alt) + '"></video>';
      else el.innerHTML = '<img src="' + esc(srcOf(m)) + '" alt="' + esc(m.alt) + '" decoding="async" draggable="false" />';
      $$("video", stage).forEach(function (v) { v.pause(); });
      stage.textContent = "";
      stage.appendChild(el);
      slide = el;
      count.textContent = list.length > 1 ? at + 1 + " / " + list.length : "";
      cap.textContent = m.caption || m.alt || "";
      prev.hidden = next.hidden = list.length < 2;
      // The neighbours load ahead, so moving on is instant.
      [at + 1, at - 1].forEach(function (k) {
        var n = list[(k + list.length) % list.length];
        if (n && !n.video) { var im = new Image(); im.src = srcOf(n); }
      });
    }
    function open(media, i, from) {
      if (!media || !media.length) return;
      list = media; back = from || document.activeElement;
      box.hidden = false;
      document.body.classList.add("is-viewing");
      show(i || 0, 0);
      closeBtn.focus({ preventScroll: true });
    }
    function close() {
      if (box.hidden) return;
      $$("video", stage).forEach(function (v) { v.pause(); });
      stage.textContent = "";
      slide = null;
      box.hidden = true;
      document.body.classList.remove("is-viewing");
      if (back && back.focus) back.focus({ preventScroll: true });
    }
    prev.addEventListener("click", function () { show(at - 1, -1); });
    next.addEventListener("click", function () { show(at + 1, 1); });
    closeBtn.addEventListener("click", close);
    // A click on the dark around the picture closes it, as in any photo viewer.
    box.addEventListener("click", function (e) { if (e.target === box || e.target === stage) close(); });
    document.addEventListener("keydown", function (e) {
      if (box.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === "ArrowRight" && list.length > 1) { e.preventDefault(); show(at + 1, 1); }
      else if (e.key === "ArrowLeft" && list.length > 1) { e.preventDefault(); show(at - 1, -1); }
      else if (e.key === "Tab") trapTab(box, e);
    }, true);

    // Swipe between pictures; pinch, or tap twice, to zoom a photo, and drag it while zoomed.
    var pts = new Map(), g = null, lastTap = 0;
    stage.addEventListener("pointerdown", function (e) {
      if (!slide || e.target.closest("video")) return;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
      var p = Array.from(pts.values());
      if (p.length === 1) g = { x: e.clientX, y: e.clientY, zx: z.x, zy: z.y, moved: 0 };
      else if (p.length === 2) g = { pinch: Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]), k: z.k, zx: z.x, zy: z.y, mx: (p[0][0] + p[1][0]) / 2, my: (p[0][1] + p[1][1]) / 2 };
    });
    stage.addEventListener("pointermove", function (e) {
      if (!g || !pts.has(e.pointerId)) return;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      var p = Array.from(pts.values());
      if (g.pinch && p.length >= 2) {
        var d = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
        z.k = clamp(g.k * d / g.pinch, 1, 4);
        var mx = (p[0][0] + p[1][0]) / 2, my = (p[0][1] + p[1][1]) / 2;
        z.x = g.zx + (mx - g.mx); z.y = g.zy + (my - g.my);
        applyZoom(false);
      } else if (!g.pinch) {
        var dx = e.clientX - g.x, dy = e.clientY - g.y;
        g.moved = Math.max(g.moved, Math.hypot(dx, dy));
        if (z.k > 1.01) { z.x = g.zx + dx; z.y = g.zy + dy; applyZoom(false); }
        else if (list.length > 1) { slide.style.transition = "none"; slide.style.transform = "translateX(" + dx + "px)"; }
      }
    });
    function up(e) {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (!g) return;
      if (g.pinch) { if (pts.size < 2) { if (z.k < 1.05) { z = { k: 1, x: 0, y: 0 }; applyZoom(true); } g = null; } return; }
      var dx = e.clientX - g.x, moved = g.moved;
      g = null;
      if (z.k > 1.01) return;
      if (list.length > 1 && Math.abs(dx) > 60) { show(at + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); return; }
      if (slide) { slide.style.transition = ""; slide.style.transform = ""; }
      if (moved < 8 && e.pointerType !== "mouse") {
        var now = performance.now();
        if (now - lastTap < 300) { z = z.k > 1 ? { k: 1, x: 0, y: 0 } : { k: 2.2, x: 0, y: 0 }; applyZoom(true); lastTap = 0; }
        else lastTap = now;
      }
    }
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", up);
    stage.addEventListener("dblclick", function (e) {
      if (!slide || !slide.querySelector("img")) return;
      z = z.k > 1 ? { k: 1, x: 0, y: 0 } : { k: 2.2, x: 0, y: 0 };
      applyZoom(true);
    });
    return { open: open, close: close, isOpen: function () { return !box.hidden; } };
  })();

  // ------------------------------------------------------------------ the menu

  // Map layers the visitor can switch off: CSS hides the drawn ones, and the map skips names of the listed kinds.
  var LAYERS_KEY = "portfolio-map-layers";
  var LAYER_KINDS = {
    names: ["country", "province", "region", "island", "cape", "range", "peak"],
    roads: ["shield"],
    towns: ["capital", "city", "town", "village", "district"],
    rivers: ["river", "lake"],
    parks: ["park", "citypark"],
    "water-names": ["ocean", "sea", "gulf", "bay", "strait", "channel", "sound", "fjord", "lagoon", "harbour", "inlet", "cove", "lake", "river"]
  };
  var layersOff = (function () {
    try { var v = JSON.parse(store.get(LAYERS_KEY) || "[]"); if (Array.isArray(v)) return v; } catch (e) {}
    return [];
  })();
  function applyLayers() {
    var kinds = {};
    $$(".drawer-switch[data-layer]").forEach(function (b) {
      var name = b.getAttribute("data-layer"), on = layersOff.indexOf(name) < 0;
      b.setAttribute("aria-checked", String(on));
      els.body.classList.toggle("no-" + name, !on);
      if (!on) (LAYER_KINDS[name] || []).forEach(function (k) { kinds[k] = 1; });
    });
    $("#layers-reset").disabled = !layersOff.length;
    if (state.map) state.map.setHiddenKinds(kinds);
  }
  function setLayer(name, on) {
    var i = layersOff.indexOf(name);
    if (on && i >= 0) layersOff.splice(i, 1);
    if (!on && i < 0) layersOff.push(name);
    store.set(LAYERS_KEY, JSON.stringify(layersOff));
    applyLayers();
  }

  // A link to this world, at this place and zoom (and with the open project, if there is one).
  function mapLink() {
    var m = state.map, r = m.rect(), W = state.world.width;
    var cx = (((r.l + r.w / 2 - m.tx) / m.s) % W + W) % W, cy = (r.t + r.h / 2 - m.ty) / m.s;
    var q = "?world=" + state.world.slug + "&at=" + (Math.round(cx * 10) / 10) + "," + (Math.round(cy * 10) / 10) + "," + m.zoom().toFixed(2);
    if (state.view === "project" && state.project) q += "&project=" + state.project + (state.province ? "&province=" + state.province : "");
    return location.origin + ROOT + q;
  }

  var drawer = (function () {
    var box = $("#drawer"), scrim = $("#drawer-scrim"), openers = $$("#menu-btn, .search-menu"), back = null;
    function open(from) {
      dismissHint();
      back = from || document.activeElement;
      box.hidden = false; scrim.hidden = false;
      document.body.classList.add("is-drawer");
      openers.forEach(function (b) { b.setAttribute("aria-expanded", "true"); });
      $(".drawer-world").textContent = state.world ? state.world.name : "";
      $(".drawer-close", box).focus({ preventScroll: true });
    }
    function close(keepFocus) {
      if (box.hidden) return;
      box.hidden = true; scrim.hidden = true;
      document.body.classList.remove("is-drawer");
      openers.forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
      if (!keepFocus && back && back.focus) back.focus({ preventScroll: true });
    }
    openers.forEach(function (b) { b.addEventListener("click", function () { if (box.hidden) open(b); else close(); }); });
    scrim.addEventListener("click", function () { close(); });
    $("[data-drawer-close]", box).addEventListener("click", function () { close(); });
    document.addEventListener("keydown", function (e) {
      if (box.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === "Tab") trapTab(box, e);
    }, true);
    box.addEventListener("click", function (e) {
      var t = e.target.closest(".drawer-row");
      if (!t) return;
      if (t.hasAttribute("data-layer")) { setLayer(t.getAttribute("data-layer"), t.getAttribute("aria-checked") !== "true"); return; }
      if (t.id === "layers-reset") { layersOff = []; store.set(LAYERS_KEY, "[]"); applyLayers(); return; }
      // Any other choice closes the menu; links go where they lead.
      close(true);
      if (t.hasAttribute("data-drawer-view")) {
        var v = t.getAttribute("data-drawer-view");
        open2(v);
      } else if (t.id === "drawer-share") {
        copy(mapLink()).then(function () { toast("Link to this map copied"); });
      }
    });
    function open2(v) {
      open_(v, { focus: true, sheet: isPhone() ? "half" : undefined });
      if (v === "contact" && isPhone()) { var c = $("#contact-block"); if (c) c.scrollIntoView(); }
    }
    return { open: open, close: close, isOpen: function () { return !box.hidden; } };
  })();

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
    state.map.onPicture = function (href) { $$(".terrain-picture").forEach(function (i) { i.setAttribute("href", href); }); };
    state.map.obstacles = function () {
      return [".search-box", ".scale-corner", ".controls"].map(function (s) { return $(s); }).filter(function (e) {
        return e && e.offsetParent !== null && getComputedStyle(e).display !== "none";
      }).map(function (e) { return e.getBoundingClientRect(); });
    };
    applyLayers();
    // The location button: first to the blue dot on the island called About, then on to the about page.
    var locate = $(".locate");
    if (locate) locate.addEventListener("click", function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      state.map.goHere();
    });
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
    // A link that opens a project needs no line about clicking one.
    if (p) open("project", { id: p.id, province: prov, fly: false, sheet: isPhone() ? "half" : undefined });
    else if (isPhone()) open("world", { sheet: "peek" });
    // The one entrance: the world arrives a little far off and settles; a shared link then flies to its country.
    var home = homeView(), m = state.map, r = m.rect();
    var cx = r.l + r.w / 2, cy = r.t + r.h / 2, k = reduceMotion.matches ? 1 : 0.9;
    m.set({ s: home.s * k, tx: cx - (cx - home.tx) * k, ty: cy - (cy - home.ty) * k });
    return m.imageReady.then(function () {
      els.body.classList.remove("is-loading");
      var target = p ? m.viewOf(p.id, prov) : home;
      // A shared map link names the place and zoom it was copied at.
      var at = (params.get("at") || "").split(",").map(Number);
      if (at.length === 3 && at.every(isFinite)) {
        var s = clamp(at[2] * m.ref(), m.limits().min, m.limits().max), rr = m.rect();
        target = { s: s, tx: rr.l + rr.w / 2 - at[0] * s, ty: rr.t + rr.h / 2 - at[1] * s };
      }
      setTimeout(function () { m.flyTo(target, { duration: p ? 1100 : 1000 }); }, reduceMotion.matches ? 0 : 120);
    });
  }).then(function () {
    window.__portfolioMap = { ready: true, map: state.map, state: state, open: open, nextWorld: nextWorld, home: homeView, viewer: viewer, drawer: drawer, mapLink: mapLink };
  }).catch(function (err) {
    els.body.classList.remove("is-loading");
    els.body.classList.add("is-failed");
    toast("The map didn’t load. Reload the page to try again.");
    if (window.console) console.error(err);
  });
})();

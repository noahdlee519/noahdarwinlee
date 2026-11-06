// CHRONIA's developer tools: Noah's own edits to the map, each from one date to another, saved through the
// chronia-edits function and shown to every visitor (see docs/superpowers/specs/2026-11-05-chronia-dev-tools-design.md).
// app.js loads this file only when the tools are opened (#dev in the address, or Shift+D) and hands it
// window.CHRONIA_DEV; everything shown here is built with textContent, never as HTML.
(function () {
  "use strict";
  var api = window.CHRONIA_DEV;
  if (!api) return;
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var KIND_NAMES = { "country-colour": "Colour", "country-name": "Name", label: "Name placement", "city-size": "Size", "city-name": "Name", "city-hide": "Hidden" };
  var SIZES = [[1, "Largest"], [2, "Large"], [3, "Small"], [4, "Smallest"]];

  // Only Noah's Google account (a reviewer in the table chronia_team) may save; the tools use the session the
  // report panel keeps, so signing in there signs in here. Until 6 November 2026 they took Noah's password.
  try { sessionStorage.removeItem("chronia-dev"); } catch (e) {}
  var allowed = false;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function button(text, cls, on) {
    var b = el("button", cls || "ch-dev-btn", text);
    b.type = "button";
    if (on) b.addEventListener("click", on);
    return b;
  }

  // Dates as typed ("1815", "July 1815", "3 July 1815", "July 3, 1815", "1815-07-03", "500 BC") to the stored
  // form ("1815", "1815-07", "1815-07-03", "-500"), or null.
  function monthOf(s) {
    var m = String(s).toLowerCase();
    for (var i = 0; i < 12; i++) if (m.length >= 3 && MONTHS[i].toLowerCase().indexOf(m) === 0) return i + 1;
    return 0;
  }
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  function storeDate(s) {
    var t = String(s || "").trim().replace(/,/g, " ").replace(/\./g, "").replace(/\s+/g, " "), m, y, mo, d;
    if ((m = /^(-?\d{1,4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/.exec(t))) { y = +m[1]; mo = m[2] ? +m[2] : 0; d = m[3] ? +m[3] : 0; }
    else if ((m = /^(\d{1,2}) ([A-Za-z]+) (\d{1,4})$/.exec(t)) && monthOf(m[2])) { y = +m[3]; mo = monthOf(m[2]); d = +m[1]; }
    else if ((m = /^([A-Za-z]+) (\d{1,2}) (\d{1,4})$/.exec(t)) && monthOf(m[1])) { y = +m[3]; mo = monthOf(m[1]); d = +m[2]; }
    else if ((m = /^([A-Za-z]+) (\d{1,4})$/.exec(t)) && monthOf(m[1])) { y = +m[2]; mo = monthOf(m[1]); d = 0; }
    else if ((m = /^(?:(AD|CE) )?(\d{1,4})(?: ?(BC|BCE|AD|CE))?$/i.exec(t))) { y = +m[2]; if (/^BC/i.test(m[3] || "")) y = -y; mo = 0; d = 0; }
    else return null;
    if (!y || mo > 12 || d > 31 || (d && !mo)) return null;
    if (d && d > new Date(Date.UTC(Math.max(y, 1), mo, 0)).getUTCDate()) return null;
    return String(y) + (mo ? "-" + p2(mo) : "") + (d ? "-" + p2(d) : "");
  }
  function showDate(s) {
    var m = /^(-?\d{1,4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(String(s || ""));
    if (!m) return String(s || "");
    var y = +m[1], ys = y < 0 ? -y + " BC" : String(y);
    if (!m[2]) return ys;
    return (m[3] ? +m[3] + " " : "") + MONTHS[+m[2] - 1] + " " + ys;
  }
  function describe(e) {
    var v = e.value || {};
    if (e.kind === "country-colour") return v.hex ? "Colour " + v.hex : "Colour " + (v.c + 1);
    if (e.kind === "country-name" || e.kind === "city-name") return "Name: " + v.name;
    if (e.kind === "label") return "Name placement" + (v.size ? ", " + v.size + " px" : "") + (v.angle ? ", " + v.angle + "°" : "");
    if (e.kind === "city-size") return "Size: " + (SIZES[v.tier - 1] || [0, v.tier])[1];
    return KIND_NAMES[e.kind] || e.kind;
  }

  function call(action, body) {
    var b = Object.assign({ action: action }, body || {});
    return api.token().then(function (t) {
      if (!t) throw { status: 401, error: "signin" };
      return fetch(api.url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + t }, body: JSON.stringify(b) });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw { status: r.status, error: j.error || "", field: j.field || "" };
        return j;
      });
    }, function (err) { throw err && err.status ? err : { status: 0, error: "network" }; });
  }
  function reason(err) {
    if (!err) return "Something went wrong.";
    if (err.status === 401) return "Sign in with Google to save edits.";
    if (err.status === 403) return "This Google account can't edit the map.";
    if (err.status === 0) return "The edits could not be reached. Check the connection and try again.";
    if (err.error === "field") return err.field === "from" || err.field === "to" ? "Check the dates: the first must come no later than the last." : "Check the " + (err.field === "value" ? "value" : err.field) + ".";
    return "The edit could not be saved (" + (err.error || err.status) + ").";
  }

  // The panel.
  var root = el("section", "ch-dev");
  root.id = "dev";
  root.setAttribute("aria-label", "Developer tools");
  var head = el("div", "ch-dev-head");
  head.appendChild(el("p", "ch-layers-title", "Developer tools"));
  var closeBtn = button("Close", "ch-dev-link", function () { hide(); });
  head.appendChild(closeBtn);
  root.appendChild(head);
  var body = el("div", "ch-dev-body");
  root.appendChild(body);
  var status = el("p", "ch-dev-status");
  status.setAttribute("role", "status");
  root.appendChild(status);
  document.body.appendChild(root);

  var tool = null, form = null, lastNow = null, timer = 0;
  function say(text, bad) { status.textContent = text || ""; status.classList.toggle("is-bad", !!bad); }

  function show() {
    root.hidden = false;
    api.opened(true);
    if (allowed) render(); else login("");
    clearInterval(timer);
    timer = setInterval(function () { if (!form && api.now() !== lastNow) renderList(); }, 500);
  }
  function hide() {
    root.hidden = true;
    api.opened(false);
    api.pick(null);
    api.ghost(null);
    clearInterval(timer);
  }

  function login(message) {
    api.pick(null);
    body.textContent = "";
    var f = el("div", "ch-dev-login");
    f.appendChild(el("p", null, "The tools are for Noah's Google account. Sign in with Google in the report panel (the flag), then open them again."));
    var go = button("Check again", "ch-dev-btn is-main", function () {
      go.disabled = true;
      say("Checking…");
      call("check").then(function () {
        allowed = true;
        say("");
        render();
      }, function (err) {
        go.disabled = false;
        say(reason(err), true);
      });
    });
    f.appendChild(go);
    f.appendChild(document.createTextNode(" "));
    f.appendChild(button("Sign in", "ch-dev-btn", function () { api.signIn(); }));
    body.appendChild(f);
    say(message, !!message);
    if (!message) go.click();
  }

  function render() {
    form = null;
    body.textContent = "";
    var seg = el("div", "ch-dev-tools");
    seg.setAttribute("role", "group");
    seg.setAttribute("aria-label", "Tool");
    [["country", "Country"], ["city", "City"], ["label", "Move name"]].forEach(function (t) {
      var b = button(t[1], "ch-dev-tool", function () { setTool(tool === t[0] ? null : t[0]); });
      b.setAttribute("data-tool", t[0]);
      b.setAttribute("aria-pressed", String(tool === t[0]));
      seg.appendChild(b);
    });
    body.appendChild(seg);
    var hint = el("p", "ch-dev-hint", tool === "country" ? "Click a country on the map." : tool === "city" ? "Click a city on the map." : tool === "label" ? "Drag a country's name to where it should sit." : "Choose a tool, then pick on the map.");
    body.appendChild(hint);
    body.appendChild(el("div", "ch-dev-form-slot"));
    var list = el("div", "ch-dev-list");
    body.appendChild(list);
    renderList();
    if (api.failed()) say("The edits could not be loaded, so the map shows none. Reload to try again.", true);
  }
  function setTool(t) {
    tool = t;
    api.pick(t);
    api.ghost(null);
    render();
  }

  function renderList() {
    var list = body.querySelector(".ch-dev-list");
    if (!list) return;
    lastNow = api.now();
    list.textContent = "";
    var now = api.now(), all = api.edits();
    var here = all.filter(function (e) { return e.t0 <= now && now < e.t1; });
    list.appendChild(el("p", "ch-dev-h", "In force on " + api.fmt(now)));
    if (!here.length) list.appendChild(el("p", "ch-dev-none", "No edits at this date."));
    here.slice().reverse().forEach(function (e) { list.appendChild(row(e)); });
    var lost = api.notFound();
    if (lost.length) {
      list.appendChild(el("p", "ch-dev-h", "Not found"));
      list.appendChild(el("p", "ch-dev-hint", "These name a country or city the data no longer has. Edit their target or delete them."));
      lost.forEach(function (e) { list.appendChild(row(e)); });
    }
    list.appendChild(el("p", "ch-dev-count", all.length + (all.length === 1 ? " edit" : " edits") + " in all"));
  }
  function row(e) {
    var r = el("div", "ch-dev-row");
    r.setAttribute("data-id", String(e.id));
    var t = el("p", "ch-dev-row-text");
    if (e.kind === "country-colour") {
      var sw = el("span", "ch-dev-swatch");
      sw.style.background = e.value.hex || api.palette()[e.value.c];
      t.appendChild(sw);
    }
    t.appendChild(document.createTextNode([e.target, describe(e), showDate(e.from) + " to " + showDate(e.to)].join(" | ")));
    r.appendChild(t);
    if (e.note) r.appendChild(el("p", "ch-dev-note", e.note));
    var acts = el("div", "ch-dev-acts");
    acts.appendChild(button("Edit", "ch-dev-link", function () { openForm(e.kind.indexOf("city") === 0 ? "city" : e.kind === "label" ? "label" : "country", { name: e.target, shown: e.target, id: e.target }, e); }));
    acts.appendChild(button("Delete", "ch-dev-link", function () { remove(e); }));
    r.appendChild(acts);
    return r;
  }

  // What a tool picked on the map: a country, a city, or a name dragged to a new place.
  function onPick(kind, info) {
    if (!info) { say(kind === "city" ? "No city there. Zoom in, or click nearer a city's name." : "No country there.", true); return; }
    say("");
    openForm(kind, info, null);
  }

  function field(label, input) {
    var f = el("label", "ch-dev-field");
    f.appendChild(el("span", null, label));
    f.appendChild(input);
    return f;
  }
  function textInput(value, cls) { var i = el("input", cls); i.type = "text"; i.value = value || ""; return i; }

  function openForm(kind, info, edit) {
    var slot = body.querySelector(".ch-dev-form-slot");
    if (!slot) { render(); slot = body.querySelector(".ch-dev-form-slot"); }
    slot.textContent = "";
    var f = el("form", "ch-dev-form");
    form = f;
    var target = kind === "city" ? info.id : info.name;
    var title = el("p", "ch-dev-target", kind === "city" ? info.name + (info.own && info.own !== info.name ? " (" + info.own + ")" : "") : info.shown || info.name);
    f.appendChild(title);
    if (kind === "city" && !edit) f.appendChild(el("p", "ch-dev-hint", "City " + info.id));

    var kinds = kind === "country" ? ["country-colour", "country-name"] : kind === "city" ? ["city-size", "city-name", "city-hide"] : ["label"];
    var chosen = edit ? edit.kind : kinds[0], v = edit ? edit.value || {} : {};
    var kindRow = el("div", "ch-dev-tools ch-dev-kinds");
    if (kinds.length > 1) {
      kinds.forEach(function (k) {
        var b = button(KIND_NAMES[k], "ch-dev-tool", function () { chosen = k; sync(); });
        b.setAttribute("data-kind", k);
        kindRow.appendChild(b);
      });
      f.appendChild(kindRow);
    }

    // Colour
    var colour = el("div", "ch-dev-colour"), pick = v.c !== undefined ? { c: v.c } : v.hex ? { hex: v.hex } : null;
    var swatches = el("div", "ch-dev-swatches");
    api.palette().forEach(function (c, i) {
      var b = button("", "ch-dev-swatch-btn", function () { pick = { c: i }; sync(); });
      b.style.background = c;
      b.setAttribute("aria-label", "Colour " + (i + 1));
      b.setAttribute("data-c", String(i));
      swatches.appendChild(b);
    });
    colour.appendChild(swatches);
    var custom = el("input", "ch-dev-custom");
    custom.type = "color";
    custom.value = v.hex || "#c0392b";
    custom.setAttribute("aria-label", "Any colour");
    custom.addEventListener("input", function () { pick = { hex: custom.value }; sync(); });
    colour.appendChild(field("Any colour", custom));
    f.appendChild(colour);
    // Name
    var nameIn = textInput(v.name || (kind === "city" ? info.name : info.shown || info.name));
    nameIn.maxLength = 120;
    var nameField = field("Name on the map", nameIn);
    f.appendChild(nameField);
    // City size
    var sizeSel = el("select");
    SIZES.forEach(function (s) { var o = el("option", null, s[1]); o.value = String(s[0]); sizeSel.appendChild(o); });
    sizeSel.value = String(v.tier || 2);
    var sizeField = field("Size", sizeSel);
    f.appendChild(sizeField);
    var hideNote = el("p", "ch-dev-hint", "The city isn't shown on these dates.");
    f.appendChild(hideNote);
    // Label
    var where = { lon: v.lon !== undefined ? v.lon : info.lon, lat: v.lat !== undefined ? v.lat : info.lat };
    var whereText = el("p", "ch-dev-hint");
    var lsize = el("input"); lsize.type = "number"; lsize.min = "6"; lsize.max = "60"; lsize.step = "0.5"; lsize.placeholder = "As laid out";
    lsize.value = v.size || info.size || "";
    var lang = el("input"); lang.type = "number"; lang.min = "-90"; lang.max = "90"; lang.step = "1"; lang.placeholder = "Level";
    lang.value = v.angle !== undefined && v.angle !== null ? v.angle : info.angle !== undefined && info.angle !== null ? info.angle : "";
    var labelBox = el("div", "ch-dev-labelset");
    labelBox.appendChild(whereText);
    labelBox.appendChild(field("Size in pixels", lsize));
    labelBox.appendChild(field("Angle in degrees", lang));
    f.appendChild(labelBox);
    var ghost = function () {
      if (where.lon === undefined || where.lon === null) return;
      api.ghost({ target: target, lon: where.lon, lat: where.lat, size: +lsize.value || null, angle: lang.value === "" ? null : +lang.value });
    };
    lsize.addEventListener("input", ghost);
    lang.addEventListener("input", ghost);

    // Dates and note
    var st = edit ? [edit.from, edit.to] : api.stretch();
    var fromIn = textInput(showDate(st[0])), toIn = textInput(showDate(st[1]));
    var dates = el("div", "ch-dev-dates");
    dates.appendChild(field("From", fromIn));
    dates.appendChild(field("To", toIn));
    f.appendChild(dates);
    var noteIn = textInput(edit ? edit.note : "");
    noteIn.maxLength = 499;
    noteIn.placeholder = "Optional";
    f.appendChild(field("Note", noteIn));

    var acts = el("div", "ch-dev-acts");
    var save = button(edit ? "Save changes" : "Save", "ch-dev-btn is-main");
    save.type = "submit";
    acts.appendChild(save);
    acts.appendChild(button("Cancel", "ch-dev-btn", function () { api.ghost(null); slot.textContent = ""; form = null; renderList(); }));
    f.appendChild(acts);

    function sync() {
      kindRow.querySelectorAll("[data-kind]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-kind") === chosen)); });
      colour.hidden = chosen !== "country-colour";
      nameField.hidden = chosen !== "country-name" && chosen !== "city-name";
      sizeField.hidden = chosen !== "city-size";
      hideNote.hidden = chosen !== "city-hide";
      labelBox.hidden = chosen !== "label";
      swatches.querySelectorAll("[data-c]").forEach(function (b) { b.setAttribute("aria-pressed", String(!!pick && pick.c === +b.getAttribute("data-c"))); });
      custom.classList.toggle("is-on", !!pick && !!pick.hex);
      if (chosen === "label") whereText.textContent = where.lon !== undefined && where.lon !== null ? "At " + Math.abs(where.lat).toFixed(2) + "° " + (where.lat < 0 ? "S" : "N") + ", " + Math.abs(where.lon).toFixed(2) + "° " + (where.lon < 0 ? "W" : "E") : "Drag the name on the map to place it.";
    }
    sync();
    if (chosen === "label") ghost();

    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var from = storeDate(fromIn.value), to = storeDate(toIn.value);
      if (!from || !to) { say("Type the dates as 1815, July 1815, or 3 July 1815 (500 BC for years BC).", true); return; }
      var value;
      if (chosen === "country-colour") { if (!pick) { say("Choose a colour.", true); return; } value = pick; }
      else if (chosen === "country-name" || chosen === "city-name") { if (!nameIn.value.trim()) { say("Type a name.", true); return; } value = { name: nameIn.value.trim() }; }
      else if (chosen === "city-size") value = { tier: +sizeSel.value };
      else if (chosen === "label") {
        if (where.lon === undefined || where.lon === null) { say("Drag the name on the map to place it.", true); return; }
        value = { lon: Math.round(where.lon * 1e4) / 1e4, lat: Math.round(where.lat * 1e4) / 1e4, size: +lsize.value || null, angle: lang.value === "" ? null : Math.max(-90, Math.min(90, +lang.value)) };
      } else value = {};
      var out = { kind: chosen, target: target, from: from, to: to, value: value, note: noteIn.value.trim() };
      if (edit && edit.kind === chosen) out.id = edit.id;
      store(out, save);
    });
    slot.appendChild(f);
    var first = f.querySelector("input:not([type=color])");
    if (first && kind !== "label") setTimeout(function () { (chosen === "country-colour" ? swatches.firstChild : first).focus(); }, 0);
  }

  // Saves an edit: the map shows it at once, and goes back if the save is refused.
  function store(edit, btn) {
    var before = api.edits(), tmp = Object.assign({}, edit, { id: edit.id || -Date.now(), updated_at: "~" });
    api.setEdits(before.filter(function (x) { return x.id !== edit.id; }).concat([tmp]));
    api.ghost(null);
    if (btn) btn.disabled = true;
    say("Saving…");
    call("save", { edit: edit }).then(function (r) {
      api.setEdits(api.edits().filter(function (x) { return x.id !== tmp.id && x.id !== r.edit.id; }).concat([r.edit]));
      say("Saved. Everyone sees it within a minute.");
      var slot = body.querySelector(".ch-dev-form-slot");
      if (slot) slot.textContent = "";
      form = null;
      renderList();
    }, function (err) {
      api.setEdits(before);
      if (btn) btn.disabled = false;
      if (err.status === 401 || err.status === 403) { forget(); login(reason(err)); return; }
      say(reason(err), true);
    });
  }
  function remove(e) {
    if (!window.confirm("Delete this edit?\n" + [e.target, describe(e), showDate(e.from) + " to " + showDate(e.to)].join(" | "))) return;
    var before = api.edits();
    api.setEdits(before.filter(function (x) { return x.id !== e.id; }));
    renderList();
    say("Deleting…");
    call("delete", { id: e.id }).then(function () { say("Deleted."); }, function (err) {
      api.setEdits(before);
      renderList();
      if (err.status === 401 || err.status === 403) { forget(); login(reason(err)); return; }
      say(reason(err), true);
    });
  }
  function forget() { allowed = false; }

  root.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); hide(); } });

  api.ui = { show: show, hide: hide, onPick: onPick };
  show();
})();

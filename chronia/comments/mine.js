// CHRONIA's page of the account's own comments and replies (comments/), linked from the Account panel. It reads the
// Google session the atlas keeps (chronia-auth in this site's storage), refreshed as the Premium page refreshes it, and
// asks chronia-comments for `mine` (docs/superpowers/plans/2026-11-24-chronia-comments-api.md): newest first, twenty at a
// time, each with its country and map date, whom a reply answers, its whole text, its upvotes, whether others can see it,
// a link that opens it on the atlas (?y=…&card=…, and &comment=…&root=… for a reply; see "Profiles and comments" in the
// README), and Delete. Text from users (comments, the names they were posted under, usernames) reaches the page only as
// textContent. The page is in the atlas's language: lang.js loads the atlas's translations (window.CH_L), its fixed text
// is translated as the atlas translates its own, and dates are written as the atlas writes them.
(function () {
  "use strict";
  var BASE = "https://jvcmeuqlyygpwelmvxuv.supabase.co/functions/v1/";
  var REPORT = BASE + "chronia-report", COMMENTS = BASE + "chronia-comments", AUTH = "chronia-auth", ATLAS = "../";
  var L10N = window.CH_L || {}, LANG = window.CH_LANG || "en";
  var EN = { "@year": "{y}", "@my": "{month} {y}", "@mdy": "{month} {d}, {y}", "{y} BC": "{y} BC", "AD {y}": "AD {y}" };
  function T(s, o) {
    var t = L10N[s];
    if (t == null) t = EN[s] != null ? EN[s] : s;
    return o ? t.replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }) : t;
  }
  // The page's own text, translated as app.js translates the atlas's (translatePage there).
  (function translatePage(root) {
    if (LANG === "en") return;
    var key = function (v) { return v.replace(/\s+/g, " ").trim(); }, walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = [], n;
    while ((n = walker.nextNode())) list.push(n);
    list.forEach(function (t) {
      if (t.parentElement && t.parentElement.closest("script,style")) return;
      var k = key(t.nodeValue);
      if (k && L10N[k] != null) t.nodeValue = /^\s*/.exec(t.nodeValue)[0] + L10N[k] + /\s*$/.exec(t.nodeValue)[0];
    });
    root.querySelectorAll("[aria-label]").forEach(function (e) { var v = key(e.getAttribute("aria-label")); if (L10N[v] != null) e.setAttribute("aria-label", L10N[v]); });
  })(document.body);
  document.title = T("Your comments") + " | CHRONIA";

  // A comment's map date ("1815", "1941-06", "1941-06-22", "-44" for 44 BC) written as the atlas writes it: its
  // CHRONIA_COMMENTS.when, through parseDate, fmtMDY, monthYear, and fmtYear in app.js, with the same keys for other
  // languages. A date it can't read is shown as it came.
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var MONTHS_L = L10N["@months"] || MONTHS, MONTHS_G = L10N["@monthsOf"] || MONTHS_L;
  function eraYear(y) { return y < 0 ? T("{y} BC", { y: -y }) : y < 1000 ? T("AD {y}", { y: y }) : String(y); }
  function when(at) {
    var m = /^(-)?(\d{1,4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/.exec(String(at == null ? "" : at).trim());
    if (!m || !+m[2]) return String(at);
    var y = +m[2], mo = m[3] ? +m[3] : 0, d = m[4] ? +m[4] : 0;
    if (mo > 12 || (d && !mo)) return String(at);
    if (d && (d < 1 || d > [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0 || y < 1582)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1])) return String(at);
    if (m[1]) y = -y;
    var yy = y > 0 ? String(y) : eraYear(y);
    if (d) return T("@mdy", { month: MONTHS_G[mo - 1], m: mo, d: d, y: yy });
    if (mo) return T("@my", { month: MONTHS_L[mo - 1], m: mo, y: yy });
    return T("@year", { y: eraYear(y) });
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function button(text, cls, on) {
    var b = el("button", cls, text);
    b.type = "button";
    b.addEventListener("click", on);
    return b;
  }
  function link(text, href, cls) {
    var a = el("a", cls, text);
    a.href = href;
    return a;
  }
  // A translated sentence with elements in its {places}.
  function fill(parent, text, parts) {
    text.split(/(\{\w+\})/).forEach(function (s) {
      var k = /^\{(\w+)\}$/.exec(s);
      if (k && parts[k[1]]) parent.appendChild(parts[k[1]]);
      else if (s) parent.appendChild(document.createTextNode(s));
    });
    return parent;
  }

  // The atlas's session, refreshed (and kept again for the atlas) when it is near its end, as premium.js does.
  var session = null;
  try { session = JSON.parse(localStorage.getItem(AUTH) || "null"); } catch (e) {}
  if (!session || typeof session.a !== "string" || typeof session.r !== "string") session = null;
  function post(url, body, tok) {
    var headers = { "Content-Type": "application/json" };
    if (tok) headers.Authorization = "Bearer " + tok;
    return fetch(url, { method: "POST", headers: headers, body: JSON.stringify(body) }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (j) { return { status: res.status, body: j || {} }; });
    }, function () { return { status: 0, body: {} }; });
  }
  function claims(tok) {
    try {
      var p = tok.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p), function (ch) { return ch.charCodeAt(0); }))) || {};
    } catch (e) { return {}; }
  }
  function drop() { session = null; try { localStorage.removeItem(AUTH); } catch (e) {} }
  // The token, or null signed out (or when the session can't be refreshed); { status: 0 } when chronia-report can't be reached.
  function token() {
    if (!session) return Promise.resolve(null);
    if ((session.e || 0) - Date.now() > 60000) return Promise.resolve(session.a);
    return post(REPORT, { action: "refresh", refresh_token: session.r }).then(function (r) {
      if (r.status !== 200 || typeof r.body.access_token !== "string") {
        if (!r.status) return { status: 0 };
        if (r.status === 401) drop();
        return null;
      }
      session = { a: r.body.access_token, r: r.body.refresh_token, e: (+claims(r.body.access_token).exp || 0) * 1000 };
      try { localStorage.setItem(AUTH, JSON.stringify(session)); } catch (e) {}
      return session.a;
    });
  }
  // chronia-comments, signed: { status, body }; status 401 when there is no session to sign with.
  function ask(body) {
    return token().then(function (t) {
      if (t && typeof t === "object") return { status: 0, body: {} };
      if (!t) return { status: 401, body: { error: "signin" } };
      return post(COMMENTS, body, t).then(function (r) { if (r.status === 401) drop(); return r; });
    });
  }
  function trouble(r) {
    if (!r.status) return T("The comments could not be reached. Check the connection and try again.");
    return T("Something went wrong on the server ({status}). Try again in a minute.", { status: r.status });
  }

  var status = document.getElementById("mc-status"), retry = document.getElementById("mc-retry"), count = document.getElementById("mc-count");
  var list = document.getElementById("mc-list"), more = document.getElementById("mc-more"), said = document.getElementById("mc-said");
  var items = [], hasMore = false, busy = false;

  function setStatus(text, parts) {
    status.textContent = "";
    if (text) fill(status, text, parts || {});
    status.hidden = !text;
  }
  function signedOut() {
    items = []; hasMore = false;
    render();
    setStatus(T("Sign in on {atlas} to see your comments."), { atlas: link(T("the atlas"), ATLAS) });
  }
  function failed(r) {
    setStatus(trouble(r));
    retry.parentNode.hidden = false;
  }
  function render() {
    list.textContent = "";
    items.forEach(function (c) { list.appendChild(row(c)); });
    more.hidden = more.parentNode.hidden = !hasMore;
    count.hidden = !items.length;
    count.textContent = hasMore ? T("Showing the newest {n} comments", { n: items.length }) : items.length === 1 ? T("Showing 1 comment") : T("Showing {n} comments", { n: items.length });
    if (!items.length && !busy) {
      var back = link(T("Back to the atlas"), ATLAS);
      setStatus(T("You haven't commented yet.") + " {back}", { back: back });
    } else if (items.length) setStatus("");
  }

  function load(off) {
    if (busy) return;
    busy = true;
    retry.parentNode.hidden = true;
    more.disabled = true;
    if (!off) setStatus(T("Loading"));
    list.setAttribute("aria-busy", "true");
    ask(off ? { action: "mine", offset: off } : { action: "mine" }).then(function (r) {
      busy = false;
      more.disabled = false;
      list.removeAttribute("aria-busy");
      if (r.status === 200 && Array.isArray(r.body.comments)) {
        var have = new Set(items.map(function (c) { return c.id; })), first = null;
        r.body.comments.forEach(function (c) { if (c && !have.has(c.id)) { items.push(c); have.add(c.id); if (first === null) first = c.id; } });
        hasMore = !!r.body.more;
        render();
        // After More, the keyboard goes on to the first of the new ones.
        if (off && first !== null) focusRow(first);
        return;
      }
      if (r.status === 401) { signedOut(); return; }
      // No profile yet: nothing has been written under one.
      if (r.status === 403 && r.body.error === "profile") { items = []; hasMore = false; render(); return; }
      if (off) { said.textContent = trouble(r); return; }
      failed(r);
    });
  }
  function focusRow(id) {
    var a = list.querySelector('li[data-id="' + id + '"] .mc-open');
    if (a) a.focus();
  }

  // The address that opens a comment on the atlas: its date and its country's card, and for a reply its thread, marked.
  function onMap(c) {
    var reply = c.parent !== null && c.parent !== undefined;
    return ATLAS + "?y=" + encodeURIComponent(c.at) + "&card=" + encodeURIComponent(c.polity) + (reply ? "&comment=" + encodeURIComponent(c.id) + "&root=" + encodeURIComponent(c.root || c.parent) : "");
  }
  function row(c) {
    var li = el("li", "mc-item");
    li.setAttribute("data-id", String(c.id));
    var head = el("h2", "mc-where"), polity = el("span", "mc-polity", c.polity);
    polity.dir = "auto";
    head.appendChild(polity);
    head.appendChild(el("span", "mc-date", " | " + when(c.at)));
    li.appendChild(head);
    if (c.parent !== null && c.parent !== undefined) {
      var to = el("p", "mc-to", c.replying_to ? T("Reply to @{name}", { name: c.replying_to }) : T("A reply"));
      to.dir = "auto";
      li.appendChild(to);
    }
    var text = el("p", "mc-text", c.text);
    text.dir = "auto";
    li.appendChild(text);
    var acts = el("p", "mc-acts");
    li.appendChild(acts);
    drawActs(c, acts);
    return li;
  }
  // The row's last line: its upvotes, Hidden from others, Open on the map, and Delete; or, after Delete, the question.
  function drawActs(c, acts, why) {
    acts.textContent = "";
    var add = function (n) { if (acts.firstChild) acts.appendChild(document.createTextNode(" | ")); acts.appendChild(n); };
    var n = +c.votes || 0;
    add(el("span", "mc-votes", n === 1 ? T("1 upvote") : T("{n} upvotes", { n: n })));
    if (c.state && c.state !== "live") add(el("span", "mc-hidden", T("Hidden from others")));
    add(link(T("Open on the map"), onMap(c), "mc-open"));
    var del = button(T("Delete"), "mc-link mc-del", function () { ask1(c, acts); });
    add(del);
    if (why) { acts.appendChild(document.createTextNode(" ")); acts.appendChild(el("span", "mc-why", why)); }
    return del;
  }
  function ask1(c, acts) {
    acts.textContent = "";
    acts.appendChild(el("span", "mc-ask", T("Delete this comment? This can't be undone.")));
    acts.appendChild(document.createTextNode(" "));
    var yes = button(T("Delete"), "mc-link mc-confirm", function () { remove(c, acts, yes, no); });
    var no = button(T("Cancel"), "mc-link mc-cancel", function () { drawActs(c, acts).focus(); });
    acts.appendChild(yes);
    acts.appendChild(document.createTextNode(" | "));
    acts.appendChild(no);
    no.focus();
  }
  function remove(c, acts, yes, no) {
    yes.disabled = no.disabled = true;
    ask({ action: "delete", id: c.id }).then(function (r) {
      if (r.status === 200 || r.status === 404) {
        var i = items.indexOf(c), next = items[i + 1] || items[i - 1] || null;
        items = items.filter(function (x) { return x !== c; });
        said.textContent = "";
        said.textContent = T("Your comment is deleted.");
        render();
        if (next) focusRow(next.id);
        else if (hasMore) load(0);
        else status.querySelector("a") && status.querySelector("a").focus();
        return;
      }
      if (r.status === 401) { signedOut(); return; }
      var why = trouble(r);
      said.textContent = why;
      drawActs(c, acts, why).focus();
    });
  }

  more.addEventListener("click", function () { load(items.length); });
  retry.addEventListener("click", function () { load(0); });
  if (!session) signedOut();
  else load(0);
})();

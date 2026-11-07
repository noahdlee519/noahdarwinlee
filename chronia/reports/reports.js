// The page of CHRONIA's reports of errors on the map. CHRONIA's team is a list of Google accounts (the table
// chronia_team): someone on it who has signed in with Google on the atlas (the report panel's session, kept
// under chronia-auth in this site's storage) gets in at once, to read, or, as a reviewer (Noah), to answer
// as well and see the reporters' emails. Until the fact checkers' accounts are on the list, the team's
// password still opens the page to read; it is kept for this tab only (sessionStorage). Each report links to
// the atlas at its place and first date; a reviewer can mark it fixed or declined, with a reply, or open it
// again. Until 6 November 2026 Noah's own password opened the page to answer.
(function () {
  var URL_ = "https://jvcmeuqlyygpwelmvxuv.supabase.co/functions/v1/chronia-report", STORE = "chronia-review", AUTH = "chronia-auth";
  var $ = function (id) { return document.getElementById(id); };
  var lock = $("lock"), pass = $("pass"), lockNote = $("lock-note"), board = $("board"), list = $("list"), count = $("count");
  var pw = "", status = "open", busy = false, role = "", session = null, viaGoogle = false;
  try { pw = sessionStorage.getItem(STORE) || ""; } catch (e) {}
  try { session = JSON.parse(localStorage.getItem(AUTH) || "null"); } catch (e) {}
  if (!session || typeof session.a !== "string" || typeof session.r !== "string") session = null;

  function post(body, token) {
    var headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = "Bearer " + token;
    return fetch(URL_, { method: "POST", headers: headers, body: JSON.stringify(body) }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (j) { return { status: res.status, body: j }; });
    }, function () { return { status: 0, body: {} }; });
  }
  function expiry(token) {
    try { return (JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).exp || 0) * 1000; } catch (e) { return 0; }
  }
  // The atlas's Google session, refreshed (and kept again for the atlas) when it is near its end.
  function token() {
    if (!session) return Promise.resolve(null);
    if ((session.e || 0) - Date.now() > 60000) return Promise.resolve(session.a);
    return post({ action: "refresh", refresh_token: session.r }).then(function (r) {
      if (r.status !== 200) { session = null; return null; }
      session = { a: r.body.access_token, r: r.body.refresh_token, e: expiry(r.body.access_token) };
      try { localStorage.setItem(AUTH, JSON.stringify(session)); } catch (e) {}
      return session.a;
    });
  }
  function call(body) {
    if (!viaGoogle) { body.password = pw; return post(body); }
    return token().then(function (t) { return t ? post(body, t) : { status: 401, body: { error: "signin" } }; });
  }
  function trouble(r) {
    if (r.status === 0) return "The reports server could not be reached.";
    if (r.status === 401) return viaGoogle ? "Your Google sign-in has run out. Sign in again on the atlas." : "That password is not right.";
    if (r.status === 403) return r.body && r.body.error === "team" ? "That Google account isn't on CHRONIA's team." : "Only Noah can answer reports.";
    if (r.status === 429) return "Too many wrong passwords from here today. Try again tomorrow.";
    if (r.status === 503) return "Reports are not switched on yet: the passwords are not set in Supabase.";
    return "Something went wrong on the server (" + r.status + ").";
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function when(iso) {
    var d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function mapLink(r) {
    return "../#y=" + encodeURIComponent(r.at_time) + "&v=" + r.lon.toFixed(2) + "," + r.lat.toFixed(2) + "," + Math.max(3, +r.zoom || 0).toFixed(2);
  }
  function span(r) { return r.date_from === r.date_to ? r.date_from : r.date_from + " to " + r.date_to; }
  function item(r) {
    var li = el("li", "rp-item");
    var head = el("p", "rp-head"), num = el("span", "cp-n", String(r.id));
    head.appendChild(num);
    head.appendChild(document.createTextNode(span(r)));
    li.appendChild(head);
    li.appendChild(el("p", "rp-meta", [r.place || "No state", Math.abs(r.lat).toFixed(2) + "° " + (r.lat < 0 ? "S" : "N") + ", " + Math.abs(r.lon).toFixed(2) + "° " + (r.lon < 0 ? "W" : "E"), "from " + r.reporter + (r.email ? " (" + r.email + ")" : ""), when(r.created_at), r.status === "open" ? "open" : r.status + (r.closed_at ? " " + when(r.closed_at) : "")].join(" | ")));
    li.appendChild(el("p", "rp-text", r.note));
    if (role !== "reviewer") {
      if (r.reply) li.appendChild(el("p", "rp-reply", "Reply: " + r.reply));
      var only = el("div", "rp-acts"), go = el("a", "", "Open on the map");
      go.href = mapLink(r);
      go.target = "_blank";
      go.rel = "noopener";
      only.appendChild(go);
      li.appendChild(only);
      return li;
    }
    var id = "reply-" + r.id, lab = el("label", "", "Reply or what was done");
    lab.htmlFor = id;
    var reply = el("textarea");
    reply.id = id;
    reply.maxLength = 2000;
    reply.value = r.reply || "";
    li.appendChild(lab);
    li.appendChild(reply);
    var acts = el("div", "rp-acts"), a = el("a", "", "Open on the map");
    a.href = mapLink(r);
    a.target = "_blank";
    a.rel = "noopener";
    acts.appendChild(a);
    var note = el("span", "rp-note");
    var act = function (label, to) {
      var b = el("button", "", label);
      b.type = "button";
      b.addEventListener("click", function () {
        if (busy) return;
        busy = true;
        note.textContent = "Saving…";
        call({ action: "set", id: r.id, status: to, reply: reply.value }).then(function (res) {
          busy = false;
          if (res.status === 200) load(); else note.textContent = trouble(res);
        });
      });
      acts.appendChild(document.createTextNode(" | "));
      acts.appendChild(b);
    };
    if (r.status === "open") { act("Mark fixed", "fixed"); act("Decline", "declined"); act("Save the reply", "open"); }
    else { act("Open again", "open"); act("Save the reply", r.status); }
    acts.appendChild(note);
    li.appendChild(acts);
    return li;
  }
  function load() {
    count.textContent = "Loading…";
    return call({ action: "list", status: status }).then(function (r) {
      if (r.status !== 200) { shut(trouble(r)); return; }
      role = r.body.role || "viewer";
      var rows = r.body.reports || [];
      list.textContent = "";
      if (!rows.length) list.appendChild(el("li", "rp-empty", status === "open" ? "No open reports." : "None."));
      rows.forEach(function (row) { list.appendChild(item(row)); });
      count.textContent = rows.length + (rows.length === 1 ? " report" : " reports");
    });
  }
  function shut(msg) {
    pw = "";
    viaGoogle = false;
    try { sessionStorage.removeItem(STORE); } catch (e) {}
    board.hidden = true;
    lock.hidden = false;
    lockNote.textContent = msg || "";
    pass.focus();
  }
  function open() {
    if (!viaGoogle) try { sessionStorage.setItem(STORE, pw); } catch (e) {}
    lock.hidden = true;
    board.hidden = false;
    lockNote.textContent = "";
    load();
  }
  lock.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy || !pass.value) return;
    busy = true;
    pw = pass.value;
    lockNote.textContent = "Checking…";
    call({ action: "check" }).then(function (r) {
      busy = false;
      if (r.status === 200) { role = r.body.role; pass.value = ""; open(); }
      else shut(trouble(r));
    });
  });
  board.querySelectorAll("[data-status]").forEach(function (b) {
    b.addEventListener("click", function () {
      status = b.getAttribute("data-status");
      board.querySelectorAll("[data-status]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      load();
    });
  });
  $("out").addEventListener("click", function () { shut(""); });
  if (session) {
    viaGoogle = true;
    lockNote.textContent = "Checking your Google account…";
    call({ action: "check" }).then(function (r) {
      if (r.status === 200) { role = r.body.role; open(); return; }
      var why = trouble(r);
      viaGoogle = false;
      if (pw) open(); else { lockNote.textContent = why; pass.focus(); }
    });
  } else if (pw) open(); else pass.focus();
})();

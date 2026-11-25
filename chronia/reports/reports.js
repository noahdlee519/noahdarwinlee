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
    // A report from an account with CHRONIA Premium comes first in the list (the function sorts it), and says so.
    if (r.premium) head.appendChild(el("span", "rp-premium", "Premium | first in the queue"));
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
    cm.shut();
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
    cm.open(viaGoogle);
  }
  // The team's list of comments and profile pictures, from the chronia-comments function's queue (see
  // docs/superpowers/plans/2026-11-24-chronia-comments-api.md). It needs the Google sign-in: the team's password opens
  // the reports alone. A viewer sees it all; a reviewer can restore, remove, or block, keep or remove a picture, move
  // the comments of a name the map no longer has, and erase an account. Each button acts on its row alone, which
  // changes in place, or shows on itself why it could not.
  var cm = (function () {
    var C_URL = "https://jvcmeuqlyygpwelmvxuv.supabase.co/functions/v1/chronia-comments";
    var sec = $("cm"), bar = $("cm-bar"), cCount = $("cm-count"), cNote = $("cm-note"), cList = $("cm-list"),
      pics = $("cm-pics"), blockedList = $("cm-blocked"), names = $("cm-names"), namesList = names.querySelector("ol"),
      namesNote = $("cm-names-note"), polities = $("cm-polities");
    var STATES = { live: "live with reports", hidden: "hidden", removed: "removed" };
    var PICS = { ok: "reported", hidden: "hidden", removed: "removed" };
    var q = null, cRole = "", filter = "all", blocked = {}, erased = {}, mapNames = null, gen = 0;

    function ccall(body) {
      return token().then(function (t) {
        if (!t) return { status: 401, body: { error: "signin" } };
        return fetch(C_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + t }, body: JSON.stringify(body) }).then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (j) { return { status: res.status, body: j }; });
        }, function () { return { status: 0, body: {} }; });
      });
    }
    function why(r) {
      var e = (r.body && r.body.error) || "";
      if (r.status === 0) return "The comments server could not be reached.";
      if (r.status === 401) return "Your Google sign-in has run out. Sign in again on the atlas.";
      if (e === "team") return "That Google account isn't on CHRONIA's team.";
      if (e === "review") return "Only a reviewer can do this.";
      if (e === "missing") return "That is no longer there. Reload the page.";
      if (e === "field" || e === "body") return "The server did not accept that (" + (r.body.field || e) + ").";
      return "Something went wrong on the server (" + r.status + ").";
    }
    function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
    // The writer's picture, or the first letter of the name on a disc, as on the atlas.
    function face(name, avatar, cls) {
      if (avatar) {
        var img = el("img", cls);
        img.src = avatar;
        img.alt = "";
        img.width = img.height = cls === "cm-pic" ? 112 : 36;
        return img;
      }
      return el("span", cls + " cm-face", (name || "?").charAt(0).toUpperCase());
    }
    function button(label, run, row) {
      var b = el("button", "", label);
      b.type = "button";
      b.addEventListener("click", function () { run(b, row); });
      return b;
    }
    // Sends one action for a row: the row's buttons wait, and the row shows the error if it fails.
    function act(row, body, done) {
      var err = row.querySelector(".cm-err");
      if (row.getAttribute("aria-busy") === "true") return;
      row.setAttribute("aria-busy", "true");
      row.querySelectorAll("button, input").forEach(function (b) { b.disabled = true; });
      err.textContent = "Saving…";
      ccall(body).then(function (r) {
        row.removeAttribute("aria-busy");
        row.querySelectorAll("button, input").forEach(function (b) { b.disabled = false; });
        if (r.status === 200) { err.textContent = ""; done(r.body); }
        else err.textContent = why(r);
      });
    }
    function acts(row) {
      var a = el("div", "rp-acts"), first = true;
      return {
        el: a,
        add: function (node) {
          if (!first) a.appendChild(document.createTextNode(" | "));
          first = false;
          a.appendChild(node);
        },
        end: function () { a.appendChild(el("span", "rp-note cm-err")); row.appendChild(a); }
      };
    }
    function gone(li, username) {
      li.textContent = "";
      li.classList.add("cm-gone");
      li.appendChild(el("p", "rp-meta", (username || "This account") + "'s account was erased: its profile, picture, and comments are gone."));
    }

    function commentRow(c) {
      var li = el("li", "rp-item cm-item");
      li.setAttribute("data-id", String(c.id));
      li.setAttribute("data-user", c.user || "");
      fillComment(li, c);
      return li;
    }
    function fillComment(li, c) {
      li.textContent = "";
      li.setAttribute("data-state", c.state);
      if (erased[c.user]) { gone(li, c.username); return; }
      var head = el("p", "rp-head cm-head");
      head.appendChild(face(c.username, c.avatar, "cm-av"));
      head.appendChild(el("span", "cm-name", c.username || "(no name)"));
      li.appendChild(head);
      var meta = el("p", "rp-meta cm-meta");
      // A reply says which comment it answers, by its number, so its thread can be found.
      var where = [c.polity || "", c.at || ""];
      if (c.parent) where.push("reply to #" + c.parent);
      meta.appendChild(document.createTextNode(where.concat(plural(c.flags || 0, "report", "reports")).join(" | ") + " | "));
      meta.appendChild(el("span", "cm-state cm-" + c.state, c.state === "live" && !c.flags ? "live" : STATES[c.state] || c.state));
      if (blocked[c.user]) meta.appendChild(el("span", "cm-tag", "blocked"));
      li.appendChild(meta);
      li.appendChild(el("p", "rp-text cm-text", c.text || ""));
      if (cRole !== "reviewer") return;
      var a = acts(li);
      var swap = function (body) { return function () { act(li, body, function (r) { if (r.comment) { merge(c, r.comment); } fillComment(li, c); counts(); }); }; };
      if (c.state !== "live") a.add(button("Restore", swap({ action: "restore", id: c.id })));
      if (c.state !== "removed") a.add(button("Remove", swap({ action: "remove", id: c.id })));
      var on = !blocked[c.user];
      a.add(button(on ? "Block" : "Unblock", function () {
        act(li, { action: "block", user: c.user, on: on }, function () { setBlocked(c.user, c.username, on); });
      }));
      a.add(button("Erase account", function () { ask(li, c.user, c.username); }));
      a.end();
    }
    function merge(c, n) {
      ["state", "flags", "text", "polity", "at", "avatar", "username", "parent", "root"].forEach(function (k) { if (n[k] !== undefined) c[k] = n[k]; });
      if (c.state === "live" && n.flags === undefined) c.flags = 0;
    }
    // Erase is asked in the row: it names the account and says it cannot be undone.
    function ask(li, user, username) {
      if (li.querySelector(".cm-ask")) return;
      var box = el("div", "cm-ask");
      box.setAttribute("role", "group");
      box.setAttribute("aria-label", "Erase " + username + "'s account?");
      box.appendChild(el("p", "", "Erase " + username + "'s account: the profile, the picture, every comment, and every report it made? Others' replies to its comments stay, under \"Deleted comment\". This cannot be undone."));
      var row = el("div", "rp-acts");
      var yes = button("Erase " + username, function () {
        box.remove();
        act(li, { action: "erase", user: user }, function () { eraseAll(user, username); });
      });
      yes.className = "cm-danger";
      var no = button("Cancel", function () { box.remove(); });
      row.appendChild(yes);
      row.appendChild(document.createTextNode(" | "));
      row.appendChild(no);
      box.appendChild(row);
      li.insertBefore(box, li.querySelector(".rp-acts"));
      no.focus();
    }
    function eraseAll(user, username) {
      erased[user] = true;
      delete blocked[user];
      sec.querySelectorAll("li[data-user]").forEach(function (li) { if (li.getAttribute("data-user") === user) gone(li, username); });
      counts();
    }
    function setBlocked(user, username, on) {
      if (on) blocked[user] = username || user; else delete blocked[user];
      q.comments.forEach(function (c) {
        if (c.user !== user) return;
        var li = cList.querySelector('li[data-id="' + c.id + '"]');
        if (li) fillComment(li, c);
      });
      drawBlocked();
    }

    function picRow(p) {
      var li = el("li", "rp-item cm-item cm-picrow");
      li.setAttribute("data-user", p.user || "");
      fillPic(li, p);
      return li;
    }
    function fillPic(li, p) {
      li.textContent = "";
      if (erased[p.user]) { gone(li, p.username); return; }
      li.appendChild(face(p.username, p.avatar, "cm-pic"));
      var body = el("div", "cm-picbody");
      body.appendChild(el("p", "rp-head cm-head", p.username || "(no name)"));
      var meta = el("p", "rp-meta cm-meta");
      meta.appendChild(document.createTextNode(plural(p.flags || 0, "report", "reports") + " | "));
      meta.appendChild(el("span", "cm-state cm-" + p.state, p.kept ? "kept" : PICS[p.state] || p.state));
      body.appendChild(meta);
      li.appendChild(body);
      if (cRole !== "reviewer") return;
      var a = acts(body);
      var set = function (on) {
        return function () { act(li, { action: "picture", user: p.user, on: on }, function () { p.state = on ? "ok" : "removed"; p.kept = on; fillPic(li, p); }); };
      };
      if (!p.kept || p.state !== "ok") a.add(button(p.state === "removed" ? "Restore" : "Keep", set(true)));
      if (p.state !== "removed") a.add(button("Remove", set(false)));
      a.end();
    }
    function drawBlocked() {
      blockedList.textContent = "";
      var users = Object.keys(blocked);
      if (!users.length) { blockedList.appendChild(el("li", "rp-empty", "No account is blocked.")); return; }
      users.forEach(function (user) {
        var li = el("li", "rp-item cm-item cm-short");
        li.setAttribute("data-user", user);
        li.appendChild(el("span", "cm-name", blocked[user]));
        if (cRole === "reviewer") {
          var a = acts(li);
          a.add(button("Unblock", function () { act(li, { action: "block", user: user, on: false }, function () { setBlocked(user, blocked[user], false); }); }));
          a.end();
        }
        blockedList.appendChild(li);
      });
    }

    // Names the comments are stored under that the map's polities lack, found when the part is first opened.
    function drawNames() {
      namesList.textContent = "";
      var have = {};
      mapNames.forEach(function (n) { have[n] = true; });
      var known = {};
      q.comments.forEach(function (c) { known[c.polity] = (known[c.polity] || 0) + 1; });
      var list = (q.names || []).map(function (n) { return typeof n === "string" ? { name: n } : n; })
        .filter(function (n) { return n && typeof n.name === "string" && !have[n.name]; })
        .sort(function (a, b) { return a.name.localeCompare(b.name); });
      if (!list.length) { namesList.appendChild(el("li", "rp-empty", "Every name with comments is on the map.")); return; }
      list.forEach(function (n) {
        var li = el("li", "rp-item cm-item cm-short");
        li.setAttribute("data-name", n.name);
        li.appendChild(el("span", "cm-name", n.name));
        var k = typeof n.count === "number" ? plural(n.count, "comment", "comments") : known[n.name] ? known[n.name] + " reported, hidden, or removed" : "";
        if (k) li.appendChild(el("span", "cm-count", k));
        if (cRole === "reviewer") {
          var a = acts(li), id = "move-" + Math.random().toString(36).slice(2), lab = el("label", "cm-to", "Move to");
          var box = el("input");
          box.id = id;
          box.type = "text";
          box.setAttribute("list", "cm-polities");
          box.autocomplete = "off";
          lab.htmlFor = id;
          var wrap = el("span", "cm-move");
          wrap.appendChild(lab);
          wrap.appendChild(box);
          a.add(wrap);
          a.el.appendChild(document.createTextNode(" "));
          a.el.appendChild(button("Move", function () {
            var to = box.value.trim(), err = li.querySelector(".cm-err");
            if (!have[to]) { err.textContent = "“" + to + "” is not a name on the map."; return; }
            act(li, { action: "move", from: n.name, to: to }, function (r) {
              var moved = +r.moved || 0;
              q.comments.forEach(function (c) {
                if (c.polity !== n.name) return;
                c.polity = to;
                var row = cList.querySelector('li[data-id="' + c.id + '"]');
                if (row) fillComment(row, c);
              });
              li.textContent = "";
              li.appendChild(el("span", "cm-name", n.name));
              li.appendChild(el("span", "cm-count", "Moved " + plural(moved, "comment", "comments") + " to " + to + "."));
            });
          }));
          a.end();
        }
        namesList.appendChild(li);
      });
    }
    names.addEventListener("toggle", function () {
      if (!names.open || mapNames || !q) return;
      var g = gen;
      namesNote.textContent = "Loading the map's names…";
      fetch("../data/eras.json").then(function (r) { return r.json(); }).then(function (d) {
        if (g !== gen) return;
        mapNames = (d.polities || []).map(function (p) { return p[0]; }).filter(function (n) { return typeof n === "string"; });
        var frag = document.createDocumentFragment();
        mapNames.slice().sort().forEach(function (n) { var o = document.createElement("option"); o.value = n; frag.appendChild(o); });
        polities.textContent = "";
        polities.appendChild(frag);
        namesNote.textContent = "Countries that comments were posted under and that the map no longer has, after a change to its data.";
        drawNames();
      }, function () { if (g === gen) namesNote.textContent = "The map's names could not be loaded."; });
    });

    function counts() {
      var n = { live: 0, hidden: 0, removed: 0 };
      q.comments.forEach(function (c) { if (!erased[c.user] && n[c.state] !== undefined) n[c.state]++; });
      cCount.textContent = [plural(n.live, "live with reports", "live with reports"), n.hidden + " hidden", n.removed + " removed"].join(" | ");
    }
    function show() {
      cList.querySelectorAll("li[data-id]").forEach(function (li) {
        li.hidden = filter !== "all" && li.getAttribute("data-state") !== filter;
      });
      var none = cList.querySelector(".rp-empty");
      if (none) none.remove();
      if (!cList.querySelector("li[data-id]:not([hidden])")) cList.appendChild(el("li", "rp-empty", q.comments.length ? "None in this list." : "No reported, hidden, or removed comments."));
    }
    bar.querySelectorAll("[data-cstate]").forEach(function (b) {
      b.addEventListener("click", function () {
        filter = b.getAttribute("data-cstate");
        bar.querySelectorAll("[data-cstate]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        if (q) show();
      });
    });

    function clear() {
      gen++;
      q = null; blocked = {}; erased = {};
      cList.textContent = pics.textContent = blockedList.textContent = namesList.textContent = "";
      cCount.textContent = cNote.textContent = "";
      names.open = false;
    }
    return {
      shut: function () { clear(); sec.hidden = true; },
      open: function (google) {
        clear();
        sec.hidden = false;
        sec.classList.toggle("cm-off", !google);
        if (!google) { cNote.textContent = "Comments are open to the team's Google accounts only: sign in on the atlas to see them."; return; }
        var g = gen;
        cCount.textContent = "Loading…";
        ccall({ action: "queue" }).then(function (r) {
          if (g !== gen) return;
          if (r.status !== 200) { cCount.textContent = ""; cNote.textContent = why(r); sec.classList.add("cm-off"); return; }
          q = r.body;
          q.comments = q.comments || [];
          cRole = q.role || role || "viewer";
          (q.blocked || []).forEach(function (b) { blocked[b.user] = b.username || b.user; });
          q.comments.forEach(function (c) { cList.appendChild(commentRow(c)); });
          (q.pictures || []).forEach(function (p) { pics.appendChild(picRow(p)); });
          if (!(q.pictures || []).length) pics.appendChild(el("li", "rp-empty", "No reported or hidden pictures."));
          drawBlocked();
          counts();
          show();
        });
      }
    };
  })();

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

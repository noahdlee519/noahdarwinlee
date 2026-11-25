// CHRONIA's comments on a country's card, and the profile (a username and a picture) they are written under (see
// docs/superpowers/specs/2026-11-24-chronia-comments-design.md), with replies in a wider thread window, upvotes, and the
// account's own comments in the Account panel (2026-11-25-chronia-replies-votes-design.md). app.js loads this file the
// first time a country's card opens, or the Account panel opens signed in, and hands it window.CHRONIA_COMMENTS;
// everything here talks only to the chronia-comments function, whose contract is
// docs/superpowers/plans/2026-11-24-chronia-comments-api.md. Text from users (usernames, comments, and the names comments
// were posted under) reaches the page only as textContent.
(function () {
  "use strict";
  var api = window.CHRONIA_COMMENTS;
  if (!api) return;
  var T = api.T;
  var MAX = 500, LOW = 10, CACHE_MS = 60000, NAME_PAUSE = 450, PIC_SIDE = 256, PIC_MAX = 200 * 1024, FILE_MAX = 30 * 1024 * 1024;
  var NAME_RE = /^[A-Za-z][A-Za-z0-9_]{2,19}$/;
  var AGE = "I am 13 or older, and old enough in my country to use this without a parent's consent (16 in some of Europe).";
  var RULE = "3 to 20 characters: letters, numbers, and underscores, starting with a letter.";
  var $ = function (id) { return document.getElementById(id); };
  var rule = $("cm-rule"), sec = $("cm"), head = $("cm-head"), body = $("cm-body");
  var acctBox = $("account-profile"), acctFace = $("account-face"), acctUser = $("account-username"), acctEdit = $("account-edit"), acctForm = $("account-form");
  var thBox = $("thread"), thName = $("thread-name"), thBody = $("thread-body"), thClose = $("thread-close");
  if (!sec || !body) return;
  // Replies, upvotes, and the account's own comments came with the function of 25 November 2026. A page served beside
  // the function before it is told so by its answers: comments without `votes` in a list, or 400 `action` to thread,
  // vote, or mine. Until the function is known to have them, they are not offered. tree: true, false, or null (not
  // known yet); gone: an action was refused as unknown, which no later list undoes.
  var feat = { tree: null, gone: false };
  function treeOn() { return feat.tree === true && !feat.gone; }
  function unknownAction(r) { return r.status === 400 && r.body && r.body.error === "action"; }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function button(text, cls, on) {
    var b = el("button", cls, text);
    b.type = "button";
    if (on) b.addEventListener("click", on);
    return b;
  }
  // A translated sentence with elements in its {places}.
  function fill(parent, text, parts) {
    text.split(/(\{\w+\})/).forEach(function (s) {
      var m = /^\{(\w+)\}$/.exec(s);
      if (m && parts[m[1]]) parent.appendChild(parts[m[1]]);
      else if (s) parent.appendChild(document.createTextNode(s));
    });
    return parent;
  }
  // A picture, or the username's initial on a disc.
  function face(user, url, cls) {
    var box = el("span", "ch-cm-face" + (cls ? " " + cls : ""));
    var ini = el("span", "ch-cm-initial", (String(user || "").trim().charAt(0) || "?").toUpperCase());
    ini.setAttribute("aria-hidden", "true");
    if (url) {
      var im = el("img", "ch-cm-pic");
      im.alt = "";
      im.loading = "lazy";
      im.decoding = "async";
      im.referrerPolicy = "no-referrer";
      im.addEventListener("error", function () { im.replaceWith(ini); });
      im.src = url;
      box.appendChild(im);
    } else box.appendChild(ini);
    return box;
  }

  // The function: { status, body }, with status 0 where it could not be reached. A 401 to a signed request drops the
  // session, as the report panel does, so the Account panel and the composer offer sign-in again.
  var expired = false;
  function ask(payload, signed) {
    var go = function (tok) {
      var headers = { "Content-Type": "application/json" };
      if (tok) headers.Authorization = "Bearer " + tok;
      return fetch(api.url, { method: "POST", headers: headers, body: JSON.stringify(payload) }).then(function (res) {
        return res.json().catch(function () { return null; }).then(function (j) {
          if (res.status === 401 && tok) { expired = true; api.signedOut(); }
          return { status: res.status, body: j || {} };
        });
      });
    };
    return (signed === false ? Promise.resolve(null) : api.token()).then(go).catch(function () { return { status: 0, body: {} }; });
  }
  function serverTrouble(r) {
    if (!r || !r.status) return T("The comments could not be reached. Check the connection and try again.");
    if (r.status === 401) return T("Your sign-in has run out. Sign in again; what you wrote is kept here.");
    return T("Something went wrong on the server ({status}). Try again in a minute.", { status: r.status });
  }

  // The signed-in account: the function's answer to `me` ({ profile, left, cap, role }), asked once for each account.
  var acct = { who: "", me: null, asking: null };
  function loadMe(again) {
    var w = api.who();
    if (!w) { acct = { who: "", me: null, asking: null }; return Promise.resolve(null); }
    if (acct.who === w && !again && (acct.me || acct.asking)) return acct.asking || Promise.resolve(acct.me);
    acct.who = w;
    acct.me = null;
    var job = ask({ action: "me" }).then(function (r) {
      if (acct.asking !== job) return acct.me;
      acct.asking = null;
      if (r.status === 200 && r.body && "profile" in r.body) {
        acct.me = r.body;
        api.picture(r.body.profile ? r.body.profile.avatar : null);
      } else acct.me = { failed: true };
      composer.render();
      renderAccount();
      if (th) renderList();
      if (thread.open()) thread.render();
      return acct.me;
    });
    acct.asking = job;
    return job;
  }
  function profile() { return acct.me && acct.me.profile ? acct.me.profile : null; }
  function reviewer() { return !!(acct.me && acct.me.role === "reviewer"); }

  // The card's thread: { name, tag, names, key }, the comments shown, and the order asked for. Every request for a list
  // carries the count `seq` had when it was sent; an answer whose count is no longer seq's (the card was closed or changed,
  // the order changed, or more were asked for since) is dropped.
  var th = null, sort = "new", seq = 0, shown = [], total = 0, more = false, cache = new Map(), listAt = "";
  // Drafts, by the name of the card they were written on, kept for the tab's life (sessionStorage), so that one survives a
  // sign-in that leaves the page and comes back; a draft goes when it is posted.
  var DRAFTS = "chronia-comment-drafts";
  var drafts = {
    all: function () { try { return JSON.parse(sessionStorage.getItem(DRAFTS) || "{}") || {}; } catch (e) { return {}; } },
    get: function (n) { return drafts.all()[n] || ""; },
    set: function (n, v) {
      var a = drafts.all();
      if (v) a[n] = v; else delete a[n];
      try { if (Object.keys(a).length) sessionStorage.setItem(DRAFTS, JSON.stringify(a)); else sessionStorage.removeItem(DRAFTS); } catch (e) {}
    },
    delete: function (n) { drafts.set(n, ""); }
  };
  var bar = el("p", "ch-cm-bar"), count = el("span", "ch-cm-count"), sortBox = el("span", "ch-cm-sort");
  sortBox.setAttribute("role", "group");
  sortBox.setAttribute("aria-label", T("Order of the comments"));
  var byNew = button(T("Newest"), "ch-linkbtn", function () { setSort("new"); });
  var byTop = button(T("Top"), "ch-linkbtn", function () { setSort("top"); });
  var byNear = button("", "ch-linkbtn", function () { setSort("near"); });
  bar.appendChild(count); bar.appendChild(sortBox);
  var said = el("p", "ch-cm-said sr-only");
  said.setAttribute("aria-live", "polite");
  var list = el("ol", "ch-cm-list"), empty = el("p", "ch-cm-empty"), moreBtn = button(T("Show more"), "ch-account-alt ch-cm-more", function () { load(shown.length); });
  var moreNote = el("p", "ch-cm-note");
  var compose = el("div", "ch-cm-compose");
  [compose, bar, said, list, empty, moreBtn, moreNote].forEach(function (n) { body.appendChild(n); });

  function show(on) { sec.hidden = !on; rule.hidden = !on; }
  function listKey(off) { return [th.key, sort, sort === "near" ? api.at() : "", off, api.who()].join("|"); }
  function load(off) {
    var my = ++seq, t = th, key = listKey(off), hit = cache.get(key);
    moreNote.textContent = "";
    if (hit && Date.now() - hit.t < CACHE_MS) { take(hit.body, off); return; }
    var req = { action: "list", names: t.names, sort: sort };
    if (sort === "near") req.at = listAt = api.at();
    if (off) req.offset = off;
    list.setAttribute("aria-busy", "true");
    if (off) moreBtn.disabled = true;
    ask(req, !!api.who()).then(function (r) {
      if (my !== seq || th !== t) return;
      list.removeAttribute("aria-busy");
      moreBtn.disabled = false;
      var b = r.body;
      if (r.status !== 200 || !b || !Array.isArray(b.comments)) {
        // If the function can't be reached, or errs, the card has no Comments section; a later page that fails is said.
        if (off) moreNote.textContent = serverTrouble(r);
        else show(false);
        return;
      }
      cache.set(key, { t: Date.now(), body: b });
      take(b, off);
    });
  }
  function take(b, off) {
    var before = shown.length;
    // A function with replies and upvotes gives every comment its count of upvotes.
    if (b.comments.length) feat.tree = b.comments.every(function (c) { return typeof c.votes === "number"; });
    if (!off) shown = b.comments.slice();
    else {
      var have = new Set(shown.map(function (c) { return c.id; }));
      shown = shown.concat(b.comments.filter(function (c) { return !have.has(c.id); }));
    }
    total = typeof b.total === "number" ? Math.max(b.total, shown.length) : shown.length;
    more = !!b.more;
    renderList();
    show(true);
    if (off && list.children[before]) list.children[before].focus();
  }
  function setSort(s) {
    if (!th) return;
    sort = s;
    renderSort();
    load(0);
  }
  // Newest | Top | Nearest to the date; Top only where the function has upvotes.
  function renderSort() {
    if (sort === "top" && !treeOn()) sort = "new";
    byNear.textContent = T("Nearest to {date}", { date: api.when() });
    sortBox.textContent = "";
    [byNew].concat(treeOn() ? [byTop] : [], [byNear]).forEach(function (b, i) {
      if (i) sortBox.appendChild(document.createTextNode(" | "));
      sortBox.appendChild(b);
    });
    [[byNew, "new"], [byTop, "top"], [byNear, "near"]].forEach(function (x) { x[0].setAttribute("aria-pressed", sort === x[1] ? "true" : "false"); });
  }
  function renderList() {
    head.textContent = th && th.tag ? T("Comments on {name}", { name: th.tag }) : T("Comments");
    renderSort();
    count.textContent = total === 1 ? T("1 comment") : T("{n} comments", { n: total });
    bar.hidden = !shown.length;
    list.textContent = "";
    shown.forEach(function (c) { list.appendChild(item(c)); });
    empty.hidden = !!shown.length;
    empty.textContent = T("No comments yet.");
    moreBtn.hidden = !more;
  }
  // "Deleted comment" or "Hidden comment", in the place of one that has replies.
  function goneText(c) { return c.hidden ? T("Hidden comment") : T("Deleted comment"); }
  function signedWithMe() { return !!(api.who() && acct.me && !acct.me.failed); }
  // A comment on the card: its writer, the date (pressing it moves the map there), the name it was posted under if it is
  // another of the tag's, the text, and a line of its upvotes, Reply, its count of replies, and Report or Delete.
  function item(c) {
    var li = el("li", "ch-cm-item");
    li.tabIndex = -1;
    li.setAttribute("data-id", String(c.id));
    if (c.deleted) {
      li.classList.add("is-gone");
      li.appendChild(el("span", "ch-cm-face ch-cm-noface"));
      var gm = el("div", "ch-cm-main");
      gm.appendChild(el("p", "ch-cm-gone", goneText(c)));
      var ga = treeLine(c, "card");
      if (ga) gm.appendChild(ga);
      li.appendChild(gm);
      return li;
    }
    li.appendChild(face(c.username, c.avatar));
    var main = el("div", "ch-cm-main");
    main.appendChild(meta(c, true));
    var text = el("p", "ch-cm-text", c.text);
    text.dir = "auto";
    main.appendChild(text);
    var acts = treeLine(c, "card") || el("p", "ch-cm-acts");
    if (ownActs(c, acts, "card") || acts.firstChild) main.appendChild(acts);
    li.appendChild(main);
    return li;
  }
  // The line over a comment's text: its writer and the map's date, then (on the card) the name it was posted under if
  // that is another of the tag's, or (in a thread) whom it replies to where that is not its parent.
  function meta(c, onCard) {
    var m = el("p", "ch-cm-meta");
    var user = el("span", "ch-cm-user", c.username);
    user.dir = "auto";
    m.appendChild(user);
    m.appendChild(document.createTextNode(" "));
    var when = api.when(c.at), date = button(when, "ch-cm-date", function () { api.goTo(c.at, c.polity); });
    date.setAttribute("aria-label", T("Go to {date} on the map", { date: when }));
    m.appendChild(date);
    if (onCard && th && c.polity && c.polity !== th.name) m.appendChild(el("span", "ch-cm-where", " | " + c.polity));
    if (!onCard && c.replying_to) {
      var to = el("span", "ch-cm-where", " | " + T("Replying to @{name}", { name: c.replying_to }));
      to.dir = "auto";
      m.appendChild(to);
    }
    return m;
  }
  // The line of upvotes, Reply, and (on the card) the count of replies, or null where the function has none of them.
  function treeLine(c, where) {
    if (!treeOn()) return null;
    var acts = el("p", "ch-cm-acts"), tree = el("span", "ch-cm-tree"), any = false;
    var add = function (n) { if (any) tree.appendChild(document.createTextNode(" | ")); tree.appendChild(n); any = true; };
    if (!c.deleted) add(voteBtn(c, where));
    if (!c.deleted) add(button(T("Reply"), "ch-linkbtn ch-cm-reply", function (e) {
      if (where === "card") thread.show(c.id, { reply: c.id, opener: e.currentTarget });
      else thread.reply(c.id);
    }));
    var n = +c.replies || 0;
    if (where === "card" && n) add(button(n === 1 ? T("1 reply") : T("{n} replies", { n: n }), "ch-linkbtn ch-cm-replies", function (e) { thread.show(c.id, { opener: e.currentTarget }); }));
    if (!any) return null;
    acts.appendChild(tree);
    return acts;
  }
  // Delete for one's own, and Report, Report picture, and (for a reviewer) Remove for another's, after the line's other
  // parts. True if any was added.
  function ownActs(c, acts, where) {
    if (!signedWithMe() || c.deleted) return false;
    var any = !!acts.firstChild;
    var add = function (b) { if (any) acts.appendChild(document.createTextNode(" | ")); acts.appendChild(b); any = true; };
    if (c.mine) add(button(T("Delete"), "ch-linkbtn", function (e) { drop(c, e.currentTarget, false, where); }));
    else {
      add(button(T("Report"), "ch-linkbtn", function (e) { report({ id: c.id }, e.currentTarget, T("Reported"), where); }));
      if (c.avatar) add(button(T("Report picture"), "ch-linkbtn", function (e) { report({ user: c.username }, e.currentTarget, T("Picture reported"), where); }));
      if (reviewer()) add(button(T("Remove"), "ch-linkbtn", function (e) { drop(c, e.currentTarget, true, where); }));
    }
    return true;
  }
  // The upvote: a button, pressed when the reader's own vote is in, or, on one's own comment, only the count.
  function voteBtn(c, where) {
    var n = +c.votes || 0;
    if (c.mine) {
      var own = el("span", "ch-cm-votes", "△ " + n);
      own.setAttribute("aria-label", n === 1 ? T("1 upvote") : T("{n} upvotes", { n: n }));
      own.setAttribute("data-id", String(c.id));
      return own;
    }
    var b = button("", "ch-cm-vote", function (e) { vote(c, e.currentTarget, where); });
    b.setAttribute("data-id", String(c.id));
    paintVote(b, n, !!c.voted);
    return b;
  }
  function paintVote(b, n, on) {
    b.textContent = (on ? "▲ " : "△ ") + n;
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.setAttribute("aria-label", T("Upvote, {n} so far", { n: n }));
  }
  // An upvote's new count, everywhere the comment is drawn (the card, the thread window, and the account's own list).
  function setVotes(id, n, on) {
    [shown, thread.comments(), mine.items].forEach(function (a) { a.forEach(function (c) { if (c.id === id) { c.votes = n; if (!c.mine) c.voted = on; } }); });
    document.querySelectorAll('.ch-cm-vote[data-id="' + id + '"]').forEach(function (b) { paintVote(b, n, on); });
  }
  // Where a message about an action is said: the card's line, or the thread window's.
  function sayAt(where, text) {
    if (where === "thread") thread.say(text);
    else { said.textContent = text; moreNote.textContent = text; }
  }
  function vote(c, btn, where) {
    if (!api.who()) { api.signIn(); return; }
    if (!acct.me || acct.me.failed) { loadMe(); sayAt(where, T("Checking…")); return; }
    if (!profile()) { needName(where); return; }
    var on = !c.voted;
    btn.disabled = true;
    ask({ action: "vote", id: c.id, on: on }).then(function (r) {
      btn.disabled = false;
      if (r.status === 200 && r.body && typeof r.body.votes === "number") {
        setVotes(c.id, r.body.votes, !!r.body.voted);
        cache.clear();
        return;
      }
      var e = r.body && r.body.error;
      if (unknownAction(r)) { feat.gone = true; renderAll(); return; }
      if (r.status === 403 && e === "profile") { needName(where); return; }
      if (r.status === 404) { sayAt(where, T("That comment is no longer there.")); return; }
      if (r.status === 429) { sayAt(where, T("That is the most upvotes for one day. Try again tomorrow.")); return; }
      if (e === "blocked") { sayAt(where, T("This account can't upvote.")); return; }
      sayAt(where, serverTrouble(r));
    });
  }
  // Without a username, an upvote or a reply asks for one, in the Account panel, as commenting does on the card.
  function needName(where) {
    sayAt(where, T("Choose a username first."));
    api.openAccount();
    editProfile(null);
  }
  function actTrouble(r) {
    if (r.status === 429) return T("That is the most reports for one day. Try again tomorrow.");
    if (r.status === 403 && r.body.error === "profile") return T("Choose a username first, above.");
    return serverTrouble(r);
  }
  function report(what, btn, done, where) {
    btn.disabled = true;
    ask(Object.assign({ action: "flag" }, what)).then(function (r) {
      if (r.status === 200) { btn.textContent = done; sayAt(where, T("Thank you. The team will look at it.")); if (where !== "thread") moreNote.textContent = ""; return; }
      if (r.status === 404 && what.id !== undefined) {
        gone(what.id, false);
        sayAt(where, T("That comment is no longer there."));
        return;
      }
      btn.disabled = false;
      sayAt(where, actTrouble(r));
    });
  }
  function drop(c, btn, asReviewer, where) {
    if (!window.confirm(asReviewer ? T("Remove this comment from public view?") : T("Delete this comment? This can't be undone."))) return;
    btn.disabled = true;
    ask({ action: "delete", id: c.id }).then(function (r) {
      if (r.status === 200 || r.status === 404) {
        // Deleted with replies under it, a comment keeps its place as "Deleted comment"; removed by a reviewer, as
        // "Hidden comment". Either way it goes where nothing replies to it.
        gone(c.id, r.status === 200 && (asReviewer ? "hidden" : r.body.soft ? "deleted" : false));
        mine.forget(c.id);
        sayAt(where, asReviewer ? T("The comment is removed.") : T("Your comment is deleted."));
        return;
      }
      btn.disabled = false;
      sayAt(where, actTrouble(r));
    });
  }
  // A comment no longer shown as itself: kept as a placeholder ("deleted" or "hidden") where replies are under it, or
  // taken away, from the card and the thread window both.
  function gone(id, keep) {
    cache.clear();
    var c = shown.filter(function (x) { return x.id === id; })[0];
    if (c) {
      if (keep === "deleted" || (keep === "hidden" && (+c.replies || 0) > 0)) Object.assign(c, placeholder(keep));
      else { shown = shown.filter(function (x) { return x.id !== id; }); total = Math.max(0, total - 1); }
      renderList();
    }
    thread.gone(id, keep);
  }
  function placeholder(kind) {
    return { deleted: true, hidden: kind === "hidden", username: null, avatar: null, text: "", votes: 0, voted: false, mine: false };
  }

  // The function's refusals of a comment or a reply, each a plain sentence.
  function postTrouble(r) {
    var b = r.body || {}, e = b.error;
    if (e === "limit") return T("That is {cap} comments today, the most for one account. You can post again tomorrow.", { cap: b.cap || 100 });
    if (e === "fast") return +b.wait === 1 ? T("Wait a second before posting again.") : T("Wait {n} seconds before posting again.", { n: Math.max(1, Math.ceil(+b.wait || 10)) });
    if (e === "word") return T("A word in this comment isn't allowed here. Please reword it.");
    if (e === "link") return T("Comments can't include web addresses. Please take the link out.");
    if (e === "long") return T("That is longer than 500 characters. Please shorten it.");
    if (e === "empty") return T("Write something first.");
    if (e === "blocked") return T("This account can't post comments.");
    return serverTrouble(r);
  }
  // Everything drawn from what the function can do, again (after it turns out to lack replies).
  function renderAll() {
    if (th) renderList();
    thread.render();
    mine.sync();
  }

  // The composer, at the top of the section: Sign in to comment, the profile form for an account without one, or the
  // box to write in. Its parts are kept between cards, so a draft is not lost when the list is drawn again.
  var composer = (function () {
    var state = "", box = null, left = null, line = null, post = null, today = null, msg = null, posting = false, form = null, picNote = null;
    function setState(s) {
      if (s === state) return false;
      state = s;
      compose.textContent = "";
      form = null;
      return true;
    }
    function render() {
      var w = api.who(), p = profile();
      var s = !w ? (expired ? "expired" : "out") : !acct.me ? "wait" : acct.me.failed ? "none" : !p ? "form" : p.blocked ? "blocked" : "box";
      if (setState(s)) build(s);
      refresh();
    }
    function build(s) {
      if (s === "out") {
        compose.appendChild(button(T("Sign in to comment"), "ch-account-alt ch-cm-signin", function () { api.signIn(); }));
      } else if (s === "expired") {
        var run = el("p", "ch-cm-msg", serverTrouble({ status: 401 }));
        run.setAttribute("aria-live", "polite");
        compose.appendChild(run);
        compose.appendChild(button(T("Sign in"), "ch-account-alt ch-cm-signin", function () { api.signIn(); }));
      } else if (s === "blocked") {
        compose.appendChild(el("p", "ch-cm-note", T("This account can't post comments.")));
      } else if (s === "form") {
        form = profileForm(compose, true, function (pictureTrouble) {
          render();
          if (pictureTrouble) notePicture(pictureTrouble);
          else if (box) box.focus();
        }, null);
      } else if (s === "box") {
        var id = "cm-box";
        var lab = el("label", "sr-only", T("Your comment"));
        lab.htmlFor = id;
        box = el("textarea", "ch-save-input ch-cm-box");
        box.id = id;
        box.rows = 3;
        box.spellcheck = true;
        box.setAttribute("aria-describedby", "cm-left cm-line");
        left = el("span", "ch-cm-left");
        left.id = "cm-left";
        line = el("p", "ch-cm-line");
        line.id = "cm-line";
        post = button("", "ch-save-btn ch-cm-post", send);
        today = el("p", "ch-cm-today");
        msg = el("p", "ch-cm-msg");
        msg.setAttribute("aria-live", "polite");
        box.addEventListener("input", function () { if (th) drafts.set(th.name, box.value); counts(); });
        box.addEventListener("keydown", function (e) { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } });
        var top = el("div", "ch-cm-boxline");
        top.appendChild(line); top.appendChild(left);
        [lab, box, top, post, today, msg].forEach(function (n) { compose.appendChild(n); });
      }
    }
    // Characters are counted as the function counts them, by code point: an emoji is one.
    function size(t) { return Array.from(t).length; }
    function counts() {
      if (!box) return;
      var n = size(box.value);
      left.textContent = n + " / " + MAX;
      left.classList.toggle("is-over", n > MAX);
    }
    // After a first save whose picture failed: the name is saved, the picture is not, and another can be tried.
    function notePicture(text) {
      clearNote();
      picNote = fill(el("p", "ch-cm-picnote"), text + " {try}", { try: button(T("Try another picture"), "ch-linkbtn", function () { api.openAccount(); editProfile(text); }) });
      picNote.setAttribute("aria-live", "polite");
      compose.insertBefore(picNote, compose.firstChild);
      picNote.querySelector("button").focus();
    }
    function clearNote() { if (picNote) { picNote.remove(); picNote = null; } }
    // Another card: a message about the last card's comment no longer applies.
    function changed() { if (msg) msg.textContent = ""; }
    // The parts that follow the card and the account: the draft, the name and date the comment will carry, and the
    // count left today.
    function refresh() {
      if (state !== "box" || !th) return;
      var p = profile(), d = drafts.get(th.name) || "";
      if (box.value !== d && document.activeElement !== box) box.value = d;
      counts();
      line.textContent = T("It will be posted under {name}, dated {date}.", { name: th.name, date: api.when() });
      post.textContent = T("Post as {username}", { username: p.username });
      var n = acct.me.left;
      today.hidden = !(typeof n === "number" && n <= LOW);
      today.textContent = n === 0 ? T("No comments left today. You can post again tomorrow.") : n === 1 ? T("1 comment left today.") : T("{n} comments left today.", { n: n });
    }
    var trouble = postTrouble;
    function send() {
      if (posting || state !== "box" || !th) return;
      var text = box.value.trim();
      if (!text) { msg.textContent = T("Write something first."); box.focus(); return; }
      if (size(text) > MAX) { msg.textContent = T("That is longer than 500 characters. Please shorten it."); box.focus(); return; }
      drafts.set(th.name, box.value);
      posting = true;
      post.disabled = true;
      msg.textContent = T("Posting…");
      var t = th;
      ask({ action: "post", name: t.name, at: api.at(), text: text }).then(function (r) {
        posting = false;
        if (post) post.disabled = false;
        if (r.status === 200 && r.body && r.body.comment) {
          drafts.delete(t.name);
          if (state === "box" && th === t) { box.value = ""; msg.textContent = ""; counts(); }
          if (typeof r.body.left === "number" && acct.me) acct.me.left = r.body.left;
          cache.clear();
          mine.stale();
          if (th === t) {
            shown.unshift(Object.assign({}, r.body.comment, { mine: true }));
            total++;
            renderList();
            show(true);
          }
          said.textContent = T("Your comment is posted.");
          refresh();
          return;
        }
        if (r.status === 403 && r.body && r.body.error === "profile") { loadMe(true); return; }
        if (r.body && r.body.error === "blocked" && acct.me && acct.me.profile) acct.me.profile.blocked = true;
        if (state === "box" && th === t) msg.textContent = trouble(r);
      });
    }
    return { render: render, refresh: refresh, changed: changed, clearNote: clearNote };
  })();

  // The thread window (#thread, over the map and wider than the card): a comment's whole thread, its top comment and
  // every reply nested under its parent, oldest first, a step in for each level. It opens from a comment's Reply or its
  // count of replies on the card, and from a reply in the account's own list, which it marks; Esc or its close button
  // closes it, and focus goes back to what opened it. Reply opens a small composer right under the comment answered.
  var thread = (function () {
    // st: { root, polity, title, items, more, mark, loose (opened from the account's list, not the card), opener,
    // replyFor (the comment whose composer is open) }; rc: that composer's parts, kept while the window is drawn again.
    var st = null, rc = null, tseq = 0, posting = false;
    var msg = el("p", "ch-cm-msg ch-th-msg"), wait = el("p", "ch-cm-note"), tree = el("ol", "ch-th-list"), foot = el("p", "ch-cm-note");
    msg.setAttribute("aria-live", "polite");
    if (thBody) [msg, wait, tree, foot].forEach(function (n) { thBody.appendChild(n); });
    if (thClose) thClose.addEventListener("click", function () { hide(true); });
    // Esc closes the window before anything under it (the card); an open Account panel takes Esc first.
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || !st) return;
      e.stopPropagation();
      hide(true);
    }, true);

    function titleFor() {
      if (th && st.polity && th.names.indexOf(st.polity) >= 0) return th.tag || th.name;
      return st.polity || (th ? th.tag || th.name : "");
    }
    function show(id, o) {
      o = o || {};
      if (!thBox || feat.gone) return;
      var my = ++tseq;
      st = { root: id, polity: null, title: "", items: [], more: false, mark: o.mark || null, loose: !!o.loose,
             opener: o.opener || document.activeElement, replyFor: o.reply || null };
      rc = null;
      thBox.hidden = false;
      thName.textContent = th ? th.tag || th.name : "";
      msg.textContent = ""; tree.textContent = ""; foot.textContent = "";
      wait.textContent = T("Loading");
      tree.setAttribute("aria-busy", "true");
      thClose.focus();
      ask({ action: "thread", id: id }, !!api.who()).then(function (r) {
        if (my !== tseq || !st) return;
        wait.textContent = "";
        tree.removeAttribute("aria-busy");
        var b = r.body;
        if (r.status === 200 && b && Array.isArray(b.comments)) {
          feat.tree = true;
          st.items = b.comments;
          st.more = !!b.more;
          st.root = typeof b.root === "number" ? b.root : st.items.length ? st.items[0].id : id;
          st.polity = st.items.length ? st.items[0].polity : null;
          render();
          var m = st.mark && tree.querySelector('.ch-th-item[data-id="' + st.mark + '"]');
          if (m) { m.scrollIntoView({ block: "center" }); m.focus({ preventScroll: true }); }
          else if (st.replyFor && rc && rc.focus) rc.focus();
          return;
        }
        if (unknownAction(r)) {
          // A function without threads: Reply and the window are not offered again.
          feat.gone = true;
          hide(false);
          renderAll();
          return;
        }
        msg.textContent = r.status === 404 ? T("That thread is no longer there.") : serverTrouble(r);
      });
    }
    function hide(focusBack) {
      if (!st) return;
      var back = st.opener;
      // The card's list may have been drawn again meanwhile (a reply posted): its button for this thread stands in.
      if (back && !document.contains(back) && back.classList) {
        var kind = back.classList.contains("ch-cm-replies") ? ".ch-cm-replies" : ".ch-cm-reply";
        back = list.querySelector('.ch-cm-item[data-id="' + st.root + '"] ' + kind) || list.querySelector('.ch-cm-item[data-id="' + st.root + '"]');
      }
      st = null; rc = null; tseq++;
      thBox.hidden = true;
      tree.textContent = "";
      if (focusBack && back && document.contains(back) && back.offsetParent !== null) back.focus();
    }
    function render() {
      if (!st) return;
      st.title = titleFor();
      thName.textContent = st.title;
      var ids = new Set(st.items.map(function (c) { return c.id; })), kids = new Map(), top = null;
      st.items.forEach(function (c) {
        if (c.id === st.root) { top = c; return; }
        var p = c.parent !== null && ids.has(c.parent) ? c.parent : st.root;
        if (!kids.has(p)) kids.set(p, []);
        kids.get(p).push(c);
      });
      tree.textContent = "";
      if (top) tree.appendChild(node(top, kids));
      foot.textContent = st.more ? T("This thread has more than 400 comments. The first 400 are shown.") : "";
    }
    // A comment and, under it, the composer if it is the one answered, then its replies, one level in.
    function node(c, kids) {
      var li = el("li", "ch-th-item" + (c.id === st.mark ? " is-mark" : ""));
      li.tabIndex = -1;
      li.setAttribute("data-id", String(c.id));
      var row = el("div", "ch-cm-item ch-th-c" + (c.deleted ? " is-gone" : ""));
      var main = el("div", "ch-cm-main");
      if (c.deleted) {
        row.appendChild(el("span", "ch-cm-face ch-cm-noface"));
        main.appendChild(el("p", "ch-cm-gone", goneText(c)));
      } else {
        row.appendChild(face(c.username, c.avatar));
        main.appendChild(meta(c, false));
        var text = el("p", "ch-cm-text", c.text);
        text.dir = "auto";
        main.appendChild(text);
        var acts = treeLine(c, "thread") || el("p", "ch-cm-acts");
        if (ownActs(c, acts, "thread") || acts.firstChild) main.appendChild(acts);
      }
      row.appendChild(main);
      li.appendChild(row);
      if (st.replyFor === c.id && !c.deleted) li.appendChild(composerFor(c).wrap);
      var under = kids.get(c.id);
      if (under && under.length) {
        var ol = el("ol", "ch-th-kids");
        under.forEach(function (k) { ol.appendChild(node(k, kids)); });
        li.appendChild(ol);
      }
      return li;
    }
    function reply(id) {
      if (!st) return;
      st.replyFor = id;
      rc = null;
      render();
      if (rc && rc.focus) rc.focus();
    }
    // The composer under a comment: Sign in to reply, a request for a username, or the box. Kept between drawings of the
    // window (an upvote, the account answering), with its draft kept for the tab's life, as the card's is.
    function composerFor(c) {
      var w = api.who(), p = profile();
      var state = !w ? "out" : !acct.me ? "wait" : acct.me.failed ? "none" : !p ? "name" : p.blocked ? "blocked" : "box";
      if (rc && rc.id === c.id && rc.state === state) { rc.refresh(); return rc; }
      var wrap = el("div", "ch-th-compose"), cancel = button(T("Cancel"), "ch-linkbtn ch-th-cancel", function () {
        st.replyFor = null; rc = null; render();
        var b = tree.querySelector('.ch-th-item[data-id="' + c.id + '"] .ch-cm-reply');
        if (b) b.focus();
      });
      rc = { id: c.id, state: state, wrap: wrap, refresh: function () {}, focus: null };
      if (state === "out") {
        var si = button(T("Sign in to reply"), "ch-account-alt ch-cm-signin", function () { api.signIn(); });
        wrap.appendChild(si);
        rc.focus = function () { si.focus(); };
      } else if (state === "wait") {
        wrap.appendChild(el("p", "ch-cm-note", T("Checking…")));
        loadMe();
      } else if (state === "none") {
        wrap.appendChild(el("p", "ch-cm-note", serverTrouble({ status: 0 })));
      } else if (state === "name") {
        var nb = button(T("Choose a username"), "ch-linkbtn", function () { needName("thread"); });
        wrap.appendChild(fill(el("p", "ch-cm-note"), T("Choose a username to reply under. {choose}"), { choose: nb }));
        rc.focus = function () { nb.focus(); };
      } else if (state === "blocked") {
        wrap.appendChild(el("p", "ch-cm-note", T("This account can't post comments.")));
      } else {
        buildBox(c, wrap);
      }
      var end = el("p", "ch-th-end");
      end.appendChild(cancel);
      wrap.appendChild(end);
      return rc;
    }
    function buildBox(c, wrap) {
      var key = "#" + c.id, id = "th-box-" + c.id;
      var lab = el("label", "sr-only", T("Your reply"));
      lab.htmlFor = id;
      var box = el("textarea", "ch-save-input ch-cm-box");
      box.id = id;
      box.rows = 3;
      box.spellcheck = true;
      box.value = drafts.get(key);
      box.setAttribute("aria-describedby", id + "-left " + id + "-line");
      var left = el("span", "ch-cm-left"), line = el("p", "ch-cm-line"), post = button("", "ch-save-btn ch-cm-post", function () { send(c); });
      left.id = id + "-left";
      line.id = id + "-line";
      var m = el("p", "ch-cm-msg");
      m.setAttribute("aria-live", "polite");
      var top = el("div", "ch-cm-boxline");
      top.appendChild(line); top.appendChild(left);
      [lab, box, top, post, m].forEach(function (n) { wrap.appendChild(n); });
      var counts = function () {
        var n = Array.from(box.value).length;
        left.textContent = n + " / " + MAX;
        left.classList.toggle("is-over", n > MAX);
      };
      box.addEventListener("input", function () { drafts.set(key, box.value); counts(); });
      box.addEventListener("keydown", function (e) { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(c); } });
      rc.box = box; rc.msg = m; rc.post = post;
      rc.focus = function () { box.focus(); };
      rc.refresh = function () {
        counts();
        line.textContent = T("Replying to @{name}, dated {date}.", { name: c.username, date: api.when() });
        post.textContent = T("Reply as {username}", { username: profile().username });
      };
      rc.refresh();
    }
    function send(c) {
      var my = rc;
      if (posting || !my || !my.box || !st) return;
      var text = my.box.value.trim();
      if (!text) { my.msg.textContent = T("Write something first."); my.box.focus(); return; }
      if (Array.from(text).length > MAX) { my.msg.textContent = T("That is longer than 500 characters. Please shorten it."); my.box.focus(); return; }
      posting = true;
      my.post.disabled = true;
      my.msg.textContent = T("Posting…");
      var s0 = st;
      ask({ action: "post", name: c.polity, at: api.at(), text: text, parent: c.id }).then(function (r) {
        posting = false;
        my.post.disabled = false;
        if (r.status === 200 && r.body && r.body.comment) {
          drafts.delete("#" + c.id);
          if (typeof r.body.left === "number" && acct.me) acct.me.left = r.body.left;
          cache.clear();
          mine.stale();
          // The card's count of replies for this thread goes up.
          shown.forEach(function (x) { if (x.id === s0.root) x.replies = (+x.replies || 0) + 1; });
          if (th) renderList();
          composer.refresh();
          if (st !== s0) return;
          var n = Object.assign({ votes: 0, voted: false, replying_to: null }, r.body.comment, { mine: true });
          st.items.push(n);
          st.replyFor = null;
          rc = null;
          st.mark = n.id;
          render();
          var li = tree.querySelector('.ch-th-item[data-id="' + n.id + '"]');
          if (li) { li.scrollIntoView({ block: "nearest" }); li.focus({ preventScroll: true }); }
          msg.textContent = T("Your reply is posted.");
          return;
        }
        if (r.status === 403 && r.body && r.body.error === "profile") { loadMe(true); return; }
        if (r.body && r.body.error === "blocked" && acct.me && acct.me.profile) acct.me.profile.blocked = true;
        if (rc === my) my.msg.textContent = r.status === 404 ? T("That comment is no longer there.") : postTrouble(r);
      });
    }
    // A comment deleted, removed, or found gone: a placeholder where replies are under it, else taken away, with any
    // placeholder above it left with no replies.
    function gone(id, keep) {
      if (!st) return;
      var c = st.items.filter(function (x) { return x.id === id; })[0];
      if (!c) return;
      var hasKids = function (x) { return st.items.some(function (k) { return k.parent === x.id; }); };
      if (keep && (keep === "deleted" || hasKids(c))) Object.assign(c, placeholder(keep));
      else {
        st.items = st.items.filter(function (x) { return x !== c; });
        var lost = true;
        while (lost) {
          lost = false;
          st.items = st.items.filter(function (x) { var drop = x.deleted && !hasKids(x); if (drop) lost = true; return !drop; });
        }
      }
      if (st.replyFor === id) { st.replyFor = null; rc = null; }
      if (!st.items.some(function (x) { return !x.deleted; })) { hide(true); return; }
      render();
    }
    return {
      show: show,
      hide: hide,
      reply: reply,
      gone: gone,
      render: function () { if (st) render(); },
      open: function () { return !!st; },
      comments: function () { return st ? st.items : []; },
      say: function (t) { msg.textContent = t; },
      // The card changed: the window stays only for a thread of the new card (or, opened from the account's list, while
      // no card is open).
      card: function (t) {
        if (!st) return;
        if (!t) { if (!st.loose) hide(false); return; }
        if (st.polity && t.names.indexOf(st.polity) < 0) hide(false);
        else {
          // The same thread on the card at another date: the composer's line follows the date; the rest stands.
          st.loose = false;
          if (rc) rc.refresh();
          if (titleFor() !== st.title) render();
        }
      }
    };
  })();

  // The account's own comments and replies, in the Account panel under the profile ("Your comments"): newest first,
  // twenty at a time, each with its country, its map date, whom it replies to, its text (cut to three lines), and its
  // upvotes, and "Hidden from others" for one hidden or removed. Pressing one takes the map to its date and its country's
  // card, and, for a reply, opens its thread with it marked.
  var mine = (function () {
    var items = [], more = false, at = 0, isStale = true, busy = false, mseq = 0;
    var wrap = el("div", "ch-mine"), ol = el("ol", "ch-mine-list"), none = el("p", "ch-mine-empty"), note = el("p", "ch-mine-note");
    var moreB = button(T("More"), "ch-account-alt ch-mine-more", function () { load(items.length); });
    note.setAttribute("aria-live", "polite");
    [el("p", "ch-mine-head", T("Your comments")), ol, none, moreB, note].forEach(function (n) { wrap.appendChild(n); });
    wrap.hidden = true;
    if (acctBox) acctBox.appendChild(wrap);
    function load(off) {
      var my = ++mseq, who = api.who();
      busy = true;
      if (off) moreB.disabled = true;
      ol.setAttribute("aria-busy", "true");
      ask(off ? { action: "mine", offset: off } : { action: "mine" }).then(function (r) {
        if (my !== mseq || who !== api.who()) return;
        busy = false;
        moreB.disabled = false;
        ol.removeAttribute("aria-busy");
        if (r.status === 200 && r.body && Array.isArray(r.body.comments)) {
          if (!off) items = [];
          var have = new Set(items.map(function (c) { return c.id; }));
          items = items.concat(r.body.comments.filter(function (c) { return !have.has(c.id); }));
          more = !!r.body.more;
          at = Date.now();
          isStale = false;
          note.textContent = "";
          render();
          return;
        }
        if (unknownAction(r)) { feat.gone = true; renderAll(); return; }
        isStale = false;
        at = Date.now();
        note.textContent = serverTrouble(r);
      });
    }
    function render() {
      ol.textContent = "";
      items.forEach(function (c) { ol.appendChild(row(c)); });
      none.hidden = !!items.length || busy;
      none.textContent = T("You haven't commented yet.");
      moreB.hidden = !more;
    }
    function row(c) {
      var li = el("li", "ch-mine-item");
      li.setAttribute("data-id", String(c.id));
      var open = el("button", "ch-mine-open");
      open.type = "button";
      var where = el("span", "ch-mine-where"), polity = el("span", "", c.polity);
      polity.dir = "auto";
      where.appendChild(polity);
      where.appendChild(document.createTextNode(" | " + api.when(c.at)));
      open.appendChild(where);
      if (c.parent !== null && c.parent !== undefined) {
        var to = el("span", "ch-mine-to", c.replying_to ? T("Reply to @{name}", { name: c.replying_to }) : T("A reply"));
        to.dir = "auto";
        open.appendChild(to);
      }
      var text = el("span", "ch-mine-text", c.text);
      text.dir = "auto";
      open.appendChild(text);
      open.addEventListener("click", function () { go(c); });
      li.appendChild(open);
      // Under it, its upvotes, whether others can't see it, and Delete.
      var n = +c.votes || 0, acts = el("p", "ch-mine-acts"), votes = el("span", "ch-mine-foot", "△ " + n);
      votes.setAttribute("aria-label", n === 1 ? T("1 upvote") : T("{n} upvotes", { n: n }));
      acts.appendChild(votes);
      if (c.state && c.state !== "live") {
        acts.appendChild(document.createTextNode(" | "));
        acts.appendChild(el("span", "ch-mine-hidden", T("Hidden from others")));
      }
      acts.appendChild(document.createTextNode(" | "));
      acts.appendChild(button(T("Delete"), "ch-linkbtn", function (e) { del(c, e.currentTarget); }));
      li.appendChild(acts);
      return li;
    }
    function go(c) {
      api.closeAccount();
      api.goTo(c.at, c.polity);
      if (c.parent !== null && c.parent !== undefined && !feat.gone) thread.show(c.root || c.id, { mark: c.id, loose: true, opener: $("account-btn") });
    }
    function del(c, btn) {
      if (!window.confirm(T("Delete this comment? This can't be undone."))) return;
      btn.disabled = true;
      ask({ action: "delete", id: c.id }).then(function (r) {
        if (r.status === 200 || r.status === 404) {
          items = items.filter(function (x) { return x.id !== c.id; });
          render();
          note.textContent = T("Your comment is deleted.");
          gone(c.id, r.status === 200 && r.body.soft ? "deleted" : false);
          return;
        }
        btn.disabled = false;
        note.textContent = actTrouble(r);
      });
    }
    return {
      get items() { return items; },
      // Drawn (and asked for, when stale or a minute old, with the panel open) or hidden, with the Account panel.
      sync: function () {
        var on = !!profile() && !editing && !feat.gone && !!api.who();
        wrap.hidden = !on;
        if (!on) return;
        if (api.accountOpen() && !busy && (isStale || Date.now() - at > CACHE_MS)) load(0);
      },
      stale: function () { isStale = true; },
      forget: function (id) { items = items.filter(function (x) { return x.id !== id; }); render(); },
      reset: function () { items = []; more = false; isStale = true; mseq++; busy = false; note.textContent = ""; render(); }
    };
  })();

  // The profile form: a username (checked with the function after a pause in typing), a picture (cut to a centred
  // square, 256 by 256, as WebP, or JPEG where the browser can't write WebP), and, the first time, the age box.
  var formCount = 0;
  function profileForm(host, first, onDone, onCancel) {
    var n = ++formCount, id = function (k) { return "pf" + n + "-" + k; };
    var cur = profile(), was = cur ? cur.username : "", wasPic = cur ? cur.avatar : null;
    var f = el("form", "ch-pf");
    f.noValidate = true;
    if (first) f.appendChild(el("p", "ch-pf-lead", T("Choose a username to comment under. A picture is optional.")));
    var nameLab = el("label", "ch-pf-label", T("Username"));
    nameLab.htmlFor = id("name");
    var name = el("input", "ch-save-input ch-pf-name");
    name.id = id("name");
    name.type = "text";
    name.maxLength = 20;
    name.autocomplete = "off";
    name.spellcheck = false;
    name.setAttribute("autocapitalize", "off");
    name.setAttribute("aria-describedby", id("rule") + " " + id("status"));
    name.value = was;
    var ruleLine = el("p", "ch-pf-rule", T(RULE));
    ruleLine.id = id("rule");
    var status = el("p", "ch-pf-status");
    status.id = id("status");
    status.setAttribute("aria-live", "polite");
    [nameLab, name, ruleLine, status].forEach(function (x) { f.appendChild(x); });

    var picRow = el("div", "ch-pf-picrow"), preview = el("span", "ch-pf-preview"), picSide = el("div", "ch-pf-picside");
    var picLab = el("span", "ch-pf-label", T("Picture"));
    picLab.id = id("pic");
    var choose = el("label", "ch-account-alt ch-pf-choose"), file = el("input", "ch-pf-file sr-only");
    file.type = "file";
    file.accept = "image/*";
    file.id = id("file");
    file.setAttribute("aria-describedby", id("picnote"));
    choose.appendChild(file);
    choose.appendChild(document.createTextNode(T("Choose a picture")));
    var remove = button(T("Remove"), "ch-linkbtn ch-pf-remove", function () { setPic(wasPic ? "" : undefined, null); file.value = ""; file.focus(); });
    var picNote = el("p", "ch-pf-picnote", T("Optional. It is checked before others see it."));
    picNote.id = id("picnote");
    picSide.appendChild(picLab);
    var picActs = el("p", "ch-pf-picacts");
    picActs.appendChild(choose); picActs.appendChild(document.createTextNode(" ")); picActs.appendChild(remove);
    picSide.appendChild(picActs);
    picSide.appendChild(picNote);
    picRow.appendChild(preview); picRow.appendChild(picSide);
    f.appendChild(picRow);

    var age = null;
    if (first) {
      var ageLab = el("label", "ch-pf-agebox");
      age = el("input", "ch-pf-age");
      age.type = "checkbox";
      age.id = id("age");
      ageLab.appendChild(age);
      ageLab.appendChild(el("span", "", T(AGE)));
      f.appendChild(ageLab);
      age.addEventListener("change", sync);
    }
    var terms = el("a", "", T("terms")), privacy = el("a", "", T("privacy policy"));
    terms.href = "terms/"; privacy.href = "privacy/";
    [terms, privacy].forEach(function (a) { a.target = "_blank"; a.rel = "noopener"; });
    f.appendChild(fill(el("p", "ch-pf-terms"), T("Your username, picture, and comments are public. Saving means you agree to the {terms} and the {privacy}."), { terms: terms, privacy: privacy }));
    var msg = el("p", "ch-pf-msg");
    msg.setAttribute("aria-live", "polite");
    f.appendChild(msg);
    var acts = el("div", "ch-pf-acts"), save = el("button", "ch-save-btn ch-pf-save", T("Save"));
    save.type = "submit";
    acts.appendChild(save);
    if (onCancel) acts.appendChild(button(T("Cancel"), "ch-account-alt ch-pf-cancel", onCancel));
    f.appendChild(acts);
    host.appendChild(f);

    // nameState: "" (nothing to send), "same" (unchanged), "wait" (being checked), "ok", "bad", or "unknown" (the check
    // could not be made; the function decides on Save).
    var nameState = was ? "same" : "", timer = 0, asked = 0, pic, picBusy = false, saving = false, picUrl = null;
    function shapeWhy(v) {
      if (!/^[A-Za-z]/.test(v)) return T("A username must start with a letter.");
      if (/[^A-Za-z0-9_]/.test(v)) return T("Use only letters, numbers, and underscores.");
      if (v.length < 3) return T("A username needs at least 3 characters.");
      return T(RULE);
    }
    function nameWhy(why) {
      if (why === "taken") return T("That name is taken. Try another.");
      if (why === "reserved") return T("That name is kept for the site. Try another.");
      if (why === "word") return T("That name isn't allowed. Try another.");
      return T(RULE);
    }
    name.addEventListener("input", function () {
      clearTimeout(timer);
      var v = name.value;
      msg.textContent = "";
      if (!v) { nameState = ""; status.textContent = ""; }
      else if (!NAME_RE.test(v)) { nameState = "bad"; status.textContent = shapeWhy(v); }
      else if (was && v.toLowerCase() === was.toLowerCase()) { nameState = v === was ? "same" : "ok"; status.textContent = ""; }
      else {
        nameState = "wait";
        status.textContent = "";
        var my = ++asked;
        timer = setTimeout(function () {
          status.textContent = T("Checking…");
          ask({ action: "name", username: v }).then(function (r) {
            if (my !== asked || name.value !== v) return;
            if (r.status === 200 && r.body && typeof r.body.ok === "boolean") {
              nameState = r.body.ok ? "ok" : "bad";
              status.textContent = r.body.ok ? T("That name is free.") : nameWhy(r.body.why);
            } else { nameState = "unknown"; status.textContent = T("The name could not be checked just now. You can still save it."); }
            sync();
          });
        }, NAME_PAUSE);
      }
      sync();
    });
    function setPic(v, blob) {
      pic = v;
      if (picUrl) { URL.revokeObjectURL(picUrl); picUrl = null; }
      preview.textContent = "";
      var show = blob ? (picUrl = URL.createObjectURL(blob)) : v === undefined ? wasPic : null;
      preview.appendChild(face(name.value || was || "?", show));
      remove.hidden = !show;
      sync();
    }
    file.addEventListener("change", function () {
      var fl = file.files && file.files[0];
      if (!fl) return;
      msg.textContent = "";
      if (fl.size > FILE_MAX) { msg.textContent = T("That file is too large to use. Choose a smaller picture."); return; }
      picBusy = true;
      sync();
      msg.textContent = T("Preparing the picture…");
      shrink(fl).then(function (blob) {
        return base64(blob).then(function (b64) { picBusy = false; msg.textContent = ""; setPic(b64, blob); });
      }).catch(function () {
        picBusy = false;
        msg.textContent = T("That file isn't a picture this browser can read. Choose another.");
        sync();
      });
    });
    function valid() {
      var nameGood = nameState === "same" || nameState === "ok" || nameState === "unknown";
      if (saving || picBusy || !nameGood) return false;
      if (first) return !!age.checked;
      return nameState !== "same" || pic !== undefined;
    }
    function sync() { save.disabled = !valid(); }
    function trouble(r) {
      var b = r.body || {}, e = b.error;
      if (e === "taken" || e === "reserved" || e === "word") { nameState = "bad"; status.textContent = nameWhy(e); }
      if (e === "taken") return T("That name was taken by someone else. Choose another.");
      if (e === "reserved") return T("That name is kept for the site, so it can't be saved.");
      if (e === "word") return T("That name isn't allowed, so it can't be saved.");
      if (e === "shape") return T("A username is 3 to 20 characters: letters, numbers, and underscores, starting with a letter.");
      if (e === "soon") return +b.days === 1 ? T("You can change your username again tomorrow.") : T("You can change your username again in {n} days.", { n: Math.max(1, +b.days || 30) });
      if (e === "picture" || e === "check" || e === "limit") return pictureWhy(e);
      if (e === "long" || r.status === 413) return T("That picture is too large. Choose another.");
      if (e === "age") return T("Tick the box to say you are old enough.");
      if (e === "blocked") return T("This account can't make a profile.");
      return serverTrouble(r);
    }
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!valid()) return;
      var req = { action: "profile" };
      if (first || nameState !== "same") req.username = name.value;
      if (first) req.age = true;
      if (pic !== undefined) req.avatar = pic;
      saving = true;
      sync();
      msg.textContent = T("Saving…");
      ask(req).then(function (r) {
        saving = false;
        if (r.status === 200 && r.body && r.body.profile) {
          // A first save makes the profile before the picture is checked; a picture that then fails is said, and the
          // profile stands without it (the contract's picture_error).
          var pe = r.body.picture_error ? T("Your username is saved, but the picture is not. {reason}", { reason: pictureWhy(r.body.picture_error) }) : null;
          msg.textContent = "";
          if (!acct.me || acct.me.failed) acct.me = { left: 100, cap: 100, role: null };
          acct.me.profile = r.body.profile;
          api.picture(r.body.profile.avatar || null);
          cache.clear();
          if (picUrl) URL.revokeObjectURL(picUrl);
          composer.render();
          renderAccount();
          if (th) load(0);
          if (!pe) composer.clearNote();
          onDone(pe);
          return;
        }
        msg.textContent = trouble(r);
        sync();
      });
    });
    setPic(undefined, null);
    return { focus: function () { name.focus(); }, focusPicture: function () { file.focus(); }, say: function (t) { msg.textContent = t; } };
  }
  function pictureWhy(e) {
    if (e === "picture") return T("That picture can't be used here. Choose another.");
    if (e === "check") return T("The picture could not be checked just now. Try again later.");
    if (e === "limit") return T("That is the most picture changes for one day. Try again tomorrow.");
    return T("The picture could not be stored just now. Try again later.");
  }
  function shrink(fileIn) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(fileIn), im = new Image();
      im.onload = function () {
        URL.revokeObjectURL(url);
        var w = im.naturalWidth, h = im.naturalHeight, s = Math.min(w, h);
        if (!s) { rej(new Error("empty")); return; }
        var c = document.createElement("canvas");
        c.width = c.height = PIC_SIDE;
        var x = c.getContext("2d");
        x.fillStyle = "#f3ead3";
        x.fillRect(0, 0, PIC_SIDE, PIC_SIDE);
        x.imageSmoothingQuality = "high";
        x.drawImage(im, (w - s) / 2, (h - s) / 2, s, s, 0, 0, PIC_SIDE, PIC_SIDE);
        encode(c).then(res, rej);
      };
      im.onerror = function () { URL.revokeObjectURL(url); rej(new Error("decode")); };
      im.src = url;
    });
  }
  // WebP at the best quality that fits under 200 KB; JPEG where the browser writes no WebP (it hands back a PNG then).
  function encode(c) {
    var qs = [0.86, 0.76, 0.62, 0.48, 0.34];
    function attempt(i, type) {
      return new Promise(function (r) { c.toBlob(r, type, qs[i]); }).then(function (b) {
        if (!b) throw new Error("encode");
        if (type === "image/webp" && b.type !== "image/webp") return attempt(i, "image/jpeg");
        if (b.size <= PIC_MAX) return b;
        if (i + 1 < qs.length) return attempt(i + 1, type);
        throw new Error("large");
      });
    }
    return attempt(0, "image/webp");
  }
  function base64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(",")[1] || ""); };
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  // The profile in the Account panel: the picture or initial, the username, Edit profile, and the account's own comments.
  var editing = false;
  function renderAccount() {
    if (!acctBox) return;
    var p = profile();
    acctBox.hidden = !api.who() || !acct.me || !!acct.me.failed;
    if (acctBox.hidden) { editing = false; acctForm.textContent = ""; mine.sync(); return; }
    acctFace.textContent = "";
    mine.sync();
    if (editing) return;
    acctForm.textContent = "";
    acctFace.parentNode.hidden = false;
    if (p) {
      acctFace.appendChild(face(p.username, p.avatar));
      acctUser.textContent = p.username;
      acctEdit.textContent = T("Edit profile");
    } else {
      acctUser.textContent = T("No username yet");
      acctEdit.textContent = T("Choose a username");
    }
  }
  // The form in the Account panel; `note` (after a picture that failed) is said in it, and the picture is focused.
  function editProfile(note) {
    if (!acctBox || !profile() && note) return;
    var first = !profile();
    editing = true;
    renderAccount();
    acctFace.parentNode.hidden = true;
    acctForm.textContent = "";
    var done = function (pictureTrouble) {
      editing = false;
      renderAccount();
      if (pictureTrouble) editProfile(pictureTrouble);
      else acctEdit.focus();
    };
    var f = profileForm(acctForm, first, done, function () { editing = false; renderAccount(); acctEdit.focus(); });
    if (note) { f.say(note); f.focusPicture(); } else f.focus();
  }
  if (acctEdit) acctEdit.addEventListener("click", function () { editProfile(null); });

  api.ui = {
    // The card shown: its thread ({ name, tag, names }), or null for none (closed, a city's card, or not a country).
    card: function (t) {
      thread.card(t);
      if (!t) {
        if (th) { th = null; seq++; }
        show(false);
        return;
      }
      var key = t.names.join("\u0001");
      if (th && th.key === key && th.name === t.name) {
        // The same card, at another date (a war's months before 1648 keep the card open): the label, the line, and a
        // nearest-first order follow the date.
        renderSort();
        composer.refresh();
        if (sort === "near" && listAt !== api.at()) load(0);
        return;
      }
      composer.changed();
      th = { name: t.name, tag: t.tag || "", names: t.names, key: key };
      shown = []; total = 0; more = false;
      show(false);
      if (api.who()) loadMe();
      composer.render();
      load(0);
    },
    // The account changed (signed in or out) or the Account panel opened.
    account: function () {
      var w = api.who();
      if (w) expired = false;
      if (w !== acct.who) {
        acct = { who: "", me: null, asking: null };
        cache.clear();
        mine.reset();
        if (w) loadMe();
        if (th) load(0);
        thread.render();
      }
      composer.render();
      renderAccount();
    }
  };
  api.ui.account();
  api.ui.card(api.thread());
})();

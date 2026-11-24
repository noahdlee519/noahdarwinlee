// CHRONIA's comments on a country's card, and the profile (a username and a picture) they are written under (see
// docs/superpowers/specs/2026-11-24-chronia-comments-design.md). app.js loads this file the first time a country's card
// opens, or the Account panel opens signed in, and hands it window.CHRONIA_COMMENTS; everything here talks only to the
// chronia-comments function, whose contract is docs/superpowers/plans/2026-11-24-chronia-comments-api.md. Text from
// users (usernames, comments, and the names comments were posted under) reaches the page only as textContent.
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
  if (!sec || !body) return;

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

  // The function: { status, body }, with status 0 where it could not be reached.
  function ask(payload, signed) {
    var go = function (tok) {
      var headers = { "Content-Type": "application/json" };
      if (tok) headers.Authorization = "Bearer " + tok;
      return fetch(api.url, { method: "POST", headers: headers, body: JSON.stringify(payload) }).then(function (res) {
        return res.json().catch(function () { return null; }).then(function (j) { return { status: res.status, body: j || {} }; });
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
  var th = null, sort = "new", seq = 0, shown = [], total = 0, more = false, cache = new Map(), drafts = new Map();
  var bar = el("p", "ch-cm-bar"), count = el("span", "ch-cm-count"), sortBox = el("span", "ch-cm-sort");
  sortBox.setAttribute("role", "group");
  sortBox.setAttribute("aria-label", T("Order of the comments"));
  var byNew = button(T("Newest"), "ch-linkbtn", function () { setSort("new"); });
  var byNear = button("", "ch-linkbtn", function () { setSort("near"); });
  sortBox.appendChild(byNew); sortBox.appendChild(document.createTextNode(" | ")); sortBox.appendChild(byNear);
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
    if (sort === "near") req.at = api.at();
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
  function renderSort() {
    byNear.textContent = T("Nearest to {date}", { date: api.when() });
    byNew.setAttribute("aria-pressed", sort === "new" ? "true" : "false");
    byNear.setAttribute("aria-pressed", sort === "near" ? "true" : "false");
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
  function item(c) {
    var li = el("li", "ch-cm-item");
    li.tabIndex = -1;
    li.appendChild(face(c.username, c.avatar));
    var main = el("div", "ch-cm-main"), meta = el("p", "ch-cm-meta");
    meta.appendChild(el("span", "ch-cm-user", c.username));
    meta.appendChild(document.createTextNode(" "));
    var when = api.when(c.at), date = button(when, "ch-cm-date", function () { api.goTo(c.at, c.polity); });
    date.setAttribute("aria-label", T("Go to {date} on the map", { date: when }));
    meta.appendChild(date);
    if (th && c.polity && c.polity !== th.name) meta.appendChild(el("span", "ch-cm-where", " | " + c.polity));
    main.appendChild(meta);
    main.appendChild(el("p", "ch-cm-text", c.text));
    var acts = el("p", "ch-cm-acts"), any = false;
    var add = function (b) { if (any) acts.appendChild(document.createTextNode(" | ")); acts.appendChild(b); any = true; };
    if (api.who() && acct.me && !acct.me.failed) {
      if (c.mine) add(button(T("Delete"), "ch-linkbtn", function (e) { drop(c, e.currentTarget, false); }));
      else {
        add(button(T("Report"), "ch-linkbtn", function (e) { report({ id: c.id }, e.currentTarget, T("Reported")); }));
        if (c.avatar) add(button(T("Report picture"), "ch-linkbtn", function (e) { report({ user: c.username }, e.currentTarget, T("Picture reported")); }));
        if (reviewer()) add(button(T("Remove"), "ch-linkbtn", function (e) { drop(c, e.currentTarget, true); }));
      }
    }
    if (any) main.appendChild(acts);
    li.appendChild(main);
    return li;
  }
  function actTrouble(r) {
    if (r.status === 429) return T("That is the most reports for one day. Try again tomorrow.");
    if (r.status === 403 && r.body.error === "profile") return T("Choose a username first, above.");
    return serverTrouble(r);
  }
  function report(what, btn, done) {
    btn.disabled = true;
    ask(Object.assign({ action: "flag" }, what)).then(function (r) {
      if (r.status === 200) { btn.textContent = done; said.textContent = T("Thank you. The team will look at it."); return; }
      btn.disabled = false;
      said.textContent = actTrouble(r);
      moreNote.textContent = said.textContent;
    });
  }
  function drop(c, btn, asReviewer) {
    if (!window.confirm(asReviewer ? T("Remove this comment from public view?") : T("Delete this comment? This can't be undone."))) return;
    btn.disabled = true;
    ask({ action: "delete", id: c.id }).then(function (r) {
      if (r.status === 200 || r.status === 404) {
        cache.clear();
        shown = shown.filter(function (x) { return x.id !== c.id; });
        total = Math.max(0, total - 1);
        renderList();
        said.textContent = asReviewer ? T("The comment is removed.") : T("Your comment is deleted.");
        return;
      }
      btn.disabled = false;
      said.textContent = actTrouble(r);
      moreNote.textContent = said.textContent;
    });
  }

  // The composer, at the top of the section: Sign in to comment, the profile form for an account without one, or the
  // box to write in. Its parts are kept between cards, so a draft is not lost when the list is drawn again.
  var composer = (function () {
    var state = "", box = null, left = null, line = null, post = null, today = null, msg = null, posting = false, form = null;
    function setState(s) {
      if (s === state) return false;
      state = s;
      compose.textContent = "";
      form = null;
      return true;
    }
    function render() {
      var w = api.who(), p = profile();
      var s = !w ? "out" : !acct.me ? "wait" : acct.me.failed ? "none" : !p ? "form" : p.blocked ? "blocked" : "box";
      if (setState(s)) build(s);
      refresh();
    }
    function build(s) {
      if (s === "out") {
        compose.appendChild(button(T("Sign in to comment"), "ch-account-alt ch-cm-signin", function () { api.signIn(); }));
      } else if (s === "blocked") {
        compose.appendChild(el("p", "ch-cm-note", T("This account can't post comments.")));
      } else if (s === "form") {
        form = profileForm(compose, true, function () { render(); if (box) box.focus(); }, null);
      } else if (s === "box") {
        var id = "cm-box";
        var lab = el("label", "sr-only", T("Your comment"));
        lab.htmlFor = id;
        box = el("textarea", "ch-save-input ch-cm-box");
        box.id = id;
        box.rows = 3;
        box.maxLength = MAX;
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
    function counts() { if (box) left.textContent = box.value.length + " / " + MAX; }
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
    function trouble(r) {
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
    function send() {
      if (posting || state !== "box" || !th) return;
      var text = box.value.trim();
      if (!text) { msg.textContent = T("Write something first."); box.focus(); return; }
      posting = true;
      post.disabled = true;
      msg.textContent = T("Posting…");
      var t = th;
      ask({ action: "post", name: t.name, at: api.at(), text: text }).then(function (r) {
        posting = false;
        if (post) post.disabled = false;
        if (r.status === 200 && r.body && r.body.comment) {
          drafts.delete(t.name);
          if (state === "box") { box.value = ""; msg.textContent = ""; }
          if (typeof r.body.left === "number" && acct.me) acct.me.left = r.body.left;
          cache.clear();
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
        if (state === "box") msg.textContent = trouble(r);
      });
    }
    return { render: render, refresh: refresh };
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
      if (e === "picture") return T("That picture can't be used here. Choose another.");
      if (e === "check") return T("The picture could not be checked just now. Try again later.");
      if (e === "limit") return T("That is the most picture changes for one day. Try again tomorrow.");
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
          msg.textContent = "";
          if (!acct.me || acct.me.failed) acct.me = { left: 100, cap: 100, role: null };
          acct.me.profile = r.body.profile;
          api.picture(r.body.profile.avatar || null);
          cache.clear();
          if (picUrl) URL.revokeObjectURL(picUrl);
          composer.render();
          renderAccount();
          if (th) load(0);
          onDone();
          return;
        }
        msg.textContent = trouble(r);
        sync();
      });
    });
    setPic(undefined, null);
    return { focus: function () { name.focus(); } };
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

  // The profile in the Account panel: the picture or initial, the username, and Edit profile.
  var editing = false;
  function renderAccount() {
    if (!acctBox) return;
    var p = profile();
    acctBox.hidden = !api.who() || !acct.me || !!acct.me.failed;
    if (acctBox.hidden) { editing = false; acctForm.textContent = ""; return; }
    acctFace.textContent = "";
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
  if (acctEdit) acctEdit.addEventListener("click", function () {
    var first = !profile();
    editing = true;
    acctFace.parentNode.hidden = true;
    acctForm.textContent = "";
    var done = function () { editing = false; renderAccount(); acctEdit.focus(); };
    profileForm(acctForm, first, done, done).focus();
  });

  api.ui = {
    // The card shown: its thread ({ name, tag, names }), or null for none (closed, a city's card, or not a country).
    card: function (t) {
      if (!t) {
        if (th) { th = null; seq++; }
        show(false);
        return;
      }
      var key = t.names.join("\u0001");
      if (th && th.key === key && th.name === t.name) { composer.refresh(); return; }
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
      if (w !== acct.who) {
        acct = { who: "", me: null, asking: null };
        cache.clear();
        if (w) loadMe();
        if (th) load(0);
      }
      composer.render();
      renderAccount();
    }
  };
  api.ui.account();
  api.ui.card(api.thread());
})();

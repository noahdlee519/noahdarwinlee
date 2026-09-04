// The blog, which is a mailbox.
//
// The letters live in posts.js as window.BLOG_POSTS, written there by
// import-gmail.mjs from the exported Gmail files. Nothing is fetched: a plain
// script means the page works from a file:// path as well as from the server,
// and there is no build step to forget to run.
//
// Three things are worth knowing about how this behaves:
//
//   The URL carries the open letter — /blog/#tokyo-in-the-rain — so a letter
//   can be linked to and the back button walks the ones you opened. The list
//   is not re-rendered on every keystroke of that; only the selection moves.
//
//   Read and starred state is this browser's, kept in localStorage and wrapped
//   in try/catch, because a private window throws rather than returning null.
//   With no storage at all the page still works; every letter simply reads as
//   unread each visit, which is the honest default for a mailbox.
//
//   The body of a letter is inserted as HTML, because that is what an email is.
//   It is sanitised at import time rather than here — see import-gmail.mjs —
//   so what reaches this file is already only the tags a letter needs.
(function () {
  const posts = Array.isArray(window.BLOG_POSTS) ? window.BLOG_POSTS.slice() : [];

  const el = {
    list: document.getElementById("mail-list"),
    read: document.getElementById("mail-read"),
    blank: document.getElementById("mail-read-blank"),
    folders: document.getElementById("mail-folders"),
    count: document.getElementById("mail-count"),
    empty: document.getElementById("mail-empty"),
    search: document.getElementById("mail-q"),
    panes: document.getElementById("mail-panes"),
    window: document.querySelector(".mail-window"),
    rail: document.querySelector(".mail-rail"),
    listpane: document.querySelector(".mail-listpane"),
    dividerRail: document.getElementById("mail-divider-rail"),
    dividerList: document.getElementById("mail-divider-list")
  };
  if (!el.list) return;

  /* Newest first, the way a mailbox is stacked. A letter with no date sinks to
     the bottom rather than throwing the sort. */
  posts.sort(function (a, b) {
    return (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0);
  });

  /* ---------------- what this browser remembers ---------------- */

  const READ_KEY = "ndl-blog-read-v1";
  const STAR_KEY = "ndl-blog-starred-v1";

  function load(key) {
    try {
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(list) ? list : []);
    } catch (err) {
      return new Set();
    }
  }

  function save(key, set) {
    try {
      localStorage.setItem(key, JSON.stringify([...set]));
    } catch (err) {
      /* A private window, or storage turned off. The page does not depend on
         it, so there is nothing to do and nothing worth saying. */
    }
  }

  const read = load(READ_KEY);
  const starred = load(STAR_KEY);

  /* ---------------- dates, the way a mailbox writes them ---------------- */

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const thisYear = new Date().getFullYear();

  /* Short in the list: "12 Mar" for this year, "12 Mar 2024" for any other —
     which is the rule every mail client lands on, because the year is only
     news when it is not the current one. */
  function shortDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const day = d.getDate();
    const month = MONTHS[d.getMonth()];
    return d.getFullYear() === thisYear
      ? day + " " + month
      : day + " " + month + " " + d.getFullYear();
  }

  function longDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear() + ", " + time;
  }

  /* ---------------- filtering ---------------- */

  let label = "inbox";       // the folder in the rail
  let query = "";            // what is typed in the search box
  let openId = null;         // the letter in the reading pane
  let shown = [];            // the rows currently in the list, in order

  function haystack(post) {
    if (post._hay) return post._hay;
    /* The body is searched as text rather than as markup, so a search for
       "table" does not match every letter that happens to contain one. */
    const tmp = document.createElement("div");
    tmp.innerHTML = post.body || "";
    post._hay = [
      post.subject || "",
      post.preview || "",
      (post.labels || []).join(" "),
      tmp.textContent || ""
    ].join(" ").toLowerCase();
    return post._hay;
  }

  /* Spam is its own place: what is filed there shows up under Spam and
     nowhere else — not in the inbox, not in Starred or Unread, not in a
     label, and not in a search run from any of those. */
  const isSpam = (post) => post.folder === "spam";

  function matches(post) {
    if (label === "spam") {
      if (!isSpam(post)) return false;
    } else {
      if (isSpam(post)) return false;
      if (label === "starred" && !starred.has(post.id)) return false;
      if (label === "unread" && read.has(post.id)) return false;
      if (label !== "inbox" && label !== "starred" && label !== "unread") {
        if (!(post.labels || []).includes(label)) return false;
      }
    }
    if (!query) return true;
    return haystack(post).indexOf(query) !== -1;
  }

  /* ---------------- the rail ---------------- */

  function labelCounts() {
    const counts = new Map();
    posts.forEach(function (post) {
      if (isSpam(post)) return;
      (post.labels || []).forEach(function (name) {
        counts.set(name, (counts.get(name) || 0) + 1);
      });
    });
    return counts;
  }

  /* Plain line icons for the rail, drawn here so the page carries no icon
     font and borrows nobody's set. */
  const ICONS = {
    inbox:
      '<path d="M3 13h5l1.5 2.5h5L16 13h5" />' +
      '<path d="M3 13l2.2-7A1.5 1.5 0 0 1 6.6 5h10.8a1.5 1.5 0 0 1 1.4 1L21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />',
    starred:
      '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8z" />',
    unread:
      '<rect x="3" y="5" width="18" height="14" rx="2" />' +
      '<path d="M3 7l9 6 9-6" />',
    spam:
      '<path d="M8.2 3h7.6L21 8.2v7.6L15.8 21H8.2L3 15.8V8.2z" />' +
      '<path d="M12 8v5" /><path d="M12 16.5v.01" />'
  };

  /* The default picture a mail account shows before it has one: a grey disc
     and the outline of nobody in particular. */
  function anonAvatar(extraClass) {
    const span = document.createElement("span");
    span.className = "mail-avatar" + (extraClass ? " " + extraClass : "");
    span.setAttribute("aria-hidden", "true");
    span.innerHTML =
      '<svg viewBox="2.5 2 19 19"><circle cx="12" cy="8.5" r="4.4" />' +
      '<path d="M2.5 22c0-4.6 4.2-7.2 9.5-7.2s9.5 2.6 9.5 7.2z" /></svg>';
    return span;
  }

  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("class", "mail-folder-icon");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = ICONS[name] || "";
    return svg;
  }

  function renderFolders() {
    if (!el.folders) return;
    const unread = posts.filter(function (p) { return !isSpam(p) && !read.has(p.id); }).length;
    const spamUnread = posts.filter(function (p) { return isSpam(p) && !read.has(p.id); }).length;
    const rows = [
      { key: "inbox", name: "Inbox", badge: unread || "" },
      { key: "starred", name: "Starred", badge: starred.size || "" },
      { key: "unread", name: "Unread", badge: unread || "" }
    ];
    if (posts.some(isSpam)) rows.push({ key: "spam", name: "Spam", badge: spamUnread || "" });
    const counts = labelCounts();
    [...counts.keys()].sort().forEach(function (name) {
      rows.push({ key: name, name: name, badge: counts.get(name), isLabel: true });
    });

    el.folders.textContent = "";
    let titled = false;
    rows.forEach(function (row) {
      if (row.isLabel && !titled) {
        titled = true;
        const t = document.createElement("li");
        t.className = "mail-rail-title";
        t.textContent = "Labels";
        el.folders.appendChild(t);
      }
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mail-folder" + (row.isLabel ? " is-label" : "");
      btn.setAttribute("aria-current", row.key === label ? "true" : "false");
      if (row.key === label) btn.classList.add("is-on");

      if (row.isLabel) {
        const dot = document.createElement("span");
        dot.className = "mail-labeldot";
        dot.style.background = labelColor(row.name);
        btn.appendChild(dot);
      } else {
        btn.appendChild(icon(row.key));
      }
      const text = document.createElement("span");
      text.className = "mail-folder-name";
      text.textContent = row.name;
      btn.appendChild(text);

      if (row.badge) {
        const badge = document.createElement("span");
        badge.className = "mail-folder-badge";
        badge.textContent = String(row.badge);
        btn.appendChild(badge);
      }

      btn.addEventListener("click", function () {
        label = row.key;
        renderFolders();
        renderList();
      });
      li.appendChild(btn);
      el.folders.appendChild(li);
    });
  }

  /* A label's colour is derived from its own letters, so the same place is the
     same colour every time without a table to keep in step with the posts. */
  function labelColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) % 360;
    }
    return "hsl(" + hash + " 52% 46%)";
  }

  /* ---------------- the list ---------------- */

  function renderList() {
    shown = posts.filter(matches);
    el.list.textContent = "";

    shown.forEach(function (post) {
      el.list.appendChild(row(post));
    });

    const none = shown.length === 0;
    if (el.empty) {
      el.empty.hidden = !none;
      el.empty.textContent = posts.length
        ? "Nothing here."
        : "No letters yet — run the importer over the exported mail.";
    }
    if (el.count) {
      el.count.textContent = shown.length
        ? "1\u2013" + shown.length + " of " + shown.length
        : "";
    }
  }

  function row(post) {
    const li = document.createElement("li");
    li.className = "mail-row";
    li.dataset.id = post.id;
    if (!read.has(post.id)) li.classList.add("is-unread");
    if (post.id === openId) li.classList.add("is-open");

    /* The star is a button of its own so that starring does not open the
       letter, and so it is reachable without a mouse. */
    const star = document.createElement("button");
    star.type = "button";
    star.className = "mail-star";
    star.setAttribute("aria-pressed", starred.has(post.id) ? "true" : "false");
    star.setAttribute(
      "aria-label",
      (starred.has(post.id) ? "Unstar" : "Star") + " " + (post.subject || "this letter")
    );
    star.textContent = starred.has(post.id) ? "\u2605" : "\u2606";
    star.addEventListener("click", function (event) {
      event.stopPropagation();
      if (starred.has(post.id)) starred.delete(post.id);
      else starred.add(post.id);
      save(STAR_KEY, starred);
      renderFolders();
      renderList();
    });
    li.appendChild(star);

    const open = document.createElement("a");
    open.className = "mail-rowlink";
    open.href = "#" + post.id;

    const from = document.createElement("span");
    from.className = "mail-from";
    from.textContent = post.fromName || "Noah";
    open.appendChild(from);

    const middle = document.createElement("span");
    middle.className = "mail-middle";
    const subject = document.createElement("span");
    subject.className = "mail-subject";
    subject.textContent = post.subject || "(no subject)";
    middle.appendChild(subject);
    const snippet = document.createElement("span");
    snippet.className = "mail-snippet";
    /* No dash in front of it: the subject has its own line above, so the two
       do not run together and nothing is needed to separate them. */
    snippet.textContent = post.preview || "";
    middle.appendChild(snippet);
    open.appendChild(middle);

    if ((post.labels || []).length) {
      const chips = document.createElement("span");
      chips.className = "mail-chips";
      post.labels.forEach(function (name) {
        const chip = document.createElement("span");
        chip.className = "mail-chip";
        chip.style.borderColor = labelColor(name);
        chip.style.color = labelColor(name);
        chip.textContent = name;
        chips.appendChild(chip);
      });
      open.appendChild(chips);
    }

    const when = document.createElement("time");
    when.className = "mail-when";
    if (post.date) when.dateTime = post.date;
    when.textContent = shortDate(post.date);
    open.appendChild(when);

    li.appendChild(open);

    /* Shown on hover, only on a row that has been read: the one thing this
       mailbox lets you undo. Opening a letter is how it gets read. */
    if (read.has(post.id)) {
      const tools = document.createElement("span");
      tools.className = "mail-row-tools";
      const unread = document.createElement("button");
      unread.type = "button";
      unread.className = "mail-tool mail-row-unread";
      unread.title = "Mark as unread";
      unread.setAttribute("aria-label", "Mark as unread: " + (post.subject || "this letter"));
      unread.innerHTML = '<svg viewBox="0 0 24 24">' + ICONS.unread + "</svg>";
      unread.addEventListener("click", function (event) {
        event.stopPropagation();
        markUnread(post.id);
      });
      tools.appendChild(unread);
      li.appendChild(tools);
    }
    return li;
  }

  /* ---------------- the reading pane ---------------- */

  function openPost(id, options) {
    const post = posts.find(function (p) { return p.id === id; });
    if (!post) return false;

    openId = id;
    if (!read.has(id)) {
      read.add(id);
      save(READ_KEY, read);
      renderFolders();
    }
    renderList();

    el.read.textContent = "";
    el.read.appendChild(letter(post));
    el.read.scrollTop = 0;
    /* On a phone the two panes are one column deep; opening a letter slides the
       list away, and Escape or the back arrow brings it back. */
    if (el.panes) el.panes.classList.add("is-reading");

    if (!options || !options.silent) {
      if (location.hash.slice(1) !== id) {
        history.pushState(null, "", "#" + id);
      }
    }
    document.title = (post.subject || "Blog") + " — Noah Darwin Lee";
    return true;
  }

  /* Marking a letter unread puts it back the way it was before it was opened,
     which means closing it: a bold row in the list, and nothing in the pane. */
  function markUnread(id) {
    read.delete(id);
    save(READ_KEY, read);
    if (openId === id) closePost();
    renderFolders();
    renderList();
  }

  function closePost() {
    openId = null;
    el.read.textContent = "";
    el.read.appendChild(el.blank);
    if (el.panes) el.panes.classList.remove("is-reading");
    if (location.hash) {
      history.pushState(null, "", location.pathname + location.search);
    }
    document.title = "Blog — Noah Darwin Lee";
    renderList();
  }

  function letter(post) {
    const wrap = document.createElement("div");
    wrap.className = "mail-letter";

    const back = document.createElement("button");
    back.type = "button";
    back.className = "mail-back";
    back.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
      '<path d="M20 12H5M11 6l-6 6 6 6" /></svg>';
    back.appendChild(document.createTextNode("Back"));
    back.addEventListener("click", closePost);
    wrap.appendChild(back);

    const h = document.createElement("h2");
    h.className = "mail-letter-subject";
    h.textContent = post.subject || "(no subject)";
    wrap.appendChild(h);

    if ((post.labels || []).length) {
      const chips = document.createElement("p");
      chips.className = "mail-chips mail-letter-chips";
      post.labels.forEach(function (name) {
        const chip = document.createElement("span");
        chip.className = "mail-chip";
        chip.style.borderColor = labelColor(name);
        chip.style.color = labelColor(name);
        chip.textContent = name;
        chips.appendChild(chip);
      });
      wrap.appendChild(chips);
    }

    if (isSpam(post)) {
      const warn = document.createElement("div");
      warn.className = "mail-spam-banner";
      warn.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS.spam + "</svg>" +
        "<div><b>Why is this message in spam?</b> It is similar to messages that " +
        "were identified as spam in the past." +
        (post.imagesWithheld ? " Images are not displayed." : "") +
        "</div>";
      wrap.appendChild(warn);
    }

    const head = document.createElement("div");
    head.className = "mail-letter-head";

    head.appendChild(anonAvatar());

    const who = document.createElement("div");
    who.className = "mail-letter-who";
    const line1 = document.createElement("span");
    line1.className = "mail-letter-from";
    line1.textContent = post.fromName || "Noah Darwin Lee";
    if (post.fromAddress) {
      const addr = document.createElement("span");
      addr.className = "mail-letter-address";
      addr.textContent = " <" + post.fromAddress + ">";
      line1.appendChild(addr);
    }
    who.appendChild(line1);
    const line2 = document.createElement("span");
    line2.className = "mail-letter-to";
    line2.textContent = "to " + (post.to || "me");
    who.appendChild(line2);
    head.appendChild(who);

    const when = document.createElement("time");
    when.className = "mail-letter-when";
    if (post.date) when.dateTime = post.date;
    when.textContent = longDate(post.date);
    head.appendChild(when);

    const tools = document.createElement("div");
    tools.className = "mail-letter-tools";

    const star = document.createElement("button");
    star.type = "button";
    star.className = "mail-tool";
    const paintStar = function () {
      const on = starred.has(post.id);
      star.setAttribute("aria-pressed", on ? "true" : "false");
      star.setAttribute("aria-label", on ? "Unstar" : "Star");
      star.title = on ? "Starred" : "Not starred";
    };
    star.innerHTML = '<svg viewBox="0 0 24 24">' + ICONS.starred + "</svg>";
    paintStar();
    star.addEventListener("click", function () {
      if (starred.has(post.id)) starred.delete(post.id);
      else starred.add(post.id);
      save(STAR_KEY, starred);
      paintStar();
      renderFolders();
      renderList();
    });
    tools.appendChild(star);

    const unread = document.createElement("button");
    unread.type = "button";
    unread.className = "mail-tool";
    unread.title = "Mark as unread";
    unread.setAttribute("aria-label", "Mark as unread");
    unread.innerHTML = '<svg viewBox="0 0 24 24">' + ICONS.unread + "</svg>";
    unread.addEventListener("click", function () {
      markUnread(post.id);
    });
    tools.appendChild(unread);

    head.appendChild(tools);

    wrap.appendChild(head);

    const body = document.createElement("div");
    body.className = "mail-letter-body";
    body.innerHTML = post.body || "";
    /* Anything that did survive import as a link leaves this site, so it is
       given the treatment every other outbound link here gets. */
    body.querySelectorAll("a[href]").forEach(function (a) {
      const href = a.getAttribute("href") || "";
      if (/^https?:/i.test(href)) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
    });
    wrap.appendChild(body);

    /* Reply writes to the sender; Forward opens a blank mail with a link to
       this letter in it, which is the most a page can do without a mail
       server of its own. */
    const actions = document.createElement("div");
    actions.className = "mail-letter-actions";
    const subject = post.subject || "(no subject)";
    const here = location.origin + location.pathname + "#" + post.id;

    const reply = document.createElement("a");
    reply.className = "mail-action";
    reply.href =
      "mailto:" + (post.fromAddress || "noahlee519@gmail.com") +
      "?subject=" + encodeURIComponent("Re: " + subject);
    reply.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M10 8L4 13l6 5v-3.5c5 0 8 1.5 10 5-.5-5.5-4-9-10-9.5z" /></svg>';
    reply.appendChild(document.createTextNode("Reply"));
    actions.appendChild(reply);

    const fwd = document.createElement("a");
    fwd.className = "mail-action";
    fwd.href =
      "mailto:?subject=" + encodeURIComponent("Fwd: " + subject) +
      "&body=" + encodeURIComponent(here);
    fwd.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M14 8l6 5-6 5v-3.5c-5 0-8 1.5-10 5 .5-5.5 4-9 10-9.5z" /></svg>';
    fwd.appendChild(document.createTextNode("Forward"));
    actions.appendChild(fwd);

    wrap.appendChild(actions);

    return wrap;
  }

  /* ---------------- moving around ---------------- */

  function indexOfOpen() {
    return shown.findIndex(function (p) { return p.id === openId; });
  }

  function step(by) {
    if (!shown.length) return;
    let next = indexOfOpen() + by;
    if (next < 0) next = 0;
    if (next > shown.length - 1) next = shown.length - 1;
    openPost(shown[next].id);
    const row = el.list.querySelector('[data-id="' + cssEscape(shown[next].id) + '"]');
    if (row && row.scrollIntoView) row.scrollIntoView({ block: "nearest" });
  }

  /* CSS.escape is not everywhere, and an id out of a subject line can carry
     anything, so this is the small part of it that matters here. */
  function cssEscape(value) {
    return String(value).replace(/["\\]/g, "\\$&");
  }

  document.addEventListener("keydown", function (event) {
    const typing =
      document.activeElement &&
      /^(input|textarea|select)$/i.test(document.activeElement.tagName);

    if (event.key === "/" && !typing) {
      event.preventDefault();
      if (el.search) el.search.focus();
      return;
    }
    if (event.key === "Escape") {
      if (typing && el.search && document.activeElement === el.search) {
        el.search.blur();
        return;
      }
      if (openId) closePost();
      return;
    }
    if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

    if (event.key === "U" && event.shiftKey && openId) {
      event.preventDefault();
      markUnread(openId);
      return;
    }
    if (event.key === "j") { event.preventDefault(); step(1); }
    else if (event.key === "k") { event.preventDefault(); step(-1); }
    else if (event.key === "Enter" && !openId && shown.length) {
      event.preventDefault();
      openPost(shown[0].id);
    }
  });

  if (el.search) {
    el.search.addEventListener("input", function () {
      query = el.search.value.trim().toLowerCase();
      renderList();
    });
  }

  /* ---------------- the dividers ---------------- */

  /* The rail and the list can be dragged wider or narrower, and the window
     remembers where they were left. Each divider sets one custom property on
     the window; the stylesheet does the rest. Double-click puts one back. */
  const SIZE_KEY = "ndl-blog-panes-v1";
  const PANES = {
    rail: { prop: "--mail-rail-w", min: 150, max: 380, fallback: 240, el: el.rail },
    list: { prop: "--mail-list-w", min: 240, max: 720, fallback: 0, el: el.listpane }
  };

  function loadSizes() {
    try {
      const raw = localStorage.getItem(SIZE_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === "object" ? obj : {};
    } catch (err) {
      return {};
    }
  }

  const sizes = loadSizes();

  function applySizes() {
    if (!el.window) return;
    Object.keys(PANES).forEach(function (key) {
      const pane = PANES[key];
      const px = Number(sizes[key]);
      if (px > 0) el.window.style.setProperty(pane.prop, px + "px");
      else el.window.style.removeProperty(pane.prop);
    });
  }

  function setSize(key, px) {
    const pane = PANES[key];
    /* The list may not eat the letter: whatever it takes, the letter keeps
       at least 320px. */
    let ceiling = pane.max;
    if (key === "list" && el.panes) {
      ceiling = Math.min(ceiling, el.panes.getBoundingClientRect().width - 320);
    }
    const clamped = Math.max(pane.min, Math.min(ceiling, Math.round(px)));
    sizes[key] = clamped;
    applySizes();
    try {
      localStorage.setItem(SIZE_KEY, JSON.stringify(sizes));
    } catch (err) {
      /* nothing to do; the drag still works for this visit */
    }
  }

  function resetSize(key) {
    delete sizes[key];
    applySizes();
    try {
      localStorage.setItem(SIZE_KEY, JSON.stringify(sizes));
    } catch (err) {}
  }

  function wireDivider(divider, key) {
    if (!divider) return;
    const pane = PANES[key];

    divider.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 || !pane.el) return;
      event.preventDefault();
      const startX = event.clientX;
      const startW = pane.el.getBoundingClientRect().width;
      divider.setPointerCapture(event.pointerId);
      divider.classList.add("is-dragging");
      document.body.classList.add("is-resizing-mail");

      const move = function (e) { setSize(key, startW + (e.clientX - startX)); };
      const stop = function (e) {
        divider.removeEventListener("pointermove", move);
        divider.removeEventListener("pointerup", stop);
        divider.removeEventListener("pointercancel", stop);
        divider.classList.remove("is-dragging");
        document.body.classList.remove("is-resizing-mail");
        try { divider.releasePointerCapture(e.pointerId); } catch (err) {}
      };
      divider.addEventListener("pointermove", move);
      divider.addEventListener("pointerup", stop);
      divider.addEventListener("pointercancel", stop);
    });

    divider.addEventListener("dblclick", function () { resetSize(key); });

    divider.addEventListener("keydown", function (event) {
      if (!pane.el) return;
      const w = pane.el.getBoundingClientRect().width;
      if (event.key === "ArrowLeft") { event.preventDefault(); setSize(key, w - 16); }
      else if (event.key === "ArrowRight") { event.preventDefault(); setSize(key, w + 16); }
      else if (event.key === "Home" || event.key === "Enter") { event.preventDefault(); resetSize(key); }
    });
  }

  applySizes();
  wireDivider(el.dividerRail, "rail");
  wireDivider(el.dividerList, "list");

  /* The list is one click target per row; the anchor inside carries the href so
     that middle-click and cmd-click still open a real URL. */
  el.list.addEventListener("click", function (event) {
    const link = event.target.closest ? event.target.closest(".mail-rowlink") : null;
    if (!link) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    const li = link.closest(".mail-row");
    if (li) openPost(li.dataset.id);
  });

  function fromHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id && openPost(id, { silent: true })) return;
    if (openId) closePost();
  }

  window.addEventListener("popstate", fromHash);
  window.addEventListener("hashchange", fromHash);

  renderFolders();
  renderList();
  if (location.hash) fromHash();
})();

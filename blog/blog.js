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
    markAll: document.getElementById("mail-markall"),
    panes: document.getElementById("mail-panes")
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

  function matches(post) {
    if (label === "starred" && !starred.has(post.id)) return false;
    if (label === "unread" && read.has(post.id)) return false;
    if (label !== "inbox" && label !== "starred" && label !== "unread") {
      if (!(post.labels || []).includes(label)) return false;
    }
    if (!query) return true;
    return haystack(post).indexOf(query) !== -1;
  }

  /* ---------------- the rail ---------------- */

  function labelCounts() {
    const counts = new Map();
    posts.forEach(function (post) {
      (post.labels || []).forEach(function (name) {
        counts.set(name, (counts.get(name) || 0) + 1);
      });
    });
    return counts;
  }

  function renderFolders() {
    if (!el.folders) return;
    const unread = posts.filter(function (p) { return !read.has(p.id); }).length;
    const rows = [
      { key: "inbox", name: "Inbox", badge: unread || "" },
      { key: "unread", name: "Unread", badge: unread || "" },
      { key: "starred", name: "Starred", badge: starred.size || "" }
    ];
    const counts = labelCounts();
    [...counts.keys()].sort().forEach(function (name) {
      rows.push({ key: name, name: name, badge: counts.get(name), isLabel: true });
    });

    el.folders.textContent = "";
    rows.forEach(function (row) {
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
        ? shown.length + (shown.length === 1 ? " letter" : " letters")
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
    snippet.textContent = post.preview ? " — " + post.preview : "";
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
    back.textContent = "\u2190 all letters";
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

    const head = document.createElement("div");
    head.className = "mail-letter-head";

    const avatar = document.createElement("span");
    avatar.className = "mail-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = (post.fromName || "N").trim().charAt(0).toUpperCase();
    head.appendChild(avatar);

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
    line2.textContent = "to " + (post.to || "friends and family");
    who.appendChild(line2);
    head.appendChild(who);

    const when = document.createElement("time");
    when.className = "mail-letter-when";
    if (post.date) when.dateTime = post.date;
    when.textContent = longDate(post.date);
    head.appendChild(when);

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

    const foot = document.createElement("p");
    foot.className = "mail-letter-foot";
    foot.textContent = "Sent " + (longDate(post.date) || "some time ago") + ".";
    wrap.appendChild(foot);

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

  if (el.markAll) {
    el.markAll.addEventListener("click", function () {
      posts.forEach(function (p) { read.add(p.id); });
      save(READ_KEY, read);
      renderFolders();
      renderList();
    });
  }

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

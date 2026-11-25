// Checks the Comments section at the end of CHRONIA's country card and the profile in the Account panel, headlessly,
// with the chronia-comments function played by a small stand-in kept here in memory (the live function is never called).
// Serve the repository root first (python3 -m http.server 8101), then:
// node tools/chronia-comments-check.mjs [base URL] [directory for screenshots]
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)("playwright");

const base = process.argv[2] || "http://localhost:8101/chronia/";
const shots = process.argv[3] || "";
if (shots) mkdirSync(shots, { recursive: true });
const origin = new URL(base).origin;
const PIC = origin + "/favicon-32.png";
const browser = await chromium.launch();
let bad = 0, good = 0;
const say = (ok, what, got) => { if (ok) good++; else bad++; console.log((ok ? "ok   " : "FAIL ") + what + (ok ? "" : ": " + got)); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const jwt = (claims) => "h." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".s";
const TOKEN = jwt({ sub: "11111111-2222-3333-4444-555555555555", email: "reader@example.com", exp: Math.floor(Date.now() / 1000) + 36000, user_metadata: { full_name: "Ada Reader" } });

// The stand-in for chronia-comments. `s.answer(body)` may return [status, json] to take over an action, `s.delay(body)`
// a wait in ms, and `s.fail` a status for every call (or "abort"). With `s.tree` false it is the function before
// replies and upvotes: no votes or replies in a list, and 400 action to thread, vote, and mine.
function standIn() {
  const s = { calls: [], comments: [], me: null, role: null, fail: null, answer: null, delay: null, nextId: 5000, left: 100, nameWhy: {}, pictureError: null, tree: true, voted: new Set() };
  s.add = (c) => {
    const x = Object.assign({ id: s.nextId++, username: "Herodotus", avatar: null, polity: "France", at: "1900", text: "A comment.", mine: false, parent: null, votes: 0, state: "live" }, c);
    const p = x.parent !== null ? s.comments.find((y) => y.id === x.parent) : null;
    x.root = p ? p.root || p.id : null;
    x.depth = p ? Math.min(8, p.depth + 1) : 0;
    if (p && p.depth === 8) { x.parent = p.parent; x.replying_to = p.username; }
    s.comments.push(x);
    return x;
  };
  // A comment as the function sends it, for the reader (signed in or not).
  const out = (c, auth) => {
    const base = { id: c.id, username: c.username, avatar: c.avatar, polity: c.polity, at: c.at, text: c.text, mine: !!auth && !!c.mine };
    if (!s.tree) return base;
    if (c.deleted) return Object.assign(base, { username: null, avatar: null, text: "", mine: false, parent: c.parent, root: c.root, depth: c.depth, votes: 0, voted: false, replying_to: null, deleted: true });
    return Object.assign(base, { parent: c.parent, root: c.root, depth: c.depth, votes: c.votes, voted: !!auth && s.voted.has(c.id), replying_to: c.replying_to || null });
  };
  const replies = (c) => s.comments.filter((r) => r.root === c.id && !r.deleted).length;
  s.handle = async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Allow-Methods": "POST" } });
    const body = JSON.parse(req.postData() || "{}"), auth = req.headers().authorization || "";
    s.calls.push(Object.assign({ auth }, body));
    const reply = (status, out) => route.fulfill({ status, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }, body: JSON.stringify(out) });
    if (s.delay) { const ms = s.delay(body); if (ms) await wait(ms); }
    if (s.fail === "abort") return route.abort();
    if (s.fail) return reply(s.fail, { error: "store" });
    if (s.answer) { const r = s.answer(body); if (r) return reply(r[0], r[1]); }
    const a = body.action;
    if (a === "list") {
      if (!["new", "near", "top", undefined].includes(body.sort) || (body.sort === "top" && !s.tree)) return reply(400, { error: "field", field: "sort" });
      let l = s.comments.filter((c) => (c.any || (body.names || []).includes(c.polity)) && c.parent === null && (!c.deleted || replies(c)));
      l = l.slice().sort((x, y) => (body.sort === "top" ? y.votes - x.votes : 0) || y.id - x.id);
      const off = body.offset || 0;
      return reply(200, { comments: l.slice(off, off + 20).map((c) => Object.assign(out(c, auth), s.tree ? { replies: replies(c) } : {})), more: l.length > off + 20, total: l.length });
    }
    if (a === "thread") {
      if (!s.tree) return reply(400, { error: "action" });
      const c = s.comments.find((x) => x.id === body.id);
      if (!c) return reply(404, { error: "gone" });
      const root = c.root || c.id;
      const l = s.comments.filter((x) => x.id === root || x.root === root).sort((x, y) => x.id - y.id);
      return reply(200, { comments: l.map((x) => out(x, auth)), more: false, root });
    }
    if (!s.tree && (a === "vote" || a === "mine")) return reply(400, { error: "action" });
    if (!auth) return reply(401, { error: "signin" });
    if (a === "me") return reply(200, { profile: s.me, left: s.left, cap: 100, role: s.role });
    if (a === "name") { const w = s.nameWhy[String(body.username).toLowerCase()]; return reply(200, w ? { ok: false, why: w } : { ok: true }); }
    if (a === "profile") {
      if (!s.me && body.age !== true) return reply(400, { error: "age" });
      // A first save makes the profile before the picture is checked; a picture that then fails still answers 200.
      if (!s.me && body.avatar && s.pictureError) {
        s.me = { username: body.username, avatar: null, blocked: false };
        return reply(200, { profile: s.me, picture_error: s.pictureError });
      }
      s.me = { username: body.username || (s.me && s.me.username), avatar: body.avatar === "" ? null : body.avatar ? PIC : s.me ? s.me.avatar : null, blocked: false };
      return reply(200, { profile: s.me });
    }
    if (a === "post") {
      if (!s.me) return reply(403, { error: "profile" });
      if (body.parent !== undefined && !s.comments.some((x) => x.id === body.parent && !x.deleted)) return reply(404, { error: "gone" });
      const c = s.add({ username: s.me.username, avatar: s.me.avatar, polity: body.name, at: body.at, text: body.text, mine: true, parent: body.parent === undefined ? null : body.parent });
      s.left--;
      return reply(200, { comment: out(c, auth), left: s.left });
    }
    if (a === "vote") {
      const c = s.comments.find((x) => x.id === body.id && !x.deleted);
      if (!c) return reply(404, { error: "gone" });
      if (c.mine) return reply(403, { error: "own" });
      if (body.on && !s.voted.has(c.id)) { s.voted.add(c.id); c.votes++; }
      if (!body.on && s.voted.has(c.id)) { s.voted.delete(c.id); c.votes--; }
      return reply(200, { votes: c.votes, voted: s.voted.has(c.id) });
    }
    if (a === "mine") {
      const l = s.comments.filter((c) => c.mine && !c.deleted).sort((x, y) => y.id - x.id), off = body.offset || 0;
      return reply(200, { comments: l.slice(off, off + 20).map((c) => Object.assign(out(c, auth), { mine: true, state: c.state, replying_to: c.replying_to || (c.parent !== null ? (s.comments.find((p) => p.id === c.parent) || {}).username || null : null) })), more: l.length > off + 20 });
    }
    if (a === "delete") {
      const c = s.comments.find((x) => x.id === body.id);
      const kids = c && s.comments.some((x) => x.parent === c.id);
      if (c && kids && s.tree) { Object.assign(c, { deleted: true, mine: false }); return reply(200, { ok: true, soft: true }); }
      s.comments = s.comments.filter((x) => x.id !== body.id);
      return reply(200, s.tree ? { ok: true, soft: false } : { ok: true });
    }
    if (a === "flag") return reply(200, { ok: true });
    return reply(400, { error: "action" });
  };
  return s;
}

// A page with the tour and the key put away, every other server function answering nothing, and chronia-comments
// played by `s`. `signedIn` keeps a session under chronia-auth as the report panel does.
async function open(s, { width = 1200, height = 800, signedIn = false } = {}) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.errors = [];
  page.asked = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  page.on("request", (r) => page.asked.push(r.url()));
  await page.addInitScript(([t]) => {
    try { localStorage.setItem("chronia-tour", "1"); localStorage.setItem("chronia-key", "0"); localStorage.setItem("chronia-signin-later", String(Date.now())); } catch (e) {}
    if (t) try { localStorage.setItem("chronia-auth", JSON.stringify({ a: t, r: "refresh", e: Date.now() + 36e5 })); } catch (e) {}
  }, [signedIn ? TOKEN : ""]);
  await page.route(/wikipedia\.org|wikidata\.org|accounts\.google|googlesyndication|doubleclick|adtrafficquality/, (r) => r.fulfill({ status: 404, body: "" }));
  await page.route(/functions\/v1\/(?!chronia-comments)/, (r) => r.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" } }));
  await page.route(/functions\/v1\/chronia-comments/, (r) => s.handle(r));
  await page.goto(base, { waitUntil: "load" });
  await page.waitForFunction(() => window.__chronia && window.__chronia.ready(), null, { timeout: 120000 });
  return page;
}
async function setDate(page, date) {
  await page.evaluate((d) => window.__chronia.setYear(d), date);
  await page.waitForTimeout(800);
  await page.waitForFunction(() => window.__chronia.ready(), null, { timeout: 60000 });
}
async function card(page, name) {
  const ok = await page.evaluate((n) => window.__chronia.selectName(n), name);
  if (!ok) throw new Error("not on the map: " + name);
}
const settle = (page, ms = 500) => page.waitForTimeout(ms);
const lists = (s) => s.calls.filter((c) => c.action === "list");
const view = (page) => page.evaluate(() => {
  const cm = document.getElementById("cm"), rule = document.getElementById("cm-rule");
  if (!cm) return { exists: false };
  const vis = (el) => !!el && !el.hidden && !el.closest("[hidden]");
  const src = document.getElementById("src");
  return {
    exists: true, shown: vis(cm), rule: vis(rule),
    afterSources: !!src && src.nextElementSibling === rule && rule.nextElementSibling === cm,
    head: (document.getElementById("cm-head") || {}).textContent || "",
    sort: [...cm.querySelectorAll(".ch-cm-sort button")].map((b) => b.textContent + (b.getAttribute("aria-pressed") === "true" ? "*" : "")),
    sortText: (cm.querySelector(".ch-cm-sort") || {}).textContent || "",
    items: [...cm.querySelectorAll(".ch-cm-item")].map((li) => ({
      user: (li.querySelector(".ch-cm-user") || {}).textContent || "",
      pic: (li.querySelector("img.ch-cm-pic") || {}).src || "",
      initial: (li.querySelector(".ch-cm-initial") || {}).textContent || "",
      date: (li.querySelector(".ch-cm-date") || {}).textContent || "",
      where: (li.querySelector(".ch-cm-where") || {}).textContent || "",
      text: (li.querySelector(".ch-cm-text") || {}).textContent || "",
      acts: [...li.querySelectorAll(".ch-cm-acts > button")].map((b) => b.textContent),
      tree: [...li.querySelectorAll(".ch-cm-tree > *")].map((b) => b.textContent),
      imgs: li.querySelectorAll("img").length, bold: li.querySelectorAll("b, i").length
    })),
    count: (cm.querySelector(".ch-cm-count") || {}).textContent || "",
    empty: vis(cm.querySelector(".ch-cm-empty")) ? cm.querySelector(".ch-cm-empty").textContent : "",
    more: vis(cm.querySelector(".ch-cm-more")),
    signin: vis(cm.querySelector(".ch-cm-signin")) ? cm.querySelector(".ch-cm-signin").textContent : "",
    box: vis(cm.querySelector(".ch-cm-box")),
    left: (cm.querySelector(".ch-cm-left") || {}).textContent || "",
    line: (cm.querySelector(".ch-cm-line") || {}).textContent || "",
    post: vis(cm.querySelector(".ch-cm-post")) ? cm.querySelector(".ch-cm-post").textContent : "",
    today: vis(cm.querySelector(".ch-cm-today")) ? cm.querySelector(".ch-cm-today").textContent : "",
    msg: (cm.querySelector(".ch-cm-msg") || {}).textContent || "",
    form: vis(cm.querySelector(".ch-pf"))
  };
});
const form = (page, where) => page.evaluate((w) => {
  const f = document.querySelector(w + " .ch-pf");
  if (!f || f.closest("[hidden]")) return null;
  const q = (c) => f.querySelector(c);
  return {
    name: q(".ch-pf-name").value, rule: (q(".ch-pf-rule") || {}).textContent || "", status: q(".ch-pf-status").textContent,
    age: q(".ch-pf-age") ? (q(".ch-pf-age").closest("label") || {}).textContent.trim() : null,
    ageChecked: q(".ch-pf-age") ? q(".ch-pf-age").checked : null,
    terms: [...f.querySelectorAll("a")].map((a) => a.getAttribute("href")),
    save: q(".ch-pf-save").disabled ? "disabled" : "enabled",
    msg: q(".ch-pf-msg").textContent,
    preview: !!f.querySelector(".ch-pf-preview img"), remove: q(".ch-pf-remove") ? !q(".ch-pf-remove").hidden : false,
    labelled: [...f.querySelectorAll("input")].every((i) => i.type === "file" || i.labels.length > 0 || i.getAttribute("aria-label")),
    live: !!f.querySelector(".ch-pf-status[aria-live], .ch-pf-status[role=status]") && !!f.querySelector(".ch-pf-msg[aria-live], .ch-pf-msg[role=alert], .ch-pf-msg[role=status]")
  };
}, where);
// A picture of w by h to choose, made in the page as a PNG.
async function pngOf(page, w, h) {
  const b64 = await page.evaluate(([w, h]) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d");
    for (let i = 0; i < 4000; i++) { x.fillStyle = "hsl(" + (i * 37 % 360) + ",70%," + (30 + i % 50) + "%)"; x.fillRect((i * 97) % w, (i * 61) % h, 23, 17); }
    return c.toDataURL("image/png").split(",")[1];
  }, [w, h]);
  return { name: "me.png", mimeType: "image/png", buffer: Buffer.from(b64, "base64") };
}
const shot = async (page, name, sel) => {
  if (!shots) return;
  if (sel) await (await page.$(sel)).screenshot({ path: shots + "/" + name + ".png" });
  else await page.screenshot({ path: shots + "/" + name + ".png" });
};

// Which names to use: a country with a tag and one without, on the map of 1900.
const tags = await (await fetch(base + "data/tags.json")).json();
const france = tags.find((t) => t[0] === "France");
let TAGGED = "", UNTAGGED = "", OTHERS = [];

// 1. Nothing is asked of the function until a card opens; comments.js is not loaded at page load.
{
  const s = standIn();
  const page = await open(s);
  await setDate(page, "1900-01-01");
  const names = await page.evaluate(() => window.__chronia.polities());
  TAGGED = names.find((n) => france[1].includes(n));
  const tagged = new Set(tags.flatMap((t) => t[1]));
  UNTAGGED = ["Switzerland", "Ethiopia", "Siam", "Persia", "Norway"].find((n) => names.includes(n) && !tagged.has(n)) || names.find((n) => !tagged.has(n));
  OTHERS = names.filter((n) => !tagged.has(n) && n !== UNTAGGED).slice(0, 2);
  await settle(page, 1000);
  say(s.calls.length === 0, "nothing is asked of chronia-comments before a card opens", JSON.stringify(s.calls));
  say(!page.asked.some((u) => /comments\.js/.test(u)), "comments.js is not loaded before a card opens", page.asked.filter((u) => /comments/.test(u)).join(" "));
  say(!!TAGGED && !!UNTAGGED, "a tagged (" + TAGGED + ") and an untagged (" + UNTAGGED + ") country are on the map of 1900", TAGGED + " / " + UNTAGGED);
  await page.close();
}

// 2. Signed out, a tagged country: the section after Sources, its heading, its request, its comments, and the composer.
{
  const s = standIn();
  s.add({ username: "Herodotus", avatar: PIC, polity: "Kingdom of France", at: "1789-07-14", text: "The Bastille fell today." });
  s.add({ username: "Thucydides", avatar: null, polity: TAGGED, at: "1900", text: "The Exposition opens in Paris." });
  s.add({ any: true, username: "Mallory", polity: "<i>Land</i> \"of\" 'quotes'", at: "1900", text: "<img src=x onerror=window.__pwned=1>" });
  s.add({ username: "Bob\"><b>x</b>", polity: TAGGED, at: "1900", text: "<b>bold</b> & \"quoted\"" });
  const page = await open(s);
  await setDate(page, "1900-01-01");
  await card(page, TAGGED);
  await settle(page, 1500);
  const l = lists(s);
  say(page.asked.some((u) => /comments\.js/.test(u)), "comments.js is loaded once a card opens", "");
  say(l.length === 1, "one list is asked for the card", l.length);
  const sent = l[0] || {};
  say(sent.sort === "new" || sent.sort === undefined, "it asks for the newest first", sent.sort);
  say(JSON.stringify((sent.names || []).slice().sort()) === JSON.stringify(france[1].slice(0, 60).sort()), "its names are every name of the France tag", JSON.stringify(sent.names));
  say(!sent.auth, "signed out, no token is sent", sent.auth);
  let v = await view(page);
  say(v.shown && v.rule, "the section and its rule show", JSON.stringify(v).slice(0, 200));
  say(v.afterSources, "the rule and the section follow Sources", "");
  say(v.head === "Comments on France", "the heading names the tag", v.head);
  say(v.sort.length === 3 && v.sort[0] === "Newest*" && v.sort[1] === "Top" && /^Nearest to /.test(v.sort[2]) && /^Newest \| Top \| Nearest to /.test(v.sortText) && !/·/.test(v.sortText), "the sort reads Newest | Top | Nearest to the date, Newest chosen", JSON.stringify(v.sort) + " " + v.sortText);
  say(v.items.length === 4, "four comments are listed", v.items.length);
  const it = v.items.find((i) => i.user === "Herodotus") || {};
  say(it.pic === PIC, "a comment with a picture shows it", it.pic);
  const th = v.items.find((i) => i.user === "Thucydides") || {};
  say(th.initial === "T" && !th.pic, "a comment without a picture shows the initial", JSON.stringify(th));
  say(/1789/.test(it.date) && /July/.test(it.date), "a comment's date is shown as the page writes dates", it.date);
  say(/Kingdom of France/.test(it.where), "a comment from another name of the tag says which", it.where);
  say(it.text === "The Bastille fell today.", "its text shows", it.text);
  say(/^4 comments$/.test(v.count), "the count says 4 comments", v.count);
  const evil = v.items.find((i) => i.user === "Mallory") || {};
  say(evil.text === "<img src=x onerror=window.__pwned=1>" && evil.imgs === 0, "a comment of HTML is shown as text", JSON.stringify(evil));
  say(evil.where.includes("<i>Land</i> \"of\" 'quotes'") && evil.bold === 0, "a country name of HTML and quotes is shown as text", evil.where);
  const bob = v.items.find((i) => i.user.startsWith("Bob")) || {};
  say(bob.user === "Bob\"><b>x</b>" && bob.bold === 0, "a username of HTML is shown as text", JSON.stringify(bob));
  say(await page.evaluate(() => window.__pwned === undefined), "window.__pwned stays undefined", "");
  say(v.items.every((i) => i.acts.length === 0 || i.acts.every((a) => a === "Report")), "signed out, no Delete is offered", JSON.stringify(v.items.map((i) => i.acts)));
  say(v.signin === "Sign in to comment" && !v.box, "signed out, the composer offers sign-in", v.signin);
  await shot(page, "card-signed-out-desktop", "#card");
  // Sorting by the date asks again, with the map's date.
  await page.click(".ch-cm-sort button:last-of-type");
  await settle(page, 600);
  const near = lists(s).slice(-1)[0] || {};
  const mapAt = await page.evaluate(() => window.__chronia.date() || String(Math.round(window.__chronia.year())));
  say(near.sort === "near" && near.at === mapAt, "Nearest asks again with sort near and the map's date", JSON.stringify(near) + " vs " + mapAt);
  v = await view(page);
  say(v.sort[2].endsWith("*") && !v.sort[0].endsWith("*"), "and is shown as chosen", JSON.stringify(v.sort));
  // Sign in to comment opens the Account panel.
  await page.click(".ch-cm-signin");
  await settle(page, 300);
  say(await page.evaluate(() => !document.getElementById("account").hidden), "Sign in to comment opens the Account panel", "");
  await page.keyboard.press("Escape");
  // A date pressed moves the map there, and the card comes back for that name.
  await page.click(".ch-cm-item:has(.ch-cm-user:text-is('Herodotus')) .ch-cm-date");
  await settle(page, 1500);
  await page.waitForFunction(() => window.__chronia.ready(), null, { timeout: 60000 });
  const moved = await page.evaluate(() => ({ t: window.__chronia.year(), want: window.__chronia.timeOf("1789-07-14"), card: window.__chronia.card() }));
  say(Math.abs(moved.t - moved.want) < 1e-6, "pressing a comment's date moves the map to it", JSON.stringify(moved).slice(0, 200));
  say(moved.card.open && moved.card.name === "Kingdom of France", "and opens the card of the name it was written under", moved.card.name);
  say(!page.errors.length, "no page errors", page.errors.join("; "));
  await page.close();
}

// 3. An untagged country, an empty thread, Show more, and a failing function.
{
  const s = standIn();
  const page = await open(s);
  await setDate(page, "1900-01-01");
  await card(page, UNTAGGED);
  await settle(page, 1500);
  let v = await view(page);
  const sent = lists(s)[0] || {};
  say(v.head === "Comments", "an untagged country's heading is Comments", v.head);
  say(JSON.stringify(sent.names) === JSON.stringify([UNTAGGED]), "and its request names it alone", JSON.stringify(sent.names));
  say(!!v.empty && v.items.length === 0, "an empty thread says so", v.empty);
  await shot(page, "card-empty", "#card");
  await page.evaluate(() => window.__chronia.selectName(""));
  for (let i = 0; i < 25; i++) s.add({ username: "Writer" + i, polity: TAGGED, at: "1900", text: "Comment " + i });
  await card(page, TAGGED);
  await settle(page, 1200);
  v = await view(page);
  say(v.items.length === 20 && v.more, "twenty show at first, with Show more", v.items.length + " " + v.more);
  say(v.count === "25 comments", "the count is the total", v.count);
  await page.click(".ch-cm-more");
  await settle(page, 800);
  const more = lists(s).slice(-1)[0] || {};
  v = await view(page);
  say(more.offset === 20, "Show more asks from the 21st", JSON.stringify(more));
  say(v.items.length === 25 && !v.more, "and all 25 then show, with no more to show", v.items.length);
  // A function that errors, or can't be reached, leaves no section (on cards not seen yet, as a thread is kept a minute).
  for (const [k, f] of [[0, 500], [1, "abort"]]) {
    await page.evaluate(() => document.getElementById("card-close").click());
    s.fail = f;
    await card(page, OTHERS[k]);
    await settle(page, 1200);
    v = await view(page);
    say(!v.shown && !v.rule, "with the function failing (" + f + "), the card shows no Comments section", JSON.stringify(v).slice(0, 120));
  }
  s.fail = null;
  say(!page.errors.length, "no page errors", page.errors.join("; "));
  await page.close();
}

// 4. Race safety: an answer for a card since changed is dropped, and a later sort supersedes an earlier one.
{
  const s = standIn();
  s.add({ username: "Slow", polity: TAGGED, at: "1900", text: "From the slow answer." });
  s.add({ username: "Quick", polity: UNTAGGED, at: "1900", text: "From the quick answer." });
  const page = await open(s);
  await setDate(page, "1900-01-01");
  await page.evaluate(() => window.__chronia.selectName(window.__chronia.polities()[0]));
  await settle(page, 1200);
  s.delay = (b) => (b.action === "list" && b.names.includes(TAGGED) ? 1500 : 0);
  await page.evaluate(() => document.getElementById("card-close").click());
  await card(page, TAGGED);
  await settle(page, 100);
  await card(page, UNTAGGED);
  await settle(page, 2200);
  let v = await view(page);
  say(v.items.length === 1 && v.items[0].user === "Quick", "an answer for a card since changed is dropped", JSON.stringify(v.items.map((i) => i.user)));
  await page.evaluate(() => document.getElementById("card-close").click());
  await settle(page, 100);
  s.delay = (b) => (b.action === "list" && b.names.includes(TAGGED) ? 1500 : 0);
  await card(page, TAGGED);
  await settle(page, 100);
  await page.evaluate(() => document.getElementById("card-close").click());
  await settle(page, 2000);
  v = await view(page);
  say(!v.shown, "an answer for a card since closed is dropped", JSON.stringify(v).slice(0, 120));
  // Sort: the newest-first answer is slow, the nearest one quick; the nearest one stands.
  s.delay = null;
  await card(page, TAGGED);
  await settle(page, 1000);
  s.answer = (b) => (b.action === "list" && b.sort === "near" ? [200, { comments: [{ id: 1, username: "Near", avatar: null, polity: TAGGED, at: "1900", text: "near" }], more: false, total: 1 }] : null);
  s.delay = (b) => (b.action === "list" && b.sort !== "near" ? 1500 : 0);
  await page.click(".ch-cm-sort button:last-of-type");
  await page.click(".ch-cm-sort button:nth-of-type(1)");
  await page.click(".ch-cm-sort button:last-of-type");
  await settle(page, 2200);
  v = await view(page);
  say(v.items.length === 1 && v.items[0].user === "Near", "a sort chosen later supersedes an earlier request", JSON.stringify(v.items.map((i) => i.user)));
  s.answer = null; s.delay = null;
  say(!page.errors.length, "no page errors", page.errors.join("; "));
  await page.close();
}

// 5. Signed in without a profile: the form, the name check, the age box, the picture, and Save.
{
  const s = standIn();
  s.nameWhy = { takenname: "taken", admin: "reserved", badword: "word" };
  const page = await open(s, { signedIn: true });
  await setDate(page, "1900-01-01");
  await card(page, TAGGED);
  await settle(page, 1500);
  const me = s.calls.find((c) => c.action === "me");
  say(!!me && /^Bearer h\./.test(me.auth), "signed in, me is asked with the token", JSON.stringify(me));
  say(!!(lists(s)[0] || {}).auth, "and the list is asked with it", "");
  let v = await view(page);
  say(v.form && !v.box, "signed in without a profile, the composer is the profile form", JSON.stringify(v).slice(0, 160));
  let f = await form(page, "#cm");
  say(f && f.save === "disabled", "Save starts disabled", JSON.stringify(f));
  say(f && /3 to 20 characters/.test(f.rule) && /letters, numbers, and underscores/.test(f.rule) && /starting with a letter/.test(f.rule), "the name's rule is stated", f && f.rule);
  say(f && f.age === "I am 13 or older, and old enough in my country to use this without a parent's consent (16 in some of Europe).", "the age box has its exact label", f && f.age);
  say(f && f.terms.some((h) => /terms/.test(h)) && f.terms.some((h) => /privacy/.test(h)), "a line links the terms and the privacy page", JSON.stringify(f && f.terms));
  say(f && f.labelled && f.live, "its fields are labelled and its messages are live", JSON.stringify(f));
  await shot(page, "profile-form-empty", "#card");
  // A name of the wrong shape is refused here, without asking the function.
  const before = s.calls.filter((c) => c.action === "name").length;
  await page.fill("#cm .ch-pf-name", "9lives");
  await settle(page, 900);
  f = await form(page, "#cm");
  say(s.calls.filter((c) => c.action === "name").length === before && /start with a letter|starting with a letter/.test(f.status), "a name of the wrong shape is refused without asking", f.status);
  for (const [n, why, re] of [["takenname", "taken", /taken/], ["admin", "reserved", /kept|reserved/], ["badword", "word", /isn.t allowed|not allowed/]]) {
    await page.fill("#cm .ch-pf-name", n);
    await settle(page, 1000);
    f = await form(page, "#cm");
    const asked = s.calls.filter((c) => c.action === "name").slice(-1)[0] || {};
    say(asked.username === n && re.test(f.status) && f.save === "disabled", "a name the function calls " + why + " says so, and Save stays disabled", f.status);
  }
  // Typing fast asks once, after the pause.
  const n0 = s.calls.filter((c) => c.action === "name").length;
  await page.fill("#cm .ch-pf-name", "");
  await page.type("#cm .ch-pf-name", "Herodotus", { delay: 40 });
  await settle(page, 1100);
  f = await form(page, "#cm");
  const asks = s.calls.filter((c) => c.action === "name").slice(n0);
  say(asks.length === 1 && asks[0].username === "Herodotus", "the name is checked once, after a pause in typing", JSON.stringify(asks));
  say(/free/i.test(f.status), "a free name says so", f.status);
  say(f.save === "disabled", "the age box unticked keeps Save disabled", f.save);
  await page.check("#cm .ch-pf-age");
  f = await form(page, "#cm");
  say(f.save === "enabled", "ticked, Save is enabled", f.save);
  // The picture: cropped, 256 by 256, WebP (or JPEG), under 200 KB, previewed, and removable.
  await page.setInputFiles("#cm .ch-pf-file", await pngOf(page, 900, 600));
  await settle(page, 1200);
  f = await form(page, "#cm");
  say(f.preview && f.remove, "a chosen picture is previewed, with Remove", JSON.stringify(f));
  await shot(page, "profile-form-filled", "#card");
  await page.click("#cm .ch-pf-save");
  await settle(page, 1200);
  const prof = s.calls.find((c) => c.action === "profile") || {};
  say(prof.username === "Herodotus" && prof.age === true, "Save sends the name and age: true", JSON.stringify(Object.assign({}, prof, { avatar: (prof.avatar || "").slice(0, 20) })));
  const bytes = Buffer.from(prof.avatar || "", "base64");
  const webp = bytes.slice(0, 4).toString() === "RIFF" && bytes.slice(8, 12).toString() === "WEBP", jpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  say((webp || jpeg) && !/^data:/.test(prof.avatar || ""), "the picture is sent as base64 of a WebP or JPEG, with no data: prefix", bytes.slice(0, 12).toString("hex"));
  say(bytes.length > 0 && bytes.length < 200 * 1024, "the picture is under 200 KB", bytes.length);
  const dims = await page.evaluate(async (b64) => { const bm = await createImageBitmap(new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))])); return [bm.width, bm.height]; }, prof.avatar || "");
  say(dims[0] === 256 && dims[1] === 256, "the picture is 256 by 256", JSON.stringify(dims));
  v = await view(page);
  say(!v.form && v.box, "saved, the composer takes the form's place", JSON.stringify(v).slice(0, 160));
  say(await page.evaluate((p) => { const i = document.querySelector("#account-btn img"); return !!i && !i.hidden && i.src === p; }, PIC), "the account button shows the picture", "");
  say(!page.errors.length, "no page errors", page.errors.join("; "));
  await page.close();
}

// 6. The profile form's refusals, each with a plain message (first save, then edits from the Account panel).
{
  const s = standIn();
  const page = await open(s, { signedIn: true });
  await setDate(page, "1900-01-01");
  await card(page, TAGGED);
  await settle(page, 1500);
  const msgs = {};
  for (const [code, extra] of [["taken", {}], ["reserved", {}], ["word", {}], ["shape", {}], ["soon", { days: 12 }], ["picture", {}], ["check", {}], ["limit", { cap: 5 }], ["age", {}]]) {
    const status = { taken: 409, soon: 409, check: 503, limit: 429 }[code] || 400;
    s.answer = (b) => (b.action === "profile" ? [status, Object.assign({ error: code }, extra)] : null);
    await page.fill("#cm .ch-pf-name", "Ok_name" + code.length);
    await settle(page, 900);
    if (!(await page.isChecked("#cm .ch-pf-age"))) await page.check("#cm .ch-pf-age");
    await page.click("#cm .ch-pf-save");
    await settle(page, 600);
    msgs[code] = (await form(page, "#cm")).msg;
  }
  s.answer = null;
  const texts = Object.values(msgs);
  say(texts.every((t) => t && t.length > 8) && new Set(texts).size === texts.length, "each refusal of the profile has its own plain message", JSON.stringify(msgs));
  say(/12 days/.test(msgs.soon), "soon says how many days", msgs.soon);
  await shot(page, "profile-form-error", "#card");
  // Saved, then edited from the Account panel.
  await page.fill("#cm .ch-pf-name", "Herodotus");
  await settle(page, 900);
  await page.click("#cm .ch-pf-save");
  await settle(page, 800);
  await page.click("#account-btn");
  await settle(page, 400);
  const acct = await page.evaluate(() => ({ user: (document.querySelector("#account-profile .ch-pf-user") || {}).textContent, edit: (document.querySelector("#account-profile .ch-pf-edit") || {}).textContent, initial: (document.querySelector("#account-profile .ch-cm-initial") || {}).textContent, shown: !document.getElementById("account-profile").hidden }));
  say(acct.shown && acct.user === "Herodotus" && acct.edit === "Edit profile" && acct.initial === "H", "the Account panel shows the initial, the username, and Edit profile", JSON.stringify(acct));
  await shot(page, "account-profile", "#account");
  await page.click("#account-profile .ch-pf-edit");
  await settle(page, 300);
  let f = await form(page, "#account");
  say(f && f.name === "Herodotus" && f.age === null && f.save === "disabled", "Edit profile opens the form filled in, without the age box, Save disabled until a change", JSON.stringify(f));
  await page.setInputFiles("#account .ch-pf-file", await pngOf(page, 300, 700));
  await settle(page, 1000);
  f = await form(page, "#account");
  say(f.save === "enabled", "a new picture enables Save", f.save);
  await shot(page, "account-profile-edit", "#account");
  await page.click("#account .ch-pf-save");
  await settle(page, 900);
  const last = s.calls.filter((c) => c.action === "profile").slice(-1)[0] || {};
  say(!!last.avatar && last.username === undefined && last.age === undefined, "an edit sends only what changed", JSON.stringify(Object.assign({}, last, { avatar: (last.avatar || "").slice(0, 10) })));
  say(!page.errors.length, "no page errors", page.errors.join("; "));
  await page.close();
}

// 7. Signed in with a profile: post (once, however pressed), Report, Delete, the errors, and the count left today.
{
  const s = standIn();
  s.me = { username: "Herodotus", avatar: null, blocked: false };
  s.add({ username: "Other", polity: TAGGED, at: "1900", text: "Someone else's." });
  s.add({ username: "Herodotus", polity: TAGGED, at: "1900", text: "My own.", mine: true });
  const page = await open(s, { signedIn: true });
  await setDate(page, "1900-01-01");
  await card(page, TAGGED);
  await settle(page, 1500);
  let v = await view(page);
  const other = v.items.find((i) => i.user === "Other") || {}, own = v.items.find((i) => i.text === "My own.") || {};
  say(JSON.stringify(other.acts).includes("Report") && !other.acts.includes("Delete"), "another's comment offers Report", JSON.stringify(other.acts));
  say(own.acts.includes("Delete") && !own.acts.includes("Report"), "one's own offers Delete", JSON.stringify(own.acts));
  const mapAt = await page.evaluate(() => window.__chronia.date() || String(Math.round(window.__chronia.year())));
  say(v.box && /^0 ?\/ ?500$/.test(v.left), "the composer has a text box and a count to 500", v.left);
  say(v.line.includes(TAGGED) && /1900/.test(v.line), "a line says which country and date the comment will carry", v.line);
  say(/Herodotus/.test(v.post), "the button posts as the username", v.post);
  say(!v.today, "the count left today is not shown while it is high", v.today);
  await shot(page, "composer-signed-in", "#card");
  await page.fill(".ch-cm-box", "Paris in 1900: the Exposition.");
  v = await view(page);
  say(/^30 ?\/ ?500$/.test(v.left), "the count follows the typing", v.left);
  s.delay = (b) => (b.action === "post" ? 600 : 0);
  await page.evaluate(() => { const b = document.querySelector(".ch-cm-post"); b.click(); b.click(); b.click(); });
  await settle(page, 1200);
  s.delay = null;
  const posts = s.calls.filter((c) => c.action === "post");
  say(posts.length === 1, "pressing Post three times sends once", posts.length);
  say(posts[0] && posts[0].name === TAGGED && posts[0].at === mapAt && posts[0].text === "Paris in 1900: the Exposition.", "the post carries the card's name, the map's date, and the text", JSON.stringify(posts[0]));
  v = await view(page);
  say(v.items[0] && v.items[0].text === "Paris in 1900: the Exposition.", "the new comment appears first", JSON.stringify(v.items[0]));
  say(await page.evaluate(() => { const n = document.querySelector(".ch-cm-said"); return !!n && n.getAttribute("aria-live") === "polite" && /posted/i.test(n.textContent); }), "and is announced", "");
  say(v.count === "3 comments", "the count goes up", v.count);
  await page.click(".ch-cm-item:has(.ch-cm-user:text-is('Other')) .ch-cm-acts button:text-is('Report')");
  await settle(page, 500);
  const fl = s.calls.find((c) => c.action === "flag");
  say(!!fl && typeof fl.id === "number", "Report calls flag with the comment's id", JSON.stringify(fl));
  v = await view(page);
  say(JSON.stringify(v.items.find((i) => i.user === "Other").acts).includes("Reported"), "and then says Reported", JSON.stringify(v.items.find((i) => i.user === "Other").acts));
  page.once("dialog", (d) => d.accept());
  await page.click(".ch-cm-item:has(.ch-cm-text:text-is('My own.')) .ch-cm-acts button:text-is('Delete')");
  await settle(page, 600);
  const del = s.calls.find((c) => c.action === "delete");
  v = await view(page);
  say(!!del && typeof del.id === "number" && !v.items.some((i) => i.text === "My own."), "Delete calls delete and takes the comment away", JSON.stringify(del));
  // The function's refusals, each a plain message.
  const msgs = {};
  for (const [code, status, extra] of [["limit", 429, { cap: 100 }], ["fast", 429, { wait: 7 }], ["word", 400, {}], ["link", 400, {}], ["long", 400, {}], ["blocked", 403, {}]]) {
    s.answer = (b) => (b.action === "post" ? [status, Object.assign({ error: code }, extra)] : null);
    await page.fill(".ch-cm-box", "Try " + code);
    await page.click(".ch-cm-post");
    await settle(page, 500);
    msgs[code] = (await view(page)).msg;
  }
  s.answer = null;
  const texts = Object.values(msgs);
  say(texts.every((t) => t && t.length > 8) && new Set(texts).size === texts.length, "each refusal of a post has its own plain message", JSON.stringify(msgs));
  say(/7 seconds/.test(msgs.fast), "fast says how long to wait", msgs.fast);
  say((await page.inputValue(".ch-cm-box")) === "Try blocked", "a refused comment is kept in the box", await page.inputValue(".ch-cm-box"));
  say(await page.evaluate(() => { const m = document.querySelector(".ch-cm-msg"); return m.getAttribute("aria-live") === "polite" || m.getAttribute("role") === "alert"; }), "the message is live for a screen reader", "");
  await shot(page, "composer-error", "#card");
  // Few left today: the count shows.
  s.answer = (b) => (b.action === "post" ? [200, { comment: { id: 9999, username: "Herodotus", avatar: null, polity: TAGGED, at: mapAt, text: "x", mine: true }, left: 3 }] : null);
  await page.fill(".ch-cm-box", "Another.");
  await page.click(".ch-cm-post");
  await settle(page, 2000);
  s.answer = null;
  v = await view(page);
  say(/3 comments left today/.test(v.today), "with few left today, the count shows", v.today);
  await shot(page, "composer-low", "#card");
  say(!page.errors.length, "no page errors", page.errors.join("; "));
  await page.close();
}

// 8. A reviewer sees Remove on every comment; the card is whole at phone width.
{
  const s = standIn();
  s.me = { username: "Noah", avatar: PIC, blocked: false };
  s.role = "reviewer";
  s.add({ username: "Other", avatar: PIC, polity: TAGGED, at: "1900", text: "Someone else's, a long line of text to see how a comment wraps on a narrow screen without overflowing its card at all." });
  s.add({ username: "Averyveryverylongname", polity: TAGGED, at: "1900-05-14", text: "https_word_without_spaces_that_is_very_long_and_could_overflow_the_card_if_not_broken_somewhere" });
  const page = await open(s, { signedIn: true });
  await setDate(page, "1900-01-01");
  await card(page, TAGGED);
  await settle(page, 1500);
  let v = await view(page);
  say(v.items.every((i) => i.acts.includes("Remove") || i.acts.includes("Delete")), "a reviewer may remove every comment", JSON.stringify(v.items.map((i) => i.acts)));
  await page.close();
  const phone = await open(s, { signedIn: true, width: 390, height: 844 });
  await setDate(phone, "1900-01-01");
  await card(phone, TAGGED);
  await settle(phone, 1500);
  await phone.evaluate(() => document.getElementById("cm").scrollIntoView());
  const over = await phone.evaluate(() => { const c = document.getElementById("card"); const r = c.getBoundingClientRect(); return { sw: c.scrollWidth, cw: c.clientWidth, right: r.right, vw: innerWidth, wide: [...c.querySelectorAll("#cm *")].filter((e) => e.getBoundingClientRect().right > r.right + 0.5).map((e) => e.className).slice(0, 5) }; });
  say(over.sw <= over.cw && over.right <= over.vw && !over.wide.length, "at 390 wide the card has no horizontal overflow", JSON.stringify(over));
  await shot(phone, "card-phone-390");
  say(!phone.errors.length, "no page errors", phone.errors.join("; "));
  await phone.close();
}

// 9. M1: the answer to a post made on one card never clears, overwrites, or puts an error under another card's box.
{
  const s = standIn();
  s.me = { username: "Herodotus", avatar: null, blocked: false };
  const page = await open(s, { signedIn: true });
  await setDate(page, "1900-01-01");
  for (const [label, answer] of [["posted", null], ["refused", [400, { error: "word" }]]]) {
    await card(page, TAGGED);
    await settle(page, 1200);
    s.delay = (b) => (b.action === "post" ? 1500 : 0);
    s.answer = answer ? (b) => (b.action === "post" ? answer : null) : null;
    await page.fill(".ch-cm-box", "Written on " + TAGGED);
    await page.click(".ch-cm-post");
    await settle(page, 100);
    await card(page, UNTAGGED);
    await settle(page, 300);
    await page.fill(".ch-cm-box", "Written on " + UNTAGGED);
    await settle(page, 2000);
    const v = await view(page);
    say((await page.inputValue(".ch-cm-box")) === "Written on " + UNTAGGED && !v.msg, "M1: a post " + label + " on one card leaves another card's box and message alone", JSON.stringify([await page.inputValue(".ch-cm-box"), v.msg]));
    s.delay = null; s.answer = null;
    await page.fill(".ch-cm-box", "");
    await page.evaluate(() => document.getElementById("card-close").click());
  }
  say(!page.errors.length, "no page errors", page.errors.join("; "));
  await page.close();
}

// 10. M2: a 401 drops the session, offers Sign in in the composer, and the draft outlives a reload (a sign-in redirect).
{
  const s = standIn();
  s.me = { username: "Herodotus", avatar: null, blocked: false };
  const page = await open(s, { signedIn: true });
  await setDate(page, "1900-01-01");
  await card(page, TAGGED);
  await settle(page, 1200);
  s.answer = (b) => (b.action === "post" ? [401, { error: "signin" }] : null);
  await page.fill(".ch-cm-box", "Kept through a sign-in.");
  await page.click(".ch-cm-post");
  await settle(page, 800);
  s.answer = null;
  const after = await page.evaluate(() => ({ auth: localStorage.getItem("chronia-auth"), accountIn: document.getElementById("account-in").hidden === false, signin: [...document.querySelectorAll("#cm .ch-cm-compose button")].map((b) => b.textContent), msg: (document.querySelector("#cm .ch-cm-compose .ch-cm-msg") || {}).textContent || "", kept: JSON.stringify(Object.assign({}, sessionStorage)) }));
  say(after.auth === null && !after.accountIn, "M2: a 401 drops the session, so the Account panel offers sign-in", JSON.stringify(after));
  say(after.signin.includes("Sign in") && /run out/.test(after.msg), "M2: the composer says the sign-in ran out and offers Sign in", JSON.stringify(after));
  say(after.kept.includes("Kept through a sign-in."), "M2: the draft is kept in sessionStorage", after.kept);
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => window.__chronia && window.__chronia.ready(), null, { timeout: 120000 });
  await setDate(page, "1900-01-01");
  await card(page, TAGGED);
  await settle(page, 1500);
  say((await page.inputValue(".ch-cm-box").catch(() => "")) === "Kept through a sign-in.", "M2: signed in again after a reload, the draft is back in the box", await page.inputValue(".ch-cm-box").catch(() => "(no box)"));
  await page.click(".ch-cm-post");
  await settle(page, 800);
  say(!(await page.evaluate(() => JSON.stringify(Object.assign({}, sessionStorage)))).includes("Kept through a sign-in."), "M2: posted, the kept draft is cleared", "");
  say(!page.errors.length, "no page errors", page.errors.join("; "));
  await page.close();
}

// 11. M3: a Report on a comment since gone says so, and the comment leaves the list.
{
  const s = standIn();
  s.me = { username: "Herodotus", avatar: null, blocked: false };
  s.add({ username: "Gone", polity: TAGGED, at: "1900", text: "Since removed." });
  s.add({ username: "Here", polity: TAGGED, at: "1900", text: "Still here." });
  const page = await open(s, { signedIn: true });
  await setDate(page, "1900-01-01");
  await card(page, TAGGED);
  await settle(page, 1200);
  s.answer = (b) => (b.action === "flag" ? [404, { error: "missing" }] : null);
  await page.click(".ch-cm-item:has(.ch-cm-user:text-is('Gone')) .ch-cm-acts button:text-is('Report')");
  await settle(page, 600);
  s.answer = null;
  const v = await view(page);
  const note = await page.evaluate(() => [...document.querySelectorAll("#cm .ch-cm-note, #cm .ch-cm-said")].map((n) => n.textContent).join(" | "));
  say(!v.items.some((i) => i.user === "Gone") && v.items.some((i) => i.user === "Here"), "M3: a Report answered 404 takes the comment out of the list", JSON.stringify(v.items.map((i) => i.user)));
  say(/no longer there/.test(note) && !/server/.test(note), "M3: and says it is no longer there, not a server error", note);
  say(!page.errors.length, "no page errors", page.errors.join("; "));
  await page.close();
}

// 12. M5: with the card open while the date moves (a war's months before 1648), the order, its label, and the line follow.
{
  const s = standIn();
  s.me = { username: "Herodotus", avatar: null, blocked: false };
  s.add({ any: true, username: "Froissart", polity: "Kingdom of France", at: "1400", text: "A chronicle." });
  const page = await open(s, { signedIn: true });
  await page.evaluate(() => window.__chronia.setLayer("control", true));
  await setDate(page, "1400");
  await settle(page, 1500);
  const name = await page.evaluate((fr) => window.__chronia.polities().find((n) => fr.includes(n)), france[1]);
  await card(page, name);
  await settle(page, 1200);
  await page.click(".ch-cm-sort button:last-of-type");
  await settle(page, 600);
  const at0 = await page.evaluate(() => (document.querySelector(".ch-cm-line") || {}).textContent);
  await page.click("#month-up");
  await settle(page, 900);
  const st = await page.evaluate(() => ({ open: window.__chronia.card().open, url: location.search, sort: [...document.querySelectorAll(".ch-cm-sort button")].pop().textContent, line: (document.querySelector(".ch-cm-line") || {}).textContent }));
  const m = /y=([^&]+)/.exec(st.url), at = m ? decodeURIComponent(m[1]) : "";
  const last = lists(s).slice(-1)[0] || {};
  say(st.open && /^1400-\d\d$/.test(at), "M5: a month stepped in a war's year keeps the card open (" + at + ")", JSON.stringify(st));
  say(st.line !== at0 && /1400/.test(st.line) && st.sort.replace("Nearest to ", "") === st.line.replace(/^.*dated /, "").replace(/\.$/, ""), "M5: the line and the Nearest label follow the date", JSON.stringify([at0, st]));
  say(last.sort === "near" && last.at === at, "M5: a nearest-first list is asked again for the new date", JSON.stringify(last) + " vs " + at);
  say(!page.errors.length, "no page errors", page.errors.join("; "));
  await page.close();
}

// 13. M7: comments and usernames follow their own direction; the count counts code points, with no cut at 500 units.
{
  const s = standIn();
  s.me = { username: "Herodotus", avatar: null, blocked: false };
  s.add({ username: "Ibn_Battuta", polity: TAGGED, at: "1900", text: "رحلة إلى باريس" });
  const page = await open(s, { signedIn: true });
  await setDate(page, "1900-01-01");
  await card(page, TAGGED);
  await settle(page, 1200);
  const dirs = await page.evaluate(() => { const li = document.querySelector(".ch-cm-item"); return [li.querySelector(".ch-cm-text").getAttribute("dir"), li.querySelector(".ch-cm-user").getAttribute("dir")]; });
  say(dirs[0] === "auto" && dirs[1] === "auto", "M7: a comment's text and username have dir=auto", JSON.stringify(dirs));
  const emoji = "\u{1F3DB}".repeat(300);
  await page.fill(".ch-cm-box", emoji);
  const c = await page.evaluate(() => ({ len: [...document.querySelector(".ch-cm-box").value].length, max: document.querySelector(".ch-cm-box").getAttribute("maxlength"), left: document.querySelector(".ch-cm-left").textContent }));
  say(c.len === 300 && !c.max && /^300 ?\/ ?500$/.test(c.left), "M7: 300 emoji count as 300, and the box does not cut them", JSON.stringify(c));
  await page.fill(".ch-cm-box", "x".repeat(501));
  const n0 = s.calls.filter((x) => x.action === "post").length;
  await page.click(".ch-cm-post");
  await settle(page, 400);
  const v = await view(page);
  say(s.calls.filter((x) => x.action === "post").length === n0 && /500 characters/.test(v.msg), "M7: 501 characters are refused here, with the limit said", v.msg);
  say(!page.errors.length, "no page errors", page.errors.join("; "));
  await page.close();
}

// 14. The contract's first save with a picture that fails: the profile is made, and the form says the picture was not.
{
  const s = standIn();
  s.pictureError = "check";
  const page = await open(s, { signedIn: true });
  await setDate(page, "1900-01-01");
  await card(page, TAGGED);
  await settle(page, 1200);
  await page.fill("#cm .ch-pf-name", "Herodotus");
  await settle(page, 900);
  await page.check("#cm .ch-pf-age");
  await page.setInputFiles("#cm .ch-pf-file", await pngOf(page, 400, 400));
  await settle(page, 1000);
  await page.click("#cm .ch-pf-save");
  await settle(page, 1000);
  const v = await view(page);
  const note = await page.evaluate(() => (document.querySelector("#cm .ch-cm-picnote") || {}).textContent || "");
  say(v.box && !v.form, "picture_error: the profile is made, and the composer is ready", JSON.stringify(v).slice(0, 160));
  say(/username is saved/.test(note) && /picture is not/.test(note) && /could not be checked/.test(note), "picture_error: it says the name is saved, the picture is not, and why", note);
  await shot(page, "picture-error", "#card");
  await page.click("#cm .ch-cm-picnote button");
  await settle(page, 500);
  const acct = await page.evaluate(() => ({ open: !document.getElementById("account").hidden, file: !!document.querySelector("#account .ch-pf-file"), user: (document.getElementById("account-username") || {}).textContent }));
  say(acct.open && acct.file, "picture_error: Try another picture opens the profile's picture in the Account panel", JSON.stringify(acct));
  s.pictureError = null;
  await page.setInputFiles("#account .ch-pf-file", await pngOf(page, 300, 300));
  await settle(page, 900);
  await page.click("#account .ch-pf-save");
  await settle(page, 900);
  const last = s.calls.filter((c) => c.action === "profile").slice(-1)[0] || {};
  say(!!last.avatar && last.age === undefined, "picture_error: another picture is then sent as an edit", JSON.stringify(Object.assign({}, last, { avatar: (last.avatar || "").slice(0, 8) })));
  say(!page.errors.length, "no page errors", page.errors.join("; "));
  await page.close();
}

// ---------------------------------------------------------------- replies, upvotes, and one's own comments

// The thread window as drawn: its box, each comment's id, depth of nesting, left edge, and text, and its parts.
const threadView = (page) => page.evaluate(() => {
  const box = document.getElementById("thread");
  if (!box || box.hidden) return { open: false };
  const r = box.getBoundingClientRect(), body = document.getElementById("thread-body");
  const items = [...box.querySelectorAll(".ch-th-item")].map((li) => {
    let depth = 0, p = li.parentElement;
    while (p && p !== box) { if (p.classList.contains("ch-th-kids")) depth++; p = p.parentElement; }
    const c = li.querySelector(":scope > .ch-th-c");
    return {
      id: +li.getAttribute("data-id"), depth, left: Math.round(c.getBoundingClientRect().left), mark: li.classList.contains("is-mark"),
      user: (c.querySelector(".ch-cm-user") || {}).textContent || "", text: (c.querySelector(".ch-cm-text") || {}).textContent || "",
      gone: (c.querySelector(".ch-cm-gone") || {}).textContent || "", where: (c.querySelector(".ch-cm-where") || {}).textContent || "",
      tree: [...c.querySelectorAll(".ch-cm-tree > *")].map((b) => b.textContent), acts: [...c.querySelectorAll(".ch-cm-acts > button")].map((b) => b.textContent),
      composer: !!li.querySelector(":scope > .ch-th-compose")
    };
  });
  return {
    open: true, left: r.left, right: r.right, width: r.width, top: r.top, bottom: r.bottom, vw: innerWidth, vh: innerHeight,
    name: document.getElementById("thread-name").textContent, items,
    overflow: body.scrollWidth > body.clientWidth + 1 || [...box.querySelectorAll("*")].some((e) => e.getBoundingClientRect().right > r.right + 0.5 && e.getClientRects().length),
    focus: document.activeElement && (document.activeElement.id || document.activeElement.className),
    msg: [...box.querySelectorAll(".ch-th-msg, .ch-th-compose .ch-cm-msg")].map((m) => m.textContent).join(" ")
  };
});
// A chain of replies down to depth 8 under a top comment, then one more to the comment at depth 8.
function chain(s, polity) {
  const names = ["Herodotus", "Thucydides", "Sappho", "Xenophon", "Plutarch", "Polybius", "Livy", "Tacitus", "Suetonius"];
  const top = s.add({ username: names[0], avatar: PIC, polity, at: "1900-04-14", text: "The Exposition opens; who will go?", votes: 4 });
  let prev = top;
  for (let i = 1; i <= 8; i++) prev = s.add({ username: names[i], avatar: i % 3 ? null : PIC, polity, at: "1900", parent: prev.id, votes: 9 - i, text: i === 4 ? "A longer reply at the fourth level, to see how a line of text wraps when it has been stepped in four times already." : "Reply at level " + i + "." });
  const floor = s.add({ username: "Ammianus", polity, at: "1900", parent: prev.id, text: "Past the eighth level, beside it." });
  return { top, deepest: prev, floor };
}

// 15. Upvotes and Top on the card, signed in with a profile; signed out, an upvote asks for sign-in.
{
  const s = standIn();
  s.me = { username: "Strabo", avatar: null, blocked: false };
  const a = s.add({ username: "Herodotus", polity: TAGGED, at: "1900", text: "Few votes.", votes: 1 });
  const b = s.add({ username: "Thucydides", polity: TAGGED, at: "1900", text: "Many votes.", votes: 7 });
  s.add({ username: "Strabo", polity: TAGGED, at: "1900", text: "My own.", votes: 2, mine: true });
  s.add({ username: "Sappho", polity: TAGGED, at: "1900", text: "A reply.", parent: a.id });
  s.add({ username: "Livy", polity: TAGGED, at: "1900", text: "Another reply.", parent: a.id });
  const gone = s.add({ username: "Gone", polity: TAGGED, at: "1900", text: "Deleted since." });
  s.add({ username: "Polybius", polity: TAGGED, at: "1900", text: "A reply kept.", parent: gone.id });
  gone.deleted = true;
  s.add({ username: "Lonely", polity: TAGGED, at: "1900", text: "Deleted, with nothing under it.", deleted: true });
  const page = await open(s, { signedIn: true });
  await setDate(page, "1900-01-01");
  await card(page, TAGGED);
  await settle(page, 1500);
  let v = await view(page);
  const few = v.items.find((i) => i.text === "Few votes.") || {}, own = v.items.find((i) => i.text === "My own.") || {};
  say(v.items.length === 4, "the card lists top comments only", JSON.stringify(v.items.map((i) => i.text)));
  const ph = await page.evaluate((id) => { const li = document.querySelector('.ch-cm-item[data-id="' + id + '"]'); return li && { gone: (li.querySelector(".ch-cm-gone") || {}).textContent, user: !!li.querySelector(".ch-cm-user"), tree: [...li.querySelectorAll(".ch-cm-tree > *")].map((b) => b.textContent), acts: li.querySelectorAll(".ch-cm-acts > button").length }; }, gone.id);
  say(ph && ph.gone === "Deleted comment" && !ph.user && JSON.stringify(ph.tree) === '["1 reply"]' && !ph.acts, "a deleted comment with a reply is listed as Deleted comment, with only its count of replies", JSON.stringify(ph));
  say(few.tree && few.tree[0] === "△ 1" && few.tree[1] === "Reply" && few.tree[2] === "2 replies", "a comment's line reads its upvotes | Reply | its replies", JSON.stringify(few.tree));
  say(await page.evaluate(() => /^△ \d+ \| Reply \| 2 replies \| Report$/.test(document.querySelector(".ch-cm-item:last-child .ch-cm-acts").textContent)), "with | between, and Report after", await page.evaluate(() => document.querySelector(".ch-cm-item:last-child .ch-cm-acts").textContent));
  say(own.tree && own.tree[0] === "△ 2" && !(await page.$(".ch-cm-item:has(.ch-cm-text:text-is('My own.')) .ch-cm-vote")), "one's own comment shows its count, with no button", JSON.stringify(own.tree));
  await page.click(".ch-cm-item:has(.ch-cm-text:text-is('Few votes.')) .ch-cm-vote");
  await settle(page, 500);
  let vt = s.calls.filter((c) => c.action === "vote").slice(-1)[0] || {};
  let btn = await page.evaluate(() => { const b = document.querySelector(".ch-cm-item:last-child .ch-cm-vote"); return [b.textContent, b.getAttribute("aria-pressed"), b.getAttribute("aria-label")]; });
  say(vt.id === a.id && vt.on === true, "pressing the upvote sends vote with on: true", JSON.stringify(vt));
  say(btn[0] === "▲ 2" && btn[1] === "true" && /2/.test(btn[2]), "and fills it, with the new count", JSON.stringify(btn));
  await page.click(".ch-cm-item:has(.ch-cm-text:text-is('Few votes.')) .ch-cm-vote");
  await settle(page, 500);
  vt = s.calls.filter((c) => c.action === "vote").slice(-1)[0] || {};
  btn = await page.evaluate(() => { const b = document.querySelector(".ch-cm-item:last-child .ch-cm-vote"); return [b.textContent, b.getAttribute("aria-pressed")]; });
  say(vt.on === false && btn[0] === "△ 1" && btn[1] === "false", "pressed again, the vote is taken back", JSON.stringify([vt, btn]));
  s.answer = (q) => (q.action === "vote" ? [429, { error: "limit", cap: 500 }] : null);
  await page.click(".ch-cm-item:has(.ch-cm-text:text-is('Few votes.')) .ch-cm-vote");
  await settle(page, 500);
  s.answer = null;
  say(/most upvotes for one day/.test(await page.evaluate(() => document.querySelector(".ch-cm-said").textContent)), "past the day's cap, it says so", await page.evaluate(() => document.querySelector(".ch-cm-said").textContent));
  await page.click(".ch-cm-sort button:text-is('Top')");
  await settle(page, 600);
  const top = lists(s).slice(-1)[0] || {};
  v = await view(page);
  say(top.sort === "top" && v.items[0].text === "Many votes." && v.sort[1] === "Top*", "Top asks for sort top and lists by upvotes", JSON.stringify([top.sort, v.items.map((i) => i.text), v.sort]));
  await shot(page, "card-upvotes-top", "#card");
  if (shots) await page.screenshot({ path: shots + "/card-upvotes-top-desktop.png" });
  say(!page.errors.length, "no page errors", page.errors.join("; "));
  await page.close();
  // Signed out, an upvote opens the Account panel to sign in, and sends nothing.
  const out = await open(s);
  await setDate(out, "1900-01-01");
  await card(out, TAGGED);
  await settle(out, 1500);
  const n0 = s.calls.filter((c) => c.action === "vote").length;
  await out.click(".ch-cm-item:has(.ch-cm-text:text-is('Many votes.')) .ch-cm-vote");
  await settle(out, 400);
  say(await out.evaluate(() => !document.getElementById("account").hidden) && s.calls.filter((c) => c.action === "vote").length === n0, "signed out, an upvote opens the Account panel and sends nothing", "");
  await out.close();
  // Without a username, an upvote asks for one in the Account panel.
  const s2 = standIn();
  s2.add({ username: "Herodotus", polity: TAGGED, at: "1900", text: "Vote for me." });
  const noName = await open(s2, { signedIn: true });
  await setDate(noName, "1900-01-01");
  await card(noName, TAGGED);
  await settle(noName, 1500);
  await noName.click(".ch-cm-vote");
  await settle(noName, 500);
  say(await noName.evaluate(() => !document.getElementById("account").hidden && !!document.querySelector("#account .ch-pf-name")) && !s2.calls.some((c) => c.action === "vote"), "without a username, an upvote opens the username form", "");
  await noName.close();
}

// 16. The thread window: nested to depth 8 and beside it, Reply's composer, a reply posted, Esc, and a soft delete.
{
  const s = standIn();
  s.me = { username: "Strabo", avatar: PIC, blocked: false };
  const { top, deepest, floor } = chain(s, TAGGED);
  const mineReply = s.add({ username: "Strabo", avatar: PIC, polity: TAGGED, at: "1900", parent: top.id, text: "My own reply, with one under it.", mine: true });
  s.add({ username: "Pausanias", polity: TAGGED, at: "1900", parent: mineReply.id, text: "An answer to Strabo." });
  const page = await open(s, { signedIn: true, width: 1280, height: 800 });
  await setDate(page, "1900-01-01");
  await card(page, TAGGED);
  await settle(page, 1500);
  let v = await view(page);
  say(v.items.length === 1 && v.items[0].tree.includes("11 replies"), "the card shows the top comment with 11 replies", JSON.stringify(v.items.map((i) => i.tree)));
  await page.click(".ch-cm-replies");
  await settle(page, 900);
  let t = await threadView(page);
  const asked = s.calls.filter((c) => c.action === "thread").slice(-1)[0] || {};
  say(asked.id === top.id, "the count of replies asks for the thread", JSON.stringify(asked));
  say(t.open && Math.abs(t.width - 760) < 1 && t.right <= t.vw - 9, "the window is 760 wide on a desktop, at the right", JSON.stringify([t.width, t.right, t.vw]));
  say(t.name === "France", "its heading names the card's tag", t.name);
  say(t.items.length === 12 && t.items[0].id === top.id && t.items[0].depth === 0, "it holds the top comment and every reply", t.items.length);
  const deep = t.items.find((i) => i.id === deepest.id) || {}, fl = t.items.find((i) => i.id === floor.id) || {}, root = t.items[0];
  say(deep.depth === 8 && deep.left - root.left === 8 * 18, "a reply at depth 8 is nested eight levels in, 18 pixels each", JSON.stringify([deep.depth, deep.left - root.left]));
  say(fl.depth === 8 && fl.left === deep.left && /Replying to @Suetonius/.test(fl.where), "a reply to it sits beside it, Replying to @its writer", JSON.stringify(fl));
  say(t.items.every((i, k) => k === 0 || t.items[k - 1].id < i.id || i.depth <= t.items[k - 1].depth), "replies under each parent are oldest first", JSON.stringify(t.items.map((i) => [i.id, i.depth])));
  say(!t.overflow, "nothing in it is wider than the window", "");
  say(t.focus === "thread-close", "it takes focus, on its close button", t.focus);
  if (shots) await page.screenshot({ path: shots + "/thread-desktop-1280.png" });
  // Reply opens a composer right under that comment, and posts with the parent and its name.
  await page.click('.ch-th-item[data-id="' + deepest.id + '"] > .ch-th-c .ch-cm-reply');
  await settle(page, 300);
  t = await threadView(page);
  say((t.items.find((i) => i.id === deepest.id) || {}).composer && t.items.filter((i) => i.composer).length === 1, "Reply opens one composer, under that comment", JSON.stringify(t.items.filter((i) => i.composer).map((i) => i.id)));
  say(await page.evaluate(() => document.activeElement && document.activeElement.tagName === "TEXTAREA"), "with the box focused", "");
  const line = await page.evaluate(() => document.querySelector(".ch-th-compose .ch-cm-line").textContent);
  say(/Replying to @Suetonius/.test(line) && /1900/.test(line), "its line says whom and what date the reply carries", line);
  if (shots) await page.screenshot({ path: shots + "/thread-desktop-composer.png" });
  await page.fill(".ch-th-compose .ch-cm-box", "A reply from the deepest level.");
  await page.click(".ch-th-compose .ch-cm-post");
  await settle(page, 700);
  const post = s.calls.filter((c) => c.action === "post").slice(-1)[0] || {};
  t = await threadView(page);
  const mark = t.items.find((i) => i.mark) || {};
  say(post.parent === deepest.id && post.name === TAGGED && post.text === "A reply from the deepest level.", "the reply is posted with its parent and the thread's name", JSON.stringify(post));
  say(mark.text === "A reply from the deepest level." && mark.depth === 8 && !t.items.some((i) => i.composer), "it appears beside, at depth 8, marked, and the composer closes", JSON.stringify(mark));
  v = await view(page);
  say(v.items[0].tree.includes("12 replies"), "the card's count of replies goes up", JSON.stringify(v.items[0].tree));
  // Deleting one's own reply that has a reply under it leaves "Deleted comment" in its place.
  page.once("dialog", (d) => d.accept());
  await page.click('.ch-th-item[data-id="' + mineReply.id + '"] > .ch-th-c .ch-cm-acts > button:text-is("Delete")');
  await settle(page, 600);
  t = await threadView(page);
  const del = t.items.find((i) => i.id === mineReply.id) || {};
  say(del.gone === "Deleted comment" && !del.user && !del.text && t.items.some((i) => i.text === "An answer to Strabo."), "a deleted reply with a reply under it shows as Deleted comment, the reply kept", JSON.stringify(del));
  // Esc closes the window, and the card stays open, with focus back where it was.
  await page.keyboard.press("Escape");
  await settle(page, 300);
  t = await threadView(page);
  const after = await page.evaluate(() => ({ card: window.__chronia.card().open, focus: document.activeElement && document.activeElement.className }));
  say(!t.open && after.card, "Esc closes the window and leaves the card open", JSON.stringify(after));
  say(/ch-cm-replies/.test(after.focus), "and focus returns to what opened it", after.focus);
  // The close button too; Reply on the card opens the window with the composer under the top comment.
  await page.click(".ch-cm-item .ch-cm-reply");
  await settle(page, 800);
  t = await threadView(page);
  say(t.open && t.items[0].composer, "Reply on the card opens the window with a composer under the comment", JSON.stringify(t.items.filter((i) => i.composer).map((i) => i.id)));
  await page.click("#thread-close");
  await settle(page, 200);
  say(!(await threadView(page)).open, "the close button closes it", "");
  say(!page.errors.length, "no page errors", page.errors.join("; "));
  await page.close();
  // A phone: the window is the screen's width, 12 pixels a level, and nothing overflows.
  const phone = await open(s, { signedIn: true, width: 390, height: 844 });
  await setDate(phone, "1900-01-01");
  await card(phone, TAGGED);
  await settle(phone, 1500);
  await phone.evaluate(() => document.querySelector(".ch-cm-replies").click());
  await settle(phone, 900);
  t = await threadView(phone);
  const pd = t.items.find((i) => i.id === deepest.id) || {};
  say(t.open && t.left === 0 && Math.abs(t.right - 390) < 1, "on a phone the window is as wide as the screen", JSON.stringify([t.left, t.right]));
  say(pd.left - t.items[0].left === 8 * 12, "and steps in 12 pixels a level", pd.left - t.items[0].left);
  say(!t.overflow, "with nothing wider than the screen", "");
  say(t.top > 40 && t.bottom <= t.vh, "between the top row and the foot of the screen", JSON.stringify([t.top, t.bottom, t.vh]));
  if (shots) await phone.screenshot({ path: shots + "/thread-phone-390.png" });
  await phone.evaluate(() => { const b = document.getElementById("thread-body"); b.scrollTop = b.scrollHeight; });
  await settle(phone, 200);
  await phone.evaluate((id) => document.querySelector('.ch-th-item[data-id="' + id + '"] .ch-cm-reply').click(), deepest.id);
  await settle(phone, 400);
  t = await threadView(phone);
  say(!t.overflow, "on a phone, the composer at depth 8 fits too", "");
  if (shots) await phone.screenshot({ path: shots + "/thread-phone-390-composer.png" });
  say(!phone.errors.length, "no page errors", phone.errors.join("; "));
  await phone.close();
}

// 17. The function as it was before replies: no upvotes, Reply, Top, or thread window, and no errors.
{
  const s = standIn();
  s.tree = false;
  s.me = { username: "Strabo", avatar: null, blocked: false };
  s.add({ username: "Herodotus", polity: TAGGED, at: "1900", text: "From the old function." });
  const page = await open(s, { signedIn: true });
  await setDate(page, "1900-01-01");
  await card(page, TAGGED);
  await settle(page, 1500);
  const v = await view(page);
  say(v.items.length === 1 && v.items[0].tree.length === 0 && JSON.stringify(v.items[0].acts) === '["Report"]', "without votes in the list, no upvotes or Reply are offered", JSON.stringify(v.items));
  say(v.sort.length === 2 && !v.sort.includes("Top"), "and no Top", JSON.stringify(v.sort));
  await page.click("#account-btn");
  await settle(page, 800);
  const acct = await page.evaluate(() => { const m = document.querySelector("#account .ch-mine"); return { mine: !!m && !m.hidden && !m.closest("[hidden]"), user: document.getElementById("account-username").textContent }; });
  say(!acct.mine && acct.user === "Strabo", "the Account panel drops Your comments when mine is unknown to the function", JSON.stringify(acct));
  say(!page.errors.length, "no page errors", page.errors.join("; "));
  await page.close();
  // A list with votes from a function that then refuses thread: the window closes, and Reply goes.
  const s2 = standIn();
  s2.add({ username: "Sappho", polity: TAGGED, at: "1900", text: "Fresh." });
  s2.answer = (q) => (q.action === "thread" ? [400, { error: "action" }] : null);
  const p2 = await open(s2);
  await setDate(p2, "1900-01-01");
  await card(p2, TAGGED);
  await settle(p2, 1500);
  await p2.click(".ch-cm-reply");
  await settle(p2, 600);
  const w = await view(p2);
  say(!(await threadView(p2)).open && w.items[0].tree.length === 0, "a 400 action to thread closes the window and takes Reply and upvotes away", JSON.stringify(w.items[0]));
  say(!p2.errors.length, "no page errors", p2.errors.join("; "));
  await p2.close();
}

// 18. Your comments in the Account panel: newest first, the country, date, whom a reply answers, the text cut to
// three lines, the upvotes, hidden ones said; pressing a reply moves the map, opens the card and the thread, marked.
{
  const s = standIn();
  s.me = { username: "Strabo", avatar: PIC, blocked: false };
  const top = s.add({ username: "Herodotus", polity: "Kingdom of France", at: "1789-07-14", text: "The Bastille fell this morning." });
  s.add({ username: "Strabo", polity: TAGGED, at: "1900", text: "A comment of mine, and a long one: " + "the Exposition draws the world to Paris, and every pavilion has a story to tell. ".repeat(4), votes: 3, mine: true });
  s.add({ username: "Strabo", polity: TAGGED, at: "1900-05-01", text: "One hidden by reports.", mine: true, state: "hidden" });
  const myReply = s.add({ username: "Strabo", polity: "Kingdom of France", at: "1789-07-15", parent: top.id, text: "And the next day, the keys went to Washington.", votes: 5, mine: true });
  for (let i = 0; i < 21; i++) s.add({ username: "Strabo", polity: TAGGED, at: "1901", text: "Older " + i, mine: true, id: 100 + i });
  const page = await open(s, { signedIn: true });
  await setDate(page, "1900-01-01");
  await page.click("#account-btn");
  await settle(page, 1500);
  const rows = () => page.evaluate(() => [...document.querySelectorAll("#account .ch-mine-item")].map((li) => ({
    id: +li.getAttribute("data-id"), where: li.querySelector(".ch-mine-where").textContent, to: (li.querySelector(".ch-mine-to") || {}).textContent || "",
    text: li.querySelector(".ch-mine-text").textContent, foot: li.querySelector(".ch-mine-foot").textContent, hidden: (li.querySelector(".ch-mine-hidden") || {}).textContent || "",
    lines: Math.round(li.querySelector(".ch-mine-text").getBoundingClientRect().height / parseFloat(getComputedStyle(li.querySelector(".ch-mine-text")).lineHeight)),
    acts: [...li.querySelectorAll(".ch-mine-acts button")].map((b) => b.textContent)
  })));
  let r = await rows();
  const head = await page.evaluate(() => (document.querySelector("#account .ch-mine-head") || {}).textContent);
  say(head === "Your comments" && s.calls.some((c) => c.action === "mine"), "the Account panel asks for and heads Your comments", head);
  say(r.length === 20 && r[0].id === myReply.id, "twenty, newest first", JSON.stringify(r.map((x) => x.id)));
  say(/Kingdom of France \| July 15, 1789/.test(r[0].where) && r[0].to === "Reply to @Herodotus" && r[0].foot === "△ 5", "a reply shows its country | date, Reply to @name, and its upvotes", JSON.stringify(r[0]));
  const long = r.find((x) => /long one/.test(x.text)) || {};
  say(long.lines === 3, "a long comment is cut to three lines", long.lines);
  say((r.find((x) => x.text === "One hidden by reports.") || {}).hidden === "Hidden from others", "a hidden one says Hidden from others", JSON.stringify(r.find((x) => x.text === "One hidden by reports.")));
  say(r.every((x) => JSON.stringify(x.acts) === '["Delete"]'), "each has Delete", JSON.stringify(r.map((x) => x.acts)));
  if (shots) await (await page.$("#account")).screenshot({ path: shots + "/account-your-comments.png" });
  await page.click("#account .ch-mine-more");
  await settle(page, 600);
  r = await rows();
  say(r.length === 24 && (s.calls.filter((c) => c.action === "mine").slice(-1)[0] || {}).offset === 20, "More asks from the 21st", r.length);
  page.once("dialog", (d) => d.accept());
  await page.click('#account .ch-mine-item[data-id="' + r[23].id + '"] .ch-mine-acts button');
  await settle(page, 500);
  r = await rows();
  say(r.length === 23 && s.calls.some((c) => c.action === "delete"), "Delete takes it away", r.length);
  await page.click('#account .ch-mine-item[data-id="' + myReply.id + '"] .ch-mine-open');
  await settle(page, 1800);
  await page.waitForFunction(() => window.__chronia.ready(), null, { timeout: 60000 });
  await settle(page, 800);
  const st = await page.evaluate(() => ({ acct: !document.getElementById("account").hidden, t: window.__chronia.year(), want: window.__chronia.timeOf("1789-07-15"), card: window.__chronia.card() }));
  const t = await threadView(page);
  const m = t.items && t.items.find((i) => i.mark);
  say(!st.acct, "pressing one closes the Account panel", "");
  say(Math.abs(st.t - st.want) < 1e-6 && st.card.open && st.card.name === "Kingdom of France", "moves the map to its date and opens its country's card", JSON.stringify(st).slice(0, 200));
  say(t.open && m && m.id === myReply.id, "and for a reply opens the thread window with it marked", JSON.stringify(t.items && t.items.map((i) => [i.id, i.mark])));
  say(m && await page.evaluate((id) => { const li = document.querySelector('.ch-th-item[data-id="' + id + '"]'), b = document.getElementById("thread-body").getBoundingClientRect(), r = li.getBoundingClientRect(); return document.activeElement === li && r.top >= b.top && r.bottom <= b.bottom; }, myReply.id), "scrolled into view and focused", "");
  if (shots) await page.screenshot({ path: shots + "/account-opened-reply.png" });
  say(!page.errors.length, "no page errors", page.errors.join("; "));
  await page.close();
  // On a phone, the panel's list fits.
  const phone = await open(s, { signedIn: true, width: 390, height: 844 });
  await setDate(phone, "1900-01-01");
  await phone.evaluate(() => document.getElementById("account-btn").click());
  await settle(phone, 1500);
  const fit = await phone.evaluate(() => { const a = document.getElementById("account").getBoundingClientRect(); return { right: a.right, left: a.left, vw: innerWidth, wide: [...document.querySelectorAll("#account .ch-mine *")].filter((e) => e.getBoundingClientRect().right > a.right + 0.5).length }; });
  say(fit.left >= 0 && fit.right <= fit.vw && !fit.wide, "on a phone, Your comments fits the panel", JSON.stringify(fit));
  if (shots) await (await phone.$("#account")).screenshot({ path: shots + "/account-your-comments-phone.png" });
  say(!phone.errors.length, "no page errors", phone.errors.join("; "));
  await phone.close();
}

// Screenshots of the card with comments at desktop width, signed in.
if (shots) {
  const s = standIn();
  s.me = { username: "Herodotus", avatar: PIC, blocked: false };
  s.add({ username: "Thucydides", avatar: null, polity: "Kingdom of France", at: "1789-07-14", text: "The Bastille fell this morning; the card's dates make the thread read like a chronicle." });
  s.add({ username: "Herodotus", avatar: PIC, polity: TAGGED, at: "1900", text: "The Exposition Universelle opens in April.", mine: true });
  s.add({ username: "Sappho", avatar: PIC, polity: TAGGED, at: "1900-04-14", text: "The Paris Métro's first line opens this summer." });
  const page = await open(s, { signedIn: true });
  await setDate(page, "1900-01-01");
  await card(page, TAGGED);
  await settle(page, 1500);
  await page.evaluate(() => document.getElementById("cm").scrollIntoView());
  await shot(page, "card-comments-desktop");
  await shot(page, "card-comments-desktop-card", "#card");
  await page.close();
}

await browser.close();
console.log(bad ? bad + " of " + (good + bad) + " checks failed" : "all " + good + " checks passed");
process.exit(bad ? 1 : 0);

// Checks CHRONIA's page of the account's own comments (comments/) and the atlas's start-up link that opens one of them
// (?y=…&card=…, with &comment=…&root=… for a reply), headlessly, with chronia-comments and chronia-report played by a
// small stand-in kept here in memory (the live functions are never called).
// Serve the repository root first (python3 -m http.server 8101), then:
// node tools/chronia-comments-mine-check.mjs [base URL of the atlas] [directory for screenshots]
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)("playwright");

const base = process.argv[2] || "http://localhost:8101/chronia/";
const shots = process.argv[3] || "";
if (shots) mkdirSync(shots, { recursive: true });
const pageUrl = new URL("comments/", base).href;
const browser = await chromium.launch();
let bad = 0, good = 0;
const say = (ok, what, got) => { if (ok) good++; else bad++; console.log((ok ? "ok   " : "FAIL ") + what + (ok ? "" : ": " + got)); };
const jwt = (claims) => "h." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".s";
const claims = (exp) => ({ sub: "11111111-2222-3333-4444-555555555555", email: "reader@example.com", exp, user_metadata: { full_name: "Ada Reader" } });
const TOKEN = jwt(claims(Math.floor(Date.now() / 1000) + 36000));
const FRESH = jwt(Object.assign(claims(Math.floor(Date.now() / 1000) + 36000), { fresh: 1 }));

// The stand-in: chronia-comments (mine, delete, thread, me, list) and chronia-report (refresh). `s.fail` is a status for
// every comments call (or "abort"); `s.refresh` the status refresh answers with.
function standIn() {
  const s = { calls: [], refreshes: [], comments: [], me: { username: "Strabo", avatar: null, blocked: false }, fail: null, refresh: 200, nextId: 5000 };
  s.add = (c) => {
    const x = Object.assign({ id: s.nextId++, username: "Strabo", avatar: null, polity: "France", at: "1900", text: "A comment.", mine: true, parent: null, votes: 0, state: "live" }, c);
    const p = x.parent !== null ? s.comments.find((y) => y.id === x.parent) : null;
    x.root = p ? p.root || p.id : null;
    x.depth = p ? p.depth + 1 : 0;
    s.comments.push(x);
    return x;
  };
  const out = (c, auth) => ({ id: c.id, username: c.username, avatar: c.avatar, polity: c.polity, at: c.at, text: c.text, mine: !!auth && !!c.mine, parent: c.parent, root: c.root, depth: c.depth, votes: c.votes, voted: false, replying_to: null });
  const json = (route, status, body) => route.fulfill({ status, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const cors = (route) => route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Allow-Methods": "POST" } });
  s.report = async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return cors(route);
    const body = JSON.parse(req.postData() || "{}");
    s.refreshes.push(body);
    if (body.action !== "refresh") return json(route, 400, { error: "action" });
    if (s.refresh !== 200) return json(route, s.refresh, { error: "refresh" });
    return json(route, 200, { access_token: FRESH, refresh_token: "refresh-2" });
  };
  s.handle = async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return cors(route);
    const body = JSON.parse(req.postData() || "{}"), auth = req.headers().authorization || "";
    s.calls.push(Object.assign({ auth }, body));
    if (s.fail === "abort") return route.abort();
    if (s.fail) return json(route, s.fail, { error: "store" });
    const a = body.action;
    if (a === "list") {
      const l = s.comments.filter((c) => (body.names || []).includes(c.polity) && c.parent === null).sort((x, y) => y.id - x.id);
      return json(route, 200, { comments: l.slice(0, 20).map((c) => Object.assign(out(c, auth), { replies: s.comments.filter((r) => r.root === c.id).length })), more: l.length > 20, total: l.length });
    }
    if (a === "thread") {
      const c = s.comments.find((x) => x.id === body.id);
      if (!c) return json(route, 404, { error: "gone" });
      const root = c.root || c.id;
      return json(route, 200, { comments: s.comments.filter((x) => x.id === root || x.root === root).sort((x, y) => x.id - y.id).map((x) => out(x, auth)), more: false, root });
    }
    if (!auth) return json(route, 401, { error: "signin" });
    if (a === "me") return json(route, 200, { profile: s.me, left: 100, cap: 100, role: null });
    if (a === "mine") {
      if (!s.me) return json(route, 403, { error: "profile" });
      const l = s.comments.filter((c) => c.mine).sort((x, y) => y.id - x.id), off = body.offset || 0;
      return json(route, 200, { comments: l.slice(off, off + 20).map((c) => Object.assign(out(c, auth), { state: c.state, replying_to: c.replying_to !== undefined ? c.replying_to : c.parent !== null ? (s.comments.find((p) => p.id === c.parent) || {}).username || null : null })), more: l.length > off + 20 });
    }
    if (a === "delete") {
      s.comments = s.comments.filter((x) => x.id !== body.id);
      return json(route, 200, { ok: true, soft: false });
    }
    return json(route, 400, { error: "action" });
  };
  return s;
}

// A page with every outside host answering nothing, the functions played by `s`, and `session` (or none) kept under
// chronia-auth as the atlas keeps it.
async function open(s, url, { width = 1200, height = 860, session = { a: TOKEN, r: "refresh", e: Date.now() + 36e5 } } = {}) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.errors = [];
  page.csp = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  page.on("console", (m) => { if (/Content.Security.Policy|Refused to/i.test(m.text())) page.csp.push(m.text()); });
  await page.addInitScript(([sess]) => {
    if (sessionStorage.getItem("check-seeded")) return;
    sessionStorage.setItem("check-seeded", "1");
    try {
      localStorage.setItem("chronia-tour", "1"); localStorage.setItem("chronia-key", "0"); localStorage.setItem("chronia-signin-later", String(Date.now()));
      if (sess) localStorage.setItem("chronia-auth", JSON.stringify(sess)); else localStorage.removeItem("chronia-auth");
    } catch (e) {}
  }, [session]);
  await page.route(/wikipedia\.org|wikidata\.org|accounts\.google|googlesyndication|doubleclick|adtrafficquality|supabase\.co\/rest/, (r) => r.fulfill({ status: 404, body: "" }));
  await page.route(/functions\/v1\/chronia-report/, (r) => s.report(r));
  await page.route(/functions\/v1\/(?!chronia-comments|chronia-report)/, (r) => r.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" } }));
  await page.route(/functions\/v1\/chronia-comments/, (r) => s.handle(r));
  await page.goto(url, { waitUntil: "load" });
  return page;
}
const settle = (page, ms = 500) => page.waitForTimeout(ms);
const atlasReady = (page) => page.waitForFunction(() => window.__chronia && window.__chronia.ready(), null, { timeout: 120000 });
const mines = (s) => s.calls.filter((c) => c.action === "mine");
const view = (page) => page.evaluate(() => {
  const vis = (e) => !!e && !e.hidden && !e.closest("[hidden]") && e.getClientRects().length > 0;
  const q = (sel) => document.querySelector(sel);
  return {
    h1: (q("h1") || {}).textContent || "",
    title: document.title,
    status: vis(q("#mc-status")) ? q("#mc-status").textContent : "",
    statusLinks: vis(q("#mc-status")) ? [...q("#mc-status").querySelectorAll("a")].map((a) => a.href) : [],
    count: vis(q("#mc-count")) ? q("#mc-count").textContent : "",
    more: vis(q("#mc-more")) ? q("#mc-more").textContent : "",
    retry: vis(q("#mc-retry")) ? q("#mc-retry").textContent : "",
    note: (q("#mc-note") || {}).textContent || "",
    said: (q("#mc-said") || {}).textContent || "",
    saidLive: q("#mc-said") ? q("#mc-said").getAttribute("aria-live") : null,
    list: !!q("ol#mc-list"),
    rows: [...document.querySelectorAll("#mc-list > li")].map((li) => {
      const t = li.querySelector(".mc-text");
      return {
        id: +li.getAttribute("data-id"),
        where: (li.querySelector(".mc-where") || {}).textContent || "",
        to: (li.querySelector(".mc-to") || {}).textContent || "",
        text: t ? t.textContent : "",
        dir: t ? t.getAttribute("dir") : null,
        clipped: t ? t.scrollHeight > t.clientHeight + 1 || getComputedStyle(t).webkitLineClamp !== "none" && getComputedStyle(t).webkitLineClamp !== "" : null,
        pre: t ? getComputedStyle(t).whiteSpace : "",
        height: t ? t.getBoundingClientRect().height : 0,
        lh: t ? parseFloat(getComputedStyle(t).lineHeight) : 0,
        votes: (li.querySelector(".mc-votes") || {}).textContent || "",
        hidden: (li.querySelector(".mc-hidden") || {}).textContent || "",
        open: li.querySelector("a.mc-open") ? { text: li.querySelector("a.mc-open").textContent, href: li.querySelector("a.mc-open").href } : null,
        buttons: [...li.querySelectorAll("button")].filter(vis).map((b) => b.textContent),
        ask: vis(li.querySelector(".mc-ask")) ? li.querySelector(".mc-ask").textContent : "",
        imgs: li.querySelectorAll("img").length
      };
    })
  };
});
const shot = async (page, name, full = true) => { if (shots) await page.screenshot({ path: shots + "/" + name + ".png", fullPage: full }); };
const noErrors = (page, what) => say(!page.errors.length && !page.csp.length, what + ": no page errors or refusals by the page's policy", page.errors.concat(page.csp).map((m) => m.slice(0, 160)).join("; "));

// 1. Signed out: one line to sign in on the atlas, with a link to it, and nothing asked of the function.
{
  const s = standIn();
  s.add({ text: "Not to be seen." });
  const page = await open(s, pageUrl, { session: null });
  await settle(page, 800);
  const v = await view(page);
  say(v.h1 === "Your comments" && v.title === "Your comments | CHRONIA", "the page is headed Your comments, titled Your comments | CHRONIA", v.h1 + " / " + v.title);
  say(v.status === "Sign in on the atlas to see your comments." && v.statusLinks.includes(base), "signed out, it says to sign in on the atlas, with a link to it", JSON.stringify(v));
  say(!v.rows.length && !v.more && !s.calls.length, "and shows no comments and asks the function nothing", JSON.stringify(s.calls));
  const head = await page.evaluate(() => ({
    robots: (document.querySelector('meta[name="robots"]') || {}).content,
    csp: (document.querySelector('meta[http-equiv="Content-Security-Policy"]') || {}).content || "",
    first: document.head.querySelector("script").getAttribute("src"),
    back: (document.querySelector(".cp-top a.cp-mark") || {}).getAttribute ? document.querySelector(".cp-top a.cp-mark").getAttribute("href") : null,
    foot: [...document.querySelectorAll(".cp-foot a")].map((a) => a.textContent).join(" | "),
    footText: (document.querySelector(".cp-foot") || {}).textContent || "",
    scripts: [...document.scripts].map((x) => x.getAttribute("src"))
  }));
  say(head.robots === "noindex", "it carries robots noindex", head.robots);
  say(head.first === "../go.js" && /connect-src 'self' https:\/\/jvcmeuqlyygpwelmvxuv\.supabase\.co;/.test(head.csp) && /img-src 'self' data:;/.test(head.csp) && /script-src 'self';/.test(head.csp), "go.js comes first, and the policy allows the page, the function's host to connect, and data: pictures for page.css's paper and bezel", JSON.stringify(head));
  say(head.back === "../" && head.foot === "The atlas | Team | FAQ | Premium | Privacy | Terms" && !/[·•]/.test(head.footText), "the nameplate and the footer are those of the other pages", JSON.stringify(head));
  say(head.scripts.includes("/visit.js") && head.scripts.some((x) => /^\/(chronia\/)?va\.js$/.test(x)) && head.scripts.includes("mine.js"), "it loads visit.js, va.js, and its own script", JSON.stringify(head.scripts));
  await shot(page, "mine-signed-out");
  noErrors(page, "signed out");
  await page.close();
  const phone = await open(s, pageUrl, { session: null, width: 390, height: 844 });
  await settle(phone, 800);
  await shot(phone, "mine-signed-out-390");
  await phone.close();
}

// 2. A session near its end is refreshed through chronia-report and kept again; one that can't be is signed out.
{
  const s = standIn();
  s.add({ text: "After a refresh." });
  const page = await open(s, pageUrl, { session: { a: TOKEN, r: "refresh", e: Date.now() + 1000 } });
  await settle(page, 1000);
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("chronia-auth") || "null"));
  say(s.refreshes.length === 1 && s.refreshes[0].refresh_token === "refresh", "a session near its end is refreshed through chronia-report", JSON.stringify(s.refreshes));
  say(kept && kept.a === FRESH && kept.r === "refresh-2" && kept.e > Date.now(), "and the new session is kept for the atlas", JSON.stringify(kept));
  say(mines(s).length === 1 && mines(s)[0].auth === "Bearer " + FRESH && (await view(page)).rows.length === 1, "then mine is asked with the new token", JSON.stringify(mines(s)));
  await page.close();
  const s2 = standIn();
  s2.refresh = 401;
  const p2 = await open(s2, pageUrl, { session: { a: TOKEN, r: "refresh", e: Date.now() - 1000 } });
  await settle(p2, 1000);
  const v = await view(p2);
  say(v.status === "Sign in on the atlas to see your comments." && !mines(s2).length, "a session that can't be refreshed shows the line to sign in", JSON.stringify(v));
  say((await p2.evaluate(() => localStorage.getItem("chronia-auth"))) === null, "and is dropped, as the atlas drops it", "");
  noErrors(p2, "refresh refused");
  await p2.close();
}

// 3. Signed in with no profile, or with no comments: You haven't commented yet, with a link back to the atlas.
for (const [what, me] of [["no profile", null], ["no comments", { username: "Strabo", avatar: null, blocked: false }]]) {
  const s = standIn();
  s.me = me;
  const page = await open(s, pageUrl);
  await settle(page, 800);
  const v = await view(page);
  say(v.status.startsWith("You haven't commented yet.") && v.statusLinks.includes(base) && !v.rows.length && !v.more && !v.count, "signed in with " + what + ": You haven't commented yet, with a link to the atlas", JSON.stringify(v));
  if (me) { await shot(page, "mine-empty"); }
  noErrors(page, what);
  await page.close();
  if (me) {
    const phone = await open(s, pageUrl, { width: 390, height: 844 });
    await settle(phone, 800);
    await shot(phone, "mine-empty-390");
    await phone.close();
  }
}

// 4. Forty-five comments: twenty, then More to forty, then forty-five and no More, newest first, with how many are shown.
{
  const s = standIn();
  for (let i = 0; i < 45; i++) s.add({ polity: "France", at: "1900", text: "Comment " + i });
  const page = await open(s, pageUrl);
  await settle(page, 800);
  let v = await view(page);
  const ids = s.comments.map((c) => c.id).sort((a, b) => b - a);
  say(v.list && v.rows.length === 20 && JSON.stringify(v.rows.map((r) => r.id)) === JSON.stringify(ids.slice(0, 20)), "twenty, newest first, in a list", JSON.stringify(v.rows.map((r) => r.id)));
  say(v.more === "More" && v.count === "Showing the newest 20 comments", "with More and how many are shown", v.more + " / " + v.count);
  await page.click("#mc-more");
  await settle(page, 600);
  v = await view(page);
  say(v.rows.length === 40 && mines(s).slice(-1)[0].offset === 20 && v.more === "More" && v.count === "Showing the newest 40 comments", "More asks from the 21st, and shows forty", v.rows.length + " / " + JSON.stringify(mines(s).slice(-1)[0]) + " / " + v.count);
  const focused = await page.evaluate(() => { const li = document.activeElement && document.activeElement.closest("li"); return li ? +li.getAttribute("data-id") : null; });
  say(focused === ids[20], "and takes the keyboard to the first of the new ones", focused);
  await page.click("#mc-more");
  await settle(page, 600);
  v = await view(page);
  say(v.rows.length === 45 && !v.more && v.count === "Showing 45 comments", "then forty-five, and no More", v.rows.length + " / " + v.more + " / " + v.count);
  say(new Set(v.rows.map((r) => r.id)).size === 45, "with none twice", "");
  noErrors(page, "forty-five");
  await page.close();
}

// 5. Each row: the country and the map date as the atlas writes them, whom a reply answers, the whole text, the upvotes,
// Hidden from others, Open on the map, and Delete; text from users only as text.
const LONG = ("The Exposition draws the world to Paris, and every pavilion has a story to tell. ".repeat(7)).slice(0, 500);
const XSS = "<img src=x onerror=window.__pwned=1>";
let detail = null;
{
  const s = standIn();
  const top = s.add({ username: "Herodotus", polity: "Kingdom of France", at: "1789-07-14", text: "The Bastille fell this morning.", mine: false });
  const one = s.add({ polity: "Roman Republic", at: "-44-03", text: "The Ides.", votes: 1 });
  const bc = s.add({ polity: "Roman Republic", at: "-44", text: "A year BC." });
  const ad = s.add({ polity: "Frankish Empire", at: "800", text: "A year AD." });
  const month = s.add({ polity: "Germany", at: "1941-06", text: "A month." });
  const long = s.add({ polity: "France", at: "1900", text: LONG, votes: 3 });
  const lines = s.add({ polity: "France", at: "1900", text: "First line\nSecond line\n\nFourth line" });
  const xss = s.add({ polity: "France <b>bold</b>", at: "1900", text: XSS });
  const hidden = s.add({ polity: "France", at: "1900-05-01", text: "One hidden by reports.", state: "hidden" });
  const anon = s.add({ polity: "Kingdom of France", at: "1789-07-15", parent: top.id, text: "A reply to one not shown.", replying_to: null });
  const reply = s.add({ polity: "Kingdom of France", at: "1789-07-15", parent: top.id, text: "And the next day, the keys went to Washington.", votes: 5 });
  detail = { s, top, reply, one };
  const page = await open(s, pageUrl);
  await settle(page, 800);
  const v = await view(page);
  const row = (c) => v.rows.find((r) => r.id === c.id) || {};
  say(row(reply).where === "Kingdom of France | July 15, 1789" && row(reply).to === "Reply to @Herodotus" && row(reply).votes === "5 upvotes", "a reply shows its country | date, Reply to @name, and its upvotes", JSON.stringify(row(reply)));
  say(row(anon).to === "A reply", "a reply to one not shown says A reply", JSON.stringify(row(anon)));
  say(row(one).where === "Roman Republic | March 44 BC" && row(one).votes === "1 upvote", "a month BC, and 1 upvote", JSON.stringify(row(one)));
  say(row(bc).where === "Roman Republic | 44 BC" && row(ad).where === "Frankish Empire | AD 800" && row(month).where === "Germany | June 1941" && row(long).where === "France | 1900", "years BC and AD, a month, and a year as the atlas writes them", [row(bc).where, row(ad).where, row(month).where, row(long).where].join(" / "));
  say(!row(long).to && !row(one).to, "a top comment has no reply line", "");
  say(row(long).text === LONG && LONG.length === 500 && !row(long).clipped, "a comment of 500 characters is shown whole", JSON.stringify({ len: row(long).text.length, clipped: row(long).clipped }));
  say(row(lines).text === "First line\nSecond line\n\nFourth line" && /pre-wrap|pre-line/.test(row(lines).pre) && row(lines).height >= 3.5 * row(lines).lh, "line breaks are kept", JSON.stringify(row(lines)));
  say(v.rows.every((r) => r.dir === "auto"), "every text is dir=auto", "");
  say(row(xss).text === XSS && row(xss).where.startsWith("France <b>bold</b> | ") && !row(xss).imgs && (await page.evaluate(() => window.__pwned)) === undefined && !(await page.$("#mc-list b")), "markup in a text or a country's name is shown as text, and runs nothing", JSON.stringify(row(xss)));
  say(row(hidden).hidden === "Hidden from others" && !row(long).hidden, "a hidden one says Hidden from others, a live one doesn't", JSON.stringify([row(hidden).hidden, row(long).hidden]));
  say(v.rows.every((r) => r.open && r.open.text === "Open on the map" && JSON.stringify(r.buttons) === '["Delete"]'), "each has Open on the map and a Delete button", JSON.stringify(v.rows.map((r) => [r.open, r.buttons])));
  const href = (c) => new URL(row(c).open.href);
  const hr = href(reply), hl = href(long);
  say(hr.origin + hr.pathname === base && hr.searchParams.get("y") === "1789-07-15" && hr.searchParams.get("card") === "Kingdom of France" && hr.searchParams.get("comment") === String(reply.id) && hr.searchParams.get("root") === String(top.id), "a reply's Open on the map carries its date, country, id, and thread", hr.href);
  say(hl.searchParams.get("y") === "1900" && hl.searchParams.get("card") === "France" && !hl.searchParams.has("comment") && !hl.searchParams.has("root"), "a top comment's carries its date and country", hl.href);
  say((await page.evaluate(() => [...document.querySelectorAll("#mc-list .mc-acts")].map((p) => p.textContent).join("\n"))).split("\n").every((t) => !/[·•]/.test(t) && / \| /.test(t)), "the parts of a row's last line are set off by |", "");
  // By keyboard: Tab reaches the links and buttons, with a visible ring.
  await page.keyboard.press("Tab");
  let ring = null;
  for (let i = 0; i < 30 && !ring; i++) {
    ring = await page.evaluate(() => { const a = document.activeElement; if (!a || !a.classList.contains("mc-open")) return null; const st = getComputedStyle(a); return { style: st.outlineStyle, width: st.outlineWidth }; });
    if (!ring) await page.keyboard.press("Tab");
  }
  say(ring && ring.style !== "none" && parseFloat(ring.width) >= 1, "Tab reaches Open on the map, with a visible ring", JSON.stringify(ring));
  await page.keyboard.press("Tab");
  say(await page.evaluate(() => document.activeElement.tagName === "BUTTON" && document.activeElement.textContent === "Delete"), "and Delete next", "");
  await shot(page, "mine-desktop");
  noErrors(page, "rows");
  await page.close();
  // At 390 wide nothing goes past the screen's edge.
  const phone = await open(s, pageUrl, { width: 390, height: 844 });
  await settle(phone, 800);
  const fit = await phone.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: innerWidth, wide: [...document.querySelectorAll("main *")].filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5).map((e) => e.className || e.tagName).slice(0, 5) }));
  say(fit.sw <= fit.vw && !fit.wide.length, "at 390 wide there is no sideways scroll", JSON.stringify(fit));
  await shot(phone, "mine-390");
  noErrors(phone, "phone");
  await phone.close();
}

// 6. Delete: Cancel sends nothing; Delete sends delete, takes the row out, and says so.
{
  const s = standIn();
  const a = s.add({ text: "Keep me." }), b = s.add({ text: "Delete me." }), c = s.add({ text: "Newest." });
  const page = await open(s, pageUrl);
  await settle(page, 800);
  await page.click('#mc-list > li[data-id="' + b.id + '"] button:text-is("Delete")');
  await settle(page, 200);
  let v = await view(page), r = v.rows.find((x) => x.id === b.id);
  say(r.ask === "Delete this comment? This can't be undone." && JSON.stringify(r.buttons) === '["Delete","Cancel"]', "Delete asks first, in the page, with Delete and Cancel", JSON.stringify(r));
  const asked = await page.evaluate(() => document.activeElement && document.activeElement.textContent);
  say(asked === "Cancel", "and takes the keyboard to Cancel", asked);
  await page.click('#mc-list > li[data-id="' + b.id + '"] button:text-is("Cancel")');
  await settle(page, 300);
  v = await view(page);
  r = v.rows.find((x) => x.id === b.id);
  say(r && !r.ask && JSON.stringify(r.buttons) === '["Delete"]' && !s.calls.some((x) => x.action === "delete"), "Cancel sends nothing and puts Delete back", JSON.stringify(r));
  say(await page.evaluate(() => document.activeElement && document.activeElement.textContent === "Delete"), "with the keyboard on it", "");
  await page.click('#mc-list > li[data-id="' + b.id + '"] button:text-is("Delete")');
  await page.click('#mc-list > li[data-id="' + b.id + '"] .mc-confirm');
  await settle(page, 600);
  v = await view(page);
  const del = s.calls.filter((x) => x.action === "delete");
  say(del.length === 1 && del[0].id === b.id && /^Bearer /.test(del[0].auth), "Delete sends delete with the comment's id, signed", JSON.stringify(del));
  say(!v.rows.some((x) => x.id === b.id) && v.rows.length === 2, "and takes the row out", JSON.stringify(v.rows.map((x) => x.id)));
  say(v.said === "Your comment is deleted." && v.saidLive === "polite", "saying Your comment is deleted. in a polite live region", v.said + " / " + v.saidLive);
  say(v.count === "Showing 2 comments", "and the count follows", v.count);
  const fo = await page.evaluate(() => { const li = document.activeElement && document.activeElement.closest("li"); return li ? +li.getAttribute("data-id") : document.activeElement.tagName; });
  say(fo === a.id, "the keyboard goes to the next row", fo);
  noErrors(page, "delete");
  await page.close();
}

// 7. The function failing: a plain message and Try again, which works once the function answers; never a blank page.
for (const [what, fail, want] of [["answering 500", 500, "Something went wrong on the server (500). Try again in a minute."], ["unreachable", "abort", "The comments could not be reached. Check the connection and try again."]]) {
  const s = standIn();
  s.add({ text: "Back again." });
  s.fail = fail;
  const page = await open(s, pageUrl);
  await settle(page, 800);
  let v = await view(page);
  say(v.status === want && v.retry === "Try again" && !v.rows.length, what + ": a plain message and Try again", JSON.stringify(v));
  s.fail = null;
  await page.click("#mc-retry");
  await settle(page, 600);
  v = await view(page);
  say(v.rows.length === 1 && !v.retry && !v.status, "and Try again shows the comments", JSON.stringify(v));
  noErrors(page, what);
  await page.close();
}

// 8. In another language the page's fixed text and its strings are the atlas's translations, and dates are written as the
// atlas writes them there.
{
  const s = standIn();
  s.add({ polity: "Kingdom of France", at: "1789-07-15", text: "Hola." });
  const page = await open(s, pageUrl + "?lang=es");
  await settle(page, 800);
  const v = await view(page);
  const es = await page.evaluate(() => [window.CH_LANG, (window.CH_L || {})["@mdy"], (window.CH_L || {})["@months"]]);
  const want = es[1] ? es[1].replace("{month}", (es[2] || [])[6]).replace("{d}", "15").replace("{y}", "1789") : "";
  say(es[0] === "es" && v.h1 === "Sus comentarios" && v.rows[0] && v.rows[0].where === "Kingdom of France | " + want && JSON.stringify(v.rows[0].buttons) === '["Eliminar"]', "in Spanish: the heading, Delete, and the date are the atlas's", JSON.stringify([v.h1, v.rows[0], want]));
  noErrors(page, "Spanish");
  await page.close();
}

// 9. Open on the map: the atlas opens at the comment's date with its country's card and, for a reply, its thread with it
// marked; the extra parts of the address are gone afterwards.
const threadView = (page) => page.evaluate(() => {
  const box = document.getElementById("thread");
  if (!box || box.hidden) return { open: false, msg: "" };
  return { open: true, marked: [...box.querySelectorAll(".ch-th-item.is-mark")].map((li) => +li.getAttribute("data-id")), msg: (box.querySelector(".ch-th-msg") || {}).textContent || "" };
});
const atlasState = (page, at) => page.evaluate((at) => ({ t: window.__chronia.year(), want: window.__chronia.timeOf(at), card: window.__chronia.card(), search: location.search, hash: location.hash }), at);
const extra = (st) => /[?&#](card|comment|root)=/.test(st.search + st.hash);
{
  const { s, top, reply } = detail;
  const page = await open(s, pageUrl);
  await settle(page, 800);
  await page.click('#mc-list > li[data-id="' + reply.id + '"] a.mc-open');
  await atlasReady(page);
  await settle(page, 2500);
  const st = await atlasState(page, "1789-07-15");
  const t = await threadView(page);
  say(Math.abs(st.t - st.want) < 1e-6 && st.card.open && st.card.name === "Kingdom of France", "Open on the map leads to the atlas at its date with its country's card open", JSON.stringify(st).slice(0, 240));
  say(t.open && JSON.stringify(t.marked) === JSON.stringify([reply.id]), "and, for a reply, its thread open with it marked", JSON.stringify(t));
  say(!extra(st), "and the card, comment, and root parts are gone from the address", st.search + st.hash);
  await page.reload({ waitUntil: "load" });
  await atlasReady(page);
  await settle(page, 1500);
  const again = await atlasState(page, "1789-07-15");
  say(!again.card.open && !(await threadView(page)).open, "so a reload opens neither again", JSON.stringify(again).slice(0, 200));
  noErrors(page, "open a reply");
  await page.close();
  // A top comment: the card at its date, no thread.
  const p2 = await open(s, base + "?y=1789-07-14&card=" + encodeURIComponent("Kingdom of France"));
  await atlasReady(p2);
  await settle(p2, 2000);
  const s2 = await atlasState(p2, "1789-07-14");
  say(Math.abs(s2.t - s2.want) < 1e-6 && s2.card.open && s2.card.name === "Kingdom of France" && !(await threadView(p2)).open && !extra(s2), "a link with a card alone opens that card at its date, and no thread", JSON.stringify(s2).slice(0, 240));
  await shot(p2, "mine-opened-card", false);
  noErrors(p2, "open a card");
  await p2.close();
}

// 10. A link for a name the map lacks at that date, or for a comment since deleted, fails quietly: the map opens at the date.
{
  const s = standIn();
  const page = await open(s, base + "?y=1900&card=" + encodeURIComponent("Kingdom of Atlantis"));
  await atlasReady(page);
  await settle(page, 1500);
  let st = await atlasState(page, "1900");
  say(Math.abs(st.t - st.want) < 1e-6 && !st.card.open && !extra(st), "a name the map lacks: the map opens at the date, with no card, and the parts go", JSON.stringify(st).slice(0, 240));
  noErrors(page, "a name the map lacks");
  await page.close();
  const p1 = await open(s, base + "?y=1900&card=" + encodeURIComponent("Kingdom of France"));
  await atlasReady(p1);
  await settle(p1, 1500);
  st = await atlasState(p1, "1900");
  say(Math.abs(st.t - st.want) < 1e-6 && !st.card.open, "a name on the atlas but not on the map at that date opens no card", JSON.stringify(st).slice(0, 240));
  noErrors(p1, "a name not on that date's map");
  await p1.close();
  const p2 = await open(s, base + "?y=1789-07-15&card=" + encodeURIComponent("Kingdom of France") + "&comment=99999&root=99998");
  await atlasReady(p2);
  await settle(p2, 2500);
  st = await atlasState(p2, "1789-07-15");
  const t = await threadView(p2);
  say(st.card.open && st.card.name === "Kingdom of France" && !t.open && !extra(st), "a comment since deleted: the card opens, and no thread window or message", JSON.stringify([st.card, t]));
  say(s.calls.some((c) => c.action === "thread" && c.id === 99998), "(its thread was asked for)", JSON.stringify(s.calls.map((c) => c.action)));
  noErrors(p2, "a comment since deleted");
  await p2.close();
}

await browser.close();
console.log(bad ? bad + " of " + (good + bad) + " checks failed" : "all " + good + " checks passed");
process.exit(bad ? 1 : 0);

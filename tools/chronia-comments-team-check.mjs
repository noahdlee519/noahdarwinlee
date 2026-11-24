// Checks the team's dashboard (chronia/reports/) for comments and profile pictures: the list from the chronia-comments
// function's `queue`, its counts and state filter, a reviewer's Restore, Remove, Block, Unblock, picture Keep and Remove,
// Move, and Erase (with its confirmation), a viewer's want of buttons, an error shown on the row, a comment of HTML shown as
// text, a picture from the bucket allowed by the page's Content-Security-Policy, and the reports list beside it. The
// functions are played by an in-memory stand-in, by route; nothing reaches Supabase.
// node tools/chronia-comments-team-check.mjs [base URL]   (the repository served at the base, e.g. python3 -m http.server 8101)
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/claude/repo/tools/")("playwright");
const base = process.argv[2] || "http://localhost:8101/chronia/reports/";
const HOST = "https://jvcmeuqlyygpwelmvxuv.supabase.co";
const PIC = HOST + "/storage/v1/object/public/chronia-avatars/";
const browser = await chromium.launch();
let bad = 0, n = 0;
const say = (ok, what, got) => { n++; if (!ok) bad++; console.log((ok ? "ok   " : "FAIL ") + what + (ok ? "" : ": got " + got)); };
// A 1 by 1 PNG, served for every picture in the bucket.
const DOT = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };

function store() {
  const c = (id, user, username, avatar, polity, at, text, flags, state) => ({ id, user, username, avatar, polity, at, text, flags, state, mine: false });
  return {
    comments: [
      c(11, "u1", "Herodotus", PIC + "x.webp", "Kingdom of France", "1789-07-14", "Long live the king", 2, "live"),
      c(10, "u2", "Thucydides", null, "Old Name Land", "1500", "<img src=x onerror=window.__pwned=1>", 3, "hidden"),
      c(9, "u3", "Xenophon", null, "Kingdom of France", "1800", "A removed remark", 1, "removed"),
      c(8, "u1", "Herodotus", PIC + "x.webp", "Roman Empire", "100", "Hidden by reports", 3, "hidden"),
    ],
    pictures: [
      { username: "Herodotus", avatar: PIC + "x.webp", user: "u1", flags: 2, state: "ok" },
      { username: "Polybius", avatar: PIC + "y.webp", user: "u4", flags: 3, state: "hidden" },
    ],
    blocked: [{ username: "Polybius", user: "u4" }],
    names: ["Kingdom of France", "Old Name Land", "Roman Empire", "Lost Duchy"],
  };
}

// One page signed in as `role` ("viewer", "reviewer", or "off" for an account not on the team).
async function open(role, opts = {}) {
  const db = store(), sent = [], fail = new Set(opts.fail || []);
  const page = await browser.newPage({ viewport: opts.viewport || { width: 1200, height: 900 } });
  page.setDefaultTimeout(5000);
  const csp = [];
  page.on("console", (m) => { const t = m.text(); if (/Content Security Policy/i.test(t) && /img-src|connect-src|supabase/i.test(t)) csp.push(t); });
  page.on("pageerror", (e) => csp.push("page error: " + e.message));
  await page.addInitScript(() => {
    const p = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).replace(/=+$/, "");
    localStorage.setItem("chronia-auth", JSON.stringify({ a: "x." + p + ".y", r: "refresh", e: Date.now() + 3600000 }));
  });
  await page.route("https://pagead2.googlesyndication.com/**", (r) => r.abort());
  await page.route(PIC + "**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: DOT }));
  await page.route(HOST + "/functions/v1/chronia-report", async (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: CORS });
    const b = r.request().postDataJSON();
    const json = (status, body) => r.fulfill({ status, headers: CORS, contentType: "application/json", body: JSON.stringify(body) });
    if (role === "off") return json(403, { error: "team" });
    if (b.action === "check") return json(200, { role });
    if (b.action === "list") return json(200, { role, reports: [{ id: 7, date_from: "1750", date_to: "1760", place: "Prussia", lat: 52.5, lon: 13.4, zoom: 5, at_time: "1755", reporter: "a reader", created_at: "2026-11-20T10:00:00Z", status: "open", note: "The border is wrong here." }] });
    return json(400, { error: "action" });
  });
  await page.route(HOST + "/functions/v1/chronia-comments", async (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: CORS });
    const b = r.request().postDataJSON(), auth = r.request().headers().authorization || "";
    const json = (status, body) => r.fulfill({ status, headers: CORS, contentType: "application/json", body: JSON.stringify(body) });
    if (b.action !== "queue") sent.push(b);
    if (!/^Bearer x\./.test(auth)) return json(401, { error: "signin" });
    if (role === "off") return json(403, { error: "team" });
    if (b.action === "queue") return json(200, { role, ...JSON.parse(JSON.stringify(db)) });
    if (role !== "reviewer") return json(403, { error: "review" });
    if (fail.has(b.action)) return json(500, { error: "store" });
    const com = db.comments.find((x) => x.id === b.id);
    if (b.action === "restore" || b.action === "remove") {
      if (!com) return json(404, { error: "missing" });
      com.state = b.action === "restore" ? "live" : "removed";
      if (b.action === "restore") com.flags = 0;
      return json(200, { comment: com });
    }
    if (b.action === "block") {
      db.blocked = db.blocked.filter((x) => x.user !== b.user);
      if (b.on) db.blocked.push({ user: b.user, username: (db.comments.find((x) => x.user === b.user) || db.pictures.find((x) => x.user === b.user) || {}).username });
      return json(200, { ok: true });
    }
    if (b.action === "picture") { const p = db.pictures.find((x) => x.user === b.user); if (p) p.state = b.on ? "ok" : "removed"; return json(200, { ok: true }); }
    if (b.action === "move") { let k = 0; db.comments.forEach((x) => { if (x.polity === b.from) { x.polity = b.to; k++; } }); return json(200, { moved: k }); }
    if (b.action === "erase") { db.comments = db.comments.filter((x) => x.user !== b.user); db.pictures = db.pictures.filter((x) => x.user !== b.user); return json(200, { ok: true }); }
    return json(400, { error: "action" });
  });
  await page.goto(base, { waitUntil: "load" });
  if (role !== "off") await page.waitForSelector("#cm-list li[data-id]", { timeout: 15000 }).catch(() => {});
  return { page, db, sent, csp, fail };
}
const row = (page, id) => page.locator(`#cm-list li[data-id="${id}"]`);
const btn = (loc, name) => loc.getByRole("button", { name, exact: true });
const visible = (page) => page.$$eval("#cm-list li[data-id]", (ls) => ls.filter((l) => !l.hidden).map((l) => +l.dataset.id));
const last = (sent) => JSON.stringify(sent[sent.length - 1] || null);

// A reviewer.
{
  const { page, db, sent, csp } = await open("reviewer");
  say(await page.locator("#list li.rp-item").count() === 1 && /border is wrong/.test(await page.locator("#list").textContent()), "the reports list still shows its report", await page.locator("#list").textContent());
  say(!(await page.locator("#cm").isHidden()), "a team member sees the Comments part", "hidden");
  const ids = await visible(page);
  say(JSON.stringify(ids) === "[11,10,9,8]", "the comments are listed newest first", JSON.stringify(ids));
  const count = await page.locator("#cm-count").textContent();
  say(/1 live with reports/.test(count) && /2 hidden/.test(count) && /1 removed/.test(count), "the counts at the head are right", count);
  const r11 = await row(page, 11).textContent();
  say(["Herodotus", "Kingdom of France", "1789-07-14", "Long live the king", "2 reports", "live with reports"].every((s) => r11.includes(s)), "a row shows its username, country, date, text, reports, and state", r11);
  say(await row(page, 10).locator(".cm-face").textContent() === "T", "a writer without a picture shows the initial", await row(page, 10).locator(".cm-face").textContent());
  const img = await row(page, 11).locator("img").evaluate((i) => i.complete && i.naturalWidth > 0).catch(() => false);
  say(img, "a picture from the bucket loads", img);
  say(csp.length === 0, "no Content-Security-Policy violation (or page error) is reported", csp.join(" / "));

  await page.click('#cm-bar [data-cstate="hidden"]');
  say(JSON.stringify(await visible(page)) === "[10,8]", "the filter shows only the hidden", JSON.stringify(await visible(page)));
  await page.click('#cm-bar [data-cstate="removed"]');
  say(JSON.stringify(await visible(page)) === "[9]", "the filter shows only the removed", JSON.stringify(await visible(page)));
  await page.click('#cm-bar [data-cstate="live"]');
  say(JSON.stringify(await visible(page)) === "[11]", "the filter shows only the live with reports", JSON.stringify(await visible(page)));
  await page.click('#cm-bar [data-cstate="all"]');

  await btn(row(page, 10), "Restore").click();
  await page.waitForFunction(() => /live/.test(document.querySelector('#cm-list li[data-id="10"] .cm-state').textContent), null, { timeout: 5000 }).catch(() => {});
  say(last(sent) === '{"action":"restore","id":10}', "Restore sends restore with the id", last(sent));
  say(/^live$/.test(await row(page, 10).locator(".cm-state").textContent()), "the restored row reads live", await row(page, 10).locator(".cm-state").textContent());
  say(/2 live with reports|2 live/.test(await page.locator("#cm-count").textContent()), "the counts follow", await page.locator("#cm-count").textContent());

  await btn(row(page, 11), "Remove").click();
  await page.waitForFunction(() => document.querySelector('#cm-list li[data-id="11"] .cm-state').textContent === "removed", null, { timeout: 5000 }).catch(() => {});
  say(last(sent) === '{"action":"remove","id":11}', "Remove sends remove with the id", last(sent));
  say(await row(page, 11).locator(".cm-state").textContent() === "removed", "the removed row reads removed", await row(page, 11).locator(".cm-state").textContent());
  say(await btn(row(page, 11), "Restore").count() === 1 && await btn(row(page, 11), "Remove").count() === 0, "a removed row offers Restore, not Remove", await row(page, 11).locator("button").allTextContents());

  await btn(row(page, 9), "Block").click();
  await btn(row(page, 9), "Unblock").waitFor({ timeout: 5000 }).catch(() => {});
  say(last(sent) === '{"action":"block","user":"u3","on":true}', "Block sends block with the account and on", last(sent));
  say(/blocked/.test(await row(page, 9).locator(".cm-meta").textContent()) && await btn(row(page, 9), "Unblock").count() === 1, "the blocked row says so and offers Unblock", await row(page, 9).textContent());
  say(await page.locator('#cm-blocked li[data-user="u3"]').count() === 1, "the account joins the blocked list", await page.locator("#cm-blocked").textContent());
  await btn(row(page, 9), "Unblock").click();
  await btn(row(page, 9), "Block").waitFor({ timeout: 5000 }).catch(() => {});
  say(last(sent) === '{"action":"block","user":"u3","on":false}', "Unblock sends block with on false", last(sent));
  say(await page.locator('#cm-blocked li[data-user="u3"]').count() === 0, "the account leaves the blocked list", await page.locator("#cm-blocked").textContent());
  await btn(page.locator('#cm-blocked li[data-user="u4"]'), "Unblock").click();
  await page.waitForFunction(() => !document.querySelector('#cm-blocked li[data-user="u4"]'), null, { timeout: 5000 }).catch(() => {});
  say(last(sent) === '{"action":"block","user":"u4","on":false}', "Unblock in the blocked list sends block with on false", last(sent));

  const pic = (u) => page.locator(`#cm-pics li[data-user="${u}"]`);
  const big = await pic("u4").locator("img").evaluate((i) => i.getBoundingClientRect().width).catch(() => 0);
  say(big >= 80, "a reported picture is shown large enough to judge", big);
  const p4 = await pic("u4").textContent();
  say(/Polybius/.test(p4) && /3 reports/.test(p4) && /hidden/.test(p4), "a picture row shows the username, the count, and the state", p4);
  await btn(pic("u4"), "Keep").click();
  await page.waitForFunction(() => /kept/.test(document.querySelector('#cm-pics li[data-user="u4"] .cm-state').textContent), null, { timeout: 5000 }).catch(() => {});
  say(last(sent) === '{"action":"picture","user":"u4","on":true}', "Keep sends picture on", last(sent));
  say(/kept/.test(await pic("u4").locator(".cm-state").textContent()), "the kept picture reads kept", await pic("u4").locator(".cm-state").textContent());
  await btn(pic("u1"), "Remove").click();
  await page.waitForFunction(() => document.querySelector('#cm-pics li[data-user="u1"] .cm-state').textContent === "removed", null, { timeout: 5000 }).catch(() => {});
  say(last(sent) === '{"action":"picture","user":"u1","on":false}', "Remove on a picture sends picture off", last(sent));
  say(await pic("u1").locator(".cm-state").textContent() === "removed", "the removed picture reads removed", await pic("u1").locator(".cm-state").textContent());

  // Moved names: the names no longer on the map, found once the part is opened.
  const before = await page.evaluate(() => performance.getEntriesByType("resource").some((e) => /eras\.json/.test(e.name)));
  say(!before, "the map's names are not loaded until Moved names is opened", before);
  await page.click("#cm-names summary");
  await page.waitForSelector('#cm-names li[data-name]', { timeout: 30000 }).catch(() => {});
  const gone = await page.$$eval("#cm-names li[data-name]", (ls) => ls.map((l) => l.dataset.name));
  say(JSON.stringify(gone) === '["Lost Duchy","Old Name Land"]', "Moved names lists just the names the map lacks", JSON.stringify(gone));
  say(/1 reported, hidden, or removed/.test(await page.locator('#cm-names li[data-name="Old Name Land"]').textContent()), "a moved name gives the count known from the queue", await page.locator('#cm-names li[data-name="Old Name Land"]').textContent());
  const opts = await page.$eval("#cm-names datalist", (d) => d.options.length).catch(() => 0);
  say(opts > 4000, "the Move box suggests the map's names", opts);
  const mv = page.locator('#cm-names li[data-name="Old Name Land"]');
  await mv.locator("input").fill("Ottoman Empire");
  await btn(mv, "Move").click();
  await page.waitForFunction(() => /Moved 1/.test(document.querySelector('#cm-names li[data-name="Old Name Land"]').textContent), null, { timeout: 5000 }).catch(() => {});
  say(last(sent) === '{"action":"move","from":"Old Name Land","to":"Ottoman Empire"}', "Move sends move from and to", last(sent));
  say(/Moved 1 comment to Ottoman Empire/.test(await mv.textContent()), "the moved name's row says where they went", await mv.textContent());
  say(/Ottoman Empire/.test(await row(page, 10).locator(".cm-meta").textContent()), "the moved comment's row names its new country", await row(page, 10).locator(".cm-meta").textContent());
  const k = sent.length;
  await page.locator('#cm-names li[data-name="Lost Duchy"] input').fill("Not a name");
  await btn(page.locator('#cm-names li[data-name="Lost Duchy"]'), "Move").click();
  await page.waitForTimeout(300);
  say(sent.length === k && /not a name on the map/i.test(await page.locator('#cm-names li[data-name="Lost Duchy"]').textContent()), "Move refuses a name not on the map and sends nothing", sent.length - k + " sent");

  // Erase, with its confirmation.
  const n0 = sent.length;
  await btn(row(page, 8), "Erase account").click();
  const ask = await row(page, 8).locator(".cm-ask").textContent().catch(() => "");
  say(/Herodotus/.test(ask) && /cannot be undone/.test(ask), "Erase asks first, naming the username and saying it cannot be undone", ask);
  await btn(row(page, 8), "Cancel").click();
  say(sent.length === n0 && await row(page, 8).locator(".cm-ask").count() === 0, "Cancel closes the question and sends nothing", sent.length - n0 + " sent");
  await btn(row(page, 8), "Erase account").click();
  await btn(row(page, 8), "Erase Herodotus").click();
  await page.waitForFunction(() => !document.querySelector('#cm-list li[data-id="8"] button'), null, { timeout: 5000 }).catch(() => {});
  say(last(sent) === '{"action":"erase","user":"u1"}', "Erase sends erase with the account", last(sent));
  say(/erased/.test(await row(page, 8).textContent()) && /erased/.test(await row(page, 11).textContent()) && await page.locator('#cm-list li[data-id="11"] button').count() === 0, "every row of the erased account says so, with no buttons", await row(page, 11).textContent());
  say(/erased/.test(await pic("u1").textContent()), "the erased account's picture row says so", await pic("u1").textContent());
  await page.screenshot({ path: "/home/claude/work/comments-shots/team-reviewer-after.png", fullPage: true }).catch(() => {});
  await page.close();
}

// A failing action shows its error on the row and changes nothing.
{
  const { page, db, sent } = await open("reviewer", { fail: ["remove", "block"] });
  await btn(row(page, 11), "Remove").click();
  await page.waitForFunction(() => /wrong/.test(document.querySelector('#cm-list li[data-id="11"] .cm-err').textContent), null, { timeout: 5000 }).catch(() => {});
  const err = await row(page, 11).locator(".cm-err").textContent().catch(() => "");
  say(/went wrong|500/.test(err), "a failing Remove shows its error on the row", err);
  say(await row(page, 11).locator(".cm-state").textContent() === "live with reports" && db.comments.find((x) => x.id === 11).state === "live", "a failing Remove changes nothing", await row(page, 11).locator(".cm-state").textContent());
  say(await btn(row(page, 11), "Remove").count() === 1, "the row still offers Remove after the failure", await row(page, 11).locator("button").allTextContents());
  await btn(row(page, 9), "Block").click();
  await page.waitForFunction(() => /wrong/.test(document.querySelector('#cm-list li[data-id="9"] .cm-err').textContent), null, { timeout: 5000 }).catch(() => {});
  say(await btn(row(page, 9), "Block").count() === 1 && await page.locator('#cm-blocked li[data-user="u3"]').count() === 0, "a failing Block leaves the account unblocked", await row(page, 9).textContent());
  await page.close();
}

// A comment of HTML is shown as text.
{
  const { page } = await open("viewer");
  const t = await row(page, 10).locator(".cm-text").textContent();
  say(t === "<img src=x onerror=window.__pwned=1>", "a comment of HTML is shown as its text", t);
  say(await row(page, 10).locator(".cm-text img").count() === 0 && await page.evaluate(() => window.__pwned) === undefined, "no element is made from it and window.__pwned stays undefined", await page.evaluate(() => String(window.__pwned)));
  // A viewer sees everything, and has no buttons.
  say(JSON.stringify(await visible(page)) === "[11,10,9,8]", "a viewer sees the comments", JSON.stringify(await visible(page)));
  await page.click("#cm-names summary");
  await page.waitForSelector('#cm-names li[data-name]', { timeout: 30000 }).catch(() => {});
  const nb = await page.$$eval("#cm-list button, #cm-pics button, #cm-blocked button, #cm-names button, #cm-names input", (b) => b.length);
  say(nb === 0, "a viewer has no buttons on comments, pictures, blocked accounts, or names", nb);
  say(await page.locator("#cm-pics li[data-user]").count() === 2 && await page.locator("#cm-blocked li[data-user]").count() === 1 && await page.locator("#cm-names li[data-name]").count() === 2, "a viewer sees the pictures, the blocked accounts, and the moved names", await page.locator("#cm").textContent());
  await page.close();
}

// Someone off the team sees the page's lock, and no comments.
{
  const { page, sent } = await open("off");
  await page.waitForTimeout(600);
  say(await page.locator("#board").isHidden() && /isn't on CHRONIA's team/.test(await page.locator("#lock-note").textContent()), "an account off the team gets the lock and its note", await page.locator("#lock-note").textContent());
  await page.close();
}

await browser.close();
console.log(bad ? bad + " of " + n + " checks failed" : "all " + n + " checks passed");
process.exit(bad ? 1 : 0);

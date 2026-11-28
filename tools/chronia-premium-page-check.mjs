// The Premium page: its words, its one button, and the way from signed out to Stripe's payment page.
// The functions and Stripe are played by stand-ins; nothing is bought.
//   node tools/chronia-premium-page-check.mjs [base URL of the atlas]     (default http://localhost:8101/chronia/)
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = process.argv[2] || "http://localhost:8101/chronia/";
let bad = 0, n = 0;
const say = (ok, what, got) => { n++; if (!ok) { bad++; console.log("FAIL " + what + (got !== undefined ? ": got " + JSON.stringify(got) : "")); } };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const TOKEN = "h." + b64({ sub: "11111111-1111-4111-8111-111111111111", email: "reader@example.com", user_metadata: { full_name: "A Reader" }, exp: Math.floor(Date.now() / 1000) + 3600 }) + ".s";
const SESSION = JSON.stringify({ a: TOKEN, r: "refresh-token-refresh-token", e: Date.now() + 3600000 });
const browser = await chromium.launch();

// One page in a state: signed in or not, with Premium or not, on sale or not. Returns the page and what was asked.
async function open(path, { signedIn = false, premium = false, onSale = true, locale = "en-US" } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 }, locale });
  const page = await ctx.newPage(), asked = [];
  await page.addInitScript(([s, on]) => { try { localStorage.setItem("chronia-tour", "1"); if (on) localStorage.setItem("chronia-auth", s); } catch (e) {} }, [SESSION, signedIn]);
  await page.route(/supabase\.co\/functions\/v1\/chronia-premium/, async (r) => {
    const body = JSON.parse(r.request().postData() || "{}"), auth = !!r.request().headers().authorization; asked.push(body.action + (auth ? "" : " (signed out)"));
    if (body.action === "status") return r.fulfill({ contentType: "application/json", body: JSON.stringify({ open: onSale, premium: auth && premium, signedIn: auth }) });
    if (body.action === "checkout") return auth && !premium ? r.fulfill({ contentType: "application/json", body: JSON.stringify({ url: "https://checkout.stripe.com/c/pay/test_123" }) }) : r.fulfill({ status: premium ? 409 : 401, contentType: "application/json", body: "{}" });
    return r.fulfill({ status: 400, contentType: "application/json", body: "{}" });
  });
  await page.route(/supabase\.co\/(?!functions\/v1\/chronia-premium)/, (r) => r.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
  await page.route("https://accounts.google.com/**", (r) => r.fulfill({ contentType: "application/javascript", body: "" }));
  await page.route("https://checkout.stripe.com/**", (r) => r.fulfill({ contentType: "text/html", body: "<title>Stripe stand-in</title><h1>Pay</h1>" }));
  await page.goto(BASE + path, { waitUntil: "load" });
  return { page, asked, ctx };
}
const text = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, " ").trim() : null; }, sel);

// 1. Signed out: the words.
{
  const { page, asked, ctx } = await open("premium/");
  await page.waitForTimeout(600);
  say(await text(page, ".cp-lede") === "Please consider supporting the CHRONIA team with a purchase.", "the opening line", await text(page, ".cp-lede"));
  say(/^\$10\s*USD$/.test(await text(page, ".pm-amount") || ""), "the price says USD", await text(page, ".pm-amount"));
  say(await text(page, ".pm-terms") === "one-time payment to unlock these features forever:", "the line under the price", await text(page, ".pm-terms"));
  say(await text(page, "#pm-go") === "Get Premium for $10", "signed out, the button reads Get Premium for $10", await text(page, "#pm-go"));
  say(await text(page, "#pm-note") === "", "signed out, there is no note under the button", await text(page, "#pm-note"));
  const all = await page.evaluate(() => document.querySelector("main").innerText);
  say(!/belongs to the Google account|Sign in on the atlas to buy/.test(all), "the old sign-in wording is gone");
  say(!/The same video frame|Without Premium|With Premium/.test(all) && await page.evaluate(() => document.querySelectorAll("main img").length) === 0, "the comparison pictures are gone");
  say(/All your map error reports go to the top of the queue for our review team to fix\./.test(all), "the reports perk's new wording");
  say(!/top of the queue they.re read from/.test(all), "the reports perk's old wording is gone");
  say(await page.evaluate(() => document.querySelectorAll(".pm-perks li").length) === 4, "the four perks are still there");
  say(asked.join() === "" || asked.every((a) => /status/.test(a)), "signed out, nothing is asked beyond the status", asked);
  // The button leads to the atlas's sign-in, which opens the account panel and says what comes next.
  await Promise.all([page.waitForURL(/\/chronia\/(\?.*)?(#.*)?$/, { timeout: 30000 }), page.click("#pm-go")]);
  await page.waitForFunction(() => window.__chronia && window.__chronia.ready(), null, { timeout: 120000 });
  await page.waitForFunction(() => { const a = document.getElementById("account"); return a && !a.hidden; }, null, { timeout: 10000 }).catch(() => {});
  say(await page.evaluate(() => !document.getElementById("account").hidden), "the button opens the atlas with the account panel open");
  say(await page.evaluate(() => { const e = document.getElementById("account-premium-step"); return !!e && !e.hidden && /Premium/.test(e.textContent) && /Stripe/.test(e.textContent); }), "the panel says to sign in for Premium and that Stripe's page comes next", await text(page, "#account-premium-step"));
  say(await page.evaluate(() => sessionStorage.getItem("chronia-premium-back")) === "1", "the atlas remembers to go on to Premium after sign-in");
  say(!/signin=premium/.test(page.url()), "the sign-in part is taken out of the address", page.url());
  await ctx.close();
}
// 2. The account panel opened in the ordinary way says nothing about Premium's steps.
{
  const { page, ctx } = await open("");
  await page.waitForFunction(() => window.__chronia && window.__chronia.ready(), null, { timeout: 120000 });
  await page.evaluate(() => document.getElementById("account-btn").click());
  say(await page.evaluate(() => { const e = document.getElementById("account-premium-step"); return !e || e.hidden; }), "opened ordinarily, the panel has no Premium step line");
  await ctx.close();
}
// 3. Signed in without Premium: the same button, and it goes to Stripe.
{
  const { page, asked, ctx } = await open("premium/", { signedIn: true });
  await page.waitForFunction(() => document.getElementById("pm-go").getAttribute("href") === "#buy", null, { timeout: 10000 }).catch(() => {});
  say(await text(page, "#pm-go") === "Get Premium for $10", "signed in, the button reads Get Premium for $10", await text(page, "#pm-go"));
  say(!asked.includes("checkout"), "nothing is bought by opening the page", asked);
  await Promise.all([page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 }).catch(() => {}), page.click("#pm-go")]);
  say(/checkout\.stripe\.com/.test(page.url()) && asked.includes("checkout"), "pressing it opens Stripe's payment page", [page.url(), asked]);
  await ctx.close();
}
// 4. Back from signing in (?buy=1): straight on to Stripe, with no second press.
{
  const { page, asked, ctx } = await open("premium/?buy=1", { signedIn: true });
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 }).catch(() => {});
  say(/checkout\.stripe\.com/.test(page.url()) && asked.includes("checkout"), "signed in and sent back to buy, Stripe's page opens by itself", [page.url(), asked]);
  await page.goBack({ waitUntil: "load" }).catch(() => {});
  await page.waitForTimeout(1200);
  say(/\/premium\/$/.test(page.url().split("#")[0]) && asked.filter((a) => a === "checkout").length === 1, "going back from Stripe does not open it again", [page.url(), asked]);
  await ctx.close();
}
// 5. ?buy=1 never buys for someone signed out, with Premium already, or while it is not on sale.
{
  let o = await open("premium/?buy=1"); await o.page.waitForTimeout(1200);
  say(!o.asked.includes("checkout") && /\/premium\//.test(o.page.url()) && await text(o.page, "#pm-go") === "Get Premium for $10", "signed out, ?buy=1 does nothing but show the button", [o.asked, o.page.url()]);
  await o.ctx.close();
  o = await open("premium/?buy=1", { signedIn: true, premium: true }); await o.page.waitForTimeout(1200);
  say(!o.asked.includes("checkout") && /You have CHRONIA Premium/.test(await text(o.page, "#pm-note") || "") && await text(o.page, "#pm-go") === "Back to the atlas", "with Premium already, it says so and offers no purchase", [o.asked, await text(o.page, "#pm-note"), await text(o.page, "#pm-go")]);
  await o.ctx.close();
  o = await open("premium/?buy=1", { signedIn: true, onSale: false }); await o.page.waitForTimeout(1200);
  say(!o.asked.includes("checkout") && await o.page.evaluate(() => document.getElementById("pm-go").hidden), "not on sale, nothing is bought and the button is away", o.asked);
  await o.ctx.close();
}
// 6. The atlas's sign-in link, for someone already signed in: on to Premium and to Stripe.
{
  const { page, asked, ctx } = await open("?signin=premium", { signedIn: true });
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 }).catch(() => {});
  say(/checkout\.stripe\.com/.test(page.url()) && asked.includes("checkout"), "already signed in, the atlas's sign-in link goes on to Stripe", [page.url(), asked]);
  await ctx.close();
}
// 7. In another language the page still reads as a whole (no English left on the button or the lines changed).
{
  const { page, ctx } = await open("premium/", { locale: "it-IT" });
  await page.waitForTimeout(900);
  const got = { lede: await text(page, ".cp-lede"), terms: await text(page, ".pm-terms"), go: await text(page, "#pm-go") };
  say(!/Please consider|one-time payment|Get Premium for/.test(Object.values(got).join(" ")), "in Italian the changed lines are in Italian", got);
  await ctx.close();
}
await browser.close();
console.log(bad ? bad + " of " + n + " checks failed" : "all " + n + " checks passed");
process.exit(bad ? 1 : 0);

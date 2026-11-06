import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)("playwright");
const base = process.argv[2] || "http://localhost:8123/chronia/";
let failed = 0;
const ok = (good, what) => { console.log((good ? "ok   " : "FAIL ") + what); if (!good) failed++; };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route(/wikipedia\.org|wikidata\.org|accounts\.google|amazonaws|supabase\.co/, (r) => r.fulfill({ status: 404, body: "" }));

async function at(y) {
  await page.goto(base + "?y=" + y);
  await page.waitForFunction(() => window.__chronia && window.__chronia.ready(), null, { timeout: 60000 });
  await page.evaluate(() => window.__chronia.openChanges(true));
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(500);
    const t = await page.evaluate(() => window.__chronia.changesText());
    if (t && !/Looking up the changes/.test(t)) return t;
  }
  return await page.evaluate(() => window.__chronia.changesText());
}

let t = await at("1871-03");
ok(/^18 January 1871 \| /.test(t), "the panel names the change in force: " + t.slice(0, 40));
ok(/The German Empire is formed from the North German Confederation, the Kingdom of Bavaria/.test(t), "states that merge are named as forming the new one");
t = await at("1886-01");
ok(/CShapes 2\.0/.test(t), "1 January 1886 says the source changes instead of listing every name");
t = await at("-3400");
ok(/The atlas begins here\./.test(t), "the first date says the atlas begins there");
t = await at("1801-01");
ok(/Acts of Union create the United Kingdom\.Source/.test(t), "an event from the dated table is shown with its source");
await page.click("#changes-next");
await page.waitForTimeout(2500);
const after = await page.evaluate(() => [window.__chronia.shown(), window.__chronia.changesText()]);
ok(after[1] && !/^1 January 1801 \|/.test(after[1]) && after[1].split(" | ")[0].length > 0, "the next arrow goes to the next change: " + after[1].split(" | ")[0]);
await page.click("#changes-prev");
await page.waitForTimeout(2500);
ok(/^1 January 1801 \|/.test(await page.evaluate(() => window.__chronia.changesText())), "the arrow back returns to it");
const name = page.locator(".ch-changes-name").first();
await name.click();
await page.waitForTimeout(2500);
const card = await page.evaluate(() => window.__chronia.card());
ok(card && card.open, "a name on the map opens its card: " + (card && card.name));
await page.evaluate(() => window.__chronia.openChanges(false));
ok((await page.evaluate(() => window.__chronia.changesText())) === null, "the panel closes");
ok(!errors.length, "no page errors: " + errors.join("; "));

await browser.close();
console.log(failed ? failed + " failed" : "all passed");
process.exit(failed ? 1 : 0);

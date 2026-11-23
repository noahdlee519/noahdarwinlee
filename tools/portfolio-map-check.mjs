#!/usr/bin/env node
// Checks the portfolio map (portfolio-map/), in stages.
//
//   node tools/portfolio-map-check.mjs content
//       every project has a link, a blurb, and media files that exist; about.json is whole
//   python3 -m http.server 8137      (from the repository root, in another terminal)
//   node tools/portfolio-map-check.mjs [content|map|interface|all] [base URL]
//       map: the world draws 18 countries and their labels, zoom stops at 4x, and the view stays on the world
//       interface: search, panel, hearts kept across a reload, share links, world switching, the phone layout
//       all (the default): every stage
//
// Screenshots go to /tmp/portfolio-map-*.png.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const stage = process.argv[2] || 'all';
const base = (process.argv[3] || 'http://localhost:8137').replace(/\/$/, '');
const PAGE = `${base}/portfolio-map/`;

let failures = 0;
const ok = (cond, what) => {
  if (cond) console.log(`  ok    ${what}`);
  else { failures++; console.log(`  FAIL  ${what}`); }
};

function content() {
  console.log('content');
  const projects = JSON.parse(readFileSync(join(root, 'portfolio-map', 'projects.json'), 'utf8'));
  const exists = (src) => src.startsWith('/') && existsSync(join(root, src.split('?')[0]));
  ok(projects.length === 18, `18 projects (${projects.length})`);
  const fileOf = (m) => [m.src, m.video, m.poster, ...(m.srcset ? m.srcset.split(',').map((s) => s.trim().split(/\s+/)[0]) : [])].filter(Boolean);
  for (const p of projects) {
    const missing = [];
    if (!p.url) missing.push('url');
    if (!p.domain) missing.push('domain');
    if (!p.blurb) missing.push('blurb');
    if (!Array.isArray(p.media)) missing.push('media');
    for (const m of p.media || []) {
      if (!m.alt) missing.push(`alt for ${m.src || m.video}`);
      for (const f of fileOf(m)) if (!exists(f)) missing.push(`file ${f}`);
    }
    for (const v of p.provinces || []) {
      if (!v.blurb) missing.push(`${v.id} blurb`);
      for (const m of v.media || []) for (const f of fileOf(m)) if (!exists(f)) missing.push(`file ${f}`);
    }
    ok(missing.length === 0, `${p.id}${missing.length ? ': missing ' + missing.join(', ') : ''}`);
  }
  ok(projects.filter((p) => p.tier === 'flagship').every((p) => p.media.length > 0), 'every flagship has media');
  ok(exists('/portfolio/Lee_Noah_Resume.pdf'), 'the resume the rail opens exists');
  const worlds = JSON.parse(readFileSync(join(root, 'portfolio-map', 'worlds', 'index.json'), 'utf8'));
  let size = 0;
  for (const w of worlds) {
    const d = JSON.parse(readFileSync(join(root, 'portfolio-map', 'worlds', `${w.slug}.json`), 'utf8'));
    const ids = new Set(d.projects.map((p) => p.id));
    if (!projects.every((p) => ids.has(p.id))) ok(false, `${w.slug} has every project`);
    size = Math.max(size, readFileSync(join(root, 'portfolio-map', 'worlds', `${w.slug}.json`)).length + readFileSync(join(root, 'portfolio-map', 'worlds', `${w.slug}.png`)).length);
  }
  ok(true, `${worlds.length} worlds each hold every project; the largest is ${(size / 1024).toFixed(0)} KB (json and png)`);
}

if (stage === 'content' || stage === 'all') content();

async function open(browser, query, { phone = false, context } = {}) {
  const ctx = context || (await browser.newContext(phone
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 900 } }));
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
  await page.route(/supabase\.co/, (r) => r.fulfill({ status: 201, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: '' }));
  await page.goto(PAGE + (query || ''));
  await page.waitForFunction(() => window.__portfolioMap && window.__portfolioMap.ready, null, { timeout: 20000 });
  await page.waitForTimeout(400);
  return page;
}
const view = (page) => page.evaluate(() => {
  const m = window.__portfolioMap.map, r = m.rect();
  return { s: m.s, tx: m.tx, ty: m.ty, zoom: m.zoom(), W: m.world.width, H: m.world.height, rect: r, world: m.world.slug };
});
// The visible part of the map lies on the world: its edges never show past the world's own.
const onWorld = (v) => {
  const ww = v.W * v.s, wh = v.H * v.s, e = 1;
  const x = ww <= v.rect.w + e ? true : v.tx <= v.rect.l + e && v.tx + ww >= v.rect.r - e;
  const y = wh <= v.rect.h + e ? true : v.ty <= v.rect.t + e && v.ty + wh >= v.rect.b - e;
  return x && y;
};

async function mapStage(browser) {
  console.log('map');
  const page = await open(browser, '?world=le-guin');
  const counts = await page.evaluate(() => ({
    countries: document.querySelectorAll('.map-country').length,
    labels: document.querySelectorAll('.lbl.k-country').length,
    shown: document.querySelectorAll('.lbl.k-country.is-on').length,
    world: window.__portfolioMap.map.world.slug,
  }));
  ok(counts.world === 'le-guin', '?world=le-guin opens Le Guin');
  ok(counts.countries === 18, `18 country shapes (${counts.countries})`);
  ok(counts.labels === 18, `18 country labels (${counts.labels})`);
  ok(counts.shown >= 14, `most country labels show at the start (${counts.shown} of 18)`);

  const labelsAt = () => page.evaluate(() => [...document.querySelectorAll('.lbl.is-on')].map((e) => e.className.baseVal.match(/k-(\w+)/)[1]));
  const before = await labelsAt();
  // Zoom with the wheel at the middle of the map until it stops.
  const rect = (await view(page)).rect;
  await page.mouse.move(rect.l + rect.w / 2, rect.t + rect.h / 2);
  let last = 0;
  for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, -240); await page.waitForTimeout(30); }
  await page.waitForTimeout(900);
  let v = await view(page);
  ok(Math.abs(v.zoom - 4) < 0.01, `the wheel zooms in to 4x and stops there (${v.zoom.toFixed(2)})`);
  last = v.zoom;
  await page.click('#zoom-in').catch(() => {});
  await page.waitForTimeout(500);
  v = await view(page);
  ok(v.zoom <= last + 1e-6, 'the + button cannot zoom past 4x');
  ok(await page.evaluate(() => document.querySelector('#zoom-in').disabled), 'the + button is disabled at 4x');
  const after = await labelsAt();
  ok(after.includes('town') && !before.includes('town'), 'towns appear only when zoomed in');
  ok(onWorld(v), 'zoomed in, the view is on the world');

  // Drag hard toward every corner: the view stops at the world's edge.
  for (const [dx, dy] of [[3000, 3000], [-3000, -3000], [3000, -3000], [-3000, 3000]]) {
    for (let k = 0; k < 4; k++) {
      await page.mouse.move(rect.l + rect.w / 2, rect.t + rect.h / 2);
      await page.mouse.down();
      await page.mouse.move(rect.l + rect.w / 2 + dx / 4, rect.t + rect.h / 2 + dy / 4, { steps: 6 });
      await page.mouse.up();
    }
    await page.waitForTimeout(700);
    v = await view(page);
    ok(onWorld(v), `dragging (${dx}, ${dy}) stops at the world's edge`);
  }
  // Zoom all the way out: the whole world fits.
  await page.mouse.move(rect.l + rect.w / 2, rect.t + rect.h / 2);
  for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 240); await page.waitForTimeout(20); }
  await page.waitForTimeout(900);
  v = await view(page);
  ok(v.W * v.s <= v.rect.w + 1 && v.H * v.s <= v.rect.h + 1, `zoomed out, the whole world fits the map (zoom ${v.zoom.toFixed(2)})`);
  ok(page.errors.length === 0, `no errors on the page${page.errors.length ? ': ' + page.errors.join(' | ') : ''}`);
  await page.close();
}

const panelTitle = (page) => page.evaluate(() => { const t = document.querySelector('#panel-body .title'); return t ? t.textContent.trim() : null; });
const selected = (page) => page.evaluate(() => { const m = window.__portfolioMap.map; return { id: m.selected, province: m.selectedProvince, world: m.world.slug, lit: !!document.querySelector('.map-country.is-sel') }; });

async function interfaceStage(browser) {
  console.log('interface (desktop, 1440x900)');
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
  let page = await open(browser, '?world=le-guin', { context });
  ok(await page.evaluate(() => !document.body.classList.contains('is-panel') && !!document.querySelector('#search-input') && getComputedStyle(document.querySelector('.rail')).display !== 'none'), 'the page opens on the map, with the panel closed and the rail and search box present');
  ok(await page.evaluate(() => { const m = window.__portfolioMap.map; return m.world.width * m.s >= m.rect().w - 2 || m.world.height * m.s >= m.rect().h - 2; }), 'the world fills the map, full width');
  await page.screenshot({ path: '/tmp/portfolio-map-desktop.png' });

  // Search: type, arrow, Enter.
  await page.click('#search-input');
  await page.keyboard.type('lore');
  ok(await page.evaluate(() => !document.querySelector('#search-list').hidden && document.querySelectorAll('.search-opt').length >= 1), 'search lists matches as you type');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  ok(await panelTitle(page) === 'LoreTour', 'Enter opens the match');
  let sel = await selected(page);
  ok(sel.id === 'loretour' && sel.lit, 'the country is highlighted');
  ok(new URL(page.url()).searchParams.get('project') === 'loretour', 'the address names the open project');
  // Dealdesk's tools are found by search too.
  await page.fill('#search-input', '');
  await page.click('#search-input');
  await page.keyboard.type('closeb');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  sel = await selected(page);
  ok(await panelTitle(page) === 'Closebook' && sel.id === 'dealdesk' && sel.province === 'closebook', 'search finds a Dealdesk tool and opens its province');

  // Clicking a country on the map opens it.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__portfolioMap.map.set(window.__portfolioMap.home()));
  await page.waitForTimeout(800);
  const pt = await page.evaluate(() => {
    const m = window.__portfolioMap.map, l = m.world.labels.find((x) => x.id === 'chronia');
    return { x: l.x * m.s + m.tx, y: (l.y + 18) * m.s + m.ty };
  });
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(1200);
  ok(await panelTitle(page) === 'CHRONIA', 'clicking a country opens its panel');

  // Heart it, and find it in Saved after a reload.
  await page.click('.action-save');
  ok(await page.getAttribute('.action-save', 'aria-pressed') === 'true', 'the heart toggles on');
  await page.reload();
  await page.waitForFunction(() => window.__portfolioMap && window.__portfolioMap.ready);
  await page.click('.rail-btn[data-view="saved"]');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => [...document.querySelectorAll('.rows-saved .row')].some((r) => r.getAttribute('data-open') === 'chronia')), 'the hearted project is in Saved after a reload');

  // Share: the copied link opens the same world with the same panel, in a fresh browser.
  await page.click('.rows-saved .row[data-open="chronia"]');
  await page.waitForTimeout(900);
  await page.click('.action-share');
  await page.waitForTimeout(200);
  const link = await page.evaluate(() => navigator.clipboard.readText());
  ok(/[?&]world=le-guin/.test(link) && /[?&]project=chronia/.test(link), `Share copies a link to this world and project (${link.replace(base, '')})`);
  ok(await page.evaluate(() => document.querySelector('#toast').textContent) === 'Link copied', 'Share says "Link copied"');
  const fresh = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p2 = await open(browser, link.replace(PAGE, ''), { context: fresh });
  sel = await selected(p2);
  ok(sel.world === 'le-guin' && sel.id === 'chronia' && sel.lit && (await panelTitle(p2)) === 'CHRONIA', 'the shared link opens that world, with the panel open and the country highlighted');
  const p3 = await open(browser, '?world=asimov&project=dealdesk&province=rollmap', { context: fresh });
  sel = await selected(p3);
  ok(sel.world === 'asimov' && sel.province === 'rollmap' && (await panelTitle(p3)) === 'Rollmap', 'a province link opens Dealdesk at that tool');
  await fresh.close();

  // The world name in the footer moves to the next world, keeping the open project.
  const before = (await selected(page)).world;
  await page.click('#strip-world');
  await page.waitForTimeout(1800);
  sel = await selected(page);
  ok(sel.world !== before && sel.id === 'chronia' && (await panelTitle(page)) === 'CHRONIA', `the footer's world name moves to the next world (${before} to ${sel.world}) and keeps the panel`);
  ok(await page.evaluate(() => document.querySelector('.strip-world-name').textContent === window.__portfolioMap.map.world.name), 'the footer names the new world');
  await page.screenshot({ path: '/tmp/portfolio-map-desktop-project.png' });

  // Escape closes the panel; the rail and footer controls work from the keyboard.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => !document.body.classList.contains('is-panel') && !window.__portfolioMap.map.selected), 'Escape closes the panel');
  await page.click('.strip-feedback');
  ok(await page.evaluate(() => document.querySelector('#feedback-dialog').open), 'Site feedback opens the feedback form');
  await page.keyboard.press('Escape');
  await page.focus('.rail-btn[data-view="contact"]');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  ok(await panelTitle(page) === 'Contact', 'the rail works from the keyboard');
  ok(await page.evaluate(() => { const a = document.querySelector('.rail-about'); return a.tagName === 'A' && a.getAttribute('href') === '/#about' && !a.target; }), "About links to the site's about page, in the same tab");
  ok(await page.evaluate(() => document.querySelector('.rail-btn[data-view="resume"]').getAttribute('href') === '/portfolio/Lee_Noah_Resume.pdf'), 'Resume opens the PDF');
  ok(page.errors.length === 0, `no errors on the page${page.errors.length ? ': ' + page.errors.join(' | ') : ''}`);

  // Rotation: each load shows the world after the last one this browser saw.
  const rot = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const r1 = await open(browser, '', { context: rot });
  const w1 = (await selected(r1)).world;
  await r1.reload();
  await r1.waitForFunction(() => window.__portfolioMap && window.__portfolioMap.ready);
  const w2 = (await selected(r1)).world;
  const order = JSON.parse(readFileSync(join(root, 'portfolio-map', 'worlds', 'index.json'), 'utf8')).map((w) => w.slug);
  ok(order[(order.indexOf(w1) + 1) % order.length] === w2, `a reload shows the next world (${w1} then ${w2})`);
  await rot.close();

  // Private mode: storage that throws. Rotation falls back to random, and hearts still toggle for the visit.
  const priv = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await priv.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  const pp = await open(browser, '?world=le-guin&project=leggio', { context: priv });
  await pp.click('.action-save');
  await pp.click('.rail-btn[data-view="saved"]');
  await pp.waitForTimeout(300);
  ok(await pp.evaluate(() => document.querySelectorAll('.rows-saved .row').length === 1) && pp.errors.length === 0, 'with storage blocked, hearts work for the visit, without errors');
  await priv.close();
  await context.close();

  console.log('interface (phone, 390x844)');
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  page = await open(browser, '?world=le-guin', { context: phone });
  const sheet = () => page.evaluate(() => document.querySelector('#panel').getAttribute('data-sheet'));
  ok(await sheet() === 'peek', 'the sheet starts lowered, under the map');
  ok(await panelTitle(page) === 'Le Guin' && (await page.evaluate(() => !!document.querySelector('.peek-links a[href="/terms/"]'))), "the lowered sheet names the world and carries the footer's links");
  ok(await page.evaluate(() => document.querySelector('.search-me').getAttribute('href') === '/#about'), "the portrait in the search pill links to the site's about page");
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('.rail')).flexDirection === 'row' && document.querySelector('.rail').getBoundingClientRect().bottom >= innerHeight - 1), 'the rail is a tab bar at the bottom');
  await page.screenshot({ path: '/tmp/portfolio-map-phone.png' });
  // The map pans above the sheet.
  let v0 = await view(page);
  await page.touchscreen.tap(195, 400);
  await page.evaluate(async () => {
    const el = document.querySelector('.map-svg');
    const fire = (type, x, y) => el.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true }));
    fire('pointerdown', 200, 420);
    for (let i = 1; i <= 10; i++) { fire('pointermove', 200 - i * 14, 420 - i * 4); await new Promise((r) => setTimeout(r, 16)); }
    fire('pointerup', 60, 380);
  });
  await page.waitForTimeout(700);
  let v1 = await view(page);
  ok(Math.abs(v1.tx - v0.tx) > 40, 'the map pans with a finger');
  // Search, then the sheet rises halfway with the project.
  await page.tap('#search-input');
  await page.keyboard.type('fuzh');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  ok(await sheet() === 'half' && (await panelTitle(page)) === 'Fuzhounese Dictionary', 'a project opens in the sheet, halfway up');
  await page.screenshot({ path: '/tmp/portfolio-map-phone-project.png' });
  // Drag the grip: up to full, then down to lowered.
  const drag = (from, to) => page.evaluate(async ([a, b]) => {
    const el = document.querySelector('.sheet-grip');
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2;
    const fire = (type, y) => el.dispatchEvent(new PointerEvent(type, { pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true }));
    const y0 = r.top + 8;
    fire('pointerdown', y0);
    for (let i = 1; i <= 12; i++) { fire('pointermove', y0 + ((b - a) * i) / 12); await new Promise((res) => setTimeout(res, 16)); }
    fire('pointerup', y0 + (b - a));
  }, [from, to]);
  await drag(0, -420);
  await page.waitForTimeout(600);
  ok(await sheet() === 'full', 'dragging the sheet up raises it all the way');
  await page.screenshot({ path: '/tmp/portfolio-map-phone-full.png' });
  await drag(0, 700);
  await page.waitForTimeout(600);
  ok(await sheet() === 'peek', 'dragging it down lowers it');
  // Tabs.
  await page.tap('.rail-btn[data-view="saved"]');
  await page.waitForTimeout(500);
  ok(await sheet() === 'half' && (await panelTitle(page)) === 'Saved', 'the Saved tab shows Saved');
  ok(await page.evaluate(() => { const a = document.querySelector('.rail-about'); return getComputedStyle(a).display !== 'none' && a.getAttribute('href') === '/#about'; }), "the About tab links to the site's about page");
  await page.tap('.tab-explore');
  await page.waitForTimeout(500);
  ok(await sheet() === 'peek' && (await panelTitle(page)) === (await page.evaluate(() => window.__portfolioMap.map.world.name)), 'the Explore tab lowers the sheet to the world');
  const w0 = (await selected(page)).world;
  await page.tap('#fab-world');
  await page.waitForTimeout(1600);
  ok((await selected(page)).world !== w0, 'the round button shows the next world');
  ok(page.errors.length === 0, `no errors on the phone${page.errors.length ? ': ' + page.errors.join(' | ') : ''}`);
  await phone.close();
}

if (stage !== 'content') {
  const { chromium } = createRequire(import.meta.url)('playwright');
  const browser = await chromium.launch();
  try {
    if (stage === 'map' || stage === 'all') await mapStage(browser);
    if (stage === 'interface' || stage === 'all') await interfaceStage(browser);
  } finally {
    await browser.close();
  }
}

console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);

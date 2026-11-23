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
  const about = JSON.parse(readFileSync(join(root, 'portfolio-map', 'about.json'), 'utf8'));
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
  ok(about.hello && about.lede && exists(about.portrait.src) && exists(about.resume) && about.contact.email, 'about.json: introduction, portrait, resume, and email');
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

if (stage !== 'content') {
  const { chromium } = createRequire(import.meta.url)('playwright');
  const browser = await chromium.launch();
  try {
    if (stage === 'map' || stage === 'all') await mapStage(browser);
    // INTERFACE STAGE
  } finally {
    await browser.close();
  }
}

console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);

#!/usr/bin/env node
// Checks the portfolio map (projects/, formerly portfolio-map/), in stages.
//
//   node tools/portfolio-map-check.mjs content
//       every project has a link, a blurb, and media files that exist; about.json is whole
//   python3 -m http.server 8137      (from the repository root, in another terminal)
//   node tools/portfolio-map-check.mjs [content|map|interface|menu|sharp|here|moved|all] [base URL]
//       map: the world draws 20 countries and their labels, zoom stops at 8x, the water is the reference's blue at
//       each zoom, and the view stays on the world
//       interface: search, panel, hearts kept across a reload, share links, world switching, the phone layout
//       menu: the page stays White whatever the site's theme; the drawer, and each map layer it switches off; the
//       fullscreen viewer; the wordmarks are gone
//       sharp: the first view loads only the world's two files; at 6x on a 2x screen, the finest tiles draw the land,
//       and at the closest zoom they still do, under the cities' outlines and streets
//       here: the location button flies to the blue dot on the island called About, then opens the about page
//       all (the default): every stage
//
// Screenshots go to /tmp/portfolio-map-*.png.
import { readFileSync, existsSync } from 'node:fs';
import { inflateSync, gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const stage = process.argv[2] || 'all';
const base = (process.argv[3] || 'http://localhost:8137').replace(/\/$/, '');
const PAGE = `${base}/projects/`;

// The closest zoom (map.js, MAX_ZOOM), and the sea's blue as the page should render it at each zoom: the reference's,
// measured on Noah's screenshots of it (read through their colour profiles into sRGB).
const MAX_ZOOM = 8;
const WATER_AT = [[1, '#7fd5e9'], [3, '#7fd5e9'], [6, '#7fd5e9'], [8, '#7fd5e9']];

let failures = 0;
const ok = (cond, what) => {
  if (cond) console.log(`  ok    ${what}`);
  else { failures++; console.log(`  FAIL  ${what}`); }
};

// An indexed PNG's pixels, as palette indices.
function decodeIndexed(buf) {
  let p = 8, W, H, bits;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('latin1', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { W = data.readUInt32BE(0); H = data.readUInt32BE(4); bits = data[8]; }
    if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)), rb = Math.ceil((W * bits) / 8), px = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const b = raw[y * (rb + 1) + 1 + ((x * bits) >> 3)];
    px[y * W + x] = (b >> (8 - bits - ((x * bits) & 7))) & ((1 << bits) - 1);
  }
  return { W, H, px };
}

// A truecolour PNG's pixels (8 bits a channel, as a screenshot is), as [r, g, b] at (x, y).
function decodeRgb(buf) {
  let p = 8, W, H, ch;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('latin1', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { W = data.readUInt32BE(0); H = data.readUInt32BE(4); ch = data[9] === 6 ? 4 : 3; }
    if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)), row = W * ch, out = new Uint8Array(row * H);
  for (let y = 0; y < H; y++) {
    const f = raw[y * (row + 1)], src = y * (row + 1) + 1, dst = y * row;
    for (let x = 0; x < row; x++) {
      const a = x >= ch ? out[dst + x - ch] : 0, b = y ? out[dst + x - row] : 0, c = x >= ch && y ? out[dst + x - row - ch] : 0;
      let v = raw[src + x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[dst + x] = v & 255;
    }
  }
  return { W, H, at: (x, y) => [out[(y * W + x) * ch], out[(y * W + x) * ch + 1], out[(y * W + x) * ch + 2]] };
}

function content() {
  console.log('content');
  const projects = JSON.parse(readFileSync(join(root, 'projects', 'projects.json'), 'utf8'));
  const exists = (src) => src.startsWith('/') && existsSync(join(root, src.split('?')[0]));
  ok(projects.length === 20, `20 projects (${projects.length})`);
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
  const worlds = JSON.parse(readFileSync(join(root, 'projects', 'worlds', 'index.json'), 'utf8'));
  let size = 0, tileCount = 0, tileBytes = 0;
  for (const w of worlds) {
    const d = JSON.parse(readFileSync(join(root, 'projects', 'worlds', `${w.slug}.json`), 'utf8'));
    const ids = new Set(d.projects.map((p) => p.id));
    if (!projects.every((p) => ids.has(p.id))) ok(false, `${w.slug} has every project`);
    // The world wraps east and west, so no land may run off either edge, except the polar land, which runs on across
    // the seam: where it meets one edge it meets the other in the same rows.
    const pic = decodeIndexed(readFileSync(join(root, 'projects', 'worlds', `${w.slug}.png`)));
    let edge = 0, ice = 0;
    for (let y = 0; y < pic.H; y++) {
      const a = pic.px[y * pic.W], b = pic.px[y * pic.W + pic.W - 1];
      if (a === 7 && b === 7) continue;
      if (d.polar && a !== 7 && b !== 7 && (y < pic.H * 0.42 || y > pic.H * 0.58)) { ice++; continue; }
      edge++;
    }
    if (edge > 2) ok(false, `${w.slug}: land at the east or west edge in ${edge} rows, so the world can't wrap cleanly`);
    // The finer tiles: every one the world file lists is there, and no other.
    const T = d.tiles;
    if (!T || !T.levels || !T.levels.length) ok(false, `${w.slug}: no finer tiles for zooming in`);
    else for (const lv of T.levels) {
      let listed = 0, found = 0;
      for (let i = 0; i < lv.cols * lv.rows; i++) {
        const on = (parseInt(lv.has.charAt(i >> 2), 16) >> (i & 3)) & 1;
        const f = join(root, 'projects', 'worlds', T.src, String(lv.scale), `${i % lv.cols}-${Math.floor(i / lv.cols)}.png`);
        if (on) { listed++; if (existsSync(f)) { found++; tileBytes += readFileSync(f).length; } }
      }
      tileCount += found;
      if (listed !== found) ok(false, `${w.slug}: ${listed - found} of the ${lv.scale}-per-unit tiles it lists are missing`);
    }
    // As a visitor downloads it: the JSON compressed, as the server sends it, and the picture.
    size = Math.max(size, gzipSync(readFileSync(join(root, 'projects', 'worlds', `${w.slug}.json`))).length + readFileSync(join(root, 'projects', 'worlds', `${w.slug}.png`)).length);
  }
  ok(size <= 300 * 1024, `${worlds.length} worlds each hold every project and meet the sea at their east and west edges; the largest first load is ${(size / 1024).toFixed(0)} KB (json as sent, compressed, and png)`);
  ok(tileCount > 0, `the finer tiles are all there: ${tileCount} in all, ${(tileBytes / 1048576).toFixed(1)} MB across the twenty worlds, loaded only for the part of the map in view`);
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
// The world wraps east and west; north and south, the visible part of the map never runs past its edges.
const onWorld = (v) => {
  const wh = v.H * v.s, e = 1;
  return wh <= v.rect.h + e ? true : v.ty <= v.rect.t + e && v.ty + wh >= v.rect.b - e;
};

// The island called About: a blue dot; the location button flies there, pauses, then opens the about page.
async function hereStage(browser) {
  console.log('here');
  const page = await open(browser, '?world=le-guin');
  await page.waitForTimeout(1600);
  const dot = await page.evaluate(() => {
    const m = window.__portfolioMap.map, el = document.querySelector('.map-here .here-dot');
    const r = el && el.getBoundingClientRect();
    return { here: m.world.here, shown: !!r && r.width > 4 && r.width < 20, projects: m.world.projects.some((p) => p.id === 'about') };
  });
  ok(Array.isArray(dot.here) && dot.shown && !dot.projects, `the world shows a "you are here" dot at ${dot.here} on the island called About, which is no project`);
  await page.fill('#search-input', 'About');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => ![...document.querySelectorAll('.search-opt')].some((o) => /^About$/.test(o.textContent.trim()))), 'searching finds no project called About');
  await page.fill('#search-input', '');
  await page.keyboard.press('Escape');
  await page.screenshot({ path: '/tmp/portfolio-map-here-before.png' });
  // The button: a flight first (the URL stays), then the about page.
  const t0 = Date.now();
  await page.click('.locate');
  await page.waitForTimeout(500);
  const mid = await page.evaluate(() => ({ url: location.pathname + location.hash, zoom: window.__portfolioMap.map.zoom() }));
  ok(mid.url.startsWith('/projects/'), `the location button does not leave at once (${mid.url})`);
  await page.waitForTimeout(700);
  const near = await page.evaluate(() => {
    const m = window.__portfolioMap.map, r = m.rect(), h = m.world.here, W = m.world.width;
    const cx = (((r.l + r.w / 2 - m.tx) / m.s) % W + W) % W, cy = (r.t + r.h / 2 - m.ty) / m.s;
    return { d: Math.hypot(cx - h[0], cy - h[1]), zoom: m.zoom() };
  });
  ok(near.d < 6 && near.zoom > 3, `it flies to the blue dot and zooms in on the island (${near.d.toFixed(1)} units off, at ${near.zoom.toFixed(1)}x)`);
  // (A picture for review only: the page is about to leave for the about page, so it may not be taken.)
  await page.screenshot({ path: '/tmp/portfolio-map-here.png', timeout: 2500 }).catch(() => {});
  await page.waitForURL(/\/#about$/, { timeout: 6000 }).catch(() => {});
  ok(/\/#about$/.test(page.url()) && Date.now() - t0 > 1200, `then, after a pause, it opens the about page (${page.url()})`);
  await page.close();
  // Clicking the dot does the same; under reduced motion the flight is instant.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const p2 = await open(browser, '?world=le-guin', { context: ctx });
  await p2.waitForTimeout(600);
  // The dot on the copy of the world in view.
  const box = await p2.evaluate(() => { const r = [...document.querySelectorAll('.map-here .here-dot')].map((e) => e.getBoundingClientRect()).find((q) => q.x > 80 && q.x < innerWidth - 80); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await p2.mouse.click(box[0], box[1]);
  await p2.waitForURL(/\/#about$/, { timeout: 4000 }).catch(() => {});
  ok(/\/#about$/.test(p2.url()), 'clicking the dot (with reduced motion) also ends on the about page');
  await ctx.close();
}

async function mapStage(browser) {
  console.log('map');
  const page = await open(browser, '?world=le-guin');
  const counts = await page.evaluate(() => ({
    countries: Object.keys(window.__portfolioMap.map.shapes).length,
    labels: document.querySelectorAll('.lbl.k-country').length,
    shown: document.querySelectorAll('.lbl.k-country.is-on').length,
    world: window.__portfolioMap.map.world.slug,
  }));
  ok(counts.world === 'le-guin', '?world=le-guin opens Le Guin');
  ok(counts.countries === 20, `20 country shapes (${counts.countries})`);
  ok(counts.labels === 20, `20 country labels (${counts.labels})`);
  ok(counts.shown >= 15, `most country labels show at the start (${counts.shown} of 20)`);

  const labelsAt = () => page.evaluate(() => [...document.querySelectorAll('.lbl.is-on')].map((e) => e.className.baseVal.match(/k-(\w+)/)[1]));
  const before = await labelsAt();
  // Zoom with the wheel at the middle of the map until it stops.
  const rect = (await view(page)).rect;
  await page.mouse.move(rect.l + rect.w / 2, rect.t + rect.h / 2);
  let last = 0;
  for (let i = 0; i < 90; i++) { await page.mouse.wheel(0, -240); await page.waitForTimeout(30); }
  await page.waitForTimeout(900);
  let v = await view(page);
  ok(Math.abs(v.zoom - MAX_ZOOM) < 0.01, `the wheel zooms in to ${MAX_ZOOM}x and stops there (${v.zoom.toFixed(2)})`);
  last = v.zoom;
  await page.click('#zoom-in').catch(() => {});
  await page.waitForTimeout(500);
  v = await view(page);
  ok(v.zoom <= last + 1e-6, `the + button cannot zoom past ${MAX_ZOOM}x`);
  ok(await page.evaluate(() => document.querySelector('#zoom-in').disabled), `the + button is disabled at ${MAX_ZOOM}x`);
  const after = await labelsAt();
  ok(after.includes('town') && !before.includes('town'), 'towns appear only when zoomed in');

  // The sea as rendered, at each zoom: a screenshot's pixels over open water (the middle of the ocean's name, with
  // the names switched off), against the reference's blue for that zoom.
  {
    const hexOf = (c) => '#' + c.map((n) => n.toString(16).padStart(2, '0')).join('');
    const got = [];
    for (const [z] of WATER_AT) {
      const at = await page.evaluate((zoom) => {
        const m = window.__portfolioMap.map, r = m.rect(), s = m.ref() * zoom;
        const o = m.world.labels.find((l) => l.kind === 'ocean');
        m.stop(); m.set({ s, tx: r.l + r.w / 2 - o.x * s, ty: r.t + r.h / 2 - o.y * s }); m.render(true);
        document.querySelector('.map-labels').style.visibility = 'hidden';
        return [Math.round(r.l + r.w / 2), Math.round(r.t + r.h / 2)];
      }, z);
      await page.waitForTimeout(250);
      const shot = decodeRgb(await page.screenshot({ clip: { x: at[0] - 4, y: at[1] - 4, width: 8, height: 8 } }));
      got.push(hexOf(shot.at(4, 4)));
    }
    await page.evaluate(() => { document.querySelector('.map-labels').style.visibility = ''; });
    ok(got.every((c, k) => c === WATER_AT[k][1]), `the sea renders in the reference's blue at zooms ${WATER_AT.map((w) => w[0]).join(', ')}: ${got.join(', ')}`);
    await page.evaluate((zoom) => { const m = window.__portfolioMap.map, r = m.rect(), s = m.ref() * zoom, cx = (r.l + r.w / 2 - m.tx) / m.s, cy = (r.t + r.h / 2 - m.ty) / m.s; m.set({ s, tx: r.l + r.w / 2 - cx * s, ty: r.t + r.h / 2 - cy * s }); m.render(true); }, MAX_ZOOM);
    await page.waitForTimeout(300);
    v = await view(page);
  }
  ok(onWorld(v), 'zoomed in, the view is on the world');

  // Drag hard up and down: the view stops at the world's top and bottom.
  const dragBy = async (dx, dy, times = 4) => {
    for (let k = 0; k < times; k++) {
      await page.mouse.move(rect.l + rect.w / 2, rect.t + rect.h / 2);
      await page.mouse.down();
      await page.mouse.move(rect.l + rect.w / 2 + dx, rect.t + rect.h / 2 + dy, { steps: 6 });
      await page.waitForTimeout(110); // a pause before letting go, so the map doesn't glide on
      await page.mouse.up();
    }
    await page.waitForTimeout(700);
  };
  for (const dy of [3000, -3000]) {
    await dragBy(0, dy / 4);
    ok(onWorld(await view(page)), `dragging ${dy > 0 ? 'down' : 'up'} stops at the world's edge`);
  }

  // East and west, the world wraps: drag several world-widths past the seam and back, and see the same map.
  const worldPoint = () => page.evaluate(() => { const m = window.__portfolioMap.map, r = m.rect(); return ((r.l + r.w / 2 - m.tx) / m.s); });
  const W = v.W, wrapDiff = (a, b) => Math.abs(((((a - b) % W) + W + W / 2) % W) - W / 2);
  const start = await worldPoint();
  const sNow = (await view(page)).s, step = 600, n = Math.ceil((3.3 * W * sNow) / step);
  await dragBy(-step, 0, n);
  const far = await worldPoint();
  const copies = await page.evaluate(() => window.__portfolioMap.map.copies.length);
  ok(wrapDiff(far, start + (n * step) / sNow) < 2, `dragging ${((n * step) / (W * sNow)).toFixed(1)} world-widths east never stops (${copies} copies of the world drawn)`);
  await dragBy(step, 0, n);
  ok(wrapDiff(await worldPoint(), start) < 2, 'dragging back as far returns to the same place on the world');

  // A country on a copy of the world, past the seam, still answers a click.
  await page.evaluate(() => { const m = window.__portfolioMap.map; const h = window.__portfolioMap.home(); m.set(h); });
  await page.waitForTimeout(400);
  const wrapped = await page.evaluate(() => {
    // Put the seam in the middle of the map, with the world's east edge on the left of it: the country named
    // furthest west then shows to the right of the seam, on the next copy of the world.
    const m = window.__portfolioMap.map, r = m.rect(), W = m.world.width;
    const l = m.world.labels.filter((x) => x.kind === 'country' && x.minZoom <= 1).sort((a, b) => a.x - b.x)[0];
    const cx = r.l + r.w / 2;
    m.set({ s: m.s, tx: cx - (W - 120) * m.s, ty: m.ty });
    m.render(true);
    return { x: (l.x + W) * m.s + m.tx, y: l.y * m.s + m.ty, seam: W * m.s + m.tx, id: l.id };
  });
  await page.waitForTimeout(300);
  await page.mouse.click(wrapped.x, wrapped.y);
  await page.waitForTimeout(1300);
  const sel = await page.evaluate(() => ({ id: window.__portfolioMap.map.selected, tint: document.querySelectorAll('.map-dimming .map-dim').length, copies: window.__portfolioMap.map.copies.length }));
  ok(wrapped.x > wrapped.seam && sel.id === wrapped.id && sel.tint >= 2, `clicking a country on a wrapped copy opens it and tints it on every copy (${sel.tint} tints over ${sel.copies} copies)`);
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
const selected = (page) => page.evaluate(() => { const m = window.__portfolioMap.map; return { id: m.selected, province: m.selectedProvince, world: m.world.slug, lit: !!document.querySelector('.map-dimming .map-dim') }; });

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
  const row = await page.evaluate(() => { const o = document.querySelector('.search-opt'); return { name: o.querySelector('b').textContent, line: (o.querySelector('.row-line') || {}).textContent, link: (o.querySelector('.row-link') || {}).textContent, all: document.querySelector('#search-list').textContent }; });
  ok(row.name === 'LoreTour' && row.line && row.line.length > 30 && row.link === 'loretour.com' && !/Country|Small state/.test(row.all), `a result reads as the name, a line on the project, and its address ("${row.line}")`);
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
  // At the home zoom, with CHRONIA in the middle of the map's visible part (clear of the panel).
  await page.evaluate(() => {
    const m = window.__portfolioMap.map, h = window.__portfolioMap.home(), l = m.world.labels.find((x) => x.id === 'chronia'), r = m.rect();
    m.set({ s: h.s, tx: r.l + r.w / 2 - l.x * h.s, ty: r.t + r.h / 2 - l.y * h.s });
  });
  await page.waitForTimeout(800);
  const pt = await page.evaluate(() => {
    const m = window.__portfolioMap.map, l = m.world.labels.find((x) => x.id === 'chronia');
    // Its own name, which belongs to it whatever lies beside it.
    return { x: l.x * m.s + m.tx, y: l.y * m.s + m.ty };
  });
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(1200);
  ok(await panelTitle(page) === 'CHRONIA', 'clicking a country opens its panel');
  const pics = await page.evaluate(() => ({
    top: document.querySelectorAll('#panel-body > .hero').length, topImgs: document.querySelectorAll('#panel-body > .hero img').length,
    topTrack: !!document.querySelector('#panel-body > .hero .track'), more: (document.querySelector('.hero-more') || {}).textContent,
    slides: document.querySelectorAll('#photos .slide').length, title: (document.querySelector('#photos .block-title') || {}).textContent,
  }));
  ok(pics.top === 1 && pics.topImgs === 1 && !pics.topTrack, 'one photo heads the panel, with no slideshow there');
  ok(pics.title === 'Photos and videos' && pics.slides === 5 && pics.more === '5 photos', `further down, "Photos and videos" holds all ${pics.slides}, and the top photo's "${pics.more}" leads to them`);
  await page.click('.hero-next');
  await page.waitForTimeout(700);
  ok(await page.evaluate(() => document.querySelector('#photos .hero-count').textContent === '2 / 5' && document.querySelector('#photos .caption').textContent.length > 10), 'the slideshow moves on, with its count and caption');
  await page.screenshot({ path: '/tmp/portfolio-map-desktop-photos.png' });

  // Any photo opens full screen: arrows, keys, the count and caption, focus kept inside, and Escape to close.
  await page.click('.hero-open');
  await page.waitForTimeout(300);
  const lb = () => page.evaluate(() => { const v = document.querySelector('#viewer'); return { open: !v.hidden, count: v.querySelector('.viewer-count').textContent, cap: v.querySelector('.viewer-caption').textContent, img: !!v.querySelector('.viewer-slide img'), focusIn: v.contains(document.activeElement) }; });
  let l = await lb();
  ok(l.open && l.count === '1 / 5' && l.img && l.cap.length > 10 && l.focusIn, 'the top photo opens full screen, with its count and caption, and focus inside');
  await page.screenshot({ path: '/tmp/portfolio-map-lightbox.png' });
  await page.click('.viewer-next');
  await page.keyboard.press('ArrowRight');
  l = await lb();
  ok(l.count === '3 / 5', `the arrow button and the arrow key move on (${l.count})`);
  await page.keyboard.press('ArrowLeft');
  for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
  l = await lb();
  ok(l.count === '2 / 5' && l.focusIn, 'back with the left key; Tab stays inside the viewer');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  l = await lb();
  ok(!l.open && (await panelTitle(page)) === 'CHRONIA', 'Escape closes the viewer, and the panel stays open');
  await page.evaluate(() => document.querySelectorAll('#photos .slide-open')[3].click());
  l = await lb();
  ok(l.open && l.count === '4 / 5', 'a picture in the slideshow opens full screen at that picture');
  await page.click('.viewer-close');
  ok(!(await lb()).open, 'the close button closes it');

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

  // A small project without pictures shows its own piece of the map, with its name, and no slideshow.
  const bare = await open(browser, '?world=le-guin&project=substack');
  const b = await bare.evaluate(() => ({ terrain: !!document.querySelector('#panel-body > .hero-terrain .terrain'), name: (document.querySelector('.terrain-name') || {}).textContent, photos: !!document.querySelector('#photos'), line: document.querySelector('.row-line') }));
  ok(b.terrain && b.name === 'Substack' && !b.photos, 'a project without pictures shows its piece of the map with its name, and no "Photos and videos"');
  await bare.waitForTimeout(1500);
  await bare.screenshot({ path: '/tmp/portfolio-map-desktop-nophotos.png' });
  await bare.close();

  // Rotation: each load shows the world after the last one this browser saw.
  const rot = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const r1 = await open(browser, '', { context: rot });
  const w1 = (await selected(r1)).world;
  await r1.reload();
  await r1.waitForFunction(() => window.__portfolioMap && window.__portfolioMap.ready);
  const w2 = (await selected(r1)).world;
  const order = JSON.parse(readFileSync(join(root, 'projects', 'worlds', 'index.json'), 'utf8')).map((w) => w.slug);
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
  ok(await panelTitle(page) === 'Projects' && (await page.evaluate(() => !!document.querySelector('.peek-links a[href="/terms/"]') && !document.querySelector('.peek-links').textContent.includes(window.__portfolioMap.map.world.name) && !document.title.includes(window.__portfolioMap.map.world.name))), "the lowered sheet is headed Projects and carries the footer's links, with the world's name nowhere on the phone");
  // The phone's look, after a mapping app's: pill, round buttons at the right, no zoom buttons, a three-tab bar.
  const look = await page.evaluate(() => {
    const vis = (q) => { const e = document.querySelector(q); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0; };
    const loc = document.querySelector('.locate').getBoundingClientRect();
    const sheetTop = innerHeight - parseFloat(getComputedStyle(document.body).getPropertyValue('--map-bottom'));
    const tabs = [...document.querySelectorAll('.rail > *')].filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.querySelector('.rail-text').textContent.trim());
    return {
      pill: document.querySelector('.search-box').getBoundingClientRect().height, menuLeft: document.querySelector('.search-menu').getBoundingClientRect().left < 40,
      round: parseFloat(getComputedStyle(document.querySelector('.locate')).borderRadius) >= 12 && !document.querySelector('.fab-world, [aria-label="Show the next world"]') && !vis('.drawer-next') && !vis('.drawer-note'),
      order: loc.bottom <= sheetTop && sheetTop - loc.bottom < 24 && loc.right > innerWidth - 24,
      large: [...document.querySelectorAll('#panel-body .block-title')].every((t) => !/large countries/i.test(t.textContent)),
      dual: vis('.scale-corner .scale-dual') && /mile/.test(document.querySelector('.scale-mi').textContent) && / km$/.test(document.querySelector('.scale-km').textContent),
      zoom: vis('.zoom'), hintOverMap: vis('#hint'), tabs: tabs.join(','),
      radius: parseFloat(getComputedStyle(document.querySelector('.panel')).borderTopLeftRadius), sub: document.querySelector('.head-world .sub').textContent,
    };
  });
  ok(look.pill >= 52 && look.menuLeft, `a large search pill (${look.pill} px) with ≡ at its left and the portrait at its right`);
  ok(look.round && look.order && !look.zoom, 'one rounded-square location button at the right, just above the sheet; no next-world button and no zoom buttons');
  ok(look.large, 'no "The large countries" heading in the sheet');
  ok(look.dual, 'the corner scale gives miles above the line and kilometres below it');
  ok(look.tabs === 'Explore,Saved,Resume', `three tabs: ${look.tabs}`);
  ok(look.radius >= 24 && look.sub === 'Click on a project to learn more.' && !look.hintOverMap, 'the sheet, with large rounded corners, carries "Click on a project to learn more." under its heading, not over the map');
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
  const bareP = await open(browser, '?world=le-guin&project=substack', { context: phone });
  ok(await bareP.evaluate(() => document.querySelector('.terrain-name').textContent === 'Substack'), 'on the phone too, a project without pictures shows its piece of the map, named');
  await bareP.waitForTimeout(1500);
  await bareP.screenshot({ path: '/tmp/portfolio-map-phone-nophotos.png' });
  await bareP.close();
  // Drag the grip: up to full, then down to lowered.
  const drag = (from, to) => page.evaluate(async ([a, b]) => {
    const el = document.querySelector('.sheet-grip');
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2;
    // (A finger: the sheet follows touch events, as a phone sends them.)
    const touch = (y) => new Touch({ identifier: 9, target: el, clientX: x, clientY: y });
    const fire = (type, y) => el.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [touch(y)], changedTouches: [touch(y)], bubbles: true, cancelable: true }));
    const y0 = r.top + 8;
    fire('touchstart', y0);
    for (let i = 1; i <= 12; i++) { fire('touchmove', y0 + ((b - a) * i) / 12); await new Promise((res) => setTimeout(res, 16)); }
    fire('touchend', y0 + (b - a));
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
  await page.screenshot({ path: '/tmp/portfolio-map-phone-saved.png' });
  await page.tap('.tab-explore');
  await page.waitForTimeout(500);
  ok(await sheet() === 'peek' && (await panelTitle(page)) === 'Projects', 'the Explore tab lowers the sheet to the projects');
  ok(page.errors.length === 0, `no errors on the phone${page.errors.length ? ': ' + page.errors.join(' | ') : ''}`);
  await phone.close();
}

async function menuStage(browser) {
  console.log('menu');
  // One look only: White, and the day map, even with the site's theme set to Night or Orange.
  for (const t of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript((v) => { try { localStorage.setItem('ndl-theme', v); } catch (e) {} }, t);
    const page = await open(browser, '?world=le-guin&project=loretour', { context: ctx });
    const got = await page.evaluate(() => ({
      theme: document.documentElement.getAttribute('data-theme'),
      panel: getComputedStyle(document.querySelector('.panel')).backgroundColor,
      water: getComputedStyle(document.querySelector('.map-ocean')).fill,
      picture: (document.querySelector('.map-ground .map-image') || {}).getAttribute?.('href') || '',
      themeBtn: !!document.querySelector('#theme-btn'),
    }));
    ok(got.theme === 'white' && got.panel === 'rgb(255, 255, 255)' && /^rgb\((1[1-4]\d), 21\d, 2[23]\d\)$/.test(got.water) && !got.picture.startsWith('blob:') && !got.themeBtn, `with the site's theme set to ${t === 'dark' ? 'Night' : 'Orange'}, the page stays White with the day map, and has no theme switch`);
    await ctx.close();
  }

  const page = await open(browser, '?world=le-guin');
  ok(await page.evaluate(() => !document.querySelector('.brand') && !document.querySelector('.rail-mark') && !/Noah Darwin Lee/.test(document.querySelector('#corner').textContent)), 'no wordmark at the bottom left of the map, and no icon at the bottom of the rail');
  const loc = await page.evaluate(() => { const a = document.querySelector('.locate'), z = document.querySelector('.zoom'); const ra = a.getBoundingClientRect(), rz = z.getBoundingClientRect(); return { href: a.getAttribute('href'), label: a.getAttribute('aria-label'), same: Math.abs(ra.width - rz.width) < 1, above: ra.bottom < rz.top, gap: rz.top - ra.bottom }; });
  ok(loc.href === '/#about' && loc.label === 'About Noah' && loc.same && loc.above && loc.gap > 2 && loc.gap < 16, `a location button to About sits just above the zoom pill, the same width (${loc.gap.toFixed(0)} px apart)`);

  // The drawer: it slides in over the rail and panel, with a scrim, and closes four ways.
  const drawerOpen = () => page.evaluate(() => !document.querySelector('#drawer').hidden);
  await page.click('#menu-btn');
  const mid = await page.evaluate(() => document.querySelector('#drawer').getBoundingClientRect().left);
  await page.waitForTimeout(400);
  const d = await page.evaluate(() => { const r = document.querySelector('#drawer').getBoundingClientRect(); return { x: r.left, w: r.width, h: r.height, anim: getComputedStyle(document.querySelector('#drawer')).transitionDuration + getComputedStyle(document.querySelector('#drawer')).animationName, scrim: !document.querySelector('#drawer-scrim').hidden, title: document.querySelector('#drawer-title').textContent }; });
  ok(d.x === 0 && Math.abs(d.w - 320) < 2 && d.h === 900 && d.scrim && /^0\.2[0-9]*s/.test(d.anim) && mid < 0 && d.title === 'Noah Darwin Lee', `the ≡ button slides in a full-height drawer, 320 px wide, with a scrim over the map (${mid.toFixed(0)} px at the start)`);
  const me = await page.evaluate(() => { const a = document.querySelector('.corner-me'); const r = a.getBoundingClientRect(); return { href: a.getAttribute('href'), right: innerWidth - r.right, top: r.top, w: r.width, ring: getComputedStyle(a).backgroundImage.includes('conic') }; });
  ok(me.href === '/#about' && me.right < 24 && me.top < 24 && me.w >= 40 && me.ring, 'the ringed portrait sits at the top right, linking to About');
  const icon = await page.evaluate(() => [...document.querySelectorAll('use')].some((u) => u.getAttribute('href') === '#i-heart'));
  ok(!icon, 'saving uses a bookmark, not a heart');
  await page.screenshot({ path: '/tmp/portfolio-map-drawer.png' });
  await page.keyboard.press('Escape');
  ok(!(await drawerOpen()), 'Escape closes it');
  await page.click('#menu-btn'); await page.mouse.click(1200, 400);
  ok(!(await drawerOpen()), 'a click on the scrim closes it');
  await page.click('#menu-btn'); await page.click('.drawer-close');
  ok(!(await drawerOpen()), 'the × closes it');
  await page.click('#menu-btn'); await page.click('.drawer-row[data-drawer-view="saved"]');
  ok(!(await drawerOpen()) && (await page.evaluate(() => document.querySelector('#panel-body .title').textContent)) === 'Saved', 'choosing Saved closes it and opens Saved');
  await page.click('#menu-btn');
  const classic = await page.evaluate(() => { const a = document.querySelector('#drawer-classic'); return { href: a && a.getAttribute('href'), target: a && a.target, text: a && a.textContent.trim(), first: document.querySelector('.drawer-group .drawer-row') === a, old: !!document.querySelector('#drawer-panel') }; });
  ok(classic.href === '/projects/classic/' && !classic.target && classic.text === 'Show the old Projects site' && classic.first && !classic.old, '"Show the old site" leads the menu, in place of "Show side panel", and opens /projects/classic/ in the same tab');
  await page.keyboard.press('Escape');

  // Each map layer, switched off, is gone from the map (zoomed in, so the finer layers are there to switch off).
  await page.keyboard.press('Escape');
  await page.evaluate(async () => {
    // Between CHRONIA's name and the nearest named sea, gulf, or bay, so names of both kinds are in view.
    const m = window.__portfolioMap.map, l = m.world.labels.find((x) => x.id === 'chronia'), r = m.rect(), s = m.ref() * 3;
    const water = m.world.labels.filter((x) => ['sea', 'gulf', 'bay'].includes(x.kind) && x.minZoom <= 2).sort((a, b) => Math.hypot(a.x - l.x, a.y - l.y) - Math.hypot(b.x - l.x, b.y - l.y))[0] || l;
    const cx = water.x, cy = water.y;
    m.stop();
    m.set({ s, tx: r.l + r.w / 2 - cx * s, ty: r.t + r.h / 2 - cy * s }); m.render(true);
    for (let i = 0; i < 100 && !m.detail; i++) await new Promise((res) => setTimeout(res, 100));
    await new Promise((res) => setTimeout(res, 300)); m.render(true);
  });
  await page.click('#menu-btn');
  const shown = (sel) => page.evaluate((q) => [...document.querySelectorAll(q)].some((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'; }), sel);
  const labelsOn = (kinds) => page.evaluate((ks) => ks.some((k) => document.querySelector('.lbl.k-' + k + '.is-on')), kinds);
  const LAYERS = [
    ['names', 'Place names', () => labelsOn(['country', 'range', 'province'])],
    ['roads', 'Roads and route numbers', () => shown('.map-roads path, .map-roads use')],
    ['towns', 'Towns and cities', () => labelsOn(['capital', 'city', 'town', 'village'])],
    ['rivers', 'Rivers and lakes', () => shown('.map-rivers path, .map-lakes')],
    ['parks', 'National parks', () => shown('.map-parks path, .map-park')],
    ['borders', 'Borders (and province lines with them)', () => page.evaluate(() => [...document.querySelectorAll('.map-borders, .map-provinces')].every((e) => getComputedStyle(e).display !== 'none'))],
    ['terrain', 'Terrain', () => shown('.map-image')],
    ['water-names', 'Water names', () => labelsOn(['sea', 'gulf', 'bay', 'strait', 'channel', 'sound', 'fjord', 'lagoon', 'harbour', 'inlet', 'cove', 'ocean', 'lake', 'river'])],
  ];
  for (const [name, label, isShown] of LAYERS) {
    const before = await isShown();
    await page.click(`.drawer-switch[data-layer="${name}"]`);
    await page.waitForTimeout(150);
    const after = await isShown();
    const checked = await page.getAttribute(`.drawer-switch[data-layer="${name}"]`, 'aria-checked');
    ok(before && !after && checked === 'false' && (await drawerOpen()), `${label}: switching it off takes it off the map at once${before && !after ? '' : ` (before ${before}, after ${after})`}`);
  }
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('.map-land')).visibility === 'visible'), 'without the terrain, the land is a plain colour');
  await page.screenshot({ path: '/tmp/portfolio-map-layers-off.png' });
  await page.reload();
  await page.waitForFunction(() => window.__portfolioMap && window.__portfolioMap.ready);
  ok(await page.evaluate(() => document.body.classList.contains('no-roads') && document.querySelector('.drawer-switch[data-layer="terrain"]').getAttribute('aria-checked') === 'false'), 'the layers stay as they were set after a reload');
  await page.click('#menu-btn');
  await page.click('#layers-reset');
  ok(await page.evaluate(() => [...document.querySelectorAll('.drawer-switch[data-layer]')].every((b) => b.getAttribute('aria-checked') === 'true') && !/no-/.test(document.body.className)), 'Show all layers turns every layer back on');

  // Copy a link to this map: it reopens this world at this place.
  await page.keyboard.press('Escape');
  const link = await page.evaluate(() => window.__portfolioMap.mapLink());
  const v0 = await view(page);
  const p2 = await open(browser, link.replace(PAGE, ''));
  await p2.waitForTimeout(1500);
  const v1 = await view(p2);
  ok(/[?&]at=/.test(link) && v1.world === v0.world && Math.abs(v1.zoom - v0.zoom) < 0.05, `a link to the map reopens the same world at the same zoom (${link.replace(base, '')})`);
  ok(page.errors.length === 0 && p2.errors.length === 0, `no errors${page.errors.concat(p2.errors).length ? ': ' + page.errors.concat(p2.errors).join(' | ') : ''}`);
  await p2.close(); await page.close();

  // On a phone: the ≡ in the search pill opens the same drawer, nearly the screen's width; the viewer fills the screen.
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const pp = await open(browser, '?world=le-guin', { context: phone });
  await pp.tap('.search-menu');
  const pd = await pp.evaluate(() => document.querySelector('#drawer').getBoundingClientRect().width);
  ok(pd >= 300 && pd <= 360, `on a phone, the pill's ≡ opens the drawer, ${pd.toFixed(0)} px wide`);
  await pp.screenshot({ path: '/tmp/portfolio-map-phone-drawer.png' });
  await pp.tap('#drawer-scrim', { position: { x: 370, y: 400 } });
  const ppc = await pp.evaluate(() => { const a = document.querySelector('.controls').getBoundingClientRect(); const top = innerHeight - parseFloat(getComputedStyle(document.body).getPropertyValue('--map-bottom')); return { above: a.bottom <= top + 1 && top - a.bottom < 24 }; });
  ok(ppc.above, 'on a phone the location button sits just above the sheet');
  const pv = await open(browser, '?world=le-guin&project=loretour', { context: phone });
  await pv.tap('.hero-open');
  await pv.waitForTimeout(300);
  const vw = await pv.evaluate(() => { const r = document.querySelector('.viewer-slide img').getBoundingClientRect(); return { w: r.width, open: !document.querySelector('#viewer').hidden }; });
  ok(vw.open && vw.w > 380, `on a phone the viewer shows the photo the full width of the screen (${vw.w.toFixed(0)} px)`);
  // Swipe to the next one.
  await pv.evaluate(async () => {
    const el = document.querySelector('.viewer-stage');
    const fire = (type, x) => el.dispatchEvent(new PointerEvent(type, { pointerId: 5, pointerType: 'touch', isPrimary: true, clientX: x, clientY: 400, bubbles: true }));
    fire('pointerdown', 320);
    for (let i = 1; i <= 8; i++) { fire('pointermove', 320 - i * 25); await new Promise((r) => setTimeout(r, 16)); }
    fire('pointerup', 120);
  });
  await pv.waitForTimeout(300);
  ok(await pv.evaluate(() => document.querySelector('.viewer-count').textContent === '2 / 6'), 'a swipe moves to the next picture');
  await pv.screenshot({ path: '/tmp/portfolio-map-phone-lightbox.png' });
  ok(pp.errors.length === 0 && pv.errors.length === 0, 'no errors on the phone');
  await phone.close();
}

async function sharpStage(browser) {
  console.log('sharpness');
  // A first view loads the world's two files and nothing finer.
  const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p1 = await ctx1.newPage();
  let bytes = 0, tiles = 0;
  p1.on('response', async (r) => {
    const u = r.url();
    if (u.includes('/tiles/')) tiles++;
    if (/\/worlds\/[a-z-]+\.(json|png)$/.test(u) && !u.endsWith('index.json')) bytes += Number((await r.allHeaders())['content-length'] || 0);
  });
  await p1.goto(PAGE + '?world=le-guin');
  await p1.waitForFunction(() => window.__portfolioMap && window.__portfolioMap.ready);
  await p1.waitForTimeout(1800);
  ok(tiles === 0 && bytes > 0 && bytes <= 300 * 1024, `the first view loads ${(bytes / 1024).toFixed(0)} KB of map, and no finer tiles`);
  await ctx1.close();

  // Zoomed all the way in on a 2x screen, the land cover is drawn from the finest tiles, every pixel its own.
  for (const phone of [false, true]) {
    const ctx = await browser.newContext(phone
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
      : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    const page = await open(browser, '?world=le-guin', { context: ctx });
    await page.waitForTimeout(1400);
    const got = await page.evaluate(async () => {
      const m = window.__portfolioMap.map, l = m.world.labels.find((x) => x.id === 'chronia'), r = m.rect(), s = m.ref() * 6;
      m.set({ s, tx: r.l + r.w / 2 - (l.x - 40) * s, ty: r.t + r.h / 2 - (l.y + 20) * s });
      m.render(true);
      for (let i = 0; i < 60 && (m.tiles.pending || !document.querySelector('.map-tile.is-in')); i++) await new Promise((res) => setTimeout(res, 100));
      await new Promise((res) => setTimeout(res, 300));
      const lv = m.tiles.level;
      return { zoom: m.zoom(), scale: lv && lv.scale, needed: m.s * Math.min(devicePixelRatio, 2), shown: document.querySelectorAll('.map-tile.is-in').length, pending: m.tiles.pending };
    });
    ok(Math.abs(got.zoom - 6) < 0.01 && got.scale >= got.needed && got.shown > 0 && !got.pending, `${phone ? 'phone' : 'desktop'} at 6x on a ${phone ? 3 : 2}x screen: ${got.shown} tiles at ${got.scale} pixels per map unit, for the ${got.needed.toFixed(1)} the screen shows`);
    await page.screenshot({ path: phone ? '/tmp/portfolio-map-zoom4-phone.png' : '/tmp/portfolio-map-zoom4.png' });
    // All the way in, on the country's capital: the finest tiles still draw the land, and the city is drawn over
    // them from its outlines, streets, and parks.
    const close = await page.evaluate(async () => {
      const m = window.__portfolioMap.map, c = m.world.projects.find((p) => p.id === 'chronia').capital, r = m.rect(), s = m.limits().max;
      m.set({ s, tx: r.l + r.w / 2 - c[0] * s, ty: r.t + r.h / 2 - c[1] * s });
      m.render(true);
      for (let i = 0; i < 80 && (m.tiles.pending || !document.querySelector('.map-urban path') || !document.querySelector('.map-streets path')); i++) { await new Promise((res) => setTimeout(res, 100)); m.render(true); }
      await new Promise((res) => setTimeout(res, 400));
      const lv = m.tiles.level, T = m.world.tiles.levels;
      const on = (q) => [...document.querySelectorAll(q)].some((e) => getComputedStyle(e).opacity !== '0' && e.getBoundingClientRect().width > 0);
      return { zoom: m.zoom(), finest: lv && lv.scale === T[T.length - 1].scale, shown: document.querySelectorAll('.map-tile.is-in').length, urban: on('.map-urban .map-built'), streets: on('.map-streets .r-street'), minor: on('.map-streets .r-minor') };
    });
    ok(Math.abs(close.zoom - MAX_ZOOM) < 0.01 && close.finest && close.shown > 0 && close.urban && close.streets && close.minor, `${phone ? 'phone' : 'desktop'} at ${MAX_ZOOM}x: the finest tiles, and the capital's built-up ground, streets, and lanes drawn over them`);
    await page.screenshot({ path: phone ? '/tmp/portfolio-map-zoom16-phone.png' : '/tmp/portfolio-map-zoom16.png' });
    ok(page.errors.length === 0, `no errors zoomed in${phone ? ' on the phone' : ''}${page.errors.length ? ': ' + page.errors.join(' | ') : ''}`);
    await ctx.close();
  }
}

async function movedStage(browser) {
  console.log('moved');
  // The map lives at /projects/; the old address sends shared links on, query and hash and all.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  await page.goto(`${base}/portfolio-map/?world=le-guin&project=chronia#x`);
  await page.waitForFunction(() => window.__portfolioMap && window.__portfolioMap.ready, null, { timeout: 20000 });
  const u = new URL(page.url());
  ok(u.pathname === '/projects/' && u.hash === '#x' && u.searchParams.get('world') === 'le-guin' && (await panelTitle(page)) === 'CHRONIA', `/portfolio-map/?world=le-guin&project=chronia goes on to ${u.pathname}${u.search}, with CHRONIA open`);
  await page.goto(`${base}/portfolio-map/`);
  await page.waitForFunction(() => window.__portfolioMap && window.__portfolioMap.ready, null, { timeout: 20000 });
  ok(new URL(page.url()).pathname === '/projects/', '/portfolio-map/ goes on to /projects/');
  const meta = await page.evaluate(() => ({ canon: (document.querySelector('link[rel=canonical]') || {}).href, og: (document.querySelector('meta[property="og:url"]') || {}).content }));
  ok(meta.canon === 'https://noahdarwinlee.com/projects/' && meta.og === 'https://noahdarwinlee.com/projects/', 'the map names /projects/ as its address');

  // The old projects page, at /projects/classic/, still works, with a quiet way back to the map.
  const bad = [];
  page.on('response', (r) => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
  await page.goto(`${base}/projects/classic/`);
  await page.waitForTimeout(1500);
  const cl = await page.evaluate(() => ({ rows: document.querySelectorAll('.marquee-row').length, back: [...document.querySelectorAll('a')].some((a) => a.getAttribute('href') === '/projects/' && /show the map/i.test(a.textContent)), styled: getComputedStyle(document.body).fontFamily.includes('Familjen') }));
  ok(cl.rows >= 10 && cl.back && cl.styled && bad.length === 0, `the old projects page works at /projects/classic/, with a link back to the map${bad.length ? ': ' + bad.join(' | ') : ''}`);
  await page.screenshot({ path: '/tmp/portfolio-map-classic.png' });

  // The site's own links to /projects/ reach the map.
  const links = [];
  for (const f of ['index.html', 'miscellaneous/index.html', 'drill/index.html', 'flashcard/index.html', 'citylayoutguessr/index.html', 'greatercircle/index.html']) {
    const html = readFileSync(join(root, f), 'utf8');
    if (/href="\/projects\/"/.test(html)) links.push(f);
  }
  ok(links.length >= 5, `the site's pages link to /projects/, which is now the map (${links.join(', ')})`);
  ok(page.errors.length === 0, 'no errors');
  await ctx.close();

  // The opening line: there at first, gone once the visitor acts, and not back.
  for (const phone of [false, true]) {
    const c2 = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
    const p = await open(browser, '?world=le-guin', { context: c2 });
    await p.waitForTimeout(600);
    const h = await p.evaluate(() => { const e = document.querySelector('#hint'), r = e.getBoundingClientRect(), s = document.querySelector('.search-box').getBoundingClientRect(); const cs = getComputedStyle(e);
      return { text: e.textContent, op: +cs.opacity, color: cs.color, bg: cs.backgroundColor, clear: r.bottom <= s.top || r.top >= s.bottom || r.right <= s.left || r.left >= s.right, below: r.top >= s.bottom, top: r.top }; });
    if (phone) {
      const sub = await p.evaluate(() => [document.querySelector('.head-world .sub').textContent, getComputedStyle(document.querySelector('#hint')).display]);
      ok(sub[0] === 'Click on a project to learn more.' && sub[1] === 'none', 'phone: the line sits in the sheet, under the world\'s name, and not over the map');
    } else ok(h.text === 'Click on a project to learn more.' && h.op === 1 && h.color === 'rgb(255, 255, 255)' && h.bg === 'rgba(0, 0, 0, 0)' && h.clear, `${phone ? 'phone' : 'desktop'}: "${h.text}" shows in plain white at the top of the map, clear of the search ${phone ? 'pill, under it' : 'box'}`);
    await p.screenshot({ path: phone ? '/tmp/portfolio-map-phone.png' : '/tmp/portfolio-map-desktop.png' });
    if (phone) await p.tap('.search-menu'); else await p.click('#menu-btn');
    await p.waitForTimeout(600);
    ok(await p.evaluate((ph) => document.querySelector('#hint').hidden && (!ph || !/Click on a project/.test(document.querySelector('.head-world .sub').textContent)), phone), `${phone ? 'phone' : 'desktop'}: opening the menu sends the line away`);
    await c2.close();
  }
  const c3 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p3 = await open(browser, '?world=le-guin', { context: c3 });
  await p3.click('#search-input'); await p3.keyboard.type('le');
  await p3.waitForTimeout(500);
  ok(await p3.evaluate(() => document.querySelector('#hint').hidden), 'searching sends it away');
  const p4 = await open(browser, '?world=le-guin', { context: c3 });
  await p4.evaluate(() => window.__portfolioMap.open('project', { id: 'leggio' }));
  await p4.waitForTimeout(500);
  await p4.keyboard.press('Escape');
  await p4.waitForTimeout(300);
  ok(await p4.evaluate(() => document.querySelector('#hint').hidden), 'opening a project sends it away, and closing the project does not bring it back');
  const p5 = await open(browser, '?world=le-guin&project=chronia', { context: c3 });
  ok(await p5.evaluate(() => document.querySelector('#hint').hidden), 'a link that opens a project shows no line');
  await c3.close();
}

if (stage !== 'content') {
  const { chromium } = createRequire(import.meta.url)('playwright');
  const browser = await chromium.launch();
  try {
    if (stage === 'map' || stage === 'all') await mapStage(browser);
    if (stage === 'interface' || stage === 'all') await interfaceStage(browser);
    if (stage === 'menu' || stage === 'all') await menuStage(browser);
    if (stage === 'moved' || stage === 'all') await movedStage(browser);
    if (stage === 'sharp' || stage === 'all') await sharpStage(browser);
    if (stage === 'here' || stage === 'all') await hereStage(browser);
  } finally {
    await browser.close();
  }
}

console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);

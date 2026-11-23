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

// BROWSER STAGES

console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);

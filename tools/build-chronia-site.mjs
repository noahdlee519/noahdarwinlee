// Builds chroniaatlas.com: CHRONIA at the root of its own site, with what it borrows from the rest of
// noahdarwinlee.com (UCHRONIA's data and scripts, the fonts, the site's stylesheet and scripts, and the
// icons); its own pages (team, reports, privacy, and terms) are in chronia/ with it. Vercel runs it on every
// push (vercel.json); it can be run by hand too: node tools/build-chronia-site.mjs [output folder, default chronia-site].
//
// The pages are copied as they are, then their links are fixed for the new site: a link into /chronia/
// loses that prefix, the canonical and og:url addresses move to chroniaatlas.com, and a link to a page
// of noahdarwinlee.com that is not on this site (UCHRONIA, the game, the front page) goes there.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, process.argv[2] || "chronia-site");
const SITE = "https://chroniaatlas.com", HOME = "https://noahdarwinlee.com";

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const copy = (from, to = from) => {
  const src = join(root, from);
  if (!existsSync(src)) throw new Error("missing " + from);
  cpSync(src, join(out, to), { recursive: true });
};

for (const f of ["index.html", "app.js", "dev.js", "va.js", "app.css", "page.css", "go.js", "visit.js", "data", "team", "reports", "privacy", "terms", "moreinfo", "art"]) copy("chronia/" + f, f);
for (const f of ["uchronia/data", "uchronia/vendor", "uchronia/sat.js", "fonts"]) copy(f);
for (const f of ["styles.css", "favicon.png", "favicon-32.png", "favicon-night.png", "favicon-white.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "og.jpg"]) copy(f);

// Every data file the page fetches carries a hash of the whole data folder, so a cached file from an older build is never
// read with a newer one (the polity numbers change between builds).
{
  const h = createHash("sha256"), files = [];
  const list = (dir) => { for (const n of readdirSync(dir).sort()) { const f = join(dir, n); if (statSync(f).isDirectory()) list(f); else files.push(f); } };
  list(join(out, "data"));
  for (const f of files) h.update(relative(out, f)).update(readFileSync(f));
  const app = join(out, "app.js"), src = readFileSync(app, "utf8"), stamp = 'var DATA_V = "";';
  if (!src.includes(stamp)) throw new Error("app.js has no " + stamp);
  const v = h.digest("hex").slice(0, 12);
  writeFileSync(app, src.replace(stamp, 'var DATA_V = "' + v + '";'));
  // The data files the page always needs are preloaded from its head, so they download beside the scripts; their links
  // carry the same stamp, or the browser would fetch each twice.
  const page = join(out, "index.html"), head = readFileSync(page, "utf8"), pre = /(<link rel="preload" as="fetch" crossorigin href="data\/[^"?]+)"/g;
  if (!pre.test(head)) throw new Error("index.html has no data preloads");
  writeFileSync(page, head.replace(pre, '$1?v=' + v + '"'));
}
{
  const MINIFY = ["app.js", "dev.js"], NOTICE = "/*! \u00a9 2026 Noah Darwin Lee. All rights reserved. https://chroniaatlas.com/terms/ */";
  let terser = null;
  try { terser = await import("terser"); } catch (e) { if (process.env.VERCEL) throw new Error("terser is not installed (npm ci installs it)"); }
  if (terser) {
    for (const f of MINIFY) {
      const p = join(out, f), r = await terser.minify(readFileSync(p, "utf8"), { ecma: 2020, compress: { passes: 2 }, mangle: true, format: { comments: false, preamble: NOTICE } });
      writeFileSync(p, r.code + "\n");
    }
  } else console.log("terser is not installed, so " + MINIFY.join(" and ") + " are copied as they are");
}
writeFileSync(join(out, "manifest.json"), JSON.stringify({
  name: "CHRONIA",
  short_name: "CHRONIA",
  description: "An atlas of the world's borders from 3400 BC to today.",
  start_url: "/",
  display: "browser",
  background_color: "#f1e7cf",
  theme_color: "#f1e7cf",
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
  ],
}, null, 2) + "\n");
const AI_BOTS = ["GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-Web", "anthropic-ai", "Google-Extended", "Applebot-Extended", "meta-externalagent", "CCBot", "PerplexityBot", "Perplexity-User", "Bytespider", "Amazonbot", "DuckAssistBot", "Diffbot"];
writeFileSync(join(out, "robots.txt"), "User-agent: *\nDisallow: /reports/\n\n" + AI_BOTS.map((b) => "User-agent: " + b + "\nDisallow: /\n\n").join("") + "Sitemap: " + SITE + "/sitemap.xml\n");
const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(out, "sitemap.xml"), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  [["/", "1.0"], ["/team/", "0.4"], ["/privacy/", "0.2"], ["/terms/", "0.2"]].map(([p, w]) => "  <url><loc>" + SITE + p + "</loc><lastmod>" + today + "</lastmod><priority>" + w + "</priority></url>\n").join("") + "</urlset>\n");

// Whether a path is a page or file of the new site.
const here = (path) => {
  const p = path.replace(/[?#].*$/, "");
  if (p === "/") return true;
  const f = join(out, decodeURIComponent(p));
  if (!f.startsWith(out)) return false;
  if (existsSync(f) && statSync(f).isFile()) return true;
  return existsSync(join(f, "index.html"));
};
const html = [];
const walk = (dir) => { for (const n of readdirSync(dir)) { const f = join(dir, n); if (statSync(f).isDirectory()) { if (n !== "data" && n !== "uchronia" && n !== "fonts") walk(f); } else if (n.endsWith(".html")) html.push(f); } };
walk(out);
let fixed = 0;
for (const f of html) {
  const page = "/" + relative(out, f).replace(/index\.html$/, "");
  let s = readFileSync(f, "utf8");
  const before = s;
  s = s.replace(/https:\/\/noahdarwinlee\.com\/chronia\//g, SITE + "/");
  s = s.replace(/(<link rel="canonical" href="|<meta property="og:url" content=")https:\/\/noahdarwinlee\.com(\/[^"]*)"/g, (m, a, p) => (here(p) ? a + SITE + p + '"' : m));
  s = s.replace(/(\s(?:href|src)=")(\/[^"/][^"]*|\/)"/g, (m, a, p) => {
    if (p.startsWith("/chronia/")) return a + p.slice(8) + '"';
    if (p === "/" || p.startsWith("/#")) return a + (page === "/" ? p : HOME + p) + '"';
    return a + (here(p) ? p : HOME + p) + '"';
  });
  s = s.replace(/<meta property="og:site_name" content="Noah Darwin Lee" \/>/, '<meta property="og:site_name" content="CHRONIA" />');
  if (s !== before) { writeFileSync(f, s); fixed++; }
}
const size = (dir) => readdirSync(dir).reduce((t, n) => { const f = join(dir, n); const st = statSync(f); return t + (st.isDirectory() ? size(f) : st.size); }, 0);
console.log("chroniaatlas.com: " + html.length + " pages (" + fixed + " with links fixed), " + Math.round(size(out) / 1e6) + " MB, in " + relative(root, out));

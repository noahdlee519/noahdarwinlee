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

for (const f of ["index.html", "app.js", "app.css", "page.css", "go.js", "data", "team", "reports", "privacy", "terms", "art"]) copy("chronia/" + f, f);
for (const f of ["uchronia/data", "uchronia/vendor", "uchronia/sat.js", "fonts"]) copy(f);
for (const f of ["styles.css", "visit.js", "favicon.png", "favicon-32.png", "favicon-night.png", "favicon-white.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "og.jpg"]) copy(f);

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
writeFileSync(join(out, "robots.txt"), "User-agent: *\nDisallow: /reports/\n\nSitemap: " + SITE + "/sitemap.xml\n");
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

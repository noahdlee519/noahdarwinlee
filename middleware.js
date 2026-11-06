import { next } from "@vercel/functions";
import { WHEN_RE, readWhen } from "./api/_lib/when.mjs";

export const config = { matcher: "/" };

const PREVIEWERS = /facebookexternalhit|facebot|twitterbot|slackbot|discordbot|whatsapp|telegrambot|linkedinbot|embedly|pinterest|redditbot|applebot|skypeuripreview|vkshare|mastodon|bluesky|cardyb|iframely|tumblr|snapchat|viber|kakaotalk|googlebot|google-inspectiontool|bingbot|duckduckbot|yandex|petalbot|chatgpt|gptbot|claudebot|perplexity/i;

const attr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function shareParams(url) {
  const y = url.searchParams.get("y") || "", v = url.searchParams.get("v") || "", flat = url.searchParams.get("flat") === "1";
  if (!WHEN_RE.test(y)) return null;
  const view = /^-?\d{1,3}(\.\d+)?,-?\d{1,2}(\.\d+)?,\d{1,2}(\.\d+)?$/.test(v);
  return { y, query: "y=" + y + (view ? "&v=" + v : "") + (flat ? "&flat=1" : "") };
}

export function shareHead(html, origin, p) {
  const when = readWhen(p.y).label, page = origin + "/?" + p.query, image = origin + "/api/og?" + p.query;
  const title = "CHRONIA | " + when, desc = "The world's borders in " + when + ", on CHRONIA, an atlas of every year from 3400 BC to today.";
  const swaps = [
    [/<title>[^<]*<\/title>/, "<title>" + attr(title) + "</title>"],
    [/(<meta\s+name="description"\s+content=")[^"]*(")/, "$1" + attr(desc) + "$2"],
    [/(<meta property="og:title" content=")[^"]*(")/, "$1" + attr(title) + "$2"],
    [/(<meta property="og:description" content=")[^"]*(")/, "$1" + attr(desc) + "$2"],
    [/(<meta property="og:url" content=")[^"]*(")/, "$1" + attr(page) + "$2"],
    [/(<meta property="og:image" content=")[^"]*(")/, "$1" + attr(image) + "$2"],
    [/(<meta name="twitter:image" content=")[^"]*(")/, "$1" + attr(image) + "$2"],
  ];
  for (const [re, to] of swaps) {
    if ((html.match(new RegExp(re.source, "g")) || []).length !== 1) return null;
    html = html.replace(re, to);
  }
  return html.replace(/<meta property="og:image:height" content="630" \/>/, '$&\n    <meta property="og:image:alt" content="' + attr("A map of the world's borders in " + when) + '" />\n    <meta name="twitter:title" content="' + attr(title) + '" />');
}

export default async function middleware(request) {
  const url = new URL(request.url), p = shareParams(url);
  if (!p || !PREVIEWERS.test(request.headers.get("user-agent") || "")) return next();
  try {
    const page = await fetch(new URL("/index.html", url), { headers: { "user-agent": "chronia-share" } });
    if (!page.ok) return next();
    const html = shareHead(await page.text(), url.origin, p);
    if (!html) return next();
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" } });
  } catch (e) {
    return next();
  }
}

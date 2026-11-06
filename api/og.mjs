import { preview } from "./_lib/preview.mjs";

export default async function handler(req, res) {
  const q = new URL(req.url, "https://chroniaatlas.com").searchParams;
  try {
    const r = await preview({ y: q.get("y") || "", v: q.get("v") || "", flat: q.get("flat") || "" });
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800");
    res.setHeader("Content-Length", r.png.length);
    res.statusCode = 200;
    res.end(r.png);
  } catch (e) {
    console.error("og", e);
    res.statusCode = 302;
    res.setHeader("Location", "/og.jpg");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.end();
  }
}

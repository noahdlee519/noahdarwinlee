// CHRONIA's fact checkers' reports. The page posts JSON with an `action`:
//   check  { password }                                  -> { role: "reporter" | "reviewer" }
//   send   { password, reporter, lon, lat, zoom, place, from, to, at, layers, note } -> { id }
//   list   { password (Noah's), status: "open" | "fixed" | "declined" | "all" } -> { reports }
//   set    { password (Noah's), id, status, reply }       -> { report }
// The team's password (CHRONIA_REPORT_PASSWORD) may send; Noah's (CHRONIA_REVIEW_PASSWORD) may also list
// and close reports. Twenty wrong passwords in a day shut a visitor out until the next day.

const ORIGINS = [
  /^https:\/\/(www\.)?chroniaatlas\.com$/,
  /^https:\/\/(www\.)?noahdarwinlee\.com$/,
  /^https:\/\/noahdlee519\.github\.io$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
];
const MAX_BODY = 8000;
const MAX_STRIKES = 20;
const STATUSES = ["open", "fixed", "declined"];
const TIME_RE = /^-?\d{1,4}(-\d{2}(-\d{2})?)?$/;

class Bad extends Error {
  field: string;
  constructor(field: string) {
    super("bad " + field);
    this.field = field;
  }
}

function allowed(origin: string | null) {
  return !!origin && ORIGINS.some((r) => r.test(origin));
}

function cors(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(status: number, body: unknown, origin: string) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

function dbKey(): Record<string, string> {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) {
    try {
      const k = JSON.parse(keys).default;
      if (k) return { apikey: k };
    } catch (_) {}
  }
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return { apikey: legacy, Authorization: "Bearer " + legacy };
}

async function db(path: string, init: RequestInit = {}) {
  const res = await fetch(Deno.env.get("SUPABASE_URL") + "/rest/v1/" + path, {
    ...init,
    headers: { ...dbKey(), "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(path.split("?")[0] + " " + res.status + " " + (await res.text()).slice(0, 200));
  return res.status === 204 ? null : await res.json();
}

function hex(buf: ArrayBuffer, n: number) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, n);
}

async function digest(s: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}

async function same(given: string, secret: string) {
  if (!secret) return false;
  const a = await digest("chronia-report|" + given), b = await digest("chronia-report|" + secret);
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

function clientIp(req: Request) {
  const raw = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || (req.headers.get("x-real-ip") || "").trim();
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(raw)) return raw;
  if (/^[0-9a-f:]{2,39}$/i.test(raw) && raw.includes(":")) return raw.split(":").slice(0, 4).join(":");
  return "unknown";
}

async function visitor(req: Request) {
  const salt = Deno.env.get("CHRONIA_SALT") || dbKey().apikey || "chronia";
  const today = new Date().toISOString().slice(0, 10);
  return "r" + hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + "|report|" + today + "|" + clientIp(req))), 16);
}

function text(v: unknown, field: string, max: number, need = true) {
  if (v === undefined || v === null) v = "";
  if (typeof v !== "string") throw new Bad(field);
  const s = v.normalize("NFC").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
  if ((need && !s) || s.length > max) throw new Bad(field);
  return s;
}

function num(v: unknown, field: string, lo: number, hi: number) {
  if (typeof v !== "number" || !isFinite(v) || v < lo || v > hi) throw new Bad(field);
  return v;
}

async function role(password: string) {
  if (await same(password, Deno.env.get("CHRONIA_REVIEW_PASSWORD") || "")) return "reviewer";
  if (await same(password, Deno.env.get("CHRONIA_REPORT_PASSWORD") || "")) return "reporter";
  return null;
}

export async function handle(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");
  if (!allowed(origin)) return new Response("Forbidden", { status: 403 });
  const o = origin as string;
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(o) });
  if (req.method !== "POST") return json(405, { error: "method" }, o);
  if (!Deno.env.get("CHRONIA_REPORT_PASSWORD") || !Deno.env.get("CHRONIA_REVIEW_PASSWORD")) return json(503, { error: "unset" }, o);

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return json(413, { error: "long" }, o);
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("body");
  } catch (_) {
    return json(400, { error: "body" }, o);
  }

  const who = await visitor(req);
  try {
    if ((await db("rpc/chronia_report_strike", { method: "POST", body: JSON.stringify({ p_who: who, p_add: false }) })) >= MAX_STRIKES) return json(429, { error: "locked" }, o);
  } catch (e) {
    console.error(e);
    return json(500, { error: "store" }, o);
  }
  const password = typeof body.password === "string" ? body.password : "";
  const as = password ? await role(password) : null;
  if (!as) {
    try {
      await db("rpc/chronia_report_strike", { method: "POST", body: JSON.stringify({ p_who: who, p_add: true }) });
    } catch (e) {
      console.error(e);
    }
    await new Promise((r) => setTimeout(r, 700));
    return json(401, { error: "password" }, o);
  }

  try {
    const action = body.action;
    if (action === "check") return json(200, { role: as }, o);
    if (action === "send") {
      const row = {
        reporter: text(body.reporter, "reporter", 80),
        lon: num(body.lon, "lon", -180, 180),
        lat: num(body.lat, "lat", -90, 90),
        zoom: num(body.zoom, "zoom", 0.01, 999),
        place: text(body.place, "place", 200, false),
        date_from: text(body.from, "from", 40),
        date_to: text(body.to, "to", 40),
        at_time: text(body.at, "at", 20),
        layers: text(body.layers, "layers", 200, false),
        note: text(body.note, "note", 2000),
      };
      if (!TIME_RE.test(row.at_time)) throw new Bad("at");
      const out = await db("chronia_reports?select=id", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
      return json(200, { id: out && out[0] ? out[0].id : null }, o);
    }
    if (as !== "reviewer") return json(403, { error: "review" }, o);
    if (action === "list") {
      const status = body.status === undefined ? "open" : body.status;
      if (status !== "all" && !STATUSES.includes(status as string)) throw new Bad("status");
      const rows = await db("chronia_reports?select=*&order=created_at.desc&limit=1000" + (status === "all" ? "" : "&status=eq." + status));
      return json(200, { reports: rows }, o);
    }
    if (action === "set") {
      const id = num(body.id, "id", 1, Number.MAX_SAFE_INTEGER);
      if (!Number.isInteger(id)) throw new Bad("id");
      const status = body.status;
      if (!STATUSES.includes(status as string)) throw new Bad("status");
      const patch = { status, reply: text(body.reply, "reply", 2000, false), closed_at: status === "open" ? null : new Date().toISOString() };
      const out = await db("chronia_reports?id=eq." + id, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) });
      if (!out || !out.length) return json(404, { error: "missing" }, o);
      return json(200, { report: out[0] }, o);
    }
    return json(400, { error: "action" }, o);
  } catch (e) {
    if (e instanceof Bad) return json(400, { error: "field", field: e.field }, o);
    console.error(e);
    return json(500, { error: "store" }, o);
  }
}

Deno.serve(handle);

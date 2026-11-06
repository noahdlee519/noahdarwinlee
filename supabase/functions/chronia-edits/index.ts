// CHRONIA's developer tools: Noah's edits to the map. The page posts JSON with an `action`:
//   list                                   -> { edits }: every edit (anyone may ask)
//   check  (signed in)                     -> { ok: true }
//   save   (signed in) { edit: { id?, kind, target, from, to, value, note? } } -> { edit }
//   delete (signed in) { id }              -> { ok: true }
// Only a reviewer on CHRONIA's team (the table chronia_team, by Google account: Noah) may check, save, or
// delete, signed in with Google on the atlas (the session the report panel keeps, sent as a Bearer token).
// Until 6 November 2026 it was Noah's password. An edit's dates are as the reports store them (1815,
// 1815-07, or 1815-07-03, with - for BC), and its span includes both ends.

// CHRONIA runs only at chroniaatlas.com (noahdarwinlee.com/chronia/ sends its visitors there), so only it,
// and a local copy for testing, may ask. The origin is not a password: the Google session is.
const ORIGINS = [
  /^https:\/\/(www\.)?chroniaatlas\.com$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
];
const MAX_BODY = 6000;
const TIME_RE = /^-?\d{1,4}(-\d{2}(-\d{2})?)?$/;
const KINDS = ["country-colour", "country-name", "label", "city-size", "city-name", "city-hide"];
const COLUMNS = "id,kind,target,date_from,date_to,value,note,updated_at";

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
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(status: number, body: unknown, origin: string, cache = "no-store") {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json", "Cache-Control": cache } });
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

// The signed-in account's standing: "out" (no usable Google session), "no" (signed in, not a reviewer), or "yes".
async function reviewer(req: Request) {
  const m = /^Bearer\s+(\S{20,4000})$/.exec(req.headers.get("authorization") || "");
  if (!m) return "out";
  const res = await fetch(Deno.env.get("SUPABASE_URL") + "/auth/v1/user", { headers: { apikey: dbKey().apikey, Authorization: "Bearer " + m[1] } });
  if (!res.ok) return "out";
  const u = await res.json();
  if (!u || typeof u.id !== "string") return "out";
  const providers = [u.app_metadata && u.app_metadata.provider].concat((u.app_metadata && u.app_metadata.providers) || []);
  if (!providers.includes("google")) return "out";
  const rows = await db("chronia_team?select=role&user_id=eq." + encodeURIComponent(u.id));
  return Array.isArray(rows) && rows.length > 0 && rows[0].role === "reviewer" ? "yes" : "no";
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

// A stored date as [year, month, day], a missing month or day filled as the start (for `from`) or
// the end (for `to`) of its year or month, so the two ends compare in order.
function dateKey(s: string, end: boolean) {
  const m = /^(-?\d{1,4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(s);
  if (!m) return null;
  const month = m[2] ? +m[2] : end ? 12 : 1, day = m[3] ? +m[3] : end ? 31 : 1;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return [+m[1], month, day];
}

function value(kind: string, v: unknown) {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Bad("value");
  const o = v as Record<string, unknown>;
  if (kind === "country-colour") {
    if (o.c !== undefined && o.c !== null) {
      if (!Number.isInteger(o.c)) throw new Bad("value");
      return { c: num(o.c, "value", 0, 9) };
    }
    if (typeof o.hex === "string" && /^#[0-9a-f]{6}$/i.test(o.hex)) return { hex: o.hex.toLowerCase() };
    throw new Bad("value");
  }
  if (kind === "country-name" || kind === "city-name") return { name: text(o.name, "value", 120) };
  if (kind === "label") {
    const size = o.size === undefined || o.size === null ? null : num(o.size, "value", 6, 60);
    const angle = o.angle === undefined || o.angle === null ? null : num(o.angle, "value", -90, 90);
    return { lon: num(o.lon, "value", -180, 180), lat: num(o.lat, "value", -90, 90), size, angle };
  }
  if (kind === "city-size") {
    if (!Number.isInteger(o.tier)) throw new Bad("value");
    return { tier: num(o.tier, "value", 1, 4) };
  }
  return {};
}

function edit(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Bad("edit");
  const e = raw as Record<string, unknown>;
  const kind = text(e.kind, "kind", 20);
  if (!KINDS.includes(kind)) throw new Bad("kind");
  const from = text(e.from, "from", 12), to = text(e.to, "to", 12);
  const a = TIME_RE.test(from) ? dateKey(from, false) : null, b = TIME_RE.test(to) ? dateKey(to, true) : null;
  if (!a) throw new Bad("from");
  if (!b) throw new Bad("to");
  for (let i = 0; i < 3; i++) {
    if (a[i] < b[i]) break;
    if (a[i] > b[i]) throw new Bad("to");
  }
  return {
    kind,
    target: text(e.target, "target", 200),
    date_from: from,
    date_to: to,
    value: value(kind, e.value),
    note: text(e.note, "note", 499, false),
  };
}

function out(r: Record<string, unknown>) {
  return { id: r.id, kind: r.kind, target: r.target, from: r.date_from, to: r.date_to, value: r.value, note: r.note, updated_at: r.updated_at };
}

export async function handle(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");
  if (!allowed(origin)) return new Response("Forbidden", { status: 403 });
  const o = origin as string;
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(o) });
  if (req.method !== "POST") return json(405, { error: "method" }, o);

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return json(413, { error: "long" }, o);
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("body");
  } catch (_) {
    return json(400, { error: "body" }, o);
  }

  const action = body.action;
  if (action === "list") {
    try {
      const rows = await db("chronia_edits?select=" + COLUMNS + "&order=updated_at.asc&limit=20000");
      return json(200, { edits: (rows || []).map(out) }, o, "public, max-age=30");
    } catch (e) {
      console.error(e);
      return json(500, { error: "store" }, o);
    }
  }
  if (action !== "check" && action !== "save" && action !== "delete") return json(400, { error: "action" }, o);

  let standing = "out";
  try {
    standing = await reviewer(req);
  } catch (e) {
    console.error(e);
    return json(500, { error: "auth" }, o);
  }
  if (standing === "out") return json(401, { error: "signin" }, o);
  if (standing !== "yes") return json(403, { error: "team" }, o);

  try {
    if (action === "check") return json(200, { ok: true }, o);
    if (action === "delete") {
      const id = num(body.id, "id", 1, 1e15);
      await db("chronia_edits?id=eq." + Math.floor(id), { method: "DELETE" });
      return json(200, { ok: true }, o);
    }
    const row = edit(body.edit);
    const id = (body.edit as Record<string, unknown>).id;
    let saved;
    if (id !== undefined && id !== null) {
      const n = Math.floor(num(id, "id", 1, 1e15));
      saved = await db("chronia_edits?id=eq." + n + "&select=" + COLUMNS, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ ...row, updated_at: new Date().toISOString() }) });
    } else {
      saved = await db("chronia_edits?select=" + COLUMNS, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
    }
    if (!saved || !saved[0]) return json(404, { error: "missing" }, o);
    return json(200, { edit: out(saved[0]) }, o);
  } catch (e) {
    if (e instanceof Bad) return json(400, { error: "field", field: e.field }, o);
    console.error(e);
    return json(500, { error: "store" }, o);
  }
}

Deno.serve(handle);

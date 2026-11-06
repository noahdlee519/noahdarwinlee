// CHRONIA's reports of errors on the map. The page posts JSON with an `action`:
//   google  { id_token, nonce }        -> a Supabase session, from Google's sign-in button on the page
//   refresh { refresh_token }          -> a fresh session
//   me      (signed in)                -> { name, left }: the account's name and its reports left today
//   send    (signed in) { lon, lat, zoom, place, from, to, at, layers, note } -> { id, left }
//   check   (on the team) or { password } -> { role: "viewer" | "reviewer" }
//   list    (on the team) or { password, status } -> { role, reports }
//   set     (a reviewer) { id, status, reply } -> { report }
// Anyone signed in with Google may send, up to 50 reports a day (UTC). The team is a list of Google accounts
// (the table chronia_team): a viewer may list the reports, and a reviewer (Noah) may also answer them and sees
// the reporters' emails. Until the fact checkers' accounts are on the list, the team's password
// (CHRONIA_REPORT_PASSWORD) still opens the list to read, as a viewer; twenty wrong passwords in a day shut a
// visitor out until the next day. Noah's password (CHRONIA_REVIEW_PASSWORD) no longer opens anything, since
// 6 November 2026.

// CHRONIA runs only at chroniaatlas.com (noahdarwinlee.com/chronia/ sends its visitors there), so only it,
// and a local copy for testing, may ask. The origin is not a password: the Google session and the strikes are.
const ORIGINS = [
  /^https:\/\/(www\.)?chroniaatlas\.com$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
];
const MAX_BODY = 8000;
const MAX_STRIKES = 20;
const DAY_CAP = 50;
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
    "Access-Control-Allow-Headers": "content-type, authorization",
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

// An IPv6 address by its /48, the block one customer is usually given, so that moving between the many
// addresses of one connection doesn't buy more tries. (Supabase's proxy sets x-forwarded-for itself, putting
// the caller's address first and dropping any the caller sent, as tested on 6 November 2026.)
function v6block(ip: string) {
  const [head, tail] = ip.split("::");
  const a = head ? head.split(":") : [], b = tail !== undefined && tail ? tail.split(":") : [];
  const groups = tail === undefined ? a : [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill("0"), ...b];
  return groups.slice(0, 3).map((g) => g.toLowerCase().replace(/^0+(?=.)/, "")).join(":") + "::/48";
}

function clientIp(req: Request) {
  const raw = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || (req.headers.get("x-real-ip") || "").trim();
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(raw)) return raw;
  if (/^[0-9a-f:]{2,39}$/i.test(raw) && raw.includes(":")) return v6block(raw);
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

async function teamRole(id: string): Promise<string | null> {
  const rows = await db("chronia_team?select=role&user_id=eq." + encodeURIComponent(id));
  return Array.isArray(rows) && rows.length && (rows[0].role === "viewer" || rows[0].role === "reviewer") ? rows[0].role : null;
}

async function session(path: string, body: Record<string, unknown>) {
  const res = await fetch(Deno.env.get("SUPABASE_URL") + "/auth/v1/token?grant_type=" + path, {
    method: "POST",
    headers: { apikey: dbKey().apikey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error("chronia-report " + path, res.status, (await res.text()).slice(0, 300));
    return null;
  }
  const s = await res.json();
  return s && typeof s.access_token === "string" && typeof s.refresh_token === "string" ? { access_token: s.access_token, refresh_token: s.refresh_token } : null;
}

type Account = { id: string; email: string; name: string };

async function account(req: Request): Promise<Account | null> {
  const m = /^Bearer\s+(\S{20,4000})$/.exec(req.headers.get("authorization") || "");
  if (!m) return null;
  const res = await fetch(Deno.env.get("SUPABASE_URL") + "/auth/v1/user", { headers: { apikey: dbKey().apikey, Authorization: "Bearer " + m[1] } });
  if (!res.ok) return null;
  const u = await res.json();
  if (!u || typeof u.id !== "string") return null;
  // Only Google accounts may send reports. The project also allows sign-up by email for the site's other
  // pages, and such an account, made with any address that can take a confirmation mail, would otherwise
  // pass here too.
  const providers = [u.app_metadata && u.app_metadata.provider].concat((u.app_metadata && u.app_metadata.providers) || []);
  if (!providers.includes("google")) return null;
  const meta = u.user_metadata || {};
  const name = String(meta.full_name || meta.name || (typeof u.email === "string" ? u.email.split("@")[0] : "") || "Someone").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 80) || "Someone";
  return { id: u.id, email: typeof u.email === "string" ? u.email.slice(0, 320) : "", name };
}

async function sentToday(id: string) {
  const since = new Date().toISOString().slice(0, 10) + "T00:00:00Z";
  const res = await fetch(Deno.env.get("SUPABASE_URL") + "/rest/v1/chronia_reports?select=id&user_id=eq." + id + "&created_at=gte." + encodeURIComponent(since), { method: "HEAD", headers: { ...dbKey(), Prefer: "count=exact" } });
  if (!res.ok) throw new Error("count " + res.status);
  const n = Number((res.headers.get("content-range") || "").split("/")[1]);
  return isFinite(n) ? n : 0;
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
  if (action === "google") {
    const idToken = typeof body.id_token === "string" ? body.id_token.slice(0, 4000) : "", nonce = typeof body.nonce === "string" ? body.nonce.slice(0, 200) : "";
    const fresh = idToken ? await session("id_token", { provider: "google", id_token: idToken, nonce }).catch((e) => { console.error(e); return null; }) : null;
    return fresh ? json(200, fresh, o) : json(401, { error: "signin" }, o);
  }
  if (action === "refresh") {
    const token = typeof body.refresh_token === "string" ? body.refresh_token.slice(0, 400) : "";
    const fresh = token ? await session("refresh_token", { refresh_token: token }).catch((e) => { console.error(e); return null; }) : null;
    return fresh ? json(200, fresh, o) : json(401, { error: "signin" }, o);
  }
  if (action === "me" || action === "send") {
    let me: Account | null = null;
    try {
      me = await account(req);
    } catch (e) {
      console.error(e);
      return json(500, { error: "auth" }, o);
    }
    if (!me) return json(401, { error: "signin" }, o);
    try {
      const n = await sentToday(me.id);
      if (action === "me") return json(200, { name: me.name, left: Math.max(0, DAY_CAP - n), cap: DAY_CAP }, o);
      if (n >= DAY_CAP) return json(429, { error: "limit", cap: DAY_CAP }, o);
      // The count above is for the answer; chronia_report_send counts again and adds the report in one step,
      // under a lock on the account, so reports sent at the same moment can't pass the cap between the two.
      const row = {
        user_id: me.id,
        email: me.email,
        reporter: me.name,
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
      const out = await db("rpc/chronia_report_send", { method: "POST", body: JSON.stringify({ p_row: row, p_cap: DAY_CAP }) });
      if (!out || out.id === null || out.id === undefined) return json(429, { error: "limit", cap: DAY_CAP }, o);
      return json(200, { id: out.id, left: Math.max(0, DAY_CAP - (Number(out.sent) || n + 1)), cap: DAY_CAP }, o);
    } catch (e) {
      if (e instanceof Bad) return json(400, { error: "field", field: e.field }, o);
      console.error(e);
      return json(500, { error: "store" }, o);
    }
  }

  if (action !== "check" && action !== "list" && action !== "set") return json(400, { error: "action" }, o);
  let as: string | null = null;
  if (req.headers.get("authorization")) {
    // Signed in: the account's place on the team, if it has one.
    try {
      const me = await account(req);
      if (!me) return json(401, { error: "signin" }, o);
      as = await teamRole(me.id);
    } catch (e) {
      console.error(e);
      return json(500, { error: "auth" }, o);
    }
    if (!as) return json(403, { error: "team" }, o);
  } else {
    // The team's password, for reading only, until the fact checkers' accounts are on the team.
    const who = await visitor(req);
    try {
      if ((await db("rpc/chronia_report_strike", { method: "POST", body: JSON.stringify({ p_who: who, p_add: false }) })) >= MAX_STRIKES) return json(429, { error: "locked" }, o);
    } catch (e) {
      console.error(e);
      return json(500, { error: "store" }, o);
    }
    const secret = Deno.env.get("CHRONIA_REPORT_PASSWORD") || "";
    const password = typeof body.password === "string" ? body.password : "";
    if (secret && password && (await same(password, secret))) as = "viewer";
    else {
      try {
        await db("rpc/chronia_report_strike", { method: "POST", body: JSON.stringify({ p_who: who, p_add: true }) });
      } catch (e) {
        console.error(e);
      }
      await new Promise((r) => setTimeout(r, 700));
      return json(401, { error: "password" }, o);
    }
  }

  try {
    if (action === "check") return json(200, { role: as }, o);
    if (action === "list") {
      const status = body.status === undefined ? "open" : body.status;
      if (status !== "all" && !STATUSES.includes(status as string)) throw new Bad("status");
      const rows = await db("chronia_reports?select=*&order=created_at.desc&limit=1000" + (status === "all" ? "" : "&status=eq." + status));
      const shown = as === "reviewer" ? rows : (rows || []).map((r: Record<string, unknown>) => { const { email: _e, user_id: _u, ...rest } = r; return rest; });
      return json(200, { role: as, reports: shown }, o);
    }
    if (action === "set") {
      if (as !== "reviewer") return json(403, { error: "review" }, o);
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

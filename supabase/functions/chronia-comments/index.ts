// CHRONIA's comments on the country card, and the profiles they are posted under. The page posts JSON with an
// `action`; the contract with the page is docs/superpowers/plans/2026-11-24-chronia-comments-api.md.
//   open to all:  list { names, sort?, at?, offset? }       -> { comments, more, total } (and role, for the team)
//   signed in:    me                                         -> { profile, left, cap, role }
//                 name { username }                          -> { ok, why? }
//                 profile { username?, age?, avatar? }       -> { profile }
//                 post { name, at, text }                    -> { comment, left }
//                 delete { id }  |  flag { id } or { user }  -> { ok: true }
//   the team:     queue                                      -> { role, comments, pictures, blocked, names }
//   a reviewer:   restore { id }, remove { id }             -> { comment }
//                 block { user, on }, picture { user, on }, erase { user } -> { ok: true }
//                 move { from, to }                          -> { moved }
// Anyone may read. Only an account signed in with Google may write, and only once it has a profile, made with the
// age box ticked. The tables and the picture bucket are closed to the page: this function reads and writes them
// with the project's secret key, and the database functions it calls decide the caps under a lock on the account.
// A picture is checked by Claude before it is stored; if the check can't be made, the picture is refused.

import { atNumber, checkComment, checkUsername, imageKind } from "./rules.ts";

const ORIGINS = [
  /^https:\/\/(www\.)?chroniaatlas\.com$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
];
const MAX_BODY = 400_000; // characters; a picture is the only large field
const DAY_CAP = 100; // comments a day (UTC) for each account
const GAP_S = 10; // seconds between one account's comments
const FLAG_CAP = 20; // reports a day for each account
const HIDE_AT = 3; // reports from different accounts that hide a comment or a picture
const PICTURE_CAP = 5; // picture changes a day for each account
const NAME_DAYS = 30; // days between changes of username
const KEEP_DAYS = 30; // days a picture a reviewer removed is kept, so that the removal can be undone
const MAX_PICTURE = 200 * 1024; // bytes
const PAGE = 20; // comments to a page of a thread
const MAX_NAMES = 60; // names in one thread
const MAX_NAME = 200; // characters in a country's name
const CHECK_MS = 20_000; // how long the picture check may take
const BUCKET = "chronia-avatars";
const CLAUDE_API = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-haiku-5-5";
const USERNAME_SHAPE = /^[A-Za-z][A-Za-z0-9_]{2,19}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILE = /^[A-Za-z0-9_-]{1,100}\.(webp|jpg|jpeg|png)$/;
const CHECK_ASK = "This picture was uploaded as a profile picture for CHRONIA, a public history website with readers of " +
  "all ages. Answer with one word only: ok if it is suitable, or no if it is not. Answer no if it shows nudity or " +
  "sexual content, graphic violence or gore, a hate symbol or extremist imagery, harassing or abusive text, or " +
  "anything else not suitable as a public profile picture on a history site for general readers.";

// deno-lint-ignore no-explicit-any
type Json = any;

class Bad extends Error {
  field: string;
  constructor(field: string) {
    super("bad " + field);
    this.field = field;
  }
}

// An answer other than 200, with its code and any details the contract gives it.
class No extends Error {
  status: number;
  extra: Record<string, unknown>;
  constructor(status: number, code: string, extra: Record<string, unknown> = {}) {
    super(code);
    this.status = status;
    this.extra = extra;
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

function base() {
  return Deno.env.get("SUPABASE_URL") || "";
}

function dbKey(): Record<string, string> {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) {
    try {
      const k = JSON.parse(keys).default;
      if (k) return { apikey: k };
    } catch (_) { /* fall back to the legacy key */ }
  }
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return { apikey: legacy, Authorization: "Bearer " + legacy };
}

// The database's error is logged by its code only: its message can quote a row, and so a user's text.
async function db(path: string, init: RequestInit = {}) {
  const res = await fetch(base() + "/rest/v1/" + path, {
    ...init,
    headers: { ...dbKey(), "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) {
    let code = "";
    try {
      code = String((await res.json()).code || "").slice(0, 12);
    } catch (_) { /* no code */ }
    throw new Error("chronia-comments db " + path.split("?")[0] + " " + res.status + " " + code);
  }
  return res.status === 204 ? null : await res.json();
}

function rpc(name: string, args: Record<string, unknown>) {
  return db("rpc/" + name, { method: "POST", body: JSON.stringify(args) });
}

function text(v: unknown, field: string, max: number, need = true) {
  if (v === undefined || v === null) v = "";
  if (typeof v !== "string") throw new Bad(field);
  // deno-lint-ignore no-control-regex
  const s = v.normalize("NFC").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
  if ((need && !s) || s.length > max) throw new Bad(field);
  return s;
}

function num(v: unknown, field: string, lo: number, hi: number) {
  if (typeof v !== "number" || !isFinite(v) || v < lo || v > hi) throw new Bad(field);
  return v;
}

function id(v: unknown, field = "id") {
  const n = num(v, field, 1, Number.MAX_SAFE_INTEGER);
  if (!Number.isInteger(n)) throw new Bad(field);
  return n;
}

function uuid(v: unknown, field = "user") {
  if (typeof v !== "string" || !UUID.test(v)) throw new Bad(field);
  return v.toLowerCase();
}

function on(v: unknown) {
  if (typeof v !== "boolean") throw new Bad("on");
  return v;
}

// A stored picture's public address, or null. Names are the function's own (a UUID and an extension).
function avatarUrl(name: unknown): string | null {
  if (typeof name !== "string" || !FILE.test(name)) return null;
  return base() + "/storage/v1/object/public/" + BUCKET + "/" + encodeURIComponent(name);
}

async function teamRole(user: string): Promise<"viewer" | "reviewer" | null> {
  const rows = await db("chronia_team?select=role&user_id=eq." + encodeURIComponent(user));
  return Array.isArray(rows) && rows.length && (rows[0].role === "viewer" || rows[0].role === "reviewer") ? rows[0].role : null;
}

type Account = { id: string };

// The signed-in account, from the bearer token, if it is a Google account; null for a missing or stale token.
// Throws only if the sign-in server can't be asked.
async function account(req: Request): Promise<Account | null> {
  const m = /^Bearer\s+(\S{20,4000})$/.exec(req.headers.get("authorization") || "");
  if (!m) return null;
  const res = await fetch(base() + "/auth/v1/user", { headers: { apikey: dbKey().apikey, Authorization: "Bearer " + m[1] } });
  if (!res.ok) return null;
  const u = await res.json();
  if (!u || typeof u.id !== "string" || !UUID.test(u.id)) return null;
  // Only Google accounts, as for reports: the project also allows sign-up by email for the site's other pages.
  const providers = [u.app_metadata && u.app_metadata.provider].concat((u.app_metadata && u.app_metadata.providers) || []);
  if (!providers.includes("google")) return null;
  return { id: u.id };
}

// A comment as the page sees it; the team's fields only for the team, whatever the database sent.
function comment(c: Json, team: boolean) {
  const out: Record<string, unknown> = {
    id: c.id,
    username: c.username,
    avatar: avatarUrl(c.avatar),
    polity: c.polity,
    at: c.at,
    text: c.text,
    mine: c.mine === true,
  };
  if (team) {
    out.flags = Number(c.flags) || 0;
    out.state = c.state;
    out.user = c.user;
    if (c.sent !== undefined) out.sent = c.sent;
  }
  return out;
}

function profileOut(p: Json) {
  return { username: p.username, avatar: p.avatar_state === "ok" ? avatarUrl(p.avatar) : null, blocked: p.blocked === true };
}

// The database's refusals, as the contract's answers.
function refused(out: Json, cap: number): never {
  const e = out && typeof out.error === "string" ? out.error : "store";
  switch (e) {
    case "profile":
    case "blocked":
    case "own":
      throw new No(403, e);
    case "missing":
      throw new No(404, e);
    case "taken":
      throw new No(409, e);
    case "soon":
      throw new No(409, e, { days: Number(out.days) || 1 });
    case "limit":
      throw new No(429, e, { cap });
    case "fast":
      throw new No(429, e, { wait: Number(out.wait) || 1 });
    case "age":
      throw new No(400, e);
    case "field":
      throw new No(400, "field", { field: "username" });
  }
  throw new Error("chronia-comments refused " + e.slice(0, 20));
}

// ---------------------------------------------------------------- pictures

function decode(b64: string): Uint8Array<ArrayBuffer> {
  // Base64 of 200 KB is at most this long; anything longer is too large before it is decoded.
  if (b64.length > Math.ceil(MAX_PICTURE / 3) * 4) throw new No(413, "long");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64) || b64.length % 4 === 1) throw new No(400, "picture");
  let bin: string;
  try {
    bin = atob(b64);
  } catch (_) {
    throw new No(400, "picture");
  }
  if (bin.length > MAX_PICTURE) throw new No(413, "long");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Asks Claude whether the picture may be shown. Fails closed: anything but a clear "ok" is a refusal (400), and a
// check that can't be made, or isn't answered in time, is 503.
async function check(b64: string, kind: string) {
  const key = Deno.env.get("ANTHROPIC_API_KEY") || "";
  if (!key) {
    console.error("chronia-comments check: no ANTHROPIC_API_KEY");
    throw new No(503, "check");
  }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), CHECK_MS);
  let out: Json;
  try {
    const res = await fetch(CLAUDE_API, {
      method: "POST",
      signal: ctl.signal,
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 5,
        thinking: { type: "disabled" },
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/" + kind, data: b64 } },
            { type: "text", text: CHECK_ASK },
          ],
        }],
      }),
    });
    if (!res.ok) {
      await res.body?.cancel();
      console.error("chronia-comments check: anthropic " + res.status);
      throw new No(503, "check");
    }
    out = await res.json();
  } catch (e) {
    if (e instanceof No) throw e;
    console.error("chronia-comments check: " + ((e as Json)?.name === "AbortError" ? "timeout" : "unreachable"));
    throw new No(503, "check");
  } finally {
    clearTimeout(timer);
  }
  const said = (Array.isArray(out?.content) ? out.content : []).filter((b: Json) => b && b.type === "text").map((b: Json) => String(b.text)).join(" ");
  if (said.trim().toLowerCase().replace(/^["'\s]+|["'.!\s]+$/g, "") !== "ok") {
    console.log("chronia-comments check: refused (" + String(out?.stop_reason).slice(0, 20) + ")");
    throw new No(400, "picture");
  }
}

async function upload(name: string, bytes: Uint8Array<ArrayBuffer>, kind: string) {
  const res = await fetch(base() + "/storage/v1/object/" + BUCKET + "/" + encodeURIComponent(name), {
    method: "POST",
    headers: { ...dbKey(), "Content-Type": "image/" + kind, "x-upsert": "false" },
    body: bytes,
  });
  await res.body?.cancel();
  if (!res.ok) throw new Error("chronia-comments upload " + res.status);
}

// Deletes picture files, best effort: a file left behind is only storage, and is logged.
async function drop(names: unknown[]) {
  const files = names.filter((n): n is string => typeof n === "string" && FILE.test(n));
  if (!files.length) return;
  try {
    const res = await fetch(base() + "/storage/v1/object/" + BUCKET, {
      method: "DELETE",
      headers: { ...dbKey(), "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: files }),
    });
    await res.body?.cancel();
    if (!res.ok) console.error("chronia-comments drop " + res.status + " " + files.join(","));
  } catch (e) {
    console.error("chronia-comments drop " + String((e as Json)?.message || e).slice(0, 100) + " " + files.join(","));
  }
}

// ---------------------------------------------------------------- the actions

async function list(body: Json, req: Request) {
  const names = body.names;
  if (!Array.isArray(names) || names.length < 1 || names.length > MAX_NAMES) throw new Bad("names");
  const clean = names.map((n) => text(n, "names", MAX_NAME));
  const sort = body.sort === undefined ? "new" : body.sort;
  if (sort !== "new" && sort !== "near") throw new Bad("sort");
  let at: number | null = null;
  if (sort === "near") {
    at = typeof body.at === "string" ? atNumber(body.at) : null;
    if (at === null) throw new Bad("at");
  }
  const offset = body.offset === undefined ? 0 : num(body.offset, "offset", 0, 1_000_000);
  if (!Number.isInteger(offset)) throw new Bad("offset");

  // A stale or bad token, or a sign-in server that can't be asked, reads as signed out: reading needs no account.
  let me: Account | null = null, role: string | null = null;
  if (req.headers.get("authorization")) {
    try {
      me = await account(req);
      if (me) role = await teamRole(me.id);
    } catch (e) {
      console.error(e);
      me = null;
      role = null;
    }
  }
  const out = await rpc("chronia_thread", {
    p_names: clean,
    p_sort: sort,
    p_at_num: at,
    p_offset: offset,
    p_limit: PAGE,
    p_viewer: me ? me.id : null,
    p_team: !!role,
  });
  const answer: Record<string, unknown> = {
    comments: (out && Array.isArray(out.comments) ? out.comments : []).map((c: Json) => comment(c, !!role)),
    more: !!(out && out.more),
    total: Number(out && out.total) || 0,
  };
  if (role) answer.role = role;
  return answer;
}

async function me(user: Account) {
  const [out, role] = await Promise.all([rpc("chronia_me", { p_user: user.id, p_cap: DAY_CAP }), teamRole(user.id)]);
  return { profile: out && out.profile ? profileOut(out.profile) : null, left: Math.max(0, Number(out && out.left) || 0), cap: DAY_CAP, role };
}

// Who holds a username's key, if anyone.
async function holder(key: string): Promise<string | null> {
  const rows = await db("chronia_profiles?select=user_id&limit=1&username_key=eq." + encodeURIComponent(key));
  return Array.isArray(rows) && rows.length ? String(rows[0].user_id) : null;
}

async function name(user: Account, body: Json) {
  if (typeof body.username !== "string") throw new Bad("username");
  const r = checkUsername(body.username);
  if (!r.ok) return { ok: false, why: r.why };
  const who = await holder(r.key);
  return who && who !== user.id ? { ok: false, why: "taken" } : { ok: true };
}

async function profile(user: Account, body: Json) {
  let username: string | null = null, key: string | null = null;
  if (body.username !== undefined && body.username !== null) {
    if (typeof body.username !== "string") throw new Bad("username");
    const r = checkUsername(body.username);
    if (!r.ok) throw new No(400, r.why);
    username = body.username;
    key = r.key;
  }
  const age = body.age === true;
  let picture: string | null = null; // the base64, if a new picture is given
  if (body.avatar !== undefined && body.avatar !== null) {
    if (typeof body.avatar !== "string") throw new Bad("avatar");
    picture = body.avatar;
  }

  // The database decides again under its lock; asking first spares a first profile without the age box, or a
  // blocked account, the picture check and the upload.
  const rows = await db("chronia_profiles?select=blocked&user_id=eq." + encodeURIComponent(user.id));
  const had = Array.isArray(rows) && rows.length ? rows[0] : null;
  if (!had) {
    if (!age) throw new No(400, "age");
    if (!username) throw new Bad("username");
  } else if (had.blocked) throw new No(403, "blocked");

  let stored: string | null = null; // the new file's name, once uploaded
  if (picture) {
    const bytes = decode(picture);
    const kind = imageKind(bytes);
    if (!kind) throw new No(400, "picture");
    const counted = await rpc("chronia_avatar_count", { p_user: user.id, p_cap: PICTURE_CAP });
    if (!counted || counted.error) refused(counted, PICTURE_CAP);
    await check(picture, kind);
    stored = crypto.randomUUID() + "." + (kind === "jpeg" ? "jpg" : kind);
    await upload(stored, bytes, kind);
  }

  let out: Json;
  try {
    out = await rpc("chronia_profile_save", {
      p_user: user.id,
      p_username: username,
      p_key: key,
      p_avatar: picture === null ? null : stored || "",
      p_age: age,
      p_name_days: NAME_DAYS,
    });
    if (!out || !out.ok) refused(out, PICTURE_CAP);
  } catch (e) {
    if (stored) await drop([stored]);
    throw e;
  }
  await drop([out.old_avatar, out.removed_avatar]);
  return { profile: profileOut({ username: out.username, avatar: out.avatar, avatar_state: out.avatar_state || "ok", blocked: false }) };
}

async function post(user: Account, body: Json) {
  if (typeof body.text !== "string") throw new Bad("text");
  const said = checkComment(body.text);
  if (!said.ok) throw new No(400, said.why);
  const polity = text(body.name, "name", MAX_NAME);
  if (typeof body.at !== "string") throw new Bad("at");
  const atNum = atNumber(body.at);
  if (atNum === null) throw new Bad("at");

  const mine = await rpc("chronia_me", { p_user: user.id, p_cap: DAY_CAP });
  const p = mine && mine.profile;
  if (!p) throw new No(403, "profile");
  if (p.blocked) throw new No(403, "blocked");
  const out = await rpc("chronia_comment_send", {
    p_user: user.id,
    p_polity: polity,
    p_at: body.at,
    p_at_num: atNum,
    p_body: said.text,
    p_cap: DAY_CAP,
    p_gap_s: GAP_S,
  });
  if (!out || out.id === undefined || out.id === null) refused(out, DAY_CAP);
  return {
    comment: {
      id: out.id,
      username: p.username,
      avatar: p.avatar_state === "ok" ? avatarUrl(p.avatar) : null,
      polity,
      at: body.at,
      text: said.text,
      mine: true,
    },
    left: Math.max(0, Number(out.left) || 0),
  };
}

async function remove(user: Account, body: Json) {
  const n = id(body.id);
  const out = await rpc("chronia_comment_delete", { p_user: user.id, p_comment: n });
  if (out && out.ok) return { ok: true };
  // A reviewer may take down anyone's comment: it is marked removed, and kept for the team.
  if ((await teamRole(user.id)) === "reviewer") {
    const gone = await rpc("chronia_comment_remove", { p_comment: n });
    if (gone && gone.ok) return { ok: true };
  }
  throw new No(404, "missing");
}

async function flag(user: Account, body: Json) {
  const hasId = body.id !== undefined && body.id !== null, hasUser = body.user !== undefined && body.user !== null;
  if (hasId === hasUser) throw new Bad("id");
  let target: string | null = null, n: number | null = null;
  if (hasId) n = id(body.id);
  else {
    if (typeof body.user !== "string" || !USERNAME_SHAPE.test(body.user)) throw new Bad("user");
    target = await holder(body.user.toLowerCase());
    if (!target) throw new No(404, "missing");
  }
  const out = await rpc("chronia_flag_add", { p_user: user.id, p_comment: n, p_target: target, p_cap: FLAG_CAP, p_hide: HIDE_AT });
  if (!out || !out.ok) {
    if (out && out.error === "field") throw new Bad(hasId ? "id" : "user");
    refused(out, FLAG_CAP);
  }
  return { ok: true };
}

async function queue(role: string) {
  // Removed pictures kept past their time are forgotten and their files deleted first, best effort.
  try {
    const expired = await rpc("chronia_avatars_expired", { p_days: KEEP_DAYS });
    if (Array.isArray(expired)) await drop(expired);
  } catch (e) {
    console.error(e);
  }
  const out = await rpc("chronia_queue", {});
  return {
    role,
    comments: (out && Array.isArray(out.comments) ? out.comments : []).map((c: Json) => comment(c, true)),
    pictures: (out && Array.isArray(out.pictures) ? out.pictures : []).map((p: Json) => ({
      username: p.username,
      avatar: avatarUrl(p.avatar),
      user: p.user,
      flags: Number(p.flags) || 0,
      state: p.state,
    })),
    blocked: (out && Array.isArray(out.blocked) ? out.blocked : []).map((b: Json) => ({ username: b.username, user: b.user })),
    names: out && Array.isArray(out.names) ? out.names : [],
  };
}

async function review(action: string, body: Json) {
  if (action === "restore" || action === "remove") {
    const out = await rpc(action === "restore" ? "chronia_comment_restore" : "chronia_comment_remove", { p_comment: id(body.id) });
    if (!out || !out.ok) refused(out, 0);
    return { comment: comment(out.comment, true) };
  }
  if (action === "block") {
    const out = await rpc("chronia_block", { p_user: uuid(body.user), p_on: on(body.on) });
    if (!out || !out.ok) refused(out, 0);
    return { ok: true };
  }
  if (action === "picture") {
    const out = await rpc("chronia_avatar_set", { p_user: uuid(body.user), p_on: on(body.on) });
    if (!out || !out.ok) refused(out, 0);
    await drop([out.removed_avatar]);
    return { ok: true };
  }
  if (action === "move") {
    const from = text(body.from, "from", MAX_NAME), to = text(body.to, "to", MAX_NAME);
    const n = await rpc("chronia_comments_move", { p_from: from, p_to: to });
    return { moved: Number(n) || 0 };
  }
  // erase: the database first, so that nothing points at the file, then the files.
  const out = await rpc("chronia_account_erase", { p_user: uuid(body.user) });
  if (!out || !out.ok) refused(out, 0);
  await drop([out.avatar, out.removed_avatar]);
  return { ok: true };
}

const SIGNED_IN = ["me", "name", "profile", "post", "delete", "flag"];
const TEAM = ["queue"];
const REVIEWER = ["restore", "remove", "block", "picture", "move", "erase"];

export async function handle(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");
  if (!allowed(origin)) {
    return new Response(JSON.stringify({ error: "origin" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }
  const o = origin as string;
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(o) });
  if (req.method !== "POST") return json(405, { error: "method" }, o);

  let body: Json;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return json(413, { error: "long" }, o);
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("body");
  } catch (_) {
    return json(400, { error: "body" }, o);
  }

  const action = body.action;
  const known = action === "list" || SIGNED_IN.includes(action) || TEAM.includes(action) || REVIEWER.includes(action);
  if (typeof action !== "string" || !known) return json(400, { error: "action" }, o);

  try {
    if (action === "list") return json(200, await list(body, req), o);

    let user: Account | null;
    try {
      user = await account(req);
    } catch (e) {
      console.error(e);
      return json(500, { error: "auth" }, o);
    }
    if (!user) return json(401, { error: "signin" }, o);

    switch (action) {
      case "me":
        return json(200, await me(user), o);
      case "name":
        return json(200, await name(user, body), o);
      case "profile":
        return json(200, await profile(user, body), o);
      case "post":
        return json(200, await post(user, body), o);
      case "delete":
        return json(200, await remove(user, body), o);
      case "flag":
        return json(200, await flag(user, body), o);
    }

    const role = await teamRole(user.id);
    if (!role) return json(403, { error: "team" }, o);
    if (action === "queue") return json(200, await queue(role), o);
    if (role !== "reviewer") return json(403, { error: "review" }, o);
    return json(200, await review(action, body), o);
  } catch (e) {
    if (e instanceof Bad) return json(400, { error: "field", field: e.field }, o);
    if (e instanceof No) return json(e.status, { error: e.message, ...e.extra }, o);
    console.error(e);
    return json(500, { error: "store" }, o);
  }
}

Deno.serve(handle);

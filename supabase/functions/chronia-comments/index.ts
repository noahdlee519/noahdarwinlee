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
const SIGN_S = 3600; // seconds the team's address for a hidden or removed picture lasts
const SWEEP_MOVES = 50; // picture moves one sweep makes at most
const SWEEP_TRASH = 100; // picture files one sweep deletes at most
const MAX_PICTURE = 200 * 1024; // bytes
const PAGE = 20; // comments to a page of a thread
const MAX_NAMES = 60; // names in one thread
const MAX_NAME = 200; // characters in a country's name
const CHECK_MS = 20_000; // how long the picture check may take
const BUCKET = "chronia-avatars"; // public: pictures in good standing
const KEPT = "chronia-avatars-kept"; // private: hidden and removed pictures, for the team
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

// A picture is shown only in good standing and in the public bucket.
function profileOut(p: Json) {
  return { username: p.username, avatar: p.avatar_state === "ok" && !p.avatar_kept ? avatarUrl(p.avatar) : null, blocked: p.blocked === true };
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

// Deletes picture files from both buckets (a file may be in either, after a move half made), best effort: a file
// left behind is only storage, and is logged. True if both deletes were answered.
async function drop(names: unknown[]): Promise<boolean> {
  const files = names.filter((n): n is string => typeof n === "string" && FILE.test(n));
  if (!files.length) return true;
  let done = true;
  for (const bucket of [BUCKET, KEPT]) {
    try {
      const res = await fetch(base() + "/storage/v1/object/" + bucket, {
        method: "DELETE",
        headers: { ...dbKey(), "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: files }),
      });
      await res.body?.cancel();
      if (!res.ok) {
        console.error("chronia-comments drop " + bucket + " " + res.status + " " + files.join(","));
        done = false;
      }
    } catch (e) {
      console.error("chronia-comments drop " + bucket + " " + String((e as Json)?.message || e).slice(0, 100) + " " + files.join(","));
      done = false;
    }
  }
  return done;
}

// Moves a picture's file between the buckets. "absent" when the file is not in the bucket it is moved from (a move
// already made, or a file gone): then nothing of it is public either way, and the move can be recorded.
async function shift(name: string, toKept: boolean): Promise<"moved" | "absent" | "failed"> {
  try {
    const res = await fetch(base() + "/storage/v1/object/move", {
      method: "POST",
      headers: { ...dbKey(), "Content-Type": "application/json" },
      body: JSON.stringify({ bucketId: toKept ? BUCKET : KEPT, sourceKey: name, destinationBucket: toKept ? KEPT : BUCKET, destinationKey: name }),
    });
    let why = "";
    try {
      why = String((await res.json()).error || "");
    } catch (_) { /* no body */ }
    if (res.ok) return "moved";
    if ((res.status === 400 || res.status === 404) && /not.?found/i.test(why)) return "absent";
    console.error("chronia-comments move " + res.status + " " + name);
  } catch (e) {
    console.error("chronia-comments move " + String((e as Json)?.message || e).slice(0, 100) + " " + name);
  }
  return "failed";
}

// Brings pictures' files to the bucket their state calls for (one account's, or any), and records each move made.
// The database's change comes first and stands; the file follows. If a move fails, the record still says where the
// file is, so the page shows no picture and the next sweep tries again.
async function settle(user: string | null) {
  const due = await rpc("chronia_avatar_moves", { p_user: user, p_limit: SWEEP_MOVES });
  for (const m of Array.isArray(due) ? due : []) {
    if (typeof m.name !== "string" || !FILE.test(m.name)) continue;
    const how = await shift(m.name, m.kept === true);
    if (how !== "failed") await rpc("chronia_avatar_moved", { p_user: m.user, p_name: m.name, p_kept: m.kept === true });
  }
}

// Deletes the files in the trash (of profiles deleted by any route, and of pictures past their 30 days), and
// forgets those deleted; what can't be deleted stays for the next sweep.
async function emptyTrash() {
  const rows = await rpc("chronia_avatar_trash_take", { p_limit: SWEEP_TRASH });
  if (!Array.isArray(rows) || !rows.length) return;
  if (await drop(rows.map((r: Json) => r.name))) await rpc("chronia_avatar_trash_done", { p_ids: rows.map((r: Json) => r.id) });
}

// The housekeeping that must not wait for anyone to open the dashboard: removed pictures past their time go to the
// trash, files are moved to where their state calls for, and the trash is emptied. Each step on its own, best effort.
async function sweep() {
  const steps: [string, () => Promise<unknown>][] = [
    ["expire", () => rpc("chronia_avatars_expired", { p_days: KEEP_DAYS })],
    ["settle", () => settle(null)],
    ["trash", emptyTrash],
  ];
  for (const [what, step] of steps) {
    try {
      await step();
    } catch (e) {
      console.error("chronia-comments sweep " + what + ": " + String((e as Json)?.message || e).slice(0, 120));
    }
  }
}

// Runs a job after the answer is sent, kept alive by the runtime, so that it never slows or fails a request.
function later(job: () => Promise<void>) {
  const run = new Promise((r) => setTimeout(r, 0)).then(job).catch((e) => console.error(e));
  const rt = (globalThis as Json).EdgeRuntime;
  if (rt && typeof rt.waitUntil === "function") rt.waitUntil(run);
}

// Addresses for the team to see files in the private bucket, signed for an hour. Missing ones (the signing failed)
// are simply absent: never the public address.
async function signed(names: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const files = [...new Set(names.filter((n) => FILE.test(n)))];
  if (!files.length) return out;
  try {
    const res = await fetch(base() + "/storage/v1/object/sign/" + KEPT, {
      method: "POST",
      headers: { ...dbKey(), "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: SIGN_S, paths: files }),
    });
    if (!res.ok) {
      await res.body?.cancel();
      console.error("chronia-comments sign " + res.status);
      return out;
    }
    for (const r of await res.json()) {
      if (r && typeof r.path === "string" && typeof r.signedURL === "string" && !r.error) out.set(r.path, base() + "/storage/v1" + r.signedURL);
    }
  } catch (e) {
    console.error("chronia-comments sign " + String((e as Json)?.message || e).slice(0, 100));
  }
  return out;
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
// Who holds a name, by its lowercase key (for a report of a picture) or its folded form (whether a name is free).
async function holder(column: "username_key" | "username_fold", value: string): Promise<string | null> {
  const rows = await db("chronia_profiles?select=user_id&limit=1&" + column + "=eq." + encodeURIComponent(value));
  return Array.isArray(rows) && rows.length ? String(rows[0].user_id) : null;
}

async function name(user: Account, body: Json) {
  if (typeof body.username !== "string") throw new Bad("username");
  const r = checkUsername(body.username);
  if (!r.ok) return { ok: false, why: r.why };
  const who = await holder("username_fold", r.fold);
  return who && who !== user.id ? { ok: false, why: "taken" } : { ok: true };
}

// A new picture: counted (under the lock on the account's row, which must exist), checked, and uploaded. A check
// that can't be made gives the count back; a refusal keeps it.
async function newPicture(user: Account, b64: string, bytes: Uint8Array<ArrayBuffer>, kind: string): Promise<string> {
  const counted = await rpc("chronia_avatar_count", { p_user: user.id, p_cap: PICTURE_CAP });
  if (!counted || counted.error) refused(counted, PICTURE_CAP);
  try {
    await check(b64, kind);
  } catch (e) {
    if (e instanceof No && e.status === 503) {
      await rpc("chronia_avatar_uncount", { p_user: user.id }).catch((x) => console.error(x));
    }
    throw e;
  }
  const stored = crypto.randomUUID() + "." + (kind === "jpeg" ? "jpg" : kind);
  await upload(stored, bytes, kind);
  return stored;
}

// What a failed picture on a first save is called in its answer.
function pictureError(e: unknown): "picture" | "check" | "limit" | "store" {
  if (e instanceof No && e.status === 400 && e.message === "picture") return "picture";
  if (e instanceof No && e.status === 503) return "check";
  if (e instanceof No && e.status === 429) return "limit";
  return "store";
}

async function profile(user: Account, body: Json) {
  let username: string | null = null, key: string | null = null, fold: string | null = null;
  if (body.username !== undefined && body.username !== null) {
    if (typeof body.username !== "string") throw new Bad("username");
    const r = checkUsername(body.username);
    if (!r.ok) throw new No(400, r.why);
    [username, key, fold] = [body.username, r.key, r.fold];
  }
  const age = body.age === true;
  let picture: string | null = null; // the base64, if a new picture is given
  if (body.avatar !== undefined && body.avatar !== null) {
    if (typeof body.avatar !== "string") throw new Bad("avatar");
    picture = body.avatar;
  }
  // The cheap checks of a picture come before anything is made or counted.
  let bytes: Uint8Array<ArrayBuffer> | null = null, kind: string | null = null;
  if (picture) {
    bytes = decode(picture);
    kind = imageKind(bytes);
    if (!kind) throw new No(400, "picture");
  }

  // The database decides again under its lock; asking first spares a first profile without the age box, or a
  // blocked account, a call that would be refused.
  const rows = await db("chronia_profiles?select=blocked&user_id=eq." + encodeURIComponent(user.id));
  const had = Array.isArray(rows) && rows.length ? rows[0] : null;
  const save = (avatar: string | null, named: boolean) =>
    rpc("chronia_profile_save", {
      p_user: user.id,
      p_username: named ? username : null,
      p_key: named ? key : null,
      p_avatar: avatar,
      p_age: age,
      p_name_days: NAME_DAYS,
      p_fold: named ? fold : null,
    });

  // A first save makes the profile without the picture, so that a taken name or a missing age box is answered
  // before any paid check, and the picture is then counted against the new profile like any other.
  let made: Json = null;
  if (!had) {
    if (!age) throw new No(400, "age");
    if (!username) throw new Bad("username");
    made = await save(null, true);
    if (!made || !made.ok) refused(made, PICTURE_CAP);
    if (!picture) return { profile: profileOut({ ...made, blocked: false }) };
  } else if (had.blocked) throw new No(403, "blocked");

  let stored: string | null = null; // the new file's name, once uploaded
  let out: Json;
  try {
    if (picture) stored = await newPicture(user, picture, bytes!, kind!);
    try {
      out = await save(picture === null ? null : stored || "", !made);
      if (!out || !out.ok) refused(out, PICTURE_CAP);
    } catch (e) {
      if (stored) await drop([stored]);
      throw e;
    }
  } catch (e) {
    // The profile was made in this request: it stands, without the picture, and the answer says why.
    if (made) return { profile: profileOut({ ...made, blocked: false }), picture_error: pictureError(e) };
    throw e;
  }
  await drop([out.old_avatar, out.removed_avatar]);
  return { profile: profileOut({ ...out, avatar_state: out.avatar_state || "ok", blocked: false }) };
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
  later(sweep);
  return {
    comment: {
      id: out.id,
      username: p.username,
      avatar: profileOut(p).avatar,
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
    target = await holder("username_key", body.user.toLowerCase());
    if (!target) throw new No(404, "missing");
  }
  const out = await rpc("chronia_flag_add", { p_user: user.id, p_comment: n, p_target: target, p_cap: FLAG_CAP, p_hide: HIDE_AT });
  if (!out || !out.ok) {
    if (out && out.error === "field") throw new Bad(hasId ? "id" : "user");
    refused(out, FLAG_CAP);
  }
  // The report that hides a picture takes its file out of the public bucket at once (or, failing that, the sweep).
  if (target && out.hidden === true) {
    await settle(target).catch((e) => console.error(e));
  }
  return { ok: true };
}

async function queue(role: string) {
  const out = await rpc("chronia_queue", {});
  const comments = out && Array.isArray(out.comments) ? out.comments : [];
  const pictures = out && Array.isArray(out.pictures) ? out.pictures : [];
  // Hidden and removed pictures are in the private bucket: the team sees them through signed addresses.
  const sign = await signed([
    ...comments.filter((c: Json) => c.avatar_kept === true).map((c: Json) => c.avatar),
    ...pictures.filter((p: Json) => p.kept === true).map((p: Json) => p.avatar),
  ]);
  const look = (name: unknown, kept: unknown) => (kept === true ? (typeof name === "string" && sign.get(name)) || null : avatarUrl(name));
  later(sweep);
  return {
    role,
    comments: comments.map((c: Json) => ({ ...comment(c, true), avatar: look(c.avatar, c.avatar_kept) })),
    pictures: pictures.map((p: Json) => ({
      username: p.username,
      avatar: look(p.avatar, p.kept),
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
    const c = out.comment || {};
    const sign = c.avatar_kept === true ? await signed([c.avatar]) : new Map<string, string>();
    return { comment: { ...comment(c, true), avatar: c.avatar_kept === true ? sign.get(c.avatar) || null : avatarUrl(c.avatar) } };
  }
  if (action === "block") {
    const out = await rpc("chronia_block", { p_user: uuid(body.user), p_on: on(body.on) });
    if (!out || !out.ok) refused(out, 0);
    return { ok: true };
  }
  if (action === "picture") {
    // The database first: its state is what the page shows. Then the file follows it between the buckets.
    const who = uuid(body.user);
    const out = await rpc("chronia_avatar_set", { p_user: who, p_on: on(body.on) });
    if (!out || !out.ok) refused(out, 0);
    await drop([out.removed_avatar]);
    await settle(who).catch((e) => console.error(e));
    return { ok: true };
  }
  if (action === "move") {
    const from = text(body.from, "from", MAX_NAME), to = text(body.to, "to", MAX_NAME);
    const n = await rpc("chronia_comments_move", { p_from: from, p_to: to });
    return { moved: Number(n) || 0 };
  }
  // erase: the database first, so that nothing points at the files; its trigger puts them in the trash, which is
  // emptied now (and, if that fails, by the next sweep), as it is for a sign-in account deleted in Supabase.
  const out = await rpc("chronia_account_erase", { p_user: uuid(body.user) });
  if (!out || !out.ok) refused(out, 0);
  await emptyTrash().catch((e) => console.error(e));
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

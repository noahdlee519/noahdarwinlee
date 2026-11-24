// Tests for the chronia-comments edge function. Run with `deno test` from this folder: no network and no
// permissions are needed, since the environment, Deno.serve, and fetch are replaced by stand-ins here. The
// stand-in fetch plays the database's RPC and table endpoints, the sign-in server, the storage API, and the
// Anthropic API; it records what was asked of each, and can be told to fail.

const BASE = "https://db.test";
const SECRET = "sb_secret_TESTKEY_never_echoed";
const CLAUDE_KEY = "sk-ant-TESTKEY_never_echoed";
const env: Record<string, string> = {
  SUPABASE_URL: BASE,
  SUPABASE_SECRET_KEYS: JSON.stringify({ default: SECRET }),
  ANTHROPIC_API_KEY: CLAUDE_KEY,
};
Object.defineProperty(Deno, "env", {
  value: { get: (k: string) => env[k], set: (k: string, v: string) => (env[k] = v), delete: (k: string) => delete env[k] },
  configurable: true,
});
Object.defineProperty(Deno, "serve", { value: () => ({}), configurable: true });
const { handle } = await import("./index.ts");

// ---------------------------------------------------------------- the stand-in world

// deno-lint-ignore no-explicit-any
type Json = any;
type Call = { kind: string; name: string; method: string; url: string; headers: Headers; body: Json };
type Profile = { username: string; blocked?: boolean };

const ALICE = "a11ce000-0000-4000-8000-000000000001";
const BOB = "b0b00000-0000-4000-8000-000000000002";
const VERA = "7e7a0000-0000-4000-8000-000000000003"; // a viewer on the team
const RITA = "717a0000-0000-4000-8000-000000000004"; // a reviewer
const EVE = "e7e00000-0000-4000-8000-000000000005"; // signed in by email, not Google
const TOKENS: Record<string, string> = {
  alice: "tok-alice-0123456789abcdef",
  bob: "tok-bob-0123456789abcdefgh",
  vera: "tok-vera-0123456789abcdefg",
  rita: "tok-rita-0123456789abcdefg",
  eve: "tok-eve-0123456789abcdefgh",
  stale: "tok-stale-0123456789abcdef",
};

class World {
  calls: Call[] = [];
  users = new Map<string, { id: string; provider: string }>([
    [TOKENS.alice, { id: ALICE, provider: "google" }],
    [TOKENS.bob, { id: BOB, provider: "google" }],
    [TOKENS.vera, { id: VERA, provider: "google" }],
    [TOKENS.rita, { id: RITA, provider: "google" }],
    [TOKENS.eve, { id: EVE, provider: "email" }],
  ]);
  team = new Map<string, string>([[VERA, "viewer"], [RITA, "reviewer"]]);
  profiles = new Map<string, Profile>([[BOB, { username: "Thucydides" }]]);
  rpc: Record<string, (a: Json) => Json> = {};
  claude: string = "ok"; // the model's answer, or "down" (unreachable), "error" (a 500), "hang" (never answers)
  fail = new Set<string>(); // "auth", "upload", "remove", "rpc:<name>"
  seen(kind: string, name?: string) {
    return this.calls.filter((c) => c.kind === kind && (name === undefined || c.name === name));
  }
  order() {
    return this.calls.filter((c) => c.kind !== "auth" && !(c.kind === "table" && c.name === "chronia_team")).map((c) => c.kind + ":" + c.name);
  }
}

let world = new World();

function answer(status: number, body: Json) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

globalThis.fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers);
  let body: Json = init.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (_) { /* a raw body stays as it is */ }
  }
  const rec = (kind: string, name: string) => world.calls.push({ kind, name, method, url: url.href, headers, body });

  if (url.origin === "https://api.anthropic.com" && url.pathname === "/v1/messages") {
    rec("claude", "messages");
    if (world.claude === "down") throw new TypeError("connection refused");
    if (world.claude === "error") return answer(500, { type: "error" });
    if (world.claude === "hang") {
      return await new Promise<Response>((_, reject) => {
        const signal = init.signal;
        if (!signal) return; // never settles: the function must have a timeout
        signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    }
    return answer(200, { model: "claude-haiku-5-5", stop_reason: "end_turn", content: [{ type: "text", text: world.claude }] });
  }
  if (url.origin !== BASE) throw new Error("unexpected fetch to " + url.origin);

  if (url.pathname === "/auth/v1/user") {
    rec("auth", "user");
    if (world.fail.has("auth")) throw new TypeError("auth down");
    const token = (headers.get("authorization") || "").replace(/^Bearer /, "");
    const u = world.users.get(token);
    if (!u) return answer(401, { msg: "bad jwt" });
    return answer(200, { id: u.id, email: u.id + "@example.com", app_metadata: { provider: u.provider, providers: [u.provider] }, user_metadata: {} });
  }
  if (url.pathname.startsWith("/rest/v1/rpc/")) {
    const name = url.pathname.slice("/rest/v1/rpc/".length);
    rec("rpc", name);
    if (world.fail.has("rpc:" + name)) return answer(500, { code: "XX000", message: "boom with user text <secret>" });
    const f = world.rpc[name];
    if (!f) throw new Error("no stand-in for rpc " + name);
    return answer(200, f(body));
  }
  if (url.pathname === "/rest/v1/chronia_team") {
    rec("table", "chronia_team");
    const id = (url.searchParams.get("user_id") || "").replace(/^eq\./, "");
    const role = world.team.get(id);
    return answer(200, role ? [{ role }] : []);
  }
  if (url.pathname === "/rest/v1/chronia_profiles") {
    rec("table", "chronia_profiles");
    const key = url.searchParams.get("username_key"), id = url.searchParams.get("user_id");
    const rows = [...world.profiles.entries()].filter(([uid, p]) =>
      (key === null || "eq." + p.username.toLowerCase() === key) && (id === null || "eq." + uid === id)
    ).map(([uid, p]) => ({ user_id: uid, blocked: !!p.blocked }));
    return answer(200, rows);
  }
  if (url.pathname.startsWith("/storage/v1/object/chronia-avatars/") && method === "POST") {
    rec("upload", url.pathname.slice("/storage/v1/object/chronia-avatars/".length));
    if (world.fail.has("upload")) return answer(500, { error: "storage down" });
    return answer(200, { Key: "chronia-avatars/x" });
  }
  if (url.pathname === "/storage/v1/object/chronia-avatars" && method === "DELETE") {
    rec("remove", (body && body.prefixes || []).join(","));
    if (world.fail.has("remove")) return answer(500, { error: "storage down" });
    return answer(200, []);
  }
  throw new Error("unexpected fetch to " + url.pathname);
};

type Got = { status: number; body: Json; text: string; headers: Headers };

async function ask(body: Json, opts: { as?: string; origin?: string | null; method?: string; raw?: string } = {}): Promise<Got> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const origin = opts.origin === undefined ? "https://chroniaatlas.com" : opts.origin;
  if (origin) headers.origin = origin;
  if (opts.as) headers.authorization = "Bearer " + (TOKENS[opts.as] || opts.as);
  const method = opts.method || "POST";
  const req = new Request("https://fn.test/chronia-comments", {
    method,
    headers,
    body: method === "GET" || method === "OPTIONS" ? undefined : opts.raw !== undefined ? opts.raw : JSON.stringify(body),
  });
  const res = await handle(req);
  const text = await res.text();
  let parsed: Json = null;
  try {
    parsed = JSON.parse(text);
  } catch (_) { /* not JSON */ }
  return { status: res.status, body: parsed, text, headers: res.headers };
}

function eq(got: unknown, want: unknown, what: string) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) throw new Error(`${what}: got ${g}, wanted ${w}`);
}

function ok(cond: unknown, what: string) {
  if (!cond) throw new Error(what);
}

function err(got: Got, status: number, code: string, what: string, extra: Record<string, unknown> = {}) {
  eq({ status: got.status, body: got.body }, { status, body: { error: code, ...extra } }, what);
}

function clean(got: Got, what: string, ids: string[] = []) {
  for (const s of [SECRET, CLAUDE_KEY, ...Object.values(TOKENS), ...ids]) ok(!got.text.includes(s), what + ": the answer holds no secret, token, or account id");
}

const URL_OF = (name: string) => BASE + "/storage/v1/object/public/chronia-avatars/" + name;

function test(name: string, fn: () => Promise<void>) {
  Deno.test(name, async () => {
    world = new World();
    await fn();
  });
}

// ---------------------------------------------------------------- transport

test("OPTIONS from an allowed origin is answered for CORS", async () => {
  const got = await ask(null, { method: "OPTIONS" });
  eq(got.status, 204, "status");
  eq(got.headers.get("access-control-allow-origin"), "https://chroniaatlas.com", "allowed origin");
  ok((got.headers.get("access-control-allow-headers") || "").includes("authorization"), "authorization header allowed");
});

test("the www origin and a local copy are allowed", async () => {
  world.rpc.chronia_thread = () => ({ comments: [], more: false, total: 0 });
  for (const origin of ["https://www.chroniaatlas.com", "http://localhost:8000", "http://127.0.0.1:5173"]) {
    const got = await ask({ action: "list", names: ["France"] }, { origin });
    eq(got.status, 200, origin);
    eq(got.headers.get("access-control-allow-origin"), origin, origin + " CORS");
  }
});

test("a wrong origin, or none, is 403 and asks nothing of the database", async () => {
  for (const origin of ["https://evil.example", "https://chroniaatlas.com.evil.example", "http://localhost.evil.example", null]) {
    const got = await ask({ action: "list", names: ["France"] }, { origin });
    eq(got.status, 403, String(origin));
  }
  eq(world.calls.length, 0, "no calls");
});

test("a method other than POST is 405", async () => {
  for (const method of ["GET", "PUT", "DELETE"]) {
    const got = await ask({ action: "list" }, { method });
    eq(got.status, 405, method);
  }
});

test("a body over 400,000 characters is 413 long; one just under is read", async () => {
  world.rpc.chronia_thread = () => ({ comments: [], more: false, total: 0 });
  const pad = "x".repeat(400_001 - JSON.stringify({ action: "list", names: ["France"], pad: "" }).length);
  err(await ask(null, { raw: JSON.stringify({ action: "list", names: ["France"], pad }) }), 413, "long", "over");
  const fits = pad.slice(1);
  eq((await ask(null, { raw: JSON.stringify({ action: "list", names: ["France"], pad: fits }) })).status, 200, "at the limit");
});

test("a body that is not a JSON object is 400 body", async () => {
  for (const raw of ["", "{", "[1]", "null", "\"list\""]) err(await ask(null, { raw }), 400, "body", JSON.stringify(raw));
});

test("an unknown action is 400 action", async () => {
  err(await ask({ action: "drop_tables" }), 400, "action", "unknown");
  err(await ask({}), 400, "action", "none");
});

// ---------------------------------------------------------------- list

const ROW = { id: 7, username: "Thucydides", avatar: "b1.webp", polity: "Athens", at: "-0431", text: "The war begins", mine: false };

test("list needs no sign-in and asks for a public thread", async () => {
  world.rpc.chronia_thread = () => ({ comments: [ROW, { ...ROW, id: 8, avatar: null }], more: true, total: 25 });
  const got = await ask({ action: "list", names: ["Athens", "Delian League"] });
  eq(got.status, 200, "status");
  eq(got.body, {
    comments: [{ ...ROW, avatar: URL_OF("b1.webp") }, { ...ROW, id: 8, avatar: null }],
    more: true,
    total: 25,
  }, "answer");
  const call = world.seen("rpc", "chronia_thread")[0];
  eq(call.body, { p_names: ["Athens", "Delian League"], p_sort: "new", p_at_num: null, p_offset: 0, p_limit: 20, p_viewer: null, p_team: false }, "rpc args");
  eq(call.headers.get("apikey"), SECRET, "the database is asked with the secret key");
  eq(world.seen("auth").length, 0, "no sign-in check without a token");
});

test("list never passes on team fields to the public, even if the database sent them", async () => {
  world.rpc.chronia_thread = () => ({ comments: [{ ...ROW, user: BOB, flags: 2, state: "live" }], more: false, total: 1 });
  const got = await ask({ action: "list", names: ["Athens"] });
  eq(Object.keys(got.body.comments[0]).sort(), ["at", "avatar", "id", "mine", "polity", "text", "username"], "public fields only");
  clean(got, "list", [BOB]);
});

test("list with a stale token is served as signed out", async () => {
  world.rpc.chronia_thread = () => ({ comments: [ROW], more: false, total: 1 });
  const got = await ask({ action: "list", names: ["Athens"] }, { as: "stale" });
  eq(got.status, 200, "status");
  eq(world.seen("rpc", "chronia_thread")[0].body.p_viewer, null, "no viewer");
  eq(got.body.role, undefined, "no role");
});

test("list with the sign-in server down is served as signed out", async () => {
  world.rpc.chronia_thread = () => ({ comments: [], more: false, total: 0 });
  world.fail.add("auth");
  const got = await ask({ action: "list", names: ["Athens"] }, { as: "alice" });
  eq(got.status, 200, "status");
  eq(world.seen("rpc", "chronia_thread")[0].body.p_viewer, null, "no viewer");
});

test("list signed in passes the viewer, for mine, and no team fields", async () => {
  world.rpc.chronia_thread = () => ({ comments: [{ ...ROW, mine: true }], more: false, total: 1 });
  const got = await ask({ action: "list", names: ["Athens"] }, { as: "alice" });
  const call = world.seen("rpc", "chronia_thread")[0];
  eq([call.body.p_viewer, call.body.p_team], [ALICE, false], "viewer, not team");
  eq(got.body.comments[0].mine, true, "mine");
  eq(got.body.role, undefined, "no role off the team");
  ok(!("user" in got.body.comments[0]), "no account id");
});

test("list for a team member asks for and passes on the team's fields", async () => {
  world.rpc.chronia_thread = () => ({ comments: [{ ...ROW, user: BOB, flags: 2, state: "live" }], more: false, total: 1 });
  const got = await ask({ action: "list", names: ["Athens"] }, { as: "vera" });
  eq(world.seen("rpc", "chronia_thread")[0].body.p_team, true, "team flag");
  eq(got.body.comments[0], { ...ROW, avatar: URL_OF("b1.webp"), flags: 2, state: "live", user: BOB }, "team fields");
  eq(got.body.role, "viewer", "role");
});

test("list near passes the date as a number, and the offset", async () => {
  world.rpc.chronia_thread = () => ({ comments: [], more: false, total: 0 });
  await ask({ action: "list", names: ["France"], sort: "near", at: "1789-07-14", offset: 40 });
  const a = world.seen("rpc", "chronia_thread")[0].body;
  eq([a.p_sort, a.p_offset], ["near", 40], "sort and offset");
  ok(a.p_at_num > 1789.5 && a.p_at_num < 1789.6, "at as a number: " + a.p_at_num);
});

test("list refuses bad names, sort, date, and offset with 400 field", async () => {
  world.rpc.chronia_thread = () => ({ comments: [], more: false, total: 0 });
  const bad: [Json, string][] = [
    [{}, "names"],
    [{ names: [] }, "names"],
    [{ names: "France" }, "names"],
    [{ names: Array(61).fill("France") }, "names"],
    [{ names: ["x".repeat(201)] }, "names"],
    [{ names: [""] }, "names"],
    [{ names: [7] }, "names"],
    [{ names: ["France"], sort: "old" }, "sort"],
    [{ names: ["France"], sort: "near" }, "at"],
    [{ names: ["France"], sort: "near", at: "July 1789" }, "at"],
    [{ names: ["France"], sort: "near", at: "1789-13-01" }, "at"],
    [{ names: ["France"], offset: -1 }, "offset"],
    [{ names: ["France"], offset: 1.5 }, "offset"],
    [{ names: ["France"], offset: "20" }, "offset"],
  ];
  for (const [b, field] of bad) err(await ask({ action: "list", ...b }), 400, "field", JSON.stringify(b), { field });
  eq(world.seen("rpc").length, 0, "nothing asked of the database");
  eq((await ask({ action: "list", names: Array(60).fill("x".repeat(200)) })).status, 200, "60 names of 200 characters pass");
});

test("names with quotes and angle brackets reach the database as JSON, untouched", async () => {
  world.rpc.chronia_thread = () => ({ comments: [], more: false, total: 0 });
  const name = `"Kingdom" of <b>France</b>' & co`;
  await ask({ action: "list", names: [name] });
  const call = world.seen("rpc", "chronia_thread")[0];
  eq(call.body.p_names, [name], "untouched");
  ok(!call.url.includes("France"), "not in the URL");
});

test("list with the database down is 500 store, without the database's text", async () => {
  world.fail.add("rpc:chronia_thread");
  const got = await ask({ action: "list", names: ["France"] });
  err(got, 500, "store", "store");
});

// ---------------------------------------------------------------- me

test("me needs a sign-in, by Google", async () => {
  err(await ask({ action: "me" }), 401, "signin", "no token");
  err(await ask({ action: "me" }, { as: "stale" }), 401, "signin", "stale token");
  err(await ask({ action: "me" }, { as: "eve" }), 401, "signin", "not Google");
});

test("me with the sign-in server down is 500 auth", async () => {
  world.fail.add("auth");
  err(await ask({ action: "me" }, { as: "alice" }), 500, "auth", "auth");
});

test("me for an account with no profile", async () => {
  world.rpc.chronia_me = () => ({ profile: null, left: 100 });
  const got = await ask({ action: "me" }, { as: "alice" });
  eq(got.body, { profile: null, left: 100, cap: 100, role: null }, "answer");
  eq(world.seen("rpc", "chronia_me")[0].body, { p_user: ALICE, p_cap: 100 }, "rpc args");
});

test("me gives the profile with its picture's URL, and the role", async () => {
  world.rpc.chronia_me = () => ({ profile: { username: "Rita", avatar: "r1.webp", avatar_state: "ok", blocked: false, named_at: "2026-11-01" }, left: 97 });
  const got = await ask({ action: "me" }, { as: "rita" });
  eq(got.body, { profile: { username: "Rita", avatar: URL_OF("r1.webp"), blocked: false }, left: 97, cap: 100, role: "reviewer" }, "answer");
});

test("me shows no picture that is hidden or removed", async () => {
  world.rpc.chronia_me = () => ({ profile: { username: "Alice", avatar: "a1.webp", avatar_state: "hidden", blocked: true }, left: 0 });
  const got = await ask({ action: "me" }, { as: "alice" });
  eq(got.body.profile, { username: "Alice", avatar: null, blocked: true }, "profile");
});

// ---------------------------------------------------------------- name

test("name needs a sign-in", async () => {
  err(await ask({ action: "name", username: "Herodotus" }), 401, "signin", "signed out");
});

test("name answers 200 with why for a name the rules refuse", async () => {
  for (const [username, why] of [["ab", "shape"], ["9lives", "shape"], ["admin", "reserved"], ["Adm1n", "reserved"], ["sh" + "it_head", "word"]]) {
    const got = await ask({ action: "name", username }, { as: "alice" });
    eq({ status: got.status, body: got.body }, { status: 200, body: { ok: false, why } }, username);
  }
  eq(world.seen("table", "chronia_profiles").length, 0, "the database is not asked about refused names");
});

test("name is taken when another account holds its lowercase key", async () => {
  const got = await ask({ action: "name", username: "THUCYDIDES" }, { as: "alice" });
  eq(got.body, { ok: false, why: "taken" }, "taken");
  ok(world.seen("table", "chronia_profiles")[0].url.includes("username_key=eq.thucydides"), "asked by the lowercase key");
  clean(got, "name", [BOB]);
});

test("name is free when no one holds it, or the caller does", async () => {
  eq((await ask({ action: "name", username: "Herodotus" }, { as: "alice" })).body, { ok: true }, "free");
  eq((await ask({ action: "name", username: "thucydides" }, { as: "bob" })).body, { ok: true }, "one's own");
});

test("name without a string is 400 field", async () => {
  err(await ask({ action: "name", username: 7 }, { as: "alice" }), 400, "field", "number", { field: "username" });
});

// ---------------------------------------------------------------- post

const ME_BOB = () => ({ profile: { username: "Thucydides", avatar: "b1.webp", avatar_state: "ok", blocked: false }, left: 99 });

function posting() {
  world.rpc.chronia_me = ME_BOB;
  world.rpc.chronia_comment_send = () => ({ id: 41, sent: "2026-11-24T12:00:00Z", left: 98 });
}

const POST = { action: "post", name: "Athens", at: "-0431", text: "The war begins." };

test("post needs a sign-in", async () => {
  posting();
  err(await ask(POST), 401, "signin", "signed out");
  err(await ask(POST, { as: "stale" }), 401, "signin", "stale");
  eq(world.seen("rpc").length, 0, "nothing sent");
});

test("post lands a comment and answers it, with the day's comments left", async () => {
  posting();
  const got = await ask(POST, { as: "bob" });
  eq(got.status, 200, "status");
  eq(got.body, {
    comment: { id: 41, username: "Thucydides", avatar: URL_OF("b1.webp"), polity: "Athens", at: "-0431", text: "The war begins.", mine: true },
    left: 98,
  }, "answer");
  const a = world.seen("rpc", "chronia_comment_send")[0].body;
  eq({ ...a, p_at_num: undefined }, { p_user: BOB, p_polity: "Athens", p_at: "-0431", p_body: "The war begins.", p_cap: 100, p_gap_s: 10 }, "rpc args");
  eq(a.p_at_num, -431, "at as a number");
});

test("post refuses a word, a link, a long text, or none with 400, and sends nothing", async () => {
  posting();
  const cases: [string, string][] = [
    ["you " + "fu" + "ck" + "ing idiot", "word"],
    ["see http://x.co for more", "link"],
    ["www.example.com", "link"],
    ["x".repeat(501), "long"],
    ["   ", "empty"],
  ];
  for (const [text, code] of cases) err(await ask({ ...POST, text }, { as: "bob" }), 400, code, code);
  eq(world.seen("rpc").length, 0, "nothing sent to the database");
  eq((await ask({ ...POST, text: "x".repeat(500) }, { as: "bob" })).status, 200, "500 characters pass");
});

test("post lets history's own words through", async () => {
  posting();
  for (const text of ["The Rape of Nanjing", "Nazi Germany", "the slave trade", "Essex"]) {
    eq((await ask({ ...POST, text }, { as: "bob" })).status, 200, text);
  }
});

test("post refuses a bad name or date with 400 field", async () => {
  posting();
  const bad: [Json, string][] = [
    [{ name: undefined }, "name"],
    [{ name: "" }, "name"],
    [{ name: "x".repeat(201) }, "name"],
    [{ name: ["Athens"] }, "name"],
    [{ at: undefined }, "at"],
    [{ at: "431 BC" }, "at"],
    [{ at: "1789-02-30" }, "at"],
    [{ at: 1789 }, "at"],
    [{ text: undefined }, "text"],
  ];
  for (const [b, field] of bad) err(await ask({ ...POST, ...b }, { as: "bob" }), 400, "field", JSON.stringify(b), { field });
  eq(world.seen("rpc", "chronia_comment_send").length, 0, "nothing sent");
});

test("post from an account with no profile is 403 profile", async () => {
  posting();
  world.rpc.chronia_me = () => ({ profile: null, left: 100 });
  err(await ask(POST, { as: "alice" }), 403, "profile", "no profile");
  eq(world.seen("rpc", "chronia_comment_send").length, 0, "nothing sent");
  world.rpc.chronia_me = ME_BOB; // the profile gone between the two calls: the database decides
  world.rpc.chronia_comment_send = () => ({ error: "profile" });
  err(await ask(POST, { as: "alice" }), 403, "profile", "the database refuses");
});

test("post from a blocked account is 403 blocked", async () => {
  posting();
  world.rpc.chronia_me = () => ({ profile: { ...ME_BOB().profile, blocked: true }, left: 99 });
  err(await ask(POST, { as: "bob" }), 403, "blocked", "blocked");
  eq(world.seen("rpc", "chronia_comment_send").length, 0, "nothing sent");
  world.rpc.chronia_me = ME_BOB;
  world.rpc.chronia_comment_send = () => ({ error: "blocked" });
  err(await ask(POST, { as: "bob" }), 403, "blocked", "the database refuses");
});

test("post past the day's cap is 429 limit, and too soon is 429 fast with the wait", async () => {
  posting();
  world.rpc.chronia_comment_send = () => ({ error: "limit" });
  err(await ask(POST, { as: "bob" }), 429, "limit", "limit", { cap: 100 });
  world.rpc.chronia_comment_send = () => ({ error: "fast", wait: 7 });
  err(await ask(POST, { as: "bob" }), 429, "fast", "fast", { wait: 7 });
});

test("post with the database down is 500 store", async () => {
  posting();
  world.fail.add("rpc:chronia_comment_send");
  err(await ask(POST, { as: "bob" }), 500, "store", "store");
});

test("a comment with quotes and angle brackets passes through as JSON, untouched", async () => {
  posting();
  const text = `He said "<script>alert('x')</script>" & left`;
  const name = `"Kingdom" <of> 'France'`;
  const got = await ask({ ...POST, text, name }, { as: "bob" });
  const call = world.seen("rpc", "chronia_comment_send")[0];
  eq([call.body.p_body, call.body.p_polity], [text, name], "sent untouched");
  ok(!call.url.includes("script") && !call.url.includes("France"), "not in the URL");
  eq([got.body.comment.text, got.body.comment.polity], [text, name], "answered untouched");
});

// ---------------------------------------------------------------- delete

test("delete erases one's own comment", async () => {
  world.rpc.chronia_comment_delete = () => ({ ok: true });
  const got = await ask({ action: "delete", id: 41 }, { as: "bob" });
  eq(got.body, { ok: true }, "answer");
  eq(world.seen("rpc", "chronia_comment_delete")[0].body, { p_user: BOB, p_comment: 41 }, "rpc args");
});

test("delete of another's comment is 404 missing off the team, and changes nothing", async () => {
  world.rpc.chronia_comment_delete = () => ({ error: "missing" });
  world.rpc.chronia_comment_remove = () => ({ ok: true, comment: {} });
  err(await ask({ action: "delete", id: 41 }, { as: "alice" }), 404, "missing", "alice");
  err(await ask({ action: "delete", id: 41 }, { as: "vera" }), 404, "missing", "a viewer");
  eq(world.seen("rpc", "chronia_comment_remove").length, 0, "nothing removed");
});

test("a reviewer's delete of another's comment marks it removed", async () => {
  world.rpc.chronia_comment_delete = () => ({ error: "missing" });
  world.rpc.chronia_comment_remove = () => ({ ok: true, comment: { id: 41, state: "removed" } });
  eq((await ask({ action: "delete", id: 41 }, { as: "rita" })).body, { ok: true }, "answer");
  eq(world.seen("rpc", "chronia_comment_remove")[0].body, { p_comment: 41 }, "removed");
  world.rpc.chronia_comment_remove = () => ({ error: "missing" });
  err(await ask({ action: "delete", id: 42 }, { as: "rita" }), 404, "missing", "not there");
});

test("delete needs a sign-in and a whole id", async () => {
  err(await ask({ action: "delete", id: 41 }), 401, "signin", "signed out");
  for (const v of [undefined, 0, 1.5, "41", -3]) err(await ask({ action: "delete", id: v }, { as: "bob" }), 400, "field", String(v), { field: "id" });
});

// ---------------------------------------------------------------- flag

test("flag a comment", async () => {
  world.rpc.chronia_flag_add = () => ({ ok: true, flags: 1, hidden: false });
  eq((await ask({ action: "flag", id: 41 }, { as: "alice" })).body, { ok: true }, "answer");
  eq(world.seen("rpc", "chronia_flag_add")[0].body, { p_user: ALICE, p_comment: 41, p_target: null, p_cap: 20, p_hide: 3 }, "rpc args");
  world.rpc.chronia_flag_add = () => ({ ok: true, flags: 1, hidden: false, again: true });
  eq((await ask({ action: "flag", id: 41 }, { as: "alice" })).body, { ok: true }, "twice is still ok");
});

test("flag a picture by its username, looked up by its lowercase key", async () => {
  world.rpc.chronia_flag_add = () => ({ ok: true, flags: 3, hidden: true });
  const got = await ask({ action: "flag", user: "THUCYDIDES" }, { as: "alice" });
  eq(got.body, { ok: true }, "answer");
  ok(world.seen("table", "chronia_profiles")[0].url.includes("username_key=eq.thucydides"), "looked up by key");
  eq(world.seen("rpc", "chronia_flag_add")[0].body, { p_user: ALICE, p_comment: null, p_target: BOB, p_cap: 20, p_hide: 3 }, "rpc args");
  clean(got, "flag", [BOB]);
});

test("flag of an unknown username is 404, and a malformed one 400", async () => {
  world.rpc.chronia_flag_add = () => ({ ok: true });
  err(await ask({ action: "flag", user: "Nobody_here" }, { as: "alice" }), 404, "missing", "unknown");
  err(await ask({ action: "flag", user: "x'; drop" }, { as: "alice" }), 400, "field", "malformed", { field: "user" });
  eq(world.seen("table", "chronia_profiles").length, 1, "only the well-formed name is looked up");
  eq(world.seen("rpc", "chronia_flag_add").length, 0, "nothing flagged");
});

test("flag needs one of id and user", async () => {
  err(await ask({ action: "flag" }, { as: "alice" }), 400, "field", "neither", { field: "id" });
  err(await ask({ action: "flag", id: 41, user: "Thucydides" }, { as: "alice" }), 400, "field", "both", { field: "id" });
  err(await ask({ action: "flag", id: "41" }, { as: "alice" }), 400, "field", "a string id", { field: "id" });
});

test("flag maps the database's refusals", async () => {
  const cases: [Json, number, string, Record<string, unknown>][] = [
    [{ error: "profile" }, 403, "profile", {}],
    [{ error: "blocked" }, 403, "blocked", {}],
    [{ error: "own" }, 403, "own", {}],
    [{ error: "missing" }, 404, "missing", {}],
    [{ error: "limit" }, 429, "limit", { cap: 20 }],
  ];
  for (const [out, status, code, extra] of cases) {
    world.rpc.chronia_flag_add = () => out;
    err(await ask({ action: "flag", id: 41 }, { as: "alice" }), status, code, code, extra);
  }
  err(await ask({ action: "flag", id: 41 }), 401, "signin", "signed out");
});

// ---------------------------------------------------------------- profile and pictures

function picture(kind: "webp" | "jpeg" | "png" | "text", size = 64): Uint8Array {
  const head = {
    webp: [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
    jpeg: [0xff, 0xd8, 0xff, 0xe0],
    png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    text: [...new TextEncoder().encode("hello, not a picture")],
  }[kind];
  const out = new Uint8Array(Math.max(size, head.length));
  out.set(head);
  for (let i = head.length; i < out.length; i++) out[i] = i % 251;
  return out;
}

function b64(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

const NEW_FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(webp|jpg|png)$/;

// Bob has a profile, a picture (old.webp), and a removed one the team still keeps (kept.webp).
function profiling() {
  world.rpc.chronia_avatar_count = () => ({ ok: true, left: 4 });
  world.rpc.chronia_profile_save = (a: Json) => ({
    ok: true,
    username: a.p_username || "Thucydides",
    avatar: a.p_avatar === null ? "old.webp" : a.p_avatar || null,
    avatar_state: "ok",
    old_avatar: a.p_avatar === null ? null : "old.webp",
    removed_avatar: a.p_avatar === null ? null : "kept.webp",
  });
}

function nothingStored(what: string) {
  eq(world.seen("upload").length, 0, what + ": nothing uploaded");
  eq(world.seen("rpc", "chronia_profile_save").length, 0, what + ": nothing saved");
  eq(world.seen("remove").length, 0, what + ": nothing deleted, so the old picture is kept");
}

test("profile needs a sign-in", async () => {
  profiling();
  err(await ask({ action: "profile", username: "Herodotus", age: true }), 401, "signin", "signed out");
});

test("a first profile is made with a username and the age box", async () => {
  profiling();
  const got = await ask({ action: "profile", username: "Herodotus", age: true }, { as: "alice" });
  eq(got.body, { profile: { username: "Herodotus", avatar: URL_OF("old.webp"), blocked: false } }, "answer");
  eq(world.seen("rpc", "chronia_profile_save")[0].body, {
    p_user: ALICE, p_username: "Herodotus", p_key: "herodotus", p_avatar: null, p_age: true, p_name_days: 30,
  }, "rpc args");
});

test("a first profile without the age box is 400 age, and nothing is checked or stored", async () => {
  profiling();
  for (const age of [undefined, false, "true", 1]) {
    err(await ask({ action: "profile", username: "Herodotus", age, avatar: b64(picture("webp")) }, { as: "alice" }), 400, "age", String(age));
  }
  eq(world.seen("rpc", "chronia_avatar_count").length + world.seen("claude").length, 0, "no count, no check");
  nothingStored("age");
  world.rpc.chronia_profile_save = () => ({ error: "age" }); // the database's own refusal, as a backstop
  world.profiles.set(ALICE, { username: "Herodotus" });
  err(await ask({ action: "profile", username: "Herodotus" }, { as: "alice" }), 400, "age", "the database refuses");
});

test("a first profile without a username is 400 field", async () => {
  profiling();
  err(await ask({ action: "profile", age: true }, { as: "alice" }), 400, "field", "no username", { field: "username" });
  nothingStored("no username");
});

test("a username the rules refuse is 400 with the reason as the code", async () => {
  profiling();
  for (const [username, code] of [["ab", "shape"], ["Herodotus!", "shape"], ["Moderator", "reserved"], ["sh" + "it_lord", "word"]]) {
    err(await ask({ action: "profile", username, age: true }, { as: "alice" }), 400, code, username);
  }
  err(await ask({ action: "profile", username: 42, age: true }, { as: "alice" }), 400, "field", "a number", { field: "username" });
  nothingStored("refused names");
});

test("a later change needs no age box, and maps taken and soon", async () => {
  profiling();
  eq((await ask({ action: "profile", username: "Thucydides_2" }, { as: "bob" })).status, 200, "a rename");
  eq(world.seen("rpc", "chronia_profile_save")[0].body.p_age, false, "no age box sent");
  world.rpc.chronia_profile_save = () => ({ error: "taken" });
  err(await ask({ action: "profile", username: "Herodotus" }, { as: "bob" }), 409, "taken", "taken");
  world.rpc.chronia_profile_save = () => ({ error: "soon", days: 12 });
  err(await ask({ action: "profile", username: "Herodotus" }, { as: "bob" }), 409, "soon", "soon", { days: 12 });
  world.rpc.chronia_profile_save = () => ({ error: "field" });
  err(await ask({ action: "profile" }, { as: "bob" }), 400, "field", "field", { field: "username" });
});

test("a blocked account's profile is 403 blocked before any picture work", async () => {
  profiling();
  world.profiles.set(BOB, { username: "Thucydides", blocked: true });
  err(await ask({ action: "profile", avatar: b64(picture("webp")) }, { as: "bob" }), 403, "blocked", "blocked");
  eq(world.seen("claude").length, 0, "no check");
  nothingStored("blocked");
  world.profiles.set(BOB, { username: "Thucydides" }); // blocked between the two calls: the database decides
  world.rpc.chronia_profile_save = () => ({ error: "blocked" });
  err(await ask({ action: "profile", username: "Thucydides_2" }, { as: "bob" }), 403, "blocked", "the database refuses");
});

test("a picture is counted, checked, uploaded, saved, and the old files deleted, in that order", async () => {
  profiling();
  const bytes = picture("webp", 5000);
  const got = await ask({ action: "profile", avatar: b64(bytes) }, { as: "bob" });
  eq(got.status, 200, "status " + got.text);
  const up = world.seen("upload")[0];
  ok(NEW_FILE.test(up.name) && up.name.endsWith(".webp"), "an unguessable name: " + up.name);
  eq(world.order(), [
    "table:chronia_profiles", "rpc:chronia_avatar_count", "claude:messages", "upload:" + up.name, "rpc:chronia_profile_save", "remove:old.webp,kept.webp",
  ], "order");
  eq(world.seen("rpc", "chronia_avatar_count")[0].body, { p_user: BOB, p_cap: 5 }, "count args");
  eq([...new Uint8Array(up.body as Uint8Array)], [...bytes], "the bytes uploaded are the picture's");
  eq([up.headers.get("content-type"), up.headers.get("apikey")], ["image/webp", SECRET], "upload headers");
  const save = world.seen("rpc", "chronia_profile_save")[0].body;
  eq([save.p_avatar, save.p_username, save.p_key], [up.name, null, null], "saved under the new name");
  eq(got.body, { profile: { username: "Thucydides", avatar: URL_OF(up.name), blocked: false } }, "answer");
  clean(got, "profile");
});

test("the check sends the picture to Claude with one short instruction", async () => {
  profiling();
  const data = b64(picture("png", 300));
  await ask({ action: "profile", avatar: data }, { as: "bob" });
  const c = world.seen("claude")[0];
  eq([c.headers.get("x-api-key"), c.headers.get("anthropic-version")], [CLAUDE_KEY, "2023-06-01"], "headers");
  eq(c.body.model, "claude-haiku-5-5", "model");
  ok(c.body.max_tokens <= 10, "a short answer");
  eq(c.body.messages.length, 1, "one message");
  const [img, say] = c.body.messages[0].content;
  eq(img, { type: "image", source: { type: "base64", media_type: "image/png", data } }, "the image");
  ok(/\bok\b/.test(say.text) && /\bno\b/.test(say.text) && /nudity|sexual/.test(say.text) && /violence/.test(say.text) && /hate symbol/.test(say.text),
    "the instruction asks for ok or no, and names what to refuse");
  ok(NEW_FILE.test(world.seen("upload")[0].name) && world.seen("upload")[0].name.endsWith(".png"), "a PNG keeps its kind");
});

test("a JPEG is stored as .jpg", async () => {
  profiling();
  await ask({ action: "profile", avatar: b64(picture("jpeg")) }, { as: "bob" });
  ok(world.seen("upload")[0].name.endsWith(".jpg"), "jpg");
  eq(world.seen("upload")[0].headers.get("content-type"), "image/jpeg", "content type");
});

test("a picture over 200 KB is 413 long, and nothing is counted, checked, or stored", async () => {
  profiling();
  err(await ask({ action: "profile", avatar: b64(picture("webp", 200 * 1024 + 1)) }, { as: "bob" }), 413, "long", "over");
  err(await ask({ action: "profile", avatar: "A".repeat(300_000) }, { as: "bob" }), 413, "long", "far over");
  eq(world.seen("rpc", "chronia_avatar_count").length + world.seen("claude").length, 0, "no count, no check");
  nothingStored("over");
  eq((await ask({ action: "profile", avatar: b64(picture("webp", 200 * 1024)) }, { as: "bob" })).status, 200, "200 KB passes");
});

test("a file that is not a WebP, JPEG, or PNG, or not base64, is 400 picture, and nothing is stored", async () => {
  profiling();
  const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 2, 3, 4]);
  for (const avatar of [b64(picture("text")), b64(gif), "not base64 at all!", "data:image/webp;base64," + b64(picture("webp"))]) {
    err(await ask({ action: "profile", avatar }, { as: "bob" }), 400, "picture", avatar.slice(0, 30));
  }
  err(await ask({ action: "profile", avatar: 7 }, { as: "bob" }), 400, "field", "a number", { field: "avatar" });
  eq(world.seen("rpc", "chronia_avatar_count").length + world.seen("claude").length, 0, "no count, no check");
  nothingStored("not a picture");
});

test("a sixth picture change in a day is 429 limit, before the check", async () => {
  profiling();
  world.rpc.chronia_avatar_count = () => ({ error: "limit" });
  err(await ask({ action: "profile", avatar: b64(picture("webp")) }, { as: "bob" }), 429, "limit", "limit", { cap: 5 });
  eq(world.seen("claude").length, 0, "no check");
  nothingStored("limit");
});

test("a picture the model refuses, or doesn't clearly pass, is 400 picture, and nothing is stored", async () => {
  for (const said of ["no", "No.", "", "ok, but it shows a weapon", "not ok", "I can't tell"]) {
    world = new World();
    profiling();
    world.claude = said;
    err(await ask({ action: "profile", avatar: b64(picture("webp")) }, { as: "bob" }), 400, "picture", JSON.stringify(said));
    nothingStored(JSON.stringify(said));
  }
  for (const said of ["ok", "OK", "Ok.", " ok\n"]) {
    world = new World();
    profiling();
    world.claude = said;
    eq((await ask({ action: "profile", avatar: b64(picture("webp")) }, { as: "bob" })).status, 200, JSON.stringify(said));
  }
});

test("the model unreachable, erring, or without a key is 503 check, and nothing is stored", async () => {
  for (const how of ["down", "error", "nokey"]) {
    world = new World();
    profiling();
    if (how === "nokey") delete env.ANTHROPIC_API_KEY;
    else world.claude = how;
    try {
      err(await ask({ action: "profile", avatar: b64(picture("webp")) }, { as: "bob" }), 503, "check", how);
    } finally {
      env.ANTHROPIC_API_KEY = CLAUDE_KEY;
    }
    nothingStored(how);
  }
});

test("the model not answering in time is 503 check, and nothing is stored", async () => {
  profiling();
  world.claude = "hang";
  const real = globalThis.setTimeout;
  // The function's own deadline, shortened: the stand-in answers only when the request is aborted.
  globalThis.setTimeout = ((fn: () => void, ms?: number) => real(fn, Math.min(Number(ms) || 0, 20))) as typeof setTimeout;
  try {
    err(await ask({ action: "profile", avatar: b64(picture("webp")) }, { as: "bob" }), 503, "check", "timeout");
  } finally {
    globalThis.setTimeout = real;
  }
  nothingStored("timeout");
});

test("an upload that fails is 500 store, and nothing is saved", async () => {
  profiling();
  world.fail.add("upload");
  err(await ask({ action: "profile", avatar: b64(picture("webp")) }, { as: "bob" }), 500, "store", "upload");
  eq(world.seen("rpc", "chronia_profile_save").length, 0, "nothing saved");
  eq(world.seen("remove").length, 0, "the old picture is kept");
});

test("a save that fails after the upload deletes the new file and keeps the old", async () => {
  profiling();
  world.rpc.chronia_profile_save = () => ({ error: "taken" });
  err(await ask({ action: "profile", username: "Herodotus", avatar: b64(picture("webp")) }, { as: "bob" }), 409, "taken", "taken");
  const name = world.seen("upload")[0].name;
  eq(world.order().slice(-3), ["upload:" + name, "rpc:chronia_profile_save", "remove:" + name], "the new file is deleted");
  world = new World();
  profiling();
  world.fail.add("rpc:chronia_profile_save");
  err(await ask({ action: "profile", avatar: b64(picture("webp")) }, { as: "bob" }), 500, "store", "the database down");
  eq(world.seen("remove").map((c) => c.name), [world.seen("upload")[0].name], "only the new file is deleted");
});

test("an empty picture removes it, with no count, check, or upload", async () => {
  profiling();
  const got = await ask({ action: "profile", avatar: "" }, { as: "bob" });
  eq(got.body, { profile: { username: "Thucydides", avatar: null, blocked: false } }, "answer");
  eq(world.order(), ["table:chronia_profiles", "rpc:chronia_profile_save", "remove:old.webp,kept.webp"], "order");
  eq(world.seen("rpc", "chronia_profile_save")[0].body.p_avatar, "", "saved as none");
});

test("old files that can't be deleted don't fail the change", async () => {
  profiling();
  world.fail.add("remove");
  eq((await ask({ action: "profile", avatar: b64(picture("webp")) }, { as: "bob" })).status, 200, "still saved");
});

test("a profile whose picture is hidden answers no picture", async () => {
  profiling();
  world.rpc.chronia_profile_save = () => ({ ok: true, username: "Thucydides_2", avatar: "old.webp", avatar_state: "hidden", old_avatar: null, removed_avatar: null });
  eq((await ask({ action: "profile", username: "Thucydides_2" }, { as: "bob" })).body.profile.avatar, null, "no picture");
});

test("a username with quotes or angle brackets is refused as shape, never sent", async () => {
  profiling();
  err(await ask({ action: "profile", username: `"<b>Bob</b>"`, age: true }, { as: "alice" }), 400, "shape", "shape");
  eq((await ask({ action: "name", username: `Bob"><script>` }, { as: "alice" })).body, { ok: false, why: "shape" }, "name");
  eq(world.seen("rpc").length + world.seen("table", "chronia_profiles").length, 0, "nothing sent");
});

// ---------------------------------------------------------------- the team

const TEAM_ROW = { id: 9, username: "Thucydides", avatar: "b1.webp", polity: "Athens", at: "-0431", text: "Bad", flags: 3, state: "hidden", user: BOB, sent: "2026-11-24T10:00:00Z", blocked: false };

function queueing() {
  world.rpc.chronia_avatars_expired = () => ["gone1.webp", "gone2.webp"];
  world.rpc.chronia_queue = () => ({
    comments: [TEAM_ROW],
    pictures: [{ username: "Thucydides", avatar: "b1.webp", user: BOB, flags: 3, state: "hidden" }],
    blocked: [{ username: "Procopius", avatar: "p.webp", user: ALICE }],
    names: ["Athens", "West Francia"],
  });
}

test("queue is 401 signed out and 403 team off the team", async () => {
  queueing();
  err(await ask({ action: "queue" }), 401, "signin", "signed out");
  err(await ask({ action: "queue" }, { as: "alice" }), 403, "team", "off the team");
  eq(world.seen("rpc").length, 0, "nothing asked");
});

test("queue gives the team every reported comment and picture, the blocked, and the names", async () => {
  queueing();
  const got = await ask({ action: "queue" }, { as: "vera" });
  eq(got.body, {
    role: "viewer",
    comments: [{ id: 9, username: "Thucydides", avatar: URL_OF("b1.webp"), polity: "Athens", at: "-0431", text: "Bad", mine: false, flags: 3, state: "hidden", user: BOB, sent: "2026-11-24T10:00:00Z" }],
    pictures: [{ username: "Thucydides", avatar: URL_OF("b1.webp"), user: BOB, flags: 3, state: "hidden" }],
    blocked: [{ username: "Procopius", user: ALICE }],
    names: ["Athens", "West Francia"],
  }, "answer");
});

test("queue first forgets expired pictures and deletes their files, best effort", async () => {
  queueing();
  await ask({ action: "queue" }, { as: "rita" });
  eq(world.order(), ["rpc:chronia_avatars_expired", "remove:gone1.webp,gone2.webp", "rpc:chronia_queue"], "order");
  eq(world.seen("rpc", "chronia_avatars_expired")[0].body, { p_days: 30 }, "kept 30 days");
  world = new World();
  queueing();
  world.fail.add("rpc:chronia_avatars_expired");
  eq((await ask({ action: "queue" }, { as: "rita" })).status, 200, "the queue is served all the same");
  world = new World();
  queueing();
  world.fail.add("remove");
  eq((await ask({ action: "queue" }, { as: "rita" })).status, 200, "a failed delete doesn't fail the queue");
});

const REVIEWS: Json[] = [
  { action: "restore", id: 9 },
  { action: "remove", id: 9 },
  { action: "block", user: BOB, on: true },
  { action: "picture", user: BOB, on: false },
  { action: "move", from: "West Francia", to: "Kingdom of the West Franks" },
  { action: "erase", user: BOB },
];

test("a reviewer's actions are 403 review for a viewer, 403 team off the team, and 401 signed out", async () => {
  for (const b of REVIEWS) {
    err(await ask(b, { as: "vera" }), 403, "review", b.action + " as a viewer");
    err(await ask(b, { as: "alice" }), 403, "team", b.action + " off the team");
    err(await ask(b), 401, "signin", b.action + " signed out");
  }
  eq(world.seen("rpc").length + world.seen("remove").length, 0, "nothing done");
});

test("restore and remove answer the comment with the team's fields", async () => {
  world.rpc.chronia_comment_restore = () => ({ ok: true, comment: { ...TEAM_ROW, flags: 0, state: "live" } });
  world.rpc.chronia_comment_remove = () => ({ ok: true, comment: { ...TEAM_ROW, state: "removed" } });
  const a = await ask({ action: "restore", id: 9 }, { as: "rita" });
  eq([a.body.comment.state, a.body.comment.flags, a.body.comment.user, a.body.comment.avatar], ["live", 0, BOB, URL_OF("b1.webp")], "restored");
  eq(world.seen("rpc", "chronia_comment_restore")[0].body, { p_comment: 9 }, "restore args");
  const b = await ask({ action: "remove", id: 9 }, { as: "rita" });
  eq(b.body.comment.state, "removed", "removed");
  world.rpc.chronia_comment_restore = () => ({ error: "missing" });
  err(await ask({ action: "restore", id: 10 }, { as: "rita" }), 404, "missing", "missing");
  err(await ask({ action: "remove", id: "9" }, { as: "rita" }), 400, "field", "bad id", { field: "id" });
});

test("block and unblock an account", async () => {
  world.rpc.chronia_block = () => ({ ok: true });
  eq((await ask({ action: "block", user: BOB, on: true }, { as: "rita" })).body, { ok: true }, "block");
  eq((await ask({ action: "block", user: BOB, on: false }, { as: "rita" })).body, { ok: true }, "unblock");
  eq(world.seen("rpc", "chronia_block").map((c) => c.body), [{ p_user: BOB, p_on: true }, { p_user: BOB, p_on: false }], "rpc args");
  err(await ask({ action: "block", user: "Thucydides", on: true }, { as: "rita" }), 400, "field", "a username", { field: "user" });
  err(await ask({ action: "block", user: BOB, on: "yes" }, { as: "rita" }), 400, "field", "on", { field: "on" });
  world.rpc.chronia_block = () => ({ error: "missing" });
  err(await ask({ action: "block", user: BOB, on: true }, { as: "rita" }), 404, "missing", "missing");
});

test("picture off and on, deleting any file the database gives up", async () => {
  world.rpc.chronia_avatar_set = (a: Json) => ({ ok: true, avatar: "b1.webp", removed_avatar: a.p_on ? null : "older.webp" });
  eq((await ask({ action: "picture", user: BOB, on: false }, { as: "rita" })).body, { ok: true }, "off");
  eq(world.order(), ["rpc:chronia_avatar_set", "remove:older.webp"], "only the file given up is deleted; the removed one is kept");
  eq((await ask({ action: "picture", user: BOB, on: true }, { as: "rita" })).body, { ok: true }, "on");
  eq(world.seen("remove").length, 1, "nothing deleted when turned on");
  world.rpc.chronia_avatar_set = () => ({ error: "missing" });
  err(await ask({ action: "picture", user: BOB, on: true }, { as: "rita" }), 404, "missing", "missing");
});

test("move every comment from one name to another", async () => {
  world.rpc.chronia_comments_move = () => 3;
  const name = `"West" <Francia>`;
  eq((await ask({ action: "move", from: name, to: "Kingdom of the West Franks" }, { as: "rita" })).body, { moved: 3 }, "answer");
  eq(world.seen("rpc", "chronia_comments_move")[0].body, { p_from: name, p_to: "Kingdom of the West Franks" }, "rpc args");
  err(await ask({ action: "move", from: "", to: "x" }, { as: "rita" }), 400, "field", "from", { field: "from" });
  err(await ask({ action: "move", from: "x", to: "y".repeat(201) }, { as: "rita" }), 400, "field", "to", { field: "to" });
});

test("erase empties the database first, then deletes the picture files", async () => {
  world.rpc.chronia_account_erase = () => ({ ok: true, avatar: "b1.webp", removed_avatar: "kept.webp" });
  eq((await ask({ action: "erase", user: BOB }, { as: "rita" })).body, { ok: true }, "answer");
  eq(world.order(), ["rpc:chronia_account_erase", "remove:b1.webp,kept.webp"], "order");
  eq(world.seen("rpc", "chronia_account_erase")[0].body, { p_user: BOB }, "rpc args");
  world = new World();
  world.fail.add("rpc:chronia_account_erase");
  err(await ask({ action: "erase", user: BOB }, { as: "rita" }), 500, "store", "the database down");
  eq(world.seen("remove").length, 0, "no file deleted while the profile still points at it");
});

test("every database call uses the secret key, never the caller's token", async () => {
  queueing();
  await ask({ action: "queue" }, { as: "rita" });
  for (const c of world.calls.filter((c) => c.kind === "rpc" || c.kind === "table" || c.kind === "remove")) {
    eq(c.headers.get("apikey"), SECRET, c.kind + ":" + c.name + " apikey");
    ok(!(c.headers.get("authorization") || "").includes(TOKENS.rita), c.kind + ":" + c.name + " without the token");
  }
});

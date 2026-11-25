// The edge function's real code against the real SQL, on the throwaway cluster tools/chronia-comments-integration.sh
// starts: every action of chronia-comments is sent through handle(), and every database answer is the real one.
// Only sign-in, storage, and the picture check are stand-ins (PostgREST is played by a small shim that calls psql
// with named arguments, as the service role). Run it with the .sh, never against the live project.
const SOCK = Deno.env.get("PGSOCK")!, PORT = Deno.env.get("PGPORT_T")!;
Deno.env.set("SUPABASE_URL", "http://sb.test");
Deno.env.set("SUPABASE_SECRET_KEYS", JSON.stringify({ default: "sb_secret_test" }));
Deno.env.set("ANTHROPIC_API_KEY", "test");
async function psql(sql: string, role = "service_role"): Promise<{ ok: boolean; out: string; err: string }> {
  const p = new Deno.Command("runuser", { args: ["-u", "postgres", "--", "/usr/lib/postgresql/16/bin/psql", "-X", "-q", "-t", "-A", "-h", SOCK, "-p", PORT, "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-f", "-"], stdin: "piped", stdout: "piped", stderr: "piped" }).spawn();
  const w = p.stdin.getWriter(); await w.write(new TextEncoder().encode((role ? "set role " + role + ";\n" : "") + sql + "\n")); await w.close();
  const o = await p.output(); return { ok: o.success, out: new TextDecoder().decode(o.stdout).trim(), err: new TextDecoder().decode(o.stderr).trim() };
}
const q = (s: string) => "'" + s.replace(/'/g, "''") + "'";
function lit(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) return v.length ? "array[" + v.map(lit).join(",") + "]" : "'{}'";
  return q(String(v));
}
const retset = new Map<string, boolean>();
const dbErrors: string[] = [];
async function rest(path: string, init: RequestInit): Promise<Response> {
  const [p, qs] = path.split("?");
  const J = (status: number, body: unknown) => new Response(body === null ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  if (p.startsWith("rpc/")) {
    const fn = p.slice(4), args = JSON.parse(String(init.body || "{}"));
    if (!retset.has(fn)) { const r = await psql("select proretset from pg_proc where proname = " + q(fn) + " and pronamespace = 'public'::regnamespace", ""); retset.set(fn, r.out === "t"); if (r.out === "") { dbErrors.push("NO SUCH FUNCTION " + fn); return J(404, { code: "PGRST202" }); } }
    const call = "public." + fn + "(" + Object.entries(args).map(([k, v]) => k + " => " + lit(v)).join(", ") + ")";
    const r = await psql(retset.get(fn) ? "select coalesce(json_agg(r), '[]'::json) from " + call + " r" : "select to_json(" + call + ")");
    if (!r.ok) { dbErrors.push(fn + " " + JSON.stringify(args).slice(0, 200) + " :: " + r.err.slice(0, 300)); return J(400, { code: (/ERROR:\s+(.*)/.exec(r.err) || ["", "error"])[1].slice(0, 12), message: r.err }); }
    return r.out === "" || r.out === "null" ? J(200, null) : new Response(r.out, { status: 200, headers: { "content-type": "application/json" } });
  }
  const sp = new URLSearchParams(qs || ""), cols = sp.get("select") || "*", lim = sp.get("limit"), where: string[] = [];
  for (const [k, v] of sp) if (k !== "select" && k !== "limit") { if (!v.startsWith("eq.")) throw new Error("shim: filter " + v); where.push(k + " = " + q(v.slice(3))); }
  const r = await psql("select coalesce(json_agg(t), '[]'::json) from (select " + cols + " from public." + p + (where.length ? " where " + where.join(" and ") : "") + (lim ? " limit " + Number(lim) : "") + ") t");
  if (!r.ok) { dbErrors.push(path + " :: " + r.err.slice(0, 300)); return J(400, { code: "error", message: r.err }); }
  return new Response(r.out, { status: 200, headers: { "content-type": "application/json" } });
}
const USERS: Record<string, string> = {}; // token -> id
const store: Record<string, Map<string, number>> = { "chronia-avatars": new Map(), "chronia-avatars-kept": new Map() };
let model: "ok" | "no" | "fail" = "ok", checks = 0, storageDown = false;
const real = globalThis.fetch;
globalThis.fetch = async (input: Request | URL | string, init: RequestInit = {}) => {
  const url = String(input instanceof Request ? input.url : input);
  const J = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  if (url.startsWith("https://api.anthropic.com/")) { checks++; if (model === "fail") return J(529, { error: "overloaded" }); return J(200, { content: [{ type: "text", text: model }] }); }
  if (!url.startsWith("http://sb.test/")) return real(input, init);
  const path = url.slice("http://sb.test".length), h = new Headers(init.headers || {});
  if (h.get("apikey") !== "sb_secret_test") return J(401, { message: "no api key" });
  if (path.startsWith("/rest/v1/")) return rest(path.slice(9), init);
  if (path === "/auth/v1/user") { const t = (h.get("authorization") || "").replace(/^Bearer /, ""); return USERS[t] ? J(200, { id: USERS[t], app_metadata: { provider: "google", providers: ["google"] } }) : J(401, { message: "bad jwt" }); }
  if (path.startsWith("/storage/v1/")) {
    if (storageDown) return J(500, { error: "down" });
    const s = path.slice(12);
    if (s === "object/move") { const b = JSON.parse(String(init.body)); const from = store[b.bucketId], to = store[b.destinationBucket]; if (!from.has(b.sourceKey)) return J(404, { error: "not_found", message: "Object not found" }); to.set(b.destinationKey, from.get(b.sourceKey)!); from.delete(b.sourceKey); return J(200, { message: "Successfully moved" }); }
    if (s.startsWith("object/sign/")) { const bucket = s.slice(12), b = JSON.parse(String(init.body)); return J(200, b.paths.map((p: string) => store[bucket].has(p) ? { error: null, path: p, signedURL: "/object/sign/" + bucket + "/" + p + "?token=t" } : { error: "Either the object does not exist or you do not have access to it", path: p, signedURL: null })); }
    if (init.method === "DELETE") { const bucket = s.slice(7), b = JSON.parse(String(init.body)); for (const p of b.prefixes) store[bucket].delete(p); return J(200, []); }
    if (init.method === "POST" && s.startsWith("object/")) { const [bucket, name] = s.slice(7).split("/"); if (store[bucket].has(name)) return J(409, { error: "Duplicate" }); store[bucket].set(decodeURIComponent(name), (init.body as Uint8Array).length); return J(200, { Key: bucket + "/" + name }); }
    return J(400, { error: "shim: " + s });
  }
  return J(404, {});
};
const { handle } = await import(new URL("../supabase/functions/chronia-comments/index.ts", import.meta.url).href);
let pass = 0; const fails: string[] = [];
function ok(cond: unknown, what: string, got?: unknown) { if (cond) pass++; else fails.push(what + (got !== undefined ? " :: got " + JSON.stringify(got).slice(0, 400) : "")); }
async function call(token: string | null, body: unknown, origin = "https://chroniaatlas.com") {
  const res = await handle(new Request("https://x/functions/v1/chronia-comments", { method: "POST", headers: { "content-type": "application/json", origin, ...(token ? { authorization: "Bearer " + token } : {}) }, body: JSON.stringify(body) }));
  let j: any = null; try { j = await res.json(); } catch (_) { /* */ } return { s: res.status, j };
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sqlv = async (s: string) => { const r = await psql(s, ""); if (!r.ok) throw new Error(r.err); return r.out; };
const uid = (n: number) => "00000000-0000-4000-8000-00000000000" + n;
const tok = (n: number) => "token-aaaaaaaaaaaaaaaaaaaaaaaa-" + n;
for (let n = 1; n <= 6; n++) { USERS[tok(n)] = uid(n); await sqlv("insert into auth.users values (" + q(uid(n)) + ")"); }
await sqlv("insert into public.chronia_team values (" + q(uid(4)) + ", 'viewer'), (" + q(uid(5)) + ", 'reviewer')");
const png = (n: number) => { const b = new Uint8Array(200 + n); b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); b.fill(n, 8); let s = ""; for (const x of b) s += String.fromCharCode(x); return btoa(s); };
const back = (n: number) => sqlv("update public.chronia_comments set sent_at = sent_at - interval '11 seconds' where user_id = " + q(uid(n)));
const pub = () => [...store["chronia-avatars"].keys()], kept = () => [...store["chronia-avatars-kept"].keys()];
let r: any;

// --- signed out
r = await call(null, { action: "list", names: ["France"] }); ok(r.s === 200 && Array.isArray(r.j.comments) && r.j.comments.length === 0 && r.j.more === false && r.j.total === 0, "list signed out, empty", r);
r = await call(null, { action: "list", names: ["France"] }, "https://evil.example"); ok(r.s === 403, "wrong origin 403", r);
r = await call(null, { action: "me" }); ok(r.s === 401 && r.j.error === "signin", "me signed out", r);
r = await call("token-not-a-real-one-aaaaaaaaaaaa", { action: "list", names: ["France"] }); ok(r.s === 200, "list with a stale token is signed out", r);
// --- me, name, profile
r = await call(tok(1), { action: "me" }); ok(r.s === 200 && r.j.profile === null && r.j.left === 100 && r.j.cap === 100 && r.j.role === null, "me before a profile", r);
r = await call(tok(1), { action: "post", name: "France", at: "1789-07-14", text: "hello" }); ok(r.s === 403 && r.j.error === "profile", "post with no profile", r);
r = await call(tok(1), { action: "name", username: "Herodotus" }); ok(r.s === 200 && r.j.ok === true, "name free", r);
r = await call(tok(1), { action: "name", username: "admin" }); ok(r.s === 200 && r.j.ok === false && r.j.why === "reserved", "name reserved", r);
r = await call(tok(1), { action: "name", username: "ab" }); ok(r.j.ok === false && r.j.why === "shape", "name shape", r);
r = await call(tok(1), { action: "profile", username: "Herodotus" }); ok(r.s === 400 && r.j.error === "age", "profile without age", r);
r = await call(tok(1), { action: "profile", username: "Herodotus", age: true }); ok(r.s === 200 && r.j.profile && r.j.profile.username === "Herodotus" && r.j.profile.avatar === null && r.j.profile.blocked === false, "first profile, no picture", r);
ok((await sqlv("select count(*) from public.chronia_profiles where age_ok_at is not null and username_fold is not null")) === "1", "profile row with age time and fold");
r = await call(tok(1), { action: "me" }); ok(r.j.profile && r.j.profile.username === "Herodotus" && r.j.left === 100, "me after a profile", r);
r = await call(tok(1), { action: "name", username: "herodotus" }); ok(r.j.ok === true, "own name in another case is one's own", r);
r = await call(tok(2), { action: "name", username: "Herodotus" }); ok(r.j.ok === false && r.j.why === "taken", "name taken", r);
r = await call(tok(2), { action: "name", username: "Her0dotus" }); ok(r.j.ok === false && r.j.why === "taken", "look-alike taken (name)", r);
checks = 0; r = await call(tok(2), { action: "profile", username: "Her0dotus", age: true, avatar: png(1) }); ok(r.s === 409 && r.j.error === "taken" && checks === 0 && pub().length === 0, "look-alike taken (profile), no check, no upload", [r, checks, pub()]);
// first profile with a picture
r = await call(tok(2), { action: "profile", username: "Sappho", age: true, avatar: png(2) }); ok(r.s === 200 && r.j.profile.username === "Sappho" && /^http:\/\/sb\.test\/storage\/v1\/object\/public\/chronia-avatars\/.+\.png$/.test(r.j.profile.avatar || "") && !r.j.picture_error && pub().length === 1, "first profile with a picture", [r, pub()]);
const sapphoPic = pub()[0];
// first profile with a refused picture
model = "no"; r = await call(tok(3), { action: "profile", username: "Thucydides", age: true, avatar: png(3) }); ok(r.s === 200 && r.j.profile && r.j.profile.username === "Thucydides" && r.j.profile.avatar === null && r.j.picture_error === "picture" && pub().length === 1, "first profile, refused picture: 200 picture_error", [r, pub()]);
model = "fail"; r = await call(tok(3), { action: "profile", avatar: png(3) }); ok(r.s === 503 && r.j.error === "check", "existing profile, check unreachable 503", r);
model = "no"; r = await call(tok(3), { action: "profile", avatar: png(3) }); ok(r.s === 400 && r.j.error === "picture", "existing profile, refused picture 400", r);
model = "ok";
r = await call(tok(3), { action: "profile", avatar: "bm90IGFuIGltYWdl" }); ok(r.s === 400 && r.j.error === "picture", "not an image", r);
// the cap: account 3 has used 2 refused (the outage gave its change back); 3 more reach 5
let caps: number[] = []; for (let i = 0; i < 4; i++) { r = await call(tok(3), { action: "profile", avatar: png(10 + i) }); caps.push(r.s); }
ok(caps.join() === "200,200,200,429", "picture cap of 5 a day (2 refused + 3 ok, then 429)", caps);
ok(pub().length === 2, "old pictures deleted on change: one file each", pub());
r = await call(tok(3), { action: "profile", avatar: "" }); ok(r.s === 200 && r.j.profile.avatar === null, "remove picture with empty string", r); await sleep(300); ok(pub().length === 1, "removed picture's file deleted", pub());
r = await call(tok(1), { action: "profile", username: "Herodotos" }); ok(r.s === 409 && r.j.error === "soon" && r.j.days > 0, "name change inside 30 days", r);
await sqlv("update public.chronia_profiles set named_at = now() - interval '31 days' where user_id = " + q(uid(1)));
r = await call(tok(1), { action: "profile", username: "Herodotos" }); ok(r.s === 200 && r.j.profile.username === "Herodotos", "name change after 30 days", r);
r = await call(tok(1), { action: "profile", username: "Sappho" }); ok(r.s === 409 && r.j.error === "taken", "change to a held name", r);
// --- post
r = await call(tok(1), { action: "post", name: "Kingdom of France", at: "1789-07-14", text: "The Bastille fell." }); ok(r.s === 200 && r.j.comment && r.j.comment.username === "Herodotos" && r.j.comment.polity === "Kingdom of France" && r.j.comment.at === "1789-07-14" && r.j.comment.text === "The Bastille fell." && r.j.comment.mine === true && r.j.left === 99 && typeof r.j.comment.id === "number" && !("user" in r.j.comment), "post ok", r);
const c1 = r.j.comment.id;
r = await call(tok(1), { action: "post", name: "France", at: "1900", text: "again" }); ok(r.s === 429 && r.j.error === "fast" && r.j.wait > 0, "second within 10 s", r);
for (const [t, why, st] of [["see http://x.co", "link", 400], ["", "empty", 400], ["x".repeat(501), "long", 400]] as const) { r = await call(tok(2), { action: "post", name: "France", at: "1900", text: t }); ok(r.j.error === why && (r.s === st || (why === "long" && r.s === 413)), "post refused: " + why, r); }
r = await call(tok(2), { action: "post", name: "France", at: "not-a-date", text: "x" }); ok(r.s === 400 && r.j.error === "field", "post bad date", r);
r = await call(tok(2), { action: "post", name: "France", at: "1900-04-14", text: "The Exposition <b>opens</b> & \"quotes\" 'too'" }); ok(r.s === 200 && r.j.comment.text === "The Exposition <b>opens</b> & \"quotes\" 'too'", "post with markup and quotes untouched", r); const c2 = r.j.comment.id;
r = await call(tok(3), { action: "post", name: "French Third Republic", at: "-0050", text: "A third." }); ok(r.s === 200, "post 3 (BC date)", r); const c3 = r.j.comment.id;
// --- list
r = await call(null, { action: "list", names: ["Kingdom of France", "France", "French Third Republic"] }); ok(r.s === 200 && r.j.total === 3 && r.j.comments.length === 3 && r.j.comments[0].id === c3 && r.j.comments[2].id === c1 && r.j.comments.every((c: any) => !("user" in c) && !("flags" in c) && !("state" in c) && !c.mine), "thread newest first, no team fields signed out", r);
ok(r.j.comments[1].avatar === "http://sb.test/storage/v1/object/public/chronia-avatars/" + sapphoPic, "avatar url in a thread", r.j.comments[1]);
r = await call(null, { action: "list", names: ["Kingdom of France", "France", "French Third Republic"], sort: "near", at: "1899" }); ok(r.s === 200 && r.j.comments.map((c: any) => c.id).join() === [c2, c1, c3].join(), "nearest to 1899", r.j && r.j.comments && r.j.comments.map((c: any) => [c.id, c.at]));
r = await call(null, { action: "list", names: ["France"], sort: "near" }); ok(r.s === 400 && r.j.error === "field", "near without at", r);
r = await call(tok(2), { action: "list", names: ["France"] }); ok(r.j.total === 1 && r.j.comments[0].mine === true, "mine on own", r);
r = await call(tok(5), { action: "list", names: ["France"] }); ok(r.j.comments[0].flags === 0 && r.j.comments[0].state === "live" && r.j.comments[0].user === uid(2), "team fields for a team member", r);
r = await call(null, { action: "list", names: [] }); ok(r.s === 400, "no names", r);
// paging: 25 comments under one name
for (let i = 0; i < 25; i++) { await back(1); r = await call(tok(1), { action: "post", name: "Paging", at: String(1000 + i), text: "n" + i }); if (r.s !== 200) { ok(false, "paging post " + i, r); break; } }
r = await call(null, { action: "list", names: ["Paging"] }); ok(r.j.total === 25 && r.j.comments.length === 20 && r.j.more === true && r.j.comments[0].text === "n24", "page 1 of 25", [r.j.total, r.j.comments.length, r.j.more]);
r = await call(null, { action: "list", names: ["Paging"], offset: 20 }); ok(r.j.comments.length === 5 && r.j.more === false && r.j.comments[4].text === "n0", "page 2 of 25", [r.j.comments.length, r.j.more]);
r = await call(tok(1), { action: "me" }); ok(r.j.left === 74, "left after 26 posts", r);
// the day's cap
await sqlv("insert into public.chronia_comments (user_id, polity, at, at_num, body, sent_at) select " + q(uid(1)) + ", 'Cap', '1', 1, 'c', now() - interval '1 minute' from generate_series(1, 74)");
r = await call(tok(1), { action: "post", name: "Cap", at: "1", text: "the 101st" }); ok(r.s === 429 && r.j.error === "limit" && r.j.cap === 100, "101st of the day", r);
await sqlv("delete from public.chronia_comments where polity = 'Cap'");
// --- delete
r = await call(tok(2), { action: "delete", id: c1 }); ok(r.s === 404 && r.j.error === "missing", "delete someone else's", r);
r = await call(tok(3), { action: "delete", id: c3 }); ok(r.s === 200 && r.j.ok === true && (await sqlv("select count(*) from public.chronia_comments where id = " + c3)) === "0", "delete own", r);
// --- flags on a comment
r = await call(tok(1), { action: "flag", id: c1 }); ok(r.s === 403 && r.j.error === "own", "flag own", r);
r = await call(tok(6), { action: "flag", id: c1 }); ok(r.s === 403 && r.j.error === "profile", "flag with no profile", r);
for (const n of [4, 5, 6]) await call(tok(n), { action: "profile", username: ["", "", "", "", "Viewer_V", "Reviewer_R", "Sixth"][n], age: true });
r = await call(tok(2), { action: "flag", id: c1 }); ok(r.s === 200 && r.j.ok === true, "flag 1", r);
r = await call(tok(2), { action: "flag", id: c1 }); ok(r.s === 200 && r.j.ok === true, "flag again is still ok", r);
r = await call(tok(3), { action: "flag", id: c1 }); r = await call(null, { action: "list", names: ["Kingdom of France"] }); ok(r.j.total === 1, "two flags: still live", r);
r = await call(tok(6), { action: "flag", id: c1 }); ok(r.s === 200, "flag 3", r);
r = await call(null, { action: "list", names: ["Kingdom of France"] }); ok(r.j.total === 0 && r.j.comments.length === 0, "three flags: hidden from the thread", r);
r = await call(tok(4), { action: "flag", id: c1 }); ok(r.s === 404 && r.j.error === "missing", "a fourth flag on a hidden comment", r);
// --- queue and review
r = await call(tok(1), { action: "queue" }); ok(r.s === 403 && r.j.error === "team", "queue off the team", r);
r = await call(tok(4), { action: "queue" }); ok(r.s === 200 && r.j.role === "viewer" && r.j.comments.length === 1 && r.j.comments[0].id === c1 && r.j.comments[0].state === "hidden" && r.j.comments[0].flags === 3 && r.j.comments[0].user === uid(1) && r.j.comments[0].username === "Herodotos" && Array.isArray(r.j.pictures) && Array.isArray(r.j.blocked) && Array.isArray(r.j.names) && r.j.names.includes("Paging"), "queue as viewer", r);
r = await call(tok(4), { action: "restore", id: c1 }); ok(r.s === 403 && r.j.error === "review", "restore as viewer", r);
r = await call(tok(5), { action: "restore", id: c1 }); ok(r.s === 200 && r.j.comment && r.j.comment.state === "live" && r.j.comment.flags === 0, "restore", r);
r = await call(null, { action: "list", names: ["Kingdom of France"] }); ok(r.j.total === 1, "restored: back in the thread", r);
r = await call(tok(2), { action: "flag", id: c1 }); r = await call(null, { action: "list", names: ["Kingdom of France"] }); ok(r.j.total === 1, "one new flag after a restore does not hide", r);
r = await call(tok(5), { action: "remove", id: c1 }); ok(r.s === 200 && r.j.comment.state === "removed", "remove", r);
r = await call(null, { action: "list", names: ["Kingdom of France"] }); ok(r.j.total === 0, "removed: out of the thread", r);
r = await call(tok(5), { action: "move", from: "Paging", to: "Paged" }); ok(r.s === 200 && r.j.moved === 25, "move", r);
r = await call(null, { action: "list", names: ["Paged"] }); ok(r.j.total === 25, "moved comments under the new name", r.j.total);
// --- block
r = await call(tok(5), { action: "block", user: uid(2), on: true }); ok(r.s === 200 && r.j.ok === true, "block", r);
r = await call(null, { action: "list", names: ["France"] }); ok(r.j.total === 0, "a blocked account's comments leave the thread", r);
await back(2); r = await call(tok(2), { action: "post", name: "France", at: "1900", text: "blocked" }); ok(r.s === 403 && r.j.error === "blocked", "blocked cannot post", r);
r = await call(tok(2), { action: "flag", id: c1 }); ok(r.s === 403 && r.j.error === "blocked", "blocked cannot flag", r);
r = await call(tok(2), { action: "me" }); ok(r.j.profile && r.j.profile.blocked === true, "me says blocked", r);
r = await call(tok(4), { action: "queue" }); ok(r.j.blocked.length === 1 && r.j.blocked[0].username === "Sappho" && r.j.blocked[0].user === uid(2), "queue lists the blocked", r.j.blocked);
r = await call(tok(5), { action: "block", user: uid(2), on: false }); r = await call(null, { action: "list", names: ["France"] }); ok(r.j.total === 1, "unblocked: back", r);
// --- flags on a picture
for (const n of [1, 3, 6]) r = await call(tok(n), { action: "flag", user: "Sappho" });
ok(r.s === 200, "picture flag 3", r); await sleep(700);
ok(pub().length === 0 && kept().join() === sapphoPic, "hidden picture's file moved to the private bucket", [pub(), kept()]);
r = await call(null, { action: "list", names: ["France"] }); ok(r.j.comments[0].avatar === null, "hidden picture not shown in the thread", r.j.comments[0]);
r = await call(tok(2), { action: "me" }); ok(r.j.profile.avatar === null, "owner sees no picture while hidden", r);
r = await call(tok(4), { action: "queue" }); ok(r.j.pictures.length === 1 && r.j.pictures[0].username === "Sappho" && r.j.pictures[0].user === uid(2) && r.j.pictures[0].flags === 3 && r.j.pictures[0].state === "hidden" && /\/storage\/v1\/object\/sign\/chronia-avatars-kept\/.+token=/.test(r.j.pictures[0].avatar || ""), "queue shows the hidden picture by a signed address", r.j.pictures);
r = await call(tok(5), { action: "picture", user: uid(2), on: true }); ok(r.s === 200 && r.j.ok === true, "picture on (keep)", r); await sleep(700);
ok(pub().join() === sapphoPic && kept().length === 0, "kept picture's file back in the public bucket", [pub(), kept()]);
r = await call(null, { action: "list", names: ["France"] }); ok(/chronia-avatars\//.test(r.j.comments[0].avatar || ""), "picture shown again", r.j.comments[0]);
r = await call(tok(5), { action: "picture", user: uid(2), on: false }); ok(r.s === 200, "picture off (remove)", r); await sleep(700);
ok(pub().length === 0 && kept().join() === sapphoPic, "removed picture's file private", [pub(), kept()]);
r = await call(tok(4), { action: "queue" }); ok(r.j.pictures.length === 1 && r.j.pictures[0].state === "removed" && /sign/.test(r.j.pictures[0].avatar || ""), "queue shows the removed picture", r.j.pictures);
r = await call(tok(5), { action: "picture", user: uid(2), on: true }); await sleep(700); ok(pub().join() === sapphoPic, "a removed picture restored inside 30 days", [pub(), kept()]);
r = await call(tok(5), { action: "picture", user: uid(2), on: false }); await sleep(700);
await sqlv("update public.chronia_profiles set avatar_removed_at = now() - interval '31 days' where user_id = " + q(uid(2)));
r = await call(tok(4), { action: "queue" }); await sleep(900); ok(pub().length === 0 && kept().length === 0, "after 30 days the kept file is erased by the sweep", [pub(), kept(), await sqlv("select count(*) from public.chronia_avatar_trash")]);
// --- erase, and deleting the sign-in account directly
r = await call(tok(3), { action: "profile", avatar: "" }); await sqlv("update public.chronia_profiles set avatar_changes = 0 where user_id = " + q(uid(3)));
r = await call(tok(3), { action: "profile", avatar: png(40) }); ok(r.s === 200 && pub().length === 1, "a picture for account 3", [r, pub()]);
r = await call(tok(4), { action: "erase", user: uid(3) }); ok(r.s === 403 && r.j.error === "review", "erase as viewer", r);
r = await call(tok(5), { action: "erase", user: uid(3) }); ok(r.s === 200 && r.j.ok === true, "erase", r); await sleep(700);
ok((await sqlv("select (select count(*) from public.chronia_profiles where user_id = " + q(uid(3)) + ") + (select count(*) from public.chronia_comments where user_id = " + q(uid(3)) + ") + (select count(*) from public.chronia_flags where user_id = " + q(uid(3)) + ")")) === "0" && pub().length === 0, "erased: rows and file gone", pub());
r = await call(tok(3), { action: "me" }); ok(r.s === 200 && r.j.profile === null, "erased account can start again", r);
await sqlv("update public.chronia_profiles set avatar_changes = 0 where user_id = " + q(uid(6))); r = await call(tok(6), { action: "profile", avatar: png(50) }); ok(pub().length === 1, "a picture for account 6", pub());
await sqlv("delete from auth.users where id = " + q(uid(6))); await back(1); r = await call(tok(1), { action: "post", name: "Paged", at: "2000", text: "sweep" }); await sleep(900);
ok(r.s === 200 && pub().length === 0 && (await sqlv("select count(*) from public.chronia_avatar_trash")) === "0", "account deleted in the database: its file swept after the next post", [r.s, pub()]);
// --- replies, upvotes, one's own comments, and a soft delete (accounts 1 Herodotos, 2 Sappho, 4 Viewer_V, 5 Reviewer_R)
// Every comment moved 11 seconds back after each post: the gap between one account's comments is passed, and the
// order of sending, which a thread follows, is kept.
const shift = () => sqlv("update public.chronia_comments set sent_at = sent_at - interval '11 seconds'");
await shift();
r = await call(tok(1), { action: "post", name: "Athens", at: "-0430", text: "The plague." }); await shift(); ok(r.s === 200 && r.j.comment.parent === null && r.j.comment.depth === 0 && r.j.comment.votes === 0, "a top comment has no parent", r); const t1 = r.j.comment.id;
r = await call(tok(2), { action: "post", name: "Athens", at: "-0429", text: "A reply.", parent: t1 }); await shift(); ok(r.s === 200 && r.j.comment.parent === t1 && r.j.comment.root === t1 && r.j.comment.depth === 1, "a reply", r); const rp1 = r.j.comment.id;
r = await call(tok(4), { action: "post", name: "Sparta", at: "1", text: "Wrong name.", parent: t1 }); ok(r.s === 400 && r.j.error === "field" && r.j.field === "parent", "a reply under another name", r);
r = await call(tok(4), { action: "post", name: "Athens", at: "1", text: "To nothing.", parent: 99999999 }); ok(r.s === 404 && r.j.error === "gone", "a reply to nothing is gone", r);
// down to depth 8, then one more beside the deepest
let prev = rp1; for (let i = 2; i <= 8; i++) { const who = i % 2 ? 2 : 4; r = await call(tok(who), { action: "post", name: "Athens", at: "-0429", text: "Level " + i, parent: prev }); await shift(); if (r.s !== 200) { ok(false, "chain " + i, r); break; } prev = r.j.comment.id; }
ok(r.j.comment.depth === 8, "a chain down to depth 8", r);
r = await call(tok(1), { action: "post", name: "Athens", at: "-0429", text: "Past the floor.", parent: prev }); await shift(); ok(r.s === 200 && r.j.comment.depth === 8 && r.j.comment.replying_to === "Viewer_V" && r.j.comment.parent !== prev, "a reply to depth 8 goes beside it, replying to its writer", r);
r = await call(null, { action: "thread", id: prev }); ok(r.s === 200 && r.j.root === t1 && r.j.comments.length === 10 && r.j.comments[0].id === t1 && r.j.comments[9].replying_to === "Viewer_V" && r.j.comments.every((c: any, i: number) => i === 0 || c.depth >= 1), "the thread from its deepest reply", r.j && r.j.comments && r.j.comments.map((c: any) => [c.id, c.depth]));
r = await call(null, { action: "list", names: ["Athens"] }); ok(r.j.total === 1 && r.j.comments[0].id === t1 && r.j.comments[0].replies === 9 && r.j.comments[0].votes === 0, "the card lists the top comment with its replies", r);
// upvotes
r = await call(tok(2), { action: "vote", id: t1, on: true }); ok(r.s === 200 && r.j.votes === 1 && r.j.voted === true, "an upvote", r);
r = await call(tok(4), { action: "vote", id: t1, on: true }); ok(r.j.votes === 2, "a second upvote", r);
r = await call(tok(1), { action: "vote", id: t1, on: true }); ok(r.s === 403 && r.j.error === "own", "not one's own", r);
r = await call(tok(4), { action: "vote", id: t1, on: false }); ok(r.j.votes === 1 && r.j.voted === false, "taken back", r);
r = await call(tok(2), { action: "list", names: ["Athens"], sort: "top" }); ok(r.s === 200 && r.j.comments[0].votes === 1 && r.j.comments[0].voted === true, "Top, with the reader's vote", r);
await sqlv("update public.chronia_profiles set vote_count = 500, vote_day = (now() at time zone 'utc')::date where user_id = " + q(uid(4)));
r = await call(tok(4), { action: "vote", id: t1, on: true }); ok(r.s === 429 && r.j.error === "limit" && r.j.cap === 500, "500 changes of vote a day", r);
r = await call(tok(2), { action: "vote", id: 99999999, on: true }); ok(r.s === 404 && r.j.error === "gone", "a vote for nothing is gone", r);
// one's own
r = await call(tok(2), { action: "mine" }); ok(r.s === 200 && r.j.comments[0].text === "Level 7" && r.j.comments[0].replying_to === "Viewer_V" && r.j.comments.every((c: any) => c.mine && c.state), "one's own, newest first, each with whom it replies to and its state", r.j && r.j.comments && r.j.comments.slice(0, 2));
// a soft delete keeps the thread
r = await call(tok(1), { action: "delete", id: t1 }); ok(r.s === 200 && r.j.soft === true, "deleting a comment with replies is soft", r);
r = await call(null, { action: "thread", id: rp1 }); ok(r.j.comments[0].id === t1 && r.j.comments[0].deleted === true && r.j.comments[0].username === null && r.j.comments[0].text === "" && r.j.comments.length === 10, "the thread keeps a deleted comment's place", r.j.comments[0]);
r = await call(null, { action: "list", names: ["Athens"] }); ok(r.j.total === 1 && r.j.comments[0].deleted === true && r.j.comments[0].replies === 9, "the card lists it as a placeholder with its replies", r);
r = await call(tok(2), { action: "vote", id: t1, on: true }); ok(r.s === 404 && r.j.error === "gone", "a deleted comment can't be voted on", r);
// erasing an account keeps the others' replies
r = await call(tok(5), { action: "erase", user: uid(2) }); ok(r.s === 200, "erase Sappho", r);
r = await call(null, { action: "thread", id: t1 }); ok(r.s === 200 && r.j.comments.length === 10 && r.j.comments.filter((c: any) => c.deleted).length === 5 && r.j.comments.every((c: any) => c.deleted || c.username !== "Sappho"), "erased: her replies, each with a reply under it, stay as placeholders, and the others' replies stay", r.j && r.j.comments && r.j.comments.map((c: any) => [c.depth, c.username, !!c.deleted]));
ok((await sqlv("select count(*) from public.chronia_comments where user_id = " + q(uid(2)))) === "0", "no comment keeps the erased account");
r = await call(null, { action: "nonsense_new" }); ok(r.s === 400 && r.j.error === "action", "still an unknown action", r);
// --- direct access as the page's roles
const a = await psql("select count(*) from public.chronia_comments", "anon"); ok(!a.ok && /permission denied/.test(a.err), "anon cannot read comments", a);
const b = await psql("select public.chronia_queue()", "authenticated"); ok(!b.ok && /permission denied/.test(b.err), "authenticated cannot run the queue", b);
r = await call(null, { action: "nonsense" }); ok(r.s === 400, "unknown action", r);

console.log(pass + " passed, " + fails.length + " failed");
for (const f of fails) console.log("FAIL " + f);
if (dbErrors.length) { console.log("database errors seen (" + dbErrors.length + "):"); for (const e of [...new Set(dbErrors)].slice(0, 20)) console.log("  " + e); }
Deno.exit(fails.length || dbErrors.length ? 1 : 0);

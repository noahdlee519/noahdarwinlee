// Checks the deployed chronia-edits function from outside, without Noah's Google session:
// node tools/chronia-edits-api-check.mjs [function URL]
// Saving and deleting need a reviewer's session: against the deployed function Noah tries those himself in
// the developer tools; against a local copy (deno run, with a stand-in for Supabase's auth and database), set
// CHRONIA_EDITS_TOKEN to an access token the stand-in takes for a reviewer and they are checked too.
const URL_ = process.argv[2] || "https://kigvciyyjlgjcgnwgrwf.supabase.co/functions/v1/chronia-edits";
const ORIGIN = "https://chroniaatlas.com";
let failed = 0;
const ok = (good, what) => { console.log((good ? "ok   " : "FAIL ") + what); if (!good) failed++; };
const post = (body, token = "", origin = ORIGIN) => fetch(URL_, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin, ...(token ? { Authorization: "Bearer " + token } : {}) }, body: JSON.stringify(body) });

const list = await post({ action: "list" });
const lb = await list.json().catch(() => ({}));
ok(list.status === 200 && Array.isArray(lb.edits), "list without signing in: " + list.status);
ok((list.headers.get("cache-control") || "").includes("max-age=30"), "list may be cached for 30 seconds: " + list.headers.get("cache-control"));

const wrong = "not-a-session-" + Date.now() + "-xxxxxxxxxxxx";
const check = await post({ action: "check", password: "anything" });
ok(check.status === 401, "check without a session is refused, password or not: " + check.status);
const save = await post({ action: "save", edit: { kind: "city-hide", target: "london", from: "1815", to: "1815", value: {} } }, wrong);
ok(save.status === 401, "save with a false session is refused: " + save.status);
const bad = await post({ action: "save", edit: { kind: "nope" } }, wrong);
ok(bad.status === 401, "the session is checked before the fields: " + bad.status);
const del = await post({ action: "delete", id: 1 }, wrong);
ok(del.status === 401, "delete with a false session is refused: " + del.status);
const old = await post({ action: "list" }, "", "https://noahdarwinlee.com");
ok(old.status === 403, "noahdarwinlee.com is no longer answered: " + old.status);

const evil = await fetch(URL_, { method: "OPTIONS", headers: { Origin: "https://evil.example", "Access-Control-Request-Method": "POST" } });
ok(evil.headers.get("access-control-allow-origin") !== "https://evil.example", "another site gets no CORS answer: " + evil.status);

const TOKEN = process.env.CHRONIA_EDITS_TOKEN;
if (TOKEN) {
  const call = async (body) => { const r = await post(body, TOKEN); return [r.status, await r.json().catch(() => ({}))]; };
  let [st, b] = await call({ action: "check" });
  ok(st === 200 && b.ok === true, "check with a reviewer's session: " + st);
  [st, b] = await call({ action: "save", edit: { kind: "country-colour", target: "Bourbon Kingdom of France", from: "1815", to: "1830-06", value: { c: 6 }, note: "test" } });
  ok(st === 200 && b.edit && b.edit.id && b.edit.from === "1815" && b.edit.value.c === 6, "save a new edit: " + st + " " + JSON.stringify(b));
  const id = b.edit && b.edit.id;
  [st, b] = await call({ action: "save", edit: { id, kind: "country-colour", target: "Bourbon Kingdom of France", from: "1815", to: "1830-06", value: { hex: "#C0392B" } } });
  ok(st === 200 && b.edit && b.edit.id === id && b.edit.value.hex === "#c0392b", "change it: " + st);
  [st, b] = await call({ action: "list" });
  ok(st === 200 && b.edits.some((e) => e.id === id && e.kind === "country-colour"), "it is listed");
  const bads = [
    [{ kind: "country-colour", target: "X", from: "1815", to: "1815", value: { c: 10 } }, "value"],
    [{ kind: "country-colour", target: "X", from: "1815", to: "1815", value: { hex: "red" } }, "value"],
    [{ kind: "city-size", target: "london", from: "1815", to: "1815", value: { tier: 2.5 } }, "value"],
    [{ kind: "label", target: "X", from: "1815", to: "1815", value: { lon: 200, lat: 0 } }, "value"],
    [{ kind: "city-name", target: "london", from: "1815", to: "1815", value: { name: "" } }, "value"],
    [{ kind: "city-hide", target: "london", from: "1816", to: "1815", value: {} }, "to"],
    [{ kind: "city-hide", target: "london", from: "1815-07", to: "1815-06-30", value: {} }, "to"],
    [{ kind: "city-hide", target: "london", from: "July 1815", to: "1815", value: {} }, "from"],
    [{ kind: "city-hide", target: "", from: "1815", to: "1815", value: {} }, "target"],
    [{ kind: "nope", target: "london", from: "1815", to: "1815", value: {} }, "kind"],
  ];
  for (const [e, field] of bads) { [st, b] = await call({ action: "save", edit: e }); ok(st === 400 && b.field === field, "refuses " + JSON.stringify(e) + " for " + field + ": " + st + " " + b.field); }
  [st, b] = await call({ action: "save", edit: { kind: "city-hide", target: "london", from: "-500", to: "-200", value: {} } });
  ok(st === 200, "BC dates are accepted: " + st);
  const bc = b.edit && b.edit.id;
  [st, b] = await call({ action: "save", edit: { kind: "city-hide", target: "london", from: "1815-07", to: "1815-07", value: {} } });
  ok(st === 200, "a one-month span is accepted: " + st);
  const mo = b.edit && b.edit.id;
  for (const x of [id, bc, mo]) { [st, b] = await call({ action: "delete", id: x }); ok(st === 200, "delete " + x + ": " + st); }
  [st, b] = await call({ action: "list" });
  ok(!b.edits.some((e) => [id, bc, mo].includes(e.id)), "the deleted edits are gone");
}

console.log(failed ? failed + " failed" : "all passed");
process.exit(failed ? 1 : 0);

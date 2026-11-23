// CHRONIA Premium: $5 once, through Stripe Checkout, frees an account of the page's advertisements and gives it
// five times the daily notes (chronia-blurb reads the same table). One file, no imports, built like chronia-report.
//
// From the page, a POST of JSON with an `action`:
//   status   (signed in or not)  -> { open, premium }: whether Premium is on sale here, and whether this account has it
//   checkout (signed in)         -> { url }: Stripe's payment page for this account
// From Stripe, a POST with a Stripe-Signature header (the webhook, set to this function's address):
//   checkout.session.completed and checkout.session.async_payment_succeeded, paid -> the account has Premium
//   charge.refunded, refunded in full                                             -> the account no longer has it
//
// Secrets (Edge Functions, Secrets; Noah enters them himself): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and,
// optionally, STRIPE_PRICE_ID, a one-time price made in Stripe's dashboard (without it the price is PRICE_CENTS
// US cents, named PRODUCT). Until the first two are set, `open` is false, the page offers nothing, and a checkout is
// refused with 503.

const ORIGINS = [
  /^https:\/\/(www\.)?chroniaatlas\.com$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
];
const SITE = "https://chroniaatlas.com";
const MAX_BODY = 2000, MAX_HOOK = 200000;
const PRICE_CENTS = 500, PRODUCT = "CHRONIA Premium";
const HOOK_TOLERANCE = 300;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function plain(status: number, body: string) {
  return new Response(body, { status, headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
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
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

type Account = { id: string; email: string };

// Only Google accounts, as for the reports: the page signs in with Google and nothing else.
async function account(req: Request): Promise<Account | null> {
  const m = /^Bearer\s+(\S{20,4000})$/.exec(req.headers.get("authorization") || "");
  if (!m) return null;
  const res = await fetch(Deno.env.get("SUPABASE_URL") + "/auth/v1/user", { headers: { apikey: dbKey().apikey, Authorization: "Bearer " + m[1] } });
  if (!res.ok) return null;
  const u = await res.json();
  if (!u || typeof u.id !== "string" || !UUID.test(u.id)) return null;
  const providers = [u.app_metadata && u.app_metadata.provider].concat((u.app_metadata && u.app_metadata.providers) || []);
  if (!providers.includes("google")) return null;
  return { id: u.id, email: typeof u.email === "string" ? u.email.slice(0, 320) : "" };
}

async function hasPremium(id: string) {
  const rows = await db("chronia_premium?user_id=eq." + id + "&select=user_id");
  return Array.isArray(rows) && rows.length > 0;
}

function onSale() {
  return !!Deno.env.get("STRIPE_SECRET_KEY") && !!Deno.env.get("STRIPE_WEBHOOK_SECRET");
}

async function checkout(me: Account, back: string) {
  const p = new URLSearchParams();
  p.set("mode", "payment");
  p.set("client_reference_id", me.id);
  if (me.email) p.set("customer_email", me.email);
  p.set("success_url", back + "/?premium=done");
  p.set("cancel_url", back + "/?premium=no");
  p.set("metadata[user]", me.id);
  p.set("payment_intent_data[metadata][user]", me.id);
  p.set("line_items[0][quantity]", "1");
  const price = Deno.env.get("STRIPE_PRICE_ID");
  if (price) p.set("line_items[0][price]", price);
  else {
    p.set("line_items[0][price_data][currency]", "usd");
    p.set("line_items[0][price_data][unit_amount]", String(PRICE_CENTS));
    p.set("line_items[0][price_data][product_data][name]", PRODUCT);
    p.set("line_items[0][price_data][product_data][description]", "No advertisements on chroniaatlas.com, no watermark on your videos, five times the daily notes, and your reports of errors read first, for this account, for good.");
  }
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: "Bearer " + Deno.env.get("STRIPE_SECRET_KEY"), "Content-Type": "application/x-www-form-urlencoded" },
    body: p.toString(),
  });
  const s = await res.json().catch(() => null);
  if (!res.ok || !s || typeof s.url !== "string" || !/^https:\/\/checkout\.stripe\.com\//.test(s.url)) {
    console.error("stripe checkout " + res.status + " " + JSON.stringify(s && s.error ? { type: s.error.type, code: s.error.code, message: String(s.error.message || "").slice(0, 200) } : {}));
    return null;
  }
  return s.url as string;
}

function hexOf(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Stripe signs "<timestamp>.<body>" with the webhook's secret (HMAC-SHA256), and sends "t=<timestamp>,v1=<hex>[,v1=…]".
async function signed(raw: string, header: string, secret: string) {
  let t = "";
  const sigs: string[] = [];
  for (const part of header.split(",")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim(), v = part.slice(i + 1).trim();
    if (k === "t") t = v;
    else if (k === "v1") sigs.push(v.toLowerCase());
  }
  if (!/^\d{1,12}$/.test(t) || !sigs.length || Math.abs(Date.now() / 1000 - +t) > HOOK_TOLERANCE) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const want = hexOf(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(t + "." + raw)));
  let ok = false;
  for (const s of sigs) {
    if (s.length !== want.length) continue;
    let d = 0;
    for (let i = 0; i < want.length; i++) d |= s.charCodeAt(i) ^ want.charCodeAt(i);
    if (d === 0) ok = true;
  }
  return ok;
}

async function hook(req: Request) {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
  if (!secret) return plain(503, "not set up");
  const raw = await req.text();
  if (raw.length > MAX_HOOK) return plain(413, "too long");
  if (!(await signed(raw, req.headers.get("stripe-signature") || "", secret))) return plain(400, "bad signature");
  let ev: any;
  try { ev = JSON.parse(raw); } catch (_) { return plain(400, "bad body"); }
  const o = ev && ev.data && ev.data.object;
  if (!o) return plain(200, "ignored");
  try {
    if ((ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") && o.mode === "payment" && o.payment_status === "paid") {
      // Only a session this function made: it alone sets metadata.user, and to the same id as client_reference_id. A
      // Stripe Payment Link takes client_reference_id from its address, so any other link or product on the same Stripe
      // account (a donation of $1, say) could otherwise be bought with someone's id and grant Premium.
      const id = String(o.client_reference_id || "");
      if (!UUID.test(id) || !o.metadata || o.metadata.user !== id) return plain(200, "not ours");
      await db("chronia_premium?on_conflict=user_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          user_id: id.toLowerCase(),
          stripe_session: String(o.id || "").slice(0, 200),
          stripe_payment: String(o.payment_intent || "").slice(0, 200),
          amount: Number.isFinite(+o.amount_total) ? Math.round(+o.amount_total) : 0,
          currency: String(o.currency || "").slice(0, 8),
        }),
      });
      return plain(200, "premium");
    }
    if (ev.type === "charge.refunded" && o.refunded === true && typeof o.payment_intent === "string" && /^pi_[A-Za-z0-9_]{6,200}$/.test(o.payment_intent)) {
      await db("chronia_premium?stripe_payment=eq." + o.payment_intent, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      return plain(200, "refunded");
    }
  } catch (e) {
    console.error(e);
    return plain(500, "database");   // Stripe sends the event again
  }
  return plain(200, "ignored");
}

Deno.serve(async (req) => {
  if (req.method === "POST" && req.headers.get("stripe-signature")) return hook(req);
  const origin = req.headers.get("origin");
  if (!allowed(origin)) return new Response("Forbidden", { status: 403 });
  const o = origin as string;
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(o) });
  if (req.method !== "POST") return json(405, { error: "method" }, o);
  const raw = await req.text();
  if (raw.length > MAX_BODY) return json(413, { error: "long" }, o);
  let body: any;
  try { body = JSON.parse(raw); } catch (_) { return json(400, { error: "bad", field: "body" }, o); }
  const action = body && body.action;
  try {
    if (action === "status") {
      const me = await account(req);
      return json(200, { open: onSale(), premium: me ? await hasPremium(me.id) : false, signedIn: !!me }, o);
    }
    if (action === "checkout") {
      const me = await account(req);
      if (!me) return json(401, { error: "signin" }, o);
      if (await hasPremium(me.id)) return json(409, { error: "have" }, o);
      if (!onSale()) return json(503, { error: "closed" }, o);
      // A local copy returns to itself; everything else returns to the site.
      const url = await checkout(me, /^http:\/\/(localhost|127\.0\.0\.1)/.test(o) ? o + "/chronia" : SITE);
      return url ? json(200, { url }, o) : json(502, { error: "stripe" }, o);
    }
    return json(400, { error: "bad", field: "action" }, o);
  } catch (e) {
    console.error(e);
    return json(500, { error: "database" }, o);
  }
});

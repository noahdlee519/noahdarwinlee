/* citylayoutguessr — accounts, the daily scoreboard, and the visit counter.
 *
 * This file is the only part of the site that talks to Supabase, and it is
 * written so that the game never depends on it. If supabase-config.js is empty,
 * if the library fails to load, or if the network is down, every function here
 * resolves to nothing and game.js carries on: the account row and the board
 * simply do not appear.
 *
 * It is a module, so it loads after the page is parsed and cannot block it. It
 * publishes window.clgCloud and fires "clg-cloud-ready" on the document when
 * the session state is known; game.js waits for that rather than assuming.
 */
const CFG = window.CLG_SUPABASE || {};
const ON = Boolean(CFG.url && CFG.anonKey);

/* The board reads by day, and the day has to be the same one the game uses:
   the date in US Eastern, so everyone in the world is on one puzzle. The
   database computes its own copy of this for anything it enforces; this one is
   only used to ask for the right rows. */
const DAY_ZONE = "America/New_York";
let dayFormat = null;
try {
  dayFormat = new Intl.DateTimeFormat("en-CA", {
    timeZone: DAY_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
} catch (err) {
  dayFormat = null;
}

function todayKey() {
  const now = new Date();
  return dayFormat ? dayFormat.format(now) : now.toISOString().slice(0, 10);
}

let client = null;
let session = null;
let profile = null;

async function connect() {
  if (!ON) return null;
  if (client) return client;
  /* Pinned to an exact version on purpose. "@2" would let the CDN hand this
     page whatever the newest 2.x happens to be that day — a script with full
     access to the signed-in session, changing under us without a commit. Bump
     it deliberately, or vendor the file into the repo and import it from
     there. */
  const mod = await import(
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.114.0/+esm"
  );
  client = mod.createClient(CFG.url, CFG.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  return client;
}

/* ---------------- accounts ---------------- */

async function signIn() {
  const db = await connect();
  if (!db) return;
  /* Back to the game itself rather than the site root, so you land where you
     left off. The same URL has to be listed in Supabase under Authentication →
     URL Configuration. */
  const back = window.location.origin + "/citylayoutguessr/";
  await db.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: back }
  });
}

async function signOut() {
  const db = await connect();
  if (!db) return;
  await db.auth.signOut();
  session = null;
  profile = null;
  announce();
}

function whoami() {
  if (!session) return null;
  const meta = session.user.user_metadata || {};
  return {
    id: session.user.id,
    name:
      (profile && profile.display_name) ||
      meta.full_name ||
      meta.name ||
      (session.user.email || "player").split("@")[0],
    avatar: (profile && profile.avatar_url) || meta.avatar_url || ""
  };
}

async function loadProfile() {
  if (!session) return;
  const db = await connect();
  const { data } = await db
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", session.user.id)
    .maybeSingle();
  profile = data || null;
}

function announce() {
  document.dispatchEvent(
    new CustomEvent("clg-cloud-ready", { detail: { user: whoami() } })
  );
}

/* The name that appears on the board. Row-level security lets you write your
   own profile row and nobody else's. */
async function setName(name) {
  const db = await connect();
  if (!db || !session) return { ok: false, reason: "signed-out" };
  const clean = String(name || "").trim().slice(0, 24);
  if (!clean) return { ok: false, reason: "empty" };
  /* Update first, and only insert if there was no row to update. An upsert
     would do both in one call, but it needs the insert policy to pass even when
     the row already exists, and the failure it produces then says nothing
     useful. This way each half reports its own error. */
  const { data, error } = await db
    .from("profiles")
    .update({ display_name: clean })
    .eq("id", session.user.id)
    .select("id");
  if (error) return { ok: false, reason: error.message || "update failed" };

  if (!data || !data.length) {
    const { error: insertError } = await db
      .from("profiles")
      .insert({ id: session.user.id, display_name: clean });
    if (insertError) {
      return { ok: false, reason: insertError.message || "insert failed" };
    }
  }
  profile = Object.assign({}, profile, { display_name: clean });
  announce();
  return { ok: true, name: clean };
}

/* ---------------- the daily board ---------------- */

/* One row per person per day, and the database will not let a second one in.
   A duplicate is the normal case — you played, you came back, you looked at
   the board — so it is reported as "already posted" rather than as an error. */
async function postDaily(correct, total, durationMs) {
  const db = await connect();
  if (!db || !session) return { ok: false, reason: "signed-out" };
  const row = {
    user_id: session.user.id,
    day: todayKey(),
    correct: correct,
    total: total
  };
  if (typeof durationMs === "number" && isFinite(durationMs)) {
    row.duration_ms = Math.max(0, Math.round(durationMs));
  }
  const { error } = await db.from("daily_scores").insert(row);
  if (!error) return { ok: true };
  if (error.code === "23505") return { ok: false, reason: "already" };
  return { ok: false, reason: error.message || "failed" };
}

async function board(day, limit) {
  const db = await connect();
  if (!db) return null;
  const { data, error } = await db
    .from("daily_board")
    .select("place, display_name, avatar_url, correct, user_id")
    .eq("day", day || todayKey())
    .order("place", { ascending: true })
    .limit(limit || 25);
  if (error) return null;
  return data || [];
}

/* The same board, every day added up. */
async function lifetime(limit) {
  const db = await connect();
  if (!db) return null;
  const { data, error } = await db
    .from("lifetime_board")
    .select("place, display_name, avatar_url, total, days, user_id")
    .order("place", { ascending: true })
    .limit(limit || 25);
  if (error) return null;
  return data || [];
}

async function myLifetime() {
  const db = await connect();
  if (!db || !session) return null;
  const { data, error } = await db
    .from("lifetime_board")
    .select("place, total, days")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (error) return null;
  return data || null;
}

/* Your own line, which may be far below the top of the board. */
async function myPlace(day) {
  const db = await connect();
  if (!db || !session) return null;
  const { data, error } = await db
    .from("daily_board")
    .select("place, correct")
    .eq("day", day || todayKey())
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (error) return null;
  return data || null;
}

/* ---------------- counting ---------------- */

/* A visit is counted once per browser per day. Reloading the page all afternoon
   should not read as an afternoon of visitors, and it keeps the table from
   growing a row every time you glance at the game. */
const SEEN_KEY = "ndl-clg-visit-v1";
function firstVisitToday() {
  try {
    const today = todayKey();
    if (localStorage.getItem(SEEN_KEY) === today) return false;
    localStorage.setItem(SEEN_KEY, today);
    return true;
  } catch (err) {
    return true;
  }
}

/* Insert-only from out here: the table has no select policy, so nothing that
   reaches a browser can read it back. Failures are swallowed on purpose — a
   counter is never a reason for a game not to start. */
async function track(kind, detail) {
  if (!ON) return;
  try {
    const db = await connect();
    if (!db) return;
    await db.from("events").insert({
      kind: kind,
      user_id: session ? session.user.id : null,
      day: todayKey(),
      path: location.pathname.slice(0, 299),
      referrer: (document.referrer || "").slice(0, 299),
      detail: detail || null
    });
  } catch (err) {
    /* nothing to do and nothing worth saying */
  }
}

/* ---------------- start-up ---------------- */

window.clgCloud = {
  enabled: ON,
  today: todayKey,
  signIn: signIn,
  signOut: signOut,
  user: whoami,
  setName: setName,
  postDaily: postDaily,
  board: board,
  myPlace: myPlace,
  lifetime: lifetime,
  myLifetime: myLifetime,
  track: track
};

if (ON) {
  (async function start() {
    try {
      const db = await connect();
      const { data } = await db.auth.getSession();
      session = data ? data.session : null;
      if (session) await loadProfile();
      announce();
      if (firstVisitToday()) await track("visit");

      db.auth.onAuthStateChange(async function (event, next) {
        const wasSignedIn = Boolean(session);
        session = next || null;
        profile = null;
        if (session) await loadProfile();
        announce();
        if (!wasSignedIn && session && event === "SIGNED_IN") track("login");
      });
    } catch (err) {
      /* Offline, blocked, or misconfigured: the page keeps its own counsel and
         the game plays on without an account. */
      if (window.console && console.warn) {
        console.warn("citylayoutguessr: cloud features are off —", err.message);
      }
      window.clgCloud.enabled = false;
      announce();
    }
  })();
} else {
  document.addEventListener("DOMContentLoaded", announce);
}

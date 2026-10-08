const CFG = window.CLG_SUPABASE || {};
const ON = Boolean(CFG.url && CFG.anonKey);

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

async function signIn() {
  const db = await connect();
  if (!db) return;
  const back = window.location.origin + "/citylayoutguessr/";
  await db.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: back }
  });
}

const GSI_SRC = "https://accounts.google.com/gsi/client";
let gsiScript = null;

function loadGsi() {
  if (gsiScript) return gsiScript;
  gsiScript = new Promise(function (resolve, reject) {
    const tag = document.createElement("script");
    tag.src = GSI_SRC;
    tag.async = true;
    tag.onload = function () {
      const api =
        window.google && window.google.accounts && window.google.accounts.id;
      if (api) resolve(api);
      else reject(new Error("gsi loaded without an id api"));
    };
    tag.onerror = function () {
      reject(new Error("gsi did not load"));
    };
    document.head.appendChild(tag);
  });
  return gsiScript;
}

function makeNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let raw = "";
  for (let i = 0; i < bytes.length; i++) raw += String.fromCharCode(bytes[i]);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(digest))
    .map(function (b) {
      return b.toString(16).padStart(2, "0");
    })
    .join("");
}

let googleMount = null;
let googleTriesLeft = 2;

async function acceptGoogleToken(credential, nonce) {
  const db = await connect();
  if (!db) return;
  const { error } = await db.auth.signInWithIdToken({
    provider: "google",
    token: credential,
    nonce: nonce
  });
  if (!error) return;
  if (window.console && console.warn) {
    console.warn("citylayoutguessr: google sign-in was refused —", error.message);
  }
  if (googleTriesLeft > 0 && googleMount) {
    mountGoogleButton(googleMount);
    return;
  }
  document.dispatchEvent(new CustomEvent("clg-google-unavailable"));
}

async function mountGoogleButton(mount) {
  if (!ON || !mount) return false;
  if (!CFG.googleClientId) return false;
  if (!window.crypto || !crypto.subtle || !window.TextEncoder) return false;
  if (googleTriesLeft <= 0) return false;
  googleTriesLeft -= 1;
  googleMount = mount;

  let gsi;
  try {
    gsi = await loadGsi();
  } catch (err) {
    if (window.console && console.warn) {
      console.warn("citylayoutguessr: google sign-in is unavailable —", err.message);
    }
    return false;
  }

  const nonce = makeNonce();
  const hashed = await sha256Hex(nonce);

  try {
    gsi.initialize({
      client_id: CFG.googleClientId,
      nonce: hashed,
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
      callback: function (res) {
        if (res && res.credential) acceptGoogleToken(res.credential, nonce);
      }
    });
    mount.textContent = "";
    gsi.renderButton(mount, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "signin_with",
      logo_alignment: "left",
      width: 288
    });
  } catch (err) {
    if (window.console && console.warn) {
      console.warn("citylayoutguessr: google sign-in did not start —", err.message);
    }
    return false;
  }
  return true;
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

const INVISIBLE = /[\u00AD\u034F\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u206A-\u206F\u3164\uFEFF\uFFA0]/g;
const STACKING = /[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20F0]{5}/;

function tidyName(name) {
  const clean = String(name == null ? "" : name)
    .replace(INVISIBLE, "")
    .replace(/\s+/g, " ")
    .replace(/[\u0001-\u001F\u007F-\u009F\uFFF9-\uFFFB]/g, "")
    .trim()
    .slice(0, 24)
    .trim();

  if (!clean) return { ok: false, reason: "empty" };
  if (!/[\p{L}\p{N}]/u.test(clean)) {
    return { ok: false, reason: "that name is not allowed — it needs a letter or a number in it" };
  }
  if (STACKING.test(clean)) {
    return { ok: false, reason: "that name is not allowed — too many accents" };
  }
  return { ok: true, name: clean };
}

async function setName(name) {
  const db = await connect();
  if (!db || !session) return { ok: false, reason: "signed-out" };
  const tidy = tidyName(name);
  if (!tidy.ok) return tidy;
  const clean = tidy.name;
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
  }
}

window.clgCloud = {
  enabled: ON,
  today: todayKey,
  signIn: signIn,
  mountGoogleButton: mountGoogleButton,
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

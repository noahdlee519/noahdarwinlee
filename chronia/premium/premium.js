// CHRONIA Premium's page. It reads the Google session the atlas keeps (chronia-auth in this site's storage), as the
// reports page does, and asks chronia-premium whether the account has Premium and, to buy it, for Stripe's payment
// page. The button reads the same for everyone. Signed out, it goes to the atlas with ?signin=premium, which opens the
// account panel; once the reader has signed in the atlas sends them back here with ?buy=1, and the page goes straight
// on to Stripe's payment page, so the way from signed out to paying is one press, a sign-in, and no more. Stripe
// returns to the atlas, which confirms the payment (premiumBack in app.js).
(function () {
  var BASE = "https://jvcmeuqlyygpwelmvxuv.supabase.co/functions/v1/";
  var REPORT = BASE + "chronia-report", PREMIUM = BASE + "chronia-premium", AUTH = "chronia-auth", HAD = "chronia-premium";
  var go = document.getElementById("pm-go"), note = document.getElementById("pm-note");
  // The page's language (page-lang.js); English where it has none.
  var T = window.CH_PAGE_T || function (t, v) { return v ? t.replace(/\{(\w+)\}/g, function (m, k) { return v[k]; }) : t; };
  var BUY = "Get Premium for $10";
  // The button's words, with its figures set in the page's numerals (the text face's old-style 0 reads as an o).
  function label(text) {
    go.textContent = "";
    String(text).split(/(\$?\d[\d.,]*)/).forEach(function (part, i) {
      if (!part) return;
      if (i % 2) { var n = document.createElement("span"); n.className = "pm-num"; n.textContent = part; go.appendChild(n); }
      else go.appendChild(document.createTextNode(part));
    });
  }
  // Sent back here by the atlas after signing in to buy: taken out of the address at once, so that coming back from
  // Stripe's page, or reloading, never opens it a second time.
  var goOn = /[?&]buy=1(&|$)/.test(location.search || "");
  if (goOn) { try { history.replaceState(null, "", location.pathname + location.search.replace(/([?&])buy=1(&|$)/, function (all, a, c) { return c ? a : ""; }) + location.hash); } catch (e) {} }
  var session = null;
  try { session = JSON.parse(localStorage.getItem(AUTH) || "null"); } catch (e) {}
  if (!session || typeof session.a !== "string" || typeof session.r !== "string") session = null;

  function post(url, body, token) {
    var headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = "Bearer " + token;
    return fetch(url, { method: "POST", headers: headers, body: JSON.stringify(body) }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (j) { return { status: res.status, body: j }; });
    }, function () { return { status: 0, body: {} }; });
  }
  function claims(token) {
    try {
      var p = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p), function (ch) { return ch.charCodeAt(0); }))) || {};
    } catch (e) { return {}; }
  }
  // The atlas's session, refreshed (and kept again for the atlas) when it is near its end.
  function token() {
    if (!session) return Promise.resolve(null);
    if ((session.e || 0) - Date.now() > 60000) return Promise.resolve(session.a);
    return post(REPORT, { action: "refresh", refresh_token: session.r }).then(function (r) {
      if (r.status !== 200) {
        if (r.status === 401) { session = null; try { localStorage.removeItem(AUTH); } catch (e) {} }
        return null;
      }
      session = { a: r.body.access_token, r: r.body.refresh_token, e: (+claims(r.body.access_token).exp || 0) * 1000 };
      try { localStorage.setItem(AUTH, JSON.stringify(session)); } catch (e) {}
      return session.a;
    });
  }
  function ask(body) {
    return token().then(function (t) { return post(PREMIUM, body, t); });
  }
  function who() {
    if (!session) return "";
    var c = claims(session.a), m = c.user_metadata || {};
    return String(m.full_name || m.name || c.email || "").slice(0, 80);
  }
  function signedOut() {
    go.hidden = false;
    go.removeAttribute("aria-disabled");
    label(T(BUY));
    go.setAttribute("href", "../?signin=premium");
    note.textContent = "";
  }
  function have() {
    document.body.classList.add("pm-had");
    go.hidden = false;
    go.removeAttribute("aria-disabled");
    go.textContent = T("Back to the atlas");
    go.setAttribute("href", "../");
    note.textContent = who() ? T("You have CHRONIA Premium, signed in as {name}. Thank you for your support.", { name: who() }) : T("You have CHRONIA Premium. Thank you for your support.");
  }
  function buyable() {
    go.hidden = false;
    go.removeAttribute("aria-disabled");
    label(T(BUY));
    go.setAttribute("href", "#buy");
    note.textContent = who() ? T("Signed in as {name}.", { name: who() }) : "";
  }
  function checkout() {
    go.setAttribute("aria-disabled", "true");
    note.textContent = T("Opening Stripe’s payment page…");
    ask({ action: "checkout" }).then(function (r) {
      if (r.status === 200 && typeof r.body.url === "string" && /^https:\/\/checkout\.stripe\.com\//.test(r.body.url)) { location.assign(r.body.url); return; }
      go.removeAttribute("aria-disabled");
      if (r.status === 409) { check(); return; }
      if (r.status === 401) { signedOut(); note.textContent = T("Sign in again on the atlas to buy Premium."); return; }
      note.textContent = T("The payment page could not be opened just now. Nothing was charged.");
    });
  }
  function closed() {
    go.hidden = true;
    note.textContent = T("Premium can't be bought just now. Please try again later.");
  }

  function check() {
    if (!session) { signedOut(); return; }
    go.setAttribute("aria-disabled", "true");
    label(T(BUY));
    note.textContent = T("Checking your account…");
    ask({ action: "status" }).then(function (r) {
      var on = goOn;
      goOn = false;
      if (r.status !== 200) { buyable(); return; }
      if (!r.body.signedIn) { signedOut(); return; }
      var id = String(claims(session.a).sub || "");
      try { if (r.body.premium) localStorage.setItem(HAD, id); else localStorage.removeItem(HAD); } catch (e) {}
      if (r.body.premium) have();
      else if (!r.body.open) closed();
      else { buyable(); if (on) checkout(); }
    });
  }

  go.addEventListener("click", function (e) {
    if (go.getAttribute("aria-disabled") === "true") { e.preventDefault(); return; }
    if (go.getAttribute("href") !== "#buy") return;
    e.preventDefault();
    checkout();
  });

  check();
})();

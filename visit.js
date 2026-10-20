(function () {
  "use strict";
  var URL = "https://kigvciyyjlgjcgnwgrwf.supabase.co/rest/v1/rpc/count_visit";
  var KEY = "sb_publishable_Ki-kbO5xBeMdVt3Ltv3i7A_dzQz2ivy";
  var STORE = "ndl-last-view", GAP = 30 * 60000, now = Date.now(), last = 0;
  if (navigator.webdriver) return;
  try {
    last = +localStorage.getItem(STORE) || 0;
    localStorage.setItem(STORE, String(now));
  } catch (e) { }
  if (now - last < GAP) return;
  try {
    fetch(URL, {
      method: "POST",
      keepalive: true,
      headers: { apikey: KEY, "Content-Type": "application/json" },
      body: "{}",
    }).catch(function () { });
  } catch (e) { }
})();

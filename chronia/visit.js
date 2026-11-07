(function () {
  "use strict";
  var URL = "https://jvcmeuqlyygpwelmvxuv.supabase.co/rest/v1/rpc/count_visit";
  var KEY = "sb_publishable_riL2FDo90GdB6yD7-Y3oNQ_3qSzudbu";
  var STORE = "chronia-last-view", GAP = 30 * 60000, now = Date.now(), last = 0;
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

(function () {
  var CARRY = "#carry=", SKIP = { "uchronia-auth": 1 };
  var b64 = function (s) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
  var unb64 = function (s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return decodeURIComponent(escape(atob(s))); };
  if (/(^|\.)noahdarwinlee\.com$|\.github\.io$/.test(location.hostname)) {
    var kept = {}, n = 0;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if ((/^uchronia-/.test(k) || k === "ndl-theme") && !SKIP[k]) { kept[k] = localStorage.getItem(k); n++; }
      }
    } catch (e) { }
    var to = "https://chroniaatlas.com/uchronia/" + location.search;
    if (n) { kept[""] = location.hash; to += CARRY + b64(JSON.stringify(kept)); } else to += location.hash;
    location.replace(to);
    return;
  }
  if (location.hash.indexOf(CARRY) !== 0) return;
  var hash = "";
  try {
    var got = JSON.parse(unb64(location.hash.slice(CARRY.length)));
    hash = typeof got[""] === "string" ? got[""] : "";
    for (var key in got) {
      if (!key || SKIP[key] || !(/^uchronia-/.test(key) || key === "ndl-theme") || typeof got[key] !== "string") continue;
      if (localStorage.getItem(key) === null) localStorage.setItem(key, got[key]);
    }
  } catch (e) { }
  history.replaceState(null, "", location.pathname + location.search + hash);
})();

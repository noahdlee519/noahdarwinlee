(function () {
  var LANGS = { en: "English", es: "Español", fr: "Français", de: "Deutsch", nl: "Nederlands", it: "Italiano", pt: "Português", cs: "Čeština", pl: "Polski", tr: "Türkçe", ru: "Русский", zh: "中文", ja: "日本語", ko: "한국어" };
  var pick = function () {
    var q = /[?&]lang=([a-z]{2})\b/.exec(location.search);
    if (q && LANGS[q[1]]) return q[1];
    try { var s = localStorage.getItem("lang"); if (s && LANGS[s]) return s; } catch (e) {}
    var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"];
    for (var i = 0; i < list.length; i++) { var c = String(list[i]).toLowerCase().slice(0, 2); if (LANGS[c]) return c; }
    return "en";
  };
  var lang = pick();
  window.CH_LANGS = LANGS;
  window.CH_LANG = lang;
  document.documentElement.lang = lang === "zh" ? "zh-Hans" : lang;
  // The translations sit beside this file, so a page in a folder (comments/) loads them as ../lang.js does.
  var here = (document.currentScript && document.currentScript.getAttribute("src") || "").replace(/[^\/]*$/, "");
  if (lang !== "en") document.write('<script src="' + here + 'lang/' + lang + '.js"><\/script>');
})();

// The atlas's language for its own pages (the FAQ and Premium; Noah, 25 November 2026). It picks the language as
// lang.js does (?lang=, then the choice kept in this site's storage, then the browser's), loads that language's
// lang/pages-<code>.js, which sets window.CH_PAGE to a table from each English text to its translation, and, once the
// page is read, puts the translations in. A text is looked up by its English HTML with its runs of spaces made one;
// whatever the table lacks stays in English. T() is for the strings a page's own script writes.
(function () {
  var LANGS = ["en", "es", "fr", "de", "nl", "it", "pt", "cs", "pl", "tr", "ru", "zh", "ja", "ko"];
  var pick = function () {
    var q = /[?&]lang=([a-z]{2})\b/.exec(location.search);
    if (q && LANGS.indexOf(q[1]) >= 0) return q[1];
    try { var s = localStorage.getItem("lang"); if (s && LANGS.indexOf(s) >= 0) return s; } catch (e) {}
    var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"];
    for (var i = 0; i < list.length; i++) { var c = String(list[i]).toLowerCase().slice(0, 2); if (LANGS.indexOf(c) >= 0) return c; }
    return "en";
  };
  var lang = pick();
  window.CH_PAGE = window.CH_PAGE || {};
  window.CH_PAGE_T = function (s, vars) {
    var t = window.CH_PAGE[s] || s;
    return vars ? t.replace(/\{(\w+)\}/g, function (m, k) { return k in vars ? vars[k] : m; }) : t;
  };
  var norm = function (s) { return s.replace(/\s+/g, " ").trim(); };
  var SEL = "h1, h2, h3, p, li, figcaption, a, span, b, summary, dt, dd";
  // The elements that carry text of their own and sit in no other such element: a paragraph is translated whole, with
  // its links and bold words, and a list item that only holds a link is translated through the link.
  window.CH_PAGE_UNITS = function (root) {
    var out = [];
    root.querySelectorAll(SEL).forEach(function (el) {
      for (var a = el.parentElement; a && a !== root; a = a.parentElement) if (out.indexOf(a) >= 0) return;
      for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && /\S/.test(n.nodeValue)) { out.push(el); return; }
    });
    return out;
  };
  if (lang === "en") return;
  var tag = lang === "zh" ? "zh-Hans" : lang;
  // A page kept in English (data-english-only on its body: "binding" for the privacy policy and the terms, "reference"
  // for Sources and method) keeps lang="en" for its text, marks what is translated with the reader's language, and says
  // under its heading, in that language, that the rest is in English.
  var englishOnly = function () { return document.body && document.body.getAttribute("data-english-only"); };
  var here = (document.currentScript && document.currentScript.getAttribute("src") || "").replace(/[^\/]*$/, "");
  document.write('<script src="' + here + "lang/pages-" + lang + '.js"><\/script>');
  var apply = function () {
    var D = window.CH_PAGE;
    var only = englishOnly();
    if (!only) document.documentElement.lang = tag;
    window.CH_PAGE_UNITS(document.body).forEach(function (el) { var t = D[norm(el.innerHTML)]; if (t) { el.innerHTML = t; if (only) el.lang = tag; } });
    var h1 = document.querySelector("main h1"), note = only && D["(note) " + only];
    if (h1 && note) {
      var p = document.createElement("p");
      p.className = "cp-lang-note"; p.lang = tag; p.textContent = note;
      h1.parentNode.insertBefore(p, h1.nextSibling);
    }
    document.querySelectorAll("[aria-label], img[alt]").forEach(function (el) {
      ["aria-label", "alt"].forEach(function (k) { var v = el.getAttribute(k), t = v && D[norm(v)]; if (t) el.setAttribute(k, t); });
    });
    if (D[document.title]) document.title = D[document.title];
    var m = document.querySelector('meta[name="description"]');
    if (m && D[m.content]) m.content = D[m.content];
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply); else apply();
})();

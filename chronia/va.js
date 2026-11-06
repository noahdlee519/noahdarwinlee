// Vercel Web Analytics for chroniaatlas.com (see the privacy page, section 3). It counts page views with the
// page's path, where the visitor came from, their country and region, and their browser, system, and kind of
// device, with no cookies; Vercel tells one visitor from another by a hash of the request that it drops after
// a day. Only on chroniaatlas.com (the same pages are served from noahdarwinlee.com/chronia/, which only
// redirects here), never for automated browsers, and never in a browser with va-disable set in its storage
// (localStorage.setItem("va-disable", "1") leaves Noah's own visits out). The address is sent without anything
// after the path, so the date and view in the # part never leave the browser.
(function () {
  "use strict";
  if (!/(^|\.)chroniaatlas\.com$/.test(location.hostname) || navigator.webdriver) return;
  try { if (localStorage.getItem("va-disable")) return; } catch (e) { }
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  window.va("beforeSend", function (ev) {
    try { var u = new URL(ev.url); ev.url = u.origin + u.pathname; } catch (e) { }
    return ev;
  });
  var s = document.createElement("script");
  s.defer = true;
  s.src = "/_vercel/insights/script.js";
  document.head.appendChild(s);
})();

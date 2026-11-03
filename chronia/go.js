// CHRONIA lives at chroniaatlas.com. On noahdarwinlee.com (GitHub Pages, which cannot redirect), its old
// pages send their visitors on to the same page there, with the date and view in the link.
(function () {
  if (!/(^|\.)noahdarwinlee\.com$|\.github\.io$/.test(location.hostname)) return;
  var path = location.pathname.replace(/^(\/noahdarwinlee)?\/chronia(\/|$)/, "/");
  location.replace("https://chroniaatlas.com" + path + location.search + location.hash);
})();

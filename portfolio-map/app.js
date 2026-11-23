// The interface around the map: which world to show, the panel, search, the rail, the footer, and the phone's sheet.
(function () {
  "use strict";
  var PM = window.PortfolioMap;
  var $ = PM.$, store = PM.store, ROOT = PM.ROOT;
  var WORLD_KEY = "portfolio-map-world";

  var params = new URLSearchParams(location.search);
  var state = { projects: [], byId: {}, worlds: [], world: null, map: null };

  function pickWorld(worlds) {
    var asked = params.get("world");
    var found = worlds.filter(function (w) { return w.slug === asked; })[0];
    if (found) return found;
    var last = store.get(WORLD_KEY);
    var i = worlds.findIndex(function (w) { return w.slug === last; });
    return i >= 0 ? worlds[(i + 1) % worlds.length] : worlds[Math.floor(Math.random() * worlds.length)];
  }

  function loadWorld(entry) {
    return PM.getJSON(ROOT + "worlds/" + entry.slug + ".json").then(function (w) {
      state.world = w;
      store.set(WORLD_KEY, w.slug);
      state.map.projectsById = state.byId;
      state.map.load(w);
      return document.fonts.ready.then(function () {
        state.map.measureLabels();
        state.map.set({ s: state.map.fit(), tx: 0, ty: 0 });
      });
    });
  }

  Promise.all([PM.getJSON(ROOT + "projects.json"), PM.getJSON(ROOT + "worlds/index.json")]).then(function (r) {
    state.projects = r[0];
    r[0].forEach(function (p) { state.byId[p.id] = p; });
    state.worlds = r[1];
    state.map = new PM.MapView($("#map"));
    state.map.onSelect = function (id, province) { state.map.select(id, province); };
    state.map.onView = function (m) {
      var z = m.zoom(), lim = m.limits();
      $("#zoom-in").disabled = m.s >= lim.max - 1e-6;
      $("#zoom-out").disabled = m.s <= lim.min + 1e-6;
      void z;
    };
    $("#zoom-in").addEventListener("click", function () { state.map.zoomBy(1.6); });
    $("#zoom-out").addEventListener("click", function () { state.map.zoomBy(1 / 1.6); });
    window.addEventListener("resize", function () { state.map.resized(); });
    return loadWorld(pickWorld(state.worlds));
  }).then(function () {
    window.__portfolioMap = { ready: true, map: state.map, state: state };
  });
})();

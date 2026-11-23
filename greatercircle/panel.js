(function (root) {
  "use strict";
  root.GreatCirclePanel = function (app) {
    var state = app.state, $ = app.$, panel = app.panel, fmt = app.fmt, scheduleRender = app.scheduleRender, joinNames = app.joinNames, requestRoute = app.requestRoute, names = app.names, featureById = app.featureById, avoidChanged = app.avoidChanged, writeUrl = app.writeUrl, uniqueBase = app.uniqueBase, removeRegion = app.removeRegion, regionById = app.regionById, canHover = app.canHover, avoidedNames = app.avoidedNames, visible = app.visible, setSheet = app.setSheet, layout = app.layout, fmtLonLat = app.fmtLonLat, flyTo = app.flyTo, fitRoute = app.fitRoute, ANTARCTICA = app.ANTARCTICA;
    function avoiding() { return !!(state.avoid.size || state.regions.length); }
    function detourOf(res) { return !!(res && res.status === "done" && avoiding() && res.waypoints && res.lengthKm > res.directKm + 0.5); }
    function availableTabs(res) {
      if (!res || res.status !== "done") return [];
      var t = ["direct"];
      if (detourOf(res)) t.push("avoid");
      if (!res.antipodal) t.push("plan");
      return t;
    }
    function currentTab() {
      var t = availableTabs(state.result);
      if (!t.length) return null;
      if (state.tab && t.indexOf(state.tab) >= 0) return state.tab;
      return t.indexOf("avoid") >= 0 ? "avoid" : "direct";
    }
    function codeOf(pt, fallback) {
      var m = pt && pt.label && /\(([A-Z0-9]{3,4})\)/.exec(pt.label);
      return m ? m[1] : fallback;
    }
    function shortName(pt) {
      if (!pt) return "";
      if (!pt.label) return fmtLonLat(pt);
      return pt.label.replace(/\s*\([A-Z0-9]{3,4}\)/, "").split(",")[0].replace(/ (International )?Airport$/, "");
    }
    function endName(slot) { var pt = state[slot]; return codeOf(pt, null) || shortName(pt) || slot.toUpperCase(); }
    var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    function tabCoords(tab) {
      var res = state.result;
      if (!res || res.status !== "done") return null;
      if (tab === "plan") return state.plan && state.plan.status === "done" ? state.plan.waypoints : null;
      if (tab === "avoid") return res.waypoints;
      return res.antipodal && res.waypoints ? res.waypoints : [[state.a.lon, state.a.lat], [state.b.lon, state.b.lat]];
    }
    function timeFor(tab, reverse) {
      var c = tabCoords(tab);
      if (!c) return null;
      if (reverse) c = c.slice().reverse();
      return window.GreatCircle.flightHours(c, { wind: !!state.wind, month: new Date().getMonth() });
    }
    function hours(km) { return hoursText(km / 850 + 0.5); }
    function hoursText(h) {
      var hh = Math.floor(h), mm = Math.round((h - hh) * 12) * 5;
      if (mm === 60) { hh++; mm = 0; }
      return { text: "≈ " + hh + "h " + (mm < 10 ? "0" : "") + mm + "m", spoken: "about " + hh + (hh === 1 ? " hour" : " hours") + (mm ? " " + mm + " minutes" : "") };
    }
    function pctOf(extra, of) { return (100 * extra / of).toFixed(1) + "%"; }
    function setText(el, s) { if (el.textContent !== s) el.textContent = s; }
    function avoidLabel() {
      var n = avoidedNames();
      if (n.length <= 2) return joinNames(n);
      return n.length + " places";
    }
    function tabKm(tab) {
      var res = state.result;
      if (!res || res.status !== "done") return null;
      if (tab === "direct") return res.directKm;
      if (tab === "avoid") return res.lengthKm;
      return state.plan && state.plan.status === "done" ? state.plan.km : null;
    }

    var ui = {
      result: $("result"), tabs: $("tabs"), big: $("hero-big"), time: $("hero-time"), delta: $("hero-delta"), note: $("hero-note"),
      warn: $("warn"), plan: $("plan"), planStatus: $("plan-status"), timeline: $("timeline"), planAll: $("plan-all"), planTitle: $("plan-title"),
      crosses: $("crosses"), crossTitle: $("crosses-title"), crossList: $("cross-list"), foot: $("foot"), stats: $("stats"), status: $("status"),
      options: $("options"), optChips: $("opt-chips"), examples: $("examples"), tagline: $("tagline")
    };
    var warnActions = [];

    function renderBusy() {
      if (!state.busy) return;
      var what = !state.ready ? "Starting the route finder…" : avoiding() ? "Finding the way round " + avoidLabel() + "…" : "Measuring…";
      ui.result.hidden = false;
      ui.result.classList.add("is-busy");
      ui.result.setAttribute("aria-busy", "true");
      panel.classList.add("has-result");
      if (!state.result) { setText(ui.big, "…"); setText(ui.time, ""); ui.tabs.hidden = true; }
      setText(ui.note, what + (state.progress ? " " + state.progress.toLocaleString() + " corners so far" : ""));
    }

    var warnSet = false;
    function warning(text, actions) {
      if (text) warnSet = true;
      warnActions = actions || [];
      if (!text) { ui.warn.hidden = true; ui.warn.innerHTML = ""; ui.warn.dataset.key = ""; return; }
      var key0 = text + "|" + warnActions.map(function (a) { return a.label; }).join("|");
      if (ui.warn.dataset.key === key0 && !ui.warn.hidden) return;
      ui.warn.innerHTML = "";
      ui.warn.hidden = false;
      var key = text + "|" + warnActions.map(function (a) { return a.label; }).join("|");
      if (ui.warn.dataset.key === key && !ui.warn.hidden) return;
      ui.warn.dataset.key = key;
      var p = document.createElement("p"); p.className = "gc-warn-text"; p.textContent = text; ui.warn.appendChild(p);
      if (warnActions.length) {
        var row = document.createElement("div"); row.className = "gc-warn-actions";
        warnActions.forEach(function (a, i) {
          var b = document.createElement("button"); b.type = "button"; b.className = "gc-btn " + (i ? "gc-btn-quiet" : "gc-btn-primary"); b.dataset.action = i; b.textContent = a.label;
          row.appendChild(b);
        });
        ui.warn.appendChild(row);
      }
    }
    ui.warn.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("button[data-action]");
      if (!b) return;
      var a = warnActions[+b.dataset.action];
      if (a) { a.fn(); if (!document.activeElement || document.activeElement === document.body || !document.body.contains(b)) $("tabpanel").focus({ preventScroll: true }); }
    });

    function insideWarning(res) {
      var plain = true, actions = [];
      var where = function (raw, within) {
        return joinNames(uniqueBase(raw).map(function (id) {
          var r = regionById(id);
          if (!r) {
            if (within.indexOf(id) >= 0 || !(state.bufferKm > 0)) return "in " + names([id])[0];
            plain = false;
            return "too close to " + names([id])[0] + " for a " + fmtBuffer(state.bufferKm) + " buffer";
          }
          var inBase = raw.some(function (x) { return String(x) === id; });
          if (!inBase) { plain = false; return "within " + fmtBuffer(state.bufferKm) + " of " + r.name + (r.inverted ? "'s edge" : ""); }
          if (r.inverted) { plain = false; return "outside " + r.name; }
          return "in " + r.name;
        }));
      };
      var parts = [];
      if (res.insideA.length) parts.push(endName("a") + " is " + where(res.insideA, (res.startIn || []).map(String)));
      if (res.insideB.length) parts.push(endName("b") + " is " + where(res.insideB, (res.endIn || []).map(String)));
      var nearest = Infinity;
      [res.nearA, res.nearB].forEach(function (near, k) {
        var inside = ((k ? res.endIn : res.startIn) || []).map(String);
        Object.keys(near || {}).forEach(function (id) { if (inside.indexOf(id) < 0) nearest = Math.min(nearest, near[id]); });
      });
      if (isFinite(nearest)) {
        var fits = BUFFER_MI.filter(function (mi) { return mi * MI_KM * 1.035 + 0.1 < nearest && mi * MI_KM < state.bufferKm; });
        var to = fits.length ? fits[fits.length - 1] : 0;
        actions.push({ label: to ? "Use a " + to + " mi buffer" : "Turn the buffer off", fn: function () { setBuffer(to); } });
      }
      uniqueBase(res.insideA.concat(res.insideB)).forEach(function (id) {
        var r = regionById(id);
        actions.push({ label: r ? "Remove " + r.name : "Allow " + names([id])[0], fn: function () { if (r) removeRegion(r); else { state.avoid.delete(id); avoidChanged(); } } });
      });
      warning(parts.join("; ") + (plain ? ", which you are avoiding." : "."), actions);
    }

    function renderPanel() {
      var res = state.result, tabs = availableTabs(res);
      if (state.tab && tabs.length && tabs.indexOf(state.tab) < 0) state.tab = null;
      var tab = currentTab();
      var hasA = !!state.a, hasB = !!state.b;
      panel.classList.toggle("is-empty", !hasA && !hasB);
      ui.examples.hidden = hasA || hasB;
      ui.tagline.hidden = hasA || hasB;
      ui.optChips.hidden = !(hasA || hasB || avoiding());
      setText($("code-a"), codeOf(state.a, "A"));
      setText($("code-b"), codeOf(state.b, "B"));
      setText($("sum-a"), endName("a")); setText($("sum-b"), endName("b"));
      setText($("sum-a-name"), codeOf(state.a, null) ? shortName(state.a) : "");
      setText($("sum-b-name"), codeOf(state.b, null) ? shortName(state.b) : "");
      $("fit").hidden = !(hasA && hasB);
      renderOptionChips();
      ui.result.classList.remove("is-busy");
      ui.result.setAttribute("aria-busy", "false");
      panel.classList.toggle("has-result", !!res);
      ui.result.hidden = !res;
      ui.plan.hidden = true;
      ui.crosses.hidden = true;
      ui.foot.hidden = !res;
      var legend = $("legend");
      legend.hidden = !(res && res.status === "done");
      if (res && res.status === "done") {
        var others = tabs.filter(function (k) { return k !== "plan" || (state.plan && state.plan.status === "done"); }).length - 1;
        $("legend-others").hidden = others < 1;
        setText($("legend-others-text"), others === 1 ? "The other way" : "The other ways");
        $("legend-avoid").hidden = !avoiding();
        setText($("legend-avoid-text"), state.bufferKm > 0 ? "Avoided, with its " + fmtBuffer(state.bufferKm) + " buffer" : "Avoided");
      }
      if (!res) { warning(null); return; }
      ui.tabs.hidden = tabs.length < 2;
      ui.tabs.classList.toggle("is-two", tabs.length === 2);
      ["direct", "avoid", "plan"].forEach(function (k) {
        var b = $("tab-" + k), on = k === tab;
        b.hidden = tabs.indexOf(k) < 0;
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
        var km = tabKm(k);
        setText($("tab-" + k + "-km"), km != null ? fmt(km) : (k === "plan" && state.plan && state.plan.status === "pending" ? "…" : k === "plan" ? "none" : ""));
      });
      setText($("tab-avoid-name"), "Avoiding");
      $("tab-avoid").setAttribute("aria-label", "Avoiding " + avoidLabel() + (tabKm("avoid") != null ? ", " + fmt(tabKm("avoid")) : ""));
      $("tabpanel").setAttribute("aria-labelledby", "tab-" + (tab || "direct"));
      var big = "", time = "", delta = "", note = "", bigKm = null;
      warnSet = false;
      if (res.status === "error") {
        big = "–";
        ui.foot.hidden = true;
        warning("Something went wrong finding the route.", [{ label: "Try again", fn: function () { requestRoute(); } }]);
      } else if (res.status === "inside") {
        big = fmt(res.directKm); note = "direct";
        insideWarning(res);
      } else if (res.status === "none") {
        big = fmt(res.directKm); note = "direct";
        var lastId = Array.from(state.avoid.keys()).pop(), lastR = state.regions[state.regions.length - 1];
        var acts = [];
        if (lastR) acts.push({ label: "Remove " + lastR.name, fn: function () { removeRegion(lastR); } });
        else if (lastId) acts.push({ label: "Allow " + state.avoid.get(lastId), fn: function () { state.avoid.delete(lastId); avoidChanged(); } });
        warning("There is no way from " + endName("a") + " to " + endName("b") + " that stays out of " + joinNames(avoidedNames()) + ".", acts);
      } else if (tab === "direct") {
        big = fmt(res.directKm); time = hoursText(timeFor("direct")).text; bigKm = res.directKm;
        if (res.antipodal) delta = endName("a") + " and " + endName("b") + " are antipodes: every way round is this long";
        else delta = "The great circle, the shortest way there is";
        if (avoiding() && !detourOf(res)) note = "Already stays out of " + avoidLabel() + (state.bufferKm > 0 ? " | " + fmtBuffer(state.bufferKm) + " buffer" : "");
        if (detourOf(res)) {
          var over = (res.directCrosses || []).map(String).filter(function (id) { return state.avoid.has(id); }).map(function (id) { return state.avoid.get(id); });
          warning(over.length ? "Flies over " + joinNames(over) + ", which you are avoiding." : "Goes through what you are avoiding.", [{ label: "Go round it", fn: function () { setTab("avoid", true); } }]);
        }
      } else if (tab === "avoid") {
        var ex = res.lengthKm - res.directKm;
        big = fmt(res.lengthKm); time = hoursText(timeFor("avoid")).text; bigKm = res.lengthKm;
        delta = "+" + fmt(ex) + " (" + pctOf(ex, res.directKm) + ") to go round " + avoidLabel();
        note = whyLine(res);
      } else if (tab === "plan") {
        var pl = state.plan || { status: "pending" };
        if (pl.status === "done") {
          big = fmt(pl.km); time = hoursText(timeFor("plan")).text; bigKm = pl.km;
          delta = "+" + fmt(pl.overKm) + " (" + pctOf(pl.overKm, res.lengthKm) + ") over the shortest way" + (detourOf(res) ? " round" : "");
          note = "From one radio beacon to the next, as a flight plan does";
        } else if (pl.status === "pending") {
          big = "…"; note = "Finding radio beacons along the way…";
        } else if (pl.status === "none") {
          big = fmt(res.lengthKm);
          warning("No chain of radio beacons reaches from " + endName("a") + " to " + endName("b") + " here.", [{ label: detourOf(res) ? "Show the way round" : "Show the shortest way", fn: function () { setTab(detourOf(res) ? "avoid" : "direct", true); } }]);
        } else {
          big = fmt(res.lengthKm);
          warning("The radio beacons could not be loaded.", [{ label: "Try again", fn: function () { requestRoute(); } }]);
        }
      }
      if (!warnSet) warning(null);
      showBig(bigKm, big); setText(ui.time, time); setText(ui.delta, delta); setText(ui.note, note);
      var windEl = $("hero-wind"), back = time && state.wind ? timeFor(tab, true) : null;
      windEl.hidden = back == null;
      if (back != null) setText(windEl, endName("b") + " to " + endName("a") + " " + hoursText(back).text + ", with typical " + MONTHS[new Date().getMonth()] + " winds");
      ui.delta.hidden = !delta; ui.note.hidden = !note; ui.time.hidden = !time;
      if (tab === "plan") renderPlan();
      renderCrosses(tab);
      var ms = res.ms, ex2 = res.expanded;
      if (tab === "plan" && state.plan && state.plan.status === "done") { ms = (ms || 0) + state.plan.ms; ex2 = (ex2 || 0) + state.plan.expanded; }
      setText(ui.stats, ms != null && ex2 ? "Worked out in " + (ms / 1000).toFixed(ms < 100 ? 2 : 1) + " s | " + ex2.toLocaleString() + (tab === "plan" ? " corners and beacons searched" : " corners searched") : "");
      layoutSoon();
    }

    var bigShown = null, bigAnim = 0;
    function showBig(km, text) {
      cancelAnimationFrame(bigAnim);
      var from = bigShown;
      bigShown = km;
      if (km == null || from == null || from === km || app.reduceMotion()) { setText(ui.big, text); return; }
      var t0 = performance.now(), ms = 260;
      var step = function () {
        var t = Math.min(1, (performance.now() - t0) / ms), e = 1 - Math.pow(1 - t, 3);
        setText(ui.big, t < 1 ? fmt(from + (km - from) * e) : text);
        if (t < 1) bigAnim = requestAnimationFrame(step);
      };
      bigAnim = requestAnimationFrame(step);
    }

    var planBuilt = "";
    function renderPlan() {
      var pl = state.plan;
      ui.plan.hidden = false;
      if (!pl || pl.status !== "done") {
        ui.timeline.innerHTML = ""; planBuilt = "";
        ui.planAll.hidden = true;
        setText(ui.planTitle, "Flight plan");
        setText(ui.planStatus, !pl || pl.status === "pending" ? "Finding radio beacons along the way…" : "");
        ui.planStatus.hidden = !(!pl || pl.status === "pending");
        ui.plan.hidden = !(!pl || pl.status === "pending");
        return;
      }
      ui.planStatus.hidden = true;
      var n = pl.points.length - 2;
      setText(ui.planTitle, "Flight plan | " + n + (n === 1 ? " radio beacon" : " radio beacons"));
      var LIMIT = 9, limit = state.planAll ? pl.legs.length : Math.min(LIMIT, pl.legs.length);
      var key = state.shownId + "|" + state.units + "|" + limit;
      ui.planAll.hidden = limit >= pl.legs.length;
      setText(ui.planAll, "Show all " + pl.legs.length + " legs");
      if (planBuilt !== key) {
        planBuilt = key;
        var frag = document.createDocumentFragment(), group = null, last = undefined;
        var addRow = function (pt, legIndex, kind) {
          var country = pt.country || "Over the sea";
          if (country !== last) {
            last = country;
            var g = document.createElement("li"); g.className = "gc-tl-group";
            var h = document.createElement("h4"); h.className = "gc-tl-country"; h.textContent = country; g.appendChild(h);
            group = document.createElement("ol"); group.className = "gc-tl-legs"; g.appendChild(group);
            frag.appendChild(g);
          }
          var li = document.createElement("li");
          li.className = "gc-tl-row gc-tl-" + kind + (legIndex >= 0 && pl.legs[legIndex].long ? " is-long" : "");
          if (legIndex >= 0) { li.dataset.leg = legIndex; li.tabIndex = 0; li.setAttribute("aria-pressed", "false"); li.setAttribute("role", "button"); }
          var icon = document.createElement("span"); icon.className = "gc-tl-icon"; icon.setAttribute("aria-hidden", "true");
          icon.innerHTML = kind === "end" ? '<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="6" fill="currentColor"/></svg>'
            : /^VOR/.test(pt.type) ? '<svg viewBox="0 0 14 14" width="14" height="14"><path d="M7 1.5L12.6 11.5H1.4Z" fill="var(--gc-card)" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>'
            : '<svg viewBox="0 0 14 14" width="14" height="14"><circle cx="7" cy="7" r="4.6" fill="var(--gc-card)" stroke="currentColor" stroke-width="1.6"/></svg>';
          li.appendChild(icon);
          var txt = document.createElement("span"); txt.className = "gc-tl-text";
          var id = document.createElement("b"); id.textContent = kind === "end" ? (legIndex < 0 ? endName("a") : endName("b")) : pt.ident;
          var sub = document.createElement("small");
          sub.textContent = kind === "end" ? (legIndex < 0 ? shortName(state.a) + ", departure" : shortName(state.b) + ", arrival") : pt.name + " " + pt.type;
          txt.appendChild(id); txt.appendChild(sub); li.appendChild(txt);
          var km = document.createElement("span"); km.className = "gc-tl-km";
          if (legIndex >= 0) {
            var sr = document.createElement("span"); sr.className = "sr-only"; sr.textContent = "leg "; km.appendChild(sr);
            km.appendChild(document.createTextNode(fmt(pl.legs[legIndex].km)));
            if (pl.legs[legIndex].long) { var lg = document.createElement("small"); lg.textContent = "no beacon near"; km.appendChild(lg); }
          }
          li.appendChild(km);
          group.appendChild(li);
        };
        addRow(pl.points[0], -1, "end");
        for (var i = 0; i < limit; i++) addRow(pl.points[i + 1], i, i + 1 === pl.points.length - 1 ? "end" : "beacon");
        ui.timeline.innerHTML = "";
        ui.timeline.appendChild(frag);
      }
      markLeg();
    }
    function markLeg() {
      var leg = state.pinLeg >= 0 ? state.pinLeg : state.hoverLeg;
      ui.timeline.querySelectorAll(".gc-tl-row[data-leg]").forEach(function (li) { li.classList.toggle("is-on", +li.dataset.leg === leg); li.classList.toggle("is-pinned", +li.dataset.leg === state.pinLeg); li.setAttribute("aria-pressed", String(+li.dataset.leg === state.pinLeg)); });
    }
    ui.timeline.addEventListener("pointerover", function (e) {
      var li = e.target.closest && e.target.closest(".gc-tl-row[data-leg]");
      var leg = li ? +li.dataset.leg : -1;
      if (leg === state.hoverLeg || e.pointerType !== "mouse") return;
      state.hoverLeg = leg; markLeg(); scheduleRender("full");
    });
    ui.timeline.addEventListener("pointerleave", function () { if (state.hoverLeg < 0) return; state.hoverLeg = -1; markLeg(); scheduleRender("full"); });
    ui.timeline.addEventListener("click", function (e) {
      var li = e.target.closest && e.target.closest(".gc-tl-row[data-leg]");
      if (!li) return;
      var leg = +li.dataset.leg;
      state.pinLeg = state.pinLeg === leg ? -1 : leg;
      markLeg(); scheduleRender("full");
      if (state.pinLeg >= 0 && state.plan && state.plan.points) {
        var p = state.plan.points[leg + 1];
        if (!visible([p.lon, p.lat])) flyTo(p.lon, p.lat);
      }
    });
    ui.timeline.addEventListener("keydown", function (e) {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".gc-tl-row[data-leg]")) { e.preventDefault(); e.target.click(); }
    });
    ui.timeline.addEventListener("focusin", function (e) {
      var li = e.target.closest && e.target.closest(".gc-tl-row[data-leg]");
      if (!li || +li.dataset.leg === state.hoverLeg) return;
      state.hoverLeg = +li.dataset.leg; markLeg(); scheduleRender("full");
    });
    ui.planAll.addEventListener("click", function () {
      state.planAll = true;
      var n = ui.timeline.querySelectorAll(".gc-tl-row[data-leg]").length;
      renderPlan();
      var rows = ui.timeline.querySelectorAll(".gc-tl-row[data-leg]");
      if (rows[n]) rows[n].focus();
    });

    function renderCrosses(tab) {
      var res = state.result;
      var ids = tab === "plan" ? (state.plan && state.plan.status === "done" ? state.plan.crosses : null) : tab === "avoid" ? res.routeCrosses : res.directCrosses;
      if (!ids) { ui.crosses.hidden = true; return; }
      ui.crosses.hidden = false;
      var ends = (res.startIn || []).concat(res.endIn || []).map(String);
      var list = ids.map(String).filter(function (id) { return featureById.has(id); });
      var key = list.join(",") + "|" + Array.from(state.avoid.keys()).join(",") + "|" + ends.join(",");
      if (ui.crossList.dataset.key === key) return;
      ui.crossList.dataset.key = key;
      setText(ui.crossTitle, list.length ? "Crosses " + list.length + (list.length === 1 ? " country" : " countries") : "Crosses nothing: open sea all the way");
      ui.crossList.innerHTML = "";
      list.forEach(function (id) {
        var f = featureById.get(id), li = document.createElement("li");
        if (!state.avoid.has(id) && id !== ANTARCTICA && ends.indexOf(id) < 0) {
          var b = document.createElement("button"); b.type = "button"; b.className = "gc-chip gc-chip-add";
          b.dataset.id = id; b.textContent = f.properties.name; b.title = "Avoid " + f.properties.name; b.setAttribute("aria-label", "Avoid " + f.properties.name);
          li.appendChild(b);
        } else {
          li.className = "gc-chip" + (state.avoid.has(id) ? " is-avoided" : "");
          li.textContent = f.properties.name;
        }
        ui.crossList.appendChild(li);
      });
    }
    ui.crossList.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("button[data-id]");
      if (!b) return;
      var id = b.dataset.id, f = featureById.get(id);
      state.avoid.set(id, f.properties.name);
      state.tab = null;
      avoidChanged();
      ui.crossTitle.focus();
    });

    function whyLine(res) {
      var round = names(res.roundIds || []), over = res.bendsOver || [];
      var what = round.length ? joinNames(round) : avoidLabel();
      var text = "Bends " + (res.bends === 1 ? "once" : res.bends + " times") + " round " + (state.bufferKm > 0 ? "the " + fmtBuffer(state.bufferKm) + " buffer of " : "") + what;
      if (over.length) text += ", over " + (over.length > 4 ? over.slice(0, 4).join(", ") + ", and " + (over.length - 4) + " more" : joinNames(over));
      return text;
    }
    function setTab(tab, focus) {
      var prev = currentTab();
      state.tab = tab;
      state.hoverLeg = -1; state.pinLeg = -1;
      if (tab === "plan") app.setFitPending("plan");
      renderPanel();
      writeUrl();
      app.tabChanged(prev);
      scheduleRender("full");
      if (tab === "plan" && state.plan && state.plan.status === "done") { app.setFitPending(false); fitRoute(false); }
      if (focus) $("tab-" + currentTab()).focus();
    }
    ui.tabs.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[role=tab]");
      if (b) setTab(b.dataset.tab, false);
    });
    ui.tabs.addEventListener("keydown", function (e) {
      var list = Array.prototype.filter.call(ui.tabs.querySelectorAll("[role=tab]"), function (b) { return !b.hidden; });
      var i = list.indexOf(document.activeElement);
      if (i < 0) return;
      var j = e.key === "ArrowRight" ? (i + 1) % list.length : e.key === "ArrowLeft" ? (i - 1 + list.length) % list.length : e.key === "Home" ? 0 : e.key === "End" ? list.length - 1 : -1;
      if (j < 0) return;
      e.preventDefault();
      setTab(list[j].dataset.tab, true);
    });

    function announce() {
      var res = state.result;
      if (!res) return;
      var t = currentTab(), text;
      if (res.status === "done" && t === "plan" && tabKm("plan") == null) {
        text = state.plan && state.plan.status === "pending" ? "Flight plan: finding radio beacons along the way." : (ui.warn.querySelector(".gc-warn-text") || {}).textContent || "";
      } else if (res.status === "done") {
        var km = tabKm(t);
        text = (t === "avoid" ? "Avoiding " + avoidLabel() + ": " : t === "plan" ? "Flight plan: " : "Direct: ") + fmt(km) + ", " + hoursText(timeFor(t)).spoken + (state.wind ? " with typical winds" : "") + ".";
        if (t === "avoid") text += " " + fmt(res.lengthKm - res.directKm) + " longer than direct.";
      } else text = (ui.warn.querySelector(".gc-warn-text") || {}).textContent || "";
      ui.status.textContent = "";
      setTimeout(function () { ui.status.textContent = text; }, 30);
    }

    var optOpener = null;
    function setOptions(open, opener, byKey) {
      ui.options.hidden = !open;
      document.querySelectorAll(".gc-opt-chip").forEach(function (c) { c.setAttribute("aria-expanded", String(open && c === opener)); c.classList.toggle("is-open", open && c === opener); });
      if (open) {
        optOpener = opener || null;
        if (app.W() <= 640) setSheet(true);
        var k = opener && opener.dataset.opt;
        var target = k === "buffer" ? ui.options.querySelector("input[name=buffer]:checked") : k === "units" ? ui.options.querySelector("input[name=units]:checked") : $("in-avoid");
        if (target && !(k === "avoid" && !canHover)) target.focus();
      } else if (optOpener) { if (byKey) optOpener.focus(); else if (ui.options.contains(document.activeElement)) document.activeElement.blur(); optOpener = null; }
      layoutSoon();
    }
    document.querySelectorAll(".gc-opt-chip").forEach(function (c) {
      c.addEventListener("click", function () { setOptions(ui.options.hidden || !c.classList.contains("is-open"), c); });
    });
    $("options-done").addEventListener("click", function (e) { setOptions(false, null, e.detail === 0); });
    ui.options.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault(); setOptions(false, null, true);
    });
    document.querySelectorAll(".gc-closure").forEach(function (b) {
      b.addEventListener("click", function () {
        var ids = b.dataset.ids.split(",").filter(function (id) { return featureById.has(id); });
        var all = ids.every(function (id) { return state.avoid.has(id); });
        ids.forEach(function (id) { if (all) state.avoid.delete(id); else state.avoid.set(id, featureById.get(id).properties.name); });
        state.tab = null;
        avoidChanged();
      });
    });
    document.querySelectorAll("input[name=wind]").forEach(function (r) {
      r.addEventListener("change", function () { state.wind = r.value === "1"; renderPanel(); writeUrl(); });
    });
    function renderOptionChips() {
      document.querySelectorAll("input[name=wind]").forEach(function (r) { r.checked = (r.value === "1") === !!state.wind; });
      var mo = MONTHS[new Date().getMonth()];
      setText($("wind-month"), "Typical for " + mo);
      document.querySelectorAll(".gc-closure").forEach(function (b) {
        var ids = b.dataset.ids.split(",");
        b.setAttribute("aria-pressed", String(ids.every(function (id) { return state.avoid.has(id); })));
      });
      setText($("chip-avoid"), avoiding() ? "Avoiding " + avoidLabel() : "Avoid a country");
      $("chip-buffer").hidden = !avoiding();
      setText($("chip-buffer"), state.bufferKm > 0 ? fmtBuffer(state.bufferKm) + " buffer" : "No buffer");
      setText($("chip-units"), state.units);
      $("chip-avoid").classList.toggle("is-set", avoiding());
      var mi = String(bufferMi(state.bufferKm));
      ui.options.querySelectorAll("input[name=buffer]").forEach(function (r) { r.checked = r.value === mi; });
      ui.options.querySelectorAll("input[name=units]").forEach(function (r) { r.checked = r.value === state.units; });
      $("buffer-row").hidden = !avoiding();
    }
    ui.options.querySelectorAll("input[name=units]").forEach(function (r) {
      r.addEventListener("change", function () {
        state.units = r.value;
        try { localStorage.setItem("gc-units", state.units); } catch (e) {}
        planBuilt = "";
        renderPanel();
        scheduleRender("full");
      });
    });
    ui.options.querySelectorAll("input[name=buffer]").forEach(function (r) {
      r.addEventListener("change", function () { setBuffer(+r.value); });
    });

    $("share").addEventListener("click", function () {
      var url = location.href, label = $("share-label");
      var done = function (text) { label.textContent = text; ui.status.textContent = text; setTimeout(function () { label.textContent = "Share this route"; }, 2000); };
      if (navigator.share && !canHover) { navigator.share({ title: "GREATERCIRCLE: " + endName("a") + " to " + endName("b"), url: url }).catch(function () {}); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { done("Link copied"); }, function () { done("Copy the address bar to share"); });
      else done("Copy the address bar to share");
    });

    var shareFiles = !!(navigator.canShare && !canHover);
    setText($("share-image"), shareFiles ? "Share as an image" : "Save as an image");
    $("share-image").addEventListener("click", function () {
      var res = state.result, tab = currentTab();
      if (!res || res.status !== "done") return;
      var km = tabKm(tab) || res.directKm;
      var line = (tab === "avoid" ? "Avoiding " + avoidLabel() : tab === "plan" ? "Flight plan, " + (state.plan.points.length - 2) + " radio beacons" : "The great circle") + " | " + hoursText(timeFor(tab) || km / 850 + 0.5).text;
      var sub = tab === "direct" ? "the shortest way there is" : tab === "avoid" ? "+" + fmt(res.lengthKm - res.directKm) + " over the direct way" : "+" + fmt(state.plan.overKm) + " over the shortest way";
      var names = shortName(state.a) + " to " + shortName(state.b);
      var name = "greatercircle-" + (endName("a") + "-" + endName("b")).toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".png";
      app.makeCard({ from: endName("a"), to: endName("b"), names: names.length > 44 ? names.slice(0, 43) + "…" : names, km: fmt(km), line: line, sub: sub }).then(function (blob) {
        if (!blob) return;
        var file = typeof File === "function" ? new File([blob], name, { type: "image/png" }) : null;
        if (shareFiles && file && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: "GREATERCIRCLE", text: location.href }).catch(function () {});
          return;
        }
        var url = URL.createObjectURL(blob), link = document.createElement("a");
        link.href = url; link.download = name;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        ui.status.textContent = "Saved " + name;
      });
    });

    var layoutTimer = 0, lastPanelH = 0;
    function layoutSoon() {
      if (app.W() > 640) return;
      cancelAnimationFrame(layoutTimer);
      layoutTimer = requestAnimationFrame(function () {
        var h = Math.round(document.getElementById("hero-top").getBoundingClientRect().bottom - panel.getBoundingClientRect().top);
        if (h !== lastPanelH) { lastPanelH = h; layout(); scheduleRender("full"); }
      });
    }

    var MI_KM = 1.609344, BUFFER_MI = [0, 1, 5, 10, 20, 50, 100], BUFFER_DEFAULT_MI = 50;
    function bufferMi(km) {
      var best = BUFFER_MI[0];
      BUFFER_MI.forEach(function (mi) { if (Math.abs(mi * MI_KM - km) < Math.abs(best * MI_KM - km)) best = mi; });
      return best;
    }
    function fmtBuffer(km) { return bufferMi(km) + " mi"; }
    function setBuffer(mi) {
      state.bufferKm = mi * MI_KM;
      renderOptionChips();
      requestRoute();
      writeUrl();
      scheduleRender("full");
    }

    return {
      renderPanel: renderPanel, renderBusy: renderBusy, announce: announce, currentTab: currentTab, detourOf: detourOf,
      renderOptionChips: renderOptionChips, bufferMi: bufferMi, MI_KM: MI_KM, BUFFER_DEFAULT_MI: BUFFER_DEFAULT_MI,
      endName: endName, hours: hours, tabKm: tabKm, avoidLabel: avoidLabel, codeOf: codeOf, shortName: shortName, setTab: setTab
    };
  };
})(window);

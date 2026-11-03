/* Today's station x direction forecast (model tubecast-1102, trained 28 Oct - 1 Nov 2026).
   The API supplies what is delayed now; this fills onset_p30 / risk / onset_min for every
   station x direction from the learned weights: usual rate for this unit and hour band,
   delayed units up the line on the same line and direction (0-10 / 10-20 / 20-30 min), peak.
   Two routes to a forecast: (1) a delay up the same line and direction that lifts the chance at
   least 20% above the unit's usual rate; (2) with nothing up the line, a time-of-day pattern only
   when this hour is well above the unit's own all-day usual. Stations whose gaps are irregular all
   day from the timetable (e.g. Metropolitan branches) are therefore not flagged just for being themselves.
   It runs only on API data (not the fixture or demo scenario). Replaced when the server serves forecasts. */
window.ForecastModel = (function () {
  var M = window.TUBECAST_MODEL;
  function dirKey(d) { d = String(d || '').toLowerCase(); return /north/.test(d) ? 'north' : /south/.test(d) ? 'south' : /east/.test(d) ? 'east' : /west/.test(d) ? 'west' : d; }
  function london(t) {
    var f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: 'numeric', hourCycle: 'h23', weekday: 'short' }).formatToParts(t);
    var h = +f.find(function (p) { return p.type === 'hour'; }).value, wd = f.find(function (p) { return p.type === 'weekday'; }).value;
    return { band: Math.floor(h / 3), peak: !/Sat|Sun/.test(wd) && ((h >= 7 && h < 10) || (h >= 16 && h < 19)) ? 1 : 0 };
  }
  function title(naptan) {
    var n = (window.TUBECAST_NAPTAN_NAMES || {})[naptan] || naptan;
    return String(n).replace(/\b([a-z])/g, function (m) { return m.toUpperCase(); }).replace(/\bAnd\b/g, '&').replace(/\bSt\b/g, 'St');
  }
  function sig(z) { return 1 / (1 + Math.exp(-z)); }
  function score(u, delayed, clock) {
    var info = M.units[u], c = M.coef, b = info.b[clock.band], up = [0, 0, 0], near = null;
    var nearUnit = null;
    info.up.forEach(function (x) { var v = M.unit_list[x[0]]; if (!delayed[v]) return; up[Math.min(2, Math.floor(x[1] / 10))]++; if (near == null || x[1] < near) { near = x[1]; nearUnit = v; } });
    var p = sig(M.intercept + c[0] * Math.log(b / (1 - b)) + c[1] * up[0] + c[2] * up[1] + c[3] * up[2] + c[4] * clock.peak);
    return { p: p, up: up[0] + up[1] + up[2], near: near, nearUnit: nearUnit, base: b };
  }
  function augment(api) {
    if (!M || !api || !api.lines || api.mode === 'scenario') return api;
    // once the server serves its own forecasts, show those as they are
    if (api.lines.some(function (L) { return (L.rows || []).some(function (r) { return r.onset_p30 != null; }); })) return api;
    api = JSON.parse(JSON.stringify(api));
    var clock = london(new Date(api.as_of || Date.now())), delayed = {}, byLine = {};
    api.lines.forEach(function (L) { byLine[L.id] = L; (L.rows || []).forEach(function (r) { if (r.now && r.now.level) delayed[L.id + '|' + String(r.naptan || '').toUpperCase() + '|' + dirKey(r.dir)] = 1; }); });
    M.unit_list.forEach(function (u) {
      if (delayed[u]) return;
      var parts = u.split('|'), L = byLine[parts[0]]; if (!L) return;
      var s = score(u, delayed, clock), lift = s.p / s.base, hourly = M.units[u].b.slice(1).sort(function (a, b) { return a - b; }), usualAllDay = hourly[Math.floor(hourly.length / 2)];
      // with a delay up the line: a clear rise above this unit's own usual rate
      // without one: only a time-specific pattern (this hour well above the unit's all-day usual), not timetable irregularity
      var risk = s.up ? (lift >= 1.2 ? (s.p >= M.cut_top5 ? 'high' : 'elevated') : null)
                      : (s.p >= M.cut_top5 && s.base >= 1.5 * usualAllDay ? 'elevated' : null);
      if (!risk) return;
      var row = (L.rows || []).find(function (r) { return String(r.naptan || '').toUpperCase() === parts[1] && dirKey(r.dir) === parts[2]; });
      if (!row) { row = { station: null, naptan: parts[1], dir: M.dir_label[parts[2]] || parts[2], now: null }; (L.rows = L.rows || []).push(row); }
      row.onset_p30 = Math.round(s.p * 1000) / 1000; row.risk = risk;
      row.onset_min = s.near == null ? 30 : s.near <= 10 ? 10 : s.near <= 20 ? 20 : 30;
      row.top_reason = s.up ? 'delays_up_line' : 'network_pattern'; row.model = M.model_id;
      row.reason_text = s.up ? 'Delays up the line' + (s.nearUnit ? ' at ' + title(s.nearUnit.split('|')[1]) : '') + ' · about ' + Math.max(1, Math.round(s.near)) + ' min away' : 'Often delayed at this hour';
    });
    api.lines.forEach(function (L) {
      var rows = L.rows || [], now = rows.filter(function (r) { return r.now && r.now.level; }).length, pb = L.line_forecast && L.line_forecast.p_base_30;
      L.cols = [0, 10, 20, 30, 60].map(function (h) {
        var n = now + (h ? rows.filter(function (r) { return !(r.now && r.now.level) && r.risk && r.onset_min <= Math.min(h, 30); }).length : 0);
        var old = (L.cols || []).find(function (c) { return c.h === h; });
        if (h > 30) return { h: h, n: null, mark: 'pg', kind: 'model' };
        return { h: h, n: n, mark: h === 0 && old && old.mark ? old.mark : (pb != null && pb >= .1833 ? 'ps' : n ? 'pm' : 'pg'), kind: h ? 'model' : 'observed' };
      });
    });
    api.model_id = M.model_id;
    return api;
  }
  return { augment: augment, model: M };
})();

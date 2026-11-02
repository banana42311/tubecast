/* Today's station x direction forecast (model tubecast-1102, trained 28 Oct - 1 Nov 2026).
   The API supplies what is delayed now; this fills onset_p30 / risk / onset_min for every
   station x direction from the learned weights: usual rate for this unit and hour band,
   delayed units up the line on the same line and direction (0-10 / 10-20 / 20-30 min), peak.
   It runs only on API data (not the fixture or demo scenario). Replaced when the server serves forecasts. */
window.ForecastModel = (function () {
  var M = window.TUBECAST_MODEL;
  function dirKey(d) { d = String(d || '').toLowerCase(); return /north/.test(d) ? 'north' : /south/.test(d) ? 'south' : /east/.test(d) ? 'east' : /west/.test(d) ? 'west' : d; }
  function london(t) {
    var f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: 'numeric', hourCycle: 'h23', weekday: 'short' }).formatToParts(t);
    var h = +f.find(function (p) { return p.type === 'hour'; }).value, wd = f.find(function (p) { return p.type === 'weekday'; }).value;
    return { band: Math.floor(h / 3), peak: !/Sat|Sun/.test(wd) && ((h >= 7 && h < 10) || (h >= 16 && h < 19)) ? 1 : 0 };
  }
  function sig(z) { return 1 / (1 + Math.exp(-z)); }
  function score(u, delayed, clock) {
    var info = M.units[u], c = M.coef, b = info.b[clock.band], up = [0, 0, 0], near = null;
    info.up.forEach(function (x) { var v = M.unit_list[x[0]]; if (!delayed[v]) return; up[Math.min(2, Math.floor(x[1] / 10))]++; if (near == null || x[1] < near) near = x[1]; });
    var p = sig(M.intercept + c[0] * Math.log(b / (1 - b)) + c[1] * up[0] + c[2] * up[1] + c[3] * up[2] + c[4] * clock.peak);
    return { p: p, up: up[0] + up[1] + up[2], near: near, base: b };
  }
  function augment(api) {
    if (!M || !api || !api.lines || api.mode === 'scenario') return api;
    api = JSON.parse(JSON.stringify(api));
    var clock = london(new Date(api.as_of || Date.now())), delayed = {}, byLine = {};
    api.lines.forEach(function (L) { byLine[L.id] = L; (L.rows || []).forEach(function (r) { if (r.now && r.now.level) delayed[L.id + '|' + String(r.naptan || '').toUpperCase() + '|' + dirKey(r.dir)] = 1; }); });
    M.unit_list.forEach(function (u) {
      if (delayed[u]) return;
      var parts = u.split('|'), L = byLine[parts[0]]; if (!L) return;
      var s = score(u, delayed, clock), risk = s.p >= M.cut_top5 ? 'high' : (s.up && s.p >= Math.max(2 * s.base, M.cut_top5 * .6) ? 'elevated' : null);
      if (!risk) return;
      var row = (L.rows || []).find(function (r) { return String(r.naptan || '').toUpperCase() === parts[1] && dirKey(r.dir) === parts[2]; });
      if (!row) { row = { station: null, naptan: parts[1], dir: M.dir_label[parts[2]] || parts[2], now: null }; (L.rows = L.rows || []).push(row); }
      row.onset_p30 = Math.round(s.p * 1000) / 1000; row.risk = risk;
      row.onset_min = s.near == null ? 30 : s.near <= 10 ? 10 : s.near <= 20 ? 20 : 30;
      row.top_reason = s.up ? 'delays_up_line' : 'network_pattern'; row.model = M.model_id;
    });
    api.lines.forEach(function (L) {
      var rows = L.rows || [], now = rows.filter(function (r) { return r.now && r.now.level; }).length, pb = L.line_forecast && L.line_forecast.p_base_30;
      L.cols = [0, 10, 20, 30, 60].map(function (h) {
        var n = now + (h ? rows.filter(function (r) { return !(r.now && r.now.level) && r.risk && r.onset_min <= Math.min(h, 30); }).length : 0);
        var old = (L.cols || []).find(function (c) { return c.h === h; });
        return { h: h, n: n, mark: h === 0 && old && old.mark ? old.mark : (pb != null && pb >= .1833 ? 'ps' : n ? 'pm' : 'pg'), kind: h ? 'model' : 'observed' };
      });
    });
    api.model_id = M.model_id;
    return api;
  }
  return { augment: augment, model: M };
})();

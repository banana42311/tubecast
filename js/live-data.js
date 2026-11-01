/* Live adapter: /api/state -> the FlowData disruption shape used by every page.
   Loads before flow-data.js. Uses the last cached response synchronously, refreshes in the background.
   No API configured or no usable cache -> example mode (FlowData keeps its illustrative snapshot). */
(function () {
  var C = window.TUBECAST_CONFIG || {}, KEY = 'tubecast-state-v1', base = (C.apiBase || '').replace(/\/$/, '');
  function read() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function write(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function norm(s) { return String(s || '').toLowerCase().replace(/ underground station| station|\(.*?\)|['’.]/g, '').replace(/&/g, 'and').replace(/\bst\b/g, 'saint').replace(/\s+/g, ' ').trim(); }
  var CAT = {}; Object.keys(window.StationCatalog || {}).forEach(function (n) { CAT[norm(n)] = n; });
  function name(s) { return CAT[norm(s)] || null; }
  var DIR = { east: 'Eastbound', west: 'Westbound', north: 'Northbound', south: 'Southbound' };
  function dirLabel(d) { var k = String(d || '').toLowerCase().replace(/bound$/, ''); return DIR[k] || (d ? String(d) : 'Both directions'); }
  function pct(p) { return typeof p === 'number' ? Math.round(p * 100) + '%' : ''; }

  function transform(api) {
    var dis = [], onset = {}, lineInfo = {};
    (api.lines || []).forEach(function (L) {
      var t = L.tfl || {}, f = L.line_forecast || {};
      lineInfo[L.id] = { status: t.status || '', closed: !!(t.planned_closure || t.not_running), alert: f.alert || null, p30: f.p_base_30 };
      var groups = {};
      (L.rows || []).forEach(function (r) {
        var n = name(r.station); if (!n) return;
        var g = groups[r.dir] || (groups[r.dir] = { now: [], next: [], sevNow: 'minor', sevNext: 'minor', gap: 0, reason: '', lv: {} });
        if (r.now) {
          if (g.now.indexOf(n) < 0) g.now.push(n);
          if (r.now.level === 'severe') g.sevNow = 'severe';
          g.lv[n] = r.now.level === 'severe' || g.lv[n] === 'severe' ? 'severe' : 'minor';
          if (r.now.gap_min > g.gap) g.gap = r.now.gap_min;
          if (!g.reason && r.reason) g.reason = r.reason;
        } else if (r.onset_min != null && r.onset_min <= 30) {
          if (g.next.indexOf(n) < 0) g.next.push({ n: n, m: r.onset_min });
          if ((r.level_pred || r.level) === 'severe') g.sevNext = 'severe';
          if (!g.reason && r.reason) g.reason = r.reason;
        }
      });
      Object.keys(groups).forEach(function (dk) {
        var g = groups[dk]; if (!g.now.length && !g.next.length) return;
        g.next.sort(function (a, b) { return a.m - b.m; });
        var next = g.next.map(function (x) { return x.n; }).filter(function (n) { return g.now.indexOf(n) < 0; });
        (onset[L.id] = onset[L.id] || {}); g.next.forEach(function (x) { onset[L.id][x.n] = x.m; });
        var all = g.now.concat(next);
        dis.push({ id: L.id + '-' + norm(dk).replace(/ /g, '-'), line: L.id, sev: g.now.length ? g.sevNow : g.sevNext, nextSev: g.sevNext,
          from: all[0], to: all[all.length - 1], direction: dirLabel(dk),
          cause: t.reason ? String(t.reason).replace(/^[^:]+:\s*/, '').split('.')[0] : 'Longer gaps between trains',
          detail: g.reason || (next.length ? 'Gaps may spread to the next stations in this direction.' : 'No additional stations predicted.'),
          gap: g.gap ? Math.round(g.gap) + ' min gap' : '', prob: pct(f.p_base_30), now: g.now, next: next, branches: [], levels: g.lv });
      });
    });
    return { disruptions: dis, onset: onset, lines: lineInfo, asOf: api.as_of, stale: !!(api.sources && api.sources.stale) };
  }

  var cached = read(), live = null;
  if (base && cached && cached.data && (Date.now() - cached.at) / 1000 <= (C.maxAgeSec || 300)) {
    try { live = transform(cached.data); } catch (e) { live = null; }
  }
  window.LiveState = live ? { mode: live.stale ? 'stale' : 'live', disruptions: live.disruptions, onset: live.onset, lines: live.lines, asOf: live.asOf, fetchedAt: cached.at } : { mode: 'example' };

  if (live) {  // align line metadata with the live snapshot
    (window.LINES || []).forEach(function (l) {
      var li = live.lines[l.slug]; if (!li) return;
      var has = live.disruptions.some(function (d) { return d.line === l.slug; });
      l.status = li.closed ? 'closed' : (has ? 'delayed' : 'normal');
      var page = window.LINE_DATA && window.LINE_DATA[l.slug];
      if (page && !li.closed && page.kind !== 'none' && !has) {
        var cnt = Object.keys(window.StationCatalog || {}).filter(function (n) { return (StationCatalog[n].lines || []).indexOf(l.slug) > -1; }).length;
        window.LINE_DATA[l.slug] = { kind: 'none', count: page.count || cnt, pan: page.pan, markers: [], hero: { value: '0', sub: 'stations delayed now', chip: 'Good service' },
          fc: { title: 'No delays now', sub: 'Low chance of delays within 30 min', cols: [['Now', 0, 'ng'], ['10 min', 0, 'pg'], ['20 min', 0, 'pg'], ['30 min', 0, 'pg'], ['60 min', '—', 'pg', 1]] } };
      } else if (page && has && page.kind !== 'delayed') { page.kind = 'delayed'; page.markers = []; }
    });
  }

  window.LiveLabel = function () {
    var S = window.LiveState; if (S.mode === 'example') return 'Demo snapshot · illustrative values';
    var m = Math.max(0, Math.round((Date.now() - new Date(S.asOf || S.fetchedAt).getTime()) / 60000));
    return (S.mode === 'stale' ? 'Data delayed · ' : 'Live · ') + (m < 1 ? 'updated just now' : 'updated ' + m + ' min ago');
  };

  if (live) document.addEventListener('DOMContentLoaded', function () { var t = document.querySelector('.demo-tag'); if (t) t.textContent = live.stale ? 'DELAYED DATA' : 'LIVE'; });
  if (!base) return;
  function pull() {
    var ctl = 'AbortController' in window ? new AbortController() : null, to = setTimeout(function () { ctl && ctl.abort(); }, 8000);
    fetch(base + '/api/state', { cache: 'no-store', signal: ctl ? ctl.signal : undefined }).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (data) {
        clearTimeout(to); var prev = read(); write({ at: Date.now(), data: data });
        var first = !window.LiveState || window.LiveState.mode === 'example';
        if (first) { try { if (!sessionStorage.getItem('tc-live-boot')) { sessionStorage.setItem('tc-live-boot', '1'); location.reload(); return; } } catch (e) {} }
        if (prev && prev.data && prev.data.as_of !== data.as_of) document.documentElement.classList.add('live-has-update');
      }).catch(function () { clearTimeout(to); document.documentElement.classList.add('live-error'); });
  }
  pull(); setInterval(pull, (C.refreshSec || 60) * 1000);
})();

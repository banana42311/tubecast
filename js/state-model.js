/* Hermes /api/state contract. Pure helpers live here so every screen and the
   regression tests use the same station matching, freshness and count rules. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StateModel = api;
})(typeof window !== 'undefined' ? window : null, function () {
  var DIR = { east: 'Eastbound', west: 'Westbound', north: 'Northbound', south: 'Southbound', in: 'Inbound', out: 'Outbound' };

  // The API sends empty containers ([] or {affected_stops: []}) when nothing is closed.
  function present(v) {
    if (!v) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return ['affected_stops', 'affected_routes', 'stops', 'routes', 'sections'].some(function (k) { var x = v[k]; return Array.isArray(x) ? x.length > 0 : !!x; }) || !!v.description;
    return !!v;
  }

  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/ underground station| station/g, '')
      .replace(/\s*\([^)]*\)\s*/g, ' ')
      .replace(/['’.]/g, '')
      .replace(/&/g, 'and')
      .replace(/\bst\b/g, 'saint')
      .replace(/\s+/g, ' ').trim();
  }
  function direction(d) {
    var raw = String(d || ''), k = raw.toLowerCase().replace(/bound$/, '');
    return DIR[k] || raw || 'Both directions';
  }
  // TfL arrivals label some platforms only 'inbound' (towards central London) / 'outbound'.
  // Show them as East/Westbound from the station's side of Bank, like the rest of the line.
  function directionAt(raw, name, slug, cat) {
    var k = String(raw || '').toLowerCase();
    if ((k === 'inbound' || k === 'outbound') && slug !== 'circle' && cat && cat[name] && cat.Bank) {
      return ((cat[name].x < cat.Bank.x) === (k === 'outbound')) ? 'Westbound' : 'Eastbound';
    }
    return direction(raw);
  }
  function percent(p) { return Number.isFinite(p) ? Math.round(p * 100) + '%' : ''; }
  function severityRank(s) { return s === 'severe' ? 2 : s === 'minor' ? 1 : 0; }
  function worst(a, b) { return severityRank(a) >= severityRank(b) ? a : b; }

  function matcher(stationCatalog, network) {
    var names = {}, naptans = {};
    Object.keys(stationCatalog || {}).forEach(function (name) { names[norm(name)] = name; });
    ((network && network.stations) || []).forEach(function (s) {
      var canonical = names[norm(s.name)] || s.name;
      if (!names[norm(s.name)]) names[norm(s.name)] = canonical;
      (s.naptanIds || []).forEach(function (id) { naptans[String(id).toUpperCase()] = canonical; });
    });
    return function (row) {
      var id = String((row && row.naptan) || '').toUpperCase();
      var alias = typeof window !== 'undefined' && window.TUBECAST_NAPTAN_NAMES && window.TUBECAST_NAPTAN_NAMES[id];
      return (id && naptans[id]) || names[norm(row && row.station)] || (alias && names[norm(alias)]) || null;
    };
  }

  function transform(api, stationCatalog, network) {
    api = api || {};
    var match = matcher(stationCatalog, network), unmatched = [], disruptions = [], onset = {}, lines = {}, stationState = {}, activeRows = [];
    (api.lines || []).forEach(function (line) {
      var slug = line.id, tfl = line.tfl || {}, forecast = line.line_forecast || {}, groups = {};
      var info = lines[slug] = {
        id: slug,
        status: tfl.status || '',
        reason: tfl.reason || '',
        cause: tfl.cause || '',
        closed: present(tfl.planned_closure) || /closure|suspend|not running|no service/i.test(tfl.status || ''),
        // false when the API cannot say how many stations are delayed (null, not 0)
        nowKnown: !!(line.now && Number.isFinite(line.now.units_delayed)),
        p30: Number.isFinite(forecast.p_base_30) ? forecast.p_base_30 : null,
        alert: forecast.alert || null,
        cols: (line.cols || []).map(function (c) { return { h: +c.h, n: c.n, mark: c.mark || '' }; })
      };
      (line.rows || []).forEach(function (row) {
        var name = match(row);
        if (!name) { unmatched.push({ line: slug, station: row.station || '', naptan: row.naptan || '', dir: row.dir || '' }); return; }
        var now = row.now && (row.now.level === 'minor' || row.now.level === 'severe') ? {
          level: row.now.level,
          gapMin: Number.isFinite(row.now.gap_min) ? row.now.gap_min : null,
          usualMin: Number.isFinite(row.now.usual_min) ? row.now.usual_min : null
        } : null;
        var predicted = (row.risk === 'high' || row.risk === 'elevated') && Number.isFinite(row.onset_p30) ? {
          risk: row.risk,
          probability: row.onset_p30,
          onsetMin: Number.isFinite(row.onset_min) ? row.onset_min : 30,
          reason: row.top_reason || '',
          reasonText: row.reason_text || '',
          model: row.model || api.serving_model_id || ''
        } : null;
        if (!now && !predicted) return;
        var dir = directionAt(row.dir, name, slug, stationCatalog), record = { line: slug, station: name, naptan: row.naptan || '', dir: dir, now: now, predicted: predicted };
        activeRows.push(record);
        stationState[name] = stationState[name] || {};
        stationState[name][slug] = stationState[name][slug] || {};
        stationState[name][slug][dir] = record;
        var key = dir, g = groups[key] || (groups[key] = { now: [], next: [], levels: {}, severity: null, predictedSeverity: null, gap: 0, reasons: [] });
        if (now) {
          if (g.now.indexOf(name) < 0) g.now.push(name);
          g.levels[name] = worst(g.levels[name], now.level);
          g.severity = worst(g.severity, now.level);
          g.gap = Math.max(g.gap, now.gapMin || 0);
        }
        if (predicted) {
          if (g.next.every(function (x) { return x.name !== name; })) g.next.push({ name: name, onset: predicted.onsetMin, probability: predicted.probability, risk: predicted.risk });
          g.predictedSeverity = worst(g.predictedSeverity, predicted.risk === 'high' ? 'severe' : 'minor');
          if (predicted.reason && g.reasons.indexOf(predicted.reason) < 0) g.reasons.push(predicted.reason);
        }
      });
      // TfL's list of stops in the affected section. It describes a section of the line, not measured
      // station delays, so it is kept apart and never counted as 'delayed now'.
      var tflLevel = info.closed ? null : /severe|suspend/i.test(tfl.status || '') ? 'severe' : /delay/i.test(tfl.status || '') ? 'minor' : null;
      var tflStops = tfl.affected_stops || (tfl.not_running && tfl.not_running.affected_stops) || [];
      if (tflLevel && Array.isArray(tflStops) && tflStops.length) {
        var only = /\b(east|west|north|south)bound only\b/i.exec(tfl.reason || '');
        info.tflAffected = [];
        tflStops.forEach(function (raw) {
          var nm = match({ station: String(raw).replace(/ (underground|rail|dlr)? ?station$/i, '').replace(/^london /i, '') });
          if (nm && info.tflAffected.indexOf(nm) < 0) info.tflAffected.push(nm);
        });
        info.tflDir = only ? DIR[only[1].toLowerCase()] : '';
      }
      Object.keys(groups).forEach(function (dir) {
        var g = groups[dir];
        g.next.sort(function (a, b) { return a.onset - b.onset; });
        onset[slug] = onset[slug] || {};
        g.next.forEach(function (x) { onset[slug][x.name] = x.onset; });
        var next = g.next.map(function (x) { return x.name; }).filter(function (n) { return g.now.indexOf(n) < 0; });
        var all = g.now.concat(next), sev = g.severity || g.predictedSeverity || 'minor';
        disruptions.push({
          id: slug + '-' + norm(dir).replace(/ /g, '-'), line: slug, sev: sev,
          nextSev: g.severity || g.predictedSeverity || sev, from: all[0], to: all[all.length - 1], direction: dir,
          cause: tfl.reason || tfl.cause || 'Longer gaps between trains',
          detail: g.reasons.length ? 'Prediction signal: ' + g.reasons.join(', ') : (next.length ? 'Delay risk is moving through the stations ahead.' : 'No additional stations predicted.'),
          gap: g.gap ? Math.round(g.gap) + ' min gap' : '', prob: percent(info.p30),
          now: g.now, next: next,
          branches: next.length ? [{ from: g.now[g.now.length - 1] || all[0], to: next[next.length - 1], direction: dir }] : [],
          levels: g.levels
        });
      });
    });
    return {
      disruptions: disruptions, onset: onset, lines: lines, rows: activeRows, stationState: stationState,
      unmatched: unmatched, asOf: api.as_of || null, stale: !!(api.sources && api.sources.stale),
      coverage: api.coverage || null, modelId: api.model_id || null
    };
  }

  function isOld(asOf, now, maxAgeSec) {
    var time = Date.parse(asOf || '');
    return !Number.isFinite(time) || ((now == null ? Date.now() : now) - time) > (maxAgeSec == null ? 180 : maxAgeSec) * 1000;
  }
  function hhmm(value) {
    var d = new Date(value || 0);
    return Number.isFinite(d.getTime()) ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--';
  }
  function label(state) {
    if (!state || state.mode === 'example' || state.mode === 'scenario') return '';
    if (state.delayed || state.mode === 'stale') return 'Update delayed · as of ' + hhmm(state.asOf || state.fetchedAt);
    return '';
  }
  function chooseSnapshot(response, cached, options) {
    options = options || {};
    var now = options.now == null ? Date.now() : options.now, max = options.maxAgeSec == null ? 180 : options.maxAgeSec;
    var responseOld = response && (response.sources && response.sources.stale || isOld(response.as_of, now, max));
    if (response && !responseOld) return { data: response, delayed: false, source: 'response' };
    if (cached && cached.data) return { data: cached.data, delayed: !!(options.failed || responseOld || isOld(cached.data.as_of, now, max)), source: 'cache' };
    if (response) return { data: response, delayed: true, source: 'response' };
    return null;
  }

  return { norm: norm, direction: direction, matcher: matcher, transform: transform, isOld: isOld, label: label, chooseSnapshot: chooseSnapshot };
});

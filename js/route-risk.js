/* Scores TfL journey candidates with the same station×direction state shown on
   the map. It never invents routes; it only reorders Journey Planner results. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RouteRisk = api;
})(typeof window !== 'undefined' ? window : null, function () {
  var BASE = { minor: 5, severe: 15 };
  function rankSeverity(s) { return s === 'not-running' ? 3 : s === 'severe' ? 2 : s === 'minor' ? 1 : 0; }
  function worst(a, b) { return rankSeverity(a) >= rankSeverity(b) ? a : b; }
  function stationKey(value) {
    var key = String(value || '').toLowerCase()
      .replace(/ (underground|rail|dlr|elizabeth line) station$/g, '')
      .replace(/[’'.]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
    if (key === 'kingscrossstpancras') return 'kingscross';
    if (key === 'londonpaddington') return 'paddington';
    if (key === 'londonliverpoolstreet') return 'liverpoolstreet';
    if (key === 'stratfordlondon') return 'stratford';
    return key;
  }
  function stationName(state, stop) {
    var stationState = state && state.stationState || {}, name = stop && stop.name || '';
    if (stationState[name]) return name;
    var id = String(stop && stop.id || '').toUpperCase(), rows = state && state.rows || [];
    if (id) for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].naptan || '').toUpperCase() === id && stationState[rows[i].station]) return rows[i].station;
    }
    var wanted = stationKey(name), names = Object.keys(stationState);
    for (var j = 0; j < names.length; j++) if (stationKey(names[j]) === wanted) return names[j];
    return name;
  }
  function rowsFor(state, stop, line, direction) {
    var station = stationName(state, stop);
    var byDirection = state && state.stationState && state.stationState[station] && state.stationState[station][line];
    if (!byDirection) return [];
    if (direction) {
      var exact = byDirection[direction], both = byDirection['Both directions'], out = [];
      if (exact) out.push(exact); if (both && both !== exact) out.push(both);
      return out;
    }
    return byDirection['Both directions'] ? [byDirection['Both directions']] : [];
  }
  function stopMinute(option, leg, index, count, state) {
    var reference = Date.parse(state && (state.asOf || state.as_of) || '');
    if (!Number.isFinite(reference)) return null;
    var departure = Date.parse(leg.departure || option.departure || '');
    if (!Number.isFinite(departure)) return null;
    var duration = Number(leg.duration);
    if (!Number.isFinite(duration)) duration = 0;
    var fraction = count > 1 ? index / (count - 1) : 0;
    return (departure - reference) / 60000 + duration * fraction;
  }
  function score(option, state) {
    var seen = {}, groups = {}, current = 0, predicted = 0, extra = 0, level = null, hits = [];
    function group(line, dir) { var key=line+'|'+(dir||'any');return groups[key]||(groups[key]={current:0,predicted:0,closed:0}); }
    (option.r.legs || []).forEach(function (leg) {
      if (leg.walking) return;
      var info = state && state.lines && state.lines[leg.line];
      if (info && info.closed && !seen['closed:' + leg.line]) {
        seen['closed:' + leg.line] = true; group(leg.line,leg.direction).closed = 40; level = worst(level, 'not-running');
        hits.push({ station: leg.stops[0] && leg.stops[0].name, line: leg.line, kind: 'current', level: 'not-running', minutes: 40 });
      }
      (leg.stops || []).forEach(function (stop, stopIndex, stops) {
        rowsFor(state, stop, leg.line, leg.direction).forEach(function (row) {
          var key = leg.line + '|' + String(stop.id || stationKey(stop.name)) + '|' + row.dir;
          if (row.now && !seen['now:' + key]) {
            seen['now:' + key] = true;
            var observed = row.now.gapMin != null && row.now.usualMin != null ? Math.max(0,row.now.gapMin-row.now.usualMin) : 0;
            var nowMin = observed || BASE[row.now.level] || 0; current++; group(leg.line,row.dir).current=Math.max(group(leg.line,row.dir).current,nowMin); level = worst(level, row.now.level);
            hits.push({ station: stop.name, line: leg.line, direction: row.dir, kind: 'current', level: row.now.level, minutes: nowMin });
          }
          if (row.predicted) {
            var atMinute = stopMinute(option, leg, stopIndex, stops.length, state);
            if (atMinute != null && atMinute < row.predicted.onsetMin) return;
            if (seen['predicted:' + key]) return; seen['predicted:' + key] = true;
            var predictedLevel = row.predicted.risk === 'high' ? 'severe' : 'minor';
            var forecastMin = (BASE[predictedLevel] || 0) * row.predicted.probability;
            if (row.predicted.risk === 'high') predicted++;
            group(leg.line,row.dir).predicted=Math.max(group(leg.line,row.dir).predicted,forecastMin); level = worst(level, predictedLevel);
            hits.push({ station: stop.name, line: leg.line, direction: row.dir, kind: 'predicted', level: predictedLevel, probability: row.predicted.probability, minutes: forecastMin });
          }
        });
      });
    });
    Object.keys(groups).forEach(function(key){var g=groups[key];extra+=g.closed||g.current+(g.current?g.predicted*.35:g.predicted);});
    extra = Math.round(extra);
    return { current: current, predicted: predicted, worst: level, extra: extra, hits: hits };
  }
  function explain(risk) {
    if (!risk.hits.length) return 'No current or predicted delays on this route';
    var first = risk.hits[0], where = first.station ? first.station + ' direction' : first.line;
    if (first.kind === 'predicted') return where + ' has predicted delay risk · about +' + risk.extra + ' min';
    return where + ' has a current delay · about +' + risk.extra + ' min';
  }
  function adjusted(option) {
    var t = Date.parse(option.arrival || '');
    return (Number.isFinite(t) ? t : option.min * 60000) + ((option.risk && option.risk.extra) || 0) * 60000;
  }
  function signature(option) {
    return (option.r.legs || []).filter(function (leg) { return !leg.walking; }).map(function (leg) {
      return leg.line + ':' + (leg.stops || []).map(function (stop) { return String(stop.id || stationKey(stop.name)); }).join('>');
    }).join('|');
  }
  function rank(options, state) {
    var assessed = (options || []).map(function (option, index) {
      var copy = Object.assign({}, option), risk = score(option, state || {});
      copy.risk = risk; copy.extra = risk.extra; copy.providerRank = index; copy.routeId = option.routeId || signature(option); copy.explanation = explain(risk); return copy;
    });
    assessed.sort(function (a, b) { return adjusted(a) - adjusted(b) || a.providerRank - b.providerRank; });
    assessed.forEach(function (option, index) {
      var sameEarlier = assessed.some(function (candidate) { return candidate.providerRank < option.providerRank && signature(candidate) === signature(option); });
      option.tag = index === 0 ? 'Recommended now' : (option.providerRank === 0 ? 'Usual route' : (sameEarlier ? 'Later departure' : 'Alternative route'));
    });
    return assessed;
  }
  return { score: score, rank: rank, explain: explain, signature: signature };
});

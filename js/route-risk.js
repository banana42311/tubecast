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
  function rowsFor(state, station, line, direction) {
    var byDirection = state && state.stationState && state.stationState[station] && state.stationState[station][line];
    if (!byDirection) return [];
    if (direction && byDirection[direction]) return [byDirection[direction]];
    return Object.keys(byDirection).map(function (key) { return byDirection[key]; });
  }
  function score(option, state) {
    var seen = {}, current = 0, predicted = 0, extra = 0, level = null, hits = [];
    (option.r.legs || []).forEach(function (leg) {
      if (leg.walking) return;
      var info = state && state.lines && state.lines[leg.line];
      if (info && info.closed && !seen['closed:' + leg.line]) {
        seen['closed:' + leg.line] = true; extra += 40; level = worst(level, 'not-running');
        hits.push({ station: leg.stops[0] && leg.stops[0].name, line: leg.line, kind: 'current', level: 'not-running', minutes: 40 });
      }
      (leg.stops || []).forEach(function (stop) {
        rowsFor(state, stop.name, leg.line, leg.direction).forEach(function (row) {
          var key = leg.line + '|' + stop.name + '|' + row.dir;
          if (seen[key]) return; seen[key] = true;
          if (row.now) {
            var nowMin = BASE[row.now.level] || 0; current++; extra += nowMin; level = worst(level, row.now.level);
            hits.push({ station: stop.name, line: leg.line, direction: row.dir, kind: 'current', level: row.now.level, minutes: nowMin });
          }
          if (row.predicted) {
            var predictedLevel = row.predicted.risk === 'high' ? 'severe' : 'minor';
            var forecastMin = (BASE[predictedLevel] || 0) * row.predicted.probability;
            if (row.predicted.risk === 'high') predicted++;
            extra += forecastMin; level = worst(level, predictedLevel);
            hits.push({ station: stop.name, line: leg.line, direction: row.dir, kind: 'predicted', level: predictedLevel, probability: row.predicted.probability, minutes: forecastMin });
          }
        });
      });
    });
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
      return leg.line + ':' + (leg.stops || []).map(function (stop) { return stop.name; }).join('>');
    }).join('|');
  }
  function rank(options, state) {
    var assessed = (options || []).map(function (option, index) {
      var copy = Object.assign({}, option), risk = score(option, state || {});
      copy.risk = risk; copy.extra = risk.extra; copy.providerRank = index; copy.explanation = explain(risk); return copy;
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

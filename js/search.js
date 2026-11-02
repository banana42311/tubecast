/* Station search shared by the overview, directory and map.
   Station identity comes from the TfL/StationCatalog data; a page's current
   line is only preferred when that line actually serves the result. */
(function () {
  var EXTRA = ['Stratford'];
  var SUGGEST = ['Mile End', 'Bethnal Green', 'Liverpool Street', 'Bank', 'Stratford', 'Waterloo'];
  var HOME = { 'Stratford':'central', 'Wood Lane':'hammersmith-city', 'Barons Court':'district', 'West Kensington':'district',
    "Earl's Court":'district', 'Gloucester Road':'district', 'South Kensington':'district', 'Victoria':'victoria',
    'Oxford Circus':'victoria', 'Euston':'victoria', "King's Cross":'piccadilly', 'Baker Street':'metropolitan' };
  var officialByName = null;

  function normalize(value) {
    var s = String(value || '').toLowerCase().replace(/&/g, ' and ');
    if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return s.replace(/[^a-z0-9]+/g, '');
  }
  function kebab(n) {
    return String(n || '').toLowerCase().replace(/&/g, 'and').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function names() {
    var a = window.StationDirectory ? window.StationDirectory.slice() : window.StationCatalog ? Object.keys(window.StationCatalog) : (window.TC_LABELS || []).map(function (l) { return l[0]; });
    EXTRA.forEach(function (e) { if (a.indexOf(e) < 0) a.push(e); });
    return a.sort(function (x, y) { return x.localeCompare(y); });
  }
  function officialStations() {
    if (officialByName) return officialByName;
    officialByName = {};
    ((window.TFL_NETWORK && window.TFL_NETWORK.stations) || []).forEach(function (station) {
      officialByName[normalize(station.name)] = station;
    });
    return officialByName;
  }
  function stationLines(name) {
    var found = [], seen = {};
    function add(lines) {
      (lines || []).forEach(function (line) {
        if (!seen[line] && window.LINE_BY_SLUG && window.LINE_BY_SLUG[line]) { seen[line] = true; found.push(line); }
      });
    }
    var catalog = window.StationCatalog && window.StationCatalog[name];
    if (!catalog && window.StationCatalog) {
      var key = normalize(name);
      Object.keys(window.StationCatalog).some(function (candidate) {
        if (normalize(candidate) !== key) return false;
        catalog = window.StationCatalog[candidate]; return true;
      });
    }
    add(catalog && catalog.lines);
    var official = officialStations()[normalize(name)];
    add(official && official.lines);
    return found;
  }
  function primaryLine(name, preferred) {
    var served = stationLines(name);
    if (preferred && window.LINE_BY_SLUG && window.LINE_BY_SLUG[preferred] && (!served.length || served.indexOf(preferred) > -1)) return preferred;
    var home = HOME[name];
    if (home && window.LINE_BY_SLUG && window.LINE_BY_SLUG[home] && (!served.length || served.indexOf(home) > -1)) return home;
    return served[0] || null;
  }
  function url(name, line) {
    var href = 'map.html?station=' + kebab(name);
    if (line && window.LINE_BY_SLUG && window.LINE_BY_SLUG[line]) href += '&line=' + encodeURIComponent(line);
    return href;
  }
  function contextualURL(href) {
    return window.DemoMode && window.DemoMode.active ? window.DemoMode.url(href) : href;
  }
  function attach(o) {
    var all = names(), input = o.input, panel = o.panel, cur = [], destroyed = false;
    function lineFor(n) {
      var preferred = o.line ? o.line(n, HOME[n]) : HOME[n];
      return primaryLine(n, preferred);
    }
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function attr(s) { return esc(s).replace(/"/g, '&quot;'); }
    function rootOpen(on) {
      var parent = input.parentNode;
      if (parent && parent.classList) parent.classList.toggle('on', on);
      if (on) document.documentElement.classList.add('station-search-open');
      else if (!document.querySelector('.overview-search.on,.sbox.on')) document.documentElement.classList.remove('station-search-open');
    }
    function render() {
      var raw = input.value.trim(), v = normalize(raw);
      cur = raw ? (v ? all.filter(function (n) { return normalize(n).indexOf(v) > -1; })
        .sort(function (a, b) {
          var ap = normalize(a).indexOf(v) === 0, bp = normalize(b).indexOf(v) === 0;
          return (ap === bp) ? a.localeCompare(b) : (ap ? -1 : 1);
        }) : []) : SUGGEST.slice();
      var h = '<div class="sp-h">' + (raw ? cur.length + ' station' + (cur.length === 1 ? '' : 's') : 'Suggestions') + '</div>';
      if (!cur.length) h += '<div class="sp-none">No station matches “' + esc(input.value) + '”</div>';
      cur.slice(0, 40).forEach(function (n) {
        var lines = stationLines(n), line = lineFor(n), visibleLines = lines.length ? lines : (line ? [line] : []);
        var lineNames = visibleLines.map(function (slug) { return window.LINE_BY_SLUG[slug].name; }).join(', ');
        var bars = visibleLines.map(function (slug) { return '<i style="background:' + window.LINE_BY_SLUG[slug].color + '"></i>'; }).join('');
        h += '<a class="sp-r" data-n="' + attr(n) + '" data-line="' + attr(line || '') + '" aria-label="' + attr(n + (lineNames ? ' — ' + lineNames : '')) + '" href="' + attr(contextualURL(url(n, line))) + '"><span class="sp-lines" aria-hidden="true">' + bars + '</span><span class="sp-name">' + esc(n) + '</span><b aria-hidden="true">&rsaquo;</b></a>';
      });
      panel.innerHTML = h;
    }
    function pick(n, line) {
      var f = o.onPick || input.__pick;
      if (!f) return false;
      f(n, line || lineFor(n)); input.value = ''; return true;
    }
    function close() {
      panel.hidden = true; rootOpen(false);
    }
    function open() {
      if (destroyed) return;
      render(); panel.hidden = false; rootOpen(true);
    }
    function onPanelClick(e) {
      var a = e.target.closest && e.target.closest('.sp-r');
      if (a && pick(a.getAttribute('data-n'), a.getAttribute('data-line'))) { e.preventDefault(); input.blur(); close(); }
    }
    function onFocus() { open(); }
    function onInput() { open(); }
    function onKeydown(e) {
      if (e.key === 'Enter' && cur.length && !e.isComposing) {
        e.preventDefault();
        var line = lineFor(cur[0]);
        if (pick(cur[0], line)) { input.blur(); close(); }
        else location.href = contextualURL(url(cur[0], line));
      }
      if (e.key === 'Escape') { input.value = ''; input.blur(); close(); }
    }
    function onDocumentPointerdown(e) {
      if (!panel.hidden && !(e.target.closest && e.target.closest('.sp, .sbox, .overview-search'))) { input.blur(); close(); }
    }
    panel.addEventListener('click', onPanelClick);
    input.addEventListener('focus', onFocus);
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKeydown);
    document.addEventListener('pointerdown', onDocumentPointerdown);
    panel.hidden = true;
    return function destroy() {
      if (destroyed) return;
      destroyed = true;
      panel.removeEventListener('click', onPanelClick);
      input.removeEventListener('focus', onFocus);
      input.removeEventListener('input', onInput);
      input.removeEventListener('keydown', onKeydown);
      document.removeEventListener('pointerdown', onDocumentPointerdown);
      close();
    };
  }
  window.TCSearch = { attach: attach, kebab: kebab, normalize: normalize, linesFor: stationLines, primaryLine: primaryLine, url: url };
})();

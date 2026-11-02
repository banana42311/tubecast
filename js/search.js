/* Station search — shared by map.html and lines.html.
   TCSearch.attach({input, panel, line: fn(name)->slug})  → station.html?station=<kebab>&line=<slug> */
(function () {
  var EXTRA = ['Stratford'];
  var SUGGEST = ['Mile End', 'Bethnal Green', 'Liverpool Street', 'Bank', 'Stratford', 'Waterloo'];
  var HOME = { 'Stratford':'central', 'Wood Lane':'hammersmith-city', 'Barons Court':'district', 'West Kensington':'district',
    "Earl's Court":'district', 'Gloucester Road':'district', 'South Kensington':'district', 'Victoria':'victoria',
    'Oxford Circus':'victoria', 'Euston':'victoria', "King's Cross":'piccadilly', 'Baker Street':'metropolitan' };
  function kebab(n) {
    return n.toLowerCase().replace(/&/g, 'and').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function names() {
    var a = window.StationDirectory ? StationDirectory.slice() : window.StationCatalog ? Object.keys(StationCatalog) : (window.TC_LABELS || []).map(function (l) { return l[0]; });
    EXTRA.forEach(function (e) { if (a.indexOf(e) < 0) a.push(e); });
    return a.sort(function (x, y) { return x.localeCompare(y); });
  }
  function url(name, line) { return 'map.html?station=' + kebab(name) + '&line=' + line; }
  function attach(o) {
    var all = names(), input = o.input, panel = o.panel, cur = [];
    function lineFor(n) { return o.line ? o.line(n, HOME[n]) : (HOME[n] || 'central'); }
    function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
    function render() {
      var v = input.value.trim().toLowerCase();
      cur = v ? all.filter(function (n) { return n.toLowerCase().indexOf(v) > -1; })
                    .sort(function (a, b) { return (a.toLowerCase().indexOf(v) !== 0) - (b.toLowerCase().indexOf(v) !== 0); })
              : SUGGEST.slice();
      var h = '<div class="sp-h">' + (v ? cur.length + ' station' + (cur.length === 1 ? '' : 's') : 'Suggestions') + '</div>';
      if (!cur.length) h += '<div class="sp-none">No station matches “' + esc(input.value) + '”</div>';
      cur.slice(0, 40).forEach(function (n) {
        var l = window.LINE_BY_SLUG[lineFor(n)] || {};
        h += '<a class="sp-r" data-n="' + esc(n).replace(/"/g, '&quot;') + '" href="' + url(n, lineFor(n)) + '"><i style="background:' + (l.color || '#7c8794') + '"></i><span>' + esc(n) + '</span><b>&rsaquo;</b></a>';
      });
      panel.innerHTML = h;
    }
    function pick(n) { var f = o.onPick || input.__pick; if (!f) return false; f(n); input.value = ''; return true; }
    panel.addEventListener('click', function (e) { var a = e.target.closest('.sp-r'); if (a && pick(a.getAttribute('data-n'))) { e.preventDefault(); input.blur(); close(); } });
    function open() { render(); panel.hidden = false; input.parentNode.classList.add('on'); }
    function close() { panel.hidden = true; input.parentNode.classList.remove('on'); }
    input.addEventListener('focus', open);
    input.addEventListener('input', open);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && cur.length) { if (pick(cur[0])) { input.blur(); close(); } else location.href = url(cur[0], lineFor(cur[0])); }
      if (e.key === 'Escape') { input.value = ''; input.blur(); close(); }
    });
    document.addEventListener('pointerdown', function (e) {
      if (!panel.hidden && !e.target.closest('.sp, .sbox')) { input.blur(); close(); }
    });
    panel.addEventListener('pointerdown', function (e) { e.preventDefault(); });
    panel.hidden = true;
  }
  window.TCSearch = { attach: attach, kebab: kebab, url: url };
})();

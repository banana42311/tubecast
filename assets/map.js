/* NetMap.render(host, {pan:[x,y], focus:'central'|'district'|..|null, base:true})
   Draws the blurred Tube network (Figma "map (blurred)") plus an optional in-focus line.
   `host` is an absolutely positioned element; the map frame (656x410) is placed at `pan`. */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function g(parent, off, attrs) {
    attrs = attrs || {};
    if (off) attrs.transform = 'translate(' + off[0] + ' ' + off[1] + ')';
    return el('g', attrs, parent);
  }
  function render(host, o) {
    o = o || {};
    var N = window.NET, pan = o.pan || [0, 0], focus = o.focus || null;
    host.innerHTML = '';
    var svg = el('svg', { width: 656, height: 410, viewBox: '0 0 656 410', fill: 'none', style: 'position:absolute;overflow:visible;left:' + pan[0] + 'px;top:' + pan[1] + 'px' });
    var defs = el('defs', {}, svg);
    var f1 = el('filter', { id: 'nb', x: '-10%', y: '-10%', width: '120%', height: '120%' }, defs);
    el('feGaussianBlur', { stdDeviation: 1.5 }, f1);
    var f2 = el('filter', { id: 'ng', x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs);
    el('feGaussianBlur', { stdDeviation: 2.5 }, f2);

    /* ---- base network (blur 1.5, opacity .55) ---- */
    var base = el('g', { filter: 'url(#nb)', opacity: o.opacity == null ? 0.55 : o.opacity }, svg);
    var w = g(base, N.water.off, { opacity: 0.6 });
    el('path', { d: N.water.d, stroke: '#16293A', 'stroke-width': 13.94, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, w);
    var c = g(base, N.casing.off, { opacity: 0.5, stroke: '#12161C', 'stroke-width': 3.69, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    N.casing.p.forEach(function (d) { el('path', { d: d }, c); });
    var L = g(base, N.lines.off, { 'stroke-width': 2.05, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    N.lines.p.forEach(function (p) {
      if (p[0] === focus) return;
      el('path', { d: p[1], stroke: N.colors[p[0]], opacity: 0.4 }, L);
    });
    if (focus !== 'central') {
      var C = g(base, N.central.off, { 'stroke-width': 2.05, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      N.central.p.forEach(function (d) { el('path', { d: d, stroke: N.colors.central, opacity: 0.4 }, C); });
    }
    var T = g(base, N.ticks.off, { 'stroke-width': 1.64 });
    N.ticks.p.forEach(function (p) { el('path', { d: p[1], stroke: p[0] }, T); });
    var H = g(base, N.hubs.off, { fill: 'white', stroke: '#0B0D11', 'stroke-width': 1.025 });
    N.hubs.r.forEach(function (r) { el('circle', { cx: r[0], cy: r[1], r: r[2] }, H); });

    /* ---- in-focus line ---- */
    if (focus) {
      var col = N.colors[focus];
      var paths = [], off;
      if (focus === 'central') { paths = N.central.p; off = N.central.off; }
      else { paths = N.lines.p.filter(function (p) { return p[0] === focus; }).map(function (p) { return p[1]; }); off = N.lines.off; }
      var glow = g(svg, off, { opacity: 0.55, filter: 'url(#ng)', stroke: col, 'stroke-width': 9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      paths.forEach(function (d) { el('path', { d: d }, glow); });
      var line = g(svg, off, { stroke: col, 'stroke-width': 3.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      paths.forEach(function (d) { el('path', { d: d }, line); });
      var st = N.stations[focus];
      if (st) {
        var S = g(svg, null, { fill: 'white' });
        st.forEach(function (s) {
          var a = { cx: s[0], cy: s[1], r: s[2] };
          if (s[3]) { a.stroke = '#1A2029'; a['stroke-width'] = 1.5; }
          el('circle', a, S);
        });
      }
    }
    host.appendChild(svg);
    return svg;
  }
  window.NetMap = { render: render };
})();

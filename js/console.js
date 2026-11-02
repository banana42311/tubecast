/* Tubecast desktop console. Same scenario, state contract and route ranking as the phone app. */
(function () {
  var NS = 'http://www.w3.org/2000/svg', COL = NET.colors, SC = window.StationCatalog, LB = window.LINE_BY_SLUG || {};
  var DATA = window.TUBECAST_DEMO_COMMUTE, stage = 3, H = 0, routeOpts = null, sel = 0, focus = null;
  var A = { id: 'stratford', name: 'Stratford' }, B = { id: 'white-city', name: 'White City' };
  var svg = document.getElementById('map'), wrap = document.getElementById('mapwrap');
  var LEFT = document.getElementById('left'), RIGHT = document.getElementById('right');
  function state() { return (DATA.stages.find(function (s) { return s.id === stage; }) || DATA.stages[DATA.stages.length - 1]).state; }
  function lname(id) { return (LB[id] && LB[id].name || id).replace(/ line$/, ''); }
  function col(id) { return COL[id] || (LB[id] && LB[id].color) || '#7c8794'; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function el(t, a, p) { var n = document.createElementNS(NS, t); for (var k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; }
  function hhmm(iso, add) { var d = new Date(Date.parse(iso) + (add || 0) * 60000); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); }
  function rows() { var out = []; (state().lines || []).forEach(function (L) { (L.rows || []).forEach(function (r, i) { out.push(Object.assign({ line: L.id, i: i }, r)); }); }); return out; }

  /* ---------- map ---------- */
  var gBase = el('g', {}, svg), gFlow = el('g', {}, svg), gRoute = el('g', {}, svg), gMark = el('g', {}, svg), gLbl = el('g', {}, svg);
  NET.lines.p.forEach(function (p) { el('path', { d: p[1], stroke: col(p[0]), 'stroke-width': 1.6, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: .5 }, gBase); });
  NET.central.p.forEach(function (d) { el('path', { d: d, stroke: col('central'), 'stroke-width': 1.6, fill: 'none', 'stroke-linecap': 'round', opacity: .5 }, gBase); });
  var STN = Object.keys(SC).map(function (n) { return SC[n]; });
  var stnEls = STN.map(function (s) { return el('circle', { cx: s.x, cy: s.y, class: 'stn' }, gBase); });
  var vb = { x: -60, y: 20, w: 800, h: 450 }, anim = null;
  function fitAspect() { var r = wrap.clientHeight / wrap.clientWidth; var cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2; vb.h = vb.w * r; vb.y = cy - vb.h / 2; }
  function k() { return vb.w / wrap.clientWidth; }
  function apply() { svg.setAttribute('viewBox', vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h); var s = k(); stnEls.forEach(function (c, i) { c.setAttribute('r', (STN[i].lines.length > 1 ? 3.2 : 2.2) * s); c.setAttribute('stroke-width', 1.1 * s); }); overlays(); }
  function animateTo(t, ms) { var f = Object.assign({}, vb), t0 = performance.now(); cancelAnimationFrame(anim); (function step(now) { var p = Math.min(1, (now - t0) / (ms || 700)), e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; ['x', 'y', 'w', 'h'].forEach(function (q) { vb[q] = f[q] + (t[q] - f[q]) * e; }); apply(); if (p < 1) anim = requestAnimationFrame(step); })(t0); }
  function fitBox(pts, pad) { var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; }); var x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs), y0 = Math.min.apply(0, ys), y1 = Math.max.apply(0, ys); var r = wrap.clientHeight / wrap.clientWidth, w = Math.max(x1 - x0, (y1 - y0) / r) * (1 + pad), h = w * r; return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2 - h * .06, w: w, h: h }; }
  // pan + zoom
  var drag = null;
  svg.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y }; svg.setPointerCapture(e.pointerId); svg.classList.add('drag'); cancelAnimationFrame(anim); });
  svg.addEventListener('pointermove', function (e) { if (!drag) return; vb.x = drag.vx - (e.clientX - drag.x) * k(); vb.y = drag.vy - (e.clientY - drag.y) * k(); apply(); });
  svg.addEventListener('pointerup', function () { drag = null; svg.classList.remove('drag'); });
  function zoomAt(f, cx, cy) { var r = svg.getBoundingClientRect(); var px = vb.x + (cx - r.left) * k(), py = vb.y + (cy - r.top) * k(); var w = Math.min(2600, Math.max(120, vb.w * f)), s = w / vb.w; vb.x = px - (px - vb.x) * s; vb.y = py - (py - vb.y) * s; vb.w = w; vb.h *= s; apply(); }
  svg.addEventListener('wheel', function (e) { e.preventDefault(); zoomAt(Math.exp(e.deltaY * .0015), e.clientX, e.clientY); }, { passive: false });
  document.getElementById('zin').onclick = function () { var r = svg.getBoundingClientRect(); var t = Object.assign({}, vb); t.w *= .7; t.h *= .7; t.x += vb.w * .15; t.y += vb.h * .15; animateTo(t, 350); };
  document.getElementById('zout').onclick = function () { var t = Object.assign({}, vb); t.w /= .7; t.h /= .7; t.x -= t.w * .15; t.y -= t.h * .15; animateTo(t, 350); };

  function routePts(o) { var pts = []; (o.r.legs || []).forEach(function (l) { if (l.walking) return; var seg = (l.stops || []).map(function (s) { return SC[s.name]; }).filter(Boolean).map(function (s) { return [s.x, s.y]; }); if (seg.length) pts.push({ line: l.line, pts: seg }); }); return pts; }

  function overlays() {
    var s = k(), rs = rows(); [gFlow, gMark, gLbl].forEach(function (g) { while (g.firstChild) g.removeChild(g.firstChild); });
    var hot = {};
    // flow of a delay along its own line and direction
    var groups = {};
    rs.forEach(function (r) { var key = r.line + '|' + r.dir; (groups[key] = groups[key] || []).push(r); });
    Object.keys(groups).forEach(function (key) {
      var g = groups[key].filter(function (r) { return SC[r.station] && (r.now || r.onset_min != null); });
      var reach = g.filter(function (r) { return r.now || (H > 0 && r.onset_min <= H); });
      if (reach.length < 2) return;
      var d = reach.map(function (r, i) { var c = SC[r.station]; return (i ? 'L' : 'M') + c.x + ' ' + c.y; }).join(' ');
      el('path', { d: d, stroke: '#ffa12b', 'stroke-opacity': .18, 'stroke-width': 9 * s, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, gFlow);
      el('path', { d: d, class: 'flow', stroke: '#ffd08a', 'stroke-width': 2 * s, 'stroke-dasharray': (3 * s) + ' ' + (9 * s), style: 'animation-duration:' + (1.6) + 's' }, gFlow)
        .style.setProperty('--x', 0);
    });
    rs.forEach(function (r) {
      var c = SC[r.station]; if (!c) return;
      if (r.now) {
        var sev = r.now.level === 'severe', fill = sev ? '#dc241f' : '#ffa12b';
        el('circle', { cx: c.x, cy: c.y, r: 16 * s, fill: fill, opacity: .18 }, gMark);
        el('circle', { cx: c.x, cy: c.y, r: 5.5 * s, fill: fill, stroke: '#12161c', 'stroke-width': 1.5 * s }, gMark);
        hot[r.station] = 1;
      } else if (r.onset_min != null) {
        var on = H > 0 && r.onset_min <= H;
        el('circle', { cx: c.x, cy: c.y, r: 9 * s, class: 'ring' + (r.risk === 'high' ? ' high' : ''), 'stroke-width': (on ? 2.2 : 1.4) * s, 'stroke-dasharray': on ? 'none' : (3 * s) + ' ' + (3 * s), opacity: on ? 1 : .4 }, gMark);
        if (on) hot[r.station] = 1;
      }
    });
    if (focus && SC[focus]) { var f = SC[focus]; el('circle', { cx: f.x, cy: f.y, r: 15 * s, fill: 'none', stroke: '#fff', 'stroke-width': 1.4 * s, opacity: .9 }, gMark); hot[focus] = 1; }
    if (routeOpts) { var o = routeOpts[sel]; o.r.legs.forEach(function (l) { (l.stops || []).forEach(function (st, i, a) { if (i === 0 || i === a.length - 1) hot[st.name] = 1; }); }); }
    // labels: constant screen size, interchanges first, hide on overlap
    var fs = 11 * s, boxes = [], list = STN.filter(function (st) { return hot[st.name] || (s < .9 && st.lines.length > 1) || s < .38; });
    list.sort(function (a, b) { return (hot[b.name] ? 2 : 0) - (hot[a.name] ? 2 : 0) || b.lines.length - a.lines.length; });
    list.forEach(function (st) {
      var w = st.name.length * fs * .56, x, y, bx, ok = false;
      var cand = [[6, -6], [6, fs + 4 * s], [-6 - w / s, -6], [-6 - w / s, fs + 4 * s], [6, -6 - fs * 1.1]];
      for (var ci = 0; ci < cand.length && !ok; ci++) { x = st.x + cand[ci][0] * s; y = st.y + (cand[ci][1] < 0 ? cand[ci][1] * s : cand[ci][1]); if (cand[ci][1] === -6 - fs * 1.1) y = st.y - 6 * s - fs * 1.1; bx = [x - 2 * s, y - fs, x + w + 2 * s, y + 3 * s];
        ok = !boxes.some(function (b) { return !(bx[2] < b[0] || bx[0] > b[2] || bx[3] < b[1] || bx[1] > b[3]); }); }
      if (!ok && !hot[st.name]) return; boxes.push(bx);
      var t = el('text', { x: x, y: y, class: 'lbl' + (hot[st.name] ? ' hot' : ''), 'font-size': fs * (hot[st.name] ? 1.08 : 1), 'stroke-width': 3 * s }, gLbl); t.textContent = st.name;
    });
  }

  function drawRoute() {
    while (gRoute.firstChild) gRoute.removeChild(gRoute.firstChild);
    if (!routeOpts) return;
    var s = k();
    routeOpts.forEach(function (o, i) { if (i === sel) return; routePts(o).forEach(function (seg) { el('polyline', { points: seg.pts.join(' '), class: 'route', stroke: '#fff', 'stroke-opacity': .18, 'stroke-width': 3 * s }, gRoute); }); });
    var segs = routePts(routeOpts[sel]), all = [];
    segs.forEach(function (seg, j) {
      all = all.concat(seg.pts);
      el('polyline', { points: seg.pts.join(' '), class: 'route', stroke: '#12161c', 'stroke-width': 9 * s }, gRoute);
      var p = el('polyline', { points: seg.pts.join(' '), class: 'route draw', stroke: col(seg.line), 'stroke-width': 5.5 * s }, gRoute);
      var len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = len; p.style.setProperty('--len', len); p.style.animationDelay = (j * .55) + 's';
    });
    // interchange pulse + travelling dot
    segs.slice(1).forEach(function (seg, j) { var c = seg.pts[0]; var r = el('circle', { cx: c[0], cy: c[1], r: 7 * s, fill: 'none', stroke: '#fff', 'stroke-width': 2 * s }, gRoute); r.animate([{ opacity: 0, r: 4 * s }, { opacity: 1, r: 8 * s }, { opacity: 0, r: 16 * s }], { duration: 1200, delay: 550 * (j + 1), iterations: 2 }); });
    var dot = el('circle', { r: 4.5 * s, fill: '#fff' }, gRoute), path = el('polyline', { points: all.join(' '), fill: 'none', stroke: 'none' }, gRoute), L = path.getTotalLength(), t0 = performance.now() + 400;
    (function mv(now) { var p = Math.max(0, Math.min(1, (now - t0) / 2600)); var q = path.getPointAtLength(L * p); dot.setAttribute('cx', q.x); dot.setAttribute('cy', q.y); dot.setAttribute('opacity', p >= 1 ? 0 : 1); if (p < 1 && gRoute.contains(dot)) requestAnimationFrame(mv); })(performance.now());
    return all;
  }

  /* ---------- panels ---------- */
  function reasonText(r) {
    if (r.top_reason === 'delays_up_line') { var up = rows().filter(function (x) { return x.line === r.line && x.dir === r.dir && x.now; })[0]; return 'Delays up the line' + (up ? ' at ' + up.station : '') + ' · usually reaches here in ~' + r.onset_min + ' min'; }
    if (r.top_reason === 'network_pattern') return 'Often delayed at this hour on busy mornings';
    return 'Gap opening here';
  }
  function renderLeft() {
    var S = state(), rs = rows(), now = rs.filter(function (r) { return r.now; });
    var bad = (S.lines || []).filter(function (L) { return !/good/i.test(L.tfl && L.tfl.status || ''); });
    LEFT.innerHTML = '<h1>London</h1><div class="sub">Tube and Elizabeth line · TfL status ' + hhmm(S.as_of) + '</div>' +
      '<div class="sec"><div class="sec-h">Delays now <span class="n">' + now.length + '</span><span class="tag">OBSERVED</span></div><div class="sec-p">Measured from the real gaps between trains, by station and direction.</div>' +
      now.map(function (r) { var sev = r.now.level === 'severe'; return '<div class="card' + (focus === r.station ? ' on' : '') + '" data-st="' + esc(r.station) + '"><div class="t">' + esc(r.station) + '</div><div class="m"><i class="bar" style="background:' + col(r.line) + '"></i>' + lname(r.line) + ' · ' + esc(r.dir) + ' · <span class="lv ' + (sev ? 'severe' : 'minor') + '">' + (sev ? 'Severe' : 'Minor') + '</span></div><div class="d">Gap ' + Math.round(r.now.gap_min) + ' min · usually ' + Math.round(r.now.usual_min) + ' min</div></div>'; }).join('') +
      (now.length ? '' : '<div class="sec-p">No delays measured right now.</div>') + '</div>' +
      '<div class="sec"><div class="sec-h">TfL line status <span class="n">' + bad.length + '</span></div><div class="sec-p">As announced by TfL.</div>' +
      bad.map(function (L) { var sev = /severe/i.test(L.tfl.status); return '<div class="card"><div class="m" style="margin-top:0"><i class="bar" style="background:' + col(L.id) + '"></i><b style="color:var(--ink);font-size:14px">' + lname(L.id) + '</b> · <span class="lv ' + (sev ? 'severe' : 'minor') + '">' + esc(L.tfl.status) + '</span></div><div class="d">' + esc(L.tfl.reason || '') + '</div></div>'; }).join('') + '</div>';
  }
  function renderRight() {
    if (routeOpts) return renderRoute();
    var S = state(), lines = (S.lines || []).filter(function (L) { return (L.cols || []).some(function (c) { return c.n; }); });
    var hs = [0, 10, 20, 30], tot = hs.map(function (h) { return lines.reduce(function (n, L) { var c = (L.cols || []).find(function (c) { return c.h === h; }); return n + (c && c.n || 0); }, 0); }), mx = Math.max.apply(0, tot.concat([1]));
    var fc = rows().filter(function (r) { return !r.now && r.onset_min != null; }).sort(function (a, b) { return a.onset_min - b.onset_min || (b.onset_p30 || 0) - (a.onset_p30 || 0); });
    RIGHT.innerHTML = '<div class="sec-h">Next 30 minutes</div><div class="sec-p">Stations delayed now plus stations that may be delayed, by time.</div>' +
      '<div class="hz">' + hs.map(function (h, i) { return '<div class="col' + (h === H ? ' sel' : '') + '" data-h="' + h + '"><div class="v">' + tot[i] + '</div><div class="stack" style="height:' + Math.max(6, tot[i] / mx * 100) + '%">' + lines.map(function (L) { var c = (L.cols || []).find(function (c) { return c.h === h; }); var n = c && c.n || 0; return n ? '<i style="height:' + (n / tot[i] * 100) + '%;background:' + col(L.id) + ';opacity:' + (h === H ? 1 : .55) + '"></i>' : ''; }).join('') + '</div><div class="h">' + (h ? '+' + h + ' min' : 'Now') + '</div></div>'; }).join('') + '</div>' +
      '<div class="lgd">' + lines.map(function (L) { return '<span><i style="background:' + col(L.id) + '"></i>' + lname(L.id) + '</span>'; }).join('') + '</div>' +
      '<div class="sec"><div class="sec-h">Where it may get worse <span class="tag">FORECAST</span></div><div class="sec-p">Chance a delay starts within 30 minutes, per station and direction.</div>' +
      fc.map(function (r, i) { return '<div class="card' + (focus === r.station ? ' on' : '') + '" data-st="' + esc(r.station) + '"><div class="t"><span class="num">' + (i + 1) + '</span>' + esc(r.station) + '<span class="when">~' + r.onset_min + ' min</span><span class="chip ' + r.risk + '">' + (r.risk === 'high' ? 'High' : 'Elevated') + '</span></div><div class="m"><i class="bar" style="background:' + col(r.line) + '"></i>' + lname(r.line) + ' · ' + esc(r.dir) + (r.onset_p30 != null ? ' · ' + Math.round(r.onset_p30 * 100) + '% chance' : '') + '</div><div class="d">' + esc(reasonText(r)) + '</div></div>'; }).join('') + '</div>';
  }
  function gURL(o) { var via = [], legs = o.r.legs.filter(function (l) { return !l.walking; }); legs.slice(0, -1).forEach(function (l) { var s = l.stops[l.stops.length - 1]; if (s) via.push(s.name + ' Station, London'); }); var p = new URLSearchParams({ api: '1', origin: A.name + ' Station, London', destination: B.name + ' Station, London', travelmode: 'transit' }); if (via.length) p.set('waypoints', via.join('|')); return 'https://www.google.com/maps/dir/?' + p.toString(); }
  function renderRoute() {
    RIGHT.innerHTML = '<button class="back" id="back">‹ Back to forecast</button><div class="sec-h">Route · ' + A.name + ' → ' + B.name + '</div><div class="sec-p">TfL Journey Planner routes, re-ranked with current and forecast delays.</div>' +
      routeOpts.map(function (o, i) {
        var rec = o.tag === 'Recommended now', x = o.extra ? '+' + o.extra + ' min expected' : 'No delays on this route';
        var why = o.explanation || (o.risk && o.risk.predicted && o.risk.predicted.length ? 'Forecast delays at ' + o.risk.predicted.join(', ') : '');
        return '<div class="opt' + (i === sel ? ' on' : '') + (rec ? ' rec' : '') + '" data-o="' + i + '"><div class="tg">' + esc(o.tag).toUpperCase() + '</div><div class="tm"><b>' + o.min + ' min</b><span class="' + (o.extra ? 'x' : '') + '">' + x + '</span></div><div class="legs">' + o.r.legs.filter(function (l) { return !l.walking; }).map(function (l) { return '<span class="pill" style="background:' + col(l.line) + ';color:' + (/circle|hammersmith|waterloo|northern/.test(l.line) ? '#111' : '#fff') + '">' + lname(l.line) + '</span>'; }).join('<span style="color:var(--ink-3)">›</span>') + '</div>' + (why ? '<div class="why">' + esc(why) + '</div>' : '') + '</div>';
      }).join('') +
      '<a class="gmap" target="_blank" rel="noopener" href="' + gURL(routeOpts[sel]) + '"><span>G</span>Open this route in Google Maps</a>';
    document.getElementById('back').onclick = function () { routeOpts = null; drawRoute(); renderRight(); animateTo(fitBox([[-40, 60], [700, 320]], .02), 800); };
  }
  function render() { renderLeft(); renderRight(); overlays(); var S = state(); document.getElementById('clock').textContent = hhmm(S.as_of); document.getElementById('tnow').textContent = hhmm(S.as_of); }

  /* ---------- interactions ---------- */
  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-st]'); if (c) { focus = c.dataset.st; var s = SC[focus]; if (s) { var w = 340, r = wrap.clientHeight / wrap.clientWidth; animateTo({ x: s.x - w / 2, y: s.y - w * r / 2, w: w, h: w * r }, 700); } renderLeft(); if (!routeOpts) renderRight(); return; }
    var h = e.target.closest('[data-h]'); if (h) { setH(+h.dataset.h); return; }
    var o = e.target.closest('[data-o]'); if (o) { sel = +o.dataset.o; renderRoute(); var pts = drawRoute(); animateTo(fitBox(pts, .25), 700); overlays(); }
  });
  function setH(h) { H = h; document.querySelectorAll('.tb-track button').forEach(function (b) { var v = +b.dataset.h; b.classList.toggle('on', v === H); b.classList.toggle('past', v < H); }); document.getElementById('tbfill').style.width = 'calc((100% - 16px) * ' + (H / 30) + ')'; document.getElementById('tbtext').textContent = H ? 'Showing stations that may be delayed by +' + H + ' min (' + hhmm(state().as_of, H) + '). Solid rings = expected by then.' : 'Now shows measured delays. Slide ahead to see where it may get worse.'; if (!routeOpts) renderRight(); overlays(); }
  document.getElementById('routebar').addEventListener('submit', function (e) {
    e.preventDefault();
    RIGHT.innerHTML = '<div class="sec-h">Route · ' + A.name + ' → ' + B.name + '</div>' + [0, 1, 2].map(function () { return '<div class="opt" style="height:96px;opacity:.5"></div>'; }).join('');
    JourneyAPI.plan(A, B).then(function (opts) {
      routeOpts = window.RouteRisk ? RouteRisk.rank(opts, window.LiveState || {}) : opts; sel = 0; renderRoute(); var pts = drawRoute(); animateTo(fitBox(pts, .25), 900); overlays();
    }).catch(function (err) { RIGHT.innerHTML = '<div class="sec-p">Route unavailable: ' + esc(err.message) + '</div>'; });
  });
  addEventListener('keydown', function (e) { if (e.target.tagName === 'INPUT') return; if (/^[123]$/.test(e.key)) { stage = +e.key; render(); } if (e.key === 'ArrowRight') setH(Math.min(30, H + 10)); if (e.key === 'ArrowLeft') setH(Math.max(0, H - 10)); });
  addEventListener('resize', function () { fitAspect(); apply(); });
  fitAspect(); var start = fitBox([[-40, 60], [700, 320]], .02); Object.assign(vb, start); apply(); render(); setH(0);
})();

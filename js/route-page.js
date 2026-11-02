/* route.html?from=<slug>&to=<slug>  — Figma V6 141:12687 */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
  function kebab(s) { return String(s).toLowerCase().replace(/['’]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function back() { if (history.length > 1) history.back(); else location.href = 'index.html#overview'; }
  var M = window.Motion;
  var N = window.NET, COL = { minor: 'var(--minor)', severe: 'var(--severe)', good: 'var(--good)' };
  var C = { central: '#E1251B', eliz: '#8C6CD1', hc: '#F3A9BB' };

  /* ---------- stations on this canvas (page coords) ---------- */
  var STN = {
    'stratford':        { name: 'Stratford', p: [371.1, 250.8], st: ['now', 'good'], line: 'central' },
    'mile-end':         { name: 'Mile End', p: [335.8, 286.1], st: ['now', 'minor'], line: 'central' },
    'bethnal-green':    { name: 'Bethnal Green', p: [312.3, 286.1], st: ['now', 'minor'], line: 'central' },
    'liverpool-street': { name: 'Liverpool Street', p: [288.8, 309.6], st: ['pred', 'severe'], line: 'central' },
    'bank':             { name: 'Bank', p: [265.2, 333.2], st: ['pred', 'severe'], line: 'central' },
    'oxford-circus':    { name: 'Oxford Circus', p: [182.9, 309.6], st: ['now', 'good'], line: 'central' },
    'paddington':       { name: 'Paddington', p: [77.1, 286.54], st: ['now', 'good'], line: 'elizabeth' },
    'wood-lane':        { name: 'Wood Lane', p: [18.9, 298.5], st: ['now', 'good'], line: 'hammersmith-city' }
  };
  var ORDER = ['stratford', 'mile-end', 'bethnal-green', 'liverpool-street', 'bank', 'oxford-circus', 'paddington', 'wood-lane'];
  var CHAIN = ['stratford', 'mile-end', 'bethnal-green', 'liverpool-street', 'bank', 'oxford-circus'];
  var CIDX = { 'stratford': 0, 'mile-end': 1, 'bethnal-green': 2, 'liverpool-street': 3, 'bank': 4, 'oxford-circus': 7, 'white-city': 13 };
  var CV = [[371.1, 250.8], [335.8, 286.1], [312.3, 286.1], [288.8, 309.6], [265.2, 333.2], [241.7, 309.6], [194.7, 309.6], [182.9, 309.6], [182.9, 308.8], [147.6, 308.8], [124.1, 308.8], [124.1, 309.6], [77.1, 309.6], [41.8, 309.6]];
  var EV = [[371.1, 250.8], [371.1, 262.6], [324, 309.6], [324, 311.1], [312.3, 311.1], [312.3, 310.5], [288.8, 310.5], [288.8, 309.6], [253.5, 309.6], [218.2, 274.4], [182.9, 309.6], [182.9, 310.5], [147.6, 310.5], [124.1, 310.5], [124.1, 309.6], [100.6, 286.1], [77.1, 286.1]];
  var HV = [[77.1, 287], [65.3, 287], [53.6, 287], [41.8, 287], [30, 287], [30.7, 286.8], [18.9, 298.5]];
  function dOf(v) { return 'M' + v.map(function (p) { return p[0] + ' ' + p[1]; }).join(' L'); }
  function plen(v) { var s = 0; for (var i = 1; i < v.length; i++) s += Math.hypot(v[i][0] - v[i - 1][0], v[i][1] - v[i - 1][1]); return s; }
  var FULL = plen(CV);

  /* ---------- state ---------- */
  var q = new URLSearchParams(location.search);
  function slugOf(t) {
    t = String(t || '').trim(); if (!t) return '';
    var k = kebab(t); if (STN[k]) return k;
    var l = t.toLowerCase();
    for (var i = 0; i < ORDER.length; i++) if (STN[ORDER[i]].name.toLowerCase() === l) return ORDER[i];
    for (var j = 0; j < ORDER.length; j++) if (STN[ORDER[j]].name.toLowerCase().indexOf(l) === 0) return ORDER[j];
    return '';
  }
  var S = { from: slugOf(q.get('from')), to: slugOf(q.get('to')), sel: 0, nav: false, rawFrom: q.get('from') || '', rawTo: q.get('to') || '' };
  if (S.from && S.from === S.to) S.to = '';

  /* ---------- route options ---------- */
  function sub(a, b) { var i = CIDX[a], j = CIDX[b], v = CV.slice(Math.min(i, j), Math.max(i, j) + 1); return i > j ? v.slice().reverse() : v; }
  function stripFor(a, b, dirLeft) {
    var lo = Math.min(CIDX[a], CIDX[b]), hi = Math.max(CIDX[a], CIDX[b]);
    var ids = CHAIN.filter(function (s) { return CIDX[s] >= lo && CIDX[s] <= hi; }).slice().reverse(); // west -> east
    var xs = ids.length === 5 ? [24.16, 90.6, 160.06, 223.48, 283.88] : ids.map(function (_, i) { return ids.length < 2 ? 151 : 24.16 + i * (259.72 / (ids.length - 1)); });
    return { ids: ids, xs: xs, left: dirLeft };
  }
  function delayInfo(ids) { var n = ids.filter(function (s) { return STN[s].st[1] !== 'good'; }).length; return n; }
  function centralOption(a, b, walkTo) { // a,b chain stations; walkTo: wood-lane (via White City + walk) or null
    var end = walkTo ? 'white-city' : b, v = sub(a, end);
    var west = CIDX[a] > CIDX[end] || !!walkTo ? false : false;
    var goingWest = CIDX[end] > CIDX[a];
    var info = stripFor(a, walkTo ? 'oxford-circus' : b, goingWest);
    if (walkTo) { // strip covers stations from a to the west end of the chain
      info = stripFor(a, 'oxford-circus', true);
    }
    var ids = info.ids, n = delayInfo(ids);
    var span = walkTo ? plen(v) : plen(v), base = Math.round(span / FULL * 29) + (walkTo ? 4 : 0);
    if (!walkTo && CIDX[b] > CIDX[a] === false) base = Math.round(span / FULL * 29);
    base = Math.max(base, 2);
    var lo = 0, hi = 0;
    if (n > 0) { var f = Math.min(1, n / 3) * Math.min(1, 0.35 + span / FULL); lo = Math.max(2, Math.round(5 * f)); hi = Math.max(4, Math.round(22 * f)); }
    var to = walkTo ? 'White City' : STN[b].name;
    var legs = [{ c: C.central, t: 'Central → ' + to }];
    if (walkTo) legs.push({ walk: 'Walk 4 min' });
    return { id: 'central', kind: 'usual', label: 'USUAL ROUTE', time: n ? (base + lo) + '–' + (base + hi) + ' min' : base + ' min',
      usually: base + ' min usually', delta: n ? '+' + lo + '–' + hi + ' min' : '', legs: legs, strip: info, ids: ids,
      paths: [{ d: dOf(v), c: C.central }], walk: walkTo ? 'M41.8 309.6 L18.9 298.5' : '', from: a, to: b };
  }
  function elizOpt(rev, dest) {
    var v = rev ? EV.slice().reverse() : EV;
    return { id: 'eliz', kind: 'rec', label: 'RECOMMENDED NOW', time: '24–26 min', legs: [{ c: C.eliz, t: 'Elizabeth → ' + (rev ? 'Stratford' : 'Paddington') }],
      status: { k: 'good', t: 'No delays on this route' }, paths: [{ d: dOf(v), c: C.eliz }], ids: [] };
  }
  function buildOptions(f, t) {
    if (!f || !t) return null;
    var cf = CIDX[f] != null && CHAIN.indexOf(f) > -1, ct = CIDX[t] != null && CHAIN.indexOf(t) > -1;
    if ((f === 'stratford' && t === 'wood-lane') || (f === 'wood-lane' && t === 'stratford')) {
      var rev = f === 'wood-lane';
      var rec = {
        id: 'rec', kind: 'rec', label: 'RECOMMENDED NOW', time: '38–42 min',
        legs: rev ? [{ c: C.hc, t: 'H&C → Paddington' }, { c: C.eliz, t: 'Elizabeth → Stratford' }] : [{ c: C.eliz, t: 'Elizabeth → Paddington' }, { c: C.hc, t: 'H&C → Wood Lane' }],
        status: { k: 'good', t: 'No delays on this route' },
        paths: [{ d: dOf(EV), c: C.eliz }, { d: dOf(HV), c: C.hc }], ids: ['stratford', 'mile-end', 'bethnal-green', 'liverpool-street', 'bank'], mid: 'paddington'
      };
      var us = centralOption('stratford', 'wood-lane', 'wood-lane');
      us.time = '38–55 min'; us.usually = '33 min usually'; us.delta = '+5–22 min';
      if (rev) { us.legs = [{ walk: 'Walk 4 min' }, { c: C.central, t: 'Central → Stratford' }]; us.strip.left = false; }
      return [rec, us];
    }
    if (cf && ct) return [centralOption(f, t, null)];
    if (cf && t === 'wood-lane') return [centralOption(f, 'oxford-circus', 'wood-lane')];
    if (ct && f === 'wood-lane') { var o = centralOption(t, 'oxford-circus', 'wood-lane'); o.legs = [{ walk: 'Walk 4 min' }, o.legs[0].t ? { c: C.central, t: 'Central → ' + STN[t].name } : null].filter(Boolean); o.strip.left = false; return [o]; }
    if ((f === 'stratford' && t === 'paddington') || (f === 'paddington' && t === 'stratford')) return [elizOpt(f === 'paddington')];
    if ((f === 'paddington' && t === 'wood-lane') || (f === 'wood-lane' && t === 'paddington')) {
      var r = f === 'wood-lane';
      return [{ id: 'hc', kind: 'rec', label: 'RECOMMENDED NOW', time: '12–14 min', legs: [{ c: C.hc, t: 'H&C → ' + (r ? 'Paddington' : 'Wood Lane') }],
        status: { k: 'good', t: 'No delays on this route' }, paths: [{ d: dOf(HV), c: C.hc }], ids: [] }];
    }
    return [];
  }

  /* ---------- drawing ---------- */
  function el(tag, a, parent) { var n = document.createElementNS(NS, tag); for (var k in a) n.setAttribute(k, a[k]); if (parent) parent.appendChild(n); return n; }
  function drawNetwork() {
    var svg = $('net'), k = 336 / 656;
    var g = el('g', { transform: 'scale(' + k + ')' }, svg);
    var w = el('g', { opacity: .7, transform: 'translate(' + N.water.off[0] + ' ' + N.water.off[1] + ')' }, g);
    el('path', { d: N.water.d, stroke: '#16293A', 'stroke-width': 13.94, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, w);
    var L = el('g', { opacity: .6, 'stroke-width': 2.05, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    var l1 = el('g', { transform: 'translate(' + N.lines.off[0] + ' ' + N.lines.off[1] + ')' }, L);
    N.lines.p.forEach(function (p) { el('path', { d: p[1], stroke: N.colors[p[0]] }, l1); });
    var l2 = el('g', { transform: 'translate(' + N.central.off[0] + ' ' + N.central.off[1] + ')' }, L);
    N.central.p.forEach(function (d) { el('path', { d: d, stroke: N.colors.central }, l2); });
  }
  function nodeCenter(id) { return STN[id].p; }
  function drawRoute(opts) {
    var svg = $('rt'), mk = $('mk'), svg0 = $('rt0'), mk0 = $('mk0'); svg.innerHTML = ''; mk.innerHTML = ''; svg0.innerHTML = ''; mk0.innerHTML = '';
    var defs = el('defs', {}, svg), f = el('filter', { id: 'bl', x: '-30%', y: '-80%', width: '160%', height: '260%' }, defs);
    el('feGaussianBlur', { stdDeviation: 3 }, f);
    if (!opts || !opts.length) return;
    var cap = { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' };
    var sel = opts[Math.min(S.sel, opts.length - 1)];
    opts.forEach(function (o) { if (o === sel) return; (o.paths || []).forEach(function (p) { el('path', Object.assign({ d: p.d, stroke: '#fff', 'stroke-opacity': .3, 'stroke-width': 4, class: 'route-path' }, cap), svg0); }); });
    var sp = sel.paths;
    sp.forEach(function (p) { el('path', Object.assign({ d: p.d, stroke: p.c, 'stroke-opacity': .5, 'stroke-width': 12, filter: 'url(#bl)', class: 'route-path' }, cap), svg); });
    sp.forEach(function (p) { el('path', Object.assign({ d: p.d, stroke: '#1a2029', 'stroke-width': 8 }, cap), svg); });
    sp.forEach(function (p) { el('path', Object.assign({ d: p.d, stroke: p.c, 'stroke-width': 5, class: 'route-path' }, cap), svg); });
    if (sel.walk) el('path', Object.assign({ d: sel.walk, stroke: '#fff', 'stroke-width': 3, 'stroke-dasharray': '1 5' }, cap), svg);

    /* delay markers for stations on the Central path of any option */
    var show = {};
    opts.forEach(function (o) { (o.ids || []).forEach(function (s) { show[s] = 1; }); });
    var h0 = '', h = '';
    for (var id in show) {
      var s = STN[id], x = s.p[0], y = s.p[1];
      if (id === S.from || id === S.to || s.st[1] === 'good') continue;
      if (s.st[0] === 'now') h0 += '<i class="nm" style="left:' + (x - 4.5) + 'px;top:' + (y - 4.5) + 'px"></i>';
      else h0 += '<span class="pred severe" style="--s:.6;left:' + (x - 19.2) + 'px;top:' + (y - 19.2) + 'px"><i class="g"></i><i class="p"></i><i class="c"></i></span>';
    }
    var a = STN[S.from], b = STN[S.to], mid = sel.mid ? STN[sel.mid] : null;
    if (mid) h += '<i style="left:' + (mid.p[0] - 5) + 'px;top:' + (mid.p[1] - 5) + 'px;width:10px;height:10px;border-radius:50%;background:#fff;border:2px solid #1a2029;box-sizing:border-box"></i>';
    h += '<i style="left:' + (a.p[0] - 7) + 'px;top:' + (a.p[1] - 7) + 'px;width:14px;height:14px;border-radius:50%;background:#1a2029;border:2.5px solid #fff;box-sizing:border-box"></i>';
    if (S.nav) h += '<i class="you" style="left:' + (a.p[0] - 7) + 'px;top:' + (a.p[1] - 7) + 'px"></i>';
    h += '<svg style="left:' + (b.p[0] - 8.5) + 'px;top:' + (b.p[1] - 20.5) + 'px" width="17" height="22" viewBox="0 0 17 22" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.5 0.5C4.1 0.5 0.5 4 0.5 8.3C0.5 14.1 8.5 20.5 8.5 20.5C8.5 20.5 16.5 14.1 16.5 8.3C16.5 4 12.9 0.5 8.5 0.5ZM8.5 5.1C10.3 5.1 11.7 6.5 11.7 8.3C11.7 10.1 10.3 11.5 8.5 11.5C6.7 11.5 5.3 10.1 5.3 8.3C5.3 6.5 6.7 5.1 8.5 5.1Z" fill="white" stroke="black"/></svg>';
    /* labels */
    h += '<span class="tl s" data-l="s" style="left:' + (a.p[0] + 11 - 54) + 'px;top:' + (a.p[1] - 24) + 'px;width:54px;text-align:right">' + esc(a.name) + '</span>';
    if (mid) h += '<span class="tl m" style="left:' + (mid.p[0] - 30) + 'px;top:' + (mid.p[1] - 22) + 'px;width:67px;text-align:center">' + esc(mid.name) + '</span>';
    h += '<span class="tl s" data-l="e" style="left:' + Math.max(8, b.p[0] - 10.9) + 'px;top:' + (b.p[1] + 6) + 'px">' + esc(b.name) + '</span>';
    mk.innerHTML = h; mk0.innerHTML = h0;
    /* label clamp / width for the start label */
    var ls = mk.querySelector('[data-l=s]'); if (ls) { ls.style.width = 'auto'; ls.style.textAlign = 'left'; var w = ls.offsetWidth; var lx = a.p[0] + 11 - w; ls.style.left = Math.min(Math.max(8, lx), 382 - w) + 'px'; }
    var le = mk.querySelector('[data-l=e]'); if (le) { var we = le.offsetWidth; le.style.left = Math.min(parseFloat(le.style.left), 382 - we) + 'px'; }
  }

  /* ---------- sheet ---------- */
  function icon(kind, st) {
    if (kind === 'pred') return '<span class="ic"><span class="pred ' + st + '" style="--s:.857"><i class="g"></i><i class="p"></i><i class="c"></i></span></span>';
    return '<span class="ic"><span class="gl ' + st + '"></span><span class="co ' + st + '"></span></span>';
  }
  function legsHtml(o) {
    var h = '';
    o.legs.forEach(function (l, i) {
      if (i) h += '<span class="chev">›</span>';
      h += '<span class="leg">' + (l.walk ? esc(l.walk) : '<i style="background:' + l.c + '"></i>' + esc(l.t)) + '</span>';
    });
    return '<div class="legs">' + h + '</div>';
  }
  function stripHtml(o) {
    var s = o.strip, h = '<div class="strip"><i class="lc" style="background:#E1251B"></i><span class="glow ' + (s.left ? 'toleft' : 'toright') + '"><i style="background:linear-gradient(90deg,rgba(225,37,27,0),#ff5e52 50%,rgba(225,37,27,0))"></i></span>';
    s.ids.forEach(function (id, i) {
      var st = STN[id].st, on = st[0] === 'now' && st[1] !== 'good';
      h += '<span class="sc" style="left:' + (s.xs[i] - 9) + 'px">' + icon(st[0], st[1]) + '</span><span class="nm2' + (on ? ' on' : '') + '" style="left:' + s.xs[i] + 'px">' + esc(id === 'liverpool-street' ? 'Liverpool St' : STN[id].name) + '</span>';
    });
    return h + '</div>';
  }
  function cardHtml(o, i) {
    var selc = i === S.sel;
    var h = '<button class="rcard' + (selc ? ' sel' : '') + '" data-i="' + i + '"><div class="rh"><span class="k">' + o.label + '</span><span class="t">' + o.time + '</span></div>';
    if (o.kind === 'rec') h += legsHtml(o) + '<div class="stat">' + icon('now', o.status.k) + '<span>' + o.status.t + '</span></div>';
    else {
      h += '<div class="meta"><span>' + o.usually + '</span>' + (o.delta ? '<b>' + o.delta + '</b>' : '') + '</div>' + legsHtml(o) + stripHtml(o);
    }
    return h + '</button>';
  }
  var QUICK = ORDER;
  function quickHtml(msg, hd) {
    return '<div class="empty"><b>' + hd + '</b>' + msg + '<div class="quick">' + QUICK.map(function (s) {
      var l = window.LINE_BY_SLUG[STN[s].line]; return '<button data-q="' + s + '"><i style="background:' + (l ? l.color : '#fff') + '"></i>' + STN[s].name + '</button>';
    }).join('') + '</div></div>';
  }
  var OPTS = [];
  function render() {
    OPTS = buildOptions(S.from, S.to) || [];
    if (S.sel >= OPTS.length) S.sel = 0;
    var list = $('list'), go = $('go'), ttl = $('ttl'), sb = $('sub');
    document.getElementById('phone').classList.toggle('navigating', S.nav && OPTS.length > 0);
    if (!S.from || !S.to) {
      S.nav = false; document.getElementById('phone').classList.remove('navigating');
      ttl.textContent = 'Routes'; sb.textContent = 'Choose where from and to';
      list.innerHTML = quickHtml('Pick ' + (!S.from && !S.to ? 'a start and a destination' : !S.from ? 'a start station' : 'a destination') + ' to see live routes.', 'Where to?');
      go.disabled = true; go.textContent = 'Start this route';
    } else if (!OPTS.length) {
      S.nav = false; document.getElementById('phone').classList.remove('navigating');
      ttl.textContent = 'Routes'; sb.textContent = 'No route found';
      list.innerHTML = quickHtml('We can’t plan ' + STN[S.from].name + ' → ' + STN[S.to].name + ' yet. Try another pair.', 'No routes yet');
      go.disabled = true; go.textContent = 'Start this route';
    } else {
      go.disabled = false;
      if (S.nav) {
        var o = OPTS[S.sel];
        ttl.textContent = 'Navigating'; sb.textContent = 'Heading to ' + STN[S.to].name + ' · ' + o.time;
        list.innerHTML = cardHtml(o, S.sel); go.textContent = 'End route';
      } else {
        ttl.textContent = 'Routes'; sb.textContent = 'Leaving now · updated 1 min ago';
        list.innerHTML = OPTS.map(cardHtml).join(''); go.textContent = 'Start this route';
      }
    }
    list.scrollTop = 0;
    drawRoute(OPTS);
    var u = new URLSearchParams(); u.set('from', S.from); u.set('to', S.to);
    try { history.replaceState(null, '', location.pathname + '?' + u.toString()); } catch (_) {}
    $('addr').textContent = 'tubecast.london/route';
    drawHits(); closeCallout(); if (window.__mg) refit(false);
  }
  function syncInputs() { $('inFrom').value = S.from ? STN[S.from].name : ''; $('inTo').value = S.to ? STN[S.to].name : ''; }

  /* ---------- suggestions ---------- */
  var activeIn = null;
  function showSug(inp) {
    activeIn = inp; var t = inp.value.trim().toLowerCase(), sug = $('sug');
    if (S.from && inp.id === 'inFrom' && t === STN[S.from].name.toLowerCase()) t = '';
    if (S.to && inp.id === 'inTo' && t === STN[S.to].name.toLowerCase()) t = '';
    var other = inp.id === 'inFrom' ? S.to : S.from;
    var m = ORDER.filter(function (s) { return s !== other && (!t || STN[s].name.toLowerCase().indexOf(t) > -1); });
    if (!m.length) { sug.classList.remove('on'); return; }
    sug.innerHTML = m.map(function (s) { var l = window.LINE_BY_SLUG[STN[s].line]; return '<button data-s="' + s + '"><i style="background:' + (l ? l.color : '#fff') + '"></i>' + STN[s].name + '</button>'; }).join('');
    sug.classList.add('on');
  }
  function hideSug() { $('sug').classList.remove('on'); }
  function commit(inp) {
    var v = slugOf(inp.value), other = inp.id === 'inFrom' ? S.to : S.from;
    if (inp.id === 'inFrom') S.from = v; else S.to = v;
    if (v && v === other) { if (inp.id === 'inFrom') S.to = ''; else S.from = ''; }
    S.sel = 0; S.nav = false; syncInputs(); render();
  }
  ['inFrom', 'inTo'].forEach(function (id) {
    var inp = $(id);
    inp.addEventListener('focus', function () { inp.select(); showSug(inp); });
    inp.addEventListener('input', function () { showSug(inp); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { var f = $('sug').querySelector('button'); if (f && $('sug').classList.contains('on')) { pick(f.getAttribute('data-s')); } else commit(inp); inp.blur(); }
      if (e.key === 'Escape') { hideSug(); syncInputs(); inp.blur(); }
    });
    inp.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement !== inp && !$('sug').matches(':hover') ) { hideSug(); commit(inp); } }, 120); });
  });
  function pick(s) {
    if (!activeIn) activeIn = !S.from ? $('inFrom') : $('inTo');
    activeIn.value = STN[s].name; hideSug(); commit(activeIn);
    if (activeIn.id === 'inFrom' && !S.to) $('inTo').focus();
  }
  $('sug').addEventListener('pointerdown', function (e) { e.preventDefault(); });
  $('sug').addEventListener('click', function (e) { var b = e.target.closest('button[data-s]'); if (b) pick(b.getAttribute('data-s')); });
  $('swap').addEventListener('click', function () {
    var t = S.from; S.from = S.to; S.to = t; S.sel = 0; S.nav = false;
    $('swap').classList.toggle('flip'); syncInputs(); render();
  });

  /* ---------- sheet interactions ---------- */
  $('list').addEventListener('click', function (e) {
    var q2 = e.target.closest('[data-q]');
    if (q2) { var s = q2.getAttribute('data-q'); if (!S.from && s !== S.to) S.from = s; else if (!S.to && s !== S.from) S.to = s; else if (s !== S.to) S.from = s; S.sel = 0; syncInputs(); render(); return; }
    var c = e.target.closest('.rcard'); if (!c || S.nav) return;
    S.sel = +c.getAttribute('data-i'); render();
  });
  $('go').addEventListener('click', function () { if (!OPTS.length) return; S.nav = !S.nav; render(); });
  $('close').addEventListener('click', back);
  $('back').addEventListener('click', back);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.activeElement === document.body) back(); });


  /* ================= interactive map ================= */
  var phone = $('phone'), view = $('mapview'), world = $('world'), sheet = $('sheet'), search = $('search'), zc = $('zoomctl'), callout = $('callout');
  var NETB = { x0: 20, y0: 190, x1: 372, y1: 420 };           // network illustration bounds (world coords)
  var userMoved = false, selStn = '';
  var STATUS = { good: 'Running normally', minor: 'Minor delay', severe: 'Severe delay' };
  function H() { return window.Shell ? Shell.height : 844; }
  function sbH() { return parseFloat(getComputedStyle(phone).getPropertyValue('--sb')) || 0; }
  function searchBottom() { return search.offsetTop + search.offsetHeight; }
  function snaps() {
    var h = H() - sbH(), exp = searchBottom() + 12, peek = h - 76 - 82, mid = Math.round(h * 0.52);
    mid = Math.max(exp + 120, Math.min(mid, peek - 80));
    return { expanded: exp, mid: mid, peek: peek };
  }
  var snapName = 'mid', sy = 395, ssp = null;
  function setSheet(y) { sy = y; sheet.style.top = y + 'px'; layoutCtl(); }
  function layoutCtl() {
    var top = Math.max(searchBottom() + 10, sy - 142);
    zc.style.top = top + 'px'; zc.classList.toggle('hide', sy < searchBottom() + 100);
    placeCallout();
  }
  function visRect() { var y0 = searchBottom() + 14, y1 = Math.max(y0 + 120, sy - 14); return { x: 0, y: y0, w: 390, h: y1 - y0 }; }
  function snapTo(name, v, instant) {
    var sn = snaps(); snapName = name; if (ssp) ssp.stop();
    if (instant || M.reduced) { setSheet(sn[name]); } else ssp = M.spring({ from: sy, to: sn[name], velocity: v || 0, response: 0.4, damping: Math.abs(v || 0) > 500 ? 0.86 : 1, onUpdate: setSheet, onDone: afterSnap });
    if (instant) afterSnap();
  }
  function afterSnap() { if (!userMoved) refit(false); }

  /* the sheet: 1:1 drag from the handle / title zone, rubber-band at both ends, momentum-projected snapping */
  (function () {
    var base = 0, kk = 1;
    M.drag($('grabz'), {
      axis: 'y', threshold: 5,
      onDown: function () { if (ssp) { ssp.stop(); } base = sy; kk = phone.getBoundingClientRect().width / 390 || 1; },
      onStart: function () { sheet.classList.add('dragging'); closeCallout(); },
      onMove: function (d) {
        var sn = snaps(), y = base + d.dy / kk;
        if (y < sn.expanded) y = sn.expanded + M.rubberband(y - sn.expanded, 300);
        else if (y > sn.peek) y = sn.peek + M.rubberband(y - sn.peek, 300);
        setSheet(y);
      },
      onEnd: function (d) {
        sheet.classList.remove('dragging');
        var sn = snaps(), v = d.vy / kk, names = ['expanded', 'mid', 'peek'], cur = names.indexOf(snapName), target;
        if (Math.abs(d.dy) < 6 && Math.abs(v) < 80) target = snapName;
        else if (Math.abs(v) > 700) target = names[M.clamp(cur + (v > 0 ? 1 : -1), 0, 2)];
        else { var proj = sy + M.project(v, 0.99), best = 1e9; names.forEach(function (n) { var e = Math.abs(sn[n] - proj); if (e < best) { best = e; target = n; } }); }
        snapTo(target, v);
      },
      onTap: function () { snapTo(snapName === 'peek' ? 'mid' : snapName === 'mid' ? 'expanded' : 'mid'); }
    });
    $('grabz').setAttribute('role', 'button'); $('grabz').setAttribute('aria-label', 'Resize routes sheet');
  })();

  /* gestures */
  var mg = window.__mg = MapGest({
    view: view, world: world, phone: phone, minZ: 0.7, maxZ: 4.5, margin: 120,
    bounds: function () { return NETB; },
    viewSize: function () { return { w: 390, h: H() }; },
    onChange: function (t) { world.classList.toggle('zl', t.z >= 1.45); placeCallout(); },
    onDragStart: function () { userMoved = true; },
    onTap: function (e) { if (!e.target.closest('.sthit')) closeCallout(); }
  });
  function routeBox() {
    var pts = [];
    if (S.from && STN[S.from]) pts.push(STN[S.from].p);
    if (S.to && STN[S.to]) pts.push(STN[S.to].p);
    var o = OPTS[Math.min(S.sel, OPTS.length - 1)];
    if (o) (o.paths || []).forEach(function (p) { var n = p.d.match(/-?\d+(\.\d+)?/g) || []; for (var i = 0; i + 1 < n.length; i += 2) pts.push([+n[i], +n[i + 1]]); });
    if (!pts.length) return NETB;
    var b = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    pts.forEach(function (p) { b.x0 = Math.min(b.x0, p[0]); b.x1 = Math.max(b.x1, p[0]); b.y0 = Math.min(b.y0, p[1]); b.y1 = Math.max(b.y1, p[1]); });
    var pad = 34; return { x0: b.x0 - pad, y0: b.y0 - pad - 8, x1: b.x1 + pad + 20, y1: b.y1 + pad };
  }
  function refit(instant) { mg.fit(OPTS.length ? routeBox() : NETB, visRect(), instant, 2.2); }

  /* tappable stations */
  function drawHits() {
    var h = '';
    ORDER.forEach(function (id) {
      var s = STN[id], ep = id === S.from || id === S.to;
      h += '<button class="sthit' + (ep ? ' ep' : '') + (id === selStn ? ' on' : '') + '" data-nodbl data-id="' + id + '" style="left:' + s.p[0] + 'px;top:' + s.p[1] + 'px" aria-label="' + esc(s.name) + '"><i class="dot"></i>' + (ep ? '' : '<span class="lb">' + esc(s.name) + '</span>') + '</button>';
    });
    $('hit').innerHTML = h;
  }
  $('hit').addEventListener('click', function (e) {
    var b = e.target.closest('.sthit'); if (!b || mg.moved && false) return;
    openCallout(b.getAttribute('data-id'));
  });
  function openCallout(id) {
    selStn = id; var s = STN[id], l = window.LINE_BY_SLUG[s.line], st = s.st;
    var txt = st[0] === 'pred' ? (st[1] === 'severe' ? 'May turn Severe' : 'May turn ' + STATUS[st[1]].split(' ')[0]) : STATUS[st[1]];
    callout.innerHTML = '<div class="ch"><i style="background:' + (l ? l.color : '#fff') + '"></i><b>' + esc(s.name) + '</b></div>' +
      '<div class="cs">' + icon(st[0], st[1]) + '<span>' + txt + (l ? ' · ' + esc(l.name.replace(/ line$/, '')) : '') + '</span></div>' +
      '<div class="ca"><button class="pf" data-a="from"' + (id === S.from ? ' disabled style="opacity:.5"' : '') + '>From</button><button data-a="to"' + (id === S.to ? ' disabled style="opacity:.5"' : '') + '>To</button>' +
      '<a href="station.html?station=' + id + '&line=' + s.line + '">Details</a></div><i class="arrow"></i>';
    callout.classList.add('on'); callout.dataset.id = id; placeCallout();
    [].forEach.call($('hit').children, function (n) { n.classList.toggle('on', n.getAttribute('data-id') === id); });
    mg.panIntoView(s.p[0], s.p[1], { x: 50, y: searchBottom() + 100, w: 290, h: Math.max(40, sy - searchBottom() - 190) });
  }
  function closeCallout() {
    if (!selStn && !callout.classList.contains('on')) return;
    selStn = ''; callout.classList.remove('on');
    [].forEach.call($('hit').children, function (n) { n.classList.remove('on'); });
  }
  function placeCallout() {
    if (!selStn || !callout.classList.contains('on')) return;
    var s = STN[selStn], p = mg.screen(s.p[0], s.p[1]), w = 236, h = callout.offsetHeight || 96;
    var below = p[1] - h - 22 < searchBottom() + 6;
    var x = M.clamp(p[0] - w / 2, 8, 382 - w), y = below ? p[1] + 20 : p[1] - h - 18;
    callout.classList.toggle('below', below);
    callout.style.left = x + 'px'; callout.style.top = y + 'px';
    var ar = callout.querySelector('.arrow'); if (ar) ar.style.left = M.clamp(p[0] - x, 20, w - 20) + 'px';
  }
  callout.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-a]'); if (!b) return;
    var id = callout.dataset.id, other;
    if (b.getAttribute('data-a') === 'from') { S.from = id; if (S.to === id) S.to = ''; } else { S.to = id; if (S.from === id) S.from = ''; }
    S.sel = 0; S.nav = false; userMoved = false; syncInputs(); render();
    if (!S.from || !S.to) { /* keep going: prompt for the other end */ var inp = !S.from ? $('inFrom') : $('inTo'); inp.focus(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && callout.classList.contains('on')) { closeCallout(); e.stopPropagation(); } }, true);

  /* zoom buttons */
  $('zin').addEventListener('click', function () { userMoved = true; mg.zoomAt(1.5, 195, (visRect().y + visRect().h / 2)); });
  $('zout').addEventListener('click', function () { userMoved = true; mg.zoomAt(1 / 1.5, 195, (visRect().y + visRect().h / 2)); });
  $('zfit').addEventListener('click', function () { userMoved = false; refit(false); });
  ['zin', 'zout', 'zfit'].forEach(function (id) { $(id).setAttribute('data-nodbl', ''); });
  zc.addEventListener('pointerdown', function (e) { e.stopPropagation(); });

  /* hide the keyboard-triggered suggestion list when the map is touched; never leave a focus trap */
  view.addEventListener('pointerdown', function () { if (document.activeElement && document.activeElement.tagName === 'INPUT') document.activeElement.blur(); });

  window.addEventListener('shellfit', function () { snapTo(snapName, 0, true); layoutCtl(); if (!userMoved) refit(true); });
  M.press(document.querySelector('.rt'), '.rcard, .quick button, .callout .ca button, .zoomctl button', 0.96);

  drawNetwork(); syncInputs(); render();
  snapTo('mid', 0, true); refit(true);
})();

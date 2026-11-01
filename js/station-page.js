/* station.html?station=<kebab>&line=<slug>  — Figma V5 141:12092 */
(function () {
  var q = new URLSearchParams(location.search);
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
  function kebab(s) { return String(s).toLowerCase().replace(/['’]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function pretty(s) { return s.split('-').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' '); }
  function back() { if (history.length > 1) history.back(); else location.href = 'index.html'; }

  /* map-frame (656x410) coordinates of stations that can be centred */
  var M = {
    'mile-end': [595.32, 159.08], 'bethnal-green': [549.4, 159.08], 'liverpool-street': [503.48, 204.99], 'bank': [457.56, 250.92],
    'stratford': [708.1, 5.0], 'oxford-circus': [227.9, 203.5], 'wood-lane': [-63.9, 161.1], 'euston': [330, 150]
  };
  var CX = 195, CY = 200;

  function chip(slug, st) { return { l: slug, st: st }; }
  function D(name, to, now, next, strip, flow, cause, trains) { return { n: name, to: to, now: now, next: next, strip: strip, flow: flow, cause: cause, trains: trains }; }
  var OK = ['good', 'Running normally'];
  var C_W = 'West Ruislip', C_E = 'Epping';

  var ST = {
    'mile-end': {
      name: 'Mile End', zone: 'Zone 2', focus: 'central', mk: ['now', 'minor'],
      nb: [['bethnal-green', 'now', 'minor'], ['liverpool-street', 'pred', 'severe'], ['bank', 'pred', 'severe']],
      chips: [chip('central', 'minor'), chip('district', 'good'), chip('hammersmith-city', 'good')],
      dirs: [
        D('Westbound', C_W, ['minor', 'Minor delay', '· 18 min gap'], ['severe', 'May turn Severe', '38%'],
          [['Bank', 'pred', 'severe'], ['Liverpool St', 'pred', 'severe'], ['Bethnal Green', 'now', 'minor'], ['Mile End', 'now', 'minor']], 'left', ['Signal failure', '· from TfL'], [3, 21]),
        D('Eastbound', C_E, OK, null, null, 'right', null, [2, 5])
      ]
    },
    'bethnal-green': {
      name: 'Bethnal Green', zone: 'Zone 2', focus: 'central', mk: ['now', 'minor'],
      nb: [['mile-end', 'now', 'minor'], ['liverpool-street', 'pred', 'severe'], ['bank', 'pred', 'severe']],
      chips: [chip('central', 'minor')],
      dirs: [
        D('Westbound', C_W, ['minor', 'Minor delay', '· 12 min gap'], ['severe', 'May turn Severe', '31%'],
          [['Bank', 'pred', 'severe'], ['Liverpool St', 'pred', 'severe'], ['Bethnal Green', 'now', 'minor']], 'left', ['Signal failure', '· from TfL'], [4, 19]),
        D('Eastbound', C_E, ['minor', 'Minor delay', '· 9 min gap'], null, null, 'right', ['Signal failure', '· from TfL'], [6, 14])
      ]
    },
    'liverpool-street': {
      name: 'Liverpool Street', zone: 'Zone 1', focus: 'central', mk: ['pred', 'severe'],
      nb: [['bethnal-green', 'now', 'minor'], ['mile-end', 'now', 'minor'], ['bank', 'pred', 'severe']],
      chips: [chip('central', 'severe'), chip('elizabeth', 'good'), chip('hammersmith-city', 'good'), chip('metropolitan', 'good'), chip('circle', 'good')],
      dirs: [
        D('Westbound', C_W, OK, ['severe', 'May turn Severe', '52%'],
          [['Bank', 'pred', 'severe'], ['Liverpool St', 'pred', 'severe']], 'left', null, [2, 7]),
        D('Eastbound', C_E, ['minor', 'Minor delay', '· 14 min gap'], null, null, 'right', ['Signal failure', '· from TfL'], [5, 17])
      ]
    },
    'bank': {
      name: 'Bank', zone: 'Zone 1', focus: 'central', mk: ['pred', 'severe'],
      nb: [['liverpool-street', 'pred', 'severe'], ['bethnal-green', 'now', 'minor'], ['mile-end', 'now', 'minor']],
      chips: [chip('central', 'severe'), chip('northern', 'good'), chip('waterloo-city', 'good')],
      dirs: [
        D('Westbound', C_W, OK, ['severe', 'May turn Severe', '44%'], [['Bank', 'pred', 'severe']], 'left', null, [1, 4]),
        D('Eastbound', C_E, ['minor', 'Minor delay', '· 16 min gap'], ['severe', 'May turn Severe', '38%'],
          [['Bank', 'pred', 'severe'], ['Liverpool St', 'pred', 'severe']], 'right', ['Signal failure', '· from TfL'], [6, 15])
      ]
    },
    'stratford': {
      name: 'Stratford', zone: 'Zone 2/3', focus: 'central', mk: ['now', 'good'],
      nb: [['mile-end', 'now', 'minor'], ['bethnal-green', 'now', 'minor']],
      chips: [chip('central', 'good'), chip('elizabeth', 'good'), chip('jubilee', 'good')],
      dirs: [D('Westbound', C_W, OK, null, null, 'left', null, [2, 6]), D('Eastbound', C_E, OK, null, null, 'right', null, [3, 8])]
    },
    'oxford-circus': {
      name: 'Oxford Circus', zone: 'Zone 1', focus: 'central', mk: ['now', 'good'], nb: [],
      chips: [chip('central', 'good'), chip('victoria', 'severe'), chip('bakerloo', 'good')],
      dirs: [D('Westbound', C_W, OK, null, null, 'left', null, [2, 5]), D('Eastbound', C_E, OK, null, null, 'right', null, [1, 4])]
    },
    'wood-lane': {
      name: 'Wood Lane', zone: 'Zone 2', focus: 'hammersmith-city', mk: ['now', 'good'], nb: [],
      chips: [chip('hammersmith-city', 'good')],
      dirs: [D('Westbound', 'Hammersmith', OK, null, null, 'left', null, [4, 12]), D('Eastbound', 'Barking', OK, null, null, 'right', null, [3, 11])]
    },
    'euston': {
      name: 'Euston', zone: 'Zone 1', focus: 'northern', mk: ['now', 'good'], nb: [],
      chips: [chip('northern', 'good'), chip('victoria', 'severe')],
      dirs: [D('Southbound', 'Morden', OK, null, null, 'left', null, [1, 4]), D('Northbound', 'High Barnet', OK, null, null, 'right', null, [2, 6])]
    }
  };

  var slug = kebab(q.get('station') || 'mile-end');
  var S = ST[slug], neutral = false;
  if (!S) {
    neutral = true;
    var lp = q.get('line');
    S = { name: pretty(slug), zone: '', focus: window.LINE_BY_SLUG[lp] ? lp : 'central', mk: ['now', 'good'], nb: [],
      chips: window.LINE_BY_SLUG[lp] ? [chip(lp, window.LINE_BY_SLUG[lp].status === 'normal' ? 'good' : 'minor')] : [], dirs: null };
  }
  var focus = S.focus; if (!window.NET.colors[focus]) focus = 'central';
  var lineParam = q.get('line');

  /* ---------- markers & icons ---------- */
  function icon(kind, st) {
    if (kind === 'pred') return '<span class="ic"><span class="pred ' + st + '" style="--s:.857"><i class="g"></i><i class="p"></i><i class="c"></i></span></span>';
    return '<span class="ic"><span class="gl ' + st + '"></span><span class="co ' + st + '"></span></span>';
  }
  var COL = { minor: 'var(--minor)', severe: 'var(--severe)', good: 'var(--good)' };

  /* ---------- underlay ---------- */
  var me = M[slug] || M['mile-end'];
  var pan = [CX - me[0], CY - me[1]];
  NetMap.render($('maphost'), { focus: focus, pan: pan });
  function mapMarker(dx, dy, kind, st) {
    var x = CX + dx, y = CY + dy;
    if (kind === 'pred') return '<span class="pred ' + st + '" style="--s:1;left:' + (x - 32) + 'px;top:' + (y - 32) + 'px"><i class="g"></i><i class="p"></i><i class="c"></i></span>';
    return '<span class="nowglow ' + st + '" style="left:' + (x - 22) + 'px;top:' + (y - 22) + 'px;width:44px;height:44px"></span>' +
      '<span class="ring" style="--c:' + COL[st] + ';left:' + (x - 8) + 'px;top:' + (y - 8) + 'px;width:16px;height:16px"></span>';
  }
  var mh = '';
  S.nb.forEach(function (n) { var m = M[n[0]]; if (m) mh += mapMarker(m[0] - me[0], m[1] - me[1], n[1], n[2]); });
  mh += mapMarker(0, 0, S.mk[0], S.mk[1]);
  $('mks').innerHTML = mh;
  $('sel').innerHTML = '<span class="selring" style="left:' + (CX - 15) + 'px;top:' + (CY - 15) + 'px"></span>' +
    '<span class="sellbl" style="left:' + CX + 'px;top:' + (CY - 54) + 'px">' + esc(S.name) + '</span>';

  /* ---------- sheet content ---------- */
  function glowGrad(slugL) {
    if (slugL === 'central') return 'linear-gradient(90deg,rgba(225,37,27,0),#ff5e52 50%,rgba(225,37,27,0))';
    var c = window.NET.colors[slugL] || '#ffffff';
    return 'linear-gradient(90deg,transparent,' + c + ' 50%,transparent)';
  }
  function strip(d) {
    var n = d.strip.length, h = '';
    var col = window.NET.colors[focus];
    h += '<div class="strip"><i class="lc" style="background:' + col + '"></i>' +
      '<span class="glow ' + (d.flow === 'left' ? 'toleft' : 'toright') + '"><i style="background:' + glowGrad(focus) + '"></i></span>';
    d.strip.forEach(function (s, i) {
      var cx = 285.8 - (n - 1 - i) * 74.69, sel = i === n - 1;
      h += '<span class="sc" style="left:' + (cx - 9) + 'px">' + icon(s[1], s[2]) + (sel ? '<i class="sel"></i>' : '') + '</span>' +
        '<span class="nm' + ((s[1] === 'now' && s[2] !== 'good') || sel ? ' on' : '') + (sel ? ' sel' : '') + '" style="left:' + cx + 'px">' + esc(s[0]) + '</span>';
    });
    return h + '</div>';
  }
  function row(k, inner) { return '<div class="row"><span class="k">' + k + '</span>' + inner + '</div>'; }
  function dirCard(d) {
    var h = '<div class="dirc"><div class="dh"><b>' + d.n + '</b><i>' + 'to ' + esc(d.to) + '</i></div>';
    h += row('Now', icon('now', d.now[0]) + '<span class="v">' + d.now[1] + '</span>' + (d.now[2] ? '<span class="s">' + d.now[2] + '</span>' : ''));
    if (d.next) h += row('Next 30 min', icon('pred', d.next[0]) + '<span class="v">' + d.next[1] + '</span><span class="s">' + d.next[2] + '</span>');
    if (d.strip) h += strip(d);
    if (d.cause) h += row('Cause', '<span class="v">' + d.cause[0] + '</span><span class="s">' + d.cause[1] + '</span>');
    if (d.trains) h += row('Next trains', '<span class="v sb">' + d.trains[0] + ' min</span><span class="dotsep">·</span><span class="v sb">' + d.trains[1] + ' min</span>');
    return h + '</div>';
  }
  var L = window.LINE_BY_SLUG;
  $('hdr').innerHTML = '<div class="hd"><h1>' + esc(S.name) + '</h1><p>' + (S.zone ? S.zone + ' · ' : '') + 'updated 1 min ago</p>' +
    '<button class="x" id="close" aria-label="Close">×</button></div>';
  var html = '<div class="chips">' + S.chips.map(function (c) {
    var l = L[c.l]; if (!l) return '';
    var short = c.l === 'hammersmith-city' ? 'H&C' : c.l === 'waterloo-city' ? 'W&C' : l.name.replace(/ line$/, '');
    return '<a class="chip' + (c.l === focus ? ' cur' : '') + '" href="line.html?line=' + c.l + '"><i class="b" style="background:' + l.color + '"></i><span>' + esc(short) + '</span><i class="d" style="background:' + COL[c.st] + '"></i></a>';
  }).join('') + '</div>';
  if (neutral) {
    html += '<div class="dirc"><div class="dh"><b>Both directions</b></div>' +
      row('Now', icon('now', 'good') + '<span class="v">Running normally</span>') +
      '<div class="none-note">No delays reported at this station.</div></div>';
  } else html += S.dirs.map(dirCard).join('');
  html += '<div class="acts"><a class="from" href="map.html?pick=1&from=' + slug + '">From here</a><a class="to" href="map.html?pick=1&to=' + slug + '">To here</a></div>';
  $('body').innerHTML = html;
  $('addr').textContent = 'tubecast.london/station/' + slug;
  document.title = 'Tubecast — ' + S.name;

  /* ---------- navigation ---------- */
  $('close').addEventListener('click', back);
  $('back').addEventListener('click', back);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') back(); });

  /* ---------- interactive map behind the sheet ---------- */
  var Mo = window.Motion, phone = $('phone'), view = $('mapview'), world = $('world'), sheet = $('sheet');
  function Hh() { return window.Shell ? Shell.height : 844; }
  function sbH() { return parseFloat(getComputedStyle(phone).getPropertyValue('--sb')) || 0; }
  function snaps() {
    var h = Hh() - sbH(), top = phone.classList.contains('st') && document.documentElement.classList.contains('mode-phone') ? 36 : 100;
    return { full: top, half: Math.round(h * 0.33), peek: h - 148 };
  }
  var snapName = 'half', sy = 250, ssp = null, userMoved = false;
  function targetY(sTop) { return Mo.clamp(sTop - 50, 150, 300); }
  var mg = MapGest({
    view: view, world: world, phone: phone, minZ: 0.6, maxZ: 4, margin: 110,
    bounds: function () { return { x0: pan[0], y0: pan[1], x1: pan[0] + 656, y1: pan[1] + 410 }; },
    viewSize: function () { return { w: 390, h: Hh() }; },
    onDragStart: function () { userMoved = true; }
  });
  function recenter(instant) { mg.set(0, targetY(sy) - CY, 1, instant); }
  function setSheet(y) { sy = y; sheet.style.top = y + 'px'; }
  function snapTo(name, v, instant) {
    var sn = snaps(); snapName = name; if (ssp) ssp.stop();
    function done() { if (!userMoved && name !== 'full') recenter(false); }
    if (instant || Mo.reduced) { setSheet(sn[name]); if (instant) { if (!userMoved) recenter(true); } else done(); }
    else ssp = Mo.spring({ from: sy, to: sn[name], velocity: v || 0, response: 0.4, damping: Math.abs(v || 0) > 500 ? 0.86 : 1, onUpdate: setSheet, onDone: done });
  }
  (function () {
    var base = 0, kk = 1;
    Mo.drag($('grab'), {
      axis: 'y', threshold: 5,
      onDown: function () { if (ssp) ssp.stop(); base = sy; kk = phone.getBoundingClientRect().width / 390 || 1; },
      onStart: function () { sheet.classList.add('dragging'); },
      onMove: function (d) {
        var sn = snaps(), y = base + d.dy / kk;
        if (y < sn.full) y = sn.full + Mo.rubberband(y - sn.full, 300); else if (y > sn.peek) y = sn.peek + Mo.rubberband(y - sn.peek, 300);
        setSheet(y);
      },
      onEnd: function (d) {
        sheet.classList.remove('dragging');
        var sn = snaps(), v = d.vy / kk, names = ['full', 'half', 'peek'], cur = names.indexOf(snapName), target, best = 1e9;
        if (Math.abs(d.dy) < 6 && Math.abs(v) < 80) target = snapName;
        else if (Math.abs(v) > 700) target = names[Mo.clamp(cur + (v > 0 ? 1 : -1), 0, 2)];
        else { var proj = sy + Mo.project(v, 0.99); names.forEach(function (n) { var e = Math.abs(sn[n] - proj); if (e < best) { best = e; target = n; } }); }
        snapTo(target, v);
      },
      onTap: function () { snapTo(snapName === 'peek' ? 'half' : snapName === 'half' ? 'full' : 'half'); },
      filter: function (e) { return !e.target.closest('button,a'); }
    });
    $('grab').setAttribute('role', 'button'); $('grab').setAttribute('aria-label', 'Resize station sheet');
  })();

  /* neighbouring stations on the map are links: explore without going back */
  var hh = '';
  S.nb.forEach(function (n) {
    var m = M[n[0]]; if (!m) return;
    var nm = ST[n[0]] ? ST[n[0]].name : pretty(n[0]);
    hh += '<a class="nbhit" data-nodbl href="station.html?station=' + n[0] + '&line=' + focus + '" aria-label="' + esc(nm) + '" style="left:' + (CX + m[0] - me[0]) + 'px;top:' + (CY + m[1] - me[1]) + 'px"><span class="nl">' + esc(nm) + '</span></a>';
  });
  $('hit').innerHTML = hh;
  window.addEventListener('shellfit', function () { snapTo(snapName, 0, true); });
  Mo.press(phone, '.chip, .acts a, .nbhit', 0.96);
  snapTo('half', 0, true);
})();

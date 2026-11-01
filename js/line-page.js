/* line.html — swipe pager across all 12 lines. Each page is built by Page(slug); only current ±1 are rendered. */
(function () {
  var ORDER = ['district','circle','hammersmith-city','metropolitan','piccadilly','jubilee','northern','victoria','central','bakerloo','waterloo-city','elizabeth'];
  var q = new URLSearchParams(location.search);
  var HOME = !!window.PAGER_HOME, ALL = ['all'].concat(ORDER);   /* page 0 = overview, then the 12 lines */
  var slug0 = q.get('line');
  if (slug0 === 'all' || (HOME && !slug0)) slug0 = 'all'; else if (ORDER.indexOf(slug0) < 0) slug0 = 'central';
  var state0 = q.get('state'); if (state0 !== 'loading' && state0 !== 'stale' && state0 !== 'error') state0 = null;

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
  function kebab(s) { return s.toLowerCase().replace(/['’]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  var AM = 'rgba(255,161,43,.95)', RD = 'rgba(219,36,31,.95)';

  function bar(b, recover) {
    // Keep recovery at the same final 10 minutes, regardless of a station's onset time.
    function tail(colour, start) {
      var edge=(140-start)/(170-start)*100;
      return recover ? colour+' '+edge.toFixed(2)+'%,rgba(31,166,166,.65) 100%' : colour;
    }
    if (b.t === 'now') {
      var g = b.end === 'red' ? 'linear-gradient(90deg,' + AM + ',' + RD + ' 50%,'+tail('rgba(219,36,31,.25)',0)+')' : 'linear-gradient(90deg,' + AM + ',' + AM + ' 50%,'+tail('rgba(255,161,43,.25)',0)+')';
      return '<div class="tbar"><i class="trk" style="width:170px"></i><i class="grad" style="left:1px;width:170px;background:' + g + '"></i><i class="dot"></i></div>';
    }
    if (b.t === 'on') {
      var g2 = b.sev === 'red' ? 'linear-gradient(90deg,' + AM + ',' + RD + ' 40%,'+tail('rgba(219,36,31,.25)',b.at)+')' : 'linear-gradient(90deg,' + AM + ',' + AM + ' 25%,'+tail('rgba(255,161,43,.25)',b.at)+')';
      return '<div class="tbar"><i class="trk" style="width:170px"></i><i class="ons" style="left:' + b.at + 'px"></i><i class="grad" style="left:' + b.at + 'px;width:' + (170 - b.at) + 'px;background:' + g2 + '"></i></div>';
    }
    if (b.t === 'low') return '<div class="tbar lowb"><i class="trk" style="width:133px;background:rgba(255,255,255,.22)"></i><span class="lbl">Low</span></div>';
    return '<div class="tbar"><i class="nrl" style="width:84px"></i><span class="lbl">Not running</span></div>';
  }
  function mkr(k, slug) {
    if (k === 'nm') return '<span class="nowglow minor"></span><span class="nowdot minor"></span>';
    if (k === 'ns') return '<span class="nowglow severe"></span><span class="nowdot severe"></span>';
    if (k === 'pm' || k === 'ps') return '<span class="pred ' + (k === 'pm' ? 'minor' : 'severe') + '" style="--s:.857"><i class="g"></i><i class="p"></i><i class="c"></i></span>';
    if (k === 'ng') return '<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><defs><radialGradient id="rg-' + slug + '" cx=".5" cy=".5" r=".5"><stop stop-color="#1FA6A6" stop-opacity=".5"/><stop offset="1" stop-color="#1FA6A6" stop-opacity="0"/></radialGradient></defs><circle cx="14" cy="14" r="14" fill="url(#rg-' + slug + ')"/><circle cx="14" cy="14" r="6" fill="#1FA6A6"/></svg>';
    return '<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><defs><radialGradient id="rh-' + slug + '" cx=".5" cy=".5" r=".5"><stop stop-color="#1FA6A6" stop-opacity=".25"/><stop offset="1" stop-color="#1FA6A6" stop-opacity="0"/></radialGradient></defs><circle cx="14" cy="14" r="14" fill="url(#rh-' + slug + ')"/><circle cx="14" cy="14" r="5" stroke="#1FA6A6" stroke-width="2" stroke-dasharray="2.5 2"/></svg>';
  }
  function stHead() { return '<div class="hd"><span class="k">STATIONS</span><span class="a" style="left:156px">Now</span><span class="a" style="left:234px">30</span><span class="a" style="right:0">60 min</span></div>'; }

  /* ---------- one page ---------- */
  function Page(slug, host, state) {
    var meta = window.LINE_BY_SLUG[slug], D = window.LINE_DATA[slug], timer = null, P = {};
    var tone = D.kind === 'closure' ? 'severe' : (D.kind === 'none' ? 'calm' : (JSON.stringify(D.rows).indexOf('red') > -1 ? 'severe' : 'delayed'));
    host.innerHTML = '<div class="scroll"><div class="content"><div class="bg"><div class="ul"><div class="maphost"></div><div class="markers"></div></div>' +
      '<div class="ambient" data-tone="' + tone + '"><i></i><i></i><i></i></div><div class="fade"></div></div><div class="view"></div></div></div>';
    var scroll = host.firstChild, content = scroll.firstChild, view = content.lastChild, maphost = content.querySelector('.maphost'), markers = content.querySelector('.markers');
    P.scroll = scroll; P.hdr = HeaderCollapse.attach(host, scroll);
    function plain(h) { return String(h == null ? '' : h).replace(/<[^>]*>/g, ''); }

    function forecast(top) {
      return '<div class="card fc enter" style="top:' + top + 'px;--i:1"><div class="t">' + esc(D.fc.title) + '</div><div class="s">' + esc(D.fc.sub) + '</div><div class="hr"></div><div class="cols">' +
        D.fc.cols.map(function (c, i) { return '<div class="col' + (i === 0 ? ' now' : '') + (c[3] ? ' dim' : '') + '"><span class="l">' + c[0] + '</span><span class="mkr">' + mkr(c[2], slug) + '</span><span class="n"><b>' + c[1] + '</b>stns</span></div>'; }).join('') + '</div></div>';
    }
    function closureH() { return D.fc.lines.length > 1 ? 157 : 110; }
    function closureCard(top) {
      return '<div class="card fc cl enter" style="top:' + top + 'px;height:' + closureH() + 'px;--i:1"><div class="t">' + esc(D.fc.title) + '</div><div class="hr"></div>' +
        D.fc.lines.map(function (l, i) { return '<div class="ln" style="top:' + (i ? 105 : 58) + 'px"><i class="' + (l.run ? 'r' : 'x') + '"></i><span class="k">' + esc(l.k) + '</span><span class="v">' + esc(l.v) + '</span></div>'; }).join('') + '</div>';
    }
    function stations(top) {
      var h, body;
      if (D.kind === 'none') { h = 82.5; body = '<div class="allok"><i></i><span>' + (D.count === 2 ? 'Both' : 'All') + ' ' + D.count + ' stations running normally</span></div>'; }
      else {
        h = 35 + D.rows.length * 58.5 + 5;
        body = D.rows.map(function (r) {
          var off = r.b.t === 'off';
          return '<a class="srow' + (off ? ' off' : '') + '" ' + (off ? 'aria-disabled="true"' : 'href="map.html?station=' + kebab(r.n) + '&line=' + slug + '"') + '><span class="stn"><b>' + esc(r.n) + '</b><i>' + esc(r.d) + '</i></span>' + bar(r.b, D.fc.cols && D.fc.cols.some(function(c){return c[0]==='60 min' && c[1]===0 && c[2]==='pg';})) + '</a>';
        }).join('');
      }
      return { h: h, html: '<div class="card sc enter" style="top:' + top + 'px;height:' + h + 'px;--i:2">' + stHead() + body + '</div>' };
    }
    function skStations(top) {
      var rows = [[110, 70], [102, 70], [94, 70], [86, 70]], h = 35 + 4 * 58.5 + 5;
      return { h: h, html: '<div class="card sc" style="top:' + top + 'px;height:' + h + 'px">' + stHead() + rows.map(function (r) { return '<div class="skrow"><div class="l"><span class="sk" style="width:' + r[0] + 'px;height:14px"></span><span class="sk" style="width:' + r[1] + 'px;height:10px"></span></div><span class="sk r"></span></div>'; }).join('') + '</div>' };
    }
    function title() { var nm = /line$/i.test(meta.name) ? meta.name : meta.name + ' line'; return '<div class="title"' + (nm.length > 17 ? ' style="font-size:27px;white-space:nowrap"' : '') + '><span class="bar" style="background:' + meta.color + '"></span>' + esc(nm) + '</div>'; }
    function hero(top) {
      var st = 'top:' + top + 'px';
      if (state === 'loading') return '<div class="hero" style="' + st + '">' + title() + '<div class="value" style="height:115px"><span class="sk skbox" style="margin:22px auto 0"></span></div><div class="sub">Checking live trains…</div></div>';
      if (D.kind === 'closure') return '<div class="hero pic enter" style="' + st + '">' + title() + '<svg width="96" height="115" viewBox="0 0 96 115" fill="none"><circle cx="48" cy="58" r="34" stroke="#5B6470" stroke-width="4" stroke-dasharray="7 5"/><path d="M26 82L70 36" stroke="#5B6470" stroke-width="4" stroke-linecap="round"/></svg><div class="sub">' + esc(D.hero.sub) + '</div></div>';
      return '<div class="hero enter" style="' + st + '">' + title() + '<div class="value">' + D.hero.value + '</div><div class="sub">' + D.hero.sub + '</div>' + (D.hero.chip ? '<div class="chip one"><i style="background:var(--good)"></i><b style="font-weight:510">' + D.hero.chip + '</b></div>' : '') + '</div>';
    }
    function banner() {
      if (state === 'stale') return '<div class="banner st" data-act="refresh" role="button" tabindex="0" aria-label="Refresh"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.25" stroke="#fff" stroke-width="1.5"/><path d="M10 5.2V10l3.2 2" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><div class="tx"><b>Last update 6 min ago</b><span>Live data is delayed · tap to refresh</span></div></div>';
      if (state === 'error') return '<div class="banner er"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7.2a11.5 11.5 0 0 1 4-2.4M18 7.2a11.5 11.5 0 0 0-8-3.2M5 10.4a7 7 0 0 1 2.6-1.6M15 10.4a7 7 0 0 0-3.4-1.8M8 13.5a3 3 0 0 1 4 0"/><circle cx="10" cy="16" r=".6" fill="#fff"/><path d="M3 2.5L17 17.5"/></svg><div class="tx"><b>Can’t reach TfL</b><span>Showing last known status from 08:46</span></div><button class="retry" data-act="refresh">Retry</button></div>';
      return '';
    }
    function underlay() {
      NetMap.cached(maphost,{focus:slug,pan:D.pan},slug==='piccadilly'?closedSection:null);
      var html = '';
      FlowData.forLine(slug).forEach(function(d) {
        ['now','next'].forEach(function(kind) { d[kind].forEach(function(name) {
          var st=StationCatalog[name]; if(!st)return;
          var x=st.x+D.pan[0], y=st.y+D.pan[1];
          var sev=kind==='now'?d.sev:d.nextSev;
          if(kind==='now') html+='<span class="nowglow '+sev+'" style="left:'+(x-20)+'px;top:'+(y-20)+'px;width:40px;height:40px"></span><span class="casing" style="left:'+(x-8)+'px;top:'+(y-8)+'px;width:16px;height:16px"></span><span class="nowdot '+sev+'" style="left:'+(x-5)+'px;top:'+(y-5)+'px;width:10px;height:10px"></span>';
          else html+='<span class="pred '+sev+'" style="--s:.85;left:'+(x-27.2)+'px;top:'+(y-27.2)+'px"><i class="g"></i><i class="p"></i><i class="c"></i></span>';
        }); });
      });
      markers.innerHTML = state === 'loading' ? '' : html;

    }
    function closedSection() {
      var svg = maphost.querySelector('svg'), NS = 'http://www.w3.org/2000/svg', y = 320 - D.pan[1];
      var gs = svg.querySelectorAll('g[stroke="#2C55C8"], g[stroke="#2c55c8"]'), defs = svg.querySelector('defs');
      function clip(id, y0, y1) { var c = document.createElementNS(NS, 'clipPath'); c.setAttribute('id', id); var r = document.createElementNS(NS, 'rect'); r.setAttribute('x', -2000); r.setAttribute('width', 5000); r.setAttribute('y', y0); r.setAttribute('height', y1 - y0); c.appendChild(r); defs.appendChild(c); }
      clip('pcS', y, 3000); clip('pcN', -3000, y);
      var south = document.createElementNS(NS, 'g'); south.setAttribute('clip-path', 'url(#pcS)');
      var north = document.createElementNS(NS, 'g'); north.setAttribute('clip-path', 'url(#pcN)');
      var lineG = gs[gs.length - 1], parent = lineG.parentNode, ref = lineG.nextSibling, dash = lineG.cloneNode(true);
      dash.setAttribute('stroke', '#5B6470'); dash.setAttribute('stroke-width', 2.4); dash.setAttribute('stroke-dasharray', '5 4'); dash.setAttribute('stroke-linecap', 'butt');
      north.appendChild(dash); gs.forEach(function (g) { south.appendChild(g); });
      parent.insertBefore(south, ref); parent.insertBefore(north, ref);
    }
    function draw() {
      var ph = document.getElementById('phone');
      if (P.active) { ph.classList.remove('loading-state', 'stale-state', 'error-state'); if (state) ph.classList.add(state + '-state'); }
      host.className = 'pager-page' + (state ? ' ' + state + '-state' : '') + (P.active ? ' active' : '');
      var heroTop = state === 'stale' ? 126 : state === 'error' ? 142 : 72;
      var fcH = D.kind === 'closure' ? closureH() : 182;
      var stTop = state ? 518 : (D.stTop && D.kind !== 'closure' ? D.stTop : 324 + fcH + 12);
      if (!state && D.kind === 'closure') stTop = 324 + fcH + 12;
      var out = hero(heroTop), st, fcHtml;
      if (state === 'loading') {
        fcHtml = '<div class="card fc sk" style="top:324px"><span class="sk b1"></span><span class="sk b2"></span><div class="cols">' + [0,1,2,3,4].map(function () { return '<div class="col"><span class="sk a"></span><span class="sk c"></span><span class="sk d"></span></div>'; }).join('') + '</div></div>';
        st = skStations(stTop);
      } else { fcHtml = D.kind === 'closure' ? closureCard(324) : forecast(324); st = stations(stTop); }
      var ft = stTop + st.h + 20;
      var u = state === 'loading' ? 'Updating…' : state === 'stale' ? 'Updated 6 min ago · may be out of date' : state === 'error' ? 'Last known · 08:46' : 'Demo snapshot · illustrative values';
      view.innerHTML = out + fcHtml + st.html + banner() + '<div class="footer enter" style="left:0;width:390px;top:' + ft + 'px;--i:3"><div class="u">' + u + '</div><a class="h" href="about.html">About the data</a></div>';
      content.style.minHeight = 'var(--H,844px)'; content.style.height = Math.max(ft + 190, 844) + 'px';
      underlay();
      var nm = /line$/i.test(meta.name) ? meta.name : meta.name + ' line';
      if (state === 'loading') P.hdr.set(nm, null, 'Checking live trains…', meta.color);
      else P.hdr.set(nm, D.kind === 'closure' ? null : plain(D.hero.value), D.kind === 'closure' ? (D.fc.lines.length>1?'Part closure':'Not running') : plain(D.hero.sub), meta.color);
    }
    P.refresh = function () {
      state = null;
      if (P.active) { var p=new URLSearchParams(location.search); p.delete('state'); history.replaceState(null,'',location.pathname+'?'+p.toString()); }
      draw(); scroll.scrollTop=0; P.hdr.update();
    };
    P.setActive = function (a) { P.active = a; host.classList.toggle('active',a); host.setAttribute('aria-hidden',String(!a)); host.inert=!a; if (a) { var ph = document.getElementById('phone'); ph.classList.remove('loading-state', 'stale-state', 'error-state'); if (state) ph.classList.add(state + '-state'); } };
    P.destroy = function () { clearTimeout(timer); P.hdr.destroy(); };
    draw();
    if (state === 'loading') timer = setTimeout(P.refresh, 2500);
    return P;
  }

  /* ---------- pager ---------- */
  var phone = $('phone'), root = $('pager'), track = $('track'), pages = [], states = {}, idx = ALL.indexOf(slug0);
  states[slug0] = state0;
  function nameOf(s) { return s === 'all' ? 'All lines' : window.LINE_BY_SLUG[s].name; }
  ALL.forEach(function (s, i) { var d = document.createElement('div'); d.className = 'pager-page'; d.setAttribute('data-slug', s); d.setAttribute('role', 'group'); d.setAttribute('aria-label', s === 'all' ? 'All lines overview' : nameOf(s) + ' line'); track.appendChild(d); pages.push({ slug: s, el: d, page: null }); });
  function ensure(i) {
    if (i < 0 || i >= pages.length || pages[i].page) return;
    var pg = pages[i];
    pg.page = pg.slug === 'all' ? Overview.mount(pg.el, { onPick: function (sl) { jump(ALL.indexOf(sl)); } }) : Page(pg.slug, pg.el, states[pg.slug] || null);
    if (pg.savedScroll) { pg.page.scroll.scrollTop=pg.savedScroll; }
    pg.el.classList.toggle('active', i === idx); pg.el.setAttribute('aria-hidden', String(i !== idx)); pg.el.inert = i !== idx;
    if (pg.slug === 'all') { pg.page.hdr = HeaderCollapse.attach(pg.el, pg.page.scroll); pg.page.hdr.set(Overview.data.title, Overview.data.num, Overview.data.sub, null); }
  }
  function prune(i) { pages.forEach(function(p,k){ if(p.page && Math.abs(k-i)>1){ p.savedScroll=p.page.scroll.scrollTop; if(p.page.destroy)p.page.destroy(); if(p.slug==='all')p.page.hdr.destroy(); p.el.innerHTML=''; p.page=null; } }); }
  /* long hops (ring wedge / list card) crossfade instead of dragging past blank pages; neighbours animate as a normal pager move */
  var jumpFade=null;
  function jump(i) {
    if (i === pager.index || i < 0) return;
    if (Math.abs(i - pager.index) <= 1 || Motion.reduced) { pager.go(i); return; }
    if(jumpFade)jumpFade.cancel();
    pager.go(i,0,true);
    if(!Motion.reduced)jumpFade=track.animate([{opacity:.65},{opacity:1}],{duration:120,easing:'ease-out'});
  }
  function S() { return (window.Shell && Shell.scale) || 1; }

  /* dots */
  var pp = $('pagepos');
  pp.innerHTML = ALL.map(function (s, i) { return '<button class="pd" data-i="' + i + '" aria-label="' + esc(nameOf(s)) + '"><i></i></button>'; }).join('');
  pp.addEventListener('click', function (e) { var b = e.target.closest('.pd'); if (b && !barDragged) jump(+b.dataset.i); });

  function chrome(i, first) {
    var s = ALL[i], m = s === 'all' ? { name: 'All lines', color: '#fff' } : window.LINE_BY_SLUG[s];
    [].forEach.call(pp.children, function (b, k) { b.classList.toggle('cur', k === i); b.style.setProperty('--c', ALL[k] === 'all' ? '#fff' : window.LINE_BY_SLUG[ALL[k]].color); if (k === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    var firstDot=Math.max(0,Math.min(ALL.length-7,i-3));
    [].forEach.call(pp.children,function(b,k){b.hidden=k<firstDot||k>=firstDot+7;b.classList.toggle('edge',(k===firstDot&&firstDot>0)||(k===firstDot+6&&k<ALL.length-1));});
    $('addr').textContent = s === 'all' ? 'tubecast.london' : 'tubecast.london/line/' + s;
    $('btnmap').setAttribute('data-href', s === 'all' ? 'map.html' : 'map.html?line=' + s);
    $('caption').innerHTML = (s === 'all' ? 'All lines' : 'Line stack · ' + esc(m.name)) + ' · swipe or ← → to move between pages (' + (i + 1) + '/' + ALL.length + ') — <a href="components.html">component sheet &rarr;</a>';
    document.title = 'Tubecast — ' + m.name;
    if (!first) { var p = new URLSearchParams(location.search); if (s === 'all' && HOME) p.delete('line'); else p.set('line', s); p.delete('state'); var qs = p.toString(); history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); }
    $('live').textContent = s === 'all' ? 'All lines overview, 1 of ' + ALL.length : m.name + ' line, ' + (i + 1) + ' of ' + ALL.length;
  }
  var pager = Motion.pager({
    root: root, filter:function(e){var r=root.getBoundingClientRect();return e.clientX>r.left+24 && e.clientX<r.right-24 && !e.target.closest('input,button,a');}, track: { style: {}, parentNode: root }, count: ALL.length, index: idx,
    width: function () { return 390 * S(); },
    onProgress: function (x) { track.style.transform = 'translate3d(' + (x / S()) + 'px,0,0)'; },
    onPrepare:function(i){clearTimeout(neighbourTask);ensure(i-1);ensure(i+1);},
    onSettle:function(i){prepareNeighbours(i);},
    onIndex: function (i) {
      idx=i;clearTimeout(neighbourTask);ensure(i);
      pages.forEach(function(p,k){if(p.page)p.page.setActive(k===i);});
      chrome(i);
    }
  });
  var barDragged=false,barStart=0,barDX=0;
  Motion.drag(pp,{axis:'x',threshold:4,onDown:function(){barDragged=false;barStart=pager.index;barDX=0;},onStart:function(){barDragged=true;pp.classList.add('scrubbing');},onMove:function(d){barDX=d.dx;var target=Motion.clamp(barStart+Math.round(d.dx/(24*S())),0,ALL.length-1);if(target!==pager.index)jump(target);},onEnd:function(d){pp.classList.remove('scrubbing');if(d.e.type==='pointercancel')jump(barStart);setTimeout(function(){barDragged=false;},0);},onCancel:function(){pp.classList.remove('scrubbing');}});
  pp.style.touchAction='none';pp.setAttribute('aria-label','Slide to select a line, or tap a dot');
  function showDirectory(){jump(0);requestAnimationFrame(function(){var page=pages[0].page;page.scroll.scrollTop=pages[0].el.querySelector('.watch').offsetTop-70;});}
  if(location.hash==='#all-lines')showDirectory();
  var neighbourTask=0;
  function prepareNeighbours(i){
    clearTimeout(neighbourTask);
    neighbourTask=setTimeout(function(){if(idx!==i)return;prune(i);ensure(i-1);ensure(i+1);},0);
  }
  ensure(idx);pages[idx].page.setActive(true);chrome(idx,true);
  requestAnimationFrame(function(){prepareNeighbours(idx);});
  window.addEventListener('shellfit', function () { pager.relayout(); });
  var warmedMap=false;
  function warmMap(){
    if(warmedMap||document.hidden)return;
    var connection=navigator.connection;if(connection&&(connection.saveData||/2g/.test(connection.effectiveType)))return;
    warmedMap=true;
    var urls=[$('btnmap').getAttribute('data-href'),'css/search.css?v=20261101-ux5','css/map.css?v=20261101-ux5','css/flow.css?v=20261101-ux5','js/search.js?v=20261101-ux5','js/map-page.js?v=20261101-ux5','assets/network-samples.js?v=20261101-ux5','js/flow-geo.js?v=20261101-ux5','js/flow-sheet.js?v=20261101-ux5','js/flow-map.js?v=20261101-ux5'];
    urls.forEach(function(url){fetch(url,{cache:'force-cache',credentials:'same-origin',priority:'low'}).catch(function(){});});
  }
  $('btnmap').addEventListener('pointerenter',warmMap,{once:true});
  if(window.requestIdleCallback)requestIdleCallback(warmMap,{timeout:2000});else setTimeout(warmMap,800);


  document.addEventListener('keydown', function (e) {
    if (e.target.closest && e.target.closest('input,textarea')) return;
    if (e.key === 'ArrowLeft') pager.go(pager.index - 1); else if (e.key === 'ArrowRight') pager.go(pager.index + 1);
    else if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute && e.target.getAttribute('data-act')) { e.preventDefault(); e.target.click(); }
  });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-href]');
    if (t) {
      var h = t.getAttribute('data-href');if(h==='index.html#all-lines'){showDirectory();return;}var m = /^line\.html\?line=([a-z-]+)$/.exec(h);
      if (m && ALL.indexOf(m[1]) > 0) { jump(ALL.indexOf(m[1])); return; }   /* stay in the pager: animated, no page load */
      location.href = h; return;
    }
    if (e.target.closest('[data-back]')) { if (history.length > 1 && document.referrer) history.back(); else if (pager.index > 0) jump(0); return; }
    var a = e.target.closest('[data-act="refresh"]'); if (a) { var pg = pages[pager.index].page; if (pg && pg.refresh) pg.refresh(); return; }
    var off = e.target.closest('.srow.off'); if (off) e.preventDefault();
  });
})();

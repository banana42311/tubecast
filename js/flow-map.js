/* Unified map hub: station → route preview → selected journey.
   Filled station points = now; three-part rings + flowing light = forecast.
   Lists navigate to index.html#all-lines. The browser history restores sheet/option state. */
(function () {
  var C = window.MapCtx; if (!C) return;
  var M = window.Motion, FD = window.FlowData, NS = 'http://www.w3.org/2000/svg';
  var phone = document.querySelector('.phone'), svg = C.svg, world = C.world, view = C.view, cam = C.cam, N = C.N, S = C.S;
  var G = window.FlowGeo.build({ N: N, S: S, slugs: C.slugs, linePaths: C.linePaths, lineOff: C.lineOff });
  if(window.TFLMap)G.stations.forEach(function(st){var c=StationCatalog[st.name];st.x=c.x*S;st.y=c.y*S;st.lines=c.lines.slice();});
  var kebab = G.kebab, LBS = window.LINE_BY_SLUG;
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function $(sel, r) { return (r || document).querySelector(sel); }
  function el(t, a, p) { return C.el(t, a, p); }
  function lineName(sl) { if(sl==='walking')return 'Walk';return (LBS[sl] && LBS[sl].name || sl).replace(/ line$/, ''); }
  function lineCol(sl) { return (LBS[sl] && LBS[sl].color) || '#7c8794'; }
  if(!window.TFLMap && !window.SCHEMATIC_MAP)G.stations.forEach(function(st){
    var cat=StationCatalog[st.name];if(!cat||!st.lines.length)return;
    var x=cat.x*S,y=cat.y*S,best=null,dist=Infinity;
    st.lines.forEach(function(line){var id=st.nodes[line],n=G.nodes[id];[-1,1].forEach(function(step){var b=G.nodes[id+step];if(!b||b.l!==line||Math.hypot(n.x-b.x,n.y-b.y)>14)return;var dx=b.x-n.x,dy=b.y-n.y,t=Math.max(0,Math.min(1,((x-n.x)*dx+(y-n.y)*dy)/(dx*dx+dy*dy||1)));var q={x:n.x+t*dx,y:n.y+t*dy},d=Math.hypot(q.x-x,q.y-y);if(d<dist){best=q;dist=d;}});});
    if(best){st.x=best.x;st.y=best.y;}
    world.querySelectorAll('.hit[data-st]').forEach(function(hit){if(hit.dataset.st===st.name){hit.style.left=(st.x-16)+'px';hit.style.top=(st.y-16)+'px';}});
  });
  var CENTRE = G.byName['Charing Cross'] || G.byName['Oxford Circus'] || { x: 700, y: 450 };
  var SEVCOL = { minor: 'var(--minor)', severe: 'var(--severe)' };

  /* ---------------------------------------------------------------- layers */
  var gDz = el('g', { 'class': 'dz' }, C.ov), gRt = el('g', { 'class': 'rt' }, C.ov);

  function dOf(pts) { return 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L'); }
  function wdiv(cls, x, y, html, tag) {
    var d = document.createElement(tag || 'div'); d.className = cls; d.style.left = x + 'px'; d.style.top = y + 'px'; if (html) d.innerHTML = html; world.appendChild(d); return d;
  }

  /* Every marker uses its station's anchor on the affected line. No screen-coordinate exceptions. */
  var DZ = [];
  G.stations.forEach(function(st){
    var items=FD.atStation(st.name),current=items.filter(function(i){return i.k==='now';}),future=items.filter(function(i){return i.k==='next';});
    var base=wdiv('station-base'+(st.lines.length===2?' interchange':''),st.x,st.y,'<i></i>');
    if(st.lines.length===2){
      var angle=0,votes=[0,0,0,0],cat=StationCatalog[st.name];
      ((window.SCHEMATIC_EXTENSION||{paths:{}}).paths[st.lines[0]]||[]).forEach(function(edge){edge.points.slice(1).forEach(function(b,i){var a=edge.points[i],dx=b[0]-a[0],dy=b[1]-a[1],len=dx*dx+dy*dy;if(!len)return;var t=Math.max(0,Math.min(1,((cat.x-a[0])*dx+(cat.y-a[1])*dy)/len)),dist=Math.hypot(cat.x-a[0]-t*dx,cat.y-a[1]-t*dy);if(dist<8){var bucket=((Math.round(Math.atan2(dy,dx)*4/Math.PI)%4)+4)%4;votes[bucket]+=Math.sqrt(len)/(dist+2);}});});
      angle=votes.indexOf(Math.max.apply(null,votes))*45;base.style.setProperty('--station-angle',angle+'deg');
    }

    ['now','next'].forEach(function(kind){var items=kind==='now'?current:future;if(!items.length)return;
      var sev=items.some(function(i){return (kind==='now'?i.d.sev:i.d.nextSev)==='severe';})?'severe':'minor';
      var html=kind==='now'?'<span class="nowglow '+sev+'"></span><span class="nowdot '+sev+'"></span>':'<span class="pred '+sev+'" style="--s:.85"><i class="g"></i><i class="p"></i><i class="c"></i></span>';
      var dot=wdiv('station-marker '+kind+' '+sev,st.x,st.y,html,'button');dot.dataset.st=st.name;dot.dataset.kind=kind;dot.setAttribute('aria-label',st.name+' · '+(kind==='now'?'delayed now':'predicted in 30 min'));
    });
  });
  ['minor','severe'].forEach(function(sev){var grad=el('linearGradient',{id:'flow-light-'+sev,x1:'0%',x2:'100%'},C.defs);[[0,0],[.55,.22],[.85,.85],[1,0]].forEach(function(stop){el('stop',{offset:stop[0],'stop-color':sev==='minor'?'#FFA12B':'#DC241F','stop-opacity':stop[1]},grad);});});
  FD.disruptions.forEach(function(d){
    var seg=G.stretch(d.line,kebab(d.from),kebab(d.to)),set={};
    if(seg)seg.ids.forEach(function(i){set[i]=1;});
    var group=el('g',{'class':'dz-i sev-'+d.sev,'data-id':d.id},gDz);
    if(seg){
      el('path',{d:dOf(seg.pts),'class':'dz-glow'},group);
      if(!d.branches.length)el('path',{d:dOf(seg.pts),'class':'dz-current','data-kind':'now'},group);
    }
    d.branches.forEach(function(branch){
      var path=G.stretch(d.line,kebab(branch.from),kebab(branch.to));if(!path)return;
      el('path',{d:dOf(path.pts),'class':'dz-glow',stroke:lineCol(d.line)},group);
      var beam=el('g',{'class':'direction-light','data-kind':'next'},group),duration=Math.max(2.8,Math.min(4.5,path.pts.length*.05));
      var mid='flow-mask-'+d.id+'-'+d.branches.indexOf(branch),grad=mid+'-soft';
      var rg=el('radialGradient',{id:grad},C.defs);
      [[0,1],[.35,.7],[1,0]].forEach(function(v){el('stop',{offset:v[0],'stop-color':'white','stop-opacity':v[1]},rg);});
      var mb=bboxOf(path.pts,40);var mask=el('mask',{id:mid,maskUnits:'userSpaceOnUse',x:mb.x0,y:mb.y0,width:mb.x1-mb.x0,height:mb.y1-mb.y0},C.defs);
      var light=el('circle',{r:32,fill:'url(#'+grad+')'},mask);
      el('animateMotion',{path:dOf(path.pts),dur:duration+'s',repeatCount:'indefinite',calcMode:'paced'},light);
      el('path',{d:dOf(path.pts),stroke:lineCol(d.line),'stroke-width':8,opacity:.4,mask:'url(#'+mid+')'},beam);
      el('path',{d:dOf(path.pts),stroke:'#fff7e9','stroke-width':2.4,opacity:.85,mask:'url(#'+mid+')'},beam);
      path.ids.forEach(function(i){set[i]=1;});
    });
    DZ.push({d:d,seg:seg || {pts:[],ids:[]},set:set});
  });
  var filter='all';
  document.querySelectorAll('[data-map-filter]').forEach(function(button){button.addEventListener('click',function(){
    filter=filter===button.dataset.mapFilter?'all':button.dataset.mapFilter;world.dataset.filter=filter;
    document.querySelectorAll('[data-map-filter]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.mapFilter===filter));});
  });});

  function dzById(id) { for (var i = 0; i < DZ.length; i++) if (DZ[i].d.id === id) return DZ[i]; return null; }

  /* ---------------------------------------------------------------- focus / dim (Flow 1 + 4) */
  var focusTimer = 0;
  function focusLines(list, mode) {
    clearTimeout(focusTimer); C.hl.innerHTML = '';
    (mode === 'route' ? [] : list).forEach(function (sl) {
      var gg = C.sc(C.hl, C.lineOff(sl), { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      var cs = C.linePaths(sl);
      cs.forEach(function (d) { el('path', { d: d, stroke: '#0b0d11', 'stroke-width': 5.4 }, gg); });
      cs.forEach(function (d) { el('path', { d: d, stroke: lineCol(sl), 'stroke-width': 3.5 }, gg); });
    });
    world.classList.toggle('route-focus',mode==='route'); svg.classList.toggle('route', mode === 'route'); svg.classList.add('focus');
  }
  function clearFocus() { world.classList.remove('route-focus'); clearTimeout(focusTimer); svg.classList.remove('focus', 'route'); focusTimer = setTimeout(function () { if (!svg.classList.contains('focus')) C.hl.innerHTML = ''; }, 500); }

  /* world markers: selected station ring, route endpoints */
  var selRing = null, routeMk = [];
  function showSel(st) { hideSel(); if (!st) return;world.querySelectorAll('.lbl').forEach(function(n){n.classList.toggle('selected-label',n.dataset.st===st.name);}); selRing = wdiv('fsel', st.x, st.y, '<i></i><i></i><b>' + esc(st.name) + '</b>'); }
  function hideSel() { world.querySelectorAll('.selected-label').forEach(function(n){n.classList.remove('selected-label');});if (selRing) { selRing.remove(); selRing = null; } }
  function clearRouteDraw() { world.classList.remove('route-focus'); world.querySelectorAll('.route-label').forEach(function(n){n.classList.remove('route-label');}); gRt.innerHTML = ''; routeMk.forEach(function (n) { n.remove(); }); routeMk = []; svg.classList.remove('has-route'); }

  /* strokes keep a readable screen width when zoomed far out */
  C.onCam = function (k) { svg.style.setProperty('--rw', Math.max(6, 5 / k).toFixed(2)); svg.style.setProperty('--dw', Math.max(3.4, 3 / k).toFixed(2)); svg.style.setProperty('--gw', Math.max(12, 11 / k).toFixed(2)); };
  C.onCam(cam.get().k);
  /* ---------------------------------------------------------------- sheet */
  var zoomEl = $('.zoomctl'), sheet;
  function onSheet(v, settled) {
    var H = phone.clientHeight || 844;
    phone.style.setProperty('--sv', v + 'px');
    phone.classList.toggle('has-sheet', v > 24);
    if (zoomEl) { zoomEl.style.setProperty('--zt', (H - v - 104) + 'px'); zoomEl.classList.toggle('away', v > H * .62); }
  }
  sheet = window.FlowSheet.create(phone, {
    onChange: onSheet,
    onTarget: function (v) { reframe(v); },
    onContent: function () { if (state.t === 'pick') fillPickList(state.query || ''); },
    onDismiss: function () { dismissAll(true); }
  });

  /* ---------------------------------------------------------------- camera framing for the current state */
  function bboxOf(pts, pad) {
    var b = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    pts.forEach(function (p) { b.x0 = Math.min(b.x0, p[0]); b.y0 = Math.min(b.y0, p[1]); b.x1 = Math.max(b.x1, p[0]); b.y1 = Math.max(b.y1, p[1]); });
    pad = pad || 0; b.x0 -= pad; b.y0 -= pad; b.x1 += pad; b.y1 += pad; return b;
  }
  function reframe(vis) {
    if (!state.t || state.t === 'list') return;
    var c = cam.get(), snapFull = vis >= c.VH - 100;
    if (snapFull && state.t !== 'pick') return;
    if(state.t==='pick' && state.from && state.to && !state.search){
      var a=G.byId[state.from],b=G.byId[state.to];cam.fit(bboxOf([[a.x,a.y],[b.x,b.y]],12),{t:130,b:vis+24,l:60,r:60},2.6);
    } else if (state.t === 'station' || (state.t === 'pick' && state.focus)) {
      var st = G.byId[state.t === 'station' ? state.id : state.focus]; if (!st) return;
      if (snapFull) return;
      cam.flyTo(st.x, st.y, M_clamp(Math.max(c.k, 1.5), 1.5, 2.6), c.VW / 2, Math.max(230, 206 + (c.VH - vis - 206) * .5));
    } else if (state.t === 'route') {
      var o = curRoute && curRoute.opts[state.opt || 0]; if (!o) { cam.fit(bboxOf([[G.byId[state.from].x, G.byId[state.from].y], [G.byId[state.to].x, G.byId[state.to].y]], 20), { t: 165, b: vis + 65, l: 90, r: 100 }, 2.6); return; }
      var pts = []; o.r.legs.forEach(function (l) { l.pts.forEach(function (p) { pts.push(p); }); });
      if(!pts.length)pts=[[G.byId[state.from].x,G.byId[state.from].y],[G.byId[state.to].x,G.byId[state.to].y]];cam.fit(bboxOf(pts, 6), { t: 165, b: vis + 65, l: 90, r: 100 }, 2.6);
    } else if (state.t === 'dis') {
      var z = dzById(state.id); if (!z) return;
      cam.fit(bboxOf(z.seg.pts, 10), { t: 120, b: vis + 28, l: 50, r: 50 }, 2.2);
    }
  }
  function M_clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  /* ---------------------------------------------------------------- content builders */
  var X = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  function head(title, sub, back) {
    return '<div class="fs-head">' + (back ? '<button class="fs-back" data-act="back" aria-label="Back"><svg width="9" height="15" viewBox="0 0 9 15" fill="none"><path d="M7.5 1.5 1.8 7.5l5.7 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' : '') +
      '<div class="fs-t"><h2>' + title + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div><button class="fs-x" data-act="close" aria-label="Close">' + X + '</button></div>';
  }
  function pill(sl, extra) { return '<span class="lp" style="--c:' + lineCol(sl) + '"><i></i>' + esc(lineName(sl)) + (extra || '') + '</span>'; }
  function orient(st) {
    var n = st.nodes[state.stationLine || st.lines[0]]; if (n == null) return ['Westbound', 'Eastbound'];
    var a = G.nodes[Math.max(0, n - 4)], b = G.nodes[Math.min(G.nodes.length - 1, n + 4)];
    return Math.abs(b.x - a.x) >= Math.abs(b.y - a.y) ? ['Westbound', 'Eastbound'] : ['Southbound', 'Northbound'];
  }
  function statusRow(st) {
    var items=FD.atStation(st.name).filter(function(i){return i.d.line===state.stationLine;}),now=items.filter(function(i){return i.k==='now';}),next=items.filter(function(i){return i.k==='next';});
    function row(title,items,kind){
      if(!items.length)return '<div class="station-status-row"><span class="delay-dot '+kind+' good"></span><div><small>'+title+'</small><b>'+(kind==='now'?'No reported station delay':'No additional delay predicted')+'</b></div></div>';
      return items.map(function(i){var sev=kind==='now'?i.d.sev:i.d.nextSev;return '<button class="station-status-row" data-act="dis" data-id="'+i.d.id+'"><span class="delay-dot '+kind+' '+sev+'"></span><div><small>'+title+' · '+esc(lineName(i.d.line))+'</small><b>'+FD.SEV[sev]+(kind==='next'?' · '+i.d.prob:'')+'</b><small>'+esc(i.d.direction)+'</small></div><span>›</span></button>';}).join('');
    }
    var lineAlerts=[];[state.stationLine].forEach(function(l){FD.forLine(l).forEach(function(d){lineAlerts.push(d);});});
    return '<div class="station-status">'+row(lineName(state.stationLine)+' · at this station now',now,'now')+row('Next 30 minutes',next,'next')+'</div>'+
      (lineAlerts.length?'<div class="line-alerts"><small>LINE-WIDE STATUS</small>'+lineAlerts.map(function(d){var sum=FD.summary(d.line);return '<button data-act="dis" data-id="'+d.id+'"><i style="background:'+lineCol(d.line)+'"></i>'+esc(lineName(d.line))+'<span>'+sum.now+' now · '+sum.total+' in 30 min ›</span></button>';}).join('')+'</div>':((LBS[state.stationLine]||{}).status==='closed'?'<div class="line-alerts"><small>LINE-WIDE STATUS</small><a href="line.html?line='+state.stationLine+'">'+esc(lineName(state.stationLine))+' · '+(state.stationLine==='waterloo-city'?'Not running':'Part closure')+' · View details ›</a></div>':''));
  }
  function stationHTML(st) {
    var o = orient(st), w = FD.worst(FD.atStation(st.name)), dirs = '';
    o.forEach(function (n) {
      var t = FD.trains(st.name + state.stationLine, n), t3 = t[1] + 4 + (FD.hash(st.name + n) % 5);
      dirs += '<section class="arrival-card" aria-label="'+esc(n)+' example arrivals"><h3>'+esc(n)+'</h3><div class="arrival-next"><b>'+(t[0]===0?'Due':t[0])+'</b>'+(t[0]===0?'':'<span>min</span>')+'<small>Next train</small></div><div class="arrival-later"><span>Then</span><b>'+t[1]+'</b><i>·</i><b>'+t3+'</b><span>min</span></div></section>';
    });
    var primary = st.lines[0] || 'central';
    return head(esc(st.name), (window.LiveState && LiveState.mode !== 'example' ? 'Live · ' : 'Demo data · ') + (st.lines.length || 1) + ' line' + (st.lines.length === 1 ? '' : 's')) +
      '<div class="station-body"><div class="fs-chips">' + st.lines.map(function (l) { return '<button class="lpa" data-act="station-line" data-line="'+l+'" aria-pressed="'+(state.stationLine===l)+'">'+pill(l)+'</button>'; }).join('') + '</div>' +
      statusRow(st) +
      '<div class="fs-sec">Example arrivals</div><div class="fs-dirs">' + dirs + '</div>' +
      '</div><div class="fs-actions"><button class="btn-p" data-act="route-from"' + (st.vn < 0 && !window.TFLMap ? ' disabled' : '') + '><svg width="16" height="16" viewBox="0 0 32 32" fill="none"><path d="M7 26V18a6 6 0 0 1 6-6h12M19 5l7 7-7 7" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>Route from here</button>' +
      '<button class="btn-s" data-act="route-to">To here</button></div>';
  }

  /* picker */
  var QUICK = ['Paddington', 'Oxford Circus', 'Bank', 'Liverpool Street', 'Stratford', 'Waterloo', 'King\'s Cross', 'Victoria'];
  function nm(id) { return id && G.byId[id] ? G.byId[id].name : ''; }
  function pickHTML() {
    var f = state.field || 'to';
    return head(state.search ? (f === 'from' ? 'Choose start' : 'Choose destination') : 'Plan a route', state.search ? (f === 'to' && state.from ? 'From '+esc(nm(state.from)) : 'Search by station name') : 'Choose a start and a destination', !!state.search) +
      '<div class="rp-fields"><div class="rp-rail"><i class="a"></i><i class="l"></i><i class="b"></i></div><div class="rp-in">' +
      '<button class="rp-f' + (f === 'from' ? ' on' : '') + '" data-act="field" data-f="from"><small>From</small><b>' + (esc(nm(state.from)) || '<u>Choose start</u>') + '</b></button>' +
      '<button class="rp-f' + (f === 'to' ? ' on' : '') + '" data-act="field" data-f="to"><small>To</small><b>' + (esc(nm(state.to)) || '<u>Choose destination</u>') + '</b></button></div>' +
      '<button class="rp-sw" data-act="swap" aria-label="Swap"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5 15V3M5 3 2 6m3-3 3 3M13 3v12m0 0 3-3m-3 3-3-3" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>' +
      '<button class="pick-search-toggle" data-act="search-pick">'+(state.search?'Choose on map':'Search stations instead')+'</button><div class="rp-search"><input id="rpq" type="search" placeholder="' + (f === 'from' ? 'Search a start station' : 'Search a destination') + '" autocomplete="off" spellcheck="false" aria-label="Search stations" value="' + esc(state.query || '') + '"></div>' +
      '<div class="rp-quick">' + QUICK.filter(function (q) { return G.byName[q] && (window.TFLMap || G.byName[q].vn >= 0); }).map(function (q) { return '<button data-act="pickst" data-n="' + esc(q) + '">' + esc(q) + '</button>'; }).join('') + '</div>' +
      '<div class="rp-list" id="rpl" aria-live="polite"></div>'+(!state.search?'<button class="btn-p find-journey" data-act="find-route"'+(state.from&&state.to&&state.from!==state.to?'':' disabled')+'>Find routes</button>':'');
  }
  function searchKey(s){return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,'and').replace(/[^a-z0-9]/g,'');}
  function fillPickList(q) {
    var box = $('#rpl', sheet.pane); if (!box) return; q = (q || '').trim().toLowerCase();
    var list = G.stations.filter(function (s) { return (window.TFLMap || s.vn >= 0) && (!q || searchKey(s.name).indexOf(searchKey(q)) > -1) && s.id !== (state.field === 'from' ? state.to : state.from); })
      .sort(function (a, b) { return a.name.localeCompare(b.name); }).slice(0, q ? 60 : 24);
    box.innerHTML = list.length ? list.map(function (s) {
      return '<button class="rp-r" data-act="pickst" data-n="' + esc(s.name) + '"><span class="dots">' + s.lines.slice(0, 4).map(function (l) { return '<i style="background:' + lineCol(l) + '"></i>'; }).join('') + '</span><span>' + esc(s.name) + '</span><b>&rsaquo;</b></button>';
    }).join('') : '<div class="rp-none">No station matches “' + esc(q) + '”</div>';
  }

  /* route options */
  var routeRequest=null,requestKey=null;
  function loadJourney(key){
    if(requestKey===key)return;
    if(routeRequest)routeRequest.abort();routeRequest=new AbortController();requestKey=key;
    var a=state.from,b=state.to,controller=routeRequest;
    var timeout=setTimeout(function(){controller.abort();},15000);
    JourneyAPI.plan(G.byId[a],G.byId[b],controller.signal).then(function(opts){
      RC[key]={from:a,to:b,opts:opts,fetchedAt:Date.now()};
    }).catch(function(error){if(controller!==routeRequest)return;RC[key]={from:a,to:b,opts:[],error:error.name==='AbortError'?'The request timed out. Please try again.':error.message,fetchedAt:Date.now()};
    }).finally(function(){clearTimeout(timeout);if(controller!==routeRequest)return;requestKey=null;routeRequest=null;if(state.t==='route'&&state.from===a&&state.to===b)render('loaded');});
  }
  function routeHTML(rs) {
    var A = G.byId[rs.from], B = G.byId[rs.to], opts = rs.opts, h = '';
    opts.forEach(function (o, i) {
      var legs = o.r.legs.map(function (l, j) { return (j ? '<em>›</em>' : '') + pill(l.line); }).join('');
      var notices=[];o.r.legs.forEach(function(l){(l.disruptions||[]).forEach(function(n){if(notices.indexOf(n)<0)notices.push(n);});});
      var dl=notices.map(function(n){return '<p class="provider-notice">'+esc(n)+'</p>';}).join('');
      h += '<button class="ro' + (i === (state.opt || 0) ? ' on' : '') + '" data-act="opt" data-i="' + i + '" aria-pressed="' + (i === (state.opt || 0)) + '">' +
        '<div class="ro-top"><b>' + (o.min + o.extra) + '<small> min</small></b><span class="tag">' + o.tag + '</span></div>' +
        '<div class="ro-legs">' + legs + '</div>' +
        '<div class="ro-meta">' + (o.r.legs.every(function(l){return l.walking;})?'Walking route':o.stops+' stops') + ' · ' + (o.r.transfers ? o.r.transfers + ' change' + (o.r.transfers > 1 ? 's' : '') : 'No changes') + (o.extra ? ' · usually ' + o.min + ' min' : '') + '</div><div class="ro-times">'+JourneyAPI.clock(o.departure)+' → '+JourneyAPI.clock(o.arrival)+' · London time · Excludes waiting before departure</div>' + dl + '</button>';
    });
    if (!opts.length) h = '<div class="rp-none">'+esc(rs.error||'TfL returned no journeys for these stations at this time.')+'</div><button class="btn-s" data-act="retry-route">Try again</button>';
    var sub = opts.length + ' route' + (opts.length === 1 ? '' : 's') + ' · TfL Journey Planner';
    if (state.chosen && opts.length) {
      var selected=opts[state.opt||0];
      return head('Route selected',esc(A.name)+' → '+esc(B.name),false)+
        '<div class="journey-confirm" role="status"><span>✓</span><div><b>'+ (selected.min+selected.extra)+' min · '+JourneyAPI.clock(selected.departure)+' → '+JourneyAPI.clock(selected.arrival)+'</b><small>TfL · '+selected.r.transfers+' change'+(selected.r.transfers===1?'':'s')+' · London time</small></div></div>'+
        '<ol class="journey-steps">'+selected.r.legs.map(function(l,i){var first=l.stops[0],last=l.stops[l.stops.length-1];return '<li style="--line-color:'+lineCol(l.line)+'"><small>'+(l.walking?'Walk':(i?'Change at '+esc(first?first.name:'interchange'):'Board at '+esc(first?first.name:A.name)))+'</small><b>'+esc(lineName(l.line))+'</b><small>'+esc(l.instruction)+' · '+l.duration+' min · '+JourneyAPI.clock(l.departure)+'</small><span>'+esc(first?first.name:A.name)+' → '+esc(last?last.name:B.name)+' · '+Math.max(0,l.stops.length-1)+' stops</span><details><summary>Stations on this leg</summary><div class="leg-stops">'+l.stops.map(function(st,j){return '<span><i></i>'+esc(st.name)+(j===l.stops.length-1?(i===selected.r.legs.length-1?' · Arrive':' · Change here'):'')+'</span>';}).join('')+'</div></details></li>';}).join('')+'</ol><small class="journey-note">Powered by the Transport for London Journey Planner API</small>'+
        '<div class="fs-actions"><button class="btn-p" data-act="change-route">Change route</button><button class="btn-s" data-act="edit-route">Edit journey</button></div>';
    }
    return head(esc(A.name)+' <span class="arr">→</span> '+esc(B.name),sub,true)+
      '<button class="route-edit" data-act="edit-route">Edit start or destination</button><div class="ro-list">'+h+'</div><div class="fs-actions"><button class="btn-p" data-act="go"'+(opts.length?'':' disabled')+'>Choose this route</button><button class="btn-s" data-act="swap" aria-label="Reverse route">⇅</button></div>';
  }

  /* disruption */
  function disHTML(d) {
    function names(a) { return a.length ? a.map(function (n) { return '<button class="sn" data-act="stn" data-n="' + esc(n) + '">' + esc(n) + '</button>'; }).join('') : '<span class="none">None expected</span>'; }
    return head('<span class="sevchip ' + d.sev + '"><b>!</b>' + (d.sev === 'severe' ? 'Severe' : 'Minor') + '</span> ' + esc(lineName(d.line)) + ' line', 'Demo disruption · '+d.direction, true) +
      '<p class="dz-direction">'+esc(d.direction)+' · forecast direction</p><p class="dz-cause">' + esc(d.cause) + '</p><p class="dz-detail">' + esc(d.detail) + '</p>' +
      '<div class="dz-cols"><div class="dz-col now ' + d.sev + '"><h4><i></i>Now</h4><div class="sns">' + names(d.now) + '</div></div>' +
      '<div class="dz-col next ' + d.sev + '"><h4><i></i>Next 30 min <small>' + (d.next.length ? d.prob : '') + '</small></h4><div class="sns">' + names(d.next) + '</div></div></div>' +
      '<div class="fs-actions"><button class="btn-p" data-act="route-around"><svg width="16" height="16" viewBox="0 0 32 32" fill="none"><path d="M7 26V18a6 6 0 0 1 6-6h12M19 5l7 7-7 7" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>Plan around it</button>' +
      '<a class="btn-s" data-nodrag href="line.html?line=' + d.line + '">View line</a></div>';
  }

  /* ---------------------------------------------------------------- route drawing (Flow 2) */
  function drawRoute(o) {
    clearRouteDraw(); svg.classList.add('has-route');
    var legs = o.r.legs, delay = 0;
    legs.forEach(function (l) {
      if(!l.pts.length)return;var d = dOf(l.pts);
      el('path', { d: d, 'class': 'rt-case' }, gRt);
      var p = el('path', { d: d, 'class': 'rt-line'+(l.walking?' rt-walk':''), stroke: lineCol(l.line) }, gRt);
      // Route is visible immediately; option changes never wait for stroke drawing.

    });
    var A = o.r.from, B = o.r.to;
    routeMk.push(wdiv('fend a', A.x, A.y, '<i></i><b>' + esc(A.name) + '</b>'), wdiv('fend b', B.x, B.y, '<i></i><b>' + esc(B.name) + '</b>'));
    for (var i = 1; i < legs.length; i++) { var p0 = legs[i].pts[0]; if(!p0)continue;routeMk.push(wdiv('fxfer', p0[0], p0[1])); }
    var names=new Set([A.name,B.name]); legs.forEach(function(l){l.stops.forEach(function(st){names.add(st.name);});});
    world.querySelectorAll('.lbl').forEach(function(n){n.classList.toggle('route-label',names.has(n.dataset.st));n.classList.toggle('endpoint-label',n.dataset.st===A.name || n.dataset.st===B.name);});
    focusLines(o.r.legs.map(function (l) { return l.line; }), 'route');
  }

  /* ---------------------------------------------------------------- state machine + history */
  var draft = null;
  var state = { t: null, d: 0 }, depth = 0, listEl = null, RC = {}, curRoute = null;
  var base = location.pathname.replace(/^.*\//, '') + '?line=' + C.slug;
  function urlFor(s) {
    if (s.t === 'station') return base + '&station=' + s.id + (s.stationLine?'&stationLine='+s.stationLine:'');
    if (s.t === 'pick') return base + '&pick=1' + (s.from ? '&from=' + s.from : '') + (s.to ? '&to=' + s.to : '');
    if (s.t === 'route') return base + '&route=' + s.from + ',' + s.to + '&opt=' + (s.opt||0) + (s.chosen?'&chosen=1':'');
    if (s.t === 'dis') return base + '&dis=' + s.id;
    if (s.t === 'list') return 'index.html#all-lines';
    return base;
  }
  function go(s, o) {
    if (s.t === 'list') { location.href='index.html#all-lines'; return; }
    o = o || {}; var prev = state.t;
    if (o.push !== false) { depth = o.replace ? depth : depth + 1; s.d = depth; history[o.replace ? 'replaceState' : 'pushState'](s, '', urlFor(s)); }
    else depth = s.d || 0;
    state = s; if(s.from || s.to) draft={from:s.from||null,to:s.to||null}; render(prev);
  }
  function render(prev) {
    document.body.classList.toggle('in-flow', !!state.t);
    sheet.el.classList.toggle('route-mode',state.t==='route');
    if(state.t!=='route'&&routeRequest){routeRequest.abort();routeRequest=null;requestKey=null;}
    sheet.el.classList.toggle('station-mode',state.t==='station');
    phone.classList.toggle('routing',state.t==='route'||state.t==='pick');
    sheet.el.classList.toggle('pick-mode',state.t==='pick');
    sheet.el.classList.toggle('pick-search',!!state.search);
    sheet.el.classList.toggle('route-chosen',!!state.chosen);
    if (state.t !== 'list') closeList(true);
    var morph = !!prev && prev !== 'list';
    if (!state.t) { clearFocus(); hideSel(); clearRouteDraw(); sheet.close(true); phone.classList.remove('has-sheet'); return; }
    if (state.t === 'station') {
      var st = G.byId[state.id]; if (!st) return;
      state.stationLine=st.lines.indexOf(state.stationLine)>=0?state.stationLine:(st.lines.indexOf(C.slug)>=0?C.slug:st.lines[0]);
      clearRouteDraw(); showSel(st); focusLines([state.stationLine]);
      sheet.open(stationHTML(st), sheet.snap && sheet.snap !== 'full' ? sheet.snap : 'mid', { instant: false });
    } else if (state.t === 'pick') {
      clearRouteDraw(); var f = G.byId[state.focus || state.from]; if (f) { showSel(f); focusLines(f.lines); } else { hideSel(); clearFocus(); }
      state.focus = state.focus || state.from || null;
      if(state.from && state.to){hideSel();[state.from,state.to].forEach(function(id,i){var st=G.byId[id];routeMk.push(wdiv('fend '+(i?'b':'a'),st.x,st.y,'<i></i><b>'+esc(st.name)+'</b>'));});}
      sheet.open(pickHTML(), state.search ? 'mid' : 'compact', {dismissible:false}); fillPickList(state.query || '');
    } else if (state.t === 'route') {
      var key=state.from+'>'+state.to;
      if(!RC[key]||(!state.chosen&&prev!=='loaded'&&prev!=='route'&&Date.now()-RC[key].fetchedAt>60000)){
        hideSel();clearRouteDraw();clearFocus();curRoute=null;
        sheet.open(head('Finding routes','Checking current TfL journey options',true)+'<div class="route-loading" role="status">Connecting to TfL…</div>','mid',{dismissible:false,peekHeight:148});loadJourney(key);return;
      }
      curRoute = RC[key]; hideSel();
      if (!curRoute.opts[state.opt||0]) state.opt=0;
      var o = curRoute.opts[state.opt || 0]; if (o) drawRoute(o); else clearRouteDraw();
      sheet.open(routeHTML(curRoute)+'<button class="route-expand" data-act="expand-route">Show journey details</button>', 'mid', {dismissible:false,peekHeight:148});
    } else if (state.t === 'dis') {
      var dd = FD.byId(state.id); if (!dd) return; clearRouteDraw(); hideSel(); focusLines([dd.line]);
      sheet.open(disHTML(dd), 'mid');
    } else if (state.t === 'list') { location.href='index.html#all-lines'; }
  }
  function dismissAll(fromSheet) {
    var n = depth; depth = 0;
    if (fromSheet) { sheet.el.hidden = true; }
    state = { t: null, d: 0 }; render('x');
    if (n > 0) { suppressPop = true; history.go(-n); }
  }
  var suppressPop = false;
  window.addEventListener('popstate', function (e) {
    if (suppressPop) { suppressPop = false; return; }
    var s = e.state || { t: null, d: 0 };
    state = s; depth = s.d || 0; render('pop');
  });
  function back() {
    if(state.t==='pick' && state.search){go(Object.assign({},state,{search:false,query:''}),{replace:true});return true;}
    if(state.t==='route'){go({t:state.chosen?'route':'pick',from:state.from,to:state.to,opt:state.opt||0,field:'to',focus:state.from},{replace:true});return true;}
    if (state.t) { dismissAll(false); return true; } return false;
  }

  function closeList() {}
  /* ---------------------------------------------------------------- events */
  function stationByName(n) { return G.byName[n] || null; }
  function openStation(name) {
    var st = stationByName(name); if (!st) { go({t:'pick',field:'from'}); return; }
    if (state.t === 'pick') { pickStation(st.name); return; }
    go({ t: 'station', id: st.id }, state.t === 'station' ? { replace: true } : {});
  }
  function pickStation(name) {
    var st = stationByName(name); if (!st || (!window.TFLMap && st.vn < 0)) return;
    var f = state.field || 'to', from = state.from, to = state.to;
    if (f === 'from') from = st.id; else to = st.id;

    if (from === to) { var hint=$('.fs-head p',sheet.pane);if(hint)hint.textContent='Choose a different start and destination';return; }
    go({ t: 'pick', from: from, to: to, field: from ? 'to' : 'from', focus: st.id, search: !!state.search && !(from && to), query:'' }, { replace: true });
    var q = $('#rpq', sheet.pane); if(q && state.search) q.focus();
  }

  world.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-st]'); var pin = e.target.closest && e.target.closest('.dpin');
    if (pin) { e.preventDefault(); go({ t: 'dis', id: pin.getAttribute('data-id') }); return; }
    if (a) { e.preventDefault(); openStation(a.getAttribute('data-st')); }
  });
  view.addEventListener('click', function (e) {          /* tap on empty map: restore */
    if (e.target.closest('[data-st],.dpin')) return;
    if (state.t === 'station' || state.t === 'dis') dismissAll(false);
  });
  view.addEventListener('pointerdown', function () { if (state.t === null && svg.classList.contains('focus')) clearFocus(); });

  phone.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-act],.fl-row'); if (!b || (!sheet.el.contains(b) && !(listEl && listEl.contains(b)))) return;

    var act = b.getAttribute('data-act');
    if (act === 'close') { state.t === 'list' ? history.back() : dismissAll(false); }
    else if(act==='station-line'){state.stationLine=b.dataset.line;history.replaceState(state,'',urlFor(state));sheet.setContent(stationHTML(G.byId[state.id]));focusLines([state.stationLine]);}
    else if(act==='search-pick'){state.search=!state.search;state.query='';history.replaceState(state,'',urlFor(state));render('pick');if(state.search)$('#rpq',sheet.pane).focus();}
    else if(act==='expand-route')sheet.snapTo('mid');
    else if (act === 'back') back();
    else if (act === 'dis') go({ t: 'dis', id: b.getAttribute('data-id') });
    else if (act === 'route-to') go({t:'pick',to:state.id,field:'from',focus:state.id});
    else if (act === 'route-from') go({ t: 'pick', from: state.id, field: 'to', focus: state.id });
    else if (act === 'route-around') { var z = dzById(state.id), st0 = z && G.byName[z.d.now[0]]; go({ t: 'pick', from: null, to: null, field: 'from', focus: null }); }
    else if (act === 'stn') openStation(b.getAttribute('data-n'));
    else if (act === 'edit-route') go({t:'pick',from:state.from,to:state.to,field:'to',focus:state.from});
    else if (act === 'field') { var s = { t: 'pick', from: state.from, to: state.to, field: b.getAttribute('data-f'), focus: state.focus,search:true }; go(s, { replace: true });var input=$('#rpq',sheet.pane);if(input)input.focus(); }
    else if (act === 'swap') { var a2 = state.from, b2 = state.to; if (state.t === 'route') go({ t: 'route', from: b2, to: a2, opt: 0 }, { replace: true }); else go({ t: 'pick', from: b2, to: a2, field: state.field, focus: state.focus }, { replace: true }); }
    else if(act==='find-route'&&state.from&&state.to&&state.from!==state.to){go({t:'route',from:state.from,to:state.to,opt:0});}
    else if(act==='retry-route'){delete RC[state.from+'>'+state.to];render('retry');}
    else if (act === 'pickst') pickStation(b.getAttribute('data-n'));
    else if (act === 'opt') { var i = +b.getAttribute('data-i'); state.opt = i; history.replaceState(state, '', urlFor(state)); var o = curRoute.opts[i]; sheet.pane.querySelectorAll('.ro').forEach(function (n, j) { n.classList.toggle('on', j === i); n.setAttribute('aria-pressed', j === i); }); drawRoute(o); reframe(sheet.visible); }
    else if (act === 'go') { go({t:'route',from:state.from,to:state.to,opt:state.opt||0,chosen:true}); }
    else if (act === 'change-route') { go({t:'route',from:state.from,to:state.to,opt:state.opt||0},{replace:true}); }
  });

  sheet.pane.addEventListener('input', function (e) { if (e.target.id === 'rpq') {state.query=e.target.value;fillPickList(e.target.value);} });

  /* entry points on the existing page chrome */
  var stack = $('#stack'), rbtn = $('#route');
  stack.href='index.html#all-lines';
  rbtn.addEventListener('click', function (e) { e.preventDefault(); var a=state.t==='station'?state.id:(draft&&draft.from),b=state.t==='station'?null:(draft&&draft.to);go({t:'pick',from:a||null,to:b||null,field:a?'to':'from',focus:a||null}); });
  var bk = $('[data-back]'); if (bk) bk.addEventListener('click', function (e) { if (state.t) { e.stopImmediatePropagation(); back(); } }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.t && !/INPUT/.test(e.target.tagName)) { back(); } });
  if (window.TCSearch) { var q = $('#q'); /* search → fly to the station instead of navigating */ q.__pick = openStation; }
  window.addEventListener('shellfit',function(){if(state.t)reframe(sheet.visible);});
  window.FlowMap = { go: go, openStation: openStation, state: function () { return state; }, geo: G, sheet: sheet };

  /* ---------------------------------------------------------------- deep links */
  (function () {
    var p = new URLSearchParams(location.search), s = null;
    if (p.get('station') && G.byId[p.get('station')]) s = { t: 'station', id: p.get('station'),stationLine:p.get('stationLine') };
    else if (p.get('route')) { var r = p.get('route').split(','); if (G.byId[r[0]] && G.byId[r[1]]) s = { t: 'route', from: r[0], to: r[1], opt: Math.max(0,parseInt(p.get('opt'),10)||0), chosen:p.get('chosen')==='1' }; }
    else if (p.get('dis') && FD.byId(p.get('dis'))) s = { t: 'dis', id: p.get('dis') };
    else if (p.get('pick')) s = { t: 'pick', from: G.byId[p.get('from')] ? p.get('from') : null, to: G.byId[p.get('to')] ? p.get('to') : null, field: p.get('from') ? 'to' : 'from', focus: p.get('from') || p.get('to') || null };
    else if (p.get('list')) { location.replace('index.html#all-lines'); return; }
    if (p.get('route') && !s) { s={t:'pick',from:null,to:null,field:'from'}; }
    if (s) { s.d = 0; history.replaceState({ t: null, d: 0 }, '', base); depth = 0; go(s); }
    else history.replaceState({ t: null, d: 0 }, '', location.pathname.replace(/^.*\//, '') + location.search);
  })();
})();

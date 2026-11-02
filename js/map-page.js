/* V3 · Map — renders the network at Figma V3 scale (NET × 1440/656), focus line, pan, tap targets. */
(function () {
  var NS = 'http://www.w3.org/2000/svg', N = window.NET, S = 1440 / 656;
  var slug = new URLSearchParams(location.search).get('line');
  var L = window.LINE_BY_SLUG[slug] || window.LINE_BY_SLUG.central; slug = L.slug;
  var col = N.colors[slug];
  var DEF = [-975, 30.8], M = window.Motion;                       /* Figma pan for Central */

  function el(t, a, p) { var n = document.createElementNS(NS, t); for (var k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; }
  function sc(p, off, a) { a = a || {}; a.transform = 'scale(' + S + ') translate(' + off[0] + ' ' + off[1] + ')'; return el('g', a, p); }
  function div(cls, st, p, tag) { var d = document.createElement(tag || 'div'); d.className = cls; if (st) d.style.cssText = st; if (p) p.appendChild(d); return d; }
  function url(name, key) { return TCSearch.url(name, slug); }

  /* ---------- chip / stack / search ---------- */
  var chip = document.getElementById('chip');
  chip.href = 'line.html?line=' + slug;
  chip.querySelector('i').style.background = L.color;
  chip.querySelector('b').textContent = L.name.replace(/ line$/, '') + ' line';
  chip.querySelector('span').textContent = '· ' + (L.status === 'delayed' ? L.now + ' delayed now' : L.status === 'closed' ? 'Not running' : 'Good service');
  document.getElementById('stack').href = 'index.html#all-lines';
  document.getElementById('route').href = 'map.html?pick=1';
  document.title = 'Tubecast · Map · ' + L.name;
  TCSearch.attach({ input: document.getElementById('q'), panel: document.getElementById('sp'), line: function () { return slug; } });

  /* ---------- svg: ALL lines drawn crisp at full strength — nothing is dimmed ---------- */
  var world = document.getElementById('world'), view = document.getElementById('view');
  /* Text never enters the zoomed compositor layer. Safari otherwise rasterises the
     labels with #world and they blur or drift during a pinch. */
  var labelLayer = div('map-label-layer', '', view);
  /* Labels stay in screen space so Safari never scales their glyph bitmap. A
     separate canvas carries pan translation; only pinch zoom updates the label
     anchors. Ordinary dragging is one compositor write instead of 299 writes. */
  var labelCanvas = div('map-label-canvas', '', labelLayer);
  var svg = el('svg', { width: 1440, height: 900, viewBox: '0 0 1440 900', fill: 'none' }, world);
  var defs = el('defs', {}, svg);
  var pat = el('pattern', { id: 'grid', width: 28.8, height: 28.8, patternUnits: 'userSpaceOnUse' }, defs);
  el('rect', { x: 0, y: 0, width: .9, height: 28.8, fill: '#1e222a' }, pat);
  el('rect', { x: 0, y: 0, width: 28.8, height: .9, fill: '#1e222a' }, pat);
  var f2 = el('filter', { id: 'bg', x: '-10%', y: '-10%', width: '120%', height: '120%' }, defs); el('feGaussianBlur', { stdDeviation: 3 }, f2);
  var RD = { 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };

  el('rect', { x: -1500, y: -1500, width: 4440, height: 3900, fill: 'url(#grid)', opacity: .5 }, svg);
  var w = sc(svg, N.water.off, { opacity: .6 });
  el('path', { d: N.water.d, stroke: '#16293A', 'stroke-width': 13.94, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, w);
  var c = sc(svg, N.casing.off, { opacity: .5, stroke: '#12161C', 'stroke-width': 3.69, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  N.casing.p.forEach(function (d) { el('path', { d: d }, c); });

  function linePaths(sl) { return sl === 'central' ? N.central.p : N.lines.p.filter(function (p) { return p[0] === sl; }).map(function (p) { return p[1]; }); }
  function lineOff(sl) { return sl === 'central' ? N.central.off : N.lines.off; }
  var slugs = Object.keys(N.colors).filter(function (k) { return linePaths(k).length; });

  /* transient highlight layers (one per line) — invisible until a hover / hold / initial pulse */
  var glow = {};
  function ensureGlow(sl){
    if(glow[sl])return;
    var gw=el('g',{filter:'url(#bg)','class':'glw'},svg);
    var gg=sc(gw,lineOff(sl),{stroke:N.colors[sl],'stroke-width':13.5/S,'stroke-linecap':'round','stroke-linejoin':'round'});
    linePaths(sl).forEach(function(d){el('path',{d:d},gg);});
    svg.insertBefore(gw,hl);glow[sl]=gw;
  }
  /* every line, same weight, full opacity */
  var ol = sc(svg, N.lines.off, { 'class':'network-lines','stroke-width': 2.05, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  N.lines.p.forEach(function (p) { el('path', { d: p[1], stroke: N.colors[p[0]] }, ol); });
  var oc = sc(svg, N.central.off, { 'class':'network-lines','stroke-width': 2.05, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  N.central.p.forEach(function (d) { el('path', { d: d, stroke: N.colors.central }, oc); });
  /* flow layers: base (everything drawn so far, dimmable) · hl (bright selected lines) · ov (delay + route overlays) */
  var base = el('g', { 'class': 'base' });
  Array.prototype.slice.call(svg.childNodes).forEach(function (n) { if (n !== defs) base.appendChild(n); });
  svg.appendChild(base);
  var hl = el('g', { 'class': 'hl' }, svg), ov = el('g', { 'class': 'ov' }, svg);
  /* desktop hover: wide invisible strokes → highlight that line only as a passing effect */
  var hv = el('g', { 'class': 'lhit' }, svg);
  if(matchMedia('(hover:hover) and (pointer:fine)').matches)slugs.forEach(function (sl) {
    var g = sc(hv, lineOff(sl), { stroke: 'transparent', 'stroke-width': 7, fill: 'none', 'data-line': sl, 'stroke-linecap': 'round', 'pointer-events': 'stroke' });
    linePaths(sl).forEach(function (d) { el('path', { d: d }, g); });
  });

  /* highlight = purely an interaction effect: on → fades in, off → fades out. Others never change. */
  var holds = {}, tmr = {};
  function glowOn(sl, ms) {
    if(!N.colors[sl])return;ensureGlow(sl);
    clearTimeout(tmr[sl]); glow[sl].classList.add('on');
    if (ms) tmr[sl] = setTimeout(function () { glowOff(sl); }, ms);
  }
  function glowOff(sl) { clearTimeout(tmr[sl]); glow[sl] && glow[sl].classList.remove('on'); }
  hv.addEventListener('pointerover', function (e) { var g = e.target.closest && e.target.closest('[data-line]'); if (g && e.pointerType === 'mouse') glowOn(g.getAttribute('data-line')); });
  hv.addEventListener('pointerout', function (e) { var g = e.target.closest && e.target.closest('[data-line]'); if (g && e.pointerType === 'mouse') glowOff(g.getAttribute('data-line')); });
  /* chip: hover (desktop) or press-and-hold (touch) lights the line; releasing restores. Tap still opens the line. */
  chip.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') glowOn(slug); });
  chip.addEventListener('pointerleave', function () { glowOff(slug); });
  chip.addEventListener('pointerdown', function () { glowOn(slug); });
  ['pointerup', 'pointercancel'].forEach(function (t) { chip.addEventListener(t, function () { glowOn(slug, 500); }); });

  /* ---------- labels + tap targets ---------- */
  var labels = window.TC_LABELS.map(function (l) {
    var hot = slug === 'central' && /^(Liverpool Street|Bank|Mile End)$/.test(l[0]);
    var a = div('lbl' + (hot ? ' hot' : ''), 'width:max-content', labelCanvas, 'a');
    a.href = url(l[0]); a.setAttribute('data-st', l[0]); a.textContent = l[0]; return { n: l[0], x: l[1], y: l[2], w: l[3], el:a };
  });
  Object.keys(window.StationCatalog).forEach(function(name){
    var st=StationCatalog[name],cx=st.x*S,cy=st.y*S;
    var h=div('hit','left:'+(cx-16)+'px;top:'+(cy-16)+'px;width:32px;height:32px',world,'a');
    h.href=url(name);h.setAttribute('aria-label',name);h.setAttribute('data-st',name);h.tabIndex=-1;
  });

  /* ---------- camera: pan + pinch zoom (Pointer Events), momentum, rubber-band, springs ---------- */
  var points=Object.values(StationCatalog),minX=Math.min.apply(null,points.map(function(p){return p.x*S;}))-80,maxX=Math.max.apply(null,points.map(function(p){return p.x*S;}))+80,minY=Math.min.apply(null,points.map(function(p){return p.y*S;}))-80,maxY=Math.max.apply(null,points.map(function(p){return p.y*S;}))+80;
  var WW=maxX-minX,WH=maxY-minY,KMIN=.035,KMAX=6;
  var tx = 0, ty = 0, k = 1, VW = 390, VH = 844;
  var zbtn = { in: document.getElementById('zin'), out: document.getElementById('zout') };
  function measure() { VW = view.offsetWidth || 390; VH = view.offsetHeight || 844; }
  function bx(kk){return [VW/2-maxX*kk,VW/2-minX*kk];}
  function by(kk){return [VH/2-maxY*kk,VH/2-minY*kk];}
  function hard(v, b) { return M.clamp(v, b[0], b[1]); }
  function soft(v, b, dim) { return v > b[1] ? b[1] + M.rubberband(v - b[1], dim) : v < b[0] ? b[0] + M.rubberband(v - b[0], dim) : v; }
  function softK(v) { return v > KMAX ? KMAX * (1 + M.rubberband(v / KMAX - 1, 1, .3)) : v < KMIN ? KMIN / (1 + M.rubberband(KMIN / v - 1, 1, .3)) : v; }
  var lastK = null, renderedK = null, renderFrame = 0, layoutTimer = 0, layoutDirty = true;
  var dpr = Math.max(1, window.devicePixelRatio || 1);
  function snap(v){return Math.round(v*dpr)/dpr;}
  function requestLabelLayout(delay){
    clearTimeout(layoutTimer);
    layoutTimer=setTimeout(function(){layoutTimer=0;layoutDirty=true;requestRender();},delay==null?84:delay);
  }
  function placeLabels(reflow){
    var zoomChanged=renderedK===null||Math.abs(renderedK-k)>.00001;
    var panX=snap(tx),panY=snap(ty);
    labelCanvas.style.transform='translate3d('+panX+'px,'+panY+'px,0)';
    if(zoomChanged){
      labels.forEach(function(l){
        var station=StationCatalog[l.n],lx=snap(station.x*S*k+10),ly=snap(station.y*S*k-24);
        l.sx=lx;l.sy=ly;l.el.style.transform='translate3d('+lx+'px,'+ly+'px,0)';
      });
      renderedK=k;
    }
    if(!reflow)return;
    var occupied=[],vr=view.getBoundingClientRect(),scale=vr.width/VW;
    /* Endpoint pills are in the map world. Clamp them only after camera motion
       settles; reading their rectangles on every pointer event forced layout. */
    world.querySelectorAll('.fend b,.fsel b').forEach(function(n){
      n.style.left='0px';var r=n.getBoundingClientRect(),left=(r.left-vr.left)/scale,right=(r.right-vr.left)/scale;
      var shift=left<10?10-left:right>VW-10?VW-10-right:0;n.style.left=shift+'px';r=n.getBoundingClientRect();
      if(r.width)occupied.push({x:(r.left-vr.left)/scale,y:(r.top-vr.top)/scale,w:r.width/scale,h:r.height/scale});
    });
    function priority(l){var c=StationCatalog[l.n];return (l.el.classList.contains('route-label')?100:0)+(c.terminal?8:0)+c.lines.length;}
    labels.slice().sort(function(a,b){return priority(b)-priority(a);}).forEach(function(l){
      var node=l.el,station=StationCatalog[l.n],w=l.width||(l.width=node.offsetWidth||l.w),x=panX+l.sx,y=panY+l.sy;
      var selected=node.classList.contains('route-label');
      var show=x>8&&x+w<VW-8&&y>125&&y<VH-24&&(selected||k>.38||station.terminal||station.lines.length>2);
      show=show&&!node.classList.contains('endpoint-label')&&!node.classList.contains('selected-label')&&!occupied.some(function(b){return x<b.x+b.w+6&&x+w+6>b.x&&y<b.y+(b.h||18)&&y+18>b.y;});
      node.style.visibility=show?'visible':'hidden';if(show)occupied.push({x:x,y:y,w:w});
    });
    layoutDirty=false;
  }
  function render(){
    renderFrame=0;
    var panX=snap(tx),panY=snap(ty);
    /* The vector world and label canvas commit in this same display frame. */
    world.style.transform='translate3d('+panX+'px,'+panY+'px,0) scale('+k+')';
    placeLabels(layoutDirty);
    if(lastK===null||Math.abs(lastK-k)>.00001){
      world.style.setProperty('--ms',(1/k).toFixed(6));world.style.setProperty('--map-k',k);
      world.style.setProperty('--ls',(1/Math.sqrt(k)).toFixed(3));
      world.style.setProperty('--hs',Math.max(1,44/(32*k)).toFixed(3));
      window.MapCtx&&window.MapCtx.onCam&&window.MapCtx.onCam(k);
      zbtn.in&&zbtn.in.setAttribute('aria-disabled',k>=KMAX-.01);
      zbtn.out&&zbtn.out.setAttribute('aria-disabled',k<=KMIN+.01);
      world.classList.toggle('zoom-wide',k<.7);labelLayer.classList.toggle('zoom-wide',k<.7);lastK=k;
    }
  }
  function requestRender(){if(!renderFrame)renderFrame=requestAnimationFrame(render);}
  function apply(){requestRender();requestLabelLayout();}
  function scheduleLabels(){layoutDirty=true;requestRender();}
  function rect() { return view.getBoundingClientRect(); }
  function local(e) { var r = rect(), f = r.width / (view.offsetWidth || 390); return { x: (e.clientX - r.left) / f, y: (e.clientY - r.top) / f }; }
  function setZoomAt(kk, cx, cy, elastic) {          /* keep the world point under (cx,cy) fixed */
    var wx = (cx - tx) / k, wy = (cy - ty) / k;
    k = elastic ? softK(kk) : M.clamp(kk, KMIN, KMAX);
    tx = cx - wx * k; ty = cy - wy * k;
    if (!elastic) { tx = hard(tx, bx(k)); ty = hard(ty, by(k)); }
    else { tx = soft(tx, bx(k), VW); ty = soft(ty, by(k), VH); }
    apply();
  }
  var sp = { x: null, y: null, z: null, f: null }, zt = null;
  function stopAll() { ['x', 'y', 'z', 'f'].forEach(function (a) { if (sp[a]) { sp[a].stop(); sp[a] = null; } }); }
  function zoomAnim(target, cx, cy, resp) {            /* interruptible spring on zoom (wheel, buttons, double-tap) */
    target = M.clamp(target, KMIN, KMAX); var C = { x: cx, y: cy }; zt = target;
    if (sp.z) { sp.z.C = C; sp.z.retarget(target); return; }
    stopAll();
    var s = M.spring({ from: k, to: target, response: resp || .32, damping: 1, precision: .0005,
      onUpdate: function (v) { var cc = (s && s.C) || C; setZoomAt(v, cc.x, cc.y, false); }, onDone: function () { if (sp.z === s) sp.z = null; zt = null; } });
    s.C = C; if (zt != null) sp.z = s;
  }
  function settle(vx, vy, cx, cy) {                    /* after a gesture: snap back inside bounds, carry momentum */
    stopAll();
    var tk = M.clamp(k, KMIN, KMAX), x0 = tx, y0 = ty, k0 = k;
    if (Math.abs(tk - k) > .001) {                     /* zoom was elastic → spring zoom back, anchored at gesture centre */
      var wx = (cx - tx) / k, wy = (cy - ty) / k, tx1 = hard(cx - wx * tk, bx(tk)), ty1 = hard(cy - wy * tk, by(tk));
      sp.z = M.spring({ from: 0, to: 1, response: .38, damping: 1, precision: .001, onUpdate: function (p) {
        k = k0 + (tk - k0) * p; tx = x0 + (tx1 - x0) * p; ty = y0 + (ty1 - y0) * p; apply(); }, onDone: function () { sp.z = null; } });
      return;
    }
    /* A short, critically damped coast feels direct on a dense schematic. */
    vx=M.clamp(vx,-1200,1200);vy=M.clamp(vy,-1200,1200);
    var bX = bx(k), bY = by(k);
    var gx = hard(x0 + M.project(vx,.987), bX), gy = hard(y0 + M.project(vy,.987), bY);
    var outX = tx < bX[0] || tx > bX[1], outY = ty < bY[0] || ty > bY[1];
    sp.x = M.spring({ from: tx, to: gx, velocity: vx, response: .24, damping: 1, precision: .05, onUpdate: function (v) { tx = v; apply(); }, onDone: function () { sp.x = null; } });
    sp.y = M.spring({ from: ty, to: gy, velocity: vy, response: .24, damping: 1, precision: .05, onUpdate: function (v) { ty = v; apply(); }, onDone: function () { sp.y = null; } });
  }

  var ptr = {}, mode = null, g0 = null, moved = false, tr = M.tracker(), lastC = { x: 195, y: 400 }, lastTap = null;
  function ids() { return Object.keys(ptr); }
  function two() { var a = ptr[ids()[0]], b = ptr[ids()[1]]; return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  view.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.ui,.sp,.routebtn,.zoomctl')) return;
    if (e.pointerType === 'mouse' && e.button > 0) return;
    stopAll(); measure(); ptr[e.pointerId] = local(e);view.classList.add('camera-moving');
    if (ids().length === 1) { mode = 'pan'; moved = false; g0 = { x: ptr[e.pointerId].x, y: ptr[e.pointerId].y, tx: tx, ty: ty }; tr.reset(); tr.push(g0.x, g0.y); }
    else if (ids().length === 2) {
      var t = two(); mode = 'pinch'; moved = true; g0 = { d: t.d, k: k, wx: (t.x - tx) / k, wy: (t.y - ty) / k };
      ids().forEach(function (id) { try { view.setPointerCapture(+id); } catch (_) {} }); view.classList.add('drag');
    }
  });
  view.addEventListener('pointermove', function (e) {
    if (!ptr[e.pointerId]) return;
    ptr[e.pointerId] = local(e);
    if (mode === 'pinch' && ids().length >= 2) {
      var t = two(); lastC = { x: t.x, y: t.y };
      k = softK(g0.k * t.d / g0.d);
      tx = soft(t.x - g0.wx * k, bx(k), VW); ty = soft(t.y - g0.wy * k, by(k), VH); apply();
    } else if (mode === 'pan') {
      var p = ptr[e.pointerId], dx = p.x - g0.x, dy = p.y - g0.y;
      if (!moved) {
        if (Math.abs(dx) + Math.abs(dy) < 5) return;
        moved = true; view.classList.add('drag'); try { view.setPointerCapture(e.pointerId); } catch (_) {}
        document.activeElement && document.activeElement.blur && document.activeElement.blur();
      }
      tr.push(p.x, p.y); lastC = { x: p.x, y: p.y };
      tx = soft(g0.tx + dx, bx(k), VW); ty = soft(g0.ty + dy, by(k), VH); apply();
    }
  });
  function up(e) {
    if (!ptr[e.pointerId]) return;
    var p = ptr[e.pointerId]; delete ptr[e.pointerId];
    var n = ids().length;
    if (mode === 'pinch') {
      if (n === 1) { var q = ptr[ids()[0]]; mode = 'pan'; g0 = { x: q.x, y: q.y, tx: tx, ty: ty }; tr.reset(); tr.push(q.x, q.y); moved = true; return; }  /* lifting one finger: keep panning with the other */
      if (n === 0) { mode = null; view.classList.remove('drag','camera-moving'); settle(0, 0, lastC.x, lastC.y); }
      return;
    }
    if (n === 0 && mode === 'pan') {
      mode = null; view.classList.remove('drag','camera-moving');
      if (moved) { var v = tr.velocity(); settle(e.type === 'pointercancel' ? 0 : v.x, e.type === 'pointercancel' ? 0 : v.y, p.x, p.y); }
      else if (e.type === 'pointerup' && !e.target.closest('a')) {      /* double-tap on empty map → zoom */
        var now = performance.now();
        if (lastTap && now - lastTap.t < 320 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 28) { lastTap = null; zoomAnim(k > 1.8 ? 1 : Math.min(KMAX, k * 2.4), p.x, p.y, .36); }
        else lastTap = { t: now, x: p.x, y: p.y };
      }
    }
  }
  view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
  view.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  view.addEventListener('dragstart', function (e) { e.preventDefault(); });
  view.addEventListener('dblclick', function (e) { if (e.pointerType === 'touch' || e.target.closest('a')) return; measure(); var p = local(e); zoomAnim(k > 1.8 ? 1 : Math.min(KMAX, k * 2.4), p.x, p.y, .36); });
  /* wheel / trackpad pinch (ctrl+wheel) → smooth, interruptible zoom around the cursor */
  var wt = null;
  view.addEventListener('wheel', function (e) {
    if (e.target.closest('.ui,.sp')) return;
    e.preventDefault(); measure();
    var d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY, p = local(e);
    wt = M.clamp((zt == null ? k : zt) * Math.exp(-d * (e.ctrlKey ? .01 : .0017)), KMIN, KMAX);
    zoomAnim(wt, p.x, p.y, .26);
  }, { passive: false });
  /* buttons + keyboard */
  function step(f) { measure(); zoomAnim((zt == null ? k : zt) * f, VW / 2, VH / 2, .34); }
  zbtn.in && zbtn.in.addEventListener('click', function () { step(1.7); });
  zbtn.out && zbtn.out.addEventListener('click', function () { step(1 / 1.7); });
  document.addEventListener('keydown', function (e) {
    if (/INPUT|TEXTAREA/.test((e.target.tagName || ''))) return;
    if (e.key === '+' || e.key === '=') step(1.5); else if (e.key === '-' || e.key === '_') step(1 / 1.5);
  });


  /* ---------- camera API for the flow layer: spring fly-to / fit-bounds (interruptible: any touch stops it) ---------- */
  function flyTo(wx, wy, kk, ax, ay, resp) {
    measure(); stopAll(); kk = M.clamp(kk, KMIN, KMAX);
    var k0 = k, c0x = (ax - tx) / k, c0y = (ay - ty) / k;
    function put(p) { var kp = k0 * Math.pow(kk / k0, p), cx = c0x + (wx - c0x) * p, cy = c0y + (wy - c0y) * p; k = kp; tx = ax - cx * kp; ty = ay - cy * kp; apply(); }
    if (M.reduced) { put(1); return; }
    sp.f = M.spring({ from: 0, to: 1, response: resp || .34, damping: 1, precision: .0008, onUpdate: put, onDone: function () { sp.f = null; } });
  }
  function fit(b, pad, maxK, resp) {
    measure(); pad = pad || {}; var pt = pad.t || 0, pr = pad.r || 0, pb = pad.b || 0, pl = pad.l || 0;
    var rw = Math.max(80, VW - pl - pr), rh = Math.max(80, VH - pt - pb), bw = Math.max(40, b.x1 - b.x0), bh = Math.max(40, b.y1 - b.y0);
    var kk = M.clamp(Math.min(rw / bw, rh / bh, maxK || KMAX), KMIN, KMAX);
    flyTo((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, kk, pl + rw / 2, pt + rh / 2, resp);
  }
  window.MapCtx = { N: N, S: S, svg: svg, defs: defs, base: base, hl: hl, ov: ov, world: world, view: view, labelLayer: labelLayer, labelCanvas: labelCanvas, el: el, sc: sc, div: div, slugs: slugs,
    linePaths: linePaths, lineOff: lineOff, slug: slug, labels: labels, refreshLabels: scheduleLabels, glowOn: glowOn, glowOff: glowOff, url: url,
    cam: { flyTo: flyTo, fit: fit, stop: stopAll, get: function () { measure(); return { k: k, tx: tx, ty: ty, VW: VW, VH: VH }; }, zoomBy: step, measure: measure,
           toScreen: function (x, y) { return [tx + x * k, ty + y * k]; } } };

  /* initial view: Central as in Figma; other lines gently centred. Then a single brief highlight pulse. */
  measure();
  var fpaths = linePaths(slug), foff = lineOff(slug);
  if (slug === 'central') { tx = DEF[0]; ty = DEF[1]; }
  else {
    var tmp = sc(svg, foff); fpaths.forEach(function (d) { el('path', { d: d }, tmp); });
    var bb = tmp.getBBox(); tmp.remove();
    tx = VW / 2 - (bb.x + bb.width / 2 + foff[0]) * S; ty = VH * .47 - (bb.y + bb.height / 2 + foff[1]) * S;
  }
  tx = hard(tx, bx(k)); ty = hard(ty, by(k)); apply();
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){labels.forEach(function(l){l.width=0;});scheduleLabels();});
  function relayout() { measure(); setZoomAt(k, VW / 2, VH / 2, false); }
  window.addEventListener('shellfit', relayout); window.addEventListener('resize', relayout);
  // No automatic glow over an idle map.
  document.querySelector('[data-back]').addEventListener('click', function () { history.length > 1 ? history.back() : location.href = 'index.html#overview'; });
  window.dispatchEvent(new CustomEvent('mapready'));
  Motion.press && Motion.press(document.body, '.ui.chip,.stackbtn,.routebtn,.zbtn', .94);
})();

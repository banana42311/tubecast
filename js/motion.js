/* Tubecast motion kit — Apple-style fluid interaction primitives for the web.
   Principles (WWDC "Designing Fluid Interfaces"): respond on pointer-down, 1:1 tracking, interruptible springs
   that start from the live (presentation) value, release-velocity hand-off, momentum projection, rubber-banding.
   Pure JS, no dependencies.  window.Motion = { reduced, spring, project, rubberband, tracker, drag, pager, press, snap }  */
(function () {
  var mqReduce = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var M = { get reduced() { return mqReduce.matches; } };

  /* ---------- spring (Apple "response" + "dampingRatio", mass 1) ---------- */
  M.spring = function (o) {
    o = o || {};
    var resp = o.response || 0.35, zeta = o.damping == null ? 1 : o.damping;
    var k = Math.pow(2 * Math.PI / resp, 2), c = 4 * Math.PI * zeta / resp;
    var x = o.from || 0, v = o.velocity || 0, to = o.to || 0, raf = 0, last = 0, done = false;
    var eps = o.precision || 0.01;
    function frame(t) {
      var dt = Math.min(0.1, (t - last) / 1000 || 0.016); last = t;
      var n = Math.ceil(dt / 0.004), h = dt / n;
      for (var i = 0; i < n; i++) { var a = -k * (x - to) - c * v; v += a * h; x += v * h; }
      if (Math.abs(x - to) < eps && Math.abs(v) < eps * 4) { x = to; v = 0; done = true; }
      o.onUpdate && o.onUpdate(x, v);
      if (done) { raf = 0; o.onDone && o.onDone(); } else raf = requestAnimationFrame(frame);
    }
    var api = {
      get value() { return x; }, get velocity() { return v; },
      stop: function () { if (raf) cancelAnimationFrame(raf); raf = 0; return x; },
      retarget: function (nt, nv) { to = nt; if (nv != null) v = nv; done = false; if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } return api; }
    };
    if (M.reduced) { x = to; o.onUpdate && o.onUpdate(x, 0); o.onDone && o.onDone(); return api; }
    last = performance.now(); raf = requestAnimationFrame(frame);
    return api;
  };

  /* where a flick would come to rest (iOS scroll deceleration) */
  M.project = function (v /* px/s */, rate) { rate = rate || 0.998; return (v / 1000) * rate / (1 - rate); };
  /* progressive resistance past a bound */
  M.rubberband = function (over, dim, c) { c = c || 0.55; var s = over < 0 ? -1 : 1; over = Math.abs(over); return s * (over * dim * c) / (dim + c * over); };
  M.clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  /* nearest snap point to p */
  M.snap = function (p, pts) { var best = pts[0], d = Infinity; pts.forEach(function (q) { var e = Math.abs(q - p); if (e < d) { d = e; best = q; } }); return best; };

  /* ---------- velocity tracker (last ~100 ms) ---------- */
  M.tracker = function () {
    var h = [];
    return {
      reset: function () { h.length = 0; },
      push: function (x, y, t) { h.push({ x: x, y: y, t: t || performance.now() }); while (h.length > 2 && h[h.length - 1].t - h[0].t > 100) h.shift(); },
      velocity: function () {
        if (h.length < 2) return { x: 0, y: 0 };
        var a = h[0], b = h[h.length - 1], dt = (b.t - a.t) / 1000;
        if (dt <= 0) return { x: 0, y: 0 };
        return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
      }
    };
  };

  /* ---------- pointer drag with hysteresis + axis intent + capture ---------- */
  /* opts: axis 'x'|'y'|'both', threshold (px), onStart(e), onMove({dx,dy,x,y,e}), onEnd({dx,dy,vx,vy,e}), filter(e)->bool */
  M.drag = function (el, o) {
    var thr = o.threshold == null ? 8 : o.threshold, axis = o.axis || 'both';
    var st = null, tr = M.tracker();
    el.style.touchAction = axis === 'x' ? 'pan-y' : axis === 'y' ? 'pan-x' : 'none';
    el.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button > 0) return;
      if (o.filter && !o.filter(e)) return;
      st = { id: e.pointerId, x0: e.clientX, y0: e.clientY, on: false };
      tr.reset(); tr.push(e.clientX, e.clientY);
      o.onDown && o.onDown(e);
    });
    el.addEventListener('pointermove', function (e) {
      if (!st || e.pointerId !== st.id) return;
      var dx = e.clientX - st.x0, dy = e.clientY - st.y0;
      if (!st.on) {
        var ax = Math.abs(dx), ay = Math.abs(dy);
        if (Math.max(ax, ay) < thr) return;
        var bias=o.axisBias||1;
        if ((axis === 'x' && ay > ax*bias) || (axis === 'y' && ax > ay*bias)) { st=null;o.onCancel&&o.onCancel();return; } /* lose to scroll */
        st.on = true; try { el.setPointerCapture(e.pointerId); } catch (_) {}
        if(!o.keepOrigin){st.x0=e.clientX;st.y0=e.clientY;dx=0;dy=0;} /* pagers retain the initial movement */
        o.onStart && o.onStart(e);
      }
      tr.push(e.clientX, e.clientY);
      o.onMove && o.onMove({ dx: dx, dy: dy, x: e.clientX, y: e.clientY, e: e });
    });
    function end(e) {
      if (!st || e.pointerId !== st.id) return;
      var was = st.on, dx = e.clientX - st.x0, dy = e.clientY - st.y0, v = tr.velocity();
      st = null;
      if (was) o.onEnd && o.onEnd({ dx: dx, dy: dy, vx: v.x, vy: v.y, e: e });
      else o.onTap && o.onTap(e);
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    return { cancel: function () { st = null; } };
  };

  /* ---------- horizontal pager: 1:1 drag, projection, edge rubber-band, interruptible spring ---------- */
  /* opts: track (element translated in X), count, index, width() -> page width px, onIndex(i), onProgress(x,pageW),
           response (0.35), damping (1; 0.85 when released with a flick) */
  M.pager = function (o) {
    var idx = o.index || 0, x = 0, sp = null, W = o.width ? o.width() : o.track.parentNode.clientWidth;
    function paint(v) { x = v; o.track.style.transform = 'translate3d(' + v + 'px,0,0)'; o.onProgress && o.onProgress(v, W); }
    function go(i, v, instant) {
      i = M.clamp(i, 0, o.count - 1);
      var changed = i !== idx; idx = i; W = o.width ? o.width() : W;
      if (sp) sp.stop();
      o.root && o.root.classList.add('is-moving');
      if (changed) o.onIndex && o.onIndex(idx);
      function settled(){sp=null;o.root&&o.root.classList.remove('is-moving');o.onSettle&&o.onSettle(idx);}
      if (instant || M.reduced) { paint(-idx * W);settled(); } else {
        sp = M.spring({ from:x,to:-idx*W,velocity:v||0,response:o.response||.22,damping:Math.abs(v||0)>600?(o.flickDamping||.95):1,precision:.6,onUpdate:paint,onDone:settled });
      }
    }
    function effectiveCancel(d){return d.e&&d.e.type==='pointercancel';}
    var base = 0,suppressClick=false;
    (o.root||o.track.parentNode).addEventListener('click',function(e){if(suppressClick){e.preventDefault();e.stopImmediatePropagation();suppressClick=false;}},true);
    M.drag(o.root || o.track.parentNode, {
      axis: 'x', threshold: 4, axisBias:1.35, keepOrigin:true, filter: o.filter,
      onDown: function () { suppressClick=false;if (sp) { x = sp.stop(); } W = o.width ? o.width() : W; base = x; },
      onStart: function () { suppressClick=true;o.onPrepare&&o.onPrepare(idx);o.root&&o.root.classList.add('dragging','is-moving'); },
      onCancel:function(){go(idx);},
      onTap: function () { if(Math.abs(x+idx*W)>.4)go(idx);else{o.root&&o.root.classList.remove('is-moving');} },
      onMove: function (d) {
        var nx = base + d.dx, min = -(o.count - 1) * W, max = 0;
        if (nx > max) nx = M.rubberband(nx - max, W);
        else if (nx < min) nx = min + M.rubberband(nx - min, W);
        paint(nx);
      },
      onEnd: function (d) {
        o.root && o.root.classList.remove('dragging');
        var distance=Math.abs(d.dx),flick=distance>=10&&Math.abs(d.vx)>=220;
        var target=idx;
        if(flick)target=idx+(d.vx<0?1:-1);
        else if(distance>=Math.min(28,W*.075))target=idx+(d.dx<0?1:-1);
        go(effectiveCancel(d)?idx:target,d.e.type==='pointercancel'?0:d.vx);
      }
    });
    window.addEventListener('resize', function () { W = o.width ? o.width() : W; paint(-idx * W); });
    paint(-idx * W);
    return { go: go, get index() { return idx; }, relayout: function () { W = o.width ? o.width() : W; paint(-idx * W); } };
  };

  /* ---------- press feedback: instant on pointer-down, spring back on release ---------- */
  M.press = function (root, sel, scale) {
    scale = scale || 0.97;
    root.addEventListener('pointerdown', function (e) { var t = e.target.closest(sel); if (t) { t.style.transition = 'transform 90ms ease-out'; t.style.transform = 'scale(' + scale + ')'; } });
    function up(e) { var t = e.target.closest && e.target.closest(sel); if (t) { t.style.transition = 'transform .32s cubic-bezier(.25,.8,.25,1)'; t.style.transform = ''; } }
    root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up); root.addEventListener('pointerleave', up, true);
  };

  window.Motion = M;
})();

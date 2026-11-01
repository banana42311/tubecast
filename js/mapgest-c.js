/* Pan / pinch / wheel / double-tap gestures for a transformed "world" element (route.html, station.html).
   Pointer Events, interruptible springs, release-velocity hand-off, rubber-banded edges. Needs js/motion.js. */
(function () {
  var M = window.Motion;
  window.MapGest = function (o) {
    var view = o.view, world = o.world, phone = o.phone || view, W = o.designW || 390;
    var t = { x: o.x || 0, y: o.y || 0, z: o.z || 1 }, minZ = o.minZ || 0.6, maxZ = o.maxZ || 5;
    var sp = [null, null, null], ptrs = {}, g = null, p2 = null, moved = false, tr = M.tracker(), lastTap = 0, lastTapAt = null, api = {};
    function k() { var w = phone.getBoundingClientRect().width; return w ? w / W : 1; }
    function local(e) { var r = phone.getBoundingClientRect(), s = k(); return [(e.clientX - r.left) / s, (e.clientY - r.top) / s]; }
    function paint() { world.style.transform = 'translate3d(' + t.x + 'px,' + t.y + 'px,0) scale(' + t.z + ')'; world.style.setProperty('--z', t.z); o.onChange && o.onChange(t); }
    function lim() {
      var b = o.bounds(), V = o.viewSize(), m = o.margin || 90;
      var r = { xmin: m - b.x1 * t.z, xmax: V.w - m - b.x0 * t.z, ymin: m - b.y1 * t.z, ymax: V.h - m - b.y0 * t.z };
      if (r.xmin > r.xmax) r.xmin = r.xmax = (r.xmin + r.xmax) / 2;
      if (r.ymin > r.ymax) r.ymin = r.ymax = (r.ymin + r.ymax) / 2;
      return r;
    }
    function soft(v, a, b, dim) { return v < a ? a + M.rubberband(v - a, dim) : v > b ? b + M.rubberband(v - b, dim) : v; }
    function stopAll() { for (var i = 0; i < 3; i++) if (sp[i]) { sp[i].stop(); sp[i] = null; } }
    function glide(x, y, z, vx, vy) {
      stopAll();
      var ts = t, R = { response: 0.42, damping: 1 };
      sp[0] = M.spring({ from: t.x, to: x, velocity: vx || 0, response: R.response, damping: R.damping, onUpdate: function (v) { t.x = v; paint(); } });
      sp[1] = M.spring({ from: t.y, to: y, velocity: vy || 0, response: R.response, damping: R.damping, onUpdate: function (v) { t.y = v; paint(); } });
      if (z != null && z !== t.z) sp[2] = M.spring({ from: t.z, to: z, response: R.response, damping: R.damping, onUpdate: function (v) { t.z = v; paint(); } });
    }
    function settle(vx, vy) {
      var L = lim(), tx = M.clamp(t.x + M.project(vx || 0, 0.99), L.xmin, L.xmax), ty = M.clamp(t.y + M.project(vy || 0, 0.99), L.ymin, L.ymax);
      glide(tx, ty, null, vx, vy);
    }
    api.t = t;
    api.set = function (x, y, z, instant) { z = M.clamp(z, minZ, maxZ); if (instant || M.reduced) { stopAll(); t.x = x; t.y = y; t.z = z; paint(); } else glide(x, y, z); };
    api.screen = function (wx, wy) { return [t.x + wx * t.z, t.y + wy * t.z]; };
    api.zoomAt = function (f, cx, cy, instant) { var z = M.clamp(t.z * f, minZ, maxZ), wx = (cx - t.x) / t.z, wy = (cy - t.y) / t.z; api.set(cx - wx * z, cy - wy * z, z, instant); };
    api.fit = function (b, r, instant, maxFit) {
      var bw = Math.max(1, b.x1 - b.x0), bh = Math.max(1, b.y1 - b.y0), z = M.clamp(Math.min(r.w / bw, r.h / bh), minZ, maxFit || 2.4);
      api.set(r.x + r.w / 2 - (b.x0 + bw / 2) * z, r.y + r.h / 2 - (b.y0 + bh / 2) * z, z, instant);
    };
    api.panIntoView = function (wx, wy, r) {
      var s = api.screen(wx, wy), dx = 0, dy = 0;
      if (s[0] < r.x) dx = r.x - s[0]; else if (s[0] > r.x + r.w) dx = r.x + r.w - s[0];
      if (s[1] < r.y) dy = r.y - s[1]; else if (s[1] > r.y + r.h) dy = r.y + r.h - s[1];
      if (dx || dy) api.set(t.x + dx, t.y + dy, t.z);
    };
    api.moved = false;

    view.style.touchAction = 'none';
    view.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      stopAll(); ptrs[e.pointerId] = local(e); var n = Object.keys(ptrs).length;
      if (n === 1) { g = { x: t.x, y: t.y, p: local(e) }; moved = false; tr.reset(); tr.push(local(e)[0], local(e)[1]); }
      else if (n === 2) {
        var a = ptrs[Object.keys(ptrs)[0]], b = ptrs[Object.keys(ptrs)[1]], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        p2 = { d0: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, z0: t.z, wx: (mx - t.x) / t.z, wy: (my - t.y) / t.z }; moved = true;
        try { view.setPointerCapture(e.pointerId); } catch (_) {}
      }
    });
    view.addEventListener('pointermove', function (e) {
      if (!ptrs[e.pointerId]) return;
      ptrs[e.pointerId] = local(e); var ids = Object.keys(ptrs);
      if (ids.length >= 2 && p2) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        var z = M.clamp(p2.z0 * d / p2.d0, minZ, maxZ); t.z = z; t.x = mx - p2.wx * z; t.y = my - p2.wy * z; paint(); api.moved = true; return;
      }
      if (!g) return;
      var p = local(e), dx = p[0] - g.p[0], dy = p[1] - g.p[1];
      if (!moved) { if (Math.hypot(dx, dy) < 6) return; moved = true; api.moved = true; try { view.setPointerCapture(e.pointerId); } catch (_) {} g.p = p; g.x = t.x; g.y = t.y; dx = 0; dy = 0; o.onDragStart && o.onDragStart(); }
      var L = lim(); t.x = soft(g.x + dx, L.xmin, L.xmax, 300); t.y = soft(g.y + dy, L.ymin, L.ymax, 300); tr.push(p[0], p[1]); paint();
    });
    function up(e) {
      if (!ptrs[e.pointerId]) return;
      var wasPinch = !!p2, p = ptrs[e.pointerId]; delete ptrs[e.pointerId]; var ids = Object.keys(ptrs);
      if (ids.length === 1) { var q = ptrs[ids[0]]; g = { x: t.x, y: t.y, p: q }; p2 = null; tr.reset(); return; }
      if (ids.length > 0) return;
      p2 = null; var was = moved; g = null;
      if (was) { var v = wasPinch ? { x: 0, y: 0 } : tr.velocity(); settle(v.x, v.y); }
      else if (e.type === 'pointerup') {
        var now = e.timeStamp;
        if (now - lastTap < 320 && lastTapAt && Math.hypot(p[0] - lastTapAt[0], p[1] - lastTapAt[1]) < 24 && !(e.target.closest && e.target.closest('[data-nodbl]'))) { api.zoomAt(2, p[0], p[1]); lastTap = 0; }
        else { lastTap = now; lastTapAt = p; }
        o.onTap && o.onTap(e, p);
      }
    }
    view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
    view.addEventListener('wheel', function (e) {
      e.preventDefault(); stopAll();
      var p = local(e);
      if (e.ctrlKey || (!o.wheelPans && Math.abs(e.deltaY) >= Math.abs(e.deltaX))) {
        var f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0022)); api.zoomAt(f, p[0], p[1], true);
      } else { var L = lim(); t.x = M.clamp(t.x - e.deltaX / k(), L.xmin, L.xmax); t.y = M.clamp(t.y - e.deltaY / k(), L.ymin, L.ymax); paint(); }
      api.moved = true; o.onDragStart && o.onDragStart();
    }, { passive: false });
    view.addEventListener('keydown', function (e) {
      if (e.target !== view) return;
      var st = 40, L = lim(), h = true;
      if (e.key === 'ArrowLeft') api.set(t.x + st, t.y, t.z); else if (e.key === 'ArrowRight') api.set(t.x - st, t.y, t.z);
      else if (e.key === 'ArrowUp') api.set(t.x, t.y + st, t.z); else if (e.key === 'ArrowDown') api.set(t.x, t.y - st, t.z);
      else if (e.key === '+' || e.key === '=') api.zoomAt(1.4, W / 2, (o.viewSize().h) / 2); else if (e.key === '-') api.zoomAt(1 / 1.4, W / 2, (o.viewSize().h) / 2); else h = false;
      if (h) e.preventDefault();
    });
    paint();
    return api;
  };
})();

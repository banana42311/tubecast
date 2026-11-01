/* FlowSheet — one bottom sheet for the whole map hub. Snap points peek / mid / full (+ dismiss),
   1:1 drag with rubber-band, release velocity projected onto the nearest snap, interruptible spring.
   Content is swapped in place with a short crossfade (never a page jump).
   FlowSheet.create(phone, {onChange(vis, settled), onTarget(vis), onDismiss()}) → api */
(function () {
  var M = window.Motion;
  function create(phone, cb) {
    cb = cb || {};
    var root = document.createElement('div'); root.className = 'fsheet'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label','Station and journey details'); root.hidden = true;
    root.innerHTML = '<div class="fs-grab" aria-hidden="true"><i></i></div><div class="fs-scroll"><div class="fs-pane"></div></div>';
    phone.appendChild(root);
    var scroller = root.querySelector('.fs-scroll'), pane = root.querySelector('.fs-pane');
    var VH = 844, vis = 0, snap = null, sp = null, dismissible = true, busy = null;

    function pts() { VH = phone.clientHeight || 844; return { peek: Math.min(168, VH * .24), mid: Math.round(VH * (VH < 700 ? .62 : .5)), full: Math.max(160, VH - 76) }; }
    function paint(v) { vis = v; root.style.transform = 'translate3d(0,' + (VH - v) + 'px,0)'; cb.onChange && cb.onChange(v, false); }
    function animate(to, vel, done) {
      if (sp) sp.stop();
      root.style.setProperty('--fsb', Math.max(0, VH-to)+'px');
      sp = M.spring({ from: vis, to: to, velocity: -(vel || 0), response: .32, damping: Math.abs(vel || 0) > 500 ? .84 : 1, precision: .3,
        onUpdate: paint, onDone: function () { sp = null; paint(to); root.style.setProperty('--fsb', Math.max(0, VH - to) + 'px'); cb.onChange && cb.onChange(to, true); done && done(); } });
    }
    function setScroll() { scroller.classList.add('on'); }

    var api = {
      el: root, pane: pane,
      get snap() { return snap; },
      get visible() { return vis; },
      get isOpen() { return !root.hidden; },
      points: pts,
      snapTo: function (name, vel) {
        var P = pts(); snap = name; setScroll(); root.classList.toggle('full', name === 'full');
        cb.onTarget && cb.onTarget(P[name]); animate(P[name], vel);
      },
      open: function (html, name, opts) {
        opts = opts || {}; dismissible = opts.dismissible !== false;
        var was = !root.hidden; root.hidden = false; pts();
        if (!was) { vis = 0; root.style.transform = 'translate3d(0,' + VH + 'px,0)'; }
        if (html != null) this.setContent(html, was && !opts.instant);
        this.snapTo(name || 'mid');
      },
      setContent: function (html, morph) {
        function put() {
          if (typeof html === 'string') pane.innerHTML = html; else { pane.innerHTML = ''; pane.appendChild(html); }
          scroller.scrollTop = 0; pane.classList.remove('out'); pane.classList.add('in'); void pane.offsetWidth; pane.classList.remove('in');
          cb.onContent && cb.onContent(pane);
        }
        clearTimeout(busy);
        put();

      },
      close: function (silent) {
        clearTimeout(busy); if (root.hidden) return; snap = null; cb.onTarget && cb.onTarget(0);
        animate(0, 0, function () { root.hidden = true; if (!silent) cb.onDismiss && cb.onDismiss(); });
        if (silent) { /* hidden after the spring ends; no dismiss callback */ }
      }
    };

    /* ---- drag ---- */
    var base = 0;
    M.drag(root, {
      axis: 'y', threshold: 6,
      filter: function (e) {
        if (e.target.closest('button,a,input,[data-nodrag]')) return !!e.target.closest('.fs-grab');
        if (!e.target.closest('.fs-grab,.fs-head')) return false;
        return true;
      },
      onDown: function () { if (sp) { sp.stop(); sp = null; } pts(); base = vis; },
      onStart: function () { root.classList.add('dragging'); },
      onMove: function (d) {
        var P = pts(), v = base - d.dy / ((window.Shell && Shell.scale) || 1);
        if (v > P.full) v = P.full + M.rubberband(v - P.full, VH * .5, .5);
        var floor = dismissible ? 0 : P.peek;
        if (v < floor) v = floor - M.rubberband(floor - v, VH * .3, .5) * (dismissible ? 0 : 1) * 1;
        paint(Math.max(0, v));
      },
      onEnd: function (d) {
        root.classList.remove('dragging');
        var P = pts(), proj = vis - M.project(d.vy / ((window.Shell && Shell.scale) || 1)), choices = [['peek', P.peek], ['mid', P.mid], ['full', P.full]], best = null, bd = 1e9;
        choices.forEach(function (c) { var e = Math.abs(c[1] - proj); if (e < bd) { bd = e; best = c; } });
        if (dismissible && proj < P.peek * .55) { api.close(); return; }
        api.snapTo(best[0], d.vy / ((window.Shell && Shell.scale) || 1));
      }
    });
    root.style.touchAction='auto'; // only the handle/header captures vertical drag; content scrolls natively
    window.addEventListener('shellfit', function () { if (!root.hidden && snap) { var P = pts(); paint(P[snap]); cb.onChange && cb.onChange(P[snap], true); } });
    return api;
  }
  window.FlowSheet = { create: create };
})();

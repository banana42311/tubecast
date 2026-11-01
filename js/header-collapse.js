/* Weather-style collapsing header, scroll-linked (no time-based animation).
   HeaderCollapse.attach(host, scrollEl) -> { set(title, num, sub, color), update() }
   - p (0..1) = scrollTop / RANGE is written to the host as --p (CSS can hook it).
   - the large hero fades + scales and drifts slower than the content (individual CSS `translate`/`scale`, so it never
     fights the entrance animation's transform)
   - a compact sticky header (title, then "number | status") fades in over the last part of the collapse, over a
     progressive blur so cards slide underneath it
   - the map/background artwork parallaxes at ~0.45x of the scroll speed. */
(function () {
  var RANGE = 96, clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  window.HeaderCollapse = {
    attach: function (host, scroll) {
      var el = document.createElement('div');
      el.className = 'chdr'; el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<div class="chdr-bg"></div><div class="chdr-in"><div class="chdr-t"><i class="chdr-bar"></i><span></span></div><div class="chdr-s"><b></b><u>|</u><span></span></div></div>';
      host.appendChild(el);
      var t = el.querySelector('.chdr-t span'), bar = el.querySelector('.chdr-bar'), n = el.querySelector('.chdr-s b'), sep = el.querySelector('.chdr-s u'), s = el.querySelector('.chdr-s span');
      var raf = 0, api = {}, hero = null, bg = host.querySelector('.bg');
      if(bg){host.insertBefore(bg,scroll);bg.classList.add('page-backdrop');}
      function update() {
        raf = 0;
        var st = Math.max(0, scroll.scrollTop), p = clamp(st / RANGE, 0, 1);
        hero = hero && hero.isConnected ? hero : host.querySelector('.hero');
        host.style.setProperty('--p', p.toFixed(3));
        if (hero) {
          hero.style.opacity = String(clamp(1 - st / 64, 0, 1));
          hero.style.translate = '0 ' + (-Math.min(st, 96) * 0.28).toFixed(1) + 'px';
          hero.style.scale = String((1 - 0.12 * p).toFixed(4));
          hero.style.transformOrigin = '50% 0';
          hero.style.pointerEvents = p > 0.7 ? 'none' : '';
          hero.setAttribute('aria-hidden',String(p>0.7));
        }
        if (bg) bg.style.translate = '0 ' + (Math.min(st, 240) * -.08).toFixed(1) + 'px';
        var q = clamp((st - 28) / 48, 0, 1);
        el.style.setProperty('--q', q.toFixed(3));
        el.style.opacity = String(q);
        el.setAttribute('aria-hidden',String(q<.75));
        el.firstChild.style.opacity = String(clamp((st - 8) / 90, 0, 1));
        el.lastChild.style.transform = 'translateY(' + ((1 - q) * 10).toFixed(1) + 'px)';
      }
      function req() { if (!raf) raf = requestAnimationFrame(update); }
      scroll.addEventListener('scroll', req, { passive: true });
      window.addEventListener('shellfit', req);
      api.update = update;
      api.destroy = function () { cancelAnimationFrame(raf); scroll.removeEventListener('scroll', req); window.removeEventListener('shellfit', req); el.remove(); };
      api.set = function (title, num, sub, color) {
        var fresh = host.querySelector('.view .hero'); if (fresh) { if (hero) hero.remove(); hero = fresh; host.appendChild(hero); }
        t.textContent = title; bar.style.background = color || 'transparent'; bar.style.display = color ? '' : 'none';
        n.textContent = num == null ? '' : num; sep.style.display = n.style.display = num == null || num === '' ? 'none' : '';
        s.textContent = sub || ''; update();
      };
      return api;
    }
  };
})();

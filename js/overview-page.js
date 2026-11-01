/* Overview ("All lines") — page 0 of the pager. Markup moved verbatim from the former index.html (Figma 141:10514).
   Overview.mount(host, {onPick(slug)}) -> page API {setActive, scroll}. Ring wedge + 'lines to watch' taps call onPick (animated pager move). */
(function () {
  var BG = "        <div class=\"bg\">\n          <div class=\"ambient\" data-tone=\"delayed\"><i></i><i></i><i></i></div>\n          <img class=\"map\" src=\"assets/map.svg\" alt=\"\">\n\n          <div class=\"markers\">\n            <!-- now \u00b7 minor \u2014 Mile End -->\n            <span class=\"nowglow minor\" style=\"left:359.86px;top:238.38px;width:36px;height:36px\"></span>\n            <span class=\"nowdot  minor\" style=\"left:372.36px;top:250.88px;width:11px;height:11px\"></span>\n            <!-- now \u00b7 minor \u2014 Bethnal Green -->\n            <span class=\"nowglow minor\" style=\"left:313.94px;top:238.38px;width:36px;height:36px\"></span>\n            <span class=\"nowdot  minor\" style=\"left:326.44px;top:250.88px;width:11px;height:11px\"></span>\n            <!-- now \u00b7 minor \u2014 Oxford Circus -->\n            <span class=\"nowglow minor\" style=\"left:-7.5px;top:284.3px;width:36px;height:36px\"></span>\n            <span class=\"nowdot  minor\" style=\"left:5px;top:296.8px;width:11px;height:11px\"></span>\n            <!-- now \u00b7 minor \u2014 Warren Street -->\n            <span class=\"nowglow minor\" style=\"left:-7.5px;top:238.38px;width:36px;height:36px\"></span>\n            <span class=\"nowdot  minor\" style=\"left:5px;top:250.88px;width:11px;height:11px\"></span>\n            <!-- now \u00b7 minor \u2014 Euston -->\n            <span class=\"nowglow minor\" style=\"left:49.9px;top:179.34px;width:36px;height:36px\"></span>\n            <span class=\"nowdot  minor\" style=\"left:62.4px;top:191.84px;width:11px;height:11px\"></span>\n            <!-- predicted \u00b7 severe \u2014 Liverpool Street -->\n            <span class=\"pred severe\" style=\"--s:.8;left:260.42px;top:276.7px\">\n              <i class=\"g\"></i><i class=\"p\"></i><i class=\"c\"></i>\n            </span>\n            <!-- predicted \u00b7 severe \u2014 Bank -->\n            <span class=\"pred severe\" style=\"--s:.8;left:214.5px;top:322.62px\">\n              <i class=\"g\"></i><i class=\"p\"></i><i class=\"c\"></i>\n            </span>\n          </div>\n\n          <div class=\"fade\"></div>\n        </div>";
  var BODY = "        <!-- ========== hero ========== -->\n        <div class=\"hero\">\n          <div class=\"title\">All lines</div>\n          <div class=\"value\">9</div>\n          <div class=\"sub\">stations delayed now</div>\n          <div class=\"sev\">\n            <div class=\"chip\"><i style=\"background:var(--minor)\"></i><b>7</b><span>stations minor delay</span></div>\n            <div class=\"chip\"><i style=\"background:var(--severe)\"></i><b>2</b><span>stations severe delay</span></div>\n          </div>\n        </div>\n\n        <!-- ========== ring card ========== -->\n        <div class=\"card ringcard\">\n          <div class=\"head\">\n            <div class=\"k\">NEXT 30 MINUTES</div>\n            <div class=\"a\">Tap a line</div>\n          </div>\n          <div class=\"ringwrap\" id=\"ringwrap\" role=\"group\" aria-label=\"Tap a line wedge to open it\">\n            <img src=\"assets/ring.svg\" alt=\"Next 30 minutes \u2014 risk ring by line\">\n          </div>\n          <div class=\"legend\">\n            <p>Inner band = now \u00b7 outer rings = next 30 min. Green normal \u00b7 amber Minor \u00b7 red Severe (fainter = less likely) \u00b7 grey not running</p>\n          </div>\n        </div>\n\n        <div class=\"watch\"></div>\n\n        <!-- ========== footer ========== -->\n        <div class=\"footer\">\n          <div class=\"u\">Updated 1 min ago \u00b7 example values</div>\n          <a class=\"h\" href=\"lines.html\">How is this calculated?</a>\n        </div>";
  var ORDER = ['district','circle','hammersmith-city','metropolitan','piccadilly','jubilee','northern','victoria','central','bakerloo','waterloo-city','elizabeth'];
  window.Overview = {
    data: { title: 'All lines', num: '9', sub: 'stations delayed now', tone: 'delayed' },
    mount: function (host, o) {
      host.innerHTML = '<div class="scroll"><div class="content">' + BG + '<div class="view">' + BODY + '</div></div></div>';
      var watch=host.querySelector('.watch');
      watch.classList.add('line-stack');
      watch.innerHTML='<div class="hd"><span>LINES TO WATCH</span></div>'+['central','district','victoria','piccadilly'].map(LineCards.render).join('');
      watch.addEventListener('click',function(e){
        var link=e.target.closest('a[href^="line.html?line="]');if(!link)return;
        e.preventDefault();o.onPick(new URL(link.href).searchParams.get('line'));
      });
      var footer=host.querySelector('.footer');
      footer.style.top=(watch.offsetTop+watch.offsetHeight+20)+'px';
      host.querySelector('.content').style.height=(watch.offsetTop+watch.offsetHeight+160)+'px';
      var wrap = host.querySelector('#ringwrap'), P = { scroll: host.firstChild, active: false };
      function wedge(e) {
        var r = wrap.getBoundingClientRect(), s = r.width / wrap.offsetWidth;
        var x = (e.clientX - r.left) / s - 183, y = (e.clientY - r.top) / s - 157;
        var d = Math.sqrt(x * x + y * y); if (d < 72 || d > 150) return null;
        var th = Math.atan2(x, -y) * 180 / Math.PI; if (th < 0) th += 360;
        return ORDER[Math.floor(((th - 3 + 360) % 360) / 30)];
      }
      wrap.addEventListener('mousemove', function (e) { wrap.style.cursor = wedge(e) ? 'pointer' : 'default'; });
      wrap.addEventListener('click', function (e) { var l = wedge(e); if (l) { e.stopPropagation(); o.onPick(l); } });
      P.setActive = function (a) { P.active = a; host.classList.toggle('active',a); host.setAttribute('aria-hidden',String(!a)); host.inert=!a; };
      host.className = 'pager-page';
      return P;
    }
  };
})();

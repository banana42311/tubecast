/* Tubecast responsive shell.
   The 390x844 phone is the design unit. This script decides how it is presented:
   - phone  (viewport <= 520px, i.e. a real phone): no fake device chrome, the UI fills the screen. The 390pt layout is
     scaled to the viewport width (--s) and its height grows with the screen (--H, --dy = extra height over 844).
   - frame  (wider): the phone stays a framed device, scaled down only when the window is too short to show it all.
   It also exposes window.Shell for pages (Shell.mode, Shell.scale) and re-fits on resize / rotation / visualViewport. */
(function () {
  var root = document.documentElement;
  var Shell = window.Shell = { mode: 'frame', scale: 1, height: 844 };
  function fit() {
    var vv = window.visualViewport;
    var vw = Math.round(window.innerWidth), vh = Math.round(vv ? vv.height : window.innerHeight);
    if (vv && vv.scale > 1.05) return; // preserve browser pinch zoom
    var phone = vw <= 520 || (vw <= 900 && vh <= 520 && 'ontouchstart' in window);
    var s, H = 844;
    if (phone) { s = vw / 390; H = Math.round(vh / s); }
    else { s = Math.max(0.5, Math.min(1, (vh - (vw >= 1100 ? 70 : 96)) / 844)); }
    root.classList.toggle('mode-phone', phone);
    root.classList.toggle('mode-frame', !phone);
    root.style.setProperty('--s', s.toFixed(4));
    root.style.setProperty('--H', H + 'px');
    root.style.setProperty('--dy', (H - 844) + 'px');
    Shell.mode = phone ? 'phone' : 'frame'; Shell.scale = s; Shell.height = H;
    window.dispatchEvent(new CustomEvent('shellfit', { detail: Shell }));
  }
  root.classList.toggle('is-home', /(^|\/)(index\.html)?$/.test(location.pathname));
  document.addEventListener('visibilitychange',function(){root.classList.toggle('page-hidden',document.hidden);});
  fit();
  var pending = 0; function queueFit() { if (!pending) pending = requestAnimationFrame(function () { pending = 0; fit(); }); }
  window.addEventListener('resize', queueFit);
  window.addEventListener('orientationchange', fit);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', queueFit);
})();

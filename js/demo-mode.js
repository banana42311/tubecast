/* Deterministic, offline recording mode. It is active only for ?demo=commute
   while apiBase is empty and always opens the complete recording snapshot. */
(function () {
  var C = window.TUBECAST_CONFIG || {}, p = new URLSearchParams(location.search);
  var active = !String(C.apiBase || '').trim() && p.get('demo') === 'commute';
  var step = 3;
  function url(value) {
    if (!active || !value || /^(?:https?:|mailto:|tel:|#)/.test(value)) return value;
    var bits = String(value).split('#'), u = new URL(bits[0], location.href);
    if (u.origin !== location.origin) return value;
    u.searchParams.set('demo', 'commute');
    return u.pathname.replace(/^.*\//, '') + u.search + (bits[1] ? '#' + bits[1] : '');
  }
  function mount() {
    if (!active) return;
    document.documentElement.classList.add('demo-commute');
    var tag = document.querySelector('.demo-tag');
    if (tag) tag.hidden = true;
    function patch(root) {
      (root.querySelectorAll ? root.querySelectorAll('a[href],[data-href]') : []).forEach(function (node) {
        if (node.hasAttribute('href')) node.setAttribute('href', url(node.getAttribute('href')));
        if (node.hasAttribute('data-href')) node.setAttribute('data-href', url(node.getAttribute('data-href')));
      });
    }
    patch(document);
    new MutationObserver(function (records) { records.forEach(function (r) { r.addedNodes.forEach(function (n) { if (n.nodeType === 1) patch(n); }); }); }).observe(document.body, { childList: true, subtree: true });
  }
  document.addEventListener('DOMContentLoaded', function () {
    mount();
  });
  window.DemoMode = { active: active, step: step, data: active ? window.TUBECAST_DEMO_COMMUTE : null, journey: active ? window.TUBECAST_DEMO_JOURNEY : null, url: url };
})();

/* Deterministic, offline recording mode. It is active only for ?demo=commute
   while apiBase is empty, and keeps the selected step across page changes. */
(function () {
  var C = window.TUBECAST_CONFIG || {}, p = new URLSearchParams(location.search);
  var active = !String(C.apiBase || '').trim() && p.get('demo') === 'commute';
  var KEY = 'tubecast-demo-commute-step-v2';
  function readStep() { try { var saved=sessionStorage.getItem(KEY);return saved==null?1:DemoModeCore.stageId(saved); } catch (_) { return 1; } }
  function url(value) {
    if (!active || !value || /^(?:https?:|mailto:|tel:|#)/.test(value)) return value;
    var bits = String(value).split('#'), u = new URL(bits[0], location.href);
    if (u.origin !== location.origin) return value;
    u.searchParams.set('demo', 'commute');
    return u.pathname.replace(/^.*\//, '') + u.search + (bits[1] ? '#' + bits[1] : '');
  }
  function setStep(value) {
    var step = value === 0 ? 1 : DemoModeCore.stageId(value);
    try { sessionStorage.setItem(KEY, String(step)); } catch (_) {}
    document.documentElement.classList.add('demo-switching');
    setTimeout(function () { location.reload(); }, 120);
  }
  function mount() {
    if (!active) return;
    document.documentElement.classList.add('demo-commute');
    var tag = document.querySelector('.demo-tag');
    if (!tag) {
      tag = document.createElement('div'); tag.className = 'demo-tag demo-scenario';
      var phone = document.querySelector('.phone'); if (phone) phone.appendChild(tag);
    }
    if (tag) {
      tag.textContent = 'Example · ' + readStep() + '/3'; tag.hidden = false;
      tag.classList.add('demo-control'); tag.setAttribute('role', 'button'); tag.setAttribute('tabindex', '0');
      tag.setAttribute('aria-label', 'Example scenario step ' + readStep() + ' of 3. Tap for the next step.');
      tag.addEventListener('click', function () { setStep(readStep() % 3 + 1); });
      tag.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault();setStep(readStep() % 3 + 1); } });
    }
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
  window.DemoMode = { active: active, step: readStep(), data: active ? window.TUBECAST_DEMO_COMMUTE : null, journey: active ? window.TUBECAST_DEMO_JOURNEY : null, url: url, setStep: setStep };
})();

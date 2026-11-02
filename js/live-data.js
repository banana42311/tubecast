/* Loads Hermes /api/state (or the local contract fixture) and exposes one
   synchronous LiveState snapshot before FlowData is built. */
(function () {
  var C = window.TUBECAST_CONFIG || {}, Model = window.StateModel, Demo = window.DemoMode;
  var KEY = 'tubecast-state-v2', base = String(C.apiBase || '').replace(/\/$/, '');
  var fixture = C.stateFixture || 'data/state.sample.json', maxAge = C.maxAgeSec || 180;
  function read() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function write(data, source) { try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), source: source, data: data })); } catch (e) {} }
  function warnUnmatched(list) {
    if (!list || !list.length || warnUnmatched.done) return;
    warnUnmatched.done = true;
    console.warn('[Tubecast] Unmatched API stations (' + list.length + ')', list);
  }
  function build(data, meta) {
    var input = data; try { if (base && !meta.scenario && window.ForecastModel) input = window.ForecastModel.augment(data); } catch (e) { console.warn('[Tubecast] forecast model skipped', e); }
    var out = Model.transform(input, window.StationCatalog || {}, window.TFL_NETWORK || {});
    warnUnmatched(out.unmatched);
    return Object.assign(out, {
      mode: meta.scenario ? 'scenario' : (meta.example ? 'example' : (meta.delayed || out.stale ? 'stale' : 'current')),
      delayed: !!meta.delayed, hasData: true, fetchedAt: meta.fetchedAt || Date.now(), source: meta.source || ''
    });
  }
  function empty() { return { mode: 'example', delayed: false, hasData: false, disruptions: [], onset: {}, lines: {}, rows: [], stationState: {} }; }

  var cached = read(), initial = null;
  if (cached && cached.data && ((base && cached.source === 'api') || (!base && cached.source === 'fixture'))) {
    var choice = base ? Model.chooseSnapshot(null, cached, { now: Date.now(), maxAgeSec: maxAge }) : { data: cached.data, delayed: false, source: 'fixture' };
    if (choice) initial = build(choice.data, { example: !base, delayed: choice.delayed, fetchedAt: cached.at, source: cached.source });
  }
  window.LiveState = initial || empty();

  function applyLineMetadata() {
    var live = window.LiveState;
    if (!live.hasData) return;
    (window.LINES || []).forEach(function (line) {
      var info = live.lines[line.slug];
      if (!info) { if (live.mode === 'scenario') line.status = 'normal'; return; }
      var has = live.disruptions.some(function (d) { return d.line === line.slug; });
      var notice = /delay|suspend|closure|not running/i.test(info.status || '');
      line.status = info.closed ? 'closed' : (has || notice ? 'delayed' : 'normal');
    });
  }
  applyLineMetadata();

  window.LiveLabel = function () { return Model.label(window.LiveState); };
  function updateBadge() {
    var tag = document.querySelector('.demo-tag'); if (!tag) return;
    var label = window.LiveLabel();
    tag.textContent = label;
    tag.hidden = !label;
  }
  document.addEventListener('DOMContentLoaded', updateBadge);

  function useResponse(data, source, failed) {
    var previous = read(), choice;
    if (source === 'fixture') {
      choice = { data: data, delayed: false, source: 'fixture' };
      write(data, 'fixture');
    } else {
      choice = Model.chooseSnapshot(data, previous && previous.source === 'api' ? previous : null, { now: Date.now(), maxAgeSec: maxAge, failed: failed });
      if (data && !Model.isOld(data.as_of, Date.now(), maxAge) && !(data.sources && data.sources.stale)) write(data, 'api');
    }
    if (!choice) return false;
    var next = build(choice.data, { example: source === 'fixture', delayed: choice.delayed || failed, fetchedAt: Date.now(), source: choice.source });
    var changed = !window.LiveState.hasData || window.LiveState.asOf !== next.asOf || window.LiveState.delayed !== next.delayed;
    window.LiveState = next; applyLineMetadata(); updateBadge();
    document.documentElement.classList.toggle('live-error', !!next.delayed);
    if (changed) window.dispatchEvent(new CustomEvent('tubecaststate', { detail: next }));
    return changed;
  }
  function firstBootReload(source) {
    if (!window.LiveState.hasData) return false;
    try {
      var k = 'tc-state-boot-v2-' + source;
      if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, '1'); location.reload(); return true; }
    } catch (e) {}
    return false;
  }
  function pull() {
    var source = base ? 'api' : 'fixture', url = base ? base + '/api/state' : fixture;
    var controller = 'AbortController' in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, 8000);
    fetch(url, { cache: 'no-store', signal: controller ? controller.signal : undefined, headers: { Accept: 'application/json' } })
      .then(function (response) { if (!response.ok) throw Error(String(response.status)); return response.json(); })
      .then(function (data) {
        clearTimeout(timer);
        var wasEmpty = !window.LiveState.hasData;
        useResponse(data, source, false);
        if (wasEmpty) firstBootReload(source);
      })
      .catch(function () {
        clearTimeout(timer);
        if (base) {
          var last = read();
          if (last && last.source === 'api') useResponse(null, 'api', true);
          else { window.LiveState.delayed = true; window.LiveState.mode = 'stale'; updateBadge(); }
        }
      });
  }
  if (Demo && Demo.active && Demo.data) {
    var scenario = window.DemoModeCore.select(Demo.data, Demo.step);
    if (scenario) {
      window.LiveState = build(scenario, { scenario: true, example: true, fetchedAt: Date.now(), source: 'demo' });
      applyLineMetadata(); updateBadge();
    }
  } else {
    pull();
    if (base) setInterval(pull, (C.refreshSec || 60) * 1000);
  }
})();

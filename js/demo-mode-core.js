(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DemoModeCore = api;
})(typeof window !== 'undefined' ? window : null, function () {
  function select(data) {
    var stages = data && data.stages || [], id = data && data.default_stage;
    var found = stages.find(function (item) { return item.id === id; }) || stages[stages.length - 1];
    return found ? found.state : null;
  }
  return { select: select };
});

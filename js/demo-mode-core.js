(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DemoModeCore = api;
})(typeof window !== 'undefined' ? window : null, function () {
  function stageId(value) {
    var n = parseInt(value, 10);
    return n >= 1 && n <= 3 ? n : 3;
  }
  function select(data, value) {
    var id = stageId(value), stages = data && data.stages || [];
    var found = stages.find(function (item) { return item.id === id; }) || stages[stages.length - 1];
    return found ? found.state : null;
  }
  return { stageId: stageId, select: select };
});

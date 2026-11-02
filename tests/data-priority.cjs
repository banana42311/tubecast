const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync('js/demo-mode.js','utf8');

function run(search,apiBase,extra){
  let replaced='';
  const location={search,pathname:'/tubecast/index.html',hash:'#overview',href:'https://example.test/tubecast/index.html'+search+'#overview',origin:'https://example.test'};
  const context={window:{TUBECAST_CONFIG:{apiBase},TUBECAST_DEMO_COMMUTE:{},TUBECAST_DEMO_JOURNEY:{}},location,history:{state:null,replaceState(_a,_b,url){replaced=url;}},document:{addEventListener(){}},MutationObserver:function(){},URL,URLSearchParams,console};
  Object.assign(context.window,extra||{});context.window.window=context.window;
  vm.runInNewContext(source,context);
  return {demo:context.window.DemoMode,replaced};
}

let result=run('?demo=commute&line=central','https://api.example');
assert.equal(result.demo.active,false,'apiBase must outrank the commute query');
assert.equal(result.replaced,'/tubecast/index.html?line=central#overview','live mode strips demo from the canonical URL');

result=run('?demo=commute','');
assert.equal(result.demo.active,true,'the bundled scenario remains available when apiBase is empty');

result=run('','https://api.example',{TUBECAST_CONSOLE_SCENARIO:true});
assert.equal(result.demo.active,true,'the desktop console can explicitly read the scenario');
console.log('PASS live API priority, URL cleanup and console-only scenario exception');

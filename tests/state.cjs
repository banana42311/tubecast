const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const Model=require('../js/state-model.js');
const fixture=JSON.parse(fs.readFileSync('data/state.sample.json','utf8'));
const network=JSON.parse(fs.readFileSync('assets/tfl-network.json','utf8'));

const state=Model.transform(fixture,{},network);
const central=state.lines.central;
const centralRows=state.rows.filter(r=>r.line==='central');
assert.equal(centralRows.filter(r=>r.now).length,2);
assert.equal(new Set(centralRows.filter(r=>r.predicted).map(r=>r.station)).size,3);
assert.deepEqual(central.cols.map(c=>c.n),[2,3,4,5,0]);
assert(state.stationState['Mile End'].central.Westbound.now);
assert(state.stationState['Liverpool Street'].central.Westbound.predicted);
console.log('PASS fixture current/predicted counts and station detail share one state contract');

const cached={at:Date.parse('2026-11-02T15:01:00Z'),data:fixture};
const old=structuredClone(fixture);old.as_of='2026-11-02T14:00:00Z';
const selected=Model.chooseSnapshot(old,cached,{now:Date.parse('2026-11-02T15:05:00Z'),maxAgeSec:180});
assert.equal(selected.source,'cache');assert.equal(selected.data,fixture);assert.equal(selected.delayed,true);
const failed=Model.chooseSnapshot(null,cached,{now:Date.parse('2026-11-02T15:05:00Z'),maxAgeSec:180,failed:true});
assert.equal(failed.source,'cache');assert.equal(failed.delayed,true);
assert.match(Model.label({mode:'stale',delayed:true,asOf:fixture.as_of}),/^업데이트 지연 · \d\d:\d\d 기준$/);
console.log('PASS stale/503 behavior keeps the last successful snapshot and exposes delay status');

const withUnknown=structuredClone(fixture);
withUnknown.lines[0].rows.push({station:'Made Up Station',naptan:'NOPE',dir:'Westbound',now:{level:'minor',gap_min:8,usual_min:3}});
const warningState=Model.transform(withUnknown,{},network);
assert.equal(warningState.unmatched.length,1);
let warns=[];
const storage={getItem:()=>JSON.stringify({at:Date.now(),source:'fixture',data:withUnknown}),setItem:()=>{}};
const scope={window:null,console:{warn:(...x)=>warns.push(x)},localStorage:storage,document:{addEventListener:()=>{},querySelector:()=>null,documentElement:{classList:{toggle:()=>{}}}},fetch:()=>new Promise(()=>{}),setTimeout:()=>0,setInterval:()=>0,AbortController:function(){this.signal={};this.abort=()=>{}},CustomEvent:function(){}};
scope.window=scope;scope.StateModel=Model;scope.TUBECAST_CONFIG={apiBase:'',stateFixture:'data/state.sample.json'};scope.StationCatalog={};scope.TFL_NETWORK=network;scope.LINES=[];
vm.runInNewContext(fs.readFileSync('js/live-data.js','utf8'),scope);
assert.equal(warns.length,1);assert.match(warns[0][0],/Unmatched API stations \(1\)/);assert.equal(warns[0][1].length,1);
console.log('PASS unmatched names are collected and warned once instead of being silently dropped');

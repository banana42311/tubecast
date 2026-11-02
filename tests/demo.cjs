const fs=require('node:fs'),assert=require('node:assert/strict');
const Demo=require('../js/demo-mode-core.js'),State=require('../js/state-model.js'),Risk=require('../js/route-risk.js');
const fixture=JSON.parse(fs.readFileSync('data/demo/commute.json','utf8'));
const network=JSON.parse(fs.readFileSync('assets/tfl-network.json','utf8'));
function state(step){return State.transform(Demo.select(fixture,step),{},network);}
function central(step){return state(step).rows.filter(row=>row.line==='central');}
assert.equal(central(1).length,0,'stage 1 has a notice but no affected Central stations');
assert.deepEqual(central(2).map(row=>[row.station,!!row.now,!!row.predicted]),[['Mile End',true,false]]);
assert.equal(central(3).filter(row=>row.now).length,1);
assert.deepEqual(central(3).filter(row=>row.predicted).map(row=>row.station),['Bethnal Green','Liverpool Street','Bank']);
assert.equal(Demo.stageId(0),3);assert.equal(Demo.stageId(2),2);
function option(min,arrival,legs){return {min,arrival,extra:0,r:{legs,transfers:legs.length-1}};}
function leg(line,stops){return {line,direction:'Westbound',walking:false,stops:stops.map(name=>({name}))};}
const usual=option(29,'2026-11-02T09:13:00',[leg('central',['Stratford','Mile End','Bethnal Green','Liverpool Street','Bank','Bond Street','White City'])]);
const around=option(34,'2026-11-02T09:20:00',[leg('elizabeth',['Stratford','Whitechapel','Liverpool Street','Bond Street']),leg('central',['Bond Street','White City'])]);
const ranked=Risk.rank([usual,around],state(3));
assert.deepEqual(ranked[0].r.legs.map(item=>item.line),['elizabeth','central']);
assert.equal(ranked[0].tag,'Recommended now');assert.equal(ranked[0].risk.hits.length,0);
assert.equal(ranked[1].tag,'Usual route');assert(ranked[1].extra>=8&&ranked[1].extra<=15);
assert(!ranked.some(route=>route.r.legs.some(item=>item.walking)));
console.log('PASS deterministic commute stages and delay-aware, walk-free recommended route');

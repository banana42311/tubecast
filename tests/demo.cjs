const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const Demo=require('../js/demo-mode-core.js'),State=require('../js/state-model.js'),Risk=require('../js/route-risk.js');
const fixture=JSON.parse(fs.readFileSync('data/demo/commute.json','utf8'));
const journeyFixture=JSON.parse(fs.readFileSync('data/demo/journey_stratford_whitecity.json','utf8'));
const network=JSON.parse(fs.readFileSync('assets/tfl-network.json','utf8'));
function bundled(file,key){const scope={window:{}};vm.runInNewContext(fs.readFileSync(file,'utf8'),scope);return JSON.parse(JSON.stringify(scope.window[key]));}
assert.deepEqual(bundled('data/demo/commute.js','TUBECAST_DEMO_COMMUTE'),fixture,'browser commute bundle matches JSON fixture');
assert.deepEqual(bundled('data/demo/journey_stratford_whitecity.js','TUBECAST_DEMO_JOURNEY'),journeyFixture,'browser journey bundle matches JSON fixture');
assert.equal(fixture.stages.length,1,'only the final commute snapshot is shipped');
assert.equal(fixture.stages[0].id,fixture.default_stage,'the shipped snapshot is the default');
function state(){return State.transform(Demo.select(fixture),{},network);}
function central(){return state().rows.filter(row=>row.line==='central');}
assert.deepEqual(central().filter(row=>row.now).map(row=>row.station),['Mile End','Bethnal Green']);
assert.deepEqual(central().filter(row=>row.predicted).map(row=>row.station),['Liverpool Street','Bank']);
const finalState=state(),nowStations=[...new Set(finalState.rows.filter(row=>row.now).map(row=>row.station))],predictedStations=[...new Set(finalState.rows.filter(row=>row.predicted).map(row=>row.station))];
assert.deepEqual(nowStations,['Mile End','Bethnal Green','Camden Town','Euston','London Bridge','West Kensington',"Earl's Court"]);
assert.equal(predictedStations.length,7);
function option(min,arrival,legs){return {min,arrival,extra:0,r:{legs,transfers:legs.length-1}};}
function leg(line,stops){return {line,direction:'Westbound',walking:false,stops:stops.map(name=>({name}))};}
const usual=option(29,'2026-11-02T09:13:00',[leg('central',['Stratford','Mile End','Bethnal Green','Liverpool Street','Bank','Bond Street','White City'])]);
const around=option(34,'2026-11-02T09:20:00',[leg('elizabeth',['Stratford','Whitechapel','Liverpool Street','Bond Street']),leg('central',['Bond Street','White City'])]);
const ranked=Risk.rank([usual,around],state());
assert.deepEqual(ranked[0].r.legs.map(item=>item.line),['elizabeth','central']);
assert.equal(ranked[0].tag,'Recommended now');assert.equal(ranked[0].risk.hits.length,0);
assert.equal(ranked[1].tag,'Usual route');assert(ranked[1].extra>=8&&ranked[1].extra<=15);
assert(!ranked.some(route=>route.r.legs.some(item=>item.walking)));
const linePage=fs.readFileSync('js/line-page.js','utf8');
assert(linePage.includes("if(window.DemoMode&&DemoMode.active)h=DemoMode.url(h);"),'pager chrome must preserve the canonical demo parameter at click time');
console.log('PASS canonical commute snapshot, fixture parity and delay-aware walk-free route');

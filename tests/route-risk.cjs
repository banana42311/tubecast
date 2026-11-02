const fs=require('node:fs'),assert=require('node:assert/strict');
const StateModel=require('../js/state-model.js'),RouteRisk=require('../js/route-risk.js');
const fixture=JSON.parse(fs.readFileSync('data/state.sample.json','utf8'));
const network=JSON.parse(fs.readFileSync('assets/tfl-network.json','utf8'));
const state=StateModel.transform(fixture,{},network);
function option(arrival,line,direction,stops,min){return {arrival,min,extra:0,r:{legs:[{line,direction,walking:false,stops:stops.map(stop=>typeof stop==='string'?{name:stop}:stop)}],transfers:0}};}
const usual=option('2026-11-02T10:20:00Z','central','Westbound',['Mile End','Bethnal Green','Liverpool Street','Bank'],20);
const alternative=option('2026-11-02T10:24:00Z','piccadilly','Westbound',['Holborn','Gloucester Road'],24);
const ranked=RouteRisk.rank([usual,alternative],state);
assert.equal(ranked[0].providerRank,1);assert.equal(ranked[0].tag,'Recommended now');assert.equal(ranked[0].extra,0);
assert.equal(ranked[1].tag,'Usual route');assert.equal(ranked[1].risk.current,2);assert.equal(ranked[1].risk.predicted,2);assert(ranked[1].extra>10);
assert.match(ranked[1].explanation,/about \+\d+ min/);
const nextDeparture=option('2026-11-02T10:28:00Z','piccadilly','Westbound',['Holborn','Gloucester Road'],24);
const successive=RouteRisk.rank([alternative,nextDeparture],state);
assert.equal(successive[0].tag,'Recommended now');assert.equal(successive[1].tag,'Later departure');
assert.equal(successive[0].routeId,successive[1].routeId,'same itinerary keeps a stable route id across departures');

const eastbound=option('2026-11-02T10:20:00Z','central','Eastbound',['Bank','Liverpool Street'],20);
assert.equal(RouteRisk.score(eastbound,state).hits.length,0,'westbound evidence never leaks into an eastbound journey');
const directionUnknown=option('2026-11-02T10:20:00Z','central','',['Bank','Liverpool Street'],20);
assert.equal(RouteRisk.score(directionUnknown,state).hits.length,0,'directional evidence is not guessed when the provider omits direction');

const aliasRow={line:'piccadilly',station:"King's Cross",naptan:'HUBKGX',dir:'Southbound',now:{level:'severe',gapMin:15,usualMin:3},predicted:null};
const aliasState={stationState:{"King's Cross":{piccadilly:{Southbound:aliasRow}}},rows:[aliasRow],lines:{}};
const aliasRoute=option('2026-11-02T10:20:00Z','piccadilly','Southbound',[{name:"King's Cross St. Pancras",id:'HUBKGX'}],10);
assert.equal(RouteRisk.score(aliasRoute,aliasState).current,1,'NaPTAN id and TfL aliases resolve to the canonical station state');

const forecastRow={line:'central',station:'Bank',naptan:'HUBBAN',dir:'Westbound',now:null,predicted:{risk:'high',probability:.8,onsetMin:30}};
const forecastState={asOf:'2026-11-02T10:00:00Z',stationState:{Bank:{central:{Westbound:forecastRow}}},rows:[forecastRow],lines:{}};
function timed(departure){return {departure,arrival:'2026-11-02T10:10:00Z',min:10,r:{transfers:0,legs:[{line:'central',direction:'Westbound',walking:false,departure,duration:10,stops:[{name:'Liverpool Street'},{name:'Bank',id:'HUBBAN'}]}]}};}
assert.equal(RouteRisk.score(timed('2026-11-02T10:00:00Z'),forecastState).predicted,0,'forecast does not penalize a train that passes before onset');
assert.equal(RouteRisk.score(timed('2026-11-02T10:30:00Z'),forecastState).predicted,1,'forecast applies once the train reaches the station after onset');
console.log('PASS route risk scoring reorders only TfL candidates and labels current recommendation versus usual route');

const fs=require('node:fs'),assert=require('node:assert/strict');
const StateModel=require('../js/state-model.js'),RouteRisk=require('../js/route-risk.js');
const fixture=JSON.parse(fs.readFileSync('data/state.sample.json','utf8'));
const network=JSON.parse(fs.readFileSync('assets/tfl-network.json','utf8'));
const state=StateModel.transform(fixture,{},network);
function option(arrival,line,direction,stops,min){return {arrival,min,extra:0,r:{legs:[{line,direction,walking:false,stops:stops.map(name=>({name}))}],transfers:0}};}
const usual=option('2026-11-02T10:20:00Z','central','Westbound',['Mile End','Bethnal Green','Liverpool Street','Bank'],20);
const alternative=option('2026-11-02T10:24:00Z','piccadilly','Westbound',['Holborn','Gloucester Road'],24);
const ranked=RouteRisk.rank([usual,alternative],state);
assert.equal(ranked[0].providerRank,1);assert.equal(ranked[0].tag,'Recommended now');assert.equal(ranked[0].extra,0);
assert.equal(ranked[1].tag,'Usual route');assert(ranked[1].risk.current>=2);assert(ranked[1].risk.predicted>=2);assert(ranked[1].extra>10);
assert.match(ranked[1].explanation,/about \+\d+ min/);
console.log('PASS route risk scoring reorders only TfL candidates and labels current recommendation versus usual route');

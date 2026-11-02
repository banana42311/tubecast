const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const network=JSON.parse(fs.readFileSync('assets/tfl-network.json'));
assert.equal(network.stations.length,299);assert.equal(new Set(network.stations.map(s=>s.id)).size,299);
for(const s of network.stations){assert(s.icsId&&s.naptanIds.length&&s.lines.length);assert(Number.isFinite(s.lat)&&Number.isFinite(s.lon));}
assert(network.stations.some(s=>s.id==='kings-cross'));
let requested;
const scope={window:{},TFLMap:{project:(lat,lon)=>[lon,lat]},StationCatalog:{Holborn:{icsId:'1000112'},Bank:{icsId:'1000013'}},fetch:async u=>{requested=u;return {ok:false,status:429};}};
vm.runInNewContext(fs.readFileSync('js/journey-api.js','utf8'),scope);
const api=scope.window.JourneyAPI,A={name:'Holborn'},B={name:'Bank'};
const data={journeys:[{duration:5,startDateTime:'2026-11-02T05:51:00',arrivalDateTime:'2026-11-02T05:56:00',legs:[{duration:5,mode:{id:'tube'},routeOptions:[{lineIdentifier:{id:'central'}}],departurePoint:{commonName:'Holborn Underground Station',lat:51.51,lon:-.12},arrivalPoint:{commonName:'Bank Underground Station',lat:51.51,lon:-.09},path:{lineString:'[[51.51,-0.12],[51.51,-0.09]]',stopPoints:[{name:'Chancery Lane Underground Station'},{name:"St. Paul's Underground Station"}]}}]}]};
const result=api.normalize(data,A,B)[0];assert.equal(result.min,5);assert.equal(result.stops,3);assert.equal(result.r.transfers,0);assert.equal(result.departure,data.journeys[0].startDateTime);assert.equal(result.r.legs[0].stops[1].name,'Chancery Lane');assert.equal(result.r.legs[0].line,'central');assert.equal(result.r.legs[0].pts[0][0],-.12);
(async()=>{await assert.rejects(()=>api.plan(A,B),/busy/);assert(requested.includes('/1000112/to/1000013?mode=tube,elizabeth-line'));console.log('PASS official station identifiers, journey times/stops/geometry mapping and provider failure handling');})().catch(e=>{console.error(e);process.exitCode=1;});
const schematicScope={window:{TFL_NETWORK:network},StationCatalog:{Holborn:{x:1,y:2},Bank:{x:3,y:4},"King's Cross":{x:5,y:6}},};
schematicScope.window.StationCatalog=schematicScope.StationCatalog;
vm.runInNewContext(fs.readFileSync('js/tfl-map-network.js','utf8'),schematicScope);
assert.equal(schematicScope.StationCatalog.Holborn.x,1);assert.equal(schematicScope.StationCatalog.Holborn.icsId,'1000112');assert(!schematicScope.window.NET&&!schematicScope.window.TFLMap,'adapter cannot replace map geometry');
console.log('PASS schematic coordinates stay unchanged while official station IDs attach');

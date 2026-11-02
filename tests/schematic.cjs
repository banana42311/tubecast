const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const c={window:{},document:{createElementNS(){return {style:{},setAttribute(){},remove(){}}}}};vm.createContext(c);
for(const f of ['assets/network.js','js/map-labels.js','js/station-catalog.js']){vm.runInContext(fs.readFileSync(f,'utf8'),c);Object.assign(c,c.window);}
const original=JSON.parse(JSON.stringify(c.StationCatalog));
for(const f of ['assets/schematic-extension.js','js/schematic-map.js','assets/schematic-samples.js','js/flow-geo.js']){vm.runInContext(fs.readFileSync(f,'utf8'),c);Object.assign(c,c.window);}
const N=c.NET,S=1440/656,g=c.FlowGeo.build({N,S,slugs:Object.keys(N.colors),linePaths:l=>l==='central'?N.central.p:N.lines.p.filter(p=>p[0]===l).map(p=>p[1]),lineOff:()=>[0,0]});
assert.equal(g.stations.length,299);assert.equal(g.sampling,'cached');
for(const s of g.stations){assert(s.vn>=0,s.name+' has a selectable line anchor');for(const l of c.StationCatalog[s.name].lines)assert(s.nodes[l]!=null,s.name+' maps to '+l);}
for(const [n,p] of Object.entries(original)){if(['Hanwell','West Ealing','Battersea Power Station'].includes(n))continue;assert.equal(c.StationCatalog[n].x,p.x,n+' original x');assert.equal(c.StationCatalog[n].y,p.y,n+' original y');}
for(const [line,list]of Object.entries(c.SCHEMATIC_EXTENSION.paths))for(const e of list){assert(g.stretch(line,g.kebab(e.a),g.kebab(e.b)),line+' edge '+e.a+' → '+e.b);}
for(const [a,b,line] of [['epping','west-ruislip','central'],['upminster','wimbledon','district'],['cockfosters','uxbridge','piccadilly'],['stanmore','stratford','jubilee'],['morden','high-barnet','northern'],['reading','shenfield','elizabeth'],['amersham','aldgate','metropolitan']])assert(g.stretch(line,a,b),line+' connected outer branches');
console.log('PASS 299 stations, every line anchor, original central positions, cached geometry and outer branch continuity');

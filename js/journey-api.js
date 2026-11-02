/* TfL Journey Planner is the sole production route provider. No geometric-time fallback. */
(function(){
 var root=(window.TUBECAST_CONFIG||{}).journeyBase||'https://api.tfl.gov.uk';
 function clean(s){return String(s||'').replace(/ (Underground|Rail|DLR|Elizabeth line) Station$/,'');}
 function clock(s){return s?String(s).slice(11,16):'';}
 function point(p){return p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)?TFLMap.project(p.lat,p.lon):null;}
 function normalize(data,A,B){
  return (data.journeys||[]).map(function(j,index){
   var legs=(j.legs||[]).map(function(l){
    var line=(l.routeOptions||[]).map(function(r){return r.lineIdentifier&&r.lineIdentifier.id;}).filter(Boolean)[0]||(l.mode||{}).id||'walking';
    var stops=[{name:clean(l.departurePoint.commonName),id:l.departurePoint.naptanId}];
    ((l.path||{}).stopPoints||[]).forEach(function(s){if(stops[stops.length-1].name!==clean(s.name))stops.push({name:clean(s.name),id:s.id});});
    var end=clean(l.arrivalPoint.commonName);if(stops[stops.length-1].name!==end)stops.push({name:end,id:l.arrivalPoint.naptanId});
    var pts=[];if(window.SchematicJourney){pts=SchematicJourney.points(line,stops);}else try{pts=JSON.parse((l.path||{}).lineString||'[]').map(function(p){return TFLMap.project(p[0],p[1]);});}catch(e){}
    if(!pts.length&&!window.SchematicJourney){var a=point(l.departurePoint),b=point(l.arrivalPoint);if(a)pts.push(a);if(b)pts.push(b);}
    return {line:line,pts:pts,ids:[],stops:stops,walking:line==='walking',duration:l.duration,departure:l.departureTime,arrival:l.arrivalTime,instruction:(l.instruction||{}).summary||'',detail:(l.instruction||{}).detailed||'',disruptions:(l.disruptions||[]).map(function(d){return d.description||d.summary||'';}).filter(Boolean)};
   });
   var transit=legs.filter(function(l){return !l.walking;});
   return {r:{from:A,to:B,legs:legs,transfers:Math.max(0,transit.length-1)},tag:index===0?'TfL recommended':'Alternative',min:j.duration,extra:0,cr:[],departure:j.startDateTime,arrival:j.arrivalDateTime,stops:transit.reduce(function(n,l){return n+Math.max(0,l.stops.length-1);},0),source:'TfL'};
  }).sort(function(a,b){return Date.parse(a.arrival)-Date.parse(b.arrival);}).map(function(o,i){o.tag=i===0?'Earliest arrival':'Alternative';return o;});
 }
 async function plan(A,B,signal){
  var a=StationCatalog[A.name],b=StationCatalog[B.name];if(!a||!b||!a.icsId||!b.icsId)throw Error('Station identifier is unavailable. Please select another station.');
  var u=root.replace(/\/$/,'')+'/Journey/JourneyResults/'+encodeURIComponent(a.icsId)+'/to/'+encodeURIComponent(b.icsId)+'?mode=tube,elizabeth-line&journeyPreference=LeastTime';
  var r=await fetch(u,{signal:signal,headers:{Accept:'application/json'}});if(!r.ok)throw Error(r.status===429?'TfL is busy. Please try again shortly.':'TfL journey planning is unavailable. Please try again.');
  var d=await r.json();if(d.fromLocationDisambiguation||d.toLocationDisambiguation)throw Error('TfL could not identify one of these stations. Please select it again.');
  return normalize(d,A,B);
 }
 window.JourneyAPI={plan:plan,normalize:normalize,clock:clock};
})();

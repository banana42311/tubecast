/* TfL Journey Planner is the sole production route provider. No geometric-time fallback. */
(function(){
 var root=(window.TUBECAST_CONFIG||{}).journeyBase||'https://api.tfl.gov.uk';
 function clean(s){return String(s||'').replace(/ (Underground|Rail|DLR|Elizabeth line) Station$/,'');}
 function clock(s){return s?String(s).slice(11,16):'';}
 function point(p){return p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)?TFLMap.project(p.lat,p.lon):null;}
 function routeId(legs){return (legs||[]).filter(function(l){return !l.walking;}).map(function(l){return l.line+':'+(l.stops||[]).map(function(s){return s.id||clean(s.name).toLowerCase().replace(/[^a-z0-9]/g,'');}).join('>');}).join('|');}
 function addMinutes(value,minutes){
  var t=Date.parse(value||'');if(!Number.isFinite(t))return value;
  var iso=new Date(t+minutes*60000).toISOString();
  return /(?:Z|[+-]\d\d:\d\d)$/i.test(String(value))?iso:iso.slice(0,19);
 }
 function opposite(value){var map={northbound:'Southbound',southbound:'Northbound',eastbound:'Westbound',westbound:'Eastbound'};return String(value||'').replace(/Northbound|Southbound|Eastbound|Westbound/gi,function(v){return map[v.toLowerCase()]||v;});}
 function reverseDemo(data){
  return {journeys:(data.journeys||[]).map(function(j){
   var source=(j.legs||[]).slice().reverse(),travel=source.reduce(function(n,l){return n+(+l.duration||0);},0),wait=Math.max(0,(+j.duration||travel)-travel),cursor=0;
   var legs=source.map(function(original,index){
    var l=JSON.parse(JSON.stringify(original)),duration=+l.duration||0,start=addMinutes(j.startDateTime,cursor),departure=l.arrivalPoint,arrival=l.departurePoint;
    l.departurePoint=departure;l.arrivalPoint=arrival;l.departureTime=start;l.arrivalTime=addMinutes(start,duration);
    (l.routeOptions||[]).forEach(function(r){r.directions=(r.directions||[]).map(opposite);});
    l.instruction={summary:opposite((l.instruction||{}).summary||''),detailed:'Travel to '+clean(arrival&&arrival.commonName)};
    if(l.path&&Array.isArray(l.path.stopPoints))l.path.stopPoints=l.path.stopPoints.slice().reverse();
    if(l.path&&l.path.lineString)try{l.path.lineString=JSON.stringify(JSON.parse(l.path.lineString).reverse());}catch(_){ }
    cursor+=duration;if(index<source.length-1)cursor+=wait/Math.max(1,source.length-1);return l;
   });
   return Object.assign({},j,{startDateTime:j.startDateTime,arrivalDateTime:addMinutes(j.startDateTime,+j.duration||cursor),legs:legs});
  })};
 }
 function pause(ms,signal){return new Promise(function(resolve,reject){
  if(signal&&signal.aborted){var early=Error('Aborted');early.name='AbortError';reject(early);return;}
  var timer=setTimeout(done,ms);function done(){if(signal)signal.removeEventListener('abort',abort);resolve();}function abort(){clearTimeout(timer);if(signal)signal.removeEventListener('abort',abort);var error=Error('Aborted');error.name='AbortError';reject(error);}
  if(signal)signal.addEventListener('abort',abort,{once:true});
 });}
 function normalize(data,A,B){
  return (data.journeys||[]).map(function(j,index){
   var legs=(j.legs||[]).map(function(l){
    var line=(l.routeOptions||[]).map(function(r){return r.lineIdentifier&&r.lineIdentifier.id;}).filter(Boolean)[0]||(l.mode||{}).id||'walking';
    var stops=[{name:clean(l.departurePoint.commonName),id:l.departurePoint.naptanId}];
    ((l.path||{}).stopPoints||[]).forEach(function(s){if(stops[stops.length-1].name!==clean(s.name))stops.push({name:clean(s.name),id:s.id});});
    var end=clean(l.arrivalPoint.commonName);if(stops[stops.length-1].name!==end)stops.push({name:end,id:l.arrivalPoint.naptanId});
    var pts=[];if(window.SchematicJourney){pts=SchematicJourney.points(line,stops);}else try{pts=JSON.parse((l.path||{}).lineString||'[]').map(function(p){return TFLMap.project(p[0],p[1]);});}catch(e){}
    if(!pts.length&&!window.SchematicJourney){var a=point(l.departurePoint),b=point(l.arrivalPoint);if(a)pts.push(a);if(b)pts.push(b);}
    var directionText=((l.routeOptions||[]).map(function(r){return (r.directions||[]).join(' ');}).join(' ')+' '+((l.instruction||{}).summary||'')+' '+((l.instruction||{}).detailed||''));
    var direction=(directionText.match(/\b(Northbound|Southbound|Eastbound|Westbound)\b/i)||[])[1]||'';if(direction)direction=direction.charAt(0).toUpperCase()+direction.slice(1).toLowerCase();
    return {line:line,direction:direction,pts:pts,ids:[],stops:stops,walking:line==='walking',duration:l.duration,departure:l.departureTime,arrival:l.arrivalTime,instruction:(l.instruction||{}).summary||'',detail:(l.instruction||{}).detailed||'',disruptions:(l.disruptions||[]).map(function(d){return d.description||d.summary||'';}).filter(Boolean)};
   });
   var transit=legs.filter(function(l){return !l.walking;});
   return {r:{from:A,to:B,legs:legs,transfers:Math.max(0,transit.length-1)},routeId:routeId(legs),tag:index===0?'TfL recommended':'Alternative',min:j.duration,extra:0,cr:[],departure:j.startDateTime,arrival:j.arrivalDateTime,stops:transit.reduce(function(n,l){return n+Math.max(0,l.stops.length-1);},0),source:'TfL'};
  }).sort(function(a,b){return Date.parse(a.arrival)-Date.parse(b.arrival);}).map(function(o,i){o.tag=i===0?'Earliest arrival':'Alternative';return o;});
 }
 async function plan(A,B,signal){
  if(window.DemoMode&&DemoMode.active&&DemoMode.journey&&A&&B&&((A.id==='stratford'&&B.id==='white-city')||(A.id==='white-city'&&B.id==='stratford'))){
   await pause(360,signal);
   var reverse=A.id==='white-city';
   return normalize(reverse?reverseDemo(DemoMode.journey):DemoMode.journey,A,B);
  }
  var a=StationCatalog[A.name],b=StationCatalog[B.name];if(!a||!b||!a.icsId||!b.icsId)throw Error('Station identifier is unavailable. Please select another station.');
  var u=root.replace(/\/$/,'')+'/Journey/JourneyResults/'+encodeURIComponent(a.icsId)+'/to/'+encodeURIComponent(b.icsId)+'?mode=tube,elizabeth-line&journeyPreference=LeastTime';
  var r=await fetch(u,{signal:signal,headers:{Accept:'application/json'}});if(!r.ok)throw Error(r.status===429?'TfL is busy. Please try again shortly.':'TfL journey planning is unavailable. Please try again.');
  var d=await r.json();if(d.fromLocationDisambiguation||d.toLocationDisambiguation)throw Error('TfL could not identify one of these stations. Please select it again.');
  return normalize(d,A,B);
 }
 window.JourneyAPI={plan:plan,normalize:normalize,clock:clock,routeId:routeId};
})();

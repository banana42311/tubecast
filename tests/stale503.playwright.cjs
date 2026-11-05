// Run: python3 -m http.server 8766 (in tubecast/) then: node tests/stale503.playwright.cjs http://localhost:8766
// Server answers 503 (cannot confirm sources) with a recent-but-stale snapshot while the browser holds a day-old cache: the page must show the newer one, labelled delayed.
const {chromium}=require('playwright');
const ROOT=process.argv[2]||'http://localhost:8766';
const now=new Date(Date.now()-25*60000).toISOString(), old=new Date(Date.now()-15*3600000).toISOString();
const ALL=['bakerloo','central','circle','district','elizabeth','hammersmith-city','jubilee','metropolitan','northern','piccadilly','victoria','waterloo-city'];
const st=n=>n+' Underground Station';
const tfl={
 elizabeth:{status:'Severe Delays',reason:'Severe delays between Paddington and Heathrow Terminal 4 / Reading while we fix a track fault.',not_running:{affected_stops:['Acton Main Line Rail Station','Ealing Broadway Rail Station','Hanwell Rail Station','Paddington','Southall Rail Station']}},
 district:{status:'Severe Delays',reason:'District Line: Severe delays between Upminster and Tower Hill westbound only, and MINOR DELAYS elsewhere.',not_running:{affected_stops:[st('Upminster'),st('Barking'),st('East Ham'),st('Tower Hill')]}},
 central:{status:'Minor Delays',reason:'Central Line: Minor delays due to an earlier faulty train.',not_running:{affected_stops:[]}},
 victoria:{status:'Suspended',reason:'Victoria Line: No service while we fix a faulty train at Warren Street. Tickets are being accepted.',not_running:{affected_stops:[]}},
 metropolitan:{status:'Severe Delays',reason:'Metropolitan Line: Severe delays between Harrow-on-the-Hill and Uxbridge.',not_running:{affected_stops:[st('Harrow-on-the-Hill'),st('Eastcote'),st('Rayners Lane'),st('Ruislip'),st('Uxbridge')]}},
 circle:{status:'Minor Delays',reason:'Circle Line: Minor delays.',not_running:{affected_stops:[]}},
 'waterloo-city':{status:'Part Closure',reason:'No service between Waterloo and Bank.',not_running:{affected_stops:[]}},
};
const v1={schema:'webdata_submit_1102_observed',as_of:now,mode:'live',sources:{stale:false},lines:ALL.map(id=>({id,tfl:tfl[id]||{status:'Good Service',reason:'',not_running:{affected_stops:[]}},now:{units_delayed:null},rows:[],cols:[{h:0,n:null,mark:(tfl[id]||{}).status==='Severe Delays'?'ns':''}]}))};
const hl={central:[{naptan:'940GZZLUMED',dir:'Westbound',level:'minor',gap_min:9,usual_min:3}],district:[{naptan:'940GZZLUBKG',dir:'Westbound',level:'minor',gap_min:8,usual_min:3}],jubilee:[{naptan:'940GZZLUSTM',dir:'Southbound',level:'severe',gap_min:20,usual_min:3}]};
const v2={schema:'webdata_api_rows_v2_canary',as_of:now,lines:ALL.map(id=>({id,classified_units:10,confirmed_delayed_units:(hl[id]||[]).length,confirmed_delayed_stations:(hl[id]||[]).length,unknown_units:5,observable_units:15})),highlighted_rows:hl};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:375,height:812}});
 const stale=Object.assign({},v1,{sources:{stale:true}});
 const oldSnap=Object.assign({},v1,{as_of:old});
 await ctx.addInitScript(([k,o,old])=>{try{if(!localStorage.getItem(k))localStorage.setItem(k,JSON.stringify({source:'api',at:Date.parse(old),data:o}))}catch(e){}},['tubecast-state-v3',oldSnap,old]);
 await ctx.route(/sslip\.io\/api\/v2\/state/,r=>r.fulfill({status:503,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"error":{"reason_code":"readiness_failed"}}'}));
 await ctx.route(/sslip\.io\/api\/state/,r=>r.fulfill({status:503,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(stale)}));
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(ROOT+'/index.html?welcome=done');await p.waitForTimeout(5000);
 const r=await p.evaluate(()=>({asOf:window.LiveState.asOf,delayed:window.LiveState.delayed,label:window.LiveLabel&&window.LiveLabel()}));
 const hh=iso=>new Date(iso).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'});
 console.log(JSON.stringify(r),'expected newer as_of',now,'-> label time',hh(now));
 const ok=r.delayed===true&&Date.parse(r.asOf)>=Date.parse(now)-1000&&(r.label||'').includes(hh(now));
 console.log(ok?'PASS stale 503 snapshot beats day-old cache':'FAIL');console.log('page errors',JSON.stringify(errs));
 await b.close();process.exit(ok&&!errs.length?0:1);
})();

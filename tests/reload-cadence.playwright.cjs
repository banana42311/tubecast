// Run: python3 -m http.server 8766 (in tubecast/) then: node tests/reload-cadence.playwright.cjs http://localhost:8766 [old]
// A server that bumps as_of every pull must not make the page reload each time (idle page, 40 s, refreshSec 2, as_of +2 s per pull => expect 0 reloads). 'old' reruns with the pre-fix softReload rule to prove the test detects it.
const {chromium}=require('playwright');
const ROOT=process.argv[2]||'http://localhost:8766';
const now=new Date().toISOString();
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
const OLD=process.argv[3]==='old';
(async()=>{
 const fs=require('fs');const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:375,height:812}});
 let n=0;const t0=Date.now();
 const snap=()=>{n++;const a=new Date(t0+n*2000).toISOString();return [Object.assign({},v1,{as_of:a}),Object.assign({},v2,{as_of:a})];};
 await ctx.route(/\/config\.js/,r=>r.fulfill({contentType:'application/javascript',body:"window.TUBECAST_CONFIG={apiBase:'https://x.sslip.io',stateFixture:'data/state.sample.json',refreshSec:2,maxAgeSec:480,clientForecast:true};"}));
 if(OLD)await ctx.route(/js\/live-data\.js/,async r=>{let s=fs.readFileSync('js/live-data.js','utf8');s=s.replace(/if \(changed && hadData && \(prevDelayed[^\n]*softReload\(\);/,'if (changed && hadData) softReload();');await r.fulfill({contentType:'application/javascript',body:s});});
 await ctx.route(/sslip\.io\/api\/v2\/state/,r=>r.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(snap()[1])}));
 await ctx.route(/sslip\.io\/api\/state/,r=>r.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(snap()[0])}));
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));let loads=0,late=0;p.on('load',()=>{loads++;if(Date.now()-t0>10000)late++;console.log('load',loads,Math.round((Date.now()-t0)/1000)+'s')});
 await p.goto(ROOT+'/index.html?welcome=done');await p.waitForTimeout(40000);
 const reloads=late; /* loads in the first 10 s are the one-off first-boot redraws */console.log('mode',OLD?'old rule':'new rule','page loads',loads,'reloads',reloads,'pulls',n);
 const ok=OLD?reloads>=1:reloads===0;console.log(ok?'PASS':'FAIL');console.log('page errors',JSON.stringify(errs));
 await b.close();process.exit(ok&&!errs.length?0:1);
})();

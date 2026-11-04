// Run: python3 -m http.server 8766 (in tubecast/) then: node tests/consistency.playwright.cjs http://localhost:8766
// Needs playwright. Prints MISMATCHES none when overview ring, line pages, line cards and map agree.
// Loads the real pages against a controlled API and checks that every view agrees.
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
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:375,height:812}});
 await ctx.route(/sslip\.io\/api\/v2\/state/,r=>r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(v2)}));
 await ctx.route(/sslip\.io\/api\/state/,r=>r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(v1)}));
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(ROOT+'/index.html?welcome=done');await p.waitForTimeout(4000);
 const idx=await p.evaluate(()=>{
  const tone=m=>/s$/.test(m)?'severe':/m$/.test(m)?'minor':'normal', out={}, bad=[];
  const ring=RingChart.model();
  ring.forEach(r=>{const pg=LINE_DATA[r.slug]; if(!pg||!pg.fc) return; const c=pg.fc.cols, s=FlowData.summary(r.slug);
   out[r.slug]={hero:pg.hero&&pg.hero.value,sub:pg.hero&&pg.hero.sub,cols:c.map(x=>x[1]+':'+x[2]).join(' '),ring:r.now+'/'+r.final+' '+r.inner.tone+' '+r.rings.map(x=>x.minute+x.tone[0]).join(','),kind:pg.kind};
   if(r.closed) return;
   if(c[0][1]!=='—'&&r.now!==c[0][1]) bad.push(r.slug+': ring now '+r.now+' vs line page '+c[0][1]);
   if(c[0][1]!=='—'&&r.inner.tone!==tone(c[0][2])) bad.push(r.slug+': ring now colour '+r.inner.tone+' vs line page '+tone(c[0][2]));
   [[10,1],[20,2],[30,3]].forEach(([m,i])=>{const band=r.rings.find(x=>x.minute===m); if(band.count!==c[i][1]&&c[i][1]!=='—') bad.push(r.slug+': ring +'+m+' count '+band.count+' vs page '+c[i][1]); if(band.tone!==tone(c[i][2])) bad.push(r.slug+': ring +'+m+' colour '+band.tone+' vs page '+tone(c[i][2]));});
   if(String(pg.hero.value)!=='—'&&+pg.hero.value!==s.now) bad.push(r.slug+': hero '+pg.hero.value+' vs summary '+s.now);
   if(s.now!==c[0][1]&&c[0][1]!=='—') bad.push(r.slug+': summary now '+s.now+' vs Now col '+c[0][1]);
   if(s.total!==c[3][1]) bad.push(r.slug+': summary total '+s.total+' vs 30 col '+c[3][1]);
   (pg.rows||[]).forEach(row=>{ if(row.b.t!=='now') return; const rec=LiveState.rows.find(x=>x.line===r.slug&&x.station===row.n&&x.now); if(rec&&((rec.now.level==='severe')!==(row.b.end==='red'))) bad.push(r.slug+': row '+row.n+' bar '+row.b.end+' vs level '+rec.now.level);});
   const nowNames=new Set((pg.rows||[]).filter(x=>x.b.t==='now').map(x=>x.n)); (pg.rows||[]).filter(x=>x.b.t==='on').forEach(x=>{if(nowNames.has(x.n)) bad.push(r.slug+': '+x.n+' listed both as delayed now and predicted');});
   const nextRows=(pg.rows||[]).filter(x=>x.b.t==='on').length; if((c[3][1]>c[0][1])!==(nextRows>0)) bad.push(r.slug+': 30-min growth vs predicted rows mismatch');
  });
  const card=[...document.querySelectorAll('.all-line-cards .card')].map(x=>x.innerText.replace(/\s+/g,' ').slice(0,80));
  const hero=document.querySelector('.hero .value').textContent;if(+hero!==FlowData.totals().now) bad.push('overview hero '+hero+' vs totals '+FlowData.totals().now);
  return {out,bad,card,asOf:LiveState.asOf};
 });
 const pages={};
 for(const sl of ['elizabeth','district','central','jubilee','circle','waterloo-city','victoria','metropolitan']){
  await p.goto(ROOT+'/line.html?line='+sl);await p.waitForTimeout(1500);
  pages[sl]=await p.evaluate(sl=>({hero:LINE_DATA[sl].hero&&LINE_DATA[sl].hero.value,cols:LINE_DATA[sl].fc.cols.map(x=>x[1]+':'+x[2]).join(' '),asOf:LiveState.asOf}),sl);
  await p.goto(ROOT+'/map.html?line='+sl);await p.waitForTimeout(1500);
  pages[sl].map=await p.evaluate(sl=>({sum:FlowData.summary(sl),chip:document.getElementById('chip').innerText.replace(/\s+/g,' ')}),sl);
 }
 Object.keys(pages).forEach(sl=>{const a=idx.out[sl],q=pages[sl]; if(String(a.hero)!==String(q.hero)||a.cols!==q.cols) idx.bad.push(sl+': index vs line.html differ '+a.cols+' | '+q.cols); if(q.map.sum.now!==+(a.cols.split(':')[0])&&a.cols.split(':')[0]!=='—') idx.bad.push(sl+': map summary '+q.map.sum.now+' vs '+a.cols);});
 console.log(JSON.stringify(idx.out,null,1));console.log('cards',idx.card);console.log('pages',JSON.stringify(pages));
 console.log('MISMATCHES',idx.bad.length?idx.bad:'none');console.log('page errors',errs.slice(0,5));await b.close();
})();

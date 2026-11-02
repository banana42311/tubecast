const fs=require('node:fs');
const assert=require('node:assert/strict');
const StateModel=require('../js/state-model.js');
const RingChart=require('../js/ring-chart.js');

const network=JSON.parse(fs.readFileSync('assets/tfl-network.json','utf8'));
const lineMeta={district:'#00A33F',circle:'#FFD329','hammersmith-city':'#F3A9BB',metropolitan:'#B5106B',piccadilly:'#2C55C8',jubilee:'#A0A5A9',northern:'#ECF1F6',victoria:'#0098D4',central:'#E1251B',bakerloo:'#B36305','waterloo-city':'#95CDBA',elizabeth:'#8C6CD1'};
const lines=RingChart.ORDER.map(slug=>({slug,name:slug,color:lineMeta[slug],status:'normal'}));
const env={lines,lineBySlug:Object.fromEntries(lines.map(line=>[line.slug,line])),lineData:{},flowData:null};
function state(api,mode){return Object.assign(StateModel.transform(api,{},network),{hasData:true,mode:mode||'current'});}
function bySlug(result,slug){return result.find(line=>line.slug===slug);}

const sampleApi=JSON.parse(fs.readFileSync('data/state.sample.json','utf8'));
const sample=RingChart.model(state(sampleApi,'example'),env);
assert.equal(sample.length,12);
assert.equal(bySlug(sample,'central').now,2);
assert.equal(bySlug(sample,'central').inner.fill,'#FFA12B');
assert.equal(bySlug(sample,'central').rings[0].tone,'normal');
assert.equal(bySlug(sample,'central').rings[1].count,3);
assert.equal(bySlug(sample,'central').rings[1].tone,'severe');
assert.equal(bySlug(sample,'victoria').rings.every(r=>r.tone==='normal'),true);
assert.equal(bySlug(sample,'jubilee').inner.fill,'#DC241F');
console.log('PASS sample fixture counts and severity drive the ring bands');

const demoFile=JSON.parse(fs.readFileSync('data/demo/commute.json','utf8'));
const demoApi=demoFile.stages[0].state;
const demo=RingChart.model(state(demoApi,'scenario'),env);
assert.equal(bySlug(demo,'central').rings[1].tone,'severe');
assert.equal(bySlug(demo,'central').rings[1].opacity>.35,true);
assert.equal(bySlug(demo,'district').rings[2].tone,'normal');
assert.equal(bySlug(demo,'district').rings[3].tone,'minor');
assert.equal(bySlug(demo,'victoria').rings[5].count,1);
assert.equal(bySlug(demo,'victoria').rings[5].tone,'minor');
assert.equal(bySlug(demo,'circle').now,0,'lines omitted by a live scenario stay normal instead of inheriting prototype data');
console.log('PASS commute scenario onset, probability and omitted-line states drive the ring');

const liveApi={as_of:'2026-11-02T20:00:00Z',sources:{stale:false},lines:[
  {id:'piccadilly',tfl:{status:'Part Suspended',not_running:{affected_routes:['piccadilly']}},cols:[{h:0,n:0},{h:10,n:0},{h:20,n:0},{h:30,n:0}],rows:[]},
  {id:'elizabeth',tfl:{status:'Minor Delays'},line_forecast:{p_base_30:.82},cols:[{h:0,n:1,mark:'nm'},{h:10,n:1,mark:'nm'},{h:20,n:2,mark:'ps'},{h:30,n:3,mark:'ps'}],rows:[
    {station:'Whitechapel',dir:'Eastbound',now:{level:'minor'}},
    {station:'Canary Wharf',dir:'Eastbound',onset_p30:.82,risk:'high',onset_min:20},
    {station:'Custom House',dir:'Eastbound',onset_p30:.73,risk:'high',onset_min:30}
  ]}
]};
const live=RingChart.model(state(liveApi,'current'),env);
assert.equal(bySlug(live,'piccadilly').closed,true);
assert.equal(bySlug(live,'piccadilly').inner.fill,'#5B6470');
assert.equal(bySlug(live,'piccadilly').rings.every(r=>r.tone==='planned'),true);
assert.equal(bySlug(live,'elizabeth').rings[3].tone,'severe');
assert.equal(bySlug(live,'elizabeth').rings[3].opacity,.801);
console.log('PASS current live contract supports planned service and probability opacity');

const svg=RingChart.svg(state(demoApi,'scenario'),env);
assert.equal((svg.match(/class="ring-wedge"/g)||[]).length,12);
assert.equal((svg.match(/class="ring-band /g)||[]).length,84);
assert.match(svg,/data-line="central"/);
assert.match(svg,/>\+30</);
assert.match(svg,/filter="url\(#tc-ring-glow-severe\)"/);
assert.match(fs.readFileSync('js/ring-chart.js','utf8'),/addEventListener\('tubecaststate',refresh\)/);
console.log('PASS original 12-wedge geometry, labels, glow and live refresh hook are retained');

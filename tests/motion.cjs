/* Deterministic pager regression: node tests/motion.cjs */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let now=0,next=1,frames=new Map();
const events={},classes=new Set(),root={clientWidth:390,style:{},classList:{add(...v){v.forEach(x=>classes.add(x));},remove(...v){v.forEach(x=>classes.delete(x));}},addEventListener(t,f){events[t]=f;},setPointerCapture(){}};
const scope={window:{addEventListener(){}},matchMedia:()=>({matches:false}),performance:{now:()=>now},requestAnimationFrame(f){const id=next++;frames.set(id,f);return id;},cancelAnimationFrame(id){frames.delete(id);}};
scope.window.matchMedia=scope.matchMedia;vm.runInNewContext(fs.readFileSync('js/motion.js','utf8'),scope);
let x=0,index=0,settled=0;
const pager=scope.window.Motion.pager({root,track:{style:{},parentNode:root},count:13,onProgress(v){x=v;},onIndex(i){index=i;},onSettle(){settled++;}});
function tick(dt=1000/60){now+=dt;let todo=[...frames.values()];frames.clear();todo.forEach(f=>f(now));}
function finish(){let n=0;while(frames.size&&n++<120)tick();assert(n<120,'animation terminates');}
pager.go(1);assert.equal(index,1,'selection updates immediately');let began=now;finish();assert.equal(x,-390);assert(now-began<450,'page settles below 450ms');console.log('PASS adjacent page settled in '+Math.round(now-began)+'ms');
pager.go(2);tick();tick();pager.go(3);finish();assert.equal(x,-1170,'interrupted spring reaches latest target');assert(!classes.has('is-moving'));console.log('PASS interruptible rapid navigation');
events.pointerdown({pointerId:1,clientX:300,clientY:200,button:0});events.pointermove({pointerId:1,clientX:280,clientY:200});events.pointermove({pointerId:1,clientX:180,clientY:200});assert.equal(x,-1290,'drag follows the complete finger movement without discarding its start');events.pointercancel({pointerId:1,clientX:180,clientY:200,type:'pointercancel'});finish();assert.equal(index,3);assert.equal(x,-1170);console.log('PASS 1:1 drag and cancelled gesture settles without changing page');
pager.go(12,0,true);assert.equal(x,-4680);assert.equal(index,12);assert(!classes.has('is-moving'));console.log('PASS long jump has no artificial delay');

pager.go(11);began=now;while(frames.size)tick(50);assert(now-began<550,'slow frames do not stretch time');console.log('PASS 20fps simulation settled in '+Math.round(now-began)+'ms');
pager.go(10);tick();events.pointerdown({pointerId:2,clientX:200,clientY:200,button:0});events.pointermove({pointerId:2,clientX:200,clientY:250});finish();assert.equal(x,-3900);assert(!classes.has('is-moving'));console.log('PASS vertical scroll interrupt does not strand pager');
events.pointerdown({pointerId:3,clientX:220,clientY:200,button:0});events.pointermove({pointerId:3,clientX:210,clientY:200});events.pointermove({pointerId:3,clientX:160,clientY:200});events.pointerup({pointerId:3,clientX:160,clientY:200,type:'pointerup'});finish();assert.equal(index,11,'short intentional swipe advances page');let prevented=false;events.click({preventDefault(){prevented=true;},stopImmediatePropagation(){}});assert(prevented,'link click after drag is suppressed');console.log('PASS short swipe and accidental link navigation suppression');

function gesture(id,moves){events.pointerdown({pointerId:id,clientX:200,clientY:200,button:0});for(const [dx,dy,dt] of moves){now+=dt;events.pointermove({pointerId:id,clientX:200+dx,clientY:200+dy});}const [dx,dy]=moves[moves.length-1];events.pointerup({pointerId:id,clientX:200+dx,clientY:200+dy,type:'pointerup'});finish();}
pager.go(5,0,true);gesture(4,[[-5,6,50],[-30,18,200]]);assert.equal(index,6,'slightly diagonal thumb swipe stays eligible');
pager.go(5,0,true);gesture(5,[[-5,1,10],[-16,3,30]]);assert.equal(index,6,'short quick flick advances');
pager.go(5,0,true);gesture(6,[[5,12,60],[8,80,150]]);assert.equal(index,5,'vertical intent does not change page');
pager.go(5,0,true);gesture(7,[[-5,1,100],[-16,3,200]]);assert.equal(index,5,'small slow movement returns to same page');
pager.go(5,0,true);gesture(8,[[5,2,50],[29,8,250]]);assert.equal(index,4,'short slow swipe works in reverse too');
console.log('PASS diagonal thumb swipe, quick flick, vertical scroll, small movement and reverse swipe');

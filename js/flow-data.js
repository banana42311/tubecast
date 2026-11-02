/* One illustrative snapshot shared by overview, lines, station sheets and map.
   Counts are unique stations; forecast = total affected at 30 min, including currently delayed stations.
   This is prototype data, not a connection to live TfL services. */
window.FlowData = (function () {
  var LIVE = window.LiveState && window.LiveState.hasData ? window.LiveState : null;
  var D = (LIVE && LIVE.disruptions) || [
    { id:'central-signal', line:'central', sev:'minor', nextSev:'severe', from:'Mile End', to:'Bank', direction:'Westbound',
      cause:'Signal failure near Mile End', detail:'Current gaps may spread west towards Bank over the next 30 minutes.', gap:'18 min gap', prob:'52%',
      now:['Mile End','Bethnal Green'], next:['Liverpool Street','Bank',"St. Paul's"],
      branches:[{from:'Bethnal Green',to:'Bank',direction:'Westbound'}] },
    { id:'district-cancel', line:'district', sev:'minor', nextSev:'severe', from:'West Kensington', to:'Gloucester Road', direction:'Both directions',
      cause:'Earlier train cancellation', detail:'Gaps around Earl’s Court affect westbound and eastbound services.', gap:'9 min gap', prob:'31%',
      now:['West Kensington',"Earl's Court",'Gloucester Road'], next:['Barons Court','South Kensington','Sloane Square'],
      branches:[{from:'West Kensington',to:'Barons Court',direction:'Westbound'},{from:'Gloucester Road',to:'Sloane Square',direction:'Eastbound'}] },
    { id:'victoria-customer', line:'victoria', sev:'minor', nextSev:'minor', from:'Victoria', to:'Euston', direction:'Both directions',
      cause:'Customer incident', detail:'Short delays are affecting services in both directions. No additional stations are predicted to be affected.', gap:'6 min gap', prob:'24%',
      now:['Victoria','Oxford Circus','Euston'], next:[], branches:[] },
    { id:'jubilee-train', line:'jubilee', sev:'severe', nextSev:'severe', from:'Green Park', to:'Southwark', direction:'Eastbound',
      cause:'Faulty train at Westminster', detail:'Delays may spread east towards Waterloo and Southwark.', gap:'15 min gap', prob:'47%',
      now:['Green Park','Westminster'], next:['Waterloo','Southwark'], branches:[{from:'Westminster',to:'Southwark',direction:'Eastbound'}] },
    { id:'bakerloo-track', line:'bakerloo', sev:'minor', nextSev:'minor', from:'Oxford Circus', to:'Charing Cross', direction:'Southbound',
      cause:'Track fault near Oxford Circus', detail:'A speed restriction may affect trains towards Charing Cross.', gap:'8 min gap', prob:'29%',
      now:['Oxford Circus','Piccadilly Circus'], next:['Charing Cross'], branches:[{from:'Piccadilly Circus',to:'Charing Cross',direction:'Southbound'}] },
    { id:'hc-signal', line:'hammersmith-city', sev:'minor', nextSev:'minor', from:'Stepney Green', to:'Mile End', direction:'Eastbound',
      cause:'Signalling problem near Stepney Green', detail:'Eastbound trains are running at reduced speed. No additional stations are predicted to be affected.', gap:'7 min gap', prob:'22%',
      now:['Stepney Green','Mile End'], next:[], branches:[] }
  ];
  var SEV={minor:'Minor delay',severe:'Severe delay'};
  D.forEach(function(d){d.title=SEV[d.sev];});
  function hash(s){var h=7;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h;}
  function atStation(name){var out=[];D.forEach(function(d){if(d.now.indexOf(name)>-1)out.push({d:d,k:'now'});if(d.next.indexOf(name)>-1)out.push({d:d,k:'next'});});return out;}
  function worst(items){return items.slice().sort(function(a,b){return (b.k==='now')-(a.k==='now') || (b.d.sev==='severe')-(a.d.sev==='severe');})[0] || null;}
  function forLine(sl){return D.filter(function(d){return d.line===sl;});}
  function summary(sl){var ds=forLine(sl),now=new Set(),next=new Set();ds.forEach(function(d){d.now.forEach(function(n){now.add(n);});d.next.forEach(function(n){next.add(n);});});return {now:now.size,next:next.size,total:new Set(Array.from(now).concat(Array.from(next))).size,direction:ds[0] ? ds[0].direction : '',severity:ds.some(function(d){return d.sev==='severe';})?'severe':'minor'};}
  function totals(){var now=new Set(),next=new Set();D.forEach(function(d){d.now.forEach(function(n){now.add(n);});d.next.forEach(function(n){next.add(n);});});return {now:now.size,total:new Set(Array.from(now).concat(Array.from(next))).size};}
  // Align the existing line-detail templates and metadata with this same snapshot.
  (window.LINES || []).forEach(function(l){var s=summary(l.slug);l.now=s.now;l.soon=s.total;var page=window.LINE_DATA && window.LINE_DATA[l.slug];if(!page || !forLine(l.slug).length)return;
    page.hero={value:String(s.now),sub:(s.now===1?'station':'stations')+' delayed now'};
    page.fc={title:s.now+' stations delayed now',sub:s.next ? s.total+' affected in 30 min · '+s.next+' more' : 'No additional stations predicted',cols:[['Now',s.now,s.severity==='severe'?'ns':'nm'],['10 min',s.now,'pm'],['20 min',s.now+Math.ceil(s.next/2),'pm'],['30 min',s.total,s.next?'ps':'pm'],['60 min',l.slug==='central'?0:'—','pg',1]]};
    page.rows=[];forLine(l.slug).forEach(function(d){d.now.forEach(function(n){page.rows.push({n:n,d:d.direction,b:{t:'now',end:d.sev==='severe'?'red':'amber'}});});d.next.forEach(function(n,i){page.rows.push({n:n,d:d.direction,b:{t:'on',at:28.33*(i+1),sev:d.nextSev==='severe'?'red':'amber'}});});});
  });
  // API and fixture modes share the exact same columns and station forecast mapping.
  if (LIVE) (window.LINES || []).forEach(function(l){var page=window.LINE_DATA && window.LINE_DATA[l.slug],ds=forLine(l.slug);if(!page||!ds.length)return;
    var on=(LIVE.onset||{})[l.slug]||{},s=summary(l.slug),cnt=function(h){var n=new Set();ds.forEach(function(d){d.now.forEach(function(x){n.add(x);});d.next.forEach(function(x){if((on[x]||99)<=h)n.add(x);});});return n.size;};
    var sev=ds.some(function(d){return d.nextSev==='severe';})?'ps':'pm';
    var provided=((LIVE.lines||{})[l.slug]||{}).cols||[];
    page.fc.cols=provided.length?provided.map(function(c){return [c.h===0?'Now':c.h+' min',c.n==null?'—':c.n,c.mark||(c.h===0?(s.severity==='severe'?'ns':'nm'):sev),c.n==null?1:0];}):[['Now',s.now,s.severity==='severe'?'ns':'nm'],['10 min',cnt(10),sev],['20 min',cnt(20),sev],['30 min',cnt(30),sev],['60 min','—','pg',1]];
    page.rows.forEach(function(r){if(r.b.t==='on'&&on[r.n]!=null)r.b.at=Math.min(170,28.33*on[r.n]/10);});
  });
  return {disruptions:D,SEV:SEV,atStation:atStation,worst:worst,hash:hash,forLine:forLine,summary:summary,totals:totals,
    byId:function(id){return D.find(function(d){return d.id===id;}) || null;},
    trains:function(name,dir){var h=hash(name+dir);return [1+h%4,5+(h>>>3)%7];},
    zone:function(){return 'Schematic map';}
  };
})();

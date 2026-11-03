/* The original horizontal station tracks, compacted for the directory.
   Data is shared with the map; markers reuse the line detail’s .nowglow/.nowdot/.pred primitives. */
(function(){
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
  function lane(d,names,direction){
    var left=/West|South/.test(direction),ordered=names.slice();
    // Place stations in drawing order, retaining the existing diagram orientation.
    if(d.line!=='victoria')ordered.sort(function(a,b){var A=window.StationCatalog&&StationCatalog[a],B=window.StationCatalog&&StationCatalog[b];return A&&B ? (Math.abs(A.x-B.x)>12?A.x-B.x:A.y-B.y) : 0;});
    var total=ordered.length,short={'Liverpool Street':'Liverpool St','South Kensington':'South Ken','Gloucester Road':'Gloucester Rd','West Kensington':'West Ken','Piccadilly Circus':'Piccadilly C.','Charing Cross':'Charing Cross'};
    return '<div class="track"><span class="lc" style="background:var(--line-color)"></span><span class="glow '+(left?'toleft':'toright')+'"><i style="background:linear-gradient(90deg,transparent,var(--line-color) 50%,transparent)"></i></span>'+ordered.map(function(name,i){var x=total===1?163:20+i*286/(total-1),kind=d.now.indexOf(name)>-1?'now':'pred',sev=kind==='now'?d.sev:d.nextSev;return '<span class="station-symbol" style="left:'+(x-14)+'px">'+(kind==='now'?'<span class="nowglow '+sev+'"></span><span class="nowdot '+sev+'"></span>':'<span class="pred '+sev+'" style="--s:.857"><i class="g"></i><i class="p"></i><i class="c"></i></span>')+'</span><span class="st '+(kind==='now'?'on':'')+'" style="left:'+x+'px" title="'+esc(name)+'">'+esc(short[name]||name)+'</span>';}).join('')+'<span class="dir '+(left?'l':'r')+'">'+(left?'← ':'')+esc(direction)+(left?'':' →')+'</span></div>';
  }
  function sentence(t){t=String(t||'');return t?t.charAt(0).toUpperCase()+t.slice(1).toLowerCase():'';}
  // Live: TfL's own status text; forecast-only lines say 'Delay risk'. Demo keeps the old labels.
  // TfL's wording when TfL reports a problem; otherwise our measured level, or 'Delay risk' for forecasts only.
  function lab(l){var t=l.statusText,s=FlowData.summary(l.slug);if(l.status==='closed')return sentence(t)||(l.slug==='waterloo-city'?'Not running':'Part closure');if(l.status==='delayed')return t===undefined?'Minor delays':(l.notice?sentence(t):(s.now?(s.severity==='severe'?'Severe delays':'Minor delays'):'Delay risk'));return 'Good service';}
  function card(l){
    var sum=FlowData.summary(l.slug),ds=FlowData.forLine(l.slug),closed=l.status==='closed';
    if(!ds.length)return '<a class="card nrow" href="line.html?line='+l.slug+'"><span class="bar" style="background:'+l.color+'"></span><span class="nm">'+esc(l.name)+'</span><span class="sm">'+lab(l)+'</span>'+(closed?'<span class="off-mark">—</span>':(l.status==='delayed'?'<span class="notice-dot"></span>':'<span class="ok"><i></i></span>'))+'</a>';
    var tracks='';ds.forEach(function(d){tracks+=lane(d,d.now.concat(d.next).slice(0,4),d.direction==='Both directions'?'Both directions':d.direction);});
    return '<a class="card lrow" href="line.html?line='+l.slug+'" style="--line-color:'+l.color+'"><div class="hdr"><span class="bar" style="background:'+l.color+'"></span><span class="nm">'+esc(l.name)+'</span><span class="sm">'+(l.status==='delayed'?lab(l)+' · ':'')+sum.now+' now · '+sum.total+' in 30 min</span><span class="big">'+sum.now+'</span></div>'+tracks+'</a>';
  }
  // Both the overview watch list and directory use one card renderer.
  window.LineCards={render:function(slug){return card(LINE_BY_SLUG[slug]);}};
  var list=document.getElementById('line-directory');if(!list)return;
  list.classList.add('line-stack');
  var order=['central','district','victoria','jubilee','bakerloo','hammersmith-city','piccadilly','metropolitan','waterloo-city','northern','circle','elizabeth'];
  list.innerHTML=order.map(function(sl){return card(LINE_BY_SLUG[sl]);}).join('');
  TCSearch.attach({input:document.getElementById('q'),panel:document.getElementById('sp'),onPick:function(n){location.href='map.html?station='+TCSearch.kebab(n);}});
  // Leave the original animation intact; pause only cards outside the scroll viewport.
  if('IntersectionObserver' in window){var observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){entry.target.classList.toggle('offscreen',!entry.isIntersecting);});},{root:document.querySelector('.lines .scroll'),rootMargin:'80px'});list.querySelectorAll('.card').forEach(function(row){observer.observe(row);});}
})();

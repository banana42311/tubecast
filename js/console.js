/* Desktop layout shell. It mounts the mobile ring and reads/controls the real
   map page instead of maintaining another renderer. */
(function(){
  var FD=window.FlowData,LS=window.LiveState||{},LB=window.LINE_BY_SLUG||{};
  var iframe=document.getElementById('app-map'),forecast=document.getElementById('forecast-view'),routeView=document.getElementById('route-view'),routePane=document.getElementById('route-pane');
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
  function lineName(sl){return (LB[sl]&&LB[sl].name||sl).replace(/ line$/,'');}
  function clock(v){var d=new Date(v||Date.now());return isNaN(d)?'--:--':String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0');}
  function reason(r){return r==='delays_up_line'||r==='upstream'?'Delays up the line':r==='network_pattern'?'Network pattern':(r||'Current network conditions');}
  function app(){try{return iframe.contentWindow;}catch(_){return null;}}
  function mapAPI(){var w=app();return w&&w.FlowMap;}

  var totals=FD.totals(),severeNow=new Set();
  FD.disruptions.forEach(function(d){d.now.forEach(function(n){if(((d.levels||{})[n]||d.sev)==='severe')severeNow.add(n);});});
  document.getElementById('console-summary').innerHTML='<small>LONDON UNDERGROUND</small><h1>London</h1><strong>'+totals.now+' <span>stations delayed now</span></strong><small>'+Math.max(0,totals.now-severeNow.size)+' minor · '+severeNow.size+' severe · '+totals.total+' affected in 30 min</small>';
  document.getElementById('now-count').textContent=totals.now;
  document.getElementById('next-count').textContent=Math.max(0,totals.total-totals.now);
  document.getElementById('console-time').textContent=clock(LS.asOf);
  document.getElementById('time-now').textContent=clock(LS.asOf);
  document.getElementById('console-updated').textContent=LS.delayed?'Update delayed':'Updated just now';

  function row(record,kind){
    var item=kind==='now'?record.now:record.predicted,sev=kind==='now'?item.level:(item.risk==='high'?'severe':'minor');
    var value=kind==='now'?(item.level==='severe'?'Severe delay':'Minor delay'):((item.risk==='high'?'High chance':'Caution')+' within '+item.onsetMin+' min · '+Math.round(item.probability*100)+'%');
    return '<button class="station-status-row" data-station="'+esc(record.station)+'"><span class="delay-dot '+kind+' '+sev+'"></span><div><small>'+esc(lineName(record.line))+' · '+esc(record.dir)+'</small><b>'+esc(record.station)+'</b><small>'+esc(value)+(kind==='next'?' · '+esc(reason(item.reason)):'')+'</small></div></button>';
  }
  var current=(LS.rows||[]).filter(function(r){return r.now;}),future=(LS.rows||[]).filter(function(r){return r.predicted;});
  document.getElementById('now-list').innerHTML=current.map(function(r){return row(r,'now');}).join('');
  document.getElementById('next-list').innerHTML=future.map(function(r){return row(r,'next');}).join('');

  document.getElementById('line-status').innerHTML=(window.LINES||[]).map(function(line){
    var sum=FD.summary(line.slug),info=(LS.lines||{})[line.slug]||{},status=info.status||((sum.total||line.status==='delayed')?'Minor Delays':'Good Service'),tone=/severe/i.test(status)?'severe':(sum.total||/delay/i.test(status)?'minor':'ok');
    return '<button class="fl-row" data-line="'+line.slug+'"><span class="bar" style="--c:'+line.color+';background:'+line.color+'"></span><span class="nm"><b>'+esc(line.name)+'</b><small>'+esc(status)+'</small></span><span class="n '+tone+'">'+(sum.now||'✓')+'</span></button>';
  }).join('');

  document.getElementById('app-ring').innerHTML=window.Overview&&Overview.ringHTML?Overview.ringHTML():'';
  document.getElementById('stations').innerHTML=Object.keys(window.StationCatalog||{}).sort().map(function(name){return '<option value="'+esc(name)+'"></option>';}).join('');

  function openStation(name){var api=mapAPI();if(api)api.openStation(name);}
  document.addEventListener('click',function(e){
    var station=e.target.closest('[data-station]');if(station){openStation(station.dataset.station);return;}
    var line=e.target.closest('[data-line]');if(line){var d=FD.forLine(line.dataset.line)[0],api=mapAPI();if(d&&api)api.go({t:'dis',id:d.id});}
  });

  function slugFor(value){var api=mapAPI(),key=String(value||'').trim().toLowerCase();if(!api)return null;var found=api.geo.stations.find(function(s){return s.name.toLowerCase()===key;});return found&&found.id;}
  function syncRoute(){
    var api=mapAPI();if(!api||!api.sheet||!api.sheet.pane)return;
    routePane.innerHTML=api.sheet.pane.innerHTML;
    routeView.hidden=false;forecast.hidden=true;
  }
  function showForecast(){routeView.hidden=true;forecast.hidden=false;}
  function checkRoute(){
    var api=mapAPI();if(!api)return;
    var from=slugFor(document.getElementById('route-from').value),to=slugFor(document.getElementById('route-to').value);
    if(!from||!to||from===to)return;
    api.go({t:'route',from:from,to:to,opt:0});syncRoute();
  }
  document.getElementById('route-form').addEventListener('submit',function(e){e.preventDefault();checkRoute();});
  routePane.addEventListener('click',function(e){
    var a=e.target.closest('a[href]');if(a)return;
    var control=e.target.closest('[data-act]');if(!control)return;
    var act=control.dataset.act;if(act==='back'||act==='close'||act==='edit-route'){showForecast();return;}
    var api=mapAPI(),selector='[data-act="'+act+'"]'+(control.dataset.i!=null?'[data-i="'+control.dataset.i+'"]':''),original=api&&api.sheet&&api.sheet.pane.querySelector(selector);
    if(original){original.click();setTimeout(syncRoute,40);}
  });

  document.querySelectorAll('[data-minute]').forEach(function(button){button.addEventListener('click',function(){
    var minute=+button.dataset.minute,api=mapAPI();document.querySelectorAll('[data-minute]').forEach(function(b){b.classList.toggle('on',b===button);});
    document.getElementById('time-copy').textContent=minute?'Forecast through +'+minute+' minutes':'Reported delays now';if(api)api.setForecastMinute(minute);
  });});

  iframe.addEventListener('load',function(){
    var w=app();if(!w)return;
    function ready(){if(!mapAPI())return setTimeout(ready,30);w.addEventListener('flowcontentchange',function(){if(!routeView.hidden)requestAnimationFrame(syncRoute);});if(new URLSearchParams(location.search).get('route')==='1')checkRoute();}
    ready();
  });
})();

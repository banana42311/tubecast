/* Preserve the inner schematic's anchors/line traces; lay out official outer branches by hand. */
const fs=require('fs'),vm=require('vm'),scope={window:{},document:{createElementNS(){return {style:{},setAttribute(){},remove(){}}}}};vm.createContext(scope);
for(const f of ['assets/network.js','assets/network-samples.js','js/map-labels.js','js/station-catalog.js','js/flow-geo.js']){vm.runInContext(fs.readFileSync(f,'utf8'),scope);Object.assign(scope,scope.window);}
const old=scope.StationCatalog,N=scope.NET,S=1440/656,net=JSON.parse(fs.readFileSync('assets/tfl-network.json')),topo=JSON.parse(fs.readFileSync('scripts/data/tfl-topology.json'));
const key=n=>n.toLowerCase().replace(/\([^)]*\)/g,'').replace(/[^a-z0-9]/g,'');
const aliases={'Hammersmith (H&C Line)':'Hammersmith (Circle / H&C)','Hammersmith (Dist&Picc Line)':'Hammersmith','Heathrow Airport Terminal 4':'Heathrow Terminal 4','Heathrow Airport Terminal 5':'Heathrow Terminal 5'};
const oldByKey=Object.fromEntries(Object.keys(old).map(n=>[key(n),n]));const stations={},idNames={};
for(const s of net.stations){let name=aliases[s.name]||oldByKey[key(s.name)]||s.name;if(s.name==='Edgware Road (Bakerloo)')name=s.name;if(stations[name])throw Error('Duplicate '+name);stations[name]={...s,name,...(old[name]?{x:old[name].x,y:old[name].y,original:true}:{})};s.naptanIds.forEach(id=>idNames[id]=name);idNames[s.icsId]=name;}
const P=(n,x,y)=>{if(!stations[n])throw Error('Unknown '+n);stations[n].x=x;stations[n].y=y;};
const chain=(names,x,y,dx,dy)=>names.split('|').forEach((n,i)=>P(n,x+i*dx,y+i*dy));
chain('East Acton|North Acton|Hanger Lane|Perivale|Greenford|Northolt|South Ruislip|Ruislip Gardens|West Ruislip',-40,160,-40,-40);
P('West Acton',-130,170);P('Ealing Broadway',-180,180);
chain('Hammersmith|Ravenscourt Park|Stamford Brook|Turnham Green|Chiswick Park|Acton Town',-30,297,-45,0);
P('Ealing Common',-255,240);
chain('Latimer Road|Wood Lane|Shepherd\'s Bush Market|Goldhawk Road',-18,180,0,27);
chain('North Ealing|Park Royal|Alperton|Sudbury Town|Sudbury Hill',-300,200,-45,-45);P('South Harrow',-480,-30);
chain('Rayners Lane|Eastcote|Ruislip Manor|Ruislip|Ickenham|Hillingdon|Uxbridge',-480,-90,-50,0);
chain('Kilburn|Willesden Green|Dollis Hill|Neasden',110,20,-30,-30);P('Wembley Park',0,-150);
chain('Kingsbury|Queensbury|Canons Park|Stanmore',0,-210,0,-60);
chain('Preston Road|Northwick Park|Harrow-on-the-Hill|North Harrow|Pinner|Northwood Hills|Northwood|Moor Park|Rickmansworth|Chorleywood|Chalfont & Latimer',-50,-180,-50,-50);
P('Amersham',-620,-750);P('Chesham',-550,-800);P('Croxley',-350,-590);P('Watford',-300,-640);P('West Harrow',-240,-220);
chain('Kilburn Park|Queen\'s Park',30,100,-30,-30);chain('Kensal Green|Willesden Junction|Harlesden|Stonebridge Park|Wembley Central|North Wembley|South Kenton',-40,70,-40,-40);
P('Kenton',-280,-220);P('Harrow & Wealdstone',-280,-270);
chain('Belsize Park|Hampstead|Golders Green|Brent Cross|Hendon Central',240,-10,-30,-40);chain('Colindale|Burnt Oak|Edgware',120,-220,0,-50);
chain('Kentish Town|Tufnell Park|Archway|Highgate|East Finchley|Finchley Central|West Finchley|Woodside Park|Totteridge & Whetstone|High Barnet',285,-30,0,-50);P('Mill Hill East',220,-345);
chain('Finsbury Park|Manor House|Turnpike Lane|Wood Green|Bounds Green|Arnos Grove|Southgate|Oakwood|Cockfosters',375,-32,40,-40);
chain('Seven Sisters|Tottenham Hale|Blackhorse Road|Walthamstow Central',440,-32,65,0);
P('Leyton',710,45);P('Leytonstone',755,0);chain('Snaresbrook|South Woodford|Woodford|Buckhurst Hill|Loughton|Debden|Theydon Bois|Epping',755,-55,0,-55);
chain('Wanstead|Redbridge|Gants Hill|Newbury Park',815,0,60,0);chain('Barkingside|Fairlop|Hainault',995,-55,0,-55);chain('Grange Hill|Chigwell|Roding Valley',935,-165,-60,0);
chain('Bromley-by-Bow|West Ham|Plaistow|Upton Park|East Ham|Barking|Upney|Becontree|Dagenham Heathway|Dagenham East|Elm Park|Hornchurch|Upminster Bridge|Upminster',680,159,50,0);P('Canning Town',730,270);
chain('Maryland|Forest Gate|Manor Park|Ilford|Seven Kings|Goodmayes|Chadwell Heath|Romford|Gidea Park|Harold Wood|Brentwood|Shenfield',725,90,60,0);
P('Acton Main Line',-100,210);chain('West Ealing|Hanwell|Southall|Hayes & Harlington|West Drayton|Iver|Langley (Berks)|Slough|Burnham (Berks)|Taplow|Maidenhead|Twyford|Reading',-240,180,-60,0);
chain('South Ealing|Northfields|Boston Manor|Osterley',-315,357,-60,60);chain('Hounslow East|Hounslow Central|Hounslow West|Hatton Cross|Heathrow Terminals 2 & 3',-555,537,-60,0);P('Heathrow Terminal 5',-875,537);P('Heathrow Terminal 4',-795,617);
chain('Gunnersbury|Kew Gardens|Richmond',-165,357,0,60);chain('Southfields|Wimbledon Park|Wimbledon',67,450,0,50);
chain('Clapham Common|Clapham South|Balham|Tooting Bec|Tooting Broadway|Colliers Wood|South Wimbledon|Morden',275,435,-30,40);
P('Abbey Wood',680,297);P('Battersea Power Station',365,430);
const lp=sl=>sl==='central'?N.central.p:N.lines.p.filter(p=>p[0]===sl).map(p=>p[1]);const lo=sl=>sl==='central'?N.central.off:N.lines.off;
const g=scope.FlowGeo.build({N,S,slugs:Object.keys(N.colors),linePaths:lp,lineOff:lo});
function infill(n,line,a,b,t=.5){let r=g.stretch(line,g.kebab(a),g.kebab(b));if(!r)throw Error('Missing infill '+n);let p=r.pts[Math.round((r.pts.length-1)*t)];P(n,p[0]/S,p[1]/S);}
infill('Covent Garden','piccadilly','Holborn','Leicester Square');infill('Knightsbridge','piccadilly','Hyde Park Corner','South Kensington');infill('Monument','district','Cannon Street','Tower Hill',.35);infill('Warwick Avenue','bakerloo','Maida Vale','Paddington');infill('Edgware Road (Bakerloo)','bakerloo','Paddington','Marylebone',.65);
const missing=Object.values(stations).filter(s=>!Number.isFinite(s.x));if(missing.length)throw Error('Unplaced: '+missing.map(s=>s.name));
Object.assign(idNames,{'1000175':'Paddington','1001221':'Paddington','1000097':'Hammersmith','1001147':'Heathrow Terminals 2 & 3','1002163':'Canary Wharf'});
const edges=[];for(const [line,pairs]of Object.entries(topo))for(const [a,b]of pairs){let A=idNames[a],B=idNames[b];if(!A||!B)throw Error('Unknown ID '+a+' '+b);if(A!==B)edges.push({line,a:A,b:B});}
// Existing stations keep their established line traces, including offsets/curves.
const paths={}, oldName=n=>old[n]?n:n==='Edgware Road (Bakerloo)'?'Edgware Road':null;
for(const e of edges){let a=stations[e.a],b=stations[e.b],points,preserved=false;const an=oldName(e.a),bn=oldName(e.b);
 if(an&&bn&&a.x===old[an].x&&a.y===old[an].y&&b.x===old[bn].x&&b.y===old[bn].y){let r=g.stretch(e.line,g.kebab(an),g.kebab(bn));if(r){points=r.pts.map(p=>[p[0]/S,p[1]/S]);preserved=true;}}
 if(!points){points=[[a.x,a.y],[b.x,b.y]];const dx=b.x-a.x,dy=b.y-a.y;if(Math.abs(dx)>2&&Math.abs(dy)>2&&Math.abs(Math.abs(dx)-Math.abs(dy))>3){let m=Math.min(Math.abs(dx),Math.abs(dy));points.splice(1,0,[a.x+Math.sign(dx)*m,a.y+Math.sign(dy)*m]);}}
 (paths[e.line]??=[]).push({a:e.a,b:e.b,points,preserved});
}
// Keep parallel line colours distinct on newly laid-out shared corridors.
for(const [line,list] of Object.entries(paths))for(const edge of list){
 if(edge.preserved)continue;
 const pair=[edge.a,edge.b].sort().join('|'),shared=Object.keys(paths).filter(l=>paths[l].some(e=>[e.a,e.b].sort().join('|')===pair)).sort();
 const off=shared.length>1?(shared.indexOf(line)-(shared.length-1)/2)*3.2:(line==='piccadilly'?1.6:0);
 if(!off)continue;let p=edge.points,reverse=p[p.length-1][0]<p[0][0]||(p[p.length-1][0]===p[0][0]&&p[p.length-1][1]<p[0][1]);if(reverse)p=p.slice().reverse();
 let shifted=p.map((q,i)=>{let a=p[Math.max(0,i-1)],b=p[Math.min(p.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1;return [q[0]-dy/len*off,q[1]+dx/len*off];});edge.points=reverse?shifted.reverse():shifted;
}
// Every segment terminates at the same station anchor, so branches cannot split into disconnected fragments.
for(const list of Object.values(paths))for(const e of list){const a=stations[e.a],b=stations[e.b];e.points.unshift([a.x,a.y]);e.points.push([b.x,b.y]);}
for(const st of Object.values(stations)){st.terminal=st.lines.some(l=>edges.filter(e=>e.line===l&&(e.a===st.name||e.b===st.name)).length===1);}
fs.writeFileSync('assets/station-directory.js','window.StationDirectory='+JSON.stringify(Object.keys(stations))+';\n');
const out={stations:Object.values(stations),paths,source:net.source,core:'Original Tubecast schematic',note:'Hand-laid-out outer branches; TfL adjacency, not geographic projection.'};
fs.writeFileSync('assets/schematic-extension.js','/* Generated by scripts/build-schematic-extension.cjs. */\nwindow.SCHEMATIC_EXTENSION='+JSON.stringify(out)+';\n');console.log(out.stations.length+' stations; '+edges.length+' official line edges');

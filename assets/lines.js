/* Line-page data for line.html?line=<slug>
   kinds: 'delayed' (Figma V1 / V1b) · 'whole' (whole line) · 'closure' (V1c) · 'none' (V1d)
   Values for lines without a Figma frame are EXAMPLE VALUES (same templates, plausible data).
   Row bar types:  {t:'now', end:'red'|'amber'}   delayed now
                   {t:'on',  at:<0-170px>, sev:'red'|'amber'}   predicted onset
                   {t:'low'} / {t:'off'}                       closure rows                */
(function () {
  var COLS_CENTRAL = [['Now',4,'nm'],['10 min',6,'pm'],['20 min',6,'ps'],['30 min',8,'ps'],['60 min',8,'ps',1]];
  var COLS_DISTRICT = [['Now',3,'nm'],['10 min',4,'pm'],['20 min',5,'ps'],['30 min',6,'ps'],['60 min',6,'ps',1]];
  var COLS_NONE = [['Now',0,'ng'],['10 min',0,'pg'],['20 min',0,'pg'],['30 min',0,'pg'],['60 min',0,'pg',1]];
  var COLS_VIC = [['Now',3,'nm'],['10 min',3,'pm'],['20 min',3,'pm'],['30 min',3,'pm'],['60 min',3,'pm',1]];

  function none(count, pan, extra) {
    var o = { kind:'none', count:count, pan:pan, hero:{ value:'0', sub:'stations delayed now', chip:'Good service' },
      fc:{ title:'No delays now', sub:'Low chance of delays within 30 min', cols:COLS_NONE }, markers:[] };
    for (var k in (extra||{})) o[k] = extra[k];
    return o;
  }

  window.LINE_DATA = {
    central: {
      kind:'delayed', pan:[-217.46,97.3], stTop:517,
      hero:{ value:'4', sub:'stations delayed now' },
      fc:{ title:'4 stations delayed now', sub:'8 predicted within 30 min', cols:COLS_CENTRAL },
      rows:[
        { n:"Mile End",         d:'Westbound', b:{t:'now', end:'red'} },
        { n:"Bethnal Green",    d:'Westbound', b:{t:'now', end:'red'} },
        { n:"Liverpool Street", d:'Westbound', b:{t:'on', at:28.33, sev:'red'} },
        { n:"Bank",             d:'Westbound', b:{t:'on', at:56.67, sev:'red'} },
        { n:"St Paul's",        d:'Westbound', b:{t:'on', at:85,    sev:'red'} }
      ],
      markers:[
        { k:'now', c:'minor', x:377.86, y:256.38, s:44, d:16, ring:1 },
        { k:'now', c:'minor', x:331.94, y:256.38, s:44, d:16, ring:1 },
        { k:'pred', c:'severe', x:286.02, y:302.3, s:1 },
        { k:'pred', c:'severe', x:240.1,  y:348.22, s:1 }
      ]
    },
    district: {
      kind:'delayed', pan:[104.8,3.16], stTop:517,
      hero:{ value:'3', sub:'stations delayed now' },
      fc:{ title:'3 stations delayed now', sub:'6 predicted within 30 min', cols:COLS_DISTRICT },
      rows:[
        { n:"Earl's Court",     d:'Westbound', b:{t:'now', end:'red'} },
        { n:"Earl's Court",     d:'Eastbound', b:{t:'now', end:'amber'} },
        { n:"West Kensington",  d:'Westbound', b:{t:'now', end:'red'} },
        { n:"Barons Court",     d:'Westbound', b:{t:'on', at:28.33, sev:'red'} },
        { n:"Gloucester Road",  d:'Eastbound', b:{t:'on', at:28.33, sev:'red'} },
        { n:"South Kensington", d:'Eastbound', b:{t:'on', at:56.67, sev:'amber'} }
      ],
      markers:[
        { k:'now', c:'minor', x:172.04, y:300, s:40, d:12 },
        { k:'now', c:'minor', x:149.08, y:300, s:40, d:12 },
        { k:'pred', c:'severe', x:126.12, y:300, s:.85 },
        { k:'pred', c:'severe', x:217.96, y:300, s:.85 },
        { k:'pred', c:'minor',  x:263.88, y:300, s:.85 }
      ]
    },
    piccadilly: {
      kind:'closure', pan:[-124.8,183.88], stTop:493,
      hero:{ sub:'King’s Cross – Cockfosters not running' },
      fc:{ title:'Part of the line is not running',
           lines:[ { run:false, k:'Not running · both ways', v:'King’s Cross St Pancras – Cockfosters' },
                   { run:true,  k:'Running · no delays now', v:'Heathrow / Uxbridge – King’s Cross' } ] },
      rows:[
        { n:"King's Cross",      d:'Last stop northbound', b:{t:'low'} },
        { n:"Russell Square",    d:'Both ways',            b:{t:'low'} },
        { n:"Caledonian Road",   d:'Both ways',            b:{t:'off'} },
        { n:"Holloway Road",     d:'Both ways',            b:{t:'off'} },
        { n:"Arsenal",           d:'Both ways',            b:{t:'off'} }
      ],
      markers:[]
    },
    northern: none(52, [-147.23,229.26]),
    bakerloo: {
      kind:'delayed', pan:[-10.8,128.6], auto:[['now','minor'],['now','minor'],['pred','minor'],['pred','severe']],
      hero:{ value:'2', sub:'stations delayed now' },
      fc:{ title:'2 stations delayed now', sub:'3 predicted within 30 min', cols:[['Now',2,'nm'],['10 min',3,'pm'],['20 min',4,'pm'],['30 min',5,'ps'],['60 min',5,'ps',1]] },
      rows:[
        { n:"Elephant & Castle", d:'Northbound', b:{t:'now', end:'amber'} },
        { n:"Lambeth North",     d:'Northbound', b:{t:'now', end:'amber'} },
        { n:"Waterloo",          d:'Northbound', b:{t:'on', at:28.33, sev:'amber'} },
        { n:"Embankment",        d:'Northbound', b:{t:'on', at:56.67, sev:'red'} }
      ]
    },
    circle: none(36, [-68.8,85]),
    'hammersmith-city': {
      kind:'delayed', pan:[-133,83.5], auto:[['now','minor'],['pred','minor'],['pred','minor']],
      hero:{ value:'1', sub:'station delayed now' },
      fc:{ title:'1 station delayed now', sub:'2 predicted within 30 min', cols:[['Now',1,'nm'],['10 min',2,'pm'],['20 min',3,'pm'],['30 min',3,'pm'],['60 min',2,'pm',1]] },
      rows:[
        { n:"Paddington",   d:'Eastbound', b:{t:'now', end:'amber'} },
        { n:"Edgware Road", d:'Eastbound', b:{t:'on', at:28.33, sev:'amber'} },
        { n:"Baker Street", d:'Eastbound', b:{t:'on', at:56.67, sev:'amber'} }
      ]
    },
    metropolitan: {
      kind:'closure', pan:[-67.7,185.5],
      hero:{ sub:'Chesham branch not running' },
      fc:{ title:'Part of the line is not running',
           lines:[ { run:false, k:'Not running · both ways', v:'Chalfont & Latimer – Chesham' },
                   { run:true,  k:'Running · no delays now', v:'Aldgate – Amersham / Watford / Uxbridge' } ] },
      rows:[
        { n:"Chalfont & Latimer", d:'Last stop for Chesham', b:{t:'low'} },
        { n:"Chesham",            d:'Both ways',             b:{t:'off'} },
        { n:"Chorleywood",        d:'Both ways',             b:{t:'low'} }
      ]
    },
    jubilee: {
      kind:'delayed', pan:[-139.5,129.7], auto:[['now','severe'],['now','severe'],['pred','severe'],['pred','minor']],
      hero:{ value:'2', sub:'stations delayed now' },
      fc:{ title:'2 stations delayed now', sub:'4 predicted within 30 min', cols:[['Now',2,'ns'],['10 min',3,'ps'],['20 min',5,'ps'],['30 min',6,'ps'],['60 min',6,'ps',1]] },
      rows:[
        { n:"Stratford",    d:'Eastbound', b:{t:'now', end:'red'} },
        { n:"West Ham",     d:'Eastbound', b:{t:'now', end:'red'} },
        { n:"Canning Town", d:'Eastbound', b:{t:'on', at:28.33, sev:'red'} },
        { n:"Canary Wharf", d:'Westbound', b:{t:'on', at:56.67, sev:'amber'} },
        { n:"Waterloo",     d:'Westbound', b:{t:'on', at:85,    sev:'amber'} }
      ]
    },
    'waterloo-city': {
      kind:'closure', pan:[-222.4,26.1],
      hero:{ sub:'Not running today (Sunday)' },
      fc:{ title:'The line is not running', lines:[ { run:false, k:'Not running · both ways', v:'Waterloo – Bank · back Monday 05:30' } ] },
      rows:[
        { n:"Waterloo", d:'Both ways', b:{t:'off'} },
        { n:"Bank",     d:'Both ways', b:{t:'off'} }
      ]
    },
    elizabeth: none(41, [-133,151.6]),
    victoria: {
      kind:'whole', pan:[-143.2,104.1],
      hero:{ value:'3', sub:'stations delayed now' },
      fc:{ title:'3 stations delayed now', sub:'Whole line · no more predicted within 30 min', cols:COLS_VIC },
      rows:[
        { n:"Victoria",     d:'Whole line', b:{t:'now', end:'amber'} },
        { n:"Oxford Circus",d:'Whole line', b:{t:'now', end:'amber'} },
        { n:"Euston",       d:'Whole line', b:{t:'now', end:'amber'} }
      ],
      /* centres in map-frame coords = (all-lines page coords) - Central pan */
      markers:[
        { k:'now', c:'minor', x:227.96+0, y:205.0, s:44, d:16, map:1 },
        { k:'now', c:'minor', x:227.96,   y:159.1, s:44, d:16, map:1 },
        { k:'now', c:'minor', x:285.36,   y:100.0, s:44, d:16, map:1 }
      ]
    }
  };
})();

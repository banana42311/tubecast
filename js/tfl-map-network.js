/* Attach official identifiers to the designed schematic; never replace its geometry. */
(function(){
 var data=window.TFL_NETWORK;if(!data)return;
 function key(s){return String(s||'').toLowerCase().replace(/underground station|rail station/g,'').replace(/[^a-z0-9]/g,'');}
 var official={};data.stations.forEach(function(s){official[key(s.name)]=s;});
 var aliases={'edgwareroad':'Edgware Road (Circle Line)','stpauls':"St. Paul's"};
 Object.keys(StationCatalog).forEach(function(name){var s=official[key(name)]||official[key(aliases[key(name)])];if(s){StationCatalog[name].icsId=s.icsId;StationCatalog[name].naptanIds=s.naptanIds;}});
 window.SchematicJourney={points:function(line,stops){
   var g=window.FlowMap&&FlowMap.geo;if(!g)return [];
   var names={};g.stations.forEach(function(s){names[key(s.name)]=s;});
   var visible=stops.map(function(s){return names[key(s.name)];}).filter(Boolean);
   if(visible.length<2)return [];
   if(line==='walking')return [[visible[0].x,visible[0].y],[visible[visible.length-1].x,visible[visible.length-1].y]];
   var leg=g.stretch(line,visible[0].id,visible[visible.length-1].id);return leg?leg.pts:[];
 }};
})();

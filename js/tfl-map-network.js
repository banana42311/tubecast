/* Attach official identifiers to the designed schematic; never replace its geometry. */
(function(){
 var data=window.TFL_NETWORK;if(!data)return;
 function key(s){return String(s||'').toLowerCase().replace(/underground station|rail station/g,'').replace(/[^a-z0-9]/g,'').replace(/station$/,'').replace('stratfordlondon','stratford').replace('paddingtonhclineunderground','paddington').replace('kingscrossstpancras','kingscross').replace('heathrowairport','heathrow').replace(/^london(paddington|liverpoolstreet)$/,'$1');}
 var official={};data.stations.forEach(function(s){official[key(s.name)]=s;});
 var aliases={'edgwareroad':'Edgware Road (Circle Line)','stpauls':"St. Paul's"};
 Object.keys(StationCatalog).forEach(function(name){var s=official[key(name)]||official[key(aliases[key(name)])];if(s){StationCatalog[name].icsId=s.icsId;StationCatalog[name].naptanIds=s.naptanIds;}});
 window.SchematicJourney={points:function(line,stops){
   var g=window.FlowMap&&FlowMap.geo;if(!g)return [];
   var names={};g.stations.forEach(function(s){names[key(s.name)]=s;});
   var visible=stops.map(function(s){return names[key(s.name)];}).filter(Boolean);
   if(visible.length<2)return [];
   if(line==='walking')return [[visible[0].x,visible[0].y],[visible[visible.length-1].x,visible[visible.length-1].y]];
   var points=[];
   for(var i=1;i<visible.length;i++){
    var a=visible[i-1],b=visible[i],edge=window.SCHEMATIC_EXTENSION&&(SCHEMATIC_EXTENSION.paths[line]||[]).find(function(e){return e.a===a.name&&e.b===b.name||e.a===b.name&&e.b===a.name;});
    if(edge){var p=edge.a===a.name?edge.points:edge.points.slice().reverse();points=points.concat(p.map(function(q){return [q[0]*1440/656,q[1]*1440/656];}));}
    else {var leg=g.stretch(line,a.id,b.id);if(leg)points=points.concat(leg.pts);}
   }
   return points;
 }};
})();

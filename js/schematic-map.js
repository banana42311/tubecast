/* Map-only extension. Overview and line-page artwork retain the original NET. */
(function(){
 var data=window.SCHEMATIC_EXTENSION;if(!data)return;var original=NET,S=1440/656,paths=[],central=[],catalog={},labels=[];
 Object.keys(data.paths).forEach(function(line){data.paths[line].forEach(function(edge){var d=edge.points.map(function(p,i){return (i?'L':'M')+p[0].toFixed(3)+' '+p[1].toFixed(3);}).join(' ');if(line==='central')central.push(d);else paths.push([line,d]);});});
 data.stations.forEach(function(s){catalog[s.name]={name:s.name,x:s.x,y:s.y,lines:s.lines,icsId:s.icsId,naptanIds:s.naptanIds,terminal:s.terminal};labels.push([s.name,s.x*S+9,s.y*S-16,Math.max(60,s.name.length*6.2)]);});
 window.NET={colors:original.colors,water:original.water,casing:{off:[0,0],p:[]},ticks:{off:[0,0],p:[]},hubs:{off:[0,0],r:[]},stations:{},central:{off:[0,0],p:central},lines:{off:[0,0],p:paths}};
 window.StationCatalog=catalog;window.TC_LABELS=labels;window.SCHEMATIC_MAP=true;
})();

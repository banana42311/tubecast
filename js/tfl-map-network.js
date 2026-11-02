/* Complete map geometry from TfL station coordinates. Does not replace the overview artwork. */
(function(){
 var data=window.TFL_NETWORK;if(!data)return;
 var S=1440/656,lon0=-1.02,lat0=51.74;
 function project(lat,lon){return [(lon-lon0)*4000,(lat0-lat)*6400];}
 function path(points){return points.map(function(p,i){var q=project(p[1],p[0]);return (i?'L':'M')+(q[0]/S).toFixed(3)+' '+(q[1]/S).toFixed(3);}).join(' ');}
 var old=NET,all=[],central=[];
 Object.keys(data.paths).forEach(function(line){data.paths[line].forEach(function(points){var d=path(points);if(line==='central')central.push(d);else all.push([line,d]);});});
 var catalog={},labels=[],ids={};
 data.stations.forEach(function(st){var q=project(st.lat,st.lon);catalog[st.name]={name:st.name,x:q[0]/S,y:q[1]/S,lines:st.lines,icsId:st.icsId,naptanIds:st.naptanIds,lat:st.lat,lon:st.lon};labels.push([st.name,q[0]+8,q[1]-12,Math.max(60,st.name.length*6.5)]);st.naptanIds.forEach(function(id){ids[id]=st;});});
 window.NET={colors:old.colors,size:[2500,1100],water:{off:[0,0],d:''},casing:{off:[0,0],p:[]},ticks:{off:[0,0],p:[]},hubs:{off:[0,0],r:[]},stations:{},central:{off:[0,0],p:central},lines:{off:[0,0],p:all}};
 window.StationCatalog=catalog;window.TC_LABELS=labels;
 window.TFLMap={project:project,stations:data.stations,byNaptan:ids};
})();

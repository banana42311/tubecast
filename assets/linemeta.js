/* Shared line metadata. Colours match the Figma variables (see styles.css :root). */
window.LINES = [
  { slug:'bakerloo',         name:'Bakerloo',           color:'#B36305', status:'delayed' },
  { slug:'central',          name:'Central',            color:'#E1251B', status:'delayed', now:4, soon:8, dir:'west' },
  { slug:'circle',           name:'Circle',             color:'#FFD329', status:'normal' },
  { slug:'district',         name:'District',           color:'#00A33F', status:'delayed', now:3, soon:6, dir:'both' },
  { slug:'elizabeth',        name:'Elizabeth line',     color:'#8C6CD1', status:'normal' },
  { slug:'hammersmith-city', name:'Hammersmith & City', color:'#F3A9BB', status:'delayed' },
  { slug:'jubilee',          name:'Jubilee',            color:'#A0A5A9', status:'delayed' },
  { slug:'metropolitan',     name:'Metropolitan',       color:'#B5106B', status:'closed' },
  { slug:'northern',         name:'Northern',           color:'#ECF1F6', status:'normal' },
  { slug:'piccadilly',       name:'Piccadilly',         color:'#2C55C8', status:'closed' },
  { slug:'victoria',         name:'Victoria',           color:'#0098D4', status:'delayed', now:3, soon:0, dir:'whole' },
  { slug:'waterloo-city',    name:'Waterloo & City',    color:'#95CDBA', status:'closed' }
];
window.LINE_BY_SLUG = {};
window.LINES.forEach(function (l) { window.LINE_BY_SLUG[l.slug] = l; });

/* URL scheme shared by every page:
   index.html                          V2 · Stack — All lines (home)
   line.html?line=<slug>[&state=loading|stale|error]
   map.html?line=<slug>                V3 · Map
   lines.html                          V4 · Lines
   station.html?station=<slug>&line=<slug>
   route.html?from=<slug>&to=<slug>    V6 · Route result                       */

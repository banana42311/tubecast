/* Named anchors in the supplied schematic, in NET's 656×410 coordinate system.
   Explicit hub/tick identities prevent a label's nearest neighbour becoming the wrong station.
   Membership describes the portion of each line represented by this schematic. */
(function () {
  var N = window.NET, entries = {}, labels = window.TC_LABELS || [];
  function add(name, point, lines) { entries[name] = { name:name, x:point[0], y:point[1], lines:lines.split(',') }; }
  var hubs = [
    ['Edgware Road',0,'bakerloo,circle,hammersmith-city,district'],['Baker Street',1,'bakerloo,circle,hammersmith-city,metropolitan,jubilee'],
    ['Great Portland Street',2,'circle,hammersmith-city,metropolitan'],['Euston Square',3,'circle,hammersmith-city,metropolitan'],
    ["King's Cross",4,'circle,hammersmith-city,metropolitan,northern,piccadilly,victoria'],['Farringdon',5,'circle,hammersmith-city,metropolitan,elizabeth'],
    ['Barbican',6,'circle,hammersmith-city,metropolitan'],['Moorgate',7,'circle,hammersmith-city,metropolitan,northern'],
    ['Liverpool Street',8,'central,circle,hammersmith-city,metropolitan,elizabeth'],['Aldgate',9,'circle,metropolitan'],['Tower Hill',10,'circle,district'],
    ['Bank',11,'central,northern,waterloo-city'],['Cannon Street',12,'circle,district'],['Mansion House',13,'circle,district'],['Blackfriars',14,'circle,district'],['Temple',15,'circle,district'],
    ['Embankment',16,'bakerloo,circle,district,northern'],['Westminster',17,'circle,district,jubilee'],["St. James's Park",18,'circle,district'],['Victoria',19,'circle,district,victoria'],
    ['Sloane Square',20,'circle,district'],['South Kensington',21,'circle,district,piccadilly'],['Gloucester Road',22,'circle,district,piccadilly'],['High Street Kensington',23,'circle,district'],
    ['Notting Hill Gate',24,'central,circle,district'],['Bayswater',25,'circle,district'],['Paddington',26,'bakerloo,circle,district,hammersmith-city,elizabeth'],
    ['Royal Oak',27,'circle,hammersmith-city'],['Westbourne Park',28,'circle,hammersmith-city'],['Ladbroke Grove',29,'circle,hammersmith-city'],
    ['Barons Court',31,'district,piccadilly'],["Earl's Court",32,'district,piccadilly'],['Bond Street',33,'central,jubilee,elizabeth'],['Oxford Circus',34,'central,bakerloo,victoria'],
    ['Tottenham Court Road',35,'central,northern,elizabeth'],['Holborn',36,'central,piccadilly'],['Warren Street',37,'northern,victoria'],['Euston',38,'northern,victoria'],
    ['Leicester Square',39,'northern,piccadilly'],['Piccadilly Circus',40,'bakerloo,piccadilly'],['Charing Cross',41,'bakerloo,northern'],['Green Park',42,'jubilee,piccadilly,victoria'],
    ['Waterloo',43,'bakerloo,jubilee,northern,waterloo-city'],['London Bridge',44,'jubilee,northern'],['Elephant & Castle',45,'bakerloo,northern'],['Stockwell',46,'northern,victoria'],
    ['Aldgate East',47,'district,hammersmith-city'],['Whitechapel',48,'district,hammersmith-city,elizabeth'],['Stepney Green',49,'district,hammersmith-city'],
    ['Mile End',50,'central,district,hammersmith-city'],['Bow Road',51,'district,hammersmith-city'],['Canary Wharf',53,'jubilee,elizabeth'],['Finchley Road',54,'jubilee,metropolitan'],["Shepherd's Bush",56,'central']
  ];
  hubs.forEach(function (h) { var pt=N.hubs.r[h[1]]; add(h[0],[pt[0]+N.hubs.off[0],pt[1]+N.hubs.off[1]],h[2]); });
  function ticks(names, start, line) {
    names.forEach(function (name, i) { var d=N.ticks.p[start+i][1], nums=d.match(/-?\d+(?:\.\d+)?/g).map(Number); add(name,[nums[0]+N.ticks.off[0],nums[1]+N.ticks.off[1]],line); });
  }
  ticks(['Marylebone',"Regent's Park",'Lambeth North','Maida Vale'],0,'bakerloo');
  ticks(['Marble Arch','Lancaster Gate','Queensway',"St. Paul's",'Chancery Lane','White City','Holland Park'],5,'central');
  ticks(['West Kensington','West Brompton','Fulham Broadway','Parsons Green','Putney Bridge','East Putney'],12,'district');
  ticks(['Southwark','Canada Water','Bermondsey',"St. John's Wood",'Swiss Cottage','North Greenwich','West Hampstead'],18,'jubilee');
  ticks(['Nine Elms','Oval','Angel','Old Street','Borough','Chalk Farm','Mornington Crescent','Camden Town','Clapham North','Goodge Street'],25,'northern');
  ticks(['Arsenal','Holloway Road','Caledonian Road'],35,'piccadilly');
  ticks(['Highbury & Islington'],38,'victoria');
  ticks(['Russell Square'],39,'piccadilly');
  ticks(['Hyde Park Corner'],41,'piccadilly');
  ticks(['Vauxhall','Pimlico'],43,'victoria');
  ticks(['Woolwich','Custom House','Hanwell','West Ealing'],45,'elizabeth');
  add('Battersea Power Station',[390.98,378.84],'northern');
  add('Brixton',[334.5,392],'victoria');
  add('Kensington (Olympia)',[52.5,282.2],'district');
  // This drawing only contains the Central branch towards Stratford.
  add("Shepherd's Bush",[21.3,205],'central');
  add('Bethnal Green',[549.4,159.1],'central');
  add('Kennington',[411.64,377.2],'northern');
  add('Stratford',[664.2,90.2],'central');
  var S=1440/656;
  Object.keys(entries).forEach(function (name) { if (!labels.some(function(l){return l[0]===name;})) { var st=entries[name]; labels.push([name,st.x*S-28,st.y*S-25,Math.max(50,name.length*5.5)]); } });
  window.StationCatalog=entries;
})();

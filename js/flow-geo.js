/* FlowGeo — turns the drawn network into a routable graph.
   Every line path is sampled (~7 world px) into nodes; stations are virtual nodes joined to the nearest sample of each
   line that serves them, so a "transfer" = passing through a station node. Dijkstra gives routes that follow the
   *actual drawn lines*, which is what lets the map draw a polyline along the tube between any A and B.
   FlowGeo.build(ctx) → { stations, byId, byName, route(a,b,opts), lineBounds(slug), stretch(slug,a,b), nodes }   */
(function () {
  var NS = 'http://www.w3.org/2000/svg', STEP = 7;
  function kebab(s) { return String(s).toLowerCase().replace(/['’]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  function Heap() { this.a = []; }
  Heap.prototype.push = function (k, v) { var a = this.a, i = a.length; a.push([k, v]); while (i) { var p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; var t = a[p]; a[p] = a[i]; a[i] = t; i = p; } };
  Heap.prototype.pop = function () {
    var a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; var i = 0, n = a.length;
      for (;;) { var l = 2 * i + 1, r = l + 1, m = i; if (l < n && a[l][0] < a[m][0]) m = l; if (r < n && a[r][0] < a[m][0]) m = r; if (m === i) break; var t = a[m]; a[m] = a[i]; a[i] = t; i = m; } }
    return top;
  };

  function build(ctx) {
    var N = ctx.N, S = ctx.S;
    var cache=window.NET_SAMPLES,source=JSON.stringify([N.central,N.lines]),hash=2166136261;
    for(var hi=0;hi<source.length;hi++)hash=Math.imul(hash^source.charCodeAt(hi),16777619);
    var cached=!ctx.nativeSampling&&cache&&cache.version===1&&cache.signature===(hash>>>0)&&cache.step===STEP&&cache.scale===S;
    var host = document.createElementNS(NS, 'svg'); host.setAttribute('width', 0); host.setAttribute('height', 0); host.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
    if(!cached)document.body.appendChild(host);
    var nodes = [], adj = [], frag = [], ends = [], fi = 0;

    /* ---- 1. sample every line path ---- */
    ctx.slugs.forEach(function (sl) {
      var off = ctx.lineOff(sl);
      ctx.linePaths(sl).forEach(function (d, pathIndex) {
        var samples=cached&&cache.lines[sl]&&cache.lines[sl][pathIndex],p,L,n;
        if(samples){n=samples.length/2-1;}
        else {p=document.createElementNS(NS,'path');p.setAttribute('d',d);host.appendChild(p);L=p.getTotalLength();if(!L)return;n=Math.max(1,Math.ceil(L*S/STEP));}
        var prev=-1;fi++;
        for(var k=0;k<=n;k++){
          var q=samples?{x:samples[k*2],y:samples[k*2+1]}:p.getPointAtLength(L*k/n),x=(q.x+off[0])*S,y=(q.y+off[1])*S;
          var id = nodes.push({ x: x, y: y, l: sl }) - 1; adj[id] = []; frag[id] = fi;
          if (prev >= 0) { var c = Math.hypot(x - nodes[prev].x, y - nodes[prev].y); if (c < STEP * 2.6) { adj[prev].push([id, c]); adj[id].push([prev, c]); } }
          if (k === 0 || k === n) ends.push(id);
          prev = id;
        }
        if(p)host.removeChild(p);
      });
    });
    host.remove();

    /* ---- 2. spatial grid + joins between fragments of the same line ---- */
    var CELL = 24, grid = {};
    nodes.forEach(function (n, i) { var key = ((n.x / CELL) | 0) + ',' + ((n.y / CELL) | 0); (grid[key] = grid[key] || []).push(i); });
    function near(x, y, r, fn) {
      var cx = (x / CELL) | 0, cy = (y / CELL) | 0, R = Math.ceil(r / CELL);
      for (var gx = cx - R; gx <= cx + R; gx++) for (var gy = cy - R; gy <= cy + R; gy++) {
        var b = grid[gx + ',' + gy]; if (!b) continue;
        for (var i = 0; i < b.length; i++) { var n = nodes[b[i]], d = Math.hypot(n.x - x, n.y - y); if (d <= r) fn(b[i], d); }
      }
    }
    ends.forEach(function (e) {
      var ne = nodes[e], best = -1, bd = 7;
      near(ne.x, ne.y, 7, function (i, d) { if (nodes[i].l === ne.l && frag[i] !== frag[e] && d < bd) { bd = d; best = i; } });
      if (best >= 0) { adj[e].push([best, bd + .01]); adj[best].push([e, bd + .01]); }
    });

    /* ---- 3. stations ---- */
    var cand = [];
    N.hubs.r.forEach(function (r) { cand.push([(r[0] + N.hubs.off[0]) * S, (r[1] + N.hubs.off[1]) * S]); });
    Object.keys(N.stations || {}).forEach(function (sl) { N.stations[sl].forEach(function (s) { cand.push([s[0] * S, s[1] * S]); }); });
    var stations = [], byId = {}, byName = {};
    function addStation(name, ax, ay, allowed) {
      var st = { id: kebab(name), name: name, x: ax, y: ay, lines: [], nodes: {}, vn: -1 };
      var per = {};
      near(ax, ay, 32, function (i, d) { var l = nodes[i].l; if (allowed && allowed.indexOf(l) < 0) return; if (!per[l] || d < per[l][1]) per[l] = [i, d]; });
      Object.keys(per).forEach(function (l) { st.lines.push(l); st.nodes[l] = per[l][0]; });
      if (st.lines.length) {
        st.vn = nodes.push({ x: ax, y: ay, l: null, st: st.id }) - 1; adj[st.vn] = []; frag[st.vn] = 0;
        st.lines.forEach(function (l) { var i = st.nodes[l]; adj[st.vn].push([i, 0, 1]); adj[i].push([st.vn, 0, 1]); });
        /* centre the anchor on the line it sits on */
        var n0 = nodes[st.nodes[st.lines[0]]]; st.x = n0.x; st.y = n0.y;
      }
      stations.push(st); byId[st.id] = st; byName[name] = st; return st;
    }
    Object.keys(window.StationCatalog || {}).forEach(function (name) {
      var st = window.StationCatalog[name]; addStation(name, st.x*S, st.y*S, st.lines);
    });
    // O(1) station lookup during route decoding instead of every node × every station.
    var stationsAtNode = {};
    stations.forEach(function(st) { st.lines.forEach(function(line) {
      var id=st.nodes[line]; (stationsAtNode[id] || (stationsAtNode[id]=[])).push(st);
    }); });

    /* ---- 4. Dijkstra ---- */
    function dijkstra(src, dst, o) {
      o = o || {}; var tp = o.tp == null ? 60 : o.tp, allow = o.lines, avoid = o.avoid, pen = o.avoidPen || 0;
      var dist = new Float64Array(nodes.length).fill(Infinity), prev = new Int32Array(nodes.length).fill(-1), h = new Heap();
      dist[src] = 0; h.push(0, src);
      while (h.a.length) {
        var t = h.pop(), d = t[0], u = t[1]; if (d > dist[u]) continue; if (u === dst) break;
        var A = adj[u];
        for (var k = 0; k < A.length; k++) {
          var v = A[k][0], c = A[k][2] ? tp / 2 : A[k][1], nv = nodes[v];
          if (nv.l && allow && allow.indexOf(nv.l) < 0) continue;
          if (nv.l && !allow && window.LINE_BY_SLUG[nv.l].status === 'closed') continue;
          if (avoid && avoid[v]) c += pen;
          var nd = d + c; if (nd < dist[v]) { dist[v] = nd; prev[v] = u; h.push(nd, v); }
        }
      }
      if (dist[dst] === Infinity) return null;
      var path = [], u2 = dst; while (u2 >= 0) { path.push(u2); u2 = prev[u2]; } path.reverse(); return path;
    }

    function legsFrom(path) {
      var legs = [], cur = null;
      path.forEach(function (i) {
        var n = nodes[i]; if (!n.l) { cur = null; return; }
        if (!cur || cur.line !== n.l) { cur = { line: n.l, ids: [], pts: [] }; legs.push(cur); }
        cur.ids.push(i); cur.pts.push([n.x, n.y]);
      });
      /* drop degenerate legs (a transfer hop that touches a line for one sample) */
      legs = legs.filter(function (g) { return g.pts.length > 2; });
      legs.forEach(function (g) {
        var set = {}; g.ids.forEach(function (i) { set[i] = 1; });
        g.stops = []; var seen = {};
        g.ids.forEach(function (i) {
          (stationsAtNode[i] || []).forEach(function (s) { if (!seen[s.id]) { seen[s.id] = 1; g.stops.push(s); } });
        });
        var L = 0; for (var k = 1; k < g.pts.length; k++) L += Math.hypot(g.pts[k][0] - g.pts[k - 1][0], g.pts[k][1] - g.pts[k - 1][1]); g.len = L;
      });
      return legs;
    }

    function route(a, b, o) {
      var A = byId[a], B = byId[b]; if (!A || !B || A.vn < 0 || B.vn < 0 || a === b) return null;
      var path = dijkstra(A.vn, B.vn, o); if (!path) return null;
      var legs = legsFrom(path), len = 0; legs.forEach(function (g) { len += g.len; });
      return { from: A, to: B, legs: legs, len: len, transfers: Math.max(0, legs.length - 1) };
    }
    function stretch(sl, a, b) {          /* the drawn polyline of one line between two stations */
      var r = route(a, b, { lines: [sl], tp: 1e6 }); return r && r.legs[0] ? r.legs[0] : null;
    }
    function lineBounds(sl) {
      var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      nodes.forEach(function (n) { if (n.l === sl) { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); } });
      return { x0: x0, y0: y0, x1: x1, y1: y1 };
    }
    return { sampling:cached?'cached':'native', nodes: nodes, stations: stations, byId: byId, byName: byName, route: route, stretch: stretch, lineBounds: lineBounds, kebab: kebab };
  }
  window.FlowGeo = { build: build, kebab: kebab };
})();

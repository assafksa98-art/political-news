// قالب HTML عربي RTL: كرة أرضية ملء الشاشة + عرض جوي لعاصمة الدولة عند الضغط.

function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function flagImgs(codes = []) {
  return codes
    .map(
      (c) =>
        `<img class="flag" src="https://flagcdn.com/32x24/${c}.png" alt="${c}" loading="lazy" width="24" height="18" />`
    )
    .join("");
}

function thumb(url, cls) {
  if (!url) return "";
  return `<img class="${cls}" src="${escapeHtml(url)}" alt="" loading="lazy" onerror="this.style.display='none'" />`;
}

function renderFeatured(item) {
  if (!item) return "";
  const time = item.dateText ? `<span class="time">${escapeHtml(item.dateText)}</span>` : "";
  const img = item.image ? `<div class="featured-media">${thumb(item.image, "featured-img")}</div>` : "";
  const snippet = item.snippet ? `<p class="snippet" dir="auto">${escapeHtml(item.snippet)}</p>` : "";
  return `
      <a class="featured-card" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">
        ${img}
        <div class="featured-body">
          <span class="badge">الأبرز · ${escapeHtml(item.source)}</span>
          <h3 class="featured-title" dir="auto">${escapeHtml(item.title)}</h3>
          ${snippet}
          <div class="meta">${time}</div>
        </div>
      </a>`;
}

function renderItem(item, i) {
  const time = item.dateText ? `<span class="time">${escapeHtml(item.dateText)}</span>` : "";
  const img = item.image ? `<div class="card-thumb">${thumb(item.image, "card-img")}</div>` : "";
  return `
        <a class="card" style="animation-delay:${i * 60}ms" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">
          ${img}
          <div class="card-body">
            <span class="headline" dir="auto">${escapeHtml(item.title)}</span>
            <div class="meta"><span class="source">${escapeHtml(item.source)}</span>${time}</div>
          </div>
        </a>`;
}

function renderCategory(cat) {
  if (!cat.featured && !cat.items.length) return "";
  const cards = cat.items.map(renderItem).join("");
  const summary = cat.summary
    ? `<div class="summary"><span class="summary-label">الزبدة</span><p>${escapeHtml(cat.summary)}</p></div>`
    : "";
  return `
    <section class="category" id="${escapeHtml(cat.id)}">
      <h2 class="category-title">
        <span class="flags">${flagImgs(cat.flags)}</span>
        <span class="cat-name">${escapeHtml(cat.title)}</span>
      </h2>
      ${summary}
      ${renderFeatured(cat.featured)}
      <div class="cards">${cards}</div>
    </section>`;
}

export function renderPage(data) {
  const sections = data.categories.map(renderCategory).join("");
  const catTitles = {};
  for (const c of data.categories) catTitles[c.id] = c.title;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>التقرير السياسي اليومي</title>
  <meta name="description" content="أبرز الأخبار السياسية من صحف عالمية، يتحدّث تلقائياً" />
  <link rel="preconnect" href="https://flagcdn.com" />
  <link rel="preconnect" href="https://unpkg.com" />
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="sky" aria-hidden="true"><canvas id="starfield"></canvas></div>

  <section class="globe-stage" id="globe-stage">
    <div class="stage-top">
      <span class="updated"><span class="dot"></span> آخر تحديث: ${escapeHtml(data.updatedAt)}</span>
      <span class="stage-hint">اضغط على دولة لعرض عاصمتها وأخبارها</span>
    </div>
    <div id="globe"><div class="globe-loading">جارٍ تحميل الكرة الأرضية…</div></div>
    <button class="scroll-down" id="scrollDown" type="button" aria-label="عرض كل الأخبار">كل الأخبار ▾</button>
  </section>

  <div class="city-view" id="cityView" aria-hidden="true">
    <div id="cityMap"></div>
    <div class="clouds" id="clouds" aria-hidden="true"></div>
    <button class="back-btn" id="backBtn" type="button">◀ الكرة الأرضية</button>
    <div class="city-panel">
      <div class="city-name" id="cityName"></div>
      <a class="city-headline" id="cityHeadline" href="#" target="_blank" rel="noopener noreferrer"></a>
      <div class="city-more" id="cityMore"></div>
    </div>
  </div>

  <main class="wrap" id="allNews">
    ${sections}
  </main>
  <footer class="site-footer">
    <div class="wrap"><p>يتم التحديث تلقائياً عدة مرات يومياً. الأخبار من مصادرها الأصلية عبر خلاصات RSS.</p></div>
  </footer>

  <div class="toast" id="toast"></div>

  <script>
    (function () {
      var c = document.getElementById("starfield");
      if (!c || !c.getContext) return;
      var ctx = c.getContext("2d");
      var DPR = Math.min(window.devicePixelRatio || 1, 2);
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var bg = document.createElement("canvas"), bx = bg.getContext("2d");
      var W, H, stars = [], meteors = [], t = 0, band = { ang: -0.62 };

      function randn() { return (Math.random() + Math.random() + Math.random() - 1.5); }
      function color() {
        var v = Math.random();
        if (v < 0.70) return "255,255,255";
        if (v < 0.84) return "201,220,255";
        if (v < 0.93) return "255,233,208";
        return "255,212,188";
      }
      function pushStar(x, y, faint) {
        var big = Math.random();
        var r = faint ? Math.random() * 0.5 + 0.12 : (big < 0.93 ? Math.random() * 0.7 + 0.22 : Math.random() * 1.7 + 0.95);
        stars.push({
          x: x, y: y, r: r,
          base: (faint ? 0.12 : 0.28) + Math.random() * 0.4,
          amp: (r > 1.2 ? 0.22 : 0.07) + Math.random() * 0.25,
          ph: Math.random() * 6.283, sp: Math.random() * 0.026 + 0.004, col: color()
        });
      }
      function build() {
        stars = []; band.cx = W * 0.5; band.cy = H * 0.42;
        var n = Math.min(Math.round((W * H) / 3000), 620);
        for (var i = 0; i < n; i++) pushStar(Math.random() * W, Math.random() * H, false);
        var ca = Math.cos(band.ang), sa = Math.sin(band.ang);
        var bn = Math.min(Math.round((W * H) / 1700), 1100);
        for (var j = 0; j < bn; j++) {
          var along = (Math.random() - 0.5) * W * 1.6, across = randn() * H * 0.08;
          pushStar(band.cx + ca * along - sa * across, band.cy + sa * along + ca * across, true);
        }
      }
      function renderBg() {
        bg.width = Math.round(W * DPR); bg.height = Math.round(H * DPR);
        bx.setTransform(DPR, 0, 0, DPR, 0, 0);
        var g = bx.createRadialGradient(W * 0.5, -H * 0.15, 0, W * 0.5, H * 0.35, H * 1.25);
        g.addColorStop(0, "#121a28"); g.addColorStop(0.45, "#0a0e16"); g.addColorStop(1, "#05070b");
        bx.fillStyle = g; bx.fillRect(0, 0, W, H);
        bx.globalCompositeOperation = "lighter";
        var ca = Math.cos(band.ang), sa = Math.sin(band.ang);
        for (var s = -3; s <= 3; s++) {
          var px = band.cx + ca * (s * W * 0.17), py = band.cy + sa * (s * W * 0.17);
          var rg = bx.createRadialGradient(px, py, 0, px, py, Math.min(W, H) * 0.34);
          rg.addColorStop(0, "rgba(150,172,225,0.05)"); rg.addColorStop(1, "rgba(150,172,225,0)");
          bx.fillStyle = rg; bx.fillRect(0, 0, W, H);
        }
        var neb = [["120,150,255", 0.05], ["175,130,255", 0.045], ["90,200,220", 0.038]];
        for (var k = 0; k < neb.length; k++) {
          var nx = band.cx + (Math.random() - 0.4) * W * 0.7, ny = band.cy + (Math.random() - 0.5) * H * 0.4;
          var ng = bx.createRadialGradient(nx, ny, 0, nx, ny, Math.min(W, H) * 0.3);
          ng.addColorStop(0, "rgba(" + neb[k][0] + "," + neb[k][1] + ")"); ng.addColorStop(1, "rgba(" + neb[k][0] + ",0)");
          bx.fillStyle = ng; bx.fillRect(0, 0, W, H);
        }
        bx.globalCompositeOperation = "source-over";
      }
      function resize() {
        W = window.innerWidth; H = window.innerHeight;
        c.style.width = W + "px"; c.style.height = H + "px";
        c.width = Math.round(W * DPR); c.height = Math.round(H * DPR);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        build(); renderBg();
      }
      function spawnMeteor() {
        var x = Math.random() * W * 0.7 + W * 0.2, y = Math.random() * H * 0.35;
        var ang = Math.PI * 0.78 + (Math.random() * 0.24 - 0.12);
        var sp = Math.random() * 5 + 7;
        meteors.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0, max: Math.random() * 35 + 45, len: Math.random() * 100 + 80 });
      }
      function frame() {
        t++;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(bg, 0, 0);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        for (var i = 0; i < stars.length; i++) {
          var s = stars[i];
          var a = reduce ? s.base + s.amp * 0.5 : s.base + Math.sin(t * s.sp + s.ph) * s.amp;
          if (a < 0.03) a = 0.03; if (a > 1) a = 1;
          if (s.r > 1.15) {
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 2.8, 0, 6.283);
            ctx.fillStyle = "rgba(" + s.col + "," + (a * 0.09).toFixed(3) + ")"; ctx.fill();
          }
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283);
          ctx.fillStyle = "rgba(" + s.col + "," + a.toFixed(3) + ")"; ctx.fill();
        }
        if (!reduce) {
          if (Math.random() < 0.01 && meteors.length < 2) spawnMeteor();
          for (var j = meteors.length - 1; j >= 0; j--) {
            var m = meteors[j]; m.life++; m.x += m.vx; m.y += m.vy;
            var p = m.life / m.max, al = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
            if (al < 0) al = 0;
            var d = Math.hypot(m.vx, m.vy), tx = m.x - (m.vx / d) * m.len, ty = m.y - (m.vy / d) * m.len;
            var lg = ctx.createLinearGradient(m.x, m.y, tx, ty);
            lg.addColorStop(0, "rgba(255,255,255," + al.toFixed(3) + ")");
            lg.addColorStop(1, "rgba(255,255,255,0)");
            ctx.strokeStyle = lg; ctx.lineWidth = 2; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tx, ty); ctx.stroke();
            ctx.beginPath(); ctx.arc(m.x, m.y, 1.7, 0, 6.283); ctx.fillStyle = "rgba(255,255,255," + al.toFixed(3) + ")"; ctx.fill();
            if (m.life >= m.max || m.x < -140 || m.y > H + 140) meteors.splice(j, 1);
          }
        }
        requestAnimationFrame(frame);
      }
      window.addEventListener("resize", resize);
      resize(); frame();
    })();
  </script>
  <script src="https://cdn.jsdelivr.net/npm/globe.gl"></script>
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <script>
    window.__NEWS__ = ${JSON.stringify(data.newsByCat)};
    window.__CAT_TITLES__ = ${JSON.stringify(catTitles)};
  </script>
  <script>
    (function () {
      var NEWS = window.__NEWS__, CAT_TITLES = window.__CAT_TITLES__;
      // ISO / اسم الدولة -> {الفئة، إحداثيات العاصمة، اسم العاصمة}
      var INFO = {
        IR: { cat:"iran-us", lat:35.6892, lng:51.3890, cap:"طهران" },
        US: { cat:"usa",     lat:38.9072, lng:-77.0369, cap:"واشنطن" },
        SA: { cat:"saudi",   lat:24.7136, lng:46.6753, cap:"الرياض" },
        AE: { cat:"gulf",    lat:24.4539, lng:54.3773, cap:"أبوظبي" },
        QA: { cat:"gulf",    lat:25.2867, lng:51.5310, cap:"الدوحة" },
        KW: { cat:"gulf",    lat:29.3759, lng:47.9774, cap:"الكويت" },
        BH: { cat:"gulf",    lat:26.2285, lng:50.5860, cap:"المنامة" },
        OM: { cat:"gulf",    lat:23.5880, lng:58.3829, cap:"مسقط" },
        UA: { cat:"ukraine", lat:50.4501, lng:30.5234, cap:"كييف" },
        RU: { cat:"russia",  lat:55.7558, lng:37.6173, cap:"موسكو" },
        CN: { cat:"china",   lat:39.9042, lng:116.4074, cap:"بكين" }
      };
      var NAME_ISO = {
        "Iran":"IR","United States of America":"US","United States":"US","Saudi Arabia":"SA",
        "United Arab Emirates":"AE","Qatar":"QA","Kuwait":"KW","Bahrain":"BH","Oman":"OM",
        "Ukraine":"UA","Russia":"RU","China":"CN"
      };

      var toastEl = document.getElementById("toast"), toastTimer;
      function toast(m){ toastEl.textContent=m; toastEl.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(function(){toastEl.classList.remove("show");},2600); }

      var el = document.getElementById("globe"), stage = document.getElementById("globe-stage");
      var cityView = document.getElementById("cityView");
      var cloudsEl = document.getElementById("clouds");
      var world = null, map = null;

      function showClouds(){ cloudsEl.style.transition = "none"; cloudsEl.style.opacity = "1"; cloudsEl.style.transform = "scale(1.05)"; }
      function hideClouds(){ cloudsEl.style.transition = "opacity 1.4s ease, transform 1.9s ease"; cloudsEl.style.opacity = "0"; cloudsEl.style.transform = "scale(2.1)"; }

      function infoOf(p){ return INFO[p.ISO_A2] || INFO[NAME_ISO[p.ADMIN]] || INFO[NAME_ISO[p.NAME]] || null; }
      function has(p){ var i=infoOf(p); return !!i && NEWS[i.cat] && NEWS[i.cat].length; }

      var newsBtn = document.getElementById("scrollDown");
      newsBtn.addEventListener("click", function(){
        var open = document.body.classList.toggle("news-open");
        newsBtn.textContent = open ? "إخفاء الأخبار ▴" : "كل الأخبار ▾";
        if (open) setTimeout(function(){ document.getElementById("allNews").scrollIntoView({behavior:"smooth"}); }, 40);
        else window.scrollTo({ top:0, behavior:"smooth" });
      });

      // === العرض الجوي 3D للعاصمة (MapLibre + أقمار Esri + مباني OpenFreeMap) ===
      function mapStyle(){
        return {
          version: 8,
          light: { anchor:"viewport", color:"#ffffff", intensity:0.45, position:[1.2, 200, 28] },
          sources: {
            sat: { type:"raster", tiles:["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize:256, maxzoom:19, attribution:"Esri" },
            ofm: { type:"vector", url:"https://tiles.openfreemap.org/planet" }
          },
          layers: [
            { id:"sat", type:"raster", source:"sat" },
            { id:"buildings3d", type:"fill-extrusion", source:"ofm", "source-layer":"building", minzoom:13,
              filter:["!=", ["get","hide_3d"], true],
              paint:{
                "fill-extrusion-color":[
                  "interpolate", ["linear"], ["coalesce", ["get","render_height"], 8],
                  0, "#e7e9ee", 25, "#d3d8e0", 70, "#bac1cd", 150, "#99a2b2", 320, "#7c8797"
                ],
                "fill-extrusion-height":["coalesce",["get","render_height"],["get","height"],8],
                "fill-extrusion-base":["coalesce",["get","render_min_height"],["get","min_height"],0],
                "fill-extrusion-opacity":0.95,
                "fill-extrusion-vertical-gradient":true
              }
            }
          ]
        };
      }
      function ensureMap(info){
        if (map) return map;
        map = new maplibregl.Map({
          container:"cityMap", style:mapStyle(),
          center:[info.lng, info.lat], zoom:11, pitch:0, bearing:0,
          attributionControl:false, dragRotate:true
        });
        map.on("error", function(){});
        return map;
      }
      function flyToCapital(m, info){
        m.jumpTo({ center:[info.lng, info.lat], zoom:11.5, pitch:0, bearing:0 });
        m.flyTo({ center:[info.lng, info.lat], zoom:16.6, pitch:62, bearing:-18, duration:3000, curve:1.5, essential:true });
      }
      function openCity(info){
        var list = NEWS[info.cat] || [];
        cityView.classList.add("show");
        cityView.setAttribute("aria-hidden","false");
        showClouds();
        var m = ensureMap(info);
        setTimeout(function(){ m.resize(); flyToCapital(m, info); }, 60);
        setTimeout(hideClouds, 1200);
        document.getElementById("cityName").textContent = info.cap + " · " + (CAT_TITLES[info.cat]||"");
        var head = document.getElementById("cityHeadline");
        if (list[0]) { head.textContent = list[0].title; head.href = list[0].link; head.style.display="block"; head.setAttribute("dir","auto"); }
        else head.style.display="none";
        var more = document.getElementById("cityMore");
        more.innerHTML = list.slice(1,5).map(function(n){
          return '<a href="'+n.link+'" target="_blank" rel="noopener noreferrer" dir="auto">'+ n.title.replace(/</g,"&lt;") +' <span>· '+ n.source +'</span></a>';
        }).join("");
      }
      function closeCity(){
        cityView.classList.remove("show");
        cityView.setAttribute("aria-hidden","true");
        if (world) { world.pointOfView({ lat:20, lng:20, altitude:2.4 }, 1200); world.controls().autoRotate = true; }
      }
      document.getElementById("backBtn").addEventListener("click", closeCity);
      document.addEventListener("keydown", function(e){ if(e.key==="Escape" && cityView.classList.contains("show")) closeCity(); });

      // === الكرة الأرضية ===
      function size(){ var w = el.clientWidth||800; var h = Math.max(Math.min(window.innerHeight - 70, 900), 360); return { w:w, h:h }; }
      if (typeof Globe === "undefined") { el.innerHTML = "<div class='globe-loading'>تعذّر تحميل الكرة — مرّر للأسفل لعرض الأخبار.</div>"; return; }

      fetch("https://cdn.jsdelivr.net/gh/vasturiano/globe.gl/example/datasets/ne_110m_admin_0_countries.geojson")
        .then(function(r){ return r.json(); })
        .then(function(geo){
          el.innerHTML = "";
          var sz = size();
          world = Globe()(el)
            .width(sz.w).height(sz.h)
            .backgroundColor("rgba(0,0,0,0)")
            .showAtmosphere(true).atmosphereColor("#4a9eda")
            .globeImageUrl("//unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
            .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
            .polygonsData(geo.features)
            .polygonAltitude(function(f){ return has(f.properties) ? 0.02 : 0.006; })
            .polygonCapColor(function(f){ return has(f.properties) ? "rgba(74,158,218,0.38)" : "rgba(255,255,255,0.015)"; })
            .polygonSideColor(function(f){ return has(f.properties) ? "rgba(74,158,218,0.28)" : "rgba(255,255,255,0)"; })
            .polygonStrokeColor(function(f){ return has(f.properties) ? "rgba(140,200,245,0.95)" : "rgba(255,255,255,0.10)"; })
            .polygonLabel(function(f){ var i=infoOf(f.properties); return "<div style='font-family:sans-serif;text-align:center;color:#fff'><b>"+(f.properties.ADMIN||"")+"</b><br/>"+(i && NEWS[i.cat] && NEWS[i.cat].length ? "اضغط لعرض العاصمة والأخبار" : "لا توجد أخبار")+"</div>"; })
            .onPolygonClick(function(f){
              var info = infoOf(f.properties);
              if(!info){ toast("لا توجد أخبار مخصصة لهذه الدولة"); return; }
              if(!(NEWS[info.cat] && NEWS[info.cat].length)){ toast("لا توجد أخبار حالياً عن "+(CAT_TITLES[info.cat]||"هذه الدولة")); return; }
              world.controls().autoRotate = false;
              world.pointOfView({ lat:info.lat, lng:info.lng, altitude:0.6 }, 1300);
              setTimeout(function(){ openCity(info); }, 1250);
            });

          world.pointOfView({ lat:20, lng:20, altitude:2.4 }, 0);
          // إجبار شفافية خلفية الكرة حتى تظهر النجوم والشهب من حولها
          try {
            if (world.renderer) world.renderer().setClearColor(0x000000, 0);
            if (world.scene) world.scene().background = null;
            var cv = el.querySelector("canvas"); if (cv) cv.style.background = "transparent";
          } catch (e) {}
          var c = world.controls(); c.autoRotate = true; c.autoRotateSpeed = 0.5; c.enableZoom = true; c.minDistance = 160;
          window.addEventListener("resize", function(){ var s=size(); world.width(s.w).height(s.h); });
        })
        .catch(function(){ el.innerHTML = "<div class='globe-loading'>تعذّر تحميل الكرة — مرّر للأسفل لعرض الأخبار.</div>"; });
    })();
  </script>
</body>
</html>`;
}

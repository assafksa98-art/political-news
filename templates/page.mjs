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
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="sky" aria-hidden="true">
    <div class="stars"></div>
    <div class="stars2"></div>
    <div class="stars3"></div>
    <div class="shooting-stars">
      <span style="top:6%; left:18%; animation-delay:0s"></span>
      <span style="top:2%; left:52%; animation-delay:3.5s"></span>
      <span style="top:12%; left:74%; animation-delay:6s"></span>
      <span style="top:30%; left:88%; animation-delay:9.5s"></span>
      <span style="top:20%; left:35%; animation-delay:13s"></span>
    </div>
  </div>

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

  <script src="https://cdn.jsdelivr.net/npm/globe.gl"></script>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
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
      var world = null, leaf = null, leafMarker = null;

      function infoOf(p){ return INFO[p.ISO_A2] || INFO[NAME_ISO[p.ADMIN]] || INFO[NAME_ISO[p.NAME]] || null; }
      function has(p){ var i=infoOf(p); return !!i && NEWS[i.cat] && NEWS[i.cat].length; }

      document.getElementById("scrollDown").addEventListener("click", function(){
        document.getElementById("allNews").scrollIntoView({behavior:"smooth"});
      });

      // === العرض الجوي للعاصمة (Leaflet + صور أقمار Esri) ===
      function ensureLeaf(){
        if (leaf) return leaf;
        leaf = L.map("cityMap", { zoomControl:false, attributionControl:false });
        L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom:18 }).addTo(leaf);
        L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { maxZoom:18 }).addTo(leaf);
        return leaf;
      }
      function openCity(info){
        var list = NEWS[info.cat] || [];
        cityView.classList.add("show");
        cityView.setAttribute("aria-hidden","false");
        var m = ensureLeaf();
        setTimeout(function(){ m.invalidateSize(); m.setView([info.lat, info.lng], 14, { animate:false }); if(leafMarker) m.removeLayer(leafMarker); leafMarker = L.marker([info.lat, info.lng]).addTo(m).bindPopup(info.cap).openPopup(); }, 60);
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
            .polygonCapColor(function(f){ return has(f.properties) ? "rgba(240,136,62,0.35)" : "rgba(255,255,255,0.015)"; })
            .polygonSideColor(function(f){ return has(f.properties) ? "rgba(240,136,62,0.25)" : "rgba(255,255,255,0)"; })
            .polygonStrokeColor(function(f){ return has(f.properties) ? "rgba(255,193,120,0.95)" : "rgba(255,255,255,0.10)"; })
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
          var c = world.controls(); c.autoRotate = true; c.autoRotateSpeed = 0.5; c.enableZoom = true; c.minDistance = 160;
          window.addEventListener("resize", function(){ var s=size(); world.width(s.w).height(s.h); });
        })
        .catch(function(){ el.innerHTML = "<div class='globe-loading'>تعذّر تحميل الكرة — مرّر للأسفل لعرض الأخبار.</div>"; });
    })();
  </script>
</body>
</html>`;
}

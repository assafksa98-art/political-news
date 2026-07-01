// قالب HTML عربي RTL مع كرة أرضية تفاعلية. renderPage تُعيد الصفحة كاملة.

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
  const visible = data.categories.filter((c) => c.featured || c.items.length);
  const nav = visible
    .map(
      (c) =>
        `<a href="#${escapeHtml(c.id)}">${flagImgs(c.flags)}<span>${escapeHtml(c.title)}</span></a>`
    )
    .join("");
  const sections = data.categories.map(renderCategory).join("");

  const catTitles = {};
  const present = [];
  for (const c of data.categories) {
    catTitles[c.id] = c.title;
    if (c.featured || c.items.length) present.push(c.id);
  }

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
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="site-header">
    <div class="wrap">
      <p class="updated"><span class="dot"></span> آخر تحديث: ${escapeHtml(data.updatedAt)} (توقيت السعودية)</p>
    </div>
  </header>

  <section class="globe-hero" id="globe-hero">
    <p class="globe-hint">اضغط على <b>دولة</b> في الكرة الأرضية لعرض أخبارها</p>
    <div id="globe"><div class="globe-loading">جارٍ تحميل الكرة الأرضية…</div></div>
    <nav class="nav wrap">${nav}</nav>
  </section>

  <main class="wrap">
    ${sections}
  </main>
  <footer class="site-footer">
    <div class="wrap">
      <p>يتم التحديث تلقائياً عدة مرات يومياً. الأخبار من مصادرها الأصلية عبر خلاصات RSS.</p>
    </div>
  </footer>

  <div class="toast" id="toast"></div>

  <script src="https://cdn.jsdelivr.net/npm/globe.gl"></script>
  <script>
    (function () {
      var ISO_CAT = { IR:"iran-us", US:"usa", SA:"saudi", AE:"gulf", QA:"gulf", KW:"gulf", BH:"gulf", OM:"gulf", UA:"ukraine", RU:"russia", CN:"china" };
      var NAME_CAT = { "Iran":"iran-us", "United States of America":"usa", "United States":"usa", "Saudi Arabia":"saudi", "United Arab Emirates":"gulf", "Qatar":"gulf", "Kuwait":"gulf", "Bahrain":"gulf", "Oman":"gulf", "Ukraine":"ukraine", "Russia":"russia", "China":"china" };
      var CAT_TITLES = ${JSON.stringify(catTitles)};
      var PRESENT = new Set(${JSON.stringify(present)});
      var el = document.getElementById("globe");
      var hero = document.getElementById("globe-hero");
      var toastEl = document.getElementById("toast");
      var toastTimer;

      function toast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2600);
      }
      function catOf(p) { return ISO_CAT[p.ISO_A2] || NAME_CAT[p.ADMIN] || NAME_CAT[p.NAME] || null; }
      function hasNews(p) { var c = catOf(p); return !!c && PRESENT.has(c); }
      function goTo(cat) {
        var t = document.getElementById(cat);
        if (t) {
          t.scrollIntoView({ behavior: "smooth", block: "start" });
          t.classList.add("flash");
          setTimeout(function () { t.classList.remove("flash"); }, 1600);
        } else {
          toast("لا توجد أخبار حالياً عن " + (CAT_TITLES[cat] || "هذه الدولة"));
        }
      }
      function size() {
        var w = el.clientWidth || 800;
        var h = Math.min(Math.max(Math.round(w * 0.62), 300), 520);
        return { w: w, h: h };
      }

      if (typeof Globe === "undefined") { hero.style.display = "none"; return; }

      fetch("https://cdn.jsdelivr.net/gh/vasturiano/globe.gl/example/datasets/ne_110m_admin_0_countries.geojson")
        .then(function (r) { return r.json(); })
        .then(function (geo) {
          el.innerHTML = "";
          var sz = size();
          var world = Globe()(el)
            .width(sz.w).height(sz.h)
            .backgroundColor("rgba(0,0,0,0)")
            .showAtmosphere(true)
            .atmosphereColor("#4a9eda")
            .globeImageUrl("//unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
            .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
            .polygonsData(geo.features)
            .polygonAltitude(function (f) { return hasNews(f.properties) ? 0.07 : 0.012; })
            .polygonCapColor(function (f) { return hasNews(f.properties) ? "rgba(240,136,62,0.85)" : (catOf(f.properties) ? "rgba(240,136,62,0.30)" : "rgba(255,255,255,0.05)"); })
            .polygonSideColor(function () { return "rgba(240,136,62,0.15)"; })
            .polygonStrokeColor(function () { return "rgba(255,255,255,0.25)"; })
            .polygonLabel(function (f) {
              var c = catOf(f.properties);
              var tip = c ? (PRESENT.has(c) ? "اضغط لعرض الأخبار" : "لا توجد أخبار حالياً") : "";
              return "<div style='font-family:sans-serif;text-align:center'><b>" + (f.properties.ADMIN || f.properties.NAME || "") + "</b><br/>" + tip + "</div>";
            })
            .onPolygonClick(function (f) {
              var c = catOf(f.properties);
              if (c) goTo(c);
              else toast("لا توجد أخبار مخصصة لهذه الدولة");
            });

          var controls = world.controls();
          controls.autoRotate = true;
          controls.autoRotateSpeed = 0.55;
          controls.enableZoom = false;

          window.addEventListener("resize", function () {
            var s = size();
            world.width(s.w).height(s.h);
          });
        })
        .catch(function () { hero.style.display = "none"; });
    })();
  </script>
</body>
</html>`;
}

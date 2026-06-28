// قالب HTML عربي RTL. dالة renderPage تُعيد نص الصفحة كاملاً.

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

// صورة مصغّرة مع إخفاء تلقائي عند فشل التحميل
function thumb(url, cls) {
  if (!url) return "";
  return `<img class="${cls}" src="${escapeHtml(url)}" alt="" loading="lazy" onerror="this.style.display='none'" />`;
}

function renderFeatured(item) {
  if (!item) return "";
  const time = item.dateText ? `<span class="time">${escapeHtml(item.dateText)}</span>` : "";
  const img = item.image
    ? `<div class="featured-media">${thumb(item.image, "featured-img")}</div>`
    : "";
  const snippet = item.snippet ? `<p class="snippet">${escapeHtml(item.snippet)}</p>` : "";
  return `
      <a class="featured-card" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">
        ${img}
        <div class="featured-body">
          <span class="badge">الأبرز · ${escapeHtml(item.source)}</span>
          <h3 class="featured-title">${escapeHtml(item.title)}</h3>
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
            <span class="headline">${escapeHtml(item.title)}</span>
            <div class="meta"><span class="source">${escapeHtml(item.source)}</span>${time}</div>
          </div>
        </a>`;
}

function renderCategory(cat) {
  if (!cat.featured && !cat.items.length) return "";
  const cards = cat.items.map(renderItem).join("");
  return `
    <section class="category" id="${escapeHtml(cat.id)}">
      <h2 class="category-title">
        <span class="flags">${flagImgs(cat.flags)}</span>
        <span class="cat-name">${escapeHtml(cat.title)}</span>
      </h2>
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

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>التقرير السياسي اليومي</title>
  <meta name="description" content="أبرز الأخبار السياسية، يتحدّث تلقائياً" />
  <link rel="preconnect" href="https://flagcdn.com" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="site-header">
    <div class="wrap">
      <h1>التقرير السياسي اليومي</h1>
      <p class="subtitle">أبرز الأخبار في كل موضوع — مُحدّثة تلقائياً</p>
      <p class="updated"><span class="dot"></span> آخر تحديث: ${escapeHtml(data.updatedAt)} (توقيت السعودية)</p>
      <nav class="nav">${nav}</nav>
    </div>
  </header>
  <main class="wrap">
    ${sections}
  </main>
  <footer class="site-footer">
    <div class="wrap">
      <p>يتم التحديث تلقائياً عدة مرات يومياً. الأخبار من مصادرها الأصلية عبر خلاصات RSS.</p>
    </div>
  </footer>
</body>
</html>`;
}

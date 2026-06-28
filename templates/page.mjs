// قالب HTML عربي RTL. دالة renderPage تُعيد نص الصفحة كاملاً.

function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderItem(item) {
  const time = item.dateText ? `<span class="time">${escapeHtml(item.dateText)}</span>` : "";
  const snippet = item.snippet
    ? `<p class="snippet">${escapeHtml(item.snippet)}</p>`
    : "";
  return `
      <article class="card">
        <a class="headline" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
        ${snippet}
        <div class="meta">
          <span class="source">${escapeHtml(item.source)}</span>
          ${time}
        </div>
      </article>`;
}

function renderCategory(cat) {
  if (!cat.items.length) return "";
  const summary = cat.summary
    ? `<p class="summary">${escapeHtml(cat.summary)}</p>`
    : "";
  const cards = cat.items.map(renderItem).join("");
  return `
    <section class="category" id="${escapeHtml(cat.id)}">
      <h2 class="category-title">${escapeHtml(cat.title)} <span class="count">${cat.items.length}</span></h2>
      ${summary}
      <div class="cards">${cards}</div>
    </section>`;
}

/**
 * @param {{updatedAt:string, categories:Array, sourceCount:number, totalItems:number}} data
 */
export function renderPage(data) {
  const nav = data.categories
    .filter((c) => c.items.length)
    .map((c) => `<a href="#${escapeHtml(c.id)}">${escapeHtml(c.title)}</a>`)
    .join("");
  const sections = data.categories.map(renderCategory).join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>التقرير السياسي اليومي</title>
  <meta name="description" content="تقرير يومي للأخبار السياسية يتحدّث تلقائياً" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="site-header">
    <div class="wrap">
      <h1>التقرير السياسي اليومي</h1>
      <p class="subtitle">إيران–أمريكا · السعودية · الخليج · أوكرانيا · روسيا · الصين · أمريكا</p>
      <p class="updated">آخر تحديث: ${escapeHtml(data.updatedAt)} (توقيت السعودية) · ${data.totalItems} خبراً من ${data.sourceCount} مصادر</p>
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

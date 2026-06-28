// السكربت الرئيسي: يجلب RSS بالتوازي، يوحّد ويزيل التكرار، يصنّف،
// (اختيارياً) يلخّص عبر Claude، ثم يكتب dist/index.html و dist/styles.css.

import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Parser from "rss-parser";
import { FEEDS, CATEGORIES } from "./feeds.js";
import { renderPage } from "./templates/page.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "dist");
const ITEMS_PER_CATEGORY = 10;

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; PoliticalNewsBot/1.0)" },
});

function stripHtml(s = "") {
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function formatRiyadh(date) {
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      timeZone: "Asia/Riyadh",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

// يجلب خلاصة واحدة ويعيد عناصرها الموحّدة، أو [] عند الفشل.
async function fetchFeed(feed) {
  try {
    const parsed = await parser.parseURL(feed.url);
    const items = (parsed.items || []).map((it) => {
      const dateRaw = it.isoDate || it.pubDate || null;
      const date = dateRaw ? new Date(dateRaw) : null;
      return {
        title: stripHtml(it.title || "").trim(),
        link: (it.link || "").trim(),
        snippet: stripHtml(it.contentSnippet || it.content || it.summary || "").slice(0, 220),
        source: feed.name,
        date: date && !isNaN(date) ? date : null,
      };
    });
    console.log(`✓ ${feed.name}: ${items.length} عنصر`);
    return items.filter((it) => it.title && it.link);
  } catch (err) {
    console.warn(`✗ ${feed.name}: فشل الجلب (${err.message})`);
    return [];
  }
}

function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = (it.link || it.title).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

function categorize(item) {
  const haystack = `${item.title} ${item.snippet}`;
  for (const cat of CATEGORIES) {
    if (cat.keywords.length && cat.keywords.some((k) => haystack.includes(k))) {
      return cat.id;
    }
  }
  return "other";
}

async function main() {
  console.log("جلب الخلاصات...");
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  let all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  all = dedupe(all);
  // ترتيب تنازلي حسب التاريخ (الأخبار بلا تاريخ في الأسفل)
  all.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

  // توزيع على الفئات
  const byCat = new Map(CATEGORIES.map((c) => [c.id, []]));
  for (const it of all) byCat.get(categorize(it)).push(it);

  // التلخيص الاختياري عبر Claude عند توفّر المفتاح
  let summarizeCategory = null;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      ({ summarizeCategory } = await import("./lib/summarize.mjs"));
      console.log("التلخيص بـ Claude: مُفعّل");
    } catch (err) {
      console.warn(`تعذّر تحميل وحدة التلخيص: ${err.message}`);
    }
  } else {
    console.log("التلخيص بـ Claude: غير مُفعّل (لا يوجد ANTHROPIC_API_KEY)");
  }

  const categories = [];
  for (const cat of CATEGORIES) {
    const items = byCat.get(cat.id).slice(0, ITEMS_PER_CATEGORY).map((it) => ({
      ...it,
      dateText: it.date ? formatRiyadh(it.date) : "",
    }));
    let summary = "";
    if (summarizeCategory && items.length) {
      summary = await summarizeCategory(cat.title, items);
    }
    categories.push({ id: cat.id, title: cat.title, items, summary });
  }

  const html = renderPage({
    updatedAt: formatRiyadh(new Date()),
    categories,
    sourceCount: FEEDS.length,
    totalItems: all.length,
  });

  await mkdir(DIST, { recursive: true });
  await writeFile(join(DIST, "index.html"), html, "utf8");
  await copyFile(join(__dirname, "public", "styles.css"), join(DIST, "styles.css"));
  await copyFile(join(__dirname, "public", "robots.txt"), join(DIST, "robots.txt"));

  console.log(`\nتم البناء: ${all.length} خبراً في dist/index.html`);
}

main().catch((err) => {
  console.error("فشل البناء:", err);
  process.exit(1);
});

// السكربت الرئيسي: يجلب RSS بالتوازي، يوحّد ويزيل التكرار، يصنّف،
// يختار «أبرز الأخبار» لكل فئة، ثم يكتب dist/index.html و dist/styles.css.

import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Parser from "rss-parser";
import { FEEDS, CATEGORIES } from "./feeds.js";
import { renderPage } from "./templates/page.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "dist");
const TOP_PER_CATEGORY = 6; // أبرز الأخبار: خبر رئيسي + 5 مختارات

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; PoliticalNewsBot/1.0)" },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail"],
      ["media:group", "mediaGroup"],
      ["content:encoded", "contentEncoded"],
      ["enclosure", "enclosure"],
    ],
  },
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

// يستخرج رابط صورة من حقول RSS المتعددة، أو "" إن لم توجد.
function pickImage(it) {
  const fromMedia = (m) => {
    if (!m) return null;
    if (Array.isArray(m)) {
      for (const x of m) {
        const u = x?.$?.url;
        if (u && /\.(jpe?g|png|webp|gif)/i.test(u)) return u;
      }
      return m[0]?.$?.url || null;
    }
    return m?.$?.url || null;
  };
  if (it.enclosure?.url && /^image\//.test(it.enclosure.type || "image/")) {
    return it.enclosure.url;
  }
  let u = fromMedia(it.mediaContent) || fromMedia(it.mediaThumbnail);
  if (u) return u;
  if (it.mediaGroup) {
    u = fromMedia(it.mediaGroup["media:content"]) || fromMedia(it.mediaGroup["media:thumbnail"]);
    if (u) return u;
  }
  const html = it.contentEncoded || it.content || "";
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  if (m) return m[1];
  return "";
}

// مؤقّت صارم: يضمن عدم تجمّد عملية الجلب مهما حصل (بعض الخوادم لا يقطعها مؤقّت rss-parser).
function withHardTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`مهلة صارمة (${ms / 1000}ث)`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function fetchFeed(feed) {
  try {
    const parsed = await withHardTimeout(parser.parseURL(feed.url), 20000);
    const items = (parsed.items || []).map((it) => {
      const dateRaw = it.isoDate || it.pubDate || null;
      const date = dateRaw ? new Date(dateRaw) : null;
      return {
        title: stripHtml(it.title || "").trim(),
        link: (it.link || "").trim(),
        snippet: stripHtml(it.contentSnippet || it.content || it.summary || "").slice(0, 220),
        image: pickImage(it),
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

// ترتيب الأهمية: الأحدث أولاً، مع تفضيل بسيط للأخبار التي تحمل صورة.
function importanceSort(a, b) {
  const t = (b.date?.getTime() || 0) - (a.date?.getTime() || 0);
  if (t !== 0) return t;
  return (b.image ? 1 : 0) - (a.image ? 1 : 0);
}

async function main() {
  console.log("جلب الخلاصات...");
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  let all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  all = dedupe(all);
  all.sort(importanceSort);

  const byCat = new Map(CATEGORIES.map((c) => [c.id, []]));
  for (const it of all) byCat.get(categorize(it)).push(it);

  // التلخيص الذكي عبر Claude — يُفعّل تلقائياً فقط عند وجود ANTHROPIC_API_KEY
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
    const picked = byCat
      .get(cat.id)
      .slice(0, TOP_PER_CATEGORY)
      .map((it) => ({ ...it, dateText: it.date ? formatRiyadh(it.date) : "" }));
    let summary = "";
    if (summarizeCategory && picked.length) {
      summary = await summarizeCategory(cat.title, picked);
    }
    categories.push({
      id: cat.id,
      title: cat.title,
      flags: cat.flags || [],
      summary,
      featured: picked[0] || null,
      items: picked.slice(1),
    });
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

  console.log(`\nتم البناء: ${all.length} خبراً (أبرزها في كل فئة) في dist/index.html`);
}

main().catch((err) => {
  console.error("فشل البناء:", err);
  process.exit(1);
});

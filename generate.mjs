// السكربت الرئيسي: يجلب RSS بالتوازي، يوحّد ويزيل التكرار، يُبقي السياسي فقط،
// يصنّف، يختار «أبرز الأخبار» لكل فئة، ثم يكتب dist/index.html و dist/styles.css.

import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Parser from "rss-parser";
import { FEEDS, CATEGORIES, POLITICAL_KEYWORDS } from "./feeds.js";
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

// مطابقة بحدود الكلمات (تتجنّب المطابقات الجزئية مثل "war" داخل "warehouse").
function makeMatcher(terms) {
  if (!terms || !terms.length) return null;
  const esc = terms.map((t) => t.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`(^|[^a-z])(${esc.join("|")})([^a-z]|$)`, "i");
}

const POLITICAL_RE = makeMatcher(POLITICAL_KEYWORDS);
const CAT_MATCHERS = CATEGORIES.map((c) => ({ ...c, re: makeMatcher(c.keywords) }));

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
  if (it.enclosure?.url && /^image\//.test(it.enclosure.type || "image/")) return it.enclosure.url;
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

// هل الخبر سياسي؟ أقسام السياسة الصرفة تُقبل دائماً؛ غيرها يحتاج مطابقة سياسية/جغرافية.
function isPolitical(hay, feed) {
  if (feed.alwaysPolitical) return true;
  if (POLITICAL_RE && POLITICAL_RE.test(hay)) return true;
  return CAT_MATCHERS.some((c) => c.re && c.re.test(hay));
}

// مؤقّت صارم: يضمن عدم تجمّد عملية الجلب مهما حصل.
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
      let title = stripHtml(it.title || "").trim();
      if (feed.googleNews) title = title.replace(/\s+-\s+[^-–—]+$/, "").trim();
      const snippet = stripHtml(it.contentSnippet || it.content || it.summary || "").slice(0, 220);
      const hay = `${title} ${snippet}`;
      return {
        title,
        link: (it.link || "").trim(),
        snippet,
        image: pickImage(it),
        source: feed.name,
        date: date && !isNaN(date) ? date : null,
        political: isPolitical(hay, feed),
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
  const hay = `${item.title} ${item.snippet}`;
  for (const cat of CAT_MATCHERS) {
    if (cat.re && cat.re.test(hay)) return cat.id;
  }
  return "other";
}

function importanceSort(a, b) {
  const t = (b.date?.getTime() || 0) - (a.date?.getTime() || 0);
  if (t !== 0) return t;
  return (b.image ? 1 : 0) - (a.image ? 1 : 0);
}

async function main() {
  console.log("جلب الخلاصات...");
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  let all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  const before = all.length;
  all = all.filter((it) => it.political); // أخبار سياسية فقط
  all = dedupe(all);
  all.sort(importanceSort);
  console.log(`سياسي فقط: ${all.length} من ${before}`);

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

  // بيانات مبسّطة لكل فئة يستهلكها JS (لعرض خبر الدولة على الخريطة الجوية)
  const newsByCat = {};
  for (const c of categories) {
    const list = c.featured ? [c.featured, ...c.items] : [...c.items];
    newsByCat[c.id] = list.map((it) => ({
      title: it.title,
      link: it.link,
      source: it.source,
      image: it.image,
      dateText: it.dateText,
    }));
  }

  const html = renderPage({
    updatedAt: formatRiyadh(new Date()),
    categories,
    newsByCat,
    sourceCount: new Set(FEEDS.map((f) => f.name)).size,
    totalItems: all.length,
  });

  await mkdir(DIST, { recursive: true });
  await writeFile(join(DIST, "index.html"), html, "utf8");
  await copyFile(join(__dirname, "public", "styles.css"), join(DIST, "styles.css"));
  await copyFile(join(__dirname, "public", "robots.txt"), join(DIST, "robots.txt"));
  for (const f of ["manifest.json", "icon.svg", "sw.js"]) {
    await copyFile(join(__dirname, "public", f), join(DIST, f));
  }

  console.log(`\nتم البناء: ${all.length} خبراً سياسياً (أبرزها في كل فئة) في dist/index.html`);
}

main().catch((err) => {
  console.error("فشل البناء:", err);
  process.exit(1);
});

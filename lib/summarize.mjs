// تلخيص اختياري عبر Claude. يُستورد فقط عند وجود ANTHROPIC_API_KEY
// (الاستيراد الديناميكي في generate.mjs)، حتى لا يفشل البناء بدون التبعية/المفتاح.
//
// لتفعيله لاحقاً:
//   1) أضف "@anthropic-ai/sdk" إلى dependencies في package.json
//   2) ضع ANTHROPIC_API_KEY كـ GitHub Secret (أو متغير بيئة محلي)

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // يقرأ ANTHROPIC_API_KEY من البيئة

/**
 * يولّد فقرة تقرير عربية موجزة لفئة واحدة من قائمة أخبارها.
 * @param {string} categoryTitle
 * @param {{title:string, snippet:string, source:string}[]} items
 * @returns {Promise<string>} نص الفقرة (أو "" عند الفشل)
 */
export async function summarizeCategory(categoryTitle, items) {
  if (!items.length) return "";

  const bullets = items
    .slice(0, 12)
    .map((it, i) => `${i + 1}. [${it.source}] ${it.title} — ${it.snippet}`)
    .join("\n");

  const prompt =
    `أنت محرر أخبار. اكتب فقرة عربية موجزة (3-5 جمل) تلخّص أبرز التطورات ` +
    `في موضوع "${categoryTitle}" بناءً على العناوين التالية فقط، دون إضافة معلومات ` +
    `من عندك ودون تكرار. ركّز على الأهم:\n\n${bullets}`;

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return text;
  } catch (err) {
    console.warn(`تعذّر تلخيص "${categoryTitle}": ${err.message}`);
    return "";
  }
}

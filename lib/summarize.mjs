// إثراء اختياري عبر Claude: يلخّص أخبار الفئة ويترجمها للعربية في استدعاء واحد.
// يُستورد فقط عند وجود ANTHROPIC_API_KEY (استيراد ديناميكي في generate.mjs).
//
// لتفعيله: أضِف ANTHROPIC_API_KEY كـ GitHub Secret، و"@anthropic-ai/sdk" في dependencies.

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // يقرأ ANTHROPIC_API_KEY من البيئة
const MODEL = process.env.SUMMARY_MODEL || "claude-opus-4-8"; // بدّله لـ claude-haiku-4-5 للتوفير

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string", description: "فقرة عربية موجزة (3-5 جمل) تلخّص أبرز التطورات" },
    translations: {
      type: "array",
      description: "ترجمة عربية لكل خبر بنفس ترتيب العناصر",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title_ar: { type: "string", description: "ترجمة عربية دقيقة للعنوان" },
          snippet_ar: { type: "string", description: "ترجمة عربية موجزة للمقتطف" },
        },
        required: ["title_ar", "snippet_ar"],
      },
    },
  },
  required: ["summary", "translations"],
};

/**
 * يعيد { summary, translations } لفئة أخبار واحدة.
 * translations مصفوفة بنفس ترتيب items، كل عنصر { title_ar, snippet_ar }.
 */
export async function enrichCategory(categoryTitle, items) {
  if (!items.length) return { summary: "", translations: [] };

  const list = items
    .slice(0, 12)
    .map((it, i) => `${i + 1}. ${it.title}${it.snippet ? " — " + it.snippet : ""}`)
    .join("\n");

  const prompt =
    `أنت محرر أخبار عربي. لديك عناوين أخبار سياسية إنجليزية في موضوع "${categoryTitle}".\n` +
    `أعِد كائن JSON فيه:\n` +
    `- summary: فقرة عربية موجزة (3-5 جمل) تلخّص أبرز التطورات، دون إضافة معلومات من عندك.\n` +
    `- translations: مصفوفة بنفس ترتيب العناصر أدناه، لكل عنصر ترجمة عربية دقيقة وطبيعية للعنوان (title_ar) وللمقتطف (snippet_ar).\n\n` +
    `العناصر:\n${list}`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    const data = JSON.parse(text);
    return {
      summary: (data.summary || "").trim(),
      translations: Array.isArray(data.translations) ? data.translations : [],
    };
  } catch (err) {
    console.warn(`تعذّر إثراء "${categoryTitle}": ${err.message}`);
    return { summary: "", translations: [] };
  }
}

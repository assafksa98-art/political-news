# التقرير السياسي اليومي

موقع ثابت يعرض أحدث الأخبار السياسية مصنّفة حسب الموضوع (إيران–أمريكا، السعودية،
الخليج، أوكرانيا، روسيا، الصين، أمريكا)، ويتحدّث **تلقائياً** عدة مرات يومياً عبر
GitHub Actions وينشر على GitHub Pages.

## كيف يعمل
- `generate.mjs` يجلب خلاصات RSS عربية (انظر `feeds.js`)، يوحّدها ويزيل التكرار،
  يصنّفها حسب كلمات مفتاحية، ثم يولّد `dist/index.html`.
- يعمل بدون أي مفتاح. الأخبار تُعرض مباشرة من المصادر.

## التشغيل محلياً
```bash
npm install
npm run build
# افتح dist/index.html في المتصفح
```

## النشر التلقائي
- مجدول كل 6 ساعات في `.github/workflows/build.yml` (+ تشغيل يدوي عبر "Run workflow").
- فعّل GitHub Pages من إعدادات المستودع: Settings → Pages → Source = **GitHub Actions**.

## تفعيل التلخيص بالذكاء الاصطناعي (اختياري)
عند توفّر مفتاح Anthropic:
1. أضف `"@anthropic-ai/sdk": "^0.40.0"` إلى `dependencies` في `package.json`.
2. أضف السر `ANTHROPIC_API_KEY` في: Settings → Secrets and variables → Actions.
3. عند البناء التالي ستظهر فقرة تقرير موجزة لكل فئة (انظر `lib/summarize.mjs`).

## تعديل المصادر أو الفئات
عدّل `feeds.js` لإضافة/إزالة خلاصات RSS أو تعديل الكلمات المفتاحية للفئات.

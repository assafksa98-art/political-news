// مصادر إخبارية عالمية (أخبار سياسية) + فئات المواضيع وكلماتها (إنجليزية) وأعلامها.
// alwaysPolitical: أقسام سياسة صرفة (كل عناصرها سياسية). googleNews: يُنظّف لاحقة العنوان.

export const FEEDS = [
  { name: "New York Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml", alwaysPolitical: true },
  { name: "New York Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
  { name: "Washington Post", url: "https://feeds.washingtonpost.com/rss/politics", alwaysPolitical: true },
  { name: "Washington Post", url: "https://feeds.washingtonpost.com/rss/world" },
  { name: "Reuters", url: "https://news.google.com/rss/search?q=when:2d%20site:reuters.com&hl=en-US&gl=US&ceid=US:en", googleNews: true },
  { name: "Associated Press", url: "https://news.google.com/rss/search?q=when:2d%20site:apnews.com&hl=en-US&gl=US&ceid=US:en", googleNews: true },
  { name: "The Guardian", url: "https://www.theguardian.com/world/rss" },
  { name: "BBC", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
];

// كلمات سياسية عامة (تحدّد ما إذا كان الخبر سياسياً) — تُطابق بحدود الكلمات.
export const POLITICAL_KEYWORDS = [
  "president", "election", "vote", "ballot", "government", "parliament",
  "congress", "senate", "minister", "diplomat", "diplomacy", "sanction",
  "sanctions", "treaty", "military", "war", "troops", "missile", "nuclear",
  "summit", "policy", "geopolitical", "foreign policy", "coup", "protest",
  "referendum", "legislation", "white house", "kremlin", "nato", "tariff",
  "tariffs", "embassy", "ceasefire", "negotiations", "ambassador", "regime",
  "airstrike", "defense", "defence", "united nations", "lawmaker", "diplomatic",
  "geopolitics", "strike", "border", "annex", "invasion",
];

// الفئات بالترتيب المعروض. العناوين عربية، والكلمات إنجليزية لمطابقة الأخبار.
export const CATEGORIES = [
  {
    id: "iran-us",
    title: "إيران – أمريكا",
    flags: ["ir", "us"],
    keywords: ["iran", "tehran", "iranian", "khamenei", "pezeshkian", "revolutionary guard"],
  },
  {
    id: "saudi",
    title: "السعودية",
    flags: ["sa"],
    keywords: ["saudi", "riyadh", "bin salman", "mbs", "saudi arabia", "aramco"],
  },
  {
    id: "gulf",
    title: "الخليج",
    flags: ["ae", "qa", "kw", "bh", "om"],
    keywords: [
      "uae", "emirates", "abu dhabi", "dubai", "qatar", "doha", "kuwait",
      "bahrain", "manama", "oman", "muscat", "gulf cooperation", "gcc",
    ],
  },
  {
    id: "ukraine",
    title: "أوكرانيا",
    flags: ["ua"],
    keywords: ["ukraine", "ukrainian", "kyiv", "kiev", "zelensky", "zelenskyy"],
  },
  {
    id: "russia",
    title: "روسيا",
    flags: ["ru"],
    keywords: ["russia", "russian", "moscow", "putin", "kremlin", "lavrov"],
  },
  {
    id: "china",
    title: "الصين",
    flags: ["cn"],
    keywords: ["china", "chinese", "beijing", "taiwan", "xi jinping", "hong kong"],
  },
  {
    id: "usa",
    title: "أمريكا",
    flags: ["us"],
    keywords: [
      "united states", "u.s.", "american", "washington", "white house",
      "pentagon", "trump", "biden", "congress", "republican", "democrat",
    ],
  },
  {
    id: "other",
    title: "أخبار سياسية أخرى",
    flags: [],
    keywords: [], // بقية الأخبار السياسية التي لا تندرج تحت فئة محددة
  },
];

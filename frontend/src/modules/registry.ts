/**
 * Frontend modül ağacı — backend `travel/module_tree` ve `priv/sql/modules` ile hizalı.
 * Yapay zeka özellikleri: `ai` altında toplanır; yeni AI yeteneği eklerken burayı ve backend `travel/ai/manifest.gleam` güncelleyin.
 */
export const MODULE_TREE = [
  { code: "core", title: "Çekirdek & çok kiracı", path: "core" },
  { code: "identity", title: "Üyelik", path: "identity" },
  { code: "i18n", title: "Sınırsız dil", path: "i18n" },
  { code: "currency", title: "Para birimi & kur", path: "currency" },
  { code: "catalog", title: "Katalog & ilanlar", path: "catalog" },
  { code: "booking", title: "Sepet & rezervasyon & ödeme", path: "booking" },
  { code: "marketing", title: "Kampanya & kupon & paket", path: "marketing" },
  { code: "content_seo", title: "CMS & SEO & yönlendirme", path: "content-seo" },
  { code: "social", title: "Sosyal paylaşım & Instagram", path: "social" },
  { code: "media_cdn", title: "Medya işleme & CDN", path: "media-cdn" },
  { code: "messaging", title: "SMS & e-posta (NetGSM)", path: "messaging" },
  { code: "location_ical", title: "Bölge & iCal", path: "location-ical" },
  { code: "reviews", title: "Yorum & moderasyon", path: "reviews" },
  { code: "navigation_ui", title: "Menü & anasayfa & popup", path: "navigation-ui" },
  { code: "engagement", title: "Favori & karşılaştırma & arama", path: "engagement" },
  { code: "support", title: "Destek & AI chat", path: "support" },
  { code: "integrations", title: "Dış API'ler", path: "integrations" },
  {
    code: "ai",
    title: "Yapay zeka (tüm AI burada)",
    path: "ai",
    children: [
      "DeepSeek ayarları",
      "Bölge hiyerarşisi üretimi",
      "İçerik / blog / sayfa / ilan yazarlığı",
      "SEO & çok dilli meta",
      "NLP / semantik arama",
      "Sohbet satış & çapraz satış",
      "Rezervasyon sonrası concierge & e-posta",
      "Yorum özeti & fiyat FOMO",
    ],
  },
  { code: "verticals", title: "Kategori uzantıları (villa, yat, otel…)", path: "verticals" },
] as const;

export type ModuleCode = (typeof MODULE_TREE)[number]["code"];

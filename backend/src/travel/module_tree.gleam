//// Seyahat platformu — modül grupları.
//// Veritabanı karşılıkları: priv/sql/modules/

import gleam/list

pub type ModuleInfo {
  ModuleInfo(code: String, title: String, note: String)
}

pub fn all_modules() -> List(ModuleInfo) {
  [
    ModuleInfo("core", "Çekirdek & çok kiracı", "organizations, tenant_domains, site_settings"),
    ModuleInfo(
      "identity",
      "Üyelik",
      "müşteri, acente, tedarikçi, personel, yönetici; API anahtarları; komisyon kuralları",
    ),
    ModuleInfo("i18n", "Sınırsız dil", "locales, translation_entries, translation_values"),
    ModuleInfo("currency", "Sınırsız para + kur", "currencies, currency_rates"),
    ModuleInfo("catalog", "Katalog", "product_categories, listings, görseller, fiyat, müsaitlik"),
    ModuleInfo(
      "booking",
      "Rezervasyon & ödeme",
      "carts, reservation_line_items, inventory_holds, reservation_events, public_code (RSV-), wallets, payments, PayTR",
    ),
    ModuleInfo(
      "marketing",
      "Kampanya & çapraz satış",
      "campaigns, coupons, paketler, sepet önerileri",
    ),
    ModuleInfo("content_seo", "CMS & SEO", "sayfalar, blog, SEO meta, schema, 301, çok dilli URL"),
    ModuleInfo("social", "Sosyal medya", "şablonlar, paylaşım kuyruğu, Instagram shop/story"),
    ModuleInfo("media_cdn", "Medya & CDN", "AVIF pipeline, Bunny, Cloudflare"),
    ModuleInfo("messaging", "SMS & e-posta", "NetGSM, şablonlar, zamanlanmış bildirimler"),
    ModuleInfo("location_ical", "Bölge & iCal", "ülke/il/ilçe, POI önbelleği, iCal senkron"),
    ModuleInfo("reviews", "Yorum & güven", "moderasyon, IP engeli, harici yorum özeti"),
    ModuleInfo("navigation_ui", "Menü & arayüz", "mega menü, anasayfa blok sırası, popup"),
    ModuleInfo(
      "engagement",
      "Etkileşim",
      "karşılaştırma, favoriler, son gezilenler, sesli/NLP arama önbelleği",
    ),
    ModuleInfo("support", "Destek & chat", "WhatsApp, canlı destek, AI satış temsilcisi"),
    ModuleInfo(
      "integrations",
      "Dış sistemler",
      "Wtatil, Yolcu360, Turna, Google Merchant/Maps/Analytics, Instagram Graph",
    ),
    ModuleInfo(
      "ai",
      "Yapay zeka (tek çatı)",
      "DeepSeek ayarları, bölge üretimi, içerik/SEO/çeviri, sohbet, rezervasyon sonrası concierge, fiyat ipucu",
    ),
    ModuleInfo("verticals", "Kategori uzantıları", "villa, yat, otel odası, transfer, uçak/otobüs, tur, vize…"),
  ]
}

pub fn module_count() -> Int {
  list.length(all_modules())
}

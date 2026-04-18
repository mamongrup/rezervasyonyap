//// Yapay zeka alt modülleri — tüm AI yetenekleri bu paket altında toplanır.
//// SQL: priv/sql/modules/170_ai.sql

pub type AiCapability {
  AiCapability(id: String, description: String)
}

pub fn capabilities() -> List(AiCapability) {
  [
    AiCapability("deepseek_settings", "DeepSeek API / model ayarları"),
    AiCapability("region_hierarchy", "Ülke → il → ilçe + koordinat üretimi"),
    AiCapability("content_writer", "Bölge, blog, sayfa, ilan gövde metni"),
    AiCapability("seo_pack", "Tüm diller için SEO başlık/açıklama/meta"),
    AiCapability("translator", "Dil kuralları + SEO uyumlu çeviri"),
    AiCapability("social_caption", "Seçilen görsellere göre paylaşım metni"),
    AiCapability("review_summary", "Yorum özeti (in-site + harici)"),
    AiCapability("nlp_search", "Semantik / doğal dil arama ayrıştırma"),
    AiCapability("trip_planner", "Günlük rota + çapraz satış önerileri"),
    AiCapability("post_booking", "Nasıl gidilir, bilet, transfer, aktivite + takip e-postası"),
    AiCapability("geo_blog_batch", "Gezi fikirleri: bölge başına N blog yazısı"),
    AiCapability("poi_distance_copy", "Google Maps POI mesafe metinleri (ayarlı tipler)"),
    AiCapability("price_fomo", "Dinamik fiyat / FOMO metinleri"),
    AiCapability("chat_sales", "7/24 satış + çapraz satış chatbot"),
    AiCapability("ops_agent", "Operasyon (sohbet dışı): provizyon, eskalasyon, alternatif ilan önerisi"),
  ]
}

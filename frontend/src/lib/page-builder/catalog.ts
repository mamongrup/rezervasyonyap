/**
 * Page builder — vitrin modül kataloğu ve izin listesi.
 *
 * Yeni modül tipi eklerken sıra (diğer dosyalarla uyum):
 * 1. `listing-types.ts` → `PageBuilderModuleType` birleşimine `type` ekle
 * 2. `types/page-builder-module.ts` → `PageBuilderModuleConfigByType` için config tipi
 * 3. Bu dosyada `MODULE_CATALOG` satırı (+ gerekiyorsa `EXCLUDED_ON_BOLGE_DETAIL_PAGE_BUILDER`)
 * 4. Varsayılanlar: `lib/page-builder-default-modules.ts`, admin `CategoryPageBuilderClient` defaultConfigs
 * 5. Gerekirse editör (`editors/*`) ve vitrin modülü (`components/page-builder/modules/*`)
 */

import type { PageBuilderModuleType } from '@/types/listing-types'

export const MODULE_CATALOG: {
  type: PageBuilderModuleType
  label: string
  description: string
  emoji: string
}[] = [
  { type: 'hero', label: 'Hero Banner', description: 'Büyük hero görseli + arama formu', emoji: '🖼️' },
  { type: 'featured_by_region', label: 'Bölgeye Göre Öne Çıkar', description: 'Şehir sekmeli ilan vitrin bölümü', emoji: '📍' },
  { type: 'top_providers', label: 'En İyi İlan Sahipleri', description: 'Tüm kategorilerden başarı sıralaması', emoji: '🏆' },
  { type: 'become_provider', label: 'İlan Ver & Kazan', description: 'İlan sahiplerini teşvik eden CTA bölümü', emoji: '💼' },
  { type: 'listings_grid', label: 'İlan Grid', description: 'İlanları grid şeklinde göster', emoji: '🏷️' },
  { type: 'listings_slider', label: 'İlan Slider', description: 'İlanları yatay kaydıran şerit', emoji: '🎠' },
  { type: 'categories_grid', label: 'Kategori Grid', description: 'Alt kategori / destinasyon kartları', emoji: '🗂️' },
  { type: 'promo_banner', label: 'Promosyon Baneri', description: 'Kampanya CTA baneri', emoji: '📢' },
  { type: 'text_block', label: 'Metin Bloğu', description: 'Başlık + zengin metin içeriği', emoji: '📝' },
  { type: 'image_text', label: 'Görsel + Metin', description: 'Yan yana görsel ve metin', emoji: '🖼️' },
  { type: 'stats', label: 'İstatistikler', description: 'Sayısal metrik gösterimi', emoji: '📊' },
  { type: 'why_us', label: 'Neden Biz?', description: 'Avantaj ve özellik kartları', emoji: '⭐' },
  { type: 'testimonials', label: 'Müşteri Yorumları', description: 'Müşteri deneyim yorumları', emoji: '💬' },
  { type: 'newsletter', label: 'Bülten Aboneliği', description: 'E-posta kayıt formu', emoji: '📧' },
  { type: 'faq', label: 'SSS', description: 'Sıkça sorulan sorular', emoji: '❓' },
  { type: 'destination_cards', label: 'Destinasyon Kartları', description: 'Bölge/şehir kartları', emoji: '🗂️' },
  { type: 'partners', label: 'Partnerler', description: 'Logo duvarı / partner grid', emoji: '🤝' },
  { type: 'video_gallery', label: 'Video Galerisi', description: 'Büyük öne çıkan video + yan küçük liste', emoji: '🎬' },
  { type: 'sliders_banner', label: 'Slider & Banner', description: 'Yönetim panelinden eklenen slaytları gösterir', emoji: '🎞️' },
  { type: 'category_slider', label: 'Kategori Slider', description: 'Kategorileri yatay kaydırmalı göster', emoji: '🎡' },
  {
    type: 'travel_category_images',
    label: 'Kategori görselleri (paylaşımlı)',
    description:
      'İsteğe bağlı — yalnızca ana sayfa kaydında: genel havuzu İçerik → Kategori Resimleri ile yönetin; bu modül aynı slug için ana sayfada üzerine yazar (ön yüzde blok çıkmaz)',
    emoji: '🗂️',
  },
  { type: 'region_slider', label: 'Bölge Slider', description: "Bölgeleri API'den çekerek yatay kaydırmalı göster", emoji: '🗾' },
  { type: 'gezi_onerileri', label: 'Gezi Önerileri', description: 'Öne çıkan gezi önerileri bölümü', emoji: '🗺️' },
  { type: 'featured_places', label: 'Öne Çıkan İlanlar', description: 'Kategori vitrini: otel, tur, aktivite, feribot… (Önerilenler / Yeni)', emoji: '📌' },
  { type: 'how_it_works', label: 'Nasıl Çalışır?', description: 'Adım adım platform açıklaması', emoji: '⚙️' },
  { type: 'category_grid', label: 'Kategori Grid (Ana Sayfa)', description: 'Tüm kategorilerin grid görünümü', emoji: '🏠' },
  {
    type: 'category_hub_grid',
    label: 'Kategori Hub Grid',
    description: 'Etstur tarzı görsel kart grid — başlık, alt linkler ve «tümünü gör» ok',
    emoji: '🧭',
  },
  { type: 'section_videos', label: 'Video Bölümü', description: 'Öne çıkan videolar bölümü', emoji: '🎥' },
  { type: 'client_say', label: 'Müşteriler Ne Diyor?', description: 'Müşteri deneyim yorumları', emoji: '🌟' },
  { type: 'search_results', label: 'Arama Sonuçları', description: 'Arama vitrin blokları (arama sayfası)', emoji: '🔎' },
  // Marketing modülleri (admin → vitrin)
  { type: 'active_campaigns', label: 'Aktif Kampanyalar', description: 'Yönetim panelinde tanımlı kampanyaları kart olarak gösterir', emoji: '🎯' },
  { type: 'early_booking_promo', label: 'Erken Rezervasyon Vurgu', description: 'Öne çıkan erken rezervasyon kampanyası şeridi', emoji: '🗓️' },
  { type: 'last_minute_promo', label: 'Son Dakika Vurgu (Geri Sayım)', description: 'Son dakika kampanyası + canlı sayaç', emoji: '⚡' },
  { type: 'coupons_strip', label: 'Kupon Şeridi', description: 'Aktif & herkese açık kuponlar (kopyala butonu)', emoji: '🎟️' },
  { type: 'holiday_packages', label: 'Hazır Tatil Paketleri', description: 'Yönetimden tanımlı paket tatil grid', emoji: '🧳' },
  { type: 'cross_sell_widget', label: 'Birlikte Tercih Edilenler', description: 'Cross-sell kuralları (örn. uçak → otel)', emoji: '🔁' },
  {
    type: 'region_detail_hero',
    label: 'Bölge: Hero',
    description: 'Başlık (H1), görseller ve arama — `/bolge/…` üzerinde otomatik',
    emoji: '🎯',
  },
  {
    type: 'region_detail_breadcrumb',
    label: 'Bölge: Breadcrumb',
    description: 'Konum yolu (ana sayfa → alt bölgeler) — erişilebilir liste',
    emoji: '🧭',
  },
  { type: 'region_detail_listings', label: 'Bölge: İlan listesi', description: 'Kategori sekmeleri, kartlar ve sayfalama', emoji: '🏷️' },
  {
    type: 'region_detail_explore_hotels',
    label: 'Bölge: Keşfet (otel istatistikleri)',
    description: '«Bölgeye göre keşfet» yatay slider — otel vitrinine gider',
    emoji: '🗾',
  },
  { type: 'region_detail_newsletter', label: 'Bölge: Bülten', description: 'SectionSubscribe2 bülten bloğu', emoji: '📧' },
  { type: 'region_detail_about', label: 'Bölge: Tanıtım metni', description: 'CMS açıklama / «Bölge tanıtımı»', emoji: '📝' },
  { type: 'region_detail_travel_ideas', label: 'Bölge: Gezi fikirleri', description: 'travel_ideas_json ile beslenir', emoji: '🗺️' },
  { type: 'region_detail_routes', label: 'Bölge: Gezi + mavi yolculuk rotaları', description: 'trip_routes_json / blue_cruise_routes_json', emoji: '🧭' },
  {
    type: 'region_detail_places_vitrin',
    label: 'Bölge: 3 sütun mekan/mesafe',
    description: 'Gezi fikirleri altı — yakın mekanlar ve kuş uçuşu mesafe (region-places + JSON)',
    emoji: '📐',
  },
  { type: 'region_detail_nearby', label: 'Bölge: Yakındaki mekanlar', description: 'POI haritası / yakın yerler', emoji: '📍' },
  { type: 'region_detail_map', label: 'Bölge: Harita gömme', description: 'Google Maps iframe', emoji: '🗺️' },
  {
    type: 'region_detail_empty_hint',
    label: 'Bölge: İçerik yok uyarısı',
    description: 'Kayıt + ilan + POI yoksa «henüz içerik yok» kutusu',
    emoji: '💬',
  },
  {
    type: 'region_detail_subdivisions',
    label: 'Bölge: Alt bölgeler',
    description: 'İller / ilçeler / beldeler slider — footer üstü',
    emoji: '🔗',
  },
]

/** Page builder’a izin verilen tüm modül tipleri (JSON kayıtta allowlist doğrulama). */
export const PAGE_BUILDER_ALLOWED_MODULE_TYPES = new Set<string>(
  MODULE_CATALOG.map((m) => m.type),
)

/** «Bölge detay» şablonunda eklenmemeli — slot/kategori uyumsuz */
export const EXCLUDED_ON_BOLGE_DETAIL_PAGE_BUILDER = new Set<PageBuilderModuleType>([
  'hero',
  'featured_by_region',
  'listings_grid',
  'listings_slider',
  'categories_grid',
  'category_hub_grid',
  'search_results',
  'travel_category_images',
  'cross_sell_widget',
])

export const CATEGORY_CARD_TYPE_OPTIONS = [
  { value: 'card3', label: 'Kart 3 - Standart görselli kart' },
  { value: 'card4', label: 'Kart 4 - Kompakt yuvarlak görsel' },
  { value: 'card5', label: 'Kart 5 - Büyük görsel kart' },
] as const

export const CATEGORY_SLICE_OPTIONS = [
  { value: 'first6', label: 'Baştaki kategoriler (sıra başı)' },
  {
    value: 'last6',
    label: 'Varsayılan: 7–12. sıra · Sayı girilirse: listenin sonundan N adet',
  },
  { value: 'all', label: 'Tüm liste · İsterseniz aşağıdan üst sınır' },
] as const

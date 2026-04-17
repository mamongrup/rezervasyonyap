/**
 * Alt Kategori Registry
 * Her ana kategorinin alt kategorileri (subcategories) burada tanımlanır.
 * Varsayılan statik veri — admin panelinden DB'ye kaydedilen veriler bu listeyi override eder.
 */

import { isEnglishLocale } from '@/lib/i18n-config'
import { SUBCATEGORY_LOCALE_LABELS } from '@/data/subcategory-labels-i18n'

export interface SubcategoryEntry {
  /** Benzersiz kimlik (slug tabanlı, unique olmalı) */
  id: string
  /** URL slug (alt kategori) */
  slug: string
  /** Hangi ana kategoriye ait */
  parentCategorySlug: string
  /** Türkçe görünen ad */
  name: string
  /** İngilizce görünen ad (DE/RU/FR/ZH çevirileri `subcategory-labels-i18n.ts` + `subcategoryLabelForLocale`) */
  nameEn: string
  /** Emoji ikon */
  emoji: string
  /** Kısa açıklama */
  description: string
  /** İngilizce açıklama */
  descriptionEn: string
  /** Renk tonu (Tailwind renk adı, ör. "blue", "emerald") */
  color: string
  /** Sıralama */
  order: number
  /** Aktif mi */
  enabled: boolean
  /**
   * Filtrelenmiş URL — kategori sayfasında bu URL'ye link verilir.
   * Boşsa parentCategorySlug/all kullanılır.
   */
  href?: string
}

export const SUBCATEGORY_REGISTRY: SubcategoryEntry[] = [
  // ─── Oteller ──────────────────────────────────────────────────────────────
  { id: 'hotel-boutique',   slug: 'butik-oteller',     parentCategorySlug: 'oteller', name: 'Butik Oteller',      nameEn: 'Boutique Hotels',   emoji: '🏛️', color: 'rose',    order: 1, enabled: true, description: 'Eşsiz tasarım, kişisel hizmet', descriptionEn: 'Unique design, personal service' },
  { id: 'hotel-resort',     slug: 'resort-oteller',    parentCategorySlug: 'oteller', name: 'Resort Oteller',     nameEn: 'Resort Hotels',     emoji: '🌴', color: 'emerald', order: 2, enabled: true, description: 'Her şey dahil tatil köyleri', descriptionEn: 'All-inclusive resorts' },
  { id: 'hotel-apart',      slug: 'apart-oteller',     parentCategorySlug: 'oteller', name: 'Apart Oteller',      nameEn: 'Apart Hotels',      emoji: '🏠', color: 'blue',    order: 3, enabled: true, description: 'Ev konforunda otel hizmeti', descriptionEn: 'Home comfort with hotel service' },
  { id: 'hotel-historic',   slug: 'tarihi-oteller',    parentCategorySlug: 'oteller', name: 'Tarihi Oteller',     nameEn: 'Historic Hotels',   emoji: '🏰', color: 'amber',   order: 4, enabled: true, description: 'Tarihi binalarda konaklama', descriptionEn: 'Stay in historic buildings' },
  { id: 'hotel-eco',        slug: 'eco-oteller',       parentCategorySlug: 'oteller', name: 'Eco Oteller',        nameEn: 'Eco Hotels',        emoji: '🌿', color: 'green',   order: 5, enabled: true, description: 'Sürdürülebilir ve çevre dostu', descriptionEn: 'Sustainable & eco-friendly' },
  { id: 'hotel-business',   slug: 'business-oteller',  parentCategorySlug: 'oteller', name: 'Business Oteller',   nameEn: 'Business Hotels',   emoji: '💼', color: 'neutral', order: 6, enabled: true, description: 'İş seyahati için ideal seçimler', descriptionEn: 'Ideal for business travel' },
  { id: 'hotel-thermal',    slug: 'termal-oteller',    parentCategorySlug: 'oteller', name: 'Termal & SPA',       nameEn: 'Thermal & Spa',     emoji: '♨️', color: 'violet',  order: 7, enabled: true, description: 'Sağlıklı yaşam ve terapi', descriptionEn: 'Wellness & thermal therapy' },

  // ─── Tatil Evleri ─────────────────────────────────────────────────────────
  { id: 'holiday-villa',    slug: 'villalar',    parentCategorySlug: 'tatil-evleri', name: 'Villalar',    nameEn: 'Villas',      emoji: '🏡', color: 'emerald', order: 1, enabled: true, description: 'Müstakil ve lüks villa seçenekleri', descriptionEn: 'Detached and luxury villas' },
  { id: 'holiday-apart',    slug: 'apartlar',    parentCategorySlug: 'tatil-evleri', name: 'Apartlar',    nameEn: 'Apart hotels', emoji: '🏢', color: 'sky',     order: 2, enabled: true, description: 'Apart otel ve suit konaklama', descriptionEn: 'Apart-hotel and suite stays' },
  { id: 'holiday-daire',    slug: 'daireler',    parentCategorySlug: 'tatil-evleri', name: 'Daireler',    nameEn: 'Flats',       emoji: '🚪', color: 'blue',    order: 3, enabled: true, description: 'Daire tipi tatil konakları', descriptionEn: 'Holiday flats and apartments' },
  { id: 'holiday-bungalow', slug: 'bungalovlar', parentCategorySlug: 'tatil-evleri', name: 'Bungalovlar', nameEn: 'Bungalows',   emoji: '🛖', color: 'amber',   order: 4, enabled: true, description: 'Tek katlı bungalov evler', descriptionEn: 'Single-story bungalows' },

  // ─── Yat Kiralama ─────────────────────────────────────────────────────────
  { id: 'yacht-gulet',       slug: 'guletler',          parentCategorySlug: 'yat-kiralama', name: 'Guletler',         nameEn: 'Gulets',           emoji: '⛵', color: 'blue',    order: 1, enabled: true, description: 'Geleneksel Türk gulet deneyimi', descriptionEn: 'Traditional Turkish gulet experience' },
  { id: 'yacht-motorboat',   slug: 'motor-yatlar',      parentCategorySlug: 'yat-kiralama', name: 'Motor Yatlar',     nameEn: 'Motor Yachts',     emoji: '🚤', color: 'sky',     order: 2, enabled: true, description: 'Hızlı ve konforlu motor yatlar', descriptionEn: 'Fast and comfortable motor yachts' },
  { id: 'yacht-catamaran',   slug: 'katamaranlar',      parentCategorySlug: 'yat-kiralama', name: 'Katamaranlar',     nameEn: 'Catamarans',       emoji: '⛵', color: 'cyan',    order: 3, enabled: true, description: 'Geniş ve stabil katamaran tekneler', descriptionEn: 'Spacious and stable catamarans' },
  { id: 'yacht-sailboat',    slug: 'yelkenli-tekneler', parentCategorySlug: 'yat-kiralama', name: 'Yelkenli Tekneler', nameEn: 'Sailing Boats',    emoji: '🌊', color: 'teal',    order: 4, enabled: true, description: 'Rüzgar gücüyle yelken açın', descriptionEn: 'Sail with the power of wind' },
  { id: 'yacht-bareboat',    slug: 'bareboat-kiralama', parentCategorySlug: 'yat-kiralama', name: 'Bareboat',         nameEn: 'Bareboat Charter', emoji: '🧭', color: 'indigo',  order: 5, enabled: true, description: 'Tekne kirala, kendin kap', descriptionEn: 'Rent a boat, captain yourself' },

  // ─── Turlar ───────────────────────────────────────────────────────────────
  { id: 'tour-domestic',     slug: 'yurtici-turlar',    parentCategorySlug: 'turlar', name: 'Yurt İçi Turlar',  nameEn: 'Domestic Tours',     emoji: '🇹🇷', color: 'red',     order: 1, enabled: true, description: 'Türkiye\'yi keşfedin', descriptionEn: 'Discover Turkey' },
  { id: 'tour-abroad',       slug: 'yurtdisi-turlar',   parentCategorySlug: 'turlar', name: 'Yurt Dışı Turlar', nameEn: 'International Tours', emoji: '✈️', color: 'blue',    order: 2, enabled: true, description: 'Dünyayı dolaşın', descriptionEn: 'Travel the world' },
  { id: 'tour-cultural',     slug: 'kultur-turlari',    parentCategorySlug: 'turlar', name: 'Kültür Turları',   nameEn: 'Cultural Tours',     emoji: '🏛️', color: 'amber',   order: 3, enabled: true, description: 'Tarihi ve kültürel keşifler', descriptionEn: 'Historical and cultural discoveries' },
  { id: 'tour-nature',       slug: 'doga-turlari',      parentCategorySlug: 'turlar', name: 'Doğa Turları',     nameEn: 'Nature Tours',       emoji: '🌿', color: 'green',   order: 4, enabled: true, description: 'Doğanın kalbine yolculuk', descriptionEn: 'Journey to the heart of nature' },
  { id: 'tour-religious',    slug: 'dini-turlar',       parentCategorySlug: 'turlar', name: 'Dini Turlar',      nameEn: 'Religious Tours',    emoji: '🕌', color: 'emerald', order: 5, enabled: true, description: 'Kutsal mekânlara ziyaret', descriptionEn: 'Visits to sacred sites' },
  { id: 'tour-adventure',    slug: 'macera-turlari',    parentCategorySlug: 'turlar', name: 'Macera Turları',   nameEn: 'Adventure Tours',    emoji: '🏔️', color: 'orange',  order: 6, enabled: true, description: 'Adrenalin dolu maceralar', descriptionEn: 'Adrenaline-filled adventures' },
  { id: 'tour-europe',       slug: 'avrupa-turlari',    parentCategorySlug: 'turlar', name: 'Avrupa Turları',   nameEn: 'European Tours',     emoji: '🗼', color: 'violet',  order: 7, enabled: true, description: 'Avrupa başkentleri turu', descriptionEn: 'Tour of European capitals' },

  // ─── Aktiviteler ──────────────────────────────────────────────────────────
  { id: 'act-water',        slug: 'su-sporlari',       parentCategorySlug: 'aktiviteler', name: 'Su Sporları',      nameEn: 'Water Sports',    emoji: '🏄', color: 'cyan',    order: 1, enabled: true, description: 'Dalış, sörf, rafting ve daha fazlası', descriptionEn: 'Diving, surfing, rafting and more' },
  { id: 'act-mountain',     slug: 'dag-sporlari',      parentCategorySlug: 'aktiviteler', name: 'Dağ Sporları',     nameEn: 'Mountain Sports', emoji: '🧗', color: 'stone',   order: 2, enabled: true, description: 'Tırmanış, kayak ve dağcılık', descriptionEn: 'Climbing, skiing and mountaineering' },
  { id: 'act-culture',      slug: 'kultur-aktivite',   parentCategorySlug: 'aktiviteler', name: 'Kültürel',         nameEn: 'Cultural',        emoji: '🎨', color: 'violet',  order: 3, enabled: true, description: 'Müze, sanat ve atölye gezileri', descriptionEn: 'Museum, art and workshop tours' },
  { id: 'act-gastronomy',   slug: 'gastronomi',        parentCategorySlug: 'aktiviteler', name: 'Gastronomi',       nameEn: 'Gastronomy',      emoji: '🍽️', color: 'orange',  order: 4, enabled: true, description: 'Yemek turları ve mutfak deneyimleri', descriptionEn: 'Food tours and culinary experiences' },
  { id: 'act-wellness',     slug: 'wellness-spa',      parentCategorySlug: 'aktiviteler', name: 'Wellness & SPA',   nameEn: 'Wellness & SPA',  emoji: '🧘', color: 'teal',    order: 5, enabled: true, description: 'Spa, meditasyon ve yoga', descriptionEn: 'Spa, meditation and yoga' },
  { id: 'act-safari',       slug: 'safari-taiga',      parentCategorySlug: 'aktiviteler', name: 'Safari & Doğa',   nameEn: 'Safari & Nature', emoji: '🦁', color: 'amber',   order: 6, enabled: true, description: 'Doğa ve vahşi yaşam turları', descriptionEn: 'Nature and wildlife tours' },

  // ─── Araç Kiralama ────────────────────────────────────────────────────────
  { id: 'car-economy',      slug: 'ekonomi-araclar',  parentCategorySlug: 'arac-kiralama', name: 'Ekonomi',         nameEn: 'Economy',          emoji: '🚗', color: 'blue',    order: 1, enabled: true, description: 'Uygun fiyatlı araçlar', descriptionEn: 'Affordable rental cars' },
  { id: 'car-suv',          slug: 'suv-araclar',      parentCategorySlug: 'arac-kiralama', name: 'SUV & 4x4',       nameEn: 'SUV & 4x4',        emoji: '🚙', color: 'emerald', order: 2, enabled: true, description: 'Her araziye uygun araçlar', descriptionEn: 'Vehicles for all terrains' },
  { id: 'car-luxury',       slug: 'lüks-araclar',     parentCategorySlug: 'arac-kiralama', name: 'Lüks Araçlar',   nameEn: 'Luxury Cars',      emoji: '🏎️', color: 'amber',   order: 3, enabled: true, description: 'Premium ve prestijli araçlar', descriptionEn: 'Premium and prestigious vehicles' },
  { id: 'car-electric',     slug: 'elektrikli-arac',  parentCategorySlug: 'arac-kiralama', name: 'Elektrikli',      nameEn: 'Electric Cars',    emoji: '⚡', color: 'green',   order: 4, enabled: true, description: 'Çevre dostu elektrikli araçlar', descriptionEn: 'Eco-friendly electric vehicles' },
  { id: 'car-minibus',      slug: 'minibus-kiralama', parentCategorySlug: 'arac-kiralama', name: 'Minibüs & Van',   nameEn: 'Minibus & Van',    emoji: '🚐', color: 'violet',  order: 5, enabled: true, description: 'Grup transferleri için geniş araçlar', descriptionEn: 'Spacious vehicles for group transfers' },

  // ─── Transfer ─────────────────────────────────────────────────────────────
  { id: 'trans-airport',    slug: 'havalimanı-transfer', parentCategorySlug: 'transfer', name: 'Havalimanı',       nameEn: 'Airport Transfer', emoji: '✈️', color: 'blue',    order: 1, enabled: true, description: 'Havalimanı giriş çıkış transferi', descriptionEn: 'Airport arrival and departure transfer' },
  { id: 'trans-city',       slug: 'sehir-transfer',      parentCategorySlug: 'transfer', name: 'Şehir İçi',        nameEn: 'City Transfer',    emoji: '🏙️', color: 'sky',     order: 2, enabled: true, description: 'Şehir içi konforlu taşıma', descriptionEn: 'Comfortable intra-city transport' },
  { id: 'trans-vip',        slug: 'vip-transfer',        parentCategorySlug: 'transfer', name: 'VIP Transfer',     nameEn: 'VIP Transfer',     emoji: '🚘', color: 'amber',   order: 3, enabled: true, description: 'Lüks VIP araç hizmeti', descriptionEn: 'Luxury VIP vehicle service' },
  { id: 'trans-private',    slug: 'ozel-transfer',       parentCategorySlug: 'transfer', name: 'Özel Araç',        nameEn: 'Private Car',      emoji: '🚖', color: 'violet',  order: 4, enabled: true, description: 'Özel araç ve şoför hizmeti', descriptionEn: 'Private car and chauffeur service' },

  // ─── Feribot ──────────────────────────────────────────────────────────────
  { id: 'ferry-domestic',   slug: 'yurtici-feribot',  parentCategorySlug: 'feribot', name: 'Yurt İçi Hatlar',  nameEn: 'Domestic Routes',   emoji: '⛴️', color: 'blue',    order: 1, enabled: true, description: 'Türkiye iç hat feribot seferleri', descriptionEn: 'Domestic ferry routes in Turkey' },
  { id: 'ferry-abroad',     slug: 'uluslararasi-feribot', parentCategorySlug: 'feribot', name: 'Uluslararası',  nameEn: 'International',     emoji: '🌊', color: 'cyan',    order: 2, enabled: true, description: 'Uluslararası feribot hatları', descriptionEn: 'International ferry lines' },
  { id: 'ferry-island',     slug: 'ada-feribot',      parentCategorySlug: 'feribot', name: 'Ada Transferi',    nameEn: 'Island Ferry',      emoji: '🏝️', color: 'emerald', order: 3, enabled: true, description: 'Adalara düzenli feribot seferleri', descriptionEn: 'Regular ferry services to islands' },

  // ─── Uçak Bileti ──────────────────────────────────────────────────────────
  { id: 'flight-domestic',  slug: 'ic-hat-ucuslari',  parentCategorySlug: 'ucak-bileti', name: 'İç Hat',          nameEn: 'Domestic Flights',  emoji: '🇹🇷', color: 'red',     order: 1, enabled: true, description: 'Türkiye iç hat uçuşları', descriptionEn: 'Domestic flights within Turkey' },
  { id: 'flight-intl',      slug: 'dis-hat-ucuslari', parentCategorySlug: 'ucak-bileti', name: 'Dış Hat',         nameEn: 'International',     emoji: '🌍', color: 'blue',    order: 2, enabled: true, description: 'Uluslararası uçuş biletleri', descriptionEn: 'International flight tickets' },
  { id: 'flight-charter',   slug: 'charter-ucuslari', parentCategorySlug: 'ucak-bileti', name: 'Charter',         nameEn: 'Charter Flights',   emoji: '✈️', color: 'violet',  order: 3, enabled: true, description: 'Özel charter uçuş organizasyonu', descriptionEn: 'Private charter flight organization' },
  { id: 'flight-business',  slug: 'business-ucuslar', parentCategorySlug: 'ucak-bileti', name: 'Business Class',  nameEn: 'Business Class',    emoji: '💺', color: 'amber',   order: 4, enabled: true, description: 'Lüks iş sınıfı uçuşlar', descriptionEn: 'Luxury business class flights' },

  // ─── Kruvaziyer ───────────────────────────────────────────────────────────
  { id: 'cruise-med',       slug: 'akdeniz-kruvaziyer',  parentCategorySlug: 'kruvaziyer', name: 'Akdeniz',          nameEn: 'Mediterranean',     emoji: '🌊', color: 'blue',    order: 1, enabled: true, description: 'Akdeniz limanları turu', descriptionEn: 'Tour of Mediterranean ports' },
  { id: 'cruise-aegean',    slug: 'ege-kruvaziyer',      parentCategorySlug: 'kruvaziyer', name: 'Ege',              nameEn: 'Aegean',            emoji: '🏛️', color: 'cyan',    order: 2, enabled: true, description: 'Antik Ege limanları', descriptionEn: 'Ancient Aegean ports' },
  { id: 'cruise-world',     slug: 'dunya-kruvaziyer',    parentCategorySlug: 'kruvaziyer', name: 'Dünya Turu',       nameEn: 'World Cruise',      emoji: '🌍', color: 'emerald', order: 3, enabled: true, description: 'Dünya limanları grand tur', descriptionEn: 'Grand tour of world ports' },
  { id: 'cruise-blacksea',  slug: 'karadeniz-kruvaziyer', parentCategorySlug: 'kruvaziyer', name: 'Karadeniz',       nameEn: 'Black Sea',         emoji: '⚓', color: 'teal',    order: 4, enabled: true, description: 'Karadeniz kruvaziyer hatları', descriptionEn: 'Black Sea cruise routes' },

  // ─── Hac & Umre ───────────────────────────────────────────────────────────
  { id: 'hajj-hajj',        slug: 'hac-paketleri',   parentCategorySlug: 'hac-umre', name: 'Hac Paketleri',     nameEn: 'Hajj Packages',     emoji: '🕋', color: 'emerald', order: 1, enabled: true, description: 'Organizasyonlu hac paketleri', descriptionEn: 'Organized Hajj packages' },
  { id: 'hajj-umrah',       slug: 'umre-paketleri',  parentCategorySlug: 'hac-umre', name: 'Umre Paketleri',    nameEn: 'Umrah Packages',    emoji: '🕌', color: 'green',   order: 2, enabled: true, description: 'Ekonomik ve VIP umre seçenekleri', descriptionEn: 'Economy and VIP Umrah options' },
  { id: 'hajj-holy-visit',  slug: 'kutsal-mekanlar', parentCategorySlug: 'hac-umre', name: 'Kutsal Mekanlar',   nameEn: 'Holy Sites',        emoji: '✨', color: 'amber',   order: 3, enabled: true, description: 'Medine, Mekke ve kutsal ziyaretler', descriptionEn: 'Medina, Mecca and holy visits' },
  { id: 'hajj-vip',         slug: 'vip-hac-umre',    parentCategorySlug: 'hac-umre', name: 'VIP Hac & Umre',   nameEn: 'VIP Hajj & Umrah',  emoji: '👑', color: 'violet',  order: 4, enabled: true, description: 'Lüks konaklama ve özel hizmet', descriptionEn: 'Luxury accommodation and private service' },

  // ─── Vize ─────────────────────────────────────────────────────────────────
  { id: 'visa-schengen',    slug: 'schengen-vize',   parentCategorySlug: 'vize', name: 'Schengen Vizesi',    nameEn: 'Schengen Visa',    emoji: '🇪🇺', color: 'blue',    order: 1, enabled: true, description: 'Avrupa Schengen bölgesi vizesi', descriptionEn: 'European Schengen area visa' },
  { id: 'visa-usa',         slug: 'abd-vize',        parentCategorySlug: 'vize', name: 'ABD Vizesi',         nameEn: 'US Visa',          emoji: '🇺🇸', color: 'red',     order: 2, enabled: true, description: 'Amerika Birleşik Devletleri vizesi', descriptionEn: 'United States of America visa' },
  { id: 'visa-uk',          slug: 'ingiltere-vize',  parentCategorySlug: 'vize', name: 'İngiltere Vizesi',   nameEn: 'UK Visa',          emoji: '🇬🇧', color: 'rose',    order: 3, enabled: true, description: 'Birleşik Krallık vizesi', descriptionEn: 'United Kingdom visa' },
  { id: 'visa-student',     slug: 'ogrenci-vize',    parentCategorySlug: 'vize', name: 'Öğrenci Vizesi',     nameEn: 'Student Visa',     emoji: '🎓', color: 'violet',  order: 4, enabled: true, description: 'Yurt dışı eğitim vizesi', descriptionEn: 'Study abroad visa' },
  { id: 'visa-business',    slug: 'is-vize',         parentCategorySlug: 'vize', name: 'İş Vizesi',          nameEn: 'Business Visa',    emoji: '💼', color: 'amber',   order: 5, enabled: true, description: 'İş amaçlı seyahat vizesi', descriptionEn: 'Business travel visa' },
]

// ─── Yardımcı fonksiyonlar ────────────────────────────────────────────────────

/** Verilen ana kategoriye ait aktif alt kategorileri sıralı getirir */
export function getSubcategoriesByParent(parentSlug: string): SubcategoryEntry[] {
  return SUBCATEGORY_REGISTRY.filter(
    (s) => s.parentCategorySlug === parentSlug && s.enabled,
  ).sort((a, b) => a.order - b.order)
}

/** Site diline göre alt kategori görünen adı — DE/RU/FR/ZH `SUBCATEGORY_LOCALE_LABELS`, EN `nameEn`, TR `name`. */
export function subcategoryLabelForLocale(entry: SubcategoryEntry, locale: string): string {
  const raw = (locale || 'tr').trim()
  const lc = raw.toLowerCase()
  if (lc === 'tr') return entry.name
  if (isEnglishLocale(raw)) return entry.nameEn
  const row = SUBCATEGORY_LOCALE_LABELS[entry.id]
  if (row) {
    if (lc === 'de') return row.de
    if (lc === 'ru') return row.ru
    if (lc === 'fr') return row.fr
    if (lc === 'zh') return row.zh
  }
  return entry.nameEn
}

/** Tüm aktif alt kategoriler */
export function getAllSubcategories(): SubcategoryEntry[] {
  return SUBCATEGORY_REGISTRY.filter((s) => s.enabled).sort((a, b) => a.order - b.order)
}

/** Slug ile tek alt kategori */
export function getSubcategoryBySlug(slug: string): SubcategoryEntry | undefined {
  return SUBCATEGORY_REGISTRY.find((s) => s.slug === slug)
}

/** Renk → Tailwind CSS sınıfları (bg + text + hover) */
export function subcategoryColorClasses(color: string): {
  bg: string
  text: string
  border: string
  iconBg: string
} {
  const map: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
    red:     { bg: 'bg-red-50 dark:bg-red-900/20',       text: 'text-red-700 dark:text-red-400',       border: 'border-red-200 dark:border-red-800',       iconBg: 'bg-red-100 dark:bg-red-900/40' },
    rose:    { bg: 'bg-rose-50 dark:bg-rose-900/20',     text: 'text-rose-700 dark:text-rose-400',     border: 'border-rose-200 dark:border-rose-800',     iconBg: 'bg-rose-100 dark:bg-rose-900/40' },
    orange:  { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', iconBg: 'bg-orange-100 dark:bg-orange-900/40' },
    amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',   text: 'text-amber-700 dark:text-amber-400',   border: 'border-amber-200 dark:border-amber-800',   iconBg: 'bg-amber-100 dark:bg-amber-900/40' },
    yellow:  { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800', iconBg: 'bg-yellow-100 dark:bg-yellow-900/40' },
    green:   { bg: 'bg-green-50 dark:bg-green-900/20',   text: 'text-green-700 dark:text-green-400',   border: 'border-green-200 dark:border-green-800',   iconBg: 'bg-green-100 dark:bg-green-900/40' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40' },
    teal:    { bg: 'bg-teal-50 dark:bg-teal-900/20',     text: 'text-teal-700 dark:text-teal-400',     border: 'border-teal-200 dark:border-teal-800',     iconBg: 'bg-teal-100 dark:bg-teal-900/40' },
    cyan:    { bg: 'bg-cyan-50 dark:bg-cyan-900/20',     text: 'text-cyan-700 dark:text-cyan-400',     border: 'border-cyan-200 dark:border-cyan-800',     iconBg: 'bg-cyan-100 dark:bg-cyan-900/40' },
    sky:     { bg: 'bg-sky-50 dark:bg-sky-900/20',       text: 'text-sky-700 dark:text-sky-400',       border: 'border-sky-200 dark:border-sky-800',       iconBg: 'bg-sky-100 dark:bg-sky-900/40' },
    blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',     text: 'text-blue-700 dark:text-blue-400',     border: 'border-blue-200 dark:border-blue-800',     iconBg: 'bg-blue-100 dark:bg-blue-900/40' },
    indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800', iconBg: 'bg-indigo-100 dark:bg-indigo-900/40' },
    violet:  { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800', iconBg: 'bg-violet-100 dark:bg-violet-900/40' },
    stone:   { bg: 'bg-stone-50 dark:bg-stone-900/20',   text: 'text-stone-700 dark:text-stone-400',   border: 'border-stone-200 dark:border-stone-800',   iconBg: 'bg-stone-100 dark:bg-stone-900/40' },
    neutral: { bg: 'bg-neutral-50 dark:bg-neutral-800',  text: 'text-neutral-700 dark:text-neutral-300', border: 'border-neutral-200 dark:border-neutral-700', iconBg: 'bg-neutral-100 dark:bg-neutral-700' },
  }
  return map[color] ?? map.blue
}

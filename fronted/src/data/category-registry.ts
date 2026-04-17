/**
 * Central registry for all listing categories on the platform.
 * Each entry defines routing, display, card type, and search form.
 * Page builder varsayılan modülleri: `getLocalizedDefaultModules(slug, getMessages(locale))`.
 */

export type ListingType =
  | 'hotel'
  | 'holiday-home'
  | 'yacht'
  | 'tour'
  | 'activity'
  | 'cruise'
  | 'hajj'
  | 'visa'
  | 'car-rental'
  | 'ferry'
  | 'transfer'
  | 'flight'

/** Which static hero image to use (maps to /images/hero-right-*.png) */
export type HeroImageType = 'stay' | 'experience' | 'car' | 'flight'

/** Which HeroSearchForm tab is pre-selected */
export type HeroSearchTab = 'Stays' | 'Experiences' | 'Cars' | 'Flights'

export interface CategoryRegistryEntry {
  /** Unique slug used in URLs */
  slug: string
  /** Turkish display name */
  name: string
  /** English plural for internal use */
  namePlural: string
  /** Listing type identifier */
  listingType: ListingType
  /** Route prefix for category listing pages */
  categoryRoute: string
  /** Route prefix for detail pages */
  detailRoute: string
  /** Map view route */
  mapRoute?: string
  /** Emoji icon */
  emoji: string
  /** Price unit displayed on cards */
  priceUnit: string
  /** Hero heading for the category homepage */
  heroHeading: string
  /** Hero subheading */
  heroSubheading: string
  /** Which static hero image variant to use */
  heroImageType: HeroImageType
  /** Which HeroSearchForm tab is active on this category */
  heroSearchTab: HeroSearchTab
  /** Search form component name (registered separately) */
  searchFormType: 'stay' | 'experience' | 'car' | 'flight' | 'ferry' | 'transfer' | 'hajj' | 'visa'
  /** Gradient colors for hero fallback */
  heroGradient?: string
  /** Whether this category shows on main navigation */
  showInNav: boolean
  /** Nav order */
  navOrder: number
}

// ─── Category Registry ────────────────────────────────────────────────────────

export const CATEGORY_REGISTRY: CategoryRegistryEntry[] = [
  // ── Konaklama ──────────────────────────────────────────────────────────────
  {
    slug: 'oteller',
    name: 'Oteller',
    namePlural: 'Hotels',
    listingType: 'hotel',
    categoryRoute: '/oteller',
    detailRoute: '/otel',
    mapRoute: '/oteller-harita',
    emoji: '🏨',
    priceUnit: '/gece',
    heroHeading: 'Hayalinizdeki <br /> Otel',
    heroSubheading: 'Türkiye\'nin en iyi otellerinde konforlu bir konaklama deneyimi yaşayın.',
    heroImageType: 'stay',
    heroSearchTab: 'Stays',
    searchFormType: 'stay',
    heroGradient: 'from-blue-600 to-blue-800',
    showInNav: true,
    navOrder: 1,
  },
  {
    slug: 'tatil-evleri',
    name: 'Tatil Evleri',
    namePlural: 'Holiday Homes',
    listingType: 'holiday-home',
    categoryRoute: '/tatil-evleri',
    detailRoute: '/tatil-evi',
    mapRoute: '/tatil-evleri-harita',
    emoji: '🏡',
    priceUnit: '/gece',
    heroHeading: 'Tatil Evlerimiz',
    heroSubheading: 'Ailenizle ya da arkadaşlarınızla özel villa ve tatil evlerinde unutulmaz anlar yaşayın.',
    heroImageType: 'stay',
    heroSearchTab: 'Stays',
    searchFormType: 'stay',
    heroGradient: 'from-emerald-600 to-teal-700',
    showInNav: true,
    navOrder: 2,
  },
  {
    slug: 'yat-kiralama',
    name: 'Yat Kiralama',
    namePlural: 'Yacht Charters',
    listingType: 'yacht',
    categoryRoute: '/yat-kiralama',
    detailRoute: '/yat',
    mapRoute: '/yat-kiralama-harita',
    emoji: '⛵',
    priceUnit: '/gece',
    heroHeading: 'Denizde <br /> Özgürlük',
    heroSubheading: 'Gulet, katamaran ve motor yatlarla Türkiye\'nin turkuaz koylarında mavi tur keyfi.',
    heroImageType: 'stay',
    heroSearchTab: 'Stays',
    searchFormType: 'stay',
    heroGradient: 'from-cyan-600 to-blue-700',
    showInNav: true,
    navOrder: 3,
  },

  // ── Deneyim ────────────────────────────────────────────────────────────────
  {
    slug: 'turlar',
    name: 'Turlar',
    namePlural: 'Tours',
    listingType: 'tour',
    categoryRoute: '/turlar',
    detailRoute: '/tur',
    mapRoute: '/turlar-harita',
    emoji: '🗺️',
    priceUnit: '/kişi',
    heroHeading: 'Keşfetmeye <br /> Hazır Mısınız?',
    heroSubheading: 'Rehberli ve özel tur seçenekleriyle Türkiye\'nin tarihi ve doğal güzelliklerini keşfedin.',
    heroImageType: 'experience',
    heroSearchTab: 'Experiences',
    searchFormType: 'experience',
    heroGradient: 'from-orange-500 to-amber-600',
    showInNav: true,
    navOrder: 4,
  },
  {
    slug: 'aktiviteler',
    name: 'Aktiviteler',
    namePlural: 'Activities',
    listingType: 'activity',
    categoryRoute: '/aktiviteler',
    detailRoute: '/aktivite',
    mapRoute: '/aktiviteler-harita',
    emoji: '🎭',
    priceUnit: '/kişi',
    heroHeading: 'Heyecan Dolu <br /> Aktiviteler',
    heroSubheading: 'Dalış, paraşüt, rafting ve daha fazlası — macera sizi bekliyor!',
    heroImageType: 'experience',
    heroSearchTab: 'Experiences',
    searchFormType: 'experience',
    heroGradient: 'from-purple-600 to-pink-600',
    showInNav: true,
    navOrder: 5,
  },
  {
    slug: 'kruvaziyer',
    name: 'Kruvaziyer',
    namePlural: 'Cruises',
    listingType: 'cruise',
    categoryRoute: '/kruvaziyer',
    detailRoute: '/gemi-turu',
    mapRoute: '/kruvaziyer-harita',
    emoji: '🚢',
    priceUnit: '/kişi',
    heroHeading: 'Kruvaziyer <br /> Tatili',
    heroSubheading: 'Dev gemilerle Akdeniz, Ege ve Karadeniz\'in incilerini keşfedin.',
    heroImageType: 'experience',
    heroSearchTab: 'Experiences',
    searchFormType: 'experience',
    heroGradient: 'from-indigo-600 to-blue-700',
    showInNav: false,
    navOrder: 6,
  },
  {
    slug: 'hac-umre',
    name: 'Hac & Umre',
    namePlural: 'Hajj & Umrah',
    listingType: 'hajj',
    categoryRoute: '/hac-umre',
    detailRoute: '/hac-paket',
    mapRoute: '/hac-umre-harita',
    emoji: '🕌',
    priceUnit: '/kişi',
    heroHeading: 'Hac & Umre <br /> Paketleri',
    heroSubheading: 'Kutsal topraklara güvenli ve konforlu bir yolculuk için kapsamlı paket seçenekleri.',
    heroImageType: 'experience',
    heroSearchTab: 'Experiences',
    searchFormType: 'hajj',
    heroGradient: 'from-emerald-700 to-green-800',
    showInNav: false,
    navOrder: 7,
  },
  {
    slug: 'vize',
    name: 'Vize Hizmetleri',
    namePlural: 'Visa Services',
    listingType: 'visa',
    categoryRoute: '/vize',
    detailRoute: '/vize-basvuru',
    mapRoute: '/vize-harita',
    emoji: '📋',
    priceUnit: '/kişi',
    heroHeading: 'Vize <br /> Hizmetleri',
    heroSubheading: '180\'den fazla ülke için hızlı ve güvenli vize başvurusu. Online veya danışman desteğiyle.',
    heroImageType: 'experience',
    heroSearchTab: 'Experiences',
    searchFormType: 'visa',
    heroGradient: 'from-slate-600 to-slate-800',
    showInNav: false,
    navOrder: 8,
  },

  // ── Ulaşım ─────────────────────────────────────────────────────────────────
  {
    slug: 'ucak-bileti',
    name: 'Uçak Bileti',
    namePlural: 'Flights',
    listingType: 'flight',
    categoryRoute: '/ucak-bileti',
    detailRoute: '/ucak-ilan',
    emoji: '✈️',
    priceUnit: '/bilet',
    heroHeading: 'En Uygun <br /> Uçuşlar',
    heroSubheading: 'Yüzlerce havayolu şirketinin fiyatlarını karşılaştırın, en iyi bilet fiyatını bulun.',
    heroImageType: 'flight',
    heroSearchTab: 'Flights',
    searchFormType: 'flight',
    heroGradient: 'from-sky-500 to-blue-600',
    showInNav: true,
    navOrder: 9,
  },
  {
    slug: 'arac-kiralama',
    name: 'Araç Kiralama',
    namePlural: 'Car Rentals',
    listingType: 'car-rental',
    categoryRoute: '/arac-kiralama',
    detailRoute: '/arac',
    mapRoute: '/arac-kiralama-harita',
    emoji: '🚗',
    priceUnit: '/gün',
    heroHeading: 'Araç Kiralama',
    heroSubheading: 'Ekonomikten lükse yüzlerce araç seçeneği. Esnek teslim ve iade noktaları.',
    heroImageType: 'car',
    heroSearchTab: 'Cars',
    searchFormType: 'car',
    heroGradient: 'from-red-500 to-rose-600',
    showInNav: true,
    navOrder: 10,
  },
  {
    slug: 'feribot',
    name: 'Feribot',
    namePlural: 'Ferries',
    listingType: 'ferry',
    categoryRoute: '/feribot',
    detailRoute: '/feribot-rezervasyon',
    mapRoute: '/feribot-harita',
    emoji: '⛴️',
    priceUnit: '/kişi',
    heroHeading: 'Feribot Bileti',
    heroSubheading: 'Türkiye, Yunanistan ve Kıbrıs hatlarında feribot rezervasyonu yapın.',
    heroImageType: 'car',
    heroSearchTab: 'Cars',
    searchFormType: 'ferry',
    heroGradient: 'from-teal-500 to-cyan-600',
    showInNav: false,
    navOrder: 11,
  },
  {
    slug: 'transfer',
    name: 'Transfer',
    namePlural: 'Transfers',
    listingType: 'transfer',
    categoryRoute: '/transfer',
    detailRoute: '/tasima',
    mapRoute: '/transfer-harita',
    emoji: '🚐',
    priceUnit: '/araç',
    heroHeading: 'Özel Transfer',
    heroSubheading: 'Havalimanı, otel ve turistik nokta transferleri. VIP araçlar ile güvenli yolculuk.',
    heroImageType: 'car',
    heroSearchTab: 'Cars',
    searchFormType: 'transfer',
    heroGradient: 'from-violet-600 to-purple-700',
    showInNav: false,
    navOrder: 12,
  },
]

// ─── Helper Functions ─────────────────────────────────────────────────────────

export function getCategoryBySlug(slug: string): CategoryRegistryEntry | undefined {
  return CATEGORY_REGISTRY.find((c) => c.slug === slug)
}

/** URL segmenti → kayıt: `tatil-evleri-harita` veya `/tatil-evleri-harita` */
export function getCategoryByMapRoute(segment: string): CategoryRegistryEntry | undefined {
  const path = segment.startsWith('/') ? segment : `/${segment}`
  return CATEGORY_REGISTRY.find((c) => c.mapRoute === path)
}

export function getCategoryByListingType(listingType: ListingType): CategoryRegistryEntry | undefined {
  return CATEGORY_REGISTRY.find((c) => c.listingType === listingType)
}

export function getNavCategories(): CategoryRegistryEntry[] {
  return CATEGORY_REGISTRY.filter((c) => c.showInNav).sort((a, b) => a.navOrder - b.navOrder)
}

/** Ana sayfa kategori grid’i için varsayılan slug sırası (`navOrder`) */
export function defaultTravelCategoryHomeSlugOrder(): string[] {
  return [...CATEGORY_REGISTRY].sort((a, b) => a.navOrder - b.navOrder).map((e) => e.slug)
}

/**
 * `site_settings.ui.travel_category_home_slugs` — yalnızca kayıtlı slug’lar, eksikler sonda eklenir.
 */
export function normalizeTravelCategoryHomeOrder(stored: unknown): string[] {
  const defaultOrder = defaultTravelCategoryHomeSlugOrder()
  if (!Array.isArray(stored) || !stored.every((x): x is string => typeof x === 'string')) {
    return defaultOrder
  }
  const set = new Set(defaultOrder)
  const out: string[] = []
  for (const s of stored) {
    if (set.has(s)) {
      out.push(s)
      set.delete(s)
    }
  }
  for (const s of defaultOrder) {
    if (set.has(s)) out.push(s)
  }
  return out
}

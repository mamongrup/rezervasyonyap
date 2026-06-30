/**
 * Kategori vitrin facet filtreleri — dil bazlı SEO slug'ları.
 * `?hotel_theme=sea_view` yerine `/oteller/deniz-manzarali-oteller` vb.
 */

import { prefixLocale } from '@/lib/i18n-config'
import { localizeAppPath, type LocalizedRouteIndexes } from '@/lib/localized-path-shared'

export const APP_LOCALES = ['tr', 'en', 'de', 'ru', 'zh', 'fr'] as const
export type AppLocaleKey = (typeof APP_LOCALES)[number]

export type CategoryFacetRoute = {
  queryKey: string
  queryValue: string
}

type LocaleSlugMap = Record<AppLocaleKey, Record<string, string>>

type FacetRouteRegistryEntry = {
  categorySlug: string
  queryKey: string
  slugs: LocaleSlugMap
}

function normLocale(locale: string): AppLocaleKey {
  const l = locale.trim().toLowerCase()
  return (APP_LOCALES as readonly string[]).includes(l) ? (l as AppLocaleKey) : 'tr'
}

function L(
  tr: Record<string, string>,
  en: Record<string, string>,
  de?: Record<string, string>,
  fr?: Record<string, string>,
  ru?: Record<string, string>,
  zh?: Record<string, string>,
): LocaleSlugMap {
  return {
    tr,
    en,
    de: de ?? en,
    fr: fr ?? en,
    ru: ru ?? en,
    zh: zh ?? en,
  }
}

/** code → slug, kategori + queryKey başına */
const FACET_ROUTE_REGISTRY: FacetRouteRegistryEntry[] = [
  // ── Tatil evi / yat teması ─────────────────────────────────────────────────
  {
    categorySlug: 'tatil-evleri',
    queryKey: 'theme',
    slugs: L(
      {
        sea_view: 'deniz-manzarali-tatil-evleri',
        beachfront: 'denize-sifir-tatil-evleri',
        conservative: 'muhafazakar-tatil-evleri',
        luxury: 'luks-tatil-evleri',
        honeymoon: 'balayi-tatil-evleri',
        honeymoon_villa: 'balayi-villalari',
        family: 'aile-tatil-evleri',
        nature: 'doga-tatil-evleri',
        historic: 'tarihi-tatil-evleri',
        pool: 'havuzlu-tatil-evleri',
        jacuzzi: 'jakuzili-tatil-evleri',
      },
      {
        sea_view: 'sea-view',
        beachfront: 'beachfront',
        conservative: 'conservative-friendly',
        luxury: 'luxury',
        honeymoon: 'honeymoon',
        honeymoon_villa: 'honeymoon-villas',
        family: 'family',
        nature: 'nature',
        historic: 'historic-boutique',
        pool: 'pool',
        jacuzzi: 'jacuzzi',
      },
      {
        sea_view: 'meerblick',
        beachfront: 'strandlage',
        conservative: 'konservativ-freundlich',
        luxury: 'luxus',
        honeymoon: 'flitterwochen',
        honeymoon_villa: 'flitterwochen-villen',
        family: 'familie',
        nature: 'natur',
        historic: 'historisch-boutique',
        pool: 'pool',
        jacuzzi: 'whirlpool',
      },
      {
        sea_view: 'vue-mer',
        beachfront: 'front-de-mer',
        conservative: 'familles',
        luxury: 'luxe',
        honeymoon: 'lune-de-miel',
        honeymoon_villa: 'villas-lune-de-miel',
        family: 'famille',
        nature: 'nature',
        historic: 'historique-boutique',
        pool: 'piscine',
        jacuzzi: 'jacuzzi',
      },
      {
        sea_view: 'vid-na-more',
        beachfront: 'pervaya-liniya',
        conservative: 'dlya-semi',
        luxury: 'lyuks',
        honeymoon: 'medovyy-mesyats',
        honeymoon_villa: 'villy-medovyy-mesyats',
        family: 'semeynye',
        nature: 'priroda',
        historic: 'istoricheskie',
        pool: 'basseyn',
        jacuzzi: 'dzhakuzi',
      },
      {
        sea_view: 'hai-jing',
        beachfront: 'hai-bin',
        conservative: 'jia-ting',
        luxury: 'hao-hua',
        honeymoon: 'mi-yue',
        honeymoon_villa: 'mi-yue-bie-shu',
        family: 'qin-zi',
        nature: 'zi-ran',
        historic: 'li-shi-jing-pin',
        pool: 'yong-chi',
        jacuzzi: 'an-mo-yu-gang',
      },
    ),
  },
  {
    categorySlug: 'yat-kiralama',
    queryKey: 'theme',
    slugs: L(
      {
        sea_view: 'deniz-manzarali-yatlar',
        beachfront: 'denize-sifir-yatlar',
        conservative: 'muhafazakar-yatlar',
        luxury: 'luks-yatlar',
        honeymoon: 'balayi-yatlari',
        honeymoon_villa: 'balayi-yatlari',
        family: 'aile-yatlari',
        nature: 'doga-yatlari',
        historic: 'tarihi-yatlar',
        pool: 'havuzlu-yatlar',
        jacuzzi: 'jakuzili-yatlar',
      },
      {
        sea_view: 'sea-view-yachts',
        beachfront: 'beachfront-yachts',
        conservative: 'conservative-yachts',
        luxury: 'luxury-yachts',
        honeymoon: 'honeymoon-yachts',
        honeymoon_villa: 'honeymoon-yachts',
        family: 'family-yachts',
        nature: 'nature-yachts',
        historic: 'historic-yachts',
        pool: 'pool-yachts',
        jacuzzi: 'jacuzzi-yachts',
      },
    ),
  },
  // ── Otel facet'leri ───────────────────────────────────────────────────────
  {
    categorySlug: 'oteller',
    queryKey: 'hotel_theme',
    slugs: L(
      {
        sea_view: 'deniz-manzarali-oteller',
        beachfront: 'denize-sifir-oteller',
        family: 'aile-otelleri',
        honeymoon: 'balayi-otelleri',
        luxury: 'luks-oteller',
        nature: 'doga-otelleri',
        ski: 'kayak-otelleri',
        spa: 'spa-otelleri',
      },
      {
        sea_view: 'sea-view-hotels',
        beachfront: 'beachfront-hotels',
        family: 'family-hotels',
        honeymoon: 'honeymoon-hotels',
        luxury: 'luxury-hotels',
        nature: 'nature-hotels',
        ski: 'ski-hotels',
        spa: 'spa-hotels',
      },
      {
        sea_view: 'meerblick-hotels',
        beachfront: 'strandhotels',
        family: 'familienhotels',
        honeymoon: 'flitterwochen-hotels',
        luxury: 'luxushotels',
        nature: 'naturhotels',
        ski: 'skihotels',
        spa: 'spa-hotels',
      },
      {
        sea_view: 'hotels-vue-mer',
        beachfront: 'hotels-front-de-mer',
        family: 'hotels-famille',
        honeymoon: 'hotels-lune-de-miel',
        luxury: 'hotels-luxe',
        nature: 'hotels-nature',
        ski: 'hotels-ski',
        spa: 'hotels-spa',
      },
    ),
  },
  {
    categorySlug: 'oteller',
    queryKey: 'hotel_type',
    slugs: L(
      {
        resort: 'tatil-koyleri',
        hotel: 'sehir-otelleri',
        boutique: 'butik-oteller',
        motel: 'motel-oteller',
        pension: 'pansiyon-oteller',
        apart_hotel: 'apart-oteller',
      },
      {
        resort: 'resorts',
        hotel: 'city-hotels',
        boutique: 'boutique-hotels',
        motel: 'motels',
        pension: 'guesthouses',
        apart_hotel: 'apart-hotels',
      },
      {
        resort: 'ferienresorts',
        hotel: 'stadthotels',
        boutique: 'boutique-hotels',
        motel: 'motels',
        pension: 'pensionen',
        apart_hotel: 'aparthotels',
      },
      {
        resort: 'resorts-vacances',
        hotel: 'hotels-ville',
        boutique: 'hotels-boutique',
        motel: 'motels',
        pension: 'pensions',
        apart_hotel: 'hotels-appartements',
      },
    ),
  },
  {
    categorySlug: 'oteller',
    queryKey: 'hotel_accommodation',
    slugs: L(
      {
        room_only: 'sadece-oda-oteller',
        bed_breakfast: 'oda-kahvalti-oteller',
        half_board: 'yarim-pansiyon-oteller',
        full_board: 'tam-pansiyon-oteller',
        all_inclusive: 'her-sey-dahil-oteller',
        ultra_all_inclusive: 'ultra-her-sey-dahil-oteller',
      },
      {
        room_only: 'room-only-hotels',
        bed_breakfast: 'bed-breakfast-hotels',
        half_board: 'half-board-hotels',
        full_board: 'full-board-hotels',
        all_inclusive: 'all-inclusive-hotels',
        ultra_all_inclusive: 'ultra-all-inclusive-hotels',
      },
      {
        room_only: 'nur-uber-nachtung',
        bed_breakfast: 'fruhstuck-hotels',
        half_board: 'halbpension-hotels',
        full_board: 'vollpension-hotels',
        all_inclusive: 'all-inclusive-hotels',
        ultra_all_inclusive: 'ultra-all-inclusive-hotels',
      },
      {
        room_only: 'chambre-seule-hotels',
        bed_breakfast: 'petit-dejeuner-hotels',
        half_board: 'demi-pension-hotels',
        full_board: 'pension-complete-hotels',
        all_inclusive: 'tout-compris-hotels',
        ultra_all_inclusive: 'ultra-tout-compris-hotels',
      },
    ),
  },
  {
    categorySlug: 'oteller',
    queryKey: 'hotel_stars',
    slugs: L(
      { '5': '5-yildizli-oteller', '4': '4-yildizli-oteller', '3': '3-yildizli-oteller', '2': '2-yildizli-oteller', '1': '1-yildizli-oteller' },
      { '5': '5-star-hotels', '4': '4-star-hotels', '3': '3-star-hotels', '2': '2-star-hotels', '1': '1-star-hotels' },
      { '5': '5-sterne-hotels', '4': '4-sterne-hotels', '3': '3-sterne-hotels', '2': '2-sterne-hotels', '1': '1-sterne-hotels' },
      { '5': 'hotels-5-etoiles', '4': 'hotels-4-etoiles', '3': 'hotels-3-etoiles', '2': 'hotels-2-etoiles', '1': 'hotels-1-etoile' },
    ),
  },
  // ── Tur facet'leri ────────────────────────────────────────────────────────
  {
    categorySlug: 'turlar',
    queryKey: 'tour_departure',
    slugs: L(
      {
        istanbul: 'istanbul-cikisli-turlar',
        ankara: 'ankara-cikisli-turlar',
        izmir: 'izmir-cikisli-turlar',
        antalya: 'antalya-cikisli-turlar',
        bursa: 'bursa-cikisli-turlar',
      },
      {
        istanbul: 'tours-from-istanbul',
        ankara: 'tours-from-ankara',
        izmir: 'tours-from-izmir',
        antalya: 'tours-from-antalya',
        bursa: 'tours-from-bursa',
      },
      {
        istanbul: 'touren-ab-istanbul',
        ankara: 'touren-ab-ankara',
        izmir: 'touren-ab-izmir',
        antalya: 'touren-ab-antalya',
        bursa: 'touren-ab-bursa',
      },
      {
        istanbul: 'circuits-depart-istanbul',
        ankara: 'circuits-depart-ankara',
        izmir: 'circuits-depart-izmir',
        antalya: 'circuits-depart-antalya',
        bursa: 'circuits-depart-bursa',
      },
    ),
  },
  {
    categorySlug: 'turlar',
    queryKey: 'tour_travel_type',
    slugs: L(
      { plane: 'ucakli-turlar', bus: 'otobuslu-turlar', both: 'karma-turlar', own: 'kendi-aracinizla-turlar' },
      { plane: 'flight-tours', bus: 'bus-tours', both: 'mixed-tours', own: 'self-drive-tours' },
      { plane: 'flugreisen', bus: 'busreisen', both: 'kombinierte-reisen', own: 'selbstfahrer-touren' },
      { plane: 'circuits-avion', bus: 'circuits-bus', both: 'circuits-mixtes', own: 'circuits-libres' },
    ),
  },
  {
    categorySlug: 'turlar',
    queryKey: 'tour_accommodation',
    slugs: L(
      { hotel: 'otel-konaklamali-turlar', hostel: 'hostel-turlar', villa: 'villa-turlar', camping: 'kamp-turlari', none: 'konaklamasiz-turlar' },
      { hotel: 'hotel-tours', hostel: 'hostel-tours', villa: 'villa-tours', camping: 'camping-tours', none: 'no-stay-tours' },
      { hotel: 'hotel-touren', hostel: 'hostel-touren', villa: 'villa-touren', camping: 'camping-touren', none: 'tages-touren' },
      { hotel: 'circuits-hotel', hostel: 'circuits-auberge', villa: 'circuits-villa', camping: 'circuits-camping', none: 'circuits-sans-hebergement' },
    ),
  },
  {
    categorySlug: 'turlar',
    queryKey: 'tour_duration',
    slugs: L(
      { '1': 'gunubirlik-turlar', '2-3': '2-3-gunluk-turlar', '4-7': '4-7-gunluk-turlar', '8+': '8-gun-uzeri-turlar' },
      { '1': 'day-tours', '2-3': '2-3-day-tours', '4-7': '4-7-day-tours', '8+': '8-plus-day-tours' },
      { '1': 'tagesausfluge', '2-3': '2-3-tage-touren', '4-7': '4-7-tage-touren', '8+': '8-tage-touren' },
      { '1': 'excursions-journee', '2-3': 'circuits-2-3-jours', '4-7': 'circuits-4-7-jours', '8+': 'circuits-8-jours-plus' },
    ),
  },
]

/** Path'e yazılabilir facet query anahtarları */
export const PATH_ROUTABLE_FACET_KEYS = new Set(
  FACET_ROUTE_REGISTRY.map((e) => e.queryKey),
)

/** Kategori başına path önceliği (ilk eşleşen path segmenti) */
const FACET_PATH_PRIORITY: Record<string, string[]> = {
  'tatil-evleri': ['theme'],
  'yat-kiralama': ['theme'],
  oteller: ['hotel_theme', 'hotel_type', 'hotel_accommodation', 'hotel_stars'],
  turlar: ['tour_departure', 'tour_travel_type', 'tour_accommodation', 'tour_duration'],
}

type SlugLookup = {
  byCategoryLocaleSlug: Map<string, CategoryFacetRoute & { categorySlug: string }>
  byCategoryLocaleCode: Map<string, string>
  anySlugToRoute: Map<string, CategoryFacetRoute & { categorySlug: string }>
}

function lookupKey(categorySlug: string, locale: string, part: string): string {
  return `${categorySlug}::${normLocale(locale)}::${part.trim().toLowerCase()}`
}

function buildLookups(): SlugLookup {
  const byCategoryLocaleSlug = new Map<string, CategoryFacetRoute & { categorySlug: string }>()
  const byCategoryLocaleCode = new Map<string, string>()
  const anySlugToRoute = new Map<string, CategoryFacetRoute & { categorySlug: string }>()

  for (const entry of FACET_ROUTE_REGISTRY) {
    for (const loc of APP_LOCALES) {
      const codeMap = entry.slugs[loc]
      for (const [code, slug] of Object.entries(codeMap)) {
        const slugNorm = slug.toLowerCase()
        const route = { categorySlug: entry.categorySlug, queryKey: entry.queryKey, queryValue: code }
        byCategoryLocaleSlug.set(lookupKey(entry.categorySlug, loc, slugNorm), route)
        byCategoryLocaleCode.set(lookupKey(entry.categorySlug, loc, `${entry.queryKey}::${code}`), slug)
        anySlugToRoute.set(`${entry.categorySlug}::${slugNorm}`, route)
      }
    }
  }

  return { byCategoryLocaleSlug, byCategoryLocaleCode, anySlugToRoute }
}

const LOOKUPS = buildLookups()

export function categoryFacetSlugForCode(
  categorySlug: string,
  locale: string,
  queryKey: string,
  code: string,
): string | undefined {
  return LOOKUPS.byCategoryLocaleCode.get(lookupKey(categorySlug, locale, `${queryKey}::${code.trim()}`))
}

export function categoryFacetRouteFromHandle(
  categorySlug: string,
  locale: string,
  handle: string | undefined | null,
): CategoryFacetRoute | undefined {
  const s = handle?.trim().toLowerCase()
  if (!s) return undefined
  const hit =
    LOOKUPS.byCategoryLocaleSlug.get(lookupKey(categorySlug, locale, s)) ??
    LOOKUPS.anySlugToRoute.get(`${categorySlug}::${s}`)
  if (!hit) return undefined
  return { queryKey: hit.queryKey, queryValue: hit.queryValue }
}

export function isCategoryFacetSlug(
  categorySlug: string,
  locale: string,
  slug: string | undefined | null,
): boolean {
  return !!categoryFacetRouteFromHandle(categorySlug, locale, slug)
}

export function buildCategoryFacetVitrinPath(
  locale: string,
  categorySlug: string,
  queryKey: string,
  code: string,
  idx: LocalizedRouteIndexes,
): string {
  const loc = normLocale(locale)
  const facetSlug = categoryFacetSlugForCode(categorySlug, loc, queryKey, code)
  const categoryPath = localizeAppPath(`/${categorySlug}`, loc, idx)
  if (!facetSlug) return prefixLocale(loc, categoryPath)
  return prefixLocale(loc, `${categoryPath}/${facetSlug}`)
}

export function swapCategoryFacetSlug(
  categorySlug: string,
  slug: string,
  fromLocale: string,
  toLocale: string,
): string | undefined {
  const route =
    LOOKUPS.byCategoryLocaleSlug.get(lookupKey(categorySlug, fromLocale, slug.toLowerCase())) ??
    LOOKUPS.anySlugToRoute.get(`${categorySlug}::${slug.toLowerCase()}`)
  if (!route) return undefined
  return categoryFacetSlugForCode(categorySlug, toLocale, route.queryKey, route.queryValue)
}

export function isFacetRoutableCategorySlug(slug: string | undefined | null): boolean {
  return !!slug && slug in FACET_PATH_PRIORITY
}

/** Form / query'den path'e taşınacak tek facet seçimini bul */
export function pickFacetForPath(
  categorySlug: string,
  query: Record<string, string | undefined>,
): CategoryFacetRoute | undefined {
  const order = FACET_PATH_PRIORITY[categorySlug] ?? []
  for (const key of order) {
    const raw = query[key]?.trim()
    if (!raw) continue
    const parts = raw.split(',').map((x) => x.trim()).filter(Boolean)
    if (parts.length === 1) return { queryKey: key, queryValue: parts[0]! }
  }
  return undefined
}

export function applyFacetRouteToSearchQuery<T extends Record<string, unknown>>(
  query: T,
  route: CategoryFacetRoute,
): T {
  return { ...query, [route.queryKey]: route.queryValue }
}

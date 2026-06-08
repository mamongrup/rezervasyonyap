/**
 * Tur alt kategori slug'ları — URL `/turlar/{slug}` yerine `/turlar/all?…` ile API filtreleri.
 * Hub kartları ve `SectionSubcategories` aynı haritayı kullanır.
 */

export const TOUR_SUBCATEGORY_SLUGS = [
  'yurtici-turlar',
  'yurtdisi-turlar',
  'kultur-turlari',
  'doga-turlari',
  'dini-turlar',
  'macera-turlari',
  'avrupa-turlari',
] as const

export type TourSubcategorySlug = (typeof TOUR_SUBCATEGORY_SLUGS)[number]

const TOUR_SUBCATEGORY_SET = new Set<string>(TOUR_SUBCATEGORY_SLUGS)

/** Vitrin liste URL’sine birleştirilecek sorgu parçası (fetch + hub linkleri). */
export type TourSubcategoryQueryPatch = {
  location?: string
  q?: string
  tour_travel_type?: string
  tour_accommodation?: string
  tour_duration?: string
}

type TourSubcategoryRouteDef = {
  listPath: string
  query: TourSubcategoryQueryPatch
}

/**
 * Slug → `/turlar/all?…` ve katalog API sorgusu.
 * `location` / `q` backend’de ilan başlığı ve lokasyon alanlarında aranır.
 */
const TOUR_SUBCATEGORY_ROUTES: Record<TourSubcategorySlug, TourSubcategoryRouteDef> = {
  'yurtici-turlar': {
    listPath: '/turlar/all?location=türkiye',
    query: { location: 'türkiye' },
  },
  'yurtdisi-turlar': {
    listPath: '/turlar/all?location=avrupa',
    query: { location: 'avrupa' },
  },
  'kultur-turlari': {
    listPath: '/turlar/all?q=kültür',
    query: { q: 'kültür' },
  },
  'doga-turlari': {
    listPath: '/turlar/all?q=doğa',
    query: { q: 'doğa' },
  },
  'dini-turlar': {
    listPath: '/turlar/all?q=dini',
    query: { q: 'dini' },
  },
  'macera-turlari': {
    listPath: '/turlar/all?q=macera',
    query: { q: 'macera' },
  },
  'avrupa-turlari': {
    listPath: '/turlar/all?location=avrupa',
    query: { location: 'avrupa' },
  },
}

export function isTourSubcategorySlug(slug: string | undefined | null): slug is TourSubcategorySlug {
  return !!slug && TOUR_SUBCATEGORY_SET.has(slug)
}

export function tourSubcategoryRoute(slug: string): TourSubcategoryRouteDef | undefined {
  if (!isTourSubcategorySlug(slug)) return undefined
  return TOUR_SUBCATEGORY_ROUTES[slug]
}

/** Alt kategori / hub linkleri için App Router iç yolu. */
export function tourSubcategoryListPath(slug: string): string | undefined {
  return tourSubcategoryRoute(slug)?.listPath
}

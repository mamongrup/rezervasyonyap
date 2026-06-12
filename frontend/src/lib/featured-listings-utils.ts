import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { fetchCategoryListings, fetchListingsByIds } from '@/lib/listings-fetcher'
import { slugifyListingSlug, transliterateTurkishForSlug } from '@/lib/slug-latin-tr'
import type { FeaturedListingsConfig, FeaturedTabListingIds, TListingBase } from '@/types/listing-types'

/** Vitrin öne çıkan ilan yardımcıları — istemci + sunucu güvenli (fs yok). */

export type FeaturedTabKind = 'recommended' | 'new' | 'discounted' | 'luxury' | 'economic'

export interface FeaturedTabDef {
  label: string
  kind: FeaturedTabKind
}

/** Lüks / ekonomik vitrin sekmeleri — konaklama kategorileri */
export const FEATURED_LUXURY_ECONOMIC_CATEGORY_SLUGS = new Set(['oteller', 'tatil-evleri'])

export function categorySupportsLuxuryEconomicTabs(categorySlug: string): boolean {
  return FEATURED_LUXURY_ECONOMIC_CATEGORY_SLUGS.has(categorySlug)
}

export const EMPTY_FEATURED_TAB_IDS: FeaturedTabListingIds = {
  recommended: [],
  luxury: [],
  economic: [],
  new: [],
  discounted: [],
}

const FEATURED_TAB_KINDS: FeaturedTabKind[] = [
  'recommended',
  'luxury',
  'economic',
  'new',
  'discounted',
]

function filterFeaturedIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((id): id is string => typeof id === 'string' && id.trim() !== '')
}

/** JSON / eski `listingIds` → sekme başına id listeleri */
export function normalizeFeaturedTabListingIds(
  raw: Partial<FeaturedTabListingIds> | null | undefined,
  legacyListingIds?: string[],
): FeaturedTabListingIds {
  const legacy = filterFeaturedIdList(legacyListingIds)
  return {
    recommended: filterFeaturedIdList(raw?.recommended).length
      ? filterFeaturedIdList(raw?.recommended)
      : legacy,
    luxury: filterFeaturedIdList(raw?.luxury),
    economic: filterFeaturedIdList(raw?.economic),
    new: filterFeaturedIdList(raw?.new),
    discounted: filterFeaturedIdList(raw?.discounted),
  }
}

export function normalizeFeaturedListingsConfig(
  raw: Partial<FeaturedListingsConfig> | null | undefined,
  categorySlug: string,
): FeaturedListingsConfig {
  const tabs = normalizeFeaturedTabListingIds(raw?.tabs, raw?.listingIds)
  return {
    categorySlug,
    tabs,
    listingIds: tabs.recommended,
    displayCount: normalizeFeaturedDisplayCount(raw?.displayCount),
    updatedAt: raw?.updatedAt,
  }
}

export function collectAllFeaturedListingIds(tabs: FeaturedTabListingIds): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const kind of FEATURED_TAB_KINDS) {
    for (const id of tabs[kind]) {
      if (seen.has(id)) continue
      seen.add(id)
      out.push(id)
    }
  }
  return out
}

/** Panel vitrin düzenleyicide gösterilecek sekmeler */
export function featuredEditorTabOptions(categorySlug: string): Array<{ kind: FeaturedTabKind; label: string }> {
  const base: Array<{ kind: FeaturedTabKind; label: string }> = [
    { kind: 'recommended', label: 'Önerilenler' },
  ]
  if (categorySupportsLuxuryEconomicTabs(categorySlug)) {
    base.push(
      { kind: 'luxury', label: 'Lüks' },
      { kind: 'economic', label: 'Ekonomik' },
    )
  }
  base.push(
    { kind: 'new', label: 'Yeni' },
    { kind: 'discounted', label: 'İndirimli' },
  )
  return base
}

export const DEFAULT_FEATURED_DISPLAY_COUNT = 4
export const MAX_FEATURED_DISPLAY_COUNT = 24

export function normalizeFeaturedDisplayCount(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return DEFAULT_FEATURED_DISPLAY_COUNT
  return Math.min(MAX_FEATURED_DISPLAY_COUNT, Math.max(1, Math.round(n)))
}

export function safeCategorySlug(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96)
}

/** Seçili ilanları başa al; geri kalanı mevcut sırayla devam eder. */
export function applyFeaturedListingOrder<T extends { id: string }>(
  listings: T[],
  featuredIds: string[],
): T[] {
  if (featuredIds.length === 0) return listings
  const byId = new Map(listings.map((l) => [l.id, l]))
  const featured = featuredIds.map((id) => byId.get(id)).filter((l): l is T => Boolean(l))
  const featuredSet = new Set(featuredIds)
  const rest = listings.filter((l) => !featuredSet.has(l.id))
  return [...featured, ...rest]
}

/** Panel sırasıyla seçili ilanlar (id eşleşmesi). */
export function pickFeaturedTabListings<T extends { id: string; isCampaign?: boolean }>(
  listings: T[],
  featuredIds: string[],
): T[] {
  if (featuredIds.length > 0) {
    const byId = new Map(listings.map((l) => [l.id, l]))
    return featuredIds.map((id) => byId.get(id)).filter((l): l is T => Boolean(l))
  }
  return listings.filter((l) => l.isCampaign)
}

function isLuxuryListing(l: TListingBase): boolean {
  const themes = l.themeCodes ?? []
  if (themes.some((t) => t === 'luxury' || t === 'honeymoon_villa')) return true
  const stars = 'stars' in l ? Number((l as { stars?: number }).stars) : 0
  if (stars >= 4) return true
  return false
}

function pickEconomicListings(listings: TListingBase[]): TListingBase[] {
  const withPrice = listings.filter((l) => l.priceAmount != null && l.priceAmount > 0)
  if (withPrice.length === 0) return []
  const sorted = [...withPrice].sort((a, b) => (a.priceAmount ?? 0) - (b.priceAmount ?? 0))
  const idx = Math.max(0, Math.floor(sorted.length * 0.35))
  const threshold = sorted[idx]?.priceAmount ?? sorted[0]!.priceAmount!
  return sorted.filter((l) => (l.priceAmount ?? Number.POSITIVE_INFINITY) <= threshold)
}

/** Anasayfa vitrin sekmesi — panel seçimi varsa onu, yoksa otomatik filtre */
export function pickListingsForFeaturedTab(
  listings: TListingBase[],
  kind: FeaturedTabKind,
  tabIds: FeaturedTabListingIds,
): TListingBase[] {
  const manual = tabIds[kind]
  if (manual.length > 0) return pickFeaturedTabListings(listings, manual)

  switch (kind) {
    case 'recommended':
      return listings
    case 'new': {
      const exclude = new Set(tabIds.recommended)
      const pool = listings.filter((l) => !exclude.has(l.id))
      const flagged = pool.filter((l) => l.isNew)
      if (flagged.length > 0) return flagged
      return pool.filter((l) => {
        if (!l.createdAt) return false
        const age = Date.now() - new Date(l.createdAt).getTime()
        return age < 60 * 24 * 60 * 60 * 1000
      })
    }
    case 'discounted':
      return listings.filter((l) => (l.discountPercent ?? 0) > 0)
    case 'luxury':
      return listings.filter(isLuxuryListing)
    case 'economic':
      return pickEconomicListings(listings)
    default:
      return listings
  }
}

/** Panel id'leri + kategori havuzu — seçili ilanlar API sayfasında olmasa da vitrine girer. */
export async function loadFeaturedPlacesListingPool(
  categorySlug: string,
  tabIds: FeaturedTabListingIds,
  locale: string,
): Promise<TListingBase[]> {
  const allIds = collectAllFeaturedListingIds(tabIds)
  const [apiResult, featuredRows] = await Promise.all([
    fetchCategoryListings(categorySlug, {}, { perPage: 100 }, locale),
    allIds.length > 0 ? fetchListingsByIds(categorySlug, allIds, locale) : Promise.resolve([]),
  ])

  const merged = new Map<string, TListingBase>()
  for (const row of featuredRows) merged.set(row.id, row)
  for (const row of apiResult.listings) {
    if (!merged.has(row.id)) merged.set(row.id, row)
  }

  return [...merged.values()].map((l) => ({
    ...l,
    listingVertical: normalizeCatalogVertical(l.listingVertical),
  }))
}

/** API çevirisi yokken başlık = slug — vitrin seçicide gösterilmez. */
export function isSlugOnlyListingTitle(listing: {
  title?: string | null
  handle?: string | null
}): boolean {
  const title = listing.title?.trim() ?? ''
  const slug = listing.handle?.trim() ?? ''
  if (!title) return true
  if (!slug) return false
  return title.toLowerCase() === slug.toLowerCase()
}

/**
 * Panel araması — `Ütopia Villa 2` / `utopia-villa-2` / ASCII varyantları.
 * API tek parça ILIKE ile eşleşmeyince slug biçimi yedek olur.
 */
export function expandListingSearchQueries(q: string): string[] {
  const trimmed = q.trim()
  if (!trimmed) return []

  const variants = new Set<string>([trimmed])
  const ascii = transliterateTurkishForSlug(trimmed).replace(/_/g, ' ').trim()
  if (ascii) variants.add(ascii)

  const slug = slugifyListingSlug(trimmed)
  if (slug) {
    variants.add(slug)
    variants.add(slug.replace(/-/g, ' '))
  }

  return [...variants]
}

export function filterListingsForFeaturedPicker<T extends { title?: string | null; handle?: string | null }>(
  listings: T[],
): T[] {
  const seenSlug = new Set<string>()
  const out: T[] = []
  for (const listing of listings) {
    if (isSlugOnlyListingTitle(listing)) continue
    const slug = listing.handle?.trim().toLowerCase() ?? ''
    if (slug) {
      if (seenSlug.has(slug)) continue
      seenSlug.add(slug)
    }
    out.push(listing)
  }
  return out
}

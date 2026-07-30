import type { ListingType } from '@/data/category-registry'
import { getCategoryByListingType } from '@/data/category-registry'
import {
  CATALOG_LISTING_VERTICAL_CODES,
  type CatalogListingVerticalCode,
  normalizeCatalogVertical,
} from '@/lib/catalog-listing-vertical'
import type { SitemapEntry } from '@/lib/travel-api'

/** Anasayfa + CMS + blog (+ tanımsız kategori ilanları). */
export const SITEMAP_SITE_SEGMENT = 'site' as const

export type SitemapSegmentId = typeof SITEMAP_SITE_SEGMENT | CatalogListingVerticalCode

const VERTICAL_TO_LISTING_TYPE: Record<CatalogListingVerticalCode, ListingType> = {
  hotel: 'hotel',
  holiday_home: 'holiday-home',
  yacht_charter: 'yacht',
  tour: 'tour',
  activity: 'activity',
  cruise: 'cruise',
  hajj: 'hajj',
  visa: 'visa',
  car_rental: 'car-rental',
  ferry: 'ferry',
  transfer: 'transfer',
  flight: 'flight',
  beach_lounger: 'beach-lounger',
  cinema_ticket: 'cinema-ticket',
  event: 'event',
  restaurant_table: 'restaurant-table',
}

/** Next `generateSitemaps` — her kategori ayrı `/sitemap/{id}.xml`. */
export function allSitemapSegmentIds(): SitemapSegmentId[] {
  return [SITEMAP_SITE_SEGMENT, ...CATALOG_LISTING_VERTICAL_CODES]
}

export function isSitemapSegmentId(raw: string): raw is SitemapSegmentId {
  if (raw === SITEMAP_SITE_SEGMENT) return true
  return normalizeCatalogVertical(raw) !== undefined
}

/** Kategori liste hub’ı (`/oteller/all` vb.). */
export function categoryBrowsePathForVertical(code: CatalogListingVerticalCode): string {
  const listingType = VERTICAL_TO_LISTING_TYPE[code]
  const entry = getCategoryByListingType(listingType)
  if (entry?.categoryRoute) {
    return `${entry.categoryRoute}/all`
  }
  return `/${code}/all`
}

export function filterSitemapEntriesForSegment(
  entries: SitemapEntry[],
  segment: SitemapSegmentId,
): SitemapEntry[] {
  if (segment === SITEMAP_SITE_SEGMENT) {
    return entries.filter((e) => {
      if (e.kind === 'cms_page' || e.kind === 'blog_post') return true
      if (e.kind !== 'listing') return true
      return normalizeCatalogVertical(e.category_code ?? undefined) === undefined
    })
  }

  return entries.filter((e) => {
    if (e.kind !== 'listing') return false
    return normalizeCatalogVertical(e.category_code ?? undefined) === segment
  })
}

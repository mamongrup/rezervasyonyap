/**
 * Kategori liste sayfaları için schema.org ItemList (+ ListItem) JSON-LD.
 * Google host carousel / zengin sonuç uygunluğu için özet sayfada geçerli detay URL’leri ve görseller.
 * @see https://developers.google.com/search/docs/appearance/structured-data/carousel
 */

import type { CategoryRegistryEntry, ListingType } from '@/data/category-registry'
import { schemaOrgTypeForCatalogVertical } from '@/lib/catalog-listing-vertical'
import type { TListingBase } from '@/types/listing-types'
import { getPublicSiteUrl, toAbsoluteSiteUrl } from '@/lib/site-branding-seo'
import { vitrinHref } from '@/lib/vitrin-href'

const MAX_ITEMS = 50

/** Carousel dokümanlarında çoklu öğe; JSON boyutunu sınırla. */
function schemaTypeForListing(listingType: ListingType): string {
  const map: Record<ListingType, string> = {
    hotel: 'Hotel',
    'holiday-home': 'VacationRental',
    yacht: 'Boat',
    tour: 'TouristTrip',
    activity: 'TouristAttraction',
    cruise: 'TouristTrip',
    hajj: 'Product',
    visa: 'Product',
    'car-rental': 'Product',
    ferry: 'Product',
    transfer: 'Service',
    flight: 'Product',
  }
  return map[listingType] ?? 'Product'
}

export async function buildListingsItemListJsonLd(opts: {
  category: CategoryRegistryEntry
  listings: TListingBase[]
  locale: string
  currentHandle?: string
}): Promise<Record<string, unknown> | null> {
  const { category, listings, locale, currentHandle } = opts
  const base = getPublicSiteUrl()
  if (!base || listings.length === 0) return null

  const linkBase = category.detailRoute
  const segment =
    currentHandle && currentHandle !== 'all' ? currentHandle : 'all'
  const listPagePath = await vitrinHref(locale, `${category.categoryRoute}/${segment}`)
  const listPageUrl = `${base}${listPagePath}`

  const slice = listings.slice(0, MAX_ITEMS)

  const itemPaths = await Promise.all(slice.map((l) => vitrinHref(locale, `${linkBase}/${l.handle}`)))

  const itemListElement = slice.map((l, i) => {
    const itemPath = itemPaths[i]!
    const itemUrl = `${base}${itemPath}`
    const rawImg = l.featuredImage || l.galleryImgs?.[0]
    const imageAbs = rawImg ? toAbsoluteSiteUrl(base, rawImg) ?? rawImg : undefined

    const schemaType = l.listingVertical
      ? schemaOrgTypeForCatalogVertical(l.listingVertical)
      : schemaTypeForListing(category.listingType)

    const item: Record<string, unknown> = {
      '@type': schemaType,
      name: l.title,
      url: itemUrl,
    }
    if (imageAbs) item.image = imageAbs
    if (l.description && l.description.trim()) {
      item.description = l.description.trim().slice(0, 5000)
    }

    return {
      '@type': 'ListItem',
      position: i + 1,
      url: itemUrl,
      item,
    }
  })

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: category.name,
    url: listPageUrl,
    numberOfItems: itemListElement.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement,
  }
}

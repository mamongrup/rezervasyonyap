/**
 * Kategori liste sayfaları için schema.org ItemList (+ ListItem) JSON-LD.
 * Google host carousel / zengin sonuç uygunluğu için özet sayfada geçerli detay URL’leri ve görseller.
 * @see https://developers.google.com/search/docs/appearance/structured-data/carousel
 *
 * Not: `@type: Product` için Google “offers | review | aggregateRating” zorunlu tutar.
 * Eksik Product’lar Search Console “Ürün snippet’leri”nde geçersiz sayılır — bu yüzden
 * fiyat/puan yoksa Product yerine Thing kullanılır; varsa Offer / AggregateRating eklenir.
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
    'beach-lounger': 'Product',
    'cinema-ticket': 'Event',
    event: 'Event',
    'restaurant-table': 'Restaurant',
  }
  return map[listingType] ?? 'Product'
}

function listItemOffer(
  itemUrl: string,
  listing: TListingBase,
): Record<string, unknown> | undefined {
  let value: string | undefined
  if (typeof listing.priceAmount === 'number' && Number.isFinite(listing.priceAmount) && listing.priceAmount > 0) {
    value = String(Math.round(listing.priceAmount * 100) / 100)
  } else if (listing.price) {
    const digits = listing.price.replace(/[^\d.,]/g, '').replace(',', '.')
    const n = parseFloat(digits)
    if (!Number.isNaN(n) && n > 0) value = String(Math.round(n * 100) / 100)
  }
  if (!value) return undefined
  const cur = (listing.priceCurrency || 'TRY').trim().toUpperCase()
  return {
    '@type': 'Offer',
    url: itemUrl,
    priceCurrency: cur.length === 3 ? cur : 'TRY',
    price: value,
    availability: 'https://schema.org/InStock',
  }
}

function listItemAggregateRating(listing: TListingBase): Record<string, unknown> | undefined {
  const c = listing.reviewCount
  const r = listing.reviewStart
  if (typeof c !== 'number' || c < 1 || typeof r !== 'number' || !Number.isFinite(r)) return undefined
  return {
    '@type': 'AggregateRating',
    ratingValue: Math.min(5, Math.max(1, r)),
    reviewCount: c,
    bestRating: 5,
    worstRating: 1,
  }
}

/** Product / VacationRental rich-result kurallarına uymayan tipleri düşürür / tamamlar. */
export function finalizeSchemaOrgItemType(
  schemaType: string,
  itemUrl: string,
  listing: Pick<
    TListingBase,
    'price' | 'priceAmount' | 'priceCurrency' | 'reviewStart' | 'reviewCount' | 'map'
  >,
): { type: string; offers?: Record<string, unknown>; aggregateRating?: Record<string, unknown> } {
  const offer = listItemOffer(itemUrl, listing as TListingBase)
  const rating = listItemAggregateRating(listing as TListingBase)
  const hasGeo =
    typeof listing.map?.lat === 'number' &&
    typeof listing.map?.lng === 'number' &&
    Number.isFinite(listing.map.lat) &&
    Number.isFinite(listing.map.lng) &&
    !(listing.map.lat === 0 && listing.map.lng === 0)

  let type = schemaType
  // Google VacationRental için geo zorunlu — listede koordinatsız VR üretme.
  if (type === 'VacationRental' && !hasGeo) {
    type = 'LodgingBusiness'
  }
  if (type === 'Product') {
    if (!offer && !rating) {
      return { type: 'Thing' }
    }
    return {
      type: 'Product',
      ...(offer ? { offers: offer } : {}),
      ...(rating ? { aggregateRating: rating } : {}),
    }
  }
  return {
    type,
    ...(offer ? { offers: offer } : {}),
    ...(rating ? { aggregateRating: rating } : {}),
  }
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

    const rawType = l.listingVertical
      ? schemaOrgTypeForCatalogVertical(l.listingVertical)
      : schemaTypeForListing(category.listingType)

    const finalized = finalizeSchemaOrgItemType(rawType, itemUrl, l)

    const item: Record<string, unknown> = {
      '@type': finalized.type,
      name: l.title,
      url: itemUrl,
    }
    if (imageAbs) item.image = imageAbs
    if (l.description && l.description.trim()) {
      item.description = l.description.trim().slice(0, 5000)
    }
    if (finalized.offers) item.offers = finalized.offers
    if (finalized.aggregateRating) item.aggregateRating = finalized.aggregateRating

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

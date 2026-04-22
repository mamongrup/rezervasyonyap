/**
 * İlan detay sayfaları için schema.org JSON-LD (@graph).
 * WebPage + BreadcrumbList + türe özel ana varlık (Hotel, VacationRental, Boat, TouristTrip, TouristAttraction)
 * + Offer, AggregateRating, GeoCoordinates — Google zengin sonuç / host carousel ile uyumlu.
 */

import type { ListingType } from '@/data/category-registry'
import type { CatalogListingVerticalCode } from '@/lib/catalog-listing-vertical'
import { getPublicSiteUrl, toAbsoluteSiteUrl } from '@/lib/site-branding-seo'
import { vitrinHref } from '@/lib/vitrin-href'

type StayVertical = 'hotel' | 'holiday_home' | 'yacht'
type ExperienceVertical = 'tour' | 'activity'

export type ListingDetailHost = {
  displayName?: string
  handle?: string
}

/** Stay / experience sayfalarından gelen ortak ilan alanları */
export type ListingDetailFields = {
  id?: string
  title: string
  description?: string
  handle: string
  address?: string
  city?: string
  featuredImage?: string
  galleryImgs?: string[]
  listingCategory?: string
  /** API `listing_vertical` / `category_code` — çıkarımdan öncelikli */
  listingVertical?: CatalogListingVerticalCode
  map?: { lat: number; lng: number }
  maxGuests?: number
  bedrooms?: number
  bathrooms?: number
  beds?: number
  price?: string
  priceAmount?: number
  priceCurrency?: string
  reviewStart?: number
  reviewCount?: number
  stars?: number
  host?: ListingDetailHost
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function inferStayVertical(listingCategory: string | undefined): StayVertical {
  const s = (listingCategory || '').toLowerCase()
  if (/yat|yacht|gulet|katamaran|tekne|boat|mavi\s*tur/.test(s)) return 'yacht'
  if (/villa|tatil\s*ev|holiday|home|konak|müstakil|bungalov/.test(s)) return 'holiday_home'
  if (/otel|hotel|resort|pansiyon|butik/.test(s)) return 'hotel'
  return 'hotel'
}

function inferExperienceVertical(listingCategory: string | undefined): ExperienceVertical {
  const s = (listingCategory || '').toLowerCase()
  if (/aktivit|activity|macera|dalış|spa|atölye|workshop/.test(s)) return 'activity'
  if (/tur|tour|gezi|safari|günübirlik/.test(s)) return 'tour'
  return 'tour'
}

type VerticalHints = Pick<ListingDetailFields, 'listingCategory' | 'listingVertical'>

/** Önce `listingVertical`, yoksa `listingCategory` metni */
function resolveStayVertical(listing: VerticalHints): StayVertical {
  const v = listing.listingVertical
  if (v === 'hotel') return 'hotel'
  if (v === 'holiday_home') return 'holiday_home'
  if (v === 'yacht_charter') return 'yacht'
  return inferStayVertical(listing.listingCategory)
}

function resolveExperienceVertical(listing: VerticalHints): ExperienceVertical {
  const v = listing.listingVertical
  if (v === 'activity') return 'activity'
  if (v === 'tour' || v === 'cruise' || v === 'hajj') return 'tour'
  return inferExperienceVertical(listing.listingCategory)
}

function listingTypeFromStay(v: StayVertical): ListingType {
  if (v === 'holiday_home') return 'holiday-home'
  if (v === 'yacht') return 'yacht'
  return 'hotel'
}

/** Fiyat dizesinden Offer — para birimi bilinmiyorsa TRY varsayılır */
function offerFromListing(
  pageUrl: string,
  listing: ListingDetailFields,
  fallbackSellerName: string,
): Record<string, unknown> | undefined {
  const cur = (listing.priceCurrency || 'TRY').trim().toUpperCase()
  let value: string | undefined
  if (typeof listing.priceAmount === 'number' && Number.isFinite(listing.priceAmount)) {
    value = String(listing.priceAmount)
  } else if (listing.price) {
    const digits = listing.price.replace(/[^\d.,]/g, '').replace(',', '.')
    const n = parseFloat(digits)
    if (!Number.isNaN(n)) value = String(Math.round(n * 100) / 100)
  }
  if (!value) return undefined

  return {
    '@type': 'Offer',
    url: pageUrl,
    priceCurrency: cur.length === 3 ? cur : 'TRY',
    price: value,
    availability: 'https://schema.org/InStock',
    seller: {
      '@type': 'Organization',
      name: listing.host?.displayName || fallbackSellerName,
    },
  }
}

function aggregateRating(listing: ListingDetailFields): Record<string, unknown> | undefined {
  const c = listing.reviewCount
  const r = listing.reviewStart
  if (typeof c !== 'number' || c < 1 || typeof r !== 'number') return undefined
  return {
    '@type': 'AggregateRating',
    ratingValue: Math.min(5, Math.max(1, r)),
    reviewCount: c,
    bestRating: 5,
    worstRating: 1,
  }
}

function geo(listing: ListingDetailFields): Record<string, unknown> | undefined {
  if (!listing.map?.lat || !listing.map?.lng) return undefined
  return {
    '@type': 'GeoCoordinates',
    latitude: listing.map.lat,
    longitude: listing.map.lng,
  }
}

function postalAddress(listing: ListingDetailFields): Record<string, unknown> | undefined {
  if (!listing.address?.trim()) return undefined
  const a: Record<string, unknown> = {
    '@type': 'PostalAddress',
    streetAddress: listing.address.trim(),
  }
  if (listing.city?.trim()) a.addressLocality = listing.city.trim()
  return a
}

function imagesForSchema(base: string, listing: ListingDetailFields): string[] {
  const raw = [listing.featuredImage, ...(listing.galleryImgs || [])].filter(Boolean) as string[]
  const uniq = [...new Set(raw)]
  return uniq
    .slice(0, 12)
    .map((u) => toAbsoluteSiteUrl(base, u) ?? u)
    .filter(Boolean)
}

function stayCategoryMeta(
  v: StayVertical,
  _locale: string,
): { path: string; nameTr: string; nameEn: string } {
  switch (v) {
    case 'holiday_home':
      return {
        path: '/tatil-evleri/all',
        nameTr: 'Tatil Evleri',
        nameEn: 'Holiday homes',
      }
    case 'yacht':
      return {
        path: '/yat-kiralama/all',
        nameTr: 'Yat Kiralama',
        nameEn: 'Yacht charter',
      }
    default:
      return {
        path: '/oteller/all',
        nameTr: 'Oteller',
        nameEn: 'Hotels',
      }
  }
}

function experienceCategoryMeta(
  v: ExperienceVertical,
  _locale: string,
): { path: string; nameTr: string; nameEn: string } {
  if (v === 'activity') {
    return {
      path: '/aktiviteler/all',
      nameTr: 'Aktiviteler',
      nameEn: 'Activities',
    }
  }
  return {
    path: '/turlar/all',
    nameTr: 'Turlar',
    nameEn: 'Tours',
  }
}

function schemaTypeForStay(v: StayVertical): string {
  if (v === 'holiday_home') return 'VacationRental'
  if (v === 'yacht') return 'Boat'
  return 'Hotel'
}

function schemaTypeForExperience(v: ExperienceVertical): string {
  return v === 'activity' ? 'TouristAttraction' : 'TouristTrip'
}

async function buildGraphBase(opts: {
  base: string
  locale: string
  pageUrl: string
  listing: ListingDetailFields
  organizationName: string
  /** Dahili uygulama yolu, ör. `/oteller/all` */
  breadcrumbCategoryPath: string
  breadcrumbCategoryName: string
  mainEntity: Record<string, unknown>
}): Promise<Record<string, unknown>> {
  const { base, locale, pageUrl, listing, organizationName, breadcrumbCategoryPath, breadcrumbCategoryName, mainEntity } =
    opts
  const listingId = `${pageUrl}#listing`
  const homePath = await vitrinHref(locale, '/')
  const homeUrl = `${base}${homePath === '' ? '/' : homePath}`
  const categoryUrl = `${base}${await vitrinHref(locale, breadcrumbCategoryPath)}`

  const title = listing.title
  const descRaw = listing.description ? stripHtml(listing.description) : ''
  const description = descRaw.slice(0, 5000)

  const images = imagesForSchema(base, listing)
  const homeLabel = locale.toLowerCase().startsWith('en') ? 'Home' : 'Ana Sayfa'

  const webPage: Record<string, unknown> = {
    '@type': 'WebPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: title,
    mainEntity: { '@id': listingId },
    isPartOf: {
      '@type': 'WebSite',
      name: organizationName,
      url: `${base}${homePath === '' ? '/' : homePath}`,
    },
    primaryImageOfPage:
      images[0] != null
        ? {
            '@type': 'ImageObject',
            url: images[0],
          }
        : undefined,
    description: description || undefined,
    breadcrumb: { '@id': `${pageUrl}#breadcrumb` },
  }
  if (!webPage.description) delete webPage.description
  if (!webPage.primaryImageOfPage) delete webPage.primaryImageOfPage

  const breadcrumb: Record<string, unknown> = {
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: homeLabel,
        item: homeUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: breadcrumbCategoryName,
        item: categoryUrl,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: title,
        item: pageUrl,
      },
    ],
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [webPage, breadcrumb, mainEntity],
  }
}

/** @id ve url ana varlıkta */
function withId(main: Record<string, unknown>, pageUrl: string): Record<string, unknown> {
  return {
    ...main,
    '@id': `${pageUrl}#listing`,
    url: pageUrl,
  }
}

export async function buildStayListingDetailJsonLd(opts: {
  locale: string
  listing: ListingDetailFields
  linkBase: string
  organizationName: string
}): Promise<Record<string, unknown> | null> {
  const base = getPublicSiteUrl()
  if (!base) return null

  const { locale, listing, linkBase, organizationName } = opts
  const vertical = resolveStayVertical(listing)
  const cat = stayCategoryMeta(vertical, locale)
  const categoryName = locale.toLowerCase().startsWith('en') ? cat.nameEn : cat.nameTr

  const itemPath = await vitrinHref(locale, `${linkBase}/${listing.handle}`)
  const pageUrl = `${base}${itemPath}`

  const images = imagesForSchema(base, listing)
  const offer = offerFromListing(pageUrl, listing, organizationName)
  const rating = aggregateRating(listing)
  const g = geo(listing)
  const addr = postalAddress(listing)

  const schemaType = schemaTypeForStay(vertical)
  const main: Record<string, unknown> = withId(
    {
      '@type': schemaType,
      name: listing.title,
      description: listing.description ? stripHtml(listing.description).slice(0, 5000) : undefined,
      image: images.length ? images : undefined,
    },
    pageUrl,
  )

  if (addr) main.address = addr
  if (g) main.geo = g
  if (rating) main.aggregateRating = rating
  if (offer) main.offers = offer

  if (schemaType === 'Hotel' && typeof listing.stars === 'number' && listing.stars > 0) {
    main.starRating = {
      '@type': 'Rating',
      ratingValue: Math.min(5, listing.stars),
    }
  }

  if (schemaType === 'VacationRental') {
    if (typeof listing.maxGuests === 'number') {
      main.occupancy = {
        '@type': 'QuantitativeValue',
        maxValue: listing.maxGuests,
      }
    }
    if (typeof listing.bedrooms === 'number') main.numberOfRooms = listing.bedrooms
  }

  if (schemaType === 'Boat') {
    main.name = listing.title
    if (typeof listing.maxGuests === 'number') {
      main.maximumAttendeeCapacity = listing.maxGuests
    }
  }

  if (listing.host?.displayName) {
    main.provider = {
      '@type': 'Organization',
      name: listing.host.displayName,
    }
  }

  // JSON-LD temizliği: undefined anahtarlar
  Object.keys(main).forEach((k) => {
    if (main[k] === undefined) delete main[k]
  })

  return await buildGraphBase({
    base,
    locale,
    pageUrl,
    listing,
    organizationName,
    breadcrumbCategoryPath: cat.path,
    breadcrumbCategoryName: categoryName,
    mainEntity: main,
  })
}

export async function buildExperienceListingDetailJsonLd(opts: {
  locale: string
  listing: ListingDetailFields & { durationTime?: string }
  linkBase: string
  organizationName: string
}): Promise<Record<string, unknown> | null> {
  const base = getPublicSiteUrl()
  if (!base) return null

  const { locale, listing, linkBase, organizationName } = opts
  const vertical = resolveExperienceVertical(listing)
  const cat = experienceCategoryMeta(vertical, locale)
  const categoryName = locale.toLowerCase().startsWith('en') ? cat.nameEn : cat.nameTr

  const itemPath = await vitrinHref(locale, `${linkBase}/${listing.handle}`)
  const pageUrl = `${base}${itemPath}`

  const images = imagesForSchema(base, listing)
  const offer = offerFromListing(pageUrl, listing, organizationName)
  const rating = aggregateRating(listing)
  const g = geo(listing)
  const addr = postalAddress(listing)

  const schemaType = schemaTypeForExperience(vertical)
  const main: Record<string, unknown> = withId(
    {
      '@type': schemaType,
      name: listing.title,
      description: listing.description ? stripHtml(listing.description).slice(0, 5000) : undefined,
      image: images.length ? images : undefined,
    },
    pageUrl,
  )

  if (addr) main.address = addr
  if (g) main.geo = g
  if (rating) main.aggregateRating = rating
  if (offer) main.offers = offer

  if (schemaType === 'TouristTrip' && listing.durationTime?.trim()) {
    main.duration = listing.durationTime.trim()
  }

  if (listing.host?.displayName) {
    main.provider = {
      '@type': 'Organization',
      name: listing.host.displayName,
    }
  }

  Object.keys(main).forEach((k) => {
    if (main[k] === undefined) delete main[k]
  })

  return await buildGraphBase({
    base,
    locale,
    pageUrl,
    listing,
    organizationName,
    breadcrumbCategoryPath: cat.path,
    breadcrumbCategoryName: categoryName,
    mainEntity: main,
  })
}

/** SEO / hata ayıklama: çıkarılan dikey (storybook / log) */
export function debugInferStayVertical(listingCategory: string | undefined): StayVertical {
  return inferStayVertical(listingCategory)
}

export function debugInferExperienceVertical(listingCategory: string | undefined): ExperienceVertical {
  return inferExperienceVertical(listingCategory)
}

export function debugListingTypeFromStayCategory(
  listing: Pick<ListingDetailFields, 'listingCategory' | 'listingVertical'>,
): ListingType {
  return listingTypeFromStay(resolveStayVertical(listing))
}

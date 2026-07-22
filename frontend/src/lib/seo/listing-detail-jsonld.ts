/**
 * İlan detay sayfaları için schema.org JSON-LD (@graph).
 * WebPage + BreadcrumbList + türe özel ana varlık (Hotel, VacationRental, Boat, TouristTrip, TouristAttraction)
 * + Offer, AggregateRating, GeoCoordinates — Google zengin sonuç / host carousel ile uyumlu.
 */

import type { ListingType } from '@/data/category-registry'
import type { CatalogListingVerticalCode } from '@/lib/catalog-listing-vertical'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { galleryUrlsForStayDetailHeader } from '@/lib/listing-gallery-hero-order'
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
  const coords = normalizeGeoCoords(listing.map?.lat, listing.map?.lng)
  if (!coords) return undefined
  return {
    '@type': 'GeoCoordinates',
    latitude: coords.lat,
    longitude: coords.lng,
  }
}

/** Google VacationRental: en az 5 ondalık hassasiyet. */
function normalizeGeoCoords(
  lat: number | string | null | undefined,
  lng: number | string | null | undefined,
): { lat: number; lng: number } | null {
  const la = typeof lat === 'number' ? lat : lat != null && String(lat).trim() !== '' ? Number(lat) : NaN
  const ln = typeof lng === 'number' ? lng : lng != null && String(lng).trim() !== '' ? Number(lng) : NaN
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null
  if (Math.abs(la) > 90 || Math.abs(ln) > 180) return null
  // 0,0 genelde “yok” placeholder’ı
  if (la === 0 && ln === 0) return null
  const round5 = (n: number) => Math.round(n * 1e5) / 1e5
  let outLat = round5(la)
  let outLng = round5(ln)
  // String'e çevirip 5 hane yoksa doldur (ör. 36.57 → 36.57000)
  const ensurePrecision = (n: number) => {
    const s = n.toFixed(5)
    return Number(s)
  }
  outLat = ensurePrecision(outLat)
  outLng = ensurePrecision(outLng)
  return { lat: outLat, lng: outLng }
}

function postalAddress(listing: ListingDetailFields): Record<string, unknown> | undefined {
  if (!listing.address?.trim() && !listing.city?.trim()) return undefined
  const a: Record<string, unknown> = {
    '@type': 'PostalAddress',
    addressCountry: 'TR',
  }
  if (listing.address?.trim()) a.streetAddress = listing.address.trim()
  if (listing.city?.trim()) a.addressLocality = listing.city.trim()
  return a
}

function imagesForSchema(base: string, listing: ListingDetailFields): string[] {
  const raw = galleryUrlsForStayDetailHeader(listing.featuredImage, listing.galleryImgs ?? []).filter(Boolean)
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

function experienceBrowseMetaForListing(listing: VerticalHints): {
  path: string
  nameTr: string
  nameEn: string
} {
  const v = normalizeCatalogVertical(listing.listingVertical ?? undefined)
  const table: Partial<
    Record<CatalogListingVerticalCode, { path: string; nameTr: string; nameEn: string }>
  > = {
    tour: { path: '/turlar/all', nameTr: 'Turlar', nameEn: 'Tours' },
    activity: { path: '/aktiviteler/all', nameTr: 'Aktiviteler', nameEn: 'Activities' },
    cruise: { path: '/kruvaziyer/all', nameTr: 'Kruvaziyer', nameEn: 'Cruises' },
    hajj: { path: '/hac-umre/all', nameTr: 'Hac & Umre', nameEn: 'Hajj & Umrah' },
    visa: { path: '/vize/all', nameTr: 'Vize Hizmetleri', nameEn: 'Visa services' },
    beach_lounger: { path: '/plaj-sezlong/all', nameTr: 'Plaj & Şezlong', nameEn: 'Beach loungers' },
    cinema_ticket: {
      path: '/sinema-biletleri/all',
      nameTr: 'Sinema Biletleri',
      nameEn: 'Cinema tickets',
    },
    event: { path: '/etkinlikler/all', nameTr: 'Etkinlikler', nameEn: 'Events' },
    restaurant_table: {
      path: '/restoran-rezervasyon/all',
      nameTr: 'Restoran Rezervasyonu',
      nameEn: 'Restaurant booking',
    },
  }
  if (v && table[v]) return table[v]!

  const inferred = resolveExperienceVertical(listing)
  return experienceCategoryMeta(inferred, 'tr')
}

function schemaOrgMainTypeForExperienceListing(listing: VerticalHints): string {
  const v = normalizeCatalogVertical(listing.listingVertical ?? undefined)
  if (v === 'cinema_ticket' || v === 'event') return 'Event'
  if (v === 'restaurant_table') return 'Restaurant'
  if (v === 'beach_lounger' || v === 'visa') return 'Product'
  const ev = resolveExperienceVertical(listing)
  return schemaTypeForExperience(ev)
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
  const coords = normalizeGeoCoords(listing.map?.lat, listing.map?.lng)
  const g = coords
    ? {
        '@type': 'GeoCoordinates',
        latitude: coords.lat,
        longitude: coords.lng,
      }
    : undefined
  const addr = postalAddress(listing)

  let schemaType = schemaTypeForStay(vertical)
  // Google “Kiralık yer” zengin sonucu VacationRental için geo zorunlu.
  // Koordinat yoksa geçersiz VacationRental üretme.
  if (schemaType === 'VacationRental' && !coords) {
    schemaType = 'LodgingBusiness'
  }

  const main: Record<string, unknown> = withId(
    {
      '@type': schemaType,
      name: listing.title,
      description: listing.description ? stripHtml(listing.description).slice(0, 5000) : undefined,
      image: images.length ? images : undefined,
    },
    pageUrl,
  )

  if (listing.id?.trim()) {
    main.identifier = listing.id.trim()
  }

  if (addr) main.address = addr
  if (g) {
    main.geo = g
    // Google docs: latitude/longitude top-level veya geo.* — ikisini de yaz.
    main.latitude = coords!.lat
    main.longitude = coords!.lng
  }
  if (rating) main.aggregateRating = rating
  if (offer) main.offers = offer

  if (schemaType === 'Hotel' && typeof listing.stars === 'number' && listing.stars > 0) {
    main.starRating = {
      '@type': 'Rating',
      ratingValue: Math.min(5, listing.stars),
    }
  }

  if (schemaType === 'VacationRental') {
    const occupancyValue =
      typeof listing.maxGuests === 'number' && listing.maxGuests > 0 ? listing.maxGuests : undefined
    if (occupancyValue != null) {
      main.occupancy = {
        '@type': 'QuantitativeValue',
        maxValue: occupancyValue,
      }
    }
    if (typeof listing.bedrooms === 'number' && listing.bedrooms > 0) {
      main.numberOfRooms = listing.bedrooms
      main.numberOfBedrooms = listing.bedrooms
    }
    if (typeof listing.bathrooms === 'number' && listing.bathrooms > 0) {
      main.numberOfBathroomsTotal = listing.bathrooms
    }
    // Zorunlu: containsPlace → Accommodation
    const accommodation: Record<string, unknown> = {
      '@type': 'Accommodation',
      name: listing.title,
    }
    if (occupancyValue != null) {
      accommodation.occupancy = {
        '@type': 'QuantitativeValue',
        value: occupancyValue,
      }
    }
    if (typeof listing.bedrooms === 'number' && listing.bedrooms > 0) {
      accommodation.numberOfBedrooms = listing.bedrooms
      accommodation.numberOfRooms = listing.bedrooms
    }
    if (typeof listing.bathrooms === 'number' && listing.bathrooms > 0) {
      accommodation.numberOfBathroomsTotal = listing.bathrooms
    }
    if (typeof listing.beds === 'number' && listing.beds > 0) {
      accommodation.numberOfBeds = listing.beds
    }
    main.containsPlace = accommodation
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
  const cat = experienceBrowseMetaForListing(listing)
  const categoryName = locale.toLowerCase().startsWith('en') ? cat.nameEn : cat.nameTr

  const itemPath = await vitrinHref(locale, `${linkBase}/${listing.handle}`)
  const pageUrl = `${base}${itemPath}`

  const images = imagesForSchema(base, listing)
  const offer = offerFromListing(pageUrl, listing, organizationName)
  const rating = aggregateRating(listing)
  const g = geo(listing)
  const addr = postalAddress(listing)

  let schemaType = schemaOrgMainTypeForExperienceListing(listing)
  // Google Product snippet: offers | review | aggregateRating zorunlu.
  if (schemaType === 'Product' && !offer && !rating) {
    schemaType = 'Service'
  }
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

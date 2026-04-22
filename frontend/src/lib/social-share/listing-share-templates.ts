/**
 * Sosyal medya / OG görseli için kategori (listing vertical) bazlı alan şablonları.
 * Villa örneği: oda, banyo, kişi, bölge + başlık.
 */

import type { CatalogListingVerticalCode } from '@/lib/catalog-listing-vertical'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'

export type ShareRow = { label: string; value: string }

const L = {
  tr: {
    bedrooms: 'Oda',
    bathrooms: 'Banyo',
    beds: 'Yatak',
    guests: 'Kişi',
    region: 'Bölge',
    price: 'Fiyat',
    stars: 'Yıldız',
    duration: 'Süre',
    cabins: 'Kabin',
    length: 'Boy (m)',
    capacity: 'Kapasite',
    category: 'Kategori',
  },
  en: {
    bedrooms: 'Bedrooms',
    bathrooms: 'Bathrooms',
    beds: 'Beds',
    guests: 'Guests',
    region: 'Location',
    price: 'Price',
    stars: 'Stars',
    duration: 'Duration',
    cabins: 'Cabins',
    length: 'Length (m)',
    capacity: 'Capacity',
    category: 'Category',
  },
}

function labels(locale: string) {
  return locale.toLowerCase().startsWith('en') ? L.en : L.tr
}

function regionFromListing(city?: string, address?: string): string | undefined {
  const c = city?.trim()
  if (c) return c
  const a = address?.trim()
  if (!a) return undefined
  const part = a.split(',')[0]?.trim()
  return part || undefined
}

export function inferCatalogVerticalForStayListing(listing: {
  listingVertical?: CatalogListingVerticalCode
  listingCategory?: string
}): CatalogListingVerticalCode {
  const n =
    normalizeCatalogVertical(listing.listingVertical) ??
    normalizeCatalogVertical(listing.listingCategory)
  if (n === 'hotel' || n === 'holiday_home' || n === 'yacht_charter') return n
  const s = (listing.listingCategory || '').toLowerCase()
  if (/yat|yacht|gulet|katamaran|tekne|boat|mavi/.test(s)) return 'yacht_charter'
  if (/villa|tatil|holiday|home|konak|müstakil|bungalov/.test(s)) return 'holiday_home'
  return 'hotel'
}

export function inferCatalogVerticalForExperienceListing(listing: {
  listingVertical?: CatalogListingVerticalCode
  listingCategory?: string
}): CatalogListingVerticalCode {
  const n =
    normalizeCatalogVertical(listing.listingVertical) ??
    normalizeCatalogVertical(listing.listingCategory)
  if (n === 'activity') return 'activity'
  if (n === 'tour' || n === 'cruise' || n === 'hajj') return 'tour'
  const s = (listing.listingCategory || '').toLowerCase()
  if (/aktivit|activity|workshop|class|dalış|spa|atölye/.test(s)) return 'activity'
  return 'tour'
}

type StayFields = {
  title: string
  listingVertical?: CatalogListingVerticalCode
  listingCategory?: string
  city?: string
  address?: string
  bedrooms?: number
  bathrooms?: number
  beds?: number
  maxGuests?: number
  price?: string
  stars?: number
  lengthM?: number
  capacity?: number
  cabins?: number
}

type ExperienceFields = {
  title: string
  listingVertical?: CatalogListingVerticalCode
  listingCategory?: string
  city?: string
  address?: string
  durationTime?: string
  maxGuests?: number
  price?: string
}

/** OG görseli alt bantta gösterilecek satırlar (başlık ayrı) */
export function buildStayListingShareRows(listing: StayFields, locale: string): ShareRow[] {
  const lb = labels(locale)
  const v = inferCatalogVerticalForStayListing(listing)
  const region = regionFromListing(listing.city, listing.address)
  const rows: ShareRow[] = []

  switch (v) {
    case 'holiday_home':
      if (listing.bedrooms != null) rows.push({ label: lb.bedrooms, value: String(listing.bedrooms) })
      if (listing.bathrooms != null) rows.push({ label: lb.bathrooms, value: String(listing.bathrooms) })
      if (listing.maxGuests != null) rows.push({ label: lb.guests, value: String(listing.maxGuests) })
      if (region) rows.push({ label: lb.region, value: region })
      break
    case 'yacht_charter':
      if (listing.lengthM != null) rows.push({ label: lb.length, value: String(listing.lengthM) })
      if (listing.capacity != null) rows.push({ label: lb.capacity, value: String(listing.capacity) })
      if (listing.cabins != null) rows.push({ label: lb.cabins, value: String(listing.cabins) })
      if (region) rows.push({ label: lb.region, value: region })
      break
    case 'hotel':
    default:
      if (listing.stars != null && listing.stars > 0) {
        rows.push({ label: lb.stars, value: String(listing.stars) })
      }
      if (listing.maxGuests != null) rows.push({ label: lb.guests, value: String(listing.maxGuests) })
      if (region) rows.push({ label: lb.region, value: region })
      break
  }

  if (listing.price?.trim()) {
    rows.push({ label: lb.price, value: listing.price.trim() })
  }

  return rows
}

export function buildExperienceListingShareRows(listing: ExperienceFields, locale: string): ShareRow[] {
  const lb = labels(locale)
  const v = inferCatalogVerticalForExperienceListing(listing)
  const region = regionFromListing(listing.city, listing.address)
  const rows: ShareRow[] = []

  if (listing.durationTime?.trim()) {
    rows.push({ label: lb.duration, value: listing.durationTime.trim() })
  }
  if (listing.maxGuests != null) {
    rows.push({ label: lb.guests, value: String(listing.maxGuests) })
  }
  if (region) {
    rows.push({ label: lb.region, value: region })
  }
  if (listing.listingCategory?.trim() && v === 'activity') {
    rows.push({ label: lb.category, value: listing.listingCategory.trim() })
  }
  if (listing.price?.trim()) {
    rows.push({ label: lb.price, value: listing.price.trim() })
  }

  return rows
}

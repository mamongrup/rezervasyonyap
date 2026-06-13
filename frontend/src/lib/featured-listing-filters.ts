import type { TListingBase } from '@/types/listing-types'

/** Alt / üst fiyat dilimleri — kategori havuzuna göre otomatik */
export const PRICE_SEGMENT_RATIO = 0.35

export function effectiveListingPrice(listing: TListingBase): number | null {
  if (listing.priceAmount != null && listing.priceAmount > 0) return listing.priceAmount
  const raw = listing.price?.replace(/[^\d.,]/g, '').replace(',', '.') ?? ''
  const n = parseFloat(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

function pricedListings(listings: TListingBase[]): Array<{ listing: TListingBase; price: number }> {
  const out: Array<{ listing: TListingBase; price: number }> = []
  for (const listing of listings) {
    const price = effectiveListingPrice(listing)
    if (price != null) out.push({ listing, price })
  }
  out.sort((a, b) => a.price - b.price)
  return out
}

function segmentCount(total: number): number {
  if (total <= 1) return total
  return Math.max(1, Math.ceil(total * PRICE_SEGMENT_RATIO))
}

/** Kategori havuzundan alt / üst fiyat dilimlerini hesaplar */
export function analyzePriceSegments(listings: TListingBase[]): {
  economic: TListingBase[]
  luxury: TListingBase[]
} {
  const priced = pricedListings(listings)
  const n = priced.length
  if (n === 0) return { economic: [], luxury: [] }

  const seg = segmentCount(n)
  if (seg * 2 >= n) {
    const mid = Math.ceil(n / 2)
    return {
      economic: priced.slice(0, mid).map((row) => row.listing),
      luxury: priced
        .slice(mid)
        .map((row) => row.listing)
        .reverse(),
    }
  }

  return {
    economic: priced.slice(0, seg).map((row) => row.listing),
    luxury: priced
      .slice(n - seg)
      .map((row) => row.listing)
      .reverse(),
  }
}

export function filterEconomicListings(listings: TListingBase[]): TListingBase[] {
  return analyzePriceSegments(listings).economic
}

export function filterLuxuryListings(listings: TListingBase[]): TListingBase[] {
  return analyzePriceSegments(listings).luxury
}

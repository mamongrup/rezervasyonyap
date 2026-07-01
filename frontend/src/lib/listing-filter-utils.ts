import type { TListingBase } from '@/types/listing-types'

export type ListingFilterMode = 'all' | 'new' | 'discounted' | 'campaign'

export const LISTING_FILTER_MODES: ListingFilterMode[] = ['all', 'new', 'discounted', 'campaign']

export function listingMatchesFilter(listing: TListingBase, mode: ListingFilterMode): boolean {
  switch (mode) {
    case 'all':
      return true
    case 'new':
      if (listing.isNew) return true
      if (listing.createdAt) {
        const days = (Date.now() - new Date(listing.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        return days <= 30
      }
      return false
    case 'discounted':
      return Boolean(listing.saleOff) || (listing.discountPercent ?? 0) > 0
    case 'campaign':
      return Boolean(listing.isCampaign) || Boolean(listing.instantBook)
  }
}

export function countListingsForFilterMode(
  allListings: TListingBase[],
  mode: ListingFilterMode,
): number {
  return allListings.filter((listing) => listingMatchesFilter(listing, mode)).length
}

export function hasAnyTabListings(allListings: TListingBase[]): boolean {
  return LISTING_FILTER_MODES.some((mode) =>
    allListings.some((listing) => listingMatchesFilter(listing, mode)),
  )
}

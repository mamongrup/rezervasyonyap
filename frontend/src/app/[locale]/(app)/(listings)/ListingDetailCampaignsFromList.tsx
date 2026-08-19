'use client'

import {
  type ListingDetailCampaignItem,
} from '@/lib/listing-detail-campaigns'
import type { ListingAvailabilityDay } from '@/lib/travel-api'
import type { StayPriceDiscountModel } from '@/lib/listing-price-rules-public'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import ListingDetailCampaignsSection from './ListingDetailCampaignsSection'

/** Villa / otel ile aynı — genel (taksit) + ilana özel indirim kampanyaları. */
export default function ListingDetailCampaignsFromList({
  locale,
  campaigns,
  availabilityDays = [],
  stayDiscounts = [],
}: {
  locale: string
  campaigns: ListingDetailCampaignItem[]
  availabilityDays?: ListingAvailabilityDay[]
  stayDiscounts?: StayPriceDiscountModel[]
}) {
  const dc = getMessages(locale).listing.detailCampaigns

  return (
    <ListingDetailCampaignsSection
      locale={locale}
      campaigns={campaigns}
      availabilityDays={availabilityDays}
      stayDiscounts={stayDiscounts}
      title={dc?.title ?? 'Kampanyalar'}
      labels={{
        installmentSubtitle: (count) =>
          interpolate(
            dc?.installmentSubtitle ?? 'Tüm kredi kartlarına vade farksız {count} taksit imkânı.',
            { count: String(count) },
          ),
        discountBadge: (percent) =>
          interpolate(dc?.discountBadge ?? '%{percent} indirim', { percent }),
        validUntil: (date) =>
          interpolate(dc?.validUntil ?? '{date} tarihine kadar geçerlidir.', { date }),
        nearbyAvailabilityTitle: dc?.nearbyAvailabilityTitle ?? 'Yakın tarihte müsait',
        nearbyAvailabilitySubtitle: (date) =>
          interpolate(dc?.nearbyAvailabilitySubtitle ?? '{date} için rezervasyona uygun.', { date }),
        seasonalDiscountTitle: dc?.seasonalDiscountTitle ?? 'Tarih aralığına özel indirim',
        seasonalDiscountPeriod: (from, to) =>
          interpolate(dc?.seasonalDiscountPeriod ?? '{from} – {to}', { from, to }),
        seasonalDiscountPrice: (regular, discounted) =>
          interpolate(dc?.seasonalDiscountPrice ?? '{regular} yerine {discounted} / gece', {
            regular,
            discounted,
          }),
      }}
    />
  )
}

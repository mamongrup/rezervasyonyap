import {
  type ListingDetailCampaignItem,
} from '@/lib/listing-detail-campaigns'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import ListingDetailCampaignsSection from './ListingDetailCampaignsSection'

/** Villa / otel ile aynı — genel (taksit) + ilana özel indirim kampanyaları. */
export default function ListingDetailCampaignsFromList({
  locale,
  campaigns,
}: {
  locale: string
  campaigns: ListingDetailCampaignItem[]
}) {
  if (campaigns.length === 0) return null

  const dc = getMessages(locale).listing.detailCampaigns

  return (
    <ListingDetailCampaignsSection
      locale={locale}
      campaigns={campaigns}
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
      }}
    />
  )
}

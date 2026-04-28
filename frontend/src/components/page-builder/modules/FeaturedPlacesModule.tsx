import SectionGridFeaturePlaces from '@/components/SectionGridFeaturePlaces'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { fetchCategoryListings } from '@/lib/listings-fetcher'
import type { TListingBase } from '@/types/listing-types'
import { getMessages } from '@/utils/getT'

interface Config {
  heading?: string
  subHeading?: string
  cardType?: string
  viewAllHref?: string
}

export default async function FeaturedPlacesModule({ config, locale = 'tr' }: { config: Config; locale?: string }) {
  const apiResult = await fetchCategoryListings('oteller', {}, {}, locale)
  const raw = apiResult.listings
  const listings: TListingBase[] = raw.map((l) => ({
    ...l,
    listingVertical: normalizeCatalogVertical(l.listingVertical),
  }))

  const t = getMessages(locale)
  const tabs = [t.site.featured.tabNew, t.site.featured.tabDiscounted, t.site.featured.tabFeatured]

  return (
    <SectionGridFeaturePlaces
      stayListings={listings}
      cardType={(config.cardType as 'card1' | 'card2') ?? 'card2'}
      heading={config.heading ?? t.site.featured.heading}
      subHeading={config.subHeading ?? ''}
      tabs={tabs}
      tabActive={tabs[0] ?? ''}
      rightButtonHref={config.viewAllHref ?? '/oteller/all'}
    />
  )
}

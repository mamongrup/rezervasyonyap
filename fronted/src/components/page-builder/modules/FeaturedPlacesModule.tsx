import SectionGridFeaturePlaces from '@/components/SectionGridFeaturePlaces'
import { getStayListings } from '@/data/listings'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { fetchCategoryListings } from '@/lib/listings-fetcher'
import type { TListingBase } from '@/types/listing-types'

interface Config {
  heading?: string
  subHeading?: string
  cardType?: string
  viewAllHref?: string
}

export default async function FeaturedPlacesModule({ config, locale = 'tr' }: { config: Config; locale?: string }) {
  const [stayListings, apiResult] = await Promise.all([
    getStayListings(),
    fetchCategoryListings('oteller', {}, {}),
  ])

  const raw =
    apiResult.fromApi && apiResult.listings.length > 0 ? apiResult.listings : stayListings
  const listings: TListingBase[] = raw.map((l) => ({
    ...l,
    listingVertical: normalizeCatalogVertical(l.listingVertical),
  }))

  const tabs = locale === 'en'
    ? ['New', 'Discounted', 'Featured']
    : ['Yeni', 'İndirimli', 'Öne Çıkan']

  return (
    <SectionGridFeaturePlaces
      stayListings={listings}
      cardType={(config.cardType as 'card1' | 'card2') ?? 'card2'}
      heading={config.heading ?? (locale === 'en' ? 'Featured Places' : 'Öne Çıkan İlanlar')}
      subHeading={config.subHeading ?? ''}
      tabs={tabs}
      tabActive={tabs[0] ?? ''}
      rightButtonHref={config.viewAllHref ?? '/oteller/all'}
    />
  )
}

import PageBuilderRenderer from '@/components/page-builder/PageBuilderRenderer'
import { getAuthors } from '@/data/authors'
import { CATEGORY_REGISTRY } from '@/data/category-registry'
import { getFeaturedRegionConfig } from '@/data/page-builder-config'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { slimListingForVitrinCard } from '@/lib/featured-listings-utils'
import { fetchCategoryListings } from '@/lib/listings-fetcher'
import type { PageBuilderModule, TListingBase } from '@/types/listing-types'
import type { ReactNode } from 'react'

const HOME_CATEGORY = CATEGORY_REGISTRY.find((c) => c.slug === 'oteller')!

function modulesNeedAllListings(modules: PageBuilderModule[]): boolean {
  return modules.some(
    (m) =>
      m.enabled &&
      (m.type === 'featured_by_region' ||
        m.type === 'listings_grid' ||
        m.type === 'listings_slider'),
  )
}

/** Hero’dan sonra stream edilen ağır page-builder (featured_places vb.). */
export default async function HomePageBuilderSection({
  locale,
  modules,
  searchFormNode,
  listingLinkBase = '/otel',
  priceUnit = '/gece',
}: {
  locale: string
  modules: PageBuilderModule[]
  searchFormNode: ReactNode
  listingLinkBase?: string
  priceUnit?: string
}) {
  const needsListings = modulesNeedAllListings(modules)

  const [apiListingsResult, authors, savedRegionConfig] = await Promise.all([
    needsListings
      ? fetchCategoryListings('oteller', {}, { perPage: 36 }, locale)
      : Promise.resolve({ listings: [] as TListingBase[], total: 0 }),
    getAuthors(),
    getFeaturedRegionConfig('homepage'),
  ])

  const featuredListings: TListingBase[] = (
    apiListingsResult.listings.length > 0 ? apiListingsResult.listings : []
  ).map((l) =>
    slimListingForVitrinCard({
      ...l,
      listingVertical: normalizeCatalogVertical(l.listingVertical),
    }),
  )

  const modulesWithRegion = modules.map((mod) => {
    if (mod.type === 'featured_by_region' && savedRegionConfig) {
      return { ...mod, config: { ...((mod.config as object) ?? {}), ...savedRegionConfig } }
    }
    return mod
  })

  return (
    <PageBuilderRenderer
      rootAs="section"
      modules={modulesWithRegion.filter((m) => m.type !== 'hero')}
      category={HOME_CATEGORY}
      locale={locale}
      searchFormNode={searchFormNode}
      allListings={featuredListings}
      listingLinkBase={listingLinkBase}
      priceUnit={priceUnit}
      authors={authors}
      pageKey="homepage"
    />
  )
}

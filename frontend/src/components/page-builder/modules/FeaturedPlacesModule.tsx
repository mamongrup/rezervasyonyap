import SectionGridFeaturePlaces from '@/components/SectionGridFeaturePlaces'
import { getCategoryBySlug } from '@/data/category-registry'
import { resolveCategoryDisplay } from '@/lib/localized-category'
import { getFeaturedListingsConfig } from '@/lib/featured-listings-config'
import {
  categorySupportsLuxuryEconomicTabs,
  categorySupportsLastMinuteTab,
  DEFAULT_FEATURED_DISPLAY_COUNT,
  loadFeaturedPlacesListingPool,
  normalizeFeaturedListingsConfig,
  pruneFeaturedPlacesForClient,
  type FeaturedTabDef,
} from '@/lib/featured-listings-utils'
import { fetchCategoryListings } from '@/lib/listings-fetcher'
import {
  buildLastMinuteViewAllHref,
  resolveLastMinuteDateWindow,
} from '@/lib/last-minute-availability'
import type { TListingBase } from '@/types/listing-types'
import { getMessages, type AppMessages } from '@/utils/getT'

type FeaturedCategoryKey = keyof NonNullable<AppMessages['homePage']['featuredByCategory']>

export interface FeaturedPlacesModuleConfig {
  heading?: string
  subHeading?: string
  cardType?: string
  viewAllHref?: string
  /** Hangi kategoriden ilan çekilecek — varsayılan 'oteller' */
  categorySlug?: string
}

export type FeaturedPlacesModuleData = {
  listings: TListingBase[]
  lastMinuteListings: TListingBase[]
  lastMinuteViewAllHref?: string
  heading: string
  subHeading: string
  viewAllHref: string
  tabDefs: FeaturedTabDef[]
  tabIds: ReturnType<typeof pruneFeaturedPlacesForClient>['tabIds']
  displayCount: number
  categorySlug: string
}

function buildFeaturedTabDefs(
  categorySlug: string,
  t: AppMessages,
): FeaturedTabDef[] {
  const f = t.site.featured
  const tabs: FeaturedTabDef[] = [
    { label: f.tabRecommended, kind: 'recommended' },
  ]
  if (categorySupportsLastMinuteTab(categorySlug)) {
    tabs.push({ label: f.tabLastMinute, kind: 'lastMinute' })
  }
  tabs.push(
    { label: f.tabNew, kind: 'new' },
    { label: f.tabDiscounted, kind: 'discounted' },
  )
  if (categorySupportsLuxuryEconomicTabs(categorySlug)) {
    const luxuryLabel = categorySlug === 'oteller' ? f.tabLuxuryHotel : f.tabLuxury
    const economicLabel = categorySlug === 'oteller' ? f.tabEconomicHotel : f.tabEconomic
    tabs.push(
      { label: luxuryLabel, kind: 'luxury' },
      { label: economicLabel, kind: 'economic' },
    )
  }
  return tabs
}

export async function loadFeaturedPlacesModuleData(
  categorySlug: string,
  locale = 'tr',
): Promise<FeaturedPlacesModuleData | null> {
  const featuredConfig = await getFeaturedListingsConfig(categorySlug)
  const tabIds = featuredConfig?.tabs ?? normalizeFeaturedListingsConfig(null, categorySlug).tabs
  const displayCount = featuredConfig?.displayCount ?? DEFAULT_FEATURED_DISPLAY_COUNT

  const lastMinutePromise = categorySupportsLastMinuteTab(categorySlug)
    ? Promise.all([
        resolveLastMinuteDateWindow(),
        fetchCategoryListings(
          categorySlug,
          { last_minute: '1' },
          { perPage: Math.max(displayCount, 48) },
          locale,
        ),
      ])
    : Promise.resolve(null)

  const [listings, lastMinutePack] = await Promise.all([
    loadFeaturedPlacesListingPool(categorySlug, tabIds, locale),
    lastMinutePromise,
  ])

  const lastMinuteListingsRaw = lastMinutePack?.[1].listings ?? []
  const lastMinuteViewAllHref =
    lastMinutePack != null
      ? buildLastMinuteViewAllHref(categorySlug, lastMinutePack[0])
      : undefined

  if (listings.length === 0 && lastMinuteListingsRaw.length === 0) return null

  const t = getMessages(locale)
  const categoryFeatured = t.homePage.featuredByCategory?.[categorySlug as FeaturedCategoryKey]

  let heading = categoryFeatured?.heading
  if (!heading) {
    const raw = getCategoryBySlug(categorySlug)
    const resolved = raw ? resolveCategoryDisplay(raw, locale) : null
    heading = resolved?.name ?? t.site.featured.heading
  }

  const subHeading = categoryFeatured?.subHeading ?? ''
  const viewAllHref = `/${categorySlug}/all`
  const tabDefs = buildFeaturedTabDefs(categorySlug, t)

  // Tam havuz sunucuda kalır; RSC'ye yalnızca sekme başına gösterilecek kartlar gider.
  const pruned = pruneFeaturedPlacesForClient({
    listings,
    tabDefs,
    tabIds,
    displayCount,
    lastMinuteListings: lastMinuteListingsRaw,
  })

  return {
    listings: pruned.listings,
    lastMinuteListings: pruned.lastMinuteListings,
    lastMinuteViewAllHref,
    heading,
    subHeading,
    viewAllHref,
    tabDefs,
    tabIds: pruned.tabIds,
    displayCount,
    categorySlug,
  }
}

export default async function FeaturedPlacesModule({
  config,
  locale = 'tr',
}: {
  config: FeaturedPlacesModuleConfig
  locale?: string
}) {
  const categorySlug = config.categorySlug ?? 'oteller'
  const data = await loadFeaturedPlacesModuleData(categorySlug, locale)
  if (!data) return null

  return (
    <SectionGridFeaturePlaces
      stayListings={data.listings}
      cardType={(config.cardType as 'card1' | 'card2') ?? 'card2'}
      heading={config.heading ?? data.heading}
      subHeading={config.subHeading ?? data.subHeading}
      tabDefs={data.tabDefs}
      tabListingIds={data.tabIds}
      lastMinuteListings={data.lastMinuteListings}
      lastMinuteViewAllHref={data.lastMinuteViewAllHref}
      categorySlug={data.categorySlug}
      maxCount={data.displayCount}
      rightButtonHref={config.viewAllHref ?? data.viewAllHref}
    />
  )
}

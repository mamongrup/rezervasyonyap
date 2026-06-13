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

export default async function FeaturedPlacesModule({
  config,
  locale = 'tr',
}: {
  config: FeaturedPlacesModuleConfig
  locale?: string
}) {
  const categorySlug = config.categorySlug ?? 'oteller'
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

  const lastMinuteListings = lastMinutePack?.[1].listings ?? []
  const lastMinuteViewAllHref =
    lastMinutePack != null
      ? buildLastMinuteViewAllHref(categorySlug, lastMinutePack[0])
      : undefined

  if (listings.length === 0 && lastMinuteListings.length === 0) return null

  const t = getMessages(locale)
  const categoryFeatured = t.homePage.featuredByCategory?.[categorySlug as FeaturedCategoryKey]

  let heading = config.heading ?? categoryFeatured?.heading
  if (!heading) {
    const raw = getCategoryBySlug(categorySlug)
    const resolved = raw ? resolveCategoryDisplay(raw, locale) : null
    heading = resolved?.name ?? t.site.featured.heading
  }

  const subHeading = config.subHeading ?? categoryFeatured?.subHeading ?? ''
  const viewAllHref = config.viewAllHref ?? `/${categorySlug}/all`
  const tabDefs = buildFeaturedTabDefs(categorySlug, t)

  return (
    <SectionGridFeaturePlaces
      stayListings={listings}
      cardType={(config.cardType as 'card1' | 'card2') ?? 'card2'}
      heading={heading}
      subHeading={subHeading}
      tabDefs={tabDefs}
      tabListingIds={tabIds}
      lastMinuteListings={lastMinuteListings}
      lastMinuteViewAllHref={lastMinuteViewAllHref}
      categorySlug={categorySlug}
      maxCount={displayCount}
      rightButtonHref={viewAllHref}
    />
  )
}

import SectionGridFeaturePlaces from '@/components/SectionGridFeaturePlaces'
import { getCategoryBySlug } from '@/data/category-registry'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { resolveCategoryDisplay } from '@/lib/localized-category'
import { getFeaturedListingsConfig } from '@/lib/featured-listings-config'
import { applyFeaturedListingOrder, DEFAULT_FEATURED_DISPLAY_COUNT } from '@/lib/featured-listings-utils'
import { fetchCategoryListings } from '@/lib/listings-fetcher'
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

export default async function FeaturedPlacesModule({ config, locale = 'tr' }: { config: FeaturedPlacesModuleConfig; locale?: string }) {
  const categorySlug = config.categorySlug ?? 'oteller'
  const [apiResult, featuredConfig] = await Promise.all([
    fetchCategoryListings(categorySlug, {}, {}, locale),
    getFeaturedListingsConfig(categorySlug),
  ])
  const raw = apiResult.listings
  const featuredIds = featuredConfig?.listingIds ?? []
  const displayCount = featuredConfig?.displayCount ?? DEFAULT_FEATURED_DISPLAY_COUNT
  const listings: TListingBase[] = applyFeaturedListingOrder(
    raw.map((l) => ({
      ...l,
      listingVertical: normalizeCatalogVertical(l.listingVertical),
    })),
    featuredIds,
  )

  // İlan yoksa modülü gizle
  if (listings.length === 0) return null

  const t = getMessages(locale)
  const categoryFeatured = t.homePage.featuredByCategory?.[categorySlug as FeaturedCategoryKey]

  // Başlık: config → i18n kategori vitrini → kategori adı → fallback
  let heading = config.heading ?? categoryFeatured?.heading
  if (!heading) {
    const raw = getCategoryBySlug(categorySlug)
    const resolved = raw ? resolveCategoryDisplay(raw, locale) : null
    heading = resolved?.name ?? t.site.featured.heading
  }

  const subHeading = config.subHeading ?? categoryFeatured?.subHeading ?? ''

  // "Tümünü gör" bağlantısı
  const viewAllHref = config.viewAllHref ?? `/${categorySlug}/all`

  const tabs = [
    t.site.featured.tabRecommended,
    t.site.featured.tabNew,
    t.site.featured.tabDiscounted,
    t.site.featured.tabFeatured,
  ]

  return (
    <SectionGridFeaturePlaces
      stayListings={listings}
      cardType={(config.cardType as 'card1' | 'card2') ?? 'card2'}
      heading={heading}
      subHeading={subHeading}
      tabs={tabs}
      tabActive={tabs[0] ?? ''}
      featuredListingIds={featuredIds}
      maxCount={displayCount}
      rightButtonHref={viewAllHref}
    />
  )
}

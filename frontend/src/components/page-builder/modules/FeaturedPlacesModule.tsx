import SectionGridFeaturePlaces from '@/components/SectionGridFeaturePlaces'
import { getCategoryBySlug } from '@/data/category-registry'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { resolveCategoryDisplay } from '@/lib/localized-category'
import { fetchCategoryListings } from '@/lib/listings-fetcher'
import type { TListingBase } from '@/types/listing-types'
import { getMessages } from '@/utils/getT'

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
  const apiResult = await fetchCategoryListings(categorySlug, {}, {}, locale)
  const raw = apiResult.listings
  const listings: TListingBase[] = raw.map((l) => ({
    ...l,
    listingVertical: normalizeCatalogVertical(l.listingVertical),
  }))

  // İlan yoksa modülü gizle
  if (listings.length === 0) return null

  const t = getMessages(locale)

  // Başlık: config'den → kategori adı → fallback
  let heading = config.heading
  if (!heading) {
    const raw = getCategoryBySlug(categorySlug)
    const resolved = raw ? resolveCategoryDisplay(raw, locale) : null
    heading = resolved?.name ?? t.site.featured.heading
  }

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
      subHeading={config.subHeading ?? ''}
      tabs={tabs}
      tabActive={tabs[0] ?? ''}
      rightButtonHref={viewAllHref}
    />
  )
}

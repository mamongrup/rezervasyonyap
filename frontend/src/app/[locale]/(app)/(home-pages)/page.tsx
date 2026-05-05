import BgGlassmorphism from '@/components/BgGlassmorphism'
import { HeroLastSearchRow } from '@/components/HeroLastSearchRow'
import HeroSectionWithSearchForm1 from '@/components/hero-sections/HeroSectionWithSearchForm1'
import { heroContainerBelowHeaderClassName } from '@/components/hero-sections/hero-below-header-classes'
import PageBuilderRenderer from '@/components/page-builder/PageBuilderRenderer'
import { getAuthors } from '@/data/authors'
import { CATEGORY_REGISTRY } from '@/data/category-registry'
import { getFeaturedRegionConfig } from '@/data/page-builder-config'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { fetchCategoryListings } from '@/lib/listings-fetcher'
import { loadHomepageHeroPack } from '@/lib/homepage-hero-pack'
import { DEFAULT_REGION_HERO_FREEFORM } from '@/lib/region-hero-freeform-defaults'
import { vitrinHref } from '@/lib/vitrin-href'
import { getMessages } from '@/utils/getT'
import { Metadata } from 'next'
import type { TListingBase } from '@/types/listing-types'
import { preload } from 'react-dom'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const m = getMessages(locale)
  return {
    title: m.homePage.meta.title,
    description: m.homePage.meta.description,
  }
}

// ISR: beasties (optimizeCss) static HTML'i inline CSS'e dönüştürsün diye ISR gerekli.
// Gerçek revalidate, searchPublicListings'teki 60 sn ile sınırlanır.
export const revalidate = 3600

// Anasayfa için sahte bir "category" — PageBuilderRenderer bağlamı için
const HOME_CATEGORY = CATEGORY_REGISTRY.find((c) => c.slug === 'oteller')!

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const m = getMessages(locale)

  const heroPack = await loadHomepageHeroPack(locale, m)

  /** Freeform’daki gerçek LCP URL’si dizinin ilk elemanı olmayabilir — önce onu preload et. */
  if (heroPack.lcpHeroUrl) {
    preload(heroPack.lcpHeroUrl, {
      as: 'image',
      fetchPriority: 'high',
    })
  }

  const [apiListingsResult, authors, savedRegionConfig] = await Promise.all([
    fetchCategoryListings('oteller', {}, {}, locale),
    getAuthors(),
    getFeaturedRegionConfig('homepage'),
  ])

  const featuredListings: TListingBase[] = (apiListingsResult.listings.length > 0
    ? apiListingsResult.listings
    : []
  ).map((l) => ({
    ...l,
    listingVertical: normalizeCatalogVertical(l.listingVertical),
  }))

  const modules = heroPack.modules

  // featured_by_region modülü varsa savedRegionConfig ile override et
  const modulesWithRegion = modules.map((mod) => {
    if (mod.type === 'featured_by_region' && savedRegionConfig) {
      return { ...mod, config: { ...((mod.config as object) ?? {}), ...savedRegionConfig } }
    }
    return mod
  })

  const searchForm = heroPack.searchForm

  return (
    <main className="relative isolate min-w-0 overflow-x-hidden">
      <BgGlassmorphism />

      {/* Hero — PageBuilderRenderer dışında, tam genişlik — z-10: arkada gövde zemini arkasında kalmayı önler (prod stacking) */}
      <div
        className={`relative z-10 container mb-6 min-w-0 overflow-x-clip ${heroContainerBelowHeaderClassName}`}
      >
        <HeroSectionWithSearchForm1
          heading={heroPack.heroHeadingLinked}
          image={heroPack.heroImage}
          imageAlt={heroPack.imageAlt}
          freeformBannerLayout={DEFAULT_REGION_HERO_FREEFORM}
          mosaicImages={heroPack.mosaicForRegionHero}
          searchForm={searchForm}
          description={heroPack.heroDescription}
          topSpacing="minimal"
          heroMosaicBleed
        />
      </div>

      <div className="overflow-x-hidden">
        {/* Son aramalar */}
        <div className="container mb-10 flex justify-center px-4 sm:px-0">
          <HeroLastSearchRow locale={locale} />
        </div>

        <PageBuilderRenderer
          rootAs="section"
          rootStyle={{
            contentVisibility: 'auto',
            containIntrinsicSize: '1px 2200px',
          }}
          modules={modulesWithRegion.filter((mod) => mod.type !== 'hero')}
          category={HOME_CATEGORY}
          locale={locale}
          searchFormNode={searchForm}
          allListings={featuredListings}
          listingLinkBase="/otel"
          priceUnit="/gece"
          authors={authors}
          pageKey="homepage"
        />
      </div>
    </main>
  )
}

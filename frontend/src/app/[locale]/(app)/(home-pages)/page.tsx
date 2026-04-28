import BgGlassmorphism from '@/components/BgGlassmorphism'
import { HeroLastSearchRow } from '@/components/HeroLastSearchRow'
import {
  heroHeadingLinkClassName,
  heroSubheadingLinkClassName,
} from '@/components/hero-sections/hero-link-classes'
import HeroSectionWithSearchForm1 from '@/components/hero-sections/HeroSectionWithSearchForm1'
import { heroContainerBelowHeaderClassName } from '@/components/hero-sections/hero-below-header-classes'
import HeroSearchDesktopOnly from '@/components/HeroSearchForm/HeroSearchDesktopOnly'
import HeroSearchForm from '@/components/HeroSearchForm/HeroSearchFormLazy'
import PageBuilderRenderer from '@/components/page-builder/PageBuilderRenderer'
import { getAuthors } from '@/data/authors'
import { CATEGORY_REGISTRY } from '@/data/category-registry'
import { getFeaturedRegionConfig, getHomepageConfig } from '@/data/page-builder-config'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { fetchCategoryListings } from '@/lib/listings-fetcher'
import { getHomepageDefaultModules } from '@/lib/page-builder-default-modules'
import { resolveHeroLcpImageUrl } from '@/lib/hero-lcp-url'
import { DEFAULT_REGION_HERO_FREEFORM } from '@/lib/region-hero-freeform-defaults'
import { sanitizeHeroInlineHtml } from '@/lib/sanitize-cms-html'
import { getPublicNavigationOrganizationId } from '@/lib/nav-public-org-id'
import { fetchPublicNavMenuItems } from '@/lib/travel-api'
import { vitrinHref } from '@/lib/vitrin-href'
import heroRightStay from '@/images/hero-right.avif'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Link from 'next/link'
import { preload } from 'react-dom'
import { getMessages } from '@/utils/getT'
import { Metadata } from 'next'
import type { PageBuilderModule, TListingBase } from '@/types/listing-types'

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

  /**
   * LCP: `preload()` daha önce tüm `Promise.all` bittiğinde çalışıyordu → kaynak yükleme gecikmesi ~hundreds ms.
   * Önce yalnızca hero URL’leri için config alıp preload’ı işaretliyoruz; vitrin/API ile paralel değil, **önce** keşif.
   */
  const homepageConfig = await getHomepageConfig()

  const defaultModules = getHomepageDefaultModules(m)
  const savedModules = homepageConfig?.modules
  const rawModules: Omit<PageBuilderModule, 'id'>[] = savedModules?.length ? savedModules : defaultModules
  const modules: PageBuilderModule[] = rawModules.map((mod, i) => ({
    ...mod,
    id: (mod as PageBuilderModule).id ?? `home-module-${i}`,
  }))

  const defaultHeroSrc =
    typeof heroRightStay.src === 'string' ? heroRightStay.src : String(heroRightStay.src)

  const heroModuleImages = (() => {
    const hero = modules.find((mod) => mod.type === 'hero' && mod.enabled)
    const imgs = (hero?.config as Record<string, unknown> | undefined)?.images as string[] | undefined
    if (!Array.isArray(imgs)) return undefined
    const a = (imgs[0] ?? '').trim()
    const b = (imgs[1] ?? '').trim()
    const c = (imgs[2] ?? '').trim()
    if (!a && !b && !c) return undefined
    return [a, b, c] as [string, string, string]
  })()

  const topLevelImages = homepageConfig?.heroImages
  const mosaicFromFile = (() => {
    if (!topLevelImages) return undefined
    const a = (topLevelImages[0] ?? '').trim()
    const b = (topLevelImages[1] ?? '').trim()
    const c = (topLevelImages[2] ?? '').trim()
    if (!a && !b && !c) return undefined
    return [a, b, c] as [string, string, string]
  })()

  const mosaicRaw = mosaicFromFile ?? heroModuleImages
  const mosaicGrid: [string, string, string] = mosaicRaw
    ? [
        mosaicRaw[0] || defaultHeroSrc,
        mosaicRaw[1] || defaultHeroSrc,
        mosaicRaw[2] || defaultHeroSrc,
      ]
    : [defaultHeroSrc, defaultHeroSrc, defaultHeroSrc]
  const mosaicForRegionHero: [string, string, string] = [
    mosaicGrid[2],
    mosaicGrid[0],
    mosaicGrid[1],
  ]

  const heroPreloadUrls = Array.from(
    new Set(mosaicForRegionHero.filter((u) => typeof u === 'string' && u.trim() !== '')),
  )
  /** Freeform’daki gerçek LCP URL’si dizinin ilk elemanı olmayabilir — önce onu preload et. */
  const lcpHeroUrl = resolveHeroLcpImageUrl(DEFAULT_REGION_HERO_FREEFORM, mosaicForRegionHero)
  const orderedPreload = lcpHeroUrl
    ? [lcpHeroUrl, ...heroPreloadUrls.filter((u) => u !== lcpHeroUrl)]
    : heroPreloadUrls
  orderedPreload.forEach((url, i) => {
    preload(url, {
      as: 'image',
      fetchPriority: i === 0 ? 'high' : 'auto',
    })
  })

  const [apiListingsResult, authors, savedRegionConfig, heroTabsResult] = await Promise.all([
      fetchCategoryListings('oteller', {}, {}, locale),
      getAuthors(),
      getFeaturedRegionConfig('homepage'),
      fetchPublicNavMenuItems('hero_search', getPublicNavigationOrganizationId(), {
        cache: 'no-store',
      }).catch(() => ({ items: [] })),
    ])

  const activeSlugs = heroTabsResult.items
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => (item.url ?? '').replace(/^\/+/, '').split('/')[0])
    .filter(Boolean)

  const featuredListings: TListingBase[] = (apiListingsResult.listings.length > 0
    ? apiListingsResult.listings
    : []
  ).map((l) => ({
    ...l,
    listingVertical: normalizeCatalogVertical(l.listingVertical),
  }))

  // Hero config
  const heroHeading   = homepageConfig?.heroHeading   ?? m.homePage.heroDefaults.heading
  const heroSubheading = homepageConfig?.heroSubheading ?? m.homePage.heroDefaults.subheading
  const heroCtaText = homepageConfig?.heroCtaText ?? m.homePage.heroDefaults.cta
  /** Anasayfa hero — başlık / alt metin / CTA aynı kategori vitrinine (PageBuilder `HOME_CATEGORY`) */
  const categoryPageHref = await vitrinHref(locale, `${HOME_CATEGORY.categoryRoute}/all`)

  // featured_by_region modülü varsa savedRegionConfig ile override et
  const modulesWithRegion = modules.map((mod) => {
    if (mod.type === 'featured_by_region' && savedRegionConfig) {
      return { ...mod, config: { ...((mod.config as object) ?? {}), ...savedRegionConfig } }
    }
    return mod
  })

  const searchForm = (
    <HeroSearchDesktopOnly>
      <HeroSearchForm initTab="Stays" locale={locale} hideVerticalTabs activeSlugs={activeSlugs} />
    </HeroSearchDesktopOnly>
  )

  const heroHeadingLinked = (
    <Link href={categoryPageHref} className={heroHeadingLinkClassName}>
      <span dangerouslySetInnerHTML={{ __html: sanitizeHeroInlineHtml(heroHeading) }} />
    </Link>
  )

  const heroDescription = (
    <>
      <p className="max-w-xl text-base text-neutral-500 sm:text-xl dark:text-neutral-400">
        <Link href={categoryPageHref} className={heroSubheadingLinkClassName}>
          {heroSubheading}
        </Link>
      </p>
      <ButtonPrimary href={categoryPageHref} className="sm:text-base/normal">
        {heroCtaText}
      </ButtonPrimary>
    </>
  )

  return (
    <main className="relative isolate overflow-x-hidden">
      <BgGlassmorphism />

      {/* Hero — PageBuilderRenderer dışında, tam genişlik — z-10: arkada gövde zemini arkasında kalmayı önler (prod stacking) */}
      <div className={`relative z-10 container mb-6 ${heroContainerBelowHeaderClassName}`}>
        <HeroSectionWithSearchForm1
          heading={heroHeadingLinked}
          image={heroRightStay}
          imageAlt={m.homePage.heroAlt}
          freeformBannerLayout={DEFAULT_REGION_HERO_FREEFORM}
          mosaicImages={mosaicForRegionHero}
          searchForm={searchForm}
          description={heroDescription}
          topSpacing="minimal"
          heroMosaicBleed
        />
      </div>

      {/* Son aramalar */}
      <div className="container mb-10 flex justify-center px-4 sm:px-0">
        <HeroLastSearchRow locale={locale} />
      </div>

      {/* Tüm geri kalan bölümler — tek kök (`section`) ile ek sarmalayıcı yok; DOM daha küçük */}
      <PageBuilderRenderer
        rootAs="section"
        rootStyle={{
          contentVisibility: 'auto',
          containIntrinsicSize: '1px 2200px',
        }}
        modules={modulesWithRegion.filter((m) => m.type !== 'hero')}
        category={HOME_CATEGORY}
        locale={locale}
        searchFormNode={searchForm}
        allListings={featuredListings}
        listingLinkBase="/otel"
        priceUnit="/gece"
        authors={authors}
        pageKey="homepage"
      />
    </main>
  )
}

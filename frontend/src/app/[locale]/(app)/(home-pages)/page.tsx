import BgGlassmorphism from '@/components/BgGlassmorphism'
import { HeroLastSearchRow } from '@/components/HeroLastSearchRow'
import {
  heroHeadingLinkClassName,
  heroSubheadingLinkClassName,
} from '@/components/hero-sections/hero-link-classes'
import HeroSectionWithSearchForm1 from '@/components/hero-sections/HeroSectionWithSearchForm1'
import {
  heroBelowContentClassName,
  heroContainerBelowHeaderClassName,
  heroMosaicShellClassName,
} from '@/components/hero-sections/hero-below-header-classes'
import HeroSearchDesktopOnly from '@/components/HeroSearchForm/HeroSearchDesktopOnly'
import PageBuilderRenderer from '@/components/page-builder/PageBuilderRenderer'
import { getAuthors } from '@/data/authors'
import { CATEGORY_REGISTRY } from '@/data/category-registry'
import { getFeaturedRegionConfig, getHomepageConfig } from '@/data/page-builder-config'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { slimListingForVitrinCard } from '@/lib/featured-listings-utils'
import { fetchCategoryListings } from '@/lib/listings-fetcher'
import { getHomepageDefaultModules } from '@/lib/page-builder-default-modules'
import { panelImagesToFreeformUrls } from '@/lib/hero-gallery-slots'
import { resolveHeroLcpImageUrl } from '@/lib/hero-lcp-url'
import { preferHeroAvifTriple } from '@/lib/prefer-hero-avif'
import { DEFAULT_REGION_HERO_FREEFORM } from '@/lib/region-hero-freeform-defaults'
import { sanitizeHeroInlineHtml } from '@/lib/sanitize-cms-html'
import { pickLocalized, type LocalizedText } from '@/lib/localized-text'
import { vitrinHref } from '@/lib/vitrin-href'
import heroRightStay from '@/images/hero-right.avif'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Link from 'next/link'
import { preload } from 'react-dom'
import { Suspense, type ReactNode } from 'react'
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

// ISR: anasayfa cache (CDN/Next). Fetch revalidate (listings ~300 sn) efektif üst sınırdır.
export const revalidate = 3600

// Anasayfa için sahte bir "category" — PageBuilderRenderer bağlamı için
const HOME_CATEGORY = CATEGORY_REGISTRY.find((c) => c.slug === 'oteller')!

function HomepageSectionsFallback() {
  return (
    <div className="container py-8" aria-busy="true" aria-label="İçerik yükleniyor">
      <div className="mb-5 h-8 w-64 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-72 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800"
          />
        ))}
      </div>
    </div>
  )
}

async function HomepageSections({
  locale,
  modules,
  searchForm,
  savedRegionConfig,
}: {
  locale: string
  modules: PageBuilderModule[]
  searchForm: ReactNode
  savedRegionConfig: Awaited<ReturnType<typeof getFeaturedRegionConfig>>
}) {
  // İlan API'sini ilk ekranın dışında tut: hero ve arama alanı bu sorguyu beklememeli.
  const [apiListingsResult, authors] = await Promise.all([
    fetchCategoryListings('oteller', {}, { perPage: 36 }, locale),
    getAuthors(),
  ])
  const featuredListings: TListingBase[] = apiListingsResult.listings.map((listing) =>
    slimListingForVitrinCard({
      ...listing,
      listingVertical: normalizeCatalogVertical(listing.listingVertical),
    }),
  )
  const modulesWithRegion = modules.map((module) => {
    if (module.type === 'featured_by_region' && savedRegionConfig) {
      return { ...module, config: { ...((module.config as object) ?? {}), ...savedRegionConfig } }
    }
    return module
  })

  return (
    <PageBuilderRenderer
      rootAs="section"
      modules={modulesWithRegion.filter((module) => module.type !== 'hero')}
      category={HOME_CATEGORY}
      locale={locale}
      searchFormNode={searchForm}
      allListings={featuredListings}
      listingLinkBase="/otel"
      priceUnit="/gece"
      authors={authors}
      pageKey="homepage"
    />
  )
}

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
  const modules = rawModules.map((mod, i) => ({
    ...mod,
    id: (mod as PageBuilderModule).id ?? `home-module-${i}`,
  })) as PageBuilderModule[]

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
  const mosaicForRegionHero = preferHeroAvifTriple(panelImagesToFreeformUrls(mosaicGrid))

  /** Freeform’daki gerçek LCP URL’si dizinin ilk elemanı olmayabilir — önce onu preload et. */
  const lcpHeroUrl = resolveHeroLcpImageUrl(DEFAULT_REGION_HERO_FREEFORM, mosaicForRegionHero)
  if (lcpHeroUrl) {
    preload(lcpHeroUrl, {
      as: 'image',
      fetchPriority: 'high',
    })
  }

  const savedRegionConfig = await getFeaturedRegionConfig('homepage')

  // Hero config — page-builder hero modülü > homepageConfig > varsayılan mesaj
  // Page-builder hero editörü metinleri çoklu-dilli ({ tr, en, … }) saklar;
  // «Ana Sayfa Düzenleyici» düz string yazar → `pickLocalized` ikisini de okur.
  const heroModule = modules.find((mod) => mod.type === 'hero' && mod.enabled)
  const heroModuleCfg = heroModule?.config as Record<string, unknown> | undefined
  const heroHeading =
    pickLocalized(heroModuleCfg?.heading as LocalizedText | string | undefined, locale).trim() ||
    homepageConfig?.heroHeading ||
    m.homePage.heroDefaults.heading
  const heroSubheading =
    pickLocalized(heroModuleCfg?.subheading as LocalizedText | string | undefined, locale).trim() ||
    homepageConfig?.heroSubheading ||
    m.homePage.heroDefaults.subheading
  const heroCtaText =
    pickLocalized(heroModuleCfg?.ctaText as LocalizedText | string | undefined, locale).trim() ||
    homepageConfig?.heroCtaText ||
    m.homePage.heroDefaults.cta
  /** Anasayfa hero CTA linki — hero modülünde özel link varsa onu kullan, yoksa kategori vitrin */
  const categoryPageHref = await vitrinHref(locale, `${HOME_CATEGORY.categoryRoute}/all`)
  const heroCtaHref = (heroModuleCfg?.ctaHref as string | undefined)?.trim() || categoryPageHref

  const searchForm = (
    <HeroSearchDesktopOnly
      initTab="Stays"
      locale={locale}
      hideVerticalTabs
      collapseOverflowAfterSlug="arac-kiralama"
    />
  )

  const heroHeadingLinked = (
    <Link href={categoryPageHref} className={heroHeadingLinkClassName}>
      <span dangerouslySetInnerHTML={{ __html: sanitizeHeroInlineHtml(heroHeading) }} />
    </Link>
  )

  const heroDescription = (
    <>
      {/* neutral-600 (≥4.5:1) — PSI Acc contrast; dark:neutral-300 okunabilir */}
      <p className="max-w-xl text-base text-neutral-600 sm:text-xl dark:text-neutral-300">
        <Link href={categoryPageHref} className={heroSubheadingLinkClassName}>
          {heroSubheading}
        </Link>
      </p>
      <ButtonPrimary
        href={heroCtaHref}
        className="w-full max-w-full justify-center sm:w-auto sm:text-base/normal"
      >
        {heroCtaText}
      </ButtonPrimary>
    </>
  )

  return (
    <main className="relative isolate min-w-0 overflow-x-hidden">
      <BgGlassmorphism />

      {/* Hero — PageBuilderRenderer dışında, tam genişlik */}
      <div
        className={`${heroMosaicShellClassName} container mb-6 ${heroContainerBelowHeaderClassName}`}
      >
        <HeroSectionWithSearchForm1
          heading={heroHeadingLinked}
          headingLevel="h1"
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

      <div className={`${heroBelowContentClassName} overflow-x-hidden`}>
        {/* Son aramalar */}
        <div className="container mb-10 flex justify-center px-4 sm:px-0">
          <HeroLastSearchRow locale={locale} />
        </div>

        <div style={{ contentVisibility: 'auto', containIntrinsicSize: '1200px' }}>
          <Suspense fallback={<HomepageSectionsFallback />}>
            <HomepageSections
              locale={locale}
              modules={modules}
              searchForm={searchForm}
              savedRegionConfig={savedRegionConfig}
            />
          </Suspense>
        </div>
      </div>
    </main>
  )
}

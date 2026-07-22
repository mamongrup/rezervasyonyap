import BgGlassmorphism from '@/components/BgGlassmorphism'
import { HeroLastSearchRow } from '@/components/HeroLastSearchRow'
import HomeBelowFoldSkeleton from '@/components/HomeBelowFoldSkeleton'
import HomePageBuilderSection from '@/components/HomePageBuilderSection'
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
import { CATEGORY_REGISTRY } from '@/data/category-registry'
import { getHomepageConfig } from '@/data/page-builder-config'
import { getHomepageDefaultModules } from '@/lib/page-builder-default-modules'
import { panelImagesToFreeformUrls } from '@/lib/hero-gallery-slots'
import { resolveHeroLcpImageUrl } from '@/lib/hero-lcp-url'
import { preferHeroAvifTriple } from '@/lib/prefer-hero-avif'
import { DEFAULT_REGION_HERO_FREEFORM } from '@/lib/region-hero-freeform-defaults'
import { sanitizeHeroInlineHtml } from '@/lib/sanitize-cms-html'
import { pickLocalized, type LocalizedText } from '@/lib/localized-text'
import {
  brandingSiteName,
  metaSiteDescription,
  rawSiteDescription,
} from '@/lib/site-branding-seo'
import { getCachedSiteConfig } from '@/lib/site-config-cache'
import { vitrinHref } from '@/lib/vitrin-href'
import heroRightStay from '@/images/hero-right.avif'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Link from 'next/link'
import { preload } from 'react-dom'
import { Suspense } from 'react'
import { getMessages } from '@/utils/getT'
import { Metadata } from 'next'
import type { PageBuilderModule } from '@/types/listing-types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const m = getMessages(locale)
  const pub = await getCachedSiteConfig()
  const siteName = brandingSiteName(pub)
  const description = rawSiteDescription(pub) ?? m.homePage.meta.description ?? metaSiteDescription(pub)
  const title = m.homePage.meta.title?.trim() || siteName
  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${siteName}`,
      description,
      type: 'website',
    },
    twitter: {
      title: `${title} | ${siteName}`,
      description,
    },
  }
}

// ISR: anasayfa cache (CDN/Next). Fetch revalidate (listings ~300 sn) efektif üst sınırdır.
export const revalidate = 3600

// Anasayfa için sahte bir "category" — hero CTA vitrin yolu
const HOME_CATEGORY = CATEGORY_REGISTRY.find((c) => c.slug === 'oteller')!

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const m = getMessages(locale)

  /**
   * LCP: önce yalnızca hero config + preload — ağır listings fetch hero’yu bloklamaz
   * (HomePageBuilderSection Suspense ile stream edilir).
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

  const lcpHeroUrl = resolveHeroLcpImageUrl(DEFAULT_REGION_HERO_FREEFORM, mosaicForRegionHero)
  if (lcpHeroUrl) {
    preload(lcpHeroUrl, {
      as: 'image',
      fetchPriority: 'high',
    })
  }

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
        <div className="container mb-10 flex justify-center px-4 sm:px-0">
          <HeroLastSearchRow locale={locale} />
        </div>

        <Suspense fallback={<HomeBelowFoldSkeleton />}>
          <HomePageBuilderSection locale={locale} modules={modules} searchFormNode={searchForm} />
        </Suspense>
      </div>
    </main>
  )
}

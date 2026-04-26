import BgGlassmorphism from '@/components/BgGlassmorphism'
import { HeroLastSearchRow } from '@/components/HeroLastSearchRow'
import {
  heroHeadingLinkClassName,
  heroSubheadingLinkClassName,
} from '@/components/hero-sections/hero-link-classes'
import HeroSectionWithSearchForm1 from '@/components/hero-sections/HeroSectionWithSearchForm1'
import { heroContainerBelowHeaderClassName } from '@/components/hero-sections/hero-below-header-classes'
import HeroSearchForm from '@/components/HeroSearchForm/HeroSearchFormLazy'
import PageBuilderRenderer from '@/components/page-builder/PageBuilderRenderer'
import { getAuthors } from '@/data/authors'
import { getTravelCategories } from '@/data/categories'
import { getStayListings } from '@/data/listings'
import { CATEGORY_REGISTRY } from '@/data/category-registry'
import { getFeaturedRegionConfig, getHomepageConfig } from '@/data/page-builder-config'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { fetchCategoryListings } from '@/lib/listings-fetcher'
import { getHomepageDefaultModules } from '@/lib/page-builder-default-modules'
import { DEFAULT_REGION_HERO_FREEFORM } from '@/lib/region-hero-freeform-defaults'
import { sanitizeHeroInlineHtml } from '@/lib/sanitize-cms-html'
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

  const [stayListings, apiListingsResult, authors, homepageConfig, savedRegionConfig] =
    await Promise.all([
      getStayListings(),
      fetchCategoryListings('oteller', {}, {}),
      getAuthors(),
      getHomepageConfig(),
      getFeaturedRegionConfig('homepage'),
    ])

  const featuredListings: TListingBase[] = (
    apiListingsResult.fromApi && apiListingsResult.listings.length > 0
      ? apiListingsResult.listings
      : stayListings
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
  // Modüller: DB'den gelenleri al, yoksa defaults kullan
  const defaultModules = getHomepageDefaultModules(m)
  const savedModules = homepageConfig?.modules

  // Kayıtlı modüller varsa onları kullan, yoksa default
  const rawModules: Omit<PageBuilderModule, 'id'>[] = savedModules?.length
    ? savedModules
    : defaultModules

  // id ekle (yoksa)
  const modules: PageBuilderModule[] = rawModules.map((mod, i) => ({
    ...mod,
    id: (mod as PageBuilderModule).id ?? `home-module-${i}`,
  }))

  const defaultHeroSrc =
    typeof heroRightStay.src === 'string' ? heroRightStay.src : String(heroRightStay.src)

  /** Page Builder → Hero modülü: en az bir URL varsa üçlü tuple (boşlar sonra varsayılanla dolar) */
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

  /** Grid sırası (panel): [0] sol üst, [1] sol alt, [2] sağ uzun — bölge freeform slot: 0=sağ, 1=sol üst, 2=sol alt */
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

  /**
   * LCP boost: hero kolajının tüm görselleri için `<link rel="preload" as="image">`.
   * 3 görsel de ilk viewport'ta görünür; mobilde LCP image bunlardan herhangi
   * biri olabilir. İlk URL'i `fetchPriority='high'` ile, kalanları normal
   * öncelikte preload ediyoruz. PSI mobil "Kaynak yükleme gecikmesi 440-750 ms"
   * uyarısını hedefliyor (HTML parse + CSS/JS indirmesinden ÖNCE keşif).
   */
  const heroPreloadUrls = Array.from(
    new Set(mosaicForRegionHero.filter((u) => typeof u === 'string' && u.trim() !== '')),
  )
  heroPreloadUrls.forEach((url, i) => {
    preload(url, {
      as: 'image',
      fetchPriority: i === 0 ? 'high' : 'auto',
    })
  })

  // featured_by_region modülü varsa savedRegionConfig ile override et
  const modulesWithRegion = modules.map((mod) => {
    if (mod.type === 'featured_by_region' && savedRegionConfig) {
      return { ...mod, config: { ...((mod.config as object) ?? {}), ...savedRegionConfig } }
    }
    return mod
  })

  const searchForm = (
    <HeroSearchForm initTab="Stays" locale={locale} hideVerticalTabs />
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
    <main className="relative overflow-x-hidden">
      <BgGlassmorphism />

      {/* Hero — PageBuilderRenderer dışında, tam genişlik */}
      <div className={`relative container mb-6 ${heroContainerBelowHeaderClassName}`}>
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

      {/* Tüm geri kalan bölümler — modüler */}
      <PageBuilderRenderer
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

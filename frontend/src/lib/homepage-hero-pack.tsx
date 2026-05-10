import HeroSearchDesktopOnly from '@/components/HeroSearchForm/HeroSearchDesktopOnly'
import {
  heroHeadingLinkClassName,
  heroSubheadingLinkClassName,
} from '@/components/hero-sections/hero-link-classes'
import { CATEGORY_REGISTRY } from '@/data/category-registry'
import { getHomepageConfig } from '@/data/page-builder-config'
import { resolveHeroLcpImageUrl } from '@/lib/hero-lcp-url'
import { getHomepageDefaultModules } from '@/lib/page-builder-default-modules'
import { DEFAULT_REGION_HERO_FREEFORM } from '@/lib/region-hero-freeform-defaults'
import { sanitizeHeroInlineHtml } from '@/lib/sanitize-cms-html'
import { vitrinHref } from '@/lib/vitrin-href'
import heroRightStay from '@/images/hero-right.avif'
import ButtonPrimary from '@/shared/ButtonPrimary'
import type { PageBuilderModule } from '@/types/listing-types'
import type { AppMessages } from '@/utils/getT'
import Link from 'next/link'
import type { ReactNode } from 'react'

const HOME_CATEGORY = CATEGORY_REGISTRY.find((c) => c.slug === 'oteller')!

export type HomepageHeroPack = {
  modules: PageBuilderModule[]
  mosaicForRegionHero: [string, string, string]
  lcpHeroUrl: string | null
  heroHeadingLinked: ReactNode
  heroDescription: ReactNode
  searchForm: ReactNode
  imageAlt: string
  heroImage: typeof heroRightStay
}

/** Anasayfa ile birebir aynı hero görseli / mozaik / başlık / arama formu paketi */
export async function loadHomepageHeroPack(locale: string, m: AppMessages): Promise<HomepageHeroPack> {
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
  const mosaicForRegionHero: [string, string, string] = [
    mosaicGrid[2],
    mosaicGrid[0],
    mosaicGrid[1],
  ]

  const lcpHeroUrl = resolveHeroLcpImageUrl(DEFAULT_REGION_HERO_FREEFORM, mosaicForRegionHero) ?? null

  const heroModule = modules.find((mod) => mod.type === 'hero' && mod.enabled)
  const heroModuleCfg = heroModule?.config as Record<string, unknown> | undefined
  const heroHeading =
    (heroModuleCfg?.heading as string | undefined)?.trim() ||
    homepageConfig?.heroHeading ||
    m.homePage.heroDefaults.heading
  const heroSubheading =
    (heroModuleCfg?.subheading as string | undefined)?.trim() ||
    homepageConfig?.heroSubheading ||
    m.homePage.heroDefaults.subheading
  const heroCtaText =
    (heroModuleCfg?.ctaText as string | undefined)?.trim() ||
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
      <p className="max-w-xl text-base text-neutral-500 sm:text-xl dark:text-neutral-400">
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

  return {
    modules,
    mosaicForRegionHero,
    lcpHeroUrl,
    heroHeadingLinked,
    heroDescription,
    searchForm,
    imageAlt: m.homePage.heroAlt,
    heroImage: heroRightStay,
  }
}

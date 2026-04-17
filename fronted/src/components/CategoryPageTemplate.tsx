/**
 * Generic category page template.
 * Used by all category routes (hotels, tours, ferries, etc.)
 * Hero: anasayfa ile aynı — `DEFAULT_REGION_HERO_FREEFORM` + `mosaicForRegionHero` slot sırası
 * (`page.tsx` ile uyumlu); klasik mozaik grid yerine freeform banner görünümü.
 */

import HolidayListingFilters from '@/components/HolidayListingFilters'
import ListingFilterTabs from '@/components/ListingFilterTabs'
import PageBuilderRenderer from '@/components/page-builder/PageBuilderRenderer'
import {
  heroHeadingLinkClassName,
  heroStatsRowLinkClassName,
} from '@/components/hero-sections/hero-link-classes'
import HeroSectionWithSearchForm1 from '@/components/hero-sections/HeroSectionWithSearchForm1'
import { heroContainerBelowHeaderClassName } from '@/components/hero-sections/hero-below-header-classes'
import HeroSearchForm from '@/components/HeroSearchForm/HeroSearchForm'
import SectionSliderRegions from '@/components/SectionSliderRegions'
import type { RegionSliderItem } from '@/components/SectionSliderRegions'
import type { CategoryRegistryEntry } from '@/data/category-registry'
import type { HeroOverride } from '@/data/region-hero-config'
import type { FilterOption, PageBuilderModule, TListingBase } from '@/types/listing-types'
import type { TAuthor } from '@/data/authors'
import { getPublicRegionStats, listPublicThemeItems } from '@/lib/travel-api'
import { SLUG_TO_CODE } from '@/lib/listings-fetcher'
import { getCategoryPageBuilderConfig } from '@/data/page-builder-config'
import { Button } from '@/shared/Button'
import { Divider } from '@/shared/divider'
import CategoryListingPagination from '@/components/CategoryListingPagination'
import convertNumbThousand from '@/utils/convertNumbThousand'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import { getLocalizedDefaultModules } from '@/lib/page-builder-default-modules'
import { sanitizeHeroInlineHtml } from '@/lib/sanitize-cms-html'
import { vitrinHref } from '@/lib/vitrin-href'
import { buildListingsItemListJsonLd } from '@/lib/seo/listings-itemlist-jsonld'
import { DEFAULT_REGION_HERO_FREEFORM } from '@/lib/region-hero-freeform-defaults'
import { MapsLocation01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import SectionSubcategories from '@/components/SectionSubcategories'
import { getSubcategoriesByParent } from '@/data/subcategory-registry'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Suspense } from 'react'

// Static hero images per image type
import heroRightStay from '@/images/hero-right.png'
import heroRightExperience from '@/images/hero-right-experience.png'
import heroRightCar from '@/images/hero-right-car.png'
import heroRightFlight from '@/images/hero-right-flight.png'

export type { FilterOption }

/** URL araması / bölge — sonuç üstünde özet rozetleri */
export interface ActiveSearchSummary {
  location?: string
  checkin?: string
  checkout?: string
  guests?: string
  regionLabel?: string
  drop_off?: string
  from?: string
  to?: string
  /** true: backend API; false: ön yüz mock */
  fromApi?: boolean
}

interface CategoryPageTemplateProps {
  category: CategoryRegistryEntry
  /** Total count of listings in this category/region */
  count: number
  /** Listings rendered as cards (injected by the calling page) */
  listingCards: React.ReactNode
  /** Filter options for the filter tabs */
  filterOptions?: FilterOption[]
  /** Page builder module config (fetched from DB/API) */
  modules?: PageBuilderModule[]
  /** Current handle (region slug) — undefined means "all" */
  currentHandle?: string
  /** Whether this is the search/results view (handle !== undefined, !== 'all') */
  isSearchResults?: boolean
  /** Optional sub-category cards for the destinations grid */
  destinationCards?: React.ReactNode
  /** Locale for i18n in the search form */
  locale?: string
  /**
   * Region-specific hero override — loaded from `region-hero-config.ts`
   * when visiting a filtered page (e.g. /oteller/antalya).
   */
  heroOverride?: HeroOverride
  /** Tüm ilanlar — PageBuilderRenderer'daki featured_by_region modülü için */
  allListings?: TListingBase[]
  /** İlan detail URL prefix, ör. "/otel" */
  listingLinkBase?: string
  /** Fiyat birimi, ör. "/gece" */
  priceUnit?: string
  /** İlan sağlayıcı listesi — top_providers modülü için */
  authors?: TAuthor[]
  /**
   * Kategoriye özgü kart render fonksiyonu.
   * Verilirse page builder listings modülleri kendi içinde filtre uygular.
   * Verilmezse, dışarıdan enjekte edilen listingCards kullanılır (legacy).
   */
  listingCardRenderer?: (listing: TListingBase, index: number) => ReactNode
  /** Hero aramasıyla gelen filtre özeti */
  activeSearch?: ActiveSearchSummary
  /** Bölge slider'ı için bölge istatistikleri */
  regionStats?: RegionSliderItem[]
  /** Tatil evleri vb.: ana ızgaradan sonra gösterilecek esnek arama önerileri */
  flexibleListingCards?: ReactNode
  /** Sayfalama — API toplamı ve sayfa boyutu (1 tabanlı sayfa numarası) */
  listingPagination?: { page: number; total: number; perPage: number }
}

const heroImages = {
  stay: heroRightStay,
  experience: heroRightExperience,
  car: heroRightCar,
  flight: heroRightFlight,
}

function generateModuleId(index: number) {
  return `module-${index}`
}

export default async function CategoryPageTemplate({
  category,
  count,
  listingCards,
  filterOptions = [],
  modules,
  currentHandle,
  isSearchResults = false,
  destinationCards,
  locale = 'tr',
  heroOverride,
  allListings,
  listingLinkBase = '/otel',
  priceUnit = '/gece',
  authors = [],
  listingCardRenderer,
  activeSearch,
  regionStats,
  flexibleListingCards,
  listingPagination,
}: CategoryPageTemplateProps) {
  const m = getMessages(locale)
  const cat = m.categoryPage
  const isAll = !currentHandle || currentHandle === 'all'

  const categoryRouteVitrin = await vitrinHref(locale, category.categoryRoute)
  /** Hero başlık + istatistik satırı bu kategorinin «tüm ilanlar» vitrinine gider (/, /all ile aynı mantık) */
  const categoryPageHref = await vitrinHref(locale, `${category.categoryRoute}/all`)
  const listingLinkBaseVitrin = await vitrinHref(locale, listingLinkBase)
  const mapOnMapHref =
    category.mapRoute != null && String(category.mapRoute).trim() !== ''
      ? await vitrinHref(locale, `${category.mapRoute}/${currentHandle ?? 'all'}`)
      : null

  /** Google ItemList / carousel uyumu — otel, villa, yat, tur, aktivite vb. kategori liste sayfaları */
  const itemListJsonLd =
    allListings && allListings.length > 0
      ? await buildListingsItemListJsonLd({
          category,
          listings: allListings,
          locale,
          currentHandle,
        })
      : null

  // modules geçirilmemişse önce kaydedilmiş page builder config'e bak, yoksa kod varsayılanlarını kullan
  const resolvedModules: PageBuilderModule[] =
    modules ??
    await getCategoryPageBuilderConfig(category.slug, locale).catch(() =>
      getLocalizedDefaultModules(category.slug, m).map((mod, i) => ({
        ...mod,
        id: `default-${category.slug}-${i}`,
      }))
    )

  // Bölge istatistiklerini dışarıdan geçilmemişse çek (sadece "all" görünümünde)
  const categoryCode = SLUG_TO_CODE[category.slug] ?? category.slug
  const holidayHomeSubs =
    category.slug === 'tatil-evleri' ? getSubcategoriesByParent('tatil-evleri') : []
  const holidayThemeOptions =
    category.slug === 'tatil-evleri'
      ? (await listPublicThemeItems({ categoryCode: 'holiday_home', locale }))?.items ?? []
      : []
  const resolvedRegionStats: RegionSliderItem[] =
    regionStats ??
    (isAll
      ? await getPublicRegionStats(
          categoryCode,
          12,
          { next: { revalidate: 300 } } as RequestInit,
        ).catch(() => [])
      : [])

  /** Page builder (client) modüllerine fonksiyon yerine id → kart node geçir */
  const listingCardsById: Record<string, ReactNode> | undefined =
    allListings?.length && listingCardRenderer
      ? Object.fromEntries(
          allListings.map((l, i) => [l.id, listingCardRenderer(l, i)] as [string, ReactNode]),
        )
      : undefined

  // Read hero config from Page Builder modules (category-level, only for /all)
  const heroModule = resolvedModules.find((m) => m.type === 'hero' && m.enabled)
  const heroConfig = (heroModule?.config as Record<string, unknown>) ?? {}
  const configImages = heroConfig.images as string[] | undefined
  const configHeading = (heroConfig.heading as string) || null

  const heroImage = heroImages[category.heroImageType ?? 'stay']
  const defaultSrc =
    typeof heroImage.src === 'string' ? heroImage.src : String(heroImage.src)
  /**
   * Bölge / anasayfa ile aynı mozaik: panelden en az bir hero görseli varsa üçlü tuple;
   * eksik slotlar kategori varsayılan görseliyle dolar (tamamı boşsa üçü de default).
   */
  const fromBuilder =
    Array.isArray(configImages) && configImages.some((u) => (u ?? '').trim())
      ? ([
          (configImages[0] ?? '').trim() || defaultSrc,
          (configImages[1] ?? '').trim() || defaultSrc,
          (configImages[2] ?? '').trim() || defaultSrc,
        ] as [string, string, string])
      : undefined
  const mosaicImages: [string, string, string] =
    heroOverride?.images
      ? [
          heroOverride.images[0]?.trim() || defaultSrc,
          heroOverride.images[1]?.trim() || defaultSrc,
          heroOverride.images[2]?.trim() || defaultSrc,
        ]
      : fromBuilder ?? [defaultSrc, defaultSrc, defaultSrc]

  /**
   * Anasayfa ile aynı: panel `[0] sol üst, [1] sol alt, [2] sağ uzun` — freeform slot sırası
   * `0=sağ, 1=sol üst, 2=sol alt` → `[mosaic[2], mosaic[0], mosaic[1]]`
   * @see `app/(home-pages)/page.tsx` (`mosaicForRegionHero`)
   */
  const mosaicForRegionHero: [string, string, string] = [
    mosaicImages[2],
    mosaicImages[0],
    mosaicImages[1],
  ]

  const countFormatted = convertNumbThousand(count)
  const heroDescription = (
    <Link href={categoryPageHref} className={heroStatsRowLinkClassName}>
      {category.slug === 'tatil-evleri' ? (
        <div className="flex items-center text-base font-medium text-neutral-500 md:text-lg dark:text-neutral-400">
          <i className="las la-map-marked me-2 text-2xl" />
          <span>
            <span className="text-neutral-500 dark:text-neutral-400">{cat.holidayHomesHeroLead} </span>
            <span className="text-neutral-900 dark:text-neutral-100">
              {interpolate(cat.holidayHomesHeroHighlight, { count: countFormatted })}
            </span>
          </span>
        </div>
      ) : (
        <div className="flex items-center text-base font-medium text-neutral-500 md:text-lg dark:text-neutral-400">
          <i className="las la-map-marked me-2 text-2xl" />
          <span>
            {cat.nationwide} &nbsp;
            <span className="text-neutral-900 dark:text-neutral-100">
              {countFormatted}+ {category.namePlural}
            </span>
          </span>
        </div>
      )}
    </Link>
  )

  const searchForm = (
    <HeroSearchForm
      initTab={category.heroSearchTab ?? 'Stays'}
      locale={locale}
      hideVerticalTabs
    />
  )

  const heroHeading = heroOverride?.heading ?? configHeading ?? category.heroHeading
  const heroHeadingLinked = (
    <Link href={categoryPageHref} className={heroHeadingLinkClassName}>
      <span dangerouslySetInnerHTML={{ __html: sanitizeHeroInlineHtml(heroHeading) }} />
    </Link>
  )

  const hasActiveSearch =
    activeSearch &&
    (activeSearch.location ||
      activeSearch.checkin ||
      activeSearch.checkout ||
      activeSearch.guests ||
      activeSearch.regionLabel ||
      activeSearch.drop_off ||
      activeSearch.from ||
      activeSearch.to)

  const searchResultsSection = (
    <div className="container mt-10 lg:mt-16">
      <div className="flex flex-wrap items-end justify-between gap-x-2.5 gap-y-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            {isAll
              ? interpolate(cat.listingsHeadingAll, {
                  count: convertNumbThousand(count),
                  category: category.name,
                })
              : interpolate(cat.listingsHeadingFiltered, {
                  count: convertNumbThousand(count),
                  handle: currentHandle ?? '',
                })}
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {interpolate(cat.pricesDisclaimer, {
              unit: category.priceUnit.replace('/', ''),
            })}
          </p>
          {hasActiveSearch && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{cat.activeSearch}</span>
              {activeSearch?.regionLabel && (
                <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-800 dark:bg-primary-900/40 dark:text-primary-200">
                  {cat.badgeRegion} {activeSearch.regionLabel}
                </span>
              )}
              {activeSearch?.location && (
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                  {cat.badgeLocation} {activeSearch.location}
                </span>
              )}
              {(activeSearch?.checkin || activeSearch?.checkout) && (
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                  {activeSearch.checkin && activeSearch.checkout
                    ? `${activeSearch.checkin} → ${activeSearch.checkout}`
                    : activeSearch.checkin ?? activeSearch.checkout}
                </span>
              )}
              {activeSearch?.guests && (
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                  {interpolate(cat.badgeGuests, { count: activeSearch.guests })}
                </span>
              )}
              {activeSearch?.drop_off && (
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                  {cat.badgeDropOff} {activeSearch.drop_off}
                </span>
              )}
              {(activeSearch?.from || activeSearch?.to) && (
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                  {[activeSearch.from, activeSearch.to].filter(Boolean).join(' → ')}
                </span>
              )}
              {activeSearch?.fromApi === false && (
                <span className="text-[10px] text-neutral-400">{cat.demoData}</span>
              )}
            </div>
          )}
        </div>

        {mapOnMapHref && (
          <Button color="white" href={mapOnMapHref}>
            <span className="me-1.5">{cat.viewOnMap}</span>
            <HugeiconsIcon icon={MapsLocation01Icon} size={18} color="currentColor" strokeWidth={1.5} />
          </Button>
        )}
      </div>

      <Divider className="my-7 md:my-10" />

      {filterOptions.length > 0 &&
        (category.slug === 'tatil-evleri' && m.categoryPage.listingFilters ? (
          <Suspense
            fallback={
              <div className="mb-8 h-12 max-w-3xl animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
            }
          >
            <HolidayListingFilters
              locale={locale}
              messages={m.categoryPage.listingFilters}
              subcategories={holidayHomeSubs}
              themeOptions={holidayThemeOptions.length > 0 ? holidayThemeOptions : undefined}
            />
          </Suspense>
        ) : (
          <ListingFilterTabs filterOptions={filterOptions} />
        ))}

      <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 md:gap-x-8 md:gap-y-12 lg:mt-10 lg:grid-cols-3 xl:grid-cols-4">
        {listingCards}
      </div>

      {flexibleListingCards ? (
        <section className="mt-14 border-t border-neutral-200 pt-12 md:mt-16 md:pt-14 dark:border-neutral-700">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white md:text-2xl">
            {cat.flexibleSearchHeading}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-neutral-500 dark:text-neutral-400">
            {cat.flexibleSearchSubheading}
          </p>
          <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 md:gap-x-8 md:gap-y-12 lg:mt-10 lg:grid-cols-3 xl:grid-cols-4">
            {flexibleListingCards}
          </div>
        </section>
      ) : null}

      <div className="mt-16 flex items-center justify-center">
        <Suspense fallback={<div className="h-10 w-40 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />}>
          <CategoryListingPagination
            locale={locale}
            page={listingPagination?.page}
            total={listingPagination?.total}
            perPage={listingPagination?.perPage}
          />
        </Suspense>
      </div>
    </div>
  )

  const regionSlider = resolvedRegionStats.length > 0 && isAll ? (
    <div className="container mt-16">
      <h2 className="mb-6 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        {cat.exploreByRegion}
      </h2>
      <SectionSliderRegions
        regions={resolvedRegionStats}
        categoryRoute={categoryRouteVitrin}
        unit={category.name.toLowerCase()}
      />
    </div>
  ) : null

  // Alt kategoriler (hero altında ikon grid)
  const subcategoryItems = getSubcategoriesByParent(category.slug)
  const subcategorySection = isAll && subcategoryItems.length > 0 ? (
    <div className="container mt-10">
      <SectionSubcategories
        parentCategorySlug={category.slug}
        locale={locale}
        subcategories={subcategoryItems}
        showHeading={true}
        variant="icon-grid"
        categoryRoute={categoryRouteVitrin}
      />
    </div>
  ) : null

  // Category landing view: hero + builder modules (her zaman resolvedModules var)
  if (isAll) {
    const nonHeroModules = resolvedModules
      .filter((m) => m.type !== 'hero')
      .map((m, i) => ({ ...m, id: m.id ?? generateModuleId(i) }))

    return (
      <div className="pb-28">
        {itemListJsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
          />
        )}
        <div className={`relative container mb-6 ${heroContainerBelowHeaderClassName}`}>
          <HeroSectionWithSearchForm1
            heading={heroHeadingLinked}
            description={heroDescription}
            image={heroImage}
            imageAlt={category.name}
            searchForm={searchForm}
            freeformBannerLayout={DEFAULT_REGION_HERO_FREEFORM}
            mosaicImages={mosaicForRegionHero}
            topSpacing="minimal"
            heroMosaicBleed
          />
        </div>

        {subcategorySection}

        {searchResultsSection}

        {regionSlider}

        <PageBuilderRenderer
          modules={nonHeroModules}
          category={category}
          locale={locale}
          searchFormNode={searchForm}
          listingsNode={
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 md:gap-x-8 md:gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
              {listingCards}
            </div>
          }
          categoriesNode={destinationCards}
          allListings={allListings}
          listingLinkBase={listingLinkBaseVitrin}
          priceUnit={priceUnit}
          authors={authors}
          listingCardsById={listingCardsById}
        />
      </div>
    )
  }

  // Filtered results view (region / search applied) — hero + results + compact modules
  const compactModules = resolvedModules
    .filter(
      (m) =>
        m.type !== 'hero' &&
        ['become_provider', 'newsletter', 'testimonials', 'client_say'].includes(m.type),
    )
    .map((m, i) => ({ ...m, id: m.id ?? generateModuleId(i) }))

  return (
    <div className="pb-28">
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      <div className={`relative container mb-6 ${heroContainerBelowHeaderClassName}`}>
        <HeroSectionWithSearchForm1
          heading={heroHeadingLinked}
          description={heroDescription}
          image={heroImage}
          imageAlt={category.name}
          searchForm={searchForm}
          freeformBannerLayout={DEFAULT_REGION_HERO_FREEFORM}
          mosaicImages={mosaicForRegionHero}
          topSpacing="minimal"
          heroMosaicBleed
        />
      </div>

      {searchResultsSection}

      {regionSlider}

      {compactModules.length > 0 && (
        <PageBuilderRenderer
          modules={compactModules}
          category={category}
          locale={locale}
        />
      )}
    </div>
  )
}

/**
 * Generic category page template.
 * Used by all category routes (hotels, tours, ferries, etc.)
 * Hero: anasayfa ile aynı — `DEFAULT_REGION_HERO_FREEFORM` + `mosaicForRegionHero` slot sırası
 * (`page.tsx` ile uyumlu); klasik mozaik grid yerine freeform banner görünümü.
 */

import HolidayListingFilters from '@/components/HolidayListingFilters'
import ListingFilterTabs from '@/components/ListingFilterTabs'
import PageBuilderRenderer from '@/components/page-builder/PageBuilderRenderer'
import BgGlassmorphism from '@/components/BgGlassmorphism'
import {
  heroHeadingLinkClassName,
  heroStatsRowLinkClassName,
} from '@/components/hero-sections/hero-link-classes'
import HeroSectionWithSearchForm1 from '@/components/hero-sections/HeroSectionWithSearchForm1'
import {
  heroBelowContentClassName,
  heroContainerBelowHeaderClassName,
  heroMosaicShellClassName,
} from '@/components/hero-sections/hero-below-header-classes'
import HeroSearchDesktopOnly from '@/components/HeroSearchForm/HeroSearchDesktopOnly'
import SectionSliderRegions from '@/components/SectionSliderRegions'
import type { RegionSliderItem } from '@/components/SectionSliderRegions'
import type { CategoryRegistryEntry } from '@/data/category-registry'
import type { HeroOverride } from '@/data/region-hero-config'
import type { FilterOption, PageBuilderModule, TListingBase } from '@/types/listing-types'
import type { TAuthor } from '@/data/authors'
import { listPublicThemeItems } from '@/lib/travel-api'
import { loadCategoryPageShellCached } from '@/lib/category-page-shell-cache'
import { SLUG_TO_CODE } from '@/lib/listings-fetcher'
import { resolveListingPriceUnit } from '@/lib/listing-category-display'
import {
  isStayRentalCategory,
  type StayRentalCategoryCode,
} from '@/lib/stay-rental-categories'
import {
  filterRegionsForHandle,
  regionsWithListings,
} from '@/lib/region-stats-display'
import { Button } from '@/shared/Button'
import { Divider } from '@/shared/divider'
import CategoryListingPagination from '@/components/CategoryListingPagination'
import convertNumbThousand from '@/utils/convertNumbThousand'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import { getLocalizedDefaultModules } from '@/lib/page-builder-default-modules'
import { sanitizeHeroInlineHtml } from '@/lib/sanitize-cms-html'
import { pickLocalized, type LocalizedText } from '@/lib/localized-text'
import { resolveCategoryDisplay } from '@/lib/localized-category'
import { vitrinHref } from '@/lib/vitrin-href'
import { buildListingsItemListJsonLd } from '@/lib/seo/listings-itemlist-jsonld'
import { panelImagesToFreeformUrls } from '@/lib/hero-gallery-slots'
import { DEFAULT_REGION_HERO_FREEFORM } from '@/lib/region-hero-freeform-defaults'
import { MapsLocation01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { getSubcategoriesByParent } from '@/data/subcategory-registry'
import CategoryHubGridModule from '@/components/page-builder/modules/CategoryHubGridModule'
import { buildKulturTourHubGridConfig } from '@/data/tour-kultur-hub-categories'
import { isKulturTourHubSlug } from '@/lib/tour-subcategory-routes'
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
  /** Tatil evi tur tipi etiketi (villalar → Villalar). Varsa "Bölge" yerine "Tür" rozeti */
  propertyTypeLabel?: string
  drop_off?: string
  from?: string
  to?: string
  /** true: backend API; false: ön yüz mock */
  fromApi?: boolean
  /** Son dakika müsaitlik listesi */
  lastMinute?: boolean
  /** Vitrin lüks / ekonomik tam liste */
  vitrinTab?: 'luxury' | 'economic'
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
  /** Statik ilan sayısı yerine özel başlık (ör. Turna canlı arama) */
  listingSectionTitle?: string
  /** Kategori landing'inde liste/sonuç bloğunu gizle (örn. dış API arama bekleyen sayfalar). */
  hideListingsOnLanding?: boolean
  /** Tatil evi / yat — tema filtresi (sayfa zaten theme-items çektiyse tekrar API'ye gitme) */
  preloadedStayRentalThemeOptions?: { code: string; label: string }[]
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
  priceUnit,
  authors = [],
  listingCardRenderer,
  activeSearch,
  regionStats,
  flexibleListingCards,
  listingPagination,
  listingSectionTitle,
  hideListingsOnLanding = false,
  preloadedStayRentalThemeOptions,
}: CategoryPageTemplateProps) {
  const m = getMessages(locale)
  const cat = m.categoryPage
  // Locale-aware hero heading, name, namePlural, priceUnit
  const resolvedCategory = resolveCategoryDisplay(category, locale)
  const effectivePriceUnit =
    priceUnit ?? resolveListingPriceUnit(category.detailRoute, locale)
  const isAll = !currentHandle || currentHandle === 'all'

  // Saf (senkron) türetmeler — async batch'ten önce hazırlanır.
  const categoryCode = SLUG_TO_CODE[category.slug] ?? category.slug
  const isStayRentalPage = isStayRentalCategory(categoryCode)
  const stayRentalCode = isStayRentalPage ? (categoryCode as StayRentalCategoryCode) : null
  const stayRentalSubs = isStayRentalPage ? getSubcategoriesByParent(category.slug) : []

  // Birbirinden bağımsız async işleri tek Promise.all'da paralelleştir:
  // vitrinHref'ler (istek-içi cache'li), ItemList JSON-LD, page builder config,
  // tema öğeleri ve bölge istatistikleri ayrı ayrı sıralı beklenmez.
  // Shell dışarıdan geçildiyse (categoryPageShellProps) region-stats tekrar çekilmez.
  const shellPromise =
    regionStats != null
      ? null
      : loadCategoryPageShellCached(category.slug, locale ?? 'tr', currentHandle)
  const [
    categoryRouteVitrin,
    categoryPageHref,
    mapOnMapHref,
    itemListJsonLd,
    resolvedModulesRaw,
    stayRentalThemeOptions,
    rawRegionStats,
  ] = await Promise.all([
    vitrinHref(locale, category.categoryRoute),
    // Hero başlık + istatistik satırı bu kategorinin «tüm ilanlar» vitrinine gider.
    vitrinHref(locale, `${category.categoryRoute}/all`),
    category.mapRoute != null && String(category.mapRoute).trim() !== ''
      ? vitrinHref(locale, `${category.mapRoute}/${currentHandle ?? 'all'}`)
      : Promise.resolve(null),
    // Google ItemList / carousel uyumu — kategori liste sayfaları
    allListings && allListings.length > 0
      ? buildListingsItemListJsonLd({ category, listings: allListings, locale, currentHandle })
      : Promise.resolve(null),
    // modules geçirilmemişse kaydedilmiş config, yoksa kod varsayılanları
    modules
      ? Promise.resolve(modules)
      : shellPromise
        ? shellPromise.then((shell) =>
            shell.pageBuilderModules.length > 0
              ? shell.pageBuilderModules
              : getLocalizedDefaultModules(category.slug, m).map((mod, i) => ({
                  ...mod,
                  id: `default-${category.slug}-${i}`,
                })),
          )
        : Promise.resolve(
            getLocalizedDefaultModules(category.slug, m).map((mod, i) => ({
              ...mod,
              id: `default-${category.slug}-${i}`,
            })),
          ),
    stayRentalCode
      ? preloadedStayRentalThemeOptions != null
        ? Promise.resolve(preloadedStayRentalThemeOptions)
        : listPublicThemeItems({ categoryCode: stayRentalCode, locale }).then((r) => r?.items ?? [])
      : Promise.resolve([]),
    // Bölge istatistikleri — dışarıdan geçilmemişse çek
    regionStats
      ? Promise.resolve(regionStats)
      : shellPromise
        ? shellPromise.then((shell) => shell.regionStats)
        : Promise.resolve([] as RegionSliderItem[]),
  ])
  let resolvedModules = resolvedModulesRaw as PageBuilderModule[]
  if (
    category.slug === 'kruvaziyer' &&
    !resolvedModules.some((mod) => mod.type === 'category_hub_grid' && mod.enabled)
  ) {
    const hubDefaults: PageBuilderModule[] = getLocalizedDefaultModules('kruvaziyer', m)
      .filter((mod) => mod.type === 'category_hub_grid')
      .map((mod, i) => ({ ...mod, id: `default-kruvaziyer-hub-${i}` } as PageBuilderModule))
    if (hubDefaults.length > 0) {
      const heroIdx = resolvedModules.findIndex((mod) => mod.type === 'hero')
      const insertAt = heroIdx >= 0 ? heroIdx + 1 : 0
      resolvedModules = [
        ...resolvedModules.slice(0, insertAt),
        ...hubDefaults,
        ...resolvedModules.slice(insertAt),
      ]
    }
  }
  const resolvedRegionStats: RegionSliderItem[] = regionsWithListings(
    filterRegionsForHandle(rawRegionStats, currentHandle),
  )

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
  // Page-builder hero editörü başlığı çoklu-dilli ({ tr, en, … }) saklayabilir; düz string de gelebilir.
  const configHeading =
    pickLocalized(heroConfig.heading as LocalizedText | string | undefined, locale).trim() || null

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
  const mosaicForRegionHero = panelImagesToFreeformUrls(mosaicImages)

  const countFormatted = convertNumbThousand(count)
  const heroDescription = (
    <>
      <Link href={categoryPageHref} className={heroStatsRowLinkClassName}>
        {category.slug === 'tatil-evleri' || category.slug === 'yat-kiralama' ? (
          <div className="flex items-center text-base font-medium text-neutral-500 md:text-lg dark:text-neutral-400">
            <i className="las la-map-marked me-2 text-2xl" />
            <span>
              <span className="text-neutral-500 dark:text-neutral-400">
                {category.slug === 'yat-kiralama' ? cat.yachtCharterHeroLead : cat.holidayHomesHeroLead}{' '}
              </span>
              <span className="text-neutral-900 dark:text-neutral-100">
                {interpolate(
                  category.slug === 'yat-kiralama'
                    ? cat.yachtCharterHeroHighlight
                    : cat.holidayHomesHeroHighlight,
                  { count: countFormatted },
                )}
              </span>
            </span>
          </div>
        ) : (
          <div className="flex items-center text-base font-medium text-neutral-500 md:text-lg dark:text-neutral-400">
            <i className="las la-map-marked me-2 text-2xl" />
            <span>
              {category.listingType === 'flight'
                ? cat.flightNationwide
                : category.listingType === 'tour'
                  ? cat.tourNationwide
                  : cat.nationwide}{' '}
              &nbsp;
              <span className="text-neutral-900 dark:text-neutral-100">
                {countFormatted}+ {category.listingType === 'tour' ? cat.tourNamePlural : resolvedCategory.namePlural}
              </span>
            </span>
          </div>
        )}
      </Link>
    </>
  )

  const searchForm = (
    <HeroSearchDesktopOnly
      initTab={category.heroSearchTab ?? 'Stays'}
      locale={locale}
      hideVerticalTabs
      collapseOverflowAfterSlug="arac-kiralama"
      staySearchTargetPath={`${category.categoryRoute}/all`}
      staySearchPrefill={
        activeSearch
          ? {
              location: activeSearch.location,
              checkin: activeSearch.checkin,
              checkout: activeSearch.checkout,
              guests: activeSearch.guests,
            }
          : undefined
      }
    />
  )

  const heroHeading = heroOverride?.heading ?? configHeading ?? resolvedCategory.heroHeading
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
      activeSearch.propertyTypeLabel ||
      activeSearch.drop_off ||
      activeSearch.from ||
      activeSearch.to ||
      activeSearch.lastMinute ||
      activeSearch.vitrinTab)

  const searchResultsSection = hideListingsOnLanding && isAll && !hasActiveSearch ? null : (
    <div className={`${heroBelowContentClassName} container mt-10 lg:mt-16`}>
      <div className="flex flex-wrap items-end justify-between gap-x-2.5 gap-y-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            {listingSectionTitle
              ? listingSectionTitle
                : isAll
                ? interpolate(cat.listingsHeadingAll, {
                    count: convertNumbThousand(count),
                    category: resolvedCategory.name,
                  })
                : activeSearch?.propertyTypeLabel
                  ? interpolate(cat.listingsHeadingPropertyType ?? '{count}+ {label}', {
                      count: convertNumbThousand(count),
                      label: activeSearch.propertyTypeLabel,
                    })
                  : interpolate(cat.listingsHeadingFiltered, {
                      count: convertNumbThousand(count),
                      handle: currentHandle ?? '',
                    })}
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {interpolate(cat.pricesDisclaimer, {
              unit: effectivePriceUnit.replace(/^\//, ''),
            })}
          </p>
          {hasActiveSearch && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{cat.activeSearch}</span>
              {activeSearch?.lastMinute && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                  {cat.badgeLastMinute ?? 'Son dakika'}
                </span>
              )}
              {activeSearch?.vitrinTab === 'luxury' && (
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-900 dark:bg-violet-950/50 dark:text-violet-200">
                  {cat.badgeVitrinLuxury ?? 'Lüks'}
                </span>
              )}
              {activeSearch?.vitrinTab === 'economic' && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
                  {cat.badgeVitrinEconomic ?? 'Ekonomik'}
                </span>
              )}
              {activeSearch?.propertyTypeLabel && (
                <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-800 dark:bg-primary-900/40 dark:text-primary-200">
                  {cat.badgePropertyType ?? 'Tür:'} {activeSearch.propertyTypeLabel}
                </span>
              )}
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
            </div>
          )}
        </div>

        {mapOnMapHref && (
          <Button
            outline
            className="shrink-0 border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:border-neutral-300 dark:border-neutral-600 dark:bg-neutral-900 dark:hover:border-neutral-500"
            href={mapOnMapHref}
          >
            <span className="me-1.5">{cat.viewOnMap}</span>
            <HugeiconsIcon icon={MapsLocation01Icon} size={18} color="currentColor" strokeWidth={1.5} />
          </Button>
        )}
      </div>

      <Divider className="my-7 md:my-10" />

      {filterOptions.length > 0 &&
        (isStayRentalPage && m.categoryPage.listingFilters ? (
          <div className="relative z-30 mb-8">
          <Suspense
            fallback={
              <div className="mb-8 h-12 max-w-3xl animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
            }
          >
            <HolidayListingFilters
              locale={locale}
              messages={m.categoryPage.listingFilters}
              subcategories={stayRentalSubs}
              themeOptions={stayRentalThemeOptions.length > 0 ? stayRentalThemeOptions : undefined}
            />
          </Suspense>
          </div>
        ) : (
          <div className="relative z-30 mb-8">
            <ListingFilterTabs filterOptions={filterOptions} locale={locale} />
          </div>
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

      {listingPagination ? (
        <div className="mt-16 flex items-center justify-center">
          <Suspense fallback={<div className="h-10 w-40 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />}>
            <CategoryListingPagination
              locale={locale}
              page={listingPagination.page}
              total={listingPagination.total}
              perPage={listingPagination.perPage}
            />
          </Suspense>
        </div>
      ) : null}
    </div>
  )

  const regionSlider = resolvedRegionStats.length > 0 ? (
    <div className={`${heroBelowContentClassName} container mt-16`}>
      <h2 className="mb-6 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        {cat.exploreByRegion}
      </h2>
      <SectionSliderRegions
        regions={resolvedRegionStats}
        categoryRoute={categoryRouteVitrin}
        unit={resolvedCategory.name.toLowerCase()}
      />
    </div>
  ) : null

  // Alt kategoriler (hero altında ikon grid) — aktif hub vitrininde kart grid kullanılır
  const subcategoryItems = getSubcategoriesByParent(category.slug)
  const hasEnabledCategoryHub = resolvedModules.some(
    (m) => m.type === 'category_hub_grid' && m.enabled,
  )
  // Hub yalnızca modül açıkken /turlar kökünde; modül kapalı/kaldırılırsa tam liste dökülür
  const isTourHubLanding =
    category.slug === 'turlar' &&
    !currentHandle &&
    !hasActiveSearch &&
    hasEnabledCategoryHub
  const isCruiseHubLanding =
    category.slug === 'kruvaziyer' &&
    !currentHandle &&
    !hasActiveSearch &&
    hasEnabledCategoryHub
  const isExperienceHubLanding = isTourHubLanding || isCruiseHubLanding
  const isTourFullListingsView =
    category.slug === 'turlar' &&
    !hasActiveSearch &&
    (currentHandle === 'all' || !hasEnabledCategoryHub)
  const isCruiseFullListingsView =
    category.slug === 'kruvaziyer' &&
    !hasActiveSearch &&
    (currentHandle === 'all' || !hasEnabledCategoryHub)
  const subcategoryBelowHeadingSlot = null

  // Category landing view: hero + builder modules (her zaman resolvedModules var)
  if (isAll) {
    const nonHeroModules = resolvedModules
      .filter((m) => m.type !== 'hero')
      .filter(
        (m) =>
          ((!isTourFullListingsView && !isCruiseFullListingsView) ||
            (m.type !== 'listings_slider' && m.type !== 'listings_grid')),
      )
      .filter((m) => m.type !== 'category_hub_grid' || (!currentHandle && !hasActiveSearch))
      .map((m, i) => ({ ...m, id: m.id ?? generateModuleId(i) }))

    return (
      <div className="relative isolate overflow-x-hidden pb-28">
        <BgGlassmorphism />
        {itemListJsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
          />
        )}
        <div
          className={`${heroMosaicShellClassName} container mb-2 ${heroContainerBelowHeaderClassName}`}
        >
          <HeroSectionWithSearchForm1
            heading={heroHeadingLinked}
            description={heroDescription}
            image={heroImage}
            imageAlt={resolvedCategory.name}
            searchForm={searchForm}
            freeformBannerLayout={DEFAULT_REGION_HERO_FREEFORM}
            mosaicImages={mosaicForRegionHero}
            topSpacing="compact"
            heroMosaicBleed
            belowHeadingSlot={subcategoryBelowHeadingSlot}
          />
        </div>

        {!isExperienceHubLanding ? searchResultsSection : null}

        {!isExperienceHubLanding ? regionSlider : null}

        <div className={heroBelowContentClassName}>
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
            listingLinkBase={listingLinkBase}
            priceUnit={effectivePriceUnit}
            authors={authors}
            listingCardsById={listingCardsById}
            listingsBrowseHref={categoryPageHref}
          />
        </div>
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
    <div className="relative isolate overflow-x-hidden pb-28">
      <BgGlassmorphism />
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      <div
        className={`${heroMosaicShellClassName} container mb-2 ${heroContainerBelowHeaderClassName}`}
      >
        <HeroSectionWithSearchForm1
          heading={heroHeadingLinked}
          description={heroDescription}
          image={heroImage}
          imageAlt={resolvedCategory.name}
          searchForm={searchForm}
          freeformBannerLayout={DEFAULT_REGION_HERO_FREEFORM}
          mosaicImages={mosaicForRegionHero}
          topSpacing="compact"
          heroMosaicBleed
        />
      </div>

      {category.slug === 'turlar' && isKulturTourHubSlug(currentHandle) && !hasActiveSearch ? (
        <CategoryHubGridModule
          config={buildKulturTourHubGridConfig(locale)}
          locale={locale}
          categorySlug="kultur-turlari"
        />
      ) : null}

      {searchResultsSection}

      {regionSlider}

      {compactModules.length > 0 && (
        <div className={heroBelowContentClassName}>
          <PageBuilderRenderer modules={compactModules} category={category} locale={locale} />
        </div>
      )}
    </div>
  )
}

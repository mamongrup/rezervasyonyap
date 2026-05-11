/**
 * Bölge vitrin sayfası (kanonik TR URL: `/bolge/[...slug]`).
 *
 * - Üst hero görünümü anasayfa ile **aynı kaynak**: `loadHomepageHeroPack` (CMS ana sayfa hero görselleri / metinleri).
 * - `gallery_json` ilk görseli vb. gezi fikirleri yedeği ve OG görseli için kullanılmaya devam eder.
 * - Harici linkler için `regionPublicHref(locale, slugPath)` kullanın (`@/lib/region-public-path`).
 *
 * Eski `/location/...` rotası bu dosyayı yeniden dışa aktarır.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import BgGlassmorphism from '@/components/BgGlassmorphism'
import CategoryListingPagination from '@/components/CategoryListingPagination'
import HeroSectionWithSearchForm1 from '@/components/hero-sections/HeroSectionWithSearchForm1'
import { heroContainerBelowHeaderClassName } from '@/components/hero-sections/hero-below-header-classes'
import ListingFilterTabs from '@/components/ListingFilterTabs'
import SectionSliderRegions, { type RegionSliderItem } from '@/components/SectionSliderRegions'
import SectionSubscribe2 from '@/components/SectionSubscribe2'
import StayCard2 from '@/components/StayCard2'
import NearbyPlacesSection from '@/components/travel/NearbyPlacesSection'
import RegionNearbyPlacesVitrin from '@/components/travel/RegionNearbyPlacesVitrin'
import RegionTravelIdeasSection from '@/components/travel/RegionTravelIdeasSection'
import { resolveNearbyVitrinConfig } from '@/lib/nearby-vitrin-columns'
import type { RegionPlaceData } from '@/app/api/region-places/route'
import { CATEGORY_REGISTRY } from '@/data/category-registry'
import { getRegionDetailPageBuilderConfig } from '@/data/page-builder-config'
import { getStayListingFilterOptions } from '@/data/listings'
import { heroCategoryInlineLabel } from '@/lib/hero-category-inline-labels'
import { loadHomepageHeroPack } from '@/lib/homepage-hero-pack'
import { normalizeHrefForLocale, prefixLocale } from '@/lib/i18n-config'
import { mapPublicListingItemToListingBase } from '@/lib/listings-fetcher'
import { resolveGalleryBundleForSlug } from '@/lib/hero-gallery-slots'
import { DEFAULT_REGION_HERO_FREEFORM } from '@/lib/region-hero-freeform-defaults'
import { regionPublicHref } from '@/lib/region-public-path'
import { resolveCanonicalBaseUrl } from '@/lib/resolve-canonical-base-url'
import PageBuilderRenderer from '@/components/page-builder/PageBuilderRenderer'
import { parseTravelIdeas } from '@/lib/travel-ideas-parse'
import type { LocationPage } from '@/lib/travel-api'
import {
  getLocationPageBySlug,
  listLocationCountries,
  listLocationDestinationChildren,
  listLocationDistricts,
  listLocationRegions,
  searchPublicListings,
} from '@/lib/travel-api'
import { sanitizeRichCmsHtml } from '@/lib/sanitize-cms-html'
import { vitrinHref } from '@/lib/vitrin-href'
import { Divider } from '@/shared/divider'
import { Button } from '@/shared/Button'
import convertNumbThousand from '@/utils/convertNumbThousand'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import clsx from 'clsx'
import { preload } from 'react-dom'
import {
  Airplane02Icon,
  AnchorIcon,
  Building03Icon,
  Car05Icon,
  Compass01Icon,
  Home01Icon,
  HotAirBalloonFreeIcons,
  MapsLocation01Icon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Suspense } from 'react'

interface Props {
  params: Promise<{ locale: string; slug: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** `cat` → kategori kaydı `slug` — vitrin harita rotası için */
const REGION_TAB_CAT_TO_REGISTRY_SLUG: Record<string, string> = {
  hotel: 'oteller',
  'holiday-home': 'tatil-evleri',
  yacht: 'yat-kiralama',
  tour: 'turlar',
  activity: 'aktiviteler',
  flight: 'ucak-bileti',
  'car-rental': 'arac-kiralama',
}

/** Kayıt `slug` → hero ile aynı ikonlar (`HeroMenuCategoryBar`) */
const REGION_REGISTRY_SLUG_ICON: Record<string, IconSvgElement> = {
  oteller: Building03Icon,
  'tatil-evleri': Home01Icon,
  'yat-kiralama': AnchorIcon,
  turlar: Compass01Icon,
  aktiviteler: HotAirBalloonFreeIcons,
  'ucak-bileti': Airplane02Icon,
  'arac-kiralama': Car05Icon,
}

/** `cat` sorgu parametresi → API `category_code` */
const REGION_CAT_TO_API: Record<string, string> = {
  'holiday-home': 'holiday_home',
  hotel: 'hotel',
  tour: 'tour',
  yacht: 'yacht_charter',
  activity: 'activity',
  flight: 'flight',
  'car-rental': 'car_rental',
}

/** Kayıt `slug` → bölge liste URL `cat` kodu — hero `navOrder` ile sıralanır */
const REGION_SLUG_TO_TAB_CAT: Partial<Record<string, string>> = {
  oteller: 'hotel',
  'tatil-evleri': 'holiday-home',
  'yat-kiralama': 'yacht',
  turlar: 'tour',
  aktiviteler: 'activity',
  'ucak-bileti': 'flight',
  'arac-kiralama': 'car-rental',
}

function regionListingCategoryTabs(locale: string): { code: string; label: string }[] {
  return CATEGORY_REGISTRY.filter((c) => REGION_SLUG_TO_TAB_CAT[c.slug])
    .sort((a, b) => a.navOrder - b.navOrder)
    .map((c) => ({
      code: REGION_SLUG_TO_TAB_CAT[c.slug]!,
      label: heroCategoryInlineLabel(locale, c.slug, c.name),
    }))
}

function bolgeSubdivisionLevel(
  slug: string[],
  pageData: LocationPage | null,
): 'country' | 'province' | 'district' | null {
  const depth = slug.filter((s) => s.trim() !== '').length

  /** Kanonik URL: `/bolge/{ülke}`, `/…/{il}`, `/…/{il}/{ilçe}`, `/…/{belde}` — önce slug derinliği */
  if (depth === 1) return 'country'
  if (depth === 2) return 'province'
  if (depth === 3) return 'district'
  if (depth >= 4) return null

  const rt = pageData?.region_type
  if (rt === 'country') return 'country'
  if (rt === 'province') return 'province'
  if (rt === 'district') return 'district'
  if (rt === 'destination') return null

  return null
}

/** Gezi fikirleri yalnız il / ilçe / belde (destination); ülke vitrininde gösterilmez */
function showBolgeTravelIdeasSection(slug: string[], pageData: LocationPage | null): boolean {
  const rt = pageData?.region_type
  if (rt === 'country') return false
  if (rt === 'province' || rt === 'district' || rt === 'destination') return true
  return slug.length >= 2
}

function bolgeTravelIdeasDistanceTemplate(
  locale: string,
  slug: string[],
  pageData: LocationPage | null,
): string {
  const r = getMessages(locale).site.region
  const rt = pageData?.region_type
  if (rt === 'province') return r.travelIdeaDistanceFromProvinceCenter
  if (rt === 'district') return r.travelIdeaDistanceFromDistrictCenter
  if (rt === 'destination') return r.travelIdeaDistanceFromDestinationCenter
  if (slug.length >= 4) return r.travelIdeaDistanceFromDestinationCenter
  if (slug.length === 3) return r.travelIdeaDistanceFromDistrictCenter
  return r.travelIdeaDistanceFromProvinceCenter
}

function titleFromDestinationSlugPath(slugPath: string): string {
  const last = slugPath.split('/').pop() ?? slugPath
  return last
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/** Ülke → iller, il → ilçeler, ilçe → (varsa) yayındaki belde/destination sayfaları */
async function loadBolgeSubdivisionSlider(
  locale: string,
  slug: string[],
  slugPath: string,
  pageData: LocationPage | null,
): Promise<{ heading: string; items: RegionSliderItem[] } | null> {
  const copy = getMessages(locale).site.region
  const level = bolgeSubdivisionLevel(slug, pageData)
  if (!level) return null

  try {
    const iso = slug[0]?.trim().toUpperCase() ?? ''
    if (!iso) return null

    if (level === 'country') {
      const { countries } = await listLocationCountries()
      const country = countries.find((c) => c.iso2.trim().toUpperCase() === iso)
      if (!country) return null
      const { regions } = await listLocationRegions(country.id)
      const items: RegionSliderItem[] = regions.map((r) => ({
        name: r.name,
        slug: `${iso}/${r.slug}`,
        count: 0,
        thumbnail: '',
      }))
      return { heading: copy.subdivProvinces, items }
    }

    if (level === 'province') {
      const { countries } = await listLocationCountries()
      const country = countries.find((c) => c.iso2.trim().toUpperCase() === iso)
      if (!country) return null
      const { regions } = await listLocationRegions(country.id)
      const ps = slug[1]?.toLowerCase() ?? ''
      const region = regions.find((r) => r.slug.toLowerCase() === ps)
      if (!region) return null
      const { districts } = await listLocationDistricts(region.id)
      const items: RegionSliderItem[] = districts.map((d) => ({
        name: d.name,
        slug: `${iso}/${region.slug}/${d.slug}`,
        count: 0,
        thumbnail: '',
      }))
      return { heading: copy.subdivDistricts, items }
    }

    const { items: destItems } = await listLocationDestinationChildren(slugPath)
    if (destItems.length === 0) return null
    const items: RegionSliderItem[] = destItems.map((it) => ({
      name: (it.title && it.title.trim()) || titleFromDestinationSlugPath(it.slug_path),
      slug: it.slug_path,
      count: 0,
      thumbnail: (it.featured_image_url?.trim() || it.hero_image_url?.trim()) ?? '',
    }))
    return { heading: copy.subdivDestinations, items }
  } catch {
    return null
  }
}

// ─── Data fetchers ────────────────────────────────────────────────────────────
async function getRegionPlaces(slug: string): Promise<RegionPlaceData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/region-places?slug=${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const slugPath = slug.join('/')
  const fallbackName = slug.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')
  const page = await getLocationPageBySlug(slugPath)
  if (!page) {
    return { title: `${fallbackName} — Tatil & Gezi` }
  }
  const name = page.title ?? fallbackName
  return {
    title: page.meta_title ?? `${name} — Tatil, Gezi ve Konaklama`,
    description:
      page.meta_description ?? page.description?.slice(0, 160) ?? `${name} bölgesindeki en iyi tatil yerleri, gezilecek mekanlar ve konaklama seçenekleri.`,
    openGraph: {
      title: page.meta_title ?? `${name} — Tatil`,
      description: page.meta_description ?? page.description?.slice(0, 160),
      images: (() => {
        const slots = resolveGalleryBundleForSlug(slugPath, page.gallery_json as unknown).urls
        const first = slots.find((u) => u.trim() !== '')
        return first ? [first] : []
      })(),
    },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function RegionDetailPage({ params, searchParams }: Props) {
  const { slug, locale } = await params
  const sp = await searchParams
  const slugPath = slug.join('/')
  const regionSlug = slug.join('-')
  const regionBase = (subPath: string) => regionPublicHref(locale, subPath)

  const rawCat = sp.cat
  const catParam = typeof rawCat === 'string' ? rawCat : Array.isArray(rawCat) ? rawCat[0] : ''
  const rawPage = sp.page
  const pageStr = typeof rawPage === 'string' ? rawPage : Array.isArray(rawPage) ? rawPage[0] : '1'
  const pageNum = Math.max(1, parseInt(String(pageStr || '1'), 10) || 1)
  const categoryCode =
    catParam && REGION_CAT_TO_API[catParam] ? REGION_CAT_TO_API[catParam] : undefined

  const m = getMessages(locale)
  const cat = m.categoryPage
  const regionCategoryTabs = regionListingCategoryTabs(locale)

  const [pageData, placesData, filterOptions, heroPack] = await Promise.all([
    getLocationPageBySlug(slugPath),
    getRegionPlaces(regionSlug),
    getStayListingFilterOptions(),
    loadHomepageHeroPack(locale, m),
  ])

  if (heroPack.lcpHeroUrl) {
    preload(heroPack.lcpHeroUrl, {
      as: 'image',
      fetchPriority: 'high',
    })
  }

  const regionName =
    pageData?.title ?? slug.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')

  /** Galeri URL’leri (gezi fikirleri yedeği vb.) — hero görseli anasayfa ile aynı paketten gelir */
  const galleryUrls = pageData
    ? resolveGalleryBundleForSlug(slugPath, pageData.gallery_json as unknown).urls
    : (['', '', ''] as [string, string, string])
  const [g0] = galleryUrls

  const [listingsResult, subdivisionSlider, pbModules] = await Promise.all([
    searchPublicListings({
      location: regionName,
      perPage: 12,
      locale,
      categoryCode,
      page: pageNum > 1 ? pageNum : undefined,
    }),
    loadBolgeSubdivisionSlider(locale, slug, slugPath, pageData),
    getRegionDetailPageBuilderConfig(locale),
  ])

  const listings = listingsResult?.listings ?? []
  const totalListings = listingsResult?.total ?? 0
  const perPage = listingsResult?.per_page ?? 12

  const listingCardsData = listings.map((it) => mapPublicListingItemToListingBase(it, { locale }))

  const totalPois =
    placesData?.categories.flatMap((c) => c.types).flatMap((t) => t.places).length ?? 0

  const travelIdeas = pageData ? parseTravelIdeas(pageData.travel_ideas_json) : []

  let otellerVitrin: string
  try {
    otellerVitrin = await vitrinHref(locale, '/oteller')
  } catch {
    otellerVitrin = prefixLocale(locale, '/oteller')
  }

  const mapListingHandle =
    slug.length > 0 ? slug.map((segment) => segment.toLowerCase()).join('-') : 'all'

  const registrySlugForMap =
    catParam && REGION_TAB_CAT_TO_REGISTRY_SLUG[catParam]
      ? REGION_TAB_CAT_TO_REGISTRY_SLUG[catParam]
      : 'oteller'
  const categoryRegistryForMap = CATEGORY_REGISTRY.find((c) => c.slug === registrySlugForMap)

  let regionViewOnMapHref: string | null = null
  let regionViewOnMapExternal = false
  if (categoryRegistryForMap?.mapRoute) {
    const mapPath = `${categoryRegistryForMap.mapRoute}/${mapListingHandle}`
    try {
      regionViewOnMapHref = await vitrinHref(locale, mapPath)
    } catch {
      regionViewOnMapHref = prefixLocale(locale, mapPath)
    }
  }
  if (!regionViewOnMapHref && pageData?.map_lat && pageData?.map_lng) {
    regionViewOnMapHref = `https://www.google.com/maps?q=${pageData.map_lat},${pageData.map_lng}`
    regionViewOnMapExternal = true
  }

  const descriptionHtml = pageData?.description?.trim() ?? ''
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(descriptionHtml)

  const categoryForPb = CATEGORY_REGISTRY.find((c) => c.slug === 'oteller')

  const canonicalBase = await resolveCanonicalBaseUrl()
  const origin = canonicalBase.replace(/\/$/, '')
  const breadcrumbJsonLd =
    origin && slug.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: m.site.region.breadcrumbHome,
              item: `${origin}${normalizeHrefForLocale(locale, '/')}`,
            },
            ...slug.map((_, i) => {
              const subPath = slug.slice(0, i + 1).join('/')
              const name = i === slug.length - 1 ? regionName : titleFromDestinationSlugPath(subPath)
              const path = regionBase(subPath)
              return {
                '@type': 'ListItem' as const,
                position: i + 2,
                name,
                item: `${origin}${path.startsWith('/') ? path : `/${path}`}`,
              }
            }),
          ],
        }
      : null

  const heroSlot = (
    <section className="relative z-10 isolate">
      <div className={`container mb-6 min-w-0 overflow-x-clip ${heroContainerBelowHeaderClassName}`}>
        <HeroSectionWithSearchForm1
          heading={heroPack.heroHeadingLinked}
          image={heroPack.heroImage}
          imageAlt={heroPack.imageAlt}
          freeformBannerLayout={DEFAULT_REGION_HERO_FREEFORM}
          mosaicImages={heroPack.mosaicForRegionHero}
          searchForm={heroPack.searchForm}
          description={heroPack.heroDescription}
          topSpacing="minimal"
          heroMosaicBleed
        />
      </div>
    </section>
  )

  const breadcrumbSlot = (
    <nav className="container mb-6 min-w-0" aria-label={m.site.region.breadcrumbAriaLabel}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-1.5 gap-y-1 p-0 text-xs text-neutral-500 dark:text-neutral-400">
        <li className="flex min-w-0 items-center">
          <Link
            href={normalizeHrefForLocale(locale, '/')}
            className="hover:text-primary-600 dark:hover:text-primary-400"
          >
            {m.site.region.breadcrumbHome}
          </Link>
        </li>
        {slug.map((_, i) => {
          const isLast = i === slug.length - 1
          const segmentPath = slug.slice(0, i + 1).join('/')
          const label = isLast ? regionName : titleFromDestinationSlugPath(segmentPath)
          return (
            <li key={segmentPath} className="flex min-w-0 items-center gap-1.5">
              <span aria-hidden className="text-neutral-300 dark:text-neutral-600">
                /
              </span>
              {isLast ? (
                <span
                  className="min-w-0 font-medium text-neutral-700 dark:text-neutral-300"
                  aria-current="page"
                >
                  {label}
                </span>
              ) : (
                <Link
                  href={regionBase(segmentPath)}
                  className="min-w-0 truncate hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )

  const listingsSlot = (
    <div className="container mt-10 lg:mt-16">
      <div className="flex flex-wrap items-end justify-between gap-x-2.5 gap-y-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            {interpolate(cat.listingsHeadingFiltered, {
              count: convertNumbThousand(totalListings),
              handle: regionName,
            })}
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {interpolate(cat.pricesDisclaimer, {
              unit: 'gece',
            })}
          </p>
        </div>
      </div>

      <Divider className="my-7 md:my-10" />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
        <div className="min-w-0 flex-1 overflow-x-auto [-webkit-overflow-scrolling:touch] sm:overflow-visible">
          <div
            className="flex w-full min-w-max flex-wrap items-center gap-2 sm:gap-3"
            role="tablist"
          >
            {regionCategoryTabs.map((tab) => {
              const active = catParam === tab.code
              const href = `${regionBase(slugPath)}?cat=${encodeURIComponent(tab.code)}`
              const regSlug = REGION_TAB_CAT_TO_REGISTRY_SLUG[tab.code]
              const Icon = REGION_REGISTRY_SLUG_ICON[regSlug] ?? Home01Icon
              return (
                <Link
                  key={tab.code}
                  href={href}
                  role="tab"
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'relative inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-[border-color,box-shadow,color]',
                    active
                      ? 'border-2 border-neutral-950 bg-white text-neutral-950 shadow-sm dark:border-white dark:bg-neutral-900 dark:text-white'
                      : 'border-2 border-neutral-200 bg-white text-neutral-800 shadow-sm hover:border-neutral-300 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:border-neutral-500',
                  )}
                >
                  <HugeiconsIcon icon={Icon} className="size-[18px] shrink-0 text-current opacity-90" strokeWidth={1.5} />
                  <span className="truncate">{tab.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
        {regionViewOnMapHref ? (
          <Button
            outline
            className="shrink-0 border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:border-neutral-300 dark:border-neutral-600 dark:bg-neutral-900 dark:hover:border-neutral-500"
            href={regionViewOnMapHref}
            {...(regionViewOnMapExternal ? ({ target: '_blank', rel: 'noopener noreferrer' } as const) : {})}
          >
            <span className="me-1.5">{cat.viewOnMap}</span>
            <HugeiconsIcon icon={MapsLocation01Icon} size={18} color="currentColor" strokeWidth={1.5} />
          </Button>
        ) : null}
      </div>

      {filterOptions.length > 0 ? <ListingFilterTabs filterOptions={filterOptions} /> : null}

      {listingCardsData.length > 0 ? (
        <>
          <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 md:gap-x-8 md:gap-y-12 lg:mt-10 lg:grid-cols-3 xl:grid-cols-4">
            {listingCardsData.map((data) => (
              <StayCard2 key={data.id} data={data} />
            ))}
          </div>
          <div className="mt-16 flex items-center justify-center">
            <Suspense
              fallback={<div className="h-10 w-40 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />}
            >
              <CategoryListingPagination
                locale={locale}
                page={pageNum}
                total={totalListings}
                perPage={perPage}
              />
            </Suspense>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center py-14 text-center">
          <div className="text-5xl">🏡</div>
          <p className="mt-3 text-sm text-neutral-500">{m.site.region.noListings}</p>
        </div>
      )}
    </div>
  )

  /** Bölgeye Göre Keşfet: ülke→iller, il→ilçeler, ilçe→beldeler (`loadBolgeSubdivisionSlider`) */
  const exploreHotelsSlot =
    subdivisionSlider && subdivisionSlider.items.length > 0 ? (
      <div className="container mt-16">
        <h2 className="mb-6 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          {cat.exploreByRegion}
        </h2>
        <SectionSliderRegions
          regions={subdivisionSlider.items}
          categoryRoute={otellerVitrin}
          resolveHref={(r) => regionPublicHref(locale, r.slug)}
          unit={m.site.region.listingsSuffix}
        />
      </div>
    ) : null

  const newsletterSlot = (
    <div className="container mt-16">
      <SectionSubscribe2 />
    </div>
  )

  const aboutSlot = descriptionHtml ? (
    <section className="mt-14 border-t border-neutral-200 bg-white py-14 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="container">
        <h2 className="mb-6 text-2xl font-bold text-neutral-900 dark:text-white">{m.site.region.aboutHeading}</h2>
        {looksLikeHtml ? (
          <div
            className="prose prose-neutral max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: sanitizeRichCmsHtml(descriptionHtml) }}
          />
        ) : (
          <div className="prose prose-neutral max-w-none dark:prose-invert">
            {descriptionHtml.split('\n\n').map((para, i) => (
              <p key={i} className="mb-4 leading-relaxed text-neutral-600 dark:text-neutral-400">
                {para}
              </p>
            ))}
          </div>
        )}
      </div>
    </section>
  ) : null

  const travelIdeasSlot =
    showBolgeTravelIdeasSection(slug, pageData) ? (
      <RegionTravelIdeasSection
        ideas={travelIdeas}
        locale={locale}
        distanceTemplate={bolgeTravelIdeasDistanceTemplate(locale, slug, pageData)}
        regionName={regionName}
        regionImageUrl={
          pageData?.travel_ideas_image_url?.trim() ||
          pageData?.featured_image_url?.trim() ||
          pageData?.hero_image_url?.trim() ||
          (g0.trim() ? g0 : null)
        }
      />
    ) : null

  const nearbyVitrinCfg = resolveNearbyVitrinConfig(locale, pageData?.nearby_vitrin_columns_json)

  const placesVitrinSlot =
    placesData ? (
      <RegionNearbyPlacesVitrin placesData={placesData} config={nearbyVitrinCfg} locale={locale} />
    ) : null

  const nearbySlot =
    totalPois > 0 && placesData ? (
      <div className="bg-neutral-50 py-12 dark:bg-neutral-950">
        <div className="container">
          <NearbyPlacesSection
            locale={locale}
            initialData={placesData}
            title={`${regionName} — ${m.site.region.nearbySectionTitle}`}
          />
        </div>
      </div>
    ) : null

  const mapSlot =
    (pageData?.map_lat && pageData?.map_lng) || placesData?.coordinates ? (
      <div className="bg-white py-10 dark:bg-neutral-900">
        <div className="container">
          <h2 className="mb-4 text-xl font-semibold text-neutral-900 dark:text-white">
            {m.site.region.locationHeading}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-neutral-100 shadow-sm dark:border-neutral-700">
            <iframe
              title={`${regionName} map`}
              width="100%"
              height="360"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              src={`https://www.google.com/maps/embed/v1/view?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''}&center=${pageData?.map_lat ?? String(placesData?.coordinates.lat)},${pageData?.map_lng ?? String(placesData?.coordinates.lng)}&zoom=${pageData?.map_zoom ?? 12}`}
            />
          </div>
        </div>
      </div>
    ) : null

  const emptyHintSlot =
    !pageData && listings.length === 0 && totalPois === 0 ? (
      <div className="container flex flex-col items-center py-20 text-center">
        <div className="text-5xl">📍</div>
        <h2 className="mt-4 text-xl font-semibold text-neutral-900 dark:text-white">{regionName}</h2>
        <p className="mt-2 max-w-md text-sm text-neutral-500">{m.site.region.noContentYet}</p>
        <Link
          href={normalizeHrefForLocale(locale, '/manage/regions')}
          className="mt-6 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
        >
          {m.site.region.goToRegionAdmin}
        </Link>
      </div>
    ) : null

  const subdivisionsSlot = null

  return (
    <main className="relative isolate min-w-0 overflow-x-hidden min-h-screen pb-28">
      <BgGlassmorphism />

      {breadcrumbJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      ) : null}

      {categoryForPb ? (
        <PageBuilderRenderer
          modules={pbModules}
          category={categoryForPb}
          locale={locale}
          layoutVariant="region_detail"
          pageKey="bolge-detay"
          regionSlots={{
            hero: heroSlot,
            breadcrumb: breadcrumbSlot,
            listings: listingsSlot,
            exploreHotels: exploreHotelsSlot,
            newsletter: newsletterSlot,
            about: aboutSlot,
            travelIdeas: travelIdeasSlot,
            placesVitrin: placesVitrinSlot,
            nearby: nearbySlot,
            map: mapSlot,
            emptyHint: emptyHintSlot,
            subdivisions: subdivisionsSlot,
          }}
        />
      ) : null}
    </main>
  )
}

/**
 * Bölge vitrin sayfası (kanonik TR URL: `/bolge/[...slug]`).
 *
 * - Yönetim panelinde kayıtlı **3 hero görseli** `gallery_json` üzerinden gelir; `resolveGalleryBundleForSlug`
 *   ile mozaik veya (varsa) freeform banner düzeni uygulanır.
 * - Harici linkler için `regionPublicHref(locale, slugPath)` kullanın (`@/lib/region-public-path`).
 *
 * Eski `/location/...` rotası bu dosyayı yeniden dışa aktarır.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import CategoryListingPagination from '@/components/CategoryListingPagination'
import HeroSearchForm from '@/components/HeroSearchForm/HeroSearchFormLazy'
import HeroSectionWithSearchForm1 from '@/components/hero-sections/HeroSectionWithSearchForm1'
import { heroContainerBelowHeaderClassName } from '@/components/hero-sections/hero-below-header-classes'
import ListingFilterTabs from '@/components/ListingFilterTabs'
import SectionSliderRegions from '@/components/SectionSliderRegions'
import SectionSubscribe2 from '@/components/SectionSubscribe2'
import StayCard2 from '@/components/StayCard2'
import NearbyPlacesSection from '@/components/travel/NearbyPlacesSection'
import RegionTravelIdeasSection from '@/components/travel/RegionTravelIdeasSection'
import type { RegionPlaceData } from '@/app/api/region-places/route'
import { getStayListingFilterOptions } from '@/data/listings'
import heroRightStay from '@/images/hero-right.png'
import { normalizeHrefForLocale, prefixLocale } from '@/lib/i18n-config'
import { mapPublicListingItemToListingBase } from '@/lib/listings-fetcher'
import { resolveGalleryBundleForSlug } from '@/lib/hero-gallery-slots'
import { regionPublicHref } from '@/lib/region-public-path'
import { parseTravelIdeas } from '@/lib/travel-ideas-parse'
import {
  getLocationPageBySlug,
  getPublicRegionStats,
  searchPublicListings,
} from '@/lib/travel-api'
import { sanitizeRichCmsHtml } from '@/lib/sanitize-cms-html'
import { vitrinHref } from '@/lib/vitrin-href'
import { Divider } from '@/shared/divider'
import convertNumbThousand from '@/utils/convertNumbThousand'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import clsx from 'clsx'
import { Suspense } from 'react'

interface Props {
  params: Promise<{ locale: string; slug: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Kategori sekmesi → API `category_code` */
const REGION_CAT_TO_API: Record<string, string> = {
  'holiday-home': 'holiday_home',
  hotel: 'hotel',
  tour: 'tour',
  yacht: 'yacht_charter',
  activity: 'activity',
}

const CATEGORY_TABS = [
  { code: '', label: 'Tümü' },
  { code: 'holiday-home', label: 'Villa & Kiralık' },
  { code: 'hotel', label: 'Otel' },
  { code: 'tour', label: 'Tur' },
  { code: 'yacht', label: 'Tekne' },
  { code: 'activity', label: 'Aktivite' },
]

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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

  const [pageData, placesData, filterOptions, regionStats] = await Promise.all([
    getLocationPageBySlug(slugPath),
    getRegionPlaces(regionSlug),
    getStayListingFilterOptions(),
    getPublicRegionStats('hotel', 12, { next: { revalidate: 300 } } as RequestInit).catch(() => []),
  ])

  const regionName =
    pageData?.title ?? slug.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')

  /** Galeri URL’leri [1., 2., 3. görsel]; `layout` varsa serbest yerleşim + `slotIndex` eşlemesi */
  const { urls: galleryUrls, layout: heroFreeformLayout } = pageData
    ? resolveGalleryBundleForSlug(slugPath, pageData.gallery_json as unknown)
    : { urls: ['', '', ''] as [string, string, string], layout: null }
  const [g0, g1, g2] = galleryUrls
  const hasAnyMosaicSlot = !!(g0 || g1 || g2)
  const mosaicTuple: [string, string, string] | undefined = hasAnyMosaicSlot ? [g0, g1, g2] : undefined

  const listingsResult = await searchPublicListings({
    location: regionName,
    perPage: 12,
    locale,
    categoryCode,
    page: pageNum > 1 ? pageNum : undefined,
  })

  const listings = listingsResult?.listings ?? []
  const totalListings = listingsResult?.total ?? 0
  const perPage = listingsResult?.per_page ?? 12

  const listingCardsData = listings.map(mapPublicListingItemToListingBase)

  const totalPois =
    placesData?.categories.flatMap((c) => c.types).flatMap((t) => t.places).length ?? 0

  const travelIdeas = pageData ? parseTravelIdeas(pageData.travel_ideas_json) : []

  const heroDescription = (
    <div className="flex flex-wrap items-center gap-x-2 text-base font-medium text-neutral-500 md:text-lg dark:text-neutral-400">
      <i className="las la-map-marked text-2xl" />
      <span>
        <span className="text-neutral-500 dark:text-neutral-400">{regionName} — </span>
        <span className="text-neutral-900 dark:text-neutral-100">
          {convertNumbThousand(totalListings)}+ {m.site.region.listingsSuffix}
        </span>
      </span>
      {totalPois > 0 ? (
        <span className="ms-1 text-sm text-neutral-400">
          · {totalPois} {m.site.region.nearbyPlaces}
        </span>
      ) : null}
    </div>
  )

  let otellerVitrin: string
  try {
    otellerVitrin = await vitrinHref(locale, '/oteller')
  } catch {
    otellerVitrin = prefixLocale(locale, '/oteller')
  }

  const descriptionHtml = pageData?.description?.trim() ?? ''
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(descriptionHtml)

  return (
    <div className="min-h-screen pb-28">
      <div className={`relative container mb-6 ${heroContainerBelowHeaderClassName}`}>
        <nav className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
          <Link href={normalizeHrefForLocale(locale, '/')} className="hover:text-primary-600">
            {m.site.region.breadcrumbHome}
          </Link>
          <span>/</span>
          {slug.length > 1
            ? slug.slice(0, -1).map((s, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <Link
                    href={regionBase(slug.slice(0, i + 1).join('/'))}
                    className="hover:text-primary-600 capitalize"
                  >
                    {s}
                  </Link>
                  <span>/</span>
                </span>
              ))
            : null}
          <span className="font-medium text-neutral-700 capitalize dark:text-neutral-300">
            {slug[slug.length - 1]}
          </span>
        </nav>

        <HeroSectionWithSearchForm1
          heading={`<span>${escapeHtml(regionName)}</span>`}
          description={heroDescription}
          image={heroRightStay}
          imageAlt={regionName}
          searchForm={
            <HeroSearchForm initTab="Stays" locale={locale} hideVerticalTabs />
          }
          topSpacing="minimal"
          searchFormOffsetYPx={-30}
          heroMosaicBleed
          freeformBannerLayout={heroFreeformLayout ?? undefined}
          mosaicImages={mosaicTuple}
          overrideImage={
            !mosaicTuple && g0.trim()
              ? { src: g0, width: 1200, height: 900 }
              : !mosaicTuple && pageData?.hero_image_url
                ? { src: pageData.hero_image_url, width: 1200, height: 900 }
                : undefined
          }
        />
      </div>

      {/* İlanlar — kategori şablonu ile aynı yapı */}
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
          {pageData?.map_lat && pageData?.map_lng ? (
            <a
              href={`https://www.google.com/maps?q=${pageData.map_lat},${pageData.map_lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary-600 hover:underline dark:text-sky-400"
            >
              🗺️ {m.site.region.viewOnMap}
            </a>
          ) : null}
        </div>

        <Divider className="my-7 md:my-10" />

        {/* Kategori hızlı sekmeleri */}
        <div className="mb-8 flex flex-wrap gap-2">
          {CATEGORY_TABS.map((tab) => {
            const active = catParam === tab.code || (!catParam && tab.code === '')
            const href =
              tab.code === ''
                ? regionBase(slugPath)
                : `${regionBase(slugPath)}?cat=${encodeURIComponent(tab.code)}`
            return (
              <Link
                key={tab.code || 'all'}
                href={href}
                className={clsx(
                  'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary-500 bg-primary-50 text-primary-800 dark:border-primary-400/50 dark:bg-primary-950/40 dark:text-primary-200'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-primary-400 hover:text-primary-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
                )}
              >
                {tab.label}
              </Link>
            )
          })}
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
            <p className="mt-3 text-sm text-neutral-500">
              {m.site.region.noListings}
            </p>
          </div>
        )}
      </div>

      {/* Keşfet — kategori sayfasındaki bölge slider */}
      {regionStats.length > 0 ? (
        <div className="container mt-16">
          <h2 className="mb-6 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            {cat.exploreByRegion}
          </h2>
          <SectionSliderRegions regions={regionStats} categoryRoute={otellerVitrin} unit="otel" />
        </div>
      ) : null}

      {/* Bülten — kategori vitrinindeki blok */}
      <div className="container mt-16">
        <SectionSubscribe2 />
      </div>

      {/* Bölge tanıtımı */}
      {descriptionHtml ? (
        <section className="mt-14 border-t border-neutral-200 bg-white py-14 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="container">
            <h2 className="mb-6 text-2xl font-bold text-neutral-900 dark:text-white">
              {m.site.region.aboutHeading}
            </h2>
            {looksLikeHtml ? (
              <div
                className="prose prose-neutral max-w-3xl dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: sanitizeRichCmsHtml(descriptionHtml) }}
              />
            ) : (
              <div className="prose prose-neutral max-w-3xl dark:prose-invert">
                {descriptionHtml.split('\n\n').map((para, i) => (
                  <p key={i} className="mb-4 leading-relaxed text-neutral-600 dark:text-neutral-400">
                    {para}
                  </p>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      <RegionTravelIdeasSection ideas={travelIdeas} locale={locale} />

      {totalPois > 0 && placesData ? (
        <div className="bg-neutral-50 py-12 dark:bg-neutral-950">
          <div className="container">
            <NearbyPlacesSection
              initialData={placesData}
              title={`${regionName} — ${m.site.region.nearbySectionTitle}`}
            />
          </div>
        </div>
      ) : null}

      {(pageData?.map_lat && pageData?.map_lng) || placesData?.coordinates ? (
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
      ) : null}

      {!pageData && listings.length === 0 && totalPois === 0 ? (
        <div className="container flex flex-col items-center py-20 text-center">
          <div className="text-5xl">📍</div>
          <h2 className="mt-4 text-xl font-semibold text-neutral-900 dark:text-white">{regionName}</h2>
          <p className="mt-2 max-w-md text-sm text-neutral-500">
            {m.site.region.noContentYet}
          </p>
          <Link
            href={normalizeHrefForLocale(locale, '/manage/regions')}
            className="mt-6 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            {m.site.region.goToRegionAdmin}
          </Link>
        </div>
      ) : null}
    </div>
  )
}

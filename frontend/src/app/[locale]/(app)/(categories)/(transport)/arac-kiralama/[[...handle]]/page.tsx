import CategoryPageTemplate from '@/components/CategoryPageTemplate'
import { CarRentalCard } from '@/components/cards'
import { getCategoryBySlug } from '@/data/category-registry'
import { getCarListingFilterOptions } from '@/data/listings'
import { getRegionHeroConfig } from '@/data/region-hero-config'
import { resolveCategoryDisplay } from '@/lib/localized-category'
import { regionHandleFromParams } from '@/lib/region-handle-path'
import { loadCategoryPageListingsBundle } from '@/lib/category-page-data'
import { fetchCategoryListings, parseSearchParamsFromUrl } from '@/lib/listings-fetcher'
import { ensureCarRentalCheckout } from '@/lib/yolcu360-cars'
import { fetchYolcu360CarListings } from '@/lib/yolcu360-car-search'
import { getMessages } from '@/utils/getT'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { regionLabelFromHandle } from '@/lib/stay-location-display'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale?: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const raw = getCategoryBySlug('arac-kiralama')
  const category = raw ? resolveCategoryDisplay(raw, locale ?? 'tr') : null
  return {
    title: category?.name ?? getMessages(locale).categoryPage.verticalLabels.car_rental,
    description: category?.heroSubheading,
  }
}

function selectedCarSearchQuery(
  sp: Record<string, string | string[] | undefined>,
): string {
  const qs = new URLSearchParams()
  for (const key of [
    'location',
    'checkin',
    'checkout',
    'drop_off',
    'drop_off_location',
    'guests',
    'page',
  ] as const) {
    const v = sp[key]
    if (typeof v === 'string' && v.trim()) qs.set(key, v.trim())
  }
  return qs.toString()
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ handle?: string[]; locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { handle, locale } = await params
  const sp = await searchParams
  const selectedQuery = selectedCarSearchQuery(sp)
  if (!handle?.length) {
    redirect(`/${locale}/arac-kiralama/all${selectedQuery ? `?${selectedQuery}` : ''}`)
  }
  const currentHandle = regionHandleFromParams(handle)
  const rawCategory = getCategoryBySlug('arac-kiralama')
  if (!rawCategory) return redirect('/')
  const category = resolveCategoryDisplay(rawCategory, locale)

  const query = parseSearchParamsFromUrl(sp)
  const isCarLandingWithoutSearch = currentHandle === 'all' && !selectedQuery

  // Arama parametresi varsa Yolcu360'ı dene; yoksa ya da başarısızsa DB'ye geç
  const pickup = (typeof sp['location'] === 'string' ? sp['location'] : '') ?? ''
  const dropoff = (typeof sp['drop_off_location'] === 'string' ? sp['drop_off_location'] : pickup) ?? pickup
  const checkin = (typeof sp['checkin'] === 'string' ? sp['checkin'] : '') ?? ''
  const checkoutRaw = (typeof sp['checkout'] === 'string' ? sp['checkout'] : '') ?? ''
  const checkout = ensureCarRentalCheckout(checkin, checkoutRaw)
  const hasSearchQuery = !!(pickup && checkin && checkout)

  let filterOptions: Awaited<ReturnType<typeof getCarListingFilterOptions>>
  let heroOverride: Awaited<ReturnType<typeof getRegionHeroConfig>>
  let dbListings: Awaited<ReturnType<typeof fetchCategoryListings>>['listings'] = []
  let dbTotal = 0
  let page = 1
  let perPage = 12
  let fromApi = false
  let yolcu360Cars: Awaited<ReturnType<typeof fetchYolcu360CarListings>> | null = null

  if (hasSearchQuery) {
    const [y360, filterOpts, hero] = await Promise.all([
      fetchYolcu360CarListings(
        { pickup, dropoff, checkin, checkout },
        { includeDetailQuery: true },
      ),
      getCarListingFilterOptions(),
      getRegionHeroConfig('arac-kiralama', currentHandle ?? ''),
    ])
    yolcu360Cars = y360
    filterOptions = filterOpts
    heroOverride = hero

    if (!yolcu360Cars?.length) {
      const db = await fetchCategoryListings('arac-kiralama', query, { regionHandle: currentHandle })
      dbListings = db.listings
      dbTotal = db.total
      page = db.page
      perPage = db.perPage
      fromApi = db.fromApi
    }
  } else {
    const bundle = await loadCategoryPageListingsBundle(
      'arac-kiralama',
      query,
      { regionHandle: currentHandle },
      locale,
      getCarListingFilterOptions(),
    )
    filterOptions = bundle.filterOptions
    heroOverride = bundle.heroOverride
    dbListings = bundle.result.listings
    dbTotal = bundle.result.total
    page = bundle.result.page
    perPage = bundle.result.perPage
    fromApi = bundle.result.fromApi
  }

  const fromYolcu360 = yolcu360Cars !== null && yolcu360Cars.length > 0
  const listings = isCarLandingWithoutSearch
    ? []
    : fromYolcu360
      ? yolcu360Cars!
      : dbListings
  const total = fromYolcu360 ? yolcu360Cars!.length : dbTotal

  const regionLabel =
    currentHandle && currentHandle !== 'all' ? regionLabelFromHandle(currentHandle) : undefined

  return (
    <CategoryPageTemplate
      category={category}
      count={total}
      listingCards={listings.map((l) => (
        <CarRentalCard key={l.id} data={l as any} />
      ))}
      listingCardRenderer={(l) => <CarRentalCard key={l.id} data={l as any} />}
      filterOptions={filterOptions}
      currentHandle={currentHandle}
      locale={locale}
      heroOverride={heroOverride}
      modules={
        isCarLandingWithoutSearch
          ? [
              { id: 'car-why-us', type: 'why_us', enabled: true, order: 1, config: {} },
              { id: 'car-newsletter', type: 'newsletter', enabled: true, order: 2, config: {} },
            ]
          : undefined
      }
      isSearchResults={hasSearchQuery || (!!currentHandle && currentHandle !== 'all')}
      allListings={listings}
      listingLinkBase={category.detailRoute}
      priceUnit={category.priceUnit}
      hideListingsOnLanding={isCarLandingWithoutSearch}
      activeSearch={{
        location: query.location,
        checkin: query.checkin,
        checkout: checkout || query.checkout,
        guests: query.guests,
        drop_off: query.drop_off,
        regionLabel,
        fromApi: fromYolcu360 ? true : fromApi,
      }}
      listingPagination={isCarLandingWithoutSearch ? undefined : { page, total, perPage }}
    />
  )
}

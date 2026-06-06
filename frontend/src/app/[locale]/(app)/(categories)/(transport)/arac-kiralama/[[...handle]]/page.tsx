import CategoryPageTemplate from '@/components/CategoryPageTemplate'
import { CarRentalCard } from '@/components/cards'
import { getCategoryBySlug } from '@/data/category-registry'
import { getCarListingFilterOptions } from '@/data/listings'
import { getRegionHeroConfig } from '@/data/region-hero-config'
import { regionHandleFromParams } from '@/lib/region-handle-path'
import { fetchCategoryListings, parseSearchParamsFromUrl } from '@/lib/listings-fetcher'
import { ensureCarRentalCheckout } from '@/lib/yolcu360-cars'
import { fetchYolcu360CarListings } from '@/lib/yolcu360-car-search'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export async function generateMetadata(): Promise<Metadata> {
  const category = getCategoryBySlug('arac-kiralama')
  return { title: category?.name ?? 'Araç Kiralama', description: category?.heroSubheading }
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
  const category = getCategoryBySlug('arac-kiralama')
  if (!category) return redirect('/')

  const query = parseSearchParamsFromUrl(sp)
  const isCarLandingWithoutSearch = currentHandle === 'all' && !selectedQuery

  // Arama parametresi varsa Yolcu360'ı dene; yoksa ya da başarısızsa DB'ye geç
  const pickup = (typeof sp['location'] === 'string' ? sp['location'] : '') ?? ''
  const dropoff = (typeof sp['drop_off_location'] === 'string' ? sp['drop_off_location'] : pickup) ?? pickup
  const checkin = (typeof sp['checkin'] === 'string' ? sp['checkin'] : '') ?? ''
  const checkoutRaw = (typeof sp['checkout'] === 'string' ? sp['checkout'] : '') ?? ''
  const checkout = ensureCarRentalCheckout(checkin, checkoutRaw)
  const hasSearchQuery = !!(pickup && checkin && checkout)

  const yolcu360Cars = hasSearchQuery
    ? await fetchYolcu360CarListings(
        { pickup, dropoff, checkin, checkout },
        { includeDetailQuery: true },
      )
    : null

  const fromYolcu360 = yolcu360Cars !== null && yolcu360Cars.length > 0

  const { listings: dbListings, total: dbTotal, page, perPage, fromApi } = fromYolcu360
    ? { listings: [], total: 0, page: 1, perPage: 12, fromApi: false }
    : await fetchCategoryListings('arac-kiralama', query, { regionHandle: currentHandle })

  const listings = isCarLandingWithoutSearch
    ? []
    : fromYolcu360
      ? yolcu360Cars
      : dbListings
  const total = fromYolcu360 ? yolcu360Cars.length : dbTotal

  const [filterOptions, heroOverride] = await Promise.all([
    getCarListingFilterOptions(),
    getRegionHeroConfig('arac-kiralama', currentHandle ?? ''),
  ])

  const regionLabel =
    currentHandle && currentHandle !== 'all' ? currentHandle.replace(/-/g, ' ') : undefined

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

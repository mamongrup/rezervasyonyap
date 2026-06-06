import CategoryPageTemplate from '@/components/CategoryPageTemplate'
import { CarRentalCard } from '@/components/cards'
import { getCategoryBySlug } from '@/data/category-registry'
import { getCarListingFilterOptions } from '@/data/listings'
import { getRegionHeroConfig } from '@/data/region-hero-config'
import { regionHandleFromParams } from '@/lib/region-handle-path'
import { fetchCategoryListings, parseSearchParamsFromUrl } from '@/lib/listings-fetcher'
import { apiOriginForFetch } from '@/lib/api-origin'
import type { TListingBase } from '@/types/listing-types'
import {
  ensureCarRentalCheckout,
  mapYolcu360CarToListing,
  normalizeYolcu360Cars,
} from '@/lib/yolcu360-cars'
import { normalizeYolcu360PickupQuery } from '@/lib/yolcu360-location-query'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export async function generateMetadata(): Promise<Metadata> {
  const category = getCategoryBySlug('arac-kiralama')
  return { title: category?.name ?? 'Araç Kiralama', description: category?.heroSubheading }
}

function ymdFromToday(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function carDefaultSearchQuery(): string {
  const qs = new URLSearchParams({
    location: 'Istanbul',
    checkin: ymdFromToday(30),
    checkout: ymdFromToday(33),
    drop_off: 'same',
  })
  return qs.toString()
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

async function fetchYolcu360Cars(
  pickup: string,
  dropoff: string,
  checkin: string,
  checkout: string,
): Promise<(TListingBase & { seats?: number; gearshift?: string })[] | null> {
  const apiBase = apiOriginForFetch()
  if (!apiBase || !pickup || !checkin || !checkout) return null
  try {
    const pickupNorm = normalizeYolcu360PickupQuery(pickup)
    const dropoffNorm = normalizeYolcu360PickupQuery(dropoff || pickup)
    const params = new URLSearchParams({
      pickup: pickupNorm,
      dropoff: dropoffNorm,
      checkin,
      checkout,
    })
    const res = await fetch(
      `${apiBase}/api/v1/public/yolcu360/cars?${params.toString()}`,
      { cache: 'no-store' },
    )
    if (res.status === 503) return null // etkin değil — DB'ye düş
    if (!res.ok) return null
    const data = (await res.json()) as unknown
    const raw = normalizeYolcu360Cars(data)
    if (raw.length === 0) return null
    return raw.map((c, i) => mapYolcu360CarToListing(c, i))
  } catch {
    return null
  }
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
    redirect(`/${locale}/arac-kiralama/all?${selectedQuery || carDefaultSearchQuery()}`)
  }
  if (handle.length === 1 && handle[0] === 'all' && !selectedQuery) {
    redirect(`/${locale}/arac-kiralama/all?${carDefaultSearchQuery()}`)
  }
  const currentHandle = regionHandleFromParams(handle)
  const category = getCategoryBySlug('arac-kiralama')
  if (!category) return redirect('/')

  const query = parseSearchParamsFromUrl(sp)

  // Arama parametresi varsa Yolcu360'ı dene; yoksa ya da başarısızsa DB'ye geç
  const pickup = (typeof sp['location'] === 'string' ? sp['location'] : '') ?? ''
  const dropoff = (typeof sp['drop_off_location'] === 'string' ? sp['drop_off_location'] : pickup) ?? pickup
  const checkin = (typeof sp['checkin'] === 'string' ? sp['checkin'] : '') ?? ''
  const checkoutRaw = (typeof sp['checkout'] === 'string' ? sp['checkout'] : '') ?? ''
  const checkout = ensureCarRentalCheckout(checkin, checkoutRaw)
  const hasSearchQuery = !!(pickup && checkin && checkout)

  const yolcu360Cars = hasSearchQuery
    ? await fetchYolcu360Cars(pickup, dropoff, checkin, checkout)
    : null

  const fromYolcu360 = yolcu360Cars !== null && yolcu360Cars.length > 0

  const { listings: dbListings, total: dbTotal, page, perPage, fromApi } = fromYolcu360
    ? { listings: [], total: 0, page: 1, perPage: 12, fromApi: false }
    : await fetchCategoryListings('arac-kiralama', query, { regionHandle: currentHandle })

  const listings = fromYolcu360 ? yolcu360Cars : dbListings
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
      isSearchResults={hasSearchQuery || (!!currentHandle && currentHandle !== 'all')}
      allListings={listings}
      listingLinkBase={category.detailRoute}
      priceUnit={category.priceUnit}
      activeSearch={{
        location: query.location,
        checkin: query.checkin,
        checkout: checkout || query.checkout,
        guests: query.guests,
        drop_off: query.drop_off,
        regionLabel,
        fromApi: fromYolcu360 ? true : fromApi,
      }}
      listingPagination={{ page, total, perPage }}
    />
  )
}

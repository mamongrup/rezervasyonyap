import CategoryPageTemplate from '@/components/CategoryPageTemplate'
import { CarRentalCard } from '@/components/cards'
import { getCategoryBySlug } from '@/data/category-registry'
import { getCarListingFilterOptions } from '@/data/listings'
import { getRegionHeroConfig } from '@/data/region-hero-config'
import { regionHandleFromParams } from '@/lib/region-handle-path'
import { fetchCategoryListings, parseSearchParamsFromUrl } from '@/lib/listings-fetcher'
import { apiOriginForFetch } from '@/lib/api-origin'
import type { TListingBase } from '@/types/listing-types'
import type { Yolcu360Car } from '@/app/api/yolcu360-cars/route'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export async function generateMetadata(): Promise<Metadata> {
  const category = getCategoryBySlug('arac-kiralama')
  return { title: category?.name ?? 'Araç Kiralama', description: category?.heroSubheading }
}

/** Yolcu360 araç yanıtını TListingBase'e dönüştürür */
function mapYolcu360Car(car: Yolcu360Car, index: number): TListingBase & {
  seats?: number; gearshift?: string
} {
  const brand = String(car.brand ?? '')
  const model = String(car.model ?? '')
  const title = [brand, model].filter(Boolean).join(' ') || `Araç ${index + 1}`
  const slug = `yolcu360-${String(car.id ?? index)}`
  const price = car.dailyPrice
    ? new Intl.NumberFormat('tr-TR', { style: 'decimal', maximumFractionDigits: 0 })
        .format(car.dailyPrice) + ' ' + (car.currency ?? 'TRY')
    : undefined

  return {
    id: slug,
    handle: slug,
    title,
    price,
    priceAmount: car.dailyPrice,
    priceCurrency: car.currency ?? 'TRY',
    featuredImage: car.imageUrl ?? car.thumbnailUrl ?? '',
    listingCategory: 'Araç Kiralama',
    listingVertical: 'car_rental',
    reviewStart: 0,
    reviewCount: 0,
    seats: typeof car.seats === 'number' ? car.seats : undefined,
    gearshift: car.transmission,
    isNew: false,
  }
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
    const params = new URLSearchParams({ pickup, dropoff: dropoff || pickup, checkin, checkout })
    const res = await fetch(
      `${apiBase}/api/v1/public/yolcu360/cars?${params.toString()}`,
      { cache: 'no-store' },
    )
    if (res.status === 503) return null // etkin değil — DB'ye düş
    if (!res.ok) return null
    const data = (await res.json()) as unknown
    // Dizi ya da obje içindeki dizi
    const raw: Yolcu360Car[] = Array.isArray(data)
      ? (data as Yolcu360Car[])
      : (data as Record<string, unknown>)['cars'] as Yolcu360Car[] ?? []
    if (!Array.isArray(raw) || raw.length === 0) return null
    return raw.map((c, i) => mapYolcu360Car(c, i))
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
  const currentHandle = regionHandleFromParams(handle)
  const category = getCategoryBySlug('arac-kiralama')
  if (!category) return redirect('/')

  const query = parseSearchParamsFromUrl(sp)

  // Arama parametresi varsa Yolcu360'ı dene; yoksa ya da başarısızsa DB'ye geç
  const pickup = (typeof sp['location'] === 'string' ? sp['location'] : '') ?? ''
  const dropoff = (typeof sp['drop_off_location'] === 'string' ? sp['drop_off_location'] : pickup) ?? pickup
  const checkin = (typeof sp['checkin'] === 'string' ? sp['checkin'] : '') ?? ''
  const checkout = (typeof sp['checkout'] === 'string' ? sp['checkout'] : '') ?? ''
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
        checkout: query.checkout,
        guests: query.guests,
        drop_off: query.drop_off,
        regionLabel,
        fromApi: fromYolcu360 ? true : fromApi,
      }}
      listingPagination={{ page, total, perPage }}
    />
  )
}

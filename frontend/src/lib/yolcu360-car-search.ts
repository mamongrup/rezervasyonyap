import { apiOriginForFetch } from '@/lib/api-origin'
import type { TListingBase } from '@/types/listing-types'
import {
  ensureCarRentalCheckout,
  mapYolcu360CarToListing,
  normalizeYolcu360Cars,
} from '@/lib/yolcu360-cars'
import { normalizeYolcu360PickupQuery } from '@/lib/yolcu360-location-query'

export type Yolcu360Listing = TListingBase & {
  seats?: number
  gearshift?: string
  yolcu360RawId?: string
  yolcu360TotalPrice?: number
  yolcu360FuelType?: string
  yolcu360VendorName?: string
  yolcu360Bags?: number
}

function firstQueryString(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? ''
}

export type Yolcu360SearchInput = {
  pickup: string
  dropoff?: string
  checkin: string
  checkout?: string
}

export function yolcu360SearchParams(input: Yolcu360SearchInput): URLSearchParams {
  const pickup = normalizeYolcu360PickupQuery(input.pickup)
  const dropoff = normalizeYolcu360PickupQuery(input.dropoff || pickup)
  const checkout = ensureCarRentalCheckout(input.checkin, input.checkout)
  return new URLSearchParams({
    pickup,
    dropoff: dropoff || pickup,
    checkin: input.checkin,
    checkout,
  })
}

export function yolcu360DetailQuery(
  input: Yolcu360SearchInput,
  car?: { index: number; rawId: string },
): string {
  const qs = new URLSearchParams()
  const pickup = normalizeYolcu360PickupQuery(input.pickup)
  const dropoff = normalizeYolcu360PickupQuery(input.dropoff)
  const checkout = ensureCarRentalCheckout(input.checkin, input.checkout)
  if (pickup) qs.set('location', pickup)
  if (input.checkin) qs.set('checkin', input.checkin)
  if (checkout) qs.set('checkout', checkout)
  if (dropoff && dropoff !== pickup) qs.set('drop_off_location', dropoff)
  qs.set('drop_off', dropoff && dropoff !== pickup ? 'different' : 'same')
  if (car) {
    qs.set('y360_idx', String(car.index))
    if (car.rawId) qs.set('y360_code', car.rawId)
  }
  return qs.toString()
}

/** Detay sayfasında arama sonuçlarından doğru Yolcu360 kartını bulur. */
export function findYolcu360Listing(
  cars: Yolcu360Listing[],
  handle: string,
  searchParams: Record<string, string | string[] | undefined>,
): Yolcu360Listing | undefined {
  const idxFromQuery = Number.parseInt(firstQueryString(searchParams.y360_idx), 10)
  const codeFromQuery = firstQueryString(searchParams.y360_code)

  if (Number.isFinite(idxFromQuery) && idxFromQuery >= 0 && cars[idxFromQuery]) {
    return cars[idxFromQuery]
  }

  if (codeFromQuery) {
    const byCode = cars.find((c) => c.yolcu360RawId === codeFromQuery)
    if (byCode) return byCode
  }

  const idxFromHandle = handle.match(/^yolcu360-(\d+)$/)
  if (idxFromHandle) {
    const i = Number.parseInt(idxFromHandle[1], 10)
    if (Number.isFinite(i) && cars[i]) return cars[i]
  }

  const legacyTail = handle.startsWith('yolcu360-') ? handle.slice('yolcu360-'.length) : ''
  if (legacyTail) {
    const byLegacy = cars.find(
      (c) =>
        c.yolcu360RawId === legacyTail ||
        c.id === handle ||
        c.handle === handle ||
        c.handle.split('?')[0] === handle,
    )
    if (byLegacy) return byLegacy
  }

  return cars.find((c) => c.id === handle || c.handle === handle)
}

export async function fetchYolcu360CarListings(
  input: Yolcu360SearchInput,
  options: { includeDetailQuery?: boolean } = {},
): Promise<Yolcu360Listing[] | null> {
  const apiBase = apiOriginForFetch()
  const pickup = normalizeYolcu360PickupQuery(input.pickup)
  const checkout = ensureCarRentalCheckout(input.checkin, input.checkout)
  if (!apiBase || !pickup || !input.checkin || !checkout) return null

  try {
    const params = yolcu360SearchParams({ ...input, pickup, checkout })
    const res = await fetch(
      `${apiBase}/api/v1/public/yolcu360/cars?${params.toString()}`,
      { cache: 'no-store' },
    )
    if (res.status === 503) return null
    if (!res.ok) return null
    const data = (await res.json()) as unknown
    const raw = normalizeYolcu360Cars(data)
    if (raw.length === 0) return null
    return raw.map((c, i) => {
      const detailQuery = options.includeDetailQuery
        ? yolcu360DetailQuery(input, { index: i, rawId: String(c.id ?? i) })
        : undefined
      return mapYolcu360CarToListing(c, i, detailQuery)
    })
  } catch {
    return null
  }
}

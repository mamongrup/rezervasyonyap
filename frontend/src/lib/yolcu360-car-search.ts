import { apiOriginForFetch } from '@/lib/api-origin'
import type { TListingBase } from '@/types/listing-types'
import {
  ensureCarRentalCheckout,
  mapYolcu360CarToListing,
  normalizeYolcu360Cars,
} from '@/lib/yolcu360-cars'
import { normalizeYolcu360PickupQuery } from '@/lib/yolcu360-location-query'

export type Yolcu360Listing = TListingBase & { seats?: number; gearshift?: string }

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

export function yolcu360DetailQuery(input: Yolcu360SearchInput): string {
  const qs = new URLSearchParams()
  const pickup = normalizeYolcu360PickupQuery(input.pickup)
  const dropoff = normalizeYolcu360PickupQuery(input.dropoff)
  const checkout = ensureCarRentalCheckout(input.checkin, input.checkout)
  if (pickup) qs.set('location', pickup)
  if (input.checkin) qs.set('checkin', input.checkin)
  if (checkout) qs.set('checkout', checkout)
  if (dropoff && dropoff !== pickup) qs.set('drop_off_location', dropoff)
  qs.set('drop_off', dropoff && dropoff !== pickup ? 'different' : 'same')
  return qs.toString()
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
    const detailQuery = options.includeDetailQuery ? yolcu360DetailQuery(input) : undefined
    return raw.map((c, i) => mapYolcu360CarToListing(c, i, detailQuery))
  } catch {
    return null
  }
}

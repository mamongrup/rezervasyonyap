import { apiOriginForFetch } from '@/lib/api-origin'
import type { Yolcu360Listing } from '@/lib/yolcu360-car-search'

export const YOLCU360_CAR_BOOKING_KEY = 'travel_yolcu360_car_booking'

export type Yolcu360CarCheckoutSnapshot = {
  handle: string
  title: string
  imageUrl?: string
  pickup: string
  dropoff: string
  checkin: string
  checkout: string
  dailyPrice?: number
  totalPrice?: number
  currency?: string
  seats?: number
  gearshift?: string
  fuelType?: string
  vendorName?: string
  yolcu360RawId?: string
  yolcu360Idx?: number
}

export type Yolcu360CarBookingDraft = {
  listing_id: string
  pickup: string
  dropoff: string
  checkin: string
  checkout: string
  car: Yolcu360CarCheckoutSnapshot
}

export function snapshotFromYolcu360Listing(
  car: Yolcu360Listing,
  search: { pickup: string; dropoff: string; checkin: string; checkout: string },
  idx?: number,
): Yolcu360CarCheckoutSnapshot {
  return {
    handle: car.handle,
    title: car.title,
    imageUrl: car.featuredImage ?? car.galleryImgs?.[0],
    pickup: search.pickup,
    dropoff: search.dropoff,
    checkin: search.checkin,
    checkout: search.checkout,
    dailyPrice: car.priceAmount,
    totalPrice: car.yolcu360TotalPrice,
    currency: car.priceCurrency,
    seats: car.seats,
    gearshift: car.gearshift,
    fuelType: car.yolcu360FuelType,
    vendorName: car.yolcu360VendorName,
    yolcu360RawId: car.yolcu360RawId,
    yolcu360Idx: idx,
  }
}

export function readYolcu360CarBookingDraft(): Yolcu360CarBookingDraft | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(YOLCU360_CAR_BOOKING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Yolcu360CarBookingDraft
    if (!parsed?.listing_id || !parsed?.car?.title) return null
    return parsed
  } catch {
    return null
  }
}

export async function resolveYolcu360CheckoutListingId(): Promise<string | null> {
  const env =
    process.env.NEXT_PUBLIC_YOLCU360_CHECKOUT_LISTING_ID?.trim() ||
    process.env.NEXT_PUBLIC_CHECKOUT_LISTING_ID?.trim()
  if (env) return env

  const apiBase = apiOriginForFetch()
  if (!apiBase) return null
  try {
    const res = await fetch(`${apiBase}/api/v1/public/yolcu360/checkout-listing`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as { listing_id?: string | null }
    const id = typeof data.listing_id === 'string' ? data.listing_id.trim() : ''
    return id || null
  } catch {
    return null
  }
}

export function yolcu360CarRentalDays(checkin: string, checkout: string): number {
  const s = checkin.slice(0, 10)
  const e = checkout.slice(0, 10)
  const a = new Date(`${s}T12:00:00`)
  const b = new Date(`${e}T12:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000)
  return diff > 0 ? diff : 0
}

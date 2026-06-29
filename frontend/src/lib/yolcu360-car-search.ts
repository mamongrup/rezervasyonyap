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
  yolcu360SearchId?: string
  yolcu360ProductCode?: string
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

/** `resolveYolcu360SearchFromUrl` çıktısı — dropoff ve checkout zorunlu. */
export type Yolcu360ResolvedSearchInput = {
  pickup: string
  dropoff: string
  checkin: string
  checkout: string
}

/** Detay veya redirect için URL + isteğe bağlı referer'dan arama bağlamı. */
export function resolveYolcu360SearchFromUrl(
  searchParams: Record<string, string | string[] | undefined>,
  referer?: string | null,
): Yolcu360ResolvedSearchInput | null {
  let pickup = firstQueryString(searchParams.location)
  let checkin = firstQueryString(searchParams.checkin)
  let checkout = firstQueryString(searchParams.checkout)
  let dropoff = firstQueryString(searchParams.drop_off_location) || pickup

  if ((!pickup || !checkin || !checkout) && referer) {
    try {
      const u = new URL(referer)
      pickup = pickup || u.searchParams.get('location')?.trim() || ''
      checkin = checkin || u.searchParams.get('checkin')?.trim() || ''
      checkout = checkout || u.searchParams.get('checkout')?.trim() || ''
      const dropFromRef = u.searchParams.get('drop_off_location')?.trim()
      if (dropFromRef) dropoff = dropFromRef
    } catch {
      /* yoksay */
    }
  }

  checkout = ensureCarRentalCheckout(checkin, checkout)
  if (!pickup || !checkin || !checkout) return null
  return { pickup, dropoff: dropoff || pickup, checkin, checkout }
}

/** Kategori sayfasına geri yönlendirmede arama query'sini korur. */
export function carRentalBrowseQueryFromContext(
  sp: Record<string, string | string[] | undefined>,
  input?: Yolcu360SearchInput | null,
): string {
  const qs = new URLSearchParams()
  const pickup = input?.pickup || firstQueryString(sp.location)
  const checkin = input?.checkin || firstQueryString(sp.checkin)
  const checkout =
    input?.checkout ||
    ensureCarRentalCheckout(checkin, firstQueryString(sp.checkout))
  const dropoff = input?.dropoff || firstQueryString(sp.drop_off_location) || pickup
  if (pickup) qs.set('location', pickup)
  if (checkin) qs.set('checkin', checkin)
  if (checkout) qs.set('checkout', checkout)
  if (dropoff && dropoff !== pickup) qs.set('drop_off_location', dropoff)
  const dropOff = firstQueryString(sp.drop_off)
  if (dropOff) qs.set('drop_off', dropOff)
  return qs.toString()
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

export type Yolcu360Snap = {
  title?: string
  priceAmount?: number
  priceCurrency?: string
  totalPrice?: number
  seats?: number
  gearshift?: string
  fuelType?: string
  vendorName?: string
  bags?: number
  imageUrl?: string
  rawId?: string
}

export function yolcu360DetailQuery(
  input: Yolcu360SearchInput,
  car?: { index: number; rawId: string },
  snap?: Yolcu360Snap,
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
  if (snap) {
    if (snap.title) qs.set('y360_t', snap.title)
    if (snap.priceAmount != null) qs.set('y360_pa', String(Math.round(snap.priceAmount)))
    if (snap.priceCurrency && snap.priceCurrency !== 'TRY') qs.set('y360_pc', snap.priceCurrency)
    if (snap.totalPrice != null) qs.set('y360_tp', String(Math.round(snap.totalPrice)))
    if (snap.seats != null) qs.set('y360_ss', String(snap.seats))
    if (snap.gearshift) qs.set('y360_gg', snap.gearshift)
    if (snap.fuelType) qs.set('y360_fu', snap.fuelType)
    if (snap.vendorName) qs.set('y360_vn', snap.vendorName)
    if (snap.bags != null) qs.set('y360_bg', String(snap.bags))
    if (snap.imageUrl) qs.set('y360_im', snap.imageUrl)
  }
  return qs.toString()
}

/** URL parametrelerinden minimal Yolcu360Listing oluşturur (API fallback).
 * y360_t (title) veya y360_code (rawId) ya da handle içinde idx varsa yeterli. */
export function yolcu360ListingFromSnap(
  sp: Record<string, string | string[] | undefined>,
  handle: string,
): Yolcu360Listing | null {
  const title = firstQueryString(sp.y360_t)
  const rawId = firstQueryString(sp.y360_code)
  const idxFromHandle = handle.match(/^yolcu360-(\d+)$/)
  // En az bir tanımlayıcı olmalı: başlık, ham ID veya handle'daki index
  if (!title && !rawId && !idxFromHandle) return null

  const slug = idxFromHandle ? handle : `yolcu360-0`

  const priceAmountRaw = firstQueryString(sp.y360_pa)
  const priceAmount = priceAmountRaw ? Number(priceAmountRaw) : undefined
  const priceCurrency = firstQueryString(sp.y360_pc) || 'TRY'
  const totalPriceRaw = firstQueryString(sp.y360_tp)
  const totalPrice = totalPriceRaw ? Number(totalPriceRaw) : undefined
  const seatsRaw = firstQueryString(sp.y360_ss)
  const seats = seatsRaw ? Number(seatsRaw) : undefined
  const bagsRaw = firstQueryString(sp.y360_bg)
  const bags = bagsRaw ? Number(bagsRaw) : undefined
  const imageUrl = firstQueryString(sp.y360_im)

  const price =
    priceAmount != null
      ? new Intl.NumberFormat('tr-TR', { style: 'decimal', maximumFractionDigits: 0 }).format(
          priceAmount,
        ) +
        ' ' +
        priceCurrency
      : undefined

  return {
    id: slug,
    handle: slug,
    title: title || slug,
    price,
    priceAmount: priceAmount && Number.isFinite(priceAmount) ? priceAmount : undefined,
    priceCurrency,
    yolcu360TotalPrice: totalPrice && Number.isFinite(totalPrice) ? totalPrice : undefined,
    yolcu360RawId: rawId || undefined,
    seats: seats && Number.isFinite(seats) ? seats : undefined,
    gearshift: firstQueryString(sp.y360_gg) || undefined,
    yolcu360FuelType: firstQueryString(sp.y360_fu) || undefined,
    yolcu360VendorName: firstQueryString(sp.y360_vn) || undefined,
    yolcu360Bags: bags && Number.isFinite(bags) ? bags : undefined,
    galleryImgs: imageUrl ? [imageUrl] : [],
    featuredImage: imageUrl || undefined,
    listingVertical: 'car_rental',
    reviewStart: 0,
    reviewCount: 0,
    isNew: false,
    address: firstQueryString(sp.location) || undefined,
  }
}

/** Detay sayfasında arama sonuçlarından doğru Yolcu360 kartını bulur. */
export function findYolcu360Listing(
  cars: Yolcu360Listing[],
  handle: string,
  searchParams: Record<string, string | string[] | undefined>,
): Yolcu360Listing | undefined {
  const idxFromQuery = Number.parseInt(firstQueryString(searchParams.y360_idx), 10)
  const codeFromQuery = firstQueryString(searchParams.y360_code)
  const idxFromHandle = handle.match(/^yolcu360-(\d+)$/)
  const idxFromHandleNum = idxFromHandle
    ? Number.parseInt(idxFromHandle[1], 10)
    : Number.NaN

  if (Number.isFinite(idxFromQuery) && idxFromQuery >= 0 && cars[idxFromQuery]) {
    return cars[idxFromQuery]
  }

  if (
    !Number.isFinite(idxFromQuery) &&
    Number.isFinite(idxFromHandleNum) &&
    idxFromHandleNum >= 0 &&
    cars[idxFromHandleNum]
  ) {
    return cars[idxFromHandleNum]
  }

  if (codeFromQuery) {
    const byCode = cars.find((c) => c.yolcu360RawId === codeFromQuery)
    if (byCode) return byCode
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

/**
 * Bir kiralamanın toplam tutarı bu eşiğin altındaysa kayıt Yolcu360'ta
 * bozuk/yanlış ölçeklenmiş demektir (çok günlük araç kiralama toplamı ₺1.000'in
 * altında olamaz). Ölçüldü: 182 araçtan ~4'ü 5 haneli kuruş (₺100–1.000 toplam)
 * → vitrinde ₺52/gün gibi imkânsız fiyatlar. Bunları gizle.
 */
const YOLCU360_MIN_PLAUSIBLE_TOTAL_TRY = 1000

/** Toplam tutarı bilinen ve eşik altı olan araçları ele; fiyatı bilinmeyen veya makul olanları tut. */
function isPlausiblyPricedCar(car: { totalPrice?: number; dailyPrice?: number }): boolean {
  const total = car.totalPrice
  if (typeof total === 'number' && Number.isFinite(total) && total > 0) {
    return total >= YOLCU360_MIN_PLAUSIBLE_TOTAL_TRY
  }
  // Toplam yoksa günlük üzerinden kaba bir alt sınır (tek günlük kiralama dahil makul).
  const daily = car.dailyPrice
  if (typeof daily === 'number' && Number.isFinite(daily) && daily > 0) {
    return daily >= 150
  }
  return true
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
    const raw = normalizeYolcu360Cars(data).filter(isPlausiblyPricedCar)
    if (raw.length === 0) return null
    return raw.map((c, i) => {
      let snap: Yolcu360Snap | undefined
      if (options.includeDetailQuery) {
        try {
          const brandModel = [c.brand ?? '', c.model ?? ''].filter(Boolean).join(' ')
          snap = {
            title: brandModel || c.vehicleClass || undefined,
            priceAmount: typeof c.dailyPrice === 'number' ? c.dailyPrice : undefined,
            priceCurrency: typeof c.currency === 'string' ? c.currency : 'TRY',
            totalPrice: typeof c.totalPrice === 'number' ? c.totalPrice : undefined,
            seats: typeof c.seats === 'number' ? c.seats : undefined,
            gearshift: typeof c.transmission === 'string' ? c.transmission : undefined,
            fuelType: typeof c.fuelType === 'string' ? c.fuelType : undefined,
            vendorName: typeof c.vendorName === 'string' ? c.vendorName : undefined,
            bags: typeof c.bags === 'number' ? c.bags : undefined,
            imageUrl: typeof c.imageUrl === 'string' ? c.imageUrl : typeof c.thumbnailUrl === 'string' ? c.thumbnailUrl : undefined,
            rawId: String(c.id ?? i),
          }
        } catch {
          snap = undefined
        }
      }
      const detailQuery = options.includeDetailQuery
        ? yolcu360DetailQuery(input, { index: i, rawId: String(c.id ?? i) }, snap)
        : undefined
      return mapYolcu360CarToListing(c, i, detailQuery)
    })
  } catch {
    return null
  }
}

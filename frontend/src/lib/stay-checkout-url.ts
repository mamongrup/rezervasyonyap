import type { GuestsObject } from '@/type'

/** ISO veya Date → yerel takvim YYYY-MM-DD (konaklama giriş/çıkış). */
export function checkoutDateYmd(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return ''
  if (typeof isoOrDate === 'string') {
    const trimmed = isoOrDate.trim()
    const ymd = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
    if (ymd) return ymd[1]!
  }
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(String(isoOrDate).trim())
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Checkout URL / YourTrip — YYYY-MM-DD veya ISO; hydration için öğlen yerel saat. */
export function parseCheckoutTripDate(raw: string | null | undefined): Date | null {
  if (!raw?.trim()) return null
  const trimmed = raw.trim()
  const ymd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (ymd) {
    const d = new Date(Number(ymd[1]), Number(ymd[2]!) - 1, Number(ymd[3]), 12, 0, 0, 0)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(trimmed)
  return Number.isNaN(d.getTime()) ? null : d
}

export type ListingCheckoutExtraParams = Record<string, string | undefined>

export function appendCheckoutGuestParams(u: URLSearchParams, guests: GuestsObject): void {
  u.set('guestAdults', String(guests.guestAdults ?? 2))
  u.set('guestChildren', String(guests.guestChildren ?? 0))
  u.set('guestInfants', String(guests.guestInfants ?? 0))
}

export function parseCheckoutGuestsFromSearchParams(searchParams: URLSearchParams): GuestsObject {
  const read = (key: string, fallback: number, min = 0) => {
    const raw = searchParams.get(key)?.trim()
    if (!raw) return fallback
    const v = parseInt(raw, 10)
    return Number.isFinite(v) && v >= min ? v : fallback
  }
  return {
    guestAdults: read('guestAdults', 2, 1),
    guestChildren: read('guestChildren', 0),
    guestInfants: read('guestInfants', 0),
  }
}

/** Vitrin ilan detayı → checkout: ilan, tarih, tutar ve isteğe bağlı misafir/extra query. */
export function buildListingCheckoutUrl(
  checkoutPath: string,
  params: {
    listingId: string
    startDate: Date
    endDate: Date
    currencyCode: string
    unitPrice: number
    guests?: GuestsObject
    extra?: ListingCheckoutExtraParams
  },
): string {
  const u = new URLSearchParams()
  u.set('listingId', params.listingId.trim())
  const startYmd = checkoutDateYmd(params.startDate)
  const endYmd = checkoutDateYmd(params.endDate)
  u.set('startDate', startYmd)
  u.set('endDate', endYmd)
  u.set('checkIn', startYmd)
  u.set('checkOut', endYmd)
  u.set('currency', (params.currencyCode || 'TRY').trim().toUpperCase())
  const price = Number.isFinite(params.unitPrice) && params.unitPrice > 0 ? params.unitPrice : 0
  u.set('unitPrice', price.toFixed(2))
  if (params.guests) appendCheckoutGuestParams(u, params.guests)
  if (params.extra) {
    for (const [key, value] of Object.entries(params.extra)) {
      if (value != null && value.trim() !== '') u.set(key, value.trim())
    }
  }
  const sep = checkoutPath.includes('?') ? '&' : '?'
  return `${checkoutPath}${sep}${u.toString()}`
}

/** Vitrin konaklama detayı → checkout: ilan, tarih ve tutar query ile taşınır. */
export function buildStayCheckoutUrl(
  checkoutPath: string,
  params: {
    listingId: string
    startDate: Date
    endDate: Date
    currencyCode: string
    unitPrice: number
    guests?: GuestsObject
    hotelRoomId?: string
    hotelRoomName?: string
    hotelBoardLabel?: string
    mealPlanId?: string
    mealPlanLabel?: string
    /** Tatil evi — havuz ısıtma seçiliyse checkout kırılımı için */
    poolHeatingSelected?: boolean
    /** Toplam havuz ısıtma ücreti (gece × günlük) */
    poolHeatingFee?: number
  },
): string {
  const extra: ListingCheckoutExtraParams = {
    hotelRoomId: params.hotelRoomId,
    hotelRoomName: params.hotelRoomName,
    hotelBoardLabel: params.hotelBoardLabel,
    mealPlanId: params.mealPlanId,
    mealPlanLabel: params.mealPlanLabel,
  }
  if (params.poolHeatingSelected && params.poolHeatingFee != null && params.poolHeatingFee > 0) {
    extra.pool_heating = '1'
    extra.poolHeatingFee = params.poolHeatingFee.toFixed(2)
  }
  return buildListingCheckoutUrl(checkoutPath, {
    listingId: params.listingId,
    startDate: params.startDate,
    endDate: params.endDate,
    currencyCode: params.currencyCode,
    unitPrice: params.unitPrice,
    guests: params.guests,
    extra,
  })
}

export type HotelCheckoutQueryParams = {
  hotelRoomId: string | null
  hotelRoomName: string | null
  hotelBoardLabel: string | null
  mealPlanId: string | null
  mealPlanLabel: string | null
}

/** Aktivite checkout query parametreleri (seans + katılımcı). */
export type ActivityCheckoutQueryParams = {
  sessionId: string | null
  adults: number
  children: number
  startTime: string | null
}

function readActivityCount(
  searchParams: URLSearchParams,
  primary: string,
  fallbackKey: string,
  defaultValue: number,
  min = 0,
): number {
  const raw = searchParams.get(primary)?.trim() || searchParams.get(fallbackKey)?.trim()
  if (!raw) return defaultValue
  const v = parseInt(raw, 10)
  return Number.isFinite(v) && v >= min ? v : defaultValue
}

export function parseActivityCheckoutParams(
  searchParams: URLSearchParams,
): ActivityCheckoutQueryParams {
  const sessionId =
    searchParams.get('activitySessionId')?.trim() ||
    searchParams.get('activity_session_id')?.trim() ||
    null
  return {
    sessionId,
    adults: readActivityCount(searchParams, 'activityAdults', 'activity_adults', 1, 1),
    children: readActivityCount(searchParams, 'activityChildren', 'activity_children', 0),
    startTime:
      searchParams.get('activityStartTime')?.trim() ||
      searchParams.get('activity_start_time')?.trim() ||
      null,
  }
}

export function parseHotelCheckoutParams(searchParams: URLSearchParams): HotelCheckoutQueryParams {
  return {
    hotelRoomId: searchParams.get('hotelRoomId')?.trim() || null,
    hotelRoomName: searchParams.get('hotelRoomName')?.trim() || null,
    hotelBoardLabel: searchParams.get('hotelBoardLabel')?.trim() || null,
    mealPlanId: searchParams.get('mealPlanId')?.trim() || null,
    mealPlanLabel: searchParams.get('mealPlanLabel')?.trim() || null,
  }
}

/** Aktivite detay → checkout: tarih, seans, katılımcı ve tutar query ile taşınır. */
export function buildActivityCheckoutUrl(
  checkoutPath: string,
  params: {
    listingId: string
    date: string
    sessionId: string
    adults: number
    children: number
    currencyCode: string
    unitPrice: number
    startTime?: string
  },
): string {
  const u = new URLSearchParams()
  u.set('listingId', params.listingId.trim())
  u.set('checkIn', params.date.trim())
  u.set('checkOut', params.date.trim())
  const noon = new Date(`${params.date.trim()}T12:00:00`)
  if (!Number.isNaN(noon.getTime())) {
    u.set('startDate', checkoutDateYmd(noon))
    u.set('endDate', checkoutDateYmd(noon))
  }
  u.set('activitySessionId', params.sessionId.trim())
  u.set('activityAdults', String(Math.max(1, params.adults)))
  u.set('activityChildren', String(Math.max(0, params.children)))
  if (params.startTime?.trim()) u.set('activityStartTime', params.startTime.trim())
  u.set('currency', (params.currencyCode || 'TRY').trim().toUpperCase())
  const price = Number.isFinite(params.unitPrice) && params.unitPrice > 0 ? params.unitPrice : 0
  u.set('unitPrice', price.toFixed(2))
  appendCheckoutGuestParams(u, {
    guestAdults: Math.max(1, params.adults),
    guestChildren: Math.max(0, params.children),
    guestInfants: 0,
  })
  const sep = checkoutPath.includes('?') ? '&' : '?'
  return `${checkoutPath}${sep}${u.toString()}`
}

export function resolveCheckoutListingId(
  fromQuery: string | null | undefined,
  envFallback?: string,
): string {
  const q = fromQuery?.trim()
  if (q) return q
  return envFallback?.trim() ?? ''
}

export function resolveCheckoutCurrency(
  fromQuery: string | null | undefined,
  envFallback?: string,
): string {
  const q = fromQuery?.trim()
  if (q) return q.toUpperCase()
  return (envFallback?.trim() || 'TRY').toUpperCase()
}

export function resolveCheckoutUnitPrice(
  fromQuery: string | null | undefined,
  envFallback?: string,
): number {
  const raw = fromQuery?.trim() || envFallback?.trim() || ''
  const n = parseFloat(raw.replace(/\s/g, '').replace(/,/g, '.'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

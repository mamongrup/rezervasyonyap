import {
  isListingDayFullyBlocked,
  listingDayCheckoutSelectable,
  listingDayOpenForStayNight,
  listingDayPmOpen,
} from '@/lib/listing-availability-day'
import type { ListingAvailabilityDay } from '@/lib/travel-api'
import type { StayBookingRules } from '@/types/listing-types'

function parsePositiveInt(raw: string | null | undefined): number | undefined {
  if (raw == null || String(raw).trim() === '') return undefined
  const n = parseInt(String(raw).trim(), 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function parseNonNegInt(raw: string | null | undefined): number | undefined {
  if (raw == null || String(raw).trim() === '') return undefined
  const n = parseInt(String(raw).trim(), 10)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

function parseAmount(raw: string | null | undefined): number | undefined {
  if (raw == null || String(raw).trim() === '') return undefined
  const n = parseFloat(String(raw).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/** Vitrin `PublicListingItem` / API alanlarından kurallar nesnesi (yoksa `undefined`) */
export function parseStayBookingRulesFromPublicItem(item: {
  min_stay_nights?: string | null
  allow_sub_min_stay_gap_booking?: string | boolean | null
  min_advance_booking_days?: string | null
  min_short_stay_nights?: string | null
  short_stay_fee?: string | null
}): StayBookingRules | undefined {
  const minStayNights = parsePositiveInt(item.min_stay_nights ?? undefined)
  const minAdvanceBookingDays = parseNonNegInt(item.min_advance_booking_days ?? undefined)
  const minShortStayNights = parsePositiveInt(item.min_short_stay_nights ?? undefined)
  const shortStayFeeAmount = parseAmount(item.short_stay_fee ?? undefined)
  const g = item.allow_sub_min_stay_gap_booking
  const allowSubMinStayGapBooking = g === true || g === 'true'

  if (
    minStayNights == null &&
    minAdvanceBookingDays == null &&
    minShortStayNights == null &&
    shortStayFeeAmount == null &&
    !allowSubMinStayGapBooking
  ) {
    return undefined
  }

  return {
    ...(minStayNights != null ? { minStayNights } : {}),
    ...(minAdvanceBookingDays != null ? { minAdvanceBookingDays } : {}),
    ...(minShortStayNights != null ? { minShortStayNights } : {}),
    ...(shortStayFeeAmount != null ? { shortStayFeeAmount } : {}),
    ...(allowSubMinStayGapBooking ? { allowSubMinStayGapBooking: true } : {}),
  }
}

export function startOfLocalDay(d: Date): Date {
  const t = new Date(d)
  t.setHours(0, 0, 0, 0)
  return t
}

/** En erken giriş günü: bugün + `minAdvanceBookingDays` (0 veya tanımsız = bugün) */
export function earliestCheckInDate(
  todayStart: Date,
  minAdvanceBookingDays: number | undefined,
): Date {
  const t = startOfLocalDay(todayStart)
  const n =
    minAdvanceBookingDays != null && minAdvanceBookingDays > 0 ? minAdvanceBookingDays : 0
  const out = new Date(t)
  out.setDate(out.getDate() + n)
  return out
}

/** Takvimde kullanılacak varsayılan minimum gece sayısı */
export function resolvedMinStayNights(rules: StayBookingRules | undefined): number {
  const m = rules?.minStayNights
  return m != null && m > 0 ? m : 1
}

/** İlk örnek aralık için gece sayısı: en az kurallar veya 3 */
export function defaultRangeStayNights(rules: StayBookingRules | undefined): number {
  return Math.max(resolvedMinStayNights(rules), 3)
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

/** Giriş–çıkış aralığındaki konaklama geceleri yarım gün kurallarına uyuyor mu */
export function stayRangeOvernightsAvailable(
  checkIn: Date,
  checkOut: Date,
  byYmd: Map<string, ListingAvailabilityDay>,
  formatLocalYmd: (x: Date) => string,
): boolean {
  const start = startOfLocalDay(checkIn)
  const end = startOfLocalDay(checkOut)
  const nights = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
  if (nights < 1) return false

  for (let i = 0; i < nights; i++) {
    const day = addDays(start, i)
    const ymd = formatLocalYmd(day)
    const row = byYmd.get(ymd)
    if (!listingDayOpenForStayNight(row, i)) return false
  }
  return true
}

/**
 * Giriş gününden itibaren en uzun konaklama (gece sayısı).
 * Çıkış günü sabah boşaltma olduğu için tam dolu (turnover) gün bile çıkış tarihi olabilir.
 */
export function maxConsecutiveNightsFromStart(
  start: Date,
  byYmd: Map<string, ListingAvailabilityDay>,
  formatLocalYmd: (x: Date) => string,
): number {
  const s = startOfLocalDay(start)
  if (!listingDayPmOpen(byYmd.get(formatLocalYmd(s)))) return 0

  let n = 0
  for (let i = 0; i < 400; i++) {
    const row = byYmd.get(formatLocalYmd(addDays(s, i)))
    if (!listingDayOpenForStayNight(row, i)) break
    n++
  }
  return n
}

/** Takvim `filterDate` — müsaitlik yoksa `byYmd` boş haritayla tüm günler serbest sayılır */
export function stayListingCalendarDaySelectable(
  d: Date,
  opts: {
    effectiveMinDate: Date
    byYmd: Map<string, ListingAvailabilityDay>
    startDate: Date | null
    endDate: Date | null
    minNights: number
    /** Takvim aralığı çizilirken minimum geceden önceki ara günleri görünür tut. */
    allowBeforeMinStay?: boolean
    /** Min. gecelemede boşluk doldurma — aradaki kısa boşlukta min. konaklamayı esnet */
    allowSubMinStayGapBooking?: boolean
    formatLocalYmd: (x: Date) => string
  },
): boolean {
  const day = startOfLocalDay(d)
  if (day < startOfLocalDay(opts.effectiveMinDate)) return false

  if (opts.startDate != null && opts.endDate == null) {
    const start = startOfLocalDay(opts.startDate)
    // Bekleyen seçim: başlangıçtan önceki geçerli giriş günlerini açık bırak.
    // react-datepicker (v9) daha erken bir güne tıklanınca seçimi o güne sıfırlar;
    // gün kapalıysa bu çalışmaz. Böylece yanlış giriş seçince geri alınabilir.
    if (day < start) {
      const prevRow = opts.byYmd.get(opts.formatLocalYmd(day))
      if (isListingDayFullyBlocked(prevRow)) return false
      return listingDayPmOpen(prevRow)
    }
    if (day <= start) return false
    const nights = Math.round((day.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
    if (nights < 1) return false

    if (!stayRangeOvernightsAvailable(start, day, opts.byYmd, opts.formatLocalYmd)) return false
    if (!listingDayCheckoutSelectable(opts.byYmd.get(opts.formatLocalYmd(day)))) return false

    const maxN = maxConsecutiveNightsFromStart(start, opts.byYmd, opts.formatLocalYmd)
    if (nights > maxN) return false

    const minN = Math.max(1, opts.minNights)
    const allowGap = opts.allowSubMinStayGapBooking === true

    if (nights < minN && opts.allowBeforeMinStay === true) return true
    if (allowGap && maxN < minN) {
      return nights >= 1 && nights <= maxN
    }
    if (allowGap && maxN >= minN) {
      return nights >= minN && nights <= maxN
    }
    return nights >= minN && nights <= maxN
  }

  const ymd = opts.formatLocalYmd(day)
  const row = opts.byYmd.get(ymd)
  if (isListingDayFullyBlocked(row)) return false
  return listingDayPmOpen(row)
}

/** Rezervasyon kartı / popover için varsayılan [giriş, çıkış] (müsaitlik kontrolsüz) */
export function defaultStayDateRange(rules: StayBookingRules | undefined): [Date, Date] {
  const s = earliestCheckInDate(startOfLocalDay(new Date()), rules?.minAdvanceBookingDays)
  const n = defaultRangeStayNights(rules)
  const e = addDays(s, n)
  return [s, e]
}

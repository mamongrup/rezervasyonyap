import { isListingDayFullyBlocked } from '@/lib/listing-availability-day'
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

/**
 * Giriş gününden itibaren ardışık kaç gece konaklanabilir (her gece günü müsait olmalı).
 * `byYmd` boşken satır yok = gün açık kabul edilir.
 */
export function maxConsecutiveNightsFromStart(
  start: Date,
  byYmd: Map<string, ListingAvailabilityDay>,
  formatLocalYmd: (x: Date) => string,
): number {
  const s = startOfLocalDay(start)
  let n = 0
  for (let i = 0; i < 400; i++) {
    const check = addDays(s, i)
    const ymd = formatLocalYmd(check)
    const row = byYmd.get(ymd)
    if (isListingDayFullyBlocked(row)) break
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
    /** Min. gecelemede boşluk doldurma — aradaki kısa boşlukta min. konaklamayı esnet */
    allowSubMinStayGapBooking?: boolean
    formatLocalYmd: (x: Date) => string
  },
): boolean {
  const day = startOfLocalDay(d)
  if (day < startOfLocalDay(opts.effectiveMinDate)) return false
  const ymd = opts.formatLocalYmd(day)
  const row = opts.byYmd.get(ymd)
  if (isListingDayFullyBlocked(row)) return false
  if (opts.startDate != null && opts.endDate == null) {
    const start = startOfLocalDay(opts.startDate)
    if (day <= start) return false
    const nights = Math.round((day.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
    if (nights < 1) return false

    const maxN = maxConsecutiveNightsFromStart(start, opts.byYmd, opts.formatLocalYmd)
    if (nights > maxN) return false

    const minN = Math.max(1, opts.minNights)
    const allowGap = opts.allowSubMinStayGapBooking === true

    if (allowGap && maxN < minN) {
      return nights >= 1 && nights <= maxN
    }
    if (allowGap && maxN >= minN) {
      return nights >= minN && nights <= maxN
    }
    return nights >= minN && nights <= maxN
  }
  return true
}

/** Rezervasyon kartı / popover için varsayılan [giriş, çıkış] (müsaitlik kontrolsüz) */
export function defaultStayDateRange(rules: StayBookingRules | undefined): [Date, Date] {
  const s = earliestCheckInDate(startOfLocalDay(new Date()), rules?.minAdvanceBookingDays)
  const n = defaultRangeStayNights(rules)
  const e = addDays(s, n)
  return [s, e]
}

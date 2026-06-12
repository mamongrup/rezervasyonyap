import type { HotelListingActivity } from '@/lib/travel-api'

/** ISO date `YYYY-MM-DD` */
export function parseActivityDateOnly(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim())
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  d.setHours(0, 0, 0, 0)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatActivityDateOnly(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

/** Konaklama geceleri (çıkış günü hariç). */
export function eachStayNightIso(checkIn: Date, checkOut: Date): string[] {
  const nights: string[] = []
  const cur = new Date(checkIn)
  cur.setHours(0, 0, 0, 0)
  const end = new Date(checkOut)
  end.setHours(0, 0, 0, 0)
  while (cur < end) {
    nights.push(formatActivityDateOnly(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return nights
}

/** Etkinlik tarihi konaklama aralığında mı (çıkış günü hariç). */
export function isActivityDateWithinStay(
  activityDateIso: string,
  checkIn: Date | null,
  checkOut: Date | null,
): boolean {
  if (!checkIn || !checkOut) return false
  const activityDate = parseActivityDateOnly(activityDateIso)
  if (!activityDate) return false
  const start = new Date(checkIn)
  start.setHours(0, 0, 0, 0)
  const end = new Date(checkOut)
  end.setHours(0, 0, 0, 0)
  return activityDate >= start && activityDate < end
}

export function hotelActivityLocalizedTitle(item: HotelListingActivity, locale: string): string {
  const lang = locale.split('-')[0] ?? 'tr'
  if (lang !== 'tr' && item.title_en.trim()) return item.title_en.trim()
  return item.title.trim()
}

export function hotelActivityLocalizedDescription(item: HotelListingActivity, locale: string): string {
  const lang = locale.split('-')[0] ?? 'tr'
  if (lang !== 'tr' && item.description_en.trim()) return item.description_en.trim()
  return item.description.trim()
}

/** Ücretli etkinlik günü konaklamaya otomatik eklenen tutarlar (seçim gerekmez). */
export function computeHotelActivityStaySurcharges({
  activities,
  checkIn,
  checkOut,
}: {
  activities: HotelListingActivity[]
  checkIn: Date | null
  checkOut: Date | null
}): {
  lines: Array<{ activity: HotelListingActivity; total: number }>
  grandTotal: number
} {
  if (!checkIn || !checkOut) return { lines: [], grandTotal: 0 }

  const nightSet = new Set(eachStayNightIso(checkIn, checkOut))
  const lines: Array<{ activity: HotelListingActivity; total: number }> = []
  let grandTotal = 0

  for (const activity of activities) {
    if (activity.stay_surcharge_amount <= 0) continue
    const actDate = activity.activity_date.slice(0, 10)
    if (!nightSet.has(actDate)) continue
    lines.push({ activity, total: activity.stay_surcharge_amount })
    grandTotal += activity.stay_surcharge_amount
  }

  return { lines, grandTotal }
}

export function activityAffectsStayPricing(activity: HotelListingActivity): boolean {
  return activity.stay_surcharge_amount > 0
}

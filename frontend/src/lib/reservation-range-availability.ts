import type { ListingAvailabilityDay } from '@/lib/travel-api'

function eachDayStrInclusive(fromYmd: string, toYmd: string): string[] {
  const [fy, fm, fd] = fromYmd.split('-').map(Number)
  const [ty, tm, td] = toYmd.split('-').map(Number)
  if (![fy, fm, fd, ty, tm, td].every(Number.isFinite)) return []
  const out: string[] = []
  const cur = new Date(fy, fm - 1, fd)
  const end = new Date(ty, tm - 1, td)
  let guard = 0
  while (cur <= end && guard < 800) {
    out.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`,
    )
    cur.setDate(cur.getDate() + 1)
    guard += 1
  }
  return out
}

/** Rezervasyon aralığını giriş/çıkış günlerinde gerçek yarım gün turnover olarak üretir. */
export function buildReservationRangeDays(
  fromYmd: string,
  toYmd: string,
  existingDays: ListingAvailabilityDay[],
  block: boolean,
): ListingAvailabilityDay[] {
  const byDay = new Map(existingDays.map((day) => [day.day.trim(), day]))
  return eachDayStrInclusive(fromYmd, toYmd).map((day) => {
    const existing = byDay.get(day)
    const existingAm = existing?.am_available ?? existing?.is_available ?? true
    const existingPm = existing?.pm_available ?? existing?.is_available ?? true
    const priceOverride = existing?.price_override?.trim() ?? ''

    let am = existingAm
    let pm = existingPm
    if (block) {
      // Giriş günü sabah çıkış açık, öğleden sonra dolu.
      // Çıkış günü sabah dolu, öğleden sonra yeni giriş açık.
      if (day === fromYmd) {
        am = true
        pm = false
      } else if (day === toYmd) {
        am = false
        pm = true
      } else {
        am = false
        pm = false
      }
    } else if (day === fromYmd) {
      pm = true
    } else if (day === toYmd) {
      am = true
    } else {
      am = true
      pm = true
    }

    return {
      day,
      is_available: am || pm,
      am_available: am,
      pm_available: pm,
      price_override: priceOverride,
    }
  })
}

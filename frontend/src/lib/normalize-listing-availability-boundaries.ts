import type { ListingAvailabilityDay } from '@/lib/travel-api'

function addYmdDays(ymd: string, delta: number): string {
  const date = new Date(`${ymd}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return ''
  date.setUTCDate(date.getUTCDate() + delta)
  return date.toISOString().slice(0, 10)
}

function amPm(row: ListingAvailabilityDay | undefined): { am: boolean; pm: boolean } {
  if (!row) return { am: true, pm: true }
  return {
    am: row.am_available ?? row.is_available,
    pm: row.pm_available ?? row.is_available,
  }
}

/**
 * Tam kapalı gece aralıklarının giriş/çıkış sınırlarını üretir ve bir kapalı
 * gece aralığına bağlanmayan yarım günleri açar.
 * Geçerli desenler: check-in → kapalı gün(ler) → checkout veya tek gecede
 * check-in → checkout. Böylece çift checkout ve açık günler arasındaki sahipsiz
 * sınırlar rezervasyon takviminde gösterilmez.
 */
export function normalizeOrphanHalfDayBoundaries(
  days: readonly ListingAvailabilityDay[],
): ListingAvailabilityDay[] {
  const byDay = new Map(days.map((row) => [row.day.trim(), row]))

  return days.map((row) => {
    const day = row.day.trim()
    const current = amPm(row)
    const previous = amPm(byDay.get(addYmdDays(day, -1)))
    const next = amPm(byDay.get(addYmdDays(day, 1)))
    const isCheckin = current.am && !current.pm
    const isCheckout = !current.am && current.pm
    const previousIsFull = !previous.am && !previous.pm
    const previousIsCheckin = previous.am && !previous.pm
    const nextIsFull = !next.am && !next.pm
    const nextIsCheckout = !next.am && next.pm

    // Eski takvim kayıtları yalnızca kapalı günleri saklayabiliyor. Kapalı
    // bloğun ilk gününü giriş, ertesi gününü çıkış yarımı olarak göster.
    // Yönetimde seçilen başlangıç günü bloğa dahildir; önceki gün açık kalır.
    if (previous.am && previous.pm && !current.am && !current.pm) {
      return { ...row, is_available: true, am_available: true, pm_available: false }
    }
    if (current.am && current.pm && previousIsFull) {
      return { ...row, is_available: true, am_available: false, pm_available: true }
    }

    if (isCheckin && !nextIsFull && !nextIsCheckout) {
      return { ...row, is_available: true, am_available: true, pm_available: true }
    }
    if (isCheckout && !previousIsFull && !previousIsCheckin) {
      return { ...row, is_available: true, am_available: true, pm_available: true }
    }
    return row
  })
}

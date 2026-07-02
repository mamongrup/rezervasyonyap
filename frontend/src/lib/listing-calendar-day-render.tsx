import DatePickerCustomDay from '@/components/DatePickerCustomDay'
import { listingDayAmPm, listingDayVisualStatus } from '@/lib/listing-availability-day'
import type { ListingAvailabilityDay } from '@/lib/travel-api'

/** Vitrin / sidebar takvim hücresi — tüm konaklama kategorilerinde ortak */
export function renderListingCalendarDayContents(
  day: number,
  date: Date | undefined,
  byYmd: Map<string, ListingAvailabilityDay>,
  formatLocalYmd: (d: Date) => string,
) {
  const ymd = date ? formatLocalYmd(date) : ''
  const row = ymd ? byYmd.get(ymd) : undefined
  const { am, pm } = listingDayAmPm(row)
  const visualStatus = listingDayVisualStatus(row)
  return (
    <DatePickerCustomDay
      dayOfMonth={day}
      date={date}
      am={am}
      pm={pm}
      visualStatus={visualStatus}
    />
  )
}

export function listingAvailabilityByYmd(
  days: readonly ListingAvailabilityDay[],
): Map<string, ListingAvailabilityDay> {
  const m = new Map<string, ListingAvailabilityDay>()
  for (const row of days) {
    m.set(row.day.trim(), row)
  }
  return m
}

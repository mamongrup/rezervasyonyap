import DatePickerCustomDay from '@/components/DatePickerCustomDay'
import { listingDayAmPm, listingDayVisualStatus } from '@/lib/listing-availability-day'
import type { ListingAvailabilityDay } from '@/lib/travel-api'

/**
 * Vitrin / sidebar takvim hücresi — tüm konaklama kategorilerinde ortak.
 * `minSelectableYmd`: bu tarihten önce (bugün / min advance) kapalı görünür.
 */
export function renderListingCalendarDayContents(
  day: number,
  date: Date | undefined,
  byYmd: Map<string, ListingAvailabilityDay>,
  formatLocalYmd: (d: Date) => string,
  minSelectableYmd?: string,
) {
  const ymd = date ? formatLocalYmd(date) : ''
  if (minSelectableYmd && ymd && ymd < minSelectableYmd) {
    return (
      <DatePickerCustomDay
        dayOfMonth={day}
        date={date}
        am={false}
        pm={false}
        visualStatus="blocked"
      />
    )
  }
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

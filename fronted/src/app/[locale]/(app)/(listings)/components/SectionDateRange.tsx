'use client'

import DatePickerCustomDay from '@/components/DatePickerCustomDay'
import DatePickerCustomHeaderTwoMonth from '@/components/DatePickerCustomHeaderTwoMonth'
import { formatLocalYmd } from '@/lib/date-format-local'
import { datePickerLocaleId, intlDateLocaleTag } from '@/lib/i18n-config'
import '@/lib/register-datepicker-locales'
import { isListingDayFullyBlocked } from '@/lib/listing-availability-day'
import {
  addDays,
  defaultRangeStayNights,
  earliestCheckInDate,
  maxConsecutiveNightsFromStart,
  resolvedMinStayNights,
  startOfLocalDay,
  stayListingCalendarDaySelectable,
} from '@/lib/stay-booking-rules'
import type { ListingAvailabilityDay } from '@/lib/travel-api'
import type { StayBookingRules } from '@/types/listing-types'
import { useResponsiveCalendarMonthsShown } from '@/hooks/use-responsive-calendar-months-shown'
import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import { useEffect, useMemo, useRef, useState } from 'react'
import DatePicker from 'react-datepicker'
import { SectionHeading, SectionSubheading } from './SectionHeading'

function startOfToday(): Date {
  return startOfLocalDay(new Date())
}

function availabilityByDayYmd(days: ListingAvailabilityDay[]): Map<string, ListingAvailabilityDay> {
  const m = new Map<string, ListingAvailabilityDay>()
  for (const row of days) {
    m.set(row.day.trim(), row)
  }
  return m
}

function pickDefaultRange(
  rangeMin: Date,
  defaultStayNights: number,
  bookingRules: StayBookingRules | undefined,
  byYmd: Map<string, ListingAvailabilityDay>,
): [Date, Date] {
  const minStay = resolvedMinStayNights(bookingRules)
  const allowGap = !!bookingRules?.allowSubMinStayGapBooking
  const isFree = (d: Date) => !isListingDayFullyBlocked(byYmd.get(formatLocalYmd(d)))

  const anchor = startOfLocalDay(rangeMin)
  for (let offset = 0; offset < 400; offset++) {
    const s = addDays(anchor, offset)
    if (!isFree(s)) continue
    const maxN = maxConsecutiveNightsFromStart(s, byYmd, formatLocalYmd)
    if (maxN < 1) continue

    const want = Math.max(defaultStayNights, minStay)

    if (maxN >= want) {
      let ok = true
      for (let i = 0; i < want; i++) {
        if (!isFree(addDays(s, i))) {
          ok = false
          break
        }
      }
      if (ok) return [new Date(s), addDays(s, want)]
    }
    if (allowGap && maxN < minStay && maxN >= 1) {
      return [new Date(s), addDays(s, maxN)]
    }
    if (maxN >= minStay && maxN < want) {
      let ok = true
      for (let i = 0; i < minStay; i++) {
        if (!isFree(addDays(s, i))) {
          ok = false
          break
        }
      }
      if (ok) return [new Date(s), addDays(s, minStay)]
    }
  }

  const fb = startOfLocalDay(rangeMin)
  return [fb, addDays(fb, Math.max(defaultStayNights, minStay))]
}

function SectionDateRangeCalendar({
  locale,
  initialDays = [],
  bookingRules,
  onCompleteRange,
  initialMonthsShown,
}: {
  locale: string
  initialDays?: ListingAvailabilityDay[]
  bookingRules?: StayBookingRules
  onCompleteRange?: (start: Date, end: Date) => void
  initialMonthsShown: 1 | 2
}) {
  const pickerLocale = datePickerLocaleId(locale)
  const monthLocale = intlDateLocaleTag(locale)
  const monthsShown = useResponsiveCalendarMonthsShown(initialMonthsShown)

  const byYmd = useMemo(() => availabilityByDayYmd(initialDays), [initialDays])
  const todayYmd = formatLocalYmd(new Date())
  const todayStart = useMemo(() => startOfToday(), [todayYmd])

  const effectiveMinDate = useMemo(
    () => earliestCheckInDate(todayStart, bookingRules?.minAdvanceBookingDays),
    [todayStart, bookingRules?.minAdvanceBookingDays],
  )

  const maxDate = useMemo(() => {
    const t = new Date(effectiveMinDate)
    t.setMonth(t.getMonth() + 24)
    return t
  }, [effectiveMinDate])

  const defaultStayNights = useMemo(() => defaultRangeStayNights(bookingRules), [bookingRules])

  const defaultRange = useMemo(
    () => pickDefaultRange(effectiveMinDate, defaultStayNights, bookingRules, byYmd),
    [effectiveMinDate, defaultStayNights, bookingRules, byYmd],
  )

  const [startDate, setStartDate] = useState<Date | null>(() => defaultRange[0])
  const [endDate, setEndDate] = useState<Date | null>(() => defaultRange[1])
  const lastEndTsRef = useRef(defaultRange[1].getTime())

  useEffect(() => {
    if (!startDate || !endDate) return
    const ts = endDate.getTime()
    if (lastEndTsRef.current === ts) return
    lastEndTsRef.current = ts
    onCompleteRange?.(startDate, endDate)
  }, [startDate, endDate, onCompleteRange])

  const minNights = useMemo(() => resolvedMinStayNights(bookingRules), [bookingRules])

  const filterDate = useMemo(
    () => (d: Date) =>
      stayListingCalendarDaySelectable(d, {
        effectiveMinDate,
        byYmd,
        startDate,
        endDate,
        minNights,
        allowSubMinStayGapBooking: bookingRules?.allowSubMinStayGapBooking,
        formatLocalYmd,
      }),
    [byYmd, effectiveMinDate, startDate, endDate, minNights, bookingRules?.allowSubMinStayGapBooking],
  )

  const onChangeDate = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates
    setStartDate(start)
    setEndDate(end)
  }

  return (
    <>
      <div className="listing-datepicker-hide-outside-month">
        <DatePicker
          locale={pickerLocale}
          openToDate={effectiveMinDate}
          selected={startDate}
          onChange={onChangeDate}
          startDate={startDate}
          endDate={endDate}
          selectsRange
          monthsShown={monthsShown}
          showPopperArrow={false}
          inline
          minDate={effectiveMinDate}
          maxDate={maxDate}
          filterDate={filterDate}
          renderCustomHeader={(props) => (
            <DatePickerCustomHeaderTwoMonth {...props} monthLocale={monthLocale} monthsShown={monthsShown} />
          )}
          renderDayContents={(day, date) => <DatePickerCustomDay dayOfMonth={day} date={date} />}
        />
      </div>

      <input type="hidden" name="startDate" value={startDate ? startDate.toISOString() : ''} />
      <input type="hidden" name="endDate" value={endDate ? endDate.toISOString() : ''} />
    </>
  )
}

export default function SectionDateRange({
  locale,
  initialDays = [],
  bookingRules,
  onCompleteRange,
  /** Sunucu isteğinden tahmin; yoksa 1 (liste sayfaları vb.) */
  initialMonthsShown = 1,
}: {
  locale: string
  initialDays?: ListingAvailabilityDay[]
  bookingRules?: StayBookingRules
  onCompleteRange?: (start: Date, end: Date) => void
  initialMonthsShown?: 1 | 2
}) {
  const messages = getMessages(locale)
  const copy = messages.listing.availabilityCalendar

  const rulesLines = useMemo(() => {
    const out: string[] = []
    if (bookingRules?.minStayNights != null && bookingRules.minStayNights > 0) {
      out.push(copy.rulesMinStay.replace('{n}', String(bookingRules.minStayNights)))
    }
    if (bookingRules?.minAdvanceBookingDays != null && bookingRules.minAdvanceBookingDays > 0) {
      out.push(copy.rulesAdvance.replace('{n}', String(bookingRules.minAdvanceBookingDays)))
    }
    if (
      bookingRules?.minShortStayNights != null &&
      bookingRules.minShortStayNights > 0 &&
      bookingRules.shortStayFeeAmount != null &&
      bookingRules.shortStayFeeAmount > 0
    ) {
      out.push(copy.rulesShortStay.replace('{n}', String(bookingRules.minShortStayNights)))
    }
    if (bookingRules?.allowSubMinStayGapBooking) {
      out.push(copy.rulesGap)
    }
    return out
  }, [bookingRules, copy])

  return (
    <div className="listingSection__wrap">
      <div>
        <SectionHeading>{copy.title}</SectionHeading>
        <SectionSubheading>{copy.subtitle}</SectionSubheading>
        {rulesLines.length > 0 ? (
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
            {rulesLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <Divider className="w-14!" />

      <SectionDateRangeCalendar
        locale={locale}
        initialDays={initialDays}
        bookingRules={bookingRules}
        onCompleteRange={onCompleteRange}
        initialMonthsShown={initialMonthsShown}
      />
    </div>
  )
}

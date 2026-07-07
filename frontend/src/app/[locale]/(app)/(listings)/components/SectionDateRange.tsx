'use client'

import DatePickerCustomHeaderTwoMonth from '@/components/DatePickerCustomHeaderTwoMonth'
import { formatLocalYmd } from '@/lib/date-format-local'
import {
  listingAvailabilityByYmd,
  renderListingCalendarDayContents,
} from '@/lib/listing-calendar-day-render'
import { datePickerLocaleId, intlDateLocaleTag } from '@/lib/i18n-config'
import '@/lib/register-datepicker-locales'
import {
  earliestCheckInDate,
  resolvedMinStayNights,
  startOfLocalDay,
  stayListingCalendarDaySelectable,
} from '@/lib/stay-booking-rules'
import type { ListingAvailabilityDay } from '@/lib/travel-api'
import type { StayBookingRules } from '@/types/listing-types'
import { useResponsiveCalendarMonthsShown } from '@/hooks/use-responsive-calendar-months-shown'
import clsx from 'clsx'
import { getMessages } from '@/utils/getT'
import { useEffect, useMemo, useRef, useState } from 'react'
import DatePicker from 'react-datepicker'
import datepickerStyles from '@/styles/react-datepicker.module.css'

function startOfToday(): Date {
  return startOfLocalDay(new Date())
}

function availabilityByDayYmd(days: ListingAvailabilityDay[]): Map<string, ListingAvailabilityDay> {
  return listingAvailabilityByYmd(days)
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

  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const lastEndTsRef = useRef<number | null>(null)

  useEffect(() => {
    if (!startDate || !endDate) return
    const ts = endDate.getTime()
    if (lastEndTsRef.current === ts) return
    lastEndTsRef.current = ts
    onCompleteRange?.(startDate, endDate)
  }, [startDate, endDate, onCompleteRange])

  const minNights = useMemo(() => resolvedMinStayNights(bookingRules), [bookingRules])
  const copy = useMemo(() => getMessages(locale).listing.availabilityCalendar, [locale])

  const clearSelection = () => {
    lastEndTsRef.current = null
    setStartDate(null)
    setEndDate(null)
  }

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
      <div className={clsx(datepickerStyles.datepickerScope, 'listing-availability-calendar')}>
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
          renderDayContents={(day, date) =>
            renderListingCalendarDayContents(day, date, byYmd, formatLocalYmd)
          }
        />
        </div>
      </div>

      {startDate ? (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={clearSelection}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-neutral-500 underline-offset-2 transition hover:text-neutral-800 hover:underline dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            {copy.clearDates}
          </button>
        </div>
      ) : null}

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
  embedded = false,
}: {
  locale: string
  initialDays?: ListingAvailabilityDay[]
  bookingRules?: StayBookingRules
  onCompleteRange?: (start: Date, end: Date) => void
  initialMonthsShown?: 1 | 2
  embedded?: boolean
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
    <div
      className={clsx(
        embedded
          ? undefined
          : 'rounded-[20px] border border-indigo-100 bg-white p-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)] md:p-10 dark:border-neutral-700 dark:bg-neutral-900',
      )}
    >
      {embedded ? null : (
        <div className="mb-7">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{copy.title}</h2>
          <p className="mt-1.5 text-sm font-medium text-neutral-500 dark:text-neutral-400">{copy.subtitle}</p>
          {rulesLines.length > 0 ? (
            <ul className="mt-6 flex flex-col gap-2.5">
              {rulesLines.map((line) => (
                <li key={line} className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <span
                    aria-hidden
                    className="mr-3 inline-block size-1.5 shrink-0 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 shadow-sm"
                  />
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      <SectionDateRangeCalendar
        locale={locale}
        initialDays={initialDays}
        bookingRules={bookingRules}
        onCompleteRange={onCompleteRange}
        initialMonthsShown={initialMonthsShown}
      />

      <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-indigo-100 pt-7 dark:border-neutral-700">
        <li className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="inline-block size-4 shrink-0 rounded-full border-2 border-indigo-100 bg-white shadow-sm dark:border-neutral-600 dark:bg-neutral-900"
          />
          <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">{copy.legendAvailable}</span>
        </li>
        <li className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="relative inline-block size-4 shrink-0 overflow-hidden rounded-full border-2 border-indigo-100 bg-[linear-gradient(225deg,rgba(148,163,184,0.55)_50%,transparent_50%)] shadow-sm dark:border-neutral-600"
          />
          <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">{copy.legendCheckin}</span>
        </li>
        <li className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="relative inline-block size-4 shrink-0 overflow-hidden rounded-full border-2 border-indigo-100 bg-[linear-gradient(45deg,rgba(148,163,184,0.55)_50%,transparent_50%)] shadow-sm dark:border-neutral-600"
          />
          <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">{copy.legendCheckout}</span>
        </li>
        <li className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="relative inline-block size-4 shrink-0 overflow-hidden rounded-full border-2 border-indigo-100 bg-white shadow-sm dark:border-neutral-600 dark:bg-neutral-900"
          >
            <span className="absolute top-[7px] left-[-2px] block h-0.5 w-[140%] rotate-45 bg-neutral-300 dark:bg-neutral-500" />
          </span>
          <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">{copy.legendTurnover}</span>
        </li>
        <li className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border-2 border-neutral-200 bg-neutral-100 text-[10px] font-medium text-neutral-300 line-through decoration-neutral-400 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-500"
          >
            11
          </span>
          <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">{copy.legendBlocked}</span>
        </li>
        <li className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="inline-block size-4 shrink-0 rounded-full border-2 border-amber-500 bg-amber-400 shadow-sm"
          />
          <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">{copy.legendOption}</span>
        </li>
        <li className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="inline-block size-4 shrink-0 rounded-full border-2 border-emerald-600 bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm"
          />
          <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">{copy.legendPromo}</span>
        </li>
      </ul>
    </div>
  )
}

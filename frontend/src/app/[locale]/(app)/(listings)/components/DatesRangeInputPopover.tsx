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
import { getMessages } from '@/utils/getT'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { Calendar04Icon, Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import React, { FC, useCallback, useMemo, useState } from 'react'
import DatePicker from 'react-datepicker'
import datepickerStyles from '@/styles/react-datepicker.module.css'

function initDefaultRange(): [Date, Date] {
  const s = new Date()
  s.setHours(0, 0, 0, 0)
  const e = new Date(s)
  e.setDate(e.getDate() + 3)
  return [s, e]
}

interface Props {
  className?: string
  /** Dil; tarih etiketi ve alt satır çevirileri için */
  locale?: string
  /** Kontrollü mod: takvim üst bileşenden yönetilir */
  rangeStart?: Date | null
  rangeEnd?: Date | null
  onRangeChange?: (dates: [Date | null, Date | null]) => void
  /** Konaklama rezervasyon kuralları (min. gece, önceden rezervasyon) */
  bookingRules?: StayBookingRules
  /** Konaklama müsaitliği — takvimde dolu günleri filtreler */
  availabilityDays?: ListingAvailabilityDay[]
  /** Takvim paneli konumu / genişliği (checkout vb.) */
  panelClassName?: string
  /** Varsayılan düğme yerine özel tetikleyici (checkout kalem satırı) */
  renderTrigger?: (ctx: {
    open: boolean
    startDate: Date | null
    endDate: Date | null
  }) => React.ReactNode
}

const DatesRangeInputPopover: FC<Props> = ({
  className = 'flex-1',
  locale,
  rangeStart: rangeStartProp,
  rangeEnd: rangeEndProp,
  onRangeChange,
  bookingRules,
  availabilityDays,
  panelClassName,
  renderTrigger,
}) => {
  const controlled = typeof onRangeChange === 'function'
  const [internalStart, setInternalStart] = useState<Date | null>(() =>
    controlled ? null : initDefaultRange()[0],
  )
  const [internalEnd, setInternalEnd] = useState<Date | null>(() =>
    controlled ? null : initDefaultRange()[1],
  )

  const startDate = controlled ? (rangeStartProp ?? null) : internalStart
  const endDate = controlled ? (rangeEndProp ?? null) : internalEnd

  const msgs = useMemo(() => getMessages(locale), [locale])
  const intlLocale = useMemo(() => intlDateLocaleTag(locale), [locale])
  const pickerLocale = useMemo(() => datePickerLocaleId(locale), [locale])
  const monthsShown = useResponsiveCalendarMonthsShown()

  /** react-datepicker ilk boyamada onChange tetikleyebilir; üstteki setState ile aynı commit’te çakışmasın diye ertelenir */
  const onChangeDate = useCallback(
    (dates: [Date | null, Date | null]) => {
      const [start, end] = dates
      if (controlled) {
        queueMicrotask(() => onRangeChange?.(dates))
      } else {
        setInternalStart(start)
        setInternalEnd(end)
      }
    },
    [controlled, onRangeChange],
  )

  const todayYmd = formatLocalYmd(new Date())
  const todayStart = useMemo(() => startOfLocalDay(new Date()), [todayYmd])
  const effectiveMinDate = useMemo(
    () => earliestCheckInDate(todayStart, bookingRules?.minAdvanceBookingDays),
    [todayStart, bookingRules?.minAdvanceBookingDays],
  )
  const maxDate = useMemo(() => {
    const t = new Date(effectiveMinDate)
    t.setMonth(t.getMonth() + 24)
    return t
  }, [effectiveMinDate])
  const minNights = useMemo(() => resolvedMinStayNights(bookingRules), [bookingRules])
  const byYmd = useMemo(() => listingAvailabilityByYmd(availabilityDays ?? []), [availabilityDays])

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
    [effectiveMinDate, byYmd, startDate, endDate, minNights, bookingRules?.allowSubMinStayGapBooking],
  )

  const renderInput = () => {
    const checkInOutLabel = `${msgs.HeroSearchForm.CheckIn} - ${msgs.HeroSearchForm.CheckOut}`
    const rangeLabel = startDate?.toLocaleDateString(intlLocale, {
      month: 'short',
      day: '2-digit',
    })
    const endPart =
      endDate != null
        ? ' - ' +
          endDate.toLocaleDateString(intlLocale, {
            month: 'short',
            day: '2-digit',
          })
        : ''

    return (
      <>
        <div className="text-neutral-300 dark:text-neutral-400">
          <HugeiconsIcon icon={Calendar04Icon} className="h-5 w-5 lg:h-7 lg:w-7" strokeWidth={1.75} />
        </div>
        <div className="grow text-start">
          <span className="block font-semibold text-neutral-900 xl:text-lg dark:text-neutral-100">
            {startDate ? `${rangeLabel}${endPart}` : checkInOutLabel}
          </span>
          {startDate ? (
            <span className="mt-1 block text-sm leading-none font-normal text-neutral-400 dark:text-neutral-500">
              {checkInOutLabel}
            </span>
          ) : null}
        </div>
      </>
    )
  }

  return (
    <>
      <Popover className={`group relative z-50 flex ${className}`}>
        {({ open }) => (
          <>
            <PopoverButton
              className={
                renderTrigger
                  ? 'relative w-full flex flex-1 cursor-pointer text-start focus:outline-hidden'
                  : 'relative flex flex-1 cursor-pointer items-center gap-x-3 p-3 group-data-open:shadow-lg focus:outline-hidden'
              }
            >
              {renderTrigger ? renderTrigger({ open, startDate, endDate }) : renderInput()}
              {!renderTrigger && startDate && open && (
                <span
                  className={
                    'absolute end-1 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 transform items-center justify-center rounded-full bg-neutral-100 text-sm text-neutral-500 lg:end-3 lg:h-6 lg:w-6 dark:bg-neutral-800 dark:text-neutral-400'
                  }
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-4" strokeWidth={1.75} />
                </span>
              )}
            </PopoverButton>

            <PopoverPanel
              transition
              className={
                panelClassName ??
                'absolute start-auto -end-2 top-full z-[100] mt-3 w-[calc(100%+1rem)] transition duration-150 data-closed:translate-y-1 data-closed:opacity-0 lg:w-3xl xl:-end-10'
              }
            >
              <div className="rounded-3xl bg-white py-5 shadow-lg ring-1 ring-black/5 sm:p-8 dark:bg-neutral-800 dark:ring-white/10">
                <div className={datepickerStyles.datepickerScope}>
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
                    renderCustomHeader={(p) => (
                      <DatePickerCustomHeaderTwoMonth {...p} monthLocale={intlLocale} monthsShown={monthsShown} />
                    )}
                    renderDayContents={(day, date) =>
                      renderListingCalendarDayContents(day, date, byYmd, formatLocalYmd)
                    }
                  />
                </div>
                {startDate ? (
                  <div className="mt-3 flex justify-end border-t border-neutral-100 px-2 pt-3 sm:px-0 dark:border-neutral-700">
                    <button
                      type="button"
                      onClick={() => onChangeDate([null, null])}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-neutral-500 underline-offset-2 transition hover:text-neutral-800 hover:underline dark:text-neutral-400 dark:hover:text-neutral-100"
                    >
                      {msgs.listing.availabilityCalendar.clearDates}
                    </button>
                  </div>
                ) : null}
              </div>
            </PopoverPanel>
          </>
        )}
      </Popover>

      <input type="hidden" name="startDate" value={startDate ? startDate.toISOString() : ''} />
      <input type="hidden" name="endDate" value={endDate ? endDate.toISOString() : ''} />
    </>
  )
}

export default DatesRangeInputPopover

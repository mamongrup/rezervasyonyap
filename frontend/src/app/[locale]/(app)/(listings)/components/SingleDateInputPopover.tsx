'use client'

import DatePickerCustomDay from '@/components/DatePickerCustomDay'
import DatePickerCustomHeaderTwoMonth from '@/components/DatePickerCustomHeaderTwoMonth'
import { formatLocalYmd } from '@/lib/date-format-local'
import { datePickerLocaleId, intlDateLocaleTag } from '@/lib/i18n-config'
import '@/lib/register-datepicker-locales'
import { startOfLocalDay } from '@/lib/stay-booking-rules'
import { useResponsiveCalendarMonthsShown } from '@/hooks/use-responsive-calendar-months-shown'
import { getMessages } from '@/utils/getT'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { Calendar04Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { FC, useMemo } from 'react'
import DatePicker from 'react-datepicker'
import datepickerStyles from '@/styles/react-datepicker.module.css'

interface Props {
  locale?: string
  selectedDate: Date | null
  onDateChange: (date: Date | null) => void
  /** Alan etiketi (ör. «Tarih») — yalnızca `embedded` dışı modda üstte gösterilir */
  label?: string
  className?: string
  minDate?: Date
  /** SSR genişlik tahmini — istemcide `useResponsiveCalendarMonthsShown` ile güncellenir */
  initialMonthsShown?: 1 | 2
  panelClassName?: string
  filterDate?: (date: Date) => boolean
  /** Rezervasyon kartı içi — DatesRangeInputPopover ile aynı tetikleyici */
  embedded?: boolean
}

const SingleDateInputPopover: FC<Props> = ({
  locale,
  selectedDate,
  onDateChange,
  label,
  className = '',
  minDate,
  initialMonthsShown = 1,
  panelClassName,
  filterDate,
  embedded = false,
}) => {
  const msgs = useMemo(() => getMessages(locale), [locale])
  const intlLocale = useMemo(() => intlDateLocaleTag(locale), [locale])
  const pickerLocale = useMemo(() => datePickerLocaleId(locale), [locale])
  const monthsShown = useResponsiveCalendarMonthsShown(initialMonthsShown)
  const effectiveMinDate = useMemo(
    () => minDate ?? startOfLocalDay(new Date()),
    [minDate],
  )

  const addDates = msgs.listing.sidebar.addDates
  const sublabel = label ?? msgs.listing.activityBooking.dateLabel

  const shortDateLabel =
    selectedDate?.toLocaleDateString(intlLocale, {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }) ?? addDates

  const longDateLabel =
    selectedDate?.toLocaleDateString(intlLocale, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }) ?? addDates

  const panelClasses =
    panelClassName ??
    'absolute start-auto -end-2 top-full z-[100] mt-3 w-[calc(100%+1rem)] transition duration-150 data-closed:translate-y-1 data-closed:opacity-0 lg:w-3xl xl:-end-10'

  const calendarPanel = (close: () => void) => (
    <PopoverPanel transition className={panelClasses}>
      <div className="rounded-3xl bg-white py-5 shadow-lg ring-1 ring-black/5 sm:p-8 dark:bg-neutral-800 dark:ring-white/10">
        <div className={datepickerStyles.datepickerScope}>
          <DatePicker
            locale={pickerLocale}
            openToDate={selectedDate ?? effectiveMinDate}
            selected={selectedDate}
            onChange={(date: Date | null) => {
              onDateChange(date)
              if (date) close()
            }}
            monthsShown={monthsShown}
            showPopperArrow={false}
            inline
            minDate={effectiveMinDate}
            filterDate={filterDate}
            renderCustomHeader={(p) => (
              <DatePickerCustomHeaderTwoMonth {...p} monthLocale={intlLocale} monthsShown={monthsShown} />
            )}
            renderDayContents={(day, date) => <DatePickerCustomDay dayOfMonth={day} date={date} />}
          />
        </div>
      </div>
    </PopoverPanel>
  )

  if (embedded) {
    return (
      <Popover className={clsx('group relative z-50 flex flex-1', className)}>
        {({ close }) => (
          <>
            <PopoverButton
              type="button"
              className="relative flex flex-1 cursor-pointer items-center gap-x-3 rounded-t-3xl p-3 group-data-open:shadow-lg focus:outline-hidden"
            >
              <div className="text-neutral-300 dark:text-neutral-400">
                <HugeiconsIcon icon={Calendar04Icon} className="h-5 w-5 lg:h-7 lg:w-7" strokeWidth={1.75} />
              </div>
              <div className="grow text-start">
                <span className="block font-semibold text-neutral-900 xl:text-lg dark:text-neutral-100">
                  {shortDateLabel}
                </span>
                <span className="mt-1 block text-sm leading-none font-normal text-neutral-400 dark:text-neutral-500">
                  {sublabel}
                </span>
              </div>
            </PopoverButton>
            {calendarPanel(close)}
            <input type="hidden" name="activityDate" value={selectedDate ? formatLocalYmd(selectedDate) : ''} />
          </>
        )}
      </Popover>
    )
  }

  return (
    <Popover className={`relative z-50 ${className}`}>
      {({ close }) => (
        <>
          {label ? (
            <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">
              <HugeiconsIcon icon={Calendar04Icon} className="h-4 w-4" strokeWidth={1.75} />
              {label}
            </span>
          ) : null}
          <PopoverButton
            type="button"
            className="flex w-full cursor-pointer items-center gap-x-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-start text-sm transition-shadow hover:border-primary-300 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500/40 data-open:border-primary-400 data-open:shadow-md dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-primary-500 dark:data-open:border-primary-500"
          >
            {!label ? (
              <span className="text-neutral-400 dark:text-neutral-500">
                <HugeiconsIcon icon={Calendar04Icon} className="h-5 w-5" strokeWidth={1.75} />
              </span>
            ) : null}
            <span className="font-medium text-neutral-900 dark:text-neutral-100">{longDateLabel}</span>
          </PopoverButton>
          {calendarPanel(close)}
          <input type="hidden" name="activityDate" value={selectedDate ? formatLocalYmd(selectedDate) : ''} />
        </>
      )}
    </Popover>
  )
}

export default SingleDateInputPopover

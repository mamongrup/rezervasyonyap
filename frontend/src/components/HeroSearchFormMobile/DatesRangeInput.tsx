'use client'

import DatePickerCustomDay from '@/components/DatePickerCustomDay'
import DatePickerCustomHeaderTwoMonth from '@/components/DatePickerCustomHeaderTwoMonth'
import { datePickerLocaleId } from '@/lib/i18n-config'
import '@/lib/register-datepicker-locales'
import { getMessages } from '@/utils/getT'
import clsx from 'clsx'
import { useParams } from 'next/navigation'
import { formatLocalYmd } from '@/utils/format-local-ymd'
import { FC, useEffect, useState } from 'react'
import DatePicker from 'react-datepicker'
import datepickerStyles from '@/styles/react-datepicker.module.css'

interface Props {
  className?: string
  onChange?: (value: [Date | null, Date | null]) => void
  defaultStartDate?: Date | null
  defaultEndDate?: Date | null
  /** Tarihleri üst forma aktardıktan sonra sonraki panele geçmek için. */
  onApply?: () => void
}

const StayDatesRangeInput: FC<Props> = ({ className, defaultEndDate, defaultStartDate, onChange, onApply }) => {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const m = getMessages(locale)
  const [startDate, setStartDate] = useState<Date | null>(defaultStartDate ?? null)
  const [endDate, setEndDate] = useState<Date | null>(defaultEndDate ?? null)

  useEffect(() => {
    setStartDate(defaultStartDate ?? null)
  }, [defaultStartDate])

  useEffect(() => {
    setEndDate(defaultEndDate ?? null)
  }, [defaultEndDate])

  const onChangeDate = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates
    setStartDate(start)
    setEndDate(end)
  }

  const clearDates = () => {
    setStartDate(null)
    setEndDate(null)
    onChange?.([null, null])
  }

  const applyDates = () => {
    if (!startDate || !endDate) return
    onChange?.([startDate, endDate])
    onApply?.()
  }

  return (
    <>
      <div className={clsx(className)}>
        <h3 className="block text-center text-xl font-semibold sm:text-2xl">
          {m.HeroSearchForm["When's your trip?"]}
        </h3>
        <div className="relative z-10 flex shrink-0 justify-center py-5">
          <div className={datepickerStyles.datepickerScope}>
            <DatePicker
              locale={datePickerLocaleId(locale)}
              selected={startDate}
              onChange={onChangeDate}
              startDate={startDate}
              endDate={endDate}
              selectsRange
              monthsShown={1}
              showPopperArrow={false}
              inline
              renderCustomHeader={(p) => <DatePickerCustomHeaderTwoMonth {...p} monthsShown={1} />}
              renderDayContents={(day, date) => <DatePickerCustomDay dayOfMonth={day} date={date} />}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-700">
          <button
            type="button"
            onClick={clearDates}
            className="min-h-11 rounded-xl px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            {m.categoryPage.listingFilters.clear}
          </button>
          <button
            type="button"
            onClick={applyDates}
            disabled={!startDate || !endDate}
            className="min-h-11 rounded-xl bg-primary-600 px-6 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {m.categoryPage.listingFilters.apply}
          </button>
        </div>
      </div>

      {/* input:hidde */}
      <input type="hidden" name="checkin" value={startDate ? formatLocalYmd(startDate) : ''} />
      <input type="hidden" name="checkout" value={endDate ? formatLocalYmd(endDate) : ''} />
    </>
  )
}

export default StayDatesRangeInput

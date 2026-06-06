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
}

const StayDatesRangeInput: FC<Props> = ({ className, defaultEndDate, defaultStartDate, onChange }) => {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const m = getMessages(locale)
  const [startDate, setStartDate] = useState<Date | null>(defaultStartDate ?? null)
  const [endDate, setEndDate] = useState<Date | null>(defaultEndDate ?? null)

  useEffect(() => {
    if (defaultStartDate) setStartDate(defaultStartDate)
  }, [defaultStartDate])

  useEffect(() => {
    if (defaultEndDate) setEndDate(defaultEndDate)
  }, [defaultEndDate])

  const onChangeDate = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates
    setStartDate(start)
    setEndDate(end)
    if (onChange) {
      onChange([start, end])
    }
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
      </div>

      {/* input:hidde */}
      <input type="hidden" name="checkin" value={startDate ? formatLocalYmd(startDate) : ''} />
      <input type="hidden" name="checkout" value={endDate ? formatLocalYmd(endDate) : ''} />
    </>
  )
}

export default StayDatesRangeInput

'use client'

import DatePickerCustomDay from '@/components/DatePickerCustomDay'
import DatePickerCustomHeaderTwoMonth from '@/components/DatePickerCustomHeaderTwoMonth'
import DatePicker from '@/components/DatePickerWithLocales'
import type { ReactDatePickerCustomHeaderProps } from 'react-datepicker'

type MonthsShown = 1 | 2

export default function DateRangePickerPanel({
  isOnlySingleDate,
  monthsShown,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
}: {
  isOnlySingleDate: boolean
  monthsShown: MonthsShown
  startDate: Date | null
  endDate: Date | null
  setStartDate: (d: Date | null) => void
  setEndDate: (d: Date | null) => void
}) {
  if (isOnlySingleDate) {
    return (
      <DatePicker
        locale="tr"
        selected={startDate}
        onChange={(date: Date | null) => {
          setStartDate(date)
          setEndDate(new Date((date?.getTime() || 0) + 2 * 24 * 60 * 60 * 1000))
        }}
        startDate={startDate}
        monthsShown={monthsShown}
        showPopperArrow={false}
        inline
        renderCustomHeader={(p: ReactDatePickerCustomHeaderProps) => (
          <DatePickerCustomHeaderTwoMonth {...p} monthsShown={monthsShown} />
        )}
        renderDayContents={(day: number, date?: Date) => <DatePickerCustomDay dayOfMonth={day} date={date} />}
      />
    )
  }

  return (
    <DatePicker
      locale="tr"
      selected={startDate}
      onChange={(dates: [Date | null, Date | null]) => {
        const [start, end] = dates
        setStartDate(start)
        setEndDate(end)
      }}
      startDate={startDate}
      endDate={endDate}
      selectsRange
      monthsShown={monthsShown}
      showPopperArrow={false}
      inline
      renderCustomHeader={(p: ReactDatePickerCustomHeaderProps) => (
        <DatePickerCustomHeaderTwoMonth {...p} monthsShown={monthsShown} />
      )}
      renderDayContents={(day: number, date?: Date) => <DatePickerCustomDay dayOfMonth={day} date={date} />}
    />
  )
}

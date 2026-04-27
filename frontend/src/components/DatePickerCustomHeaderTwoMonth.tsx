import { ArrowLeft02Icon, ArrowRight02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { ReactDatePickerCustomHeaderProps } from 'react-datepicker'

type Props = ReactDatePickerCustomHeaderProps & {
  /** Intl BCP 47 — ay/yıl başlığı (`monthLocale` yoksa `tr-TR`) */
  monthLocale?: string
  /** `DatePicker` ile aynı olmalı: tek ayda önceki/sonraki oklar aynı başlıkta; iki ayda uçlar paylaşılır */
  monthsShown?: 1 | 2
}

const DatePickerCustomHeaderTwoMonth = ({
  monthDate,
  customHeaderCount,
  decreaseMonth,
  increaseMonth,
  monthLocale = 'tr-TR',
  monthsShown = 2,
}: Props) => {
  const splitMonthNavigation = monthsShown === 2

  return (
    <div>
      <button
        aria-label="Previous Month"
        className={
          'react-datepicker__navigation react-datepicker__navigation--previous absolute -top-1 left-0 flex items-center justify-center rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700'
        }
        style={splitMonthNavigation && customHeaderCount === 1 ? { visibility: 'hidden' } : {}}
        onClick={decreaseMonth}
        type="button"
      >
        <span className="react-datepicker__navigation-icon react-datepicker__navigation-icon--previous">
          <HugeiconsIcon icon={ArrowLeft02Icon} className="h-5 w-5" strokeWidth={1.75} />
        </span>
      </button>
      <span className="react-datepicker__current-month">
        {monthDate.toLocaleString(monthLocale, {
          month: 'long',
          year: 'numeric',
        })}
      </span>
      <button
        aria-label="Next Month"
        className="react-datepicker__navigation react-datepicker__navigation--next absolute -top-1 -right-0 flex items-center justify-center rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        style={splitMonthNavigation && customHeaderCount === 0 ? { visibility: 'hidden' } : {}}
        type="button"
        onClick={increaseMonth}
      >
        <span className="react-datepicker__navigation-icon react-datepicker__navigation-icon--next">
          <HugeiconsIcon icon={ArrowRight02Icon} className="h-5 w-5" strokeWidth={1.75} />
        </span>
      </button>
    </div>
  )
}

export default DatePickerCustomHeaderTwoMonth

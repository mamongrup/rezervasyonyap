'use client'

import T from '@/utils/getT'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { Calendar04Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { useResponsiveCalendarMonthsShown } from '@/hooks/use-responsive-calendar-months-shown'
import dynamic from 'next/dynamic'
import { FC, useState } from 'react'
import { ClearDataButton } from './ClearDataButton'

const DateRangePickerPanel = dynamic(() => import('./DateRangePickerPanel'), {
  ssr: false,
  loading: () => (
    <div
      className="flex min-h-[22rem] w-full items-center justify-center rounded-2xl bg-neutral-100/90 dark:bg-neutral-800/90"
      aria-busy="true"
    >
      <div className="h-48 w-full max-w-md animate-pulse rounded-xl bg-neutral-200/80 dark:bg-neutral-700/80" />
    </div>
  ),
})

const DATE_LOCALE = 'tr-TR'

const styles = {
  button: {
    base: 'relative z-10 shrink-0 w-full cursor-pointer flex items-center gap-x-3 focus:outline-hidden text-start',
    focused: 'rounded-full bg-transparent focus-visible:outline-hidden dark:bg-white/5 custom-shadow-1',
    default: 'px-5 py-6 sm:px-6 lg:px-7 xl:py-7',
    small: 'py-3 px-7 xl:px-8',
  },
  mainText: {
    default: 'text-lg leading-tight xl:text-xl',
    small: 'text-base',
  },
  panel: {
    base: 'absolute top-full z-10 mt-3 w-3xl transition duration-150 data-closed:translate-y-1 data-closed:opacity-0 left-1/2 -translate-x-1/2 overflow-hidden rounded-3xl bg-white p-8 shadow-lg ring-1 ring-black/5 dark:bg-neutral-800',
    default: '',
    small: '',
  },
}

interface Props {
  className?: string
  fieldStyle: 'default' | 'small'
  clearDataButtonClassName?: string
  description?: string
  panelClassName?: string
  isOnlySingleDate?: boolean
}

export const DateRangeField: FC<Props> = ({
  className = 'flex-1',
  fieldStyle = 'default',
  clearDataButtonClassName,
  description = `${T['HeroSearchForm']['CheckIn']} - ${T['HeroSearchForm']['CheckOut']}`,
  panelClassName,
  isOnlySingleDate = false,
}) => {
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const monthsShown = useResponsiveCalendarMonthsShown()

  return (
    <>
      <Popover className={`group relative z-10 flex ${className}`}>
        {({ open: showPopover }) => (
          <>
            <PopoverButton
              className={clsx(styles.button.base, styles.button[fieldStyle], showPopover && styles.button.focused)}
            >
              {fieldStyle === 'default' && (
                <HugeiconsIcon
                  icon={Calendar04Icon}
                  className="size-5 shrink-0 text-neutral-400 lg:size-6 dark:text-neutral-500"
                  strokeWidth={1.75}
                />
              )}

              <div className="flex-1 text-start">
                <span className={clsx('block font-semibold text-neutral-900 dark:text-neutral-100', styles.mainText[fieldStyle])}>
                  {startDate?.toLocaleDateString(DATE_LOCALE, {
                    month: 'short',
                    day: '2-digit',
                  }) || T['HeroSearchForm']['Add dates']}
                  {endDate && !isOnlySingleDate
                    ? ' – ' +
                      endDate?.toLocaleDateString(DATE_LOCALE, {
                        month: 'short',
                        day: '2-digit',
                      })
                    : ''}
                </span>
                <span className="mt-0.5 block text-xs leading-tight font-normal text-neutral-700 dark:text-neutral-300">
                  {description || T['HeroSearchForm']['Add dates']}
                </span>
              </div>
            </PopoverButton>

            <ClearDataButton
              className={clsx(!startDate && !endDate && 'sr-only', clearDataButtonClassName)}
              onClick={() => {
                setStartDate(null)
                setEndDate(null)
              }}
            />

            <PopoverPanel
              transition
              className={clsx(panelClassName, styles.panel.base, styles.panel[fieldStyle])}
            >
              <DateRangePickerPanel
                isOnlySingleDate={isOnlySingleDate}
                monthsShown={monthsShown}
                startDate={startDate}
                endDate={endDate}
                setStartDate={setStartDate}
                setEndDate={setEndDate}
              />
            </PopoverPanel>
          </>
        )}
      </Popover>

      {/* input:hidde */}
      <input type="hidden" name="checkin" value={startDate ? startDate.toISOString().split('T')[0] : ''} />
      {!isOnlySingleDate && (
        <input type="hidden" name="checkout" value={endDate ? endDate.toISOString().split('T')[0] : ''} />
      )}
    </>
  )
}

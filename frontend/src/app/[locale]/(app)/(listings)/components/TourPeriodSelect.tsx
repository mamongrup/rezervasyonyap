'use client'

import {
  formatTourPeriodDateRange,
  isTourPeriodBookable,
  type TourPeriodOption,
} from '@/lib/tour-periods'
import { useFormatMoneyInPreferredCurrency } from '@/contexts/preferred-currency-context'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { ArrowDown01Icon, Calendar04Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { FC, useEffect, useMemo } from 'react'

interface Props {
  className?: string
  periods: TourPeriodOption[]
  selectedId?: string
  onChange?: (period: TourPeriodOption | null) => void
  locale?: string
}

const TourPeriodSelect: FC<Props> = ({ className = 'flex-1', periods, selectedId, onChange, locale = 'tr' }) => {
  const selected = useMemo(
    () => periods.find((p) => p.id === selectedId) ?? periods.find((p) => p.bookable !== false) ?? periods[0] ?? null,
    [selectedId, periods],
  )

  function PeriodPriceLabel({ period }: { period: TourPeriodOption }) {
    const label = useFormatMoneyInPreferredCurrency(period.price, period.currencyCode)
    return <>{label}</>
  }

  useEffect(() => {
    if (selectedId == null && selected && onChange) {
      onChange(selected)
    }
  }, [selected, selectedId, onChange])

  const setSelected = (period: TourPeriodOption | null) => {
    if (period) onChange?.(period)
  }

  if (periods.length === 0) {
    return (
      <div className={`flex flex-1 items-center gap-x-3 p-3 ${className}`}>
        <div className="text-neutral-300 dark:text-neutral-400">
          <HugeiconsIcon icon={Calendar04Icon} className="h-5 w-5 lg:h-7 lg:w-7" strokeWidth={1.75} />
        </div>
        <div className="grow text-start">
          <span className="block font-semibold text-neutral-900 xl:text-lg dark:text-neutral-100">
            Tarih bilgisi yok
          </span>
          <span className="mt-1 block text-sm leading-none font-normal text-neutral-400 dark:text-neutral-500">
            Bu tur için dönem listesi henüz yüklenmedi
          </span>
        </div>
      </div>
    )
  }

  const triggerLabel = selected
    ? formatTourPeriodDateRange(selected.startDate, selected.endDate)
    : 'Tarih seçin'

  const triggerSub =
    selected && !isTourPeriodBookable(selected)
      ? 'Planlanmış — satışa kapalı'
      : selected?.monthLabel ?? 'Tarih seçimi'

  return (
    <>
      <Popover className={`group relative z-50 flex ${className}`}>
        {({ open, close }) => (
          <>
            <PopoverButton className="relative flex flex-1 cursor-pointer items-center gap-x-3 rounded-t-3xl p-3 group-data-open:shadow-lg focus:outline-hidden">
              <div className="text-neutral-300 dark:text-neutral-400">
                <HugeiconsIcon icon={Calendar04Icon} className="h-5 w-5 lg:h-7 lg:w-7" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 grow text-start">
                <span className="block truncate font-semibold text-neutral-900 xl:text-lg dark:text-neutral-100">
                  {triggerLabel}
                </span>
                <span className="mt-1 block text-sm leading-none font-normal text-neutral-400 dark:text-neutral-500">
                  {triggerSub}
                </span>
              </div>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                className={`h-5 w-5 shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
                strokeWidth={1.75}
              />
            </PopoverButton>

            <PopoverPanel
              transition
              className="absolute start-0 end-0 top-full z-[100] mt-1 max-h-72 overflow-y-auto rounded-2xl border border-neutral-200 bg-white py-1 shadow-xl transition duration-150 data-closed:translate-y-1 data-closed:opacity-0 dark:border-neutral-700 dark:bg-neutral-900"
            >
              {periods.map((period) => {
                const isActive = selected?.id === period.id
                const canBook = isTourPeriodBookable(period)
                return (
                  <button
                    key={period.id}
                    type="button"
                    onClick={() => {
                      setSelected(period)
                      close()
                    }}
                    className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm transition-colors ${
                      isActive
                        ? 'border-s-2 border-primary-600 bg-neutral-50 text-neutral-900 dark:border-primary-400 dark:bg-neutral-800 dark:text-neutral-100'
                        : canBook
                          ? 'border-s-2 border-transparent text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800'
                          : 'border-s-2 border-transparent text-neutral-400 hover:bg-neutral-50 dark:text-neutral-500 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    <span className={`font-medium ${!canBook ? 'opacity-75' : ''}`}>
                      {formatTourPeriodDateRange(period.startDate, period.endDate)}
                      {period.monthLabel && canBook ? (
                        <span className="ms-2 text-xs font-normal text-neutral-400">{period.monthLabel}</span>
                      ) : null}
                      {!canBook ? (
                        <span className="ms-2 text-xs font-normal text-neutral-400">Pasif</span>
                      ) : null}
                    </span>
                    <span
                      className={`shrink-0 text-end text-xs font-semibold tabular-nums sm:text-sm ${
                        canBook
                          ? 'text-neutral-900 dark:text-neutral-100'
                          : 'text-neutral-400 dark:text-neutral-500'
                      }`}
                    >
                      {canBook ? (
                        <PeriodPriceLabel period={period} />
                      ) : (
                        'Satışa kapalı'
                      )}
                    </span>
                  </button>
                )
              })}
            </PopoverPanel>
          </>
        )}
      </Popover>

      {selected && isTourPeriodBookable(selected) ? (
        <>
          <input type="hidden" name="tourPeriodId" value={selected.id} />
          <input type="hidden" name="startDate" value={selected.startDate} />
          <input type="hidden" name="endDate" value={selected.endDate} />
        </>
      ) : null}
    </>
  )
}

export default TourPeriodSelect

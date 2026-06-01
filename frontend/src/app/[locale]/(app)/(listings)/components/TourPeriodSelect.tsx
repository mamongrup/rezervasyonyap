'use client'

import {
  formatTourPeriodDateRange,
  formatTourPeriodPrice,
  type TourPeriodOption,
} from '@/lib/tour-periods'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { ArrowDown01Icon, Calendar04Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { FC, useMemo, useState } from 'react'

interface Props {
  className?: string
  periods: TourPeriodOption[]
  selectedId?: string
  onChange?: (period: TourPeriodOption | null) => void
}

const TourPeriodSelect: FC<Props> = ({ className = 'flex-1', periods, selectedId, onChange }) => {
  const [internalId, setInternalId] = useState(periods[0]?.id ?? '')

  const activeId = selectedId ?? internalId
  const selected = useMemo(
    () => periods.find((p) => p.id === activeId) ?? periods[0] ?? null,
    [activeId, periods],
  )

  const setSelected = (period: TourPeriodOption | null) => {
    if (period) {
      if (selectedId == null) setInternalId(period.id)
      onChange?.(period)
    }
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
                  Tarih seçimi
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
                        : 'border-s-2 border-transparent text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <span className="font-medium">
                      {formatTourPeriodDateRange(period.startDate, period.endDate)}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                      {formatTourPeriodPrice(period.price, period.currencyCode)}
                    </span>
                  </button>
                )
              })}
            </PopoverPanel>
          </>
        )}
      </Popover>

      {selected ? (
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

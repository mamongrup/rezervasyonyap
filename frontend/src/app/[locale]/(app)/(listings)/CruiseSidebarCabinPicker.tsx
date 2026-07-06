'use client'

import { cabinDisplayPrice, type CruiseCabinOption } from '@/lib/cruise-meta'
import { useFormatMoneyInPreferredCurrency } from '@/contexts/preferred-currency-context'
import { getMessages } from '@/utils/getT'
import clsx from 'clsx'
import { Check } from 'lucide-react'
import { useCruiseCabinSelection } from './CruiseCabinContext'

function SidebarCabinOption({
  cabin,
  selected,
  perPersonLabel,
  onSelect,
}: {
  cabin: CruiseCabinOption
  selected: boolean
  perPersonLabel: string
  onSelect: () => void
}) {
  const format = useFormatMoneyInPreferredCurrency
  const fromPrice = cabinDisplayPrice(cabin)
  const priceLabel = fromPrice?.amount ? format(fromPrice.amount, fromPrice.currency) : '—'

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-start text-sm transition',
        selected
          ? 'border-primary-500 bg-primary-50/80 ring-1 ring-primary-500/30 dark:border-primary-400 dark:bg-primary-950/30'
          : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900/40 dark:hover:border-neutral-600',
      )}
    >
      <span
        className={clsx(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
          selected
            ? 'border-primary-600 bg-primary-600 text-white dark:border-primary-400 dark:bg-primary-500'
            : 'border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-900',
        )}
        aria-hidden
      >
        {selected ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug text-neutral-900 dark:text-white">{cabin.name}</span>
        {cabin.campaign ? (
          <span className="mt-0.5 block text-xs font-medium text-primary-700 dark:text-primary-300">
            {cabin.campaign}
          </span>
        ) : null}
        <span className="mt-1 block text-xs text-neutral-600 dark:text-neutral-400">
          {priceLabel}
          {fromPrice?.amount ? ` ${perPersonLabel}` : ''}
        </span>
      </span>
    </button>
  )
}

/** Rezervasyon kartı — dönem seçildikten sonra kabin listesi. */
export default function CruiseSidebarCabinPicker({ locale = 'tr' }: { locale?: string }) {
  const ctx = useCruiseCabinSelection()
  const m = getMessages(locale)
  const td = m.listing.tourDetail
  const cd = m.listing.cruiseDetail

  if (!ctx || ctx.cabins.length === 0) return null

  return (
    <div className="border-b border-neutral-200 px-3 py-3 dark:border-neutral-700">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {cd.sidebarCabinStepTitle ?? 'Kabin seçin'}
      </p>
      <ul className="max-h-60 space-y-2 overflow-y-auto pe-0.5">
        {ctx.cabins.map((cabin) => (
          <li key={cabin.id}>
            <SidebarCabinOption
              cabin={cabin}
              selected={ctx.selectedCabin?.id === cabin.id}
              perPersonLabel={td.pricePerPerson}
              onSelect={() => ctx.setSelectedCabinId(cabin.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

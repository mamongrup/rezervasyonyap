'use client'

import { useFormatMoneyInPreferredCurrency } from '@/contexts/preferred-currency-context'
import type { CruiseCabinOption, CruiseMoney } from '@/lib/cruise-meta'
import { getMessages } from '@/utils/getT'
import clsx from 'clsx'
import { CheckCircle2 } from 'lucide-react'
import { useCruiseCabinSelection } from './CruiseCabinContext'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'
import { LISTING_SECTION_STACKED } from './listing-section-classes'

function CabinPriceRow({
  label,
  price,
}: {
  label: string
  price: CruiseMoney | null | undefined
}) {
  const formatted = useFormatMoneyInPreferredCurrency(price?.amount, price?.currency)
  if (!price?.amount) return null
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
      <span className="font-medium text-neutral-900 dark:text-neutral-100">{formatted}</span>
    </div>
  )
}

export default function CruiseCabinPricingSection({ locale = 'tr' }: { locale?: string }) {
  const ctx = useCruiseCabinSelection()
  const m = getMessages(locale)
  const cd = m.listing.cruiseDetail

  if (!ctx?.cabins.length) return null

  return (
    <section id="cruise-cabins" className={clsx(LISTING_SECTION_STACKED, 'scroll-mt-28')}>
      <SectionHeading>{cd.cabinTypesTitle}</SectionHeading>
      <SectionSubheading>{cd.cabinTypesSubtitle}</SectionSubheading>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {ctx.cabins.map((cabin) => (
          <CabinCard
            key={cabin.id}
            cabin={cabin}
            selected={ctx.selectedCabin?.id === cabin.id}
            onSelect={() => ctx.setSelectedCabinId(cabin.id)}
            locale={locale}
          />
        ))}
      </div>
    </section>
  )
}

function CabinCard({
  cabin,
  selected,
  onSelect,
  locale,
}: {
  cabin: CruiseCabinOption
  selected: boolean
  onSelect: () => void
  locale: string
}) {
  const m = getMessages(locale)
  const cd = m.listing.cruiseDetail
  const hero = cabin.image_urls?.[0]

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'w-full rounded-2xl border p-4 text-start transition',
        selected
          ? 'border-primary-500 bg-primary-50/60 ring-2 ring-primary-500/30 dark:border-primary-400 dark:bg-primary-950/30'
          : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{cabin.name}</p>
          {cabin.campaign ? (
            <p className="mt-1 text-xs font-medium text-primary-700 dark:text-primary-300">
              {cabin.campaign}
            </p>
          ) : null}
        </div>
        {selected ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary-600" /> : null}
      </div>

      {hero ? (
        <img
          src={hero}
          alt={cabin.name}
          className="mt-3 h-36 w-full rounded-xl object-cover"
          loading="lazy"
        />
      ) : null}

      {cabin.description ? (
        <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          {cabin.description}
        </p>
      ) : null}

      <div className="mt-4 space-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-700">
        <CabinPriceRow
          label={cd.priceDouble}
          price={cabin.prices?.double_per_person ?? cabin.from_price}
        />
        <CabinPriceRow label={cd.priceExtraBed} price={cabin.prices?.extra_bed} />
        <CabinPriceRow label={cd.priceSingle} price={cabin.prices?.single} />
        {(cabin.prices?.children ?? []).map((child) => (
          <CabinPriceRow
            key={child.label}
            label={`${cd.priceChild} (${child.label})`}
            price={child}
          />
        ))}
        {cabin.footnote ? (
          <p className="pt-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="font-medium">{cd.cabinFootnote}: </span>
            {cabin.footnote}
          </p>
        ) : null}
      </div>
    </button>
  )
}

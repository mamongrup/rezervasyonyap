import {
  formatPoolDimensionsMm,
  hasAnyEnabledPool,
  type HolidayHomePools,
} from '@/lib/listing-pools'
import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import clsx from 'clsx'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'

const POOL_ORDER: (keyof HolidayHomePools)[] = ['open_pool', 'heated_pool', 'children_pool']

export default function ListingPoolInfoSection({
  locale,
  pools,
  demo = false,
  className,
}: {
  locale: string
  pools: HolidayHomePools | null | undefined
  /** API’de havuz yokken gelen örnek içerik */
  demo?: boolean
  className?: string
}) {
  if (!pools || !hasAnyEnabledPool(pools)) return null

  const messages = getMessages(locale)
  const pi = messages.listing.poolInfo
  const typeLabels = pi.types as Record<string, string>

  return (
    <div className={clsx('listingSection__wrap', className)}>
      <div>
        <SectionHeading>{pi.title}</SectionHeading>
        <SectionSubheading>{pi.subtitle}</SectionSubheading>
        {demo ? (
          <p className="mt-2 inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            {pi.demoBadge}
          </p>
        ) : null}
      </div>
      <Divider className="w-14!" />
      <div className="flex flex-col gap-5">
        {POOL_ORDER.map((key) => {
          const row = pools[key]
          if (!row.enabled) return null
          const dim = formatPoolDimensionsMm(row)
          return (
            <div
              key={key}
              className="rounded-2xl border border-neutral-200/90 bg-neutral-50/90 p-4 dark:border-neutral-700 dark:bg-neutral-800/40"
            >
              <p className="text-base font-semibold text-neutral-900 dark:text-white">{typeLabels[key] ?? key}</p>
              <dl className="mt-3 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                {dim ? (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-x-2">
                    <dt className="shrink-0 font-medium text-neutral-600 dark:text-neutral-400">{pi.dimensions}</dt>
                    <dd className="tabular-nums">{dim} m</dd>
                  </div>
                ) : null}
                {key === 'heated_pool' && row.heating_fee_per_day.trim() ? (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-x-2">
                    <dt className="shrink-0 font-medium text-neutral-600 dark:text-neutral-400">{pi.heatingFee}</dt>
                    <dd>{row.heating_fee_per_day.trim()}</dd>
                  </div>
                ) : null}
                {row.description.trim() ? (
                  <div>
                    <dt className="sr-only">{pi.notes}</dt>
                    <dd className="leading-relaxed text-neutral-600 dark:text-neutral-400">{row.description.trim()}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          )
        })}
      </div>
    </div>
  )
}

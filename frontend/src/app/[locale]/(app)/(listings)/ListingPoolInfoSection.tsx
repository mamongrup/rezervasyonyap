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
  variant = 'section',
}: {
  locale: string
  pools: HolidayHomePools | null | undefined
  /** API’de havuz yokken gelen örnek içerik */
  demo?: boolean
  className?: string
  /** `embedded`: olanaklar bölümünün hemen altında kompakt görünüm */
  variant?: 'section' | 'embedded'
}) {
  if (!pools || !hasAnyEnabledPool(pools)) return null

  const messages = getMessages(locale)
  const pi = messages.listing.poolInfo
  const typeLabels = pi.types as Record<string, string>
  const embedded = variant === 'embedded'

  return (
    <div
      className={clsx(
        embedded ? 'mt-8 border-t border-neutral-200 pt-8 dark:border-neutral-700' : 'listingSection__wrap',
        className,
      )}
    >
      {embedded ? (
        <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{pi.title}</h3>
      ) : (
        <>
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
        </>
      )}
      <div className={clsx('flex flex-col gap-4', embedded && 'mt-4')}>
        {POOL_ORDER.map((key) => {
          const row = pools[key]
          if (!row.enabled) return null
          const dim = formatPoolDimensionsMm(row)
          const description = row.description.trim()
          return (
            <div
              key={key}
              className="rounded-2xl border border-neutral-200/90 bg-neutral-50/90 p-4 dark:border-neutral-700 dark:bg-neutral-800/40"
            >
              <p className="text-base font-semibold text-neutral-900 dark:text-white">{typeLabels[key] ?? key}</p>
              {dim ? (
                <p className="mt-3 text-sm text-neutral-800 dark:text-neutral-200">
                  {pi.dimensions} {dim} m
                </p>
              ) : null}
              {description ? (
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
              ) : null}
              {key === 'heated_pool' && row.heating_fee_per_day.trim() ? (
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {pi.heatingFee}: {row.heating_fee_per_day.trim()}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

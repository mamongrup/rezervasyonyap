import { Divider } from '@/shared/divider'
import { CheckmarkCircle01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { getMessages } from '@/utils/getT'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'

export type PriceInclusionLine = { label: string }

export default function ListingPriceInclusionsSection({
  locale,
  included,
  excluded,
}: {
  locale: string
  included: PriceInclusionLine[]
  excluded: PriceInclusionLine[]
}) {
  if (included.length === 0 && excluded.length === 0) return null

  const m = getMessages(locale)
  const pi = m.listing.priceInclusions

  return (
    <div id="stay-section-price-inclusions" className="listingSection__wrap scroll-mt-28">
      <div>
        <SectionHeading>{pi.title}</SectionHeading>
        <SectionSubheading>{pi.subtitle}</SectionSubheading>
      </div>
      <Divider className="w-14!" />
      <div className="grid gap-6 md:grid-cols-2">
        {included.length > 0 ? (
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">{pi.included}</h3>
            <ul className="mt-3 space-y-2.5">
              {included.map((line, i) => (
                <li
                  key={`inc-${i}-${line.label}`}
                  className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300"
                >
                  <HugeiconsIcon
                    icon={CheckmarkCircle01Icon}
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                    strokeWidth={1.75}
                  />
                  <span>{line.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {excluded.length > 0 ? (
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">{pi.excluded}</h3>
            <ul className="mt-3 space-y-2.5">
              {excluded.map((line, i) => (
                <li
                  key={`exc-${i}-${line.label}`}
                  className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                  <span>{line.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}

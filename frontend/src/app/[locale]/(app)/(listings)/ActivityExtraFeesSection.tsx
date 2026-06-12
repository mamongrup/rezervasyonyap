'use client'

import { LISTING_SECTION_STACKED } from '@/app/[locale]/(app)/(listings)/listing-section-classes'
import { usePreferredCurrencyContext } from '@/contexts/preferred-currency-context'
import type { ActivityExtraFeeRow } from '@/lib/activity-vitrin-meta'
import { convertAmountWithRates } from '@/lib/currency-convert'
import { formatMoneyIntl } from '@/lib/parse-listing-price'
import { pickLocalized } from '@/lib/localized-text'
import type { PublicCurrencyRateRow } from '@/lib/travel-api'
import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import { SectionHeading } from './components/SectionHeading'

function formatFeeAmount(
  amount: string,
  currency: string,
  preferredCode: string,
  rates: PublicCurrencyRateRow[],
): string {
  const n = parseFloat(amount.replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return '—'
  const from = currency.trim().toUpperCase() || 'TRY'
  const target = (preferredCode || from).toUpperCase()
  if (from === target || rates.length === 0) return formatMoneyIntl(n, from)
  const converted = convertAmountWithRates(n, from, target, rates)
  return converted != null ? formatMoneyIntl(converted, target) : formatMoneyIntl(n, from)
}

export default function ActivityExtraFeesSection({
  fees,
  title,
  locale,
}: {
  fees: ActivityExtraFeeRow[]
  title: string
  locale: string
}) {
  const ctx = usePreferredCurrencyContext()
  const ad = getMessages(locale).listing.activityDetail
  const units = ad.extraFees?.units ?? {}
  const visible = fees.filter((f) => pickLocalized(f.label, locale, '').trim() && f.amount.trim())
  if (visible.length === 0) return null

  const preferredCode = ctx?.preferredCode ?? 'TRY'
  const rates = ctx?.rates ?? []

  return (
    <section id="activity-section-extra-fees" className={LISTING_SECTION_STACKED}>
      <SectionHeading>{title}</SectionHeading>
      <Divider className="w-14!" />
      <ul className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
        {visible.map((fee, index) => {
          const label = pickLocalized(fee.label, locale, '').trim()
          const unitLabel = units[fee.unit] ?? fee.unit
          return (
            <li
              key={`${index}:${label}`}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">{label}</p>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{unitLabel}</p>
              </div>
              <p className="shrink-0 font-semibold tabular-nums text-neutral-900 dark:text-white">
                {formatFeeAmount(fee.amount, fee.currency_code, preferredCode, rates)}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

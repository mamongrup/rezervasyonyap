import {
  campaignDisplayTitle,
  formatCampaignEndDate,
  installmentCountFromRules,
  type ListingDetailCampaignItem,
} from '@/lib/listing-detail-campaigns'
import { Divider } from '@/shared/divider'
import { CreditCardIcon, Tag01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { SectionHeading } from './components/SectionHeading'

function CampaignCard({
  item,
  locale,
  labels,
}: {
  item: ListingDetailCampaignItem
  locale: string
  labels: {
    installmentSubtitle: (count: number) => string
    discountBadge: (percent: string) => string
    validUntil: (date: string) => string
  }
}) {
  const title = campaignDisplayTitle(item, locale)
  const isInstallment = item.kind === 'card_installment'
  const installmentCount = installmentCountFromRules(item.rules_json)
  const discount = item.discount_percent?.trim()
  const endLabel = formatCampaignEndDate(item.ends_at, locale)

  return (
    <li
      className={clsx(
        'flex min-w-0 flex-1 items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-sm sm:items-center sm:gap-4 sm:px-5 sm:py-4',
        isInstallment
          ? 'border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 to-white dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-neutral-900'
          : 'border-violet-200/90 bg-gradient-to-br from-violet-50/80 to-white dark:border-violet-900/50 dark:from-violet-950/25 dark:to-neutral-900',
      )}
    >
      <span
        className={clsx(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
          isInstallment
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
            : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
        )}
        aria-hidden
      >
        <HugeiconsIcon
          icon={isInstallment ? CreditCardIcon : Tag01Icon}
          size={22}
          strokeWidth={1.75}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold leading-snug text-neutral-900 dark:text-white sm:text-base">
            {title}
          </p>
          {!isInstallment && discount ? (
            <span className="rounded-full bg-violet-600 px-2.5 py-0.5 text-xs font-bold text-white">
              {labels.discountBadge(discount)}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-sm">
          {isInstallment
            ? labels.installmentSubtitle(installmentCount)
            : endLabel
              ? labels.validUntil(endLabel)
              : null}
        </p>
      </div>
    </li>
  )
}

export default function ListingDetailCampaignsSection({
  locale,
  campaigns,
  title,
  labels,
}: {
  locale: string
  campaigns: ListingDetailCampaignItem[]
  title: string
  labels: {
    installmentSubtitle: (count: number) => string
    discountBadge: (percent: string) => string
    validUntil: (date: string) => string
  }
}) {
  if (campaigns.length === 0) return null

  return (
    <section aria-labelledby="listing-detail-campaigns-heading" className="listingSection__wrap">
      <div>
        <SectionHeading id="listing-detail-campaigns-heading">{title}</SectionHeading>
      </div>
      <Divider className="w-14!" />
      <ul className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {campaigns.map((item) => (
          <CampaignCard key={item.id} item={item} locale={locale} labels={labels} />
        ))}
      </ul>
    </section>
  )
}

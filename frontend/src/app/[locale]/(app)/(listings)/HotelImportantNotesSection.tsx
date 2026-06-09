import { Divider } from '@/shared/divider'
import type { AccommodationRuleLine } from '@/lib/listing-accommodation-rules'
import { getMessages } from '@/utils/getT'
import {
  AlertCircleIcon,
  CheckmarkCircle01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'
import clsx from 'clsx'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'

/** TatilBudur / ETStur «Önemli Notlar» — konaklama kuralları + iptal/ödeme/ruhsat bir arada */
export default function HotelImportantNotesSection({
  locale,
  ruleLines,
  ministryLicenseLine,
  prepaymentNoteText,
  listingContractHref,
  cancellationPolicyPlain,
  className,
}: {
  locale: string
  ruleLines: AccommodationRuleLine[]
  ministryLicenseLine?: string | null
  prepaymentNoteText?: string | null
  listingContractHref?: string | null
  cancellationPolicyPlain?: string | null
  className?: string
}) {
  const messages = getMessages(locale)
  const hd = messages.listing.hotelDetail
  const policies = messages.listing.policies

  const hasPolicyBlock = Boolean(
    ministryLicenseLine?.trim() ||
      prepaymentNoteText?.trim() ||
      listingContractHref ||
      cancellationPolicyPlain?.trim(),
  )

  if (ruleLines.length === 0 && !hasPolicyBlock) return null

  return (
    <div id="stay-section-important-notes" className={clsx('listingSection__wrap scroll-mt-28', className)}>
      <div>
        <SectionHeading>{hd.importantNotesTitle ?? hd.nav.importantNotes}</SectionHeading>
        <SectionSubheading>
          {hd.importantNotesSubtitle ??
            'Giriş–çıkış saatleri, tesis kuralları ve rezervasyon koşulları.'}
        </SectionSubheading>
      </div>
      <Divider className="w-14!" />

      {ruleLines.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {ruleLines.map((rule, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 rounded-2xl border border-neutral-100 bg-neutral-50/60 px-4 py-3 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800/40 dark:text-neutral-300"
            >
              {rule.type === 'ok' ? (
                <HugeiconsIcon
                  icon={CheckmarkCircle01Icon}
                  className="mt-0.5 h-4 w-4 shrink-0 text-green-500"
                  strokeWidth={1.75}
                />
              ) : (
                <HugeiconsIcon
                  icon={AlertCircleIcon}
                  className="mt-0.5 h-4 w-4 shrink-0 text-orange-400"
                  strokeWidth={1.75}
                />
              )}
              <span>{rule.text}</span>
            </div>
          ))}
        </div>
      ) : null}

      {hasPolicyBlock ? (
        <div
          className={clsx(
            'flex flex-col gap-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300',
            ruleLines.length > 0 && 'mt-5 border-t border-neutral-100 pt-5 dark:border-neutral-800',
          )}
        >
          {ministryLicenseLine?.trim() ? <p>{ministryLicenseLine.trim()}</p> : null}
          {prepaymentNoteText?.trim() ? <p>{prepaymentNoteText.trim()}</p> : null}
          {listingContractHref ? (
            <p>
              <Link href={listingContractHref} className="text-link-inline">
                {policies.contractLink}
              </Link>
            </p>
          ) : null}
          {cancellationPolicyPlain ? (
            <p>
              <span className="font-medium text-neutral-900 dark:text-neutral-200">
                {policies.cancellationHeading}:
              </span>{' '}
              {cancellationPolicyPlain}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import clsx from 'clsx'
import {
  BadgeCheck,
  Clock,
  Coffee,
  CreditCard,
  Star,
} from 'lucide-react'
import Link from 'next/link'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'

export type HotelPropertyContract = {
  title: string
  bodyHtml: string
  fullPageHref?: string | null
}

/** Otel detay — «Kurallar»: giriş/çıkış, sınıf, oda tipi vb. + otel sözleşmesi. */
export type HotelPropertyInfoItem = {
  checkInLine?: string | null
  checkOutLine?: string | null
  starRating?: number | null
  hasBreakfast?: boolean | null
  prepaymentLine?: string | null
  cancellationLine?: string | null
  ministryLicenseLine?: string | null
  additionalRuleLines?: string[] | null
}

export default function HotelPropertyInfoGrid({
  locale,
  source,
  contract,
  className,
}: {
  locale: string
  source: HotelPropertyInfoItem
  contract?: HotelPropertyContract | null
  className?: string
}) {
  const messages = getMessages(locale)
  const pi = messages.listing.propertyInfo ?? {}

  const items: Array<{
    key: string
    icon: typeof Clock
    label: string
    value: string
  }> = []

  if (source.checkInLine?.trim()) {
    items.push({
      key: 'checkIn',
      icon: Clock,
      label: pi.checkInLabel ?? 'Giriş',
      value: source.checkInLine.trim(),
    })
  }
  if (source.checkOutLine?.trim()) {
    items.push({
      key: 'checkOut',
      icon: Clock,
      label: pi.checkOutLabel ?? 'Çıkış',
      value: source.checkOutLine.trim(),
    })
  }
  if (typeof source.starRating === 'number' && source.starRating > 0) {
    items.push({
      key: 'stars',
      icon: Star,
      label: pi.starsLabel ?? 'Sınıf',
      value: interpolate(pi.starsValue ?? '{count} yıldız', {
        count: String(source.starRating),
      }),
    })
  }
  if (source.hasBreakfast === true) {
    items.push({
      key: 'breakfast',
      icon: Coffee,
      label: pi.breakfastLabel ?? 'Kahvaltı',
      value: pi.breakfastYes ?? 'Kahvaltı seçenekleri mevcut',
    })
  }
  if (source.prepaymentLine?.trim()) {
    items.push({
      key: 'prepayment',
      icon: CreditCard,
      label: pi.prepaymentLabel ?? 'Ödeme',
      value: source.prepaymentLine.trim(),
    })
  }

  const contractHtml = contract?.bodyHtml?.trim()
  const normalizedCardValues = new Set(
    items.map((item) => item.value.trim().toLocaleLowerCase(locale)),
  )
  const additionalRules = [
    ...(source.additionalRuleLines ?? []),
    source.cancellationLine ?? '',
    source.ministryLicenseLine ?? '',
  ]
    .map((line) => String(line ?? '').trim())
    .filter(Boolean)
    .filter((line) => !normalizedCardValues.has(line.toLocaleLowerCase(locale)))
    .filter((line, index, all) =>
      all.findIndex((candidate) => candidate.toLocaleLowerCase(locale) === line.toLocaleLowerCase(locale)) === index,
    )

  if (items.length === 0 && additionalRules.length === 0 && !contractHtml) return null

  return (
    <div id="stay-section-rules" className={clsx('listingSection__wrap scroll-mt-28', className)}>
      <div>
        <SectionHeading>{pi.title ?? 'Kurallar'}</SectionHeading>
        <SectionSubheading>
          {pi.subtitle ?? 'Konaklama koşulları, tesis bilgileri ve sözleşme.'}
        </SectionSubheading>
      </div>
      <Divider className="w-14!" />

      {items.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => {
            const Icon = it.icon
            return (
              <li
                key={it.key}
                className="flex items-start gap-3 rounded-2xl border border-neutral-100 bg-neutral-50/60 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800/40"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
                  <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    {it.label}
                    {it.key === 'breakfast' && source.hasBreakfast === true ? (
                      <BadgeCheck
                        className="h-3 w-3 text-green-500"
                        strokeWidth={2}
                        aria-hidden
                      />
                    ) : null}
                  </span>
                  <span className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                    {it.value}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

      {additionalRules.length > 0 ? (
        <ul className={clsx('grid gap-3 sm:grid-cols-2', items.length > 0 && 'mt-5')}>
          {additionalRules.map((rule) => (
            <li
              key={rule}
              className="flex items-start gap-2.5 rounded-2xl border border-neutral-100 bg-neutral-50/60 px-4 py-3 text-sm leading-relaxed text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800/40 dark:text-neutral-300"
            >
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-500" strokeWidth={1.75} aria-hidden />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {contractHtml ? (
        <div
          className={clsx(
            (items.length > 0 || additionalRules.length > 0) &&
              'mt-6 border-t border-neutral-100 pt-6 dark:border-neutral-800',
          )}
        >
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
            {contract?.title?.trim() || pi.contractSectionTitle || 'Otel sözleşmesi'}
          </h3>
          <div
            className="prose prose-sm mt-3 max-w-none leading-relaxed text-neutral-800 dark:prose-invert dark:text-neutral-200"
            dangerouslySetInnerHTML={{ __html: contractHtml }}
          />
          {contract?.fullPageHref ? (
            <p className="mt-4">
              <Link href={contract.fullPageHref} className="text-sm text-link-inline">
                {pi.contractFullLink ?? messages.listing.policies?.contractLink ?? 'İlan sözleşmesi'}
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

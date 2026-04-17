'use client'

import { usePreferredCurrencyContext } from '@/contexts/preferred-currency-context'
import { convertAmountWithRates } from '@/lib/currency-convert'
import type { SeasonalPricingRowModel } from '@/lib/listing-price-rules-public'
import { formatMoneyIntl } from '@/lib/parse-listing-price'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import clsx from 'clsx'
import { useCallback, useMemo, useState } from 'react'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'

const VISIBLE_COUNT = 7

export type ListingExtraChargesModel = {
  listingCurrency: string
  shortStay?: { minNights: number; feeAmount: number } | null
  damageDeposit?: { amount: number } | null
  customFees?: Array<{ label: string; amount: string; unit: string }>
  /** Ön ödeme yüzdesi açıklaması — ek ücretler listesinin en altında */
  prepaymentLine?: string | null
}

function extraChargesHasContent(e?: ListingExtraChargesModel): boolean {
  if (!e) return false
  if (e.shortStay != null && e.shortStay.minNights > 0 && e.shortStay.feeAmount > 0) return true
  if (e.damageDeposit != null && e.damageDeposit.amount > 0) return true
  if (e.customFees?.some((x) => x.label.trim() && x.amount.trim())) return true
  if (e.prepaymentLine?.trim()) return true
  return false
}

function parseFeeAmountString(raw: string): number | null {
  const n = parseFloat(String(raw).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

function PriceCell({
  amount,
  compareAt,
  formatConverted,
  currency,
}: {
  amount: number
  compareAt: number | null | undefined
  formatConverted: (amount: number, fromCurrency: string) => string
  currency: string
}) {
  const showStrike = compareAt != null && compareAt > amount && amount >= 0
  return (
    <span className="inline-flex max-w-full flex-wrap items-baseline justify-end gap-x-1.5 tabular-nums font-medium">
      {showStrike ? (
        <span className="line-through text-neutral-400 dark:text-neutral-500">
          {formatConverted(compareAt, currency)}
        </span>
      ) : null}
      <span>{formatConverted(amount, currency)}</span>
    </span>
  )
}

export default function ListingSeasonalPricingSection({
  locale,
  rows,
  demo = false,
  className,
  extraCharges,
  dualMealPricing = false,
}: {
  locale: string
  rows: SeasonalPricingRowModel[]
  demo?: boolean
  className?: string
  /** Ücretlendirme bloğu içinde — kısa konaklama, depozito, panel ek ücretleri */
  extraCharges?: ListingExtraChargesModel
  /** İlanda yemekli + yemeksiz seçenek (meal_plan_summary = both) — tabloda dört fiyat sütunu */
  dualMealPricing?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const ctx = usePreferredCurrencyContext()
  const messages = getMessages(locale)
  const sp = messages.listing.seasonalPricing
  const spx = sp as typeof sp & {
    subtitleDual?: string
    nightlyRoomOnly?: string
    weeklyRoomOnly?: string
    nightlyWithMeals?: string
    weeklyWithMeals?: string
  }

  const formatConverted = useCallback(
    (amount: number, fromCurrency: string): string => {
      if (!Number.isFinite(amount) || amount <= 0) return '—'
      const from = fromCurrency.trim().toUpperCase()
      const target = (ctx?.preferredCode ?? from).toUpperCase()
      const rates = ctx?.rates ?? []
      if (from === target || rates.length === 0) return formatMoneyIntl(amount, from)
      const c = convertAmountWithRates(amount, from, target, rates)
      return c != null ? formatMoneyIntl(c, target) : formatMoneyIntl(amount, from)
    },
    [ctx?.preferredCode, ctx?.rates],
  )

  const visibleRows = useMemo(() => {
    if (expanded || rows.length <= VISIBLE_COUNT) return rows
    return rows.slice(0, VISIBLE_COUNT)
  }, [rows, expanded])

  const hiddenCount = rows.length > VISIBLE_COUNT ? rows.length - VISIBLE_COUNT : 0

  const showExtra = extraChargesHasContent(extraCharges)
  const listingCur = (extraCharges?.listingCurrency ?? 'TRY').trim().toUpperCase()

  const unitLabel = useCallback(
    (unit: string) => {
      switch (unit) {
        case 'per_night':
          return sp.unitPerNight
        case 'per_person':
          return sp.unitPerPerson
        case 'per_person_per_night':
          return sp.unitPerPersonPerNight
        case 'per_stay':
        default:
          return sp.unitPerStay
      }
    },
    [sp.unitPerNight, sp.unitPerPerson, sp.unitPerPersonPerNight, sp.unitPerStay],
  )

  if (rows.length === 0 && !showExtra) return null

  return (
    <div className={clsx('listingSection__wrap', className)}>
      <div>
        <SectionHeading>{sp.title}</SectionHeading>
        <SectionSubheading>
          {dualMealPricing && spx.subtitleDual ? spx.subtitleDual : sp.subtitle}
        </SectionSubheading>
        {demo ? (
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{sp.demoBadge}</p>
        ) : null}
      </div>
      <Divider className="w-14!" />

      {rows.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700">
          <div className="overflow-x-auto">
            <table
              className={clsx(
                'w-full text-sm',
                dualMealPricing ? 'min-w-[min(100%,720px)]' : 'min-w-[min(100%,560px)]',
              )}
            >
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/40">
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400"
                    scope="col"
                  >
                    {sp.periodColumn}
                  </th>
                  {dualMealPricing ? (
                    <>
                      <th
                        className="px-4 py-3 text-end text-xs font-medium text-neutral-600 dark:text-neutral-400"
                        scope="col"
                      >
                        {spx.nightlyRoomOnly ?? sp.nightly}
                      </th>
                      <th
                        className="px-4 py-3 text-end text-xs font-medium text-neutral-600 dark:text-neutral-400"
                        scope="col"
                      >
                        {spx.weeklyRoomOnly ?? sp.weekly}
                      </th>
                      <th
                        className="px-4 py-3 text-end text-xs font-medium text-neutral-600 dark:text-neutral-400"
                        scope="col"
                      >
                        {spx.nightlyWithMeals ?? sp.nightly}
                      </th>
                      <th
                        className="px-4 py-3 text-end text-xs font-medium text-neutral-600 dark:text-neutral-400"
                        scope="col"
                      >
                        {spx.weeklyWithMeals ?? sp.weekly}
                      </th>
                    </>
                  ) : (
                    <>
                      <th
                        className="px-4 py-3 text-end text-xs font-medium text-neutral-600 dark:text-neutral-400"
                        scope="col"
                      >
                        {sp.nightly}
                      </th>
                      <th
                        className="px-4 py-3 text-end text-xs font-medium text-neutral-600 dark:text-neutral-400"
                        scope="col"
                      >
                        {sp.weekly}
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {visibleRows.map((row, i) => (
                  <tr
                    key={`${row.periodLabel}-${i}`}
                    className="text-neutral-800 transition-colors hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-800/30"
                  >
                    <td className="max-w-[min(100%,280px)] px-4 py-3 leading-snug">{row.periodLabel}</td>
                    {dualMealPricing ? (
                      <>
                        <td className="whitespace-nowrap px-4 py-3 text-end">
                          <PriceCell
                            amount={row.roomOnlyNightly ?? row.nightlyAmount}
                            compareAt={null}
                            formatConverted={formatConverted}
                            currency={row.listingCurrency}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-end">
                          <PriceCell
                            amount={row.roomOnlyWeekly ?? row.weeklyAmount}
                            compareAt={null}
                            formatConverted={formatConverted}
                            currency={row.listingCurrency}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-end">
                          <PriceCell
                            amount={row.mealsIncludedNightly ?? row.nightlyAmount}
                            compareAt={null}
                            formatConverted={formatConverted}
                            currency={row.listingCurrency}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-end">
                          <PriceCell
                            amount={row.mealsIncludedWeekly ?? row.weeklyAmount}
                            compareAt={null}
                            formatConverted={formatConverted}
                            currency={row.listingCurrency}
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="whitespace-nowrap px-4 py-3 text-end">
                          <PriceCell
                            amount={row.nightlyAmount}
                            compareAt={row.compareAtNightly}
                            formatConverted={formatConverted}
                            currency={row.listingCurrency}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-end">
                          <PriceCell
                            amount={row.weeklyAmount}
                            compareAt={row.compareAtWeekly}
                            formatConverted={formatConverted}
                            currency={row.listingCurrency}
                          />
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {showExtra && extraCharges ? (
        <div className={clsx(rows.length > 0 && 'mt-8')}>
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {sp.extraChargesTitle}
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
            {extraCharges.shortStay != null &&
            extraCharges.shortStay.minNights > 0 &&
            extraCharges.shortStay.feeAmount > 0 ? (
              <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-neutral-100 pb-2 dark:border-neutral-800">
                <span>{sp.shortStayExtraLine.replace('{n}', String(extraCharges.shortStay.minNights))}</span>
                <span className="shrink-0 tabular-nums font-medium text-neutral-900 dark:text-neutral-100">
                  {formatConverted(extraCharges.shortStay.feeAmount, listingCur)}
                </span>
              </li>
            ) : null}
            {extraCharges.damageDeposit != null && extraCharges.damageDeposit.amount > 0 ? (
              <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-neutral-100 pb-2 dark:border-neutral-800">
                <span>{sp.damageDeposit}</span>
                <span className="shrink-0 tabular-nums font-medium text-neutral-900 dark:text-neutral-100">
                  {formatConverted(extraCharges.damageDeposit.amount, listingCur)}
                </span>
              </li>
            ) : null}
            {extraCharges.customFees?.map((row, idx) => {
              const n = parseFeeAmountString(row.amount)
              const amountDisplay =
                n != null ? formatConverted(n, listingCur) : `${row.amount} ${listingCur}`
              return (
                <li
                  key={`${row.label}-${idx}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-neutral-100 pb-2 dark:border-neutral-800"
                >
                  <span>
                    {row.label}
                    <span className="text-neutral-500 dark:text-neutral-500">
                      {' '}
                      ({unitLabel(row.unit)})
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums font-medium text-neutral-900 dark:text-neutral-100">
                    {amountDisplay}
                  </span>
                </li>
              )
            })}
            {extraCharges.prepaymentLine?.trim() ? (
              <li className="mt-3 border-t border-neutral-200 pt-3 text-sm leading-relaxed text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">
                {extraCharges.prepaymentLine.trim()}
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {hiddenCount > 0 ? (
        <div className="mt-8 flex flex-col gap-6 sm:gap-8">
          <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />
          <div className="flex justify-center sm:justify-start">
            <ButtonSecondary
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="rounded-full px-6"
            >
              {expanded ? sp.showLess : sp.showAll}
            </ButtonSecondary>
          </div>
        </div>
      ) : null}
    </div>
  )
}

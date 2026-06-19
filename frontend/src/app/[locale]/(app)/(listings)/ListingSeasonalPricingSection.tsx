'use client'

import { usePreferredCurrencyContext } from '@/contexts/preferred-currency-context'
import { convertAmountWithRates } from '@/lib/currency-convert'
import {
  holidayMealPlanCopy,
  villaMealFormulaWithoutPrice,
} from '@/lib/holiday-home-meal-plan-formulas'
import type { SeasonalPricingRowModel } from '@/lib/listing-price-rules-public'
import { formatMoneyIntl } from '@/lib/parse-listing-price'
import type { MealPlanItem } from '@/lib/travel-api'
import type { MealPlanSummary } from '@/types/listing-types'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import clsx from 'clsx'
import { useCallback, useMemo, useState } from 'react'
import {
  damageDepositHasContent,
  extraFeesListHasContent,
  type ListingExtraChargesModel,
} from '@/lib/listing-extra-charges-model'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'

const VISIBLE_COUNT = 7

function parseFeeAmountString(raw: string): number | null {
  const n = parseFloat(String(raw).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

function PriceCell({
  amount,
  compareAt,
  formatConverted,
  currency,
  mealBadge,
}: {
  amount: number
  compareAt: number | null | undefined
  formatConverted: (amount: number, fromCurrency: string) => string
  currency: string
  mealBadge?: { label: string; tone: 'neutral' | 'primary' } | null
}) {
  const showStrike = compareAt != null && compareAt > amount && amount >= 0
  return (
    <span className="inline-flex max-w-full flex-col items-end gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-end sm:gap-x-2">
      <span className="inline-flex flex-wrap items-baseline justify-end gap-x-1.5 tabular-nums font-medium">
        {showStrike ? (
          <span className="line-through text-neutral-400 dark:text-neutral-500">
            {formatConverted(compareAt, currency)}
          </span>
        ) : null}
        <span>{formatConverted(amount, currency)}</span>
      </span>
      {mealBadge?.label?.trim() ? (
        <span
          className={clsx(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide',
            mealBadge.tone === 'neutral'
              ? 'bg-neutral-200/90 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100'
              : 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200',
          )}
        >
          {mealBadge.label.trim()}
        </span>
      ) : null}
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
  holidayMeals,
}: {
  locale: string
  rows: SeasonalPricingRowModel[]
  demo?: boolean
  className?: string
  /** Ücretlendirme bloğu içinde — kısa konaklama, depozito, panel ek ücretleri */
  extraCharges?: ListingExtraChargesModel
  /** İlanda yemekli + yemeksiz seçenek (meal_plan_summary = both) — tabloda dört fiyat sütunu */
  dualMealPricing?: boolean
  /** Tatil evi — pansiyon ile ücretlendirme birleşimi */
  holidayMeals?: {
    plans: MealPlanItem[]
    maxGuests?: number | null
    summary?: MealPlanSummary | null
  }
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

  const showExtraFeesList = extraFeesListHasContent(extraCharges)
  const showDamageDeposit = damageDepositHasContent(extraCharges)
  const listingCur = (extraCharges?.listingCurrency ?? 'TRY').trim().toUpperCase()
  const showExtra = showExtraFeesList || showDamageDeposit

  const activeHolidayMeals = useMemo(() => {
    const plans = holidayMeals?.plans
    if (!plans?.length) return []
    return plans.filter((p) => p.is_active).sort((a, b) => a.sort_order - b.sort_order)
  }, [holidayMeals])

  const showHolidayMealBlock = activeHolidayMeals.length > 0
  const hasPricingContent = rows.length > 0 || showExtra || showHolidayMealBlock

  const holidayPricingLead = useMemo(() => {
    if (!showHolidayMealBlock || !holidayMeals) return null
    const s = holidayMeals.summary
    if (s === 'both') return holidayMealPlanCopy('pricingMergedLeadBoth', locale)
    if (s === 'meal_only') return holidayMealPlanCopy('pricingMergedLeadMeals', locale)
    return holidayMealPlanCopy('pricingMergedLeadRoomOnly', locale)
  }, [showHolidayMealBlock, holidayMeals, locale])

  const singleColumnMealBadge = useMemo((): { label: string; tone: 'neutral' | 'primary' } | null => {
    if (!showHolidayMealBlock || dualMealPricing || !holidayMeals) return null
    const s = holidayMeals.summary
    if (s === 'meal_only')
      return { label: holidayMealPlanCopy('badgeYemekli', locale), tone: 'primary' }
    if (s === 'room_only')
      return { label: holidayMealPlanCopy('badgeYemeksiz', locale), tone: 'neutral' }
    return null
  }, [showHolidayMealBlock, dualMealPricing, holidayMeals, locale])

  const holidayMixedPlansFootnote =
    showHolidayMealBlock &&
    dualMealPricing &&
    activeHolidayMeals.some((p) => p.plan_code === 'room_only') &&
    activeHolidayMeals.some((p) => p.plan_code !== 'room_only')

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

  if (!hasPricingContent) return null

  return (
    <div className={clsx('listingSection__wrap', className)}>
      <div>
        <SectionHeading>{sp.title}</SectionHeading>
        <SectionSubheading>
          {dualMealPricing && spx.subtitleDual ? spx.subtitleDual : sp.subtitle}
        </SectionSubheading>
        {showHolidayMealBlock && holidayPricingLead ? (
          <div className="mt-3 space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/90 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900/50">
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              {holidayPricingLead}
            </p>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {holidayMealPlanCopy('pricingMergedOptionsTitle', locale)}
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-neutral-800 dark:text-neutral-200">
                {activeHolidayMeals.map((p) => (
                  <li key={p.id}>
                    {villaMealFormulaWithoutPrice(p, locale, holidayMeals?.maxGuests)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
        {demo ? (
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{sp.demoBadge}</p>
        ) : null}
      </div>
      <Divider className="w-14!" />

      {rows.length > 0 ? (
        <>
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
                              compareAt={row.roomOnlyCompareAtNightly}
                              formatConverted={formatConverted}
                              currency={row.listingCurrency}
                              mealBadge={{
                                label: holidayMealPlanCopy('badgeYemeksiz', locale),
                                tone: 'neutral',
                              }}
                            />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-end">
                            <PriceCell
                              amount={row.roomOnlyWeekly ?? row.weeklyAmount}
                              compareAt={row.roomOnlyCompareAtWeekly}
                              formatConverted={formatConverted}
                              currency={row.listingCurrency}
                            />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-end">
                            <PriceCell
                              amount={row.mealsIncludedNightly ?? row.nightlyAmount}
                              compareAt={row.mealsIncludedCompareAtNightly}
                              formatConverted={formatConverted}
                              currency={row.listingCurrency}
                              mealBadge={{
                                label: holidayMealPlanCopy('badgeYemekli', locale),
                                tone: 'primary',
                              }}
                            />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-end">
                            <PriceCell
                              amount={row.mealsIncludedWeekly ?? row.weeklyAmount}
                              compareAt={row.mealsIncludedCompareAtWeekly}
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
                              mealBadge={singleColumnMealBadge}
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
          {holidayMixedPlansFootnote ? (
            <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
              * {holidayMealPlanCopy('perNightNote', locale)}
            </p>
          ) : null}
        </>
      ) : null}

      {extraCharges && (showExtraFeesList || showDamageDeposit) ? (
        <div className={clsx('listing-extra-charges', rows.length > 0 && 'mt-8')}>
          {showExtraFeesList ? (
            <>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {sp.extraChargesTitle}
              </h3>
              <ul className="mt-3 divide-y divide-neutral-100 dark:divide-neutral-800">
                {extraCharges.shortStay != null &&
                extraCharges.shortStay.minNights > 0 &&
                extraCharges.shortStay.feeAmount > 0 ? (
                  <li className="flex items-baseline justify-between gap-x-4 py-3 text-sm">
                    <span className="text-neutral-600 dark:text-neutral-400">
                      {sp.shortStayExtraLine.replace('{n}', String(extraCharges.shortStay.minNights))}
                    </span>
                    <span className="shrink-0 tabular-nums font-semibold text-neutral-900 dark:text-neutral-100">
                      {formatConverted(extraCharges.shortStay.feeAmount, listingCur)}
                    </span>
                  </li>
                ) : null}
                {extraCharges.cleaningFee != null && extraCharges.cleaningFee.amount > 0 ? (
                  <li className="flex items-baseline justify-between gap-x-4 py-3 text-sm">
                    <span className="text-neutral-600 dark:text-neutral-400">{sp.cleaningFeeLine}</span>
                    <span className="shrink-0 tabular-nums font-semibold text-neutral-900 dark:text-neutral-100">
                      {formatConverted(extraCharges.cleaningFee.amount, listingCur)}
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
                      className="flex items-baseline justify-between gap-x-4 py-3 text-sm"
                    >
                      <span className="text-neutral-600 dark:text-neutral-400">
                        {row.label}
                        <span className="text-neutral-400 dark:text-neutral-500">
                          {' '}
                          ({unitLabel(row.unit)})
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums font-semibold text-neutral-900 dark:text-neutral-100">
                        {amountDisplay}
                      </span>
                    </li>
                  )
                })}
              </ul>
              {extraCharges.prepaymentLine?.trim() ? (
                <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {extraCharges.prepaymentLine.trim()}
                </p>
              ) : null}
            </>
          ) : null}
          {showDamageDeposit && extraCharges.damageDeposit ? (
            <div
              className={clsx(
                showExtraFeesList && 'mt-5 border-t border-neutral-100 pt-5 dark:border-neutral-800',
              )}
            >
              <div className="flex items-baseline justify-between gap-x-4 text-sm">
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {sp.damageDeposit}
                </span>
                <span className="shrink-0 tabular-nums font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatConverted(extraCharges.damageDeposit.amount, listingCur)}
                </span>
              </div>
              {sp.damageDepositNote?.trim() ? (
                <p className="mt-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {sp.damageDepositNote.trim()}
                </p>
              ) : null}
            </div>
          ) : null}
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

'use client'

import {
  useConvertedListingPrice,
  usePreferredCurrencyContext,
} from '@/contexts/preferred-currency-context'
import { convertAmountWithRates } from '@/lib/currency-convert'
import { formatMoneyIntl } from '@/lib/parse-listing-price'
import type { MealPlanItem } from '@/lib/travel-api'
import { parseDiscountPercent } from '@/utils/formatSaleOffLabel'
import { useCallback, useMemo } from 'react'

export function diffStayNights(start: Date | null, end: Date | null): number {
  if (!start || !end) return 0
  const s = new Date(start)
  s.setHours(0, 0, 0, 0)
  const e = new Date(end)
  e.setHours(0, 0, 0, 0)
  const d = Math.round((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000))
  if (d <= 0) return 1
  return d
}

export type PoolHeatingOption = { dailyAmount: number; feeSummary: string; currencyCode: string } | null

export function useStayListingQuote({
  mealPlans,
  price,
  priceAmount,
  priceCurrency,
  saleOff,
  discountPercent,
  rangeStart,
  rangeEnd,
  poolHeating,
  poolHeatingSelected,
  minShortStayNights,
  shortStayFeeAmount,
}: {
  mealPlans: MealPlanItem[]
  price: string
  priceAmount: number | undefined
  priceCurrency: string | undefined
  saleOff: string | null | undefined
  discountPercent: number | null | undefined
  rangeStart: Date | null
  rangeEnd: Date | null
  poolHeating: PoolHeatingOption
  poolHeatingSelected: boolean
  /** Bu geceden kısa konaklamada bir kerelik ek ücret */
  minShortStayNights?: number
  shortStayFeeAmount?: number
}) {
  const ctx = usePreferredCurrencyContext()
  const convertedListingLabel = useConvertedListingPrice(price, priceAmount, priceCurrency)

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

  const nights = useMemo(() => diffStayNights(rangeStart, rangeEnd), [rangeStart, rangeEnd])

  const activePlans = useMemo(
    () => mealPlans.filter((p) => p.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [mealPlans],
  )
  const cheapestPlan = useMemo(
    () =>
      activePlans.length > 0
        ? activePlans.reduce((min, p) => (p.price_per_night < min.price_per_night ? p : min))
        : null,
    [activePlans],
  )

  const currencyCode = (cheapestPlan?.currency_code ?? priceCurrency ?? 'TRY').trim().toUpperCase()
  const poolHeatingCurrency = poolHeating?.currencyCode.trim().toUpperCase() || currencyCode

  const basePriceNum = cheapestPlan
    ? cheapestPlan.price_per_night
    : priceAmount != null && Number.isFinite(priceAmount)
      ? priceAmount
      : parseInt((price ?? '').replace(/\D/g, '') || '0', 10) || 0

  const discountPct = parseDiscountPercent(saleOff, discountPercent ?? undefined)
  const showDiscountRow =
    !cheapestPlan && discountPct != null && discountPct > 0 && basePriceNum > 0

  const originalPriceNum =
    showDiscountRow && discountPct != null ? basePriceNum / (1 - discountPct / 100) : null

  const displayMainPrice = useMemo(() => {
    if (cheapestPlan) return formatConverted(cheapestPlan.price_per_night, cheapestPlan.currency_code)
    if (showDiscountRow && basePriceNum > 0) return formatConverted(basePriceNum, currencyCode)
    return convertedListingLabel
  }, [cheapestPlan, showDiscountRow, basePriceNum, currencyCode, formatConverted, convertedListingLabel])

  const priceNum = cheapestPlan ? cheapestPlan.price_per_night : basePriceNum

  const lodgingSubtotal = priceNum > 0 ? priceNum * nights : 0
  const heatingSubtotal =
    poolHeating && poolHeatingSelected ? poolHeating.dailyAmount * nights : 0
  const shortStayFeeApplied =
    minShortStayNights != null &&
    minShortStayNights > 0 &&
    shortStayFeeAmount != null &&
    shortStayFeeAmount > 0 &&
    nights > 0 &&
    nights < minShortStayNights
      ? shortStayFeeAmount
      : 0
  const subtotalBeforeFee = lodgingSubtotal + heatingSubtotal + shortStayFeeApplied
  const serviceFee = subtotalBeforeFee > 0 ? Math.round(subtotalBeforeFee * 0.1) : 0
  const grandTotal = subtotalBeforeFee + serviceFee

  const unitForBreakdownLine =
    cheapestPlan != null
      ? formatConverted(cheapestPlan.price_per_night, cheapestPlan.currency_code)
      : showDiscountRow && basePriceNum > 0
        ? formatConverted(basePriceNum, currencyCode)
        : convertedListingLabel

  return {
    nights,
    activePlans,
    cheapestPlan,
    currencyCode,
    poolHeatingCurrency,
    showDiscountRow,
    originalPriceNum,
    basePriceNum,
    discountPct,
    displayMainPrice,
    lodgingSubtotal,
    heatingSubtotal,
    subtotalBeforeFee,
    serviceFee,
    grandTotal,
    unitForBreakdownLine,
    formatConverted,
    shortStayFeeApplied,
  }
}

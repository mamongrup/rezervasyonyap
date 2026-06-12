'use client'

import {
  useConvertedListingPrice,
  usePreferredCurrencyContext,
} from '@/contexts/preferred-currency-context'
import { convertAmountWithRates } from '@/lib/currency-convert'
import { formatMoneyIntl } from '@/lib/parse-listing-price'
import { computeStayRentalLodgingQuote } from '@/lib/stay-rental-range-quote'
import {
  getPublicListingAvailabilityCalendar,
  type ListingAvailabilityDay,
  type ListingPriceRuleRow,
  type MealPlanItem,
} from '@/lib/travel-api'
import { parseDiscountPercent } from '@/utils/formatSaleOffLabel'
import { formatLocalYmd } from '@/utils/format-local-ymd'
import { useCallback, useEffect, useMemo, useState } from 'react'

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

/** Hasar depozitosu ile aynı tutar yemek planına yanlış yazılmışsa vitrin geceliği için ele */
export function nightlyDiffersFromDeposit(
  nightly: number | null | undefined,
  depositAmount: number | undefined,
): boolean {
  if (nightly == null || !Number.isFinite(nightly) || nightly <= 0) return false
  if (depositAmount == null || !Number.isFinite(depositAmount) || depositAmount <= 0) return true
  return Math.abs(nightly - depositAmount) >= 0.01
}

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
  cleaningFeeAmount,
  damageDepositAmount,
  ruleFallbackNightly,
  ruleNightlyRange,
  listingId,
  priceRules,
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
  /** Konaklama başına tek seferlik temizlik — gece seçiliyken uygulanır */
  cleaningFeeAmount?: number
  /** `listings.first_charge_amount` — yemek planı geceliği buna eşitse şüpheli kabul edilir */
  damageDepositAmount?: number
  /** Dönemsel kural JSON’undan minimum gecelik (panel «Varsayılan fiyat») */
  ruleFallbackNightly?: number
  /** Aktif yemek planı fiyatı kullanılmıyorken vitrin «gecelik» başlığında min–max */
  ruleNightlyRange?: { min: number; max: number }
  /** Tatil evi / yat — seçili tarihlerde dönemsel fiyat için */
  listingId?: string
  priceRules?: ListingPriceRuleRow[]
}) {
  const ctx = usePreferredCurrencyContext()
  const [rangeDays, setRangeDays] = useState<ListingAvailabilityDay[]>([])

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

  useEffect(() => {
    if (!listingId?.trim() || !rangeStart || !rangeEnd || nights <= 0) {
      setRangeDays([])
      return
    }
    let cancelled = false
    const from = formatLocalYmd(rangeStart)
    const lastNight = new Date(rangeEnd)
    lastNight.setHours(0, 0, 0, 0)
    lastNight.setDate(lastNight.getDate() - 1)
    const to = formatLocalYmd(lastNight)
    void getPublicListingAvailabilityCalendar(listingId.trim(), { from, to })
      .then((rows) => {
        if (!cancelled) setRangeDays(rows)
      })
      .catch(() => {
        if (!cancelled) setRangeDays([])
      })
    return () => {
      cancelled = true
    }
  }, [listingId, rangeStart, rangeEnd, nights])

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

  /** Yemek planı tutarı depozito ile aynıysa kurallar / arama fiyatına güven */
  const cheapestPlanForPricing = useMemo(() => {
    if (!cheapestPlan) return null
    if (nightlyDiffersFromDeposit(cheapestPlan.price_per_night, damageDepositAmount)) {
      return cheapestPlan
    }
    const candidates: number[] = []
    if (nightlyDiffersFromDeposit(ruleFallbackNightly, damageDepositAmount)) {
      candidates.push(ruleFallbackNightly!)
    }
    if (nightlyDiffersFromDeposit(priceAmount, damageDepositAmount)) {
      candidates.push(priceAmount!)
    }
    if (candidates.length === 0) return cheapestPlan
    const replacement = Math.min(...candidates)
    return { ...cheapestPlan, price_per_night: replacement }
  }, [cheapestPlan, damageDepositAmount, ruleFallbackNightly, priceAmount])

  const useRangeForListingLabel =
    ruleNightlyRange != null &&
    Number.isFinite(ruleNightlyRange.min) &&
    Number.isFinite(ruleNightlyRange.max) &&
    ruleNightlyRange.max > ruleNightlyRange.min &&
    cheapestPlanForPricing == null

  const convertedListingLabel = useConvertedListingPrice(
    price,
    useRangeForListingLabel ? ruleNightlyRange.min : priceAmount,
    priceCurrency,
    useRangeForListingLabel ? ruleNightlyRange.max : undefined,
  )

  const currencyCode = (cheapestPlanForPricing?.currency_code ?? priceCurrency ?? 'TRY').trim().toUpperCase()
  const poolHeatingCurrency = poolHeating?.currencyCode.trim().toUpperCase() || currencyCode

  const basePriceNum = cheapestPlanForPricing
    ? cheapestPlanForPricing.price_per_night
    : useRangeForListingLabel
      ? ruleNightlyRange.min
      : priceAmount != null && Number.isFinite(priceAmount)
        ? priceAmount
        : parseInt((price ?? '').replace(/\D/g, '') || '0', 10) || 0

  const discountPct = parseDiscountPercent(saleOff, discountPercent ?? undefined)
  const showDiscountRow =
    !cheapestPlanForPricing && discountPct != null && discountPct > 0 && basePriceNum > 0

  const originalPriceNum =
    showDiscountRow && discountPct != null ? basePriceNum / (1 - discountPct / 100) : null

  const displayMainPrice = useMemo(() => {
    if (cheapestPlanForPricing) {
      return formatConverted(
        cheapestPlanForPricing.price_per_night,
        cheapestPlanForPricing.currency_code,
      )
    }
    if (showDiscountRow && basePriceNum > 0) return formatConverted(basePriceNum, currencyCode)
    return convertedListingLabel
  }, [
    cheapestPlanForPricing,
    showDiscountRow,
    basePriceNum,
    currencyCode,
    formatConverted,
    convertedListingLabel,
  ])

  const priceNum = cheapestPlanForPricing ? cheapestPlanForPricing.price_per_night : basePriceNum

  const fallbackNightlyForRange =
    ruleFallbackNightly != null && ruleFallbackNightly > 0
      ? ruleFallbackNightly
      : priceNum > 0
        ? priceNum
        : 0

  const seasonalLodgingQuote = useMemo(() => {
    if (!rangeStart || !rangeEnd || nights <= 0) return null
    if (!priceRules?.length && !listingId?.trim()) return null
    return computeStayRentalLodgingQuote({
      days: rangeDays,
      priceRules: priceRules ?? [],
      rangeStart,
      rangeEnd,
      fallbackNightly: fallbackNightlyForRange,
    })
  }, [
    rangeDays,
    priceRules,
    rangeStart,
    rangeEnd,
    nights,
    listingId,
    fallbackNightlyForRange,
  ])

  const lodgingSubtotal =
    seasonalLodgingQuote != null && seasonalLodgingQuote.total > 0
      ? seasonalLodgingQuote.total
      : priceNum > 0
        ? priceNum * nights
        : 0
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
  const cleaningFeeApplied =
    cleaningFeeAmount != null &&
    cleaningFeeAmount > 0 &&
    nights > 0
      ? cleaningFeeAmount
      : 0
  const subtotalBeforeFee = lodgingSubtotal + heatingSubtotal + shortStayFeeApplied + cleaningFeeApplied
  // Fiyatlar komisyon dahil tanımlandığından üstüne ek hizmet bedeli eklenmez.
  const serviceFee = 0
  const grandTotal = subtotalBeforeFee

  const unitForBreakdownLine = useMemo(() => {
    if (seasonalLodgingQuote != null && nights > 0 && seasonalLodgingQuote.total > 0) {
      if (seasonalLodgingQuote.uniformNightly != null) {
        return formatConverted(seasonalLodgingQuote.uniformNightly, currencyCode)
      }
      if (
        seasonalLodgingQuote.minNightly != null &&
        seasonalLodgingQuote.maxNightly != null &&
        seasonalLodgingQuote.minNightly !== seasonalLodgingQuote.maxNightly
      ) {
        return `${formatConverted(seasonalLodgingQuote.minNightly, currencyCode)} – ${formatConverted(seasonalLodgingQuote.maxNightly, currencyCode)}`
      }
    }
    if (cheapestPlanForPricing != null) {
      return formatConverted(cheapestPlanForPricing.price_per_night, cheapestPlanForPricing.currency_code)
    }
    if (showDiscountRow && basePriceNum > 0) return formatConverted(basePriceNum, currencyCode)
    return convertedListingLabel
  }, [
    seasonalLodgingQuote,
    nights,
    cheapestPlanForPricing,
    showDiscountRow,
    basePriceNum,
    currencyCode,
    formatConverted,
    convertedListingLabel,
  ])

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
    cleaningFeeApplied,
    seasonalLodgingQuote,
  }
}

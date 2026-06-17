import type { StayBookingRules } from '@/types/listing-types'

export type CheckoutPriceBreakdown = {
  nights: number
  lodgingSubtotal: number
  shortStayFee: number
  cleaningFee: number
  poolHeatingFee: number
  grandTotal: number
}

function parseAmount(raw: string | null | undefined): number {
  if (raw == null || String(raw).trim() === '') return 0
  const n = parseFloat(String(raw).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function computeCheckoutPriceBreakdown(input: {
  totalPrice: number
  nights: number
  stayBookingRules?: StayBookingRules
  cleaningFeeAmount?: string | null
  poolHeatingFee?: number
}): CheckoutPriceBreakdown {
  const { totalPrice, nights, stayBookingRules, cleaningFeeAmount, poolHeatingFee = 0 } = input

  const shortStayFee =
    stayBookingRules?.minShortStayNights != null &&
    stayBookingRules?.shortStayFeeAmount != null &&
    stayBookingRules.shortStayFeeAmount > 0 &&
    nights > 0 &&
    nights < stayBookingRules.minShortStayNights
      ? stayBookingRules.shortStayFeeAmount
      : 0

  const cleaningFee = nights > 0 ? parseAmount(cleaningFeeAmount ?? undefined) : 0
  const poolFee = poolHeatingFee > 0 ? poolHeatingFee : 0
  const lodgingSubtotal = Math.max(0, totalPrice - shortStayFee - cleaningFee - poolFee)

  return {
    nights,
    lodgingSubtotal,
    shortStayFee,
    cleaningFee,
    poolHeatingFee: poolFee,
    grandTotal: totalPrice,
  }
}

export {
  DEFAULT_LISTING_PREPAYMENT_PERCENT,
  resolveListingPrepaymentPercent,
} from '@/lib/listing-prepayment'

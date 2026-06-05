'use client'

import PaymentTypeSelector from '@/components/checkout/PaymentTypeSelector'
import { checkoutT, fmtCheckout, formatCheckoutMoney } from '@/lib/checkout-i18n'
import type { CheckoutPriceBreakdown } from '@/lib/checkout-price-breakdown'
import { Suspense } from 'react'
import YourTrip from '@/app/[locale]/(app)/(other-pages)/checkout/YourTrip'
import type { GuestsObject } from '@/type'
import type { FxLockSnapshot } from '@/lib/travel-api'

type Props = {
  locale: string
  currencyCode: string
  breakdown: CheckoutPriceBreakdown
  grandTotal: number
  couponCode?: string | null
  couponDiscount?: number
  prepaymentPercent: number
  paymentType: 'full' | 'partial'
  onPaymentTypeChange: (v: 'full' | 'partial') => void
  amountDueNow: number
  amountRemaining: number
  onGuestsChange: (g: GuestsObject) => void
  stayDates: { start: string; end: string }
  showPaymentOptions: boolean
  fxLockInfo?: FxLockSnapshot | null
}

export default function CheckoutReservationDetails({
  locale,
  currencyCode,
  breakdown,
  grandTotal,
  couponCode,
  couponDiscount = 0,
  prepaymentPercent,
  paymentType,
  onPaymentTypeChange,
  amountDueNow,
  amountRemaining,
  onGuestsChange,
  stayDates,
  showPaymentOptions,
  fxLockInfo,
}: Props) {
  const C = checkoutT(locale)

  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="min-h-[200px]" aria-hidden />}>
        <YourTrip locale={locale} onGuestsChange={onGuestsChange} />
      </Suspense>

      {showPaymentOptions && prepaymentPercent > 0 ? (
        <PaymentTypeSelector
          locale={locale}
          breakdown={breakdown}
          grandTotal={grandTotal}
          prepaymentPercent={prepaymentPercent}
          currencyCode={currencyCode}
          couponCode={couponCode}
          couponDiscount={couponDiscount}
          value={paymentType}
          onChange={onPaymentTypeChange}
        />
      ) : null}

      {fxLockInfo ? (
        <p className="max-w-full break-words rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs leading-relaxed text-neutral-600 dark:border-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-300">
          <span className="font-medium text-neutral-800 dark:text-neutral-200">{C.fxLockTitle}:</span>{' '}
          {fmtCheckout(C.fxLockBody, {
            lockedAt: fxLockInfo.locked_at,
            rates: Object.entries(fxLockInfo.rates_to_try || {})
              .map(([c, r]) => `${c}: ${r}`)
              .join(', '),
          })}
        </p>
      ) : null}

      {grandTotal > 0 ? (
        <div className="grid gap-3 rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 sm:grid-cols-2 dark:border-neutral-700 dark:bg-neutral-900/30">
          <div>
            <p className="text-xs text-neutral-500">{C.amountDueNowLabel}</p>
            <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              {formatCheckoutMoney(locale, amountDueNow, currencyCode)}
            </p>
          </div>
          {amountRemaining > 0 ? (
            <div>
              <p className="text-xs text-neutral-500">{C.amountRemainingLabel}</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                {formatCheckoutMoney(locale, amountRemaining, currencyCode)}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

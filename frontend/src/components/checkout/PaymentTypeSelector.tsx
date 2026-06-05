'use client'

import type { CheckoutPriceBreakdown } from '@/lib/checkout-price-breakdown'
import { checkoutT, fmtCheckout, formatCheckoutMoney } from '@/lib/checkout-i18n'

interface PaymentTypeSelectorProps {
  locale: string
  breakdown: CheckoutPriceBreakdown
  /** Toplam (kupon sonrası) */
  grandTotal: number
  prepaymentPercent: number
  currencyCode?: string
  couponCode?: string | null
  couponDiscount?: number
  value: 'full' | 'partial'
  onChange: (type: 'full' | 'partial') => void
}

type PriceLine = { label: string; amount: number; muted?: boolean }

function PaymentPriceLines({
  locale,
  currencyCode,
  lines,
}: {
  locale: string
  currencyCode: string
  lines: PriceLine[]
}) {
  if (lines.length === 0) return null
  return (
    <ul className="mt-2 w-full space-y-1 border-t border-neutral-200/80 pt-2.5 dark:border-neutral-600/80">
      {lines.map((line) => (
        <li
          key={line.label}
          className={[
            'flex items-baseline justify-between gap-2 text-xs',
            line.muted
              ? 'text-neutral-400 dark:text-neutral-500'
              : 'text-neutral-600 dark:text-neutral-300',
          ].join(' ')}
        >
          <span className="min-w-0 leading-snug">{line.label}</span>
          <span className="shrink-0 font-medium tabular-nums">
            {line.amount < 0 ? '−' : ''}
            {formatCheckoutMoney(locale, Math.abs(line.amount), currencyCode)}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function PaymentTypeSelector({
  locale,
  breakdown,
  grandTotal,
  prepaymentPercent,
  currencyCode = 'TRY',
  couponCode,
  couponDiscount = 0,
  value,
  onChange,
}: PaymentTypeSelectorProps) {
  const C = checkoutT(locale)
  const { lodgingSubtotal, shortStayFee, poolHeatingFee, cleaningFee } = breakdown
  const partialAmount = Math.round(lodgingSubtotal * prepaymentPercent) / 100
  const remainder = grandTotal - partialAmount
  const remainderFmt = formatCheckoutMoney(locale, remainder, currencyCode)

  const sharedLines: PriceLine[] = []
  if (lodgingSubtotal > 0) {
    sharedLines.push({ label: C.lodgingLine, amount: lodgingSubtotal })
  }
  if (shortStayFee > 0) {
    sharedLines.push({ label: C.shortStayFee, amount: shortStayFee })
  }
  if (poolHeatingFee > 0) {
    sharedLines.push({ label: C.poolHeatingFee, amount: poolHeatingFee })
  }
  if (cleaningFee > 0) {
    sharedLines.push({ label: C.extraCharges, amount: cleaningFee })
  }
  if (couponCode && couponDiscount > 0) {
    sharedLines.push({
      label: fmtCheckout(C.couponLine, { code: couponCode }),
      amount: -couponDiscount,
    })
  }

  const options: Array<{
    id: 'full' | 'partial'
    label: string
    sublabel: string
    amount: number
    priceLines: PriceLine[]
    badge?: string
    note?: string
  }> = [
    {
      id: 'full',
      label: C.payFullLabel,
      sublabel: C.payFullSublabel,
      amount: grandTotal,
      priceLines: sharedLines,
    },
    {
      id: 'partial',
      label: fmtCheckout(C.payPartialLabel, { prepaymentPercent }),
      sublabel: fmtCheckout(C.payPartialSublabel, { remainder: remainderFmt }),
      amount: partialAmount,
      priceLines: sharedLines,
      badge: C.payPartialBadge,
      note:
        remainder > 0 ? fmtCheckout(C.payAtPropertyNote, { remainder: remainderFmt }) : undefined,
    },
  ]

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">{C.paymentOptionTitle}</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={[
              'relative flex flex-col items-start gap-y-1.5 rounded-2xl border-2 p-4 text-left transition-all',
              value === opt.id
                ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600',
            ].join(' ')}
          >
            <span
              className={[
                'absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2',
                value === opt.id
                  ? 'border-primary-500 bg-primary-500 dark:border-primary-400 dark:bg-primary-400'
                  : 'border-neutral-300 dark:border-neutral-600',
              ].join(' ')}
            >
              {value === opt.id && (
                <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                  <path
                    d="M3.5 6.5L5 8l3.5-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>

            {opt.badge && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {opt.badge}
              </span>
            )}

            <span className="pr-6 text-sm font-semibold text-neutral-800 dark:text-neutral-100">{opt.label}</span>

            <PaymentPriceLines locale={locale} currencyCode={currencyCode} lines={opt.priceLines} />

            <span className="text-2xl font-bold text-neutral-900 dark:text-white">
              {formatCheckoutMoney(locale, opt.amount, currencyCode)}
            </span>

            <span className="text-xs text-neutral-500 dark:text-neutral-400">{opt.sublabel}</span>

            {opt.note && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 16 16">
                  <path
                    d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 11a.75.75 0 110-1.5A.75.75 0 018 12zm.75-3.5v-3a.75.75 0 00-1.5 0v3a.75.75 0 001.5 0z"
                    fill="currentColor"
                  />
                </svg>
                {opt.note}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

'use client'

import CouponBox from '@/components/checkout/CouponBox'
import { checkoutT } from '@/lib/checkout-i18n'
import {
  CHECKOUT_IBAN_ROWS,
  EMPTY_CHECKOUT_PAYMENT_METHODS,
  parseCheckoutPaymentMethodsConfig,
  type CheckoutPaymentMethodsConfig,
} from '@/lib/checkout-payment-methods-config'
import type { CheckoutPaymentChannel } from '@/lib/checkout-guest-types'
import { getCheckoutPaymentMethods } from '@/lib/travel-api'
import type { CouponPreview } from '@/lib/travel-api'
import clsx from 'clsx'
import { CreditCard } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'

type RemittanceChannel = 'bank_transfer' | 'western_union' | 'ria'

const REMITTANCE_TABS: RemittanceChannel[] = ['bank_transfer', 'western_union', 'ria']

type Props = {
  locale: string
  value: CheckoutPaymentChannel
  onChange: (v: CheckoutPaymentChannel) => void
  subtotal: number
  onCouponChange: (c: CouponPreview | null) => void
}

function PaymentInfoPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 dark:border-neutral-600 dark:bg-neutral-900/40 dark:text-neutral-300">
      {children}
    </div>
  )
}

export default function CheckoutPaymentMethods({
  locale,
  value,
  onChange,
  subtotal,
  onCouponChange,
}: Props) {
  const C = checkoutT(locale)
  const [methods, setMethods] = useState<CheckoutPaymentMethodsConfig>(
    EMPTY_CHECKOUT_PAYMENT_METHODS,
  )

  useEffect(() => {
    let cancelled = false
    void getCheckoutPaymentMethods()
      .then((data) => {
        if (!cancelled) setMethods(parseCheckoutPaymentMethodsConfig(data))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const envBankFallback =
    process.env.NEXT_PUBLIC_CHECKOUT_BANK_DETAILS?.trim() ||
    'IBAN ve havale talimatları rezervasyon onayından sonra e-posta ile iletilecektir.'

  const ibanRows = CHECKOUT_IBAN_ROWS.map(({ key, label }) => ({
    label,
    value: methods.bank_transfer[key].trim(),
  })).filter((row) => row.value.length > 0)

  const bankNote = methods.bank_transfer.note.trim()
  const hasBankContent = ibanRows.length > 0 || bankNote.length > 0

  const tabLabel = (ch: RemittanceChannel) => {
    switch (ch) {
      case 'bank_transfer':
        return C.payChannelBank
      case 'western_union':
        return C.payChannelWesternUnion
      case 'ria':
        return C.payChannelRia
    }
  }

  const remittanceSelected = value !== 'card'

  return (
    <div className="space-y-5">
      <Suspense fallback={<div className="min-h-[48px]" aria-hidden />}>
        <CouponBox locale={locale} subtotal={subtotal} onCouponChange={onCouponChange} />
      </Suspense>

      <div className="space-y-3">
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{C.payWithTitle}</p>

        <div className="flex items-stretch gap-2">
          <button
            type="button"
            onClick={() => onChange('card')}
            aria-label={C.payChannelCard}
            title={C.payChannelCard}
            className={clsx(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 transition-all',
              value === 'card'
                ? 'border-primary-500 bg-primary-50 text-primary-600 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-300'
                : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
            )}
          >
            <CreditCard className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>

          <div
            role="tablist"
            aria-label={C.payChannelBank}
            className="flex min-w-0 flex-1 rounded-xl border border-neutral-200 bg-neutral-100/90 p-1 dark:border-neutral-700 dark:bg-neutral-800/80"
          >
            {REMITTANCE_TABS.map((ch) => {
              const selected = value === ch
              return (
                <button
                  key={ch}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => onChange(ch)}
                  className={clsx(
                    'min-w-0 flex-1 rounded-lg px-1.5 py-2 text-center text-[11px] font-semibold leading-tight transition-all sm:px-2 sm:text-xs',
                    selected
                      ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-neutral-100'
                      : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200',
                  )}
                >
                  <span className="line-clamp-2">{tabLabel(ch)}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {remittanceSelected && value === 'bank_transfer' ? (
        <PaymentInfoPanel>
          {hasBankContent ? (
            <div className="space-y-3">
              {ibanRows.map((row) => (
                <div key={row.label}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    {row.label}
                  </p>
                  <p className="mt-0.5 font-mono text-sm whitespace-pre-wrap">{row.value}</p>
                </div>
              ))}
              {bankNote ? (
                <p className="border-t border-neutral-200/80 pt-3 text-sm whitespace-pre-wrap dark:border-neutral-600">
                  {bankNote}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{envBankFallback}</p>
          )}
        </PaymentInfoPanel>
      ) : null}

      {remittanceSelected && value === 'western_union' ? (
        <PaymentInfoPanel>
          <p className="whitespace-pre-wrap">
            {methods.western_union.trim() || C.payChannelRemittanceNote}
          </p>
        </PaymentInfoPanel>
      ) : null}

      {remittanceSelected && value === 'ria' ? (
        <PaymentInfoPanel>
          <p className="whitespace-pre-wrap">{methods.ria.trim() || C.payChannelRemittanceNote}</p>
        </PaymentInfoPanel>
      ) : null}
    </div>
  )
}

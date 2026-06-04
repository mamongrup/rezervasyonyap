'use client'

import { checkoutT } from '@/lib/checkout-i18n'
import type { CheckoutPaymentChannel } from '@/lib/checkout-guest-types'
import { ShieldCheck } from 'lucide-react'

const CHANNELS: CheckoutPaymentChannel[] = [
  'bank_transfer',
  'western_union',
  'ria',
  'card',
]

type Props = {
  locale: string
  value: CheckoutPaymentChannel
  onChange: (v: CheckoutPaymentChannel) => void
}

export default function CheckoutPaymentMethods({ locale, value, onChange }: Props) {
  const C = checkoutT(locale)
  const bankDetails =
    process.env.NEXT_PUBLIC_CHECKOUT_BANK_DETAILS?.trim() ||
    'IBAN ve havale talimatları rezervasyon onayından sonra e-posta ile iletilecektir.'

  const labelFor = (ch: CheckoutPaymentChannel) => {
    switch (ch) {
      case 'bank_transfer':
        return C.payChannelBank
      case 'western_union':
        return C.payChannelWesternUnion
      case 'ria':
        return C.payChannelRia
      case 'card':
        return C.payChannelCard
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {CHANNELS.map((ch) => (
          <button
            key={ch}
            type="button"
            onClick={() => onChange(ch)}
            className={[
              'rounded-2xl border-2 p-4 text-start transition-all',
              value === ch
                ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800',
            ].join(' ')}
          >
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {labelFor(ch)}
            </span>
            {ch === 'card' ? (
              <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">
                {C.payChannelCardNote}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {value === 'bank_transfer' ? (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm whitespace-pre-wrap text-neutral-700 dark:border-neutral-600 dark:bg-neutral-900/40 dark:text-neutral-300">
          {bankDetails}
        </div>
      ) : null}

      {value === 'western_union' || value === 'ria' ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{C.payChannelRemittanceNote}</p>
      ) : null}

      {value === 'card' ? (
        <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 dark:border-neutral-700 dark:bg-neutral-800/50">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <div>
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
              {C.payWithSecureNote}
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{C.payWithRedirectNote}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

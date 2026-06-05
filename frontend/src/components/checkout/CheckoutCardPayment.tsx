'use client'

import CheckoutParatikaInline, {
  type ParatikaCheckoutPayload,
} from '@/components/checkout/CheckoutParatikaInline'
import ParatikaDirectPostForm from '@/components/checkout/ParatikaDirectPostForm'
import { checkoutT } from '@/lib/checkout-i18n'
import { CreditCard } from 'lucide-react'

type Props = {
  locale: string
  paratikaPayload?: ParatikaCheckoutPayload | null
  defaultCardOwner?: string
}

export default function CheckoutCardPayment({
  locale,
  paratikaPayload,
  defaultCardOwner = '',
}: Props) {
  const C = checkoutT(locale)
  const P = C.paratika

  const labels = {
    title: P.directPostTitle,
    note: P.directPostNote,
    cardOwner: P.cardOwner,
    cardNumber: P.cardNumber,
    expiryMonth: P.expiryMonth,
    expiryYear: P.expiryYear,
    cvv: P.cvv,
    pay: P.confirmPay,
    secureNote: P.secureNote,
    processing3d: P.processing3d,
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary-600 dark:text-primary-400" aria-hidden />
        <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
          {C.payChannelCard}
        </h3>
      </div>

      {paratikaPayload ? (
        <CheckoutParatikaInline locale={locale} payload={paratikaPayload} />
      ) : (
        <div className="space-y-3">
          <ParatikaDirectPostForm
            preview
            defaultCardOwner={defaultCardOwner}
            labels={labels}
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{C.payChannelCardNote}</p>
        </div>
      )}
    </div>
  )
}

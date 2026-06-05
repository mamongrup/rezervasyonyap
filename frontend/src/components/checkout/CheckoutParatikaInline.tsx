'use client'

import ParatikaDirectPostForm from '@/components/checkout/ParatikaDirectPostForm'
import { checkoutT, fmtCheckout } from '@/lib/checkout-i18n'
import { fetchPublicIp, paratikaSessionToken } from '@/lib/travel-api'
import { Loader2 } from 'lucide-react'
import React from 'react'

export type ParatikaCheckoutPayload = {
  reservation_id: string
  public_code: string
  email: string
  guest_name: string
  payment_amount: string
  currency_code: string
}

type Props = {
  locale: string
  payload: ParatikaCheckoutPayload
  onError?: (message: string) => void
}

function formatParatikaError(raw: string, C: ReturnType<typeof checkoutT>['paratika']): string {
  if (
    raw.includes('ERR10020') ||
    raw.includes('MERCHANTUSER') ||
    raw.includes('Geçersiz kullanıcı')
  ) {
    return `${C.invalidMerchantUser}\n\n${C.invalidMerchantUserHint}`
  }
  if (raw.startsWith('paratika_session_error:')) {
    return C.sessionFailed
  }
  return raw
}

export default function CheckoutParatikaInline({ locale, payload, onError }: Props) {
  const C = checkoutT(locale).paratika
  const [err, setErr] = React.useState<string | null>(null)
  const [session, setSession] = React.useState<{
    direct_post_3d_url: string
    guest_name: string
  } | null>(null)

  React.useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const ip = await fetchPublicIp()
        const orderTitle = fmtCheckout(checkoutT(locale).reservationBasketLabel, {
          code: payload.public_code,
        })
        const res = await paratikaSessionToken({
          merchant_oid: payload.reservation_id,
          payment_amount: payload.payment_amount,
          email: payload.email,
          user_ip: ip,
          currency: payload.currency_code,
          user_name: payload.guest_name,
          order_title: orderTitle,
        })
        if (!cancelled) {
          setSession({
            direct_post_3d_url: res.direct_post_3d_url,
            guest_name: payload.guest_name,
          })
        }
      } catch (e) {
        const rawErr = e instanceof Error ? e.message : C.sessionFailed
        const msg = formatParatikaError(rawErr, C)
        if (!cancelled) {
          setErr(msg)
          onError?.(msg)
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [payload, locale, C, onError])

  if (err) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm whitespace-pre-wrap text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100"
      >
        {err}
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-6 dark:border-neutral-700 dark:bg-neutral-800/50">
        <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
        <p className="text-sm text-neutral-600 dark:text-neutral-300">{C.loading}</p>
      </div>
    )
  }

  return (
    <ParatikaDirectPostForm
      actionUrl={session.direct_post_3d_url}
      defaultCardOwner={session.guest_name}
      labels={{
        title: C.directPostTitle,
        note: C.directPostNote,
        cardOwner: C.cardOwner,
        cardNumber: C.cardNumber,
        expiryMonth: C.expiryMonth,
        expiryYear: C.expiryYear,
        cvv: C.cvv,
        pay: C.confirmPay,
        secureNote: C.secureNote,
        processing3d: C.processing3d,
      }}
    />
  )
}

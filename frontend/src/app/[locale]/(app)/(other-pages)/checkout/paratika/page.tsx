'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { checkoutT, fmtCheckout } from '@/lib/checkout-i18n'
import { fetchPublicIp, paratikaSessionToken } from '@/lib/travel-api'
import { useParams, useRouter } from 'next/navigation'
import React from 'react'

type Stored = {
  reservation_id: string
  public_code: string
  email: string
  guest_name: string
  payment_amount: string
  currency_code: string
}

const STORAGE_KEY = 'travel_paratika_checkout'

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

export default function ParatikaCheckoutPage() {
  const router = useRouter()
  const vitrinHref = useVitrinHref()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const C = checkoutT(locale).paratika
  const [err, setErr] = React.useState<string | null>(null)

  React.useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      setErr(C.sessionMissing)
      return
    }
    let data: Stored
    try {
      data = JSON.parse(raw) as Stored
    } catch {
      setErr(C.invalidSession)
      return
    }

    const run = async () => {
      try {
        const ip = await fetchPublicIp()
        const orderTitle = fmtCheckout(checkoutT(locale).reservationBasketLabel, {
          code: data.public_code,
        })
        const res = await paratikaSessionToken({
          merchant_oid: data.reservation_id,
          payment_amount: data.payment_amount,
          email: data.email,
          user_ip: ip,
          currency: data.currency_code,
          user_name: data.guest_name,
          order_title: orderTitle,
        })
        sessionStorage.removeItem(STORAGE_KEY)
        window.location.href = res.payment_url
      } catch (e) {
        const raw = e instanceof Error ? e.message : C.sessionFailed
        setErr(formatParatikaError(raw, C))
      }
    }
    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tek seferlik ödeme oturumu
  }, [])

  if (err) {
    return (
      <main className="container mt-10 mb-24 max-w-lg">
        <p className="whitespace-pre-line text-red-600 dark:text-red-400">{err}</p>
        <button
          type="button"
          className="mt-6 text-sm font-medium text-neutral-900 underline dark:text-neutral-100"
          onClick={() => router.push(vitrinHref('/checkout'))}
        >
          {C.backToCheckout}
        </button>
      </main>
    )
  }

  return (
    <main className="container mt-10 mb-24">
      <p className="text-neutral-600 dark:text-neutral-400">{C.redirecting}</p>
    </main>
  )
}

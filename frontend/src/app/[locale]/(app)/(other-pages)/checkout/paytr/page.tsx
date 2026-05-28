'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import {
  checkoutT,
  fmtCheckout,
  formatCheckoutDate,
  formatCheckoutMoney,
  checkoutStatusLabel,
  paytrLangFromLocale,
} from '@/lib/checkout-i18n'
import {
  encodePaytrUserBasket,
  fetchPublicIp,
  paytrIframeToken,
} from '@/lib/travel-api'
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

const STORAGE_KEY = 'travel_paytr_checkout'

export default function PaytrCheckoutPage() {
  const router = useRouter()
  const vitrinHref = useVitrinHref()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const C = checkoutT(locale).paytr
  const [err, setErr] = React.useState<string | null>(null)
  const [iframeUrl, setIframeUrl] = React.useState<string | null>(null)

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
        const kurus = parseInt(data.payment_amount, 10)
        const display = Number.isFinite(kurus) ? (kurus / 100).toFixed(2) : '0.00'
        const basketLabel = fmtCheckout(checkoutT(locale).reservationBasketLabel, {
          code: data.public_code,
        })
        const basket = encodePaytrUserBasket([[basketLabel, display, 1]])
        const origin = window.location.origin
        const okPath = vitrinHref(`/pay-done?code=${encodeURIComponent(data.public_code)}`)
        const failPath = vitrinHref('/checkout?pay=failed')
        const okUrl = okPath.startsWith('http') ? okPath : `${origin}${okPath}`
        const failUrl = failPath.startsWith('http') ? failPath : `${origin}${failPath}`
        const res = await paytrIframeToken({
          user_ip: ip,
          merchant_oid: data.reservation_id,
          email: data.email,
          payment_amount: data.payment_amount,
          user_basket: basket,
          user_name: data.guest_name,
          currency: data.currency_code,
          merchant_ok_url: okUrl,
          merchant_fail_url: failUrl,
          lang: paytrLangFromLocale(locale),
        })
        sessionStorage.removeItem(STORAGE_KEY)
        setIframeUrl(res.iframe_url)
      } catch (e) {
        setErr(e instanceof Error ? e.message : checkoutT(locale).paytr.tokenFailed)
      }
    }
    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tek seferlik ödeme oturumu
  }, [])

  if (err) {
    return (
      <main className="container mt-10 mb-24 max-w-lg">
        <p className="text-red-600 dark:text-red-400">{err}</p>
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

  if (!iframeUrl) {
    return (
      <main className="container mt-10 mb-24">
        <p className="text-neutral-600 dark:text-neutral-400">{C.loading}</p>
      </main>
    )
  }

  return (
    <main className="container mt-10 mb-24">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{C.title}</h1>
      <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">{C.note}</p>
      <iframe
        title={C.iframeTitle}
        src={iframeUrl}
        className="min-h-[720px] w-full rounded-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"
      />
    </main>
  )
}

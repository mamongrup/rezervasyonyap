'use client'

import {
  encodePaytrUserBasket,
  fetchPublicIp,
  paytrIframeToken,
} from '@/lib/travel-api'
import { useRouter } from 'next/navigation'
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
  const [err, setErr] = React.useState<string | null>(null)
  const [iframeUrl, setIframeUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      setErr('Ödeme oturumu bulunamadı. Lütfen checkout’tan yeniden başlayın.')
      return
    }
    let data: Stored
    try {
      data = JSON.parse(raw) as Stored
    } catch {
      setErr('Geçersiz oturum verisi.')
      return
    }

    const run = async () => {
      try {
        const ip = await fetchPublicIp()
        const kurus = parseInt(data.payment_amount, 10)
        const display = Number.isFinite(kurus) ? (kurus / 100).toFixed(2) : '0.00'
        const basket = encodePaytrUserBasket([[`Rezervasyon ${data.public_code}`, display, 1]])
        const origin = window.location.origin
        const res = await paytrIframeToken({
          user_ip: ip,
          merchant_oid: data.reservation_id,
          email: data.email,
          payment_amount: data.payment_amount,
          user_basket: basket,
          user_name: data.guest_name,
          currency: data.currency_code,
          merchant_ok_url: `${origin}/pay-done?code=${encodeURIComponent(data.public_code)}`,
          merchant_fail_url: `${origin}/checkout?pay=failed`,
          lang: 'tr',
        })
        sessionStorage.removeItem(STORAGE_KEY)
        setIframeUrl(res.iframe_url)
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'PayTR token alınamadı')
      }
    }
    void run()
  }, [])

  if (err) {
    return (
      <main className="container mt-10 mb-24 max-w-lg">
        <p className="text-red-600 dark:text-red-400">{err}</p>
        <button
          type="button"
          className="mt-6 text-sm font-medium text-neutral-900 underline dark:text-neutral-100"
          onClick={() => router.push('/checkout')}
        >
          Checkout’a dön
        </button>
      </main>
    )
  }

  if (!iframeUrl) {
    return (
      <main className="container mt-10 mb-24">
        <p className="text-neutral-600 dark:text-neutral-400">PayTR güvenli ödeme formu yükleniyor…</p>
      </main>
    )
  }

  return (
    <main className="container mt-10 mb-24">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Güvenli ödeme (PayTR)</h1>
      <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
        Kart bilgileriniz doğrudan banka altyapısına iletilir; sitemizde saklanmaz.
      </p>
      <iframe
        title="PayTR ödeme"
        src={iframeUrl}
        className="min-h-[720px] w-full rounded-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"
      />
    </main>
  )
}

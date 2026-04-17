'use client'

import { fetchPublicIp, paratikaSessionToken } from '@/lib/travel-api'
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

const STORAGE_KEY = 'travel_paratika_checkout'

export default function ParatikaCheckoutPage() {
  const router = useRouter()
  const [err, setErr] = React.useState<string | null>(null)

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
        const res = await paratikaSessionToken({
          merchant_oid: data.reservation_id,
          payment_amount: data.payment_amount,
          email: data.email,
          user_ip: ip,
          currency: data.currency_code,
          user_name: data.guest_name,
          order_title: `Rezervasyon ${data.public_code}`,
        })
        sessionStorage.removeItem(STORAGE_KEY)
        window.location.href = res.payment_url
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Paratika oturumu açılamadı')
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

  return (
    <main className="container mt-10 mb-24">
      <p className="text-neutral-600 dark:text-neutral-400">Paratika ödeme sayfasına yönlendiriliyorsunuz…</p>
    </main>
  )
}

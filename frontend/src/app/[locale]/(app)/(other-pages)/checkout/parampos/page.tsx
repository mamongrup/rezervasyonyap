'use client'

import ParatikaCheckoutShell, { ParatikaCheckoutError } from '@/components/checkout/ParatikaCheckoutShell'
import ParatikaDirectPostForm from '@/components/checkout/ParatikaDirectPostForm'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { checkoutT } from '@/lib/checkout-i18n'
import { fetchPublicIp } from '@/lib/travel-api'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type Stored = { reservation_id: string; public_code: string; guest_name: string; guest_phone?: string; payment_amount: string; currency_code: string }

export default function ParamposCheckoutPage() {
  const router = useRouter()
  const href = useVitrinHref()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const C = checkoutT(locale).paratika
  const [data, setData] = useState<Stored | null>(null)
  const [ip, setIp] = useState('127.0.0.1')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('travel_parampos_checkout')
      if (!raw) throw new Error('Ödeme oturumu bulunamadı.')
      setData(JSON.parse(raw) as Stored)
      void fetchPublicIp().then(setIp).catch(() => {})
    } catch (e) { setError(e instanceof Error ? e.message : 'Ödeme oturumu geçersiz.') }
  }, [])
  if (error) return <ParatikaCheckoutError message={error} backLabel={C.backToCheckout} onBack={() => router.push(href('/checkout'))} />
  if (!data) return null
  const api = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '')
  return <ParatikaCheckoutShell locale={locale} title="ParamPOS Güvenli Ödeme" subtitle="Kart bilgileriniz 3D Secure ile doğrulanır." labels={{ backToCheckout:C.backToCheckout, secure3dBadge:C.secure3dBadge, encryptedBadge:C.encryptedBadge, poweredBy:'ParamPOS', amountDue:C.amountDue, reservationCode:C.reservationCode }} amountKurus={parseInt(data.payment_amount,10)} currencyCode={data.currency_code} publicCode={data.public_code} onBack={() => router.push(href('/checkout'))}>
    <ParatikaDirectPostForm actionUrl={`${api}/api/v1/integrations/parampos/start`} defaultCardOwner={data.guest_name} hiddenFields={{ reservation_id:data.reservation_id, gsm:(data.guest_phone ?? '').replace(/\D/g,'').replace(/^90/,'').replace(/^0/,''), user_ip:ip }} labels={{ title:'ParamPOS', note:'', cardOwner:C.cardOwner, cardNumber:C.cardNumber, expiryMonth:C.expiryMonth, expiryYear:C.expiryYear, cvv:C.cvv, pay:C.confirmPay, secureNote:'Kart bilgileriniz saklanmaz; yalnızca ParamPOS 3D Secure işlemi için kullanılır.', processing3d:C.processing3d }} onBeforeSubmit={() => sessionStorage.removeItem('travel_parampos_checkout')} />
  </ParatikaCheckoutShell>
}

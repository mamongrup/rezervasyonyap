'use client'

import ParatikaDirectPostForm from '@/components/checkout/ParatikaDirectPostForm'
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

type UiMode = 'direct_post' | 'hpp_iframe'

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

function resolveUiMode(
  apiUi: string | undefined,
  envUi: string | undefined,
): UiMode {
  const raw = (envUi?.trim() || apiUi?.trim() || 'direct_post').toLowerCase()
  if (raw === 'hpp_iframe' || raw === 'iframe') return 'hpp_iframe'
  return 'direct_post'
}

export default function ParatikaCheckoutPage() {
  const router = useRouter()
  const vitrinHref = useVitrinHref()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const C = checkoutT(locale).paratika
  const [err, setErr] = React.useState<string | null>(null)
  const [uiMode, setUiMode] = React.useState<UiMode>('direct_post')
  const [session, setSession] = React.useState<{
    payment_url: string
    direct_post_3d_url: string
    guest_name: string
  } | null>(null)

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
        const mode = resolveUiMode(
          res.checkout_ui,
          process.env.NEXT_PUBLIC_PARATIKA_CHECKOUT_UI,
        )
        setUiMode(mode)
        setSession({
          payment_url: res.payment_url,
          direct_post_3d_url: res.direct_post_3d_url,
          guest_name: data.guest_name,
        })
      } catch (e) {
        const rawErr = e instanceof Error ? e.message : C.sessionFailed
        setErr(formatParatikaError(rawErr, C))
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

  if (!session) {
    return (
      <main className="container mt-10 mb-24">
        <p className="text-neutral-600 dark:text-neutral-400">{C.loading}</p>
      </main>
    )
  }

  if (uiMode === 'hpp_iframe') {
    return (
      <main className="container mt-10 mb-24">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            {C.title}
          </h1>
          <button
            type="button"
            className="text-sm font-medium text-neutral-600 underline dark:text-neutral-400"
            onClick={() => router.push(vitrinHref('/checkout'))}
          >
            {C.backToCheckout}
          </button>
        </div>
        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">{C.note}</p>
        <iframe
          title={C.iframeTitle}
          src={session.payment_url}
          className="min-h-[720px] w-full rounded-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="button"
          className="mt-4 text-sm text-neutral-500 underline dark:text-neutral-400"
          onClick={() => setUiMode('direct_post')}
        >
          {C.switchToDirectPost}
        </button>
      </main>
    )
  }

  return (
    <main className="container mt-10 mb-24 max-w-lg">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          {C.directPostTitle}
        </h1>
        <button
          type="button"
          className="text-sm font-medium text-neutral-600 underline dark:text-neutral-400"
          onClick={() => router.push(vitrinHref('/checkout'))}
        >
          {C.backToCheckout}
        </button>
      </div>
      <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">{C.directPostNote}</p>
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
        }}
        onBeforeSubmit={() => sessionStorage.removeItem(STORAGE_KEY)}
      />
      <button
        type="button"
        className="mt-6 text-sm text-neutral-500 underline dark:text-neutral-400"
        onClick={() => setUiMode('hpp_iframe')}
      >
        {C.switchToIframe}
      </button>
    </main>
  )
}

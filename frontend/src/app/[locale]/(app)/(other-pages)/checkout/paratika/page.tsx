'use client'

import ParatikaCheckoutShell, {
  ParatikaCheckoutError,
  ParatikaCheckoutLoading,
} from '@/components/checkout/ParatikaCheckoutShell'
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
  const [stored, setStored] = React.useState<Stored | null>(null)
  const [session, setSession] = React.useState<{
    payment_url: string
    direct_post_3d_url: string
    guest_name: string
  } | null>(null)

  const goCheckout = () => router.push(vitrinHref('/checkout'))

  const shellLabels = {
    backToCheckout: C.backToCheckout,
    secure3dBadge: C.secure3dBadge,
    encryptedBadge: C.encryptedBadge,
    poweredBy: C.poweredBy,
    amountDue: C.amountDue,
    reservationCode: C.reservationCode,
  }

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
    setStored(data)

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
    return <ParatikaCheckoutError message={err} backLabel={C.backToCheckout} onBack={goCheckout} />
  }

  if (!session) {
    return <ParatikaCheckoutLoading message={C.loading} />
  }

  const amountKurus = stored ? parseInt(stored.payment_amount, 10) : undefined

  if (uiMode === 'hpp_iframe') {
    return (
      <ParatikaCheckoutShell
        locale={locale}
        title={C.title}
        subtitle={C.note}
        labels={shellLabels}
        amountKurus={Number.isFinite(amountKurus) ? amountKurus : undefined}
        currencyCode={stored?.currency_code}
        publicCode={stored?.public_code}
        onBack={goCheckout}
        footer={
          <button
            type="button"
            className="text-sm text-neutral-500 underline transition hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            onClick={() => setUiMode('direct_post')}
          >
            {C.switchToDirectPost}
          </button>
        }
      >
        <iframe
          title={C.iframeTitle}
          src={session.payment_url}
          className="min-h-[640px] w-full rounded-2xl border border-neutral-200 bg-white shadow-inner dark:border-neutral-700 dark:bg-neutral-900"
        />
      </ParatikaCheckoutShell>
    )
  }

  return (
    <ParatikaCheckoutShell
      locale={locale}
      title={C.directPostTitle}
      subtitle={C.directPostNote}
      labels={shellLabels}
      amountKurus={Number.isFinite(amountKurus) ? amountKurus : undefined}
      currencyCode={stored?.currency_code}
      publicCode={stored?.public_code}
      onBack={goCheckout}
    >
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
        onBeforeSubmit={() => sessionStorage.removeItem(STORAGE_KEY)}
      />
    </ParatikaCheckoutShell>
  )
}

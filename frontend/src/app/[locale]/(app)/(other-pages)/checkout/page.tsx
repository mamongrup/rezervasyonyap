'use client'

import StartRating from '@/components/StartRating'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import { Description, Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import {
  addCartLine,
  applyCouponToCart,
  checkoutCart,
  createCart,
  getActivePaymentProvider,
  type CouponPreview,
  type FxLockSnapshot,
} from '@/lib/travel-api'
import CouponBox from '@/components/checkout/CouponBox'
import Form from 'next/form'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import React, { Suspense } from 'react'
import CheckoutContractAcceptance, {
  type CheckoutContractAcceptancePayload,
} from '@/components/CheckoutContractAcceptance'
import { CrossSellSuggestions } from '@/components/CrossSellSuggestions'
import PayWith from './PayWith'
import YourTrip from './YourTrip'
import PaymentTypeSelector from '@/components/checkout/PaymentTypeSelector'

const checkoutCrossSellTrigger =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CHECKOUT_CROSS_SELL_TRIGGER
    ? process.env.NEXT_PUBLIC_CHECKOUT_CROSS_SELL_TRIGGER
    : 'holiday_home'

function toYmd(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

const Page = () => {
  const router = useRouter()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const [pending, setPending] = React.useState(false)
  /** G2.1 — sepet oluşturulunca API’den gelen kur kilidi (gösterim) */
  const [fxLockInfo, setFxLockInfo] = React.useState<FxLockSnapshot | null>(null)
  const contractRef = React.useRef<CheckoutContractAcceptancePayload>({
    ok: false,
    contract_accepted: false,
    general_contract_accepted: true,
    sales_contract_accepted: true,
  })
  const onContractValidity = React.useCallback((p: CheckoutContractAcceptancePayload) => {
    contractRef.current = p
  }, [])

  const commissionPercent = Number(process.env.NEXT_PUBLIC_CHECKOUT_COMMISSION_PERCENT ?? 20)
  const prepaymentPercent = Number(process.env.NEXT_PUBLIC_CHECKOUT_PREPAYMENT_PERCENT ?? 30)
  const totalPrice = Number(process.env.NEXT_PUBLIC_CHECKOUT_UNIT_PRICE ?? 0)
  const [paymentType, setPaymentType] = React.useState<'full' | 'partial'>('partial')
  const hasCheckoutListing = Boolean(process.env.NEXT_PUBLIC_CHECKOUT_LISTING_ID?.trim())
  const [coupon, setCoupon] = React.useState<CouponPreview | null>(null)
  const couponDiscount = React.useMemo(() => {
    if (!coupon) return 0
    const n = Number(coupon.discount_amount)
    return Number.isFinite(n) ? n : 0
  }, [coupon])
  const grandTotal = Math.max(0, totalPrice - couponDiscount)

  React.useEffect(() => {
    document.documentElement.scrollTo({
      top: 0,
      behavior: 'instant',
    })
  }, [])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    const apiBase = process.env.NEXT_PUBLIC_API_URL
    const listingId = process.env.NEXT_PUBLIC_CHECKOUT_LISTING_ID

    if (apiBase && listingId) {
      setPending(true)
      try {
        const currency = process.env.NEXT_PUBLIC_CHECKOUT_CURRENCY ?? 'TRY'
        const unitPrice = process.env.NEXT_PUBLIC_CHECKOUT_UNIT_PRICE ?? '100.00'
        const start = toYmd(String(formObject.startDate ?? ''))
        const end = toYmd(String(formObject.endDate ?? ''))
        const email = String(formObject.guest_email ?? '').trim()
        const name = String(formObject.guest_name ?? '').trim()
        if (!start || !end || !email || !name) {
          window.alert('Tarih aralığı ve misafir e-posta / ad gerekli.')
          setPending(false)
          return
        }
        if (!contractRef.current.ok) {
          window.alert('Gerekli tüm sözleşmeleri okuyup onaylamanız gerekir.')
          setPending(false)
          return
        }
        const cart = await createCart(currency)
        setFxLockInfo(cart.fx_lock ?? null)
        await addCartLine(cart.id, {
          listing_id: listingId,
          quantity: 1,
          starts_on: start,
          ends_on: end,
          unit_price: unitPrice,
        })
        if (coupon?.code) {
          try {
            await applyCouponToCart(cart.id, coupon.code)
          } catch (err) {
            console.warn('Kupon uygulanamadı, devam ediliyor:', err)
          }
        }
        const cx = contractRef.current
        const out = await checkoutCart(cart.id, {
          guest_email: email,
          guest_name: name,
          contract_accepted: cx.contract_accepted,
          general_contract_accepted: cx.general_contract_accepted,
          sales_contract_accepted: cx.sales_contract_accepted,
          contract_locale: locale,
          payment_type: paymentType,
          installments: 1,
        })
        const payload = {
          reservation_id: out.reservation_id,
          public_code: out.public_code,
          email,
          guest_name: name,
          payment_amount: out.payment_amount,
          currency_code: out.currency_code,
        }
        let provider: 'paytr' | 'paratika' | 'none' = 'none'
        try {
          const ap = await getActivePaymentProvider()
          if (ap.active === 'paytr' || ap.active === 'paratika') provider = ap.active
        } catch {
          /* API yoksa env’e düş */
        }
        if (provider === 'none' && process.env.NEXT_PUBLIC_PAYTR_CHECKOUT !== '0') {
          provider = 'paytr'
        }
        localStorage.setItem('travel_paydone_email', email)
        if (provider === 'paytr') {
          sessionStorage.setItem('travel_paytr_checkout', JSON.stringify(payload))
          router.push('/checkout/paytr')
        } else if (provider === 'paratika') {
          sessionStorage.setItem('travel_paratika_checkout', JSON.stringify(payload))
          router.push('/checkout/paratika')
        } else {
          router.push(`/pay-done?code=${encodeURIComponent(out.public_code)}`)
        }
      } catch (e) {
        console.error(e)
        window.alert(e instanceof Error ? e.message : 'Rezervasyon oluşturulamadı')
      } finally {
        setPending(false)
      }
      return
    }

    console.log('Form submitted (API kapalı — .env ile NEXT_PUBLIC_API_URL + CHECKOUT_LISTING_ID):', formObject)
    router.push('/pay-done')
  }

  const renderSidebar = () => {
    return (
      <div className="flex w-full flex-col gap-y-6 border-neutral-200 px-0 sm:gap-y-8 sm:rounded-4xl sm:p-6 lg:border xl:p-8 dark:border-neutral-700">
        <div className="flex flex-col sm:flex-row sm:items-center">
          <div className="w-full shrink-0 sm:w-40">
            <div className="aspect-w-4 overflow-hidden rounded-2xl aspect-h-3 sm:aspect-h-4">
              <Image
                alt=""
                fill
                sizes="200px"
                src="/uploads/external/8081091c1bed4d7ee13a.avif"
              />
            </div>
          </div>
          <div className="flex flex-col gap-y-3 py-5 text-start sm:ps-5">
            <div>
              <span className="line-clamp-1 text-sm text-neutral-500 dark:text-neutral-400">
                Hotel room in Tokyo, Jappan
              </span>
              <span className="mt-1 block text-base font-medium">The Lounge & Bar</span>
            </div>
            <p className="block text-sm text-neutral-500 dark:text-neutral-400">2 beds · 2 baths</p>
            <Divider className="w-10!" />
            <StartRating />
          </div>
        </div>

        <Divider className="block lg:hidden" />

        {fxLockInfo && (
          <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs leading-relaxed text-neutral-600 dark:border-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-300">
            <span className="font-medium text-neutral-800 dark:text-neutral-200">Kur referansı (G2.1):</span>{' '}
            TRY karşılıkları {fxLockInfo.locked_at} UTC anında sabitlendi; gösterim / denetim içindir. Rezervasyon tutarı
            ilan para birimindedir (
            {Object.entries(fxLockInfo.rates_to_try || {})
              .map(([c, r]) => `${c}: ${r}`)
              .join(', ')}
            ).
          </p>
        )}

        <DescriptionList>
          <DescriptionTerm>$19.00 x 3 day</DescriptionTerm>
          <DescriptionDetails className="sm:text-right">$57.00</DescriptionDetails>
          <DescriptionTerm>Service charge</DescriptionTerm>
          <DescriptionDetails className="sm:text-right">$0.00</DescriptionDetails>
          <DescriptionTerm>Fee</DescriptionTerm>
          <DescriptionDetails className="sm:text-right">$0.00</DescriptionDetails>
          <DescriptionTerm>Tax</DescriptionTerm>
          <DescriptionDetails className="sm:text-right">$0.00</DescriptionDetails>
          {coupon && couponDiscount > 0 && (
            <>
              <DescriptionTerm className="text-emerald-700">Kupon ({coupon.code})</DescriptionTerm>
              <DescriptionDetails className="text-emerald-700 sm:text-right">
                -{couponDiscount.toFixed(2)}
              </DescriptionDetails>
            </>
          )}
          <DescriptionTerm className="font-semibold text-neutral-900">Total</DescriptionTerm>
          <DescriptionDetails className="font-semibold sm:text-right">
            {totalPrice > 0 ? grandTotal.toFixed(2) : '$57.00'}
          </DescriptionDetails>
        </DescriptionList>

        <Suspense fallback={<div className="min-h-[48px]" aria-hidden />}>
          <CouponBox subtotal={totalPrice > 0 ? totalPrice : 0} onCouponChange={setCoupon} />
        </Suspense>
      </div>
    )
  }

  const renderMain = () => {
    return (
      <Form
        action={handleSubmitForm}
        className="flex w-full flex-col gap-y-8 border-neutral-200 px-0 sm:rounded-4xl sm:border sm:p-6 xl:p-8 dark:border-neutral-700"
      >
        <h1 className="text-3xl font-semibold lg:text-4xl">Rezervasyonu Onayla</h1>
        <Divider />
        <Suspense fallback={<div className="min-h-[200px]" aria-hidden />}>
          <YourTrip />
        </Suspense>

        {/* Ön ödeme / tam ödeme — API ile checkout’ta tutar veya demo ilan kimliği varsa */}
        {prepaymentPercent > 0 && (totalPrice > 0 || hasCheckoutListing) && (
          <>
            <Divider />
            <PaymentTypeSelector
              totalPrice={totalPrice}
              commissionPercent={commissionPercent}
              prepaymentPercent={prepaymentPercent}
              currencyCode={process.env.NEXT_PUBLIC_CHECKOUT_CURRENCY ?? 'TRY'}
              value={paymentType}
              onChange={setPaymentType}
            />
          </>
        )}

        <CheckoutContractAcceptance
          listingId={process.env.NEXT_PUBLIC_CHECKOUT_LISTING_ID}
          locale={locale}
          onValidityChange={onContractValidity}
        />
        <CrossSellSuggestions triggerCategory={checkoutCrossSellTrigger} className="mt-2" />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <Label>E-posta</Label>
            <Input className="mt-1.5" name="guest_email" type="email" required autoComplete="email" />
            <Description>Rezervasyon onayı ve destek için.</Description>
          </Field>
          <Field>
            <Label>Ad soyad</Label>
            <Input className="mt-1.5" name="guest_name" required autoComplete="name" />
          </Field>
        </div>
        <PayWith />
        <div>
          <ButtonPrimary type="submit" className="mt-10 text-base/6!" disabled={pending}>
            {pending ? 'İşleniyor…' : 'Confirm and pay'}
          </ButtonPrimary>
        </div>
      </Form>
    )
  }

  return (
    <main className="container mt-10 mb-24 flex flex-col gap-14 lg:mb-32 lg:flex-row lg:gap-10">
      <div className="w-full lg:w-3/5 xl:w-2/3">{renderMain()}</div>
      <Divider className="block lg:hidden" />
      <div className="grow">{renderSidebar()}</div>
    </main>
  )
}

export default Page

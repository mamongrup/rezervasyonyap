'use client'

import CouponBox from '@/components/checkout/CouponBox'
import PaymentTypeSelector from '@/components/checkout/PaymentTypeSelector'
import CheckoutContractAcceptance, {
  type CheckoutContractAcceptancePayload,
} from '@/components/CheckoutContractAcceptance'
import { CrossSellSuggestions } from '@/components/CrossSellSuggestions'
import StartRating from '@/components/StartRating'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import {
  checkoutT,
  fmtCheckout,
  formatCheckoutMoney,
} from '@/lib/checkout-i18n'
import { preferListingGalleryFullAsset } from '@/lib/listing-gallery-display-url'
import { storageKeyToPublicUrl } from '@/lib/listing-gallery-hero-order'
import {
  resolveCheckoutCurrency,
  resolveCheckoutListingId,
  resolveCheckoutUnitPrice,
} from '@/lib/stay-checkout-url'
import {
  addCartLine,
  applyCouponToCart,
  checkoutCart,
  createCart,
  getActivePaymentProvider,
  getPublicListingImages,
  getPublicListingVitrine,
  type CouponPreview,
  type FxLockSnapshot,
} from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import { Description, Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Form from 'next/form'
import Image from 'next/image'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import React, { Suspense } from 'react'
import PayWith from './PayWith'
import YourTrip from './YourTrip'

const checkoutCrossSellTrigger =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CHECKOUT_CROSS_SELL_TRIGGER
    ? process.env.NEXT_PUBLIC_CHECKOUT_CROSS_SELL_TRIGGER
    : 'holiday_home'

function toYmd(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function nightsBetween(startIso: string | null, endIso: string | null): number {
  const s = startIso ? new Date(startIso) : null
  const e = endIso ? new Date(endIso) : null
  if (!s || !e || Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0
  const diff = Math.round((e.getTime() - s.getTime()) / 86400000)
  return diff > 0 ? diff : 0
}

function CheckoutPageContent() {
  const router = useRouter()
  const vitrinHref = useVitrinHref()
  const params = useParams()
  const searchParams = useSearchParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const C = checkoutT(locale)
  const paymentFailed = searchParams.get('pay') === 'failed'

  const checkoutListingId = resolveCheckoutListingId(
    searchParams.get('listingId'),
    process.env.NEXT_PUBLIC_CHECKOUT_LISTING_ID,
  )
  const checkoutCurrency = resolveCheckoutCurrency(
    searchParams.get('currency'),
    process.env.NEXT_PUBLIC_CHECKOUT_CURRENCY,
  )
  const checkoutUnitPrice = resolveCheckoutUnitPrice(
    searchParams.get('unitPrice'),
    process.env.NEXT_PUBLIC_CHECKOUT_UNIT_PRICE,
  )
  const nights = nightsBetween(searchParams.get('startDate'), searchParams.get('endDate'))

  const [pending, setPending] = React.useState(false)
  const [fxLockInfo, setFxLockInfo] = React.useState<FxLockSnapshot | null>(null)
  const [listingTitle, setListingTitle] = React.useState<string | null>(null)
  const [listingLocation, setListingLocation] = React.useState<string | null>(null)
  const [listingImage, setListingImage] = React.useState<string | null>(null)
  const [listingLoading, setListingLoading] = React.useState(Boolean(checkoutListingId))

  const [contractsOk, setContractsOk] = React.useState(false)
  const [contractBlocking, setContractBlocking] = React.useState<
    CheckoutContractAcceptancePayload['blocking_reason']
  >('loading')
  const contractRef = React.useRef<CheckoutContractAcceptancePayload>({
    ok: false,
    blocking_reason: 'loading',
    contract_accepted: false,
    general_contract_accepted: true,
    sales_contract_accepted: true,
  })
  const onContractValidity = React.useCallback((p: CheckoutContractAcceptancePayload) => {
    contractRef.current = p
    setContractsOk(p.ok)
    setContractBlocking(p.blocking_reason)
  }, [])

  const commissionPercent = Number(process.env.NEXT_PUBLIC_CHECKOUT_COMMISSION_PERCENT ?? 20)
  const prepaymentPercent = Number(process.env.NEXT_PUBLIC_CHECKOUT_PREPAYMENT_PERCENT ?? 30)
  const totalPrice = checkoutUnitPrice
  const [paymentType, setPaymentType] = React.useState<'full' | 'partial'>('partial')
  const hasCheckoutListing = Boolean(checkoutListingId)
  const [coupon, setCoupon] = React.useState<CouponPreview | null>(null)
  const couponDiscount = React.useMemo(() => {
    if (!coupon) return 0
    const n = Number(coupon.discount_amount)
    return Number.isFinite(n) ? n : 0
  }, [coupon])
  const grandTotal = Math.max(0, totalPrice - couponDiscount)

  React.useEffect(() => {
    document.documentElement.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  React.useEffect(() => {
    if (!checkoutListingId) {
      setListingLoading(false)
      return
    }
    let cancelled = false
    setListingLoading(true)
    void (async () => {
      const [vitrine, images] = await Promise.all([
        getPublicListingVitrine(checkoutListingId, locale),
        getPublicListingImages(checkoutListingId),
      ])
      if (cancelled) return
      setListingTitle(vitrine?.title?.trim() || null)
      setListingLocation(vitrine?.location_label?.trim() || null)
      const first = images?.images?.[0]
      setListingImage(
        first?.storage_key
          ? preferListingGalleryFullAsset(storageKeyToPublicUrl(first.storage_key))
          : null,
      )
      setListingLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [checkoutListingId, locale])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    const apiBase = process.env.NEXT_PUBLIC_API_URL
    const listingId = checkoutListingId

    if (apiBase && listingId) {
      setPending(true)
      try {
        const currency = checkoutCurrency
        const unitPrice =
          checkoutUnitPrice > 0
            ? checkoutUnitPrice.toFixed(2)
            : (process.env.NEXT_PUBLIC_CHECKOUT_UNIT_PRICE ?? '100.00')
        const start = toYmd(String(formObject.startDate ?? ''))
        const end = toYmd(String(formObject.endDate ?? ''))
        const email = String(formObject.guest_email ?? '').trim()
        const name = String(formObject.guest_name ?? '').trim()
        if (!start || !end || !email || !name) {
          window.alert(C.errors.datesGuestRequired)
          setPending(false)
          return
        }
        if (!contractRef.current.ok) {
          window.alert(C.errors.contractsRequired)
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
            console.warn('Coupon apply skipped:', err)
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
          /* env fallback */
        }
        if (provider === 'none' && process.env.NEXT_PUBLIC_PAYTR_CHECKOUT !== '0') {
          provider = 'paytr'
        }
        localStorage.setItem('travel_paydone_email', email)
        if (provider === 'paytr') {
          sessionStorage.setItem('travel_paytr_checkout', JSON.stringify(payload))
          router.push(vitrinHref('/checkout/paytr'))
        } else if (provider === 'paratika') {
          sessionStorage.setItem('travel_paratika_checkout', JSON.stringify(payload))
          router.push(vitrinHref('/checkout/paratika'))
        } else {
          router.push(vitrinHref(`/pay-done?code=${encodeURIComponent(out.public_code)}`))
        }
      } catch (e) {
        console.error(e)
        window.alert(e instanceof Error ? e.message : C.errors.bookingFailed)
      } finally {
        setPending(false)
      }
      return
    }

    console.log('Form submitted (API off):', formObject)
    router.push(vitrinHref('/pay-done'))
  }

  const renderSidebar = () => {
    const imageSrc = listingImage || '/uploads/external/8081091c1bed4d7ee13a.avif'
    const lineLabel =
      nights > 0 && totalPrice > 0
        ? fmtCheckout(C.sidebarNightsLine, {
            unitPrice: formatCheckoutMoney(locale, totalPrice / nights, checkoutCurrency),
            nights,
          })
        : null

    return (
      <div className="flex w-full flex-col gap-y-6 border-neutral-200 px-0 sm:gap-y-8 sm:rounded-4xl sm:p-6 lg:border xl:p-8 dark:border-neutral-700">
        <div className="flex flex-col sm:flex-row sm:items-center">
          <div className="w-full shrink-0 sm:w-40">
            <div className="aspect-w-4 overflow-hidden rounded-2xl aspect-h-3 sm:aspect-h-4">
              <Image alt="" fill sizes="200px" src={imageSrc} />
            </div>
          </div>
          <div className="flex flex-col gap-y-3 py-5 text-start sm:ps-5">
            <div>
              {listingLoading ? (
                <span className="text-sm text-neutral-500 dark:text-neutral-400">{C.sidebarLoading}</span>
              ) : (
                <>
                  {listingLocation ? (
                    <span className="line-clamp-1 text-sm text-neutral-500 dark:text-neutral-400">
                      {listingLocation}
                    </span>
                  ) : null}
                  <span className="mt-1 block text-base font-medium">
                    {listingTitle || '—'}
                  </span>
                </>
              )}
            </div>
            <Divider className="w-10!" />
            <StartRating />
          </div>
        </div>

        <Divider className="block lg:hidden" />

        {fxLockInfo && (
          <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs leading-relaxed text-neutral-600 dark:border-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-300">
            <span className="font-medium text-neutral-800 dark:text-neutral-200">{C.fxLockTitle}:</span>{' '}
            {fmtCheckout(C.fxLockBody, {
              lockedAt: fxLockInfo.locked_at,
              rates: Object.entries(fxLockInfo.rates_to_try || {})
                .map(([c, r]) => `${c}: ${r}`)
                .join(', '),
            })}
          </p>
        )}

        <DescriptionList>
          {lineLabel ? (
            <>
              <DescriptionTerm>{lineLabel}</DescriptionTerm>
              <DescriptionDetails className="sm:text-right">
                {formatCheckoutMoney(locale, totalPrice, checkoutCurrency)}
              </DescriptionDetails>
            </>
          ) : null}
          <DescriptionTerm>{C.serviceCharge}</DescriptionTerm>
          <DescriptionDetails className="sm:text-right">
            {formatCheckoutMoney(locale, 0, checkoutCurrency)}
          </DescriptionDetails>
          <DescriptionTerm>{C.fee}</DescriptionTerm>
          <DescriptionDetails className="sm:text-right">
            {formatCheckoutMoney(locale, 0, checkoutCurrency)}
          </DescriptionDetails>
          <DescriptionTerm>{C.tax}</DescriptionTerm>
          <DescriptionDetails className="sm:text-right">
            {formatCheckoutMoney(locale, 0, checkoutCurrency)}
          </DescriptionDetails>
          {coupon && couponDiscount > 0 && (
            <>
              <DescriptionTerm className="text-emerald-700">
                {fmtCheckout(C.couponLine, { code: coupon.code })}
              </DescriptionTerm>
              <DescriptionDetails className="text-emerald-700 sm:text-right">
                -{formatCheckoutMoney(locale, couponDiscount, checkoutCurrency)}
              </DescriptionDetails>
            </>
          )}
          <DescriptionTerm className="font-semibold text-neutral-900">{C.total}</DescriptionTerm>
          <DescriptionDetails className="font-semibold sm:text-right">
            {totalPrice > 0
              ? formatCheckoutMoney(locale, grandTotal, checkoutCurrency)
              : formatCheckoutMoney(locale, 57, checkoutCurrency)}
          </DescriptionDetails>
        </DescriptionList>

        <Suspense fallback={<div className="min-h-[48px]" aria-hidden />}>
          <CouponBox locale={locale} subtotal={totalPrice > 0 ? totalPrice : 0} onCouponChange={setCoupon} />
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
        <h1 className="text-3xl font-semibold lg:text-4xl">{C.title}</h1>

        {paymentFailed && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100"
          >
            {C.paymentFailedBanner}
          </div>
        )}

        <Divider />
        <Suspense fallback={<div className="min-h-[200px]" aria-hidden />}>
          <YourTrip locale={locale} />
        </Suspense>

        {prepaymentPercent > 0 && (totalPrice > 0 || hasCheckoutListing) && (
          <>
            <Divider />
            <PaymentTypeSelector
              locale={locale}
              totalPrice={totalPrice}
              commissionPercent={commissionPercent}
              prepaymentPercent={prepaymentPercent}
              currencyCode={checkoutCurrency}
              value={paymentType}
              onChange={setPaymentType}
            />
          </>
        )}

        <CheckoutContractAcceptance
          listingId={checkoutListingId || undefined}
          locale={locale}
          onValidityChange={onContractValidity}
        />
        {hasCheckoutListing && !contractsOk && contractBlocking === 'acceptance_pending' ? (
          <p
            role="status"
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
          >
            {C.errors.contractsRequired}
          </p>
        ) : null}
        {hasCheckoutListing && contractBlocking === 'listing_contract_missing' ? (
          <p
            role="status"
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
          >
            {C.errors.listingContractRequired}
          </p>
        ) : null}
        <CrossSellSuggestions triggerCategory={checkoutCrossSellTrigger} className="mt-2" />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <Label>{C.emailLabel}</Label>
            <Input className="mt-1.5" name="guest_email" type="email" required autoComplete="email" />
            <Description>{C.emailHint}</Description>
          </Field>
          <Field>
            <Label>{C.guestNameLabel}</Label>
            <Input className="mt-1.5" name="guest_name" required autoComplete="name" />
          </Field>
        </div>
        <PayWith locale={locale} />
        <div>
          <ButtonPrimary
            type="submit"
            className="mt-10 text-base/6!"
            disabled={pending || (hasCheckoutListing && !contractsOk)}
          >
            {pending ? C.processing : C.confirmPay}
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

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="container mt-10 mb-24 min-h-[40vh] animate-pulse rounded-3xl bg-neutral-100 dark:bg-neutral-800" />
      }
    >
      <CheckoutPageContent />
    </Suspense>
  )
}

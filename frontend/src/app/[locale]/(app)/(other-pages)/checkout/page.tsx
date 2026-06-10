'use client'

import CheckoutContractWizard from '@/components/checkout/CheckoutContractWizard'
import CheckoutGuestForms from '@/components/checkout/CheckoutGuestForms'
import CheckoutInvoiceForm from '@/components/checkout/CheckoutInvoiceForm'
import CheckoutCarSummary from '@/components/checkout/CheckoutCarSummary'
import CheckoutFlightSummary from '@/components/checkout/CheckoutFlightSummary'
import CheckoutListingSummary from '@/components/checkout/CheckoutListingSummary'
import CheckoutStaySummary from '@/components/checkout/CheckoutStaySummary'
import CheckoutCardPayment from '@/components/checkout/CheckoutCardPayment'
import CheckoutPaymentMethods from '@/components/checkout/CheckoutPaymentMethods'
import type { ParatikaCheckoutPayload } from '@/components/checkout/CheckoutParatikaInline'
import CheckoutReservationDetails from '@/components/checkout/CheckoutReservationDetails'
import CheckoutSection from '@/components/checkout/CheckoutSection'
import type { CheckoutContractAcceptancePayload } from '@/components/CheckoutContractAcceptance'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { checkoutT, fmtCheckout } from '@/lib/checkout-i18n'
import {
  computeCheckoutPriceBreakdown,
  resolveListingPrepaymentPercent,
} from '@/lib/checkout-price-breakdown'
import { preferListingGalleryFullAsset } from '@/lib/listing-gallery-display-url'
import { storageKeyToPublicUrl } from '@/lib/listing-gallery-hero-order'
import { parseStayBookingRulesFromPublicItem } from '@/lib/stay-booking-rules'
import {
  checkoutDateYmd,
  resolveCheckoutCurrency,
  resolveCheckoutListingId,
  resolveCheckoutUnitPrice,
  parseCheckoutGuestsFromSearchParams,
} from '@/lib/stay-checkout-url'
import {
  readTurnaFlightBookingDraft,
  type TurnaFlightBookingDraft,
} from '@/lib/turna-flight-booking'
import {
  readYolcu360CarBookingDraft,
  type Yolcu360CarBookingDraft,
} from '@/lib/yolcu360-car-booking'
import {
  addCartLine,
  applyCouponToCart,
  checkoutCart,
  createCart,
  getActivePaymentProvider,
  getPublicListingImages,
  getPublicListingVitrine,
  searchPublicListings,
  type CouponPreview,
  type FxLockSnapshot,
  type PublicListingItem,
} from '@/lib/travel-api'
import type { StayBookingRules } from '@/types/listing-types'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Form from 'next/form'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import React, { Suspense } from 'react'
import {
  checkoutMetaPayload,
  emptyGuestRow,
  invoiceFromPrimaryGuest,
  type CheckoutGuestRow,
  type CheckoutInvoice,
  type CheckoutPaymentChannel,
} from '@/lib/checkout-guest-types'
import type { GuestsObject } from '@/type'
import clsx from 'clsx'

function resolveCheckoutStayDates(
  searchParams: URLSearchParams,
  formStart?: string,
  formEnd?: string,
): { start: string; end: string } {
  const fromQueryIn = searchParams.get('checkIn')?.trim()
  const fromQueryOut = searchParams.get('checkOut')?.trim()
  if (fromQueryIn && fromQueryOut) {
    return { start: fromQueryIn, end: fromQueryOut }
  }
  const start =
    checkoutDateYmd(searchParams.get('startDate')) ||
    checkoutDateYmd(formStart) ||
    ''
  const end =
    checkoutDateYmd(searchParams.get('endDate')) ||
    checkoutDateYmd(formEnd) ||
    ''
  return { start, end }
}

function nightsBetween(startIso: string | null, endIso: string | null): number {
  const s = startIso ? new Date(startIso) : null
  const e = endIso ? new Date(endIso) : null
  if (!s || !e || Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0
  const diff = Math.round((e.getTime() - s.getTime()) / 86400000)
  return diff > 0 ? diff : 0
}

function parsePoolHeatingFeeFromQuery(
  searchParams: URLSearchParams,
  nights: number,
): number {
  if (searchParams.get('pool_heating') !== '1' || nights <= 0) return 0
  const raw = searchParams.get('poolHeatingFee')?.trim()
  if (!raw) return 0
  const n = parseFloat(raw.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

function CheckoutPageContent() {
  const router = useRouter()
  const vitrinHref = useVitrinHref()
  const params = useParams()
  const searchParams = useSearchParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const C = checkoutT(locale)
  const paymentFailed = searchParams.get('pay') === 'failed'
  const isFlightCheckout = searchParams.get('flight') === '1'
  const isCarCheckout = searchParams.get('car') === '1'
  const isLiveProductCheckout = isFlightCheckout || isCarCheckout

  const [flightDraft, setFlightDraft] = React.useState<TurnaFlightBookingDraft | null>(null)
  const [carDraft, setCarDraft] = React.useState<Yolcu360CarBookingDraft | null>(null)

  React.useEffect(() => {
    if (!isFlightCheckout) {
      setFlightDraft(null)
    } else {
      setFlightDraft(readTurnaFlightBookingDraft())
    }
    if (!isCarCheckout) {
      setCarDraft(null)
    } else {
      setCarDraft(readYolcu360CarBookingDraft())
    }
  }, [isFlightCheckout, isCarCheckout])

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
  const stayDates = React.useMemo(
    () => resolveCheckoutStayDates(searchParams),
    [searchParams],
  )
  const nights = nightsBetween(stayDates.start, stayDates.end)

  const [pending, setPending] = React.useState(false)
  const [fxLockInfo, setFxLockInfo] = React.useState<FxLockSnapshot | null>(null)
  const [listingTitle, setListingTitle] = React.useState<string | null>(null)
  const [listingLocation, setListingLocation] = React.useState<string | null>(null)
  const [listingImage, setListingImage] = React.useState<string | null>(null)
  const [listingRow, setListingRow] = React.useState<PublicListingItem | null>(null)
  const [listingLoading, setListingLoading] = React.useState(Boolean(checkoutListingId))
  const [stayBookingRules, setStayBookingRules] = React.useState<StayBookingRules | undefined>(
    undefined,
  )

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

  const envPrepaymentPercent = Number(process.env.NEXT_PUBLIC_CHECKOUT_PREPAYMENT_PERCENT ?? 30)
  const listingPrepaymentPercent = resolveListingPrepaymentPercent(
    listingRow?.prepayment_percent,
    envPrepaymentPercent,
  )

  const poolHeatingFee = parsePoolHeatingFeeFromQuery(searchParams, nights)
  const priceBreakdown = React.useMemo(
    () =>
      computeCheckoutPriceBreakdown({
        totalPrice: checkoutUnitPrice,
        nights,
        stayBookingRules,
        cleaningFeeAmount: listingRow?.cleaning_fee_amount,
        poolHeatingFee,
      }),
    [checkoutUnitPrice, nights, stayBookingRules, listingRow?.cleaning_fee_amount, poolHeatingFee],
  )

  const totalPrice = checkoutUnitPrice
  const [paymentType, setPaymentType] = React.useState<'full' | 'partial'>(
    isLiveProductCheckout ? 'full' : 'partial',
  )
  const hasCheckoutListing = Boolean(checkoutListingId)
  const [coupon, setCoupon] = React.useState<CouponPreview | null>(null)
  const couponDiscount = React.useMemo(() => {
    if (!coupon) return 0
    const n = Number(coupon.discount_amount)
    return Number.isFinite(n) ? n : 0
  }, [coupon])
  const grandTotal = Math.max(0, totalPrice - couponDiscount)

  const partialDue = Math.round(priceBreakdown.lodgingSubtotal * listingPrepaymentPercent) / 100
  const amountDueNow = paymentType === 'partial' ? partialDue : grandTotal
  const amountRemaining = Math.max(0, grandTotal - amountDueNow)

  const [stayGuests, setStayGuests] = React.useState<GuestsObject>({
    guestAdults: 2,
    guestChildren: 0,
    guestInfants: 0,
  })
  const [guestRows, setGuestRows] = React.useState<CheckoutGuestRow[]>([emptyGuestRow()])
  const [contactEmail, setContactEmail] = React.useState('')
  const [contactPhone, setContactPhone] = React.useState('')
  const [invoice, setInvoice] = React.useState<CheckoutInvoice>({
    full_name: '',
    national_id: '',
    address: '',
    city: '',
    email: '',
    phone: '',
  })
  const [invoiceTouched, setInvoiceTouched] = React.useState(false)
  const [paymentChannel, setPaymentChannel] = React.useState<CheckoutPaymentChannel>('card')
  const [paratikaPayload, setParatikaPayload] = React.useState<ParatikaCheckoutPayload | null>(null)
  const [createdPublicCode, setCreatedPublicCode] = React.useState<string | null>(null)
  const [invoiceOpen, setInvoiceOpen] = React.useState(!isLiveProductCheckout)

  React.useEffect(() => {
    if (invoiceTouched || guestRows.length === 0) return
    setInvoice(invoiceFromPrimaryGuest(guestRows[0]!, contactEmail, contactPhone))
  }, [guestRows, contactEmail, contactPhone, invoiceTouched])

  React.useEffect(() => {
    document.documentElement.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  React.useEffect(() => {
    if (!checkoutListingId) return
    setStayGuests(parseCheckoutGuestsFromSearchParams(searchParams))
  }, [checkoutListingId, searchParams])

  React.useEffect(() => {
    if (!checkoutListingId) {
      setListingLoading(false)
      return
    }
    let cancelled = false
    setListingLoading(true)
    void (async () => {
      const [vitrine, images, search] = await Promise.all([
        getPublicListingVitrine(checkoutListingId, locale),
        getPublicListingImages(checkoutListingId),
        searchPublicListings({ listingIds: [checkoutListingId], locale }, { cache: 'no-store' }),
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
      const row = search?.listings?.[0] ?? null
      setListingRow(row)
      setStayBookingRules(row ? parseStayBookingRulesFromPublicItem(row) : undefined)
      setListingLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [checkoutListingId, locale])

  const handleSubmitForm = async (formData: FormData) => {
    if (paratikaPayload) return

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
        const start = stayDates.start
        const end = stayDates.end
        const email = contactEmail.trim() || String(formObject.guest_email ?? '').trim()
        const primary = guestRows[0]
        const name =
          [primary?.first_name, primary?.last_name].filter(Boolean).join(' ').trim() ||
          String(formObject.guest_name ?? '').trim()
        if (!start || !end || !email || !name || !primary?.national_id?.trim()) {
          window.alert(C.errors.datesGuestRequired)
          setPending(false)
          return
        }
        if (!contractRef.current.ok) {
          window.alert(C.errors.contractsRequired)
          setPending(false)
          return
        }
        const turnaDraft = searchParams.get('flight') === '1' ? readTurnaFlightBookingDraft() : null
        const yolcu360Draft = searchParams.get('car') === '1' ? readYolcu360CarBookingDraft() : null
        const hotelRoomId = searchParams.get('hotelRoomId')?.trim()
        const hotelRoomName = searchParams.get('hotelRoomName')?.trim()
        const lineMeta = turnaDraft
          ? JSON.stringify({
              provider: 'turna',
              session: turnaDraft.session,
              allocate_raw: turnaDraft.allocate_raw,
              departure_date: turnaDraft.departure_date,
              offer: turnaDraft.offer ?? null,
              passengers: turnaDraft.passengers ?? null,
            })
          : yolcu360Draft
            ? JSON.stringify({
                provider: 'yolcu360',
                pickup: yolcu360Draft.pickup,
                dropoff: yolcu360Draft.dropoff,
                checkin: yolcu360Draft.checkin,
                checkout: yolcu360Draft.checkout,
                car: yolcu360Draft.car,
              })
            : hotelRoomId
              ? JSON.stringify({
                  hotel_room_id: hotelRoomId,
                  ...(hotelRoomName ? { hotel_room_name: hotelRoomName } : {}),
                })
              : undefined
        const cart = await createCart(currency)
        await addCartLine(cart.id, {
          listing_id: listingId,
          quantity: 1,
          starts_on: start,
          ends_on: end,
          unit_price: unitPrice,
          ...(lineMeta ? { meta_json: lineMeta } : {}),
        })
        setFxLockInfo(cart.fx_lock ?? null)
        if (coupon?.code) {
          try {
            await applyCouponToCart(cart.id, coupon.code)
          } catch (err) {
            console.warn('Coupon apply skipped:', err)
          }
        }
        const cx = contractRef.current
        const meta = checkoutMetaPayload(guestRows, invoice, paymentChannel)
        const out = await checkoutCart(cart.id, {
          guest_email: email,
          guest_name: name,
          guest_phone: contactPhone.trim() || undefined,
          contract_accepted: cx.contract_accepted,
          general_contract_accepted: cx.general_contract_accepted,
          sales_contract_accepted: cx.sales_contract_accepted,
          contract_locale: locale,
          payment_type: paymentType,
          payment_channel: paymentChannel,
          checkout_meta_json: JSON.stringify(meta),
          installments: 1,
        })

        const payload: ParatikaCheckoutPayload = {
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
        const flightOfferSnap = turnaDraft?.offer
        const carSnap = yolcu360Draft?.car
        sessionStorage.setItem(
          'travel_checkout_confirm',
          JSON.stringify({
            is_flight: Boolean(turnaDraft),
            is_car: Boolean(yolcu360Draft),
            flight_route: flightOfferSnap
              ? `${flightOfferSnap.origin} → ${flightOfferSnap.destination}`
              : undefined,
            flight_departure_date: turnaDraft?.departure_date,
            flight_airline: flightOfferSnap?.airlineName,
            car_title: carSnap?.title,
            car_pickup: carSnap?.pickup,
            car_checkin: carSnap?.checkin,
            car_checkout: carSnap?.checkout,
            listing_title: flightOfferSnap?.airlineName ?? carSnap?.title ?? listingTitle,
            listing_location: carSnap?.pickup ?? listingLocation,
            amount_total: grandTotal,
            amount_paid: amountDueNow,
            amount_remaining: amountRemaining,
            payment_channel: paymentChannel,
          }),
        )

        setCreatedPublicCode(out.public_code)

        if (paymentChannel === 'card' && provider === 'paratika') {
          setParatikaPayload(payload)
          setPending(false)
          return
        }

        if (paymentChannel === 'card' && provider === 'paytr') {
          sessionStorage.setItem('travel_paytr_checkout', JSON.stringify(payload))
          router.push(vitrinHref('/checkout/paytr'))
          return
        }

        router.push(vitrinHref(`/pay-done?code=${encodeURIComponent(out.public_code)}`))
      } catch (e) {
        console.error(e)
        const code = e instanceof Error ? e.message : ''
        const msg =
          code === 'insert_line_failed'
            ? C.errors.insertLineFailed
            : code === 'cart_line_schema_incomplete'
              ? C.errors.cartLineSchemaIncomplete
              : code === 'dates_required' || code === 'invalid_dates'
                ? C.errors.datesRequired
                : code === 'invalid_date_range'
                  ? C.errors.invalidDateRange
                  : code === 'hotel_room_unavailable'
                    ? C.errors.hotelRoomUnavailable
                    : code === 'listing_contract_required'
                    ? C.errors.listingContractRequired
                    : code === 'listing_unavailable_or_currency_mismatch'
                      ? C.errors.currencyMismatch
                      : code === 'cart_or_listing_not_found'
                        ? C.errors.cartOrListingNotFound
                        : code || C.errors.bookingFailed
        window.alert(msg)
        setFxLockInfo(null)
      } finally {
        setPending(false)
      }
      return
    }

    console.log('Form submitted (API off):', formObject)
    router.push(vitrinHref('/pay-done'))
  }

  const showPaymentOptions =
    !isLiveProductCheckout && listingPrepaymentPercent > 0 && (totalPrice > 0 || hasCheckoutListing)

  const flightOffer = flightDraft?.offer
  const flightPassengers = {
    adults: flightDraft?.passengers?.adults ?? stayGuests.guestAdults ?? 1,
    children: flightDraft?.passengers?.children ?? stayGuests.guestChildren ?? 0,
    infants: flightDraft?.passengers?.infants ?? stayGuests.guestInfants ?? 0,
  }

  React.useEffect(() => {
    if (!isFlightCheckout || !flightDraft?.passengers) return
    setStayGuests({
      guestAdults: flightDraft.passengers.adults ?? 1,
      guestChildren: flightDraft.passengers.children ?? 0,
      guestInfants: flightDraft.passengers.infants ?? 0,
    })
  }, [isFlightCheckout, flightDraft])

  const flightBackHref = React.useMemo(() => {
    if (!flightOffer) return vitrinHref('/ucak-bileti/all')
    const qs = new URLSearchParams({
      from: flightOffer.origin,
      to: flightOffer.destination,
      date: flightDraft?.departure_date ?? stayDates.start,
      trip: 'oneWay',
      class: 'Economy',
    })
    return vitrinHref(`/ucak-bileti/all?${qs.toString()}`)
  }, [flightOffer, flightDraft?.departure_date, stayDates.start, vitrinHref])

  const primaryGuestName = React.useMemo(() => {
    const primary = guestRows[0]
    return [primary?.first_name, primary?.last_name].filter(Boolean).join(' ').trim()
  }, [guestRows])

  const carBackHref = React.useMemo(() => {
    if (!carDraft?.car) return vitrinHref('/arac-kiralama/all')
    const qs = new URLSearchParams()
    if (carDraft.pickup) qs.set('location', carDraft.pickup)
    if (carDraft.checkin) qs.set('checkin', carDraft.checkin)
    if (carDraft.checkout) qs.set('checkout', carDraft.checkout)
    if (carDraft.dropoff && carDraft.dropoff !== carDraft.pickup) {
      qs.set('drop_off_location', carDraft.dropoff)
      qs.set('drop_off', 'different')
    }
    return vitrinHref(`/arac-kiralama/all${qs.toString() ? `?${qs.toString()}` : ''}`)
  }, [carDraft, vitrinHref])

  const pageTitle = isFlightCheckout ? C.flightTitle : isCarCheckout ? C.carTitle : C.title
  const flightCheckoutReady = isFlightCheckout && Boolean(flightOffer)
  const flightSessionMissing = isFlightCheckout && !flightOffer
  const carCheckoutReady = isCarCheckout && Boolean(carDraft?.car)
  const carSessionMissing = isCarCheckout && !carDraft?.car
  const isHolidayHomeCheckout =
    listingRow?.category_code === 'holiday_home' ||
    listingRow?.listing_vertical === 'holiday_home'
  const catalogListingCheckoutReady =
    !isLiveProductCheckout && hasCheckoutListing && !listingLoading
  const twoColumnCheckout = flightCheckoutReady || carCheckoutReady || catalogListingCheckoutReady
  const sidebarSummaryFirst = twoColumnCheckout

  return (
    <main className="container mt-10 mb-24 lg:mb-32">
      {flightSessionMissing ? (
        <div
          role="alert"
          className="mx-auto mb-8 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
        >
          <p>{C.flightSessionExpired}</p>
          <Link
            href={vitrinHref('/ucak-bileti/all')}
            className="mt-3 inline-flex text-link-muted-underline"
          >
            {C.payDone.flightSearchAgain} →
          </Link>
        </div>
      ) : null}

      {carSessionMissing ? (
        <div
          role="alert"
          className="mx-auto mb-8 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
        >
          <p>{C.carSessionExpired}</p>
          <Link href={vitrinHref('/arac-kiralama/all')} className="mt-3 inline-flex text-link-muted-underline">
            {C.carBackToSearch} →
          </Link>
        </div>
      ) : null}

      <div
        className={
          twoColumnCheckout
            ? 'mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start'
            : 'mx-auto w-full max-w-3xl'
        }
      >
        {flightSessionMissing || carSessionMissing ? null : (
        <Form
          action={handleSubmitForm}
          className={clsx(
            'flex w-full min-w-0 flex-col gap-y-10 border-neutral-200 px-0 sm:rounded-4xl sm:border sm:p-6 xl:p-8 dark:border-neutral-700',
            twoColumnCheckout && 'lg:col-start-1',
            sidebarSummaryFirst && 'max-lg:order-2',
          )}
        >
        <h1 className="text-3xl font-semibold lg:text-4xl">{pageTitle}</h1>

        {paymentFailed && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100"
          >
            {C.paymentFailedBanner}
          </div>
        )}

        {createdPublicCode ? (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100"
          >
            {fmtCheckout(C.reservationCreatedBanner, { code: createdPublicCode })}
          </div>
        ) : null}

        {stayDates.start ? <input type="hidden" name="checkIn" value={stayDates.start} /> : null}
        {stayDates.end ? <input type="hidden" name="checkOut" value={stayDates.end} /> : null}

        {flightCheckoutReady || carCheckoutReady ? null : (
          <>
            {!catalogListingCheckoutReady ? (
              <CheckoutSection step={1} title={C.sectionListingInfo}>
                <CheckoutListingSummary
                  locale={locale}
                  loading={listingLoading}
                  title={listingTitle}
                  location={listingLocation}
                  imageUrl={listingImage}
                  maxGuests={listingRow?.max_guests}
                  roomCount={listingRow?.room_count ?? listingRow?.bed_count}
                  bathCount={listingRow?.bath_count}
                />
              </CheckoutSection>
            ) : null}

            <CheckoutSection
              step={catalogListingCheckoutReady ? 1 : 2}
              title={C.sectionReservation}
            >
              <CheckoutReservationDetails
                locale={locale}
                currencyCode={checkoutCurrency}
                breakdown={priceBreakdown}
                grandTotal={grandTotal > 0 ? grandTotal : totalPrice}
                couponCode={coupon?.code}
                couponDiscount={couponDiscount}
                prepaymentPercent={listingPrepaymentPercent}
                paymentType={paymentType}
                onPaymentTypeChange={setPaymentType}
                amountDueNow={amountDueNow}
                amountRemaining={amountRemaining}
                onGuestsChange={setStayGuests}
                stayDates={stayDates}
                showPaymentOptions={showPaymentOptions}
                fxLockInfo={fxLockInfo}
                hideAmountSummary={catalogListingCheckoutReady}
              />
            </CheckoutSection>
          </>
        )}

        <CheckoutSection
          step={isLiveProductCheckout ? 1 : catalogListingCheckoutReady ? 2 : 3}
          title={isFlightCheckout ? C.sectionPassengers : C.sectionGuestInfo}
        >
          <CheckoutGuestForms
            locale={locale}
            guests={stayGuests}
            contactEmail={contactEmail}
            contactPhone={contactPhone}
            onContactEmailChange={setContactEmail}
            onContactPhoneChange={setContactPhone}
            rows={guestRows}
            onRowsChange={setGuestRows}
            formsHint={isFlightCheckout ? C.passengerFormsHint : undefined}
            personPrimaryLabel={isFlightCheckout ? C.passengerPrimaryLabel : undefined}
            personLabel={isFlightCheckout ? C.passengerLabel : undefined}
          />

          <div className="border-t border-neutral-200 pt-6 dark:border-neutral-700">
            {isLiveProductCheckout ? (
              <button
                type="button"
                onClick={() => setInvoiceOpen((v) => !v)}
                className="mb-4 text-sm text-link-muted-underline"
              >
                {invoiceOpen ? C.invoiceToggleHide : C.invoiceToggleShow}
              </button>
            ) : (
              <h3 className="mb-4 text-base font-semibold text-neutral-800 dark:text-neutral-100">
                {C.sectionInvoice}
              </h3>
            )}
            {(!isLiveProductCheckout || invoiceOpen) ? (
              <CheckoutInvoiceForm
                locale={locale}
                invoice={invoice}
                onChange={(inv) => {
                  setInvoiceTouched(true)
                  setInvoice(inv)
                }}
                autoFilled={!invoiceTouched}
              />
            ) : null}
          </div>
        </CheckoutSection>

        <CheckoutSection
          step={isLiveProductCheckout ? 2 : catalogListingCheckoutReady ? 3 : 4}
          title={C.sectionPayment}
        >
          <CheckoutPaymentMethods
            locale={locale}
            value={paymentChannel}
            onChange={setPaymentChannel}
            subtotal={totalPrice > 0 ? totalPrice : 0}
            onCouponChange={setCoupon}
          />

          {paymentChannel === 'card' ? (
            <CheckoutCardPayment
              locale={locale}
              paratikaPayload={paratikaPayload}
              defaultCardOwner={primaryGuestName}
            />
          ) : null}

          <CheckoutContractWizard
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

          {!paratikaPayload ? (
            <div>
              <ButtonPrimary
                type="submit"
                className="text-base/6!"
                disabled={pending || (hasCheckoutListing && !contractsOk)}
              >
                {pending
                  ? C.processing
                  : isFlightCheckout
                    ? C.confirmPayFlight
                    : isCarCheckout
                      ? C.confirmPayCar
                      : C.confirmPay}
              </ButtonPrimary>
            </div>
          ) : null}
        </CheckoutSection>
      </Form>
        )}

        {flightCheckoutReady ? (
          <aside className="min-w-0 max-lg:order-1 lg:sticky lg:top-24 lg:col-start-2 lg:self-start">
            <CheckoutFlightSummary
              locale={locale}
              offer={flightOffer!}
              departureDate={flightDraft?.departure_date ?? stayDates.start}
              currencyCode={checkoutCurrency}
              totalPrice={grandTotal > 0 ? grandTotal : totalPrice}
              passengers={flightPassengers}
              couponCode={coupon?.code}
              couponDiscount={couponDiscount}
              backHref={flightBackHref}
            />
          </aside>
        ) : null}

        {carCheckoutReady ? (
          <aside className="min-w-0 max-lg:order-1 lg:sticky lg:top-24 lg:col-start-2 lg:self-start">
            <CheckoutCarSummary
              locale={locale}
              car={carDraft!.car}
              currencyCode={checkoutCurrency}
              totalPrice={grandTotal > 0 ? grandTotal : totalPrice}
              couponCode={coupon?.code}
              couponDiscount={couponDiscount}
              backHref={carBackHref}
            />
          </aside>
        ) : null}

        {catalogListingCheckoutReady ? (
          <aside className="min-w-0 max-lg:order-1 lg:sticky lg:top-24 lg:col-start-2 lg:self-start">
            <CheckoutStaySummary
              locale={locale}
              loading={listingLoading}
              title={listingTitle}
              location={listingLocation}
              imageUrl={listingImage}
              maxGuests={listingRow?.max_guests}
              roomCount={listingRow?.room_count ?? listingRow?.bed_count}
              bathCount={listingRow?.bath_count}
              stayDates={stayDates}
              currencyCode={checkoutCurrency}
              breakdown={priceBreakdown}
              grandTotal={grandTotal > 0 ? grandTotal : totalPrice}
              couponCode={coupon?.code}
              couponDiscount={couponDiscount}
              amountDueNow={amountDueNow}
              amountRemaining={amountRemaining}
              showAmountSplit={showPaymentOptions}
              isHolidayHome={isHolidayHomeCheckout}
            />
          </aside>
        ) : null}
      </div>

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

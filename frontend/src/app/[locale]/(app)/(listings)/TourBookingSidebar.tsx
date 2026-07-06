'use client'

import WhatsAppListingCTA from '@/components/WhatsAppListingCTA'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { getSitePublicConfig, mergeBrandingIntoEnvContact } from '@/lib/site-public-config'
import { getSitePublicConfig as fetchSitePublicConfig } from '@/lib/travel-api'
import { isTourPeriodBookable, isTourPeriodOnlineCheckout } from '@/lib/tour-periods'
import { DEFAULT_GUESTS_EXPERIENCE, totalGuestCount } from '@/lib/guest-search-defaults'
import type { GuestsObject } from '@/type'
import { buildListingCheckoutUrl } from '@/lib/stay-checkout-url'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import GuestsInputPopover from './components/GuestsInputPopover'
import TourPeriodSelect from './components/TourPeriodSelect'
import { useTourPeriodSelection } from './TourPeriodContext'
import {
  useConvertedListingPrice,
  useCheckoutPaymentAmount,
  useFormatMoneyInPreferredCurrency,
} from '@/contexts/preferred-currency-context'

function formatPeriodLabel(start?: string, end?: string, locale = 'tr'): string {
  if (!start) return ''
  const fmt = (iso: string) => {
    const d = new Date(`${iso}T12:00:00`)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString(locale.startsWith('en') ? 'en-GB' : 'tr-TR')
  }
  if (end && end !== start) return `${fmt(start)} – ${fmt(end)}`
  return fmt(start)
}

export default function TourBookingSidebar({
  listingId,
  listingTitle,
  listingUrl,
  fallbackPrice,
  fallbackPriceAmount,
  fallbackPriceCurrency,
  prepaymentPercent,
  showReferencePrice = false,
  quoteOnly = false,
  locale = 'tr',
}: {
  listingId: string
  listingTitle?: string
  listingUrl?: string
  fallbackPrice?: string
  fallbackPriceAmount?: number
  fallbackPriceCurrency?: string
  prepaymentPercent?: string | number | null
  /** Gezinomi katalog — çift kişilik başlangıç fiyatı etiketi */
  showReferencePrice?: boolean
  /** Tarihler seçilebilir; online checkout yok (talep / WhatsApp) */
  quoteOnly?: boolean
  locale?: string
}) {
  const { options, selected, setSelected } = useTourPeriodSelection()
  const m = getMessages(locale)
  const td = m.listing.tourDetail
  const router = useRouter()
  const vitrinHref = useVitrinHref()
  const [guests, setGuests] = useState<GuestsObject>(DEFAULT_GUESTS_EXPERIENCE)
  const [wa, setWa] = useState(() => getSitePublicConfig().whatsappE164)

  useEffect(() => {
    let c = false
    void fetchSitePublicConfig(undefined)
      .then((pub) => {
        if (!c) setWa(mergeBrandingIntoEnvContact(getSitePublicConfig(), pub.branding).whatsappE164)
      })
      .catch(() => {})
    return () => {
      c = true
    }
  }, [])

  const bookable = isTourPeriodBookable(selected)
  const onlineCheckout = isTourPeriodOnlineCheckout(selected)
  const anyBookable = options.some((p) => p.bookable !== false)
  const guestCount = Math.max(1, totalGuestCount(guests))
  const fallbackAmount =
    fallbackPriceAmount != null && Number.isFinite(fallbackPriceAmount) && fallbackPriceAmount > 0
      ? fallbackPriceAmount
      : null
  const personPrice = selected?.price ?? fallbackAmount
  const periodCurrency = (selected?.currencyCode || fallbackPriceCurrency || 'TRY').trim().toUpperCase()
  const unitTotal =
    bookable && personPrice != null && Number.isFinite(personPrice) ? personPrice * guestCount : 0

  const convertedFallback = useConvertedListingPrice(
    fallbackPrice,
    fallbackPriceAmount,
    fallbackPriceCurrency,
  )
  const convertedPeriodPrice = useFormatMoneyInPreferredCurrency(personPrice, periodCurrency)
  const convertedUnitTotal = useFormatMoneyInPreferredCurrency(unitTotal, periodCurrency)
  const checkoutPayment = useCheckoutPaymentAmount(
    selected?.currencyCode || fallbackPriceCurrency || 'TRY',
    unitTotal,
  )

  const showRef = showReferencePrice && !anyBookable && fallbackAmount != null
  const displayPrice =
    bookable && personPrice != null
      ? convertedPeriodPrice
      : showRef || fallbackAmount != null
        ? convertedFallback
        : '—'

  const canCheckout =
    Boolean(listingId.trim()) &&
    onlineCheckout &&
    selected?.startDate &&
    selected?.endDate &&
    unitTotal > 0

  const canQuoteRequest =
    quoteOnly &&
    anyBookable &&
    Boolean(listingTitle?.trim()) &&
    Boolean(selected?.startDate) &&
    Boolean(wa)

  const prepaymentNum = prepaymentPercent != null ? Number(String(prepaymentPercent).replace(',', '.')) : NaN
  const prepaymentLine =
    Number.isFinite(prepaymentNum) && prepaymentNum > 0 && prepaymentNum < 100
      ? interpolate(td.prepaymentHint, { percent: String(Math.round(prepaymentNum)) })
      : null

  function goCheckout() {
    if (!canCheckout || !selected?.startDate || !selected?.endDate) return
    const start = new Date(`${selected.startDate}T12:00:00`)
    const end = new Date(`${selected.endDate}T12:00:00`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return
    router.push(
      buildListingCheckoutUrl(vitrinHref('/checkout'), {
        listingId,
        startDate: start,
        endDate: end,
        currencyCode: checkoutPayment.currencyCode,
        unitPrice: checkoutPayment.unitPrice,
        guests,
        extra: { tour_period_id: selected.id },
      }),
    )
  }

  function goQuoteRequest() {
    if (!canQuoteRequest || !listingTitle || !wa) return
    const periodLabel = formatPeriodLabel(selected?.startDate, selected?.endDate, locale)
    const lines = [
      `Merhaba, "${listingTitle}" için rezervasyon talebi oluşturmak istiyorum.`,
      periodLabel ? `Dönem: ${periodLabel}` : '',
      `Misafir: ${guestCount}`,
    ].filter(Boolean)
    if (listingUrl) lines.push(listingUrl)
    const href = `https://wa.me/${wa}?text=${encodeURIComponent(lines.join('\n'))}`
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  function onReserve() {
    if (onlineCheckout) goCheckout()
    else if (quoteOnly) goQuoteRequest()
  }

  const reserveEnabled = canCheckout || canQuoteRequest
  const showSecondaryWhatsApp = onlineCheckout && listingTitle

  return (
    <div id="tour-reservation-card" className="listingSection__wrap scroll-mt-28 sm:shadow-xl">
      <div>
        {showRef ? (
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            {td.referencePriceLabel}
          </p>
        ) : null}
        <span className="text-3xl font-semibold">
          {displayPrice !== '—' ? displayPrice : '—'}
          <span className="ml-1 text-base font-normal text-neutral-500 dark:text-neutral-400">
            {bookable || showRef ? td.pricePerPerson : ''}
          </span>
        </span>
        {showRef ? (
          <p className="mt-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            {td.referencePriceHint}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col rounded-3xl border border-neutral-200 dark:border-neutral-700">
        <TourPeriodSelect
          className="z-11 flex-1"
          periods={options}
          selectedId={selected?.id}
          onChange={setSelected}
          locale={locale}
        />
        <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />
        <GuestsInputPopover
          className="flex-1"
          guestDefaults={DEFAULT_GUESTS_EXPERIENCE}
          value={guests}
          onChange={setGuests}
        />
      </div>

      {bookable && unitTotal > 0 ? (
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
          {td.pricePerPerson}: {convertedUnitTotal} ({guestCount} {m.HeroSearchForm.Guests.toLowerCase()})
        </p>
      ) : null}

      {!anyBookable ? (
        <p className="mt-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          {td.salesClosedNote}
        </p>
      ) : quoteOnly ? (
        <p className="mt-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          {td.quoteRequestNote}
        </p>
      ) : null}

      {prepaymentLine ? (
        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">{prepaymentLine}</p>
      ) : null}

      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{td.installmentHint}</p>

      {anyBookable ? (
        <ButtonPrimary
          type="button"
          className="mt-4 w-full"
          disabled={!reserveEnabled}
          onClick={onReserve}
        >
          {m.common.Reserve}
        </ButtonPrimary>
      ) : (
        <ButtonPrimary type="button" disabled className="mt-4 w-full cursor-not-allowed opacity-60">
          {td.salesClosed}
        </ButtonPrimary>
      )}

      {showSecondaryWhatsApp ? (
        <div className="mt-3">
          <WhatsAppListingCTA listingTitle={listingTitle!} listingUrl={listingUrl} />
        </div>
      ) : null}
    </div>
  )
}

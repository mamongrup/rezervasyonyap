'use client'

import { CrossSellSuggestions } from '@/components/CrossSellSuggestions'
import { CHECKOUT_LISTING_FALLBACK_IMAGE } from '@/lib/checkout-listing-fallback-image'
import { checkoutT, fmtCheckout, formatCheckoutDate, formatCheckoutMoney } from '@/lib/checkout-i18n'
import type { CheckoutPriceBreakdown } from '@/lib/checkout-price-breakdown'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import clsx from 'clsx'
import Image from 'next/image'

type Props = {
  locale: string
  loading: boolean
  title: string | null
  location: string | null
  imageUrl: string | null
  maxGuests?: string | null
  roomCount?: string | null
  bathCount?: string | null
  stayDates: { start: string; end: string }
  currencyCode: string
  breakdown: CheckoutPriceBreakdown
  grandTotal: number
  couponCode?: string | null
  couponDiscount?: number
  amountDueNow: number
  amountRemaining: number
  showAmountSplit: boolean
  isHolidayHome: boolean
  className?: string
}

function parsePositiveInt(raw: string | null | undefined): number | undefined {
  if (!raw?.trim()) return undefined
  const n = parseInt(raw.trim(), 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export default function CheckoutStaySummary({
  locale,
  loading,
  title,
  location,
  imageUrl,
  maxGuests,
  roomCount,
  bathCount,
  stayDates,
  currencyCode,
  breakdown,
  grandTotal,
  couponCode,
  couponDiscount = 0,
  amountDueNow,
  amountRemaining,
  showAmountSplit,
  isHolidayHome,
  className,
}: Props) {
  const C = checkoutT(locale)
  const listingMessages = getMessages(locale).listing
  const imageSrc = imageUrl || CHECKOUT_LISTING_FALLBACK_IMAGE

  const guests = parsePositiveInt(maxGuests ?? undefined)
  const rooms = parsePositiveInt(roomCount ?? undefined)
  const baths = parsePositiveInt(bathCount ?? undefined)

  const metaParts: string[] = []
  if (guests != null) metaParts.push(fmtCheckout(C.listingMetaGuests, { count: guests }))
  if (rooms != null) metaParts.push(fmtCheckout(C.listingMetaRooms, { count: rooms }))
  if (baths != null) metaParts.push(fmtCheckout(C.listingMetaBaths, { count: baths }))
  const metaLine = metaParts.join(' · ')

  const dateLine =
    stayDates.start && stayDates.end
      ? `${formatCheckoutDate(locale, stayDates.start)} — ${formatCheckoutDate(locale, stayDates.end)}`
      : null

  const nightsWord = listingMessages.sidebar.nightsWord
  const lodgingLine =
    breakdown.nights > 0
      ? `${C.lodgingLine} × ${breakdown.nights} ${nightsWord}`
      : C.lodgingLine

  return (
    <div className={clsx('space-y-5', className)}>
      <div
        className={clsx(
          'listingSection__wrap sm:shadow-xl',
          'rounded-3xl border border-neutral-200/90 bg-white p-5 ring-1 ring-black/5 dark:border-neutral-600 dark:bg-neutral-900 dark:ring-white/10 sm:p-6',
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="w-full shrink-0 sm:w-36">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 144px"
                src={imageSrc}
                className="object-cover"
              />
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            {loading ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{C.sidebarLoading}</p>
            ) : (
              <>
                {location ? (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{location}</p>
                ) : null}
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {title || '—'}
                </h3>
                {metaLine ? (
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">{metaLine}</p>
                ) : null}
              </>
            )}
          </div>
        </div>

        {dateLine ? (
          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
            {dateLine}
            {breakdown.nights > 0 ? (
              <span className="text-neutral-500">
                {' '}
                ({breakdown.nights} {nightsWord})
              </span>
            ) : null}
          </p>
        ) : null}

        <div className="mt-4 space-y-3 rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800/50">
          <DescriptionList>
            <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
              {lodgingLine}
            </DescriptionTerm>
            <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
              {breakdown.lodgingSubtotal > 0
                ? formatCheckoutMoney(locale, breakdown.lodgingSubtotal, currencyCode)
                : '—'}
            </DescriptionDetails>
            {breakdown.poolHeatingFee > 0 ? (
              <>
                <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                  {C.poolHeatingFee}
                </DescriptionTerm>
                <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
                  {formatCheckoutMoney(locale, breakdown.poolHeatingFee, currencyCode)}
                </DescriptionDetails>
              </>
            ) : null}
            {breakdown.shortStayFee > 0 ? (
              <>
                <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                  {C.shortStayFee}
                </DescriptionTerm>
                <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
                  {formatCheckoutMoney(locale, breakdown.shortStayFee, currencyCode)}
                </DescriptionDetails>
              </>
            ) : null}
            {breakdown.cleaningFee > 0 ? (
              <>
                <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                  {listingMessages.sidebar.cleaningFee}
                </DescriptionTerm>
                <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
                  {formatCheckoutMoney(locale, breakdown.cleaningFee, currencyCode)}
                </DescriptionDetails>
              </>
            ) : null}
            {couponDiscount > 0 ? (
              <>
                <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                  {couponCode?.trim()
                    ? fmtCheckout(C.couponLine, { code: couponCode.trim() })
                    : C.couponLine.replace(/\(\{code\}\)/, '').trim()}
                </DescriptionTerm>
                <DescriptionDetails className="text-sm text-emerald-700 sm:text-right dark:text-emerald-300">
                  −{formatCheckoutMoney(locale, couponDiscount, currencyCode)}
                </DescriptionDetails>
              </>
            ) : null}
          </DescriptionList>
          <Divider />
          <DescriptionList>
            <DescriptionTerm className="font-semibold text-neutral-900 dark:text-white">
              {C.total}
            </DescriptionTerm>
            <DescriptionDetails className="font-semibold text-neutral-900 sm:text-right dark:text-white">
              {grandTotal > 0 ? formatCheckoutMoney(locale, grandTotal, currencyCode) : '—'}
            </DescriptionDetails>
          </DescriptionList>
        </div>

        {showAmountSplit && grandTotal > 0 ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-neutral-200 bg-white/80 p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
            <div>
              <p className="text-xs text-neutral-500">{C.amountDueNowLabel}</p>
              <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {formatCheckoutMoney(locale, amountDueNow, currencyCode)}
              </p>
            </div>
            {amountRemaining > 0 ? (
              <div>
                <p className="text-xs text-neutral-500">{C.amountRemainingLabel}</p>
                <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {formatCheckoutMoney(locale, amountRemaining, currencyCode)}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {isHolidayHome ? (
          <ul className="mt-4 list-disc space-y-1.5 ps-5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
            <li>{listingMessages.sidebar.reservationPaymentNoteDeposit}</li>
            <li>{listingMessages.sidebar.reservationPaymentNoteExtras}</li>
          </ul>
        ) : null}
      </div>

      {isHolidayHome ? (
        <CrossSellSuggestions
          triggerCategory="holiday_home"
          title={C.crossSellOtherProducts}
          className="[&_ul]:grid-cols-1"
        />
      ) : null}
    </div>
  )
}

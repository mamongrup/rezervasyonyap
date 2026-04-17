'use client'

import { useStayListingQuote, type PoolHeatingOption } from '@/hooks/use-stay-listing-quote'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { intlDateLocaleTag } from '@/lib/i18n-config'
import type { MealPlanItem } from '@/lib/travel-api'
import type { StayBookingRules } from '@/types/listing-types'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonClose from '@/shared/ButtonClose'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import { CloseButton, Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function StayListingBookingQuoteModal({
  locale,
  open,
  onClose,
  rangeStart,
  rangeEnd,
  mealPlans,
  price,
  priceAmount,
  priceCurrency,
  saleOff,
  discountPercent,
  poolHeating,
  stayBookingRules,
  isHolidayHome = false,
}: {
  locale: string
  open: boolean
  onClose: () => void
  rangeStart: Date
  rangeEnd: Date
  mealPlans: MealPlanItem[]
  price: string
  priceAmount: number | undefined
  priceCurrency: string | undefined
  saleOff: string | null | undefined
  discountPercent: number | null | undefined
  poolHeating: PoolHeatingOption
  stayBookingRules?: StayBookingRules
  /** Tatil evi — depozito / ek ücret ödeme notları */
  isHolidayHome?: boolean
}) {
  const router = useRouter()
  const vitrinHref = useVitrinHref()
  const messages = getMessages(locale)
  const copy = messages.listing.availabilityCalendar
  const rangeLocale = intlDateLocaleTag(locale)
  const [poolHeatingSelected, setPoolHeatingSelected] = useState(false)

  const {
    nights,
    lodgingSubtotal,
    heatingSubtotal,
    serviceFee,
    grandTotal,
    unitForBreakdownLine,
    formatConverted,
    currencyCode,
    poolHeatingCurrency,
    shortStayFeeApplied,
  } = useStayListingQuote({
    mealPlans,
    price,
    priceAmount,
    priceCurrency,
    saleOff,
    discountPercent,
    rangeStart,
    rangeEnd,
    poolHeating,
    poolHeatingSelected,
    minShortStayNights: stayBookingRules?.minShortStayNights,
    shortStayFeeAmount: stayBookingRules?.shortStayFeeAmount,
  })

  const goCheckout = () => {
    const u = new URLSearchParams()
    u.set('startDate', rangeStart.toISOString())
    u.set('endDate', rangeEnd.toISOString())
    router.push(`${vitrinHref('/checkout')}?${u.toString()}`)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[70]">
      <DialogBackdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 transition data-closed:scale-95 data-closed:opacity-0 dark:bg-neutral-900 dark:ring-white/10"
        >
          <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
            <h2 className="pe-8 text-lg font-semibold text-neutral-900 dark:text-white">{copy.bookingModalTitle}</h2>
            <CloseButton as={ButtonClose} className="shrink-0">
              <span className="sr-only">{copy.bookingModalClose}</span>
            </CloseButton>
          </div>
          <div className="max-h-[min(70vh,520px)] overflow-y-auto px-5 py-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {rangeStart.toLocaleDateString(rangeLocale, { dateStyle: 'medium' })} —{' '}
              {rangeEnd.toLocaleDateString(rangeLocale, { dateStyle: 'medium' })}{' '}
              <span className="text-neutral-500">
                ({nights} {messages.listing.sidebar.nightsWord})
              </span>
            </p>

            {poolHeating ? (
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-200 p-3 dark:border-neutral-700">
                <input
                  type="checkbox"
                  checked={poolHeatingSelected}
                  onChange={(e) => setPoolHeatingSelected(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-neutral-300 text-primary-600 dark:border-neutral-600"
                />
                <span className="min-w-0 text-sm">
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {messages.listing.sidebar.poolHeatingAddOn}
                  </span>
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    {formatConverted(poolHeating.dailyAmount, poolHeatingCurrency)}{' '}
                    {messages.listing.sidebar.perNight}
                  </span>
                </span>
              </label>
            ) : null}

            <div className="mt-4 space-y-3 rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800/50">
              <DescriptionList>
                <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                  {unitForBreakdownLine} × {nights} {messages.listing.sidebar.nightsWord}
                </DescriptionTerm>
                <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
                  {lodgingSubtotal > 0 ? formatConverted(lodgingSubtotal, currencyCode) : '—'}
                </DescriptionDetails>
                {poolHeating && poolHeatingSelected && heatingSubtotal > 0 ? (
                  <>
                    <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                      {messages.listing.poolInfo.heatingFee}
                    </DescriptionTerm>
                    <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
                      {formatConverted(heatingSubtotal, poolHeatingCurrency)}
                    </DescriptionDetails>
                  </>
                ) : null}
                {shortStayFeeApplied > 0 ? (
                  <>
                    <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                      {messages.listing.sidebar.shortStayFee}
                    </DescriptionTerm>
                    <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
                      {formatConverted(shortStayFeeApplied, currencyCode)}
                    </DescriptionDetails>
                  </>
                ) : null}
                <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                  {messages.listing.sidebar.serviceFee}
                </DescriptionTerm>
                <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
                  {serviceFee > 0 ? formatConverted(serviceFee, currencyCode) : '—'}
                </DescriptionDetails>
              </DescriptionList>
              <Divider />
              <DescriptionList>
                <DescriptionTerm className="font-semibold text-neutral-900 dark:text-white">
                  {messages.listing.sidebar.total}
                </DescriptionTerm>
                <DescriptionDetails className="font-semibold text-neutral-900 sm:text-right dark:text-white">
                  {grandTotal > 0 ? formatConverted(grandTotal, currencyCode) : '—'}
                </DescriptionDetails>
              </DescriptionList>
            </div>

            {isHolidayHome ? (
              <ul className="mt-4 list-disc space-y-1.5 ps-5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                <li>{messages.listing.sidebar.reservationPaymentNoteDeposit}</li>
                <li>{messages.listing.sidebar.reservationPaymentNoteExtras}</li>
              </ul>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 border-t border-neutral-200 bg-neutral-50/80 px-5 py-4 dark:border-neutral-700 dark:bg-neutral-900/50">
            <ButtonPrimary type="button" className="w-full" onClick={goCheckout}>
              {copy.bookingModalContinue}
            </ButtonPrimary>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              {copy.bookingModalClose}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

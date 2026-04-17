'use client'

import DatesRangeInputPopover from '@/app/[locale]/(app)/(listings)/components/DatesRangeInputPopover'
import GuestsInputPopover from '@/app/[locale]/(app)/(listings)/components/GuestsInputPopover'
import { useStayListingQuote } from '@/hooks/use-stay-listing-quote'
import { defaultStayDateRange } from '@/lib/stay-booking-rules'
import type { MealPlanItem } from '@/lib/travel-api'
import type { StayBookingRules } from '@/types/listing-types'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import clsx from 'clsx'
import Form from 'next/form'
import { useRef, useState } from 'react'

export type StayListingReservationCardProps = {
  locale: string
  isHolidayHome: boolean
  mealPlans: MealPlanItem[]
  price: string
  priceAmount: number | undefined
  priceCurrency: string | undefined
  saleOff: string | null | undefined
  discountPercent: number | null | undefined
  handleSubmitForm: (formData: FormData) => Promise<void>
  whatsappNumber: string | null | undefined
  title: string
  /** Tatil evi — ısıtmalı havuz günlük ücreti (havuz bilgisinden); tutar ilan para birimindedir */
  poolHeating?: { dailyAmount: number; feeSummary: string; currencyCode: string } | null
  stayBookingRules?: StayBookingRules
}

export default function StayListingReservationCard({
  locale,
  isHolidayHome,
  mealPlans,
  price,
  priceAmount,
  priceCurrency,
  saleOff,
  discountPercent,
  handleSubmitForm,
  whatsappNumber,
  title,
  poolHeating = null,
  stayBookingRules,
}: StayListingReservationCardProps) {
  const messages = getMessages(locale)

  const initialRangeRef = useRef(defaultStayDateRange(stayBookingRules))
  const [rangeStart, setRangeStart] = useState<Date | null>(() => initialRangeRef.current[0])
  const [rangeEnd, setRangeEnd] = useState<Date | null>(() => initialRangeRef.current[1])
  const [poolHeatingSelected, setPoolHeatingSelected] = useState(false)

  const onRangeChange = (dates: [Date | null, Date | null]) => {
    const [s, e] = dates
    setRangeStart(s)
    setRangeEnd(e)
  }

  const {
    nights,
    activePlans,
    cheapestPlan,
    currencyCode,
    poolHeatingCurrency,
    showDiscountRow,
    originalPriceNum,
    basePriceNum,
    discountPct,
    displayMainPrice,
    lodgingSubtotal,
    heatingSubtotal,
    serviceFee,
    grandTotal,
    unitForBreakdownLine,
    formatConverted,
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

  const hasMultiplePlans = activePlans.length > 1
  const hasMealPlan = activePlans.some((p) => p.plan_code !== 'room_only')

  return (
    <div
      className={clsx(
        'listingSection__wrap sm:shadow-xl',
        isHolidayHome &&
          'rounded-3xl border border-neutral-200/90 bg-white p-5 shadow-2xl ring-1 ring-black/5 dark:border-neutral-600 dark:bg-neutral-900 dark:ring-white/10 sm:p-6',
      )}
    >
      <div className="flex flex-col gap-2">
        <div
          className={clsx(
            'flex flex-wrap gap-x-3 gap-y-1',
            showDiscountRow &&
              originalPriceNum != null &&
              Number.isFinite(originalPriceNum) &&
              originalPriceNum > basePriceNum
              ? 'items-end'
              : 'items-baseline',
          )}
        >
          {showDiscountRow &&
          originalPriceNum != null &&
          Number.isFinite(originalPriceNum) &&
          originalPriceNum > basePriceNum ? (
            <div className="flex min-w-0 flex-col gap-1">
              {discountPct != null ? (
                <span className="inline-flex w-fit items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold leading-none text-red-700 dark:bg-red-950/50 dark:text-red-300">
                  {messages.listing.sidebar.discountBadge.replace('{percent}', String(discountPct))}
                </span>
              ) : null}
              <span className="text-sm font-medium tabular-nums leading-none line-through text-neutral-400 sm:text-base dark:text-neutral-500">
                {formatConverted(originalPriceNum, currencyCode)}
              </span>
            </div>
          ) : null}
          <span className="text-2xl font-semibold leading-none text-neutral-900 sm:text-3xl dark:text-neutral-100">
            {displayMainPrice}
          </span>
          <span className="text-base font-normal leading-none text-neutral-500 dark:text-neutral-400">
            {messages.listing.sidebar.perNight}
          </span>
        </div>
        {cheapestPlan && (
          <div className="flex flex-wrap gap-1.5">
            {hasMultiplePlans && (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                {messages.listing.sidebar.mealPlanFromMany.replace('{count}', String(activePlans.length))}
              </span>
            )}
            {!hasMultiplePlans && hasMealPlan && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                {messages.listing.sidebar.mealPlanMealsIncluded}
              </span>
            )}
            {!hasMultiplePlans && !hasMealPlan && (
              <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                {messages.listing.sidebar.mealPlanRoomOnly}
              </span>
            )}
          </div>
        )}
      </div>

      <Form
        action={handleSubmitForm}
        className="mt-2 flex flex-col overflow-visible rounded-2xl border border-neutral-200 dark:border-neutral-700"
        id="booking-form"
      >
        <DatesRangeInputPopover
          className="flex-1"
          locale={locale}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onRangeChange={onRangeChange}
          bookingRules={stayBookingRules}
        />
        <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />
        <GuestsInputPopover className="flex-1" />
        {poolHeating ? (
          <>
            <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />
            <div className="px-4 py-3">
              <input type="hidden" name="pool_heating" value={poolHeatingSelected ? '1' : '0'} />
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={poolHeatingSelected}
                  onChange={(e) => setPoolHeatingSelected(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {messages.listing.sidebar.poolHeatingAddOn}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                    {formatConverted(poolHeating.dailyAmount, poolHeatingCurrency)}{' '}
                    {messages.listing.sidebar.perNight}
                  </span>
                </span>
              </label>
            </div>
          </>
        ) : null}
      </Form>

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

      <ButtonPrimary form="booking-form" type="submit" className="mt-4 w-full">
        {messages.common.Reserve}
      </ButtonPrimary>

      {whatsappNumber && (
        <a
          href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Merhaba, "${title}" ilanı hakkında bilgi almak istiyorum.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#25D366] py-3 text-sm font-medium text-[#25D366] transition-colors hover:bg-[#25D366] hover:text-white"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          WhatsApp ile İletişim
        </a>
      )}

      <p className="mt-3 text-center text-xs text-neutral-500 dark:text-neutral-500">
        {messages.listing.sidebar.reservationNoFeeNote}
      </p>
    </div>
  )
}

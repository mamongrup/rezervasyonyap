'use client'

import DatesRangeInputPopover from '@/app/[locale]/(app)/(listings)/components/DatesRangeInputPopover'
import GuestsInputPopover from '@/app/[locale]/(app)/(listings)/components/GuestsInputPopover'
import ListingInstantApprovalTitleBadge from '@/components/listing/ListingInstantApprovalTitleBadge'
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
import { useState } from 'react'

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
  /** Tatil evi — ısıtmalı havuz günlük ücreti (havuz bilgisinden); tutar ilan para birimindedir */
  poolHeating?: { dailyAmount: number; feeSummary: string; currencyCode: string } | null
  stayBookingRules?: StayBookingRules
  /** `listings.cleaning_fee_amount` — konaklama başına tek sefer */
  cleaningFeeAmount?: number
  /** Anında Onay rozeti — fiyat satırıyla aynı hizada sağda */
  listingId?: string
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
  poolHeating = null,
  stayBookingRules,
  cleaningFeeAmount,
  listingId,
}: StayListingReservationCardProps) {
  const messages = getMessages(locale)

  const [rangeStart, setRangeStart] = useState<Date | null>(() =>
    defaultStayDateRange(stayBookingRules)[0],
  )
  const [rangeEnd, setRangeEnd] = useState<Date | null>(() =>
    defaultStayDateRange(stayBookingRules)[1],
  )
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
    cleaningFeeApplied,
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
    cleaningFeeAmount,
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div
            className={clsx(
              'flex min-w-0 flex-1 flex-wrap gap-x-3 gap-y-1',
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
          {listingId ? (
            <div className="ml-auto shrink-0 self-center">
              <ListingInstantApprovalTitleBadge listingId={listingId} />
            </div>
          ) : null}
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
          {cleaningFeeApplied > 0 ? (
            <>
              <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                {messages.listing.sidebar.cleaningFee}
              </DescriptionTerm>
              <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
                {formatConverted(cleaningFeeApplied, currencyCode)}
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

      <p className="mt-3 text-center text-xs text-neutral-500 dark:text-neutral-500">
        {messages.listing.sidebar.reservationNoFeeNote}
      </p>
    </div>
  )
}

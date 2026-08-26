'use client'

import ActivityParticipantsInputPopover from '@/app/[locale]/(app)/(listings)/components/ActivityParticipantsInputPopover'
import ActivitySessionInputPopover from '@/app/[locale]/(app)/(listings)/components/ActivitySessionInputPopover'
import SingleDateInputPopover from '@/app/[locale]/(app)/(listings)/components/SingleDateInputPopover'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { usePreferredCurrencyContext, useCheckoutPaymentAmount } from '@/contexts/preferred-currency-context'
import { resolveDisplayMoney } from '@/lib/currency-convert'
import { activityLowestSessionPrice, activityTotalWithStaffPrice } from '@/lib/activity-session-pricing'
import { formatLocalYmd } from '@/lib/date-format-local'
import { buildActivityCheckoutUrl } from '@/lib/stay-checkout-url'
import {
  listPublicActivitySessions,
  quotePublicActivity,
  type ActivityQuote,
  type ActivitySessionRow,
} from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { formatMoneyIntl } from '@/lib/parse-listing-price'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { getMessages } from '@/utils/getT'
import { parseListingPriceString } from '@/lib/parse-listing-price'
import { parseLocalYmd } from '@/utils/format-local-ymd'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

function todayIso() {
  return formatLocalYmd(new Date())
}

function parseMoney(raw: string | null | undefined): number {
  const n = Number(String(raw ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function displayMoney(amount: number, currency: string) {
  return amount > 0 ? formatMoneyIntl(amount, currency) : '—'
}

function stripActivityFromAffix(raw: string | undefined) {
  return (raw ?? '')
    .replace(/['’]den\b/gi, '')
    .replace(/\bfrom\b/gi, '')
    .trim()
}

export default function ActivityBookingPanel({
  listingId,
  locale = 'tr',
  initialSessions,
  allSessions,
  initialDate,
  fallbackPrice,
  fallbackPriceAmount,
  fallbackPriceCurrency,
  pageCurrency,
  initialMonthsShown = 1,
  activityCategory,
  femaleStaffOptionEnabled = false,
  femaleStaffPrice,
}: {
  listingId: string
  locale?: string
  initialSessions: ActivitySessionRow[]
  allSessions?: ActivitySessionRow[]
  initialDate?: string
  fallbackPrice?: string
  fallbackPriceAmount?: number
  fallbackPriceCurrency?: string
  pageCurrency?: string
  initialMonthsShown?: 1 | 2
  activityCategory?: string
  femaleStaffOptionEnabled?: boolean
  femaleStaffPrice?: string
}) {
  const m = getMessages(locale)
  const ab = m.listing.activityBooking
  const td = m.listing.tourDetail
  const sidebar = m.listing.sidebar
  const router = useRouter()
  const vitrinHref = useVitrinHref()
  const currencyContext = usePreferredCurrencyContext()

  const [date, setDate] = useState(initialDate || todayIso())
  const selectedDate = useMemo(() => parseLocalYmd(date) ?? parseLocalYmd(todayIso()), [date])
  const [sessions, setSessions] = useState<ActivitySessionRow[]>(initialSessions)
  const [sessionId, setSessionId] = useState(initialSessions[0]?.id ?? '')
  const [adults, setAdults] = useState(1)
  const [children, setChildren] = useState(0)
  const [femaleStaffSelected, setFemaleStaffSelected] = useState(false)
  const [quote, setQuote] = useState<ActivityQuote | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setMsg(null)
    void listPublicActivitySessions(listingId, date)
      .then((r) => {
        if (cancelled) return
        setSessions(r.sessions)
        setSessionId((prev) => {
          if (r.sessions.some((s) => s.id === prev)) return prev
          return r.sessions[0]?.id ?? ''
        })
      })
      .catch(() => {
        if (!cancelled) {
          setSessions([])
          setSessionId('')
          setMsg(ab.sessionLoadError)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [date, listingId, ab.sessionLoadError])

  useEffect(() => {
    if (!sessionId || adults + children <= 0) {
      setQuote(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setMsg(null)
    void quotePublicActivity(listingId, { date, session_id: sessionId, adults, children })
      .then((q) => {
        if (!cancelled) setQuote(q)
      })
      .catch(() => {
        if (!cancelled) {
          setQuote(null)
          setMsg(ab.quoteError)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [adults, children, date, listingId, sessionId, ab.quoteError])

  const allSessionRanges = allSessions ?? initialSessions
  const dateHasSession = (d: Date): boolean => {
    if (allSessionRanges.length === 0) return true
    const ymd = formatLocalYmd(d)
    return allSessionRanges.some((session) => {
      const from = session.valid_from?.trim().slice(0, 10)
      const to = session.valid_to?.trim().slice(0, 10)
      return Boolean(from && to && from <= ymd && ymd <= to && session.is_active !== false)
    })
  }

  const activeSessionRow = sessions.find((s) => s.id === sessionId)
  const currency = quote?.currency_code || activeSessionRow?.currency_code || 'TRY'
  const adultUnit = parseMoney(quote?.adult_unit || activeSessionRow?.adult_price)
  const childUnit = parseMoney(quote?.child_unit || activeSessionRow?.child_price)
  const adultsSubtotal = adultUnit * adults
  const childrenSubtotal = childUnit * children
  const participantCount = adults + children
  const femaleStaffUnit = femaleStaffOptionEnabled ? parseMoney(femaleStaffPrice) : 0
  const baseGrandTotal = quote?.line_total != null && quote?.line_total !== '' ? parseMoney(quote.line_total) : (adultsSubtotal + childrenSubtotal)
  const grandTotal = activityTotalWithStaffPrice(
    baseGrandTotal,
    participantCount,
    femaleStaffUnit,
    femaleStaffSelected,
  )
  const listingCurrency = (fallbackPriceCurrency || pageCurrency || currency || 'TRY').trim().toUpperCase()
  const targetCurrency = (currencyContext?.preferredCode || listingCurrency).trim().toUpperCase()
  const displayMoneyValue = (amount: number, sourceCurrency: string) =>
    resolveDisplayMoney(
      amount,
      sourceCurrency || listingCurrency,
      targetCurrency,
      currencyContext?.rates ?? [],
    )
  const comparableAmount = (amount: number, sourceCurrency: string): number | null => {
    const value = displayMoneyValue(amount, sourceCurrency)
    return value?.currencyCode === targetCurrency ? value.amount : null
  }
  const displayGrandTotal = displayMoneyValue(grandTotal, currency)

  const parsedFallbackPrice = parseListingPriceString(stripActivityFromAffix(fallbackPrice))
  const sessionStartingPrice = activityLowestSessionPrice(allSessionRanges, comparableAmount)
  const convertedHeaderPrice =
    fallbackPriceAmount != null && Number.isFinite(fallbackPriceAmount) && fallbackPriceAmount > 0
        ? displayMoneyValue(fallbackPriceAmount, listingCurrency)
        : parsedFallbackPrice
          ? displayMoneyValue(parsedFallbackPrice.amount, parsedFallbackPrice.currency)
          : displayMoneyValue(adultUnit, currency)
  const headerPrice =
    sessionStartingPrice != null
      ? displayMoney(sessionStartingPrice.comparisonAmount, targetCurrency)
      : convertedHeaderPrice != null && convertedHeaderPrice.amount > 0
        ? displayMoney(convertedHeaderPrice.amount, convertedHeaderPrice.currencyCode)
        : ab.priceBySelection

  const canCheckout =
    Boolean(listingId?.trim()) &&
    Boolean(sessionId || activeSessionRow?.id) &&
    (quote != null || activeSessionRow != null) &&
    grandTotal > 0 &&
    adults + children > 0 &&
    Boolean(date)

  const payment = useCheckoutPaymentAmount(currency, grandTotal)

  function goCheckout() {
    if (!canCheckout || !date.trim()) return
    const targetSessionId = sessionId || activeSessionRow?.id || ''
    if (!targetSessionId) return
    router.push(
      buildActivityCheckoutUrl(vitrinHref('/checkout'), {
        listingId,
        date,
        sessionId: targetSessionId,
        adults,
        children,
        currencyCode: payment.currencyCode,
        unitPrice: payment.unitPrice,
        startTime: quote?.start_time || activeSessionRow?.start_time,
        femaleStaffPreference: femaleStaffSelected
          ? activityCategory === 'paragliding'
            ? 'female_pilot'
            : 'female_captain'
          : undefined,
      }),
    )
  }

  return (
    <div className="listingSection__wrap sm:shadow-xl">
      <div>
        <span className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
          {headerPrice}
          <span className="text-base font-normal text-neutral-500 dark:text-neutral-400">
            {td.pricePerPerson}
          </span>
        </span>
      </div>

      <div
        className="mt-2 flex flex-col overflow-visible rounded-3xl border border-neutral-200 dark:border-neutral-700"
        id="activity-booking-form"
      >
        <SingleDateInputPopover
          embedded
          className="z-11 flex-1"
          locale={locale}
          selectedDate={selectedDate}
          initialMonthsShown={initialMonthsShown}
          filterDate={dateHasSession}
          onDateChange={(d) => {
            if (d) setDate(formatLocalYmd(d))
          }}
        />
        <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />
        <ActivitySessionInputPopover
          className="z-10 flex-1"
          locale={locale}
          sessions={sessions}
          sessionId={sessionId}
          onSessionChange={setSessionId}
        />
        <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />
        <ActivityParticipantsInputPopover
          className="flex-1"
          locale={locale}
          adults={adults}
          // Existing popover API uses a `children` count prop, not React children.
          // eslint-disable-next-line react/no-children-prop
          children={children}
          onAdultsChange={setAdults}
          onChildrenChange={setChildren}
        />
      </div>

      {femaleStaffOptionEnabled && femaleStaffUnit > 0 && (activityCategory === 'paragliding' || activityCategory === 'boat_tour') ? (
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-700">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded text-primary-600"
            checked={femaleStaffSelected}
            onChange={(e) => setFemaleStaffSelected(e.target.checked)}
          />
          <span className="min-w-0 text-sm">
            <span className="block font-semibold text-neutral-900 dark:text-neutral-100">
              {activityCategory === 'paragliding' ? ab.femalePilotOption : ab.femaleCaptainOption}
            </span>
            <span className="mt-1 block text-neutral-500 dark:text-neutral-400">
              {(() => {
                const value = displayMoneyValue(femaleStaffUnit, currency)
                return ab.specialPricePerPerson.replace(
                  '{price}',
                  value ? displayMoney(value.amount, value.currencyCode) : '—',
                )
              })()}
            </span>
          </span>
        </label>
      ) : null}

      <div className="mt-4 space-y-3 rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800/50">
        {quote || (activeSessionRow && displayGrandTotal != null && displayGrandTotal.amount > 0) ? (
          <DescriptionList>
            <DescriptionTerm className="font-semibold text-neutral-900 dark:text-white">
              {sidebar.total}
            </DescriptionTerm>
            <DescriptionDetails className="font-semibold text-neutral-900 sm:text-right dark:text-white">
              {displayGrandTotal
                ? displayMoney(displayGrandTotal.amount, displayGrandTotal.currencyCode)
                : '—'}
            </DescriptionDetails>
          </DescriptionList>
        ) : null}
      </div>

      {msg ? <p className="mt-3 text-sm text-amber-600 dark:text-amber-300">{msg}</p> : null}

      <ButtonPrimary
        type="button"
        onClick={goCheckout}
        className="mt-4 w-full"
        disabled={!canCheckout || loading}
      >
        {loading ? ab.calculating : ab.reserve}
      </ButtonPrimary>

      <p className="mt-3 text-center text-xs text-neutral-500 dark:text-neutral-500">
        {sidebar.reservationNoFeeNote}
      </p>
    </div>
  )
}

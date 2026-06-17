'use client'

import ActivityParticipantsInputPopover from '@/app/[locale]/(app)/(listings)/components/ActivityParticipantsInputPopover'
import ActivitySessionInputPopover from '@/app/[locale]/(app)/(listings)/components/ActivitySessionInputPopover'
import SingleDateInputPopover from '@/app/[locale]/(app)/(listings)/components/SingleDateInputPopover'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { formatLocalYmd } from '@/lib/date-format-local'
import { buildActivityCheckoutUrl } from '@/lib/stay-checkout-url'
import {
  listPublicActivitySessions,
  quotePublicActivity,
  type ActivityQuote,
  type ActivitySessionRow,
} from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ListingPrice from '@/components/ListingPrice'
import { activityPriceFromAffix } from '@/lib/activity-listing-price-display'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import { toIntlLocale } from '@/lib/intl-locale'
import { parseLocalYmd } from '@/utils/format-local-ymd'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

function todayIso() {
  return formatLocalYmd(new Date())
}

function money(raw: string | undefined, currency: string, locale: string) {
  const n = Number(String(raw ?? '').replace(',', '.'))
  if (!Number.isFinite(n)) return raw ?? ''
  try {
    return new Intl.NumberFormat(toIntlLocale(locale), { style: 'currency', currency }).format(n)
  } catch {
    return `${n.toLocaleString(toIntlLocale(locale))} ${currency}`
  }
}

function parseMoney(raw: string | undefined): number {
  const n = Number(String(raw ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export default function ActivityBookingPanel({
  listingId,
  locale = 'tr',
  initialSessions,
  initialDate,
  fallbackPrice,
  fallbackPriceAmount,
  fallbackPriceCurrency,
  initialMonthsShown = 1,
}: {
  listingId: string
  locale?: string
  initialSessions: ActivitySessionRow[]
  initialDate?: string
  fallbackPrice?: string
  fallbackPriceAmount?: number
  fallbackPriceCurrency?: string
  initialMonthsShown?: 1 | 2
}) {
  const m = getMessages(locale)
  const ab = m.listing.activityBooking
  const td = m.listing.tourDetail
  const sidebar = m.listing.sidebar
  const router = useRouter()
  const vitrinHref = useVitrinHref()

  const [date, setDate] = useState(initialDate || todayIso())
  const selectedDate = useMemo(() => parseLocalYmd(date) ?? parseLocalYmd(todayIso()), [date])
  const [sessions, setSessions] = useState<ActivitySessionRow[]>(initialSessions)
  const [sessionId, setSessionId] = useState(initialSessions[0]?.id ?? '')
  const [adults, setAdults] = useState(1)
  const [children, setChildren] = useState(0)
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

  const currency = quote?.currency_code || sessions.find((s) => s.id === sessionId)?.currency_code || 'TRY'
  const adultUnit = parseMoney(quote?.adult_unit)
  const childUnit = parseMoney(quote?.child_unit)
  const adultsSubtotal = adultUnit * adults
  const childrenSubtotal = childUnit * children
  const grandTotal = parseMoney(quote?.line_total)

  const headerPrice = fallbackPrice || ab.priceBySelection
  const activityFromAffix = activityPriceFromAffix(locale)
  const showFromPrice =
    fallbackPriceAmount != null && Number.isFinite(fallbackPriceAmount) && fallbackPriceAmount > 0

  const canCheckout =
    Boolean(listingId?.trim()) &&
    Boolean(sessionId) &&
    quote != null &&
    grandTotal > 0 &&
    adults + children > 0 &&
    Boolean(date)

  function goCheckout() {
    if (!canCheckout || !quote || !date.trim()) return
    router.push(
      buildActivityCheckoutUrl(vitrinHref('/checkout'), {
        listingId,
        date,
        sessionId,
        adults,
        children,
        currencyCode: quote.currency_code || currency,
        unitPrice: grandTotal,
        startTime: quote.start_time,
      }),
    )
  }

  return (
    <div className="listingSection__wrap sm:shadow-xl">
      <div>
        <span className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
          {showFromPrice ? (
            <ListingPrice
              className="text-3xl font-semibold"
              price={fallbackPrice}
              priceAmount={fallbackPriceAmount}
              priceCurrency={fallbackPriceCurrency || currency}
              priceFromPrefix={activityFromAffix.prefix}
              priceFromSuffix={activityFromAffix.suffix}
            />
          ) : (
            headerPrice
          )}
          <span className="ml-1 text-base font-normal text-neutral-500 dark:text-neutral-400">
            {td.pricePerPerson}
          </span>
        </span>
      </div>

      <Form
        action={async () => {
          goCheckout()
        }}
        className="mt-2 flex flex-col overflow-visible rounded-3xl border border-neutral-200 dark:border-neutral-700"
        id="activity-booking-form"
      >
        <SingleDateInputPopover
          embedded
          className="z-11 flex-1"
          locale={locale}
          selectedDate={selectedDate}
          initialMonthsShown={initialMonthsShown}
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
          children={children}
          onAdultsChange={setAdults}
          onChildrenChange={setChildren}
        />
      </Form>

      <div className="mt-4 space-y-3 rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800/50">
        <DescriptionList>
          {quote && adults > 0 ? (
            <>
              <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                {money(quote.adult_unit, currency, locale)} × {adults} {ab.adult.toLowerCase()}
              </DescriptionTerm>
              <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
                {money(String(adultsSubtotal), currency, locale)}
              </DescriptionDetails>
            </>
          ) : null}
          {quote && children > 0 ? (
            <>
              <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                {money(quote.child_unit, currency, locale)} × {children} {ab.child.toLowerCase()}
              </DescriptionTerm>
              <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
                {money(String(childrenSubtotal), currency, locale)}
              </DescriptionDetails>
            </>
          ) : null}
        </DescriptionList>
        {quote ? (
          <>
            <Divider />
            <DescriptionList>
              <DescriptionTerm className="font-semibold text-neutral-900 dark:text-white">
                {sidebar.total}
              </DescriptionTerm>
              <DescriptionDetails className="font-semibold text-neutral-900 sm:text-right dark:text-white">
                {grandTotal > 0 ? money(quote.line_total, currency, locale) : '—'}
              </DescriptionDetails>
            </DescriptionList>
          </>
        ) : null}
      </div>

      {msg ? <p className="mt-3 text-sm text-amber-600 dark:text-amber-300">{msg}</p> : null}

      <ButtonPrimary
        form="activity-booking-form"
        type="submit"
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

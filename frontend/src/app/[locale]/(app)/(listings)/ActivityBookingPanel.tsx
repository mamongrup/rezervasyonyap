'use client'

import ButtonPrimary from '@/shared/ButtonPrimary'
import { Divider } from '@/shared/divider'
import {
  listPublicActivitySessions,
  quotePublicActivity,
  type ActivityQuote,
  type ActivitySessionRow,
} from '@/lib/travel-api'
import { buildListingCheckoutUrl } from '@/lib/stay-checkout-url'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import { toIntlLocale } from '@/lib/intl-locale'
import { CalendarDays, Clock3, Minus, Plus, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
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

function sessionLabel(session: ActivitySessionRow, locale: string) {
  const ab = getMessages(locale).listing.activityBooking
  const time = session.start_time?.slice(0, 5) || ab.timeNotSpecified
  const duration = Number(session.duration_minutes ?? 0)
  return duration > 0
    ? `${time} · ${interpolate(ab.minutesShort, { min: String(duration) })}`
    : time
}

export default function ActivityBookingPanel({
  listingId,
  locale = 'tr',
  initialSessions,
  initialDate,
  fallbackPrice,
}: {
  listingId: string
  locale?: string
  initialSessions: ActivitySessionRow[]
  initialDate?: string
  fallbackPrice?: string
}) {
  const ab = getMessages(locale).listing.activityBooking
  const router = useRouter()
  const vitrinHref = useVitrinHref()
  const [date, setDate] = useState(initialDate || todayIso())
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
  }, [date, listingId])

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
  }, [adults, children, date, listingId, sessionId])

  const selected = useMemo(
    () => sessions.find((s) => s.id === sessionId) ?? null,
    [sessionId, sessions],
  )
  const currency = quote?.currency_code || selected?.currency_code || 'TRY'
  const lineTotal = quote ? Number(String(quote.line_total ?? '').replace(',', '.')) : 0
  const canCheckout = Boolean(listingId.trim()) && Boolean(quote) && lineTotal > 0

  function goCheckout() {
    if (!canCheckout || !quote) return
    const travel = new Date(`${date}T12:00:00`)
    if (Number.isNaN(travel.getTime())) return
    router.push(
      buildListingCheckoutUrl(vitrinHref('/checkout'), {
        listingId,
        startDate: travel,
        endDate: travel,
        currencyCode: quote.currency_code || currency,
        unitPrice: lineTotal,
        guests: {
          guestAdults: adults,
          guestChildren: children,
          guestInfants: 0,
        },
        extra: {
          activity_session_id: sessionId,
          activity_date: date,
        },
      }),
    )
  }

  return (
    <div className="listingSection__wrap sm:shadow-xl">
      <div>
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{ab.startingPrice}</p>
        <p className="mt-1 text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
          {quote ? money(quote.line_total, quote.currency_code, locale) : fallbackPrice || ab.priceBySelection}
        </p>
        <p className="mt-1 text-xs text-neutral-400">{ab.priceCalcHint}</p>
      </div>
      <Divider />

      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">
            <CalendarDays className="h-4 w-4" /> {ab.dateLabel}
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">
            <Clock3 className="h-4 w-4" /> {ab.sessionTimeLabel}
          </p>
          <div className="grid gap-2">
            {sessions.length > 0 ? (
              sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSessionId(session.id ?? '')}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                    sessionId === session.id
                      ? 'border-primary-600 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-200'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-primary-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
                  }`}
                >
                  <span className="font-semibold">{sessionLabel(session, locale)}</span>
                  <span className="ml-2 text-xs text-neutral-400">
                    {session.capacity ? `${ab.capacity} ${session.capacity}` : ''}
                  </span>
                </button>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-700">
                {ab.noSessions}
              </p>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">
            <Users className="h-4 w-4" /> {ab.participantsLabel}
          </p>
          <Stepper label={ab.adult} sublabel={quote ? money(quote.adult_unit, currency, locale) : undefined} value={adults} min={0} onChange={setAdults} />
          <Stepper label={ab.child} sublabel={quote ? money(quote.child_unit, currency, locale) : undefined} value={children} min={0} onChange={setChildren} />
        </div>

        {msg ? <p className="text-sm text-amber-600 dark:text-amber-300">{msg}</p> : null}
        <ButtonPrimary type="button" disabled={!canCheckout || loading} onClick={goCheckout}>
          {loading ? ab.calculating : getMessages(locale).common.Reserve}
        </ButtonPrimary>
      </div>
    </div>
  )
}

function Stepper({
  label,
  sublabel,
  value,
  min,
  onChange,
}: {
  label: string
  sublabel?: string
  value: number
  min: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 py-3 last:border-b-0 dark:border-neutral-800">
      <div>
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{label}</p>
        {sublabel ? <p className="text-xs text-neutral-400">{sublabel}</p> : null}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-6 text-center text-sm font-semibold">{value}</span>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
          onClick={() => onChange(value + 1)}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

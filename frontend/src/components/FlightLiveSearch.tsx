'use client'

import FlightCard from '@/components/FlightCard'
import { allocateTurnaFlight, searchTurnaFlights, type TurnaFlightSession } from '@/lib/travel-api'
import { TURNA_FLIGHT_BOOKING_KEY } from '@/lib/turna-flight-booking'
import {
  parseTurnaSearchOffers,
  offerDurationLabel,
  type TurnaFlightOffer,
} from '@/lib/turna-flight-offers'
import { resolveFlightAirportCode } from '@/lib/flight-airports'
import { formatMoneyIntl } from '@/lib/parse-listing-price'
import T from '@/utils/getT'
import { useRouter } from 'next/navigation'
import { FC, useCallback, useEffect, useState } from 'react'

export type FlightLiveSearchParams = {
  from: string
  to: string
  date: string
  adults?: number
  children?: number
  infants?: number
  cabinClass?: string
  trip?: string
}

type FlightLiveSearchProps = {
  params: FlightLiveSearchParams
  locale?: string
  /** Statik rota ilanları yerine canlı arama göster */
  enabled?: boolean
}

/** Turna import rotalarıyla uyumlu: yalnızca İstanbul metro kodu şehir sayılır. */
function airportIsCity(code: string): boolean {
  return code.trim().toUpperCase() === 'IST'
}

function formatTurnaSearchError(
  raw: string,
  fallback: string,
  notConfigured: string,
): string {
  if (raw === 'turna_not_configured' || raw.startsWith('turna_api_key_missing')) {
    return notConfigured
  }
  if (raw.startsWith('turna_api_error:')) {
    const detail = raw.slice('turna_api_error:'.length).trim()
    return detail
      ? `Turna API hatası: ${detail}`
      : 'Turna API yanıt vermedi. Yönetim → API sağlayıcıları bölümünde base_url ile api_key aynı ortama (test/canlı) ait olmalı.'
  }
  if (raw.startsWith('turna_http_failed:')) {
    return `Turna bağlantı hatası: ${raw.slice('turna_http_failed:'.length).trim()}`
  }
  return raw || fallback
}

const FlightLiveSearch: FC<FlightLiveSearchProps> = ({ params, locale = 'tr', enabled = true }) => {
  const router = useRouter()
  const msgs = T.flightCard
  const m = T.flightLiveSearch ?? {
    searching: 'Uçuşlar aranıyor…',
    noResults: 'Bu tarih ve rota için uçuş bulunamadı.',
    error: 'Arama sırasında bir hata oluştu.',
    notConfigured:
      'Turna API anahtarı tanımlı değil. Yönetim → API sağlayıcıları bölümünden kaydedin veya sunucuda TURNA_API_KEY ayarlayın.',
    select: 'Seç ve devam et',
    configuring: 'Fiyat kontrol ediliyor…',
    needListing: 'Rota ilanı bulunamadı — yönetimden Turna import çalıştırın.',
  }

  const [loading, setLoading] = useState(false)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offers, setOffers] = useState<TurnaFlightOffer[]>([])
  const [session, setSession] = useState<TurnaFlightSession | null>(null)
  const [listingId, setListingId] = useState<string | null>(null)

  const from = resolveFlightAirportCode(params.from ?? '') ?? params.from?.trim().toUpperCase()
  const to = resolveFlightAirportCode(params.to ?? '') ?? params.to?.trim().toUpperCase()
  const date = params.date?.trim()

  const runSearch = useCallback(async () => {
    if (!enabled || !from || !to || !date) return
    setLoading(true)
    setError(null)
    setOffers([])
    try {
      const res = await searchTurnaFlights({
        origin: from,
        destination: to,
        departure_date: date,
        origin_is_city: airportIsCity(from),
        destination_is_city: airportIsCity(to),
        adults: params.adults ?? 1,
        children: params.children ?? 0,
        infants: params.infants ?? 0,
        cabin_class: params.cabinClass ?? 'Any',
      })
      setSession(res.session)
      setListingId(res.listing_id)
      setOffers(parseTurnaSearchOffers(res.turna_raw))
    } catch (e) {
      const raw = e instanceof Error ? e.message : m.error
      setError(formatTurnaSearchError(raw, m.error, m.notConfigured))
    } finally {
      setLoading(false)
    }
  }, [enabled, from, to, date, params.adults, params.children, params.infants, params.cabinClass, m.error, m.notConfigured])

  useEffect(() => {
    runSearch()
  }, [runSearch])

  const handleSelect = async (offer: TurnaFlightOffer) => {
    if (!session || !listingId || offer.price == null) {
      if (!listingId) setError(m.needListing)
      return
    }
    setBookingId(offer.id)
    setError(null)
    try {
      const alloc = await allocateTurnaFlight({
        session_id: session.session_id,
        session_token: session.session_token,
        allocate_form: offer.allocateForm,
      })

      sessionStorage.setItem(
        TURNA_FLIGHT_BOOKING_KEY,
        JSON.stringify({
          session: alloc.session,
          allocate_raw: alloc.turna_raw,
          listing_id: listingId,
          departure_date: date,
          offer: {
            id: offer.id,
            origin: offer.origin,
            destination: offer.destination,
            departure_time: offer.departureTime,
            airline: offer.airlineName,
          },
          passengers: {
            adults: params.adults ?? 1,
            children: params.children ?? 0,
            infants: params.infants ?? 0,
          },
        }),
      )

      const qs = new URLSearchParams({
        listingId,
        startDate: date!,
        endDate: date!,
        unitPrice: String(offer.price),
        currency: offer.currency || 'TRY',
        flight: '1',
      })
      router.push(`/${locale}/checkout?${qs.toString()}`)
    } catch (e) {
      const raw = e instanceof Error ? e.message : m.error
      setError(formatTurnaSearchError(raw, m.error, m.notConfigured))
    } finally {
      setBookingId(null)
    }
  }

  if (!enabled || !from || !to || !date) return null

  if (loading) {
    return (
      <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-8 text-center text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800/50">
        {m.searching}
      </p>
    )
  }

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    )
  }

  if (offers.length === 0) {
    return (
      <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-neutral-500 dark:border-neutral-700">
        {m.noResults}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
        {from} → {to} · {date} · {offers.length} uçuş
      </p>
      {offers.map((offer) => {
        const priceLabel =
          offer.price != null ? formatMoneyIntl(offer.price, offer.currency || 'TRY') : undefined
        const duration = offerDurationLabel(offer)
        return (
          <div key={`${offer.id}-${offer.referenceId}-${offer.price}`} className="relative">
            <FlightCard
              data={{
                id: offer.id,
                handle: offer.id,
                title: `${offer.origin} → ${offer.destination}`,
                departure: offer.origin,
                arrival: offer.destination,
                departureTime: offer.departureTime ?? undefined,
                arrivalTime: offer.arrivalTime ?? undefined,
                duration,
                price: priceLabel,
                stopNumber: offer.stopCount,
                airlines: { name: offer.airlineName, logo: '' },
                address: `${offer.origin} → ${offer.destination}`,
              }}
              msgs={msgs}
            />
            <div className="absolute end-4 bottom-4 z-10 sm:end-6 sm:bottom-6">
              <button
                type="button"
                disabled={bookingId === offer.id || offer.price == null || !listingId}
                onClick={() => handleSelect(offer)}
                className="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-700 disabled:opacity-50"
              >
                {bookingId === offer.id ? m.configuring : m.select}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default FlightLiveSearch

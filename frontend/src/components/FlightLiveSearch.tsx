'use client'

import TurnaFlightCard from '@/components/TurnaFlightCard'
import { allocateTurnaFlight, searchTurnaFlights, type TurnaFlightSession } from '@/lib/travel-api'
import { snapshotFromTurnaOffer, TURNA_FLIGHT_BOOKING_KEY } from '@/lib/turna-flight-booking'
import {
  parseTurnaSearchOffers,
  parseTurnaSearchResponseUrl,
  type TurnaFlightOffer,
} from '@/lib/turna-flight-offers'
import {
  resolveFlightAirportCode,
  turnaDestinationIsCity,
  turnaOriginIsCity,
} from '@/lib/flight-airports'
import { turnaOfferListKey } from '@/lib/flight-display-assets'
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

function formatTurnaSearchError(
  raw: string,
  fallback: string,
  notConfigured: string,
  accessDenied: string,
): string {
  if (raw === 'turna_not_configured' || raw.startsWith('turna_api_key_missing')) {
    return notConfigured
  }
  if (
    raw === 'turna_access_denied' ||
    /access\s+denied/i.test(raw) ||
    raw.includes('apitest.turna.com')
  ) {
    return accessDenied
  }
  if (raw.startsWith('turna_api_error:')) {
    const detail = raw.slice('turna_api_error:'.length).trim()
    if (/access\s+denied/i.test(detail) || detail.includes('<HTML>')) {
      return accessDenied
    }
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
  const m = T.flightLiveSearch ?? {
    searching: 'Uçuşlar aranıyor…',
    noResults: 'Bu tarih ve rota için uçuş bulunamadı.',
    error: 'Arama sırasında bir hata oluştu.',
    notConfigured:
      'Turna API anahtarı tanımlı değil. Yönetim → API sağlayıcıları bölümünden kaydedin veya sunucuda TURNA_API_KEY ayarlayın.',
    select: 'Seç ve devam et',
    configuring: 'Fiyat kontrol ediliyor…',
    needListing: 'Rota ilanı bulunamadı — yönetimden Turna import çalıştırın.',
    noInventory:
      'Turna API bu rota için envanter döndürmedi. API anahtarınızın uçuş arama yetkisini Turna ile doğrulayın.',
    viewOnTurna: 'Turna.com’da görüntüle',
    accessDenied:
      'Turna test ortamı (apitest.turna.com) sunucu IP’nizi engelliyor. Yönetim → Entegrasyonlar’da Base URL olarak https://api.turna.com ve canlı API anahtarını kaydedin.',
  }

  const [loading, setLoading] = useState(false)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offers, setOffers] = useState<TurnaFlightOffer[]>([])
  const [session, setSession] = useState<TurnaFlightSession | null>(null)
  const [listingId, setListingId] = useState<string | null>(null)
  const [searchResponseUrl, setSearchResponseUrl] = useState<string | null>(null)
  const [hasInventory, setHasInventory] = useState<boolean | null>(null)
  const [lastSearchRaw, setLastSearchRaw] = useState<string | null>(null)

  const from = resolveFlightAirportCode(params.from ?? '') ?? params.from?.trim().toUpperCase()
  const to = resolveFlightAirportCode(params.to ?? '') ?? params.to?.trim().toUpperCase()
  const date = params.date?.trim()

  const runSearch = useCallback(async () => {
    if (!enabled || !from || !to || !date) return
    setLoading(true)
    setError(null)
    setOffers([])
    setSearchResponseUrl(null)
    setHasInventory(null)
    try {
      const res = await searchTurnaFlights({
        origin: from,
        destination: to,
        departure_date: date,
        origin_is_city: turnaOriginIsCity(from),
        destination_is_city: turnaDestinationIsCity(to),
        adults: params.adults ?? 1,
        children: params.children ?? 0,
        infants: params.infants ?? 0,
        cabin_class: params.cabinClass ?? 'Any',
      })
      setSession(res.session)
      setListingId(res.listing_id)
      setHasInventory(res.has_inventory ?? null)
      const turnaUrl =
        (typeof res.search_response_url === 'string' && res.search_response_url.trim()) ||
        parseTurnaSearchResponseUrl(res.turna_raw)
      setSearchResponseUrl(turnaUrl || null)
      setLastSearchRaw(res.turna_raw ?? null)
      if (res.turna_raw) {
        sessionStorage.setItem('travel_turna_last_search_raw', res.turna_raw)
      }
      setOffers(parseTurnaSearchOffers(res.turna_raw))
    } catch (e) {
      const raw = e instanceof Error ? e.message : m.error
      setError(formatTurnaSearchError(raw, m.error, m.notConfigured, m.accessDenied))
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
        origin: from,
        destination: to,
        departure_date: date!,
        origin_is_city: turnaOriginIsCity(from),
        destination_is_city: turnaDestinationIsCity(to),
        adults: params.adults ?? 1,
        children: params.children ?? 0,
        infants: params.infants ?? 0,
        cabin_class: params.cabinClass ?? 'Any',
      })

      sessionStorage.setItem(
        TURNA_FLIGHT_BOOKING_KEY,
        JSON.stringify({
          session: alloc.session,
          allocate_raw: alloc.turna_raw,
          listing_id: listingId,
          departure_date: date,
          search_raw: lastSearchRaw ?? undefined,
          offer: snapshotFromTurnaOffer(offer),
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
      setError(formatTurnaSearchError(raw, m.error, m.notConfigured, m.accessDenied))
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

  if (offers.length === 0 && error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    )
  }

  if (offers.length === 0) {
    const showInventoryHint = hasInventory === false
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-400">
        <p>{m.noResults}</p>
        {showInventoryHint ? (
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">{m.noInventory}</p>
        ) : null}
        {searchResponseUrl ? (
          <p className="mt-3">
            <a
              href={searchResponseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-link-muted-underline"
            >
              {m.viewOnTurna}
            </a>
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}
      <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
        {from} → {to} · {date} · {offers.length} uçuş
      </p>
      {offers.map((offer, index) => {
        const priceLabel =
          offer.price != null ? formatMoneyIntl(offer.price, offer.currency || 'TRY') : undefined
        return (
          <TurnaFlightCard
            key={turnaOfferListKey(offer, index)}
            offer={offer}
            locale={locale}
            priceLabel={priceLabel}
            booking={bookingId === offer.id}
            action={
              <button
                type="button"
                disabled={bookingId === offer.id || offer.price == null || !listingId}
                onClick={() => handleSelect(offer)}
                className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary-700 disabled:opacity-50 sm:w-auto"
              >
                {bookingId === offer.id ? m.configuring : m.select}
              </button>
            }
          />
        )
      })}
    </div>
  )
}

export default FlightLiveSearch

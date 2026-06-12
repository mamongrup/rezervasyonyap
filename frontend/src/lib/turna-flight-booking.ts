/**
 * Turna uçuş rezervasyonu — checkout sonrası reserve/book yardımcıları.
 */

import { resolveAirlineIataCode } from '@/lib/flight-display-assets'
import {
  airlineCodeFromFlightNumber,
  findTurnaOfferInRaw,
  type TurnaFlightOffer,
} from '@/lib/turna-flight-offers'
import { bookTurnaFlight, type TurnaFlightSession } from '@/lib/travel-api'

export const TURNA_FLIGHT_BOOKING_KEY = 'travel_turna_flight_booking'
const TURNA_LAST_SEARCH_RAW_KEY = 'travel_turna_last_search_raw'

/** Checkout özet paneli — arama anındaki uçuş snapshot */
export type FlightCheckoutSnapshot = {
  id?: string
  origin: string
  destination: string
  originCity?: string
  destinationCity?: string
  originAirportLabel?: string
  destinationAirportLabel?: string
  departureTime?: string | null
  arrivalTime?: string | null
  durationMinutes?: number | null
  airlineName: string
  airlineCode: string
  stopCount: number
  cabinClass?: string
  flightNumber?: string
  baggageLabel?: string
  handBaggageKg?: string
  checkedBaggageKg?: string
  arrivesNextDay?: boolean
  price?: number | null
  currency?: string
}

export type TurnaFlightBookingDraft = {
  session: TurnaFlightSession
  allocate_raw: string
  listing_id: string
  departure_date: string
  /** Son arama yanıtı — checkout’ta eksik saat/logo tamamlama */
  search_raw?: string
  offer?: FlightCheckoutSnapshot
  passengers?: { adults?: number; children?: number; infants?: number }
}

export function snapshotFromTurnaOffer(offer: TurnaFlightOffer): FlightCheckoutSnapshot {
  return {
    id: offer.id,
    origin: offer.origin,
    destination: offer.destination,
    originCity: offer.originCity,
    destinationCity: offer.destinationCity,
    originAirportLabel: offer.originAirportLabel,
    destinationAirportLabel: offer.destinationAirportLabel,
    departureTime: offer.departureTime,
    arrivalTime: offer.arrivalTime,
    durationMinutes: offer.durationMinutes,
    airlineName: offer.airlineName,
    airlineCode: offer.airlineCode,
    stopCount: offer.stopCount,
    cabinClass: offer.cabinClass,
    flightNumber: offer.flightNumber,
    baggageLabel: offer.baggageLabel,
    handBaggageKg: offer.handBaggageKg,
    checkedBaggageKg: offer.checkedBaggageKg,
    arrivesNextDay: offer.arrivesNextDay,
    price: offer.price,
    currency: offer.currency,
  }
}

function mergeCheckoutSnapshot(
  base: FlightCheckoutSnapshot,
  patch: Partial<FlightCheckoutSnapshot>,
): FlightCheckoutSnapshot {
  const out = { ...base }
  for (const [k, v] of Object.entries(patch) as [keyof FlightCheckoutSnapshot, unknown][]) {
    if (v == null || v === '') continue
    if (k === 'stopCount' && typeof v === 'number') {
      out.stopCount = v
      continue
    }
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      ;(out as Record<string, unknown>)[k] = v
    }
  }
  if (!out.airlineCode?.trim()) {
    out.airlineCode =
      resolveAirlineIataCode(out) ||
      airlineCodeFromFlightNumber(out.flightNumber) ||
      out.airlineCode
  }
  return out
}

/** Eksik saat / havayolu alanlarını arama yanıtından tamamla */
export function enrichFlightCheckoutSnapshot(
  draft: TurnaFlightBookingDraft,
): FlightCheckoutSnapshot | null {
  if (!draft.offer) return null
  let snap = { ...draft.offer }

  const searchRaw =
    draft.search_raw?.trim() ||
    (typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem(TURNA_LAST_SEARCH_RAW_KEY)?.trim()
      : '') ||
    ''
  if (searchRaw) {
    const found = findTurnaOfferInRaw(searchRaw, { id: snap.id })
    if (found) snap = mergeCheckoutSnapshot(snap, snapshotFromTurnaOffer(found))
  }

  if (!snap.departureTime || !snap.arrivalTime || !snap.airlineCode) {
    const fromAlloc = findTurnaOfferInRaw(draft.allocate_raw, { id: snap.id })
    if (fromAlloc) snap = mergeCheckoutSnapshot(snap, snapshotFromTurnaOffer(fromAlloc))
  }

  snap = mergeCheckoutSnapshot(snap, {})
  return snap
}

export function readTurnaFlightBookingDraft(): TurnaFlightBookingDraft | null {
  if (typeof sessionStorage === 'undefined') return null
  const raw = sessionStorage.getItem(TURNA_FLIGHT_BOOKING_KEY)
  if (!raw) return null
  try {
    const draft = JSON.parse(raw) as TurnaFlightBookingDraft
    if (draft.offer) {
      const enriched = enrichFlightCheckoutSnapshot(draft)
      if (enriched) draft.offer = enriched
    }
    return draft
  } catch {
    return null
  }
}

export function clearTurnaFlightBookingDraft(): void {
  sessionStorage.removeItem(TURNA_FLIGHT_BOOKING_KEY)
}

type GuestLike = { first_name?: string; last_name?: string; national_id?: string; birth_date?: string }

/** Allocate yanıtı + misafir bilgisi → Turna reserve_form JSON string */
export function buildTurnaReserveForm(
  allocateRaw: string,
  guests: GuestLike[],
): string {
  let alloc: Record<string, unknown> = {}
  try {
    const parsed = JSON.parse(allocateRaw)
    if (parsed && typeof parsed === 'object') alloc = parsed as Record<string, unknown>
  } catch {
    /* boş form */
  }

  const pax = guests
    .filter((g) => g.first_name?.trim() || g.last_name?.trim())
    .map((g, i) => ({
      Type: i === 0 ? 'ADT' : 'ADT',
      FirstName: (g.first_name ?? '').trim(),
      LastName: (g.last_name ?? '').trim(),
      IdentityNumber: (g.national_id ?? '').trim() || undefined,
      BirthDate: (g.birth_date ?? '').trim() || undefined,
    }))

  const form: Record<string, unknown> = {
    ...alloc,
    Passengers: pax.length > 0 ? pax : alloc.Passengers,
    Paxes: pax.length > 0 ? pax : alloc.Paxes,
  }

  return JSON.stringify(form)
}

/**
 * Turna reserve + ödeme + checkout (geliştirme / manuel test).
 * Üretim akışı: ödeme webhook → `booking_fulfillment.fulfill_after_payment` (backend).
 */
export async function completeTurnaFlightBooking(
  draft: TurnaFlightBookingDraft,
  guests: GuestLike[],
): Promise<void> {
  const reserve_form = buildTurnaReserveForm(draft.allocate_raw, guests)
  await bookTurnaFlight({
    session_id: draft.session.session_id,
    session_token: draft.session.session_token,
    reserve_form,
    payment_form: '{}',
    checkout_form: '{}',
  })
  clearTurnaFlightBookingDraft()
}

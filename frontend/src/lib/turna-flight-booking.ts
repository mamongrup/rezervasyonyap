/**
 * Turna uçuş rezervasyonu — checkout sonrası reserve/book yardımcıları.
 */

import { bookTurnaFlight, type TurnaFlightSession } from '@/lib/travel-api'

export const TURNA_FLIGHT_BOOKING_KEY = 'travel_turna_flight_booking'

export type TurnaFlightBookingDraft = {
  session: TurnaFlightSession
  allocate_raw: string
  listing_id: string
  departure_date: string
  offer?: {
    id?: string
    origin?: string
    destination?: string
    departure_time?: string | null
    airline?: string
  }
  passengers?: { adults?: number; children?: number; infants?: number }
}

export function readTurnaFlightBookingDraft(): TurnaFlightBookingDraft | null {
  if (typeof sessionStorage === 'undefined') return null
  const raw = sessionStorage.getItem(TURNA_FLIGHT_BOOKING_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as TurnaFlightBookingDraft
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

/** Ödeme öncesi/sonrası Turna reserve (+ opsiyonel checkout) zinciri */
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

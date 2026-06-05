/**
 * Canlı uçuş kartları — havayolu logosu ve varış bölgesi kapak görseli.
 */

import { findAirportByCode } from '@/lib/flight-airports'

/**
 * Google Flights — yazısız dairesel havayolu amblemi (ör. THY kırmızı kuş).
 * @see https://www.gstatic.com/flights/airline_logos/70px/{IATA}.png
 */
export function airlineLogoUrl(iataCode: string | undefined | null): string {
  const code = String(iataCode ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  if (!code) return ''
  return `https://www.gstatic.com/flights/airline_logos/70px/${code}.png`
}

/** Snapshot / kart — airlineCode, uçuş no veya isimden logo IATA */
export function resolveAirlineIataCode(input: {
  airlineCode?: string | null
  flightNumber?: string | null
  airlineName?: string | null
}): string {
  const direct = String(input.airlineCode ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  if (direct.length >= 2) return direct.slice(0, 3)

  const fn = String(input.flightNumber ?? '').trim().toUpperCase()
  const fromFn = fn.match(/^([A-Z]{2,3})\d/)
  if (fromFn?.[1]) return fromFn[1]

  const name = String(input.airlineName ?? '').toLowerCase()
  if (name.includes('turkish')) return 'TK'
  if (name.includes('pegasus')) return 'PC'
  if (name.includes('sunexpress') || name.includes('sun express')) return 'XQ'
  if (name.includes('ajet')) return 'VF'

  return ''
}

/** Varış havalimanı / şehir için vitrin kapak görseli (Unsplash — statik) */
const DESTINATION_COVERS: Record<string, string> = {
  AYT: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200&q=80',
  IST: 'https://images.unsplash.com/photo-1527838837500-5dfc504f80e2?w=1200&q=80',
  SAW: 'https://images.unsplash.com/photo-1527838837500-5dfc504f80e2?w=1200&q=80',
  ESB: 'https://images.unsplash.com/photo-1594756202469-9ff9799b2e4e?w=1200&q=80',
  ADB: 'https://images.unsplash.com/photo-1582555172861-fca98f0d2c0c?w=1200&q=80',
  GZP: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1200&q=80',
  DLM: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
  BJV: 'https://images.unsplash.com/photo-1500375592092-40ab6666c2bd?w=1200&q=80',
  TZX: 'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=1200&q=80',
  GZT: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80',
  ASR: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
  NAV: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
  DIY: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80',
  ERZ: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80',
  VAN: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80',
  SZF: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80',
  KYA: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80',
  LHR: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&q=80',
  FRA: 'https://images.unsplash.com/photo-1467269206134-0eda4c1a0022?w=1200&q=80',
  DXB: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80',
  CDG: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80',
  AMS: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1200&q=80',
}

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80'

export function flightDestinationCover(airportCode: string | undefined | null): string {
  const code = String(airportCode ?? '')
    .trim()
    .toUpperCase()
  if (code && DESTINATION_COVERS[code]) return DESTINATION_COVERS[code]
  return DEFAULT_COVER
}

export function flightDestinationLabel(airportCode: string | undefined | null): string {
  const code = String(airportCode ?? '').trim().toUpperCase()
  const hit = code ? findAirportByCode(code) : undefined
  return hit ? hit.label : code
}

/** React listesi için benzersiz anahtar (Turna combo id tekrar edebilir) */
export function turnaOfferListKey(
  offer: { id: string; referenceId: string; price: number | null; departureTime: string | null },
  index: number,
): string {
  return [
    offer.id || 'leg',
    offer.referenceId || 'ref',
    offer.price ?? 'np',
    offer.departureTime ?? 'nt',
    index,
  ].join('-')
}

import type { TFlightListing } from '@/data/listings'
import type { TListingBase } from '@/types/listing-types'
import type { PublicListingItem } from '@/lib/travel-api'
import { airlineLogoUrl, resolveAirlineIataCode } from '@/lib/flight-display-assets'
import { formatMoneyIntl } from '@/lib/parse-listing-price'

function parseRoute(raw: string | null | undefined): [string, string] {
  const src = String(raw ?? '').trim()
  if (!src) return ['', '']
  const sep = src.includes('→') ? '→' : src.includes('->') ? '->' : src.includes('—') ? '—' : src.includes('-') ? '-' : null
  if (!sep) return [src, '']
  const parts = src.split(sep).map((s) => s.trim())
  return [parts[0] ?? '', parts[1] ?? '']
}

/** Katalog API uçuş ilanı → FlightCard alanları (Turna + Kplus). */
export function enrichFlightListingFromCatalogItem(
  base: TListingBase,
  item: PublicListingItem,
): TFlightListing {
  const routeRaw = (item.location ?? item.title ?? base.title ?? '').trim()
  const [fromLoc, toLoc] = parseRoute(routeRaw)
  const departure = fromLoc || undefined
  const arrival = toLoc || undefined
  const routeLabel =
    departure && arrival ? `${departure} - ${arrival}` : routeRaw || base.title

  const airlineCode = item.flight_airline_code?.trim() ?? ''
  const airlineName = item.flight_airline_name?.trim() ?? ''
  const resolvedCode =
    airlineCode || resolveAirlineIataCode({ airlineCode, airlineName, flightNumber: '' })

  const stopRaw = item.flight_stop_count?.trim()
  const stopNum = stopRaw != null && stopRaw !== '' ? parseInt(stopRaw, 10) : NaN
  const stopNumber = Number.isFinite(stopNum) ? stopNum : undefined

  const cur = (item.currency_code?.trim() || base.priceCurrency || 'TRY').toUpperCase()
  const price =
    base.price?.trim() ||
    (base.priceAmount != null ? formatMoneyIntl(base.priceAmount, cur) : undefined)

  return {
    ...base,
    ...(departure ? { departure } : {}),
    ...(arrival ? { arrival } : {}),
    name: routeLabel,
    ...(item.flight_duration?.trim() ? { duration: item.flight_duration.trim() } : {}),
    ...(stopNumber != null ? { stopNumber } : {}),
    airlines: {
      logo: airlineLogoUrl(resolvedCode),
      name: airlineName || undefined,
    },
    ...(price ? { price } : {}),
  } as TFlightListing
}

export function flightRouteDedupeKey(listing: TListingBase): string {
  const f = listing as TFlightListing
  const dep = f.departure?.trim().toUpperCase()
  const arr = f.arrival?.trim().toUpperCase()
  if (dep && arr) return `${dep}-${arr}`
  const [a, b] = parseRoute(listing.address ?? listing.title)
  if (a && b) return `${a.toUpperCase()}-${b.toUpperCase()}`
  return ''
}

/** Aynı rota Turna + Kplus çiftini tek kartta birleştir — en düşük fiyat kalır. */
export function dedupeFlightListingsByRoute(listings: TListingBase[]): TListingBase[] {
  const keyed = new Map<string, TListingBase>()
  const extras: TListingBase[] = []
  for (const row of listings) {
    const key = flightRouteDedupeKey(row)
    if (!key) {
      extras.push(row)
      continue
    }
    const prev = keyed.get(key)
    if (!prev) {
      keyed.set(key, row)
      continue
    }
    const pa = prev.priceAmount ?? Number.POSITIVE_INFINITY
    const na = row.priceAmount ?? Number.POSITIVE_INFINITY
    if (na < pa) keyed.set(key, row)
  }
  return [...keyed.values(), ...extras]
}

/**
 * Turna /v1/flight/booking/search yanıtını vitrin kartlarına dönüştürür.
 * API şeması sürümlere göre değişebilir — esnek anahtar taraması kullanılır.
 */

export type TurnaFlightSession = {
  session_id: string
  session_token: string
}

export type TurnaFlightOffer = {
  id: string
  referenceId: string
  origin: string
  destination: string
  departureTime: string | null
  arrivalTime: string | null
  durationMinutes: number | null
  airlineName: string
  airlineCode: string
  stopCount: number
  price: number | null
  currency: string
  cabinClass: string
  /** allocate_form için ham bacak verisi */
  allocateForm: string
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function pickStr(obj: Record<string, unknown> | null, keys: string[]): string {
  if (!obj) return ''
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  }
  return ''
}

function pickNum(obj: Record<string, unknown> | null, keys: string[]): number | null {
  if (!obj) return null
  for (const k of keys) {
    const v = obj[k]
    const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v.replace(',', '.')) : NaN
    if (Number.isFinite(n) && n > 0) return n
    const nested = asRecord(v)
    if (nested) {
      const t = pickNum(nested, ['TotalFare', 'totalFare', 'Total', 'total', 'Amount', 'amount'])
      if (t != null) return t
    }
  }
  return null
}

function walkArrays(root: unknown, keys: string[]): unknown[] {
  const out: unknown[] = []
  function walk(node: unknown) {
    if (node == null) return
    if (Array.isArray(node)) {
      for (const item of node) walk(item)
      return
    }
    const o = asRecord(node)
    if (!o) return
    for (const k of keys) {
      const v = o[k]
      if (Array.isArray(v)) out.push(...v)
    }
    for (const v of Object.values(o)) walk(v)
  }
  walk(root)
  return out
}

function formatDuration(minutes: number | null): string | undefined {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return undefined
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h <= 0) return `${m}dk`
  return m > 0 ? `${h}s ${m}dk` : `${h}s`
}

function buildAllocateForm(
  searchRoot: Record<string, unknown>,
  leg: Record<string, unknown>,
  pkg: Record<string, unknown> | null,
): string {
  const searchId = pickStr(searchRoot, ['Id', 'id', 'SearchId', 'searchId'])
  const searchRef = pickStr(searchRoot, ['ReferenceId', 'referenceId', 'SearchReferenceId'])
  const legId = pickStr(leg, ['Id', 'id'])
  const legRef = pickStr(leg, ['ReferenceId', 'referenceId'])
  const pkgCode = pkg ? pickStr(pkg, ['Code', 'code', 'PackageCode', 'SelectedPackage', 'Id', 'id']) : ''

  const selectedLeg: Record<string, unknown> = {
    Id: legId,
    ReferenceId: legRef,
  }
  if (pkgCode) selectedLeg.SelectedPackage = pkgCode

  const form: Record<string, unknown> = {
    Id: searchId || legId,
    ReferenceId: searchRef || legRef,
    SelectedFlightLegs: [selectedLeg],
  }
  return JSON.stringify(form)
}

function parseLegOffer(
  searchRoot: Record<string, unknown>,
  leg: Record<string, unknown>,
  pkg: Record<string, unknown> | null,
  index: number,
): TurnaFlightOffer | null {
  const legId = pickStr(leg, ['Id', 'id'])
  const legRef = pickStr(leg, ['ReferenceId', 'referenceId'])
  if (!legId && !legRef) return null

  const origin =
    pickStr(leg, ['Origin', 'origin', 'DepartureAirport', 'From']) ||
    pickStr(asRecord(leg.Departure), ['Code', 'AirportCode']) ||
    pickStr(asRecord(leg.OriginPoint), ['Code'])
  const destination =
    pickStr(leg, ['Destination', 'destination', 'ArrivalAirport', 'To']) ||
    pickStr(asRecord(leg.Arrival), ['Code', 'AirportCode']) ||
    pickStr(asRecord(leg.DestinationPoint), ['Code'])

  const airline =
    asRecord(leg.Airline) ??
    asRecord(leg.Carrier) ??
    asRecord(leg.MarketingAirline) ??
    leg

  const price =
    pickNum(pkg, ['TotalPrice', 'totalPrice', 'GrandTotal', 'Price', 'TotalFare']) ??
    pickNum(leg, ['TotalPrice', 'totalPrice', 'Price', 'PriceSummary', 'TotalFare']) ??
    pickNum(searchRoot, ['PriceSummary', 'TotalFare', 'totalFare'])

  const dep = pickStr(leg, [
    'DepartureTime',
    'departureTime',
    'DepartureDateTime',
    'DepartureDate',
    'LocalDepartureTime',
  ])
  const arr = pickStr(leg, [
    'ArrivalTime',
    'arrivalTime',
    'ArrivalDateTime',
    'ArrivalDate',
    'LocalArrivalTime',
  ])
  const dur = pickNum(leg, ['DurationMinutes', 'durationMinutes', 'FlightDuration', 'Duration'])

  const stopsRaw = leg.StopCount ?? leg.stopCount ?? leg.NumberOfStops
  const stopCount =
    typeof stopsRaw === 'number'
      ? stopsRaw
      : typeof stopsRaw === 'string'
        ? parseInt(stopsRaw, 10) || 0
        : 0

  return {
    id: legId || `offer-${index}`,
    referenceId: legRef,
    origin,
    destination,
    departureTime: dep || null,
    arrivalTime: arr || null,
    durationMinutes: dur,
    airlineName:
      pickStr(airline, ['Name', 'name', 'AirlineName', 'Title']) ||
      pickStr(leg, ['AirlineName', 'airlineName']),
    airlineCode: pickStr(airline, ['Code', 'code', 'Iata', 'IATA']),
    stopCount: Number.isFinite(stopCount) ? stopCount : 0,
    price,
    currency: pickStr(pkg ?? leg, ['Currency', 'currency', 'CurrencyCode']) || 'TRY',
    cabinClass: pickStr(pkg ?? leg, ['CabinClass', 'cabinClass', 'Class']) || 'Economy',
    allocateForm: buildAllocateForm(searchRoot, leg, pkg),
  }
}

function collectLegOffers(
  searchRoot: Record<string, unknown>,
  legSources: unknown[],
  startIdx: number,
): { offers: TurnaFlightOffer[]; nextIdx: number } {
  const offers: TurnaFlightOffer[] = []
  let idx = startIdx
  for (const legRaw of legSources) {
    const leg = asRecord(legRaw)
    if (!leg) continue

    const packages = walkArrays(leg, ['Packages', 'Fares', 'BrandedFares', 'PackageList'])
    if (packages.length === 0) {
      const o = parseLegOffer(searchRoot, leg, null, idx++)
      if (o) offers.push(o)
      continue
    }

    for (const pkgRaw of packages) {
      const pkg = asRecord(pkgRaw)
      const o = parseLegOffer(searchRoot, leg, pkg, idx++)
      if (o) offers.push(o)
    }
  }
  return { offers, nextIdx: idx }
}

function parseCombinableLegsList(
  searchRoot: Record<string, unknown>,
  root: Record<string, unknown>,
): TurnaFlightOffer[] {
  const combos = root.CombinableLegsList
  if (!Array.isArray(combos)) return []

  const offers: TurnaFlightOffer[] = []
  let idx = 0
  for (const combo of combos) {
    const c = asRecord(combo)
    if (!c) continue

    const legSources = walkArrays(c, [
      'LegOptionsList',
      'Legs',
      'FlightLegs',
      'OutboundLegs',
      'Segments',
      'Items',
    ])
    if (legSources.length === 0 && pickStr(c, ['Origin', 'origin', 'Id', 'id'])) {
      legSources.push(c)
    }
    // AllocateForm.Id = CombinableLegsList öğesinin Id'si (V5 doküman)
    const batch = collectLegOffers(c, legSources, idx)
    offers.push(...batch.offers)
    idx = batch.nextIdx
  }
  return offers
}

export function parseTurnaSearchResponseUrl(turnaRaw: string): string {
  try {
    const r = asRecord(JSON.parse(turnaRaw))
    const u = pickStr(r, ['SearchResponseUrl', 'searchResponseUrl'])
    return u
  } catch {
    return ''
  }
}

/** Turna search JSON → teklif listesi */
export function parseTurnaSearchOffers(turnaRaw: string): TurnaFlightOffer[] {
  if (!turnaRaw?.trim()) return []
  let root: unknown
  try {
    root = JSON.parse(turnaRaw)
  } catch {
    return []
  }
  const r = asRecord(root)
  if (!r) return []

  const searchRoot =
    asRecord(r.SearchForm) ??
    asRecord(r.Data) ??
    asRecord(r.Result) ??
    asRecord(r.SearchResponse) ??
    r

  let offers: TurnaFlightOffer[] = []

  const combinable = parseCombinableLegsList(searchRoot, r)
  if (combinable.length > 0) offers.push(...combinable)

  const legs = walkArrays(root, ['FlightLegs', 'Legs', 'Offers', 'Results', 'Items'])
  const batch = collectLegOffers(searchRoot, legs, offers.length)
  offers.push(...batch.offers)

  // Fiyata göre sırala
  offers.sort((a, b) => (a.price ?? 9e15) - (b.price ?? 9e15))
  return offers
}

export function offerDurationLabel(offer: TurnaFlightOffer): string | undefined {
  return formatDuration(offer.durationMinutes)
}

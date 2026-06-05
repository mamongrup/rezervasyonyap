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
      const t = pickNum(nested, [
        'TotalFare',
        'totalFare',
        'Total',
        'total',
        'Amount',
        'amount',
        'GrandTotal',
        'grandTotal',
      ])
      if (t != null) return t
    }
  }
  return null
}

/** Turna V5: fiyat çoğunlukla PriceSummary.TotalFare veya combo/leg kökünde */
function extractOfferPrice(
  searchRoot: Record<string, unknown>,
  leg: Record<string, unknown>,
  pkg: Record<string, unknown> | null,
): number | null {
  const fromPkg = pickNum(pkg, ['TotalPrice', 'totalPrice', 'GrandTotal', 'Price', 'TotalFare'])
  if (fromPkg != null) return fromPkg

  const fromLeg = pickNum(leg, [
    'TotalPrice',
    'totalPrice',
    'GrandTotal',
    'Price',
    'PriceSummary',
    'TotalFare',
  ])
  if (fromLeg != null) return fromLeg

  const fromCombo = pickNum(searchRoot, [
    'TotalPrice',
    'totalPrice',
    'GrandTotal',
    'PriceSummary',
    'TotalFare',
    'totalFare',
  ])
  if (fromCombo != null) return fromCombo

  const pkgDetails = asRecord(leg.PackageDetails)
  return pickNum(pkgDetails, ['TotalPrice', 'totalPrice', 'PriceSummary', 'TotalFare'])
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

const AIRLINE_NAMES: Record<string, string> = {
  TK: 'Turkish Airlines',
  PC: 'Pegasus',
  VF: 'Ajet',
  XQ: 'SunExpress',
}

function firstSegment(leg: Record<string, unknown>): Record<string, unknown> | null {
  const segs = leg.Segments
  if (!Array.isArray(segs) || segs.length === 0) return null
  return asRecord(segs[0])
}

function parseDurationMinutes(leg: Record<string, unknown>): number | null {
  const n = pickNum(leg, ['DurationMinutes', 'durationMinutes', 'FlightDuration'])
  if (n != null) return n
  const raw = pickStr(leg, ['Duration', 'duration'])
  const hm = raw.match(/^(\d+):(\d{1,2})$/)
  if (hm) return parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10)
  const seg = firstSegment(leg)
  const details = seg ? asRecord(seg.Details) : null
  const fromDetails = details ? pickStr(details, ['Duration', 'duration']) : ''
  const hm2 = fromDetails.match(/^(\d+):(\d{1,2})$/)
  if (hm2) return parseInt(hm2[1], 10) * 60 + parseInt(hm2[2], 10)
  return null
}

function airlineFromLeg(leg: Record<string, unknown>): { code: string; name: string } {
  const seg = firstSegment(leg)
  let code =
    pickStr(seg, ['MarketingAirline', 'OperatingAirline']) ||
    pickStr(leg, ['MarketingAirline', 'OperatingAirline', 'AirlineCode', 'airlineCode'])
  const nested =
    asRecord(leg.Airline) ?? asRecord(leg.Carrier) ?? asRecord(leg.MarketingAirline)
  if (!code && nested) code = pickStr(nested, ['Code', 'code', 'Iata', 'IATA'])
  const name =
    pickStr(nested, ['Name', 'name', 'AirlineName', 'Title']) ||
    pickStr(leg, ['AirlineName', 'airlineName']) ||
    (code ? AIRLINE_NAMES[code.toUpperCase()] ?? code : '')
  return { code: code.toUpperCase(), name: name || code }
}

function legsFromCombinable(combo: Record<string, unknown>): unknown[] {
  const out: unknown[] = []
  const opts = combo.LegOptionsList
  if (Array.isArray(opts)) {
    for (const optRaw of opts) {
      const opt = asRecord(optRaw)
      if (!opt) continue
      const legs = opt.Legs
      if (Array.isArray(legs)) out.push(...legs)
    }
  }
  if (out.length > 0) return out
  return walkArrays(combo, ['Legs', 'FlightLegs', 'OutboundLegs', 'Segments', 'Items'])
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

  const seg = firstSegment(leg)
  const segCount = Array.isArray(leg.Segments) ? leg.Segments.length : 0
  const { code: airlineCode, name: airlineName } = airlineFromLeg(leg)

  const origin =
    pickStr(leg, ['Origin', 'origin', 'DepartureAirport', 'From']) ||
    pickStr(seg, ['Origin', 'origin']) ||
    pickStr(asRecord(leg.Departure), ['Code', 'AirportCode']) ||
    pickStr(asRecord(leg.OriginPoint), ['Code'])
  const destination =
    pickStr(leg, ['Destination', 'destination', 'ArrivalAirport', 'To']) ||
    pickStr(seg, ['Destination', 'destination']) ||
    pickStr(asRecord(leg.Arrival), ['Code', 'AirportCode']) ||
    pickStr(asRecord(leg.DestinationPoint), ['Code'])

  const price = extractOfferPrice(searchRoot, leg, pkg)

  const dep =
    pickStr(leg, [
      'DepartureTime',
      'departureTime',
      'DepartureDateTime',
      'DepartureDate',
      'LocalDepartureTime',
    ]) ||
    pickStr(seg, ['DepartureDate', 'DepartureTime', 'LocalDepartureTime', 'DepartureDateTime'])
  const arr =
    pickStr(leg, [
      'ArrivalTime',
      'arrivalTime',
      'ArrivalDateTime',
      'ArrivalDate',
      'LocalArrivalTime',
    ]) ||
    pickStr(seg, ['ArrivalDate', 'ArrivalTime', 'LocalArrivalTime', 'ArrivalDateTime'])
  const dur = parseDurationMinutes(leg)

  const stopsRaw = leg.StopCount ?? leg.stopCount ?? leg.NumberOfStops
  let stopCount =
    typeof stopsRaw === 'number'
      ? stopsRaw
      : typeof stopsRaw === 'string'
        ? parseInt(stopsRaw, 10) || 0
        : 0
  if (stopCount === 0 && segCount > 1) stopCount = segCount - 1

  return {
    id: legId || `offer-${index}`,
    referenceId: legRef,
    origin,
    destination,
    departureTime: dep || null,
    arrivalTime: arr || null,
    durationMinutes: dur,
    airlineName,
    airlineCode,
    stopCount: Number.isFinite(stopCount) ? stopCount : 0,
    price,
    currency:
      pickStr(pkg ?? leg, ['Currency', 'currency', 'CurrencyCode']) ||
      pickStr(searchRoot, ['Currency', 'currency']) ||
      'TRY',
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

    let legSources = legsFromCombinable(c)
    if (legSources.length === 0 && pickStr(c, ['Origin', 'origin', 'Id', 'id'])) {
      legSources = [c]
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

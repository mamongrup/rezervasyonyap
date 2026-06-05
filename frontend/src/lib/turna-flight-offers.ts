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
  originCity: string
  destinationCity: string
  originAirportLabel: string
  destinationAirportLabel: string
  departureTime: string | null
  arrivalTime: string | null
  durationMinutes: number | null
  airlineName: string
  airlineCode: string
  stopCount: number
  price: number | null
  currency: string
  cabinClass: string
  flightNumber: string
  baggageLabel: string
  /** Kabin bagajı (kg metni, örn. "8") */
  handBaggageKg?: string
  /** Kayıtlı bagaj (kg metni, örn. "15") */
  checkedBaggageKg?: string
  arrivesNextDay: boolean
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

/** Uçuş numarasından IATA (TK2438 → TK) */
export function airlineCodeFromFlightNumber(flightNumber: string | undefined | null): string {
  const raw = String(flightNumber ?? '').trim().toUpperCase()
  const m = raw.match(/^([A-Z]{2,3})\d/)
  return m?.[1] ?? ''
}

function airlineFromLeg(leg: Record<string, unknown>): { code: string; name: string } {
  const seg = firstSegment(leg)
  let code =
    pickStr(seg, ['MarketingAirline', 'OperatingAirline']) ||
    pickStr(leg, ['MarketingAirline', 'OperatingAirline', 'AirlineCode', 'airlineCode'])
  const nested =
    asRecord(leg.Airline) ??
    asRecord(leg.Carrier) ??
    asRecord(leg.MarketingAirline) ??
    asRecord(seg?.MarketingAirline) ??
    asRecord(seg?.OperatingAirline)
  if (!code && nested) code = pickStr(nested, ['Code', 'code', 'Iata', 'IATA'])
  if (!code && seg) {
    code = airlineCodeFromFlightNumber(
      pickStr(seg, ['FlightNo', 'FlightNumber', 'FlightCode', 'Number']),
    )
  }
  const name =
    pickStr(nested, ['Name', 'name', 'AirlineName', 'Title']) ||
    pickStr(leg, ['AirlineName', 'airlineName']) ||
    (code ? AIRLINE_NAMES[code.toUpperCase()] ?? code : '')
  return { code: code.toUpperCase(), name: name || code }
}

/** Arama yanıtından teklif bul (checkout snapshot tamamlama) */
export function findTurnaOfferInRaw(
  turnaRaw: string,
  match?: { id?: string; referenceId?: string },
): TurnaFlightOffer | null {
  const offers = parseTurnaSearchOffers(turnaRaw)
  if (offers.length === 0) return null
  if (match?.id) {
    const byId = offers.find((o) => o.id === match.id)
    if (byId) return byId
  }
  if (match?.referenceId) {
    const byRef = offers.find((o) => o.referenceId === match.referenceId)
    if (byRef) return byRef
  }
  return offers[0] ?? null
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

/** Turna tarzı süre: 1sa 20dk */
export function offerDurationLabelTurna(
  offer: Pick<TurnaFlightOffer, 'durationMinutes'>,
  locale = 'tr',
): string | undefined {
  const minutes = offer.durationMinutes
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return undefined
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (locale === 'tr') {
    if (h <= 0) return `${m}dk`
    return m > 0 ? `${h}sa ${m}dk` : `${h}sa`
  }
  if (h <= 0) return `${m}m`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function parseInstant(value: string): Date | null {
  const t = value.trim()
  if (!t) return null
  const d = new Date(t.includes('T') ? t : t.replace(' ', 'T'))
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatTurnaClock(value: string | null | undefined): string {
  if (!value) return '--:--'
  const d = parseInstant(value)
  if (!d) {
    const hm = String(value).match(/(\d{1,2}):(\d{2})/)
    return hm ? `${hm[1].padStart(2, '0')}:${hm[2]}` : '--:--'
  }
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function formatTurnaDateLabel(value: string | null | undefined, locale = 'tr'): string {
  if (!value) return ''
  const d = parseInstant(value)
  if (!d) return ''
  const loc = locale === 'tr' ? 'tr-TR' : 'en-GB'
  return d.toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short' })
}

function arrivesNextDay(dep: string | null, arr: string | null): boolean {
  const d0 = dep ? parseInstant(dep) : null
  const d1 = arr ? parseInstant(arr) : null
  if (!d0 || !d1) return false
  return d0.toDateString() !== d1.toDateString()
}

function airportPoint(
  seg: Record<string, unknown> | null,
  leg: Record<string, unknown>,
  side: 'Origin' | 'Destination',
): { code: string; city: string; label: string } {
  const point =
    asRecord(seg?.[side]) ??
    asRecord(seg?.[`${side}Point`]) ??
    asRecord(leg[side]) ??
    asRecord(leg[`${side}Point`]) ??
    asRecord(side === 'Origin' ? leg.Departure : leg.Arrival)
  const code =
    pickStr(point, ['Code', 'AirportCode', 'Iata', 'IATA']) ||
    pickStr(seg, [side, `${side}Code`]) ||
    pickStr(leg, [side, `${side}Code`, side === 'Origin' ? 'From' : 'To'])
  const city = pickStr(point, ['CityName', 'City', 'city', 'CityTitle', 'Metropolis'])
  const name = pickStr(point, ['Name', 'AirportName', 'Title', 'Label', 'AirportTitle'])
  const label = name || city || code
  return { code: code.toUpperCase(), city, label }
}

function flightNumberFromLeg(seg: Record<string, unknown> | null, leg: Record<string, unknown>): string {
  const raw =
    pickStr(seg, ['FlightNumber', 'FlightNo', 'Number', 'FlightCode']) ||
    pickStr(leg, ['FlightNumber', 'FlightNo', 'Number'])
  if (raw) return raw.toUpperCase()
  const airline = pickStr(seg, ['MarketingAirline', 'OperatingAirline']) || pickStr(leg, ['MarketingAirline'])
  const num = pickStr(seg, ['FlightNo', 'FlightNumber']) || pickStr(asRecord(seg?.Details), ['FlightNumber'])
  if (airline && num) return `${airline}${num}`.toUpperCase()
  return ''
}

function baggageAllowanceFromLeg(
  leg: Record<string, unknown>,
  pkg: Record<string, unknown> | null,
): { handKg?: string; checkedKg?: string } {
  const pkgRow =
    pkg ??
    (Array.isArray(leg.PackageDetails) && leg.PackageDetails.length > 0
      ? asRecord(leg.PackageDetails[0])
      : null)

  if (pkgRow) {
    const allowances = pkgRow.BaggageAllowances
    if (Array.isArray(allowances) && allowances.length > 0) {
      const ba = asRecord(allowances[0])
      const handKg = pickStr(ba, ['HandBaggageText', 'HandBaggage', 'CabinBaggageText'])
      const checkedKg = pickStr(ba, ['BaggageText', 'CheckedBaggageText'])
      if (handKg || checkedKg) return { handKg: handKg || undefined, checkedKg: checkedKg || undefined }
    }
  }

  const seg = firstSegment(leg)
  const details = seg ? asRecord(seg.Details) : null
  const segAllowances = details?.BaggageAllowance
  if (Array.isArray(segAllowances) && segAllowances.length > 0) {
    const ba = asRecord(segAllowances[0])
    const kg = pickNum(ba, ['Amount', 'AmountNew', 'Weight'])
    if (kg != null) return { checkedKg: String(kg) }
  }

  return {}
}

/** TK + 2438 → TK2438 */
export function formatFlightNumberDisplay(
  airlineCode: string | undefined | null,
  flightNumber: string | undefined | null,
): string {
  const fn = String(flightNumber ?? '').trim().toUpperCase()
  if (!fn) return ''
  if (/^[A-Z]{2,3}\d/.test(fn)) return fn
  const ac = String(airlineCode ?? '').trim().toUpperCase()
  return ac ? `${ac}${fn}` : fn
}

function baggageLabelFromLeg(
  leg: Record<string, unknown>,
  pkg: Record<string, unknown> | null,
): string {
  const structured = baggageAllowanceFromLeg(leg, pkg)
  if (structured.handKg && structured.checkedKg) {
    return `1x kabin (${structured.handKg} kg) · 1x ${structured.checkedKg} kg`
  }
  if (structured.checkedKg) return `1x ${structured.checkedKg} kg`
  if (structured.handKg) return `1x kabin (${structured.handKg} kg)`
  const direct =
    pickStr(pkg ?? leg, [
      'Baggage',
      'BaggageAllowance',
      'BaggageSummary',
      'AllowedBaggage',
      'CheckedBaggage',
    ]) ||
    pickStr(asRecord(leg.PackageDetails), ['Baggage', 'BaggageAllowance'])
  if (direct) return direct

  const allowance = asRecord(pkg?.BaggageAllowance) ?? asRecord(leg.BaggageAllowance)
  if (allowance) {
    const pieces = pickNum(allowance, ['Piece', 'Pieces', 'Count', 'Quantity'])
    const kg = pickNum(allowance, ['Weight', 'Kg', 'Kilograms', 'MaxWeight'])
    if (pieces != null && kg != null) return `${pieces}x${kg}kg`
    if (kg != null) return `${kg}kg`
    if (pieces != null) return `${pieces}x`
  }

  const cabin = pickNum(leg, ['CabinBaggageWeight', 'HandBaggageWeight'])
  const checked = pickNum(leg, ['CheckedBaggageWeight', 'FreeBaggageWeight'])
  if (checked != null) return `1x${checked}kg`
  if (cabin != null) return `1x kabin ${cabin}kg`
  return ''
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

  const fromPoint = airportPoint(seg, leg, 'Origin')
  const toPoint = airportPoint(seg, leg, 'Destination')
  const origin =
    fromPoint.code ||
    pickStr(leg, ['Origin', 'origin', 'DepartureAirport', 'From']) ||
    pickStr(seg, ['Origin', 'origin'])
  const destination =
    toPoint.code ||
    pickStr(leg, ['Destination', 'destination', 'ArrivalAirport', 'To']) ||
    pickStr(seg, ['Destination', 'destination'])

  const price = extractOfferPrice(searchRoot, leg, pkg)

  const dep =
    pickStr(leg, [
      'DepartureDate',
      'DepartureDateTime',
      'DepartureTime',
      'departureTime',
      'LocalDepartureTime',
    ]) ||
    pickStr(seg, ['DepartureDate', 'DepartureDateTime', 'DepartureTime', 'LocalDepartureTime'])
  const arr =
    pickStr(leg, [
      'ArrivalDate',
      'ArrivalDateTime',
      'ArrivalTime',
      'arrivalTime',
      'LocalArrivalTime',
    ]) ||
    pickStr(seg, ['ArrivalDate', 'ArrivalDateTime', 'ArrivalTime', 'LocalArrivalTime'])
  const dur = parseDurationMinutes(leg)

  const stopsRaw = leg.StopCount ?? leg.stopCount ?? leg.NumberOfStops
  let stopCount =
    typeof stopsRaw === 'number'
      ? stopsRaw
      : typeof stopsRaw === 'string'
        ? parseInt(stopsRaw, 10) || 0
        : 0
  if (stopCount === 0 && segCount > 1) stopCount = segCount - 1

  const depIso = dep || null
  const arrIso = arr || null

  return {
    id: legId || `offer-${index}`,
    referenceId: legRef,
    origin,
    destination,
    originCity: fromPoint.city,
    destinationCity: toPoint.city,
    originAirportLabel: fromPoint.label,
    destinationAirportLabel: toPoint.label,
    departureTime: depIso,
    arrivalTime: arrIso,
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
    flightNumber: flightNumberFromLeg(seg, leg),
    ...(() => {
      const bag = baggageAllowanceFromLeg(leg, pkg)
      return {
        baggageLabel: baggageLabelFromLeg(leg, pkg),
        handBaggageKg: bag.handKg,
        checkedBaggageKg: bag.checkedKg,
      }
    })(),
    arrivesNextDay: arrivesNextDay(depIso, arrIso),
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

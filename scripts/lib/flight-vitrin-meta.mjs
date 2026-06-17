/**
 * Turna + Kplus (Travelrobot) uçuş yanıtları → vitrin `listing_meta` alanları.
 */

function pickText(obj, ...keys) {
  for (const k of keys) {
    const v = String(obj?.[k] ?? '').trim()
    if (v) return v
  }
  return ''
}

function parseIntField(raw) {
  const m = String(raw ?? '').match(/(\d+)/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function formatDurationMinutes(totalMin) {
  const n = parseIntField(totalMin)
  if (n == null || n <= 0) return ''
  const h = Math.floor(n / 60)
  const m = n % 60
  if (h > 0 && m > 0) return `${h}s ${m}d`
  if (h > 0) return `${h}s`
  return `${m}d`
}

function collectKplusSegments(flight) {
  const legs = flight?.Legs ?? flight?.legs ?? []
  const segments = []
  for (const leg of legs) {
    const alts = leg?.AlternativeLegs ?? leg?.alternativeLegs ?? [leg]
    for (const alt of alts) {
      const segs = alt?.Segments ?? alt?.segments ?? []
      for (const seg of segs) segments.push(seg)
    }
  }
  return segments
}

/** Kplus SearchAvailability teklif satırı */
export function extractKplusFlightVitrin(flight) {
  const segments = collectKplusSegments(flight)
  const first = segments[0] ?? flight
  const op = first?.OperatingAirline ?? first?.operatingAirline ?? {}
  const mk = first?.MarketingAirline ?? first?.marketingAirline ?? {}
  const airlineCode = pickText(op, 'Code', 'code') || pickText(mk, 'Code', 'code')
  const airlineName = pickText(op, 'Name', 'name') || pickText(mk, 'Name', 'name')
  const stopCount = Math.max(0, segments.length - 1)
  const durationMin =
    parseIntField(first?.Duration ?? first?.duration) ??
    parseIntField(flight?.TotalFlightTimeInMinute ?? flight?.totalFlightTimeInMinute) ??
    parseIntField(flight?.Duration ?? flight?.duration)
  return {
    flight_airline_code: airlineCode,
    flight_airline_name: airlineName,
    flight_stop_count: String(stopCount),
    flight_duration: formatDurationMinutes(durationMin),
    flight_provider: 'travelrobot',
  }
}

function walkTurnaNodes(node, out = []) {
  if (node == null) return out
  if (Array.isArray(node)) {
    for (const item of node) walkTurnaNodes(item, out)
    return out
  }
  if (typeof node !== 'object') return out
  out.push(node)
  for (const v of Object.values(node)) walkTurnaNodes(v, out)
  return out
}

function extractTurnaAirlineFromSearch(search) {
  const root = search?.search ?? search ?? {}
  for (const node of walkTurnaNodes(root)) {
    const code = pickText(node, 'AirlineCode', 'airlineCode', 'CarrierCode', 'carrierCode')
    const name = pickText(node, 'AirlineName', 'airlineName', 'CarrierName', 'carrierName')
    if (code || name) return { code, name }
  }
  return { code: '', name: '' }
}

function extractTurnaStopsFromSearch(search) {
  const root = search?.search ?? search ?? {}
  for (const node of walkTurnaNodes(root)) {
    const stops = node?.StopCount ?? node?.stopCount ?? node?.NumberOfStops ?? node?.numberOfStops
    if (stops != null && String(stops).trim() !== '') {
      const n = parseIntField(stops)
      if (n != null) return n
    }
  }
  return 0
}

/** Turna arama snapshot (`turna/snapshot`) */
export function extractTurnaFlightVitrin(snapshot) {
  const search = snapshot?.search ?? snapshot ?? {}
  const { code, name } = extractTurnaAirlineFromSearch(snapshot)
  const stopCount = extractTurnaStopsFromSearch(snapshot)
  return {
    flight_airline_code: code,
    flight_airline_name: name,
    flight_stop_count: String(stopCount),
    flight_duration: '',
    flight_provider: 'turna',
  }
}

export async function mergeListingMetaFlightFields(pgClient, listingId, fields) {
  const cleaned = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v != null && String(v).trim() !== ''),
  )
  if (!Object.keys(cleaned).length) return
  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'listing_meta', 'v1', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
       value_json = COALESCE(listing_attributes.value_json, '{}'::jsonb) || EXCLUDED.value_json`,
    [listingId, JSON.stringify(cleaned)],
  )
}

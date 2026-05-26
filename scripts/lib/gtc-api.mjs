/**
 * GTC Reservation API — Postman: https://documenter.getpostman.com/view/35375466/2sBXqQGJC8
 *
 * Ortam:
 *   GTC_BASE_URL   (ör. https://api.gtcreservation.com)
 *   GTC_AGENCY_ID
 *   GTC_PASSWORD
 */

const DEFAULT_BASE = 'https://api.gtcreservation.com'

export function loadGtcConfig() {
  const baseUrl = (process.env.GTC_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '')
  const agencyId = process.env.GTC_AGENCY_ID || ''
  const password = process.env.GTC_PASSWORD || ''
  if (!agencyId || !password) {
    throw new Error('GTC_AGENCY_ID ve GTC_PASSWORD ortam değişkenleri gerekli.')
  }
  return { baseUrl, agencyId, password }
}

export function authBody(extra = {}) {
  const { agencyId, password } = loadGtcConfig()
  return { AgencyId: agencyId, Password: password, ...extra }
}

function joinUrl(base, path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

export async function gtcRequest(method, path, body = null) {
  const { baseUrl } = loadGtcConfig()
  const url = joinUrl(baseUrl, path)
  const init = {
    method,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  }
  if (body != null && method !== 'GET') {
    init.body = JSON.stringify(body)
  }
  const res = await fetch(url, init)
  const text = await res.text()
  let json = null
  if (text.trim()) {
    try {
      json = JSON.parse(text)
    } catch {
      throw new Error(`GTC ${path}: geçersiz JSON (${res.status})`)
    }
  }
  if (!res.ok) {
    const msg =
      json?.Message || json?.message || json?.Error || json?.error || text.slice(0, 200) || res.statusText
    throw new Error(`GTC ${path}: HTTP ${res.status} — ${msg}`)
  }
  return json
}

export function gtcPost(path, body) {
  return gtcRequest('POST', path, body)
}

export function gtcGet(path) {
  return gtcRequest('GET', path)
}

/** API yanıtındaki asıl gövde (sarmalayıcı varyantları). */
export function unwrapPayload(json) {
  if (json == null || typeof json !== 'object') return json
  if (json.Data != null) return json.Data
  if (json.data != null) return json.data
  if (json.Result != null) return json.Result
  if (json.result != null) return json.result
  return json
}

export function pickHotelRows(payload) {
  const p = unwrapPayload(payload)
  if (Array.isArray(p)) return p
  if (!p || typeof p !== 'object') return []
  const keys = ['Hotels', 'hotels', 'HotelList', 'hotelList', 'Items', 'items', 'Results', 'results']
  for (const k of keys) {
    if (Array.isArray(p[k])) return p[k]
  }
  return []
}

export function hotelItemId(row) {
  if (!row || typeof row !== 'object') return ''
  return String(
    row.ItemId ?? row.itemId ?? row.HotelId ?? row.hotelId ?? row.Id ?? row.id ?? '',
  ).trim()
}

export function hotelDisplayFields(row) {
  const name = String(
    row.HotelName ?? row.hotelName ?? row.Name ?? row.name ?? row.Title ?? row.title ?? 'Otel',
  ).trim()
  const city = String(row.CityName ?? row.cityName ?? row.City ?? row.city ?? '').trim()
  const country = String(row.CountryName ?? row.countryName ?? row.Country ?? row.country ?? '').trim()
  const star = row.StarRating ?? row.starRating ?? row.Star ?? row.star ?? null
  const desc = String(row.Description ?? row.description ?? row.Summary ?? row.summary ?? '').trim()
  return { name, city, country, star, desc }
}

/** POST /Hotel/Hotels — sayfalı katalog */
export async function fetchHotelCatalogPage(page, rowPerPage = 50) {
  return gtcPost('/Hotel/Hotels', authBody({ Page: page, RowPerPage: rowPerPage }))
}

/** POST /Hotel/Detail — tek otel (SearchId opsiyonel; katalog detayı için boş bırakılabilir). */
export async function fetchHotelDetail(itemId, opts = {}) {
  const checkIn = opts.checkInDate || addDaysISO(30)
  const checkOut = opts.checkOutDate || addDaysISO(32)
  return gtcPost(
    '/Hotel/Detail',
    authBody({
      CheckInDate: checkIn,
      CheckOutDate: checkOut,
      Adult: opts.adult ?? 2,
      Child: opts.child ?? 0,
      ChildAges: opts.childAges ?? null,
      ItemId: String(itemId),
      SearchId: opts.searchId ?? '',
      SubCallerId: opts.subCallerId ?? null,
    }),
  )
}

/** POST /Flight/AirPortProfile — kimlik + havalimanı listesi doğrulama */
export async function fetchAirPortProfile() {
  return gtcPost('/Flight/AirPortProfile', authBody())
}

/** POST /Flight/AirLowSearch — rota arama (örnek fiyat / müsaitlik) */
export async function fetchAirLowSearch(route, opts = {}) {
  const departure = opts.departureDate || addDaysISO(14)
  return gtcPost(
    '/Flight/AirLowSearch',
    authBody({
      AdultCount: opts.adultCount ?? 1,
      ChildCount: opts.childCount ?? 0,
      InfantCount: opts.infantCount ?? 0,
      TravelPreference: opts.travelPreference ?? {
        CabinType: 1,
        MaxStopsQuantity: 3,
        VendorPreferenceCodes: null,
      },
      DepartureDate: departure,
      ReturnDate: opts.returnDate ?? null,
      Origin: route.origin,
      OriginType: route.originType ?? 1,
      Destination: route.destination,
      DestinationType: route.destinationType ?? 1,
      Currency: opts.currency ?? 'TRY',
      Lang: opts.lang ?? 'tr-TR',
      SubCallerId: opts.subCallerId ?? null,
    }),
  )
}

function addDaysISO(daysAhead) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + daysAhead)
  return d.toISOString().slice(0, 10)
}

/**
 * Travelrobot / KPlus API istemcisi.
 * Kimlik: panel site_settings.listing_api_providers.travelrobot veya TRAVELROBOT_* env.
 */

import { loadTravelrobotConfigFromDb } from './listing-api-providers-db.mjs'

export async function loadTravelrobotConfig() {
  const cfg = await loadTravelrobotConfigFromDb()
  if (!cfg.channelCode || !cfg.channelPassword) {
    throw new Error(
      'Travelrobot ChannelCode/Password yok — panel: /manage/admin/settings/listing-api veya TRAVELROBOT_* env',
    )
  }
  return cfg
}

function joinUrl(base, path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

export async function createTravelrobotToken(cfg) {
  const url = joinUrl(cfg.baseUrl, '/General.svc/Rest/Json/CreateTokenV2')
  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channelCredential: {
        ChannelCode: cfg.channelCode,
        ChannelPassword: cfg.channelPassword,
      },
    }),
  })
  const text = await res.text()
  let json = null
  if (text.trim()) {
    try {
      json = JSON.parse(text)
    } catch {
      throw new Error(`CreateTokenV2: geçersiz JSON (HTTP ${res.status})`)
    }
  }
  if (!res.ok || json?.HasError) {
    const msg = json?.ErrorMessage || json?.Message || text.slice(0, 200) || res.statusText
    throw new Error(`CreateTokenV2: ${msg}`)
  }
  const token =
    json?.Result?.TokenCode || json?.TokenCode || json?.tokenCode || ''
  if (!token) throw new Error('CreateTokenV2: TokenCode yok')
  return { tokenCode: String(token), raw: json }
}

/** POST Tour.svc/Rest/Json/SearchTour — iskelet */
export async function searchTours(cfg, tokenCode, opts = {}) {
  const url = joinUrl(cfg.baseUrl, '/Tour.svc/Rest/Json/SearchTour')
  const start = opts.startDate || formatDate(addDays(30))
  const end = opts.endDate || formatDate(addDays(395))
  const body = {
    filter: {
      Token: { TokenCode: tokenCode },
      SearchType: 0,
      SearchValues: null,
      StartDate: start,
      EndDate: end,
      AdvancedOptions: {
        Tour: { OnRequest: true },
        ProviderType: 0,
        PriceCalculationType: 0,
        SearchModuleType: 0,
        MaxResponseTime: 0,
        LanguageCode: 'tr',
      },
    },
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json = null
  if (text.trim()) json = JSON.parse(text)
  if (!res.ok || json?.HasError) {
    const msg = json?.ErrorMessage || text.slice(0, 200) || res.statusText
    throw new Error(`SearchTour: ${msg}`)
  }
  return json
}

function addDays(n) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + n)
  return d
}

function formatDate(d) {
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}.${mm}.${yyyy}`
}

export function pickTourRows(payload) {
  const p = payload?.Result ?? payload?.result ?? payload
  if (Array.isArray(p)) return p
  if (!p || typeof p !== 'object') return []
  for (const k of ['Tours', 'tours', 'Items', 'items', 'SearchResults', 'searchResults']) {
    if (Array.isArray(p[k])) return p[k]
  }
  return []
}

// ── Otel arama ────────────────────────────────────────────────────────────

/**
 * KPlus Hotel.svc/Rest/Json/GetHotelList — otel listesi.
 * Endpoint adı sağlayıcıya göre değişebilir; alternatifler:
 *   /Hotel.svc/Rest/Json/SearchHotel
 *   /Hotel.svc/Rest/Json/GetHotels
 *   /Hotel.svc/Rest/Json/GetHotelList
 */
export async function searchHotels(cfg, tokenCode, opts = {}) {
  const url = joinUrl(cfg.baseUrl, opts.endpoint ?? '/Hotel.svc/Rest/Json/GetHotelList')
  const checkin = opts.checkInDate || formatDate(addDays(30))
  const checkout = opts.checkOutDate || formatDate(addDays(37))
  const body = {
    filter: {
      Token: { TokenCode: tokenCode },
      SearchType: 0,
      CheckInDate: checkin,
      CheckOutDate: checkout,
      ...(opts.destinationId != null && { DestinationId: opts.destinationId }),
      AdvancedOptions: {
        ProviderType: 0,
        LanguageCode: opts.languageCode ?? 'tr',
        MaxResponseTime: 0,
      },
    },
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json = null
  if (text.trim()) json = JSON.parse(text)
  if (!res.ok || json?.HasError) {
    const msg = json?.ErrorMessage || text.slice(0, 200) || res.statusText
    throw new Error(`GetHotelList: ${msg}`)
  }
  return json
}

export function pickHotelRows(payload) {
  const p = payload?.Result ?? payload?.result ?? payload
  if (Array.isArray(p)) return p
  if (!p || typeof p !== 'object') return []
  for (const k of ['Hotels', 'hotels', 'HotelList', 'hotelList', 'Items', 'items', 'Results', 'results']) {
    if (Array.isArray(p[k])) return p[k]
  }
  return []
}

// ── Uçuş arama ────────────────────────────────────────────────────────────

/**
 * KPlus Flight.svc/Rest/Json/GetFlightList — uçuş listesi.
 * Alternatif endpoint adları:
 *   /Flight.svc/Rest/Json/SearchFlight
 *   /Flight.svc/Rest/Json/GetAvailableFlights
 */
export async function searchFlights(cfg, tokenCode, opts = {}) {
  const url = joinUrl(cfg.baseUrl, opts.endpoint ?? '/Flight.svc/Rest/Json/GetFlightList')
  const departure = opts.departureDate || formatDate(addDays(30))
  const body = {
    filter: {
      Token: { TokenCode: tokenCode },
      SearchType: 0,
      DepartureDate: departure,
      ...(opts.originCode && { OriginCode: opts.originCode }),
      ...(opts.destinationCode && { DestinationCode: opts.destinationCode }),
      AdvancedOptions: {
        ProviderType: 0,
        LanguageCode: opts.languageCode ?? 'tr',
        MaxResponseTime: 0,
      },
    },
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json = null
  if (text.trim()) json = JSON.parse(text)
  if (!res.ok || json?.HasError) {
    const msg = json?.ErrorMessage || text.slice(0, 200) || res.statusText
    throw new Error(`GetFlightList: ${msg}`)
  }
  return json
}

export function pickFlightRows(payload) {
  const p = payload?.Result ?? payload?.result ?? payload
  if (Array.isArray(p)) return p
  if (!p || typeof p !== 'object') return []
  for (const k of ['Flights', 'flights', 'FlightList', 'flightList', 'Items', 'items', 'Results', 'results']) {
    if (Array.isArray(p[k])) return p[k]
  }
  return []
}

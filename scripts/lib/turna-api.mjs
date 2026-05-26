/**
 * Turna uçak API — Postman: Desktop/turna/
 * Docs: docs/API-PROVIDERS-NOTES.md § Turna
 *
 * Ortam:
 *   TURNA_BASE_URL   (varsayılan https://apitest.turna.com)
 *   TURNA_API_KEY
 *   TURNA_COUNTRY_CODE (varsayılan TR)
 *   TURNA_CURRENCY_CODE (varsayılan TRY)
 *   TURNA_LANGUAGE_CODE (varsayılan tr)
 */

const DEFAULT_BASE = 'https://apitest.turna.com'

export function loadTurnaConfig() {
  const baseUrl = (process.env.TURNA_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '')
  const apiKey = (process.env.TURNA_API_KEY || '').trim()
  if (!apiKey) throw new Error('TURNA_API_KEY ortam değişkeni gerekli.')
  return {
    baseUrl,
    apiKey,
    countryCode: (process.env.TURNA_COUNTRY_CODE || 'TR').trim(),
    currencyCode: (process.env.TURNA_CURRENCY_CODE || 'TRY').trim(),
    languageCode: (process.env.TURNA_LANGUAGE_CODE || 'tr').trim(),
  }
}

export function loginForm(extra = {}) {
  const cfg = loadTurnaConfig()
  return {
    ApiKey: cfg.apiKey,
    CountryCode: cfg.countryCode,
    CurrencyCode: cfg.currencyCode,
    LanguageCode: cfg.languageCode,
    ...extra,
  }
}

function joinUrl(base, path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

function readSessionFromHeaders(headers) {
  const sessionId =
    headers.get('Turna-Session-Id') ||
    headers.get('turna-session-id') ||
    headers.get('TURNA-SESSION-ID') ||
    ''
  const sessionToken =
    headers.get('Turna-Session-Token') ||
    headers.get('turna-session-token') ||
    headers.get('TURNA-SESSION-TOKEN') ||
    ''
  return {
    sessionId: String(sessionId).trim(),
    sessionToken: String(sessionToken).trim(),
  }
}

export async function turnaRequest(method, path, body = null, extraHeaders = {}) {
  const { baseUrl } = loadTurnaConfig()
  const url = joinUrl(baseUrl, path)
  const init = {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  }
  if (body != null && method !== 'GET') init.body = JSON.stringify(body)
  const res = await fetch(url, init)
  const text = await res.text()
  let json = null
  if (text.trim()) {
    try {
      json = JSON.parse(text)
    } catch {
      const snippet = text.replace(/\s+/g, ' ').slice(0, 240)
      throw new Error(
        `Turna ${path}: geçersiz JSON (HTTP ${res.status})${snippet ? ` — ${snippet}` : ''}`,
      )
    }
  }
  const session = readSessionFromHeaders(res.headers)
  if (!res.ok) {
    const msg =
      json?.Message ||
      json?.message ||
      json?.ErrorMessage ||
      json?.error ||
      text.slice(0, 200) ||
      res.statusText
    throw new Error(`Turna ${path}: HTTP ${res.status} — ${msg}`)
  }
  return { json, session, status: res.status }
}

export function turnaPost(path, body, extraHeaders = {}) {
  return turnaRequest('POST', path, body, extraHeaders)
}

/** POST /v1/accounts/auth/anonymousLogin — bağlantı testi */
export async function pingTurnaLogin() {
  const { json, session } = await turnaPost('/v1/accounts/auth/anonymousLogin', loginForm())
  return { json, session }
}

/** POST /v1/flight/booking/search — rota arama */
export async function fetchFlightSearch(route, opts = {}) {
  const departureDay = opts.departureDay || addDaysISO(opts.daysAhead ?? 14)
  const body = {
    LoginForm: loginForm(),
    SearchForm: {
      Legs: [
        {
          Origin: String(route.origin).toUpperCase(),
          Destination: String(route.destination).toUpperCase(),
          OriginIsCity: route.originIsCity ?? false,
          DestinationIsCity: route.destinationIsCity ?? false,
          DepartureDay: departureDay,
        },
      ],
      Paxes: [{ Type: 'ADT', Count: opts.adultCount ?? 1 }],
      Preferences: {
        OnlyDirects: Boolean(route.onlyDirects),
        CabinClass: route.cabinClass || 'Any',
      },
    },
    ResponseMask: { FlightLegMask: opts.flightLegMask ?? 109 },
  }
  return turnaPost('/v1/flight/booking/search', body)
}

function addDaysISO(daysAhead) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + daysAhead)
  return d.toISOString().slice(0, 10)
}

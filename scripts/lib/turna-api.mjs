/**
 * Turna uçak API — Postman: Desktop/turna/
 * Docs: docs/API-PROVIDERS-NOTES.md § Turna
 *
 * Config kaynağı önceliği: panel site_settings → TURNA_* env
 * Ortam:
 *   TURNA_BASE_URL, TURNA_API_KEY (zorunlu)
 *   TURNA_COUNTRY_CODE, TURNA_CURRENCY_CODE, TURNA_LANGUAGE_CODE
 */

import { loadTurnaConfigFromDb } from './listing-api-providers-db.mjs'

const DEFAULT_BASE = 'https://api.turna.com'

export async function loadTurnaConfigAsync() {
  const cfg = await loadTurnaConfigFromDb()
  if (!cfg.apiKey) throw new Error('TURNA_API_KEY yok — panel: /manage/admin/settings/listing-api veya TURNA_API_KEY env')
  return cfg
}

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

export function loginForm(cfg, extra = {}) {
  return {
    ApiKey: cfg.apiKey,
    CountryCode: cfg.countryCode,
    CurrencyCode: cfg.currencyCode,
    LanguageCode: cfg.languageCode,
    ...extra,
  }
}

/** Geriye dönük uyumluluk — env tabanlı (DB yoksa) */
function loginFormFromEnv(extra = {}) {
  const cfg = loadTurnaConfig()
  return loginForm(cfg, extra)
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

/**
 * cfg: loadTurnaConfigAsync() / loadTurnaConfig() sonucu.
 * Yoksa env fallback'e düşer.
 */
export async function turnaRequest(method, path, body = null, extraHeaders = {}, cfg = null) {
  const baseUrl = cfg?.baseUrl ?? loadTurnaConfig().baseUrl
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
  const hasErr =
    json?.HasError === true ||
    json?.HasError === 'true' ||
    json?.HasError === 'True' ||
    json?.HasError === 1
  if (hasErr) {
    const msg =
      json?.Message ||
      json?.message ||
      json?.ErrorMessage ||
      json?.ErrorCode ||
      text.slice(0, 200) ||
      'HasError'
    throw new Error(`Turna ${path}: ${msg}`)
  }
  return { json, session, status: res.status }
}

export function turnaPost(path, body, extraHeaders = {}, cfg = null) {
  return turnaRequest('POST', path, body, extraHeaders, cfg)
}

/** POST /v1/accounts/auth/anonymousLogin — bağlantı testi */
export async function pingTurnaLogin(cfg = null) {
  const form = cfg ? loginForm(cfg) : loginFormFromEnv()
  const { json, session } = await turnaPost('/v1/accounts/auth/anonymousLogin', form, {}, cfg)
  return { json, session }
}

/** POST /v1/flight/booking/search — rota arama */
export async function fetchFlightSearch(route, opts = {}) {
  const cfg = opts.cfg ?? null
  const departureDay = opts.departureDay || addDaysISO(opts.daysAhead ?? 14)
  const body = {
    LoginForm: cfg ? loginForm(cfg) : loginFormFromEnv(),
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
    ResponseMask: { FlightLegMask: opts.flightLegMask ?? 105 },
  }
  // cfg'i turnaPost'a geçiriyoruz ki doğru baseUrl kullanılsın
  return turnaPost('/v1/flight/booking/search', body, {}, cfg)
}

function addDaysISO(daysAhead) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + daysAhead)
  return d.toISOString().slice(0, 10)
}

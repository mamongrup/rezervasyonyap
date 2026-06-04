/**
 * Travelrobot Static Content API istemcisi.
 *
 * Bu, ana Travelrobot (KPlus) API'sinden TAMAMEN AYRI bir API'dir:
 *   - Base URL: https://static.travelchain.online/api  (cfg.staticBaseUrl ile override edilebilir)
 *   - Kimlik: POST /token/authenticate  → header'da `user` ve `pwd`, yanıtta { token, expiration }
 *   - Diğer uçlar: header `Authorization: Bearer <token>`
 *
 * Stoplight: https://kplus.stoplight.io/docs/travelrobot/cuy9w274y7z9q-travelrobot-static-content-api
 *
 * Uçlar:
 *   POST /token/authenticate            (header: user, pwd)
 *   GET  /country/getCountries          (Bearer)
 *   POST /hotel/getDestinations         { CountryCode, Codes[] } (Bearer)
 *   GET  /hotel/getAllHotelCodes        (Bearer)
 *   POST /hotel/getHotelCodes           { LastUpdateDateTime }   (Bearer)
 *   POST /hotel/getHotels               { Codes[] }              (Bearer)
 */

import { loadTravelrobotConfigFromDb } from './listing-api-providers-db.mjs'

const DEFAULT_STATIC_BASE_URL = 'https://static.travelchain.online/api'

export async function loadTravelrobotConfig() {
  return loadTravelrobotConfigFromDb()
}

function staticBaseUrl(cfg) {
  return cfg.staticBaseUrl || DEFAULT_STATIC_BASE_URL
}

function joinUrl(base, path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base.replace(/\/$/, '')}${p}`
}

async function staticFetch(cfg, svcPath, { method = 'GET', token, body, headers = {} } = {}) {
  const url = joinUrl(staticBaseUrl(cfg), svcPath)
  const h = { Accept: 'application/json', ...headers }
  if (token) h.Authorization = `Bearer ${token}`
  if (body !== undefined) h['Content-Type'] = 'application/json'
  const res = await fetch(url, {
    method,
    headers: h,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const text = await res.text()
  let json = null
  if (text.trim()) {
    try {
      json = JSON.parse(text)
    } catch {
      throw new Error(`${svcPath}: geçersiz JSON (HTTP ${res.status}) — ${text.slice(0, 200)}`)
    }
  }
  if (!res.ok) {
    const msg = json?.message || json?.Message || json?.error || text.slice(0, 300) || res.statusText
    throw new Error(`${svcPath}: ${msg} (HTTP ${res.status})`)
  }
  return json
}

// ─── Kimlik doğrulama ─────────────────────────────────────────────────────────

/**
 * Static Content API kimlik doğrulama.
 * POST /token/authenticate — kullanıcı adı/şifre header'da (user / pwd).
 * Yanıt: { token, expiration }
 * opts: { user, password }  (yoksa cfg.staticUser/staticPassword, o da yoksa channelCode/Password)
 */
export async function authenticateStatic(cfg, opts = {}) {
  const user = opts.user ?? cfg.staticUser ?? cfg.channelCode
  const pwd = opts.password ?? cfg.staticPassword ?? cfg.channelPassword
  const json = await staticFetch(cfg, '/token/authenticate', {
    method: 'POST',
    headers: { user, pwd },
  })
  const token = json?.token || json?.Token || ''
  if (!token) throw new Error('Static Auth: token yok yanıtta')
  return { token: String(token), expiration: json?.expiration ?? null, raw: json }
}

// ─── Ülkeler ──────────────────────────────────────────────────────────────────

/**
 * Tüm ülkeleri listele.
 * GET /country/getCountries  (Bearer)
 */
export async function getStaticCountries(cfg, token) {
  return staticFetch(cfg, '/country/getCountries', { method: 'GET', token })
}

// ─── Destinasyonlar ───────────────────────────────────────────────────────────

/**
 * Destinasyonları listele.
 * POST /hotel/getDestinations  { CountryCode, Codes[] }  (Bearer)
 * opts: { countryCode, codes }
 */
export async function getDestinations(cfg, token, opts = {}) {
  return staticFetch(cfg, '/hotel/getDestinations', {
    method: 'POST',
    token,
    body: {
      CountryCode: opts.countryCode ?? null,
      Codes: opts.codes ?? [],
    },
  })
}

// ─── Otel kodları ─────────────────────────────────────────────────────────────

/**
 * Tüm otel kodlarını al.
 * GET /hotel/getAllHotelCodes  (Bearer)
 */
export async function getAllHotelCodes(cfg, token) {
  return staticFetch(cfg, '/hotel/getAllHotelCodes', { method: 'GET', token })
}

/**
 * Belirli tarihten sonra güncellenen otel kodları (incremental).
 * POST /hotel/getHotelCodes  { LastUpdateDateTime }  (Bearer)
 * opts: { lastUpdateDateTime }
 */
export async function getHotelCodes(cfg, token, opts = {}) {
  return staticFetch(cfg, '/hotel/getHotelCodes', {
    method: 'POST',
    token,
    body: { LastUpdateDateTime: opts.lastUpdateDateTime ?? null },
  })
}

// ─── Otel içeriği ─────────────────────────────────────────────────────────────

/**
 * Belirli otel kodları için tam içerik (adı, tesisler, görseller).
 * POST /hotel/getHotels  { Codes[] }  (Bearer)
 * hotelCodes: string[]
 */
export async function getHotelContent(cfg, token, hotelCodes = []) {
  const codes = Array.isArray(hotelCodes) ? hotelCodes : [hotelCodes]
  return staticFetch(cfg, '/hotel/getHotels', {
    method: 'POST',
    token,
    body: { Codes: codes },
  })
}

/**
 * Çok sayıda otel içeriğini parçalar halinde al (getHotels chunk'lanır).
 * opts: { chunkSize }
 */
export async function getBulkHotelContent(cfg, token, hotelCodes = [], opts = {}) {
  const chunkSize = opts.chunkSize ?? 50
  const results = []
  for (let i = 0; i < hotelCodes.length; i += chunkSize) {
    const chunk = hotelCodes.slice(i, i + chunkSize)
    try {
      const data = await getHotelContent(cfg, token, chunk)
      results.push({ codes: chunk, data })
    } catch (e) {
      results.push({ codes: chunk, error: String(e) })
    }
  }
  return results
}

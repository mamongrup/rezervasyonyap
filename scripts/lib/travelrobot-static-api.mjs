/**
 * Travelrobot Static Content API istemcisi.
 *
 * Bu, ana Travelrobot API'den AYRI bir API'dir.
 * Statik içerik (otel kodları, destinasyonlar, ülkeler) döndürür.
 * İmport scriptlerinde otel/destinasyon katalog senkronizasyonu için kullanılır.
 *
 * Stoplight: https://kplus.stoplight.io/docs/travelrobot/cuy9w274y7z9q-travelrobot-static-content-api
 *
 * Akış:
 *   authenticate → getCountries / getDestinations / getAllHotelCodes / getHotelCodes / getHotelContent
 *
 * Not: Bu API farklı bir base URL veya auth mekanizması kullanabilir.
 * Sandbox'ta muhtemelen aynı base URL + farklı servis path'i.
 */

import { loadTravelrobotConfigFromDb } from './listing-api-providers-db.mjs'

export async function loadTravelrobotConfig() {
  return loadTravelrobotConfigFromDb()
}

function joinUrl(base, path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

async function staticPost(baseUrl, svcPath, body) {
  const url = joinUrl(baseUrl, svcPath)
  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
  if (!res.ok || json?.HasError) {
    const msg = json?.ErrorMessage || json?.Message || text.slice(0, 300) || res.statusText
    throw new Error(`${svcPath}: ${msg}`)
  }
  return json
}

async function staticGet(baseUrl, svcPath, params = {}) {
  const qs = Object.entries(params)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  const url = `${joinUrl(baseUrl, svcPath)}${qs ? `?${qs}` : ''}`
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
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
    const msg = json?.ErrorMessage || json?.Message || text.slice(0, 300) || res.statusText
    throw new Error(`${svcPath}: ${msg}`)
  }
  return json
}

// ─── Kimlik doğrulama ─────────────────────────────────────────────────────────

/**
 * Static Content API kimlik doğrulama.
 * Stoplight: /docs/travelrobot/534aa6e611ab3-authentication
 * Ana API'den farklı bir endpoint veya aynı CreateTokenV2 olabilir.
 * opts: { channelCode, channelPassword }
 */
export async function authenticateStatic(cfg, opts = {}) {
  const channelCode = opts.channelCode ?? cfg.channelCode
  const channelPassword = opts.channelPassword ?? cfg.channelPassword
  const json = await staticPost(cfg.baseUrl, '/General.svc/Rest/Json/CreateTokenV2', {
    channelCredential: {
      ChannelCode: channelCode,
      ChannelPassword: channelPassword,
    },
  })
  const token = json?.Result?.TokenCode || json?.TokenCode || json?.tokenCode || ''
  if (!token) throw new Error('Static Auth: TokenCode yok')
  return { tokenCode: String(token), raw: json }
}

// ─── Ülkeler ──────────────────────────────────────────────────────────────────

/**
 * Tüm ülkeleri listele (statik katalog).
 * Stoplight: /docs/travelrobot/d2aa388ae2dfc-get-countries
 * opts: { tokenCode, languageCode }
 */
export async function getStaticCountries(cfg, tokenCode, opts = {}) {
  return staticGet(cfg.baseUrl, '/StaticContent.svc/Rest/Json/GetCountries', {
    TokenCode: tokenCode,
    LanguageCode: opts.languageCode ?? 'tr',
  })
}

// ─── Destinasyonlar ───────────────────────────────────────────────────────────

/**
 * Tüm destinasyonları/şehirleri listele.
 * Stoplight: /docs/travelrobot/cb085ab4bc2d1-get-destinations
 * opts: { tokenCode, countryCode, languageCode }
 */
export async function getDestinations(cfg, tokenCode, opts = {}) {
  return staticGet(cfg.baseUrl, '/StaticContent.svc/Rest/Json/GetDestinations', {
    TokenCode: tokenCode,
    CountryCode: opts.countryCode ?? null,
    LanguageCode: opts.languageCode ?? 'tr',
  })
}

// ─── Otel kodları ─────────────────────────────────────────────────────────────

/**
 * Tüm otel kodlarını listele (sayfalı).
 * Stoplight: /docs/travelrobot/f3e5e8201a190-get-all-hotel-codes
 * GET endpoint — tüm sisteme ait otel kodu listesi.
 * opts: { tokenCode, pageNumber, pageSize }
 */
export async function getAllHotelCodes(cfg, tokenCode, opts = {}) {
  return staticGet(cfg.baseUrl, '/StaticContent.svc/Rest/Json/GetAllHotelCodes', {
    TokenCode: tokenCode,
    PageNumber: opts.pageNumber ?? 1,
    PageSize: opts.pageSize ?? 1000,
  })
}

/**
 * Belirli destinasyon/ülkeye göre otel kodları.
 * Stoplight: /docs/travelrobot/12374e0c84115-get-hotel-codes
 * opts: { tokenCode, destinationId, countryCode, languageCode }
 */
export async function getHotelCodes(cfg, tokenCode, opts = {}) {
  return staticGet(cfg.baseUrl, '/StaticContent.svc/Rest/Json/GetHotelCodes', {
    TokenCode: tokenCode,
    DestinationId: opts.destinationId ?? null,
    CountryCode: opts.countryCode ?? null,
    LanguageCode: opts.languageCode ?? 'tr',
  })
}

// ─── Otel içeriği ─────────────────────────────────────────────────────────────

/**
 * Otel detay içeriği — statik bilgiler (adı, tesisleri, görseller).
 * Stoplight: /docs/travelrobot/f25b7fabfcfae-get-hotel-s-content
 * opts: { tokenCode, hotelCode, languageCode }
 */
export async function getHotelContent(cfg, tokenCode, hotelCode, opts = {}) {
  return staticGet(cfg.baseUrl, '/StaticContent.svc/Rest/Json/GetHotelContent', {
    TokenCode: tokenCode,
    HotelCode: hotelCode,
    LanguageCode: opts.languageCode ?? 'tr',
  })
}

/**
 * Birden fazla otelin içeriğini toplu al.
 * opts: { tokenCode, hotelCodes: string[], languageCode }
 */
export async function getBulkHotelContent(cfg, tokenCode, hotelCodes = [], opts = {}) {
  const results = []
  for (const code of hotelCodes) {
    try {
      const data = await getHotelContent(cfg, tokenCode, code, opts)
      results.push({ code, data })
    } catch (e) {
      results.push({ code, error: String(e) })
    }
  }
  return results
}

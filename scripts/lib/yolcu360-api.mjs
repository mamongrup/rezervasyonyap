/**
 * Yolcu360 Agency API — panel site_settings + env fallback.
 * https://apidocs.yolcu360.com/getting-started
 */

import { loadYolcu360ConfigFromDb } from './listing-api-providers-db.mjs'

export async function loadYolcu360ConfigAsync() {
  const cfg = await loadYolcu360ConfigFromDb()
  if (!cfg.apiKey || !cfg.apiSecret) {
    throw new Error(
      'Yolcu360 API Key / Secret yok — panel: /manage/admin/settings/listing-api veya YOLCU360_API_KEY + YOLCU360_API_SECRET env',
    )
  }
  return cfg
}

export function normalizeLocationQuery(query) {
  return String(query ?? '')
    .trim()
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'i')
    .replace(/Ğ/g, 'G')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'U')
    .replace(/ü/g, 'u')
    .replace(/Ş/g, 'S')
    .replace(/ş/g, 's')
    .replace(/Ö/g, 'O')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'C')
    .replace(/ç/g, 'c')
}

function trimTrailingSlash(url) {
  return String(url || '').trim().replace(/\/+$/, '')
}

function joinPath(baseUrl, path) {
  const base = trimTrailingSlash(baseUrl)
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

function encodeParam(s) {
  return String(s)
    .replace(/ /g, '%20')
    .replace(/:/g, '%3A')
    .replace(/\+/g, '%2B')
    .replace(/&/g, '%26')
}

function countryDatetimeOffset(countryCode) {
  return String(countryCode || 'TR').toUpperCase() === 'TR' ? '+03:00' : 'Z'
}

export function formatSearchDatetime(dateStr, countryCode = 'TR') {
  const t = String(dateStr || '').trim()
  const hasTz = t.includes('+') || /[zZ]$/.test(t)
  if (hasTz) return t
  let withTime = t.includes('T') ? t : `${t}T10:00:00`
  if (withTime.length <= 16) withTime = `${withTime}:00`
  return `${withTime}${countryDatetimeOffset(countryCode)}`
}

function locationsUrl(cfg, query) {
  const q = normalizeLocationQuery(query)
  const encoded = q
    .replace(/ /g, '+')
    .replace(/&/g, '%26')
    .replace(/=/g, '%3D')
  return joinPath(cfg.baseUrl, `/locations?query=${encoded}`)
}

function locationDetailUrl(cfg, placeId) {
  return joinPath(cfg.baseUrl, `/locations/${encodeParam(String(placeId || '').trim())}`)
}

function searchPointUrl(cfg) {
  return joinPath(cfg.baseUrl, '/search/point')
}

function loginUrl(cfg) {
  return joinPath(cfg.baseUrl, '/auth/login')
}

function firstNonempty(a, b) {
  const x = String(a || '').trim()
  return x || String(b || '').trim()
}

function firstLocationFromRaw(raw) {
  const items = []
  if (Array.isArray(raw)) {
    items.push(...raw)
  } else if (raw && typeof raw === 'object') {
    for (const key of ['data', 'results', 'items']) {
      if (Array.isArray(raw[key])) {
        items.push(...raw[key])
        break
      }
    }
  }
  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    const id = firstNonempty(item.id, item.placeId)
    if (!id) continue
    const name = firstNonempty(
      item.name,
      firstNonempty(item.mainText, firstNonempty(item.description, id)),
    )
    return { id, name }
  }
  return null
}

function locationDetailsFromRaw(raw) {
  if (!raw || typeof raw !== 'object') return null
  const point = raw.point
  if (!point || typeof point !== 'object') return null
  const lat = Number(point.lat)
  const lon = Number(point.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  return {
    placeId: String(raw.placeId || '').trim(),
    lat,
    lon,
    countryCode: String(raw.countryCode || 'TR').trim() || 'TR',
    timezone: String(raw.timezone || 'Europe/Istanbul').trim() || 'Europe/Istanbul',
  }
}

async function yolcuFetch(url, { method = 'GET', body = null, bearer = '' } = {}) {
  const headers = { Accept: 'application/json' }
  if (bearer) headers.Authorization = bearer
  if (body != null) headers['Content-Type'] = 'application/json'
  const res = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  if (text.trim()) {
    try {
      json = JSON.parse(text)
    } catch {
      throw new Error(`Yolcu360 geçersiz JSON (HTTP ${res.status}): ${text.slice(0, 200)}`)
    }
  }
  if (!res.ok) {
    const desc = json?.description || json?.message || text.slice(0, 200) || res.statusText
    const code = json?.code != null ? String(json.code) : ''
    throw new Error(`Yolcu360 HTTP ${res.status}${code ? ` (${code})` : ''}: ${desc}`)
  }
  return json
}

export async function loginYolcu360(cfg) {
  const json = await yolcuFetch(loginUrl(cfg), {
    method: 'POST',
    body: { key: cfg.apiKey, secret: cfg.apiSecret },
  })
  const token = String(json?.accessToken || '').trim()
  if (!token) {
    const desc = json?.description || 'accessToken yok'
    throw new Error(`Yolcu360 login başarısız: ${desc}`)
  }
  return token
}

export async function pingYolcu360(cfg) {
  const token = await loginYolcu360(cfg)
  const bearer = `Bearer ${token}`
  const locRaw = await yolcuFetch(locationsUrl(cfg, 'istanbul'), { bearer })
  const first = firstLocationFromRaw(locRaw)
  return {
    tokenPreview: token.length > 12 ? `${token.slice(0, 12)}…` : token,
    locationPreview: first ? `${first.name} (${first.id})` : '(konum yok)',
  }
}

async function resolvePlaceId(cfg, bearer, query) {
  const raw = await yolcuFetch(locationsUrl(cfg, query), { bearer })
  const first = firstLocationFromRaw(raw)
  if (!first?.id) throw new Error(`Yolcu360 konum bulunamadı: ${query}`)
  return first
}

async function fetchLocationDetails(cfg, bearer, placeId) {
  const raw = await yolcuFetch(locationDetailUrl(cfg, placeId), { bearer })
  const details = locationDetailsFromRaw(raw)
  if (!details) throw new Error(`Yolcu360 konum detayı okunamadı: ${placeId}`)
  return details
}

function searchPointBody(checkin, checkout, pickup, returnLoc) {
  const country = String(pickup.countryCode || 'TR').trim() || 'TR'
  return {
    checkInDateTime: formatSearchDatetime(checkin, country),
    checkOutDateTime: formatSearchDatetime(checkout, country),
    age: '25',
    country,
    paymentType: 'creditCard',
    checkInLocation: { lat: pickup.lat, lon: pickup.lon },
    checkOutLocation: { lat: returnLoc.lat, lon: returnLoc.lon },
    fullCredit: false,
  }
}

/**
 * @param {object} route — { pickup, dropoff?, checkin, checkout }
 */
export async function fetchYolcu360CarSearch(route, { cfg } = {}) {
  const config = cfg ?? (await loadYolcu360ConfigAsync())
  const pickupQuery = normalizeLocationQuery(route.pickup)
  const dropoffQuery = normalizeLocationQuery(route.dropoff || route.pickup)
  const checkin = String(route.checkin || '').trim()
  const checkout = String(route.checkout || '').trim()
  if (!pickupQuery || !checkin || !checkout) {
    throw new Error('pickup, checkin ve checkout zorunlu')
  }

  const token = await loginYolcu360(config)
  const bearer = `Bearer ${token}`

  const pickupLoc = await resolvePlaceId(config, bearer, pickupQuery)
  let returnPlaceId = pickupLoc.id
  if (dropoffQuery && dropoffQuery.toLowerCase() !== pickupQuery.toLowerCase()) {
    try {
      const ret = await resolvePlaceId(config, bearer, dropoffQuery)
      returnPlaceId = ret.id
    } catch {
      returnPlaceId = pickupLoc.id
    }
  }

  const pickupDetail = await fetchLocationDetails(config, bearer, pickupLoc.id)
  const returnDetail =
    returnPlaceId === pickupLoc.id
      ? pickupDetail
      : await fetchLocationDetails(config, bearer, returnPlaceId).catch(() => pickupDetail)

  const body = searchPointBody(checkin, checkout, pickupDetail, returnDetail)
  const json = await yolcuFetch(searchPointUrl(config), { method: 'POST', body, bearer })
  return { json, pickup: pickupLoc, dropoff: returnPlaceId === pickupLoc.id ? pickupLoc : { id: returnPlaceId } }
}

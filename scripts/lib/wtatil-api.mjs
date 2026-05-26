/**
 * Wtatil / Reserwation Tour API v2
 * Docs: https://tour-api.reserwation.com/docs/index.html
 * OpenAPI: Desktop/swagger.json veya tour-api OpenAPI indir
 */

const DEFAULT_BASE = 'https://tour-api.reserwation.com'

export function loadWtatilConfig() {
  const baseUrl = (process.env.WTATIL_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '')
  const applicationSecretKey = process.env.WTATIL_APPLICATION_SECRET_KEY || ''
  const userName = process.env.WTATIL_USERNAME || ''
  const password = process.env.WTATIL_PASSWORD || ''
  const agencyId = Number(process.env.WTATIL_AGENCY_ID || 0) || null
  if (!applicationSecretKey || !userName || !password) {
    throw new Error(
      'WTATIL_APPLICATION_SECRET_KEY, WTATIL_USERNAME ve WTATIL_PASSWORD ortam değişkenleri gerekli.',
    )
  }
  return { baseUrl, applicationSecretKey, userName, password, agencyId }
}

function joinUrl(base, path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

export function isWtatilOk(json) {
  if (json == null || typeof json !== 'object') return false
  const st = json.responseStatus
  if (st === 2 || st === 3) return false
  return json.data != null
}

export function unwrapData(json) {
  if (!isWtatilOk(json)) {
    const msg = json?.message || `responseStatus=${json?.responseStatus}`
    throw new Error(`Wtatil API hata: ${msg}`)
  }
  return json.data
}

export async function wtatilRequest(method, path, body = null, query = null) {
  const { baseUrl } = loadWtatilConfig()
  const url = new URL(joinUrl(baseUrl, path))
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v != null && v !== '') url.searchParams.set(k, String(v))
    }
  }
  const init = {
    method,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  }
  if (body != null) init.body = JSON.stringify(body)
  const res = await fetch(url, init)
  const text = await res.text()
  let json = null
  if (text.trim()) {
    try {
      json = JSON.parse(text)
    } catch {
      throw new Error(`Wtatil ${path}: geçersiz JSON (HTTP ${res.status})`)
    }
  }
  if (!res.ok) {
    const msg = json?.message || text.slice(0, 200) || res.statusText
    throw new Error(`Wtatil ${path}: HTTP ${res.status} — ${msg}`)
  }
  return json
}

/** POST /api/Auth/get-token-async */
export async function fetchWtatilToken() {
  const { applicationSecretKey, userName, password } = loadWtatilConfig()
  const json = await wtatilRequest('POST', '/api/Auth/get-token-async', null, {
    applicationSecretKey,
    userName,
    password,
  })
  const data = unwrapData(json)
  if (!data?.token) throw new Error('Wtatil token yanıtında data.token yok')
  return { token: data.token, expireDate: data.expireDate, userName }
}

function authBody(userName, token, extra = {}) {
  return {
    authorization: { userName, token },
    ...extra,
  }
}

/** JSON body ile GET; bazı ortamlarda POST yedek. */
async function wtatilGetWithBody(path, body) {
  try {
    return await wtatilRequest('GET', path, body)
  } catch (e) {
    if (String(e.message).includes('HTTP 405') || String(e.message).includes('HTTP 404')) {
      return wtatilRequest('POST', path, body)
    }
    throw e
  }
}

/** POST /api/TourCatalog/getall-tour-async — tek sayfa */
export async function fetchTourCatalogPage(userName, token, pageNumber, pageSize, ids = null) {
  const json = await wtatilRequest(
    'POST',
    '/api/TourCatalog/getall-tour-async',
    authBody(userName, token, {
      pageNumber,
      pageSize,
      ids: ids?.length ? ids : null,
    }),
  )
  return unwrapData(json)
}

/** Tüm sayfaları dolaş */
export async function fetchAllTours(userName, token, pageSize = 50, ids = null) {
  const all = []
  let pageNumber = 1
  let pageCount = 1
  while (pageNumber <= pageCount) {
    const data = await fetchTourCatalogPage(userName, token, pageNumber, pageSize, ids)
    const items = data?.items || []
    all.push(...items)
    pageCount = Math.max(1, Number(data?.pageCount) || 1)
    if (!items.length && pageNumber > 1) break
    pageNumber += 1
  }
  return all
}

export async function fetchTourCategories(userName, token) {
  const json = await wtatilGetWithBody('/api/TourCatalog/getall-tour-category-async', authBody(userName, token))
  return unwrapData(json) || []
}

export async function fetchTourPeriods(userName, token, tourId, pageSize = 100) {
  const all = []
  let pageNumber = 1
  let pageCount = 1
  while (pageNumber <= pageCount) {
    const json = await wtatilGetWithBody(
      '/api/TourCatalog/getall-tour-period-by-tour-id-async',
      authBody(userName, token, { tourId, pageNumber, pageSize }),
    )
    const data = unwrapData(json)
    const items = data?.items || []
    all.push(...items)
    pageCount = Math.max(1, Number(data?.pageCount) || 1)
    if (!items.length && pageNumber > 1) break
    pageNumber += 1
  }
  return all
}

export async function fetchTourPeriodPrices(userName, token, periodIds, pageSize = 200) {
  if (!periodIds?.length) return []
  const json = await wtatilGetWithBody(
    '/api/TourCatalog/getall-tour-period-price-async',
    authBody(userName, token, { ids: periodIds, pageNumber: 1, pageSize }),
  )
  const data = unwrapData(json)
  return data?.items || (Array.isArray(data) ? data : [])
}

export async function fetchTourTransportDetail(userName, token, tourId) {
  const json = await wtatilGetWithBody(
    '/api/TourCatalog/get-tour-transport-detail-by-tour-id-async',
    authBody(userName, token, { tourId }),
  )
  return unwrapData(json)
}

/** POST /api/TourCatalog/search-tour-async — detail: 0 liste, 1 detay (dikkatli kullan) */
export async function searchTours(userName, token, searchParameters) {
  const json = await wtatilRequest(
    'POST',
    '/api/TourCatalog/search-tour-async',
    authBody(userName, token, { searchParameters }),
  )
  const data = unwrapData(json)
  return Array.isArray(data) ? data : []
}

export function defaultSearchWindow(daysAhead = 30, windowDays = 60) {
  const start = new Date()
  start.setUTCDate(start.getUTCDate() + daysAhead)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + windowDays)
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  }
}

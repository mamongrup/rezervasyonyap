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

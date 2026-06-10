/**
 * site_settings.listing_api_providers → Node import script'leri için.
 */
import { createPgClient } from './pg-client.mjs'

const KEY = 'listing_api_providers'

export async function loadListingApiProvidersFromDb() {
  const client = createPgClient()
  await client.connect()
  try {
    const { rows } = await client.query(
      `SELECT value_json::text AS raw
       FROM site_settings
       WHERE key = $1 AND organization_id IS NULL
       ORDER BY id DESC
       LIMIT 1`,
      [KEY],
    )
    if (!rows[0]?.raw) return {}
    const parsed = JSON.parse(rows[0].raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } finally {
    await client.end()
  }
}

function normalizeTurnaBaseUrl(raw) {
  let u = String(raw || process.env.TURNA_BASE_URL || 'https://api.turna.com').trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`
  if (/^http:\/\//i.test(u) && /turna\.com/i.test(u)) u = u.replace(/^http:\/\//i, 'https://')
  return u
}

export async function loadTurnaConfigFromDb() {
  const all = await loadListingApiProvidersFromDb()
  const t = all.turna ?? {}
  return {
    enabled: Boolean(t.enabled),
    baseUrl: normalizeTurnaBaseUrl(t.base_url),
    apiKey: String(t.api_key || process.env.TURNA_API_KEY || ''),
    countryCode: String(t.country_code || process.env.TURNA_COUNTRY_CODE || 'TR'),
    currencyCode: String(t.currency_code || process.env.TURNA_CURRENCY_CODE || 'TRY'),
    languageCode: String(t.language_code || process.env.TURNA_LANGUAGE_CODE || 'tr'),
    listingStatus: String(t.listing_status || process.env.TURNA_STATUS || 'published'),
  }
}

export async function loadWtatilConfigFromDb() {
  const all = await loadListingApiProvidersFromDb()
  const w = all.wtatil ?? {}
  const agencyRaw = String(w.agency_id || process.env.WTATIL_AGENCY_ID || '').trim()
  const agencyId = agencyRaw ? Number.parseInt(agencyRaw, 10) : null
  return {
    enabled: Boolean(w.enabled),
    baseUrl: String(w.base_url || process.env.WTATIL_BASE_URL || 'https://tour-api.reserwation.com').replace(
      /\/+$/,
      '',
    ),
    applicationSecretKey: String(
      w.application_secret_key || process.env.WTATIL_APPLICATION_SECRET_KEY || '',
    ),
    userName: String(w.username || process.env.WTATIL_USERNAME || ''),
    password: String(w.password || process.env.WTATIL_PASSWORD || ''),
    agencyId: Number.isFinite(agencyId) && agencyId > 0 ? agencyId : null,
    listingStatus: String(w.listing_status || process.env.WTATIL_STATUS || 'published'),
  }
}

function normalizeTravelrobotBaseUrl(raw) {
  return String(
    raw || process.env.TRAVELROBOT_BASE_URL || 'https://api.bookingagora.com/v0',
  )
    .trim()
    .replace(/\/+$/, '')
}

function normalizeStaticBaseUrl(raw) {
  return String(
    raw || process.env.TRAVELROBOT_STATIC_BASE_URL || 'https://static.travelchain.online/api',
  )
    .trim()
    .replace(/\/+$/, '')
}

export async function loadTravelrobotConfigFromDb() {
  const all = await loadListingApiProvidersFromDb()
  const tr = all.travelrobot ?? {}
  return {
    enabled: Boolean(tr.enabled),
    baseUrl: normalizeTravelrobotBaseUrl(tr.base_url),
    channelCode: String(tr.channel_code || process.env.TRAVELROBOT_CHANNEL_CODE || ''),
    channelPassword: String(tr.channel_password || process.env.TRAVELROBOT_CHANNEL_PASSWORD || ''),
    staticBaseUrl: normalizeStaticBaseUrl(tr.static_base_url),
    staticUser: String(tr.static_user || process.env.TRAVELROBOT_STATIC_USER || ''),
    staticPassword: String(tr.static_password || process.env.TRAVELROBOT_STATIC_PASSWORD || ''),
    listingStatus: String(tr.listing_status || process.env.TRAVELROBOT_LISTING_STATUS || 'published'),
    importTours: tr.import_tours !== false,
    importHotels: Boolean(tr.import_hotels),
    importFlights: Boolean(tr.import_flights),
    importCarRental: Boolean(tr.import_car_rental),
    /** Otel vitrininde oda tipleri için otel bazlı SearchHotel (yavaş; varsayılan açık). */
    importHotelRooms: tr.import_hotel_rooms !== false,
  }
}

/** Panel `listing_api_providers.travelrobot` alanlarını birleştirip kaydeder (platform scope). */
export async function upsertTravelrobotInListingApiProviders(travelrobotPatch) {
  const client = createPgClient()
  await client.connect()
  try {
    const { rows } = await client.query(
      `SELECT value_json::text AS raw
       FROM site_settings
       WHERE key = $1 AND organization_id IS NULL
       ORDER BY id DESC
       LIMIT 1`,
      [KEY],
    )
    let all = {}
    if (rows[0]?.raw) {
      try {
        const parsed = JSON.parse(rows[0].raw)
        all = parsed && typeof parsed === 'object' ? parsed : {}
      } catch {
        all = {}
      }
    }
    const prev = all.travelrobot && typeof all.travelrobot === 'object' ? all.travelrobot : {}
    all.travelrobot = { ...prev, ...travelrobotPatch }
    await client.query(
      `INSERT INTO site_settings (organization_id, key, value_json)
       VALUES (NULL, $1, $2::jsonb)
       ON CONFLICT (key) WHERE organization_id IS NULL
       DO UPDATE SET value_json = excluded.value_json`,
      [KEY, JSON.stringify(all)],
    )
    return all.travelrobot
  } finally {
    await client.end()
  }
}

function normalizeYolcu360BaseUrl(raw) {
  let u = String(
    raw || process.env.YOLCU360_BASE_URL || 'https://staging.api.pro.yolcu360.com/api/v1',
  )
    .trim()
    .replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`
  return u
}

export async function loadYolcu360ConfigFromDb() {
  const all = await loadListingApiProvidersFromDb()
  const y = all.yolcu360 ?? {}
  return {
    enabled: Boolean(y.enabled),
    baseUrl: normalizeYolcu360BaseUrl(y.base_url),
    apiKey: String(y.api_key || process.env.YOLCU360_API_KEY || ''),
    apiSecret: String(y.api_secret || process.env.YOLCU360_API_SECRET || ''),
    listingStatus: String(y.listing_status || process.env.YOLCU360_STATUS || 'published'),
  }
}

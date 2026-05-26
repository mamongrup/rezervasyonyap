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

export async function loadTravelrobotConfigFromDb() {
  const all = await loadListingApiProvidersFromDb()
  const tr = all.travelrobot ?? {}
  return {
    enabled: Boolean(tr.enabled),
    baseUrl: String(tr.base_url || process.env.TRAVELROBOT_BASE_URL || 'http://sandbox.kplus.com.tr/kplus/v0').replace(/\/+$/, ''),
    channelCode: String(tr.channel_code || process.env.TRAVELROBOT_CHANNEL_CODE || ''),
    channelPassword: String(tr.channel_password || process.env.TRAVELROBOT_CHANNEL_PASSWORD || ''),
    listingStatus: String(tr.listing_status || process.env.TRAVELROBOT_LISTING_STATUS || 'published'),
    importTours: tr.import_tours !== false,
  }
}

/**
 * Travelrobot otel import — panel kimlik bilgilerini DB'den okur.
 *
 *   node scripts/import-travelrobot-hotels.mjs --ping
 *   node scripts/import-travelrobot-hotels.mjs --dry-run --limit 5
 *   node scripts/import-travelrobot-hotels.mjs --org-id <uuid>
 *
 * Not: Default SearchHotel (sandbox destinasyon ID). Canlıda boşsa otomatik Statik API kataloğu.
 *   --from-static   yalnızca Statik API (getAllHotelCodes + getHotels)
 *   --skip-search   SearchHotel atla, doğrudan Statik API
 */

import { createTravelrobotToken, loadTravelrobotConfig, searchHotels, pickHotelRows } from './lib/travelrobot-api.mjs'
import {
  fetchHotelCatalogFromStatic,
  isTravelrobotSandboxBaseUrl,
} from './lib/travelrobot-hotel-catalog.mjs'
import { DEFAULT_HOTEL_DESTINATION_ID } from './lib/travelrobot-sandbox-ids.mjs'
import { resolveImportContext, upsertTravelrobotHotelListing } from './lib/travelrobot-listing-db.mjs'
import { enrichTravelrobotHotelRows } from './lib/travelrobot-hotel-enrich.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const args = new Set(process.argv.slice(2))
const PING = args.has('--ping')
const DRY_RUN = args.has('--dry-run')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const orgIdIdx = process.argv.indexOf('--org-id')
const ORG_ID = orgIdIdx >= 0 ? process.argv[orgIdIdx + 1] : (process.env.IMPORT_ORG_ID ?? '')
const endpointIdx = process.argv.indexOf('--endpoint')
const ENDPOINT = endpointIdx >= 0 ? process.argv[endpointIdx + 1] : undefined
const FROM_STATIC = args.has('--from-static')
const SKIP_SEARCH = args.has('--skip-search')

async function resolveOrgId(pgClient) {
  if (ORG_ID) return ORG_ID
  const r = await pgClient.query(
    `SELECT id::text FROM organizations ORDER BY created_at LIMIT 1`,
  )
  if (!r.rows[0]) throw new Error('organizations tablosunda kayıt yok; --org-id <uuid> ile belirtin')
  return r.rows[0].id
}

async function main() {
  const cfg = await loadTravelrobotConfig()
  if (!cfg.enabled && !PING) {
    console.warn('[uyarı] Travelrobot panelde kapalı (enabled=false) — yine de devam ediliyor')
  }
  if (!cfg.importHotels && !PING) {
    console.warn('[uyarı] import_hotels=false — panelden etkinleştirin veya yine de devam ediliyor')
  }

  const { tokenCode } = await createTravelrobotToken(cfg)
  if (PING) {
    console.log('Travelrobot token OK, uzunluk:', tokenCode.length)
    return
  }

  let payload = null
  let rows = []

  if (!SKIP_SEARCH && !FROM_STATIC) {
    console.log('SearchHotel çağrılıyor…')
    try {
      const destinationId =
        process.env.TRAVELROBOT_HOTEL_DESTINATION_ID || DEFAULT_HOTEL_DESTINATION_ID
      payload = await searchHotels(cfg, tokenCode, { endpoint: ENDPOINT, destinationId })
      rows = pickHotelRows(payload)
      console.log(`SearchHotel: ${rows.length} otel adayı`)
    } catch (e) {
      console.error('[hata]', e.message)
      console.error(
        'Endpoint adını doğrulayın: --endpoint /Hotel.svc/Rest/Json/<MethodAdı>',
        '\nAlternatifler: SearchHotel, GetHotels, GetHotelList, HotelSearch',
      )
      process.exit(1)
    }
  }

  const useStaticCatalog =
    FROM_STATIC
    || SKIP_SEARCH
    || (rows.length === 0 && !isTravelrobotSandboxBaseUrl(cfg.baseUrl))

  if (useStaticCatalog) {
    if (rows.length === 0 && !FROM_STATIC && !SKIP_SEARCH) {
      console.log(
        '[bilgi] Canlı ortamda SearchHotel boş — Statik API kataloğuna geçiliyor (getAllHotelCodes + getHotels)',
      )
    }
    try {
      const staticLimit = LIMIT > 0 ? LIMIT : 0
      rows = await fetchHotelCatalogFromStatic(cfg, {
        limit: staticLimit,
        log: (msg) => console.log(msg),
      })
      console.log(`Statik katalog: ${rows.length} otel adayı`)
    } catch (e) {
      console.error('[statik katalog hata]', e.message)
      if (rows.length === 0) process.exit(1)
    }
  }

  if (LIMIT > 0 && rows.length > LIMIT) rows = rows.slice(0, LIMIT)
  const withRooms =
    args.has('--with-rooms') || args.has('--no-with-rooms')
      ? args.has('--with-rooms')
      : cfg.importHotelRooms !== false
  rows = await enrichTravelrobotHotelRows(cfg, tokenCode, rows, {
    withRooms,
    skipStatic: args.has('--skip-static'),
    log: (msg) => console.log(msg),
  })

  if (DRY_RUN) {
    console.log('Dry-run — DB yazılmadı. İlk kayıt:', rows[0] ? JSON.stringify(rows[0]).slice(0, 300) : '(boş)')
    if (rows.length === 0) {
      console.log('Ham yanıt önizleme:', JSON.stringify(payload).slice(0, 500))
    }
    return
  }

  const client = createPgClient()
  await client.connect()
  try {
    const orgId = await resolveOrgId(client)
    const ctx = await resolveImportContext(client, orgId, 'hotel')
    const status = cfg.listingStatus || 'draft'

    let created = 0, updated = 0, skipped = 0
    for (const hotel of rows) {
      try {
        const result = await upsertTravelrobotHotelListing(client, ctx, hotel, { status })
        if (result.action === 'created') created++
        else updated++
        process.stdout.write('.')
      } catch (e) {
        skipped++
        console.error(`\n[hata] ${e.message} — kayıt:`, JSON.stringify(hotel).slice(0, 120))
      }
    }
    console.log(`\nTamamlandı: ${created} yeni, ${updated} güncellendi, ${skipped} atlandı`)
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

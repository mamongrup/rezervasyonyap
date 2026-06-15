/**
 * Mevcut Travelrobot otel ilanlarını zenginleştirir: görseller, odalar, fiyatlar.
 *
 * Katalog import yalnızca isim/kod yazdıysa bu script ile backfill yapılır.
 *
 *   node scripts/enrich-travelrobot-hotels.mjs --dry-run --limit 5
 *   node scripts/enrich-travelrobot-hotels.mjs --limit 100
 *   node scripts/enrich-travelrobot-hotels.mjs --no-with-rooms --skip-static
 *   node scripts/enrich-travelrobot-hotels.mjs --with-rooms --rooms-only --skip-static
 *   node scripts/enrich-travelrobot-hotels.mjs --skip-static --with-rooms
 *
 * --with-rooms: her otel için SearchHotel (oda/fiyat) — 1200+ otelde yavaş; --limit ile parça parça çalıştırın.
 */

import { createTravelrobotToken, loadTravelrobotConfig } from './lib/travelrobot-api.mjs'
import {
  resolveImportContext,
  upsertTravelrobotHotelListing,
  buildStaticHotelMap,
  mergeStaticHotelContent,
} from './lib/travelrobot-listing-db.mjs'
import { authenticateStatic, getBulkHotelContent } from './lib/travelrobot-static-api.mjs'
import { enrichTravelrobotHotelRows } from './lib/travelrobot-hotel-enrich.mjs'
import { countUniqueHotelRoomNames } from './lib/travelrobot-hotel-rooms.mjs'
import { createPgClient } from './lib/pg-client.mjs'
import { createJobReporter } from './lib/sync-job-reporter.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const SKIP_STATIC = args.has('--skip-static')
const ROOMS_ONLY = args.has('--rooms-only')
const WITH_ROOMS_CLI =
  args.has('--with-rooms') || args.has('--no-with-rooms') ? args.has('--with-rooms') : null
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const offsetIdx = process.argv.indexOf('--offset')
const OFFSET = offsetIdx >= 0 ? Number(process.argv[offsetIdx + 1]) : 0
const orgIdIdx = process.argv.indexOf('--org-id')
const ORG_ID = orgIdIdx >= 0 ? process.argv[orgIdIdx + 1] : (process.env.IMPORT_ORG_ID ?? '')

const jobIdIdx = process.argv.indexOf('--job-id')
const JOB_ID = jobIdIdx >= 0 ? process.argv[jobIdIdx + 1] : (process.env.SYNC_JOB_ID || '')
const reporter = createJobReporter(JOB_ID)

async function resolveOrgId(pgClient) {
  if (ORG_ID) return ORG_ID
  const r = await pgClient.query(`SELECT id::text FROM organizations ORDER BY created_at LIMIT 1`)
  if (!r.rows[0]) throw new Error('organizations tablosunda kayıt yok; --org-id <uuid> ile belirtin')
  return r.rows[0].id
}

async function loadTravelrobotHotels(pgClient, orgId) {
  const r = await pgClient.query(
    `SELECT l.id::text AS listing_id,
            l.slug,
            lhd.travelrobot_hotel_code AS code,
            la.value_json::text AS snapshot_json
     FROM listings l
     JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'hotel'
     JOIN listing_hotel_details lhd ON lhd.listing_id = l.id
     LEFT JOIN listing_attributes la
       ON la.listing_id = l.id AND la.group_code = 'travelrobot' AND la.key = 'snapshot'
     WHERE l.organization_id = $1::uuid
       AND l.external_provider_code = 'travelrobot'
       AND lhd.travelrobot_hotel_code IS NOT NULL
       AND trim(lhd.travelrobot_hotel_code) <> ''
     ORDER BY l.updated_at ASC, l.slug ASC
     OFFSET $2 LIMIT CASE WHEN $3 > 0 THEN $3 ELSE NULL END`,
    [orgId, OFFSET, LIMIT > 0 ? LIMIT : null],
  )
  return r.rows.map((row) => {
    let catalog = {}
    try {
      const parsed = JSON.parse(row.snapshot_json || '{}')
      catalog = parsed?.catalog ?? parsed ?? {}
    } catch {
      catalog = {}
    }
    return {
      listingId: row.listing_id,
      slug: row.slug,
      code: String(row.code).trim(),
      catalog,
    }
  })
}

function catalogRowFromDb(item) {
  const c = item.catalog
  if (c && typeof c === 'object' && Object.keys(c).length) return c
  return { HotelCode: item.code, HotelId: item.code }
}

async function main() {
  const cfg = await loadTravelrobotConfig()
  const { tokenCode } = await createTravelrobotToken(cfg)

  const client = createPgClient()
  await client.connect()
  try {
    const orgId = await resolveOrgId(client)
    const items = await loadTravelrobotHotels(client, orgId)
    if (!items.length) {
      await reporter.done('Zenginleştirilecek Travelrobot oteli bulunamadı.')
      return
    }

    await reporter.start(items.length)
    await reporter.log(`${items.length} otel yüklendi (offset=${OFFSET}, limit=${LIMIT || 'yok'})`)

    let staticMap = new Map()
    if (!SKIP_STATIC) {
      try {
        const { token: staticToken } = await authenticateStatic(cfg)
        const codes = [...new Set(items.map((i) => i.code).filter(Boolean))]
        await reporter.log(`Static API: ${codes.length} kod…`)
        const bulk = await getBulkHotelContent(cfg, staticToken, codes, { chunkSize: 50 })
        staticMap = buildStaticHotelMap(bulk)
        await reporter.log(`Static API: ${staticMap.size} içerik alındı`)
      } catch (e) {
        await reporter.log(`Static API atlandı: ${String(e.message).slice(0, 100)}`)
      }
    }

    const ctx = await resolveImportContext(client, orgId, 'hotel')
    const status = cfg.listingStatus || 'draft'
    let updated = 0
    let skipped = 0
    let withImages = 0
    let roomHitCount = 0

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      let row = mergeStaticHotelContent(catalogRowFromDb(item), staticMap.get(item.code))

      const fetchRooms =
        WITH_ROOMS_CLI != null ? WITH_ROOMS_CLI : cfg.importHotelRooms !== false
      try {
        const enriched = await enrichTravelrobotHotelRows(cfg, tokenCode, [row], {
          withRooms: fetchRooms,
          withGallery: !ROOMS_ONLY,
          skipStatic: true,
        })
        row = enriched[0] ?? row
      } catch (e) {
        console.warn(`[zenginleştirme] ${item.code}: ${e.message}`)
      }

      const previewRooms = countUniqueHotelRoomNames(row)

      if (DRY_RUN) {
        await reporter.step(`[dry-run ${i + 1}/${items.length}] ${item.slug}`, i + 1, items.length)
        continue
      }

      try {
        const result = await upsertTravelrobotHotelListing(client, ctx, row, { status })
        updated++
        if (result.imageCount) withImages++
        if (result.roomCount) roomHitCount++
        await reporter.step(
          `[${i + 1}/${items.length}] ${result.slug} — ${result.imageCount ?? 0} görsel, ${result.roomCount ?? previewRooms} oda`,
          i + 1,
          items.length,
        )
      } catch (e) {
        skipped++
        console.error(`[hata] ${item.slug}: ${e.message}`)
        await reporter.step(`[${i + 1}/${items.length}] hata: ${String(e.message).slice(0, 80)}`, i + 1, items.length)
      }
    }

    const msg = DRY_RUN
      ? `Dry-run — ${items.length} otel kontrol edildi.`
      : `Tamamlandı: ${updated} güncellendi, ${skipped} atlandı. Görsel: ${withImages}, oda: ${roomHitCount}`
    await reporter.done(msg)
  } finally {
    await client.end()
  }
}

main().catch(async (e) => {
  await reporter.fail(e.message || String(e))
  process.exit(1)
})

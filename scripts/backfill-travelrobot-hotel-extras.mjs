/**
 * Travelrobot oteller — eksik API alanları (pansiyon, günlük fiyat, iptal, meta, i18n).
 *
 *   node scripts/backfill-travelrobot-hotel-extras.mjs --dry-run --limit 10
 *   node scripts/backfill-travelrobot-hotel-extras.mjs --limit 200 --offset 0
 *   node scripts/backfill-travelrobot-hotel-extras.mjs --force --with-i18n
 *   node scripts/backfill-travelrobot-hotel-extras.mjs --code KAE1881002
 */

import { createTravelrobotToken, loadTravelrobotConfig } from './lib/travelrobot-api.mjs'
import { enrichTravelrobotHotelRows } from './lib/travelrobot-hotel-enrich.mjs'
import { resolveImportContext, upsertTravelrobotHotelListing } from './lib/travelrobot-listing-db.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const FORCE = args.has('--force')
const WITH_I18N = args.has('--with-i18n')
const WITH_ROOMS = !args.has('--no-with-rooms')
const codeIdx = process.argv.indexOf('--code')
const CODE = codeIdx >= 0 ? process.argv[codeIdx + 1]?.trim() : ''
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const offsetIdx = process.argv.indexOf('--offset')
const OFFSET = offsetIdx >= 0 ? Number(process.argv[offsetIdx + 1]) : 0

async function loadHotels(pg, orgId) {
  const params = [orgId, OFFSET]
  let sql = `
    SELECT l.id::text AS listing_id,
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
      AND trim(lhd.travelrobot_hotel_code) <> ''`
  if (CODE) {
    params.push(CODE)
    sql += ` AND lhd.travelrobot_hotel_code = $${params.length}`
  }
  sql += ' ORDER BY l.updated_at ASC, l.slug ASC OFFSET $2'
  if (LIMIT > 0) {
    params.push(LIMIT)
    sql += ` LIMIT $${params.length}`
  }
  const r = await pg.query(sql, params)
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

function catalogRow(item) {
  if (item.catalog && typeof item.catalog === 'object' && Object.keys(item.catalog).length) {
    return item.catalog
  }
  return { HotelCode: item.code, HotelId: item.code }
}

async function main() {
  const cfg = await loadTravelrobotConfig()
  const { tokenCode } = await createTravelrobotToken(cfg)
  const pg = createPgClient()
  await pg.connect()
  try {
    const orgId = (await pg.query(`SELECT id::text FROM organizations ORDER BY created_at LIMIT 1`)).rows[0]?.id
    if (!orgId) throw new Error('organizations kaydı yok')
    const ctx = await resolveImportContext(pg, orgId, 'hotel')
    const items = await loadHotels(pg, orgId)
    console.log(`${items.length} otel — extras backfill (force=${FORCE}, i18n=${WITH_I18N})`)

    let ok = 0
    let fail = 0
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      let row = catalogRow(item)
      try {
        const enriched = await enrichTravelrobotHotelRows(cfg, tokenCode, [row], {
          withRooms: WITH_ROOMS,
          withGallery: true,
          withVitrin: true,
          withI18n: WITH_I18N,
          skipStatic: true,
          force: FORCE,
          log: (msg) => console.log(msg),
        })
        row = enriched[0] ?? row
      } catch (e) {
        console.warn(`[enrich] ${item.code}: ${e.message}`)
      }

      if (DRY_RUN) {
        console.log(`[dry-run ${i + 1}] ${item.slug}`)
        continue
      }

      try {
        const result = await upsertTravelrobotHotelListing(pg, ctx, row, {
          status: cfg.listingStatus || 'draft',
          overwriteExtras: FORCE,
          overwriteVitrin: FORCE,
        })
        ok++
        const ex = result.extrasStats ?? {}
        console.log(
          `[${i + 1}/${items.length}] ${result.slug} — odalar:${ex.rooms ?? 0}, pansiyon:${ex.mealPlans ?? 0}, takvim:${ex.calendarDays ?? 0}, fiyat:${ex.priceRules ?? 0}, dil:${ex.translations ?? 0}`,
        )
      } catch (e) {
        fail++
        console.error(`[hata] ${item.slug}: ${e.message}`)
      }
    }
    console.log(`Bitti — ${ok} güncellendi, ${fail} hata`)
  } finally {
    await pg.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

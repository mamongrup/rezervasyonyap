/**
 * Travelrobot oteller — tema, konaklama tipi, özellikler, kurallar (GetHotelDetails vitrin).
 *
 *   node scripts/backfill-travelrobot-hotel-vitrin.mjs --dry-run --limit 10
 *   node scripts/backfill-travelrobot-hotel-vitrin.mjs --limit 200 --offset 0
 *   node scripts/backfill-travelrobot-hotel-vitrin.mjs --force
 *   node scripts/backfill-travelrobot-hotel-vitrin.mjs --code KTR137972
 */

import { createTravelrobotToken, loadTravelrobotConfig } from './lib/travelrobot-api.mjs'
import { enrichTravelrobotHotelRows } from './lib/travelrobot-hotel-enrich.mjs'
import {
  resolveImportContext,
  upsertTravelrobotHotelListing,
  mergeStaticHotelContent,
} from './lib/travelrobot-listing-db.mjs'
import { catalogHasTravelrobotVitrinSource } from './lib/travelrobot-hotel-vitrin-db.mjs'
import { buildTravelrobotHotelVitrinPackage } from './lib/travelrobot-hotel-vitrin.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const FORCE = args.has('--force')
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
    const orgId = (
      await pg.query(`SELECT id::text FROM organizations ORDER BY created_at LIMIT 1`)
    ).rows[0]?.id
    if (!orgId) throw new Error('organizations kaydı yok')

    const items = await loadHotels(pg, orgId)
    if (!items.length) {
      console.log('Travelrobot oteli bulunamadı.')
      return
    }

    const ctx = await resolveImportContext(pg, orgId, 'hotel')
    const status = cfg.listingStatus || 'draft'
    console.log(`${items.length} otel (offset=${OFFSET}, limit=${LIMIT || 'yok'})`)

    let ok = 0
    let skip = 0

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      let row = catalogRow(item)

      if (!FORCE && catalogHasTravelrobotVitrinSource(row)) {
        skip++
        console.log(`[${i + 1}/${items.length}] ${item.slug} — snapshot vitrin var, atlandı`)
        continue
      }

      try {
        const enriched = await enrichTravelrobotHotelRows(cfg, tokenCode, [row], {
          withVitrin: true,
          withGallery: false,
          withRooms: false,
          skipStatic: true,
        })
        row = enriched[0] ?? row
      } catch (e) {
        console.warn(`[${i + 1}/${items.length}] ${item.code} enrich: ${e.message}`)
      }

      const preview = buildTravelrobotHotelVitrinPackage(row)
      const summary = [
        preview.facets.theme_code ? `tema=${preview.facets.theme_code}` : null,
        preview.facets.accommodation_code ? `pansiyon=${preview.facets.accommodation_code}` : null,
        `${preview.amenities.length} özellik`,
        preview.verticalHotel.general_terms_html ? 'kurallar' : null,
      ]
        .filter(Boolean)
        .join(', ')

      if (DRY_RUN) {
        console.log(`[dry-run ${i + 1}/${items.length}] ${item.slug} — ${summary || 'veri yok'}`)
        ok++
        continue
      }

      try {
        await upsertTravelrobotHotelListing(pg, ctx, row, {
          status,
          applyVitrin: true,
          overwriteVitrin: FORCE,
        })
        ok++
        console.log(`[${i + 1}/${items.length}] ${item.slug} — ${summary || 'veri yok'}`)
      } catch (e) {
        console.error(`[${i + 1}/${items.length}] ${item.slug} hata: ${e.message}`)
      }
    }

    console.log(`Tamamlandı: ${ok} işlendi, ${skip} atlandı${DRY_RUN ? ' (dry-run)' : ''}.`)
  } finally {
    await pg.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

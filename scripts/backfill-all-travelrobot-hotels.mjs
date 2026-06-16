#!/usr/bin/env node
/**
 * Tüm Travelrobot oteller — tam API iyileştirme (galeri, vitrin, odalar, extras).
 *
 *   node scripts/backfill-all-travelrobot-hotels.mjs --dry-run --limit 5
 *   node scripts/backfill-all-travelrobot-hotels.mjs --batch-size 50 --offset 0
 *   node scripts/backfill-all-travelrobot-hotels.mjs --with-i18n --batch-size 20
 *   node scripts/backfill-all-travelrobot-hotels.mjs --no-with-rooms --batch-size 100
 *
 * Önce eksiklik raporu: node scripts/audit-travelrobot-hotel-gaps.mjs
 */

import { createTravelrobotToken, loadTravelrobotConfig } from './lib/travelrobot-api.mjs'
import { enrichTravelrobotHotelRows } from './lib/travelrobot-hotel-enrich.mjs'
import { resolveImportContext, upsertTravelrobotHotelListing } from './lib/travelrobot-listing-db.mjs'
import { createPgClient } from './lib/pg-client.mjs'
import { cliLog } from './lib/cli-log.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const WITH_I18N = args.has('--with-i18n')
const WITH_ROOMS = !args.has('--no-with-rooms')
const batchIdx = process.argv.indexOf('--batch-size')
const BATCH = batchIdx >= 0 ? Number(process.argv[batchIdx + 1]) : 50
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const offsetIdx = process.argv.indexOf('--offset')
const OFFSET = offsetIdx >= 0 ? Number(process.argv[offsetIdx + 1]) : 0

async function countHotels(pg) {
  const r = await pg.query(
    `SELECT count(*)::int AS n
     FROM listings l
     JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'hotel'
     JOIN listing_hotel_details lhd ON lhd.listing_id = l.id
     WHERE l.external_provider_code = 'travelrobot'
       AND lhd.travelrobot_hotel_code IS NOT NULL
       AND trim(lhd.travelrobot_hotel_code) <> ''`,
  )
  return r.rows[0]?.n ?? 0
}

async function loadHotels(pg, orgId, offset, limit) {
  const r = await pg.query(
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
     OFFSET $2
     LIMIT $3`,
    [orgId, offset, limit],
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

function catalogRow(item) {
  if (item.catalog && typeof item.catalog === 'object' && Object.keys(item.catalog).length) {
    return item.catalog
  }
  return { HotelCode: item.code, HotelId: item.code }
}

async function main() {
  const effectiveBatch = LIMIT > 0 ? LIMIT : BATCH
  cliLog(
    `Tam backfill — offset=${OFFSET}, batch=${effectiveBatch}, rooms=${WITH_ROOMS}, i18n=${WITH_I18N}, dry-run=${DRY_RUN}`,
  )

  cliLog('Panel ayarları yükleniyor…')
  const cfg = await loadTravelrobotConfig()
  cliLog('KPlus token alınıyor…')
  const { tokenCode } = await createTravelrobotToken(cfg)
  cliLog('Token alındı')

  cliLog('PostgreSQL bağlanılıyor…')
  const pg = createPgClient()
  await pg.connect()
  cliLog('DB bağlantısı OK')
  try {
    const orgId = (await pg.query(`SELECT id::text FROM organizations ORDER BY created_at LIMIT 1`)).rows[0]?.id
    if (!orgId) throw new Error('organizations kaydı yok')

    const total = await countHotels(pg)
    const items = await loadHotels(pg, orgId, OFFSET, effectiveBatch)
    if (!items.length) {
      cliLog('Bu aralıkta otel yok.')
      return
    }

    cliLog(`Toplam ${total} otel — bu batch: ${items.length} (offset ${OFFSET})`)
    const ctx = await resolveImportContext(pg, orgId, 'hotel')
    const status = cfg.listingStatus || 'draft'

    let ok = 0
    let fail = 0

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      let row = catalogRow(item)
      cliLog(`[${i + 1}/${items.length}] ${item.code} — tam zenginleştirme…`)

      try {
        const enriched = await enrichTravelrobotHotelRows(cfg, tokenCode, [row], {
          withRooms: WITH_ROOMS,
          withGallery: true,
          withVitrin: true,
          withI18n: WITH_I18N,
          skipStatic: true,
          force: true,
          log: (msg) => cliLog(msg),
        })
        row = enriched[0] ?? row
      } catch (e) {
        cliLog(`[uyarı] enrich ${item.code}: ${e.message}`)
      }

      if (DRY_RUN) continue

      try {
        const result = await upsertTravelrobotHotelListing(pg, ctx, row, {
          status,
          overwriteExtras: true,
          overwriteVitrin: true,
        })
        ok++
        const v = result.vitrinStats ?? {}
        const ex = result.extrasStats ?? {}
        cliLog(
          `[OK] ${result.slug} — görsel:${result.imageCount ?? 0}, oda:${result.roomCount ?? 0}, özellik:${v.amenities ?? 0}, pansiyon:${ex.mealPlans ?? 0}, takvim:${ex.calendarDays ?? 0}, dil:${ex.translations ?? 0}`,
        )
      } catch (e) {
        fail++
        cliLog(`[hata] ${item.slug}: ${e.message}`)
      }
    }

    const nextOffset = OFFSET + items.length
    const remaining = Math.max(0, total - nextOffset)
    const msg = DRY_RUN
      ? `Dry-run — ${items.length} otel kontrol edildi.`
      : `Batch bitti — ${ok} güncellendi, ${fail} hata. Kalan ~${remaining} otel.`
    cliLog(msg)
    if (!DRY_RUN && remaining > 0) {
      cliLog(
        `Sonraki batch:\n  node scripts/backfill-all-travelrobot-hotels.mjs --offset ${nextOffset} --batch-size ${effectiveBatch}${WITH_I18N ? ' --with-i18n' : ''}${!WITH_ROOMS ? ' --no-with-rooms' : ''}`,
      )
    }
    if (!DRY_RUN && remaining === 0) {
      cliLog('Tüm oteller işlendi. Kontrol: node scripts/audit-travelrobot-hotel-gaps.mjs')
    }
  } finally {
    await pg.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

/**
 * Travelrobot oteller — country_id backfill (yurtiçi/yurtdışı filtresi).
 *
 * Halihazırda DB'de olan (country_id IS NULL) Travelrobot otellerini,
 * listing_attributes (group_code='travelrobot', key='snapshot') içindeki ülke
 * bilgisini okuyup countries tablosuyla eşleştirerek günceller.
 *
 *   node scripts/backfill-travelrobot-hotel-country.mjs --dry-run --limit 20
 *   node scripts/backfill-travelrobot-hotel-country.mjs --limit 5000 --offset 0
 *   node scripts/backfill-travelrobot-hotel-country.mjs
 */
import {
  extractTravelrobotHotelCountryText,
  resolveTravelrobotCountryId,
} from './lib/travelrobot-listing-db.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const offsetIdx = process.argv.indexOf('--offset')
const OFFSET = offsetIdx >= 0 ? Number(process.argv[offsetIdx + 1]) : 0

async function loadCandidates(pg) {
  const params = [OFFSET]
  let sql = `
    SELECT l.id::text AS listing_id,
           l.slug,
           lhd.travelrobot_hotel_code AS code,
           la.value_json::text AS snapshot_json
    FROM listings l
    JOIN listing_hotel_details lhd ON lhd.listing_id = l.id
    LEFT JOIN listing_attributes la
      ON la.listing_id = l.id AND la.group_code = 'travelrobot' AND la.key = 'snapshot'
    WHERE l.external_provider_code = 'travelrobot'
      AND lhd.country_id IS NULL
    ORDER BY l.updated_at ASC, l.slug ASC
    OFFSET $1`
  if (LIMIT > 0) {
    params.push(LIMIT)
    sql += ` LIMIT $2`
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
      code: row.code ? String(row.code).trim() : '',
      catalog,
    }
  })
}

async function main() {
  const pg = createPgClient()
  await pg.connect()
  try {
    const items = await loadCandidates(pg)
    if (!items.length) {
      console.log('country_id boş Travelrobot oteli kalmadı.')
      return
    }
    console.log(`${items.length} otel taranacak (offset=${OFFSET}, limit=${LIMIT || 'yok'})`)

    let resolved = 0
    let unresolved = 0
    let noSnapshot = 0

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const hasCatalog = item.catalog && typeof item.catalog === 'object' && Object.keys(item.catalog).length
      if (!hasCatalog) {
        noSnapshot++
        console.log(`[${i + 1}/${items.length}] ${item.slug} — snapshot yok, atlandı`)
        continue
      }

      const countryText = extractTravelrobotHotelCountryText(item.catalog)
      const countryId = await resolveTravelrobotCountryId(pg, countryText)

      if (!countryId) {
        unresolved++
        console.log(
          `[${i + 1}/${items.length}] ${item.slug} — ülke çözülemedi (metin=${JSON.stringify(countryText)})`,
        )
        continue
      }

      if (DRY_RUN) {
        console.log(
          `[dry-run ${i + 1}/${items.length}] ${item.slug} — "${countryText}" -> country_id=${countryId}`,
        )
        resolved++
        continue
      }

      await pg.query(
        `UPDATE listing_hotel_details SET country_id = $2 WHERE listing_id = $1::uuid AND country_id IS NULL`,
        [item.listingId, countryId],
      )
      resolved++
      console.log(
        `[${i + 1}/${items.length}] ${item.slug} — "${countryText}" -> country_id=${countryId}`,
      )
    }

    console.log(
      `Tamamlandı: ${resolved} çözüldü, ${unresolved} çözülemedi, ${noSnapshot} snapshot yok${DRY_RUN ? ' (dry-run)' : ''}.`,
    )
  } finally {
    await pg.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

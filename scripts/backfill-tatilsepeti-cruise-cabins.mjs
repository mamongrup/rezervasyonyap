/**
 * Tatilsepeti cruise — kabin/fiyat/program backfill (mevcut ilanlar)
 *
 *   node scripts/backfill-tatilsepeti-cruise-cabins.mjs --dry-run --limit 5
 *   node scripts/backfill-tatilsepeti-cruise-cabins.mjs --limit 50
 *   node scripts/backfill-tatilsepeti-cruise-cabins.mjs
 *   node scripts/backfill-tatilsepeti-cruise-cabins.mjs --slug msc-grandiosa-ts-163207
 *
 * Ortam: PG*, TATILSEPETI_DELAY_MS=500
 */

import { fetchTourDetail } from './lib/tatilsepeti-cruise-api.mjs'
import { patchTatilsepetiCruiseListingContent } from './lib/tatilsepeti-listing-db.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const ONLY_EMPTY = !args.has('--all')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const slugIdx = process.argv.indexOf('--slug')
const SLUG = slugIdx >= 0 ? process.argv[slugIdx + 1] : ''
const DELAY_MS = Number(process.env.TATILSEPETI_DELAY_MS || 500)

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const pg = createPgClient()
  await pg.connect()

  let sql = `
    SELECT l.id::text AS listing_id, l.slug, l.external_listing_ref AS tour_id,
           COALESCE(jsonb_array_length(la.value_json->'cabins'), 0) AS cabin_count,
           la_ts.value_json->'catalog'->>'url' AS catalog_url,
           la_ts.value_json->'catalog'->>'title' AS catalog_title,
           la_ts.value_json->'catalog'->>'slug' AS catalog_slug
    FROM listings l
    JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'cruise'
    LEFT JOIN listing_attributes la
      ON la.listing_id = l.id AND la.group_code = 'vertical_cruise' AND la.key = 'v1'
    LEFT JOIN listing_attributes la_ts
      ON la_ts.listing_id = l.id AND la_ts.group_code = 'tatilsepeti' AND la_ts.key = 'snapshot'
    WHERE l.external_provider_code = 'tatilsepeti'
  `
  const params = []
  if (SLUG) {
    params.push(SLUG)
    sql += ` AND l.slug = $${params.length}`
  }
  if (ONLY_EMPTY) {
    sql += ` AND COALESCE(jsonb_array_length(la.value_json->'cabins'), 0) = 0`
  }
  sql += ' ORDER BY l.slug'
  if (LIMIT > 0) sql += ` LIMIT ${LIMIT}`

  const { rows } = await pg.query(sql, params)
  console.log(
    `Tatilsepeti kabin backfill — ${rows.length} ilan, dry-run=${DRY_RUN}, only-empty=${ONLY_EMPTY}`,
  )

  let ok = 0
  let fail = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const tourId = String(row.tour_id || '').trim()
    process.stdout.write(`[${i + 1}/${rows.length}] ${row.slug} (cabins=${row.cabin_count}) … `)

    if (!tourId) {
      console.log('tour_id yok')
      fail++
      continue
    }

    try {
      const slugBase = String(row.slug || '').replace(/-ts-\d+$/i, '')
      const catalogRow = {
        tourId,
        title: row.catalog_title || row.slug,
        slug: row.catalog_slug || slugBase,
        url:
          row.catalog_url ||
          (slugBase ? `https://www.tatilsepeti.com/${slugBase}` : ''),
      }
      if (!catalogRow.url) {
        console.log('url yok')
        fail++
        continue
      }
      const detail = await fetchTourDetail(catalogRow)
      const cabinCount = detail.cabins?.length ?? 0

      if (DRY_RUN) {
        console.log(`dry-run cabins=${cabinCount} program=${detail.programDays?.length ?? 0}`)
        ok++
        await sleep(DELAY_MS)
        continue
      }

      await patchTatilsepetiCruiseListingContent(pg, row.listing_id, detail)
      ok++
      console.log(`ok cabins=${cabinCount}`)
    } catch (e) {
      fail++
      console.log(`hata: ${e.message}`)
    }
    await sleep(DELAY_MS)
  }

  await pg.end()
  console.log(`\nBitti: ${ok} ok, ${fail} hata`)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

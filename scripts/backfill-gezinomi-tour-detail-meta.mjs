/**
 * Gezinomi kültür tur — kalkış noktaları, dönem ayları, konaklama bölümü backfill
 *
 *   node scripts/backfill-gezinomi-tour-detail-meta.mjs --dry-run --limit 5
 *   node scripts/backfill-gezinomi-tour-detail-meta.mjs --slug eskisehir-dogu-anadolu
 */

import { fetchGezinomiTourDetail, summarizeGezinomiPeriods } from './lib/gezinomi-api.mjs'
import {
  resolveGezinomiTourImportContext,
  upsertGezinomiTourListing,
} from './lib/gezinomi-listing-db.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const slugIdx = process.argv.indexOf('--slug')
const SLUG = slugIdx >= 0 ? process.argv[slugIdx + 1] : ''
const DELAY_MS = Number(process.env.GEIZINOMI_DELAY_MS || 400)

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const pg = createPgClient()
  await pg.connect()
  const ctx = await resolveGezinomiTourImportContext(
    pg,
    process.env.GEIZINOMI_ORG_ID || 'a0000000-0000-4000-8000-000000000001',
  )

  let sql = `
    SELECT l.id::text AS listing_id, l.slug, l.external_listing_ref AS product_id,
           la.value_json->'catalog' AS catalog
    FROM listings l
    JOIN listing_attributes la ON la.listing_id = l.id AND la.group_code = 'gezinomi' AND la.key = 'snapshot'
    WHERE l.external_provider_code = 'gezinomi'
      AND l.category_id = (SELECT id FROM product_categories WHERE code = 'tour' LIMIT 1)
  `
  const params = []
  if (SLUG) {
    params.push(SLUG)
    sql += ` AND l.slug = $${params.length}`
  }
  sql += ' ORDER BY l.slug'
  if (LIMIT > 0) sql += ` LIMIT ${LIMIT}`

  const { rows } = await pg.query(sql, params)
  console.log(`Gezinomi tur detay meta backfill — ${rows.length} ilan, dry-run=${DRY_RUN}`)

  let ok = 0
  let fail = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const catalog = row.catalog || {}
    const link = catalog.link
    const productId = Number(row.product_id || catalog.productId)
    process.stdout.write(`[${i + 1}/${rows.length}] ${row.slug} … `)

    if (!link || !productId) {
      console.log('link/productId yok')
      fail++
      continue
    }

    try {
      const detail = await fetchGezinomiTourDetail({
        link,
        productId,
        typeId: catalog.tourTypeId ?? 1,
        name: catalog.productName,
      })
      if (detail.model) {
        detail.periods = summarizeGezinomiPeriods(detail.model)
      }

      if (DRY_RUN) {
        const deps = detail.model?.tourDepartures?.length ?? 0
        const times = detail.model?.tourPeriodTimes?.length ?? 0
        const info = detail.model?.tourDescriptions?.length ?? 0
        console.log(`dry-run departures=${deps} periodTimes=${times} descSections=${info}`)
        ok++
        await sleep(DELAY_MS)
        continue
      }

      await upsertGezinomiTourListing(pg, ctx, { ...catalog, productId }, {
        status: 'published',
        detail,
        galleryUrls: [],
        dryRun: false,
      })
      ok++
      console.log('ok')
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

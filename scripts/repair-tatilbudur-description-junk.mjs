#!/usr/bin/env node
/**
 * TatilBudur otel açıklamalarındaki UI kromunu temizler (Fiyat Tablosu / sekme artıkları).
 *
 *   node scripts/repair-tatilbudur-description-junk.mjs
 *   node scripts/repair-tatilbudur-description-junk.mjs --apply
 *   node scripts/repair-tatilbudur-description-junk.mjs --apply --slug queens-park-goynuk
 *   node scripts/repair-tatilbudur-description-junk.mjs --apply --limit 50
 */
import { createPgClient } from './lib/pg-client.mjs'
import {
  cleanTatilbudurDescriptionHtml,
  hasTatilbudurDescriptionJunk,
} from './lib/tatilbudur-description-clean.mjs'

const argv = process.argv.slice(2)
const APPLY = argv.includes('--apply')
const limitIdx = argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(argv[limitIdx + 1]) : 0
const slugIdx = argv.indexOf('--slug')
const SLUG = slugIdx >= 0 ? String(argv[slugIdx + 1] || '').trim() : ''

async function main() {
  const pg = createPgClient()
  await pg.connect()
  try {
    const params = []
    let sql = `
      SELECT l.id::text AS listing_id,
             l.slug,
             lt.locale_id,
             loc.code AS locale,
             lt.description
      FROM listings l
      JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'hotel'
      JOIN listing_translations lt ON lt.listing_id = l.id
      JOIN locales loc ON loc.id = lt.locale_id
      WHERE (
        l.external_provider_code = 'tatilbudur'
        OR coalesce(l.external_listing_ref, '') <> ''
        OR l.slug IS NOT NULL
      )
        AND lt.description IS NOT NULL
        AND (
          lt.description ILIKE '%Fiyat Tablosu%'
          OR lt.description ILIKE '%Oda Müsaitlik Takvimi%'
          OR lt.description ILIKE '%Genel](%'
          OR lt.description ILIKE '%Plaj & Havuz](%'
          OR lt.description ILIKE '%tatilbudur.com/%'
        )`
    if (SLUG) {
      params.push(SLUG)
      sql += ` AND lower(l.slug) = lower($${params.length})`
    }
    sql += ` ORDER BY l.slug, loc.code`
    if (LIMIT > 0) {
      params.push(LIMIT)
      sql += ` LIMIT $${params.length}`
    }

    const { rows } = await pg.query(sql, params)
    const targets = rows.filter((r) => hasTatilbudurDescriptionJunk(r.description))
    console.log(
      `[tatilbudur-desc] aday=${rows.length} junk=${targets.length} apply=${APPLY} slug=${SLUG || '-'}`,
    )

    let updated = 0
    for (const row of targets) {
      const cleaned = cleanTatilbudurDescriptionHtml(row.description)
      if (!cleaned || cleaned === row.description) {
        console.log(`  skip ${row.slug} [${row.locale}] (no change)`)
        continue
      }
      console.log(
        `  ${APPLY ? 'UPDATE' : 'dry'} ${row.slug} [${row.locale}] ${row.description.length}→${cleaned.length}`,
      )
      if (!APPLY) continue
      await pg.query(
        `UPDATE listing_translations
         SET description = $3
         WHERE listing_id = $1::uuid AND locale_id = $2`,
        [row.listing_id, row.locale_id, cleaned],
      )
      updated++
    }
    console.log(`[tatilbudur-desc] done updated=${updated}`)
  } finally {
    await pg.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

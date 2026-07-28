#!/usr/bin/env node
/**
 * Tatil evi başlıklarındaki AI/SEO slogan soneklerini düşürür (yalnız ilan adı).
 *
 *   node scripts/strip-holiday-home-marketing-titles.mjs
 *   node scripts/strip-holiday-home-marketing-titles.mjs --dry-run
 *   node scripts/strip-holiday-home-marketing-titles.mjs gulbay-villa
 */
import { createPgClient } from './lib/pg-client.mjs'
import {
  formatHolidayHomeTitleTr,
  stripHolidayMarketingTitleSuffix,
} from './lib/villa-title-tr.mjs'

const argv = process.argv.slice(2)
const DRY_RUN = argv.includes('--dry-run')
const slugs = argv.filter((a) => !a.startsWith('--'))

async function main() {
  const pg = createPgClient()
  await pg.connect()
  try {
    const params = []
    let where = `pc.code = 'holiday_home' AND lt.title LIKE '% - %'`
    if (slugs.length) {
      params.push(slugs)
      where += ` AND l.slug = ANY($${params.length}::text[])`
    }
    const { rows } = await pg.query(
      `SELECT lt.listing_id::text AS listing_id,
              lo.code AS locale,
              l.slug,
              lt.title,
              coalesce(la.value_json->>'property_type', 'villa') AS property_type
       FROM listing_translations lt
       JOIN listings l ON l.id = lt.listing_id
       JOIN product_categories pc ON pc.id = l.category_id
       JOIN locales lo ON lo.id = lt.locale_id
       LEFT JOIN listing_attributes la
         ON la.listing_id = l.id AND la.group_code = 'listing_meta' AND la.key = 'v1'
       WHERE ${where}
       ORDER BY l.slug, lo.code`,
      params,
    )

    let updated = 0
    for (const row of rows) {
      const stripped = stripHolidayMarketingTitleSuffix(row.title)
      if (stripped === row.title) continue
      const next =
        row.locale === 'tr'
          ? formatHolidayHomeTitleTr(stripped, row.property_type || 'villa')
          : stripped
      if (next === row.title) continue
      console.log(`${DRY_RUN ? '[dry] ' : ''}${row.slug} [${row.locale}]`)
      console.log(`  - ${row.title}`)
      console.log(`  + ${next}`)
      if (!DRY_RUN) {
        await pg.query(
          `UPDATE listing_translations
           SET title = $3
           WHERE listing_id = $1::uuid
             AND locale_id = (SELECT id FROM locales WHERE lower(code) = lower($2) LIMIT 1)`,
          [row.listing_id, row.locale, next],
        )
        updated += 1
      }
    }

    if (!DRY_RUN && (!slugs.length || slugs.includes('gulbay-villa'))) {
      await pg.query(
        `UPDATE listings
         SET location_name = 'Kalkan, Kışla, Antalya', updated_at = now()
         WHERE slug = 'gulbay-villa'`,
      )
      await pg.query(
        `UPDATE listing_attributes la
         SET value_json = coalesce(la.value_json, '{}'::jsonb) || jsonb_build_object(
           'city', 'Kalkan',
           'address', 'Kalkan Kışla, Antalya',
           'province_city', 'Antalya',
           'district_label', 'Kaş',
           'region_display', 'Kalkan, Kışla'
         )
         FROM listings l
         WHERE la.listing_id = l.id
           AND l.slug = 'gulbay-villa'
           AND la.group_code = 'listing_meta'
           AND la.key = 'v1'`,
      )
      console.log('[ok] gulbay-villa location → Kalkan, Kışla, Antalya')
    }

    console.log(`[done] updated=${updated} scanned=${rows.length}`)
  } finally {
    await pg.end()
  }
}

main().catch((err) => {
  console.error('[FAIL]', err?.stack || err)
  process.exit(1)
})

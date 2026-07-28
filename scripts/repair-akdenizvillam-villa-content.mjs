#!/usr/bin/env node
/**
 * Akdeniz Villam villalarını kaynaktan yeniden çeker:
 * - başlık / açıklama / konum
 * - sezonluk listing_price_rules
 * - vitrin_price + takvim
 *
 *   node scripts/repair-akdenizvillam-villa-content.mjs gulbay-villa
 *   node scripts/repair-akdenizvillam-villa-content.mjs gulbay-villa --dry-run
 *   node scripts/repair-akdenizvillam-villa-content.mjs --all-missing-prices
 */
import { createPgClient } from './lib/pg-client.mjs'
import { runAkdenizvillamImport } from './lib/akdenizvillam-listing-db.mjs'

const argv = process.argv.slice(2)
const DRY_RUN = argv.includes('--dry-run')
const ALL_MISSING = argv.includes('--all-missing-prices')
const slugs = argv.filter((a) => !a.startsWith('--'))

async function listMissingPriceSlugs(pg) {
  const { rows } = await pg.query(
    `SELECT l.slug
     FROM listings l
     JOIN product_categories pc ON pc.id = l.category_id
     WHERE pc.code = 'holiday_home'
       AND l.status = 'published'
       AND l.external_provider_code = 'akdenizvillam'
       AND NOT EXISTS (
         SELECT 1 FROM listing_price_rules r WHERE r.listing_id = l.id
       )
     ORDER BY l.slug`,
  )
  return rows.map((r) => r.slug)
}

async function main() {
  const pg = createPgClient()
  await pg.connect()
  try {
    let targets = [...slugs]
    if (ALL_MISSING) {
      targets = await listMissingPriceSlugs(pg)
      console.log(`[info] fiyat kuralı boş akdenizvillam villa: ${targets.length}`)
    }
    if (!targets.length) {
      console.error('Kullanım: node scripts/repair-akdenizvillam-villa-content.mjs <slug> [--dry-run]')
      console.error('       veya: --all-missing-prices')
      process.exit(1)
    }

    for (const slug of targets) {
      console.log(`[repair] ${slug}${DRY_RUN ? ' (dry-run)' : ''}`)
      const result = await runAkdenizvillamImport(slug, {
        dryRun: DRY_RUN,
        skipImages: true,
        status: 'published',
        updateExisting: true,
      })
      console.log(JSON.stringify(result, null, 2))
    }
  } finally {
    await pg.end()
  }
}

main().catch((err) => {
  console.error('[FAIL]', err?.stack || err)
  process.exit(1)
})

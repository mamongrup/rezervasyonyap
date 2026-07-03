/**
 * Airbnb oda sayfasını tatil evi ilanı olarak içe aktarır.
 *
 *   node scripts/import-airbnb-listing.mjs https://www.airbnb.com.tr/rooms/54114829
 *   node scripts/import-airbnb-listing.mjs 42526120 --dry-run
 *   node scripts/import-airbnb-listing.mjs 54114829 --skip-images
 */

import { runAirbnbImport } from './lib/airbnb-listing-db.mjs'

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const DRY_RUN = process.argv.includes('--dry-run')
const SKIP_IMAGES = process.argv.includes('--skip-images')
const STATUS = process.argv.includes('--draft') ? 'draft' : 'published'

const inputs = args.length ? args : []
if (!inputs.length) {
  console.error('Kullanım: node scripts/import-airbnb-listing.mjs <url-or-room-id> [daha fazla...]')
  process.exit(1)
}

const results = []
for (const input of inputs) {
  console.log('Import:', input, DRY_RUN ? '(dry-run)' : '', SKIP_IMAGES ? '(skip-images)' : '')
  const result = await runAirbnbImport(input, {
    dryRun: DRY_RUN,
    skipImages: SKIP_IMAGES,
    status: STATUS,
  })
  results.push(result)
  console.log(JSON.stringify(result, null, 2))
}

if (results.some((r) => r.action === 'skipped')) process.exit(0)

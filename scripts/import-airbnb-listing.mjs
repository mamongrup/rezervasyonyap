/**
 * Airbnb oda sayfasını tatil evi ilanı olarak içe aktarır.
 *
 *   node scripts/import-airbnb-listing.mjs https://www.airbnb.com.tr/rooms/54114829
 *   node scripts/import-airbnb-listing.mjs 42526120 --dry-run
 *   node scripts/import-airbnb-listing.mjs 54114829 --skip-images
 *   node scripts/import-airbnb-listing.mjs 42526120 54114829 --themes beachfront,sea_view
 */

import { runAirbnbImport } from './lib/airbnb-listing-db.mjs'

const argv = process.argv.slice(2)
const DRY_RUN = argv.includes('--dry-run')
const SKIP_IMAGES = argv.includes('--skip-images')
const STATUS = argv.includes('--draft') ? 'draft' : 'published'

function valueAfter(flag) {
  const i = argv.indexOf(flag)
  return i >= 0 ? argv[i + 1] : undefined
}

const EXTRA_THEMES = String(valueAfter('--themes') || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const flagValueSet = new Set()
for (const flag of ['--themes']) {
  const i = argv.indexOf(flag)
  if (i >= 0) {
    flagValueSet.add(flag)
    if (argv[i + 1]) flagValueSet.add(argv[i + 1])
  }
}
const inputs = argv.filter((a) => !a.startsWith('--') && !flagValueSet.has(a))

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
    extraThemes: EXTRA_THEMES,
  })
  results.push(result)
  console.log(JSON.stringify(result, null, 2))
}

if (results.some((r) => r.action === 'skipped')) process.exit(0)

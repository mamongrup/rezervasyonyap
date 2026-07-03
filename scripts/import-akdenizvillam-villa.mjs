/**
 * Akdeniz Villam villa detay sayfasını tatil evi ilanı olarak içe aktarır.
 *
 *   node scripts/import-akdenizvillam-villa.mjs https://www.akdenizvillam.com/kiralik-villalar/villa-gulbay
 *   node scripts/import-akdenizvillam-villa.mjs villa-gulbay --dry-run
 *   node scripts/import-akdenizvillam-villa.mjs gulbay-villa --skip-images
 */

import { runAkdenizvillamImport } from './lib/akdenizvillam-listing-db.mjs'

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const DRY_RUN = process.argv.includes('--dry-run')
const SKIP_IMAGES = process.argv.includes('--skip-images')
const STATUS = process.argv.includes('--draft') ? 'draft' : 'published'

const input = args[0]
if (!input) {
  console.error('Kullanım: node scripts/import-akdenizvillam-villa.mjs <url-or-slug>')
  process.exit(1)
}

console.log('Import:', input, DRY_RUN ? '(dry-run)' : '', SKIP_IMAGES ? '(skip-images)' : '')

const result = await runAkdenizvillamImport(input, {
  dryRun: DRY_RUN,
  skipImages: SKIP_IMAGES,
  status: STATUS,
})

console.log(JSON.stringify(result, null, 2))
if (result.dryRun) process.exit(0)
if (result.action === 'skipped') process.exit(0)

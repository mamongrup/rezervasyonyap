/**
 * Ham indirme / dönüşüm bekleyen yat görselleri özeti.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'
import { countRawFiles } from './lib/yacht-gallery-phases.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_ROOT = path.join(__dirname, '..', 'frontend', 'public', 'uploads', 'listings')

async function main() {
  const raw = await countRawFiles(UPLOADS_ROOT)

  const pg = createPgClient()
  await pg.connect()
  const { rows } = await pg.query(
    `SELECT COUNT(*)::int AS n FROM listings l
     JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'yacht_charter'
     WHERE NOT EXISTS (SELECT 1 FROM listing_images li WHERE li.listing_id = l.id)`,
  )
  await pg.end()

  console.log(`Görselsiz yat (DB): ${rows[0]?.n ?? '?'}`)
  console.log(`Ham indirilmiş (.raw): ${raw.slugs} ilan, ${raw.files} dosya`)
  console.log('')
  console.log('Komutlar:')
  console.log('  node scripts/run-local-yacht-download-only.mjs   # hızlı ham indirme')
  console.log('  node scripts/convert-yacht-galleries-raw.mjs       # AVIF + DB')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

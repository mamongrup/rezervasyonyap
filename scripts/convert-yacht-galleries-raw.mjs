/**
 * .raw klasörlerindeki ham görselleri AVIF'e çevir ve DB'ye kaydet.
 *
 *   node scripts/convert-yacht-galleries-raw.mjs
 *   node scripts/convert-yacht-galleries-raw.mjs --limit 20
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'
import {
  convertAndRegisterSlug,
  countRawFiles,
  listSlugsWithRawFiles,
} from './lib/yacht-gallery-phases.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_ROOT = path.join(__dirname, '..', 'frontend', 'public', 'uploads', 'listings')

const args = new Set(process.argv.slice(2))
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const slugIdx = process.argv.indexOf('--slug')
const SLUG_FILTER = slugIdx >= 0 ? process.argv[slugIdx + 1] : ''

async function main() {
  const before = await countRawFiles(UPLOADS_ROOT)
  console.log(`Ham bekleyen: ${before.slugs} ilan, ${before.files} dosya`)

  let slugs = await listSlugsWithRawFiles(UPLOADS_ROOT)
  if (SLUG_FILTER) {
    const needle = SLUG_FILTER.replace(/\*/g, '')
    slugs = slugs.filter((s) => s.includes(needle))
  }
  if (LIMIT > 0) slugs = slugs.slice(0, LIMIT)

  const pg = createPgClient()
  await pg.connect()

  let ok = 0
  let failed = 0

  for (const slug of slugs) {
    process.stdout.write(`  ${slug} … `)
    const { rows } = await pg.query(
      `SELECT l.id::text AS listing_id FROM listings l
       JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'yacht_charter'
       WHERE l.slug = $1 LIMIT 1`,
      [slug],
    )
    const listingId = rows[0]?.listing_id
    if (!listingId) {
      console.log('DB kaydı yok')
      failed += 1
      continue
    }
    try {
      const n = await convertAndRegisterSlug(pg, listingId, slug, UPLOADS_ROOT)
      if (n > 0) {
        console.log(`${n} AVIF`)
        ok += 1
      } else {
        console.log('dönüşüm yok')
        failed += 1
      }
    } catch (e) {
      console.log(`hata: ${e.message}`)
      failed += 1
    }
  }

  await pg.end()
  const after = await countRawFiles(UPLOADS_ROOT)
  console.log(`Bitti: başarılı=${ok}, başarısız=${failed}`)
  console.log(`Kalan ham: ${after.slugs} ilan, ${after.files} dosya`)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

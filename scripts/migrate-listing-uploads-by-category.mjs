/**
 * İlan görsellerini kategori alt klasörlerine taşır ve DB yollarını günceller.
 *
 * Hedef: uploads/listings/ilanlar/{yatlar|tatil-evleri|turlar|…}/{slug}/dosya.avif
 *
 *   node scripts/migrate-listing-uploads-by-category.mjs --dry-run
 *   node scripts/migrate-listing-uploads-by-category.mjs
 *   node scripts/migrate-listing-uploads-by-category.mjs --category yacht_charter
 */

import { existsSync } from 'node:fs'
import { mkdir, rename, readdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'
import {
  listingImageSubPath,
  listingStoragePrefix,
  remapPublicUploadUrl,
  remapStorageKey,
} from './lib/listing-upload-path.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_ROOT = path.join(__dirname, '..', 'frontend', 'public')
const UPLOADS_ROOT = path.join(PUBLIC_ROOT, 'uploads', 'listings')

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const catIdx = process.argv.indexOf('--category')
const CATEGORY_FILTER = catIdx >= 0 ? process.argv[catIdx + 1] : ''

function absFromStorageKey(key) {
  const k = String(key || '').trim().replace(/^\/+/, '')
  if (!k.startsWith('uploads/')) return null
  return path.join(PUBLIC_ROOT, ...k.split('/'))
}

async function moveFile(oldAbs, newAbs) {
  if (!existsSync(oldAbs)) return { moved: false, reason: 'missing' }
  if (existsSync(newAbs)) {
    const [a, b] = await Promise.all([stat(oldAbs), stat(newAbs)])
    if (a.size === b.size) return { moved: false, reason: 'exists' }
  }
  if (DRY_RUN) return { moved: true, reason: 'dry-run' }
  await mkdir(path.dirname(newAbs), { recursive: true })
  try {
    await rename(oldAbs, newAbs)
  } catch {
    const { copyFile, unlink } = await import('node:fs/promises')
    await copyFile(oldAbs, newAbs)
    await unlink(oldAbs).catch(() => {})
  }
  return { moved: true, reason: 'ok' }
}

async function cleanupEmptyDirs(dir) {
  if (!existsSync(dir) || dir === UPLOADS_ROOT) return
  let entries = []
  try {
    entries = await readdir(dir)
  } catch {
    return
  }
  if (entries.length) return
  if (DRY_RUN) return
  await rm(dir, { recursive: true, force: true }).catch(() => {})
  await cleanupEmptyDirs(path.dirname(dir))
}

const pg = createPgClient()
await pg.connect()

let listingFilter = ''
const params = []
if (CATEGORY_FILTER) {
  listingFilter = 'AND pc.code = $1'
  params.push(CATEGORY_FILTER)
}

const { rows: listings } = await pg.query(
  `SELECT l.id::text AS id, l.slug, pc.code AS category_code,
          l.featured_image_url, l.thumbnail_url
   FROM listings l
   JOIN product_categories pc ON pc.id = l.category_id
   WHERE EXISTS (SELECT 1 FROM listing_images li WHERE li.listing_id = l.id)
      OR coalesce(l.featured_image_url, l.thumbnail_url, '') <> ''
   ${listingFilter}
   ORDER BY pc.code, l.slug`,
  params,
)

let listingsTouched = 0
let imagesUpdated = 0
let filesMoved = 0
let filesMissing = 0
const samples = []

for (const row of listings) {
  const targetPrefix = `${listingStoragePrefix(row.category_code, row.slug)}/`
  const { rows: images } = await pg.query(
    `SELECT id::text, storage_key FROM listing_images WHERE listing_id = $1::uuid ORDER BY sort_order`,
    [row.id],
  )

  let changed = false
  const imageUpdates = []

  for (const img of images) {
    const oldKey = String(img.storage_key || '')
    if (!oldKey || oldKey.startsWith('http')) continue
    const newKey = remapStorageKey(oldKey, row.category_code, row.slug)
    if (newKey === oldKey) continue

    const oldAbs = absFromStorageKey(oldKey)
    const newAbs = absFromStorageKey(newKey)
    if (oldAbs && newAbs) {
      const res = await moveFile(oldAbs, newAbs)
      if (res.moved) filesMoved += 1
      else if (res.reason === 'missing') filesMissing += 1
    }

    imageUpdates.push({ id: img.id, newKey })
    changed = true
    imagesUpdated += 1
  }

  const newFeatured = remapPublicUploadUrl(row.featured_image_url, row.category_code, row.slug)
  const newThumb = remapPublicUploadUrl(row.thumbnail_url, row.category_code, row.slug)
  const coverChanged =
    newFeatured !== (row.featured_image_url || '') || newThumb !== (row.thumbnail_url || '')

  if (!changed && !coverChanged) continue

  if (samples.length < 10) {
    const first = imageUpdates[0]
    samples.push({
      slug: row.slug,
      category: row.category_code,
      from: first ? images.find((i) => i.id === first.id)?.storage_key : row.featured_image_url,
      to: first?.newKey || newFeatured,
    })
  }

  if (!DRY_RUN) {
    for (const u of imageUpdates) {
      await pg.query(`UPDATE listing_images SET storage_key = $2 WHERE id = $1::uuid`, [u.id, u.newKey])
    }
    if (coverChanged) {
      await pg.query(
        `UPDATE listings SET featured_image_url = $2, thumbnail_url = $3, updated_at = now() WHERE id = $1::uuid`,
        [row.id, newFeatured || null, newThumb || null],
      )
    }
  }

  listingsTouched += 1
}

if (!DRY_RUN) {
  const legacyDirs = [
    'wtatil',
    'bravo-event',
    'pexels',
    'yatlar',
    'tatil-evleri',
    'turlar',
    'aktiviteler',
    'oteller',
  ]
  for (const name of legacyDirs) {
    const d = path.join(UPLOADS_ROOT, name)
    if (existsSync(d)) await cleanupEmptyDirs(d)
  }
}

await pg.end()

console.log(DRY_RUN ? '[dry-run] özet:' : 'Bitti:')
console.log(`  ilan: ${listingsTouched}`)
console.log(`  görsel kaydı: ${imagesUpdated}`)
console.log(`  dosya taşındı: ${filesMoved}`)
console.log(`  dosya bulunamadı (DB güncellendi): ${filesMissing}`)
for (const s of samples) {
  console.log(`  ${s.category}/${s.slug}: ${s.from} → ${s.to}`)
}

/**
 * DB'de `.avif` yolu var, diskte dosya yoksa: aynı stem'de webp/jpg/png bul,
 * hedef `ilanlar/{kategori}/{slug}/` altına AVIF yaz, eski kopyayı temizle.
 *
 * Yarım kalan AVIF dönüşümü + klasör taşıma sonrası gri villa kartlarını onarır.
 *
 *   node scripts/repair-missing-local-upload-avifs.mjs --dry-run
 *   node scripts/repair-missing-local-upload-avifs.mjs --slugs=akbulut-villa-3,kas-sakura-villa
 *   node scripts/repair-missing-local-upload-avifs.mjs --limit=50
 */

import { existsSync } from 'node:fs'
import { copyFile, mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { createPgClient } from './lib/pg-client.mjs'
import { listingStoragePrefix } from './lib/listing-upload-path.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicRoot = path.join(root, 'frontend', 'public')
const uploadsListings = path.join(publicRoot, 'uploads', 'listings')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const slugArg = args.find((a) => a.startsWith('--slugs='))
const slugFilter = slugArg
  ? slugArg
      .slice('--slugs='.length)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : []
const limitArg = args.find((a) => a.startsWith('--limit='))
const limit = Math.max(0, Number(limitArg?.slice('--limit='.length) || 0) || 0)

const SIBLINGS = ['.webp', '.jpg', '.jpeg', '.JPEG', '.png', '.jfif']

function absFromKey(key) {
  const k = String(key || '')
    .trim()
    .replace(/^\/+/, '')
  if (!k.startsWith('uploads/')) return null
  return path.join(publicRoot, ...k.split('/'))
}

function stemAndDir(filePath) {
  const ext = path.extname(filePath)
  return { dir: path.dirname(filePath), stem: path.basename(filePath, ext) }
}

function siblingCandidates(absAvif) {
  const { dir, stem } = stemAndDir(absAvif)
  const out = []
  for (const ext of SIBLINGS) {
    out.push(path.join(dir, stem + ext))
  }
  // Eski yollar: listings/{cat}/slug, listings/YYYY/MM/slug
  const rel = path.relative(uploadsListings, dir)
  const parts = rel.split(path.sep).filter(Boolean)
  if (parts[0] === 'ilanlar' && parts.length >= 3) {
    const cat = parts[1]
    const slug = parts[2]
    const legacyDirs = [
      path.join(uploadsListings, cat, slug),
      path.join(uploadsListings, slug),
    ]
    for (const d of legacyDirs) {
      for (const ext of ['.avif', ...SIBLINGS]) {
        out.push(path.join(d, stem + ext))
      }
    }
  }
  return [...new Set(out)]
}

async function ensureAvifFromSource(sourceAbs, targetAvif, sharp) {
  const ext = path.extname(sourceAbs).toLowerCase()
  if (ext === '.avif') {
    if (path.resolve(sourceAbs) === path.resolve(targetAvif)) return 'exists'
    await mkdir(path.dirname(targetAvif), { recursive: true })
    await copyFile(sourceAbs, targetAvif)
    return 'copied-avif'
  }
  const AVIF_QUALITY = Number(process.env.AVIF_QUALITY || 72)
  const AVIF_EFFORT = Number(process.env.AVIF_EFFORT || 3)
  const MAX_WIDTH = Number(process.env.MAX_WIDTH || 1920)
  let pipeline = sharp(sourceAbs, { failOn: 'none', limitInputPixels: false }).rotate()
  const meta = await pipeline.metadata()
  if (meta.width && meta.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true })
  }
  const buffer = await pipeline.avif({ quality: AVIF_QUALITY, effort: AVIF_EFFORT }).toBuffer()
  await mkdir(path.dirname(targetAvif), { recursive: true })
  await writeFile(targetAvif, buffer)
  return 'converted'
}

const require = createRequire(path.join(root, 'frontend', 'package.json'))
let sharp
try {
  sharp = require('sharp')
} catch {
  console.error('sharp yok — frontend dizininde npm install gerekli')
  process.exit(1)
}
sharp.cache(false)
sharp.concurrency(1)

const pg = createPgClient()
await pg.connect()

const params = []
let where = `
  WHERE li.storage_key ~* '(^|/)uploads/listings/.*\\.avif$'
    AND li.storage_key !~* '^https?://'
`
if (slugFilter.length) {
  params.push(slugFilter)
  where += ` AND l.slug = ANY($${params.length}::text[])`
}

const sql = `
  SELECT l.id::text AS listing_id, l.slug, pc.code AS category_code,
         li.id::text AS image_id, li.storage_key,
         l.featured_image_url, l.thumbnail_url
  FROM listing_images li
  JOIN listings l ON l.id = li.listing_id
  JOIN product_categories pc ON pc.id = l.category_id
  ${where}
  ORDER BY l.slug, li.sort_order
`
const { rows } = await pg.query(sql, params)

const stats = { checked: 0, ok: 0, repaired: 0, missing: 0, failed: 0 }
const missingSlugs = new Map()

for (const row of rows) {
  if (limit && stats.repaired + stats.missing + stats.failed >= limit && stats.checked > 0) {
    // limit applies to problems touched; keep scanning until we hit enough repairs/misses
  }
  if (limit && stats.repaired >= limit) break

  stats.checked++
  const key = String(row.storage_key || '').trim().replace(/^\/+/, '')
  const target = absFromKey(key)
  if (!target) continue
  if (existsSync(target)) {
    stats.ok++
    continue
  }

  const candidates = siblingCandidates(target)
  const found = candidates.find((p) => existsSync(p))
  if (!found) {
    stats.missing++
    missingSlugs.set(row.slug, (missingSlugs.get(row.slug) || 0) + 1)
    console.log(`MISSING  ${row.slug}  ${key}`)
    continue
  }

  const relFound = path.relative(publicRoot, found)
  if (dryRun) {
    console.log(`PLAN     ${row.slug}  ${relFound} -> ${key}`)
    stats.repaired++
    continue
  }

  try {
    const how = await ensureAvifFromSource(found, target, sharp)
    // DB zaten .avif; kapak uyumu
    const publicUrl = `/${key}`
    if (row.featured_image_url && String(row.featured_image_url).includes(path.basename(key, '.avif'))) {
      await pg.query(
        `UPDATE listings SET featured_image_url = $2, thumbnail_url = coalesce(nullif(thumbnail_url,''), $2), updated_at = now()
         WHERE id = $1::uuid AND featured_image_url ~* '\\.avif(\\?|$)'`,
        [row.listing_id, publicUrl],
      )
    }
    stats.repaired++
    console.log(`OK (${how})  ${row.slug}  ${relFound} -> ${key}`)
    // Eski raster'ı hedef klasördeyse silme — convert script sonra temizler; legacy'de bırak.
  } catch (e) {
    stats.failed++
    console.error(`FAIL     ${row.slug}  ${key}: ${e.message}`)
  }
}

await pg.end()

console.log('')
console.log(dryRun ? '[dry-run] özet:' : 'özet:')
console.log(`  checked=${stats.checked} ok=${stats.ok} repaired=${stats.repaired} missing=${stats.missing} failed=${stats.failed}`)
if (missingSlugs.size) {
  const top = [...missingSlugs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
  console.log('  missing slugs:', top.map(([s, n]) => `${s}(${n})`).join(', '))
}
console.log(`  target prefix örnek: ${listingStoragePrefix('holiday_home', 'akbulut-villa-3')}/`)

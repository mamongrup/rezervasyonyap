/**
 * Akasia yat görselleri → site standardı AVIF (tatil evi ile aynı pipeline).
 *
 *   node scripts/convert-akasia-listings-avif.mjs --dry-run
 *   node scripts/convert-akasia-listings-avif.mjs
 *   node scripts/convert-akasia-listings-avif.mjs --limit 5
 *
 * Ortam: AVIF_QUALITY (varsayılan 72), MAX_WIDTH (varsayılan 1920), PG*
 */

import { existsSync } from 'node:fs'
import { readFile, unlink, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { createPgClient } from './lib/pg-client.mjs'

process.env.AVIF_QUALITY = process.env.AVIF_QUALITY || '72'
process.env.AVIF_EFFORT = process.env.AVIF_EFFORT || '3'
process.env.MAX_WIDTH = process.env.MAX_WIDTH || '1920'
const { bufferToAvif } = await import('./lib/wtatil-image-download.mjs')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TRAVEL_ROOT = path.resolve(__dirname, '..')
const UPLOADS_ROOT = path.join(TRAVEL_ROOT, 'frontend', 'public')

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0

const JPG_RE = /\.(jpe?g|png|webp|jfif)$/i

function absFromStorageKey(storageKey) {
  const k = String(storageKey || '').trim().replace(/^\//, '')
  return path.join(UPLOADS_ROOT, k.replace(/\//g, path.sep))
}

function avifKeyFromKey(storageKey) {
  return String(storageKey).replace(JPG_RE, '.avif')
}

async function convertFile(absSrc, absDest) {
  if (existsSync(absDest)) return { skipped: true }
  const raw = await readFile(absSrc)
  const avif = await bufferToAvif(raw)
  if (DRY_RUN) return { dryRun: true, bytes: avif.length }
  await mkdir(path.dirname(absDest), { recursive: true })
  await writeFile(absDest, avif)
  if (existsSync(absSrc)) await unlink(absSrc)
  return { ok: true, bytes: avif.length }
}

async function main() {
  const pg = createPgClient()
  await pg.connect()

  const { rows } = await pg.query(
    `SELECT li.id::text AS image_id, li.listing_id::text, li.sort_order, li.storage_key, l.slug
     FROM listing_images li
     JOIN listings l ON l.id = li.listing_id
     WHERE l.external_provider_code = 'akasia'
       AND li.storage_key ~* '\\.(jpe?g|png|webp|jfif)$'
     ORDER BY l.slug, li.sort_order, li.created_at`,
  )

  let targets = rows
  if (LIMIT > 0) targets = targets.slice(0, LIMIT)

  console.log(`Akasia AVIF dönüşümü — ${targets.length} görsel, dry-run=${DRY_RUN}`)

  let ok = 0
  let skip = 0
  let fail = 0
  const listingIds = new Set()

  for (let i = 0; i < targets.length; i += 1) {
    const row = targets[i]
    const absSrc = absFromStorageKey(row.storage_key)
    const newKey = avifKeyFromKey(row.storage_key)
    const absDest = absFromStorageKey(newKey)

    if (!existsSync(absSrc)) {
      fail += 1
      console.warn(`  [eksik dosya] ${row.slug} ${row.storage_key}`)
      continue
    }

    try {
      const res = await convertFile(absSrc, absDest)
      if (res.skipped) {
        skip += 1
        if (!DRY_RUN) {
          await pg.query(
            `UPDATE listing_images SET storage_key = $2, original_mime = 'image/avif' WHERE id = $1::uuid`,
            [row.image_id, newKey],
          )
          listingIds.add(row.listing_id)
        }
        continue
      }
      if (!DRY_RUN) {
        await pg.query(
          `UPDATE listing_images SET storage_key = $2, original_mime = 'image/avif' WHERE id = $1::uuid`,
          [row.image_id, newKey],
        )
        listingIds.add(row.listing_id)
      }
      ok += 1
      if ((i + 1) % 50 === 0 || i === targets.length - 1) {
        console.log(`  … ${i + 1}/${targets.length} (ok=${ok}, skip=${skip}, fail=${fail})`)
      }
    } catch (e) {
      fail += 1
      console.warn(`  [hata] ${row.slug}: ${e.message}`)
    }
  }

  if (!DRY_RUN && listingIds.size) {
    const ids = [...listingIds]
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50)
      await pg.query(
        `UPDATE listings l SET
           featured_image_url = regexp_replace(coalesce(l.featured_image_url, ''), '\\.(jpe?g|png|webp|jfif)(\\?.*)?$', '.avif\\2', 'i'),
           thumbnail_url = regexp_replace(coalesce(l.thumbnail_url, ''), '\\.(jpe?g|png|webp|jfif)(\\?.*)?$', '.avif\\2', 'i'),
           updated_at = now()
         WHERE l.id = ANY($1::uuid[])
           AND l.external_provider_code = 'akasia'`,
        [chunk],
      )
    }
    console.log(`Kapak URL güncellenen ilan: ${listingIds.size}`)
  }

  await pg.end()
  console.log(`Bitti: ok=${ok}, skip=${skip}, fail=${fail}`)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

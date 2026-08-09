/**
 * Wtatil katalog galerilerini DB ve yerel AVIF dosyalarıyla eşitler.
 * Kaynak galeride değişiklik varsa tüm galeri güvenli şekilde yeniden yazılır.
 */
import { existsSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { fetchAllTours, fetchWtatilToken } from './lib/wtatil-api.mjs'
import { createPgClient } from './lib/pg-client.mjs'
import { imageUrlsFromWtatilTour, resolveImportContext } from './lib/wtatil-listing-db.mjs'
import {
  avifFileName,
  downloadAndSaveAvif,
  isLocalAvifKey,
  isWtatilThumbnailUrl,
} from './lib/wtatil-image-download.mjs'
import { listingStorageKey, listingUploadDir } from './lib/listing-upload-path.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const UPLOADS_ROOT = path.join(ROOT, 'frontend', 'public', 'uploads', 'listings')
const require = createRequire(path.join(ROOT, 'frontend', 'package.json'))
const sharp = require('sharp')
sharp.cache(false)

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const pageSize = Number(process.env.WTATIL_PAGE_SIZE || 50)
const DEFAULT_ORG = 'a0000000-0000-4000-8000-000000000001'

async function validAvif(abs) {
  if (!existsSync(abs)) return false
  try {
    const meta = await sharp(abs, { failOn: 'none' }).metadata()
    return (meta.format === 'avif' || meta.mediaType === 'image/avif') && Number(meta.width) > 0 && Number(meta.height) > 0
  } catch {
    return false
  }
}

async function main() {
  const auth = await fetchWtatilToken()
  const tours = await fetchAllTours(auth.userName, auth.token, pageSize)
  const client = createPgClient()
  await client.connect()
  const ctx = await resolveImportContext(client, process.env.WTATIL_ORG_ID || DEFAULT_ORG)
  let checked = 0
  let changed = 0
  let skipped = 0
  let failures = 0

  try {
    const tourRows = LIMIT > 0 ? tours.slice(0, LIMIT) : tours
    for (const tour of tourRows) {
      const ref = String(tour.id)
      const listing = await client.query(
        `SELECT l.id::text AS listing_id, l.slug
         FROM listings l
         JOIN product_categories pc ON pc.id = l.category_id
         WHERE l.organization_id = $1::uuid AND pc.code = 'tour'
           AND l.external_provider_code = 'wtatil' AND l.external_listing_ref = $2
         LIMIT 1`,
        [ctx.orgId, ref],
      )
      if (!listing.rows[0]) continue
      checked += 1
      const { listing_id: listingId, slug } = listing.rows[0]
      const guard = await client.query(
        `SELECT 1 FROM listing_attributes
         WHERE listing_id = $1::uuid AND group_code = 'pexels' AND key = 'gallery_imported_at'
         LIMIT 1`,
        [listingId],
      )
      if (guard.rows.length && process.env.WTATIL_REPLACE_PEXELS_IMAGES !== '1') {
        skipped += 1
        continue
      }

      const rawUrls = imageUrlsFromWtatilTour(tour)
      const urls = rawUrls.some((url) => !isWtatilThumbnailUrl(url))
        ? rawUrls.filter((url) => !isWtatilThumbnailUrl(url))
        : rawUrls
      const current = await client.query(
        `SELECT id::text AS id, sort_order, storage_key
         FROM listing_images WHERE listing_id = $1::uuid ORDER BY sort_order, created_at`,
        [listingId],
      )
      const expected = urls.map((url, sort) => ({
        sort,
        url,
        fileName: avifFileName(sort, url),
        storageKey: listingStorageKey('tour', slug, avifFileName(sort, url)),
        abs: path.join(listingUploadDir(UPLOADS_ROOT, 'tour', slug), avifFileName(sort, url)),
      }))
      let complete = current.rows.length === expected.length
      if (complete) {
        for (let i = 0; i < expected.length; i += 1) {
          if (current.rows[i].storage_key !== expected[i].storageKey || !isLocalAvifKey(current.rows[i].storage_key)) {
            complete = false
            break
          }
          if (!(await validAvif(expected[i].abs))) {
            complete = false
            break
          }
        }
      }
      if (complete) continue
      if (!urls.length) {
        console.warn(`[media] ${ref} kaynak galeri boş; mevcut galeri korunuyor`)
        failures += 1
        continue
      }

      process.stdout.write(`[media ${checked}] ${ref} ${slug} (${urls.length}) ... `)
      if (DRY_RUN) {
        console.log('değişecek (dry-run)')
        changed += 1
        continue
      }

      const ready = []
      try {
        for (const item of expected) {
          const alreadyValid = await validAvif(item.abs)
          if (!alreadyValid) {
            if (existsSync(item.abs)) await rm(item.abs, { force: true })
            await mkdir(path.dirname(item.abs), { recursive: true })
            await downloadAndSaveAvif(item.url, item.abs)
          }
          if (!(await validAvif(item.abs))) throw new Error(`geçersiz AVIF: ${item.fileName}`)
          ready.push(item)
        }
      } catch (error) {
        failures += 1
        console.log(`hata: ${error.message}`)
        continue
      }

      await client.query('BEGIN')
      try {
        await client.query(`DELETE FROM listing_images WHERE listing_id = $1::uuid`, [listingId])
        for (const item of ready) {
          await client.query(
            `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime)
             VALUES ($1::uuid, $2, $3, 'image/avif')`,
            [listingId, item.sort, item.storageKey],
          )
        }
        const hero = ready[0]?.storageKey ? `/${ready[0].storageKey}` : null
        await client.query(
          `UPDATE listings SET featured_image_url = $2, thumbnail_url = $2, updated_at = now()
           WHERE id = $1::uuid`,
          [listingId, hero],
        )
        await client.query('COMMIT')
        changed += 1
        console.log('güncellendi')
      } catch (error) {
        await client.query('ROLLBACK')
        failures += 1
        console.log(`DB hata: ${error.message}`)
      }
    }
  } finally {
    await client.end()
  }
  console.log(`Wtatil medya: ${checked} kontrol, ${changed} güncellendi, ${skipped} korundu, ${failures} hata`)
  if (failures > 0 && !DRY_RUN) process.exitCode = 2
}

main().catch((error) => {
  console.error(`[media] kritik hata: ${error.message || error}`)
  process.exit(1)
})

#!/usr/bin/env node
/**
 * Varsayilan olarak Anatolia Villa 3 kaydindaki eski yat galerisini, belge
 * numarasi ile dogrulanan villa galerisiyle atomik olarak degistirir.
 *
 *   node scripts/repair-anatolia-villa-galleries.mjs
 *   node scripts/repair-anatolia-villa-galleries.mjs --ids 28,29,30,31
 *   node scripts/repair-anatolia-villa-galleries.mjs --dry-run
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ANATOLIA_VILLA_MEDIA_SOURCES,
  fetchVerifiedAnatoliaGallery,
} from './lib/anatolia-villa-media.mjs'
import { createPgClient } from './lib/pg-client.mjs'
import { downloadGalleryImages } from './lib/wtatil-image-download.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const uploadsRoot = path.join(root, 'frontend', 'public', 'uploads', 'listings')
const organizationId = 'a0000000-0000-4000-8000-000000000001'
const idsIndex = process.argv.indexOf('--ids')
const requestedIds = new Set(
  (idsIndex >= 0 ? String(process.argv[idsIndex + 1] || '') : '30')
    .split(',')
    .map((value) => Number(value.trim()))
    .filter(Number.isInteger),
)
const dryRun = process.argv.includes('--dry-run')

const targets = [...requestedIds]
  .map((legacyId) => {
    const source = ANATOLIA_VILLA_MEDIA_SOURCES.get(legacyId)
    return source ? { legacyId, ...source } : null
  })
  .filter(Boolean)

if (!targets.length) throw new Error('Gecerli Anatolia Villa kimligi bulunamadi (28,29,30,31).')

const pg = createPgClient()
await pg.connect()

const stats = { checked: 0, repaired: 0, images: 0, failed: 0 }
try {
  for (const target of targets) {
    stats.checked++
    const legacyId = target.legacyId
    process.stdout.write(`[${stats.checked}/${targets.length}] ${target.slug} kaynak dogrulaniyor... `)

    try {
      const gallery = await fetchVerifiedAnatoliaGallery(legacyId)
      const listingResult = await pg.query(
        `SELECT l.id::text, l.slug
         FROM listings l
         JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'holiday_home'
         WHERE l.organization_id = $1::uuid
           AND l.external_provider_code = 'bravo_space'
           AND l.external_listing_ref = $2
           AND l.slug = $3
         LIMIT 1`,
        [organizationId, String(legacyId), target.slug],
      )
      const listing = listingResult.rows[0]
      if (!listing) throw new Error(`Kanonik holiday_home kaydi bulunamadi: ${target.slug}`)

      console.log(`${gallery.urls.length} gorsel`)
      if (dryRun) continue

      const imageRows = await downloadGalleryImages(gallery.urls, listing.slug, uploadsRoot, {
        categoryCode: 'holiday_home',
        downloadConcurrency: 3,
        convertConcurrency: 1,
        headers: { referer: gallery.page },
      })
      if (imageRows.length < target.minImages) {
        throw new Error(`Indirilen galeri eksik: ${imageRows.length}/${target.minImages}`)
      }

      await pg.query('BEGIN')
      try {
        await pg.query(`DELETE FROM listing_images WHERE listing_id = $1::uuid`, [listing.id])
        for (const row of imageRows) {
          await pg.query(
            `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime)
             VALUES ($1::uuid, $2, $3, 'image/avif')`,
            [listing.id, row.sort, row.storageKey],
          )
        }
        const hero = `/${imageRows[0].storageKey}`
        await pg.query(
          `UPDATE listings
           SET featured_image_url = $2, thumbnail_url = $2, updated_at = now()
           WHERE id = $1::uuid`,
          [listing.id, hero],
        )
        await pg.query('COMMIT')
      } catch (error) {
        await pg.query('ROLLBACK')
        throw error
      }

      const verify = await pg.query(
        `SELECT count(*)::int AS image_count
         FROM listing_images WHERE listing_id = $1::uuid`,
        [listing.id],
      )
      if (verify.rows[0]?.image_count !== imageRows.length) {
        throw new Error(`Galeri sayisi dogrulanamadi: ${verify.rows[0]?.image_count}/${imageRows.length}`)
      }
      stats.repaired++
      stats.images += imageRows.length
      console.log(`  OK ${listing.slug}: ${imageRows.length} dogru villa gorseli`)
    } catch (error) {
      stats.failed++
      console.error(`  HATA ${target.slug}: ${error.message}`)
    }
  }
} finally {
  await pg.end()
}

console.log(JSON.stringify(stats))
if (stats.failed > 0) process.exitCode = 1

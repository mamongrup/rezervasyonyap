#!/usr/bin/env node
/**
 * Belirli TatilBudur slug'larını zorla yeniden host et (CDN → yerel AVIF).
 *
 *   node scripts/force-rehost-tatilbudur-slugs.mjs \
 *     anar-hotel-torba cinar-butik-otel-bodrum delfi-hotel \
 *     el-vino-hotel-suites oda-bodrum-gumusluk
 */
import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'
import {
  downloadGalleryImages,
  isExternalImageKey,
  normalizeDownloadUrl,
} from './lib/wtatil-image-download.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const uploadsRoot = path.join(root, 'frontend', 'public', 'uploads', 'listings')
const slugs = process.argv.slice(2).map((s) => s.trim().toLowerCase()).filter(Boolean)
if (!slugs.length) {
  console.error('Kullanım: node scripts/force-rehost-tatilbudur-slugs.mjs <slug…>')
  process.exit(1)
}

function repairUrl(url) {
  let u = normalizeDownloadUrl(url)
  return u
    .replace(/\.avif(\?|$)/i, '.jpg$1')
    .replace(/\.JPEG(\?|$)/, '.jpg$1')
}

const client = createPgClient()
await client.connect()
try {
  const listings = await client.query(
    `SELECT l.id::text, l.slug, l.featured_image_url, pc.code AS category_code
       FROM listings l
       JOIN product_categories pc ON pc.id=l.category_id
      WHERE l.external_provider_code='tatilbudur'
        AND l.slug = ANY($1::text[])`,
    [slugs],
  )
  console.log(`found=${listings.rows.length} requested=${slugs.length}`)
  let ok = 0
  let fail = 0
  for (const row of listings.rows) {
    const imgs = await client.query(
      `SELECT storage_key FROM listing_images WHERE listing_id=$1::uuid ORDER BY sort_order ASC`,
      [row.id],
    )
    const sources = []
    const seen = new Set()
    const push = (u) => {
      const raw = String(u || '').trim()
      if (!isExternalImageKey(raw)) return
      const r = repairUrl(raw)
      if (!r || seen.has(r)) return
      seen.add(r)
      sources.push(r)
    }
    push(row.featured_image_url)
    for (const im of imgs.rows) push(im.storage_key)
    if (!sources.length) {
      console.warn(`[skip] ${row.slug} no external urls (already local?)`)
      continue
    }
    try {
      console.log(`[…] ${row.slug} external=${sources.length}`)
      const saved = await downloadGalleryImages(sources, row.slug, uploadsRoot, {
        categoryCode: row.category_code,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      if (!saved?.length) {
        fail += 1
        console.warn(`[fail] ${row.slug} no files`)
        continue
      }
      const missing = []
      for (const item of saved) {
        const key = String(item.storageKey || '').replace(/^\/+/, '')
        const abs = path.join(root, 'frontend', 'public', key)
        if (!existsSync(abs)) missing.push(key)
      }
      if (missing.length) {
        fail += 1
        console.warn(`[fail] ${row.slug} missing on disk: ${missing.slice(0, 2).join(', ')}`)
        continue
      }
      const coverRaw = String(saved[0].storageKey || '').replace(/^\/+/, '')
      const cover = `/${coverRaw}`
      await client.query(
        `UPDATE listings SET featured_image_url=$2, thumbnail_url=$2, updated_at=now() WHERE id=$1::uuid`,
        [row.id, cover],
      )
      await client.query(
        `DELETE FROM listing_images WHERE listing_id=$1::uuid AND storage_key ~* '^https?://'`,
        [row.id],
      )
      await client.query(`DELETE FROM listing_images WHERE listing_id=$1::uuid`, [row.id])
      for (let i = 0; i < saved.length; i++) {
        const key = String(saved[i].storageKey || '').replace(/^\/+/, '')
        await client.query(
          `INSERT INTO listing_images (listing_id, storage_key, sort_order, original_mime)
           VALUES ($1::uuid, $2, $3, 'image/avif')`,
          [row.id, key, i],
        )
      }
      ok += 1
      console.log(`[ok] ${row.slug} → ${cover} (n=${saved.length})`)
    } catch (e) {
      fail += 1
      console.warn(`[fail] ${row.slug}`, e.message || e)
    }
  }
  console.log(JSON.stringify({ ok, fail, slugs }, null, 2))
} finally {
  await client.end()
}

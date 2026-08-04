#!/usr/bin/env node
/**
 * WTatil turlar — rehost sonrası kırık yerel /uploads galeriyi
 * listing_attributes wtatil/snapshot içindeki HTTPS (reserwation) URL'lerine geri yazar.
 *
 *   node scripts/restore-wtatil-images-from-snapshot.mjs --dry-run --limit 20
 *   node scripts/restore-wtatil-images-from-snapshot.mjs --batch-size 200
 *   node scripts/restore-wtatil-images-from-snapshot.mjs --slug bangkok-pattaya-phuket-…-wt-10588
 *
 * Kapak için hızlı SQL: modules/405_repair_wtatil_tour_images_from_snapshot.sql
 * Snapshot'ta HTTPS yoksa: node scripts/import-wtatil-tours.mjs (API yenileme)
 *
 * Ortam: PG* / backend.env (createPgClient)
 */

import { imageUrlsFromWtatilTour } from './lib/wtatil-listing-db.mjs'
import { createPgClient } from './lib/pg-client.mjs'
import { cliLog } from './lib/cli-log.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const batchIdx = process.argv.indexOf('--batch-size')
const BATCH = batchIdx >= 0 ? Number(process.argv[batchIdx + 1]) : 200
const offsetIdx = process.argv.indexOf('--offset')
const OFFSET = offsetIdx >= 0 ? Number(process.argv[offsetIdx + 1]) : 0
const slugIdx = process.argv.indexOf('--slug')
const SLUG = slugIdx >= 0 ? String(process.argv[slugIdx + 1] || '').trim() : ''

function repairCdnExt(url) {
  const u = String(url || '').trim()
  if (!u) return ''
  let out = u.startsWith('http://') ? `https://${u.slice(7)}` : u
  try {
    const host = new URL(out).hostname.toLowerCase()
    if ((host === 'reserwation.com' || host.endsWith('.reserwation.com')) && /\.avif(\?|#|$)/i.test(out)) {
      out = out.replace(/\.avif/i, '.jpg')
    }
  } catch {
    /* ignore */
  }
  return out
}

function isHttpsCdn(url) {
  return /^https:\/\//i.test(String(url || '').trim())
}

function parseSnapshotTour(raw) {
  if (!raw) return null
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return parsed?.catalog ?? parsed
  } catch {
    return null
  }
}

async function upsertGallery(pg, listingId, urls) {
  const list = [...new Set(urls.map(repairCdnExt).filter(isHttpsCdn))]
  if (!list.length) return 0
  await pg.query(
    `UPDATE listings SET featured_image_url = $2, thumbnail_url = $2, updated_at = now() WHERE id = $1::uuid`,
    [listingId, list[0]],
  )
  await pg.query(`DELETE FROM listing_images WHERE listing_id = $1::uuid`, [listingId])
  for (let i = 0; i < list.length; i++) {
    await pg.query(
      `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime)
       VALUES ($1::uuid, $2, $3, 'image/jpeg')`,
      [listingId, i, list[i]],
    )
  }
  return list.length
}

async function loadBrokenTours(pg, { offset, limit }) {
  const params = []
  let whereExtra = `
       AND (
         coalesce(l.featured_image_url, '') = ''
         OR l.featured_image_url ~ '^/'
         OR l.featured_image_url ~* 'reserwation\\.com.*\\.avif'
         OR EXISTS (
           SELECT 1 FROM listing_images li
           WHERE li.listing_id = l.id
             AND (
               li.storage_key ~ '^/'
               OR li.storage_key ~* 'reserwation\\.com.*\\.avif'
             )
         )
       )`
  if (SLUG) {
    params.push(SLUG)
    whereExtra += ` AND l.slug = $${params.length}`
  }
  params.push(offset, limit)
  const offP = params.length - 1
  const limP = params.length
  const r = await pg.query(
    `SELECT l.id::text AS listing_id,
            l.slug,
            l.featured_image_url,
            la.value_json::text AS snapshot_json
     FROM listings l
     LEFT JOIN listing_attributes la
       ON la.listing_id = l.id AND la.group_code = 'wtatil' AND la.key = 'snapshot'
     WHERE l.external_provider_code = 'wtatil'
       ${whereExtra}
     ORDER BY l.updated_at ASC, l.slug ASC
     OFFSET $${offP}
     LIMIT $${limP}`,
    params,
  )
  return r.rows
}

async function main() {
  const pg = createPgClient()
  await pg.connect()
  const stats = {
    scanned: 0,
    restored: 0,
    images: 0,
    noSnapshot: 0,
    noHttps: 0,
  }

  let offset = OFFSET
  const hardLimit = LIMIT > 0 ? LIMIT : Number.POSITIVE_INFINITY

  try {
    cliLog(
      `restore-wtatil-images-from-snapshot ${DRY_RUN ? '(dry-run) ' : ''}batch=${BATCH} offset=${OFFSET}` +
        (SLUG ? ` slug=${SLUG}` : ''),
    )

    while (stats.scanned < hardLimit) {
      const take = Math.min(BATCH, hardLimit - stats.scanned)
      const rows = await loadBrokenTours(pg, { offset, limit: take })
      if (!rows.length) break

      for (const row of rows) {
        stats.scanned += 1
        const tour = parseSnapshotTour(row.snapshot_json)
        if (!tour) {
          stats.noSnapshot += 1
          cliLog(`[SKIP] ${row.slug} — snapshot yok`)
          continue
        }
        const httpsUrls = [...new Set(imageUrlsFromWtatilTour(tour).map(repairCdnExt).filter(isHttpsCdn))]
        if (!httpsUrls.length) {
          stats.noHttps += 1
          cliLog(`[SKIP] ${row.slug} — snapshot'ta HTTPS yok`)
          continue
        }

        if (DRY_RUN) {
          stats.restored += 1
          stats.images += httpsUrls.length
          cliLog(`[DRY] ${row.slug} → ${httpsUrls.length} CDN | ${httpsUrls[0].slice(0, 90)}…`)
          continue
        }

        const n = await upsertGallery(pg, row.listing_id, httpsUrls)
        stats.restored += 1
        stats.images += n
        cliLog(`[OK] ${row.slug} görsel:${n}`)
      }

      if (rows.length < take) break
      offset += rows.length
    }

    cliLog(
      `Özet: scanned=${stats.scanned} restored=${stats.restored} images=${stats.images}` +
        ` noSnapshot=${stats.noSnapshot} noHttps=${stats.noHttps}`,
    )
  } finally {
    await pg.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

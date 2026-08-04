#!/usr/bin/env node
/**
 * WTatil turlar — kırık yerel /uploads veya bulanık -thumbnail kapakları
 * listing_attributes wtatil/snapshot HTTPS galerisine (tam boy tercih) geri yazar.
 *
 *   node scripts/restore-wtatil-images-from-snapshot.mjs --dry-run --limit 20
 *   node scripts/restore-wtatil-images-from-snapshot.mjs --force --batch-size 200
 *   node scripts/restore-wtatil-images-from-snapshot.mjs --slug …-wt-10588
 *
 * Ardından Gezinomi ile zenginleştir (tur kodu eşleşmesi, CDN URL — indirme yok):
 *   node scripts/import-gezinomi-tour-images.mjs --cdn --few-only --min-images 4
 *
 * Ortam: set -a && . /etc/rezervasyonyap/backend.env && set +a
 */

import { imageUrlsFromWtatilTour } from './lib/wtatil-listing-db.mjs'
import { createPgClient } from './lib/pg-client.mjs'
import { cliLog } from './lib/cli-log.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const FORCE = args.has('--force')
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

function isThumbnailUrl(url) {
  return /-thumbnail\.(jpe?g|png|webp|avif)(\?|#|$)/i.test(String(url || ''))
}

/** Tam boy önce; yalnızca thumbnail varsa onlar. */
function orderFullSizeFirst(urls) {
  const full = []
  const thumbs = []
  const seen = new Set()
  for (const raw of urls) {
    const u = repairCdnExt(raw)
    if (!isHttpsCdn(u) || seen.has(u)) continue
    seen.add(u)
    if (isThumbnailUrl(u)) thumbs.push(u)
    else full.push(u)
  }
  return full.length ? [...full, ...thumbs] : thumbs
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
  const list = orderFullSizeFirst(urls)
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
  // storage_key çoğu zaman leading slash'sız: uploads/listings/...
  let whereExtra = FORCE
    ? ''
    : `
       AND (
         coalesce(l.featured_image_url, '') = ''
         OR l.featured_image_url ~* '(^|/)uploads/'
         OR l.featured_image_url ~* '-thumbnail\\.'
         OR l.featured_image_url ~* 'reserwation\\.com.*\\.avif'
         OR EXISTS (
           SELECT 1 FROM listing_images li
           WHERE li.listing_id = l.id
             AND (
               li.storage_key ~* '(^|/)uploads/'
               OR li.storage_key !~* '^https?://'
               OR li.storage_key ~* 'reserwation\\.com.*\\.avif'
             )
         )
         OR (
           SELECT count(*)::int FROM listing_images li
           WHERE li.listing_id = l.id AND li.storage_key ~* '^https?://'
             AND li.storage_key !~* '-thumbnail\\.'
         ) < 2
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
    thumbOnly: 0,
  }

  let offset = OFFSET
  const hardLimit = LIMIT > 0 ? LIMIT : Number.POSITIVE_INFINITY

  try {
    cliLog(
      `restore-wtatil-images-from-snapshot ${DRY_RUN ? '(dry-run) ' : ''}${FORCE ? '(force) ' : ''}batch=${BATCH} offset=${OFFSET}` +
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
        const httpsUrls = orderFullSizeFirst(imageUrlsFromWtatilTour(tour))
        if (!httpsUrls.length) {
          stats.noHttps += 1
          cliLog(`[SKIP] ${row.slug} — snapshot'ta HTTPS yok`)
          continue
        }
        const fullCount = httpsUrls.filter((u) => !isThumbnailUrl(u)).length
        if (!fullCount) stats.thumbOnly += 1

        if (DRY_RUN) {
          stats.restored += 1
          stats.images += httpsUrls.length
          cliLog(
            `[DRY] ${row.slug} → ${httpsUrls.length} CDN (tam:${fullCount}) | ${httpsUrls[0].slice(0, 90)}…`,
          )
          continue
        }

        const n = await upsertGallery(pg, row.listing_id, httpsUrls)
        stats.restored += 1
        stats.images += n
        cliLog(`[OK] ${row.slug} görsel:${n} tam:${fullCount}`)
      }

      if (rows.length < take) break
      // Filtreli kümeden düşen satırlar → offset 0 ile ilerle (FORCE değilse)
      offset = FORCE ? offset + rows.length : 0
    }

    cliLog(
      `Özet: scanned=${stats.scanned} restored=${stats.restored} images=${stats.images}` +
        ` noSnapshot=${stats.noSnapshot} noHttps=${stats.noHttps} thumbOnly=${stats.thumbOnly}`,
    )
  } finally {
    await pg.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

#!/usr/bin/env node
/**
 * KPlus / Travelrobot oteller — rehost sonrası kırık yerel /uploads galeriyi
 * listing_attributes travelrobot/snapshot içindeki HTTPS CDN URL'lerine geri yazar.
 * API çağrısı yok; snapshot'ta CDN varsa anında düzelir.
 *
 *   node scripts/restore-travelrobot-images-from-snapshot.mjs --dry-run --limit 20
 *   node scripts/restore-travelrobot-images-from-snapshot.mjs --batch-size 200
 *   node scripts/restore-travelrobot-images-from-snapshot.mjs --slug azak-hotel-tr-KTR2638022
 *
 * Snapshot'ta HTTPS yoksa atlanır → o oteller için:
 *   node scripts/backfill-all-travelrobot-hotels.mjs --code KTR… --no-with-rooms
 *
 * Ortam: PG* / backend.env (createPgClient)
 */

import { collectHotelImageUrls } from './lib/travelrobot-listing-db.mjs'
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
const codeIdx = process.argv.indexOf('--code')
const CODE = codeIdx >= 0 ? String(process.argv[codeIdx + 1] || '').trim() : ''

/** 379 sonrası yanlış .avif → CDN'in gerçek uzantısı */
function repairCdnExt(url) {
  const u = String(url || '').trim()
  if (!u) return ''
  try {
    const host = new URL(u).hostname.toLowerCase()
    if (
      (host === 'i.travelapi.com' || host.endsWith('.travelapi.com') || host.endsWith('.hotelbeds.com')) &&
      /\.avif(\?|#|$)/i.test(u)
    ) {
      return u.replace(/\.avif/i, '.jpg')
    }
  } catch {
    /* ignore */
  }
  return u
}

function isHttpsCdn(url) {
  const u = String(url || '').trim()
  return /^https?:\/\//i.test(u)
}

function isLocalUpload(url) {
  const u = String(url || '').trim()
  return u.startsWith('/uploads/') || u.includes('/uploads/listings/')
}

function parseSnapshotHotel(raw) {
  if (!raw) return null
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return parsed?.catalog ?? parsed?.hotel ?? parsed?.Hotel ?? parsed
  } catch {
    return null
  }
}

async function upsertGallery(pg, listingId, urls) {
  const list = urls.map(repairCdnExt).filter((u) => isHttpsCdn(u))
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

async function loadBrokenHotels(pg, { offset, limit }) {
  const params = []
  let whereExtra = `
       AND (
         coalesce(l.featured_image_url, '') = ''
         OR l.featured_image_url ~ '^/'
         OR l.featured_image_url ~* 'travelapi\\.com.*\\.avif'
         OR l.featured_image_url ~* 'hotelbeds\\.com.*\\.avif'
         OR EXISTS (
           SELECT 1 FROM listing_images li
           WHERE li.listing_id = l.id
             AND (
               li.storage_key ~ '^/'
               OR li.storage_key ~* 'travelapi\\.com.*\\.avif'
               OR li.storage_key ~* 'hotelbeds\\.com.*\\.avif'
             )
         )
       )`
  if (SLUG) {
    params.push(SLUG)
    whereExtra += ` AND l.slug = $${params.length}`
  }
  if (CODE) {
    params.push(CODE)
    whereExtra += ` AND lhd.travelrobot_hotel_code = $${params.length}`
  }
  params.push(offset, limit)
  const offP = params.length - 1
  const limP = params.length
  const r = await pg.query(
    `SELECT l.id::text AS listing_id,
            l.slug,
            l.featured_image_url,
            lhd.travelrobot_hotel_code AS code,
            la.value_json::text AS snapshot_json
     FROM listings l
     JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'hotel'
     JOIN listing_hotel_details lhd ON lhd.listing_id = l.id
     LEFT JOIN listing_attributes la
       ON la.listing_id = l.id AND la.group_code = 'travelrobot' AND la.key = 'snapshot'
     WHERE l.external_provider_code = 'travelrobot'
       AND lhd.travelrobot_hotel_code IS NOT NULL
       AND trim(lhd.travelrobot_hotel_code) <> ''
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
    skippedOk: 0,
  }

  let offset = OFFSET
  const hardLimit = LIMIT > 0 ? LIMIT : Number.POSITIVE_INFINITY

  try {
    cliLog(
      `restore-travelrobot-images-from-snapshot ${DRY_RUN ? '(dry-run) ' : ''}batch=${BATCH} offset=${OFFSET}` +
        (SLUG ? ` slug=${SLUG}` : '') +
        (CODE ? ` code=${CODE}` : ''),
    )

    while (stats.scanned < hardLimit) {
      const take = Math.min(BATCH, hardLimit - stats.scanned)
      const rows = await loadBrokenHotels(pg, { offset, limit: take })
      if (!rows.length) break

      for (const row of rows) {
        stats.scanned += 1
        const hotel = parseSnapshotHotel(row.snapshot_json)
        if (!hotel) {
          stats.noSnapshot += 1
          cliLog(`[SKIP] ${row.slug} (${row.code}) — snapshot yok`)
          continue
        }
        const rawUrls = collectHotelImageUrls(hotel)
        const httpsUrls = [...new Set(rawUrls.map(repairCdnExt).filter(isHttpsCdn))]
        if (!httpsUrls.length) {
          stats.noHttps += 1
          const localOnly = rawUrls.filter(isLocalUpload).length
          cliLog(
            `[SKIP] ${row.slug} (${row.code}) — snapshot'ta HTTPS yok` +
              (localOnly ? ` (yalnızca ${localOnly} yerel URL)` : ''),
          )
          continue
        }

        if (DRY_RUN) {
          stats.restored += 1
          stats.images += httpsUrls.length
          cliLog(
            `[DRY] ${row.slug} (${row.code}) → ${httpsUrls.length} CDN` +
              ` | cover=${httpsUrls[0].slice(0, 80)}…`,
          )
          continue
        }

        const n = await upsertGallery(pg, row.listing_id, httpsUrls)
        stats.restored += 1
        stats.images += n
        cliLog(`[OK] ${row.slug} (${row.code}) görsel:${n}`)
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

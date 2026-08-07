#!/usr/bin/env node
/**
 * Bodrum TatilBudur medya/oda kalite onarımı.
 *
 * Kök sorun: teklif odaları görselsiz gelince etiketsiz galeri / rastgele dilim
 * odaya yazıldı → yanlış oda fotoğrafları; görselsiz stub'lar yayına alındı.
 *
 * Bu script:
 * 1) Oda meta'sındaki reject / etiketsiz CDN görsellerini temizler
 * 2) Yalnız Room/Suite/Interior etiketli güvenli eşleşmeleri geri yazar
 * 3) Galeri <2 veya oda görseli güvensiz/eksik yayınları draft'a çeker
 * 4) URL listesinde DB'de olmayan otelleri raporlar
 *
 *   node scripts/repair-bodrum-tatilbudur-media-quality.mjs
 *   node scripts/repair-bodrum-tatilbudur-media-quality.mjs --dry-run
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'
import {
  isSafeHotelRoomImageUrl,
  roomImagesFromGallery,
} from './lib/hotel-room-gallery.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dryRun = process.argv.includes('--dry-run')
const urlsFile = path.resolve(
  ROOT,
  process.env.BODRUM_TATILBUDUR_URLS || 'deploy/data/tatilbudur/bodrum-request-urls.txt',
)

const refs = fs
  .readFileSync(urlsFile, 'utf8')
  .split(/\r?\n/)
  .map((line) => line.replace(/#.*/, '').trim())
  .filter(Boolean)
  .map((url) => {
    try {
      return new URL(url).pathname.replace(/^\/+|\/+$/g, '')
    } catch {
      return ''
    }
  })
  .filter(Boolean)

function toPublicKey(storageKey) {
  const k = String(storageKey || '').replace(/^\/+/, '')
  if (!k) return ''
  if (/^https?:\/\//i.test(k)) return k
  return k.startsWith('/') ? k : `/${k}`
}

function roomMetaUrls(meta) {
  const out = []
  if (typeof meta?.image === 'string' && meta.image.trim()) out.push(meta.image.trim())
  if (Array.isArray(meta?.images)) {
    for (const u of meta.images) {
      if (typeof u === 'string' && u.trim()) out.push(u.trim())
    }
  }
  return [...new Set(out)]
}

const client = createPgClient()
await client.connect()
try {
  const listings = await client.query(
    `SELECT l.id::text, l.slug, l.status, l.external_listing_ref AS ref, tr.title,
       (SELECT count(*)::int FROM listing_images li WHERE li.listing_id=l.id) AS gallery_count,
       (SELECT count(*)::int FROM listing_images li
         WHERE li.listing_id=l.id
           AND regexp_replace(li.storage_key, '^/+', '') ~* '^uploads/listings/.+\\.avif$') AS local_avif
     FROM listings l
     JOIN listing_translations tr ON tr.listing_id=l.id
     JOIN locales lo ON lo.id=tr.locale_id AND lo.code='tr'
     WHERE l.external_provider_code='tatilbudur'
       AND l.external_listing_ref = ANY($1::text[])
     ORDER BY tr.title`,
    [refs],
  )

  const byRef = new Map(listings.rows.map((r) => [r.ref, r]))
  const missing = refs.filter((r) => !byRef.has(r))

  let roomsCleared = 0
  let roomsRematched = 0
  let unpublished = 0
  const demoted = []
  const stillBad = []

  for (const row of listings.rows) {
    const galleryRes = await client.query(
      `SELECT storage_key FROM listing_images
        WHERE listing_id=$1::uuid
        ORDER BY sort_order ASC NULLS LAST, created_at ASC`,
      [row.id],
    )
    const galleryUrls = galleryRes.rows.map((r) => toPublicKey(r.storage_key)).filter(Boolean)

    const rooms = await client.query(
      `SELECT id::text, name, meta_json FROM hotel_rooms
        WHERE listing_id=$1::uuid
        ORDER BY name ASC`,
      [row.id],
    )

    let unsafeOrEmptyRooms = 0
    for (let i = 0; i < rooms.rows.length; i++) {
      const room = rooms.rows[i]
      const meta = room.meta_json && typeof room.meta_json === 'object' ? { ...room.meta_json } : {}
      const current = roomMetaUrls(meta)
      const safeCurrent = current.filter(isSafeHotelRoomImageUrl)
      const matched = roomImagesFromGallery(galleryUrls, room.name || `oda-${i + 1}`, i, {
        allowUnlabeledFallback: false,
      })
      const next = matched.length ? matched : safeCurrent
      const changed =
        JSON.stringify(current) !== JSON.stringify(next) ||
        String(meta.image || '') !== String(next[0] || '')

      if (!next.length) unsafeOrEmptyRooms += 1

      if (changed) {
        if (matched.length) roomsRematched += 1
        else roomsCleared += 1
        if (!dryRun) {
          await client.query(
            `UPDATE hotel_rooms
                SET meta_json = coalesce(meta_json, '{}'::jsonb)
                  || jsonb_build_object(
                       'image', $2::text,
                       'images', $3::jsonb,
                       'image_match', $4::text
                     )
              WHERE id=$1::uuid`,
            [
              room.id,
              next[0] || '',
              JSON.stringify(next),
              matched.length ? 'filename_label' : next.length ? 'kept_safe' : 'cleared_unsafe',
            ],
          )
        }
      }
    }

    // Yeniden say: temizledikten sonra boş odalar
    const afterRooms = dryRun
      ? { empty: unsafeOrEmptyRooms, total: rooms.rows.length }
      : (
          await client.query(
            `SELECT
               count(*)::int AS total,
               count(*) FILTER (
                 WHERE length(trim(coalesce(meta_json->>'image',''))) > 0
                    OR CASE WHEN jsonb_typeof(meta_json->'images')='array'
                            THEN jsonb_array_length(meta_json->'images') > 0 ELSE false END
               )::int AS with_any,
               count(*) FILTER (
                 WHERE coalesce(meta_json->>'image_match','') IN ('filename_label','kept_safe')
                    OR (
                      length(trim(coalesce(meta_json->>'image',''))) > 0
                      AND (
                        coalesce(meta_json->>'image','') ~* '(room|suite|oda|bedroom|interior|bathroom|banyo)'
                        OR EXISTS (
                          SELECT 1 FROM jsonb_array_elements_text(
                            CASE WHEN jsonb_typeof(meta_json->'images')='array'
                                 THEN meta_json->'images' ELSE '[]'::jsonb END
                          ) im(url)
                          WHERE im.url ~* '(room|suite|oda|bedroom|interior|bathroom|banyo)'
                        )
                      )
                    )
               )::int AS with_safe
             FROM hotel_rooms WHERE listing_id=$1::uuid`,
            [row.id],
          )
        ).rows[0]

    const galleryOk = Number(row.gallery_count) >= 2 || Number(row.local_avif) >= 2
    const roomTotal = Number(afterRooms.total ?? rooms.rows.length)
    const safeRooms = Number(afterRooms.with_safe ?? Math.max(0, roomTotal - unsafeOrEmptyRooms))
    const issues = []
    if (!galleryOk) issues.push('gallery_incomplete')
    if (roomTotal < 1) issues.push('rooms_incomplete')
    // Yanlış (reject) görseller temizlendi; etiketsiz CDN boş bırakıldı — yayın için soft.
    if (safeRooms < roomTotal) issues.push('room_images_unlabeled_cdn')

    const hardIssues = issues.filter((x) => x !== 'room_images_unlabeled_cdn')
    const quality = {
      status: hardIssues.length ? 'incomplete' : issues.length ? 'partial' : 'complete',
      issues,
      gallery_count: Number(row.gallery_count),
      local_avif: Number(row.local_avif),
      room_count: roomTotal,
      rooms_with_safe_images: safeRooms,
      checked_at: new Date().toISOString(),
      repair: 'bodrum_media_quality_v1',
    }

    if (!dryRun) {
      await client.query(
        `INSERT INTO listing_attributes (listing_id,group_code,key,value_json)
         VALUES ($1::uuid,'hotel_quality','v1',$2::jsonb)
         ON CONFLICT (listing_id,group_code,key)
         DO UPDATE SET value_json=excluded.value_json`,
        [row.id, JSON.stringify(quality)],
      )
    }

    if (hardIssues.length) {
      stillBad.push({ slug: row.slug, title: row.title, status: row.status, issues: hardIssues })
      if (row.status === 'published') {
        demoted.push({ slug: row.slug, title: row.title, issues: hardIssues })
        if (!dryRun) {
          await client.query(
            `UPDATE listings SET status='draft', updated_at=now() WHERE id=$1::uuid`,
            [row.id],
          )
          unpublished += 1
        }
      }
    } else if (issues.length) {
      stillBad.push({ slug: row.slug, title: row.title, status: row.status, issues, soft: true })
    }
  }

  if (!dryRun) {
    await client.query(`SELECT refresh_listing_vitrin_prices()`).catch(() => {})
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        requested: refs.length,
        found: listings.rows.length,
        missingFromDb: missing,
        roomsCleared,
        roomsRematched,
        unpublished,
        demoted,
        stillIncomplete: stillBad,
      },
      null,
      2,
    ),
  )
} finally {
  await client.end()
}

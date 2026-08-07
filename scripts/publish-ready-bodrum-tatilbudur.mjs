#!/usr/bin/env node
/**
 * Bodrum TatilBudur batch: kalite kapısını geçen taslakları yayınlar.
 *
 * Varsayılan (TR önce):
 * - TR başlık + >=120 karakter açıklama
 * - >=2 sunucu-yerel AVIF galeri
 * - >=1 oda; eksik oda görselleri yerel galeriden doldurulur
 * - >=1 doğrulanmış fiyat kuralı
 *
 * 6 dil zorunlu için: REQUIRE_ALL_LOCALES=1
 *
 *   node scripts/publish-ready-bodrum-tatilbudur.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'
import { roomImagesFromGallery } from './lib/hotel-room-gallery.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const urlsFile = path.resolve(
  ROOT,
  process.env.BODRUM_TATILBUDUR_URLS || 'deploy/data/tatilbudur/bodrum-request-urls.txt',
)
const requireAllLocales = process.env.REQUIRE_ALL_LOCALES === '1'
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
  return k.startsWith('/') ? k : `/${k}`
}

async function backfillRoomImages(client, listingId) {
  const gallery = await client.query(
    `SELECT storage_key FROM listing_images
      WHERE listing_id=$1::uuid
        AND regexp_replace(storage_key, '^/+', '') ~* '^uploads/listings/.+\\.avif$'
      ORDER BY sort_order ASC, created_at ASC`,
    [listingId],
  )
  const galleryUrls = gallery.rows.map((r) => toPublicKey(r.storage_key))
  if (galleryUrls.length < 2) return 0

  const rooms = await client.query(
    `SELECT id::text, name, meta_json FROM hotel_rooms
      WHERE listing_id=$1::uuid
      ORDER BY name ASC`,
    [listingId],
  )
  let updated = 0
  for (let i = 0; i < rooms.rows.length; i++) {
    const room = rooms.rows[i]
    const meta = room.meta_json && typeof room.meta_json === 'object' ? room.meta_json : {}
    const current = []
    if (typeof meta.image === 'string' && meta.image.trim()) current.push(meta.image.trim())
    if (Array.isArray(meta.images)) {
      for (const u of meta.images) {
        if (typeof u === 'string' && u.trim()) current.push(u.trim())
      }
    }
    const hasSafeLocal = current.some(
      (u) =>
        /\/uploads\/listings\/.+\.avif$/i.test(u) &&
        /(room|suite|oda|bedroom|interior|bathroom|banyo)/i.test(u),
    )
    if (hasSafeLocal) continue

    // Yalnız güvenli etiketli eşleşme — rastgele galeri dilimi YOK.
    const picked = roomImagesFromGallery(galleryUrls, room.name || `oda-${i + 1}`, i, {
      allowUnlabeledFallback: false,
    })
    if (!picked.length) {
      // Güvensiz mevcut görselleri temizle; yanlış oda fotoğrafı bırakma.
      if (current.length) {
        await client.query(
          `UPDATE hotel_rooms
              SET meta_json = coalesce(meta_json, '{}'::jsonb)
                || jsonb_build_object('image', '', 'images', '[]'::jsonb, 'image_match', 'cleared_unsafe')
            WHERE id=$1::uuid`,
          [room.id],
        )
        updated += 1
      }
      continue
    }
    await client.query(
      `UPDATE hotel_rooms
          SET meta_json = coalesce(meta_json, '{}'::jsonb)
            || jsonb_build_object('image', $2::text, 'images', $3::jsonb, 'image_match', 'filename_label')
        WHERE id=$1::uuid`,
      [room.id, picked[0], JSON.stringify(picked)],
    )
    updated += 1
  }
  return updated
}

const client = createPgClient()
await client.connect()
try {
  const result = await client.query(
    `SELECT l.id::text, l.external_listing_ref AS ref, l.slug, l.status, tr.title,
       length(trim(coalesce(tr.title,''))) AS tr_title_len,
       length(trim(coalesce(tr.description,''))) AS tr_desc_len,
       (SELECT count(*)::int
          FROM listing_translations lt
          JOIN locales lo ON lo.id=lt.locale_id
         WHERE lt.listing_id=l.id
           AND lo.code=ANY(ARRAY['tr','en','de','ru','zh','fr'])
           AND length(trim(coalesce(lt.title,''))) >= 2
           AND length(trim(coalesce(lt.description,''))) >= 120) AS locale_count,
       (SELECT count(*)::int FROM listing_images li
         WHERE li.listing_id=l.id
           AND regexp_replace(li.storage_key, '^/+', '') ~* '^uploads/listings/.+\\.avif$') AS local_gallery_count,
       (SELECT count(*)::int FROM hotel_rooms hr WHERE hr.listing_id=l.id) AS room_count,
       (SELECT count(*)::int FROM listing_price_rules lpr
         WHERE lpr.listing_id=l.id
           AND lpr.rule_json->>'source'='tatilbudur'
           AND nullif(lpr.rule_json->>'base_nightly','')::numeric > 0) AS price_rule_count
     FROM listings l
     JOIN listing_translations tr ON tr.listing_id=l.id
     JOIN locales trlo ON trlo.id=tr.locale_id AND trlo.code='tr'
     WHERE l.external_provider_code='tatilbudur'
       AND l.external_listing_ref=ANY($1::text[])
     ORDER BY tr.title`,
    [refs],
  )

  let published = 0
  let roomsBackfilled = 0
  const pending = []
  for (const row of result.rows) {
    roomsBackfilled += await backfillRoomImages(client, row.id)

    const roomsLocal = await client.query(
      `SELECT count(*)::int AS n,
              count(*) FILTER (
                WHERE coalesce(hr.meta_json->>'image','') ~* '(restaurant|lobby|pool|beach|exterior|buffet|dining|havuz|plaj)'
                   OR EXISTS (
                     SELECT 1 FROM jsonb_array_elements_text(
                       CASE WHEN jsonb_typeof(hr.meta_json->'images')='array'
                            THEN hr.meta_json->'images' ELSE '[]'::jsonb END
                     ) im(url)
                     WHERE im.url ~* '(restaurant|lobby|pool|beach|exterior|buffet|dining|havuz|plaj)'
                   )
              )::int AS unsafe_n
         FROM hotel_rooms hr
        WHERE hr.listing_id=$1::uuid
          AND (
            coalesce(hr.meta_json->>'image','') ~* '/uploads/listings/.+\\.avif$'
            OR EXISTS (
              SELECT 1 FROM jsonb_array_elements_text(
                CASE WHEN jsonb_typeof(hr.meta_json->'images')='array'
                     THEN hr.meta_json->'images' ELSE '[]'::jsonb END
              ) im(url) WHERE im.url ~* '/uploads/listings/.+\\.avif$'
            )
          )`,
      [row.id],
    )
    const roomsWithLocal = Number(roomsLocal.rows[0]?.n || 0)
    const roomsUnsafe = Number(roomsLocal.rows[0]?.unsafe_n || 0)

    const issues = []
    const trOk = Number(row.tr_title_len) >= 2 && Number(row.tr_desc_len) >= 120
    if (!trOk) issues.push('tr_content_incomplete')
    if (requireAllLocales && Number(row.locale_count) < 6) {
      issues.push('localization_incomplete')
    }
    if (Number(row.local_gallery_count) < 2) issues.push('local_gallery_incomplete')
    if (Number(row.room_count) < 1) issues.push('rooms_incomplete')
    // Yanlış tesis fotoğrafı odaya yazılmışsa yayınlama; görselsiz oda kabul (CDN etiketsiz).
    if (roomsUnsafe > 0) issues.push('room_images_untrusted')
    else if (roomsWithLocal < Number(row.room_count)) {
      // Soft: kalite kaydında işaretle ama yayını engelleme (TatilBudur sayısal CDN).
      // issues.push('room_local_images_incomplete')
    }
    if (Number(row.price_rule_count) < 1) issues.push('price_incomplete')

    const quality = {
      status: issues.length ? 'incomplete' : roomsWithLocal < Number(row.room_count) ? 'partial' : 'complete',
      issues:
        roomsWithLocal < Number(row.room_count) && !issues.includes('room_images_untrusted')
          ? [...issues, 'room_images_unlabeled_cdn']
          : issues,
      publish_mode: requireAllLocales ? 'all_locales' : 'tr_first',
      required_locales: requireAllLocales ? 6 : 1,
      locale_count: Number(row.locale_count),
      local_gallery_count: Number(row.local_gallery_count),
      room_count: Number(row.room_count),
      rooms_with_local_images: roomsWithLocal,
      rooms_unsafe_images: roomsUnsafe,
      price_rule_count: Number(row.price_rule_count),
      checked_at: new Date().toISOString(),
    }
    await client.query(
      `INSERT INTO listing_attributes (listing_id,group_code,key,value_json)
       VALUES ($1::uuid,'hotel_quality','v1',$2::jsonb)
       ON CONFLICT (listing_id,group_code,key)
       DO UPDATE SET value_json=excluded.value_json`,
      [row.id, JSON.stringify(quality)],
    )
    // Yayın engeli: yalnızca sert sorunlar (güvensiz oda görseli dahil)
    const hardIssues = issues.filter((x) => x !== 'room_images_unlabeled_cdn')
    if (hardIssues.length) {
      pending.push({ title: row.title, slug: row.slug, issues: hardIssues })
      continue
    }
    if (row.status !== 'published') {
      await client.query(
        `UPDATE listings SET status='published', updated_at=now() WHERE id=$1::uuid`,
        [row.id],
      )
      published += 1
    }
  }
  await client.query(`SELECT refresh_listing_vitrin_prices()`)
  console.log(
    JSON.stringify(
      {
        mode: requireAllLocales ? 'all_locales' : 'tr_first',
        requested: refs.length,
        found: result.rows.length,
        roomsBackfilled,
        newlyPublished: published,
        publishReady: result.rows.length - pending.length,
        pending,
      },
      null,
      2,
    ),
  )
} finally {
  await client.end()
}

#!/usr/bin/env node
/**
 * Bodrum TatilBudur: fiyat + oda + TR içeriği olan her taslağı ZORLA yayınla.
 * Yerel AVIF beklenmez (CDN galeri ile de yayına alınır — kullanıcı talebi).
 *
 *   node scripts/force-publish-bodrum-priced.mjs
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

async function ensureRoomImages(client, listingId) {
  const gallery = await client.query(
    `SELECT storage_key FROM listing_images
      WHERE listing_id=$1::uuid
      ORDER BY sort_order ASC NULLS LAST, created_at ASC
      LIMIT 40`,
    [listingId],
  )
  const urls = gallery.rows
    .map((r) => {
      const k = String(r.storage_key || '').trim()
      if (!k) return ''
      if (/^https?:\/\//i.test(k)) return k
      return toPublicKey(k)
    })
    .filter(Boolean)
  if (urls.length < 1) return 0

  const rooms = await client.query(
    `SELECT id::text, name, meta_json FROM hotel_rooms WHERE listing_id=$1::uuid ORDER BY name ASC`,
    [listingId],
  )
  let n = 0
  for (let i = 0; i < rooms.rows.length; i++) {
    const room = rooms.rows[i]
    const meta = room.meta_json && typeof room.meta_json === 'object' ? room.meta_json : {}
    const hasImg =
      (typeof meta.image === 'string' && meta.image.trim()) ||
      (Array.isArray(meta.images) && meta.images.some((u) => String(u || '').trim()))
    if (hasImg) continue
    let picked = roomImagesFromGallery(urls, room.name || `oda-${i + 1}`, i, {
      allowUnlabeledFallback: true,
    })
    if (!picked.length) {
      const start = i % urls.length
      picked = urls.slice(start, start + 3)
      if (!picked.length) picked = urls.slice(0, 3)
    }
    if (!picked.length) continue
    await client.query(
      `UPDATE hotel_rooms
          SET meta_json = coalesce(meta_json,'{}'::jsonb)
            || jsonb_build_object('image',$2::text,'images',$3::jsonb)
        WHERE id=$1::uuid`,
      [room.id, picked[0], JSON.stringify(picked)],
    )
    n += 1
  }
  return n
}

const client = createPgClient()
await client.connect()
try {
  // Önce teklifleri tekrar bas (eksik oda/fiyat)
  const { spawnSync } = await import('node:child_process')
  for (const offers of [
    'deploy/data/tatilbudur/bodrum-2026-08-10-13-2adults-1child-offers.json',
    'deploy/data/tatilbudur/bodrum-2026-08-10-13-2adults-offers.json',
  ]) {
    const feed = 'backups/tatilbudur-bodrum-public-feed.json'
    if (!fs.existsSync(path.join(ROOT, feed)) || !fs.existsSync(path.join(ROOT, offers))) continue
    spawnSync(
      process.execPath,
      [
        path.join(ROOT, 'scripts/apply-tatilbudur-visible-offers.mjs'),
        '--feed',
        feed,
        '--offers',
        offers,
        '--create-missing',
      ],
      { cwd: ROOT, stdio: 'inherit' },
    )
  }
  spawnSync(
    process.execPath,
    [path.join(ROOT, 'scripts/fix-hotel-room-images-in-feed.mjs'), 'backups/tatilbudur-bodrum-public-feed.json'],
    { cwd: ROOT, stdio: 'inherit' },
  )
  spawnSync(
    process.execPath,
    [path.join(ROOT, 'scripts/import-tatilbudur-hotels.mjs'), '--file', 'backups/tatilbudur-bodrum-public-feed.json'],
    {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, TATILBUDUR_LISTING_STATUS: 'draft' },
    },
  )

  const result = await client.query(
    `SELECT l.id::text, l.slug, l.status, tr.title,
       length(trim(coalesce(tr.description,''))) AS tr_desc_len,
       (SELECT count(*)::int FROM hotel_rooms hr WHERE hr.listing_id=l.id) AS rooms,
       (SELECT count(*)::int FROM listing_price_rules lpr
         WHERE lpr.listing_id=l.id
           AND nullif(lpr.rule_json->>'base_nightly','')::numeric > 0) AS prices,
       (SELECT count(*)::int FROM listing_images li WHERE li.listing_id=l.id) AS gallery,
       coalesce(l.featured_image_url,'') AS featured
     FROM listings l
     JOIN listing_translations tr ON tr.listing_id=l.id
     JOIN locales lo ON lo.id=tr.locale_id AND lo.code='tr'
     WHERE l.external_provider_code='tatilbudur'
       AND l.external_listing_ref = ANY($1::text[])
     ORDER BY tr.title`,
    [refs],
  )

  let published = 0
  const stillBlocked = []
  const already = []
  for (const row of result.rows) {
    await ensureRoomImages(client, row.id)
    const rooms = Number(row.rooms)
    const prices = Number(row.prices)
    const trOk = Number(row.tr_desc_len) >= 80
    const hasMedia = Number(row.gallery) >= 1 || String(row.featured).trim().length > 8

    if (row.status === 'published') {
      already.push(row.slug)
      continue
    }
    if (!(rooms >= 1 && prices >= 1 && trOk && hasMedia)) {
      stillBlocked.push({
        slug: row.slug,
        title: row.title,
        rooms,
        prices,
        tr_desc_len: Number(row.tr_desc_len),
        gallery: Number(row.gallery),
      })
      continue
    }
    await client.query(
      `UPDATE listings SET status='published', updated_at=now() WHERE id=$1::uuid`,
      [row.id],
    )
    published += 1
    console.log(`[published] ${row.slug}`)
  }

  await client.query(`SELECT refresh_listing_vitrin_prices()`).catch(() => {})

  const after = await client.query(
    `SELECT
       count(*) FILTER (WHERE status='published')::int AS published,
       count(*) FILTER (WHERE status='draft')::int AS draft
     FROM listings
     WHERE external_provider_code='tatilbudur'
       AND external_listing_ref = ANY($1::text[])`,
    [refs],
  )

  console.log(
    JSON.stringify(
      {
        newlyPublished: published,
        alreadyPublished: already.length,
        totals: after.rows[0],
        stillBlocked,
      },
      null,
      2,
    ),
  )
} finally {
  await client.end()
}

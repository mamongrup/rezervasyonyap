#!/usr/bin/env node
/**
 * TatilBudur taslaklarında oda meta görselleri boşsa yerel AVIF galeriden doldurur.
 * Room/Suite etiketli kareler tercih; yoksa reject olmayan (other) kareler.
 *
 *   node scripts/backfill-tatilbudur-room-images-from-gallery.mjs
 *   node scripts/backfill-tatilbudur-room-images-from-gallery.mjs --refs=slug1,slug2
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
const refsArg = process.argv.find((a) => a.startsWith('--refs='))
const refs = refsArg
  ? refsArg
      .split('=')[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : fs
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
  return k.startsWith('uploads/') ? `/${k}` : `/${k}`
}

const client = createPgClient()
await client.connect()
try {
  const listings = await client.query(
    `SELECT l.id::text, l.slug, l.external_listing_ref AS ref
       FROM listings l
      WHERE l.external_provider_code='tatilbudur'
        AND l.external_listing_ref = ANY($1::text[])
      ORDER BY l.slug`,
    [refs],
  )

  let roomsUpdated = 0
  let listingsTouched = 0
  for (const listing of listings.rows) {
    const gallery = await client.query(
      `SELECT storage_key FROM listing_images
        WHERE listing_id=$1::uuid
          AND storage_key ~* '^uploads/listings/.+\\.avif$'
        ORDER BY sort_order ASC, created_at ASC`,
      [listing.id],
    )
    const galleryUrls = gallery.rows.map((r) => toPublicKey(r.storage_key))
    if (galleryUrls.length < 2) continue

    const rooms = await client.query(
      `SELECT id::text, name, meta_json FROM hotel_rooms WHERE listing_id=$1::uuid ORDER BY name ASC`,
      [listing.id],
    )
    let touched = false
    rooms.rows.forEach((room, i) => {
      const meta = room.meta_json && typeof room.meta_json === 'object' ? room.meta_json : {}
      const current = []
      if (typeof meta.image === 'string' && meta.image.trim()) current.push(meta.image.trim())
      if (Array.isArray(meta.images)) {
        for (const u of meta.images) {
          if (typeof u === 'string' && u.trim()) current.push(u.trim())
        }
      }
      const hasLocal = current.some((u) => /^\/uploads\/listings\/.+\.avif$/i.test(u))
      if (hasLocal) return

      const picked = roomImagesFromGallery(galleryUrls, room.name || `oda-${i + 1}`, i, {
        allowUnlabeledFallback: true,
      })
      if (!picked.length) return

      // fire-and-forget style sync update via outer await in loop — collect promises
      room._picked = picked
      room._needsUpdate = true
      touched = true
    })

    for (let i = 0; i < rooms.rows.length; i++) {
      const room = rooms.rows[i]
      if (!room._needsUpdate || !room._picked?.length) continue
      await client.query(
        `UPDATE hotel_rooms
            SET meta_json = coalesce(meta_json, '{}'::jsonb)
              || jsonb_build_object('image', $2::text, 'images', $3::jsonb)
          WHERE id=$1::uuid`,
        [room.id, room._picked[0], JSON.stringify(room._picked)],
      )
      roomsUpdated += 1
    }
    if (touched) listingsTouched += 1
  }

  console.log(
    JSON.stringify(
      {
        requested: refs.length,
        found: listings.rows.length,
        listingsTouched,
        roomsUpdated,
      },
      null,
      2,
    ),
  )
} finally {
  await client.end()
}

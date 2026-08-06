#!/usr/bin/env node
/**
 * TatilBudur (Bodrum) taslaklarında oda meta görsellerini yerel AVIF galeriden doldurur.
 *
 * Rehost galeri URL'lerini lokale aldıktan sonra odalar boş kalabiliyor (CDN adında
 * Room/Suite yok). Bu script reject etiketli kareleri atlar; etiket yoksa ortadaki
 * galeri karelerini odalara dağıtır.
 *
 *   node scripts/backfill-tatilbudur-room-local-images.mjs
 *   node scripts/backfill-tatilbudur-room-local-images.mjs --dry-run
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'
import { roomImagesFromGallery } from './lib/hotel-room-gallery.mjs'

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

function toPublicPath(storageKey) {
  const key = String(storageKey || '').replace(/^\/+/, '')
  return key ? `/${key}` : ''
}

function isLocalAvifPath(value) {
  return /^\/uploads\/listings\/.+\.avif$/i.test(String(value || '').trim())
}

const client = createPgClient()
await client.connect()
try {
  const listings = await client.query(
    `SELECT l.id::text, l.slug, l.external_listing_ref AS ref, tr.title
       FROM listings l
       JOIN listing_translations tr ON tr.listing_id=l.id
       JOIN locales lo ON lo.id=tr.locale_id AND lo.code='tr'
      WHERE l.external_provider_code='tatilbudur'
        AND l.external_listing_ref = ANY($1::text[])
      ORDER BY tr.title`,
    [refs],
  )

  let roomsUpdated = 0
  let roomsSkipped = 0
  let listingsTouched = 0
  const emptyGallery = []

  for (const listing of listings.rows) {
    const imgs = await client.query(
      `SELECT storage_key
         FROM listing_images
        WHERE listing_id=$1::uuid
          AND storage_key ~* '^uploads/listings/.+\\.avif$'
        ORDER BY sort_order ASC, created_at ASC`,
      [listing.id],
    )
    const gallery = imgs.rows.map((r) => toPublicPath(r.storage_key)).filter(Boolean)
    if (gallery.length < 2) {
      emptyGallery.push(listing.slug)
      continue
    }

    const rooms = await client.query(
      `SELECT id::text, name, meta_json FROM hotel_rooms WHERE listing_id=$1::uuid ORDER BY name ASC`,
      [listing.id],
    )
    let touched = false
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
      if (current.some(isLocalAvifPath)) {
        roomsSkipped += 1
        continue
      }
      const picked = roomImagesFromGallery(gallery, room.name || `oda-${i + 1}`, i, {
        allowUnlabeledFallback: true,
      })
      if (!picked.length) {
        roomsSkipped += 1
        continue
      }
      if (!dryRun) {
        await client.query(
          `UPDATE hotel_rooms
              SET meta_json = coalesce(meta_json, '{}'::jsonb)
                || jsonb_build_object('image',$2::text,'images',$3::jsonb)
            WHERE id=$1::uuid`,
          [room.id, picked[0], JSON.stringify([...new Set(picked)])],
        )
      }
      roomsUpdated += 1
      touched = true
    }
    if (touched) listingsTouched += 1
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        listings: listings.rows.length,
        listingsTouched,
        roomsUpdated,
        roomsSkipped,
        emptyGallery,
      },
      null,
      2,
    ),
  )
} finally {
  await client.end()
}

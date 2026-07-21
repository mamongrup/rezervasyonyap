#!/usr/bin/env node
/**
 * Mevcut tatilbudur otel feed JSON'larında oda görsellerini yeniden sınıflandır.
 * Galeri dosya adındaki Restaurant/Lobby/Exterior etiketlerini odadan çıkarır.
 *
 *   node scripts/fix-hotel-room-images-in-feed.mjs deploy/data/tatilbudur/alanya-side-hotels.json
 *   node scripts/fix-hotel-room-images-in-feed.mjs --all
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { classifyHotelGalleryImage, rewriteFeedRoomImages } from './lib/hotel-room-gallery.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const argv = process.argv.slice(2)
const ALL = argv.includes('--all')
const files = argv.filter((a) => !a.startsWith('--'))

function defaultFeeds() {
  const dir = path.join(ROOT, 'deploy/data/tatilbudur')
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json') && !f.endsWith('.manifest.json'))
    .map((f) => path.join(dir, f))
}

const targets = ALL
  ? defaultFeeds()
  : files.map((f) => path.resolve(ROOT, f))

if (!targets.length) {
  console.error('Usage: node scripts/fix-hotel-room-images-in-feed.mjs <feed.json> | --all')
  process.exit(1)
}

for (const file of targets) {
  if (!fs.existsSync(file)) {
    console.warn(`[skip] missing ${file}`)
    continue
  }
  const feed = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (!Array.isArray(feed.hotels)) {
    console.warn(`[skip] no hotels[] ${file}`)
    continue
  }
  // Sample before
  let badBefore = 0
  for (const h of feed.hotels) {
    for (const r of h.rooms || []) {
      for (const u of r.images || []) {
        if (classifyHotelGalleryImage(u) === 'reject') badBefore++
      }
    }
  }
  const stats = rewriteFeedRoomImages(feed)
  feed.roomImagesFixedAt = new Date().toISOString()
  fs.writeFileSync(file, JSON.stringify(feed, null, 2) + '\n')
  let badAfter = 0
  let roomImgCount = 0
  for (const h of feed.hotels) {
    for (const r of h.rooms || []) {
      roomImgCount += (r.images || []).length
      for (const u of r.images || []) {
        if (classifyHotelGalleryImage(u) === 'reject') badAfter++
      }
    }
  }
  console.log(
    JSON.stringify({
      file: path.relative(ROOT, file),
      ...stats,
      badRejectBefore: badBefore,
      badRejectAfter: badAfter,
      roomImageUrls: roomImgCount,
    }),
  )
}

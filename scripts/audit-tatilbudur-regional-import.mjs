#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const feedPath = path.resolve(process.argv[2] || path.join(ROOT, 'backups', 'tatilbudur-ege-feed-2026-07-29.json'))
const feed = JSON.parse(fs.readFileSync(feedPath, 'utf8'))
const names = feed.hotels.map((hotel) => hotel.name)
const pg = createPgClient()
await pg.connect()
try {
  const result = await pg.query(
    `SELECT l.id::text, tr.title, l.slug, l.status,
       count(DISTINCT lt.locale_id)::int AS language_count,
       count(DISTINCT li.id)::int AS gallery_images,
       count(DISTINCT hr.id)::int AS room_count,
       count(DISTINCT hr.id) FILTER (
         WHERE coalesce(hr.meta_json->>'image','') <> ''
       )::int AS rooms_with_images
     FROM listings l
     JOIN product_categories pc ON pc.id=l.category_id AND pc.code='hotel'
     JOIN listing_translations tr ON tr.listing_id=l.id
     JOIN locales tr_locale ON tr_locale.id=tr.locale_id AND tr_locale.code='tr'
     LEFT JOIN listing_translations lt ON lt.listing_id=l.id
     LEFT JOIN listing_images li ON li.listing_id=l.id
     LEFT JOIN hotel_rooms hr ON hr.listing_id=l.id
     WHERE EXISTS (
       SELECT 1
       FROM unnest($1::text[]) AS requested(name)
       WHERE lower(btrim(tr.title)) = lower(btrim(requested.name))
     )
     GROUP BY l.id, tr.title, l.slug, l.status
     ORDER BY tr.title`,
    [names.map((name) => name.trim())],
  )
  const titleKey = (value) => String(value || '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .trim()
  const byName = new Map()
  for (const row of result.rows) {
    const key = titleKey(row.title)
    const current = byName.get(key)
    if (!current || row.language_count > current.language_count) byName.set(key, row)
  }
  const rows = names.map((name) => byName.get(titleKey(name)) || { title: name, missing: true })
  console.table(rows)
  console.log(JSON.stringify({
    requested: names.length,
    found: rows.filter((row) => !row.missing).length,
    published: rows.filter((row) => row.status === 'published').length,
    sixLanguages: rows.filter((row) => row.language_count === 6).length,
    mediaIncomplete: rows.filter((row) => !row.missing && Number(row.gallery_images) < 2).map((row) => row.title),
    roomless: rows.filter((row) => !row.missing && Number(row.room_count) === 0).map((row) => row.title),
    rooms: rows.reduce((sum, row) => sum + Number(row.room_count || 0), 0),
    roomsWithImages: rows.reduce((sum, row) => sum + Number(row.rooms_with_images || 0), 0),
  }, null, 2))
} finally {
  await pg.end()
}

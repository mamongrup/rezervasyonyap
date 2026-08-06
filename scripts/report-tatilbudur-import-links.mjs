#!/usr/bin/env node
/**
 * Bir TatilBudur feed'inin import sonrası durum/link raporu.
 *
 * node scripts/report-tatilbudur-import-links.mjs --file backups/feed.json \
 *   --out backups/tatilbudur-links.md
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const valueAfter = (name) => {
  const index = argv.indexOf(name)
  return index >= 0 ? String(argv[index + 1] || '').trim() : ''
}
const defaultFeed = 'backups/tatilbudur-bodrum-public-feed.json'
const defaultOut = 'backups/tatilbudur-bodrum-links.md'
const fileArg = valueAfter('--file') || (fs.existsSync(path.join(ROOT, defaultFeed)) ? defaultFeed : '')
if (!fileArg) {
  throw new Error(`--file gerekli (ör. --file ${defaultFeed})`)
}
const input = path.resolve(ROOT, fileArg)
const output = path.resolve(ROOT, valueAfter('--out') || defaultOut)

const feed = JSON.parse(fs.readFileSync(input, 'utf8'))
const refs = (feed.hotels || []).map((hotel) => String(hotel.id || '').trim()).filter(Boolean)
const db = createPgClient()
await db.connect()
try {
  const result = await db.query(
    `SELECT l.external_listing_ref AS ref, l.slug, l.status, tr.title,
       count(DISTINCT li.id)::int AS gallery_images,
       count(DISTINCT li.id) FILTER (
         WHERE li.storage_key ~* '^uploads/listings/.+\\.avif$'
       )::int AS local_avif_images,
       count(DISTINCT hr.id)::int AS rooms,
       count(DISTINCT lpr.id)::int AS price_rules,
       count(DISTINCT lt.locale_id) FILTER (
         WHERE lo.code = ANY(ARRAY['tr','en','de','ru','zh','fr'])
           AND length(trim(coalesce(lt.description,''))) >= 120
       )::int AS locale_count
     FROM listings l
     JOIN listing_translations tr ON tr.listing_id=l.id
     JOIN locales trlo ON trlo.id=tr.locale_id AND trlo.code='tr'
     LEFT JOIN listing_images li ON li.listing_id=l.id
     LEFT JOIN hotel_rooms hr ON hr.listing_id=l.id
     LEFT JOIN listing_price_rules lpr ON lpr.listing_id=l.id
     LEFT JOIN listing_translations lt ON lt.listing_id=l.id
     LEFT JOIN locales lo ON lo.id=lt.locale_id
     WHERE l.external_provider_code='tatilbudur'
       AND l.external_listing_ref = ANY($1::text[])
     GROUP BY l.external_listing_ref, l.slug, l.status, tr.title
     ORDER BY tr.title`,
    [refs],
  )
  const byRef = new Map(result.rows.map((row) => [row.ref, row]))
  const rows = refs.map((ref) => byRef.get(ref) || { ref, missing: true })
  const lines = [
    '# TatilBudur import link raporu',
    '',
    `Feed: \`${path.relative(ROOT, input)}\``,
    `Tarih: ${new Date().toISOString()}`,
    '',
    '| Otel | Durum | Galeri | Yerel AVIF | Odalar | Fiyat kuralı | 6 dil | Link |',
    '|---|---|---:|---:|---:|---:|---:|---|',
    ...rows.map((row) => {
      if (row.missing) return `| ${row.ref} | import_hatası | - | - | - | - | - | - |`
      const href = `/otel/${row.slug}`
      return `| ${row.title} | ${row.status} | ${row.gallery_images} | ${row.local_avif_images} | ${row.rooms} | ${row.price_rules} | ${row.locale_count}/6 | ${href} |`
    }),
    '',
    'Not: TR yayın için fiyat + yerel AVIF galeri + oda gerekir. 6 dil AI sonrası tamamlanır.',
  ]
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, `${lines.join('\n')}\n`)
  const found = rows.filter((row) => !row.missing)
  const published = found.filter((row) => row.status === 'published')
  const trPublishable = found.filter(
    (row) =>
      Number(row.price_rules || 0) > 0 &&
      Number(row.rooms || 0) > 0 &&
      Number(row.local_avif_images || 0) >= 2 &&
      Number(row.locale_count || 0) >= 1,
  )
  console.log(JSON.stringify({
    requested: refs.length,
    found: found.length,
    priced: found.filter((row) => Number(row.price_rules || 0) > 0).length,
    localMedia: found.filter((row) => Number(row.local_avif_images || 0) >= 2).length,
    published: published.length,
    trPublishable: trPublishable.length,
    // Eski alan: 6 dil tamam + yayında (yanıltıcı olmasın diye ayrı)
    allLocalesPublished: published.filter((row) => Number(row.locale_count || 0) === 6).length,
    output,
  }, null, 2))
} finally {
  await db.end()
}

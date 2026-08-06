#!/usr/bin/env node
/**
 * Bodrum TatilBudur taslaklarının neden yayında olmadığını listeler.
 *
 *   node scripts/diagnose-bodrum-tatilbudur-drafts.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'

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

const client = createPgClient()
await client.connect()
try {
  const result = await client.query(
    `SELECT l.external_listing_ref AS ref, l.slug, l.status, tr.title,
       length(trim(coalesce(tr.description,''))) AS tr_desc_len,
       (SELECT count(*)::int FROM listing_images li WHERE li.listing_id=l.id) AS gallery_total,
       (SELECT count(*)::int FROM listing_images li
         WHERE li.listing_id=l.id
           AND regexp_replace(li.storage_key, '^/+', '') ~* '^uploads/listings/.+\\.avif$') AS local_avif,
       (SELECT count(*)::int FROM listing_images li
         WHERE li.listing_id=l.id AND li.storage_key ~* '^https?://') AS external_imgs,
       (SELECT count(*)::int FROM hotel_rooms hr WHERE hr.listing_id=l.id) AS rooms,
       (SELECT count(*)::int FROM hotel_rooms hr
         WHERE hr.listing_id=l.id
           AND (
             coalesce(hr.meta_json->>'image','') ~* '^/uploads/listings/.+\\.avif$'
             OR EXISTS (
               SELECT 1 FROM jsonb_array_elements_text(
                 CASE WHEN jsonb_typeof(hr.meta_json->'images')='array'
                      THEN hr.meta_json->'images' ELSE '[]'::jsonb END
               ) im(url) WHERE im.url ~* '^/uploads/listings/.+\\.avif$'
             )
           )) AS rooms_local,
       (SELECT count(*)::int FROM listing_price_rules lpr
         WHERE lpr.listing_id=l.id
           AND lpr.rule_json->>'source'='tatilbudur'
           AND nullif(lpr.rule_json->>'base_nightly','')::numeric > 0) AS prices
     FROM listings l
     JOIN listing_translations tr ON tr.listing_id=l.id
     JOIN locales lo ON lo.id=tr.locale_id AND lo.code='tr'
     WHERE l.external_provider_code='tatilbudur'
       AND l.external_listing_ref = ANY($1::text[])
     ORDER BY l.status, tr.title`,
    [refs],
  )

  const byRef = new Map(result.rows.map((r) => [r.ref, r]))
  const missing = refs.filter((r) => !byRef.has(r))
  const drafts = result.rows.filter((r) => r.status !== 'published')
  const published = result.rows.filter((r) => r.status === 'published')

  const buckets = {
    no_price: [],
    no_local_gallery: [],
    no_rooms: [],
    room_images: [],
    short_tr: [],
    other: [],
  }

  for (const row of drafts) {
    const issues = []
    if (Number(row.tr_desc_len) < 120) issues.push('short_tr')
    if (Number(row.local_avif) < 2) issues.push('no_local_gallery')
    if (Number(row.rooms) < 1) issues.push('no_rooms')
    else if (Number(row.rooms_local) < Number(row.rooms)) issues.push('room_images')
    if (Number(row.prices) < 1) issues.push('no_price')
    if (!issues.length) issues.push('other')
    const primary = issues[0]
    buckets[primary]?.push({ ...row, issues }) || buckets.other.push({ ...row, issues })
  }

  const lines = [
    '# Bodrum TatilBudur taslak teşhisi',
    '',
    `Tarih: ${new Date().toISOString()}`,
    `URL listesi: ${refs.length} | DB: ${result.rows.length} | Yayında: ${published.length} | Taslak: ${drafts.length} | Import yok: ${missing.length}`,
    '',
    '## Import edilmemiş',
    ...missing.map((r) => `- ${r}`),
    '',
    '## Taslaklar',
  ]
  for (const row of drafts) {
    const issues = []
    if (Number(row.tr_desc_len) < 120) issues.push('short_tr')
    if (Number(row.local_avif) < 2) issues.push(`gallery_local=${row.local_avif}/ext=${row.external_imgs}`)
    if (Number(row.rooms) < 1) issues.push('no_rooms')
    else if (Number(row.rooms_local) < Number(row.rooms)) {
      issues.push(`rooms_local=${row.rooms_local}/${row.rooms}`)
    }
    if (Number(row.prices) < 1) issues.push('no_price')
    lines.push(
      `- **${row.title}** (\`${row.slug}\`) — ${issues.join(', ') || 'unknown'}`,
    )
  }
  lines.push(
    '',
    '## Özet kovalar',
    `- Fiyatsız: ${buckets.no_price.length}`,
    `- Yerel galeri yok: ${buckets.no_local_gallery.length}`,
    `- Oda yok: ${buckets.no_rooms.length}`,
    `- Oda görseli eksik: ${buckets.room_images.length}`,
    `- TR açıklama kısa: ${buckets.short_tr.length}`,
    `- Diğer: ${buckets.other.length}`,
    `- Import yok: ${missing.length}`,
  )

  const out = path.join(ROOT, 'backups/tatilbudur-bodrum-draft-diagnose.md')
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, `${lines.join('\n')}\n`)

  console.log(
    JSON.stringify(
      {
        requested: refs.length,
        inDb: result.rows.length,
        published: published.length,
        drafts: drafts.length,
        missingImport: missing,
        buckets: {
          no_price: buckets.no_price.map((r) => r.slug),
          no_local_gallery: buckets.no_local_gallery.map((r) => r.slug),
          no_rooms: buckets.no_rooms.map((r) => r.slug),
          room_images: buckets.room_images.map((r) => r.slug),
          short_tr: buckets.short_tr.map((r) => r.slug),
          other: buckets.other.map((r) => r.slug),
        },
        output: out,
      },
      null,
      2,
    ),
  )
} finally {
  await client.end()
}

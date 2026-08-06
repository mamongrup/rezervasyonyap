#!/usr/bin/env node
/**
 * Bodrum TatilBudur batch'inde yalnız kalite kapısını geçen taslakları yayınlar.
 *
 * Zorunlu:
 * - 6 dilde başlık + >=120 karakter açıklama
 * - >=2 sunucu-yerel AVIF galeri görseli
 * - >=1 oda ve her odada sunucu-yerel AVIF görseli
 * - >=1 doğrulanmış fiyat kuralı
 *
 * Eksik kayıtlar taslak kalır; başka provider/otel etkilenmez.
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
    try { return new URL(url).pathname.replace(/^\/+|\/+$/g, '') } catch { return '' }
  })
  .filter(Boolean)

const client = createPgClient()
await client.connect()
try {
  const result = await client.query(
    `SELECT l.id::text, l.external_listing_ref AS ref, l.slug, l.status, tr.title,
       (SELECT count(*)::int
          FROM listing_translations lt
          JOIN locales lo ON lo.id=lt.locale_id
         WHERE lt.listing_id=l.id
           AND lo.code=ANY(ARRAY['tr','en','de','ru','zh','fr'])
           AND length(trim(coalesce(lt.title,''))) >= 2
           AND length(trim(coalesce(lt.description,''))) >= 120) AS locale_count,
       (SELECT count(*)::int FROM listing_images li
         WHERE li.listing_id=l.id
           AND li.storage_key ~* '^uploads/listings/.+\\.avif$') AS local_gallery_count,
       (SELECT count(*)::int FROM hotel_rooms hr WHERE hr.listing_id=l.id) AS room_count,
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
           )) AS rooms_with_local_images,
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
  const pending = []
  for (const row of result.rows) {
    const issues = []
    if (Number(row.locale_count) < 6) issues.push('localization_incomplete')
    if (Number(row.local_gallery_count) < 2) issues.push('local_gallery_incomplete')
    if (Number(row.room_count) < 1) issues.push('rooms_incomplete')
    else if (Number(row.rooms_with_local_images) < Number(row.room_count)) {
      issues.push('room_local_images_incomplete')
    }
    if (Number(row.price_rule_count) < 1) issues.push('price_incomplete')
    const quality = {
      status: issues.length ? 'incomplete' : 'complete',
      issues,
      required_locales: 6,
      locale_count: Number(row.locale_count),
      local_gallery_count: Number(row.local_gallery_count),
      room_count: Number(row.room_count),
      rooms_with_local_images: Number(row.rooms_with_local_images),
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
    if (issues.length) {
      pending.push({ title: row.title, slug: row.slug, issues })
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
  console.log(JSON.stringify({
    requested: refs.length,
    found: result.rows.length,
    newlyPublished: published,
    publishReady: result.rows.length - pending.length,
    pending,
  }, null, 2))
} finally {
  await client.end()
}

#!/usr/bin/env node
/**
 * Son TatilBudur taslaklarını listeler; fiyat+oda olanları yayınlar.
 * Bodrum URL listesiyle sınırlı DEĞİL — paneldeki "14 taslak" için.
 *
 *   node scripts/activate-tatilbudur-drafts.mjs
 *   node scripts/activate-tatilbudur-drafts.mjs --days=3
 */
import { createPgClient } from './lib/pg-client.mjs'

const daysArg = process.argv.find((a) => a.startsWith('--days='))
const days = Math.max(1, Number(daysArg?.split('=')[1] || 3))
const dryRun = process.argv.includes('--dry-run')

const client = createPgClient()
await client.connect()
try {
  const result = await client.query(
    `SELECT l.id::text, l.slug, l.status, l.external_listing_ref AS ref,
       l.created_at, tr.title,
       length(trim(coalesce(tr.description,''))) AS tr_desc_len,
       (SELECT count(*)::int FROM hotel_rooms hr WHERE hr.listing_id=l.id) AS rooms,
       (SELECT count(*)::int FROM listing_price_rules lpr
         WHERE lpr.listing_id=l.id
           AND nullif(lpr.rule_json->>'base_nightly','')::numeric > 0) AS prices,
       (SELECT count(*)::int FROM listing_images li WHERE li.listing_id=l.id) AS gallery,
       coalesce(l.vitrin_price, 0)::numeric AS vitrin_price,
       coalesce(l.featured_image_url,'') AS featured
     FROM listings l
     JOIN listing_translations tr ON tr.listing_id=l.id
     JOIN locales lo ON lo.id=tr.locale_id AND lo.code='tr'
     WHERE l.external_provider_code='tatilbudur'
       AND l.status='draft'
       AND l.created_at >= now() - ($1::text || ' days')::interval
     ORDER BY l.created_at DESC, tr.title`,
    [String(days)],
  )

  let published = 0
  const blocked = []
  const activated = []
  for (const row of result.rows) {
    const ok =
      Number(row.rooms) >= 1 &&
      Number(row.prices) >= 1 &&
      Number(row.tr_desc_len) >= 80 &&
      (Number(row.gallery) >= 1 || String(row.featured).length > 8)
    if (!ok) {
      blocked.push({
        slug: row.slug,
        title: row.title,
        rooms: Number(row.rooms),
        prices: Number(row.prices),
        gallery: Number(row.gallery),
        tr_desc_len: Number(row.tr_desc_len),
        reason:
          Number(row.prices) < 1
            ? 'no_price'
            : Number(row.rooms) < 1
              ? 'no_rooms'
              : Number(row.tr_desc_len) < 80
                ? 'short_tr'
                : 'no_media',
      })
      continue
    }
    if (!dryRun) {
      await client.query(
        `UPDATE listings SET status='published', updated_at=now() WHERE id=$1::uuid`,
        [row.id],
      )
    }
    published += 1
    activated.push(row.slug)
    console.log(`[${dryRun ? 'dry' : 'published'}] ${row.slug}`)
  }

  if (!dryRun && published > 0) {
    await client.query(`SELECT refresh_listing_vitrin_prices()`).catch((e) => {
      console.warn('[warn] vitrin refresh', e.message || e)
    })
  }

  const summary = await client.query(
    `SELECT
       count(*) FILTER (WHERE status='published')::int AS published,
       count(*) FILTER (WHERE status='draft')::int AS draft
     FROM listings
     WHERE external_provider_code='tatilbudur'
       AND created_at >= now() - ($1::text || ' days')::interval`,
    [String(days)],
  )

  console.log(
    JSON.stringify(
      {
        days,
        dryRun,
        draftScanned: result.rows.length,
        newlyPublished: published,
        activated,
        blocked,
        tatilbudurLastDays: summary.rows[0],
      },
      null,
      2,
    ),
  )
} finally {
  await client.end()
}

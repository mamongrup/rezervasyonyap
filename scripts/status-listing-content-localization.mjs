#!/usr/bin/env node
/**
 * Öncelikli ilan kategorilerinin Türkçe editör, 5 dil çeviri ve 6 dil SEO
 * ilerlemesini salt-okunur raporlar.
 *
 * Kullanım:
 *   node scripts/status-listing-content-localization.mjs
 *   node scripts/status-listing-content-localization.mjs --json
 */
import { createPgClient } from './lib/pg-client.mjs'

const jsonOutput = process.argv.includes('--json')

const sql = `
WITH target_listings AS (
  SELECT l.id, pc.code AS category_code,
    EXISTS (
      SELECT 1
      FROM listing_translations lt
      JOIN locales lo ON lo.id = lt.locale_id
      WHERE lt.listing_id = l.id
        AND lower(lo.code) = 'tr'
        AND length(coalesce(lt.description, '')) >= 120
        AND lower(coalesce(lt.description, '')) ~ '<p([[:space:]]|>)'
        AND lower(coalesce(lt.description, '')) ~ '<(h2|h3|ul|ol)([[:space:]]|>)'
        AND lower(coalesce(lt.description, '')) NOT LIKE '%&nbsp%'
        AND lower(coalesce(lt.description, '')) NOT LIKE '%&amp;nbsp%'
        AND lower(coalesce(lt.description, '')) !~ '\\m(the|and|with|from|located|featuring|complimentary|nearest|breakfast)\\M'
    ) AS tr_ready,
    NOT EXISTS (
      SELECT 1
      FROM (VALUES ('en'), ('de'), ('ru'), ('zh'), ('fr')) wanted(locale_code)
      WHERE NOT EXISTS (
        SELECT 1
        FROM listing_translations lt
        JOIN locales lo ON lo.id = lt.locale_id
        WHERE lt.listing_id = l.id
          AND lower(lo.code) = wanted.locale_code
          AND length(coalesce(lt.title, '')) > 0
          AND length(coalesce(lt.description, '')) > 80
          AND lower(coalesce(lt.description, '')) ~ '<p([[:space:]]|>)'
          AND lower(coalesce(lt.description, '')) ~ '<(h2|h3|ul|ol)([[:space:]]|>)'
          AND lower(coalesce(lt.description, '')) NOT LIKE '%&nbsp%'
          AND lower(coalesce(lt.description, '')) NOT LIKE '%&amp;nbsp%'
      )
    ) AS translations_ready,
    NOT EXISTS (
      SELECT 1
      FROM (VALUES ('tr'), ('en'), ('de'), ('ru'), ('zh'), ('fr')) wanted(locale_code)
      WHERE NOT EXISTS (
        SELECT 1
        FROM seo_metadata sm
        JOIN locales lo ON lo.id = sm.locale_id
        WHERE sm.entity_type = 'listing'
          AND sm.entity_id = l.id
          AND lower(lo.code) = wanted.locale_code
          AND length(coalesce(sm.title, '')) > 10
          AND length(coalesce(sm.description, '')) > 40
      )
    ) AS seo_ready
  FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id
  WHERE pc.code IN (
    'holiday_home', 'yacht_charter', 'activity', 'tour', 'cruise',
    'hotel', 'ferry', 'transfer', 'car_rental', 'flight'
  )
    AND l.status IN ('draft', 'published')
), batch_counts AS (
  SELECT category_code,
    count(*) FILTER (WHERE status = 'pending')::int AS pending,
    count(*) FILTER (WHERE status = 'running')::int AS running,
    count(*) FILTER (WHERE status = 'failed')::int AS failed
  FROM ai_listing_content_batches
  GROUP BY category_code
)
SELECT t.category_code,
  count(*)::int AS total,
  count(*) FILTER (WHERE t.tr_ready)::int AS tr_ready,
  count(*) FILTER (WHERE t.translations_ready)::int AS translations_ready,
  count(*) FILTER (WHERE t.seo_ready)::int AS seo_ready,
  count(*) FILTER (WHERE t.tr_ready AND t.translations_ready AND t.seo_ready)::int AS complete,
  coalesce(max(b.pending), 0)::int AS pending,
  coalesce(max(b.running), 0)::int AS running,
  coalesce(max(b.failed), 0)::int AS failed
FROM target_listings t
LEFT JOIN batch_counts b ON b.category_code = t.category_code
GROUP BY t.category_code
ORDER BY CASE t.category_code
  WHEN 'hotel' THEN 0 WHEN 'holiday_home' THEN 1 WHEN 'yacht_charter' THEN 2
  WHEN 'activity' THEN 3 WHEN 'tour' THEN 4 WHEN 'cruise' THEN 5
  WHEN 'ferry' THEN 6 WHEN 'transfer' THEN 7 WHEN 'car_rental' THEN 8
  WHEN 'flight' THEN 9 ELSE 10 END
`

const client = createPgClient()
await client.connect()
try {
  const result = await client.query(sql)
  const rows = result.rows.map((row) => ({
    category: row.category_code,
    total: Number(row.total),
    turkish: Number(row.tr_ready),
    translated: Number(row.translations_ready),
    seo: Number(row.seo_ready),
    complete: Number(row.complete),
    pending: Number(row.pending),
    running: Number(row.running),
    failed: Number(row.failed),
  }))
  const totals = rows.reduce(
    (acc, row) => {
      for (const key of ['total', 'turkish', 'translated', 'seo', 'complete', 'pending', 'running', 'failed']) {
        acc[key] += row[key]
      }
      return acc
    },
    { total: 0, turkish: 0, translated: 0, seo: 0, complete: 0, pending: 0, running: 0, failed: 0 },
  )
  if (jsonOutput) {
    console.log(JSON.stringify({ rows, totals }, null, 2))
  } else {
    console.table(rows)
    console.log('TOPLAM', totals)
  }
} finally {
  await client.end()
}

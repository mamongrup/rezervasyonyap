#!/usr/bin/env node
/**
 * Bravo tatil evi takvimleri — eski sistem 1 gün eksik kapatmıştı.
 * Örnek: çıkış sınırı 19 iken 20 olmalı (15–19 → 15–20).
 *
 * Mevcut PG satırlarında çok gecelik bloğun çıkış yarım-gününü (ÖÖ kapalı / ÖS açık)
 * bir gece daha uzatır: o günü tam kapatır, ertesi güne çıkış sınırı yazar.
 *
 *   node scripts/repair-bravo-calendar-checkout-plus-one.mjs --dry-run
 *   node scripts/repair-bravo-calendar-checkout-plus-one.mjs
 *   node scripts/repair-bravo-calendar-checkout-plus-one.mjs --slugs=akbulut-villa-3
 *   node scripts/repair-bravo-calendar-checkout-plus-one.mjs --from=2026-07-01
 *
 * Tekrar çalıştırılabilir: zaten uzatılmış bloklar seçilmez.
 */

import { createPgClient } from './lib/pg-client.mjs'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const slugArg = args.find((a) => a.startsWith('--slugs='))
const slugs = slugArg
  ? slugArg
      .slice('--slugs='.length)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : []
const fromArg = args.find((a) => a.startsWith('--from='))
const fromDay = fromArg?.slice('--from='.length) || new Date().toISOString().slice(0, 10)

const pg = createPgClient()
await pg.connect()

const params = [fromDay]
let slugSql = ''
if (slugs.length) {
  params.push(slugs)
  slugSql = ` AND l.slug = ANY($${params.length}::text[])`
}

const { rows: candidates } = await pg.query(
  `
  WITH bravo AS (
    SELECT l.id, l.slug
    FROM listings l
    JOIN product_categories pc ON pc.id = l.category_id
    WHERE pc.code = 'holiday_home'
      AND (
        l.external_provider_code = 'bravo_space'
        OR (
          coalesce(l.external_provider_code, '') = ''
          AND l.external_listing_ref ~ '^[0-9]+$'
        )
      )
      ${slugSql}
  ),
  cal AS (
    SELECT c.listing_id, b.slug, c.day::date AS day,
           c.am_available, c.pm_available, c.is_available, c.price_override
    FROM listing_availability_calendar c
    JOIN bravo b ON b.id = c.listing_id
    WHERE c.day >= $1::date - 2
  ),
  ends AS (
    SELECT
      cur.listing_id,
      cur.slug,
      cur.day AS end_day,
      cur.price_override AS end_price
    FROM cal cur
    JOIN cal prev
      ON prev.listing_id = cur.listing_id AND prev.day = cur.day - 1
    LEFT JOIN cal nxt
      ON nxt.listing_id = cur.listing_id AND nxt.day = cur.day + 1
    WHERE cur.day >= $1::date
      -- mevcut çıkış sınırı (ÖÖ kapalı, ÖS açık)
      AND cur.am_available = false
      AND cur.pm_available = true
      -- önceki gece dolu
      AND prev.pm_available = false
      -- ertesi gece henüz kapatılmamış (veya satır yok)
      AND coalesce(nxt.pm_available, true) = true
      AND coalesce(nxt.am_available, true) = true
      -- 2+ gecelik blok: end-2 gecesi de dolu veya end-1 giriş günü
      AND (
        EXISTS (
          SELECT 1 FROM cal p2
          WHERE p2.listing_id = cur.listing_id
            AND p2.day = cur.day - 2
            AND p2.pm_available = false
        )
        OR (prev.am_available = true AND prev.pm_available = false)
      )
  )
  SELECT listing_id::text, slug, end_day::text, end_price
  FROM ends
  ORDER BY slug, end_day
  `,
  params,
)

console.log(
  dryRun
    ? `[dry-run] uzatılacak çıkış sınırı: ${candidates.length}`
    : `uzatılacak çıkış sınırı: ${candidates.length}`,
)

let updated = 0
let upserted = 0
const samples = []

for (const row of candidates) {
  const endDay = row.end_day
  const nextDay = (() => {
    const d = new Date(`${endDay}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() + 1)
    return d.toISOString().slice(0, 10)
  })()

  if (samples.length < 15) {
    samples.push(`${row.slug}: ${endDay} → tam kapalı, çıkış ${nextDay}`)
  }

  if (dryRun) {
    updated += 1
    upserted += 1
    continue
  }

  await pg.query(
    `UPDATE listing_availability_calendar
     SET am_available = false,
         pm_available = false,
         is_available = false
     WHERE listing_id = $1::uuid AND day = $2::date`,
    [row.listing_id, endDay],
  )
  updated += 1

  await pg.query(
    `INSERT INTO listing_availability_calendar
       (listing_id, day, is_available, am_available, pm_available, price_override)
     VALUES ($1::uuid, $2::date, true, false, true, $3)
     ON CONFLICT (listing_id, day) DO UPDATE SET
       is_available = true,
       am_available = false,
       pm_available = true,
       price_override = COALESCE(EXCLUDED.price_override, listing_availability_calendar.price_override)`,
    [row.listing_id, nextDay, row.end_price],
  )
  upserted += 1
}

await pg.end()

for (const s of samples) console.log(' ', s)
if (candidates.length > samples.length) {
  console.log(`  … +${candidates.length - samples.length} daha`)
}
console.log(`özet: ends=${candidates.length} updated=${updated} checkout_upserts=${upserted} dryRun=${dryRun}`)

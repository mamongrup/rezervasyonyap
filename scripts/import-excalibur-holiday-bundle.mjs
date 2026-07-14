/**
 * export-excalibur-holiday-bundle.mjs çıktısını üretim PostgreSQL'e uygular.
 * MariaDB gerekmez. Eşleşme: external_listing_ref → slug.
 *
 *   node scripts/import-excalibur-holiday-bundle.mjs backups/excalibur-holiday-1.7.26.json.gz
 *   node scripts/import-excalibur-holiday-bundle.mjs /tmp/excalibur-holiday.json.gz --dry-run
 */

import { gunzipSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createPgClient } from './lib/pg-client.mjs'

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const DRY_RUN = process.argv.includes('--dry-run')
const BUNDLE = args[0]

const ORG_ID = 'a0000000-0000-4000-8000-000000000001'
const CATEGORY_ID = 1
const CAL_BATCH = 400

if (!BUNDLE) {
  console.error('Kullanım: node scripts/import-excalibur-holiday-bundle.mjs <bundle.json.gz>')
  process.exit(1)
}

function readBundle(filePath) {
  const abs = path.resolve(filePath)
  const buf = readFileSync(abs)
  const raw = abs.endsWith('.gz') ? gunzipSync(buf) : buf
  return JSON.parse(raw.toString('utf8'))
}

async function findListingId(pg, item) {
  const ref = String(item.external_listing_ref)
  const byRef = await pg.query(
    `SELECT id::text FROM listings WHERE external_listing_ref = $1 LIMIT 1`,
    [ref],
  )
  if (byRef.rows[0]?.id) return byRef.rows[0].id
  const bySlug = await pg.query(`SELECT id::text FROM listings WHERE slug = $1 LIMIT 1`, [
    item.slug,
  ])
  return bySlug.rows[0]?.id || null
}

async function upsertListing(pg, item, listingId) {
  const l = item.listing
  if (listingId) {
    await pg.query(
      `UPDATE listings SET
         slug = $2, status = $3, currency_code = $4,
         min_stay_nights = $5, map_lat = $6, map_lng = $7,
         location_name = $8, share_to_social = $9, instant_book = $10,
         external_listing_ref = $11, vitrin_price = $12,
         first_charge_amount = $13, updated_at = now()
       WHERE id = $1::uuid`,
      [
        listingId,
        item.slug,
        l.status,
        l.currency_code,
        l.min_stay_nights,
        l.map_lat,
        l.map_lng,
        l.location_name,
        l.share_to_social,
        l.instant_book,
        String(item.external_listing_ref),
        l.vitrin_price,
        l.first_charge_amount,
      ],
    )
    return listingId
  }

  const ins = await pg.query(
    `INSERT INTO listings (
       organization_id, category_id, slug, status, currency_code,
       min_stay_nights, map_lat, map_lng, location_name,
       external_listing_ref, share_to_social, instant_book, listing_source,
       vitrin_price, first_charge_amount
     ) VALUES (
       $1::uuid, $2, $3, $4, $5,
       $6, $7, $8, $9,
       $10, $11, $12, $13,
       $14, $15
     ) RETURNING id::text`,
    [
      l.organization_id || ORG_ID,
      l.category_id || CATEGORY_ID,
      item.slug,
      l.status,
      l.currency_code,
      l.min_stay_nights,
      l.map_lat,
      l.map_lng,
      l.location_name,
      String(item.external_listing_ref),
      l.share_to_social,
      l.instant_book,
      l.listing_source || 'manual',
      l.vitrin_price,
      l.first_charge_amount,
    ],
  )
  return ins.rows[0].id
}

async function replaceCalendar(pg, listingId, days) {
  await pg.query(`DELETE FROM listing_availability_calendar WHERE listing_id = $1::uuid`, [
    listingId,
  ])
  if (!days.length) return 0
  let n = 0
  for (let i = 0; i < days.length; i += CAL_BATCH) {
    const chunk = days.slice(i, i + CAL_BATCH)
    const values = []
    const params = [listingId]
    let p = 2
    for (const d of chunk) {
      const amAvailable = d.am_available ?? d.is_available
      const pmAvailable = d.pm_available ?? d.is_available
      values.push(
        `($1::uuid, $${p}::date, $${p + 1}::boolean, $${p + 2}::boolean, $${p + 3}::boolean, $${p + 4})`,
      )
      params.push(
        d.day,
        Boolean(d.is_available || amAvailable || pmAvailable),
        Boolean(amAvailable),
        Boolean(pmAvailable),
        d.price_override,
      )
      p += 5
      n++
    }
    await pg.query(
      `INSERT INTO listing_availability_calendar
         (listing_id, day, is_available, am_available, pm_available, price_override)
       VALUES ${values.join(', ')}
       ON CONFLICT (listing_id, day) DO UPDATE SET
         is_available = EXCLUDED.is_available,
         am_available = EXCLUDED.am_available,
         pm_available = EXCLUDED.pm_available,
         price_override = EXCLUDED.price_override`,
      params,
    )
  }
  return n
}

async function replacePriceRules(pg, listingId, rules) {
  await pg.query(`DELETE FROM listing_price_rules WHERE listing_id = $1::uuid`, [listingId])
  for (const r of rules) {
    await pg.query(
      `INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
       VALUES ($1::uuid, $2::jsonb, $3::date, $4::date)`,
      [listingId, r.rule_json, r.valid_from, r.valid_to],
    )
  }
  return rules.length
}

async function removeSyntheticHolidayHomeMealPlan(pg, listingId, rules) {
  if (!rules?.length) return 0
  const result = await pg.query(
    `DELETE FROM listing_meal_plans
     WHERE listing_id = $1::uuid
       AND plan_code = 'room_only'
       AND lower(btrim(label)) = 'konaklama'
       AND included_meals = '[]'::jsonb
       AND included_extras = '[]'::jsonb`,
    [listingId],
  )
  return result.rowCount || 0
}

async function applyItem(pg, item, stats) {
  let listingId = await findListingId(pg, item)
  const isNew = !listingId
  listingId = await upsertListing(pg, item, listingId)
  if (isNew) stats.created++
  else stats.updated++

  for (const t of item.translations || []) {
    await pg.query(
      `INSERT INTO listing_translations (listing_id, locale_id, title, description)
       VALUES ($1::uuid, $2, $3, $4)
       ON CONFLICT (listing_id, locale_id) DO UPDATE SET
         title = EXCLUDED.title, description = EXCLUDED.description`,
      [listingId, t.locale_id, t.title, t.description],
    )
  }

  for (const a of item.attributes || []) {
    await pg.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, $2, $3, $4::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = excluded.value_json`,
      [listingId, a.group_code, a.key, a.value_json],
    )
  }

  const hd = item.holiday_home_details
  if (hd) {
    await pg.query(
      `INSERT INTO listing_holiday_home_details (listing_id, theme_codes, rule_codes, ical_managed)
       VALUES ($1::uuid, $2::text[], $3::text[], $4)
       ON CONFLICT (listing_id) DO UPDATE SET
         theme_codes = EXCLUDED.theme_codes,
         rule_codes = EXCLUDED.rule_codes,
         ical_managed = EXCLUDED.ical_managed`,
      [listingId, hd.theme_codes, hd.rule_codes, hd.ical_managed],
    )
  }

  stats.calendarDays += await replaceCalendar(pg, listingId, item.calendar || [])
  stats.priceRules += await replacePriceRules(pg, listingId, item.price_rules || [])
  stats.syntheticMealPlansRemoved += await removeSyntheticHolidayHomeMealPlan(
    pg,
    listingId,
    item.price_rules || [],
  )
  stats.ok++
}

async function main() {
  console.log('Bundle:', BUNDLE, DRY_RUN ? '(dry-run)' : '')
  const data = await readBundle(path.resolve(BUNDLE))
  console.log('Export:', data.exported_at, data.counts)

  if (DRY_RUN) {
    console.log('dry-run OK —', data.listings?.length, 'ilan')
    return
  }

  const pg = createPgClient()
  await pg.connect()
  const stats = {
    ok: 0,
    created: 0,
    updated: 0,
    calendarDays: 0,
    priceRules: 0,
    syntheticMealPlansRemoved: 0,
    errors: 0,
  }

  for (let i = 0; i < data.listings.length; i++) {
    const item = data.listings[i]
    await pg.query('BEGIN')
    try {
      await applyItem(pg, item, stats)
      await pg.query('COMMIT')
      if ((i + 1) % 50 === 0) console.log(`--- ${i + 1}/${data.listings.length} ---`, item.slug)
    } catch (e) {
      await pg.query('ROLLBACK')
      stats.errors++
      console.error('ERR', item.slug, item.external_listing_ref, e.message)
    }
  }

  console.log('→ refresh_listing_vitrin_prices()…')
  await pg.query('SELECT refresh_listing_vitrin_prices()')
  await pg.end()

  console.log('=== import tamam ===')
  console.log(JSON.stringify(stats, null, 2))
  if (stats.errors > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

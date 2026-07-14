/**
 * Yerel PostgreSQL (Excalibur sync sonrası) → sunucuya taşınacak bundle (.json.gz).
 * MariaDB gerekmez; hedef sunucuda import-excalibur-holiday-bundle.mjs ile uygulanır.
 *
 *   node scripts/export-excalibur-holiday-bundle.mjs
 *   node scripts/export-excalibur-holiday-bundle.mjs --out backups/excalibur-holiday-1.7.26.json.gz
 */

import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createGzip } from 'node:zlib'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { createPgClient } from './lib/pg-client.mjs'
import { BRAVO_HOLIDAY_LISTING_SQL } from './lib/excalibur-bravo-listing-query.mjs'

const TRAVEL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outIdx = process.argv.indexOf('--out')
const defaultName = `excalibur-holiday-${new Date().toISOString().slice(0, 10)}.json.gz`
const OUT = path.resolve(
  TRAVEL_ROOT,
  outIdx >= 0 ? process.argv[outIdx + 1] : path.join('backups', defaultName),
)

async function loadListingBundle(pg, row) {
  const listingId = row.id
  const tr = await pg.query(
    `SELECT locale_id, title, description FROM listing_translations WHERE listing_id = $1::uuid`,
    [listingId],
  )
  const attrs = await pg.query(
    `SELECT group_code, key, value_json::text AS value_json
     FROM listing_attributes WHERE listing_id = $1::uuid`,
    [listingId],
  )
  const details = await pg.query(
    `SELECT theme_codes, rule_codes, ical_managed
     FROM listing_holiday_home_details WHERE listing_id = $1::uuid LIMIT 1`,
    [listingId],
  )
  const cal = await pg.query(
    `SELECT day::text AS day, is_available, am_available, pm_available,
            price_override::text AS price_override
     FROM listing_availability_calendar
     WHERE listing_id = $1::uuid
       AND day >= date_trunc('month', current_date)::date
     ORDER BY day`,
    [listingId],
  )
  const rules = await pg.query(
    `SELECT valid_from::text AS valid_from, valid_to::text AS valid_to,
            rule_json::text AS rule_json
     FROM listing_price_rules
     WHERE listing_id = $1::uuid
       AND (valid_to IS NULL OR valid_to >= date_trunc('month', current_date)::date)
     ORDER BY valid_from`,
    [listingId],
  )

  return {
    external_listing_ref: row.external_listing_ref,
    slug: row.slug,
    listing: {
      status: row.status,
      currency_code: row.currency_code,
      min_stay_nights: row.min_stay_nights,
      map_lat: row.map_lat,
      map_lng: row.map_lng,
      location_name: row.location_name,
      share_to_social: row.share_to_social,
      instant_book: row.instant_book,
      vitrin_price: row.vitrin_price,
      first_charge_amount: row.first_charge_amount,
      listing_source: row.listing_source,
      organization_id: row.organization_id,
      category_id: row.category_id,
    },
    translations: tr.rows,
    attributes: attrs.rows.map((a) => ({
      group_code: a.group_code,
      key: a.key,
      value_json: a.value_json,
    })),
    holiday_home_details: details.rows[0] || null,
    calendar: cal.rows,
    price_rules: rules.rows,
  }
}

async function main() {
  const pg = createPgClient()
  await pg.connect()

  const { rows } = await pg.query(BRAVO_HOLIDAY_LISTING_SQL)
  console.log('Bravo tatil evi:', rows.length)

  const listings = []
  let calendarDays = 0
  let priceRules = 0
  for (let i = 0; i < rows.length; i++) {
    const bundle = await loadListingBundle(pg, rows[i])
    listings.push(bundle)
    calendarDays += bundle.calendar.length
    priceRules += bundle.price_rules.length
    if ((i + 1) % 100 === 0) console.log(`  ${i + 1}/${rows.length}`)
  }

  await pg.end()

  const payload = {
    version: 1,
    exported_at: new Date().toISOString(),
    source: 'travel-postgresql-excalibur',
    counts: {
      listings: listings.length,
      calendar_days: calendarDays,
      price_rules: priceRules,
    },
    listings,
  }

  await mkdir(path.dirname(OUT), { recursive: true })
  const json = JSON.stringify(payload)
  await pipeline(Readable.from([json]), createGzip(), createWriteStream(OUT))

  console.log('=== export tamam ===')
  console.log(JSON.stringify({ out: OUT, ...payload.counts }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

/**
 * Bravo vs travel takvim fiyat karşılaştırması.
 *   node scripts/inspect-bravo-calendar-prices.mjs [legacy_id]
 */

import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const TRAVEL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(TRAVEL_ROOT, 'frontend', 'package.json'))
const mysql = require('mysql2/promise')
const pg = require('pg')

const legacyId = Number(process.argv[2] || 0)
const STATS_ONLY = process.argv.includes('--stats')

const mysqlConn = await mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'rezervasyonyap',
})
const pgClient = new pg.Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: '',
  database: 'travel',
})
await pgClient.connect()

if (STATS_ONLY) {
  const [bravoCount] = await mysqlConn.query(
    `SELECT COUNT(DISTINCT target_id) AS spaces, COUNT(*) AS day_rows FROM bravo_space_dates`,
  )
  const q = await pgClient.query(`
    SELECT
      (SELECT count(*)::int FROM listings WHERE external_listing_ref IS NOT NULL) AS imported,
      (SELECT count(*)::int FROM listings l WHERE l.external_listing_ref IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM listing_availability_calendar c WHERE c.listing_id = l.id)) AS no_cal,
      (SELECT count(*)::int FROM listing_price_rules pr
         JOIN listings l ON l.id = pr.listing_id
         WHERE l.external_listing_ref IS NOT NULL AND pr.valid_from IS NOT NULL) AS rules_with_dates,
      (SELECT count(*)::int FROM listing_availability_calendar lac
         JOIN listings l ON l.id = lac.listing_id WHERE l.external_listing_ref IS NOT NULL) AS cal_rows
  `)
  const multi = await pgClient.query(`
    SELECT count(*)::int AS n FROM (
      SELECT l.id FROM listings l
      JOIN listing_availability_calendar c ON c.listing_id = l.id
      WHERE l.external_listing_ref IS NOT NULL AND c.price_override IS NOT NULL
      GROUP BY l.id HAVING count(DISTINCT c.price_override) > 1
    ) t
  `)
  console.log('Bravo:', bravoCount[0])
  console.log('Travel:', q.rows[0], 'listings with 2+ price bands:', multi.rows[0].n)
  await mysqlConn.end()
  await pgClient.end()
  process.exit(0)
}

const [[space]] = await mysqlConn.query(
  `SELECT id, slug, title, price, sale_price, min_day_stays, currency FROM bravo_spaces WHERE id = ?`,
  [legacyId],
)
const [bravoDates] = await mysqlConn.query(
  `SELECT DATE(start_date) AS day, price, active
   FROM bravo_space_dates WHERE target_id = ? ORDER BY start_date`,
  [legacyId],
)

const { rows: listings } = await pgClient.query(
  `SELECT l.id::text, l.slug
   FROM listings l WHERE l.external_listing_ref = $1 LIMIT 1`,
  [String(legacyId)],
)
const listing = listings[0]
let travelDates = []
let rules = []
if (listing) {
  const r1 = await pgClient.query(
    `SELECT day::text, price_override::text, is_available
     FROM listing_availability_calendar WHERE listing_id = $1::uuid ORDER BY day LIMIT 5000`,
    [listing.id],
  )
  travelDates = r1.rows
  const r2 = await pgClient.query(
    `SELECT valid_from::text, valid_to::text, rule_json::text
     FROM listing_price_rules WHERE listing_id = $1::uuid ORDER BY valid_from`,
    [listing.id],
  )
  rules = r2.rows
}

const priceBands = new Map()
for (const d of bravoDates) {
  const k = String(d.price)
  if (!priceBands.has(k)) priceBands.set(k, { count: 0, active1: 0, sampleFrom: d.day, sampleTo: d.day })
  const b = priceBands.get(k)
  b.count++
  if (Number(d.active) === 1) b.active1++
  if (d.day < b.sampleFrom) b.sampleFrom = d.day
  if (d.day > b.sampleTo) b.sampleTo = d.day
}

const travelBands = new Map()
for (const d of travelDates) {
  const k = d.price_override ?? 'null'
  if (!travelBands.has(k)) travelBands.set(k, 0)
  travelBands.set(k, travelBands.get(k) + 1)
}

console.log('=== Bravo space', legacyId, space?.slug, '===')
console.log('bravo_spaces.price:', space?.price, 'sale_price:', space?.sale_price, 'currency:', space?.currency)
console.log('bravo_space_dates rows:', bravoDates.length)
console.log('distinct price bands (Bravo):', priceBands.size)
for (const [price, b] of [...priceBands.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))) {
  console.log(
    `  ${price} TL — ${b.count} gün (active=1: ${b.active1}) ${b.sampleFrom} → ${b.sampleTo}`,
  )
}

console.log('\n=== Travel', listing?.slug ?? '(not imported)', '===')
console.log('listing_price_rules:', rules.length)
for (const r of rules) {
  const j = JSON.parse(r.rule_json)
  console.log(
    `  ${r.valid_from} → ${r.valid_to} | gecelik ${j.base_nightly} | haftalık ${j.weekly_total ?? '-'}`,
  )
}
console.log('listing_availability_calendar rows:', travelDates.length)
console.log('distinct price_override bands:', travelBands.size)
for (const [p, c] of [...travelBands.entries()].slice(0, 15)) {
  console.log(`  ${p}: ${c} gün`)
}

await mysqlConn.end()
await pgClient.end()

/**
 * Bravo takvim fiyatlarını dönemsel listing_price_rules olarak aktarır.
 * Takvimi (bravo_space_dates) olmayan ilanlarda kurallar silinir, yeni kural eklenmez.
 *
 *   node scripts/import-bravo-seasonal-prices.mjs
 *   node scripts/import-bravo-seasonal-prices.mjs --slug love-in-villa
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { importBravoSeasonalPriceRules } from './lib/bravo-seasonal-prices.mjs'
import { mysqlConfigFromArgv } from './lib/bravo-mysql-config.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const TRAVEL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(TRAVEL_ROOT, 'frontend', 'package.json'))
const mysql = require('mysql2/promise')

const slugFilter = (() => {
  const i = process.argv.indexOf('--slug')
  return i >= 0 ? process.argv[i + 1]?.trim() : ''
})()

const mysqlConn = await mysql.createConnection(mysqlConfigFromArgv())
const pgClient = createPgClient()
await pgClient.connect()

let q = `SELECT l.id::text, l.slug, l.external_listing_ref
         FROM listings l
         JOIN product_categories c ON c.id = l.category_id
         WHERE c.code = 'holiday_home'
           AND l.external_listing_ref ~ '^[0-9]+$'`
const params = []
if (slugFilter) {
  q += ` AND l.slug = $1`
  params.push(slugFilter)
}
q += ` ORDER BY l.external_listing_ref::int`
const { rows: listings } = await pgClient.query(q, params)

let withPeriods = 0
let cleared = 0
let totalPeriods = 0

for (const row of listings) {
  const legacyId = Number(row.external_listing_ref)
  const [[space]] = await mysqlConn.query(
    `SELECT min_day_stays FROM bravo_spaces WHERE id = ? LIMIT 1`,
    [legacyId],
  )
  const result = await importBravoSeasonalPriceRules(
    pgClient,
    mysqlConn,
    row.id,
    legacyId,
    space ?? {},
  )
  if (result.skipped) {
    cleared++
    console.log('empty', row.slug)
  } else {
    withPeriods++
    totalPeriods += result.periods
    console.log('OK', row.slug, result.periods, 'periods')
  }
}

console.log('---')
console.log(
  `listings=${listings.length} with_periods=${withPeriods} cleared=${cleared} total_period_rows=${totalPeriods}`,
)

await mysqlConn.end()
await pgClient.end()

/**
 * Bravo takvim doluluk + günlük fiyat override → listing_availability_calendar.
 *
 *   node scripts/import-bravo-calendar.mjs
 *   node scripts/import-bravo-calendar.mjs --slug aura-villa-g
 *   node scripts/import-bravo-calendar.mjs --missing-only
 *
 * Önkoşul: PostgreSQL'de 242 + 289 migration'ları uygulanmış olmalı
 * (am_available, pm_available, day_status kolonları).
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { importBravoAvailabilityCalendar } from './lib/bravo-calendar.mjs'

const TRAVEL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(TRAVEL_ROOT, 'frontend', 'package.json'))
const mysql = require('mysql2/promise')
const pg = require('pg')

const slugFilter = (() => {
  const i = process.argv.indexOf('--slug')
  return i >= 0 ? process.argv[i + 1]?.trim() : ''
})()
const missingOnly = process.argv.includes('--missing-only')

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

const schema = await pgClient.query(`
  SELECT
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'listing_availability_calendar' AND column_name = 'am_available'
    ) AS has_half_days,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'listing_availability_calendar' AND column_name = 'day_status'
    ) AS has_day_status
`)
const { has_half_days: hasHalfDays, has_day_status: hasDayStatus } = schema.rows[0]
if (!hasHalfDays || !hasDayStatus) {
  console.error(
    'Eksik şema: önce migration 242 ve 289 uygulayın (am_available / day_status).',
  )
  process.exit(1)
}

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
if (missingOnly) {
  q += ` AND NOT EXISTS (
    SELECT 1 FROM listing_availability_calendar cal WHERE cal.listing_id = l.id
  )`
}
q += ` ORDER BY l.external_listing_ref::int`
const { rows: listings } = await pgClient.query(q, params)

let withDays = 0
let skipped = 0
let totalDays = 0
let totalBlocked = 0

for (const row of listings) {
  const legacyId = Number(row.external_listing_ref)
  const result = await importBravoAvailabilityCalendar(
    pgClient,
    mysqlConn,
    row.id,
    legacyId,
  )
  if (result.skipped) {
    skipped++
    console.log('empty', row.slug)
  } else {
    withDays++
    totalDays += result.days
    totalBlocked += result.blocked
    console.log('OK', row.slug, `${result.days} days`, `${result.blocked} blocked`)
  }
}

console.log('---')
console.log(
  `listings=${listings.length} with_calendar=${withDays} empty=${skipped} total_days=${totalDays} blocked_days=${totalBlocked}`,
)

await mysqlConn.end()
await pgClient.end()

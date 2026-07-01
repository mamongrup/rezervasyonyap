/**
 * Excalibur MySQL ↔ travel PostgreSQL tutarlılık denetimi (takvim + fiyat).
 *
 *   node scripts/audit-excalibur-sync.mjs
 *   node scripts/audit-excalibur-sync.mjs --mysql-database rezervasyonyapco_excalibur
 *   node scripts/audit-excalibur-sync.mjs --fail-on-mismatch
 *   node scripts/audit-excalibur-sync.mjs --refresh-vitrin
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { mysqlConfigFromArgv } from './lib/bravo-mysql-config.mjs'
import { compressBravoDateBands } from './lib/bravo-seasonal-prices.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const TRAVEL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(TRAVEL_ROOT, 'frontend', 'package.json'))
const mysql = require('mysql2/promise')

const args = new Set(process.argv.slice(2))
const FAIL_ON_MISMATCH = args.has('--fail-on-mismatch')
const REFRESH_VITRIN = args.has('--refresh-vitrin')
const SAMPLE = 15

async function mysqlCalendarStats(conn, legacyId) {
  const [[row]] = await conn.query(
    `SELECT COUNT(*) AS days,
            SUM(CASE WHEN active = 0 THEN 1 ELSE 0 END) AS blocked,
            SUM(CASE WHEN price IS NOT NULL AND price > 0 THEN 1 ELSE 0 END) AS priced_days
     FROM bravo_space_dates WHERE target_id = ?`,
    [legacyId],
  )
  const [priced] = await conn.query(
    `SELECT DATE(start_date) AS day, price
     FROM bravo_space_dates
     WHERE target_id = ? AND price IS NOT NULL AND price > 0
     ORDER BY start_date`,
    [legacyId],
  )
  return {
    days: Number(row.days || 0),
    blocked: Number(row.blocked || 0),
    pricedDays: Number(row.priced_days || 0),
    priceBands: compressBravoDateBands(priced).length,
  }
}

async function pgStats(pg, listingId) {
  const calRes = await pg.query(
    `SELECT COUNT(*)::int AS days,
            SUM(CASE WHEN NOT is_available THEN 1 ELSE 0 END)::int AS blocked,
            SUM(CASE WHEN price_override IS NOT NULL AND price_override::numeric > 0 THEN 1 ELSE 0 END)::int AS priced_days
     FROM listing_availability_calendar WHERE listing_id = $1::uuid`,
    [listingId],
  )
  const rulesRes = await pg.query(
    `SELECT COUNT(*)::int AS c FROM listing_price_rules WHERE listing_id = $1::uuid`,
    [listingId],
  )
  const cal = calRes.rows[0] || { days: 0, blocked: 0, priced_days: 0 }
  const rules = rulesRes.rows[0] || { c: 0 }
  return {
    days: cal.days,
    blocked: cal.blocked,
    pricedDays: cal.priced_days,
    priceBands: rules.c,
  }
}

async function main() {
  const mysqlCfg = mysqlConfigFromArgv()
  const mysqlConn = await mysql.createConnection(mysqlCfg)
  const pg = createPgClient()
  await pg.connect()

  const [spaces] = await mysqlConn.query(
    `SELECT id, slug, title FROM bravo_spaces
     WHERE deleted_at IS NULL AND status = 'publish'
     ORDER BY id`,
  )

  const { rows: pgListings } = await pg.query(
    `SELECT id::text, slug, external_listing_ref
     FROM listings
     WHERE external_listing_ref IS NOT NULL AND btrim(external_listing_ref) <> ''`,
  )
  const byRef = new Map(pgListings.map((r) => [String(r.external_listing_ref), r]))

  const summary = {
    mysql_database: mysqlCfg.database,
    mysql_publish_spaces: spaces.length,
    pg_linked_listings: pgListings.length,
    missing_on_pg: 0,
    calendar_day_mismatch: 0,
    calendar_blocked_mismatch: 0,
    price_band_mismatch: 0,
    mysql_has_calendar_pg_empty: 0,
    mysql_has_prices_pg_empty: 0,
    ok: 0,
  }
  const issues = []

  for (const space of spaces) {
    const ref = String(space.id)
    const pgRow = byRef.get(ref)
    if (!pgRow) {
      summary.missing_on_pg++
      if (issues.length < SAMPLE) {
        issues.push({ type: 'missing_on_pg', legacy_id: space.id, slug: space.slug, title: space.title })
      }
      continue
    }

    const ms = await mysqlCalendarStats(mysqlConn, space.id)
    const ps = await pgStats(pg, pgRow.id)

    let ok = true
    if (ms.days !== ps.days) {
      summary.calendar_day_mismatch++
      ok = false
      if (issues.length < SAMPLE) {
        issues.push({
          type: 'calendar_days',
          legacy_id: space.id,
          slug: space.slug,
          mysql: ms.days,
          pg: ps.days,
        })
      }
    }
    if (ms.blocked !== ps.blocked) {
      summary.calendar_blocked_mismatch++
      ok = false
    }
    if (ms.priceBands !== ps.priceBands) {
      summary.price_band_mismatch++
      ok = false
      if (issues.length < SAMPLE) {
        issues.push({
          type: 'price_bands',
          legacy_id: space.id,
          slug: space.slug,
          mysql: ms.priceBands,
          pg: ps.priceBands,
          mysql_priced_days: ms.pricedDays,
        })
      }
    }
    if (ms.days > 0 && ps.days === 0) summary.mysql_has_calendar_pg_empty++
    if (ms.priceBands > 0 && ps.priceBands === 0) summary.mysql_has_prices_pg_empty++
    if (ok) summary.ok++
  }

  if (REFRESH_VITRIN) {
    console.log('→ refresh_listing_vitrin_prices()…')
    await pg.query('SELECT refresh_listing_vitrin_prices()')
  }

  await mysqlConn.end()
  await pg.end()

  const report = { summary, sample_issues: issues }
  console.log(JSON.stringify(report, null, 2))

  const bad =
    summary.missing_on_pg > 0 ||
    summary.calendar_day_mismatch > 0 ||
    summary.price_band_mismatch > 0 ||
    summary.mysql_has_calendar_pg_empty > 0 ||
    summary.mysql_has_prices_pg_empty > 0

  if (FAIL_ON_MISMATCH && bad) process.exit(2)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

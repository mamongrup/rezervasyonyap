/**
 * Excalibur (Bravo) MySQL → mevcut travel ilanları: fiyat kuralları, takvim, ilan tipi.
 *
 * Önkoşul: dump MySQL'e yüklü (ör. rezervasyonyapco_excalibur).
 *
 *   node scripts/sync-excalibur-bravo.mjs
 *   node scripts/sync-excalibur-bravo.mjs --mysql-database rezervasyonyapco_excalibur
 *   node scripts/sync-excalibur-bravo.mjs --slug aura-villa-g --dry-run
 *   node scripts/sync-excalibur-bravo.mjs --limit 5
 *
 * PostgreSQL: backend.env / DATABASE_URL veya Laragon varsayılanları.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { mysqlConfigFromArgv } from './lib/bravo-mysql-config.mjs'
import { importBravoAvailabilityCalendar } from './lib/bravo-calendar.mjs'
import { importBravoSeasonalPriceRules } from './lib/bravo-seasonal-prices.mjs'
import {
  applyListingPropertyType,
  resolveHolidayPropertyType,
} from './lib/bravo-property-type.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const TRAVEL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(TRAVEL_ROOT, 'frontend', 'package.json'))
const mysql = require('mysql2/promise')

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const slugFilter = (() => {
  const i = process.argv.indexOf('--slug')
  return i >= 0 ? process.argv[i + 1]?.trim() : ''
})()
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0

async function loadTermsForSpace(mysql, targetId) {
  const [rows] = await mysql.query(
    `SELECT t.attr_id, t.slug, t.name
     FROM bravo_space_term st
     JOIN bravo_terms t ON t.id = st.term_id
     WHERE st.target_id = ?`,
    [targetId],
  )
  return rows
}

async function mergeListingMetaFromSpace(pgClient, listingId, space) {
  const cur = await pgClient.query(
    `SELECT value_json::text AS j
     FROM listing_attributes
     WHERE listing_id = $1::uuid AND group_code = 'listing_meta' AND key = 'v1'
     LIMIT 1`,
    [listingId],
  )
  let meta = {}
  if (cur.rows[0]?.j) {
    try {
      meta = JSON.parse(cur.rows[0].j)
    } catch {
      meta = {}
    }
  }

  const patch = {
    address: space.address || meta.address || '',
    lat: space.map_lat != null ? String(space.map_lat) : meta.lat || '',
    lng: space.map_lng != null ? String(space.map_lng) : meta.lng || '',
    max_guests: space.max_guests != null ? String(space.max_guests) : meta.max_guests || '',
    room_count: space.bed != null ? String(space.bed) : meta.room_count || '',
    bed_count: space.bed != null ? String(space.bed) : meta.bed_count || '',
    bath_count: space.bathroom != null ? String(space.bathroom) : meta.bath_count || '',
    square_meters: space.square != null ? String(space.square) : meta.square_m2 || meta.square_meters || '',
    min_advance_booking_days:
      space.min_day_before_booking != null
        ? String(space.min_day_before_booking)
        : meta.min_advance_booking_days || '',
    damage_deposit:
      space.damage_deposit != null ? String(space.damage_deposit) : meta.damage_deposit || '',
    check_in_time: space.check_in_time || meta.check_in_time || '16:00',
    check_out_time: space.check_out_time || meta.check_out_time || '10:00',
    pool_type: space.pool_type || meta.pool_type || '',
    heated_pool: space.heated_pool || meta.heated_pool || '',
    legacy_bravo_id: String(space.id),
    short_stay_fee:
      space.cleaning_fee != null ? String(space.cleaning_fee) : meta.short_stay_fee || '',
    min_short_stay_nights:
      space.cleaning_fee_day != null
        ? String(space.cleaning_fee_day)
        : meta.min_short_stay_nights || '',
  }

  const next = { ...meta, ...patch }
  if (!DRY_RUN) {
    await pgClient.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, 'listing_meta', 'v1', $2::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = excluded.value_json`,
      [listingId, JSON.stringify(next)],
    )
  }
}

async function main() {
  const mysqlCfg = mysqlConfigFromArgv()
  console.log('MySQL DB:', mysqlCfg.database, DRY_RUN ? '(dry-run)' : '')

  const mysqlConn = await mysql.createConnection(mysqlCfg)
  const pgClient = createPgClient()
  await pgClient.connect()

  const schema = await pgClient.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'listing_availability_calendar' AND column_name = 'day_status'
    ) AS ok`)
  if (!schema.rows[0]?.ok) {
    console.error('Eksik şema: migration 242 + 289 (listing_availability_calendar).')
    process.exit(1)
  }

  let q = `SELECT l.id::text, l.slug, l.external_listing_ref
           FROM listings l
           WHERE l.external_listing_ref IS NOT NULL AND btrim(l.external_listing_ref) <> ''`
  const params = []
  if (slugFilter) {
    q += ` AND l.slug = $1`
    params.push(slugFilter)
  }
  q += ` ORDER BY l.external_listing_ref::int`
  if (LIMIT > 0) q += ` LIMIT ${LIMIT}`

  const { rows: listings } = await pgClient.query(q, params)
  console.log('İlan sayısı (PG):', listings.length)

  const stats = {
    ok: 0,
    missingBravo: 0,
    calendarDays: 0,
    pricePeriods: 0,
    byType: { villa: 0, apart: 0, daire: 0, bungalov: 0, other: 0 },
  }

  let n = 0
  for (const row of listings) {
    n++
    const legacyId = Number(row.external_listing_ref)
    const [[space]] = await mysqlConn.query(
      `SELECT * FROM bravo_spaces WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [legacyId],
    )
    if (!space) {
      stats.missingBravo++
      console.log('skip (bravo yok)', row.slug, legacyId)
      continue
    }

    const terms = await loadTermsForSpace(mysqlConn, legacyId)
    const propertyType = resolveHolidayPropertyType(terms, space)
    if (propertyType in stats.byType) stats.byType[propertyType]++
    else stats.byType.other++

    if (DRY_RUN) {
      console.log('DRY', row.slug, propertyType || '?', 'legacy', legacyId)
      stats.ok++
      continue
    }

    await pgClient.query('BEGIN')
    try {
      await pgClient.query(
        `UPDATE listings SET
           currency_code = $2,
           min_stay_nights = $3,
           map_lat = $4,
           map_lng = $5,
           instant_book = $6,
           updated_at = now()
         WHERE id = $1::uuid`,
        [
          row.id,
          String(space.currency || 'TRY').trim().toUpperCase().slice(0, 3) || 'TRY',
          space.min_day_stays,
          space.map_lat,
          space.map_lng,
          Boolean(space.is_instant),
        ],
      )

      await mergeListingMetaFromSpace(pgClient, row.id, space)
      if (propertyType) await applyListingPropertyType(pgClient, row.id, propertyType)

      const cal = await importBravoAvailabilityCalendar(pgClient, mysqlConn, row.id, legacyId)
      stats.calendarDays += cal.days

      const seasonal = await importBravoSeasonalPriceRules(
        pgClient,
        mysqlConn,
        row.id,
        legacyId,
        space,
      )
      stats.pricePeriods += seasonal.periods

      await pgClient.query('COMMIT')
      stats.ok++
      if (n % 50 === 0) {
        console.log(`--- ${n}/${listings.length} ---`, row.slug, propertyType, `cal=${cal.days}`)
      }
    } catch (e) {
      await pgClient.query('ROLLBACK')
      console.error('ERR', row.slug, e.message)
    }
  }

  await mysqlConn.end()
  await pgClient.end()

  console.log('=== bitti ===')
  console.log(JSON.stringify(stats, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

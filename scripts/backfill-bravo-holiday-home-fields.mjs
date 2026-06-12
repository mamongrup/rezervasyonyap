/**
 * Mevcut Bravo tatil evi ilanları — vitrin eksik alan backfill.
 *
 * Eşleştirilen alanlar:
 *   - listing_meta.square_meters (eski square_m2)
 *   - vertical_holiday_home.pools (Bravo pool_type / heated_pool + tema)
 *   - listing_owner_contacts (ev sahibi kartı)
 *   - listings.first_charge_amount (hasar depozitosu)
 *   - listings.pool_size_label
 *
 *   node scripts/backfill-bravo-holiday-home-fields.mjs
 *   node scripts/backfill-bravo-holiday-home-fields.mjs --dry-run --limit 20
 *   node scripts/backfill-bravo-holiday-home-fields.mjs --slug aura-villa-g
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { mysqlConfigFromArgv } from './lib/bravo-mysql-config.mjs'
import { createPgClient } from './lib/pg-client.mjs'
import {
  applyBravoHolidayHomeVitrinFields,
  buildBravoHolidayHomeVitrinPackage,
  loadBravoOwnerContact,
  mergeBravoListingMeta,
} from './lib/bravo-holiday-home-map.mjs'
import { resolveHolidayPropertyType } from './lib/bravo-property-type.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const slugIdx = process.argv.indexOf('--slug')
const SLUG = slugIdx >= 0 ? process.argv[slugIdx + 1]?.trim() : ''
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0

const require = createRequire(
  path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'frontend', 'package.json'),
)
const mysql = require('mysql2/promise')

async function loadTermsForSpace(mysqlConn, targetId) {
  const [rows] = await mysqlConn.query(
    `SELECT t.attr_id, t.slug, t.name
     FROM bravo_space_term st
     JOIN bravo_terms t ON t.id = st.term_id
     WHERE st.target_id = ?`,
    [targetId],
  )
  return rows
}

async function main() {
  const mysqlConn = await mysql.createConnection(mysqlConfigFromArgv())
  const pgClient = createPgClient()
  await pgClient.connect()

  try {
    let sql = `
      SELECT l.id::text AS id, l.slug, l.external_listing_ref
      FROM listings l
      JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'holiday_home'
      WHERE l.external_listing_ref IS NOT NULL
        AND trim(l.external_listing_ref) <> ''`
    const params = []
    if (SLUG) {
      params.push(SLUG)
      sql += ` AND l.slug = $${params.length}`
    }
    sql += ' ORDER BY l.slug ASC'
    if (LIMIT > 0) {
      params.push(LIMIT)
      sql += ` LIMIT $${params.length}`
    }

    const { rows: listings } = await pgClient.query(sql, params)
    console.log(`Bravo tatil evi: ${listings.length} ilan${DRY_RUN ? ' (dry-run)' : ''}`)

    const stats = {
      ok: 0,
      skip: 0,
      pools: 0,
      owners: 0,
      deposit: 0,
      square: 0,
    }

    for (const row of listings) {
      const legacyId = Number(row.external_listing_ref)
      if (!Number.isFinite(legacyId)) {
        stats.skip++
        continue
      }

      const [[space]] = await mysqlConn.query(
        `SELECT * FROM bravo_spaces WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
        [legacyId],
      )
      if (!space) {
        console.warn('skip (bravo yok)', row.slug, legacyId)
        stats.skip++
        continue
      }

      const curMeta = await pgClient.query(
        `SELECT value_json::text AS j FROM listing_attributes
         WHERE listing_id = $1::uuid AND group_code = 'listing_meta' AND key = 'v1' LIMIT 1`,
        [row.id],
      )
      let existingMeta = {}
      if (curMeta.rows[0]?.j) {
        try {
          existingMeta = JSON.parse(curMeta.rows[0].j)
        } catch {
          existingMeta = {}
        }
      }

      const terms = await loadTermsForSpace(mysqlConn, legacyId)
      const meta = mergeBravoListingMeta(space, existingMeta, terms)
      const propertyType = resolveHolidayPropertyType(terms, space)
      if (propertyType) meta.property_type = propertyType

      const vitrin = buildBravoHolidayHomeVitrinPackage(space, meta, terms)
      const ownerContact =
        vitrin.ownerContact || (await loadBravoOwnerContact(mysqlConn, space))

      if (DRY_RUN) {
        console.log(
          'DRY',
          row.slug,
          `m²=${meta.square_meters || '—'}`,
          `pool=${vitrin.pools.open_pool.enabled || vitrin.pools.heated_pool.enabled ? 'yes' : 'no'}`,
          `owner=${ownerContact?.contact_name || '—'}`,
          `deposit=${vitrin.damageDepositAmount ?? '—'}`,
        )
        stats.ok++
        continue
      }

      await pgClient.query('BEGIN')
      try {
        await applyBravoHolidayHomeVitrinFields(pgClient, row.id, {
          meta,
          pools: vitrin.pools,
          ownerContact,
          poolSizeLabel: vitrin.poolSizeLabel,
          damageDepositAmount: vitrin.damageDepositAmount,
          accommodationRuleIds: vitrin.accommodationRuleIds,
        })
        await pgClient.query('COMMIT')
        stats.ok++
        if (meta.square_meters && !existingMeta.square_meters) stats.square++
        if (vitrin.pools.open_pool.enabled || vitrin.pools.heated_pool.enabled || vitrin.pools.children_pool.enabled) {
          stats.pools++
        }
        if (ownerContact?.contact_name) stats.owners++
        if (vitrin.damageDepositAmount != null) stats.deposit++
      } catch (e) {
        await pgClient.query('ROLLBACK')
        console.error('ERR', row.slug, e.message)
      }
    }

    console.log('Tamamlandı:', stats)
  } finally {
    await mysqlConn.end()
    await pgClient.end()
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

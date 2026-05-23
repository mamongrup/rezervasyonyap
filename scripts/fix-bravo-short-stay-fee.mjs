/**
 * Bravo aktarımında cleaning_fee → cleaning_fee_amount yanlış yazıldıysa düzeltir:
 *   bravo_spaces.cleaning_fee      → listing_meta.short_stay_fee
 *   bravo_spaces.cleaning_fee_day  → listing_meta.min_short_stay_nights
 *   listings.cleaning_fee_amount   → NULL
 *
 *   node scripts/fix-bravo-short-stay-fee.mjs
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const TRAVEL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(TRAVEL_ROOT, 'frontend', 'package.json'))
const mysql = require('mysql2/promise')
const pg = require('pg')

async function main() {
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

  const { rows: listings } = await pgClient.query(
    `SELECT id::text, external_listing_ref
     FROM listings
     WHERE category_id = 1
       AND external_listing_ref IS NOT NULL
       AND btrim(external_listing_ref) <> ''`,
  )

  let fixed = 0
  for (const row of listings) {
    const legacyId = Number(row.external_listing_ref)
    if (!legacyId) continue

    const [spaces] = await mysqlConn.query(
      `SELECT cleaning_fee, cleaning_fee_day FROM bravo_spaces WHERE id = ? LIMIT 1`,
      [legacyId],
    )
    const space = spaces[0]
    if (!space) continue

    const patch = {}
    if (space.cleaning_fee != null) patch.short_stay_fee = String(space.cleaning_fee)
    if (space.cleaning_fee_day != null) {
      patch.min_short_stay_nights = String(space.cleaning_fee_day)
    }
    if (!Object.keys(patch).length) continue

    await pgClient.query('BEGIN')
    try {
      await pgClient.query(
        `UPDATE listings SET cleaning_fee_amount = NULL, updated_at = now()
         WHERE id = $1::uuid`,
        [row.id],
      )
      if (Object.keys(patch).length) {
        await pgClient.query(
          `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
           VALUES ($1::uuid, 'listing_meta', 'v1', $2::jsonb)
           ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
             value_json = COALESCE(listing_attributes.value_json, '{}'::jsonb) || EXCLUDED.value_json`,
          [row.id, JSON.stringify(patch)],
        )
      }
      await pgClient.query('COMMIT')
      fixed++
    } catch (e) {
      await pgClient.query('ROLLBACK')
      console.error('ERR', row.external_listing_ref, e.message)
    }
  }

  await mysqlConn.end()
  await pgClient.end()
  console.log(`fixed ${fixed} / ${listings.length} bravo listings`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

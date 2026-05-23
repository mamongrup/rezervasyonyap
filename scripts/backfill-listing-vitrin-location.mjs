/**
 * Bravo ilanlarına vitrin konumu meta yazar (ilçe + il; semt boş kalabilir).
 * Destinasyon ataması panelden veya elle yapılır.
 *
 *   node scripts/backfill-listing-vitrin-location.mjs
 */

import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(root, 'frontend', 'package.json'))
const mysql = require('mysql2/promise')
const pg = require('pg')

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

let n = 0
const { rows } = await pgClient.query(
  `SELECT id::text, external_listing_ref FROM listings
   WHERE external_listing_ref IS NOT NULL`,
)
for (const row of rows) {
  const legacyId = Number(row.external_listing_ref)
  const [spaces] = await mysqlConn.query(
    `SELECT s.location_id, bl.name AS loc_name, bl.parent_id,
            pr.name AS province_name, pr.slug AS province_slug
     FROM bravo_spaces s
     LEFT JOIN bravo_locations bl ON bl.id = s.location_id
     LEFT JOIN bravo_locations pr ON pr.id = bl.parent_id
     WHERE s.id = ? LIMIT 1`,
    [legacyId],
  )
  const s = spaces[0]
  if (!s?.loc_name) continue
  const patch = {
    city: String(s.loc_name).trim(),
    province_city: s.province_name ? String(s.province_name).trim() : '',
  }
  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'listing_meta', 'v1', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
       value_json = COALESCE(listing_attributes.value_json, '{}'::jsonb) || EXCLUDED.value_json`,
    [row.id, JSON.stringify(patch)],
  )
  n++
}

await mysqlConn.end()
await pgClient.end()
console.log(`updated vitrin city/province for ${n} listings`)

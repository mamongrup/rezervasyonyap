/**
 * Yat ilanlarına hiyerarşik vitrin konumu yazar (ör. Göcek, Fethiye, Muğla).
 *
 *   node scripts/backfill-yacht-vitrin-location.mjs
 *   node scripts/backfill-yacht-vitrin-location.mjs --dry-run
 */

import { createPgClient } from './lib/pg-client.mjs'
import { applyYachtLocationToMeta } from './lib/yacht-location-resolve.mjs'

const dryRun = process.argv.includes('--dry-run')
const pg = createPgClient()
await pg.connect()

const { rows } = await pg.query(`
  SELECT l.id::text AS id, l.slug, l.location_name,
    la.value_json AS meta
  FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'yacht_charter'
  LEFT JOIN listing_attributes la
    ON la.listing_id = l.id AND la.group_code = 'listing_meta' AND la.key = 'v1'
`)

let updated = 0
const samples = []

for (const row of rows) {
  const meta = { ...(row.meta || {}) }
  const marina = meta.base_port || row.location_name || ''
  if (!String(marina).trim()) continue

  const pin = applyYachtLocationToMeta(meta, marina)
  if (!pin) continue

  const prevPin = String(row.location_name || '').trim()
  const changed =
    pin !== prevPin ||
    meta.city !== row.meta?.city ||
    meta.district_label !== row.meta?.district_label ||
    meta.province_city !== row.meta?.province_city

  if (!changed) continue

  if (samples.length < 15) {
    samples.push({ slug: row.slug, before: prevPin || marina, after: pin })
  }

  if (dryRun) {
    updated++
    continue
  }

  await pg.query(`UPDATE listings SET location_name = $2, updated_at = now() WHERE id = $1::uuid`, [
    row.id,
    pin,
  ])
  await pg.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'listing_meta', 'v1', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = excluded.value_json`,
    [row.id, JSON.stringify(meta)],
  )
  updated++
}

await pg.end()
console.log(dryRun ? `[dry-run] would update ${updated} yacht listings` : `updated ${updated} yacht listings`)
for (const s of samples) console.log(`  ${s.slug}: "${s.before}" → "${s.after}"`)

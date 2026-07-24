#!/usr/bin/env node
/**
 * Bravo aktivite Türkçe karakter onarımı (?l?deniz → Ölüdeniz, Ka? → Kaş, …).
 *
 *   # JSON bundle düzelt
 *   node scripts/repair-bravo-turkish-encoding.mjs --json-only
 *
 *   # Üretim PG (bravo_event aktiviteleri)
 *   node scripts/repair-bravo-turkish-encoding.mjs
 *
 *   # SQL üret
 *   node scripts/repair-bravo-turkish-encoding.mjs --write-sql
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'
import { repairBravoTurkishAscii, repairBravoTurkishDeep } from './lib/bravo-turkish-ascii-repair.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const jsonPath = path.join(root, 'scripts/data/bravo-id-collision-repair.json')
const sqlPath = path.join(root, 'deploy/scripts/sql/fix-bravo-activity-turkish-chars.sql')

const JSON_ONLY = process.argv.includes('--json-only')
const WRITE_SQL = process.argv.includes('--write-sql')
const DRY_RUN = process.argv.includes('--dry-run')

function sqlStr(v) {
  return `'${String(v).replace(/'/g, "''")}'`
}

function repairJsonBundle() {
  const raw = fs.readFileSync(jsonPath, 'utf8')
  const data = JSON.parse(raw)
  const fixed = repairBravoTurkishDeep(data)
  fixed.turkishAsciiRepairedAt = new Date().toISOString()
  if (!DRY_RUN) {
    fs.writeFileSync(jsonPath, `${JSON.stringify(fixed, null, 2)}\n`)
  }
  let titleFixes = 0
  for (let i = 0; i < (data.events || []).length; i++) {
    if (data.events[i].title !== fixed.events[i].title) titleFixes++
  }
  console.log(`[json] title_fixes=${titleFixes} path=${jsonPath}${DRY_RUN ? ' (dry-run)' : ''}`)
  return fixed
}

async function repairPostgres(bundle) {
  const pg = createPgClient()
  await pg.connect()
  let updated = 0
  try {
    for (const event of bundle.events || []) {
      const ref = String(event.id)
      const title = repairBravoTurkishAscii(event.title || '')
      const content = repairBravoTurkishAscii(event.content || '')
      const address = repairBravoTurkishAscii(event.address || '')
      const locRow = (bundle.locations || []).find((l) => Number(l.id) === Number(event.location_id))
      const locName = repairBravoTurkishAscii(locRow?.name || '')
      const locationName = locName || address.split(',')[0]?.trim() || address

      if (DRY_RUN) {
        console.log(`[dry] ref=${ref} title=${title}`)
        updated++
        continue
      }

      const listing = await pg.query(
        `SELECT id::text FROM listings
         WHERE external_provider_code = 'bravo_event' AND external_listing_ref = $1
         LIMIT 1`,
        [ref],
      )
      if (!listing.rows[0]) continue
      const id = listing.rows[0].id

      await pg.query(
        `UPDATE listings SET
           location_name = CASE
             WHEN $2 <> '' THEN $2
             ELSE location_name
           END,
           updated_at = now()
         WHERE id = $1::uuid`,
        [id, locationName],
      )

      await pg.query(
        `UPDATE listing_translations lt
         SET title = $2,
             description = CASE
               WHEN $3 <> '' THEN $3
               ELSE lt.description
             END
         FROM locales lo
         WHERE lt.listing_id = $1::uuid
           AND lt.locale_id = lo.id
           AND lower(lo.code) = 'tr'`,
        [id, title, content],
      )

      await pg.query(
        `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
         VALUES ($1::uuid, 'listing_meta', 'v1', jsonb_build_object(
           'address', $2::text,
           'district_label', $3::text,
           'city', $3::text
         ))
         ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
           value_json = listing_attributes.value_json
             || jsonb_strip_nulls(jsonb_build_object(
               'address', NULLIF($2::text, ''),
               'district_label', NULLIF($3::text, ''),
               'city', NULLIF($3::text, '')
             ))`,
        [id, address, locationName],
      )
      updated++
      console.log(`[ok] ${event.slug || ref} → ${title}`)
    }
  } finally {
    await pg.end()
  }
  console.log(`[pg] updated=${updated}`)
}

function writeSql(bundle) {
  const lines = [
    '-- Bravo aktivite Türkçe karakter onarımı (? → Ö/ş/ğ/…)',
    '-- Üret: node scripts/repair-bravo-turkish-encoding.mjs --write-sql',
    '-- Uygula: ./deploy/apply-sql.sh deploy/scripts/sql/fix-bravo-activity-turkish-chars.sql',
    'BEGIN;',
  ]
  for (const event of bundle.events || []) {
    const ref = String(event.id)
    const title = repairBravoTurkishAscii(event.title || '')
    const content = repairBravoTurkishAscii(event.content || '')
    const address = repairBravoTurkishAscii(event.address || '')
    const locRow = (bundle.locations || []).find((l) => Number(l.id) === Number(event.location_id))
    const locName = repairBravoTurkishAscii(locRow?.name || '')
    const locationName = locName || address.split(',')[0]?.trim() || address
    const idSub = `(SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = ${sqlStr(ref)} LIMIT 1)`

    lines.push(`-- ${event.slug || ref}`)
    lines.push(`UPDATE listings SET
  location_name = ${sqlStr(locationName)},
  updated_at = now()
WHERE id = ${idSub};`)
    lines.push(`UPDATE listing_translations lt
SET title = ${sqlStr(title)},
    description = ${sqlStr(content)}
FROM locales lo
WHERE lt.listing_id = ${idSub}
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';`)
    lines.push(`INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT ${idSub}, 'listing_meta', 'v1', jsonb_build_object(
  'address', ${sqlStr(address)},
  'district_label', ${sqlStr(locationName)},
  'city', ${sqlStr(locationName)}
)
WHERE ${idSub} IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;`)
  }
  lines.push(`SELECT l.slug, lt.title, l.location_name
FROM listings l
JOIN listing_translations lt ON lt.listing_id = l.id
JOIN locales lo ON lo.id = lt.locale_id AND lower(lo.code) = 'tr'
WHERE l.external_provider_code = 'bravo_event'
  AND l.slug IN (
    'oludeniz-jet-ski-aktivitesi',
    'kas-scuba-diving',
    'kas-jeep-safari',
    'oludeniz-tekne-turu',
    'calis-aqua-park'
  )
ORDER BY l.slug;`)
  lines.push('COMMIT;', '')
  fs.writeFileSync(sqlPath, lines.join('\n'))
  console.log(`[sql] wrote ${sqlPath}`)
}

const bundle = repairJsonBundle()
if (WRITE_SQL || !JSON_ONLY) writeSql(bundle)
if (!JSON_ONLY && !WRITE_SQL) {
  // default: json already written; try PG if env present
  try {
    await repairPostgres(bundle)
  } catch (e) {
    console.warn(`[pg] skipped: ${e.message}`)
    console.warn('[pg] üretimde: ./deploy/scripts/fix-bravo-activity-turkish-chars.sh')
  }
} else if (WRITE_SQL && !JSON_ONLY) {
  /* sql only path already done */
}

#!/usr/bin/env node
/**
 * Bravo space kayitlarinin ayni sayisal dis kimlige sahip baska kategorilerle
 * karismasi sonucu bozulan ilanlari yeniden holiday_home olarak isaretler.
 * Galeri/fiyat/takvim onarimi ardindan import-bravo-spaces ile yapilir.
 *
 *   node scripts/repair-bravo-space-category-collisions.mjs --ids 28,29,30,31
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadBravoCollisionBundle } from './lib/bravo-collision-bundle.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const bundlePath = path.join(root, 'scripts', 'data', 'bravo-id-collision-repair.json')
const idsIndex = process.argv.indexOf('--ids')
const ids = new Set(
  (idsIndex >= 0 ? String(process.argv[idsIndex + 1] || '') : '')
    .split(',')
    .map((value) => Number(value.trim()))
    .filter(Number.isInteger),
)
const dryRun = process.argv.includes('--dry-run')
const organizationId = 'a0000000-0000-4000-8000-000000000001'

function normalized(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ')
}

if (!existsSync(bundlePath)) throw new Error(`Onarim paketi bulunamadi: ${bundlePath}`)
const bundle = await loadBravoCollisionBundle(bundlePath)
const spaces = bundle.spaces.filter((space) => !ids.size || ids.has(Number(space.id)))
if (!spaces.length) throw new Error('Onarilacak Bravo space kaydi bulunamadi.')

const pg = createPgClient()
await pg.connect()

try {
  const categoryResult = await pg.query(
    `SELECT id FROM product_categories WHERE code = 'holiday_home' LIMIT 1`,
  )
  const holidayHomeId = categoryResult.rows[0]?.id
  if (!holidayHomeId) throw new Error('holiday_home kategorisi bulunamadi.')

  const stats = { checked: 0, repaired: 0, canonical: 0, skipped: 0 }
  for (const space of spaces) {
    stats.checked++
    const canonical = await pg.query(
      `SELECT id::text FROM listings
       WHERE organization_id = $1::uuid
         AND category_id = $2
         AND external_provider_code = 'bravo_space'
         AND external_listing_ref = $3
       LIMIT 1`,
      [organizationId, holidayHomeId, String(space.id)],
    )
    if (canonical.rows[0]) {
      stats.canonical++
      console.log('OK canonical', space.id, space.slug)
      continue
    }

    const candidate = await pg.query(
      `SELECT l.id::text, pc.code AS category_code, l.external_provider_code,
              l.external_listing_ref, tr.title
       FROM listings l
       JOIN product_categories pc ON pc.id = l.category_id
       LEFT JOIN locales loc ON loc.code = 'tr'
       LEFT JOIN listing_translations tr ON tr.listing_id = l.id AND tr.locale_id = loc.id
       WHERE l.organization_id = $1::uuid AND l.slug = $2
       LIMIT 1`,
      [organizationId, space.slug],
    )
    const row = candidate.rows[0]
    const titleMatches = row && normalized(row.title) === normalized(space.title)
    if (!row || !titleMatches) {
      stats.skipped++
      console.log('SKIP guvenli eslesme yok', space.id, space.slug, row?.title || '-')
      continue
    }

    console.log(
      dryRun ? 'DRY repair' : 'REPAIR',
      space.id,
      space.slug,
      `${row.category_code}/${row.external_provider_code || '-'} -> holiday_home/bravo_space`,
    )
    if (dryRun) continue

    await pg.query('BEGIN')
    try {
      await pg.query(`DELETE FROM listing_yacht_details WHERE listing_id = $1::uuid`, [row.id])
      await pg.query(
        `UPDATE listings SET category_id = $2, external_provider_code = 'bravo_space',
           external_listing_ref = $3, updated_at = now()
         WHERE id = $1::uuid`,
        [row.id, holidayHomeId, String(space.id)],
      )
      await pg.query('COMMIT')
      stats.repaired++
    } catch (error) {
      await pg.query('ROLLBACK')
      throw error
    }
  }
  console.log(JSON.stringify(stats))
} finally {
  await pg.end()
}

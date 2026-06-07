/**
 * Motor yat — kaynakta banyo yoksa kabin sayısı kadar tahmini banyo (işaretli).
 * Yalnızca dış kaynaklardan bulunamayan ilanlar.
 *
 *   node scripts/backfill-motor-yacht-bath-estimate.mjs --dry-run
 */

import { createPgClient } from './lib/pg-client.mjs'
import { buildAkasiaCapacityLines } from './lib/akasia-api.mjs'

const DRY_RUN = process.argv.includes('--dry-run')

function parseIntMeta(raw) {
  const m = String(raw ?? '').match(/(\d+)/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function patchDescription(description, pax, cabinCount, bathCount) {
  const cap = buildAkasiaCapacityLines(pax, cabinCount, bathCount)
  const text = String(description || '')
  if (text.startsWith('Konaklama:')) {
    const rest = text.replace(/^Konaklama:[\s\S]*?\n\n/, '')
    return [...cap, rest].filter(Boolean).join('\n')
  }
  return [...cap, text].join('\n')
}

async function main() {
  const pg = createPgClient()
  await pg.connect()

  const { rows } = await pg.query(`
    SELECT l.id::text AS listing_id, l.slug, la.value_json AS meta, lt.description
    FROM listings l
    JOIN listing_attributes la ON la.listing_id = l.id
      AND la.group_code = 'listing_meta' AND la.key = 'v1'
    JOIN listing_attributes tip ON tip.listing_id = l.id AND tip.group_code = 'ilan_tipi'
      AND tip.key = 'motor_yat'
    LEFT JOIN listing_translations lt ON lt.listing_id = l.id
      AND lt.locale_id = (SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1)
    JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'yacht_charter'
    WHERE COALESCE(la.value_json->>'bath_count', '') = ''
      AND COALESCE(la.value_json->>'room_count', '') <> ''`)

  console.log(`Motor yat banyo tahmini — ${rows.length} ilan, dry-run=${DRY_RUN}`)

  let updated = 0
  for (const row of rows) {
    const meta = row.meta || {}
    const cabinCount = parseIntMeta(meta.room_count) ?? meta.cabin_count
    if (!cabinCount) continue
    const pax = parseIntMeta(meta.max_guests)
    const bathCount = cabinCount

    if (DRY_RUN) {
      console.log(`  [dry] ${row.slug} → ${bathCount} banyo (${cabinCount} kabin)`)
      continue
    }

    const newMeta = {
      ...meta,
      bath_count: String(bathCount),
      bath_inferred: 'motor_cabin_estimate',
    }
    const description = patchDescription(row.description, pax, cabinCount, bathCount)

    await pg.query(
      `UPDATE listing_attributes SET value_json = $2::jsonb
       WHERE listing_id = $1::uuid AND group_code = 'listing_meta' AND key = 'v1'`,
      [row.listing_id, JSON.stringify(newMeta)],
    )
    await pg.query(
      `UPDATE listing_translations SET description = $2
       WHERE listing_id = $1::uuid
         AND locale_id = (SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1)`,
      [row.listing_id, description || null],
    )
    console.log(`  ${row.slug} → ${bathCount} banyo`)
    updated += 1
  }

  await pg.end()
  console.log(`Bitti: güncellenen=${updated}`)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

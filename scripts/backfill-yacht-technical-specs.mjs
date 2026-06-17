/**
 * Yat ilanları — teknik özellikleri `vertical_yacht_extra` + vitrin için doldurur.
 *
 * Kaynak sırası: mevcut extra → listing_meta.specs → açıklama → listing_yacht_details → Baransen → yatreyonu.
 *
 *   node scripts/backfill-yacht-technical-specs.mjs --dry-run --limit 10
 *   node scripts/backfill-yacht-technical-specs.mjs
 *   node scripts/backfill-yacht-technical-specs.mjs --no-web
 *   node scripts/backfill-yacht-technical-specs.mjs --slug blue-bird
 */

import { fetchBoatDetail } from './lib/baransen-api.mjs'
import { createPgClient } from './lib/pg-client.mjs'
import { enrichFromYatreyonu } from './lib/yatreyonu-api.mjs'
import {
  buildYachtExtraFromTechnical,
  countCoreTechnicalFields,
  mergeTechnicalSpecs,
  missingCoreTechnicalFields,
  normalizeSpecsMap,
  parseDescriptionSpecsBlock,
  technicalSpecsFromBaransenDetail,
  technicalSpecsFromYatreyonuDetail,
  upsertVerticalYachtExtra,
} from './lib/yacht-technical-specs.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const NO_WEB = args.has('--no-web')
const FORCE = args.has('--force')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const slugIdx = process.argv.indexOf('--slug')
const SLUG_FILTER = slugIdx >= 0 ? process.argv[slugIdx + 1] : ''

function parseIntMeta(raw) {
  const m = String(raw ?? '').match(/(\d+)/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function layerFromListingRow(row, yachtRow) {
  const meta = row.meta || {}
  const port =
    meta.marina ||
    meta.base_port ||
    meta.port_name ||
    row.location_name ||
    null
  return mergeTechnicalSpecs(
    normalizeSpecsMap(meta.specs),
    parseDescriptionSpecsBlock(row.description),
    {
      port_name: port ? String(port).trim() : null,
      length_meters:
        yachtRow?.length_meters != null
          ? String(yachtRow.length_meters)
          : meta.length_m ?? meta.length_meters ?? null,
      cabin_count:
        yachtRow?.cabin_count != null
          ? String(yachtRow.cabin_count)
          : meta.room_count ?? meta.cabin_count ?? null,
      bathroom_count: meta.bath_count ?? null,
      passenger_count: meta.max_guests ?? null,
      yacht_type: row.property_type ? String(row.property_type).replace(/_/g, ' ') : null,
    },
  )
}

async function resolveBaransenLayer(row) {
  if (row.external_provider_code !== 'baransen' || !row.external_listing_ref) return {}
  try {
    const detail = await fetchBoatDetail(row.external_listing_ref)
    return technicalSpecsFromBaransenDetail({
      ...detail,
      propertyType: row.property_type,
      marina: row.meta?.marina,
      cabinCount: parseIntMeta(row.meta?.room_count),
      bathroomCount: parseIntMeta(row.meta?.bath_count),
      pax: parseIntMeta(row.meta?.max_guests),
    })
  } catch {
    return {}
  }
}

async function resolveWebLayer(row, currentExtra) {
  if (NO_WEB) return {}
  const missing = missingCoreTechnicalFields(currentExtra)
  if (!FORCE && missing.length <= 3) return {}
  try {
    const hit = await enrichFromYatreyonu(row.title, { slug: row.slug })
    if (!hit?.detail) return {}
    const fromWeb = technicalSpecsFromYatreyonuDetail(hit.detail)
    const fromWebDesc = parseDescriptionSpecsBlock(hit.detail.description)
    return mergeTechnicalSpecs(fromWeb, fromWebDesc)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`  [web] ${row.slug}: ${msg}`)
    return {}
  }
}

async function main() {
  const pg = createPgClient()
  await pg.connect()

  const { rows } = await pg.query(`
    SELECT l.id::text AS listing_id, l.slug, l.location_name, l.external_provider_code,
           l.external_listing_ref, la.value_json AS meta, lt.title, lt.description,
           tip.key AS property_type,
           ve.value_json AS yacht_extra,
           yd.length_meters, yd.cabin_count
    FROM listings l
    JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'yacht_charter'
    JOIN listing_attributes la ON la.listing_id = l.id
      AND la.group_code = 'listing_meta' AND la.key = 'v1'
    LEFT JOIN listing_attributes tip ON tip.listing_id = l.id AND tip.group_code = 'ilan_tipi'
    LEFT JOIN listing_attributes ve ON ve.listing_id = l.id
      AND ve.group_code = 'vertical_yacht_extra' AND ve.key = 'v1'
    LEFT JOIN listing_yacht_details yd ON yd.listing_id = l.id
    LEFT JOIN listing_translations lt ON lt.listing_id = l.id
      AND lt.locale_id = (SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1)
    ORDER BY l.slug`)

  let targets = rows
  if (SLUG_FILTER) {
    const needle = SLUG_FILTER.replace(/\*/g, '')
    targets = targets.filter((r) => r.slug.includes(needle))
  }
  if (!FORCE) {
    targets = targets.filter((r) => countCoreTechnicalFields(r.yacht_extra || {}) < 6)
  }
  if (LIMIT > 0) targets = targets.slice(0, LIMIT)

  console.log(
    `Yat teknik özellik backfill — ${targets.length} ilan, dry-run=${DRY_RUN}, web=${!NO_WEB}`,
  )

  let updated = 0
  let skipped = 0
  let errors = 0

  for (const row of targets) {
    process.stdout.write(`  ${row.slug} … `)
    try {
      const prevExtra = row.yacht_extra || {}
      const yachtRow = { length_meters: row.length_meters, cabin_count: row.cabin_count }
      const localLayer = layerFromListingRow(row, yachtRow)
      const baransenLayer = await resolveBaransenLayer(row)
      const draft = buildYachtExtraFromTechnical(
        mergeTechnicalSpecs(prevExtra, localLayer, baransenLayer),
        prevExtra,
      )
      const webLayer = await resolveWebLayer(row, draft)
      const next = buildYachtExtraFromTechnical(
        mergeTechnicalSpecs(localLayer, baransenLayer, webLayer),
        prevExtra,
      )

      const before = countCoreTechnicalFields(prevExtra)
      const after = countCoreTechnicalFields(next)
      const changed = JSON.stringify(prevExtra) !== JSON.stringify(next)

      if (!changed && after <= before) {
        console.log(`değişiklik yok (${after} alan)`)
        skipped += 1
        continue
      }

      if (DRY_RUN) {
        console.log(`[dry] ${before} → ${after} alan, eksik: ${missingCoreTechnicalFields(next).join(', ') || '—'}`)
        continue
      }

      await upsertVerticalYachtExtra(pg, row.listing_id, mergeTechnicalSpecs(localLayer, baransenLayer, webLayer))

      if (next.length_meters && !row.length_meters) {
        await pg.query(
          `INSERT INTO listing_yacht_details (listing_id, length_meters, theme_codes, rule_codes, ical_managed)
           VALUES ($1::uuid, $2::numeric, '{}', '{}', false)
           ON CONFLICT (listing_id) DO UPDATE SET
             length_meters = COALESCE(listing_yacht_details.length_meters, EXCLUDED.length_meters)`,
          [row.listing_id, next.length_meters],
        )
      }
      if (next.cabin_count && !row.cabin_count) {
        await pg.query(
          `INSERT INTO listing_yacht_details (listing_id, cabin_count, theme_codes, rule_codes, ical_managed)
           VALUES ($1::uuid, $2::smallint, '{}', '{}', false)
           ON CONFLICT (listing_id) DO UPDATE SET
             cabin_count = COALESCE(listing_yacht_details.cabin_count, EXCLUDED.cabin_count)`,
          [row.listing_id, next.cabin_count],
        )
      }

      console.log(`güncellendi (${before} → ${after})`)
      updated += 1
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`HATA: ${msg}`)
      errors += 1
    }
  }

  await pg.end()
  console.log(`Bitti — güncellenen: ${updated}, atlanan: ${skipped}, hata: ${errors}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

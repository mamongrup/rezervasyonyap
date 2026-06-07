/**
 * Akasia yat ilanları: misafir / kabin / banyo meta + açıklama güncelleme.
 *
 *   node scripts/backfill-akasia-capacity-meta.mjs
 *   node scripts/backfill-akasia-capacity-meta.mjs --refetch
 *   node scripts/backfill-akasia-capacity-meta.mjs --dry-run --limit 5
 */

import { createPgClient } from './lib/pg-client.mjs'
import {
  buildDescription,
  fetchYachtDetail,
  parseBathroomCountFromSpecs,
} from './lib/akasia-api.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const REFETCH = args.has('--refetch')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0

function parseIntField(raw) {
  const m = String(raw ?? '').match(/(\d+)/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function capacityFromSpecs(specs) {
  const pax =
    parseIntField(specs?.['Guest Capacity']) ||
    parseIntField(specs?.Pax) ||
    parseIntField(specs?.['Max Guests']) ||
    null
  const cabinCount =
    parseIntField(specs?.['Guest Cabins']) ||
    parseIntField(specs?.Cabins) ||
    parseIntField(specs?.['Number of Cabins']) ||
    null
  const bathroomCount = parseBathroomCountFromSpecs(specs ?? {})
  return { pax, cabinCount, bathroomCount, specs: specs ?? {} }
}

async function main() {
  const pg = createPgClient()
  await pg.connect()

  const { rows } = await pg.query(
    `SELECT l.id::text AS listing_id, l.external_listing_ref AS akasia_id, l.slug,
            la.value_json AS meta, lt.description
     FROM listings l
     JOIN listing_attributes la ON la.listing_id = l.id AND la.group_code = 'listing_meta' AND la.key = 'v1'
     LEFT JOIN listing_translations lt ON lt.listing_id = l.id
       AND lt.locale_id = (SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1)
     WHERE l.external_provider_code = 'akasia'
     ORDER BY l.slug`,
  )

  let targets = rows
  if (LIMIT > 0) targets = targets.slice(0, LIMIT)

  console.log(`Akasia kapasite backfill — ${targets.length} ilan, refetch=${REFETCH}, dry-run=${DRY_RUN}`)

  let updated = 0
  for (const row of targets) {
    let pax = null
    let cabinCount = null
    let bathroomCount = null
    let specs = row.meta?.specs ?? {}
    let rates = row.meta?.weekly_rates ?? []
    let description = row.description || ''

    if (REFETCH) {
      try {
        const detail = await fetchYachtDetail(row.akasia_id)
        pax = detail.pax
        cabinCount = detail.cabinCount
        bathroomCount = detail.bathroomCount
        specs = detail.specs
        rates = detail.rates
        description = detail.description
      } catch (e) {
        console.warn(`  [refetch fail] ${row.slug}: ${e.message}`)
        const fromMeta = capacityFromSpecs(specs)
        pax = fromMeta.pax
        cabinCount = fromMeta.cabinCount
        bathroomCount = fromMeta.bathroomCount
        description = buildDescription(row.meta?.title || row.slug, specs, rates, {
          pax,
          cabinCount,
          bathCount: bathroomCount,
        })
      }
    } else {
      const fromMeta = capacityFromSpecs(specs)
      pax = fromMeta.pax
      cabinCount = fromMeta.cabinCount
      bathroomCount = fromMeta.bathroomCount
      const title = row.slug.replace(/-ak-\d+$/, '').replace(/-/g, ' ')
      description = buildDescription(title, specs, rates, {
        pax,
        cabinCount,
        bathCount: bathroomCount,
      })
    }

    const meta = {
      ...(row.meta || {}),
      max_guests: pax != null ? String(pax) : '',
      room_count: cabinCount != null ? String(cabinCount) : '',
      bath_count: bathroomCount != null ? String(bathroomCount) : '',
      cabin_count: cabinCount,
      specs,
      weekly_rates: rates,
    }

    if (DRY_RUN) {
      console.log(
        `  [dry] ${row.slug} → ${pax ?? '-'} misafir, ${cabinCount ?? '-'} kabin, ${bathroomCount ?? '-'} banyo`,
      )
      continue
    }

    await pg.query(
      `UPDATE listing_attributes SET value_json = $2::jsonb
       WHERE listing_id = $1::uuid AND group_code = 'listing_meta' AND key = 'v1'`,
      [row.listing_id, JSON.stringify(meta)],
    )
    await pg.query(
      `UPDATE listing_translations SET description = $2
       WHERE listing_id = $1::uuid
         AND locale_id = (SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1)`,
      [row.listing_id, description || null],
    )
    await pg.query(
      `INSERT INTO listing_yacht_details (listing_id, length_meters, cabin_count, theme_codes, rule_codes, ical_managed)
       VALUES ($1::uuid, NULL, $2::smallint, '{}', '{}', false)
       ON CONFLICT (listing_id) DO UPDATE SET cabin_count = COALESCE($2::smallint, listing_yacht_details.cabin_count)`,
      [row.listing_id, cabinCount],
    )
    updated += 1
  }

  await pg.end()
  console.log(`Bitti: güncellenen=${updated}`)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

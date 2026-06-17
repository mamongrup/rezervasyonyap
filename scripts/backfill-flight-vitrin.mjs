/**
 * Mevcut Turna + Kplus uçuş ilanları — listing_meta uçuş vitrin alanlarını doldurur.
 *
 *   node scripts/backfill-flight-vitrin.mjs --dry-run --limit 20
 *   node scripts/backfill-flight-vitrin.mjs
 */

import { createPgClient } from './lib/pg-client.mjs'
import {
  extractKplusFlightVitrin,
  extractTurnaFlightVitrin,
  mergeListingMetaFlightFields,
} from './lib/flight-vitrin-meta.mjs'
import { extractMinPriceFromTurnaSearch } from './lib/turna-listing-db.mjs'
import { extractFlightMinPrice, normalizeFlightRow } from './lib/travelrobot-listing-db.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0

async function upsertMinPrice(pg, listingId, amount, currency = 'TRY') {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return
  await pg.query(`DELETE FROM listing_price_rules WHERE listing_id = $1::uuid`, [listingId])
  await pg.query(
    `INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
     VALUES ($1::uuid, $2::jsonb, NULL, NULL)`,
    [
      listingId,
      JSON.stringify({
        base_nightly: String(amount),
        base_price: String(amount),
        source: 'backfill',
        currency,
      }),
    ],
  )
}

async function main() {
  const pg = createPgClient()
  await pg.connect()

  const { rows } = await pg.query(`
    SELECT l.id::text AS listing_id, l.slug, l.external_provider_code,
           lm.value_json AS listing_meta,
           turna.value_json AS turna_snap,
           tr.value_json AS tr_snap,
           fl.from_stop, fl.to_stop
    FROM listings l
    JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'flight'
    LEFT JOIN listing_attributes lm ON lm.listing_id = l.id
      AND lm.group_code = 'listing_meta' AND lm.key = 'v1'
    LEFT JOIN listing_attributes turna ON turna.listing_id = l.id
      AND turna.group_code = 'turna' AND turna.key = 'snapshot'
    LEFT JOIN listing_attributes tr ON tr.listing_id = l.id
      AND tr.group_code = 'travelrobot' AND tr.key = 'snapshot'
    LEFT JOIN flight_legs fl ON fl.listing_id = l.id AND fl.mode = 'flight'
    ORDER BY l.slug`)

  let targets = rows.filter(
    (r) =>
      !r.listing_meta?.flight_airline_code ||
      !r.listing_meta?.flight_stop_count ||
      !r.listing_meta?.flight_provider,
  )
  if (LIMIT > 0) targets = targets.slice(0, LIMIT)

  console.log(`Uçuş vitrin backfill — ${targets.length} ilan, dry-run=${DRY_RUN}`)

  let updated = 0
  for (const row of targets) {
    process.stdout.write(`  ${row.slug} (${row.external_provider_code}) … `)
    let vitrin = {}
    let minPrice = null

    if (row.external_provider_code === 'turna' && row.turna_snap) {
      vitrin = extractTurnaFlightVitrin(row.turna_snap)
      minPrice = extractMinPriceFromTurnaSearch(row.turna_snap?.search ?? row.turna_snap)
    } else if (row.external_provider_code === 'travelrobot') {
      const catalog = row.tr_snap?.catalog ?? row.tr_snap ?? {}
      vitrin = extractKplusFlightVitrin(normalizeFlightRow(catalog))
      minPrice = extractFlightMinPrice(catalog)
    }

    if (!Object.keys(vitrin).length) {
      console.log('kaynak yok')
      continue
    }

    if (DRY_RUN) {
      console.log(`[dry] ${JSON.stringify(vitrin)} fiyat=${minPrice ?? '-'}`)
      continue
    }

    await mergeListingMetaFlightFields(pg, row.listing_id, vitrin)
    if (minPrice != null) await upsertMinPrice(pg, row.listing_id, minPrice)
    console.log('ok')
    updated += 1
  }

  await pg.end()
  console.log(`Bitti — güncellenen: ${updated}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

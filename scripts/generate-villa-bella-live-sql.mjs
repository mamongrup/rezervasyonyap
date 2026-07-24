#!/usr/bin/env node
/**
 * Birvillas canlı veriden deploy/scripts/sql/update-villa-bella-live.sql üretir.
 *   node scripts/generate-villa-bella-live-sql.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BELLA_VILLAS, buildBellaVillaPackage } from './lib/villa-bella-collection.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.resolve(__dirname, '../deploy/scripts/sql/update-villa-bella-live.sql')

function sqlStr(v) {
  if (v == null || v === '') return 'NULL'
  return `'${String(v).replace(/'/g, "''")}'`
}

function listingSubquery(villa) {
  return `(SELECT id FROM listings WHERE (external_provider_code = 'birvillas' AND external_listing_ref = ${sqlStr(villa.externalRef)}) OR slug = ${sqlStr(villa.slug)} LIMIT 1)`
}

function ruleJson(band) {
  return JSON.stringify({
    base_nightly: String(band.baseNightly),
    weekly_total: String(Math.round(Number(band.baseNightly) * 7)),
    weekend_nightly: '',
    label: band.label || '',
    min_nights: String(band.minNights || 3),
  })
}

const parts = [
  '-- Villa Bella 1-5 canlı fiyat/müsaitlik/özellik güncellemesi (Birvillas)',
  '-- Üret: node scripts/generate-villa-bella-live-sql.mjs',
  '-- Uygula: ./deploy/apply-sql.sh deploy/scripts/sql/update-villa-bella-live.sql',
  'BEGIN;',
]

for (const villa of BELLA_VILLAS) {
  const { live, pkg } = await buildBellaVillaPackage(villa, {
    requireLive: true,
    resolveAmenities: false,
  })
  if (!live) throw new Error(`live_missing:${villa.slug}`)
  const id = listingSubquery(villa)
  parts.push(`-- ${villa.slug}`)
  parts.push(`UPDATE listings SET
    currency_code = ${sqlStr(pkg.currency || 'TRY')},
    min_stay_nights = ${pkg.minStayNights == null ? 'NULL' : Number(pkg.minStayNights)},
    vitrin_price = ${pkg.vitrinPrice == null ? 'NULL' : Number(pkg.vitrinPrice)},
    first_charge_amount = COALESCE(${pkg.damageDeposit == null ? 'NULL' : Number(pkg.damageDeposit)}, first_charge_amount),
    map_lat = ${sqlStr(pkg.mapLat)},
    map_lng = ${sqlStr(pkg.mapLng)},
    location_name = ${sqlStr(pkg.locationName)},
    ministry_license_ref = COALESCE(${sqlStr(pkg.tourismCertNo)}, ministry_license_ref),
    updated_at = now()
  WHERE id = ${id};`)

  parts.push(`DELETE FROM listing_price_rules WHERE listing_id = ${id};`)
  for (const band of pkg.seasonalPrices || []) {
    parts.push(`INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
      VALUES (${id}, ${sqlStr(ruleJson(band))}::jsonb, ${sqlStr(band.from)}::date, ${sqlStr(band.to)}::date);`)
  }

  parts.push(`DELETE FROM listing_availability_calendar WHERE listing_id = ${id};`)
  const days = pkg.calendarDays || []
  if (days.length) {
    const values = days.map((d) => {
      const avail = d.is_available !== false
      const price = d.price_override != null && d.price_override !== '' ? sqlStr(String(d.price_override)) : 'NULL'
      return `(${id}, ${sqlStr(d.day)}::date, ${avail}, ${avail}, ${avail}, ${price})`
    })
    // chunk inserts to keep statements readable
    const chunk = 40
    for (let i = 0; i < values.length; i += chunk) {
      parts.push(
        `INSERT INTO listing_availability_calendar (listing_id, day, is_available, am_available, pm_available, price_override) VALUES\n${values.slice(i, i + chunk).join(',\n')};`,
      )
    }
  }

  if (pkg.themeCodes?.length) {
    parts.push(`INSERT INTO listing_holiday_home_details (listing_id, theme_codes, rule_codes, ical_managed)
SELECT ${id}, ARRAY[${pkg.themeCodes.map(sqlStr).join(',')}]::text[], ARRAY[${(pkg.ruleCodes || []).map(sqlStr).join(',')}]::text[], false
WHERE ${id} IS NOT NULL
ON CONFLICT (listing_id) DO UPDATE SET
  theme_codes = EXCLUDED.theme_codes,
  rule_codes = EXCLUDED.rule_codes;`)
  }

  const meta = pkg.meta || {}
  parts.push(`INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT ${id}, 'listing_meta', 'v1', jsonb_build_object(
  'district_label', ${sqlStr(meta.district_label || 'İslamlar')},
  'city', ${sqlStr(meta.city || 'Kaş')},
  'province_city', ${sqlStr(meta.province_city || 'Antalya')},
  'region_display', ${sqlStr(meta.region_display || 'İslamlar, Kaş')},
  'address', ${sqlStr(meta.address || 'İslamlar, Kaş, Antalya, Türkiye')},
  'property_type', 'villa',
  'max_guests', ${sqlStr(String(villa.guests))},
  'room_count', ${sqlStr(String(villa.bedrooms))},
  'bed_count', ${sqlStr(String(villa.bedrooms))},
  'bath_count', ${sqlStr(String(villa.bathrooms))}
)
WHERE ${id} IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;`)

  console.log(`[ok] ${villa.slug} vitrin=${pkg.vitrinPrice} bands=${(pkg.seasonalPrices || []).length} days=${days.length}`)
}

parts.push(`SELECT refresh_listing_vitrin_prices();`)
parts.push(`SELECT l.slug, l.vitrin_price::text AS vitrin_price,
  (SELECT count(*) FROM listing_price_rules pr WHERE pr.listing_id = l.id) AS price_bands,
  (SELECT count(*) FROM listing_availability_calendar c WHERE c.listing_id = l.id) AS calendar_days
FROM listings l
WHERE l.slug LIKE 'villa-bella-%islamlar'
ORDER BY l.slug;`)
parts.push('COMMIT;')
parts.push('')

fs.writeFileSync(outPath, parts.join('\n'))
console.log(`[wrote] ${outPath}`)

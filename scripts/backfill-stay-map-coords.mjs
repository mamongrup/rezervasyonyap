/**
 * Villa / yat ilanlarına `listings.map_lat` / `map_lng` yazar.
 *
 *   node scripts/backfill-stay-map-coords.mjs --dry-run
 *   node scripts/backfill-stay-map-coords.mjs
 *   node scripts/backfill-stay-map-coords.mjs --only yacht
 */
import { createPgClient } from './lib/pg-client.mjs'
import { loadDistrictCoords, resolveStayMapCoords } from './lib/stay-location-coords.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const FORCE = args.has('--force')
const onlyIdx = process.argv.indexOf('--only')
const ONLY = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : 'all'
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0

async function main() {
  const categoryFilter =
    ONLY === 'yacht'
      ? `pc.code = 'yacht_charter'`
      : ONLY === 'villa'
        ? `pc.code = 'holiday_home'`
        : `pc.code IN ('holiday_home', 'yacht_charter')`

  const missingFilter = FORCE
    ? 'TRUE'
    : `(l.map_lat IS NULL OR l.map_lng IS NULL OR trim(l.map_lat::text) = '' OR trim(l.map_lng::text) = '')`

  const client = createPgClient()
  await client.connect()

  try {
    const districtMap = await loadDistrictCoords(client)
    const limitClause = LIMIT > 0 ? `LIMIT ${LIMIT}` : ''

    const { rows } = await client.query(
      `
      SELECT
        l.id::text,
        l.slug,
        pc.code AS category_code,
        l.location_name,
        l.map_lat,
        l.map_lng,
        y.port_lat::text,
        y.port_lng::text,
        lm.value_json AS meta_json
      FROM listings l
      JOIN product_categories pc ON pc.id = l.category_id
      LEFT JOIN listing_yacht_details y ON y.listing_id = l.id
      LEFT JOIN listing_attributes lm ON lm.listing_id = l.id
        AND lm.group_code = 'listing_meta' AND lm.key = 'v1'
      WHERE l.status = 'published'
        AND ${categoryFilter}
        AND ${missingFilter}
      ORDER BY pc.code, l.slug
      ${limitClause}
    `,
    )

    console.log(
      `Hedef: ${rows.length} ilan${DRY_RUN ? ' (dry-run)' : ''}${FORCE ? ' (force)' : ''} [${ONLY}]`,
    )

    let updated = 0
    let noMatch = 0
    const bySource = {}

    for (const row of rows) {
      const coords = resolveStayMapCoords(row, districtMap)
      if (!coords) {
        noMatch++
        if (noMatch <= 8) {
          console.log(`  [no-match] ${row.slug} — "${row.location_name ?? ''}"`)
        }
        continue
      }

      bySource[coords.source] = (bySource[coords.source] ?? 0) + 1

      if (!DRY_RUN) {
        await client.query(
          `UPDATE listings
           SET map_lat = $2, map_lng = $3, updated_at = now()
           WHERE id = $1::uuid`,
          [row.id, coords.lat, coords.lng],
        )
        if (row.meta_json && (row.meta_json.lat == null || row.meta_json.lng == null)) {
          const next = { ...row.meta_json, lat: String(coords.lat), lng: String(coords.lng) }
          await client.query(
            `UPDATE listing_attributes
             SET value_json = $2::jsonb
             WHERE listing_id = $1::uuid
               AND group_code = 'listing_meta' AND key = 'v1'`,
            [row.id, JSON.stringify(next)],
          )
        }
      }

      updated++
      if (updated <= 15 || updated % 200 === 0) {
        console.log(
          `  [${updated}] ${row.slug} → ${coords.lat}, ${coords.lng} (${coords.source})`,
        )
      }
    }

    console.log(`Özet: güncellenen=${updated}, eşleşmeyen=${noMatch}`)
    console.log('Kaynak:', bySource)
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

/**
 * Casapunto Villa — manuel sezon gecelik fiyatları (2026).
 *
 *   node scripts/set-casapunto-seasonal-prices.mjs
 *   node scripts/set-casapunto-seasonal-prices.mjs --dry-run
 */
import { createPgClient } from './lib/pg-client.mjs'
import { buildSeasonalRuleJson } from './lib/bravo-seasonal-prices.mjs'

const DRY_RUN = process.argv.includes('--dry-run')
const SLUG = 'casapunto-villa'
const YEAR = 2026
const MIN_STAY = 5

/** @type {{ from: string, to: string, price: number, label: string }[]} */
const BANDS = [
  { from: `${YEAR}-07-01`, to: `${YEAR}-07-31`, price: 39750, label: 'Temmuz' },
  { from: `${YEAR}-08-01`, to: `${YEAR}-08-31`, price: 48750, label: 'Ağustos' },
  { from: `${YEAR}-09-01`, to: `${YEAR}-09-30`, price: 39750, label: 'Eylül' },
  { from: `${YEAR}-10-01`, to: `${YEAR}-10-31`, price: 27500, label: 'Ekim' },
]

const minPrice = Math.min(...BANDS.map((b) => b.price))
const maxPrice = Math.max(...BANDS.map((b) => b.price))

console.log(
  JSON.stringify(
    {
      slug: SLUG,
      bands: BANDS,
      minPrice,
      maxPrice,
      minStayNights: MIN_STAY,
      dryRun: DRY_RUN,
    },
    null,
    2,
  ),
)

if (DRY_RUN) process.exit(0)

const pg = createPgClient()
await pg.connect()
try {
  const listing = await pg.query(`SELECT id::text, slug FROM listings WHERE slug = $1 LIMIT 1`, [SLUG])
  const row = listing.rows[0]
  if (!row) throw new Error(`İlan bulunamadı slug=${SLUG}`)

  await pg.query('BEGIN')
  try {
    await pg.query(`DELETE FROM listing_price_rules WHERE listing_id = $1::uuid`, [row.id])
    for (const [i, band] of BANDS.entries()) {
      const ruleJson = buildSeasonalRuleJson(
        { price: band.price, from: band.from, to: band.to },
        { minNights: i === 0 ? String(MIN_STAY) : '', label: band.label },
      )
      await pg.query(
        `INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
         VALUES ($1::uuid, $2::jsonb, $3::date, $4::date)`,
        [row.id, JSON.stringify(ruleJson), band.from, band.to],
      )
    }

    await pg.query(
      `UPDATE listings SET
         currency_code = 'TRY',
         min_stay_nights = $2,
         vitrin_price = $3,
         updated_at = now()
       WHERE id = $1::uuid`,
      [row.id, MIN_STAY, minPrice],
    )

    await pg.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, 'listing_meta', 'v1', $2::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
         value_json = COALESCE(listing_attributes.value_json, '{}'::jsonb) || EXCLUDED.value_json`,
      [
        row.id,
        JSON.stringify({
          price_min: String(minPrice),
          price_max: String(maxPrice),
          price_source: 'manual_seasonal_2026',
        }),
      ],
    )

    await pg.query('COMMIT')
  } catch (e) {
    await pg.query('ROLLBACK')
    throw e
  }

  await pg.query('SELECT refresh_listing_vitrin_prices()').catch(() => {})
  await pg.query(`UPDATE listings SET vitrin_price = $2, updated_at = now() WHERE id = $1::uuid`, [
    row.id,
    minPrice,
  ])

  console.log(
    JSON.stringify(
      {
        action: 'updated',
        listingId: row.id,
        slug: row.slug,
        priceBands: BANDS.length,
        vitrinPrice: minPrice,
        minStayNights: MIN_STAY,
      },
      null,
      2,
    ),
  )
} finally {
  await pg.end()
}

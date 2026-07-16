/**
 * Villasepeti fiyat + takvim → mevcut tatil evi ilanı.
 *
 *   node scripts/sync-villasepeti-listing-prices.mjs \
 *     --url https://www.villasepeti.com/home/fethiye/villa-casablanca \
 *     --slug casablanca-villa
 *
 *   node scripts/sync-villasepeti-listing-prices.mjs --url ... --slug ... --dry-run
 */
import { createPgClient } from './lib/pg-client.mjs'
import { scrapeVillasepetiListing, seasonalRulesForDb } from './lib/villasepeti-scrape.mjs'
import { upsertAvailabilityCalendar } from './lib/akdenizvillam-calendar.mjs'

const argv = process.argv.slice(2)
const valueAfter = (flag) => {
  const i = argv.indexOf(flag)
  return i >= 0 ? argv[i + 1] : undefined
}
const DRY_RUN = argv.includes('--dry-run')
const URL = valueAfter('--url') || process.env.VILLASEPETI_URL || ''
const SLUG = valueAfter('--slug') || process.env.LISTING_SLUG || ''
const EXTERNAL_REF = valueAfter('--external-ref') || ''

if (!URL || !SLUG) {
  console.error(
    'Kullanım: node scripts/sync-villasepeti-listing-prices.mjs --url <villasepeti-url> --slug <listing-slug>',
  )
  process.exit(1)
}

async function resolveListingId(pg) {
  if (EXTERNAL_REF) {
    const r = await pg.query(
      `SELECT id::text, slug FROM listings
       WHERE external_listing_ref = $1 OR slug = $2
       ORDER BY CASE WHEN slug = $2 THEN 0 ELSE 1 END
       LIMIT 1`,
      [EXTERNAL_REF, SLUG],
    )
    return r.rows[0] || null
  }
  const r = await pg.query(`SELECT id::text, slug FROM listings WHERE slug = $1 LIMIT 1`, [SLUG])
  return r.rows[0] || null
}

async function applyPricing(pg, listingId, pkg) {
  await pg.query('BEGIN')
  try {
    await pg.query(`DELETE FROM listing_price_rules WHERE listing_id = $1::uuid`, [listingId])
    for (const band of seasonalRulesForDb(pkg)) {
      await pg.query(
        `INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
         VALUES ($1::uuid, $2::jsonb, $3::date, $4::date)`,
        [listingId, JSON.stringify(band.ruleJson), band.from, band.to],
      )
    }

    const calendar = await upsertAvailabilityCalendar(pg, listingId, pkg.calendarDays)

    await pg.query(
      `UPDATE listings SET
         currency_code = 'TRY',
         min_stay_nights = $2,
         vitrin_price = $3,
         first_charge_amount = $4,
         ministry_license_ref = COALESCE(NULLIF($5, ''), ministry_license_ref),
         updated_at = now()
       WHERE id = $1::uuid`,
      [
        listingId,
        pkg.minStayNights || 3,
        pkg.minPrice,
        pkg.deposit,
        pkg.ministryLicense || '',
      ],
    )

    // meta: depozito + kaynak
    await pg.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, 'listing_meta', 'v1', $2::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
         value_json = COALESCE(listing_attributes.value_json, '{}'::jsonb) || EXCLUDED.value_json`,
      [
        listingId,
        JSON.stringify({
          damage_deposit: String(pkg.deposit || ''),
          source_url_villasepeti: pkg.sourceUrl,
          villasepeti_home_id: pkg.homeId,
          price_min: String(pkg.minPrice || ''),
          price_max: String(pkg.maxPrice || ''),
        }),
      ],
    )

    await pg.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, 'villasepeti', 'snapshot', $2::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
      [
        listingId,
        JSON.stringify({
          source_url: pkg.sourceUrl,
          home_id: pkg.homeId,
          synced_at: new Date().toISOString(),
          available_count: pkg.availableCount,
          blocked_count: pkg.blockedCount,
          min_price: pkg.minPrice,
          max_price: pkg.maxPrice,
          deposit: pkg.deposit,
          min_stay_nights: pkg.minStayNights,
          reservation_rules: pkg.reservationRules,
        }),
      ],
    )

    await pg.query('COMMIT')
    return calendar
  } catch (e) {
    await pg.query('ROLLBACK')
    throw e
  }
}

const pkg = await scrapeVillasepetiListing(URL)
console.log(
  JSON.stringify(
    {
      sourceUrl: pkg.sourceUrl,
      homeId: pkg.homeId,
      deposit: pkg.deposit,
      ministryLicense: pkg.ministryLicense,
      minStayNights: pkg.minStayNights,
      minPrice: pkg.minPrice,
      maxPrice: pkg.maxPrice,
      bands: pkg.seasonalPrices.length,
      available: pkg.availableCount,
      blocked: pkg.blockedCount,
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
  const listing = await resolveListingId(pg)
  if (!listing) throw new Error(`İlan bulunamadı slug=${SLUG}`)
  const calendar = await applyPricing(pg, listing.id, pkg)
  await pg.query('SELECT refresh_listing_vitrin_prices()').catch(() => {})
  // refresh depozitoyu vitrine yazmasın — min nightly kalsın
  await pg.query(
    `UPDATE listings SET vitrin_price = $2, updated_at = now() WHERE id = $1::uuid`,
    [listing.id, pkg.minPrice],
  )
  console.log(
    JSON.stringify(
      {
        action: 'updated',
        listingId: listing.id,
        slug: listing.slug,
        priceBands: pkg.seasonalPrices.length,
        calendarDays: calendar.days,
        calendarBlocked: calendar.blocked,
        vitrinPrice: pkg.minPrice,
        deposit: pkg.deposit,
      },
      null,
      2,
    ),
  )
} finally {
  await pg.end()
}

/**
 * Villa (holiday_home) ve yat (yacht_charter) ilanlarına onaylı demo yorumlar ekler.
 *
 * Kullanım:
 *   node scripts/seed-villa-yacht-reviews.mjs
 *   node scripts/seed-villa-yacht-reviews.mjs --dry-run
 *   node scripts/seed-villa-yacht-reviews.mjs --force
 *   node scripts/seed-villa-yacht-reviews.mjs --only yacht --limit 5
 */
import { createPgClient } from './lib/pg-client.mjs'
import {
  buildReviewsForListing,
  reviewCountForListingIndex,
} from './lib/villa-yacht-review-templates.mjs'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
const onlyIdx = args.indexOf('--only')
const only = onlyIdx >= 0 ? args[onlyIdx + 1] : 'all'
const limitIdx = args.indexOf('--limit')
const limit = limitIdx >= 0 ? Math.max(1, parseInt(args[limitIdx + 1], 10) || 0) : 0

const LISTINGS_SQL = `
  SELECT
    l.id::text AS id,
    l.slug,
    coalesce(lt.title, l.slug) AS title,
    pc.code AS category_code,
    coalesce(l.vitrin_price, l.first_charge_amount, 0)::numeric AS price_from,
    coalesce(nullif(trim(lm.value_json->>'bed_count'), ''), '') AS bed_count,
    coalesce(nullif(trim(lm.value_json->>'property_type'), ''), 'villa') AS property_type,
    coalesce(array_to_string(h.theme_codes, ','), '') AS theme_codes,
    coalesce(y.cabin_count::text, '') AS cabin_count,
    (
      SELECT count(*)::int
      FROM reviews r
      WHERE r.entity_type = 'listing'
        AND r.entity_id = l.id
        AND r.status = 'approved'
    ) AS existing_reviews
  FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id
  LEFT JOIN listing_translations lt ON lt.listing_id = l.id
    AND lt.locale_id = (SELECT id FROM locales WHERE lower(code) = 'tr' AND coalesce(is_active, true) LIMIT 1)
  LEFT JOIN listing_attributes lm ON lm.listing_id = l.id
    AND lm.group_code = 'listing_meta' AND lm.key = 'v1'
  LEFT JOIN listing_holiday_home_details h ON h.listing_id = l.id
  LEFT JOIN listing_yacht_details y ON y.listing_id = l.id
  WHERE l.status = 'published'
    AND (
      (pc.code = 'yacht_charter' AND ($1::text IN ('all', 'yacht')))
      OR (
        pc.code = 'holiday_home'
        AND ($1::text IN ('all', 'villa'))
        AND lower(coalesce(lm.value_json->>'property_type', 'villa')) IN ('villa', '')
      )
    )
  ORDER BY pc.code, l.created_at, l.id
`

const userCache = new Map()

async function ensureGuestUser(client, displayName) {
  const key = displayName.trim()
  if (userCache.has(key)) return userCache.get(key)

  const email = `review-seed-${Buffer.from(key).toString('hex').slice(0, 24)}@seed.local`
  const existing = await client.query(
    `SELECT id::text FROM users WHERE email = $1 LIMIT 1`,
    [email],
  )
  if (existing.rows[0]?.id) {
    userCache.set(key, existing.rows[0].id)
    return existing.rows[0].id
  }

  const ins = await client.query(
    `INSERT INTO users (email, display_name, is_guest)
     VALUES ($1, $2, true)
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING id::text`,
    [email, key],
  )
  const id = ins.rows[0].id
  userCache.set(key, id)
  return id
}

async function refreshReviewAvgs(client, listingIds) {
  if (listingIds.length === 0) return
  await client.query(
    `UPDATE listings l
     SET review_avg = sub.avg
     FROM (
       SELECT entity_id::uuid AS listing_id, round(avg(rating)::numeric, 2) AS avg
       FROM reviews
       WHERE entity_type = 'listing'
         AND status = 'approved'
         AND entity_id = ANY($1::uuid[])
       GROUP BY entity_id
     ) sub
     WHERE l.id = sub.listing_id`,
    [listingIds],
  )
}

async function main() {
  const onlyParam =
    only === 'yacht' ? 'yacht' : only === 'villa' ? 'villa' : 'all'

  const client = createPgClient()
  await client.connect()

  try {
    const { rows } = await client.query(LISTINGS_SQL, [onlyParam])
    const targets = limit > 0 ? rows.slice(0, limit) : rows

    console.log(
      `Hedef ilan: ${targets.length} (toplam uygun: ${rows.length})` +
        (dryRun ? ' [dry-run]' : '') +
        (force ? ' [force]' : ''),
    )

    let inserted = 0
    let skipped = 0
    const touchedIds = []

    for (let i = 0; i < targets.length; i++) {
      const listing = targets[i]
      if (!force && listing.existing_reviews > 0) {
        skipped++
        continue
      }

      const count = reviewCountForListingIndex(i)
      const reviews = buildReviewsForListing(listing, count)

      if (dryRun) {
        console.log(
          `- ${listing.category_code} | ${listing.title?.slice(0, 50)} | ${count} yorum`,
        )
        continue
      }

      if (force && listing.existing_reviews > 0) {
        await client.query(
          `DELETE FROM reviews
           WHERE entity_type = 'listing' AND entity_id = $1::uuid`,
          [listing.id],
        )
      }

      for (const rev of reviews) {
        const userId = await ensureGuestUser(client, rev.reviewerName)
        await client.query(
          `INSERT INTO reviews (
             entity_type, entity_id, user_id, rating, title, body,
             status, has_verified_purchase, created_at
           ) VALUES (
             'listing', $1::uuid, $2::uuid, $3::smallint, $4, $5,
             'approved', $6, $7::timestamptz
           )`,
          [
            listing.id,
            userId,
            rev.rating,
            rev.title,
            rev.body,
            rev.hasVerifiedPurchase,
            rev.createdAt,
          ],
        )
        inserted++
      }
      touchedIds.push(listing.id)
    }

    if (!dryRun && touchedIds.length > 0) {
      await refreshReviewAvgs(client, touchedIds)
    }

    console.log(
      dryRun
        ? 'Dry-run tamamlandı.'
        : `Tamamlandı: ${inserted} yorum, ${touchedIds.length} ilan güncellendi, ${skipped} ilan atlandı (mevcut yorum).`,
    )
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

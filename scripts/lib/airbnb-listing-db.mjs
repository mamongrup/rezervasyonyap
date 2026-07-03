import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './pg-client.mjs'
import { resolveImportContext } from './gtc-listing-db.mjs'
import { applyBravoHolidayHomeVitrinFields } from './bravo-holiday-home-map.mjs'
import { applyListingPropertyType } from './bravo-property-type.mjs'
import { downloadGalleryImages } from './wtatil-image-download.mjs'
import { HOLIDAY_HOME_RULE_CODE_TO_ACCOMMODATION_ID } from './bravo-holiday-home-map.mjs'

const PROVIDER = 'airbnb'
const DEFAULT_ORG = 'a0000000-0000-4000-8000-000000000001'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'frontend', 'public', 'uploads', 'listings')

function mapRuleCodesToAccommodationIds(ruleCodes = []) {
  const ids = []
  const seen = new Set()
  for (const code of ruleCodes) {
    const id = HOLIDAY_HOME_RULE_CODE_TO_ACCOMMODATION_ID[String(code).trim()]
    if (id && !seen.has(id)) {
      seen.add(id)
      ids.push(id)
    }
  }
  return ids
}

async function findListingId(pgClient, orgId, externalRef, slug) {
  const r = await pgClient.query(
    `SELECT id::text FROM listings
     WHERE (external_provider_code = $1 AND external_listing_ref = $2)
        OR slug = $3
     LIMIT 1`,
    [PROVIDER, String(externalRef), slug],
  )
  return r.rows[0]?.id || null
}

async function upsertImages(pgClient, listingId, slug, galleryUrls, { skipImages = false } = {}) {
  if (skipImages || !galleryUrls?.length) return 0
  await pgClient.query(`DELETE FROM listing_images WHERE listing_id = $1::uuid`, [listingId])
  const rows = await downloadGalleryImages(galleryUrls, slug, UPLOADS_ROOT, {
    categoryCode: 'holiday_home',
    skipImages: false,
  })
  for (const row of rows) {
    await pgClient.query(
      `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime)
       VALUES ($1::uuid, $2, $3, 'image/avif')`,
      [listingId, row.sort, row.storageKey],
    )
  }
  const hero = rows[0]?.storageKey
  if (hero) {
    const publicPath = `/${hero}`
    await pgClient.query(
      `UPDATE listings SET featured_image_url = $2, thumbnail_url = $2, updated_at = now() WHERE id = $1::uuid`,
      [listingId, publicPath],
    )
  }
  return rows.length
}

async function upsertAmenities(pgClient, listingId, amenities = []) {
  for (const name of amenities) {
    const key = String(name)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80)
    if (!key) continue
    await pgClient.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, 'imported_amenity', $2, $3::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = excluded.value_json`,
      [listingId, key, JSON.stringify({ label: name, enabled: true })],
    )
  }
}

async function upsertThemes(pgClient, listingId, themeCodes = []) {
  for (const code of themeCodes) {
    await pgClient.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, 'tema', $2, 'true'::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = excluded.value_json`,
      [listingId, code],
    )
  }
}

export async function upsertAirbnbListing(
  pgClient,
  ctx,
  pkg,
  { status = 'published', dryRun = false, skipImages = false, updateExisting = true } = {},
) {
  const slug = pkg.slug
  const externalRef = String(pkg.externalRef)
  let listingId = await findListingId(pgClient, ctx.orgId, externalRef, slug)
  const isNew = !listingId

  if (!isNew && !updateExisting) {
    return { action: 'skipped', listingId, slug, externalRef }
  }

  if (dryRun) {
    return {
      action: isNew ? 'would_create' : 'would_update',
      listingId,
      slug,
      externalRef,
      imageCount: pkg.galleryUrls?.length || 0,
      dryRun: true,
      title: pkg.title,
    }
  }

  await pgClient.query('BEGIN')
  try {
    if (listingId) {
      await pgClient.query(
        `UPDATE listings SET
           slug = $2, status = $3, currency_code = $4,
           min_stay_nights = $5, map_lat = $6, map_lng = $7,
           location_name = $8, external_provider_code = $9,
           external_listing_ref = $10, listing_source = 'api',
           vitrin_price = $11, first_charge_amount = $12,
           cleaning_fee_amount = $13, share_to_social = true,
           updated_at = now()
         WHERE id = $1::uuid`,
        [
          listingId,
          slug,
          status,
          pkg.currency || 'TRY',
          pkg.minStayNights || 5,
          pkg.mapLat || null,
          pkg.mapLng || null,
          pkg.locationName || '',
          PROVIDER,
          externalRef,
          pkg.vitrinPrice || null,
          pkg.damageDeposit || null,
          pkg.cleaningFee || null,
        ],
      )
    } else {
      const ins = await pgClient.query(
        `INSERT INTO listings (
           organization_id, category_id, slug, status, currency_code,
           min_stay_nights, map_lat, map_lng, location_name,
           external_provider_code, external_listing_ref, listing_source,
           vitrin_price, first_charge_amount, cleaning_fee_amount, share_to_social
         ) VALUES (
           $1::uuid, $2, $3, $4, $5,
           $6, $7, $8, $9,
           $10, $11, 'api',
           $12, $13, $14, true
         ) RETURNING id::text`,
        [
          ctx.orgId,
          ctx.categoryId,
          slug,
          status,
          pkg.currency || 'TRY',
          pkg.minStayNights || 5,
          pkg.mapLat || null,
          pkg.mapLng || null,
          pkg.locationName || '',
          PROVIDER,
          externalRef,
          pkg.vitrinPrice || null,
          pkg.damageDeposit || null,
          pkg.cleaningFee || null,
        ],
      )
      listingId = ins.rows[0].id
    }

    await pgClient.query(
      `INSERT INTO listing_translations (listing_id, locale_id, title, description)
       VALUES ($1::uuid, $2, $3, $4)
       ON CONFLICT (listing_id, locale_id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description`,
      [listingId, ctx.localeTrId, pkg.title, pkg.description || pkg.shortDescription || ''],
    )

    await applyBravoHolidayHomeVitrinFields(pgClient, listingId, {
      meta: pkg.meta,
      pools: pkg.pools,
      ownerContact: null,
      poolSizeLabel: pkg.poolSizeLabel || '',
      damageDepositAmount: pkg.damageDeposit,
      accommodationRuleIds: mapRuleCodesToAccommodationIds(pkg.ruleCodes),
    })

    await applyListingPropertyType(pgClient, listingId, 'villa')

    await pgClient.query(
      `INSERT INTO listing_holiday_home_details (listing_id, theme_codes, rule_codes, ical_managed)
       VALUES ($1::uuid, $2::text[], $3::text[], false)
       ON CONFLICT (listing_id) DO UPDATE SET
         theme_codes = EXCLUDED.theme_codes,
         rule_codes = EXCLUDED.rule_codes`,
      [listingId, pkg.themeCodes || [], pkg.ruleCodes || []],
    )

    await upsertThemes(pgClient, listingId, pkg.themeCodes)
    await upsertAmenities(pgClient, listingId, pkg.amenities)

    if (pkg.tourismCertNo) {
      await pgClient.query(
        `UPDATE listings SET ministry_license_ref = $2, updated_at = now() WHERE id = $1::uuid`,
        [listingId, pkg.tourismCertNo],
      )
    }

    await pgClient.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, 'airbnb', 'snapshot', $2::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
      [
        listingId,
        JSON.stringify({
          source_url: pkg.sourceUrl,
          external_ref: externalRef,
          imported_at: new Date().toISOString(),
          rating_value: pkg.ratingValue,
        }),
      ],
    )

    const imageCount = await upsertImages(pgClient, listingId, slug, pkg.galleryUrls, { skipImages })

    await pgClient.query('COMMIT')
    return {
      action: isNew ? 'created' : 'updated',
      listingId,
      slug,
      externalRef,
      imageCount,
      amenityCount: pkg.amenities?.length || 0,
      title: pkg.title,
      vitrinPrice: pkg.vitrinPrice,
      damageDeposit: pkg.damageDeposit,
      sourceUrl: pkg.sourceUrl,
    }
  } catch (e) {
    await pgClient.query('ROLLBACK')
    throw e
  }
}

export async function runAirbnbImport(urlOrId, opts = {}) {
  const { scrapeAirbnbListing } = await import('./airbnb-scrape.mjs')
  const pg = createPgClient()
  await pg.connect()
  try {
    const pkg = await scrapeAirbnbListing(urlOrId)
    const orgId = process.env.AIRBNB_ORG_ID || DEFAULT_ORG
    const ctx = opts.dryRun
      ? { orgId, categoryId: 1, localeTrId: 1 }
      : await resolveImportContext(pg, orgId, 'holiday_home')
    const result = await upsertAirbnbListing(pg, ctx, pkg, opts)
    if (!opts.dryRun) {
      await pg.query('SELECT refresh_listing_vitrin_prices()')
      // Airbnb gecelik fiyat vermez; refresh depozitoyu vitrine yazmasın.
      if (pkg.vitrinPrice == null && result.listingId) {
        await pg.query(`UPDATE listings SET vitrin_price = NULL, updated_at = now() WHERE id = $1::uuid`, [
          result.listingId,
        ])
      }
    }
    return result
  } finally {
    await pg.end()
  }
}

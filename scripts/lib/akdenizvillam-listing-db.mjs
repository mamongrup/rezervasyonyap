import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './pg-client.mjs'
import { resolveImportContext } from './gtc-listing-db.mjs'
import { applyBravoHolidayHomeVitrinFields } from './bravo-holiday-home-map.mjs'
import { applyListingPropertyType } from './bravo-property-type.mjs'
import { buildSeasonalRuleJson } from './bravo-seasonal-prices.mjs'
import { downloadGalleryImages } from './wtatil-image-download.mjs'
import { HOLIDAY_HOME_RULE_CODE_TO_ACCOMMODATION_ID } from './bravo-holiday-home-map.mjs'
import { upsertAvailabilityCalendar } from './akdenizvillam-calendar.mjs'

const PROVIDER = 'akdenizvillam'
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

function amenityKeyFromName(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

async function upsertAmenities(pgClient, listingId, amenities = []) {
  for (const name of amenities) {
    const key = amenityKeyFromName(name)
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

async function upsertPriceRules(pgClient, listingId, seasonal = [], minStayNights = 5) {
  await pgClient.query(`DELETE FROM listing_price_rules WHERE listing_id = $1::uuid`, [listingId])
  let i = 0
  for (const band of seasonal) {
    i += 1
    const ruleJson = buildSeasonalRuleJson(
      { price: band.baseNightly, from: band.from, to: band.to },
      { minNights: i === 1 ? String(minStayNights) : '' },
    )
    if (band.weeklyTotal) ruleJson.weekly_total = String(band.weeklyTotal)
    await pgClient.query(
      `INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
       VALUES ($1::uuid, $2::jsonb, $3::date, $4::date)`,
      [listingId, JSON.stringify(ruleJson), band.from, band.to],
    )
  }
}

function buildPools(pkg) {
  if (pkg.pools) return pkg.pools

  const pools = {
    open_pool: emptyPoolRow(),
    heated_pool: emptyPoolRow(),
    children_pool: emptyPoolRow(),
  }
  if (pkg.poolDims) {
    pools.open_pool = {
      enabled: true,
      width: pkg.poolDims.width,
      length: pkg.poolDims.length,
      depth: pkg.poolDims.depth || '',
      description: 'Özel yüzme havuzu',
      heating_fee_per_day: '',
    }
  } else {
    pools.open_pool = {
      enabled: true,
      width: '',
      length: '',
      depth: '',
      description: 'Özel havuz',
      heating_fee_per_day: '',
    }
  }
  return pools
}

function emptyPoolRow() {
  return {
    enabled: false,
    width: '',
    length: '',
    depth: '',
    description: '',
    heating_fee_per_day: '',
  }
}

export async function upsertAkdenizvillamVillaListing(
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
    return { action: isNew ? 'would_create' : 'would_update', listingId, slug, externalRef, dryRun: true }
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

    const pools = buildPools(pkg)
    const poolSizeLabel =
      pkg.poolSizeLabel ||
      (pkg.poolDims
        ? [pkg.poolDims.length, pkg.poolDims.width, pkg.poolDims.depth].filter(Boolean).join('×')
        : pools.open_pool.enabled
          ? [pools.open_pool.length, pools.open_pool.width, pools.open_pool.depth].filter(Boolean).join('×')
          : 'Özel havuz')

    await applyBravoHolidayHomeVitrinFields(pgClient, listingId, {
      meta: pkg.meta,
      pools,
      ownerContact: pkg.phone
        ? {
            contact_name: 'Akdeniz Villam',
            contact_phone: pkg.phone,
            contact_email: null,
          }
        : null,
      poolSizeLabel,
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
    await upsertPriceRules(pgClient, listingId, pkg.seasonalPrices, pkg.minStayNights)

    if (pkg.tourismCertNo) {
      await pgClient.query(
        `UPDATE listings SET ministry_license_ref = $2, updated_at = now() WHERE id = $1::uuid`,
        [listingId, pkg.tourismCertNo],
      )
    }

    await pgClient.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, 'akdenizvillam', 'snapshot', $2::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
      [
        listingId,
        JSON.stringify({
          source_url: pkg.sourceUrl,
          external_ref: externalRef,
          imported_at: new Date().toISOString(),
          subtitle: pkg.subtitle || null,
        }),
      ],
    )

    const imageCount = await upsertImages(pgClient, listingId, slug, pkg.galleryUrls, { skipImages })
    const calendar = await upsertAvailabilityCalendar(pgClient, listingId, pkg.calendarDays || [])

    await pgClient.query('COMMIT')
    return {
      action: isNew ? 'created' : 'updated',
      listingId,
      slug,
      externalRef,
      imageCount,
      priceBands: pkg.seasonalPrices?.length || 0,
      calendarDays: calendar.days,
      calendarBlocked: calendar.blocked,
      calendarBookings: pkg.calendarBookings?.length || 0,
    }
  } catch (e) {
    await pgClient.query('ROLLBACK')
    throw e
  }
}

async function resolveImportUrl(pgClient, input) {
  const raw = String(input || '').trim()
  if (/^https?:\/\//i.test(raw)) return raw

  const slug = raw.replace(/^\/+/, '')
  const bySlug = await pgClient.query(
    `SELECT la.value_json->>'source_url' AS source_url
     FROM listings l
     LEFT JOIN listing_attributes la
       ON la.listing_id = l.id AND la.group_code = 'akdenizvillam' AND la.key = 'snapshot'
     WHERE l.slug = $1 OR l.external_listing_ref = $1
     LIMIT 1`,
    [slug],
  )
  const saved = bySlug.rows[0]?.source_url?.trim()
  if (saved) return saved

  return `https://www.akdenizvillam.com/kiralik-villalar/${slug}`
}

export async function runAkdenizvillamImport(urlOrSlug, opts = {}) {
  const { scrapeAkdenizvillamVilla } = await import('./akdenizvillam-scrape.mjs')
  const pg = createPgClient()
  await pg.connect()
  let resolvedUrl = urlOrSlug
  try {
    resolvedUrl = await resolveImportUrl(pg, urlOrSlug)
    const pkg = await scrapeAkdenizvillamVilla(resolvedUrl)
    const orgId = process.env.AKDENIZVILLAM_ORG_ID || DEFAULT_ORG
    const ctx = opts.dryRun
      ? { orgId, categoryId: 1, localeTrId: 1 }
      : await resolveImportContext(pg, orgId, 'holiday_home')
    const result = await upsertAkdenizvillamVillaListing(pg, ctx, pkg, opts)
    if (!opts.dryRun) {
      await pg.query('SELECT refresh_listing_vitrin_prices()')
    }
    return { ...result, title: pkg.title, vitrinPrice: pkg.vitrinPrice, sourceUrl: resolvedUrl }
  } finally {
    await pg.end()
  }
}

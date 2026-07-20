/**
 * Manuel / harici kaynaktan tatil evi upsert (çok dil, sezon fiyat, galeri).
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './pg-client.mjs'
import { resolveImportContext } from './gtc-listing-db.mjs'
import {
  applyBravoHolidayHomeVitrinFields,
  withVillaShortStayFeeMeta,
} from './bravo-holiday-home-map.mjs'
import { applyListingPropertyType } from './bravo-property-type.mjs'
import { buildSeasonalRuleJson } from './bravo-seasonal-prices.mjs'
import { downloadGalleryImages } from './wtatil-image-download.mjs'
import { HOLIDAY_HOME_RULE_CODE_TO_ACCOMMODATION_ID } from './bravo-holiday-home-map.mjs'
import { upsertAvailabilityCalendar } from './akdenizvillam-calendar.mjs'

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

async function findListingId(pg, provider, externalRef, slug) {
  const r = await pg.query(
    `SELECT id::text FROM listings
     WHERE (external_provider_code = $1 AND external_listing_ref = $2)
        OR slug = $3
     LIMIT 1`,
    [provider, String(externalRef), slug],
  )
  return r.rows[0]?.id || null
}

async function upsertImages(pg, listingId, slug, galleryUrls, { skipImages = false } = {}) {
  if (skipImages || !galleryUrls?.length) return 0
  await pg.query(`DELETE FROM listing_images WHERE listing_id = $1::uuid`, [listingId])
  const rows = await downloadGalleryImages(galleryUrls, slug, UPLOADS_ROOT, {
    categoryCode: 'holiday_home',
    skipImages: false,
  })
  for (const row of rows) {
    await pg.query(
      `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime)
       VALUES ($1::uuid, $2, $3, 'image/avif')`,
      [listingId, row.sort, row.storageKey],
    )
  }
  const hero = rows[0]?.storageKey
  if (hero) {
    const publicPath = `/${hero}`
    await pg.query(
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

async function upsertAmenities(pg, listingId, amenities = []) {
  for (const name of amenities) {
    const key = amenityKeyFromName(name)
    if (!key) continue
    await pg.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, 'imported_amenity', $2, $3::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = excluded.value_json`,
      [listingId, key, JSON.stringify({ label: name, enabled: true })],
    )
  }
}

async function upsertThemes(pg, listingId, themeCodes = []) {
  for (const code of themeCodes) {
    await pg.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, 'tema', $2, 'true'::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = excluded.value_json`,
      [listingId, code],
    )
  }
}

async function upsertPriceRules(pg, listingId, seasonal = [], minStayNights = 5) {
  await pg.query(`DELETE FROM listing_price_rules WHERE listing_id = $1::uuid`, [listingId])
  let i = 0
  for (const band of seasonal) {
    i += 1
    const ruleJson = buildSeasonalRuleJson(
      { price: band.baseNightly, from: band.from, to: band.to },
      { minNights: i === 1 ? String(minStayNights) : '', label: band.label || '' },
    )
    await pg.query(
      `INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
       VALUES ($1::uuid, $2::jsonb, $3::date, $4::date)`,
      [listingId, JSON.stringify(ruleJson), band.from, band.to],
    )
  }
}

async function upsertLocaleTranslations(pg, listingId, pkg) {
  const locales = await pg.query(`SELECT id, code FROM locales WHERE is_active = true ORDER BY code`)
  const translationRows = Array.isArray(pkg.translations)
    ? pkg.translations
    : Object.entries(pkg.translations || {}).map(([locale, value]) => ({ locale, ...value }))
  const byCode = new Map(
    translationRows.map((t) => [String(t.locale || t.code || '').toLowerCase(), t]),
  )
  const trFallback = {
    locale: 'tr',
    title: pkg.title,
    description: pkg.description || '',
  }
  for (const row of locales.rows) {
    const t = byCode.get(String(row.code).toLowerCase()) || (row.code === 'tr' ? trFallback : null)
    if (!t?.title) continue
    await pg.query(
      `INSERT INTO listing_translations (listing_id, locale_id, title, description)
       VALUES ($1::uuid, $2, $3, $4)
       ON CONFLICT (listing_id, locale_id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description`,
      [listingId, row.id, t.title, t.description || ''],
    )
  }
}

/**
 * @param {import('pg').Client} pg
 * @param {{ orgId: string, categoryId: number, localeTrId: number }} ctx
 * @param {object} pkg
 */
export async function upsertManualHolidayHome(pg, ctx, pkg, opts = {}) {
  const {
    status = 'published',
    dryRun = false,
    skipImages = false,
    updateExisting = true,
  } = opts
  const provider = pkg.provider || 'manual'
  const slug = pkg.slug
  const externalRef = String(pkg.externalRef)
  const themeCodes = [...new Set((pkg.themeCodes || []).map((c) => String(c).trim()).filter(Boolean))]
  let listingId = await findListingId(pg, provider, externalRef, slug)
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
      priceBands: pkg.seasonalPrices?.length || 0,
      currency: pkg.currency || 'EUR',
      vitrinPrice: pkg.vitrinPrice,
      dryRun: true,
    }
  }

  await pg.query('BEGIN')
  try {
    if (listingId) {
      await pg.query(
        `UPDATE listings SET
           slug = $2, status = $3, currency_code = $4,
           min_stay_nights = $5, map_lat = $6, map_lng = $7,
           location_name = $8, external_provider_code = $9,
           external_listing_ref = $10, listing_source = 'api',
           vitrin_price = COALESCE($11, vitrin_price),
           first_charge_amount = COALESCE($12, first_charge_amount),
           cleaning_fee_amount = NULL, share_to_social = true,
           supplier_payment_note = $13,
           updated_at = now()
         WHERE id = $1::uuid`,
        [
          listingId,
          slug,
          status,
          pkg.currency || 'EUR',
          pkg.minStayNights ?? null,
          pkg.mapLat || null,
          pkg.mapLng || null,
          pkg.locationName || '',
          provider,
          externalRef,
          pkg.vitrinPrice || null,
          pkg.damageDeposit || null,
          pkg.supplierPaymentNote || null,
        ],
      )
    } else {
      const ins = await pg.query(
        `INSERT INTO listings (
           organization_id, category_id, slug, status, currency_code,
           min_stay_nights, map_lat, map_lng, location_name,
           external_provider_code, external_listing_ref, listing_source,
           vitrin_price, first_charge_amount, cleaning_fee_amount, share_to_social,
           supplier_payment_note
         ) VALUES (
           $1::uuid, $2, $3, $4, $5,
           $6, $7, $8, $9,
           $10, $11, 'api',
           $12, $13, NULL, true,
           $14
         ) RETURNING id::text`,
        [
          ctx.orgId,
          ctx.categoryId,
          slug,
          status,
          pkg.currency || 'EUR',
          pkg.minStayNights ?? null,
          pkg.mapLat || null,
          pkg.mapLng || null,
          pkg.locationName || '',
          provider,
          externalRef,
          pkg.vitrinPrice || null,
          pkg.damageDeposit || null,
          pkg.supplierPaymentNote || null,
        ],
      )
      listingId = ins.rows[0].id
    }

    await upsertLocaleTranslations(pg, listingId, pkg)

    await applyBravoHolidayHomeVitrinFields(pg, listingId, {
      meta: withVillaShortStayFeeMeta(pkg.meta, pkg),
      pools: pkg.pools,
      ownerContact: null,
      poolSizeLabel: pkg.poolSizeLabel || '',
      damageDepositAmount: pkg.damageDeposit,
      accommodationRuleIds: mapRuleCodesToAccommodationIds(pkg.ruleCodes),
    })

    await applyListingPropertyType(pg, listingId, 'villa')

    await pg.query(
      `INSERT INTO listing_holiday_home_details (listing_id, theme_codes, rule_codes, ical_managed)
       VALUES ($1::uuid, $2::text[], $3::text[], false)
       ON CONFLICT (listing_id) DO UPDATE SET
         theme_codes = EXCLUDED.theme_codes,
         rule_codes = EXCLUDED.rule_codes`,
      [listingId, themeCodes, pkg.ruleCodes || []],
    )

    await upsertThemes(pg, listingId, themeCodes)
    await upsertAmenities(pg, listingId, pkg.amenities)
    if (pkg.seasonalPrices !== undefined) {
      await upsertPriceRules(pg, listingId, pkg.seasonalPrices || [], pkg.minStayNights || 5)
    }

    if (pkg.tourismCertNo) {
      await pg.query(`UPDATE listings SET ministry_license_ref = $2, updated_at = now() WHERE id = $1::uuid`, [
        listingId,
        pkg.tourismCertNo,
      ])
    }

    await pg.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, $2, 'snapshot', $3::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
      [
        listingId,
        provider,
        JSON.stringify({
          source_url: pkg.sourceUrl,
          drive_folder_id: pkg.driveFolderId || null,
          external_ref: externalRef,
          imported_at: new Date().toISOString(),
          currency: pkg.currency || 'EUR',
          price_note: pkg.priceNote || null,
          provider_gallery_count: pkg.meta?.provider_gallery_count ?? null,
          imported_gallery_count: pkg.meta?.imported_gallery_count ?? null,
          media_incomplete: pkg.meta?.media_incomplete ?? null,
        }),
      ],
    )

    const imageCount = await upsertImages(pg, listingId, slug, pkg.galleryUrls, { skipImages })
    const calendar = pkg.calendarDays === undefined
      ? { days: 0, blocked: 0, preserved: true }
      : await upsertAvailabilityCalendar(pg, listingId, pkg.calendarDays || [])

    await pg.query('COMMIT')

    await pg.query('SELECT refresh_listing_vitrin_prices()').catch(() => {})
    if (pkg.vitrinPrice != null) {
      await pg.query(`UPDATE listings SET vitrin_price = $2, updated_at = now() WHERE id = $1::uuid`, [
        listingId,
        pkg.vitrinPrice,
      ])
    }

    return {
      action: isNew ? 'created' : 'updated',
      listingId,
      slug,
      externalRef,
      imageCount,
      priceBands: pkg.seasonalPrices?.length || 0,
      calendarDays: calendar.days,
      calendarBlocked: calendar.blocked,
      currency: pkg.currency || 'EUR',
      vitrinPrice: pkg.vitrinPrice,
      title: pkg.title,
    }
  } catch (e) {
    await pg.query('ROLLBACK')
    throw e
  }
}

export async function runManualHolidayHomeImport(pkg, opts = {}) {
  const pg = createPgClient()
  await pg.connect()
  try {
    const orgId = process.env.IMPORT_ORG_ID || DEFAULT_ORG
    const ctx = opts.dryRun
      ? { orgId, categoryId: 1, localeTrId: 1 }
      : await resolveImportContext(pg, orgId, 'holiday_home')
    return await upsertManualHolidayHome(pg, ctx, pkg, opts)
  } finally {
    await pg.end()
  }
}

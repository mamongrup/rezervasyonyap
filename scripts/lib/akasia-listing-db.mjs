import path from 'node:path'
import { downloadGalleryImages } from './wtatil-image-download.mjs'
import { formatYachtTitleTr } from './yacht-title-tr.mjs'
import { applyYachtLocationToMeta } from './yacht-location-resolve.mjs'

const PROVIDER = 'akasia'

export async function resolveAkasiaImportContext(pgClient, orgId) {
  const cat = await pgClient.query(
    `SELECT id FROM product_categories WHERE code = 'yacht_charter' LIMIT 1`,
  )
  if (!cat.rows[0]) throw new Error("product_categories.code = 'yacht_charter' bulunamadı")
  const loc = await pgClient.query(
    `SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1`,
  )
  if (!loc.rows[0]) throw new Error("locales.code = 'tr' bulunamadı")
  return {
    categoryId: cat.rows[0].id,
    localeTrId: loc.rows[0].id,
    orgId,
  }
}

export function slugForAkasiaYacht(title, akasiaId) {
  const id = String(akasiaId).trim()
  const suffix = `-ak-${id}`
  let base = String(title || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (!base) base = `yat-${id}`
  const maxBase = Math.max(8, 120 - suffix.length)
  if (base.length > maxBase) base = base.slice(0, maxBase).replace(/-+$/g, '')
  return `${base}${suffix}`
}

export async function findListingByAkasiaRef(pgClient, orgId, akasiaId) {
  const ref = String(akasiaId)
  const r = await pgClient.query(
    `SELECT id::text, slug FROM listings
     WHERE organization_id = $1::uuid
       AND external_provider_code = $2
       AND external_listing_ref = $3
     LIMIT 1`,
    [orgId, PROVIDER, ref],
  )
  return r.rows[0] || null
}

function formatWeeklyPrice(n) {
  const rounded = Math.round(n * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

/**
 * @param {import('pg').Client} pgClient
 * @param {ReturnType<typeof resolveAkasiaImportContext> extends Promise<infer T> ? T : never} ctx
 */
export async function upsertAkasiaYachtListing(
  pgClient,
  ctx,
  { card, detail, propertyType },
  { status = 'draft', dryRun = false, skipImages = false, uploadsRoot },
) {
  const akasiaId = String(detail?.id || card?.id || '').trim()
  if (!akasiaId) throw new Error('Akasia id yok')

  const rawTitle = String(detail?.title || card?.title || `Yat ${akasiaId}`).trim()
  const title = formatYachtTitleTr(rawTitle, propertyType)
  const slug = slugForAkasiaYacht(title, akasiaId)
  const currency = detail?.currency || card?.charterRate?.currency || 'EUR'
  const locationName = detail?.basePort || ''
  const locSeed = {}
  const locationPin = applyYachtLocationToMeta(locSeed, locationName)
  const weeklyLow = detail?.weeklyLow ?? card?.charterRate?.amount ?? null
  const description = detail?.description || title

  if (dryRun) {
    return {
      action: 'dry-run',
      akasiaId,
      slug,
      title: title.slice(0, 80),
      images: detail?.galleryUrls?.length ?? (card?.thumbUrl ? 1 : 0),
      weeklyLow,
      currency,
      propertyType,
    }
  }

  let listingId = (await findListingByAkasiaRef(pgClient, ctx.orgId, akasiaId))?.id
  const isNew = !listingId

  if (listingId) {
    const statusClause =
      status === 'published'
        ? 'status = $3,'
        : "status = CASE WHEN status = 'published' THEN status ELSE $3 END,"
    await pgClient.query(
      `UPDATE listings SET
         slug = $2, ${statusClause} currency_code = $4, location_name = $5,
         min_stay_nights = $6, listing_source = 'api',
         external_provider_code = $7, external_listing_ref = $8,
         last_synced_at = now(), updated_at = now()
       WHERE id = $1::uuid`,
      [listingId, slug, status, currency, locationPin || null, 7, PROVIDER, akasiaId],
    )
  } else {
    const ins = await pgClient.query(
      `INSERT INTO listings (
         organization_id, category_id, slug, status, currency_code, location_name,
         min_stay_nights, listing_source, external_provider_code, external_listing_ref, last_synced_at
       ) VALUES ($1::uuid, $2, $3, $4, $5, $6, 7, 'api', $7, $8, now())
       RETURNING id::text`,
      [ctx.orgId, ctx.categoryId, slug, status, currency, locationPin || null, PROVIDER, akasiaId],
    )
    listingId = ins.rows[0].id
  }

  await pgClient.query(
    `INSERT INTO listing_translations (listing_id, locale_id, title, description)
     VALUES ($1::uuid, $2, $3, $4)
     ON CONFLICT (listing_id, locale_id) DO UPDATE SET
       title = EXCLUDED.title,
       description = EXCLUDED.description`,
    [listingId, ctx.localeTrId, title, description || null],
  )

  const pax = detail?.pax ?? card?.pax ?? null
  const cabinCount = detail?.cabinCount ?? null
  const bathCount = detail?.bathroomCount ?? null

  const meta = {
    property_type: propertyType,
    max_guests: pax != null ? String(pax) : '',
    room_count: cabinCount != null ? String(cabinCount) : '',
    bath_count: bathCount != null ? String(bathCount) : '',
    source: PROVIDER,
    akasia_id: akasiaId,
    akasia_get: propertyType,
    length_m: detail?.lengthMeters ?? card?.lengthM ?? null,
    cabin_count: cabinCount,
    ...locSeed,
    specs: detail?.specs ?? {},
    weekly_rates: detail?.rates ?? [],
    source_url: `https://akasiayachting.com/#get/detail/of/${akasiaId}`,
  }

  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'listing_meta', 'v1', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = excluded.value_json`,
    [listingId, JSON.stringify(meta)],
  )

  await pgClient.query(
    `DELETE FROM listing_attributes WHERE listing_id = $1::uuid AND group_code = 'ilan_tipi'`,
    [listingId],
  )
  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'ilan_tipi', $2, 'true'::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = excluded.value_json`,
    [listingId, propertyType],
  )

  await pgClient.query(
    `INSERT INTO listing_yacht_details (listing_id, length_meters, cabin_count, theme_codes, rule_codes, ical_managed)
     VALUES ($1::uuid, $2::numeric, $3::smallint, '{}', '{}', false)
     ON CONFLICT (listing_id) DO UPDATE SET
       length_meters = COALESCE($2::numeric, listing_yacht_details.length_meters),
       cabin_count = COALESCE($3::smallint, listing_yacht_details.cabin_count)`,
    [listingId, detail?.lengthMeters ?? card?.lengthM ?? null, detail?.cabinCount ?? null],
  )

  await pgClient.query(`DELETE FROM listing_price_rules WHERE listing_id = $1::uuid`, [listingId])
  if (weeklyLow != null && weeklyLow > 0) {
    const ruleJson = {
      weekly_total: formatWeeklyPrice(weeklyLow),
      base_nightly: formatWeeklyPrice(weeklyLow / 7),
      label: 'Haftalık (düşük sezon)',
      min_nights: '7',
    }
    await pgClient.query(
      `INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
       VALUES ($1::uuid, $2::jsonb, NULL, NULL)`,
      [listingId, JSON.stringify(ruleJson)],
    )
  }

  const galleryUrls = detail?.galleryUrls?.length
    ? detail.galleryUrls
    : card?.thumbUrl
      ? [card.thumbUrl]
      : []

  const imageRows = await downloadGalleryImages(galleryUrls, slug, uploadsRoot, {
    categoryCode: 'yacht_charter',
    skipImages,
  })

  if (imageRows.length) {
    await pgClient.query(`DELETE FROM listing_images WHERE listing_id = $1::uuid`, [listingId])
    for (const row of imageRows) {
      await pgClient.query(
        `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime)
         VALUES ($1::uuid, $2, $3, 'image/avif')`,
        [listingId, row.sort, row.storageKey],
      )
    }
    const hero = `/${imageRows[0].storageKey}`
    await pgClient.query(
      `UPDATE listings SET featured_image_url = $2, thumbnail_url = $2, updated_at = now() WHERE id = $1::uuid`,
      [listingId, hero],
    )
  }

  return {
    action: isNew ? 'created' : 'updated',
    akasiaId,
    slug,
    listingId,
    images: imageRows.length,
    weeklyLow,
  }
}

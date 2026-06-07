import path from 'node:path'
import { downloadGalleryImages } from './wtatil-image-download.mjs'
import { formatYachtTitleTr } from './yacht-title-tr.mjs'
import { buildBaransenDescription } from './baransen-api.mjs'
import { findMatchingYachtListing } from './yacht-listing-match.mjs'
import { applyYachtLocationToMeta } from './yacht-location-resolve.mjs'
const PROVIDER = 'baransen'

export async function resolveBaransenImportContext(pgClient, orgId) {
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

export function slugForBaransenYacht(title, baransenId) {
  const id = String(baransenId).trim()
  const suffix = `-bs-${id}`
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

export async function findListingByBaransenRef(pgClient, orgId, baransenId) {
  const r = await pgClient.query(
    `SELECT id::text, slug FROM listings
     WHERE organization_id = $1::uuid
       AND external_provider_code = $2
       AND external_listing_ref = $3
     LIMIT 1`,
    [orgId, PROVIDER, String(baransenId)],
  )
  return r.rows[0] || null
}

function mergeMeta(existing, incoming) {
  const prev = existing || {}
  const enrichment = {
    ...(prev.enrichment_sources || {}),
    baransen: incoming.enrichment_sources?.baransen,
  }
  return {
    ...prev,
    ...incoming,
    specs: { ...(prev.specs || {}), ...(incoming.specs || {}) },
    monthly_rates: incoming.monthly_rates?.length ? incoming.monthly_rates : prev.monthly_rates,
    enrichment_sources: enrichment,
  }
}

function pickDescription(existingDesc, newDesc) {
  const oldLen = String(existingDesc || '').trim().length
  const newLen = String(newDesc || '').trim().length
  if (newLen >= Math.max(400, oldLen + 80)) return newDesc
  if (oldLen < 280) return newDesc
  return existingDesc
}

/**
 * @param {import('pg').Client} pgClient
 */
export async function upsertBaransenYachtListing(
  pgClient,
  ctx,
  { card, detail },
  { status = 'draft', dryRun = false, skipImages = false, uploadsRoot, updateExisting = true, forceImages = false },
) {
  const baransenId = String(detail?.baransenId || card?.baransenId || '').trim()
  if (!baransenId) throw new Error('Baransen id yok')

  const rawTitle = String(detail?.title || card?.title || `Yat ${baransenId}`).trim()
  const propertyType = detail?.propertyType || card?.propertyType || 'gulet'
  const displayTitle = formatYachtTitleTr(rawTitle, propertyType)

  const pax = detail?.pax ?? card?.pax ?? null
  const cabinCount = detail?.cabinCount ?? null
  const bathCount = detail?.bathroomCount ?? null
  const marina = detail?.marina || card?.marina || ''
  const dailyPrice = card?.dailyPrice ?? null
  const currency = detail?.currency || card?.currency || 'EUR'

  const description = buildBaransenDescription(detail, {
    displayTitle,
    pax,
    cabinCount,
    bathCount,
    marina,
    dailyPrice,
  })

  if (dryRun) {
    const match = await findMatchingYachtListing(pgClient, ctx.orgId, {
      title: rawTitle,
      pax,
      cabinCount,
    })
    return {
      action: 'dry-run',
      baransenId,
      title: displayTitle,
      match: match?.slug || null,
      pax,
      cabinCount,
      bathCount,
      images: detail?.galleryUrls?.length ?? 0,
      dailyPrice,
    }
  }

  let listingId = (await findListingByBaransenRef(pgClient, ctx.orgId, baransenId))?.id
  let matchedExisting = null
  let isNew = !listingId

  if (!listingId && updateExisting) {
    matchedExisting = await findMatchingYachtListing(pgClient, ctx.orgId, {
      title: rawTitle,
      pax,
      cabinCount,
    })
    if (matchedExisting) listingId = matchedExisting.id
  }

  const slug = matchedExisting?.slug || slugForBaransenYacht(rawTitle, baransenId)

  const incomingMeta = {
    property_type: propertyType,
    max_guests: pax != null ? String(pax) : '',
    room_count: cabinCount != null ? String(cabinCount) : '',
    bath_count: bathCount != null ? String(bathCount) : '',
    source: matchedExisting ? matchedExisting.external_provider_code || PROVIDER : PROVIDER,
    baransen_id: baransenId,
    length_m: detail?.lengthM ?? null,
    cabin_count: cabinCount,
    specs: detail?.specs ?? {},
    monthly_rates: detail?.monthlyRates ?? [],
    daily_price: dailyPrice,
    source_url: detail?.sourceUrl || card?.detailUrl,
    enrichment_sources: {
      baransen: {
        url: detail?.sourceUrl || card?.detailUrl,
        baransen_id: baransenId,
        fetched_at: new Date().toISOString(),
        match_score: matchedExisting?.match_score ?? null,
      },
    },
  }
  const locationPin = applyYachtLocationToMeta(incomingMeta, marina)

  if (listingId && matchedExisting) {
    const cur = await pgClient.query(
      `SELECT la.value_json AS meta, lt.description
       FROM listings l
       LEFT JOIN listing_attributes la ON la.listing_id = l.id AND la.group_code = 'listing_meta' AND la.key = 'v1'
       LEFT JOIN listing_translations lt ON lt.listing_id = l.id AND lt.locale_id = $2
       WHERE l.id = $1::uuid`,
      [listingId, ctx.localeTrId],
    )
    const row = cur.rows[0] || {}
    const mergedMeta = mergeMeta(row.meta, incomingMeta)
    if (bathCount != null) {
      mergedMeta.bath_count = String(bathCount)
      mergedMeta.room_count =
        cabinCount != null ? String(cabinCount) : mergedMeta.room_count || ''
      mergedMeta.cabin_count = cabinCount ?? mergedMeta.cabin_count
    }
    const finalDesc = pickDescription(row.description, description)

    await pgClient.query(
      `UPDATE listings SET
         location_name = COALESCE(NULLIF($2, ''), location_name),
         currency_code = $3,
         last_synced_at = now(), updated_at = now()
       WHERE id = $1::uuid`,
      [listingId, locationPin || null, currency],
    )
    await pgClient.query(
      `UPDATE listing_translations SET title = $2, description = $3
       WHERE listing_id = $1::uuid AND locale_id = $4`,
      [listingId, displayTitle, finalDesc || null, ctx.localeTrId],
    )
    await pgClient.query(
      `UPDATE listing_attributes SET value_json = $2::jsonb
       WHERE listing_id = $1::uuid AND group_code = 'listing_meta' AND key = 'v1'`,
      [listingId, JSON.stringify(mergedMeta)],
    )

    if (cabinCount != null || detail?.lengthM != null) {
      await pgClient.query(
        `INSERT INTO listing_yacht_details (listing_id, length_meters, cabin_count, theme_codes, rule_codes, ical_managed)
         VALUES ($1::uuid, $2::numeric, $3::smallint, '{}', '{}', false)
         ON CONFLICT (listing_id) DO UPDATE SET
           length_meters = COALESCE($2::numeric, listing_yacht_details.length_meters),
           cabin_count = COALESCE($3::smallint, listing_yacht_details.cabin_count)`,
        [listingId, detail?.lengthM ?? null, cabinCount],
      )
    }

    if (dailyPrice != null && dailyPrice > 0) {
      await pgClient.query(`DELETE FROM listing_price_rules WHERE listing_id = $1::uuid`, [listingId])
      await pgClient.query(
        `INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
         VALUES ($1::uuid, $2::jsonb, NULL, NULL)`,
        [
          listingId,
          JSON.stringify({
            base_nightly: String(Math.round(dailyPrice)),
            label: 'Günlük (Baransen)',
            min_nights: '1',
          }),
        ],
      )
    }

    return {
      action: 'merged',
      baransenId,
      slug: matchedExisting.slug,
      listingId,
      matchScore: matchedExisting.match_score,
      images: 0,
    }
  }

  if (listingId && !matchedExisting) {
    await pgClient.query(
      `UPDATE listings SET
         slug = $2, location_name = $3, currency_code = $4,
         min_stay_nights = $5, listing_source = 'api',
         external_provider_code = $6, external_listing_ref = $7,
         last_synced_at = now(), updated_at = now()
       WHERE id = $1::uuid`,
      [listingId, slug, locationPin || null, currency, 1, PROVIDER, baransenId],
    )
  } else if (!listingId) {
    const ins = await pgClient.query(
      `INSERT INTO listings (
         organization_id, category_id, slug, status, currency_code, location_name,
         min_stay_nights, listing_source, external_provider_code, external_listing_ref, last_synced_at
       ) VALUES ($1::uuid, $2, $3, $4, $5, $6, 1, 'api', $7, $8, now())
       RETURNING id::text`,
      [ctx.orgId, ctx.categoryId, slug, status, currency, locationPin || null, PROVIDER, baransenId],
    )
    listingId = ins.rows[0].id
    isNew = true
  }

  if (status === 'published') {
    await pgClient.query(`UPDATE listings SET status = 'published' WHERE id = $1::uuid`, [listingId])
  }

  await pgClient.query(
    `INSERT INTO listing_translations (listing_id, locale_id, title, description)
     VALUES ($1::uuid, $2, $3, $4)
     ON CONFLICT (listing_id, locale_id) DO UPDATE SET
       title = EXCLUDED.title,
       description = EXCLUDED.description`,
    [listingId, ctx.localeTrId, displayTitle, description || null],
  )

  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'listing_meta', 'v1', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = excluded.value_json`,
    [listingId, JSON.stringify(incomingMeta)],
  )

  await pgClient.query(`DELETE FROM listing_attributes WHERE listing_id = $1::uuid AND group_code = 'ilan_tipi'`, [
    listingId,
  ])
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
    [listingId, detail?.lengthM ?? null, cabinCount],
  )

  if (dailyPrice != null && dailyPrice > 0) {
    await pgClient.query(`DELETE FROM listing_price_rules WHERE listing_id = $1::uuid`, [listingId])
    await pgClient.query(
      `INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
       VALUES ($1::uuid, $2::jsonb, NULL, NULL)`,
      [
        listingId,
        JSON.stringify({
          base_nightly: String(Math.round(dailyPrice)),
          label: 'Günlük (Baransen)',
          min_nights: '1',
        }),
      ],
    )
  }

  const galleryUrls = detail?.galleryUrls?.length ? detail.galleryUrls : card?.thumbUrls || []
  let existingImageCount = 0
  if (forceImages && listingId) {
    const ic = await pgClient.query(
      `SELECT COUNT(*)::int AS n FROM listing_images WHERE listing_id = $1::uuid`,
      [listingId],
    )
    existingImageCount = ic.rows[0]?.n ?? 0
  }
  const shouldDownloadImages =
    !skipImages &&
    galleryUrls.length > 0 &&
    ((isNew && !matchedExisting) || (forceImages && existingImageCount === 0))
  const imageRows = shouldDownloadImages
    ? await downloadGalleryImages(galleryUrls, slug, uploadsRoot, {
        categoryCode: 'yacht_charter',
        skipImages: false,
      })
    : []

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
    baransenId,
    slug,
    listingId,
    images: imageRows.length,
    dailyPrice,
  }
}

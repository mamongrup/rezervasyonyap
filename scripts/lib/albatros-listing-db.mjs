import path from 'node:path'
import { downloadGalleryImages } from './wtatil-image-download.mjs'
import { formatYachtTitleTr } from './yacht-title-tr.mjs'
import { buildAlbatrosDescription } from './albatros-api.mjs'
import { findMatchingYachtListing } from './yacht-listing-match.mjs'
import { applyYachtLocationToMeta } from './yacht-location-resolve.mjs'

const PROVIDER = 'albatros'

export async function resolveAlbatrosImportContext(pgClient, orgId) {
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

export function slugForAlbatrosYacht(title, albatrosId) {
  const id = String(albatrosId).trim()
  const suffix = `-al-${id}`
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

export async function findListingByAlbatrosRef(pgClient, orgId, albatrosId) {
  const r = await pgClient.query(
    `SELECT id::text, slug FROM listings
     WHERE organization_id = $1::uuid
       AND external_provider_code = $2
       AND external_listing_ref = $3
     LIMIT 1`,
    [orgId, PROVIDER, String(albatrosId)],
  )
  return r.rows[0] || null
}

function mergeMeta(existing, incoming) {
  const prev = existing || {}
  return {
    ...prev,
    ...incoming,
    specs: { ...(prev.specs || {}), ...(incoming.specs || {}) },
    amenities: [...new Set([...(prev.amenities || []), ...(incoming.amenities || [])])],
    inclusions: [...new Set([...(prev.inclusions || []), ...(incoming.inclusions || [])])],
    exclusions: [...new Set([...(prev.exclusions || []), ...(incoming.exclusions || [])])],
    monthly_rates: incoming.monthly_rates?.length ? incoming.monthly_rates : prev.monthly_rates,
    enrichment_sources: {
      ...(prev.enrichment_sources || {}),
      albatros: incoming.enrichment_sources?.albatros,
    },
  }
}

function pickDescription(existingDesc, newDesc) {
  const oldLen = String(existingDesc || '').trim().length
  const newLen = String(newDesc || '').trim().length
  if (newLen >= Math.max(500, oldLen + 80)) return newDesc
  if (oldLen < 400) return newDesc
  return existingDesc
}

function seasonYear() {
  return new Date().getFullYear()
}

async function upsertSeasonalPriceRules(pgClient, listingId, monthlyRates, pricePeriod) {
  if (!monthlyRates?.length) return
  const year = seasonYear()
  await pgClient.query(`DELETE FROM listing_price_rules WHERE listing_id = $1::uuid`, [listingId])

  for (const r of monthlyRates) {
    const [mmFrom] = r.validFrom.split('-')
    const [mmTo] = r.validTo.split('-')
    const validFrom = `${year}-${mmFrom}-01`
    const validTo = `${year}-${mmTo}-${mmTo === '02' ? '28' : '30'}`
    const isWeekly = (r.period || pricePeriod) === 'weekly'
    const ruleJson = isWeekly
      ? {
          weekly_total: String(Math.round(r.amount)),
          base_nightly: String(Math.round((r.amount / 7) * 100) / 100),
          label: `${r.label} (${r.periodLabel || 'Haftalık'})`,
          min_nights: '7',
        }
      : {
          base_nightly: String(Math.round(r.amount)),
          label: `${r.label} (${r.periodLabel || 'Günlük'})`,
          min_nights: '1',
        }
    await pgClient.query(
      `INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
       VALUES ($1::uuid, $2::jsonb, $3::date, $4::date)`,
      [listingId, JSON.stringify(ruleJson), validFrom, validTo],
    )
  }
}

/**
 * @param {import('pg').Client} pgClient
 */
export async function upsertAlbatrosYachtListing(
  pgClient,
  ctx,
  record,
  { status = 'draft', dryRun = false, skipImages = false, uploadsRoot, updateExisting = true, forceImages = false },
) {
  const albatrosId = String(record?.albatrosId || '').trim()
  if (!albatrosId) throw new Error('Albatros id yok')

  const rawTitle = String(record?.title || `Yat ${albatrosId}`).trim()
  const propertyType = record?.propertyType || 'gulet'
  const displayTitle = formatYachtTitleTr(rawTitle, propertyType)
  const pax = record?.pax ?? null
  const cabinCount = record?.cabinCount ?? null
  const bathCount = record?.bathroomCount ?? null
  const marina = record?.marina || ''
  const description = buildAlbatrosDescription(record)

  if (dryRun) {
    const match = await findMatchingYachtListing(pgClient, ctx.orgId, {
      title: rawTitle,
      pax,
      cabinCount,
    })
    return {
      action: 'dry-run',
      albatrosId,
      title: displayTitle,
      match: match?.slug || null,
      pax,
      cabinCount,
      bathCount,
      images: record?.galleryUrls?.length ?? 0,
      rates: record?.monthlyRates?.length ?? 0,
    }
  }

  let listingId = (await findListingByAlbatrosRef(pgClient, ctx.orgId, albatrosId))?.id
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

  const slug = matchedExisting?.slug || slugForAlbatrosYacht(rawTitle, albatrosId)

  const incomingMeta = {
    property_type: propertyType,
    max_guests: pax != null ? String(pax) : '',
    room_count: cabinCount != null ? String(cabinCount) : '',
    bath_count: bathCount != null ? String(bathCount) : '',
    source: matchedExisting ? matchedExisting.external_provider_code || PROVIDER : PROVIDER,
    albatros_id: albatrosId,
    length_m: record?.lengthM ?? null,
    cabin_count: cabinCount,
    class_label: record?.classLabel || '',
    price_period: record?.pricePeriod || 'daily',
    headline_price: record?.headlinePrice ?? null,
    specs: record?.specs ?? {},
    amenities: record?.amenities ?? [],
    inclusions: record?.inclusions ?? [],
    exclusions: record?.exclusions ?? [],
    monthly_rates: record?.monthlyRates ?? [],
    type_labels: record?.typeLabels ?? [],
    source_url: record?.sourceUrl,
    enrichment_sources: {
      albatros: {
        url: record?.sourceUrl,
        albatros_id: albatrosId,
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
    if (bathCount != null) mergedMeta.bath_count = String(bathCount)
    if (cabinCount != null) {
      mergedMeta.room_count = String(cabinCount)
      mergedMeta.cabin_count = cabinCount
    }
    const finalDesc = pickDescription(row.description, description)

    await pgClient.query(
      `UPDATE listings SET
         location_name = COALESCE(NULLIF($2, ''), location_name),
         currency_code = 'EUR',
         last_synced_at = now(), updated_at = now()
       WHERE id = $1::uuid`,
      [listingId, locationPin || null],
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

    if (cabinCount != null || record?.lengthM != null) {
      await pgClient.query(
        `INSERT INTO listing_yacht_details (listing_id, length_meters, cabin_count, theme_codes, rule_codes, ical_managed)
         VALUES ($1::uuid, $2::numeric, $3::smallint, '{}', '{}', false)
         ON CONFLICT (listing_id) DO UPDATE SET
           length_meters = COALESCE($2::numeric, listing_yacht_details.length_meters),
           cabin_count = COALESCE($3::smallint, listing_yacht_details.cabin_count)`,
        [listingId, record?.lengthM ?? null, cabinCount],
      )
    }

    await upsertSeasonalPriceRules(
      pgClient,
      listingId,
      record?.monthlyRates,
      record?.pricePeriod,
    )

    const galleryUrls = record?.galleryUrls || []
    let existingImageCount = 0
    if (forceImages) {
      const ic = await pgClient.query(
        `SELECT COUNT(*)::int AS n FROM listing_images WHERE listing_id = $1::uuid`,
        [listingId],
      )
      existingImageCount = ic.rows[0]?.n ?? 0
    }
    const shouldDownload =
      !skipImages && galleryUrls.length > 0 && (forceImages ? existingImageCount === 0 : false)
    let imageCount = 0
    if (shouldDownload) {
      const imageRows = await downloadGalleryImages(galleryUrls, slug, uploadsRoot, {
        categoryCode: 'yacht_charter',
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
        imageCount = imageRows.length
      }
    }

    return {
      action: 'merged',
      albatrosId,
      slug: matchedExisting.slug,
      listingId,
      matchScore: matchedExisting.match_score,
      images: imageCount,
    }
  }

  if (listingId && !matchedExisting) {
    await pgClient.query(
      `UPDATE listings SET
         slug = $2, location_name = $3, currency_code = 'EUR',
         min_stay_nights = $4, listing_source = 'api',
         external_provider_code = $5, external_listing_ref = $6,
         last_synced_at = now(), updated_at = now()
       WHERE id = $1::uuid`,
      [listingId, slug, locationPin || null, record?.pricePeriod === 'weekly' ? 7 : 1, PROVIDER, albatrosId],
    )
  } else if (!listingId) {
    const ins = await pgClient.query(
      `INSERT INTO listings (
         organization_id, category_id, slug, status, currency_code, location_name,
         min_stay_nights, listing_source, external_provider_code, external_listing_ref, last_synced_at
       ) VALUES ($1::uuid, $2, $3, $4, 'EUR', $5, $6, 'api', $7, $8, now())
       RETURNING id::text`,
      [
        ctx.orgId,
        ctx.categoryId,
        slug,
        status,
        locationPin || null,
        record?.pricePeriod === 'weekly' ? 7 : 1,
        PROVIDER,
        albatrosId,
      ],
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
    [listingId, record?.lengthM ?? null, cabinCount],
  )

  await upsertSeasonalPriceRules(pgClient, listingId, record?.monthlyRates, record?.pricePeriod)

  const galleryUrls = record?.galleryUrls || []
  let existingImageCount = 0
  if (listingId) {
    const ic = await pgClient.query(
      `SELECT COUNT(*)::int AS n FROM listing_images WHERE listing_id = $1::uuid`,
      [listingId],
    )
    existingImageCount = ic.rows[0]?.n ?? 0
  }
  const shouldDownloadImages =
    !skipImages &&
    galleryUrls.length > 0 &&
    (isNew || (forceImages && existingImageCount === 0))
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
    albatrosId,
    slug,
    listingId,
    images: imageRows.length,
    rates: record?.monthlyRates?.length ?? 0,
  }
}

/** Mevcut ilana yalnızca galeri indir (birleşmiş Baransen slug vb.). */
export async function attachGalleryImagesToListing(
  pgClient,
  listingId,
  slug,
  galleryUrls,
  uploadsRoot,
) {
  const urls = (galleryUrls || []).filter(Boolean)
  if (!urls.length) return 0
  const imageRows = await downloadGalleryImages(urls, slug, uploadsRoot, {
    categoryCode: 'yacht_charter',
  })
  if (!imageRows.length) return 0
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
  return imageRows.length
}

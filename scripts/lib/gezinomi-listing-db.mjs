/**
 * Gezinomi ilanları — DB upsert (cruise + tour)
 */

import { gezinomiPictureDownloadUrls } from './gezinomi-gallery.mjs'
import {
  gezinomiCruiseImageUrl,
  parseCruiseShipName,
  parseRouteSummary,
  pickCruiseCurrency,
  pickCruisePrice,
} from './gezinomi-cruise-catalog.mjs'
import {
  gezinomiTourImageUrl,
  parseTourDepartureCity,
  parseTourTravelType,
  pickTourCurrency,
  pickTourPrice,
} from './gezinomi-kultur-catalog.mjs'
import { listingStorageKey, listingUploadDir } from './listing-upload-path.mjs'
import {
  buildGezinomiTourContentPackage,
  summarizeGezinomiDepartures,
  summarizeGezinomiPeriodTimes,
} from './gezinomi-api.mjs'

const PROVIDER = 'gezinomi'

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90)
}

export function slugForGezinomiCruise(row) {
  const link = String(row.link || '').trim()
  if (link) return slugify(link)
  return slugify(`${row.productName || 'cruise'}-${row.productId}`)
}

export function slugForGezinomiTour(row) {
  const link = String(row.link || '').trim()
  if (link) return slugify(`gz-${link}`)
  return slugify(`gz-tour-${row.productId}`)
}

async function resolveGezinomiCategoryContext(pgClient, orgId, categoryCode) {
  const cat = await pgClient.query(
    `SELECT id FROM product_categories WHERE code = $1 LIMIT 1`,
    [categoryCode],
  )
  if (!cat.rows[0]) throw new Error(`product_categories.code = '${categoryCode}' bulunamadı`)
  const loc = await pgClient.query(`SELECT id, code FROM locales WHERE is_active = true`)
  const localeIds = {}
  for (const row of loc.rows) localeIds[row.code] = row.id
  const localeTrId = localeIds.tr
  if (!localeTrId) throw new Error("locales.code = 'tr' bulunamadı")
  return { categoryId: cat.rows[0].id, localeTrId, localeIds, orgId }
}

export async function resolveGezinomiImportContext(pgClient, orgId) {
  return resolveGezinomiCategoryContext(pgClient, orgId, 'cruise')
}

export async function resolveGezinomiTourImportContext(pgClient, orgId) {
  return resolveGezinomiCategoryContext(pgClient, orgId, 'tour')
}

export async function findListingByGezinomiRef(pgClient, orgId, productId) {
  const r = await pgClient.query(
    `SELECT id::text FROM listings
     WHERE organization_id = $1::uuid
       AND external_provider_code = $2
       AND external_listing_ref = $3
     LIMIT 1`,
    [orgId, PROVIDER, String(productId)],
  )
  return r.rows[0]?.id || null
}

/** Aynı tur kodu Wtatil'de varsa cruise duplicate açma */
export async function findWtatilListingByProductId(pgClient, orgId, productId) {
  const code = String(productId)
  const r = await pgClient.query(
    `SELECT id::text, slug FROM listings
     WHERE organization_id = $1::uuid
       AND external_provider_code = 'wtatil'
       AND (
         external_listing_ref = $2
         OR slug LIKE '%' || $2
         OR slug LIKE '%-wt-' || $2
         OR slug LIKE '%-' || $2
       )
     LIMIT 1`,
    [orgId, code],
  )
  return r.rows[0] || null
}

export async function upsertGezinomiCruiseListing(
  pgClient,
  ctx,
  row,
  { status = 'draft', detail = null, galleryUrls = [], dryRun = false } = {},
) {
  const productId = String(row.productId)
  const slug = slugForGezinomiCruise(row)
  const title = String(row.productName || `Cruise ${productId}`).trim()
  const content = detail?.model ? buildGezinomiTourContentPackage(detail.model) : null
  const description =
    content?.descriptionHtml?.trim() ||
    String(row.tourDetailText || '').trim() ||
    null
  const currency = pickCruiseCurrency(row)
  const price = pickCruisePrice(row)
  const locName = parseRouteSummary(row) || row.tourDeparture || row.cruiseLine || null
  const shipName = parseCruiseShipName(row)
  const cruiseLine = String(row.cruiseLine || '').trim() || null
  const routeSummary = parseRouteSummary(row)
  const cabinCategory = String(row.tourHotelTypeName || row.conceptName || '').trim() || null

  if (dryRun) {
    return { action: 'dry-run', productId, slug, title: title.slice(0, 60) }
  }

  let listingId = await findListingByGezinomiRef(pgClient, ctx.orgId, productId)
  const isNew = !listingId

  if (listingId) {
    await pgClient.query(
      `UPDATE listings SET
         slug = $2,
         status = CASE WHEN status = 'published' THEN status ELSE $3 END,
         currency_code = $4,
         location_name = $5,
         first_charge_amount = COALESCE($6, first_charge_amount),
         listing_source = 'api',
         external_provider_code = $7,
         external_listing_ref = $8,
         last_synced_at = now(),
         updated_at = now()
       WHERE id = $1::uuid`,
      [listingId, slug, status, currency, locName, price, PROVIDER, productId],
    )
  } else {
    const ins = await pgClient.query(
      `INSERT INTO listings (
         organization_id, category_id, slug, status, currency_code, location_name,
         first_charge_amount, listing_source, external_provider_code, external_listing_ref, last_synced_at
       ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, 'api', $8, $9, now())
       RETURNING id::text`,
      [ctx.orgId, ctx.categoryId, slug, status, currency, locName, price, PROVIDER, productId],
    )
    listingId = ins.rows[0].id
  }

  await pgClient.query(
    `INSERT INTO listing_translations (listing_id, locale_id, title, description)
     VALUES ($1::uuid, $2, $3, $4)
     ON CONFLICT (listing_id, locale_id) DO UPDATE SET
       title = EXCLUDED.title,
       description = EXCLUDED.description`,
    [listingId, ctx.localeTrId, title, description],
  )

  const prevVerticalRes = await pgClient.query(
    `SELECT value_json FROM listing_attributes
     WHERE listing_id = $1::uuid AND group_code = 'vertical_cruise' AND key = 'v1'`,
    [listingId],
  )
  const prevVertical = prevVerticalRes.rows[0]?.value_json || {}
  const programDays = content?.programDays?.length ? content.programDays : prevVertical.program_days ?? []
  const infoSections = content?.infoSections?.length ? content.infoSections : prevVertical.info_sections ?? []

  const verticalCruise = {
    ...prevVertical,
    cruise_line: cruiseLine || prevVertical.cruise_line || null,
    ship_name: shipName || prevVertical.ship_name || null,
    route_summary: routeSummary || prevVertical.route_summary || null,
    cabin_category: cabinCategory || prevVertical.cabin_category || null,
    night_count: row.nightCount ?? content?.numberOfNights ?? prevVertical.night_count ?? null,
    concept_name: content?.conceptName || row.conceptName || prevVertical.concept_name || null,
    tour_departure: content?.tourDeparture || row.tourDeparture || prevVertical.tour_departure || null,
    product_id: Number(row.productId),
    gezinomi_link: row.link,
    gezinomi_page_url: detail?.pageUrl || prevVertical.gezinomi_page_url || null,
    info_sections: infoSections,
    program_days: programDays,
    periods: detail?.periods ?? prevVertical.periods ?? null,
    detail_text: content?.detailText || row.tourDetailText || prevVertical.detail_text || null,
  }

  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'vertical_cruise', 'v1', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [listingId, JSON.stringify(verticalCruise)],
  )

  const meta = {
    source: PROVIDER,
    product_id: Number(row.productId),
    tour_id: row.tourId ?? null,
    night_count: row.nightCount ?? null,
    start_date: row.startDate ?? null,
    end_date: row.endDate ?? null,
    all_periods: row.allPeriods ?? null,
    periods: detail?.periods ?? null,
    gezinomi_link: row.link,
    category_link: row.cruiseCategoryLink ?? row.categoryLink ?? null,
    path_link: row.pathLink ?? null,
    imported_at: new Date().toISOString(),
  }

  await pgClient.query(
    `INSERT INTO listing_cruise_details (
       listing_id, cruise_line, ship_name, route_summary, cabin_category, external_cruise_ref, meta_json
     ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::jsonb)
     ON CONFLICT (listing_id) DO UPDATE SET
       cruise_line = EXCLUDED.cruise_line,
       ship_name = EXCLUDED.ship_name,
       route_summary = EXCLUDED.route_summary,
       cabin_category = EXCLUDED.cabin_category,
       external_cruise_ref = EXCLUDED.external_cruise_ref,
       meta_json = EXCLUDED.meta_json`,
    [listingId, cruiseLine, shipName, routeSummary, cabinCategory, productId, JSON.stringify(meta)],
  )

  const snapshot = {
    catalog: row,
    detail: detail?.model
      ? {
          tourCode: detail.tourCode,
          pageUrl: detail.pageUrl,
          content: content ?? null,
        }
      : null,
  }
  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'gezinomi', 'snapshot', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [listingId, JSON.stringify(snapshot)],
  )

  return { action: isNew ? 'created' : 'updated', listingId, productId, slug, galleryUrls }
}

export async function upsertGezinomiTourListing(
  pgClient,
  ctx,
  row,
  { status = 'draft', detail = null, galleryUrls = [], dryRun = false } = {},
) {
  const productId = String(row.productId)
  const slug = slugForGezinomiTour(row)
  const title = String(row.productName || `Tur ${productId}`).trim()
  const content = detail?.model ? buildGezinomiTourContentPackage(detail.model) : null
  // Yapılandırılmış içerik vertical_tour'da; açıklama yalnızca kısa özet.
  const description =
    content?.detailText?.trim() ||
    String(row.tourDetailText || '').trim() ||
    null
  const currency = pickTourCurrency(row)
  const price = pickTourPrice(row)
  const tourDepartureText = content?.tourDeparture || row.tourDeparture || ''
  const locName = String(row.tourRegionName || row.tourDeparture || tourDepartureText || '').trim() || null
  const nightCount = row.nightCount ?? content?.numberOfNights ?? null
  const durationDays =
    nightCount != null && Number(nightCount) > 0 ? String(Number(nightCount) + 1) : nightCount === 0 ? '1' : null
  const travelType = parseTourTravelType(row, detail?.model)
  const departureCity = parseTourDepartureCity(tourDepartureText || row.tourDeparture || '')
  const tourRegion = String(row.tourRegion || '').trim() || null
  const accommodationType = row.nightCount === 0 || nightCount == null ? 'none' : 'hotel'

  if (dryRun) {
    return { action: 'dry-run', productId, slug, title: title.slice(0, 60), tourRegion }
  }

  let listingId = await findListingByGezinomiRef(pgClient, ctx.orgId, productId)
  const isNew = !listingId

  if (listingId) {
    await pgClient.query(
      `UPDATE listings SET
         slug = $2,
         status = CASE WHEN status = 'published' THEN status ELSE $3 END,
         currency_code = $4,
         location_name = $5,
         first_charge_amount = COALESCE($6, first_charge_amount),
         vitrin_price = CASE WHEN $6::numeric IS NOT NULL AND $6::numeric > 0 THEN $6::numeric ELSE NULL END,
         listing_source = 'api',
         external_provider_code = $7,
         external_listing_ref = $8,
         last_synced_at = now(),
         updated_at = now()
       WHERE id = $1::uuid`,
      [listingId, slug, status, currency, locName, price, PROVIDER, productId],
    )
  } else {
    const ins = await pgClient.query(
      `INSERT INTO listings (
         organization_id, category_id, slug, status, currency_code, location_name,
         first_charge_amount, vitrin_price, listing_source, external_provider_code, external_listing_ref, last_synced_at
       ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, 'api', $9, $10, now())
       RETURNING id::text`,
      [
        ctx.orgId,
        ctx.categoryId,
        slug,
        status,
        currency,
        locName,
        price,
        price != null && price > 0 ? price : null,
        PROVIDER,
        productId,
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
    [listingId, ctx.localeTrId, title, description],
  )

  const programDays = content?.programDays ?? []
  await pgClient.query(
    `INSERT INTO listing_tour_details (listing_id, is_manual, program_days_json)
     VALUES ($1::uuid, false, $2::jsonb)
     ON CONFLICT (listing_id) DO UPDATE SET
       is_manual = false,
       program_days_json = EXCLUDED.program_days_json`,
    [listingId, JSON.stringify(programDays)],
  )

  const verticalTour = {
    data: {
      tour_region: tourRegion,
      duration_days: durationDays,
      travel_type: travelType,
      accommodation_type: accommodationType,
      departure_city: departureCity,
      max_people: null,
      languages: 'tr',
      visa_required: 'false',
    },
    tour_region: tourRegion,
    duration_days: durationDays,
    travel_type: travelType,
    accommodation_type: accommodationType,
    departure_city: departureCity,
    night_count: nightCount,
    concept_name: content?.conceptName || row.conceptName || null,
    tour_departure: tourDepartureText || null,
    product_id: Number(row.productId),
    gezinomi_link: row.link,
    gezinomi_page_url: detail?.pageUrl || null,
    info_sections: content?.infoSections ?? [],
    program_days: programDays,
    periods: detail?.periods ?? null,
    tour_departures: detail?.model ? summarizeGezinomiDepartures(detail.model) : [],
    period_times: detail?.model ? summarizeGezinomiPeriodTimes(detail.model) : [],
    price_basis: 'double_per_person',
    detail_text: content?.detailText || row.tourDetailText || null,
    category_link: row.categoryLink ?? null,
  }

  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'vertical_tour', 'v1', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [listingId, JSON.stringify(verticalTour)],
  )

  const snapshot = {
    catalog: row,
    detail: detail?.model
      ? {
          tourCode: detail.tourCode,
          pageUrl: detail.pageUrl,
          content: content ?? null,
        }
      : null,
  }
  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'gezinomi', 'snapshot', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [listingId, JSON.stringify(snapshot)],
  )

  return { action: isNew ? 'created' : 'updated', listingId, productId, slug, galleryUrls, tourRegion }
}

export function coverImageCandidates(row, galleryUrls = []) {
  const out = []
  if (galleryUrls.length) out.push(...galleryUrls)
  const cover = gezinomiCruiseImageUrl(row.imageUrl, row.productId)
  if (cover) out.push(cover)
  const name = String(row.imageUrl || '').trim()
  if (name) out.push(...gezinomiPictureDownloadUrls(name))
  return [...new Set(out.filter(Boolean))]
}

export function coverTourImageCandidates(row, galleryUrls = []) {
  const out = []
  if (galleryUrls.length) out.push(...galleryUrls)
  const cover = gezinomiTourImageUrl(row.imageUrl, row.productId)
  if (cover) out.push(cover)
  const name = String(row.imageUrl || '').trim()
  if (name) out.push(...gezinomiPictureDownloadUrls(name))
  return [...new Set(out.filter(Boolean))]
}

export { listingStorageKey, listingUploadDir }

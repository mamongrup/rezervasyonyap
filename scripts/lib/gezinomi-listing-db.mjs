/**
 * Gezinomi cruise ilanları — DB upsert (kategori: cruise)
 */

import { gezinomiPictureDownloadUrls } from './gezinomi-gallery.mjs'
import {
  gezinomiCruiseImageUrl,
  parseCruiseShipName,
  parseRouteSummary,
  pickCruiseCurrency,
  pickCruisePrice,
} from './gezinomi-cruise-catalog.mjs'
import { listingStorageKey, listingUploadDir } from './listing-upload-path.mjs'
import { buildGezinomiTourContentPackage } from './gezinomi-api.mjs'

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

export async function resolveGezinomiImportContext(pgClient, orgId) {
  const cat = await pgClient.query(`SELECT id FROM product_categories WHERE code = 'cruise' LIMIT 1`)
  if (!cat.rows[0]) throw new Error("product_categories.code = 'cruise' bulunamadı")
  const loc = await pgClient.query(`SELECT id, code FROM locales WHERE is_active = true`)
  const localeIds = {}
  for (const row of loc.rows) localeIds[row.code] = row.id
  const localeTrId = localeIds.tr
  if (!localeTrId) throw new Error("locales.code = 'tr' bulunamadı")
  return { categoryId: cat.rows[0].id, localeTrId, localeIds, orgId }
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

  const verticalCruise = {
    cruise_line: cruiseLine,
    ship_name: shipName,
    route_summary: routeSummary,
    cabin_category: cabinCategory,
    night_count: row.nightCount ?? content?.numberOfNights ?? null,
    concept_name: content?.conceptName || row.conceptName || null,
    tour_departure: content?.tourDeparture || row.tourDeparture || null,
    product_id: Number(row.productId),
    gezinomi_link: row.link,
    gezinomi_page_url: detail?.pageUrl || null,
    info_sections: content?.infoSections ?? [],
    program_days: content?.programDays ?? [],
    periods: detail?.periods ?? null,
    detail_text: content?.detailText || row.tourDetailText || null,
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

export function coverImageCandidates(row, galleryUrls = []) {
  const out = []
  if (galleryUrls.length) out.push(...galleryUrls)
  const cover = gezinomiCruiseImageUrl(row.imageUrl, row.productId)
  if (cover) out.push(cover)
  const name = String(row.imageUrl || '').trim()
  if (name) out.push(...gezinomiPictureDownloadUrls(name))
  return [...new Set(out.filter(Boolean))]
}

export { listingStorageKey, listingUploadDir }

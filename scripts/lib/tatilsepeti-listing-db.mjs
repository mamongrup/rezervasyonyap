/** Tatilsepeti cruise ilanları — DB upsert */

import { resolveGezinomiImportContext } from './gezinomi-listing-db.mjs'

const PROVIDER = 'tatilsepeti'

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
    .slice(0, 80)
}

export function slugForTatilsepetiCruise(row) {
  const base = String(row.slug || row.title || 'cruise')
    .replace(/-tr-\d+$/i, '')
    .replace(/-ts-\d+$/i, '')
  return `${slugify(base)}-ts-${row.tourId}`.slice(0, 96)
}

export { resolveGezinomiImportContext as resolveTatilsepetiImportContext }

export async function findListingByTatilsepetiRef(pgClient, orgId, tourId) {
  const r = await pgClient.query(
    `SELECT id::text, slug FROM listings
     WHERE organization_id = $1::uuid
       AND external_provider_code = $2
       AND external_listing_ref = $3
     LIMIT 1`,
    [orgId, PROVIDER, String(tourId)],
  )
  return r.rows[0] || null
}

function minCabinPrice(detail) {
  const cabinAmounts = (detail.cabins || [])
    .map((c) => c.from_price?.amount)
    .filter((n) => n > 0)
  const listPrice = detail.price?.amount > 0 ? detail.price.amount : null
  return cabinAmounts.length > 0 ? Math.min(...cabinAmounts) : listPrice
}

export function buildTatilsepetiVerticalCruise(detail) {
  const tourId = String(detail.tourId)
  const shipName = detail.shipName || null
  const cruiseLine = detail.cruiseLine || shipName
  return {
    cruise_line: cruiseLine,
    ship_name: shipName,
    route_summary: detail.routeSummary,
    night_count: detail.nightCount,
    tour_departure: detail.visits?.[0] || null,
    transport: detail.transport,
    visa_info: detail.visaInfo,
    program_days: (detail.programDays || []).map((d, i) => ({
      day: Number(String(d.day_label || '').replace(/\D/g, '')) || i + 1,
      title: d.title,
      description: d.body_html || d.description || '',
    })),
    cabins: detail.cabins || [],
    included_services: detail.included || [],
    excluded_services: detail.excluded || [],
    periods: detail.periods,
    tatilsepeti_url: detail.url,
    tatilsepeti_tour_id: tourId,
    agency_id: detail.agencyId,
  }
}

/** Mevcut ilan — kabin/program/dahil-hariç güncelle (backfill) */
export async function patchTatilsepetiCruiseListingContent(pgClient, listingId, detail) {
  const tourId = String(detail.tourId)
  const effectivePrice = minCabinPrice(detail)
  const currency = detail.price?.currency || 'EUR'
  const verticalCruise = buildTatilsepetiVerticalCruise(detail)

  const existing = await pgClient.query(
    `SELECT value_json FROM listing_attributes
     WHERE listing_id = $1::uuid AND group_code = 'vertical_cruise' AND key = 'v1'`,
    [listingId],
  )
  const prev = existing.rows[0]?.value_json || {}
  const merged = { ...prev, ...verticalCruise }

  await pgClient.query(
    `UPDATE listings SET
       currency_code = COALESCE($2, currency_code),
       first_charge_amount = COALESCE($3, first_charge_amount),
       vitrin_price = COALESCE($3, vitrin_price),
       last_synced_at = now(),
       updated_at = now()
     WHERE id = $1::uuid`,
    [listingId, currency, effectivePrice],
  )

  if (detail.description) {
    await pgClient.query(
      `UPDATE listing_translations SET description = COALESCE($2, description)
       WHERE listing_id = $1::uuid`,
      [listingId, detail.description],
    )
  }

  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'vertical_cruise', 'v1', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [listingId, JSON.stringify(merged)],
  )

  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'tatilsepeti', 'snapshot', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
       value_json = listing_attributes.value_json || EXCLUDED.value_json`,
    [
      listingId,
      JSON.stringify({ catalog: detail, cabins_backfilled_at: new Date().toISOString() }),
    ],
  )

  return { listingId, tourId, cabinCount: detail.cabins?.length ?? 0, effectivePrice }
}

export async function upsertTatilsepetiCruiseListing(
  pgClient,
  ctx,
  detail,
  { status = 'draft', dryRun = false } = {},
) {
  const tourId = String(detail.tourId)
  const slug = slugForTatilsepetiCruise(detail)
  const title = String(detail.title || `Cruise ${tourId}`).trim()
  const description = detail.description || null
  const currency = detail.price?.currency || 'EUR'
  const price = detail.price?.amount > 0 ? detail.price.amount : null
  const locName = detail.routeSummary || detail.visits?.[0] || null
  const shipName = detail.shipName || null
  const cruiseLine = detail.cruiseLine || shipName
  const effectivePrice = minCabinPrice(detail)

  if (dryRun) {
    return { action: 'dry-run', tourId, slug, title: title.slice(0, 70) }
  }

  let listingId = (await findListingByTatilsepetiRef(pgClient, ctx.orgId, tourId))?.id
  const isNew = !listingId

  if (listingId) {
    await pgClient.query(
      `UPDATE listings SET
         slug = $2,
         status = CASE WHEN status = 'published' THEN status ELSE $3 END,
         currency_code = $4,
         location_name = $5,
         first_charge_amount = COALESCE($6, first_charge_amount),
         vitrin_price = COALESCE($6, vitrin_price),
         listing_source = 'api',
         external_provider_code = $7,
         external_listing_ref = $8,
         last_synced_at = now(),
         updated_at = now()
       WHERE id = $1::uuid`,
      [listingId, slug, status, currency, locName, effectivePrice, PROVIDER, tourId],
    )
  } else {
    const ins = await pgClient.query(
      `INSERT INTO listings (
         organization_id, category_id, slug, status, currency_code, location_name,
         first_charge_amount, vitrin_price, listing_source, external_provider_code, external_listing_ref, last_synced_at
       ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $7, 'api', $8, $9, now())
       RETURNING id::text`,
      [ctx.orgId, ctx.categoryId, slug, status, currency, locName, effectivePrice, PROVIDER, tourId],
    )
    listingId = ins.rows[0].id
  }

  await pgClient.query(
    `INSERT INTO listing_translations (listing_id, locale_id, title, description)
     VALUES ($1::uuid, $2, $3, $4)
     ON CONFLICT (listing_id, locale_id) DO UPDATE SET
       title = EXCLUDED.title,
       description = COALESCE(EXCLUDED.description, listing_translations.description)`,
    [listingId, ctx.localeTrId, title, description],
  )

  const verticalCruise = buildTatilsepetiVerticalCruise(detail)

  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'vertical_cruise', 'v1', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [listingId, JSON.stringify(verticalCruise)],
  )

  await pgClient.query(
    `INSERT INTO listing_cruise_details (
       listing_id, cruise_line, ship_name, route_summary, external_cruise_ref, meta_json
     ) VALUES ($1::uuid, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (listing_id) DO UPDATE SET
       cruise_line = EXCLUDED.cruise_line,
       ship_name = EXCLUDED.ship_name,
       route_summary = EXCLUDED.route_summary,
       external_cruise_ref = EXCLUDED.external_cruise_ref,
       meta_json = EXCLUDED.meta_json`,
    [
      listingId,
      cruiseLine,
      shipName,
      detail.routeSummary,
      tourId,
      JSON.stringify({
        source: PROVIDER,
        tour_id: tourId,
        url: detail.url,
        agency_id: detail.agencyId,
        imported_at: new Date().toISOString(),
      }),
    ],
  )

  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'tatilsepeti', 'snapshot', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [listingId, JSON.stringify({ catalog: detail, imported_at: new Date().toISOString() })],
  )

  return { action: isNew ? 'created' : 'updated', listingId, tourId, slug, galleryUrls: detail.galleryUrls || [] }
}

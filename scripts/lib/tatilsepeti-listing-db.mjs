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
  const infoSections = buildTatilsepetiInfoSections(detail)
  return {
    cruise_line: cruiseLine,
    ship_name: shipName,
    route_summary: detail.routeSummary,
    night_count: detail.nightCount,
    tour_departure: detail.visits?.[0] || null,
    visits: detail.visits || [],
    transport: detail.transport,
    visa_info: detail.visaInfo,
    tour_code: tourId,
    departure_points: detail.departurePoints || [],
    ship_specs: detail.shipSpecs || [],
    ship_activities: detail.shipActivities || [],
    ship_image_url: detail.shipImageUrl || null,
    deck_plan_image_url: detail.deckPlanImageUrl || null,
    detail_text: detail.detailTextHtml || null,
    program_days: (detail.programDays || []).map((d, i) => ({
      day: Number(String(d.day_label || '').replace(/\D/g, '')) || i + 1,
      day_label: d.day_label,
      title: d.title,
      description: d.body_html || d.description || '',
      body_html: d.body_html || d.description || '',
    })),
    cabins: detail.cabins || [],
    included_services: detail.included || [],
    excluded_services: detail.excluded || [],
    info_sections: infoSections,
    periods: detail.periods,
    tatilsepeti_url: detail.url,
    tatilsepeti_tour_id: tourId,
    agency_id: detail.agencyId,
  }
}

function buildTatilsepetiInfoSections(detail) {
  const sections = []
  if (detail.visits?.length) {
    sections.push({
      id: 'cruise-visits',
      title: 'Ziyaret Edilecek Yerler',
      html: `<ul>${detail.visits.map((v) => `<li>${escapeHtml(v)}</li>`).join('')}</ul>`,
    })
  }
  if (detail.shipSpecs?.length || detail.shipActivities?.length || detail.shipImageUrl) {
    let html = ''
    if (detail.shipImageUrl) {
      html += `<p><img src="${detail.shipImageUrl}" alt="${escapeHtml(detail.shipName || 'Gemi')}" style="max-width:100%;border-radius:12px" loading="lazy" /></p>`
    }
    if (detail.shipSpecs?.length) {
      html += `<ul>${detail.shipSpecs.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`
    }
    if (detail.shipActivities?.length) {
      html += `<p><strong>Gemi aktiviteleri</strong></p><ul>${detail.shipActivities.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>`
    }
    sections.push({ id: 'cruise-ship-info', title: 'Gemi Bilgileri', html })
  }
  if (detail.departurePoints?.length) {
    sections.push({
      id: 'cruise-departure',
      title: 'Tur Kalkış Noktaları',
      html: `<ul>${detail.departurePoints.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>`,
    })
  }
  if (detail.detailTextHtml?.trim()) {
    sections.push({ id: 'cruise-notes', title: 'Açıklamalar', html: detail.detailTextHtml })
  }
  if (detail.deckPlanImageUrl) {
    sections.push({
      id: 'cruise-deck-plan',
      title: 'Gemi Kat Planları',
      html: `<p><img src="${detail.deckPlanImageUrl}" alt="${escapeHtml(detail.shipName || 'Gemi kat planı')}" style="max-width:100%;border-radius:12px" loading="lazy" /></p>`,
    })
  }
  return sections
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Gezinomi vb. mevcut vertical_cruise — Tatilsepeti detayından eksik alanları doldur */
export function mergeTatilsepetiIntoVerticalCruise(prev, fromTs) {
  const merged = { ...prev, ...fromTs }
  const keepPrevArray = (key) => {
    if (Array.isArray(prev[key]) && prev[key].length > 0) merged[key] = prev[key]
  }
  if (Array.isArray(fromTs.cabins) && fromTs.cabins.length > 0) {
    merged.cabins = fromTs.cabins
  } else if (Array.isArray(prev.cabins) && prev.cabins.length > 0) {
    merged.cabins = prev.cabins
  }
  for (const key of [
    'program_days',
    'included_services',
    'excluded_services',
    'info_sections',
    'periods',
    'departure_points',
    'visits',
    'ship_specs',
    'ship_activities',
  ]) {
    keepPrevArray(key)
  }
  if (prev.gezinomi_link) merged.gezinomi_link = prev.gezinomi_link
  if (prev.gezinomi_page_url) merged.gezinomi_page_url = prev.gezinomi_page_url
  if (prev.product_id) merged.product_id = prev.product_id
  if (prev.concept_name) merged.concept_name = prev.concept_name
  if (!merged.ship_image_url && prev.ship_image_url) merged.ship_image_url = prev.ship_image_url
  if (!merged.deck_plan_image_url && prev.deck_plan_image_url) {
    merged.deck_plan_image_url = prev.deck_plan_image_url
  }
  if (!merged.detail_text && prev.detail_text) merged.detail_text = prev.detail_text
  merged.tatilsepeti_url = fromTs.tatilsepeti_url || prev.tatilsepeti_url || null
  merged.tatilsepeti_tour_id = fromTs.tatilsepeti_tour_id || prev.tatilsepeti_tour_id || null
  return merged
}

/** Herhangi bir cruise ilanı — Tatilsepeti detayından kabin ve eksik içerik (Gezinomi uyumlu merge) */
export async function patchCruiseListingFromTatilsepetiDetail(pgClient, listingId, detail) {
  const verticalCruise = buildTatilsepetiVerticalCruise(detail)
  const existing = await pgClient.query(
    `SELECT value_json FROM listing_attributes
     WHERE listing_id = $1::uuid AND group_code = 'vertical_cruise' AND key = 'v1'`,
    [listingId],
  )
  const prev = existing.rows[0]?.value_json || {}
  const merged = mergeTatilsepetiIntoVerticalCruise(prev, verticalCruise)
  const effectivePrice = minCabinPrice(detail)
  const currency = detail.price?.currency || 'EUR'

  if (effectivePrice) {
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
  }

  const prevDesc = await pgClient.query(
    `SELECT length(trim(coalesce(description, ''))) AS n FROM listing_translations WHERE listing_id = $1::uuid LIMIT 1`,
    [listingId],
  )
  const descLen = Number(prevDesc.rows[0]?.n || 0)
  if (descLen < 200 && (detail.description || detail.detailTextHtml)) {
    const rich = detail.detailTextHtml?.trim() || detail.description
    await pgClient.query(
      `UPDATE listing_translations SET description = COALESCE($2, description)
       WHERE listing_id = $1::uuid`,
      [listingId, rich],
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
      JSON.stringify({ catalog: detail, cabins_matched_at: new Date().toISOString() }),
    ],
  )

  return {
    listingId,
    tourId: String(detail.tourId),
    cabinCount: merged.cabins?.length ?? 0,
    programCount: merged.program_days?.length ?? 0,
    effectivePrice,
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

  if (detail.description || detail.detailTextHtml) {
    const rich = detail.detailTextHtml?.trim() || detail.description
    await pgClient.query(
      `UPDATE listing_translations SET description = COALESCE($2, description)
       WHERE listing_id = $1::uuid`,
      [listingId, rich],
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
  const description = detail.detailTextHtml?.trim() || detail.description || null
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

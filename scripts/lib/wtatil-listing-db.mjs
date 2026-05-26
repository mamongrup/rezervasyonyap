const PROVIDER = 'wtatil'

function normalizeWtatilImageUrl(url) {
  const s = String(url || '').trim()
  if (!s) return ''
  if (s.startsWith('http://')) return `https://${s.slice(7)}`
  return s
}

function isWtatilThumbnailUrl(url) {
  return /-thumbnail\.(jpe?g|png|webp|avif)$/i.test(url)
}

/** Tam boy galeri önce; API kapak genelde `-thumbnail` döner. */
function imageUrls(tour) {
  const raw = [tour?.coverPhoto, ...(tour?.galleryPhotos || [])]
    .map(normalizeWtatilImageUrl)
    .filter(Boolean)
  const seen = new Set()
  const full = []
  const thumbs = []
  for (const u of raw) {
    if (seen.has(u)) continue
    seen.add(u)
    if (isWtatilThumbnailUrl(u)) thumbs.push(u)
    else full.push(u)
  }
  return [...full, ...thumbs]
}

export function slugForWtatilTour(tour) {
  const id = String(tour?.id ?? '').trim()
  const suffix = `-wt-${id}`
  let base = String(tour?.name ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (!base) base = `tur-${id}`
  const maxBase = Math.max(8, 120 - suffix.length)
  if (base.length > maxBase) base = base.slice(0, maxBase).replace(/-+$/g, '')
  return `${base}${suffix}`
}

function pickCurrency(tour) {
  const c = tour?.currency?.code || tour?.currency?.name || 'TRY'
  const x = String(c).trim().toUpperCase()
  if (x === 'TRY' || x === 'EUR' || x === 'USD' || x === 'GBP') return x
  return 'TRY'
}

function locationLabel(tour) {
  const area = tour?.tourArea?.name || tour?.tourArea?.text || ''
  const countries = (tour?.countries || [])
    .map((c) => c?.name || c?.code || '')
    .filter(Boolean)
    .join(', ')
  return [area, countries].filter(Boolean).join(' · ') || null
}

export async function resolveImportContext(pgClient, orgId) {
  const cat = await pgClient.query(`SELECT id FROM product_categories WHERE code = 'tour' LIMIT 1`)
  if (!cat.rows[0]) throw new Error("product_categories.code = 'tour' bulunamadı")
  const loc = await pgClient.query(`SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1`)
  if (!loc.rows[0]) throw new Error("locales.code = 'tr' bulunamadı")
  return {
    categoryId: cat.rows[0].id,
    localeTrId: loc.rows[0].id,
    orgId,
  }
}

export async function findListingByWtatilRef(pgClient, orgId, tourId) {
  const ref = String(tourId)
  const r = await pgClient.query(
    `SELECT id::text FROM listings
     WHERE organization_id = $1::uuid
       AND external_provider_code = $2
       AND external_listing_ref = $3
     LIMIT 1`,
    [orgId, PROVIDER, ref],
  )
  return r.rows[0]?.id || null
}

export async function upsertWtatilTourListing(
  pgClient,
  ctx,
  tour,
  { status = 'draft', enrich = null, dryRun = false } = {},
) {
  const tourId = String(tour.id)
  const slug = slugForWtatilTour(tour)
  const currency = pickCurrency(tour)
  const title = String(tour.name || `Tur ${tourId}`).trim()
  const descriptionParts = [
    tour.tourProgram,
    tour.generalConditions,
    tour.paidServices ? `Ücretli: ${tour.paidServices}` : '',
    tour.freeServices ? `Dahil: ${tour.freeServices}` : '',
  ].filter(Boolean)
  const description = descriptionParts.join('\n\n').trim()
  const locName = locationLabel(tour)

  if (dryRun) {
    return { action: 'dry-run', tourId, slug, title: title.slice(0, 60) }
  }

  let listingId = await findListingByWtatilRef(pgClient, ctx.orgId, tourId)
  const isNew = !listingId

  if (listingId) {
    await pgClient.query(
      `UPDATE listings SET
         slug = $2, status = $3, currency_code = $4, location_name = $5,
         listing_source = 'api', external_provider_code = $6, external_listing_ref = $7,
         last_synced_at = now(), updated_at = now()
       WHERE id = $1::uuid`,
      [listingId, slug, status, currency, locName, PROVIDER, tourId],
    )
  } else {
    const ins = await pgClient.query(
      `INSERT INTO listings (
         organization_id, category_id, slug, status, currency_code, location_name,
         listing_source, external_provider_code, external_listing_ref, last_synced_at
       ) VALUES ($1::uuid, $2, $3, $4, $5, $6, 'api', $7, $8, now())
       RETURNING id::text`,
      [ctx.orgId, ctx.categoryId, slug, status, currency, locName, PROVIDER, tourId],
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

  const programJson = {
    source: PROVIDER,
    wtatil_tour_id: Number(tour.id),
    raw_html: tour.tourProgram || null,
    number_of_nights: tour.numberOfNights ?? null,
    periods: enrich?.periods ?? null,
    period_prices: enrich?.periodPrices ?? null,
    transport: enrich?.transport ?? null,
    cheapest_price: enrich?.cheapestPrice ?? null,
  }

  await pgClient.query(
    `INSERT INTO listing_tour_details (listing_id, wtatil_package_ref, is_manual, program_days_json, tour_format)
     VALUES ($1::uuid, $2, false, $3::jsonb, 'package')
     ON CONFLICT (listing_id) DO UPDATE SET
       wtatil_package_ref = EXCLUDED.wtatil_package_ref,
       is_manual = false,
       program_days_json = EXCLUDED.program_days_json,
       tour_format = EXCLUDED.tour_format`,
    [listingId, tourId, JSON.stringify(programJson)],
  )

  const attrPayload = {
    catalog: tour,
    meal_type: tour.mealType ?? null,
    transport_type: tour.transportType ?? null,
    tour_type: tour.tourType ?? null,
    tour_area: tour.tourArea ?? null,
    countries: tour.countries ?? null,
    visa_detail: tour.visaDetail ?? null,
    definite_departure: tour.definiteDeparture ?? null,
    suggested: tour.suggested ?? null,
    supplier_id: tour.supplierId ?? null,
    updated_at: tour.updatedDate ?? null,
  }

  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'wtatil', 'snapshot', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [listingId, JSON.stringify(attrPayload)],
  )

  const urls = imageUrls(tour)
  await pgClient.query(`DELETE FROM listing_images WHERE listing_id = $1::uuid`, [listingId])
  let sort = 0
  for (const url of urls) {
    await pgClient.query(
      `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime)
       VALUES ($1::uuid, $2, $3, 'image/jpeg')`,
      [listingId, sort, url],
    )
    sort += 1
  }

  return { action: isNew ? 'created' : 'updated', listingId, tourId, slug }
}

/** Credential doğrulama — token alınabiliyor mu */
export async function pingWtatil() {
  const { fetchWtatilToken } = await import('./wtatil-api.mjs')
  const t = await fetchWtatilToken()
  return { ok: true, expireDate: t.expireDate }
}

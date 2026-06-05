/**
 * Travelrobot (KPlus) listing DB upsert — tur, otel, uçak.
 * GTC ve Wtatil DB modülleri ile aynı convention.
 */

const PROVIDER = 'travelrobot'

// ── Slug yardımcıları ────────────────────────────────────────────────────────

function slugify(text, fallback = 'ilan') {
  let base = String(text || fallback)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ö/g, 'o').replace(/ı/g, 'i').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (!base) base = String(fallback).replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  return base.slice(0, 120).replace(/-+$/g, '')
}

function tourNode(tour) {
  return tour?.Tour ?? tour?.tour ?? null
}

function normalizeSearchTourRow(raw) {
  const nested = tourNode(raw)
  if (!nested || typeof nested !== 'object') return raw
  return {
    ...raw,
    TourCode: raw?.TourCode ?? raw?.tourCode ?? nested.Code ?? nested.code ?? '',
    TourName: raw?.TourName ?? raw?.tourName ?? nested.Name ?? nested.name ?? '',
    TourProgram:
      raw?.TourProgram ?? raw?.tourProgram ?? nested.TourItinerary ?? nested.ShortDescription ?? '',
    RegionName:
      raw?.RegionName ?? raw?.regionName ?? nested.Regions?.[0]?.Name ?? nested.Regions?.[0]?.name ?? '',
    ImageUrl: raw?.ImageUrl ?? raw?.imageUrl ?? nested.Logo ?? nested.logo ?? '',
    Currency: raw?.Currency ?? raw?.currency ?? raw?.Price?.CurrencyCode ?? '',
    Tour: nested,
  }
}

export function slugForTravelrobotTour(tour) {
  const code = String(tour?.TourCode ?? tour?.tourCode ?? tourNode(tour)?.Code ?? tour?.ProductCode ?? tour?.id ?? '')
  const suffix = `-tr-${code || 'tour'}`
  const name = tour?.TourName ?? tour?.tourName ?? tour?.Name ?? tour?.name ?? ''
  const base = slugify(name, `tur-${code || 'x'}`)
  const maxBase = Math.max(8, 120 - suffix.length)
  return `${base.slice(0, maxBase)}${suffix}`
}

export function slugForTravelrobotHotel(hotel) {
  const nested = hotel?.Hotel ?? hotel?.hotel
  const id = String(
    hotel?.HotelId ?? hotel?.hotelId ?? hotel?.HotelCode ?? hotel?.hotelCode ?? nested?.HotelCode ?? hotel?.ItemId ?? hotel?.id ?? '',
  )
  const suffix = `-tr-${id || 'hotel'}`
  const name = hotel?.HotelName ?? hotel?.hotelName ?? hotel?.Name ?? hotel?.name ?? ''
  const base = slugify(name, `otel-${id || 'x'}`)
  const maxBase = Math.max(8, 120 - suffix.length)
  return `${base.slice(0, maxBase)}${suffix}`
}

export function slugForTravelrobotFlight(flight) {
  const origin = String(flight?.OriginCode ?? flight?.origin ?? flight?.DepartureAirport ?? '').toLowerCase()
  const dest = String(flight?.DestinationCode ?? flight?.destination ?? flight?.ArrivalAirport ?? '').toLowerCase()
  const key = `${origin}-${dest}` || String(flight?.FlightCode ?? flight?.id ?? 'route')
  const suffix = `-trflt-${key}`
  const label = flight?.label ?? `${origin.toUpperCase()} → ${dest.toUpperCase()}`
  const base = slugify(label, key)
  const maxBase = Math.max(8, 120 - suffix.length)
  return `${base.slice(0, maxBase)}${suffix}`
}

// ── Normalize yardımcıları ──────────────────────────────────────────────────

function tourRef(tour) {
  const nested = tourNode(tour)
  return String(
    tour?.TourCode ?? tour?.tourCode ?? nested?.Code ?? nested?.code ?? tour?.ProductCode ?? tour?.id ?? '',
  ).trim()
}

function hotelRef(hotel) {
  const nested = hotel?.Hotel ?? hotel?.hotel
  return String(
    hotel?.HotelId ??
      hotel?.hotelId ??
      hotel?.HotelCode ??
      hotel?.hotelCode ??
      nested?.HotelCode ??
      nested?.hotelCode ??
      hotel?.ProductCode ??
      hotel?.ItemId ??
      hotel?.id ??
      '',
  ).trim()
}

function normalizeFlightRow(raw) {
  const legs = raw?.Legs ?? raw?.legs ?? []
  let origin = ''
  let dest = ''
  for (const leg of legs) {
    const alt = leg?.AlternativeLegs?.[0] ?? leg?.alternativeLegs?.[0]
    const seg = alt?.Segments?.[0] ?? alt?.segments?.[0]
    if (!seg) continue
    origin = String(seg?.DepartureAirport?.Code ?? seg?.departureAirport?.code ?? '').trim()
    dest = String(seg?.ArrivalAirport?.Code ?? seg?.arrivalAirport?.code ?? '').trim()
    if (origin && dest) break
  }
  return {
    ...raw,
    OriginCode: raw?.OriginCode ?? raw?.origin ?? origin,
    DestinationCode: raw?.DestinationCode ?? raw?.destination ?? dest,
    DepartureAirport: raw?.DepartureAirport ?? origin,
    ArrivalAirport: raw?.ArrivalAirport ?? dest,
  }
}

function flightRouteKey(flight) {
  const row = normalizeFlightRow(flight)
  const o = String(row?.OriginCode ?? row?.origin ?? row?.DepartureAirport ?? '').trim().toLowerCase()
  const d = String(row?.DestinationCode ?? row?.destination ?? row?.ArrivalAirport ?? '').trim().toLowerCase()
  return o && d ? `${o}-${d}` : String(row?.FlightCode ?? row?.id ?? '').trim()
}

function pickText(obj, ...keys) {
  for (const k of keys) {
    const v = String(obj?.[k] ?? '').trim()
    if (v) return v
  }
  return ''
}

function normalizeCurrency(raw) {
  const c = String(raw ?? '').trim().toUpperCase()
  return ['TRY', 'EUR', 'USD', 'GBP'].includes(c) ? c : 'TRY'
}

// ── Context ─────────────────────────────────────────────────────────────────

export async function resolveImportContext(pgClient, orgId, categoryCode) {
  const cat = await pgClient.query(
    `SELECT id FROM product_categories WHERE code = $1 LIMIT 1`,
    [categoryCode],
  )
  if (!cat.rows[0]) throw new Error(`product_categories.code = '${categoryCode}' bulunamadı`)
  const loc = await pgClient.query(
    `SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1`,
  )
  if (!loc.rows[0]) throw new Error("locales.code = 'tr' bulunamadı")
  return { categoryId: cat.rows[0].id, localeTrId: loc.rows[0].id, orgId }
}

// ── Mevcut listing arama ────────────────────────────────────────────────────

export async function findListingByTravelrobotRef(pgClient, orgId, extRef) {
  const r = await pgClient.query(
    `SELECT id::text FROM listings
     WHERE organization_id = $1::uuid
       AND external_provider_code = $2
       AND external_listing_ref = $3
     LIMIT 1`,
    [orgId, PROVIDER, String(extRef)],
  )
  return r.rows[0]?.id || null
}

// ── Core upsert (paylaşılan) ────────────────────────────────────────────────

async function upsertListingCore(
  pgClient,
  ctx,
  { extRef, slug, title, description, locName, currency, status, dryRun },
) {
  if (dryRun) return { listingId: null, slug, extRef, created: false, dryRun: true }

  let listingId = await findListingByTravelrobotRef(pgClient, ctx.orgId, extRef)
  const existed = Boolean(listingId)

  if (listingId) {
    await pgClient.query(
      `UPDATE listings SET
         slug = $2, status = $3, currency_code = $4, location_name = $5,
         listing_source = 'api', external_provider_code = $6, external_listing_ref = $7,
         last_synced_at = now(), updated_at = now()
       WHERE id = $1::uuid`,
      [listingId, slug, status, currency, locName, PROVIDER, String(extRef)],
    )
  } else {
    const ins = await pgClient.query(
      `INSERT INTO listings (
         organization_id, category_id, slug, status, currency_code, location_name,
         listing_source, external_provider_code, external_listing_ref, last_synced_at
       ) VALUES ($1::uuid, $2, $3, $4, $5, $6, 'api', $7, $8, now())
       RETURNING id::text`,
      [ctx.orgId, ctx.categoryId, slug, status, currency, locName, PROVIDER, String(extRef)],
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

  return { listingId, slug, extRef, created: !existed }
}

// ── Tur upsert ──────────────────────────────────────────────────────────────

export async function upsertTravelrobotTourListing(
  pgClient,
  ctx,
  tour,
  { status = 'draft', dryRun = false } = {},
) {
  tour = normalizeSearchTourRow(tour)
  const ref = tourRef(tour)
  if (!ref) throw new Error('Travelrobot tur satırında TourCode/id yok')

  const slug = slugForTravelrobotTour(tour)
  const title = pickText(tour, 'TourName', 'tourName', 'Name', 'name') || `Tur ${ref}`
  const description = pickText(tour, 'TourProgram', 'tourProgram', 'Description', 'description')
  const locName = pickText(tour, 'RegionName', 'regionName', 'DestinationName', 'destinationName', 'Country', 'country') || null
  const currency = normalizeCurrency(tour?.Currency ?? tour?.currency)

  const core = await upsertListingCore(pgClient, ctx, {
    extRef: ref,
    slug,
    title,
    description,
    locName,
    currency,
    status,
    dryRun,
  })
  if (dryRun) return { ...core, action: 'dry-run', kind: 'tour' }

  await pgClient.query(
    `INSERT INTO listing_tour_details (listing_id, travelrobot_tour_code, is_manual, tour_format)
     VALUES ($1::uuid, $2, false, 'package')
     ON CONFLICT (listing_id) DO UPDATE SET
       travelrobot_tour_code = EXCLUDED.travelrobot_tour_code,
       is_manual = false,
       tour_format = 'package'`,
    [core.listingId, ref],
  )

  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'travelrobot', 'snapshot', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [core.listingId, JSON.stringify({ catalog: tour })],
  )

  // Görsel varsa ekle
  const imageUrl = pickText(tour, 'ImageUrl', 'imageUrl', 'PhotoUrl', 'photoUrl', 'ThumbnailUrl', 'thumbnailUrl')
  if (imageUrl) {
    await pgClient.query(
      `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime)
       VALUES ($1::uuid, 0, $2, 'image/jpeg')
       ON CONFLICT DO NOTHING`,
      [core.listingId, imageUrl],
    )
  }

  return { ...core, action: core.created ? 'created' : 'updated', kind: 'tour' }
}

// ── Otel upsert ─────────────────────────────────────────────────────────────

export async function upsertTravelrobotHotelListing(
  pgClient,
  ctx,
  hotel,
  { status = 'draft', dryRun = false } = {},
) {
  const ref = hotelRef(hotel)
  if (!ref) throw new Error('Travelrobot otel satırında HotelId/id yok')

  const slug = slugForTravelrobotHotel(hotel)
  const nested = hotel?.Hotel ?? hotel?.hotel
  const title =
    pickText(hotel, 'HotelName', 'hotelName', 'Name', 'name') ||
    pickText(nested ?? {}, 'HotelName', 'hotelName', 'Name', 'name') ||
    `Otel ${ref}`
  const description = pickText(hotel, 'Description', 'description', 'Details', 'details')
  const city = pickText(hotel, 'City', 'city', 'CityName', 'cityName')
  const country = pickText(hotel, 'Country', 'country', 'CountryName', 'countryName')
  const locName = [city, country].filter(Boolean).join(', ') || null

  const core = await upsertListingCore(pgClient, ctx, {
    extRef: ref,
    slug,
    title,
    description,
    locName,
    currency: 'TRY',
    status,
    dryRun,
  })
  if (dryRun) return { ...core, action: 'dry-run', kind: 'hotel' }

  const star = hotel?.StarRating ?? hotel?.starRating ?? hotel?.Stars ?? hotel?.stars ?? null
  const starNum = star != null ? Number(star) : null

  await pgClient.query(
    `INSERT INTO listing_hotel_details (listing_id, star_rating, travelrobot_hotel_code)
     VALUES ($1::uuid, $2, $3)
     ON CONFLICT (listing_id) DO UPDATE SET
       star_rating = COALESCE(EXCLUDED.star_rating, listing_hotel_details.star_rating),
       travelrobot_hotel_code = EXCLUDED.travelrobot_hotel_code`,
    [core.listingId, Number.isFinite(starNum) ? starNum : null, ref],
  )

  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'travelrobot', 'snapshot', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [core.listingId, JSON.stringify({ catalog: hotel })],
  )

  const imageUrl = pickText(hotel, 'ImageUrl', 'imageUrl', 'ThumbnailUrl', 'thumbnailUrl', 'PhotoUrl', 'photoUrl')
  if (imageUrl) {
    await pgClient.query(
      `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime)
       VALUES ($1::uuid, 0, $2, 'image/jpeg')
       ON CONFLICT DO NOTHING`,
      [core.listingId, imageUrl],
    )
  }

  return { ...core, action: core.created ? 'created' : 'updated', kind: 'hotel' }
}

// ── Uçak upsert ─────────────────────────────────────────────────────────────

export async function upsertTravelrobotFlightListing(
  pgClient,
  ctx,
  flight,
  { status = 'draft', dryRun = false } = {},
) {
  flight = normalizeFlightRow(flight)
  const routeKey = flightRouteKey(flight)
  if (!routeKey) throw new Error('Travelrobot uçuş satırında origin/destination yok')

  const slug = slugForTravelrobotFlight(flight)
  const origin = String(flight?.OriginCode ?? flight?.origin ?? flight?.DepartureAirport ?? '').toUpperCase()
  const dest = String(flight?.DestinationCode ?? flight?.destination ?? flight?.ArrivalAirport ?? '').toUpperCase()
  const title = flight?.label ?? (origin && dest ? `${origin} → ${dest}` : `Uçuş ${routeKey}`)
  const description = `Travelrobot uçuş rotası: ${origin} — ${dest}`

  const core = await upsertListingCore(pgClient, ctx, {
    extRef: routeKey,
    slug,
    title,
    description,
    locName: origin && dest ? `${origin} → ${dest}` : null,
    currency: 'TRY',
    status,
    dryRun,
  })
  if (dryRun) return { ...core, action: 'dry-run', kind: 'flight' }

  await pgClient.query(
    `INSERT INTO listing_flight_details (listing_id, travelrobot_flight_code)
     VALUES ($1::uuid, $2)
     ON CONFLICT (listing_id) DO UPDATE SET travelrobot_flight_code = EXCLUDED.travelrobot_flight_code`,
    [core.listingId, routeKey],
  )

  await pgClient.query(`DELETE FROM flight_legs WHERE listing_id = $1::uuid`, [core.listingId])
  if (origin && dest) {
    await pgClient.query(
      `INSERT INTO flight_legs (listing_id, mode, from_stop, to_stop)
       VALUES ($1::uuid, 'flight', $2, $3)`,
      [core.listingId, origin, dest],
    )
  }

  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'travelrobot', 'snapshot', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [core.listingId, JSON.stringify({ catalog: flight })],
  )

  return { ...core, action: core.created ? 'created' : 'updated', kind: 'flight' }
}

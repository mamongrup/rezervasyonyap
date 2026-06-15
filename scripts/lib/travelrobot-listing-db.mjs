/**
 * Travelrobot (KPlus) listing DB upsert — tur, otel, uçak.
 * GTC ve Wtatil DB modülleri ile aynı convention.
 */

const PROVIDER = 'travelrobot'
/** Sandbox/API anomali fiyatlarını vitrine taşıma (ör. 3.5B TRY). */
const MAX_SANE_NIGHTLY_TRY = 500_000

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

export function hotelRef(hotel) {
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

/** KPlus CDN bazen `/Assets/Img/no-logo.png` döner — CDN 500 verir, vitrinde boş kalır. */
function isKplusPlaceholderImage(url) {
  const u = String(url || '').trim()
  if (!u) return true
  if (/no-logo|nologo|no_logo|placeholder/i.test(u)) return true
  if (u.includes('bm8tbG9nby')) return true
  return false
}

function extractTourImageUrl(tour) {
  const nested = tourNode(tour)
  const medias = tour?.Medias ?? tour?.medias ?? nested?.Medias ?? nested?.medias ?? []
  const candidates = []
  for (const m of medias) {
    const u = pickText(m, 'Url', 'url', 'MediaUrl', 'mediaUrl', 'ImageUrl', 'imageUrl', 'Path', 'path')
    if (u) candidates.push(u)
  }
  candidates.push(
    pickText(tour, 'ImageUrl', 'imageUrl', 'LogoUrl', 'logoUrl'),
    pickText(nested ?? {}, 'Logo', 'logo', 'ImageUrl', 'imageUrl', 'LogoUrl', 'logoUrl'),
  )
  for (const c of candidates) {
    if (c && !isKplusPlaceholderImage(c)) return c
  }
  return ''
}

function normalizeCurrency(raw) {
  const c = String(raw ?? '').trim().toUpperCase()
  return ['TRY', 'EUR', 'USD', 'GBP'].includes(c) ? c : 'TRY'
}

export function collectHotelImageUrls(hotel) {
  const nested = hotel?.Hotel ?? hotel?.hotel
  const urls = []
  const push = (raw) => {
    const u = String(raw || '').trim()
    if (u && !isKplusPlaceholderImage(u) && !urls.includes(u)) urls.push(u)
  }
  push(
    pickText(hotel, 'HotelImageURL', 'hotelImageURL', 'ImageUrl', 'imageUrl', 'ThumbnailUrl', 'thumbnailUrl', 'CoverPhoto', 'coverPhoto') ||
      pickText(nested ?? {}, 'HotelImageURL', 'hotelImageURL', 'ImageUrl', 'imageUrl', 'ThumbnailUrl', 'thumbnailUrl', 'CoverPhoto', 'coverPhoto'),
  )
  for (const src of [hotel, nested]) {
    if (!src || typeof src !== 'object') continue
    for (const key of ['Images', 'images', 'Photos', 'photos', 'Medias', 'medias', 'Gallery', 'gallery', 'HotelImages', 'hotelImages', 'ImageList', 'imageList']) {
      const arr = src[key]
      if (!Array.isArray(arr)) continue
      for (const item of arr) {
        if (typeof item === 'string') push(item)
        else push(pickText(item, 'Url', 'url', 'ImageUrl', 'imageUrl', 'Path', 'path', 'Src', 'src', 'MediaUrl', 'mediaUrl'))
      }
    }
  }
  return urls
}

function extractHotelImageUrl(hotel) {
  return collectHotelImageUrls(hotel)[0] ?? ''
}

/** Static Content API yanıtını SearchHotel satırıyla birleştirir (görseller, açıklama). */
export function mergeStaticHotelContent(searchRow, staticRow) {
  if (!staticRow || typeof staticRow !== 'object') return searchRow
  const nestedSearch = searchRow?.Hotel ?? searchRow?.hotel ?? {}
  const nestedStatic = staticRow?.Hotel ?? staticRow?.hotel ?? staticRow
  const code = hotelRef(searchRow) || hotelRef(staticRow)
  return {
    ...searchRow,
    ...staticRow,
    HotelCode: code || searchRow?.HotelCode,
    HotelName:
      pickText(staticRow, 'HotelName', 'hotelName', 'Name', 'name') ||
      pickText(nestedStatic, 'HotelName', 'hotelName', 'Name', 'name') ||
      pickText(searchRow, 'HotelName', 'hotelName', 'Name', 'name'),
    Description:
      pickText(staticRow, 'Description', 'description', 'Details', 'details') ||
      pickText(nestedStatic, 'Description', 'description', 'Details', 'details') ||
      pickText(searchRow, 'Description', 'description', 'Details', 'details'),
    Images:
      staticRow?.HotelImages ??
      staticRow?.hotelImages ??
      staticRow?.Images ??
      staticRow?.images ??
      searchRow?.Images ??
      searchRow?.images,
    HotelImages:
      staticRow?.HotelImages ??
      staticRow?.hotelImages ??
      searchRow?.HotelImages ??
      searchRow?.hotelImages,
    Hotel: { ...nestedSearch, ...nestedStatic },
    Rooms: searchRow?.Rooms ?? searchRow?.rooms ?? staticRow?.Rooms ?? staticRow?.rooms,
  }
}

/** getBulkHotelContent chunk sonuçlarından kod → içerik haritası. */
export function buildStaticHotelMap(bulkResults) {
  const map = new Map()
  for (const chunk of bulkResults ?? []) {
    if (chunk?.error) continue
    const raw = chunk?.data
    const list = Array.isArray(raw)
      ? raw
      : raw?.Result ?? raw?.result ?? raw?.Hotels ?? raw?.hotels ?? []
    if (!Array.isArray(list)) continue
    for (const h of list) {
      const code = hotelRef(h)
      if (code) map.set(code, h)
    }
  }
  return map
}

/** SearchHotel satırında oda/teklif var mı (import zenginleştirme). */
export function hotelHasRooms(row) {
  const rooms = row?.Rooms ?? row?.rooms ?? []
  return (
    Array.isArray(rooms) &&
    rooms.some((r) => {
      const alts = r?.RoomAlternatives ?? r?.roomAlternatives ?? []
      if (alts.length) return true
      const name = pickText(r, 'Name', 'name', 'RoomName', 'roomName')
      return Boolean(name && name !== 'Standart Oda')
    })
  )
}

function extractHotelRoomRows(hotel) {
  const rooms = hotel?.Rooms ?? hotel?.rooms ?? []
  const raw = []
  for (const room of rooms) {
    const roomName = pickText(room, 'Name', 'name', 'RoomName', 'roomName') || 'Standart Oda'
    const alts = room?.RoomAlternatives ?? room?.roomAlternatives ?? []
    if (!alts.length) {
      raw.push({ name: roomName, boardType: null, price: null, currency: 'TRY', meta: {} })
      continue
    }
    for (const alt of alts) {
      const name = pickText(alt, 'RoomName', 'roomName', 'Name', 'name') || roomName
      const board = pickText(alt, 'BoardType', 'boardType', 'BoardName', 'boardName', 'MealType', 'mealType')
      const amount = Number(alt?.TotalAmount ?? alt?.totalAmount ?? alt?.BaseAmount ?? alt?.baseAmount ?? NaN)
      const currency = normalizeCurrency(alt?.CurrencyCode ?? alt?.currencyCode)
      const roomCode = pickText(alt, 'RoomCode', 'roomCode', 'Key', 'key')
      const image = pickText(alt, 'ImageUrl', 'imageUrl', 'RoomImageUrl', 'roomImageUrl')
      raw.push({
        name: name.slice(0, 200),
        boardType: board || null,
        price:
          Number.isFinite(amount) && amount > 0 && amount <= MAX_SANE_NIGHTLY_TRY ? amount : null,
        currency,
        meta: {
          travelrobot_room_code: roomCode || null,
          board_type: board || null,
          price: Number.isFinite(amount) && amount > 0 ? String(amount) : null,
          currency,
          ...(image && !isKplusPlaceholderImage(image) ? { image } : {}),
        },
      })
    }
  }
  // Aynı oda adı + farklı pansiyon → vitrinde tek satır (en ucuz teklif)
  const byName = new Map()
  for (const r of raw) {
    const key = r.name.toLowerCase().replace(/\s+/g, ' ').trim()
    const prev = byName.get(key)
    if (!prev) {
      byName.set(key, r)
      continue
    }
    const pPrev = prev.price ?? Number.POSITIVE_INFINITY
    const pNew = r.price ?? Number.POSITIVE_INFINITY
    if (pNew < pPrev) byName.set(key, r)
  }
  return [...byName.values()]
}

async function upsertHotelGallery(pgClient, listingId, urls) {
  const list = (urls ?? []).filter((u) => u && !isKplusPlaceholderImage(u))
  if (!list.length) {
    await clearListingCover(pgClient, listingId)
    return
  }
  await pgClient.query(
    `UPDATE listings SET featured_image_url = $2, thumbnail_url = $2, updated_at = now() WHERE id = $1::uuid`,
    [listingId, list[0]],
  )
  await pgClient.query(`DELETE FROM listing_images WHERE listing_id = $1::uuid`, [listingId])
  for (let i = 0; i < list.length; i++) {
    await pgClient.query(
      `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime)
       VALUES ($1::uuid, $2, $3, 'image/jpeg')`,
      [listingId, i, list[i]],
    )
  }
}

async function upsertTravelrobotHotelRooms(pgClient, listingId, hotel) {
  const rows = extractHotelRoomRows(hotel)
  // KPlus toplu arama odasız dönebilir; mevcut vitrin odalarını silme.
  if (!rows.length) return 0
  await pgClient.query(`DELETE FROM hotel_rooms WHERE listing_id = $1::uuid`, [listingId])
  for (const r of rows) {
    await pgClient.query(
      `INSERT INTO hotel_rooms (listing_id, name, capacity, board_type, meta_json)
       VALUES ($1::uuid, $2, NULL, $3, $4::jsonb)`,
      [listingId, r.name, r.boardType, JSON.stringify(r.meta)],
    )
  }
  return rows.length
}

function extractHotelMinNightlyPrice(hotel) {
  const rooms = hotel?.Rooms ?? hotel?.rooms ?? []
  let min = null
  for (const room of rooms) {
    const alts = room?.RoomAlternatives ?? room?.roomAlternatives ?? []
    for (const alt of alts) {
      const amount = Number(
        alt?.TotalAmount ?? alt?.totalAmount ?? alt?.BaseAmount ?? alt?.baseAmount ?? NaN,
      )
      if (
        Number.isFinite(amount) &&
        amount > 0 &&
        amount <= MAX_SANE_NIGHTLY_TRY &&
        (min == null || amount < min)
      ) {
        min = amount
      }
    }
  }
  return min
}

function extractFlightMinPrice(flight) {
  const fares = flight?.Fares ?? flight?.fares ?? []
  let min = null
  for (const fare of fares) {
    const paxes = fare?.PassengerFares ?? fare?.passengerFares ?? []
    for (const pax of paxes) {
      const amount = Number(
        pax?.Price?.TotalAmount ?? pax?.price?.totalAmount ?? pax?.Price?.BaseAmount ?? NaN,
      )
      if (
        Number.isFinite(amount) &&
        amount > 0 &&
        amount <= MAX_SANE_NIGHTLY_TRY &&
        (min == null || amount < min)
      ) {
        min = amount
      }
    }
  }
  return min
}

function extractTourPriceAmount(tour) {
  const price = tour?.Price ?? tour?.price
  const amount = Number(price?.TotalAmount ?? price?.totalAmount ?? price?.BaseAmount ?? price?.baseAmount ?? NaN)
  return Number.isFinite(amount) && amount > 0 && amount <= MAX_SANE_NIGHTLY_TRY ? amount : null
}

async function clearListingCover(pgClient, listingId) {
  await pgClient.query(
    `UPDATE listings SET featured_image_url = NULL, thumbnail_url = NULL, updated_at = now() WHERE id = $1::uuid`,
    [listingId],
  )
  await pgClient.query(`DELETE FROM listing_images WHERE listing_id = $1::uuid`, [listingId])
}

async function upsertListingCover(pgClient, listingId, imageUrl) {
  const url = String(imageUrl || '').trim()
  if (!url || isKplusPlaceholderImage(url)) return
  await pgClient.query(
    `UPDATE listings SET featured_image_url = $2, thumbnail_url = $2, updated_at = now() WHERE id = $1::uuid`,
    [listingId, url],
  )
  await pgClient.query(`DELETE FROM listing_images WHERE listing_id = $1::uuid`, [listingId])
  await pgClient.query(
    `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime)
     VALUES ($1::uuid, 0, $2, 'image/jpeg')`,
    [listingId, url],
  )
}

async function upsertNightlyPriceRule(pgClient, listingId, amount, currency = 'TRY') {
  await pgClient.query(`DELETE FROM listing_price_rules WHERE listing_id = $1::uuid`, [listingId])
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return
  await pgClient.query(
    `INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
     VALUES ($1::uuid, $2::jsonb, NULL, NULL)`,
    [
      listingId,
      JSON.stringify({
        base_nightly: String(amount),
        base_price: String(amount),
        source: PROVIDER,
        currency,
      }),
    ],
  )
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

  const tourImageUrl = extractTourImageUrl(tour)
  if (tourImageUrl) {
    await upsertListingCover(pgClient, core.listingId, tourImageUrl)
  } else {
    await clearListingCover(pgClient, core.listingId)
  }

  const tourPrice = extractTourPriceAmount(tour)
  if (tourPrice != null) {
    await pgClient.query(
      `UPDATE listing_tour_details
       SET program_days_json = COALESCE(program_days_json, '{}'::jsonb) || $2::jsonb
       WHERE listing_id = $1::uuid`,
      [
        core.listingId,
        JSON.stringify({
          cheapest_price: { value: String(tourPrice), currency: normalizeCurrency(tour?.Currency) },
        }),
      ],
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
  const city = pickText(nested ?? {}, 'City', 'city', 'CityName', 'cityName', 'Location', 'location')
  const country = pickText(nested ?? {}, 'Country', 'country', 'CountryName', 'countryName', 'CountryCode', 'countryCode')
  const locName =
    pickText(nested ?? {}, 'FullLocation', 'fullLocation', 'Location', 'location') ||
    [city, country].filter(Boolean).join(', ') ||
    null
  const nightlyPrice = extractHotelMinNightlyPrice(hotel)
  const currency = normalizeCurrency(
    hotel?.Rooms?.[0]?.RoomAlternatives?.[0]?.CurrencyCode ?? nested?.CurrencyCode ?? 'TRY',
  )

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
  if (dryRun) return { ...core, action: 'dry-run', kind: 'hotel' }

  const geo = nested?.GeoLocation ?? nested?.geoLocation
  const lat = geo?.Latitude ?? geo?.latitude
  const lng = geo?.Longitude ?? geo?.longitude
  if (lat != null && lng != null) {
    await pgClient.query(
      `UPDATE listings SET map_lat = $2, map_lng = $3, updated_at = now() WHERE id = $1::uuid`,
      [core.listingId, Number(lat), Number(lng)],
    )
  }

  const star = nested?.Star ?? hotel?.Star ?? hotel?.StarRating ?? hotel?.starRating ?? hotel?.Stars ?? hotel?.stars ?? null
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

  const galleryUrls = collectHotelImageUrls(hotel)
  if (galleryUrls.length) {
    await upsertHotelGallery(pgClient, core.listingId, galleryUrls)
  } else {
    await clearListingCover(pgClient, core.listingId)
  }

  const roomCount = await upsertTravelrobotHotelRooms(pgClient, core.listingId, hotel)
  const priceFromRooms = extractHotelMinNightlyPrice(hotel)
  await upsertNightlyPriceRule(pgClient, core.listingId, priceFromRooms ?? nightlyPrice, currency)

  return {
    ...core,
    action: core.created ? 'created' : 'updated',
    kind: 'hotel',
    roomCount,
    imageCount: galleryUrls.length,
  }
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

  const flightPrice = extractFlightMinPrice(flight)
  await upsertNightlyPriceRule(pgClient, core.listingId, flightPrice, 'TRY')

  return { ...core, action: core.created ? 'created' : 'updated', kind: 'flight', price: flightPrice }
}

import { hotelDisplayFields, hotelItemId } from './gtc-api.mjs'

const PROVIDER = 'gtc'

function slugify(text, fallback) {
  let base = String(text || fallback || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (!base) base = String(fallback || 'ilan').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  return base.slice(0, 120).replace(/-+$/g, '')
}

export function slugForGtcHotel(row) {
  const itemId = hotelItemId(row)
  const { name } = hotelDisplayFields(row)
  const suffix = itemId ? `-gtc-${itemId}` : '-gtc'
  const maxBase = Math.max(8, 120 - suffix.length)
  return `${slugify(name, `otel-${itemId || 'x'}`).slice(0, maxBase)}${suffix}`
}

export function routeKey(route) {
  const o = String(route.origin || '').trim().toLowerCase()
  const d = String(route.destination || '').trim().toLowerCase()
  return `${o}-${d}`
}

export function slugForGtcFlight(route) {
  const key = routeKey(route)
  const label = route.label || `${route.origin}-${route.destination}`
  const suffix = `-gtc-${key}`
  const maxBase = Math.max(8, 120 - suffix.length)
  return `${slugify(label, key).slice(0, maxBase)}${suffix}`
}

export async function resolveImportContext(pgClient, orgId, categoryCode) {
  const cat = await pgClient.query(`SELECT id FROM product_categories WHERE code = $1 LIMIT 1`, [
    categoryCode,
  ])
  if (!cat.rows[0]) throw new Error(`product_categories.code = '${categoryCode}' bulunamadı`)
  const loc = await pgClient.query(`SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1`)
  if (!loc.rows[0]) throw new Error("locales.code = 'tr' bulunamadı")
  return {
    categoryId: cat.rows[0].id,
    localeTrId: loc.rows[0].id,
    orgId,
  }
}

export async function findListingByGtcRef(pgClient, orgId, extRef) {
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

async function upsertListingCore(pgClient, ctx, { extRef, slug, title, description, locName, status, dryRun }) {
  if (dryRun) {
    return { listingId: null, slug, extRef, created: false, dryRun: true }
  }

  let listingId = await findListingByGtcRef(pgClient, ctx.orgId, extRef)
  const existed = Boolean(listingId)

  if (listingId) {
    await pgClient.query(
      `UPDATE listings SET
         slug = $2, status = $3, currency_code = 'TRY', location_name = $4,
         listing_source = 'api', external_provider_code = $5, external_listing_ref = $6,
         last_synced_at = now(), updated_at = now()
       WHERE id = $1::uuid`,
      [listingId, slug, status, locName, PROVIDER, String(extRef)],
    )
  } else {
    const ins = await pgClient.query(
      `INSERT INTO listings (
         organization_id, category_id, slug, status, currency_code, location_name,
         listing_source, external_provider_code, external_listing_ref, last_synced_at
       ) VALUES ($1::uuid, $2, $3, $4, 'TRY', $5, 'api', $6, $7, now())
       RETURNING id::text`,
      [ctx.orgId, ctx.categoryId, slug, status, locName, PROVIDER, String(extRef)],
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

export async function upsertGtcHotelListing(
  pgClient,
  ctx,
  row,
  { detail = null, status = 'draft', dryRun = false } = {},
) {
  const itemId = hotelItemId(row)
  if (!itemId) throw new Error('GTC otel satırında ItemId yok')
  const { name, city, country, star, desc } = hotelDisplayFields(row)
  const slug = slugForGtcHotel(row)
  const locName = [city, country].filter(Boolean).join(', ') || null
  const title = name || `Otel ${itemId}`
  const description = desc || null

  const core = await upsertListingCore(pgClient, ctx, {
    extRef: itemId,
    slug,
    title,
    description,
    locName,
    status,
    dryRun,
  })
  if (dryRun) return { ...core, action: 'dry-run', kind: 'hotel' }

  const starNum = star != null && star !== '' ? Number(star) : null
  await pgClient.query(
    `INSERT INTO listing_hotel_details (listing_id, star_rating, gtc_item_id)
     VALUES ($1::uuid, $2, $3)
     ON CONFLICT (listing_id) DO UPDATE SET
       star_rating = COALESCE(EXCLUDED.star_rating, listing_hotel_details.star_rating),
       gtc_item_id = EXCLUDED.gtc_item_id`,
    [core.listingId, Number.isFinite(starNum) ? starNum : null, itemId],
  )

  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'gtc', 'snapshot', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [core.listingId, JSON.stringify({ catalog: row, detail })],
  )

  return { ...core, action: core.created ? 'created' : 'updated', kind: 'hotel' }
}

export async function upsertGtcFlightListing(
  pgClient,
  ctx,
  route,
  searchPayload,
  { status = 'draft', dryRun = false } = {},
) {
  const key = routeKey(route)
  const slug = slugForGtcFlight(route)
  const title = route.label || `${route.origin} → ${route.destination}`
  const description = `GTC uçuş rotası: ${route.origin} — ${route.destination}`

  const core = await upsertListingCore(pgClient, ctx, {
    extRef: key,
    slug,
    title,
    description,
    locName: `${route.origin} → ${route.destination}`,
    status,
    dryRun,
  })
  if (dryRun) return { ...core, action: 'dry-run', kind: 'flight' }

  await pgClient.query(
    `INSERT INTO listing_flight_details (listing_id, gtc_route_key)
     VALUES ($1::uuid, $2)
     ON CONFLICT (listing_id) DO UPDATE SET gtc_route_key = EXCLUDED.gtc_route_key`,
    [core.listingId, key],
  )

  await pgClient.query(`DELETE FROM flight_legs WHERE listing_id = $1::uuid`, [core.listingId])
  await pgClient.query(
    `INSERT INTO flight_legs (listing_id, mode, from_stop, to_stop)
     VALUES ($1::uuid, 'flight', $2, $3)`,
    [core.listingId, String(route.origin).toUpperCase(), String(route.destination).toUpperCase()],
  )

  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'gtc', 'snapshot', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [core.listingId, JSON.stringify({ route, search: searchPayload })],
  )

  return { ...core, action: core.created ? 'created' : 'updated', kind: 'flight' }
}

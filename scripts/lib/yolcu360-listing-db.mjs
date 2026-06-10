import { carTitle } from './yolcu360-cars.mjs'

const PROVIDER = 'yolcu360'

function slugify(text, fallback) {
  let base = String(text || fallback || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (!base) base = String(fallback || 'arac').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  return base.slice(0, 120).replace(/-+$/g, '')
}

export function routeKey(route) {
  const pickup = String(route.pickup || '').trim().toLowerCase()
  const dropoff = String(route.dropoff || route.pickup || '').trim().toLowerCase()
  return pickup === dropoff ? pickup : `${pickup}-${dropoff}`
}

export function extRefForCar(route, carId) {
  return `${routeKey(route)}::${String(carId)}`
}

export function slugForYolcu360Car(route, car) {
  const title = carTitle(car)
  const key = routeKey(route)
  const shortId = String(car.id || '0').replace(/[^a-zA-Z0-9]+/g, '').slice(0, 24)
  const suffix = `-yolcu360-${key}-${shortId}`
  const maxBase = Math.max(8, 120 - suffix.length)
  return `${slugify(title, key).slice(0, maxBase)}${suffix}`
}

export async function resolveImportContext(pgClient, orgId) {
  const cat = await pgClient.query(`SELECT id FROM product_categories WHERE code = 'car_rental' LIMIT 1`)
  if (!cat.rows[0]) throw new Error("product_categories.code = 'car_rental' bulunamadı")
  const loc = await pgClient.query(`SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1`)
  if (!loc.rows[0]) throw new Error("locales.code = 'tr' bulunamadı")
  return {
    categoryId: cat.rows[0].id,
    localeTrId: loc.rows[0].id,
    orgId,
  }
}

export async function findListingByYolcu360Ref(pgClient, orgId, extRef) {
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

async function upsertListingCover(pgClient, listingId, imageUrl) {
  const url = String(imageUrl || '').trim()
  if (!url) return
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

async function upsertDailyPriceRule(pgClient, listingId, amount, currency = 'TRY') {
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
        price_unit: 'daily',
      }),
    ],
  )
}

async function upsertListingCore(pgClient, ctx, { extRef, slug, title, description, locName, status, dryRun }) {
  if (dryRun) return { listingId: null, slug, extRef, created: false, dryRun: true }

  let listingId = await findListingByYolcu360Ref(pgClient, ctx.orgId, extRef)
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

export async function upsertYolcu360CarListing(
  pgClient,
  ctx,
  route,
  car,
  searchPayload,
  { status = 'published', dryRun = false } = {},
) {
  const extRef = extRefForCar(route, car.id)
  const slug = slugForYolcu360Car(route, car)
  const title = carTitle(car)
  const routeLabel = route.label || routeKey(route)
  const vendor = car.vendorName ? ` · ${car.vendorName}` : ''
  const description = `Yolcu360 araç kiralama: ${title}${vendor} (${routeLabel})`

  const core = await upsertListingCore(pgClient, ctx, {
    extRef,
    slug,
    title,
    description,
    locName: routeLabel,
    status,
    dryRun,
  })
  if (dryRun) {
    return {
      ...core,
      action: 'dry-run',
      kind: 'car_rental',
      price: car.dailyPrice ?? null,
    }
  }

  await pgClient.query(
    `INSERT INTO listing_car_rental_details (
       listing_id, vehicle_class, transmission, fuel_type, yolcu360_product_ref
     ) VALUES ($1::uuid, $2, $3, $4, $5)
     ON CONFLICT (listing_id) DO UPDATE SET
       vehicle_class = EXCLUDED.vehicle_class,
       transmission = EXCLUDED.transmission,
       fuel_type = EXCLUDED.fuel_type,
       yolcu360_product_ref = EXCLUDED.yolcu360_product_ref`,
    [
      core.listingId,
      car.vehicleClass || null,
      car.transmission || null,
      car.fuelType || null,
      String(car.id),
    ],
  )

  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'yolcu360', 'snapshot', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [
      core.listingId,
      JSON.stringify({
        route,
        car,
        search: searchPayload,
      }),
    ],
  )

  const imageUrl = car.imageUrl || car.thumbnailUrl
  if (imageUrl) await upsertListingCover(pgClient, core.listingId, imageUrl)

  const dailyPrice = car.dailyPrice
  const currency = car.currency || 'TRY'
  if (dailyPrice != null && Number.isFinite(dailyPrice) && dailyPrice > 0) {
    await upsertDailyPriceRule(pgClient, core.listingId, dailyPrice, currency)
    await pgClient.query(
      `UPDATE listings SET currency_code = $2, updated_at = now() WHERE id = $1::uuid`,
      [core.listingId, currency],
    )
  }

  return {
    ...core,
    action: core.created ? 'created' : 'updated',
    kind: 'car_rental',
    price: dailyPrice ?? null,
  }
}

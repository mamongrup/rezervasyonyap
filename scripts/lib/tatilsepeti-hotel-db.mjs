/**
 * Tatilsepeti otelleri — PostgreSQL upsert (provider: tatilsepeti).
 */
import { scoreHotelPackage } from './tatilsepeti-hotel-api.mjs'

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

export function slugForTatilsepetiHotel(pkg) {
  const base = slugify(pkg.slug || pkg.name)
  const suffix = `-ts-${pkg.hotelId}`
  const maxBase = Math.max(8, 120 - suffix.length)
  return `${base.slice(0, maxBase)}${suffix}`
}

export async function resolveTatilsepetiImportContext(pgClient, orgId) {
  const cat = await pgClient.query(
    `SELECT id FROM product_categories WHERE code = 'hotel' LIMIT 1`,
  )
  if (!cat.rows[0]) throw new Error("product_categories.code = 'hotel' bulunamadı")
  const loc = await pgClient.query(`SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1`)
  if (!loc.rows[0]) throw new Error("locales.code = 'tr' bulunamadı")
  return { categoryId: cat.rows[0].id, localeTrId: loc.rows[0].id, orgId }
}

export async function findListingByTatilsepetiRef(pgClient, orgId, hotelId) {
  const r = await pgClient.query(
    `SELECT id::text FROM listings
     WHERE organization_id = $1::uuid
       AND external_provider_code = $2
       AND external_listing_ref = $3
     LIMIT 1`,
    [orgId, PROVIDER, String(hotelId)],
  )
  return r.rows[0]?.id || null
}

function parseStarFromFeatures(features, locationRows) {
  for (const row of locationRows || []) {
    const m = String(row.value || '').match(/(\d)\s*yıldız/i)
    if (m) return Number(m[1])
  }
  for (const f of features || []) {
    const m = String(f.name || '').match(/(\d)\s*yıldız/i)
    if (m) return Number(m[1])
  }
  return null
}

async function upsertGallery(pgClient, listingId, urls) {
  const list = [...new Set((urls || []).filter(Boolean))]
  if (!list.length) return 0
  await pgClient.query(
    `UPDATE listings SET featured_image_url = $2, thumbnail_url = $2, updated_at = now() WHERE id = $1::uuid`,
    [listingId, list[0]],
  )
  await pgClient.query(`DELETE FROM listing_images WHERE listing_id = $1::uuid`, [listingId])
  for (let i = 0; i < list.length; i++) {
    await pgClient.query(
      `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime, alt_text_key)
       VALUES ($1::uuid, $2, $3, 'image/jpeg', null)`,
      [listingId, i, list[i]],
    )
  }
  return list.length
}

async function upsertAmenities(pgClient, listingId, features) {
  if (!features?.length) return 0
  const items = features.map((f) => ({
    group: f.group || 'general',
    name: f.name,
  }))
  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'otel_kplus', 'v1', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [listingId, JSON.stringify({ items, source: PROVIDER })],
  )
  return items.length
}

async function upsertVerticalHotel(pgClient, listingId, pkg) {
  const payload = {
    check_in: pkg.checkInTime,
    check_out: pkg.checkOutTime,
    pension_type: pkg.pensionType,
    guest_score: pkg.guestScore,
    review_count: pkg.reviewCount,
    theme: pkg.theme,
    location_rows: pkg.locationRows,
    source: PROVIDER,
    tatilsepeti_url: pkg.url,
  }
  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'vertical_hotel', 'v1', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [listingId, JSON.stringify(payload)],
  )
}

function mapBoardToPlanCode(board) {
  const b = String(board || '').toLowerCase()
  if (/ultra|her.?şey|all.?inclusive|uhd/i.test(b)) return 'all_inclusive'
  if (/tam pansiyon|full board/i.test(b)) return 'full_board'
  if (/yarım|half/i.test(b)) return 'half_board'
  if (/kahvalt|breakfast|oda kahvalt/i.test(b)) return 'bed_breakfast'
  if (/yemeksiz|room only/i.test(b)) return 'room_only'
  return 'custom'
}

async function upsertRoomsAndPrices(pgClient, listingId, pkg) {
  const rooms = pkg.rooms || []
  await pgClient.query(`DELETE FROM hotel_rooms WHERE listing_id = $1::uuid`, [listingId])
  await pgClient.query(`DELETE FROM listing_meal_plans WHERE listing_id = $1::uuid`, [listingId])
  await pgClient.query(`DELETE FROM listing_price_rules WHERE listing_id = $1::uuid`, [listingId])

  let roomCount = 0
  let mealPlanCount = 0
  const mealBest = new Map()

  for (const room of rooms) {
    await pgClient.query(
      `INSERT INTO hotel_rooms (listing_id, name, capacity, board_type, meta_json, unit_count)
       VALUES ($1::uuid, $2, $3, $4, $5::jsonb, 1)`,
      [
        listingId,
        room.name,
        null,
        room.boardType || pkg.pensionType || null,
        JSON.stringify({
          tatilsepeti_room_type_id: room.roomTypeId,
          capacity_text: room.capacityText,
          features: room.features,
          image: room.image,
          seasonal_prices: room.seasonalPrices || [],
        }),
      ],
    )
    roomCount++

    for (const row of room.seasonalPrices || []) {
      const boardLabel = String(row.priceType || room.boardType || pkg.pensionType || 'Oda')
        .split('\n')[0]
        .trim()
      const planCode = mapBoardToPlanCode(boardLabel)
      const price = row.doublePerPerson ?? row.singlePrice
      if (price == null) continue
      const prev = mealBest.get(planCode)
      if (!prev || price < prev.price) {
        mealBest.set(planCode, {
          planCode,
          label: boardLabel.slice(0, 120) || planCode,
          price,
          notes: `tatilsepeti:${room.roomTypeId}:${row.dateRange}`,
        })
      }
    }
  }

  let sort = 0
  for (const plan of mealBest.values()) {
    await pgClient.query(
      `INSERT INTO listing_meal_plans (
         listing_id, plan_code, label, label_en, price_per_night, currency_code, sort_order, notes, is_active
       ) VALUES ($1::uuid, $2, $3, $4, $5, 'TRY', $6, $7, true)
       ON CONFLICT (listing_id, plan_code) DO UPDATE SET
         price_per_night = LEAST(listing_meal_plans.price_per_night, EXCLUDED.price_per_night),
         label = EXCLUDED.label,
         notes = EXCLUDED.notes`,
      [listingId, plan.planCode, plan.label, plan.label, plan.price, sort++, plan.notes],
    )
    mealPlanCount++
  }

  if (pkg.minNightlyPrice != null && pkg.minNightlyPrice > 0) {
    await pgClient.query(
      `INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
       VALUES ($1::uuid, $2::jsonb, NULL, NULL)`,
      [
        listingId,
        JSON.stringify({
          base_nightly: String(pkg.minNightlyPrice),
          base_price: String(pkg.minNightlyPrice),
          source: PROVIDER,
          currency: 'TRY',
        }),
      ],
    )
    await pgClient.query(
      `UPDATE listings SET first_charge_amount = $2, vitrin_price = $2, currency_code = 'TRY', updated_at = now()
       WHERE id = $1::uuid`,
      [listingId, pkg.minNightlyPrice],
    )
  }

  return { roomCount, mealPlanCount }
}

/**
 * @param {import('pg').Client} pgClient
 */
export async function upsertTatilsepetiHotelListing(
  pgClient,
  ctx,
  pkg,
  { status = 'draft', dryRun = false } = {},
) {
  const completeness = scoreHotelPackage(pkg)
  const extRef = String(pkg.hotelId)
  const slug = slugForTatilsepetiHotel(pkg)
  const title = String(pkg.name || `Otel ${extRef}`).trim()
  const description = pkg.description || null
  const locName = pkg.region || null
  const star = parseStarFromFeatures(pkg.features, pkg.locationRows)

  if (dryRun) {
    return {
      action: 'dry-run',
      slug,
      hotelId: extRef,
      completeness,
      imageCount: pkg.gallery?.length || 0,
      roomCount: pkg.rooms?.length || 0,
    }
  }

  let listingId = await findListingByTatilsepetiRef(pgClient, ctx.orgId, extRef)
  const created = !listingId

  if (listingId) {
    await pgClient.query(
      `UPDATE listings SET
         slug = $2,
         status = CASE WHEN status = 'published' THEN status ELSE $3 END,
         currency_code = 'TRY',
         location_name = $4,
         listing_source = 'api',
         external_provider_code = $5,
         external_listing_ref = $6,
         last_synced_at = now(),
         updated_at = now()
       WHERE id = $1::uuid`,
      [listingId, slug, status, locName, PROVIDER, extRef],
    )
  } else {
    const ins = await pgClient.query(
      `INSERT INTO listings (
         organization_id, category_id, slug, status, currency_code, location_name,
         listing_source, external_provider_code, external_listing_ref, last_synced_at
       ) VALUES ($1::uuid, $2, $3, $4, 'TRY', $5, 'api', $6, $7, now())
       RETURNING id::text`,
      [ctx.orgId, ctx.categoryId, slug, status, locName, PROVIDER, extRef],
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

  await pgClient.query(
    `INSERT INTO listing_hotel_details (listing_id, star_rating)
     VALUES ($1::uuid, $2)
     ON CONFLICT (listing_id) DO UPDATE SET
       star_rating = COALESCE(EXCLUDED.star_rating, listing_hotel_details.star_rating)`,
    [listingId, star],
  )

  const imageCount = await upsertGallery(pgClient, listingId, pkg.gallery)
  const amenityCount = await upsertAmenities(pgClient, listingId, pkg.features)
  await upsertVerticalHotel(pgClient, listingId, pkg)
  const { roomCount, mealPlanCount } = await upsertRoomsAndPrices(pgClient, listingId, pkg)

  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'tatilsepeti', 'snapshot', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [
      listingId,
      JSON.stringify({
        catalog: pkg,
        completeness,
        imported_at: new Date().toISOString(),
      }),
    ],
  )

  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'listing_meta', 'v1', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
       value_json = listing_attributes.value_json || EXCLUDED.value_json`,
    [
      listingId,
      JSON.stringify({
        phone: '444 44 20',
        check_in: pkg.checkInTime,
        check_out: pkg.checkOutTime,
        source_url: pkg.url,
      }),
    ],
  )

  return {
    action: created ? 'created' : 'updated',
    listingId,
    slug,
    hotelId: extRef,
    imageCount,
    roomCount,
    mealPlanCount,
    amenityCount,
    completeness,
  }
}

/**
 * Travelrobot otel ek alanları — DB yazımı.
 */
import {
  buildTravelrobotHotelRoomRows,
  extractTravelrobotMealPlans,
  extractTravelrobotCancellationText,
  extractTravelrobotListingMeta,
  extractTravelrobotSeasonalPriceRules,
  extractTravelrobotTranslations,
  extractHotelMinNightlyPrice,
  collectHotelGalleryEntries,
} from './travelrobot-hotel-extras.mjs'

const TRAVELROBOT_MEAL_NOTES = 'source:travelrobot'

function isKplusPlaceholderImage(url) {
  const u = String(url || '').trim()
  if (!u) return true
  if (/no-logo|nologo|no_logo|placeholder/i.test(u)) return true
  if (u.includes('bm8tbG9nby')) return true
  return false
}

async function readListingMeta(pgClient, listingId) {
  const ex = await pgClient.query(
    `SELECT value_json FROM listing_attributes
     WHERE listing_id = $1::uuid AND group_code = 'listing_meta' AND key = 'v1'`,
    [listingId],
  )
  return ex.rows[0]?.value_json && typeof ex.rows[0].value_json === 'object'
    ? { ...ex.rows[0].value_json }
    : {}
}

async function upsertListingMeta(pgClient, listingId, patch, overwrite) {
  const prev = overwrite ? {} : await readListingMeta(pgClient, listingId)
  const merged = { ...prev }
  for (const [k, v] of Object.entries(patch)) {
    if (v == null || v === '') continue
    if (overwrite || !String(merged[k] ?? '').trim()) merged[k] = v
  }
  if (!Object.keys(merged).length) return false
  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'listing_meta', 'v1', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [listingId, JSON.stringify(merged)],
  )
  return true
}

export async function upsertTravelrobotHotelGallery(pgClient, listingId, hotel) {
  const entries = collectHotelGalleryEntries(hotel).filter((e) => e.url && !isKplusPlaceholderImage(e.url))
  if (!entries.length) return 0
  await pgClient.query(
    `UPDATE listings SET featured_image_url = $2, thumbnail_url = $2, updated_at = now() WHERE id = $1::uuid`,
    [listingId, entries[0].url],
  )
  await pgClient.query(`DELETE FROM listing_images WHERE listing_id = $1::uuid`, [listingId])
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    await pgClient.query(
      `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime, alt_text_key)
       VALUES ($1::uuid, $2, $3, 'image/jpeg', $4)`,
      [listingId, i, e.url, e.title ? e.title.slice(0, 120) : null],
    )
  }
  return entries.length
}

export async function upsertTravelrobotHotelRoomsWithExtras(pgClient, listingId, hotel) {
  const rows = buildTravelrobotHotelRoomRows(hotel)
  if (!rows.length) return { count: 0, roomIdsByKey: new Map(), skipped: true }

  await pgClient.query(`DELETE FROM hotel_rooms WHERE listing_id = $1::uuid`, [listingId])
  const roomIdsByKey = new Map()

  for (const r of rows) {
    const ins = await pgClient.query(
      `INSERT INTO hotel_rooms (listing_id, name, capacity, board_type, meta_json, unit_count)
       VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6)
       RETURNING id::text`,
      [
        listingId,
        r.name,
        r.capacity,
        r.boardType,
        JSON.stringify(r.meta),
        Math.max(1, Math.min(r.unitCount ?? 1, 99)),
      ],
    )
    const id = ins.rows[0]?.id
    if (id) {
      roomIdsByKey.set(r.name.toLowerCase().replace(/\s+/g, ' ').trim(), {
        id,
        dailyCalendar: r.dailyCalendar ?? [],
      })
    }
  }

  return { count: rows.length, roomIdsByKey, skipped: false }
}

export async function upsertTravelrobotRoomAvailabilityCalendar(pgClient, listingId, roomIdsByKey, overwrite) {
  if (!roomIdsByKey?.size) return 0

  if (overwrite) {
    await pgClient.query(
      `DELETE FROM hotel_room_availability_calendar c
       USING hotel_rooms hr
       WHERE c.hotel_room_id = hr.id AND hr.listing_id = $1::uuid`,
      [listingId],
    )
  }

  let n = 0
  for (const { id, dailyCalendar } of roomIdsByKey.values()) {
    for (const row of dailyCalendar) {
      if (!row?.day || row.price == null) continue
      await pgClient.query(
        `INSERT INTO hotel_room_availability_calendar (hotel_room_id, day, available_units, price_override)
         VALUES ($1::uuid, $2::date, $3, $4)
         ON CONFLICT (hotel_room_id, day) DO UPDATE SET
           available_units = EXCLUDED.available_units,
           price_override = EXCLUDED.price_override`,
        [id, row.day, Math.max(0, row.available_units ?? 1), row.price],
      )
      n++
    }
  }
  return n
}

export async function upsertTravelrobotMealPlans(pgClient, listingId, hotel, currency, overwrite) {
  const plans = extractTravelrobotMealPlans(hotel, currency)
  if (!plans.length) return 0

  if (overwrite) {
    await pgClient.query(
      `DELETE FROM listing_meal_plans WHERE listing_id = $1::uuid AND notes = $2`,
      [listingId, TRAVELROBOT_MEAL_NOTES],
    )
  }

  let n = 0
  for (const p of plans) {
    const price = Number(p.price_per_night)
    if (!Number.isFinite(price) || price <= 0) continue
    await pgClient.query(
      `INSERT INTO listing_meal_plans (
         listing_id, plan_code, label, label_en, price_per_night, currency_code, sort_order, notes, is_active
       ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, true)
       ON CONFLICT (listing_id, plan_code) DO UPDATE SET
         label = CASE WHEN listing_meal_plans.notes = $8 OR $9 THEN EXCLUDED.label ELSE listing_meal_plans.label END,
         label_en = CASE WHEN listing_meal_plans.notes = $8 OR $9 THEN EXCLUDED.label_en ELSE listing_meal_plans.label_en END,
         price_per_night = CASE WHEN listing_meal_plans.notes = $8 OR $9 THEN EXCLUDED.price_per_night ELSE listing_meal_plans.price_per_night END,
         currency_code = EXCLUDED.currency_code,
         sort_order = EXCLUDED.sort_order,
         notes = CASE WHEN $9 THEN EXCLUDED.notes ELSE listing_meal_plans.notes END`,
      [
        listingId,
        p.plan_code,
        p.label,
        p.label_en,
        price,
        p.currency_code || currency,
        p.sort_order,
        TRAVELROBOT_MEAL_NOTES,
        overwrite,
      ],
    )
    n++
  }
  return n
}

export async function upsertTravelrobotPriceRules(pgClient, listingId, hotel, currency, overwrite) {
  const seasonal = extractTravelrobotSeasonalPriceRules(hotel, currency)
  const flatMin = extractHotelMinNightlyPrice(hotel)

  if (overwrite || seasonal.length) {
    await pgClient.query(`DELETE FROM listing_price_rules WHERE listing_id = $1::uuid`, [listingId])
  } else if (flatMin != null) {
    const ex = await pgClient.query(
      `SELECT count(*)::int AS n FROM listing_price_rules WHERE listing_id = $1::uuid`,
      [listingId],
    )
    if ((ex.rows[0]?.n ?? 0) > 0) return 0
  }

  let n = 0
  if (seasonal.length) {
    for (const band of seasonal) {
      await pgClient.query(
        `INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
         VALUES ($1::uuid, $2::jsonb, $3::date, $4::date)`,
        [listingId, JSON.stringify(band.rule_json), band.valid_from, band.valid_to],
      )
      n++
    }
    return n
  }

  if (flatMin == null) return 0
  await pgClient.query(
    `INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
     VALUES ($1::uuid, $2::jsonb, NULL, NULL)`,
    [
      listingId,
      JSON.stringify({
        base_nightly: String(flatMin),
        base_price: String(flatMin),
        source: 'travelrobot',
        currency,
      }),
    ],
  )
  return 1
}

export async function upsertTravelrobotCancellationPolicy(pgClient, listingId, hotel, overwrite) {
  const text = extractTravelrobotCancellationText(hotel)
  if (!text) return false
  await pgClient.query(
    `UPDATE listings SET
       cancellation_policy_text = CASE WHEN $3 OR coalesce(cancellation_policy_text, '') = '' THEN $2 ELSE cancellation_policy_text END,
       updated_at = now()
     WHERE id = $1::uuid`,
    [listingId, text, overwrite],
  )
  return true
}

export async function upsertTravelrobotOwnerContacts(pgClient, listingId, hotel, overwrite) {
  const meta = extractTravelrobotListingMeta(hotel)
  if (!meta.phone && !meta.email) return false

  const ex = await pgClient.query(
    `SELECT contact_phone, contact_email FROM listing_owner_contacts WHERE listing_id = $1::uuid`,
    [listingId],
  )
  const prev = ex.rows[0] ?? {}
  const phone = overwrite || !String(prev.contact_phone ?? '').trim() ? meta.phone : prev.contact_phone
  const email = overwrite || !String(prev.contact_email ?? '').trim() ? meta.email : prev.contact_email
  if (!phone && !email) return false

  await pgClient.query(
    `INSERT INTO listing_owner_contacts (listing_id, contact_phone, contact_email)
     VALUES ($1::uuid, $2, $3)
     ON CONFLICT (listing_id) DO UPDATE SET
       contact_phone = COALESCE(EXCLUDED.contact_phone, listing_owner_contacts.contact_phone),
       contact_email = COALESCE(EXCLUDED.contact_email, listing_owner_contacts.contact_email)`,
    [listingId, phone || null, email || null],
  )
  return true
}

export async function upsertTravelrobotTranslations(pgClient, listingId, hotel, localeIds, overwrite) {
  const blocks = extractTravelrobotTranslations(hotel)
  let n = 0
  for (const [code, row] of Object.entries(blocks)) {
    const localeId = localeIds?.[code]
    if (!localeId || (!row.title && !row.description)) continue
    const ex = await pgClient.query(
      `SELECT title, description FROM listing_translations WHERE listing_id = $1::uuid AND locale_id = $2`,
      [listingId, localeId],
    )
    const prev = ex.rows[0] ?? {}
    const title =
      overwrite || !String(prev.title ?? '').trim() ? row.title ?? prev.title ?? 'Otel' : prev.title
    const description =
      overwrite || !String(prev.description ?? '').trim() ? row.description ?? prev.description : prev.description
    await pgClient.query(
      `INSERT INTO listing_translations (listing_id, locale_id, title, description)
       VALUES ($1::uuid, $2, $3, $4)
       ON CONFLICT (listing_id, locale_id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description`,
      [listingId, localeId, title, description],
    )
    n++
  }
  return n
}

/**
 * @param {import('pg').Client} pgClient
 * @param {object} opts — overwriteExtras, localeIds
 */
export async function applyTravelrobotHotelExtrasFields(pgClient, listingId, hotel, currency, opts = {}) {
  const overwrite = opts.overwriteExtras === true
  const meta = extractTravelrobotListingMeta(hotel)
  const stats = {
    meta: false,
    contacts: false,
    cancellation: false,
    mealPlans: 0,
    calendarDays: 0,
    priceRules: 0,
    translations: 0,
    gallery: 0,
    rooms: 0,
  }

  stats.meta = await upsertListingMeta(pgClient, listingId, meta, overwrite)
  stats.contacts = await upsertTravelrobotOwnerContacts(pgClient, listingId, hotel, overwrite)
  stats.cancellation = await upsertTravelrobotCancellationPolicy(pgClient, listingId, hotel, overwrite)

  const roomResult = await upsertTravelrobotHotelRoomsWithExtras(pgClient, listingId, hotel)
  if (!roomResult.skipped) {
    stats.rooms = roomResult.count
    stats.calendarDays = await upsertTravelrobotRoomAvailabilityCalendar(
      pgClient,
      listingId,
      roomResult.roomIdsByKey,
      overwrite,
    )
    stats.mealPlans = await upsertTravelrobotMealPlans(pgClient, listingId, hotel, currency, overwrite)
    stats.priceRules = await upsertTravelrobotPriceRules(pgClient, listingId, hotel, currency, overwrite)
  }
  stats.translations = await upsertTravelrobotTranslations(
    pgClient,
    listingId,
    hotel,
    opts.localeIds ?? {},
    overwrite,
  )
  stats.gallery = await upsertTravelrobotHotelGallery(pgClient, listingId, hotel)

  return stats
}

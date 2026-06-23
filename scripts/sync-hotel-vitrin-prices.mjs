/**
 * Travelrobot oteller — vitrin fiyatı + oda listesi senkronizasyonu.
 * SearchHotel + GetHotelRoomPrices + çoklu tarih penceresi.
 *
 *   node scripts/sync-hotel-vitrin-prices.mjs --dry-run --limit 10
 *   node scripts/sync-hotel-vitrin-prices.mjs --delay 400
 *   node scripts/sync-hotel-vitrin-prices.mjs --offset 500 --limit 500
 *   node scripts/sync-hotel-vitrin-prices.mjs --code KTR371734
 *   node scripts/sync-hotel-vitrin-prices.mjs --rooms-only --delay 400
 */

import { createTravelrobotToken, loadTravelrobotConfig } from './lib/travelrobot-api.mjs'
import {
  enrichHotelRowWithRoomPrices,
  countUniqueHotelRoomNames,
} from './lib/travelrobot-hotel-rooms.mjs'
import {
  extractTravelrobotMealPlans,
  extractHotelMinNightlyPrice,
} from './lib/travelrobot-hotel-extras.mjs'
import {
  upsertTravelrobotMealPlans,
  upsertTravelrobotHotelRoomsWithExtras,
  upsertTravelrobotRoomAvailabilityCalendar,
} from './lib/travelrobot-hotel-extras-db.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const FORCE = args.includes('--force')
const SINGLE_DATE = args.includes('--single-date')
const ROOMS_ONLY = args.includes('--rooms-only')
const WITH_ROOMS = !args.includes('--no-rooms')

const codeIdx = args.indexOf('--code')
const CODE = codeIdx >= 0 ? args[codeIdx + 1]?.trim() : ''
const limitIdx = args.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 0
const offsetIdx = args.indexOf('--offset')
const OFFSET = offsetIdx >= 0 ? Number(args[offsetIdx + 1]) : 0
const delayIdx = args.indexOf('--delay')
const DELAY_MS = delayIdx >= 0 ? Number(args[delayIdx + 1]) : 400

/** Check-in günü (bugünden) + konaklama gecesi — stok bulma şansını artırır. */
const DATE_WINDOWS = [
  { checkInDays: 7, stayNights: 3 },
  { checkInDays: 14, stayNights: 5 },
  { checkInDays: 30, stayNights: 7 },
  { checkInDays: 45, stayNights: 7 },
  { checkInDays: 60, stayNights: 7 },
  { checkInDays: 90, stayNights: 5 },
]

function isoDatePlusDays(daysAhead) {
  const d = new Date()
  d.setUTCHours(12, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + daysAhead)
  return d.toISOString().slice(0, 10)
}

function dateWindow(checkInDays, stayNights) {
  const checkInDate = isoDatePlusDays(checkInDays)
  const checkOutDate = isoDatePlusDays(checkInDays + stayNights)
  return { checkInDate, checkOutDate }
}

async function loadHotels(pg, orgId) {
  const params = [orgId, OFFSET]
  let sql = `
    SELECT l.id::text AS listing_id,
           l.slug,
           COALESCE(l.currency_code::text, 'TRY') AS currency_code,
           lhd.travelrobot_hotel_code AS code
    FROM listings l
    JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'hotel'
    JOIN listing_hotel_details lhd ON lhd.listing_id = l.id
    WHERE l.organization_id = $1::uuid
      AND l.status = 'published'
      AND l.external_provider_code = 'travelrobot'
      AND lhd.travelrobot_hotel_code IS NOT NULL
      AND trim(lhd.travelrobot_hotel_code) <> ''`
  if (ROOMS_ONLY) {
    sql += ` AND NOT EXISTS (SELECT 1 FROM hotel_rooms hr WHERE hr.listing_id = l.id)`
  } else if (!FORCE) {
    sql += ` AND NOT EXISTS (
      SELECT 1 FROM listing_meal_plans m
      WHERE m.listing_id = l.id AND m.is_active = true AND m.price_per_night > 0
    )`
  }
  if (CODE) {
    params.push(CODE)
    sql += ` AND lhd.travelrobot_hotel_code = $${params.length}`
  }
  sql += ' ORDER BY l.updated_at ASC, l.slug ASC OFFSET $2'
  if (LIMIT > 0) {
    params.push(LIMIT)
    sql += ` LIMIT $${params.length}`
  }
  const r = await pg.query(sql, params)
  return r.rows.map((row) => ({
    listingId: row.listing_id,
    slug: row.slug,
    currencyCode: row.currency_code || 'TRY',
    code: String(row.code).trim(),
  }))
}

async function loadStats(pg, orgId) {
  const r = await pg.query(
    `SELECT count(*)::int AS total,
            count(*) filter (where exists (
              select 1 from listing_meal_plans m
              where m.listing_id = l.id and m.is_active = true and m.price_per_night > 0
            ))::int AS with_price,
            count(*) filter (where exists (
              select 1 from hotel_rooms hr where hr.listing_id = l.id
            ))::int AS with_rooms
     FROM listings l
     JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'hotel'
     JOIN listing_hotel_details lhd ON lhd.listing_id = l.id
     WHERE l.organization_id = $1::uuid
       AND l.status = 'published'
       AND l.external_provider_code = 'travelrobot'
       AND lhd.travelrobot_hotel_code IS NOT NULL
       AND trim(lhd.travelrobot_hotel_code) <> ''`,
    [orgId],
  )
  const row = r.rows[0] ?? { total: 0, with_price: 0, with_rooms: 0 }
  return { total: row.total, withPrice: row.with_price, withRooms: row.with_rooms }
}

function hasPositivePrice(plans, minPrice) {
  if (minPrice != null && Number(minPrice) > 0) return true
  return plans.some((p) => Number(p.price_per_night) > 0)
}

async function fetchHotelEnriched(cfg, tokenCode, hotelCode, currencyCode, opts = {}) {
  const requirePrice = opts.requirePrice !== false
  const row = { HotelCode: hotelCode, HotelId: hotelCode, hotelCode }
  const windows = SINGLE_DATE ? [DATE_WINDOWS[2]] : DATE_WINDOWS
  let best = null

  for (const w of windows) {
    const dates = dateWindow(w.checkInDays, w.stayNights)
    for (const onRequest of [false, true]) {
      const enriched = await enrichHotelRowWithRoomPrices(cfg, tokenCode, row, {
        force: true,
        minOffers: 1,
        onRequest,
        ...dates,
      })
      const plans = extractTravelrobotMealPlans(enriched, currencyCode).filter(
        (p) => Number(p.price_per_night) > 0,
      )
      const minPrice = extractHotelMinNightlyPrice(enriched)
      const roomCount = countUniqueHotelRoomNames(enriched)
      const hasPrice = hasPositivePrice(plans, minPrice)
      const hit = { enriched, plans, minPrice, window: w, onRequest, roomCount }

      if (requirePrice && hasPrice) return hit
      if (!requirePrice && roomCount > 0) {
        if (!best || roomCount > best.roomCount) best = hit
      }
    }
  }
  return best
}

async function upsertRoomsFromEnriched(pg, listingId, enriched, overwrite) {
  const roomResult = await upsertTravelrobotHotelRoomsWithExtras(pg, listingId, enriched)
  if (roomResult.skipped) return 0
  await upsertTravelrobotRoomAvailabilityCalendar(
    pg,
    listingId,
    roomResult.roomIdsByKey,
    overwrite,
  )
  return roomResult.count
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const cfg = await loadTravelrobotConfig()
  if (!cfg.channelCode || !cfg.channelPassword) {
    throw new Error('Travelrobot credentials eksik — site_settings veya env kontrol edin.')
  }

  const pg = createPgClient()
  await pg.connect()

  try {
    const orgId = (await pg.query(`SELECT id::text FROM organizations ORDER BY created_at LIMIT 1`))
      .rows[0]?.id
    if (!orgId) throw new Error('organizations kaydı yok')

    const stats = await loadStats(pg, orgId)
    console.log(
      `Travelrobot oteller: ${stats.total} toplam, ${stats.withPrice} fiyatlı, ${stats.withRooms} odalı, ${stats.total - stats.withRooms} odasız`,
    )

    const hotels = await loadHotels(pg, orgId)
    if (!hotels.length) {
      const msg = ROOMS_ONLY
        ? 'Odasız otel yok — tümü zaten dolu.'
        : FORCE
          ? 'Hiç otel bulunamadı.'
          : 'Fiyatsız otel yok — tümü zaten dolu.'
      console.log(msg)
      return
    }

    console.log(
      `${hotels.length} otel işlenecek (rooms-only=${ROOMS_ONLY}, force=${FORCE}, dry-run=${DRY_RUN}, delay=${DELAY_MS}ms, multi-date=${!SINGLE_DATE})`,
    )

    const { tokenCode } = await createTravelrobotToken(cfg)
    console.log(`Token: ${tokenCode.slice(0, 8)}…`)

    let ok = 0
    let skipNoApi = 0
    let skipNoData = 0
    let fail = 0
    let roomsWritten = 0

    for (let i = 0; i < hotels.length; i++) {
      const hotel = hotels[i]
      const prefix = `[${i + 1}/${hotels.length}] ${hotel.slug} (${hotel.code})`

      try {
        const result = await fetchHotelEnriched(cfg, tokenCode, hotel.code, hotel.currencyCode, {
          requirePrice: !ROOMS_ONLY,
        })

        if (!result) {
          skipNoData++
          console.log(
            `${prefix} — tüm tarihlerde ${ROOMS_ONLY ? 'oda' : 'fiyat'} yok (stok dışı / kapalı)`,
          )
          continue
        }

        const { enriched, plans, minPrice, window, onRequest, roomCount } = result
        const planSummary = plans.length
          ? plans.map((p) => `${p.plan_code}:${p.price_per_night}${p.currency_code}`).join(', ')
          : minPrice != null && Number(minPrice) > 0
            ? `min:${minPrice}`
            : '—'
        const roomSummary = `${roomCount ?? countUniqueHotelRoomNames(enriched)} oda`

        if (DRY_RUN) {
          console.log(
            `[dry] ${prefix} — +${window.checkInDays}g onReq=${onRequest} — ${planSummary} | ${roomSummary}`,
          )
          ok++
          continue
        }

        if (!ROOMS_ONLY) {
          if (plans.length) {
            await upsertTravelrobotMealPlans(
              pg,
              hotel.listingId,
              enriched,
              hotel.currencyCode,
              FORCE,
            )
          }

          const priceToStore =
            minPrice != null && Number(minPrice) > 0 ? minPrice : plans[0]?.price_per_night
          if (priceToStore != null && Number(priceToStore) > 0) {
            await pg.query(
              `UPDATE listings SET first_charge_amount = $1, updated_at = now()
               WHERE id = $2::uuid
                 AND ($3 OR first_charge_amount IS NULL OR first_charge_amount = 0)`,
              [priceToStore, hotel.listingId, FORCE],
            )
          }
        }

        if (WITH_ROOMS || ROOMS_ONLY) {
          const n = await upsertRoomsFromEnriched(pg, hotel.listingId, enriched, FORCE || ROOMS_ONLY)
          if (n > 0) roomsWritten += n
        }

        ok++
        console.log(`${prefix} — +${window.checkInDays}g — ${planSummary} | ${roomSummary}`)
      } catch (e) {
        fail++
        const msg = String(e.message || e)
        if (/bulunamad|not found|empty/i.test(msg)) skipNoApi++
        console.error(`${prefix} HATA: ${msg}`)
      }

      if (DELAY_MS > 0 && i < hotels.length - 1) await sleep(DELAY_MS)
    }

    const after = await loadStats(pg, orgId)
    console.log(
      `\nTamamlandı: ${ok} güncellendi, ${skipNoData} stok dışı, ${skipNoApi} API hatası, ${fail} hata${DRY_RUN ? ' (dry-run)' : ''}.`,
    )
    if (!DRY_RUN && (WITH_ROOMS || ROOMS_ONLY)) {
      console.log(`Odalar: ${roomsWritten} oda satırı yazıldı.`)
    }
    console.log(
      `DB: ${after.withPrice}/${after.total} fiyatlı, ${after.withRooms}/${after.total} odalı.`,
    )
  } finally {
    await pg.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

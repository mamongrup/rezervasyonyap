/**
 * Travelrobot oteller — vitrin fiyatı senkronizasyonu (SearchHotel).
 * listing_meal_plans tablosunu doldurur; collections_http vitrine yansır.
 *
 * Kullanım:
 *   node scripts/sync-hotel-vitrin-prices.mjs --dry-run --limit 10
 *   node scripts/sync-hotel-vitrin-prices.mjs --limit 100
 *   node scripts/sync-hotel-vitrin-prices.mjs --code KTR371734
 *   node scripts/sync-hotel-vitrin-prices.mjs --force        (mevcut fiyatların üzerine yaz)
 *   node scripts/sync-hotel-vitrin-prices.mjs --delay 600    (ms cinsinden istek aralığı)
 */

import {
  createTravelrobotToken,
  loadTravelrobotConfig,
  searchHotels,
  pickHotelRows,
} from './lib/travelrobot-api.mjs'
import {
  extractTravelrobotMealPlans,
  extractHotelMinNightlyPrice,
} from './lib/travelrobot-hotel-extras.mjs'
import { upsertTravelrobotMealPlans } from './lib/travelrobot-hotel-extras-db.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const FORCE = args.includes('--force')

const codeIdx = args.indexOf('--code')
const CODE = codeIdx >= 0 ? args[codeIdx + 1]?.trim() : ''
const limitIdx = args.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 0
const offsetIdx = args.indexOf('--offset')
const OFFSET = offsetIdx >= 0 ? Number(args[offsetIdx + 1]) : 0
const delayIdx = args.indexOf('--delay')
const DELAY_MS = delayIdx >= 0 ? Number(args[delayIdx + 1]) : 500

function addDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

async function loadHotels(pg, orgId) {
  const params = [orgId, OFFSET]
  // Fiyatı olmayan oteller önce (boş listing_meal_plans)
  let sql = `
    SELECT l.id::text AS listing_id,
           l.slug,
           COALESCE(l.currency_code::text, 'TRY') AS currency_code,
           lhd.travelrobot_hotel_code AS code,
           (SELECT COUNT(*) FROM listing_meal_plans m
            WHERE m.listing_id = l.id AND m.is_active = true AND m.price_per_night > 0
           )::int AS meal_plan_count
    FROM listings l
    JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'hotel'
    JOIN listing_hotel_details lhd ON lhd.listing_id = l.id
    WHERE l.organization_id = $1::uuid
      AND l.external_provider_code = 'travelrobot'
      AND lhd.travelrobot_hotel_code IS NOT NULL
      AND trim(lhd.travelrobot_hotel_code) <> ''`
  if (!FORCE) {
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
    mealPlanCount: Number(row.meal_plan_count),
  }))
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

    const hotels = await loadHotels(pg, orgId)
    if (!hotels.length) {
      console.log(FORCE ? 'Hiç otel bulunamadı.' : 'Fiyatsız otel yok — tümü zaten dolu.')
      return
    }

    console.log(
      `${hotels.length} otel fiyat senkronize edilecek (force=${FORCE}, dry-run=${DRY_RUN}, delay=${DELAY_MS}ms)`,
    )

    const { tokenCode } = await createTravelrobotToken(cfg)
    console.log(`Token: ${tokenCode.slice(0, 8)}…`)

    const checkInDate = addDays(30)
    const checkOutDate = addDays(32)
    console.log(`Tarih penceresi: ${checkInDate} → ${checkOutDate}`)

    let ok = 0
    let skip = 0
    let fail = 0

    for (let i = 0; i < hotels.length; i++) {
      const hotel = hotels[i]
      const prefix = `[${i + 1}/${hotels.length}] ${hotel.slug} (${hotel.code})`

      try {
        const payload = await searchHotels(cfg, tokenCode, {
          hotelCode: hotel.code,
          checkInDate,
          checkOutDate,
          showMultipleRate: true,
          isAsync: false,
        })

        const rows = pickHotelRows(payload)
        const found = rows.find((r) => {
          const c = String(r?.HotelCode ?? r?.hotelCode ?? r?.Hotel?.HotelCode ?? '').trim()
          return c === hotel.code
        }) ?? rows[0] ?? null

        if (!found) {
          skip++
          console.log(`${prefix} — API'de bulunamadı`)
          continue
        }

        const plans = extractTravelrobotMealPlans(found, hotel.currencyCode)
        const minPrice = extractHotelMinNightlyPrice(found)

        if (!plans.length && minPrice == null) {
          skip++
          console.log(`${prefix} — fiyat yok (stok dışı?)`)
          continue
        }

        const planSummary = plans.length
          ? plans.map((p) => `${p.plan_code}:${p.price_per_night}${p.currency_code}`).join(', ')
          : `min:${minPrice}`

        if (DRY_RUN) {
          console.log(`[dry] ${prefix} — ${planSummary}`)
          ok++
          continue
        }

        // Fiyatlar varsa meal_plans'a yaz
        if (plans.length) {
          await upsertTravelrobotMealPlans(pg, hotel.listingId, found, hotel.currencyCode, FORCE)
        }

        // listings.first_charge_amount güncelle (daha önce boşsa)
        if (minPrice != null) {
          await pg.query(
            `UPDATE listings SET first_charge_amount = $1, updated_at = now()
             WHERE id = $2::uuid
               AND ($3 OR first_charge_amount IS NULL OR first_charge_amount = 0)`,
            [minPrice, hotel.listingId, FORCE],
          )
        }

        ok++
        console.log(`${prefix} — ${planSummary}`)
      } catch (e) {
        fail++
        console.error(`${prefix} HATA: ${e.message}`)
      }

      if (DELAY_MS > 0 && i < hotels.length - 1) await sleep(DELAY_MS)
    }

    console.log(
      `\nTamamlandı: ${ok} güncellendi, ${skip} atlandı, ${fail} hata${DRY_RUN ? ' (dry-run)' : ''}.`,
    )
  } finally {
    await pg.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

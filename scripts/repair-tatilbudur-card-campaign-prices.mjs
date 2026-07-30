#!/usr/bin/env node
/**
 * TatilBudur feed/DB: banka kartı (Worldcard vb.) sepette indirim tutarını
 * "Toplam Fiyat"a çevirir — yalnız bilinen / doğrulanmış düzeltmeler veya
 * capture yeniden hazırlama.
 *
 *   # Asia Beach (ekran görüntüsüyle doğrulandı) — feed + isteğe bağlı DB
 *   node scripts/repair-tatilbudur-card-campaign-prices.mjs --slug asia-beach-resort-spa --apply
 *
 *   # Capture'dan feed yeniden üret (kart kampanyası hariç)
 *   node scripts/prepare-tatilbudur-regional-feed.mjs backups/X-capture.json backups/X-feed.json
 *   node scripts/import-tatilbudur-hotels.mjs --file backups/X-feed.json
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { fillMissingHotelRoomRates } from './lib/hotel-room-rate-factor.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const APPLY = process.argv.includes('--apply')
const SLUG = (() => {
  const i = process.argv.indexOf('--slug')
  return i >= 0 ? String(process.argv[i + 1] || '').trim() : 'asia-beach-resort-spa'
})()
const FEED =
  process.argv.find((a, i) => process.argv[i - 1] === '--feed') ||
  path.join(ROOT, 'backups', 'tatilbudur-antalya-feed-2026-07-30.json')

/**
 * Ekran / TatilBudur "Toplam Fiyat" — Worldcard satırı değil.
 * Standart Oda: 101.563 → 110.395 (%8 sepette)
 * Balkonsuz: 98.790 → 107.380 (aynı %8)
 */
const CONFIRMED_STAY_TOTALS = {
  'asia-beach-resort-spa': {
    'Standart Oda': 110395,
    'Standart Oda (Balkonsuz)': 107380,
  },
}

function roundNightly(total, nights) {
  return Math.round((total / nights) * 100) / 100
}

async function patchFeed() {
  const map = CONFIRMED_STAY_TOTALS[SLUG]
  if (!map) {
    console.error(`[repair] slug için onaylı Toplam Fiyat yok: ${SLUG}`)
    process.exit(1)
  }
  if (!fs.existsSync(FEED)) {
    console.error(`[repair] feed yok: ${FEED}`)
    process.exit(1)
  }
  const data = JSON.parse(fs.readFileSync(FEED, 'utf8'))
  const hotel = (data.hotels || []).find((h) => h.slug === SLUG || h.id === SLUG)
  if (!hotel) {
    console.error(`[repair] feed içinde otel yok: ${SLUG}`)
    process.exit(1)
  }

  const changes = []
  for (const room of hotel.rooms || []) {
    const stayTotal = map[room.name]
    if (stayTotal == null) continue
    for (const rate of room.rates || []) {
      const nights = Number(rate.stayNights) || 7
      const prevTotal = rate.totalPrice
      const prevNightly = rate.nightlyPrice
      const nextNightly = roundNightly(stayTotal, nights)
      if (prevTotal === stayTotal && prevNightly === nextNightly) continue
      changes.push({
        room: room.name,
        prevTotal,
        nextTotal: stayTotal,
        prevNightly,
        nextNightly,
        nights,
      })
      if (APPLY) {
        rate.totalPrice = stayTotal
        rate.nightlyPrice = nextNightly
        rate.priceSource = 'stay_total'
        delete rate.cardCampaignPrice
      }
    }
  }

  // Kartlı tabandan üretilmiş boş odaları yeniden doldur
  if (APPLY && changes.length) {
    hotel.rooms = fillMissingHotelRoomRates(hotel.rooms, {
      floorNightly: Math.min(
        ...hotel.rooms.flatMap((r) => (r.rates || []).map((x) => Number(x.nightlyPrice)).filter((n) => n > 0)),
      ),
      currency: 'TRY',
    })
  }

  console.log(JSON.stringify({ feed: FEED, slug: SLUG, apply: APPLY, changes }, null, 2))
  if (APPLY && changes.length) {
    fs.writeFileSync(FEED, `${JSON.stringify(data, null, 2)}\n`)
    console.log(`[repair] feed güncellendi: ${FEED}`)
  }
  return { hotel, changes }
}

async function patchDb(hotel, changes) {
  if (!APPLY || !changes.length) return
  const client = new pg.Client(
    process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : {
          host: process.env.PGHOST || '127.0.0.1',
          port: Number(process.env.PGPORT || 5432),
          user: process.env.PGUSER || 'postgres',
          password: process.env.PGPASSWORD || '',
          database: process.env.PGDATABASE || 'travel',
        },
  )
  await client.connect()
  try {
    const listing = await client.query(
      `SELECT id FROM listings
       WHERE external_provider_code = 'tatilbudur'
         AND (slug = $1 OR external_listing_ref = $1)
       LIMIT 1`,
      [SLUG],
    )
    if (!listing.rows[0]) {
      console.warn('[repair] DB listing yok — yalnız feed güncellendi; import çalıştırın')
      return
    }
    const listingId = listing.rows[0].id
    const rooms = await client.query(
      `SELECT id, name, meta_json FROM hotel_rooms WHERE listing_id = $1::uuid`,
      [listingId],
    )
    for (const row of rooms.rows) {
      const feedRoom = (hotel.rooms || []).find((r) => r.name === row.name)
      if (!feedRoom?.rates?.length) continue
      let meta = {}
      try {
        meta = JSON.parse(row.meta_json || '{}')
      } catch {
        meta = {}
      }
      meta.seasonal_prices = feedRoom.rates
      await client.query(`UPDATE hotel_rooms SET meta_json = $2::jsonb WHERE id = $1::uuid`, [
        row.id,
        JSON.stringify(meta),
      ])
      // room-scoped price rules
      await client.query(
        `DELETE FROM listing_price_rules
         WHERE listing_id = $1::uuid
           AND rule_json->>'source' = 'tatilbudur'
           AND rule_json->>'room_type_id' = $2`,
        [listingId, String(feedRoom.id || '')],
      )
      for (const rate of feedRoom.rates) {
        await client.query(
          `INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
           VALUES (
             $1::uuid,
             $2::jsonb,
             $3::date,
             $4::date
           )`,
          [
            listingId,
            JSON.stringify({
              source: 'tatilbudur',
              base_nightly: String(rate.nightlyPrice),
              base_price: String(rate.nightlyPrice),
              currency: rate.currency || 'TRY',
              room_type_id: String(feedRoom.id || ''),
              room_type_name: feedRoom.name,
              price_source: 'stay_total',
            }),
            rate.validFrom || null,
            rate.validTo || null,
          ],
        )
      }
    }
    const minNightly = Math.min(
      ...hotel.rooms.flatMap((r) => (r.rates || []).map((x) => Number(x.nightlyPrice)).filter((n) => n > 0)),
    )
    if (Number.isFinite(minNightly) && minNightly > 0) {
      await client.query(
        `UPDATE listings
         SET vitrin_price = $2, first_charge_amount = $2, currency_code = 'TRY'
         WHERE id = $1::uuid`,
        [listingId, minNightly],
      )
      try {
        await client.query(`SELECT refresh_listing_vitrin_prices()`)
      } catch {
        /* fonksiyon yoksa sessiz */
      }
    }
    console.log(`[repair] DB güncellendi listing=${listingId} minNightly=${minNightly}`)
  } finally {
    await client.end()
  }
}

const { hotel, changes } = await patchFeed()
if (APPLY) await patchDb(hotel, changes)
if (!APPLY) console.log('[repair] dry-run — yazmak için --apply ekleyin')

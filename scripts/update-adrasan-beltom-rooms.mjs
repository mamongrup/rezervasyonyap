#!/usr/bin/env node
/**
 * Adrasan Beltom Beach Hotel — oda görselleri ve (doğrulanmış) oda fiyatlarını günceller.
 * Yayın durumunu korur; galeriyi varsayılan olarak değiştirmez.
 *
 *   node scripts/update-adrasan-beltom-rooms.mjs
 *   node scripts/update-adrasan-beltom-rooms.mjs --dry-run
 *   node scripts/update-adrasan-beltom-rooms.mjs --with-gallery
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DATA_FILE = path.join(ROOT, 'deploy/data/tatilbudur/adrasan-beltom-beach-hotel.json')
const PROVIDER = 'tatilbudur'
const EXTERNAL_REF = 'adrasan-beltom-beach-hotel'
const DRY_RUN = process.argv.includes('--dry-run')
const WITH_GALLERY = process.argv.includes('--with-gallery')

function loadHotel() {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  const hotel = raw.hotels?.[0]
  if (!hotel) throw new Error('beltom_hotel_missing_in_feed')
  return hotel
}

function normalizeRooms(hotel) {
  return (hotel.rooms || []).map((room, index) => {
    const rates = (room.rates || [])
      .map((rate) => {
        const nightly = Number(rate.nightlyPrice ?? rate.price ?? rate.amount)
        if (!(nightly > 0)) return null
        return {
          validFrom: rate.validFrom || rate.valid_from || null,
          validTo: rate.validTo || rate.valid_to || null,
          nightlyPrice: nightly,
          currency: String(rate.currency || hotel.currency || 'TRY').toUpperCase(),
          boardType: String(rate.boardType || room.boardType || '').trim(),
        }
      })
      .filter(Boolean)
    const images = [...new Set((room.images || []).map((u) => String(u).trim()).filter(Boolean))]
    const image = String(room.image || images[0] || '').trim()
    return {
      id: String(room.id || index + 1),
      name: String(room.name || `Oda ${index + 1}`).trim(),
      capacity: Number(room.capacity) > 0 ? Math.round(Number(room.capacity)) : null,
      boardType: String(room.boardType || '').trim() || null,
      image,
      images: images.length ? images : image ? [image] : [],
      features: [...new Set((room.features || []).map((x) => String(x).trim()).filter(Boolean))],
      rates,
    }
  })
}

async function main() {
  const hotel = loadHotel()
  const rooms = normalizeRooms(hotel)
  const allRates = rooms.flatMap((r) => r.rates.map((rate) => ({ ...rate, roomId: r.id, roomName: r.name })))
  const minPrice = allRates.reduce((min, r) => (min == null || r.nightlyPrice < min ? r.nightlyPrice : min), null)

  const summary = {
    externalRef: EXTERNAL_REF,
    rooms: rooms.map((r) => ({
      id: r.id,
      name: r.name,
      capacity: r.capacity,
      imageCount: r.images.length,
      image: r.image,
      rates: r.rates,
    })),
    minPrice,
    priceQuote: hotel.sourceFacts?.priceQuote || null,
    dryRun: DRY_RUN,
  }
  console.log(JSON.stringify(summary, null, 2))
  if (DRY_RUN) return

  const pg = createPgClient()
  await pg.connect()
  try {
    const found = await pg.query(
      `SELECT id::text, slug, status
       FROM listings
       WHERE external_provider_code = $1 AND external_listing_ref = $2
       LIMIT 1`,
      [PROVIDER, EXTERNAL_REF],
    )
    if (!found.rows[0]) throw new Error(`listing_not_found:${EXTERNAL_REF}`)
    const listingId = found.rows[0].id
    const status = found.rows[0].status

    await pg.query('BEGIN')
    await pg.query(`DELETE FROM hotel_rooms WHERE listing_id = $1::uuid`, [listingId])
    for (const room of rooms) {
      await pg.query(
        `INSERT INTO hotel_rooms (listing_id, name, capacity, board_type, meta_json, unit_count)
         VALUES ($1::uuid, $2, $3, $4, $5::jsonb, 1)`,
        [
          listingId,
          room.name,
          room.capacity,
          room.boardType,
          JSON.stringify({
            tatilbudur_room_type_id: room.id,
            image: room.image,
            images: room.images,
            features: room.features,
            seasonal_prices: room.rates,
            price_source: hotel.sourceFacts?.priceSource || PROVIDER,
            price_quote: hotel.sourceFacts?.priceQuote || null,
          }),
        ],
      )
    }

    await pg.query(
      `DELETE FROM listing_price_rules WHERE listing_id = $1::uuid AND rule_json->>'source' = $2`,
      [listingId, PROVIDER],
    )
    for (const rate of allRates) {
      await pg.query(
        `INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
         VALUES ($1::uuid, $2::jsonb, $3::date, $4::date)`,
        [
          listingId,
          JSON.stringify({
            source: PROVIDER,
            base_nightly: String(rate.nightlyPrice),
            base_price: String(rate.nightlyPrice),
            currency: rate.currency,
            room_type_id: rate.roomId,
            room_name: rate.roomName,
            board_type: rate.boardType || '',
          }),
          rate.validFrom,
          rate.validTo,
        ],
      )
    }

    if (minPrice != null) {
      await pg.query(
        `UPDATE listings
         SET vitrin_price = $2,
             first_charge_amount = COALESCE(first_charge_amount, $2),
             currency_code = $3,
             status = $4,
             last_synced_at = now(),
             updated_at = now()
         WHERE id = $1::uuid`,
        [listingId, minPrice, hotel.currency || 'TRY', status],
      )
    }

    // Uzun tb-slug varsa kısalt (çakışma yoksa)
    if (String(found.rows[0].slug || '').includes('-tb-')) {
      const desired = hotel.slug || EXTERNAL_REF
      const clash = await pg.query(
        `SELECT 1 FROM listings WHERE slug = $1 AND id <> $2::uuid LIMIT 1`,
        [desired, listingId],
      )
      if (!clash.rows[0]) {
        await pg.query(`UPDATE listings SET slug = $2, updated_at = now() WHERE id = $1::uuid`, [
          listingId,
          desired,
        ])
      }
    }

    if (WITH_GALLERY && Array.isArray(hotel.images) && hotel.images.length) {
      await pg.query(`DELETE FROM listing_images WHERE listing_id = $1::uuid`, [listingId])
      for (let i = 0; i < hotel.images.length; i += 1) {
        await pg.query(
          `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime)
           VALUES ($1::uuid, $2, $3, 'image/jpeg')`,
          [listingId, i, hotel.images[i]],
        )
      }
      await pg.query(
        `UPDATE listings SET featured_image_url = $2, thumbnail_url = $2 WHERE id = $1::uuid`,
        [listingId, hotel.images[0]],
      )
    }

    await pg.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, $2, 'snapshot', $3::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
      [
        listingId,
        PROVIDER,
        JSON.stringify({
          ...hotel,
          rooms,
          normalized_at: new Date().toISOString(),
          rooms_updated_at: new Date().toISOString(),
        }),
      ],
    )

    await pg.query('COMMIT')
    await pg.query('SELECT refresh_listing_vitrin_prices()').catch(() => {})

    const check = await pg.query(
      `SELECT l.slug, l.status, l.vitrin_price::text,
              count(hr.id) AS room_count,
              count(hr.id) FILTER (WHERE nullif(hr.meta_json->>'image','') IS NOT NULL) AS rooms_with_images,
              (SELECT count(*) FROM listing_price_rules pr WHERE pr.listing_id = l.id) AS price_rules
       FROM listings l
       LEFT JOIN hotel_rooms hr ON hr.listing_id = l.id
       WHERE l.id = $1::uuid
       GROUP BY l.id`,
      [listingId],
    )
    console.log(JSON.stringify({ ok: true, listingId, ...check.rows[0] }, null, 2))
  } catch (error) {
    try {
      await pg.query('ROLLBACK')
    } catch {
      // ignore
    }
    throw error
  } finally {
    await pg.end()
  }
}

main().catch((error) => {
  console.error(`[FAIL] ${error?.stack || error}`)
  process.exit(1)
})

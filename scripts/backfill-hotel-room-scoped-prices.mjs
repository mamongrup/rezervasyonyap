#!/usr/bin/env node
/**
 * Otel odalarında eksik seasonal_prices / oda-kapsamlı listing_price_rules doldurur.
 * Tek oda fiyatını tüm odalara kopyalamaz; oda tipi çarpanı uygular.
 *
 *   node scripts/backfill-hotel-room-scoped-prices.mjs --dry-run
 *   node scripts/backfill-hotel-room-scoped-prices.mjs --slug liberty-signa
 *   node scripts/backfill-hotel-room-scoped-prices.mjs --provider tatilbudur
 */
import { createPgClient } from './lib/pg-client.mjs'
import { fillMissingHotelRoomRates } from './lib/hotel-room-rate-factor.mjs'

const argv = process.argv.slice(2)
const args = new Set(argv)
const valueAfter = (flag) => {
  const i = argv.indexOf(flag)
  return i >= 0 ? argv[i + 1] : undefined
}
const DRY_RUN = args.has('--dry-run')
const SLUG = valueAfter('--slug') || ''
const PROVIDER = valueAfter('--provider') || ''
const LIMIT = Math.max(0, Number(valueAfter('--limit') || 0))

function parseMeta(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return { ...raw }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw || '{}')
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    } catch {
      /* ignore */
    }
  }
  return {}
}

function ratesFromMeta(meta) {
  const raw = meta.seasonal_prices ?? meta.seasonalPrices ?? meta.rates
  if (!Array.isArray(raw)) return []
  return raw
    .map((rate) => {
      const nightly = Number(rate?.nightlyPrice ?? rate?.nightly_price ?? rate?.price)
      if (!(nightly > 0)) return null
      return {
        validFrom: rate.validFrom ?? rate.valid_from ?? null,
        validTo: rate.validTo ?? rate.valid_to ?? null,
        nightlyPrice: nightly,
        currency: String(rate.currency || 'TRY').toUpperCase(),
        boardType: String(rate.boardType ?? rate.board_type ?? '').trim(),
      }
    })
    .filter(Boolean)
}

async function main() {
  const pg = createPgClient()
  await pg.connect()
  try {
    const params = []
    const where = [`pc.code = 'hotel'`, `l.status IN ('published','draft')`]
    if (SLUG) {
      params.push(SLUG)
      where.push(`l.slug = $${params.length}`)
    }
    if (PROVIDER) {
      params.push(PROVIDER)
      where.push(`l.external_provider_code = $${params.length}`)
    }
    let sql = `
      SELECT l.id, l.slug, l.vitrin_price, l.currency_code, l.external_provider_code
      FROM listings l
      JOIN product_categories pc ON pc.id = l.category_id
      WHERE ${where.join(' AND ')}
      ORDER BY l.updated_at DESC
    `
    if (LIMIT > 0) sql += ` LIMIT ${LIMIT}`

    const { rows: listings } = await pg.query(sql, params)
    let updatedListings = 0
    let updatedRooms = 0
    let insertedRules = 0

    for (const listing of listings) {
      const { rows: rooms } = await pg.query(
        `SELECT id, name, board_type, meta_json, unit_count
         FROM hotel_rooms WHERE listing_id = $1::uuid ORDER BY name`,
        [listing.id],
      )
      if (rooms.length < 2) continue

      const shaped = rooms.map((room, index) => {
        const meta = parseMeta(room.meta_json)
        return {
          id: room.id,
          name: room.name,
          boardType: room.board_type || '',
          meta,
          rates: ratesFromMeta(meta),
          index,
        }
      })

      const pricedBefore = shaped.filter((r) => r.rates.length > 0).length
      if (pricedBefore === 0 && !(Number(listing.vitrin_price) > 0)) continue
      // Zaten her odanın farklı fiyatı varsa atla
      const pricedNightlies = shaped.flatMap((r) => r.rates.map((x) => x.nightlyPrice))
      const uniqueBefore = new Set(pricedNightlies)
      if (pricedBefore === rooms.length && uniqueBefore.size > 1) continue
      if (pricedBefore === rooms.length && uniqueBefore.size === 1 && pricedBefore > 1) {
        // Hepsi aynı — çarpanla yeniden dağıt (klon bug'ı / tek taban)
        for (const room of shaped) room.rates = []
      }

      const filled = fillMissingHotelRoomRates(
        shaped.map((r) => ({ name: r.name, boardType: r.boardType, rates: r.rates })),
        {
          floorNightly: Number(listing.vitrin_price) > 0 ? Number(listing.vitrin_price) : undefined,
          currency: listing.currency_code || 'TRY',
        },
      )

      const afterNightlies = filled.flatMap((r) => r.rates.map((x) => x.nightlyPrice))
      const uniqueAfter = new Set(afterNightlies)
      if (uniqueAfter.size <= 1 && filled.every((r) => r.rates.length > 0)) {
        // Çarpanlar da aynı kaldıysa (tek oda tipi) dokunma
        if (pricedBefore === rooms.length) continue
      }

      let listingTouched = false
      for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i]
        const shapedRoom = shaped[i]
        const nextRates = filled[i]?.rates || []
        const prevRates = shapedRoom.rates
        const same =
          prevRates.length === nextRates.length &&
          prevRates.every((r, idx) => Number(r.nightlyPrice) === Number(nextRates[idx]?.nightlyPrice))
        if (same && prevRates.length > 0) continue

        const meta = { ...shapedRoom.meta, seasonal_prices: nextRates }
        if (DRY_RUN) {
          console.log(
            `[dry-run] ${listing.slug} / ${room.name}: ${prevRates[0]?.nightlyPrice ?? '-'} -> ${nextRates[0]?.nightlyPrice ?? '-'}`,
          )
        } else {
          await pg.query(`UPDATE hotel_rooms SET meta_json = $2::jsonb WHERE id = $1::uuid`, [
            room.id,
            JSON.stringify(meta),
          ])
        }
        updatedRooms++
        listingTouched = true

        if (!DRY_RUN) {
          await pg.query(
            `DELETE FROM listing_price_rules
             WHERE listing_id = $1::uuid
               AND (
                 rule_json->>'room_name' = $2
                 OR (
                   COALESCE(rule_json->>'room_type_id','') <> ''
                   AND rule_json->>'room_type_id' = $3
                 )
               )`,
            [
              listing.id,
              room.name,
              String(meta.tatilbudur_room_type_id || meta.room_type_id || ''),
            ],
          )
          for (const rate of nextRates) {
            await pg.query(
              `INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
               VALUES ($1::uuid, $2::jsonb, $3::date, $4::date)`,
              [
                listing.id,
                JSON.stringify({
                  source: 'hotel_room_scoped_backfill',
                  base_nightly: String(rate.nightlyPrice),
                  base_price: String(rate.nightlyPrice),
                  currency: rate.currency || listing.currency_code || 'TRY',
                  room_type_id: String(meta.tatilbudur_room_type_id || meta.room_type_id || ''),
                  room_name: room.name,
                  board_type: rate.boardType || room.board_type || '',
                }),
                rate.validFrom || null,
                rate.validTo || null,
              ],
            )
            insertedRules++
          }
        }
      }

      if (listingTouched) {
        updatedListings++
        const minPrice = Math.min(...afterNightlies.filter((n) => n > 0))
        if (!DRY_RUN && Number.isFinite(minPrice) && minPrice > 0) {
          await pg.query(
            `UPDATE listings
             SET vitrin_price = LEAST(COALESCE(vitrin_price, $2), $2),
                 first_charge_amount = COALESCE(NULLIF(first_charge_amount, 0), $2)
             WHERE id = $1::uuid`,
            [listing.id, minPrice],
          )
        }
      }
    }

    console.log(
      JSON.stringify(
        {
          dryRun: DRY_RUN,
          listings: listings.length,
          updatedListings,
          updatedRooms,
          insertedRules,
        },
        null,
        2,
      ),
    )
  } finally {
    await pg.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

#!/usr/bin/env node
/**
 * Kilikya Hotel Mersin — Tatilbudur ekranındaki 2 yetişkin + 1 çocuk / 4 gece
 * toplamlarını gecelik oda fiyatına çevirir. Varsayılan yalnızca önizlemedir.
 *
 *   node scripts/apply-kilikya-tatilbudur-reference-prices.mjs
 *   node scripts/apply-kilikya-tatilbudur-reference-prices.mjs --apply
 */
import { createPgClient } from './lib/pg-client.mjs'

const APPLY = process.argv.includes('--apply')
const SLUG = 'kilikya-hotel-mersin-ts-3807'
const BOARD = 'Alkolsüz Her Şey Dahil'
const PARTY = '2 yetişkin + 1 çocuk'
const NIGHTS = 4

const rates = [
  { label: 'Kara Manzaralı Standart Oda', total: 54_770, nightly: 13_692.5, match: (n) => /standar/.test(n) && !/kismi|deniz/.test(n) },
  { label: 'Kısmi Deniz Manzaralı Standart Oda', total: 57_378, nightly: 14_344.5, match: (n) => /kismi.*deniz.*standar/.test(n) },
  { label: 'Deniz Manzaralı Suit Oda', total: 116_060, nightly: 29_015, match: (n) => /(deniz.*suit|suit.*deniz)/.test(n) },
]

function normalize(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function roomRateMeta(row, rate) {
  const meta = row.meta_json && typeof row.meta_json === 'object' ? { ...row.meta_json } : {}
  meta.seasonal_prices = [{
    validFrom: null,
    validTo: null,
    nightlyPrice: rate.nightly,
    currency: 'TRY',
    boardType: BOARD,
    source: 'manual_tatilbudur_reference',
    sourceTotal: rate.total,
    stayNights: NIGHTS,
    occupancy: PARTY,
  }]
  return meta
}

async function main() {
  const pg = createPgClient()
  await pg.connect()
  try {
    const listing = await pg.query(
      `SELECT id::text FROM listings WHERE slug = $1 AND external_provider_code = 'tatilsepeti' LIMIT 1`,
      [SLUG],
    )
    const listingId = listing.rows[0]?.id
    if (!listingId) throw new Error(`İlan bulunamadı: ${SLUG}`)

    const rooms = await pg.query(
      `SELECT id::text, name, meta_json FROM hotel_rooms WHERE listing_id = $1::uuid ORDER BY name`,
      [listingId],
    )
    const assignments = rooms.rows.map((room) => ({
      room,
      rate: rates.find((candidate) => candidate.match(normalize(room.name))),
    })).filter((item) => item.rate)

    console.log(JSON.stringify({
      apply: APPLY,
      listing: SLUG,
      party: PARTY,
      nights: NIGHTS,
      matched: assignments.map(({ room, rate }) => ({ room: room.name, total: rate.total, nightly: rate.nightly })),
      unmatchedRooms: rooms.rows.filter((room) => !assignments.some((item) => item.room.id === room.id)).map((room) => room.name),
    }, null, 2))
    if (!APPLY) return
    if (assignments.length !== rates.length) throw new Error('Üç oda tipi de eşleşmeden yazma yapılmadı.')

    await pg.query('BEGIN')
    try {
      await pg.query(`DELETE FROM listing_price_rules WHERE listing_id = $1::uuid`, [listingId])
      for (const { room, rate } of assignments) {
        await pg.query(`UPDATE hotel_rooms SET meta_json = $2::jsonb WHERE id = $1::uuid`, [
          room.id, JSON.stringify(roomRateMeta(room, rate)),
        ])
        await pg.query(
          `INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
           VALUES ($1::uuid, $2::jsonb, NULL, NULL)`,
          [listingId, JSON.stringify({
            source: 'manual_tatilbudur_reference',
            base_nightly: String(rate.nightly),
            base_price: String(rate.nightly),
            currency: 'TRY',
            room_name: room.name,
            room_type_name: rate.label,
            board_type: BOARD,
            source_total: String(rate.total),
            stay_nights: NIGHTS,
            occupancy: PARTY,
          })],
        )
      }
      const minNightly = Math.min(...assignments.map(({ rate }) => rate.nightly))
      await pg.query(
        `UPDATE listing_meal_plans SET price_per_night = $2, notes = 'manual_tatilbudur_reference'
         WHERE listing_id = $1::uuid AND is_active = true`,
        [listingId, minNightly],
      )
      await pg.query(
        `UPDATE listings
         SET first_charge_amount = $2, vitrin_price = $2, currency_code = 'TRY', last_synced_at = now(), updated_at = now()
         WHERE id = $1::uuid`,
        [listingId, minNightly],
      )
      await pg.query('COMMIT')
      console.log(`[OK] Tatilbudur referans fiyatları uygulandı. Başlangıç fiyatı: ${minNightly} TRY/gece`)
    } catch (error) {
      await pg.query('ROLLBACK')
      throw error
    }
  } finally {
    await pg.end()
  }
}

main().catch((error) => { console.error(`[HATA] ${error.stack || error.message}`); process.exitCode = 1 })

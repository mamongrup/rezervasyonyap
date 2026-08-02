#!/usr/bin/env node
/**
 * TatilBudur / IDE otellerinde boş oda fiyatı + listing_price_rules doldurur.
 * Bookeder sayfası bulunamayanlar için doğrulanmış taban (Momondo / Bookeder USD) kullanır.
 * Ayrıca eski /7 bug’ı (bookeder tabanın %50’sinden düşük rules) onarır.
 *
 *   node scripts/repair-tatilbudur-missing-floors.mjs --dry-run
 *   node scripts/repair-tatilbudur-missing-floors.mjs --apply
 *   node scripts/repair-tatilbudur-missing-floors.mjs --apply --slug queens-park-goynuk
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'
import {
  fillMissingHotelRoomRates,
  hotelRoomRateFactor,
  roundHotelNightlyTry,
} from './lib/hotel-room-rate-factor.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const APPLY = process.argv.includes('--apply')
const DRY_RUN = !APPLY
const SLUG = (() => {
  const i = process.argv.indexOf('--slug')
  return i >= 0 ? String(process.argv[i + 1] || '').trim() : ''
})()

const BOOKEDER_META = path.join(
  ROOT,
  'deploy/data/tatilbudur/batch-july27-bookeder-prices.json',
)

/**
 * Doğrulanmış gecelik taban (oda / 2 kişi, TRY).
 * Kaynak notu script çıktısında yazılır — uydurma sezon çarpanı yok.
 */
const VERIFIED_FLOORS = {
  'queens-park-goynuk': {
    nightlyTryFloor: 4350,
    source: 'momondo_from_price_2026-08-02',
    note: "Momondo '₺4.351'den başlayan' (Standart oda)",
  },
  'lucida-beach-hotel': {
    nightlyTryFloor: 5400,
    source: 'momondo_from_price_2026-08-02',
    note: "Momondo '₺5.375'den başlayan' → 50 TRY yuvarlama",
  },
  'crystal-admiral-aqua-collection': {
    nightlyTryFloor: 4150,
    source: 'momondo_from_price_2026-08-02',
    note: "Momondo '₺4.125'den başlayan' → 50 TRY yuvarlama",
  },
  'leodikya-kirman-premium': {
    nightlyTryFloor: 14650,
    source: 'bookeder_usd_ve_uzeri',
    note: 'leodikya-resort-alanya.bookeder.com 366 US$ × 40 TRY',
  },
}

const VALID_FROM = '2026-07-01'
const VALID_TO = '2026-10-31'
const RULE_SOURCE = 'tatilbudur_floor_repair'

function loadBookederMeta() {
  if (!fs.existsSync(BOOKEDER_META)) return {}
  try {
    return JSON.parse(fs.readFileSync(BOOKEDER_META, 'utf8'))
  } catch {
    return {}
  }
}

function floorForSlug(slug, bookederMeta) {
  if (VERIFIED_FLOORS[slug]) return VERIFIED_FLOORS[slug]
  const row = bookederMeta[slug]
  const n = Number(row?.nightlyTryFloor)
  if (Number.isFinite(n) && n > 0) {
    return {
      nightlyTryFloor: roundHotelNightlyTry(n),
      source: String(row.source || 'bookeder_meta'),
      note: 'batch-july27-bookeder-prices.json',
    }
  }
  return null
}

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

function minFromRules(ruleRows) {
  let min = null
  for (const row of ruleRows) {
    let obj = {}
    try {
      obj = JSON.parse(row.rule_json || '{}')
    } catch {
      continue
    }
    for (const key of ['base_nightly', 'base_price', 'room_only_nightly']) {
      const n = Number(String(obj[key] ?? '').replace(',', '.'))
      if (Number.isFinite(n) && n > 0) min = min == null ? n : Math.min(min, n)
    }
  }
  return min
}

async function applyListing(pg, listing, floorInfo) {
  const floor = floorInfo.nightlyTryFloor
  const { rows: rooms } = await pg.query(
    `SELECT id, name, board_type, meta_json
     FROM hotel_rooms WHERE listing_id = $1::uuid ORDER BY name`,
    [listing.id],
  )
  const { rows: rules } = await pg.query(
    `SELECT rule_json FROM listing_price_rules WHERE listing_id = $1::uuid`,
    [listing.id],
  )
  const rulesMin = minFromRules(rules)
  const roomsWithRates = rooms.filter((r) => ratesFromMeta(parseMeta(r.meta_json)).length > 0)
  const needsFill = rooms.length > 0 && roomsWithRates.length < rooms.length
  const underpriced =
    rulesMin != null && rulesMin > 0 && rulesMin < floor * 0.5

  if (!needsFill && !underpriced && Number(listing.vitrin_price) > 0 && rules.length > 0) {
    return { skipped: true, reason: 'already_priced', rulesMin, floor }
  }
  if (rooms.length === 0) {
    return { skipped: true, reason: 'no_rooms', floor }
  }

  const shaped = rooms.map((room, index) => {
    const meta = parseMeta(room.meta_json)
    const rates = underpriced ? [] : ratesFromMeta(meta)
    return {
      id: room.id,
      name: room.name,
      boardType: room.board_type || '',
      meta,
      rates,
      index,
    }
  })

  const filled = fillMissingHotelRoomRates(
    shaped.map((r) => ({ name: r.name, boardType: r.boardType, rates: r.rates })),
    {
      floorNightly: floor,
      currency: 'TRY',
      boardType: shaped[0]?.boardType || '',
      validFrom: VALID_FROM,
      validTo: VALID_TO,
    },
  )

  // underpriced: tüm odaları tabandan yeniden yaz
  const finalRates = underpriced
    ? rooms.map((room, index) => {
        const factor = hotelRoomRateFactor(room.name, index)
        const nightlyPrice =
          Math.abs(factor - 1) < 1e-9
            ? floor
            : Math.max(500, roundHotelNightlyTry(floor * factor))
        return [
          {
            validFrom: VALID_FROM,
            validTo: VALID_TO,
            nightlyPrice,
            currency: 'TRY',
            boardType: room.board_type || '',
          },
        ]
      })
    : filled.map((r) => r.rates || [])

  const nightlies = finalRates.flatMap((rates) => rates.map((r) => Number(r.nightlyPrice)))
  const minNightly = Math.min(...nightlies.filter((n) => n > 0))

  const summary = {
    skipped: false,
    slug: listing.slug,
    floor,
    source: floorInfo.source,
    note: floorInfo.note,
    underpriced,
    needsFill,
    prevRulesMin: rulesMin,
    prevVitrin: listing.vitrin_price,
    nextMin: minNightly,
    rooms: rooms.map((room, i) => ({
      name: room.name,
      nightly: finalRates[i]?.[0]?.nightlyPrice ?? null,
    })),
  }

  if (DRY_RUN) return summary

  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i]
    const meta = { ...shaped[i].meta, seasonal_prices: finalRates[i] }
    if (!(Number(meta.price) > 0)) {
      meta.price = finalRates[i]?.[0]?.nightlyPrice
    }
    await pg.query(`UPDATE hotel_rooms SET meta_json = $2::jsonb WHERE id = $1::uuid`, [
      room.id,
      JSON.stringify(meta),
    ])
  }

  await pg.query(
    `DELETE FROM listing_price_rules
     WHERE listing_id = $1::uuid
       AND (
         rule_json->>'source' = $2
         OR rule_json->>'source' = 'tatilbudur'
         OR rule_json->>'source' = 'hotel_room_scoped_backfill'
       )`,
    [listing.id, RULE_SOURCE],
  )

  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i]
    const meta = parseMeta((await pg.query(`SELECT meta_json FROM hotel_rooms WHERE id=$1::uuid`, [room.id])).rows[0]?.meta_json)
    for (const rate of finalRates[i] || []) {
      await pg.query(
        `INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
         VALUES ($1::uuid, $2::jsonb, $3::date, $4::date)`,
        [
          listing.id,
          JSON.stringify({
            source: RULE_SOURCE,
            base_nightly: String(rate.nightlyPrice),
            base_price: String(rate.nightlyPrice),
            currency: 'TRY',
            room_type_id: String(meta.tatilbudur_room_type_id || meta.room_type_id || room.id),
            room_name: room.name,
            board_type: rate.boardType || room.board_type || '',
            price_source: floorInfo.source,
          }),
          rate.validFrom || VALID_FROM,
          rate.validTo || VALID_TO,
        ],
      )
    }
  }

  await pg.query(
    `UPDATE listings
     SET vitrin_price = $2,
         first_charge_amount = COALESCE(NULLIF(first_charge_amount, 0), $2),
         currency_code = 'TRY',
         updated_at = now()
     WHERE id = $1::uuid`,
    [listing.id, minNightly],
  )
  try {
    await pg.query(`SELECT refresh_listing_vitrin_prices_for($1::uuid)`, [listing.id])
  } catch {
    try {
      await pg.query(`SELECT refresh_listing_vitrin_prices()`)
    } catch {
      /* fonksiyon yoksa vitrin_price zaten yazıldı */
    }
  }

  return summary
}

async function main() {
  const bookederMeta = loadBookederMeta()
  const pg = createPgClient()
  await pg.connect()
  try {
    const params = []
    const where = [
      `pc.code = 'hotel'`,
      `l.status IN ('published','draft')`,
      `l.external_provider_code = 'tatilbudur'`,
    ]
    if (SLUG) {
      params.push(SLUG)
      where.push(`l.slug = $${params.length}`)
    }
    const { rows: listings } = await pg.query(
      `SELECT l.id, l.slug, l.vitrin_price, l.currency_code
       FROM listings l
       JOIN product_categories pc ON pc.id = l.category_id
       WHERE ${where.join(' AND ')}
       ORDER BY l.slug`,
      params,
    )

    const results = []
    const missingFloor = []
    for (const listing of listings) {
      const floorInfo = floorForSlug(listing.slug, bookederMeta)
      if (!floorInfo) {
        const { rows: rooms } = await pg.query(
          `SELECT count(*)::int AS n FROM hotel_rooms WHERE listing_id = $1::uuid`,
          [listing.id],
        )
        const { rows: rules } = await pg.query(
          `SELECT count(*)::int AS n FROM listing_price_rules WHERE listing_id = $1::uuid`,
          [listing.id],
        )
        if (Number(rules[0]?.n) === 0 && Number(rooms[0]?.n) > 0) {
          missingFloor.push(listing.slug)
        }
        continue
      }
      const summary = await applyListing(pg, listing, floorInfo)
      if (!summary.skipped) results.push(summary)
      else if (summary.reason !== 'already_priced') results.push(summary)
    }

    console.log(
      JSON.stringify(
        {
          apply: APPLY,
          dryRun: DRY_RUN,
          scanned: listings.length,
          updated: results.filter((r) => !r.skipped).length,
          results,
          stillMissingVerifiedFloor: missingFloor,
        },
        null,
        2,
      ),
    )
    if (DRY_RUN) console.error('[repair] dry-run — yazmak için --apply ekleyin')
  } finally {
    await pg.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

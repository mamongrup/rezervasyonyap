#!/usr/bin/env node
/**
 * Tek otel için KPlus SearchHotel arama modlarını karşılaştırır:
 *   (a) yalnız hotelCode  (b) yalnız destinationId  (c) destinationId + hotelCode
 * Amaç: "Invalid data(Hotels)" / fiyat gelmiyor için DOĞRU arama yöntemini bulmak.
 *
 *   set -a; source /etc/rezervasyonyap/backend.env; set +a
 *   node scripts/debug-travelrobot-hotel-rooms.mjs KC21285403
 *   node scripts/debug-travelrobot-hotel-rooms.mjs KDE1959013 531096   # destId elle
 */
import {
  createTravelrobotToken,
  loadTravelrobotConfig,
  searchHotels,
  getHotelRooms,
  pickHotelRows,
  pickHotelSearchKey,
} from './lib/travelrobot-api.mjs'
import { hotelRef } from './lib/travelrobot-listing-db.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const code = (process.argv[2] || '').trim()
const destArg = (process.argv[3] || '').trim()
const nameFilter = (process.argv[4] || '').trim().toLowerCase()
if (!code) {
  console.error('Kullanım: node scripts/debug-travelrobot-hotel-rooms.mjs <HOTEL_CODE> [DESTINATION_ID]')
  process.exit(1)
}

function addDays(n) {
  const d = new Date()
  d.setUTCHours(12, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function shape(value, depth = 0) {
  if (value == null) return value
  if (Array.isArray(value)) return value.length ? [shape(value[0], depth + 1)] : []
  if (typeof value === 'object') {
    const out = {}
    for (const k of Object.keys(value)) out[k] = depth >= 4 ? '…' : shape(value[k], depth + 1)
    return out
  }
  return value
}

function trunc(obj, n = 6000) {
  const s = JSON.stringify(obj, null, 2)
  return s.length > n ? s.slice(0, n) + '\n…(kısaltıldı)' : s
}

function hotelName(h) {
  const n = h?.Hotel ?? h?.hotel ?? h
  return String(n?.HotelName ?? n?.hotelName ?? n?.Name ?? n?.name ?? h?.HotelName ?? h?.Name ?? '').trim()
}

function firstRoomPrice(hotel) {
  for (const r of hotel?.Rooms ?? hotel?.rooms ?? []) {
    for (const a of r?.RoomAlternatives ?? r?.roomAlternatives ?? []) {
      const p = a?.Price ?? a?.price ?? a?.TotalAmount ?? a?.totalAmount ?? a?.Amount
      if (p != null) return p
    }
  }
  return null
}

// Snapshot/katalog içinde DestinationId benzeri ilk değeri özyinelemeli bul.
function findDestinationId(obj, seen = new Set()) {
  if (!obj || typeof obj !== 'object' || seen.has(obj)) return null
  seen.add(obj)
  for (const [k, v] of Object.entries(obj)) {
    if (/^destinationid$/i.test(k) && v != null && String(v).trim() !== '' && String(v) !== '0') return String(v)
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') {
      const r = findDestinationId(v, seen)
      if (r) return r
    }
  }
  return null
}

async function resolveDestinationIdFromDb(code) {
  const pg = createPgClient()
  await pg.connect()
  try {
    const r = await pg.query(
      `SELECT la.value_json::text AS snap
       FROM listings l
       JOIN listing_hotel_details lhd ON lhd.listing_id = l.id
       LEFT JOIN listing_attributes la ON la.listing_id = l.id AND la.group_code = 'travelrobot' AND la.key = 'snapshot'
       WHERE lhd.travelrobot_hotel_code = $1 LIMIT 1`,
      [code],
    )
    const snap = r.rows[0]?.snap
    if (!snap) return null
    let parsed = {}
    try { parsed = JSON.parse(snap) } catch { return null }
    return findDestinationId(parsed?.catalog ?? parsed)
  } finally {
    await pg.end()
  }
}

async function runSearch(cfg, tokenCode, label, opts) {
  let payload
  try {
    payload = await searchHotels(cfg, tokenCode, { showMultipleRate: true, checkInDate: addDays(30), checkOutDate: addDays(37), ...opts })
  } catch (e) {
    console.log(`  [${label}] istek hatası: ${e.message}`)
    return null
  }
  const rows = pickHotelRows(payload)
  const mine = rows.find((h) => hotelRef(h) === code) ?? null
  const err = payload?.ErrorMessage ?? payload?.Message ?? (payload?.HasError ? 'HasError' : '-')
  console.log(`  [${label}] Hotels=${rows.length}, otelimiz=${mine ? 'VAR' : 'yok'}, ilkFiyat=${mine ? firstRoomPrice(mine) : '-'}, hata=${err}`)
  if (rows.length && !mine) {
    console.log(`    -- ilk 12 sonucun kod/isim formatı (bizim kod: "${code}") --`)
    for (const h of rows.slice(0, 12)) {
      console.log(`       hotelRef="${hotelRef(h)}"  isim="${hotelName(h)}"  fiyat=${firstRoomPrice(h) ?? '-'}`)
    }
    if (nameFilter) {
      const hits = rows.filter((h) => hotelName(h).toLowerCase().includes(nameFilter))
      console.log(`    -- isim "${nameFilter}" içeren ${hits.length} sonuç --`)
      for (const h of hits.slice(0, 6)) {
        console.log(`       hotelRef="${hotelRef(h)}"  isim="${hotelName(h)}"  fiyat=${firstRoomPrice(h) ?? '-'}`)
      }
      const norm = (s) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
      const exactRow = rows.find((h) => hotelRef(h) === code)
      const normRow = rows.find((h) => norm(hotelRef(h)) === norm(code))
      console.log(`\n    -- EŞLEŞTİRME TEŞHİSİ --`)
      console.log(`    exact match: ${exactRow ? 'VAR' : 'yok'} | normalize match: ${normRow ? 'VAR' : 'yok'}`)
      const cand = exactRow ?? normRow ?? hits[0]
      if (cand) {
        const ref = hotelRef(cand)
        const cc = (s) => Array.from(String(s)).map((ch) => ch.charCodeAt(0)).join(',')
        console.log(`    satır hotelRef=${JSON.stringify(ref)} (len=${String(ref).length}, codes=${cc(ref)})`)
        console.log(`    bizim  code   =${JSON.stringify(code)} (len=${code.length}, codes=${cc(code)})`)
        console.log(`    fiyat=${firstRoomPrice(cand) ?? '-'}`)
        console.log(trunc(shape(cand), 3500))
      }
    }
  }
  return { payload, rows, mine }
}

async function main() {
  const cfg = await loadTravelrobotConfig()

  let destId = destArg
  if (!destId) {
    try { destId = await resolveDestinationIdFromDb(code) } catch (e) { console.log('DB destId çözümlenemedi:', e.message) }
  }
  console.log('Kod:', code, '| destinationId:', destId || '(yok)')

  // Tek token üret, tüm aramalarda paylaş (token başına rate-limit/Unauthorised'ı önler).
  const { tokenCode } = await createTravelrobotToken(cfg)

  console.log('\n===== Arama modu karşılaştırması (+30/+37) =====')
  await runSearch(cfg, tokenCode, 'a) yalnız hotelCode', { hotelCode: code })
  let best = null
  if (destId) {
    const c = await runSearch(cfg, tokenCode, 'c) destinationId + hotelCode', { destinationId: destId, hotelCode: code })
    if (c?.mine) best = c
    const b = await runSearch(cfg, tokenCode, 'b) yalnız destinationId', { destinationId: destId })
    if (!best && b?.mine) best = b
  } else {
    console.log('  (destinationId yok → b/c modları atlandı)')
  }

  if (!best) {
    console.log('\nSONUÇ: Otelimiz hiçbir modda teklifle dönmedi.')
    return
  }

  const sk = pickHotelSearchKey(best.payload, best.mine)
  console.log('\nÇalışan mod bulundu. SearchKey:', sk)
  console.log('\n-- Hotels[0] (otelimiz) yapısı --')
  console.log(trunc(shape(best.mine)))

  if (!sk) return
  console.log('\n===== GetHotelRoomPrices =====')
  const prices = await getHotelRooms(cfg, tokenCode, { productCode: code, hotelCode: code, searchKey: sk, languageCode: 'tr' })
  console.log('HasError:', prices?.HasError, '| ErrorMessage:', prices?.ErrorMessage ?? prices?.Message ?? '-')
  console.log(trunc(shape(prices)))
}

main().catch((e) => {
  console.error('HATA:', e.message)
  process.exit(1)
})

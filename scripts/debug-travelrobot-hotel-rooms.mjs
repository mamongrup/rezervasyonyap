#!/usr/bin/env node
/**
 * Tek otel için KPlus SearchHotel + GetHotelRoomPrices ham yanıtını döker.
 * "Invalid Key" / "Invalid data(Hotels)" / fiyat gelmiyor teşhisi için.
 *
 *   set -a; source /etc/rezervasyonyap/backend.env; set +a
 *   node scripts/debug-travelrobot-hotel-rooms.mjs KDE1959013
 *   node scripts/debug-travelrobot-hotel-rooms.mjs KBA489914
 */
import {
  createTravelrobotToken,
  loadTravelrobotConfig,
  searchHotels,
  getHotelRooms,
  pickHotelRows,
  pickHotelSearchKey,
} from './lib/travelrobot-api.mjs'

const code = (process.argv[2] || '').trim()
if (!code) {
  console.error('Kullanım: node scripts/debug-travelrobot-hotel-rooms.mjs <HOTEL_CODE>')
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

function trunc(obj, n = 7000) {
  const s = JSON.stringify(obj, null, 2)
  return s.length > n ? s.slice(0, n) + '\n…(kısaltıldı)' : s
}

function firstRoomPrice(hotel) {
  const rooms = hotel?.Rooms ?? hotel?.rooms ?? []
  for (const r of rooms) {
    const alts = r?.RoomAlternatives ?? r?.roomAlternatives ?? []
    for (const a of alts) {
      const p = a?.Price ?? a?.price ?? a?.TotalAmount ?? a?.totalAmount ?? a?.Amount
      if (p != null) return p
    }
  }
  return null
}

async function main() {
  const cfg = await loadTravelrobotConfig()

  // ── 1) Tarih penceresi taraması: hangi pencerede otel/teklif dönüyor? ──
  const windows = [
    [30, 37], [45, 52], [60, 67], [90, 97], [120, 127], [180, 187],
  ]
  console.log('===== Tarih penceresi taraması (kod:', code, ') =====')
  let workingWindow = null
  for (const [a, b] of windows) {
    const { tokenCode } = await createTravelrobotToken(cfg)
    const checkInDate = addDays(a)
    const checkOutDate = addDays(b)
    let search
    try {
      search = await searchHotels(cfg, tokenCode, { hotelCode: code, showMultipleRate: true, checkInDate, checkOutDate })
    } catch (e) {
      console.log(`  +${a}/+${b} (${checkInDate}→${checkOutDate}): istek hatası ${e.message}`)
      continue
    }
    const rows = pickHotelRows(search)
    const err = search?.ErrorMessage ?? search?.Message ?? (search?.HasError ? 'HasError' : '-')
    const price = rows.length ? firstRoomPrice(rows[0]) : null
    console.log(`  +${a}/+${b} (${checkInDate}→${checkOutDate}): Hotels=${rows.length}, ilkFiyat=${price ?? '-'}, hata=${err}`)
    if (rows.length && !workingWindow) workingWindow = { a, b, checkInDate, checkOutDate, search, found: rows[0] }
  }

  if (!workingWindow) {
    console.log('\nSONUÇ: Hiçbir tarih penceresinde otel/teklif dönmedi → bu otel için KPlus müsaitlik yok.')
    return
  }

  // ── 2) Çalışan pencerede tam yapı + GetHotelRoomPrices ──
  console.log(`\n===== Çalışan pencere: +${workingWindow.a}/+${workingWindow.b} =====`)
  const { tokenCode } = await createTravelrobotToken(cfg)
  const { search, found } = workingWindow
  const sk = pickHotelSearchKey(search, found)
  console.log('SearchKey:', sk)
  console.log('\n-- SearchHotel Hotels[0] yapısı --')
  console.log(trunc(shape(found)))

  if (!sk) return
  console.log('\n===== GetHotelRoomPrices =====')
  const prices = await getHotelRooms(cfg, tokenCode, { productCode: code, hotelCode: code, searchKey: sk, languageCode: 'tr' })
  console.log('HasError:', prices?.HasError, '| ErrorMessage:', prices?.ErrorMessage ?? prices?.Message ?? '-')
  console.log('\n-- GetHotelRoomPrices yapısı (örnek) --')
  console.log(trunc(shape(prices)))
}

main().catch((e) => {
  console.error('HATA:', e.message)
  process.exit(1)
})

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

async function main() {
  const cfg = await loadTravelrobotConfig()
  const { tokenCode } = await createTravelrobotToken(cfg)
  console.log('Token OK; kod:', code)

  const checkInDate = addDays(30)
  const checkOutDate = addDays(37)
  console.log('Tarihler (ISO girdi):', checkInDate, '→', checkOutDate)

  console.log('\n===== SearchHotel =====')
  const search = await searchHotels(cfg, tokenCode, {
    hotelCode: code,
    showMultipleRate: true,
    checkInDate,
    checkOutDate,
  })
  console.log('HasError:', search?.HasError, '| ErrorMessage:', search?.ErrorMessage ?? search?.Message ?? '-')
  console.log('Üst seviye anahtarlar:', Object.keys(search ?? {}))
  const rows = pickHotelRows(search)
  console.log('pickHotelRows sayısı:', rows.length)
  const found = rows.find((h) => String(h?.HotelId ?? h?.Hotel?.HotelCode ?? h?.HotelCode ?? '').includes(code)) ?? rows[0] ?? null
  console.log('SearchKey (pickHotelSearchKey):', pickHotelSearchKey(search, found))
  console.log('\n-- SearchHotel yapısı (örnek) --')
  console.log(trunc(shape(search)))

  const sk = pickHotelSearchKey(search, found)
  if (!sk) {
    console.log('\nSearchKey bulunamadı — GetHotelRoomPrices atlanıyor.')
    return
  }

  console.log('\n===== GetHotelRoomPrices =====')
  const prices = await getHotelRooms(cfg, tokenCode, {
    productCode: code,
    hotelCode: code,
    searchKey: sk,
    languageCode: 'tr',
  })
  console.log('HasError:', prices?.HasError, '| ErrorMessage:', prices?.ErrorMessage ?? prices?.Message ?? '-')
  console.log('Üst seviye anahtarlar:', Object.keys(prices ?? {}))
  console.log('\n-- GetHotelRoomPrices yapısı (örnek) --')
  console.log(trunc(shape(prices)))
}

main().catch((e) => {
  console.error('HATA:', e.message)
  process.exit(1)
})

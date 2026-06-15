/**
 * Travelrobot Hotel API — SearchHotel + GetHotelRoomPrices ile oda zenginleştirme.
 * SearchHotel çoğu otelde 1 RoomAlternative döner; GetHotelRoomPrices onlarca teklif verir.
 */
import {
  searchHotels,
  getHotelRooms,
  pickHotelRows,
  pickHotelSearchKey,
  hotelNodeFromPayload,
} from './travelrobot-api.mjs'
import { hotelRef, mergeStaticHotelContent } from './travelrobot-listing-db.mjs'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Toplam RoomAlternative sayısı (SearchHotel / GetHotelRoomPrices). */
export function countHotelRoomOffers(hotel) {
  const rooms = hotel?.Rooms ?? hotel?.rooms ?? []
  if (!Array.isArray(rooms) || !rooms.length) return 0
  let n = 0
  for (const r of rooms) {
    const alts = r?.RoomAlternatives ?? r?.roomAlternatives ?? []
    n += alts.length || (pickRoomName(r) ? 1 : 0)
  }
  return n
}

function pickRoomName(room) {
  return String(room?.Name ?? room?.name ?? room?.RoomName ?? room?.roomName ?? '').trim()
}

/** GetHotelRoomPrices yanıtındaki Rooms[] satıra birleştirilir. */
export function mergeHotelRoomPrices(row, pricesPayload, searchRow = null) {
  const hotel = hotelNodeFromPayload(pricesPayload)
  const rooms = hotel?.Rooms ?? hotel?.rooms ?? []
  if (!Array.isArray(rooms) || !rooms.length) {
    return searchRow ? mergeStaticHotelContent(row, searchRow) : row
  }
  const base = searchRow ? mergeStaticHotelContent(row, searchRow) : row
  const nested = base?.Hotel ?? base?.hotel ?? {}
  return {
    ...base,
    Rooms: rooms,
    SearchKey:
      base?.SearchKey ??
      base?.searchKey ??
      searchRow?.SearchKey ??
      searchRow?.searchKey ??
      pickHotelSearchKey(pricesPayload, hotel),
    Hotel: {
      ...nested,
      ...(hotel?.Hotel ?? hotel?.hotel ?? {}),
    },
  }
}

/**
 * Tek otel — SearchKey al, gerekirse GetHotelRoomPrices çağır.
 */
export async function enrichHotelRowWithRoomPrices(cfg, tokenCode, row, opts = {}) {
  const minOffers = Number(opts.minOffers ?? process.env.TRAVELROBOT_ROOM_MIN_OFFERS ?? 3)
  if (countHotelRoomOffers(row) >= minOffers) return row

  const code = hotelRef(row)
  if (!code || !tokenCode) return row

  const searchPayload = await searchHotels(cfg, tokenCode, {
    destinationId: opts.destinationId,
    hotelCode: code,
    showMultipleRate: true,
    checkInDate: opts.checkInDate,
    checkOutDate: opts.checkOutDate,
  })
  const found =
    pickHotelRows(searchPayload).find((h) => hotelRef(h) === code) ?? pickHotelRows(searchPayload)[0]
  let merged = found ? mergeStaticHotelContent(row, found) : row

  if (countHotelRoomOffers(merged) >= minOffers) return merged

  const sk = pickHotelSearchKey(searchPayload, found ?? merged)
  if (!sk) return merged

  const pricesPayload = await getHotelRooms(cfg, tokenCode, {
    productCode: code,
    hotelCode: code,
    searchKey: sk,
    languageCode: 'tr',
  })
  if (pricesPayload?.HasError) return merged

  return mergeHotelRoomPrices(merged, pricesPayload, found ?? merged)
}

/**
 * @param {object[]} rows
 * @param {object} opts — { destinationId, delayMs, minOffers, log }
 */
export async function enrichHotelRowsWithRoomPrices(cfg, tokenCode, rows, opts = {}) {
  if (!rows.length || !tokenCode) return rows

  const delayMs = Number(opts.delayMs ?? process.env.TRAVELROBOT_ROOM_DELAY_MS ?? 300)
  const log = opts.log ?? (() => {})
  const out = []
  let expanded = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const before = countHotelRoomOffers(row)

    if (before >= Number(opts.minOffers ?? process.env.TRAVELROBOT_ROOM_MIN_OFFERS ?? 3)) {
      out.push(row)
      skipped++
      continue
    }

    try {
      const merged = await enrichHotelRowWithRoomPrices(cfg, tokenCode, row, opts)
      const after = countHotelRoomOffers(merged)
      if (after > before) expanded++
      out.push(merged)
    } catch {
      failed++
      out.push(row)
    }

    if (delayMs > 0 && i + 1 < rows.length) await sleep(delayMs)
    if ((i + 1) % 25 === 0) await log(`Otel: oda fiyatları ${i + 1}/${rows.length}…`)
  }

  await log(
    `Otel: GetHotelRoomPrices — ${expanded} otelde oda genişletildi, ${skipped} zaten yeterli, ${failed} hata/atlandı`,
  )
  return out
}

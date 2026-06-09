/**
 * KPlus otel import — Static API + otel bazlı SearchHotel (oda/fiyat) zenginleştirme.
 */
import { searchHotels, pickHotelRows } from './travelrobot-api.mjs'
import { DEFAULT_HOTEL_DESTINATION_ID } from './travelrobot-sandbox-ids.mjs'
import { authenticateStatic, getBulkHotelContent } from './travelrobot-static-api.mjs'
import {
  buildStaticHotelMap,
  mergeStaticHotelContent,
  hotelRef,
  hotelHasRooms,
} from './travelrobot-listing-db.mjs'

export { hotelHasRooms }

const HOTEL_DESTINATION_ID =
  process.env.TRAVELROBOT_HOTEL_DESTINATION_ID || DEFAULT_HOTEL_DESTINATION_ID

/**
 * @param {object} opts
 * @param {boolean} [opts.withRooms]
 * @param {boolean} [opts.skipStatic]
 * @param {(msg: string) => void | Promise<void>} [opts.log]
 */
export async function enrichTravelrobotHotelRows(cfg, tokenCode, rows, opts = {}) {
  const withRooms = opts.withRooms ?? false
  const skipStatic = opts.skipStatic ?? false
  const log = opts.log ?? (() => {})

  if (!rows.length) return rows

  let enriched = rows
  if (!skipStatic) {
    try {
      const { token: staticToken } = await authenticateStatic(cfg)
      const codes = [...new Set(rows.map((r) => hotelRef(r)).filter(Boolean))]
      await log(`Otel: Static API — ${codes.length} kod için içerik alınıyor…`)
      const bulk = await getBulkHotelContent(cfg, staticToken, codes, { chunkSize: 50 })
      const staticMap = buildStaticHotelMap(bulk)
      enriched = rows.map((r) => mergeStaticHotelContent(r, staticMap.get(hotelRef(r))))
      await log(`Otel: Static API — ${staticMap.size} otel içeriği birleştirildi`)
    } catch (e) {
      console.warn('[uyarı] Static API atlandı:', e.message)
      await log(`Otel: Static API atlandı — ${String(e.message).slice(0, 100)}`)
    }
  }

  if (!withRooms) return enriched

  const out = []
  let roomHits = 0
  for (let i = 0; i < enriched.length; i++) {
    const row = enriched[i]
    if (hotelHasRooms(row)) {
      out.push(row)
      roomHits++
      continue
    }
    const code = hotelRef(row)
    if (!code) {
      out.push(row)
      continue
    }
    try {
      const payload = await searchHotels(cfg, tokenCode, {
        destinationId: HOTEL_DESTINATION_ID,
        hotelCode: code,
        showMultipleRate: true,
      })
      const found = pickHotelRows(payload).find((h) => hotelRef(h) === code) ?? pickHotelRows(payload)[0]
      out.push(found ? mergeStaticHotelContent(row, found) : row)
      if (found && hotelHasRooms(found)) roomHits++
    } catch {
      out.push(row)
    }
    if ((i + 1) % 25 === 0) {
      await log(`Otel: oda araması ${i + 1}/${enriched.length}…`)
    }
  }
  await log(`Otel: ${roomHits}/${enriched.length} kayıtta oda/fiyat verisi`)
  return out
}

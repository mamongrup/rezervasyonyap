/**
 * KPlus otel import — Static API + GetHotelDetails galeri + GetHotelRoomPrices odalar.
 */
import { DEFAULT_HOTEL_DESTINATION_ID } from './travelrobot-sandbox-ids.mjs'
import {
  authenticateStatic,
  getBulkHotelContent,
  staticCredentialsReady,
} from './travelrobot-static-api.mjs'
import {
  buildStaticHotelMap,
  mergeStaticHotelContent,
  hotelRef,
} from './travelrobot-listing-db.mjs'
import { enrichHotelRowsWithDetailsGallery } from './travelrobot-hotel-details.mjs'
import { enrichHotelRowsWithRoomPrices } from './travelrobot-hotel-rooms.mjs'
import { enrichHotelRowsWithI18nDetails } from './travelrobot-hotel-i18n.mjs'

export { hotelHasRooms } from './travelrobot-listing-db.mjs'

const HOTEL_DESTINATION_ID =
  process.env.TRAVELROBOT_HOTEL_DESTINATION_ID || DEFAULT_HOTEL_DESTINATION_ID

/**
 * @param {object} opts
 * @param {boolean} [opts.withRooms]
 * @param {boolean} [opts.withGallery]
 * @param {boolean} [opts.withVitrin] — GetHotelDetails vitrin (özellik/kural/facet)
 * @param {boolean} [opts.force] — mevcut veriyi atlayıp API'den yeniden çek
 * @param {boolean} [opts.skipStatic]
 * @param {(msg: string) => void | Promise<void>} [opts.log]
 */
export async function enrichTravelrobotHotelRows(cfg, tokenCode, rows, opts = {}) {
  const withRooms = opts.withRooms ?? false
  const withGallery = opts.withGallery ?? true
  const withVitrin = opts.withVitrin ?? false
  const withI18n = opts.withI18n ?? false
  const force = opts.force === true
  const skipStatic = opts.skipStatic ?? false
  const log = opts.log ?? (() => {})

  if (!rows.length) return rows

  let enriched = rows
  if (!skipStatic) {
    if (!staticCredentialsReady(cfg)) {
      const hint =
        'static_user/static_password eksik — panel veya backend.env (TRAVELROBOT_STATIC_USER/PASSWORD) + apply-travelrobot-live-config.mjs'
      console.warn('[uyarı] Static API atlandı:', hint)
      await log(`Otel: Static API atlandı — ${hint}`)
    } else {
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
  }

  if ((withGallery || withVitrin) && tokenCode) {
    enriched = await enrichHotelRowsWithDetailsGallery(cfg, tokenCode, enriched, {
      log,
      force: force || withVitrin,
    })
  }

  if (withI18n && tokenCode) {
    enriched = await enrichHotelRowsWithI18nDetails(cfg, tokenCode, enriched, {
      log,
      withI18n: true,
      force,
    })
  }

  if (!withRooms) return enriched

  enriched = await enrichHotelRowsWithRoomPrices(cfg, tokenCode, enriched, {
    destinationId: HOTEL_DESTINATION_ID,
    log,
    force,
  })
  return enriched
}

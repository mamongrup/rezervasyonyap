/**
 * Canlı ortam otel kataloğu — Static Content API (getAllHotelCodes + getHotels).
 * Sandbox SearchHotel destinasyon ID'leri canlıda boş dönebilir; bu modül yedek kaynaktır.
 */
import { buildStaticHotelMap } from './travelrobot-listing-db.mjs'
import {
  authenticateStatic,
  getAllHotelCodes,
  getBulkHotelContent,
  staticCredentialsReady,
} from './travelrobot-static-api.mjs'

export function isTravelrobotSandboxBaseUrl(baseUrl = '') {
  return /sandbox\.kplus\.com\.tr/i.test(String(baseUrl))
}

export function pickStaticHotelCodes(payload) {
  const raw = payload?.Result ?? payload?.HotelCodes ?? payload?.Codes ?? payload ?? []
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (typeof item === 'string' || typeof item === 'number') return String(item).trim()
      if (item && typeof item === 'object') {
        return String(item.Code ?? item.code ?? item.HotelCode ?? item.hotelCode ?? '').trim()
      }
      return ''
    })
    .filter(Boolean)
}

/** Static getHotels yanıtını import satırlarına çevirir. */
export function staticHotelRowsFromMap(staticMap) {
  return [...staticMap.values()].map((h) => {
    const nested = h?.Hotel ?? h?.hotel ?? h
    const code = String(
      nested?.HotelCode ?? nested?.hotelCode ?? nested?.Code ?? nested?.code ?? h?.HotelCode ?? '',
    ).trim()
    return {
      ...h,
      Hotel: nested,
      HotelCode: code,
      HotelId: code,
      HotelName:
        nested?.HotelName ??
        nested?.hotelName ??
        nested?.Name ??
        nested?.name ??
        h?.HotelName ??
        h?.Name,
    }
  })
}

/**
 * @param {object} cfg
 * @param {object} [opts]
 * @param {number} [opts.limit]
 * @param {number} [opts.chunkSize]
 * @param {(msg: string) => void} [opts.log]
 */
export async function fetchHotelCatalogFromStatic(cfg, opts = {}) {
  if (!staticCredentialsReady(cfg)) {
    throw new Error('static_user / static_password yapılandırılmamış')
  }
  const limit = Number(opts.limit) > 0 ? Number(opts.limit) : 0
  const chunkSize = opts.chunkSize ?? 50
  const log = opts.log ?? (() => {})

  const { token } = await authenticateStatic(cfg)
  log('Statik API: getAllHotelCodes çağrılıyor…')
  const codesPayload = await getAllHotelCodes(cfg, token)
  let codes = pickStaticHotelCodes(codesPayload)
  log(`Statik API: ${codes.length} otel kodu alındı`)
  if (!codes.length) return []

  if (limit > 0) codes = codes.slice(0, limit)
  log(`Statik API: getHotels — ${codes.length} kod için içerik alınıyor…`)
  const bulk = await getBulkHotelContent(cfg, token, codes, { chunkSize })
  const staticMap = buildStaticHotelMap(bulk)
  const rows = staticHotelRowsFromMap(staticMap)
  log(`Statik API: ${rows.length} otel içeriği hazır`)
  return rows
}

/**
 * Travelrobot Hotel API — SearchHotel + GetHotelRoomPrices ile oda zenginleştirme.
 * SearchHotel çoğu otelde 1 RoomAlternative döner; GetHotelRoomPrices onlarca teklif verir.
 */
import {
  searchHotels,
  getHotelRooms,
  pickHotelRows,
  pickHotelSearchKey,
  pickHotelSearchKeys,
  hotelNodeFromPayload,
} from './travelrobot-api.mjs'
import { stampHotelSearchWindow, stampTravelrobotHotelCommission } from './travelrobot-hotel-extras.mjs'
import { hotelCodeMatches, hotelRef, mergeStaticHotelContent } from './travelrobot-listing-db.mjs'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function defaultHotelSearchDates(opts = {}) {
  const addDays = (n) => {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() + n)
    return d.toISOString().slice(0, 10)
  }
  return {
    checkInDate: opts.checkInDate || addDays(30),
    checkOutDate: opts.checkOutDate || addDays(37),
  }
}

function summarizeApiIssue(issue) {
  if (!issue) return ''
  if (typeof issue === 'string') return issue
  if (issue instanceof Error) return issue.message
  try {
    return JSON.stringify(issue)
  } catch {
    return String(issue)
  }
}

function summarizeRoomPricesError(code, err) {
  const msg = summarizeApiIssue(err)
  return `[uyarı] GetHotelRoomPrices ${code}: ${msg.slice(0, 500) || 'bilinmeyen hata'}`
}

function withSearchDates(row, opts = {}, cfg = {}) {
  return stampTravelrobotHotelCommission(
    stampHotelSearchWindow(row, defaultHotelSearchDates(opts)),
    cfg.hotelCommissionPercent,
  )
}

function findDestinationId(obj, seen = new Set()) {
  if (!obj || typeof obj !== 'object' || seen.has(obj)) return null
  seen.add(obj)
  for (const [k, v] of Object.entries(obj)) {
    if (/^destinationid$/i.test(k) && v != null && String(v).trim() !== '' && String(v).trim() !== '0') {
      return String(v).trim()
    }
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') {
      const found = findDestinationId(v, seen)
      if (found) return found
    }
  }
  return null
}

function destinationIdForHotel(row, fallback = null) {
  return findDestinationId(row) ?? (fallback != null && String(fallback).trim() ? String(fallback).trim() : null)
}

async function searchHotelsByDestination(cfg, tokenCode, destinationId, opts = {}) {
  const cache = opts.destinationSearchCache
  const dates = defaultHotelSearchDates(opts)
  const key = `${destinationId}|${opts.checkInDate ?? dates.checkInDate}|${opts.checkOutDate ?? dates.checkOutDate}`
  if (cache?.has(key)) return cache.get(key)

  const promise = searchHotels(cfg, tokenCode, {
    destinationId,
    showMultipleRate: true,
    checkInDate: opts.checkInDate ?? dates.checkInDate,
    checkOutDate: opts.checkOutDate ?? dates.checkOutDate,
    onRequest: opts.onRequest,
    isAsync: opts.isAsync,
    timeoutMs: opts.timeoutMs,
  })
  if (cache) cache.set(key, promise)
  return promise
}

function pickRoomName(room) {
  return String(room?.Name ?? room?.name ?? room?.RoomName ?? room?.roomName ?? '').trim()
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

/** Vitrin için benzersiz oda adı sayısı (pansiyon varyantları birleştirilir). */
export function countUniqueHotelRoomNames(hotel) {
  const names = new Set()
  for (const r of hotel?.Rooms ?? hotel?.rooms ?? []) {
    const roomName = pickRoomName(r) || 'Standart Oda'
    const alts = r?.RoomAlternatives ?? r?.roomAlternatives ?? []
    if (!alts.length) {
      names.add(roomName.toLowerCase())
      continue
    }
    for (const alt of alts) {
      const name = String(alt?.RoomName ?? alt?.roomName ?? alt?.Name ?? alt?.name ?? roomName).trim()
      if (name) names.add(name.toLowerCase())
    }
  }
  return names.size
}

/** GetHotelRoomPrices yanıtındaki Rooms[] satıra birleştirilir. */
export function mergeHotelRoomPrices(row, pricesPayload, searchRow = null) {
  const code = hotelRef(row)
  const hotel = hotelNodeFromPayload(pricesPayload, code)
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
      pickHotelSearchKey(pricesPayload, searchRow ?? hotel) ??
      base?.SearchKey ??
      base?.searchKey ??
      null,
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
  row = stampTravelrobotHotelCommission(row, cfg?.hotelCommissionPercent)
  const minOffers = Number(opts.minOffers ?? process.env.TRAVELROBOT_ROOM_MIN_OFFERS ?? 3)
  if (opts.force !== true && countUniqueHotelRoomNames(row) >= minOffers) return row

  const code = hotelRef(row)
  if (!code || !tokenCode) return row

  const log = opts.log ?? (() => {})
  await log(`  SearchHotel ${code}…`)

  let searchPayload = null
  let found = null
  try {
    searchPayload = await searchHotels(cfg, tokenCode, {
      hotelCode: code,
      showMultipleRate: true,
      checkInDate: opts.checkInDate ?? defaultHotelSearchDates(opts).checkInDate,
      checkOutDate: opts.checkOutDate ?? defaultHotelSearchDates(opts).checkOutDate,
      onRequest: opts.onRequest,
      isAsync: opts.isAsync,
      rooms: opts.rooms,
      timeoutMs: opts.timeoutMs,
    })
    found = pickHotelRows(searchPayload).find((h) => hotelCodeMatches(h, code)) ?? null
  } catch (e) {
    await log(`  [uyarı] SearchHotel ${code} hotelCode hata: ${String(e.message).slice(0, 180)}`)
  }

  const destinationId = destinationIdForHotel(row, opts.destinationId)
  if (!found && destinationId) {
    await log(`  SearchHotel destinationId=${destinationId} içinde ${code} aranıyor…`)
    try {
      searchPayload = await searchHotelsByDestination(cfg, tokenCode, destinationId, opts)
      found = pickHotelRows(searchPayload).find((h) => hotelCodeMatches(h, code)) ?? null
    } catch (e) {
      await log(`  [uyarı] SearchHotel ${code} destinationId=${destinationId} hata: ${String(e.message).slice(0, 180)}`)
    }
  }

  let merged = found ? mergeStaticHotelContent(row, found) : row
  merged = withSearchDates(merged, opts, cfg)

  if (opts.force !== true && countUniqueHotelRoomNames(merged) >= minOffers) return merged

  const searchKeys = pickHotelSearchKeys(searchPayload, found)
  if (!searchKeys.length) return merged

  await log(`  GetHotelRoomPrices ${code}…`)
  let pricesPayload = null
  const priceCode = found ? hotelRef(found) || code : code
  let lastError = null
  for (let i = 0; i < searchKeys.length; i++) {
    try {
      const candidate = await getHotelRooms(cfg, tokenCode, {
        productCode: priceCode,
        hotelCode: priceCode,
        searchKey: searchKeys[i],
        languageCode: 'tr',
        timeoutMs: opts.timeoutMs,
      })
      if (!candidate?.HasError) {
        pricesPayload = candidate
        break
      }
      lastError = candidate?.ErrorMessage ?? candidate?.ErrorCode ?? candidate?.Message ?? candidate?.ResultMessage ?? candidate
    } catch (e) {
      lastError = e
    }
    if (i + 1 < searchKeys.length) {
      await log(`  [uyari] GetHotelRoomPrices ${code}: anahtar ${i + 1} reddedildi, sonraki anahtar deneniyor...`)
    }
  }
  if (!pricesPayload) {
    await log(summarizeRoomPricesError(code, lastError))
    return merged
  }

  return withSearchDates(mergeHotelRoomPrices(row, pricesPayload, found), opts, cfg)
}

/**
 * @param {object[]} rows
 * @param {object} opts — { destinationId, delayMs, minOffers, log }
 */
export async function enrichHotelRowsWithRoomPrices(cfg, tokenCode, rows, opts = {}) {
  if (!rows.length || !tokenCode) return rows

  const delayMs = Number(opts.delayMs ?? process.env.TRAVELROBOT_ROOM_DELAY_MS ?? 300)
  const minOffers = Number(opts.minOffers ?? process.env.TRAVELROBOT_ROOM_MIN_OFFERS ?? 3)
  const force = opts.force === true
  const log = opts.log ?? (() => {})
  const destinationSearchCache = opts.destinationSearchCache ?? new Map()
  const out = []
  let expanded = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const before = countUniqueHotelRoomNames(row)

    if (!force && before >= minOffers) {
      out.push(row)
      skipped++
      continue
    }

    try {
      const merged = await enrichHotelRowWithRoomPrices(cfg, tokenCode, row, {
        ...opts,
        minOffers,
        force: opts.force,
        destinationSearchCache,
      })
      const after = countUniqueHotelRoomNames(merged)
      if (after > before) expanded++
      out.push(merged)
    } catch (e) {
      failed++
      await log(summarizeRoomPricesError(hotelRef(row) || `#${i + 1}`, e))
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

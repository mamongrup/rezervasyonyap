/**
 * Travelrobot / KPlus otel — API'den vitrin/DB için ek alan eşlemesi.
 * (pansiyon planları, günlük fiyat, iptal, oda detayı, iletişim, i18n)
 */
import { extractHotelDetailsNode } from './travelrobot-hotel-vitrin.mjs'

/** TRY gecelik üst sınır — anomali API yanıtlarını vitrine taşımaz. */
export const MAX_SANE_NIGHTLY = 80_000

const DEFAULT_SEARCH_NIGHTS = Math.max(
  1,
  Number.parseInt(String(process.env.TRAVELROBOT_HOTEL_SEARCH_NIGHTS ?? '7'), 10) || 7,
)

const BOARD_TO_PLAN = [
  { codes: ['UAI', 'ULTRA', 'ULTRA ALL INCLUSIVE'], plan: 'all_inclusive', label: 'Ultra Her Şey Dahil' },
  { codes: ['AI', 'ALL INCLUSIVE', 'ALL_INCLUSIVE'], plan: 'all_inclusive', label: 'Her Şey Dahil' },
  { codes: ['FB', 'FULL BOARD', 'FULL_BOARD'], plan: 'full_board', label: 'Tam Pansiyon' },
  { codes: ['HB', 'HALF BOARD', 'HALF_BOARD'], plan: 'half_board', label: 'Yarım Pansiyon' },
  { codes: ['BB', 'BED AND BREAKFAST', 'BED_BREAKFAST', 'B&B'], plan: 'bed_breakfast', label: 'Oda & Kahvaltı' },
  { codes: ['RO', 'ROOM ONLY', 'ROOM_ONLY', 'SC', 'NO BOARD'], plan: 'room_only', label: 'Yemeksiz' },
]

const PLAN_LABEL_EN = {
  room_only: 'Room Only',
  bed_breakfast: 'Bed & Breakfast',
  half_board: 'Half Board',
  full_board: 'Full Board',
  all_inclusive: 'All Inclusive',
  custom: 'Custom Plan',
}

function pickText(obj, ...keys) {
  for (const k of keys) {
    const v = String(obj?.[k] ?? '').trim()
    if (v) return v
  }
  return ''
}

function stripHtml(html) {
  return String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function roomNameKey(name) {
  return String(name || 'standart oda')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function sanePrice(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n) || n <= 0 || n > MAX_SANE_NIGHTLY) return null
  return n
}

export function boardToMealPlan(boardRaw, boardNameRaw) {
  const code = String(boardRaw ?? boardNameRaw ?? '')
    .trim()
    .toUpperCase()
  if (!code) return { plan_code: 'room_only', label: PLAN_LABEL_EN.room_only, label_en: PLAN_LABEL_EN.room_only }
  for (const row of BOARD_TO_PLAN) {
    if (row.codes.some((c) => code.includes(c))) {
      return {
        plan_code: row.plan,
        label: row.label,
        label_en: PLAN_LABEL_EN[row.plan] ?? row.label,
      }
    }
  }
  const label = String(boardNameRaw ?? boardRaw ?? 'Özel Plan').trim() || 'Özel Plan'
  return { plan_code: 'custom', label, label_en: label }
}

function dailyPricesFromAlt(alt) {
  const raw =
    alt?.DailyPrices ??
    alt?.DaliyPrices ??
    alt?.dailyPrices ??
    alt?.DailyPriceList ??
    alt?.PriceList ??
    []
  return Array.isArray(raw) ? raw : []
}

/** KPlus tarih → YYYY-MM-DD */
export function parseKplusDate(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const dot = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (dot) {
    const dd = String(dot[1]).padStart(2, '0')
    const mm = String(dot[2]).padStart(2, '0')
    return `${dot[3]}-${mm}-${dd}`
  }
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (slash) {
    const dd = String(slash[1]).padStart(2, '0')
    const mm = String(slash[2]).padStart(2, '0')
    return `${slash[3]}-${mm}-${dd}`
  }
  return null
}

function parseNightCount(raw) {
  const n = Number.parseInt(String(raw ?? '').trim(), 10)
  return Number.isFinite(n) && n > 0 && n <= 60 ? n : null
}

function diffNightsBetween(checkIn, checkOut) {
  const start = parseKplusDate(checkIn)
  const end = parseKplusDate(checkOut)
  if (!start || !end) return 0
  const ms = new Date(`${end}T12:00:00Z`).getTime() - new Date(`${start}T12:00:00Z`).getTime()
  const nights = Math.round(ms / 86_400_000)
  return nights > 0 ? nights : 0
}

/** SearchHotel varsayılanı (+30…+37 gün) veya snapshot üzerindeki tarihler. */
export function inferSearchNightsFromHotel(hotel) {
  const nights = diffNightsBetween(
    pickText(hotel, 'CheckInDate', 'checkInDate', 'CheckinDate', 'checkinDate'),
    pickText(hotel, 'CheckOutDate', 'checkOutDate', 'CheckoutDate', 'checkoutDate'),
  )
  if (nights > 0) return nights
  const fromMeta = parseNightCount(hotel?._searchNights ?? hotel?.searchNights)
  if (fromMeta != null) return fromMeta
  return DEFAULT_SEARCH_NIGHTS
}

/** Otel satırına arama penceresi (gece sayısı için). */
export function stampHotelSearchWindow(hotel, { checkInDate, checkOutDate } = {}) {
  if (!hotel || typeof hotel !== 'object') return hotel
  const checkIn = String(checkInDate ?? hotel.CheckInDate ?? hotel.checkInDate ?? '').trim()
  const checkOut = String(checkOutDate ?? hotel.CheckOutDate ?? hotel.checkOutDate ?? '').trim()
  const nights = diffNightsBetween(checkIn, checkOut) || DEFAULT_SEARCH_NIGHTS
  return {
    ...hotel,
    ...(checkIn ? { CheckInDate: checkIn } : {}),
    ...(checkOut ? { CheckOutDate: checkOut } : {}),
    _searchNights: nights,
  }
}

function eachStayNightYmd(checkIn, checkOut) {
  const start = parseKplusDate(checkIn)
  const end = parseKplusDate(checkOut)
  if (!start || !end) return []
  const out = []
  const cur = new Date(`${start}T12:00:00Z`)
  const endD = new Date(`${end}T12:00:00Z`)
  while (cur < endD) {
    out.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return out
}

function offerTotalAmount(alt) {
  const price = alt?.Price ?? alt?.price
  if (price && typeof price === 'object' && !Array.isArray(price)) {
    const nested = sanePrice(
      price?.TotalAmount ??
        price?.totalAmount ??
        price?.BaseAmount ??
        price?.baseAmount ??
        price?.Amount ??
        price?.amount,
    )
    if (nested != null) return nested
  }
  return sanePrice(
    alt?.TotalAmount ?? alt?.totalAmount ?? alt?.BaseAmount ?? alt?.baseAmount ?? alt?.Amount ?? alt?.amount,
  )
}

function explicitNightlyFromAlt(alt) {
  const price = alt?.Price ?? alt?.price
  const nested =
    price && typeof price === 'object' && !Array.isArray(price)
      ? sanePrice(
          price?.NightlyPrice ??
            price?.nightlyPrice ??
            price?.PerNightPrice ??
            price?.perNightPrice ??
            price?.PricePerNight ??
            price?.pricePerNight,
        )
      : null
  if (nested != null) return nested
  return sanePrice(
    alt?.NightlyPrice ??
      alt?.nightlyPrice ??
      alt?.PerNightPrice ??
      alt?.perNightPrice ??
      alt?.PricePerNight ??
      alt?.pricePerNight ??
      alt?.DailyPrice ??
      alt?.dailyPrice,
  )
}

function resolveStayNights(alt, hotel) {
  const fromAlt = parseNightCount(
    alt?.NightCount ?? alt?.nightCount ?? alt?.NumberOfNights ?? alt?.numberOfNights ?? alt?.StayNights,
  )
  if (fromAlt != null) return fromAlt

  const daily = dailyPricesFromAlt(alt)
  if (daily.length > 1) return daily.length

  const fromHotel = inferSearchNightsFromHotel(hotel)
  if (fromHotel > 1) return fromHotel
  return 1
}

/** Günlük fiyat satırı — yalnızca gecelik alanlar; TotalAmount çok gece toplamı olabilir. */
function nightlyPriceFromDailyRow(row, stayNights = 1) {
  const direct = sanePrice(
    row?.NightlyPrice ??
      row?.nightlyPrice ??
      row?.PerNightPrice ??
      row?.perNightPrice ??
      row?.Price ??
      row?.price ??
      row?.Amount ??
      row?.amount,
  )
  if (direct != null) return direct

  const total = sanePrice(row?.TotalAmount ?? row?.totalAmount ?? row?.BaseAmount ?? row?.baseAmount)
  if (total == null) return null
  const nights = Math.max(stayNights, 1)
  if (nights > 1) return Math.round((total / nights) * 100) / 100
  return total
}

/** RoomAlternative — KPlus TotalAmount çoğunlukla konaklama toplamıdır. */
export function resolveOfferNightlyPrice(alt, room, hotel) {
  const stayNights = resolveStayNights(alt, hotel)
  const dailyRows = dailyPricesFromAlt(alt)
  const nightlyFromDaily = []
  for (const dp of dailyRows) {
    const p = nightlyPriceFromDailyRow(dp, stayNights)
    if (p != null) nightlyFromDaily.push(p)
  }
  if (nightlyFromDaily.length > 0) return Math.min(...nightlyFromDaily)

  const explicit = explicitNightlyFromAlt(alt)
  if (explicit != null) return explicit

  const total = offerTotalAmount(alt)
  if (total == null) return null
  const nights = Math.max(stayNights, dailyRows.length, 1)
  if (nights > 1) return Math.round((total / nights) * 100) / 100
  return total
}

function buildDailyCalendarForAlt(alt, room, hotel, nightly) {
  const stayNights = resolveStayNights(alt, hotel)
  const dailyCalendar = []
  for (const dp of dailyPricesFromAlt(alt)) {
    const day = parseKplusDate(dp?.Date ?? dp?.date ?? dp?.Day ?? dp?.day)
    const price = nightlyPriceFromDailyRow(dp, stayNights) ?? nightly
    if (!day || price == null) continue
    dailyCalendar.push({
      day,
      price,
      available_units: allotmentFromAlt(alt) ?? 1,
    })
  }
  if (!dailyCalendar.length && nightly != null) {
    const checkIn = pickText(hotel, 'CheckInDate', 'checkInDate')
    const checkOut = pickText(hotel, 'CheckOutDate', 'checkOutDate')
    for (const day of eachStayNightYmd(checkIn, checkOut)) {
      dailyCalendar.push({
        day,
        price: nightly,
        available_units: allotmentFromAlt(alt) ?? 1,
      })
    }
  }
  return dailyCalendar
}

function cancellationFromAlt(alt) {
  const parts = []
  const direct = pickText(alt, 'CancellationPolicy', 'cancellationPolicy', 'CancelPolicy', 'cancelPolicy')
  if (direct) parts.push(direct)
  for (const key of ['CancellationPolicies', 'cancellationPolicies', 'Policies', 'policies']) {
    const arr = alt?.[key]
    if (!Array.isArray(arr)) continue
    for (const p of arr) {
      const t = pickText(p, 'Description', 'description', 'Text', 'text', 'Policy', 'policy', 'Name', 'name')
      if (t) parts.push(t)
    }
  }
  if (alt?.IsRefundable === false || alt?.NonRefundable === true || alt?.nonRefundable === true) {
    parts.push('İade edilemez (non-refundable)')
  }
  return parts.join(' · ').trim()
}

function capacityFromAlt(alt, room) {
  const candidates = [
    alt?.MaxOccupancy,
    alt?.maxOccupancy,
    alt?.MaxPax,
    alt?.maxPax,
    alt?.PaxCount,
    alt?.paxCount,
    alt?.Capacity,
    alt?.capacity,
    room?.MaxOccupancy,
    room?.Capacity,
    room?.PaxCount,
  ]
  for (const c of candidates) {
    const n = Number(c)
    if (Number.isFinite(n) && n > 0 && n <= 20) return n
  }
  return null
}

function allotmentFromAlt(alt) {
  const n = Number(alt?.Allotment ?? alt?.allotment ?? alt?.AvailableCount ?? alt?.availableCount)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.min(Math.max(Math.trunc(n), 0), 99)
}

function imagesFromAlt(alt, room) {
  const urls = []
  const push = (u) => {
    const s = String(u || '').trim()
    if (s && !urls.includes(s)) urls.push(s)
  }
  push(pickText(alt, 'ImageUrl', 'imageUrl', 'RoomImageUrl', 'roomImageUrl'))
  for (const key of ['Images', 'images', 'RoomImages', 'roomImages', 'Photos', 'photos']) {
    const arr = alt?.[key] ?? room?.[key]
    if (!Array.isArray(arr)) continue
    for (const item of arr) {
      if (typeof item === 'string') push(item)
      else push(pickText(item, 'Url', 'url', 'ImageUrl', 'imageUrl'))
    }
  }
  return urls
}

const ROOM_IMAGE_STOP_WORDS = new Set([
  'room',
  'rooms',
  'oda',
  'odasi',
  'bed',
  'beds',
  'yatak',
  'full',
  'type',
  'subject',
  'availability',
  'is',
  'to',
  'with',
  'the',
])

function normalizeRoomImageText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function meaningfulRoomTokens(value) {
  return normalizeRoomImageText(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !ROOM_IMAGE_STOP_WORDS.has(token))
}

function genericRoomGalleryImages(galleryEntries, roomName) {
  const primary = []
  const secondary = []
  for (const entry of galleryEntries ?? []) {
    const url = String(entry?.url || '').trim()
    const title = normalizeRoomImageText(entry?.title)
    if (!url) continue
    if (['room', 'guest room', 'bedroom', 'hotel room'].includes(title)) primary.push(url)
    else if (['living area', 'bathroom', 'private bathroom'].includes(title)) secondary.push(url)
  }
  const pool = [...new Set([...primary, ...secondary])]
  if (!primary.length || !pool.length) return []

  // Sağlayıcı yalnızca "Room" diyorsa yine gerçek oda fotoğraflarını kullan;
  // oda kartlarının tamamında aynı kapak görünmesin diye oda adına göre döndür.
  const seed = [...String(roomName || '')].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const offset = seed % primary.length
  const rotatedPrimary = [...primary.slice(offset), ...primary.slice(0, offset)]
  return [...new Set([...rotatedPrimary, ...secondary])].slice(0, 6)
}

/**
 * GetHotelDetails çoğunlukla oda fotoğraflarını HotelImages[] içinde döndürür.
 * Görsel başlığı/caption'ı veya URL dosya adı oda adıyla gerçekten eşleşiyorsa
 * ilgili odaya bağlanır; lobi, havuz ve restoran fotoğrafları oda diye atanmaz.
 */
export function matchTravelrobotRoomGalleryImages(galleryEntries, roomName) {
  const roomText = normalizeRoomImageText(roomName)
  const roomTokens = [...new Set(meaningfulRoomTokens(roomName))]
  if (!roomText || roomTokens.length === 0) return []

  const scored = []
  for (const entry of galleryEntries ?? []) {
    const url = String(entry?.url || '').trim()
    if (!url) continue
    let decodedUrl = url
    try {
      decodedUrl = decodeURIComponent(url)
    } catch {
      // Bozuk URL kodlaması eşleştirmeyi engellememeli.
    }
    const imageText = normalizeRoomImageText(`${entry?.title ?? ''} ${decodedUrl}`)
    if (!imageText) continue
    const imageTokens = new Set(meaningfulRoomTokens(imageText))
    const overlap = roomTokens.filter((token) => imageTokens.has(token))
    const exactPhrase = imageText.includes(roomText) || roomText.includes(imageText)
    const distinctive = overlap.some((token) =>
      ['suite', 'deluxe', 'standard', 'family', 'double', 'twin', 'single', 'king', 'queen', 'bedroom'].includes(token),
    )
    const score = (exactPhrase ? 10 : 0) + overlap.length * 2 + (distinctive ? 2 : 0)
    if (score >= 6 || (overlap.length >= 2 && distinctive)) scored.push({ url, score })
  }

  const matched = scored
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.url)
    .filter((url, index, all) => all.indexOf(url) === index)
    .slice(0, 12)
  return matched.length ? matched : genericRoomGalleryImages(galleryEntries, roomName)
}

function altMetaFromOffer(alt, room, hotel) {
  const roomCode = pickText(alt, 'RoomCode', 'roomCode')
  const resultKey = pickText(alt, 'ResultKey', 'resultKey') || pickText(alt, 'Key', 'key')
  const combinationId = pickText(alt, 'CombinationId', 'combinationId')
  const packageId = pickText(alt, 'PackageId', 'packageId')
  const board = pickText(alt, 'BoardType', 'boardType', 'BoardName', 'boardName', 'MealType', 'mealType')
  const nightly = resolveOfferNightlyPrice(alt, room, hotel)
  const currency = String(alt?.CurrencyCode ?? alt?.currencyCode ?? 'TRY').trim().toUpperCase()
  const cancel = cancellationFromAlt(alt)
  const bedType =
    pickText(alt, 'BedType', 'bedType', 'BedTypeName', 'bedTypeName') ||
    pickText(room, 'BedType', 'bedType')
  const description =
    pickText(alt, 'RoomDescription', 'roomDescription', 'Description', 'description') ||
    pickText(room, 'Description', 'description')
  return {
    travelrobot_room_code: roomCode || null,
    result_key: resultKey || null,
    combination_id: combinationId || null,
    package_id: packageId || null,
    board_type: board || null,
    price: nightly != null ? String(nightly) : null,
    currency: ['TRY', 'EUR', 'USD', 'GBP'].includes(currency) ? currency : 'TRY',
    cancellation_policy: cancel || null,
    is_refundable: alt?.IsRefundable ?? alt?.isRefundable ?? null,
    non_refundable: alt?.NonRefundable ?? alt?.nonRefundable ?? null,
    bed_type: bedType || null,
    description: description || null,
    search_key: pickText(hotel, 'SearchKey', 'searchKey') || null,
    images: imagesFromAlt(alt, room),
  }
}

/** Vitrin oda satırları — aynı oda adında en ucuz teklif + zengin meta. */
export function buildTravelrobotHotelRoomRows(hotel) {
  const rooms = hotel?.Rooms ?? hotel?.rooms ?? []
  const galleryEntries = collectHotelGalleryEntries(hotel)
  const raw = []
  for (const room of rooms) {
    const roomName = pickText(room, 'Name', 'name', 'RoomName', 'roomName') || 'Standart Oda'
    const alts = room?.RoomAlternatives ?? room?.roomAlternatives ?? []
    if (!alts.length) {
      const images = matchTravelrobotRoomGalleryImages(galleryEntries, roomName)
      raw.push({
        name: roomName.slice(0, 200),
        boardType: null,
        price: null,
        currency: 'TRY',
        capacity: capacityFromAlt({}, room),
        unitCount: 1,
        meta: {
          source: 'travelrobot',
          images,
          ...(images[0] ? { image: images[0] } : {}),
        },
        dailyCalendar: [],
      })
      continue
    }
    for (const alt of alts) {
      const name = pickText(alt, 'RoomName', 'roomName', 'Name', 'name') || roomName
      const board = pickText(alt, 'BoardType', 'boardType', 'BoardName', 'boardName', 'MealType', 'mealType')
      const nightly = resolveOfferNightlyPrice(alt, room, hotel)
      const currency = String(alt?.CurrencyCode ?? alt?.currencyCode ?? 'TRY').trim().toUpperCase()
      const meta = altMetaFromOffer(alt, room, hotel)
      if (!meta.images?.length) {
        meta.images = matchTravelrobotRoomGalleryImages(galleryEntries, name)
      }
      const image = meta.images?.[0]
      if (image) meta.image = image
      const dailyCalendar = buildDailyCalendarForAlt(alt, room, hotel, nightly)
      raw.push({
        name: name.slice(0, 200),
        boardType: board || null,
        price: nightly,
        currency: ['TRY', 'EUR', 'USD', 'GBP'].includes(currency) ? currency : 'TRY',
        capacity: capacityFromAlt(alt, room),
        unitCount: Math.max(1, allotmentFromAlt(alt) ?? 1),
        meta: { ...meta, source: 'travelrobot' },
        dailyCalendar,
      })
    }
  }

  const byName = new Map()
  for (const r of raw) {
    const key = roomNameKey(r.name)
    const prev = byName.get(key)
    if (!prev) {
      byName.set(key, r)
      continue
    }
    const pPrev = prev.price ?? Number.POSITIVE_INFINITY
    const pNew = r.price ?? Number.POSITIVE_INFINITY
    if (pNew < pPrev) {
      byName.set(key, r)
      continue
    }
    if (pNew === pPrev && (r.dailyCalendar?.length ?? 0) > (prev.dailyCalendar?.length ?? 0)) {
      byName.set(key, r)
    }
  }
  return [...byName.values()]
}

/** listing_meal_plans satırları — tüm tekliflerden benzersiz pansiyon. */
export function extractTravelrobotMealPlans(hotel, currency = 'TRY') {
  const byPlan = new Map()
  for (const r of buildTravelrobotHotelRoomRows(hotel)) {
    const mapped = boardToMealPlan(r.boardType, r.boardType)
    const planKey = mapped.plan_code === 'custom' ? `custom:${mapped.label.toLowerCase()}` : mapped.plan_code
    const price = r.price ?? sanePrice(r.meta?.price)
    const prev = byPlan.get(planKey)
    if (!prev) {
      byPlan.set(planKey, {
        plan_code: mapped.plan_code,
        label: mapped.label,
        label_en: mapped.label_en,
        price_per_night: price ?? 0,
        currency_code: r.currency || currency,
        sort_order: planSort(mapped.plan_code),
      })
      continue
    }
    if (price != null && (prev.price_per_night === 0 || price < prev.price_per_night)) {
      prev.price_per_night = price
    }
  }
  return [...byPlan.values()].filter((p) => p.price_per_night > 0 || p.plan_code === 'room_only')
}

function planSort(planCode) {
  const order = {
    room_only: 0,
    bed_breakfast: 1,
    half_board: 2,
    full_board: 3,
    all_inclusive: 4,
    custom: 5,
  }
  return order[planCode] ?? 9
}

export function extractHotelMinNightlyPrice(hotel) {
  let min = null
  for (const r of buildTravelrobotHotelRoomRows(hotel)) {
    if (r.price != null && (min == null || r.price < min)) min = r.price
  }
  return min
}

/** Otel düzeyinde iptal metni — tekliflerden en uzun anlamlı metin. */
export function extractTravelrobotCancellationText(hotel) {
  let best = ''
  for (const r of buildTravelrobotHotelRoomRows(hotel)) {
    const t = String(r.meta?.cancellation_policy ?? '').trim()
    if (t.length > best.length) best = t
  }
  const node = extractHotelDetailsNode(hotel)
  const summary = stripHtml(node?.SummaryText ?? node?.summaryText ?? '')
  const cancelInSummary = summary.match(/cancel[^.]{10,240}\./i)?.[0]
  if (cancelInSummary && cancelInSummary.length > best.length) best = cancelInSummary.trim()
  return best.slice(0, 4000) || null
}

function normalizeTime(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (!m) return s.slice(0, 8)
  let h = Number(m[1])
  const min = m[2] ? String(m[2]).padStart(2, '0') : '00'
  const ap = (m[3] ?? '').toLowerCase()
  if (ap === 'pm' && h < 12) h += 12
  if (ap === 'am' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${min}`
}

export function extractTravelrobotListingMeta(hotel) {
  const node = extractHotelDetailsNode(hotel)
  const summary = stripHtml(node?.SummaryText ?? node?.summaryText ?? '')

  let checkIn =
    pickText(node, 'CheckInTime', 'checkInTime', 'CheckIn', 'checkIn') ||
    summary.match(/check[\s-]?in[^:]*[:]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i)?.[1] ||
    summary.match(/giri[sş][^:]*[:]\s*(\d{1,2}(?::\d{2})?)/i)?.[1]
  let checkOut =
    pickText(node, 'CheckOutTime', 'checkOutTime', 'CheckOut', 'checkOut') ||
    summary.match(/check[\s-]?out[^:]*[:]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i)?.[1] ||
    summary.match(/[çc][iı]k[iı][sş][^:]*[:]\s*(\d{1,2}(?::\d{2})?)/i)?.[1]

  const address =
    pickText(node, 'Address', 'address', 'HotelAddress', 'hotelAddress', 'FullAddress', 'fullAddress') ||
    [pickText(node, 'Street', 'street'), pickText(node, 'City', 'city'), pickText(node, 'Country', 'country')]
      .filter(Boolean)
      .join(', ')

  const categoriesRaw = node?.HotelCategories ?? node?.hotelCategories ?? node?.Categories ?? node?.categories
  const hotel_categories = Array.isArray(categoriesRaw)
    ? categoriesRaw
        .map((c) =>
          typeof c === 'string'
            ? c.trim()
            : pickText(c, 'Name', 'name', 'CategoryName', 'categoryName', 'Code', 'code'),
        )
        .filter(Boolean)
        .slice(0, 20)
    : []

  return {
    address: address || null,
    city: pickText(node, 'City', 'city', 'CityName', 'cityName') || null,
    province_city: pickText(node, 'State', 'state', 'Region', 'region') || null,
    district_label: pickText(node, 'District', 'district', 'Area', 'area') || null,
    check_in_time: checkIn ? normalizeTime(checkIn) : null,
    check_out_time: checkOut ? normalizeTime(checkOut) : null,
    phone: pickText(node, 'Phone', 'phone', 'PhoneNumber', 'phoneNumber', 'Tel', 'tel') || null,
    email: pickText(node, 'Email', 'email', 'ContactEmail', 'contactEmail') || null,
    website: pickText(node, 'Website', 'website', 'WebSite', 'webSite', 'Url', 'url') || null,
    fax: pickText(node, 'Fax', 'fax', 'FaxNumber', 'faxNumber') || null,
    postal_code: pickText(node, 'PostalCode', 'postalCode', 'ZipCode', 'zipCode', 'Zip', 'zip') || null,
    country_code: pickText(node, 'CountryCode', 'countryCode', 'Country', 'country') || null,
    destination_id: pickText(node, 'DestinationId', 'destinationId', 'DestinationID', 'destinationID') || null,
    hotel_categories: hotel_categories.length ? hotel_categories : null,
  }
}

export function collectHotelGalleryEntries(hotel) {
  const nested = hotel?.Hotel ?? hotel?.hotel
  const entries = []
  const seen = new Set()
  const push = (url, title = '') => {
    const u = String(url || '').trim()
    if (!u || seen.has(u)) return
    seen.add(u)
    entries.push({ url: u, title: String(title || '').trim() })
  }

  for (const src of [hotel, nested]) {
    if (!src || typeof src !== 'object') continue
    for (const key of [
      'HotelImages',
      'hotelImages',
      'Images',
      'images',
      'Photos',
      'photos',
      'Gallery',
      'gallery',
    ]) {
      const arr = src[key]
      if (!Array.isArray(arr)) continue
      for (const item of arr) {
        if (typeof item === 'string') push(item)
        else {
          push(
            pickText(
              item,
              'Url',
              'url',
              'ImageUrl',
              'imageUrl',
              'Path',
              'path',
              'Src',
              'src',
              'MediaUrl',
              'mediaUrl',
            ),
            [
              pickText(item, 'ImageTitle', 'imageTitle', 'Title', 'title', 'Caption', 'caption'),
              pickText(
                item,
                'Description',
                'description',
                'RoomType',
                'roomType',
                'Category',
                'category',
                'AltText',
                'altText',
              ),
            ]
              .filter(Boolean)
              .join(' '),
          )
        }
      }
    }
  }

  push(
    pickText(hotel, 'HotelImageURL', 'ImageUrl', 'ThumbnailUrl') ||
      pickText(nested ?? {}, 'HotelImageURL', 'ImageUrl', 'ThumbnailUrl'),
  )

  return entries
}

/** listing_price_rules — ardışık aynı fiyat günlerinden dönem bantları (listing düzeyi). */
export function extractTravelrobotSeasonalPriceRules(hotel, currency = 'TRY') {
  const byDay = new Map()
  for (const room of buildTravelrobotHotelRoomRows(hotel)) {
    for (const row of room.dailyCalendar ?? []) {
      const prev = byDay.get(row.day)
      if (prev == null || row.price < prev) byDay.set(row.day, row.price)
    }
  }
  if (!byDay.size) return []

  const days = [...byDay.keys()].sort()
  const bands = []
  let start = days[0]
  let end = days[0]
  let price = byDay.get(days[0])

  for (let i = 1; i < days.length; i++) {
    const d = days[i]
    const p = byDay.get(d)
    // Aynı fiyat: rezervasyon/gap olsa bile dönemi bölme (fiyat değişince yeni bant)
    if (p === price) {
      end = d
      continue
    }
    bands.push({ valid_from: start, valid_to: end, base_nightly: price, currency })
    start = d
    end = d
    price = p
  }
  bands.push({ valid_from: start, valid_to: end, base_nightly: price, currency })

  return bands.map((b) => ({
    valid_from: b.valid_from,
    valid_to: b.valid_to,
    rule_json: {
      base_nightly: String(b.base_nightly),
      base_price: String(b.base_nightly),
      source: 'travelrobot',
      currency: b.currency || currency,
    },
  }))
}

/** GetHotelDetails çoklu dil birleşimi → locale kodu → { title, description } */
export function extractTravelrobotTranslations(hotel) {
  const out = {}
  const i18n = hotel?.I18nDetails ?? hotel?.i18nDetails ?? {}
  for (const [locale, block] of Object.entries(i18n)) {
    if (!block || typeof block !== 'object') continue
    const title = pickText(block, 'HotelName', 'hotelName', 'Name', 'name')
    const desc = stripHtml(
      block?.SummaryText ?? block?.summaryText ?? block?.Description ?? block?.description ?? '',
    )
    if (title || desc) {
      out[locale] = {
        title: title || null,
        description: desc ? desc.slice(0, 4000) : null,
      }
    }
  }
  return out
}

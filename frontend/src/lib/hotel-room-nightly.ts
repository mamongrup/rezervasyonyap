import {
  parseListingPriceRuleAmount,
  parseListingPriceRuleJson,
} from '@/lib/listing-price-rules-public'
import { formatLocalYmd } from '@/lib/date-format-local'
import { isSyntheticHotelRoomId } from '@/lib/hotel-default-room'
import type { ListingPriceRuleRow } from '@/lib/travel-api'

export type HotelRoomSeasonalRate = {
  validFrom: string | null
  validTo: string | null
  nightlyPrice: number
  currency?: string | null
  boardType?: string | null
}

export type HotelRoomNightlyMeta = {
  seasonalPrices: HotelRoomSeasonalRate[]
  /** Travelrobot vb. tek gecelik */
  flatNightly: number | null
  roomTypeId: string | null
  roomName: string | null
}

function parsePositiveAmount(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw
  if (typeof raw === 'string' && raw.trim()) {
    return parseListingPriceRuleAmount(raw)
  }
  return null
}

function pickIsoDate(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v.trim())) {
      return v.trim().slice(0, 10)
    }
  }
  return null
}

function normalizeSeasonalRate(raw: unknown): HotelRoomSeasonalRate | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const obj = raw as Record<string, unknown>
  const nightly =
    parsePositiveAmount(obj.nightlyPrice) ??
    parsePositiveAmount(obj.nightly_price) ??
    parsePositiveAmount(obj.price) ??
    parsePositiveAmount(obj.amount) ??
    parsePositiveAmount(obj.base_nightly)
  if (nightly == null || nightly <= 0) return null
  return {
    validFrom: pickIsoDate(obj, ['validFrom', 'valid_from', 'startDate', 'start_date']),
    validTo: pickIsoDate(obj, ['validTo', 'valid_to', 'endDate', 'end_date']),
    nightlyPrice: nightly,
    currency: typeof obj.currency === 'string' ? obj.currency : null,
    boardType:
      typeof obj.boardType === 'string'
        ? obj.boardType
        : typeof obj.board_type === 'string'
          ? obj.board_type
          : null,
  }
}

function ymdInRange(ymd: string, from: string | null, to: string | null): boolean {
  if (from && ymd < from) return false
  if (to && ymd > to) return false
  return true
}

export function parseHotelRoomNightlyMeta(metaJson: string | null | undefined): HotelRoomNightlyMeta {
  let meta: Record<string, unknown> = {}
  try {
    const parsed = JSON.parse(metaJson || '{}') as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      meta = parsed as Record<string, unknown>
    }
  } catch {
    /* ignore */
  }

  const seasonalRaw = meta.seasonal_prices ?? meta.seasonalPrices ?? meta.rates
  const seasonalPrices = Array.isArray(seasonalRaw)
    ? seasonalRaw.map(normalizeSeasonalRate).filter((r): r is HotelRoomSeasonalRate => r != null)
    : []

  const flatNightly =
    parsePositiveAmount(meta.price) ??
    parsePositiveAmount(meta.nightly_price) ??
    parsePositiveAmount(meta.nightlyPrice) ??
    parsePositiveAmount(meta.base_nightly)

  const roomTypeIdRaw =
    meta.tatilbudur_room_type_id ?? meta.room_type_id ?? meta.roomTypeId ?? meta.kplus_room_id
  const roomTypeId =
    roomTypeIdRaw != null && String(roomTypeIdRaw).trim() ? String(roomTypeIdRaw).trim() : null

  const roomNameRaw = meta.room_name ?? meta.roomName
  const roomName =
    typeof roomNameRaw === 'string' && roomNameRaw.trim() ? roomNameRaw.trim() : null

  return { seasonalPrices, flatNightly, roomTypeId, roomName }
}

function normalizeRoomKey(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function ruleMatchesRoom(
  ruleJson: string,
  room: { name: string; roomTypeId?: string | null },
): 'exact' | 'unscoped' | null {
  let obj: Record<string, unknown> = {}
  try {
    const parsed = JSON.parse(ruleJson || '{}') as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      obj = parsed as Record<string, unknown>
    }
  } catch {
    return 'unscoped'
  }
  const ruleRoomName = String(obj.room_name ?? obj.roomName ?? '').trim()
  const ruleRoomTypeId = String(obj.room_type_id ?? obj.roomTypeId ?? '').trim()
  const hasScope = Boolean(ruleRoomName || ruleRoomTypeId)
  if (!hasScope) return 'unscoped'

  if (room.roomTypeId && ruleRoomTypeId && String(room.roomTypeId) === ruleRoomTypeId) {
    return 'exact'
  }
  if (ruleRoomName && normalizeRoomKey(ruleRoomName) === normalizeRoomKey(room.name)) {
    return 'exact'
  }
  return null
}

function nightlyFromRuleJson(ruleJson: string, ymd: string): number | null {
  const parsed = parseListingPriceRuleJson(ruleJson)
  const discount = parseListingPriceRuleAmount(parsed.discountNightly)
  if (
    discount != null &&
    discount > 0 &&
    parsed.discountFrom &&
    parsed.discountTo &&
    ymdInRange(ymd, parsed.discountFrom, parsed.discountTo)
  ) {
    return discount
  }
  for (const raw of [parsed.base, parsed.roomOnly, parsed.mealsIncluded, parsed.weekend]) {
    const n = parseListingPriceRuleAmount(raw)
    if (n != null && n > 0) return n
  }
  return null
}

function nightlyFromSeasonalForDay(
  rates: readonly HotelRoomSeasonalRate[],
  ymd: string,
): number | null {
  let openEnded: number | null = null
  for (const rate of rates) {
    if (!rate.validFrom && !rate.validTo) {
      openEnded = rate.nightlyPrice
      continue
    }
    if (ymdInRange(ymd, rate.validFrom, rate.validTo)) return rate.nightlyPrice
  }
  return openEnded
}

function nightlyFromRulesForDay(
  rules: readonly ListingPriceRuleRow[],
  room: { name: string; roomTypeId?: string | null },
  ymd: string,
  mode: 'exact' | 'unscoped',
): number | null {
  let best: number | null = null
  for (const rule of rules) {
    const match = ruleMatchesRoom(rule.rule_json, room)
    if (match !== mode) continue
    if (!ymdInRange(ymd, rule.valid_from, rule.valid_to)) continue
    const nightly = nightlyFromRuleJson(rule.rule_json, ymd)
    if (nightly == null) continue
    best = best == null ? nightly : Math.min(best, nightly)
  }
  return best
}

/**
 * Takvim `price_override` dışında oda geceliği:
 * seasonal_prices → oda eşleşmeli price_rules → meta flat → (isteğe bağlı) unscoped rules.
 */
export function resolveHotelRoomNightlyForDay(input: {
  ymd: string
  roomName: string
  metaJson?: string | null
  priceRules?: readonly ListingPriceRuleRow[] | null
  allowUnscopedRules?: boolean
}): number | null {
  const meta = parseHotelRoomNightlyMeta(input.metaJson)
  const fromSeasonal = nightlyFromSeasonalForDay(meta.seasonalPrices, input.ymd)
  if (fromSeasonal != null) return fromSeasonal

  const room = {
    name: input.roomName,
    roomTypeId: meta.roomTypeId,
  }
  const rules = input.priceRules ?? []
  const fromExact = nightlyFromRulesForDay(rules, room, input.ymd, 'exact')
  if (fromExact != null) return fromExact

  if (meta.flatNightly != null && meta.flatNightly > 0) return meta.flatNightly

  if (input.allowUnscopedRules) {
    const fromUnscoped = nightlyFromRulesForDay(rules, room, input.ymd, 'unscoped')
    if (fromUnscoped != null) return fromUnscoped
  }
  return null
}

export function hotelListingHasRoomScopedPrices(input: {
  rooms: readonly { id: string; name: string; meta_json?: string | null }[]
  priceRules?: readonly ListingPriceRuleRow[] | null
}): boolean {
  for (const room of input.rooms) {
    if (isSyntheticHotelRoomId(room.id)) continue
    const meta = parseHotelRoomNightlyMeta(room.meta_json)
    if (meta.seasonalPrices.length > 0 || (meta.flatNightly != null && meta.flatNightly > 0)) {
      return true
    }
  }
  for (const rule of input.priceRules ?? []) {
    try {
      const obj = JSON.parse(rule.rule_json || '{}') as Record<string, unknown>
      if (String(obj.room_name ?? obj.roomName ?? '').trim()) return true
      if (String(obj.room_type_id ?? obj.roomTypeId ?? '').trim()) return true
    } catch {
      /* ignore */
    }
  }
  return false
}

/**
 * İlan “başlangıç fiyatı” (sidebar): yemek planı / kural / priceAmount yoksa
 * odaların kendi geceliklerinden minimumu al. Sentetik oda sayılmaz.
 */
export function minHotelRoomOwnedNightly(input: {
  rooms: readonly { id: string; name: string; meta_json?: string | null }[]
  priceRules?: readonly ListingPriceRuleRow[] | null
  rangeStart?: Date | null
  rangeEnd?: Date | null
}): number {
  let min = 0
  for (const room of input.rooms) {
    if (isSyntheticHotelRoomId(room.id)) continue
    const n = resolveHotelRoomFallbackNightly({
      roomId: room.id,
      roomName: room.name,
      metaJson: room.meta_json,
      rangeStart: input.rangeStart,
      rangeEnd: input.rangeEnd,
      priceRules: input.priceRules,
      listingFallbackNightly: 0,
      // Yalnızca odaya ait oranlar; ilan min’ine düşme.
      listingHasRoomScopedPrices: true,
    })
    if (n > 0) min = min === 0 ? n : Math.min(min, n)
  }
  return min
}

/**
 * Oda kartı / rezervasyon paneli için gecelik taban.
 * Oda kapsamlı fiyat varken ilan minimumunu her odaya kopyalamaz.
 */
export function resolveHotelRoomFallbackNightly(input: {
  roomId: string
  roomName: string
  metaJson?: string | null
  rangeStart?: Date | null
  rangeEnd?: Date | null
  priceRules?: readonly ListingPriceRuleRow[] | null
  listingFallbackNightly: number
  listingHasRoomScopedPrices: boolean
}): number {
  if (isSyntheticHotelRoomId(input.roomId)) {
    return input.listingFallbackNightly > 0 ? input.listingFallbackNightly : 0
  }

  const allowUnscoped = !input.listingHasRoomScopedPrices
  const sampleDays: string[] = []
  if (input.rangeStart && input.rangeEnd) {
    const start = new Date(input.rangeStart)
    start.setHours(0, 0, 0, 0)
    const end = new Date(input.rangeEnd)
    end.setHours(0, 0, 0, 0)
    const cursor = new Date(start)
    while (cursor < end) {
      sampleDays.push(formatLocalYmd(cursor))
      cursor.setDate(cursor.getDate() + 1)
      if (sampleDays.length > 60) break
    }
  }
  if (sampleDays.length === 0) {
    sampleDays.push(formatLocalYmd(new Date()))
  }

  const resolved = sampleDays.map((ymd) =>
    resolveHotelRoomNightlyForDay({
      ymd,
      roomName: input.roomName,
      metaJson: input.metaJson,
      priceRules: input.priceRules,
      allowUnscopedRules: allowUnscoped,
    }),
  )
  const positives = resolved.filter((n): n is number => n != null && n > 0)
  if (positives.length > 0) {
    // Aralıkta oda fiyatı varsa ortalamayı değil ilk pozitif / min kullan — tutarlı kart fiyatı için
    // computeHotelRoomStayQuote gün gün çözecek; burada yalnızca fallback tabanı.
    return Math.min(...positives)
  }

  // Oda kapsamlı katalog varken bu odanın fiyatı yok → ilan min'ini kopyalama
  if (input.listingHasRoomScopedPrices) return 0

  return input.listingFallbackNightly > 0 ? input.listingFallbackNightly : 0
}

/** meta_json.features → kart/amenities + yatak etiketi */
export function extractHotelRoomFeaturesFromMeta(metaJson: string | null | undefined): {
  features: string[]
  bedType: string | null
} {
  let meta: Record<string, unknown> = {}
  try {
    const parsed = JSON.parse(metaJson || '{}') as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      meta = parsed as Record<string, unknown>
    }
  } catch {
    return { features: [], bedType: null }
  }
  const raw = meta.features ?? meta.amenities
  const features = Array.isArray(raw)
    ? raw
      .map((x) => (typeof x === 'string' ? x.trim() : ''))
      .filter(Boolean)
    : []
  const bedHint =
    features.find((f) => /yatak|bed|çift|tek kişilik|king|queen/i.test(f)) ?? null
  return { features, bedType: bedHint }
}

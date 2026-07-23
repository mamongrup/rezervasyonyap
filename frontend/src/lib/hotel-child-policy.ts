import type { GuestsObject } from '@/type'

/** Otel çocuk politikası — `listing_attributes` group=hotel key=child_policy */
export type HotelChildPolicy = {
  /** 0..freeMaxAge (dahil) ücretsiz; null = çocuk kabul edilmez (yetişkin oteli) */
  freeMaxAge: number | null
  /** Ücretli çocuk için yetişkin payına göre yüzde (oda geceliği / 2) */
  chargePercent: number
  infantsFree: boolean
  childrenAllowed: boolean
  /** Ücretli çocuk üst yaşı (dahil); üstü yetişkin sayılır */
  chargeMaxAge: number
}

export const DEFAULT_HOTEL_CHILD_POLICY: HotelChildPolicy = {
  freeMaxAge: 6,
  chargePercent: 50,
  infantsFree: true,
  childrenAllowed: true,
  chargeMaxAge: 12,
}

export const ADULTS_ONLY_CHILD_POLICY: HotelChildPolicy = {
  freeMaxAge: null,
  chargePercent: 0,
  infantsFree: false,
  childrenAllowed: false,
  chargeMaxAge: 12,
}

export function parseHotelChildPolicy(raw: unknown, adultsOnly = false): HotelChildPolicy {
  if (adultsOnly) return { ...ADULTS_ONLY_CHILD_POLICY }
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_HOTEL_CHILD_POLICY }
  const o = raw as Record<string, unknown>
  const childrenAllowed =
    o.children_allowed === false || o.childrenAllowed === false
      ? false
      : o.children_allowed === true || o.childrenAllowed === true
        ? true
        : true
  if (!childrenAllowed) return { ...ADULTS_ONLY_CHILD_POLICY }

  const freeRaw = o.free_max_age ?? o.freeMaxAge
  const freeMaxAge =
    freeRaw == null || freeRaw === ''
      ? DEFAULT_HOTEL_CHILD_POLICY.freeMaxAge
      : Math.max(0, Math.min(17, Number(freeRaw)))
  const chargePercent = Math.max(
    0,
    Math.min(100, Number(o.charge_percent ?? o.chargePercent ?? 50) || 50),
  )
  const chargeMaxAge = Math.max(
    0,
    Math.min(17, Number(o.charge_max_age ?? o.chargeMaxAge ?? 12) || 12),
  )
  const infantsFree = o.infants_free === false || o.infantsFree === false ? false : true
  return {
    freeMaxAge: Number.isFinite(freeMaxAge) ? freeMaxAge : 6,
    chargePercent,
    infantsFree,
    childrenAllowed: true,
    chargeMaxAge,
  }
}

export function syncChildAges(guests: GuestsObject): number[] {
  const n = Math.max(0, guests.guestChildren ?? 0)
  const prev = Array.isArray(guests.childAges) ? guests.childAges : []
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const v = prev[i]
    const age = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : 6
    out.push(Math.max(2, Math.min(12, age)))
  }
  return out
}

export function normalizeGuestsWithChildAges(guests: GuestsObject): GuestsObject {
  const childAges = syncChildAges(guests)
  return {
    guestAdults: guests.guestAdults ?? 2,
    guestChildren: childAges.length,
    guestInfants: guests.guestInfants ?? 0,
    childAges,
  }
}

export type ChildOccupancyBreakdown = {
  freeChildren: number
  chargedChildren: number
  adultAsChildAges: number
  infantCount: number
  childSurchargeTotal: number
  perChargedChildNightly: number
}

/**
 * Oda geceliği 2 yetişkin varsayımıyla; ücretli çocuk = (nightly/2) * (chargePercent/100) * nights.
 * freeMaxAge altı ücretsiz; chargeMaxAge üstü yetişkin payı gibi tam eklenmez (oda kapasitesine bırakılır).
 */
export function computeChildOccupancySurcharge(input: {
  nightlyRoomRate: number
  nights: number
  childAges: number[]
  infantCount?: number
  policy: HotelChildPolicy
  units?: number
}): ChildOccupancyBreakdown {
  const nights = Math.max(0, input.nights)
  const units = Math.max(1, input.units ?? 1)
  const infantCount = Math.max(0, input.infantCount ?? 0)
  if (!input.policy.childrenAllowed) {
    return {
      freeChildren: 0,
      chargedChildren: 0,
      adultAsChildAges: 0,
      infantCount: 0,
      childSurchargeTotal: 0,
      perChargedChildNightly: 0,
    }
  }
  const freeMax = input.policy.freeMaxAge ?? -1
  const chargeMax = input.policy.chargeMaxAge
  let freeChildren = 0
  let chargedChildren = 0
  let adultAsChildAges = 0
  for (const age of input.childAges) {
    if (age <= freeMax) freeChildren += 1
    else if (age <= chargeMax) chargedChildren += 1
    else adultAsChildAges += 1
  }
  if (input.policy.infantsFree) {
    /* infants stay free */
  }
  const adultShare = Math.max(0, input.nightlyRoomRate) / 2
  const perChargedChildNightly = adultShare * (Math.max(0, input.policy.chargePercent) / 100)
  const childSurchargeTotal = perChargedChildNightly * chargedChildren * nights * units
  return {
    freeChildren,
    chargedChildren,
    adultAsChildAges,
    infantCount,
    childSurchargeTotal: Math.round(childSurchargeTotal * 100) / 100,
    perChargedChildNightly: Math.round(perChargedChildNightly * 100) / 100,
  }
}

export function formatChildPolicySummaryTr(policy: HotelChildPolicy): string {
  if (!policy.childrenAllowed) return 'Bu tesis yalnızca yetişkinlere özeldir; çocuk kabul edilmez.'
  const free = policy.freeMaxAge ?? 0
  const pct = policy.chargePercent
  return `${free} yaş ve altı çocuklar ücretsizdir. ${free + 1}–${policy.chargeMaxAge} yaş çocuklar için gecelik ücret, yetişkin payının %${pct}'idir.`
}

function parseAttrJson(raw: string): unknown {
  const t = String(raw ?? '').trim()
  if (!t) return null
  try {
    return JSON.parse(t)
  } catch {
    return t
  }
}

function attrString(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim()
  if (raw == null) return ''
  return String(raw).trim()
}

/** Public listing_attributes → çocuk politikası (hotel.theme_code + hotel.child_policy). */
export function resolveHotelChildPolicyFromAttributes(
  attrs: ReadonlyArray<{ group_code: string; key: string; value_json: string }>,
): HotelChildPolicy {
  const themeRow = attrs.find((a) => a.group_code === 'hotel' && a.key === 'theme_code')
  const theme = themeRow ? attrString(parseAttrJson(themeRow.value_json)).toLowerCase() : ''
  const adultsOnly = theme === 'adults_only'
  const policyRow = attrs.find((a) => a.group_code === 'hotel' && a.key === 'child_policy')
  const raw = policyRow ? parseAttrJson(policyRow.value_json) : null
  return parseHotelChildPolicy(raw, adultsOnly)
}

/** Public listing_attributes → tema etiketleri (hotel.theme_tags veya theme_code). */
export function resolveHotelThemeTagsFromAttributes(
  attrs: ReadonlyArray<{ group_code: string; key: string; value_json: string }>,
): string[] {
  const tagsRow = attrs.find((a) => a.group_code === 'hotel' && a.key === 'theme_tags')
  if (tagsRow) {
    const parsed = parseAttrJson(tagsRow.value_json)
    if (Array.isArray(parsed)) {
      return [...new Set(parsed.map((t) => attrString(t)).filter(Boolean))]
    }
  }
  const themeRow = attrs.find((a) => a.group_code === 'hotel' && a.key === 'theme_code')
  const theme = themeRow ? attrString(parseAttrJson(themeRow.value_json)) : ''
  return theme ? [theme] : []
}

import type { VillaAmenityId } from '@/lib/listing-amenities'

/** Tatil evi vitrin filtresi — `listing_attributes.key` ile birebir. */
export const STAY_RENTAL_FILTER_ATTR_KEYS = [
  'pool_garden',
  'wifi',
  'full_kitchen',
  'secure_parking',
  'climate',
  'laundry',
] as const satisfies readonly VillaAmenityId[]

/** Yat kiralama vitrin filtresi — `listing_attributes.key` (grup: `yat_olanak`). */
export const YACHT_RENTAL_FILTER_ATTR_KEYS = [
  'wifi',
  'air_conditioning',
  'generator',
  'water_toys',
  'snorkeling',
  'tender_dinghy',
] as const

export type StayRentalFilterAttrKey = (typeof STAY_RENTAL_FILTER_ATTR_KEYS)[number]
export type YachtRentalFilterAttrKey = (typeof YACHT_RENTAL_FILTER_ATTR_KEYS)[number]

/** Eski vitrin filtre anahtarları → güncel EAV kodu */
const LEGACY_ATTR_ALIASES: Record<string, string> = {
  pool: 'pool_garden',
  kitchen: 'full_kitchen',
  parking: 'secure_parking',
  ac: 'air_conditioning',
  climate: 'climate',
  heating: 'climate',
  klima: 'air_conditioning',
  jenerator: 'generator',
  su_sporu: 'water_toys',
  snorkel: 'snorkeling',
  zodyak: 'tender_dinghy',
}

export function getStayRentalFilterAttrKeys(categorySlug: string): readonly string[] {
  if (categorySlug === 'yat-kiralama') return YACHT_RENTAL_FILTER_ATTR_KEYS
  return STAY_RENTAL_FILTER_ATTR_KEYS
}

export function normalizeStayRentalAttrKey(raw: string): string {
  const t = raw.trim().toLowerCase()
  if (!t) return ''
  return LEGACY_ATTR_ALIASES[t] ?? t
}

/** URL `attrs` parametresini API'ye gönderilecek kanonik anahtarlara çevirir. */
export function normalizeStayRentalAttrsParam(raw: string | null | undefined): string {
  const keys = new Set<string>()
  for (const part of String(raw ?? '').split(',')) {
    const mapped = normalizeStayRentalAttrKey(part)
    if (mapped) keys.add(mapped)
  }
  return [...keys].join(',')
}

export function parseStayRentalAttrsParam(raw: string | null | undefined): Set<string> {
  const s = new Set<string>()
  for (const part of String(raw ?? '').split(',')) {
    const mapped = normalizeStayRentalAttrKey(part)
    if (mapped) s.add(mapped)
  }
  return s
}

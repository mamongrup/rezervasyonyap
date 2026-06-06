import type { VillaAmenityId } from '@/lib/listing-amenities'

/** Kategori filtresinde gösterilen öznitelikler — `listing_attributes.key` ile birebir. */
export const STAY_RENTAL_FILTER_ATTR_KEYS = [
  'pool_garden',
  'wifi',
  'full_kitchen',
  'secure_parking',
  'climate',
  'laundry',
] as const satisfies readonly VillaAmenityId[]

export type StayRentalFilterAttrKey = (typeof STAY_RENTAL_FILTER_ATTR_KEYS)[number]

/** Eski vitrin filtre anahtarları → güncel EAV kodu */
const LEGACY_ATTR_ALIASES: Record<string, StayRentalFilterAttrKey> = {
  pool: 'pool_garden',
  kitchen: 'full_kitchen',
  parking: 'secure_parking',
  ac: 'climate',
  heating: 'climate',
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

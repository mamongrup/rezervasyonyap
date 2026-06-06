/** Konaklama kiralama dikeyleri — tatil evi (kara) ve yat kiralama (deniz) aynı rezervasyon çekirdeği. */

export const STAY_RENTAL_CATEGORY_CODES = ['holiday_home', 'yacht_charter'] as const

export type StayRentalCategoryCode = (typeof STAY_RENTAL_CATEGORY_CODES)[number]

const STAY_RENTAL_SET = new Set<string>(STAY_RENTAL_CATEGORY_CODES)

export function isStayRentalCategory(code: string | null | undefined): code is StayRentalCategoryCode {
  return !!code && STAY_RENTAL_SET.has(code)
}

/** Tatil evi alt kategori URL → API `property_type` */
export const HOLIDAY_TYPE_HANDLE_MAP: Record<string, string> = {
  villalar: 'villa',
  apartlar: 'apart',
  daireler: 'daire',
  bungalovlar: 'bungalov',
}

/** Yat kiralama alt kategori URL → API `property_type` */
export const YACHT_TYPE_HANDLE_MAP: Record<string, string> = {
  guletler: 'gulet',
  'motor-yatlar': 'motor_yat',
  katamaranlar: 'katamaran',
  'yelkenli-tekneler': 'yelkenli',
  'bareboat-kiralama': 'bareboat',
}

export function stayRentalPropertyTypeFromHandle(
  categoryCode: StayRentalCategoryCode,
  handle: string | undefined,
): string | undefined {
  if (!handle || handle === 'all') return undefined
  if (categoryCode === 'holiday_home') return HOLIDAY_TYPE_HANDLE_MAP[handle]
  return YACHT_TYPE_HANDLE_MAP[handle]
}

export function stayRentalCategorySlug(code: StayRentalCategoryCode): string {
  return code === 'holiday_home' ? 'tatil-evleri' : 'yat-kiralama'
}

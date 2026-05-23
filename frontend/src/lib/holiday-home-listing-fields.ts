/**
 * Tatil evi — hangi alanların «öznitelik» grubunda kalacağı.
 * Tip, tema, kurallar ve dahil/hariç ayrı ekranlarda yönetilir.
 */

/** Artık öznitelik listesinde gösterilmez (ayrı yönetim). */
export const HOLIDAY_HOME_NON_AMENITY_ATTRIBUTE_GROUP_CODES = new Set([
  'ilan_tipi',
  'tema',
  'imported_included',
  'imported_excluded',
  'kurallar',
  'konaklama_kurallari',
  'listing_meta',
])

/** Öznitelik / olanak grupları — katalog ve ilan formu. */
export const HOLIDAY_HOME_AMENITY_ATTRIBUTE_GROUP_CODES = new Set([
  'ic_mekan',
  'dis_mekan',
  /** Bravo aktarımı; yeni kayıtlar için ic/dis tercih edilir */
  'imported_amenity',
])

export function isHolidayHomeAmenityAttributeGroup(code: string): boolean {
  const c = code.trim().toLowerCase()
  if (!c || HOLIDAY_HOME_NON_AMENITY_ATTRIBUTE_GROUP_CODES.has(c)) return false
  if (HOLIDAY_HOME_AMENITY_ATTRIBUTE_GROUP_CODES.has(c)) return true
  if (c.startsWith('ic_') || c.startsWith('dis_')) return true
  return false
}

export function filterHolidayHomeAttributeGroups<T extends { code: string }>(
  groups: T[],
  categoryCode: string,
): T[] {
  if (categoryCode !== 'holiday_home') return groups
  return groups.filter((g) => isHolidayHomeAmenityAttributeGroup(g.code))
}

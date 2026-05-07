/** Site ayarı anahtarı: `site_settings` + manage `/manage/catalog/holiday_home/property-types`. */
export const HOLIDAY_HOME_PROPERTY_TYPES_SITE_KEY = 'catalog.holiday_home_property_types'

/**
 * Ayar `value_json` — beklenen format `["Villa","Apart",…]`.
 * Geçersiz veya boşsa `null`.
 */
export function parseHolidayHomePropertyTypesFromSetting(
  value_json: string | null | undefined,
): string[] | null {
  if (!value_json?.trim()) return null
  try {
    const parsed = JSON.parse(value_json) as unknown
    if (!Array.isArray(parsed)) return null
    const vals = parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    return vals.length > 0 ? vals : null
  } catch {
    return null
  }
}

/**
 * Site ayarı yokken / ilk yüklemede kullanılan sabit liste; «Varsayılan listeye dön» ile aynı.
 * Canlı seçenekler her zaman `site_settings.catalog.holiday_home_property_types` olmalı.
 */
export const HOLIDAY_PROPERTY_TYPE_OPTIONS = [
  'Villa',
  'Dubleks',
  'Triplex',
  'Bungalov',
  'Apart daire',
  'Müstakil ev',
  'Çiftlik evi',
  'Köşk',
  'Taş ev',
  'Kütük ev / kabin',
] as const

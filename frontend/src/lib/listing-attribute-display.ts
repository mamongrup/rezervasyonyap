import type { PublicListingAttribute } from '@/lib/travel-api'
import { isHolidayHomeAmenityAttributeGroup } from '@/lib/holiday-home-listing-fields'

/** Vitrin «Olanaklar» bölümünde gösterilmemesi gereken gruplar. */
const VITRIN_NON_AMENITY_GROUPS = new Set([
  'listing_meta',
  'tema',
  'ilan_tipi',
  'imported_included',
  'imported_excluded',
  'vertical_holiday_home',
  'vertical_tour',
  'vertical_yacht',
  'vertical_activity',
  'wtatil',
  'turna',
  'hotel',
  'pexels',
  'catalog',
  'kurallar',
  'konaklama_kurallari',
  'bravo',
  'kplus',
  'travelrobot',
  'gtc',
])

/** Slug → görünen ad (Bravo / import; JSON label yoksa). */
const SLUG_DISPLAY_LABELS: Record<string, string> = {
  'bebek-besigi': 'Bebek Beşiği',
  bilardo: 'Bilardo',
  'bulasik-makinesi': 'Bulaşık Makinesi',
  buzdolabi: 'Buzdolabı',
  'camasir-makinesi': 'Çamaşır Makinesi',
  'havlu-nevresim': 'Havlu - Nevresim',
  jakuzi: 'Jakuzi',
  jakuzili: 'Jakuzili',
  klima: 'Klima',
  'mama-sandalyesi': 'Mama Sandalyesi',
  mangal: 'Mangal',
  'masa-tenisi': 'Masa Tenisi',
  'mutfak-gerecleri': 'Mutfak Gereçleri',
  'sac-kurutma': 'Saç Kurutma',
  'sauna-hamam': 'Sauna / Hamam',
  'spor-salonu': 'Spor Salonu',
  supurge: 'Süpürge',
  'tv-uydu': 'TV / Uydu',
  'utu-utu-masasi': 'Ütü - Ütü Masası',
  'wi-fi': 'Wi-Fi',
  wifi: 'Wi-Fi',
  'havuz-bahce-bakimi': 'Havuz & Bahçe Bakımı',
  'elektrik-kullanimi': 'Elektrik Kullanımı',
  'su-kullanimi': 'Su Kullanımı',
  'tup-kullanimi': 'Tüp Kullanımı',
  'ilk-temizlik': 'İlk Temizlik',
  'ek-temizlik': 'Ek Temizlik',
  'ek-yatak': 'Ek Yatak',
  'ulasim-hizmeti': 'Ulaşım Hizmeti',
  'eve-calisan-ekibi': 'Eve Çalışan Ekibi',
  balayi_evi: 'Balayı Evi',
  muhafazakar: 'Muhafazakar',
  nature: 'Doğa İçinde',
  villa: 'Villa',
  apart: 'Apart',
  daire: 'Daire',
  bungalov: 'Bungalov',
}

export function parseAttributeLabelFromValueJson(raw: string): string | null {
  const t = String(raw ?? '').trim()
  if (!t) return null
  try {
    const p = JSON.parse(t) as unknown
    if (p && typeof p === 'object' && !Array.isArray(p)) {
      const label = (p as Record<string, unknown>).label
      if (typeof label === 'string' && label.trim()) return label.trim()
      const name = (p as Record<string, unknown>).name
      if (typeof name === 'string' && name.trim()) return name.trim()
    }
    if (typeof p === 'string' && p.trim()) return p.trim()
  } catch {
    /* düz metin */
  }
  return null
}

/** `camasir-makinesi` → «Çamaşır Makinesi» (yedek). */
export function formatAttributeKeyAsDisplayLabel(key: string): string {
  const raw = String(key ?? '').trim()
  if (!raw) return ''
  const norm = raw.toLowerCase().replace(/_/g, '-')
  const mapped = SLUG_DISPLAY_LABELS[norm] ?? SLUG_DISPLAY_LABELS[raw.toLowerCase()]
  if (mapped) return mapped
  return norm
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1).toLocaleLowerCase('tr-TR'))
    .join(' ')
}

export function resolveAttributeDisplayLabel(key: string, valueJson: string): string {
  return parseAttributeLabelFromValueJson(valueJson) ?? formatAttributeKeyAsDisplayLabel(key)
}

export function isVitrinAmenityAttributeGroup(
  groupCode: string,
  vertical: string | null | undefined,
): boolean {
  const c = groupCode.trim().toLowerCase()
  if (!c || VITRIN_NON_AMENITY_GROUPS.has(c)) return false
  if (vertical === 'holiday_home') return isHolidayHomeAmenityAttributeGroup(c)
  if (vertical === 'yacht_charter') {
    return c === 'yat_olanak' || c.startsWith('ic_') || c.startsWith('dis_')
  }
  if (c.startsWith('vertical_')) return false
  return c.startsWith('ic_') || c.startsWith('dis_') || c === 'imported_amenity' || c.startsWith('otel_')
}

export function buildVitrinAmenityRows(
  values: PublicListingAttribute[] | null | undefined,
  vertical: string | null | undefined,
  isTrue: (raw: string) => boolean,
): PublicListingAttribute[] {
  return (values ?? []).filter(
    (row) => isTrue(row.value_json) && isVitrinAmenityAttributeGroup(row.group_code, vertical),
  )
}

export function buildAttributeLabelMap(rows: readonly PublicListingAttribute[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const row of rows) {
    out[row.key] = resolveAttributeDisplayLabel(row.key, row.value_json)
  }
  return out
}

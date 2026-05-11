/** Site ayarı anahtarı: `site_settings` + manage `/manage/catalog/holiday_home/property-types`. */
export const HOLIDAY_HOME_PROPERTY_TYPES_SITE_KEY = 'catalog.holiday_home_property_types'

/** Öznitelikler sayfası ile aynı 6 dil. */
export const HOLIDAY_PROPERTY_TYPE_LOCALES = [
  { code: 'tr', label: 'TR' },
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
  { code: 'ru', label: 'RU' },
  { code: 'zh', label: 'ZH' },
  { code: 'fr', label: 'FR' },
] as const

export type HolidayHomePropertyTypeItem = {
  /** URL/DB için sabit anahtar; ilan `property_type` alanında bu saklanır. */
  slug: string
  /** Locale kodu → vitrin / form etiketi */
  labels: Partial<Record<string, string>>
}

const V2 = 2

function slugifyAscii(raw: string): string {
  const ascii = raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'c')
  return ascii
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

/** Yeni / migrate — benzersiz slug */
export function makeUniquePropertySlug(
  baseRaw: string,
  existingSlugs: ReadonlySet<string>,
  reserved?: string,
): string {
  let b = slugifyAscii(baseRaw)
  if (!b) b = 'tip'
  if (reserved && b === reserved) {
    /* allow */
  }
  let s = b
  let n = 0
  while (existingSlugs.has(s) && s !== reserved) {
    n += 1
    s = `${b}_${n}`
  }
  return s
}

/**
 * Ayar `value_json` — eski format: `["Villa",…]`
 * Yeni: `{ "v": 2, "items": [ { "slug", "labels": { "tr": "…" } } ] }`
 */
export function parseHolidayHomePropertyTypesFromSetting(
  value_json: string | null | undefined,
): string[] | null {
  if (!value_json?.trim()) return null
  try {
    const parsed = JSON.parse(value_json) as unknown
    if (Array.isArray(parsed)) {
      const vals = parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      return vals.length > 0 ? vals : null
    }
    return null
  } catch {
    return null
  }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x)
}

function normalizeItemRow(x: unknown): HolidayHomePropertyTypeItem | null {
  if (!isRecord(x)) return null
  const slug = typeof x.slug === 'string' ? slugifyAscii(x.slug) : ''
  if (!slug) return null
  const labels: Partial<Record<string, string>> = {}
  if (isRecord(x.labels)) {
    for (const [k, v] of Object.entries(x.labels)) {
      if (typeof v === 'string' && v.trim()) labels[k.toLowerCase()] = v.trim()
    }
  }
  return { slug, labels }
}

function migrateLegacyStringArray(strs: string[]): HolidayHomePropertyTypeItem[] {
  const used = new Set<string>()
  const out: HolidayHomePropertyTypeItem[] = []
  for (const s of strs) {
    const t = s.trim()
    if (!t) continue
    const base = slugifyAscii(t) || 'tip'
    let slug = base
    let n = 0
    while (used.has(slug)) {
      n += 1
      slug = `${base}_${n}`
    }
    used.add(slug)
    out.push({ slug, labels: { tr: t } })
  }
  return out
}

/** API / `value_json` ayrıştırma — her zaman `HolidayHomePropertyTypeItem[]` */
export function parseHolidayHomePropertyTypesPayload(raw: unknown): HolidayHomePropertyTypeItem[] {
  if (raw == null) return []
  if (Array.isArray(raw)) {
    if (raw.length > 0 && raw.every((x) => typeof x === 'string')) {
      return migrateLegacyStringArray(raw as string[])
    }
    if (raw.length > 0 && raw.some((x) => isRecord(x) && 'slug' in (x as object))) {
      const rows = raw.map((x) => normalizeItemRow(x)).filter((x): x is HolidayHomePropertyTypeItem => x != null)
      return dedupeBySlug(rows)
    }
  }
  if (isRecord(raw) && raw.v === V2 && Array.isArray(raw.items)) {
    const rows = raw.items.map((x) => normalizeItemRow(x)).filter((x): x is HolidayHomePropertyTypeItem => x != null)
    return dedupeBySlug(rows)
  }
  return []
}

function dedupeBySlug(rows: HolidayHomePropertyTypeItem[]): HolidayHomePropertyTypeItem[] {
  const by = new Map<string, HolidayHomePropertyTypeItem>()
  for (const r of rows) {
    by.set(r.slug, r)
  }
  return [...by.values()]
}

export function serializeHolidayHomePropertyTypesV2(items: HolidayHomePropertyTypeItem[]): string {
  return JSON.stringify({ v: V2, items })
}

/** Vitrin / select için görünen etiket */
export function holidayPropertyLabelForLocale(item: HolidayHomePropertyTypeItem, locale: string): string {
  const lc = locale.trim().toLowerCase()
  const order = [lc, 'tr', 'en', ...HOLIDAY_PROPERTY_TYPE_LOCALES.map((l) => l.code)]
  const seen = new Set<string>()
  for (const k of order) {
    if (seen.has(k)) continue
    seen.add(k)
    const lab = item.labels[k]?.trim()
    if (lab) return lab
  }
  for (const v of Object.values(item.labels)) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return item.slug
}

/** Kayıtlı `property_type` değerini (slug veya eski düz metin) sabit sluga çöz */
export function resolvePropertyTypeToSlug(
  stored: string,
  items: HolidayHomePropertyTypeItem[],
): string {
  const t = stored.trim()
  if (!t) return ''
  if (items.some((i) => i.slug === t)) return t
  for (const i of items) {
    if (Object.values(i.labels).some((lab) => typeof lab === 'string' && lab.trim() === t)) {
      return i.slug
    }
  }
  return t
}

/** Vitrin satırı — kayıtlı meta (slug veya eski düz metin) → yerelleştirilmiş tip adı */
export function displayHolidayPropertyTypeLine(
  stored: string | null | undefined,
  items: HolidayHomePropertyTypeItem[] | undefined,
  locale: string,
): string {
  const t = stored?.trim() ?? ''
  if (!t) return ''
  if (!items?.length) return t
  const slug = resolvePropertyTypeToSlug(t, items)
  const row = items.find((i) => i.slug === slug)
  if (row) return holidayPropertyLabelForLocale(row, locale)
  return t
}

/**
 * Site ayarı yokken / ilk yüklemede kullanılan sabit liste; «Varsayılan listeye dön» ile aynı.
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

export function defaultHolidayHomePropertyTypeItems(): HolidayHomePropertyTypeItem[] {
  return migrateLegacyStringArray([...HOLIDAY_PROPERTY_TYPE_OPTIONS])
}

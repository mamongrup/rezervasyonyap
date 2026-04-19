/**
 * Çoklu-dil alan (i18n field) yardımcıları.
 *
 * Sitedeki tüm metin alanları (başlık, açıklama, etiket, vb.) için **6 dilli JSON map** modeli kullanılır:
 *
 *   { tr: 'Merhaba', en: 'Hello', de: 'Hallo', ru: 'Привет', zh: '你好', fr: 'Bonjour' }
 *
 * Geriye dönük uyumluluk: eski 2-alanlı yapı (`xxxTr` + `xxxEn`) için `pickI18nWithLegacy` kullanın.
 *
 * Fallback zinciri (boş veya `null` değerleri atlar):
 *   istenen → `en` → `tr` → ilk dolu değer → `''`
 *
 * Bu kural sayesinde, bir alana sadece TR yazılmışsa DE/RU/ZH/FR kullanıcısı yine bu metni görür
 * (yarı boş bir UI yerine en azından erişilebilir bir karşılık kalır).
 */

import { SITE_LOCALE_CATALOG, type SiteLocaleCode } from '@/lib/i18n-catalog-locales'

/** Sitedeki resmi 6 dil kodu, sıralı (UI sekmelerinde de bu sırayla kullanılır). */
export const SUPPORTED_LOCALE_CODES = SITE_LOCALE_CATALOG.map((l) => l.code) as readonly SiteLocaleCode[]

/** Çoklu dil değer haritası — `Partial` çünkü her dilin dolu olması zorunlu değil. */
export type I18nFieldMap = Partial<Record<SiteLocaleCode, string>>

/** Backend / DB'den gelen `Record<string, unknown>` tipini güvenli normalize eder. */
export function normalizeI18nField(raw: unknown): I18nFieldMap {
  if (!raw || typeof raw !== 'object') return {}
  const out: I18nFieldMap = {}
  for (const code of SUPPORTED_LOCALE_CODES) {
    const v = (raw as Record<string, unknown>)[code]
    if (typeof v === 'string') out[code] = v
  }
  return out
}

/**
 * Çoklu dilli haritadan istenen dil için en uygun değeri seçer.
 *
 * Sıra: `requested` → `en` → `tr` → ilk dolu değer → `fallback` (varsayılan `''`)
 *
 * @example
 *   pickI18n({ tr: 'Merhaba', de: 'Hallo' }, 'fr')  // 'Merhaba' (en yok, tr'ye düşer)
 */
export function pickI18n(
  map: I18nFieldMap | null | undefined,
  requested: string,
  fallback = '',
): string {
  if (!map) return fallback
  const req = (requested ?? '').trim().toLowerCase() as SiteLocaleCode
  const direct = map[req]
  if (typeof direct === 'string' && direct.trim() !== '') return direct
  if (req !== 'en') {
    const en = map.en
    if (typeof en === 'string' && en.trim() !== '') return en
  }
  if (req !== 'tr') {
    const tr = map.tr
    if (typeof tr === 'string' && tr.trim() !== '') return tr
  }
  for (const code of SUPPORTED_LOCALE_CODES) {
    const v = map[code]
    if (typeof v === 'string' && v.trim() !== '') return v
  }
  return fallback
}

/**
 * Geriye dönük uyumluluk: eski `xxxTr` / `xxxEn` ikili alan yapısından i18n haritası türetir.
 *
 * @param legacy `{ tr?: string; en?: string }` — eski model
 * @param i18n   yeni 6-dilli harita (varsa öncelik bunda)
 */
export function pickI18nWithLegacy(
  legacy: { tr?: string | null; en?: string | null },
  i18n: I18nFieldMap | null | undefined,
  requested: string,
  fallback = '',
): string {
  if (i18n) {
    const v = pickI18n(i18n, requested, '')
    if (v !== '') return v
  }
  const req = (requested ?? '').trim().toLowerCase()
  const tr = (legacy.tr ?? '').trim()
  const en = (legacy.en ?? '').trim()
  if (req === 'en' && en) return en
  if (req === 'tr' && tr) return tr
  if (en) return en
  if (tr) return tr
  return fallback
}

/**
 * 6 dilli haritayı tüm dil kodlarıyla doldurulmuş hâle getirir.
 * (Form editör state'i için faydalı — controlled input'lar her zaman string ister.)
 */
export function ensureAllLocaleKeys(map: I18nFieldMap | null | undefined): Record<SiteLocaleCode, string> {
  const out = {} as Record<SiteLocaleCode, string>
  for (const code of SUPPORTED_LOCALE_CODES) {
    out[code] = (map?.[code] ?? '').toString()
  }
  return out
}

/**
 * Boş değerleri eler — DB'ye yazmadan önce sadece dolu dilleri tutmak için.
 */
export function compactI18nField(map: I18nFieldMap | Record<string, unknown> | null | undefined): I18nFieldMap {
  if (!map) return {}
  const out: I18nFieldMap = {}
  for (const code of SUPPORTED_LOCALE_CODES) {
    const v = (map as Record<string, unknown>)[code]
    if (typeof v === 'string' && v.trim() !== '') out[code] = v
  }
  return out
}

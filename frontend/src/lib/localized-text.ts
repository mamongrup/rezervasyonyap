/**
 * Çoklu dilli metin yardımcıları — site genelinde paylaşımlı.
 * Eski (tek dilli string) format ile yeni (locale → string sözlüğü) format
 * arasında geçişi sağlar; render tarafında dil seçimi yapar.
 *
 * Slider, popup vb. tüm i18n'li içerik bu temel üzerine kurulur.
 */

import { defaultLocale } from '@/lib/i18n-config'

/** `{ tr: "...", en: "...", ... }` */
export type LocalizedText = Record<string, string>

const PRIMARY = (defaultLocale ?? 'tr').toLowerCase()

const LOCALE_RE = /^[a-z]{2}(-[a-z0-9]{1,8})?$/i

/**
 * Her şeyi `Record<string,string>`'e normalize et — eski string değerler de
 * güvenle migrate olsun. Geçersiz locale anahtarları yutulur, çok uzun değerler
 * kırpılır.
 */
export function normalizeLocalizedText(input: unknown, maxLen = 4000): LocalizedText {
  if (input == null) return {}
  if (typeof input === 'string') {
    const trimmed = input.trim()
    return trimmed ? { [PRIMARY]: trimmed.slice(0, maxLen) } : {}
  }
  if (typeof input === 'object') {
    const out: LocalizedText = {}
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (typeof v === 'string' && v.trim()) {
        const code = k.trim().toLowerCase()
        if (LOCALE_RE.test(code)) {
          out[code] = v.slice(0, maxLen)
        }
      }
    }
    return out
  }
  return {}
}

/**
 * Ön yüz için: önce istenen dil, sonra varsayılan dil, sonra ilk dolu olan.
 */
export function pickLocalized(
  field: LocalizedText | string | undefined | null,
  locale: string,
  fallback = '',
): string {
  if (!field) return fallback
  if (typeof field === 'string') return field || fallback
  const code = locale.trim().toLowerCase()
  const direct = field[code]
  if (direct && direct.trim()) return direct
  const primary = field[PRIMARY]
  if (primary && primary.trim()) return primary
  for (const v of Object.values(field)) {
    if (typeof v === 'string' && v.trim()) return v
  }
  return fallback
}

/** Bir LocalizedText'in herhangi bir dilde metin içerip içermediğini söyler. */
export function hasAnyLocalized(field: LocalizedText | undefined | null): boolean {
  if (!field) return false
  for (const v of Object.values(field)) {
    if (typeof v === 'string' && v.trim()) return true
  }
  return false
}

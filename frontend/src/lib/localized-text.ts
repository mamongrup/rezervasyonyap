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

/**
 * Nesnenin tamamı locale→string sözlüğü mü?
 * Tüm anahtarlar locale kodu olmalı — aksi halde `{ id, title, videoUrl }` gibi
 * kayıtlar yanlışlıkla tek stringe indirgenir (`id` iki harfli olduğu için).
 */
export function looksLikeLocalizedText(v: unknown): v is LocalizedText {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false
  const entries = Object.entries(v as Record<string, unknown>)
  if (entries.length === 0) return false
  for (const [k, val] of entries) {
    if (typeof val !== 'string') return false
    if (!LOCALE_RE.test(k.trim())) return false
  }
  return true
}

/** Config ağacında gömülü `{ tr, en, … }` alanlarını locale'e göre stringleştirir. */
export function resolveLocalizedDeep(v: unknown, locale: string): unknown {
  if (looksLikeLocalizedText(v)) return pickLocalized(v, locale, '')
  if (Array.isArray(v)) return v.map((item) => resolveLocalizedDeep(item, locale))
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = resolveLocalizedDeep(val, locale)
    }
    return out
  }
  return v
}

/** Türkçe vitrin başlığı — kategori soneki (Gülbay → Gülbay Villa). */

export const HOLIDAY_PROPERTY_TYPE_LABEL_TR = {
  villa: 'Villa',
  apart: 'Apart',
  bungalov: 'Bungalov',
  daire: 'Daire',
}

const TYPE_WORD_RE = /\b(villa|apart|apartment|bungalov|bungalow|daire|duplex|triplex)\b/gi

function normalizeNameCasing(name) {
  const t = String(name || '').trim()
  if (!t) return ''
  if (t === t.toUpperCase() && /[A-ZÇĞİÖŞÜ]/.test(t)) {
    return t
      .toLocaleLowerCase('tr-TR')
      .split(/\s+/)
      .map((w) => (w ? w[0].toLocaleUpperCase('tr-TR') + w.slice(1) : ''))
      .join(' ')
  }
  return t
}

/** Baş/sondaki ilan tipi kelimesini çıkarır. */
export function stripHolidayTypeFromTitle(title) {
  let t = String(title || '').trim()
  if (!t) return ''
  t = t.replace(/^(villa|apart|bungalov|daire)\s+/i, '')
  t = t.replace(TYPE_WORD_RE, ' ').replace(/\s+/g, ' ').trim()
  return normalizeNameCasing(t)
}

/**
 * @param {string} title
 * @param {'villa'|'apart'|'bungalov'|'daire'|string} [propertyType]
 */
export function formatHolidayHomeTitleTr(title, propertyType = 'villa') {
  const suffix = HOLIDAY_PROPERTY_TYPE_LABEL_TR[propertyType] || HOLIDAY_PROPERTY_TYPE_LABEL_TR.villa
  const base = stripHolidayTypeFromTitle(title)
  if (!base) return suffix
  const suffixRe = new RegExp(`\\s+${suffix}$`, 'i')
  if (suffixRe.test(base)) return base
  return `${base} ${suffix}`
}

export function slugifyHolidayHomeName(title, propertyType = 'villa') {
  const base = stripHolidayTypeFromTitle(title)
  const suffix = (HOLIDAY_PROPERTY_TYPE_LABEL_TR[propertyType] || 'villa').toLowerCase()
  const name = base || 'ilan'
  return `${name}-${suffix}`
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
}

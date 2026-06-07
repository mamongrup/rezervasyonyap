/** Türkçe vitrin başlığı — kategori soneki (Sensation → Sensation Motoryat). */

export const YACHT_TYPE_LABEL_TR = {
  motor_yat: 'Motoryat',
  gulet: 'Gulet',
  yelkenli: 'Yelkenli',
  katamaran: 'Katamaran',
}

const TYPE_WORD_RE =
  /\b(gulet|motor\s*yacht|motoryacht|sailing\s*yacht|yelkenli|motoryat|m\/y|s\/y|catamaran|luxury|superyacht)\b/gi

function normalizeNameCasing(name) {
  const t = String(name || '').trim()
  if (!t) return ''
  if (t === t.toUpperCase() && /[A-Z]/.test(t)) {
    return t
      .toLowerCase()
      .split(' ')
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
      .join(' ')
  }
  return t
}

export function stripYachtTypeFromTitle(title) {
  let t = String(title || '').trim()
  if (!t) return ''
  t = t.replace(TYPE_WORD_RE, ' ').replace(/\s+/g, ' ').trim()
  return normalizeNameCasing(t)
}

export function formatYachtTitleTr(title, propertyType) {
  const suffix = YACHT_TYPE_LABEL_TR[propertyType] || 'Yat'
  const base = stripYachtTypeFromTitle(title)
  if (!base) return suffix
  const suffixRe = new RegExp(`\\s+${suffix}$`, 'i')
  if (suffixRe.test(base)) return base
  return `${base} ${suffix}`
}

export function slugifyYachtName(title) {
  return stripYachtTypeFromTitle(title)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

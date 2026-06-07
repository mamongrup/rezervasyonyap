/**
 * Yat ilanları — banyo sayısı çıkarımı (TR/EN metin + kabin planı).
 */

function parseIntField(raw) {
  const m = String(raw ?? '').match(/(\d+)/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Metinden kabin sayısı (banyo çıkarımı için). */
export function parseCabinCountFromText(text) {
  const t = String(text || '')
  const patterns = [
    /toplam\s+(\d+)\s*kabin/i,
    /(\d+)\s*(?:konuk|misafir)\s+kabin/i,
    /(\d+)\s*kabin(?:de|lerde|iyle|li)/i,
    /(\d+)\s*(?:adet\s+)?kabin/i,
    /(\d+)\s*(?:x\s*)?(?:master|double|twin|vip)\s+kabin/gi,
  ]
  for (const re of patterns) {
    const m = t.match(re)
    if (m) {
      const n = parseIntField(m[1])
      if (n) return n
    }
  }
  const master = (t.match(/(\d+)\s*master/gi) || []).length
  const doubles = [...t.matchAll(/(\d+)\s*x\s*double/gi)].reduce((s, m) => s + parseIntField(m[1]), 0)
  const twins = [...t.matchAll(/(\d+)\s*x\s*twin/gi)].reduce((s, m) => s + parseIntField(m[1]), 0)
  const sum = master + doubles + twins
  return sum > 0 ? sum : null
}

const ENSUITE_DEFAULT_TYPES = new Set(['gulet', 'yelkenli', 'katamaran'])

export function isEnsuiteDefaultPropertyType(propertyType) {
  return ENSUITE_DEFAULT_TYPES.has(String(propertyType || '').trim())
}

/** Saat/klima gibi yanlış pozitifleri ve kabin üstü değerleri eler. */
export function sanitizeBathCount(bath, cabinCount, pax) {
  if (bath == null) return null
  if (bath > 20) return cabinCount || null
  if (cabinCount && bath > cabinCount) return cabinCount
  if (pax && bath > pax) return cabinCount || pax
  return bath
}

/**
 * @param {string} text
 * @param {number|null} cabinCount
 * @param {{ propertyType?: string, allowEnsuiteDefault?: boolean }} [opts]
 */
/** Kabin planı satırlarından (2 x VIP … bathroom) banyo sayısı. */
export function parseBathroomCountFromCabinLayout(text) {
  const t = String(text || '')
    .replace(/&#8211;/g, '-')
    .replace(/&[#\w]+;/g, ' ')
  let count = 0
  for (const line of t.split(/\n+/)) {
    const lineNorm = line.trim()
    if (!/bathroom|banyo|tuvalet/i.test(lineNorm) && !/duş/i.test(lineNorm)) continue
    if (/^-\s*duş\s*$/i.test(lineNorm) || /^duş\s*$/i.test(lineNorm)) continue
    const nx = lineNorm.match(/(\d+)\s*x/i)
    if (nx) {
      count += parseInt(nx[1], 10)
      continue
    }
    const explicit = lineNorm.match(/(\d+)\s*(?:adet\s+)?(?:banyo|bathroom|tuvalet|duş)/i)
    if (explicit) count += parseInt(explicit[1], 10)
  }
  return count > 0 ? count : null
}

export function parseBathroomCount(text, cabinCount, { propertyType = '', allowEnsuiteDefault = true } = {}) {
  let t = String(text || '')
    .replace(/&#8211;/g, '-')
    .replace(/&[#\w]+;/g, ' ')
  // Önceden yazılmış kapasite satırı (yanlış banyo) tekrar eşleşmesin.
  t = t
    .trim()
    .replace(/^\s*Konaklama:\s*[\r\n]+-\s*[^\r\n]+[\r\n]+/i, '')
  if (!t.trim()) return null

  const layout = parseBathroomCountFromCabinLayout(t)
  if (layout) return sanitizeBathCount(layout, cabinCount, null)

  let m = t.match(/(\d+)\s*adet\s+duşlu\s+tuvalet/i)
  if (m) return sanitizeBathCount(parseIntField(m[1]), cabinCount, null)

  m = t.match(/(\d+)\s*adet\s+(?:duşlu\s+)?tuvalet/i)
  if (m) return sanitizeBathCount(parseIntField(m[1]), cabinCount, null)

  m = t.match(/(\d+)\s*adet\s+en[\s-]?suite/i)
  if (m) return sanitizeBathCount(parseIntField(m[1]), cabinCount, null)

  m = t.match(/(\d+)\s*(?:adet\s+)?(?:banyo|banyolu\s*kabin|bathroom)(?!\s*saat)/i)
  if (m) return sanitizeBathCount(parseIntField(m[1]), cabinCount, null)

  m = t.match(/(\d+)\s*(?:wc|head)\b/i)
  if (m) return sanitizeBathCount(parseIntField(m[1]), cabinCount, null)

  const ensuiteSignals = [
    /tüm\s+kabinler(?:de|)?\s+özel\s+banyolu/i,
    /her\s+kabin(?:de|da)?\s+özel\s+banyolu/i,
    /tüm\s+kabinler[^.]{0,80}(?:özel\s+)?banyo/i,
    /her\s+kabin(?:de|da)?\s+(?:özel\s+)?(?:tuvalet|banyo|duş)/i,
    /özel\s+tuvalet[^.]{0,50}duş/i,
    /tüm\s+kabinler(?:de|da)?\s+özel\s+duş/i,
    /kabinlerde\s+özel\s+(?:duş|banyo|tuvalet)/i,
    /her\s+birinde\s+özel\s+banyo/i,
    /özel\s+duşlar\s+ve\s+tuvaletler/i,
    /özel\s+duş\s+ve\s+tuvalet/i,
    /her\s+kabin(?:de|da)?\s+özel\s+duş/i,
    /duşa\s+kabinli\s+banyo/i,
    /özel\s+banyolu\s+ve\s+klimalı/i,
    /en[\s-]?suite/i,
    /ensuite/i,
    /private\s+bathroom/i,
    /each\s+cabin[^.]{0,60}bathroom/i,
  ]

  for (const re of ensuiteSignals) {
    if (re.test(t)) {
      const cabins = cabinCount ?? parseCabinCountFromText(t)
      if (cabins) return sanitizeBathCount(cabins, cabins, null)
    }
  }

  if (
    allowEnsuiteDefault &&
    isEnsuiteDefaultPropertyType(propertyType) &&
    (cabinCount ?? parseCabinCountFromText(t))
  ) {
    const cabins = cabinCount ?? parseCabinCountFromText(t)
    if (cabins && /kabin/i.test(t)) return sanitizeBathCount(cabins, cabins, null)
  }

  return null
}

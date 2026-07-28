/**
 * TatilBudur sayfa kazımasından sızan UI kromunu açıklama HTML'inden temizler.
 * Örnekler: "× #### Fiyat Tablosu…", "Oda Müsaitlik Takvimi", tekrarlayan
 * `Genel](https://www.tatilbudur.com/…)` / `Plaj & Havuz](…)` sekme artıkları,
 * `* ;) * ;)` dekoratif satırlar.
 */

const CUT_MARKERS = [
  /×\s*#{0,6}\s*Fiyat\s+Tablosu/i,
  /#{1,6}\s*Fiyat\s+Tablosu/i,
  /<p>\s*×\s*#{0,6}\s*Fiyat\s+Tablosu/i,
  /Fiyat\s+Tablosu\s+Yetişkin\s+ve\s+çocuk\s+dahil/i,
  /Oda\s+Müsaitlik\s+Takvimi/i,
  /<p>\s*Oda\s+Müsaitlik\s+Takvimi\s*<\/p>/i,
]

const BROKEN_TAB_LINK =
  /(?:Genel|Plaj\s*&\s*Havuz|Odalar|Konsept(?:\s+Özellikleri)?|Kampanyalar|Yorumlar|Önemli\s+Notlar|Tesis\s+Aktiviteleri|Havuz\s+ve\s+Plaj)\]\((?:https?:\/\/(?:www\.)?tatilbudur\.com\/[^)]*|javascript:[^)]*)\)/gi

const DECORATIVE_STAR_ROW = /(?:\*+\s*;\)\s*){2,}/g
const BARE_TB_URL = /\(\s*https?:\/\/(?:www\.)?tatilbudur\.com\/[^)\s]*\)/gi
const LOOSE_TB_URL = /https?:\/\/(?:www\.)?tatilbudur\.com\/[^\s<"']+/gi
const EMPTY_P = /(?:<p>\s*<\/p>\s*)+/gi
const TRAILING_JUNK =
  /(?:Genel|Plaj\s*&\s*Havuz|Odalar)\]?(?:\([^)]*)?$/i

/**
 * @param {string | null | undefined} html
 * @returns {string}
 */
export function cleanTatilbudurDescriptionHtml(html) {
  if (html == null) return ''
  let s = String(html)
  if (!s.trim()) return ''

  let cutAt = -1
  for (const re of CUT_MARKERS) {
    const idx = s.search(re)
    if (idx >= 0 && (cutAt < 0 || idx < cutAt)) cutAt = idx
  }
  if (cutAt >= 0) s = s.slice(0, cutAt)

  s = s.replace(BROKEN_TAB_LINK, '')
  s = s.replace(DECORATIVE_STAR_ROW, '')
  s = s.replace(BARE_TB_URL, '')
  // Kalan çıplak TB URL'leri (kesik satır sonları dahil)
  s = s.replace(LOOSE_TB_URL, '')
  s = s.replace(EMPTY_P, '')
  s = s.replace(/<p>\s*[*;)\s]+\s*<\/p>/gi, '')
  s = s.replace(TRAILING_JUNK, '')
  // Kesim ortasında kalan açık <p>
  s = s.replace(/<p>\s*$/i, '')
  // Boş bölüm başlıkları (krom kesilince kalan)
  s = s.replace(/<h[1-6][^>]*>\s*Önemli\s+Notlar\s*<\/h[1-6]>\s*$/i, '')
  s = s.replace(/(?:\s|&nbsp;)+$/gi, '')
  s = s.replace(/\n{3,}/g, '\n\n').trim()

  // Dengesiz etiket: sondaki açık <p> kapat
  const openP = (s.match(/<p\b/gi) || []).length
  const closeP = (s.match(/<\/p>/gi) || []).length
  if (openP > closeP) s += '</p>'.repeat(openP - closeP)

  return s.trim()
}

/** Tanı: açıklamada TatilBudur UI kromu var mı? */
export function hasTatilbudurDescriptionJunk(html) {
  const s = String(html || '')
  if (!s) return false
  if (/Fiyat\s+Tablosu/i.test(s)) return true
  if (/Oda\s+Müsaitlik\s+Takvimi/i.test(s)) return true
  if (/Genel\]\(/i.test(s)) return true
  if (/Plaj\s*&\s*Havuz\]\(/i.test(s)) return true
  if (/(?:\*\s*;\)\s*){3,}/.test(s)) return true
  if (/tatilbudur\.com\//i.test(s) && /\]\(https?:\/\//i.test(s)) return true
  return false
}

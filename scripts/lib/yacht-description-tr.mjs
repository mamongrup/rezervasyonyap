/**
 * İngilizce yat charter metinlerinden Türkçe açıklama üretimi.
 */

import { YACHT_TYPE_LABEL_TR } from './yacht-title-tr.mjs'

function decodeHtml(s) {
  return String(s || '')
    .replace(/&#8217;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

/** Başlık satırı / meta satırı — açıklamaya dahil edilmez. */
export function filterNarrativeParagraphs(paragraphs) {
  return (paragraphs || []).filter((p) => {
    const t = String(p || '').trim()
    if (t.length < 55) return false
    if (/\d+\s*ft\s*\/\s*\d+\s*m\s*\|/i.test(t)) return false
    if (/^motor yacht\s+\w+\s+for charter/i.test(t)) return false
    if ((t.match(/\|/g) || []).length >= 2) return false
    return true
  })
}

function englishWordRatio(text) {
  const words = String(text || '').split(/\s+/).filter((w) => /[a-z]{3,}/i.test(w))
  if (!words.length) return 0
  const trHints =
    /(dır|dir|tur|yat|kabin|misafir|lüks|motoryat|gulet|yelkenli|iç|dış|tasarım|mürettebat|seyir|hız|olanak|üssü|metre|yılında|sunar|bulun|tersanesinde|jakuzi|klima|stabilizatör|suit|çift|ikiz|ana|rahat|zarif|konfor)/i
  const enish = words.filter((w) => {
    if (/^[A-Z][a-zA-Z&]+$/.test(w)) return false
    if (trHints.test(w)) return false
    return /^[a-z]+$/i.test(w)
  })
  return enish.length / words.length
}

function extractDesignCredits(englishParagraphs) {
  const blob = (englishParagraphs || []).join(' ')
  const interior = blob.match(/interior has been designed by ([^.]+?)(?:\.|,|\s+and\s+her)/i)?.[1]?.trim()
  const exterior = blob.match(/exterior styling is by ([^.]+)/i)?.[1]?.trim()
  const crew = blob.match(/carrying up to (\d+) crew/i)?.[1]
  return { interior, exterior, crew: crew ? parseInt(crew, 10) : null }
}

/** Basit cümle çevirisi — yat charter alanında yaygın kalıplar. */
export function translateYachtParagraph(en) {
  let t = decodeHtml(String(en || ''))
  if (!t) return ''

  const replacements = [
    [/motor yacht/gi, 'motoryat'],
    [/sailing yacht/gi, 'yelkenli yat'],
    [/gulet/gi, 'gulet'],
    [/custom built in (\d{4}) by ([^.]+)/gi, '$1 yılında $2 tersanesinde özel üretim'],
    [/custom built in (\d{4})/gi, '$1 yılında özel üretim'],
    [/built in (\d{4}) by ([^.]+)/gi, '$1 yılında $2 tersanesinde inşa edilmiş'],
    [/built in (\d{4})/gi, '$1 yılında inşa edilmiş'],
    [/\bby\s+([A-Za-z][A-Za-z\s&]+?)(?=[.,]|$)/gi, '$1 tersanesinde'],
    [/refit(?:ted)?(?: in)? (\d{4})/gi, '$1 yılında refit görmüş'],
    [/sleeps up to (\d+) guests in (\d+) rooms?/gi, '$1 misafire kadar $2 kabinde konaklama sunar'],
    [/accommodat(?:es|ion for) up to (\d+) guests in (\d+)/gi, '$1 misafire kadar $2 kabinle konaklama imkânı sunar'],
    [/including a master suite/gi, 'ana suit dahil'],
    [/(\d+) double cabins?/gi, '$1 çift kişilik kabin'],
    [/(\d+) twin cabins?/gi, '$1 ikiz kabin'],
    [/carrying up to (\d+) crew/gi, '$1 kişilik mürettebat'],
    [/Timeless styling, beautiful furnishings and sumptuous seating feature throughout to create an elegant and comfortable atmosphere\.?/gi,
      'Zamansız tasarım, zarif mobilyalar ve konforlu oturma alanları yat genelinde şık ve rahat bir atmosfer oluşturur.'],
    [/impressive leisure and entertainment facilities/gi, 'etkileyici dinlenme ve eğlence olanakları'],
    [/ideal charter yacht for socializing and entertaining with family and friends/gi,
      'aile ve arkadaşlarla keyifli vakit geçirmek için ideal bir charter yatıdır'],
    [/aluminum hull/gi, 'alüminyum gövde'],
    [/stabilization system/gi, 'stabilizasyon sistemi'],
    [/cruising speed of (\d+) knots/gi, '$1 knot seyir hızı'],
    [/maximum speed of (\d+) knots/gi, 'maksimum $1 knot hız'],
    [/Water Toys/gi, 'Su oyuncakları'],
    [/Jacuzzi/gi, 'jakuzi'],
    [/Air Conditioning/gi, 'klima'],
    [/at anchor stabilizers?/gi, 'demirde stabilizatör'],
    [/Beach Club/gi, 'beach club'],
    [/for charter/gi, 'kiralama için'],
    [/luxury yacht experience/gi, 'lüks yat deneyimi'],
    [/The (\d+) ft \/(\d+)m motor yacht/gi, '$2 metrelik motoryat'],
    [/The yacht's interior has been designed by ([^.]+?)(?:\.|,|\s+and)/gi, ''],
    [/her exterior styling is by ([^.]+)\.?/gi, ''],
    [/She is also capable of carrying up to (\d+) crew onboard[^.]*\./gi,
      '$1 kişilik mürettebatla rahat bir lüks charter deneyimi sunar.'],
    [/The (\d+) ft \/(\d+)m motoryat, /gi, ''],
    [/and (\d+) twin cabins?/gi, 've $1 ikiz kabin'],
  ]

  for (const [re, rep] of replacements) {
    t = t.replace(re, rep)
  }

  return t.replace(/\s+/g, ' ').trim()
}

export function buildTurkishNarrative(ctx) {
  const {
    displayTitle,
    propertyType,
    lengthM,
    built,
    refit,
    basePort,
    pax,
    cabinCount,
    bathCount,
    englishParagraphs = [],
    waterToys,
    maxSpeed,
    cruiseSpeed,
  } = ctx

  const typeLabel = (YACHT_TYPE_LABEL_TR[propertyType] || 'Yat').toLowerCase()
  const lines = []

  if (lengthM && built) {
    let intro = `${displayTitle}, ${built} yılında inşa edilmiş ${lengthM} metrelik lüks bir ${typeLabel}`
    if (refit) intro += ` (${refit} refit)`
    intro += '.'
    if (basePort) intro += ` Ana üssü ${basePort}.`
    lines.push(intro)
  } else if (displayTitle) {
    lines.push(`${displayTitle}, ${typeLabel} kiralama için özenle hazırlanmış lüks bir yattır.`)
  }

  const credits = extractDesignCredits(englishParagraphs)
  if (credits.interior) lines.push(`İç mekân tasarımı: ${credits.interior}.`)
  if (credits.exterior) lines.push(`Dış tasarım: ${credits.exterior}.`)

  if (pax && cabinCount) {
    let cap = `Yat ${pax} misafire kadar konaklama sunar; ${cabinCount} kabin bulunmaktadır`
    if (bathCount) cap += ` (${bathCount} banyo)`
    cap += '.'
    lines.push(cap)
  }

  if (credits.crew) {
    lines.push(`${credits.crew} kişilik profesyonel mürettebat, konforlu bir charter deneyimi sunar.`)
  }

  for (const p of filterNarrativeParagraphs(englishParagraphs)) {
    const tr = translateYachtParagraph(p)
    if (!tr || tr.length < 40) continue
    if (englishWordRatio(tr) > 0.55) continue
    if (!lines.includes(tr)) lines.push(tr)
  }

  if (waterToys) {
    lines.push(`Su oyuncakları: ${waterToys}`)
  }
  if (cruiseSpeed || maxSpeed) {
    const parts = []
    if (cruiseSpeed) parts.push(`seyir hızı ${cruiseSpeed} knot`)
    if (maxSpeed) parts.push(`maksimum hız ${maxSpeed} knot`)
    lines.push(`Performans: ${parts.join(', ')}.`)
  }

  return lines.filter(Boolean).join('\n\n')
}

export function isDescriptionInsufficient(description, { minLen = 650 } = {}) {
  const text = String(description || '').trim()
  if (text.length < minLen) return true
  const afterCapacity = text.replace(/^Konaklama:[\s\S]*?\n\n/, '')
  const narrativeLen = afterCapacity
    .replace(/Haftalık charter ücretleri:[\s\S]*?(?=Teknik özellikler:|$)/, '')
    .replace(/Teknik özellikler:[\s\S]*/, '')
    .trim().length
  return narrativeLen < 180
}

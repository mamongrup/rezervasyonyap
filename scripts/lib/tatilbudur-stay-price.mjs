/**
 * TatilBudur oda kartı fiyat seçimi — banka kartı / sepette kampanya tutarlarını dışlar.
 * Kullanılacak tutar: "Toplam Fiyat" (konaklama satış toplamı).
 */

const CARD_CAMPAIGN_RE =
  /World\s*card|Worldcard|World\s*Kart|Bankkart|Bank\s*Kart|Maximum|Axess|Bonus|Paraf|Advantage|Worldpuan|sepette|kart\s*ile|kredi\s*kart/i

export function cleanTatilbudurPriceText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** "110.395 TL" / "101563" → number */
export function parseTatilbudurPriceNumber(value) {
  const normalized = cleanTatilbudurPriceText(value)
    .replace(/\s*(?:TL|₺)\s*$/i, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const number = Number(normalized.replace(/[^\d.]/g, ''))
  return Number.isFinite(number) && number > 0 ? number : null
}

function looksLikeCardDiscount(candidate, base) {
  if (!(candidate > 0) || !(base > 0) || candidate >= base) return false
  const ratio = candidate / base
  // Tipik sepette kart indirimi %3–%15 bandı
  return ratio >= 0.85 && ratio <= 0.97
}

/**
 * Oda kartı metni + price_texts listesinden konaklama "Toplam Fiyat" tutarını seçer.
 * Worldcard / Bankkart / sepette satırlarını yansıtmaz.
 *
 * @param {{ text?: string, price_texts?: string[] }} room
 * @returns {number | null}
 */
export function pickTatilbudurStayTotalPrice(room) {
  const text = cleanTatilbudurPriceText(room?.text)
  const rawTexts = Array.isArray(room?.price_texts) ? room.price_texts : []
  const prices = rawTexts.map(parseTatilbudurPriceNumber).filter((n) => n != null)

  // 1) "Toplam Fiyat" etiketinden sonraki ilk tutar — kart kampanyası başlangıcına kadar
  const totalLabel = text.match(/Toplam\s*Fiyat/i)
  if (totalLabel && totalLabel.index != null) {
    const after = text.slice(totalLabel.index + totalLabel[0].length)
    const cardAt = after.search(CARD_CAMPAIGN_RE)
    const window = after.slice(0, cardAt >= 0 ? cardAt : Math.min(after.length, 160))
    const m = window.match(/(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d{4,}(?:[.,]\d+)?)/)
    if (m) {
      const n = parseTatilbudurPriceNumber(m[1])
      if (n != null) return n
    }
  }

  // 2) price_texts içinde kart kampanyası yanındaki tutarları ele
  const nonCard = []
  for (const raw of rawTexts) {
    const n = parseTatilbudurPriceNumber(raw)
    if (n == null) continue
    const needle = cleanTatilbudurPriceText(raw).replace(/\s*(?:TL|₺)\s*$/i, '')
    let idx = text.indexOf(needle)
    if (idx < 0) {
      // "110.395" vs "110395" — rakamları bitişik ara
      const digits = needle.replace(/[^\d]/g, '')
      idx = digits ? text.replace(/[^\d]/g, '').indexOf(digits) : -1
      // metin konumunu kabaca bulmak için orijinal text'te ara
      if (idx < 0 && digits.length >= 4) {
        const loose = text.match(new RegExp(digits.split('').join('[.\\s]?'), 'i'))
        idx = loose?.index ?? -1
      }
    }
    if (idx >= 0) {
      const ctx = text.slice(Math.max(0, idx - 48), Math.min(text.length, idx + needle.length + 48))
      if (CARD_CAMPAIGN_RE.test(ctx)) continue
    }
    nonCard.push(n)
  }
  if (nonCard.length === 1) return nonCard[0]
  if (nonCard.length >= 2) {
    // Üstü çizili liste + Toplam: genelde son kalan Toplam'dır (kart elendi)
    const last = nonCard[nonCard.length - 1]
    const prev = nonCard[nonCard.length - 2]
    // Hâlâ iki tutar ve sonuncusu kart indirimi gibi görünüyorsa bir üstünü al
    if (looksLikeCardDiscount(last, prev)) return prev
    return last
  }

  // 3) Ham price_texts: sondaki tutar bir öncekine göre kart indirimi ise bir üstünü kullan
  if (prices.length >= 2) {
    const last = prices[prices.length - 1]
    const prev = prices[prices.length - 2]
    if (looksLikeCardDiscount(last, prev)) return prev
    // Liste + Toplam + Kart: üçlüde ortadaki Toplam
    if (prices.length >= 3) {
      const mid = prices[prices.length - 2]
      const card = prices[prices.length - 1]
      if (looksLikeCardDiscount(card, mid)) return mid
    }
  }

  // 4) Metinde kart kampanyası yoksa son (veya tek) tutar Toplam olabilir
  if (prices.length && !CARD_CAMPAIGN_RE.test(text)) {
    return prices[prices.length - 1]
  }

  // Kart var ama Toplam çıkmadı — tahmin etme
  return null
}

export function isTatilbudurCardCampaignText(value) {
  return CARD_CAMPAIGN_RE.test(cleanTatilbudurPriceText(value))
}

/** Kartlardaki önceden biçimlendirilmiş fiyat metninden tutar + ISO kod çıkarır */

export function parseListingPriceString(s: string): { amount: number; currency: string } | null {
  const t = s.trim()
  if (!t) return null

  const sliceNum = (rest: string): number | null => {
    const cleaned = rest.replace(/\s/g, '').replace(/,/g, '.')
    const m = cleaned.match(/^[\d.]+/)
    if (!m) return null
    const x = parseFloat(m[0])
    return Number.isFinite(x) ? x : null
  }

  if (t.startsWith('₺')) {
    const a = sliceNum(t.slice(1))
    return a != null ? { amount: a, currency: 'TRY' } : null
  }
  if (t.startsWith('$')) {
    const a = sliceNum(t.slice(1))
    return a != null ? { amount: a, currency: 'USD' } : null
  }
  if (t.startsWith('€')) {
    const a = sliceNum(t.slice(1))
    return a != null ? { amount: a, currency: 'EUR' } : null
  }
  if (t.startsWith('£')) {
    const a = sliceNum(t.slice(1))
    return a != null ? { amount: a, currency: 'GBP' } : null
  }

  const a = sliceNum(t)
  return a != null ? { amount: a, currency: 'TRY' } : null
}

export function formatMoneyIntl(amount: number, currencyCode: string): string {
  const code = currencyCode.trim().toUpperCase()
  try {
    // Sabit 'tr-TR' locale: sunucu (Node.js) ile tarayıcı çıktısı aynı → hydration uyuşmazlığı olmaz
    // İlan kartlarında virgülden sonraki kuruş gösterilmez (yuvarlanmış tam sayı)
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${code} ${Math.round(amount)}`
  }
}

/** Fiyat slider Min/Max kutuları — seçili para birimi; 1000+ için kısaltılmış gösterim (örn. ₺50k) */
export function formatFilterSliderPrice(amount: number, currencyCode: string): string {
  const code = currencyCode.trim().toUpperCase() || 'TRY'
  if (amount >= 1000) {
    try {
      const parts = new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: code,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).formatToParts(1000)
      const currencyPart = parts.find((p) => p.type === 'currency')?.value ?? code
      const compact = String(Math.round(amount / 1000))
      const currencyFirst = parts.findIndex((p) => p.type === 'currency') === 0
      return currencyFirst ? `${currencyPart} ${compact}k` : `${compact}k ${currencyPart}`
    } catch {
      return `${code} ${Math.round(amount / 1000)}k`
    }
  }
  return formatMoneyIntl(amount, code)
}

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

/** Fiyat slider Min/Max kutuları — seçili para birimi; 1000+ için kısaltılmış gösterim (örn. ₺50k, ₺1M) */
export function formatFilterSliderPrice(amount: number, currencyCode: string): string {
  const code = currencyCode.trim().toUpperCase() || 'TRY'
  try {
    const parts = new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(1000)
    const currencyPart = parts.find((p) => p.type === 'currency')?.value ?? code
    const currencyFirst = parts.findIndex((p) => p.type === 'currency') === 0
    const suffix = (n: number, unit: string) =>
      currencyFirst ? `${currencyPart} ${n}${unit}` : `${n}${unit} ${currencyPart}`

    if (amount >= 1_000_000) {
      return suffix(Math.round(amount / 1_000_000), 'M')
    }
    if (amount >= 1000) {
      return suffix(Math.round(amount / 1000), 'k')
    }
  } catch {
    if (amount >= 1_000_000) return `${code} ${Math.round(amount / 1_000_000)}M`
    if (amount >= 1000) return `${code} ${Math.round(amount / 1000)}k`
  }
  return formatMoneyIntl(amount, code)
}

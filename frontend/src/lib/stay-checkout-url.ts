/** ISO veya Date → yerel takvim YYYY-MM-DD (konaklama giriş/çıkış). */
export function checkoutDateYmd(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return ''
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(String(isoOrDate).trim())
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Vitrin konaklama detayı → checkout: ilan, tarih ve tutar query ile taşınır. */
export function buildStayCheckoutUrl(
  checkoutPath: string,
  params: {
    listingId: string
    startDate: Date
    endDate: Date
    currencyCode: string
    unitPrice: number
  },
): string {
  const u = new URLSearchParams()
  u.set('listingId', params.listingId.trim())
  u.set('startDate', params.startDate.toISOString())
  u.set('endDate', params.endDate.toISOString())
  u.set('checkIn', checkoutDateYmd(params.startDate))
  u.set('checkOut', checkoutDateYmd(params.endDate))
  u.set('currency', (params.currencyCode || 'TRY').trim().toUpperCase())
  const price = Number.isFinite(params.unitPrice) && params.unitPrice > 0 ? params.unitPrice : 0
  u.set('unitPrice', price.toFixed(2))
  const sep = checkoutPath.includes('?') ? '&' : '?'
  return `${checkoutPath}${sep}${u.toString()}`
}

export function resolveCheckoutListingId(
  fromQuery: string | null | undefined,
  envFallback?: string,
): string {
  const q = fromQuery?.trim()
  if (q) return q
  return envFallback?.trim() ?? ''
}

export function resolveCheckoutCurrency(
  fromQuery: string | null | undefined,
  envFallback?: string,
): string {
  const q = fromQuery?.trim()
  if (q) return q.toUpperCase()
  return (envFallback?.trim() || 'TRY').toUpperCase()
}

export function resolveCheckoutUnitPrice(
  fromQuery: string | null | undefined,
  envFallback?: string,
): number {
  const raw = fromQuery?.trim() || envFallback?.trim() || ''
  const n = parseFloat(raw.replace(/\s/g, '').replace(/,/g, '.'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

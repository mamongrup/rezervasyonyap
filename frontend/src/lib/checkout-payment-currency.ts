import { convertAmountWithRates } from '@/lib/currency-convert'
import type { PublicCurrencyRateRow } from '@/lib/travel-api'

const PREFERRED_CURRENCY_KEY = 'preferred_currency'

export function readPreferredCurrencyCode(): string {
  if (typeof window === 'undefined') return 'TRY'
  try {
    const s = localStorage.getItem(PREFERRED_CURRENCY_KEY)?.trim()
    if (s) return s.toUpperCase()
  } catch {
    /* ignore */
  }
  return 'TRY'
}

/** Ödeme / checkout URL — ilan para biriminden seçili para birimine çevirir. */
export function resolveCheckoutPaymentAmount(
  listingCurrency: string,
  amountInListingCurrency: number,
  rates: PublicCurrencyRateRow[],
  preferredCode?: string,
): { currencyCode: string; unitPrice: number } {
  const from = (listingCurrency || 'TRY').trim().toUpperCase()
  const preferred = (preferredCode?.trim() || readPreferredCurrencyCode()).toUpperCase()
  const amount =
    typeof amountInListingCurrency === 'number' && Number.isFinite(amountInListingCurrency)
      ? amountInListingCurrency
      : 0

  if (amount <= 0) {
    return { currencyCode: from, unitPrice: 0 }
  }
  if (from === preferred || rates.length === 0) {
    return { currencyCode: from, unitPrice: Math.round(amount * 100) / 100 }
  }

  const converted = convertAmountWithRates(amount, from, preferred, rates)
  if (converted == null) {
    return { currencyCode: from, unitPrice: Math.round(amount * 100) / 100 }
  }
  return { currencyCode: preferred, unitPrice: Math.round(converted * 100) / 100 }
}

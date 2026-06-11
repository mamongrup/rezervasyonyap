/**
 * Ücretlendirme ek ücretleri — sunucu ve istemci bileşenlerinde ortak (client boundary yok).
 */

export type ListingExtraChargesModel = {
  listingCurrency: string
  shortStay?: { minNights: number; feeAmount: number } | null
  /** Konaklama başına tek sefer — minimum gece kuralından bağımsız */
  cleaningFee?: { amount: number } | null
  damageDeposit?: { amount: number } | null
  customFees?: Array<{ label: string; amount: string; unit: string }>
  /** Ön ödeme yüzdesi açıklaması — ek ücretler listesinin en altında */
  prepaymentLine?: string | null
}

/** Rezervasyon sırasında tahsil edilen ek ücretler (depozito hariç). */
export function extraFeesListHasContent(e?: ListingExtraChargesModel): boolean {
  if (!e) return false
  if (e.shortStay != null && e.shortStay.minNights > 0 && e.shortStay.feeAmount > 0) return true
  if (e.cleaningFee != null && e.cleaningFee.amount > 0) return true
  if (e.customFees?.some((x) => x.label.trim() && x.amount.trim())) return true
  if (e.prepaymentLine?.trim()) return true
  return false
}

export function damageDepositHasContent(e?: ListingExtraChargesModel): boolean {
  return e?.damageDeposit != null && e.damageDeposit.amount > 0
}

export function extraChargesHasContent(e?: ListingExtraChargesModel): boolean {
  return extraFeesListHasContent(e) || damageDepositHasContent(e)
}

/** Site geneli varsayılan ön ödeme oranı — ilan alanı boşsa checkout ve vitrin bunu kullanır. */
export const DEFAULT_LISTING_PREPAYMENT_PERCENT = 20

export function resolveListingPrepaymentPercent(
  listingPercent: string | null | undefined,
  fallback: number = DEFAULT_LISTING_PREPAYMENT_PERCENT,
): number {
  const raw = listingPercent?.trim()
  if (!raw) return fallback
  const n = parseFloat(raw.replace(',', '.'))
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : fallback
}

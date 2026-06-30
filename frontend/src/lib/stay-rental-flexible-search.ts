import type { SearchQuery } from '@/lib/listings-fetcher'

/** Tarih / lokasyon araması yokken esnek öneri havuzu ana listeyle aynı — ek API çağrısı yapma. */
export function stayRentalFlexibleSearchActive(query: SearchQuery): boolean {
  return !!(
    query.checkin?.trim() ||
    query.checkout?.trim() ||
    query.flex_days?.trim() ||
    query.location?.trim() ||
    query.guests?.trim()
  )
}

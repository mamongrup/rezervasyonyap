export const SEARCH_RESULTS_HASH = '#search-results'

/** Arama sonrası kullanıcıyı kategori kahramanına değil doğrudan sonuçlara taşır. */
export function withSearchResultsAnchor(url: string): string {
  const base = url.split('#', 1)[0]
  return `${base}${SEARCH_RESULTS_HASH}`
}

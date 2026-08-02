/** Konaklama hero araması — mevcut vitrin yoluna göre sonuç listesi (`…/all`). */
export function staySearchResultsPathFromRestPath(restPath: string): string {
  const path = (restPath.split('?')[0] ?? restPath).trim() || '/'
  if (path.startsWith('/tatil-evleri') || path.includes('/tatil-evleri-harita')) {
    return '/tatil-evleri/all'
  }
  if (path.startsWith('/yat-kiralama') || path.includes('/yat-kiralama-harita')) {
    return '/yat-kiralama/all'
  }
  if (path.startsWith('/oteller') || path.includes('/oteller-harita')) {
    return '/oteller/all'
  }
  return '/oteller/all'
}

/** Çocuk yaşı otel rezervasyonu için gerekir; villa/tatil evi aramasında sorulmaz. */
export function shouldAskChildAgesForStaySearch(searchTargetPath: string): boolean {
  const path = (searchTargetPath.split('?')[0] ?? searchTargetPath).trim()
  return path.startsWith('/oteller')
}

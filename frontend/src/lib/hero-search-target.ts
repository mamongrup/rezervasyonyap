/**
 * Hero arama sonuç yolu — pathname / kategori rotasına göre `…/all`.
 * Stay özel mantığı `stay-search-target.ts` ile uyumlu tutulur.
 */

import { staySearchResultsPathFromRestPath } from '@/lib/stay-search-target'
import type { HeroSearchVertical } from '@/lib/hero-search-plan'

function cleanRestPath(restPath: string): string {
  return (restPath.split('?')[0] ?? restPath).trim() || '/'
}

/** Mevcut vitrin yolundan hero dikeyi (mobil form seçimi). */
export function heroSearchVerticalFromRestPath(restPath: string): HeroSearchVertical {
  const path = cleanRestPath(restPath)
  if (path.startsWith('/ucak-bileti') || path.includes('/ucak-bileti')) return 'flight'
  if (
    path.startsWith('/arac-kiralama') ||
    path.includes('/arac-kiralama') ||
    path.startsWith('/feribot') ||
    path.startsWith('/transfer') ||
    path.includes('/arac-kiralama-harita')
  ) {
    return 'car'
  }
  if (
    path.startsWith('/turlar') ||
    path.startsWith('/aktiviteler') ||
    path.startsWith('/kruvaziyer') ||
    path.startsWith('/hac-umre') ||
    path.startsWith('/vize') ||
    path.startsWith('/plaj-sezlong') ||
    path.startsWith('/sinema-biletleri') ||
    path.startsWith('/etkinlikler') ||
    path.startsWith('/restoran-rezervasyon')
  ) {
    return 'experience'
  }
  return 'stay'
}

/**
 * Pathname’den sonuç listesi yolu.
 * Ana sayfa `/` → stay varsayılanı `/oteller/all`.
 * Kategori sayfasındayken o kategorinin `/all` yolu.
 */
export function heroSearchResultsPathFromRestPath(restPath: string): string {
  const path = cleanRestPath(restPath)
  const vertical = heroSearchVerticalFromRestPath(path)

  if (vertical === 'stay') {
    return staySearchResultsPathFromRestPath(path)
  }

  if (vertical === 'flight') return '/ucak-bileti/all'

  if (vertical === 'car') {
    if (path.startsWith('/feribot')) return '/feribot/all'
    if (path.startsWith('/transfer')) return '/transfer/all'
    return '/arac-kiralama/all'
  }

  // experience — bulunduğun kategori /all; tanınmazsa turlar
  const experiencePrefixes = [
    '/turlar',
    '/aktiviteler',
    '/kruvaziyer',
    '/hac-umre',
    '/vize',
    '/plaj-sezlong',
    '/sinema-biletleri',
    '/etkinlikler',
    '/restoran-rezervasyon',
  ] as const
  for (const prefix of experiencePrefixes) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return `${prefix}/all`
    }
  }
  return '/turlar/all'
}

/** Kategori kaydı `categoryRoute` → `/oteller` vb. */
export function heroSearchResultsPathForCategoryRoute(categoryRoute: string): string {
  const base = categoryRoute.trim().replace(/\/+$/, '') || '/'
  if (base === '/') return '/oteller/all'
  return `${base}/all`
}

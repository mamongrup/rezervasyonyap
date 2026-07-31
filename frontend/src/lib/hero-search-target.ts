/**
 * Hero arama sonuç yolu — pathname / kategori rotasına göre `…/all`.
 * Stay özel mantığı `stay-search-target.ts` ile uyumlu tutulur.
 */

import { staySearchResultsPathFromRestPath } from '@/lib/stay-search-target'
import type { HeroSearchVertical } from '@/lib/hero-search-plan'

function cleanRestPath(restPath: string): string {
  return (restPath.split('?')[0] ?? restPath).trim() || '/'
}

const EXPERIENCE_PREFIXES = [
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

function pathMatchesCategoryPrefix(path: string, prefix: string): boolean {
  return (
    path === prefix ||
    path.startsWith(`${prefix}/`) ||
    path === `${prefix}-harita` ||
    path.startsWith(`${prefix}-harita/`) ||
    path.includes(`${prefix}-harita`)
  )
}

/** Mevcut vitrin yolundan hero dikeyi (mobil form seçimi). */
export function heroSearchVerticalFromRestPath(restPath: string): HeroSearchVertical {
  const path = cleanRestPath(restPath)
  if (path.startsWith('/ucak-bileti') || path.includes('/ucak-bileti')) return 'flight'
  if (
    path.startsWith('/arac-kiralama') ||
    path.includes('/arac-kiralama') ||
    path.startsWith('/feribot') ||
    path.includes('/feribot') ||
    path.startsWith('/transfer') ||
    path.includes('/transfer')
  ) {
    return 'car'
  }
  if (EXPERIENCE_PREFIXES.some((prefix) => pathMatchesCategoryPrefix(path, prefix))) {
    return 'experience'
  }
  return 'stay'
}

/**
 * Pathname’den sonuç listesi yolu.
 * Ana sayfa `/` → stay varsayılanı `/oteller/all`.
 * Kategori / harita sayfasındayken o kategorinin `/all` yolu.
 */
export function heroSearchResultsPathFromRestPath(restPath: string): string {
  const path = cleanRestPath(restPath)
  const vertical = heroSearchVerticalFromRestPath(path)

  if (vertical === 'stay') {
    return staySearchResultsPathFromRestPath(path)
  }

  if (vertical === 'flight') return '/ucak-bileti/all'

  if (vertical === 'car') {
    if (path.startsWith('/feribot') || path.includes('/feribot-harita')) return '/feribot/all'
    if (path.startsWith('/transfer') || path.includes('/transfer-harita')) return '/transfer/all'
    return '/arac-kiralama/all'
  }

  for (const prefix of EXPERIENCE_PREFIXES) {
    if (pathMatchesCategoryPrefix(path, prefix)) {
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

/**
 * Dahili App Router yolu → vitrinde gösterilecek diline uygun href.
 * `fetchLocalizedRoutes` (API + `localized-routes-fallback`) ile indekslenir.
 */

import { fetchLocalizedRoutes } from '@/lib/i18n-server'
import {
  buildLocalizedRouteIndexes,
  localizeAppPathWithHash,
  type LocalizedRouteIndexes,
} from '@/lib/localized-path-shared'
import { prefixLocale } from '@/lib/i18n-config'

let idxPromise: Promise<LocalizedRouteIndexes> | null = null

function getRouteIndexes(): Promise<LocalizedRouteIndexes> {
  if (!idxPromise) {
    idxPromise = fetchLocalizedRoutes().then((rows) => buildLocalizedRouteIndexes(rows))
  }
  return idxPromise
}

/** Sunucu bileşenleri: `await vitrinHref(locale, '/oteller/all')` → `/en/hotels/all` vb. */
export async function vitrinHref(locale: string, internalPath: string): Promise<string> {
  const idx = await getRouteIndexes()
  const p = internalPath.startsWith('/') ? internalPath : `/${internalPath}`
  return prefixLocale(locale, localizeAppPathWithHash(p, locale, idx))
}

/** Nav ağacı — her dahili `href` vitrin diline çevrilir (`#`, `http:`, `mailto:` dokunulmaz). */
export async function vitrinNavItemTree<T extends { href?: string; children?: T[] }>(
  locale: string,
  items: T[],
): Promise<T[]> {
  return Promise.all(items.map((item) => vitrinNavItemNode(locale, item)))
}

async function vitrinNavItemNode<T extends { href?: string; children?: T[] }>(locale: string, item: T): Promise<T> {
  const href = item.href
  const nextHref =
    href &&
    href !== '#' &&
    !href.startsWith('#') &&
    !href.startsWith('http://') &&
    !href.startsWith('https://') &&
    !href.startsWith('//') &&
    !href.startsWith('mailto:') &&
    !href.startsWith('tel:')
      ? await vitrinHref(locale, href)
      : href
  const children = item.children?.length
    ? await Promise.all(item.children.map((c) => vitrinNavItemNode(locale, c)))
    : item.children
  return { ...item, href: nextHref, children }
}

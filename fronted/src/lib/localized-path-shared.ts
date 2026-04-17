/** `localized_routes` API satırları — saf fonksiyonlar (middleware + RSC + client). */

import { defaultLocale, isAppLocale, swapLocaleInPathname } from '@/lib/i18n-config'

export type LocalizedRouteRow = {
  locale: string
  logical_key: string
  path_segment: string
}

export type LocalizedRouteIndexes = {
  /** locale → logical_key → path_segment (vitrin URL ilk segmenti) */
  forward: Record<string, Record<string, string>>
  /** locale → path_segment (küçük harf) → logical_key */
  reverse: Record<string, Record<string, string>>
}

function norm(s: string): string {
  return s.trim().toLowerCase()
}

export function buildLocalizedRouteIndexes(rows: LocalizedRouteRow[]): LocalizedRouteIndexes {
  const forward: Record<string, Record<string, string>> = {}
  const reverse: Record<string, Record<string, string>> = {}

  for (const r of rows) {
    const loc = norm(r.locale)
    const logical = r.logical_key.trim()
    const seg = r.path_segment.trim()
    if (!loc || !logical || !seg) continue
    if (!forward[loc]) forward[loc] = {}
    forward[loc][logical] = seg
    if (!reverse[loc]) reverse[loc] = {}
    reverse[loc][norm(seg)] = logical
  }

  for (const loc of Object.keys(forward)) {
    const f = forward[loc]
    const rev = reverse[loc] ?? {}
    for (const logical of Object.keys(f)) {
      const lk = norm(logical)
      if (!rev[lk]) rev[lk] = logical
    }
    reverse[loc] = rev
  }

  return { forward, reverse }
}

/** "/blog", "/legal/terms" gibi App Router göreli yollar → vitrin segmentiyle */
export function localizeAppPath(pathname: string, locale: string, idx: LocalizedRouteIndexes): string {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) return '/'
  const loc = norm(locale)
  const f = idx.forward[loc] ?? {}
  const seg0 = f[parts[0]] ?? parts[0]
  const tail = parts.slice(1)
  return tail.length > 0 ? `/${seg0}/${tail.join('/')}` : `/${seg0}`
}

/** `localizeAppPath` + `#fragment` korunur (ör. `/about#kariyer`). */
export function localizeAppPathWithHash(pathname: string, locale: string, idx: LocalizedRouteIndexes): string {
  const hashIdx = pathname.indexOf('#')
  const pathOnly = hashIdx === -1 ? pathname : pathname.slice(0, hashIdx)
  const hash = hashIdx === -1 ? '' : pathname.slice(hashIdx)
  return localizeAppPath(pathOnly || '/', locale, idx) + hash
}

export function swapLocaleInLocalizedPath(
  currentPathname: string,
  newLocale: string,
  idx: LocalizedRouteIndexes,
): string {
  const next = newLocale.trim()
  if (!next) return currentPathname

  const raw = currentPathname.split('/').filter(Boolean)
  if (raw.length === 0) {
    return norm(next) === norm(defaultLocale) ? '/' : `/${next}`
  }

  const first = raw[0]
  if (!first || !isAppLocale(first)) return swapLocaleInPathname(currentPathname, newLocale)

  const curLocale = norm(first)
  const segs = raw.slice(1)
  if (segs.length === 0) {
    return norm(next) === norm(defaultLocale) ? '/' : `/${next}`
  }

  const rev = idx.reverse[curLocale] ?? {}
  const logical0 = rev[norm(segs[0])] ?? segs[0]

  const fNew = idx.forward[norm(next)] ?? {}
  const outFirst = fNew[logical0] ?? logical0
  const tail = segs.slice(1)
  const pathRest = tail.length > 0 ? `/${outFirst}/${tail.join('/')}` : `/${outFirst}`
  if (norm(next) === norm(defaultLocale)) {
    return pathRest
  }
  return `/${next}${pathRest}`
}

/**
 * İlk segment geçerli dil koduysa localized segment eşlemesi; aksi halde mevcut `swapLocaleInPathname`.
 */
export function swapLocaleInPathnameLocalized(
  currentPathname: string,
  newLocale: string,
  idx: LocalizedRouteIndexes,
): string {
  const parts = currentPathname.split('/').filter(Boolean)
  if (parts[0] && isAppLocale(parts[0])) {
    return swapLocaleInLocalizedPath(currentPathname, newLocale, idx)
  }
  return swapLocaleInPathname(currentPathname, newLocale)
}

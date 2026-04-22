import { isAppLocale } from '@/lib/i18n-config'
import { fetchActiveLocaleCodes, fetchLocalizedRoutes } from '@/lib/i18n-server'
import { buildLocalizedRouteIndexes, localizeAppPath } from '@/lib/localized-path-shared'
import type { Metadata } from 'next'

/** Sayfa bazlı hreflang + canonical (CMS / liste sayfalarında kullanın) */
export async function buildLocaleAlternates(
  locale: string,
  pathAfterLocale: string,
): Promise<Pick<Metadata, 'alternates'>> {
  const codes = await fetchActiveLocaleCodes()
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || ''
  const path = pathAfterLocale === '/' || pathAfterLocale === '' ? '' : pathAfterLocale
  const normalized = path.startsWith('/') ? path : `/${path}`

  if (!base) {
    return {
      alternates: {
        languages: Object.fromEntries(
          codes.map((l) => [l, `/${l}${normalized === '/' ? '' : normalized}`]),
        ),
      },
    }
  }

  const loc = isAppLocale(locale) && codes.includes(locale) ? locale : codes[0] ?? 'tr'
  const languages: Record<string, string> = {}
  for (const l of codes) {
    languages[l] = `${base}/${l}${normalized === '/' ? '' : normalized}`
  }

  return {
    alternates: {
      canonical: `${base}/${loc}${normalized === '/' ? '' : normalized}`,
      languages,
    },
  }
}

/**
 * hreflang / canonical — `localized_routes` ile her dilde doğru ilk segment (ör. /tr/gunluk/...).
 * `pathAfterLocale`: `/blog` veya `/blog/slug` veya `/legal/terms` (locale öneki olmadan).
 */
export async function buildLocaleAlternatesLocalized(
  locale: string,
  pathAfterLocale: string,
): Promise<Pick<Metadata, 'alternates'>> {
  const codes = await fetchActiveLocaleCodes()
  const rows = await fetchLocalizedRoutes()
  const idx = buildLocalizedRouteIndexes(rows)
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || ''

  const raw = pathAfterLocale === '/' || pathAfterLocale === '' ? '/' : pathAfterLocale
  const normalized = raw.startsWith('/') ? raw : `/${raw}`

  function pathForLang(l: string): string {
    if (normalized === '/' || normalized === '') return ''
    return localizeAppPath(normalized, l, idx)
  }

  if (!base) {
    return {
      alternates: {
        languages: Object.fromEntries(codes.map((l) => [l, `/${l}${pathForLang(l)}`])),
      },
    }
  }

  const loc = isAppLocale(locale) && codes.includes(locale) ? locale : codes[0] ?? 'tr'
  const languages: Record<string, string> = {}
  for (const l of codes) {
    const p = pathForLang(l)
    languages[l] = `${base}/${l}${p}`
  }
  return {
    alternates: {
      canonical: `${base}/${loc}${pathForLang(loc)}`,
      languages,
    },
  }
}

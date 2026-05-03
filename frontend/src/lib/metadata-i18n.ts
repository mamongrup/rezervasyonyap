import { defaultLocale, isAppLocale } from '@/lib/i18n-config'
import { fetchActiveLocaleCodes, fetchLocalizedRoutes } from '@/lib/i18n-server'
import { buildLocalizedRouteIndexes, localizeAppPath } from '@/lib/localized-path-shared'
import { getPublicSiteUrl } from '@/lib/site-branding-seo'
import type { Metadata } from 'next'

/** hreflang / canonical — varsayılan dilde URL öneki yok (`/` …), diğerlerinde `/{kod}`. Mutlak URL. */
function absoluteAlternateUrl(
  baseNoTrailingSlash: string,
  localeCode: string,
  pathAfterLocale: string,
): string {
  const raw = pathAfterLocale === '/' || pathAfterLocale === '' ? '' : pathAfterLocale
  const suffix = raw === '' ? '' : raw.startsWith('/') ? raw : `/${raw}`
  if (localeCode === defaultLocale) {
    return suffix ? `${baseNoTrailingSlash}${suffix}` : `${baseNoTrailingSlash}/`
  }
  return suffix
    ? `${baseNoTrailingSlash}/${localeCode}${suffix}`
    : `${baseNoTrailingSlash}/${localeCode}`
}

/** Sayfa bazlı hreflang + canonical (CMS / liste sayfalarında kullanın) */
export async function buildLocaleAlternates(
  locale: string,
  pathAfterLocale: string,
): Promise<Pick<Metadata, 'alternates'>> {
  const codes = await fetchActiveLocaleCodes()
  const base = getPublicSiteUrl().replace(/\/$/, '')

  if (!base) {
    return {
      alternates: {
        languages: Object.fromEntries(codes.map((l) => [l, absoluteAlternateUrl('', l, pathAfterLocale)])),
      },
    }
  }

  const loc = isAppLocale(locale) && codes.includes(locale) ? locale : codes[0] ?? 'tr'
  const languages: Record<string, string> = {}
  for (const l of codes) {
    languages[l] = absoluteAlternateUrl(base, l, pathAfterLocale)
  }
  languages['x-default'] = absoluteAlternateUrl(base, defaultLocale, pathAfterLocale)

  return {
    alternates: {
      canonical: absoluteAlternateUrl(base, loc, pathAfterLocale),
      languages,
    },
  }
}

/**
 * hreflang / canonical — `localized_routes` ile her dilde doğru ilk segment (ör. `/gunluk` ↔ `/daily`).
 * `pathAfterLocale`: `/blog` veya `/blog/slug` veya `/legal/terms` (locale öneki olmadan).
 * Yerelleştirilmiş ilk segment `localized_routes` ile üretilir; varsayılan dilde URL öneki yok.
 */
export async function buildLocaleAlternatesLocalized(
  locale: string,
  pathAfterLocale: string,
): Promise<Pick<Metadata, 'alternates'>> {
  const codes = await fetchActiveLocaleCodes()
  const rows = await fetchLocalizedRoutes()
  const idx = buildLocalizedRouteIndexes(rows)
  const base = getPublicSiteUrl().replace(/\/$/, '')

  const raw = pathAfterLocale === '/' || pathAfterLocale === '' ? '/' : pathAfterLocale
  const normalized = raw.startsWith('/') ? raw : `/${raw}`

  function pathForLang(l: string): string {
    if (normalized === '/' || normalized === '') return ''
    return localizeAppPath(normalized, l, idx)
  }

  if (!base) {
    return {
      alternates: {
        languages: Object.fromEntries(
          codes.map((l) => {
            const p = pathForLang(l)
            return [l, absoluteAlternateUrl('', l, p === '' ? '' : p)]
          }),
        ),
      },
    }
  }

  const loc = isAppLocale(locale) && codes.includes(locale) ? locale : codes[0] ?? 'tr'
  const languages: Record<string, string> = {}
  for (const l of codes) {
    const p = pathForLang(l)
    languages[l] = absoluteAlternateUrl(base, l, p === '' ? '' : p)
  }
  const defP = pathForLang(defaultLocale)
  languages['x-default'] = absoluteAlternateUrl(base, defaultLocale, defP === '' ? '' : defP)
  const locP = pathForLang(loc)
  return {
    alternates: {
      canonical: absoluteAlternateUrl(base, loc, locP === '' ? '' : locP),
      languages,
    },
  }
}

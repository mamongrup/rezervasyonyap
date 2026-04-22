/**
 * Dil segmenti: API’de kayıtlı olmayan ama biçim olarak geçerli kodlar middleware’den geçer;
 * [locale]/layout aktif listeyi doğrular.
 */
const LOCALE_SEGMENT = /^[a-z]{2}(-[a-z0-9]{1,8})?$/i

/** @deprecated Tipler genişletildi; herhangi bir geçerli dil kodu dizesi. */
export type AppLocale = string

export const defaultLocale = 'tr'

/** Sitemap / statik yedek — tercihen `fetchActiveLocaleCodes` kullanın. */
export const fallbackLocaleCodes = ['tr', 'en', 'de', 'ru', 'zh', 'fr'] as const
export type FallbackLocaleCode = (typeof fallbackLocaleCodes)[number]

export function isAppLocale(s: string): s is AppLocale {
  return typeof s === 'string' && LOCALE_SEGMENT.test(s.trim())
}

function normLocale(s: string): string {
  return s.trim().toLowerCase()
}

/** Örn. `/en/blog` → `en`, `/` veya `/oteller` → `defaultLocale` */
export function localeFromPathname(pathname: string): AppLocale {
  const first = pathname.split('/').filter(Boolean)[0]
  return first && isAppLocale(first) ? first : defaultLocale
}

export function isEnglishLocale(locale: string | undefined): boolean {
  if (locale == null || locale === '') return false
  return normLocale(locale).startsWith('en')
}

/**
 * Dahili yol → tarayıcıda gösterilecek href.
 * Varsayılan dil (`defaultLocale`): önek yok — `/`, `/blog` (middleware `/tr/...` olarak yazar).
 * Diğer diller: `/en/blog` vb.
 */
export function prefixLocale(locale: string, href: string): string {
  if (!href || href === '#') return href
  if (href.startsWith('http://') || href.startsWith('https://')) return href
  if (href.startsWith('//')) return href
  if (href.startsWith('mailto:') || href.startsWith('tel:')) return href
  const path = href === '/' ? '' : href
  if (normLocale(locale) === normLocale(defaultLocale)) {
    return path === '' ? '/' : path
  }
  return `/${locale}${path}`
}

/**
 * Link `href` için tarayıcı yolu: dahili yol (`/oteller/all`) veya sunucunun `vitrinHref` ile ürettiği tam yol (`/en/hotels/all`).
 * İlk segment zaten dil koduysa tekrar `prefixLocale` uygulanmaz (çift `/en/en/...` önlenir).
 */
export function normalizeHrefForLocale(locale: string, href: string | undefined): string {
  if (!href || href === '#') return '#'
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) return href
  if (href.startsWith('mailto:') || href.startsWith('tel:')) return href
  const trimmed = href.trim()
  const parts = trimmed.split('/').filter(Boolean)
  if (parts[0] && isAppLocale(parts[0])) return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return prefixLocale(locale, trimmed)
}

export function stripLocalePrefix(pathname: string): { locale: AppLocale | null; restPath: string } {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) return { locale: null, restPath: '/' }
  const first = parts[0]
  if (first && isAppLocale(first)) {
    const rest = parts.slice(1)
    return {
      locale: first,
      restPath: rest.length === 0 ? '/' : '/' + rest.join('/'),
    }
  }
  return { locale: null, restPath: pathname || '/' }
}

/**
 * Mevcut URL'de dil kodunu değiştirir.
 * Varsayılan dil URL'de önek olmadan (`/blog`); diğer diller `/en/blog`.
 */
export function swapLocaleInPathname(currentPathname: string, newLocale: string): string {
  const { locale, restPath } = stripLocalePrefix(currentPathname)
  const path = restPath === '/' ? '' : restPath
  const next = newLocale.trim()
  if (!next) return currentPathname
  const want = normLocale(next)
  const def = normLocale(defaultLocale)

  if (!locale) {
    if (want === def) {
      return path === '' ? '/' : path
    }
    return `/${next}${path === '' ? '' : path}`
  }

  if (want === def) {
    return path === '' ? '/' : path
  }
  return `/${next}${path === '' ? '' : path}`
}

/**
 * react-datepicker `locale` prop — `register-datepicker-locales` ile kayıtlı anahtarlar.
 */
export function datePickerLocaleId(urlLocale: string | undefined | null): string {
  if (!urlLocale) return 'tr'
  if (isEnglishLocale(urlLocale)) return 'en'
  const l = normLocale(urlLocale)
  if (l === 'tr' || l === 'de' || l === 'fr' || l === 'ru' || l === 'zh') return l
  return 'tr'
}

/**
 * `Intl` / `toLocaleString` — vitrin URL locale → BCP 47 (ay başlığı, kısa tarih metinleri).
 */
export function intlDateLocaleTag(urlLocale: string | undefined | null): string {
  if (!urlLocale) return 'tr-TR'
  if (isEnglishLocale(urlLocale)) return 'en-US'
  const l = normLocale(urlLocale)
  if (l === 'tr') return 'tr-TR'
  if (l === 'de') return 'de-DE'
  if (l === 'fr') return 'fr-FR'
  if (l === 'ru') return 'ru-RU'
  if (l === 'zh') return 'zh-CN'
  return 'tr-TR'
}

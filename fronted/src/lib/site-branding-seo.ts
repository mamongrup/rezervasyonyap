import type { SitePublicConfig } from '@/lib/travel-api'

/** Panelde `favicon_url` boşsa kullanılan kök favicon (public altında). */
export const DEFAULT_FAVICON_PATH = '/favicon.svg'

/**
 * Canonical, Open Graph, Twitter ve `metadataBase` için site kökü (sonda `/` yok).
 * - Öncelik: `NEXT_PUBLIC_SITE_URL`
 * - Vercel: `VERCEL_URL` → `https://…`
 * - Geliştirme: `http://127.0.0.1:3000`
 */
export function getPublicSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  if (raw) return raw

  const vercel = process.env.VERCEL_URL?.trim().replace(/\/$/, '')
  if (vercel) {
    return `https://${vercel}`
  }

  if (process.env.NODE_ENV === 'development') {
    return 'http://127.0.0.1:3000'
  }

  return ''
}

/** Varsayılan meta açıklaması (branding.site_description boşsa). */
export function defaultMetaDescription(): string {
  return 'Otel, tur, transfer ve tatil rezervasyonu için en iyi adres.'
}

/** `branding.site_name` veya env yedek. */
export function brandingSiteName(pub: SitePublicConfig | null): string {
  const fallback = (process.env.NEXT_PUBLIC_SITE_NAME ?? '').trim() || 'Chisfis'
  if (!pub?.branding) return fallback
  const b = pub.branding as Record<string, unknown>
  const name = typeof b.site_name === 'string' ? b.site_name.trim() : ''
  return name || fallback
}

/** Ham açıklama (yalnızca JSON’da tanımlıysa). */
export function rawSiteDescription(pub: SitePublicConfig | null): string | undefined {
  if (!pub?.branding) return undefined
  const b = pub.branding as Record<string, unknown>
  const v = b.site_description
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

/** Meta `description` — her zaman dolu string. */
export function metaSiteDescription(pub: SitePublicConfig | null): string {
  return rawSiteDescription(pub) ?? defaultMetaDescription()
}

/** `branding` içinden isteğe bağlı `seo_keywords`: `["a","b"]` veya `"a, b, c"`. */
export function brandingKeywords(pub: SitePublicConfig | null, siteName: string): string[] {
  const b = pub?.branding as Record<string, unknown> | undefined
  const raw = b?.seo_keywords
  if (Array.isArray(raw) && raw.every((x) => typeof x === 'string')) {
    return (raw as string[]).map((s) => s.trim()).filter(Boolean)
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',').map((s) => s.trim()).filter(Boolean)
  }
  return [siteName, 'seyahat', 'rezervasyon', 'otel', 'tur', 'tatil']
}

export function brandingAssetPath(pub: SitePublicConfig | null, key: string): string {
  if (!pub?.branding) return ''
  const b = pub.branding as Record<string, unknown>
  const v = b[key]
  return typeof v === 'string' ? v.trim() : ''
}

/** Göreli veya mutlak URL — OG/Twitter için. */
export function toAbsoluteSiteUrl(baseNoTrailingSlash: string, path: string): string | undefined {
  const p = path.trim()
  if (!p) return undefined
  if (p.startsWith('http://') || p.startsWith('https://')) return p
  if (!baseNoTrailingSlash) return undefined
  return `${baseNoTrailingSlash}${p.startsWith('/') ? '' : '/'}${p}`
}

/** Open Graph `locale` alanı. */
export function ogLocaleForSite(locale: string): string {
  const map: Record<string, string> = {
    tr: 'tr_TR',
    en: 'en_US',
    de: 'de_DE',
    ru: 'ru_RU',
    zh: 'zh_CN',
    fr: 'fr_FR',
  }
  return map[locale] ?? locale
}

/** Sağ üst «Customize» panelindeki hızlı ana sayfa linkleri + öntanımlı liste (API yokken). */
export type HomePageLinkItem = { label: string; path: string }

export const DEFAULT_HOME_PAGE_LINKS: HomePageLinkItem[] = [
  { label: 'Stays', path: '/' },
  { label: 'Experiences', path: '/experience' },
  { label: 'Cars', path: '/car' },
  { label: 'Flights', path: '/flight-categories/all' },
  { label: 'Home 2', path: '/home-2' },
]

/**
 * `branding.home_page_links`: `[{ "label": "...", "path": "/..." }]` — path locale önek içermez.
 */
export function parseHomePageLinksFromBranding(pub: SitePublicConfig | null): HomePageLinkItem[] {
  const b = pub?.branding as Record<string, unknown> | undefined
  const raw = b?.home_page_links
  if (!Array.isArray(raw)) return DEFAULT_HOME_PAGE_LINKS
  const out: HomePageLinkItem[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const label =
      typeof o.label === 'string'
        ? o.label.trim()
        : typeof o.name === 'string'
          ? o.name.trim()
          : ''
    const pathRaw =
      typeof o.path === 'string'
        ? o.path.trim()
        : typeof o.slug === 'string'
          ? o.slug.trim()
          : ''
    if (!label || !pathRaw) continue
    const path = pathRaw.startsWith('/') ? pathRaw : `/${pathRaw}`
    out.push({ label, path })
  }
  return out.length > 0 ? out : DEFAULT_HOME_PAGE_LINKS
}

/** Mobil alt bardaki «Hesap» hedefi — `branding.mobile_account_path` (ör. `/account`). */
export function parseMobileAccountPathFromBranding(pub: SitePublicConfig | null): string {
  const b = pub?.branding as Record<string, unknown> | undefined
  const raw = b?.mobile_account_path
  if (typeof raw === 'string' && raw.trim().startsWith('/')) return raw.trim()
  return '/account'
}

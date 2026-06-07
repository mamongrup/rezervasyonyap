export const DEFAULT_SITE_LOGO_LIGHT = '/uploads/site/logo-light.webp'
export const DEFAULT_SITE_LOGO_DARK = '/uploads/site/logo-dark.webp'

/** Varsayılan şablon dosya adları — `brand-logo-*` yüklemeleri burada değil */
const PLACEHOLDER_BASENAMES = new Set([
  'logo-light.avif',
  'logo-light.webp',
  'logo-dark.avif',
  'logo-dark.webp',
])

function baseName(v: string): string {
  // Query/hash'i önce ayır; yalnızca dosya adı kısmı karşılaştırılmalı
  const pathOnly = v.split('?')[0]?.split('#')[0] ?? v
  return pathOnly.replace(/^\/+/, '').split('/').pop() ?? pathOnly
}

/** Varsayılan şablon yolu — gerçek yüklenmiş logo sayılmaz */
export function isPlaceholderSiteLogoUrl(raw: string | null | undefined): boolean {
  const v = (raw ?? '').trim()
  if (!v) return true
  return PLACEHOLDER_BASENAMES.has(baseName(v))
}

/** Boş veya şablon ise null; aksi halde ham kayıtlı URL */
export function normalizeSiteLogoUrl(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim()
  if (!v || isPlaceholderSiteLogoUrl(v)) return null
  return v
}

/**
 * Yalnızca açık veya yalnızca koyu logo yüklendiğinde diğer modda da aynı görseli kullan.
 */
export function pickEffectiveSiteLogoUrls(
  light: string | null | undefined,
  dark: string | null | undefined,
): { light: string | null; dark: string | null } {
  const l = normalizeSiteLogoUrl(light)
  const d = normalizeSiteLogoUrl(dark)
  return { light: l ?? d, dark: d ?? l }
}

export function resolveSiteLogoUrl(
  raw: string | null | undefined,
  fallback: string = '',
): string {
  const v = (raw ?? '').trim()
  if (!v || isPlaceholderSiteLogoUrl(v)) return fallback
  if (v.startsWith('http://') || v.startsWith('https://')) return v
  if (v.startsWith('/uploads/') || v.startsWith('/images/')) return v
  if (v.startsWith('/api/site-upload/')) return v
  if (v.startsWith('/')) return v
  return `/api/site-upload/${v.replace(/^\/+/, '')}`
}

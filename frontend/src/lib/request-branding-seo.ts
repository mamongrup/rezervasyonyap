import { headers } from 'next/headers'
import { hostApexKey } from '@/lib/api-origin'
import { applyBrandingDomainOverrides } from '@/lib/branding-for-host'
import { DEFAULT_DOMAIN_SEO } from '@/lib/brand-sites'

/**
 * İstek host’una göre branding: domain SEO varsayılanları + panel `domain_overrides`.
 * Üç marka domaininin title/description sinyallerini ayırır.
 */
export async function resolveRequestBranding(
  branding: Record<string, unknown> | null | undefined,
): Promise<{ hostname: string; branding: Record<string, unknown> }> {
  let hostname = ''
  try {
    const h = await headers()
    hostname = (h.get('x-forwarded-host') ?? h.get('host') ?? '').split(',')[0]?.trim() ?? ''
  } catch {
    hostname = ''
  }

  const apex = hostApexKey(hostname.split(':')[0] ?? '')
  const defaults = apex ? DEFAULT_DOMAIN_SEO[apex] : undefined
  const base: Record<string, unknown> = { ...(branding ?? {}) }
  if (defaults) {
    base.site_name = defaults.site_name
    base.site_description = defaults.site_description
  }
  return {
    hostname,
    branding: applyBrandingDomainOverrides(base, hostname || 'rezervasyonyap.tr'),
  }
}

/** Analytics JSON’dan host’a özel veya genel Search Console doğrulama kodu. */
export function resolveSearchConsoleVerification(
  analytics: Record<string, unknown> | null | undefined,
  hostname: string,
): string {
  if (!analytics) return ''
  const apex = hostApexKey(hostname.split(':')[0] ?? '')
  const byHost = analytics.search_console_verification_by_host
  if (apex && byHost && typeof byHost === 'object' && !Array.isArray(byHost)) {
    const v = (byHost as Record<string, unknown>)[apex]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  const global = analytics.search_console_verification
  return typeof global === 'string' ? global.trim() : ''
}

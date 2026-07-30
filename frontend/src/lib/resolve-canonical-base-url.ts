import { headers } from 'next/headers'
import { hostApexKey, isSameDeploymentSiteHost } from '@/lib/api-origin'
import { getPublicSiteUrl } from '@/lib/site-branding-seo'

/**
 * İstek host'undan marka domain kökü (`https://apex`, sonda `/` yok).
 * Yalnızca `SAME_DEPLOYMENT_SITE_APEXES` için; www → apex normalize edilir.
 * Bilinmeyen host'ta boş string.
 */
export function siteOriginForDeploymentHost(hostname: string): string {
  const hostOnly = hostname.split(',')[0]?.trim().split(':')[0]?.trim() ?? ''
  if (!hostOnly || !isSameDeploymentSiteHost(hostOnly)) return ''
  return `https://${hostApexKey(hostOnly)}`
}

/**
 * Canonical / hreflang / sitemap / robots için site kökü (`https://ornek.com`, sonda `/` yok).
 *
 * 1) İstek `Host` / `x-forwarded-host` marka domainiyse **o domain**
 *    (Google her host’u ayrı indeksleyebilsin; env’deki tek SITE_URL yüzünden
 *    .com.tr / reservationinturkey.com canonical’ı .tr’ye gömülmesin)
 * 2) Aksi halde `NEXT_PUBLIC_SITE_URL` / Vercel / dev yedeği (`getPublicSiteUrl`)
 */
export async function resolveCanonicalBaseUrl(): Promise<string> {
  try {
    const h = await headers()
    const rawHost = h.get('x-forwarded-host') ?? h.get('host')
    if (rawHost) {
      const fromHost = siteOriginForDeploymentHost(rawHost)
      if (fromHost) return fromHost
    }
  } catch {
    /* headers() dışı bağlam (test / build) */
  }

  return getPublicSiteUrl().trim().replace(/\/$/, '')
}

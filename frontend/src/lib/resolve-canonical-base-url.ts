import { headers } from 'next/headers'
import { getPublicSiteUrl } from '@/lib/site-branding-seo'

/**
 * Canonical / hreflang için site kökü (`https://ornek.com`, sonda `/` yok).
 * 1) `NEXT_PUBLIC_SITE_URL` / Vercel / dev yedeği (`getPublicSiteUrl`)
 * 2) Boşsa istek başlıkları: `x-forwarded-host` veya `host` + `x-forwarded-proto`
 *
 * Self-hosted: `npm run build` sırasında env yoksa bile SSR isteğinde hreflang mutlak çıkar.
 */
export async function resolveCanonicalBaseUrl(): Promise<string> {
  const fromEnv = getPublicSiteUrl().trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv

  try {
    const h = await headers()
    const rawHost = h.get('x-forwarded-host') ?? h.get('host')
    if (!rawHost) return ''

    const host = rawHost.split(',')[0].trim()
    const rawProto = h.get('x-forwarded-proto')
    const firstProto = rawProto?.split(',')[0].trim().toLowerCase() ?? ''
    const proto =
      firstProto === 'http' || firstProto === 'https' ? firstProto : 'https'

    return `${proto}://${host}`.replace(/\/$/, '')
  } catch {
    return ''
  }
}

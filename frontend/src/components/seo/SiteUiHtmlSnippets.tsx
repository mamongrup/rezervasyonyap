import { getCachedSiteConfig } from '@/lib/site-config-cache'
import { sanitizeSiteUiHtml } from '@/lib/sanitize-cms-html'

function readUiHtml(
  ui: unknown,
  key: 'header_html' | 'footer_html',
): string {
  if (!ui || typeof ui !== 'object') return ''
  const v = (ui as Record<string, unknown>)[key]
  return typeof v === 'string' ? v.trim() : ''
}

/**
 * Ayarlar → SEO → `ui` site_settings: panelden gelen ham HTML.
 * - Header: genelde `<head>` için meta doğrulama, küçük script; body başında enjekte edilir (çoğu aracı kabul eder).
 * - Footer: üçüncü parti chat, ek script; sayfa ağacının sonunda.
 * GA4/GTM için önce Ayarlar → SEO → analytics JSON veya Google sekmesini kullanın; çift yükleme yapmayın.
 */
export async function SiteUiHeaderHtml() {
  const pub = await getCachedSiteConfig()
  const html = readUiHtml(pub?.ui, 'header_html')
  if (!html) return null
  const safe = sanitizeSiteUiHtml(html)
  if (!safe) return null
  return (
    <div
      id="site-ui-header-html"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}

export async function SiteUiFooterHtml() {
  const pub = await getCachedSiteConfig()
  const html = readUiHtml(pub?.ui, 'footer_html')
  if (!html) return null
  const safe = sanitizeSiteUiHtml(html)
  if (!safe) return null
  return (
    <div
      id="site-ui-footer-html"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}

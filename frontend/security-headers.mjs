/**
 * Üretim güvenlik başlıkları + kademeli CSP (Next `next.config.mjs` tarafından import edilir).
 *
 * Ortam değişkenleri:
 * - CSP_MODE: `off` | `report-only` | `enforce` — varsayılan üretimde `report-only`, geliştirmede `off`
 * - CSP_REPORT_URI: İhlal raporları (Reporting API veya report-uri uyumlu uç)
 * - SECURITY_HSTS_DISABLE: `1` ise HSTS gönderilmez (ilk kurulum / HTTP test)
 * - ENFORCE_HTTPS_REDIRECT: `src/proxy.ts` içinde — .env.local.example’a bakın
 */

const IS_PROD = process.env.NODE_ENV === 'production'

function cspModeEffective() {
  const raw = (process.env.CSP_MODE ?? '').trim().toLowerCase()
  if (raw === 'off' || raw === '0' || raw === 'false') return 'off'
  if (raw === 'enforce') return 'enforce'
  if (raw === 'report-only') return 'report-only'
  // Üretimde varsayılan: yalnızca raporlama; geliştirmede kapalı
  return IS_PROD ? 'report-only' : 'off'
}

/**
 * Kademeli CSP: önce Report-Only ile konsol / rapor uçlarında ihlalleri izleyin,
 * ardından CSP_MODE=enforce ile sıkılaştırın. Gerekirse domain listesini genişletin.
 *
 * @param {'enforce' | 'report-only'} mode
 */
export function buildContentSecurityPolicy(mode = 'enforce') {
  const directives = [
    "default-src 'self'",
    // Next.js, React, GTM/GA/AdSense, Google Maps picker, Tawk.to
    [
      'script-src',
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
      'https://ssl.google-analytics.com',
      'https://region1.google-analytics.com',
      'https://maps.googleapis.com',
      'https://pagead2.googlesyndication.com',
      'https://www.google.com',
      'https://www.gstatic.com',
      'https://embed.tawk.to',
      'https://*.tawk.to',
    ].join(' '),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://embed.tawk.to",
    // Harita karoları (Carto, OSM vb.) + CDN görselleri
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data: https://fonts.gstatic.com https://embed.tawk.to",
    // API (NEXT_PUBLIC_API_URL), harita stilleri, analytics, tawk.to websocket
    "connect-src 'self' https: wss: http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*",
    "frame-src 'self' https://www.google.com https://www.googletagmanager.com https://www.google.com/recaptcha/ https://embed.tawk.to",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ]

  // `upgrade-insecure-requests` yalnızca enforce modunda geçerlidir — Report-Only’de
  // tarayıcı konsoluna "ignored" uyarısı basar (Best Practices puanını düşürür).
  if (IS_PROD && mode === 'enforce' && process.env.SECURITY_UPGRADE_INSECURE !== '0') {
    directives.push('upgrade-insecure-requests')
  }

  const reportUri = process.env.CSP_REPORT_URI?.trim()
  if (reportUri) {
    directives.push(`report-uri ${reportUri}`)
  }

  return directives.join('; ')
}

/** @returns {{ key: string; value: string }[]} */
export function buildAllSecurityHeaders() {
  /** @type {{ key: string; value: string }[]} */
  const headers = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'X-XSS-Protection', value: '1; mode=block' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=(self)',
    },
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
    // Ödeme / OAuth popup — `same-origin` üçüncü parti pencereleri kırabilir
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  ]

  if (process.env.SECURITY_CORP === 'same-site') {
    headers.push({ key: 'Cross-Origin-Resource-Policy', value: 'same-site' })
  } else if (process.env.SECURITY_CORP === 'cross-origin') {
    headers.push({ key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' })
  }

  if (IS_PROD && process.env.SECURITY_HSTS_DISABLE !== '1') {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains; preload',
    })
  }

  const mode = cspModeEffective()
  if (mode !== 'off') {
    const csp = buildContentSecurityPolicy(mode)
    const name =
      mode === 'enforce' ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only'
    headers.push({ key: name, value: csp })
  }

  return headers
}

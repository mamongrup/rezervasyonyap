/**
 * HTTP güvenlik başlıkları ve CORS yardımcıları.
 *
 * Next.js middleware ve API route'larında ortak kullanım için.
 *
 * ALLOWED_HOSTS env: virgülle ayrılmış izinli host'lar.
 *   Geliştirmede boş bırakılırsa localhost/127.0.0.1 varsayılan kabul edilir.
 *   Üretimde mutlaka ayarlayın: ALLOWED_HOSTS=rezervasyonyap.tr,www.rezervasyonyap.tr
 */

import { NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Güvenlik başlıkları
// ---------------------------------------------------------------------------

/**
 * NextResponse nesnesine standart güvenlik başlıklarını ekler.
 * Hem middleware'de hem de API route'larında çağrılabilir.
 */
export function applySecurityHeaders(response: NextResponse): void {
  // DNS prefetch kontrolü
  response.headers.set('X-DNS-Prefetch-Control', 'on')

  // MIME sniffing engelleme
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Clickjacking koruması
  response.headers.set('X-Frame-Options', 'DENY')

  // XSS filtresi (eski tarayıcılar)
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  )

  // HSTS — yalnızca üretimde ve HTTPS'te
  // Üretim: max-age=31536000; includeSubDomains; preload
  // Geliştirme: HSTS gönderilmez (HTTP'de çalışırken sorun çıkarmasın)
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.SECURITY_HSTS_DISABLE !== '1'
  ) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload',
    )
  }
}

// ---------------------------------------------------------------------------
// CORS başlıkları
// ---------------------------------------------------------------------------

/**
 * İzin verilen host'lar (ALLOWED_HOSTS env değişkeninden).
 * Geliştirmede boşsa localhost/127.0.0.1 varsayılan kabul edilir.
 */
function getAllowedHosts(): string[] {
  const raw = process.env.ALLOWED_HOSTS ?? ''
  if (!raw.trim()) {
    // Geliştirme ortamında varsayılan olarak localhost izin ver
    if (process.env.NODE_ENV !== 'production') {
      return ['localhost', '127.0.0.1']
    }
    return []
  }
  return raw
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * API yanıtlarına CORS başlıklarını ekler.
 * Origin izin verilen host'lardan biriyse Access-Control-* başlıklarını ekler.
 */
export function applyCorsHeaders(
  response: NextResponse,
  origin: string | null,
): void {
  const allowedHosts = getAllowedHosts()

  // Geliştirme ortamında tüm origin'lere izin ver
  const allowed =
    allowedHosts.length === 0 ||
    (origin != null &&
      allowedHosts.some(
        (h) =>
          origin.toLowerCase().includes(h) ||
          origin.toLowerCase() === `https://${h}` ||
          origin.toLowerCase() === `http://${h}`,
      ))

  if (allowed && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    )
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With',
    )
    response.headers.set('Access-Control-Max-Age', '86400')
  }
}

// ---------------------------------------------------------------------------
// Host doğrulama
// ---------------------------------------------------------------------------

/**
 * Gelen Host header'ının izin verilen host'lardan biri olup olmadığını kontrol eder.
 * Değilse false döner — saldırı veya yanlış yönlendirme göstergesi.
 */
export function isAllowedHost(host: string): boolean {
  const allowedHosts = getAllowedHosts()
  if (allowedHosts.length === 0) {
    // Üretimde ALLOWED_HOSTS boşsa host doğrulaması kapalı kalmasın
    return process.env.NODE_ENV !== 'production'
  }
  const h = host.toLowerCase()
  return allowedHosts.some(
    (allowed) => h === allowed || h.startsWith(`${allowed}:`),
  )
}

// ---------------------------------------------------------------------------
// Client IP çıkarımı
// ---------------------------------------------------------------------------

/**
 * Proxy arkasındayken gerçek client IP'sini çıkarır.
 * x-forwarded-for → x-real-ip → fallback sırasıyla dener.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return '127.0.0.1'
}

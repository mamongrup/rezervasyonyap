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
function hostFromPublicUrl(envKey: string): string | null {
  const raw = process.env[envKey]?.trim()
  if (!raw) return null
  try {
    return new URL(raw).hostname.toLowerCase()
  } catch {
    return null
  }
}

/** `rezervasyonyap.tr` → aynı + `www.rezervasyonyap.tr` */
function expandHostAliases(hostname: string): string[] {
  const h = hostname.toLowerCase()
  const out = [h]
  if (h.startsWith('www.')) {
    out.push(h.slice(4))
  } else if (h && !h.includes(':')) {
    out.push(`www.${h}`)
  }
  return out
}

function getAllowedHosts(): string[] {
  const raw = process.env.ALLOWED_HOSTS ?? ''
  const fromEnv = raw
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
  if (fromEnv.length > 0) return fromEnv

  // Geliştirme: localhost
  if (process.env.NODE_ENV !== 'production') {
    return ['localhost', '127.0.0.1']
  }

  // Üretim: ALLOWED_HOSTS unutulmuşsa SITE_URL / API_URL host'larından türet (+ verify loopback)
  const derived = new Set<string>(['127.0.0.1', 'localhost'])
  for (const h of [
    hostFromPublicUrl('NEXT_PUBLIC_SITE_URL'),
    hostFromPublicUrl('NEXT_PUBLIC_API_URL'),
    hostFromPublicUrl('SITE_URL'),
  ]) {
    for (const alias of expandHostAliases(h ?? '')) {
      if (alias) derived.add(alias)
    }
  }
  return [...derived]
}

/** `Host: rezervasyonyap.tr:443` → `rezervasyonyap.tr` */
export function normalizeHostHeader(host: string): string {
  const h = host.trim().toLowerCase()
  if (h.startsWith('[')) {
    const end = h.indexOf(']')
    return end > 0 ? h.slice(1, end) : h
  }
  const colon = h.lastIndexOf(':')
  if (colon > 0 && /^\d+$/.test(h.slice(colon + 1))) {
    return h.slice(0, colon)
  }
  return h
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
  if (allowedHosts.length === 0) return false
  const h = normalizeHostHeader(host)
  return allowedHosts.some((allowed) => {
    const a = normalizeHostHeader(allowed)
    return h === a
  })
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

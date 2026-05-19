import { LOCALIZED_FIRST_SEGMENT_ALIASES } from '@/data/localized-middleware-rewrites'
import { defaultLocale, isAppLocale } from '@/lib/i18n-config'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
  applySecurityHeaders,
  applyCorsHeaders,
  isAllowedHost,
} from '@/lib/http-security'
import { isRateLimited, recordAuthAttempt } from '@/lib/auth-rate-limit'

const AUTH_COOKIE = 'travel_auth_token'

function rewriteResponse(_request: NextRequest, target: URL): NextResponse {
  return NextResponse.rewrite(target)
}

const PROTECTED: RegExp[] = [
  /^\/manage(\/|$)/,
  /^\/[a-z]{2}(-[a-z0-9]+)?\/manage(\/|$)/i,
  /^\/api\/upload-image(\/|$)/,
]

function isProtected(pathname: string): boolean {
  return PROTECTED.some((re) => re.test(pathname))
}

function loginUrl(req: NextRequest, pathname: string): URL {
  const url = req.nextUrl.clone()
  const localeMatch = pathname.match(/^\/([a-z]{2}(?:-[a-z0-9]+)?)\/manage/i)
  url.pathname = localeMatch ? `/${localeMatch[1]}/login` : '/login'
  url.searchParams.set('redirect', pathname)
  return url
}

/**
 * Next.js 16 edge middleware + reverse proxy senaryosunda rewrite hedefinin
 * origin'i istek origin'iyle birebir aynı olmalı. Apache `ProxyPreserveHost On`
 * ile `request.nextUrl.origin` = `https://rezervasyonyap.tr` olur; Next standalone
 * server bunu *external* rewrite sayıp client'a 307 + `location: /tr` döndürür
 * (client yeni istek başlatır → ekstra redirect mantığı ile döngü).
 *
 * `INTERNAL_MIDDLEWARE_REWRITE_ORIGIN` (örn. `http://127.0.0.1:3000`) tanımlıysa
 * rewrite hedefini loopback origin'e sabitleyerek aynı isteği *internal* olarak
 * çözmesini sağlar (200 + gerçek içerik).
 */
function rewriteTarget(request: NextRequest, pathname: string): URL {
  const pathNorm = pathname.startsWith('/') ? pathname : `/${pathname}`
  const forcedOrigin = process.env.INTERNAL_MIDDLEWARE_REWRITE_ORIGIN
  if (forcedOrigin) {
    const url = new URL(pathNorm, forcedOrigin)
    for (const [k, v] of request.nextUrl.searchParams.entries()) {
      url.searchParams.append(k, v)
    }
    return url
  }
  const url = request.nextUrl.clone()
  url.pathname = pathNorm
  return url
}

function applyFirstSegmentAlias(pathname: string, locLower: string): string {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length < 2) return pathname
  if (segments[0].toLowerCase() !== locLower) return pathname
  const rest = segments.slice(1)
  const aliasMap = LOCALIZED_FIRST_SEGMENT_ALIASES[locLower]
  const key = rest[0].toLowerCase()
  const canonical = aliasMap?.[key]
  if (canonical && canonical !== rest[0]) {
    const tail = rest.slice(1)
    const mid = tail.length > 0 ? `/${canonical}/${tail.join('/')}` : `/${canonical}`
    return `/${segments[0]}${mid}`
  }
  return pathname
}

// ---------------------------------------------------------------------------
// Güvenlik yardımcıları (eski middleware.ts → proxy.ts entegrasyonu)
// ---------------------------------------------------------------------------

/** `/tr/api/...` → `/api/...` — güvenlik ve koruma kontrolleri için kanonik yol */
function normalizeApiPathname(pathname: string): string {
  const localeApi = pathname.match(/^\/[a-z]{2}(?:-[a-z0-9]+)?\/(api(?:\/|$).*)$/i)
  if (localeApi) return `/${localeApi[1]}`
  return pathname
}

/** Client IP çıkarımı (proxy arkası) */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return '127.0.0.1'
}

function applyApiSecurity(
  request: NextRequest,
  res: NextResponse,
): NextResponse {
  const origin = request.headers.get('origin')
  applyCorsHeaders(res, origin)
  applySecurityHeaders(res)
  return res
}

function authRequiredResponse(request: NextRequest): NextResponse {
  const res = NextResponse.json(
    { ok: false, error: 'Oturum gerekli. Lütfen tekrar giriş yapın.' },
    { status: 401 },
  )
  return applyApiSecurity(request, res)
}

// ---------------------------------------------------------------------------
// Rate limit — global API + auth brute-force
// ---------------------------------------------------------------------------

/** Global API rate limit: IP başına dakikada maksimum istek */
const AUTH_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
]

function applyGlobalApiRateLimit(
  request: NextRequest,
): NextResponse | null {
  const pathname = request.nextUrl.pathname
  if (!pathname.startsWith('/api/')) return null

  const ip = getClientIp(request)
  const limitKey = `global:${ip}`

  if (isRateLimited('global_api', limitKey)) {
    const res = NextResponse.json(
      { error: 'too_many_requests' },
      { status: 429 },
    )
    res.headers.set('Retry-After', '60')
    applyApiSecurity(request, res)
    return res
  }

  recordAuthAttempt('global_api', limitKey, true)
  return null
}

function applyAuthBruteForceLimit(
  request: NextRequest,
): NextResponse | null {
  if (request.method !== 'POST') return null
  const pathname = request.nextUrl.pathname
  const isAuthEndpoint = AUTH_ENDPOINTS.some((ep) => pathname.startsWith(ep))
  if (!isAuthEndpoint) return null

  const ip = getClientIp(request)
  const bruteKey = `brute:${ip}`

  if (isRateLimited('auth_brute', bruteKey)) {
    const res = NextResponse.json(
      { error: 'too_many_attempts' },
      { status: 429 },
    )
    res.headers.set('Retry-After', '300')
    applyApiSecurity(request, res)
    return res
  }

  return null
}

/**
 * Varsayılan dil (`tr`): adres çubuğunda dil kodu yok (`/blog`).
 * İçeride `[locale]` = `tr` olacak şekilde `rewrite` yapılır.
 * `/tr/blog` istekleri kanonik `/blog` adresine yönlendirilir (308).
 *
 * (Eski `middleware.ts`) İsteğe bağlı HTTP → HTTPS: `ENFORCE_HTTPS_REDIRECT=1` ve
 * `NODE_ENV=production` iken `X-Forwarded-Proto: http` ise 308 ile HTTPS'e yönlendirilir.
 */
export function proxy(request: NextRequest) {
  // -----------------------------------------------------------------------
  // 0. Host header kontrolü — bilinmeyen host'ları reddet
  // -----------------------------------------------------------------------
  const host = request.headers.get('host') ?? ''
  if (host && !isAllowedHost(host)) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  // -----------------------------------------------------------------------
  // 0.1 Global API rate limit (tüm /api/* istekleri)
  // -----------------------------------------------------------------------
  const rateLimitRes = applyGlobalApiRateLimit(request)
  if (rateLimitRes) return rateLimitRes

  // -----------------------------------------------------------------------
  // 0.2 Auth brute-force koruması (ek katman)
  // -----------------------------------------------------------------------
  const bruteForceRes = applyAuthBruteForceLimit(request)
  if (bruteForceRes) return bruteForceRes

  if (process.env.ENFORCE_HTTPS_REDIRECT === '1' && process.env.NODE_ENV === 'production') {
    const proto = request.headers.get('x-forwarded-proto')
    if (proto === 'http') {
      const url = request.nextUrl.clone()
      url.protocol = 'https:'
      return NextResponse.redirect(url, 308)
    }
  }

  const { pathname } = request.nextUrl

  // /tr/api/... veya /en/api/... — yanlışlıkla locale altında kalan API istekleri
  // `[locale]/[categoryMap]` ile çakışır (categoryMap=api → Server Action hatası, 500).
  // Dahili olarak her zaman `/api/...` route handler'a yönlendir.
  const localeThenApi = pathname.match(/^\/([a-z]{2}(?:-[a-z0-9]+)?)\/(api(?:\/|$).*)$/i)
  if (localeThenApi) {
    const apiPath = `/${localeThenApi[2]}`
    if (isProtected(apiPath) && !request.cookies.get(AUTH_COOKIE)?.value) {
      return authRequiredResponse(request)
    }
    const res = rewriteResponse(request, rewriteTarget(request, apiPath))
    return applyApiSecurity(request, res)
  }

  const apiPath = normalizeApiPathname(pathname)

  if (isProtected(pathname) || isProtected(apiPath)) {
    const token = request.cookies.get(AUTH_COOKIE)?.value
    if (!token) {
      if (apiPath.startsWith('/api/')) {
        return authRequiredResponse(request)
      }
      return NextResponse.redirect(loginUrl(request, pathname))
    }
  }

  // Tüm `/api/*` rotaları locale rewrite dışında kalmalı; aksi halde örn. `/api/upload-image`
  // `/tr/api/upload-image` olarak rewrite edilir ve 404 HTML döner (JSON beklenen yükleme kırılır).
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel')
  ) {
    // API OPTIONS preflight
    if (request.method === 'OPTIONS') {
      const res = new NextResponse(null, { status: 204 })
      applyCorsHeaders(res, request.headers.get('origin'))
      applySecurityHeaders(res)
      return res
    }

    const res = NextResponse.next()
    return applyApiSecurity(request, res)
  }

  if (pathname.includes('.')) {
    const res = NextResponse.next()
    applySecurityHeaders(res)
    return res
  }

  const segments = pathname.split('/').filter(Boolean)
  const first = segments[0]
  const def = defaultLocale.toLowerCase()

  // /en/... — varsayılan dil dışı; vitrin segment alias (rewrite) + next
  if (first && isAppLocale(first) && first.toLowerCase() !== def) {
    const loc = first.toLowerCase()
    const rest = segments.slice(1)
    if (rest.length > 0) {
      const aliasMap = LOCALIZED_FIRST_SEGMENT_ALIASES[loc]
      const key = rest[0].toLowerCase()
      const canonical = aliasMap?.[key]
      if (canonical && canonical !== rest[0]) {
        const tail = rest.slice(1)
        const mid = tail.length > 0 ? `/${canonical}/${tail.join('/')}` : `/${canonical}`
        const res = rewriteResponse(request, rewriteTarget(request, `/${first}${mid}`))
        applySecurityHeaders(res)
        return res
      }
    }
    const res = NextResponse.next()
    applySecurityHeaders(res)
    return res
  }

  // /tr veya /tr/... — **redirect YOK**. Next.js 16 standalone/edge middleware
  // kombinasyonunda `/tr → /` 308'i, `/ → /tr` internal rewrite'ıyla döngü
  // yaratıyor (bkz. vercel/next.js#91844). Duplicate URL riskini SEO tarafında
  // `<link rel="canonical">` ile hallediyoruz; burada hiçbir şey yapmıyoruz.
  if (first && isAppLocale(first) && first.toLowerCase() === def) {
    const res = NextResponse.next()
    applySecurityHeaders(res)
    return res
  }

  // Dil segmenti yok: `/`, `/blog` → içeride `/tr`, `/tr/blog` (+ alias)
  const suffix = pathname === '/' ? '' : pathname
  const pathOut = applyFirstSegmentAlias(`/${defaultLocale}${suffix}`, def)
  const res = rewriteResponse(request, rewriteTarget(request, pathOut))
  applySecurityHeaders(res)
  return res
}

export const config = {
  matcher: [
    /*
     * Proxy'yi tum `/_next/*` (static, data, webpack, ...) yollarinda HIC calistirma.
     * Sadece `_next/static` / `_next/image` dislamak yetmeyebilir; gereksiz cagrı Next 16'da
     * statik chunk servisinde sorun çıkaran edge-case riskini azaltır.
     * `/api` matcher disinda kalsa bile icerde `/api` erken `next()`.
     */
    '/((?!_next/|favicon.ico|robots.txt|sitemap|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml)$).*)',
    '/api/upload-image',
    // /tr/api/... yanlış eşleşmesini düzeltmek için proxy bu yolları da görmeli
    '/:locale/api/:path*',
  ],
}

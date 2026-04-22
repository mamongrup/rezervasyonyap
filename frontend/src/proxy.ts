import { LOCALIZED_FIRST_SEGMENT_ALIASES } from '@/data/localized-middleware-rewrites'
import { defaultLocale, isAppLocale } from '@/lib/i18n-config'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const AUTH_COOKIE = 'travel_auth_token'

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
 * Apache/nginx bazen arka uca `Host: localhost:3000` gönderir; `X-Forwarded-Proto: https`
 * ile birleşince `nextUrl` https://localhost:3000 olur ve dahili rewrite TLS ile HTTP
 * portuna bağlanır (`EPROTO` / packet length too long).
 *
 * - Açıkça: `INTERNAL_MIDDLEWARE_REWRITE_ORIGIN=http://127.0.0.1:3000` (PORT ile aynı).
 * - Ayrıca üretimde Host loopback + `X-Forwarded-Proto: https` ise otomatik olarak
 *   `http://127.0.0.1:$PORT` kullanılır (Plesk’te env unutulsa bile).
 */
function rewriteTarget(request: NextRequest, pathname: string): URL {
  const pathNorm = pathname.startsWith('/') ? pathname : `/${pathname}`
  const search = request.nextUrl.search

  const originRaw = process.env.INTERNAL_MIDDLEWARE_REWRITE_ORIGIN?.trim()
  if (originRaw && process.env.NODE_ENV === 'production') {
    try {
      const origin = originRaw.includes('://') ? originRaw : `http://${originRaw}`
      const base = new URL(origin.endsWith('/') ? origin.slice(0, -1) : origin)
      return new URL(pathNorm + search, base)
    } catch {
      /* aşağıya düş */
    }
  }

  if (process.env.NODE_ENV === 'production') {
    const rawHost = request.headers.get('host')?.toLowerCase() ?? ''
    const loopbackHost =
      rawHost === 'localhost' ||
      rawHost.startsWith('localhost:') ||
      rawHost === '127.0.0.1' ||
      rawHost.startsWith('127.0.0.1:') ||
      rawHost === '[::1]' ||
      rawHost.startsWith('[::1]:')
    const xfProto = request.headers.get('x-forwarded-proto')?.toLowerCase()
    if (loopbackHost && xfProto === 'https') {
      const port = process.env.PORT?.trim() || '3000'
      return new URL(pathNorm + search, `http://127.0.0.1:${port}`)
    }
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

/**
 * Varsayılan dil (`tr`): adres çubuğunda dil kodu yok (`/blog`).
 * İçeride `[locale]` = `tr` olacak şekilde `rewrite` yapılır.
 * `/tr/blog` istekleri kanonik `/blog` adresine yönlendirilir (308).
 *
 * (Eski `middleware.ts`) İsteğe bağlı HTTP → HTTPS: `ENFORCE_HTTPS_REDIRECT=1` ve
 * `NODE_ENV=production` iken `X-Forwarded-Proto: http` ise 308 ile HTTPS’e yönlendirilir.
 */
export function proxy(request: NextRequest) {
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
    return NextResponse.rewrite(rewriteTarget(request, `/${localeThenApi[2]}`))
  }

  if (isProtected(pathname)) {
    const token = request.cookies.get(AUTH_COOKIE)?.value
    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { ok: false, error: 'Oturum gerekli. Lütfen tekrar giriş yapın.' },
          { status: 401 },
        )
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
    return NextResponse.next()
  }

  if (pathname.includes('.')) {
    return NextResponse.next()
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
        return NextResponse.rewrite(rewriteTarget(request, `/${first}${mid}`))
      }
    }
    return NextResponse.next()
  }

  // /tr veya /tr/... — önek olmayan kanonik URL'ye yönlendir
  if (first && isAppLocale(first) && first.toLowerCase() === def) {
    const rest = segments.slice(1)
    const newPath = rest.length === 0 ? '/' : '/' + rest.join('/')
    const url = request.nextUrl.clone()
    url.pathname = newPath
    return NextResponse.redirect(url, 308)
  }

  // Dil segmenti yok: `/`, `/blog` → içeride `/tr`, `/tr/blog` (+ alias)
  const suffix = pathname === '/' ? '' : pathname
  const pathOut = applyFirstSegmentAlias(`/${defaultLocale}${suffix}`, def)
  return NextResponse.rewrite(rewriteTarget(request, pathOut))
}

export const config = {
  matcher: [
    /*
     * `/api` dahil (HTTPS); locale rewrite içinde `/api` erken `next()`.
     * Statik uzantılar ve robots/sitemap hariç — eski middleware ile uyumlu.
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)',
    '/api/upload-image',
    // /tr/api/... yanlış eşleşmesini düzeltmek için proxy bu yolları da görmeli
    '/:locale/api/:path*',
  ],
}

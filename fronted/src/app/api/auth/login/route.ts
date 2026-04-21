import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOriginForFetch } from '@/lib/api-origin'
import { AUTH_COOKIE_NAME, authCookieOptions } from '@/lib/auth-cookie'
import { recordAuthAttempt, isRateLimited, rateLimitRetryAfter } from '@/lib/auth-rate-limit'

/**
 * Tarayıcıdan doğrudan backend'e POST etmek yerine bu Next.js API
 * route'una gelir. Buradan backend `/api/v1/auth/login` çağrılır ve
 * dönen token tarayıcıya **HttpOnly + Secure + SameSite=Lax** cookie
 * olarak yazılır. Bu sayede XSS açığı varsa bile token sızmaz.
 *
 * Ek olarak basit bir IP+email tabanlı rate-limit uygulanır.
 */
export async function POST(req: NextRequest) {
  const base = apiOriginForFetch()
  if (!base) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_API_URL_missing' }, { status: 500 })
  }

  let body: { email?: string; password?: string }
  try {
    body = (await req.json()) as { email?: string; password?: string }
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const email = (body?.email ?? '').trim().toLowerCase()
  if (!email || !body?.password) {
    return NextResponse.json({ error: 'email_password_required' }, { status: 400 })
  }

  // Rate-limit kontrolü
  const ip = clientIp(req)
  const limitKey = `${ip}|${email}`
  if (isRateLimited('login', limitKey)) {
    const retry = rateLimitRetryAfter('login', limitKey)
    return NextResponse.json(
      { error: 'too_many_attempts' },
      { status: 429, headers: { 'Retry-After': String(retry) } },
    )
  }

  let upstream: Response
  try {
    upstream = await fetch(`${base}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: body.password }),
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 })
  }

  const data = (await upstream.json().catch(() => ({}))) as {
    token?: string
    user?: unknown
    error?: string
  }

  if (!upstream.ok || !data?.token) {
    recordAuthAttempt('login', limitKey, false)
    return NextResponse.json(
      { error: data?.error ?? `auth_login_${upstream.status}` },
      { status: upstream.status === 0 ? 500 : upstream.status },
    )
  }

  recordAuthAttempt('login', limitKey, true)

  const jar = await cookies()
  jar.set(AUTH_COOKIE_NAME, data.token, authCookieOptions())

  // Token gövdede de döner — eski istemciler ve `Authorization: Bearer ...`
  // kullanan API çağrıları için (ileride tamamen cookie'ye geçilebilir).
  return NextResponse.json({ ok: true, token: data.token, user: data.user })
}

/** X-Forwarded-For zincirinde ilk IP, yoksa req.ip benzeri fallback. */
function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

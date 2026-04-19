import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, authCookieOptions } from '@/lib/auth-cookie'
import { recordAuthAttempt, isRateLimited, rateLimitRetryAfter } from '@/lib/auth-rate-limit'

/**
 * Kayıt işlemi için backend proxy. Login route'u ile aynı güvenlik prensipleri:
 * HttpOnly cookie + IP+email rate-limit + token aynı yanıtın gövdesinde de döner.
 */
export async function POST(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (!base) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_API_URL_missing' }, { status: 500 })
  }

  let body: { email?: string; password?: string; display_name?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const email = (body?.email ?? '').trim().toLowerCase()
  if (!email || !body?.password) {
    return NextResponse.json({ error: 'email_password_required' }, { status: 400 })
  }

  const ip = clientIp(req)
  const limitKey = `${ip}|${email}`
  if (isRateLimited('register', limitKey)) {
    const retry = rateLimitRetryAfter('register', limitKey)
    return NextResponse.json(
      { error: 'too_many_attempts' },
      { status: 429, headers: { 'Retry-After': String(retry) } },
    )
  }

  let upstream: Response
  try {
    upstream = await fetch(`${base.replace(/\/$/, '')}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: body.password,
        display_name: body.display_name ?? '',
      }),
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
    recordAuthAttempt('register', limitKey, false)
    return NextResponse.json(
      { error: data?.error ?? `auth_register_${upstream.status}` },
      { status: upstream.status === 0 ? 500 : upstream.status },
    )
  }

  recordAuthAttempt('register', limitKey, true)

  const jar = await cookies()
  jar.set(AUTH_COOKIE_NAME, data.token, authCookieOptions())

  return NextResponse.json({ ok: true, token: data.token, user: data.user })
}

function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

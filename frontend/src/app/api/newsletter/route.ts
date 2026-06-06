import {
  isRequestRateLimited,
  recordRequest,
  NEWSLETTER_RATE_BLOCK_MS,
  NEWSLETTER_RATE_MAX,
  NEWSLETTER_RATE_WINDOW_MS,
} from '@/lib/auth-rate-limit'
import { getClientIp } from '@/lib/http-security'
import { NextRequest, NextResponse } from 'next/server'

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function applyNewsletterRateLimit(req: NextRequest): NextResponse | null {
  const ip = getClientIp(req.headers)
  const key = `newsletter:${ip}`
  if (
    isRequestRateLimited('newsletter', key, NEWSLETTER_RATE_MAX, NEWSLETTER_RATE_WINDOW_MS)
  ) {
    return NextResponse.json(
      { error: 'Çok fazla istek. Lütfen daha sonra tekrar deneyin.' },
      { status: 429, headers: { 'Retry-After': '3600' } },
    )
  }
  recordRequest(
    'newsletter',
    key,
    NEWSLETTER_RATE_MAX,
    NEWSLETTER_RATE_WINDOW_MS,
    NEWSLETTER_RATE_BLOCK_MS,
  )
  return null
}

export async function POST(req: NextRequest) {
  const rateLimitRes = applyNewsletterRateLimit(req)
  if (rateLimitRes) return rateLimitRes

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
  }
  const email =
    typeof body === 'object' && body !== null && 'email' in body
      ? String((body as { email: unknown }).email).trim()
      : ''
  if (!emailRx.test(email)) {
    return NextResponse.json({ error: 'Geçerli bir e-posta girin' }, { status: 400 })
  }

  // Entegrasyon: Brevo, SendGrid, CRM webhook vb.
  return NextResponse.json({ ok: true })
}
